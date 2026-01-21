import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { User, Flag, Clock, Layout, CheckSquare, Briefcase } from 'lucide-react'
import Modal from './Modal'

import TaskComments from './TaskComments'
import SubtaskTimer from './SubtaskTimer'
import SubtaskListEditor from './SubtaskListEditor'

interface TaskDetailsModalProps {
    isOpen: boolean
    onClose: () => void
    task: any
    onUpdate: () => void
    isCoordinator?: boolean
}

interface Subtask {
    id: string
    title: string
    is_completed: boolean
}

// TaskDetailsModal component
export default function TaskDetailsModal({ isOpen, onClose, task, onUpdate }: TaskDetailsModalProps) {
    // Data State
    const [subtasks, setSubtasks] = useState<Subtask[]>([])
    const [title, setTitle] = useState('')
    const [statuses, setStatuses] = useState<any[]>([])
    const [progress, setProgress] = useState(0)
    const [isEditingSubtasks, setIsEditingSubtasks] = useState(false)

    // Load statuses
    useEffect(() => {
        const loadStatuses = async () => {
            if (!task?.department_id) return
            const { data } = await supabase
                .from('task_statuses')
                .select('*')
                .eq('department_id', task.department_id)
                .order('position')
            setStatuses(data || [])
        }
        loadStatuses()
    }, [task?.department_id])

    // Load Subtasks & Init Title
    useEffect(() => {
        if (isOpen && task) {
            setTitle(task.title || '')
            loadSubtasks()
        }
    }, [isOpen, task])

    const loadSubtasks = async () => {
        if (!task?.id) return
        const { data } = await supabase
            .from('subtasks')
            .select('*')
            .eq('task_id', task.id)
            .order('created_at', { ascending: true }) // Tasks usually ordered by creation unless positioned

        if (data) {
            setSubtasks(data)
            calculateProgress(data)
        } else {
            setSubtasks([])
            setProgress(0)
        }
    }

    const calculateProgress = (items: Subtask[]) => {
        if (!items || items.length === 0) {
            setProgress(0)
            return
        }
        const completed = items.filter(t => t.is_completed).length
        setProgress(Math.round((completed / items.length) * 100))
    }

    // -- Atomic Subtask Handlers --

    const checkAutoStatusUpdate = async (items: Subtask[]) => {
        const total = items.length
        const completed = items.filter(t => t.is_completed).length
        let newStatusId = undefined

        if (total > 0) {
            let targetStatusId = undefined

            if (completed === 0) {
                // 0 checked -> To Do
                const s = statuses.find(s => /to\s?do|backlog|pending|open|not started/i.test(s.label))
                if (s) targetStatusId = s.id
            } else if (completed === total) {
                // All checked -> Done
                const s = statuses.find(s => /done|complete|resolved|closed|finish/i.test(s.label))
                if (s) targetStatusId = s.id
            } else {
                // Some checked -> In Progress
                const s = statuses.find(s => /progress|review|doing|working/i.test(s.label))
                if (s) targetStatusId = s.id
            }

            if (targetStatusId && task.status_id !== targetStatusId) {
                newStatusId = targetStatusId
            }
        }

        if (newStatusId) {
            handleUpdateStatus(newStatusId)
        }
    }

    const handleAddSubtask = async (text: string) => {
        // Optimistic
        const tempId = crypto.randomUUID()
        const newSubtask: Subtask = { id: tempId, title: text, is_completed: false }
        const updatedList = [...subtasks, newSubtask]
        setSubtasks(updatedList)
        calculateProgress(updatedList)

        try {
            const { data, error } = await supabase
                .from('subtasks')
                .insert({ task_id: task.id, title: text, is_completed: false })
                .select()
                .single()

            if (error) throw error
            if (data) {
                // Replace temp ID with real ID
                setSubtasks(prev => prev.map(t => t.id === tempId ? data : t))
            }
        } catch (error) {
            console.error('Error adding subtask:', error)
            // Rollback
            setSubtasks(prev => prev.filter(t => t.id !== tempId))
        }
        checkAutoStatusUpdate(updatedList)
    }

    const handleToggleSubtask = async (id: string, isCompleted: boolean) => {
        // Optimistic
        const updatedList = subtasks.map(t => t.id === id ? { ...t, is_completed: isCompleted } : t)
        setSubtasks(updatedList)
        calculateProgress(updatedList)
        checkAutoStatusUpdate(updatedList)

        try {
            const { error } = await supabase
                .from('subtasks')
                .update({ is_completed: isCompleted })
                .eq('id', id)

            if (error) throw error
        } catch (error) {
            console.error('Error toggling subtask:', error)
            // Rollback
            setSubtasks(prev => prev.map(t => t.id === id ? { ...t, is_completed: !isCompleted } : t))
        }
    }

    const handleDeleteSubtask = async (id: string) => {
        // Optimistic
        const deletedTask = subtasks.find(t => t.id === id)
        const updatedList = subtasks.filter(t => t.id !== id)
        setSubtasks(updatedList)
        calculateProgress(updatedList)
        checkAutoStatusUpdate(updatedList)

        try {
            const { error } = await supabase
                .from('subtasks')
                .delete()
                .eq('id', id)

            if (error) throw error
        } catch (error) {
            console.error('Error deleting subtask:', error)
            // Rollback
            if (deletedTask) {
                setSubtasks(prev => [...prev, deletedTask])
            }
        }
    }

    const handleUpdateSubtaskText = async (id: string, text: string) => {
        // Optimistic
        const updatedList = subtasks.map(t => t.id === id ? { ...t, title: text } : t)
        setSubtasks(updatedList)

        // Debounce could be good here, but for now direct contentEditable logic
        try {
            const { error } = await supabase
                .from('subtasks')
                .update({ title: text })
                .eq('id', id)

            if (error) throw error
        } catch (error) {
            console.error('Error updating subtask text:', error)
        }
    }

    // ----------------------------

    const handleUpdateTitle = async () => {
        if (title !== task.title) {
            try {
                await supabase.from('tasks').update({ title }).eq('id', task.id)
                onUpdate()
            } catch (error) {
                console.error('Error updating title:', error)
            }
        }
    }

    const handleUpdateStatus = async (statusId: string) => {
        try {
            await supabase.from('tasks').update({ status_id: statusId }).eq('id', task.id)
            onUpdate()
        } catch (error) {
            console.error('Error updating status:', error)
        }
    }

    if (!task) return null

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="" variant="fullscreen" bodyStyle={{ padding: 0 }}>
            <div style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem 4rem', fontFamily: 'Inter, sans-serif', height: '100%', display: 'flex', flexDirection: 'column' }}>

                {/* Main Content Area - Scrollable */}
                <div style={{ flex: 1, overflowY: 'auto', paddingRight: '1rem' }}>

                    {/* Title Input */}
                    <div style={{ marginBottom: '2rem' }}>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            onBlur={handleUpdateTitle}
                            style={{
                                fontSize: '2.5rem',
                                fontWeight: '700',
                                background: 'linear-gradient(to right, #ec4899, #8b5cf6)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                backgroundClip: 'text',
                                width: 'fit-content',
                                border: 'none',
                                outline: 'none',
                                marginBottom: '0.5rem',
                                caretColor: '#ec4899'
                            }}
                            placeholder="Task Title"
                        />
                    </div>

                    {/* Task Properties */}
                    <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '0.75rem 1rem', alignItems: 'center', fontSize: '0.9rem', marginBottom: '2rem' }}>
                        {/* Status */}
                        <div style={labelStyle}>
                            <Layout size={16} /> Status
                        </div>
                        <div>
                            <select
                                value={task.status_id || ''}
                                onChange={(e) => handleUpdateStatus(e.target.value)}
                                style={{
                                    background: 'var(--bg-tertiary)',
                                    color: (() => {
                                        const currentStatus = statuses.find(s => s.id === task.status_id)
                                        const label = currentStatus?.label?.toLowerCase() || ''
                                        if (label.includes('done') || label.includes('complete') || label.includes('finish')) return '#22c55e' // Green
                                        if (label.includes('progress') || label.includes('review')) return '#3b82f6' // Blue
                                        return 'var(--text-primary)' // Default/White
                                    })(),
                                    padding: '0.125rem 0.5rem',
                                    borderRadius: '0.25rem',
                                    fontSize: '0.85rem',
                                    border: '1px solid var(--border-color)',
                                    cursor: 'pointer',
                                    outline: 'none',
                                    fontWeight: '600'
                                }}
                            >
                                <option value="" disabled>Select Status</option>
                                {statuses.map(status => (
                                    <option key={status.id} value={status.id}>
                                        {status.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                        {/* Priority */}
                        <div style={labelStyle}>
                            <Flag size={16} /> Priority
                        </div>
                        <div>
                            <span style={{
                                background: task.priority === 'high' ? 'rgba(239, 68, 68, 0.2)' : task.priority === 'medium' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(99, 102, 241, 0.2)',
                                color: task.priority === 'high' ? '#ef4444' : task.priority === 'medium' ? '#f59e0b' : '#6366f1',
                                padding: '0.125rem 0.5rem',
                                borderRadius: '0.25rem',
                                fontSize: '0.85rem',
                                textTransform: 'capitalize',
                                border: `1px solid ${task.priority === 'high' ? 'rgba(239, 68, 68, 0.3)' : task.priority === 'medium' ? 'rgba(245, 158, 11, 0.3)' : 'rgba(99, 102, 241, 0.3)'}`
                            }}>
                                {task.priority || 'Medium'}
                            </span>
                        </div>
                        {/* Assignees */}
                        <div style={labelStyle}>
                            <User size={16} /> Assignees
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                            {task.assignments?.length > 0 ? (
                                task.assignments.map((assignment: any) => (
                                    <div key={assignment.user_id} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', background: 'var(--bg-tertiary)', padding: '2px 8px 2px 2px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                                        <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'linear-gradient(135deg, #6366f1, #ec4899)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 'bold', color: 'white' }}>
                                            {(assignment.user?.full_name || assignment.user?.email || '?').charAt(0).toUpperCase()}
                                        </div>
                                        <span style={{ color: 'var(--text-primary)', fontSize: '0.8rem', fontWeight: '500' }}>{assignment.user?.full_name || 'Unknown'}</span>
                                    </div>
                                ))
                            ) : (
                                <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Unassigned</span>
                            )}
                        </div>
                        {/* Content Type */}
                        <div style={labelStyle}>
                            <Briefcase size={16} /> Content Type
                        </div>
                        <div style={{ color: 'var(--text-primary)', fontWeight: '500', textTransform: 'capitalize' }}>
                            {task.content_type || 'N/A'}
                        </div>
                        {/* Start Date */}
                        <div style={labelStyle}>
                            <Clock size={16} /> Start Date
                        </div>
                        <div style={{ color: '#22c55e', fontWeight: '500' }}>
                            {task.start_date ? new Date(task.start_date).toLocaleDateString() : 'No start date'}
                        </div>
                        {/* Due Date */}
                        <div style={labelStyle}>
                            <Clock size={16} /> Due Date
                        </div>
                        <div style={{
                            color: '#ef4444',
                            fontWeight: '500'
                        }}>
                            {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'No due date'}
                        </div>
                    </div>
                    <hr style={{ border: 'none', borderBottom: '1px solid #e5e7eb', margin: '2rem 0' }} />

                    {/* Comments Section */}
                    <TaskComments taskId={task.id} />

                    <hr style={{ border: 'none', borderBottom: '1px solid #e5e7eb', margin: '2rem 0' }} />

                    {/* Subtasks Section */}
                    <div style={{ marginBottom: '3rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                            {isEditingSubtasks && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-primary)' }}>
                                    <CheckSquare size={20} style={{ color: '#ec4899' }} />
                                    <h3 style={{
                                        fontSize: '1rem',
                                        fontWeight: '700',
                                        margin: 0,
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.05em',
                                        background: 'linear-gradient(to right, #ec4899, #8b5cf6)',
                                        WebkitBackgroundClip: 'text',
                                        WebkitTextFillColor: 'transparent',
                                        backgroundClip: 'text',
                                        width: 'fit-content'
                                    }}>Edit Subtasks</h3>
                                </div>
                            )}

                            {!isEditingSubtasks && <div />}

                            {progress > 0 && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <div style={{ width: '100px', height: '8px', background: 'var(--bg-tertiary)', borderRadius: '4px', overflow: 'hidden' }}>
                                        <div style={{ width: `${progress}%`, height: '100%', background: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)', transition: 'width 0.3s' }} />
                                    </div>
                                    <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#ec4899' }}>{progress}%</span>
                                </div>
                            )}
                        </div>

                        {isEditingSubtasks ? (
                            <div className="subtasks-editor-wrapper">
                                <SubtaskListEditor
                                    subtasks={subtasks}
                                    onAdd={handleAddSubtask}
                                    onToggle={handleToggleSubtask}
                                    onDelete={handleDeleteSubtask}
                                    onUpdateText={handleUpdateSubtaskText}
                                />
                                <button
                                    onClick={() => setIsEditingSubtasks(false)}
                                    style={{
                                        marginTop: '1rem',
                                        background: 'var(--success-color)',
                                        color: 'white',
                                        border: 'none',
                                        padding: '0.5rem 1rem',
                                        borderRadius: '0.375rem',
                                        cursor: 'pointer',
                                        fontWeight: '600',
                                        fontSize: '0.875rem'
                                    }}
                                >
                                    Done Editing
                                </button>
                            </div>
                        ) : (
                            <SubtaskTimer
                                taskId={task.id}
                                subtasks={subtasks}
                                onToggleSubtask={handleToggleSubtask}
                                onEdit={() => setIsEditingSubtasks(true)}
                            />
                        )}
                    </div>

                </div>
            </div>
        </Modal>
    )
}


const labelStyle: React.CSSProperties = {
    color: 'var(--text-primary)', // Keeping it clear/white/primary as requested for "suitable colors"
    fontWeight: '700',
    fontSize: '0.85rem',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
}
