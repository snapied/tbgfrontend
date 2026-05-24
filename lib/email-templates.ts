// HTML email templates.
//
// Plain string templates rather than React Email so we don't pull in another
// dependency for a few transactional emails. All inline styles — every major
// inbox (Gmail / Outlook / Apple Mail) strips <style> blocks aggressively.
//
// Each builder returns { subject, html, text } so the caller can also send
// a plain-text fallback (improves deliverability + accessibility).

const PRIMARY = "#0a3024"
const ACCENT = "#d4af37"
const TEXT = "#1f2937"
const MUTED = "#6b7280"

interface EmailMsg {
  subject: string
  html: string
  text: string
}

// ---------------- Layout shell ----------------
function layout({
  preheader,
  body,
  cta,
}: {
  preheader: string
  body: string
  cta?: { label: string; url: string }
}): string {
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
  </head>
  <body style="margin:0;padding:0;background:#f5f4f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,Helvetica,Arial,sans-serif;color:${TEXT};">
    <!-- Hidden preheader for inbox previews -->
    <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${escape(preheader)}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f4f0;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:14px;box-shadow:0 1px 2px rgba(10,48,36,0.06);overflow:hidden;">
            <!-- Top bar -->
            <tr>
              <td style="padding:20px 28px;background:${PRIMARY};color:#fff;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="font-size:18px;font-weight:800;letter-spacing:-0.01em;">
                      thebigclass<span style="color:${ACCENT};">.</span>
                    </td>
                    <td align="right" style="font-size:11px;color:#cbd5e1;letter-spacing:0.08em;text-transform:uppercase;">
                      Notification
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Body -->
            <tr>
              <td style="padding:32px 28px;font-size:15px;line-height:1.55;">
                ${body}
                ${cta ? `
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0 8px;">
                  <tr>
                    <td bgcolor="${PRIMARY}" style="border-radius:8px;">
                      <a href="${escape(cta.url)}" style="display:inline-block;padding:12px 22px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">
                        ${escape(cta.label)} &nbsp;
                      </a>
                    </td>
                  </tr>
                </table>
                <p style="font-size:12px;color:${MUTED};margin:8px 0 0;">
                  Or paste this link: <a href="${escape(cta.url)}" style="color:${PRIMARY};">${escape(cta.url)}</a>
                </p>
                ` : ""}
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="padding:18px 28px 26px;border-top:1px solid #eee5d4;background:#fafaf7;font-size:12px;color:${MUTED};">
                Sent by The Big Class · <a href="${escape(appUrl())}" style="color:${MUTED};">${escape(displayUrl(appUrl()))}</a><br>
                If you didn't expect this email, you can safely ignore it.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`
}

// ---------------- Builders ----------------

export function welcomeEmail(args: {
  recipientName: string
  workspaceName: string
  workspaceUrl: string
  dashboardUrl: string
}): EmailMsg {
  const firstName = args.recipientName.split(" ")[0] || "there"
  return {
    subject: `Welcome to The Big Class, ${firstName} — your workspace is live`,
    text:
      `Hi ${firstName},\n\n` +
      `Your workspace "${args.workspaceName}" is ready at ${args.workspaceUrl}.\n\n` +
      `Sign in: ${args.dashboardUrl}\n\n` +
      `If you have a logo, brand colours, or a website we can pull from, the onboarding wizard will offer to do that on your first visit.\n\n` +
      `— Priya, The Big Class`,
    html: layout({
      preheader: `Your workspace "${args.workspaceName}" is ready.`,
      body: `
        <p style="margin:0 0 12px;font-size:22px;font-weight:700;color:${PRIMARY};">
          Welcome, ${escape(firstName)} 👋
        </p>
        <p style="margin:0 0 16px;">
          Your workspace <strong>${escape(args.workspaceName)}</strong> is live at:
        </p>
        <p style="margin:0 0 16px;">
          <a href="${escape(args.workspaceUrl)}" style="color:${PRIMARY};font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-weight:600;">${escape(displayUrl(args.workspaceUrl))}</a>
        </p>
        <p style="margin:0 0 16px;color:${MUTED};">
          Hit the button below to land in your dashboard. The onboarding wizard takes 3 minutes — you can also skip it and come back later.
        </p>
      `,
      cta: { label: "Open your dashboard", url: args.dashboardUrl },
    }),
  }
}

