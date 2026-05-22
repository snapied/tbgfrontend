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
import {
  Activity,
  Filter,
  Mail,
  MessageSquare,
  Search,
  UserCircle2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { useLMS } from "@/lib/lms-store"
import { useWall } from "@/lib/wall-store"
import {
  classifyStudents,
  STAGE_META,
  type EngagementRow,
  type LifecycleStage,
  type LifecycleStageMeta,
} from "@/lib/engagement-score"
import { computeLeaderboard } from "@/lib/leaderboard"
import { buildNotifications, type DispatchPayload } from "@/lib/notifications"

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

  // ── Filters ──
  const [search, setSearch] = useState("")
  const [stageFilter, setStageFilter] = useState<"all" | LifecycleStage>("all")
  const [courseFilter, setCourseFilter] = useState("all")
  const [selected, setSelected] = useState<Set<string>>(new Set())

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

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rows.filter((r) => {
      if (stageFilter !== "all" && r.stage !== stageFilter) return false
      if (!q) return true
      const hay = `${r.student.name} ${r.student.email}`.toLowerCase()
      return hay.includes(q)
    })
  }, [rows, stageFilter, search])

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

  // ── Bulk nudge ──
  // Fires a notification per selected student via the existing
  // multi-channel dispatcher. The recipient's per-channel
  // preferences are honoured automatically (no need to special-case
  // email opt-outs / WhatsApp opt-ins here).
  const fireBulkNudge = (kind: "checkin" | "comeback") => {
    const ids = [...selected]
    const recipients = students.filter((s) => ids.includes(s.id))
    if (recipients.length === 0) return
    const payload: DispatchPayload =
      kind === "checkin"
        ? {
            type: "engagement.check-in",
            title: "Quick check-in from your instructor",
            body: "Just making sure you have what you need — reply if you're stuck on anything.",
            url: "/p",
            meta: { kind: "engagement.check-in" },
          }
        : {
            type: "engagement.comeback",
            title: "We miss you in class",
            body: "Open the course any time — your progress is saved and you can pick up where you left off.",
            url: "/p",
            meta: { kind: "engagement.comeback" },
          }
    const entries = buildNotifications(recipients, payload)
    setTimeout(() => addNotifications(entries), 0)
    toast.success(
      `Sent ${kind === "checkin" ? "check-in" : "come-back"} to ${recipients.length} student${
        recipients.length === 1 ? "" : "s"
      }.`,
    )
    clearSelection()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Engagement</h1>
        <p className="text-muted-foreground">
          Every enrolled student, classified by lifecycle stage so you can spot who needs a nudge before they slip.
        </p>
      </div>

      {/* Stage counts strip — fast read on the cohort's health */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {(Object.keys(STAGE_META) as LifecycleStage[]).map((s) => {
          const meta = STAGE_META[s]
          return (
            <button
              key={s}
              type="button"
              onClick={() => setStageFilter(s)}
              className={cn(
                "rounded-lg border bg-card p-3 text-left transition-colors hover:border-primary/40",
                stageFilter === s && "border-primary ring-2 ring-primary/20",
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

      {/* Filters */}
      <Card>
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name or email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Tabs value={stageFilter} onValueChange={(v) => setStageFilter(v as typeof stageFilter)}>
            <TabsList>
              <TabsTrigger value="all">All ({counts.all})</TabsTrigger>
              <TabsTrigger value="at-risk">At risk ({counts["at-risk"]})</TabsTrigger>
              <TabsTrigger value="cooling">Cooling ({counts.cooling})</TabsTrigger>
              <TabsTrigger value="active">Active ({counts.active})</TabsTrigger>
            </TabsList>
          </Tabs>
          <Select value={courseFilter} onValueChange={setCourseFilter}>
            <SelectTrigger className="w-full sm:w-56">
              <SelectValue placeholder="Filter by course" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All courses</SelectItem>
              {courses.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Bulk-action bar — visible only when something's selected */}
      {selected.size > 0 && (
        <Card className="border-primary/40 bg-primary/5">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-3">
            <div className="flex items-center gap-2 text-sm">
              <Filter className="h-4 w-4 text-primary" />
              <span className="font-medium">{selected.size}</span>
              <span className="text-muted-foreground">selected</span>
              <Button variant="ghost" size="sm" onClick={clearSelection} className="ml-2 h-7 px-2 text-xs">
                Clear
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => fireBulkNudge("checkin")}>
                <Mail className="mr-1.5 h-3.5 w-3.5" />
                Send check-in
              </Button>
              <Button size="sm" onClick={() => fireBulkNudge("comeback")}>
                <MessageSquare className="mr-1.5 h-3.5 w-3.5" />
                Send come-back
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      <Card>
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
                <span className="w-12" />
              </li>
              {visible.map((row) => (
                <EngagementRowItem
                  key={row.student.id}
                  row={row}
                  selected={selected.has(row.student.id)}
                  onToggle={() => toggleOne(row.student.id)}
                />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function EngagementRowItem({
  row,
  selected,
  onToggle,
}: {
  row: EngagementRow
  selected: boolean
  onToggle: () => void
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
        <Badge variant="outline" className={cn("text-[10px]", stageBadgeClass(meta.tone))}>
          {meta.label}
        </Badge>
      </div>
      <div className="hidden w-32 text-right text-xs text-muted-foreground sm:block">
        {lastActiveLabel}
      </div>
      <div className="hidden w-20 text-right text-sm font-semibold tabular-nums sm:block">
        {row.points || "—"}
      </div>
      <div className="w-12 text-right">
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
