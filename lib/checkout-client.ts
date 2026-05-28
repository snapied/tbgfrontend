"use client"

// Client for /api/checkout/* — coupon validation, order initiation,
// and status polling. The frontend never creates enrollments.

import { ACCESS_TOKEN_KEY } from "./billing-client"

function apiBase(): string {
  return (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000").replace(/\/$/, "")
}

function authHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {}
  const token = window.localStorage.getItem(ACCESS_TOKEN_KEY)
  return token ? { Authorization: `Bearer ${token}` } : {}
}

// ── Types ────────────────────────────────────────────────────────

export interface CouponValidation {
  valid: boolean
  coupon_id?: number
  discount_type?: "percentage" | "fixed_amount"
  discount_value?: number
  original_price?: number
  discount_amount?: number
  final_price?: number
  currency?: string
  error?: string
}

export interface CheckoutInitResult {
  order_id: number
  // Paid path
  razorpay_order_id?: string
  razorpay_key?: string
  amount_paise?: number
  currency?: string
  // Prefill for Razorpay checkout (from authenticated user)
  prefill?: { name?: string; email?: string; contact?: string }
  // Free/dev path
  status?: "paid"
  enrolled?: boolean
  already_paid?: boolean
  dev_mode?: boolean
  error?: string
}

export interface OrderStatus {
  order_id: number
  status: "pending" | "paid" | "failed" | "expired" | "refunded"
  course_id: string
  paid_at: string | null
}

// ── API Functions ────────────────────────────────────────────────

export async function validateCoupon(
  courseId: string,
  couponCode: string,
  coursePrice: number,
): Promise<CouponValidation> {
  const res = await fetch(`${apiBase()}/api/checkout/validate-coupon`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    credentials: "include",
    body: JSON.stringify({ course_id: courseId, coupon_code: couponCode, course_price: coursePrice }),
  })
  return res.json()
}

export async function initiateCheckout(data: {
  course_id: string
  course_price: number
  coupon_code?: string
  idempotency_key: string
}): Promise<CheckoutInitResult> {
  const res = await fetch(`${apiBase()}/api/checkout/initiate`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    credentials: "include",
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `Request failed (${res.status})` }))
    throw new Error(err.error || `Checkout failed (${res.status})`)
  }
  return res.json()
}

export async function pollOrderStatus(orderId: number): Promise<OrderStatus> {
  const res = await fetch(`${apiBase()}/api/checkout/status?order_id=${orderId}`, {
    headers: authHeaders(),
    credentials: "include",
  })
  if (!res.ok) throw new Error("Failed to check order status")
  return res.json()
}

/**
 * Poll until the order is no longer pending.
 * Returns the final status, or "timeout" if 10 polls pass.
 */
export async function waitForPayment(
  orderId: number,
  onPoll?: (attempt: number) => void,
): Promise<OrderStatus & { timeout?: boolean }> {
  for (let i = 0; i < 10; i++) {
    onPoll?.(i + 1)
    const status = await pollOrderStatus(orderId)
    if (status.status !== "pending") return status
    await new Promise((r) => setTimeout(r, 3000))
  }
  return { order_id: orderId, status: "pending", course_id: "", paid_at: null, timeout: true }
}
