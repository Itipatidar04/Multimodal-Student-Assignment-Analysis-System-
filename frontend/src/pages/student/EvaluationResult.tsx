import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, CheckCircle, AlertTriangle, Star, TrendingUp,
  BookOpen, MessageSquare, AlertCircle, Clock, Award,
  ThumbsUp, ThumbsDown,
} from 'lucide-react'
import Layout from '../../components/Layout'
import { getEvaluation, type Evaluation } from '../../api/student'
import api from '../../api/client'

interface Submission {
  id: string
  assignment_id: string
  submission_type: string
  text_content: string | null
  file_name: string | null
  status: string
  submitted_at: string
}

interface Assignment {
  id: string
  title: string
  description: string | null
  total_marks: number
}

export default function EvaluationResult() {
  const { submissionId } = useParams()
  const navigate = useNavigate()

  const [evaluation, setEvaluation] = useState<Evaluation | null>(null)
  const [submission, setSubmission] = useState<Submission | null>(null)
  const [assignment, setAssignment] = useState<Assignment | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!submissionId) return
    const load = async () => {
      try {
        const [subRes, evalRes] = await Promise.all([
          api.get<Submission>(`/submissions/${submissionId}`),
          getEvaluation(submissionId).catch(() => null),
        ])
        setSubmission(subRes.data)
        setEvaluation(evalRes)
        // load assignment
        const aRes = await api.get<Assignment>(`/assignments/${subRes.data.assignment_id}`)
        setAssignment(aRes.data)
      } catch {
        setError('Could not load evaluation. Please try again.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [submissionId])

  const getScoreColor = (score: number | null, max: number) => {
    if (score === null) return '#94a3b8'
    const pct = (score / max) * 100
    if (pct >= 80) return '#10b981'
    if (pct >= 60) return '#f59e0b'
    return '#ef4444'
  }

  const getScoreLabel = (score: number | null, max: number) => {
    if (score === null) return 'N/A'
    const pct = (score / max) * 100
    if (pct >= 85) return 'Excellent'
    if (pct >= 70) return 'Good'
    if (pct >= 55) return 'Average'
    return 'Needs Improvement'
  }

  const formatDate = (dt: string) =>
    new Date(dt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

  if (loading) {
    return (
      <Layout>
        <div className="text-center" style={{ padding: '80px 0', color: '#94a3b8' }}>
          <div style={{ fontSize: 32, marginBottom: 16 }}>⏳</div>
          Loading your results...
        </div>
      </Layout>
    )
  }

  if (error || !submission) {
    return (
      <Layout>
        <div style={{ textAlign: 'center', padding: '80px 0' }}>
          <AlertCircle size={36} color="#ef4444" style={{ margin: '0 auto 12px' }} />
          <p style={{ color: '#ef4444' }}>{error || 'Submission not found.'}</p>
          <button className="btn btn-ghost mt-16" onClick={() => navigate('/student')}>Go Back</button>
        </div>
      </Layout>
    )
  }

  const totalMarks = assignment?.total_marks || 100
  const finalScore = evaluation?.final_score ?? evaluation?.ai_score ?? null
  const scoreColor = getScoreColor(finalScore, totalMarks)
  const scoreLabel = getScoreLabel(finalScore, totalMarks)
  const scorePct = finalScore !== null ? Math.round((finalScore / totalMarks) * 100) : null

  const isPending = !evaluation || evaluation.status === 'pending'
  const isEvaluated = evaluation && evaluation.status !== 'pending'

  return (
    <Layout>
      {/* Back */}
      <button className="btn btn-ghost btn-sm mb-16" onClick={() => navigate('/student')}>
        <ArrowLeft size={14} /> Back to Dashboard
      </button>

      {/* Header */}
      <div className="page-header">
        <h1>{assignment?.title || 'Assignment Result'}</h1>
        <p>
          Submitted {formatDate(submission.submitted_at)} ·{' '}
          <span style={{ textTransform: 'capitalize' }}>{submission.submission_type}</span> submission
        </p>
      </div>

      {/* Pending state */}
      {isPending && (
        <div className="card" style={{ textAlign: 'center', padding: '60px 24px', marginBottom: 24 }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%',
            background: '#fef9e7', display: 'flex', alignItems: 'center',
            justifyContent: 'center', margin: '0 auto 20px',
          }}>
            <Clock size={32} color="#f59e0b" />
          </div>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>
            Evaluation Pending
          </h3>
          <p style={{ color: '#64748b', fontSize: 14, maxWidth: 360, margin: '0 auto' }}>
            Your submission has been received and is awaiting evaluation by your faculty. Check back later.
          </p>
        </div>
      )}

      {/* Score hero card */}
      {isEvaluated && finalScore !== null && (
        <div style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: 16, padding: '32px 28px', marginBottom: 24,
          color: '#fff', display: 'flex', alignItems: 'center', gap: 32,
          flexWrap: 'wrap',
        }}>
          {/* Score circle */}
          <div style={{ textAlign: 'center', flexShrink: 0 }}>
            <div style={{
              width: 100, height: 100, borderRadius: '50%',
              border: '4px solid rgba(255,255,255,0.4)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(4px)',
            }}>
              <div style={{ fontSize: 28, fontWeight: 800, lineHeight: 1 }}>{finalScore}</div>
              <div style={{ fontSize: 12, opacity: 0.8 }}>/{totalMarks}</div>
            </div>
            <div style={{ marginTop: 10, fontSize: 12, opacity: 0.85, fontWeight: 600 }}>
              {scorePct}% · {scoreLabel}
            </div>
          </div>

          {/* Details */}
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>
              🎉 Your Result is Ready
            </div>
            <div style={{ opacity: 0.85, fontSize: 14, lineHeight: 1.7 }}>
              {evaluation?.faculty_score !== null && evaluation?.faculty_score !== undefined ? (
                <><Award size={14} style={{ display: 'inline', marginRight: 6 }} />Faculty reviewed score: <strong>{evaluation.faculty_score}/{totalMarks}</strong></>
              ) : evaluation?.ai_score !== null ? (
                <><Star size={14} style={{ display: 'inline', marginRight: 6 }} />AI evaluated score: <strong>{evaluation.ai_score}/{totalMarks}</strong></>
              ) : null}
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
              {evaluation?.status === 'finalized' && (
                <span style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 99, padding: '4px 12px', fontSize: 12, fontWeight: 600 }}>
                  ✓ Finalized
                </span>
              )}
              {evaluation?.status === 'faculty_reviewed' && (
                <span style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 99, padding: '4px 12px', fontSize: 12, fontWeight: 600 }}>
                  👨‍🏫 Faculty Reviewed
                </span>
              )}
              {evaluation?.status === 'ai_evaluated' && (
                <span style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 99, padding: '4px 12px', fontSize: 12, fontWeight: 600 }}>
                  🤖 AI Evaluated
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="grid-2" style={{ gap: 20, alignItems: 'start' }}>
        {/* Left column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Feedback */}
          {isEvaluated && evaluation?.feedback && (
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <MessageSquare size={16} color="#3b82f6" />
                </div>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1e293b' }}>Feedback</h3>
              </div>
              <p style={{ fontSize: 14, color: '#475569', lineHeight: 1.7 }}>{evaluation.feedback}</p>
            </div>
          )}

          {/* Strengths */}
          {isEvaluated && evaluation?.strengths && evaluation.strengths.length > 0 && (
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ThumbsUp size={16} color="#10b981" />
                </div>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1e293b' }}>Strengths</h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {evaluation.strengths.map((s, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <CheckCircle size={15} color="#10b981" style={{ flexShrink: 0, marginTop: 2 }} />
                    <span style={{ fontSize: 14, color: '#374151' }}>{s}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Weaknesses */}
          {isEvaluated && evaluation?.weaknesses && evaluation.weaknesses.length > 0 && (
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ThumbsDown size={16} color="#ef4444" />
                </div>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1e293b' }}>Areas to Improve</h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {evaluation.weaknesses.map((w, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <AlertTriangle size={15} color="#f59e0b" style={{ flexShrink: 0, marginTop: 2 }} />
                    <span style={{ fontSize: 14, color: '#374151' }}>{w}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Faculty notes */}
          {isEvaluated && evaluation?.faculty_notes && (
            <div className="card" style={{ borderLeft: '4px solid #9b87c4' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: '#f5f0ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <BookOpen size={16} color="#9b87c4" />
                </div>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1e293b' }}>Faculty Notes</h3>
              </div>
              <p style={{ fontSize: 14, color: '#475569', lineHeight: 1.7, fontStyle: 'italic' }}>
                "{evaluation.faculty_notes}"
              </p>
            </div>
          )}
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Score breakdown */}
          {isEvaluated && evaluation?.criterion_scores && Object.keys(evaluation.criterion_scores).length > 0 && (
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: '#fff4ed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <TrendingUp size={16} color="#f97316" />
                </div>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1e293b' }}>Score Breakdown</h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {Object.entries(evaluation.criterion_scores).map(([criterion, score]) => {
                  const maxCriterion = 100
                  const pct = Math.min((score / maxCriterion) * 100, 100)
                  const barColor = pct >= 80 ? '#10b981' : pct >= 60 ? '#f59e0b' : '#ef4444'
                  return (
                    <div key={criterion}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>{criterion}</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: barColor }}>{score}</span>
                      </div>
                      <div style={{ height: 6, background: '#f1f5f9', borderRadius: 99, overflow: 'hidden' }}>
                        <div style={{
                          height: '100%', background: barColor, borderRadius: 99,
                          width: `${pct}%`, transition: 'width 0.6s ease',
                        }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Recommended topics */}
          {isEvaluated && evaluation?.recommended_topics && evaluation.recommended_topics.length > 0 && (
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <BookOpen size={16} color="#22c55e" />
                </div>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1e293b' }}>Recommended Topics</h3>
              </div>
              <p style={{ fontSize: 12, color: '#94a3b8', marginBottom: 12 }}>Study these to improve your understanding:</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {evaluation.recommended_topics.map((t, i) => (
                  <span key={i} style={{
                    background: '#f0fdf4', border: '1px solid #bbf7d0',
                    color: '#15803d', borderRadius: 99, padding: '4px 12px', fontSize: 12, fontWeight: 500,
                  }}>
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Plagiarism flag */}
          {isEvaluated && evaluation?.similarity_flagged && (
            <div style={{
              background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: '16px 20px',
              display: 'flex', gap: 12, alignItems: 'flex-start',
            }}>
              <AlertTriangle size={18} color="#ef4444" style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#991b1b', marginBottom: 4 }}>
                  Similarity Flag
                </div>
                <div style={{ fontSize: 13, color: '#b91c1c' }}>
                  Your submission has been flagged for similarity (score: {evaluation.similarity_score?.toFixed(1)}%).
                  Please ensure your work is original.
                </div>
              </div>
            </div>
          )}

          {/* Submission info */}
          <div className="card" style={{ background: '#f8fafc' }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 14 }}>
              Submission Info
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { label: 'Type', value: submission.submission_type },
                { label: 'Submitted', value: formatDate(submission.submitted_at) },
                { label: 'Status', value: submission.status },
                ...(evaluation ? [{ label: 'Evaluation', value: evaluation.status.replace('_', ' ') }] : []),
              ].map(row => (
                <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, color: '#94a3b8' }}>{row.label}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#374151', textTransform: 'capitalize' }}>
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
