import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import Modal from './Modal'
import { CheckCircle2, Calendar, User, LayoutGrid, List, X } from 'lucide-react'
import KanbanBoard from './KanbanBoard'
import RichTextEditor from './RichTextEditor'
import SubtaskTimer from './SubtaskTimer'

interface DepartmentTasksModalProps {
    isOpen: boolean
    onClose: () => void
    departmentId: string | null
    departmentName: string
    employees: any[]
}

interface Task {
    id: string
    title: string
    description?: string
    subtasks_content?: string
    status_id: string
    priority: 'low' | 'medium' | 'high'
    due_date?: string
    created_at: string
    assignments?: {
        user_id: string
        user: {
            full_name: string
            email: string
        }
    }[]
}

interface TaskStatus {
    id: string
    label: string
    color: string
    position: number
}

interface TimeLogSummary {
    task_id: string
    total_seconds: number
}

export default function DepartmentTasksModal({
    isOpen,
    onClose,
    departmentId,
    departmentName,
    employees
}: DepartmentTasksModalProps) {
    const [tasks, setTasks] = useState<Task[]>([])
    const [statuses, setStatuses] = useState<TaskStatus[]>([])
    const [timeLogs, setTimeLogs] = useState<TimeLogSummary[]>([])
    const [loading, setLoading] = useState(false)
    const [showCreateForm, setShowCreateForm] = useState(false)
    const [viewMode, setViewMode] = useState<'list' | 'board'>('list')
    const [editingTask, setEditingTask] = useState<Task | null>(null)

    // Form State
    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [assignedTo, setAssignedTo] = useState<string[]>([])
    const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium')
    const [dueDate, setDueDate] = useState('')

    useEffect(() => {
        if (isOpen && departmentId) {
            loadData()
        }
    }, [isOpen, departmentId])

    const loadData = async () => {
        if (!departmentId) return
        setLoading(true)
        try {
            // 1. Ensure statuses exist
            let { data: statusData } = await supabase
                .from('task_statuses')
                .select('*')
                .eq('department_id', departmentId)
                .order('position')

            if (!statusData || statusData.length === 0) {
                // Create default statuses
                const defaultStatuses = [
                    { department_id: departmentId, label: 'To Do', position: 0, color: '#e2e8f0' },
                    { department_id: departmentId, label: 'In Progress', position: 1, color: '#fef3c7' },
                    { department_id: departmentId, label: 'Done', position: 2, color: '#ecfdf5' }
                ]
                const { data: newStatuses, error: createError } = await supabase
                    .from('task_statuses')
                    .insert(defaultStatuses)
                    .select()

                if (createError) throw createError
                statusData = newStatuses
            }
            setStatuses(statusData || [])

            // 2. Load Tasks with Assignments
            const { data: tasksData, error: tasksError } = await supabase
                .from('tasks')
                .select(`
                    *,
                    assignments:task_assignments(
                        user_id,
                        user:profiles(full_name, email)
                    )
                `)
                .eq('department_id', departmentId)
                .order('created_at', { ascending: false })

            if (tasksError) throw tasksError
            setTasks(tasksData || [])

            // 3. Load Time Logs Summary
            if (tasksData && tasksData.length > 0) {
                const { data: logsData, error: logsError } = await supabase
                    .from('subtask_time_logs')
                    .select('task_id, duration_seconds, end_time, start_time')
                    .in('task_id', tasksData.map(t => t.id))

                if (logsError) throw logsError

                // Calculate total time per task
                const summary: Record<string, number> = {}
                logsData?.forEach(log => {
                    let duration = log.duration_seconds || 0
                    if (!duration && log.end_time && log.start_time) {
                        duration = (new Date(log.end_time).getTime() - new Date(log.start_time).getTime()) / 1000
                    }
                    summary[log.task_id] = (summary[log.task_id] || 0) + duration
                })

                setTimeLogs(Object.entries(summary).map(([task_id, total_seconds]) => ({ task_id, total_seconds })))
            }

        } catch (error) {
            console.error('Error loading department tasks:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleCreateTask = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!departmentId) return

        try {
            let taskId: string

            if (editingTask) {
                // Update existing task
                const { error } = await supabase
                    .from('tasks')
                    .update({
                        title,
                        description,
                        priority,
                        due_date: dueDate || null
                    })
                    .eq('id', editingTask.id)

                if (error) throw error
                taskId = editingTask.id

                // Update assignments
                // First delete existing
                const { error: deleteError } = await supabase
                    .from('task_assignments')
                    .delete()
                    .eq('task_id', taskId)

                if (deleteError) throw deleteError

            } else {
                // Create new task
                const todoStatus = statuses.find(s => s.label === 'To Do') || statuses[0]

                const { data, error } = await supabase
                    .from('tasks')
                    .insert({
                        department_id: departmentId,
                        title,
                        description,
                        priority,
                        due_date: dueDate || null,
                        status_id: todoStatus?.id
                    })
                    .select()
                    .single()

                if (error) throw error
                taskId = data.id
            }

            // Insert new assignments
            if (assignedTo.length > 0) {
                // Ensure unique user IDs
                const uniqueUserIds = [...new Set(assignedTo)]
                const assignments = uniqueUserIds.map(userId => ({
                    task_id: taskId,
                    user_id: userId
                }))

                // Use upsert to be safe against race conditions or failed deletes
                const { error: assignError } = await supabase
                    .from('task_assignments')
                    .upsert(assignments, { onConflict: 'task_id,user_id' })

                if (assignError) throw assignError
            }

            // Reset form and reload
            setTitle('')
            setDescription('')
            setAssignedTo([])
            setPriority('medium')
            setDueDate('')
            setShowCreateForm(false)
            setEditingTask(null)
            loadData()

        } catch (error) {
            console.error('Error creating/updating task:', error)
            alert('Failed to create/update task')
        }
    }

    const handleUpdateTaskStatus = async (taskId: string, newStatusLabel: string) => {
        const newStatus = statuses.find(s => s.label === newStatusLabel)
        if (!newStatus) return

        // Optimistic update
        setTasks(prev => prev.map(t =>
            t.id === taskId ? { ...t, status_id: newStatus.id } : t
        ))

        const { error } = await supabase
            .from('tasks')
            .update({ status_id: newStatus.id })
            .eq('id', taskId)

        if (error) {
            console.error('Error updating task status:', error)
            // Revert on error
            loadData()
        }
    }

    const handleEditTask = (task: Task) => {
        setEditingTask(task)
        setTitle(task.title)
        setDescription(task.description || '')
        setAssignedTo(task.assignments?.map(a => a.user_id) || [])
        setPriority(task.priority)
        setDueDate(task.due_date ? task.due_date.split('T')[0] : '')
        setShowCreateForm(true)
    }

    const handleUpdateSubtasks = async (newContent: string) => {
        if (!editingTask) return

        // Optimistic update
        setEditingTask(prev => prev ? { ...prev, subtasks_content: newContent } : null)
        setTasks(prev => prev.map(t =>
            t.id === editingTask.id ? { ...t, subtasks_content: newContent } : t
        ))

        const { error } = await supabase
            .from('tasks')
            .update({ subtasks_content: newContent })
            .eq('id', editingTask.id)

        if (error) {
            console.error('Error updating subtasks:', error)
        }
    }

    const handleDeleteTask = async (taskId: string) => {
        if (!confirm('Are you sure you want to delete this task?')) return

        try {
            const { error } = await supabase
                .from('tasks')
                .delete()
                .eq('id', taskId)

            if (error) throw error
            loadData()
        } catch (error) {
            console.error('Error deleting task:', error)
            alert('Failed to delete task')
        }
    }

    const formatDuration = (seconds: number) => {
        const h = Math.floor(seconds / 3600)
        const m = Math.floor((seconds % 3600) / 60)
        const s = Math.floor(seconds % 60)
        return `${h}h ${m}m ${s}s`
    }

    const toggleAssignee = (employeeId: string) => {
        setAssignedTo(prev =>
            prev.includes(employeeId)
                ? prev.filter(id => id !== employeeId)
                : [...prev, employeeId]
        )
    }

    const stripHtml = (html: string) => {
        const tmp = document.createElement('DIV')
        tmp.innerHTML = html
        return tmp.textContent || tmp.innerText || ''
    }

    const calculateProgress = (subtasksContent: string | undefined): number => {
        if (!subtasksContent) return 0
        const parser = new DOMParser()
        const doc = parser.parseFromString(subtasksContent, 'text/html')
        const allTodos = doc.querySelectorAll('li[data-type="taskItem"]')
        const completedTodos = doc.querySelectorAll('li[data-type="taskItem"][data-checked="true"]')
        if (allTodos.length === 0) return 0
        return Math.round((completedTodos.length / allTodos.length) * 100)
    }

    const handleCreateStatus = async (label: string) => {
        if (!departmentId) return

        try {
            const { error } = await supabase
                .from('task_statuses')
                .insert({
                    department_id: departmentId,
                    label,
                    position: statuses.length
                })

            if (error) throw error
            loadData()
        } catch (error) {
            console.error('Error creating status:', error)
            alert('Failed to create status')
        }
    }

    const handleReorderStatus = async (startIndex: number, endIndex: number) => {
        if (!departmentId) return

        const result = Array.from(statuses)
        const [removed] = result.splice(startIndex, 1)
        result.splice(endIndex, 0, removed)

        // Optimistic update
        const newStatuses = result.map((s, index) => ({ ...s, position: index }))
        setStatuses(newStatuses)

        try {
            // Update all positions in db
            const updates = newStatuses.map(s => ({
                id: s.id,
                position: s.position,
                label: s.label,
                department_id: departmentId
            }))

            const { error } = await supabase
                .from('task_statuses')
                .upsert(updates)

            if (error) throw error
        } catch (error) {
            console.error('Error reordering statuses:', error)
            loadData() // Revert
        }
    }

    const handleDeleteStatus = async (statusId: string) => {
        try {
            const { error } = await supabase
                .from('task_statuses')
                .delete()
                .eq('id', statusId)

            if (error) throw error
            loadData()
        } catch (error) {
            console.error('Error deleting status:', error)
            alert('Failed to delete status')
        }
    }

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`Tasks - ${departmentName}`}
            variant="fullscreen"
            bodyStyle={{ padding: 0, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}
        >
            <div style={{ padding: '1rem 2rem', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center' }}>
                <h2 style={{
                    fontSize: '1.5rem',
                    fontWeight: 'bold',
                    margin: 0,
                    background: 'linear-gradient(to right, #ec4899, #8b5cf6)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    width: 'fit-content'
                }}>Tasks - {departmentName}</h2>
            </div>
            <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

                {/* Left Panel: Task List */}
                <div style={{
                    width: showCreateForm || editingTask ? '40%' : '100%',
                    borderRight: showCreateForm || editingTask ? '1px solid var(--border-color)' : 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'width 0.3s ease'
                }}>
                    {/* Toolbar */}
                    <div style={{
                        padding: '1rem',
                        borderBottom: '1px solid var(--border-color)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        background: 'var(--bg-secondary)'
                    }}>
                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                                <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{tasks.length}</span> Tasks
                            </div>
                            <div style={{ height: '16px', width: '1px', background: 'var(--border-color)' }}></div>
                            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                                <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                                    {formatDuration(timeLogs.reduce((acc, curr) => acc + curr.total_seconds, 0))}
                                </span> Logged
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <div style={{ display: 'flex', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '0.5rem', padding: '2px' }}>
                                <button
                                    onClick={() => setViewMode('list')}
                                    style={{
                                        padding: '0.25rem 0.5rem',
                                        background: viewMode === 'list' ? 'var(--bg-primary)' : 'transparent',
                                        color: viewMode === 'list' ? 'var(--accent-color)' : 'var(--text-secondary)',
                                        border: 'none',
                                        borderRadius: '0.375rem',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.25rem',
                                        fontSize: '0.75rem',
                                        fontWeight: '500'
                                    }}
                                >
                                    <List size={14} /> List
                                </button>
                                <button
                                    onClick={() => setViewMode('board')}
                                    style={{
                                        padding: '0.25rem 0.5rem',
                                        background: viewMode === 'board' ? 'var(--bg-primary)' : 'transparent',
                                        color: viewMode === 'board' ? 'var(--accent-color)' : 'var(--text-secondary)',
                                        border: 'none',
                                        borderRadius: '0.375rem',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.25rem',
                                        fontSize: '0.75rem',
                                        fontWeight: '500'
                                    }}
                                >
                                    <LayoutGrid size={14} /> Board
                                </button>
                            </div>

                        </div>
                    </div>

                    {/* Content Area */}
                    <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', background: 'var(--bg-primary)' }}>
                        {loading ? (
                            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>Loading tasks...</div>
                        ) : tasks.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                                <CheckCircle2 size={32} style={{ marginBottom: '0.5rem', opacity: 0.5 }} />
                                <p>No tasks found.</p>
                            </div>
                        ) : viewMode === 'board' ? (
                            <KanbanBoard
                                tasks={tasks}
                                statuses={statuses}
                                onUpdateTaskStatus={handleUpdateTaskStatus}
                                onEdit={handleEditTask}
                                onDelete={handleDeleteTask}
                                onAddStatus={handleCreateStatus}
                                onReorderStatus={handleReorderStatus}
                                onDeleteStatus={handleDeleteStatus}
                            />
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                {tasks.map(task => {
                                    const status = statuses.find(s => s.id === task.status_id)
                                    const timeLogged = timeLogs.find(l => l.task_id === task.id)?.total_seconds || 0
                                    const isSelected = editingTask?.id === task.id

                                    return (
                                        <div
                                            key={task.id}
                                            onClick={() => handleEditTask(task)}
                                            style={{
                                                padding: '1rem',
                                                border: isSelected ? '1px solid var(--accent-color)' : '1px solid var(--border-color)',
                                                borderRadius: '0.5rem',
                                                background: isSelected ? 'rgba(99, 102, 241, 0.1)' : 'var(--bg-secondary)',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s',
                                                boxShadow: 'var(--glass-shadow)'
                                            }}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                                                <h4 style={{
                                                    margin: 0,
                                                    fontSize: '0.95rem',
                                                    fontWeight: '700',
                                                    background: 'linear-gradient(to right, #ec4899, #8b5cf6)',
                                                    WebkitBackgroundClip: 'text',
                                                    WebkitTextFillColor: 'transparent',
                                                    backgroundClip: 'text',
                                                    width: 'fit-content'
                                                }}>{task.title}</h4>
                                                <span style={{
                                                    fontSize: '0.7rem',
                                                    padding: '0.125rem 0.5rem',
                                                    borderRadius: '9999px',
                                                    background: status?.color ? `${status.color}20` : 'var(--bg-tertiary)',
                                                    color: (status?.label?.toLowerCase().includes('done') || status?.label?.toLowerCase().includes('complete')) ? '#22c55e' : // Green
                                                        (status?.label?.toLowerCase().includes('progress') || status?.label?.toLowerCase().includes('review')) ? '#eab308' : // Yellow
                                                            '#ef4444', // Red for To Do/Backlog
                                                    fontWeight: '600',
                                                    border: `1px solid ${status?.color}40`
                                                }}>
                                                    {status?.label}
                                                </span>
                                            </div>
                                            <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.875rem', color: 'var(--text-secondary)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                                {stripHtml(task.description || '')}
                                            </p>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                                        <User size={12} />
                                                        {task.assignments && task.assignments.length > 0 ? task.assignments.length : '0'}
                                                    </div>
                                                    {task.due_date && (
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', color: new Date(task.due_date) < new Date() ? 'var(--danger-color)' : 'var(--text-secondary)' }}>
                                                            <Calendar size={12} /> {new Date(task.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                        </div>
                                                    )}
                                                </div>
                                                <div style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--accent-color)' }}>
                                                    {formatDuration(timeLogged)}
                                                </div>
                                            </div>
                                            {task.subtasks_content && calculateProgress(task.subtasks_content) > 0 && (
                                                <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <div style={{ flex: 1, height: '6px', background: 'var(--bg-tertiary)', borderRadius: '3px', overflow: 'hidden' }}>
                                                        <div style={{ width: `${calculateProgress(task.subtasks_content)}%`, height: '100%', background: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)', transition: 'width 0.3s' }} />
                                                    </div>
                                                    <span style={{ fontSize: '0.7rem', fontWeight: '600', color: 'var(--accent-color)', minWidth: '35px' }}>
                                                        {calculateProgress(task.subtasks_content)}%
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Panel: Form */}
                {(showCreateForm || editingTask) && (
                    <div style={{ width: '60%', display: 'flex', flexDirection: 'column', background: 'var(--bg-secondary)', animation: 'slideIn 0.2s ease-out' }}>
                        <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{
                                margin: 0,
                                fontSize: '1.125rem',
                                fontWeight: '600',
                                background: 'linear-gradient(to right, #ec4899, #8b5cf6)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                backgroundClip: 'text',
                                width: 'fit-content'
                            }}>
                                {editingTask ? 'Edit Task' : 'Create New Task'}
                            </h3>
                            <button
                                onClick={() => { setShowCreateForm(false); setEditingTask(null); }}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
                            <form id="task-form" onSubmit={handleCreateTask}>
                                <div style={{ marginBottom: '1.5rem' }}>
                                    <label style={{
                                        display: 'block',
                                        fontSize: '0.875rem',
                                        fontWeight: '700',
                                        marginBottom: '0.5rem',
                                        background: 'linear-gradient(to right, #ec4899, #8b5cf6)',
                                        WebkitBackgroundClip: 'text',
                                        WebkitTextFillColor: 'transparent',
                                        backgroundClip: 'text',
                                        width: 'fit-content'
                                    }}>Task Title</label>
                                    <input
                                        type="text"
                                        value={title}
                                        onChange={e => setTitle(e.target.value)}
                                        required
                                        placeholder="What needs to be done?"
                                        style={{
                                            width: '100%',
                                            padding: '0.75rem',
                                            borderRadius: '0.5rem',
                                            border: '1px solid var(--border-color)',
                                            fontSize: '1rem',
                                            background: 'var(--bg-tertiary)',
                                            color: 'var(--text-primary)'
                                        }}
                                    />
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                                    <div>
                                        <label style={{
                                            display: 'block',
                                            fontSize: '0.875rem',
                                            fontWeight: '700',
                                            marginBottom: '0.5rem',
                                            background: 'linear-gradient(to right, #ec4899, #8b5cf6)',
                                            WebkitBackgroundClip: 'text',
                                            WebkitTextFillColor: 'transparent',
                                            backgroundClip: 'text',
                                            width: 'fit-content'
                                        }}>Priority</label>
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            {['low', 'medium', 'high'].map(p => (
                                                <button
                                                    key={p}
                                                    type="button"
                                                    onClick={() => setPriority(p as any)}
                                                    style={{
                                                        flex: 1,
                                                        padding: '0.5rem',
                                                        borderRadius: '0.375rem',
                                                        border: `1px solid ${priority === p ? (p === 'high' ? '#fca5a5' : p === 'medium' ? '#fcd34d' : '#a5b4fc') : 'var(--border-color)'}`,
                                                        background: priority === p ? (p === 'high' ? 'rgba(254, 242, 242, 0.1)' : p === 'medium' ? 'rgba(255, 251, 235, 0.1)' : 'rgba(238, 242, 255, 0.1)') : 'var(--bg-tertiary)',
                                                        color: priority === p ? (p === 'high' ? '#f87171' : p === 'medium' ? '#fbbf24' : '#818cf8') : 'var(--text-secondary)',
                                                        fontWeight: '500',
                                                        textTransform: 'capitalize',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    {p}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <label style={{
                                            display: 'block',
                                            fontSize: '0.875rem',
                                            fontWeight: '700',
                                            marginBottom: '0.5rem',
                                            background: 'linear-gradient(to right, #ec4899, #8b5cf6)',
                                            WebkitBackgroundClip: 'text',
                                            WebkitTextFillColor: 'transparent',
                                            backgroundClip: 'text',
                                            width: 'fit-content'
                                        }}>Due Date</label>
                                        <input
                                            type="date"
                                            value={dueDate}
                                            onChange={e => setDueDate(e.target.value)}
                                            style={{
                                                width: '100%',
                                                padding: '0.6rem',
                                                borderRadius: '0.5rem',
                                                border: '1px solid var(--border-color)',
                                                background: 'var(--bg-tertiary)',
                                                color: 'var(--text-primary)'
                                            }}
                                        />
                                    </div>
                                </div>

                                <div style={{ marginBottom: '1.5rem' }}>
                                    <label style={{
                                        display: 'block',
                                        fontSize: '0.875rem',
                                        fontWeight: '700',
                                        marginBottom: '0.5rem',
                                        background: 'linear-gradient(to right, #ec4899, #8b5cf6)',
                                        WebkitBackgroundClip: 'text',
                                        WebkitTextFillColor: 'transparent',
                                        backgroundClip: 'text',
                                        width: 'fit-content'
                                    }}>Description</label>
                                    <RichTextEditor
                                        value={description}
                                        onChange={setDescription}
                                        placeholder="Add details..."
                                        style={{ height: '200px', marginBottom: '3rem', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
                                    />
                                </div>

                                <div>
                                    <label style={{
                                        display: 'block',
                                        fontSize: '0.875rem',
                                        fontWeight: '700',
                                        marginBottom: '0.5rem',
                                        background: 'linear-gradient(to right, #ec4899, #8b5cf6)',
                                        WebkitBackgroundClip: 'text',
                                        WebkitTextFillColor: 'transparent',
                                        backgroundClip: 'text',
                                        width: 'fit-content'
                                    }}>Assignees</label>
                                    <div style={{
                                        maxHeight: '200px',
                                        overflowY: 'auto',
                                        border: '1px solid var(--border-color)',
                                        borderRadius: '0.5rem',
                                        background: 'var(--bg-tertiary)',
                                        padding: '0.5rem'
                                    }}>
                                        {employees.length === 0 ? (
                                            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', textAlign: 'center', padding: '1rem' }}>No employees found</div>
                                        ) : (
                                            employees.map(emp => (
                                                <label
                                                    key={emp.id}
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '0.75rem',
                                                        padding: '0.5rem',
                                                        borderRadius: '0.375rem',
                                                        cursor: 'pointer',
                                                        background: assignedTo.includes(emp.id) ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                                                        transition: 'background 0.2s'
                                                    }}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={assignedTo.includes(emp.id)}
                                                        onChange={() => toggleAssignee(emp.id)}
                                                        style={{ width: '16px', height: '16px', accentColor: 'var(--accent-color)' }}
                                                    />
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                        <div style={{
                                                            width: '24px',
                                                            height: '24px',
                                                            borderRadius: '50%',
                                                            background: 'var(--bg-primary)',
                                                            color: 'var(--accent-color)',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            fontSize: '0.75rem',
                                                            fontWeight: '600'
                                                        }}>
                                                            {(emp.full_name || emp.email).charAt(0).toUpperCase()}
                                                        </div>
                                                        <span style={{ fontSize: '0.875rem', color: 'var(--text-primary)', fontWeight: assignedTo.includes(emp.id) ? '500' : '400' }}>
                                                            {emp.full_name || emp.email}
                                                        </span>
                                                    </div>
                                                </label>
                                            ))
                                        )}
                                    </div>
                                </div>

                                {/* Subtask Timer - Show time summary */}
                                {editingTask && (
                                    <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-color)' }}>
                                        <SubtaskTimer
                                            taskId={editingTask.id}
                                            subtasksContent={editingTask.subtasks_content || ''}
                                            onUpdateSubtasks={handleUpdateSubtasks}
                                            onEdit={() => { }}
                                        />
                                    </div>
                                )}
                            </form>
                        </div>

                        <div style={{ padding: '1rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', gap: '1rem', background: 'var(--bg-secondary)' }}>
                            {editingTask && (
                                <button
                                    type="button"
                                    onClick={() => handleDeleteTask(editingTask.id)}
                                    style={{ padding: '0.625rem 1.25rem', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger-color)', border: 'none', borderRadius: '0.5rem', fontWeight: '500', cursor: 'pointer' }}
                                >
                                    Delete Task
                                </button>
                            )}
                            <button
                                type="submit"
                                form="task-form"
                                style={{ padding: '0.625rem 1.5rem', background: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)', color: 'white', border: 'none', borderRadius: '0.5rem', fontWeight: '500', cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.1)' }}
                            >
                                {editingTask ? 'Save Changes' : 'Create Task'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
            <style>{`
                @keyframes slideIn {
                    from { transform: translateX(20px); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            `}</style>
        </Modal>
    )
}
