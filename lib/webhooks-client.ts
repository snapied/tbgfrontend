"use client"

// Client for /api/webhooks/*. Same auth pattern as billing /
// payouts (Bearer token from thebigclass.accessToken).

import { ACCESS_TOKEN_KEY } from "./billing-client"

export type WebhookStatus = "active" | "disabled"
export type DeliveryStatus = "pending" | "success" | "failed" | "abandoned"

export interface WebhookRow {
  id: number
  url: string
  label: string | null
  events: string[]
  status: WebhookStatus
  lastDeliveryAt: string | null
  lastSuccessAt: string | null
  consecutiveFailures: number
  createdAt: string
}

export interface DeliveryRow {
  id: number
  eventId: string
  eventType: string
  attempt: number
  status: DeliveryStatus
  responseStatus: number | null
  responseBodyExcerpt: string | null
  errorMessage: string | null
  nextAttemptAt: string | null
  deliveredAt: string | null
  createdAt: string
}

function apiBase(): string {
  return (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000").replace(/\/$/, "")
}

function authHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {}
  const token = window.localStorage.getItem(ACCESS_TOKEN_KEY)
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function readError(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { error?: string }
    return body.error || `Request failed (${res.status})`
  } catch {
    return `Request failed (${res.status})`
  }
}

export async function listEvents(): Promise<string[] | { error: string }> {
  const res = await fetch(`${apiBase()}/api/webhooks/events`, {
    headers: authHeaders(),
    credentials: "include",
  })
  if (!res.ok) return { error: await readError(res) }
  const body = (await res.json()) as { events: string[] }
  return body.events
}

export async function listWebhooks(): Promise<WebhookRow[] | { error: string }> {
  const res = await fetch(`${apiBase()}/api/webhooks`, {
    headers: authHeaders(),
    credentials: "include",
  })
  if (!res.ok) return { error: await readError(res) }
  const body = (await res.json()) as { webhooks: WebhookRow[] }
  return body.webhooks
}

export interface CreateWebhookInput {
  url: string
  label?: string
  events: string[]
}

export interface CreatedWebhook {
  webhook: WebhookRow
  /** Only present on creation. Show ONCE then forget. */
  secret: string
}

export async function createWebhook(
  input: CreateWebhookInput,
): Promise<CreatedWebhook | { error: string }> {
  const res = await fetch(`${apiBase()}/api/webhooks`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    credentials: "include",
    body: JSON.stringify(input),
  })
  if (!res.ok) return { error: await readError(res) }
  return (await res.json()) as CreatedWebhook
}

export async function patchWebhook(
  id: number,
  input: Partial<{ label: string; url: string; events: string[]; status: WebhookStatus }>,
): Promise<WebhookRow | { error: string }> {
  const res = await fetch(`${apiBase()}/api/webhooks/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    credentials: "include",
    body: JSON.stringify(input),
  })
  if (!res.ok) return { error: await readError(res) }
  const body = (await res.json()) as { webhook: WebhookRow }
  return body.webhook
}

export async function deleteWebhook(id: number): Promise<{ ok: true } | { error: string }> {
  const res = await fetch(`${apiBase()}/api/webhooks/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
    credentials: "include",
  })
  if (!res.ok) return { error: await readError(res) }
  return { ok: true }
}

export async function testWebhook(
  id: number,
): Promise<{ ok: true; queuedEventId: string } | { error: string }> {
  const res = await fetch(`${apiBase()}/api/webhooks/${id}/test`, {
    method: "POST",
    headers: authHeaders(),
    credentials: "include",
  })
  if (!res.ok) return { error: await readError(res) }
  return (await res.json()) as { ok: true; queuedEventId: string }
}

export async function listDeliveries(
  webhookId: number,
): Promise<DeliveryRow[] | { error: string }> {
  const res = await fetch(`${apiBase()}/api/webhooks/${webhookId}/deliveries`, {
    headers: authHeaders(),
    credentials: "include",
  })
  if (!res.ok) return { error: await readError(res) }
  const body = (await res.json()) as { deliveries: DeliveryRow[] }
  return body.deliveries
}
