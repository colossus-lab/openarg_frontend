'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import UserMenu from '@/components/UserMenu';

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */
interface Dataset {
    id: string;
    title: string;
    description: string;
    organization: string;
    portal: string;
    format: string;
    is_cached: boolean;
    row_count: number | null;
}

interface PortalStat {
    portal: string;
    count: number;
}

interface PortalHealth {
    portal: string;
    dataset_count: number;
    avg_score: number;
    fresh_count: number;
    stale_count: number;
    abandoned_count: number;
    unknown_count: number;
}

interface DdjjAnomaly {
    nombre: string;
    cuit: string;
    anio_declaracion: string;
    patrimonio_cierre: number;
    bienes_inicio: number;
    bienes_cierre: number;
    ingresos_trabajo_neto: number;
    variacion_patrimonial: number;
    brecha_inexplicable: number;
    ratio_crecimiento: number;
    anomaly_type: string | null;
    severity: string | null;
}

interface DdjjSummary {
    total_analyzed: number;
    total_flagged: number;
    by_severity: Record<string, number>;
    by_type: Record<string, number>;
    anomalies: DdjjAnomaly[];
}

/* ------------------------------------------------------------------ */
/* Badge colour helpers                                                */
/* ------------------------------------------------------------------ */
const portalColor: Record<string, { bg: string; text: string; border: string }> = {
    datos_gob_ar: {
        bg: 'rgba(116, 172, 223, 0.15)',
        text: '#74ACDF',
        border: 'rgba(116, 172, 223, 0.3)',
    },
    caba: {
        bg: 'rgba(246, 180, 14, 0.15)',
        text: '#F6B40E',
        border: 'rgba(246, 180, 14, 0.3)',
    },
    buenos_aires_prov: {
        bg: 'rgba(52, 211, 153, 0.15)',
        text: '#34D399',
        border: 'rgba(52, 211, 153, 0.3)',
    },
    cordoba_prov: {
        bg: 'rgba(251, 146, 60, 0.15)',
        text: '#FB923C',
        border: 'rgba(251, 146, 60, 0.3)',
    },
    santa_fe: {
        bg: 'rgba(167, 139, 250, 0.15)',
        text: '#A78BFA',
        border: 'rgba(167, 139, 250, 0.3)',
    },
    mendoza: {
        bg: 'rgba(248, 113, 113, 0.15)',
        text: '#F87171',
        border: 'rgba(248, 113, 113, 0.3)',
    },
    entre_rios: {
        bg: 'rgba(56, 189, 248, 0.15)',
        text: '#38BDF8',
        border: 'rgba(56, 189, 248, 0.3)',
    },
    neuquen_legislatura: {
        bg: 'rgba(192, 132, 252, 0.15)',
        text: '#C084FC',
        border: 'rgba(192, 132, 252, 0.3)',
    },
    diputados: {
        bg: 'rgba(74, 222, 128, 0.15)',
        text: '#4ADE80',
        border: 'rgba(74, 222, 128, 0.3)',
    },
    justicia: {
        bg: 'rgba(253, 186, 116, 0.15)',
        text: '#FDBA74',
        border: 'rgba(253, 186, 116, 0.3)',
    },
};

const formatColor: Record<string, { bg: string; text: string; border: string }> = {
    csv: {
        bg: 'rgba(52, 211, 153, 0.15)',
        text: '#34D399',
        border: 'rgba(52, 211, 153, 0.3)',
    },
    json: {
        bg: 'rgba(167, 139, 250, 0.15)',
        text: '#A78BFA',
        border: 'rgba(167, 139, 250, 0.3)',
    },
    xlsx: {
        bg: 'rgba(251, 146, 60, 0.15)',
        text: '#FB923C',
        border: 'rgba(251, 146, 60, 0.3)',
    },
    xls: {
        bg: 'rgba(251, 146, 60, 0.15)',
        text: '#FB923C',
        border: 'rgba(251, 146, 60, 0.3)',
    },
};

const defaultBadge = {
    bg: 'rgba(156, 163, 191, 0.12)',
    text: '#9CA3BF',
    border: 'rgba(156, 163, 191, 0.25)',
};

function getBadgeStyle(map: Record<string, { bg: string; text: string; border: string }>, key: string) {
    const c = map[key.toLowerCase()] || defaultBadge;
    return {
        display: 'inline-block',
        padding: '0.2rem 0.6rem',
        fontSize: '0.72rem',
        fontWeight: 600 as const,
        borderRadius: '999px',
        background: c.bg,
        color: c.text,
        border: `1px solid ${c.border}`,
        textTransform: 'uppercase' as const,
        letterSpacing: '0.03em',
    };
}

