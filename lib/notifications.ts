// Notification dispatcher.
//
// Three channels: in-app (stored in LMS store), email (POST to
// /api/email/send → ZeptoMail), and WhatsApp (POST to /api/whatsapp/send
// → Meta Cloud API or Twilio). Both external channels are fire-and-forget:
// failures log but never block the UI.

import { generateId, type Notification, type NotificationChannel, type User } from "./lms-store"

export interface DispatchPayload {
  type: string             // e.g. "live-session.scheduled"
  title: string
  body: string
  url?: string             // deep link (relative) the recipient should land on
  meta?: Record<string, unknown>
}

export interface DispatchOptions {
  channels?: NotificationChannel[]   // default: ["in-app", "email", "whatsapp"]
}

const DEFAULT_CHANNELS: NotificationChannel[] = ["in-app", "email", "whatsapp"]

// Per-user channel preference guard. The `notificationChannels` map on
// User is optional and partial — anything not explicitly set falls
// back to "enabled" so existing users keep getting every channel.
function isChannelEnabled(user: User, channel: NotificationChannel): boolean {
  const prefs = user.notificationChannels
  if (!prefs) return true
  if (channel === "in-app") return prefs.inApp !== false
  if (channel === "email") return prefs.email !== false
  if (channel === "whatsapp") return prefs.whatsapp !== false
  return true
}

/**
 * Build Notification entries for every recipient × channel combination and
 * fire the underlying transport for the non-in-app channels. Returns the
 * Notification rows that should be persisted in the store.
 */
export function buildNotifications(
  recipients: User[],
  payload: DispatchPayload,
  options: DispatchOptions = {},
): Notification[] {
  const channels = options.channels ?? DEFAULT_CHANNELS
  const now = new Date().toISOString()
  const out: Notification[] = []

  for (const user of recipients) {
    for (const channel of channels) {
      // Skip channels we can't actually reach for this user.
      if (channel === "email" && !user.email) continue
      if (channel === "whatsapp" && !user.phone) continue
      // Skip channels the user has explicitly opted out of. Missing
      // prefs (undefined / partial map) mean "all on" — preserves the
      // historical behaviour for users who haven't visited /settings.
      if (!isChannelEnabled(user, channel)) continue

      const id = generateId("notif")
      const baseEntry: Notification = {
        id,
        userId: user.id,
        channel,
        type: payload.type,
        title: payload.title,
        body: payload.body,
        url: payload.url,
        createdAt: now,
        status: "queued",
        meta: payload.meta,
      }

      if (channel === "in-app") {
        out.push(baseEntry)
        continue
      }

      // Fire-and-forget transport. Failures are caught and logged — they
      // never block the UI or prevent in-app notifications from rendering.
      try {
        if (channel === "email" && user.email) {
          sendEmail({ to: user.email, name: user.name, payload })
        } else if (channel === "whatsapp" && user.phone) {
          sendWhatsApp({ to: user.phone, name: user.name, payload })
        }
        out.push({ ...baseEntry, status: "sent", sentAt: now })
      } catch (err) {
        out.push({
          ...baseEntry,
          status: "failed",
          meta: { ...payload.meta, error: (err as Error).message },
        })
      }
    }
  }
  return out
}

// ---------------- Transports ----------------

interface TransportArgs {
  to: string
  name: string
  payload: DispatchPayload
}

function resolveAbsoluteUrl(relativeUrl: string | undefined): string | undefined {
  if (!relativeUrl) return undefined
  if (relativeUrl.startsWith("http")) return relativeUrl
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "")
  return `${base || (typeof window !== "undefined" ? window.location.origin : "")}${relativeUrl}`
}

function sendEmail({ to, name, payload }: TransportArgs) {
  if (typeof window === "undefined") {
    // eslint-disable-next-line no-console
    console.info("[notifications:email server-skip]", { to, name, subject: payload.title })
    return
  }
  const absoluteUrl = resolveAbsoluteUrl(payload.url)
  const html = buildNotificationHtml({ title: payload.title, body: payload.body, url: absoluteUrl, ctaLabel: ctaFor(payload.type) })
  fetch("/api/email/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      to: [{ email: to, name }],
      subject: payload.title,
      html,
      text: `${payload.title}\n\n${payload.body}${absoluteUrl ? `\n\n${absoluteUrl}` : ""}`,
    }),
  }).catch((err) => {
    // eslint-disable-next-line no-console
    console.warn("[notifications:email] POST /api/email/send failed", err)
  })
}

