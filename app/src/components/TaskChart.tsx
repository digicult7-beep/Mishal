import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface Task {
    id: string
    status_id?: string
    [key: string]: any
}

interface TaskChartProps {
    tasks: Task[]
    statuses: any[]
}

export default function TaskChart({ tasks, statuses }: TaskChartProps) {
    // Process data for the chart
    // 1. Get unique status labels to avoid duplicates in the chart
    const uniqueLabels = Array.from(new Set(statuses.map(s => s.label)))

    // 2. Map data for each unique label
    const data = uniqueLabels.map((label) => {
        // Find all status IDs that match this label (handling duplicates from different departments)
        const matchingStatusIds = statuses
            .filter(s => s.label === label)
            .map(s => s.id)

        // Count tasks that match any of these status IDs
        const count = tasks.filter(t => t.status_id && matchingStatusIds.includes(t.status_id)).length

        return {
            name: label,
            count: count,
        }
    })

    // Custom Tooltip
    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div style={{
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                    padding: '0.75rem',
                    borderRadius: '0.5rem',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}>
                    <p style={{ margin: 0, fontWeight: '600', color: 'var(--text-primary)' }}>{label}</p>
                    <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
                        Tasks: <span style={{ color: '#ec4899', fontWeight: 'bold' }}>{payload[0].value}</span>
                    </p>
                </div>
            )
        }
        return null
    }

    if (tasks.length === 0) {
        return (
            <div style={{
                height: '400px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-secondary)',
                background: 'var(--bg-secondary)',
                borderRadius: '0.75rem',
                border: '1px solid var(--border-color)'
            }}>
                No task data to display
            </div>
        )
    }

    return (
        <div style={{
            background: 'var(--bg-secondary)',
            borderRadius: '0.75rem',
            border: '1px solid var(--border-color)',
            padding: '1.5rem',
            height: '500px'
        }}>
            <h3 style={{
                fontSize: '1.1rem',
                fontWeight: '600',
                marginBottom: '1.5rem'
            }} className="text-gradient">
                Tasks by Status
            </h3>

            <ResponsiveContainer width="100%" height="90%">
                <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <defs>
                        <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#ec4899" />
                            <stop offset="100%" stopColor="#8b5cf6" />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                    <XAxis
                        dataKey="name"
                        stroke="var(--text-secondary)"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                    />
                    <YAxis
                        stroke="var(--text-secondary)"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        allowDecimals={false}
                    />
                    <Tooltip cursor={{ fill: 'var(--bg-tertiary)', opacity: 0.5 }} content={<CustomTooltip />} />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={60} fill="url(#barGradient)" />
                </BarChart>
            </ResponsiveContainer>
        </div>
    )
}
