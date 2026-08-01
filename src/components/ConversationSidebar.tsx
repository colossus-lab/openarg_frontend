'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';

const PAGE_SIZE = 30;

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
    chart_data?: Record<string, unknown>[] | null;
    map_data?: Record<string, unknown> | null;
    documents?: Record<string, unknown>[] | null;
    confidence?: number | null;
    ui_trace?: Record<string, unknown> | null;
    errored?: boolean;
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

function mergeUniqueConversations(
    existing: ConversationSummary[],
    incoming: ConversationSummary[],
): ConversationSummary[] {
    if (incoming.length === 0) return existing;
    const byId = new Map<string, ConversationSummary>();
    for (const item of existing) byId.set(item.id, item);
    for (const item of incoming) byId.set(item.id, item);
    return Array.from(byId.values());
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
    const [loadingMore, setLoadingMore] = useState(false);
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
    const [deleteError, setDeleteError] = useState<{ id: string; message: string } | null>(null);
    const [offset, setOffset] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const lastFetchRef = useRef<number>(0);
    const pageCacheRef = useRef(new Map<number, ConversationSummary[]>());
    const loadedOffsetsRef = useRef(new Set<number>());

    // Minimum interval (ms) between conversation list fetches
    const FETCH_COOLDOWN_MS = 2000;

    const fetchConversations = useCallback(async (force = false) => {
        if (!userId) return;
        // Skip if fetched recently, unless forced (e.g. refreshKey change)
        const now = Date.now();
        const cachedFirstPage = pageCacheRef.current.get(0);
        if (!force && cachedFirstPage && now - lastFetchRef.current < FETCH_COOLDOWN_MS) {
            setConversations(cachedFirstPage);
            setOffset(cachedFirstPage.length);
            setHasMore(cachedFirstPage.length >= PAGE_SIZE);
            return;
        }
        lastFetchRef.current = now;
        setLoading(true);
        try {
            const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: '0' });
            params.set('user_email', userId);
            const res = await fetch(`/api/conversations?${params.toString()}`);
            if (res.ok) {
                const data: ConversationSummary[] = await res.json();
                pageCacheRef.current = new Map([[0, data]]);
                loadedOffsetsRef.current = new Set([0]);
                setConversations(data);
                setOffset(data.length);
                setHasMore(data.length >= PAGE_SIZE);
            }
        } catch (err) {
            console.warn('[Sidebar] Failed to fetch conversations', err);
        } finally {
            setLoading(false);
        }
    }, [userId]);

    const loadMore = useCallback(async () => {
        if (!userId || loadingMore || !hasMore) return;
        const nextOffset = offset;
        if (loadedOffsetsRef.current.has(nextOffset)) return;
        const cachedPage = pageCacheRef.current.get(nextOffset);
        if (cachedPage) {
            setConversations((prev) => mergeUniqueConversations(prev, cachedPage));
            loadedOffsetsRef.current.add(nextOffset);
            setOffset(nextOffset + cachedPage.length);
            setHasMore(cachedPage.length >= PAGE_SIZE);
            return;
        }
        setLoadingMore(true);
        try {
            const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(nextOffset) });
            params.set('user_email', userId);
            const res = await fetch(`/api/conversations?${params.toString()}`);
            if (res.ok) {
                const data: ConversationSummary[] = await res.json();
                pageCacheRef.current.set(nextOffset, data);
                loadedOffsetsRef.current.add(nextOffset);
                setConversations((prev) => mergeUniqueConversations(prev, data));
                setOffset(nextOffset + data.length);
                setHasMore(data.length >= PAGE_SIZE);
            }
        } catch (err) {
            console.warn('[Sidebar] Failed to load more conversations', err);
        } finally {
            setLoadingMore(false);
        }
    }, [userId, loadingMore, hasMore, offset]);

    useEffect(() => {
        if (isOpen || !isCollapsed) {
            fetchConversations();
        }
    }, [isOpen, isCollapsed, fetchConversations]);

    // Re-fetch when a new conversation is saved (force bypass cooldown)
    useEffect(() => {
        if (refreshKey && refreshKey > 0) {
            fetchConversations(true);
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
        setDeleteError(null);
        try {
            const res = await fetch(`/api/conversations/${id}`, { method: 'DELETE' });
            if (res.ok) {
                for (const [pageOffset, page] of pageCacheRef.current.entries()) {
                    pageCacheRef.current.set(pageOffset, page.filter((c) => c.id !== id));
                }
                setConversations((prev) => prev.filter((c) => c.id !== id));
                setDeleteConfirmId(null);
                onDeleteConversation?.(id);
                return;
            }

            // Antes no había rama para el fallo: un 429 dejaba la conversación
            // en la lista, el diálogo abierto y ningún mensaje. El `catch` sólo
            // cubre errores de red, no códigos de error HTTP, así que borrar
            // varias seguidas se leía como que la app dejaba de responder.
            if (res.status === 429) {
                const retryAfter = Number(res.headers.get('Retry-After')) || 0;
                setDeleteError({
                    id,
                    message: retryAfter
                        ? `Estás borrando muy rápido. Probá de nuevo en ${retryAfter} segundos.`
                        : 'Estás borrando muy rápido. Probá de nuevo en un minuto.',
                });
                return;
            }

            const body = await res.json().catch(() => null);
            setDeleteError({
                id,
                message:
                    typeof body?.error === 'string'
                        ? body.error
                        : 'No se pudo eliminar la conversación.',
            });
        } catch (err) {
            console.warn('[Sidebar] Failed to delete conversation', err);
            setDeleteError({ id, message: 'No se pudo conectar. Revisá tu conexión.' });
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

    // Swipe left to close on mobile
    const touchStartX = useRef<number | null>(null);
    const handleTouchStart = (e: React.TouchEvent) => {
        touchStartX.current = e.touches[0].clientX;
    };
    const handleTouchEnd = (e: React.TouchEvent) => {
        if (touchStartX.current === null) return;
        const diff = touchStartX.current - e.changedTouches[0].clientX;
        touchStartX.current = null;
        // Swipe left > 60px → close
        if (diff > 60) onClose();
    };

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
                    aria-label="Abrir sidebar"
                >
                    &#187;
                </button>
            )}

            <aside className={sidebarClasses} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
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
                        aria-label="Ocultar sidebar"
                    >
                        &#171;
                    </button>
                    <button className="sidebar-close-btn" onClick={onClose} title="Cerrar" aria-label="Cerrar sidebar">
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
                                        aria-label="Confirmar eliminacion"
                                    >
                                        Eliminar
                                    </button>
                                    <button
                                        className="sidebar-delete-cancel"
                                        onClick={() => {
                                            setDeleteConfirmId(null);
                                            setDeleteError(null);
                                        }}
                                        title="Cancelar"
                                        aria-label="Cancelar eliminacion"
                                    >
                                        &times;
                                    </button>
                                    {deleteError?.id === conv.id && (
                                        <span
                                            className="sidebar-delete-error"
                                            role="status"
                                            aria-live="polite"
                                        >
                                            {deleteError.message}
                                        </span>
                                    )}
                                </div>
                            ) : (
                                <button
                                    className="sidebar-item-delete"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setDeleteConfirmId(conv.id);
                                        setDeleteError(null);
                                    }}
                                    title="Eliminar conversacion"
                                    aria-label="Eliminar conversacion"
                                >
                                    &#128465;
                                </button>
                            )}
                        </div>
                    ))}

                    {conversations.length > 0 && hasMore && !loading && (
                        <button
                            className="sidebar-new-btn"
                            onClick={loadMore}
                            disabled={loadingMore}
                            style={{ marginTop: '0.5rem', opacity: loadingMore ? 0.6 : 1 }}
                        >
                            {loadingMore ? 'Cargando...' : 'Cargar mas'}
                        </button>
                    )}
                </div>

            </aside>
        </>
    );
}
