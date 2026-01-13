
import { useMemo } from 'react'
import { AlertCircle, Clock, CheckCircle2 } from 'lucide-react'

interface Task {
    id: string
    title: string
    status_id: string
    due_date?: string
}

interface TaskStatus {
    id: string
    label: string
}

interface NotificationDropdownProps {
    tasks: Task[]
    statuses: TaskStatus[]
    onTaskClick: (task: any) => void
    onClose: () => void
}

export default function NotificationDropdown({
    tasks,
    statuses,
    onTaskClick,
    onClose
}: NotificationDropdownProps) {
    const notifications = useMemo(() => {
        const now = new Date()
        const next24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000)

        // Helper to check if status considered "done"
        const isCompleted = (statusId: string) => {
            const status = statuses.find(s => s.id === statusId)
            const label = status?.label.toLowerCase() || ''
            return label.includes('done') || label.includes('complete') || label.includes('finish')
        }

        const dueTasks = tasks.filter(task => {
            if (!task.due_date) return false
            if (isCompleted(task.status_id)) return false

            const dueDate = new Date(task.due_date)
            // Task is overdue OR due within next 24 hours
            return dueDate < next24Hours
        })

        // Sort by due date (most urgent first)
        return dueTasks.sort((a, b) =>
            new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime()
        )
    }, [tasks, statuses])

    if (notifications.length === 0) {
        return (
            <div style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: '0.5rem',
                width: '320px',
                background: 'white',
                borderRadius: '0.75rem',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                border: '1px solid #e5e7eb',
                zIndex: 50,
                padding: '1.5rem',
                textAlign: 'center',
                color: '#6b7280'
            }}>
                <CheckCircle2 size={32} style={{ margin: '0 auto 0.5rem', color: '#10b981' }} />
                <p style={{ fontWeight: '500' }}>You're all caught up!</p>
                <p style={{ fontSize: '0.875rem' }}>No tasks due soon.</p>
            </div>
        )
    }

    return (
        <div style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: '0.5rem',
            width: '320px',
            background: 'white',
            borderRadius: '0.75rem',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
            border: '1px solid #e5e7eb',
            zIndex: 50,
            overflow: 'hidden'
        }}>
            <div style={{ padding: '1rem', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#111827', margin: 0 }}>Notifications</h3>
                <span style={{ fontSize: '0.75rem', padding: '0.125rem 0.5rem', background: '#fee2e2', color: '#b91c1c', borderRadius: '9999px', fontWeight: '600' }}>
                    {notifications.length} Due
                </span>
            </div>
            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                {notifications.map(task => {
                    const dueDate = new Date(task.due_date!)
                    const isOverdue = dueDate < new Date()

                    return (
                        <div
                            key={task.id}
                            onClick={() => {
                                onTaskClick(task)
                                onClose()
                            }}
                            style={{
                                padding: '1rem',
                                borderBottom: '1px solid #f3f4f6',
                                cursor: 'pointer',
                                transition: 'background 0.2s',
                                display: 'flex',
                                gap: '0.75rem',
                                alignItems: 'flex-start'
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                            onMouseLeave={e => e.currentTarget.style.background = 'white'}
                        >
                            <div style={{ marginTop: '0.125rem' }}>
                                {isOverdue ? (
                                    <AlertCircle size={18} color="#ef4444" />
                                ) : (
                                    <Clock size={18} color="#f59e0b" />
                                )}
                            </div>
                            <div>
                                <h4 style={{ fontSize: '0.875rem', fontWeight: '500', color: '#111827', margin: '0 0 0.25rem 0' }}>
                                    {task.title}
                                </h4>
                                <p style={{ fontSize: '0.75rem', color: isOverdue ? '#ef4444' : '#d97706', margin: 0, fontWeight: '500' }}>
                                    {isOverdue ? 'Overdue by ' : 'Due in '}
                                    {isOverdue
                                        ? Math.ceil((new Date().getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)) + ' days'
                                        : Math.ceil((dueDate.getTime() - new Date().getTime()) / (1000 * 60 * 60)) + ' hours'
                                    }
                                </p>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
