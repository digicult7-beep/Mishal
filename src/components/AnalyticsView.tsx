
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface Task {
    id: string
    status_id: string
}

interface TaskStatus {
    id: string
    label: string
    color: string
}

interface AnalyticsViewProps {
    tasks: Task[]
    statuses: TaskStatus[]
}

const AnalyticsView: React.FC<AnalyticsViewProps> = ({ tasks, statuses }) => {
    // 1. Prepare Data
    const data = [
        // Include "Unassigned" if necessary
        ...(tasks.some(t => !statuses.find(s => s.id === t.status_id)) ? [{
            name: 'Unassigned',
            count: tasks.filter(t => !statuses.find(s => s.id === t.status_id)).length,
            color: '#ef4444' // Keep Red for unassigned
        }] : []),
        // Map existing statuses
        ...statuses.map((status) => ({
            name: status.label,
            count: tasks.filter(t => t.status_id === status.id).length,
            // Use minimal monochromatic color (Indigo)
            color: '#4f46e5'
        }))
    ];

    return (
        <div style={{ background: 'white', borderRadius: '1rem', border: '1px solid #e5e7eb', padding: '1.5rem', height: '100%', display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827', marginBottom: '1.5rem' }}>Task Progress Analytics</h3>

            <div style={{ flex: 1, minHeight: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={data}
                        margin={{
                            top: 20,
                            right: 30,
                            left: 0,
                            bottom: 5,
                        }}
                    >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis
                            dataKey="name"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#6b7280', fontSize: 12 }}
                            dy={10}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#6b7280', fontSize: 12 }}
                            allowDecimals={false}
                        />
                        <Tooltip
                            cursor={{ fill: '#f3f4f6' }}
                            contentStyle={{ borderRadius: '0.5rem', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                        />
                        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default AnalyticsView;
