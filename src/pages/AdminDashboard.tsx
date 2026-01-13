import { useAuth } from '../contexts/AuthContext'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import Modal from '../components/Modal'
import {
    Users,
    UserPlus,
    LogOut,
    LayoutDashboard,
    User
} from 'lucide-react'

interface Profile {
    id: string
    email: string
    full_name: string
    role: 'admin' | 'client_coordinator' | 'employee'
    created_at: string
}

export default function AdminDashboard() {
    const { user, signOut } = useAuth()
    const [profile, setProfile] = useState<Profile | null>(null)
    const [coordinators, setCoordinators] = useState<Profile[]>([])
    const [loading, setLoading] = useState(true)
    const [showAddCC, setShowAddCC] = useState(false)
    const [ccEmail, setCCEmail] = useState('')
    const [ccPassword, setCCPassword] = useState('')
    const [ccFullName, setCCFullName] = useState('')
    const [addingCC, setAddingCC] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        loadProfile()
        loadCoordinators()
    }, [user])

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

    const loadCoordinators = async () => {
        const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('role', 'client_coordinator')
            .order('created_at', { ascending: false })
        setCoordinators(data || [])
    }

    const handleAddCC = async (e: React.FormEvent) => {
        e.preventDefault()
        setAddingCC(true)
        setError(null)

        const { data, error: signUpError } = await supabase.auth.signUp({
            email: ccEmail,
            password: ccPassword,
            options: {
                data: {
                    full_name: ccFullName,
                    role: 'client_coordinator',
                },
            },
        })

        if (signUpError) {
            setError(signUpError.message)
            setAddingCC(false)
            return
        }

        if (data.user) {
            await supabase
                .from('profiles')
                .update({ created_by: user?.id })
                .eq('id', data.user.id)
        }

        setCCEmail('')
        setCCPassword('')
        setCCFullName('')
        setShowAddCC(false)
        setAddingCC(false)
        loadCoordinators()
    }

    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', color: '#6b7280' }}>
                <div className="animate-pulse">Loading dashboard...</div>
            </div>
        )
    }

    return (
        <div style={{ minHeight: '100vh', background: '#fdfbf7', fontFamily: 'Inter, sans-serif', color: '#4a3b32' }}>
            {/* Header */}
            <header style={{
                background: 'white',
                borderBottom: '1px solid #e6dccf',
                padding: '1rem 2rem',
                position: 'sticky',
                top: 0,
                zIndex: 10,
            }}>
                <div style={{
                    maxWidth: '1200px',
                    margin: '0 auto',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{
                            width: '40px',
                            height: '40px',
                            background: '#c19a6b',
                            borderRadius: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            boxShadow: '0 4px 6px -1px rgba(193, 154, 107, 0.2)',
                        }}>
                            <LayoutDashboard size={24} />
                        </div>
                        <div>
                            <h1 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#4a3b32', margin: 0 }}>
                                Admin Dashboard
                            </h1>
                            <p style={{ color: '#8c7b70', fontSize: '0.875rem', margin: 0 }}>
                                {profile?.full_name || user?.email}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={signOut}
                        style={{
                            padding: '0.5rem 1rem',
                            background: 'white',
                            color: '#a68256',
                            border: '1px solid #e6dccf',
                            borderRadius: '0.5rem',
                            cursor: 'pointer',
                            fontWeight: '600',
                            fontSize: '0.875rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            transition: 'all 0.2s',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#fdfbf7';
                            e.currentTarget.style.borderColor = '#d9cbb8';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'white';
                            e.currentTarget.style.borderColor = '#e6dccf';
                        }}
                    >
                        <LogOut size={16} />
                        Sign Out
                    </button>
                </div>
            </header>

            <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
                {/* Stats Grid */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                    gap: '1.5rem',
                    marginBottom: '2rem',
                }}>
                    <div style={{
                        background: 'white',
                        padding: '1.5rem',
                        borderRadius: '1rem',
                        border: '1px solid #e6dccf',
                        boxShadow: '0 2px 4px rgba(74, 59, 50, 0.05)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1rem',
                    }}>
                        <div style={{
                            padding: '1rem',
                            borderRadius: '0.75rem',
                            background: '#f5f0e6',
                            color: '#c19a6b',
                        }}>
                            <Users size={24} />
                        </div>
                        <div>
                            <div style={{ fontSize: '0.875rem', color: '#8c7b70', fontWeight: '500' }}>Client Coordinators</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#4a3b32' }}>{coordinators.length}</div>
                        </div>
                    </div>
                </div>

                {/* Client Coordinators Section */}
                <div style={{
                    background: 'white',
                    borderRadius: '1rem',
                    border: '1px solid #e6dccf',
                    overflow: 'hidden',
                    boxShadow: '0 2px 4px rgba(74, 59, 50, 0.05)',
                }}>
                    <div style={{
                        padding: '1.5rem',
                        borderBottom: '1px solid #e6dccf',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                    }}>
                        <div>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#4a3b32', marginBottom: '0.25rem' }}>
                                Client Coordinators
                            </h2>
                            <p style={{ color: '#8c7b70', fontSize: '0.875rem', margin: 0 }}>
                                Manage coordinators who handle clients and workspaces
                            </p>
                        </div>
                        <button
                            onClick={() => setShowAddCC(true)}
                            style={{
                                padding: '0.625rem 1.25rem',
                                background: '#c19a6b',
                                color: 'white',
                                border: 'none',
                                borderRadius: '0.5rem',
                                cursor: 'pointer',
                                fontWeight: '600',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                transition: 'background-color 0.2s',
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#a68256'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#c19a6b'}
                        >
                            <UserPlus size={18} /> Add Coordinator
                        </button>
                    </div>

                    <div style={{ padding: '0' }}>
                        {coordinators.length === 0 ? (
                            <div style={{ padding: '4rem 2rem', textAlign: 'center' }}>
                                <div style={{
                                    width: '64px', height: '64px', background: '#f5f0e6', borderRadius: '50%',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem',
                                    color: '#c19a6b'
                                }}>
                                    <Users size={32} />
                                </div>
                                <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#4a3b32', marginBottom: '0.5rem' }}>No coordinators yet</h3>
                                <p style={{ color: '#8c7b70', fontSize: '0.875rem' }}>
                                    Start by adding client coordinators to the system.
                                </p>
                            </div>
                        ) : (
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead style={{ background: '#fdfbf7' }}>
                                    <tr>
                                        <th style={{ padding: '0.75rem 1.5rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#8c7b70', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Name</th>
                                        <th style={{ padding: '0.75rem 1.5rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#8c7b70', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email</th>
                                        <th style={{ padding: '0.75rem 1.5rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#8c7b70', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Joined</th>
                                        <th style={{ padding: '0.75rem 1.5rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: '600', color: '#8c7b70', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {coordinators.map((cc) => (
                                        <tr key={cc.id} style={{ borderBottom: '1px solid #f5f0e6' }}>
                                            <td style={{ padding: '1rem 1.5rem' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                    <div style={{
                                                        width: '32px', height: '32px', borderRadius: '50%', background: '#f5f0e6', color: '#c19a6b',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '600', fontSize: '0.875rem'
                                                    }}>
                                                        {cc.full_name?.[0]?.toUpperCase() || cc.email[0].toUpperCase()}
                                                    </div>
                                                    <span style={{ fontWeight: '500', color: '#4a3b32' }}>{cc.full_name || 'N/A'}</span>
                                                </div>
                                            </td>
                                            <td style={{ padding: '1rem 1.5rem', color: '#8c7b70', fontSize: '0.875rem' }}>{cc.email}</td>
                                            <td style={{ padding: '1rem 1.5rem', color: '#8c7b70', fontSize: '0.875rem' }}>
                                                {new Date(cc.created_at).toLocaleDateString()}
                                            </td>
                                            <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                                                <span style={{
                                                    padding: '0.25rem 0.75rem',
                                                    background: '#e6f4ea',
                                                    color: '#1e8e3e',
                                                    borderRadius: '9999px',
                                                    fontSize: '0.75rem',
                                                    fontWeight: '500',
                                                }}>
                                                    Active
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </main>

            {/* Add CC Modal */}
            <Modal
                isOpen={showAddCC}
                onClose={() => setShowAddCC(false)}
                title="Add Client Coordinator"
            >
                <form onSubmit={handleAddCC}>
                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: '#4a3b32', fontWeight: '500', fontSize: '0.875rem' }}>
                            Full Name
                        </label>
                        <div style={{ position: 'relative' }}>
                            <User size={18} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#8c7b70' }} />
                            <input
                                type="text"
                                value={ccFullName}
                                onChange={(e) => setCCFullName(e.target.value)}
                                placeholder="Jane Smith"
                                required
                                style={{
                                    width: '100%',
                                    padding: '0.625rem 0.625rem 0.625rem 2.5rem',
                                    border: '1px solid #e6dccf',
                                    borderRadius: '0.5rem',
                                    fontSize: '0.95rem',
                                    outline: 'none',
                                    color: '#1f2937',
                                    background: 'white',
                                }}
                                onFocus={(e) => e.target.style.borderColor = '#c19a6b'}
                                onBlur={(e) => e.target.style.borderColor = '#e6dccf'}
                            />
                        </div>
                    </div>
                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: '#4a3b32', fontWeight: '500', fontSize: '0.875rem' }}>
                            Email Address
                        </label>
                        <input
                            type="email"
                            value={ccEmail}
                            onChange={(e) => setCCEmail(e.target.value)}
                            placeholder="jane@example.com"
                            required
                            style={{
                                width: '100%',
                                padding: '0.625rem',
                                border: '1px solid #e6dccf',
                                borderRadius: '0.5rem',
                                fontSize: '0.95rem',
                                outline: 'none',
                                color: '#1f2937',
                                background: 'white',
                            }}
                            onFocus={(e) => e.target.style.borderColor = '#c19a6b'}
                            onBlur={(e) => e.target.style.borderColor = '#e6dccf'}
                        />
                    </div>
                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: '#4a3b32', fontWeight: '500', fontSize: '0.875rem' }}>
                            Password
                        </label>
                        <input
                            type="password"
                            value={ccPassword}
                            onChange={(e) => setCCPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                            minLength={6}
                            style={{
                                width: '100%',
                                padding: '0.625rem',
                                border: '1px solid #e6dccf',
                                borderRadius: '0.5rem',
                                fontSize: '0.95rem',
                                outline: 'none',
                                color: '#1f2937',
                                background: 'white',
                            }}
                            onFocus={(e) => e.target.style.borderColor = '#c19a6b'}
                            onBlur={(e) => e.target.style.borderColor = '#e6dccf'}
                        />
                        <p style={{ fontSize: '0.75rem', color: '#8c7b70', marginTop: '0.25rem' }}>Must be at least 6 characters</p>
                    </div>
                    {error && <div style={{ padding: '0.75rem', background: '#fee2e2', color: '#b91c1c', borderRadius: '0.5rem', marginBottom: '1rem', fontSize: '0.875rem' }}>{error}</div>}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                        <button
                            type="button"
                            onClick={() => setShowAddCC(false)}
                            style={{
                                padding: '0.625rem 1rem',
                                background: 'white',
                                color: '#4a3b32',
                                border: '1px solid #e6dccf',
                                borderRadius: '0.5rem',
                                cursor: 'pointer',
                                fontWeight: '500',
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={addingCC}
                            style={{
                                padding: '0.625rem 1rem',
                                background: '#c19a6b',
                                color: 'white',
                                border: 'none',
                                borderRadius: '0.5rem',
                                cursor: addingCC ? 'not-allowed' : 'pointer',
                                fontWeight: '500',
                                opacity: addingCC ? 0.7 : 1,
                            }}
                        >
                            {addingCC ? 'Creating...' : 'Create Coordinator'}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    )
}
