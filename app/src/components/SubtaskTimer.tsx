import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Play, Square, Clock } from 'lucide-react'

interface SubtaskTimeLog {
    id: string
    task_id: string
    user_id: string
    subtask_name: string
    start_time: string
    end_time: string | null
    duration_seconds: number | null
    created_at: string
}

interface Subtask {
    id: string
    title: string
    is_completed: boolean
}

interface SubtaskTimerProps {
    taskId: string
    subtasks: Subtask[]
    onToggleSubtask: (id: string, isCompleted: boolean) => void
    onEdit: () => void
}

export default function SubtaskTimer({ taskId, subtasks, onToggleSubtask, onEdit }: SubtaskTimerProps) {
    const { user } = useAuth()
    const [activeTimer, setActiveTimer] = useState<{ id: string; subtaskName: string; startTime: Date } | null>(null)
    const [elapsedSeconds, setElapsedSeconds] = useState(0)
    const [timeLogs, setTimeLogs] = useState<SubtaskTimeLog[]>([])
    const [loading, setLoading] = useState(false)

    // Load time logs
    useEffect(() => {
        if (user && taskId) {
            loadTimeLogs()
            loadActiveTimer()
        }
    }, [user, taskId])

    // Timer tick
    useEffect(() => {
        if (!activeTimer) return

        const interval = setInterval(() => {
            const elapsed = Math.floor((new Date().getTime() - activeTimer.startTime.getTime()) / 1000)
            setElapsedSeconds(elapsed)
        }, 1000)

        return () => clearInterval(interval)
    }, [activeTimer])

    const loadTimeLogs = async () => {
        if (!user) return
        try {
            const { data, error } = await supabase
                .from('subtask_time_logs')
                .select('*')
                .eq('task_id', taskId)
                .order('created_at', { ascending: false })

            if (error) throw error
            setTimeLogs(data || [])
        } catch (error) {
            console.error('Error loading time logs:', error)
        }
    }

    const loadActiveTimer = async () => {
        if (!user) return
        try {
            const { data } = await supabase
                .from('subtask_time_logs')
                .select('*')
                .eq('task_id', taskId)
                .eq('user_id', user.id)
                .is('end_time', null)
                .maybeSingle()

            if (data) {
                const startTime = new Date(data.start_time)
                setActiveTimer({
                    id: data.id,
                    subtaskName: data.subtask_name,
                    startTime: startTime
                })
                setElapsedSeconds(Math.floor((new Date().getTime() - startTime.getTime()) / 1000))
            }
        } catch (error) {
            // No active timer
        }
    }

    const handleStartTimer = async (subtaskName: string) => {
        if (!user || activeTimer) return

        setLoading(true)
        try {
            const startTime = new Date()
            const payload = {
                task_id: taskId,
                user_id: user.id,
                subtask_name: subtaskName,
                start_time: startTime.toISOString(),
                end_time: null
            }

            const { data, error } = await supabase
                .from('subtask_time_logs')
                .insert(payload)
                .select()
                .single()

            if (error) throw error

            if (data) {
                setActiveTimer({
                    id: data.id,
                    subtaskName: subtaskName,
                    startTime: startTime
                })
                setElapsedSeconds(0)
            }
        } catch (error: any) {
            // Handle unique constraint violation (code 23505)
            if (error.code === '23505' || error.message?.includes('duplicate key value') || error.message?.includes('unique constraint')) {
                alert('A timer is already running for this task.')
                await loadActiveTimer() // Sync state with the server
            } else {
                console.error('Error starting timer:', error)
                alert('Failed to start timer.')
            }
        } finally {
            setLoading(false)
        }
    }

    const handleStopTimer = async () => {
        if (!activeTimer || !user) return

        setLoading(true)
        try {
            const endTime = new Date()
            const durationSeconds = Math.floor((endTime.getTime() - activeTimer.startTime.getTime()) / 1000)

            const { error } = await supabase
                .from('subtask_time_logs')
                .update({
                    end_time: endTime.toISOString(),
                    duration_seconds: durationSeconds
                })
                .eq('id', activeTimer.id)

            if (error) throw error

            setActiveTimer(null)
            setElapsedSeconds(0)
            loadTimeLogs()
            loadActiveTimer()
        } catch (error) {
            console.error('Error stopping timer:', error)
            alert('Failed to stop timer.')
        } finally {
            setLoading(false)
        }
    }

    const formatTime = (seconds: number): string => {
        const h = Math.floor(seconds / 3600)
        const m = Math.floor((seconds % 3600) / 60)
        const s = seconds % 60
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
    }

    const getTotalTimeForSubtask = (subtaskName: string): number => {
        return timeLogs
            .filter(log => log.subtask_name === subtaskName && log.duration_seconds)
            .reduce((total, log) => total + (log.duration_seconds || 0), 0)
    }

    const handleToggleSubtask = (id: string, isCompleted: boolean) => {
        onToggleSubtask(id, isCompleted)
    }

    if (!subtasks || subtasks.length === 0) {
        return (
            <div style={{ padding: '2rem', textAlign: 'center', background: 'var(--bg-tertiary)', borderRadius: '0.5rem', border: '1px dashed var(--border-color)' }}>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>No subtasks yet.</p>
                <button
                    onClick={onEdit}
                    style={{
                        background: 'var(--accent-color)',
                        color: 'white',
                        border: 'none',
                        padding: '0.5rem 1rem',
                        borderRadius: '0.375rem',
                        cursor: 'pointer'
                    }}
                >
                    Add Subtasks
                </button>
            </div>
        )
    }

    return (
        <div style={{ marginBottom: '2rem' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                    <Clock size={20} />
                    Subtasks & Timer
                </h3>
                <button
                    onClick={onEdit}
                    style={{
                        background: 'transparent',
                        color: 'var(--accent-color)',
                        border: '1px solid var(--accent-color)',
                        padding: '0.25rem 0.75rem',
                        borderRadius: '0.375rem',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        cursor: 'pointer'
                    }}
                >
                    Edit List
                </button>
            </div>

            {/* List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {subtasks.map((task) => {
                    const isActive = activeTimer?.subtaskName === task.title
                    const totalTime = getTotalTimeForSubtask(task.title)

                    return (
                        <div key={task.id} style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            background: isActive ? 'rgba(34, 197, 94, 0.1)' : 'var(--bg-tertiary)',
                            border: isActive ? '1px solid var(--success-color)' : '1px solid var(--border-color)',
                            borderRadius: '0.5rem',
                            padding: '0.75rem',
                            gap: '1rem'
                        }}>
                            {/* Checkbox & Text */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
                                <div
                                    onClick={() => handleToggleSubtask(task.id, !task.is_completed)}
                                    style={{
                                        width: '20px',
                                        height: '20px',
                                        borderRadius: '4px',
                                        border: task.is_completed ? 'none' : '2px solid var(--text-secondary)',
                                        background: task.is_completed ? 'var(--success-color)' : 'transparent',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer',
                                        flexShrink: 0
                                    }}
                                >
                                    {task.is_completed && <Square size={12} fill="white" color="white" />}
                                </div>
                                <span style={{
                                    textDecoration: task.is_completed ? 'line-through' : 'none',
                                    color: task.is_completed ? 'var(--text-secondary)' : 'var(--text-primary)',
                                    fontWeight: '500',
                                    fontSize: '0.9rem'
                                }}>
                                    {task.title}
                                </span>
                            </div>

                            {/* Controls */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                {/* Time Display */}
                                <div style={{
                                    fontFamily: 'monospace',
                                    fontSize: '0.9rem',
                                    fontWeight: '600',
                                    color: isActive ? 'var(--success-color)' : 'var(--text-secondary)'
                                }}>
                                    {isActive ? formatTime(elapsedSeconds) : formatTime(totalTime)}
                                </div>

                                {/* Timer Button */}
                                {isActive ? (
                                    <button
                                        onClick={handleStopTimer}
                                        disabled={loading}
                                        style={{
                                            background: 'rgba(239, 68, 68, 0.1)',
                                            color: 'var(--danger-color)',
                                            border: '1px solid var(--danger-color)',
                                            width: '32px',
                                            height: '32px',
                                            borderRadius: '50%',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            cursor: 'pointer'
                                        }}
                                        title="Stop Timer"
                                    >
                                        <Square size={12} fill="currentColor" />
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => handleStartTimer(task.title)}
                                        disabled={loading || (activeTimer !== null) || task.is_completed}
                                        style={{
                                            background: 'rgba(34, 197, 94, 0.1)',
                                            color: 'var(--success-color)',
                                            border: '1px solid var(--success-color)',
                                            width: '32px',
                                            height: '32px',
                                            borderRadius: '50%',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            cursor: (loading || activeTimer || task.is_completed) ? 'not-allowed' : 'pointer',
                                            opacity: (loading || activeTimer || task.is_completed) ? 0.5 : 1
                                        }}
                                        title={task.is_completed ? "Cannot time completed task" : "Start Timer"}
                                    >
                                        <Play size={12} fill="currentColor" />
                                    </button>
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