export function verifyEmailEmail(args: {
  recipientName?: string
  verifyUrl: string
  expiresIn?: string
}): EmailMsg {
  const name = args.recipientName?.split(" ")[0] || "there"
  return {
    subject: "Verify your email — The Big Class",
    text:
      `Hi ${name},\n\n` +
      `Confirm your email by tapping this link — it works for the next ${args.expiresIn ?? "7 days"}:\n` +
      `${args.verifyUrl}\n\n` +
      `You can keep using your workspace meanwhile; we just want to make sure we can reach you.\n\n` +
      `— The Big Class`,
    html: layout({
      preheader: "Confirm your email so receipts and alerts reach you.",
      body: `
        <p style="margin:0 0 12px;font-size:20px;font-weight:700;color:${PRIMARY};">
          Confirm your email
        </p>
        <p style="margin:0 0 14px;">Hi ${escape(name)},</p>
        <p style="margin:0 0 16px;">
          Tap below to verify <strong>${escape(args.recipientName ? "your email" : "this email address")}</strong>.
          The link works for the next <strong>${escape(args.expiresIn ?? "7 days")}</strong>.
        </p>
        <p style="margin:0 0 16px;color:${MUTED};font-size:13px;">
          You can keep using your workspace meanwhile — verifying just makes sure receipts, password resets, and class notifications actually reach you.
        </p>
      `,
      cta: { label: "Verify my email", url: args.verifyUrl },
    }),
  }
}

/**
 * Workspace invitation. Used by /api/auth/invite-request when an
 * admin invites a faculty member. Differs from passwordResetEmail
 * in tone (welcoming, not security-tinted), copy (mentions the
 * workspace name and the inviter), and CTA label ("Accept invite"
 * → /accept-invite/[token] which lets the recipient pick a
 * password and lands them on the dashboard).
 */
