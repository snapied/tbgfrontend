"use client"

// "My assignments" — every assignment / project / test from an
// enrolled course, joined with my submission so the chip shows
// pending / submitted / graded / overdue. Click an item to open the
// existing tenant-scoped /assignment/<token> page where the student
// reads instructions + submits.

import { useMemo, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Circle,
  ClipboardList,
  Clock3,
  Columns3,
  List,
  Search,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  useLMS,
  type Assignment,
  type AssignmentSubmission,
} from "@/lib/lms-store"
import { useUrlState } from "@/lib/use-url-state"
import { fuzzySearch } from "@/lib/fuzzy-search"
import { ProductTour, TakeATourButton } from "@/components/tour/product-tour"
import {
  STUDENT_ASSIGNMENTS_TOUR,
  STUDENT_ASSIGNMENTS_TOUR_ID,
} from "@/components/student/tours"
import { KanbanBoard, KanbanCard, type KanbanColumn } from "@/components/kanban/kanban-board"
import { useStickyView } from "@/lib/use-sticky-view"

function tenantSlug(params: { tenant?: string | string[] }): string {
  const t = params.tenant
  return Array.isArray(t) ? t[0] ?? "" : t ?? ""
}

type MyAssignmentStatus = "todo" | "overdue" | "submitted" | "graded"

interface AssignmentRow {
  assignment: Assignment
  courseTitle: string
  submission?: AssignmentSubmission
  status: MyAssignmentStatus
}

function deriveStatus(
  assignment: Assignment,
  submission?: AssignmentSubmission,
): MyAssignmentStatus {
  if (submission) {
    return submission.status === "graded" ? "graded" : "submitted"
  }
  if (assignment.dueAt && new Date(assignment.dueAt).getTime() < Date.now()) {
    return "overdue"
  }
  return "todo"
}

const STATUS_META: Record<
  MyAssignmentStatus,
  {
    label: string
    Icon: typeof CheckCircle2
    variant: "default" | "secondary" | "outline" | "destructive"
  }
> = {
  todo: { label: "To do", Icon: Circle, variant: "outline" },
  overdue: { label: "Overdue", Icon: AlertTriangle, variant: "destructive" },
  submitted: { label: "Awaiting grade", Icon: Clock3, variant: "secondary" },
  graded: { label: "Graded", Icon: CheckCircle2, variant: "default" },
}

const KIND_LABEL: Record<Assignment["kind"], string> = {
  assignment: "Assignment",
  project: "Project",
  test: "Test",
}

function formatDue(dueAt?: string): string {
  if (!dueAt) return "No due date"
  const d = new Date(dueAt)
  const now = Date.now()
  const diffMs = d.getTime() - now
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))
  if (diffMs < 0) return `Due ${d.toLocaleDateString()} (overdue)`
  if (diffDays === 0) return "Due today"
  if (diffDays === 1) return "Due tomorrow"
  if (diffDays < 7) return `Due in ${diffDays} days`
  return `Due ${d.toLocaleDateString()}`
}

export default function MyAssignmentsPage() {
  const params = useParams<{ tenant: string }>()
  const slug = tenantSlug(params)
  const {
    currentUser,
    enrollments,
    assignments,
    submissions,
    getCourseById,
  } = useLMS()
  const [search, setSearch] = useUrlState<string>("q", { defaultValue: "" })
  const [tab, setTab] = useState<"all" | "todo" | "submitted" | "graded">("all")
  // View mode: List is the dense default; Kanban groups by status so a
  // student can read "what's owed / what's awaiting / what's done" at
  // a glance. Persisted in the URL via useUrlState so refresh keeps
  // the same view.
  const [view, setView] = useStickyView("student.assignments", "list")

  const enrolledCourseIds = useMemo(() => {
    if (!currentUser) return new Set<string>()
    return new Set(
      enrollments
        .filter((e) => e.studentId === currentUser.id)
        .map((e) => e.courseId),
    )
  }, [currentUser, enrollments])

  const rows: AssignmentRow[] = useMemo(() => {
    if (!currentUser) return []
    return assignments
      .filter((a) => enrolledCourseIds.has(a.courseId))
      .map((assignment) => {
        const submission = submissions.find(
          (s) =>
            s.assignmentId === assignment.id &&
            s.studentId === currentUser.id,
        )
        const course = getCourseById(assignment.courseId)
        return {
          assignment,
          courseTitle: course?.title ?? "—",
          submission,
          status: deriveStatus(assignment, submission),
        }
      })
      .sort((a, b) => {
        // Overdue first, then closest due dates, then no-due-date
        const orderA = a.status === "overdue" ? 0 : a.assignment.dueAt ? 1 : 2
        const orderB = b.status === "overdue" ? 0 : b.assignment.dueAt ? 1 : 2
        if (orderA !== orderB) return orderA - orderB
        if (a.assignment.dueAt && b.assignment.dueAt) {
          return a.assignment.dueAt.localeCompare(b.assignment.dueAt)
        }
        return b.assignment.createdAt.localeCompare(a.assignment.createdAt)
      })
  }, [
    currentUser,
    assignments,
    submissions,
    enrolledCourseIds,
    getCourseById,
  ])

  const counts = useMemo(
    () => ({
      all: rows.length,
      todo: rows.filter((r) => r.status === "todo" || r.status === "overdue")
        .length,
      submitted: rows.filter((r) => r.status === "submitted").length,
      graded: rows.filter((r) => r.status === "graded").length,
    }),
    [rows],
  )

  const filtered = useMemo(() => {
    const byTab = rows.filter((r) => {
      if (tab === "todo") return r.status === "todo" || r.status === "overdue"
      if (tab === "submitted") return r.status === "submitted"
      if (tab === "graded") return r.status === "graded"
      return true
    })
    return fuzzySearch(
      byTab,
      search,
      (r) => `${r.assignment.title} ${r.courseTitle}`,
    )
  }, [rows, tab, search])

  if (!currentUser) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          Sign in to see your assignments.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <ProductTour tourId={STUDENT_ASSIGNMENTS_TOUR_ID} steps={STUDENT_ASSIGNMENTS_TOUR} />
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold tracking-tight">Assignments</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {rows.length} total · {counts.todo} to do · {counts.submitted} awaiting grade · {counts.graded} graded
          </p>
        </div>
        <TakeATourButton tourId={STUDENT_ASSIGNMENTS_TOUR_ID} />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search assignments…"
            className="pl-9"
          />
        </div>
        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
          <TabsList>
            <TabsTrigger value="all">All ({counts.all})</TabsTrigger>
            <TabsTrigger value="todo">To do ({counts.todo})</TabsTrigger>
            <TabsTrigger value="submitted">Submitted ({counts.submitted})</TabsTrigger>
            <TabsTrigger value="graded">Graded ({counts.graded})</TabsTrigger>
          </TabsList>
        </Tabs>
        <Tabs value={view} onValueChange={(v) => setView(v as typeof view)}>
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

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <ClipboardList className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-3 font-medium">
              {rows.length === 0 ? "No assignments yet" : "Nothing in this view"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {rows.length === 0
                ? "Assignments will appear here as your teachers post them."
                : "Switch tabs or clear search to see more."}
            </p>
          </CardContent>
        </Card>
      ) : view === "kanban" ? (
        <StudentAssignmentsKanban rows={filtered} slug={slug} />
      ) : (
        <div className="space-y-3">
          {filtered.map((row) => (
            <AssignmentRowCard key={row.assignment.id} row={row} slug={slug} />
          ))}
        </div>
      )}
    </div>
  )
}

