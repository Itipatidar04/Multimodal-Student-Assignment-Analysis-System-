import { useState } from 'react'
import { BookOpen } from 'lucide-react'
import Modal from './Modal'
import { createCourse, type Course } from '../api/faculty'

interface Props {
  isOpen: boolean
  onClose: () => void
  onCreated: (course: Course) => void
}

export default function CreateCourseModal({ isOpen, onClose, onCreated }: Props) {
  const [name, setName]           = useState('')
  const [code, setCode]           = useState('')
  const [description, setDescription] = useState('')
  const [semester, setSemester]   = useState('')
  const [year, setYear]           = useState(new Date().getFullYear())
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')

  const reset = () => {
    setName(''); setCode(''); setDescription(''); setSemester(''); setYear(new Date().getFullYear())
    setError('')
  }

  const handleClose = () => { reset(); onClose() }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !code.trim()) { setError('Name and Code are required.'); return }
    setError(''); setLoading(true)
    try {
      const created = await createCourse({
        name: name.trim(),
        code: code.trim().toUpperCase(),
        description: description.trim() || undefined,
        semester: semester.trim() || undefined,
        academic_year: year ? String(year) : undefined,
      })
      onCreated(created)
      reset()
      onClose()
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to create course.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Create New Course">
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24,
          background: 'var(--accent-light, #f5f0ff)', borderRadius: 10, padding: '12px 16px' }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--accent, #9b87c4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <BookOpen size={20} color="#fff" />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent-text, #5b4a8a)' }}>New Course</div>
            <div style={{ fontSize: 12, color: '#94a3b8' }}>Students can enroll once created</div>
          </div>
        </div>

        <div className="form-group">
          <label>Course Name *</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Data Structures and Algorithms" required />
        </div>

        <div className="form-group">
          <label>Course Code *</label>
          <input value={code} onChange={e => setCode(e.target.value)} placeholder="e.g. CS301" required />
        </div>

        <div className="form-group">
          <label>Description</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)}
            placeholder="Brief description of the course..." style={{ minHeight: 80 }} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="form-group">
            <label>Semester</label>
            <select value={semester} onChange={e => setSemester(e.target.value)}>
              <option value="">— Select —</option>
              {['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th'].map(s => (
                <option key={s} value={s}>{s} Semester</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Year</label>
            <input type="number" value={year} onChange={e => setYear(Number(e.target.value))}
              min={2020} max={2035} />
          </div>
        </div>

        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8,
            padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#991b1b' }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
          <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={handleClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" style={{ flex: 2 }} disabled={loading}>
            {loading ? 'Creating...' : 'Create Course'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
