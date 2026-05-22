// Request an email-verification link — POST { email, name? }.
//
// Issues an HMAC-signed `email-verify` token (good for 7 days) and mails
// the user via ZeptoMail. Always returns 200 to avoid leaking which
// addresses exist.

import { NextResponse, type NextRequest } from "next/server"
import { issueToken } from "@/lib/auth-tokens"
import { sendEmail } from "@/lib/zepto"
import { verifyEmailEmail } from "@/lib/email-templates"

export const runtime = "nodejs"

const TTL_SECONDS = 7 * 24 * 60 * 60  // 7 days

export async function POST(req: NextRequest) {
  let body: { email?: string; name?: string }
  try { body = await req.json() }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }) }

  const email = (body.email ?? "").trim().toLowerCase()
  if (!email || !/^[^@]+@[^@]+\.[^@]+$/.test(email)) {
    return NextResponse.json({ ok: true })  // silent no-op for invalid input
  }

  const token = issueToken({ sub: email, kind: "email-verify", ttlSeconds: TTL_SECONDS })
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "")
  const verifyUrl = `${base}/verify-email/${token}`

  const msg = verifyEmailEmail({ recipientName: body.name, verifyUrl, expiresIn: "7 days" })
  void sendEmail({
    to: [{ email, name: body.name }],
    subject: msg.subject,
    html: msg.html,
    text: msg.text,
  }).catch((err) => {
    // eslint-disable-next-line no-console
    console.error("[verify-request] send failed", err)
  })

  return NextResponse.json({ ok: true })
}