export function workspaceInviteEmail(args: {
  recipientName?: string
  workspaceName: string
  inviterName?: string
  role: "admin" | "instructor" | "student"
  acceptUrl: string
  expiresIn?: string
}): EmailMsg {
  const name = args.recipientName?.split(" ")[0] || "there"
  const inviter = args.inviterName?.split(" ")[0] || "the team"
  const isStudent = args.role === "student"
  const roleLabel =
    args.role === "admin"
      ? "as an admin"
      : args.role === "student"
        ? "as a student"
        : "as an instructor"
  // Students get a friendlier "Welcome to {workspace}" framing —
  // their first impression is a learner experience, not a back-office
  // tool. Staff invites keep the original workspace-admin tone.
  const heroTitle = isStudent
    ? `Welcome to ${escape(args.workspaceName)}`
    : `You're invited to ${escape(args.workspaceName)}`
  const bodyCopy = isStudent
    ? `<strong>${escape(args.inviterName ?? inviter)}</strong> invited you to join
       <strong>${escape(args.workspaceName)}</strong> on The Big Class — your home for live
       classes, assignments, recordings, and doubts inside ${escape(args.workspaceName)}.`
    : `<strong>${escape(args.inviterName ?? inviter)}</strong> invited you to join
       <strong>${escape(args.workspaceName)}</strong> ${escape(roleLabel)} on The Big Class —
       our teaching workspace for courses, live classes, and certificates.`
  const ctaCopy = isStudent
    ? `Tap the button to set a password (30 seconds) and start learning.`
    : `Tap the button below to accept the invite, set a password, and land in the dashboard.`
  const ctaLabel = isStudent
    ? `Join ${args.workspaceName} →`
    : "Accept invite & set up account"
  return {
    subject: isStudent
      ? `${args.inviterName ?? args.workspaceName} invited you to ${args.workspaceName}`
      : `${args.inviterName ?? args.workspaceName} invited you to ${args.workspaceName}`,
    text:
      `Hi ${name},\n\n` +
      `${args.inviterName ?? "Someone"} invited you to join ${args.workspaceName} ${roleLabel} on The Big Class.\n\n` +
      `Accept the invite and set up your account:\n${args.acceptUrl}\n\n` +
      `The link works for the next ${args.expiresIn ?? "7 days"}.\n\n` +
      `Thanks,\nTeam ${args.workspaceName}`,
    html: layout({
      preheader: `${args.inviterName ?? args.workspaceName} invited you to ${args.workspaceName} on The Big Class.`,
      body: `
        <p style="margin:0 0 12px;font-size:22px;font-weight:700;color:${PRIMARY};">
          ${heroTitle}
        </p>
        <p style="margin:0 0 14px;">Hi ${escape(name)},</p>
        <p style="margin:0 0 16px;">${bodyCopy}</p>
        <p style="margin:0 0 16px;">${ctaCopy}</p>
        <p style="margin:0 0 16px;color:${MUTED};font-size:13px;">
          The link works for the next <strong>${escape(args.expiresIn ?? "7 days")}</strong>. If you weren't expecting this invite, you can ignore the email.
        </p>
        <p style="margin:24px 0 0;font-size:14px;">
          Thanks,<br>
          <strong>Team ${escape(args.workspaceName)}</strong>
        </p>
      `,
      cta: { label: ctaLabel, url: args.acceptUrl },
    }),
  }
}

export function passwordResetEmail(args: {
  recipientName?: string
  resetUrl: string
  // Human-friendly expiry, e.g. "1 hour" — purely decorative.
  expiresIn?: string
}): EmailMsg {
  const name = args.recipientName?.split(" ")[0] || "there"
  return {
    subject: `Reset your The Big Class password`,
    text:
      `Hi ${name},\n\n` +
      `Tap this link to set a new password — it works for the next ${args.expiresIn ?? "60 minutes"}:\n` +
      `${args.resetUrl}\n\n` +
      `If you didn't request this, you can safely ignore the email.\n\n` +
      `— The Big Class`,
    html: layout({
      preheader: "Set a new password for your The Big Class account.",
      body: `
        <p style="margin:0 0 12px;font-size:20px;font-weight:700;color:${PRIMARY};">
          Reset your password
        </p>
        <p style="margin:0 0 14px;">Hi ${escape(name)},</p>
        <p style="margin:0 0 16px;">
          Tap the button below to choose a new password. The link works for the next
          <strong>${escape(args.expiresIn ?? "60 minutes")}</strong>.
        </p>
        <p style="margin:0 0 16px;color:${MUTED};font-size:13px;">
          Didn't ask to reset your password? You can ignore this email — your account stays as is.
        </p>
      `,
      cta: { label: "Reset password", url: args.resetUrl },
    }),
  }
}

export function genericEmail(args: {
  subject: string
  bodyHtml: string
  preheader?: string
  cta?: { label: string; url: string }
}): EmailMsg {
  const text = stripHtml(args.bodyHtml) + (args.cta ? `\n\n${args.cta.label}: ${args.cta.url}` : "")
  return {
    subject: args.subject,
    text,
    html: layout({
      preheader: args.preheader ?? args.subject,
      body: args.bodyHtml,
      cta: args.cta,
    }),
  }
}

// ---------------- Helpers ----------------
function escape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}
function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim()
}
function appUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "")
}
function displayUrl(u: string): string {
  return u.replace(/^https?:\/\//, "").replace(/\/$/, "")
}
