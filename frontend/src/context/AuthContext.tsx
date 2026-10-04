import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import api from '../api/client'

// ── Types ──────────────────────────────────────────
interface User {
  id: string
  name: string
  email: string
  role: 'student' | 'faculty' | 'admin'
  created_at: string
}

interface AuthContextType {
  user: User | null
  token: string | null
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string, role: string, program_id?: string, current_semester?: number) => Promise<void>
  logout: () => void
  isLoading: boolean
}

// ── Context ────────────────────────────────────────
const AuthContext = createContext<AuthContextType | null>(null)

// ── Theme helper ───────────────────────────────────
// Applies the correct CSS theme class to <body> based on role
function applyTheme(role: string | undefined) {
  document.body.classList.remove('theme-student', 'theme-faculty', 'theme-admin')
  if (role === 'student') document.body.classList.add('theme-student')
  if (role === 'faculty') document.body.classList.add('theme-faculty')
  if (role === 'admin')   document.body.classList.add('theme-admin')
}

// ── Provider ───────────────────────────────────────
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]       = useState<User | null>(null)
  const [token, setToken]     = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // On app load — restore session from localStorage
  useEffect(() => {
    const savedToken = localStorage.getItem('token')
    const savedUser  = localStorage.getItem('user')

    if (savedToken && savedUser) {
      const parsedUser = JSON.parse(savedUser)
      setToken(savedToken)
      setUser(parsedUser)
      applyTheme(parsedUser.role)
    }
    setIsLoading(false)
  }, [])

  // ── Login ──
  const login = async (email: string, password: string) => {
    const response = await api.post('/auth/login', { email, password })
    const { access_token, user: userData } = response.data

    localStorage.setItem('token', access_token)
    localStorage.setItem('user', JSON.stringify(userData))
    setToken(access_token)
    setUser(userData)
    applyTheme(userData.role)
  }

  // ── Register ──
  const register = async (name: string, email: string, password: string, role: string) => {
    const response = await api.post('/auth/register', { name, email, password, role })
    const { access_token, user: userData } = response.data

    localStorage.setItem('token', access_token)
    localStorage.setItem('user', JSON.stringify(userData))
    setToken(access_token)
    setUser(userData)
    applyTheme(userData.role)
  }

  // ── Logout ──
  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setToken(null)
    setUser(null)
    document.body.classList.remove('theme-student', 'theme-faculty', 'theme-admin')
    window.location.href = '/login'
  }

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  )
}

// ── Hook ───────────────────────────────────────────
// Use this in any component: const { user, login, logout } = useAuth()
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}
