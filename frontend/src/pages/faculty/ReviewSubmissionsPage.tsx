import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, AlertCircle, CheckCircle, Clock, User } from 'lucide-react'
import Layout from '../../components/Layout'
import api from '../../api/client'

interface Submission {
  id: string
  student_id: string
  student_name: string
  submission_type: string
  submitted_at: string
  status: string
  ai_score?: number
  faculty_score?: number
}

export default function ReviewSubmissionsPage() {
  const { assignmentId } = useParams()
  const navigate = useNavigate()

  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [assignmentTitle, setAssignmentTitle] = useState('')
  const [facultyScore, setFacultyScore] = useState(0)
  const [feedback, setFeedback] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetchSubmissions()
  }, [assignmentId])

  const fetchSubmissions = async () => {
    try {
      const [subRes, assignRes] = await Promise.all([
        api.get(`/faculty/assignments/${assignmentId}/submissions`),
        api.get(`/assignments/${assignmentId}`),
      ])
      setSubmissions(subRes.data)
      setAssignmentTitle(assignRes.data.title)
    } catch (err) {
      setError('Failed to load submissions')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitEvaluation = async () => {
    if (!selectedSubmission) return
    setSubmitting(true)

    try {
      await api.post(`/submissions/${selectedSubmission.id}/evaluate`, {
        faculty_score: facultyScore,
        feedback,
      })
      setFacultyScore(0)
      setFeedback('')
      setSelectedSubmission(null)
      fetchSubmissions()
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to submit evaluation')
    } finally {
      setSubmitting(false)
    }
  }

  const getStatusColor = (status: string) => {
    return status === 'evaluated' ? 'badge-green' : 'badge-yellow'
  }

  if (loading) {
    return (
      <Layout>
        <div className="text-center" style={{ padding: '60px 0', color: '#94a3b8' }}>
          Loading submissions...
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      {/* Back button */}
      <button className="btn btn-ghost btn-sm mb-16" onClick={() => navigate('/faculty')}>
        <ArrowLeft size={14} /> Back
      </button>

      <div className="page-header">
        <h1>Review Submissions</h1>
        <p>{assignmentTitle}</p>
      </div>

      {/* Error */}
      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '12px 16px', marginBottom: 20, color: '#991b1b', fontSize: 14, display: 'flex', gap: 8, alignItems: 'center' }}>
          <AlertCircle size={16} /> {error}
        </div>
      )}

      <div className="grid-2" style={{ gap: 20 }}>
        {/* Submissions List */}
        <div className="card">
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16, color: '#1e293b' }}>
            Submissions ({submissions.length})
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 600, overflowY: 'auto' }}>
            {submissions.length === 0 ? (
              <p className="text-muted">No submissions yet</p>
            ) : (
              submissions.map((submission) => (
                <button
                  key={submission.id}
                  onClick={() => {
                    setSelectedSubmission(submission)
                    setFacultyScore(submission.faculty_score || 0)
                    setFeedback('')
                  }}
                  style={{
                    padding: 12,
                    borderRadius: 8,
                    border: selectedSubmission?.id === submission.id ? '2px solid var(--accent)' : '1px solid #e8e8e8',
                    background: selectedSubmission?.id === submission.id ? 'var(--accent-light)' : '#ffffff',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.2s',
                  }}
                >
                  <div className="flex-between">
                    <div className="flex gap-8">
                      <User size={14} style={{ color: '#94a3b8' }} />
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 500, color: '#1e293b' }}>
                          {submission.student_name}
                        </p>
                        <p className="text-muted" style={{ fontSize: 11, marginTop: 2 }}>
                          {submission.submission_type}
                        </p>
                      </div>
                    </div>
                    <span className={`badge ${getStatusColor(submission.status)}`}>
                      {submission.status === 'evaluated' ? '✓' : '○'} {submission.status}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Submission Details & Evaluation */}
        {selectedSubmission ? (
          <div className="card">
            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 20, color: '#1e293b' }}>
              Evaluation
            </h3>

            {/* Submission info */}
            <div style={{ background: '#f8fafc', padding: 16, borderRadius: 8, marginBottom: 20 }}>
              <p style={{ fontSize: 13, fontWeight: 500, color: '#1e293b', marginBottom: 8 }}>
                {selectedSubmission.student_name}
              </p>
              <div className="flex gap-12" style={{ fontSize: 12, color: '#64748b' }}>
                <span className="flex gap-4">
                  <Clock size={12} />
                  {new Date(selectedSubmission.submitted_at).toLocaleString()}
                </span>
              </div>
              {selectedSubmission.ai_score !== undefined && (
                <p style={{ fontSize: 12, color: '#64748b', marginTop: 8 }}>
                  AI Score: <span style={{ fontWeight: 600, color: '#1e293b' }}>{selectedSubmission.ai_score}/100</span>
                </p>
              )}
            </div>

            {/* Scoring */}
            <div className="form-group">
              <label>Faculty Score (out of 100)</label>
              <input
                type="number"
                min="0"
                max="100"
                value={facultyScore}
                onChange={(e) => setFacultyScore(Number(e.target.value))}
              />
            </div>

            {/* Feedback */}
            <div className="form-group">
              <label>Feedback for Student</label>
              <textarea
                placeholder="Provide detailed feedback..."
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                style={{ minHeight: 120 }}
              />
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                className="btn btn-outline btn-full"
                onClick={() => setSelectedSubmission(null)}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary btn-full"
                onClick={handleSubmitEvaluation}
                disabled={submitting}
              >
                {submitting ? 'Saving...' : 'Submit Evaluation'}
              </button>
            </div>
          </div>
        ) : (
          <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400, textAlign: 'center' }}>
            <div>
              <CheckCircle size={40} style={{ color: '#cbd5e1', margin: '0 auto 12px' }} />
              <p style={{ color: '#94a3b8', fontSize: 14 }}>
                Select a submission to evaluate
              </p>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}
