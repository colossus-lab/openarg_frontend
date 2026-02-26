// ============================================================
// OpenArg — Sesiones Connector
// Searches congressional session transcription chunks
// Uses Firestore vector search when available, falls back to local JSON
// ============================================================

import { DataResult } from '../agents/types';

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

// ─── Firestore vector search ───

/**
 * Generate a query embedding using the Gemini REST API
 */
async function generateQueryEmbedding(text: string): Promise<number[]> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY not set');

    const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${apiKey}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'models/text-embedding-004',
                content: { parts: [{ text: text.slice(0, 2000) }] },
                taskType: 'RETRIEVAL_QUERY',
            }),
        }
    );

    if (!res.ok) {
        throw new Error(`Embedding API error: ${res.status}`);
    }

    const data = await res.json();
    return data.embedding.values;
}

/**
 * Search Firestore using vector similarity (cosine/dot-product)
 */
async function searchFirestore(params: SesionesSearchParams): Promise<SessionChunk[]> {
    try {
        const { getFirestoreDB } = await import('../firebase');
        const { FieldValue } = await import('firebase-admin/firestore');
        const db = getFirestoreDB();

        // Generate query embedding
        console.log(`[Sesiones] Generating embedding for: "${params.query}"`);
        const queryEmbedding = await generateQueryEmbedding(params.query);

        // Build Firestore vector query
        let query = db.collection('sesiones_chunks');

        // Apply filters before vector search
        let filteredQuery: FirebaseFirestore.Query = query;
        if (params.periodo) {
            filteredQuery = filteredQuery.where('periodo', '==', params.periodo);
        }

        // Vector nearest-neighbor search
        const vectorQuery = filteredQuery.findNearest({
            vectorField: 'embedding',
            queryVector: FieldValue.vector(queryEmbedding),
            limit: params.limit || 15,
            distanceMeasure: 'COSINE',
        });

        const snapshot = await vectorQuery.get();

        if (snapshot.empty) {
            console.log('[Sesiones] No Firestore results');
            return [];
        }

        console.log(`[Sesiones] Firestore returned ${snapshot.docs.length} results`);

        const chunks: SessionChunk[] = snapshot.docs.map((doc) => {
            const data = doc.data();
            return {
                periodo: data.periodo,
                reunion: data.reunion,
                fecha: data.fecha,
                tipoSesion: data.tipoSesion || '',
                pdfUrl: data.pdfUrl || '',
                totalPages: data.totalPages || 0,
                speaker: data.speaker || null,
                chunkIndex: data.chunkIndex || 0,
                partIndex: null,
                text: data.text,
            };
        });

        // Post-filter by orador if specified
        if (params.orador) {
            const oradorLower = params.orador.toLowerCase();
            return chunks.filter((c) =>
                c.speaker && c.speaker.toLowerCase().includes(oradorLower)
            );
        }

        return chunks;
    } catch (err) {
        console.warn('[Sesiones] Firestore search failed:', (err as Error).message);
        return [];
    }
}

// ─── Local file-based search (fallback) ───

let chunksCache: SessionChunk[] | null = null;

function loadChunksFromDisk(): SessionChunk[] {
    if (chunksCache) return chunksCache;

    try {
        const { existsSync, readdirSync, readFileSync } = require('fs');
        const { join } = require('path');
        const CHUNKS_DIR = join(process.cwd(), 'data', 'chunks');

        if (!existsSync(CHUNKS_DIR)) {
            console.warn('[Sesiones] Chunks directory not found');
            return [];
        }

        const files = readdirSync(CHUNKS_DIR).filter((f: string) => f.endsWith('.json'));
        console.log(`[Sesiones] Loading ${files.length} chunk files from disk...`);

        const allChunks: SessionChunk[] = [];
        for (const file of files) {
            try {
                const data = JSON.parse(readFileSync(join(CHUNKS_DIR, file), 'utf-8'));
                if (Array.isArray(data)) {
                    allChunks.push(...data);
                }
            } catch { /* skip bad files */ }
        }

        console.log(`[Sesiones] Loaded ${allChunks.length} chunks`);
        chunksCache = allChunks;
        return allChunks;
    } catch {
        return [];
    }
}

function searchLocal(params: SesionesSearchParams): SessionChunk[] {
    const chunks = loadChunksFromDisk();
    if (chunks.length === 0) return [];

    const limit = params.limit || 15;
    const queryTerms = params.query
        .toLowerCase()
        .split(/\s+/)
        .filter((t) => t.length > 2);

    let filtered = chunks;
    if (params.periodo) {
        filtered = filtered.filter((c) => c.periodo === params.periodo);
    }

    const scored = filtered.map((chunk) => {
        const textLower = chunk.text.toLowerCase();
        const speakerLower = (chunk.speaker || '').toLowerCase();

        let score = 0;

        for (const term of queryTerms) {
            const termRegex = new RegExp(term, 'gi');
            const textMatches = (textLower.match(termRegex) || []).length;
            score += textMatches * 2;
            if (speakerLower.includes(term)) score += 10;
        }

        if (params.orador) {
            const oradorLower = params.orador.toLowerCase();
            if (speakerLower.includes(oradorLower)) {
                score += 20;
            } else {
                score = score * 0.1;
            }
        }

        return { chunk, score };
    });

    return scored
        .filter((s) => s.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map((s) => s.chunk);
}

// ─── Public API ───

/**
 * Search session transcription chunks.
 * Tries Firestore vector search first, falls back to local keyword search.
 */
export async function searchSesiones(params: SesionesSearchParams): Promise<SessionChunk[]> {
    // Try Firestore first (vector search)
    if (process.env.FIREBASE_PROJECT_ID && process.env.GEMINI_API_KEY) {
        const firestoreResults = await searchFirestore(params);
        if (firestoreResults.length > 0) {
            return firestoreResults;
        }
        console.log('[Sesiones] Firestore returned no results, falling back to local search');
    }

    // Fallback to local keyword search
    return searchLocal(params);
}

/**
 * Convert search results to DataResult format for the analysis agent
 */
export function sesionesToDataResult(
    query: string,
    chunks: SessionChunk[]
): DataResult {
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
