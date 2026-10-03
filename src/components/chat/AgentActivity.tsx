'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

interface Props {
    /** Los pasos en orden, tal como llegaron ("Pensando…", "Buscando «X»…"). */
    steps: string[];
    /** Todavía está trabajando: muestra el paso actual animado. */
    live?: boolean;
    /** Cuándo empezó el turno (ms, Date.now()), para el contador en vivo. */
    startedAt?: number | null;
    /** Cuánto tardó en total, para el resumen de un mensaje terminado. */
    durationMs?: number | null;
}

/**
 * Lo que hizo el asistente para responder, como en los asistentes conocidos.
 *
 * Mientras trabaja: una línea con el paso actual ("Buscando «X» en el
 * catálogo…") y un contador de segundos; los pasos anteriores se pueden
 * desplegar. Al terminar: "Pensó durante 12 s · 6 pasos", plegado arriba de
 * la respuesta.
 *
 * Reemplaza a la barra de cuatro agentes (Estratega, Investigador, Analista,
 * Redactor), que describía el pipeline viejo: el agente actual es uno solo
 * que busca, mira las tablas y calcula.
 */
export default function AgentActivity({ steps, live = false, startedAt, durationMs }: Props) {
    const t = useTranslations('activity');
    const [open, setOpen] = useState(false);
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        if (!live || !startedAt) return;
        const id = window.setInterval(() => setNow(Date.now()), 1000);
        return () => window.clearInterval(id);
    }, [live, startedAt]);

    if (steps.length === 0 && !live) return null;

    const current = steps[steps.length - 1] ?? t('working');
    const done = live ? steps.slice(0, -1) : steps;
    const seconds = live
        ? startedAt
            ? Math.max(0, Math.round((now - startedAt) / 1000))
            : null
        : durationMs
          ? Math.max(1, Math.round(durationMs / 1000))
          : null;
    const stepCount = t('steps', { count: steps.length });

    return (
        <div className={`agent-activity${live ? ' live' : ''}`}>
            <button
                type="button"
                className="agent-activity-header"
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
                disabled={done.length === 0}
            >
                {live ? (
                    <>
                        <span className="agent-activity-current" aria-live="polite">
                            {current}
                        </span>
                        {seconds !== null && <span className="agent-activity-time">{seconds} s</span>}
                    </>
                ) : (
                    <span className="agent-activity-summary">
                        {seconds !== null ? `${t('thoughtFor', { seconds })} · ${stepCount}` : stepCount}
                    </span>
                )}
                {done.length > 0 && (
                    <svg
                        className={`agent-activity-chevron${open ? ' open' : ''}`}
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                    >
                        <polyline points="9 18 15 12 9 6" />
                    </svg>
                )}
            </button>
            {open && done.length > 0 && (
                <ol className="agent-activity-steps">
                    {done.map((step, i) => (
                        <li key={`${i}-${step}`}>{step}</li>
                    ))}
                </ol>
            )}
        </div>
    );
}

/** Agrega un paso a la lista si no repite el último. */
export function appendStep(steps: string[], text: string): string[] {
    const clean = text.trim();
    if (!clean || steps[steps.length - 1] === clean) return steps;
    return [...steps, clean];
}
