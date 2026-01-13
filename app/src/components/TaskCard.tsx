import React from 'react'
import { Draggable } from '@hello-pangea/dnd'
import { User, Calendar } from 'lucide-react'

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

interface TaskCardProps {
    task: Task
    index: number
}

const TaskCard = React.memo(({ task, index }: TaskCardProps) => {
    return (
        <Draggable draggableId={task.id} index={index}>
            {(provided, snapshot) => (
                <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    style={{
                        ...provided.draggableProps.style,
                        background: 'var(--bg-primary)',
                        padding: '0.75rem',
                        borderRadius: '8px',
                        boxShadow: snapshot.isDragging ? '0 5px 10px rgba(0,0,0,0.1)' : '0 1px 2px rgba(0,0,0,0.05)',
                        border: '1px solid var(--border-color)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.5rem',
                        marginBottom: '0.75rem'
                    }}
                >
                    <div style={{
                        fontWeight: '700',
                        fontSize: '0.875rem',
                        lineHeight: '1.3',
                        background: 'linear-gradient(to right, #ec4899, #8b5cf6)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                        width: 'fit-content'
                    }}>{task.title}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        {task.department?.workspace?.client?.name} • {task.department?.name}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.25rem' }}>
                        <div title={task.assignee?.full_name} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            <div style={{
                                width: '20px', height: '20px', borderRadius: '50%',
                                background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '0.65rem', fontWeight: '600', color: 'var(--text-secondary)'
                            }}>
                                {task.assignee?.full_name?.[0] || <User size={10} />}
                            </div>
                            {task.assignee?.full_name || 'Unassigned'}
                        </div>
                        <div style={{ display: 'flex', gap: '4px' }}>
                            {task.due_date && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '2px', fontSize: '0.65rem', color: new Date(task.due_date) < new Date() ? 'var(--danger-color)' : 'var(--text-secondary)' }}>
                                    <Calendar size={10} />
                                    {new Date(task.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                </div>
                            )}
                            {task.priority && (
                                <span style={{
                                    fontSize: '0.65rem',
                                    padding: '0.1rem 0.3rem',
                                    borderRadius: '3px',
                                    background: 'transparent',
                                    border: '1px solid rgba(255,255,255,0.2)',
                                    ...(() => {
                                        switch (task.priority) {
                                            case 'high': return { color: '#f87171', borderColor: 'rgba(248, 113, 113, 0.4)' }
                                            case 'medium': return { color: '#facc15', borderColor: 'rgba(250, 204, 21, 0.4)' }
                                            case 'low': return { color: '#4ade80', borderColor: 'rgba(74, 222, 128, 0.4)' }
                                            default: return { color: '#9ca3af', borderColor: 'rgba(156, 163, 175, 0.4)' }
                                        }
                                    })()
                                }}>
                                    {task.priority}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </Draggable>
    )
}, (prev, next) => {
    return (
        prev.task.id === next.task.id &&
        prev.task.title === next.task.title &&
        prev.task.status_id === next.task.status_id &&
        prev.index === next.index
    )
})

export default TaskCard
