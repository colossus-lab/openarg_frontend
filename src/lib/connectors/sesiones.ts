// ============================================================
// OpenArg — Sesiones Connector
// Searches congressional session transcription chunks
// Supports local file search (MVP) and Supabase vector search
// ============================================================

import { DataResult } from '../agents/types';
import { existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';

/** A single chunk of session transcription */
export interface SessionChunk {
    periodo: number;
    reunion: number;
    fecha: string;
    tipoSesion: string;
    pdfUrl: string;
    totalPages: number;
    speaker: string | null;
    chunkIndex: number;
    partIndex: number | null;
    text: string;
}

/** Search parameters */
export interface SesionesSearchParams {
    query: string;
    periodo?: number;
    orador?: string;
    limit?: number;
}

// ─── Local file-based search (MVP) ───

const CHUNKS_DIR = join(process.cwd(), 'data', 'chunks');

/** Cache loaded chunks in memory for speed */
let chunksCache: SessionChunk[] | null = null;

/**
 * Load all chunks from disk into memory (lazy, cached)
 */
function loadChunks(): SessionChunk[] {
    if (chunksCache) return chunksCache;

    if (!existsSync(CHUNKS_DIR)) {
        console.warn('[Sesiones] Chunks directory not found:', CHUNKS_DIR);
        return [];
    }

    const files = readdirSync(CHUNKS_DIR).filter((f) => f.endsWith('.json'));
    console.log(`[Sesiones] Loading ${files.length} chunk files...`);

    const allChunks: SessionChunk[] = [];
    for (const file of files) {
        try {
            const data = JSON.parse(readFileSync(join(CHUNKS_DIR, file), 'utf-8'));
            if (Array.isArray(data)) {
                allChunks.push(...data);
            }
        } catch (err) {
            console.warn(`[Sesiones] Error loading ${file}:`, err);
        }
    }

    console.log(`[Sesiones] Loaded ${allChunks.length} chunks from ${files.length} sessions`);
    chunksCache = allChunks;
    return allChunks;
}

/**
 * Simple keyword-based search across all chunks.
 * Scores by term frequency and speaker match boost.
 */
export function searchSesiones(params: SesionesSearchParams): SessionChunk[] {
    const chunks = loadChunks();
    if (chunks.length === 0) return [];

    const limit = params.limit || 15;
    const queryTerms = params.query
        .toLowerCase()
        .split(/\s+/)
        .filter((t) => t.length > 2);

    // Filter by periodo if specified
    let filtered = chunks;
    if (params.periodo) {
        filtered = filtered.filter((c) => c.periodo === params.periodo);
    }

    // Score each chunk
    const scored = filtered.map((chunk) => {
        const textLower = chunk.text.toLowerCase();
        const speakerLower = (chunk.speaker || '').toLowerCase();

        let score = 0;

        // Term frequency scoring
        for (const term of queryTerms) {
            const termRegex = new RegExp(term, 'gi');
            const textMatches = (textLower.match(termRegex) || []).length;
            score += textMatches * 2; // text matches

            // Speaker match boost
            if (speakerLower.includes(term)) {
                score += 10;
            }
        }

        // Orador filter boost
        if (params.orador) {
            const oradorLower = params.orador.toLowerCase();
            if (speakerLower.includes(oradorLower)) {
                score += 20;
            } else {
                // If orador specified but not matching, heavily penalize
                score = score * 0.1;
            }
        }

        return { chunk, score };
    });

    // Sort by score and return top results
    return scored
        .filter((s) => s.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map((s) => s.chunk);
}

/**
 * Convert search results to DataResult format for the analysis agent
 */
export function sesionesToDataResult(
    query: string,
    chunks: SessionChunk[]
): DataResult {
    // Group by session for better context
    const records = chunks.map((chunk) => ({
        periodo: chunk.periodo,
        reunion: chunk.reunion,
        fecha: chunk.fecha,
        tipoSesion: chunk.tipoSesion,
        orador: chunk.speaker || 'No identificado',
        texto: chunk.text,
        paginas_totales: chunk.totalPages,
        pdf: chunk.pdfUrl,
    }));

    // Summary metadata
    const uniqueSessions = new Set(chunks.map((c) => `P${c.periodo}-R${c.reunion}`));
    const uniqueSpeakers = new Set(chunks.filter((c) => c.speaker).map((c) => c.speaker!));

    return {
        source: 'sesiones:diputados',
        portalName: 'Diario de Sesiones — Cámara de Diputados',
        portalUrl: 'https://www.diputados.gov.ar/sesiones/',
        datasetTitle: `Transcripciones parlamentarias: "${query}"`,
        format: 'json',
        records,
        metadata: {
            totalRecords: chunks.length,
            fetchedAt: new Date().toISOString(),
            description: `Se encontraron ${chunks.length} fragmentos relevantes en ${uniqueSessions.size} sesión(es), con intervenciones de ${uniqueSpeakers.size} orador(es). Los textos son transcripciones taquigráficas oficiales del Diario de Sesiones de la HCDN.`,
        },
    };
}
