"use client"

// Thin wrapper around /api/email/send that ALSO logs every send into
// the LMS store's outbound email log, so the Inbox's "Sent" view has
// something to show. Call this anywhere you'd otherwise fetch
// /api/email/send directly — same payload, just goes through here
// instead so the log stays complete.
//
// The route itself stays unauthenticated for the demo; the log is
// client-side per-tenant (lms-store + slug-scoped localStorage), so
// tenant A's sent log can't leak to tenant B.

import { generateId } from "@/lib/lms-store"
import type { SentEmail } from "@/lib/lms-store"

export interface SendEmailPayload {
  to: string | Array<{ email: string; name?: string }>
  subject: string
  html?: string
  text?: string
  replyTo?: string
}

export interface SendEmailMeta {
  /** Free-form provenance — "doubt-reply", "support-ack", … */
  kind?: string
  /** Display name to show in the Sent list. */
  fromName?: string
  /** URL to deep-link to the source surface from the Sent card. */
  contextUrl?: string
}

// Strip HTML to a short text preview for the Sent list. We keep the
// first ~240 chars; the full HTML body is never displayed in the
// log card (too risky to render arbitrary HTML in chrome).
function htmlPreview(payload: SendEmailPayload): string {
  const source = payload.text ?? payload.html ?? ""
  return source
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 240)
}

function recipientsToStringOrArray(
  to: SendEmailPayload["to"],
): string | string[] {
  if (typeof to === "string") return to
  return to.map((r) => r.email)
}

/**
 * Send an email AND log it. Returns the API response. Logging happens
 * even when the API stubs (provider not configured) so the user sees
 * what would have gone out.
 */
export async function sendAndLog(
  payload: SendEmailPayload,
  meta: SendEmailMeta,
  // Inject the store's logger so the function stays a pure module
  // (no React hook coupling). Caller from a component already has
  // `logSentEmail` in scope via useLMS().
  log: (entry: SentEmail) => void,
): Promise<{ ok: boolean; stub?: boolean }> {
  let ok = false
  let stub = false
  try {
    const res = await fetch("/api/email/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    const body = await res.json().catch(() => ({}))
    ok = res.ok && !body?.stub
    stub = !!body?.stub
  } catch {
    /* network down — record the attempt with delivered=false */
  }
  try {
    log({
      id: generateId("sent"),
      sentAt: new Date().toISOString(),
      fromName: meta.fromName,
      to: recipientsToStringOrArray(payload.to),
      subject: payload.subject,
      preview: htmlPreview(payload),
      contextUrl: meta.contextUrl,
      kind: meta.kind,
      delivered: ok,
    })
  } catch {
    /* log failure shouldn't break the send */
  }
  return { ok, stub }
}
