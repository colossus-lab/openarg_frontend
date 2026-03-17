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
/* Maturity Levels                                                     */
/* ------------------------------------------------------------------ */
const MATURITY_LEVELS = [
    {
        level: 1,
        name: 'Administración Electrónica',
        description: 'Réplica digital de procesos en papel. El objetivo es eliminar filas y presencialidad.',
        icon: '📄',
        color: '#F87171',
    },
    {
        level: 2,
        name: 'Administración Interoperable',
        description: 'Las instituciones intercambian datos. El ciudadano no aporta información que el Estado ya posee ("Solo una vez").',
        icon: '🔗',
        color: '#FB923C',
    },
    {
        level: 3,
        name: 'Administración Automatizada',
        description: 'Procedimientos basados en algoritmos: turnos automáticos, licencias de bajo riesgo sin intervención humana.',
        icon: '⚙️',
        color: '#F6B40E',
    },
    {
        level: 4,
        name: 'Administración Proactiva',
        description: 'El Estado se adelanta a las necesidades del ciudadano basado en eventos de vida (ej: vacantes escolares al nacer un niño).',
        icon: '🚀',
        color: '#34D399',
    },
];

/* ------------------------------------------------------------------ */
/* Strategic Pillars                                                   */
/* ------------------------------------------------------------------ */
const PILLARS = [
    {
        icon: '🏛️',
        title: 'Gobernanza e Institucionalidad',
        subtitle: 'El Quién',
        color: '#74ACDF',
        points: [
            'El intendente debe ser el principal patrocinador de la transformación',
            'Crear Secretaría de Modernización con autoridad transversal',
            'Diseñar un plan de acción con hitos a corto y largo plazo',
        ],
    },
    {
        icon: '📜',
        title: 'Marco Normativo',
        subtitle: 'El Cómo',
        color: '#A78BFA',
        points: [
            'Adhesión a Firma Digital y Gestión Documental Electrónica (GDE)',
            'Ordenanzas de Transparencia y Datos Abiertos',
            'Protocolos de privacidad y ciberseguridad',
        ],
    },
    {
        icon: '👥',
        title: 'Talento Digital',
        subtitle: 'El Con Quién',
        color: '#F6B40E',
        points: [
            'Solo el 33% del personal usa computadoras en municipios pequeños',
            'Convenios con universidades para retener desarrolladores',
            'Programas de alfabetización digital y mitigación del miedo al cambio',
        ],
    },
    {
        icon: '🖥️',
        title: 'Infraestructura',
        subtitle: 'El Con Qué',
        color: '#FB923C',
        points: [
            'Servicios compartidos: usar herramientas de Nación/Provincia (País Digital)',
            'Nube por defecto para reducir costos y riesgos de seguridad',
            'Priorizar software de código abierto (Open Source)',
        ],
    },
    {
        icon: '🎯',
        title: 'Procesos Centrados en Personas',
        subtitle: 'El Para Qué',
        color: '#34D399',
        points: [
            'Simplificar antes de digitalizar: no automatizar trámites inútiles',
            'Pruebas de usabilidad con ciudadanos reales',
            'Ventanilla Única: centralizar trámites con identidad digital',
        ],
    },
];

