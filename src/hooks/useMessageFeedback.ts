'use client';

import { useCallback, useState } from 'react';

import { ChatMessage } from '@/lib/types';

interface FeedbackTexts {
    generic: string;
    timeout: string;
    connection: string;
}

interface Props {
    messages: ChatMessage[];
    messageIndexById: Map<string, number>;
    setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
    texts: FeedbackTexts;
}

export function useMessageFeedback({
    messages,
    messageIndexById,
    setMessages,
    texts,
}: Props) {
    const [feedbackError, setFeedbackError] = useState<string | null>(null);

    const handleFeedback = useCallback(async (messageId: string, feedback: 'up' | 'down', comment?: string) => {
        const msgIndex = messageIndexById.get(messageId);
        const msg = msgIndex !== undefined ? messages[msgIndex] : undefined;
        if (!msg?.backendMessageId || !msg?.conversationId) return;

        setFeedbackError(null);
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10_000);
        try {
            const res = await fetch('/api/feedback', {
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
                setMessages((prev) => {
                    const index = messageIndexById.get(messageId);
                    if (index === undefined || !prev[index]) return prev;
                    const next = [...prev];
                    next[index] = {
                        ...next[index],
                        feedback,
                        feedbackComment: comment || null,
                    };
                    return next;
                });
            } else {
                setFeedbackError(texts.generic);
            }
        } catch (err) {
            if (err instanceof DOMException && err.name === 'AbortError') {
                setFeedbackError(texts.timeout);
            } else {
                setFeedbackError(texts.connection);
            }
        } finally {
            clearTimeout(timeout);
        }
    }, [messageIndexById, messages, setMessages, texts.connection, texts.generic, texts.timeout]);

    return { feedbackError, handleFeedback };
}

