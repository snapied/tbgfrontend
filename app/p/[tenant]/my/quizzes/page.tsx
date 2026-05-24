"use client"

// "My quizzes" — every quiz from an enrolled course, joined with my
// best attempt so the chip shows whether I've passed, failed, am
// awaiting review, or haven't started. Tabs collapse the noise so a
// student with 30 quizzes can see the 3 still owed.

import { useMemo } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import {
  CheckCircle2,
  Circle,
  Clock3,
  Columns3,
  FileQuestion,
  List,
  RotateCcw,
  Search,
  XCircle,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useLMS, type Quiz, type QuizAttempt } from "@/lib/lms-store"
import { useUrlState } from "@/lib/use-url-state"
import { fuzzySearch } from "@/lib/fuzzy-search"
import { useState } from "react"
import { ProductTour, TakeATourButton } from "@/components/tour/product-tour"
import {
  STUDENT_QUIZZES_TOUR,
  STUDENT_QUIZZES_TOUR_ID,
} from "@/components/student/tours"
import {
  KanbanBoard,
  KanbanCard,
  type KanbanColumn,
} from "@/components/kanban/kanban-board"
import { useStickyView } from "@/lib/use-sticky-view"

function tenantSlug(params: { tenant?: string | string[] }): string {
  const t = params.tenant
  return Array.isArray(t) ? t[0] ?? "" : t ?? ""
}

type MyQuizStatus =
  | "not-started"
  | "pending-review"
  | "passed"
  | "failed"
  | "retry-available"

// One row per quiz. `bestAttempt` is the highest-scoring attempt; the
// status chip is derived from it (or "not-started" if I've never
// touched the quiz).
interface QuizRow {
  quiz: Quiz
  courseTitle: string
  attempts: QuizAttempt[]
  bestAttempt?: QuizAttempt
  status: MyQuizStatus
}

function deriveStatus(
  attempts: QuizAttempt[],
  best: QuizAttempt | undefined,
  maxAttempts: number,
): MyQuizStatus {
  if (!best) return "not-started"
  if ((best.status ?? "graded") === "pending-review") return "pending-review"
  if (best.passed) return "passed"
  // Failed best attempt. If they still have retries left, surface that
  // distinction so they know to come back to it.
  if (maxAttempts === 0 || attempts.length < maxAttempts) return "retry-available"
  return "failed"
}

const STATUS_META: Record<
  MyQuizStatus,
  {
    label: string
    Icon: typeof CheckCircle2
    variant: "default" | "secondary" | "outline" | "destructive"
    tone: string
  }
> = {
  "not-started": { label: "Not started", Icon: Circle, variant: "outline", tone: "text-muted-foreground" },
  "pending-review": { label: "Pending review", Icon: Clock3, variant: "secondary", tone: "text-amber-700 dark:text-amber-400" },
  passed: { label: "Passed", Icon: CheckCircle2, variant: "default", tone: "text-success" },
  failed: { label: "Failed", Icon: XCircle, variant: "destructive", tone: "text-destructive" },
  "retry-available": { label: "Retry available", Icon: RotateCcw, variant: "outline", tone: "text-foreground" },
}

