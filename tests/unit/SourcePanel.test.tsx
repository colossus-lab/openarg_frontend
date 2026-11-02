import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import SourcePanel from '@/components/SourcePanel';

vi.mock('next-intl', () => ({
    useTranslations: () => (key: string) => key,
}));

afterEach(cleanup);

function abrir(url: string) {
    render(<SourcePanel sources={[{ name: 'Pobreza', url, portal: 'INDEC', accessedAt: 'x' }]} />);
    fireEvent.click(screen.getByRole('button'));
}

describe('SourcePanel', () => {
    it('links a source with a url', () => {
        abrir('https://www.indec.gob.ar/ftp/cuadros/sociedad/cuadros_informe_pobreza_09_26.xls');
        const link = screen.getByRole('link', { name: 'Pobreza' });
        expect(link.getAttribute('href')).toContain('cuadros_informe_pobreza_09_26.xls');
    });

    it('shows a source with no url as plain text', () => {
        abrir('');
        expect(screen.getByText('Pobreza')).toBeTruthy();
        expect(screen.queryByRole('link')).toBeNull();
    });
});