export default function DigitalizationGuide() {
    const isLight = useTheme();
    const [expanded, setExpanded] = useState(true);
    const [expandedPillar, setExpandedPillar] = useState<number | null>(null);

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
                🗺️ ABC para la Digitalización Municipal
                <span style={{
                    fontSize: '0.72rem',
                    padding: '0.15rem 0.5rem',
                    borderRadius: '999px',
                    background: isLight ? 'rgba(52,211,153,0.10)' : 'rgba(52,211,153,0.12)',
                    color: isLight ? '#0F7B50' : '#34D399',
                    fontWeight: 600,
                }}>
                    Hoja de Ruta
                </span>
            </button>

            {expanded && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {/* Intro callout */}
                    <div className="glass" style={{
                        borderRadius: 'var(--radius-lg)',
                        padding: '1rem 1.25rem',
                        borderColor: 'rgba(116,172,223,0.2)',
                    }}>
                        <p style={{
                            fontSize: '0.78rem',
                            color: 'var(--text-secondary)',
                            lineHeight: 1.55,
                            margin: 0,
                        }}>
                            La transformación digital no es solo tecnológica — es un desafío de gestión política.
                            Un municipio que opera con registros en papel no necesita &quot;automatizar el caos&quot;,
                            sino transitar un camino estratégico de 4 niveles de madurez y 5 pilares fundamentales.
                        </p>
                    </div>

                    {/* Maturity Timeline */}
                    <div className="glass" style={{
                        borderRadius: 'var(--radius-lg)',
                        padding: '1.25rem',
                    }}>
                        <h4 style={{
                            fontSize: '0.82rem',
                            fontWeight: 700,
                            color: 'var(--text-primary)',
                            marginBottom: '1rem',
                        }}>
                            Niveles de Madurez Digital
                            <span style={{
                                fontSize: '0.6rem',
                                color: 'var(--text-muted)',
                                fontWeight: 500,
                                marginLeft: '0.5rem',
                            }}>
                                (BID · OCDE)
                            </span>
                        </h4>

                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                            gap: '0',
                            position: 'relative',
                        }}>
                            {MATURITY_LEVELS.map((m, i) => (
                                <div
                                    key={m.level}
                                    style={{
                                        padding: '0.85rem',
                                        position: 'relative',
                                        borderLeft: `3px solid ${m.color}`,
                                        marginLeft: i > 0 ? 0 : undefined,
                                    }}
                                >
                                    {/* Level number circle */}
                                    <div style={{
                                        position: 'absolute',
                                        left: -12,
                                        top: '0.85rem',
                                        width: 22,
                                        height: 22,
                                        borderRadius: '50%',
                                        background: m.color,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '0.65rem',
                                        fontWeight: 800,
                                        color: '#fff',
                                    }}>
                                        {m.level}
                                    </div>

                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.35rem',
                                        marginBottom: '0.3rem',
                                    }}>
                                        <span style={{ fontSize: '0.9rem' }}>{m.icon}</span>
                                        <span style={{
                                            fontSize: '0.75rem',
                                            fontWeight: 700,
                                            color: m.color,
                                        }}>
                                            {m.name}
                                        </span>
                                    </div>
                                    <p style={{
                                        fontSize: '0.68rem',
                                        color: 'var(--text-muted)',
                                        lineHeight: 1.45,
                                        margin: 0,
                                    }}>
                                        {m.description}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Strategic Pillars */}
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
                            Los 5 Pilares de la Hoja de Ruta
                        </h4>

                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.4rem',
                        }}>
                            {PILLARS.map((pillar, i) => {
                                const isOpen = expandedPillar === i;
                                return (
                                    <div key={pillar.title}>
                                        <button
                                            onClick={() => setExpandedPillar(isOpen ? null : i)}
                                            style={{
                                                width: '100%',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.5rem',
                                                padding: '0.6rem 0.75rem',
                                                borderRadius: 'var(--radius-md)',
                                                border: `1px solid ${pillar.color}${isOpen ? '40' : '20'}`,
                                                background: isOpen
                                                    ? `${pillar.color}${isLight ? '0A' : '0D'}`
                                                    : 'transparent',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s',
                                                fontFamily: "'Inter', sans-serif",
                                                textAlign: 'left',
                                            }}
                                            onMouseEnter={(e) => {
                                                if (!isOpen) e.currentTarget.style.borderColor = `${pillar.color}35`;
                                            }}
                                            onMouseLeave={(e) => {
                                                if (!isOpen) e.currentTarget.style.borderColor = `${pillar.color}20`;
                                            }}
                                        >
                                            <span style={{ fontSize: '1rem' }}>{pillar.icon}</span>
                                            <div style={{ flex: 1 }}>
                                                <span style={{
                                                    fontSize: '0.78rem',
                                                    fontWeight: 700,
                                                    color: pillar.color,
                                                }}>
                                                    {pillar.title}
                                                </span>
                                                <span style={{
                                                    fontSize: '0.62rem',
                                                    color: 'var(--text-muted)',
                                                    fontWeight: 500,
                                                    marginLeft: '0.5rem',
                                                }}>
                                                    {pillar.subtitle}
                                                </span>
                                            </div>
                                            <span style={{
                                                transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)',
                                                transition: 'transform 0.2s',
                                                fontSize: '0.65rem',
                                                color: 'var(--text-muted)',
                                            }}>
                                                ▶
                                            </span>
                                        </button>

                                        {isOpen && (
                                            <div style={{
                                                padding: '0.5rem 0.75rem 0.5rem 2.5rem',
                                            }}>
                                                <ul style={{
                                                    margin: 0,
                                                    paddingLeft: '1rem',
                                                    fontSize: '0.72rem',
                                                    color: 'var(--text-secondary)',
                                                    lineHeight: 1.8,
                                                }}>
                                                    {pillar.points.map((point, j) => (
                                                        <li key={j}>{point}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Source */}
                    <span style={{
                        fontSize: '0.65rem',
                        color: 'var(--text-muted)',
                        fontStyle: 'italic',
                    }}>
                        Fuentes: BID, OCDE, CAF, CIPPEC, País Digital · Guía de Transformación Digital del Gobierno 2024
                    </span>
                </div>
            )}
        </div>
    );
}
