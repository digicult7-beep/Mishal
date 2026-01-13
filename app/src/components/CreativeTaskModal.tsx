import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import Modal from './Modal'
import { Calendar, Briefcase, Video, LayoutGrid, Camera, Image as ImageIcon, Check, ChevronDown, X, Search } from 'lucide-react'

interface CreativeTaskModalProps {
    isOpen: boolean
    onClose: () => void
    onTaskCreated: () => void
    taskToEdit?: any
}

export default function CreativeTaskModal({ isOpen, onClose, onTaskCreated, taskToEdit }: CreativeTaskModalProps) {
    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [clientId, setClientId] = useState('')
    const [contentType, setContentType] = useState<string>('Static')
    const [priority, setPriority] = useState<string>('medium')
    const [startDate, setStartDate] = useState('')
    const [dueDate, setDueDate] = useState('')
    const [assigneeIds, setAssigneeIds] = useState<string[]>([])
    const [loading, setLoading] = useState(false)
    const [dropdownOpen, setDropdownOpen] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false)
    const [clientSearchTerm, setClientSearchTerm] = useState('')

    // Status State
    const [statusId, setStatusId] = useState('')
    const [statuses, setStatuses] = useState<any[]>([])


    // Data for dropdowns
    const [profiles, setProfiles] = useState<any[]>([])
    const [departments, setDepartments] = useState<any[]>([])
    const dropdownRef = useRef<HTMLDivElement>(null)
    const clientDropdownRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setDropdownOpen(false)
            }
            if (clientDropdownRef.current && !clientDropdownRef.current.contains(event.target as Node)) {
                setIsClientDropdownOpen(false)
            }

        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    useEffect(() => {
        if (clientId) {
            fetchStatuses(clientId)
        } else {
            setStatuses([])
            setStatusId('')
        }
    }, [clientId])

    const fetchStatuses = async (deptId: string) => {
        let { data } = await supabase
            .from('task_statuses')
            .select('*')
            .eq('department_id', deptId)
            .order('position')

        // If no statuses found, create defaults (To maintain consistency with DepartmentTasksModal)
        if (!data || data.length === 0) {
            const defaultStatuses = [
                { department_id: deptId, label: 'To Do', position: 0, color: '#e2e8f0' },
                { department_id: deptId, label: 'In Progress', position: 1, color: '#fef3c7' },
                { department_id: deptId, label: 'Done', position: 2, color: '#ecfdf5' }
            ]

            const { data: newStatuses, error: createError } = await supabase
                .from('task_statuses')
                .insert(defaultStatuses)
                .select()
                .order('position')

            if (!createError && newStatuses) {
                data = newStatuses
            }
        }

        if (data) {
            setStatuses(data)
            // If we are NOT editing a task (new task), OR if we switched department manually, set default.
            // We can check if statusId is valid for this new dept, if not, reset.
            if (!taskToEdit || taskToEdit.department_id !== deptId) {
                const todo = data.find(s => s.label === 'To Do') || data[0]
                if (todo) setStatusId(todo.id)
            }
        }
    }

    useEffect(() => {
        if (isOpen) {
            fetchFormData()
            if (taskToEdit) {
                // Populate form
                setTitle(taskToEdit.title)
                setDescription(taskToEdit.description || '')
                setContentType(taskToEdit.content_type || 'Static')
                setPriority(taskToEdit.priority || 'medium')

                if (taskToEdit.department_id) setClientId(taskToEdit.department_id)
                if (taskToEdit.start_date) setStartDate(new Date(taskToEdit.start_date).toISOString().slice(0, 16))
                if (taskToEdit.due_date) setDueDate(new Date(taskToEdit.due_date).toISOString().slice(0, 16))

                // Set initial status from taskToEdit
                if (taskToEdit.status?.id) setStatusId(taskToEdit.status.id)
                else if (taskToEdit.status_id) setStatusId(taskToEdit.status_id)

                // Fetch existing assignments for this task
                fetchTaskAssignments(taskToEdit.id)
            } else {
                resetForm()
            }
        }
    }, [isOpen, taskToEdit])

    const fetchTaskAssignments = async (taskId: string) => {
        try {
            const { data } = await supabase
                .from('task_assignments')
                .select('user_id')
                .eq('task_id', taskId)

            if (data && data.length > 0) {
                setAssigneeIds(data.map(d => d.user_id))
            } else if (taskToEdit?.assignee?.id) {
                // Fallback to legacy assignee if no table entries
                setAssigneeIds([taskToEdit.assignee.id])
            }
        } catch (error) {
            console.error('Error fetching assignments:', error)
        }
    }

    const fetchFormData = async () => {
        try {
            // Fetch Departments
            const { data: depts, error: deptError } = await supabase
                .from('departments')
                .select(`
                    id, 
                    name, 
                    workspace:workspaces!inner(
                        name, 
                        client:clients!inner(name)
                    )
                `)

            if (deptError) throw deptError
            setDepartments(depts || [])

            // Fetch Profiles
            const { data: profs, error: profError } = await supabase
                .from('profiles')
                .select('id, full_name, email, status')
                .eq('role', 'employee')
                .order('full_name', { ascending: true })

            if (profError) throw profError
            setProfiles(profs || [])

        } catch (error) {
            console.error('Error loading form data:', error)
        }
    }

    const toggleAssignee = (id: string) => {
        setAssigneeIds(prev =>
            prev.includes(id)
                ? prev.filter(p => p !== id)
                : [...prev, id]
        )
    }

    const removeAssignee = (id: string, e: React.MouseEvent) => {
        e.stopPropagation()
        setAssigneeIds(prev => prev.filter(p => p !== id))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            const departmentId = clientId

            // Use selected status, or find default if somehow missing
            let finalStatusId = statusId
            if (!finalStatusId && statuses.length > 0) {
                const todo = statuses.find(s => s.label === 'To Do') || statuses[0]
                finalStatusId = todo.id
            }

            // For backward compatibility, set the first assignee as the main 'assigned_to'
            const primaryAssignee = assigneeIds.length > 0 ? assigneeIds[0] : null

            const payload: any = {
                title,
                description,
                department_id: departmentId,
                content_type: contentType,
                priority,
                start_date: startDate ? new Date(startDate).toISOString() : null,
                due_date: dueDate ? new Date(dueDate).toISOString() : null,
                assigned_to: primaryAssignee,
                status_id: finalStatusId
            }

            let targetTaskId = taskToEdit?.id

            if (taskToEdit) {
                const { error: updateError } = await supabase
                    .from('tasks')
                    .update(payload)
                    .eq('id', taskToEdit.id)
                if (updateError) throw updateError
            } else {
                const { data: newTask, error: insertError } = await supabase
                    .from('tasks')
                    .insert(payload)
                    .select()
                    .single()

                if (insertError) throw insertError
                targetTaskId = newTask.id
            }

            // Handle Assignments
            if (targetTaskId) {
                // Delete existing
                await supabase.from('task_assignments').delete().eq('task_id', targetTaskId)

                // Insert new
                if (assigneeIds.length > 0) {
                    const assignmentRows = assigneeIds.map(uid => ({
                        task_id: targetTaskId,
                        user_id: uid
                    }))

                    const { error: assignError } = await supabase
                        .from('task_assignments')
                        .insert(assignmentRows)

                    if (assignError) throw assignError
                }
            }

            onTaskCreated()
            onClose()
            resetForm()

        } catch (error) {
            console.error('Error saving task:', error)
            alert('Failed to save task')
        } finally {
            setLoading(false)
        }
    }

    const resetForm = () => {
        setTitle('')
        setDescription('')
        setClientId('')
        setContentType('Static')
        setPriority('medium')
        setStartDate('')
        setDueDate('')
        setAssigneeIds([])
        setStatusId('') // Reset status
    }

    if (!isOpen) return null

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={taskToEdit ? "Edit Content Task" : "New Content Task"}
            variant="fullscreen"
        >

            <form onSubmit={handleSubmit} style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '1.25rem',
                maxWidth: '900px',
                margin: '0 auto',
                padding: '2rem'
            }}>

                {/* Title */}
                <div>
                    <label style={labelStyle}>Content Title</label>
                    <input
                        required
                        type="text"
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        placeholder="e.g. Summer Campaign Video"
                        style={{ ...inputStyle, fontSize: '1.25rem', padding: '0.75rem' }}
                    />
                </div>

                {/* Description */}
                <div>
                    <label style={labelStyle}>Description</label>
                    <textarea
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        placeholder="Add task details, requirements, or notes..."
                        style={{ ...inputStyle, minHeight: '120px', resize: 'vertical' }}
                    />
                </div>

                {/* Account / Department */}
                <div>
                    <label style={labelStyle}>Client / Department</label>
                    <div ref={clientDropdownRef} style={{ position: 'relative' }}>
                        <Briefcase size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', zIndex: 1 }} />
                        <div
                            onClick={() => setIsClientDropdownOpen(!isClientDropdownOpen)}
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
                                    ? departments.find(d => d.id === clientId)
                                        ? `${departments.find(d => d.id === clientId).workspace.client.name} - ${departments.find(d => d.id === clientId).name}`
                                        : 'Select a Client...'
                                    : 'Select a Client...'
                                }
                            </span>
                            <ChevronDown size={14} style={{ color: 'var(--text-secondary)' }} />
                        </div>

                        {isClientDropdownOpen && (
                            <div style={{
                                position: 'absolute',
                                top: '100%',
                                left: 0,
                                right: 0,
                                zIndex: 50,
                                marginTop: '0.25rem',
                                border: '1px solid var(--border-color)',
                                borderRadius: '6px',
                                background: 'var(--bg-secondary)',
                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                            }}>
                                <div style={{ padding: '0.5rem', position: 'sticky', top: 0, background: 'var(--bg-secondary)', zIndex: 10, borderBottom: '1px solid var(--border-color)' }}>
                                    <div style={{ position: 'relative' }}>
                                        <Search size={14} style={{ position: 'absolute', left: '0.5rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                                        <input
                                            type="text"
                                            value={clientSearchTerm}
                                            onChange={(e) => setClientSearchTerm(e.target.value)}
                                            placeholder="Search client/department..."
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

                                <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                                    {departments.filter(d =>
                                        d.name.toLowerCase().includes(clientSearchTerm.toLowerCase()) ||
                                        d.workspace.client.name.toLowerCase().includes(clientSearchTerm.toLowerCase())
                                    ).length === 0 ? (
                                        <div style={{ padding: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>No clients found</div>
                                    ) : (
                                        departments.filter(d =>
                                            d.name.toLowerCase().includes(clientSearchTerm.toLowerCase()) ||
                                            d.workspace.client.name.toLowerCase().includes(clientSearchTerm.toLowerCase())
                                        ).map((dept: any) => (
                                            <div
                                                key={dept.id}
                                                onClick={() => {
                                                    setClientId(dept.id)
                                                    setIsClientDropdownOpen(false)
                                                }}
                                                style={{
                                                    padding: '0.5rem 0.75rem',
                                                    cursor: 'pointer',
                                                    fontSize: '0.875rem',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    background: clientId === dept.id ? 'var(--bg-tertiary)' : 'transparent',
                                                    color: 'var(--text-primary)'
                                                }}
                                                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-tertiary)'}
                                                onMouseLeave={(e) => clientId !== dept.id && (e.currentTarget.style.background = 'transparent')}
                                            >
                                                <span>{dept.workspace.client.name} - {dept.name}</span>
                                                {clientId === dept.id && <Check size={14} className="text-blue-500" />}
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>



                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                    {/* Content Type & Assignments */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>



                        {/* Content Type */}
                        <div>
                            <label style={labelStyle}>Content Type</label>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', marginBottom: '0.75rem' }}>
                                {['Static', 'Video', 'Reel', 'Shooting'].map(type => (
                                    <button
                                        key={type}
                                        type="button"
                                        onClick={() => setContentType(type)}
                                        style={{
                                            padding: '0.5rem',
                                            borderRadius: '6px',
                                            border: contentType === type ? '1px solid #3b82f6' : '1px solid var(--border-color)',
                                            background: contentType === type ? 'rgba(59, 130, 246, 0.1)' : 'var(--bg-tertiary)',
                                            color: contentType === type ? '#3b82f6' : 'var(--text-secondary)',
                                            fontSize: '0.75rem',
                                            fontWeight: '500',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            gap: '0.25rem'
                                        }}
                                    >
                                        {type === 'Static' && <ImageIcon size={14} />}
                                        {type === 'Video' && <Video size={14} />}
                                        {type === 'Reel' && <LayoutGrid size={14} />}
                                        {type === 'Shooting' && <Camera size={14} />}
                                        {type}
                                    </button>
                                ))}
                            </div>
                            {/* Custom Type Input */}
                            <div style={{ marginBottom: '0.5rem' }}>
                                <label style={{ ...labelStyle, fontSize: '0.75rem' }}>Or Custom Type:</label>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        type="text"
                                        value={['Static', 'Video', 'Reel', 'Shooting'].includes(contentType) ? '' : contentType}
                                        onChange={(e) => setContentType(e.target.value)}
                                        placeholder="Type custom name..."
                                        style={{ ...inputStyle, paddingLeft: '0.75rem' }}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Designer / Assignee (Multi-Select) */}
                        <div>
                            <label style={labelStyle}>Designers</label>
                            <div ref={dropdownRef} style={{ position: 'relative' }}>
                                <div
                                    onClick={() => setDropdownOpen(!dropdownOpen)}
                                    style={{
                                        ...inputStyle,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        minHeight: '42px',
                                        paddingRight: '0.5rem'
                                    }}
                                >
                                    <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap', overflow: 'hidden' }}>
                                        {assigneeIds.length === 0 ? (
                                            <span style={{ color: 'var(--text-secondary)' }}>Unassigned</span>
                                        ) : (
                                            assigneeIds.map(id => {
                                                const name = profiles.find(p => p.id === id)?.full_name || 'Unknown'
                                                return (
                                                    <span key={id} style={{
                                                        background: 'var(--bg-tertiary)',
                                                        border: '1px solid var(--border-color)',
                                                        padding: '0.1rem 0.4rem',
                                                        borderRadius: '4px',
                                                        fontSize: '0.75rem',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '4px'
                                                    }}>
                                                        {name}
                                                        <div
                                                            onClick={(e) => removeAssignee(id, e)}
                                                            style={{ cursor: 'pointer', display: 'flex' }}
                                                        >
                                                            <X size={12} />
                                                        </div>
                                                    </span>
                                                )
                                            })
                                        )}
                                    </div>
                                    <ChevronDown size={14} style={{ color: 'var(--text-secondary)' }} />
                                </div>

                                {dropdownOpen && (
                                    <div style={{
                                        position: 'absolute',
                                        top: '100%',
                                        left: 0,
                                        right: 0,
                                        marginTop: '0.25rem',
                                        background: 'var(--bg-secondary)',
                                        border: '1px solid var(--border-color)',
                                        borderRadius: '6px',
                                        maxHeight: '200px',
                                        overflowY: 'auto',
                                        zIndex: 50,
                                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                                    }}>
                                        <div style={{ padding: '0.5rem', position: 'sticky', top: 0, background: 'var(--bg-secondary)', zIndex: 10, borderBottom: '1px solid var(--border-color)' }}>
                                            <div style={{ position: 'relative' }}>
                                                <Search size={14} style={{ position: 'absolute', left: '0.5rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                                                <input
                                                    type="text"
                                                    value={searchTerm}
                                                    onChange={(e) => setSearchTerm(e.target.value)}
                                                    placeholder="Search designers..."
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

                                        {profiles.filter(p => (p.full_name || p.email).toLowerCase().includes(searchTerm.toLowerCase()) && p.status !== 'inactive').length === 0 ? (
                                            <div style={{ padding: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>No profiles found</div>
                                        ) : (
                                            profiles.filter(p => (p.full_name || p.email).toLowerCase().includes(searchTerm.toLowerCase()) && p.status !== 'inactive').map(p => {
                                                const isSelected = assigneeIds.includes(p.id)
                                                return (
                                                    <div
                                                        key={p.id}
                                                        onClick={() => toggleAssignee(p.id)}
                                                        style={{
                                                            padding: '0.5rem 0.75rem',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'space-between',
                                                            cursor: 'pointer',
                                                            fontSize: '0.875rem',
                                                            background: isSelected ? 'var(--bg-tertiary)' : 'transparent',
                                                            color: 'var(--text-primary)'
                                                        }}
                                                        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-tertiary)'}
                                                        onMouseLeave={e => !isSelected && (e.currentTarget.style.background = 'transparent')}
                                                    >
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                            <div style={{
                                                                width: 20, height: 20, borderRadius: '50%',
                                                                background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)', color: 'white',
                                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                fontSize: '0.7rem',
                                                                boxShadow: 'none'
                                                            }}>
                                                                {(p.full_name || 'U')[0].toUpperCase()}
                                                            </div>
                                                            {p.full_name || p.email}
                                                        </div>
                                                        {isSelected && <Check size={14} className="text-blue-500" />}
                                                    </div>
                                                )
                                            })
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>


                    {/* Dates & Priority */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {/* Start Date */}
                        <div>
                            <label style={labelStyle}>Work Start Date</label>
                            <div style={{ position: 'relative' }}>
                                <Calendar size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                                <input
                                    type="datetime-local"
                                    value={startDate}
                                    onChange={e => setStartDate(e.target.value)}
                                    style={{ ...inputStyle, paddingLeft: '2.5rem' }}
                                />
                            </div>
                        </div>

                        {/* Due Date */}
                        <div>
                            <label style={labelStyle}>Publish/Due Date</label>
                            <div style={{ position: 'relative' }}>
                                <Calendar size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                                <input
                                    type="datetime-local"
                                    value={dueDate}
                                    onChange={e => setDueDate(e.target.value)}
                                    style={{ ...inputStyle, paddingLeft: '2.5rem' }}
                                />
                            </div>
                        </div>

                        {/* Priority */}
                        <div>
                            <label style={labelStyle}>Priority</label>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                {['low', 'medium', 'high'].map(p => (
                                    <button
                                        key={p}
                                        type="button"
                                        onClick={() => setPriority(p)}
                                        style={{
                                            flex: 1,
                                            padding: '0.5rem',
                                            borderRadius: '6px',
                                            border: priority === p
                                                ? (p === 'high' ? '1px solid #ef4444' : p === 'medium' ? '1px solid #f59e0b' : '1px solid #22c55e')
                                                : '1px solid var(--border-color)',
                                            background: priority === p
                                                ? (p === 'high' ? 'rgba(239, 68, 68, 0.1)' : p === 'medium' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(34, 197, 94, 0.1)')
                                                : 'var(--bg-tertiary)',
                                            color: priority === p
                                                ? (p === 'high' ? '#ef4444' : p === 'medium' ? '#f59e0b' : '#22c55e')
                                                : 'var(--text-secondary)',
                                            fontSize: '0.75rem',
                                            fontWeight: '600',
                                            textTransform: 'capitalize',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        {p}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
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
                            background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
                            color: 'white',
                            fontWeight: '500',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            opacity: loading ? 0.7 : 1,
                            boxShadow: 'none'
                        }}
                    >
                        {loading ? 'Saving...' : (taskToEdit ? 'Save Changes' : 'Create Task')}
                    </button>
                </div>

            </form>
        </Modal >
    )
}

const labelStyle: React.CSSProperties = {
    display: 'inline-block',
    fontSize: '0.75rem',
    fontWeight: '700',
    background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    marginBottom: '0.5rem',
    textTransform: 'uppercase',
    letterSpacing: '0.05em'
}

const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.6rem 0.75rem',
    borderRadius: '6px',
    border: '1px solid var(--border-color)',
    background: 'var(--bg-secondary)',
    color: '#ffffff',
    fontSize: '0.875rem',
    fontWeight: '500',
    outline: 'none'
}
