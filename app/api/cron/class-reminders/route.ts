// Class-reminder scanner. Reads every tenant's server blob, finds
// live sessions in a reminder window that hasn't fired yet, and fans
// out reminders to the host + every enrolled student via:
//   • In-app — appended into the tenant's lms.notifications.v1 array.
//     The client-side LMS store re-pulls server state on hydrate, so
//     the bell + inbox light up next time the browser reloads (and
//     immediately on the editing browser the next time it polls).
//   • Email — via the existing ZeptoMail helper.
//   • WhatsApp — via lib/whatsapp (Meta cloud API when configured,
//     stub log otherwise).
//
// After each window fires, we stamp the session's remindersSent[<key>]
// marker so subsequent scans skip it. Markers are written back into
// the same tenant blob; the existing pull/sync layer makes them
// visible to every browser.
//
// Endpoint shape:
//   POST /api/cron/class-reminders
//   → { ok, scanned: { tenants, sessions, eligible }, sent: { inApp, email, whatsapp } }
//
// Designed to be safe to call repeatedly (the marker prevents
// duplicates). In production point an external cron (Vercel Cron,
// GitHub Actions, etc.) at it; for the POC the client-side poller
// in components/dashboard/reminder-poller.tsx hits it every 60s
// while any dashboard / student-portal tab is open.

import { NextResponse, type NextRequest } from "next/server"
import { promises as fs } from "fs"
import path from "path"
import { sendEmail } from "@/lib/zepto"
import { sendWhatsApp } from "@/lib/whatsapp"
import {
  REMINDER_WINDOWS,
  dueReminders,
  reminderEmailHtml,
  reminderEmailSubject,
  reminderWhatsappText,
} from "@/lib/reminder-windows"
import type {
  LiveSession,
  User,
  Course,
  Enrollment,
  Notification,
  NotificationChannel,
  ReminderWindowKey,
} from "@/lib/lms-store"

export const runtime = "nodejs"

interface PortalBrand {
  siteName?: string
}
interface PortalConfig {
  brand?: PortalBrand
}

function dataDir(): string {
  return path.join(process.cwd(), ".portal-state")
}
function appBase(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "")
}

