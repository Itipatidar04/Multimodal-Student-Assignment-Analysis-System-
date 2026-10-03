import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BookOpen, Clock, CheckCircle, FileText, Mic, Video,
  AlertCircle, Plus, Search, GraduationCap, Award,
} from 'lucide-react'
import Layout from '../../components/Layout'
import {
  getAssignments, getSubmissions, getEnrolledCourses, getAllCourses, enrollInCourse,
  type Assignment, type Submission, type Course,
} from '../../api/student'

type ActiveTab = 'assignments' | 'courses'

export default function StudentDashboard() {
  const navigate = useNavigate()

  // Data
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [enrolledCourses, setEnrolledCourses] = useState<Course[]>([])
  const [allCourses, setAllCourses] = useState<Course[]>([])

  // UI
  const [activeTab, setActiveTab] = useState<ActiveTab>('assignments')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [courseSearch, setCourseSearch] = useState('')
  const [enrollingId, setEnrollingId] = useState<string | null>(null)
  const [enrollSuccess, setEnrollSuccess] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [assignRes, subRes, enrolledRes, allRes] = await Promise.all([
        getAssignments(),
        getSubmissions(),
        getEnrolledCourses(),
        getAllCourses(),
      ])
      setAssignments(assignRes)
      setSubmissions(subRes)
      setEnrolledCourses(enrolledRes)
      setAllCourses(allRes)
    } catch {
      setError('Failed to load data. Please refresh.')
    } finally {
      setLoading(false)
    }
  }

  const handleEnroll = async (courseId: string) => {
    setEnrollingId(courseId)
    setEnrollSuccess(null)
    try {
      await enrollInCourse(courseId)
      setEnrollSuccess(courseId)
      await fetchData()
    } catch (err: any) {
      const msg = err?.response?.data?.detail || 'Enrollment failed.'
      setError(msg)
    } finally {
      setEnrollingId(null)
    }
  }

  // Helpers
  const getSubmission = (assignmentId: string) =>
    submissions.find(s => s.assignment_id === assignmentId)

  const formatDeadline = (deadline: string | null) => {
    if (!deadline) return 'No deadline'
    return new Date(deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  const isOverdue = (deadline: string | null) => {
    if (!deadline) return false
    return new Date(deadline) < new Date()
  }

  const isEnrolled = (courseId: string) =>
    enrolledCourses.some(c => c.id === courseId)

  // Stats
  const submitted = submissions.length
  const pending = assignments.length - submitted

  // Filtered courses for the browse tab (all courses not yet enrolled)
  const filteredCourses = allCourses.filter(c => {
    const matchSearch = courseSearch === '' ||
      c.name.toLowerCase().includes(courseSearch.toLowerCase()) ||
      c.code.toLowerCase().includes(courseSearch.toLowerCase())
    return matchSearch
  })

  return (
    <Layout>
      {/* Header */}
      <div className="page-header">
        <h1>Student Dashboard</h1>
        <p>View assignments, submit work, and track your progress</p>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Enrolled Courses</div>
          <div className="stat-value">{enrolledCourses.length}</div>
          <div className="stat-sub">active courses</div>
        </div>
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
        <div style={{
          background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10,
          padding: '12px 16px', marginBottom: 20, color: '#991b1b', fontSize: 14,
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <AlertCircle size={16} /> {error}
          <button
            style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#991b1b', fontSize: 12 }}
            onClick={() => setError('')}
          >✕</button>
        </div>
      )}

      {/* Tab navigation */}
      <div style={{ display: 'flex', borderBottom: '1px solid #e8e8e8', marginBottom: 28 }}>
        {([
          { key: 'assignments', label: 'My Assignments', icon: <FileText size={15} />, count: assignments.length },
          { key: 'courses',     label: 'Browse Courses', icon: <BookOpen size={15} />, count: allCourses.length },
        ] as { key: ActiveTab; label: string; icon: React.ReactElement; count: number }[]).map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '12px 20px', fontSize: 14, fontWeight: activeTab === tab.key ? 600 : 500,
              border: 'none', background: 'none', cursor: 'pointer',
              color: activeTab === tab.key ? 'var(--accent, #f5c518)' : '#64748b',
              borderBottom: `2px solid ${activeTab === tab.key ? 'var(--accent, #f5c518)' : 'transparent'}`,
              transition: 'all 0.15s', marginBottom: -1,
            }}
          >
            {tab.icon}
            {tab.label}
            {!loading && (
              <span style={{
                fontSize: 11, fontWeight: 600, padding: '1px 7px', borderRadius: 99,
                background: activeTab === tab.key ? 'var(--accent-light, #fef9e7)' : '#f1f5f9',
                color: activeTab === tab.key ? 'var(--accent-text, #92700a)' : '#94a3b8',
              }}>{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── ASSIGNMENTS TAB ── */}
      {activeTab === 'assignments' && (
        <div>
          {loading ? (
            <div className="text-center" style={{ padding: '60px 0', color: '#94a3b8' }}>
              Loading your assignments...
            </div>
          ) : assignments.length === 0 ? (
            <div className="card text-center" style={{ padding: '60px 24px' }}>
              <BookOpen size={40} style={{ color: '#cbd5e1', margin: '0 auto 12px' }} />
              <h3 style={{ fontSize: 17, fontWeight: 600, color: '#1e293b', marginBottom: 8 }}>No Assignments Yet</h3>
              <p className="text-muted">
                You're not enrolled in any courses with assignments yet.
              </p>
              <button
                className="btn btn-primary mt-24"
                onClick={() => setActiveTab('courses')}
              >
                <Plus size={15} /> Browse & Enroll in Courses
              </button>
            </div>
          ) : (
            <div className="assignments-grid">
              {assignments.map(assignment => {
                const submission = getSubmission(assignment.id)
                const isSubmitted = !!submission
                const overdue = isOverdue(assignment.deadline) && !isSubmitted
                const hasResult = submission && submission.status !== 'submitted' && submission.status !== 'processing'

                return (
                  <div
                    key={assignment.id}
                    className="card card-hover card-accent-left"
                    style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
                  >
                    {/* Top row */}
                    <div className="flex-between">
                      <span className={`badge ${isSubmitted ? 'badge-green' : overdue ? 'badge-red' : 'badge-yellow'}`}>
                        {isSubmitted ? '✓ Submitted' : overdue ? 'Overdue' : 'Pending'}
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

                    {/* Action */}
                    {isSubmitted ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div className="flex gap-8" style={{ color: '#10b981', fontSize: 13, fontWeight: 500 }}>
                          <CheckCircle size={16} />
                          <span>Submission received</span>
                        </div>
                        {/* View result button if evaluated */}
                        <button
                          className="btn btn-outline btn-sm"
                          onClick={() => navigate(`/student/result/${submission.id}`)}
                          style={{ gap: 6 }}
                        >
                          <Award size={13} />
                          {hasResult ? 'View Result' : 'Check Status'}
                        </button>
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
        </div>
      )}

      {/* ── COURSES TAB ── */}
      {activeTab === 'courses' && (
        <div>
          {/* Enrolled courses section */}
          {enrolledCourses.length > 0 && (
            <div style={{ marginBottom: 32 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', marginBottom: 14 }}>
                <GraduationCap size={16} style={{ display: 'inline', marginRight: 8 }} />
                Enrolled Courses ({enrolledCourses.length})
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {enrolledCourses.map(c => (
                  <div key={c.id} style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '12px 18px',
                  }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 8, background: '#10b981',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      <BookOpen size={18} color="#fff" />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>{c.name}</div>
                      <div style={{ fontSize: 12, color: '#64748b' }}>{c.code}{c.semester ? ` · Sem ${c.semester}` : ''}</div>
                    </div>
                    <span style={{ background: '#dcfce7', color: '#15803d', borderRadius: 99, padding: '3px 10px', fontSize: 12, fontWeight: 600 }}>
                      ✓ Enrolled
                    </span>
                  </div>
                ))}
              </div>
              <div className="divider" style={{ margin: '24px 0' }} />
            </div>
          )}

          {/* Browse all courses */}
          <div className="flex-between" style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1e293b' }}>
              All Available Courses
            </h3>
            <div style={{ position: 'relative', minWidth: 220 }}>
              <Search size={14} style={{
                position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
                color: '#94a3b8', pointerEvents: 'none',
              }} />
              <input
                value={courseSearch}
                onChange={e => setCourseSearch(e.target.value)}
                placeholder="Search courses..."
                style={{ paddingLeft: 30, fontSize: 13, padding: '8px 10px 8px 30px' }}
              />
            </div>
          </div>

          {loading ? (
            <div className="text-center text-muted" style={{ padding: '40px 0' }}>Loading courses...</div>
          ) : filteredCourses.length === 0 ? (
            <div className="card text-center" style={{ padding: '40px' }}>
              <p className="text-muted">No courses found.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {filteredCourses.map(c => {
                const enrolled = isEnrolled(c.id)
                return (
                  <div key={c.id} className="card" style={{ padding: '16px 20px' }}>
                    <div className="flex-between">
                      <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                        <div style={{
                          width: 40, height: 40, borderRadius: 10,
                          background: enrolled ? '#ecfdf5' : 'var(--accent-light, #fef9e7)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                        }}>
                          <BookOpen size={18} color={enrolled ? '#10b981' : 'var(--accent, #f5c518)'} />
                        </div>
                        <div>
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 2 }}>
                            <span style={{ fontSize: 14, fontWeight: 700, color: '#1e293b' }}>{c.name}</span>
                            <span className="badge badge-yellow">{c.code}</span>
                            {c.semester && <span className="badge badge-grey">Sem {c.semester}</span>}
                          </div>
                          {c.description && (
                            <p style={{ fontSize: 12, color: '#64748b' }}>
                              {c.description.length > 80 ? c.description.slice(0, 80) + '...' : c.description}
                            </p>
                          )}
                        </div>
                      </div>

                      {enrolled ? (
                        <span style={{ background: '#dcfce7', color: '#15803d', borderRadius: 99, padding: '5px 14px', fontSize: 12, fontWeight: 600, flexShrink: 0 }}>
                          ✓ Enrolled
                        </span>
                      ) : (
                        <button
                          className="btn btn-primary btn-sm"
                          style={{ flexShrink: 0 }}
                          onClick={() => handleEnroll(c.id)}
                          disabled={enrollingId === c.id}
                        >
                          {enrollingId === c.id ? 'Enrolling...' : (
                            <><Plus size={13} /> Enroll</>
                          )}
                        </button>
                      )}
                    </div>
                    {enrollSuccess === c.id && (
                      <div style={{ marginTop: 10, color: '#15803d', fontSize: 13, fontWeight: 500 }}>
                        <CheckCircle size={14} style={{ display: 'inline', marginRight: 6 }} />
                        Enrolled successfully!
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </Layout>
  )
}
