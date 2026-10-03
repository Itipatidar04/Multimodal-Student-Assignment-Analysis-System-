import { useState, useEffect } from 'react'
import type { ReactElement } from 'react'
import {
  X, BookOpen, Plus, Clock, FileText, Mic, Video,
  GraduationCap,
} from 'lucide-react'
import {
  type Course, type Assignment, type Student,
  getCourseStudents, getAssignments,
} from '../../api/faculty'

interface Props {
  course: Course
  onClose: () => void
  onCreateAssignment: (courseId: string) => void
}

export default function CourseDetailPanel({ course, onClose, onCreateAssignment }: Props) {
  const [students, setStudents]       = useState<Student[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [loadingS, setLoadingS]       = useState(true)
  const [loadingA, setLoadingA]       = useState(true)
  const [activeTab, setActiveTab]     = useState<'students' | 'assignments'>('assignments')

  useEffect(() => {
    getCourseStudents(course.id)
      .then(setStudents)
      .finally(() => setLoadingS(false))
    getAssignments(course.id)
      .then(setAssignments)
      .finally(() => setLoadingA(false))
  }, [course.id])

  const formatDate = (dt: string | null) => {
    if (!dt) return 'No deadline'
    return new Date(dt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  const modeIcons: Record<string, ReactElement> = {
    text:  <FileText size={13} />,
    audio: <Mic size={13} />,
    video: <Video size={13} />,
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 900,
      background: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(2px)',
      display: 'flex', justifyContent: 'flex-end',
      animation: 'fadeIn 0.2s ease',
    }} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{
        width: '100%', maxWidth: 560, background: '#ffffff',
        boxShadow: '-8px 0 40px rgba(0,0,0,0.15)',
        display: 'flex', flexDirection: 'column',
        animation: 'slideInRight 0.25s ease',
        overflowY: 'auto',
      }}>
        {/* Header */}
        <div style={{
          padding: '24px 28px 20px', borderBottom: '1px solid #e8e8e8',
          background: 'var(--accent-light, #f5f0ff)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--accent, #9b87c4)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <BookOpen size={18} color="#fff" />
                </div>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent-text, #5b4a8a)',
                  textTransform: 'uppercase', letterSpacing: 1 }}>{course.code}</span>
              </div>
              <h2 style={{ fontSize: 19, fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>{course.name}</h2>
              {course.description && (
                <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.5 }}>{course.description}</p>
              )}
              <div style={{ display: 'flex', gap: 12, marginTop: 10 }}>
                {course.semester && (
                  <span className="badge badge-purple">{course.semester} Sem</span>
                )}
                {course.year && (
                  <span className="badge badge-grey">{course.year}</span>
                )}
              </div>
            </div>
            <button onClick={onClose} style={{
              background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8,
              width: 32, height: 32, display: 'flex', alignItems: 'center',
              justifyContent: 'center', cursor: 'pointer', color: '#64748b', marginLeft: 12,
            }}>
              <X size={16} />
            </button>
          </div>

          {/* Quick stats */}
          <div style={{ display: 'flex', gap: 16, marginTop: 16 }}>
            <div style={{ textAlign: 'center', background: '#fff', borderRadius: 8, padding: '8px 16px' }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--accent, #9b87c4)' }}>
                {loadingS ? '—' : students.length}
              </div>
              <div style={{ fontSize: 11, color: '#94a3b8' }}>Students</div>
            </div>
            <div style={{ textAlign: 'center', background: '#fff', borderRadius: 8, padding: '8px 16px' }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--accent, #9b87c4)' }}>
                {loadingA ? '—' : assignments.length}
              </div>
              <div style={{ fontSize: 11, color: '#94a3b8' }}>Assignments</div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid #e8e8e8', padding: '0 28px' }}>
          {(['assignments', 'students'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              padding: '14px 0', marginRight: 24, fontSize: 14, fontWeight: 500,
              border: 'none', background: 'none', cursor: 'pointer',
              color: activeTab === tab ? 'var(--accent, #9b87c4)' : '#64748b',
              borderBottom: `2px solid ${activeTab === tab ? 'var(--accent, #9b87c4)' : 'transparent'}`,
              transition: 'all 0.15s',
            }}>
              {tab === 'assignments' ? `Assignments (${assignments.length})` : `Students (${students.length})`}
            </button>
          ))}
        </div>

        {/* Body */}
        <div style={{ flex: 1, padding: '20px 28px', overflowY: 'auto' }}>

          {/* Assignments tab */}
          {activeTab === 'assignments' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => onCreateAssignment(course.id)}
                >
                  <Plus size={14} /> New Assignment
                </button>
              </div>

              {loadingA ? (
                <div className="text-center text-muted" style={{ padding: '40px 0' }}>Loading assignments...</div>
              ) : assignments.length === 0 ? (
                <div className="text-center" style={{ padding: '40px 0' }}>
                  <BookOpen size={36} style={{ color: '#cbd5e1', margin: '0 auto 12px', display: 'block' }} />
                  <p className="text-muted">No assignments yet.</p>
                  <p className="text-muted" style={{ fontSize: 12 }}>Click "New Assignment" to create one.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {assignments.map(a => (
                    <div key={a.id} className="card" style={{ padding: '16px 20px' }}>
                      <div className="flex-between" style={{ marginBottom: 8 }}>
                        <h4 style={{ fontSize: 15, fontWeight: 600, color: '#1e293b' }}>{a.title}</h4>
                        <span className="badge badge-purple">{a.total_marks}M</span>
                      </div>
                      {a.description && (
                        <p style={{ fontSize: 13, color: '#64748b', marginBottom: 10 }}>
                          {a.description.length > 100 ? a.description.slice(0, 100) + '...' : a.description}
                        </p>
                      )}
                      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                        <div className="flex gap-8" style={{ color: '#64748b', fontSize: 12 }}>
                          <Clock size={13} /> {formatDate(a.deadline)}
                        </div>
                        <div className="flex gap-6">
                          {a.submission_modes.map((m: string) => (
                            <span key={m} style={{ color: '#94a3b8' }} title={m}>{modeIcons[m]}</span>
                          ))}
                        </div>
                        {a.questions.length > 0 && (
                          <span className="badge badge-grey">{a.questions.length} Q</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Students tab */}
          {activeTab === 'students' && (
            <div>
              {loadingS ? (
                <div className="text-center text-muted" style={{ padding: '40px 0' }}>Loading students...</div>
              ) : students.length === 0 ? (
                <div className="text-center" style={{ padding: '40px 0' }}>
                  <GraduationCap size={36} style={{ color: '#cbd5e1', margin: '0 auto 12px', display: 'block' }} />
                  <p className="text-muted">No students enrolled yet.</p>
                  <p className="text-muted" style={{ fontSize: 12 }}>Share the course code with students so they can enroll.</p>
                  <div style={{ marginTop: 12, background: 'var(--accent-light, #f5f0ff)',
                    borderRadius: 8, padding: '10px 16px', display: 'inline-block' }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent-text, #5b4a8a)' }}>
                      Course Code: {course.code}
                    </span>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {students.map(s => (
                    <div key={s.id} style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '12px 16px', background: '#f8fafc', borderRadius: 10, border: '1px solid #e8e8e8',
                    }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: '50%',
                        background: 'var(--accent-light, #f5f0ff)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 14, fontWeight: 700, color: 'var(--accent, #9b87c4)',
                        flexShrink: 0,
                      }}>
                        {s.name.charAt(0).toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {s.name}
                        </div>
                        <div style={{ fontSize: 12, color: '#94a3b8' }}>{s.email}</div>
                      </div>
                      <div style={{ fontSize: 11, color: '#94a3b8', flexShrink: 0 }}>
                        Enrolled {new Date(s.enrolled_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
      `}</style>
    </div>
  )
}
