// ============================================================
// OpenArg — Data Agent
// Phase 2: Executes data retrieval sub-tasks from the plan
// Routes to the right connector (CKAN, Series, Georef)
// ============================================================

import { ExecutionPlan, PlanStep, CollectedData, DataResult } from './types';
import { searchDatasets, queryDatastore, toDataResults } from '../connectors/ckan';
import { searchSeries, fetchSeries, seriesToDataResult, findCatalogMatch, SERIES_CATALOG } from '../connectors/seriesTiempo';
import {
    getProvincias,
    getDepartamentos,
    getMunicipios,
    normalizeLocation,
    georefToDataResult,
} from '../connectors/georef';
import {
    searchDDJJ,
    getDDJJRanking,
    getDDJJByName,
    getDDJJStats,
    ddjjToDataResult,
} from '../connectors/ddjj';

/**
 * Execute all data collection steps from the plan
 */
export async function collectData(plan: ExecutionPlan): Promise<CollectedData> {
    const results: DataResult[] = [];
    const errors: { step: string; error: string }[] = [];

    // Separate data steps from analysis steps
    const dataSteps = plan.steps.filter(
        (s) => s.action === 'search_ckan' || s.action === 'query_series' || s.action === 'query_georef' || s.action === 'query_ddjj'
    );

    // Execute independent steps in parallel, dependent steps sequentially
    const independent = dataSteps.filter((s) => !s.dependsOn || s.dependsOn.length === 0);
    const dependent = dataSteps.filter((s) => s.dependsOn && s.dependsOn.length > 0);

    // Execute independent steps in parallel
    const independentResults = await Promise.allSettled(
        independent.map((step) => executeStep(step))
    );

    independentResults.forEach((result, i) => {
        if (result.status === 'fulfilled' && result.value) {
            results.push(...result.value);
        } else if (result.status === 'rejected') {
            const errorMsg = result.reason?.message || 'Unknown error';
            console.warn(`[DataAgent] Step ${independent[i].id} failed:`, errorMsg);
            errors.push({
                step: independent[i].id,
                error: errorMsg,
            });
        }
    });

    // Execute dependent steps sequentially
    for (const step of dependent) {
        try {
            const stepResults = await executeStep(step);
            if (stepResults) results.push(...stepResults);
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'Unknown error';
            console.warn(`[DataAgent] Step ${step.id} failed:`, errorMsg);
            errors.push({
                step: step.id,
                error: errorMsg,
            });
        }
    }

    return { results, errors };
}

/**
 * Execute a single data retrieval step
 */
async function executeStep(step: PlanStep): Promise<DataResult[]> {
    switch (step.action) {
        case 'search_ckan':
            return executeCKANSearch(step);
        case 'query_series':
            return executeSeriesQuery(step);
        case 'query_georef':
            return executeGeorefQuery(step);
        case 'query_ddjj':
            return executeDDJJQuery(step);
        default:
            return [];
    }
}

/**
 * Execute a CKAN search step
 */
async function executeCKANSearch(step: PlanStep): Promise<DataResult[]> {
    const params = step.params as {
        query?: string;
        portalId?: string;
        rows?: number;
        resourceId?: string;
    };

    const query = params.query || step.description;

    // If we have a specific resource ID, query the datastore
    if (params.resourceId && params.portalId) {
        const dsResult = await queryDatastore(params.portalId, params.resourceId, {
            limit: 50,
        });
        if (dsResult && dsResult.result) {
            return [{
                source: `ckan:${params.portalId}`,
                portalName: params.portalId,
                portalUrl: `https://datos.gob.ar`,
                datasetTitle: step.description,
                format: 'json',
                records: dsResult.result.records,
                metadata: {
                    totalRecords: dsResult.result.total,
                    fetchedAt: new Date().toISOString(),
                },
            }];
        }
    }

    // Otherwise, search for datasets
    const isListAll = query === '*' || query === '*:*';
    const searchResults = await searchDatasets(query, {
        portalId: params.portalId,
        rows: isListAll ? 100 : (params.rows || 5),
        listAll: isListAll,
    });

    return await toDataResults(searchResults);
}

/**
 * Execute a Series de Tiempo query step
 */
