'use client';

import { useCallback, useEffect, useState } from 'react';

/*
 * Fundadores y créditos de la API pública, en /admin/mcp. Reemplaza el script
 * manual de Tomi: marcar/quitar Fundadores y cargar créditos, cada cambio con
 * el mail de quien lo hizo (lo registra el backend).
 */

interface Fundador {
    email: string;
    desde: string | null;
    hasta: string | null;
    activo: boolean;
    origen: string | null;
    nota: string | null;
    creado_por: string | null;
    creditos: { preguntas: number; datos: number };
}

interface ConCreditos {
    email: string;
    preguntas: number;
    datos: number;
    actualizado: string | null;
}

interface Listado {
    fundadores: Fundador[];
    creditos: ConCreditos[];
}

function fecha(iso: string | null): string {
    if (!iso) return 'sin vencimiento';
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('es-AR', { timeZone: 'UTC' });
}

async function send(url: string, method: string, body?: unknown): Promise<string | null> {
    const res = await fetch(url, {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
    });
    if (res.ok) return null;
    const data = await res.json().catch(() => ({}));
    return data?.error || `Error ${res.status}`;
}

export default function AdminSupporters() {
    const [data, setData] = useState<Listado | null>(null);
    const [error, setError] = useState('');
    const [ok, setOk] = useState('');
    const [busy, setBusy] = useState(false);

    const [fEmail, setFEmail] = useState('');
    const [fHasta, setFHasta] = useState('');
    const [fOrigen, setFOrigen] = useState('');
    const [fNota, setFNota] = useState('');

    const [cEmail, setCEmail] = useState('');
    const [cPreguntas, setCPreguntas] = useState('0');
    const [cDatos, setCDatos] = useState('0');
    const [cMotivo, setCMotivo] = useState('admin');
    const [cReferencia, setCReferencia] = useState('');

    const load = useCallback(async () => {
        const res = await fetch('/api/admin/supporters', { cache: 'no-store' });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
            setError(body?.error || `Error ${res.status}`);
            return;
        }
        setData(body as Listado);
    }, []);

    useEffect(() => {
        void load();
    }, [load]);

    const run = async (action: () => Promise<string | null>, success: string) => {
        setBusy(true);
        setError('');
        setOk('');
        const err = await action();
        if (err) setError(err);
        else {
            setOk(success);
            await load();
        }
        setBusy(false);
        return !err;
    };

    const marcar = async (e: React.FormEvent) => {
        e.preventDefault();
        const done = await run(
            () => send('/api/admin/supporters', 'POST', { email: fEmail, hasta: fHasta || null, origen: fOrigen, nota: fNota }),
            `${fEmail} es Fundador${fHasta ? ` hasta el ${fecha(fHasta)}` : ''}.`,
        );
        if (done) {
            setFEmail('');
            setFHasta('');
            setFOrigen('');
            setFNota('');
        }
    };

    const quitar = async (email: string) => {
        if (!window.confirm(`¿Quitarle la marca de Fundador a ${email}?`)) return;
        await run(() => send(`/api/admin/supporters?email=${encodeURIComponent(email)}`, 'DELETE'), `${email} ya no es Fundador.`);
    };

    const cargar = async (e: React.FormEvent) => {
        e.preventDefault();
        const done = await run(
            () =>
                send('/api/admin/credits', 'POST', {
                    email: cEmail,
                    preguntas: Number(cPreguntas || 0),
                    datos: Number(cDatos || 0),
                    motivo: cMotivo,
                    referencia: cReferencia || null,
                }),
            `Créditos cargados a ${cEmail}.`,
        );
        if (done) {
            setCEmail('');
            setCPreguntas('0');
            setCDatos('0');
            setCReferencia('');
        }
    };

    return (
        <div className="ed-admin" id="fundadores">
            <h2 className="ed-admin-h2">Fundadores y créditos</h2>
            <p className="ed-dev-hint" style={{ marginTop: 0, marginBottom: '1rem' }}>
                Fundador: 2.000 consultas de datos y 100 preguntas por mes. Créditos: se usan cuando se termina el cupo
                del mes y no vencen.
            </p>

            {error && (
                <p className="ed-dev-error" role="alert">
                    {error}
                </p>
            )}
            {ok && (
                <p className="ed-dev-founder" role="status">
                    {ok}
                </p>
            )}

            <div className="ed-admin-table-wrap">
                <table className="ed-admin-table">
                    <thead>
                        <tr>
                            <th>Mail</th>
                            <th>Desde</th>
                            <th>Hasta</th>
                            <th>Origen</th>
                            <th>Créditos</th>
                            <th />
                        </tr>
                    </thead>
                    <tbody>
                        {!data && (
                            <tr>
                                <td colSpan={6} className="ed-admin-empty">
                                    Cargando…
                                </td>
                            </tr>
                        )}
                        {data && data.fundadores.length === 0 && (
                            <tr>
                                <td colSpan={6} className="ed-admin-empty">
                                    Todavía no hay Fundadores.
                                </td>
                            </tr>
                        )}
                        {data?.fundadores.map((f) => (
                            <tr key={f.email}>
                                <td>{f.email}</td>
                                <td>{fecha(f.desde)}</td>
                                <td>
                                    {fecha(f.hasta)}
                                    {!f.activo && <span className="ed-admin-tag">vencido</span>}
                                </td>
                                <td>{f.origen || '—'}</td>
                                <td>
                                    {f.creditos.preguntas} preg. · {f.creditos.datos} datos
                                </td>
                                <td>
                                    <button type="button" className="ed-dev-btn ed-dev-btn--danger" disabled={busy} onClick={() => quitar(f.email)}>
                                        Quitar
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {data && data.creditos.length > 0 && (
                <div className="ed-admin-table-wrap" style={{ marginTop: '1.25rem' }}>
                    <table className="ed-admin-table">
                        <thead>
                            <tr>
                                <th>Con créditos</th>
                                <th>Preguntas</th>
                                <th>Datos</th>
                                <th>Actualizado</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.creditos.map((c) => (
                                <tr key={c.email}>
                                    <td>{c.email}</td>
                                    <td>{c.preguntas}</td>
                                    <td>{c.datos}</td>
                                    <td>{fecha(c.actualizado)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <div className="ed-admin-split" style={{ marginTop: '1.5rem' }}>
                <form className="ed-admin-form" onSubmit={marcar} aria-label="Marcar Fundador">
                    <span className="ed-dev-label">Marcar Fundador</span>
                    <input type="email" required placeholder="mail de la cuenta" value={fEmail} onChange={(e) => setFEmail(e.target.value)} />
                    <label>
                        Hasta (vacío = sin vencimiento)
                        <input type="date" value={fHasta} onChange={(e) => setFHasta(e.target.value)} />
                    </label>
                    <input placeholder="origen (p. ej. Mercado Pago, cortesía)" maxLength={200} value={fOrigen} onChange={(e) => setFOrigen(e.target.value)} />
                    <input placeholder="nota (opcional)" maxLength={1000} value={fNota} onChange={(e) => setFNota(e.target.value)} />
                    <button type="submit" className="ed-dev-btn ed-dev-btn--primary" disabled={busy}>
                        Marcar Fundador
                    </button>
                </form>

                <form className="ed-admin-form" onSubmit={cargar} aria-label="Cargar créditos">
                    <span className="ed-dev-label">Cargar créditos</span>
                    <input type="email" required placeholder="mail de la cuenta" value={cEmail} onChange={(e) => setCEmail(e.target.value)} />
                    <div className="ed-admin-form-row">
                        <label>
                            Preguntas
                            <input type="number" min={0} value={cPreguntas} onChange={(e) => setCPreguntas(e.target.value)} />
                        </label>
                        <label>
                            Consultas de datos
                            <input type="number" min={0} value={cDatos} onChange={(e) => setCDatos(e.target.value)} />
                        </label>
                    </div>
                    <label>
                        Motivo
                        <select value={cMotivo} onChange={(e) => setCMotivo(e.target.value)}>
                            <option value="admin">Carga manual</option>
                            <option value="donacion">Donación</option>
                            <option value="ajuste">Ajuste</option>
                        </select>
                    </label>
                    <input
                        placeholder="referencia (p. ej. id del pago de Mercado Pago)"
                        maxLength={255}
                        value={cReferencia}
                        onChange={(e) => setCReferencia(e.target.value)}
                    />
                    <button type="submit" className="ed-dev-btn ed-dev-btn--primary" disabled={busy}>
                        Cargar créditos
                    </button>
                </form>
            </div>
        </div>
    );
}
