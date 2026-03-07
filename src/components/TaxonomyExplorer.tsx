'use client';

import { useState, useEffect } from 'react';

interface TaxonomyCategory {
    label: string;
    actions: string[];
    cache_pattern: string[];
}

interface TaxonomyDomain {
    label: string;
    children: Record<string, TaxonomyCategory>;
}

type Taxonomy = Record<string, TaxonomyDomain>;

const DOMAIN_ICONS: Record<string, string> = {
    economia: '📊',
    gobierno: '🏛️',
    social: '🤝',
    infraestructura: '🏗️',
    recursos_naturales: '🌿',
    ciencia: '🔬',
};

const DOMAIN_COLORS: Record<string, string> = {
    economia: '#F6B40E',
    gobierno: '#74ACDF',
    social: '#34D399',
    infraestructura: '#FB923C',
    recursos_naturales: '#A78BFA',
    ciencia: '#60A5FA',
};

const ACTION_LABELS: Record<string, string> = {
    query_series: 'Series de Tiempo',
    query_sandbox: 'SQL Sandbox',
    query_argentina_datos: 'APIs en vivo',
    query_bcra: 'BCRA',
    query_ddjj: 'Declaraciones Juradas',
    query_sesiones: 'Sesiones del Congreso',
    query_staff: 'Personal legislativo',
    search_ckan: 'Portales CKAN',
};

interface TaxonomyExplorerProps {
    onCategoryClick?: (domain: string, category: string, label: string) => void;
}

export default function TaxonomyExplorer({ onCategoryClick }: TaxonomyExplorerProps) {
    const [taxonomy, setTaxonomy] = useState<Taxonomy | null>(null);
    const [expandedDomain, setExpandedDomain] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/taxonomy')
            .then((r) => r.json())
            .then((data) => {
                if (!data.error) setTaxonomy(data);
            })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <div className="taxonomy-explorer">
                <div className="taxonomy-loading">
                    <div className="taxonomy-loading-pulse" />
                    <span>Cargando taxonomía...</span>
                </div>
            </div>
        );
    }

    if (!taxonomy) return null;

    const domains = Object.entries(taxonomy);
    const totalCategories = domains.reduce(
        (acc, [, d]) => acc + Object.keys(d.children).length,
        0
    );

    return (
        <div className="taxonomy-explorer">
            <div className="taxonomy-header">
                <h3 className="taxonomy-title">Taxonomía de Datos</h3>
                <span className="taxonomy-meta">
                    {domains.length} dominios · {totalCategories} categorías
                </span>
            </div>

            <div className="taxonomy-grid">
                {domains.map(([key, domain]) => {
                    const isExpanded = expandedDomain === key;
                    const categories = Object.entries(domain.children);
                    const color = DOMAIN_COLORS[key] || '#74ACDF';
                    const icon = DOMAIN_ICONS[key] || '📁';

                    return (
                        <div
                            key={key}
                            className={`taxonomy-domain ${isExpanded ? 'expanded' : ''}`}
                            style={{
                                '--domain-color': color,
                                '--domain-color-bg': `${color}15`,
                                '--domain-color-border': `${color}30`,
                            } as React.CSSProperties}
                        >
                            <button
                                className="taxonomy-domain-header"
                                onClick={() => setExpandedDomain(isExpanded ? null : key)}
                            >
                                <span className="taxonomy-domain-icon">{icon}</span>
                                <span className="taxonomy-domain-label">{domain.label}</span>
                                <span className="taxonomy-domain-count">{categories.length}</span>
                                <span className={`taxonomy-chevron ${isExpanded ? 'open' : ''}`}>
                                    ›
                                </span>
                            </button>

                            <div className={`taxonomy-categories ${isExpanded ? 'visible' : ''}`}>
                                {categories.map(([catKey, cat]) => (
                                    <button
                                        key={catKey}
                                        className="taxonomy-category"
                                        onClick={() =>
                                            onCategoryClick?.(key, catKey, cat.label)
                                        }
                                    >
                                        <span className="taxonomy-category-label">
                                            {cat.label}
                                        </span>
                                        <div className="taxonomy-category-actions">
                                            {cat.actions.map((a) => (
                                                <span key={a} className="taxonomy-action-tag">
                                                    {ACTION_LABELS[a] || a}
                                                </span>
                                            ))}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
