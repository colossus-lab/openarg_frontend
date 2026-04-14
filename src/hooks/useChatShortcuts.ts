'use client';

import { RefObject, useEffect } from 'react';

interface Props {
    onNewConversation: () => void;
    inputRef: RefObject<HTMLTextAreaElement | null>;
}

export function useChatShortcuts({ onNewConversation, inputRef }: Props) {
    useEffect(() => {
        const handleShortcut = (event: KeyboardEvent) => {
            const target = event.target;
            const isTypingTarget =
                target instanceof HTMLInputElement ||
                target instanceof HTMLTextAreaElement ||
                (target instanceof HTMLElement && target.isContentEditable);

            if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
                event.preventDefault();
                onNewConversation();
                return;
            }

            if (event.key === '/' && !isTypingTarget && !event.metaKey && !event.ctrlKey && !event.altKey) {
                event.preventDefault();
                inputRef.current?.focus();
            }
        };

        window.addEventListener('keydown', handleShortcut);
        return () => window.removeEventListener('keydown', handleShortcut);
    }, [inputRef, onNewConversation]);
}

