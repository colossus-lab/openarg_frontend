'use client';

import { useState, memo } from 'react';
import { useTranslations } from 'next-intl';
import { SourceAttribution } from '@/lib/types';

interface Props {
    sources: SourceAttribution[];
}

function SourcePanelComponent({ sources }: Props) {
    const [isOpen, setIsOpen] = useState(false);
    const t = useTranslations('sources');

    if (sources.length === 0) return null;

    return (
        <div className="sources-panel">
            <button className="sources-toggle" onClick={() => setIsOpen(!isOpen)}>
                <span>{isOpen ? '▾' : '▸'}</span>
                <span>{t('toggle', { count: sources.length })}</span>
            </button>
            {isOpen && (
                <div className="sources-list">
                    {sources.map((source, i) => (
                        <div key={i} className="source-item">
                            <span>•</span>
                            <span>{source.portal}:</span>
                            <a href={source.url} target="_blank" rel="noopener noreferrer">
                                {source.name}
                            </a>
                            {source.url && (
                                <a
                                    href={source.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="source-download-btn"
                                    title={t('download')}
                                    aria-label={t('downloadAria', { name: source.name })}
                                >
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                        <polyline points="7 10 12 15 17 10" />
                                        <line x1="12" y1="15" x2="12" y2="3" />
                                    </svg>
                                </a>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default memo(SourcePanelComponent);