async function executeSeriesQuery(step: PlanStep): Promise<DataResult[]> {
    const params = step.params as {
        query?: string;
        seriesIds?: string[];
        startDate?: string;
        endDate?: string;
        collapse?: string;
        representation?: string;
    };

    // Try catalog match first to get defaults (representation, collapse, etc.)
    const query = params.query || step.description;
    const catalogMatch = params.seriesIds
        ? findCatalogMatchByIds(params.seriesIds)
        : findCatalogMatch(query);

    // Determine representation mode: explicit param > catalog default > undefined
    const representation = (params.representation || catalogMatch?.defaultRepresentation) as
        'value' | 'change' | 'percent_change' | 'percent_change_a_year_ago' | undefined;

    // Default date range: if no startDate provided and using percent_change, default to last 12 months
    let startDate = params.startDate;
    if (!startDate && representation === 'percent_change') {
        const d = new Date();
        d.setMonth(d.getMonth() - 12);
        startDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
        console.log(`[DataAgent] Defaulting startDate to ${startDate} for percent_change`);
    }

    // If we have specific series IDs, fetch them directly
    if (params.seriesIds && params.seriesIds.length > 0) {
        console.log(`[DataAgent] Fetching series by ID: ${params.seriesIds.join(', ')}${representation ? ` (${representation})` : ''}`);
        const result = await fetchSeries(params.seriesIds, {
            startDate,
            endDate: params.endDate,
            collapse: (params.collapse || catalogMatch?.defaultCollapse) as 'year' | 'month' | undefined,
            representation,
        });

        if (result) {
            const dataResult = seriesToDataResult(params.seriesIds, result.data, result.meta);
            return [maybeTransformPercentChange(dataResult, params.seriesIds, representation)];
        }
        console.warn(`[DataAgent] fetchSeries returned null for IDs: ${params.seriesIds.join(', ')}`);
        return [];
    }

    // Catalog match path
    if (catalogMatch) {
        console.log(`[DataAgent] Catalog match found for "${query}": ${catalogMatch.ids.join(', ')}${representation ? ` (${representation})` : ''}`);
        const result = await fetchSeries(catalogMatch.ids, {
            startDate,
            endDate: params.endDate,
            collapse: (params.collapse || catalogMatch.defaultCollapse) as 'year' | 'month' | undefined,
            representation,
        });

        if (result) {
            const dataResult = seriesToDataResult(catalogMatch.ids, result.data, result.meta);
            return [maybeTransformPercentChange(dataResult, catalogMatch.ids, representation)];
        }
    }

    // Fallback: search for series and fetch top results
    console.log(`[DataAgent] Searching series API for: "${query}"`);
    const searchResults = await searchSeries(query, { limit: 5 });

    if (searchResults.length === 0) {
        console.warn(`[DataAgent] No search results for series query: "${query}"`);
        return [];
    }

    // Fetch top 3 series
    const topIds = searchResults.slice(0, 3).map((s) => s.id);
    console.log(`[DataAgent] Fetching top search results: ${topIds.join(', ')}`);
    const result = await fetchSeries(topIds, {
        startDate,
        endDate: params.endDate,
        collapse: params.collapse as 'year' | 'month' | undefined,
    });

    if (result) {
        return [seriesToDataResult(topIds, result.data, result.meta)];
    }

    return [];
}

/**
 * Find a catalog entry by matching series IDs
 */
function findCatalogMatchByIds(seriesIds: string[]) {
    for (const entry of Object.values(SERIES_CATALOG)) {
        if (seriesIds.some(id => entry.ids.includes(id))) {
            return entry;
        }
    }
    return null;
}

/**
 * Transform percent_change values: multiply by 100 so they display as proper percentages
 * (API returns 0.0277 for 2.77%, we convert to 2.77)
 */
function maybeTransformPercentChange(
    dataResult: DataResult,
    seriesIds: string[],
    representation?: string,
): DataResult {
    if (representation !== 'percent_change') return dataResult;

    const transformed = dataResult.records.map(record => {
        const newRecord: Record<string, unknown> = { ...record };
        for (const id of seriesIds) {
            if (typeof newRecord[id] === 'number') {
                newRecord[id] = Math.round((newRecord[id] as number) * 10000) / 100; // 0.0277 → 2.77
            }
        }
        return newRecord;
    });

    return {
        ...dataResult,
        datasetTitle: dataResult.datasetTitle,
        records: transformed,
        metadata: {
            ...dataResult.metadata,
            description: `${dataResult.metadata.description || ''} (variación porcentual mensual, valores en %)`.trim(),
            units: '%',
        },
    };
}

