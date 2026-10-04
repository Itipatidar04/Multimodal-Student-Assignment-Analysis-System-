import { useState, useEffect } from 'react'
import { Plus, Trash2, FileText, Mic, Video } from 'lucide-react'
import Modal from './Modal'
import { createAssignment, type Assignment, type Course } from '../api/faculty'

interface Question {
  text: string
  max_marks: number
  order_index: number
}

interface Rubric {
  criterion: string
  weight: number
}

interface Props {
  isOpen: boolean
  onClose: () => void
  onCreated: (assignment: Assignment) => void
  courses: Course[]
  defaultCourseId?: string
}

export default function CreateAssignmentModal({ isOpen, onClose, onCreated, courses, defaultCourseId }: Props) {
  const [courseId, setCourseId]       = useState(defaultCourseId || '')
  const [title, setTitle]             = useState('')
  const [description, setDescription] = useState('')
  const [deadline, setDeadline]       = useState('')
  const [totalMarks, setTotalMarks]   = useState(100)
  const [modes, setModes]             = useState<string[]>(['text'])
  const [questions, setQuestions]     = useState<Question[]>([])
  const [rubrics, setRubrics]         = useState<Rubric[]>([])
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState('')

  useEffect(() => {
    if (isOpen) {
      setCourseId(defaultCourseId || (courses.length === 1 ? courses[0].id : ''))
    }
  }, [isOpen, defaultCourseId, courses])

  const reset = () => {
    setCourseId(defaultCourseId || (courses.length === 1 ? courses[0].id : ''))
    setTitle(''); setDescription('')
    setDeadline(''); setTotalMarks(100); setModes(['text'])
    setQuestions([]); setRubrics([]); setError('')
  }
  const handleClose = () => { reset(); onClose() }

  const toggleMode = (mode: string) => {
    setModes(prev => prev.includes(mode) ? prev.filter(m => m !== mode) : [...prev, mode])
  }

  // Questions
  const addQuestion = () => setQuestions(q => [...q, { text: '', max_marks: 10, order_index: q.length + 1 }])
  const removeQuestion = (i: number) => setQuestions(q => q.filter((_, idx) => idx !== i))
  const updateQuestion = (i: number, field: keyof Question, val: string | number) =>
    setQuestions(q => q.map((item, idx) => idx === i ? { ...item, [field]: val } : item))

  // Rubrics
  const addRubric = () => setRubrics(r => [...r, { criterion: '', weight: 25 }])
  const removeRubric = (i: number) => setRubrics(r => r.filter((_, idx) => idx !== i))
  const updateRubric = (i: number, field: keyof Rubric, val: string | number) =>
    setRubrics(r => r.map((item, idx) => idx === i ? { ...item, [field]: val } : item))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!courseId) { setError('Please select a course.'); return }
    if (!title.trim()) { setError('Title is required.'); return }
    if (modes.length === 0) { setError('Select at least one submission mode.'); return }
    setError(''); setLoading(true)
    try {
      const created = await createAssignment({
        course_id: courseId,
        title: title.trim(),
        description: description.trim() || undefined,
        deadline: deadline ? new Date(deadline).toISOString() : null,
        total_marks: totalMarks,
        submission_modes: modes,
        questions: questions.filter(q => q.text.trim()).length > 0
          ? questions.filter(q => q.text.trim())
          : undefined,
        rubrics: rubrics.filter(r => r.criterion.trim()).length > 0
          ? rubrics.filter(r => r.criterion.trim())
          : undefined,
      })
      onCreated(created)
      reset(); onClose()
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to create assignment.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Create New Assignment" maxWidth={640}>
      <form onSubmit={handleSubmit}>

        {/* Course */}
        <div className="form-group">
          <label>Course *</label>
          <select value={courseId} onChange={e => setCourseId(e.target.value)} required>
            <option value="">— Select course —</option>
            {courses.map(c => <option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}
          </select>
        </div>

        {/* Title */}
        <div className="form-group">
          <label>Assignment Title *</label>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Unit 1 Assignment" required />
        </div>

        {/* Description */}
        <div className="form-group">
          <label>Description</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)}
            placeholder="Instructions for students..." style={{ minHeight: 80 }} />
        </div>

        {/* Marks + Deadline */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="form-group">
            <label>Total Marks</label>
            <input type="number" value={totalMarks} onChange={e => setTotalMarks(Number(e.target.value))} min={1} />
          </div>
          <div className="form-group">
            <label>Deadline</label>
            <input type="datetime-local" value={deadline} onChange={e => setDeadline(e.target.value)} />
          </div>
        </div>

        {/* Submission Modes */}
        <div className="form-group">
          <label>Submission Modes *</label>
          <div style={{ display: 'flex', gap: 10 }}>
            {(['text', 'audio', 'video'] as const).map(mode => {
              const icon = mode === 'text' ? <FileText size={14} /> : mode === 'audio' ? <Mic size={14} /> : <Video size={14} />
              const active = modes.includes(mode)
              return (
                <button
                  key={mode} type="button"
                  onClick={() => toggleMode(mode)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px',
                    borderRadius: 8, border: `1.5px solid ${active ? 'var(--accent, #9b87c4)' : '#e2e8f0'}`,
                    background: active ? 'var(--accent-light, #f5f0ff)' : '#f8fafc',
                    color: active ? 'var(--accent-text, #5b4a8a)' : '#64748b',
                    cursor: 'pointer', fontSize: 14, fontWeight: active ? 600 : 400, transition: 'all 0.15s',
                  }}
                >
                  {icon} {mode.charAt(0).toUpperCase() + mode.slice(1)}
                </button>
              )
            })}
          </div>
        </div>

        {/* Divider */}
        <div className="divider" />

        {/* Questions */}
        <div style={{ marginBottom: 20 }}>
          <div className="flex-between" style={{ marginBottom: 12 }}>
            <label style={{ marginBottom: 0 }}>Questions (optional)</label>
            <button type="button" className="btn btn-ghost btn-sm" onClick={addQuestion}>
              <Plus size={13} /> Add Question
            </button>
          </div>
          {questions.map((q, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 100px auto', gap: 8, marginBottom: 8, alignItems: 'start' }}>
              <input value={q.text} onChange={e => updateQuestion(i, 'text', e.target.value)}
                placeholder={`Question ${i + 1}...`} />
              <input type="number" value={q.max_marks} onChange={e => updateQuestion(i, 'max_marks', Number(e.target.value))}
                placeholder="Marks" min={1} />
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => removeQuestion(i)}
                style={{ color: '#ef4444' }}><Trash2 size={13} /></button>
            </div>
          ))}
          {questions.length === 0 && (
            <p style={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic' }}>No questions added yet.</p>
          )}
        </div>

        {/* Rubrics */}
        <div style={{ marginBottom: 20 }}>
          <div className="flex-between" style={{ marginBottom: 12 }}>
            <label style={{ marginBottom: 0 }}>Rubrics (optional)</label>
            <button type="button" className="btn btn-ghost btn-sm" onClick={addRubric}>
              <Plus size={13} /> Add Rubric
            </button>
          </div>
          {rubrics.map((r, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 100px auto', gap: 8, marginBottom: 8, alignItems: 'start' }}>
              <input value={r.criterion} onChange={e => updateRubric(i, 'criterion', e.target.value)}
                placeholder={`e.g. Concept Understanding`} />
              <input type="number" value={r.weight} onChange={e => updateRubric(i, 'weight', Number(e.target.value))}
                placeholder="Weight %" min={1} max={100} />
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => removeRubric(i)}
                style={{ color: '#ef4444' }}><Trash2 size={13} /></button>
            </div>
          ))}
          {rubrics.length === 0 && (
            <p style={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic' }}>No rubrics added yet.</p>
          )}
        </div>

        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8,
            padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#991b1b' }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: 12 }}>
          <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={handleClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" style={{ flex: 2 }} disabled={loading}>
            {loading ? 'Creating...' : 'Create Assignment'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
