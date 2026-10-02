/*baseURL — every API call automatically goes to http://localhost:8000. So instead of writing http://localhost:8000/auth/login every time, you just write /auth/login

Request interceptor — before EVERY request is sent, it checks localStorage for a saved token and adds it as Authorization: Bearer eyJhbG.... This is how the backend knows who is logged in

Response interceptor — if the backend returns a 401 Unauthorized (token expired or invalid), it automatically clears the saved token and sends the user back to the login page

 */

import axios from 'axios'

// ── Create axios instance pointing to our FastAPI backend ──
const api = axios.create({
  baseURL: 'http://localhost:8000',
  headers: {
    'Content-Type': 'application/json',
  },
})

// ── Request interceptor ──
// Automatically attaches the JWT token to EVERY request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// ── Response interceptor ──
// If token is expired or invalid (401), log the user out automatically
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api
