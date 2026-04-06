// ============================================================
// OpenArg — Session PDF Ingestion Pipeline
// Downloads PDFs, extracts text, chunks by speaker, generates
// embeddings, and stores in Supabase pgvector
// ============================================================
// Usage: node scripts/ingest-sesiones.mjs [--period 143] [--limit 5] [--dry-run]

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CATALOG_FILE = join(__dirname, '..', 'data', 'sesiones-catalog.json');
const CHUNKS_DIR = join(__dirname, '..', 'data', 'chunks');
const PROGRESS_FILE = join(__dirname, '..', 'data', 'ingest-progress.json');

// Config
const MAX_CHUNK_TOKENS = 800;     // ~800 tokens per chunk
const CHUNK_OVERLAP_CHARS = 200;  // overlap between chunks
const MAX_PDF_SIZE_MB = 50;       // skip PDFs larger than this

// ─── Speaker detection regex ───
// Matches patterns like:
// "Sr. APELLIDO.—" or "Sra. APELLIDO.—" or "Sr. Presidente (APELLIDO).—"
const SPEAKER_REGEX = /^(Sra?\.\s+(?:Presidenta?|[A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑa-záéíóúñ\s,]+?)(?:\s*\([^)]*\))?)\s*[.—–-]+\s*/gm;

/**
 * Extract text from a PDF buffer using pdfjs-dist.
 * We import it dynamically because it's an ESM-compatible module.
 */
async function extractTextFromPDF(buffer) {
    // Use pdfjs-dist with Node.js canvas-less mode
    const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');

    const uint8Array = new Uint8Array(buffer);
    const doc = await pdfjsLib.getDocument({ data: uint8Array }).promise;

    const pages = [];
    for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i);
        const content = await page.getTextContent();

        const pageText = content.items
            .map((item) => ('str' in item ? item.str : ''))
            .join(' ')
            .replace(/\s+/g, ' ')
            .trim();

        if (pageText.length > 10) {
            pages.push({ pageNum: i, text: pageText });
        }
    }

    return pages;
}

/**
 * Chunk text by speaker interventions.
 * Falls back to paragraph-based chunking if no speakers detected.
 */
function chunkBySpaker(pages, sessionMeta) {
    const fullText = pages.map((p) => p.text).join('\n');

    // Try speaker-based chunking
    const speakerChunks = [];
    let lastSpeaker = null;
    let lastChunkStart = 0;

    const matches = [...fullText.matchAll(SPEAKER_REGEX)];

    if (matches.length > 5) {
        // Speaker-based chunking
        for (let i = 0; i < matches.length; i++) {
            const match = matches[i];
            const speaker = match[1].trim();
            const startPos = match.index;

            // Close previous speaker's chunk
            if (lastSpeaker !== null && startPos > lastChunkStart) {
                const text = fullText.slice(lastChunkStart, startPos).trim();
                if (text.length > 50) {
                    speakerChunks.push({
                        speaker: lastSpeaker,
                        text,
                        charStart: lastChunkStart,
                        charEnd: startPos,
                    });
                }
            }

            lastSpeaker = speaker;
            lastChunkStart = startPos;
        }

        // Don't forget the last speaker's text
        if (lastSpeaker !== null) {
            const text = fullText.slice(lastChunkStart).trim();
            if (text.length > 50) {
                speakerChunks.push({
                    speaker: lastSpeaker,
                    text,
                    charStart: lastChunkStart,
                    charEnd: fullText.length,
                });
            }
        }
    }

    // If we got good speaker chunks, subdivide long ones
    const sourceChunks = speakerChunks.length > 5 ? speakerChunks : null;

    // Build final chunks
    const finalChunks = [];

    if (sourceChunks) {
        // Speaker-based: subdivide chunks that are too long
        for (const sc of sourceChunks) {
            const subChunks = subdivideText(sc.text, MAX_CHUNK_TOKENS);
            for (let i = 0; i < subChunks.length; i++) {
                finalChunks.push({
                    ...sessionMeta,
                    speaker: sc.speaker,
                    chunkIndex: finalChunks.length,
                    partIndex: subChunks.length > 1 ? i + 1 : null,
                    text: subChunks[i],
                });
            }
        }
    } else {
        // Fallback: fixed-size chunking with overlap
        const subChunks = subdivideText(fullText, MAX_CHUNK_TOKENS);
        for (let i = 0; i < subChunks.length; i++) {
            finalChunks.push({
                ...sessionMeta,
                speaker: null,
                chunkIndex: i,
                partIndex: null,
                text: subChunks[i],
            });
        }
    }

    return finalChunks;
}

/**
 * Subdivide a long text into chunks of approximately maxTokens tokens.
 * Uses sentence boundaries where possible.
 */
function subdivideText(text, maxTokens) {
    const maxChars = maxTokens * 4; // rough approximation: 1 token ≈ 4 chars in Spanish

    if (text.length <= maxChars) return [text];

    const chunks = [];
    let start = 0;

    while (start < text.length) {
        let end = start + maxChars;

        if (end >= text.length) {
            chunks.push(text.slice(start).trim());
            break;
        }

        // Try to break at sentence boundary
        const searchWindow = text.slice(Math.max(start, end - 200), end);
        const lastPeriod = searchWindow.lastIndexOf('. ');
        const lastNewline = searchWindow.lastIndexOf('\n');
        const breakPoint = Math.max(lastPeriod, lastNewline);

        if (breakPoint > 0) {
            end = (end - 200) + breakPoint + 2;
        }

        chunks.push(text.slice(start, end).trim());
        start = end - CHUNK_OVERLAP_CHARS; // overlap for context continuity
    }

    return chunks.filter((c) => c.length > 50);
}

