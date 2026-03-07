'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { ChatMessage as ChatMessageType, StreamEvent, AgentPhase, ChartData, SourceAttribution, DocumentRecord } from '@/lib/types';
import ChatMessage from '@/components/ChatMessage';
import DataChart from '@/components/DataChart';
import SourcePanel from '@/components/SourcePanel';
import DocumentCards from '@/components/DocumentCards';
import UserMenu from '@/components/UserMenu';
import ThemeToggle from '@/components/ThemeToggle';
import ConversationSidebar from '@/components/ConversationSidebar';

import { IoSend } from 'react-icons/io5';
import { TbBrain, TbRadar2, TbChartDots3, TbFileAnalytics } from 'react-icons/tb';
import RotatingText from '@/components/reactbits/RotatingText';
import Magnet from '@/components/reactbits/Magnet';
import DecryptedText from '@/components/reactbits/DecryptedText';
import FadeIn from '@/components/reactbits/FadeIn';
import BlurText from '@/components/reactbits/BlurText';


function splitIntoWordChunks(text: string, maxSize = 50): string[] {
    if (text.length <= 100) return [text];
    const chunks: string[] = [];
    let rest = text;
    while (rest.length > 0) {
        if (rest.length <= maxSize) { chunks.push(rest); break; }
        let at = rest.lastIndexOf(' ', maxSize);
        if (at <= 0) at = maxSize;
        chunks.push(rest.slice(0, at + 1));
        rest = rest.slice(at + 1);
    }
    return chunks;
}

const SUGGESTIONS = [
    '¿Quienes son los 10 diputados con mayor patrimonio declarado?',
    '¿Como viene la inflacion en los ultimos meses?',
    'Mostrame la evolucion de las reservas del BCRA',
    '¿Que datasets de educacion hay en datos.gob.ar?',
];

interface LoadedConversation {
    id: string;
    title: string;
}

function useIsDesktop() {
    const [isDesktop, setIsDesktop] = useState(true);
    useEffect(() => {
        const mq = window.matchMedia('(min-width: 769px)');
        setIsDesktop(mq.matches);
        const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
        mq.addEventListener('change', handler);
        return () => mq.removeEventListener('change', handler);
    }, []);
    return isDesktop;
}

