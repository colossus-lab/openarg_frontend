'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
    Bar,
    CartesianGrid,
    ComposedChart,
    Legend,
    Line,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';

/*
 * Tablero de uso del MCP. Lee /api/admin/mcp/{overview,timeline,breakdown,
 * keys,questions}, que el proxy reenvía al backend con la clave de admin.
 */

type Period = 7 | 30 | 90;
const PERIODS: Period[] = [7, 30, 90];

interface Overview {
    adopcion: {
        claves_total: number;
        claves_nuevas: number;
        activas_1d: number;
        activas_7d: number;
        activas_30d: number;
        claves_recurrentes: number;
    };
    uso: { pedidos_datos: number; preguntas: number; preguntas_ok: number; claves_activas: number; tokens: number };
    salud: {
        errores: number;
        rechazos: number;
        p50_datos_ms: number | null;
        p95_datos_ms: number | null;
        p50_respuestas_ms: number | null;
        p95_respuestas_ms: number | null;
    };
    cupo_global_hoy: { usado: number; tope: number };
    costo: {
        estimado_usd: number;
        usd_por_respuesta: number;
        nota: string;
        // Desde backend #123: lo medido respuesta por respuesta, por modelo.
        medido_usd?: number;
        respuestas_medidas?: number;
        respuestas_estimadas?: number;
        por_modelo?: CostByModel[];
    };
}

interface CostByModel {
    modelo: string;
    respuestas: number;
    usd: number;
    usd_por_respuesta: number;
    medido: boolean;
}

function costHint(costo: Overview['costo']): string {
    const perAnswer = `US$ ${costo.usd_por_respuesta.toLocaleString('es-AR', { maximumFractionDigits: 3 })} por respuesta`;
    if (costo.respuestas_medidas === undefined) return `${perAnswer} · estimado`;
    const total = costo.respuestas_medidas + (costo.respuestas_estimadas ?? 0);
    if (total === 0) return perAnswer;
    return `${perAnswer} · medido en ${costo.respuestas_medidas} de ${total}`;
}

interface Day {
    dia: string;
    claves_nuevas: number;
    claves_activas: number;
    pedidos_datos: number;
    preguntas: number;
    rechazos: number;
    errores: number;
}

interface Breakdown {
    herramientas: {
        herramienta: string;
        modo: string;
        pedidos: number;
        errores: number;
        rechazos: number;
        p50_ms: number | null;
        p95_ms: number | null;
    }[];
    clientes: { cliente: string; pedidos: number; claves: number }[];
    vias: { via: string; pedidos: number }[];
}

interface KeyRow {
    email: string;
    key_prefix: string;
    activa: boolean;
    alta: string | null;
    ultimo_uso: string | null;
    pedidos_datos: number;
    preguntas: number;
    rechazos: number;
    dias_activos: number;
}

interface Questions {
    top: { pregunta: string; veces: number; respondidas: number; ultima: string }[];
    fallidas: { pregunta: string | null; estado: number; duration_ms: number; fecha: string; key_prefix: string }[];
}

interface Data {
    overview: Overview;
    timeline: Day[];
    breakdown: Breakdown;
    keys: KeyRow[];
    questions: Questions;
}

const nf = new Intl.NumberFormat('es-AR');
const usd = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });

export function formatMs(ms: number | null | undefined): string {
    if (ms === null || ms === undefined) return '—';
    return ms < 1000 ? `${Math.round(ms)} ms` : `${(ms / 1000).toLocaleString('es-AR', { maximumFractionDigits: 1 })} s`;
}

function formatDateTime(iso: string | null | undefined): string {
    if (!iso) return '—';
    const d = new Date(iso);
    return Number.isNaN(d.getTime())
        ? '—'
        : d.toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function shortDay(iso: string): string {
    const [, m, d] = iso.split('-');
    return `${d}/${m}`;
}

async function fetchView<T>(view: string, days: Period): Promise<T> {
    const res = await fetch(`/api/admin/mcp/${view}?days=${days}`, { cache: 'no-store' });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body?.error || `Error ${res.status}`);
    return body as T;
}

