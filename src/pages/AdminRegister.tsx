import { supabase } from '../lib/supabase'
import { useState } from 'react'

export default function AdminRegister() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [fullName, setFullName] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        const { error: signUpError } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: fullName,
                    role: 'admin',
                },
            },
        })

        if (signUpError) {
            setError(signUpError.message)
            setLoading(false)
            return
        }

        setSuccess(true)
        setLoading(false)
    }

    if (success) {
        return (
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '100vh',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            }}>
                <div style={{
                    background: 'white',
                    padding: '2.5rem',
                    borderRadius: '1.5rem',
                    boxShadow: '0 25px 80px rgba(0,0,0,0.25)',
                    width: '100%',
                    maxWidth: '450px',
                    textAlign: 'center',
                }}>
                    <div style={{
                        width: '80px',
                        height: '80px',
                        margin: '0 auto 1.5rem',
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '2.5rem',
                    }}>
                        ✓
                    </div>
                    <h2 style={{ marginBottom: '1rem', color: '#1f2937' }}>Admin Created!</h2>
                    <p style={{ color: '#6b7280', marginBottom: '2rem' }}>
                        Your admin account has been created successfully. You can now log in.
                    </p>
                    <a
                        href="/"
                        style={{
                            display: 'inline-block',
                            padding: '0.875rem 2rem',
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            color: 'white',
                            textDecoration: 'none',
                            borderRadius: '0.75rem',
                            fontWeight: '600',
                            transition: 'transform 0.2s',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                    >
                        Go to Login
                    </a>
                </div>
            </div>
        )
    }

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            padding: '1rem',
        }}>
            <div style={{
                background: 'white',
                padding: '2.5rem',
                borderRadius: '1.5rem',
                boxShadow: '0 25px 80px rgba(0,0,0,0.25)',
                width: '100%',
                maxWidth: '450px',
                animation: 'slideIn 0.3s ease-out',
            }}>
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem', color: '#1f2937', fontWeight: '700' }}>
                        Create Admin Account
                    </h1>
                    <p style={{ color: '#6b7280', fontSize: '0.95rem' }}>
                        Set up your admin account to get started
                    </p>
                </div>

                <form onSubmit={handleRegister}>
                    <div style={{ marginBottom: '1.25rem' }}>
                        <label style={{
                            display: 'block',
                            marginBottom: '0.5rem',
                            color: '#374151',
                            fontWeight: '500',
                            fontSize: '0.95rem',
                        }}>
                            Full Name
                        </label>
                        <input
                            type="text"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            required
                            placeholder="Enter your full name"
                            style={{
                                width: '100%',
                                padding: '0.875rem 1rem',
                                border: '2px solid #e5e7eb',
                                borderRadius: '0.75rem',
                                fontSize: '1rem',
                                transition: 'all 0.2s',
                                outline: 'none',
                            }}
                            onFocus={(e) => e.currentTarget.style.borderColor = '#667eea'}
                            onBlur={(e) => e.currentTarget.style.borderColor = '#e5e7eb'}
                        />
                    </div>

                    <div style={{ marginBottom: '1.25rem' }}>
                        <label style={{
                            display: 'block',
                            marginBottom: '0.5rem',
                            color: '#374151',
                            fontWeight: '500',
                            fontSize: '0.95rem',
                        }}>
                            Email Address
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            placeholder="admin@example.com"
                            style={{
                                width: '100%',
                                padding: '0.875rem 1rem',
                                border: '2px solid #e5e7eb',
                                borderRadius: '0.75rem',
                                fontSize: '1rem',
                                transition: 'all 0.2s',
                                outline: 'none',
                            }}
                            onFocus={(e) => e.currentTarget.style.borderColor = '#667eea'}
                            onBlur={(e) => e.currentTarget.style.borderColor = '#e5e7eb'}
                        />
                    </div>

                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{
                            display: 'block',
                            marginBottom: '0.5rem',
                            color: '#374151',
                            fontWeight: '500',
                            fontSize: '0.95rem',
                        }}>
                            Password
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            placeholder="Minimum 6 characters"
                            minLength={6}
                            style={{
                                width: '100%',
                                padding: '0.875rem 1rem',
                                border: '2px solid #e5e7eb',
                                borderRadius: '0.75rem',
                                fontSize: '1rem',
                                transition: 'all 0.2s',
                                outline: 'none',
                            }}
                            onFocus={(e) => e.currentTarget.style.borderColor = '#667eea'}
                            onBlur={(e) => e.currentTarget.style.borderColor = '#e5e7eb'}
                        />
                    </div>

                    {error && (
                        <div style={{
                            padding: '1rem',
                            marginBottom: '1.25rem',
                            background: '#fef2f2',
                            color: '#dc2626',
                            borderRadius: '0.75rem',
                            border: '1px solid #fecaca',
                            fontSize: '0.95rem',
                        }}>
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            width: '100%',
                            padding: '1rem',
                            background: loading
                                ? '#9ca3af'
                                : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '0.75rem',
                            fontSize: '1.05rem',
                            fontWeight: '600',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            transition: 'all 0.2s',
                            boxShadow: loading ? 'none' : '0 4px 15px rgba(102, 126, 234, 0.4)',
                        }}
                        onMouseEnter={(e) => {
                            if (!loading) e.currentTarget.style.transform = 'translateY(-2px)'
                        }}
                        onMouseLeave={(e) => {
                            if (!loading) e.currentTarget.style.transform = 'translateY(0)'
                        }}
                    >
                        {loading ? 'Creating Account...' : 'Create Admin Account'}
                    </button>
                </form>

                <div style={{
                    marginTop: '1.5rem',
                    textAlign: 'center',
                    paddingTop: '1.5rem',
                    borderTop: '1px solid #e5e7eb',
                }}>
                    <p style={{ color: '#6b7280', fontSize: '0.95rem' }}>
                        Already have an account?{' '}
                        <a
                            href="/"
                            style={{
                                color: '#667eea',
                                textDecoration: 'none',
                                fontWeight: '600',
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                            onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                        >
                            Sign in
                        </a>
                    </p>
                </div>
            </div>

            <style>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
        </div>
    )
}
