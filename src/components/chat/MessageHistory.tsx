'use client';

import { memo } from 'react';
import dynamic from 'next/dynamic';

import ChatMessage from '@/components/ChatMessage';
import DocumentCards from '@/components/DocumentCards';
import SourcePanel from '@/components/SourcePanel';
import { ChatMessage as ChatMessageType } from '@/lib/types';

const DataChart = dynamic(() => import('@/components/DataChart'), {
    ssr: false,
    loading: () => <div className="chart-loading-placeholder" />,
});
const ObservablePlotChart = dynamic(() => import('@/components/ObservablePlotChart'), {
    ssr: false,
    loading: () => <div className="chart-loading-placeholder" />,
});
const MapView = dynamic(() => import('@/components/MapView'), {
    ssr: false,
    loading: () => <div className="chart-loading-placeholder" />,
});

interface Props {
    messages: ChatMessageType[];
    onFeedback: (messageId: string, feedback: 'up' | 'down', comment?: string) => void;
    onRegenerate: (messageId: string) => void;
}

const MessageHistory = memo(function MessageHistory({
    messages,
    onFeedback,
    onRegenerate,
}: Props) {
    return (
        <>
            {messages.map((msg) => (
                <div key={msg.id}>
                    <ChatMessage message={msg} onFeedback={onFeedback} onRegenerate={onRegenerate} />
                    {msg.role === 'assistant' && msg.documents && msg.documents.length > 0 && (
                        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '0 1.5rem 1rem' }}>
                            <DocumentCards documents={msg.documents} />
                        </div>
                    )}
                    {msg.role === 'assistant' && msg.chartData && msg.chartData.length > 0 && (
                        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '0 1.5rem 1rem' }}>
                            {msg.chartData.map((chart, i) =>
                                chart.type === 'heatmap' || chart.type === 'scatter'
                                    ? <ObservablePlotChart key={i} chart={chart} />
                                    : <DataChart key={i} chart={chart} />
                            )}
                        </div>
                    )}
                    {msg.role === 'assistant' && msg.mapData && msg.mapData.features?.length > 0 && (
                        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '0 1.5rem 1rem' }}>
                            <MapView mapData={msg.mapData} />
                        </div>
                    )}
                    {msg.role === 'assistant' && msg.sources && msg.sources.length > 0 && (
                        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '0 1.5rem 1rem' }}>
                            <SourcePanel sources={msg.sources} />
                        </div>
                    )}
                </div>
            ))}
        </>
    );
});

export default MessageHistory;
