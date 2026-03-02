'use client';

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'openarg-theme';

export default function ThemeToggle() {
    const [theme, setTheme] = useState<'dark' | 'light'>('dark');

    useEffect(() => {
        const stored = localStorage.getItem(STORAGE_KEY);
        const initial = stored === 'light' ? 'light' : 'dark';
        setTheme(initial);
    }, []);

    const toggle = () => {
        const next = theme === 'dark' ? 'light' : 'dark';
        setTheme(next);
        localStorage.setItem(STORAGE_KEY, next);
        if (next === 'light') {
            document.documentElement.setAttribute('data-theme', 'light');
        } else {
            document.documentElement.removeAttribute('data-theme');
        }
    };

    return (
        <button
            className="theme-toggle"
            onClick={toggle}
            title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
        >
            {theme === 'dark' ? '☀️' : '🌙'}
        </button>
    );
}
