// ============================================================
// OpenArg — DDJJ PDF Extraction Script
// Parses patrimonial declaration PDFs from Oficina Anticorrupción
// into a structured JSON dataset
// Usage: node scripts/extract-ddjj.mjs
// ============================================================

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as pdfjsLib from 'pdfjs-dist/build/pdf.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PDF_DIR = path.resolve(__dirname, '../../ddjj_descargas');
const OUTPUT_FILE = path.resolve(__dirname, '../public/data/ddjj_dataset.json');

// ── Helpers ──────────────────────────────────────────────────

/** Parse Argentine number format: "152.197.539,63" → 152197539.63 */
function parseArgNumber(str) {
    if (!str || str === '----') return 0;
    const cleaned = str.replace(/\./g, '').replace(',', '.').trim();
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
}

/** Format CUIT from filename: "20056166069" → "20-05616606-9" */
function formatCuit(raw) {
    if (raw.length === 11) {
        return `${raw.slice(0, 2)}-${raw.slice(2, 10)}-${raw.slice(10)}`;
    }
    return raw;
}

/** Extract text from a PDF file */
async function extractText(filePath) {
    const data = new Uint8Array(fs.readFileSync(filePath));
    const doc = await pdfjsLib.getDocument({ data }).promise;
    let fullText = '';
    for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i);
        const content = await page.getTextContent();
        const text = content.items.map(it => it.str).join(' ');
        fullText += text + '\n';
    }
    return fullText;
}

// ── Parser ───────────────────────────────────────────────────

function parseDDJJ(text, cuitRaw) {
    const record = {
        cuit: formatCuit(cuitRaw),
        nombre: '',
        sexo: '',
        fechaNacimiento: '',
        estadoCivil: '',
        cargo: '',
        organismo: '',
        anioDeclaracion: '',
        tipoDeclaracion: '',
        bienesInicio: 0,
        deudasInicio: 0,
        bienesCierre: 0,
        deudasCierre: 0,
        patrimonioCierre: 0,
        ingresosTrabajoNeto: 0,
        gastosPersonales: 0,
        bienes: [],
    };

    // ── Año y tipo de declaración ──
    const declMatch = text.match(/DECLARACIÓN\s*:\s*(\w+)\s+(\d{4})/i);
    if (declMatch) {
        record.tipoDeclaracion = declMatch[1].trim();
        record.anioDeclaracion = declMatch[2];
    }

    // ── Datos Personales ──
    // Pattern: CUIT   Nombre   Sexo   Fecha Nac.   Est.Civil   Ingreso APN
    // "20-05616606-9   MOREAU LEOPOLDO RAUL GUIDO   Masculino   05/11/1946   CASADO/A   10/10/1983"
    const cuitFormatted = record.cuit;
    const cuitPattern = cuitFormatted.replace(/-/g, '[-\\s]?');
    const personalRegex = new RegExp(
        cuitPattern + '\\s+([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ\\s]+?)\\s+(Masculino|Femenino|Otro)\\s+(\\d{2}/\\d{2}/\\d{4})\\s+([A-ZÁÉÍÓÚÑ/]+(?:\\s*\\/\\s*[A-ZÁÉÍÓÚÑ]+)?)\\s',
        'i'
    );
    const personalMatch = text.match(personalRegex);
    if (personalMatch) {
        record.nombre = personalMatch[1].trim();
        record.sexo = personalMatch[2];
        record.fechaNacimiento = personalMatch[3];
        record.estadoCivil = personalMatch[4].trim();
    }

    // ── Cargo ──
    const cargoMatch = text.match(
        /HONORABLE CAMARA DE DIPUTADOS DE LA NACION[\s\S]*?(?:ADMINISTRACIÓN PÚBLICA[\s\S]*?)?([A-ZÁÉÍÓÚÑ\s]+?(?:NACIONAL|DIPUTAD[OA]))[\s\S]*?\d{1,2}\/\d{4}/i
    );
    if (cargoMatch) {
        record.cargo = cargoMatch[1].trim().replace(/\s+/g, ' ');
    }
    // Fallback
    if (!record.cargo) {
        if (text.includes('DIPUTADO NACIONAL') || text.includes('DIPUTADA NACIONAL')) {
            record.cargo = text.includes('DIPUTADA NACIONAL') ? 'DIPUTADA NACIONAL' : 'DIPUTADO NACIONAL';
        }
    }

    record.organismo = 'HONORABLE CAMARA DE DIPUTADOS DE LA NACION';

    // ── Evolución Patrimonial (Sección 9) ──
    const bienesInicioMatch = text.match(
        /Bienes,?\s*dep[oó]sitos\s+y\s+dinero\s+al\s+Inicio\s+del\s+a[ñn]o\s+([\d.,]+)/i
    );
    if (bienesInicioMatch) {
        record.bienesInicio = parseArgNumber(bienesInicioMatch[1]);
    }

    const deudasInicioMatch = text.match(
        /Deudas\s+al\s+Inicio\s+del\s+a[ñn]o\s+([\d.,]+)/i
    );
    if (deudasInicioMatch) {
        record.deudasInicio = parseArgNumber(deudasInicioMatch[1]);
    }

    const bienesCierreMatch = text.match(
        /Bienes,?\s*dep[oó]sitos\s+y\s+dinero\s+al\s+final\s+del\s+a[ñn]o\s+([\d.,]+)/i
    );
    if (bienesCierreMatch) {
        record.bienesCierre = parseArgNumber(bienesCierreMatch[1]);
    }

    const deudasCierreMatch = text.match(
        /Deudas\s+al\s+final\s+del\s+a[ñn]o\s+([\d.,]+)/i
    );
    if (deudasCierreMatch) {
        record.deudasCierre = parseArgNumber(deudasCierreMatch[1]);
    }

    record.patrimonioCierre = record.bienesCierre - record.deudasCierre;

    // ── Ingresos del trabajo (Sección 10) ──
    const ingresosMatch = text.match(
        /Ingresos\s+del\s+trabajo,?\s*de\s+alquileres\s+y\s+otras\s+rentas\s+neto\s+de\s+gastos\s+([\d.,]+)/i
    );
    if (ingresosMatch) {
        record.ingresosTrabajoNeto = parseArgNumber(ingresosMatch[1]);
    }

    const gastosMatch = text.match(
        /Gastos\s+[Pp]ersonales\s+([\d.,]+)/i
    );
    if (gastosMatch) {
        record.gastosPersonales = parseArgNumber(gastosMatch[1]);
    }

    // ── Bienes detallados (Sección 6: Bienes al Cierre) ──
    // Parse items between "6 Bienes al Cierre del Período" and "9 Evolucion Patrimonial"
    const bienesSection = text.match(
        /6\s+Bienes\s+al\s+Cierre\s+del\s+Per[ií]odo([\s\S]*?)(?:9\s+Evolucion\s+Patrimonial|7\s+Deudas\s+al\s+Inicio)/i
    );

    if (bienesSection) {
        const section = bienesSection[1];

        // Match each asset block: TYPE   Description   ...   AMOUNT
        const assetTypes = [
            'INMUEBLES EN EL PAIS',
            'INMUEBLES EN EL EXTERIOR',
            'AUTOMOTORES EN EL PAIS',
            'AUTOMOTORES EN EL EXTERIOR',
            'BIENES MUEBLES REGISTRADOS EN EL PAIS',
            'BIENES MUEBLES REGISTRADOS EN EL EXTERIOR',
            'DEPOSITO DE DINERO EN EL PAIS',
            'DEPOSITO DE DINERO EN EL EXTERIOR',
            'DINERO EN EFECTIVO EN EL PAIS',
            'DINERO EN EFECTIVO EN EL EXTERIOR',
            'TITULOS Y ACCIONES',
            'INVERSIONES',
            'CREDITOS',
            'PARTICIPACIONES SOCIETARIAS',
            'OTROS BIENES',
            'TOTAL DE BIENES EN EL HOGAR',
        ];

        for (const tipo of assetTypes) {
            const escapedTipo = tipo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(
                escapedTipo + '\\s+(.+?)\\s+(\\d{1,3}(?:\\.\\d{3})*,\\d{2})\\s',
                'g'
            );
            let match;
            while ((match = regex.exec(section)) !== null) {
                const descBlock = match[1];
                const importe = parseArgNumber(match[2]);

                // Extract titularidad (percentage)
                const titMatch = descBlock.match(/(\d+)%/);
                const titularidad = titMatch ? `${titMatch[1]}%` : '----';

                // Clean description (remove origin/titularity parts)
                let desc = descBlock
                    .replace(/INGRESOS PROPIOS|VENTA ACTIVOS|HERENCIA|DONACION|OTROS/g, '')
                    .replace(/\d+%/g, '')
                    .replace(/----/g, '')
                    .trim()
                    .replace(/\s+/g, ' ');

                record.bienes.push({ tipo, descripcion: desc, importe, titularidad });
            }
        }
    }

    return record;
}

