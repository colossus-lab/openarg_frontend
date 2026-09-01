'use client';

import { ReactNode } from 'react';
import { IoDownloadOutline, IoSend, IoShareSocialOutline } from 'react-icons/io5';
import { useTranslations } from 'next-intl';

import ChatThinkingBar from './ChatThinkingBar';
import { AgentPhase } from '@/lib/types';

interface AgentPipelineItem {
    key: AgentPhase;
    icon: ReactNode;
    label: string;
}

interface Props {
    input: string;
    isDesktop: boolean;
    isLoading: boolean;
    deepMode: boolean;
    hasAssistantMessages: boolean;
    agentPipeline: AgentPipelineItem[];
    currentPhase: AgentPhase | null;
    completedPhases: Set<AgentPhase>;
    phaseOrder: AgentPhase[];
    thinking: string;
    onInputChange: (value: string, target: HTMLTextAreaElement) => void;
    onInputKeyDown: (event: React.KeyboardEvent<HTMLTextAreaElement>) => void;
    onDeepToggle: () => void;
    onShare: () => void;
    onSend: () => void;
    textareaRef: React.RefObject<HTMLTextAreaElement | null>;
    variant?: 'centered' | 'docked';
}

export default function ChatComposer({
    input,
    isDesktop,
    isLoading,
    deepMode,
    hasAssistantMessages,
    agentPipeline,
    currentPhase,
    completedPhases,
    phaseOrder,
    thinking,
    onInputChange,
    onInputKeyDown,
    onDeepToggle,
    onShare,
    onSend,
    textareaRef,
    variant = 'docked',
}: Props) {
    const t = useTranslations('chat');
    const isCentered = variant === 'centered';

    return (
        <div className={`chat-input-area${isCentered ? ' chat-input-area--centered' : ''}`}>
            <div className="chat-input-row">
                <div className="chat-input-container">
                    {!isCentered && (
                        <ChatThinkingBar
                            isLoading={isLoading}
                            agentPipeline={agentPipeline}
                            currentPhase={currentPhase}
                            completedPhases={completedPhases}
                            phaseOrder={phaseOrder}
                            thinking={thinking}
                        />
                    )}
                    <div className="chat-input-main-row">
                        <div className="chat-input-controls">
                            <button
                                className={`policy-toggle ${deepMode ? 'active' : ''}`}
                                onClick={onDeepToggle}
                                disabled={isLoading}
                                title={deepMode ? t('deepToggleOn') : t('deepToggleOff')}
                                aria-label={deepMode ? t('deepToggleOn') : t('deepToggleOff')}
                            >
                                <span className="policy-toggle-icon">🔎</span>
                                <span className="policy-toggle-label">{t('deepToggleLabel')}</span>
                                {deepMode && <span className="policy-toggle-badge">{t('deepToggleBadge')}</span>}
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
            </div>
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
