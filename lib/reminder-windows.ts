// Reminder-window math + copy generators. Shared by the server-side
// scanner that fans reminders out and by any client that wants to
// render a "next reminder in N min" pill in the UI.
//
// Three windows fire before each scheduled class — at T-3h, T-1h,
// and T-15m. A reminder is "due" when:
//   • now >= scheduledAt - windowMs (we've crossed the threshold)
//   • now <  scheduledAt              (the class hasn't started yet)
//   • the per-session remindersSent[<key>] marker is unset
// The poller scans at 60-second cadence; the threshold check
// guarantees each window fires on the FIRST poll that crosses it
// and the marker prevents every subsequent poll from re-firing.

import type { ReminderWindowKey } from "./lms-store"

export const REMINDER_WINDOWS: Array<{
  key: ReminderWindowKey
  /** Offset before the class in milliseconds. */
  offsetMs: number
  /** Short human label used in subject lines + WhatsApp openers. */
  inLabel: string
  /** Slightly different label used in body copy. */
  longLabel: string
}> = [
  { key: "3h", offsetMs: 3 * 60 * 60 * 1000, inLabel: "in 3 hours", longLabel: "in about 3 hours" },
  { key: "1h", offsetMs: 1 * 60 * 60 * 1000, inLabel: "in 1 hour", longLabel: "in 1 hour" },
  { key: "15m", offsetMs: 15 * 60 * 1000, inLabel: "in 15 minutes", longLabel: "in 15 minutes — gather your stuff" },
]

export interface ReminderEligibility {
  key: ReminderWindowKey
  inLabel: string
  longLabel: string
}

/**
 * Returns every reminder window that is currently due for the given
 * session: threshold crossed, class not yet started, marker unset.
 * Multiple windows could fire on the same scan tick (e.g. if the
 * scanner hadn't run for a while), so this returns an array.
 */
export function dueReminders(
  scheduledAtIso: string,
  remindersSent: Partial<Record<ReminderWindowKey, string>> | undefined,
  now: Date = new Date(),
): ReminderEligibility[] {
  const scheduledMs = Date.parse(scheduledAtIso)
  if (!Number.isFinite(scheduledMs)) return []
  const nowMs = now.getTime()
  if (nowMs >= scheduledMs) return [] // class already started or past
  const out: ReminderEligibility[] = []
  for (const w of REMINDER_WINDOWS) {
    if (remindersSent?.[w.key]) continue
    if (nowMs >= scheduledMs - w.offsetMs) {
      out.push({ key: w.key, inLabel: w.inLabel, longLabel: w.longLabel })
    }
  }
  return out
}

export interface ReminderCopyInput {
  /** "Starting in 3 hours" -> "in 3 hours" half. */
  inLabel: string
  longLabel: string
  classTitle: string
  courseTitle: string
  instructorName: string
  /** Localized "5:30 PM" string. */
  scheduledAtPretty: string
  durationMinutes: number
  /** Absolute URL the recipient should click to join. */
  joinUrl: string
  /** Recipient role drives copy tone. */
  role: "instructor" | "student"
}

export function reminderEmailSubject(args: ReminderCopyInput): string {
  return `Class ${args.inLabel}: ${args.classTitle}`
}

