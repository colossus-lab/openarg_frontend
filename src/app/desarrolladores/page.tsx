'use client';

import { useCallback, useEffect, useState } from 'react';
import TopbarEditorial from '@/components/landing-ed/TopbarEditorial';
import Colophon from '@/components/landing-ed/Colophon';
import ConfirmDialog from '@/components/ConfirmDialog';

/*
 * Clave de la API pública y del MCP (mcp.openarg.org). Hasta ahora la clave
 * sólo se podía sacar desde el menú de usuario del chat; ésta es la página a
 * la que se manda a la gente desde la web del MCP. Usa los mismos proxies que
 * el menú (`/api/developers/*`).
 */

const MCP_URL = 'https://mcp.openarg.org/mcp';
const DOCS_URL = 'https://mcp.openarg.org/empezar.html';

interface ApiKeyInfo {
    id: string;
    key_prefix: string;
    is_active: boolean;
    created_at: string | null;
    last_used_at: string | null;
}

interface Usage {
    requests_today: number;
    total_requests: number;
    limit_day?: number;
}

type Confirm = null | 'regenerate' | 'revoke';

function formatDate(iso: string | null): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' });
}

function CopyButton({ text }: { text: string }) {
    const [copied, setCopied] = useState(false);
    return (
        <button
            type="button"
            className="ed-dev-copy"
            onClick={async () => {
                try {
                    await navigator.clipboard.writeText(text);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1800);
                } catch {
                    /* el usuario puede seleccionar y copiar a mano */
                }
            }}
        >
            {copied ? 'Copiada' : 'Copiar'}
        </button>
    );
}

