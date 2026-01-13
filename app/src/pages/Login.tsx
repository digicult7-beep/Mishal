import { supabase } from '../lib/supabase'
import { useState } from 'react'
import { CheckCircle2, LayoutDashboard, Calendar, Users, BarChart3, Lock } from 'lucide-react'

export default function Login() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        })

        if (error) {
            setError(error.message)
        }

        setLoading(false)
    }

    return (
        <div style={{
            display: 'flex',
            minHeight: '100vh',
            fontFamily: "'Inter', sans-serif",
            background: '#020617' // Very dark slate/black
        }}>
            {/* Left Panel - Branding */}
            <div style={{
                flex: 1,
                background: '#000000', // Dark black
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '4rem',
                position: 'relative',
                overflow: 'hidden',
                color: 'white'
            }}>
                {/* Background decorative elements */}
                <div style={{
                    position: 'absolute',
                    top: '-10%',
                    left: '-10%',
                    width: '500px',
                    height: '500px',
                    background: 'radial-gradient(circle, rgba(139, 92, 246, 0.2) 0%, rgba(0,0,0,0) 70%)',
                    borderRadius: '50%',
                    zIndex: 0
                }} />

                <div style={{ position: 'relative', zIndex: 1, maxWidth: '600px' }}>
                    <div style={{
                        width: '64px',
                        height: '64px',
                        background: 'rgba(255, 255, 255, 0.1)',
                        backdropFilter: 'blur(12px)',
                        borderRadius: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: '2rem',
                        border: '1px solid rgba(255, 255, 255, 0.2)'
                    }}>
                        <LayoutDashboard size={32} color="#c084fc" />
                    </div>

                    <h1 style={{
                        fontSize: '3.5rem',
                        fontWeight: '800',
                        lineHeight: '1.2',
                        marginBottom: '1rem',
                        background: 'linear-gradient(to right, #ec4899, #8b5cf6)', // Pink to Purple Text
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text'
                    }}>
                        MIAK Dashboard
                    </h1>

                    <p style={{
                        fontSize: '1.125rem',
                        color: '#ddd6fe',
                        marginBottom: '3rem',
                        lineHeight: '1.6',
                        maxWidth: '480px'
                    }}>
                        A modern project management platform designed to streamline your creative workflows, attendance, and team collaboration.
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {[
                            { icon: Calendar, text: "Advanced Content Calendar" },
                            { icon: CheckCircle2, text: "Real-time Task Tracking" },
                            { icon: Users, text: "Seamless Team Collaboration" },
                            { icon: BarChart3, text: "Intelligent Performance Analytics" }
                        ].map((feature, idx) => (
                            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <feature.icon size={20} color="#ec4899" />
                                <span style={{ fontSize: '1rem', color: '#cbd5e1' }}>{feature.text}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Right Panel - Login Form */}
            <div style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '2rem',
                background: '#0f172a' // Dark slate
            }}>
                <div style={{
                    width: '100%',
                    maxWidth: '420px',
                    animation: 'fadeIn 0.5s ease-out'
                }}>
                    <div style={{ marginBottom: '2.5rem' }}>
                        <h2 style={{
                            fontSize: '2rem',
                            fontWeight: '700',
                            color: 'white',
                            marginBottom: '0.5rem'
                        }}>
                            Welcome back
                        </h2>
                        <p style={{ color: '#94a3b8' }}>
                            Please enter your details to sign in.
                        </p>
                    </div>

                    <form onSubmit={handleLogin}>
                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#e2e8f0', fontSize: '0.9rem', fontWeight: '500' }}>
                                Email Address
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                placeholder="name@company.com"
                                style={{
                                    width: '100%',
                                    padding: '0.875rem 1rem',
                                    background: '#1e293b',
                                    border: '1px solid #334155',
                                    borderRadius: '0.5rem',
                                    color: 'white',
                                    outline: 'none',
                                    fontSize: '0.95rem',
                                    transition: 'border-color 0.2s'
                                }}
                                onFocus={(e) => e.target.style.borderColor = '#8b5cf6'}
                                onBlur={(e) => e.target.style.borderColor = '#334155'}
                            />
                        </div>

                        <div style={{ marginBottom: '1.5rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                <label style={{ color: '#e2e8f0', fontSize: '0.9rem', fontWeight: '500' }}>
                                    Password
                                </label>
                                <a href="#" style={{ color: '#8b5cf6', fontSize: '0.85rem', textDecoration: 'none' }}>
                                    Forgot password?
                                </a>
                            </div>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    placeholder="••••••••"
                                    style={{
                                        width: '100%',
                                        padding: '0.875rem 1rem',
                                        paddingRight: '2.5rem',
                                        background: '#1e293b',
                                        border: '1px solid #334155',
                                        borderRadius: '0.5rem',
                                        color: 'white',
                                        outline: 'none',
                                        fontSize: '0.95rem',
                                        transition: 'border-color 0.2s'
                                    }}
                                    onFocus={(e) => e.target.style.borderColor = '#8b5cf6'}
                                    onBlur={(e) => e.target.style.borderColor = '#334155'}
                                />
                                <Lock size={16} style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                            </div>
                        </div>

                        {error && (
                            <div style={{
                                padding: '0.75rem',
                                marginBottom: '1.5rem',
                                background: 'rgba(239, 68, 68, 0.1)',
                                color: '#ef4444',
                                borderRadius: '0.5rem',
                                fontSize: '0.875rem',
                                border: '1px solid rgba(239, 68, 68, 0.2)'
                            }}>
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                width: '100%',
                                padding: '0.875rem',
                                background: 'linear-gradient(to right, #8b5cf6, #d946ef)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '0.5rem',
                                fontSize: '1rem',
                                fontWeight: '600',
                                cursor: loading ? 'not-allowed' : 'pointer',
                                transition: 'opacity 0.2s',
                                opacity: loading ? 0.7 : 1
                            }}
                        >
                            {loading ? 'Signing In...' : 'Sign In →'}
                        </button>

                        <div style={{ marginTop: '2rem', textAlign: 'center', color: '#64748b', fontSize: '0.9rem' }}>
                            Or continue with
                            <div style={{ marginTop: '1.5rem', fontSize: '0.9rem' }}>
                                Don't have an account? <a href="#" style={{ color: '#d946ef', textDecoration: 'none', fontWeight: '500' }}>Create an account</a>
                            </div>
                        </div>
                    </form>

                    <div style={{ marginTop: '4rem', textAlign: 'center', color: '#475569', fontSize: '0.75rem' }}>
                        © 2025 MIAK Dashboard. All rights reserved.
                    </div>
                </div>
            </div>

            <style>{`
                @media (max-width: 1024px) {
                    div[style*="min-height: 100vh"] {
                        flex-direction: column;
                    }
                    /* Hide branding on small screens or stack it? Usually hide or simplify massive sidebars */
                    div[style*="linear-gradient"] {
                        display: none !important; 
                    }
                    /* Or make it a top banner? For now let's just make the right side full width on mobile */
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    )
}
