'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import { ChatMessage as ChatMessageType } from '@/lib/types';

interface Props {
    message: ChatMessageType;
}

export default function ChatMessage({ message }: Props) {
    const isUser = message.role === 'user';
    const { data: session } = useSession();

    const userName = isUser
        ? (session?.user?.name?.split(' ')[0] || 'Vos')
        : 'OpenArg';

    const userImage = isUser ? session?.user?.image : null;

    return (
        <div className={`message-row ${isUser ? 'user' : 'assistant'}`}>
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
                        {/* eslint-disable-next-line @next/next/no-img-element */}
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
                </div>
            </div>
        </div>
    );
}
