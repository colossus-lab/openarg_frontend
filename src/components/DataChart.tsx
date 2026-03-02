'use client';

import { useEffect, useState, memo } from 'react';
import { ChartData } from '@/lib/types';
import {
    LineChart,
    Line,
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
} from 'recharts';

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
    '#60A5FA',
    '#FBBF24',
];

interface ChartTheme {
    grid: string;
    axis: string;
    tooltipBg: string;
    tooltipBorder: string;
    tooltipText: string;
}

const DARK_DEFAULTS: ChartTheme = {
    grid: 'rgba(116,172,223,0.1)',
    axis: '#6B7280',
    tooltipBg: '#1A1F35',
    tooltipBorder: 'rgba(116,172,223,0.2)',
    tooltipText: '#F0F4FC',
};

function useChartTheme(): ChartTheme {
    const [theme, setTheme] = useState<ChartTheme>(DARK_DEFAULTS);

    useEffect(() => {
        function read() {
            const s = getComputedStyle(document.documentElement);
            setTheme({
                grid: s.getPropertyValue('--chart-grid').trim() || DARK_DEFAULTS.grid,
                axis: s.getPropertyValue('--chart-axis').trim() || DARK_DEFAULTS.axis,
                tooltipBg: s.getPropertyValue('--chart-tooltip-bg').trim() || DARK_DEFAULTS.tooltipBg,
                tooltipBorder: s.getPropertyValue('--chart-tooltip-border').trim() || DARK_DEFAULTS.tooltipBorder,
                tooltipText: s.getPropertyValue('--chart-tooltip-text').trim() || DARK_DEFAULTS.tooltipText,
            });
        }
        read();
        const obs = new MutationObserver(read);
        obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
        return () => obs.disconnect();
    }, []);

    return theme;
}

/**
 * Format large numbers for Y-axis ticks (e.g., 1500000 → "1.5M")
 */
function formatYAxisTick(v: number | string): string {
    if (typeof v !== 'number') return String(v);
    if (Math.abs(v) >= 1e9) return `${(v / 1e9).toFixed(1)}B`;
    if (Math.abs(v) >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
    if (Math.abs(v) >= 1e3) return `${(v / 1e3).toFixed(1)}K`;
    return Number.isInteger(v) ? String(v) : v.toFixed(1);
}

function DataChartComponent({ chart }: Props) {
    const colors = chart.colors || DEFAULT_COLORS;
    const ct = useChartTheme();

    // BUG-12: Validate data before rendering, show fallback if invalid
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

    // BUG-07: Filter out rows where ALL numeric values are null/undefined
    const cleanData = chart.data.filter(row =>
        chart.yKeys.some(key => row[key] !== null && row[key] !== undefined)
    );

    if (cleanData.length === 0) {
        return (
            <div className="chart-container">
                <div className="chart-title">{chart.title || 'Gráfico'}</div>
                <div style={{
                    padding: '2rem',
                    textAlign: 'center',
                    color: 'var(--text-muted)',
                    fontSize: '0.9rem',
                }}>
                    Los datos recibidos no contienen valores numéricos válidos
                </div>
            </div>
        );
    }

    const tooltipStyle = {
        background: ct.tooltipBg,
        border: `1px solid ${ct.tooltipBorder}`,
        borderRadius: '8px',
        color: ct.tooltipText,
    };

    return (
        <div className="chart-container">
            <div className="chart-title">{chart.title}</div>
            <ResponsiveContainer width="100%" height={300}>
                {chart.type === 'line_chart' ? (
                    <LineChart data={cleanData}>
                        <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} />
                        <XAxis
                            dataKey={chart.xKey}
                            stroke={ct.axis}
                            fontSize={12}
                            tickFormatter={(v) => typeof v === 'string' && v.length > 10 ? v.slice(0, 7) : v}
                        />
                        {/* BUG-06: Auto-scale Y axis and format large numbers */}
                        <YAxis
                            stroke={ct.axis}
                            fontSize={12}
                            domain={['auto', 'auto']}
                            tickFormatter={formatYAxisTick}
                        />
                        <Tooltip contentStyle={tooltipStyle} />
                        <Legend />
                        {chart.yKeys.map((key, i) => (
                            <Line
                                key={key}
                                type="monotone"
                                dataKey={key}
                                stroke={colors[i % colors.length]}
                                strokeWidth={2}
                                dot={false}
                                activeDot={{ r: 4 }}
                                connectNulls
                            />
                        ))}
                    </LineChart>
                ) : chart.type === 'bar_chart' ? (
                    <BarChart data={cleanData}>
                        <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} />
                        <XAxis dataKey={chart.xKey} stroke={ct.axis} fontSize={12} />
                        <YAxis
                            stroke={ct.axis}
                            fontSize={12}
                            domain={['auto', 'auto']}
                            tickFormatter={formatYAxisTick}
                        />
                        <Tooltip contentStyle={tooltipStyle} />
                        <Legend />
                        {chart.yKeys.map((key, i) => (
                            <Bar key={key} dataKey={key} fill={colors[i % colors.length]} radius={[4, 4, 0, 0]} />
                        ))}
                    </BarChart>
                ) : (
                    <PieChart>
                        <Pie
                            data={cleanData}
                            dataKey={chart.yKeys[0]}
                            nameKey={chart.xKey}
                            cx="50%"
                            cy="50%"
                            outerRadius={100}
                            label
                        >
                            {cleanData.map((_, i) => (
                                <Cell key={i} fill={colors[i % colors.length]} />
                            ))}
                        </Pie>
                        <Tooltip contentStyle={tooltipStyle} />
                        <Legend />
                    </PieChart>
                )}
            </ResponsiveContainer>
        </div>
    );
}

export default memo(DataChartComponent);
