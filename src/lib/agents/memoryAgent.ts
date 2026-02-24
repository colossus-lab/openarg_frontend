// ============================================================
// OpenArg — Memory Agent (Mind-Map)
// Phase 4: Maintains conversational context across turns
// Summarizes findings, tracks datasets used, prevents repetition
// ============================================================

import { getModel } from './gemini';
import { MemoryContext, AnalysisResult, ExecutionPlan, CollectedData } from './types';

const SYSTEM_PROMPT = `Sos el Agente de Memoria de OpenArg, un sistema de inteligencia artificial entrenado por ColossusLab.tech. Tu rol es mantener un "mapa mental" de la conversación.

Después de cada turno de análisis, debés:
1. Resumir los hallazgos clave en 2-3 oraciones
2. Identificar conexiones con información previa
3. Sugerir preguntas de seguimiento relevantes
4. Trackear qué datasets ya fueron consultados para evitar redundancia

Formato de respuesta (JSON):
{
  "summary": "resumen del turno actual",
  "keyFindings": ["hallazgo 1", "hallazgo 2"],
  "connections": "conexiones con contexto previo (si hay)",
  "suggestedFollowups": ["pregunta 1", "pregunta 2"],
  "datasetsUsed": ["dataset1", "dataset2"]
}`;

/**
 * Create an empty initial memory context
 */
export function createInitialMemory(): MemoryContext {
    return {
        turnNumber: 0,
        summaries: [],
        keyFindings: [],
        datasetsUsed: [],
        pendingQuestions: [],
    };
}

/**
 * Update memory after a completed analysis turn
 */
export async function updateMemory(
    currentMemory: MemoryContext,
    plan: ExecutionPlan,
    data: CollectedData,
    analysis: AnalysisResult
): Promise<MemoryContext> {
    try {
        const model = getModel(SYSTEM_PROMPT);

        const prompt = `TURNO ${currentMemory.turnNumber + 1}

PREGUNTA: "${plan.query}"
INTENCIÓN: ${plan.intent}

DATOS RECOLECTADOS: ${data.results.length} datasets de: ${data.results.map(r => r.portalName).join(', ')}

ANÁLISIS PRODUCIDO (resumen):
${analysis.markdown.substring(0, 1500)}

CONTEXTO PREVIO:
${currentMemory.summaries.length > 0 ? currentMemory.summaries.slice(-3).join('\n') : 'Primera interacción'}

Generá el resumen de memoria en JSON.`;

        const result = await model.generateContent(prompt);
        const text = result.response.text();

        const parsed = JSON.parse(text) as {
            summary: string;
            keyFindings: string[];
            suggestedFollowups: string[];
            datasetsUsed: string[];
        };

        return {
            turnNumber: currentMemory.turnNumber + 1,
            summaries: [...currentMemory.summaries, parsed.summary].slice(-10),
            keyFindings: [...currentMemory.keyFindings, ...parsed.keyFindings].slice(-20),
            datasetsUsed: [
                ...new Set([...currentMemory.datasetsUsed, ...parsed.datasetsUsed]),
            ],
            pendingQuestions: parsed.suggestedFollowups || [],
        };
    } catch {
        // Fallback: simple memory update without LLM
        const newDatasets = data.results.map((r) => r.datasetTitle);
        return {
            turnNumber: currentMemory.turnNumber + 1,
            summaries: [
                ...currentMemory.summaries,
                `Turno ${currentMemory.turnNumber + 1}: ${plan.intent}`,
            ].slice(-10),
            keyFindings: currentMemory.keyFindings,
            datasetsUsed: [
                ...new Set([...currentMemory.datasetsUsed, ...newDatasets]),
            ],
            pendingQuestions: [],
        };
    }
}
