// ============================================================
// OpenArg — CKAN Connector
// Connects to datos.gob.ar and provincial CKAN portals
// ============================================================

import {
    CKANPortal,
    CKANSearchResponse,
    CKANDataset,
    CKANDatastoreResponse,
} from './types';
import { DataResult } from '../agents/types';

// Max CSV download size (2MB) and row limit
const MAX_CSV_BYTES = 2 * 1024 * 1024;
const MAX_CSV_ROWS = 500;

/** Registry of known CKAN portals in Argentina */
export const PORTALS: CKANPortal[] = [
    {
        id: 'nacional',
        name: 'Portal Nacional',
        baseUrl: 'https://datos.gob.ar',
        apiPath: '/api/3/action',
        region: 'Argentina',
        active: true,
    },
    {
        id: 'caba',
        name: 'Buenos Aires Ciudad',
        baseUrl: 'https://data.buenosaires.gob.ar',
        apiPath: '/api/3/action',
        region: 'CABA',
        active: true,
    },
    {
        id: 'pba',
        name: 'Provincia de Buenos Aires',
        baseUrl: 'https://catalogo.datos.gba.gob.ar',
        apiPath: '/api/3/action',
        region: 'Buenos Aires',
        active: true,
    },
    {
        id: 'cordoba',
        name: 'Córdoba',
        baseUrl: 'https://gobiernoabierto.cordoba.gob.ar',
        apiPath: '/api/3/action',
        region: 'Córdoba',
        active: true,
    },
    {
        id: 'santafe',
        name: 'Santa Fe',
        baseUrl: 'https://datos.santafe.gob.ar',
        apiPath: '/api/3/action',
        region: 'Santa Fe',
        active: true,
    },
    {
        id: 'mendoza',
        name: 'Mendoza',
        baseUrl: 'https://datosabiertos.mendoza.gov.ar',
        apiPath: '/api/3/action',
        region: 'Mendoza',
        active: true,
    },
    {
        id: 'entrerios',
        name: 'Entre Ríos',
        baseUrl: 'https://datos.entrerios.gov.ar',
        apiPath: '/api/3/action',
        region: 'Entre Ríos',
        active: true,
    },
    {
        id: 'diputados',
        name: 'Cámara de Diputados de la Nación',
        baseUrl: 'https://datos.hcdn.gob.ar',
        apiPath: '/api/3/action',
        region: 'Congreso Nacional',
        active: true,
    },
];

/**
 * Search datasets across one or all CKAN portals
 */
export async function searchDatasets(
    query: string,
    options: {
        portalId?: string;
        rows?: number;
        filterByOrg?: string;
        filterByTag?: string;
    } = {}
): Promise<{ portal: CKANPortal; datasets: CKANDataset[] }[]> {
    const { portalId, rows = 10, filterByOrg, filterByTag } = options;

    const targetPortals = portalId
        ? PORTALS.filter((p) => p.id === portalId && p.active)
        : PORTALS.filter((p) => p.active);

    const results = await Promise.allSettled(
        targetPortals.map(async (portal) => {
            const params = new URLSearchParams({
                q: query,
                rows: String(rows),
            });
            if (filterByOrg) params.set('fq', `organization:${filterByOrg}`);
            if (filterByTag) params.set('fq', `tags:${filterByTag}`);

            const url = `${portal.baseUrl}${portal.apiPath}/package_search?${params}`;

            const response = await fetch(url, {
                headers: { 'User-Agent': 'OpenArg/1.0' },
                signal: AbortSignal.timeout(15000),
            });

            if (!response.ok) {
                throw new Error(`${portal.name}: HTTP ${response.status}`);
            }

            const data = (await response.json()) as CKANSearchResponse;
            if (!data.success) throw new Error(`${portal.name}: API error`);

            return { portal, datasets: data.result.results };
        })
    );

    return results
        .filter(
            (r): r is PromiseFulfilledResult<{ portal: CKANPortal; datasets: CKANDataset[] }> =>
                r.status === 'fulfilled'
        )
        .map((r) => r.value)
        .filter((r) => r.datasets.length > 0);
}

/**
 * Get dataset details by ID from a specific portal
 */