function sendWhatsApp({ to, name, payload }: TransportArgs) {
  if (typeof window === "undefined") {
    // eslint-disable-next-line no-console
    console.info("[notifications:whatsapp server-skip]", { to })
    return
  }
  // "to" is user.phone — skip silently if it doesn't look like a phone number
  if (!to || !/\d{10,}/.test(to)) return

  const absoluteUrl = resolveAbsoluteUrl(payload.url)
  fetch("/api/whatsapp/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      to,
      text: `${payload.title}\n\n${payload.body}${absoluteUrl ? `\n\n${absoluteUrl}` : ""}`,
      kind: payload.type,
    }),
  }).catch((err) => {
    // eslint-disable-next-line no-console
    console.warn("[notifications:whatsapp] POST /api/whatsapp/send failed", err)
  })
}

// ---------------- Email rendering helpers ----------------
// Keep these inline (vs. importing email-templates) so the notifications
// dispatcher stays usable from the client without bundling server-only code.

function ctaFor(type: string): string {
  if (type.startsWith("live-session")) return "Join class"
  if (type.endsWith(".graded"))        return "View grade"
  if (type.endsWith(".published"))     return "Open it"
  if (type.endsWith(".submitted"))     return "Review submission"
  return "Open"
}
function buildNotificationHtml(args: {
  title: string
  body: string
  url?: string
  ctaLabel: string
}): string {
  const safeTitle = esc(args.title)
  const safeBody = esc(args.body).replace(/\n/g, "<br>")
  const cta = args.url
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:18px 0 4px;">
         <tr><td bgcolor="#0a3024" style="border-radius:8px;">
           <a href="${esc(args.url)}" style="display:inline-block;padding:11px 20px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,Helvetica,Arial,sans-serif;">${esc(args.ctaLabel)} &nbsp;→</a>
         </td></tr>
       </table>`
    : ""
  return `<!doctype html><html><body style="margin:0;padding:0;background:#f5f4f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,Helvetica,Arial,sans-serif;color:#1f2937;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f4f0;padding:28px 16px;"><tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 1px 2px rgba(10,48,36,0.06);">
        <tr><td style="padding:18px 26px;background:#0a3024;color:#fff;font-size:16px;font-weight:800;">thebigclass<span style="color:#d4af37;">.</span></td></tr>
        <tr><td style="padding:26px;font-size:15px;line-height:1.55;">
          <p style="margin:0 0 10px;font-size:18px;font-weight:700;color:#0a3024;">${safeTitle}</p>
          <p style="margin:0;">${safeBody}</p>
          ${cta}
        </td></tr>
        <tr><td style="padding:14px 26px;border-top:1px solid #eee5d4;background:#fafaf7;font-size:11px;color:#6b7280;">Sent by The Big Class.</td></tr>
      </table>
    </td></tr></table>
  </body></html>`
}
function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;")
}

// ---------------- High-level helpers ----------------

export function liveSessionAnnouncement(args: {
  sessionTitle: string
  courseTitle: string
  scheduledAt: string
  durationMinutes: number
  provider: string
  meetingUrl: string
  sessionId: string
}): DispatchPayload {
  const when = new Date(args.scheduledAt).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
  const providerLabel =
    args.provider === "google-meet" ? "Google Meet"
    : args.provider === "zoom" ? "Zoom"
    : args.provider === "ms-teams" ? "Microsoft Teams"
    : "Live session"
  return {
    type: "live-session.scheduled",
    title: `${providerLabel} class: ${args.sessionTitle}`,
    body: `${args.courseTitle} · ${when} · ${args.durationMinutes} min. Join: ${args.meetingUrl}`,
    url: `/learn-session/${args.sessionId}`,
    meta: { sessionId: args.sessionId, meetingUrl: args.meetingUrl, provider: args.provider },
  }
}

export function assignmentPublishedAnnouncement(args: {
  assignmentTitle: string
  courseTitle: string
  kind: string
  dueAt?: string
  assignmentId: string
}): DispatchPayload {
  const due = args.dueAt
    ? `Due ${new Date(args.dueAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}.`
    : "No due date."
  const kindLabel = args.kind === "project" ? "project" : args.kind === "test" ? "test" : "assignment"
  return {
    type: `${args.kind}.published`,
    title: `New ${kindLabel}: ${args.assignmentTitle}`,
    body: `${args.courseTitle} · ${due}`,
    url: `/learn-assignment/${args.assignmentId}`,
    meta: { assignmentId: args.assignmentId, kind: args.kind },
  }
}

/**
 * Fired to the instructor when a student submits a quiz attempt.
 * Used by submitQuizAttempt in lms-store. The url deep-links to the
 * teacher's review screen for this quiz so they can grade or release
 * results in one click.
 */
export function quizSubmittedNotification(args: {
  studentName: string
  quizTitle: string
  quizId: string
  score: number
  passed: boolean
  needsReview: boolean
}): DispatchPayload {
  const verdict = args.needsReview
    ? "Needs your review."
    : args.passed
      ? `Passed with ${args.score}%.`
      : `Did not pass (${args.score}%).`
  return {
    type: "quiz.submitted",
    title: `${args.studentName} submitted "${args.quizTitle}"`,
    body: verdict,
    // Deep-link to the quiz detail page (which already lists attempts
    // + review actions). Avoids a separate "submissions queue" route.
    url: `/dashboard/quizzes/${args.quizId}`,
    meta: {
      quizId: args.quizId,
      score: args.score,
      passed: args.passed,
      needsReview: args.needsReview,
    },
  }
}

/**
 * Fired to the instructor when a student submits an assignment.
 * Used by submitAssignment in lms-store. Deep-links to the assignment
 * detail page where the teacher reviews + grades submissions.
 */
export function assignmentSubmittedNotification(args: {
  studentName: string
  assignmentTitle: string
  assignmentId: string
  hasNotes?: boolean
}): DispatchPayload {
  return {
    type: "assignment.submitted",
    title: `${args.studentName} submitted "${args.assignmentTitle}"`,
    body: args.hasNotes
      ? "Submission has student notes attached — open to review."
      : "Open to review and grade.",
    url: `/dashboard/assignments/${args.assignmentId}`,
    meta: {
      assignmentId: args.assignmentId,
    },
  }
}

export function assignmentGradedAnnouncement(args: {
  assignmentTitle: string
  score: number
  maxScore: number
  assignmentId: string
}): DispatchPayload {
  return {
    type: "assignment.graded",
    title: `Graded: ${args.assignmentTitle}`,
    body: `You scored ${args.score}/${args.maxScore}.`,
    url: `/learn-assignment/${args.assignmentId}`,
    meta: { assignmentId: args.assignmentId, score: args.score, maxScore: args.maxScore },
  }
}

/**
 * Fired to the whiteboard owner (instructor) when a student asks for
 * edit access on a board they can currently only view. URL deep-links
 * to the teacher-side board page where the pending request panel
 * surfaces the Approve / Deny buttons.
 */
export function whiteboardAccessRequestedNotification(args: {
  studentName: string
  boardTitle: string
  boardId: string
  requestId: string
}): DispatchPayload {
  return {
    type: "whiteboard.access.requested",
    title: `${args.studentName} wants to edit "${args.boardTitle}"`,
    body: "Open the board to approve or deny their request.",
    url: `/dashboard/whiteboards/${args.boardId}`,
    meta: { boardId: args.boardId, requestId: args.requestId },
  }
}

/**
 * Fired back to the student after the instructor decides on their
 * request. Approved → deep-link to the now-editable student board
 * view; denied → still drop them on the read-only viewer so the bell
 * click isn't a dead end.
 */
export function whiteboardAccessDecidedNotification(args: {
  boardTitle: string
  boardId: string
  tenantSlug: string
  approved: boolean
}): DispatchPayload {
  return {
    type: args.approved
      ? "whiteboard.access.approved"
      : "whiteboard.access.denied",
    title: args.approved
      ? `You can now edit "${args.boardTitle}"`
      : `Edit access denied for "${args.boardTitle}"`,
    body: args.approved
      ? "Open the board — your changes will save in real time."
      : "The instructor kept the board read-only. You can still view it.",
    url: `/p/${args.tenantSlug}/my/whiteboards/${args.boardId}`,
    meta: { boardId: args.boardId, approved: args.approved },
  }
}

/**
 * Fired to everyone in the class — students + invited co-
 * instructors — the moment the host launches an in-class poll.
 * Used so the bell pings + the inbox lights up for participants
 * who haven't actively opened the poll panel yet.
 *
 * URL deep-links into the public live page (or the host page for
 * instructors) so a tap on the notification drops the recipient
 * straight into the call where the poll is active.
 */
export function livePollLaunchedNotification(args: {
  sessionId: string
  sessionTitle: string
  question: string
  optionCount: number
  /** "public" → /p/<tenant>/live/<roomCode>
   *  "host"   → /dashboard/classes/<sessionId>/host
   *  Choose per-recipient when fanning out. */
  joinUrl: string
}): DispatchPayload {
  return {
    type: "live-poll.launched",
    title: `Poll: ${args.question}`,
    body: `${args.optionCount}-option poll just opened in "${args.sessionTitle}". Tap to vote before it closes.`,
    url: args.joinUrl,
    meta: {
      sessionId: args.sessionId,
      kind: "poll",
      question: args.question,
    },
  }
}

/**
 * Fired when the host closes a poll. Carries the winning option
 * + counts so the notification body reads as a stand-alone
 * summary (recipients who never voted still get the result).
 *
 * The body is intentionally short — full breakdown lives in the
 * inbox row when the inbox aggregator routes this notification
 * type.
 */
export function livePollClosedNotification(args: {
  sessionId: string
  sessionTitle: string
  question: string
  winner: { label: string; count: number; pct: number } | null
  totalVotes: number
  /** Deep-link to the recording detail page once available, else
   *  back to the class detail page where the recap surfaces the
   *  closed poll. */
  resultsUrl: string
}): DispatchPayload {
  const winnerLine = args.winner
    ? `Winner: "${args.winner.label}" with ${args.winner.pct}% (${args.winner.count} of ${args.totalVotes})`
    : `No votes were cast.`
  return {
    type: "live-poll.closed",
    title: `Poll closed: ${args.question}`,
    body: `${args.sessionTitle} · ${winnerLine}`,
    url: args.resultsUrl,
    meta: {
      sessionId: args.sessionId,
      kind: "poll-result",
      question: args.question,
      winnerLabel: args.winner?.label,
      totalVotes: args.totalVotes,
    },
  }
}

// ────────────────────────────────────────────────────────────────
// Docs (knowledge layer) — 3 payload builders.
// All three deep-link to /dashboard/docs/<id> (or the public /k/
// route when applicable) so the recipient lands on the right view.
// ────────────────────────────────────────────────────────────────

export function docMentionNotification(args: {
  docId: string
  docTitle: string
  by: string
  excerpt: string
}): DispatchPayload {
  return {
    type: "doc.mention",
    title: `${args.by} tagged you in "${args.docTitle}"`,
    body: args.excerpt,
    url: `/dashboard/docs/${args.docId}`,
    meta: { docId: args.docId, kind: "doc-mention" },
  }
}

export function docCommentNotification(args: {
  docId: string
  docTitle: string
  by: string
  excerpt: string
}): DispatchPayload {
  return {
    type: "doc.comment",
    title: `New comment on "${args.docTitle}"`,
    body: `${args.by}: ${args.excerpt}`,
    url: `/dashboard/docs/${args.docId}`,
    meta: { docId: args.docId, kind: "doc-comment" },
  }
}

export function docPublishedNotification(args: {
  docId: string
  docTitle: string
  by: string
  publicSlug?: string
}): DispatchPayload {
  return {
    type: "doc.published",
    title: `"${args.docTitle}" was just published`,
    body: `${args.by} published a new doc${args.publicSlug ? " to your public knowledge hub" : ""}.`,
    url: args.publicSlug ? `/k/${args.publicSlug}` : `/dashboard/docs/${args.docId}`,
    meta: { docId: args.docId, kind: "doc-published", publicSlug: args.publicSlug },
  }
}

export function detectProvider(url: string): "google-meet" | "zoom" | "ms-teams" | "other" {
  const u = url.toLowerCase().trim()
  if (u.includes("meet.google.com")) return "google-meet"
  if (u.includes("zoom.us") || u.includes("zoom.com")) return "zoom"
  if (u.includes("teams.microsoft.com") || u.includes("teams.live.com")) return "ms-teams"
  return "other"
}
