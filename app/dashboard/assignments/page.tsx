"use client"

import { Suspense, useMemo, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import {
  Briefcase,
  ClipboardList,
  Eye,
  FileText,
  Filter,
  MoreHorizontal,
  Pencil,
  Plus,
  Share2,
  Trash2,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useConfirm } from "@/lib/use-confirm"
import { toastUndoableDelete } from "@/lib/toast-undo"
import { toast } from "sonner"
import { BulkActionBar, type BulkAction } from "@/components/dashboard/bulk-action-bar"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Columns3, List } from "lucide-react"
import { KanbanBoard, KanbanCard, type KanbanColumn } from "@/components/kanban/kanban-board"
import { useStickyView } from "@/lib/use-sticky-view"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
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
import { useLMS, type AssignmentKind } from "@/lib/lms-store"
import { fuzzySearch } from "@/lib/fuzzy-search"
import { SearchInput } from "@/components/ui/search-input"
import { ProductTour, TakeATourButton, type TourStep } from "@/components/tour/product-tour"

// Tour for the assignments index. Walks through the three kinds
// (assignment / project / test), the search + filters, and how
// to start a new one. AI affordances live inside the composer
// itself (separate Draft-with-AI button next to the description).
const ASSIGNMENTS_TOUR: TourStep[] = [
  {
    title: "Coursework hub",
    body: "Assignments, projects, and tests all live here. Students submit, you grade — the same workflow under all three names.",
    emoji: "📋",
    placement: "center",
  },
  {
    target: "[data-tour='assignments-search']",
    title: "Find anything fast",
    body: "Fuzzy search on title — typos welcome. Combine with the kind + course filters to narrow further.",
    emoji: "🔍",
    placement: "bottom",
  },
  {
    target: "[data-tour='assignments-kind']",
    title: "Three kinds, one flow",
    body: "Assignment = single deliverable. Project = multi-step, longer due date. Test = timed, often graded on a rubric. Pick when you create.",
    emoji: "🎛️",
    placement: "bottom",
  },
  {
    target: "[data-tour='assignments-new']",
    title: "Start a new one",
    body: "Title and instructions, then optional rubric, due date, and submission format. Click 'Draft with AI' next to instructions if you want a starting brief.",
    emoji: "✨",
    placement: "left",
  },
]

// Next.js 16's static prerender flags useSearchParams() unless it's
// wrapped in a Suspense boundary, even on a "use client" route. Tiny
// wrapper here keeps the boundary local and the rest of the page
// unchanged.
export default function AssignmentsPage() {
  return (
    <Suspense fallback={null}>
      <AssignmentsPageInner />
    </Suspense>
  )
}

// Assignment descriptions come from the WYSIWYG editor as HTML.  For the
// table preview we want plain text — strip tags + collapse whitespace.
// Server-rendered, no DOM; a small regex is enough since we're not parsing
// for security, just stripping decoration.
function stripHtmlToPreview(html: string | undefined, max = 140): string {
  if (!html) return ""
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max)
}

