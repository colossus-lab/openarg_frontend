'use client';

import { ReactNode } from 'react';

import { AgentPhase } from '@/lib/types';

interface AgentPipelineItem {
    key: AgentPhase;
    icon: ReactNode;
    label: string;
}

interface Props {
    isLoading: boolean;
    agentPipeline: AgentPipelineItem[];
    currentPhase: AgentPhase | null;
    completedPhases: Set<AgentPhase>;
    phaseOrder: AgentPhase[];
    thinking: string;
}

export default function ChatThinkingBar({
    isLoading,
    agentPipeline,
    currentPhase,
    completedPhases,
    phaseOrder,
    thinking,
}: Props) {
    if (!isLoading) return null;

    return (
        <div className="thinking-bar">
            <div className="thinking-bar-inner">
                <div className="agent-pipeline">
                    {agentPipeline.map((agent, i) => {
                        const isActive = currentPhase === agent.key;
                        const isCompleted = completedPhases.has(agent.key);
                        const stateClass = isActive ? 'active' : isCompleted ? 'completed' : 'pending';
                        const prevPhase = i > 0 ? phaseOrder[i - 1] : null;
                        const prevCompleted = prevPhase ? completedPhases.has(prevPhase) : false;
                        return (
                            <span key={agent.key} className="agent-node-group">
                                {i > 0 && (
                                    <span className={`agent-connector ${prevCompleted ? 'completed' : ''}`}>
                                        <span className="agent-connector-line" />
                                        {prevCompleted && <span className="agent-connector-pulse" />}
                                    </span>
                                )}
                                <span className={`agent-node ${stateClass}`}>
                                    <span className="agent-node-icon">{agent.icon}</span>
                                    <span className="agent-node-label">{agent.label}</span>
                                    {isActive && <span className="agent-node-pulse" />}
                                </span>
                            </span>
                        );
                    })}
                </div>
                {thinking && <span className="thinking-text">{thinking}</span>}
            </div>
        </div>
    );
}

