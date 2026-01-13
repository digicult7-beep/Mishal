import Modal from './Modal'
import {
    BarChart3,
    CheckCircle2,
    Circle,
    Clock
} from 'lucide-react'

interface Task {
    id: string
    status_id: string
    [key: string]: any
}

interface TaskStatus {
    id: string
    label: string
    [key: string]: any
}

interface EmployeeAnalyticsModalProps {
    isOpen: boolean
    onClose: () => void
    tasks: Task[]
    statuses: TaskStatus[]
}

export default function EmployeeAnalyticsModal({
    isOpen,
    onClose,
    tasks,
    statuses
}: EmployeeAnalyticsModalProps) {

    const stats = {
        total: tasks.length,
        todo: 0,
        inProgress: 0,
        done: 0
    }

    tasks.forEach(task => {
        const status = statuses.find(s => s.id === task.status_id)
        const statusLabel = status?.label?.toLowerCase() || ''

        if (statusLabel.includes('done') || statusLabel.includes('complete')) {
            stats.done++
        } else if (statusLabel.includes('progress') || statusLabel.includes('doing')) {
            stats.inProgress++
        } else {
            stats.todo++
        }
    })

    const ProgressBar = ({ label, value, total, color, icon: Icon }: any) => {
        const percentage = total > 0 ? Math.round((value / total) * 100) : 0
        return (
            <div style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)', fontWeight: '500' }}>
                        <Icon size={16} style={{ color }} />
                        <span>{label}</span>
                    </div>
                    <span style={{ color: 'var(--text-secondary)' }}>{value} ({percentage}%)</span>
                </div>
                <div style={{ width: '100%', height: '8px', background: 'var(--bg-tertiary)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${percentage}%`, height: '100%', background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)', borderRadius: '4px', transition: 'width 0.5s ease-out' }} />
                </div>
            </div>
        )
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="My Task Report" maxWidth="600px">
            <div style={{ padding: '0.5rem' }}>
                <div style={{
                    background: 'var(--bg-secondary)',
                    borderRadius: '1rem',
                    padding: '1.5rem',
                    border: '1px solid var(--border-color)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                        <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <BarChart3 size={20} />
                            Task Overview
                        </h3>
                        <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                            Total Tasks: <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{stats.total}</span>
                        </div>
                    </div>

                    <div>
                        <ProgressBar
                            label="To Do"
                            value={stats.todo}
                            total={stats.total}
                            color="var(--text-secondary)"
                            icon={Circle}
                        />
                        <ProgressBar
                            label="In Progress"
                            value={stats.inProgress}
                            total={stats.total}
                            color="var(--warning-color)"
                            icon={Clock}
                        />
                        <ProgressBar
                            label="Done"
                            value={stats.done}
                            total={stats.total}
                            color="var(--success-color)"
                            icon={CheckCircle2}
                        />
                    </div>
                </div>
            </div>
        </Modal>
    )
}
