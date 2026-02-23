// ============================================================
// OpenArg — Data Connector Types
// ============================================================

/** Configuration for a CKAN portal */
export interface CKANPortal {
    id: string;
    name: string;
    baseUrl: string;
    apiPath: string;
    region: string;
    active: boolean;
}

/** CKAN package search response */
export interface CKANSearchResponse {
    success: boolean;
    result: {
        count: number;
        results: CKANDataset[];
    };
}

/** A single CKAN dataset */
export interface CKANDataset {
    id: string;
    name: string;
    title: string;
    notes?: string;
    url?: string;
    resources: CKANResource[];
    organization?: {
        name: string;
        title: string;
    };
    metadata_modified?: string;
    tags?: { name: string }[];
    groups?: { title: string }[];
}

/** A resource within a CKAN dataset */
export interface CKANResource {
    id: string;
    name: string;
    url: string;
    format: string;
    description?: string;
    last_modified?: string;
}

/** CKAN Datastore search response */
export interface CKANDatastoreResponse {
    success: boolean;
    result: {
        records: Record<string, unknown>[];
        total: number;
        fields: { id: string; type: string }[];
    };
}

/** Series de Tiempo API response */
export interface SeriesResponse {
    data: [string, ...number[]][];
    meta: SeriesMeta[];
    params: Record<string, unknown>;
    count: number;
}

/** Metadata for a time series */
export interface SeriesMeta {
    catalog: { title: string };
    dataset: { title: string; source: string; description: string };
    distribution: { title: string };
    field: {
        id: string;
        description: string;
        units: string;
        frequency: string;
    };
}

/** Series search result */
export interface SeriesSearchResult {
    id: string;
    title: string;
    description: string;
    units: string;
    frequency: string;
    datasetTitle: string;
    source: string;
}

/** Georef province */
export interface GeorefProvincia {
    id: string;
    nombre: string;
    centroide: { lat: number; lon: number };
}

/** Georef department */
export interface GeorefDepartamento {
    id: string;
    nombre: string;
    provincia: { id: string; nombre: string };
    centroide: { lat: number; lon: number };
}

/** Georef municipality */
export interface GeorefMunicipio {
    id: string;
    nombre: string;
    provincia: { id: string; nombre: string };
    centroide: { lat: number; lon: number };
}

/** Georef locality */
export interface GeorefLocalidad {
    id: string;
    nombre: string;
    provincia: { id: string; nombre: string };
    departamento: { id: string; nombre: string };
    municipio?: { id: string; nombre: string };
    centroide: { lat: number; lon: number };
}
