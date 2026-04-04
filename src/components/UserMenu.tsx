'use client';

import { useState, useRef, useEffect } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import ApiKeyDialog from './ApiKeyDialog';
import ConfirmDialog from './ConfirmDialog';

export default function UserMenu() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const t = useTranslations('userMenu');
    const [open, setOpen] = useState(false);
    const [imgError, setImgError] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [saveHistory, setSaveHistory] = useState(true);
    const [showHistoryDialog, setShowHistoryDialog] = useState(false);
    const [togglingHistory, setTogglingHistory] = useState(false);
    const [apiKey, setApiKey] = useState<{ id: string; key_prefix: string; is_active: boolean; created_at: string | null } | null>(null);
    const [newApiKey, setNewApiKey] = useState<string | null>(null);
    const [apiKeyLoading, setApiKeyLoading] = useState(false);
    const [showRevokeDialog, setShowRevokeDialog] = useState(false);
    const [revokingKey, setRevokingKey] = useState(false);
    const [showApiKeyDialog, setShowApiKeyDialog] = useState(false);
    const [apiUsage, setApiUsage] = useState<{ requests_today: number; total_requests: number } | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    // Fetch save_history setting on mount
    useEffect(() => {
        if (status !== 'authenticated') return;
        fetch('/api/users/me')
            .then((r) => r.ok ? r.json() : null)
            .then((data) => {
                if (data && typeof data.save_history === 'boolean') {
                    setSaveHistory(data.save_history);
                }
            })
            .catch(() => {});
    }, [status]);

    // Fetch existing API key and usage on mount
    useEffect(() => {
        if (status !== 'authenticated') return;
        fetch('/api/developers/keys')
            .then((r) => r.ok ? r.json() : [])
            .then((keys: Array<{ id: string; key_prefix: string; is_active: boolean; created_at: string | null }>) => {
                const active = keys.find((k) => k.is_active);
                if (active) setApiKey(active);
            })
            .catch(() => {});
        fetch('/api/developers/usage')
            .then((r) => r.ok ? r.json() : null)
            .then((data) => { if (data) setApiUsage(data); })
            .catch(() => {});
    }, [status]);

    const handleCreateApiKey = async () => {
        setApiKeyLoading(true);
        try {
            const res = await fetch('/api/developers/keys', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: 'My API Key' }),
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                alert(err.detail || t('apiKeyError'));
                return;
            }
            const data = await res.json();
            setNewApiKey(data.key);
            setApiKey({ id: data.id, key_prefix: data.key_prefix, is_active: true, created_at: new Date().toISOString() });
            setShowApiKeyDialog(true);
            setOpen(false);
        } catch {
            alert(t('apiKeyError'));
        } finally {
            setApiKeyLoading(false);
        }
    };

    const handleRegenerateApiKey = async () => {
        setRevokingKey(true);
        try {
            // Create new key (backend auto-revokes the old one)
            await handleCreateApiKey();
            setShowRevokeDialog(false);
        } catch {
            alert(t('apiKeyError'));
        } finally {
            setRevokingKey(false);
        }
    };

    // Close dropdown on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setOpen(false);
                setShowSettings(false);
            }
        };
        if (open) document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    const handleExportData = async () => {
        try {
            const res = await fetch('/api/users/me/data');
            if (!res.ok) throw new Error('Error');
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
            alert(t('exportError'));
        }
        setOpen(false);
    };

    const handleToggleHistory = () => {
        if (saveHistory) {
            setShowHistoryDialog(true);
        } else {
            confirmToggleHistory();
        }
    };

    const confirmToggleHistory = async () => {
        setTogglingHistory(true);
        try {
            const newValue = !saveHistory;
            const res = await fetch('/api/users/me/settings', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ save_history: newValue }),
            });
            if (!res.ok) throw new Error('Error');
            setSaveHistory(newValue);
            setShowHistoryDialog(false);
        } catch {
            alert(t('historyError'));
        }
        setTogglingHistory(false);
    };

    const handleDeleteAccount = () => {
        setShowDeleteDialog(true);
    };

    const confirmDeleteAccount = async () => {
        setDeleting(true);
        try {
            const res = await fetch('/api/users/me', { method: 'DELETE' });
            if (!res.ok) throw new Error('Error');
            setShowDeleteDialog(false);
            await signOut({ callbackUrl: '/' });
        } catch {
            alert(t('deleteError'));
            setDeleting(false);
        }
    };

    if (status === 'loading') {
        return <div className="user-menu-skeleton" />;
    }

    if (!session) {
        return (
            <button className="user-login-btn" onClick={() => signIn('google')}>
                {t('signIn')}
            </button>
        );
    }

    return (
        <>
            <div className="user-menu" ref={menuRef}>
                <button
                    className="user-menu-trigger"
                    onClick={() => setOpen((prev) => !prev)}
                    aria-expanded={open}
                >
                    {session.user?.image && !imgError ? (
                        <Image
                            src={session.user.image}
                            alt={session.user.name || t('userAlt')}
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
                            onClick={() => setShowSettings((prev) => !prev)}
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="3" />
                                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                            </svg>
                            {t('settings')}
                            <svg
                                className={`user-menu-settings-chevron${showSettings ? ' open' : ''}`}
                                width="10"
                                height="10"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                style={{ marginLeft: 'auto' }}
                            >
                                <polyline points="6 9 12 15 18 9" />
                            </svg>
                        </button>
                        {showSettings && (
                            <>
                                <a
                                    className="user-menu-dropdown-item user-menu-sub-item"
                                    href="/privacy"
                                    onClick={(e) => { e.preventDefault(); setOpen(false); router.push('/privacy'); }}
                                >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ minWidth: 14, flexShrink: 0 }}>
                                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                                    </svg>
                                    {t('privacyPolicy')}
                                </a>
                                <div className="user-menu-dropdown-item user-menu-sub-item user-menu-toggle-row">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ minWidth: 14, flexShrink: 0 }}>
                                        <path d="M12 20h9" />
                                        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                                    </svg>
                                    <span style={{ flex: 1 }}>{t('saveHistory')}</span>
                                    <button
                                        className={`user-menu-toggle${saveHistory ? ' active' : ''}`}
                                        onClick={handleToggleHistory}
                                        disabled={togglingHistory}
                                        aria-label={t('saveHistory')}
                                    >
                                        <span className="user-menu-toggle-knob" />
                                    </button>
                                </div>
                                <button
                                    className="user-menu-dropdown-item user-menu-sub-item"
                                    onClick={handleExportData}
                                >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                        <polyline points="7 10 12 15 17 10" />
                                        <line x1="12" y1="15" x2="12" y2="3" />
                                    </svg>
                                    {t('exportData')}
                                </button>
                                <button
                                    className="user-menu-dropdown-item user-menu-sub-item"
                                    onClick={() => {
                                        if (apiKey) {
                                            setShowRevokeDialog(true);
                                        } else {
                                            handleCreateApiKey();
                                        }
                                    }}
                                    disabled={apiKeyLoading}
                                >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ minWidth: 14, flexShrink: 0 }}>
                                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                    </svg>
                                    {apiKeyLoading ? t('apiKeyCreating') : t('apiKey')}
                                    {apiKey && (
                                        <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <span className="api-key-beta-chip">Free Beta</span>
                                        </span>
                                    )}
                                </button>
                                {apiKey && apiUsage && (
                                    <div className="user-menu-dropdown-item user-menu-sub-item" style={{ fontSize: '0.65rem', color: 'var(--text-muted)', padding: '2px 16px 2px 38px', cursor: 'default' }}>
                                        {apiUsage.requests_today}/5 consultas usadas hoy
                                    </div>
                                )}
                                <button
                                    className="user-menu-dropdown-item user-menu-sub-item delete-account"
                                    onClick={handleDeleteAccount}
                                >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ minWidth: 14, flexShrink: 0 }}>
                                        <polyline points="3 6 5 6 21 6" />
                                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                    </svg>
                                    {t('deleteAccount')}
                                </button>
                            </>
                        )}
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
                            {t('signOut')}
                        </button>
                    </div>
                )}
            </div>

            <ConfirmDialog
                open={showHistoryDialog}
                title={t('historyDialogTitle')}
                message={t('historyWarning')}
                confirmLabel={togglingHistory ? t('deleting') : t('historyConfirmDelete')}
                cancelLabel={t('cancel')}
                onConfirm={confirmToggleHistory}
                onCancel={() => setShowHistoryDialog(false)}
                loading={togglingHistory}
            />

            <ConfirmDialog
                open={showRevokeDialog}
                title={t('apiKeyRevokeConfirmTitle')}
                message={t('apiKeyRevokeConfirmMessage')}
                confirmLabel={revokingKey ? t('apiKeyRegenerating') : t('apiKeyRegenerate')}
                cancelLabel={t('cancel')}
                onConfirm={handleRegenerateApiKey}
                onCancel={() => setShowRevokeDialog(false)}
                loading={revokingKey}
            />

            <ApiKeyDialog
                open={showApiKeyDialog && !!newApiKey}
                apiKey={newApiKey || ''}
                onClose={() => setShowApiKeyDialog(false)}
            />

            <ConfirmDialog
                open={showDeleteDialog}
                title={t('deleteDialogTitle')}
                message={t('deleteDialogMessage')}
                confirmLabel={deleting ? t('deleting') : t('deleteConfirm')}
                cancelLabel={t('cancel')}
                onConfirm={confirmDeleteAccount}
                onCancel={() => setShowDeleteDialog(false)}
                loading={deleting}
            />
        </>
    );
}
