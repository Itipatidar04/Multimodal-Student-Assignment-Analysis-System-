import { type ReactNode } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { LogOut, LayoutDashboard, BookOpen, Send, Users, BarChart2, Settings } from 'lucide-react'

interface LayoutProps {
  children: ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const isActive = (path: string) => location.pathname === path

  // ── Sidebar items per role ──
  const studentNav = [
    { icon: <LayoutDashboard size={16} />, label: 'Dashboard', path: '/student' },
    { icon: <BookOpen size={16} />,        label: 'Assignments', path: '/student' },
  ]

  const facultyNav = [
    { icon: <LayoutDashboard size={16} />, label: 'Dashboard',   path: '/faculty' },
    { icon: <BookOpen size={16} />,        label: 'Courses',     path: '/faculty' },
    { icon: <Send size={16} />,            label: 'Submissions', path: '/faculty/submissions' },
    { icon: <BarChart2 size={16} />,       label: 'Analytics',   path: '/faculty/analytics' },
  ]

  const adminNav = [
    { icon: <LayoutDashboard size={16} />, label: 'Overview',    path: '/admin' },
    { icon: <Users size={16} />,           label: 'Users',       path: '/admin/users' },
    { icon: <BookOpen size={16} />,        label: 'Courses',     path: '/admin/courses' },
    { icon: <Settings size={16} />,        label: 'Settings',    path: '/admin/settings' },
  ]

  const navItems =
    user?.role === 'student' ? studentNav :
    user?.role === 'faculty' ? facultyNav :
    adminNav

  const roleName =
    user?.role === 'student' ? 'Student' :
    user?.role === 'faculty' ? 'Faculty' :
    'Admin'

  return (
    <div className="app-layout">

      {/* ── Sidebar ── */}
      <aside className="sidebar">
        <div style={{ padding: '0 20px 16px', borderBottom: '1px solid var(--sidebar-border, #f0f0f0)', marginBottom: 8 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#1e293b' }}>IIPS</div>
          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>Assignment System</div>
        </div>

        <span className="sidebar-label">Menu</span>

        {navItems.map((item) => (
          <button
            key={item.path + item.label}
            className={`sidebar-item ${isActive(item.path) ? 'active' : ''}`}
            onClick={() => navigate(item.path)}
          >
            {item.icon}
            {item.label}
          </button>
        ))}

        {/* Logout at bottom */}
        <div style={{ marginTop: 'auto', padding: '16px 12px 0' }}>
          <button
            className="sidebar-item"
            onClick={logout}
            style={{ color: '#ef4444', width: '100%' }}
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </aside>

      {/* ── Main area ── */}
      <div className="main-content">

        {/* Navbar */}
        <nav className="navbar">
          <div className="navbar-brand">
            <span className="brand-dot" />
            IIPS Assignment System
          </div>
          <div className="navbar-right">
            <span className="navbar-user">👋 {user?.name}</span>
            <span className="navbar-role-badge">{roleName}</span>
          </div>
        </nav>

        {/* Page content */}
        <div className="page-body">
          {children}
        </div>

      </div>
    </div>
  )
}
