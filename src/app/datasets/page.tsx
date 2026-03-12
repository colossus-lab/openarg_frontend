'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import UserMenu from '@/components/UserMenu';
import ThemeToggle from '@/components/ThemeToggle';
import CountUp from '@/components/reactbits/CountUp';
import ShinyText from '@/components/reactbits/ShinyText';
import SpotlightCard from '@/components/reactbits/SpotlightCard';
import FadeIn from '@/components/reactbits/FadeIn';

import BlurText from '@/components/reactbits/BlurText';
import Noise from '@/components/reactbits/Noise';
import Magnet from '@/components/reactbits/Magnet';
import TaxonomyExplorer from '@/components/TaxonomyExplorer';
import IntraRanking from '@/components/IntraRanking';
import DataQualitySection from '@/components/DataQualitySection';
import DigitalizationGuide from '@/components/DigitalizationGuide';

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
/* Theme hook                                                          */
/* ------------------------------------------------------------------ */
function useTheme() {
    const [isLight, setIsLight] = useState(false);
    useEffect(() => {
        const check = () => setIsLight(document.documentElement.getAttribute('data-theme') === 'light');
        check();
        const obs = new MutationObserver(check);
        obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
        return () => obs.disconnect();
    }, []);
    return isLight;
}

/* ------------------------------------------------------------------ */
/* Badge colour helpers                                                */
/* ------------------------------------------------------------------ */
type BadgeColor = Record<string, { bg: string; text: string; border: string }>;

/* ------------------------------------------------------------------ */
/* Category-based portal colour system                                 */
/* 5 category colours instead of 30+ individual ones                   */
/* Nacional=Celeste, CABA=Gold, Provincia=Teal, Municipio=Lavender,   */
/* Other(non-CKAN)=Silver                                              */
/* ------------------------------------------------------------------ */
type PortalCategory = 'nacional' | 'caba' | 'provincia' | 'municipio' | 'other';

const PORTAL_CATEGORY: Record<string, PortalCategory> = {
    // Nacional (16)
    datos_gob_ar: 'nacional',
    diputados: 'nacional',
    justicia: 'nacional',
    energia: 'nacional',
    transporte: 'nacional',
    salud: 'nacional',
    cultura: 'nacional',
    produccion: 'nacional',
    magyp: 'nacional',
    arsat: 'nacional',
    acumar: 'nacional',
    mininterior: 'nacional',
    pami: 'nacional',
    desarrollo_social: 'nacional',
    turismo: 'nacional',
    ssn: 'nacional',
    // CABA (2)
    caba: 'caba',
    legislatura_caba: 'caba',
    // Provincia (9)
    buenos_aires_prov: 'provincia',
    cordoba_prov: 'provincia',
    cordoba_estadistica: 'provincia',
    mendoza: 'provincia',
    entre_rios: 'provincia',
    neuquen_legislatura: 'provincia',
    tucuman: 'provincia',
    misiones: 'provincia',
    chaco: 'provincia',
    // Municipio (2)
    ciudad_mendoza: 'municipio',
    corrientes: 'municipio',
    cordoba_legislatura: 'provincia',
    // Other — non-CKAN sources
    georef: 'other',
    series_tiempo: 'other',
    rosario_dkan: 'other',
    jujuy_dkan: 'other',
    presupuesto_abierto: 'other',
    indec: 'other',
    bcra: 'other',
    senado: 'other',
    bac: 'other',
};

const CATEGORY_COLORS_DARK: Record<PortalCategory, { bg: string; text: string; border: string }> = {
    nacional:  { bg: 'rgba(116, 172, 223, 0.10)', text: '#74ACDF', border: 'rgba(116, 172, 223, 0.28)' },
    caba:      { bg: 'rgba(246, 180, 14, 0.10)',  text: '#F6B40E', border: 'rgba(246, 180, 14, 0.28)' },
    provincia: { bg: 'rgba(80, 200, 170, 0.10)',   text: '#50C8AA', border: 'rgba(80, 200, 170, 0.28)' },
    municipio: { bg: 'rgba(160, 140, 220, 0.10)',  text: '#A08CDC', border: 'rgba(160, 140, 220, 0.28)' },
    other:     { bg: 'rgba(180, 190, 210, 0.07)',  text: '#B4BED2', border: 'rgba(180, 190, 210, 0.22)' },
};

