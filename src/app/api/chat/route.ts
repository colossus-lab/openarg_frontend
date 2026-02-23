// ============================================================
// OpenArg — Chat API Route (Orchestrator)
// Main endpoint: receives user messages, runs the 4-phase pipeline
// ============================================================

import { NextRequest } from 'next/server';
import { createPlan } from '@/lib/agents/planner';
import { collectData } from '@/lib/agents/dataAgent';
import { analyzeData } from '@/lib/agents/analysisAgent';
import { updateMemory, createInitialMemory } from '@/lib/agents/memoryAgent';
import { MemoryContext, StreamEvent, ChatMessage } from '@/lib/agents/types';

// In-memory session store (for Vercel serverless, consider Redis/KV for production)
const sessions = new Map<string, { memory: MemoryContext; history: ChatMessage[] }>();

function getSession(sessionId: string) {
    if (!sessions.has(sessionId)) {
        sessions.set(sessionId, {
            memory: createInitialMemory(),
            history: [],
        });
    }
    return sessions.get(sessionId)!;
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { message, sessionId = 'default' } = body as {
            message: string;
            sessionId?: string;
        };

        if (!message || typeof message !== 'string') {
            return new Response(JSON.stringify({ error: 'Message is required' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const session = getSession(sessionId);

        // Add user message to history
        const userMessage: ChatMessage = {
            id: `user_${Date.now()}`,
            role: 'user',
            content: message,
            timestamp: new Date().toISOString(),
        };
        session.history.push(userMessage);

        // Create a streaming response
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
            async start(controller) {
                const send = (event: StreamEvent) => {
                    controller.enqueue(
                        encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
                    );
                };

                try {
                    // =============================================
                    // PHASE 1: PLANNING
                    // =============================================
                    send({ type: 'phase_change', data: 'planning' });
                    send({ type: 'thinking', data: 'Analizando tu consulta y diseñando plan de ejecución...' });

                    const plan = await createPlan(message, session.memory);
                    send({
                        type: 'thinking',
                        data: `Plan: ${plan.intent} (${plan.steps.length} pasos)`,
                    });

                    // =============================================
                    // PHASE 2: DATA COLLECTION
                    // =============================================
                    send({ type: 'phase_change', data: 'data_collection' });
                    send({
                        type: 'thinking',
                        data: `Recolectando datos de ${plan.steps.filter(s => ['search_ckan', 'query_series', 'query_georef'].includes(s.action)).length} fuentes...`,
                    });

                    const collectedData = await collectData(plan);
                    send({
                        type: 'thinking',
                        data: `Obtenidos ${collectedData.results.length} datasets${collectedData.errors.length > 0 ? ` (${collectedData.errors.length} errores)` : ''}`,
                    });

                    // =============================================
                    // PHASE 3: ANALYSIS
                    // =============================================
                    send({ type: 'phase_change', data: 'analysis' });
                    send({ type: 'thinking', data: 'Analizando datos con Gemini 2.5...' });

                    const analysis = await analyzeData(plan, collectedData, session.memory);

                    // Stream the markdown content
                    send({ type: 'content', data: analysis.markdown });

                    // Stream chart data if present
                    if (analysis.chartData && analysis.chartData.length > 0) {
                        for (const chart of analysis.chartData) {
                            send({ type: 'chart', data: chart });
                        }
                    }

                    // Stream sources
                    if (analysis.sources.length > 0) {
                        send({ type: 'sources', data: analysis.sources });
                    }

                    // =============================================
                    // PHASE 4: MEMORY UPDATE
                    // =============================================
                    send({ type: 'phase_change', data: 'synthesis' });

                    session.memory = await updateMemory(
                        session.memory,
                        plan,
                        collectedData,
                        analysis
                    );

                    // Save assistant message to history
                    const assistantMessage: ChatMessage = {
                        id: `assistant_${Date.now()}`,
                        role: 'assistant',
                        content: analysis.markdown,
                        timestamp: new Date().toISOString(),
                        chartData: analysis.chartData,
                        sources: analysis.sources,
                    };
                    session.history.push(assistantMessage);

                    // Send follow-up suggestions
                    if (session.memory.pendingQuestions.length > 0) {
                        send({
                            type: 'content',
                            data: `\n\n---\n💡 **Preguntas sugeridas:**\n${session.memory.pendingQuestions.map((q) => `- ${q}`).join('\n')}`,
                        });
                    }

                    send({ type: 'done', data: null });
                } catch (err) {
                    send({
                        type: 'error',
                        data: err instanceof Error ? err.message : 'Error interno del sistema',
                    });
                } finally {
                    controller.close();
                }
            },
        });

        return new Response(stream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                Connection: 'keep-alive',
            },
        });
    } catch (err) {
        return new Response(
            JSON.stringify({
                error: err instanceof Error ? err.message : 'Internal server error',
            }),
            {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
            }
        );
    }
}
