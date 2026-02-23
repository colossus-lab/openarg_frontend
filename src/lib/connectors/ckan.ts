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
 * Convert CKAN search results to normalized DataResult format
 */
export function toDataResults(
    results: { portal: CKANPortal; datasets: CKANDataset[] }[]
): DataResult[] {
    return results.flatMap(({ portal, datasets }) =>
        datasets.map((ds) => ({
            source: `ckan:${portal.id}`,
            portalName: portal.name,
            portalUrl: `${portal.baseUrl}/dataset/${ds.name}`,
            datasetTitle: ds.title,
            format: 'json' as const,
            records: ds.resources.map((r) => ({
                resourceId: r.id,
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
        }))
    );
}
