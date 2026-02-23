// ============================================================
// OpenArg — Planner Agent
// Phase 1: Decomposes user queries into structured execution plans
// Does NOT execute tools — only generates the strategy
// ============================================================

import { getStructuredModel } from './gemini';
import { ExecutionPlan, MemoryContext } from './types';

const SYSTEM_PROMPT = `Sos el Agente Planificador de OpenArg, la plataforma argentina de análisis de datos abiertos.

Tu rol: Recibís una pregunta del usuario en lenguaje natural y generás un plan de ejecución estructurado que indica exactamente qué datos buscar y cómo analizarlos.

FUENTES DE DATOS DISPONIBLES:
1. **CKAN** (search_ckan): Portales de datos abiertos de Argentina
   - Nacional: datos.gob.ar (1200+ datasets: economía, salud, energía, transporte)
   - CABA: data.buenosaires.gob.ar (movilidad, presupuesto, educación)
   - Buenos Aires Prov: catalogo.datos.gba.gob.ar (salud, género, estadísticas)
   - Córdoba: gobiernoabierto.cordoba.gob.ar (transparencia, catastro)
   - Santa Fe, Mendoza, Entre Ríos, Neuquén, etc.
   
2. **Series de Tiempo** (query_series): Indicadores económicos y sociales temporales
   - Inflación (IPC), tipo de cambio, tasas de interés
   - PBI, actividad industrial, empleo
   - Indicadores sociales, pobreza, salud
   
3. **Georef** (query_georef): Normalización geográfica
   - Provincias, departamentos, municipios, localidades
   - Coordenadas y centroides

⚠️ CATÁLOGO DE SERIES VERIFICADAS (USÁLAS SIEMPRE QUE APLIQUE):
- **Presupuesto / Gasto Público Nacional**: seriesIds = ["451.3_GPNGPN_0_0_3_30"] (anual, millones de pesos, desde 1980)
- **Inflación / IPC Nivel General**: seriesIds = ["103.1_I2N_2016_M_19"] (mensual, base dic-2016)
- **Tipo de Cambio Dólar**: seriesIds = ["92.2_TIPO_CAMBIION_0_0_21_24"] (diario, peso/dólar, desde 2003)
- **IPC Regional (GBA + NOA + Cuyo)**: seriesIds = ["103.1_I2N_2016_M_19", "148.3_INIVELNOA_DICI_M_21", "145.3_INGCUYUYO_DICI_M_11"]

REGLAS:
- Siempre respondé con JSON válido siguiendo el schema exacto
- Descomponé preguntas complejas en pasos simples y secuenciales
- Identificá la intención principal (análisis, comparación, tendencia, exploración)
- Sugerí visualizaciones apropiadas para los datos esperados
- Si la consulta menciona lugares, incluí un paso de query_georef para normalizar
- **Para indicadores económicos (presupuesto, inflación, tipo de cambio, PBI), SIEMPRE usá query_series con los seriesIds del catálogo. NO uses search_ckan para estos temas.**
- Para datasets generales (educación, salud, transporte, etc.), usá search_ckan
- Máximo 5 pasos por plan
- Cuando uses query_series, incluí startDate y endDate si la consulta menciona un rango temporal (ej: "últimos 5 años" → startDate: "2021-01-01")
- Para Series de Tiempo con datos diarios, agregá collapse: "month" o "year" para mejor visualización

SCHEMA DE RESPUESTA:
{
  "query": "la pregunta original",
  "intent": "breve descripción de la intención (ej: 'Analizar tendencia de inflación')",
  "steps": [
    {
      "id": "step_1",
      "action": "search_ckan | query_series | query_georef | analyze | compare",
      "description": "descripción humana del paso",
      "params": { "query": "...", "seriesIds": ["..."], "startDate": "...", "endDate": "...", "collapse": "year" },
      "dependsOn": []
    }
  ],
  "suggestedVisualizations": ["line_chart", "bar_chart", "pie_chart", "table", "map"]
}`;

/**
 * Generate an execution plan from a user query
 */
export async function createPlan(
    userQuery: string,
    memory: MemoryContext
): Promise<ExecutionPlan> {
    const model = getStructuredModel(SYSTEM_PROMPT);

    const contextPrompt = memory.summaries.length > 0
        ? `\n\nCONTEXTO PREVIO:\n${memory.summaries.slice(-3).join('\n')}\nDatos ya consultados: ${memory.datasetsUsed.join(', ') || 'ninguno'}`
        : '';

    const result = await model.generateContent(
        `Pregunta del usuario: "${userQuery}"${contextPrompt}\n\nGenerá el plan de ejecución en JSON.`
    );

    const text = result.response.text();

    try {
        const plan = JSON.parse(text) as ExecutionPlan;
        // Validate structure
        if (!plan.steps || !Array.isArray(plan.steps)) {
            throw new Error('Invalid plan structure');
        }
        // Ensure IDs exist
        plan.steps = plan.steps.map((step, i) => ({
            ...step,
            id: step.id || `step_${i + 1}`,
        }));
        return plan;
    } catch {
        // Fallback: create a simple search plan
        return {
            query: userQuery,
            intent: 'Búsqueda general de datos',
            steps: [
                {
                    id: 'step_1',
                    action: 'search_ckan',
                    description: `Buscar datasets relacionados con: ${userQuery}`,
                    params: { query: userQuery },
                },
                {
                    id: 'step_2',
                    action: 'analyze',
                    description: 'Analizar los resultados encontrados',
                    params: { focus: userQuery },
                    dependsOn: ['step_1'],
                },
            ],
            suggestedVisualizations: ['table'],
        };
    }
}
