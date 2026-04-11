'use client';

import { useState, useRef, useEffect, useCallback, useMemo, memo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { ChatMessage as ChatMessageType, StreamEvent, AgentPhase } from '@/lib/types';
import ChatMessage from '@/components/ChatMessage';
import SourcePanel from '@/components/SourcePanel';
import DocumentCards from '@/components/DocumentCards';

// Lazy load heavy chart components — they pull in Recharts / Observable Plot
const DataChart = dynamic(() => import('@/components/DataChart'), {
    ssr: false,
    loading: () => <div className="chart-loading-placeholder">{/* i18n handled at render */}</div>,
});
const ObservablePlotChart = dynamic(() => import('@/components/ObservablePlotChart'), {
    ssr: false,
    loading: () => <div className="chart-loading-placeholder">{/* i18n handled at render */}</div>,
});
const MapView = dynamic(() => import('@/components/MapView'), {
    ssr: false,
    loading: () => <div className="chart-loading-placeholder">{/* map loading */}</div>,
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
import { PORTAL_COUNT } from '@/lib/constants';

const AGENT_PHASE_ORDER: AgentPhase[] = ['planning', 'data_collection', 'analysis', 'synthesis'];

// SUGGESTIONS are now loaded from translations inside the component

function useIsDesktop() {
    const [isDesktop, setIsDesktop] = useState(() =>
        typeof window !== 'undefined' ? window.matchMedia('(min-width: 769px)').matches : true
    );
    useEffect(() => {
        const mq = window.matchMedia('(min-width: 769px)');
        const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
        mq.addEventListener('change', handler);
        return () => mq.removeEventListener('change', handler);
    }, []);
    return isDesktop;
}

const MessageHistory = memo(function MessageHistory({
    messages,
    onFeedback,
    onRegenerate,
}: {
    messages: ChatMessageType[];
    onFeedback: (messageId: string, feedback: 'up' | 'down', comment?: string) => void;
    onRegenerate: (messageId: string) => void;
}) {
    return (
        <>
            {messages.map((msg) => (
                <div key={msg.id}>
                    <ChatMessage message={msg} onFeedback={onFeedback} onRegenerate={onRegenerate} />
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
                    {msg.role === 'assistant' && msg.mapData && msg.mapData.features?.length > 0 && (
                        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '0 1.5rem 1rem' }}>
                            <MapView mapData={msg.mapData} />
                        </div>
                    )}
                    {msg.role === 'assistant' && msg.sources && msg.sources.length > 0 && (
                        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '0 1.5rem 1rem' }}>
                            <SourcePanel sources={msg.sources} />
                        </div>
                    )}
                </div>
            ))}
        </>
    );
});

