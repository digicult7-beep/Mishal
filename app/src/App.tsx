import { AuthProvider, useAuth } from './contexts/AuthContext'
// ThemeProvider is provided in main.tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import AdminRegister from './pages/AdminRegister'
import Dashboard from './pages/Dashboard'
import CommandPalette from './components/CommandPalette'
import './App.css'

function AppContent() {
  const { user, loading } = useAuth()

  if (loading) {
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
          padding: '2rem 3rem',
          borderRadius: '1rem',
          boxShadow: '0 25px 80px rgba(0,0,0,0.25)',
          fontSize: '1.1rem',
          color: '#374151',
        }}>
          Loading...
        </div>
      </div>
    )
  }

  if (user) {
    return <Dashboard />
  }

  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/admin-register" element={<AdminRegister />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CommandPalette />
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
