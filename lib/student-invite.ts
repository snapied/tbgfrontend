"use client"

// Student invite fan-out. Single POST to /api/auth/invite-request
// (the same route faculty invites use): it issues an HMAC-signed
// "invite" token, sends the welcome email via ZeptoMail, and — when
// a phone + WhatsApp channel are provided — fires the message
// through lib/whatsapp (Meta cloud / Twilio when configured, else
// server-side stub log).
//
// Why server-side: the token has to be signed with AUTH_TOKEN_SECRET
// (which the browser must never see), so the random-id approach we
// used previously created links that the accept page rejected as
// malformed. This file now just collects context and delegates.

export interface InviteContext {
  studentName: string
  studentEmail: string
  studentPhone?: string
  tenantName: string
  tenantSlug: string
  teacherName: string
  teacherEmail?: string
  // When true, copy assumes the student already has a Big Class
  // account elsewhere. The server route doesn't currently branch on
  // this — kept for forward-compat with a future "you already have
  // a password" template.
  existingIdentity?: boolean
  // Channels to attempt. Email is on by default; WhatsApp only fires
  // when a phone number is present AND the channel is enabled.
  channels?: { email?: boolean; whatsapp?: boolean }
}

export interface InviteResult {
  emailSent: boolean
  whatsappSent: boolean
}

export async function sendStudentInvite(ctx: InviteContext): Promise<InviteResult> {
  const channels = {
    email: ctx.channels?.email !== false,
    whatsapp: !!ctx.channels?.whatsapp && !!ctx.studentPhone,
  }
  try {
    const res = await fetch("/api/auth/invite-request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: ctx.studentEmail,
        name: ctx.studentName,
        role: "student",
        workspaceName: ctx.tenantName,
        inviterName: ctx.teacherName,
        tenant: ctx.tenantSlug,
        phone: ctx.studentPhone,
        channels,
      }),
    })
    if (!res.ok) return { emailSent: false, whatsappSent: false }
    const json = (await res.json().catch(() => ({}))) as {
      emailSent?: boolean
      whatsappSent?: boolean
    }
    return {
      emailSent: !!json.emailSent,
      whatsappSent: !!json.whatsappSent,
    }
  } catch {
    return { emailSent: false, whatsappSent: false }
  }
}
