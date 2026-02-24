// ============================================================
// OpenArg — Analysis Agent
// Phase 3: Gemini 2.5 analyses collected data with Explicit Thinking
// Produces insights, markdown, and chart suggestions
// ============================================================

import { getModel } from './gemini';
import { CollectedData, AnalysisResult, ExecutionPlan, MemoryContext, ChartData, SourceAttribution } from './types';

const SYSTEM_PROMPT = `Sos el Agente de Análisis de OpenArg, la plataforma argentina de inteligencia sobre datos abiertos.

Tu rol: Recibís datos de portales gubernamentales y respondés de forma CONCISA y CONVERSACIONAL, guiando al usuario hacia el análisis que necesita.

ESTILO DE RESPUESTA:
- **Sé breve**: Máximo 4-5 oraciones como respuesta principal. No hagas un informe largo.
- **Dato clave primero**: Arrancá con EL dato más importante o llamativo (número, tendencia, cambio).
- **Contexto mínimo**: Una oración de contexto sobre qué significan esos datos.
- **Guía al usuario**: Terminá con 2-3 preguntas de seguimiento concretas que profundicen el análisis.
- Las preguntas de seguimiento deben ser específicas y basadas en los datos disponibles.

FORMATO:
📊 **[Dato principal con número concreto]**  

[1-2 oraciones de contexto/interpretación]

[Si hay datos tabulares relevantes, un mini-resumen de los últimos 3-5 valores más relevantes como lista]

💡 **¿Querés profundizar?**
- [Pregunta específica 1]
- [Pregunta específica 2]  
- [Pregunta específica 3]

GRÁFICOS (MUY IMPORTANTE):
- Cuando recibas datos tabulares con columnas temporales (años, fechas, meses), SIEMPRE generá un gráfico de línea temporal usando <!--CHART:{}-->.
- El formato del chart es: <!--CHART:{"type":"line_chart","title":"Título","data":[{"xKey":val,"yKey":val},...],"xKey":"nombreColumnaX","yKeys":["nombreColumnaY"]}-->
- Para datos categóricos usá bar_chart.
- El campo "data" del chart debe contener los datos reales en formato array de objetos.
- Usá TODOS los datos disponibles para el gráfico, no solo un resumen.
- Si hay columna de año/fecha, usala como xKey.

REGLAS:
- NO hagas informes largos con múltiples secciones y headers
- NO repitas toda la tabla de datos — mostrá solo lo más relevante
- NO uses H1 (#) — solo texto plano, negritas y listas
- Si los datos son insuficientes, decilo en una oración y sugerí qué buscar
- Idioma: español argentino, tono conversacional
- Emojis con moderación: 📊 📈 💡 🇦🇷`;

/**
 * Analyze collected data and produce insights
 */
export async function analyzeData(
    plan: ExecutionPlan,
    collectedData: CollectedData,
    memory: MemoryContext
): Promise<AnalysisResult> {
    const model = getModel(SYSTEM_PROMPT);

    // Build the data context for Gemini
    const dataContext = buildDataContext(collectedData);
    const memoryContext = memory.summaries.length > 0
        ? `\n\nCONTEXTO PREVIO DE LA CONVERSACIÓN:\n${memory.summaries.slice(-3).join('\n')}`
        : '';

    const prompt = `PREGUNTA DEL USUARIO: "${plan.query}"
INTENCIÓN: ${plan.intent}

DATOS RECOLECTADOS:
${dataContext}

${collectedData.errors.length > 0 ? `\nERRORES EN LA RECOLECCIÓN:\n${collectedData.errors.map(e => `- ${e.step}: ${e.error}`).join('\n')}` : ''}
${memoryContext}

Respondé de forma breve y conversacional. Destacá el dato más importante, dá contexto mínimo, y sugerí preguntas de seguimiento para profundizar. Si los datos permiten un gráfico claro, incluilo con <!--CHART:{}-->.`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    // Extract chart data from special comments
    const chartData = extractChartData(responseText);

    // Clean the markdown (remove chart comments for display)
    const cleanMarkdown = responseText.replace(/<!--CHART:.*?-->/g, '').trim();

    // Build source attributions
    const sources = buildSourceAttributions(collectedData);

    return {
        markdown: cleanMarkdown,
        thinking: `Plan: ${plan.intent} | Steps: ${plan.steps.length} | Data sources: ${collectedData.results.length} | Errors: ${collectedData.errors.length}`,
        chartData: chartData.length > 0 ? chartData : undefined,
        sources,
    };
}

