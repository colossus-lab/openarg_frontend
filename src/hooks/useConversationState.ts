'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { ChatMessage as ChatMessageType, ChartData, MapData, DocumentRecord } from '@/lib/types';

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
        map_data?: Record<string, unknown> | null;
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
        const safeStr = (obj: unknown, key: string, fallback = ''): string => {
            if (obj && typeof obj === 'object' && key in obj) {
                const val = (obj as Record<string, unknown>)[key];
                return typeof val === 'string' ? val : fallback;
            }
            return fallback;
        };

        const loadedMessages: ChatMessageType[] = detail.messages.map((m) => ({
            id: `loaded_${m.id}`,
            role: (m.role === 'user' || m.role === 'assistant') ? m.role : 'assistant',
            content: m.content || '',
            timestamp: m.created_at,
            sources: m.role === 'assistant' && Array.isArray(m.sources) && m.sources.length > 0
                ? m.sources.map((s) => ({
                      name: safeStr(s, 'title') || safeStr(s, 'name') || 'Fuente',
                      url: safeStr(s, 'url', 'https://datos.gob.ar'),
                      portal: safeStr(s, 'portal'),
                      accessedAt: new Date().toISOString(),
                  }))
                : undefined,
            chartData: Array.isArray(m.chart_data) && m.chart_data.length > 0 ? m.chart_data as unknown as ChartData[] : undefined,
            mapData: m.map_data && typeof m.map_data === 'object' ? m.map_data as unknown as MapData : undefined,
            documents: Array.isArray(m.documents) && m.documents.length > 0 ? m.documents as unknown as DocumentRecord[] : undefined,
            backendMessageId: m.id,
            conversationId: detail.id,
            feedback: (m.feedback === 'up' || m.feedback === 'down') ? m.feedback : null,
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
