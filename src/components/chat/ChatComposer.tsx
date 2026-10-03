'use client';

import { IoDownloadOutline, IoSend, IoShareSocialOutline } from 'react-icons/io5';
import { useTranslations } from 'next-intl';

import ChatQuota from '@/components/chat/ChatQuota';
import { canAsk, type WebQuota } from '@/lib/chat/quota';

interface Props {
    input: string;
    isDesktop: boolean;
    isLoading: boolean;
    hasAssistantMessages: boolean;
    /** Cupo web del mes; null mientras no se sabe (no bloquea). */
    quota?: WebQuota | null;
    onInputChange: (value: string, target: HTMLTextAreaElement) => void;
    onInputKeyDown: (event: React.KeyboardEvent<HTMLTextAreaElement>) => void;
    onShare: () => void;
    onSend: () => void;
    textareaRef: React.RefObject<HTMLTextAreaElement | null>;
    variant?: 'centered' | 'docked';
}

export default function ChatComposer({
    input,
    isDesktop,
    isLoading,
    hasAssistantMessages,
    quota = null,
    onInputChange,
    onInputKeyDown,
    onShare,
    onSend,
    textareaRef,
    variant = 'docked',
}: Props) {
    const t = useTranslations('chat');
    const isCentered = variant === 'centered';
    const blocked = !canAsk(quota);

    return (
        <div className={`chat-input-area${isCentered ? ' chat-input-area--centered' : ''}`}>
            <div className="chat-input-row">
                <div className="chat-input-container">
                    <div className="chat-input-main-row">
                        {hasAssistantMessages && (
                            <div className="chat-input-controls">
                                <button
                                    className="policy-toggle"
                                    onClick={onShare}
                                    title={t('shareTitle')}
                                >
                                    {isDesktop ? <IoDownloadOutline size={16} /> : <IoShareSocialOutline size={16} />}
                                    <span className="policy-toggle-label">{isDesktop ? t('downloadLabel') : t('shareLabel')}</span>
                                </button>
                            </div>
                        )}
                        <textarea
                            ref={textareaRef}
                            className="chat-input"
                            value={input}
                            onChange={(e) => onInputChange(e.target.value, e.target)}
                            onKeyDown={onInputKeyDown}
                            placeholder={isDesktop ? t('placeholderDesktop') : t('placeholderMobile')}
                            rows={1}
                            disabled={isLoading || blocked}
                        />
                        <button
                            className="chat-send-btn"
                            onClick={onSend}
                            disabled={!input.trim() || isLoading || blocked}
                        >
                            <IoSend size={14} />
                        </button>
                    </div>
                </div>
            </div>
            <ChatQuota quota={quota} />
            {!isCentered && (
                <div className="chat-shortcuts" aria-label={t('shortcutsLabel')}>
                    <span>{isDesktop ? t('shortcutSendDesktop') : t('shortcutSendMobile')}</span>
                    <span>{t('shortcutNewLine')}</span>
                    <span>{t('shortcutNewConversation')}</span>
                </div>
            )}
        </div>
    );
}
