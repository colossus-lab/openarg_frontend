'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useSession } from 'next-auth/react';
import { ChatMessage as ChatMessageType, StreamEvent, AgentPhase } from '@/lib/types';
import ChatMessage from '@/components/ChatMessage';
import SourcePanel from '@/components/SourcePanel';
import DocumentCards from '@/components/DocumentCards';

// Lazy load heavy chart components — they pull in Recharts / Observable Plot
const DataChart = dynamic(() => import('@/components/DataChart'), {
    ssr: false,
    loading: () => <div className="chart-loading-placeholder">Cargando grafico...</div>,
});
const ObservablePlotChart = dynamic(() => import('@/components/ObservablePlotChart'), {
    ssr: false,
    loading: () => <div className="chart-loading-placeholder">Cargando grafico...</div>,
});
import UserMenu from '@/components/UserMenu';
import ThemeToggle from '@/components/ThemeToggle';
import ConversationSidebar from '@/components/ConversationSidebar';

import { IoSend, IoShareSocialOutline, IoDownloadOutline } from 'react-icons/io5';
import { TbBrain, TbRadar2, TbChartDots3, TbFileAnalytics } from 'react-icons/tb';
import RotatingText from '@/components/reactbits/RotatingText';
import Magnet from '@/components/reactbits/Magnet';
import DecryptedText from '@/components/reactbits/DecryptedText';
import FadeIn from '@/components/reactbits/FadeIn';
import BlurText from '@/components/reactbits/BlurText';

import { useSSEStream } from '@/hooks/useSSEStream';
import { useConversationState, ConversationDetail } from '@/hooks/useConversationState';
import { useAutoResize } from '@/hooks/useAutoResize';

