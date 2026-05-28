"use client"

// Client for /api/teachers/* — teacher management, commission setup,
// earnings dashboard, and payout operations.

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

// ── Types ────────────────────────────────────────────────────────

export interface TeacherListItem {
  id: number
  name: string
  email: string
  status: string
  commission_enabled: boolean
  avatar_url: string | null
  total_earned: number
  last_payout_date: string | null
  created_at: string
}

export interface CommissionTerm {
  id: number
  course_id: string
  commission_model: "percentage" | "per_student_fixed" | "per_class_fixed" | null
  teacher_pct: number | null
  fixed_amount: number | null
  fee_per_class: number | null
  total_classes: number | null
  completed_classes: number
  coupon_attribution: string
  effective_from: string
}

export interface Agreement {
  id: number
  status: string
  template_version: string
  injected_terms: Record<string, unknown>
  signed_at: string | null
  pdf_url: string | null
  created_at: string
}

export interface TeacherDetail {
  teacher: {
    id: number
    name: string
    email: string
    phone: string | null
    bio: string | null
    avatar_url: string | null
    status: string
    commission_enabled: boolean
    terminated_at: string | null
    termination_type: string | null
    created_at: string
  }
  commission_terms: CommissionTerm[]
  agreements: Agreement[]
}

export interface EarningsSummary {
  total_earned: number
  pending_clearance: number
  cleared_ready: number
  total_paid_out: number
  currency: string
  commission_model: string | null
  teacher_pct: number | null
  fixed_amount: number | null
  fee_per_class: number | null
  total_classes: number | null
  completed_classes: number
  agreement: { signed_at: string; pdf_url: string | null } | null
}

export interface Transaction {
  id: number
  date: string
  gross_amount: number
  gateway_fee: number
  gateway_tax: number
  commissionable_base: number
  teacher_share: number
  academy_share: number
  commission_model: string | null
  refund_amount: number
  status: string
}

export interface CommissionPreview {
  gross_amount: number
  gateway_fee: number
  gateway_tax: number
  commissionable_base: number
  teacher_share: number
  academy_share: number
  academy_share_negative: boolean
}

export interface PendingPayoutTeacher {
  teacher_id: number
  name: string
  cleared_balance: number
  payout_method: string | null
  kyc_status: string
}

// ── API Functions ────────────────────────────────────────────────

// Step 1: Create teacher
export function createTeacher(data: {
  name: string
  email: string
  phone?: string
  bio?: string
  avatar_url?: string
  assigned_course_ids?: string[]
  commission_enabled: boolean
}) {
  return post<{ teacher_id: number; status: string; commission_enabled: boolean }>(
    "/api/teachers",
    data,
  )
}

// Step 2: Set up commission
export function setupCommission(teacherId: number, data: {
  commission_model: string
  teacher_pct?: number
  fixed_amount?: number
  fee_per_class?: number
  total_classes?: number
  agreement_template_id?: number
  assigned_course_ids?: string[]
  coupon_attribution?: string
}) {
  return put<{ teacher_id: number; agreement_id: number | null; status: string }>(
    `/api/teachers/${teacherId}/commission`,
    data,
  )
}

// List teachers
export function listTeachers() {
  return get<{ teachers: TeacherListItem[] }>("/api/teachers")
}

// Get teacher detail
export function getTeacher(id: number) {
  return get<TeacherDetail>(`/api/teachers/${id}`)
}

// Terminate teacher
export function terminateTeacher(id: number, data: {
  termination_type: "hard" | "graceful"
  graceful_until?: string
}) {
  return put<{ status: string; termination_type: string; pending_payout_amount: number }>(
    `/api/teachers/${id}/terminate`,
    data,
  )
}

// Commission preview
export function previewCommission(data: {
  commission_model: string
  teacher_pct?: number
  fixed_amount?: number
  fee_per_class?: number
  sample_amount?: number
}) {
  return post<CommissionPreview>("/api/teachers/commission-preview", data)
}

// Earnings summary
export function getEarningsSummary(teacherId: number) {
  return get<EarningsSummary>(`/api/teachers/${teacherId}/earnings/summary`)
}

// Earnings transactions
export function getEarningsTransactions(teacherId: number, page = 1) {
  return get<{ transactions: Transaction[]; pagination: { page: number; per_page: number; total: number } }>(
    `/api/teachers/${teacherId}/earnings/transactions?page=${page}`,
  )
}

// Payout history
export function getPayoutHistory(teacherId: number) {
  return get<{ payouts: Array<{ id: number; date: string; amount: number; method: string; bank_last4: string | null; status: string; reference: string | null }> }>(
    `/api/teachers/${teacherId}/earnings/payouts`,
  )
}

// Admin: Pending payouts
export function getPendingPayouts() {
  return get<{ teachers: PendingPayoutTeacher[] }>("/api/teachers/admin/payouts/pending")
}

// Admin: Trigger payout batch
export function triggerPayoutBatch(teacherIds: number[]) {
  return post<{ batch_id: string; teacher_count: number; total_amount: number }>(
    "/api/teachers/admin/payouts/trigger",
    { teacher_ids: teacherIds },
  )
}
