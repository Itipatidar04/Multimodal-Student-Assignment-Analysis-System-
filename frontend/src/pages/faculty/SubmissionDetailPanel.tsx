import { useState, useEffect } from 'react'
import {
  X, FileText, Mic, Video, User, Clock,
  Star, Award, ThumbsUp, ThumbsDown, BookOpen,
  AlertTriangle, TrendingUp, MessageSquare, CheckCircle,
  Loader, Send, AlertCircle,
} from 'lucide-react'
import {
  type Submission, type Assignment, type Evaluation,
  getEvaluation, triggerEvaluation, reviewEvaluation,
} from '../../api/faculty'

interface StudentInfo {
  id: string
  name?: string
  email?: string
}

interface Props {
  submission: Submission
  assignment: Assignment | undefined
  onClose: () => void
  onEvaluated?: (updated: Evaluation) => void
}

export default function SubmissionDetailPanel({ submission, assignment, onClose, onEvaluated }: Props) {
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null)
  const [loadingEval, setLoadingEval] = useState(true)
  const [triggering, setTriggering] = useState(false)
  const [triggerError, setTriggerError] = useState('')

  // Faculty review form
  const [reviewScore, setReviewScore] = useState('')
  const [reviewNotes, setReviewNotes] = useState('')
  const [finalize, setFinalize] = useState(false)
  const [reviewing, setReviewing] = useState(false)
  const [reviewError, setReviewError] = useState('')
  const [reviewSuccess, setReviewSuccess] = useState(false)

  useEffect(() => {
    loadEvaluation()
  }, [submission.id])

  const loadEvaluation = async () => {
    setLoadingEval(true)
    try {
      const ev = await getEvaluation(submission.id)
      setEvaluation(ev)
      if (ev.faculty_score !== null && ev.faculty_score !== undefined) {
        setReviewScore(String(ev.faculty_score))
      }
      if (ev.faculty_notes) setReviewNotes(ev.faculty_notes)
    } catch {
      setEvaluation(null)
    } finally {
      setLoadingEval(false)
    }
  }

  const handleTriggerEvaluation = async () => {
    setTriggering(true)
    setTriggerError('')
    try {
      const ev = await triggerEvaluation(submission.id)
      setEvaluation(ev)
      onEvaluated?.(ev)
    } catch (err: any) {
      setTriggerError(err?.response?.data?.detail || 'Evaluation failed. Is the AI API key configured?')
    } finally {
      setTriggering(false)
    }
  }

  const handleReview = async () => {
    const score = parseFloat(reviewScore)
    if (isNaN(score) || score < 0) {
      setReviewError('Enter a valid score.')
      return
    }
    if (assignment && score > assignment.total_marks) {
      setReviewError(`Score cannot exceed ${assignment.total_marks}.`)
      return
    }
    setReviewing(true)
    setReviewError('')
    try {
      const updated = await reviewEvaluation(submission.id, {
        faculty_score: score,
        faculty_notes: reviewNotes.trim() || undefined,
        finalize,
      })
      setEvaluation(updated)
      setReviewSuccess(true)
      onEvaluated?.(updated)
      setTimeout(() => setReviewSuccess(false), 3000)
    } catch (err: any) {
      setReviewError(err?.response?.data?.detail || 'Failed to save review.')
    } finally {
      setReviewing(false)
    }
  }

  const formatDate = (dt: string) =>
    new Date(dt).toLocaleString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })

  const formatSize = (bytes: number | null) => {
    if (!bytes) return ''
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const isEvaluated = evaluation && evaluation.status !== 'pending'
  const totalMarks = assignment?.total_marks || 100

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 900,
      background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(3px)',
      display: 'flex', justifyContent: 'flex-end',
      animation: 'fadeIn 0.2s ease',
    }} onClick={e => { if (e.target === e.currentTarget) onClose() }}>

      <div style={{
        width: '100%', maxWidth: 620, background: '#fff',
        boxShadow: '-8px 0 48px rgba(0,0,0,0.18)',
        display: 'flex', flexDirection: 'column',
        animation: 'slideInRight 0.25s ease',
        overflowY: 'auto',
      }}>

        {/* ── Header ── */}
        <div style={{
          padding: '20px 24px', borderBottom: '1px solid #e8e8e8',
          background: 'var(--accent-light, #f5f0ff)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent-text, #5b4a8a)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>
                Submission Review
              </div>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1e293b', marginBottom: 6 }}>
                {assignment?.title || 'Assignment'}
              </h2>

              {/* Student + meta info */}
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                <div className="flex gap-8" style={{ color: '#64748b', fontSize: 13 }}>
                  <User size={13} />
                  <span>{submission.student_id.slice(0, 12)}...</span>
                </div>
                <div className="flex gap-8" style={{ color: '#64748b', fontSize: 13 }}>
                  <Clock size={13} />
                  <span>{formatDate(submission.submitted_at)}</span>
                </div>
                <span className={`badge ${
                  submission.submission_type === 'text' ? 'badge-blue' :
                  submission.submission_type === 'audio' ? 'badge-purple' : 'badge-orange'
                }`}>
                  {submission.submission_type === 'text' ? <FileText size={11} /> :
                   submission.submission_type === 'audio' ? <Mic size={11} /> :
                   <Video size={11} />}
                  {submission.submission_type}
                </span>
                {submission.file_size_bytes && (
                  <span className="badge badge-grey">{formatSize(submission.file_size_bytes)}</span>
                )}
              </div>
            </div>

            <button onClick={onClose} style={{
              background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8,
              width: 32, height: 32, display: 'flex', alignItems: 'center',
              justifyContent: 'center', cursor: 'pointer', color: '#64748b', marginLeft: 12, flexShrink: 0,
            }}>
              <X size={16} />
            </button>
          </div>
        </div>

        {/* ── Body ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Submission content */}
          <div className="card" style={{ padding: '18px 20px' }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 14 }}>
              Submission Content
            </h3>

            {submission.submission_type === 'text' && submission.text_content && (
              <div style={{
                background: '#f8fafc', borderRadius: 8, padding: '14px 16px',
                fontSize: 14, color: '#374151', lineHeight: 1.7,
                borderLeft: '3px solid var(--accent, #9b87c4)',
                maxHeight: 300, overflowY: 'auto',
              }}>
                {submission.text_content}
              </div>
            )}

            {(submission.submission_type === 'audio' || submission.submission_type === 'video') && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: '#64748b' }}>
                {submission.submission_type === 'audio' ? <Mic size={18} /> : <Video size={18} />}
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: '#1e293b' }}>
                    {submission.file_name || 'Uploaded file'}
                  </div>
                  {submission.file_size_bytes && (
                    <div style={{ fontSize: 12, color: '#94a3b8' }}>{formatSize(submission.file_size_bytes)}</div>
                  )}
                </div>
              </div>
            )}

            {/* Extracted text preview */}
            {submission.extracted_text && submission.submission_type !== 'text' && (
              <div style={{ marginTop: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 8 }}>
                  Extracted Transcript
                </div>
                <div style={{
                  background: '#f8fafc', borderRadius: 8, padding: '12px 14px',
                  fontSize: 13, color: '#475569', lineHeight: 1.6,
                  maxHeight: 200, overflowY: 'auto',
                }}>
                  {submission.extracted_text}
                </div>
              </div>
            )}
          </div>

          {/* Questions reference */}
          {assignment && assignment.questions.length > 0 && (
            <div className="card" style={{ padding: '18px 20px' }}>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 14 }}>
                Assignment Questions
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {assignment.questions.map((q, i) => (
                  <div key={q.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start' }}>
                    <span style={{ fontSize: 13, color: '#374151', lineHeight: 1.5 }}>
                      <strong>Q{i + 1}.</strong> {q.text}
                    </span>
                    <span className="badge badge-grey" style={{ flexShrink: 0 }}>{q.max_marks}M</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── AI Evaluation ── */}
          <div className="card" style={{ padding: '18px 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                AI Evaluation
              </h3>
              {!loadingEval && (!isEvaluated || evaluation?.status === 'pending') && (
                <button
                  className="btn btn-primary btn-sm"
                  onClick={handleTriggerEvaluation}
                  disabled={triggering}
                  style={{ gap: 6 }}
                >
                  {triggering ? <><Loader size={13} className="spin" /> Evaluating...</> : <><Star size={13} /> Evaluate with AI</>}
                </button>
              )}
              {isEvaluated && (
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={handleTriggerEvaluation}
                  disabled={triggering}
                  style={{ gap: 6, fontSize: 11 }}
                >
                  {triggering ? 'Re-evaluating...' : '↻ Re-evaluate'}
                </button>
              )}
            </div>

            {triggerError && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 13, color: '#991b1b', display: 'flex', gap: 8 }}>
                <AlertCircle size={14} style={{ flexShrink: 0 }} /> {triggerError}
              </div>
            )}

            {loadingEval ? (
              <div style={{ color: '#94a3b8', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>
                Loading evaluation...
              </div>
            ) : !isEvaluated ? (
              <div style={{ color: '#94a3b8', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>
                <Star size={24} style={{ display: 'block', margin: '0 auto 10px', opacity: 0.3 }} />
                Not yet evaluated. Click "Evaluate with AI" to analyse this submission.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                {/* Score summary */}
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  {evaluation?.ai_score !== null && evaluation?.ai_score !== undefined && (
                    <div style={{
                      flex: 1, minWidth: 120, background: '#f5f0ff', borderRadius: 10,
                      padding: '14px 16px', textAlign: 'center',
                    }}>
                      <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: 6 }}>AI Score</div>
                      <div style={{ fontSize: 26, fontWeight: 800, color: '#9b87c4' }}>
                        {evaluation.ai_score}<span style={{ fontSize: 13, fontWeight: 500, color: '#94a3b8' }}>/{totalMarks}</span>
                      </div>
                    </div>
                  )}
                  {evaluation?.final_score !== null && evaluation?.final_score !== undefined && (
                    <div style={{
                      flex: 1, minWidth: 120, background: '#ecfdf5', borderRadius: 10,
                      padding: '14px 16px', textAlign: 'center',
                    }}>
                      <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: 6 }}>Final Score</div>
                      <div style={{ fontSize: 26, fontWeight: 800, color: '#10b981' }}>
                        {evaluation.final_score}<span style={{ fontSize: 13, fontWeight: 500, color: '#94a3b8' }}>/{totalMarks}</span>
                      </div>
                    </div>
                  )}
                  {evaluation?.similarity_flagged && (
                    <div style={{
                      flex: 1, minWidth: 120, background: '#fef2f2', borderRadius: 10,
                      padding: '14px 16px', textAlign: 'center',
                    }}>
                      <div style={{ fontSize: 11, color: '#991b1b', fontWeight: 600, textTransform: 'uppercase', marginBottom: 6 }}>⚠ Flagged</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#ef4444' }}>
                        {evaluation.similarity_score?.toFixed(1)}% similar
                      </div>
                    </div>
                  )}
                </div>

                {/* Feedback */}
                {evaluation?.feedback && (
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 8 }}>
                      <MessageSquare size={12} style={{ display: 'inline', marginRight: 4 }} /> Feedback
                    </div>
                    <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.7, background: '#f8fafc', borderRadius: 8, padding: '12px 14px' }}>
                      {evaluation.feedback}
                    </p>
                  </div>
                )}

                {/* Rubric scores */}
                {evaluation?.criterion_scores && Object.keys(evaluation.criterion_scores).length > 0 && (
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 10 }}>
                      <TrendingUp size={12} style={{ display: 'inline', marginRight: 4 }} /> Criterion Scores
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {Object.entries(evaluation.criterion_scores).map(([criterion, score]) => {
                        const pct = Math.min(score, 100)
                        const barColor = pct >= 80 ? '#10b981' : pct >= 60 ? '#f59e0b' : '#ef4444'
                        return (
                          <div key={criterion}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                              <span style={{ fontSize: 13, color: '#374151' }}>{criterion}</span>
                              <span style={{ fontSize: 13, fontWeight: 700, color: barColor }}>{score}</span>
                            </div>
                            <div style={{ height: 5, background: '#f1f5f9', borderRadius: 99 }}>
                              <div style={{ height: '100%', background: barColor, borderRadius: 99, width: `${pct}%`, transition: 'width 0.5s' }} />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Strengths / Weaknesses side by side */}
                {((evaluation?.strengths?.length || 0) > 0 || (evaluation?.weaknesses?.length || 0) > 0) && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    {evaluation?.strengths && evaluation.strengths.length > 0 && (
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#10b981', textTransform: 'uppercase', marginBottom: 8 }}>
                          <ThumbsUp size={12} style={{ display: 'inline', marginRight: 4 }} /> Strengths
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {evaluation.strengths.map((s, i) => (
                            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                              <CheckCircle size={13} color="#10b981" style={{ flexShrink: 0, marginTop: 2 }} />
                              <span style={{ fontSize: 12, color: '#374151' }}>{s}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {evaluation?.weaknesses && evaluation.weaknesses.length > 0 && (
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#ef4444', textTransform: 'uppercase', marginBottom: 8 }}>
                          <ThumbsDown size={12} style={{ display: 'inline', marginRight: 4 }} /> Weaknesses
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {evaluation.weaknesses.map((w, i) => (
                            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                              <AlertTriangle size={13} color="#f59e0b" style={{ flexShrink: 0, marginTop: 2 }} />
                              <span style={{ fontSize: 12, color: '#374151' }}>{w}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Recommended topics */}
                {evaluation?.recommended_topics && evaluation.recommended_topics.length > 0 && (
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 8 }}>
                      <BookOpen size={12} style={{ display: 'inline', marginRight: 4 }} /> Recommended Topics
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {evaluation.recommended_topics.map((t, i) => (
                        <span key={i} style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#15803d', borderRadius: 99, padding: '3px 10px', fontSize: 11, fontWeight: 500 }}>
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Faculty Review ── */}
          <div className="card" style={{ padding: '18px 20px', borderTop: '3px solid var(--accent, #9b87c4)' }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 16 }}>
              <Award size={13} style={{ display: 'inline', marginRight: 6 }} />
              Faculty Review
            </h3>

            {reviewSuccess && (
              <div style={{ background: '#ecfdf5', border: '1px solid #6ee7b7', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 13, color: '#065f46', display: 'flex', gap: 8 }}>
                <CheckCircle size={14} /> Review saved successfully!
              </div>
            )}

            <div className="form-group">
              <label>Score (out of {totalMarks}) *</label>
              <input
                type="number"
                value={reviewScore}
                onChange={e => setReviewScore(e.target.value)}
                placeholder={`e.g. 78`}
                min={0}
                max={totalMarks}
                step={0.5}
              />
            </div>

            <div className="form-group">
              <label>Notes for Student (optional)</label>
              <textarea
                value={reviewNotes}
                onChange={e => setReviewNotes(e.target.value)}
                placeholder="Additional feedback or comments for the student..."
                style={{ minHeight: 80 }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <input
                type="checkbox"
                id="finalize-check"
                checked={finalize}
                onChange={e => setFinalize(e.target.checked)}
                style={{ width: 'auto', accentColor: 'var(--accent, #9b87c4)' }}
              />
              <label htmlFor="finalize-check" style={{ fontSize: 13, cursor: 'pointer', color: '#475569' }}>
                Finalize score (publishes result to student)
              </label>
            </div>

            {reviewError && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 13, color: '#991b1b' }}>
                {reviewError}
              </div>
            )}

            <button
              className="btn btn-primary btn-full"
              onClick={handleReview}
              disabled={reviewing || !reviewScore}
            >
              {reviewing ? (
                <><Loader size={14} /> Saving...</>
              ) : (
                <><Send size={14} /> {finalize ? 'Finalize & Publish Score' : 'Save Review'}</>
              )}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
