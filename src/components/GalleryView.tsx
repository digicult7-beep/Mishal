
import { Pencil, Trash2, Clock } from 'lucide-react'

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

interface GalleryViewProps {
    tasks: Task[]
    statuses: TaskStatus[]
    onEdit: (task: Task) => void
    onDelete: (taskId: string) => void
}

export default function GalleryView({
    tasks,
    statuses,
    onEdit,
    onDelete
}: GalleryViewProps) {

    const stripHtml = (html: string) => {
        const tmp = document.createElement('DIV')
        tmp.innerHTML = html
        return tmp.textContent || tmp.innerText || ''
    }

    const getStatusInfo = (statusId: string) => {
        const status = statuses.find(s => s.id === statusId)
        return status || { label: 'Unassigned', color: '#fee2e2' }
    }

    return (
        <div style={{ padding: '1rem', height: '100%', overflowY: 'auto' }}>
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                gap: '1.5rem',
            }}>
                {tasks.map(task => {
                    const status = getStatusInfo(task.status_id)
                    return (
                        <div key={task.id} style={{
                            background: 'white',
                            padding: '1.25rem',
                            borderRadius: '1rem',
                            border: '1px solid #e5e7eb',
                            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '1rem',
                            transition: 'transform 0.2s, box-shadow 0.2s',
                            cursor: 'pointer'
                        }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateY(-2px)'
                                e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)'
                                e.currentTarget.style.boxShadow = '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
                            }}
                            onClick={() => onEdit(task)}
                        >
                            {/* Header: Status & Priority */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <div style={{
                                        width: '8px',
                                        height: '8px',
                                        borderRadius: '50%',
                                        background: status.color || '#e5e7eb'
                                    }} />
                                    <span style={{ fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        {status.label}
                                    </span>
                                </div>
                                <span style={{
                                    padding: '0.125rem 0.5rem',
                                    borderRadius: '9999px',
                                    fontSize: '0.625rem',
                                    fontWeight: '600',
                                    background: task.priority === 'high' ? '#fee2e2' : task.priority === 'medium' ? '#fef3c7' : '#e0e7ff',
                                    color: task.priority === 'high' ? '#b91c1c' : task.priority === 'medium' ? '#b45309' : '#4338ca',
                                    textTransform: 'uppercase'
                                }}>
                                    {task.priority}
                                </span>
                            </div>

                            {/* Title & Description */}
                            <div>
                                <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827', marginBottom: '0.5rem', lineHeight: '1.4' }}>
                                    {task.title}
                                </h3>
                                {task.description && (
                                    <p style={{ fontSize: '0.875rem', color: '#6b7280', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', margin: 0 }}>
                                        {stripHtml(task.description)}
                                    </p>
                                )}
                            </div>

                            {/* Footer: Due Date, Assignees, Actions */}
                            <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    {task.due_date && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.75rem', color: new Date(task.due_date) < new Date() ? '#ef4444' : '#6b7280' }}>
                                            <Clock size={14} />
                                            {new Date(task.due_date).toLocaleDateString()}
                                        </div>
                                    )}
                                    <div style={{ display: 'flex', alignItems: 'center', marginLeft: '0.5rem' }}>
                                        {task.assignments && task.assignments.length > 0 ? (
                                            task.assignments.map((assignment, i) => (
                                                <div key={assignment.user_id} style={{
                                                    width: '24px',
                                                    height: '24px',
                                                    borderRadius: '50%',
                                                    background: '#e5e7eb',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontSize: '0.75rem',
                                                    fontWeight: '600',
                                                    color: '#4b5563',
                                                    border: '2px solid white',
                                                    marginLeft: i > 0 ? '-10px' : '0'
                                                }} title={assignment.user.full_name || assignment.user.email}>
                                                    {(assignment.user.full_name || assignment.user.email).charAt(0).toUpperCase()}
                                                </div>
                                            ))
                                        ) : (
                                            <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Unassigned</span>
                                        )}
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: '0.25rem' }}>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onEdit(task) }}
                                        style={{ background: '#f3f4f6', border: 'none', borderRadius: '0.375rem', cursor: 'pointer', padding: '0.375rem', color: '#6b7280', transition: 'background 0.2s' }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = '#e5e7eb'}
                                        onMouseLeave={(e) => e.currentTarget.style.background = '#f3f4f6'}
                                    >
                                        <Pencil size={14} />
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onDelete(task.id) }}
                                        style={{ background: '#fee2e2', border: 'none', borderRadius: '0.375rem', cursor: 'pointer', padding: '0.375rem', color: '#ef4444', transition: 'background 0.2s' }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = '#fecaca'}
                                        onMouseLeave={(e) => e.currentTarget.style.background = '#fee2e2'}
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
