// Fire-and-forget welcome email — POST { email, name, workspaceName, slug }.
//
// Called by the /signup page right after the local tenant record is created.
// Returns 200 immediately and runs the send in the background so signup never
// blocks on email delivery.

import { NextResponse, type NextRequest } from "next/server"
import { sendEmail } from "@/lib/zepto"
import { welcomeEmail, verifyEmailEmail } from "@/lib/email-templates"
import { issueToken } from "@/lib/auth-tokens"

export const runtime = "nodejs"

interface Payload {
  email?: string
  name?: string
  workspaceName?: string
  slug?: string
}

export async function POST(req: NextRequest) {
  let body: Payload
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const email = (body.email ?? "").trim().toLowerCase()
  const name = (body.name ?? "").trim()
  const workspaceName = (body.workspaceName ?? name ?? "Your workspace").trim()
  const slug = (body.slug ?? "").trim()
  if (!email || !slug) {
    return NextResponse.json({ error: "Missing email or slug" }, { status: 400 })
  }

  const base = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "")
  const dashboardUrl = `${base}/dashboard`
  // Subdomain URL where the academy lives — surfaces in the welcome email so
  // the user can see and copy their public address immediately.
  const workspaceUrl = base.includes("localhost")
    ? `${base}/?tenant=${slug}`
    : `https://${slug}.${(process.env.NEXT_PUBLIC_PLATFORM_HOST ?? "thebigclass.com")}`

  const welcome = welcomeEmail({
    recipientName: name || email.split("@")[0],
    workspaceName,
    workspaceUrl,
    dashboardUrl,
  })
  void sendEmail({
    to: [{ email, name }],
    subject: welcome.subject,
    html: welcome.html,
    text: welcome.text,
  }).catch((err) => {
    // eslint-disable-next-line no-console
    console.error("[signup-welcome] welcome send failed", err)
  })

  // Verification email goes out alongside the welcome. Same address, but a
  // different message + a 7-day link the user can click whenever.
  const verifyToken = issueToken({ sub: email, kind: "email-verify", ttlSeconds: 7 * 24 * 60 * 60 })
  const verify = verifyEmailEmail({
    recipientName: name || email.split("@")[0],
    verifyUrl: `${base}/verify-email/${verifyToken}`,
    expiresIn: "7 days",
  })
  void sendEmail({
    to: [{ email, name }],
    subject: verify.subject,
    html: verify.html,
    text: verify.text,
  }).catch((err) => {
    // eslint-disable-next-line no-console
    console.error("[signup-welcome] verify send failed", err)
  })

  return NextResponse.json({ ok: true, verifySentAt: new Date().toISOString() })
}
