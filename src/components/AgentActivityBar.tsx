'use client';

import { AgentPhase } from '@/lib/types';

const PHASES: { key: AgentPhase; label: string }[] = [
    { key: 'planning', label: 'Estratega' },
    { key: 'data_collection', label: 'Investigadores' },
    { key: 'analysis', label: 'Analista' },
    { key: 'synthesis', label: 'Redactor' },
];

interface Props {
    currentPhase: AgentPhase | null;
    completedPhases: AgentPhase[];
}

export default function AgentActivityBar({ currentPhase, completedPhases }: Props) {
    return (
        <div className="activity-bar">
            {/* Mini progress track */}
            <div className="thinking-progress">
                {PHASES.map((phase) => {
                    const isActive = currentPhase === phase.key;
                    const isCompleted = completedPhases.includes(phase.key);
                    const cls = isActive ? 'active' : isCompleted ? 'completed' : '';
                    return (
                        <div key={phase.key} className={`thinking-progress-segment ${cls}`} />
                    );
                })}
            </div>

            {/* Phase labels */}
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
