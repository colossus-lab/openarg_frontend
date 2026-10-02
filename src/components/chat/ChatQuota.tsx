'use client';

import { useTranslations } from 'next-intl';

import { canAsk, type WebQuota } from '@/lib/chat/quota';

export const SUPPORT_URL = 'https://www.colossuslab.org/support';

const LOW_THRESHOLD = 5;

interface Props {
    quota: WebQuota | null;
}

/** Fecha corta en castellano ("1 de noviembre") del momento en que se renueva. */
export function renewalDate(iso: string): string {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'long', timeZone: 'UTC' }).format(date);
}

/**
 * Cuántas preguntas le quedan a la persona este mes en el chat web, y sus
 * créditos. Va debajo del cuadro de texto. Sin cupo ni créditos, explica
 * cuándo se renueva y cómo conseguir más.
 */
export default function ChatQuota({ quota }: Props) {
    const t = useTranslations('quota');
    if (!quota) return null;

    const renueva = renewalDate(quota.renueva);
    const blocked = !canAsk(quota);
    const low = !blocked && quota.restantes <= LOW_THRESHOLD && quota.creditos === 0;

    let text: string;
    if (blocked) {
        text = t('exhausted', { limit: quota.limite, date: renueva });
    } else if (quota.restantes === 0) {
        text = t('usingCredits', { limit: quota.limite, credits: quota.creditos });
    } else {
        text = t(quota.fundador ? 'remainingFounder' : 'remaining', {
            remaining: quota.restantes,
            limit: quota.limite,
        });
        if (quota.creditos > 0) {
            text += ` · ${t('credits', { count: quota.creditos })}`;
        }
    }

    return (
        <div
            className={`chat-quota${blocked ? ' chat-quota--blocked' : ''}${low ? ' chat-quota--low' : ''}`}
            role={blocked ? 'status' : undefined}
        >
            <span>{text}</span>
            {(blocked || low) && !quota.fundador && (
                <>
                    {' '}
                    <a href={SUPPORT_URL} target="_blank" rel="noopener noreferrer">
                        {t('support')}
                    </a>
                </>
            )}
        </div>
    );
}
