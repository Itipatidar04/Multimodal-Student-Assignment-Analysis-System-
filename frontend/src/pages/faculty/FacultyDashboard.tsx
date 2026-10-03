import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookOpen, Plus, AlertCircle, Users, Clock, CheckCircle } from 'lucide-react'
import Layout from '../../components/Layout'
import api from '../../api/client'

interface Course {
  id: string
  code: string
  name: string
  student_count: number
}

interface Assignment {
  id: string
  course_id: string
  title: string
  total_submissions: number
  evaluated_count: number
  pending_count: number
}

export default function FacultyDashboard() {
  const navigate = useNavigate()
  const [courses, setCourses] = useState<Course[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [coursesRes, assignmentsRes] = await Promise.all([
        api.get('/faculty/courses'),
        api.get('/faculty/assignments'),
      ])
      setCourses(coursesRes.data)
      setAssignments(assignmentsRes.data)
    } catch (err) {
      setError('Failed to load dashboard. Please refresh.')
    } finally {
      setLoading(false)
    }
  }

  const totalCourses = courses.length
  const totalStudents = courses.reduce((sum, c) => sum + c.student_count, 0)
  const pendingEvaluations = assignments.reduce((sum, a) => sum + a.pending_count, 0)

  return (
    <Layout>
      <div className="page-header">
        <h1>Faculty Dashboard</h1>
        <p>Manage your courses, assignments, and student evaluations</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Courses</div>
          <div className="stat-value">{totalCourses}</div>
          <div className="stat-sub">active courses</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Enrolled Students</div>
          <div className="stat-value" style={{ color: '#3b82f6' }}>{totalStudents}</div>
          <div className="stat-sub">across all courses</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Pending Evaluations</div>
          <div className="stat-value" style={{ color: '#f59e0b' }}>{pendingEvaluations}</div>
          <div className="stat-sub">awaiting review</div>
        </div>
      </div>

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '12px 16px', marginBottom: 20, color: '#991b1b', fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {loading && (
        <div className="text-center" style={{ padding: '60px 0', color: '#94a3b8' }}>
          Loading your dashboard...
        </div>
      )}

      {!loading && (
        <>
          <div style={{ marginBottom: 32 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 600, color: '#1e293b' }}>My Courses</h2>
              <button className="btn btn-primary btn-sm" onClick={() => navigate('/faculty/courses/create')}>
                <Plus size={14} /> New Course
              </button>
            </div>

            {courses.length === 0 ? (
              <div className="card text-center" style={{ padding: '40px 24px' }}>
                <BookOpen size={36} style={{ color: '#cbd5e1', margin: '0 auto 12px' }} />
                <p style={{ color: '#94a3b8', fontSize: 15 }}>No courses yet</p>
              </div>
            ) : (
              <div className="grid-2">
                {courses.map((course) => (
                  <div key={course.id} className="card card-hover card-accent-left">
                    <div className="flex-between">
                      <div>
                        <h3 style={{ fontSize: 15, fontWeight: 600, color: '#1e293b' }}>
                          {course.name}
                        </h3>
                        <p className="text-muted" style={{ marginTop: 4 }}>{course.code}</p>
                      </div>
                      <span className="badge badge-blue">{course.student_count} students</span>
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                      <button className="btn btn-outline btn-sm btn-full" onClick={() => navigate(`/faculty/courses/${course.id}`)}>
                        View
                      </button>
                      <button className="btn btn-ghost btn-sm btn-full" onClick={() => navigate(`/faculty/courses/${course.id}/edit`)}>
                        Edit
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 600, color: '#1e293b' }}>Recent Assignments</h2>
              <button className="btn btn-primary btn-sm" onClick={() => navigate('/faculty/assignments/create')}>
                <Plus size={14} /> Create Assignment
              </button>
            </div>

            {assignments.length === 0 ? (
              <div className="card text-center" style={{ padding: '40px 24px' }}>
                <BookOpen size={36} style={{ color: '#cbd5e1', margin: '0 auto 12px' }} />
                <p style={{ color: '#94a3b8', fontSize: 15 }}>No assignments yet</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {assignments.slice(0, 5).map((assignment) => (
                  <div key={assignment.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h3 style={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>
                        {assignment.title}
                      </h3>
                      <div className="flex gap-16" style={{ marginTop: 8, fontSize: 12, color: '#94a3b8' }}>
                        <span className="flex gap-4">
                          <Users size={12} /> {assignment.total_submissions} submissions
                        </span>
                        <span className="flex gap-4">
                          <CheckCircle size={12} /> {assignment.evaluated_count} evaluated
                        </span>
                        <span className="flex gap-4">
                          <Clock size={12} /> {assignment.pending_count} pending
                        </span>
                      </div>
                    </div>
                    <button className="btn btn-outline btn-sm" onClick={() => navigate(`/faculty/assignments/${assignment.id}`)}>
                      Review
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </Layout>
  )
}
