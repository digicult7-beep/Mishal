import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { createClient } from '@supabase/supabase-js'
import Modal from '../components/Modal'
import {
    Users,
    Briefcase,
    Building2,
    UserPlus,
    Plus,

    Pencil,
    Trash2,
    ClipboardList,
    BarChart3,
    Search,
    Sun,
    Moon,
    Eye,
    EyeOff
} from 'lucide-react'
import DepartmentTasksModal from '../components/DepartmentTasksModal'
import DashboardAnalyticsModal from '../components/DashboardAnalyticsModal'
import EmployeeAssignmentModal from '../components/EmployeeAssignmentModal'
import ActivityFeed from '../components/ActivityFeed'
import NotificationCenter from '../components/NotificationCenter'
import ClientSidebar from '../components/ClientSidebar'
import CCProfile from '../components/CCProfile'
import CreativeProgress from '../components/CreativeProgress'
import TasksTracker from '../components/TasksTracker'
import Meetings from '../components/Meetings'
import EmployeeGallery from '../components/EmployeeGallery'
import EmployeeTasksModal from '../components/EmployeeTasksModal'


interface Profile {
    id: string
    email: string
    full_name: string
    role: 'admin' | 'client_coordinator' | 'employee'
    avatar_url?: string
}

interface Client {
    id: string
    name: string
    cc_id: string
    created_at: string
}



interface Department {
    id: string
    workspace_id: string
    name: string
    created_at: string
}

interface Employee {
    id: string
    email: string
    full_name: string
    created_at: string
    status?: 'active' | 'inactive'
    created_by?: string
    avatar_url?: string
    task_count?: number
}

