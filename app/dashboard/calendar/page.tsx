"use client"

// Calendar — unified view of everything time-bound for the teacher.
//
// Aggregates from multiple stores:
//   • Live classes (LiveSession.scheduledAt + durationMinutes)
//   • Assignment due dates (Assignment.dueAt)
//   • Course scheduled publish (Course.publishAt)
//   • Blog scheduled publish (PortalBlogPost.publishedAt when future)
//
// URL-syncs view + focused date so the team can deep-link to a week.
//
// No primitives or hooks are dedicated to "calendar events" — the
// aggregation is small enough that a useMemo in this page is clearer
// than an indirection through a hook. If more sources land (assignments
// from external LMS, ICS imports), we lift to lib/calendar-events.ts.

import { useMemo } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import {
  Video,
  ClipboardList,
  BookOpen,
  Newspaper,
  Plus,
  Sparkles,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { CalendarView, type CalendarEvent, type CalendarViewMode } from "@/components/ui/calendar-view"
import { useLMS } from "@/lib/lms-store"
import { usePortal } from "@/lib/portal-store"

const VIEW_PARAM = "view"
const DATE_PARAM = "date"

export default function CalendarPage() {
  const router = useRouter()
  const params = useSearchParams()
  const { liveSessions, assignments, courses, getCourseById } = useLMS()
  const { posts } = usePortal()

  const view = (params.get(VIEW_PARAM) as CalendarViewMode) || "month"
  // Default to "today" in YYYY-MM-DD local format. Stored in the URL
  // so refresh + share-link both land on the same week.
  const date = params.get(DATE_PARAM) || todayIso()

  const setQuery = (next: Partial<{ view: CalendarViewMode; date: string }>) => {
    const sp = new URLSearchParams(params)
    if (next.view) sp.set(VIEW_PARAM, next.view)
    if (next.date) sp.set(DATE_PARAM, next.date)
    router.replace(`?${sp.toString()}`, { scroll: false })
  }

  // Compose events from each source. The detail labels follow the
  // pattern "<title> · <subtitle>" so the chip + click target give
  // the teacher enough context without opening the artifact.
  const events: CalendarEvent[] = useMemo(() => {
    const out: CalendarEvent[] = []

    // ── Live classes
    for (const s of liveSessions) {
      if (s.status === "cancelled") continue
      const course = getCourseById(s.courseId)
      out.push({
        id: `live-${s.id}`,
        startAt: s.scheduledAt,
        endAt: s.durationMinutes
          ? new Date(new Date(s.scheduledAt).getTime() + s.durationMinutes * 60_000).toISOString()
          : undefined,
        title: s.title,
        subtitle: course?.title,
        tone: "blue",
        Icon: Video,
        onClick: () => router.push(`/dashboard/classes/${s.id}`),
      })
    }

    // ── Assignment due dates
    for (const a of assignments) {
      if (!a.dueAt) continue
      const course = getCourseById(a.courseId)
      out.push({
        id: `assign-${a.id}`,
        startAt: a.dueAt,
        title: `Due: ${a.title}`,
        subtitle: course?.title,
        tone: "amber",
        Icon: ClipboardList,
        onClick: () => router.push(`/dashboard/assignments/${a.id}`),
      })
    }

    // ── Course scheduled publish
    for (const c of courses) {
      if (!c.publishAt) continue
      // Future-dated only — past `publishAt` either fired or was
      // ignored (status field is authoritative). Tomorrow's launch
      // matters; last month's doesn't clutter the calendar.
      if (new Date(c.publishAt).getTime() < Date.now() - 24 * 3600 * 1000) continue
      out.push({
        id: `course-${c.id}`,
        startAt: c.publishAt,
        title: `Course launch: ${c.title}`,
        tone: "green",
        Icon: BookOpen,
        onClick: () => router.push(`/dashboard/courses/${c.id}`),
      })
    }

    // ── Blog scheduled publish (publishedAt in the future)
    for (const p of posts) {
      if (!p.publishedAt) continue
      if (new Date(p.publishedAt).getTime() < Date.now() - 24 * 3600 * 1000) continue
      out.push({
        id: `post-${p.id}`,
        startAt: p.publishedAt,
        title: `Post: ${p.title}`,
        tone: "purple",
        Icon: Newspaper,
        onClick: () => router.push(`/dashboard/portal/blog/${p.id}`),
      })
    }

    return out
  }, [liveSessions, assignments, courses, posts, getCourseById, router])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            Schedule
          </div>
          <h1 className="mt-3 font-serif text-2xl font-bold tracking-tight">Calendar</h1>
          <p className="text-muted-foreground">
            Live classes, assignment due dates, course launches, and post publishes — in one view.
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/classes/new">
            <Plus className="mr-1.5 h-4 w-4" />
            Schedule a class
          </Link>
        </Button>
      </div>

      {/* Source legend — colour-code so the calendar reads at a glance */}
      <div className="flex flex-wrap gap-3 text-[11.5px] text-muted-foreground">
        <LegendDot tone="blue" label="Live classes" />
        <LegendDot tone="amber" label="Assignment due" />
        <LegendDot tone="green" label="Course launch" />
        <LegendDot tone="purple" label="Post publish" />
      </div>

      {/* Calendar */}
      <CalendarView
        date={date}
        view={view}
        events={events}
        onDateChange={(d) => setQuery({ date: d })}
        onViewChange={(v) => setQuery({ view: v })}
      />

      {/* Empty-data nudge — only when truly nothing is on the calendar */}
      {events.length === 0 && (
        <div className="rounded-md border border-dashed border-border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
          Nothing scheduled yet. Pop into <Link href="/dashboard/classes" className="text-primary underline">Live Classes</Link> or set a course publish date to see it land here.
        </div>
      )}
    </div>
  )
}

function LegendDot({ tone, label }: { tone: CalendarEvent["tone"]; label: string }) {
  const cls =
    tone === "blue" ? "bg-blue-500" :
    tone === "amber" ? "bg-amber-500" :
    tone === "green" ? "bg-emerald-500" :
    tone === "purple" ? "bg-purple-500" :
    tone === "rose" ? "bg-rose-500" :
    "bg-slate-500"
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-2 w-2 rounded-full ${cls}`} />
      {label}
    </span>
  )
}

function todayIso(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const dd = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${dd}`
}
