'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

interface ConversationSummary {
    id: string;
    title: string;
    created_at: string;
    updated_at: string;
}

interface MessageResponse {
    id: string;
    conversation_id: string;
    role: string;
    content: string;
    sources: Record<string, unknown>[];
    created_at: string;
    feedback?: string | null;
    feedback_comment?: string | null;
}

interface ConversationDetail {
    id: string;
    title: string;
    created_at: string;
    updated_at: string;
    messages: MessageResponse[];
}

interface ConversationSidebarProps {
    isOpen: boolean;
    isCollapsed: boolean;
    onClose: () => void;
    onToggleCollapse: () => void;
    onSelectConversation: (detail: ConversationDetail) => void;
    onNewConversation: () => void;
    onDeleteConversation?: (id: string) => void;
    userId?: string;
    refreshKey?: number;
}

export default function ConversationSidebar({
    isOpen,
    isCollapsed,
    onClose,
    onToggleCollapse,
    onSelectConversation,
    onNewConversation,
    onDeleteConversation,
    userId,
    refreshKey,
}: ConversationSidebarProps) {
    const [conversations, setConversations] = useState<ConversationSummary[]>([]);
    const [loading, setLoading] = useState(false);
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

    const fetchConversations = useCallback(async () => {
        if (!userId) return;
        setLoading(true);
        try {
            const params = new URLSearchParams({ limit: '30', offset: '0' });
            params.set('user_email', userId);
            const res = await fetch(`/api/conversations?${params.toString()}`);
            if (res.ok) {
                const data = await res.json();
                setConversations(data);
            }
        } catch (err) {
            console.warn('[Sidebar] Failed to fetch conversations', err);
        } finally {
            setLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        if (isOpen || !isCollapsed) {
            fetchConversations();
        }
    }, [isOpen, isCollapsed, fetchConversations]);

    // Re-fetch when a new conversation is saved
    useEffect(() => {
        if (refreshKey && refreshKey > 0) {
            fetchConversations();
        }
    }, [refreshKey, fetchConversations]);

    const handleSelect = async (id: string) => {
        try {
            const res = await fetch(`/api/conversations/${id}`);
            if (res.ok) {
                const detail: ConversationDetail = await res.json();
                onSelectConversation(detail);
            }
        } catch (err) {
            console.warn('[Sidebar] Failed to load conversation', err);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            const res = await fetch(`/api/conversations/${id}`, { method: 'DELETE' });
            if (res.ok) {
                setConversations((prev) => prev.filter((c) => c.id !== id));
                setDeleteConfirmId(null);
                onDeleteConversation?.(id);
            }
        } catch (err) {
            console.warn('[Sidebar] Failed to delete conversation', err);
        }
    };

    const formatDate = (dateStr: string) => {
        try {
            const date = new Date(dateStr);
            const now = new Date();
            const diffMs = now.getTime() - date.getTime();
            const diffHours = diffMs / (1000 * 60 * 60);
            const diffDays = diffMs / (1000 * 60 * 60 * 24);

            if (diffHours < 1) {
                const mins = Math.floor(diffMs / (1000 * 60));
                if (mins < 1) return 'hace un momento';
                return `hace ${mins}m`;
            }
            if (diffHours < 24) {
                return `hace ${Math.floor(diffHours)}h`;
            }
            if (diffDays < 7) {
                return `hace ${Math.floor(diffDays)}d`;
            }
            return date.toLocaleDateString('es-AR', {
                day: 'numeric',
                month: 'short',
            });
        } catch {
            return '';
        }
    };

    // Desktop collapsed: show expand button only
    // Desktop expanded: show full sidebar
    // Mobile: overlay behavior via isOpen
    const sidebarClasses = [
        'conversation-sidebar',
        isOpen ? 'open' : '',
        isCollapsed ? 'collapsed' : '',
    ].filter(Boolean).join(' ');

    return (
        <>
            {/* Overlay for mobile */}
            {isOpen && (
                <div className="sidebar-overlay" onClick={onClose} />
            )}

            {/* Desktop expand button when collapsed */}
            {isCollapsed && (
                <button
                    className="sidebar-expand-btn"
                    onClick={onToggleCollapse}
                    title="Abrir sidebar"
                >
                    &#187;
                </button>
            )}

            <aside className={sidebarClasses}>
                {/* Header with collapse toggle */}
                <div className="sidebar-header">
                    <Link href="/" className="sidebar-header-link">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src="/flag-icon.svg" alt="OpenArg" className="sidebar-header-logo" />
                        <span className="sidebar-header-text">OpenArg</span>
                    </Link>
                    <button
                        className="sidebar-collapse-btn"
                        onClick={onToggleCollapse}
                        title="Ocultar sidebar"
                    >
                        &#171;
                    </button>
                    <button className="sidebar-close-btn" onClick={onClose} title="Cerrar">
                        &times;
                    </button>
                </div>

                {/* New conversation button */}
                <button className="sidebar-new-btn" onClick={onNewConversation}>
                    + Nueva conversacion
                </button>

                {/* Conversations list */}
                <div className="sidebar-list">
                    {loading && (
                        <div className="sidebar-loading">
                            <div className="thinking-dots">
                                <span></span>
                                <span></span>
                                <span></span>
                            </div>
                        </div>
                    )}

                    {!loading && conversations.length === 0 && (
                        <div className="sidebar-empty">
                            No hay conversaciones anteriores
                        </div>
                    )}

                    {conversations.map((conv) => (
                        <div key={conv.id} className="sidebar-item">
                            <button
                                className="sidebar-item-btn"
                                onClick={() => handleSelect(conv.id)}
                            >
                                <span className="sidebar-item-title">
                                    {(conv.title || 'Sin titulo').length > 45
                                        ? (conv.title || 'Sin titulo').slice(0, 45) + '...'
                                        : (conv.title || 'Sin titulo')}
                                </span>
                                <span className="sidebar-item-date">
                                    {formatDate(conv.updated_at)}
                                </span>
                            </button>

                            {deleteConfirmId === conv.id ? (
                                <div className="sidebar-delete-confirm">
                                    <button
                                        className="sidebar-delete-confirm-btn"
                                        onClick={() => handleDelete(conv.id)}
                                        title="Confirmar eliminacion"
                                    >
                                        Eliminar
                                    </button>
                                    <button
                                        className="sidebar-delete-cancel"
                                        onClick={() => setDeleteConfirmId(null)}
                                        title="Cancelar"
                                    >
                                        &times;
                                    </button>
                                </div>
                            ) : (
                                <button
                                    className="sidebar-item-delete"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setDeleteConfirmId(conv.id);
                                    }}
                                    title="Eliminar conversacion"
                                >
                                    &#128465;
                                </button>
                            )}
                        </div>
                    ))}
                </div>

            </aside>
        </>
    );
}
