import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';

import ChatQuota from '@/components/chat/ChatQuota';
import { canAsk, type WebQuota } from '@/lib/chat/quota';
import messages from '../../messages/es.json';

function renderQuota(quota: WebQuota | null) {
    return render(
        <NextIntlClientProvider locale="es" messages={messages}>
            <ChatQuota quota={quota} />
        </NextIntlClientProvider>,
    );
}

const BASE: WebQuota = {
    usadas: 3,
    limite: 30,
    restantes: 27,
    creditos: 0,
    renueva: '2026-11-01T00:00:00+00:00',
    fundador: null,
};

describe('ChatQuota', () => {
    afterEach(() => {
        cleanup();
    });

    it('muestra cuántas preguntas quedan en el mes', () => {
        const { getByText } = renderQuota(BASE);
        expect(getByText('Te quedan 27 de 30 preguntas este mes')).toBeInTheDocument();
    });

    it('suma los créditos cuando hay', () => {
        const { getByText } = renderQuota({ ...BASE, creditos: 5 });
        expect(getByText('Te quedan 27 de 30 preguntas este mes · 5 créditos')).toBeInTheDocument();
    });

    it('a un Fundador le muestra su cupo ampliado', () => {
        const { getByText } = renderQuota({ ...BASE, limite: 100, restantes: 87, fundador: { hasta: null } });
        expect(getByText('Fundador · te quedan 87 de 100 preguntas este mes')).toBeInTheDocument();
    });

    it('con el mes usado pero con créditos, avisa que está usando créditos', () => {
        const { getByText } = renderQuota({ ...BASE, usadas: 30, restantes: 0, creditos: 2 });
        expect(getByText('Usaste las 30 preguntas del mes · te quedan 2 créditos')).toBeInTheDocument();
    });

    it('sin cupo ni créditos explica cuándo se renueva y cómo conseguir más', () => {
        const { getByText, getByRole } = renderQuota({ ...BASE, usadas: 30, restantes: 0 });
        expect(getByText('Usaste tus 30 preguntas de este mes. Se renuevan el 1 de noviembre.')).toBeInTheDocument();
        expect(getByRole('link', { name: 'Apoyá OpenArg' })).toHaveAttribute(
            'href',
            'https://www.colossuslab.org/support',
        );
    });

    it('con pocas preguntas resalta el aviso', () => {
        const { container } = renderQuota({ ...BASE, usadas: 27, restantes: 3 });
        expect(container.querySelector('.chat-quota--low')).not.toBeNull();
    });

    it('sin datos del cupo no muestra nada', () => {
        const { container } = renderQuota(null);
        expect(container).toBeEmptyDOMElement();
    });
});

describe('canAsk', () => {
    it('bloquea sólo sin cupo y sin créditos', () => {
        expect(canAsk(null)).toBe(true);
        expect(canAsk(BASE)).toBe(true);
        expect(canAsk({ ...BASE, restantes: 0, creditos: 1 })).toBe(true);
        expect(canAsk({ ...BASE, restantes: 0, creditos: 0 })).toBe(false);
    });
});
