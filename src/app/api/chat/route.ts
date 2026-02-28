// ============================================================
// OpenArg — Chat API Route (Orchestrator)
// Proxies data queries to the Python backend.
// Handles casual messages locally with Gemini.
// ============================================================

import { NextRequest } from 'next/server';
import { getModel } from '@/lib/agents/gemini';
import { StreamEvent, ChatMessage } from '@/lib/agents/types';

const BACKEND_URL = process.env.OPENARG_BACKEND_URL || 'http://localhost:8081';

// In-memory session store.
// ⚠️ On Vercel serverless, sessions do NOT persist across cold starts or instances.
const MAX_SESSIONS = 100;
const SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes

interface Session {
    history: ChatMessage[];
    lastAccessed: number;
}

const sessions = new Map<string, Session>();

function cleanupSessions() {
    const now = Date.now();
    for (const [id, session] of sessions) {
        if (now - session.lastAccessed > SESSION_TTL_MS) {
            sessions.delete(id);
        }
    }
    if (sessions.size > MAX_SESSIONS) {
        const sorted = [...sessions.entries()].sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);
        const toRemove = sorted.slice(0, sessions.size - MAX_SESSIONS);
        for (const [id] of toRemove) {
            sessions.delete(id);
        }
    }
}

function getSession(sessionId: string): Session {
    cleanupSessions();
    if (!sessions.has(sessionId)) {
        sessions.set(sessionId, {
            history: [],
            lastAccessed: Date.now(),
        });
    }
    const session = sessions.get(sessionId)!;
    session.lastAccessed = Date.now();
    return session;
}

/**
 * Query the Python backend for data analysis.
 */
async function queryBackend(
    message: string,
    sessionId: string,
): Promise<{ answer: string; sources: { title: string; portal: string; score: number }[]; tokens_used?: number } | null> {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 30000);

        const response = await fetch(`${BACKEND_URL}/api/v1/query/quick`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ question: message, user_id: sessionId }),
            signal: controller.signal,
        });

        clearTimeout(timeout);

        if (!response.ok) return null;
        return await response.json();
    } catch {
        return null;
    }
}

/**
 * Detect if a message is casual/conversational (greeting, thanks, goodbye, etc.)
 */
function isCasualMessage(msg: string): boolean {
    const normalized = msg.trim().toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    if (normalized.length < 4) return true;

    const casualPatterns = [
        /^(hola|hey|hi|hello|buenas?|buen dia|buenos dias|buenas tardes|buenas noches|que tal|como estas|como andas|saludos)\b/,
        /^(gracias|muchas gracias|genial|perfecto|dale|ok|okey|excelente|barbaro|copado|joya|buenisimo)\b/,
        /^(chau|adios|hasta luego|nos vemos|bye)\b/,
        /^(que (sos|haces|podes hacer)|quien sos|como funciona(s)?|que es openarg|ayuda|help)\b/,
        /^(si|no|claro|obvio|entiendo|ya|listo)\s*[.!?]*$/,
    ];

    return casualPatterns.some((p) => p.test(normalized));
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { message, sessionId = 'default' } = body as {
            message: string;
            sessionId?: string;
        };

        if (!message || typeof message !== 'string') {
            return new Response(JSON.stringify({ error: 'El mensaje es obligatorio' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const session = getSession(sessionId);

        session.history.push({
            id: `user_${Date.now()}`,
            role: 'user',
            content: message,
            timestamp: new Date().toISOString(),
        });

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
                    // CASUAL MESSAGE — handle locally with Gemini
                    // =============================================
                    if (isCasualMessage(message)) {
                        send({ type: 'phase_change', data: 'analysis' });

                        const model = getModel(
                            `Tu nombre es OpenArg. Sos un sistema de inteligencia artificial entrenado por ColossusLab.tech, especializado en análisis de datos públicos de Argentina. Respondé de forma amigable, breve y en español rioplatense.

IDENTIDAD: Cuando te pregunten quién sos, de dónde venís, quién te creó, o cualquier pregunta sobre tu origen, respondé:
"Soy OpenArg, un sistema de inteligencia artificial entrenado por ColossusLab.tech, especializado en análisis de datos públicos de Argentina."

FUNCIONALIDADES — Cuando el usuario te saluda, presentate como "Soy OpenArg" (NUNCA "Soy Sos OpenArg") y explicale brevemente qué puede hacer con la plataforma:

🔍 **Explorar datos abiertos**: Buscar y analizar datasets de datos.gob.ar, CABA, Buenos Aires, Córdoba, Santa Fe, Mendoza y otros portales provinciales.

📊 **Analizar indicadores económicos**: Consultar series de tiempo de inflación, tipo de cambio, PBI, presupuesto nacional y más.

🗺️ **Datos geográficos**: Consultar información sobre provincias, departamentos y municipios de Argentina.

📋 **Declaraciones Juradas (DDJJ)**: Analizar el patrimonio declarado por los Diputados Nacionales.

📈 **Visualizaciones automáticas**: Genero gráficos interactivos para ayudarte a entender mejor los datos.

Terminá sugiriendo 2-3 consultas de ejemplo que el usuario puede probar.

Si el usuario agradece o se despide, respondé cordialmente.
No uses markdown excesivo, sé conciso y natural.`
                        );

                        const result = await model.generateContent(message);
                        const text = result.response.text();

                        send({ type: 'content', data: text });

                        session.history.push({
                            id: `assistant_${Date.now()}`,
                            role: 'assistant',
                            content: text,
                            timestamp: new Date().toISOString(),
                        });

                        send({ type: 'done', data: null });
                        return;
                    }

                    // =============================================
                    // DATA QUERY — delegate to Python backend
                    // =============================================
                    send({ type: 'phase_change', data: 'planning' });
                    send({ type: 'thinking', data: 'Buscando datasets relevantes...' });

                    const backendResult = await queryBackend(message, sessionId);

                    if (backendResult) {
                        send({ type: 'phase_change', data: 'data_collection' });
                        send({
                            type: 'thinking',
                            data: `Encontrados ${backendResult.sources?.length || 0} datasets relevantes`,
                        });

                        send({ type: 'phase_change', data: 'analysis' });
                        send({ type: 'thinking', data: 'Analizando datos...' });

                        send({ type: 'content', data: backendResult.answer });

                        if (backendResult.sources && backendResult.sources.length > 0) {
                            const formattedSources = backendResult.sources.map((s) => ({
                                name: s.title,
                                url: `https://datos.gob.ar`,
                                portal: s.portal,
                                accessedAt: new Date().toISOString(),
                            }));
                            send({ type: 'sources', data: formattedSources });
                        }

                        send({ type: 'phase_change', data: 'synthesis' });

                        session.history.push({
                            id: `assistant_${Date.now()}`,
                            role: 'assistant',
                            content: backendResult.answer,
                            timestamp: new Date().toISOString(),
                            sources: backendResult.sources?.map((s) => ({
                                name: s.title,
                                url: `https://datos.gob.ar`,
                                portal: s.portal,
                                accessedAt: new Date().toISOString(),
                            })),
                        });
                    } else {
                        send({
                            type: 'content',
                            data: 'Lo siento, el servicio de análisis no está disponible en este momento. Por favor intentá de nuevo en unos minutos.',
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
                error: err instanceof Error ? err.message : 'Error interno del servidor',
            }),
            {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
            }
        );
    }
}
