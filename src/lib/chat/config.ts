function parsePositiveInteger(raw: string | undefined, fallback: number): number {
    if (!raw) return fallback;
    const parsed = Number.parseInt(raw, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
    return parsed;
}

export const CHAT_MIN_DISPLAY_MS = parsePositiveInteger(
    process.env.NEXT_PUBLIC_CHAT_MIN_DISPLAY_MS,
    2000,
);

