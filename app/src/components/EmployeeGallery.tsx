import { useState } from 'react'
import { LayoutGrid, List, UserPlus, Pencil, Trash2, Mail, Calendar, User } from 'lucide-react'

interface Employee {
    id: string
    email: string
    full_name: string
    created_at: string
    status?: 'active' | 'inactive'
    created_by?: string
    role?: string
    avatar_url?: string
    task_count?: number
}

interface EmployeeGalleryProps {
    employees: Employee[]
    onAdd: () => void
    onEdit: (employee: Employee) => void
    onDelete: (id: string) => void
    onStatusChange: (id: string, status: 'active' | 'inactive') => void
    onTaskClick?: (id: string, name: string) => void
}

export default function EmployeeGallery({ employees, onAdd, onEdit, onDelete, onStatusChange, onTaskClick }: EmployeeGalleryProps) {
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
    const [searchTerm, setSearchTerm] = useState('')

    const filteredEmployees = employees.filter(emp =>
        (emp.full_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        emp.email.toLowerCase().includes(searchTerm.toLowerCase())
    )

    // Common Styles
    const glassCardStyle = {
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-color)',
        boxShadow: 'var(--glass-shadow)',
        borderRadius: '1rem',
        transition: 'all 0.2s ease',
    }

    const buttonStyle = {
        padding: '0.5rem',
        borderRadius: '0.5rem',
        border: '1px solid var(--border-color)',
        background: 'var(--bg-tertiary)',
        color: 'var(--text-secondary)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.2s'
    }

    return (
        <div style={{ padding: '2rem', height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 className="text-gradient" style={{ fontSize: '2rem', fontWeight: '800', marginBottom: '0.5rem' }}>Employees</h1>
                    <p style={{ color: 'var(--text-secondary)' }}>Manage your team members and their roles.</p>
                </div>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <div style={{ display: 'flex', background: 'var(--bg-tertiary)', padding: '0.25rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)' }}>
                        <button
                            onClick={() => setViewMode('grid')}
                            style={{
                                ...buttonStyle,
                                border: 'none',
                                background: viewMode === 'grid' ? 'var(--bg-primary)' : 'transparent',
                                color: viewMode === 'grid' ? 'var(--accent-color)' : 'var(--text-secondary)',
                                boxShadow: viewMode === 'grid' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                            }}
                            title="Grid View"
                        >
                            <LayoutGrid size={18} />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            style={{
                                ...buttonStyle,
                                border: 'none',
                                background: viewMode === 'list' ? 'var(--bg-primary)' : 'transparent',
                                color: viewMode === 'list' ? 'var(--accent-color)' : 'var(--text-secondary)',
                                boxShadow: viewMode === 'list' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                            }}
                            title="List View"
                        >
                            <List size={18} />
                        </button>
                    </div>

                    <button
                        onClick={onAdd}
                        style={{
                            padding: '0.75rem 1.25rem',
                            background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '0.75rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            fontWeight: '600',
                            boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)'
                        }}
                    >
                        <UserPlus size={18} /> Add Employee
                    </button>
                </div>
            </div>

            {/* Search Bar */}
            <div style={{ marginBottom: '2rem' }}>
                <input
                    type="text"
                    placeholder="Search employees..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{
                        width: '100%',
                        maxWidth: '400px',
                        padding: '0.75rem 1rem',
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '0.75rem',
                        color: 'var(--text-primary)',
                        outline: 'none'
                    }}
                />
            </div>

            {/* Content Area */}
            <div style={{ flex: 1, overflowY: 'auto', paddingRight: '0.5rem' }}>
                {filteredEmployees.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)' }}>
                        <div style={{ width: 64, height: 64, background: 'var(--bg-tertiary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                            <User size={32} />
                        </div>
                        <h3>No employees found</h3>
                        <p>Try adjusting your search terms or add a new employee.</p>
                    </div>
                ) : viewMode === 'grid' ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
                        {filteredEmployees.map(emp => (
                            <div key={emp.id} style={{
                                ...glassCardStyle,
                                padding: '1.5rem',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '1rem',
                                position: 'relative',
                                overflow: 'hidden'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                        <div style={{
                                            width: 48, height: 48, borderRadius: '50%',
                                            background: emp.avatar_url ? 'transparent' : 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)',
                                            color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontWeight: '700', fontSize: '1.2rem',
                                            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                                            overflow: 'hidden',
                                            border: emp.avatar_url ? '1px solid var(--border-color)' : 'none',
                                            position: 'relative'
                                        }}>
                                            {emp.avatar_url ? (
                                                <img src={emp.avatar_url} alt={emp.full_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            ) : (
                                                emp.full_name?.[0]?.toUpperCase() || emp.email[0].toUpperCase()
                                            )}
                                        </div>
                                        <div>
                                            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-primary)' }}>{emp.full_name || 'Unknown'}</h3>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.2rem' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                                    <span style={{
                                                        display: 'inline-block', width: 6, height: 6, borderRadius: '50%',
                                                        background: emp.status === 'inactive' ? '#ef4444' : '#10b981'
                                                    }} />
                                                    {emp.status === 'inactive' ? 'Inactive' : 'Active'}
                                                </div>
                                                {(emp.task_count || 0) > 0 && (
                                                    <span
                                                        onClick={() => onTaskClick?.(emp.id, emp.full_name)}
                                                        style={{
                                                            fontSize: '0.7rem',
                                                            padding: '0.1rem 0.4rem',
                                                            borderRadius: '999px',
                                                            background: 'rgba(139, 92, 246, 0.15)',
                                                            color: '#8b5cf6',
                                                            fontWeight: '600',
                                                            border: '1px solid rgba(139, 92, 246, 0.3)',
                                                            cursor: onTaskClick ? 'pointer' : 'default',
                                                            transition: 'all 0.2s'
                                                        }}
                                                        onMouseEnter={(e) => onTaskClick && (e.currentTarget.style.background = 'rgba(139, 92, 246, 0.25)')}
                                                        onMouseLeave={(e) => onTaskClick && (e.currentTarget.style.background = 'rgba(139, 92, 246, 0.15)')}
                                                    >
                                                        {emp.task_count} Tasks
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    {/* Action Menu could go here, for now simple buttons */}
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                        <Mail size={16} />
                                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{emp.email}</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                        <Calendar size={16} />
                                        <span>Joined {new Date(emp.created_at).toLocaleDateString()}</span>
                                    </div>
                                </div>

                                <div style={{ borderTop: '1px solid var(--border-color)', marginTop: '0.5rem', paddingTop: '1rem', display: 'flex', justifyContent: 'space-between' }}>

                                    {/* Status Toggle */}
                                    <select
                                        value={emp.status || 'active'}
                                        onChange={(e) => onStatusChange(emp.id, e.target.value as 'active' | 'inactive')}
                                        style={{
                                            padding: '0.25rem 0.5rem',
                                            borderRadius: '0.5rem',
                                            fontSize: '0.75rem',
                                            outline: 'none',
                                            cursor: 'pointer',
                                            fontWeight: '600',
                                            ...(emp.status === 'inactive'
                                                ? {
                                                    background: 'rgba(239, 68, 68, 0.1)',
                                                    color: '#ef4444',
                                                    border: '1px solid rgba(239, 68, 68, 0.3)'
                                                }
                                                : {
                                                    background: 'rgba(16, 185, 129, 0.1)',
                                                    color: '#10b981',
                                                    border: '1px solid rgba(16, 185, 129, 0.3)'
                                                })
                                        }}
                                    >
                                        <option value="active" style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>Active</option>
                                        <option value="inactive" style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>Inactive</option>
                                    </select>

                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <button onClick={() => onEdit(emp)} style={{ ...buttonStyle, padding: '0.4rem' }} title="Edit">
                                            <Pencil size={16} />
                                        </button>
                                        <button onClick={() => onDelete(emp.id)} style={{ ...buttonStyle, padding: '0.4rem', color: '#ef4444', borderColor: 'rgba(239,68,68,0.3)' }} title="Delete">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    /* List View */
                    <div style={{ ...glassCardStyle, overflow: 'hidden' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead style={{ background: 'var(--bg-tertiary)' }}>
                                <tr>
                                    <th style={{ padding: '1rem', textAlign: 'left', color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase' }}>Employee</th>
                                    <th style={{ padding: '1rem', textAlign: 'left', color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase' }}>Role</th>
                                    <th style={{ padding: '1rem', textAlign: 'left', color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase' }}>Status</th>
                                    <th style={{ padding: '1rem', textAlign: 'left', color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase' }}>Joined</th>
                                    <th style={{ padding: '1rem', textAlign: 'right', color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredEmployees.map(emp => (
                                    <tr key={emp.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                        <td style={{ padding: '1rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '0.8rem' }}>
                                                    {emp.full_name?.[0]?.toUpperCase() || 'U'}
                                                </div>
                                                <div>
                                                    <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{emp.full_name}</div>
                                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{emp.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>{emp.role || 'Employee'}</td>
                                        <td style={{ padding: '1rem' }}>
                                            <span style={{
                                                padding: '0.25rem 0.6rem', borderRadius: '1rem', fontSize: '0.75rem', fontWeight: '600',
                                                background: emp.status === 'inactive' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                                                color: emp.status === 'inactive' ? '#ef4444' : '#059669'
                                            }}>
                                                {emp.status === 'inactive' ? 'Inactive' : 'Active'}
                                            </span>
                                        </td>
                                        <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>{new Date(emp.created_at).toLocaleDateString()}</td>
                                        <td style={{ padding: '1rem', textAlign: 'right' }}>
                                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                                                <button onClick={() => onEdit(emp)} style={{ ...buttonStyle, padding: '0.3rem', border: 'none', background: 'transparent' }}><Pencil size={16} /></button>
                                                <button onClick={() => onDelete(emp.id)} style={{ ...buttonStyle, padding: '0.3rem', border: 'none', background: 'transparent', color: '#ef4444' }}><Trash2 size={16} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    )
}