/**
 * Build a text representation of collected data for the LLM
 */
function buildDataContext(data: CollectedData): string {
    if (data.results.length === 0) {
        return 'No se pudieron obtener datos de las fuentes consultadas. Si hubo errores de conexión, se detallan abajo. Aun así, intentá proporcionar contexto general sobre el tema consultado basándote en tu conocimiento.';
    }

    return data.results
        .map((result, i) => {
            // Check if these are metadata-only records (from CKAN without Datastore)
            const isMetadataOnly = result.records.length > 0 &&
                typeof result.records[0] === 'object' &&
                result.records[0] !== null &&
                '_type' in result.records[0] &&
                result.records[0]._type === 'resource_metadata';

            if (isMetadataOnly) {
                const recordsPreview = result.records.slice(0, 20);
                const recordsText = JSON.stringify(recordsPreview, null, 2);
                return `--- Dataset ${i + 1}: ${result.datasetTitle} ---
Fuente: ${result.portalName} (${result.source})
URL: ${result.portalUrl}
NOTA: Este dataset no tiene Datastore habilitado ni CSV descargable. Solo se pudieron obtener metadatos de los recursos disponibles.
${result.metadata.description ? `Descripción: ${result.metadata.description}` : ''}
Recursos disponibles para descarga:
${recordsText}

Explicale al usuario qué datos contiene este dataset y proporcioná el link para que pueda acceder directamente.`;
            }

            // Real data — send a smart preview
            const columns = Object.keys(result.records[0] || {});
            const totalRows = result.records.length;

            // For large datasets, send first + last rows for temporal context
            let recordsToSend: Record<string, unknown>[];
            if (totalRows > 50) {
                const first = result.records.slice(0, 25);
                const last = result.records.slice(-25);
                recordsToSend = [...first, ...last];
            } else {
                recordsToSend = result.records;
            }

            const recordsText = JSON.stringify(recordsToSend, null, 2);

            return `--- Dataset ${i + 1}: ${result.datasetTitle} ---
Fuente: ${result.portalName} (${result.source})
URL: ${result.portalUrl}
Formato: ${result.format}
Total de registros: ${result.metadata.totalRecords}
Columnas: ${columns.join(', ')}
${result.metadata.description ? `Descripción: ${result.metadata.description}` : ''}
Datos (${recordsToSend.length} registros${totalRows > 50 ? `, primeros 25 + últimos 25 de ${totalRows} totales` : ''}):
${recordsText}

IMPORTANTE: Si hay una columna temporal (año, fecha, mes), generá un gráfico de línea temporal con <!--CHART:{}--> usando TODOS los datos proporcionados.`;
        })
        .join('\n\n');
}

/**
 * Extract chart data from <!--CHART:{}-->  comments in the response
 */
function extractChartData(text: string): ChartData[] {
    const charts: ChartData[] = [];
    const regex = /<!--CHART:(.*?)-->/g;
    let match;

    while ((match = regex.exec(text)) !== null) {
        try {
            const chartDef = JSON.parse(match[1]) as ChartData;
            if (chartDef.type && chartDef.data && chartDef.xKey && chartDef.yKeys) {
                charts.push(chartDef);
            }
        } catch {
            // Skip malformed chart definitions
        }
    }

    return charts;
}

/**
 * Build source attributions from collected data
 */
function buildSourceAttributions(data: CollectedData): SourceAttribution[] {
    return data.results.map((result) => ({
        name: result.datasetTitle,
        url: result.portalUrl,
        portal: result.portalName,
        accessedAt: result.metadata.fetchedAt,
    }));
}
