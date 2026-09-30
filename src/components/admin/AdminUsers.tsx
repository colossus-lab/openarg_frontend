'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

/*
 * Todas las personas con clave de la API (la misma sirve para el MCP), la
 * hayan usado o no. "Claves que más usan" del tablero sólo muestra el uso del
 * período; esta lista parte de las claves, así aparece quien la sacó y nunca
 * la probó. El último uso sale del registro de pedidos.
 */

export interface UserRow {
    email: string;
    nombre: string | null;
    key_prefix: string;
    activa: boolean;
    claves: number;
    alta: string | null;
    ultimo_uso: string | null;
    datos_mes: number;
    preguntas_mes: number;
    pedidos_total: number;
    rechazos_total: number;
    fundador_hasta: string | null;
    fundador: boolean;
    creditos_preguntas: number;
    creditos_datos: number;
}

export type Filtro = 'todas' | 'este_mes' | 'nunca' | 'fundadores';

const FILTROS: { id: Filtro; label: string }[] = [
    { id: 'todas', label: 'Todas' },
    { id: 'este_mes', label: 'Usaron este mes' },
    { id: 'nunca', label: 'Nunca la usaron' },
    { id: 'fundadores', label: 'Fundadores' },
];

const nf = new Intl.NumberFormat('es-AR');

function fecha(iso: string | null): string {
    if (!iso) return '—';
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

export function filtrarUsuarios(rows: UserRow[], filtro: Filtro, texto: string): UserRow[] {
    const q = texto.trim().toLowerCase();
    return rows.filter((r) => {
        if (filtro === 'este_mes' && r.datos_mes + r.preguntas_mes === 0) return false;
        if (filtro === 'nunca' && r.ultimo_uso) return false;
        if (filtro === 'fundadores' && !r.fundador) return false;
        if (!q) return true;
        return r.email.toLowerCase().includes(q) || (r.nombre || '').toLowerCase().includes(q) || r.key_prefix.toLowerCase().includes(q);
    });
}

export default function AdminUsers() {
    const [rows, setRows] = useState<UserRow[] | null>(null);
    const [error, setError] = useState('');
    const [filtro, setFiltro] = useState<Filtro>('todas');
    const [texto, setTexto] = useState('');

    const load = useCallback(async () => {
        setError('');
        const res = await fetch('/api/admin/mcp/users?days=30', { cache: 'no-store' });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
            setError(body?.error || `Error ${res.status}`);
            return;
        }
        setRows(body as UserRow[]);
    }, []);

    useEffect(() => {
        void load();
    }, [load]);

    const visibles = useMemo(() => filtrarUsuarios(rows || [], filtro, texto), [rows, filtro, texto]);
    const resumen = useMemo(() => {
        const all = rows || [];
        return {
            total: all.length,
            activas: all.filter((r) => r.activa).length,
            alguna: all.filter((r) => r.ultimo_uso).length,
            mes: all.filter((r) => r.datos_mes + r.preguntas_mes > 0).length,
            fundadores: all.filter((r) => r.fundador).length,
        };
    }, [rows]);

    return (
        <div className="ed-admin" id="usuarios">
            <h2 className="ed-admin-h2">Usuarios con clave</h2>
            {rows && (
                <p className="ed-dev-hint">
                    {nf.format(resumen.total)} personas · {nf.format(resumen.activas)} con clave activa · {nf.format(resumen.alguna)} la usaron alguna
                    vez · {nf.format(resumen.mes)} este mes · {nf.format(resumen.fundadores)} Fundadores. La misma clave sirve para la API y el MCP.
                </p>
            )}
            {error && <p className="ed-dev-error" role="alert">{error}</p>}

            <div className="ed-admin-toolbar" style={{ marginTop: '1rem' }}>
                <div className="ed-admin-periods" role="group" aria-label="Filtro de usuarios">
                    {FILTROS.map((f) => (
                        <button
                            key={f.id}
                            type="button"
                            className={`ed-admin-period${f.id === filtro ? ' is-active' : ''}`}
                            aria-pressed={f.id === filtro}
                            onClick={() => setFiltro(f.id)}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>
                <input
                    type="search"
                    className="ed-admin-search"
                    placeholder="Buscar por mail, nombre o clave"
                    aria-label="Buscar usuario"
                    value={texto}
                    onChange={(e) => setTexto(e.target.value)}
                />
            </div>

            <div className="ed-admin-table-wrap">
                <table className="ed-admin-table">
                    <thead>
                        <tr>
                            <th>Mail</th>
                            <th>Clave</th>
                            <th>Alta</th>
                            <th>Último uso</th>
                            <th>Este mes</th>
                            <th>Total</th>
                            <th>Fundador</th>
                            <th>Créditos</th>
                        </tr>
                    </thead>
                    <tbody>
                        {!rows && !error && (
                            <tr><td colSpan={8} className="ed-admin-empty">Cargando…</td></tr>
                        )}
                        {rows && visibles.length === 0 && (
                            <tr><td colSpan={8} className="ed-admin-empty">Nadie con ese filtro.</td></tr>
                        )}
                        {visibles.map((r) => (
                            <tr key={r.email}>
                                <td>
                                    {r.email}
                                    {r.nombre && <span className="ed-admin-sub">{r.nombre}</span>}
                                </td>
                                <td>
                                    <code>{r.key_prefix}…</code>
                                    {!r.activa && <span className="ed-admin-tag">revocada</span>}
                                    {r.claves > 1 && <span className="ed-admin-sub">{r.claves} claves en total</span>}
                                </td>
                                <td>{fecha(r.alta)}</td>
                                <td>{r.ultimo_uso ? fecha(r.ultimo_uso) : <span className="ed-admin-empty">nunca</span>}</td>
                                <td>
                                    {nf.format(r.datos_mes)} datos · {nf.format(r.preguntas_mes)} preg.
                                </td>
                                <td>
                                    {nf.format(r.pedidos_total)}
                                    {r.rechazos_total > 0 && <span className="ed-admin-sub">{nf.format(r.rechazos_total)} rechazos</span>}
                                </td>
                                <td>{r.fundador ? `hasta ${fecha(r.fundador_hasta)}` : '—'}</td>
                                <td>
                                    {r.creditos_preguntas + r.creditos_datos > 0
                                        ? `${nf.format(r.creditos_preguntas)} preg. · ${nf.format(r.creditos_datos)} datos`
                                        : '—'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <p className="ed-dev-hint">
                &ldquo;Este mes&rdquo; cuenta el mes UTC, que es el período del cupo. &ldquo;Total&rdquo; son los pedidos ejecutados desde
                que hay registro; los de antes de la migración 0062 son sólo preguntas.
            </p>
        </div>
    );
}