/** Colores del gráfico tomados del `.ed-page` (tema claro/oscuro). */
function useEdColors(ref: React.RefObject<HTMLDivElement | null>) {
    const [c, setC] = useState({ grid: 'rgba(232,236,244,.12)', axis: '#8892a8', a: '#74ACDF', b: '#F6B40E', warn: '#F87171', bg: '#0d1117', ink: '#e8ecf4' });
    useEffect(() => {
        const read = () => {
            const el = ref.current?.closest('.ed-page') || document.documentElement;
            const s = getComputedStyle(el);
            const v = (name: string, fallback: string) => s.getPropertyValue(name).trim() || fallback;
            setC({
                grid: v('--ed-rule', 'rgba(232,236,244,.12)'),
                axis: v('--ed-ink-2', '#8892a8'),
                a: v('--ed-cobalt', '#74ACDF'),
                b: v('--ed-vermilion', '#F6B40E'),
                warn: '#F87171',
                bg: v('--ed-paper-2', '#0d1117'),
                ink: v('--ed-ink', '#e8ecf4'),
            });
        };
        read();
        const obs = new MutationObserver(read);
        obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
        return () => obs.disconnect();
    }, [ref]);
    return c;
}

function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
    return (
        <div className="ed-admin-kpi">
            <span className="ed-dev-label">{label}</span>
            <span className="ed-admin-kpi-value">{value}</span>
            {hint && <span className="ed-admin-kpi-hint">{hint}</span>}
        </div>
    );
}

