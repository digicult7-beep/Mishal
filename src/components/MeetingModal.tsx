import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import Modal from './Modal'
import { Briefcase, Link, MapPin, ChevronDown, ChevronUp, Search, Check } from 'lucide-react'

interface MeetingModalProps {
    isOpen: boolean
    onClose: () => void
    onMeetingCreated: () => void
    meetingToEdit?: any // Using any for flexibility or better strict type from Meetings.tsx
}

export default function MeetingModal({ isOpen, onClose, onMeetingCreated, meetingToEdit }: MeetingModalProps) {
    const [title, setTitle] = useState('')
    const [clientId, setClientId] = useState('')
    const [description, setDescription] = useState('')
    const [startTime, setStartTime] = useState('')
    const [endTime, setEndTime] = useState('')
    const [platform, setPlatform] = useState('Google Meet')
    const [meetingLink, setMeetingLink] = useState('')
    const [loading, setLoading] = useState(false)

    const [clients, setClients] = useState<any[]>([])
    const [profiles, setProfiles] = useState<any[]>([])
    const [participants, setParticipants] = useState<string[]>([])
    const [isParticipantsOpen, setIsParticipantsOpen] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    const [isClientOpen, setIsClientOpen] = useState(false)
    const [clientSearchTerm, setClientSearchTerm] = useState('')

    useEffect(() => {
        if (isOpen) {
            fetchClients()
            fetchProfiles()
            if (meetingToEdit) {
                // Populate form for editing
                setTitle(meetingToEdit.title)
                setClientId(meetingToEdit.client_id || '')
                setDescription(meetingToEdit.description || '')
                setStartTime(meetingToEdit.start_time ? new Date(meetingToEdit.start_time).toISOString().slice(0, 16) : '')
                setEndTime(meetingToEdit.end_time ? new Date(meetingToEdit.end_time).toISOString().slice(0, 16) : '')
                setPlatform(meetingToEdit.platform || 'Google Meet')
                setMeetingLink(meetingToEdit.meeting_link || '')
                // Fetch participants if needed, for simplicity we might skip prepopulating participants
                // or assume we need to fetch them separately
                if (meetingToEdit.meeting_participants) {
                    setParticipants(meetingToEdit.meeting_participants.map((p: any) => p.user_id))
                }
            } else {
                resetForm()
            }
        }
    }, [isOpen, meetingToEdit])

    const fetchClients = async () => {
        const { data } = await supabase.from('clients').select('id, name')
        setClients(data || [])
    }

    const fetchProfiles = async () => {
        const { data } = await supabase.from('profiles').select('id, full_name, email')
        setProfiles(data || [])
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            let data: any
            let error: any

            const meetingData = {
                title,
                client_id: clientId || null,
                description,
                start_time: new Date(startTime).toISOString(),
                end_time: new Date(endTime).toISOString(),
                platform,
                meeting_link: meetingLink
            }

            if (meetingToEdit) {
                // Update
                const { data: updatedData, error: updateError } = await supabase
                    .from('meetings')
                    .update(meetingData)
                    .eq('id', meetingToEdit.id)
                    .select()
                    .single()

                data = updatedData
                error = updateError
            } else {
                // Create
                const { data: newData, error: insertError } = await supabase
                    .from('meetings')
                    .insert(meetingData)
                    .select()
                    .single()

                data = newData
                error = insertError
            }

            if (error) throw error

            // Handle Participants
            if (data) {
                // For edit, simpler to delete all and re-insert or diff.
                // Re-inserting is easiest for now.
                if (meetingToEdit) {
                    await supabase.from('meeting_participants').delete().eq('meeting_id', data.id)
                }

                if (participants.length > 0) {
                    const participantData = participants.map(userId => ({
                        meeting_id: data.id,
                        user_id: userId
                    }))

                    const { error: partError } = await supabase
                        .from('meeting_participants')
                        .insert(participantData)

                    if (partError) console.error('Error updating participants:', partError)
                }

                // --- Send Notifications ---
                const { data: { user } } = await supabase.auth.getUser()
                if (user) {
                    const formattedDate = new Date(startTime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
                    const notificationTitle = meetingToEdit ? `Meeting Updated: ${title}` : `New Meeting: ${title}`
                    const notificationsToInsert = []

                    // 1. Notification for Creator (Self)
                    notificationsToInsert.push({
                        user_id: user.id,
                        title: notificationTitle,
                        message: `You scheduled "${title}" for ${formattedDate}.`,
                        type: 'success'
                    })

                    // 2. Notification for Participants
                    participants.forEach(participantId => {
                        notificationsToInsert.push({
                            user_id: participantId,
                            title: notificationTitle,
                            message: `You have been invited to "${title}" on ${formattedDate}.`,
                            type: 'info'
                        })
                    })

                    if (notificationsToInsert.length > 0) {
                        const { error: notifError } = await supabase
                            .from('notifications')
                            .insert(notificationsToInsert)

                        if (notifError) console.error('Error creating notifications:', notifError)
                    }
                }
            }

            onMeetingCreated()
            onClose()
            resetForm()

        } catch (error) {
            console.error('Error saving meeting:', error)
            alert('Failed to save meeting')
        } finally {
            setLoading(false)
        }
    }

    const resetForm = () => {
        setTitle('')
        setClientId('')
        setDescription('')
        setStartTime('')
        setEndTime('')
        setMeetingLink('')
        setPlatform('Google Meet')
        setParticipants([])
    }

    if (!isOpen) return null

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={
                <span style={{
                    background: 'linear-gradient(to right, #ec4899, #8b5cf6)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    fontWeight: 'bold'
                }}>
                    {meetingToEdit ? "Edit Meeting" : "Schedule Meeting"}
                </span>
            }
            maxWidth="600px"
        >
            {/* Header removed as it is handled by the Modal component */}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

                {/* Title */}
                <div>
                    <label style={labelStyle}>Meeting Title</label>
                    <input
                        required
                        type="text"
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        placeholder="e.g. Weekly Sync"
                        style={inputStyle}
                    />
                </div>

                {/* Client */}
                <div>
                    <label style={labelStyle}>Client (Optional)</label>
                    <div style={{ position: 'relative' }}>
                        <Briefcase size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', zIndex: 1 }} />
                        <div
                            onClick={() => setIsClientOpen(!isClientOpen)}
                            style={{
                                ...inputStyle,
                                paddingLeft: '2.5rem',
                                cursor: 'pointer',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                            }}
                        >
                            <span style={{ color: clientId ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                                {clientId
                                    ? clients.find(c => c.id === clientId)?.name || 'No Client'
                                    : 'No Client'
                                }
                            </span>
                            {isClientOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </div>

                        {isClientOpen && (
                            <div style={{
                                position: 'absolute',
                                top: '100%',
                                left: 0,
                                right: 0,
                                zIndex: 10,
                                marginTop: '0.25rem',
                                border: '1px solid var(--border-color)',
                                borderRadius: '6px',
                                padding: '0.5rem',
                                background: 'var(--bg-secondary)',
                                maxHeight: '200px',
                                overflowY: 'auto',
                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                            }}>
                                <div style={{ paddingBottom: '0.5rem', marginBottom: '0.5rem', borderBottom: '1px solid var(--border-color)', position: 'sticky', top: 0, background: 'var(--bg-secondary)' }}>
                                    <div style={{ position: 'relative' }}>
                                        <Search size={14} style={{ position: 'absolute', left: '0.5rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                                        <input
                                            type="text"
                                            value={clientSearchTerm}
                                            onChange={(e) => setClientSearchTerm(e.target.value)}
                                            placeholder="Search clients..."
                                            style={{
                                                width: '100%',
                                                padding: '0.4rem 0.5rem 0.4rem 2rem',
                                                borderRadius: '4px',
                                                border: '1px solid var(--border-color)',
                                                background: 'var(--bg-tertiary)',
                                                color: 'var(--text-primary)',
                                                fontSize: '0.8rem',
                                                outline: 'none'
                                            }}
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                    </div>
                                </div>

                                <div
                                    onClick={() => {
                                        setClientId('')
                                        setIsClientOpen(false)
                                    }}
                                    style={{
                                        padding: '0.5rem',
                                        cursor: 'pointer',
                                        borderRadius: '4px',
                                        fontSize: '0.875rem',
                                        color: !clientId ? 'var(--accent-color)' : 'var(--text-primary)',
                                        background: !clientId ? 'var(--bg-tertiary)' : 'transparent',
                                        marginBottom: '0.25rem'
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-tertiary)'}
                                    onMouseLeave={e => !clientId && (e.currentTarget.style.background = 'var(--bg-tertiary)') || (e.currentTarget.style.background = 'transparent')}
                                >
                                    No Client
                                </div>

                                {clients.filter(c => c.name.toLowerCase().includes(clientSearchTerm.toLowerCase())).length === 0 ? (
                                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', padding: '0.5rem' }}>No clients found</p>
                                ) : (
                                    clients.filter(c => c.name.toLowerCase().includes(clientSearchTerm.toLowerCase())).map(c => (
                                        <div
                                            key={c.id}
                                            onClick={() => {
                                                setClientId(c.id)
                                                setIsClientOpen(false)
                                            }}
                                            style={{
                                                padding: '0.5rem',
                                                cursor: 'pointer',
                                                borderRadius: '4px',
                                                fontSize: '0.875rem',
                                                color: clientId === c.id ? 'var(--accent-color)' : 'var(--text-primary)',
                                                background: clientId === c.id ? 'var(--bg-tertiary)' : 'transparent',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between'
                                            }}
                                            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-tertiary)'}
                                            onMouseLeave={e => clientId !== c.id && (e.currentTarget.style.background = 'transparent')}
                                        >
                                            {c.name}
                                            {clientId === c.id && <Check size={14} />}
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Participants */}
                <div>
                    <label style={labelStyle}>Participants</label>
                    <div style={{ position: 'relative' }}>
                        <div
                            onClick={() => setIsParticipantsOpen(!isParticipantsOpen)}
                            style={{
                                ...inputStyle,
                                cursor: 'pointer',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                            }}
                        >
                            <span style={{ color: participants.length === 0 ? 'var(--text-secondary)' : 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {participants.length === 0
                                    ? "Select participants..."
                                    : `${participants.length} selected`
                                }
                            </span>
                            {isParticipantsOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </div>

                        {isParticipantsOpen && (
                            <div style={{
                                position: 'absolute',
                                top: '100%',
                                left: 0,
                                right: 0,
                                zIndex: 10,
                                marginTop: '0.25rem',
                                border: '1px solid var(--border-color)',
                                borderRadius: '6px',
                                padding: '0.5rem',
                                background: 'var(--bg-secondary)',
                                maxHeight: '250px',
                                overflowY: 'auto',
                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                            }}>
                                <div style={{ padding: '0.5rem', position: 'sticky', top: 0, background: 'var(--bg-secondary)', zIndex: 10, borderBottom: '1px solid var(--border-color)' }}>
                                    <div style={{ position: 'relative' }}>
                                        <Search size={14} style={{ position: 'absolute', left: '0.5rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                                        <input
                                            type="text"
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            placeholder="Search employees..."
                                            style={{
                                                width: '100%',
                                                padding: '0.4rem 0.5rem 0.4rem 2rem',
                                                borderRadius: '4px',
                                                border: '1px solid var(--border-color)',
                                                background: 'var(--bg-tertiary)',
                                                color: 'var(--text-primary)',
                                                fontSize: '0.8rem',
                                                outline: 'none'
                                            }}
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                    </div>
                                </div>

                                {profiles.filter(p => (p.full_name || p.email).toLowerCase().includes(searchTerm.toLowerCase())).length === 0 ? (
                                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', padding: '0.5rem' }}>No profiles found</p>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '0.5rem' }}>
                                        {profiles.filter(p => (p.full_name || p.email).toLowerCase().includes(searchTerm.toLowerCase())).map(p => (
                                            <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem', color: 'var(--text-primary)', padding: '0.25rem', borderRadius: '4px', transition: 'background 0.2s', ':hover': { background: 'var(--bg-tertiary)' } } as any}>
                                                <input
                                                    type="checkbox"
                                                    value={p.id}
                                                    checked={participants.includes(p.id)}
                                                    onChange={e => {
                                                        if (e.target.checked) {
                                                            setParticipants([...participants, p.id])
                                                        } else {
                                                            setParticipants(participants.filter(id => id !== p.id))
                                                        }
                                                    }}
                                                    style={{ cursor: 'pointer', accentColor: '#3b82f6' }}
                                                />
                                                {p.full_name || p.email}
                                            </label>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    {/* Start Time */}
                    <div>
                        <label style={labelStyle}>Start Time</label>
                        <input
                            required
                            type="datetime-local"
                            value={startTime}
                            onChange={e => setStartTime(e.target.value)}
                            style={inputStyle}
                        />
                    </div>
                    {/* End Time */}
                    <div>
                        <label style={labelStyle}>End Time</label>
                        <input
                            required
                            type="datetime-local"
                            value={endTime}
                            onChange={e => setEndTime(e.target.value)}
                            style={inputStyle}
                        />
                    </div>
                </div>

                {/* Platform & Link */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem' }}>
                    <div>
                        <label style={labelStyle}>Platform</label>
                        <div style={{ position: 'relative' }}>
                            <MapPin size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                            <select
                                value={platform}
                                onChange={e => setPlatform(e.target.value)}
                                style={{ ...inputStyle, paddingLeft: '2.5rem' }}
                            >
                                <option>Google Meet</option>
                                <option>Zoom</option>
                                <option>Teams</option>
                                <option>Other</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label style={labelStyle}>Meeting Link</label>
                        <div style={{ position: 'relative' }}>
                            <Link size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                            <input
                                type="text"
                                value={meetingLink}
                                onChange={e => setMeetingLink(e.target.value)}
                                placeholder="https://..."
                                style={{ ...inputStyle, paddingLeft: '2.5rem' }}
                            />
                        </div>
                    </div>
                </div>

                {/* Description */}
                <div>
                    <label style={labelStyle}>Description</label>
                    <textarea
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        rows={3}
                        style={{ ...inputStyle, resize: 'vertical' }}
                    />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                    <button
                        type="button"
                        onClick={onClose}
                        style={{
                            padding: '0.5rem 1rem',
                            borderRadius: '6px',
                            border: 'none',
                            background: 'transparent',
                            color: 'var(--text-secondary)',
                            fontWeight: '500',
                            cursor: 'pointer'
                        }}
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            padding: '0.5rem 1.5rem',
                            borderRadius: '6px',
                            border: 'none',
                            background: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)',
                            color: 'white',
                            fontWeight: '500',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            opacity: loading ? 0.7 : 1
                        }}
                    >
                        {loading ? 'Creating...' : 'Schedule'}
                    </button>
                </div>
            </form>
        </Modal>
    )
}

const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '0.75rem',
    fontWeight: '700',
    marginBottom: '0.5rem',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    background: 'linear-gradient(to right, #ec4899, #8b5cf6)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    width: 'fit-content'
}

const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.6rem 0.75rem',
    borderRadius: '6px',
    border: '1px solid var(--border-color)',
    background: 'var(--bg-secondary)',
    color: 'var(--text-primary)',
    fontSize: '0.875rem',
    outline: 'none'
}