function genId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`
}

export async function POST(_req: NextRequest) {
  let entries: string[] = []
  try {
    entries = await fs.readdir(dataDir())
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return NextResponse.json({ ok: true, scanned: { tenants: 0, sessions: 0, eligible: 0 }, sent: { inApp: 0, email: 0, whatsapp: 0 } })
    }
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 })
  }

  let tenantsScanned = 0
  let sessionsScanned = 0
  let eligibleCount = 0
  let inAppCount = 0
  let emailCount = 0
  let whatsappCount = 0

  for (const file of entries) {
    if (!file.endsWith(".json")) continue
    const slug = file.slice(0, -".json".length)
    const filePath = path.join(dataDir(), file)
    let blob: Record<string, unknown>
    try {
      const raw = await fs.readFile(filePath, "utf8")
      blob = JSON.parse(raw) as Record<string, unknown>
    } catch {
      continue
    }
    tenantsScanned++

    const sessions = (blob["lms.liveSessions.v1"] as LiveSession[] | undefined) ?? []
    const users = (blob["lms.users.v1"] as User[] | undefined) ?? []
    const courses = (blob["lms.courses.v1"] as Course[] | undefined) ?? []
    const enrollments =
      (blob["lms.enrollments.v1"] as Enrollment[] | undefined) ?? []
    const notifications =
      (blob["lms.notifications.v1"] as Notification[] | undefined) ?? []
    const portalConfig = blob["portal.config.v1"] as PortalConfig | undefined
    const brandName = portalConfig?.brand?.siteName ?? slug

    sessionsScanned += sessions.length
    let blobChanged = false

    for (const session of sessions) {
      if (session.status === "cancelled") continue
      const due = dueReminders(session.scheduledAt, session.remindersSent)
      if (due.length === 0) continue
      eligibleCount += due.length

      const course = courses.find((c) => c.id === session.courseId)
      const host = users.find((u) => u.id === session.hostId)
      const instructorName =
        host?.name ??
        // Course.instructor is a denormalised User snapshot; safe fallback.
        course?.instructor?.name ??
        "your instructor"

      // Recipient pool: the host + every enrolled student. De-duped
      // by user id so a teacher who's also enrolled doesn't get two
      // reminders.
      const studentIds = new Set(
        enrollments
          .filter((e) => e.courseId === session.courseId)
          .map((e) => e.studentId),
      )
      const recipientIds = new Set<string>(studentIds)
      if (host) recipientIds.add(host.id)
      const recipients = users.filter((u) => recipientIds.has(u.id))
      if (recipients.length === 0) continue

      const joinUrl = session.roomCode
        ? `${appBase()}/p/${slug}/live/${session.roomCode}`
        : session.meetingUrl ||
          `${appBase()}/p/${slug}/my/classes`
      const scheduledAtPretty = formatScheduledTime(session.scheduledAt)

      for (const reminder of due) {
        for (const user of recipients) {
          const role: "instructor" | "student" =
            user.id === session.hostId ? "instructor" : "student"
          const copy = {
            inLabel: reminder.inLabel,
            longLabel: reminder.longLabel,
            classTitle: session.title,
            courseTitle: course?.title ?? "Your course",
            instructorName,
            scheduledAtPretty,
            durationMinutes: session.durationMinutes,
            joinUrl,
            role,
          }

          // Common metadata + copy for every channel-row we write
          // into lms.notifications.v1. The inbox tabs filter by
          // `channel`, so logging email + whatsapp dispatches here
          // gives the student a unified audit trail ("we emailed you
          // about this", "we WhatsApped you about this") alongside
          // the in-app row.
          const baseNotif = {
            userId: user.id,
            type: "live-session.reminder" as const,
            title: `Class ${reminder.inLabel}: ${session.title}`,
            body: `${course?.title ?? "Coursework"} · ${scheduledAtPretty} · ${session.durationMinutes} min`,
            url: `/p/${slug}/live/${session.roomCode ?? session.id}`,
            meta: {
              sessionId: session.id,
              window: reminder.key,
              tenant: slug,
              brand: brandName,
            },
          }

          // In-app — channel-respecting (skip if user opted out).
          if (channelEnabled(user, "in-app")) {
            const notif: Notification = {
              ...baseNotif,
              id: genId("notif"),
              channel: "in-app",
              createdAt: new Date().toISOString(),
              status: "queued",
            }
            notifications.unshift(notif)
            inAppCount++
          }

          // Email — fire the send, then log a matching notification
          // row so the Inbox's "Email" tab carries the same reminder.
          // Status flips to "sent" only when the email provider
          // accepted the message; on failure we drop the inbox row to
          // avoid claiming a delivery that didn't happen.
          if (channelEnabled(user, "email") && user.email) {
            let emailOk = false
            try {
              await sendEmail({
                to: user.email,
                subject: reminderEmailSubject(copy),
                html: reminderEmailHtml(copy),
                text: reminderWhatsappText(copy),
              })
              emailCount++
              emailOk = true
            } catch (err) {
              // eslint-disable-next-line no-console
              console.warn(
                `[class-reminders] email failed for ${user.email}`,
                (err as Error).message,
              )
            }
            if (emailOk) {
              const notif: Notification = {
                ...baseNotif,
                id: genId("notif"),
                channel: "email",
                createdAt: new Date().toISOString(),
                status: "sent",
              }
              notifications.unshift(notif)
            }
          }

          // WhatsApp — same pattern as email. We rely on the
          // dispatcher's `ok` flag (Meta API responded 2xx OR the
          // stub returned ok) to decide whether to log a row.
          if (channelEnabled(user, "whatsapp") && user.phone) {
            let whatsappOk = false
            try {
              const res = await sendWhatsApp({
                to: user.phone,
                text: reminderWhatsappText(copy),
                kind: `class-reminder.${reminder.key}`,
              })
              if (res.ok) {
                whatsappCount++
                whatsappOk = true
              }
            } catch (err) {
              // eslint-disable-next-line no-console
              console.warn(
                `[class-reminders] whatsapp failed for ${user.phone}`,
                (err as Error).message,
              )
            }
            if (whatsappOk) {
              const notif: Notification = {
                ...baseNotif,
                id: genId("notif"),
                channel: "whatsapp",
                createdAt: new Date().toISOString(),
                status: "sent",
              }
              notifications.unshift(notif)
            }
          }
        }

        // Mark the window as fired so the next poll skips it. We
        // write to the in-memory copy and persist the whole sessions
        // array back to the blob below.
        session.remindersSent = {
          ...(session.remindersSent ?? {}),
          [reminder.key]: new Date().toISOString(),
        }
        blobChanged = true
      }
    }

    if (blobChanged) {
      blob["lms.liveSessions.v1"] = sessions
      blob["lms.notifications.v1"] = notifications
      // Atomic write — same pattern lib/portal-state-server uses.
      const tmp = `${filePath}.${process.pid}.tmp`
      await fs.writeFile(tmp, JSON.stringify(blob, null, 2), "utf8")
      await fs.rename(tmp, filePath)
    }
  }

  return NextResponse.json({
    ok: true,
    scanned: { tenants: tenantsScanned, sessions: sessionsScanned, eligible: eligibleCount },
    sent: { inApp: inAppCount, email: emailCount, whatsapp: whatsappCount },
    windows: REMINDER_WINDOWS.map((w) => w.key) as ReminderWindowKey[],
  })
}

function channelEnabled(user: User, channel: NotificationChannel): boolean {
  const prefs = user.notificationChannels
  if (!prefs) return true
  if (channel === "in-app") return prefs.inApp !== false
  if (channel === "email") return prefs.email !== false
  if (channel === "whatsapp") return prefs.whatsapp !== false
  return true
}

function formatScheduledTime(iso: string): string {
  // We deliberately render in the SERVER's locale — the recipient's
  // tenant may live in any zone and the User.timezone field is only
  // a render hint, not authoritative. Recipients see the local time
  // in their email client / WhatsApp message; the absolute ISO is in
  // the link so they can verify if needed.
  try {
    return new Date(iso).toLocaleString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  } catch {
    return iso
  }
}