function AssignmentRowCard({
  row,
  slug,
}: {
  row: AssignmentRow
  slug: string
}) {
  const { assignment, submission, courseTitle, status } = row
  const meta = STATUS_META[status]
  const token = assignment.shareToken ?? assignment.id
  const href = `/p/${slug}/assignment/${token}`
  const ctaLabel =
    status === "todo" || status === "overdue"
      ? "Open & submit"
      : status === "submitted"
        ? "View submission"
        : "View grade"

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="font-normal">
              {KIND_LABEL[assignment.kind]}
            </Badge>
            <Badge variant={meta.variant}>
              <meta.Icon className="mr-1 h-3 w-3" />
              {meta.label}
            </Badge>
          </div>
          <p className="mt-1.5 line-clamp-2 font-serif text-base font-semibold">
            {assignment.title}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {courseTitle} · {formatDue(assignment.dueAt)}
            {status === "graded" && submission?.score !== undefined && (
              <>
                {" "}· <span className="font-medium text-foreground">
                  {submission.score}/{assignment.maxScore}
                </span>
              </>
            )}
          </p>
        </div>
        <Button asChild size="sm" variant={status === "todo" || status === "overdue" ? "default" : "outline"}>
          <Link href={href}>
            {ctaLabel}
            <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}

// Polished Kanban — three columns matched to the same status taxonomy
// the list view uses. Uses the shared <KanbanBoard /> so the chrome
// (column header, count chip, hover lift) stays consistent with the
// other surfaces (student doubts, teacher assignments).
function StudentAssignmentsKanban({
  rows,
  slug,
}: {
  rows: AssignmentRow[]
  slug: string
}) {
  const columns: Array<KanbanColumn<AssignmentRow>> = [
    {
      key: "todo",
      label: "To do",
      tone: "amber",
      rows: rows.filter((r) => r.status === "todo" || r.status === "overdue"),
    },
    {
      key: "submitted",
      label: "Awaiting grade",
      tone: "blue",
      rows: rows.filter((r) => r.status === "submitted"),
    },
    {
      key: "graded",
      label: "Graded",
      tone: "emerald",
      rows: rows.filter((r) => r.status === "graded"),
    },
  ]
  return (
    <KanbanBoard
      columns={columns}
      keyOf={(r) => r.assignment.id}
      renderCard={(row) => {
        const token = row.assignment.shareToken ?? row.assignment.id
        const isOverdue = row.status === "overdue"
        const score =
          row.status === "graded" && row.submission?.score !== undefined
            ? `${row.submission.score}/${row.assignment.maxScore}`
            : null
        return (
          <KanbanCard
            href={`/p/${slug}/assignment/${token}`}
            title={row.assignment.title}
            subtitle={`${row.courseTitle} · ${formatDue(row.assignment.dueAt)}`}
            meta={score ? <span className="font-semibold text-foreground">{score}</span> : undefined}
            badge={
              isOverdue ? (
                <Badge variant="destructive" className="shrink-0">
                  Overdue
                </Badge>
              ) : undefined
            }
          />
        )
      }}
    />
  )
}
