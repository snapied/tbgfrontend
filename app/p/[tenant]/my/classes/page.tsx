"use client"

// Upcoming + past live classes for the signed-in student, scoped to
// the courses they're enrolled in. Two tabs: Upcoming (next 14 days)
// and Past (last 30 days). Each card carries the join link or the
// recording link as appropriate.

import { useMemo, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { CalendarClock, Columns3, Film, List, Video } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useLMS, type LiveSession } from "@/lib/lms-store"
import { cn } from "@/lib/utils"
import { ProductTour, TakeATourButton } from "@/components/tour/product-tour"
import {
  STUDENT_CLASSES_TOUR,
  STUDENT_CLASSES_TOUR_ID,
} from "@/components/student/tours"
import { KanbanBoard, KanbanCard, type KanbanColumn } from "@/components/kanban/kanban-board"
import { useStickyView } from "@/lib/use-sticky-view"

function tenantSlug(params: { tenant?: string | string[] }): string {
  const t = params.tenant
  return Array.isArray(t) ? t[0] ?? "" : t ?? ""
}

const UPCOMING_WINDOW_MS = 14 * 24 * 60 * 60 * 1000
const PAST_WINDOW_MS = 30 * 24 * 60 * 60 * 1000

export default function MyClassesPage() {
  const params = useParams<{ tenant: string }>()
  const slug = tenantSlug(params)
  const { currentUser, enrollments, liveSessions, getCourseById } = useLMS()
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming")
  // Sticky list ↔ kanban toggle, scoped to this surface so the
  // student-classes preference doesn't bleed into other boards.
  const [view, setView] = useStickyView("student.classes", "list")

  const myCourseIds = useMemo(
    () =>
      new Set(
        (currentUser
          ? enrollments.filter((e) => e.studentId === currentUser.id)
          : []
        ).map((e) => e.courseId),
      ),
    [enrollments, currentUser],
  )

  const { upcoming, past } = useMemo(() => {
    const now = Date.now()
    const myClasses = liveSessions
      .filter((s) => myCourseIds.has(s.courseId))
      .filter((s) => s.status !== "cancelled")
    const upcomingList = myClasses
      .filter((s) => {
        const t = new Date(s.scheduledAt).getTime()
        return t >= now - 60 * 60 * 1000 && t <= now + UPCOMING_WINDOW_MS
      })
      .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))
    const pastList = myClasses
      .filter((s) => {
        const t = new Date(s.scheduledAt).getTime()
        return t < now - 60 * 60 * 1000 && t >= now - PAST_WINDOW_MS
      })
      .sort((a, b) => b.scheduledAt.localeCompare(a.scheduledAt))
    return { upcoming: upcomingList, past: pastList }
  }, [liveSessions, myCourseIds])

  return (
    <div className="space-y-6">
      <ProductTour tourId={STUDENT_CLASSES_TOUR_ID} steps={STUDENT_CLASSES_TOUR} />
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold tracking-tight">Live classes</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Scheduled video sessions for your courses. We&apos;ll alert you when each one is about to start.
          </p>
        </div>
        <TakeATourButton tourId={STUDENT_CLASSES_TOUR_ID} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
          <TabsList>
            <TabsTrigger value="upcoming">
              Upcoming ({upcoming.length})
            </TabsTrigger>
            <TabsTrigger value="past">Past ({past.length})</TabsTrigger>
          </TabsList>
        </Tabs>
        <Tabs value={view} onValueChange={(v) => setView(v as "list" | "kanban")}>
          <TabsList>
            <TabsTrigger value="list" aria-label="List view">
              <List className="h-4 w-4" />
            </TabsTrigger>
            <TabsTrigger value="kanban" aria-label="Kanban view">
              <Columns3 className="h-4 w-4" />
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {view === "kanban" ? (
        <StudentClassesKanban
          upcoming={upcoming}
          past={past}
          slug={slug}
          getCourseTitle={(id) => getCourseById(id)?.title}
        />
      ) : tab === "upcoming" ? (
        upcoming.length === 0 ? (
          <EmptyState
            icon={<CalendarClock className="h-10 w-10 text-muted-foreground" />}
            title="No upcoming classes"
            body="Once your teacher schedules one for a course you're enrolled in, it shows up here."
          />
        ) : (
          <div className="grid gap-3">
            {upcoming.map((s) => (
              <ClassRow
                key={s.id}
                slug={slug}
                session={s}
                courseTitle={getCourseById(s.courseId)?.title}
                variant="upcoming"
              />
            ))}
          </div>
        )
      ) : past.length === 0 ? (
        <EmptyState
          icon={<Film className="h-10 w-10 text-muted-foreground" />}
          title="No past classes in the last 30 days"
          body="Older classes are kept on the course detail page."
        />
      ) : (
        <div className="grid gap-3">
          {past.map((s) => (
            <ClassRow
              key={s.id}
              slug={slug}
              session={s}
              courseTitle={getCourseById(s.courseId)?.title}
              variant="past"
            />
          ))}
        </div>
      )}
    </div>
  )
}

