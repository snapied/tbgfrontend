"use client"

// Thin client for the backend's /api/billing/* endpoints.
//
// Auth: the backend's requireAuth middleware expects an
// `Authorization: Bearer <accessToken>` header. The frontend stores
// that token in localStorage under ACCESS_TOKEN_KEY after login (set
// by the login page / refresh flow once those are wired). If the
// token is missing we just don't send the header — the backend will
// 401, and the dashboard's billing page surfaces "Please log in".

import type { PlanId, BillingPeriod, PlanLimits } from "./plans"
import { deserializeLimits } from "./plans"

export const ACCESS_TOKEN_KEY = "thebigclass.accessToken"

export interface SubscriptionInfo {
  plan: PlanId
  status: "active" | "trialing" | "past_due" | "cancelled" | "paused"
  period: BillingPeriod | null
  currentPeriodEnd: string | null
  trialEndsAt: string | null
  manual: boolean
  razorpaySubscriptionId: string | null
}

export interface UsageSnapshot {
  students: number
  teachers: number
  batches: number
  storageBytes: number
  publishedCourses: number
}

export interface BillingStatus {
  subscription: SubscriptionInfo
  limits: PlanLimits
  usage: UsageSnapshot
  billing: { configured: boolean; configurationError: string | null }
}

function apiBase(): string {
  return (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000").replace(/\/$/, "")
}

function authHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {}
  const token = window.localStorage.getItem(ACCESS_TOKEN_KEY)
  return token ? { Authorization: `Bearer ${token}` } : {}
}

// True iff a backend access token is present in localStorage.
export function hasAccessToken(): boolean {
  if (typeof window === "undefined") return false
  return !!window.localStorage.getItem(ACCESS_TOKEN_KEY)
}

// Try to mint a fresh access token from the httpOnly refresh cookie.
// Returns true when the cookie session is alive (and stores the new
// token in localStorage). This is the fix for the case where the user
// IS signed in on the backend (cookie session valid, email-verify
// banner renders, etc.) but localStorage was cleared / never wrote
// the token (older signup flow, cross-device, incognito reset).
//
// Called lazily before each authed page tries to render — cheap (one
// fetch) and only runs when there's no token to begin with, so it
// doesn't add latency for the common signed-in-recently path.
let _refreshInFlight: Promise<boolean> | null = null
export function tryRefreshSession(): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false)
  if (_refreshInFlight) return _refreshInFlight
  _refreshInFlight = fetch(`${apiBase()}/api/auth/refresh`, {
    method: "POST",
    credentials: "include",
  })
    .then(async (r) => {
      if (!r.ok) return false
      const body = (await r.json()) as { accessToken?: string }
      if (!body.accessToken) return false
      window.localStorage.setItem(ACCESS_TOKEN_KEY, body.accessToken)
      return true
    })
    .catch(() => false)
    .finally(() => {
      _refreshInFlight = null
    })
  return _refreshInFlight
}

/**
 * Resolve "is this user authenticated against the backend?" in a way
 * that handles both states:
 *   1. accessToken already in localStorage → true immediately
 *   2. no token but refresh cookie valid → mints + stores + true
 *   3. no token, no valid cookie → false
 *
 * Pages that need the real backend should await this before deciding
 * whether to render the SignInRequired card.
 */
export async function ensureAuthed(): Promise<boolean> {
  if (hasAccessToken()) return true
  return tryRefreshSession()
}

/** @deprecated synchronous check that misses the cookie-session path.
 *  Kept as a thin alias to hasAccessToken() so existing call sites
 *  compile, but new code should `await ensureAuthed()` instead. */
export function isAuthed(): boolean {
  return hasAccessToken()
}

export async function fetchSubscription(): Promise<BillingStatus | { error: string; status: number }> {
  try {
    const res = await fetch(`${apiBase()}/api/billing/subscription`, {
      headers: authHeaders(),
      credentials: "include",
    })
    if (!res.ok) {
      return { error: await safeError(res), status: res.status }
    }
    const body = (await res.json()) as BillingStatus
    // Convert UNLIMITED_SENTINEL ints back to Infinity for nicer client
    // logic (`limit === Infinity` is more readable than `limit > 2e9`).
    body.limits = deserializeLimits(body.limits)
    return body
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Network error", status: 0 }
  }
}

export interface CheckoutResult {
  shortUrl: string
  subscriptionId: string
}

export async function startCheckout(
  plan: Exclude<PlanId, "starter" | "institute">,
  period: BillingPeriod,
): Promise<CheckoutResult | { error: string; status: number }> {
  try {
    const res = await fetch(`${apiBase()}/api/billing/checkout`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      credentials: "include",
      body: JSON.stringify({ plan, period }),
    })
    if (!res.ok) {
      return { error: await safeError(res), status: res.status }
    }
    return (await res.json()) as CheckoutResult
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Network error", status: 0 }
  }
}

export interface CancelPayload {
  /** Short tag from the modal's preset list (e.g. "too_expensive"). */
  reason: string
  /** Optional free-text from the "tell us more" textarea. */
  comment?: string
  /** True when the user also asked us to deactivate the account + data. */
  deleteAccount?: boolean
}

export async function cancelSubscription(
  payload: CancelPayload = { reason: "" },
): Promise<{ ok: true; message: string } | { error: string; status: number }> {
  try {
    const res = await fetch(`${apiBase()}/api/billing/cancel`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      credentials: "include",
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      return { error: await safeError(res), status: res.status }
    }
    return (await res.json()) as { ok: true; message: string }
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Network error", status: 0 }
  }
}

export async function refreshFromRazorpay(): Promise<{ ok: true; status: string } | { error: string; status: number }> {
  try {
    const res = await fetch(`${apiBase()}/api/billing/refresh`, {
      method: "POST",
      headers: authHeaders(),
      credentials: "include",
    })
    if (!res.ok) {
      return { error: await safeError(res), status: res.status }
    }
    return (await res.json()) as { ok: true; status: string }
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Network error", status: 0 }
  }
}

async function safeError(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { error?: string }
    return body.error || `Request failed (${res.status})`
  } catch {
    return `Request failed (${res.status})`
  }
}
