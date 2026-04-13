import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';

import ChatMessage from '@/components/ChatMessage';
import messages from '../../messages/es.json';

vi.mock('next-auth/react', () => ({
    useSession: () => ({
        data: {
            user: {
                name: 'Lucho Leonel',
                image: null,
            },
        },
    }),
}));

vi.mock('next/image', () => ({
    // eslint-disable-next-line @next/next/no-img-element
    default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => <img {...props} alt={props.alt || ''} />,
}));

afterEach(() => {
    cleanup();
});

function renderWithIntl(ui: React.ReactElement) {
    return render(
        <NextIntlClientProvider locale="es" messages={messages}>
            {ui}
        </NextIntlClientProvider>,
    );
}

describe('ChatMessage', () => {
    it('renders the confidence and source quality bar for assistant messages', () => {
        const { getByText } = renderWithIntl(
            <ChatMessage
                message={{
                    id: 'assistant-1',
                    role: 'assistant',
                    content: 'Respuesta de prueba',
                    timestamp: '2026-04-12T00:00:00Z',
                    confidence: 0.84,
                    sources: [
                        {
                            name: 'Fuente A',
                            url: 'https://a.test',
                            portal: 'Portal A',
                            accessedAt: '2026-04-12T00:00:00Z',
                        },
                        {
                            name: 'Fuente B',
                            url: 'https://b.test',
                            portal: 'Portal B',
                            accessedAt: '2026-04-12T00:00:00Z',
                        },
                    ],
                }}
            />,
        );

        expect(getByText('Confianza: alta')).toBeInTheDocument();
        expect(getByText('2 fuentes · 2 portales')).toBeInTheDocument();
    });

    it('renders the errored affordance and calls regenerate', () => {
        const onRegenerate = vi.fn();
        const { getByText, getByRole } = renderWithIntl(
            <ChatMessage
                message={{
                    id: 'assistant-2',
                    role: 'assistant',
                    content: 'Respuesta parcial',
                    timestamp: '2026-04-12T00:00:00Z',
                    errored: true,
                }}
                onRegenerate={onRegenerate}
            />,
        );

        expect(getByText('Esta respuesta no pudo completarse correctamente. Podés reintentarla.')).toBeInTheDocument();
        fireEvent.click(getByRole('button', { name: 'Reintentar esta pregunta' }));
        expect(onRegenerate).toHaveBeenCalledWith('assistant-2');
    });
});
