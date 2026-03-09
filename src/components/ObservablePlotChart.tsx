'use client';

import { useRef, useEffect, memo } from 'react';
import { ChartData } from '@/lib/types';

interface Props {
    chart: ChartData;
}

const DEFAULT_COLORS = [
    '#74ACDF',
    '#F6B40E',
    '#34D399',
    '#F59E0B',
    '#A78BFA',
    '#F87171',
];

function ObservablePlotChartComponent({ chart }: Props) {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!containerRef.current || !chart.data?.length) return;

        let cancelled = false;

        // Dynamic import to avoid SSR issues
        import('@observablehq/plot').then((Plot) => {
            if (cancelled || !containerRef.current) return;

            const width = containerRef.current.clientWidth || 600;
            const height = 300;
            const color = chart.colors?.[0] ?? DEFAULT_COLORS[0];

            let plot: SVGSVGElement | HTMLElement;

            if (chart.type === 'heatmap') {
                plot = Plot.plot({
                    width,
                    height,
                    color: { scheme: 'YlOrRd', legend: true },
                    x: { label: chart.xKey },
                    y: { label: chart.yKeys[0] },
                    marks: [
                        Plot.cell(chart.data, {
                            x: chart.xKey,
                            y: chart.yKeys[0],
                            fill: chart.fillKey ?? chart.yKeys[1] ?? chart.yKeys[0],
                        }),
                    ],
                    style: {
                        background: 'transparent',
                        color: '#9CA3AF',
                    },
                });
            } else {
                // scatter
                plot = Plot.plot({
                    width,
                    height,
                    grid: true,
                    x: { label: chart.xKey },
                    y: { label: chart.yKeys[0] },
                    marks: [
                        Plot.dot(chart.data, {
                            x: chart.xKey,
                            y: chart.yKeys[0],
                            fill: color,
                            r: 4,
                            tip: true,
                        }),
                    ],
                    style: {
                        background: 'transparent',
                        color: '#9CA3AF',
                    },
                });
            }

            containerRef.current.replaceChildren(plot);
        });

        return () => {
            cancelled = true;
        };
    }, [chart]);

    if (!chart.data || chart.data.length === 0 || !chart.xKey || !chart.yKeys?.length) {
        return (
            <div className="chart-container">
                <div className="chart-title">{chart.title || 'Gráfico'}</div>
                <div style={{
                    padding: '2rem',
                    textAlign: 'center',
                    color: 'var(--text-muted)',
                    fontSize: '0.9rem',
                }}>
                    No hay datos suficientes para generar el gráfico
                </div>
            </div>
        );
    }

    return (
        <div className="chart-container">
            <div className="chart-title">{chart.title}</div>
            <div ref={containerRef} style={{ width: '100%', minHeight: 300 }} />
        </div>
    );
}

export default memo(ObservablePlotChartComponent);
