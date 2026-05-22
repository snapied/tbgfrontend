"use client"

// Client for /api/payouts/*. Mirrors the response shapes the backend
// returns — kept here so the dashboard page doesn't have to re-derive
// types from raw JSON.

import { ACCESS_TOKEN_KEY } from "./billing-client"

export type PayoutsMode = "route" | "byo"
export type PayoutsStatus =
  | "not_started"
  | "pending"
  | "under_review"
  | "activated"
  | "rejected"
  | "suspended"
export type PayoutRecordStatus = "processed" | "reversed" | "failed" | "pending"

export interface PayoutsAccount {
  mode: PayoutsMode
  status: PayoutsStatus
  razorpayAccountId: string | null
  settlementSchedule: string
  legalBusinessName: string | null
  businessType: string | null
  contactEmail: string | null
  contactPhone: string | null
  pan: string | null
  gstin: string | null
  bank: {
    holderName: string
    accountNumberMasked: string
    ifsc: string
  } | null
  hasBYOCreds: boolean
}

export interface PayoutTotals {
  grossPaise: number
  netPaise: number
  gatewayFeePaise: number
  platformFeePaise: number
}

export interface PayoutRow {
  id: number
  grossPaise: number
  gatewayFeePaise: number
  platformFeePaise: number
  netPaise: number
  currency: string
  status: PayoutRecordStatus
  settledAt: string | null
  productLabel: string | null
  customerEmail: string | null
  createdAt: string
}

export interface PayoutsStatusResponse {
  account: PayoutsAccount
  totals: PayoutTotals
  recent: PayoutRow[]
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

async function safeError(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { error?: string }
    return body.error || `Request failed (${res.status})`
  } catch {
    return `Request failed (${res.status})`
  }
}

export async function fetchPayoutsStatus(): Promise<PayoutsStatusResponse | { error: string; status: number }> {
  const res = await fetch(`${apiBase()}/api/payouts/status`, {
    headers: authHeaders(),
    credentials: "include",
  })
  if (!res.ok) return { error: await safeError(res), status: res.status }
  return (await res.json()) as PayoutsStatusResponse
}

export interface PayoutsSetupInput {
  legalBusinessName: string
  businessType: "proprietorship" | "partnership" | "private_limited" | "public_limited" | "individual" | "llp"
  contactEmail: string
  contactPhone: string
  pan: string
  gstin?: string
  registeredAddress: {
    street1: string
    city: string
    state: string
    postalCode: string
    country: string
  }
  bankAccount: { holderName: string; accountNumber: string; ifsc: string }
  stakeholder: {
    name: string
    email: string
    relationship?: "director" | "proprietor" | "partner" | "shareholder" | "other"
    pan?: string
  }
}

export async function submitPayoutsSetup(
  input: PayoutsSetupInput,
): Promise<{ ok: true; status: PayoutsStatus } | { error: string; status: number }> {
  const res = await fetch(`${apiBase()}/api/payouts/setup`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    credentials: "include",
    body: JSON.stringify(input),
  })
  if (!res.ok) return { error: await safeError(res), status: res.status }
  return (await res.json()) as { ok: true; status: PayoutsStatus }
}

export async function refreshPayoutsFromRazorpay(): Promise<{ ok: true; status: PayoutsStatus } | { error: string; status: number }> {
  const res = await fetch(`${apiBase()}/api/payouts/refresh`, {
    method: "POST",
    headers: authHeaders(),
    credentials: "include",
  })
  if (!res.ok) return { error: await safeError(res), status: res.status }
  return (await res.json()) as { ok: true; status: PayoutsStatus }
}

export async function setPayoutsMode(
  mode: PayoutsMode,
  byoKeyId?: string,
  byoKeySecret?: string,
): Promise<{ ok: true; mode: PayoutsMode; status: PayoutsStatus } | { error: string; status: number }> {
  const res = await fetch(`${apiBase()}/api/payouts/mode`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    credentials: "include",
    body: JSON.stringify({ mode, byoKeyId, byoKeySecret }),
  })
  if (!res.ok) return { error: await safeError(res), status: res.status }
  return (await res.json()) as { ok: true; mode: PayoutsMode; status: PayoutsStatus }
}
