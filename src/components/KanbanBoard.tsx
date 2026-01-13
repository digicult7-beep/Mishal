import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import type { DropResult } from '@hello-pangea/dnd'
import { Pencil, Trash2, Plus, GripVertical, X } from 'lucide-react'
import { useState, useEffect } from 'react'

interface Task {
    id: string
    title: string
    description?: string
    status_id: string
    priority: 'low' | 'medium' | 'high'
    due_date?: string
    assigned_to?: string
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

interface KanbanBoardProps {
    tasks: Task[]
    statuses: TaskStatus[]
    onUpdateTaskStatus: (taskId: string, newStatusId: string) => void
    onEdit: (task: Task) => void
    onDelete: (taskId: string) => void
    onAddStatus: (label: string) => void
    onReorderStatus: (startIndex: number, endIndex: number) => void
    onDeleteStatus: (statusId: string) => void
    groupByLabel?: boolean
}

export default function KanbanBoard({
    tasks,
    statuses,
    onUpdateTaskStatus,
    onEdit,
    onDelete,
    onAddStatus,
    onReorderStatus,
    onDeleteStatus,
    groupByLabel = false
}: KanbanBoardProps) {
    const [isAddingStatus, setIsAddingStatus] = useState(false)
    const [newStatusLabel, setNewStatusLabel] = useState('')

    const getTasksByStatus = (statusIdOrLabel: string) => {
        if (statusIdOrLabel === 'unassigned') {
            return tasks.filter(task => !statuses.find(s => s.id === task.status_id))
        }
        if (groupByLabel) {
            return tasks.filter(task => {
                const status = statuses.find(s => s.id === task.status_id)
                return status?.label === statusIdOrLabel
            })
        }
        return tasks.filter(task => task.status_id === statusIdOrLabel)
    }

    const processedStatuses = groupByLabel
        ? statuses.filter((status, index, self) =>
            index === self.findIndex((s) => s.label === status.label)
        )
        : statuses

    const displayStatuses = [
        ...(tasks.some(task => !statuses.find(s => s.id === task.status_id)) ? [{
            id: 'unassigned',
            label: 'Unassigned / Invalid Status',
            color: '#fee2e2',
            position: -1
        }] : []),
        ...processedStatuses
    ]

    const stripHtml = (html: string) => {
        const tmp = document.createElement('DIV')
        tmp.innerHTML = html
        return tmp.textContent || tmp.innerText || ''
    }

    const onDragEnd = (result: DropResult) => {
        const { destination, source, draggableId, type } = result

        if (!destination) return

        if (
            destination.droppableId === source.droppableId &&
            destination.index === source.index
        ) {
            return
        }

        if (type === 'COLUMN') {
            onReorderStatus(source.index, destination.index)
            return
        }

        // Task drag
        onUpdateTaskStatus(draggableId, destination.droppableId)
    }

    const handleAddStatusSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (newStatusLabel.trim()) {
            onAddStatus(newStatusLabel.trim())
            setNewStatusLabel('')
            setIsAddingStatus(false)
        }
    }

    const [isMounted, setIsMounted] = useState(false)

    useEffect(() => {
        setIsMounted(true)
    }, [])

