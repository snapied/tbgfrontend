"use client"

import { useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Bell,
  Calendar,
  Clock,
  ExternalLink,
  Filter,
  GraduationCap,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  Play,
  Plus,
  Radio,
  Search,
  Send,
  Sunrise,
  Trash2,
  Users,
  Video,
  XCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { useLMS, generateId, type LiveSession } from "@/lib/lms-store"
import { useConfirm } from "@/lib/use-confirm"
import { useUrlState } from "@/lib/use-url-state"
import { usePlan } from "@/lib/use-plan"
import { PlanLimitHint } from "@/components/dashboard/plan-lock"
import { ClassCalendar } from "@/components/classes/class-calendar"
import { EditSessionDialog } from "@/components/classes/edit-session-dialog"
import { PastClassesArchive } from "@/components/classes/past-classes-archive"
import {
  EmptyStateWithTemplates,
  type EmptyStateTemplate,
} from "@/components/dashboard/empty-state-templates"
import { usePageShortcut } from "@/components/dashboard/shortcuts-provider"
import { toastUndoableDelete } from "@/lib/toast-undo"
import { toast } from "sonner"
import {
  buildNotifications,
  liveSessionAnnouncement,
} from "@/lib/notifications"
import {
  computeSessionStatus,
  formatSessionWhen,
  providerLabel,
} from "@/lib/live-session-utils"

// Schedule a Date at HH:MM tomorrow, ignoring seconds. Templates land
// next-day so the teacher sees a future class on the calendar without
// us racing the current time.
function tomorrowAt(hour: number, minute: number): string {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  d.setHours(hour, minute, 0, 0)
  return d.toISOString()
}

function buildSessionFromTemplate(opts: {
  title: string
  description: string
  scheduledAt: string
  durationMinutes: number
  courseId: string
  hostId: string
}): LiveSession {
  const id = generateId("session")
  return {
    id,
    courseId: opts.courseId,
    title: opts.title,
    description: opts.description,
    provider: "in-house",
    meetingUrl: "",
    scheduledAt: opts.scheduledAt,
    durationMinutes: opts.durationMinutes,
    hostId: opts.hostId,
    status: "scheduled",
    roomState: "scheduled",
    // In-house room codes are derived from the session id, matching the
    // pattern used by the new-class form so /p/<tenant>/live/<code> works
    // for any session created via templates too.
    roomCode: id.replace(/[^a-z0-9]/gi, "").slice(-10) || id,
    createdAt: new Date().toISOString(),
  }
}

export default function ClassesPage() {
  const router = useRouter()
  const {
    liveSessions,
    courses,
    currentUser,
    enrollments,
    users,
    getAttendanceForSession,
    updateLiveSession,
    deleteLiveSession,
    addLiveSession,
    addNotifications,
    openLiveRoom,
    startLiveRoom,
  } = useLMS()
  const confirm = useConfirm()
  // Filters + view mode synced to URL query params. A teacher who's
  // filtered to "live" classes for Math 101 in list view can refresh
  // / bookmark / share the link and land on the exact same view.
  // Defaults aren't written, so /dashboard/classes stays clean.
  const [search, setSearch] = useUrlState<string>("q", { defaultValue: "" })
  const [courseFilter, setCourseFilter] = useUrlState<string>("course", {
    defaultValue: "all",
  })
  const [statusFilter, setStatusFilter] = useUrlState<
    "all" | "upcoming" | "live" | "ended"
  >("status", {
    defaultValue: "all",
    // Tight parser: anything that isn't one of the four valid values
    // (URL hand-edited, stale link) falls back to "all" rather than
    // letting an arbitrary string into the filter pipeline.
    parse: (raw) =>
      raw === "upcoming" || raw === "live" || raw === "ended" ? raw : "all",
  })
  const [view, setView] = useUrlState<"list" | "calendar" | "past">("view", {
    defaultValue: "calendar",
    parse: (raw) => (raw === "list" || raw === "past" ? raw : "calendar"),
  })
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [editing, setEditing] = useState<LiveSession | null>(null)
  const [flash, setFlash] = useState<string | null>(null)

  // Search input ref so "/" can focus it from anywhere on the page.
  const searchInputRef = useRef<HTMLInputElement | null>(null)
  usePageShortcut({
    id: "classes:focus-search",
    keys: "/",
    description: "Focus search",
    handler: () => searchInputRef.current?.focus(),
  })
  usePageShortcut({
    id: "classes:new",
    keys: "n",
    description: "Schedule new class",
    handler: () => router.push("/dashboard/classes/new"),
  })

  const showFlash = (msg: string) => {
    setFlash(msg)
    setTimeout(() => setFlash(null), 2000)
  }

  const toggleOne = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  const clearSelection = () => setSelected(new Set())

  // Send one announcement payload to enrolled students for each session id.
  const notifyMany = (ids: string[]) => {
    const stamp = new Date().toISOString()
    let total = 0
    for (const id of ids) {
      const s = liveSessions.find((x) => x.id === id)
      if (!s) continue
      const course = courses.find((c) => c.id === s.courseId)
      const studentIds = enrollments
        .filter((e) => e.courseId === s.courseId)
        .map((e) => e.studentId)
      const recipients = users.filter((u) => studentIds.includes(u.id))
      const payload = liveSessionAnnouncement({
        sessionTitle: s.title,
        courseTitle: course?.title ?? "Live class",
        scheduledAt: s.scheduledAt,
        durationMinutes: s.durationMinutes,
        provider: s.provider,
        meetingUrl: s.meetingUrl,
        sessionId: s.id,
      })
      if (course) payload.url = `/learn/${course.slug}#live-${s.id}`
      payload.title = `Reminder: ${payload.title}`
      const entries = buildNotifications(recipients, payload)
      total += entries.length
      addNotifications(entries)
      updateLiveSession(s.id, { notifiedAt: stamp })
    }
    showFlash(`Reminder queued · ${total} recipient${total === 1 ? "" : "s"} across ${ids.length} session${ids.length === 1 ? "" : "s"}.`)
  }

  const deleteMany = async (ids: string[]) => {
    if (ids.length === 0) return
    const verb = ids.length === 1 ? "this class" : `${ids.length} classes`
    const ok = await confirm({
      title: `Delete ${verb}?`,
      description: `Attendance records stay but the session${ids.length === 1 ? "" : "s"} disappear.`,
      destructive: true,
    })
    if (!ok) return
    ids.forEach((id) => deleteLiveSession(id))
    setSelected((prev) => {
      const next = new Set(prev)
      ids.forEach((id) => next.delete(id))
      return next
    })
    showFlash(`Deleted ${ids.length} session${ids.length === 1 ? "" : "s"}.`)
    toastUndoableDelete({ kind: "live-session", ids, itemNoun: "class" })
  }

  const cancelMany = async (ids: string[]) => {
    if (ids.length === 0) return
    const ok = await confirm({
      title: `Mark ${ids.length} session${ids.length === 1 ? "" : "s"} as cancelled?`,
      description: "Students will see them as cancelled.",
      confirmLabel: "Mark cancelled",
    })
    if (!ok) return
    ids.forEach((id) => updateLiveSession(id, { status: "cancelled" }))
    showFlash(`Cancelled ${ids.length} session${ids.length === 1 ? "" : "s"}.`)
  }

  // Quick reschedule via a small datetime prompt. We use the
  // browser's native prompt for the POC — it's fast and keyboard-
  // friendly. A richer date-time picker dialog can wrap this later
  // without touching the row code path. The new time also clears
  // any cached `notifiedAt` stamp so students get re-notified
  // about the change (they wouldn't otherwise).
  const rescheduleSession = (s: LiveSession) => {
    const current = new Date(s.scheduledAt)
    // Build a yyyy-mm-ddTHH:mm string in the user's local tz —
    // matches the format <input type="datetime-local"> uses and
    // is what the prompt user actually types.
    const pad = (n: number) => String(n).padStart(2, "0")
    const defaultStr = `${current.getFullYear()}-${pad(current.getMonth() + 1)}-${pad(current.getDate())}T${pad(current.getHours())}:${pad(current.getMinutes())}`
    const next = window.prompt(
      `Reschedule "${s.title}"\nFormat: YYYY-MM-DDTHH:MM (24h, your local time)`,
      defaultStr,
    )
    if (!next) return
    const nextMs = Date.parse(next)
    if (!Number.isFinite(nextMs)) {
      toast.error("Couldn't read that time — try YYYY-MM-DDTHH:MM.")
      return
    }
    updateLiveSession(s.id, {
      scheduledAt: new Date(nextMs).toISOString(),
      notifiedAt: undefined,
    })
    showFlash(
      `Rescheduled to ${new Date(nextMs).toLocaleString(undefined, { weekday: "short", hour: "2-digit", minute: "2-digit" })}`,
    )
  }

  // Clone the row into a fresh session +7 days. Title gets a "Week
  // N" suffix when the source title already has one; otherwise we
  // append a "(next week)" hint so the duplicate is obvious in the
  // list. Everything else (agenda, duration, host, meeting URL,
  // course, provider) is carried over so a weekly series teacher
  // confirms with one click instead of re-filling 6 fields.
  const scheduleNextInSeries = (s: LiveSession) => {
    const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000
    const nextStart = new Date(Date.parse(s.scheduledAt) + ONE_WEEK_MS)
    const weekMatch = s.title.match(/\bweek\s*(\d+)\b/i)
    const nextTitle = weekMatch
      ? s.title.replace(/\bweek\s*(\d+)\b/i, `Week ${Number(weekMatch[1]) + 1}`)
      : `${s.title} (next week)`
    const cloned: LiveSession = {
      ...s,
      id: generateId("session"),
      title: nextTitle,
      scheduledAt: nextStart.toISOString(),
      status: "scheduled",
      // Reset live-room + recap state so the clone reads as
      // fresh-and-upcoming instead of inheriting "live" / "ended"
      // metadata from its parent.
      roomState: undefined,
      roomOpenedAt: undefined,
      roomStartedAt: undefined,
      roomEndedAt: undefined,
      recordings: undefined,
      recordingUrl: undefined,
      wasHeld: undefined,
      summary: undefined,
      notifiedAt: undefined,
    }
    addLiveSession(cloned)
    toast.success(
      `Scheduled "${cloned.title}" · ${nextStart.toLocaleString(undefined, { weekday: "short", hour: "2-digit", minute: "2-digit" })}`,
    )
    showFlash(`Scheduled · ${cloned.title}`)
  }

  const sessions = useMemo(() => {
    const sorted = [...liveSessions].sort((a, b) =>
      b.scheduledAt.localeCompare(a.scheduledAt),
    )
    return sorted.filter((s) => {
      if (courseFilter !== "all" && s.courseId !== courseFilter) return false
      if (search && !s.title.toLowerCase().includes(search.toLowerCase())) return false
      if (statusFilter !== "all") {
        const status = computeSessionStatus(s)
        if (status !== statusFilter) return false
      }
      return true
    })
  }, [liveSessions, search, courseFilter, statusFilter])

  // Start an in-house class right now — bypasses the scheduledAt
  // countdown for the "I'm ready early" case. Flips state → open →
  // live (same path "Open the room" on the host page uses) and routes
  // the host into the live UI. Confirm if the start is >5 min before
  // the scheduled time so a stray click doesn't pull students in 20
  // min early.
  const startNow = async (s: LiveSession) => {
    if (s.provider !== "in-house") return
    const diffMin = Math.round((Date.now() - new Date(s.scheduledAt).getTime()) / 60_000)
    if (diffMin <= -5) {
      const ok = await confirm({
        title: `Start "${s.title}" ${Math.abs(diffMin)} min early?`,
        description:
          "Students on the waiting screen are admitted right away. Anyone with the join link can walk straight into the call.",
        confirmLabel: "Start now",
      })
      if (!ok) return
    }
    openLiveRoom(s.id)
    setTimeout(() => startLiveRoom(s.id), 250)
    showFlash(`Started "${s.title}" — joining as host…`)
    router.push(`/dashboard/classes/${s.id}/host`)
  }

  const liveCount = liveSessions.filter((s) => computeSessionStatus(s) === "live").length
  const upcomingCount = liveSessions.filter((s) => computeSessionStatus(s) === "upcoming").length
  const totalAttendance = useMemo(
    () => liveSessions.reduce((acc, s) => acc + getAttendanceForSession(s.id).length, 0),
    [liveSessions, getAttendanceForSession],
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Live Classes</h1>
          <p className="text-muted-foreground">Schedule, run, and review live sessions across your courses.</p>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="inline-flex overflow-hidden rounded-md border border-border">
            <button
              type="button"
              onClick={() => setView("calendar")}
              className={cn(
                "px-3 py-1.5 text-xs font-medium transition-colors",
                view === "calendar"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted/40",
              )}
            >
              Calendar
            </button>
            <button
              type="button"
              onClick={() => setView("list")}
              className={cn(
                "border-l border-border px-3 py-1.5 text-xs font-medium transition-colors",
                view === "list"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted/40",
              )}
            >
              List
            </button>
            <button
              type="button"
              onClick={() => setView("past")}
              className={cn(
                "border-l border-border px-3 py-1.5 text-xs font-medium transition-colors",
                view === "past"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted/40",
              )}
            >
              Past
            </button>
          </div>
          <ScheduleClassButton sessions={liveSessions} />
        </div>
      </div>

      {/* Stats. Live now + Upcoming tiles double as one-click
          filters so a teacher who lands here and wants "just the
          live ones" doesn't have to find the dropdown filter. */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          icon={<Video />}
          label="Total"
          value={`${liveSessions.length}`}
          active={statusFilter === "all"}
          onClick={() => setStatusFilter("all")}
        />
        <StatTile
          icon={<Radio className="animate-pulse" />}
          label="Live now"
          value={`${liveCount}`}
          accent={liveCount > 0}
          active={statusFilter === "live"}
          onClick={() => setStatusFilter("live")}
        />
        <StatTile
          icon={<Calendar />}
          label="Upcoming"
          value={`${upcomingCount}`}
          active={statusFilter === "upcoming"}
          onClick={() => setStatusFilter("upcoming")}
        />
        <StatTile icon={<Users />} label="Total joins" value={`${totalAttendance}`} />
      </div>

      {/* Calendar view */}
      {view === "calendar" && (
        <ClassCalendar
          sessions={liveSessions}
          courseTitle={(id) => courses.find(c => c.id === id)?.title}
        />
      )}

      {/* List view: filters + table */}
      {view === "list" && (
      <>
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                ref={searchInputRef}
                placeholder="Search sessions…  ( / )"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={courseFilter} onValueChange={setCourseFilter}>
              <SelectTrigger className="w-full sm:w-56">
                <SelectValue placeholder="Course" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All courses</SelectItem>
                {courses.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as "all" | "upcoming" | "live" | "ended")}>
              <SelectTrigger className="w-full sm:w-40">
                <Filter className="mr-1.5 h-3.5 w-3.5" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All status</SelectItem>
                <SelectItem value="live">Live</SelectItem>
                <SelectItem value="upcoming">Upcoming</SelectItem>
                <SelectItem value="ended">Ended</SelectItem>
              </SelectContent>
            </Select>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" disabled={sessions.length === 0}>
                  <MoreHorizontal className="mr-1.5 h-3.5 w-3.5" />
                  Bulk
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => notifyMany(sessions.map((s) => s.id))}>
                  <Bell className="mr-2 h-4 w-4" /> Notify all in view
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => cancelMany(sessions.map((s) => s.id))}>
                  <XCircle className="mr-2 h-4 w-4" /> Cancel all in view
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => deleteMany(sessions.map((s) => s.id))}
                >
                  <Trash2 className="mr-2 h-4 w-4" /> Delete all in view
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>

      {/* Bulk action bar — only when at least one row is selected */}
      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-primary/30 bg-primary/5 px-4 py-2 text-sm">
          <span className="font-medium">{selected.size} selected</span>
          <span className="text-muted-foreground">·</span>
          <Button size="sm" variant="outline" onClick={() => notifyMany(Array.from(selected))}>
            <Bell className="mr-1.5 h-3.5 w-3.5" /> Notify
          </Button>
          <Button size="sm" variant="outline" onClick={() => cancelMany(Array.from(selected))}>
            <XCircle className="mr-1.5 h-3.5 w-3.5" /> Cancel
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="text-destructive hover:text-destructive"
            onClick={() => deleteMany(Array.from(selected))}
          >
            <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete
          </Button>
          <Button size="sm" variant="ghost" onClick={clearSelection} className="ml-auto">
            Clear
          </Button>
        </div>
      )}

      {/* Sessions */}
      <Card>
        <CardContent className="p-0">
          {liveSessions.length === 0 ? (
            // True-empty: no classes scheduled at all. Show one-click
            // templates so the teacher lands on a real scheduled class
            // (tomorrow, in-house, default duration) instead of a blank
            // form. They tweak from the row in the table.
            (() => {
              const defaultCourseId =
                courseFilter !== "all" ? courseFilter : courses[0]?.id
              const hostId = currentUser?.id ?? "user-admin"
              const createFromTemplate = (
                kind: "standup" | "office-hours" | "recap",
              ) => {
                if (!defaultCourseId) {
                  toast.error("Create a course first so the class has a home.")
                  router.push("/dashboard/courses/new")
                  return
                }
                let s: LiveSession
                if (kind === "standup") {
                  s = buildSessionFromTemplate({
                    title: "Daily standup",
                    description: "Quick 15-min check-in: what we'll cover, blockers, questions.",
                    scheduledAt: tomorrowAt(9, 0),
                    durationMinutes: 15,
                    courseId: defaultCourseId,
                    hostId,
                  })
                } else if (kind === "office-hours") {
                  s = buildSessionFromTemplate({
                    title: "Office hours",
                    description: "Open Q&A — students drop in with whatever they're stuck on.",
                    scheduledAt: tomorrowAt(16, 0),
                    durationMinutes: 30,
                    courseId: defaultCourseId,
                    hostId,
                  })
                } else {
                  s = buildSessionFromTemplate({
                    title: "Weekly lesson",
                    description: "Main teaching block with worked examples and practice.",
                    scheduledAt: tomorrowAt(10, 0),
                    durationMinutes: 60,
                    courseId: defaultCourseId,
                    hostId,
                  })
                }
                addLiveSession(s)
                toast.success(
                  `Scheduled "${s.title}" for ${new Date(s.scheduledAt).toLocaleString(undefined, { weekday: "short", hour: "2-digit", minute: "2-digit" })}`,
                )
                showFlash(`Scheduled · ${s.title}`)
              }
              const templates: EmptyStateTemplate[] = [
                {
                  key: "standup",
                  title: "Daily standup",
                  preview: "15-min check-in at 9:00 tomorrow. In-house room, ready to go — no setup.",
                  icon: <Sunrise className="h-4 w-4" />,
                  accent: "amber",
                  onSelect: () => createFromTemplate("standup"),
                },
                {
                  key: "office-hours",
                  title: "Office hours",
                  preview: "30-min open Q&A at 4:00 tomorrow. Students drop in with whatever they're stuck on.",
                  icon: <MessageCircle className="h-4 w-4" />,
                  accent: "sky",
                  onSelect: () => createFromTemplate("office-hours"),
                },
                {
                  key: "recap",
                  title: "Weekly lesson",
                  preview: "60-min teaching block at 10:00 tomorrow. Main lesson + worked examples.",
                  icon: <GraduationCap className="h-4 w-4" />,
                  accent: "emerald",
                  onSelect: () => createFromTemplate("recap"),
                },
              ]
              return (
                <EmptyStateWithTemplates
                  icon={<Video className="h-5 w-5" />}
                  title="No sessions yet"
                  description="Pick a template to schedule a class for tomorrow in one click, or set every detail by hand."
                  templates={templates}
                  blankAction={{
                    label: "Schedule manually instead",
                    onSelect: () => router.push("/dashboard/classes/new"),
                  }}
                />
              )
            })()
          ) : sessions.length === 0 ? (
            // Filtered-to-empty: sessions exist but the current
            // search / course / status filter hides them all. Show a
            // simple "no matches" hint, not the template grid.
            <div className="px-6 py-12 text-center">
              <Video className="mx-auto h-10 w-10 text-muted-foreground" />
              <h3 className="mt-3 font-semibold">No matches</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Try clearing the search, course, or status filter.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8">
                    <Checkbox
                      checked={
                        sessions.length > 0 &&
                        sessions.every((s) => selected.has(s.id))
                      }
                      onCheckedChange={(c) => {
                        if (c) setSelected(new Set(sessions.map((s) => s.id)))
                        else clearSelection()
                      }}
                      aria-label="Select all visible sessions"
                    />
                  </TableHead>
                  <TableHead>Session</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>When</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.map((s) => {
                  const course = courses.find((c) => c.id === s.courseId)
                  const status = computeSessionStatus(s)
                  const joined = getAttendanceForSession(s.id).length
                  const isChecked = selected.has(s.id)
                  return (
                    <TableRow key={s.id} className={cn(isChecked && "bg-primary/[0.04]")}>
                      <TableCell>
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={() => toggleOne(s.id)}
                          aria-label={`Select ${s.title}`}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="min-w-0">
                          <Link
                            href={`/dashboard/classes/${s.id}`}
                            className="font-medium hover:underline"
                          >
                            {s.title}
                          </Link>
                          <p className="text-xs text-muted-foreground">
                            {providerLabel(s.provider)}
                            {s.recurrence && (
                              <span className="ml-1.5 inline-flex items-center gap-0.5 rounded-full border border-border/70 bg-muted/40 px-1.5 py-0.5 text-[10px] font-medium text-foreground">
                                ↻ {s.recurrence.label} {s.recurrence.index}/{s.recurrence.count}
                              </span>
                            )}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">{course?.title ?? "—"}</span>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {formatSessionWhen(s.scheduledAt)}
                          <span className="ml-1 text-xs text-muted-foreground">
                            · {s.durationMinutes}m
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={status} />
                      </TableCell>
                      <TableCell>
                        <span className="font-medium tabular-nums">{joined}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {status !== "ended" && status !== "cancelled" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              asChild
                              title="Open meeting link"
                              className="h-8 w-8"
                            >
                              <a href={s.meetingUrl} target="_blank" rel="noreferrer">
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setEditing(s)}
                            title="Edit"
                            className="h-8 w-8"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {/* Start-now shortcut for in-house classes
                                  that haven't started yet. Skips the
                                  scheduledAt countdown so a host who's
                                  ready early can pull students in with
                                  one click — no need to navigate to
                                  /host first. Shown in green to make it
                                  the obvious primary action when the
                                  class is upcoming. */}
                              {s.provider === "in-house" &&
                                status !== "ended" &&
                                status !== "cancelled" &&
                                (s.roomState ?? "scheduled") === "scheduled" && (
                                  <>
                                    <DropdownMenuItem
                                      className="text-success focus:text-success"
                                      onClick={() => startNow(s)}
                                    >
                                      <Play className="mr-2 h-4 w-4" /> Start class now
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                  </>
                                )}
                              <DropdownMenuItem asChild>
                                <Link href={`/dashboard/classes/${s.id}`}>Open details</Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setEditing(s)}>
                                <Pencil className="mr-2 h-4 w-4" /> Edit
                              </DropdownMenuItem>
                              {/* Quick reschedule — opens a small
                                  datetime picker prompt right in the
                                  row. Teachers running back-to-back
                                  classes don't have to open the
                                  detail page to push a class an
                                  hour. Disabled once the class has
                                  ended; rescheduling a past class
                                  reads as a mistake more often than
                                  intent. */}
                              {status !== "ended" && status !== "cancelled" && (
                                <DropdownMenuItem onClick={() => rescheduleSession(s)}>
                                  <Calendar className="mr-2 h-4 w-4" /> Reschedule…
                                </DropdownMenuItem>
                              )}
                              {/* Schedule next in series — clones the
                                  row +7 days at the same time, with
                                  "Week N" auto-numbered. Saves the
                                  3-field re-fill weekly-class teachers
                                  did manually. */}
                              <DropdownMenuItem onClick={() => scheduleNextInSeries(s)}>
                                <Plus className="mr-2 h-4 w-4" /> Schedule next week
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => notifyMany([s.id])}>
                                <Send className="mr-2 h-4 w-4" /> Send reminder
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {status !== "cancelled" && (
                                <DropdownMenuItem onClick={() => cancelMany([s.id])}>
                                  <XCircle className="mr-2 h-4 w-4" /> Cancel
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => deleteMany([s.id])}
                              >
                                <Trash2 className="mr-2 h-4 w-4" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      </>
      )}

      {view === "past" && <PastClassesArchive />}

      <EditSessionDialog
        session={editing}
        open={!!editing}
        onOpenChange={(o) => { if (!o) setEditing(null) }}
      />

      {flash && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-md border border-success/30 bg-card px-4 py-2 text-sm shadow-md">
          {flash}
        </div>
      )}
    </div>
  )
}

