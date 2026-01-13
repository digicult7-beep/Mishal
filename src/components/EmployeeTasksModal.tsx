import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import Modal from './Modal'
import { CheckCircle2, Calendar, Clock, ArrowRight } from 'lucide-react'

interface EmployeeTasksModalProps {
    isOpen: boolean
    onClose: () => void
    employeeId: string | null
    employeeName: string
}

interface Task {
    id: string
    title: string
    description?: string
    status_id: string
    priority: 'low' | 'medium' | 'high'
    due_date?: string
    status?: {
        label: string
        color: string
    }
    department?: {
        name: string
        workspace?: {
            client?: {
                name: string
            }
        }
    }
}

export default function EmployeeTasksModal({ isOpen, onClose, employeeId, employeeName }: EmployeeTasksModalProps) {
    const [tasks, setTasks] = useState<Task[]>([])
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (isOpen && employeeId) {
            loadTasks()
        }
    }, [isOpen, employeeId])

    const loadTasks = async () => {
        if (!employeeId) return
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('tasks')
                .select(`
                    id,
                    title,
                    description,
                    priority,
                    due_date,
                    status_id,
                    status:task_statuses(label, color),
                    assignments:task_assignments!inner(user_id),
                    department:departments(
                        name,
                        workspace:workspaces(
                            client:clients(name)
                        )
                    )
                `)
                .eq('assignments.user_id', employeeId)
                .order('due_date', { ascending: true })

            if (error) throw error

            const formattedTasks = data?.map((t: any) => ({
                ...t,
                status: Array.isArray(t.status) ? t.status[0] : t.status,
                department: Array.isArray(t.department) ? t.department[0] : t.department
            }))

            setTasks(formattedTasks || [])
        } catch (error) {
            console.error('Error loading employee tasks:', error)
        } finally {
            setLoading(false)
        }
    }

    const formatDate = (dateString?: string) => {
        if (!dateString) return '-'
        return new Date(dateString).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    }

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'high': return '#ef4444'
            case 'medium': return '#f59e0b'
            case 'low': return '#10b981'
            default: return 'var(--text-secondary)'
        }
    }

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`Tasks - ${employeeName}`}
        >
            <div style={{ padding: '1.5rem', maxHeight: '70vh', overflowY: 'auto' }}>
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                        <Clock className="animate-spin" size={24} style={{ marginBottom: '0.5rem' }} />
                        <p>Loading tasks...</p>
                    </div>
                ) : tasks.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                        <CheckCircle2 size={48} style={{ marginBottom: '1rem', opacity: 0.2 }} />
                        <p>No tasks assigned to {employeeName}.</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {tasks.map(task => (
                            <div key={task.id} style={{
                                background: 'var(--bg-secondary)',
                                border: '1px solid var(--border-color)',
                                borderRadius: '0.75rem',
                                padding: '1rem',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                transition: 'all 0.2s',
                                boxShadow: 'var(--glass-shadow)'
                            }}>
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
                                        <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: '600', color: 'var(--text-primary)' }}>{task.title}</h4>
                                        <span style={{
                                            fontSize: '0.7rem',
                                            padding: '0.1rem 0.5rem',
                                            borderRadius: '999px',
                                            border: `1px solid ${getPriorityColor(task.priority)}40`,
                                            color: getPriorityColor(task.priority),
                                            background: `${getPriorityColor(task.priority)}10`,
                                            textTransform: 'capitalize'
                                        }}>
                                            {task.priority}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                            {task.department?.workspace?.client?.name} <ArrowRight size={10} /> {task.department?.name}
                                        </span>
                                    </div>
                                </div>

                                <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-end' }}>
                                    <span style={{
                                        fontSize: '0.75rem',
                                        padding: '0.2rem 0.6rem',
                                        borderRadius: '6px',
                                        background: task.status?.color ? `${task.status.color}20` : 'var(--bg-tertiary)',
                                        color: task.status?.label?.toLowerCase().includes('done') ? '#22c55e' : 'var(--text-primary)',
                                        border: `1px solid ${task.status?.color}40`,
                                        fontWeight: '600'
                                    }}>
                                        {task.status?.label || 'Unknown'}
                                    </span>
                                    {task.due_date && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', color: new Date(task.due_date) < new Date() ? 'var(--danger-color)' : 'var(--text-secondary)' }}>
                                            <Calendar size={12} /> {formatDate(task.due_date)}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </Modal>
    )
}
