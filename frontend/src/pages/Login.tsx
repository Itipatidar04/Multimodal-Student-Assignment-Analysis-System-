/*Two tabs — Login and Register (toggle between them)
Register shows extra fields: Name and Role dropdown (Student / Faculty / Admin)
Error handling — shows backend error messages (like "Email already registered") in a red box
After success — calls navigate('/') which triggers RootRedirect in App.tsx and sends them to the right dashboard
Icons — Mail, Lock, User icons inside the input fields for a clean look
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { BookOpen, Mail, Lock, User, ChevronDown } from 'lucide-react'

export default function Login() {
  const { login, register } = useAuth()
  const navigate = useNavigate()

  // Tab: 'login' or 'register'
  const [tab, setTab] = useState<'login' | 'register'>('login')

  // Form fields
  const [name, setName]         = useState('')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole]         = useState('student')

  // UI state
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (tab === 'login') {
        await login(email, password)
      } else {
        if (!name.trim()) { setError('Name is required'); setLoading(false); return }
        await register(name, email, password, role)
      }
      // AuthContext applies the theme — App.tsx handles the redirect
      navigate('/')
    } catch (err: any) {
      const msg = err?.response?.data?.detail || 'Something went wrong. Please try again.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">

        {/* Logo */}
        <div className="auth-logo">
          <div className="auth-logo-icon">
            <BookOpen size={26} color="#3b82f6" />
          </div>
          <h1>IIPS</h1>
          <p>Assignment Analysis System · DAVV</p>
        </div>

        {/* Login / Register tabs */}
        <div className="auth-tabs">
          <button
            className={`auth-tab ${tab === 'login' ? 'active' : ''}`}
            onClick={() => { setTab('login'); setError('') }}
          >
            Login
          </button>
          <button
            className={`auth-tab ${tab === 'register' ? 'active' : ''}`}
            onClick={() => { setTab('register'); setError('') }}
          >
            Register
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>

          {/* Name — only on Register */}
          {tab === 'register' && (
            <div className="form-group">
              <label>Full Name</label>
              <div style={{ position: 'relative' }}>
                <User size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type="text"
                  placeholder="Your full name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  style={{ paddingLeft: 36 }}
                  required
                />
              </div>
            </div>
          )}

          {/* Email */}
          <div className="form-group">
            <label>Email</label>
            <div style={{ position: 'relative' }}>
              <Mail size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type="email"
                placeholder="you@iips.ac.in"
                value={email}
                onChange={e => setEmail(e.target.value)}
                style={{ paddingLeft: 36 }}
                required
              />
            </div>
          </div>

          {/* Password */}
          <div className="form-group">
            <label>Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                style={{ paddingLeft: 36 }}
                required
              />
            </div>
          </div>

          {/* Role — only on Register */}
          {tab === 'register' && (
            <div className="form-group">
              <label>Role</label>
              <div style={{ position: 'relative' }}>
                <ChevronDown size={15} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
                <select
                  value={role}
                  onChange={e => setRole(e.target.value)}
                  style={{ appearance: 'none', paddingRight: 36 }}
                >
                  <option value="student">🎓 Student</option>
                  <option value="faculty">👨‍🏫 Faculty</option>
                  <option value="admin">🛡️ Administrator</option>
                </select>
              </div>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: 8,
              padding: '10px 14px',
              marginBottom: 16,
              fontSize: 13,
              color: '#991b1b',
            }}>
              {error}
            </div>
          )}

          {/* Submit button */}
          <button type="submit" className="btn-auth" disabled={loading}>
            {loading
              ? (tab === 'login' ? 'Signing in...' : 'Creating account...')
              : (tab === 'login' ? 'Sign In' : 'Create Account')
            }
          </button>
        </form>

        {/* Footer */}
        <div className="auth-footer">
          IIPS, DAVV · Indore · Academic Platform
        </div>

      </div>
    </div>
  )
}
