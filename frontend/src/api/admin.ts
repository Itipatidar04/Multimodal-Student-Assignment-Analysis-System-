// ── Typed API helpers for admin operations ───────────────────────

import api from './client'

export interface AdminUser {
  id: string
  name: string
  email: string
  role: 'student' | 'faculty' | 'admin'
  created_at: string
}

export interface AdminCourse {
  id: string
  name: string
  code: string
  description: string | null
  semester: string | null
  year: number | null
  faculty_id: string
  created_at: string
}

export interface AdminStats {
  total_students: number
  total_faculty: number
  total_admins: number
  total_courses: number
  total_submissions: number
}

// ── Users ─────────────────────────────────────────────────────────

export const getAllUsers = () =>
  api.get<AdminUser[]>('/admin/users').then(r => r.data)

// ── Courses ───────────────────────────────────────────────────────

export const getAllCourses = () =>
  api.get<AdminCourse[]>('/courses').then(r => r.data)

// ── Stats ─────────────────────────────────────────────────────────

export const getAdminStats = () =>
  api.get<AdminStats>('/admin/stats').then(r => r.data)