// Plan-aware Schedule button. liveClassesPerWeek cap is a rolling
// 7-day window; we count sessions whose start time fell in the last
// 7 days. When at cap, flip to an Upgrade CTA. The backend's
// requireUnderLimit('liveClassesPerWeek') on the recording-start
// route is the trust boundary; this is the friendly UX so users don't
// fill out the form just to bounce off a 402 when they hit Start.
function ScheduleClassButton({ sessions }: { sessions: LiveSession[] }) {
  const { usageRemaining, limits, hydrated } = usePlan()
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
  const usedThisWeek = sessions.filter((s) => {
    const t = s.scheduledAt ? new Date(s.scheduledAt).getTime() : 0
    return Number.isFinite(t) && t >= weekAgo
  }).length
  const remaining = usageRemaining("liveClassesPerWeek", usedThisWeek)
  const atCap = hydrated && remaining !== Infinity && remaining <= 0
  // Pre-warning chip — always visible when this plan caps weekly
  // live classes, calm in green-grey when under 60% of cap, amber at
  // 60-99%, red at/over. Sits next to the Schedule button so the
  // user sees their headroom before they click.
  const hint = (
    <PlanLimitHint
      metric="liveClassesPerWeek"
      current={usedThisWeek}
      noun="Class this week"
    />
  )
  if (atCap) {
    return (
      <div className="flex items-center gap-2">
        {hint}
        <Button asChild variant="outline" title={`You've scheduled ${limits.liveClassesPerWeek} class${limits.liveClassesPerWeek === 1 ? "" : "es"} in the last 7 days — your plan's weekly cap. Upgrade to schedule more.`}>
          <Link href="/dashboard/billing">
            <Plus className="mr-2 h-4 w-4" />
            Upgrade to schedule more
          </Link>
        </Button>
      </div>
    )
  }
  return (
    <div className="flex items-center gap-2">
      {hint}
      <Button asChild>
        <Link href="/dashboard/classes/new">
          <Plus className="mr-2 h-4 w-4" />
          Schedule
        </Link>
      </Button>
    </div>
  )
}