const CATEGORY_COLORS_LIGHT: Record<PortalCategory, { bg: string; text: string; border: string }> = {
    nacional:  { bg: 'rgba(55, 120, 180, 0.10)',  text: '#2E6DA4', border: 'rgba(55, 120, 180, 0.25)' },
    caba:      { bg: 'rgba(180, 130, 0, 0.10)',   text: '#9A7000', border: 'rgba(180, 130, 0, 0.25)' },
    provincia: { bg: 'rgba(30, 140, 110, 0.10)',   text: '#1A8C6E', border: 'rgba(30, 140, 110, 0.25)' },
    municipio: { bg: 'rgba(110, 90, 180, 0.10)',   text: '#6E5AB4', border: 'rgba(110, 90, 180, 0.25)' },
    other:     { bg: 'rgba(100, 110, 130, 0.08)',  text: '#5A6478', border: 'rgba(100, 110, 130, 0.20)' },
};

function buildPortalColors(categoryColors: Record<PortalCategory, { bg: string; text: string; border: string }>): BadgeColor {
    const result: BadgeColor = {};
    for (const [portal, category] of Object.entries(PORTAL_CATEGORY)) {
        result[portal] = categoryColors[category];
    }
    return result;
}

const portalColorDark: BadgeColor = buildPortalColors(CATEGORY_COLORS_DARK);
const portalColorLight: BadgeColor = buildPortalColors(CATEGORY_COLORS_LIGHT);

const formatColorDark: BadgeColor = {
    csv: { bg: 'rgba(52, 211, 153, 0.15)', text: '#34D399', border: 'rgba(52, 211, 153, 0.3)' },
    json: { bg: 'rgba(167, 139, 250, 0.15)', text: '#A78BFA', border: 'rgba(167, 139, 250, 0.3)' },
    xlsx: { bg: 'rgba(251, 146, 60, 0.15)', text: '#FB923C', border: 'rgba(251, 146, 60, 0.3)' },
    xls: { bg: 'rgba(251, 146, 60, 0.15)', text: '#FB923C', border: 'rgba(251, 146, 60, 0.3)' },
};

const formatColorLight: BadgeColor = {
    csv: { bg: 'rgba(16, 150, 96, 0.1)', text: '#0F7B50', border: 'rgba(16, 150, 96, 0.25)' },
    json: { bg: 'rgba(110, 70, 210, 0.1)', text: '#6B3FA0', border: 'rgba(110, 70, 210, 0.25)' },
    xlsx: { bg: 'rgba(200, 100, 20, 0.1)', text: '#B05E10', border: 'rgba(200, 100, 20, 0.25)' },
    xls: { bg: 'rgba(200, 100, 20, 0.1)', text: '#B05E10', border: 'rgba(200, 100, 20, 0.25)' },
};

const defaultBadgeDark = { bg: 'rgba(156, 163, 191, 0.12)', text: '#9CA3BF', border: 'rgba(156, 163, 191, 0.25)' };
const defaultBadgeLight = { bg: 'rgba(100, 110, 130, 0.08)', text: '#5A6478', border: 'rgba(100, 110, 130, 0.2)' };

