import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import {
    LayoutGrid,
    List,
    Search,
    User,
    Calendar,
    ArrowUpDown,
    ArrowUp,
    ArrowDown
} from 'lucide-react'
import { DragDropContext, type DropResult } from '@hello-pangea/dnd'
import KanbanColumn from './KanbanColumn'

interface Task {
    id: string
    title: string
    description?: string
    status_id: string
    department_id: string
    priority: 'low' | 'medium' | 'high'
    due_date?: string
    assigned_to?: string
    assignee?: {
        full_name: string
        avatar_url?: string
    }
    assignees?: {
        id: string
        full_name: string
        avatar_url?: string
    }[]
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
    subtasks_content?: string
    time_logged?: number
}



interface TaskStatus {
    id: string
    label: string
    color: string
}

interface TasksTrackerProps {
    clientId?: string | null
}

export default function TasksTracker({ clientId }: TasksTrackerProps) {
    const [viewMode, setViewMode] = useState<'list' | 'board'>('list')
    const [tasks, setTasks] = useState<Task[]>([])
    const [taskStatuses, setTaskStatuses] = useState<TaskStatus[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [prioritySort, setPrioritySort] = useState<'asc' | 'desc' | null>(null)

    // For the Kanban board, it usually works best within a single context (like a department).
    // If we are showing ALL tasks, a Kanban board might be messy if columns are department-specific.
    // For now, let's implement the List View as the primary view for "All Tasks", 
    // and maybe disable Board view if no department filter is selected, OR just show List view initially as per User Request for "Tracker".

    useEffect(() => {
        fetchTasks()
    }, [])

    const fetchTasks = async () => {
        setLoading(true)
        try {
            // Fetch Statuses
            const { data: statusData } = await supabase
                .from('task_statuses')
                .select('*')
                .order('position', { ascending: true })

            if (statusData) {
                // Deduplicate statuses by label
                const uniqueStatuses = statusData.reduce((acc: any[], current) => {
                    const x = acc.find(item => item.label === current.label);
                    if (!x) {
                        return acc.concat([current]);
                    } else {
                        return acc;
                    }
                }, []);
                setTaskStatuses(uniqueStatuses)
            }

            let query = supabase
                .from('tasks')
                .select(`
                    id,
                    title,
                    description,
                    subtasks_content,
                    priority,
                    due_date,
                    status_id,
                    department_id,
                    status:task_statuses(label, color),
                    assignee:profiles!tasks_assigned_to_fkey(id, full_name, avatar_url),
                    assignments:task_assignments(
                        user:profiles(id, full_name, avatar_url)
                    ),
                    department:departments!inner(
                        name,
                        workspace:workspaces!inner(
                            client:clients!inner(name)
                        )
                    )
                `)
                .order('created_at', { ascending: false })

            if (clientId) {
                // @ts-ignore
                query = query.eq('department.workspace.client_id', clientId)
            }

            const { data, error } = await query

            if (error) throw error

            // Fetch Time Logs
            const { data: logsData } = await supabase
                .from('subtask_time_logs')
                .select('task_id, duration_seconds, end_time, start_time')
                .in('task_id', data.map(t => t.id))

            const timeLogSummary: Record<string, number> = {}
            if (logsData) {
                logsData.forEach(log => {
                    let duration = log.duration_seconds || 0
                    if (!duration && log.end_time && log.start_time) {
                        duration = (new Date(log.end_time).getTime() - new Date(log.start_time).getTime()) / 1000
                    }
                    timeLogSummary[log.task_id] = (timeLogSummary[log.task_id] || 0) + duration
                })
            }

            const formattedTasks = data.map((t: any) => {
                // Merge legacy assignee with new assignments
                const assigneesMap = new Map()

                if (t.assignee) {
                    assigneesMap.set(t.assignee.id, t.assignee)
                }

                if (t.assignments) {
                    t.assignments.forEach((a: any) => {
                        if (a.user) assigneesMap.set(a.user.id, a.user)
                    })
                }

                return {
                    ...t,
                    assignee: t.assignee, // Legacy Profile object
                    assignees: Array.from(assigneesMap.values()),
                    client_name: t.department?.workspace?.client?.name,
                    dept_name: t.department?.name,
                    time_logged: timeLogSummary[t.id] || 0
                }
            })

            setTasks(formattedTasks)
        } catch (error) {
            console.error('Error fetching tasks:', error)
        } finally {
            setLoading(false)
        }
    }

    const togglePrioritySort = () => {
        setPrioritySort(current => {
            if (current === null) return 'desc' // Default to High -> Low first
            if (current === 'desc') return 'asc' // Then Low -> High
            return null // Then back to default (submission order usually)
        })
    }

    const filteredTasks = tasks.filter(task =>
        task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.department?.workspace?.client?.name.toLowerCase().includes(searchTerm.toLowerCase())
    ).sort((a, b) => {
        if (!prioritySort) return 0

        const priorityWeight = { high: 3, medium: 2, low: 1 }
        const weightA = priorityWeight[a.priority as keyof typeof priorityWeight] || 0
        const weightB = priorityWeight[b.priority as keyof typeof priorityWeight] || 0

        if (prioritySort === 'asc') {
            return weightA - weightB
        } else {
            return weightB - weightA
        }
    })

    const calculateProgress = (subtasksContent: string | undefined): number => {
        if (!subtasksContent) return 0
        const parser = new DOMParser()
        const doc = parser.parseFromString(subtasksContent, 'text/html')
        const allTodos = doc.querySelectorAll('li[data-type="taskItem"]')
        const completedTodos = doc.querySelectorAll('li[data-type="taskItem"][data-checked="true"]')
        if (allTodos.length === 0) return 0
        return Math.round((completedTodos.length / allTodos.length) * 100)
    }
    const formatDuration = (seconds: number) => {
        if (!seconds) return '0h 0m 0s'
        const h = Math.floor(seconds / 3600)
        const m = Math.floor((seconds % 3600) / 60)
        const s = Math.floor(seconds % 60)
        return `${h}h ${m}m ${s}s`
    }

    const handleDragEnd = async (result: DropResult) => {
        const { destination, source, draggableId } = result

        if (!destination) return
        if (destination.droppableId === source.droppableId && destination.index === source.index) return

        // Find the target status
        const targetStatusId = destination.droppableId
        const newStatus = taskStatuses.find(s => s.id === targetStatusId)

        if (!newStatus) return

        // Optimistic update
        const taskIndex = tasks.findIndex(t => t.id === draggableId)
        if (taskIndex === -1) return

        const updatedTasks = [...tasks]
        updatedTasks[taskIndex] = {
            ...updatedTasks[taskIndex],
            status_id: targetStatusId,
            status: {
                label: newStatus.label,
                color: newStatus.color
            }
        }
        setTasks(updatedTasks)

        try {
            const { error } = await supabase
                .from('tasks')
                .update({ status_id: targetStatusId })
                .eq('id', draggableId)

            if (error) throw error
        } catch (error) {
            console.error('Error updating task status:', error)
            fetchTasks() // Revert/Sync on error
        }
    }

    // function removed

    return (
        <div style={{ padding: '2rem', height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Tasks Tracker</h1>
                    <p style={{ color: 'var(--text-secondary)' }}>Track and manage tasks across all clients and departments.</p>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <div style={{ position: 'relative' }}>
                        <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                        <input
                            type="text"
                            placeholder="Search tasks..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{
                                padding: '0.625rem 0.75rem 0.625rem 2.5rem',
                                borderRadius: '8px',
                                border: '1px solid var(--border-color)',
                                background: 'var(--bg-secondary)',
                                color: 'var(--text-primary)',
                                outline: 'none',
                                width: '250px'
                            }}
                        />
                    </div>
                    {/* View Toggle - simplified for now */}
                    <div style={{ display: 'flex', background: 'var(--bg-tertiary)', padding: '4px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                        <button
                            onClick={() => setViewMode('list')}
                            style={{
                                padding: '0.5rem',
                                borderRadius: '6px',
                                border: 'none',
                                background: viewMode === 'list' ? 'var(--bg-primary)' : 'transparent',
                                color: viewMode === 'list' ? 'var(--accent-color)' : 'var(--text-secondary)',
                                cursor: 'pointer',
                                boxShadow: viewMode === 'list' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none'
                            }}
                        >
                            <List size={18} />
                        </button>
                        <button
                            onClick={() => setViewMode('board')}
                            style={{
                                padding: '0.5rem',
                                borderRadius: '6px',
                                border: 'none',
                                background: viewMode === 'board' ? 'var(--bg-primary)' : 'transparent',
                                color: viewMode === 'board' ? 'var(--accent-color)' : 'var(--text-secondary)',
                                cursor: 'pointer',
                                boxShadow: viewMode === 'board' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none'
                            }}
                        >
                            <LayoutGrid size={18} />
                        </button>
                    </div>
                </div>
            </div>

            {/* List View */}
            {viewMode === 'list' && (
                <div style={{
                    flex: 1,
                    background: 'var(--bg-secondary)',
                    borderRadius: '12px',
                    border: '1px solid var(--border-color)',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column'
                }}>
                    {/* Header */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'minmax(300px, 2fr) 150px 150px 150px 150px 100px',
                        padding: '1rem 1.5rem',
                        borderBottom: '1px solid var(--border-color)',
                        background: 'var(--bg-tertiary)',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        color: 'var(--text-secondary)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                    }}>
                        <div>Task</div>
                        <div>Client / Dept</div>
                        <div>Assignee</div>
                        <div>Status</div>
                        <div>Due Date</div>
                        <div
                            onClick={togglePrioritySort}
                            style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', cursor: 'pointer', userSelect: 'none' }}
                        >
                            Priority
                            {prioritySort === 'asc' && <ArrowUp size={14} />}
                            {prioritySort === 'desc' && <ArrowDown size={14} />}
                            {prioritySort === null && <ArrowUpDown size={14} style={{ opacity: 0.5 }} />}
                        </div>
                    </div>

                    {/* Body */}
                    <div style={{ overflowY: 'auto', flex: 1 }}>
                        {loading ? (
                            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading tasks...</div>
                        ) : filteredTasks.length === 0 ? (
                            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No tasks found.</div>
                        ) : (
                            filteredTasks.map(task => (
                                <div key={task.id} style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'minmax(300px, 2fr) 150px 150px 150px 150px 100px',
                                    padding: '1rem 1.5rem',
                                    borderBottom: '1px solid var(--border-color)',
                                    alignItems: 'center',
                                    transition: 'background 0.2s',
                                    cursor: 'pointer',
                                    background: 'var(--bg-secondary)'
                                }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-tertiary)'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = 'var(--bg-secondary)'}
                                >
                                    {/* Task Title & Desc */}
                                    <div>
                                        <div style={{ fontWeight: '600', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>{task.title}</div>
                                        <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {task.description ? task.description.replace(/<[^>]*>?/gm, '') : 'No description'}
                                        </div>
                                        {task.subtasks_content && calculateProgress(task.subtasks_content) > 0 && (
                                            <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', width: '90%' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <div style={{ flex: 1, height: '6px', background: 'var(--bg-tertiary)', borderRadius: '3px', overflow: 'hidden' }}>
                                                        <div style={{ width: `${calculateProgress(task.subtasks_content)}%`, height: '100%', background: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)', transition: 'width 0.3s' }} />
                                                    </div>
                                                    <span style={{ fontSize: '0.65rem', fontWeight: '600', color: 'var(--accent-color)', minWidth: '25px' }}>
                                                        {calculateProgress(task.subtasks_content)}%
                                                    </span>
                                                </div>
                                                <div style={{ alignSelf: 'flex-end', fontSize: '0.7rem', color: 'var(--accent-color)', fontWeight: '600' }}>
                                                    {formatDuration(task.time_logged || 0)}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Client */}
                                    <div>
                                        <div style={{ fontWeight: '500', fontSize: '0.875rem' }}>{task.department?.workspace?.client?.name || '-'}</div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{task.department?.name}</div>
                                    </div>

                                    {/* Assignee */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                        {task.assignees && task.assignees.length > 0 ? (
                                            task.assignees.map((assignee: any) => (
                                                <div key={assignee.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <div style={{
                                                        width: '24px', height: '24px', borderRadius: '50%',
                                                        background: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        fontSize: '0.75rem', fontWeight: '600', color: 'white',
                                                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                                    }}>
                                                        {assignee.full_name?.[0]?.toUpperCase() || <User size={12} />}
                                                    </div>
                                                    <span style={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}>{assignee.full_name || assignee.email}</span>
                                                </div>
                                            ))
                                        ) : (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: 0.5 }}>
                                                <User size={14} />
                                                <span style={{ fontSize: '0.875rem' }}>Unassigned</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Status */}
                                    <div>
                                        <span style={{
                                            padding: '0.25rem 0.75rem',
                                            borderRadius: '9999px',
                                            fontSize: '0.75rem',
                                            fontWeight: '600',
                                            background: 'transparent',
                                            border: '1px solid rgba(255,255,255,0.2)',
                                            ...(() => {
                                                const label = (task.status?.label || '').toLowerCase();
                                                if (label.includes('done') || label.includes('complete')) return { color: '#4ade80', borderColor: 'rgba(74, 222, 128, 0.4)' }
                                                if (label.includes('progress')) return { color: '#facc15', borderColor: 'rgba(250, 204, 21, 0.4)' }
                                                return { color: '#f87171', borderColor: 'rgba(248, 113, 113, 0.4)' }
                                            })()
                                        }}>
                                            {task.status?.label || 'No Status'}
                                        </span>
                                    </div>

                                    {/* Due Date */}
                                    <div style={{ fontSize: '0.875rem', color: (task.status?.label?.toLowerCase().includes('done') || task.status?.label?.toLowerCase().includes('complete')) ? '#4ade80' : (task.due_date && new Date(task.due_date) < new Date() ? 'var(--danger-color)' : 'var(--text-secondary)'), display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                        {task.due_date ? (
                                            <>
                                                <Calendar size={14} />
                                                {new Date(task.due_date).toLocaleDateString()}
                                            </>
                                        ) : '-'}
                                    </div>

                                    {/* Priority */}
                                    <div>
                                        <span style={{
                                            padding: '0.2rem 0.6rem',
                                            borderRadius: '4px',
                                            fontSize: '0.75rem',
                                            fontWeight: '600',
                                            textTransform: 'capitalize',
                                            background: 'transparent',
                                            border: '1px solid rgba(255,255,255,0.2)',
                                            ...(() => {
                                                switch (task.priority) {
                                                    case 'high': return { color: '#f87171', borderColor: 'rgba(248, 113, 113, 0.4)' } // Red
                                                    case 'medium': return { color: '#facc15', borderColor: 'rgba(250, 204, 21, 0.4)' } // Yellow
                                                    case 'low': return { color: '#4ade80', borderColor: 'rgba(74, 222, 128, 0.4)' } // Green
                                                    default: return { color: '#9ca3af', borderColor: 'rgba(156, 163, 175, 0.4)' }
                                                }
                                            })()
                                        }}>
                                            {task.priority || 'Normal'}
                                        </span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* Board View */}
            {viewMode === 'board' && (
                <DragDropContext onDragEnd={handleDragEnd}>
                    <div style={{ flex: 1, overflowX: 'auto', overflowY: 'hidden', display: 'flex', gap: '1rem', paddingBottom: '0.5rem' }}>
                        {taskStatuses.map(status => {
                            const columnTasks = filteredTasks.filter(t => t.status?.label === status.label)
                            return (
                                <KanbanColumn key={status.id} status={status} tasks={columnTasks} />
                            )
                        })}
                    </div>
                </DragDropContext>
            )}
        </div >
    )
}