export default function ChatPage() {
    const { data: session } = useSession();
    const [messages, setMessages] = useState<ChatMessageType[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [currentPhase, setCurrentPhase] = useState<AgentPhase | null>(null);
    const currentPhaseRef = useRef<AgentPhase | null>(null);
    const [thinking, setThinking] = useState<string>('');
    const [completedPhases, setCompletedPhases] = useState<AgentPhase[]>([]);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const sessionIdRef = useRef(session?.user?.email || `session_${crypto.randomUUID()}`);
    const chunkQueueRef = useRef<string[]>([]);
    const revealedRef = useRef('');
    const rafRef = useRef<number | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);
    const isDesktop = useIsDesktop();

    // Sidebar state: open by default on desktop, closed on mobile
    const [sidebarOpen, setSidebarOpen] = useState(false); // mobile overlay
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false); // desktop collapse

    const [policyMode, setPolicyMode] = useState(false);
    const [sidebarRefresh, setSidebarRefresh] = useState(0);
    const activeConversationIdRef = useRef<string | null>(null);

    // Update sessionId when session becomes available
    useEffect(() => {
        if (session?.user?.email) {
            sessionIdRef.current = session.user.email;
        }
    }, [session?.user?.email]);

    // Prefill input from ?prompt= query param on mount
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const prompt = params.get('prompt');
        if (prompt) {
            setInput(prompt);
            requestAnimationFrame(() => {
                if (inputRef.current) {
                    inputRef.current.focus();
                    inputRef.current.setSelectionRange(prompt.length, prompt.length);
                }
            });
        }
    }, []);
    const [loadedConversation, setLoadedConversation] = useState<LoadedConversation | null>(null);

    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, []);

    const CHARS_PER_FRAME = 28;

    const startReveal = useCallback(() => {
        if (rafRef.current !== null) return;
        const tick = () => {
            const q = chunkQueueRef.current;
            if (q.length === 0) { rafRef.current = null; return; }
            let out = '';
            let budget = CHARS_PER_FRAME;
            while (budget > 0 && q.length > 0) {
                if (q[0].length <= budget) {
                    budget -= q[0].length;
                    out += q.shift()!;
                } else {
                    out += q[0].slice(0, budget);
                    q[0] = q[0].slice(budget);
                    budget = 0;
                }
            }
            revealedRef.current += out;
            const content = revealedRef.current;
            setMessages(prev => {
                const has = prev.find(m => m.id === 'streaming');
                if (has) return prev.map(m => m.id === 'streaming' ? { ...m, content } : m);
                return [...prev, { id: 'streaming', role: 'assistant' as const, content, timestamp: new Date().toISOString() }];
            });
            rafRef.current = q.length > 0 ? requestAnimationFrame(tick) : null;
        };
        rafRef.current = requestAnimationFrame(tick);
    }, []);

    useEffect(() => {
        return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [messages, thinking, scrollToBottom]);

    const handleSend = async (text?: string) => {
        const messageText = text || input.trim();
        if (!messageText || isLoading) return;

        setInput('');
        // Reset typewriter state
        chunkQueueRef.current = [];
        revealedRef.current = '';
        if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
        // Reset textarea height
        if (inputRef.current) inputRef.current.style.height = 'auto';
        // Abort any previous in-flight request
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        const abortController = new AbortController();
        abortControllerRef.current = abortController;

        setIsLoading(true);
        setCurrentPhase(null);
        currentPhaseRef.current = null;
        setCompletedPhases([]);
        setThinking('');

        // Add user message
        const userMsg: ChatMessageType = {
            id: `user_${Date.now()}`,
            role: 'user',
            content: messageText,
            timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, userMsg]);

        // Prepare assistant message accumulator
        let assistantContent = '';
        const charts: ChartData[] = [];
        let sources: SourceAttribution[] = [];
        let documents: DocumentRecord[] = [];
        let savedConvId: string | null = null;
        let savedAssistantMsgId: string | null = null;

        try {
            // Build history from existing messages for context
            const history = messages.map(m => ({
                role: m.role,
                content: m.content,
            }));

            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: messageText,
                    sessionId: sessionIdRef.current,
                    policyMode,
                    conversationId: activeConversationIdRef.current || undefined,
                    history,
                }),
                signal: abortController.signal,
            });

            if (!response.ok) throw new Error('Error en la respuesta del servidor');
            if (!response.body) throw new Error('Sin Stream de respuesta');

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (!line.startsWith('data: ')) continue;
                    try {
                        const event: StreamEvent = JSON.parse(line.slice(6));

                        switch (event.type) {
                            case 'phase_change': {
                                const newPhase = event.data as AgentPhase;
                                const prevPhase = currentPhaseRef.current;
                                if (prevPhase) {
                                    setCompletedPhases((prev) => {
                                        if (prev.includes(prevPhase)) return prev;
                                        return [...prev, prevPhase];
                                    });
                                }
                                setCurrentPhase(newPhase);
                                currentPhaseRef.current = newPhase;
                                setThinking('');
                                break;
                            }
                            case 'thinking':
                                setThinking(event.data as string);
                                break;
                            case 'content': {
                                const chunk = event.data as string;
                                assistantContent += chunk;
                                const pieces = splitIntoWordChunks(chunk);
                                chunkQueueRef.current.push(...pieces);
                                startReveal();
                                break;
                            }
                            case 'chart':
                                charts.push(event.data as ChartData);
                                break;
                            case 'sources':
                                sources = event.data as SourceAttribution[];
                                break;
                            case 'documents':
                                documents = event.data as DocumentRecord[];
                                break;
                            case 'error':
                                assistantContent += `\n\n**${event.data}**`;
                                break;
                            case 'conversation_saved': {
                                const saved = event.data as { id: string; title: string };
                                const isNewConversation = !activeConversationIdRef.current;
                                setLoadedConversation({ id: saved.id, title: saved.title });
                                activeConversationIdRef.current = saved.id;
                                savedConvId = saved.id;
                                // Only refresh sidebar when a new conversation is created
                                if (isNewConversation) {
                                    setSidebarRefresh((n) => n + 1);
                                }
                                break;
                            }
                            case 'assistant_message_saved': {
                                const msgData = event.data as { assistantMessageId: string };
                                if (msgData.assistantMessageId) {
                                    savedAssistantMsgId = msgData.assistantMessageId;
                                }
                                break;
                            }
                            case 'done': {
                                const finalPhase = currentPhaseRef.current;
                                if (finalPhase) {
                                    setCompletedPhases((prev) => {
                                        if (prev.includes(finalPhase)) return prev;
                                        return [...prev, finalPhase];
                                    });
                                }
                                setCurrentPhase(null);
                                break;
                            }
                        }
                    } catch {
                        // Skip malformed SSE
                    }
                }
            }
        } catch (err) {
            // If the request was aborted (user navigated away), don't show error
            if (err instanceof DOMException && err.name === 'AbortError') {
                return; // Exit silently — server continues saving in background
            }
            assistantContent = '**No se pudo conectar con el servidor.** El sistema puede estar temporalmente fuera de servicio. Intentá de nuevo en unos minutos.';
        } finally {
            if (abortControllerRef.current === abortController) {
                abortControllerRef.current = null;
            }
        }

        // Wait for typewriter to finish revealing all queued chunks
        await new Promise<void>(resolve => {
            const check = () => {
                if (chunkQueueRef.current.length === 0) {
                    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
                    resolve();
                } else {
                    requestAnimationFrame(check);
                }
            };
            check();
        });

        // Finalize assistant message
        setMessages((prev) => {
            const filtered = prev.filter((m) => m.id !== 'streaming');
            return [
                ...filtered,
                {
                    id: `assistant_${Date.now()}`,
                    role: 'assistant',
                    content: assistantContent,
                    timestamp: new Date().toISOString(),
                    chartData: charts.length > 0 ? charts : undefined,
                    sources: sources.length > 0 ? sources : undefined,
                    documents: documents.length > 0 ? documents : undefined,
                    backendMessageId: savedAssistantMsgId,
                    conversationId: savedConvId,
                },
            ];
        });

        setIsLoading(false);
        setCurrentPhase(null);
        setThinking('');
        inputRef.current?.focus();
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        // Desktop: Enter sends, Shift+Enter new line
        // Mobile: Enter = new line, only send via button
        if (e.key === 'Enter' && !e.shiftKey && isDesktop) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleSelectConversation = (detail: {
        id: string;
        title: string;
        messages: {
            id: string;
            role: string;
            content: string;
            sources: Record<string, unknown>[];
            chart_data?: Record<string, unknown>[] | null;
            documents?: Record<string, unknown>[] | null;
            created_at: string;
            feedback?: string | null;
            feedback_comment?: string | null;
        }[];
    }) => {
        // Load the conversation messages into the chat view
        const loadedMessages: ChatMessageType[] = detail.messages.map((m) => ({
            id: `loaded_${m.id}`,
            role: m.role as 'user' | 'assistant',
            content: m.content,
            timestamp: m.created_at,
            sources: m.role === 'assistant' && m.sources?.length > 0
                ? m.sources.map((s) => ({
                      name: (s as Record<string, string>).title || (s as Record<string, string>).name || 'Fuente',
                      url: (s as Record<string, string>).url || 'https://datos.gob.ar',
                      portal: (s as Record<string, string>).portal || '',
                      accessedAt: new Date().toISOString(),
                  }))
                : undefined,
            chartData: m.chart_data?.length ? m.chart_data as unknown as ChartData[] : undefined,
            documents: m.documents?.length ? m.documents as unknown as DocumentRecord[] : undefined,
            backendMessageId: m.id,
            conversationId: detail.id,
            feedback: (m.feedback as 'up' | 'down') || null,
            feedbackComment: m.feedback_comment || null,
        }));

        // Abort any in-flight request (server continues saving in background)
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }

        setMessages(loadedMessages);
        setLoadedConversation({ id: detail.id, title: detail.title });
        activeConversationIdRef.current = detail.id;
        setIsLoading(false);
        setCurrentPhase(null);
        setCompletedPhases([]);
        setThinking('');
        // Reset typewriter state
        chunkQueueRef.current = [];
        revealedRef.current = '';
        if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
        // On mobile, close the overlay
        setSidebarOpen(false);
    };

    const handleNewConversation = () => {
        // Abort any in-flight request (server continues saving in background)
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
        setMessages([]);
        setLoadedConversation(null);
        activeConversationIdRef.current = null;
        setInput('');
        setIsLoading(false);
        setCurrentPhase(null);
        setThinking('');
        setCompletedPhases([]);
        chunkQueueRef.current = [];
        revealedRef.current = '';
        if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
        setSidebarOpen(false);
        // Clear query params from URL (e.g. ?prompt=...)
        if (window.location.search) {
            window.history.replaceState({}, '', window.location.pathname);
        }
        inputRef.current?.focus();
    };

    const handleDeleteConversation = (id: string) => {
        if (loadedConversation?.id === id) {
            handleNewConversation();
        }
    };

    const handleFeedback = async (messageId: string, feedback: 'up' | 'down', comment?: string) => {
        const msg = messages.find((m) => m.id === messageId);
        if (!msg?.backendMessageId || !msg?.conversationId) return;

        try {
            const res = await fetch(`/api/feedback`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    conversationId: msg.conversationId,
                    messageId: msg.backendMessageId,
                    feedback,
                    comment,
                }),
            });
            if (res.ok) {
                setMessages((prev) =>
                    prev.map((m) =>
                        m.id === messageId
                            ? { ...m, feedback, feedbackComment: comment || null }
                            : m
                    )
                );
            }
        } catch {
            // Non-critical
        }
    };

    const hasMessages = messages.length > 0;

    return (
        <div className="chat-layout">
            {/* Body: sidebar + main content */}
            <div className="chat-body">
                {/* Sidebar */}
                <ConversationSidebar
                    isOpen={sidebarOpen}
                    isCollapsed={isDesktop ? sidebarCollapsed : true}
                    onClose={() => setSidebarOpen(false)}
                    onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
                    onSelectConversation={handleSelectConversation}
                    onNewConversation={handleNewConversation}
                    onDeleteConversation={handleDeleteConversation}
                    userId={session?.user?.email || undefined}
                    refreshKey={sidebarRefresh}
                />

                {/* Main chat area */}
                <div className="chat-main">
                    {/* Header */}
                    <header className="chat-header">
                        <div className="chat-header-title">
                            {/* Mobile hamburger */}
                            {!isDesktop && (
                                <button
                                    className="sidebar-mobile-toggle"
                                    onClick={() => setSidebarOpen(!sidebarOpen)}
                                    title="Historial de conversaciones"
                                >
                                    &#9776;
                                </button>
                            )}
                            {/* Show logo in header only when sidebar is collapsed/hidden */}
                            {(isDesktop ? sidebarCollapsed : true) && (
                                <Link href="/">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <Magnet padding={60} magnetStrength={4}>
                                        <img src="/flag-icon.svg" alt="OpenArg" className="chat-header-logo" />
                                    </Magnet>
                                    <span>OpenArg</span>
                                </Link>
                            )}
                            <nav className="chat-header-right">
                                <Link href="/chat" className="chat-header-nav-link chat-header-nav-link--active">
                                    Chat
                                </Link>
                                <Link href="/datasets" className="chat-header-nav-link">
                                    Datasets
                                </Link>
                            </nav>
                        </div>
                        <div className="chat-header-right">
                            <ThemeToggle />
                            <UserMenu />
                        </div>
                    </header>

                    {/* Messages */}
                    <div className="chat-messages">
                        {!hasMessages && (
                            <div className="welcome-container">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <Magnet padding={80} magnetStrength={3}>
                                    <img src="/flag-icon.svg" alt="OpenArg" className="welcome-icon" />
                                </Magnet>
                                <h2 className="welcome-title">
                                    <DecryptedText
                                        text="¿Que queres saber sobre Argentina?"
                                        animateOn="view"
                                        speed={30}
                                        sequential
                                        revealDirection="center"
                                        className="welcome-decrypted-char"
                                        encryptedClassName="welcome-decrypted-char encrypted"
                                    />
                                </h2>
                                <RotatingText
                                    texts={[
                                        "Presupuesto nacional en tiempo real",
                                        "Declaraciones juradas patrimoniales",
                                        "Indicadores economicos del BCRA",
                                        "Datos de educacion y salud",
                                        "Compras y contrataciones publicas"
                                    ]}
                                    rotationInterval={3000}
                                    staggerDuration={0.03}
                                    splitBy="characters"
                                    mainClassName="welcome-rotating"
                                    elementLevelClassName="welcome-rotating-char"
                                />
                                <BlurText
                                    text="Los agentes de IA buscan y analizan informacion de 30 portales por vos."
                                    className="welcome-subtitle"
                                    delay={80}
                                    animateBy="words"
                                    direction="bottom"
                                    stepDuration={0.3}
                                />
                                <div className="welcome-suggestions">
                                    {SUGGESTIONS.map((s, i) => (
                                        <FadeIn key={i} delay={0.6 + i * 0.1} direction="up" distance={15}>
                                            <button
                                                className="suggestion-chip glass-light"
                                                onClick={() => handleSend(s)}
                                            >
                                                {s}
                                            </button>
                                        </FadeIn>
                                    ))}
                                </div>
                            </div>
                        )}

                        {messages.map((msg) => (
                            <div key={msg.id}>
                                <ChatMessage message={msg} onFeedback={handleFeedback} />
                                {msg.role === 'assistant' && msg.documents && msg.documents.length > 0 && (
                                    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '0 1.5rem 1rem' }}>
                                        <DocumentCards documents={msg.documents} />
                                    </div>
                                )}
                                {msg.role === 'assistant' && msg.chartData && msg.chartData.length > 0 && (
                                    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '0 1.5rem 1rem' }}>
                                        {msg.chartData.map((chart, i) => (
                                            <DataChart key={i} chart={chart} />
                                        ))}
                                    </div>
                                )}
                                {msg.role === 'assistant' && msg.sources && msg.sources.length > 0 && (
                                    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '0 1.5rem 1rem' }}>
                                        <SourcePanel sources={msg.sources} />
                                    </div>
                                )}
                            </div>
                        ))}


                        <div ref={messagesEndRef} />
                    </div>

                    {/* Multi-agent thinking indicator */}
                    {isLoading && (
                        <div className="thinking-bar">
                            <div className="thinking-bar-inner">
                                <div className="agent-pipeline">
                                    {([
                                        { key: 'planning' as AgentPhase, icon: <TbBrain size={18} />, label: 'Planner' },
                                        { key: 'data_collection' as AgentPhase, icon: <TbRadar2 size={18} />, label: 'Collector' },
                                        { key: 'analysis' as AgentPhase, icon: <TbChartDots3 size={18} />, label: 'Analyst' },
                                        { key: 'synthesis' as AgentPhase, icon: <TbFileAnalytics size={18} />, label: 'Synthesizer' },
                                    ]).map((agent, i, arr) => {
                                        const isActive = currentPhase === agent.key;
                                        const isCompleted = completedPhases.includes(agent.key);
                                        const stateClass = isActive ? 'active' : isCompleted ? 'completed' : 'pending';
                                        return (
                                            <span key={agent.key} className="agent-node-group">
                                                {i > 0 && (
                                                    <span className={`agent-connector ${
                                                        completedPhases.includes(arr[i - 1].key) ? 'completed' : ''
                                                    }`}>
                                                        <span className="agent-connector-line" />
                                                        {completedPhases.includes(arr[i - 1].key) && (
                                                            <span className="agent-connector-pulse" />
                                                        )}
                                                    </span>
                                                )}
                                                <span className={`agent-node ${stateClass}`}>
                                                    <span className="agent-node-icon">{agent.icon}</span>
                                                    <span className="agent-node-label">{agent.label}</span>
                                                    {isActive && <span className="agent-node-pulse" />}
                                                </span>
                                            </span>
                                        );
                                    })}
                                </div>
                                {thinking && (
                                    <span className="thinking-text">{thinking}</span>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Input */}
                    <div className="chat-input-area">
                        <div className="chat-input-controls">
                            <button
                                className={`policy-toggle ${policyMode ? 'active' : ''}`}
                                onClick={() => setPolicyMode(!policyMode)}
                                disabled={isLoading}
                                title={policyMode ? 'Desactivar análisis de política pública' : 'Activar análisis de política pública'}
                            >
                                <span className="policy-toggle-icon">🏛️</span>
                                <span className="policy-toggle-label">Deep Policy Analysis</span>
                                {policyMode && <span className="policy-toggle-badge">ON</span>}
                            </button>
                        </div>
                        <div className="chat-input-row">
                            <div className="chat-input-container">
                                <textarea
                                    ref={inputRef}
                                    className="chat-input"
                                    value={input}
                                    onChange={(e) => {
                                        setInput(e.target.value);
                                        // Auto-resize up to 7 lines
                                        const ta = e.target;
                                        ta.style.height = 'auto';
                                        const lineHeight = parseFloat(getComputedStyle(ta).lineHeight) || 22;
                                        const maxH = lineHeight * 7;
                                        ta.style.height = `${Math.min(ta.scrollHeight, maxH)}px`;
                                        // On mobile, scroll input area above keyboard
                                        if (!isDesktop) {
                                            requestAnimationFrame(() => {
                                                ta.closest('.chat-input-area')?.scrollIntoView({ block: 'end', behavior: 'smooth' });
                                                window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
                                            });
                                        }
                                    }}
                                    onKeyDown={handleKeyDown}
                                    placeholder={isDesktop ? "Preguntá lo que quieras..." : "Preguntá algo..."}
                                    rows={1}
                                    disabled={isLoading}
                                />
                                <button
                                    className="chat-send-btn"
                                    onClick={() => handleSend()}
                                    disabled={!input.trim() || isLoading}
                                >
                                    <IoSend size={14} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
