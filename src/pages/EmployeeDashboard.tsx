import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { LayoutGrid, List, LogOut, Moon, Sun, CheckCircle2, User, Calendar, Flag, BarChart2, Phone } from 'lucide-react'
import KanbanBoard from '../components/KanbanBoard'
import TaskDetailsModal from '../components/TaskDetailsModal'
import NotificationCenter from '../components/NotificationCenter'
import TaskCalendar from '../components/TaskCalendar'
import TaskChart from '../components/TaskChart'
import EmployeeAnalyticsModal from '../components/EmployeeAnalyticsModal'
import EmployeeProfile from '../components/EmployeeProfile'
import Meetings from '../components/Meetings'

export default function EmployeeDashboard() {
    const { user, signOut } = useAuth()
    const { theme, toggleTheme } = useTheme()
    const [tasks, setTasks] = useState<any[]>([])
    const [statuses, setStatuses] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [viewMode, setViewMode] = useState<'list' | 'board' | 'calendar' | 'chart' | 'profile' | 'meetings'>('list')
    const [selectedTask, setSelectedTask] = useState<any>(null)
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false)
    const [isReportModalOpen, setIsReportModalOpen] = useState(false)
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
    const [userName, setUserName] = useState<string>('')
    const [currentTime, setCurrentTime] = useState(new Date())

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000)
        return () => clearInterval(timer)
    }, [])

    useEffect(() => {
        if (user) {
            fetchAvatar()
        }
    }, [user, viewMode]) // Reload avatar when viewMode changes (in case profile updated)

    const fetchAvatar = async () => {
        try {
            const { data } = await supabase
                .from('profiles')
                .select('avatar_url, full_name')
                .eq('id', user?.id)
                .single()

            if (data) {
                if (data.avatar_url) setAvatarUrl(data.avatar_url)
                if (data.full_name) setUserName(data.full_name)
            }
        } catch (error) {
            console.error('Error fetching profile:', error)
        }
    }

    useEffect(() => {
        const handleNavigation = (e: any) => {
            const view = e.detail.view
            if (view === 'dashboard' || view === 'tasks') setViewMode('list')
            else if (view === 'meetings') setViewMode('meetings')
            else if (view === 'profile') setViewMode('profile')
        }

        window.addEventListener('dashboard-navigate', handleNavigation)
        return () => window.removeEventListener('dashboard-navigate', handleNavigation)
    }, [])

    useEffect(() => {
        loadData()
        cleanupDuplicates()

        const taskSubscription = supabase
            .channel('employee_dashboard_tasks')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {
                loadData()
            })
            .subscribe()

        return () => {
            taskSubscription.unsubscribe()
        }
    }, [user])

    const cleanupDuplicates = async () => {
        if (!user) return

        const { data: notifs } = await supabase
            .from('notifications')
            .select('id, title, created_at')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })

        if (!notifs) return

        const seenTitles = new Set()
        const idsToDelete: string[] = []

        for (const n of notifs) {
            if (seenTitles.has(n.title)) {
                idsToDelete.push(n.id)
            } else {
                seenTitles.add(n.title)
            }
        }

        if (idsToDelete.length > 0) {
            await supabase
                .from('notifications')
                .delete()
                .in('id', idsToDelete)
        }
    }

    const loadData = async () => {
        if (!user) return

        try {
            // 1. Get assignments for current user
            const { data: assignments, error: assignError } = await supabase
                .from('task_assignments')
                .select('task_id')
                .eq('user_id', user.id)

            if (assignError) throw assignError

            const taskIds = assignments?.map(a => a.task_id) || []

            // 2. Get Tasks - Fetch tasks where user is assigned directly OR via task_assignments
            let query = supabase
                .from('tasks')
                .select(`
                    *,
                    assignments:task_assignments(
                        user_id,
                        user:profiles(full_name, email)
                    ),
                    creator:profiles!created_by(full_name)
                `)
                .order('created_at', { ascending: false })

            if (taskIds.length > 0) {
                query = query.or(`assigned_to.eq.${user.id},id.in.(${taskIds.join(',')})`)
            } else {
                query = query.eq('assigned_to', user.id)
            }

            const { data: tasksData, error: tasksError } = await query

            if (tasksError) throw tasksError

            // 3. Get Statuses
            const branchIds = [...new Set(tasksData?.map(t => t.department_id) || [])]
            let fetchedStatuses: any[] = []

            if (branchIds.length > 0) {
                const { data: statusesData } = await supabase
                    .from('task_statuses')
                    .select('*')
                    .in('department_id', branchIds)
                    .order('position')

                fetchedStatuses = statusesData || []
                setStatuses(fetchedStatuses)
            }

            setTasks(tasksData || [])

            // Update selected task if it exists to keep it in sync
            if (selectedTask) {
                const updatedSelectedTask = tasksData?.find(t => t.id === selectedTask.id)
                if (updatedSelectedTask) {
                    setSelectedTask(updatedSelectedTask)
                }
            }

            checkUpcomingTasks(tasksData || [], fetchedStatuses)
        } catch (error) {
            console.error('Error loading tasks:', error)
        } finally {
            setLoading(false)
        }
    }

    const createNotification = async (title: string, message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
        if (!user) return
        await supabase.from('notifications').insert({
            user_id: user.id,
            title,
            message,
            type
        })
    }

    const isCheckingRef = useRef(false)

    const checkUpcomingTasks = async (currentTasks: any[], currentStatuses: any[]) => {
        if (!user || isCheckingRef.current) return
        isCheckingRef.current = true

        try {
            for (const task of currentTasks) {
                // Find status label from passed currentStatuses array
                const status = currentStatuses.find(s => s.id === task.status_id)
                const label = status?.label?.toLowerCase() || ''

                // Comprehensive check for completed statuses
                if (label.includes('done') || label.includes('complete') || label.includes('finish') || label.includes('success') || label.includes('closed')) {
                    continue
                }

                if (!task.due_date) continue

                const dueDate = new Date(task.due_date)
                const today = new Date()
                const tomorrow = new Date(today)
                tomorrow.setDate(tomorrow.getDate() + 1)

                // Reset hours for date comparison
                dueDate.setHours(0, 0, 0, 0)
                today.setHours(0, 0, 0, 0)
                tomorrow.setHours(0, 0, 0, 0)

                let notificationTitle = ''
                let notificationMessage = ''
                let type: 'info' | 'warning' | 'error' = 'info'

                if (dueDate.getTime() < today.getTime()) {
                    // Overdue
                    notificationTitle = `Task Overdue: ${task.title}`
                    notificationMessage = `The task "${task.title}" was due on ${dueDate.toLocaleDateString()}.`
                    type = 'error'
                } else if (dueDate.getTime() === today.getTime()) {
                    // Due Today
                    notificationTitle = `Task Due Today: ${task.title}`
                    notificationMessage = `The task "${task.title}" is due today.`
                    type = 'warning'
                } else if (dueDate.getTime() === tomorrow.getTime()) {
                    // Due Tomorrow
                    notificationTitle = `Task Due Tomorrow: ${task.title}`
                    notificationMessage = `The task "${task.title}" is due tomorrow.`
                    type = 'info'
                }

                if (notificationTitle) {
                    // Check if notification already exists to avoid duplicates
                    const { data: existing } = await supabase
                        .from('notifications')
                        .select('id')
                        .eq('user_id', user.id)
                        .eq('title', notificationTitle)
                        .limit(1)

                    if (!existing || existing.length === 0) {
                        await createNotification(notificationTitle, notificationMessage, type)
                    }
                }
            }
        } finally {
            isCheckingRef.current = false
        }
    }

    const handleUpdateTaskStatus = async (taskId: string, newStatusLabel: string) => {
        const task = tasks.find(t => t.id === taskId)
        if (!task) return

        let newStatus = statuses.find(s =>
            s.department_id === task.department_id &&
            (s.id === newStatusLabel || s.label === newStatusLabel)
        )

        // Fallback
        if (!newStatus) {
            newStatus = statuses.find(s => s.id === newStatusLabel || s.label === newStatusLabel)
        }

        if (!newStatus) return

        // Optimistic update
        setTasks(prev => prev.map(t =>
            t.id === taskId ? { ...t, status_id: newStatus.id } : t
        ))

        const { error } = await supabase
            .from('tasks')
            .update({ status_id: newStatus.id })
            .eq('id', taskId)

        if (error) {
            console.error('Error updating status:', error)
            loadData()
        }
    }

    const handleSignOut = async () => {
        try {
            await signOut()
        } catch (error) {
            console.error('Error signing out:', error)
        }
    }

    // Glassmorphism Styles
    const glassCardStyle = {
        background: 'var(--bg-secondary)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: 'var(--glass-border)',
        boxShadow: 'none',
        borderRadius: 'var(--radius-lg)',
    }

    const glassButtonStyle = (active: boolean) => ({
        padding: '0.6rem 1.2rem',
        borderRadius: 'var(--radius-md)',
        background: active ? 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)' : 'var(--bg-tertiary)',
        color: active ? 'white' : 'var(--text-secondary)',
        border: active ? 'none' : 'var(--glass-border)',
        backdropFilter: 'blur(4px)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        fontSize: '0.9rem',
        fontWeight: '600',
        transition: 'all 0.3s ease',
        boxShadow: 'none'
    })

    return (
        <div style={{ minHeight: '100vh', paddingBottom: '2rem', transition: 'background-color 0.3s, color 0.3s' }}>
            {/* Header */}
            <header style={{
                background: 'var(--glass-bg)',
                backdropFilter: 'blur(16px)',
                borderBottom: 'var(--glass-border)',
                padding: '1rem 2rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                position: 'sticky',
                top: 0,
                zIndex: 40,
                marginBottom: '2rem'
            }}>
                <div
                    onClick={() => setViewMode('profile')}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1rem',
                        cursor: 'pointer',
                        transition: 'opacity 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
                    onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                >
                    <div style={{
                        width: 48,
                        height: 48,
                        background: avatarUrl ? `url(${avatarUrl}) center/cover no-repeat` : 'linear-gradient(135deg, #6366f1, #ec4899)',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontWeight: 'bold',
                        boxShadow: 'none',
                        border: '2px solid rgba(255, 255, 255, 0.2)'
                    }}>
                        {!avatarUrl && 'WD'}
                    </div>
                    <div>
                        <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: '800', lineHeight: '1.2', letterSpacing: '-0.5px' }}>
                            Welcome back, <span className="text-gradient" style={{ background: 'linear-gradient(to right, #ec4899, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{userName || user?.email}</span>
                        </h1>
                        <div style={{
                            fontSize: '0.85rem',
                            fontWeight: '600',
                            marginTop: '0.25rem',
                            background: 'linear-gradient(to right, #ec4899, #8b5cf6)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            width: 'fit-content'
                        }}>
                            {currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} • {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <NotificationCenter />

                    <button
                        onClick={toggleTheme}
                        style={{
                            padding: '0.75rem',
                            borderRadius: '12px',
                            border: 'var(--glass-border)',
                            background: 'var(--bg-tertiary)',
                            color: 'var(--text-secondary)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s'
                        }}
                    >
                        {theme === 'dark' ? <Moon size={20} /> : <Sun size={20} />}
                    </button>

                    <button
                        onClick={handleSignOut}
                        style={{
                            padding: '0.75rem 1.5rem',
                            border: 'var(--glass-border)',
                            borderRadius: '12px',
                            background: 'rgba(239, 68, 68, 0.1)',
                            color: 'var(--danger-color)',
                            fontWeight: '600',
                            fontSize: '0.9rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            transition: 'all 0.2s'
                        }}
                    >
                        <LogOut size={16} /> Sign Out
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <main style={{ padding: '0 2rem', maxWidth: '1600px', margin: '0 auto' }}>

                {/* Stats / Welcome Widget */}
                <div style={{
                    background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 50%, #ec4899 100%)',
                    borderRadius: '2rem',
                    padding: '3rem',
                    marginBottom: '3rem',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    boxShadow: 'none',
                    position: 'relative',
                    overflow: 'hidden'
                }}>
                    <div style={{ position: 'relative', zIndex: 1 }}>
                        <h2 style={{ fontSize: '2.5rem', fontWeight: '800', marginBottom: '1rem', letterSpacing: '-0.02em' }}>Your Tasks Overview</h2>
                        <p style={{ fontSize: '1.1rem', opacity: 0.9, maxWidth: '600px', lineHeight: 1.6 }}>
                            You currently have <strong style={{ color: 'white', textDecoration: 'underline decoration-wavy' }}>{tasks.length} tasks</strong> assigned to you across {new Set(tasks.map(t => t.department_id)).size} departments.
                            Stay productive and keep building!
                        </p>
                        <button
                            onClick={() => setIsReportModalOpen(true)}
                            style={{
                                marginTop: '2rem',
                                padding: '1rem 2rem',
                                background: 'white',
                                color: '#6366f1',
                                borderRadius: '1rem',
                                border: 'none',
                                fontWeight: '700',
                                cursor: 'pointer',
                                boxShadow: 'none'
                            }}>
                            View Report
                        </button>
                    </div>
                </div>

                {/* Toolbar */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: '700' }} className="text-gradient">Assigned Tasks</h2>

                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <button
                            onClick={() => setViewMode('list')}
                            style={glassButtonStyle(viewMode === 'list')}
                        >
                            <List size={18} /> List
                        </button>
                        <button
                            onClick={() => setViewMode('board')}
                            style={glassButtonStyle(viewMode === 'board')}
                        >
                            <LayoutGrid size={18} /> Board
                        </button>
                        <button
                            onClick={() => setViewMode('calendar')}
                            style={glassButtonStyle(viewMode === 'calendar')}
                        >
                            <Calendar size={18} /> Calendar
                        </button>
                        <button
                            onClick={() => setViewMode('chart')}
                            style={glassButtonStyle(viewMode === 'chart')}
                        >
                            <BarChart2 size={18} /> Chart
                        </button>
                        <button
                            onClick={() => setViewMode('meetings')}
                            style={glassButtonStyle(viewMode === 'meetings')}
                        >
                            <Phone size={18} /> Meetings
                        </button>
                    </div>
                </div>

                {/* Task View */}
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)' }}>Loading your tasks...</div>
                ) : viewMode === 'profile' ? (
                    <EmployeeProfile />
                ) : viewMode === 'meetings' ? (
                    <div style={{ padding: '2rem', overflowY: 'auto', height: '100%' }}>
                        <Meetings filterByParticipant={true} />
                    </div>
                ) : tasks.length === 0 ? (
                    <div style={{
                        ...glassCardStyle,
                        padding: '4rem',
                        textAlign: 'center'
                    }}>
                        <CheckCircle2 size={64} style={{ color: 'var(--accent-color)', marginBottom: '1.5rem', opacity: 0.5 }} />
                        <h3 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '0.5rem' }} className="text-gradient">All Caught Up!</h3>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>You have no pending tasks assigned to you.</p>
                    </div>
                ) : viewMode === 'board' ? (
                    <div style={{ ...glassCardStyle, backdropFilter: 'none', WebkitBackdropFilter: 'none', height: '700px', overflow: 'hidden' }}>
                        <KanbanBoard
                            tasks={tasks}
                            statuses={statuses}
                            onUpdateTaskStatus={handleUpdateTaskStatus}
                            onEdit={(task) => {
                                setSelectedTask(task)
                                setIsTaskModalOpen(true)
                            }}
                            onDelete={() => { }}
                            onAddStatus={() => { }}
                            onReorderStatus={() => { }}
                            onDeleteStatus={() => { }}
                            groupByLabel={true}
                        />
                    </div>
                ) : viewMode === 'calendar' ? (
                    <div style={glassCardStyle}>
                        <TaskCalendar
                            tasks={tasks}
                            onEdit={(task) => {
                                setSelectedTask(task)
                                setIsTaskModalOpen(true)
                            }}
                        />
                    </div>
                ) : viewMode === 'chart' ? (
                    <div style={glassCardStyle}>
                        <TaskChart
                            tasks={tasks}
                            statuses={statuses}
                        />
                    </div>
                ) : (
                    <div style={{ display: 'grid', gap: '1.5rem' }}>
                        {tasks.map(task => {
                            const status = statuses.find(s => s.id === task.status_id)
                            return (
                                <div
                                    key={task.id}
                                    onClick={() => {
                                        setSelectedTask(task)
                                        setIsTaskModalOpen(true)
                                    }}
                                    style={{
                                        ...glassCardStyle,
                                        padding: '1.5rem',
                                        cursor: 'pointer',
                                        transition: 'transform 0.3s, box-shadow 0.3s',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.transform = 'translateY(-4px)'
                                        e.currentTarget.style.boxShadow = 'none'
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.transform = 'translateY(0)'
                                        e.currentTarget.style.boxShadow = 'none'
                                    }}
                                >
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem' }}>
                                            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700' }} className="text-gradient">{task.title}</h3>
                                            <span style={{
                                                fontSize: '0.75rem',
                                                padding: '0.35rem 0.8rem',
                                                borderRadius: '2rem',
                                                background: status?.color ? `${status.color}20` : 'var(--bg-tertiary)', // Keep light background tint
                                                color: 'var(--text-primary)', // Use standard text color
                                                fontWeight: '600',
                                                letterSpacing: '0.03em',
                                                border: `1px solid ${status?.color}40`
                                            }}>
                                                <span style={{
                                                    color: (status?.label?.toLowerCase().includes('done') || status?.label?.toLowerCase().includes('complete')) ? '#22c55e' : // Green
                                                        (status?.label?.toLowerCase().includes('progress') || status?.label?.toLowerCase().includes('review')) ? '#eab308' : // Yellow
                                                            '#ef4444' // Red for To Do/Backlog
                                                }}>{status?.label?.toUpperCase() || 'UNKNOWN'}</span>
                                            </span>
                                        </div>
                                        <p style={{ margin: 0, fontSize: '0.95rem', maxWidth: '800px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} className="text-gradient">
                                            {task.description ? task.description.replace(/<[^>]*>/g, '') : 'No description'}
                                        </p>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: '500' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <Flag size={16} />
                                            <span style={{
                                                textTransform: 'capitalize',
                                                color: (task.priority === 'high' ? '#f87171' : // Red
                                                    task.priority === 'medium' ? '#facc15' : // Yellow
                                                        '#4ade80') // Green
                                            }}>{task.priority || 'Medium'}</span>
                                        </div>
                                        {task.due_date && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: new Date(task.due_date) < new Date() ? '#ef4444' : 'var(--text-secondary)' }}>
                                                <Calendar size={16} />
                                                <span>{new Date(task.due_date).toLocaleDateString()}</span>
                                            </div>
                                        )}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <User size={16} />
                                            <span className="text-gradient">{task.assignments?.length || (task.assigned_to ? 1 : 0)}</span>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div >
                )}
            </main >

            <TaskDetailsModal
                isOpen={isTaskModalOpen}
                onClose={() => {
                    setIsTaskModalOpen(false)
                    setSelectedTask(null)
                }}
                task={selectedTask}
                onUpdate={loadData}
            />
            {/* Report Modal */}
            <EmployeeAnalyticsModal
                isOpen={isReportModalOpen}
                onClose={() => setIsReportModalOpen(false)}
                tasks={tasks}
                statuses={statuses}
            />
        </div >
    )
}
