'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ChatMessage as ChatMessageType } from '@/lib/agents/types';

interface Props {
    message: ChatMessageType;
}

export default function ChatMessage({ message }: Props) {
    const isUser = message.role === 'user';

    return (
        <div className={`message-row ${isUser ? 'user' : 'assistant'}`}>
            <div className="message-row-inner">
                {/* Avatar */}
                <div className={`message-avatar ${isUser ? 'user-avatar' : 'assistant-avatar'}`}>
                    {isUser ? (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                            <circle cx="12" cy="7" r="4" />
                        </svg>
                    ) : (
                        <span className="assistant-avatar-icon">🇦🇷</span>
                    )}
                </div>

                {/* Content */}
                <div className="message-content">
                    <span className="message-sender">{isUser ? 'Vos' : 'OpenArg'}</span>
                    <div className="message-body">
                        {isUser ? (
                            <p>{message.content}</p>
                        ) : (
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {message.content}
                            </ReactMarkdown>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
