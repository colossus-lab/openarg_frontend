'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

interface Props {
    open: boolean;
    apiKey: string;
    onClose: () => void;
}

export default function ApiKeyDialog({ open, apiKey, onClose }: Props) {
    const t = useTranslations('userMenu');
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (!open) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [open, onClose]);

    const handleCopy = () => {
        navigator.clipboard.writeText(apiKey);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (!open) return null;

    const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.openarg.org';

    const curlExample = `curl -X POST ${apiBaseUrl}/api/v1/ask \\
  -H "Authorization: Bearer ${apiKey}" \\
  -H "Content-Type: application/json" \\
  -d '{"question": "a cuanto esta el dolar?"}'`;

    return (
        <div className="confirm-dialog-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="confirm-dialog" role="dialog" aria-modal="true" style={{ maxWidth: '520px' }}>
                <div style={{ marginBottom: '8px' }}><span className="api-key-beta-chip">Free Beta</span></div>
                <h3 className="confirm-dialog-title">{t('apiKeyDialogTitle')}</h3>

                <p className="confirm-dialog-message" style={{ marginBottom: '12px' }}>
                    {t('apiKeyDialogInstructions')}
                </p>

                <div className="api-key-display">
                    <code>{apiKey}</code>
                    <button onClick={handleCopy} className="api-key-copy-btn">
                        {copied ? t('apiKeyCopied') : t('apiKeyCopy')}
                    </button>
                </div>

                <p className="api-key-warning">{t('apiKeyWarning')}</p>

                <p className="confirm-dialog-message" style={{ marginBottom: '6px', fontWeight: 500 }}>
                    {t('apiKeyDialogExample')}
                </p>

                <pre className="api-key-curl">{curlExample}</pre>

                <p className="api-key-limits" style={{ marginBottom: '16px' }}>{t('apiKeyDialogLimits')}</p>

                <div className="confirm-dialog-actions">
                    <button
                        className="api-key-close-btn"
                        onClick={onClose}
                    >
                        {t('apiKeyDialogClose')}
                    </button>
                </div>
            </div>
        </div>
    );
}
