'use client';

import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

interface Props {
    open: boolean;
    title: string;
    message: string;
    confirmLabel: string;
    cancelLabel: string;
    onConfirm: () => void;
    onCancel: () => void;
    loading?: boolean;
    destructive?: boolean;
}

export default function ConfirmDialog({
    open,
    title,
    message,
    confirmLabel,
    cancelLabel,
    onConfirm,
    onCancel,
    loading = false,
    destructive = true,
}: Props) {
    const dialogRef = useRef<HTMLDivElement>(null);

    // Close on Escape
    useEffect(() => {
        if (!open) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onCancel();
        };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [open, onCancel]);

    // Close on backdrop click
    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) onCancel();
    };

    if (!open) return null;

    // Al body, no donde se lo usa: en las páginas editoriales `.ed-page > *`
    // le pone `position: relative` a todo hijo directo, y el diálogo dejaba de
    // flotar — se dibujaba al final de la página, fuera de la vista, y
    // "Generar una nueva" y "Revocar" en /desarrolladores parecían no andar.
    return createPortal(
        <div className="confirm-dialog-backdrop" onClick={handleBackdropClick}>
            <div className="confirm-dialog" ref={dialogRef} role="alertdialog" aria-modal="true">
                <h3 className="confirm-dialog-title">{title}</h3>
                <p className="confirm-dialog-message">{message}</p>
                <div className="confirm-dialog-actions">
                    <button
                        className="confirm-dialog-btn confirm-dialog-btn-cancel"
                        onClick={onCancel}
                        disabled={loading}
                    >
                        {cancelLabel}
                    </button>
                    <button
                        className={`confirm-dialog-btn ${destructive ? 'confirm-dialog-btn-danger' : 'confirm-dialog-btn-primary'}`}
                        onClick={onConfirm}
                        disabled={loading}
                    >
                        {loading ? '...' : confirmLabel}
                    </button>
                </div>
            </div>
        </div>,
        document.body,
    );
}
