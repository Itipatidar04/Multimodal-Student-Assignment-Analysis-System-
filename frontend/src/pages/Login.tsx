import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { BookOpen, Mail, Lock, User, ChevronDown } from 'lucide-react'
import api from '../api/client'

interface Program { id: string; name: string; code: string; total_semesters: number }

export default function Login() {
  const { login, register } = useAuth()
  const navigate = useNavigate()

  const [tab, setTab]           = useState<'login' | 'register'>('login')
  const [name, setName]         = useState('')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole]         = useState('student')
  const [programId, setProgramId]       = useState('')
  const [semester, setSemester]         = useState('1')
  const [programs, setPrograms]         = useState<Program[]>([])
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  // Fetch programs for registration dropdown
  useEffect(() => {
    api.get('/programs').then(r => setPrograms(r.data)).catch(() => {})
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (tab === 'login') {
        await login(email, password)
      } else {
        if (!name.trim()) { setError('Name is required'); setLoading(false); return }
        if (role === 'student' && !programId) { setError('Please select your program'); setLoading(false); return }
        await register(name, email, password, role, role === 'student' ? programId : undefined, role === 'student' ? parseInt(semester) : undefined)
      }
      navigate('/')
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const selectedProgram = programs.find(p => p.id === programId)

  return (
    <div className="auth-page">
      <div className="auth-card">
        {/* Logo */}
        <div className="auth-logo">
          <div className="auth-logo-icon"><BookOpen size={26} color="#3b82f6" /></div>
          <h1>IIPS</h1>
          <p>Assignment Analysis System · DAVV</p>
        </div>

        {/* Tabs */}
        <div className="auth-tabs">
          <button className={`auth-tab ${tab === 'login' ? 'active' : ''}`} onClick={() => { setTab('login'); setError('') }}>Login</button>
          <button className={`auth-tab ${tab === 'register' ? 'active' : ''}`} onClick={() => { setTab('register'); setError('') }}>Register</button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Name */}
          {tab === 'register' && (
            <div className="form-group">
              <label>Full Name</label>
              <div style={{ position: 'relative' }}>
                <User size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input type="text" placeholder="Your full name" value={name} onChange={e => setName(e.target.value)} style={{ paddingLeft: 36 }} required />
              </div>
            </div>
          )}

          {/* Email */}
          <div className="form-group">
            <label>Email</label>
            <div style={{ position: 'relative' }}>
              <Mail size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input type="email" placeholder="you@iips.ac.in" value={email} onChange={e => setEmail(e.target.value)} style={{ paddingLeft: 36 }} required />
            </div>
          </div>

          {/* Password */}
          <div className="form-group">
            <label>Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} style={{ paddingLeft: 36 }} required />
            </div>
          </div>

          {/* Role */}
          {tab === 'register' && (
            <div className="form-group">
              <label>Role</label>
              <div style={{ position: 'relative' }}>
                <ChevronDown size={15} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
                <select value={role} onChange={e => setRole(e.target.value)} style={{ appearance: 'none', paddingRight: 36 }}>
                  <option value="student">🎓 Student</option>
                  <option value="faculty">👨‍🏫 Faculty</option>
                  <option value="admin">🛡️ Administrator</option>
                </select>
              </div>
            </div>
          )}

          {/* Program (students only) */}
          {tab === 'register' && role === 'student' && (
            <>
              <div className="form-group">
                <label>Program</label>
                <div style={{ position: 'relative' }}>
                  <ChevronDown size={15} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
                  <select value={programId} onChange={e => setProgramId(e.target.value)} style={{ appearance: 'none', paddingRight: 36 }} required>
                    <option value="">Select your program</option>
                    {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Current Semester</label>
                <div style={{ position: 'relative' }}>
                  <ChevronDown size={15} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
                  <select value={semester} onChange={e => setSemester(e.target.value)} style={{ appearance: 'none', paddingRight: 36 }}>
                    {Array.from({ length: selectedProgram?.total_semesters || 10 }, (_, i) => (
                      <option key={i + 1} value={i + 1}>Semester {i + 1}</option>
                    ))}
                  </select>
                </div>
              </div>
            </>
          )}

          {/* Error */}
          {error && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#991b1b' }}>
              {error}
            </div>
          )}

          <button type="submit" className="btn-auth" disabled={loading}>
            {loading ? (tab === 'login' ? 'Signing in...' : 'Creating account...') : (tab === 'login' ? 'Sign In' : 'Create Account')}
          </button>
        </form>

        <div className="auth-footer">IIPS, DAVV · Indore · Academic Platform</div>
      </div>
    </div>
  )
}
