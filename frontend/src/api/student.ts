// ── Typed API helpers for student operations ──────────────────────

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
  questions: { id: string; text: string; max_marks: number; order_index: number }[]
  rubrics: { id: string; criteria: string; max_score: number }[]
  created_at: string
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

// ─── Course APIs ──────────────────────────────────────────────────

/** Get all courses the student is enrolled in */
export const getEnrolledCourses = () =>
  api.get<Course[]>('/courses').then(r => r.data)

/** Get ALL courses in the system (so student can browse & enroll) */
export const getAllCourses = () =>
  api.get<Course[]>('/courses').then(r => r.data)

/** Enroll the current student in a course */
export const enrollInCourse = (courseId: string) =>
  api.post(`/courses/${courseId}/enroll`).then(r => r.data)

// ─── Assignment APIs ──────────────────────────────────────────────

export const getAssignments = () =>
  api.get<Assignment[]>('/assignments').then(r => r.data)

export const getAssignment = (id: string) =>
  api.get<Assignment>(`/assignments/${id}`).then(r => r.data)

// ─── Submission APIs ──────────────────────────────────────────────

export const getSubmissions = () =>
  api.get<Submission[]>('/submissions').then(r => r.data)

// ─── Evaluation APIs ──────────────────────────────────────────────

export const getEvaluation = (submissionId: string) =>
  api.get<Evaluation>(`/evaluations/${submissionId}`).then(r => r.data)
