import { useState, useEffect } from 'react'
import type { ReactElement } from 'react'
import {
  BookOpen, Plus, Send, ChevronRight,
  Clock, FileText, Mic, Video, AlertCircle, User,
  CheckCircle, Filter,
} from 'lucide-react'
import Layout from '../../components/Layout'
import CreateCourseModal from '../../components/CreateCourseModal'
import CreateAssignmentModal from '../../components/CreateAssignmentModal'
import CourseDetailPanel from './CourseDetailPanel'
import SubmissionDetailPanel from './SubmissionDetailPanel'
import {
  getCourses, getAssignments, getSubmissions,
  type Course, type Assignment, type Submission,
} from '../../api/faculty'

// ── Tab type ──────────────────────────────────────────────────────
type Tab = 'courses' | 'assignments' | 'submissions'

export default function FacultyDashboard() {
  const [activeTab, setActiveTab]           = useState<Tab>('courses')
  const [courses, setCourses]               = useState<Course[]>([])
  const [assignments, setAssignments]       = useState<Assignment[]>([])
  const [submissions, setSubmissions]       = useState<Submission[]>([])
  const [loading, setLoading]               = useState(true)
  const [error, setError]                   = useState('')

  // Modals
  const [showCreateCourse, setShowCreateCourse]         = useState(false)
  const [showCreateAssignment, setShowCreateAssignment] = useState(false)
  const [createAssignmentCourseId, setCreateAssignmentCourseId] = useState<string | undefined>()

  // Detail panel
  const [selectedCourse, setSelectedCourse]         = useState<Course | null>(null)
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null)

  // Submissions filter
  const [filterAssignmentId, setFilterAssignmentId] = useState<string>('all')


  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [c, a] = await Promise.all([
        getCourses(),
        getAssignments(),
      ])
      setCourses(c)
      setAssignments(a)
      try {
        setSubmissions(await getSubmissions())
      } catch {
        setSubmissions([])
      }
    } catch {
      setError('Failed to load data. Please refresh.')
    } finally {
      setLoading(false)
    }
  }

  // ── Handlers ──────────────────────────────────────────────────
  const handleCourseCreated = (course: Course) => {
    setCourses(prev => [course, ...prev])
  }

  const handleAssignmentCreated = (assignment: Assignment) => {
    setAssignments(prev => [assignment, ...prev])
    setActiveTab('assignments')
  }

  const openCreateAssignment = (courseId?: string) => {
    setCreateAssignmentCourseId(courseId)
    setShowCreateAssignment(true)
    setSelectedCourse(null)
  }

  // ── Helpers ───────────────────────────────────────────────────
  const getCourseForAssignment = (courseId: string) =>
    courses.find(c => c.id === courseId)

  const getAssignmentForSubmission = (assignmentId: string) =>
    assignments.find(a => a.id === assignmentId)

  const formatDate = (dt: string | null) => {
    if (!dt) return 'No deadline'
    return new Date(dt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  const formatSize = (bytes: number | null) => {
    if (!bytes) return ''
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const modeIcons: Record<string, ReactElement> = {
    text:  <FileText size={13} />,
    audio: <Mic size={13} />,
    video: <Video size={13} />,
  }

  const typeColors: Record<string, string> = {
    text: 'badge-blue', audio: 'badge-purple', video: 'badge-orange',
  }

  const filteredSubmissions = filterAssignmentId === 'all'
    ? submissions
    : submissions.filter(s => s.assignment_id === filterAssignmentId)

  return (
    <Layout>
      {/* Page header */}
      <div className="page-header">
        <h1>Faculty Dashboard</h1>
        <p>Manage your courses, assignments, and review student submissions</p>
      </div>

      {/* ── Stats row ─────────────────────────────────────────── */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
        <div className="stat-card">
          <div className="stat-label">Courses</div>
          <div className="stat-value">{loading ? '—' : courses.length}</div>
          <div className="stat-sub">active courses</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Assignments</div>
          <div className="stat-value">{loading ? '—' : assignments.length}</div>
          <div className="stat-sub">created</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Submissions</div>
          <div className="stat-value" style={{ color: '#10b981' }}>{loading ? '—' : submissions.length}</div>
          <div className="stat-sub">received</div>
        </div>
      </div>

      {/* ── Error ─────────────────────────────────────────────── */}
      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10,
          padding: '12px 16px', marginBottom: 20, color: '#991b1b', fontSize: 14,
          display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* ── Tab navigation ────────────────────────────────────── */}
      <div style={{
        display: 'flex', gap: 0, borderBottom: '1px solid #e8e8e8',
        marginBottom: 28,
      }}>
        {([
          { key: 'courses',     label: 'My Courses',  icon: <BookOpen size={15} />, count: courses.length },
          { key: 'assignments', label: 'Assignments',  icon: <FileText size={15} />, count: assignments.length },
          { key: 'submissions', label: 'Submissions',  icon: <Send size={15} />,     count: submissions.length },
        ] as { key: Tab; label: string; icon: ReactElement; count: number }[]).map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '12px 20px', fontSize: 14, fontWeight: activeTab === tab.key ? 600 : 500,
              border: 'none', background: 'none', cursor: 'pointer',
              color: activeTab === tab.key ? 'var(--accent, #9b87c4)' : '#64748b',
              borderBottom: `2px solid ${activeTab === tab.key ? 'var(--accent, #9b87c4)' : 'transparent'}`,
              transition: 'all 0.15s', marginBottom: -1,
            }}
          >
            {tab.icon}
            {tab.label}
            {!loading && (
              <span style={{
                fontSize: 11, fontWeight: 600, padding: '1px 7px', borderRadius: 99,
                background: activeTab === tab.key ? 'var(--accent-light, #f5f0ff)' : '#f1f5f9',
                color: activeTab === tab.key ? 'var(--accent-text, #5b4a8a)' : '#94a3b8',
              }}>{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════
          COURSES TAB
      ══════════════════════════════════════════════════════ */}
      {activeTab === 'courses' && (
        <div>
          {/* Action row */}
          <div className="flex-between" style={{ marginBottom: 20 }}>
            <p style={{ color: '#64748b', fontSize: 14 }}>
              {courses.length === 0 ? 'No courses yet. Create your first course!' : `${courses.length} course${courses.length !== 1 ? 's' : ''}`}
            </p>
            <button className="btn btn-primary" onClick={() => setShowCreateCourse(true)}>
              <Plus size={16} /> New Course
            </button>
          </div>

          {loading ? (
            <div className="text-center text-muted" style={{ padding: '60px 0' }}>Loading courses...</div>
          ) : courses.length === 0 ? (
            <div className="card text-center" style={{ padding: '60px 24px' }}>
              <BookOpen size={40} style={{ color: '#cbd5e1', margin: '0 auto 16px', display: 'block' }} />
              <h3 style={{ fontSize: 18, fontWeight: 600, color: '#1e293b', marginBottom: 8 }}>No courses yet</h3>
              <p className="text-muted">Create your first course to get started.</p>
              <button className="btn btn-primary mt-24" onClick={() => setShowCreateCourse(true)}>
                <Plus size={16} /> Create Course
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
              {courses.map(course => {
                const courseAssignments = assignments.filter(a => a.course_id === course.id)
                return (
                  <div
                    key={course.id}
                    className="card card-hover"
                    onClick={() => setSelectedCourse(course)}
                    style={{ cursor: 'pointer', borderTop: '4px solid var(--accent, #9b87c4)' }}
                  >
                    <div className="flex-between" style={{ marginBottom: 12 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent, #9b87c4)',
                        textTransform: 'uppercase', letterSpacing: 1 }}>
                        {course.code}
                      </span>
                      <div className="flex gap-8">
                        {course.semester && <span className="badge badge-purple">{course.semester}</span>}
                        {course.year && <span className="badge badge-grey">{course.year}</span>}
                      </div>
                    </div>

                    <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>
                      {course.name}
                    </h3>

                    {course.description && (
                      <p style={{ fontSize: 13, color: '#64748b', marginBottom: 16, lineHeight: 1.5 }}>
                        {course.description.length > 100
                          ? course.description.slice(0, 100) + '...'
                          : course.description}
                      </p>
                    )}

                    <div className="divider" style={{ margin: '12px 0' }} />

                    <div className="flex-between">
                      <div className="flex gap-8" style={{ color: '#64748b', fontSize: 13 }}>
                        <FileText size={14} />
                        <span>{courseAssignments.length} assignment{courseAssignments.length !== 1 ? 's' : ''}</span>
                      </div>
                      <div className="flex gap-6" style={{ color: 'var(--accent, #9b87c4)', fontSize: 13, fontWeight: 500 }}>
                        View details <ChevronRight size={14} />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          ASSIGNMENTS TAB
      ══════════════════════════════════════════════════════ */}
      {activeTab === 'assignments' && (
        <div>
          <div className="flex-between" style={{ marginBottom: 20 }}>
            <p style={{ color: '#64748b', fontSize: 14 }}>
              {assignments.length} assignment{assignments.length !== 1 ? 's' : ''} across all courses
            </p>
            <button
              className="btn btn-primary"
              onClick={() => openCreateAssignment()}
              disabled={courses.length === 0}
              title={courses.length === 0 ? 'Create a course first' : ''}
            >
              <Plus size={16} /> New Assignment
            </button>
          </div>

          {courses.length === 0 && (
            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10,
              padding: '12px 16px', marginBottom: 20, color: '#92400e', fontSize: 13 }}>
              ⚠️ Create a course first before adding assignments.
            </div>
          )}

          {loading ? (
            <div className="text-center text-muted" style={{ padding: '60px 0' }}>Loading assignments...</div>
          ) : assignments.length === 0 ? (
            <div className="card text-center" style={{ padding: '60px 24px' }}>
              <FileText size={40} style={{ color: '#cbd5e1', margin: '0 auto 16px', display: 'block' }} />
              <h3 style={{ fontSize: 18, fontWeight: 600, color: '#1e293b', marginBottom: 8 }}>No assignments yet</h3>
              <p className="text-muted">Create your first assignment from the Courses tab or here.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {assignments.map(a => {
                const course = getCourseForAssignment(a.course_id)
                const assignmentSubmissions = submissions.filter(s => s.assignment_id === a.id)
                const isOverdue = a.deadline ? new Date(a.deadline) < new Date() : false
                return (
                  <div key={a.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div className="flex-between">
                      <div>
                        {course && (
                          <div style={{ fontSize: 12, color: 'var(--accent, #9b87c4)', fontWeight: 600,
                            marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                            {course.code} — {course.name}
                          </div>
                        )}
                        <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1e293b' }}>{a.title}</h3>
                        {a.description && (
                          <p style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
                            {a.description.length > 120 ? a.description.slice(0, 120) + '...' : a.description}
                          </p>
                        )}
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 16 }}>
                        <span className="badge badge-purple" style={{ marginBottom: 6, display: 'block' }}>{a.total_marks} marks</span>
                        <span className={`badge ${isOverdue ? 'badge-red' : 'badge-green'}`}>
                          {isOverdue ? 'Overdue' : 'Active'}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-16" style={{ flexWrap: 'wrap' }}>
                      <div className="flex gap-8" style={{ color: '#64748b', fontSize: 13 }}>
                        <Clock size={13} /> {formatDate(a.deadline)}
                      </div>
                      <div className="flex gap-6">
                        {a.submission_modes.map((m: string) => (
                          <span key={m} title={m} style={{ color: '#94a3b8' }}>{modeIcons[m]}</span>
                        ))}
                      </div>
                      {a.questions.length > 0 && (
                        <span className="badge badge-grey">{a.questions.length} question{a.questions.length !== 1 ? 's' : ''}</span>
                      )}
                    </div>

                    <div className="divider" style={{ margin: '4px 0' }} />

                    <div className="flex-between">
                      <div className="flex gap-8" style={{ color: '#10b981', fontSize: 13, fontWeight: 500 }}>
                        <CheckCircle size={14} />
                        <span>{assignmentSubmissions.length} submission{assignmentSubmissions.length !== 1 ? 's' : ''} received</span>
                      </div>
                      <button
                        className="btn btn-outline btn-sm"
                        onClick={() => {
                          setFilterAssignmentId(a.id)
                          setActiveTab('submissions')
                        }}
                      >
                        View Submissions
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          SUBMISSIONS TAB
      ══════════════════════════════════════════════════════ */}
      {activeTab === 'submissions' && (
        <div>
          {/* Filter row */}
          <div className="flex-between" style={{ marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
            <div className="flex gap-8">
              <Filter size={15} style={{ color: '#94a3b8' }} />
              <select
                value={filterAssignmentId}
                onChange={e => setFilterAssignmentId(e.target.value)}
                style={{ width: 'auto', fontSize: 13, padding: '6px 12px' }}
              >
                <option value="all">All assignments</option>
                {assignments.map(a => (
                  <option key={a.id} value={a.id}>{a.title}</option>
                ))}
              </select>
            </div>
            <p style={{ color: '#64748b', fontSize: 14 }}>
              {filteredSubmissions.length} submission{filteredSubmissions.length !== 1 ? 's' : ''}
            </p>
          </div>

          {loading ? (
            <div className="text-center text-muted" style={{ padding: '60px 0' }}>Loading submissions...</div>
          ) : filteredSubmissions.length === 0 ? (
            <div className="card text-center" style={{ padding: '60px 24px' }}>
              <Send size={40} style={{ color: '#cbd5e1', margin: '0 auto 16px', display: 'block' }} />
              <h3 style={{ fontSize: 18, fontWeight: 600, color: '#1e293b', marginBottom: 8 }}>No submissions yet</h3>
              <p className="text-muted">Submissions will appear here once students submit.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {filteredSubmissions.map(s => {
                const assignment = getAssignmentForSubmission(s.assignment_id)
                const course = assignment ? getCourseForAssignment(assignment.course_id) : null
                return (
                  <div
                    key={s.id}
                    className="card card-hover"
                    style={{ padding: '16px 20px', cursor: 'pointer' }}
                    onClick={() => setSelectedSubmission(s)}
                  >
                    <div className="flex-between" style={{ marginBottom: 8 }}>
                      <div style={{ flex: 1 }}>
                        {assignment && (
                          <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 2 }}>
                            {course?.code} · {assignment.title}
                          </div>
                        )}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{
                            width: 30, height: 30, borderRadius: '50%', background: 'var(--accent-light, #f5f0ff)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                            fontSize: 12, fontWeight: 700, color: 'var(--accent, #9b87c4)',
                          }}>
                            <User size={14} />
                          </div>
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>
                              Student ID: {s.student_id.slice(0, 8)}...
                            </div>
                            <div style={{ fontSize: 12, color: '#94a3b8' }}>
                              {new Date(s.submitted_at).toLocaleString('en-IN', {
                                day: 'numeric', month: 'short', year: 'numeric',
                                hour: '2-digit', minute: '2-digit'
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                        <span className={`badge ${typeColors[s.submission_type] || 'badge-grey'}`}>
                          {s.submission_type}
                        </span>
                        <span className="badge badge-green">✓ {s.status}</span>
                      </div>
                    </div>

                    {/* Preview */}
                    {s.submission_type === 'text' && s.text_content && (
                      <div style={{
                        background: '#f8fafc', borderRadius: 8, padding: '10px 14px',
                        fontSize: 13, color: '#475569', marginTop: 8, lineHeight: 1.6,
                        borderLeft: '3px solid var(--accent, #9b87c4)',
                      }}>
                        {s.text_content.length > 200
                          ? s.text_content.slice(0, 200) + '...'
                          : s.text_content}
                      </div>
                    )}

                    {(s.submission_type === 'audio' || s.submission_type === 'video') && s.file_name && (
                      <div className="flex gap-8" style={{ marginTop: 8, color: '#64748b', fontSize: 13 }}>
                        {s.submission_type === 'audio' ? <Mic size={14} /> : <Video size={14} />}
                        <span>{s.file_name}</span>
                        {s.file_size_bytes && <span className="badge badge-grey">{formatSize(s.file_size_bytes)}</span>}
                      </div>
                    )}

                    <div className="flex-between" style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid #f1f5f9' }}>
                      <span style={{ fontSize: 12, color: 'var(--accent, #9b87c4)', fontWeight: 600 }}>
                        Click to review submission & AI score →
                      </span>
                    </div>
                  </div>

                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Modals ────────────────────────────────────────────── */}
      <CreateCourseModal
        isOpen={showCreateCourse}
        onClose={() => setShowCreateCourse(false)}
        onCreated={handleCourseCreated}
      />

      <CreateAssignmentModal
        isOpen={showCreateAssignment}
        onClose={() => setShowCreateAssignment(false)}
        onCreated={handleAssignmentCreated}
        courses={courses}
        defaultCourseId={createAssignmentCourseId}
      />

      {/* ── Course detail panel ───────────────────────────────── */}
      {selectedCourse && (
        <CourseDetailPanel
          course={selectedCourse}
          onClose={() => setSelectedCourse(null)}
          onCreateAssignment={(courseId) => openCreateAssignment(courseId)}
        />
      )}

      {/* ── Submission detail panel ─────────────────────────────── */}
      {selectedSubmission && (
        <SubmissionDetailPanel
          submission={selectedSubmission}
          assignment={getAssignmentForSubmission(selectedSubmission.assignment_id)}
          onClose={() => setSelectedSubmission(null)}
          onEvaluated={() => fetchData()}
        />
      )}
    </Layout>
  )
}

