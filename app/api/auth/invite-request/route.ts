// Workspace invitation — POST {
//   email, name, role, workspaceName, inviterName,
//   tenant, phone?, channels?: { email?, whatsapp? }
// }
//
// Issues a 7-day "invite" token (kind="invite") signed by the auth
// secret, wraps it in /p/<tenant>/accept-invite/<token>, and emails
// the recipient via ZeptoMail. When role is "student" and a phone
// number + WhatsApp channel are present, additionally fires the
// WhatsApp transport (Meta cloud / Twilio if configured, else stub
// log).
//
// Returns { ok, emailSent?, whatsappSent? }. We keep the 200 on
// validation failures (enumeration defence) but surface the channel
// flags to the authenticated caller so the dashboard's success toast
// can honestly report what was delivered.

import { NextResponse, type NextRequest } from "next/server"
import { issueToken } from "@/lib/auth-tokens"
import { sendEmail } from "@/lib/zepto"
import { workspaceInviteEmail } from "@/lib/email-templates"
import { sendWhatsApp } from "@/lib/whatsapp"

export const runtime = "nodejs"

const TTL_SECONDS = 7 * 24 * 60 * 60 // 7 days

export async function POST(req: NextRequest) {
  let body: {
    email?: string
    name?: string
    role?: "admin" | "instructor" | "student"
    workspaceName?: string
    inviterName?: string
    tenant?: string
    phone?: string
    channels?: { email?: boolean; whatsapp?: boolean }
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const email = (body.email ?? "").trim().toLowerCase()
  if (!email || !/^[^@]+@[^@]+\.[^@]+$/.test(email)) {
    return NextResponse.json({ ok: true, emailSent: false, whatsappSent: false })
  }
  const role: "admin" | "instructor" | "student" =
    body.role === "admin"
      ? "admin"
      : body.role === "student"
        ? "student"
        : "instructor"
  const workspaceName = (body.workspaceName ?? "").trim() || "The workspace"
  const tenant = (body.tenant ?? "").trim() || undefined
  const phone = (body.phone ?? "").trim() || undefined
  const channels = {
    email: body.channels?.email !== false,
    whatsapp: !!body.channels?.whatsapp && !!phone,
  }

  const token = issueToken({
    sub: email,
    kind: "invite",
    ttlSeconds: TTL_SECONDS,
    tenant,
  })
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "")
  // Tenant-scoped invites land inside the portal so the recipient
  // sees the tenant's brand throughout the onboarding flow.
  const tokenPath = tenant
    ? `/p/${encodeURIComponent(tenant)}/accept-invite/${token}`
    : `/accept-invite/${token}`
  const acceptUrl = `${base}${tokenPath}?w=${encodeURIComponent(workspaceName)}&r=${role}${body.inviterName ? `&i=${encodeURIComponent(body.inviterName)}` : ""}${body.name ? `&n=${encodeURIComponent(body.name)}` : ""}`

  let emailSent = false
  let whatsappSent = false

  if (channels.email) {
    const msg = workspaceInviteEmail({
      recipientName: body.name,
      workspaceName,
      inviterName: body.inviterName,
      role,
      acceptUrl,
      expiresIn: "7 days",
    })
    try {
      const result = await sendEmail({
        to: email,
        subject: msg.subject,
        html: msg.html,
        text: msg.text,
      })
      // The Zepto helper returns { ok } on real sends and { stub: true }
      // when no provider is configured — count both as "channel reached"
      // for the caller's toast (the dev sees the stub log either way).
      emailSent = "stub" in result ? !!result.stub : result.ok
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("[invite-request] email send failed", err)
    }
  }

  if (channels.whatsapp && phone) {
    const text = renderInviteWhatsApp({
      studentName: body.name?.trim() || email.split("@")[0],
      teacherName: body.inviterName?.trim() || workspaceName,
      tenantName: workspaceName,
      acceptUrl,
      role,
    })
    try {
      const result = await sendWhatsApp({ to: phone, text, kind: "invite" })
      whatsappSent = result.ok
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("[invite-request] whatsapp send failed", err)
    }
  }

  return NextResponse.json({ ok: true, emailSent, whatsappSent })
}

function renderInviteWhatsApp(args: {
  studentName: string
  teacherName: string
  tenantName: string
  acceptUrl: string
  role: "admin" | "instructor" | "student"
}): string {
  const isStudent = args.role === "student"
  const opener = isStudent
    ? `${args.teacherName} invited you to *${args.tenantName}* on The Big Class.`
    : `${args.teacherName} invited you to join *${args.tenantName}* on The Big Class.`
  const cta = isStudent
    ? "Tap to set up your account in 30 sec:"
    : "Tap to accept and set up your account:"
  return [
    `👋 Hi ${args.studentName}!`,
    ``,
    opener,
    ``,
    cta,
    args.acceptUrl,
    ``,
    `Thanks,`,
    `Team ${args.tenantName}`,
  ].join("\n")
}
