'use client';

import { AgentPhase } from '@/lib/agents/types';

const PHASES: { key: AgentPhase; label: string; icon: string }[] = [
    { key: 'planning', label: 'Planificando', icon: '🧠' },
    { key: 'data_collection', label: 'Recolectando datos', icon: '📡' },
    { key: 'analysis', label: 'Analizando', icon: '🔬' },
    { key: 'synthesis', label: 'Sintetizando', icon: '✨' },
];

interface Props {
    currentPhase: AgentPhase | null;
    completedPhases: AgentPhase[];
    thinking: string;
}

export default function AgentActivityBar({ currentPhase, completedPhases, thinking }: Props) {
    return (
        <div className="agent-bar">
            {PHASES.map((phase) => {
                const isActive = currentPhase === phase.key;
                const isCompleted = completedPhases.includes(phase.key);

                return (
                    <div
                        key={phase.key}
                        className={`agent-step ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
                        data-phase={phase.key}
                    >
                        <span className="step-dot" />
                        <span>{phase.icon}</span>
                        <span>{phase.label}</span>
                    </div>
                );
            })}
            {thinking && (
                <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    {thinking}
                </span>
            )}
        </div>
    );
}
