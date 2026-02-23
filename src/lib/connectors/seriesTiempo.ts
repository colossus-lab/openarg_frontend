// ============================================================
// OpenArg — Series de Tiempo API Connector
// Fetches economic/social time-series from apis.datos.gob.ar
// ============================================================

import { SeriesResponse, SeriesMeta, SeriesSearchResult } from './types';
import { DataResult } from '../agents/types';

const BASE_URL = process.env.SERIES_TIEMPO_API_URL || 'https://apis.datos.gob.ar/series/api';

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
