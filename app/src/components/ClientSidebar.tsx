import { LayoutGrid, Plus, Pencil, Trash2, LogOut, Briefcase, Users } from 'lucide-react'
import { useState, useEffect } from 'react'



interface Client {
    id: string
    name: string
    cc_id: string
    created_at: string
}

interface Profile {
    full_name: string
    email: string
    avatar_url?: string
}

interface ClientSidebarProps {
    clients: Client[]
    selectedId: string | null
    onSelect: (id: string) => void
    onAdd: () => void
    onEdit: (client: Client) => void
    onDelete: (id: string) => void
    profile: Profile | null
    onSignOut: () => void
    onProfileClick?: () => void
    onCreativeProgressClick?: () => void
    onTasksTrackerClick?: () => void
    onMeetingsClick?: () => void
    onEmployeesClick?: () => void
    activeView?: 'clients' | 'creative-progress' | 'tasks-tracker' | 'meetings' | 'employees' | 'profile'
}

export default function ClientSidebar({
    clients,
    selectedId,
    onSelect,
    onAdd,
    onEdit,
    onDelete,
    profile,
    onSignOut,
    onProfileClick,
    onCreativeProgressClick,
    onTasksTrackerClick,
    onMeetingsClick,
    onEmployeesClick,
    activeView = 'clients'
}: ClientSidebarProps) {
    const [currentTime, setCurrentTime] = useState(new Date())

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date())
        }, 1000)
        return () => clearInterval(timer)
    }, [])

    const getGreeting = () => {
        const hour = currentTime.getHours()
        if (hour < 12) return 'Good Morning'
        if (hour < 18) return 'Good Afternoon'
        return 'Good Evening'
    }

    const formatDate = () => {
        return currentTime.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric'
        })
    }

    const formatTime = () => {
        return currentTime.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    return (
        <aside style={{
            width: '280px',
            background: 'var(--sidebar-bg)',
            borderRight: '1px solid var(--border-color)',
            display: 'flex',
            flexDirection: 'column',
            flexShrink: 0,
            zIndex: 50,
            transition: 'width 0.3s ease',
            color: 'var(--text-primary)'
        }}>
            {/* User Profile Header */}
            <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)', background: 'var(--sidebar-bg)' }}>
                <div
                    onClick={onProfileClick}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        cursor: onProfileClick ? 'pointer' : 'default'
                    }}
                >
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-color)', fontWeight: '600', fontSize: '0.875rem', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
                        {profile?.avatar_url ? (
                            <img src={profile.avatar_url} alt={profile.full_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                            profile?.full_name?.[0] || 'U'
                        )}
                    </div>
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                        <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.2rem', fontWeight: '600' }}>
                            {getGreeting()},
                        </div>
                        <p className="text-gradient" style={{ margin: 0, fontSize: '1.25rem', fontWeight: '800', overflow: 'visible', whiteSpace: 'normal', lineHeight: '1.2', background: 'linear-gradient(to right, #ec4899, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{profile?.full_name}</p>

                        <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', margin: '0.1rem 0 0.25rem' }}>
                            {formatDate()} • {formatTime()}
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); onSignOut(); }} style={{ fontSize: '0.75rem', color: '#ef4444', background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', fontWeight: '500' }}>
                            <LogOut size={12} /> Sign Out
                        </button>
                    </div>

                </div>
            </div>

            {/* Main Navigation */}
            <div style={{ padding: '1rem 1rem 0' }}>
                <h2 style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem', paddingLeft: '0.5rem' }}>
                    Menu
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    {[
                        { id: 'creative-progress', label: 'Content Calendar', icon: LayoutGrid },
                        { id: 'tasks-tracker', label: 'Tasks Tracker', icon: Briefcase },
                        { id: 'meetings', label: 'Meetings', icon: Users },
                        { id: 'employees', label: 'Employees', icon: Users },
                    ].map(item => (
                        <div
                            key={item.id}
                            onClick={() => {
                                if (item.id === 'creative-progress') onCreativeProgressClick?.()
                                if (item.id === 'tasks-tracker') onTasksTrackerClick?.()
                                if (item.id === 'meetings') onMeetingsClick?.()
                                if (item.id === 'employees') onEmployeesClick?.()
                            }}
                            style={{
                                padding: '0.75rem 0.75rem',
                                borderRadius: '0.5rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.75rem',
                                background: activeView === item.id
                                    ? 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)'
                                    : 'transparent',
                                color: activeView === item.id ? 'white' : 'var(--text-secondary)',
                                transition: 'all 0.2s',
                                fontWeight: activeView === item.id ? '600' : '400',
                                boxShadow: 'none'
                            }}
                            onMouseEnter={(e) => {
                                if (activeView !== item.id) {
                                    e.currentTarget.style.background = 'var(--bg-tertiary)'
                                    e.currentTarget.style.color = 'var(--text-primary)'
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (activeView !== item.id) {
                                    e.currentTarget.style.background = 'transparent'
                                    e.currentTarget.style.color = 'var(--text-secondary)'
                                }
                            }}
                        >
                            <item.icon size={18} style={{ opacity: activeView === item.id ? 1 : 0.7 }} />
                            <span>{item.label}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Clients List */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', padding: '0 0.5rem' }}>
                    <h2 style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Clients
                    </h2>
                    <button
                        onClick={onAdd}
                        style={{
                            padding: '0.3rem',
                            background: 'var(--bg-tertiary)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '6px',
                            color: 'var(--text-secondary)',
                            cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = '#8b5cf6'
                            e.currentTarget.style.color = '#8b5cf6'
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = 'var(--border-color)'
                            e.currentTarget.style.color = 'var(--text-secondary)'
                        }}
                    >
                        <Plus size={14} />
                    </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    {clients.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                            No clients found.
                        </div>
                    ) : (
                        clients.map(client => (
                            <div
                                key={client.id}
                                onClick={() => onSelect(client.id)}
                                style={{
                                    padding: '0.75rem 0.75rem',
                                    borderRadius: '0.5rem',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    background: (activeView === 'clients' && selectedId === client.id)
                                        ? 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)'
                                        : 'transparent',
                                    color: (activeView === 'clients' && selectedId === client.id) ? 'white' : 'var(--text-secondary)',
                                    transition: 'all 0.2s',
                                    fontWeight: (activeView === 'clients' && selectedId === client.id) ? '600' : '400',
                                    boxShadow: 'none'
                                }}
                                onMouseEnter={(e) => {
                                    if (activeView !== 'clients' || selectedId !== client.id) {
                                        e.currentTarget.style.background = 'var(--bg-tertiary)'
                                        e.currentTarget.style.color = 'var(--text-primary)'
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (activeView !== 'clients' || selectedId !== client.id) {
                                        e.currentTarget.style.background = 'transparent'
                                        e.currentTarget.style.color = 'var(--text-secondary)'
                                    }
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', overflow: 'hidden' }}>
                                    <Briefcase size={16} style={{ opacity: (activeView === 'clients' && selectedId === client.id) ? 1 : 0.7 }} />
                                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{client.name}</span>
                                </div>

                                {(activeView === 'clients' && selectedId === client.id) && (
                                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                                        <button onClick={(e) => { e.stopPropagation(); onEdit(client); }} style={{ padding: '0.25rem', border: 'none', background: 'rgba(255,255,255,0.2)', borderRadius: '4px', cursor: 'pointer', color: 'white' }} title="Edit"><Pencil size={12} /></button>
                                        <button onClick={(e) => { e.stopPropagation(); onDelete(client.id); }} style={{ padding: '0.25rem', border: 'none', background: 'rgba(255,255,255,0.2)', borderRadius: '4px', cursor: 'pointer', color: '#fecaca' }} title="Delete"><Trash2 size={12} /></button>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </aside>
    )
}
