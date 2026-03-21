'use client';

import { useSyncExternalStore, useCallback } from 'react';

const CONSENT_KEY = 'openarg-privacy-consent';

function getSnapshot(): boolean {
    return localStorage.getItem(CONSENT_KEY) !== null;
}

function getServerSnapshot(): boolean {
    return true; // SSR: assume consent given to avoid hydration flash
}

function subscribe(callback: () => void): () => void {
    window.addEventListener('storage', callback);
    return () => window.removeEventListener('storage', callback);
}

export default function PrivacyBanner() {
    const hasConsent = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

    const handleAccept = useCallback(() => {
        localStorage.setItem(CONSENT_KEY, new Date().toISOString());
        // Force re-render by dispatching a storage event manually
        window.dispatchEvent(new StorageEvent('storage', { key: CONSENT_KEY }));
    }, []);

    if (hasConsent) return null;

    return (
        <div className="privacy-banner">
            <p className="privacy-banner-text">
                Al usar OpenArg, acept&aacute;s nuestra{' '}
                <a href="/privacy" className="privacy-banner-link">
                    Pol&iacute;tica de Privacidad
                </a>
                .
            </p>
            <button className="privacy-banner-btn" onClick={handleAccept}>
                Aceptar
            </button>
        </div>
    );
}
