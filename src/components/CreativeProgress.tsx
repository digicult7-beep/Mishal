import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import CreativeTaskModal from './CreativeTaskModal'
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd'
import {
    LayoutGrid,
    Video,
    Camera,
    Image as ImageIcon,
    Plus,
    Search,
    MoreHorizontal,
    Share2,
    MessageSquare,
    List,
    Calendar as CalendarIcon,
    Kanban,
    ChevronLeft,
    ChevronRight,
    Clock,
    Filter
} from 'lucide-react'
import {
    format,
    startOfMonth,
    endOfMonth,
    eachDayOfInterval,
    isSameDay,
    startOfWeek,
    endOfWeek,
    addMonths,
    subMonths,
    parseISO,
    isSameWeek,
    isSameMonth
} from 'date-fns'

interface Task {
    id: string
    title: string
    description?: string
    content_type: string | null
    start_date: string | null
    due_date: string | null
    status: {
        id: string
        label: string
        color: string
    } | null
    assignee?: {
        id: string
        full_name: string
        email: string
        avatar_url?: string
    } | null
    assignees?: {
        id: string
        full_name: string
        email: string
        avatar_url?: string
    }[]
    priority: 'low' | 'medium' | 'high' | null
    client: {
        name: string
    } | null
    comments_count?: number
}

interface CreativeProgressProps {
    clientId?: string | null
}

interface TaskStatus {
    id: string
    label: string
    color: string
}