export default function CCDashboard() {
    const { user, signOut } = useAuth()
    const { theme, toggleTheme } = useTheme()
    const [profile, setProfile] = useState<Profile | null>(null)
    const [clients, setClients] = useState<Client[]>([])
    const [selectedClient, setSelectedClient] = useState<string | null>(null)

    const [departments, setDepartments] = useState<Department[]>([])
    const [employees, setEmployees] = useState<Employee[]>([])
    const [loading, setLoading] = useState(true)
    const [viewMode, setViewMode] = useState<'dashboard' | 'profile' | 'creative-progress' | 'tasks-tracker' | 'meetings' | 'employees'>('dashboard')

    // Form states
    const [showAddClient, setShowAddClient] = useState(false)

    const [showAddDepartment, setShowAddDepartment] = useState(false)
    const [showAddEmployee, setShowAddEmployee] = useState(false)
    const [showEmployeeTasks, setShowEmployeeTasks] = useState(false)
    const [selectedEmployeeForTasks, setSelectedEmployeeForTasks] = useState<{ id: string, name: string } | null>(null)

    const [clientName, setClientName] = useState('')

    const [departmentName, setDepartmentName] = useState('')
    const [empFullName, setEmpFullName] = useState('')
    const [empEmail, setEmpEmail] = useState('')
    const [empPassword, setEmpPassword] = useState('')

    const [showPassword, setShowPassword] = useState(false) // State for password visibility
    const [error, setError] = useState<string | null>(null)

    // Department-Employee Assignment states
    const [showAssignEmployees, setShowAssignEmployees] = useState(false)
    const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null)
    const [departmentEmployees, setDepartmentEmployees] = useState<{ [key: string]: Employee[] }>({})
    const [assignedEmployeeIds, setAssignedEmployeeIds] = useState<Set<string>>(new Set())
    const [showDepartmentTasks, setShowDepartmentTasks] = useState(false)
    const [showAnalytics, setShowAnalytics] = useState(false)
    const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null)
    const [editingClient, setEditingClient] = useState<Client | null>(null)

    const [editingDepartment, setEditingDepartment] = useState<Department | null>(null)

    const handleSignOut = async () => {
        try {
            await signOut()
        } catch (error) {
            console.error('Error signing out:', error)
        }
    }
    const [searchTerm, setSearchTerm] = useState('')

    // Event Listener for Command Palette Navigation
    useEffect(() => {
        const handleNavigation = (e: any) => {
            const view = e.detail.view
            if (view === 'dashboard') setViewMode('dashboard')
            else if (view === 'tasks') setViewMode('tasks-tracker')
            else if (view === 'meetings') setViewMode('meetings')
            else if (view === 'profile') setViewMode('profile')
        }

        window.addEventListener('dashboard-navigate', handleNavigation)
        return () => window.removeEventListener('dashboard-navigate', handleNavigation)
    }, [])
    useEffect(() => {
        loadProfile()
        loadClients()
        loadEmployees()
        cleanupDuplicates().then(() => {
            checkOverdueTasks()
        })
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

    const checkOverdueTasks = async () => {
        if (!user) return

        try {
            // 1. Get all tasks for this CC's clients -> workspaces -> departments
            const { data: tasks, error } = await supabase
                .from('tasks')
                .select(`
                    id,
                    title,
                    due_date,
                    status_id,
                    assigned_to,
                    department:departments!inner(
                        workspace:workspaces!inner(
                            client:clients!inner(
                                cc_id
                            )
                        )
                    ),
                    status:task_statuses(label),
                    assignee:profiles!tasks_assigned_to_fkey(full_name)
                `)
                .eq('department.workspace.client.cc_id', user.id)
                .lt('due_date', new Date().toISOString())

            if (error) throw error

            if (tasks && tasks.length > 0) {
                // 2. Filter out completed tasks
                const overdueTasks = tasks.filter((task: any) => {
                    const statusLabel = task.status?.label?.toLowerCase() || ''
                    return !statusLabel.includes('done') && !statusLabel.includes('complete') && !statusLabel.includes('finish')
                })

                // 3. Check and create notifications
                for (const task of overdueTasks) {
                    const notificationTitle = `Task Overdue: ${task.title}`

                    // Get employees assigned to THIS overdue task
                    // We fetch profiles directly for the assigned users
                    const { data: taskAssignments } = await supabase
                        .from('task_assignments')
                        .select('user_id')
                        .eq('task_id', task.id)

                    const assignedIds = taskAssignments?.map(a => a.user_id) || []
                    let assignedNames = ''

                    if (assignedIds.length > 0) {
                        const { data: profiles } = await supabase
                            .from('profiles')
                            .select('full_name')
                            .in('id', assignedIds)
                            .order('full_name', { ascending: true })

                        if (profiles) {
                            assignedNames = profiles.map(p => p.full_name).join(', ')
                        }
                    }

                    const dueDate = new Date(task.due_date).toLocaleDateString()

                    let message = `The task "${task.title}" was due on ${dueDate}.`
                    if (assignedNames) {
                        message += ` Assigned to: ${assignedNames}`
                    } else {
                        message += ` No employees assigned.`
                    }

                    // Check if notification already exists
                    const { data: existingData } = await supabase
                        .from('notifications')
                        .select('id, message')
                        .eq('user_id', user.id)
                        .eq('title', notificationTitle)
                        .limit(1)

                    const existing = existingData?.[0]

                    if (!existing) {
                        await createNotification(
                            notificationTitle,
                            message,
                            'warning'
                        )
                    } else if (existing.message !== message) {
                        // Update existing notification if message has changed (e.g. employees assigned)
                        // Do NOT mark as unread to avoid repeating alerts
                        await supabase
                            .from('notifications')
                            .update({ message: message })
                            .eq('id', existing.id)
                    }
                }
            }
        } catch (error) {
            console.error('Error checking overdue tasks:', error)
        }
    }

    useEffect(() => {
        if (selectedClient) {
            loadClientDepartments(selectedClient)
        }
    }, [selectedClient])

    // Removed the selectedWorkspace dependency useEffect since we load all departments for the client now

    const loadProfile = async () => {
        if (!user) return
        const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single()
        setProfile(data)
        setLoading(false)
    }

    const loadClients = async () => {
        const { data } = await supabase
            .from('clients')
            .select('*')
            .eq('cc_id', user?.id)
            .order('created_at', { ascending: false })
        setClients(data || [])

        // Auto-create demo data if no clients exist
        if (data && data.length === 0 && user) {
            try {
                // 1. Create Client
                const { data: newClient, error: clientError } = await supabase
                    .from('clients')
                    .insert({ name: 'Demo Client', cc_id: user.id })
                    .select()
                    .single()

                if (clientError) throw clientError

                // 2. Create Workspace
                const { data: newWorkspace, error: workspaceError } = await supabase
                    .from('workspaces')
                    .insert({ name: 'General', client_id: newClient.id })
                    .select()
                    .single()

                if (workspaceError) throw workspaceError

                // 3. Create Department
                const { error: deptError } = await supabase
                    .from('departments')
                    .insert({ name: 'Engineering', workspace_id: newWorkspace.id })

                if (deptError) throw deptError

                // Reload clients
                const { data: refreshedClients } = await supabase
                    .from('clients')
                    .select('*')
                    .eq('cc_id', user.id)
                    .order('created_at', { ascending: false })

                setClients(refreshedClients || [])
                createNotification('Welcome!', 'We created a demo client for you to get started.', 'success')

            } catch (err) {
                console.error('Error creating demo data:', err)
            }
        }
    }



    const loadClientDepartments = async (clientId: string) => {
        // 1. Get all workspace IDs for this client
        const { data: workspaceData, error: wsError } = await supabase
            .from('workspaces')
            .select('id')
            .eq('client_id', clientId)

        if (wsError) {
            console.error('Error loading workspaces for departments:', wsError)
            return
        }

        const workspaceIds = workspaceData?.map(ws => ws.id) || []

        if (workspaceIds.length === 0) {
            setDepartments([])
            return
        }

        // 2. Get departments for these workspaces
        const { data, error } = await supabase
            .from('departments')
            .select('*')
            .in('workspace_id', workspaceIds)
            .order('created_at', { ascending: false })

        if (error) {
            console.error('Error loading departments:', error)
            return
        }

        setDepartments(data || [])
    }

    const loadEmployees = async () => {
        const { data } = await supabase
            .from('profiles')
            .select('*, task_assignments(count)')
            .eq('role', 'employee')
            .eq('created_by', user?.id)
            .order('created_at', { ascending: false })

        // Map the count from the nested object to a flat property
        const employeesWithCount = data?.map((emp: any) => ({
            ...emp,
            task_count: emp.task_assignments?.[0]?.count || 0
        }))

        setEmployees(employeesWithCount || [])
    }

    const logActivity = async (actionType: string, description: string, entityId?: string) => {
        if (!user) return
        await supabase.from('activities').insert({
            user_id: user.id,
            action_type: actionType,
            description,
            entity_id: entityId
        })
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

    const handleSaveClient = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)

        if (editingClient) {
            const { error } = await supabase
                .from('clients')
                .update({ name: clientName })
                .eq('id', editingClient.id)

            if (error) {
                setError(error.message)
                return
            }
            logActivity('update_client', `updated client: ${clientName}`)
            createNotification('Client Updated', `Successfully updated client: ${clientName}`, 'success')
        } else {
            const { data: newClient, error } = await supabase
                .from('clients')
                .insert({ name: clientName, cc_id: user?.id })
                .select()
                .single()

            if (error) {
                setError(error.message)
                return
            }

            // Auto-create General workspace
            await supabase.from('workspaces').insert({ name: 'General', client_id: newClient.id })

            logActivity('create_client', `added a new client: ${clientName}`)
            createNotification('Client Added', `Successfully added client: ${clientName}`, 'success')
        }

        setClientName('')
        setEditingClient(null)
        setShowAddClient(false)
        loadClients()
    }

    const handleDeleteClient = async (id: string) => {
        if (!confirm('Are you sure you want to delete this client? This will delete all associated workspaces, departments, and tasks.')) return

        const { error } = await supabase
            .from('clients')
            .delete()
            .eq('id', id)

        if (error) {
            alert('Error deleting client: ' + error.message)
        } else {
            logActivity('delete_client', 'deleted a client')
            createNotification('Client Deleted', 'Successfully deleted client', 'success')
            if (selectedClient === id) {
                setSelectedClient(null)
                setDepartments([])
            }
            loadClients()
        }
    }



    const handleSaveDepartment = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedClient && !editingDepartment) return
        setError(null)

        if (editingDepartment) {
            const { error } = await supabase
                .from('departments')
                .update({ name: departmentName })
                .eq('id', editingDepartment.id)

            if (error) {
                setError(error.message)
                return
            }
            logActivity('update_department', `updated department: ${departmentName}`)
            createNotification('Department Updated', `Successfully updated department: ${departmentName}`, 'success')
        } else {
            // Find or create workspace
            let targetWorkspaceId

            // First try to find existing workspace (e.g. "General" or any other)
            const { data: existingWs } = await supabase
                .from('workspaces')
                .select('id')
                .eq('client_id', selectedClient)
                .limit(1)

            if (existingWs && existingWs.length > 0) {
                targetWorkspaceId = existingWs[0].id
            } else {
                const { data: newWs, error: wsError } = await supabase
                    .from('workspaces')
                    .insert({ name: 'General', client_id: selectedClient })
                    .select()
                    .single()

                if (wsError) {
                    setError('Failed to create default workspace: ' + wsError.message)
                    return
                }
                targetWorkspaceId = newWs.id
            }

            const { error } = await supabase
                .from('departments')
                .insert({ name: departmentName, workspace_id: targetWorkspaceId })

            if (error) {
                setError(error.message)
                return
            }
            logActivity('create_department', `added a new department: ${departmentName}`)
            createNotification('Department Added', `Successfully added department: ${departmentName}`, 'success')
        }

        setDepartmentName('')
        setEditingDepartment(null)
        setShowAddDepartment(false)
        if (selectedClient) loadClientDepartments(selectedClient)
    }

    const handleDeleteDepartment = async (id: string) => {
        if (!confirm('Are you sure you want to delete this department? This will delete all associated tasks.')) return

        const { error } = await supabase
            .from('departments')
            .delete()
            .eq('id', id)

        if (error) {
            alert('Error deleting department: ' + error.message)
        } else {
            logActivity('delete_department', 'deleted a department')
            createNotification('Department Deleted', 'Successfully deleted department', 'success')
            if (selectedDepartment === id) {
                setSelectedDepartment(null)
            }
            if (selectedClient) loadClientDepartments(selectedClient)
        }
    }

    const handleAddEmployee = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)

        if (editingEmployee) {
            // Update existing employee
            const { error } = await supabase
                .from('profiles')
                .update({ full_name: empFullName })
                .eq('id', editingEmployee.id)

            if (error) {
                setError(error.message)
                return
            }
            logActivity('update_employee', `updated employee: ${empFullName}`)
            createNotification('Employee Updated', `Successfully updated employee: ${empFullName}`, 'success')
        } else {

            // Create new employee
            // Use time-limited isolated client to prevent session hijacking
            const tempSupabase = createClient(
                import.meta.env.VITE_SUPABASE_URL,
                import.meta.env.VITE_SUPABASE_ANON_KEY,
                {
                    auth: {
                        persistSession: false,
                        autoRefreshToken: false,
                        detectSessionInUrl: false
                    }
                }
            )

            const { data, error: signUpError } = await tempSupabase.auth.signUp({
                email: empEmail,
                password: empPassword,
                options: {
                    data: {
                        full_name: empFullName,
                        role: 'employee',
                        status: 'active',
                        created_by: user?.id // Pass creator ID for the trigger
                    },
                },
            })

            if (signUpError) {
                setError(signUpError.message)
                return
            }

            if (data.user) {
                // Use MAIN client to update metadata, as the temp client is not logged in as admin/cc
                await supabase
                    .from('profiles')
                    .update({ created_by: user?.id, status: 'active' })
                    .eq('id', data.user.id)
                logActivity('create_employee', `added a new employee: ${empFullName}`)
            }
        }

        setEmpFullName('')
        setEmpEmail('')
        setEmpPassword('')
        setEditingEmployee(null)
        setShowAddEmployee(false)
        loadEmployees()
    }

    const handleDeleteEmployee = async (id: string) => {
        if (!confirm('Are you sure you want to delete this employee? This action cannot be undone.')) return

        try {
            const { error, count } = await supabase
                .from('profiles')
                .delete({ count: 'exact' })
                .eq('id', id)

            if (error) {
                console.error('Delete error:', error)
                alert('Error deleting employee: ' + error.message)
            } else if (count === 0) {
                alert('Could not delete employee. You may not have permission, or they may have related records preventing deletion.')
            } else {
                logActivity('delete_employee', 'deleted an employee')
                createNotification('Employee Deleted', 'Successfully deleted employee', 'success')
                loadEmployees()
            }
        } catch (err) {
            console.error('Unexpected error:', err)
            alert('An unexpected error occurred while deleting.')
        }
    }

    const handleStatusChange = async (id: string, newStatus: 'active' | 'inactive') => {
        const { error } = await supabase
            .from('profiles')
            .update({ status: newStatus })
            .eq('id', id)

        if (error) {
            alert('Error updating status: ' + error.message)
        } else {
            logActivity('update_status', `updated employee status to ${newStatus}`)
            loadEmployees()
        }
    }

    const loadDepartmentEmployees = async (departmentId: string) => {
        const { data } = await supabase
            .from('department_employees')
            .select('employee_id, profiles!inner(id, email, full_name, created_at)')
            .eq('department_id', departmentId)

        if (data) {
            const empList = data.map((de: any) => de.profiles)
            setDepartmentEmployees(prev => ({ ...prev, [departmentId]: empList }))
            setAssignedEmployeeIds(new Set(empList.map((e: Employee) => e.id)))
        }
    }

    const handleOpenAssignEmployees = async (departmentId: string) => {
        setSelectedDepartment(departmentId)
        await loadDepartmentEmployees(departmentId)
        setShowAssignEmployees(true)
    }

    const handleToggleEmployeeAssignment = async (employeeId: string) => {
        if (!selectedDepartment) return

        const isAssigned = assignedEmployeeIds.has(employeeId)

        if (isAssigned) {
            // Unassign
            const { error } = await supabase
                .from('department_employees')
                .delete()
                .eq('department_id', selectedDepartment)
                .eq('employee_id', employeeId)

            if (!error) {
                setAssignedEmployeeIds(prev => {
                    const newSet = new Set(prev)
                    newSet.delete(employeeId)
                    return newSet
                })
                await loadDepartmentEmployees(selectedDepartment)
            }
        } else {
            // Assign
            const { error } = await supabase
                .from('department_employees')
                .insert({ department_id: selectedDepartment, employee_id: employeeId })

            if (!error) {
                setAssignedEmployeeIds(prev => new Set(prev).add(employeeId))
                await loadDepartmentEmployees(selectedDepartment)
            }
        }
    }

    // Premium Styles
    const glassCardStyle = {
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-color)',
        boxShadow: 'var(--glass-shadow)',
        borderRadius: 'var(--radius-lg)',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    }

    const glassHeaderStyle = {
        background: 'var(--bg-primary)', // Solid background for better readability
        borderBottom: '1px solid var(--border-color)',
        padding: '1rem 2rem',
        position: 'sticky' as const,
        top: 0,
        zIndex: 40,
        marginBottom: '2rem'
    }

    const glassActionButtonStyle = {
        padding: '0.5rem 1rem',
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-sm)',
        color: 'var(--text-primary)',
        cursor: 'pointer',
        fontSize: '0.875rem',
        fontWeight: '500',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        transition: 'all 0.2s ease',
        boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
    }

    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', color: 'var(--text-secondary)', background: 'var(--bg-primary)' }}>
                <div className="animate-pulse">Loading dashboard...</div>
            </div>
        )
    }

    const filteredClients = clients.filter(client =>
        client.name.toLowerCase().includes(searchTerm.toLowerCase())
    )



    const filteredDepartments = departments.filter(dept =>
        dept.name.toLowerCase().includes(searchTerm.toLowerCase())
    )



    return (
        <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: theme === 'dark' ? 'var(--bg-primary)' : 'var(--bg-gradient)', color: 'var(--text-primary)', transition: 'background-color 0.3s' }}>

            <ClientSidebar
                clients={filteredClients}
                selectedId={selectedClient}
                onSelect={(id) => {
                    setSelectedClient(id)
                    setViewMode('dashboard')
                }}
                onAdd={() => setShowAddClient(true)}
                onEdit={(c) => { setEditingClient(c); setClientName(c.name); setShowAddClient(true); }}
                onDelete={handleDeleteClient}
                profile={profile}
                onSignOut={handleSignOut}
                onProfileClick={() => setViewMode('profile')}
                onCreativeProgressClick={() => {
                    setViewMode('creative-progress')
                    setSelectedClient(null)
                }}
                onTasksTrackerClick={() => {
                    setViewMode('tasks-tracker')
                    setSelectedClient(null)
                }}
                onMeetingsClick={() => {
                    setViewMode('meetings')
                    setSelectedClient(null)
                }}
                onEmployeesClick={() => {
                    setViewMode('employees')
                    setSelectedClient(null)
                }}
                activeView={viewMode === 'dashboard' ? 'clients' : viewMode}
            />

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
                {viewMode === 'profile' ? (
                    <div style={{ padding: '2rem', overflowY: 'auto', height: '100%' }}>
                        <CCProfile />
                    </div>
                ) : viewMode === 'creative-progress' ? (
                    <div style={{ padding: '2rem', overflowY: 'auto', height: '100%' }}>
                        <CreativeProgress clientId={selectedClient} />
                    </div>
                ) : viewMode === 'tasks-tracker' ? (
                    <div style={{ overflowY: 'auto', height: '100%' }}>
                        <TasksTracker clientId={selectedClient} />
                    </div>
                ) : viewMode === 'meetings' ? (
                    <div style={{ overflowY: 'auto', height: '100%' }}>
                        <Meetings clientId={selectedClient} />
                    </div>
                ) : viewMode === 'employees' ? (
                    <div style={{ overflowY: 'auto', height: '100%' }}>
                        <EmployeeGallery
                            employees={employees}
                            onAdd={() => setShowAddEmployee(true)}
                            onEdit={(emp) => {
                                setEditingEmployee(emp)
                                setEmpFullName(emp.full_name)
                                setEmpEmail(emp.email)
                                setEmpPassword('')
                                setShowAddEmployee(true)
                            }}
                            onDelete={handleDeleteEmployee}
                            onStatusChange={handleStatusChange}
                            onTaskClick={(id, name) => {
                                setSelectedEmployeeForTasks({ id, name })
                                setShowEmployeeTasks(true)
                            }}
                        />
                    </div>
                ) : (
                    <>
                        {/* Header */}
                        <header style={{ ...glassHeaderStyle, background: 'rgba(255, 255, 255, 0.05)', backdropFilter: 'blur(12px)', borderBottom: 'var(--glass-border)', padding: '1rem 2rem', marginBottom: 0 }}>
                            <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
                                {/* Search */}
                                <div style={{ flex: 1, maxWidth: '500px', position: 'relative' }}>
                                    <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                                    <input
                                        type="text"
                                        placeholder="Search clients, workspaces, employees..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        style={{
                                            width: '100%',
                                            padding: '0.75rem 0.75rem 0.75rem 3rem',
                                            background: 'var(--bg-tertiary)',
                                            color: 'var(--text-primary)',
                                            border: 'var(--glass-border)',
                                            borderRadius: '1rem',
                                            fontSize: '0.9rem',
                                            outline: 'none',
                                            transition: 'all 0.2s',
                                            backdropFilter: 'blur(4px)'
                                        }}
                                        onFocus={(e) => {
                                            e.target.style.borderColor = 'var(--accent-color)'
                                            e.target.style.boxShadow = '0 0 0 2px rgba(99, 102, 241, 0.1)'
                                        }}
                                        onBlur={(e) => {
                                            e.target.style.borderColor = 'rgba(255,255,255,0.5)'
                                            e.target.style.boxShadow = 'none'
                                        }}
                                    />
                                </div>

                                {/* Right Actions */}
                                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
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
                                        onClick={() => setShowAnalytics(true)}
                                        style={{
                                            padding: '0.75rem',
                                            borderRadius: '12px',
                                            border: 'var(--glass-border)',
                                            background: 'var(--bg-tertiary)',
                                            color: 'var(--accent-color)',
                                            cursor: 'pointer',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            transition: 'all 0.2s'
                                        }}
                                        title="Analytics"
                                    >
                                        <BarChart3 size={20} />
                                    </button>
                                </div>
                            </div>
                        </header>

                        <main style={{ flex: 1, overflowY: 'auto', padding: '2rem' }}>
                            <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
                                {/* Stats Grid */}
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                                    gap: '1.5rem',
                                    marginBottom: '2rem',
                                }}>
                                    {[
                                        { label: 'Total Clients', value: clients.length, icon: Users, color: '#4f46e5', bg: '#eef2ff' },
                                        { label: 'Departments', value: departments.length, icon: Building2, color: '#ea580c', bg: '#fff7ed' },
                                        { label: 'Total Employees', value: employees.length, icon: UserPlus, color: '#059669', bg: '#ecfdf5' },
                                    ].map((stat, i) => (
                                        <div key={i} style={{
                                            ...glassCardStyle,
                                            padding: '1.5rem',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '1rem',
                                            borderRadius: '1.2rem',
                                            transition: 'transform 0.2s',
                                        }}
                                            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                                            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                                        >
                                            <div style={{
                                                padding: '1rem',
                                                borderRadius: '1rem',
                                                background: theme === 'dark' ? 'rgba(255,255,255,0.05)' : stat.bg,
                                                color: stat.color,
                                            }}>
                                                <stat.icon size={24} />
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '0.875rem', fontWeight: '600' }} className="text-gradient">{stat.label}</div>
                                                <div style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--text-primary)' }}>{stat.value}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 350px', gap: '2rem', alignItems: 'start' }}>
                                    {/* Left Column: Workspaces & Employees */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                        {/* Departments Section */}
                                        {selectedClient ? (
                                            <div style={{ ...glassCardStyle, overflow: 'hidden', animation: 'fadeIn 0.3s ease-out' }}>
                                                <div style={{
                                                    padding: '1.25rem',
                                                    borderBottom: 'var(--glass-border)',
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                    background: 'var(--bg-primary)',
                                                }}>
                                                    <h2 style={{ fontSize: '1.1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.5rem' }} className="text-gradient">
                                                        <Building2 size={18} style={{ color: 'var(--accent-color)' }} /> Departments
                                                    </h2>
                                                    <button onClick={() => setShowAddDepartment(true)} style={glassActionButtonStyle}>
                                                        <Plus size={16} /> Add
                                                    </button>
                                                </div>
                                                <div style={{ padding: '1rem', maxHeight: '500px', overflowY: 'auto' }}>
                                                    {filteredDepartments.length === 0 ? (
                                                        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No departments found.</div>
                                                    ) : (
                                                        filteredDepartments.map((dept) => (
                                                            <div
                                                                key={dept.id}
                                                                style={{
                                                                    padding: '1rem',
                                                                    borderRadius: '0.8rem',
                                                                    background: 'var(--bg-secondary)',
                                                                    marginBottom: '0.75rem',
                                                                    border: 'var(--glass-border)',
                                                                    transition: 'transform 0.2s',
                                                                }}
                                                                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                                                                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                                                            >
                                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                                                                    <span style={{ fontWeight: '600', color: 'var(--text-primary)', fontSize: '0.95rem' }}>{dept.name}</span>
                                                                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                                                                        <button onClick={(e) => { e.stopPropagation(); setEditingDepartment(dept); setDepartmentName(dept.name); setShowAddDepartment(true); }} style={{ padding: '0.25rem', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-secondary)' }}><Pencil size={14} /></button>
                                                                        <button onClick={(e) => { e.stopPropagation(); handleDeleteDepartment(dept.id); }} style={{ padding: '0.25rem', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--danger-color)' }}><Trash2 size={14} /></button>
                                                                    </div>
                                                                </div>
                                                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                                    <button onClick={() => handleOpenAssignEmployees(dept.id)} style={{ ...glassActionButtonStyle, fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}><UserPlus size={14} /> Assign Teams</button>
                                                                    <button onClick={() => { setSelectedDepartment(dept.id); loadDepartmentEmployees(dept.id); setShowDepartmentTasks(true); }} style={{ ...glassActionButtonStyle, fontSize: '0.8rem', padding: '0.4rem 0.8rem', color: 'var(--accent-color)' }}><ClipboardList size={14} /> Tasks</button>
                                                                </div>
                                                            </div>
                                                        ))
                                                    )}
                                                </div>
                                            </div>
                                        ) : (
                                            <div style={{ ...glassCardStyle, padding: '3rem', textAlign: 'center', border: '2px dashed var(--glass-border)' }}>
                                                <Briefcase size={48} style={{ margin: '0 auto 1rem', color: 'var(--text-secondary)', opacity: 0.5 }} />
                                                <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }} className="text-gradient">No Client Selected</h3>
                                                <p style={{ color: 'var(--text-secondary)' }}>Select a client from the sidebar to view departments.</p>
                                            </div>
                                        )}

                                    </div>


                                    {/* Right Column: Activity Feed */}
                                    <div style={{ height: 'calc(100vh - 140px)', position: 'sticky', top: '0' }}>
                                        <div style={{ ...glassCardStyle, height: '100%', overflow: 'hidden', padding: '1.5rem' }}>
                                            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '1rem' }} className="text-gradient">Activity Feed</h3>
                                            <div style={{ height: 'calc(100% - 40px)', overflowY: 'auto' }}>
                                                <ActivityFeed />
                                            </div>
                                        </div>
                                    </div>

                                </div>
                            </div>
                        </main>
                    </>
                )}

                {/* Error Message Toast/Banner */}
                {error && (
                    <div style={{
                        position: 'fixed', bottom: '2rem', right: '2rem',
                        background: '#fef2f2', color: '#b91c1c', border: '1px solid #fca5a5',
                        padding: '1rem', borderRadius: '0.5rem', zIndex: 100,
                        boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                    }}>
                        <strong>Error:</strong> {error}
                        <button onClick={() => setError(null)} style={{ marginLeft: '1rem', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}>&times;</button>
                    </div>
                )}

                {/* Modals outside main flex flow to prevent clipping if any issues, though they are fixed position usually */}

                {/* Modals are fixed position so they can be anywhere, but keep them at root of flex container or here */}
                <Modal
                    isOpen={showAddClient}
                    onClose={() => { setShowAddClient(false); setEditingClient(null); setClientName(''); }}
                    title={<h3 style={{
                        margin: 0, fontSize: '1.25rem', fontWeight: 'bold',
                        background: 'linear-gradient(to right, #ec4899, #8b5cf6)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                        width: 'fit-content'
                    }}>{editingClient ? "Edit Client" : "Add New Client"}</h3>}
                >
                    <form onSubmit={handleSaveClient}>
                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontWeight: '500', fontSize: '0.875rem' }}>Client Name</label>
                            <input type="text" value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="e.g. Acme Corp" required style={{ width: '100%', padding: '0.75rem', border: 'var(--glass-border)', borderRadius: '0.5rem', fontSize: '0.95rem', outline: 'none', background: 'var(--bg-primary)', color: 'var(--text-primary)' }} />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                            <button type="button" onClick={() => setShowAddClient(false)} style={{ padding: '0.625rem 1rem', background: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: 'var(--glass-border)', borderRadius: '0.5rem', cursor: 'pointer' }}>Cancel</button>
                            <button type="submit" style={{ padding: '0.625rem 1rem', background: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)', color: 'white', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: '500' }}>{editingClient ? 'Update' : 'Create'}</button>
                        </div>
                    </form>
                </Modal>



                <Modal
                    isOpen={showAddDepartment}
                    onClose={() => { setShowAddDepartment(false); setEditingDepartment(null); setDepartmentName(''); }}
                    title={<h3 style={{
                        margin: 0, fontSize: '1.25rem', fontWeight: 'bold',
                        background: 'linear-gradient(to right, #ec4899, #8b5cf6)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                        width: 'fit-content'
                    }}>{editingDepartment ? "Edit Department" : "Add New Department"}</h3>}
                >
                    <form onSubmit={handleSaveDepartment}>
                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontWeight: '500', fontSize: '0.875rem' }}>Department Name</label>
                            <input type="text" value={departmentName} onChange={(e) => setDepartmentName(e.target.value)} placeholder="e.g. Design" required style={{ width: '100%', padding: '0.75rem', border: 'var(--glass-border)', borderRadius: '0.5rem', fontSize: '0.95rem', outline: 'none', background: 'var(--bg-primary)', color: 'var(--text-primary)' }} />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                            <button type="button" onClick={() => setShowAddDepartment(false)} style={{ padding: '0.625rem 1rem', background: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: 'var(--glass-border)', borderRadius: '0.5rem', cursor: 'pointer' }}>Cancel</button>
                            <button type="submit" style={{ padding: '0.625rem 1rem', background: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)', color: 'white', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: '500' }}>{editingDepartment ? 'Update' : 'Create'}</button>
                        </div>
                    </form>
                </Modal>

                <Modal
                    isOpen={showAddEmployee}
                    onClose={() => { setShowAddEmployee(false); setEditingEmployee(null); setEmpFullName(''); setEmpEmail(''); setEmpPassword(''); }}
                    title={<h3 style={{
                        margin: 0, fontSize: '1.25rem', fontWeight: 'bold',
                        background: 'linear-gradient(to right, #ec4899, #8b5cf6)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                        width: 'fit-content'
                    }}>{editingEmployee ? "Edit Employee" : "Add New Employee"}</h3>}
                >
                    <form onSubmit={handleAddEmployee}>
                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontWeight: '500', fontSize: '0.875rem' }}>Full Name</label>
                            <input type="text" value={empFullName} onChange={(e) => setEmpFullName(e.target.value)} placeholder="e.g. John Doe" required style={{ width: '100%', padding: '0.75rem', border: 'var(--glass-border)', borderRadius: '0.5rem', fontSize: '0.95rem', outline: 'none', background: 'var(--bg-primary)', color: 'var(--text-primary)' }} />
                        </div>
                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontWeight: '500', fontSize: '0.875rem' }}>Email</label>
                            <input type="email" value={empEmail} onChange={(e) => setEmpEmail(e.target.value)} placeholder="john@example.com" required style={{ width: '100%', padding: '0.75rem', border: 'var(--glass-border)', borderRadius: '0.5rem', fontSize: '0.95rem', outline: 'none', background: 'var(--bg-primary)', color: 'var(--text-primary)' }} />
                        </div>
                        {!editingEmployee && (
                            <div style={{ marginBottom: '1.5rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontWeight: '500', fontSize: '0.875rem' }}>Password</label>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        value={empPassword}
                                        onChange={(e) => setEmpPassword(e.target.value)}
                                        placeholder="Min 6 chars"
                                        required
                                        style={{
                                            width: '100%',
                                            padding: '0.75rem',
                                            paddingRight: '2.5rem', // Make room for the eye icon
                                            border: 'var(--glass-border)',
                                            borderRadius: '0.5rem',
                                            fontSize: '0.95rem',
                                            outline: 'none',
                                            background: 'var(--bg-primary)',
                                            color: 'var(--text-primary)'
                                        }}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        style={{
                                            position: 'absolute',
                                            right: '0.75rem',
                                            top: '50%',
                                            transform: 'translateY(-50%)',
                                            background: 'none',
                                            border: 'none',
                                            cursor: 'pointer',
                                            color: 'var(--text-secondary)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            padding: 0
                                        }}
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                            <button type="button" onClick={() => setShowAddEmployee(false)} style={{ padding: '0.625rem 1rem', background: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: 'var(--glass-border)', borderRadius: '0.5rem', cursor: 'pointer' }}>Cancel</button>
                            <button type="submit" style={{ padding: '0.625rem 1rem', background: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)', color: 'white', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: '500' }}>{editingEmployee ? 'Update' : 'Create'}</button>
                        </div>
                    </form>
                </Modal>

                <DepartmentTasksModal
                    isOpen={showDepartmentTasks}
                    onClose={() => setShowDepartmentTasks(false)}
                    departmentId={selectedDepartment}
                    departmentName={departments.find(d => d.id === selectedDepartment)?.name || ''}
                    employees={selectedDepartment ? (departmentEmployees[selectedDepartment] || []) : []}
                />

                <EmployeeAssignmentModal
                    isOpen={showAssignEmployees}
                    onClose={() => setShowAssignEmployees(false)}
                    departmentId={selectedDepartment || ''}
                    departmentName={departments.find(d => d.id === selectedDepartment)?.name || ''}
                    allEmployees={employees}
                    assignedEmployeeIds={assignedEmployeeIds}
                    onToggleAssignment={handleToggleEmployeeAssignment}
                />

                <EmployeeTasksModal
                    isOpen={showEmployeeTasks}
                    onClose={() => {
                        setShowEmployeeTasks(false)
                        setSelectedEmployeeForTasks(null)
                    }}
                    employeeId={selectedEmployeeForTasks?.id || null}
                    employeeName={selectedEmployeeForTasks?.name || ''}
                />

                <DashboardAnalyticsModal
                    isOpen={showAnalytics}
                    onClose={() => setShowAnalytics(false)}
                    ccId={user?.id}
                />
            </div>
        </div >
    )
}
