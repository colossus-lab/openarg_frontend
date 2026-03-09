'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
    children: ReactNode;
    title?: string;
}

interface State {
    hasError: boolean;
}

/**
 * Error boundary that catches chart rendering crashes and shows
 * a user-friendly fallback instead of breaking the entire message.
 */
export default class ChartErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(): State {
        return { hasError: true };
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
        console.error('[ChartErrorBoundary] Chart render failed:', error, info.componentStack);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="chart-container">
                    <div className="chart-title">{this.props.title || 'Grafico'}</div>
                    <div style={{
                        padding: '2rem',
                        textAlign: 'center',
                        color: 'var(--text-muted)',
                        fontSize: '0.9rem',
                    }}>
                        No se pudo renderizar el grafico. Los datos pueden tener un formato inesperado.
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
