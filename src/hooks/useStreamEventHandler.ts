'use client';

import { useCallback } from 'react';

import { AgentPhase, ChatMessage, StreamEvent } from '@/lib/types';

interface Props {
    activeConversationIdRef: React.MutableRefObject<string | null>;
    currentPhaseRef: React.MutableRefObject<AgentPhase | null>;
    setClarificationOptions: React.Dispatch<React.SetStateAction<string[]>>;
    setCompletedPhases: React.Dispatch<React.SetStateAction<Set<AgentPhase>>>;
    setCurrentPhase: React.Dispatch<React.SetStateAction<AgentPhase | null>>;
    setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
    setLoadedConversation: React.Dispatch<React.SetStateAction<{ id: string; title: string } | null>>;
    setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
    setSidebarRefresh: React.Dispatch<React.SetStateAction<number>>;
    setStreamingMessage: React.Dispatch<React.SetStateAction<ChatMessage | null>>;
    setThinking: React.Dispatch<React.SetStateAction<string>>;
}

export function useStreamEventHandler({
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
}: Props) {
    return useCallback((event: StreamEvent) => {
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
                if (isNewConversation) {
                    setSidebarRefresh((n) => n + 1);
                }
                break;
            }
            case 'clarification': {
                const clarData = event.data as { question: string; options: string[] };
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
    }, [
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
    ]);
}

