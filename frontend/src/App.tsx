import type { ReactElement } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'

// Pages (we'll create these next)
import Login from './pages/Login'
import StudentDashboard from './pages/student/StudentDashboard'
import SubmissionPage from './pages/student/SubmissionPage'
import EvaluationResult from './pages/student/EvaluationResult'
import FacultyDashboard from './pages/faculty/FacultyDashboard'
import AdminDashboard from './pages/admin/AdminDashboard'

// ── Protected Route ──────────────────────────────────────────
// Redirects to /login if not logged in
// Redirects to correct dashboard if wrong role
function ProtectedRoute({
  children,
  allowedRole,
}: {
  children: ReactElement
  allowedRole: 'student' | 'faculty' | 'admin'
}) {

  const { user, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <p style={{ color: '#94a3b8', fontFamily: 'Inter, sans-serif' }}>Loading...</p>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  if (user.role !== allowedRole) {
    // Redirect to correct dashboard based on their role
    if (user.role === 'student') return <Navigate to="/student" replace />
    if (user.role === 'faculty') return <Navigate to="/faculty" replace />
    if (user.role === 'admin')   return <Navigate to="/admin" replace />
  }

  return children
}

// ── Root redirect based on role ──────────────────────────────
function RootRedirect() {
  const { user, isLoading } = useAuth()

  if (isLoading) return null

  if (!user) return <Navigate to="/login" replace />
  if (user.role === 'student') return <Navigate to="/student" replace />
  if (user.role === 'faculty') return <Navigate to="/faculty" replace />
  if (user.role === 'admin')   return <Navigate to="/admin" replace />

  return <Navigate to="/login" replace />
}

// ── App Routes ────────────────────────────────────────────────
export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<Login />} />

      {/* Root → redirect based on role */}
      <Route path="/" element={<RootRedirect />} />

      {/* Student routes */}
      <Route path="/student" element={
        <ProtectedRoute allowedRole="student">
          <StudentDashboard />
        </ProtectedRoute>
      } />
      <Route path="/student/submit/:assignmentId" element={
        <ProtectedRoute allowedRole="student">
          <SubmissionPage />
        </ProtectedRoute>
      } />
      <Route path="/student/result/:submissionId" element={
        <ProtectedRoute allowedRole="student">
          <EvaluationResult />
        </ProtectedRoute>
      } />

      {/* Faculty routes */}
      <Route path="/faculty" element={
        <ProtectedRoute allowedRole="faculty">
          <FacultyDashboard />
        </ProtectedRoute>
      } />

      {/* Admin routes */}
      <Route path="/admin" element={
        <ProtectedRoute allowedRole="admin">
          <AdminDashboard />
        </ProtectedRoute>
      } />

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
