"use client"

// Instructor CRM strip — every enrolled student × lifecycle stage.
// Read-model over the existing LMS signals (attendance, attempts,
// submissions, doubts, days active, leaderboard points), no new
// persistence. Use cases:
//   • Spot at-risk and churned students fast.
//   • Bulk-nudge a stage worth of students with one click — fires
//     the existing in-app + email + WhatsApp pipeline.
//   • Drill into a single student via the existing /dashboard/students/<id>.

import { useMemo, useState } from "react"
import Link from "next/link"
import { ProductTour, TakeATourButton } from "@/components/tour/product-tour"
import { ENGAGEMENT_TOUR, ENGAGEMENT_TOUR_ID } from "@/components/dashboard/tours"
import {
  Activity,
  Filter,
  Mail,
  MessageSquare,
  UserCircle2,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { useLMS } from "@/lib/lms-store"
import { useTenant } from "@/lib/tenant-store"
import { useWall } from "@/lib/wall-store"
import {
  classifyStudents,
  explainStage,
  STAGE_META,
  type EngagementRow,
  type LifecycleStage,
  type LifecycleStageMeta,
} from "@/lib/engagement-score"
import { computeLeaderboard } from "@/lib/leaderboard"
import { buildNotifications, type DispatchPayload } from "@/lib/notifications"
import {
  partitionByCooldown,
  markNudged,
  relativeFromNow,
} from "@/lib/nudge-cooldown"
import { useConfirm } from "@/lib/use-confirm"
import { NudgePreviewDialog, type NudgeKind } from "@/components/dashboard/engagement-nudge-dialog"
import { fuzzySearch } from "@/lib/fuzzy-search"
import { SearchInput } from "@/components/ui/search-input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import { ListFilter, Sparkles, Send } from "lucide-react"

export default function EngagementPage() {
  const {
    students,
    enrollments,
    attendance,
    quizAttempts,
    quizzes,
    submissions,
    liveSessions,
    doubts,
    studentGroups,
    courses,
    addNotifications,
  } = useLMS()
  const { entries: wallEntries } = useWall()
  const confirm = useConfirm()
  const { currentTenant } = useTenant()
  // Deep-link nudges to the student's branded portal. Falls back to
  // the platform-default `/p` when we don't have a tenant slug — the
  // notification dispatcher resolves that on the receiving end.
  const studentHomeUrl = currentTenant?.slug ? `/p/${currentTenant.slug}/my` : "/p"

  // ── Filters ──
  // Deep filters — every signal we already classify per student is
  // pickable as a constraint so a teacher can answer the question
  // they actually came here with ("show me at-risk students in JEE
  // Mains who haven't submitted anything, are below 30% progress,
  // and have been silent for 14+ days"). Combinations live in
  // component state; the visible roster is the AND of every active
  // constraint. The chip strip + "Reset" button below the filter
  // card let the teacher see and dismiss each one without hunting
  // through dropdowns.
  const [search, setSearch] = useState("")
  const [stageFilter, setStageFilter] = useState<"all" | LifecycleStage>("all")
  const [courseFilter, setCourseFilter] = useState("all")
  const [recencyFilter, setRecencyFilter] = useState<
    "all" | "today" | "week" | "two-weeks" | "month" | "older" | "never"
  >("all")
  const [progressRange, setProgressRange] = useState<[number, number]>([0, 100])
  const [minPoints, setMinPoints] = useState<number>(0)
  const [hasSubmittedFilter, setHasSubmittedFilter] = useState<"all" | "yes" | "no">("all")
  const [hasAttendedFilter, setHasAttendedFilter] = useState<"all" | "yes" | "no">("all")
  const [hasAskedDoubtFilter, setHasAskedDoubtFilter] = useState<"all" | "yes" | "no">("all")
  const [profileFilter, setProfileFilter] = useState<"all" | "complete" | "incomplete">("all")
  const [sortBy, setSortBy] = useState<
    "urgency" | "name" | "lastActiveAsc" | "lastActiveDesc" | "progressDesc" | "progressAsc" | "pointsDesc"
  >("urgency")
  const [selected, setSelected] = useState<Set<string>>(new Set())

  // Nudge preview dialog state. The two buttons that used to fire a
  // notification immediately now open this dialog so the teacher
  // sees subject + body + channels before anything goes out.
  const [nudgeOpen, setNudgeOpen] = useState(false)
  const [nudgeKind, setNudgeKind] = useState<NudgeKind>("checkin")

  // Leaderboard powers the "champion" promotion — same engine used
  // by the student-facing board, so a champion here is identical to
  // a champion on /my/leaderboard.
  const leaderboard = useMemo(
    () =>
      computeLeaderboard({
        students,
        enrollments,
        attendance,
        attempts: quizAttempts,
        quizzes,
        submissions,
        sessions: liveSessions,
        studentGroups,
        doubts,
        wallEntries,
      }),
    [
      students,
      enrollments,
      attendance,
      quizAttempts,
      quizzes,
      submissions,
      liveSessions,
      studentGroups,
      doubts,
      wallEntries,
    ],
  )
  const pointsByStudent = useMemo(() => {
    const m = new Map<string, number>()
    for (const e of leaderboard) m.set(e.student.id, e.total)
    return m
  }, [leaderboard])

  // ── Course scope filter ──
  // When a course is picked, narrow the inputs to that course's
  // signals so the lifecycle stage reflects the student's behaviour
  // INSIDE that course, not across the whole workspace.
  const scopedEnrollments = useMemo(
    () =>
      courseFilter === "all"
        ? enrollments
        : enrollments.filter((e) => e.courseId === courseFilter),
    [enrollments, courseFilter],
  )
  const scopedStudentIds = useMemo(
    () => new Set(scopedEnrollments.map((e) => e.studentId)),
    [scopedEnrollments],
  )
  const scopedStudents = useMemo(
    () =>
      courseFilter === "all"
        ? students
        : students.filter((u) => scopedStudentIds.has(u.id)),
    [students, scopedStudentIds, courseFilter],
  )

  const rows = useMemo(
    () =>
      classifyStudents({
        students: scopedStudents,
        enrollments: scopedEnrollments,
        attendance,
        attempts: quizAttempts,
        submissions,
        doubts,
        pointsByStudent,
      }),
    [
      scopedStudents,
      scopedEnrollments,
      attendance,
      quizAttempts,
      submissions,
      doubts,
      pointsByStudent,
    ],
  )

  const counts = useMemo(() => {
    const c: Record<"all" | LifecycleStage, number> = {
      all: rows.length,
      champion: 0,
      active: 0,
      onboarding: 0,
      cooling: 0,
      "at-risk": 0,
      churned: 0,
    }
    for (const r of rows) c[r.stage]++
    return c
  }, [rows])

  // ── Per-student fact lookups ──
  // Pre-bucket the heavy signals so the filter pipeline below stays
  // O(rows) instead of nesting full-list filters inside it.
  const studentFacts = useMemo(() => {
    const submittersByStudent = new Set(submissions.map((s) => s.studentId))
    const attendersByStudent = new Set(attendance.map((a) => a.studentId))
    const askersByStudent = new Set(doubts.map((d) => d.studentId))
    const progressByStudent = new Map<string, number>()
    // Average progress across the student's enrollments — picks up
    // both completion and how-much-watched in one number.
    const enrollmentsByStudent = new Map<string, number[]>()
    for (const e of enrollments) {
      const arr = enrollmentsByStudent.get(e.studentId) ?? []
      arr.push(e.progress)
      enrollmentsByStudent.set(e.studentId, arr)
    }
    for (const [sid, ps] of enrollmentsByStudent) {
      progressByStudent.set(
        sid,
        ps.length === 0 ? 0 : Math.round(ps.reduce((a, b) => a + b, 0) / ps.length),
      )
    }
    return {
      submittersByStudent,
      attendersByStudent,
      askersByStudent,
      progressByStudent,
    }
  }, [enrollments, attendance, submissions, doubts])

  const visible = useMemo(() => {
    const q = search.trim()
    // Apply structural filters first so the (potentially expensive)
    // fuzzy ranking only runs on the narrowed set.
    let pool = rows.filter((r) => {
      if (stageFilter !== "all" && r.stage !== stageFilter) return false
      // Activity recency bucket
      if (recencyFilter !== "all") {
        const d = r.daysSinceLastActive
        const inBucket =
          recencyFilter === "today" ? d === 0 :
            recencyFilter === "week" ? d !== null && d >= 1 && d <= 7 :
              recencyFilter === "two-weeks" ? d !== null && d >= 8 && d <= 14 :
                recencyFilter === "month" ? d !== null && d >= 15 && d <= 30 :
                  recencyFilter === "older" ? d !== null && d > 30 :
                    recencyFilter === "never" ? d === null :
                      true
        if (!inBucket) return false
      }
      // Progress slider — interpret 0..100 as inclusive.
      const progress = studentFacts.progressByStudent.get(r.student.id) ?? 0
      if (progress < progressRange[0] || progress > progressRange[1]) return false
      // Minimum XP threshold
      if (r.points < minPoints) return false
      // Boolean activity filters
      if (hasSubmittedFilter !== "all") {
        const has = studentFacts.submittersByStudent.has(r.student.id)
        if (hasSubmittedFilter === "yes" && !has) return false
        if (hasSubmittedFilter === "no" && has) return false
      }
      if (hasAttendedFilter !== "all") {
        const has = studentFacts.attendersByStudent.has(r.student.id)
        if (hasAttendedFilter === "yes" && !has) return false
        if (hasAttendedFilter === "no" && has) return false
      }
      if (hasAskedDoubtFilter !== "all") {
        const has = studentFacts.askersByStudent.has(r.student.id)
        if (hasAskedDoubtFilter === "yes" && !has) return false
        if (hasAskedDoubtFilter === "no" && has) return false
      }
      if (profileFilter !== "all") {
        const complete = !!(r.student.avatar?.trim() && r.student.phone?.trim())
        if (profileFilter === "complete" && !complete) return false
        if (profileFilter === "incomplete" && complete) return false
      }
      return true
    })
    // Fuzzy search — name + email + course titles the student is in.
    if (q) {
      pool = fuzzySearch(pool, q, (r) => [
        r.student.name,
        r.student.email,
        r.student.phone ?? "",
      ])
    }
    // Sort — fuzzy search already provides a relevance order, but
    // only when there's a search query. With an empty query, apply
    // the user's chosen sort.
    if (!q && sortBy !== "urgency") {
      const arr = [...pool]
      const progressOf = (id: string) => studentFacts.progressByStudent.get(id) ?? 0
      switch (sortBy) {
        case "name":
          arr.sort((a, b) => a.student.name.localeCompare(b.student.name)); break
        case "lastActiveAsc":
          arr.sort((a, b) => (a.daysSinceLastActive ?? Number.MAX_SAFE_INTEGER) - (b.daysSinceLastActive ?? Number.MAX_SAFE_INTEGER)); break
        case "lastActiveDesc":
          arr.sort((a, b) => (b.daysSinceLastActive ?? -1) - (a.daysSinceLastActive ?? -1)); break
        case "progressDesc":
          arr.sort((a, b) => progressOf(b.student.id) - progressOf(a.student.id)); break
        case "progressAsc":
          arr.sort((a, b) => progressOf(a.student.id) - progressOf(b.student.id)); break
        case "pointsDesc":
          arr.sort((a, b) => b.points - a.points); break
      }
      return arr
    }
    return pool
  }, [
    rows,
    stageFilter,
    search,
    recencyFilter,
    progressRange,
    minPoints,
    hasSubmittedFilter,
    hasAttendedFilter,
    hasAskedDoubtFilter,
    profileFilter,
    sortBy,
    studentFacts,
  ])

  // Quick reset for the active-filters strip.
  const activeFilterCount =
    (stageFilter !== "all" ? 1 : 0) +
    (recencyFilter !== "all" ? 1 : 0) +
    ((progressRange[0] !== 0 || progressRange[1] !== 100) ? 1 : 0) +
    (minPoints > 0 ? 1 : 0) +
    (hasSubmittedFilter !== "all" ? 1 : 0) +
    (hasAttendedFilter !== "all" ? 1 : 0) +
    (hasAskedDoubtFilter !== "all" ? 1 : 0) +
    (profileFilter !== "all" ? 1 : 0) +
    (courseFilter !== "all" ? 1 : 0)

  const resetAllFilters = () => {
    setSearch("")
    setStageFilter("all")
    setCourseFilter("all")
    setRecencyFilter("all")
    setProgressRange([0, 100])
    setMinPoints(0)
    setHasSubmittedFilter("all")
    setHasAttendedFilter("all")
    setHasAskedDoubtFilter("all")
    setProfileFilter("all")
  }

  const allVisibleSelected =
    visible.length > 0 && visible.every((r) => selected.has(r.student.id))
  const someVisibleSelected =
    !allVisibleSelected && visible.some((r) => selected.has(r.student.id))

  const toggleOne = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  const toggleAllVisible = () =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (allVisibleSelected) {
        for (const r of visible) next.delete(r.student.id)
      } else {
        for (const r of visible) next.add(r.student.id)
      }
      return next
    })
  const clearSelection = () => setSelected(new Set())

  // Open the nudge preview dialog. The actual send now lives behind
  // the preview so teachers see subject + body + channels before
  // anything goes out. If no individual rows are selected we
  // default to the currently-visible (filtered) students — so the
  // persistent buttons at the bottom of the page act as
  // "everyone matching my filters" without forcing the teacher to
  // tick every row.
  // Per-row nudges. When the teacher hits a row's quick-nudge button
  // we want to send to *just that student*, ignoring whatever the
  // selection / visible set is. We track that target separately so
  // the dialog + fireNudgeConfirmed can pick the right recipients.
  // null means "fall back to selection or visible cohort" (bulk mode).
  const [oneOffRecipientId, setOneOffRecipientId] = useState<string | null>(null)
  const openNudge = (kind: NudgeKind, oneOffStudentId?: string) => {
    setNudgeKind(kind)
    setOneOffRecipientId(oneOffStudentId ?? null)
    setNudgeOpen(true)
  }

  // Confirmed-send handler — called by the dialog once the teacher
  // clicks "Send to N". Builds the multi-channel notification batch
  // honouring the channel toggles from the dialog.
  //
  // Cooldown gate: any recipient who got the same kind of nudge in
  // the last 48h surfaces here. We never silently drop them — we
  // surface a confirm dialog so the teacher decides whether to
  // skip-recents, override, or cancel. That's the difference between
  // a guard rail and an annoyance.
  const fireNudgeConfirmed = async (
    payload: {
      type: string
      title: string
      body: string
      url: string
      channels: { inApp: boolean; email: boolean; whatsApp: boolean }
    },
  ) => {
    // Recipients precedence:
    //   1. oneOffRecipientId — set by a per-row quick-nudge button.
    //      Ignores selection + visible cohort, sends to just that
    //      student. Most common case after the per-row buttons landed.
    //   2. selection (the bulk action bar's "Send to N").
    //   3. visible (filtered) cohort — bulk send to everyone matching
    //      the active filters even when no rows are ticked.
    let recipients
    if (oneOffRecipientId) {
      recipients = students.filter((s) => s.id === oneOffRecipientId)
    } else if (selected.size > 0) {
      const ids = [...selected]
      recipients = students.filter((s) => ids.includes(s.id))
    } else {
      const visibleIds = new Set(visible.map((r) => r.student.id))
      recipients = students.filter((s) => visibleIds.has(s.id))
    }
    if (recipients.length === 0) {
      setNudgeOpen(false)
      return
    }
    // Cooldown check. Mapped to the dialog's `type` field, which
    // mirrors the NudgeKind ("checkin" / "comeback").
    const kind = payload.type as "checkin" | "comeback"
    const { fresh, recent } = partitionByCooldown(
      kind,
      recipients.map((r) => r.id),
    )
    let finalRecipientIds = recipients.map((r) => r.id)
    if (recent.length > 0) {
      const labelForKind = kind === "checkin" ? "check-in" : "come-back"
      // One-off (single student) variant: short, direct prompt.
      if (recent.length === 1 && recipients.length === 1) {
        const stamp = relativeFromNow(recent[0].lastNudgedAt)
        const ok = await confirm({
          title: `Send another ${labelForKind}?`,
          description: `You already sent ${recipients[0].name} a ${labelForKind} ${stamp}. Sending again now risks looking like spam.`,
          confirmLabel: "Send anyway",
          cancelLabel: "Don't send",
        })
        if (!ok) {
          setNudgeOpen(false)
          return
        }
      } else {
        // Bulk variant: offer skip-recents OR send-anyway.
        const ok = await confirm({
          title: `${recent.length} ${recent.length === 1 ? "student was" : "students were"} nudged recently`,
          description: `${recent.length} of your ${recipients.length} recipients got a ${labelForKind} in the last 48 hours. Pick one: send only to the ${fresh.length} who haven't been nudged, or override and send to all ${recipients.length}.`,
          confirmLabel: `Send to ${fresh.length} fresh only`,
          cancelLabel: `Send to all ${recipients.length}`,
        })
        // Confirm = skip recents; Cancel = override and send all.
        // We bind cancel to "override" deliberately so the safe default
        // (skip) is the primary positive action.
        finalRecipientIds = ok ? fresh : recipients.map((r) => r.id)
        if (ok && fresh.length === 0) {
          toast.message("Nothing sent — everyone is on cooldown.", {
            description: "Try again in a day or two, or hit 'send to all' next time to override.",
          })
          setNudgeOpen(false)
          return
        }
      }
    }
    const finalRecipients = recipients.filter((r) => finalRecipientIds.includes(r.id))
    const dispatch: DispatchPayload = {
      type: payload.type,
      title: payload.title,
      body: payload.body,
      url: payload.url,
      meta: { kind: payload.type },
    }
    const channels: ("in-app" | "email" | "whatsapp")[] = []
    if (payload.channels.inApp) channels.push("in-app")
    if (payload.channels.email) channels.push("email")
    if (payload.channels.whatsApp) channels.push("whatsapp")
    const entries = buildNotifications(finalRecipients, dispatch, { channels })
    addNotifications(entries)
    markNudged(kind, finalRecipientIds)
    toast.success(
      `Sent to ${finalRecipients.length} student${finalRecipients.length === 1 ? "" : "s"}.`,
      { description: `Via ${channels.join(" · ") || "no channels"}` },
    )
    setNudgeOpen(false)
    // Only clear the bulk selection when we actually used it. A per-
    // row one-off shouldn't side-effect the teacher's checkbox set.
    if (!oneOffRecipientId) clearSelection()
    setOneOffRecipientId(null)
  }

  return (
    <div className="space-y-6">
      <ProductTour tourId={ENGAGEMENT_TOUR_ID} steps={ENGAGEMENT_TOUR} />
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Engagement</h1>
          <p className="text-muted-foreground">
            Every enrolled student, classified by lifecycle stage so you can spot who needs a nudge before they slip.
          </p>
        </div>
        <TakeATourButton tourId={ENGAGEMENT_TOUR_ID} />
      </div>

      {/* Stage counts strip — fast read on the cohort's health.
          Clicking the active stage toggles it off so a second click
          returns to the "all" view (rather than getting stuck). */}
      <div
        className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6"
        role="group"
        aria-label="Filter by lifecycle stage"
      >
        {(Object.keys(STAGE_META) as LifecycleStage[]).map((s) => {
          const meta = STAGE_META[s]
          const active = stageFilter === s
          return (
            <button
              key={s}
              type="button"
              onClick={() => setStageFilter(active ? "all" : s)}
              aria-pressed={active}
              title={meta.hint}
              className={cn(
                "rounded-lg border bg-card p-3 text-left transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                active && "border-primary ring-2 ring-primary/20",
              )}
            >
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {meta.label}
              </p>
              <p className="mt-1 text-xl font-bold tabular-nums">{counts[s]}</p>
            </button>
          )
        })}
      </div>

      {/* Filters — fuzzy search across name / email / phone, plus a
          stack of stackable filters underneath that answer the
          questions a teacher actually has at decision time. Every
          active filter becomes a dismissible chip in the strip
          below so they're never lost in a dropdown. */}
      <Card className="py-0 gap-0">
        <CardContent className="flex flex-col gap-3 p-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <SearchInput
              pageId="engagement"
              value={search}
              onChange={setSearch}
              placeholder="Search by name, email, or phone — typos OK"
              ariaLabel="Search engagement roster"
              shortcutDescription="Focus engagement search"
              className="flex-1"
            />
            <Select value={courseFilter} onValueChange={setCourseFilter}>
              <SelectTrigger className="w-full sm:w-40" aria-label="Filter by course">
                <SelectValue placeholder="Filter by course" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All courses</SelectItem>
                {courses.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={recencyFilter} onValueChange={(v) => setRecencyFilter(v as typeof recencyFilter)}>
              <SelectTrigger className="w-full sm:w-44" aria-label="Filter by activity recency">
                <SelectValue placeholder="Last active" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any time</SelectItem>
                <SelectItem value="today">Active today</SelectItem>
                <SelectItem value="week">1–7 days ago</SelectItem>
                <SelectItem value="two-weeks">8–14 days ago</SelectItem>
                <SelectItem value="month">15–30 days ago</SelectItem>
                <SelectItem value="older">30+ days ago</SelectItem>
                <SelectItem value="never">Never active</SelectItem>
              </SelectContent>
            </Select>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full sm:w-auto">
                  <ListFilter className="mr-2 h-4 w-4" />
                  More filters
                  {activeFilterCount > 2 && (
                    <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                      {activeFilterCount - (stageFilter !== "all" ? 1 : 0) - 2}
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              {/* The More filters popover used to overflow off the
                  bottom of small viewports — Slider + 4 Selects + a
                  Reset row doesn't fit in 320px any more. We cap the
                  height to 80vh and let the body scroll independently
                  of the header / footer, so the "Reset all filters"
                  button stays reachable without having to scroll the
                  whole page behind the popover. */}
              <PopoverContent
                align="end"
                className="flex max-h-[80vh] w-[min(28rem,calc(100vw-2rem))] flex-col gap-0 overflow-hidden p-0 sm:w-[28rem]"
              >
                <div className="border-b border-border px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Behavioural filters
                  </p>
                </div>
                <div className="flex-1 space-y-4 overflow-y-auto px-4 py-3">
                  <div className="space-y-2">
                    <Label className="text-xs">Overall progress</Label>
                    <Slider
                      min={0}
                      max={100}
                      step={5}
                      value={progressRange}
                      onValueChange={(v) => setProgressRange([v[0] ?? 0, v[1] ?? 100])}
                    />
                    <p className="text-[11px] text-muted-foreground tabular-nums">
                      {progressRange[0]}% – {progressRange[1]}% across enrolments
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Minimum XP</Label>
                    <Slider
                      min={0}
                      max={500}
                      step={25}
                      value={[minPoints]}
                      onValueChange={(v) => setMinPoints(v[0] ?? 0)}
                    />
                    <p className="text-[11px] text-muted-foreground tabular-nums">
                      {minPoints === 0 ? "Any XP" : `≥ ${minPoints} pts`}
                    </p>
                  </div>
                  {/* Four short-answer behavioural filters — two
                    columns so the popover stays compact and the
                    decision feels like one parallel choice ("who
                    did what"), not a long vertical interrogation. */}
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="grid gap-2">
                      <Label className="text-xs">Has submitted an assignment</Label>
                      <Select value={hasSubmittedFilter} onValueChange={(v) => setHasSubmittedFilter(v as typeof hasSubmittedFilter)}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Doesn&apos;t matter</SelectItem>
                          <SelectItem value="yes">Yes — at least one</SelectItem>
                          <SelectItem value="no">No — zero submissions</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label className="text-xs">Has attended a live class</Label>
                      <Select value={hasAttendedFilter} onValueChange={(v) => setHasAttendedFilter(v as typeof hasAttendedFilter)}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Doesn&apos;t matter</SelectItem>
                          <SelectItem value="yes">Yes — joined at least one</SelectItem>
                          <SelectItem value="no">No — never joined</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label className="text-xs">Has asked a doubt</Label>
                      <Select value={hasAskedDoubtFilter} onValueChange={(v) => setHasAskedDoubtFilter(v as typeof hasAskedDoubtFilter)}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Doesn&apos;t matter</SelectItem>
                          <SelectItem value="yes">Yes — at least one question</SelectItem>
                          <SelectItem value="no">No — never asked</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label className="text-xs">Profile completeness</Label>
                      <Select value={profileFilter} onValueChange={(v) => setProfileFilter(v as typeof profileFilter)}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Doesn&apos;t matter</SelectItem>
                          <SelectItem value="complete">Complete (avatar + phone)</SelectItem>
                          <SelectItem value="incomplete">Incomplete</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                <div className="border-t border-border px-4 py-2">
                  <Button variant="ghost" size="sm" onClick={resetAllFilters} className="w-full">
                    Reset all filters
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
              <SelectTrigger className="w-full sm:w-40" aria-label="Sort">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="urgency">Most urgent first</SelectItem>
                <SelectItem value="lastActiveDesc">Silent longest</SelectItem>
                <SelectItem value="lastActiveAsc">Active most recently</SelectItem>
                <SelectItem value="progressAsc">Lowest progress</SelectItem>
                <SelectItem value="progressDesc">Highest progress</SelectItem>
                <SelectItem value="pointsDesc">Highest XP</SelectItem>
                <SelectItem value="name">Name A–Z</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Active filter chips */}
          {(activeFilterCount > 0 || search.trim()) && (
            <div className="flex flex-wrap items-center gap-1.5 border-t border-border pt-2 text-[11px]">
              <span className="text-muted-foreground">Filtering:</span>
              {search.trim() && (
                <FilterChip label={`"${search.trim()}"`} onClear={() => setSearch("")} />
              )}
              {stageFilter !== "all" && (
                <FilterChip label={`Stage: ${STAGE_META[stageFilter].label}`} onClear={() => setStageFilter("all")} />
              )}
              {courseFilter !== "all" && (
                <FilterChip
                  label={`Course: ${courses.find((c) => c.id === courseFilter)?.title ?? "—"}`}
                  onClear={() => setCourseFilter("all")}
                />
              )}
              {recencyFilter !== "all" && (
                <FilterChip label={`Last active: ${RECENCY_LABEL[recencyFilter]}`} onClear={() => setRecencyFilter("all")} />
              )}
              {(progressRange[0] !== 0 || progressRange[1] !== 100) && (
                <FilterChip
                  label={`Progress ${progressRange[0]}–${progressRange[1]}%`}
                  onClear={() => setProgressRange([0, 100])}
                />
              )}
              {minPoints > 0 && (
                <FilterChip label={`≥ ${minPoints} XP`} onClear={() => setMinPoints(0)} />
              )}
              {hasSubmittedFilter !== "all" && (
                <FilterChip
                  label={hasSubmittedFilter === "yes" ? "Submitted ≥ 1 assignment" : "No submissions"}
                  onClear={() => setHasSubmittedFilter("all")}
                />
              )}
              {hasAttendedFilter !== "all" && (
                <FilterChip
                  label={hasAttendedFilter === "yes" ? "Attended ≥ 1 class" : "Never attended"}
                  onClear={() => setHasAttendedFilter("all")}
                />
              )}
              {hasAskedDoubtFilter !== "all" && (
                <FilterChip
                  label={hasAskedDoubtFilter === "yes" ? "Asked ≥ 1 doubt" : "No doubts asked"}
                  onClear={() => setHasAskedDoubtFilter("all")}
                />
              )}
              {profileFilter !== "all" && (
                <FilterChip
                  label={profileFilter === "complete" ? "Profile complete" : "Profile incomplete"}
                  onClear={() => setProfileFilter("all")}
                />
              )}
              <button
                type="button"
                onClick={resetAllFilters}
                className="ml-auto text-muted-foreground hover:text-foreground hover:underline"
              >
                Reset all
              </button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bulk-action bar — visible only when something's selected.
          `py-0 gap-0` on the Card strips the default Card padding so
          the bar hugs its border on top and bottom; px-3 py-2 on the
          inner content keeps a sensible horizontal/vertical breathing
          room without the larger Card padding the rest of the page
          uses. */}
      {selected.size > 0 && (
        <Card className="border-primary/40 bg-primary/5 py-0 gap-0">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 px-3 py-2">
            <div className="flex items-center gap-2 text-sm">
              <Filter className="h-4 w-4 text-primary" />
              <span className="font-medium">{selected.size}</span>
              <span className="text-muted-foreground">selected</span>
              <Button variant="ghost" size="sm" onClick={clearSelection} className="ml-2 h-7 px-2 text-xs">
                Clear
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => openNudge("checkin")} title="Preview and send a warm check-in to the selected students">
                <Mail className="mr-1.5 h-3.5 w-3.5" />
                Send check-in
              </Button>
              <Button size="sm" onClick={() => openNudge("comeback")} title="Preview and send a come-back nudge to the selected students">
                <MessageSquare className="mr-1.5 h-3.5 w-3.5" />
                Send come-back
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Table — flush card. `py-0 gap-0` strips the default top
          and inner spacing so the column header row touches the top
          border and the last row touches the bottom border. */}
      <Card className="py-0 gap-0">
        <CardContent className="p-0">
          {visible.length === 0 ? (
            <div className="py-12 text-center">
              <Activity className="mx-auto h-10 w-10 text-muted-foreground" />
              <p className="mt-3 font-medium">
                {rows.length === 0 ? "No enrolled students yet" : "Nothing in this view"}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {rows.length === 0
                  ? "When students enroll, they'll appear here with a lifecycle stage."
                  : "Try a different stage tab or clear the search."}
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              <li className="flex items-center gap-3 border-b border-border bg-muted/30 px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <Checkbox
                  aria-label="Select all visible"
                  checked={
                    allVisibleSelected
                      ? true
                      : someVisibleSelected
                        ? "indeterminate"
                        : false
                  }
                  onCheckedChange={toggleAllVisible}
                />
                <span className="flex-1">Student</span>
                <span className="hidden w-28 text-center sm:block">Stage</span>
                <span className="hidden w-32 text-right sm:block">Last active</span>
                <span className="hidden w-20 text-right sm:block">XP</span>
                  <span className="w-[7.5rem] text-right">Actions</span>
              </li>
              {visible.map((row) => (
                <EngagementRowItem
                  key={row.student.id}
                  row={row}
                  selected={selected.has(row.student.id)}
                  onToggle={() => toggleOne(row.student.id)}
                  onNudge={(kind, studentId) => openNudge(kind, studentId)}
                />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Preview-and-send nudge dialog. Opens from the per-row nudge
          buttons or the bulk action bar; closes
          itself on Cancel or after a successful send. Recipients are
          the user's selection if any; otherwise the currently-visible
          (filtered) cohort. */}
      <NudgePreviewDialog
        open={nudgeOpen}
        onOpenChange={(v) => {
          setNudgeOpen(v)
          // Reset the per-row target when the dialog closes so the
          // next dialog open doesn't inherit a stale single-recipient.
          if (!v) setOneOffRecipientId(null)
        }}
        kind={nudgeKind}
        recipients={
          oneOffRecipientId
            ? students.filter((s) => s.id === oneOffRecipientId)
            : selected.size > 0
              ? students.filter((s) => selected.has(s.id))
              : students.filter((s) => visible.some((v) => v.student.id === s.id))
        }
        destinationUrl={studentHomeUrl}
        fromName={currentTenant?.name}
        onSend={(p) =>
          fireNudgeConfirmed({
            type: p.type,
            title: p.title,
            body: p.body,
            url: p.url,
            channels: p.channels,
          })
        }
      />
    </div>
  )
}

const RECENCY_LABEL: Record<
  "today" | "week" | "two-weeks" | "month" | "older" | "never",
  string
> = {
  today: "Today",
  week: "1–7 days",
  "two-weeks": "8–14 days",
  month: "15–30 days",
  older: "30+ days",
  never: "Never",
}

function FilterChip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2 py-0.5 text-[11px] font-medium">
      <span className="max-w-[200px] truncate">{label}</span>
      <button
        type="button"
        onClick={onClear}
        className="rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
        aria-label={`Remove filter: ${label}`}
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  )
}

function EngagementRowItem({
  row,
  selected,
  onToggle,
  onNudge,
}: {
  row: EngagementRow
  selected: boolean
  onToggle: () => void
    onNudge: (kind: NudgeKind, studentId: string) => void
}) {
  const meta = STAGE_META[row.stage]
  const days = row.daysSinceLastActive
  const lastActiveLabel =
    days === null
      ? "Never"
      : days === 0
        ? "Today"
        : days === 1
          ? "Yesterday"
          : `${days}d ago`
  return (
    <li
      data-state={selected ? "selected" : undefined}
      className={cn(
        "flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/40",
        selected && "bg-primary/5",
      )}
    >
      <Checkbox
        aria-label={`Select ${row.student.name}`}
        checked={selected}
        onCheckedChange={onToggle}
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{row.student.name}</p>
        <p className="line-clamp-1 text-xs text-muted-foreground">
          {row.student.email}
        </p>
      </div>
      <div className="hidden w-28 text-center sm:block">
        <StageChipExplainer row={row} />
      </div>
      <div className="hidden w-32 text-right text-xs text-muted-foreground sm:block">
        {lastActiveLabel}
      </div>
      <div className="hidden w-20 text-right text-sm font-semibold tabular-nums sm:block">
        {row.points || "—"}
      </div>
      {/* Per-row quick nudges. Two icon-only buttons keep the row
          compact — tooltips spell out what each does. They send to
          THIS student only, regardless of any bulk selection. */}
      <div className="flex items-center gap-0.5">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-muted-foreground hover:text-primary"
          onClick={() => onNudge("checkin", row.student.id)}
          title={`Send a check-in to ${row.student.name}`}
          aria-label={`Send check-in to ${row.student.name}`}
        >
          <Mail className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-muted-foreground hover:text-primary"
          onClick={() => onNudge("comeback", row.student.id)}
          title={`Send a come-back nudge to ${row.student.name}`}
          aria-label={`Send come-back nudge to ${row.student.name}`}
        >
          <MessageSquare className="h-4 w-4" />
        </Button>
        <Button asChild variant="ghost" size="sm" className="h-8 px-2">
          <Link href={`/dashboard/students/${row.student.id}`} title="Open student profile">
            <UserCircle2 className="h-4 w-4" />
          </Link>
        </Button>
      </div>
      {/* Mobile-only stage chip — desktop columns render above. */}
      <div className="sm:hidden">
        <Badge variant="outline" className={cn("text-[10px]", stageBadgeClass(meta.tone))}>
          {meta.label}
        </Badge>
      </div>
    </li>
  )
}

// Tailwind class fragments per tone. Inline here (vs. central
// constants) so the engagement page doesn't pull in an unrelated
// theme file just for six chip variants.
// Stage chip that opens a popover explaining why this student
// lands in this stage. Tap surfaces 2–4 signal-level reasons + a
// stage-specific suggestion. Closes on outside-click via the
// shadcn Popover primitive.
function StageChipExplainer({ row }: { row: EngagementRow }) {
  const meta = STAGE_META[row.stage]
  const explanation = useMemo(() => explainStage(row), [row])
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium transition-colors hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
            stageBadgeClass(meta.tone),
          )}
          title="Why this stage?"
        >
          {meta.label}
        </button>
      </PopoverTrigger>
      <PopoverContent align="center" className="w-72 p-0">
        <div className="border-b border-border p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Why this stage?
          </p>
          <p className="mt-0.5 text-sm font-semibold">{meta.label}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {meta.hint}
          </p>
        </div>
        <ul className="space-y-1.5 px-3 py-3 text-xs">
          {explanation.reasons.map((r, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="mt-1.5 inline-block h-1 w-1 shrink-0 rounded-full bg-muted-foreground/60" />
              <span>{r}</span>
            </li>
          ))}
        </ul>
        <div className="border-t border-border bg-muted/30 p-3 text-[11px]">
          <span className="font-semibold text-foreground">Suggested next step</span>
          <p className="mt-0.5 text-muted-foreground">{explanation.suggestion}</p>
        </div>
      </PopoverContent>
    </Popover>
  )
}

function stageBadgeClass(tone: LifecycleStageMeta["tone"]): string {
  switch (tone) {
    case "emerald":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
    case "blue":
      return "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300"
    case "slate":
      return "border-slate-500/30 bg-slate-500/10 text-slate-700 dark:text-slate-300"
    case "amber":
      return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
    case "rose":
      return "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300"
    case "destructive":
      return "border-destructive/40 bg-destructive/10 text-destructive"
  }
}
