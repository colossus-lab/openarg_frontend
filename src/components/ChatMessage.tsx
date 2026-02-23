'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ChatMessage as ChatMessageType } from '@/lib/agents/types';

interface Props {
    message: ChatMessageType;
}

export default function ChatMessage({ message }: Props) {
    return (
        <div className={`message ${message.role}`}>
            <div className="message-bubble">
                {message.role === 'assistant' ? (
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {message.content}
                    </ReactMarkdown>
                ) : (
                    <p>{message.content}</p>
                )}
            </div>
        </div>
    );
}