// ── Main ─────────────────────────────────────────────────────

async function main() {
    console.log('🔍 Scanning PDF directory:', PDF_DIR);

    if (!fs.existsSync(PDF_DIR)) {
        console.error('❌ PDF directory not found:', PDF_DIR);
        process.exit(1);
    }

    const pdfFiles = fs.readdirSync(PDF_DIR).filter(f => f.endsWith('.pdf'));
    console.log(`📄 Found ${pdfFiles.length} PDF files\n`);

    const dataset = [];
    let errors = 0;
    let noName = 0;

    for (let i = 0; i < pdfFiles.length; i++) {
        const file = pdfFiles[i];
        const cuitRaw = file.replace('.pdf', '');
        const filePath = path.join(PDF_DIR, file);

        try {
            const text = await extractText(filePath);
            const record = parseDDJJ(text, cuitRaw);

            if (!record.nombre) {
                noName++;
                console.warn(`⚠️  [${i + 1}/${pdfFiles.length}] ${file}: No name extracted`);
            }

            dataset.push(record);

            if ((i + 1) % 20 === 0 || i === pdfFiles.length - 1) {
                console.log(`✅ [${i + 1}/${pdfFiles.length}] Processed — last: ${record.nombre || cuitRaw}`);
            }
        } catch (err) {
            errors++;
            console.error(`❌ [${i + 1}/${pdfFiles.length}] ${file}: ${err.message}`);
        }
    }

    // Sort by patrimonioCierre descending
    dataset.sort((a, b) => b.patrimonioCierre - a.patrimonioCierre);

    // Ensure output directory exists
    const outputDir = path.dirname(OUTPUT_FILE);
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(dataset, null, 2), 'utf8');

    console.log('\n' + '='.repeat(50));
    console.log(`📊 Extraction complete:`);
    console.log(`   Total PDFs: ${pdfFiles.length}`);
    console.log(`   Extracted:  ${dataset.length}`);
    console.log(`   Errors:     ${errors}`);
    console.log(`   No name:    ${noName}`);
    console.log(`   Output:     ${OUTPUT_FILE}`);
    console.log('='.repeat(50));

    // Print top 5 by patrimonio
    console.log('\n🏆 Top 5 por Patrimonio al Cierre:');
    dataset.slice(0, 5).forEach((r, i) => {
        const p = r.patrimonioCierre.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' });
        console.log(`   ${i + 1}. ${r.nombre || r.cuit} — ${p}`);
    });
}

main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