/**
 * Load or initialize progress tracker
 */
function loadProgress() {
    if (existsSync(PROGRESS_FILE)) {
        return JSON.parse(readFileSync(PROGRESS_FILE, 'utf-8'));
    }
    return { processedSessions: [], lastRun: null };
}

function saveProgress(progress) {
    writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2), 'utf-8');
}

/**
 * Main pipeline
 */
async function main() {
    const args = process.argv.slice(2);
    const periodFilter = args.includes('--period')
        ? parseInt(args[args.indexOf('--period') + 1])
        : null;
    const limit = args.includes('--limit')
        ? parseInt(args[args.indexOf('--limit') + 1])
        : Infinity;
    const dryRun = args.includes('--dry-run');

    // Load catalog
    if (!existsSync(CATALOG_FILE)) {
        console.error('[Ingest] Catalog not found. Run scrape-sesiones.mjs first.');
        process.exit(1);
    }

    const catalog = JSON.parse(readFileSync(CATALOG_FILE, 'utf-8'));
    const progress = loadProgress();

    // Ensure chunks directory
    if (!existsSync(CHUNKS_DIR)) mkdirSync(CHUNKS_DIR, { recursive: true });

    // Filter sessions
    let sessions = catalog.sessions;
    if (periodFilter) {
        sessions = sessions.filter((s) => s.periodo === periodFilter);
    }

    // Skip already processed
    sessions = sessions.filter(
        (s) => !progress.processedSessions.includes(`${s.periodo}-${s.reunion}`)
    );

    // Apply limit
    sessions = sessions.slice(0, limit);

    console.log(`[Ingest] Processing ${sessions.length} sessions (period: ${periodFilter || 'all'}, limit: ${limit})\n`);

    if (dryRun) {
        console.log('[Ingest] DRY RUN — would process:');
        for (const s of sessions) {
            console.log(`  P${s.periodo} R${s.reunion} (${s.fecha}) — ${s.pdfUrl}`);
        }
        return;
    }

    let totalChunks = 0;

    for (const session of sessions) {
        const sessionId = `${session.periodo}-${session.reunion}`;
        console.log(`\n═══ Processing P${session.periodo} R${session.reunion} (${session.fecha}) ═══`);

        try {
            // Step 1: Download PDF
            console.log(`  [1/3] Downloading PDF...`);
            const res = await fetch(session.pdfUrl, {
                headers: { 'User-Agent': 'OpenArg/1.0' },
                signal: AbortSignal.timeout(60000),
            });

            if (!res.ok) {
                console.warn(`  ❌ Download failed: HTTP ${res.status}`);
                continue;
            }

            const contentLength = res.headers.get('content-length');
            const sizeMB = contentLength ? (parseInt(contentLength) / 1024 / 1024).toFixed(1) : '?';
            console.log(`  Downloaded: ${sizeMB}MB`);

            if (contentLength && parseInt(contentLength) > MAX_PDF_SIZE_MB * 1024 * 1024) {
                console.warn(`  ⚠️ PDF too large (${sizeMB}MB), skipping`);
                continue;
            }

            const buffer = await res.arrayBuffer();

            // Step 2: Extract text
            console.log(`  [2/3] Extracting text...`);
            const pages = await extractTextFromPDF(buffer);
            console.log(`  Extracted ${pages.length} pages`);

            if (pages.length === 0) {
                console.warn(`  ⚠️ No text extracted, skipping`);
                continue;
            }

            // Step 3: Chunk
            console.log(`  [3/3] Chunking...`);
            const sessionMeta = {
                periodo: session.periodo,
                reunion: session.reunion,
                fecha: session.fecha,
                tipoSesion: session.tipoSesion,
                pdfUrl: session.pdfUrl,
                totalPages: pages.length,
            };

            const chunks = chunkBySpaker(pages, sessionMeta);
            console.log(`  Generated ${chunks.length} chunks`);

            // Save chunks to disk (for later embedding/upload)
            const chunkFile = join(CHUNKS_DIR, `${sessionId}.json`);
            writeFileSync(chunkFile, JSON.stringify(chunks, null, 2), 'utf-8');

            totalChunks += chunks.length;

            // Mark as processed
            progress.processedSessions.push(sessionId);
            progress.lastRun = new Date().toISOString();
            saveProgress(progress);

            // Sample output
            if (chunks.length > 0) {
                const sample = chunks[0];
                console.log(`  Sample chunk — Speaker: ${sample.speaker || '(ninguno)'}`);
                console.log(`  Text preview: "${sample.text.slice(0, 150)}..."`);
            }
        } catch (err) {
            console.error(`  ❌ Error: ${err.message}`);
        }

        // Polite delay between downloads
        await new Promise((r) => setTimeout(r, 1000));
    }

    console.log(`\n════════════════════════════════════════`);
    console.log(`[Ingest] Complete! ${totalChunks} total chunks generated`);
    console.log(`[Ingest] Processed sessions: ${progress.processedSessions.length}`);
}

main().catch((err) => {
    console.error('[Ingest] Fatal error:', err);
    process.exit(1);
});
