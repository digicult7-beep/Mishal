import { useState, useEffect } from 'react'
import { Search, Moon, Sun, Briefcase, ArrowRight, LogOut, LayoutGrid, Calendar, CheckSquare, User } from 'lucide-react'
import { useTheme } from '../contexts/ThemeContext'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

export default function CommandPalette() {
    const [isOpen, setIsOpen] = useState(false)
    const [query, setQuery] = useState('')
    const { theme, toggleTheme } = useTheme()
    const { signOut } = useAuth()
    const [results, setResults] = useState<any[]>([])
    const [selectedIndex, setSelectedIndex] = useState(0)

    // Data
    const [clients, setClients] = useState<any[]>([])

    useEffect(() => {
        // Fetch clients for initial data
        const loadData = async () => {
            const { data } = await supabase.from('clients').select('id, name')
            if (data) setClients(data)
        }
        loadData()

        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault()
                setIsOpen(prev => !prev)
            }
            if (e.key === 'Escape') {
                setIsOpen(false)
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [])

    useEffect(() => {
        if (!isOpen) {
            setQuery('')
            setSelectedIndex(0)
            return
        }
        // Focus input when opened (can utilize autoFocus prop)
    }, [isOpen])

    useEffect(() => {
        if (!query) {
            setResults([
                { type: 'action', label: 'Toggle Theme', icon: theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />, action: toggleTheme },
            ])
            return
        }

        const filteredClients = clients
            .filter(c => c.name.toLowerCase().includes(query.toLowerCase()))
            .map(c => ({
                type: 'client',
                label: c.name,
                icon: <Briefcase size={14} />,
                id: c.id
            }))

        const actions = [
            { type: 'action', label: 'Toggle Theme', icon: theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />, action: toggleTheme },
            { type: 'nav', label: 'Go to Dashboard', icon: <LayoutGrid size={14} />, view: 'dashboard' },
            { type: 'nav', label: 'Go to Tasks', icon: <CheckSquare size={14} />, view: 'tasks' },
            { type: 'nav', label: 'Go to Meetings', icon: <Calendar size={14} />, view: 'meetings' },
            { type: 'nav', label: 'Go to Profile', icon: <User size={14} />, view: 'profile' },
            { type: 'action', label: 'Logout', icon: <LogOut size={14} />, action: () => { signOut(); setIsOpen(false) } },
        ].filter(a => a.label.toLowerCase().includes(query.toLowerCase()))

        setResults([...actions, ...filteredClients])
        setSelectedIndex(0)

    }, [query, clients, theme])


    const handleSelect = (item: any) => {
        if (item.type === 'action') {
            item.action()
            setIsOpen(false)
        } else if (item.type === 'nav') {
            window.dispatchEvent(new CustomEvent('dashboard-navigate', { detail: { view: item.view } }))
            setIsOpen(false)
        } else if (item.type === 'client') {
            // Navigate or perform client action
            console.log('Selected client', item)
            // For now just close
            setIsOpen(false)
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault()
            setSelectedIndex(prev => (prev + 1) % results.length)
        } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setSelectedIndex(prev => (prev - 1 + results.length) % results.length)
        } else if (e.key === 'Enter') {
            e.preventDefault()
            if (results[selectedIndex]) {
                handleSelect(results[selectedIndex])
            }
        }
    }

    if (!isOpen) return null

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 9999, // Super high z-index
                background: 'rgba(0,0,0,0.5)',
                backdropFilter: 'blur(2px)',
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'center',
                paddingTop: '10vh'
            }}
            onClick={() => setIsOpen(false)}
        >
            <div
                style={{
                    width: '100%',
                    maxWidth: '600px',
                    background: 'var(--bg-secondary)',
                    borderRadius: '12px',
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                    overflow: 'hidden',
                    border: '1px solid var(--border-color)',
                    display: 'flex',
                    flexDirection: 'column'
                }}
                onClick={e => e.stopPropagation()}
            >
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '1rem',
                    borderBottom: '1px solid var(--border-color)',
                    gap: '0.75rem'
                }}>
                    <Search className="text-gray-400" size={20} />
                    <input
                        autoFocus
                        type="text"
                        placeholder="Type a command or search..."
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                        style={{
                            width: '100%',
                            background: 'transparent',
                            border: 'none',
                            outline: 'none',
                            fontSize: '1.1rem',
                            color: 'var(--text-primary)'
                        }}
                    />
                    <div style={{
                        fontSize: '0.75rem',
                        color: 'var(--text-secondary)',
                        padding: '0.2rem 0.5rem',
                        background: 'var(--bg-tertiary)',
                        borderRadius: '4px',
                        fontWeight: '500'
                    }}>
                        ESC
                    </div>
                </div>

                <div style={{ maxHeight: '400px', overflowY: 'auto', padding: '0.5rem' }}>
                    {results.length === 0 ? (
                        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                            No results found.
                        </div>
                    ) : (
                        results.map((item, index) => (
                            <div
                                key={index}
                                onClick={() => handleSelect(item)}
                                onMouseEnter={() => setSelectedIndex(index)}
                                style={{
                                    padding: '0.75rem 1rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.75rem',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    background: index === selectedIndex ? 'var(--bg-primary)' : 'transparent',
                                    color: index === selectedIndex ? 'var(--accent-color)' : 'var(--text-primary)',
                                    transition: 'all 0.1s'
                                }}
                            >
                                <div style={{
                                    opacity: index === selectedIndex ? 1 : 0.7,
                                    display: 'flex',
                                    alignItems: 'center'
                                }}>
                                    {item.icon}
                                </div>
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                    <span style={{ fontSize: '0.95rem', fontWeight: '500' }}>{item.label}</span>
                                    {item.type === 'client' && <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Client</span>}
                                    {item.type === 'action' && <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Action</span>}
                                    {item.type === 'nav' && <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Navigation</span>}
                                </div>
                                {index === selectedIndex && <ArrowRight size={16} style={{ opacity: 0.5 }} />}
                            </div>
                        ))
                    )}
                </div>

                <div style={{
                    padding: '0.5rem 1rem',
                    background: 'var(--bg-tertiary)',
                    borderTop: '1px solid var(--border-color)',
                    fontSize: '0.75rem',
                    color: 'var(--text-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                }}>
                    <span><strong>↑↓</strong> to navigate</span>
                    <span><strong>↵</strong> to select</span>
                </div>
            </div>
        </div>
    )
}
