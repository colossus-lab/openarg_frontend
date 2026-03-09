'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { ChatMessage as ChatMessageType, ChartData, DocumentRecord } from '@/lib/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LoadedConversation {
    id: string;
    title: string;
}

/** Shape of a conversation detail received from the sidebar */
export interface ConversationDetail {
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
}

export interface UseConversationStateReturn {
    messages: ChatMessageType[];
    setMessages: React.Dispatch<React.SetStateAction<ChatMessageType[]>>;
    loadedConversation: LoadedConversation | null;
    setLoadedConversation: React.Dispatch<React.SetStateAction<LoadedConversation | null>>;
    activeConversationIdRef: React.MutableRefObject<string | null>;
    sessionIdRef: React.MutableRefObject<string>;
    /**
     * Load a conversation from the sidebar into the chat view.
     * Returns the mapped messages.
     */
    loadConversation: (detail: ConversationDetail) => ChatMessageType[];
    /** Reset all conversation state for a new conversation */
    startNewConversation: () => void;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useConversationState(userEmail: string | undefined | null): UseConversationStateReturn {
    const [messages, setMessages] = useState<ChatMessageType[]>([]);
    const [loadedConversation, setLoadedConversation] = useState<LoadedConversation | null>(null);
    const activeConversationIdRef = useRef<string | null>(null);
    const sessionIdRef = useRef(userEmail || `session_${crypto.randomUUID()}`);

    // Update sessionId when session becomes available
    useEffect(() => {
        if (userEmail) {
            sessionIdRef.current = userEmail;
        }
    }, [userEmail]);

    const loadConversation = useCallback((detail: ConversationDetail): ChatMessageType[] => {
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

        setMessages(loadedMessages);
        setLoadedConversation({ id: detail.id, title: detail.title });
        activeConversationIdRef.current = detail.id;

        return loadedMessages;
    }, []);

    const startNewConversation = useCallback(() => {
        setMessages([]);
        setLoadedConversation(null);
        activeConversationIdRef.current = null;
    }, []);

    return {
        messages,
        setMessages,
        loadedConversation,
        setLoadedConversation,
        activeConversationIdRef,
        sessionIdRef,
        loadConversation,
        startNewConversation,
    };
}
