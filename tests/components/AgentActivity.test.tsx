import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';

import AgentActivity, { appendStep } from '@/components/chat/AgentActivity';
import messages from '../../messages/es.json';

function renderWithIntl(ui: React.ReactElement) {
    return render(
        <NextIntlClientProvider locale="es" messages={messages}>
            {ui}
        </NextIntlClientProvider>,
    );
}

const STEPS = [
    'Pensando…',
    'Buscando «discapacidad Pinamar» en el catálogo',
    'Encontró 8 datasets y 2 tablas curadas',
    'Revisó «Estudio Nacional sobre el Perfil de las Personas con Discapacidad» (82.327 filas)',
    'Escribiendo la respuesta…',
];

describe('AgentActivity', () => {
    afterEach(() => {
        cleanup();
    });

    it('mientras trabaja muestra el paso actual, no la lista', () => {
        const { getByText, queryByText } = renderWithIntl(
            <AgentActivity live steps={STEPS} startedAt={Date.now() - 5000} />,
        );
        expect(getByText('Escribiendo la respuesta…')).toBeInTheDocument();
        expect(queryByText('Encontró 8 datasets y 2 tablas curadas')).not.toBeInTheDocument();
    });

    it('al desplegar muestra los pasos ya hechos', () => {
        const { getByRole, getByText } = renderWithIntl(
            <AgentActivity live steps={STEPS} startedAt={Date.now()} />,
        );
        fireEvent.click(getByRole('button'));
        expect(getByText('Encontró 8 datasets y 2 tablas curadas')).toBeInTheDocument();
    });

    it('terminado, resume duración y cantidad de pasos', () => {
        const { getByText } = renderWithIntl(<AgentActivity steps={STEPS} durationMs={12_400} />);
        expect(getByText('Pensó durante 12 s · 5 pasos')).toBeInTheDocument();
    });

    it('sin duración guardada (mensajes viejos) muestra sólo los pasos', () => {
        const { getByText } = renderWithIntl(<AgentActivity steps={['Pensando…']} />);
        expect(getByText('1 paso')).toBeInTheDocument();
    });

    it('sin pasos y terminado no muestra nada', () => {
        const { container } = renderWithIntl(<AgentActivity steps={[]} />);
        expect(container).toBeEmptyDOMElement();
    });

    it('apenas mandada la pregunta, sin pasos todavía, dice que está trabajando', () => {
        const { getByText } = renderWithIntl(<AgentActivity live steps={[]} startedAt={Date.now()} />);
        expect(getByText('Trabajando…')).toBeInTheDocument();
    });
});

describe('appendStep', () => {
    it('no repite el último paso ni agrega vacíos', () => {
        let steps: string[] = [];
        steps = appendStep(steps, 'Pensando…');
        steps = appendStep(steps, 'Pensando…');
        steps = appendStep(steps, '  ');
        steps = appendStep(steps, 'Buscando «X»');
        steps = appendStep(steps, 'Pensando…');
        expect(steps).toEqual(['Pensando…', 'Buscando «X»', 'Pensando…']);
    });
});