const SUGGESTIONS = [
    '¿Quienes son los 10 diputados con mayor patrimonio declarado?',
    '¿Como viene la inflacion en los ultimos meses?',
    'Mostrame la evolucion de las reservas del BCRA',
    '¿Que datasets de educacion hay en datos.gob.ar?',
];

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
    const isDesktop = useIsDesktop();

    // --- Custom hooks ---
    const {
        messages, setMessages,
        loadedConversation, setLoadedConversation,
        activeConversationIdRef,
        sessionIdRef,
        loadConversation,
        startNewConversation,
    } = useConversationState(session?.user?.email);

    const {
        sendMessage, abort,
        setIsStreaming,
    } = useSSEStream(setMessages);

    const { textareaRef: inputRef, adjustHeight, resetHeight } = useAutoResize();

    // --- Local UI state ---
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [currentPhase, setCurrentPhase] = useState<AgentPhase | null>(null);
    const currentPhaseRef = useRef<AgentPhase | null>(null);
    const [thinking, setThinking] = useState<string>('');
    const [completedPhases, setCompletedPhases] = useState<AgentPhase[]>([]);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Sidebar state: open by default on desktop, closed on mobile
    const [sidebarOpen, setSidebarOpen] = useState(false); // mobile overlay
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false); // desktop collapse

    const [policyMode, setPolicyMode] = useState(false);
    const [sidebarRefresh, setSidebarRefresh] = useState(0);

    // Prefill input from ?prompt= query param on mount
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const prompt = params.get('prompt');
        if (prompt) {
            setInput(prompt);
            requestAnimationFrame(() => {
                const ta = inputRef.current;
                if (ta) {
                    ta.focus();
                    ta.setSelectionRange(prompt.length, prompt.length);
                    adjustHeight();
                }
            });
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [messages, thinking, scrollToBottom]);

    // --- Event handler for SSE stream events (phase_change, thinking, etc.) ---
    const handleStreamEvent = useCallback((event: StreamEvent) => {
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
            case 'conversation_saved': {
                const saved = event.data as { id: string; title: string };
                const isNewConversation = !activeConversationIdRef.current;
                setLoadedConversation({ id: saved.id, title: saved.title });
                activeConversationIdRef.current = saved.id;
                // Only refresh sidebar when a new conversation is created
                if (isNewConversation) {
                    setSidebarRefresh((n) => n + 1);
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
    }, [activeConversationIdRef, setLoadedConversation]);

    const handleSend = async (text?: string) => {
        const messageText = text || input.trim();
        if (!messageText || isLoading) return;

        setInput('');
        resetHeight();

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

        // Build history from existing messages for context
        const history = messages.map(m => ({
            role: m.role,
            content: m.content,
        }));

        const result = await sendMessage(
            {
                message: messageText,
                sessionId: sessionIdRef.current,
                policyMode,
                conversationId: activeConversationIdRef.current || undefined,
                history,
            },
            handleStreamEvent,
        );

        // If aborted, reset UI state and exit
        if (result.aborted) {
            setIsLoading(false);
            setCurrentPhase(null);
            currentPhaseRef.current = null;
            setThinking('');
            return;
        }

        // Finalize assistant message
        setMessages((prev) => {
            const filtered = prev.filter((m) => m.id !== 'streaming');
            return [
                ...filtered,
                {
                    id: `assistant_${Date.now()}`,
                    role: 'assistant',
                    content: result.assistantContent,
                    timestamp: new Date().toISOString(),
                    chartData: result.charts.length > 0 ? result.charts : undefined,
                    sources: result.sources.length > 0 ? result.sources : undefined,
                    documents: result.documents.length > 0 ? result.documents : undefined,
                    backendMessageId: result.savedAssistantMsgId,
                    conversationId: result.savedConvId,
                },
            ];
        });

        setIsLoading(false);
        setCurrentPhase(null);
        setThinking('');
        // Focus after React re-renders with disabled=false
        requestAnimationFrame(() => inputRef.current?.focus());
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        // Desktop: Enter sends, Shift+Enter new line
        // Mobile: Enter = new line, only send via button
        if (e.key === 'Enter' && !e.shiftKey && isDesktop) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleSelectConversation = (detail: ConversationDetail) => {
        // Abort any in-flight request (server continues saving in background)
        abort();

        loadConversation(detail);
        setIsLoading(false);
        setIsStreaming(false);
        setCurrentPhase(null);
        setCompletedPhases([]);
        setThinking('');
        // On mobile, close the overlay
        setSidebarOpen(false);
    };

    const handleNewConversation = () => {
        // Abort any in-flight request (server continues saving in background)
        abort();

        startNewConversation();
        setInput('');
        setIsLoading(false);
        setIsStreaming(false);
        setCurrentPhase(null);
        setThinking('');
        setCompletedPhases([]);
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

    const handleShareConversation = async () => {
        // Build plain text from messages
        const text = messages
            .map((m) => `${m.role === 'user' ? 'Yo' : 'OpenArg'}: ${m.content}`)
            .join('\n\n');

        // Mobile: use native share
        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'Conversación OpenArg',
                    text,
                });
                return;
            } catch {
                // User cancelled or share failed — fall through to print
            }
        }

        // Desktop: open print dialog (user can save as PDF)
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;
        printWindow.document.write(`<!DOCTYPE html><html><head>
            <title>Conversación OpenArg</title>
            <style>
                body { font-family: system-ui, sans-serif; max-width: 800px; margin: 2rem auto; padding: 0 1rem; color: #1a1a2e; }
                h1 { font-size: 1.4rem; border-bottom: 2px solid #74ACDF; padding-bottom: 0.5rem; }
                .msg { margin: 1rem 0; padding: 0.75rem; border-radius: 8px; }
                .user { background: #f0f4ff; }
                .assistant { background: #f8f9fa; border-left: 3px solid #74ACDF; }
                .role { font-weight: 700; font-size: 0.85rem; color: #555; margin-bottom: 0.25rem; }
                .content { white-space: pre-wrap; line-height: 1.6; }
                .footer { margin-top: 2rem; font-size: 0.8rem; color: #888; border-top: 1px solid #ddd; padding-top: 0.5rem; }
            </style>
        </head><body>
            <h1>Conversación OpenArg</h1>
            ${messages.map((m) => `
                <div class="msg ${m.role}">
                    <div class="role">${m.role === 'user' ? 'Yo' : 'OpenArg'}</div>
                    <div class="content">${m.content.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
                </div>
            `).join('')}
            <div class="footer">Generado por OpenArg — ${new Date().toLocaleDateString('es-AR')}</div>
        </body></html>`);
        printWindow.document.close();
        printWindow.onload = () => { printWindow.print(); };
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
                                    aria-label="Historial de conversaciones"
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
                                        {msg.chartData.map((chart, i) =>
                                            chart.type === 'heatmap' || chart.type === 'scatter'
                                                ? <ObservablePlotChart key={i} chart={chart} />
                                                : <DataChart key={i} chart={chart} />
                                        )}
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
                                aria-label={policyMode ? 'Desactivar análisis de política pública' : 'Activar análisis de política pública'}
                            >
                                <span className="policy-toggle-icon">🏛️</span>
                                <span className="policy-toggle-label">Deep Policy Analysis</span>
                                {policyMode && <span className="policy-toggle-badge">ON</span>}
                            </button>
                            {messages.some((m) => m.role === 'assistant' && m.content) && (
                                <button
                                    className="policy-toggle"
                                    onClick={handleShareConversation}
                                    title="Compartir conversación"
                                >
                                    {isDesktop ? <IoDownloadOutline size={16} /> : <IoShareSocialOutline size={16} />}
                                    <span className="policy-toggle-label">{isDesktop ? 'Descargar' : 'Compartir'}</span>
                                </button>
                            )}
                        </div>
                        <div className="chat-input-row">
                            <div className="chat-input-container">
                                <textarea
                                    ref={inputRef}
                                    className="chat-input"
                                    value={input}
                                    onChange={(e) => {
                                        setInput(e.target.value);
                                        adjustHeight();
                                        // On mobile, scroll input area above keyboard
                                        if (!isDesktop) {
                                            requestAnimationFrame(() => {
                                                e.target.closest('.chat-input-area')?.scrollIntoView({ block: 'end', behavior: 'smooth' });
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
