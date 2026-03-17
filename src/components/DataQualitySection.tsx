'use client';

import { useState, useEffect } from 'react';

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
/* Quality Dimensions                                                  */
/* ------------------------------------------------------------------ */
const DIMENSIONS = [
    {
        icon: '🎯',
        name: 'Exactitud',
        description: 'Los datos reflejan fielmente la realidad. Un presupuesto con errores de suma tiene calidad nula.',
        color: '#34D399',
    },
    {
        icon: '🧩',
        name: 'Integridad',
        description: 'Se capturan todos los atributos necesarios. Una base de obras sin coordenadas geográficas está incompleta.',
        color: '#60A5FA',
    },
    {
        icon: '🔗',
        name: 'Consistencia',
        description: 'Los datos son coherentes entre sistemas. Un mismo ID de proveedor debe referir a la misma empresa en compras y pagos.',
        color: '#A78BFA',
    },
    {
        icon: '✅',
        name: 'Validez',
        description: 'Cumplimiento de formatos estandarizados: fechas en AAAA-MM-DD, tipos de datos numéricos correctos.',
        color: '#F6B40E',
    },
    {
        icon: '🔢',
        name: 'Unicidad',
        description: 'Ausencia de registros duplicados que distorsionen promedios, totales o conteos.',
        color: '#FB923C',
    },
    {
        icon: '⏱️',
        name: 'Puntualidad',
        description: 'Los datos están disponibles en el tiempo esperado. Un mapa de transporte desactualizado no es útil.',
        color: '#F87171',
    },
    {
        icon: '🌐',
        name: 'Accesibilidad',
        description: 'Disponibilidad gratuita, sin registro, en formatos abiertos procesables (CSV, JSON, XML).',
        color: '#74ACDF',
    },
];

const KEY_STATS = [
    { value: '80%', label: 'de municipios tiene menos de 10.000 hab.' },
    { value: '30%', label: 'cuenta con un área de modernización digital' },
    { value: '52%', label: 'tiene entre 1 y 2.500 habitantes' },
    { value: '99%', label: 'tiene internet, pero solo 30% funciona bien' },
];