/**
 * Execute a Georef query step
 */
async function executeGeorefQuery(step: PlanStep): Promise<DataResult[]> {
    const params = step.params as {
        query?: string;
        type?: 'provincias' | 'departamentos' | 'municipios';
        provincia?: string;
    };

    const query = params.query || step.description;

    // If specific type requested
    if (params.type === 'provincias' || !params.type) {
        const provincias = await getProvincias({ nombre: params.query });
        if (provincias.length > 0) {
            return [georefToDataResult(query, provincias, 'provincias')];
        }
    }

    if (params.type === 'departamentos') {
        const departamentos = await getDepartamentos({
            provincia: params.provincia,
            nombre: params.query,
        });
        if (departamentos.length > 0) {
            return [georefToDataResult(query, departamentos, 'departamentos')];
        }
    }

    if (params.type === 'municipios') {
        const municipios = await getMunicipios({
            provincia: params.provincia,
            nombre: params.query,
        });
        if (municipios.length > 0) {
            return [georefToDataResult(query, municipios, 'municipios')];
        }
    }

    // Auto-detect: try to normalize the location
    const normalized = await normalizeLocation(query);
    if (normalized) {
        return [georefToDataResult(query, [normalized.entity], normalized.type)];
    }

    return [];
}

/**
 * Execute a DDJJ query step
 */
async function executeDDJJQuery(step: PlanStep): Promise<DataResult[]> {
    const params = step.params as {
        query?: string;
        sortBy?: 'patrimonio' | 'ingresos' | 'bienes';
        top?: number;
        order?: 'desc' | 'asc';
        nombre?: string;
        action?: 'ranking' | 'search' | 'detail' | 'stats';
    };

    // If searching for a specific person
    if (params.nombre) {
        const records = getDDJJByName(params.nombre);
        if (records.length > 0) {
            console.log(`[DataAgent] DDJJ found: ${records.map(r => r.nombre).join(', ')} (${records.length} results)`);
            return [ddjjToDataResult(
                records.length === 1
                    ? `Declaración Jurada de ${records[0].nombre}`
                    : `Declaraciones Juradas (${records.length} resultados para "${params.nombre}")`,
                records
            )];
        }
        console.warn(`[DataAgent] DDJJ not found for: ${params.nombre}`);
        return [];
    }

    // If requesting stats
    if (params.action === 'stats') {
        const stats = getDDJJStats();
        return [{
            source: 'ddjj:oficina_anticorrupcion',
            portalName: 'Declaraciones Juradas Patrimoniales',
            portalUrl: 'https://www.argentina.gob.ar/anticorrupcion',
            datasetTitle: 'Estadísticas generales de DDJJ de Diputados',
            format: 'json',
            records: [stats as unknown as Record<string, unknown>],
            metadata: {
                totalRecords: 1,
                fetchedAt: new Date().toISOString(),
                description: 'Resumen estadístico de todas las declaraciones juradas patrimoniales',
            },
        }];
    }

    // If requesting a ranking (default behavior)
    if (params.sortBy || params.top || params.action === 'ranking' || !params.query) {
        const order = params.order || 'desc';
        const records = getDDJJRanking(params.sortBy || 'patrimonio', params.top || 10, order);
        const orderLabel = order === 'asc' ? 'menor' : 'mayor';
        console.log(`[DataAgent] DDJJ ranking: top ${records.length} by ${params.sortBy || 'patrimonio'} (${orderLabel})`);
        return [ddjjToDataResult(
            `Ranking de Diputados por ${orderLabel} ${params.sortBy === 'ingresos' ? 'ingresos' : 'patrimonio'}`,
            records
        )];
    }

    // General search
    const query = params.query || step.description;
    const results = searchDDJJ(query);
    if (results.length > 0) {
        console.log(`[DataAgent] DDJJ search "${query}": ${results.length} results`);
        return [ddjjToDataResult(`Búsqueda DDJJ: ${query}`, results)];
    }

    return [];
}
