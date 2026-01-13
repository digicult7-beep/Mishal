import { useAuth } from '../contexts/AuthContext'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import AdminDashboard from './AdminDashboard'
import CCDashboard from './CCDashboard'
import EmployeeDashboard from './EmployeeDashboard'

export default function Dashboard() {
    const { user } = useAuth()
    const [role, setRole] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const loadProfile = async () => {
            if (!user) return
            const { data } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .single()
            setRole(data?.role || null)
            setLoading(false)
        }
        loadProfile()
    }, [user])

    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
                <div>Loading...</div>
            </div>
        )
    }

    if (role === 'admin') {
        return <AdminDashboard />
    }

    if (role === 'client_coordinator') {
        return <CCDashboard />
    }

    // Default dashboard for Employee
    return <EmployeeDashboard />
}
