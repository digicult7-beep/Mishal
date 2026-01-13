import React from 'react'
import { Droppable } from '@hello-pangea/dnd'
import TaskCard from './TaskCard'

interface KanbanColumnProps {
    status: {
        id: string
        label: string
        color: string
    }
    tasks: any[]
}

const KanbanColumn = ({ status, tasks }: KanbanColumnProps) => {
    return (
        <div style={{
            width: '320px',
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            background: 'var(--bg-secondary)',
            borderRadius: '12px',
            border: '1px solid var(--border-color)',
            height: '100%',
            maxHeight: '100%'
        }}>
            {/* Header */}
            <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                <h3 style={{ fontSize: '0.875rem', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>{status.label}</h3>
                <span style={{ fontSize: '0.75rem', background: 'var(--bg-tertiary)', padding: '0.1rem 0.4rem', borderRadius: '10px' }}>{tasks.length}</span>
            </div>

            {/* List Body */}
            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
                <Droppable droppableId={status.id}>
                    {(provided, snapshot) => (
                        <div
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            style={{
                                padding: '0.75rem',
                                minHeight: '100px',
                                background: snapshot.isDraggingOver ? 'var(--bg-tertiary)' : 'transparent',
                                transition: 'background 0.2s'
                            }}
                        >
                            {tasks.map((task, index) => (
                                <TaskCard key={task.id} task={task} index={index} />
                            ))}
                            {provided.placeholder}
                        </div>
                    )}
                </Droppable>
            </div>
        </div>
    )
}

export default React.memo(KanbanColumn)
