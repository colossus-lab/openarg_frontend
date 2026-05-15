'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { ChatMessage as ChatMessageType, AgentPhase } from '@/lib/types';
import ChatMessage from '@/components/ChatMessage';
import UserMenu from '@/components/UserMenu';
import ThemeToggle from '@/components/ThemeToggle';
import ConversationSidebar from '@/components/ConversationSidebar';
import ChatComposer from '@/components/chat/ChatComposer';
import ChatWelcome from '@/components/chat/ChatWelcome';
import MessageHistory from '@/components/chat/MessageHistory';

import { TbBrain, TbRadar2, TbChartDots3, TbFileAnalytics } from 'react-icons/tb';
import Magnet from '@/components/reactbits/Magnet';

import { useSSEStream } from '@/hooks/useSSEStream';
import { useChatSuggestions } from '@/hooks/useChatSuggestions';
import { useChatShortcuts } from '@/hooks/useChatShortcuts';
import { useIsDesktop } from '@/hooks/useIsDesktop';
import { useMessageFeedback } from '@/hooks/useMessageFeedback';
import { useStreamEventHandler } from '@/hooks/useStreamEventHandler';
import { useConversationState, ConversationDetail } from '@/hooks/useConversationState';
import { useAutoResize } from '@/hooks/useAutoResize';
import { shareConversation } from '@/lib/chat/shareConversation';
import { PORTAL_COUNT } from '@/lib/constants';

const AGENT_PHASE_ORDER: AgentPhase[] = ['planning', 'data_collection', 'analysis', 'synthesis'];

export default function ChatPage({ apiEndpoint = '/api/chat' }: { apiEndpoint?: string } = {}) {
    const { data: session } = useSession();
    const isDesktop = useIsDesktop();
    const t = useTranslations('chat');
    const tAgents = useTranslations('agents');

    const defaultSuggestions = useMemo(() => [
        t('suggestion1'),
        t('suggestion2'),
        t('suggestion3'),
        t('suggestion4'),
    ], [t]);
    const suggestions = useChatSuggestions(defaultSuggestions);

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
    const messageIndexById = useMemo(() => {
        const index = new Map<string, number>();
        for (let i = 0; i < messages.length; i++) {
            index.set(messages[i].id, i);
        }
        return index;
    }, [messages]);
    const previousUserPromptByMessageId = useMemo(() => {
        const previousUserPrompt = new Map<string, string>();
        let lastUserPrompt: string | null = null;
        for (const message of messages) {
            if (lastUserPrompt) {
                previousUserPrompt.set(message.id, lastUserPrompt);
            }
            if (message.role === 'user') {
                lastUserPrompt = message.content;
            }
        }
        return previousUserPrompt;
    }, [messages]);

    const agentPipeline = useMemo(() => ([
        { key: 'planning' as AgentPhase, icon: <TbBrain size={18} />, label: tAgents('strategist') },
        { key: 'data_collection' as AgentPhase, icon: <TbRadar2 size={18} />, label: tAgents('researcher') },
        { key: 'analysis' as AgentPhase, icon: <TbChartDots3 size={18} />, label: tAgents('analyst') },
        { key: 'synthesis' as AgentPhase, icon: <TbFileAnalytics size={18} />, label: tAgents('writer') },
    ]), [tAgents]);

    const handleStreamEvent = useStreamEventHandler({
        activeConversationIdRef,
        currentPhaseRef,
        setClarificationOptions,
        setCompletedPhases,
        setCurrentPhase,
        setIsLoading,
        setLoadedConversation,
        setMessages,
        setSidebarRefresh,
        setStreamingMessage,
        setThinking,
    });

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
                        confidence: result.confidence ?? undefined,
                        uiTrace: result.uiTrace ?? undefined,
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

    const { feedbackError, handleFeedback } = useMessageFeedback({
        messages,
        messageIndexById,
        setMessages,
        texts: {
            generic: t('feedbackErrorGeneric'),
            timeout: t('feedbackErrorTimeout'),
            connection: t('feedbackErrorConnection'),
        },
    });

    /** Resend the user question that preceded an errored assistant message.
     *
     *  Per FR-012a of 002-chat-ui (and FR-016 of 001d-conversation-lifecycle),
     *  regeneration is **append-only** — we do not mutate the errored
     *  message in place; we find the user message right before it in
     *  history and send it as a new turn via `handleSend`. The errored
     *  bubble stays visible as a record of the failed attempt. */
    const handleRegenerate = useCallback((messageId: string) => {
        const previousUserPrompt = previousUserPromptByMessageId.get(messageId);
        if (previousUserPrompt) {
            handleSend(previousUserPrompt);
        }
    // handleSend is declared later; include in deps via an ESLint-disable
    // comment is overkill here because it closes over stable refs/stateful
    // setters and the regenerate action only needs the memoized prompt lookup.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [previousUserPromptByMessageId]);

    const handleShareConversation = useCallback(async () => {
        await shareConversation(messages, {
            shareTitle: t('shareTitle'),
            shareUser: t('shareUser'),
            shareAssistant: t('shareAssistant'),
            shareFooter: t('shareFooter'),
        });
    }, [messages, t]);

    useChatShortcuts({ onNewConversation: handleNewConversation, inputRef });

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
                            <ChatWelcome
                                suggestions={suggestions}
                                portals={PORTAL_COUNT}
                                onSendSuggestion={handleSend}
                            />
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

                    {feedbackError && (
                        <div style={{ textAlign: 'center', color: '#ff6b6b', fontSize: '0.85rem', padding: '0.25rem 0' }}>
                            {feedbackError}
                        </div>
                    )}

                    {/* Input — multi-agent thinking indicator is now rendered INSIDE the composer pill */}
                    <ChatComposer
                        input={input}
                        isDesktop={isDesktop}
                        isLoading={isLoading}
                        policyMode={policyMode}
                        hasAssistantMessages={hasAssistantMessages}
                        agentPipeline={agentPipeline}
                        currentPhase={currentPhase}
                        completedPhases={completedPhases}
                        phaseOrder={AGENT_PHASE_ORDER}
                        thinking={thinking}
                        onInputChange={(value, target) => {
                            setInput(value);
                            adjustHeight();
                            if (!isDesktop) {
                                requestAnimationFrame(() => {
                                    target.closest('.chat-input-area')?.scrollIntoView({ block: 'end', behavior: 'smooth' });
                                    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
                                });
                            }
                        }}
                        onInputKeyDown={handleKeyDown}
                        onPolicyToggle={() => setPolicyMode(!policyMode)}
                        onShare={handleShareConversation}
                        onSend={() => handleSend()}
                        textareaRef={inputRef}
                    />
                </div>
            </div>
        </div>
    );
}
