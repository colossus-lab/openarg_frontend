// ============================================================
// Cupo mensual del chat web (backend PR #121).
//
// 30 preguntas por mes (Fundador 100); cuando se terminan se usan los
// créditos, que son la misma bolsa que el MCP. Sólo descuentan las
// respuestas completas. El backend manda el estado en cada `complete`
// (`quota`) y, si no queda nada, rechaza la pregunta con un error que
// trae `code`. Acá se traduce eso a dos eventos para el navegador:
// `quota` (actualiza el indicador) y `quota_exhausted` (el aviso).
// ============================================================

import type { SendFn } from './types';

export interface WebQuota {
    usadas: number;
    limite: number;
    restantes: number;
    creditos: number;
    /** ISO del momento en que se renueva el mes (1° a las 00:00 UTC). */
    renueva: string;
    fundador: { hasta: string | null } | null;
}

export interface QuotaRejection {
    code: string;
    message: string;
    quota?: WebQuota;
}

/** Códigos con los que el backend rechaza una pregunta por cupo. */
export const QUOTA_REJECTION_CODES = new Set(['QUOTA_EXHAUSTED', 'WEB_DAILY_CAP']);

function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isWebQuota(value: unknown): value is WebQuota {
    return (
        isObject(value) &&
        typeof value.usadas === 'number' &&
        typeof value.limite === 'number' &&
        typeof value.restantes === 'number' &&
        typeof value.creditos === 'number' &&
        typeof value.renueva === 'string'
    );
}

export function isQuotaRejection(value: unknown): value is QuotaRejection {
    return (
        isObject(value) &&
        typeof value.code === 'string' &&
        QUOTA_REJECTION_CODES.has(value.code) &&
        typeof value.message === 'string'
    );
}

/** El aviso de cupo: se muestra como respuesta (no como error) y actualiza
 *  el indicador. */
export function emitQuotaRejection(rejection: QuotaRejection, send: SendFn): void {
    send({
        type: 'quota_exhausted',
        data: { code: rejection.code, message: rejection.message, quota: rejection.quota ?? null },
    });
    send({ type: 'content', data: rejection.message });
}

/** Si quedan preguntas para mandar (del mes o con créditos). */
export function canAsk(quota: WebQuota | null): boolean {
    return quota === null || quota.restantes > 0 || quota.creditos > 0;
}
