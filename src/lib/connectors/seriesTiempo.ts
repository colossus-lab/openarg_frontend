// ============================================================
// OpenArg — Series de Tiempo API Connector
// Fetches economic/social time-series from apis.datos.gob.ar
// ============================================================

import { SeriesResponse, SeriesMeta, SeriesSearchResult } from './types';
import { DataResult } from '../agents/types';

const BASE_URL = process.env.SERIES_TIEMPO_API_URL || 'https://apis.datos.gob.ar/series/api';

/**
 * Curated catalog of verified Series de Tiempo IDs for common queries.
 * These IDs were validated against the live API and return real data.
 * The search API often returns irrelevant results for generic terms,
 * so this catalog ensures we fetch the right data for popular topics.
 */
export const SERIES_CATALOG: Record<string, {
    ids: string[];
    description: string;
    keywords: string[];
    defaultCollapse?: 'year' | 'month';
    defaultRepresentation?: 'value' | 'change' | 'percent_change' | 'percent_change_a_year_ago';
}> = {
    presupuesto: {
        ids: ['451.3_GPNGPN_0_0_3_30'],
        description: 'Gasto público nacional en millones de pesos (anual, desde 1980)',
        keywords: ['presupuesto', 'gasto', 'gasto publico', 'gasto nacional', 'presupuesto nacional', 'fiscal'],
    },
    inflacion: {
        ids: ['103.1_I2N_2016_M_19'],
        description: 'IPC Nivel General (índice base dic-2016=100). Usar con representation=percent_change para obtener la variación porcentual mensual de inflación.',
        keywords: ['inflacion', 'ipc', 'precios', 'indice de precios', 'costo de vida'],
        defaultCollapse: 'month',
        defaultRepresentation: 'percent_change',
    },
    tipo_cambio: {
        ids: ['92.2_TIPO_CAMBIION_0_0_21_24'],
        description: 'Tipo de cambio peso/dólar de valuación BCRA (diario, desde 2003)',
        keywords: ['dolar', 'tipo de cambio', 'cambio', 'divisa', 'cotizacion'],
        defaultCollapse: 'month',
    },
    ipc_regional: {
        ids: ['103.1_I2N_2016_M_19', '148.3_INIVELNOA_DICI_M_21', '145.3_INGCUYUYO_DICI_M_11'],
        description: 'IPC Nivel General: GBA, NOA, y Cuyo (mensual)',
        keywords: ['ipc regional', 'precios regionales', 'inflacion regional'],
        defaultCollapse: 'month',
    },
    // --- BCRA indicators ---
    reservas: {
        ids: ['174.1_RRVAS_IDOS_0_0_36'],
        description: 'Reservas internacionales del BCRA en millones de dólares (mensual)',
        keywords: ['reservas', 'reservas internacionales', 'bcra reservas', 'reservas bcra', 'dolares bcra', 'reservas del banco central'],
        defaultCollapse: 'month',
    },
    base_monetaria: {
        ids: ['331.1_SALDO_BASERIA__15'],
        description: 'Base monetaria — saldo en millones de pesos (mensual)',
        keywords: ['base monetaria', 'emision', 'emision monetaria', 'dinero en circulacion', 'masa monetaria', 'agregados monetarios'],
        defaultCollapse: 'month',
    },
    leliq_pases: {
        ids: ['331.1_PASES_REDELIQ_M_MONE_0_24_24'],
        description: 'LELIQ y pases del BCRA en millones de pesos (mensual)',
        keywords: ['leliq', 'pases', 'letras de liquidez', 'pases pasivos', 'deuda bcra', 'pasivos remunerados', 'tasa de politica monetaria'],
        defaultCollapse: 'month',
    },
    // --- INDEC economic activity ---
    emae: {
        ids: ['143.3_NO_PR_2004_A_21'],
        description: 'EMAE — Estimador Mensual de Actividad Económica, índice base 2004 (mensual, desde 2004)',
        keywords: ['emae', 'actividad economica', 'pbi mensual', 'crecimiento', 'recesion', 'producto bruto'],
        defaultCollapse: 'month',
    },
    desempleo: {
        ids: ['45.2_ECTDT_0_T_33'],
        description: 'Tasa de desempleo total en porcentaje (trimestral, desde 2003)',
        keywords: ['desempleo', 'desocupacion', 'tasa de desempleo', 'empleo', 'mercado laboral', 'trabajo'],
    },
    salarios: {
        ids: ['149.1_TL_INDIIOS_OCTU_0_21'],
        description: 'Índice de Salarios nivel general, base oct-2016=100 (mensual)',
        keywords: ['salarios', 'sueldos', 'indice de salarios', 'remuneraciones', 'salario real', 'paritarias'],
        defaultCollapse: 'month',
    },
    // --- INDEC poverty & cost of living ---
    canasta_basica: {
        ids: ['150.1_LA_POBREZA_0_D_13'],
        description: 'Canasta Básica Total (CBT) / Línea de pobreza por adulto equivalente en pesos (mensual, desde 2016)',
        keywords: ['canasta basica', 'cbt', 'linea de pobreza', 'pobreza', 'costo de vida'],
        defaultCollapse: 'month',
    },
    canasta_alimentaria: {
        ids: ['150.1_LA_INDICIA_0_D_16'],
        description: 'Canasta Básica Alimentaria (CBA) / Línea de indigencia por adulto equivalente en pesos (mensual, desde 2016)',
        keywords: ['canasta alimentaria', 'cba', 'linea de indigencia', 'indigencia', 'alimentos basicos'],
        defaultCollapse: 'month',
    },
    // --- INDEC foreign trade ---
    exportaciones: {
        ids: ['74.3_IET_0_M_16'],
        description: 'Exportaciones totales en millones de dólares (mensual, desde 1992)',
        keywords: ['exportaciones', 'expo', 'ventas externas', 'comercio exterior'],
        defaultCollapse: 'month',
    },
    importaciones: {
        ids: ['74.3_IIT_0_M_25'],
        description: 'Importaciones totales en millones de dólares (mensual, desde 1992)',
        keywords: ['importaciones', 'impo', 'compras externas'],
        defaultCollapse: 'month',
    },
    balanza_comercial: {
        ids: ['74.3_IET_0_M_16', '74.3_IIT_0_M_25'],
        description: 'Balanza comercial: exportaciones e importaciones totales en millones de dólares (mensual)',
        keywords: ['balanza comercial', 'saldo comercial', 'comercio exterior', 'intercambio comercial'],
        defaultCollapse: 'month',
    },
    // --- INDEC industrial activity ---
    actividad_industrial: {
        ids: ['11.3_AGCS_2004_M_41'],
        description: 'EMAE Sector Industrial — Comercio mayorista/minorista y reparaciones, índice base 2004 (mensual)',
        keywords: ['industria', 'produccion industrial', 'actividad industrial', 'manufactura', 'emi', 'fabrica'],
        defaultCollapse: 'month',
    },
};

