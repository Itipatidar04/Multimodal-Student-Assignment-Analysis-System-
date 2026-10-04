/*Text tab — textarea where student types their answer
Audio tab — uses browser's MediaRecorder API to record directly from mic. Shows live timer, stop button, then audio preview before submitting. No extra library needed!
Video tab — drag-and-drop or browse using react-dropzone. Shows video preview before submitting
Only shows tabs that the assignment allows (if assignment only allows audio + video, text tab won't appear)
Success screen — after submit, shows a green checkmark and "Back to Dashboard" button
Sends multipart/form-data to backend — required for file uploads */

import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useDropzone } from 'react-dropzone'
import {
  ArrowLeft, FileText, Mic, Video,
  Square, Send, CheckCircle, AlertCircle,
  Upload, Trash2
} from 'lucide-react'
import Layout from '../../components/Layout'
import api from '../../api/client'

interface Assignment {
  id: string
  title: string
  description: string
  deadline: string | null
  total_marks: number
  submission_modes: string[]
  questions: { id: string; text: string; max_marks: number; order_index: number }[]
}

export default function SubmissionPage() {
  const { assignmentId } = useParams()
  const navigate = useNavigate()

  // Assignment data
  const [assignment, setAssignment] = useState<Assignment | null>(null)
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState('')

  // Active tab
  const [activeTab, setActiveTab] = useState<'text' | 'audio' | 'video'>('text')

  // Text submission
  const [textContent, setTextContent] = useState('')

  // Audio recording
  const [isRecording, setIsRecording]   = useState(false)
  const [audioBlob, setAudioBlob]       = useState<Blob | null>(null)
  const [audioURL, setAudioURL]         = useState<string | null>(null)
  const [recordSeconds, setRecordSeconds] = useState(0)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef   = useRef<BlobPart[]>([])
  const timerRef         = useRef<ReturnType<typeof setInterval> | null>(null)

  // Video upload
  const [videoFile, setVideoFile] = useState<File | null>(null)

  // Submit state
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted]   = useState(false)
  const [submitError, setSubmitError] = useState('')

  // ── Fetch assignment ──────────────────────────────────────
  useEffect(() => {
    if (!assignmentId) return
    api.get(`/assignments/${assignmentId}`)
      .then(res => {
        setAssignment(res.data)
        // Set default tab to first allowed mode
        const modes = res.data.submission_modes
        if (modes.includes('text'))       setActiveTab('text')
        else if (modes.includes('audio')) setActiveTab('audio')
        else if (modes.includes('video')) setActiveTab('video')
      })
      .catch(() => setError('Assignment not found.'))
      .finally(() => setLoading(false))
  }, [assignmentId])

  // ── Audio: format timer ──────────────────────────────────
  const formatTime = (secs: number) => {
    const m = String(Math.floor(secs / 60)).padStart(2, '0')
    const s = String(secs % 60).padStart(2, '0')
    return `${m}:${s}`
  }

  // ── Audio: start recording ───────────────────────────────
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      mediaRecorderRef.current = recorder
      audioChunksRef.current   = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data)
      }

      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        setAudioBlob(blob)
        setAudioURL(URL.createObjectURL(blob))
        stream.getTracks().forEach(t => t.stop())
      }

      recorder.start()
      setIsRecording(true)
      setRecordSeconds(0)
      timerRef.current = setInterval(() => setRecordSeconds(s => s + 1), 1000)
    } catch {
      setSubmitError('Microphone access denied. Please allow microphone access.')
    }
  }

  // ── Audio: stop recording ────────────────────────────────
  const stopRecording = () => {
    mediaRecorderRef.current?.stop()
    setIsRecording(false)
    if (timerRef.current) clearInterval(timerRef.current)
  }

  const clearAudio = () => {
    setAudioBlob(null)
    setAudioURL(null)
    setRecordSeconds(0)
  }

  // ── Video: dropzone ──────────────────────────────────────
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'video/*': ['.mp4', '.webm', '.ogg', '.mov'] },
    maxFiles: 1,
    maxSize: 100 * 1024 * 1024, // 100MB
    onDrop: (files) => setVideoFile(files[0] ?? null),
    onDropRejected: () => setSubmitError('Invalid file. Use MP4, WebM, or MOV under 100MB.'),
  })

  // ── Submit ───────────────────────────────────────────────
  const handleSubmit = async () => {
    setSubmitError('')
    setSubmitting(true)

    try {
      const formData = new FormData()
      formData.append('assignment_id', assignmentId!)
      formData.append('submission_type', activeTab)

      if (activeTab === 'text') {
        if (!textContent.trim()) {
          setSubmitError('Please write your answer before submitting.')
          setSubmitting(false)
          return
        }
        formData.append('text_content', textContent)

      } else if (activeTab === 'audio') {
        if (!audioBlob) {
          setSubmitError('Please record your audio before submitting.')
          setSubmitting(false)
          return
        }
        formData.append('file', audioBlob, 'recording.webm')

      } else if (activeTab === 'video') {
        if (!videoFile) {
          setSubmitError('Please upload a video before submitting.')
          setSubmitting(false)
          return
        }
        formData.append('file', videoFile)
      }

      await api.post('/submissions', formData)

      setSubmitted(true)
    } catch (err: any) {
      console.error("Submission error:", err)

          const detail = err?.response?.data?.detail

          let msg = "Submission failed. Please try again."

          if (typeof detail === "string") {
              msg = detail
          } else if (Array.isArray(detail)) {
              msg = detail
                  .map((item: any) => item?.msg || JSON.stringify(item))
                  .join(", ")
          }

          setSubmitError(msg)
      }
  }

  // ── Success screen ───────────────────────────────────────
  if (submitted) {
    return (
      <Layout>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', textAlign: 'center' }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <CheckCircle size={36} color="#10b981" />
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1e293b' }}>Submitted Successfully!</h2>
          <p style={{ color: '#64748b', marginTop: 8, fontSize: 14 }}>
            Your assignment has been submitted and will be evaluated.
          </p>
          <button className="btn btn-primary mt-24" onClick={() => navigate('/student')}>
            Back to Dashboard
          </button>
        </div>
      </Layout>
    )
  }

  // ── Loading / error states ───────────────────────────────
  if (loading) return <Layout><div className="text-center" style={{ padding: '60px 0', color: '#94a3b8' }}>Loading assignment...</div></Layout>
  if (error || !assignment) return (
    <Layout>
      <div style={{ color: '#ef4444', textAlign: 'center', padding: '60px 0' }}>
        <AlertCircle size={32} style={{ margin: '0 auto 12px' }} />
        <p>{error || 'Assignment not found.'}</p>
        <button className="btn btn-ghost mt-16" onClick={() => navigate('/student')}>Go Back</button>
      </div>
    </Layout>
  )

  const modes = assignment.submission_modes

  return (
    <Layout>
      {/* Back button + Header */}
      <button className="btn btn-ghost btn-sm mb-16" onClick={() => navigate('/student')}>
        <ArrowLeft size={14} /> Back
      </button>

      <div className="page-header">
        <h1>{assignment.title}</h1>
        <p>{assignment.description}</p>
      </div>

      {/* Info row */}
      <div className="flex gap-16 mb-24" style={{ flexWrap: 'wrap' }}>
        <span className="badge badge-blue">🎯 {assignment.total_marks} marks</span>
        {assignment.deadline && (
          <span className="badge badge-yellow">
            ⏰ Due {new Date(assignment.deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
          </span>
        )}
      </div>

      {/* Questions (if any) */}
      {assignment.questions.length > 0 && (
        <div className="card mb-24">
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16, color: '#1e293b' }}>Questions</h3>
          {assignment.questions.map((q, i) => (
            <div key={q.id} style={{ marginBottom: 12, paddingBottom: 12, borderBottom: i < assignment.questions.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
              <div className="flex-between">
                <span style={{ fontSize: 14, color: '#1e293b' }}>
                  <strong>Q{i + 1}.</strong> {q.text}
                </span>
                <span className="badge badge-grey">{q.max_marks} marks</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Submission area */}
      <div className="card">
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 20, color: '#1e293b' }}>Your Submission</h3>

        {/* Tabs — only show allowed modes */}
        <div className="tabs">
          {modes.includes('text') && (
            <button className={`tab ${activeTab === 'text' ? 'active' : ''}`} onClick={() => setActiveTab('text')}>
              <span className="flex gap-8"><FileText size={14} /> Text</span>
            </button>
          )}
          {modes.includes('audio') && (
            <button className={`tab ${activeTab === 'audio' ? 'active' : ''}`} onClick={() => setActiveTab('audio')}>
              <span className="flex gap-8"><Mic size={14} /> Audio</span>
            </button>
          )}
          {modes.includes('video') && (
            <button className={`tab ${activeTab === 'video' ? 'active' : ''}`} onClick={() => setActiveTab('video')}>
              <span className="flex gap-8"><Video size={14} /> Video</span>
            </button>
          )}
        </div>

        {/* ── TEXT tab ── */}
        {activeTab === 'text' && (
          <div>
            <div className="form-group">
              <label>Write your answer below</label>
              <textarea
                placeholder="Type your answer here..."
                value={textContent}
                onChange={e => setTextContent(e.target.value)}
                style={{ minHeight: 200 }}
              />
              <span className="text-muted">{textContent.length} characters</span>
            </div>
          </div>
        )}

        {/* ── AUDIO tab ── */}
        {activeTab === 'audio' && (
          <div className="record-area">
            {!audioBlob ? (
              <>
                <p className="text-muted mb-16">
                  {isRecording ? 'Recording in progress...' : 'Click the button to start recording your answer'}
                </p>

                {/* Timer */}
                <div className="record-timer">{formatTime(recordSeconds)}</div>

                {/* Recording status */}
                {isRecording && (
                  <div className="record-status mb-16">
                    <span className="dot" /> Recording
                  </div>
                )}

                {/* Record / Stop button */}
                <button
                  className={`record-btn ${isRecording ? 'recording' : 'idle'}`}
                  onClick={isRecording ? stopRecording : startRecording}
                >
                  {isRecording ? <Square size={28} fill="white" /> : <Mic size={28} />}
                </button>

                <p className="text-muted mt-16" style={{ fontSize: 12 }}>
                  {isRecording ? 'Click to stop recording' : 'Click to start'}
                </p>
              </>
            ) : (
              // After recording — show preview
              <div style={{ textAlign: 'center' }}>
                <CheckCircle size={32} color="#10b981" style={{ margin: '0 auto 12px' }} />
                <p style={{ fontWeight: 600, color: '#1e293b', marginBottom: 12 }}>
                  Recording complete — {formatTime(recordSeconds)}
                </p>
                <audio controls src={audioURL!} style={{ width: '100%', marginBottom: 16 }} />
                <button className="btn btn-ghost btn-sm" onClick={clearAudio}>
                  <Trash2 size={14} /> Re-record
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── VIDEO tab ── */}
        {activeTab === 'video' && (
          <div>
            {!videoFile ? (
              <div {...getRootProps()} className={`upload-zone ${isDragActive ? 'dragging' : ''}`}>
                <input {...getInputProps()} />
                <Upload size={32} style={{ margin: '0 auto', display: 'block', color: '#cbd5e1' }} />
                <p>{isDragActive ? 'Drop your video here' : 'Drag & drop your video, or click to browse'}</p>
                <small>MP4, WebM, MOV · Max 100MB</small>
              </div>
            ) : (
              <div className="card" style={{ background: '#f8fafc' }}>
                <div className="flex-between">
                  <div className="flex gap-12">
                    <Video size={20} color="#94a3b8" />
                    <div>
                      <p style={{ fontWeight: 500, fontSize: 14, color: '#1e293b' }}>{videoFile.name}</p>
                      <p className="text-muted">{(videoFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                    </div>
                  </div>
                  <button className="btn btn-ghost btn-sm" onClick={() => setVideoFile(null)}>
                    <Trash2 size={14} /> Remove
                  </button>
                </div>
                {videoFile.type.startsWith('video/') && (
                  <video
                    src={URL.createObjectURL(videoFile)}
                    controls
                    style={{ width: '100%', borderRadius: 8, marginTop: 12, maxHeight: 240 }}
                  />
                )}
              </div>
            )}
          </div>
        )}

        {/* Error */}
        {submitError && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', marginTop: 16, fontSize: 13, color: '#991b1b', display: 'flex', gap: 8, alignItems: 'center' }}>
            <AlertCircle size={14} /> {submitError}
          </div>
        )}

        {/* Submit button */}
        <div style={{ marginTop: 24 }}>
          <button
            className="btn btn-primary btn-full btn-lg"
            onClick={handleSubmit}
            disabled={submitting}
          >
            <Send size={16} />
            {submitting ? 'Submitting...' : 'Submit Assignment'}
          </button>
        </div>
      </div>
    </Layout>
  )
}
