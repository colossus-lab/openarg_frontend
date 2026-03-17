'use client';

import { useState, useEffect } from 'react';

/* ------------------------------------------------------------------ */
/* INTRA 2024 Data (Source: indicetransparencia.ar)                     */
/* ------------------------------------------------------------------ */
const INTRA_DATA = [
    { rank: 1, jurisdiction: 'Ciudad Autónoma de Buenos Aires', score: 85.02, level: 'Alta' as const },
    { rank: 2, jurisdiction: 'Nación (Poder Ejecutivo Nacional)', score: 83.90, level: 'Alta' as const },
    { rank: 3, jurisdiction: 'Mendoza', score: 77.18, level: 'Alta' as const },
    { rank: 4, jurisdiction: 'Río Negro', score: 68.16, level: 'Moderada' as const },
    { rank: 5, jurisdiction: 'Buenos Aires', score: 63.85, level: 'Moderada' as const },
    { rank: 6, jurisdiction: 'La Pampa', score: 63.79, level: 'Moderada' as const },
    { rank: 7, jurisdiction: 'Entre Ríos', score: 63.26, level: 'Moderada' as const },
    { rank: 8, jurisdiction: 'Tierra del Fuego', score: 62.99, level: 'Moderada' as const },
    { rank: 9, jurisdiction: 'Córdoba', score: 62.39, level: 'Moderada' as const },
    { rank: 10, jurisdiction: 'Chubut', score: 61.66, level: 'Moderada' as const },
    { rank: 11, jurisdiction: 'Santa Cruz', score: 60.33, level: 'Moderada' as const },
    { rank: 12, jurisdiction: 'Santa Fe', score: 59.83, level: 'Moderada' as const },
    { rank: 13, jurisdiction: 'Neuquén', score: 59.30, level: 'Moderada' as const },
    { rank: 14, jurisdiction: 'Chaco', score: 58.35, level: 'Moderada' as const },
    { rank: 15, jurisdiction: 'Jujuy', score: 50.40, level: 'Transición' as const },
    { rank: 16, jurisdiction: 'Catamarca', score: 47.98, level: 'Insuficiente' as const },
    { rank: 17, jurisdiction: 'San Luis', score: 47.41, level: 'Insuficiente' as const },
    { rank: 18, jurisdiction: 'La Rioja', score: 46.95, level: 'Insuficiente' as const },
    { rank: 19, jurisdiction: 'Corrientes', score: 42.42, level: 'Insuficiente' as const },
    { rank: 20, jurisdiction: 'Misiones', score: 41.63, level: 'Insuficiente' as const },
    { rank: 21, jurisdiction: 'Tucumán', score: 40.28, level: 'Insuficiente' as const },
    { rank: 22, jurisdiction: 'San Juan', score: 38.66, level: 'Insuficiente' as const },
    { rank: 23, jurisdiction: 'Salta', score: 37.87, level: 'Insuficiente' as const },
    { rank: 24, jurisdiction: 'Santiago del Estero', score: 20.79, level: 'Crítica' as const },
    { rank: 25, jurisdiction: 'Formosa', score: 12.83, level: 'Crítica' as const },
];

const NATIONAL_AVERAGE = 54.3;

type Level = 'Alta' | 'Moderada' | 'Transición' | 'Insuficiente' | 'Crítica';

const LEVEL_COLORS: Record<Level, { dark: string; light: string; bg_dark: string; bg_light: string }> = {
    Alta:          { dark: '#34D399', light: '#0F7B50', bg_dark: 'rgba(52,211,153,0.12)', bg_light: 'rgba(16,150,96,0.10)' },
    Moderada:      { dark: '#F6B40E', light: '#9A7000', bg_dark: 'rgba(246,180,14,0.12)', bg_light: 'rgba(180,130,0,0.10)' },
    Transición:    { dark: '#FB923C', light: '#B05E10', bg_dark: 'rgba(251,146,60,0.12)', bg_light: 'rgba(200,100,20,0.10)' },
    Insuficiente:  { dark: '#F87171', light: '#B82828', bg_dark: 'rgba(248,113,113,0.12)', bg_light: 'rgba(184,40,40,0.10)' },
    Crítica:       { dark: '#EF4444', light: '#991B1B', bg_dark: 'rgba(239,68,68,0.15)', bg_light: 'rgba(153,27,27,0.12)' },
};

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

