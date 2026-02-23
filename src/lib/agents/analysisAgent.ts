// ============================================================
// OpenArg — Analysis Agent
// Phase 3: Gemini 2.5 analyses collected data with Explicit Thinking
// Produces insights, markdown, and chart suggestions
// ============================================================

import { getModel } from './gemini';
import { CollectedData, AnalysisResult, ExecutionPlan, MemoryContext, ChartData, SourceAttribution } from './types';

const SYSTEM_PROMPT = `Sos el Agente de Análisis de OpenArg, la plataforma argentina de inteligencia sobre datos abiertos.

Tu rol: Recibís datos recolectados de portales gubernamentales argentinos y generás análisis profundos, insights accionables y visualizaciones.

INSTRUCCIONES:
1. **Pensamiento Explícito**: Antes de responder, analizá internamente los datos. Buscá patrones, anomalías, tendencias y correlaciones.
2. **Formato de Respuesta**: Respondé en markdown rico con:
   - Título claro del análisis
   - Resumen ejecutivo (2-3 oraciones)
   - Hallazgos principales con datos específicos
   - Contexto: ¿Qué significan estos datos para Argentina?
   - Si es posible, comparaciones o tendencias
3. **Visualizaciones**: Cuando los datos lo ameriten, indicá qué tipo de gráfico sería útil usando el formato:
   <!--CHART:{"type":"line_chart","title":"...","xKey":"...","yKeys":["..."],"data":[...]}-->
4. **Fuentes**: Siempre citá las fuentes de datos al final
5. **Tono**: Profesional pero accesible. Explicá términos técnicos.
6. **Idioma**: Siempre en español argentino

IMPORTANTE:
- NO inventes datos. Si los datos son insuficientes, decilo claramente
- Si hay errores en la recolección, mencioná qué fuentes fallaron
- Sugerí preguntas de seguimiento cuando sea relevante
- Usá emojis con moderación para mejorar la lectura (📊 📈 🏛️ 🇦🇷)`;

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

Analizá los datos y generá un informe completo. Incluí visualizaciones si los datos lo permiten usando el formato <!--CHART:{}-->.`;

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
            const recordsPreview = result.records.slice(0, 20);

            // Check if these are metadata-only records (from CKAN without Datastore)
            const isMetadataOnly = recordsPreview.length > 0 &&
                typeof recordsPreview[0] === 'object' &&
                recordsPreview[0] !== null &&
                '_type' in recordsPreview[0] &&
                recordsPreview[0]._type === 'resource_metadata';

            const recordsText = JSON.stringify(recordsPreview, null, 2);

            if (isMetadataOnly) {
                return `--- Dataset ${i + 1}: ${result.datasetTitle} ---
Fuente: ${result.portalName} (${result.source})
URL: ${result.portalUrl}
NOTA: Este dataset no tiene Datastore habilitado. Solo se pudieron obtener metadatos de los recursos disponibles (archivos para descargar).
${result.metadata.description ? `Descripción: ${result.metadata.description}` : ''}
Recursos disponibles para descarga:
${recordsText}

Explicale al usuario qué datos contiene este dataset y proporcioná el link para que pueda acceder directamente.`;
            }

            return `--- Dataset ${i + 1}: ${result.datasetTitle} ---
Fuente: ${result.portalName} (${result.source})
URL: ${result.portalUrl}
Formato: ${result.format}
Total de registros: ${result.metadata.totalRecords}
${result.metadata.description ? `Descripción: ${result.metadata.description}` : ''}
Datos (primeros ${recordsPreview.length} registros):
${recordsText}`;
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