function StatTile({
  icon,
  label,
  value,
  accent,
  onClick,
  active,
}: {
  icon: React.ReactNode
  label: string
  value: string
  accent?: boolean
  /** Optional click handler. When provided the tile becomes a
   *  button (cursor + hover-lift + focus ring) so visitors discover
   *  it's interactive. Used to wire stat tiles to filter chips. */
  onClick?: () => void
  /** Visual "this filter is on" state. Adds a primary ring so the
   *  tile reads as the active selection. */
  active?: boolean
}) {
  const interactive = !!onClick
  const inner = (
    <CardContent className="p-4">
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-lg",
            accent ? "bg-destructive/15 text-destructive" : "bg-primary/10 text-primary",
          )}
        >
          <span className="[&>svg]:h-5 [&>svg]:w-5">{icon}</span>
        </div>
        <div>
          <p className="text-xl font-bold tabular-nums">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </div>
    </CardContent>
  )
  if (interactive) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={active}
        className="text-left"
      >
        <Card
          className={cn(
            "transition-shadow hover:shadow-md",
            active && "ring-2 ring-primary",
          )}
        >
          {inner}
        </Card>
      </button>
    )
  }
  return <Card>{inner}</Card>
}

function StatusBadge({ status }: { status: "upcoming" | "live" | "ended" | "cancelled" }) {
  if (status === "live") {
    return (
      <Badge className="gap-1.5 bg-destructive text-destructive-foreground">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
        Live
      </Badge>
    )
  }
  if (status === "upcoming") {
    return (
      <Badge variant="secondary" className="gap-1.5">
        <Clock className="h-3 w-3" />
        Upcoming
      </Badge>
    )
  }
  if (status === "cancelled") {
    return <Badge variant="outline">Cancelled</Badge>
  }
  return <Badge variant="outline">Ended</Badge>
}