export default function ChatPage({ apiEndpoint = '/api/chat' }: { apiEndpoint?: string } = {}) {
    const { data: session } = useSession();
    const isDesktop = useIsDesktop();
    const t = useTranslations('chat');
    const tAgents = useTranslations('agents');

    const SUGGESTIONS = [
        t('suggestion1'),
        t('suggestion2'),
        t('suggestion3'),
        t('suggestion4'),
    ];

    // --- Custom hooks ---
    const {
        messages, setMessages,
        loadedConversation, setLoadedConversation,
        activeConversationIdRef,
        sessionIdRef,
        loadConversation,
        startNewConversation,
    } = useConversationState(session?.user?.email);

    // --- Local UI state ---
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [streamingMessage, setStreamingMessage] = useState<ChatMessageType | null>(null);
    const lastSendTimestampRef = useRef<number>(0);
    const [currentPhase, setCurrentPhase] = useState<AgentPhase | null>(null);
    const currentPhaseRef = useRef<AgentPhase | null>(null);
    const [thinking, setThinking] = useState<string>('');
    const [completedPhases, setCompletedPhases] = useState<Set<AgentPhase>>(new Set());
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const scrollRafRef = useRef<number | null>(null);

    // Sidebar state: open by default on desktop, closed on mobile
    const [sidebarOpen, setSidebarOpen] = useState(false); // mobile overlay
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false); // desktop collapse

    const [policyMode, setPolicyMode] = useState(false);
    const [clarificationOptions, setClarificationOptions] = useState<string[]>([]);
    const [sidebarRefresh, setSidebarRefresh] = useState(0);

    const {
        sendMessage, abort,
        setIsStreaming,
    } = useSSEStream(setStreamingMessage, apiEndpoint);

    const { textareaRef: inputRef, adjustHeight, resetHeight } = useAutoResize();

    // Abort in-flight request on unmount
    useEffect(() => {
        return () => {
            if (scrollRafRef.current !== null) {
                cancelAnimationFrame(scrollRafRef.current);
            }
            abort();
        };
    }, [abort]);

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

    const scrollToBottom = useCallback((behavior: ScrollBehavior = 'auto') => {
        if (scrollRafRef.current !== null) {
            cancelAnimationFrame(scrollRafRef.current);
        }
        scrollRafRef.current = requestAnimationFrame(() => {
            messagesEndRef.current?.scrollIntoView({ behavior, block: 'end' });
            scrollRafRef.current = null;
        });
    }, []);

    useEffect(() => {
        const behavior: ScrollBehavior =
            isLoading || Boolean(streamingMessage?.content) || Boolean(thinking) ? 'auto' : 'smooth';
        scrollToBottom(behavior);
    }, [isLoading, messages, streamingMessage?.content, thinking, scrollToBottom]);

    const hasAssistantMessages = useMemo(
        () => messages.some((m) => m.role === 'assistant' && m.content),
        [messages],
    );

    const agentPipeline = useMemo(() => ([
        { key: 'planning' as AgentPhase, icon: <TbBrain size={18} />, label: tAgents('strategist') },
        { key: 'data_collection' as AgentPhase, icon: <TbRadar2 size={18} />, label: tAgents('researcher') },
        { key: 'analysis' as AgentPhase, icon: <TbChartDots3 size={18} />, label: tAgents('analyst') },
        { key: 'synthesis' as AgentPhase, icon: <TbFileAnalytics size={18} />, label: tAgents('writer') },
    ]), [tAgents]);

    // --- Event handler for SSE stream events (phase_change, thinking, etc.) ---
    const handleStreamEvent = useCallback((event: StreamEvent) => {
        switch (event.type) {
            case 'phase_change': {
                const newPhase = event.data as AgentPhase;
                const prevPhase = currentPhaseRef.current;
                if (prevPhase) {
                    setCompletedPhases((prev) => {
                        if (prev.has(prevPhase)) return prev;
                        const next = new Set(prev);
                        next.add(prevPhase);
                        return next;
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
            case 'clarification': {
                const clarData = event.data as { question: string; options: string[] };
                // Build a clarification message with clickable options
                const clarContent = `**${clarData.question}**`;
                setMessages((prev) => [
                    ...prev,
                    {
                        id: `clarification_${Date.now()}`,
                        role: 'assistant',
                        content: clarContent,
                        timestamp: new Date().toISOString(),
                    },
                ]);
                // Store options for rendering as chips
                setClarificationOptions(clarData.options || []);
                setIsLoading(false);
                setStreamingMessage(null);
                setCurrentPhase(null);
                currentPhaseRef.current = null;
                setThinking('');
                break;
            }
            case 'done': {
                const finalPhase = currentPhaseRef.current;
                if (finalPhase) {
                    setCompletedPhases((prev) => {
                        if (prev.has(finalPhase)) return prev;
                        const next = new Set(prev);
                        next.add(finalPhase);
                        return next;
                    });
                }
                setCurrentPhase(null);
                break;
            }
        }
    }, [activeConversationIdRef, setLoadedConversation, setMessages, setIsLoading]);

    const handleSend = async (text?: string) => {
        const messageText = text || input.trim();
        if (!messageText || isLoading) return;

        if (messageText.length > 10000) {
            alert(t('alertTooLong'));
            return;
        }

        const now = Date.now();
        if (now - lastSendTimestampRef.current < 500) {
            alert(t('alertTooFast'));
            return;
        }
        lastSendTimestampRef.current = now;

        setInput('');
        resetHeight();

        setIsLoading(true);
        setStreamingMessage(null);
        setCurrentPhase(null);
        currentPhaseRef.current = null;
        setCompletedPhases(new Set());
        setThinking('');
        setClarificationOptions([]);

        // Add user message
        const userMsg: ChatMessageType = {
            id: `user_${Date.now()}`,
            role: 'user',
            content: messageText,
            timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, userMsg]);

        // Build history — limit to last 6 and truncate content (backend loads
        // its own chat history from DB, this is only a lightweight fallback)
        const history = messages.slice(-6).map(m => ({
            role: m.role,
            content: m.content.slice(0, 500),
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
            setStreamingMessage(null);
            setCurrentPhase(null);
            currentPhaseRef.current = null;
            setThinking('');
            return;
        }

        // Finalize assistant message (only if there's actual content)
        if (result.assistantContent.trim()) {
            setMessages((prev) => {
                return [
                    ...prev,
                    {
                        id: `assistant_${Date.now()}`,
                        role: 'assistant',
                        content: result.assistantContent,
                        timestamp: new Date().toISOString(),
                        chartData: result.charts.length > 0 ? result.charts : undefined,
                        mapData: result.mapData || undefined,
                        sources: result.sources.length > 0 ? result.sources : undefined,
                        documents: result.documents.length > 0 ? result.documents : undefined,
                        backendMessageId: result.savedAssistantMsgId,
                        conversationId: result.savedConvId,
                        // FR-012a (002-chat-ui): mark the message as errored if
                        // the stream hit an error path. The bridge has already
                        // persisted it with errored:true, so a page refresh
                        // will re-render the chip from messages.errored in
                        // the backend response.
                        errored: result.errored || undefined,
                    },
                ];
            });
        }

        setIsLoading(false);
        setStreamingMessage(null);
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
        setStreamingMessage(null);
        setIsLoading(false);
        setIsStreaming(false);
        setCurrentPhase(null);
        setCompletedPhases(new Set());
        setThinking('');
        // On mobile, close the overlay
        setSidebarOpen(false);
    };

    const handleNewConversation = () => {
        // Abort any in-flight request (server continues saving in background)
        abort();

        startNewConversation();
        setInput('');
        setStreamingMessage(null);
        setIsLoading(false);
        setIsStreaming(false);
        setCurrentPhase(null);
        setThinking('');
        setCompletedPhases(new Set());
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

    const [feedbackError, setFeedbackError] = useState<string | null>(null);

    const handleFeedback = useCallback(async (messageId: string, feedback: 'up' | 'down', comment?: string) => {
        const msg = messages.find((m) => m.id === messageId);
        if (!msg?.backendMessageId || !msg?.conversationId) return;

        setFeedbackError(null);
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10_000);
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
                signal: controller.signal,
            });
            if (res.ok) {
                setMessages((prev) =>
                    prev.map((m) =>
                        m.id === messageId
                            ? { ...m, feedback, feedbackComment: comment || null }
                            : m
                    )
                );
            } else {
                setFeedbackError(t('feedbackErrorGeneric'));
            }
        } catch (err) {
            if (err instanceof DOMException && err.name === 'AbortError') {
                setFeedbackError(t('feedbackErrorTimeout'));
            } else {
                setFeedbackError(t('feedbackErrorConnection'));
            }
        } finally {
            clearTimeout(timeout);
        }
    }, [messages, setMessages, t]);

    /** Resend the user question that preceded an errored assistant message.
     *
     *  Per FR-012a of 002-chat-ui (and FR-016 of 001d-conversation-lifecycle),
     *  regeneration is **append-only** — we do not mutate the errored
     *  message in place; we find the user message right before it in
     *  history and send it as a new turn via `handleSend`. The errored
     *  bubble stays visible as a record of the failed attempt. */
    const handleRegenerate = useCallback((messageId: string) => {
        const idx = messages.findIndex((m) => m.id === messageId);
        if (idx <= 0) return;
        // Walk backwards to find the nearest user message.
        for (let i = idx - 1; i >= 0; i--) {
            if (messages[i].role === 'user') {
                handleSend(messages[i].content);
                return;
            }
        }
    // handleSend is declared later; include in deps via an ESLint-disable
    // comment is overkill — use the fact that setMessages triggers a
    // fresh render. We only need messages to find the sibling, and
    // handleSend closes over stable refs (input/isLoading/etc) so
    // invoking it is safe without adding it as a dep.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [messages]);

    const handleShareConversation = async () => {
        // Build plain text from messages
        const text = messages
            .map((m) => `${m.role === 'user' ? t('shareUser') : t('shareAssistant')}: ${m.content}`)
            .join('\n\n');

        // Mobile: use native share
        if (navigator.share) {
            try {
                await navigator.share({
                    title: t('shareTitle'),
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
        const shareTitle = t('shareTitle');
        const shareUser = t('shareUser');
        const shareAssistant = t('shareAssistant');
        const shareFooter = t('shareFooter');
        printWindow.document.write(`<!DOCTYPE html><html><head>
            <title>${shareTitle}</title>
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
            <h1>${shareTitle}</h1>
            ${messages.map((m) => `
                <div class="msg ${m.role}">
                    <div class="role">${m.role === 'user' ? shareUser : shareAssistant}</div>
                    <div class="content">${m.content.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
                </div>
            `).join('')}
            <div class="footer">${shareFooter} — ${new Date().toLocaleDateString('es-AR')}</div>
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
                                    title={t('conversationHistory')}
                                    aria-label={t('conversationHistory')}
                                >
                                    &#9776;
                                </button>
                            )}
                            {/* Show logo in header only when sidebar is collapsed/hidden */}
                            {(isDesktop ? sidebarCollapsed : true) && (
                                <Link href="/">
                                    <Magnet padding={60} magnetStrength={4}>
                                        <Image
                                            src="/flag-icon.svg"
                                            alt="OpenArg"
                                            width={28}
                                            height={28}
                                            className="chat-header-logo"
                                        />
                                    </Magnet>
                                    <span>OpenArg</span>
                                </Link>
                            )}
                            <nav className="chat-header-right">
                                <Link href="/chat" className="chat-header-nav-link chat-header-nav-link--active">
                                    {t('navChat')}
                                </Link>
                                <Link href="/datasets" className="chat-header-nav-link">
                                    {t('navDatasets')}
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
                                <Magnet padding={80} magnetStrength={3}>
                                    <Image
                                        src="/flag-icon.svg"
                                        alt="OpenArg"
                                        width={88}
                                        height={88}
                                        className="welcome-icon"
                                    />
                                </Magnet>
                                <h2 className="welcome-title">
                                    <DecryptedText
                                        text={t('welcomeTitle')}
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
                                        t('welcomeRotating1'),
                                        t('welcomeRotating2'),
                                        t('welcomeRotating3'),
                                        t('welcomeRotating4'),
                                        t('welcomeRotating5'),
                                    ]}
                                    rotationInterval={3000}
                                    staggerDuration={0.03}
                                    splitBy="characters"
                                    mainClassName="welcome-rotating"
                                    elementLevelClassName="welcome-rotating-char"
                                />
                                <BlurText
                                    text={t('welcomeSubtitle', { portals: PORTAL_COUNT })}
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

                        <MessageHistory messages={messages} onFeedback={handleFeedback} onRegenerate={handleRegenerate} />
                        {streamingMessage && (
                            <ChatMessage message={streamingMessage} onFeedback={handleFeedback} />
                        )}


                        {clarificationOptions.length > 0 && (
                            <div className="welcome-suggestions" style={{ maxWidth: '800px', margin: '0.5rem auto', padding: '0 1.5rem' }}>
                                {clarificationOptions.map((opt, i) => (
                                    <button
                                        key={i}
                                        className="suggestion-chip glass-light"
                                        onClick={() => {
                                            setClarificationOptions([]);
                                            handleSend(opt);
                                        }}
                                    >
                                        {opt}
                                    </button>
                                ))}
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>

                    {/* Multi-agent thinking indicator */}
                    {isLoading && (
                        <div className="thinking-bar">
                            <div className="thinking-bar-inner">
                                <div className="agent-pipeline">
                                    {agentPipeline.map((agent, i) => {
                                        const isActive = currentPhase === agent.key;
                                        const isCompleted = completedPhases.has(agent.key);
                                        const stateClass = isActive ? 'active' : isCompleted ? 'completed' : 'pending';
                                        const prevPhase = i > 0 ? AGENT_PHASE_ORDER[i - 1] : null;
                                        const prevCompleted = prevPhase ? completedPhases.has(prevPhase) : false;
                                        return (
                                            <span key={agent.key} className="agent-node-group">
                                                {i > 0 && (
                                                    <span className={`agent-connector ${
                                                        prevCompleted ? 'completed' : ''
                                                    }`}>
                                                        <span className="agent-connector-line" />
                                                        {prevCompleted && (
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

                    {feedbackError && (
                        <div style={{ textAlign: 'center', color: '#ff6b6b', fontSize: '0.85rem', padding: '0.25rem 0' }}>
                            {feedbackError}
                        </div>
                    )}

                    {/* Input */}
                    <div className="chat-input-area">
                        <div className="chat-input-controls">
                            <button
                                className={`policy-toggle ${policyMode ? 'active' : ''}`}
                                onClick={() => setPolicyMode(!policyMode)}
                                disabled={isLoading}
                                title={policyMode ? t('policyToggleOn') : t('policyToggleOff')}
                                aria-label={policyMode ? t('policyToggleOn') : t('policyToggleOff')}
                            >
                                <span className="policy-toggle-icon">🏛️</span>
                                <span className="policy-toggle-label">{t('policyToggleLabel')}</span>
                                {policyMode && <span className="policy-toggle-badge">{t('policyToggleBadge')}</span>}
                            </button>
                            {hasAssistantMessages && (
                                <button
                                    className="policy-toggle"
                                    onClick={handleShareConversation}
                                    title={t('shareTitle')}
                                >
                                    {isDesktop ? <IoDownloadOutline size={16} /> : <IoShareSocialOutline size={16} />}
                                    <span className="policy-toggle-label">{isDesktop ? t('downloadLabel') : t('shareLabel')}</span>
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
                                    placeholder={isDesktop ? t('placeholderDesktop') : t('placeholderMobile')}
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
