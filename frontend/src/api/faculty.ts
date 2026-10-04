// ── Typed API helpers for faculty operations ──────────────────────

import api from './client'

// ─── Types ────────────────────────────────────────────────────────

export interface Course {
  id: string
  name: string
  code: string
  description: string | null
  semester: string | null
  year: number | null
  faculty_id: string
  created_at: string
}

export interface Assignment {
  id: string
  course_id: string
  title: string
  description: string | null
  deadline: string | null
  total_marks: number
  submission_modes: string[]
  questions: Question[]
  rubrics: Rubric[]
  created_at: string
  course_name?: string | null
  course_code?: string | null
}

export interface Question {
  id: string
  assignment_id: string
  text: string
  max_marks: number
  order_index: number
}

export interface Rubric {
  id: string
  assignment_id: string
  criterion: string
  description: string | null
  weight: number
}

export interface Submission {
  id: string
  student_id: string
  assignment_id: string
  submission_type: 'text' | 'audio' | 'video'
  text_content: string | null
  file_url: string | null
  file_name: string | null
  file_size_bytes: number | null
  extracted_text: string | null
  status: string
  submitted_at: string
}

export interface Student {
  id: string
  name: string
  email: string
  role: string
  created_at: string
  enrolled_at: string
}

export interface CO {
  id: string
  code: string
  description: string
  course_id: string
}

export interface PO {
  id: string
  code: string
  description: string
}

// ─── Course APIs ──────────────────────────────────────────────────

export const getCourses = () =>
  api.get<Course[]>('/courses').then(r => r.data)

export const createCourse = (data: {
  name: string
  code: string
  description?: string
  semester?: string
  academic_year?: string
}) => api.post<Course>('/courses', data).then(r => r.data)

export const getCourse = (id: string) =>
  api.get<Course>(`/courses/${id}`).then(r => r.data)

export const updateCourse = (id: string, data: Partial<Course>) =>
  api.put<Course>(`/courses/${id}`, data).then(r => r.data)

export const getCourseStudents = (courseId: string) =>
  api.get<Student[]>(`/courses/${courseId}/students`).then(r => r.data)

// ─── Assignment APIs ──────────────────────────────────────────────

export const getAssignments = (courseId?: string) =>
  api.get<Assignment[]>('/assignments', { params: courseId ? { course_id: courseId } : {} }).then(r => r.data)

export const createAssignment = (data: {
  course_id: string
  title: string
  description?: string
  deadline?: string | null
  total_marks: number
  submission_modes: string[]
  questions?: { text: string; max_marks: number; order_index: number }[]
  rubrics?: { criterion: string; weight: number }[]
}) => api.post<Assignment>('/assignments', data).then(r => r.data)

// ─── Submission APIs ──────────────────────────────────────────────

export const getSubmissions = (assignmentId?: string) =>
  api.get<Submission[]>('/submissions', { params: assignmentId ? { assignment_id: assignmentId } : {} }).then(r => r.data)

export const getDownloadUrl = (submissionId: string) =>
  api.get<{ url: string; file_name: string }>(`/submissions/${submissionId}/download-url`).then(r => r.data)

// ─── CO / PO APIs ─────────────────────────────────────────────────

export const getCOs = (courseId: string) =>
  api.get<CO[]>(`/courses/${courseId}/cos`).then(r => r.data)

export const createCO = (courseId: string, data: { code: string; description: string }) =>
  api.post<CO>(`/courses/${courseId}/cos`, data).then(r => r.data)

export const getPOs = () =>
  api.get<PO[]>('/courses/pos/all').then(r => r.data)

export const mapCOtoPO = (courseId: string, coId: string, poId: string) =>
  api.post(`/courses/${courseId}/cos/${coId}/map-po`, { po_id: poId }).then(r => r.data)

// ─── Evaluation Types ─────────────────────────────────────────────

export interface Evaluation {
  id: string
  submission_id: string
  ai_score: number | null
  criterion_scores: Record<string, number>
  strengths: string[] | null
  weaknesses: string[] | null
  feedback: string | null
  recommended_topics: string[] | null
  similarity_score: number | null
  similarity_flagged: boolean
  faculty_score: number | null
  faculty_notes: string | null
  faculty_reviewed_at: string | null
  final_score: number | null
  status: string
  created_at: string
  updated_at: string
}

// ─── Evaluation APIs ──────────────────────────────────────────────

export const getEvaluation = (submissionId: string) =>
  api.get<Evaluation>(`/evaluations/${submissionId}`).then(r => r.data)

export const triggerEvaluation = (submissionId: string) =>
  api.post<Evaluation>(`/evaluations/${submissionId}/evaluate`).then(r => r.data)

export const reviewEvaluation = (
  submissionId: string,
  data: { faculty_score: number; faculty_notes?: string; finalize?: boolean }
) => api.patch<Evaluation>(`/evaluations/${submissionId}/review`, data).then(r => r.data)
