// Password-reset request — POST { email }.
//
// Generates a stateless HMAC-signed token (good for 60 minutes), wraps it in
// a `/reset-password/<token>` URL, and emails the user via ZeptoMail.
//
// Always returns `{ ok: true }` regardless of whether the email exists, to
// avoid leaking which addresses have accounts (classic enumeration defence).
// In real production you would also rate-limit per IP + per email.

import { NextResponse, type NextRequest } from "next/server"
import { issueToken } from "@/lib/auth-tokens"
import { sendEmail } from "@/lib/zepto"
import { passwordResetEmail } from "@/lib/email-templates"

export const runtime = "nodejs"

const TTL_SECONDS = 60 * 60  // 1 hour

export async function POST(req: NextRequest) {
  let body: { email?: string; name?: string; tenant?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const email = (body.email ?? "").trim().toLowerCase()
  if (!email || !/^[^@]+@[^@]+\.[^@]+$/.test(email)) {
    // Still return 200 to avoid leaking validation differences — but skip
    // sending. Frontend treats both the same.
    return NextResponse.json({ ok: true })
  }

  const tenant = (body.tenant ?? "").trim() || undefined
  const token = issueToken({
    sub: email,
    kind: "password-reset",
    ttlSeconds: TTL_SECONDS,
    tenant,
  })
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "")
  // Tenant-scoped requests get a branded URL inside the portal so
  // the user lands back on their workspace's reset page (with the
  // tenant header, theme, etc.). Platform-level requests keep the
  // legacy URL.
  const resetUrl = tenant
    ? `${base}/p/${encodeURIComponent(tenant)}/reset-password/${token}`
    : `${base}/reset-password/${token}`

  const msg = passwordResetEmail({
    recipientName: body.name,
    resetUrl,
    expiresIn: "60 minutes",
  })
  // Fire-and-forget: we don't block the response on email delivery so the
  // attacker can't time-side-channel whether the address exists.
  void sendEmail({
    to: email,
    subject: msg.subject,
    html: msg.html,
    text: msg.text,
  }).catch((err) => {
    // eslint-disable-next-line no-console
    console.error("[reset-request] send failed", err)
  })

  return NextResponse.json({ ok: true })
}