export async function getDataset(
    portalId: string,
    datasetId: string
): Promise<CKANDataset | null> {
    const portal = PORTALS.find((p) => p.id === portalId);
    if (!portal) return null;

    try {
        const url = `${portal.baseUrl}${portal.apiPath}/package_show?id=${datasetId}`;
        const response = await fetch(url, {
            headers: { 'User-Agent': 'OpenArg/1.0' },
            signal: AbortSignal.timeout(10000),
        });

        if (!response.ok) return null;

        const data = await response.json();
        if (!data.success) return null;

        return data.result as CKANDataset;
    } catch {
        return null;
    }
}

/**
 * Query data from a CKAN Datastore resource
 */
export async function queryDatastore(
    portalId: string,
    resourceId: string,
    options: {
        filters?: Record<string, string>;
        limit?: number;
        offset?: number;
        sort?: string;
        q?: string;
    } = {}
): Promise<CKANDatastoreResponse | null> {
    const portal = PORTALS.find((p) => p.id === portalId);
    if (!portal) return null;

    try {
        const params = new URLSearchParams({
            resource_id: resourceId,
            limit: String(options.limit ?? 100),
        });
        if (options.offset) params.set('offset', String(options.offset));
        if (options.sort) params.set('sort', options.sort);
        if (options.q) params.set('q', options.q);
        if (options.filters) {
            params.set('filters', JSON.stringify(options.filters));
        }

        const url = `${portal.baseUrl}${portal.apiPath}/datastore_search?${params}`;
        const response = await fetch(url, {
            headers: { 'User-Agent': 'OpenArg/1.0' },
            signal: AbortSignal.timeout(15000),
        });

        if (!response.ok) return null;

        const data = await response.json();
        if (!data.success) return null;

        return data as CKANDatastoreResponse;
    } catch {
        return null;
    }
}

/**
 * Download and parse a CSV file from a URL.
 * Returns parsed records or null on failure.
 */
export async function fetchAndParseCSV(
    url: string
): Promise<Record<string, unknown>[] | null> {
    try {
        console.log(`[CKAN] Downloading CSV: ${url}`);
        const response = await fetch(url, {
            headers: { 'User-Agent': 'OpenArg/1.0' },
            signal: AbortSignal.timeout(20000),
        });

        if (!response.ok) {
            console.warn(`[CKAN] CSV download failed: HTTP ${response.status}`);
            return null;
        }

        // Check content-length to avoid downloading huge files
        const contentLength = response.headers.get('content-length');
        if (contentLength && parseInt(contentLength) > MAX_CSV_BYTES) {
            console.warn(`[CKAN] CSV too large (${contentLength} bytes), skipping`);
            return null;
        }

        let text = await response.text();

        // Enforce size limit on actual content
        if (text.length > MAX_CSV_BYTES) {
            console.warn(`[CKAN] CSV content too large (${text.length} chars), truncating`);
            text = text.slice(0, MAX_CSV_BYTES);
        }

        // Strip BOM if present
        if (text.charCodeAt(0) === 0xFEFF) {
            text = text.slice(1);
        }

        return parseCSV(text);
    } catch (err) {
        console.warn(`[CKAN] CSV download error:`, err instanceof Error ? err.message : err);
        return null;
    }
}

/**
 * Lightweight CSV parser that handles quoted fields and common edge cases.
 */
function parseCSV(text: string): Record<string, unknown>[] {
    const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
    if (lines.length < 2) return []; // Need at least header + 1 data row

    const parseLine = (line: string): string[] => {
        const fields: string[] = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (inQuotes) {
                if (char === '"') {
                    if (i + 1 < line.length && line[i + 1] === '"') {
                        current += '"';
                        i++; // skip escaped quote
                    } else {
                        inQuotes = false;
                    }
                } else {
                    current += char;
                }
            } else {
                if (char === '"') {
                    inQuotes = true;
                } else if (char === ',' || char === ';') {
                    fields.push(current.trim());
                    current = '';
                } else {
                    current += char;
                }
            }
        }
        fields.push(current.trim());
        return fields;
    };

    const headers = parseLine(lines[0]);
    if (headers.length === 0) return [];

    const records: Record<string, unknown>[] = [];
    const dataLines = lines.slice(1, MAX_CSV_ROWS + 1); // cap rows

    for (const line of dataLines) {
        const values = parseLine(line);
        const record: Record<string, unknown> = {};

        headers.forEach((header, i) => {
            const val = values[i] ?? '';
            // Try to parse as number
            const num = Number(val);
            record[header] = val !== '' && !isNaN(num) ? num : val;
        });

        records.push(record);
    }

    console.log(`[CKAN] Parsed CSV: ${records.length} rows, ${headers.length} columns (${headers.slice(0, 5).join(', ')}${headers.length > 5 ? '...' : ''})`);
    return records;
}

