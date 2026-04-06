'use client';

import { useMemo, useState } from 'react';
import { DocumentRecord, DDJJDocumentRecord } from '@/lib/types';

const formatARS = (value: number): string => {
    return new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS',
        maximumFractionDigits: 0,
    }).format(value);
};

const formatCompact = (value: number): string => {
    const abs = Math.abs(value);
    if (abs >= 1_000_000_000_000) return `$${(value / 1_000_000_000_000).toFixed(1)}B`;
    if (abs >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}MM`;
    if (abs >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
    if (abs >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
    return formatARS(value);
};

/* ── DDJJ Card ─────────────────────────────────────────────── */

function DDJJCard({ doc, rank }: { doc: DDJJDocumentRecord; rank?: number }) {
    const [expanded, setExpanded] = useState(false);

    const variationClass = doc.variacion_patrimonial >= 0 ? 'positive' : 'negative';
    const variationSign = doc.variacion_patrimonial >= 0 ? '+' : '';

    const assetEntries = useMemo(
        () =>
            Object.entries(doc.resumen_bienes || {})
                .filter(([, v]) => v > 0)
                .sort(([, a], [, b]) => b - a),
        [doc.resumen_bienes],
    );

    return (
        <div className="doc-card ddjj-card">
            {/* Header: nombre + metadata compacto */}
            <div className="doc-card-header">
                <div className="doc-card-header-top">
                    {rank && <span className="doc-rank">#{rank}</span>}
                    <div className="doc-card-header-info">
                        <span className="doc-card-name">{doc.nombre}</span>
                        <span className="doc-card-meta">
                            {doc.cuit} · {doc.cargo} · {doc.anio_declaracion} — {doc.tipo_declaracion}
                        </span>
                    </div>
                </div>
            </div>

            {/* Patrimonio highlight */}
            <div className="ddjj-card-patrimonio">
                <div className="ddjj-patrimonio-label">Patrimonio Neto al Cierre</div>
                <div className="ddjj-patrimonio-value">{formatARS(doc.patrimonio_cierre)}</div>
            </div>

            {/* Financial grid */}
            <div className="doc-financials">
                <div className="doc-fin-item">
                    <span className="doc-fin-label">Bienes</span>
                    <span className="doc-fin-value">{formatCompact(doc.bienes_cierre)}</span>
                </div>
                <div className="doc-fin-item">
                    <span className="doc-fin-label">Deudas</span>
                    <span className="doc-fin-value">{formatCompact(doc.deudas_cierre)}</span>
                </div>
                <div className="doc-fin-item">
                    <span className="doc-fin-label">Variacion</span>
                    <span className={`doc-fin-value doc-variation ${variationClass}`}>
                        {variationSign}{formatCompact(doc.variacion_patrimonial)}
                    </span>
                </div>
                <div className="doc-fin-item">
                    <span className="doc-fin-label">Ingresos Netos</span>
                    <span className="doc-fin-value">{formatCompact(doc.ingresos_trabajo_neto)}</span>
                </div>
                <div className="doc-fin-item">
                    <span className="doc-fin-label">Gastos</span>
                    <span className="doc-fin-value">{formatCompact(doc.gastos_personales)}</span>
                </div>
            </div>

            {/* Asset chips */}
            {assetEntries.length > 0 && (
                <div className="doc-assets-section">
                    <div className="doc-assets-title">
                        Composicion de Bienes ({doc.cantidad_bienes})
                    </div>
                    <div className="doc-asset-chips">
                        {assetEntries.map(([tipo, importe]) => (
                            <span key={tipo} className="doc-asset-chip">
                                <span className="doc-asset-chip-type">{tipo}</span>
                                <span className="doc-asset-chip-value">{formatCompact(importe)}</span>
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* Expandable detail */}
            {doc.bienes_detalle && doc.bienes_detalle.length > 0 && (
                <div className="doc-detail-section">
                    <button
                        className="doc-detail-toggle"
                        onClick={() => setExpanded(!expanded)}
                    >
                        {expanded ? '▾' : '▸'} {expanded ? 'Ocultar' : 'Ver'} detalle de {doc.bienes_detalle.length} bienes
                    </button>
                    {expanded && (
                        <div className="doc-detail-list">
                            <table className="doc-detail-table">
                                <thead>
                                    <tr>
                                        <th>Tipo</th>
                                        <th>Descripcion</th>
                                        <th>Importe</th>
                                        <th>Titularidad</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {doc.bienes_detalle.map((bien, i) => (
                                        <tr key={`${bien.tipo}-${bien.descripcion}-${bien.importe}-${i}`}>
                                            <td>{bien.tipo}</td>
                                            <td className="doc-detail-desc">{bien.descripcion}</td>
                                            <td className="doc-detail-amount">{formatARS(bien.importe)}</td>
                                            <td>{bien.titularidad}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

/* ── Generic dispatcher ────────────────────────────────────── */

function DocumentCard({ doc, rank }: { doc: DocumentRecord; rank?: number }) {
    switch (doc.doc_type) {
        case 'ddjj':
            return <DDJJCard doc={doc} rank={rank} />;
        default:
            return null;
    }
}

interface DocumentCardsProps {
    documents: DocumentRecord[];
}

export default function DocumentCards({ documents }: DocumentCardsProps) {
    const [showAll, setShowAll] = useState(false);
    const showRank = documents.length > 1;
    const initialCount = 3;
    const visibleDocs = useMemo(
        () => (showAll ? documents : documents.slice(0, initialCount)),
        [documents, showAll],
    );
    const remaining = documents.length - initialCount;

    return (
        <div className="doc-cards-container">
            {visibleDocs.map((doc, i) => (
                <DocumentCard
                    key={
                        doc.doc_type === 'ddjj'
                            ? `${doc.doc_type}-${doc.cuit}-${doc.anio_declaracion}-${doc.tipo_declaracion}`
                            : `${doc.doc_type}-${i}`
                    }
                    doc={doc}
                    rank={showRank ? i + 1 : undefined}
                />
            ))}
            {!showAll && remaining > 0 && (
                <button
                    className="doc-show-more glass-light"
                    onClick={() => setShowAll(true)}
                >
                    Ver {remaining} documento{remaining > 1 ? 's' : ''} mas
                </button>
            )}
        </div>
    );
}
