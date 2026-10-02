import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookOpen, Clock, CheckCircle, FileText, Mic, Video, AlertCircle } from 'lucide-react'
import Layout from '../../components/Layout'
import api from '../../api/client'

interface Assignment {
  id: string
  title: string
  description: string
  deadline: string | null
  total_marks: number
  submission_modes: string[]
  course_id: string
}

interface Submission {
  id: string
  assignment_id: string
  status: string
}

export default function StudentDashboard() {
  const navigate = useNavigate()
  const [assignments, setAssignments]   = useState<Assignment[]>([])
  const [submissions, setSubmissions]   = useState<Submission[]>([])
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState('')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [assignRes, subRes] = await Promise.all([
        api.get('/assignments'),
        api.get('/submissions'),
      ])
      setAssignments(assignRes.data)
      setSubmissions(subRes.data)
    } catch (err) {
      setError('Failed to load assignments. Please refresh.')
    } finally {
      setLoading(false)
    }
  }

  // Check if student already submitted a specific assignment
  const getSubmission = (assignmentId: string) =>
    submissions.find(s => s.assignment_id === assignmentId)

  // Format deadline nicely
  const formatDeadline = (deadline: string | null) => {
    if (!deadline) return 'No deadline'
    const d = new Date(deadline)
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  const isOverdue = (deadline: string | null) => {
    if (!deadline) return false
    return new Date(deadline) < new Date()
  }

  // Stats
  const submitted = submissions.length
  const pending   = assignments.length - submitted

  return (
    <Layout>
      {/* Header */}
      <div className="page-header">
        <h1>My Assignments</h1>
        <p>View and submit your assignments below</p>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Total Assignments</div>
          <div className="stat-value">{assignments.length}</div>
          <div className="stat-sub">across all courses</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Submitted</div>
          <div className="stat-value" style={{ color: '#10b981' }}>{submitted}</div>
          <div className="stat-sub">completed</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Pending</div>
          <div className="stat-value" style={{ color: '#f59e0b' }}>{pending}</div>
          <div className="stat-sub">to be submitted</div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '12px 16px', marginBottom: 20, color: '#991b1b', fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="text-center" style={{ padding: '60px 0', color: '#94a3b8' }}>
          Loading your assignments...
        </div>
      )}

      {/* Empty state */}
      {!loading && assignments.length === 0 && (
        <div className="card text-center" style={{ padding: '60px 24px' }}>
          <BookOpen size={40} style={{ color: '#cbd5e1', margin: '0 auto 12px' }} />
          <p style={{ color: '#94a3b8', fontSize: 15 }}>No assignments yet</p>
          <p className="text-muted mt-8">You are not enrolled in any course yet. Ask your faculty to enroll you.</p>
        </div>
      )}

      {/* Assignment Cards */}
      {!loading && assignments.length > 0 && (
        <div className="assignments-grid">
          {assignments.map((assignment) => {
            const submission = getSubmission(assignment.id)
            const submitted  = !!submission
            const overdue    = isOverdue(assignment.deadline) && !submitted

            return (
              <div
                key={assignment.id}
                className="card card-hover card-accent-left"
                style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
              >
                {/* Top row */}
                <div className="flex-between">
                  <span className={`badge ${submitted ? 'badge-green' : overdue ? 'badge-red' : 'badge-yellow'}`}>
                    {submitted ? '✓ Submitted' : overdue ? 'Overdue' : 'Pending'}
                  </span>
                  <span style={{ fontSize: 12, color: '#94a3b8' }}>
                    {assignment.total_marks} marks
                  </span>
                </div>

                {/* Title */}
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 600, color: '#1e293b' }}>
                    {assignment.title}
                  </h3>
                  {assignment.description && (
                    <p style={{ fontSize: 13, color: '#64748b', marginTop: 4, lineHeight: 1.5 }}>
                      {assignment.description.length > 80
                        ? assignment.description.slice(0, 80) + '...'
                        : assignment.description}
                    </p>
                  )}
                </div>

                {/* Deadline */}
                <div className="flex gap-8" style={{ color: overdue ? '#ef4444' : '#64748b', fontSize: 13 }}>
                  <Clock size={14} />
                  <span>{formatDeadline(assignment.deadline)}</span>
                </div>

                {/* Submission modes */}
                <div className="flex gap-8">
                  {assignment.submission_modes.includes('text') && (
                    <span title="Text" style={{ color: '#94a3b8' }}><FileText size={16} /></span>
                  )}
                  {assignment.submission_modes.includes('audio') && (
                    <span title="Audio" style={{ color: '#94a3b8' }}><Mic size={16} /></span>
                  )}
                  {assignment.submission_modes.includes('video') && (
                    <span title="Video" style={{ color: '#94a3b8' }}><Video size={16} /></span>
                  )}
                </div>

                <div className="divider" style={{ margin: '4px 0' }} />

                {/* Submit button */}
                {submitted ? (
                  <div className="flex gap-8" style={{ color: '#10b981', fontSize: 13, fontWeight: 500 }}>
                    <CheckCircle size={16} />
                    <span>Submission received</span>
                  </div>
                ) : (
                  <button
                    className="btn btn-primary btn-full"
                    onClick={() => navigate(`/student/submit/${assignment.id}`)}
                    disabled={overdue}
                  >
                    {overdue ? 'Deadline passed' : 'Submit Assignment'}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </Layout>
  )
}
