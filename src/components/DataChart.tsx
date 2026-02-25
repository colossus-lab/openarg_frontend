'use client';

import { ChartData } from '@/lib/agents/types';
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

export default function DataChart({ chart }: Props) {
    const colors = chart.colors || DEFAULT_COLORS;

    // BUG-12: Validate data before rendering, show fallback if invalid
    if (!chart.data || chart.data.length === 0 || !chart.xKey || !chart.yKeys?.length) {
        return (
            <div className="chart-container">
                <div className="chart-title">{chart.title || 'Gráfico'}</div>
                <div style={{
                    padding: '2rem',
                    textAlign: 'center',
                    color: '#6B7280',
                    fontSize: '0.9rem',
                }}>
                    ⚠️ No hay datos suficientes para generar el gráfico
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
                    color: '#6B7280',
                    fontSize: '0.9rem',
                }}>
                    ⚠️ Los datos recibidos no contienen valores numéricos válidos
                </div>
            </div>
        );
    }

    return (
        <div className="chart-container">
            <div className="chart-title">{chart.title}</div>
            <ResponsiveContainer width="100%" height={300}>
                {chart.type === 'line_chart' ? (
                    <LineChart data={cleanData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(116,172,223,0.1)" />
                        <XAxis
                            dataKey={chart.xKey}
                            stroke="#6B7280"
                            fontSize={12}
                            tickFormatter={(v) => typeof v === 'string' && v.length > 10 ? v.slice(0, 7) : v}
                        />
                        {/* BUG-06: Auto-scale Y axis and format large numbers */}
                        <YAxis
                            stroke="#6B7280"
                            fontSize={12}
                            domain={['auto', 'auto']}
                            tickFormatter={formatYAxisTick}
                        />
                        <Tooltip
                            contentStyle={{
                                background: '#1A1F35',
                                border: '1px solid rgba(116,172,223,0.2)',
                                borderRadius: '8px',
                                color: '#F0F4FC',
                            }}
                        />
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
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(116,172,223,0.1)" />
                        <XAxis dataKey={chart.xKey} stroke="#6B7280" fontSize={12} />
                        <YAxis
                            stroke="#6B7280"
                            fontSize={12}
                            domain={['auto', 'auto']}
                            tickFormatter={formatYAxisTick}
                        />
                        <Tooltip
                            contentStyle={{
                                background: '#1A1F35',
                                border: '1px solid rgba(116,172,223,0.2)',
                                borderRadius: '8px',
                                color: '#F0F4FC',
                            }}
                        />
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
                        <Tooltip
                            contentStyle={{
                                background: '#1A1F35',
                                border: '1px solid rgba(116,172,223,0.2)',
                                borderRadius: '8px',
                                color: '#F0F4FC',
                            }}
                        />
                        <Legend />
                    </PieChart>
                )}
            </ResponsiveContainer>
        </div>
    );
}
