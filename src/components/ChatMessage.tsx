'use client';

import { useState, memo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { ChatMessage as ChatMessageType } from '@/lib/types';

interface Props {
    message: ChatMessageType;
    onFeedback?: (messageId: string, feedback: 'up' | 'down', comment?: string) => void;
    /** Called when the user clicks "Regenerar" on an errored assistant
     *  message. The parent is responsible for finding the preceding
     *  user message and resending it as a new turn — this component
     *  only reports the click and does not mutate history. */
    onRegenerate?: (messageId: string) => void;
}

function ChatMessageComponent({ message, onFeedback, onRegenerate }: Props) {
    const isUser = message.role === 'user';
    const { data: session } = useSession();
    const t = useTranslations('chatMessage');
    const [showCommentInput, setShowCommentInput] = useState(false);
    const [comment, setComment] = useState('');

    const userName = isUser
        ? (session?.user?.name?.split(' ')[0] || t('defaultUserName'))
        : t('assistantName');

    const userImage = isUser ? session?.user?.image : null;

    // FR-012a (002-chat-ui): render the error affordance on assistant
    // messages that were saved on an error path. The flag is set by
    // saveAssistantMessageWithRetry in the chat bridge's finally block
    // and is now persisted in the backend messages.errored column
    // (Alembic 0029, 2026-04-11), so the chip survives a page refresh.
    const isErrored = !isUser && message.errored === true;

    const canFeedback = !isUser && !isErrored && message.id !== 'streaming' && message.backendMessageId && message.conversationId;
    const currentFeedback = message.feedback;

    const handleFeedback = (fb: 'up' | 'down') => {
        if (!onFeedback || !message.backendMessageId || currentFeedback) return;
        if (fb === 'down') {
            setShowCommentInput(true);
        } else {
            onFeedback(message.id, fb);
        }
    };

    const submitDownFeedback = () => {
        if (!onFeedback) return;
        onFeedback(message.id, 'down', comment || undefined);
        setShowCommentInput(false);
    };

    return (
        <div className={`message-row ${isUser ? 'user' : 'assistant'}${message.id === 'streaming' ? ' streaming' : ''}`}>
            <div className="message-row-inner">
                {/* Avatar */}
                <div className={`message-avatar ${isUser ? 'user-avatar' : 'assistant-avatar'}`}>
                    {isUser ? (
                        userImage ? (
                            <Image
                                src={userImage}
                                alt={userName}
                                width={32}
                                height={32}
                                className="message-avatar-img"
                            />
                        ) : (
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                <circle cx="12" cy="7" r="4" />
                            </svg>
                        )
                    ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src="/flag-icon.svg" alt={t('assistantName')} className="message-avatar-img" />
                    )}
                </div>

                {/* Content */}
                <div className="message-content">
                    <span className="message-sender">{userName}</span>
                    <div className="message-body">
                        {isUser ? (
                            <p>{message.content}</p>
                        ) : (
                            <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>
                                {message.content}
                            </ReactMarkdown>
                        )}
                    </div>

                    {/* Errored affordance — FR-012a/b of 002-chat-ui.
                        Shows a warning chip + a "Regenerar" button when
                        the assistant message was persisted on an error
                        path. The chip is visual-only; the button is
                        the interactive piece the parent wires up. */}
                    {isErrored && (
                        <div className="errored-bar" role="status" aria-live="polite">
                            <div className="errored-chip">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                    <circle cx="12" cy="12" r="10" />
                                    <line x1="12" y1="8" x2="12" y2="12" />
                                    <line x1="12" y1="16" x2="12.01" y2="16" />
                                </svg>
                                <span>{t('erroredChip')}</span>
                            </div>
                            <p className="errored-explanation">{t('erroredExplanation')}</p>
                            {onRegenerate && (
                                <button
                                    type="button"
                                    className="regenerate-btn"
                                    onClick={() => onRegenerate(message.id)}
                                    aria-label={t('regenerateAria')}
                                >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                        <polyline points="23 4 23 10 17 10" />
                                        <polyline points="1 20 1 14 7 14" />
                                        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                                    </svg>
                                    {t('regenerateButton')}
                                </button>
                            )}
                        </div>
                    )}

                    {/* Feedback buttons */}
                    {canFeedback && (
                        <div className="feedback-bar">
                            <button
                                className={`feedback-btn${currentFeedback === 'up' ? ' active' : ''}`}
                                onClick={() => handleFeedback('up')}
                                disabled={!!currentFeedback}
                                title={t('feedbackUseful')}
                                aria-label={t('feedbackUsefulAria')}
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill={currentFeedback === 'up' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z" />
                                    <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
                                </svg>
                            </button>
                            <button
                                className={`feedback-btn${currentFeedback === 'down' ? ' active' : ''}`}
                                onClick={() => handleFeedback('down')}
                                disabled={!!currentFeedback}
                                title={t('feedbackIncorrect')}
                                aria-label={t('feedbackIncorrectAria')}
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill={currentFeedback === 'down' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3H10z" />
                                    <path d="M17 2h3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-3" />
                                </svg>
                            </button>

                            {showCommentInput && !currentFeedback && (
                                <div className="feedback-comment">
                                    <input
                                        type="text"
                                        placeholder={t('feedbackPlaceholder')}
                                        value={comment}
                                        onChange={(e) => setComment(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') submitDownFeedback();
                                        }}
                                        className="feedback-comment-input"
                                        autoFocus
                                    />
                                    <button
                                        className="feedback-comment-submit"
                                        onClick={submitDownFeedback}
                                    >
                                        {t('feedbackSubmit')}
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default memo(ChatMessageComponent);