/**
 * Convert CKAN search results to normalized DataResult format.
 * Tries to fetch actual data from Datastore-enabled resources.
 * Falls back to direct CSV download if Datastore is not available.
 * Last resort: enriched dataset metadata with download links.
 */
export async function toDataResults(
    results: { portal: CKANPortal; datasets: CKANDataset[] }[]
): Promise<DataResult[]> {
    const dataResults: DataResult[] = [];

    for (const { portal, datasets } of results) {
        for (const ds of datasets) {
            // Try to get actual data from datastore for the first suitable resource
            let actualRecords: Record<string, unknown>[] | null = null;
            let datastoreTotal = 0;

            // Look for JSON/CSV resources that might have a Datastore
            const suitableResources = ds.resources.filter(
                (r) => ['CSV', 'JSON', 'csv', 'json'].includes(r.format)
            );

            for (const resource of suitableResources.slice(0, 2)) {
                try {
                    const dsResult = await queryDatastore(portal.id, resource.id, {
                        limit: 50,
                    });
                    if (dsResult && dsResult.result && dsResult.result.records.length > 0) {
                        actualRecords = dsResult.result.records;
                        datastoreTotal = dsResult.result.total;
                        console.log(`[CKAN] Datastore hit for ${ds.title}: ${dsResult.result.records.length} records`);
                        break;
                    }
                } catch {
                    // Continue to next resource
                }
            }

            if (actualRecords) {
                // We got real data from the datastore
                dataResults.push({
                    source: `ckan:${portal.id}`,
                    portalName: portal.name,
                    portalUrl: `${portal.baseUrl}/dataset/${ds.name}`,
                    datasetTitle: ds.title,
                    format: 'json',
                    records: actualRecords,
                    metadata: {
                        totalRecords: datastoreTotal,
                        fetchedAt: new Date().toISOString(),
                        description: ds.notes || undefined,
                        lastUpdated: ds.metadata_modified || undefined,
                    },
                });
                continue;
            }

            // ── Fallback: try direct CSV download ──
            const csvResources = ds.resources.filter(
                (r) => ['CSV', 'csv'].includes(r.format)
            );

            let csvParsed = false;
            for (const csvResource of csvResources.slice(0, 2)) {
                const csvRecords = await fetchAndParseCSV(csvResource.url);
                if (csvRecords && csvRecords.length > 0) {
                    dataResults.push({
                        source: `ckan:${portal.id}`,
                        portalName: portal.name,
                        portalUrl: `${portal.baseUrl}/dataset/${ds.name}`,
                        datasetTitle: ds.title,
                        format: 'csv',
                        records: csvRecords,
                        metadata: {
                            totalRecords: csvRecords.length,
                            fetchedAt: new Date().toISOString(),
                            description: ds.notes || undefined,
                            lastUpdated: ds.metadata_modified || undefined,
                        },
                    });
                    console.log(`[CKAN] CSV fallback success for ${ds.title}: ${csvRecords.length} rows`);
                    csvParsed = true;
                    break;
                }
            }

            if (!csvParsed) {
                // Last resort: provide enriched metadata about the dataset
                dataResults.push({
                    source: `ckan:${portal.id}`,
                    portalName: portal.name,
                    portalUrl: `${portal.baseUrl}/dataset/${ds.name}`,
                    datasetTitle: ds.title,
                    format: 'json',
                    records: ds.resources.map((r) => ({
                        _type: 'resource_metadata',
                        resourceName: r.name,
                        resourceUrl: r.url,
                        format: r.format,
                        description: r.description || '',
                    })),
                    metadata: {
                        totalRecords: ds.resources.length,
                        fetchedAt: new Date().toISOString(),
                        description: ds.notes || undefined,
                        lastUpdated: ds.metadata_modified || undefined,
                    },
                });
            }
        }
    }

    return dataResults;
}
