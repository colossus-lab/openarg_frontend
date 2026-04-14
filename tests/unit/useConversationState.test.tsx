import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useConversationState } from '@/hooks/useConversationState';

describe('useConversationState', () => {
    it('restores persisted confidence and ui trace when loading a saved conversation', () => {
        const { result } = renderHook(() => useConversationState('user@example.com'));

        act(() => {
            result.current.loadConversation({
                id: 'conv-1',
                title: 'Conversación',
                messages: [
                    {
                        id: 'msg-1',
                        role: 'assistant',
                        content: 'Respuesta guardada',
                        sources: [],
                        confidence: 0.67,
                        ui_trace: {
                            quality: { confidence: 0.67, sourceCount: 0, portalCount: 0 },
                            pipeline: {
                                phases: ['planning', 'analysis'],
                                thinking: [{ phase: 'analysis', text: 'Analizando resultados...' }],
                            },
                        },
                        created_at: '2026-04-12T00:00:00Z',
                    },
                ],
            });
        });

        expect(result.current.messages).toHaveLength(1);
        expect(result.current.messages[0].confidence).toBe(0.67);
        expect(result.current.messages[0].uiTrace?.pipeline?.phases).toEqual(['planning', 'analysis']);
        expect(result.current.messages[0].conversationId).toBe('conv-1');
    });
});