// Kanban view groups classes by time-to-start. Same source data as
// the list view (upcoming + past), just bucketed differently so a
// student can see "starting now / today / this week / past" at a
// glance. Kanban deliberately ignores the upcoming/past Tabs above —
// it shows everything in one screen.
function StudentClassesKanban({
  upcoming,
  past,
  slug,
  getCourseTitle,
}: {
  upcoming: LiveSession[]
  past: LiveSession[]
  slug: string
  getCourseTitle: (id: string) => string | undefined
}) {
  const now = Date.now()
  const liveNow = upcoming.filter((s) => {
    const ms = new Date(s.scheduledAt).getTime()
    return ms - now <= 5 * 60 * 1000 && now - ms <= 60 * 60 * 1000
  })
  const liveIds = new Set(liveNow.map((s) => s.id))
  const remainingUpcoming = upcoming.filter((s) => !liveIds.has(s.id))
  const today = remainingUpcoming.filter((s) => {
    const ms = new Date(s.scheduledAt).getTime()
    return ms - now <= 24 * 60 * 60 * 1000
  })
  const thisWeek = remainingUpcoming.filter((s) => {
    const ms = new Date(s.scheduledAt).getTime()
    return ms - now > 24 * 60 * 60 * 1000
  })

  const columns: Array<KanbanColumn<LiveSession>> = [
    { key: "live", label: "Live now", tone: "rose", rows: liveNow },
    { key: "today", label: "Today", tone: "amber", rows: today },
    { key: "soon", label: "Coming up", tone: "blue", rows: thisWeek },
    { key: "past", label: "Past", tone: "slate", rows: past },
  ]
  return (
    <KanbanBoard
      columns={columns}
      keyOf={(s) => s.id}
      renderCard={(session, columnKey) => {
        const when = new Date(session.scheduledAt).toLocaleString(undefined, {
          weekday: "short",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
        const watchHref = session.recordingUrl ?? undefined
        const href =
          columnKey === "past"
            ? watchHref ?? `/p/${slug}/my/recordings`
            : session.roomCode
              ? `/p/${slug}/live/${session.roomCode}`
              : session.meetingUrl || `/p/${slug}/my/classes`
        const badge =
          columnKey === "live" ? (
            <Badge variant="destructive" className="shrink-0">
              Live now
            </Badge>
          ) : columnKey === "past" && session.recordingUrl ? (
            <Badge variant="secondary" className="shrink-0">
              <Film className="mr-1 h-3 w-3" />
              Recording
            </Badge>
          ) : undefined
        return (
          <KanbanCard
            href={href}
            title={session.title}
            subtitle={`${getCourseTitle(session.courseId) ?? "—"} · ${when}`}
            meta={
              <span>
                <Video className="mr-1 inline-block h-3 w-3" />
                {session.durationMinutes} min
              </span>
            }
            badge={badge}
          />
        )
      }}
    />
  )
}

function ClassRow({
  slug,
  session,
  courseTitle,
  variant,
}: {
  slug: string
  session: LiveSession
  courseTitle?: string
  variant: "upcoming" | "past"
}) {
  const scheduledMs = new Date(session.scheduledAt).getTime()
  const diffMin = Math.round((scheduledMs - Date.now()) / 60_000)
  const inProgress = variant === "upcoming" && diffMin <= 5 && diffMin >= -60
  const when = new Date(session.scheduledAt).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })

  const joinHref = session.roomCode
    ? `/p/${slug}/live/${session.roomCode}`
    : undefined
  const watchHref = session.recordingUrl ?? undefined

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="line-clamp-1 font-serif text-base font-semibold">
              {session.title}
            </p>
            {inProgress && (
              <Badge className="bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/15 dark:text-emerald-300">
                <span className="mr-1 h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                Live now
              </Badge>
            )}
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {courseTitle ? `${courseTitle} · ` : ""}
            {when}
            {session.durationMinutes ? ` · ${session.durationMinutes} min` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {variant === "upcoming" && joinHref && (
            <Button asChild size="sm" variant={inProgress ? "default" : "outline"}>
              <Link href={joinHref}>
                <Video className="mr-1.5 h-3.5 w-3.5" />
                {inProgress ? "Join now" : "Open room"}
              </Link>
            </Button>
          )}
          {variant === "past" && watchHref && (
            <Button asChild size="sm" variant="outline">
              <a href={watchHref} target="_blank" rel="noreferrer">
                <Film className="mr-1.5 h-3.5 w-3.5" />
                Watch recording
              </a>
            </Button>
          )}
          {variant === "past" && !watchHref && (
            <span className="text-xs text-muted-foreground">No recording</span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function EmptyState({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode
  title: string
  body: string
}) {
  return (
    <Card>
      <CardContent className="py-12 text-center">
        <div className="mx-auto inline-flex">{icon}</div>
        <p className="mt-3 font-medium">{title}</p>
        <p className="mt-1 text-sm text-muted-foreground">{body}</p>
      </CardContent>
    </Card>
  )
}
