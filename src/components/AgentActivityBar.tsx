'use client';

import { AgentPhase } from '@/lib/types';

const PHASES: { key: AgentPhase; label: string }[] = [
    { key: 'planning', label: 'Entendiendo' },
    { key: 'data_collection', label: 'Buscando datos' },
    { key: 'analysis', label: 'Analizando' },
    { key: 'synthesis', label: 'Generando respuesta' },
];

interface Props {
    currentPhase: AgentPhase | null;
    completedPhases: AgentPhase[];
}

export default function AgentActivityBar({ currentPhase, completedPhases }: Props) {
    return (
        <div className="activity-bar">
            <div className="activity-steps">
                {PHASES.map((phase, i) => {
                    const isActive = currentPhase === phase.key;
                    const isCompleted = completedPhases.includes(phase.key);
                    const stateClass = isActive ? 'active' : isCompleted ? 'completed' : 'pending';

                    return (
                        <span key={phase.key} className="activity-step-group">
                            {i > 0 && <span className="activity-sep">&middot;</span>}
                            <span className={`activity-step ${stateClass}`}>
                                {isCompleted && <span className="activity-check">&#10003;</span>}
                                {phase.label}
                                {isActive && <span className="activity-pulse" />}
                            </span>
                        </span>
                    );
                })}
            </div>
        </div>
    );
}
