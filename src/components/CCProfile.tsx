import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { User, Save, Loader2, Camera, Briefcase } from 'lucide-react'

// Reuse the glassmorphism styles from Dashboard
const glassCardStyle = {
    background: 'var(--glass-bg)',
    backdropFilter: 'blur(12px)',
    border: '1px solid var(--glass-border)',
    borderRadius: '1.5rem',
    boxShadow: 'var(--card-shadow)',
}

export default function CCProfile() {
    const { user } = useAuth()
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [fullName, setFullName] = useState('')
    const [email, setEmail] = useState('')
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (user) {
            loadProfile()
        }
    }, [user])

    const loadProfile = async () => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user?.id)
                .single()

            if (error) throw error

            if (data) {
                setFullName(data.full_name || '')
                setEmail(data.email || '')
                setAvatarUrl(data.avatar_url || null)
            }
        } catch (error) {
            console.error('Error loading profile:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!event.target.files || event.target.files.length === 0) {
            return
        }

        const file = event.target.files[0]
        const fileExt = file.name.split('.').pop()
        const fileName = `${user?.id}-${Math.random()}.${fileExt}`
        const filePath = `${fileName}`

        setUploading(true)
        setMessage(null)

        try {
            // Upload image to 'avatars' bucket
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file)

            if (uploadError) {
                throw uploadError
            }

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath)

            setAvatarUrl(publicUrl)

            // Automatically save the avatar URL to the profile
            const { error: updateError } = await supabase
                .from('profiles')
                .update({
                    avatar_url: publicUrl
                })
                .eq('id', user?.id)

            if (updateError) throw updateError

            setMessage({ type: 'success', text: 'Profile photo updated successfully!' })
        } catch (error: any) {
            console.error('Error uploading avatar:', error)
            setMessage({ type: 'error', text: 'Error uploading image: ' + error.message })
        } finally {
            setUploading(false)
        }
    }

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)
        setMessage(null)

        try {
            const { error } = await supabase
                .from('profiles')
                .update({
                    full_name: fullName
                })
                .eq('id', user?.id)

            if (error) throw error

            setMessage({ type: 'success', text: 'Profile updated successfully!' })
        } catch (error: any) {
            console.error('Error updating profile:', error)
            setMessage({ type: 'error', text: error.message })
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--text-secondary)' }}>
                <Loader2 className="animate-spin" size={32} />
            </div>
        )
    }

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto', animation: 'fadeIn 0.5s ease-out' }}>
            <div style={{ ...glassCardStyle, padding: '2rem' }}>
                <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
                    <div style={{ position: 'relative', width: '100px', margin: '0 auto 1rem auto' }}>
                        <div
                            style={{
                                width: '100px', height: '100px', borderRadius: '50%',
                                background: avatarUrl ? `url(${avatarUrl}) center/cover no-repeat` : 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                boxShadow: '0 8px 16px rgba(99, 102, 241, 0.3)',
                                border: '4px solid rgba(255, 255, 255, 0.2)'
                            }}
                        >
                            {!avatarUrl && <User size={48} color="white" />}
                        </div>
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploading}
                            style={{
                                position: 'absolute', bottom: '0', right: '0',
                                background: 'var(--bg-primary)', border: 'var(--glass-border)',
                                borderRadius: '50%', padding: '0.5rem',
                                cursor: 'pointer', boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
                                color: 'var(--text-primary)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}
                            title="Change Photo"
                        >
                            {uploading ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
                        </button>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileSelect}
                            accept="image/*"
                            style={{ display: 'none' }}
                        />
                    </div>
                    <h2 style={{
                        fontSize: '1.75rem',
                        fontWeight: '700',
                        marginBottom: '0.5rem',
                        background: 'linear-gradient(to right, #ec4899, #8b5cf6)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                        width: 'fit-content',
                        margin: '0 auto 0.5rem auto'
                    }}>
                        My Profile
                    </h2>
                    <p className="text-gradient" style={{
                        background: 'linear-gradient(to right, #ec4899, #8b5cf6)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        fontSize: '2rem',
                        fontWeight: '800',
                        marginBottom: '0.5rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem'
                    }}>
                        <Briefcase size={32} style={{ color: '#ec4899' }} /> Client Coordinator
                    </p>
                    <p style={{ color: 'var(--text-secondary)' }}>
                        Manage your personal information
                    </p>
                </div>

                {message && (
                    <div style={{
                        padding: '1rem', borderRadius: '0.8rem', marginBottom: '1.5rem',
                        background: message.type === 'success' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                        color: message.type === 'success' ? '#166534' : '#991b1b',
                        border: `1px solid ${message.type === 'success' ? '#86efac' : '#fca5a5'}`
                    }}>
                        {message.text}
                    </div>
                )}

                <form onSubmit={handleSave}>
                    <div style={{ display: 'grid', gap: '1.5rem' }}>
                        <div>
                            <label style={{
                                display: 'block', marginBottom: '0.5rem', fontWeight: '700',
                                background: 'linear-gradient(to right, #ec4899, #8b5cf6)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                backgroundClip: 'text',
                                width: 'fit-content'
                            }}>
                                Email Address
                            </label>
                            <input
                                type="email"
                                value={email}
                                disabled
                                style={{
                                    width: '100%', padding: '0.875rem',
                                    borderRadius: '0.8rem', border: 'var(--glass-border)',
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    color: 'var(--text-secondary)', cursor: 'not-allowed'
                                }}
                            />
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                                Email cannot be changed.
                            </p>
                        </div>

                        <div>
                            <label style={{
                                display: 'block', marginBottom: '0.5rem', fontWeight: '700',
                                background: 'linear-gradient(to right, #ec4899, #8b5cf6)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                backgroundClip: 'text',
                                width: 'fit-content'
                            }}>
                                Full Name
                            </label>
                            <input
                                type="text"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                placeholder="Your full name"
                                style={{
                                    width: '100%', padding: '0.875rem',
                                    borderRadius: '0.8rem', border: 'var(--glass-border)',
                                    background: 'var(--bg-primary)', color: 'var(--text-primary)',
                                    outline: 'none', transition: 'border-color 0.2s'
                                }}
                            />
                        </div>

                        <div style={{ marginTop: '1rem' }}>
                            <button
                                type="submit"
                                disabled={saving}
                                style={{
                                    width: '100%', padding: '1rem',
                                    borderRadius: '0.8rem', border: 'none',
                                    background: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)',
                                    color: 'white', fontWeight: '600', fontSize: '1rem',
                                    cursor: saving ? 'wait' : 'pointer',
                                    display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem',
                                    boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
                                    opacity: saving ? 0.8 : 1
                                }}
                            >
                                {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                                {saving ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    )
}
