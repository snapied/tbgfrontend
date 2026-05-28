"use client"

// Client for /api/invites/* — admin invite creation/management and
// public invite viewing/payment/claiming. All field names use
// snake_case matching the backend exactly.

import { ACCESS_TOKEN_KEY } from "./billing-client"

function apiBase(): string {
  return (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000").replace(/\/$/, "")
}

function authHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {}
  const token = window.localStorage.getItem(ACCESS_TOKEN_KEY)
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function safeError(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { error?: string }
    return body.error || `Request failed (${res.status})`
  } catch {
    return `Request failed (${res.status})`
  }
}

// ── Types (match backend responses exactly) ─────────────────────

export type InviteType = "personal" | "reusable" | "negotiated" | "parent_pay"

export type InviteStatus =
  | "draft"
  | "sent"
  | "viewed"
  | "payment_pending"
  | "paid"
  | "claimed"
  | "expired"
  | "revoked"
  | "failed"

// Response from POST /api/invites (create)
export interface InviteCreateResult {
  id: number
  token: string
  url: string
  status: InviteStatus
  expires_at: string
}

// Response from GET /api/invites (list)
export interface InviteListItem {
  id: number
  token: string
  url: string
  course_id: string
  type: InviteType
  recipient_name: string | null
  recipient_email: string | null
  final_price: number
  status: InviteStatus
  sent_via: string | null
  sent_at: string | null
  paid_at: string | null
  claimed_at: string | null
  payer_email: string | null
  claimed_by_user_id: number | null
  email_mismatch: boolean
  identity_mismatch: boolean
  expires_at: string
  use_count: number
  created_at: string
}

// Response from GET /api/invites/view/:token
export interface InviteViewData {
  invite_id: number
  tenant_id: number
  tenant_slug: string
  academy_name: string
  academy_logo: string | null
  course_id: string
  course_title: string
  course_description: string
  course_thumbnail: string
  course_category: string
  course_slug: string
  type: InviteType
  recipient_name: string | null
  recipient_email: string | null
  recipient_phone: string | null
  original_price: number
  override_price: number | null
  coupon_code: string | null
  final_price: number
  admin_note: string | null
  expires_at: string
  status: InviteStatus
}

// Response from POST /api/invites/pay/:token
export interface InvitePayResult {
  order_id: number
  // Razorpay path
  razorpay_order_id?: string
  razorpay_key?: string
  amount_paise?: number
  currency?: string
  // Prefill for Razorpay checkout (from invite recipient data)
  prefill?: { name?: string; email?: string; contact?: string }
  // Free / dev path
  status?: "paid"
  needs_claim?: boolean
  dev_mode?: boolean
}

// Response from POST /api/invites/claim/:token
export interface InviteClaimResult {
  status: "claimed" | "already_enrolled"
  enrolled?: boolean
  enrollment_id?: number
  course_id: string
  course_slug: string
  tenant_slug: string
  identity_mismatch?: boolean
}

// ── Admin endpoints (auth required) ─────────────────────────────

export async function createInvite(data: {
  course_id: string
  type?: InviteType
  recipient_name?: string
  recipient_email?: string
  recipient_phone?: string
  course_price?: number
  override_price?: number
  coupon_code?: string
  admin_note?: string
  expires_in_days?: number
  sent_via?: string  // "email" | "whatsapp" | "copy_link"
}): Promise<InviteCreateResult | { error: string; status: number }> {
  try {
    const res = await fetch(`${apiBase()}/api/invites`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      credentials: "include",
      body: JSON.stringify(data),
    })
    if (!res.ok) return { error: await safeError(res), status: res.status }
    return (await res.json()) as InviteCreateResult
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Network error", status: 0 }
  }
}

export async function listInvites(courseId?: string): Promise<{ invites: InviteListItem[] } | { error: string; status: number }> {
  try {
    const qs = courseId ? `?course_id=${courseId}` : ""
    const res = await fetch(`${apiBase()}/api/invites${qs}`, {
      headers: authHeaders(),
      credentials: "include",
    })
    if (!res.ok) return { error: await safeError(res), status: res.status }
    return (await res.json()) as { invites: InviteListItem[] }
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Network error", status: 0 }
  }
}

export async function revokeInvite(inviteId: number): Promise<{ id: number; status: string } | { error: string; status: number }> {
  try {
    const res = await fetch(`${apiBase()}/api/invites/${inviteId}/revoke`, {
      method: "POST",
      headers: authHeaders(),
      credentials: "include",
    })
    if (!res.ok) return { error: await safeError(res), status: res.status }
    return (await res.json()) as { id: number; status: string }
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Network error", status: 0 }
  }
}

export async function resendInvite(inviteId: number, sentVia?: string): Promise<{ id: number; status: string; url: string } | { error: string; status: number }> {
  try {
    const res = await fetch(`${apiBase()}/api/invites/${inviteId}/resend`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      credentials: "include",
      body: JSON.stringify({ sent_via: sentVia }),
    })
    if (!res.ok) return { error: await safeError(res), status: res.status }
    return (await res.json()) as { id: number; status: string; url: string }
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Network error", status: 0 }
  }
}

// ── Public endpoints (no auth for view/pay) ─────────────────────

export async function viewInvite(token: string): Promise<InviteViewData | { error: string; status: number }> {
  try {
    const res = await fetch(`${apiBase()}/api/invites/view/${token}`)
    if (!res.ok) return { error: await safeError(res), status: res.status }
    return (await res.json()) as InviteViewData
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Network error", status: 0 }
  }
}

export async function payInvite(token: string): Promise<InvitePayResult | { error: string; status: number }> {
  try {
    const res = await fetch(`${apiBase()}/api/invites/pay/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    })
    if (!res.ok) return { error: await safeError(res), status: res.status }
    return (await res.json()) as InvitePayResult
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Network error", status: 0 }
  }
}

// ── Authenticated endpoint (claim after payment + login) ────────

export async function claimInvite(token: string, learnerUserId?: number): Promise<InviteClaimResult | { error: string; status: number }> {
  try {
    const res = await fetch(`${apiBase()}/api/invites/claim/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      credentials: "include",
      body: JSON.stringify(learnerUserId ? { learner_user_id: learnerUserId } : {}),
    })
    if (!res.ok) return { error: await safeError(res), status: res.status }
    return (await res.json()) as InviteClaimResult
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Network error", status: 0 }
  }
}