function AssignmentsPageInner() {
  const { assignments, courses, getSubmissionsForAssignment, enrollments, liveSessions, deleteAssignment } = useLMS()
  const confirm = useConfirm()
  // Persisted list ↔ kanban toggle. Caller-supplied scope key
  // ("teacher.assignments") so the choice doesn't bleed into the
  // student-side surface, and stays sticky across reloads + tabs.
  const [view, setView] = useStickyView("teacher.assignments", "list")
  // Bulk selection — same shape the quizzes table uses so the action
  // bar feels consistent.
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const clearSelection = () => setSelected(new Set())
  const toggleOne = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const bulkActions: BulkAction[] = [
    {
      key: "delete",
      label: `Delete ${selected.size}`,
      icon: <Trash2 className="h-4 w-4" />,
      destructive: true,
      onClick: async () => {
        const ids = Array.from(selected)
        if (ids.length === 0) return
        const ok = await confirm({
          title: `Delete ${ids.length} item${ids.length === 1 ? "" : "s"}?`,
          description:
            "Moved to Trash — you can restore them within 7 days. Submissions stay in your records.",
          destructive: true,
        })
        if (!ok) return
        // Capture labels for the toast before deletion clears the rows.
        const first = assignments.find((a) => a.id === ids[0])
        const label =
          ids.length === 1 && first ? first.title : `${ids.length} items`
        ids.forEach((id) => deleteAssignment(id))
        clearSelection()
        toastUndoableDelete({
          kind: "assignment",
          ids,
          label,
          itemNoun: "assignment",
        })
      },
    },
  ]
  const searchParams = useSearchParams()
  // Pre-select the course filter when navigated here from a course page
  // (e.g. /dashboard/assignments?course=<id>). Instructor lands already
  // scoped to the course they were just looking at.
  const initialCourse = searchParams?.get("course") ?? "all"
  const [search, setSearch] = useState("")
  const [kindFilter, setKindFilter] = useState<"all" | AssignmentKind>("all")
  const [courseFilter, setCourseFilter] = useState<string>(initialCourse)

  const items = useMemo(() => {
    const base = [...assignments]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .filter((a) => {
        if (kindFilter !== "all" && a.kind !== kindFilter) return false
        if (courseFilter !== "all" && a.courseId !== courseFilter) return false
        return true
      })
    return fuzzySearch(base, search, (a) => a.title)
  }, [assignments, search, kindFilter, courseFilter])

  return (
    <div className="space-y-6">
      <ProductTour tourId="assignments-v1" steps={ASSIGNMENTS_TOUR} />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Assignments, Projects &amp; Tests</h1>
          <p className="text-muted-foreground">Coursework that students submit and you grade.</p>
        </div>
        <div className="flex items-center gap-2">
          <TakeATourButton tourId="assignments-v1" />
          <Button asChild data-tour="assignments-new">
            <Link href="/dashboard/assignments/new">
              <Plus className="mr-2 h-4 w-4" />
              New
            </Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div data-tour="assignments-search" className="flex-1">
              <SearchInput
                pageId="assignments"
                value={search}
                onChange={setSearch}
                placeholder="Search assignments…"
                ariaLabel="Search assignments"
                shortcutDescription="Focus assignment search"
              />
            </div>
            <Select value={kindFilter} onValueChange={(v) => setKindFilter(v as "all" | AssignmentKind)}>
              <SelectTrigger className="w-full sm:w-40" data-tour="assignments-kind">
                <Filter className="mr-1.5 h-3.5 w-3.5" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="assignment">Assignments</SelectItem>
                <SelectItem value="project">Projects</SelectItem>
                <SelectItem value="test">Tests</SelectItem>
              </SelectContent>
            </Select>
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
        </CardContent>
      </Card>

      <BulkActionBar
        selectedCount={selected.size}
        totalCount={items.length}
        onClear={clearSelection}
        actions={bulkActions}
      />

      {view === "kanban" && items.length > 0 ? (
        <TeacherAssignmentsKanban
          rows={items}
          courses={courses}
          getSubmissionsForAssignment={getSubmissionsForAssignment}
          enrollments={enrollments}
        />
      ) : (
      <Card>
        <CardContent className="p-0">
          {items.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <ClipboardList className="mx-auto h-10 w-10 text-muted-foreground" />
              <h3 className="mt-3 font-semibold">No work yet</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Create your first assignment, project, or test.
              </p>
              <Button asChild className="mt-4">
                <Link href="/dashboard/assignments/new">
                  <Plus className="mr-2 h-4 w-4" /> New
                </Link>
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <input
                      type="checkbox"
                      aria-label="Select all"
                      checked={items.length > 0 && items.every((a) => selected.has(a.id))}
                      onChange={(e) => {
                        if (e.target.checked) setSelected(new Set(items.map((a) => a.id)))
                        else clearSelection()
                      }}
                    />
                  </TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead>Submissions</TableHead>
                  <TableHead className="text-right">Pending</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((a) => {
                  const course = courses.find((c) => c.id === a.courseId)
                  const subs = getSubmissionsForAssignment(a.id)
                  const enrolledCount = enrollments.filter((e) => e.courseId === a.courseId).length
                  const pending = subs.filter((s) => s.status !== "graded").length
                  return (
                    <TableRow key={a.id}>
                      <TableCell className="w-10">
                        <input
                          type="checkbox"
                          aria-label={`Select ${a.title}`}
                          checked={selected.has(a.id)}
                          onChange={() => toggleOne(a.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/dashboard/assignments/${a.id}`}
                          className="font-medium hover:underline"
                        >
                          {a.title}
                        </Link>
                        <p className="line-clamp-1 text-xs text-muted-foreground">
                          {stripHtmlToPreview(a.description)}
                        </p>
                        {a.sessionId && (() => {
                          const linkedSession = liveSessions.find((s) => s.id === a.sessionId)
                          if (!linkedSession) return null
                          return (
                            <Link
                              href={`/dashboard/classes/${linkedSession.id}`}
                              className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
                            >
                              From class · {linkedSession.title}
                            </Link>
                          )
                        })()}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">{course?.title ?? "—"}</span>
                      </TableCell>
                      <TableCell>
                        <KindBadge kind={a.kind} />
                      </TableCell>
                      <TableCell>
                        <span className="text-sm tabular-nums">
                          {a.dueAt ? new Date(a.dueAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{subs.length}</span>
                        <span className="text-muted-foreground">/{enrolledCount}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        {pending > 0 ? (
                          <Link
                            href={`/dashboard/assignments/${a.id}`}
                            className="inline-flex items-center rounded-full bg-accent/15 px-2 py-0.5 text-xs font-medium text-accent hover:bg-accent/25"
                          >
                            {pending} to grade
                          </Link>
                        ) : (
                          <span className="text-xs text-muted-foreground">All graded</span>
                        )}
                      </TableCell>
                      <TableCell className="w-10 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Actions</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/dashboard/assignments/${a.id}`}>
                                <Eye className="mr-2 h-4 w-4" />
                                View submissions
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link
                                href={`/assignment/${a.shareToken ?? a.id}`}
                                target="_blank"
                                rel="noreferrer"
                              >
                                <Share2 className="mr-2 h-4 w-4" />
                                Open share link
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onSelect={() => {
                                const url = `${window.location.origin}/assignment/${a.shareToken ?? a.id}`
                                void navigator.clipboard.writeText(url)
                                toast.success("Share link copied.")
                              }}
                            >
                              <Share2 className="mr-2 h-4 w-4" />
                              Copy share link
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href={`/dashboard/assignments/${a.id}/edit`}>
                                <Pencil className="mr-2 h-4 w-4" />
                                Edit
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onSelect={async () => {
                                const ok = await confirm({
                                  title: `Delete "${a.title}"?`,
                                  description:
                                    "Moved to Trash — you can restore it within 7 days. Submissions stay in your records.",
                                  destructive: true,
                                })
                                if (!ok) return
                                deleteAssignment(a.id)
                                toastUndoableDelete({
                                  kind: "assignment",
                                  ids: a.id,
                                  label: a.title,
                                  itemNoun: a.kind,
                                })
                              }}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      )}
    </div>
  )
}

// Three-column board grouped by submission state. Columns line up
// with the "Pending" chip already shown in the list view, so a
// teacher toggling between views never sees a card jump unexpectedly.
function TeacherAssignmentsKanban({
  rows,
  courses,
  getSubmissionsForAssignment,
  enrollments,
}: {
  rows: Array<{
    id: string
    title: string
    courseId: string
    kind: AssignmentKind
    dueAt?: string
    maxScore: number
    description?: string
  }>
  courses: Array<{ id: string; title: string }>
  getSubmissionsForAssignment: (id: string) => Array<{ status: string }>
  enrollments: Array<{ courseId: string }>
}) {
  type TeacherRow = (typeof rows)[number] & {
    pending: number
    submitted: number
    enrolled: number
    state: "active" | "review" | "done"
  }
  const annotated: TeacherRow[] = rows.map((a) => {
    const subs = getSubmissionsForAssignment(a.id)
    const enrolled = enrollments.filter((e) => e.courseId === a.courseId).length
    const pending = subs.filter((s) => s.status !== "graded").length
    const submitted = subs.length
    // State picker:
    //  • no submissions yet → "active" (still collecting)
    //  • any non-graded → "review" (needs the teacher)
    //  • all submissions graded (and we have at least one) → "done"
    const state: "active" | "review" | "done" =
      pending > 0 ? "review" : submitted > 0 ? "done" : "active"
    return { ...a, pending, submitted, enrolled, state }
  })
  const columns: Array<KanbanColumn<TeacherRow>> = [
    {
      key: "active",
      label: "Active",
      tone: "slate",
      rows: annotated.filter((r) => r.state === "active"),
    },
    {
      key: "review",
      label: "Needs grading",
      tone: "amber",
      rows: annotated.filter((r) => r.state === "review"),
    },
    {
      key: "done",
      label: "All graded",
      tone: "emerald",
      rows: annotated.filter((r) => r.state === "done"),
    },
  ]
  return (
    <KanbanBoard
      columns={columns}
      keyOf={(r) => r.id}
      renderCard={(row) => {
        const course = courses.find((c) => c.id === row.courseId)
        const due = row.dueAt
          ? new Date(row.dueAt).toLocaleString(undefined, {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })
          : "No due date"
        return (
          <KanbanCard
            href={`/dashboard/assignments/${row.id}`}
            title={row.title}
            subtitle={`${course?.title ?? "—"} · ${due}`}
            meta={
              <span>
                {row.submitted}/{row.enrolled} submitted
                {row.pending > 0 ? ` · ${row.pending} to grade` : ""}
              </span>
            }
            badge={
              <Badge variant="secondary" className="shrink-0 capitalize">
                {row.kind}
              </Badge>
            }
          />
        )
      }}
    />
  )
}

function KindBadge({ kind }: { kind: AssignmentKind }) {
  const icon = kind === "project" ? <Briefcase className="h-3 w-3" /> : kind === "test" ? <FileText className="h-3 w-3" /> : <ClipboardList className="h-3 w-3" />
  return (
    <Badge variant="secondary" className={cn("gap-1 capitalize")}>
      {icon}
      {kind}
    </Badge>
  )
}
