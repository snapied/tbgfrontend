// Dev-only preview of the class-reminder fan-out. Lets you see what
// students + the host will receive *without* burning the real
// remindersSent markers on the session. Mirrors the production
// scanner at /api/cron/class-reminders but with two differences:
//   • Window selectable via ?window= (3h | 1h | 15m). Defaults to 15m
//     because that's the most-urgent feeling copy.
//   • Does NOT persist `remindersSent`, so the real schedule still
//     fires on time.
//
// Usage:
//   POST /api/dev/preview-reminder?tenant=<slug>&session=<id>&window=15m
// Returns { ok, sent: { inApp, email }, preview: { subject, html, text, recipients } }.

import { NextResponse, type NextRequest } from "next/server"
import { promises as fs } from "fs"
import path from "path"
import { sendEmail } from "@/lib/zepto"
import {
  REMINDER_WINDOWS,
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

function dataDir(): string {
  return path.join(process.cwd(), ".portal-state")
}
function appBase(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "")
}
function genId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`
}

export async function POST(req: NextRequest) {
  const url = new URL(req.url)
  const tenant = url.searchParams.get("tenant") ?? ""
  const sessionId = url.searchParams.get("session") ?? ""
  const windowKey = (url.searchParams.get("window") ?? "15m") as ReminderWindowKey

  if (!tenant || !sessionId) {
    return NextResponse.json(
      { ok: false, error: "Pass ?tenant=<slug>&session=<id>" },
      { status: 400 },
    )
  }
  if (!/^[a-z0-9-_]+$/i.test(tenant)) {
    return NextResponse.json({ ok: false, error: "Invalid tenant slug" }, { status: 400 })
  }
  const reminder = REMINDER_WINDOWS.find((w) => w.key === windowKey)
  if (!reminder) {
    return NextResponse.json(
      { ok: false, error: `Invalid window. Use one of: ${REMINDER_WINDOWS.map((w) => w.key).join(", ")}` },
      { status: 400 },
    )
  }

  const filePath = path.join(dataDir(), `${tenant}.json`)
  let blob: Record<string, unknown>
  try {
    const raw = await fs.readFile(filePath, "utf8")
    blob = JSON.parse(raw) as Record<string, unknown>
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return NextResponse.json({ ok: false, error: `No data for tenant ${tenant}` }, { status: 404 })
    }
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 })
  }

  const sessions = (blob["lms.liveSessions.v1"] as LiveSession[] | undefined) ?? []
  const users = (blob["lms.users.v1"] as User[] | undefined) ?? []
  const courses = (blob["lms.courses.v1"] as Course[] | undefined) ?? []
  const enrollments =
    (blob["lms.enrollments.v1"] as Enrollment[] | undefined) ?? []
  const notifications =
    (blob["lms.notifications.v1"] as Notification[] | undefined) ?? []

  const session = sessions.find((s) => s.id === sessionId)
  if (!session) {
    return NextResponse.json({ ok: false, error: `Session ${sessionId} not found in ${tenant}` }, { status: 404 })
  }
  const course = courses.find((c) => c.id === session.courseId)
  const host = users.find((u) => u.id === session.hostId)
  const instructorName =
    host?.name ?? course?.instructor?.name ?? "your instructor"
  const studentIds = new Set(
    enrollments
      .filter((e) => e.courseId === session.courseId)
      .map((e) => e.studentId),
  )
  const recipientIds = new Set<string>(studentIds)
  if (host) recipientIds.add(host.id)
  const recipients = users.filter((u) => recipientIds.has(u.id))

  const joinUrl = session.roomCode
    ? `${appBase()}/p/${tenant}/live/${session.roomCode}`
    : session.meetingUrl || `${appBase()}/p/${tenant}/my/classes`
  const scheduledAtPretty = new Date(session.scheduledAt).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })

  // Render a sample (host-perspective) so the response carries one
  // concrete email body the caller can paste into a viewer.
  const previewCopy = {
    inLabel: reminder.inLabel,
    longLabel: reminder.longLabel,
    classTitle: session.title,
    courseTitle: course?.title ?? "Your course",
    instructorName,
    scheduledAtPretty,
    durationMinutes: session.durationMinutes,
    joinUrl,
    role: "student" as const,
  }

  let inAppCount = 0
  let emailCount = 0
  const sentTo: string[] = []

  for (const user of recipients) {
    const role: "instructor" | "student" =
      user.id === session.hostId ? "instructor" : "student"
    const copy = { ...previewCopy, role }

    if (channelEnabled(user, "in-app")) {
      const notif: Notification = {
        id: genId("notif"),
        userId: user.id,
        channel: "in-app",
        type: "live-session.reminder",
        title: `Class ${reminder.inLabel}: ${session.title}`,
        body: `${course?.title ?? "Coursework"} · ${scheduledAtPretty} · ${session.durationMinutes} min`,
        url: `/p/${tenant}/live/${session.roomCode ?? session.id}`,
        createdAt: new Date().toISOString(),
        status: "queued",
        meta: { sessionId: session.id, window: reminder.key, preview: true },
      }
      notifications.unshift(notif)
      inAppCount++
    }

    if (channelEnabled(user, "email") && user.email) {
      try {
        await sendEmail({
          to: user.email,
          subject: reminderEmailSubject(copy),
          html: reminderEmailHtml(copy),
          text: reminderWhatsappText(copy),
        })
        emailCount++
        sentTo.push(user.email)
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn(
          `[preview-reminder] email failed for ${user.email}`,
          (err as Error).message,
        )
      }
    }
  }

  // Persist the in-app notifications back so the bell + /my/inbox
  // light up on next client poll. Deliberately do NOT touch
  // session.remindersSent — the real schedule must still fire.
  blob["lms.notifications.v1"] = notifications
  const tmp = `${filePath}.${process.pid}.tmp`
  await fs.writeFile(tmp, JSON.stringify(blob, null, 2), "utf8")
  await fs.rename(tmp, filePath)

  return NextResponse.json({
    ok: true,
    sent: { inApp: inAppCount, email: emailCount },
    sentTo,
    recipients: recipients.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.id === session.hostId ? "instructor" : "student",
    })),
    preview: {
      subject: reminderEmailSubject(previewCopy),
      html: reminderEmailHtml(previewCopy),
      text: reminderWhatsappText(previewCopy),
    },
  })
}

function channelEnabled(user: User, channel: NotificationChannel): boolean {
  const prefs = user.notificationChannels
  if (!prefs) return true
  if (channel === "in-app") return prefs.inApp !== false
  if (channel === "email") return prefs.email !== false
  return true
}