    if (!isMounted) {
        return (
            <div style={{ display: 'flex', gap: '2rem', overflowX: 'auto', paddingBottom: '1.5rem', height: '100%', paddingLeft: '0.5rem', paddingRight: '0.5rem' }}>
                {displayStatuses.map((status) => (
                    <div
                        key={groupByLabel && status.id !== 'unassigned' ? status.label : status.id}
                        style={{
                            flex: '1 0 300px',
                            display: 'flex',
                            flexDirection: 'column',
                            background: 'var(--bg-secondary)',
                            borderRadius: '1rem',
                            padding: '1.25rem',
                            height: '100%',
                            maxHeight: '100%',
                            border: '1px solid var(--border-color)'
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem', padding: '0 0.5rem' }}>
                            <GripVertical size={16} color="#9ca3af" />
                            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: status.color || '#e5e7eb' }} />
                            <h3 style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--text-primary)', margin: 0 }}>{status.label}</h3>
                        </div>
                        <div style={{ flex: 1 }}></div>
                    </div>
                ))}
            </div>
        )
    }

    return (
        <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="board" direction="horizontal" type="COLUMN">
                {(provided) => (
                    <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        style={{ display: 'flex', gap: '2rem', overflowX: 'auto', paddingBottom: '1.5rem', height: '100%', paddingLeft: '0.5rem', paddingRight: '0.5rem' }}
                    >
                        {/* Debug section removed */}
                        {displayStatuses.map((status, index) => {
                            const draggableId = groupByLabel && status.id !== 'unassigned' ? status.label : status.id
                            return (
                                <Draggable key={draggableId} draggableId={draggableId} index={index}>
                                    {(provided) => (
                                        <div
                                            ref={provided.innerRef}
                                            {...provided.draggableProps}
                                            style={{
                                                ...provided.draggableProps.style,
                                                flex: '1 0 300px',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                background: 'var(--bg-secondary)',
                                                borderRadius: '1rem',
                                                padding: '1.25rem',
                                                height: '100%',
                                                maxHeight: '100%',
                                                border: '1px solid var(--border-color)'
                                            }}
                                        >
                                            <div
                                                {...provided.dragHandleProps}
                                                style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem', padding: '0 0.5rem', cursor: 'grab' }}
                                            >
                                                <GripVertical size={16} color="#9ca3af" />
                                                <div style={{
                                                    width: '12px',
                                                    height: '12px',
                                                    borderRadius: '50%',
                                                    background: status.color || '#e5e7eb'
                                                }} />
                                                <h3 style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--text-primary)', margin: 0 }}>{status.label}</h3>
                                                <span style={{ marginLeft: 'auto', background: 'var(--bg-primary)', padding: '0.25rem 0.625rem', borderRadius: '1rem', fontSize: '0.75rem', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }}>
                                                    {getTasksByStatus(groupByLabel && status.id !== 'unassigned' ? status.label : status.id).length}
                                                </span>
                                                <button
                                                    onClick={() => {
                                                        if (confirm(`Delete status "${status.label}"? Tasks in this status will need to be reassigned.`)) {
                                                            onDeleteStatus(status.id)
                                                        }
                                                    }}
                                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: '4px' }}
                                                >
                                                    <X size={16} />
                                                </button>
                                            </div>

                                            <Droppable droppableId={groupByLabel && status.id !== 'unassigned' ? status.label : status.id} type="TASK">
                                                {(provided, snapshot) => (
                                                    <div
                                                        {...provided.droppableProps}
                                                        ref={provided.innerRef}
                                                        style={{
                                                            flex: 1,
                                                            display: 'flex',
                                                            flexDirection: 'column',
                                                            background: snapshot.isDraggingOver ? 'var(--bg-tertiary)' : 'transparent',
                                                            transition: 'background 0.2s',
                                                            borderRadius: '0.5rem',
                                                            padding: '0.25rem',
                                                            overflowY: 'auto',
                                                            minHeight: '100px'
                                                        }}
                                                    >
                                                        {getTasksByStatus(groupByLabel && status.id !== 'unassigned' ? status.label : status.id).map((task, index) => (
                                                            <Draggable key={task.id} draggableId={task.id} index={index}>
                                                                {(provided, snapshot) => (
                                                                    <div
                                                                        ref={provided.innerRef}
                                                                        {...provided.draggableProps}
                                                                        {...provided.dragHandleProps}
                                                                        onClick={() => onEdit(task)}
                                                                        style={{
                                                                            background: 'var(--bg-primary)',
                                                                            padding: '1rem',
                                                                            marginBottom: '1rem',
                                                                            borderRadius: '0.5rem',
                                                                            border: '1px solid var(--border-color)',
                                                                            boxShadow: snapshot.isDragging ? '0 4px 6px -1px rgba(0, 0, 0, 0.1)' : '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                                                                            cursor: 'pointer',
                                                                            ...provided.draggableProps.style
                                                                        }}
                                                                    >
                                                                        <div style={{ fontSize: '0.95rem', fontWeight: '500', color: 'var(--text-primary)', marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                                            <span className="text-gradient">{task.title}</span>
                                                                            <div style={{ display: 'flex', gap: '0.25rem' }}>
                                                                                <button
                                                                                    onClick={(e) => { e.stopPropagation(); onEdit(task) }}
                                                                                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.125rem', color: '#6b7280' }}
                                                                                >
                                                                                    <Pencil size={12} />
                                                                                </button>
                                                                                <button
                                                                                    onClick={(e) => { e.stopPropagation(); onDelete(task.id) }}
                                                                                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.125rem', color: '#ef4444' }}
                                                                                >
                                                                                    <Trash2 size={12} />
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                        {task.description && (
                                                                            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.75rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                                                                {stripHtml(task.description)}
                                                                            </div>
                                                                        )}
                                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem' }}>
                                                                            <div style={{ display: 'flex', alignItems: 'center', marginLeft: '0.5rem' }}>
                                                                                {task.assignments && task.assignments.length > 0 ? (
                                                                                    task.assignments.map((assignment, i) => (
                                                                                        <div key={assignment.user_id} style={{
                                                                                            width: '20px',
                                                                                            height: '20px',
                                                                                            borderRadius: '50%',
                                                                                            background: 'var(--bg-tertiary)',
                                                                                            display: 'flex',
                                                                                            alignItems: 'center',
                                                                                            justifyContent: 'center',
                                                                                            fontSize: '0.625rem',
                                                                                            fontWeight: '600',
                                                                                            color: 'var(--text-secondary)',
                                                                                            border: '1px solid var(--bg-primary)',
                                                                                            marginLeft: i > 0 ? '-8px' : '0'
                                                                                        }} title={assignment.user.full_name || assignment.user.email}>
                                                                                            {(assignment.user.full_name || assignment.user.email).charAt(0).toUpperCase()}
                                                                                        </div>
                                                                                    ))
                                                                                ) : (
                                                                                    <span style={{ color: '#9ca3af' }}>Unassigned</span>
                                                                                )}
                                                                            </div>
                                                                            {task.due_date && (
                                                                                <div style={{ color: new Date(task.due_date) < new Date() ? '#ef4444' : '#6b7280' }}>
                                                                                    {new Date(task.due_date).toLocaleDateString()}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </Draggable>
                                                        ))}
                                                        {provided.placeholder}
                                                    </div>
                                                )}
                                            </Droppable>
                                        </div>
                                    )}
                                </Draggable>
                            )
                        })}
                        {provided.placeholder}

                        {/* Add Status Button */}
                        <div style={{ flex: '0 0 300px' }}>
                            {isAddingStatus ? (
                                <form onSubmit={handleAddStatusSubmit} style={{ background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)' }}>
                                    <input
                                        autoFocus
                                        type="text"
                                        value={newStatusLabel}
                                        onChange={(e) => setNewStatusLabel(e.target.value)}
                                        placeholder="Status Name"
                                        style={{ width: '100%', padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid var(--border-color)', marginBottom: '0.5rem', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                                    />
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <button type="submit" style={{ flex: 1, padding: '0.375rem', background: 'var(--accent-color)', color: 'white', border: 'none', borderRadius: '0.375rem', cursor: 'pointer' }}>Add</button>
                                        <button type="button" onClick={() => setIsAddingStatus(false)} style={{ flex: 1, padding: '0.375rem', background: 'var(--bg-primary)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)', borderRadius: '0.375rem', cursor: 'pointer' }}>Cancel</button>
                                    </div>
                                </form>
                            ) : (
                                <button
                                    onClick={() => setIsAddingStatus(true)}
                                    style={{
                                        width: '100%',
                                        padding: '1rem',
                                        background: 'transparent',
                                        border: '2px dashed var(--border-color)',
                                        borderRadius: '0.75rem',
                                        color: 'var(--text-secondary)',
                                        fontWeight: '500',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '0.5rem',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    <Plus size={20} /> Add Status
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </Droppable>
        </DragDropContext>
    )
}
