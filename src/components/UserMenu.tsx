'use client';

import { useState, useRef, useEffect } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';
import Image from 'next/image';

export default function UserMenu() {
    const { data: session, status } = useSession();
    const [open, setOpen] = useState(false);
    const [imgError, setImgError] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // Close dropdown on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setOpen(false);
                setShowConfirm(false);
            }
        };
        if (open) document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    const handleExportData = async () => {
        try {
            const res = await fetch('/api/users/me/data');
            if (!res.ok) throw new Error('Error al exportar datos');
            const data = await res.json();
            const blob = new Blob([JSON.stringify(data, null, 2)], {
                type: 'application/json',
            });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `openarg-mis-datos-${new Date().toISOString().slice(0, 10)}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch {
            alert('No se pudieron exportar los datos. Intentá de nuevo.');
        }
        setOpen(false);
    };

    const handleDeleteAccount = async () => {
        if (!showConfirm) {
            setShowConfirm(true);
            return;
        }

        setDeleting(true);
        try {
            const res = await fetch('/api/users/me', { method: 'DELETE' });
            if (!res.ok) throw new Error('Error al borrar la cuenta');
            await signOut({ callbackUrl: '/' });
        } catch {
            alert('No se pudo borrar la cuenta. Intentá de nuevo.');
            setDeleting(false);
            setShowConfirm(false);
        }
    };

    if (status === 'loading') {
        return <div className="user-menu-skeleton" />;
    }

    if (!session) {
        return (
            <button className="user-login-btn" onClick={() => signIn('google')}>
                Iniciar sesión
            </button>
        );
    }

    return (
        <div className="user-menu" ref={menuRef}>
            <button
                className="user-menu-trigger"
                onClick={() => setOpen((prev) => !prev)}
                aria-expanded={open}
            >
                {session.user?.image && !imgError ? (
                    <Image
                        src={session.user.image}
                        alt={session.user.name || 'Usuario'}
                        width={28}
                        height={28}
                        className="user-menu-avatar"
                        onError={() => setImgError(true)}
                    />
                ) : (
                    <div className="user-menu-avatar-placeholder">
                        {session.user?.name?.charAt(0) || '?'}
                    </div>
                )}
                <span className="user-menu-name">{session.user?.name?.split(' ')[0]}</span>
                <svg
                    className={`user-menu-chevron${open ? ' open' : ''}`}
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                >
                    <polyline points="6 9 12 15 18 9" />
                </svg>
            </button>

            {open && (
                <div className="user-menu-dropdown">
                    <div className="user-menu-dropdown-header">
                        <span className="user-menu-dropdown-name">{session.user?.name}</span>
                        <span className="user-menu-dropdown-email">{session.user?.email}</span>
                    </div>
                    <div className="user-menu-dropdown-divider" />
                    <button
                        className="user-menu-dropdown-item"
                        onClick={handleExportData}
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="7 10 12 15 17 10" />
                            <line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                        Exportar mis datos
                    </button>
                    <button
                        className="user-menu-dropdown-item delete-account"
                        onClick={handleDeleteAccount}
                        disabled={deleting}
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                        {deleting
                            ? 'Borrando...'
                            : showConfirm
                                ? 'Confirmar borrado permanente'
                                : 'Borrar mi cuenta'}
                    </button>
                    <div className="user-menu-dropdown-divider" />
                    <button
                        className="user-menu-dropdown-item logout"
                        onClick={() => signOut({ callbackUrl: '/login' })}
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                            <polyline points="16 17 21 12 16 7" />
                            <line x1="21" y1="12" x2="9" y2="12" />
                        </svg>
                        Cerrar sesión
                    </button>
                </div>
            )}
        </div>
    );
}
