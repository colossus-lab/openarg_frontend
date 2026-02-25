// ============================================================
// OpenArg — ArgentinaDatos API Connector
// Fetches dólar (blue, cripto, etc.) and riesgo país data
// from the free, public ArgentinaDatos API.
// Docs: https://argentinadatos.com/docs
// ============================================================

import { DataResult } from '../agents/types';

const BASE_URL = 'https://api.argentinadatos.com/v1';

/** Response shape from /v1/cotizaciones/dolares/{casa} */
export interface DolarCotizacion {
    casa: string;
    fecha: string;
    compra: number | null;
    venta: number | null;
}

/** Response shape from /v1/finanzas/indices/riesgo-pais */
export interface RiesgoPais {
    fecha: string;
    valor: number;
}

/** Response shape from /v1/finanzas/indices/inflacion */
export interface InflacionMensual {
    fecha: string;
    valor: number;
}

/** Valid dólar types */
export type DolarCasa =
    | 'oficial'
    | 'blue'
    | 'bolsa'
    | 'contadoconliqui'
    | 'cripto'
    | 'mayorista'
    | 'solidario';

// ── Fetch helpers ────────────────────────────────────────────

async function fetchJSON<T>(path: string): Promise<T | null> {
    try {
        const response = await fetch(`${BASE_URL}${path}`, {
            headers: { 'User-Agent': 'OpenArg/1.0' },
            signal: AbortSignal.timeout(10000),
        });
        if (!response.ok) return null;
        return (await response.json()) as T;
    } catch {
        return null;
    }
}

// ── Public API ───────────────────────────────────────────────

/**
 * Fetch dólar cotizaciones. If `casa` is provided, returns that specific type.
 * Otherwise returns all types combined.
 */
export async function fetchDolarCotizaciones(
    casa?: DolarCasa,
): Promise<DolarCotizacion[] | null> {
    const path = casa
        ? `/cotizaciones/dolares/${casa}`
        : '/cotizaciones/dolares';
    return fetchJSON<DolarCotizacion[]>(path);
}

/**
 * Fetch riesgo país. If `ultimo` is true, returns only the latest value.
 */
export async function fetchRiesgoPais(
    ultimo?: boolean,
): Promise<RiesgoPais[] | null> {
    const path = ultimo
        ? '/finanzas/indices/riesgo-pais/ultimo'
        : '/finanzas/indices/riesgo-pais';
    const result = await fetchJSON<RiesgoPais | RiesgoPais[]>(path);
    if (!result) return null;
    // /ultimo returns a single object, normalize to array
    return Array.isArray(result) ? result : [result];
}

/**
 * Fetch inflación mensual from ArgentinaDatos (alternative to Series de Tiempo).
 */
export async function fetchInflacionMensual(): Promise<InflacionMensual[] | null> {
    return fetchJSON<InflacionMensual[]>('/finanzas/indices/inflacion');
}

// ── DataResult converters ────────────────────────────────────

/**
 * Convert dólar cotizaciones into the standard DataResult format.
 */
export function dolarToDataResult(
    data: DolarCotizacion[],
    casa?: string,
): DataResult {
    // Take last 60 entries to keep it manageable
    const recent = data.slice(-60);

    return {
        source: 'argentina_datos',
        portalName: 'ArgentinaDatos API',
        portalUrl: 'https://argentinadatos.com',
        datasetTitle: casa
            ? `Cotización Dólar ${casa.charAt(0).toUpperCase() + casa.slice(1)}`
            : 'Cotizaciones del Dólar (todas las casas)',
        format: 'time_series',
        records: recent.map((d) => ({
            fecha: d.fecha,
            casa: d.casa,
            compra: d.compra,
            venta: d.venta,
        })),
        metadata: {
            totalRecords: recent.length,
            fetchedAt: new Date().toISOString(),
            description: casa
                ? `Cotización histórica del dólar ${casa}`
                : 'Cotizaciones históricas de todos los tipos de dólar',
        },
    };
}

/**
 * Convert riesgo país data into the standard DataResult format.
 */
export function riesgoPaisToDataResult(data: RiesgoPais[]): DataResult {
    const recent = data.slice(-60);

    return {
        source: 'argentina_datos',
        portalName: 'ArgentinaDatos API',
        portalUrl: 'https://argentinadatos.com',
        datasetTitle: 'Riesgo País — EMBI+ Argentina',
        format: 'time_series',
        records: recent.map((d) => ({
            fecha: d.fecha,
            riesgo_pais: d.valor,
        })),
        metadata: {
            totalRecords: recent.length,
            fetchedAt: new Date().toISOString(),
            description: 'Índice de Riesgo País (EMBI+ Argentina, puntos básicos)',
        },
    };
}