export default function AdminMcpDashboard() {
    const [days, setDays] = useState<Period>(30);
    const [data, setData] = useState<Data | null>(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);
    const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
    const chartRef = useRef<HTMLDivElement>(null);
    const colors = useEdColors(chartRef);

    const load = useCallback(async (period: Period) => {
        setLoading(true);
        setError('');
        try {
            const [overview, timeline, breakdown, keys, questions] = await Promise.all([
                fetchView<Overview>('overview', period),
                fetchView<Day[]>('timeline', period),
                fetchView<Breakdown>('breakdown', period),
                fetchView<KeyRow[]>('keys', period),
                fetchView<Questions>('questions', period),
            ]);
            setData({ overview, timeline, breakdown, keys, questions });
            setUpdatedAt(new Date());
        } catch (e) {
            setError(e instanceof Error ? e.message : 'No se pudieron cargar los datos');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void load(days);
    }, [days, load]);

    const o = data?.overview;
    const cupoPct = o ? Math.min(100, Math.round((o.cupo_global_hoy.usado / Math.max(1, o.cupo_global_hoy.tope)) * 100)) : 0;
    const empty = data && data.timeline.every((d) => d.pedidos_datos + d.preguntas + d.rechazos + d.errores === 0);

    return (
        <div className="ed-admin" ref={chartRef}>
            <div className="ed-admin-toolbar">
                <div className="ed-admin-periods" role="group" aria-label="Período">
                    {PERIODS.map((p) => (
                        <button
                            key={p}
                            type="button"
                            className={`ed-admin-period${p === days ? ' is-active' : ''}`}
                            aria-pressed={p === days}
                            onClick={() => setDays(p)}
                        >
                            {p} días
                        </button>
                    ))}
                </div>
                <div className="ed-admin-refresh">
                    {updatedAt && <span className="ed-dev-hint">Actualizado {updatedAt.toLocaleTimeString('es-AR')}</span>}
                    <button type="button" className="ed-dev-btn" disabled={loading} onClick={() => void load(days)}>
                        {loading ? 'Cargando…' : 'Actualizar'}
                    </button>
                </div>
            </div>

            {error && (
                <p className="ed-dev-error" role="alert">
                    {error}
                </p>
            )}

            {!data && loading && <p className="ed-lead">Cargando…</p>}

            {data && o && (
                <>
                    {empty && <p className="ed-dev-hint">Todavía no hay uso registrado en este período.</p>}

                    <h2 className="ed-admin-h2">Adopción</h2>
                    <div className="ed-admin-kpis">
                        <Kpi label="Claves activas" value={nf.format(o.adopcion.claves_total)} hint="en total" />
                        <Kpi label="Claves nuevas" value={nf.format(o.adopcion.claves_nuevas)} hint={`últimos ${days} días`} />
                        <Kpi label="Usaron hoy" value={nf.format(o.adopcion.activas_1d)} hint="últimas 24 h" />
                        <Kpi label="Usaron en 7 días" value={nf.format(o.adopcion.activas_7d)} />
                        <Kpi label="Usaron en 30 días" value={nf.format(o.adopcion.activas_30d)} />
                        <Kpi label="Volvieron" value={nf.format(o.adopcion.claves_recurrentes)} hint="usaron ≥ 2 días distintos" />
                    </div>

                    <h2 className="ed-admin-h2">Uso</h2>
                    <div className="ed-admin-kpis">
                        <Kpi label="Pedidos modo datos" value={nf.format(o.uso.pedidos_datos)} />
                        <Kpi label="Preguntas" value={nf.format(o.uso.preguntas)} hint={`${nf.format(o.uso.preguntas_ok)} respondidas`} />
                        <Kpi label="Claves con uso" value={nf.format(o.uso.claves_activas)} hint={`últimos ${days} días`} />
                        <Kpi label="Costo" value={usd.format(o.costo.estimado_usd)} hint={costHint(o.costo)} />
                    </div>
                    {o.costo.por_modelo && o.costo.por_modelo.length > 0 && (
                        <ul className="ed-dev-hint ed-admin-cost-models">
                            {o.costo.por_modelo.map((m) => (
                                <li key={m.modelo}>
                                    <strong>{m.modelo}</strong>: {nf.format(m.respuestas)} respuestas ·{' '}
                                    {usd.format(m.usd)} (US${' '}
                                    {m.usd_por_respuesta.toLocaleString('es-AR', { maximumFractionDigits: 3 })} c/u
                                    {m.medido ? '' : ', estimado'})
                                </li>
                            ))}
                        </ul>
                    )}

                    <div className="ed-admin-card">
                        <span className="ed-dev-label">Por día</span>
                        <ResponsiveContainer width="100%" height={280}>
                            <ComposedChart data={data.timeline} margin={{ top: 12, right: 8, left: -12, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
                                <XAxis dataKey="dia" tickFormatter={shortDay} stroke={colors.axis} fontSize={12} />
                                <YAxis stroke={colors.axis} fontSize={12} allowDecimals={false} />
                                <Tooltip
                                    labelFormatter={(l) => shortDay(String(l))}
                                    contentStyle={{ background: colors.bg, border: `1px solid ${colors.grid}`, color: colors.ink }}
                                />
                                <Legend />
                                <Bar isAnimationActive={false} dataKey="rechazos" name="Rechazos (cupo)" fill={colors.warn} opacity={0.7} />
                                <Line type="monotone" isAnimationActive={false} dataKey="pedidos_datos" name="Modo datos" stroke={colors.a} strokeWidth={2} dot={false} />
                                <Line type="monotone" isAnimationActive={false} dataKey="preguntas" name="Preguntas" stroke={colors.b} strokeWidth={2} dot={false} />
                                <Line type="monotone" isAnimationActive={false} dataKey="claves_activas" name="Claves activas" stroke={colors.axis} strokeDasharray="4 3" dot={false} />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>

                    <h2 className="ed-admin-h2">Salud</h2>
                    <div className="ed-admin-kpis">
                        <Kpi label="Errores" value={nf.format(o.salud.errores)} hint="5xx y timeouts" />
                        <Kpi label="Rechazos por cupo" value={nf.format(o.salud.rechazos)} hint="402 (cupo del mes), 429 y tope global" />
                        <Kpi label="Modo datos p50 / p95" value={`${formatMs(o.salud.p50_datos_ms)} / ${formatMs(o.salud.p95_datos_ms)}`} />
                        <Kpi label="Preguntas p50 / p95" value={`${formatMs(o.salud.p50_respuestas_ms)} / ${formatMs(o.salud.p95_respuestas_ms)}`} />
                        <div className="ed-admin-kpi">
                            <span className="ed-dev-label">Cupo global de hoy</span>
                            <span className="ed-admin-kpi-value">
                                {nf.format(o.cupo_global_hoy.usado)} <small>/ {nf.format(o.cupo_global_hoy.tope)}</small>
                            </span>
                            <span className="ed-admin-bar" aria-hidden="true">
                                <span style={{ width: `${cupoPct}%` }} className={cupoPct >= 80 ? 'is-hot' : ''} />
                            </span>
                        </div>
                    </div>

                    <h2 className="ed-admin-h2">Herramientas</h2>
                    <div className="ed-admin-table-wrap">
                        <table className="ed-admin-table">
                            <thead>
                                <tr><th>Herramienta</th><th>Modo</th><th>Pedidos</th><th>Errores</th><th>Rechazos</th><th>p50</th><th>p95</th></tr>
                            </thead>
                            <tbody>
                                {data.breakdown.herramientas.map((t) => (
                                    <tr key={`${t.herramienta}-${t.modo}`}>
                                        <td><code>{t.herramienta}</code></td>
                                        <td>{t.modo}</td>
                                        <td>{nf.format(t.pedidos)}</td>
                                        <td>{nf.format(t.errores)}</td>
                                        <td>{nf.format(t.rechazos)}</td>
                                        <td>{formatMs(t.p50_ms)}</td>
                                        <td>{formatMs(t.p95_ms)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="ed-admin-split">
                        <div>
                            <h2 className="ed-admin-h2">Clientes</h2>
                            <div className="ed-admin-table-wrap">
                                <table className="ed-admin-table">
                                    <thead><tr><th>Cliente</th><th>Pedidos</th><th>Claves</th></tr></thead>
                                    <tbody>
                                        {data.breakdown.clientes.map((c) => (
                                            <tr key={c.cliente}>
                                                <td>{c.cliente}</td>
                                                <td>{nf.format(c.pedidos)}</td>
                                                <td>{nf.format(c.claves)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        <div>
                            <h2 className="ed-admin-h2">Vía</h2>
                            <div className="ed-admin-table-wrap">
                                <table className="ed-admin-table">
                                    <thead><tr><th>Vía</th><th>Pedidos</th></tr></thead>
                                    <tbody>
                                        {data.breakdown.vias.map((v) => (
                                            <tr key={v.via}>
                                                <td>{v.via === 'mcp' ? 'MCP' : v.via === 'api' ? 'API directa' : v.via}</td>
                                                <td>{nf.format(v.pedidos)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <p className="ed-dev-hint">&ldquo;sin dato&rdquo; son pedidos anteriores al registro de vía y cliente.</p>
                        </div>
                    </div>

                    <h2 className="ed-admin-h2">Claves que más usan</h2>
                    <div className="ed-admin-table-wrap">
                        <table className="ed-admin-table">
                            <thead>
                                <tr><th>Mail</th><th>Clave</th><th>Alta</th><th>Último uso</th><th>Datos</th><th>Preguntas</th><th>Rechazos</th><th>Días</th></tr>
                            </thead>
                            <tbody>
                                {data.keys.length === 0 && (
                                    <tr><td colSpan={8} className="ed-admin-empty">Sin uso en el período.</td></tr>
                                )}
                                {data.keys.map((k) => (
                                    <tr key={k.key_prefix}>
                                        <td>{k.email}</td>
                                        <td><code>{k.key_prefix}…</code>{!k.activa && <span className="ed-admin-tag">revocada</span>}</td>
                                        <td>{formatDateTime(k.alta)}</td>
                                        <td>{formatDateTime(k.ultimo_uso)}</td>
                                        <td>{nf.format(k.pedidos_datos)}</td>
                                        <td>{nf.format(k.preguntas)}</td>
                                        <td>{nf.format(k.rechazos)}</td>
                                        <td>{nf.format(k.dias_activos)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="ed-admin-split">
                        <div>
                            <h2 className="ed-admin-h2">Preguntas más frecuentes</h2>
                            <div className="ed-admin-table-wrap">
                                <table className="ed-admin-table">
                                    <thead><tr><th>Pregunta</th><th>Veces</th><th>OK</th></tr></thead>
                                    <tbody>
                                        {data.questions.top.length === 0 && (
                                            <tr><td colSpan={3} className="ed-admin-empty">Sin preguntas en el período.</td></tr>
                                        )}
                                        {data.questions.top.map((q) => (
                                            <tr key={q.pregunta}>
                                                <td>{q.pregunta}</td>
                                                <td>{nf.format(q.veces)}</td>
                                                <td>{nf.format(q.respondidas)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        <div>
                            <h2 className="ed-admin-h2">Preguntas que fallaron</h2>
                            <div className="ed-admin-table-wrap">
                                <table className="ed-admin-table">
                                    <thead><tr><th>Pregunta</th><th>Estado</th><th>Cuándo</th></tr></thead>
                                    <tbody>
                                        {data.questions.fallidas.length === 0 && (
                                            <tr><td colSpan={3} className="ed-admin-empty">Ninguna.</td></tr>
                                        )}
                                        {data.questions.fallidas.map((q, i) => (
                                            <tr key={`${q.fecha}-${i}`}>
                                                <td>{q.pregunta || '—'}</td>
                                                <td>{q.estado}</td>
                                                <td>{formatDateTime(q.fecha)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                    <p className="ed-dev-hint">
                        Del modo datos no se guarda qué se buscó ni qué tabla se leyó: sólo la herramienta, el estado y la
                        duración. {o.costo.nota}
                    </p>
                </>
            )}
        </div>
    );
}
