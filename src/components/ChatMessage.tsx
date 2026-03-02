'use client';

import { useState, memo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import { ChatMessage as ChatMessageType } from '@/lib/types';

interface Props {
    message: ChatMessageType;
    onFeedback?: (messageId: string, feedback: 'up' | 'down', comment?: string) => void;
}

function ChatMessageComponent({ message, onFeedback }: Props) {
    const isUser = message.role === 'user';
    const { data: session } = useSession();
    const [showCommentInput, setShowCommentInput] = useState(false);
    const [comment, setComment] = useState('');

    const userName = isUser
        ? (session?.user?.name?.split(' ')[0] || 'Vos')
        : 'OpenArg';

    const userImage = isUser ? session?.user?.image : null;

    const canFeedback = !isUser && message.id !== 'streaming' && message.backendMessageId && message.conversationId;
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
                        <img src="/flag-icon.svg" alt="OpenArg" className="message-avatar-img" />
                    )}
                </div>

                {/* Content */}
                <div className="message-content">
                    <span className="message-sender">{userName}</span>
                    <div className="message-body">
                        {isUser ? (
                            <p>{message.content}</p>
                        ) : (
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {message.content}
                            </ReactMarkdown>
                        )}
                    </div>

                    {/* Feedback buttons */}
                    {canFeedback && (
                        <div className="feedback-bar">
                            <button
                                className={`feedback-btn${currentFeedback === 'up' ? ' active' : ''}`}
                                onClick={() => handleFeedback('up')}
                                disabled={!!currentFeedback}
                                title="Respuesta útil"
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
                                title="Respuesta incorrecta"
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
                                        placeholder="¿Qué estuvo mal? (opcional)"
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
                                        Enviar
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
