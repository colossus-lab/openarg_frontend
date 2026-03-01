'use client';

import { AgentPhase } from '@/lib/types';

const PHASES: { key: AgentPhase; label: string; worker: string; activeWorker: string }[] = [
    { key: 'planning', label: 'Planifica', worker: '🧑‍💼', activeWorker: '🧑‍💼' },
    { key: 'data_collection', label: 'Recolecta', worker: '🧑‍🔬', activeWorker: '🧑‍🔬' },
    { key: 'analysis', label: 'Analiza', worker: '🧑‍💻', activeWorker: '🧑‍💻' },
    { key: 'synthesis', label: 'Sintetiza', worker: '🧑‍🎨', activeWorker: '🧑‍🎨' },
];

interface Props {
    currentPhase: AgentPhase | null;
    completedPhases: AgentPhase[];
    thinking: string;
}

export default function AgentActivityBar({ currentPhase, completedPhases, thinking }: Props) {
    return (
        <div className="workflow-bar">
            <div className="workflow-steps">
                {PHASES.map((phase, i) => {
                    const isActive = currentPhase === phase.key;
                    const isCompleted = completedPhases.includes(phase.key);
                    const stateClass = isActive ? 'active' : isCompleted ? 'completed' : 'pending';

                    return (
                        <div key={phase.key} className="workflow-node-group">
                            {/* Connector line (before each step except first) */}
                            {i > 0 && (
                                <div className={`workflow-connector ${isCompleted || isActive ? 'filled' : ''}`} />
                            )}
                            {/* Step node */}
                            <div className={`workflow-node ${stateClass}`} data-phase={phase.key}>
                                <div className="workflow-worker">
                                    {isCompleted ? '✅' : phase.worker}
                                </div>
                                <span className="workflow-label">{phase.label}</span>
                            </div>
                        </div>
                    );
                })}
            </div>
            {thinking && (
                <div className="workflow-thinking">{thinking}</div>
            )}
        </div>
    );
}
