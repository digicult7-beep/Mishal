import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Clock, User, Trash2 } from 'lucide-react'

interface Activity {
    id: string
    user_id: string
    action_type: string
    description: string
    created_at: string
    profiles: {
        full_name: string
        email: string
    }
}

export default function ActivityFeed() {
    const [activities, setActivities] = useState<Activity[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        loadActivities()

        // Subscribe to new activities
        const subscription = supabase
            .channel('activities_feed')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'activities' }, () => {
                loadActivities()
            })
            .subscribe()

        return () => {
            subscription.unsubscribe()
        }
    }, [])

    const loadActivities = async () => {
        const { data, error } = await supabase
            .from('activities')
            .select('*, profiles(full_name, email)')
            .order('created_at', { ascending: false })
            .limit(20)

        if (!error && data) {
            setActivities(data)
        }
        setLoading(false)
    }

    const deleteActivity = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation()
        if (!confirm('Are you sure you want to delete this activity?')) return

        try {
            const { error } = await supabase
                .from('activities')
                .delete()
                .eq('id', id)

            if (error) throw error

            setActivities(prev => prev.filter(a => a.id !== id))
        } catch (error) {
            console.error('Error deleting activity:', error)
            alert('Failed to delete activity')
        }
    }

    const clearAllActivities = async () => {
        if (activities.length === 0) return
        if (!confirm('Are you sure you want to clear all visible activities?')) return

        try {
            const idsToDelete = activities.map(a => a.id)
            const { error } = await supabase
                .from('activities')
                .delete()
                .in('id', idsToDelete)

            if (error) throw error

            setActivities([])
        } catch (error) {
            console.error('Error clearing activities:', error)
            alert('Failed to clear activities')
        }
    }

    if (loading) {
        return <div style={{ padding: '1rem', color: 'var(--text-secondary)' }}>Loading activity...</div>
    }

    return (
        <div style={{
            background: 'var(--bg-secondary)',
            borderRadius: '1rem',
            border: '1px solid var(--border-color)',
            overflow: 'hidden',
            height: '100%',
            display: 'flex',
            flexDirection: 'column'
        }}>
            <div style={{
                padding: '1rem 1.5rem',
                borderBottom: '1px solid var(--border-color)',
                background: 'var(--bg-primary)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <h2 style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                    <Clock size={18} /> Activity Feed
                </h2>
                {activities.length > 0 && (
                    <button
                        onClick={clearAllActivities}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--text-secondary)',
                            cursor: 'pointer',
                            fontSize: '0.75rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            padding: '0.25rem 0.5rem',
                            borderRadius: '0.25rem',
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.color = 'var(--danger-color)'
                            e.currentTarget.style.background = 'rgba(255, 0, 0, 0.1)'
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.color = 'var(--text-secondary)'
                            e.currentTarget.style.background = 'transparent'
                        }}
                    >
                        Clear All
                    </button>
                )}
            </div>
            <div style={{ padding: '0.5rem', overflowY: 'auto', flex: 1 }}>
                {activities.length === 0 ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                        No recent activity.
                    </div>
                ) : (
                    activities.map((activity) => (
                        <div key={activity.id} style={{
                            padding: '0.75rem 1rem',
                            borderBottom: '1px solid var(--border-color)',
                            display: 'flex',
                            gap: '0.75rem',
                            alignItems: 'flex-start'
                        }}>
                            <div style={{
                                background: 'var(--bg-tertiary)',
                                padding: '0.25rem',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                <User size={14} color="var(--text-secondary)" />
                            </div>
                            <div style={{ flex: 1 }}>
                                <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                                    <span style={{ fontWeight: '600' }}>{activity.profiles?.full_name || 'Unknown'}</span> {activity.description}
                                </p>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                    {new Date(activity.created_at).toLocaleString()}
                                </span>
                            </div>
                            <button
                                onClick={(e) => deleteActivity(activity.id, e)}
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: 'var(--text-secondary)',
                                    cursor: 'pointer',
                                    padding: '0.25rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    opacity: 0.6,
                                    transition: 'all 0.2s'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.color = 'var(--danger-color)'
                                    e.currentTarget.style.opacity = '1'
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.color = 'var(--text-secondary)'
                                    e.currentTarget.style.opacity = '0.6'
                                }}
                                title="Delete activity"
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}
