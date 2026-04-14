import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import ConversationSidebar from '@/components/ConversationSidebar';

type ConversationSummary = {
    id: string;
    title: string;
    created_at: string;
    updated_at: string;
};

function makeConversation(id: string): ConversationSummary {
    return {
        id,
        title: `Conversation ${id}`,
        created_at: '2026-04-12T00:00:00.000Z',
        updated_at: '2026-04-12T00:00:00.000Z',
    };
}

describe('ConversationSidebar', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('reuses cached first page when reopened inside the cooldown window', async () => {
        const fetchMock = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => [makeConversation('1')],
        });
        vi.stubGlobal('fetch', fetchMock);

        const { rerender } = render(
            <ConversationSidebar
                isOpen={true}
                isCollapsed={true}
                onClose={() => {}}
                onToggleCollapse={() => {}}
                onSelectConversation={() => {}}
                onNewConversation={() => {}}
                userId="user@example.com"
            />,
        );

        await screen.findByText('Conversation 1');
        expect(fetchMock).toHaveBeenCalledTimes(1);

        rerender(
            <ConversationSidebar
                isOpen={false}
                isCollapsed={true}
                onClose={() => {}}
                onToggleCollapse={() => {}}
                onSelectConversation={() => {}}
                onNewConversation={() => {}}
                userId="user@example.com"
            />,
        );

        rerender(
            <ConversationSidebar
                isOpen={true}
                isCollapsed={true}
                onClose={() => {}}
                onToggleCollapse={() => {}}
                onSelectConversation={() => {}}
                onNewConversation={() => {}}
                userId="user@example.com"
            />,
        );

        await screen.findByText('Conversation 1');
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('deduplicates conversations when a later page overlaps with existing rows', async () => {
        const firstPage = Array.from({ length: 30 }, (_, i) => makeConversation(String(i + 1)));
        const overlappingSecondPage = [makeConversation('30'), makeConversation('31')];

        const fetchMock = vi
            .fn()
            .mockResolvedValueOnce({
                ok: true,
                json: async () => firstPage,
            })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => overlappingSecondPage,
            });
        vi.stubGlobal('fetch', fetchMock);

        render(
            <ConversationSidebar
                isOpen={true}
                isCollapsed={true}
                onClose={() => {}}
                onToggleCollapse={() => {}}
                onSelectConversation={() => {}}
                onNewConversation={() => {}}
                userId="user@example.com"
            />,
        );

        await screen.findByText('Conversation 30');
        fireEvent.click(screen.getByRole('button', { name: 'Cargar mas' }));

        await waitFor(() => {
            expect(screen.getByText('Conversation 31')).toBeInTheDocument();
        });

        expect(fetchMock).toHaveBeenCalledTimes(2);
        expect(screen.getAllByText('Conversation 30')).toHaveLength(1);
        expect(screen.getAllByText('Conversation 31')).toHaveLength(1);
    });
});
