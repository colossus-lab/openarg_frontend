// ============================================================
// OpenArg — Session Scraper
// Scrapes diputados.gov.ar/sesiones to catalog all session
// PDF URLs and metadata for the Diario de Sesiones
// ============================================================
// Usage: node scripts/scrape-sesiones.mjs [--period 143] [--all]

const BASE_URL = 'https://www.diputados.gov.ar';
const SESSIONS_URL = `${BASE_URL}/sesiones/`;
const PDF_BASE = 'https://www3.hcdn.gob.ar/dependencias/dtaquigrafos/diarios';

import { writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_FILE = join(__dirname, '..', 'data', 'sesiones-catalog.json');

/**
 * Fetch the main sessions page HTML and extract session data
 */
async function fetchSessionsPage() {
    console.log('[Scraper] Fetching sessions page...');
    const res = await fetch(SESSIONS_URL, {
        headers: { 'User-Agent': 'OpenArg/1.0 (Scraper)' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
}

/**
 * Parse the HTML to extract periods and sessions
 */
function parseSessionsHTML(html) {
    const sessions = [];

    // Extract all period sections
    // Pattern: "PERIODO {N} ({dateRange})"
    const periodRegex = /PERIODO\s+(\d+)\s*\(([^)]+)\)/gi;
    let periodMatch;
    const periods = [];

    while ((periodMatch = periodRegex.exec(html)) !== null) {
        periods.push({
            number: parseInt(periodMatch[1]),
            dateRange: periodMatch[2].trim(),
            position: periodMatch.index,
        });
    }

    console.log(`[Scraper] Found ${periods.length} periods`);

    // For each period, find session links
    // Pattern: href="...reunion=N&periodo=P..." or similar session links
    // Sessions follow pattern: "N° Reunión - Tipo de Sesión - (DD/MM/YYYY)"
    const sessionRegex = /(\d+)°?\s*Reuni[oó]n\s*-\s*([^-]+?)\s*-\s*\((\d{2}\/\d{2}\/\d{4})\)/gi;
    let sessionMatch;

    while ((sessionMatch = sessionRegex.exec(html)) !== null) {
        const reunionNum = parseInt(sessionMatch[1]);
        const tipoSesion = sessionMatch[2].trim();
        const fechaStr = sessionMatch[3];

        // Parse date DD/MM/YYYY → YYYY-MM-DD
        const [day, month, year] = fechaStr.split('/');
        const fecha = `${year}-${month}-${day}`;
        const fechaCompact = `${year}${month}${day}`;

        // Find which period this session belongs to
        let periodo = null;
        for (let i = 0; i < periods.length; i++) {
            const nextPos = i + 1 < periods.length ? periods[i + 1].position : html.length;
            if (sessionMatch.index > periods[i].position && sessionMatch.index < nextPos) {
                periodo = periods[i].number;
                break;
            }
        }

        if (!periodo) continue;

        // Construct PDF URL based on the discovered pattern
        // Pattern: periodo-{N}/diario_{YYYYMMDD}{REUNION_PADDED}.pdf
        const reunionPadded = String(reunionNum).padStart(2, '0');
        const pdfUrl = `${PDF_BASE}/periodo-${periodo}/diario_${fechaCompact}${reunionPadded}.pdf`;

        sessions.push({
            periodo,
            reunion: reunionNum,
            tipoSesion,
            fecha,
            fechaCompact,
            pdfUrl,
            raw: sessionMatch[0],
        });
    }

    return { periods, sessions };
}

/**
 * Verify which PDFs actually exist by sending HEAD requests
 */
async function verifyPDFs(sessions, { sample = false } = {}) {
    const toVerify = sample ? sessions.slice(0, 5) : sessions;
    console.log(`[Scraper] Verifying ${toVerify.length} PDF URLs...`);

    const verified = [];
    let found = 0;
    let notFound = 0;

    for (const session of toVerify) {
        try {
            const res = await fetch(session.pdfUrl, {
                method: 'HEAD',
                headers: { 'User-Agent': 'OpenArg/1.0' },
                signal: AbortSignal.timeout(10000),
            });

            if (res.ok) {
                const contentLength = res.headers.get('content-length');
                session.pdfExists = true;
                session.pdfSizeBytes = contentLength ? parseInt(contentLength) : null;
                session.pdfSizeMB = session.pdfSizeBytes
                    ? (session.pdfSizeBytes / 1024 / 1024).toFixed(1)
                    : null;
                found++;
                console.log(
                    `  ✅ P${session.periodo} R${session.reunion} (${session.fecha}) — ${session.pdfSizeMB || '?'}MB`
                );
            } else {
                session.pdfExists = false;
                notFound++;
                console.log(
                    `  ❌ P${session.periodo} R${session.reunion} (${session.fecha}) — HTTP ${res.status}`
                );
            }
        } catch (err) {
            session.pdfExists = false;
            notFound++;
            console.log(
                `  ❌ P${session.periodo} R${session.reunion} (${session.fecha}) — ${err.message}`
            );
        }

        verified.push(session);

        // Small delay to be polite
        await new Promise((r) => setTimeout(r, 200));
    }

    console.log(`[Scraper] Verification: ${found} found, ${notFound} not found`);
    return verified;
}

/**
 * Main execution
 */
async function main() {
    const args = process.argv.slice(2);
    const specificPeriod = args.includes('--period')
        ? parseInt(args[args.indexOf('--period') + 1])
        : null;
    const verifyAll = args.includes('--verify');
    const sample = args.includes('--sample');

    // Step 1: Fetch and parse
    const html = await fetchSessionsPage();
    const { periods, sessions } = parseSessionsHTML(html);

    console.log(`\n[Scraper] Found ${sessions.length} sessions across ${periods.length} periods\n`);

    // Filter by period if specified
    let filtered = specificPeriod
        ? sessions.filter((s) => s.periodo === specificPeriod)
        : sessions;

    if (specificPeriod) {
        console.log(`[Scraper] Filtered to period ${specificPeriod}: ${filtered.length} sessions\n`);
    }

    // Step 2: Verify PDFs
    if (verifyAll || sample) {
        filtered = await verifyPDFs(filtered, { sample });
    }

    // Step 3: Save catalog
    const catalog = {
        scrapedAt: new Date().toISOString(),
        totalPeriods: periods.length,
        totalSessions: filtered.length,
        periods,
        sessions: filtered,
    };

    // Ensure data directory exists
    const dataDir = join(__dirname, '..', 'data');
    if (!existsSync(dataDir)) {
        const { mkdirSync } = await import('fs');
        mkdirSync(dataDir, { recursive: true });
    }

    writeFileSync(OUTPUT_FILE, JSON.stringify(catalog, null, 2), 'utf-8');
    console.log(`\n[Scraper] Catalog saved to ${OUTPUT_FILE}`);
    console.log(`[Scraper] Total: ${filtered.length} sessions cataloged`);

    // Print summary
    const byPeriod = {};
    for (const s of filtered) {
        byPeriod[s.periodo] = (byPeriod[s.periodo] || 0) + 1;
    }
    console.log('\nSessions per period:');
    for (const [p, count] of Object.entries(byPeriod).sort(
        (a, b) => parseInt(b[0]) - parseInt(a[0])
    )) {
        console.log(`  Periodo ${p}: ${count} sesiones`);
    }
}

main().catch((err) => {
    console.error('[Scraper] Fatal error:', err);
    process.exit(1);
});
