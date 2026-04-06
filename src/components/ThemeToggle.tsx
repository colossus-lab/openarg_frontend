'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

const STORAGE_KEY = 'openarg-theme';

function readStoredTheme(): 'dark' | 'light' {
    if (typeof window === 'undefined') return 'light';
    return localStorage.getItem(STORAGE_KEY) === 'dark' ? 'dark' : 'light';
}

function applyTheme(theme: 'dark' | 'light') {
    if (theme === 'light') {
        document.documentElement.setAttribute('data-theme', 'light');
    } else {
        document.documentElement.removeAttribute('data-theme');
    }
}

export default function ThemeToggle() {
    const [theme, setTheme] = useState<'dark' | 'light'>(readStoredTheme);
    const t = useTranslations('themeToggle');

    useEffect(() => {
        applyTheme(theme);
    }, [theme]);

    const toggle = () => {
        const next = theme === 'dark' ? 'light' : 'dark';
        setTheme(next);
        localStorage.setItem(STORAGE_KEY, next);
    };

    return (
        <button
            className="theme-toggle"
            onClick={toggle}
            title={theme === 'dark' ? t('toLight') : t('toDark')}
            aria-label={theme === 'dark' ? t('toLight') : t('toDark')}
        >
            {theme === 'dark' ? '☀️' : '🌙'}
        </button>
    );
}
