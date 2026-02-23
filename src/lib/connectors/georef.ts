// ============================================================
// OpenArg — Georef API Connector
// Geographic normalization via apis.datos.gob.ar/georef
// ============================================================

import {
    GeorefProvincia,
    GeorefDepartamento,
    GeorefMunicipio,
    GeorefLocalidad,
} from './types';
import { DataResult } from '../agents/types';

const BASE_URL = process.env.GEOREF_API_URL || 'https://apis.datos.gob.ar/georef/api';

/**
 * Get all Argentine provinces
 */
export async function getProvincias(
    options: { nombre?: string; max?: number } = {}
): Promise<GeorefProvincia[]> {
    try {
        const params = new URLSearchParams({ max: String(options.max || 24) });
        if (options.nombre) params.set('nombre', options.nombre);

        const response = await fetch(`${BASE_URL}/provincias?${params}`, {
            headers: { 'User-Agent': 'OpenArg/1.0' },
            signal: AbortSignal.timeout(10000),
        });

        if (!response.ok) return [];
        const data = await response.json();
        return data.provincias || [];
    } catch {
        return [];
    }
}

/**
 * Get departments (departamentos/partidos) optionally filtered by province
 */
export async function getDepartamentos(
    options: { provincia?: string; nombre?: string; max?: number } = {}
): Promise<GeorefDepartamento[]> {
    try {
        const params = new URLSearchParams({ max: String(options.max || 100) });
        if (options.provincia) params.set('provincia', options.provincia);
        if (options.nombre) params.set('nombre', options.nombre);

        const response = await fetch(`${BASE_URL}/departamentos?${params}`, {
            headers: { 'User-Agent': 'OpenArg/1.0' },
            signal: AbortSignal.timeout(10000),
        });

        if (!response.ok) return [];
        const data = await response.json();
        return data.departamentos || [];
    } catch {
        return [];
    }
}

/**
 * Get municipalities
 */
export async function getMunicipios(
    options: { provincia?: string; nombre?: string; max?: number } = {}
): Promise<GeorefMunicipio[]> {
    try {
        const params = new URLSearchParams({ max: String(options.max || 100) });
        if (options.provincia) params.set('provincia', options.provincia);
        if (options.nombre) params.set('nombre', options.nombre);

        const response = await fetch(`${BASE_URL}/municipios?${params}`, {
            headers: { 'User-Agent': 'OpenArg/1.0' },
            signal: AbortSignal.timeout(10000),
        });

        if (!response.ok) return [];
        const data = await response.json();
        return data.municipios || [];
    } catch {
        return [];
    }
}

/**
 * Get localities
 */
export async function getLocalidades(
    options: { provincia?: string; departamento?: string; nombre?: string; max?: number } = {}
): Promise<GeorefLocalidad[]> {
    try {
        const params = new URLSearchParams({ max: String(options.max || 100) });
        if (options.provincia) params.set('provincia', options.provincia);
        if (options.departamento) params.set('departamento', options.departamento);
        if (options.nombre) params.set('nombre', options.nombre);

        const response = await fetch(`${BASE_URL}/localidades?${params}`, {
            headers: { 'User-Agent': 'OpenArg/1.0' },
            signal: AbortSignal.timeout(10000),
        });

        if (!response.ok) return [];
        const data = await response.json();
        return data.localidades || [];
    } catch {
        return [];
    }
}

/**
 * Normalize a geographic name (returns the best match)
 */
export async function normalizeLocation(name: string): Promise<{
    type: 'provincia' | 'departamento' | 'municipio' | 'localidad';
    entity: GeorefProvincia | GeorefDepartamento | GeorefMunicipio | GeorefLocalidad;
} | null> {
    // Try province first
    const provincias = await getProvincias({ nombre: name, max: 1 });
    if (provincias.length > 0) {
        return { type: 'provincia', entity: provincias[0] };
    }

    // Try department
    const departamentos = await getDepartamentos({ nombre: name, max: 1 });
    if (departamentos.length > 0) {
        return { type: 'departamento', entity: departamentos[0] };
    }

    // Try municipality
    const municipios = await getMunicipios({ nombre: name, max: 1 });
    if (municipios.length > 0) {
        return { type: 'municipio', entity: municipios[0] };
    }

    // Try locality
    const localidades = await getLocalidades({ nombre: name, max: 1 });
    if (localidades.length > 0) {
        return { type: 'localidad', entity: localidades[0] };
    }

    return null;
}

/**
 * Convert Georef results to DataResult format
 */
export function georefToDataResult(
    query: string,
    entities: (GeorefProvincia | GeorefDepartamento | GeorefMunicipio | GeorefLocalidad)[],
    entityType: string
): DataResult {
    return {
        source: 'georef',
        portalName: 'API de Georef Argentina',
        portalUrl: `https://apis.datos.gob.ar/georef/api/${entityType}?nombre=${encodeURIComponent(query)}`,
        datasetTitle: `Entidades geográficas: ${entityType}`,
        format: 'geo',
        records: entities.map((e) => ({ ...e })),
        metadata: {
            totalRecords: entities.length,
            fetchedAt: new Date().toISOString(),
            description: `Resultados de ${entityType} para "${query}"`,
        },
    };
}