export default function IntraRanking() {
    const isLight = useTheme();
    const [expanded, setExpanded] = useState(true);

    const getColor = (level: Level) => isLight ? LEVEL_COLORS[level].light : LEVEL_COLORS[level].dark;
    const getBg = (level: Level) => isLight ? LEVEL_COLORS[level].bg_light : LEVEL_COLORS[level].bg_dark;

    return (
        <div style={{ marginBottom: '2rem' }}>
            <button
                onClick={() => setExpanded(!expanded)}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-primary)',
                    fontSize: '1rem',
                    fontWeight: 700,
                    fontFamily: "'Inter', sans-serif",
                    padding: '0.5rem 0',
                    marginBottom: expanded ? '0.75rem' : 0,
                }}
            >
                <span style={{
                    display: 'inline-block',
                    transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s',
                    fontSize: '0.75rem',
                }}>
                    ▶
                </span>
                🏛️ Ranking INTRA de Transparencia Provincial 2024
                <span style={{
                    fontSize: '0.72rem',
                    padding: '0.15rem 0.5rem',
                    borderRadius: '999px',
                    background: 'rgba(116, 172, 223, 0.12)',
                    color: 'var(--celeste)',
                    fontWeight: 600,
                }}>
                    25 jurisdicciones
                </span>
            </button>

            {expanded && (
                <div className="glass" style={{
                    borderRadius: 'var(--radius-lg)',
                    padding: '1.25rem',
                    overflow: 'hidden',
                }}>
                    {/* Average callout */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1rem',
                        marginBottom: '1.25rem',
                        padding: '0.75rem 1rem',
                        borderRadius: 'var(--radius-md)',
                        background: isLight ? 'rgba(116,172,223,0.08)' : 'rgba(116,172,223,0.06)',
                        border: '1px solid rgba(116,172,223,0.2)',
                    }}>
                        <div style={{ flex: 1 }}>
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>
                                Promedio Nacional
                            </span>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.3rem', marginTop: '0.15rem' }}>
                                <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--celeste)' }}>
                                    {NATIONAL_AVERAGE}
                                </span>
                                <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-muted)' }}>/100</span>
                            </div>
                        </div>
                        <div style={{ textAlign: 'right', maxWidth: 320 }}>
                            <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                                El 92% de las provincias no alcanza un nivel alto de transparencia. Solo CABA, Nación y Mendoza superan los 70 puntos.
                            </p>
                        </div>
                    </div>

                    {/* Level legend */}
                    <div style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '0.75rem',
                        marginBottom: '1rem',
                        fontSize: '0.68rem',
                        fontWeight: 600,
                    }}>
                        {(['Alta', 'Moderada', 'Transición', 'Insuficiente', 'Crítica'] as Level[]).map((level) => (
                            <span key={level} style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.3rem',
                            }}>
                                <span style={{
                                    width: 8, height: 8,
                                    borderRadius: 2,
                                    background: getColor(level),
                                    display: 'inline-block',
                                }} />
                                <span style={{ color: getColor(level) }}>{level}</span>
                            </span>
                        ))}
                    </div>

                    {/* Rankings */}
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.3rem',
                    }}>
                        {INTRA_DATA.map((item) => (
                            <div
                                key={item.rank}
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns: '28px 1fr 50px 60px',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    padding: '0.4rem 0.5rem',
                                    borderRadius: 'var(--radius-sm, 6px)',
                                    transition: 'background 0.2s',
                                    background: item.score <= NATIONAL_AVERAGE
                                        ? (isLight ? 'rgba(239,68,68,0.03)' : 'rgba(239,68,68,0.02)')
                                        : 'transparent',
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = getBg(item.level);
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = item.score <= NATIONAL_AVERAGE
                                        ? (isLight ? 'rgba(239,68,68,0.03)' : 'rgba(239,68,68,0.02)')
                                        : 'transparent';
                                }}
                            >
                                {/* Rank */}
                                <span style={{
                                    fontSize: '0.72rem',
                                    fontWeight: 700,
                                    color: 'var(--text-muted)',
                                    textAlign: 'center',
                                    fontFamily: "'JetBrains Mono', monospace",
                                }}>
                                    {item.rank}
                                </span>

                                {/* Name + bar */}
                                <div>
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        marginBottom: '0.15rem',
                                    }}>
                                        <span style={{
                                            fontSize: '0.78rem',
                                            fontWeight: 600,
                                            color: 'var(--text-primary)',
                                        }}>
                                            {item.jurisdiction}
                                        </span>
                                    </div>
                                    {/* Progress bar */}
                                    <div style={{
                                        width: '100%',
                                        height: 4,
                                        borderRadius: 2,
                                        background: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)',
                                        overflow: 'hidden',
                                    }}>
                                        <div style={{
                                            width: `${item.score}%`,
                                            height: '100%',
                                            borderRadius: 2,
                                            background: getColor(item.level),
                                            transition: 'width 0.8s ease',
                                        }} />
                                    </div>
                                </div>

                                {/* Score */}
                                <span style={{
                                    fontSize: '0.82rem',
                                    fontWeight: 800,
                                    color: getColor(item.level),
                                    textAlign: 'right',
                                    fontFamily: "'JetBrains Mono', monospace",
                                }}>
                                    {item.score.toFixed(1)}
                                </span>

                                {/* Level badge */}
                                <span style={{
                                    fontSize: '0.58rem',
                                    fontWeight: 700,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.04em',
                                    padding: '0.15rem 0.4rem',
                                    borderRadius: '999px',
                                    background: getBg(item.level),
                                    color: getColor(item.level),
                                    border: `1px solid ${getColor(item.level)}30`,
                                    textAlign: 'center',
                                    whiteSpace: 'nowrap',
                                }}>
                                    {item.level}
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* Source */}
                    <div style={{
                        marginTop: '1rem',
                        paddingTop: '0.75rem',
                        borderTop: `1px solid ${isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)'}`,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '0.5rem',
                    }}>
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                            Fuente: Índice Nacional de Transparencia (INTRA) 2024 · indicetransparencia.ar
                        </span>
                        <a
                            href="https://www.indicetransparencia.ar/"
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                                fontSize: '0.68rem',
                                fontWeight: 600,
                                color: 'var(--celeste)',
                                textDecoration: 'none',
                            }}
                        >
                            Ver índice completo →
                        </a>
                    </div>
                </div>
            )}
        </div>
    );
}
