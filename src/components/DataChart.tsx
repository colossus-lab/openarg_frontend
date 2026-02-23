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

export default function DataChart({ chart }: Props) {
    const colors = chart.colors || DEFAULT_COLORS;

    return (
        <div className="chart-container">
            <div className="chart-title">{chart.title}</div>
            <ResponsiveContainer width="100%" height={300}>
                {chart.type === 'line_chart' ? (
                    <LineChart data={chart.data}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(116,172,223,0.1)" />
                        <XAxis
                            dataKey={chart.xKey}
                            stroke="#6B7280"
                            fontSize={12}
                            tickFormatter={(v) => typeof v === 'string' && v.length > 10 ? v.slice(0, 7) : v}
                        />
                        <YAxis stroke="#6B7280" fontSize={12} />
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
                            />
                        ))}
                    </LineChart>
                ) : chart.type === 'bar_chart' ? (
                    <BarChart data={chart.data}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(116,172,223,0.1)" />
                        <XAxis dataKey={chart.xKey} stroke="#6B7280" fontSize={12} />
                        <YAxis stroke="#6B7280" fontSize={12} />
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
                            data={chart.data}
                            dataKey={chart.yKeys[0]}
                            nameKey={chart.xKey}
                            cx="50%"
                            cy="50%"
                            outerRadius={100}
                            label
                        >
                            {chart.data.map((_, i) => (
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
