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
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default memo(SourcePanelComponent);
