import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';

import ChatComposer from '@/components/chat/ChatComposer';
import messages from '../../messages/es.json';

function renderWithIntl(ui: React.ReactElement) {
    return render(
        <NextIntlClientProvider locale="es" messages={messages}>
            {ui}
        </NextIntlClientProvider>,
    );
}

describe('ChatComposer', () => {
    it('renders visible keyboard shortcut hints', () => {
        const { getByText } = renderWithIntl(
            <ChatComposer
                input=""
                isDesktop
                isLoading={false}
                deepMode={false}
                hasAssistantMessages={false}
                agentPipeline={[]}
                currentPhase={null}
                completedPhases={new Set()}
                phaseOrder={[]}
                thinking=""
                onInputChange={vi.fn()}
                onInputKeyDown={vi.fn()}
                onDeepToggle={vi.fn()}
                onShare={vi.fn()}
                onSend={vi.fn()}
                textareaRef={{ current: null }}
            />,
        );

        expect(getByText('Enter para enviar')).toBeInTheDocument();
        expect(getByText('Shift+Enter para nueva línea')).toBeInTheDocument();
        expect(getByText('Ctrl/Cmd+K para nueva conversación')).toBeInTheDocument();
    });
});