/**
 * Find catalog entries matching a query by keyword matching
 */
export function findCatalogMatch(query: string): typeof SERIES_CATALOG[string] | null {
    const normalizedQuery = query.toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, ''); // strip accents

    for (const entry of Object.values(SERIES_CATALOG)) {
        for (const keyword of entry.keywords) {
            const normalizedKeyword = keyword
                .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            if (normalizedQuery.includes(normalizedKeyword)) {
                return entry;
            }
        }
    }
    return null;
}

/**
 * Search for available time series by keyword
 */
export async function searchSeries(
    query: string,
    options: { limit?: number } = {}
): Promise<SeriesSearchResult[]> {
    const { limit = 10 } = options;

    try {
        const params = new URLSearchParams({
            q: query,
            limit: String(limit),
        });

        const response = await fetch(`${BASE_URL}/search?${params}`, {
            headers: { 'User-Agent': 'OpenArg/1.0' },
            signal: AbortSignal.timeout(10000),
        });

        if (!response.ok) return [];

        const data = await response.json();
        if (!data.data) return [];

        return data.data.map(
            (item: {
                field: { id: string; description: string; units: string; frequency: string; title: string };
                dataset: { title: string; source: string };
            }) => ({
                id: item.field.id,
                title: item.field.title || item.field.description,
                description: item.field.description,
                units: item.field.units,
                frequency: item.field.frequency,
                datasetTitle: item.dataset.title,
                source: item.dataset.source,
            })
        );
    } catch {
        return [];
    }
}

/**
 * Fetch time series data by series IDs
 */
export async function fetchSeries(
    seriesIds: string[],
    options: {
        startDate?: string;
        endDate?: string;
        representation?: 'value' | 'change' | 'percent_change' | 'percent_change_a_year_ago';
        collapse?: 'year' | 'semester' | 'quarter' | 'month' | 'week' | 'day';
        collapseAggregation?: 'avg' | 'sum' | 'min' | 'max' | 'end_of_period';
        limit?: number;
        format?: 'json' | 'csv';
    } = {}
): Promise<{ data: SeriesResponse; meta: SeriesMeta[] } | null> {
    try {
        const params = new URLSearchParams({
            ids: seriesIds.join(','),
            format: options.format || 'json',
            limit: String(options.limit || 1000),
        });

        if (options.startDate) params.set('start_date', options.startDate);
        if (options.endDate) params.set('end_date', options.endDate);
        if (options.representation) params.set('representation_mode', options.representation);
        if (options.collapse) params.set('collapse', options.collapse);
        if (options.collapseAggregation) params.set('collapse_aggregation', options.collapseAggregation);

        const response = await fetch(`${BASE_URL}/series?${params}`, {
            headers: { 'User-Agent': 'OpenArg/1.0' },
            signal: AbortSignal.timeout(15000),
        });

        if (!response.ok) return null;

        const result = (await response.json()) as SeriesResponse;
        return { data: result, meta: result.meta || [] };
    } catch {
        return null;
    }
}

/**
 * Convert Series de Tiempo results to DataResult format
 */
export function seriesToDataResult(
    seriesIds: string[],
    data: SeriesResponse,
    meta: SeriesMeta[]
): DataResult {
    const fieldMeta = meta.length > 0 ? meta[0] : null;

    const records = data.data.map((row) => {
        const record: Record<string, unknown> = { fecha: row[0] };
        seriesIds.forEach((id, index) => {
            record[id] = row[index + 1];
        });
        return record;
    });

    return {
        source: 'series_tiempo',
        portalName: 'API de Series de Tiempo',
        portalUrl: `https://datos.gob.ar/series/api/series/?ids=${seriesIds.join(',')}`,
        datasetTitle: fieldMeta?.dataset?.title || seriesIds.join(', '),
        format: 'time_series',
        records,
        metadata: {
            totalRecords: records.length,
            fetchedAt: new Date().toISOString(),
            description: fieldMeta?.field?.description || undefined,
        },
    };
}
