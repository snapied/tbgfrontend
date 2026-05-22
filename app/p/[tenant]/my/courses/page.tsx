"use client"

// "My courses" — every course the signed-in student is enrolled in,
// inside this tenant. Filter by in-progress / completed, fuzzy search
// by course title, click to jump into the lesson player.

import { useMemo, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { BookOpen, Columns3, List, PlayCircle, Search, Trophy } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useLMS, type Course, type Enrollment } from "@/lib/lms-store"
import { useUrlState } from "@/lib/use-url-state"
import { fuzzySearch } from "@/lib/fuzzy-search"
import { ProductTour, TakeATourButton } from "@/components/tour/product-tour"
import {
  STUDENT_COURSES_TOUR,
  STUDENT_COURSES_TOUR_ID,
} from "@/components/student/tours"
import { KanbanBoard, KanbanCard, type KanbanColumn } from "@/components/kanban/kanban-board"
import { useStickyView } from "@/lib/use-sticky-view"

function tenantSlug(params: { tenant?: string | string[] }): string {
  const t = params.tenant
  return Array.isArray(t) ? t[0] ?? "" : t ?? ""
}

export default function MyCoursesPage() {
  const params = useParams<{ tenant: string }>()
  const slug = tenantSlug(params)
  const { currentUser, enrollments, getCourseById } = useLMS()
  const [search, setSearch] = useUrlState<string>("q", { defaultValue: "" })
  const [tab, setTab] = useState<"all" | "in-progress" | "completed">("all")
  const [view, setView] = useStickyView("student.courses", "list")

  // Hydrate each enrollment with its course so we can sort / search /
  // filter in one pass.
  const rows = useMemo(() => {
    if (!currentUser) return []
    return enrollments
      .filter((e) => e.studentId === currentUser.id)
      .map((e) => ({ enrollment: e, course: getCourseById(e.courseId) }))
      .filter((row): row is { enrollment: typeof row.enrollment; course: NonNullable<typeof row.course> } => !!row.course)
      .sort((a, b) =>
        (b.enrollment.lastAccessedAt ?? b.enrollment.enrolledAt).localeCompare(
          a.enrollment.lastAccessedAt ?? a.enrollment.enrolledAt,
        ),
      )
  }, [currentUser, enrollments, getCourseById])

  const filteredByStatus = useMemo(() => {
    if (tab === "in-progress")
      return rows.filter((r) => r.enrollment.progress < 100)
    if (tab === "completed") return rows.filter((r) => r.enrollment.progress >= 100)
    return rows
  }, [rows, tab])

  const visible = useMemo(
    () => fuzzySearch(filteredByStatus, search, (r) => r.course.title),
    [filteredByStatus, search],
  )

  const counts = useMemo(
    () => ({
      all: rows.length,
      inProgress: rows.filter((r) => r.enrollment.progress < 100).length,
      completed: rows.filter((r) => r.enrollment.progress >= 100).length,
    }),
    [rows],
  )

  return (
    <div className="space-y-6">
      <ProductTour tourId={STUDENT_COURSES_TOUR_ID} steps={STUDENT_COURSES_TOUR} />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold tracking-tight">My courses</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {rows.length} enrolled · {counts.inProgress} in progress · {counts.completed} completed
          </p>
        </div>
        <div className="flex items-center gap-2">
          <TakeATourButton tourId={STUDENT_COURSES_TOUR_ID} />
          <Button asChild variant="outline" size="sm">
            <Link href={`/p/${slug}/courses`}>
              <BookOpen className="mr-1.5 h-3.5 w-3.5" />
              Browse catalog
            </Link>
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search my courses…"
            className="pl-9"
          />
        </div>
        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
          <TabsList>
            <TabsTrigger value="all">All ({counts.all})</TabsTrigger>
            <TabsTrigger value="in-progress">In progress ({counts.inProgress})</TabsTrigger>
            <TabsTrigger value="completed">Completed ({counts.completed})</TabsTrigger>
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

      {visible.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <BookOpen className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-3 font-medium">
              {rows.length === 0
                ? "You're not enrolled in any course yet"
                : "No courses match"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {rows.length === 0
                ? "Browse the catalog to enroll."
                : "Try clearing the filter or search."}
            </p>
            {rows.length === 0 && (
              <Button asChild className="mt-4">
                <Link href={`/p/${slug}/courses`}>Browse catalog</Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : view === "kanban" ? (
        <StudentCoursesKanban rows={visible} slug={slug} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map(({ enrollment, course }) => (
            <Card key={enrollment.id} className="overflow-hidden">
              {course.thumbnail ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={course.thumbnail}
                  alt=""
                  className="h-32 w-full object-cover"
                />
              ) : (
                <div className="flex h-32 w-full items-center justify-center bg-muted">
                  <BookOpen className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
              <CardContent className="space-y-3 p-4">
                <div>
                  <p className="line-clamp-2 font-serif text-base font-semibold">
                    {course.title}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Last opened{" "}
                    {new Date(enrollment.lastAccessedAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="space-y-1">
                  <Progress value={enrollment.progress} />
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>{enrollment.progress}% complete</span>
                    {enrollment.progress >= 100 && (
                      <span className="inline-flex items-center gap-1 font-semibold text-success">
                        <Trophy className="h-3 w-3" />
                        Completed
                      </span>
                    )}
                  </div>
                </div>
                <Button asChild size="sm" className="w-full">
                  <Link href={`/p/${slug}/learn/${course.slug}`}>
                    <PlayCircle className="mr-1.5 h-3.5 w-3.5" />
                    {enrollment.progress >= 100 ? "Review" : "Continue"}
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

// Three-column kanban over the same enrollments shown in the card grid.
// Buckets follow the existing status-tab taxonomy so the columns add up
// to the same totals: To start (0%) · In progress (1–99%) · Completed
// (≥100%). Same filter/search input feeds both views.
type CourseRow = { enrollment: Enrollment; course: Course }

function StudentCoursesKanban({ rows, slug }: { rows: CourseRow[]; slug: string }) {
  const toStart = rows.filter((r) => r.enrollment.progress === 0)
  const inProgress = rows.filter(
    (r) => r.enrollment.progress > 0 && r.enrollment.progress < 100,
  )
  const completed = rows.filter((r) => r.enrollment.progress >= 100)

  const columns: KanbanColumn<CourseRow>[] = [
    { key: "to-start", label: "To start", tone: "slate", rows: toStart },
    { key: "in-progress", label: "In progress", tone: "amber", rows: inProgress },
    { key: "completed", label: "Completed", tone: "emerald", rows: completed },
  ]

  return (
    <KanbanBoard
      columns={columns}
      keyOf={(r) => r.enrollment.id}
      emptyText="No courses in this stage."
      renderCard={(r) => (
        <KanbanCard
          href={`/p/${slug}/learn/${r.course.slug}`}
          title={r.course.title}
          subtitle={`Last opened ${new Date(r.enrollment.lastAccessedAt).toLocaleDateString()}`}
          badge={
            r.enrollment.progress >= 100 ? (
              <Badge variant="secondary" className="gap-1">
                <Trophy className="h-3 w-3" />
                Done
              </Badge>
            ) : r.enrollment.progress > 0 ? (
              <Badge variant="secondary">{r.enrollment.progress}%</Badge>
            ) : null
          }
          meta={
            <div className="space-y-1">
              <Progress value={r.enrollment.progress} className="h-1.5" />
              <span>{r.enrollment.progress}% complete</span>
            </div>
          }
        />
      )}
    />
  )
}
