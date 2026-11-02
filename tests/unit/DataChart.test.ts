import { describe, expect, it } from 'vitest';

import { formatXAxisTick } from '@/components/DataChart';

describe('formatXAxisTick', () => {
    it.each([
        ['1er. semestre 2026', '1S 2026'],
        ['2do. semestre 2016', '2S 2016'],
        ['1er semestre 2020', '1S 2020'],
        ['1° semestre 2026*', '1S 2026'],
    ])('shortens %s without losing the year', (label, tick) => {
        expect(formatXAxisTick(label)).toBe(tick);
    });

    it('keeps the month of an ISO date', () => {
        expect(formatXAxisTick('2024-03-01T00:00:00')).toBe('2024-03');
    });

    it('leaves short values alone', () => {
        expect(formatXAxisTick('2024-03')).toBe('2024-03');
        expect(formatXAxisTick(2024)).toBe(2024);
    });
});
