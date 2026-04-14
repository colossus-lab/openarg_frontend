import { describe, expect, it } from 'vitest';

import {
    getConfidenceLabelKey,
    getConfidenceTone,
    summarizeSources,
} from '@/lib/chat/resultQuality';

describe('resultQuality', () => {
    it('classifies confidence into high, medium and low bands', () => {
        expect(getConfidenceTone(0.91)).toBe('high');
        expect(getConfidenceTone(0.7)).toBe('medium');
        expect(getConfidenceTone(0.2)).toBe('low');
        expect(getConfidenceTone(undefined)).toBeNull();
    });

    it('returns the translation key for the confidence label', () => {
        expect(getConfidenceLabelKey(0.91)).toBe('confidenceHigh');
        expect(getConfidenceLabelKey(0.7)).toBe('confidenceMedium');
        expect(getConfidenceLabelKey(0.2)).toBe('confidenceLow');
    });

    it('summarizes source and portal counts', () => {
        expect(
            summarizeSources([
                { name: 'A', url: 'https://a', portal: 'Portal A', accessedAt: '2026-04-12' },
                { name: 'B', url: 'https://b', portal: 'Portal A', accessedAt: '2026-04-12' },
                { name: 'C', url: 'https://c', portal: 'Portal B', accessedAt: '2026-04-12' },
            ]),
        ).toEqual({
            sourceCount: 3,
            portalCount: 2,
        });
    });
});