export default function MyQuizzesPage() {
  const params = useParams<{ tenant: string }>()
  const slug = tenantSlug(params)
  const { currentUser, enrollments, quizzes, quizAttempts, getCourseById } = useLMS()
  const [search, setSearch] = useUrlState<string>("q", { defaultValue: "" })
  const [tab, setTab] = useState<"all" | "todo" | "done">("all")
  // Sticky list ↔ kanban toggle, scoped to this surface so the
  // student-quizzes preference doesn't bleed into the assignments or
  // doubts boards.
  const [view, setView] = useStickyView("student.quizzes", "list")

  const enrolledCourseIds = useMemo(() => {
    if (!currentUser) return new Set<string>()
    return new Set(
      enrollments
        .filter((e) => e.studentId === currentUser.id)
        .map((e) => e.courseId),
    )
  }, [currentUser, enrollments])

  const rows: QuizRow[] = useMemo(() => {
    if (!currentUser) return []
    return quizzes
      .filter((q) => enrolledCourseIds.has(q.courseId))
      .map((quiz) => {
        const attempts = quizAttempts.filter(
          (a) => a.quizId === quiz.id && a.studentId === currentUser.id,
        )
        const best = attempts
          .slice()
          .sort((a, b) => b.score - a.score)[0]
        const course = getCourseById(quiz.courseId)
        return {
          quiz,
          courseTitle: course?.title ?? "—",
          attempts,
          bestAttempt: best,
          status: deriveStatus(attempts, best, quiz.maxAttempts),
        }
      })
  }, [currentUser, quizzes, quizAttempts, enrolledCourseIds, getCourseById])

  const counts = useMemo(
    () => ({
      all: rows.length,
      todo: rows.filter(
        (r) => r.status === "not-started" || r.status === "retry-available",
      ).length,
      done: rows.filter(
        (r) => r.status === "passed" || r.status === "pending-review",
      ).length,
    }),
    [rows],
  )

  const filtered = useMemo(() => {
    const byTab = rows.filter((r) => {
      if (tab === "todo")
        return r.status === "not-started" || r.status === "retry-available"
      if (tab === "done")
        return r.status === "passed" || r.status === "pending-review"
      return true
    })
    return fuzzySearch(byTab, search, (r) => `${r.quiz.title} ${r.courseTitle}`)
  }, [rows, tab, search])

  if (!currentUser) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          Sign in to see your quizzes.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <ProductTour tourId={STUDENT_QUIZZES_TOUR_ID} steps={STUDENT_QUIZZES_TOUR} />
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold tracking-tight">Quizzes</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {rows.length} quiz{rows.length === 1 ? "" : "zes"} across your enrolled courses · {counts.todo} to do · {counts.done} done
          </p>
        </div>
        <TakeATourButton tourId={STUDENT_QUIZZES_TOUR_ID} />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search quizzes…"
            className="pl-9"
          />
        </div>
        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
          <TabsList>
            <TabsTrigger value="all">All ({counts.all})</TabsTrigger>
            <TabsTrigger value="todo">To do ({counts.todo})</TabsTrigger>
            <TabsTrigger value="done">Done ({counts.done})</TabsTrigger>
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

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileQuestion className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-3 font-medium">
              {rows.length === 0 ? "No quizzes yet" : "Nothing in this view"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {rows.length === 0
                ? "Quizzes will appear here as your teachers post them."
                : "Switch tabs or clear search to see more."}
            </p>
            {rows.length === 0 && (
              <Button asChild className="mt-4" size="sm" variant="outline">
                <Link href={`/p/${slug}/courses`}>Browse courses</Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : view === "kanban" ? (
        <StudentQuizzesKanban rows={filtered} slug={slug} />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>All quizzes</CardTitle>
            <CardDescription>
              {filtered.length} of {rows.length} shown
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y divide-border/60">
              {filtered.map((row) => (
                <QuizListRow key={row.quiz.id} row={row} slug={slug} />
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// Compact stacked-row design matching the teacher's quizzes list.
// Title + status chip + "Instructor-graded" hint on the headline; a
// one-line course / score / remaining-attempts strip below; and a
// small CTA on the right. Whole row is clickable when the primary
// action is "open the quiz".
function QuizListRow({ row, slug }: { row: QuizRow; slug: string }) {
  const meta = STATUS_META[row.status]
  const { quiz, bestAttempt, courseTitle, status, attempts } = row
  const remaining =
    quiz.maxAttempts === 0
      ? "Unlimited attempts"
      : `${Math.max(0, quiz.maxAttempts - attempts.length)} attempt${
          quiz.maxAttempts - attempts.length === 1 ? "" : "s"
        } left`

  const cta =
    status === "not-started"
      ? { label: "Start quiz", variant: "default" as const }
      : status === "passed"
        ? { label: "Review", variant: "outline" as const }
        : status === "pending-review"
          ? { label: "View submission", variant: "outline" as const }
          : { label: "Retry", variant: "default" as const }

  return (
    <li className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-muted/40">
      <Link href={`/p/${slug}/quiz/${quiz.id}`} className="min-w-0 flex-1 no-underline">
        <div className="flex flex-wrap items-center gap-2">
          <p className="line-clamp-1 font-medium text-foreground">{quiz.title}</p>
          <Badge variant="secondary" className="shrink-0 text-[10px] font-normal">
            {quiz.gradingMode === "teacher" ? "Instructor-graded" : "Auto-graded"}
          </Badge>
          <Badge variant={meta.variant} className="shrink-0">
            <meta.Icon className="mr-1 h-3 w-3" />
            {meta.label}
          </Badge>
        </div>
        <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
          {courseTitle} ·{" "}
          {bestAttempt
            ? `Best ${bestAttempt.score}% · pass ≥ ${quiz.passingScore}%`
            : `Pass ≥ ${quiz.passingScore}%`}
          {" · "}
          {remaining}
        </p>
      </Link>
      <Button asChild size="sm" variant={cta.variant} className="shrink-0">
        <Link href={`/p/${slug}/quiz/${quiz.id}`}>{cta.label}</Link>
      </Button>
    </li>
  )
}

// Kanban projection of the same filtered rows the list view uses, so
// toggling between views never reshuffles which quizzes are visible.
// Three columns mapped to the workflow taxonomy:
//   • To do: not yet started OR previously failed and retries remain
//   • Awaiting review: teacher-graded quiz with a submission pending
//   • Done: passed (success!) or failed-with-no-retries-left (game over)
function StudentQuizzesKanban({ rows, slug }: { rows: QuizRow[]; slug: string }) {
  const columns: Array<KanbanColumn<QuizRow>> = [
    {
      key: "todo",
      label: "To do",
      tone: "amber",
      rows: rows.filter(
        (r) => r.status === "not-started" || r.status === "retry-available",
      ),
    },
    {
      key: "review",
      label: "Awaiting review",
      tone: "blue",
      rows: rows.filter((r) => r.status === "pending-review"),
    },
    {
      key: "done",
      label: "Done",
      tone: "emerald",
      rows: rows.filter((r) => r.status === "passed" || r.status === "failed"),
    },
  ]
  return (
    <KanbanBoard
      columns={columns}
      keyOf={(r) => r.quiz.id}
      renderCard={(row) => {
        const meta = STATUS_META[row.status]
        const Icon = meta.Icon
        const score = row.bestAttempt
          ? `Best ${row.bestAttempt.score}% · pass ≥ ${row.quiz.passingScore}%`
          : `Pass ≥ ${row.quiz.passingScore}%`
        return (
          <KanbanCard
            href={`/p/${slug}/quiz/${row.quiz.id}`}
            title={row.quiz.title}
            subtitle={row.courseTitle}
            meta={<span>{score}</span>}
            badge={
              <Badge variant={meta.variant} className="shrink-0">
                <Icon className="mr-1 h-3 w-3" />
                {meta.label}
              </Badge>
            }
          />
        )
      }}
    />
  )
}
