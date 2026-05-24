"use client"

// Unified per-student activity timeline. Aggregates every signal we
// have from existing stores into a single chronological feed: course
// enrolments, lesson completions, quiz attempts, attendance records,
// assignment submissions, doubts asked, messages received. No new
// data layer required — everything is derived from existing slices.

import { useMemo } from "react"
import Link from "next/link"
import {
  BookOpen,
  Calendar,
  CheckCircle2,
  ClipboardList,
  GraduationCap,
  MessageCircleQuestion,
  Send,
  Video,
  XCircle,
  FileQuestion,
  CalendarX,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useLMS } from "@/lib/lms-store"
import { cn } from "@/lib/utils"

interface Props {
  studentId: string
}

interface Event {
  id: string
  at: string                       // ISO timestamp
  icon: LucideIcon
  color: "primary" | "success" | "accent" | "destructive" | "muted"
  title: string
  body?: string
  href?: string
}

const COLOR_BG: Record<Event["color"], string> = {
  primary: "bg-primary/10 text-primary",
  success: "bg-success/15 text-success",
  accent: "bg-accent/15 text-accent",
  destructive: "bg-destructive/15 text-destructive",
  muted: "bg-muted text-muted-foreground",
}

export function StudentActivityTimeline({ studentId }: Props) {
  const {
    enrollments,
    courses,
    quizAttempts,
    quizzes,
    attendance,
    liveSessions,
    submissions,
    assignments,
    doubts,
    messages,
    getCourseById,
  } = useLMS()

  const events = useMemo<Event[]>(() => {
    const out: Event[] = []

    // Enrolments
    enrollments
      .filter((e) => e.studentId === studentId)
      .forEach((e) => {
        const c = getCourseById(e.courseId)
        out.push({
          id: `enr-${e.id}`,
          at: e.enrolledAt,
          icon: BookOpen,
          color: "primary",
          title: `Enrolled in ${c?.title ?? "a course"}`,
          href: c ? `/dashboard/courses/${c.id}` : undefined,
        })
        // Per-lesson completion. Enrollment carries the lesson ids
        // but not per-lesson timestamps — fall back to the
        // enrollment's lastAccessedAt (good enough as an upper
        // bound for "when most recently active in this course").
        //
        // We compute the figures against the course's CURRENT lesson
        // set, so a teacher who removed a lesson the student already
        // ticked won't see an inflated "12/10 lessons done" badge.
        if (e.completedLessons.length > 0 && c) {
          const currentIds = new Set(c.modules.flatMap((m) => m.lessons.map((l) => l.id)))
          const liveDone = e.completedLessons.filter((id) => currentIds.has(id)).length
          const liveTotal = currentIds.size
          const livePct = liveTotal > 0 ? Math.min(100, Math.round((liveDone / liveTotal) * 100)) : 0
          out.push({
            id: `prog-${e.id}`,
            at: e.lastAccessedAt,
            icon: CheckCircle2,
            color: "success",
            title: `${liveDone}/${liveTotal} lessons done in ${c.title}`,
            body: `${livePct}% complete`,
            href: `/dashboard/courses/${c.id}`,
          })
        }
      })

    // Quiz attempts
    quizAttempts
      .filter((a) => a.studentId === studentId)
      .forEach((a) => {
        const q = quizzes.find((x) => x.id === a.quizId)
        out.push({
          id: `quiz-${a.id}`,
          at: a.completedAt || a.startedAt,
          icon: FileQuestion,
          color: a.passed ? "success" : "destructive",
          title: `${a.passed ? "Passed" : "Did not pass"} "${q?.title ?? "a quiz"}"`,
          body: `Scored ${a.score}% · ${Math.round(a.timeSpent / 60)} min`,
        })
      })

    // Attendance — we only record join events (no "absent" row). For
    // every live session the student was enrolled in but doesn't
    // appear in attendance for, we synthesize an "absent" entry so
    // the teacher can spot no-shows in the same feed.
    const myAttendance = attendance.filter((r) => r.studentId === studentId)
    myAttendance.forEach((r) => {
      const s = liveSessions.find((x) => x.id === r.sessionId)
      out.push({
        id: `att-${r.id}`,
        at: r.joinedAt,
        icon: Video,
        color: "primary",
        title: `Attended live session: ${s?.title ?? "Untitled"}`,
        body: r.leftAt
          ? `Joined ${new Date(r.joinedAt).toLocaleTimeString()}, left ${new Date(r.leftAt).toLocaleTimeString()}`
          : "Joined the live class",
      })
    })
    // Synthesize "missed" entries for past sessions in courses the
    // student is enrolled in but didn't attend.
    const myEnrollmentCourseIds = new Set(
      enrollments.filter((e) => e.studentId === studentId).map((e) => e.courseId),
    )
    const attendedSessionIds = new Set(myAttendance.map((r) => r.sessionId))
    const now = Date.now()
    liveSessions
      .filter(
        (s) =>
          myEnrollmentCourseIds.has(s.courseId) &&
          !attendedSessionIds.has(s.id) &&
          new Date(s.scheduledAt).getTime() < now,
      )
      .forEach((s) => {
        out.push({
          id: `miss-${s.id}`,
          at: s.scheduledAt,
          icon: CalendarX,
          color: "destructive",
          title: `Missed live session: ${s.title}`,
          body: "Did not join",
        })
      })

    // Assignment submissions
    submissions
      .filter((s) => s.studentId === studentId)
      .forEach((s) => {
        const a = assignments.find((x) => x.id === s.assignmentId)
        const passed =
          s.status === "graded" && a?.maxScore
            ? (s.score ?? 0) >= a.maxScore * 0.5
            : false
        out.push({
          id: `sub-${s.id}`,
          at: s.gradedAt ?? s.submittedAt,
          icon: ClipboardList,
          color: s.status === "graded" ? (passed ? "success" : "destructive") : "accent",
          title:
            s.status === "graded"
              ? `Submission graded: ${a?.title ?? "Assignment"}`
              : `Submitted: ${a?.title ?? "Assignment"}`,
          body:
            s.status === "graded"
              ? `Score: ${s.score ?? 0}/${a?.maxScore ?? 100}`
              : "Awaiting review",
          href: a ? `/dashboard/assignments/${a.id}` : undefined,
        })
      })

    // Doubts raised
    doubts
      .filter((d) => d.studentId === studentId)
      .forEach((d) => {
        out.push({
          id: `doubt-${d.id}`,
          at: d.createdAt,
          icon: MessageCircleQuestion,
          color: d.status === "resolved" ? "success" : "accent",
          title: `Asked: "${d.title}"`,
          body: d.replies.length > 0 ? `${d.replies.length} replies` : "No replies yet",
        })
      })

    // Messages received
    messages
      .filter((m) => m.recipientIds.includes(studentId))
      .forEach((m) => {
        out.push({
          id: `msg-${m.id}`,
          at: m.createdAt,
          icon: Send,
          color: "muted",
          title: `Message sent: "${m.subject}"`,
          body: `Via ${m.channels.join(", ")}`,
        })
      })

    // Sort newest-first.
    out.sort((a, b) => b.at.localeCompare(a.at))
    return out
  }, [
    studentId,
    enrollments,
    courses,
    quizAttempts,
    quizzes,
    attendance,
    liveSessions,
    submissions,
    assignments,
    doubts,
    messages,
    getCourseById,
  ])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GraduationCap className="h-5 w-5" />
          Activity timeline
        </CardTitle>
        <CardDescription>
          Everything this student has done — lessons, quizzes, attendance, submissions, questions,
          messages — newest first.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground">No activity yet.</p>
        ) : (
          <ol className="relative border-l-2 border-border pl-6">
            {events.map((e) => (
              <li key={e.id} className="relative pb-5 last:pb-0">
                <span
                  className={cn(
                    "absolute -left-[33px] flex h-7 w-7 items-center justify-center rounded-full ring-4 ring-background",
                    COLOR_BG[e.color],
                  )}
                >
                  <e.icon className="h-3.5 w-3.5" />
                </span>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    {e.href ? (
                      <Link href={e.href} className="block font-medium hover:text-primary">
                        {e.title}
                      </Link>
                    ) : (
                      <p className="font-medium">{e.title}</p>
                    )}
                    {e.body && <p className="mt-0.5 text-xs text-muted-foreground">{e.body}</p>}
                  </div>
                  <span className="shrink-0 text-[11px] text-muted-foreground">
                    {formatRelative(e.at)}
                  </span>
                </div>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  )
}

// Tight relative-time helper. Stays in this file because it's tiny
// and only the timeline needs it.
function formatRelative(iso: string): string {
  const t = new Date(iso).getTime()
  const now = Date.now()
  const diff = Math.max(0, now - t)
  const min = Math.floor(diff / 60_000)
  if (min < 1) return "just now"
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  const d = Math.floor(hr / 24)
  if (d < 30) return `${d}d ago`
  return new Date(iso).toLocaleDateString()
}

// Re-export the icons consumers might need elsewhere.
export { Calendar, XCircle }
