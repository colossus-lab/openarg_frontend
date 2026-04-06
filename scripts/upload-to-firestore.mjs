// ============================================================
// OpenArg — Upload Session Chunks to Firestore
// Reads local chunk JSON files, generates Gemini embeddings,
// and stores documents in Firestore with vector embeddings
// ============================================================
// Usage: node scripts/upload-to-firestore.mjs [--period 143] [--limit 5] [--batch-size 50]
//
// Requires: GOOGLE_APPLICATION_CREDENTIALS and GEMINI_API_KEY in .env.local

import { readFileSync, readdirSync, existsSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CHUNKS_DIR = join(__dirname, '..', 'data', 'chunks');
const PROGRESS_FILE = join(__dirname, '..', 'data', 'upload-progress.json');

// ─── Load env vars from .env.local ───
function loadEnv() {
    const envPath = join(__dirname, '..', '.env.local');
    if (!existsSync(envPath)) {
        console.error('[Upload] .env.local not found');
        process.exit(1);
    }
    const lines = readFileSync(envPath, 'utf-8').split('\n');
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx > 0) {
            const key = trimmed.slice(0, eqIdx).trim();
            const value = trimmed.slice(eqIdx + 1).trim();
            if (!process.env[key]) {
                process.env[key] = value;
            }
        }
    }
}

loadEnv();

// ─── Gemini Embedding via SDK (same as the app uses) ───
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
let embeddingModel = null;

async function initEmbeddingModel() {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    embeddingModel = genAI.getGenerativeModel({ model: 'gemini-embedding-001' });
    return embeddingModel;
}

async function generateEmbedding(text) {
    if (!embeddingModel) await initEmbeddingModel();

    // Truncate text to ~2000 chars to stay within token limits
    const truncated = text.slice(0, 2000);

    const result = await embeddingModel.embedContent(truncated);
    // Truncate to 2048 dims (Firestore max) — MRL preserves quality
    return result.embedding.values.slice(0, 2048);
}

// ─── Firestore (via firebase-admin) ───
async function getFirestore() {
    const { initializeApp, cert } = await import('firebase-admin/app');
    const { getFirestore: getFS } = await import('firebase-admin/firestore');
    const { FieldValue } = await import('firebase-admin/firestore');

    const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    const projectId = process.env.FIREBASE_PROJECT_ID;

    const app = initializeApp({
        credential: cert(credPath),
        projectId,
    });

    const db = getFS(app, process.env.FIREBASE_DATABASE_ID || '(default)');
    console.log(`[Upload] Using Firestore database: ${process.env.FIREBASE_DATABASE_ID || '(default)'}`);
    return { db, FieldValue };
}

// ─── Progress tracker ───
function loadProgress() {
    if (existsSync(PROGRESS_FILE)) {
        const raw = readFileSync(PROGRESS_FILE, 'utf-8').replace(/^\uFEFF/, '');
        try { return JSON.parse(raw); } catch { /* ignore */ }
    }
    return { uploadedFiles: [], totalChunksUploaded: 0 };
}

function saveProgress(progress) {
    writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2), 'utf-8');
}

// ─── Main ───
async function main() {
    const args = process.argv.slice(2);
    const periodFilter = args.includes('--period')
        ? parseInt(args[args.indexOf('--period') + 1])
        : null;
    const limit = args.includes('--limit')
        ? parseInt(args[args.indexOf('--limit') + 1])
        : Infinity;

    if (!GEMINI_API_KEY) {
        console.error('[Upload] Missing GEMINI_API_KEY or GOOGLE_API_KEY in .env.local');
        console.error('[Upload] Add your Gemini API key to .env.local:');
        console.error('[Upload]   GEMINI_API_KEY=your_key_here');
        process.exit(1);
    }

    // Init Firestore
    console.log('[Upload] Initializing Firestore...');
    const { db, FieldValue } = await getFirestore();

    const progress = loadProgress();

    // Find chunk files to upload
    if (!existsSync(CHUNKS_DIR)) {
        console.error('[Upload] Chunks directory not found. Run ingest-sesiones.mjs first.');
        process.exit(1);
    }

    let files = readdirSync(CHUNKS_DIR)
        .filter((f) => f.endsWith('.json'))
        .filter((f) => !progress.uploadedFiles.includes(f));

    if (periodFilter) {
        files = files.filter((f) => f.startsWith(`${periodFilter}-`));
    }

    files = files.slice(0, limit);

    console.log(`[Upload] ${files.length} chunk files to process\n`);

    let totalUploaded = 0;

    for (const file of files) {
        console.log(`\n═══ Processing ${file} ═══`);

        const chunks = JSON.parse(readFileSync(join(CHUNKS_DIR, file), 'utf-8'));
        console.log(`  ${chunks.length} chunks to embed and upload`);

        let successCount = 0;

        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];

            for (let retry = 0; retry < 3; retry++) {
                try {
                    // Generate embedding
                    const embedding = await generateEmbedding(chunk.text);

                    // Write individual document
                    const docRef = db
                        .collection('sesiones_chunks')
                        .doc(`P${chunk.periodo}_R${chunk.reunion}_C${chunk.chunkIndex}`);

                    await docRef.set({
                        periodo: chunk.periodo,
                        reunion: chunk.reunion,
                        fecha: chunk.fecha,
                        tipoSesion: chunk.tipoSesion || '',
                        speaker: chunk.speaker || '',
                        text: chunk.text,
                        chunkIndex: chunk.chunkIndex,
                        pdfUrl: chunk.pdfUrl || '',
                        totalPages: chunk.totalPages || 0,
                        embedding: FieldValue.vector(embedding),
                        uploadedAt: FieldValue.serverTimestamp(),
                    });

                    successCount++;
                    if (successCount % 10 === 0) {
                        console.log(`  Uploaded ${successCount}/${chunks.length} chunks`);
                    }

                    // Rate limit: small delay every 10 chunks
                    if (successCount % 10 === 0) {
                        await new Promise((r) => setTimeout(r, 500));
                    }

                    break; // success, no retry needed
                } catch (err) {
                    console.error(`  ❌ Chunk ${i} (attempt ${retry + 1}): ${err.message}`);
                    if (err.message.includes('429') || err.message.includes('RATE')) {
                        console.log('  ⏳ Rate limited, waiting 30s...');
                        await new Promise((r) => setTimeout(r, 30000));
                    } else if (retry < 2) {
                        await new Promise((r) => setTimeout(r, 2000));
                    }
                }
            }
        }

        console.log(`  ✅ ${chunks.length} chunks uploaded for ${file}`);
        totalUploaded += chunks.length;

        // Mark file as processed
        progress.uploadedFiles.push(file);
        progress.totalChunksUploaded += chunks.length;
        saveProgress(progress);
    }

    console.log(`\n════════════════════════════════════════`);
    console.log(`[Upload] Complete! ${totalUploaded} chunks uploaded this run`);
    console.log(`[Upload] Total uploaded: ${progress.totalChunksUploaded}`);
}

main().catch((err) => {
    console.error('[Upload] Fatal error:', err);
    process.exit(1);
});
