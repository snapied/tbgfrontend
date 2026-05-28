"use client"

// Client for /api/addons — add-on purchase, listing, and cancellation.

import { ACCESS_TOKEN_KEY } from "./billing-client"

function apiBase(): string {
  return (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000").replace(/\/$/, "")
}

function authHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {}
  const token = window.localStorage.getItem(ACCESS_TOKEN_KEY)
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export interface AddonCatalogItem {
  id: string
  name: string
  priceMonthlyPaise: number
  priceDisplay: string
  unit: string
  description: string
  live: boolean
  canPurchase: boolean
  boosts?: string
  boostAmount?: number
  activePurchases: Array<{
    id: number
    quantity: number
    activated_at: string
    status: string
  }>
  totalQuantity: number
}

export interface AddonsResponse {
  addons: AddonCatalogItem[]
  plan: string
  isPaidPlan: boolean
}

export async function fetchAddons(): Promise<AddonsResponse> {
  const res = await fetch(`${apiBase()}/api/addons`, {
    headers: authHeaders(),
    credentials: "include",
  })
  if (!res.ok) throw new Error("Failed to load add-ons")
  return res.json()
}

export async function purchaseAddon(addonId: string, quantity = 1): Promise<{
  addon_id: number
  addon_type: string
  quantity: number
  priceDisplay: string
  status: string
}> {
  const res = await fetch(`${apiBase()}/api/addons/purchase`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    credentials: "include",
    body: JSON.stringify({ addon_id: addonId, quantity }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Purchase failed" }))
    throw new Error(err.error || "Purchase failed")
  }
  return res.json()
}

export async function cancelAddon(purchaseId: number): Promise<{
  id: number
  status: string
  expires_at: string
}> {
  const res = await fetch(`${apiBase()}/api/addons/${purchaseId}/cancel`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    credentials: "include",
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Cancellation failed" }))
    throw new Error(err.error || "Cancellation failed")
  }
  return res.json()
}