export default function DesarrolladoresPage() {
    const [key, setKey] = useState<ApiKeyInfo | null>(null);
    const [usage, setUsage] = useState<Usage | null>(null);
    const [newKey, setNewKey] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [confirm, setConfirm] = useState<Confirm>(null);

    const load = useCallback(async () => {
        try {
            const [keysRes, usageRes] = await Promise.all([
                fetch('/api/developers/keys'),
                fetch('/api/developers/usage'),
            ]);
            const keys: ApiKeyInfo[] = keysRes.ok ? await keysRes.json() : [];
            setKey(keys.find((k) => k.is_active) ?? null);
            setUsage(usageRes.ok ? await usageRes.json() : null);
        } catch {
            setError('No pudimos cargar tu clave. Recargá la página.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const create = async () => {
        setBusy(true);
        setError(null);
        try {
            const res = await fetch('/api/developers/keys', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: 'MCP / API pública' }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                setError(
                    res.status === 429
                        ? 'Generaste varias claves seguidas. Esperá un rato y volvé a intentar.'
                        : 'No pudimos crear la clave. Intentá de nuevo.',
                );
                return;
            }
            setNewKey(data.key);
            await load();
        } catch {
            setError('No pudimos crear la clave. Intentá de nuevo.');
        } finally {
            setBusy(false);
            setConfirm(null);
        }
    };

    const revoke = async () => {
        if (!key) return;
        setBusy(true);
        setError(null);
        try {
            const res = await fetch(`/api/developers/keys/${key.id}`, { method: 'DELETE' });
            if (!res.ok) {
                setError('No pudimos revocar la clave. Intentá de nuevo.');
                return;
            }
            setNewKey(null);
            await load();
        } catch {
            setError('No pudimos revocar la clave. Intentá de nuevo.');
        } finally {
            setBusy(false);
            setConfirm(null);
        }
    };

    const limit = usage?.limit_day ?? 10;
    const shownKey = newKey ?? 'oarg_sk_TU_CLAVE';
    const claudeCode = `claude mcp add --transport http openarg ${MCP_URL} \\\n  --header "Authorization: Bearer ${shownKey}"`;

    return (
        <main className="ed-page">
            <TopbarEditorial />

            <section className="ed-cf-hero">
                <div className="ed-container">
                    <p className="ed-eyebrow">
                        <span className="ed-eyebrow-num">Desarrolladores</span>
                    </p>
                    <h1 className="ed-display" style={{ marginTop: '1rem', fontSize: 'clamp(2.2rem, 5vw, 3.6rem)' }}>
                        Tu clave de OpenArg
                    </h1>
                    <p className="ed-lead" style={{ marginTop: '1.25rem' }}>
                        Con esta clave conectás OpenArg a tu asistente de IA por MCP, o consultás la API
                        pública. Es gratis: {limit} preguntas por día.
                    </p>
                </div>
            </section>

            <section className="ed-section">
                <div className="ed-container ed-dev">
                    {error && (
                        <p className="ed-dev-error" role="alert">
                            {error}
                        </p>
                    )}

                    {loading ? (
                        <p className="ed-lead">Cargando…</p>
                    ) : newKey ? (
                        <div className="ed-dev-card ed-dev-card--new">
                            <h2 className="ed-dev-title">Tu clave nueva</h2>
                            <p className="ed-dev-warning">
                                Copiala ahora: es la única vez que se muestra. Si la perdés, generá otra.
                            </p>
                            <div className="ed-dev-key">
                                <code>{newKey}</code>
                                <CopyButton text={newKey} />
                            </div>
                        </div>
                    ) : null}

                    {!loading && key && (
                        <div className="ed-dev-card">
                            <div className="ed-dev-row">
                                <div>
                                    <span className="ed-dev-label">Clave activa</span>
                                    <code className="ed-dev-prefix">{key.key_prefix}…</code>
                                </div>
                                <div>
                                    <span className="ed-dev-label">Creada</span>
                                    {formatDate(key.created_at)}
                                </div>
                                <div>
                                    <span className="ed-dev-label">Último uso</span>
                                    {formatDate(key.last_used_at)}
                                </div>
                                <div>
                                    <span className="ed-dev-label">Hoy</span>
                                    {usage ? `${usage.requests_today} de ${limit} preguntas` : '—'}
                                </div>
                            </div>
                            <p className="ed-dev-hint">El cupo se renueva todos los días a las 21:00.</p>
                            <div className="ed-dev-actions">
                                <button type="button" className="ed-dev-btn" disabled={busy} onClick={() => setConfirm('regenerate')}>
                                    Generar una nueva
                                </button>
                                <button type="button" className="ed-dev-btn ed-dev-btn--danger" disabled={busy} onClick={() => setConfirm('revoke')}>
                                    Revocar
                                </button>
                            </div>
                        </div>
                    )}

                    {!loading && !key && !newKey && (
                        <div className="ed-dev-card">
                            <p style={{ marginTop: 0 }}>Todavía no tenés una clave.</p>
                            <button type="button" className="ed-dev-btn ed-dev-btn--primary" disabled={busy} onClick={create}>
                                {busy ? 'Creando…' : 'Crear clave'}
                            </button>
                        </div>
                    )}

                    <h2 className="ed-section-title" style={{ marginTop: '3.5rem' }}>
                        Conectala a tu asistente
                    </h2>
                    <p className="ed-lead">
                        En Claude Code, con un solo comando{newKey ? ' (ya tiene tu clave)' : ''}:
                    </p>
                    <div className="ed-dev-code">
                        <pre>
                            <code>{claudeCode}</code>
                        </pre>
                        <CopyButton text={claudeCode.replace('\\\n  ', '')} />
                    </div>
                    <p className="ed-lead">
                        Claude Desktop, Cursor y VS Code, paso a paso, en{' '}
                        <a href={DOCS_URL}>mcp.openarg.org</a>.
                    </p>

                    <h2 className="ed-section-title" style={{ marginTop: '3.5rem' }}>
                        Cuidala
                    </h2>
                    <ul className="ed-dev-list">
                        <li>Es personal: no la subas a un repositorio ni la pegues en un chat.</li>
                        <li>Tenés una sola activa. Generar una nueva revoca la anterior al instante.</li>
                        <li>
                            Guardamos el texto de las preguntas que hacés con ella.{' '}
                            <a href="https://mcp.openarg.org/limites.html">Qué se guarda y límites</a>.
                        </li>
                    </ul>
                </div>
            </section>

            <Colophon />

            <ConfirmDialog
                open={confirm !== null}
                title={confirm === 'revoke' ? 'Revocar la clave' : 'Generar una clave nueva'}
                message={
                    confirm === 'revoke'
                        ? 'La clave deja de funcionar ahora mismo en todos los clientes donde la configuraste.'
                        : 'La clave actual deja de funcionar ahora mismo. Vas a tener que actualizarla en tus clientes.'
                }
                confirmLabel={confirm === 'revoke' ? 'Revocar' : 'Generar nueva'}
                cancelLabel="Cancelar"
                loading={busy}
                onConfirm={confirm === 'revoke' ? revoke : create}
                onCancel={() => setConfirm(null)}
            />
        </main>
    );
}
