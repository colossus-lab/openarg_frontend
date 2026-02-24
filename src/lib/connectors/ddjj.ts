// ============================================================
// OpenArg — DDJJ Connector
// Queries the pre-processed patrimonial declarations dataset
// Generated from Oficina Anticorrupción PDFs
// ============================================================

import { DataResult } from '../agents/types';
import fs from 'fs';
import path from 'path';

/** A single DDJJ record */
export interface DDJJRecord {
    cuit: string;
    nombre: string;
    sexo: string;
    fechaNacimiento: string;
    estadoCivil: string;
    cargo: string;
    organismo: string;
    anioDeclaracion: string;
    tipoDeclaracion: string;
    bienesInicio: number;
    deudasInicio: number;
    bienesCierre: number;
    deudasCierre: number;
    patrimonioCierre: number;
    ingresosTrabajoNeto: number;
    gastosPersonales: number;
    bienes: {
        tipo: string;
        descripcion: string;
        importe: number;
        titularidad: string;
    }[];
}

// ── Dataset cache ────────────────────────────────────────────

let _dataset: DDJJRecord[] | null = null;

function loadDataset(): DDJJRecord[] {
    if (_dataset) return _dataset;

    // In Next.js, try loading from public/ at build time or from filesystem
    try {
        const filePath = path.join(process.cwd(), 'public', 'data', 'ddjj_dataset.json');
        const raw = fs.readFileSync(filePath, 'utf8');
        _dataset = JSON.parse(raw) as DDJJRecord[];
        console.log(`[DDJJ] Loaded ${_dataset.length} records from dataset`);
        return _dataset;
    } catch (err) {
        console.warn('[DDJJ] Failed to load dataset:', err instanceof Error ? err.message : err);
        return [];
    }
}

// ── Public API ───────────────────────────────────────────────

/**
 * Search DDJJ records by name or CUIT
 */
export function searchDDJJ(query: string, limit = 20): DDJJRecord[] {
    const dataset = loadDataset();
    const q = query.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    return dataset
        .filter((r) => {
            const nombre = r.nombre.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            const cuit = r.cuit.replace(/-/g, '');
            return nombre.includes(q) || cuit.includes(q.replace(/-/g, ''));
        })
        .slice(0, limit);
}

/**
 * Get a ranking of deputies by patrimony or income
 */
export function getDDJJRanking(
    sortBy: 'patrimonio' | 'ingresos' | 'bienes' = 'patrimonio',
    top = 10,
    order: 'desc' | 'asc' = 'desc'
): DDJJRecord[] {
    const dataset = loadDataset();

    const sortKey: keyof DDJJRecord =
        sortBy === 'patrimonio'
            ? 'patrimonioCierre'
            : sortBy === 'ingresos'
                ? 'ingresosTrabajoNeto'
                : 'bienesCierre';

    const sorted = [...dataset].sort((a, b) => {
        const aVal = a[sortKey] as number;
        const bVal = b[sortKey] as number;
        return order === 'desc' ? bVal - aVal : aVal - bVal;
    });

    return sorted.slice(0, top);
}

/**
 * Get a specific deputy's DDJJ by name
 */
export function getDDJJByName(name: string): DDJJRecord | null {
    const dataset = loadDataset();
    const q = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    return (
        dataset.find((r) => {
            const nombre = r.nombre.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            return nombre.includes(q);
        }) || null
    );
}

/**
 * Get dataset summary statistics
 */
export function getDDJJStats(): {
    total: number;
    anio: string;
    patrimonioPromedio: number;
    patrimonioMediano: number;
    patrimonioMaximo: { nombre: string; monto: number };
    patrimonioMinimo: { nombre: string; monto: number };
} {
    const dataset = loadDataset();
    if (dataset.length === 0) {
        return {
            total: 0,
            anio: '',
            patrimonioPromedio: 0,
            patrimonioMediano: 0,
            patrimonioMaximo: { nombre: '', monto: 0 },
            patrimonioMinimo: { nombre: '', monto: 0 },
        };
    }

    const patrimonios = dataset.map((r) => r.patrimonioCierre).sort((a, b) => a - b);
    const sum = patrimonios.reduce((a, b) => a + b, 0);

    return {
        total: dataset.length,
        anio: dataset[0]?.anioDeclaracion || '',
        patrimonioPromedio: sum / patrimonios.length,
        patrimonioMediano: patrimonios[Math.floor(patrimonios.length / 2)],
        patrimonioMaximo: {
            nombre: dataset[0].nombre,
            monto: dataset[0].patrimonioCierre,
        },
        patrimonioMinimo: {
            nombre: dataset[dataset.length - 1].nombre,
            monto: dataset[dataset.length - 1].patrimonioCierre,
        },
    };
}

// ── Data Result conversion ───────────────────────────────────

/**
 * Convert DDJJ records to DataResult format for the agent pipeline
 */
export function ddjjToDataResult(
    queryDescription: string,
    records: DDJJRecord[]
): DataResult {
    return {
        source: 'ddjj:oficina_anticorrupcion',
        portalName: 'Declaraciones Juradas Patrimoniales — Oficina Anticorrupción',
        portalUrl: 'https://www.argentina.gob.ar/anticorrupcion',
        datasetTitle: queryDescription,
        format: 'json',
        records: records.map((r) => ({
            cuit: r.cuit,
            nombre: r.nombre,
            sexo: r.sexo,
            cargo: r.cargo,
            anioDeclaracion: r.anioDeclaracion,
            patrimonioCierre: r.patrimonioCierre,
            bienesCierre: r.bienesCierre,
            deudasCierre: r.deudasCierre,
            ingresosTrabajoNeto: r.ingresosTrabajoNeto,
            gastosPersonales: r.gastosPersonales,
            cantidadBienes: r.bienes.length,
            // Include asset breakdown summary
            resumenBienes: summarizeAssets(r.bienes),
        })),
        metadata: {
            totalRecords: records.length,
            fetchedAt: new Date().toISOString(),
            description: 'Declaraciones Juradas Patrimoniales Integrales de Diputados Nacionales — Parte Pública',
            lastUpdated: records[0]?.anioDeclaracion ? `${records[0].anioDeclaracion}-12-31` : undefined,
        },
    };
}

/** Summarize assets by category */
function summarizeAssets(bienes: DDJJRecord['bienes']): Record<string, number> {
    const summary: Record<string, number> = {};
    for (const b of bienes) {
        const cat = b.tipo.replace(/EN EL (PAIS|EXTERIOR)/g, '').trim();
        summary[cat] = (summary[cat] || 0) + b.importe;
    }
    return summary;
}
