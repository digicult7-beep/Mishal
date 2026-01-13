import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import {
    Calendar,
    Video,
    Link as LinkIcon,
    Plus,
    Search,
    Pencil,
    Trash2
} from 'lucide-react'
import MeetingModal from './MeetingModal'

interface Meeting {
    id: string
    title: string
    start_time: string
    end_time: string
    platform: string
    meeting_link?: string
    client?: {
        name: string
    }
}

import { useAuth } from '../contexts/AuthContext'

interface MeetingsProps {
    clientId?: string | null
    filterByParticipant?: boolean
}

export default function Meetings({ clientId, filterByParticipant = false }: MeetingsProps) {
    const { user } = useAuth()
    const [meetings, setMeetings] = useState<Meeting[]>([])
    const [loading, setLoading] = useState(true)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    const [meetingToEdit, setMeetingToEdit] = useState<Meeting | null>(null)

    useEffect(() => {
        if (user) {
            fetchMeetings()
        }
    }, [user, clientId])

    const fetchMeetings = async () => {
        setLoading(true)
        try {
            let query = supabase
                .from('meetings')
                .select(`
                    *,
                    client:clients(name),
                    meeting_participants${filterByParticipant ? '!inner' : ''}(user_id)
                `)
                .order('start_time', { ascending: true })

            if (clientId) {
                query = query.eq('client_id', clientId)
            }

            if (filterByParticipant && user) {
                query = query.eq('meeting_participants.user_id', user.id)
            }

            const { data, error } = await query

            if (error) throw error
            setMeetings(data || [])
        } catch (error) {
            console.error('Error loading meetings:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation()
        if (!confirm('Are you sure you want to delete this meeting?')) return

        try {
            const { error } = await supabase
                .from('meetings')
                .delete()
                .eq('id', id)

            if (error) throw error
            fetchMeetings()
        } catch (error) {
            console.error('Error deleting meeting:', error)
            alert('Failed to delete meeting')
        }
    }

    const handleEdit = (meeting: Meeting, e: React.MouseEvent) => {
        e.stopPropagation()
        setMeetingToEdit(meeting)
        setIsModalOpen(true)
    }

    const handleCloseModal = () => {
        setIsModalOpen(false)
        setMeetingToEdit(null)
    }

    const filteredMeetings = meetings.filter(m =>
        m.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.client?.name.toLowerCase().includes(searchTerm.toLowerCase())
    )

    // Group by Date
    const groupedMeetings = filteredMeetings.reduce((acc, meeting) => {
        const date = new Date(meeting.start_time).toDateString()
        if (!acc[date]) acc[date] = []
        acc[date].push(meeting)
        return acc
    }, {} as Record<string, Meeting[]>)

    return (
        <div style={{ padding: '2rem', height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Meetings</h1>
                    <p style={{ color: 'var(--text-secondary)' }}>Upcoming schedule and team syncs.</p>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <div style={{ position: 'relative' }}>
                        <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                        <input
                            type="text"
                            placeholder="Search meetings..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{
                                padding: '0.625rem 0.75rem 0.625rem 2.5rem',
                                borderRadius: '8px',
                                border: '1px solid var(--border-color)',
                                background: 'var(--bg-secondary)',
                                color: 'var(--text-primary)',
                                outline: 'none',
                                width: '250px'
                            }}
                        />
                    </div>
                    <button
                        onClick={() => {
                            setMeetingToEdit(null)
                            setIsModalOpen(true)
                        }}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '0.5rem',
                            padding: '0.625rem 1rem',
                            background: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)',
                            color: 'white',
                            borderRadius: '8px',
                            fontWeight: '500',
                            border: 'none',
                            cursor: 'pointer'
                        }}>
                        <Plus size={18} /> Schedule
                    </button>
                </div>
            </div>

            {/* List */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
                {loading ? (
                    <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading schedule...</div>
                ) : Object.keys(groupedMeetings).length === 0 ? (
                    <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No upcoming meetings found.</div>
                ) : (
                    Object.entries(groupedMeetings).map(([date, dayMeetings]) => (
                        <div key={date} style={{ marginBottom: '2rem' }}>
                            <h3 style={{
                                fontSize: '0.875rem', fontWeight: '600', color: 'var(--text-secondary)',
                                textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem',
                                display: 'flex', alignItems: 'center', gap: '0.5rem'
                            }}>
                                <Calendar size={14} />
                                {new Date(date).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
                            </h3>

                            <div style={{ display: 'grid', gap: '1rem' }}>
                                {dayMeetings.map(meeting => (
                                    <div key={meeting.id} style={{
                                        display: 'flex', alignItems: 'center', gap: '1.5rem',
                                        padding: '1.25rem',
                                        background: 'var(--bg-secondary)',
                                        border: '1px solid var(--border-color)',
                                        borderRadius: '12px',
                                        transition: 'transform 0.1s, box-shadow 0.1s',
                                        cursor: 'pointer'
                                    }}
                                        onMouseEnter={e => {
                                            e.currentTarget.style.transform = 'translateY(-2px)'
                                            e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                                        }}
                                        onMouseLeave={e => {
                                            e.currentTarget.style.transform = 'translateY(0)'
                                            e.currentTarget.style.boxShadow = 'none'
                                        }}
                                    >
                                        {/* Time Box */}
                                        <div style={{
                                            display: 'flex', flexDirection: 'column', alignItems: 'center',
                                            minWidth: '80px', paddingRight: '1.5rem', borderRight: '1px solid var(--border-color)'
                                        }}>
                                            <span style={{ fontSize: '1.125rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                                                {new Date(meeting.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                                {new Date(meeting.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>

                                        {/* Details */}
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                                                {meeting.title}
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                                                {meeting.client && (
                                                    <span style={{
                                                        background: 'var(--bg-tertiary)', padding: '0.1rem 0.5rem', borderRadius: '4px',
                                                        fontSize: '0.75rem', fontWeight: '500'
                                                    }}>
                                                        {meeting.client.name}
                                                    </span>
                                                )}
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                                    <Video size={14} />
                                                    {meeting.platform}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Action / Link */}
                                        <div>
                                            {meeting.meeting_link ? (
                                                <a
                                                    href={meeting.meeting_link}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    onClick={e => e.stopPropagation()}
                                                    style={{
                                                        padding: '0.5rem 1rem',
                                                        background: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)', color: 'white',
                                                        borderRadius: '6px', fontSize: '0.875rem', fontWeight: '500',
                                                        textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem'
                                                    }}
                                                >
                                                    Join <LinkIcon size={14} />
                                                </a>
                                            ) : (
                                                <button disabled style={{
                                                    padding: '0.5rem 1rem', background: 'var(--bg-tertiary)', color: 'var(--text-secondary)',
                                                    borderRadius: '6px', fontSize: '0.875rem', fontWeight: '500', border: 'none', cursor: 'not-allowed'
                                                }}>
                                                    No Link
                                                </button>
                                            )}
                                        </div>

                                        {/* Edit/Delete Actions */}
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <button
                                                onClick={(e) => handleEdit(meeting, e)}
                                                title="Edit Meeting"
                                                style={{
                                                    padding: '0.5rem',
                                                    background: 'transparent',
                                                    color: 'var(--text-secondary)',
                                                    border: 'none',
                                                    cursor: 'pointer',
                                                    borderRadius: '6px',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                }}
                                                onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
                                                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
                                            >
                                                <Pencil size={16} />
                                            </button>
                                            <button
                                                onClick={(e) => handleDelete(meeting.id, e)}
                                                title="Delete Meeting"
                                                style={{
                                                    padding: '0.5rem',
                                                    background: 'transparent',
                                                    color: 'var(--danger-color, #ef4444)',
                                                    border: 'none',
                                                    cursor: 'pointer',
                                                    borderRadius: '6px',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                }}
                                                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
                                                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))
                )}
            </div>

            <MeetingModal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                onMeetingCreated={fetchMeetings}
                meetingToEdit={meetingToEdit}
            />
        </div>
    )
}
