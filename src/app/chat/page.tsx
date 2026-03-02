'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { ChatMessage as ChatMessageType, StreamEvent, AgentPhase, ChartData, SourceAttribution, DocumentRecord } from '@/lib/types';
import ChatMessage from '@/components/ChatMessage';
import AgentActivityBar from '@/components/AgentActivityBar';
import DataChart from '@/components/DataChart';
import SourcePanel from '@/components/SourcePanel';
import DocumentCards from '@/components/DocumentCards';
import UserMenu from '@/components/UserMenu';
import ConversationSidebar from '@/components/ConversationSidebar';
import { HiMagnifyingGlass } from 'react-icons/hi2';
import { IoSend } from 'react-icons/io5';


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
    const isDesktop = useIsDesktop();

    // Sidebar state: open by default on desktop, closed on mobile
    const [sidebarOpen, setSidebarOpen] = useState(false); // mobile overlay
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false); // desktop collapse

    const [policyMode, setPolicyMode] = useState(false);

    // Update sessionId when session becomes available
    useEffect(() => {
        if (session?.user?.email) {
            sessionIdRef.current = session.user.email;
        }
    }, [session?.user?.email]);
    const [loadedConversation, setLoadedConversation] = useState<LoadedConversation | null>(null);

    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [messages, thinking, scrollToBottom]);

    const handleSend = async (text?: string) => {
        const messageText = text || input.trim();
        if (!messageText || isLoading) return;

        // Clear loaded conversation state when sending a new message
        setLoadedConversation(null);
        setInput('');
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

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: messageText,
                    sessionId: sessionIdRef.current,
                    policyMode,
                }),
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
                            case 'content':
                                assistantContent += event.data as string;
                                setMessages((prev) => {
                                    const existing = prev.find((m) => m.id === 'streaming');
                                    if (existing) {
                                        return prev.map((m) =>
                                            m.id === 'streaming' ? { ...m, content: assistantContent } : m
                                        );
                                    }
                                    return [
                                        ...prev,
                                        {
                                            id: 'streaming',
                                            role: 'assistant' as const,
                                            content: assistantContent,
                                            timestamp: new Date().toISOString(),
                                        },
                                    ];
                                });
                                break;
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
                                assistantContent += `\n\n Error: ${event.data}`;
                                break;
                            case 'done':
                                break;
                        }
                    } catch {
                        // Skip malformed SSE
                    }
                }
            }
        } catch (err) {
            assistantContent = `Error de conexion: ${err instanceof Error ? err.message : 'Error desconocido'}`;
        }

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
                },
            ];
        });

        setIsLoading(false);
        setCurrentPhase(null);
        setThinking('');
        inputRef.current?.focus();
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
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
            created_at: string;
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
        }));

        setMessages(loadedMessages);
        setLoadedConversation({ id: detail.id, title: detail.title });
        setCurrentPhase(null);
        setCompletedPhases([]);
        setThinking('');
        // On mobile, close the overlay
        setSidebarOpen(false);
    };

    const handleNewConversation = () => {
        setMessages([]);
        setLoadedConversation(null);
        setInput('');
        setIsLoading(false);
        setCurrentPhase(null);
        setThinking('');
        setCompletedPhases([]);
        setSidebarOpen(false);
        inputRef.current?.focus();
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
                    userId={session?.user?.email || undefined}
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
                                    <img src="/flag-icon.svg" alt="OpenArg" className="chat-header-logo" />
                                    <span>OpenArg</span>
                                </Link>
                            )}
                        </div>
                        <div className="chat-header-right">
                            <Link href="/datasets" className="chat-header-nav-link">
                                Datasets
                            </Link>
                            <UserMenu />
                        </div>
                    </header>

                    {/* Loaded conversation banner */}
                    {loadedConversation && (
                        <div className="loaded-conversation-banner">
                            <span>Conversacion cargada</span>
                            <button onClick={handleNewConversation}>
                                Nueva conversacion
                            </button>
                        </div>
                    )}

                    {/* Agent Activity Bar */}
                    {isLoading && (
                        <AgentActivityBar
                            currentPhase={currentPhase}
                            completedPhases={completedPhases}
                            thinking={thinking}
                        />
                    )}

                    {/* Messages */}
                    <div className="chat-messages">
                        {!hasMessages && (
                            <div className="welcome-container">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src="/flag-icon.svg" alt="OpenArg" className="welcome-icon" />
                                <h2 className="welcome-title">¿Que queres saber sobre Argentina?</h2>
                                <p className="welcome-subtitle">
                                    Hace preguntas sobre presupuesto, economia, salud, educacion,
                                    transparencia o cualquier dato publico. Los agentes de IA buscaran
                                    y analizaran la informacion por vos.
                                </p>
                                <div className="welcome-suggestions">
                                    {SUGGESTIONS.map((s, i) => (
                                        <button
                                            key={i}
                                            className="suggestion-chip glass-light"
                                            onClick={() => handleSend(s)}
                                        >
                                            {s}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {messages.map((msg) => (
                            <div key={msg.id}>
                                <ChatMessage message={msg} />
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

                    {/* Input */}
                    <div className="chat-input-area">
                        <div className="chat-input-row">
                            <button
                                className={`policy-toggle-btn${policyMode ? ' active' : ''}`}
                                onClick={() => setPolicyMode(!policyMode)}
                                title={policyMode ? 'Deep Policy Analysis ON' : 'Activar analisis de politica publica'}
                            >
                                {policyMode && <span className="policy-label">Deep</span>}
                                <HiMagnifyingGlass size={16} />
                            </button>
                            <div className="chat-input-container">
                                <textarea
                                    ref={inputRef}
                                    className="chat-input"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Pregunta sobre datos abiertos de Argentina..."
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
