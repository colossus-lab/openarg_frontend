import { describe, it, expect, afterEach } from 'vitest';
import { render, within, cleanup } from '@testing-library/react';
import AgentActivityBar from '@/components/AgentActivityBar';

afterEach(() => {
    cleanup();
});

describe('AgentActivityBar', () => {
    it('renders all four phase labels', () => {
        const { container } = render(
            <AgentActivityBar currentPhase={null} completedPhases={[]} />,
        );
        const view = within(container);
        expect(view.getByText('Estratega')).toBeInTheDocument();
        expect(view.getByText('Investigadores')).toBeInTheDocument();
        expect(view.getByText('Analista')).toBeInTheDocument();
        expect(view.getByText('Redactor')).toBeInTheDocument();
    });

    it('marks the current phase as active', () => {
        const { container } = render(
            <AgentActivityBar currentPhase="planning" completedPhases={[]} />,
        );
        const estratega = within(container).getByText('Estratega');
        expect(estratega.className).toContain('active');
    });

    it('marks completed phases with a checkmark', () => {
        const { container } = render(
            <AgentActivityBar
                currentPhase="analysis"
                completedPhases={['planning', 'data_collection']}
            />,
        );
        const checks = within(container).getAllByText('\u2713');
        expect(checks).toHaveLength(2);
    });

    it('marks pending phases without active or completed class', () => {
        const { container } = render(
            <AgentActivityBar currentPhase="planning" completedPhases={[]} />,
        );
        const redactor = within(container).getByText('Redactor');
        expect(redactor.className).toContain('pending');
        expect(redactor.className).not.toContain('active');
        expect(redactor.className).not.toContain('completed');
    });

    it('shows pulse indicator only on active phase', () => {
        const { container } = render(
            <AgentActivityBar currentPhase="data_collection" completedPhases={['planning']} />,
        );
        const pulses = container.querySelectorAll('.activity-pulse');
        expect(pulses).toHaveLength(1);
    });
});
