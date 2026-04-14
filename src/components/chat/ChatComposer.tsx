'use client';

import { IoDownloadOutline, IoSend, IoShareSocialOutline } from 'react-icons/io5';
import { useTranslations } from 'next-intl';

interface Props {
    input: string;
    isDesktop: boolean;
    isLoading: boolean;
    policyMode: boolean;
    hasAssistantMessages: boolean;
    onInputChange: (value: string, target: HTMLTextAreaElement) => void;
    onInputKeyDown: (event: React.KeyboardEvent<HTMLTextAreaElement>) => void;
    onPolicyToggle: () => void;
    onShare: () => void;
    onSend: () => void;
    textareaRef: React.RefObject<HTMLTextAreaElement | null>;
}

export default function ChatComposer({
    input,
    isDesktop,
    isLoading,
    policyMode,
    hasAssistantMessages,
    onInputChange,
    onInputKeyDown,
    onPolicyToggle,
    onShare,
    onSend,
    textareaRef,
}: Props) {
    const t = useTranslations('chat');

    return (
        <div className="chat-input-area">
            <div className="chat-input-controls">
                <button
                    className={`policy-toggle ${policyMode ? 'active' : ''}`}
                    onClick={onPolicyToggle}
                    disabled={isLoading}
                    title={policyMode ? t('policyToggleOn') : t('policyToggleOff')}
                    aria-label={policyMode ? t('policyToggleOn') : t('policyToggleOff')}
                >
                    <span className="policy-toggle-icon">🏛️</span>
                    <span className="policy-toggle-label">{t('policyToggleLabel')}</span>
                    {policyMode && <span className="policy-toggle-badge">{t('policyToggleBadge')}</span>}
                </button>
                {hasAssistantMessages && (
                    <button
                        className="policy-toggle"
                        onClick={onShare}
                        title={t('shareTitle')}
                    >
                        {isDesktop ? <IoDownloadOutline size={16} /> : <IoShareSocialOutline size={16} />}
                        <span className="policy-toggle-label">{isDesktop ? t('downloadLabel') : t('shareLabel')}</span>
                    </button>
                )}
            </div>
            <div className="chat-input-row">
                <div className="chat-input-container">
                    <textarea
                        ref={textareaRef}
                        className="chat-input"
                        value={input}
                        onChange={(e) => onInputChange(e.target.value, e.target)}
                        onKeyDown={onInputKeyDown}
                        placeholder={isDesktop ? t('placeholderDesktop') : t('placeholderMobile')}
                        rows={1}
                        disabled={isLoading}
                    />
                    <button
                        className="chat-send-btn"
                        onClick={onSend}
                        disabled={!input.trim() || isLoading}
                    >
                        <IoSend size={14} />
                    </button>
                </div>
            </div>
            <div className="chat-shortcuts" aria-label={t('shortcutsLabel')}>
                <span>{isDesktop ? t('shortcutSendDesktop') : t('shortcutSendMobile')}</span>
                <span>{t('shortcutNewLine')}</span>
                <span>{t('shortcutNewConversation')}</span>
            </div>
        </div>
    );
}