function getBadgeStyle(
    map: BadgeColor,
    key: string,
    fallback: { bg: string; text: string; border: string } = defaultBadgeDark,
) {
    const c = map[key.toLowerCase()] || fallback;
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
        datos_gob_ar: 'Portal Nacional',
        caba: 'CABA',
        buenos_aires_prov: 'Buenos Aires Prov.',
        cordoba_prov: 'Córdoba Provincia',
        cordoba_estadistica: 'Córdoba Estadística',
        mendoza: 'Mendoza',
        entre_rios: 'Entre Ríos',
        neuquen_legislatura: 'Neuquén Leg.',
        diputados: 'Diputados',
        justicia: 'Justicia',
        energia: 'Energía',
        transporte: 'Transporte',
        salud: 'Salud',
        cultura: 'Cultura',
        produccion: 'Producción',
        magyp: 'Agricultura y Pesca',
        arsat: 'ARSAT',
        acumar: 'ACUMAR',
        mininterior: 'Interior',
        pami: 'PAMI',
        desarrollo_social: 'Desarrollo Social',
        turismo: 'Turismo',
        ssn: 'Seguros (SSN)',
        legislatura_caba: 'Legislatura CABA',
        tucuman: 'Tucumán',
        misiones: 'Misiones',
        chaco: 'Chaco',
        ciudad_mendoza: 'Ciudad de Mendoza',
        corrientes: 'Corrientes',
        rosario_dkan: 'Rosario',
        jujuy_dkan: 'Jujuy',
        presupuesto_abierto: 'Presupuesto Abierto',
        indec: 'INDEC',
        bcra: 'BCRA',
        senado: 'Senado',
        bac: 'Buenos Aires Compras',
        georef: 'GeoRef',
        series_tiempo: 'Series de Tiempo',
        cordoba_legislatura: 'Córdoba Legislatura',
    };
    if (labels[p]) return labels[p];
    // Fallback: reemplazar _ por espacio y capitalizar cada palabra
    return p.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function portalCategoryLabel(p: string): string {
    const cat = PORTAL_CATEGORY[p];
    const labels: Record<PortalCategory, string> = {
        nacional: 'Nacional',
        caba: 'CABA',
        provincia: 'Provincia',
        municipio: 'Municipio',
        other: 'Otro',
    };
    return cat ? labels[cat] : 'Otro';
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */
const PAGE_SIZE = 50;

export default function DatasetsPage() {
    const router = useRouter();
    /* ---- theme ---- */
    const isLight = useTheme();
    const portalColor = isLight ? portalColorLight : portalColorDark;
    const formatColor = isLight ? formatColorLight : formatColorDark;
    const defaultBadge = isLight ? defaultBadgeLight : defaultBadgeDark;

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
            <Noise patternAlpha={6} patternRefreshInterval={4} />
            {/* ---- Header ---- */}
            <header className="chat-header">
                <div className="chat-header-title">
                    <Link href="/">
                        <Magnet padding={6} magnetStrength={3}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src="/flag-icon.svg" alt="OpenArg" className="chat-header-logo" />
                        </Magnet>
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
                    <ThemeToggle />
                    <UserMenu />
                </div>
            </header>

            {/* ---- Main content ---- */}
            <main style={{ maxWidth: 1200, margin: '0 auto', padding: '2rem 1.5rem' }}>
                {/* Title */}
                <FadeIn direction="up" distance={20} delay={0.1}>
                <h1
                    style={{
                        fontSize: 'clamp(1.8rem, 4vw, 2.5rem)',
                        fontWeight: 900,
                        marginBottom: '0.5rem',
                    }}
                >
                    <ShinyText text="Explorador de Datasets" speed={4} color="var(--text-secondary)" shineColor="var(--celeste)" />
                </h1>
                <BlurText
                    text="Explorá los datasets de datos abiertos disponibles en los portales gubernamentales de Argentina."
                    className="datasets-subtitle-blur"
                    delay={60}
                    animateBy="words"
                    direction="bottom"
                    stepDuration={0.3}
                />
                </FadeIn>

                {/* ---- Stats bar ---- */}
                {stats.length > 0 && (
                    <FadeIn direction="up" distance={15} delay={0.2}>
                    <div
                        className="datasets-stats-grid"
                        style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: '0.5rem',
                            marginBottom: '1.5rem',
                        }}
                    >
                        <div
                            className="glass"
                            style={{
                                padding: '0.5rem 1rem',
                                borderRadius: 'var(--radius-md)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '0.1rem',
                                minWidth: 110,
                            }}
                        >
                            <span style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--celeste)' }}>
                                <CountUp to={totalDatasets} duration={2} separator="." />
                            </span>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                                Total datasets
                            </span>
                        </div>
                        {stats.map((s) => (
                            <div
                                key={s.portal}
                                className="glass"
                                style={{
                                    padding: '0.5rem 1rem',
                                    borderRadius: 'var(--radius-md)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '0.1rem',
                                    minWidth: 110,
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
                                        fontSize: '1.3rem',
                                        fontWeight: 800,
                                        color: portalColor[s.portal]?.text || 'var(--text-primary)',
                                    }}
                                >
                                    <CountUp to={s.count} duration={2} separator="." />
                                </span>
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                                    {portalLabel(s.portal)}
                                </span>
                            </div>
                        ))}
                    </div>
                    </FadeIn>
                )}

                {/* ---- INTRA Ranking ---- */}
                <FadeIn direction="up" distance={20} delay={0.15}>
                    <IntraRanking />
                </FadeIn>

                {/* ---- Data Quality Section ---- */}
                <FadeIn direction="up" distance={20} delay={0.2}>
                    <DataQualitySection />
                </FadeIn>

                {/* ---- Digitalization Guide ---- */}
                <FadeIn direction="up" distance={20} delay={0.25}>
                    <DigitalizationGuide />
                </FadeIn>

                {/* ---- Download Report Button ---- */}
                <FadeIn direction="up" distance={20} delay={0.3}>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'center',
                        margin: '1.5rem 0',
                    }}>
                        <a
                            href="/informe-digitalizacion.pdf"
                            download="Informe_Digitalizacion_Municipal_OpenArg.pdf"
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '10px',
                                padding: '14px 32px',
                                background: isLight
                                    ? 'linear-gradient(135deg, #0A1628, #1a2d4a)'
                                    : 'linear-gradient(135deg, rgba(116,172,223,0.15), rgba(116,172,223,0.08))',
                                color: isLight ? '#ffffff' : '#74ACDF',
                                border: isLight ? 'none' : '1px solid rgba(116,172,223,0.25)',
                                borderRadius: '14px',
                                fontSize: '0.95rem',
                                fontWeight: 700,
                                textDecoration: 'none',
                                cursor: 'pointer',
                                boxShadow: isLight
                                    ? '0 4px 20px rgba(10,22,40,0.25)'
                                    : '0 4px 20px rgba(0,0,0,0.3)',
                                transition: 'all 0.25s ease',
                                letterSpacing: '0.02em',
                            }}
                            onMouseEnter={(e) => {
                                (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                                (e.currentTarget as HTMLElement).style.boxShadow = isLight
                                    ? '0 8px 30px rgba(10,22,40,0.35)'
                                    : '0 8px 30px rgba(116,172,223,0.2)';
                            }}
                            onMouseLeave={(e) => {
                                (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                                (e.currentTarget as HTMLElement).style.boxShadow = isLight
                                    ? '0 4px 20px rgba(10,22,40,0.25)'
                                    : '0 4px 20px rgba(0,0,0,0.3)';
                            }}
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                <polyline points="14 2 14 8 20 8"/>
                                <line x1="16" y1="13" x2="8" y2="13"/>
                                <line x1="16" y1="17" x2="8" y2="17"/>
                                <polyline points="10 9 9 9 8 9"/>
                            </svg>
                            📄 Descargar Informe Completo — Digitalización Municipal
                            <span style={{
                                fontSize: '0.7rem',
                                fontWeight: 500,
                                opacity: 0.7,
                                padding: '2px 8px',
                                background: isLight ? 'rgba(255,255,255,0.15)' : 'rgba(116,172,223,0.12)',
                                borderRadius: '6px',
                            }}>PDF</span>
                        </a>
                    </div>
                </FadeIn>

                {/* ---- Taxonomy Explorer ---- */}
                <FadeIn direction="up" distance={20} delay={0.35}>
                    <TaxonomyExplorer
                        onCategoryClick={(_domain, _cat, label) => {
                            router.push(`/chat?prompt=${encodeURIComponent(`Quiero saber sobre ${label} en Argentina: `)}`);
                        }}
                    />
                </FadeIn>

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
                            {p !== 'all' && (
                                <span style={{
                                    fontSize: '0.6rem',
                                    opacity: 0.6,
                                    marginLeft: '0.3rem',
                                    fontWeight: 500,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.04em',
                                }}>
                                    {portalCategoryLabel(p)}
                                </span>
                            )}
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
                    <FadeIn direction="up" distance={20} delay={0.3}>
                    <>
                        {/* Result count */}
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                            {filtered.length === datasets.length
                                ? `${filtered.length} datasets cargados`
                                : `${filtered.length} de ${datasets.length} datasets cargados`}
                        </p>

                        <div
                            className="datasets-grid"
                            style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                                gap: '0.75rem',
                            }}
                        >
                            {filtered.map((ds) => {
                                const isExpanded = expandedId === ds.id;
                                return (
                                    <SpotlightCard
                                        key={ds.id}
                                        className="glass"
                                        spotlightColor={portalColor[ds.portal]?.bg || 'rgba(116, 172, 223, 0.15)'}
                                    >
                                    <div
                                        onClick={() => setExpandedId(isExpanded ? null : ds.id)}
                                        style={{
                                            padding: '0.85rem 1rem',
                                            borderRadius: 'var(--radius-lg)',
                                            cursor: 'pointer',
                                            transition: 'all 0.3s ease',
                                            borderColor: isExpanded
                                                ? 'var(--border-active)'
                                                : undefined,
                                            boxShadow: isExpanded
                                                ? '0 4px 24px rgba(0,0,0,0.3), 0 0 0 1px var(--border-active)'
                                                : undefined,
                                            gridColumn: isExpanded ? '1 / -1' : undefined,
                                            zIndex: isExpanded ? 2 : undefined,
                                            position: isExpanded ? 'relative' as const : undefined,
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
                                                gap: '0.35rem',
                                                marginBottom: '0.4rem',
                                                alignItems: 'center',
                                            }}
                                        >
                                            <span style={getBadgeStyle(portalColor, ds.portal, defaultBadge)}>
                                                {portalLabel(ds.portal)}
                                            </span>
                                            {ds.format && (
                                                <span style={getBadgeStyle(formatColor, ds.format, defaultBadge)}>
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
                                                        background: isLight ? 'rgba(16, 150, 96, 0.08)' : 'rgba(52, 211, 153, 0.12)',
                                                        color: isLight ? '#0F7B50' : '#34D399',
                                                        border: isLight ? '1px solid rgba(16, 150, 96, 0.2)' : '1px solid rgba(52, 211, 153, 0.25)',
                                                    }}
                                                >
                                                    En cache
                                                </span>
                                            )}
                                        </div>

                                        {/* Title */}
                                        <h3
                                            style={{
                                                fontSize: '0.88rem',
                                                fontWeight: 700,
                                                lineHeight: 1.35,
                                                marginBottom: '0.25rem',
                                                color: 'var(--text-primary)',
                                            }}
                                        >
                                            {ds.title}
                                        </h3>

                                        {/* Organization */}
                                        <p
                                            style={{
                                                fontSize: '0.72rem',
                                                color: 'var(--text-muted)',
                                                marginBottom: '0.4rem',
                                                fontWeight: 500,
                                            }}
                                        >
                                            {ds.organization}
                                        </p>

                                        {/* Description */}
                                        <p
                                            style={{
                                                fontSize: '0.78rem',
                                                color: 'var(--text-secondary)',
                                                lineHeight: 1.5,
                                                ...(isExpanded
                                                    ? {}
                                                    : {
                                                          display: '-webkit-box',
                                                          WebkitLineClamp: 2,
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
                                                        <p style={{ fontSize: '0.85rem', color: ds.is_cached ? (isLight ? '#0F7B50' : '#34D399') : 'var(--text-secondary)' }}>
                                                            {ds.is_cached ? 'Si' : 'No'}
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Action: ask in chat */}
                                                <Link
                                                    href={`/chat?prompt=${encodeURIComponent(
                                                        ds.is_cached
                                                            ? `Sobre el dataset "${ds.title}" (portal: ${portalLabel(ds.portal)}, organización: ${ds.organization}, cacheado en DB → usá query_sandbox): `
                                                            : `Sobre el dataset "${ds.title}" (portal: ${portalLabel(ds.portal)}, organización: ${ds.organization}): `
                                                    )}`}
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
                                    </SpotlightCard>
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
                    </FadeIn>
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
