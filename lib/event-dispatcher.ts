"use client"

// Thin client for /api/events/dispatch. Fire-and-forget — webhooks
// shouldn't block UI. Silently no-ops when there's no auth token
// (demo session), so we don't spam consoles for users not connected
// to a real backend.
//
// Events allowed from the client (matches CLIENT_ALLOWED in
// backend/src/routes/events.ts):
//   - order.paid
//   - order.refunded
//   - enrollment.created
//   - enrollment.revoked
//   - course.published
//   - course.archived

import { ACCESS_TOKEN_KEY } from "./billing-client"

export type ClientEvent =
  | "order.paid"
  | "order.refunded"
  | "enrollment.created"
  | "enrollment.revoked"
  | "course.published"
  | "course.archived"

export function fireWebhookEvent(event: ClientEvent, data: Record<string, unknown>): void {
  if (typeof window === "undefined") return
  const token = window.localStorage.getItem(ACCESS_TOKEN_KEY)
  if (!token) return // demo session, no backend
  const apiBase = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000").replace(/\/$/, "")
  void fetch(`${apiBase}/api/events/dispatch`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ event, data }),
  }).catch(() => {
    // Webhook fan-out is best-effort. A failed dispatch shouldn't
    // block the user's action — the worker also has its own retry
    // for in-flight deliveries.
  })
}
