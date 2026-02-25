'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ChatMessage as ChatMessageType, StreamEvent, AgentPhase, ChartData, SourceAttribution } from '@/lib/agents/types';
import ChatMessage from '@/components/ChatMessage';
import AgentActivityBar from '@/components/AgentActivityBar';
import DataChart from '@/components/DataChart';
import SourcePanel from '@/components/SourcePanel';

const SUGGESTIONS = [
    '¿Cuál es la evolución del presupuesto nacional en los últimos 5 años?',
    'Comparar indicadores de salud entre CABA y Córdoba',
    '¿Qué datos abiertos tiene la provincia de Santa Fe?',
    'Mostrar la tendencia de inflación mensual en Argentina',
];

export default function ChatPage() {
    const [messages, setMessages] = useState<ChatMessageType[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [currentPhase, setCurrentPhase] = useState<AgentPhase | null>(null);
    const currentPhaseRef = useRef<AgentPhase | null>(null);
    const [thinking, setThinking] = useState<string>('');
    const [completedPhases, setCompletedPhases] = useState<AgentPhase[]>([]);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const sessionIdRef = useRef(`session_${crypto.randomUUID()}`);

    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [messages, thinking, scrollToBottom]);

    const handleSend = async (text?: string) => {
        const messageText = text || input.trim();
        if (!messageText || isLoading) return;

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
        let charts: ChartData[] = [];
        let sources: SourceAttribution[] = [];

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: messageText,
                    sessionId: sessionIdRef.current,
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
                            case 'error':
                                assistantContent += `\n\n⚠️ Error: ${event.data}`;
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
            assistantContent = `❌ Error de conexión: ${err instanceof Error ? err.message : 'Error desconocido'}`;
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

    const hasMessages = messages.length > 0;

    return (
        <div className="chat-layout">
            {/* Header */}
            <header className="chat-header">
                <div className="chat-header-title">
                    <div className="chat-header-logo">🇦🇷</div>
                    <span>OpenArg</span>
                </div>
                <Link href="/" className="chat-header-back">
                    ← Inicio
                </Link>
            </header>

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
                        <div className="welcome-icon">🏛️</div>
                        <h2 className="welcome-title">¿Qué querés saber sobre Argentina?</h2>
                        <p className="welcome-subtitle">
                            Hacé preguntas sobre presupuesto, economía, salud, educación,
                            transparencia o cualquier dato público. Los agentes de IA buscarán
                            y analizarán la información por vos.
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

                {isLoading && thinking && (
                    <div className="thinking-indicator" style={{ maxWidth: '800px', margin: '0 auto', padding: '0.75rem 1.5rem' }}>
                        <div className="thinking-dots">
                            <span></span>
                            <span></span>
                            <span></span>
                        </div>
                        <span>{thinking}</span>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="chat-input-area">
                <div className="chat-input-wrapper">
                    <textarea
                        ref={inputRef}
                        className="chat-input"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Preguntá sobre datos abiertos de Argentina..."
                        rows={1}
                        disabled={isLoading}
                    />
                    <button
                        className="chat-send-btn"
                        onClick={() => handleSend()}
                        disabled={!input.trim() || isLoading}
                    >
                        ▶
                    </button>
                </div>
            </div>
        </div>
    );
}
