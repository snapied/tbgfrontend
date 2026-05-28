"use client"

// Client for /api/feedback/* — student feedback submission,
// teacher feedback view, and admin moderation endpoints.
//
// IMPORTANT: All request/response field names use snake_case to
// match the backend routes exactly.

import { ACCESS_TOKEN_KEY } from "./billing-client"

function apiBase(): string {
  return (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000").replace(/\/$/, "")
}

function authHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {}
  const token = window.localStorage.getItem(ACCESS_TOKEN_KEY)
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${apiBase()}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    credentials: "include",
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `Request failed (${res.status})` }))
    throw new Error(err.error || `Request failed (${res.status})`)
  }
  return res.json()
}

async function put<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${apiBase()}${path}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    credentials: "include",
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `Request failed (${res.status})` }))
    throw new Error(err.error || `Request failed (${res.status})`)
  }
  return res.json()
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${apiBase()}${path}`, {
    headers: authHeaders(),
    credentials: "include",
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `Request failed (${res.status})` }))
    throw new Error(err.error || `Request failed (${res.status})`)
  }
  return res.json()
}

// ── Types (match backend response shapes exactly) ───────────────

/** Submit student feedback for a completed class. */
export function submitFeedback(data: {
  teacher_id: number
  course_id: string
  class_id?: string
  class_title?: string
  class_date?: string
  rating: number
  positive_tags?: string[]
  improvement_tags?: string[]
  comment?: string
  anonymous?: boolean
}) {
  return post<{ id: number; updated?: boolean }>("/api/feedback/submit", data)
}

/** Skip or request a reminder for feedback. */
export function skipFeedback(data: {
  course_id: string
  class_id?: string
  action: "skip" | "remind"  // matches backend exactly
}) {
  return post<{ skipped?: boolean; reminded?: boolean; reminder_count?: number; ok?: boolean }>(
    "/api/feedback/skip",
    data,
  )
}

/** Get pending feedback requests for the current student. */
export interface PendingFeedbackItem {
  id: number
  course_id: string
  class_id: string | null
  class_title: string | null
  class_date: string | null
  teacher_id: number
  reminder_count: number
}

export function getPendingFeedback() {
  return get<{ pending: PendingFeedbackItem[] }>("/api/feedback/pending")
}

/** Get the teacher's own feedback summary (controlled view). */
export interface TeacherFeedbackSummary {
  avg_rating: number | null
  total_responses: number
  response_rate: number
  has_enough_data: boolean
  last_class_rating: { rating: number; class_title: string | null; class_date: string | null } | null
  positive_tags: Record<string, number>       // { "helpful": 5, "clear": 3 }
  improvement_tags: Record<string, number>    // filtered by threshold
  published_comments: Array<{
    id: number
    rating: number
    comment: string | null
    course_id: string
    class_title: string | null
    class_date: string | null
    student_name: string | null
    anonymous: boolean
    created_at: string
  }>
  coaching_notes: Array<{
    id: number
    note: string | null
    course_id: string
    created_at: string
    acknowledged: boolean
  }>
}

export function getTeacherFeedback() {
  return get<TeacherFeedbackSummary>("/api/feedback/teacher/my")
}

/** Admin: get full feedback view for a specific teacher. */
export interface AdminTeacherFeedback {
  teacher_id: number
  avg_rating: number
  total_responses: number
  response_rate: number
  distribution: Record<number, number>
  positive_tags: Record<string, number>
  improvement_tags: Record<string, number>
  has_enough_data: boolean
  recent: Array<{
    id: number
    rating: number
    positive_tags: string[]
    improvement_tags: string[]
    comment: string | null
    moderation_status: "pending" | "published" | "hidden" | "flagged"
    anonymous: boolean
    student_id: number
    course_id: string
    class_title: string | null
    class_date: string | null
    admin_note: string | null
    coaching_note_published: boolean
    admin_coaching_note: string | null
    created_at: string
  }>
}

export function getAdminTeacherFeedback(teacherId: number) {
  return get<AdminTeacherFeedback>(`/api/feedback/admin/teacher/${teacherId}`)
}

/** Admin: moderate a specific feedback comment. */
export function moderateFeedback(feedbackId: number, data: {
  moderation_status?: "published" | "hidden" | "flagged" | "pending"
  admin_note?: string
  admin_coaching_note?: string
  coaching_note_published?: boolean
}) {
  return put<{ id: number; moderation_status: string }>(
    `/api/feedback/admin/${feedbackId}/moderate`,
    data,
  )
}