export function reminderEmailHtml(args: ReminderCopyInput): string {
  const opener =
    args.role === "instructor"
      ? `Heads up — you're hosting <strong>${escape(args.classTitle)}</strong> ${escape(args.inLabel)}.`
      : `Quick reminder — <strong>${escape(args.classTitle)}</strong> is starting ${escape(args.inLabel)}.`
  return `<!doctype html><html><body style="margin:0;padding:24px;background:#f5f5f1;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,sans-serif;color:#1f2937;">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" width="560" style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden">
      <tr><td style="padding:24px 28px 8px;">
        <p style="margin:0;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#9ca3af;">Class reminder</p>
        <h1 style="margin:6px 0 0;font-size:22px;color:#0a3024;font-weight:700;">
          Starting ${escape(args.longLabel)}
        </h1>
      </td></tr>
      <tr><td style="padding:8px 28px 16px;">
        <p style="margin:0 0 12px;font-size:15px;">${opener}</p>
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-top:1px solid #eef2f5;border-bottom:1px solid #eef2f5;margin:8px 0;">
          <tr><td style="padding:10px 0;font-size:14px;color:#475569;width:120px;">Class</td><td style="padding:10px 0;font-size:14px;color:#1f2937;font-weight:600;">${escape(args.classTitle)}</td></tr>
          <tr><td style="padding:10px 0;font-size:14px;color:#475569;">Course</td><td style="padding:10px 0;font-size:14px;color:#1f2937;">${escape(args.courseTitle)}</td></tr>
          <tr><td style="padding:10px 0;font-size:14px;color:#475569;">Instructor</td><td style="padding:10px 0;font-size:14px;color:#1f2937;">${escape(args.instructorName)}</td></tr>
          <tr><td style="padding:10px 0;font-size:14px;color:#475569;">When</td><td style="padding:10px 0;font-size:14px;color:#1f2937;">${escape(args.scheduledAtPretty)} · ${args.durationMinutes} min</td></tr>
        </table>
        <p style="margin:18px 0 6px;text-align:left;">
          <a href="${escape(args.joinUrl)}" style="display:inline-block;padding:12px 22px;background:#0a3024;color:#ffffff;border-radius:8px;text-decoration:none;font-size:15px;font-weight:600;">
            Join the class →
          </a>
        </p>
        <p style="margin:8px 0 0;font-size:12px;color:#6b7280;">
          ${args.role === "instructor" ? "Open the room a couple of minutes early so students aren't stranded." : "Grab headphones and a quiet spot. Doors open right at the scheduled time."}
        </p>
      </td></tr>
    </table>
  </body></html>`
}

/**
 * Variable mapping for the Meta-approved `the_big_class_reminder`
 * template. The template body reads:
 *
 *   Header: "Reminder: Session starting in {{1}}"
 *   Body:   "Dear {{1}},
 *            The session is starting in {{3}} .
 *            Please join the class 5 minutes early.
 *            Copy the link below and paste it in Chrome to join the class.
 *            {{2}}
 *            Team The Big Class."
 *
 * Body params therefore map as:
 *   {{1}} → recipient name
 *   {{2}} → join URL
 *   {{3}} → time-until label (e.g. "30 minutes")
 *
 * Header param:
 *   {{1}} → time-until label
 *
 * `recipientName` is required; everything else is derived from the
 * shared ReminderCopyInput. The returned object is the exact shape
 * `sendWhatsApp({ template: ... })` consumes.
 */
export function reminderTemplateParams(
  args: ReminderCopyInput,
  recipientName: string,
): { name: string; language: string; headerParams: string[]; bodyParams: string[] } {
  // Strip the leading "in " from "in 3 hours" so the slot reads
  // "Session starting in 3 hours" rather than "in in 3 hours".
  const timeLabel = args.inLabel.replace(/^in\s+/i, "")
  return {
    name: "the_big_class_reminder",
    language: "en",
    headerParams: [timeLabel],
    bodyParams: [recipientName, args.joinUrl, timeLabel],
  }
}

export function reminderWhatsappText(args: ReminderCopyInput): string {
  const opener =
    args.role === "instructor"
      ? `📢 Heads up — you're hosting *${args.classTitle}* ${args.inLabel}.`
      : `⏰ Reminder — *${args.classTitle}* starts ${args.inLabel}.`
  return [
    opener,
    ``,
    `📚 Course: ${args.courseTitle}`,
    `👤 Instructor: ${args.instructorName}`,
    `🕒 ${args.scheduledAtPretty} · ${args.durationMinutes} min`,
    ``,
    `Join here:`,
    args.joinUrl,
    ``,
    args.role === "instructor"
      ? `Open the room a couple of minutes early so students aren't stranded.`
      : `Grab headphones + a quiet spot.`,
  ].join("\n")
}

function escape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}
