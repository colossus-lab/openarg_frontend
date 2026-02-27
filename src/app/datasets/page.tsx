'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';

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
    switch (p) {
        case 'datos_gob_ar':
            return 'datos.gob.ar';
        case 'caba':
            return 'CABA';
        default:
            return p;
    }
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */
const PAGE_SIZE = 50;

export default function DatasetsPage() {
    /* ---- state ---- */
    const [datasets, setDatasets] = useState<Dataset[]>([]);
    const [stats, setStats] = useState<PortalStat[]>([]);
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
            <header
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '1rem 1.5rem',
                    borderBottom: '1px solid var(--border-subtle)',
                    background: 'rgba(10, 14, 26, 0.8)',
                    backdropFilter: 'blur(12px)',
                    position: 'sticky',
                    top: 0,
                    zIndex: 10,
                }}
            >
                <Link
                    href="/"
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        fontWeight: 700,
                        fontSize: '1.1rem',
                        textDecoration: 'none',
                        color: 'var(--text-primary)',
                    }}
                >
                    <div
                        style={{
                            width: 32,
                            height: 32,
                            background: 'linear-gradient(135deg, var(--celeste), var(--sol))',
                            borderRadius: 'var(--radius-sm)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '1rem',
                        }}
                    >
                        🇦🇷
                    </div>
                    <span>OpenArg</span>
                </Link>

                <nav style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                    <Link
                        href="/chat"
                        style={{
                            color: 'var(--text-secondary)',
                            textDecoration: 'none',
                            fontSize: '0.9rem',
                            transition: 'color 0.2s',
                        }}
                    >
                        Chat
                    </Link>
                    <Link
                        href="/datasets"
                        style={{
                            color: 'var(--celeste)',
                            textDecoration: 'none',
                            fontSize: '0.9rem',
                            fontWeight: 600,
                        }}
                    >
                        Datasets
                    </Link>
                    <Link
                        href="/"
                        style={{
                            color: 'var(--text-secondary)',
                            textDecoration: 'none',
                            fontSize: '0.9rem',
                        }}
                    >
                        Inicio
                    </Link>
                </nav>
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
                            background: 'linear-gradient(135deg, var(--celeste), var(--celeste-glow), var(--sol))',
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
                            </div>
                        ))}
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
                            background: 'var(--bg-card)',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: 'var(--radius-lg)',
                            outline: 'none',
                            transition: 'border-color 0.3s',
                        }}
                        onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--celeste)')}
                        onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border-subtle)')}
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
                    {['all', 'datos_gob_ar', 'caba'].map((p) => (
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
                                        : '1px solid var(--border-subtle)',
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
                            background: 'var(--border-subtle)',
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
                                        : '1px solid var(--border-subtle)',
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
                                        background: 'var(--bg-card)',
                                        borderRadius: 4,
                                        marginBottom: '0.75rem',
                                    }}
                                />
                                <div
                                    style={{
                                        height: 14,
                                        width: '50%',
                                        background: 'var(--bg-card)',
                                        borderRadius: 4,
                                        marginBottom: '1rem',
                                    }}
                                />
                                <div
                                    style={{
                                        height: 12,
                                        width: '100%',
                                        background: 'var(--bg-card)',
                                        borderRadius: 4,
                                        marginBottom: '0.5rem',
                                    }}
                                />
                                <div
                                    style={{
                                        height: 12,
                                        width: '80%',
                                        background: 'var(--bg-card)',
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
                                                    borderTop: '1px solid var(--border-subtle)',
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
                                                        background: 'linear-gradient(135deg, var(--celeste), var(--celeste-glow))',
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
                                            ? 'var(--bg-card)'
                                            : 'rgba(116, 172, 223, 0.1)',
                                        border: `1px solid ${loadingMore ? 'var(--border-subtle)' : 'var(--celeste)'}`,
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