export default function CreativeProgress({ clientId }: CreativeProgressProps) {
    const [tasks, setTasks] = useState<Task[]>([])
    const [taskStatuses, setTaskStatuses] = useState<TaskStatus[]>([])
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState<string>('Overview')
    const [searchTerm, setSearchTerm] = useState('')
    const [isModalOpen, setIsModalOpen] = useState(false)

    // New Status State
    const [isAddingStatus, setIsAddingStatus] = useState(false)
    const [newStatusName, setNewStatusName] = useState('')

    // New View State
    const [viewMode, setViewMode] = useState<'list' | 'board' | 'calendar'>('list')
    const [currentDate, setCurrentDate] = useState(new Date())

    // Action State
    const [activeOpenMenuId, setActiveOpenMenuId] = useState<string | null>(null)
    const [taskToEdit, setTaskToEdit] = useState<Task | null>(null)
    const [filterTimeRange, setFilterTimeRange] = useState<'all' | 'weekly' | 'monthly'>('all')
    const [showFilters, setShowFilters] = useState(false)

    // Filter State
    const [assigneeFilter, setAssigneeFilter] = useState('')
    const [contentTypeFilter, setContentTypeFilter] = useState('')
    const [dateRangeStart, setDateRangeStart] = useState('')
    const [dateRangeEnd, setDateRangeEnd] = useState('')

    useEffect(() => {
        fetchTasks()
    }, [])

    const fetchTasks = async () => {
        setLoading(true)
        try {
            // Fetch Statuses
            const { data: statusData } = await supabase
                .from('task_statuses')
                .select('*')
                .order('position', { ascending: true }) // Assuming there's a position, if not, id or label.

            if (statusData) {
                // Determine order or use default if no position
                // If checking locally, we might want to enforce specific order: To Do -> ... -> Completed
                const order = ['To Do', 'Shooting', 'Editing', 'CG', 'Review', 'Completed']
                const sorted = statusData.sort((a, b) => {
                    const idxA = order.findIndex(o => a.label.includes(o))
                    const idxB = order.findIndex(o => b.label.includes(o))
                    return (idxA === -1 ? 99 : idxA) - (idxB === -1 ? 99 : idxB)
                })
                // Deduplicate statuses by label
                const uniqueStatuses = sorted.filter((status, index, self) =>
                    index === self.findIndex((s) => s.label === status.label)
                )

                setTaskStatuses(uniqueStatuses)
            }

            // Fetch Tasks
            let query = supabase
                .from('tasks')
                .select(`
                    id,
                    title,
                    description,
                    department_id,
                    content_type,
                    start_date,
                    due_date,
                    priority,
                    status:task_statuses(id, label, color),
                    assignee:profiles!tasks_assigned_to_fkey(id, full_name, email, avatar_url, status),
                    assignments:task_assignments(
                        user:profiles(id, full_name, email, avatar_url, status)
                    ),
                    department:departments!inner(
                        workspace:workspaces!inner(
                            client:clients!inner(name)
                        )
                    ),
                    task_comments(count)
                `)
                .order('created_at', { ascending: false })

            if (clientId) {
                query = query.eq('department.workspace.client_id', clientId)
            }

            const { data, error } = await query


            if (error) throw error

            const formattedTasks = data.map((t: any) => {
                // Merge legacy assignee with new assignments
                const assigneesMap = new Map()

                if (t.assignee) {
                    assigneesMap.set(t.assignee.id, t.assignee)
                }

                if (t.assignments) {
                    t.assignments.forEach((a: any) => {
                        if (a.user) assigneesMap.set(a.user.id, a.user)
                    })
                }

                return {
                    id: t.id,
                    title: t.title,
                    description: t.description,
                    department_id: t.department_id,
                    content_type: t.content_type,
                    start_date: t.start_date,
                    due_date: t.due_date,
                    priority: t.priority,
                    status: t.status,
                    assignees: Array.from(assigneesMap.values()),
                    client: t.department?.workspace?.client,
                    comments_count: t.task_comments?.[0]?.count || 0
                }
            })

            setTasks(formattedTasks)
        } catch (error) {
            console.error('Error fetching data:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleDragEnd = async (result: DropResult) => {
        const { destination, source, draggableId } = result

        if (!destination) return
        if (destination.droppableId === source.droppableId && destination.index === source.index) return

        // Find the target status
        const targetStatusId = destination.droppableId
        const newStatus = taskStatuses.find(s => s.id === targetStatusId)

        if (!newStatus) return

        // Optimistic Update
        const updatedTasks = tasks.map(t => {
            if (t.id === draggableId) {
                return { ...t, status: newStatus }
            }
            return t
        })
        setTasks(updatedTasks)

        // API Update
        try {
            const { error } = await supabase
                .from('tasks')
                .update({ status: targetStatusId }) // Use 'status' if it's the FK column, or 'status_id' if that's the name. Usually `status` in render is object, but column is likely `status_id`.
                // Wait, Supabase returns object for relation, but update expects column ID. Column is likely `status_id`.
                // Let's verify schema if possible, but standard is `status_id` or `status` if defined that way.
                // Based on previous code `status` was used in `tasks` table? No, it often maps `status_id`.
                // The select used `status:task_statuses(...)` which means the FK column is `status`.
                // If the column name is `status`, then `.update({ status: id })` is correct.
                .eq('id', draggableId)

            if (error) throw error
        } catch (error) {
            console.error('Error updating task status:', error)
            // Revert on error would be ideal, but for now just logging.
            fetchTasks() // Re-fetch to sync
        }
    }

    const handleCreateStatus = async () => {
        if (!newStatusName.trim()) return

        try {
            // Find max position
            // Assuming we fetch all and can check local, but safe to just append or use default.
            // Let's assume position is handled or we just insert.
            const { error } = await supabase
                .from('task_statuses')
                .insert({
                    label: newStatusName,
                    color: '#E5E7EB', // Default grey 
                    position: taskStatuses.length + 1
                })

            if (error) throw error

            setNewStatusName('')
            setIsAddingStatus(false)
            fetchTasks()
        } catch (error) {
            console.error('Error creating status:', error)
            alert('Failed to create status. It might already exist or you do not have permission.')
        }
    }

    const handleShare = (task: Task) => {
        // Create a shareable text or link
        const text = `Task: ${task.title}\nClient: ${task.client?.name}\nDue: ${task.due_date ? format(new Date(task.due_date), 'PPP') : 'No due date'}`
        navigator.clipboard.writeText(text)
        alert('Task details copied to clipboard!')
    }

    const handleEdit = (task: Task) => {
        setTaskToEdit(task)
        setIsModalOpen(true)
        setActiveOpenMenuId(null)
    }

    const handleDelete = async (taskId: string) => {
        if (!confirm('Are you sure you want to delete this task?')) return

        try {
            const { error } = await supabase
                .from('tasks')
                .delete()
                .eq('id', taskId)

            if (error) throw error

            setActiveOpenMenuId(null)
            fetchTasks()
        } catch (error) {
            console.error('Error deleting task:', error)
            alert('Failed to delete task')
        }
    }

    const getTypeIcon = (type: string | null) => {
        switch (type) {
            case 'Video': return <Video size={16} className="text-blue-400" />
            case 'Reel': return <Video size={16} className="text-pink-400" /> // Using Video icon for Reel for now
            case 'Shooting': return <Camera size={16} className="text-orange-400" />
            case 'Static': return <ImageIcon size={16} className="text-green-400" />
            default: return <LayoutGrid size={16} className="text-gray-400" />
        }
    }

    const getClientColor = (name: string) => {
        const colors = [
            { bg: 'rgba(59, 130, 246, 0.1)', text: '#93c5fd' }, // Blue 300
            { bg: 'rgba(16, 185, 129, 0.1)', text: '#86efac' }, // Green 300
            { bg: 'rgba(236, 72, 153, 0.1)', text: '#f9a8d4' }, // Pink 300
            { bg: 'rgba(249, 115, 22, 0.1)', text: '#fdba74' }, // Orange 300
            { bg: 'rgba(168, 85, 247, 0.1)', text: '#d8b4fe' }, // Purple 300
            { bg: 'rgba(239, 68, 68, 0.1)', text: '#fca5a5' }, // Red 300
            { bg: 'rgba(14, 165, 233, 0.1)', text: '#7dd3fc' }, // Sky 300
            { bg: 'rgba(245, 158, 11, 0.1)', text: '#fcd34d' }, // Amber 300
        ];

        // Simple hash to consistently pick a color
        let hash = 0;
        for (let i = 0; i < name.length; i++) {
            hash = name.charCodeAt(i) + ((hash << 5) - hash);
        }

        const index = Math.abs(hash) % colors.length;
        return {
            background: colors[index].bg,
            color: colors[index].text
        };
    }

    const filteredTasks = tasks.filter(task => {
        const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            task.client?.name.toLowerCase().includes(searchTerm.toLowerCase())

        // Assignee Filter
        let matchesAssignee = true
        if (assigneeFilter) {
            matchesAssignee = task.assignees?.some(a => a.id === assigneeFilter) || false
        }

        // Content Type Filter
        let matchesType = true
        if (contentTypeFilter) {
            matchesType = task.content_type === contentTypeFilter
        }

        // Date Range Filter
        let matchesDateRange = true
        if (dateRangeStart || dateRangeEnd) {
            const startDate = task.start_date ? new Date(task.start_date) : null
            const dueDate = task.due_date ? new Date(task.due_date) : null

            const rangeStart = dateRangeStart ? new Date(dateRangeStart) : null
            const rangeEnd = dateRangeEnd ? new Date(dateRangeEnd) : null

            // If Start Date is set, task must start on/after OR due on/after
            // Let's use strict intersection logic or simple overlap.
            // Requirement usually: Find tasks active in this period.
            // Or tasks due in this period?
            // "Quickly find specific tasks" -> Likely due date or start date.
            // Let's check if task's range [start, due] overlaps with [rangeStart, rangeEnd].
            // If task has only start or only due, we check point in range.

            // Simplified logic: If task due date is within range (if due date exists).
            // Or if Start Date is within range.

            // Let's implement: Task Event falls within Filter Range.
            // Start of Filter <= Task End/Due AND End of Filter >= Task Start

            // Fallback for tasks with single date:
            const taskStart = startDate || dueDate
            const taskEnd = dueDate || startDate

            if (taskStart && taskEnd) {
                if (rangeStart && taskEnd < rangeStart) matchesDateRange = false
                if (rangeEnd && taskStart > rangeEnd) matchesDateRange = false
            } else if (rangeStart || rangeEnd) {
                // Task has no dates, so it doesn't match a specific date range query effectively?
                // Or we include them? Usually exclude un-dated items from date filters.
                matchesDateRange = false
            }
        }


        let matchesTime = true
        // Legacy time filter (Weekly/Monthly view toggles) - maintain this if useful or merge logic.
        // If Date Range is active, ignore legacy filter or combine?
        // User asked for "dropdown filters... Date Ranges". 
        // Logic: specific date range inputs override the preset "Weekly/Monthly" pills.
        if ((dateRangeStart || dateRangeEnd)) {
            matchesTime = true // Handled by matchesDateRange
        } else if (filterTimeRange !== 'all') {
            const now = new Date()
            const start = task.start_date ? parseISO(task.start_date) : null
            const due = task.due_date ? parseISO(task.due_date) : null

            // If filtering, we need at least one date
            if (!start && !due) matchesTime = false
            else {
                if (filterTimeRange === 'weekly') {
                    const startMatch = start ? isSameWeek(start, now) : false
                    const dueMatch = due ? isSameWeek(due, now) : false
                    matchesTime = startMatch || dueMatch
                } else { // monthly
                    const startMatch = start ? isSameMonth(start, now) : false
                    const dueMatch = due ? isSameMonth(due, now) : false
                    matchesTime = startMatch || dueMatch
                }
            }
        }

        // Tab Filter
        let matchesTab = true;
        // If content type filter is set via dropdown, we might ignore tab or treat tab as a shortcut?
        // "Benefit: Quickly find... without scrolling".
        // The dropdown effectively replaces the tabs' function if used.
        // Let's say: Dropdown PRECEDES Tab. If Dropdown is set, ignore Tab (or set Tab to Overview).
        // Actually, let's keep it simple: Tab overrides unless 'Overview'.
        if (contentTypeFilter && activeTab !== 'Overview') {
            // Conflict? Let's say ALL filters must match.
            // If Tab=Video and Filter=Static -> No results. 
        }

        if (activeTab === 'Overview') matchesTab = true
        else matchesTab = task.content_type === activeTab

        return matchesSearch && matchesTime && matchesDateRange && matchesAssignee && matchesType && matchesTab
    })

    // Dynamic Tabs
    // 1. Always have 'Overview'
    // 2. Add 'Static', 'Video', 'Shooting' as defaults? Or just derive from tasks?
    // Let's manually include the base ones + any others found in tasks.
    const baseTypes = ['Static', 'Video', 'Reel', 'Shooting']
    const taskTypes = Array.from(new Set(tasks.map(t => t.content_type).filter(Boolean))) as string[]
    const allTypes = Array.from(new Set([...baseTypes, ...taskTypes]))

    const tabs = ['Overview', ...allTypes]
    // Filter out if activeTab is not in list (unless it's Overview)
    // Actually, we want to show all types that exist or are base.


    return (
        <div style={{ padding: '2rem', height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <div style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold' }}>Content Calendar</h1>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>

                    {/* View Switcher - Only visible if not in small screens potentially, but here effectively always */}
                    <div style={{ display: 'flex', background: 'var(--bg-tertiary)', padding: '0.25rem', borderRadius: '8px', border: '1px solid var(--border-color)', marginRight: '1rem' }}>
                        {[
                            { id: 'list', icon: List, label: 'List' },
                            { id: 'board', icon: Kanban, label: 'Board' },
                            { id: 'calendar', icon: CalendarIcon, label: 'Calendar' }
                        ].map(view => (
                            <button
                                key={view.id}
                                onClick={() => setViewMode(view.id as any)}
                                title={view.label}
                                style={{
                                    padding: '0.4rem',
                                    borderRadius: '6px',
                                    border: 'none',
                                    background: viewMode === view.id ? 'white' : 'transparent',
                                    color: viewMode === view.id ? '#3b82f6' : 'var(--text-secondary)',
                                    boxShadow: viewMode === view.id ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                                    cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <view.icon size={18} />
                            </button>
                        ))}
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border-color)', overflowX: 'auto', paddingBottom: '2px', flex: 1 }}>
                        {tabs.map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab as any)}
                                style={{
                                    padding: '0.5rem 1.25rem',
                                    borderRadius: '9999px',
                                    border: activeTab === tab ? 'none' : '1px solid var(--border-color)',
                                    background: activeTab === tab ? 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)' : 'transparent',
                                    color: activeTab === tab ? 'white' : 'var(--text-secondary)',
                                    fontWeight: '500',
                                    transition: 'all 0.2s',
                                    whiteSpace: 'nowrap',
                                    cursor: 'pointer'
                                }}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <div style={{ position: 'relative' }}>
                            <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                            <input
                                type="text"
                                placeholder="Search..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                style={{
                                    padding: '0.5rem 0.75rem 0.5rem 2.5rem',
                                    borderRadius: '6px',
                                    border: '1px solid var(--border-color)',
                                    background: 'var(--bg-secondary)',
                                    color: 'var(--text-primary)',
                                    outline: 'none',
                                    fontSize: '0.875rem'
                                }}
                            />
                        </div>
                        <button
                            onClick={() => {
                                setSearchTerm('');
                                setActiveTab('Overview');
                                setFilterTimeRange('all');
                                setAssigneeFilter('');
                                setContentTypeFilter('');
                                setDateRangeStart('');
                                setDateRangeEnd('');
                            }}
                            style={{
                                padding: '0.5rem 1rem',
                                background: 'transparent',
                                border: '1px solid var(--border-color)',
                                color: 'var(--text-secondary)',
                                borderRadius: '6px',
                                fontWeight: '500',
                                fontSize: '0.875rem',
                                cursor: 'pointer'
                            }}
                        >
                            Reset
                        </button>

                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            style={{
                                padding: '0.5rem',
                                background: showFilters ? 'var(--bg-tertiary)' : 'transparent',
                                border: '1px solid var(--border-color)',
                                color: 'var(--text-secondary)',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                            title="Toggle Filters"
                        >
                            <Filter size={18} />
                        </button>

                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                                onClick={() => {
                                    setFilterTimeRange(filterTimeRange === 'weekly' ? 'all' : 'weekly');
                                    setDateRangeStart('');
                                    setDateRangeEnd('');
                                }}
                                style={{
                                    padding: '0.5rem 1rem',
                                    borderRadius: '6px',
                                    fontWeight: '500',
                                    fontSize: '0.875rem',
                                    cursor: 'pointer',
                                    border: filterTimeRange === 'weekly' ? 'none' : '1px solid var(--border-color)',
                                    background: filterTimeRange === 'weekly' ? 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)' : 'transparent',
                                    color: filterTimeRange === 'weekly' ? 'white' : 'var(--text-secondary)',
                                    transition: 'all 0.3s ease',
                                    boxShadow: 'none'
                                }}
                            >
                                Weekly
                            </button>
                            <button
                                onClick={() => {
                                    setFilterTimeRange(filterTimeRange === 'monthly' ? 'all' : 'monthly');
                                    setDateRangeStart('');
                                    setDateRangeEnd('');
                                }}
                                style={{
                                    padding: '0.5rem 1rem',
                                    borderRadius: '6px',
                                    fontWeight: '500',
                                    fontSize: '0.875rem',
                                    cursor: 'pointer',
                                    border: filterTimeRange === 'monthly' ? 'none' : '1px solid var(--border-color)',
                                    background: filterTimeRange === 'monthly' ? 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)' : 'transparent',
                                    color: filterTimeRange === 'monthly' ? 'white' : 'var(--text-secondary)',
                                    transition: 'all 0.3s ease',
                                    boxShadow: 'none'
                                }}
                            >
                                Monthly
                            </button>
                        </div>
                        {/* Save View button removed */}
                        <button
                            onClick={() => setIsModalOpen(true)}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '0.5rem',
                                padding: '0.5rem 1rem',
                                background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
                                color: 'white',
                                borderRadius: '6px',
                                fontWeight: '500',
                                fontSize: '0.875rem',
                                border: 'none',
                                cursor: 'pointer',
                                boxShadow: 'none'
                            }}>
                            <Plus size={16} /> New
                        </button>
                    </div>
                </div>
                {/* Advanced Filters */}
                {showFilters && (
                    <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-color)', animation: 'slideDown 0.2s ease-out' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-secondary)' }}>Assignee</label>
                            <select
                                value={assigneeFilter}
                                onChange={(e) => setAssigneeFilter(e.target.value)}
                                style={{
                                    padding: '0.5rem',
                                    borderRadius: '6px',
                                    border: '1px solid var(--border-color)',
                                    background: 'var(--bg-tertiary)',
                                    color: 'var(--text-primary)',
                                    outline: 'none',
                                    fontSize: '0.875rem',
                                    minWidth: '150px'
                                }}
                            >
                                <option value="">All Assignees</option>
                                {Array.from(new Set(tasks.flatMap(t => t.assignees?.map(a => JSON.stringify({ id: a.id, name: a.full_name || a.email, status: (a as any).status })) || [])))
                                    .map(str => JSON.parse(str))
                                    .filter((assignee: any) => assignee.status !== 'inactive')
                                    .map((assignee: any) => (
                                        <option key={assignee.id} value={assignee.id}>{assignee.name}</option>
                                    ))
                                }
                            </select>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-secondary)' }}>Content Type</label>
                            <select
                                value={contentTypeFilter}
                                onChange={(e) => setContentTypeFilter(e.target.value)}
                                style={{
                                    padding: '0.5rem',
                                    borderRadius: '6px',
                                    border: '1px solid var(--border-color)',
                                    background: 'var(--bg-tertiary)',
                                    color: 'var(--text-primary)',
                                    outline: 'none',
                                    fontSize: '0.875rem',
                                    minWidth: '150px'
                                }}
                            >
                                <option value="">All Types</option>
                                {['Static', 'Video', 'Reel', 'Shooting'].map(type => (
                                    <option key={type} value={type}>{type}</option>
                                ))}
                            </select>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-secondary)' }}>Start Date</label>
                            <input
                                type="date"
                                value={dateRangeStart}
                                onChange={(e) => setDateRangeStart(e.target.value)}
                                style={{
                                    padding: '0.4rem',
                                    borderRadius: '6px',
                                    border: '1px solid var(--border-color)',
                                    background: 'var(--bg-tertiary)',
                                    color: 'var(--text-primary)',
                                    outline: 'none',
                                    fontSize: '0.875rem'
                                }}
                            />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-secondary)' }}>End Date</label>
                            <input
                                type="date"
                                value={dateRangeEnd}
                                onChange={(e) => setDateRangeEnd(e.target.value)}
                                style={{
                                    padding: '0.4rem',
                                    borderRadius: '6px',
                                    border: '1px solid var(--border-color)',
                                    background: 'var(--bg-tertiary)',
                                    color: 'var(--text-primary)',
                                    outline: 'none',
                                    fontSize: '0.875rem'
                                }}
                            />
                        </div>

                        {(assigneeFilter || contentTypeFilter || dateRangeStart || dateRangeEnd) && (
                            <button
                                onClick={() => {
                                    setAssigneeFilter('')
                                    setContentTypeFilter('')
                                    setDateRangeStart('')
                                    setDateRangeEnd('')
                                }}
                                style={{
                                    marginTop: '1.25rem',
                                    padding: '0.5rem 1rem',
                                    background: 'transparent',
                                    color: 'var(--accent-color)',
                                    border: 'none',
                                    cursor: 'pointer',
                                    fontSize: '0.875rem',
                                    fontWeight: '500'
                                }}
                            >
                                Clear Filters
                            </button>
                        )}
                    </div>

                )}
            </div>
            <style>
                {`
                    @keyframes slideDown {
                        from { opacity: 0; transform: translateY(-10px); }
                        to { opacity: 1; transform: translateY(0); }
                    }
                `}
            </style>

            {/* View Content */}
            <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

                {/* LIST VIEW */}
                {viewMode === 'list' && (
                    <div style={{
                        flex: 1,
                        background: 'var(--bg-secondary)',
                        borderRadius: '8px',
                        border: '1px solid var(--border-color)',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column'
                    }}>
                        {/* Table Header */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: '150px 150px 1fr 200px 150px 50px',
                            padding: '0.75rem 1.5rem',
                            borderBottom: '1px solid var(--border-color)',
                            background: 'var(--bg-tertiary)',
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            color: 'var(--text-secondary)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em'
                        }}>
                            <div>Start Date</div>
                            <div>Client</div>
                            <div>Content Title</div>
                            <div>Designer</div>
                            <div>Status</div>
                            <div></div>
                        </div>

                        {/* Table Body */}
                        <div style={{ overflowY: 'auto', flex: 1 }}>
                            {loading ? (
                                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading tasks...</div>
                            ) : filteredTasks.length === 0 ? (
                                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No tasks found.</div>
                            ) : (
                                filteredTasks.map(task => (
                                    <div key={task.id} style={{
                                        display: 'grid',
                                        gridTemplateColumns: '150px 150px 1fr 200px 150px 50px',
                                        padding: '1rem 1.5rem',
                                        borderBottom: '1px solid var(--border-color)',
                                        alignItems: 'center',
                                        transition: 'background 0.2s',
                                        cursor: 'pointer'
                                    }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-tertiary)'}
                                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                    >
                                        <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                                            {task.start_date ? new Date(task.start_date).toLocaleDateString() : '-'}
                                        </div>
                                        <div>
                                            <span style={{
                                                padding: '0.2rem 0.5rem',
                                                fontWeight: '500',
                                                ...getClientColor(task.client?.name || '')
                                            }}>
                                                {task.client?.name || 'Unknown'}
                                            </span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: '500' }}>
                                            {getTypeIcon(task.content_type)}
                                            {task.title}
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                            {task.assignees && task.assignees.length > 0 ? (
                                                task.assignees.map((assignee: any) => (
                                                    <div key={assignee.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                        <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.65rem', boxShadow: 'none' }}>
                                                            {(assignee.full_name || assignee.email || 'U')[0].toUpperCase()}
                                                        </div>
                                                        <span style={{ fontSize: '0.875rem' }}>{assignee.full_name || assignee.email}</span>
                                                    </div>
                                                ))
                                            ) : (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280', fontSize: '0.65rem' }}>
                                                        U
                                                    </div>
                                                    <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Unassigned</span>
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <span style={{
                                                padding: '0.2rem 0.6rem',
                                                borderRadius: '12px',
                                                fontSize: '0.75rem',
                                                fontWeight: '500',
                                                background: 'transparent',
                                                border: '1px solid rgba(255, 255, 255, 0.2)',
                                                ...(() => {
                                                    const label = task.status?.label || 'Unknown'
                                                    const l = label.toLowerCase()

                                                    if (l.includes('done') || l.includes('complete')) {
                                                        return { color: '#4ade80', borderColor: 'rgba(74, 222, 128, 0.4)' } // Green
                                                    }
                                                    if (l.includes('progress') || l.includes('going') || l.includes('review') || l.includes('shoot')) {
                                                        return { color: '#facc15', borderColor: 'rgba(250, 204, 21, 0.4)' } // Yellow
                                                    }
                                                    // Default / To Do
                                                    return { color: '#f87171', borderColor: 'rgba(248, 113, 113, 0.4)' } // Red
                                                })()
                                            }}>
                                                {task.status?.label || 'No Status'}
                                            </span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                            {(task.comments_count || 0) > 0 && (
                                                <div title={`${task.comments_count} comments`} style={{ display: 'flex', alignItems: 'center', gap: '2px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                                    <MessageSquare size={14} />
                                                    <span>{task.comments_count}</span>
                                                </div>
                                            )}
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    handleShare(task)
                                                }}
                                                title="Share Task"
                                                style={{ padding: '0.25rem', color: 'var(--text-secondary)', background: 'transparent', border: 'none', cursor: 'pointer' }}
                                            >
                                                <Share2 size={16} />
                                            </button>

                                            <div style={{ position: 'relative' }}>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        setActiveOpenMenuId(activeOpenMenuId === task.id ? null : task.id)
                                                    }}
                                                    style={{ padding: '0.25rem', color: 'var(--text-secondary)', background: 'transparent', border: 'none', cursor: 'pointer' }}
                                                >
                                                    <MoreHorizontal size={16} />
                                                </button>

                                                {activeOpenMenuId === task.id && (
                                                    <div style={{
                                                        position: 'absolute',
                                                        right: 0,
                                                        top: '100%',
                                                        background: 'var(--bg-secondary)', // Use theme bg
                                                        border: '1px solid var(--border-color)',
                                                        borderRadius: '8px',
                                                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                                        zIndex: 50,
                                                        minWidth: '120px',
                                                        overflow: 'hidden'
                                                    }}>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                handleEdit(task)
                                                            }}
                                                            style={{
                                                                display: 'block',
                                                                width: '100%',
                                                                textAlign: 'left',
                                                                padding: '0.5rem 1rem',
                                                                border: 'none',
                                                                background: 'transparent', // Transparent to show container bg
                                                                cursor: 'pointer',
                                                                fontSize: '0.875rem',
                                                                color: 'var(--text-primary)' // Use theme text
                                                            }}
                                                            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-tertiary)'}
                                                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                                        >
                                                            Edit
                                                        </button>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                handleDelete(task.id)
                                                            }}
                                                            style={{
                                                                display: 'block',
                                                                width: '100%',
                                                                textAlign: 'left',
                                                                padding: '0.5rem 1rem',
                                                                border: 'none',
                                                                background: 'transparent',
                                                                cursor: 'pointer',
                                                                fontSize: '0.875rem',
                                                                color: 'var(--danger-color)'
                                                            }}
                                                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
                                                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                                        >
                                                            Delete
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}

                {/* BOARD VIEW */}
                {viewMode === 'board' && (
                    <DragDropContext onDragEnd={handleDragEnd}>
                        <div style={{ flex: 1, overflowX: 'auto', overflowY: 'hidden', display: 'flex', gap: '1rem', paddingBottom: '0.5rem' }}>
                            {taskStatuses.map(status => {
                                // Match by Label instead of ID to merge duplicates visually
                                const columnTasks = filteredTasks.filter(t => t.status?.label === status.label)

                                return (
                                    <Droppable key={status.id} droppableId={status.id}>
                                        {(provided, snapshot) => (
                                            <div
                                                ref={provided.innerRef}
                                                {...provided.droppableProps}
                                                style={{
                                                    width: '280px', flexShrink: 0, display: 'flex', flexDirection: 'column',
                                                    background: snapshot.isDraggingOver ? 'var(--bg-tertiary)' : 'var(--bg-secondary)',
                                                    borderRadius: '12px', border: '1px solid var(--border-color)', maxHeight: '100%'
                                                }}
                                            >
                                                <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <h3 style={{ fontSize: '0.875rem', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>{status.label}</h3>
                                                    <span style={{ fontSize: '0.75rem', background: 'var(--bg-tertiary)', padding: '0.1rem 0.4rem', borderRadius: '10px' }}>{columnTasks.length}</span>
                                                </div>
                                                <div style={{ padding: '0.75rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem', minHeight: '100px' }}>
                                                    {columnTasks.map((task, index) => (
                                                        <Draggable key={task.id} draggableId={task.id} index={index}>
                                                            {(provided, snapshot) => (
                                                                <div
                                                                    ref={provided.innerRef}
                                                                    {...provided.draggableProps}
                                                                    {...provided.dragHandleProps}
                                                                    style={{
                                                                        background: 'var(--sidebar-bg)', padding: '0.75rem', borderRadius: '8px',
                                                                        boxShadow: snapshot.isDragging ? '0 5px 10px rgba(0,0,0,0.1)' : '0 1px 2px rgba(0,0,0,0.05)',
                                                                        border: '1px solid var(--border-color)',
                                                                        display: 'flex', flexDirection: 'column', gap: '0.5rem',
                                                                        ...provided.draggableProps.style
                                                                    }}
                                                                >
                                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                                                                        <span style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem', borderRadius: '4px', ...getClientColor(task.client?.name || '') }}>{task.client?.name}</span>
                                                                        {getTypeIcon(task.content_type)}
                                                                    </div>
                                                                    <div style={{ fontWeight: '500', fontSize: '0.875rem', lineHeight: '1.3' }}>{task.title}</div>
                                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.25rem' }}>
                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                                                            <Clock size={12} />
                                                                            <span>{task.start_date ? format(new Date(task.start_date), 'MMM d') : '-'}</span>
                                                                        </div>
                                                                        <div title={task.assignee?.full_name || task.assignee?.email} style={{ width: 22, height: 22, borderRadius: '50%', background: '#3b82f6', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem' }}>
                                                                            {(task.assignee?.full_name || task.assignee?.email || 'U')[0].toUpperCase()}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </Draggable>
                                                    ))}
                                                    {provided.placeholder}
                                                </div>
                                            </div>
                                        )}
                                    </Droppable>
                                )
                            })}

                            {/* Add New Status Column */}
                            <div style={{ width: '280px', flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
                                {isAddingStatus ? (
                                    <div style={{ background: 'var(--bg-secondary)', borderRadius: '12px', padding: '1rem', border: '1px solid var(--border-color)' }}>
                                        <input
                                            autoFocus
                                            type="text"
                                            value={newStatusName}
                                            onChange={(e) => setNewStatusName(e.target.value)}
                                            placeholder="Status Name"
                                            style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border-color)', marginBottom: '0.5rem' }}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') handleCreateStatus()
                                                if (e.key === 'Escape') setIsAddingStatus(false)
                                            }}
                                        />
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <button onClick={handleCreateStatus} style={{ flex: 1, padding: '0.5rem', background: '#3b82f6', color: 'white', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '0.875rem' }}>Add</button>
                                            <button onClick={() => setIsAddingStatus(false)} style={{ flex: 1, padding: '0.5rem', background: 'transparent', color: 'var(--text-secondary)', borderRadius: '6px', border: '1px solid var(--border-color)', cursor: 'pointer', fontSize: '0.875rem' }}>Cancel</button>
                                        </div>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => setIsAddingStatus(true)}
                                        style={{
                                            width: '100%',
                                            height: '50px',
                                            background: 'transparent',
                                            border: '2px dashed var(--border-color)',
                                            borderRadius: '12px',
                                            color: 'var(--text-secondary)',
                                            fontWeight: '600',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '0.5rem',
                                            transition: 'all 0.2s',
                                        }}
                                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.color = '#3b82f6' }}
                                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.color = 'var(--text-secondary)' }}
                                    >
                                        <Plus size={20} /> Add Status
                                    </button>
                                )}
                            </div>
                        </div>
                    </DragDropContext>
                )}

                {/* CALENDAR VIEW */}
                {viewMode === 'calendar' && (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
                        {/* Calendar Controls */}
                        <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h2 style={{ fontSize: '1.1rem', fontWeight: '600' }}>{format(currentDate, 'MMMM yyyy')}</h2>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} style={{ padding: '0.4rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'transparent', cursor: 'pointer', color: 'var(--text-primary)' }}><ChevronLeft size={16} /></button>
                                <button onClick={() => setCurrentDate(new Date())} style={{ padding: '0.4rem 0.8rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'transparent', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-primary)' }}>Today</button>
                                <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} style={{ padding: '0.4rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'transparent', cursor: 'pointer', color: 'var(--text-primary)' }}><ChevronRight size={16} /></button>
                            </div>
                        </div>

                        {/* Calendar Grid */}
                        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gridTemplateRows: '30px 1fr', overflow: 'hidden' }}>
                            {/* Days Header */}
                            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                                <div key={d} style={{ borderBottom: '1px solid var(--border-color)', borderRight: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-secondary)', background: 'var(--bg-tertiary)' }}>{d}</div>
                            ))}

                            {/* Days Cells */}
                            <div style={{ gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gridAutoRows: '1fr', overflowY: 'auto' }}>
                                {(() => {
                                    const monthStart = startOfMonth(currentDate);
                                    const monthEnd = endOfMonth(monthStart);
                                    const startDate = startOfWeek(monthStart);
                                    const endDate = endOfWeek(monthEnd);
                                    const days = eachDayOfInterval({ start: startDate, end: endDate });

                                    return days.map(day => {
                                        const isCurrentMonth = day.getMonth() === monthStart.getMonth();
                                        const dayTasks = filteredTasks.filter(t => t.start_date && isSameDay(parseISO(t.start_date), day));

                                        return (
                                            <div key={day.toString()} style={{
                                                minHeight: '100px',
                                                borderRight: '1px solid var(--border-color)',
                                                borderBottom: '1px solid var(--border-color)',
                                                padding: '0.5rem',
                                                background: isCurrentMonth ? 'var(--bg-secondary)' : 'var(--bg-tertiary)',
                                                opacity: isCurrentMonth ? 1 : 0.5
                                            }}>
                                                <div style={{ textAlign: 'right', fontSize: '0.75rem', marginBottom: '0.25rem', fontWeight: isSameDay(day, new Date()) ? 'bold' : 'normal', color: isSameDay(day, new Date()) ? '#3b82f6' : 'inherit' }}>
                                                    {format(day, 'd')}
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                                    {dayTasks.map(t => (
                                                        <div key={t.id} style={{ fontSize: '0.7rem', padding: '0.2rem 0.4rem', borderRadius: '4px', background: 'var(--bg-tertiary)', borderLeft: '2px solid #ec4899', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', cursor: 'pointer', marginBottom: '2px', boxShadow: '0 1px 2px rgba(0,0,0,0.1)' }} title={t.title}>
                                                            <span style={{
                                                                background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
                                                                WebkitBackgroundClip: 'text',
                                                                WebkitTextFillColor: 'transparent',
                                                                fontWeight: '600'
                                                            }}>
                                                                {t.title}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    });
                                })()}
                            </div>
                        </div>
                    </div>
                )}

            </div>

            {/* Task Modal - Updated with taskToEdit */}
            <CreativeTaskModal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false)
                    setTaskToEdit(null)
                }}
                onTaskCreated={() => {
                    fetchTasks()
                    setTaskToEdit(null)
                }}
                taskToEdit={taskToEdit}
            />
        </div>
    )
}