/* ------------------------------------------------------------------ */
/* Portal display name                                                 */
/* ------------------------------------------------------------------ */
function portalLabel(p: string) {
    const labels: Record<string, string> = {
        datos_gob_ar: 'datos.gob.ar',
        caba: 'CABA',
        buenos_aires_prov: 'Buenos Aires Prov.',
        cordoba_prov: 'Córdoba Prov.',
        santa_fe: 'Santa Fe',
        mendoza: 'Mendoza',
        entre_rios: 'Entre Ríos',
        neuquen_legislatura: 'Neuquén Leg.',
        diputados: 'Diputados',
        justicia: 'Justicia',
    };
    return labels[p] || p;
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */
function formatARS(v: number): string {
    if (Math.abs(v) >= 1_000_000_000) return `$${(v / 1_000_000_000).toFixed(1)}B`;
    if (Math.abs(v) >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
    if (Math.abs(v) >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
    return `$${v.toLocaleString('es-AR')}`;
}

const severityColors: Record<string, { bg: string; text: string }> = {
    high: { bg: 'rgba(239, 68, 68, 0.15)', text: '#EF4444' },
    medium: { bg: 'rgba(246, 180, 14, 0.15)', text: '#F6B40E' },
    low: { bg: 'rgba(116, 172, 223, 0.15)', text: '#74ACDF' },
};

const severityLabel: Record<string, string> = {
    high: 'Alta',
    medium: 'Media',
    low: 'Baja',
};

const anomalyTypeLabel: Record<string, string> = {
    crecimiento_excesivo: 'Crecimiento excesivo',
    crecimiento_elevado: 'Crecimiento elevado',
    patrimonio_aparece: 'Patrimonio aparece',
    crecimiento_sin_ingresos: 'Crecimiento sin ingresos',
};

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */
const PAGE_SIZE = 50;

export default function DatasetsPage() {
    /* ---- state ---- */
    const [datasets, setDatasets] = useState<Dataset[]>([]);
    const [stats, setStats] = useState<PortalStat[]>([]);
    const [healthScores, setHealthScores] = useState<PortalHealth[]>([]);
    const [ddjjData, setDdjjData] = useState<DdjjSummary | null>(null);
    const [showDdjj, setShowDdjj] = useState(false);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [offset, setOffset] = useState(0);
    const [hasMore, setHasMore] = useState(true);

    // Filters
    const [search, setSearch] = useState('');
    const [portalFilter, setPortalFilter] = useState('all');
    const [formatFilter, setFormatFilter] = useState('all');

    // Expanded card
    const [expandedId, setExpandedId] = useState<string | null>(null);

    // Health index visible
    const [showHealth, setShowHealth] = useState(true);

    /* ---- fetch helpers ---- */
    const fetchStats = useCallback(async () => {
        try {
            const res = await fetch('/api/datasets?action=stats');
            if (!res.ok) throw new Error('Error cargando estadisticas');
            const data: PortalStat[] = await res.json();
            setStats(data);
        } catch {
            // Stats are non-critical
        }
    }, []);

    const fetchHealth = useCallback(async () => {
        try {
            const res = await fetch('/api/transparency?action=health');
            if (!res.ok) return;
            const data: PortalHealth[] = await res.json();
            setHealthScores(data);
        } catch {
            // Health scores are non-critical
        }
    }, []);

    const fetchDdjj = useCallback(async () => {
        try {
            const res = await fetch('/api/transparency?action=ddjj&limit=50');
            if (!res.ok) return;
            const data: DdjjSummary = await res.json();
            setDdjjData(data);
        } catch {
            // DDJJ data is non-critical
        }
    }, []);

    const fetchDatasets = useCallback(
        async (newOffset: number, append: boolean, portal: string) => {
            try {
                if (append) setLoadingMore(true);
                else setLoading(true);

                const params = new URLSearchParams({
                    limit: String(PAGE_SIZE),
                    offset: String(newOffset),
                });
                if (portal !== 'all') params.set('portal', portal);

                const res = await fetch(`/api/datasets?${params.toString()}`);
                if (!res.ok) throw new Error('Error cargando datasets');
                const data: Dataset[] = await res.json();

                if (append) {
                    setDatasets((prev) => [...prev, ...data]);
                } else {
                    setDatasets(data);
                }

                setHasMore(data.length === PAGE_SIZE);
                setOffset(newOffset + data.length);
                setError(null);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Error desconocido');
            } finally {
                setLoading(false);
                setLoadingMore(false);
            }
        },
        []
    );

    /* ---- initial load ---- */
    useEffect(() => {
        fetchStats();
        fetchHealth();
        fetchDdjj();
        fetchDatasets(0, false, portalFilter);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    /* ---- when portal filter changes, reload from scratch ---- */
    const handlePortalChange = (p: string) => {
        setPortalFilter(p);
        setExpandedId(null);
        setOffset(0);
        fetchDatasets(0, false, p);
    };

    /* ---- load more ---- */
    const handleLoadMore = () => {
        fetchDatasets(offset, true, portalFilter);
    };

    /* ---- client-side search + format filter ---- */
    const filtered = useMemo(() => {
        let list = datasets;

        if (formatFilter !== 'all') {
            list = list.filter((d) => d.format?.toLowerCase() === formatFilter);
        }

        if (search.trim()) {
            const q = search.toLowerCase();
            list = list.filter(
                (d) =>
                    d.title?.toLowerCase().includes(q) ||
                    d.organization?.toLowerCase().includes(q) ||
                    d.description?.toLowerCase().includes(q)
            );
        }

        return list;
    }, [datasets, search, formatFilter]);

    /* ---- total from stats ---- */
    const totalDatasets = stats.reduce((acc, s) => acc + s.count, 0);

    /* ---- health lookup by portal ---- */
    const healthByPortal = useMemo(() => {
        const map: Record<string, PortalHealth> = {};
        healthScores.forEach((h) => { map[h.portal] = h; });
        return map;
    }, [healthScores]);

    /* ---- unique formats in loaded data ---- */
    const availableFormats = useMemo(() => {
        const set = new Set<string>();
        datasets.forEach((d) => {
            if (d.format) set.add(d.format.toLowerCase());
        });
        return Array.from(set).sort();
    }, [datasets]);

    /* ================================================================ */
    /* RENDER                                                            */
    /* ================================================================ */
    return (
        <div style={{ position: 'relative', zIndex: 1, minHeight: '100vh' }}>
            {/* ---- Header ---- */}
            <header className="chat-header">
                <div className="chat-header-title">
                    <Link href="/">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src="/flag-icon.svg" alt="OpenArg" className="chat-header-logo" />
                        <span>OpenArg</span>
                    </Link>
                    <nav className="chat-header-right">
                        <Link href="/chat" className="chat-header-nav-link">
                            Chat
                        </Link>
                        <Link href="/datasets" className="chat-header-nav-link chat-header-nav-link--active">
                            Datasets
                        </Link>
                    </nav>
                </div>
                <div className="chat-header-right">
                    <UserMenu />
                </div>
            </header>

            {/* ---- Main content ---- */}
            <main style={{ maxWidth: 1200, margin: '0 auto', padding: '2rem 1.5rem' }}>
                {/* Title */}
                <h1
                    style={{
                        fontSize: 'clamp(1.8rem, 4vw, 2.5rem)',
                        fontWeight: 900,
                        marginBottom: '0.5rem',
                    }}
                >
                    <span
                        style={{
                            background: 'linear-gradient(135deg, var(--celeste), var(--celeste-bright), var(--sol))',
                            backgroundClip: 'text',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                        }}
                    >
                        Explorador de Datasets
                    </span>
                </h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', marginBottom: '2rem', lineHeight: 1.6 }}>
                    Explorá los datasets de datos abiertos disponibles en los portales gubernamentales de Argentina.
                </p>

                {/* ---- Stats bar ---- */}
                {stats.length > 0 && (
                    <div
                        style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: '1rem',
                            marginBottom: '2rem',
                        }}
                    >
                        <div
                            className="glass"
                            style={{
                                padding: '1rem 1.5rem',
                                borderRadius: 'var(--radius-md)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '0.25rem',
                                minWidth: 140,
                            }}
                        >
                            <span style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--celeste)' }}>
                                {totalDatasets.toLocaleString('es-AR')}
                            </span>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                                Total datasets
                            </span>
                        </div>
                        {stats.map((s) => (
                            <div
                                key={s.portal}
                                className="glass"
                                style={{
                                    padding: '1rem 1.5rem',
                                    borderRadius: 'var(--radius-md)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '0.25rem',
                                    minWidth: 140,
                                    cursor: 'pointer',
                                    borderColor:
                                        portalFilter === s.portal
                                            ? portalColor[s.portal]?.text || 'var(--border-active)'
                                            : undefined,
                                    transition: 'border-color 0.2s',
                                }}
                                onClick={() => handlePortalChange(s.portal)}
                            >
                                <span
                                    style={{
                                        fontSize: '1.8rem',
                                        fontWeight: 800,
                                        color: portalColor[s.portal]?.text || 'var(--text-primary)',
                                    }}
                                >
                                    {s.count.toLocaleString('es-AR')}
                                </span>
                                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                                    {portalLabel(s.portal)}
                                </span>
                                {healthByPortal[s.portal] && (() => {
                                    const sc = Math.round(healthByPortal[s.portal].avg_score * 100);
                                    const scColor = sc >= 70 ? '#34D399' : sc >= 40 ? '#F6B40E' : '#EF4444';
                                    return (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.25rem' }}>
                                            <div style={{
                                                width: 36, height: 4, borderRadius: 2,
                                                background: 'rgba(255,255,255,0.06)', overflow: 'hidden',
                                            }}>
                                                <div style={{ width: `${sc}%`, height: '100%', background: scColor, borderRadius: 2 }} />
                                            </div>
                                            <span style={{ fontSize: '0.65rem', color: scColor, fontWeight: 700 }}>
                                                {sc}
                                            </span>
                                        </div>
                                    );
                                })()}
                            </div>
                        ))}
                    </div>
                )}

                {/* ---- Health Index Panel ---- */}
                {healthScores.length > 0 && (
                    <div style={{ marginBottom: '2rem' }}>
                        <button
                            onClick={() => setShowHealth(!showHealth)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                color: 'var(--text-secondary)',
                                fontSize: '0.9rem',
                                fontWeight: 600,
                                fontFamily: "'Inter', sans-serif",
                                padding: '0.25rem 0',
                                marginBottom: showHealth ? '1rem' : 0,
                            }}
                        >
                            <span style={{
                                display: 'inline-block',
                                transform: showHealth ? 'rotate(90deg)' : 'rotate(0deg)',
                                transition: 'transform 0.2s',
                                fontSize: '0.75rem',
                            }}>
                                ▶
                            </span>
                            Indice de Salud de Datos Abiertos
                            <span style={{
                                fontSize: '0.72rem',
                                padding: '0.15rem 0.5rem',
                                borderRadius: '999px',
                                background: 'rgba(116, 172, 223, 0.12)',
                                color: 'var(--celeste)',
                                fontWeight: 600,
                            }}>
                                {healthScores.length} portales
                            </span>
                        </button>

                        {showHealth && (
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                                gap: '1rem',
                            }}>
                                {healthScores.map((h) => {
                                    const pColor = portalColor[h.portal]?.text || 'var(--celeste)';
                                    const scorePercent = Math.round(h.avg_score * 100);
                                    const scoreColor =
                                        scorePercent >= 70 ? '#34D399' :
                                        scorePercent >= 40 ? '#F6B40E' :
                                        '#EF4444';
                                    const unknownCount = h.unknown_count || 0;
                                    const total = h.fresh_count + h.stale_count + h.abandoned_count + unknownCount;
                                    const freshPct = total > 0 ? (h.fresh_count / total) * 100 : 0;
                                    const stalePct = total > 0 ? (h.stale_count / total) * 100 : 0;
                                    const abandonedPct = total > 0 ? (h.abandoned_count / total) * 100 : 0;
                                    const unknownPct = total > 0 ? (unknownCount / total) * 100 : 0;

                                    return (
                                        <div
                                            key={h.portal}
                                            className="glass"
                                            style={{
                                                padding: '1.25rem',
                                                borderRadius: 'var(--radius-md)',
                                                cursor: 'pointer',
                                                borderColor: portalFilter === h.portal ? pColor : undefined,
                                                transition: 'border-color 0.2s',
                                            }}
                                            onClick={() => handlePortalChange(h.portal)}
                                        >
                                            {/* Header: portal name + score */}
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                                                <span style={{ fontSize: '0.9rem', fontWeight: 700, color: pColor }}>
                                                    {portalLabel(h.portal)}
                                                </span>
                                                <span style={{
                                                    fontSize: '1.4rem',
                                                    fontWeight: 800,
                                                    color: scoreColor,
                                                }}>
                                                    {scorePercent}<span style={{ fontSize: '0.7rem', fontWeight: 500 }}>/100</span>
                                                </span>
                                            </div>

                                            {/* Score bar */}
                                            <div style={{
                                                width: '100%',
                                                height: 6,
                                                background: 'rgba(255,255,255,0.06)',
                                                borderRadius: 3,
                                                marginBottom: '0.75rem',
                                                overflow: 'hidden',
                                            }}>
                                                <div style={{
                                                    width: `${scorePercent}%`,
                                                    height: '100%',
                                                    background: scoreColor,
                                                    borderRadius: 3,
                                                    transition: 'width 0.6s ease',
                                                }} />
                                            </div>

                                            {/* Freshness stacked bar */}
                                            <div style={{
                                                width: '100%',
                                                height: 8,
                                                borderRadius: 4,
                                                overflow: 'hidden',
                                                display: 'flex',
                                                marginBottom: '0.5rem',
                                            }}>
                                                {freshPct > 0 && (
                                                    <div style={{ width: `${freshPct}%`, background: '#34D399', height: '100%' }}
                                                         title={`Actualizados: ${h.fresh_count}`} />
                                                )}
                                                {stalePct > 0 && (
                                                    <div style={{ width: `${stalePct}%`, background: '#F6B40E', height: '100%' }}
                                                         title={`Desactualizados: ${h.stale_count}`} />
                                                )}
                                                {abandonedPct > 0 && (
                                                    <div style={{ width: `${abandonedPct}%`, background: '#EF4444', height: '100%' }}
                                                         title={`Inactivos: ${h.abandoned_count}`} />
                                                )}
                                                {unknownPct > 0 && (
                                                    <div style={{ width: `${unknownPct}%`, background: 'rgba(255,255,255,0.15)', height: '100%' }}
                                                         title={`Sin fecha: ${unknownCount}`} />
                                                )}
                                            </div>

                                            {/* Legend */}
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                                    <span style={{ width: 8, height: 8, borderRadius: 2, background: '#34D399', display: 'inline-block' }} />
                                                    Actualizados {h.fresh_count}
                                                </span>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                                    <span style={{ width: 8, height: 8, borderRadius: 2, background: '#F6B40E', display: 'inline-block' }} />
                                                    Desactualizados {h.stale_count}
                                                </span>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                                    <span style={{ width: 8, height: 8, borderRadius: 2, background: '#EF4444', display: 'inline-block' }} />
                                                    Inactivos {h.abandoned_count}
                                                </span>
                                                {unknownCount > 0 && (
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                                        <span style={{ width: 8, height: 8, borderRadius: 2, background: 'rgba(255,255,255,0.25)', display: 'inline-block' }} />
                                                        Sin fecha {unknownCount}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* ---- DDJJ Anomalies ---- */}
                {ddjjData && ddjjData.total_flagged > 0 && (
                    <div style={{ marginBottom: '2rem' }}>
                        <button
                            onClick={() => setShowDdjj(!showDdjj)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                background: 'none',
                                border: 'none',
                                color: 'var(--text-primary)',
                                cursor: 'pointer',
                                padding: '0.5rem 0',
                                fontSize: '1rem',
                                fontWeight: 700,
                                fontFamily: "'Inter', sans-serif",
                            }}
                        >
                            <span style={{ transform: showDdjj ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s', display: 'inline-block' }}>&#9654;</span>
                            Anomalias Patrimoniales (DDJJ)
                            <span style={{
                                fontSize: '0.72rem',
                                padding: '0.15rem 0.5rem',
                                borderRadius: '999px',
                                background: 'rgba(239, 68, 68, 0.12)',
                                color: '#EF4444',
                                fontWeight: 600,
                            }}>
                                {ddjjData.total_flagged} anomalias
                            </span>
                        </button>

                        {showDdjj && (
                            <div>
                                {/* Summary badges */}
                                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                        {ddjjData.total_analyzed} declaraciones analizadas
                                    </span>
                                    {Object.entries(ddjjData.by_severity).map(([sev, count]) => (
                                        <span key={sev} style={{
                                            fontSize: '0.72rem',
                                            padding: '0.15rem 0.5rem',
                                            borderRadius: '999px',
                                            background: severityColors[sev]?.bg || 'rgba(255,255,255,0.08)',
                                            color: severityColors[sev]?.text || 'var(--text-muted)',
                                            fontWeight: 600,
                                        }}>
                                            {severityLabel[sev] || sev}: {count}
                                        </span>
                                    ))}
                                </div>

                                {/* Anomaly cards */}
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
                                    gap: '0.75rem',
                                }}>
                                    {ddjjData.anomalies.map((a, i) => {
                                        const sevColor = severityColors[a.severity || ''] || severityColors.low;
                                        return (
                                            <div key={`${a.cuit}-${i}`} className="glass" style={{
                                                padding: '1rem 1.25rem',
                                                borderRadius: 'var(--radius-md)',
                                                borderLeft: `3px solid ${sevColor.text}`,
                                            }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                                                    <div>
                                                        <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                                                            {a.nombre}
                                                        </div>
                                                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                                            CUIT: {a.cuit} &middot; {a.anio_declaracion}
                                                        </div>
                                                    </div>
                                                    <div style={{ display: 'flex', gap: '0.35rem' }}>
                                                        <span style={{
                                                            fontSize: '0.65rem',
                                                            padding: '0.1rem 0.4rem',
                                                            borderRadius: '999px',
                                                            background: sevColor.bg,
                                                            color: sevColor.text,
                                                            fontWeight: 600,
                                                            textTransform: 'uppercase',
                                                        }}>
                                                            {severityLabel[a.severity || ''] || a.severity}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.35rem 1rem', fontSize: '0.78rem' }}>
                                                    <div>
                                                        <span style={{ color: 'var(--text-muted)' }}>Patrimonio cierre: </span>
                                                        <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{formatARS(a.patrimonio_cierre)}</span>
                                                    </div>
                                                    <div>
                                                        <span style={{ color: 'var(--text-muted)' }}>Ingresos: </span>
                                                        <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{formatARS(a.ingresos_trabajo_neto)}</span>
                                                    </div>
                                                    <div>
                                                        <span style={{ color: 'var(--text-muted)' }}>Variacion: </span>
                                                        <span style={{ color: a.variacion_patrimonial > 0 ? '#34D399' : '#EF4444', fontWeight: 600 }}>
                                                            {a.variacion_patrimonial > 0 ? '+' : ''}{formatARS(a.variacion_patrimonial)}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <span style={{ color: 'var(--text-muted)' }}>Ratio: </span>
                                                        <span style={{ color: a.ratio_crecimiento > 10 ? '#EF4444' : a.ratio_crecimiento > 5 ? '#F6B40E' : 'var(--text-primary)', fontWeight: 700 }}>
                                                            {a.ratio_crecimiento}x
                                                        </span>
                                                    </div>
                                                </div>
                                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                                                    {anomalyTypeLabel[a.anomaly_type || ''] || a.anomaly_type}
                                                    {a.brecha_inexplicable > 0 && (
                                                        <> &middot; Brecha: {formatARS(a.brecha_inexplicable)}</>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* ---- Search bar ---- */}
                <div style={{ marginBottom: '1.25rem' }}>
                    <input
                        type="text"
                        placeholder="Buscar por titulo, organizacion o descripcion..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        style={{
                            width: '100%',
                            maxWidth: 600,
                            padding: '0.75rem 1.25rem',
                            fontSize: '0.95rem',
                            fontFamily: "'Inter', sans-serif",
                            color: 'var(--text-primary)',
                            background: 'var(--bg-elevated)',
                            border: '1px solid var(--border-default)',
                            borderRadius: 'var(--radius-lg)',
                            outline: 'none',
                            transition: 'border-color 0.3s',
                        }}
                        onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--celeste)')}
                        onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border-default)')}
                    />
                </div>

                {/* ---- Filter pills ---- */}
                <div
                    style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '0.5rem',
                        marginBottom: '2rem',
                        alignItems: 'center',
                    }}
                >
                    {/* Portal filters */}
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, marginRight: '0.25rem' }}>
                        Portal:
                    </span>
                    {['all', ...stats.map((s: PortalStat) => s.portal)].map((p) => (
                        <button
                            key={p}
                            onClick={() => handlePortalChange(p)}
                            style={{
                                padding: '0.35rem 0.85rem',
                                fontSize: '0.8rem',
                                fontWeight: 600,
                                fontFamily: "'Inter', sans-serif",
                                borderRadius: '999px',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                border:
                                    portalFilter === p
                                        ? `1px solid ${p === 'all' ? 'var(--celeste)' : portalColor[p]?.text || 'var(--celeste)'}`
                                        : '1px solid var(--border-default)',
                                background:
                                    portalFilter === p
                                        ? p === 'all'
                                            ? 'rgba(116, 172, 223, 0.15)'
                                            : portalColor[p]?.bg || 'rgba(116, 172, 223, 0.15)'
                                        : 'transparent',
                                color:
                                    portalFilter === p
                                        ? p === 'all'
                                            ? 'var(--celeste)'
                                            : portalColor[p]?.text || 'var(--celeste)'
                                        : 'var(--text-secondary)',
                            }}
                        >
                            {p === 'all' ? 'Todos' : portalLabel(p)}
                        </button>
                    ))}

                    <span
                        style={{
                            width: 1,
                            height: 20,
                            background: 'var(--border-default)',
                            margin: '0 0.5rem',
                        }}
                    />

                    {/* Format filters */}
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, marginRight: '0.25rem' }}>
                        Formato:
                    </span>
                    {['all', ...availableFormats].map((f) => (
                        <button
                            key={f}
                            onClick={() => setFormatFilter(f)}
                            style={{
                                padding: '0.35rem 0.85rem',
                                fontSize: '0.8rem',
                                fontWeight: 600,
                                fontFamily: "'Inter', sans-serif",
                                borderRadius: '999px',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                border:
                                    formatFilter === f
                                        ? `1px solid ${f === 'all' ? 'var(--celeste)' : formatColor[f]?.text || 'var(--celeste)'}`
                                        : '1px solid var(--border-default)',
                                background:
                                    formatFilter === f
                                        ? f === 'all'
                                            ? 'rgba(116, 172, 223, 0.15)'
                                            : formatColor[f]?.bg || 'rgba(116, 172, 223, 0.15)'
                                        : 'transparent',
                                color:
                                    formatFilter === f
                                        ? f === 'all'
                                            ? 'var(--celeste)'
                                            : formatColor[f]?.text || 'var(--celeste)'
                                        : 'var(--text-secondary)',
                                textTransform: 'uppercase' as const,
                            }}
                        >
                            {f === 'all' ? 'Todos' : f}
                        </button>
                    ))}
                </div>

                {/* ---- Error state ---- */}
                {error && (
                    <div
                        className="glass"
                        style={{
                            padding: '1.5rem',
                            borderRadius: 'var(--radius-md)',
                            marginBottom: '2rem',
                            borderColor: 'rgba(239, 68, 68, 0.3)',
                            textAlign: 'center',
                        }}
                    >
                        <p style={{ color: '#EF4444', fontWeight: 600, marginBottom: '0.5rem' }}>
                            Error al cargar datasets
                        </p>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{error}</p>
                        <button
                            onClick={() => fetchDatasets(0, false, portalFilter)}
                            style={{
                                marginTop: '1rem',
                                padding: '0.5rem 1.25rem',
                                fontSize: '0.85rem',
                                fontWeight: 600,
                                fontFamily: "'Inter', sans-serif",
                                color: 'var(--celeste)',
                                background: 'rgba(116, 172, 223, 0.1)',
                                border: '1px solid var(--celeste)',
                                borderRadius: 'var(--radius-md)',
                                cursor: 'pointer',
                            }}
                        >
                            Reintentar
                        </button>
                    </div>
                )}

                {/* ---- Loading skeleton ---- */}
                {loading && (
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
                            gap: '1.25rem',
                        }}
                    >
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div
                                key={i}
                                className="glass"
                                style={{
                                    padding: '1.5rem',
                                    borderRadius: 'var(--radius-lg)',
                                    animation: 'pulse 1.5s ease-in-out infinite',
                                }}
                            >
                                <div
                                    style={{
                                        height: 20,
                                        width: '75%',
                                        background: 'var(--bg-elevated)',
                                        borderRadius: 4,
                                        marginBottom: '0.75rem',
                                    }}
                                />
                                <div
                                    style={{
                                        height: 14,
                                        width: '50%',
                                        background: 'var(--bg-elevated)',
                                        borderRadius: 4,
                                        marginBottom: '1rem',
                                    }}
                                />
                                <div
                                    style={{
                                        height: 12,
                                        width: '100%',
                                        background: 'var(--bg-elevated)',
                                        borderRadius: 4,
                                        marginBottom: '0.5rem',
                                    }}
                                />
                                <div
                                    style={{
                                        height: 12,
                                        width: '80%',
                                        background: 'var(--bg-elevated)',
                                        borderRadius: 4,
                                    }}
                                />
                            </div>
                        ))}
                    </div>
                )}

                {/* ---- Dataset grid ---- */}
                {!loading && (
                    <>
                        {/* Result count */}
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                            {filtered.length === datasets.length
                                ? `${filtered.length} datasets cargados`
                                : `${filtered.length} de ${datasets.length} datasets cargados`}
                        </p>

                        <div
                            style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
                                gap: '1.25rem',
                            }}
                        >
                            {filtered.map((ds) => {
                                const isExpanded = expandedId === ds.id;
                                return (
                                    <div
                                        key={ds.id}
                                        className="glass"
                                        onClick={() => setExpandedId(isExpanded ? null : ds.id)}
                                        style={{
                                            padding: '1.5rem',
                                            borderRadius: 'var(--radius-lg)',
                                            cursor: 'pointer',
                                            transition: 'all 0.3s ease',
                                            borderColor: isExpanded
                                                ? 'var(--border-active)'
                                                : undefined,
                                            boxShadow: isExpanded ? 'var(--shadow-glow)' : undefined,
                                            gridColumn: isExpanded ? '1 / -1' : undefined,
                                        }}
                                        onMouseEnter={(e) => {
                                            if (!isExpanded) {
                                                e.currentTarget.style.borderColor = 'var(--border-active)';
                                                e.currentTarget.style.transform = 'translateY(-2px)';
                                                e.currentTarget.style.boxShadow = 'var(--shadow-glow)';
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            if (!isExpanded) {
                                                e.currentTarget.style.borderColor = '';
                                                e.currentTarget.style.transform = '';
                                                e.currentTarget.style.boxShadow = '';
                                            }
                                        }}
                                    >
                                        {/* Badges row */}
                                        <div
                                            style={{
                                                display: 'flex',
                                                flexWrap: 'wrap',
                                                gap: '0.5rem',
                                                marginBottom: '0.75rem',
                                                alignItems: 'center',
                                            }}
                                        >
                                            <span style={getBadgeStyle(portalColor, ds.portal)}>
                                                {portalLabel(ds.portal)}
                                            </span>
                                            {ds.format && (
                                                <span style={getBadgeStyle(formatColor, ds.format)}>
                                                    {ds.format.toUpperCase()}
                                                </span>
                                            )}
                                            {ds.is_cached && (
                                                <span
                                                    style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '0.25rem',
                                                        padding: '0.2rem 0.6rem',
                                                        fontSize: '0.7rem',
                                                        fontWeight: 600,
                                                        borderRadius: '999px',
                                                        background: 'rgba(52, 211, 153, 0.12)',
                                                        color: '#34D399',
                                                        border: '1px solid rgba(52, 211, 153, 0.25)',
                                                    }}
                                                >
                                                    En cache
                                                </span>
                                            )}
                                        </div>

                                        {/* Title */}
                                        <h3
                                            style={{
                                                fontSize: '1rem',
                                                fontWeight: 700,
                                                lineHeight: 1.4,
                                                marginBottom: '0.4rem',
                                                color: 'var(--text-primary)',
                                            }}
                                        >
                                            {ds.title}
                                        </h3>

                                        {/* Organization */}
                                        <p
                                            style={{
                                                fontSize: '0.8rem',
                                                color: 'var(--text-muted)',
                                                marginBottom: '0.75rem',
                                                fontWeight: 500,
                                            }}
                                        >
                                            {ds.organization}
                                        </p>

                                        {/* Description */}
                                        <p
                                            style={{
                                                fontSize: '0.85rem',
                                                color: 'var(--text-secondary)',
                                                lineHeight: 1.6,
                                                ...(isExpanded
                                                    ? {}
                                                    : {
                                                          display: '-webkit-box',
                                                          WebkitLineClamp: 3,
                                                          WebkitBoxOrient: 'vertical' as const,
                                                          overflow: 'hidden',
                                                      }),
                                            }}
                                        >
                                            {ds.description || 'Sin descripcion disponible.'}
                                        </p>

                                        {/* Expanded details */}
                                        {isExpanded && (
                                            <div
                                                style={{
                                                    marginTop: '1.25rem',
                                                    paddingTop: '1rem',
                                                    borderTop: '1px solid var(--border-default)',
                                                }}
                                            >
                                                <div
                                                    style={{
                                                        display: 'grid',
                                                        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                                                        gap: '0.75rem',
                                                        marginBottom: '1rem',
                                                    }}
                                                >
                                                    <div>
                                                        <span
                                                            style={{
                                                                fontSize: '0.72rem',
                                                                color: 'var(--text-muted)',
                                                                textTransform: 'uppercase',
                                                                fontWeight: 600,
                                                                letterSpacing: '0.05em',
                                                            }}
                                                        >
                                                            ID
                                                        </span>
                                                        <p
                                                            style={{
                                                                fontSize: '0.85rem',
                                                                fontFamily: "'JetBrains Mono', monospace",
                                                                color: 'var(--text-secondary)',
                                                                wordBreak: 'break-all',
                                                            }}
                                                        >
                                                            {ds.id}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <span
                                                            style={{
                                                                fontSize: '0.72rem',
                                                                color: 'var(--text-muted)',
                                                                textTransform: 'uppercase',
                                                                fontWeight: 600,
                                                                letterSpacing: '0.05em',
                                                            }}
                                                        >
                                                            Portal
                                                        </span>
                                                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                                            {portalLabel(ds.portal)}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <span
                                                            style={{
                                                                fontSize: '0.72rem',
                                                                color: 'var(--text-muted)',
                                                                textTransform: 'uppercase',
                                                                fontWeight: 600,
                                                                letterSpacing: '0.05em',
                                                            }}
                                                        >
                                                            Formato
                                                        </span>
                                                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                                            {ds.format?.toUpperCase() || 'N/A'}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <span
                                                            style={{
                                                                fontSize: '0.72rem',
                                                                color: 'var(--text-muted)',
                                                                textTransform: 'uppercase',
                                                                fontWeight: 600,
                                                                letterSpacing: '0.05em',
                                                            }}
                                                        >
                                                            Filas
                                                        </span>
                                                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                                            {ds.row_count
                                                                ? ds.row_count.toLocaleString('es-AR')
                                                                : 'N/A'}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <span
                                                            style={{
                                                                fontSize: '0.72rem',
                                                                color: 'var(--text-muted)',
                                                                textTransform: 'uppercase',
                                                                fontWeight: 600,
                                                                letterSpacing: '0.05em',
                                                            }}
                                                        >
                                                            Organizacion
                                                        </span>
                                                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                                            {ds.organization}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <span
                                                            style={{
                                                                fontSize: '0.72rem',
                                                                color: 'var(--text-muted)',
                                                                textTransform: 'uppercase',
                                                                fontWeight: 600,
                                                                letterSpacing: '0.05em',
                                                            }}
                                                        >
                                                            En cache
                                                        </span>
                                                        <p style={{ fontSize: '0.85rem', color: ds.is_cached ? '#34D399' : 'var(--text-secondary)' }}>
                                                            {ds.is_cached ? 'Si' : 'No'}
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Action: ask in chat */}
                                                <Link
                                                    href={`/chat`}
                                                    onClick={(e) => e.stopPropagation()}
                                                    style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '0.5rem',
                                                        padding: '0.5rem 1.25rem',
                                                        fontSize: '0.85rem',
                                                        fontWeight: 600,
                                                        color: 'var(--bg-primary)',
                                                        background: 'linear-gradient(135deg, var(--celeste), var(--celeste-bright))',
                                                        border: 'none',
                                                        borderRadius: 'var(--radius-md)',
                                                        textDecoration: 'none',
                                                        transition: 'all 0.3s',
                                                    }}
                                                >
                                                    Consultar en el Chat
                                                    <span>→</span>
                                                </Link>
                                            </div>
                                        )}

                                        {/* Row count chip at bottom-right when collapsed */}
                                        {!isExpanded && ds.row_count && (
                                            <p
                                                style={{
                                                    fontSize: '0.75rem',
                                                    color: 'var(--text-muted)',
                                                    marginTop: '0.75rem',
                                                    textAlign: 'right',
                                                }}
                                            >
                                                {ds.row_count.toLocaleString('es-AR')} filas
                                            </p>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {/* No results */}
                        {filtered.length === 0 && !loading && !error && (
                            <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                                <p style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>
                                    No se encontraron datasets
                                </p>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                    Proba ajustando los filtros o la busqueda.
                                </p>
                            </div>
                        )}

                        {/* Load more */}
                        {hasMore && !search.trim() && (
                            <div style={{ textAlign: 'center', marginTop: '2.5rem' }}>
                                <button
                                    onClick={handleLoadMore}
                                    disabled={loadingMore}
                                    style={{
                                        padding: '0.75rem 2.5rem',
                                        fontSize: '0.95rem',
                                        fontWeight: 600,
                                        fontFamily: "'Inter', sans-serif",
                                        color: loadingMore ? 'var(--text-muted)' : 'var(--celeste)',
                                        background: loadingMore
                                            ? 'var(--bg-elevated)'
                                            : 'rgba(116, 172, 223, 0.1)',
                                        border: `1px solid ${loadingMore ? 'var(--border-default)' : 'var(--celeste)'}`,
                                        borderRadius: 'var(--radius-xl)',
                                        cursor: loadingMore ? 'not-allowed' : 'pointer',
                                        transition: 'all 0.3s',
                                    }}
                                >
                                    {loadingMore ? 'Cargando...' : 'Cargar mas'}
                                </button>
                            </div>
                        )}
                    </>
                )}
            </main>

            {/* ---- Footer ---- */}
            <footer
                style={{
                    textAlign: 'center',
                    padding: '2rem 1rem',
                    color: 'var(--text-muted)',
                    fontSize: '0.8rem',
                }}
            >
                Powered by Colossuslab.tech
            </footer>
        </div>
    );
}
