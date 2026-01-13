import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import Modal from './Modal'
import {
    BarChart3,
    CheckCircle2,
    Circle,
    Clock
} from 'lucide-react'

interface DashboardAnalyticsModalProps {
    isOpen: boolean
    onClose: () => void
    ccId: string | undefined
}

interface TaskStats {
    total: number
    todo: number
    inProgress: number
    done: number
}

export default function DashboardAnalyticsModal({
    isOpen,
    onClose,
    ccId
}: DashboardAnalyticsModalProps) {
    const [loading, setLoading] = useState(true)
    const [taskStats, setTaskStats] = useState<TaskStats>({ total: 0, todo: 0, inProgress: 0, done: 0 })

    useEffect(() => {
        if (isOpen && ccId) {
            loadTaskStats()
        }
    }, [isOpen, ccId])

    const loadTaskStats = async () => {
        setLoading(true)
        try {
            // Fetch all tasks associated with the CC's clients/workspaces/departments
            // We can do this by joining tables. 
            // A more efficient way for stats might be a direct count query if we had a view, 
            // but for now we'll fetch tasks that belong to departments under the CC.

            const { data: tasks, error } = await supabase
                .from('tasks')
                .select(`
                    id,
                    status_id,
                    task_statuses!inner (
                        label,
                        department_id,
                        departments!inner (
                            workspace_id,
                            workspaces!inner (
                                client_id,
                                clients!inner (
                                    cc_id
                                )
                            )
                        )
                    )
                `)
                .eq('task_statuses.departments.workspaces.clients.cc_id', ccId)

            if (error) throw error

            const stats = {
                total: tasks?.length || 0,
                todo: 0,
                inProgress: 0,
                done: 0
            }

            tasks?.forEach((task: any) => {
                const statusLabel = task.task_statuses?.label?.toLowerCase() || ''
                if (statusLabel.includes('done') || statusLabel.includes('complete')) {
                    stats.done++
                } else if (statusLabel.includes('progress') || statusLabel.includes('doing')) {
                    stats.inProgress++
                } else {
                    stats.todo++
                }
            })

            setTaskStats(stats)
        } catch (error) {
            console.error('Error loading analytics:', error)
        } finally {
            setLoading(false)
        }
    }



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
        <Modal isOpen={isOpen} onClose={onClose} title="Dashboard Analytics" maxWidth="800px">
            <div style={{ padding: '0.5rem' }}>
                {/* Overview Cards */}


                {/* Task Analytics */}
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
                            Total Tasks: <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{taskStats.total}</span>
                        </div>
                    </div>

                    {loading ? (
                        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading task statistics...</div>
                    ) : (
                        <div>
                            <ProgressBar
                                label="To Do"
                                value={taskStats.todo}
                                total={taskStats.total}
                                color="var(--text-secondary)"
                                icon={Circle}
                            />
                            <ProgressBar
                                label="In Progress"
                                value={taskStats.inProgress}
                                total={taskStats.total}
                                color="var(--warning-color)"
                                icon={Clock}
                            />
                            <ProgressBar
                                label="Done"
                                value={taskStats.done}
                                total={taskStats.total}
                                color="var(--success-color)"
                                icon={CheckCircle2}
                            />
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    )
}
