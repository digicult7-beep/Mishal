import React, { useState } from 'react'
import { Plus, Check, Trash2 } from 'lucide-react'

export interface Subtask {
    id: string
    title: string // Changed from text to title to match DB
    is_completed: boolean // Changed from completed to match DB
}

interface SubtaskListEditorProps {
    subtasks: Subtask[]
    onAdd: (text: string) => void
    onToggle: (id: string, isCompleted: boolean) => void
    onDelete: (id: string) => void
    onUpdateText: (id: string, text: string) => void
    readOnly?: boolean
}

export default function SubtaskListEditor({
    subtasks,
    onAdd,
    onToggle,
    onDelete,
    onUpdateText,
    readOnly = false
}: SubtaskListEditorProps) {
    const [newItemText, setNewItemText] = useState('')

    const handleAddItem = (e?: React.FormEvent) => {
        e?.preventDefault()
        if (!newItemText.trim()) return

        onAdd(newItemText.trim())
        setNewItemText('')
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault()
            handleAddItem()
        }
    }

    return (
        <div className="subtask-list-editor" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {/* List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {subtasks.map((task) => (
                    <div
                        key={task.id}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.5rem',
                            background: 'var(--bg-tertiary)',
                            borderRadius: '0.375rem',
                            border: '1px solid var(--border-color)',
                            transition: 'all 0.2s'
                        }}
                    >
                        <button
                            type="button"
                            onClick={() => onToggle(task.id, !task.is_completed)}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                cursor: readOnly ? 'default' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                color: task.is_completed ? '#22c55e' : 'var(--text-secondary)'
                            }}
                        >
                            {task.is_completed ? <Check size={18} /> : <div style={{ width: 18, height: 18, borderRadius: '4px', border: '2px solid currentColor' }} />}
                        </button>

                        <input
                            type="text"
                            value={task.title}
                            onChange={(e) => onUpdateText(task.id, e.target.value)}
                            readOnly={readOnly}
                            style={{
                                flex: 1,
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--text-primary)',
                                fontSize: '0.9rem',
                                textDecoration: task.is_completed ? 'line-through' : 'none',
                                opacity: task.is_completed ? 0.7 : 1,
                                outline: 'none'
                            }}
                        />

                        {!readOnly && (
                            <button
                                type="button"
                                onClick={() => onDelete(task.id)}
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: 'var(--text-secondary)',
                                    cursor: 'pointer',
                                    opacity: 0.5,
                                    padding: '4px'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                                onMouseLeave={(e) => e.currentTarget.style.opacity = '0.5'}
                            >
                                <Trash2 size={16} />
                            </button>
                        )}
                    </div>
                ))}
            </div>

            {/* Add New */}
            {!readOnly && (
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <Plus size={18} style={{ color: 'var(--text-secondary)' }} />
                    <input
                        type="text"
                        value={newItemText}
                        onChange={(e) => setNewItemText(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Add a subtask..."
                        style={{
                            flex: 1,
                            background: 'transparent',
                            border: 'none',
                            borderBottom: '1px solid var(--border-color)',
                            padding: '0.5rem 0',
                            color: 'var(--text-primary)',
                            fontSize: '0.9rem',
                            outline: 'none'
                        }}
                    />
                    <button
                        type="button"
                        onClick={handleAddItem}
                        disabled={!newItemText.trim()}
                        style={{
                            background: newItemText.trim() ? 'var(--accent-color)' : 'var(--bg-tertiary)',
                            color: newItemText.trim() ? 'white' : 'var(--text-secondary)',
                            border: 'none',
                            borderRadius: '4px',
                            padding: '0.25rem 0.75rem',
                            fontSize: '0.8rem',
                            fontWeight: '600',
                            cursor: newItemText.trim() ? 'pointer' : 'default',
                            transition: 'all 0.2s'
                        }}
                    >
                        Add
                    </button>
                </div>
            )}
        </div>
    )
}
