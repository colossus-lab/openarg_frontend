import type { SourceAttribution } from '@/lib/types';

export type ConfidenceTone = 'high' | 'medium' | 'low';

export function getConfidenceTone(confidence?: number): ConfidenceTone | null {
    if (typeof confidence !== 'number' || Number.isNaN(confidence)) {
        return null;
    }
    if (confidence >= 0.8) return 'high';
    if (confidence >= 0.55) return 'medium';
    return 'low';
}

export function getConfidenceLabelKey(confidence?: number): string | null {
    const tone = getConfidenceTone(confidence);
    if (!tone) return null;
    return `confidence${tone[0].toUpperCase()}${tone.slice(1)}`;
}

export function summarizeSources(sources?: SourceAttribution[]): {
    sourceCount: number;
    portalCount: number;
} {
    const list = sources || [];
    return {
        sourceCount: list.length,
        portalCount: new Set(list.map((source) => source.portal).filter(Boolean)).size,
    };
}
