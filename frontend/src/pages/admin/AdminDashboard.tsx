import { useState, useEffect } from 'react'
import type { ReactElement } from 'react'
import {
  Users, BookOpen, GraduationCap, UserCheck,
  BarChart2, Search, AlertCircle, Shield,
} from 'lucide-react'
import Layout from '../../components/Layout'
import { getAllUsers, getAllCourses, getAdminStats, type AdminUser, type AdminCourse, type AdminStats } from '../../api/admin'

type Tab = 'overview' | 'users' | 'courses'

export default function AdminDashboard() {
  const [activeTab, setActiveTab]   = useState<Tab>('overview')
  const [stats, setStats]           = useState<AdminStats | null>(null)
  const [users, setUsers]           = useState<AdminUser[]>([])
  const [courses, setCourses]       = useState<AdminCourse[]>([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState('')

  // Search
  const [userSearch, setUserSearch]     = useState('')
  const [courseSearch, setCourseSearch] = useState('')

  // Role filter
  const [roleFilter, setRoleFilter] = useState<string>('all')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    setError('')
    try {
      const [s, u, c] = await Promise.all([
        getAdminStats(),
        getAllUsers(),
        getAllCourses(),
      ])
      setStats(s); setUsers(u); setCourses(c)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setError(msg || 'Failed to load admin data.')
    } finally {
      setLoading(false)
    }
  }

  // Filtered users
  const filteredUsers = users.filter(u => {
    const matchSearch = userSearch === '' ||
      u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase())
    const matchRole = roleFilter === 'all' || u.role === roleFilter
    return matchSearch && matchRole
  })

  // Filtered courses
  const filteredCourses = courses.filter(c =>
    courseSearch === '' ||
    c.name.toLowerCase().includes(courseSearch.toLowerCase()) ||
    c.code.toLowerCase().includes(courseSearch.toLowerCase())
  )

  const roleConfig: Record<string, { color: string; badge: string; icon: ReactElement }> = {
    student: { color: '#f5c518', badge: 'badge-yellow', icon: <GraduationCap size={14} /> },
    faculty: { color: '#9b87c4', badge: 'badge-purple', icon: <UserCheck size={14} /> },
    admin:   { color: '#f97316', badge: 'badge-orange', icon: <Shield size={14} /> },
  }

  const formatDate = (dt: string) =>
    new Date(dt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

  return (
    <Layout>
      {/* Page header */}
      <div className="page-header">
        <h1>Admin Dashboard</h1>
        <p>System overview — manage users, courses, and monitor activity</p>
      </div>

      {/* Error */}
      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10,
          padding: '12px 16px', marginBottom: 20, color: '#991b1b', fontSize: 14,
          display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* ── Stats Overview ─────────────────────────────────────── */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', marginBottom: 28 }}>
        {[
          { label: 'Students',    value: stats?.total_students,    color: '#f5c518', icon: <GraduationCap size={18} /> },
          { label: 'Faculty',     value: stats?.total_faculty,     color: '#9b87c4', icon: <UserCheck size={18} /> },
          { label: 'Admins',      value: stats?.total_admins,      color: '#f97316', icon: <Shield size={18} /> },
          { label: 'Courses',     value: stats?.total_courses,     color: '#3b82f6', icon: <BookOpen size={18} /> },
          { label: 'Submissions', value: stats?.total_submissions, color: '#10b981', icon: <BarChart2 size={18} /> },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div className="stat-label">{s.label}</div>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: s.color + '20',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color }}>
                {s.icon}
              </div>
            </div>
            <div className="stat-value" style={{ color: s.color }}>
              {loading ? '—' : s.value ?? 0}
            </div>
          </div>
        ))}
      </div>

      {/* ── Tabs ──────────────────────────────────────────────── */}
      <div style={{ display: 'flex', borderBottom: '1px solid #e8e8e8', marginBottom: 28 }}>
        {([
          { key: 'overview', label: 'Overview',   icon: <BarChart2 size={15} /> },
          { key: 'users',    label: 'Users',      icon: <Users size={15} /> },
          { key: 'courses',  label: 'Courses',    icon: <BookOpen size={15} /> },
        ] as { key: Tab; label: string; icon: ReactElement }[]).map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '12px 20px', fontSize: 14, fontWeight: activeTab === tab.key ? 600 : 500,
              border: 'none', background: 'none', cursor: 'pointer',
              color: activeTab === tab.key ? 'var(--accent, #f97316)' : '#64748b',
              borderBottom: `2px solid ${activeTab === tab.key ? 'var(--accent, #f97316)' : 'transparent'}`,
              transition: 'all 0.15s', marginBottom: -1,
            }}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════
          OVERVIEW TAB
      ══════════════════════════════════════════════════════ */}
      {activeTab === 'overview' && (
        <div>
          {/* Role distribution */}
          <div className="grid-2" style={{ marginBottom: 24 }}>
            <div className="card">
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', marginBottom: 20 }}>
                User Distribution
              </h3>
              {loading ? (
                <p className="text-muted">Loading...</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {(['student', 'faculty', 'admin'] as const).map(role => {
                    const count = role === 'student' ? stats?.total_students
                      : role === 'faculty' ? stats?.total_faculty : stats?.total_admins
                    const total = (stats?.total_students || 0) + (stats?.total_faculty || 0) + (stats?.total_admins || 0)
                    const pct = total > 0 ? Math.round(((count || 0) / total) * 100) : 0
                    const cfg = roleConfig[role]
                    return (
                      <div key={role}>
                        <div className="flex-between" style={{ marginBottom: 6 }}>
                          <div className="flex gap-8" style={{ color: '#1e293b', fontSize: 13 }}>
                            {cfg.icon}
                            <span style={{ fontWeight: 500, textTransform: 'capitalize' }}>{role}s</span>
                          </div>
                          <span style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>
                            {count || 0} <span style={{ color: '#94a3b8', fontWeight: 400 }}>({pct}%)</span>
                          </span>
                        </div>
                        <div style={{ height: 6, background: '#f1f5f9', borderRadius: 99, overflow: 'hidden' }}>
                          <div style={{
                            height: '100%', background: cfg.color, borderRadius: 99,
                            width: `${pct}%`, transition: 'width 0.5s ease',
                          }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="card">
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', marginBottom: 20 }}>
                System Activity
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  { label: 'Total Courses', val: stats?.total_courses || 0, icon: <BookOpen size={16} />, color: '#3b82f6' },
                  { label: 'Total Submissions', val: stats?.total_submissions || 0, icon: <BarChart2 size={16} />, color: '#10b981' },
                  { label: 'Avg Submissions/Course',
                    val: stats?.total_courses ? Math.round((stats.total_submissions || 0) / stats.total_courses) : 0,
                    icon: <BarChart2 size={16} />, color: '#f97316' },
                ].map(item => (
                  <div key={item.label} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '12px 16px', background: '#f8fafc', borderRadius: 10,
                  }}>
                    <div className="flex gap-10" style={{ color: '#64748b', fontSize: 13 }}>
                      <span style={{ color: item.color }}>{item.icon}</span>
                      {item.label}
                    </div>
                    <span style={{ fontWeight: 700, fontSize: 18, color: item.color }}>{loading ? '—' : item.val}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recent users */}
          <div className="card">
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', marginBottom: 16 }}>
              Recent Registrations
            </h3>
            {loading ? (
              <p className="text-muted">Loading...</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {users.slice(0, 6).map(u => {
                  const cfg = roleConfig[u.role]
                  return (
                    <div key={u.id} style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '10px 14px', background: '#f8fafc', borderRadius: 8,
                    }}>
                      <div style={{
                        width: 34, height: 34, borderRadius: '50%',
                        background: cfg.color + '20', display: 'flex',
                        alignItems: 'center', justifyContent: 'center',
                        fontSize: 13, fontWeight: 700, color: cfg.color, flexShrink: 0,
                      }}>
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>{u.name}</div>
                        <div style={{ fontSize: 12, color: '#94a3b8' }}>{u.email}</div>
                      </div>
                      <span className={`badge ${cfg.badge}`}>{u.role}</span>
                      <span style={{ fontSize: 11, color: '#94a3b8' }}>{formatDate(u.created_at)}</span>
                    </div>
                  )
                })}
                {users.length > 6 && (
                  <button className="btn btn-ghost" style={{ marginTop: 8 }}
                    onClick={() => setActiveTab('users')}>
                    View all {users.length} users →
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          USERS TAB
      ══════════════════════════════════════════════════════ */}
      {activeTab === 'users' && (
        <div>
          {/* Filters */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
              <Search size={15} style={{
                position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                color: '#94a3b8', pointerEvents: 'none'
              }} />
              <input
                value={userSearch} onChange={e => setUserSearch(e.target.value)}
                placeholder="Search by name or email..."
                style={{ paddingLeft: 36 }}
              />
            </div>
            <select
              value={roleFilter}
              onChange={e => setRoleFilter(e.target.value)}
              style={{ width: 'auto', fontSize: 13 }}
            >
              <option value="all">All roles</option>
              <option value="student">Students</option>
              <option value="faculty">Faculty</option>
              <option value="admin">Admins</option>
            </select>
          </div>

          <p style={{ color: '#94a3b8', fontSize: 13, marginBottom: 16 }}>
            {filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''} found
          </p>

          {loading ? (
            <div className="text-center text-muted" style={{ padding: '60px 0' }}>Loading users...</div>
          ) : filteredUsers.length === 0 ? (
            <div className="card text-center" style={{ padding: '40px' }}>
              <Users size={36} style={{ color: '#cbd5e1', margin: '0 auto 12px', display: 'block' }} />
              <p className="text-muted">No users match your search.</p>
            </div>
          ) : (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e8e8e8' }}>
                    {['User', 'Email', 'Role', 'Joined'].map(h => (
                      <th key={h} style={{
                        padding: '12px 16px', textAlign: 'left', fontSize: 12,
                        fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5,
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u, i) => {
                    const cfg = roleConfig[u.role]
                    return (
                      <tr key={u.id} style={{
                        borderBottom: i < filteredUsers.length - 1 ? '1px solid #f1f5f9' : 'none',
                        transition: 'background 0.1s',
                      }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        <td style={{ padding: '12px 16px' }}>
                          <div className="flex gap-10">
                            <div style={{
                              width: 32, height: 32, borderRadius: '50%',
                              background: cfg.color + '20', display: 'flex', alignItems: 'center',
                              justifyContent: 'center', fontSize: 12, fontWeight: 700,
                              color: cfg.color, flexShrink: 0,
                            }}>
                              {u.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>{u.name}</div>
                              <div style={{ fontSize: 11, color: '#94a3b8' }}>{u.id.slice(0, 8)}...</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: 13, color: '#64748b' }}>{u.email}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <span className={`badge ${cfg.badge}`}>{u.role}</span>
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: 13, color: '#94a3b8' }}>
                          {formatDate(u.created_at)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          COURSES TAB
      ══════════════════════════════════════════════════════ */}
      {activeTab === 'courses' && (
        <div>
          {/* Search */}
          <div style={{ position: 'relative', marginBottom: 20, maxWidth: 400 }}>
            <Search size={15} style={{
              position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
              color: '#94a3b8', pointerEvents: 'none'
            }} />
            <input
              value={courseSearch} onChange={e => setCourseSearch(e.target.value)}
              placeholder="Search courses..."
              style={{ paddingLeft: 36 }}
            />
          </div>

          <p style={{ color: '#94a3b8', fontSize: 13, marginBottom: 16 }}>
            {filteredCourses.length} course{filteredCourses.length !== 1 ? 's' : ''} found
          </p>

          {loading ? (
            <div className="text-center text-muted" style={{ padding: '60px 0' }}>Loading courses...</div>
          ) : filteredCourses.length === 0 ? (
            <div className="card text-center" style={{ padding: '40px' }}>
              <BookOpen size={36} style={{ color: '#cbd5e1', margin: '0 auto 12px', display: 'block' }} />
              <p className="text-muted">No courses found.</p>
            </div>
          ) : (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e8e8e8' }}>
                    {['Course', 'Code', 'Semester', 'Created'].map(h => (
                      <th key={h} style={{
                        padding: '12px 16px', textAlign: 'left', fontSize: 12,
                        fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5,
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredCourses.map((c, i) => (
                    <tr key={c.id} style={{
                      borderBottom: i < filteredCourses.length - 1 ? '1px solid #f1f5f9' : 'none',
                    }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>{c.name}</div>
                        {c.description && (
                          <div style={{ fontSize: 12, color: '#94a3b8' }}>
                            {c.description.length > 60 ? c.description.slice(0, 60) + '...' : c.description}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span className="badge badge-orange">{c.code}</span>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: '#64748b' }}>
                        {c.semester ? `${c.semester} Sem` : '—'} {c.year ? `· ${c.year}` : ''}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: '#94a3b8' }}>
                        {formatDate(c.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </Layout>
  )
}