export default function DataQualitySection() {
    const isLight = useTheme();
    const [expanded, setExpanded] = useState(true);

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
                📊 Calidad vs. Cantidad: ¿Qué vale más en Datos Abiertos?
            </button>

            {expanded && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {/* Golden Rule callout */}
                    <div className="glass" style={{
                        borderRadius: 'var(--radius-lg)',
                        padding: '1.25rem',
                        borderColor: 'rgba(246,180,14,0.3)',
                    }}>
                        <div style={{
                            display: 'flex',
                            gap: '0.75rem',
                            alignItems: 'flex-start',
                        }}>
                            <span style={{ fontSize: '1.5rem', lineHeight: 1 }}>💡</span>
                            <div>
                                <h4 style={{
                                    fontSize: '0.88rem',
                                    fontWeight: 700,
                                    color: isLight ? '#9A7000' : '#F6B40E',
                                    marginBottom: '0.35rem',
                                }}>
                                    Regla de Oro: &quot;Apertura con Propósito&quot;
                                </h4>
                                <p style={{
                                    fontSize: '0.78rem',
                                    color: 'var(--text-secondary)',
                                    lineHeight: 1.55,
                                    margin: 0,
                                }}>
                                    Publicar miles de datasets carece de valor público si la información es inexacta, desactualizada o en formatos no procesables.
                                    La tendencia moderna sugiere priorizar bases de datos estratégicas con mayor potencial de uso y reúso, evitando
                                    el desperdicio de recursos en datos que nadie consulta.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Two columns: Quantity vs Quality */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                        gap: '0.75rem',
                    }}>
                        {/* Quantity (bad) */}
                        <div className="glass" style={{
                            borderRadius: 'var(--radius-lg)',
                            padding: '1rem',
                            borderColor: isLight ? 'rgba(184,40,40,0.15)' : 'rgba(239,68,68,0.15)',
                        }}>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                marginBottom: '0.75rem',
                            }}>
                                <span style={{ fontSize: '1.1rem' }}>📦</span>
                                <h4 style={{
                                    fontSize: '0.82rem',
                                    fontWeight: 700,
                                    color: isLight ? '#B82828' : '#F87171',
                                    margin: 0,
                                }}>
                                    Enfoque en Cantidad
                                </h4>
                                <span style={{
                                    fontSize: '0.6rem',
                                    padding: '0.1rem 0.4rem',
                                    borderRadius: '999px',
                                    background: isLight ? 'rgba(184,40,40,0.08)' : 'rgba(239,68,68,0.1)',
                                    color: isLight ? '#B82828' : '#F87171',
                                    fontWeight: 700,
                                    textTransform: 'uppercase',
                                }}>
                                    Riesgo
                                </span>
                            </div>
                            <ul style={{
                                margin: 0,
                                paddingLeft: '1.2rem',
                                fontSize: '0.75rem',
                                color: 'var(--text-secondary)',
                                lineHeight: 1.7,
                            }}>
                                <li>PDFs e imágenes que cumplen &quot;la norma&quot; pero no son procesables</li>
                                <li>Datos descontextualizados sin trazabilidad</li>
                                <li>Riesgo de desinformación por errores en datos masivos</li>
                                <li><strong style={{ color: 'var(--text-primary)' }}>Transparencia de vitrina</strong>: cumplimiento formal sin valor real</li>
                            </ul>
                        </div>

                        {/* Quality (good) */}
                        <div className="glass" style={{
                            borderRadius: 'var(--radius-lg)',
                            padding: '1rem',
                            borderColor: isLight ? 'rgba(16,150,96,0.15)' : 'rgba(52,211,153,0.15)',
                        }}>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                marginBottom: '0.75rem',
                            }}>
                                <span style={{ fontSize: '1.1rem' }}>✨</span>
                                <h4 style={{
                                    fontSize: '0.82rem',
                                    fontWeight: 700,
                                    color: isLight ? '#0F7B50' : '#34D399',
                                    margin: 0,
                                }}>
                                    Enfoque en Calidad
                                </h4>
                                <span style={{
                                    fontSize: '0.6rem',
                                    padding: '0.1rem 0.4rem',
                                    borderRadius: '999px',
                                    background: isLight ? 'rgba(16,150,96,0.08)' : 'rgba(52,211,153,0.1)',
                                    color: isLight ? '#0F7B50' : '#34D399',
                                    fontWeight: 700,
                                    textTransform: 'uppercase',
                                }}>
                                    Recomendado
                                </span>
                            </div>
                            <ul style={{
                                margin: 0,
                                paddingLeft: '1.2rem',
                                fontSize: '0.75rem',
                                color: 'var(--text-secondary)',
                                lineHeight: 1.7,
                            }}>
                                <li>Bases completas, desagregadas y en formatos abiertos (CSV/JSON)</li>
                                <li>Datos con trazabilidad y metadatos ricos</li>
                                <li>Diseño centrado en el usuario y la reutilización</li>
                                <li><strong style={{ color: 'var(--text-primary)' }}>Apertura con propósito</strong>: datos que resuelven problemas reales</li>
                            </ul>
                        </div>
                    </div>

                    {/* 7 Quality Dimensions */}
                    <div className="glass" style={{
                        borderRadius: 'var(--radius-lg)',
                        padding: '1.25rem',
                    }}>
                        <h4 style={{
                            fontSize: '0.82rem',
                            fontWeight: 700,
                            color: 'var(--text-primary)',
                            marginBottom: '0.75rem',
                        }}>
                            Las 7 Dimensiones de la Calidad de Datos
                            <span style={{
                                fontSize: '0.6rem',
                                color: 'var(--text-muted)',
                                fontWeight: 500,
                                marginLeft: '0.5rem',
                            }}>
                                (OCDE · Banco Mundial · Eurostat)
                            </span>
                        </h4>

                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                            gap: '0.5rem',
                        }}>
                            {DIMENSIONS.map((dim) => (
                                <div
                                    key={dim.name}
                                    style={{
                                        padding: '0.65rem 0.75rem',
                                        borderRadius: 'var(--radius-md)',
                                        background: isLight
                                            ? `${dim.color}08`
                                            : `${dim.color}0A`,
                                        border: `1px solid ${dim.color}20`,
                                        transition: 'all 0.2s',
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.borderColor = `${dim.color}50`;
                                        e.currentTarget.style.transform = 'translateY(-1px)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.borderColor = `${dim.color}20`;
                                        e.currentTarget.style.transform = '';
                                    }}
                                >
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.35rem',
                                        marginBottom: '0.3rem',
                                    }}>
                                        <span style={{ fontSize: '0.9rem' }}>{dim.icon}</span>
                                        <span style={{
                                            fontSize: '0.75rem',
                                            fontWeight: 700,
                                            color: dim.color,
                                        }}>
                                            {dim.name}
                                        </span>
                                    </div>
                                    <p style={{
                                        fontSize: '0.68rem',
                                        color: 'var(--text-muted)',
                                        lineHeight: 1.45,
                                        margin: 0,
                                    }}>
                                        {dim.description}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Key stats */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                        gap: '0.5rem',
                    }}>
                        {KEY_STATS.map((stat) => (
                            <div
                                key={stat.label}
                                className="glass"
                                style={{
                                    padding: '0.65rem 0.85rem',
                                    borderRadius: 'var(--radius-md)',
                                    textAlign: 'center',
                                }}
                            >
                                <span style={{
                                    fontSize: '1.25rem',
                                    fontWeight: 800,
                                    color: 'var(--celeste)',
                                    display: 'block',
                                }}>
                                    {stat.value}
                                </span>
                                <span style={{
                                    fontSize: '0.65rem',
                                    color: 'var(--text-muted)',
                                    fontWeight: 500,
                                    lineHeight: 1.3,
                                }}>
                                    {stat.label}
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* Source */}
                    <span style={{
                        fontSize: '0.65rem',
                        color: 'var(--text-muted)',
                        fontStyle: 'italic',
                    }}>
                        Fuentes: OCDE, Banco Mundial, Eurostat, BID, CAF-AdS-SIP, CIPPEC · 2024
                    </span>
                </div>
            )}
        </div>
    );
}
