"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Plus,
  MoreHorizontal,
  Eye,
  Pencil,
  Trash2,
  Clock,
  Columns3,
  FileQuestion,
  List,
  Users,
  CheckCircle,
  Share2,
  Play,
  Zap,
  Award,
  MessageSquareText,
  Copy,
  FolderInput,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { SearchInput } from "@/components/ui/search-input"
import { fuzzySearch } from "@/lib/fuzzy-search"
import { Checkbox } from "@/components/ui/checkbox"
import { QuizShareDialog } from "@/components/quiz/quiz-share-dialog"
import {
  EmptyStateWithTemplates,
  type EmptyStateTemplate,
} from "@/components/dashboard/empty-state-templates"
import { BulkActionBar } from "@/components/dashboard/bulk-action-bar"
import { ProductTour, TakeATourButton, type TourStep } from "@/components/tour/product-tour"
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
import { useLMS, generateId, type Quiz, type QuizQuestion } from "@/lib/lms-store"
import { useConfirm } from "@/lib/use-confirm"
import { QuizTemplatePicker } from "@/components/quiz/quiz-template-picker"
import { QUIZ_TEMPLATES, type QuizTemplate } from "@/lib/quiz-templates"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Sparkles } from "lucide-react"
import { useUrlState } from "@/lib/use-url-state"
import { usePageShortcut } from "@/components/dashboard/shortcuts-provider"
import { stripRichTextTags } from "@/components/editor/rich-text-content"
import { toastUndoableDelete } from "@/lib/toast-undo"
import { toast } from "sonner"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  KanbanBoard,
  KanbanCard,
  type KanbanColumn,
} from "@/components/kanban/kanban-board"
import { useStickyView } from "@/lib/use-sticky-view"

// Seed quizzes for the empty state. Each template is a real Quiz with
// plausible starter questions so the teacher lands in a meaningful
// state — not a blank form. They tweak from there.
type QuizTemplateSeed = {
  title: string
  description: string
  gradingMode: Quiz["gradingMode"]
  passingScore: number
  timeLimit?: number
  questions: Omit<QuizQuestion, "id">[]
}

const QUIZ_TEMPLATE_SEEDS: Record<"pop" | "module" | "reflection", QuizTemplateSeed> = {
  pop: {
    title: "Pop quiz",
    description: "Quick 5-question check-in to confirm students caught the main ideas.",
    gradingMode: "auto",
    passingScore: 60,
    timeLimit: 10,
    questions: [
      {
        question: "What was the most important concept from today's class?",
        type: "short-answer",
        correctAnswer: "",
        points: 2,
      },
      {
        question: "True or false: The concept applies in real-world scenarios.",
        type: "true-false",
        options: ["True", "False"],
        correctAnswer: 0,
        points: 1,
      },
    ],
  },
  module: {
    title: "End-of-module assessment",
    description: "Graded 10-question test covering everything in the module.",
    gradingMode: "auto",
    passingScore: 70,
    timeLimit: 30,
    questions: [
      {
        question: "Sample multiple-choice — replace with your own.",
        type: "multiple-choice",
        options: ["Option A", "Option B", "Option C", "Option D"],
        correctAnswer: 0,
        points: 2,
      },
    ],
  },
  reflection: {
    title: "Reflection prompt",
    description: "Single open-ended question — teacher reviews each response.",
    gradingMode: "teacher",
    passingScore: 0,
    questions: [
      {
        question: "What's one thing you learned today and one thing you're still unsure about?",
        type: "long-answer",
        correctAnswer: "",
        points: 5,
      },
    ],
  },
}

// Product tour for the quizzes index. First step is a center
// modal welcoming the teacher; the rest anchor to the page's
// data-tour markers. Re-run any time via the "Take a tour" button
// in the header.
const QUIZZES_LIST_TOUR: TourStep[] = [
  {
    title: "All your quizzes in one place",
    body: "Every quiz across every course lives here. Filter by course, search by title, and bulk-act on selections.",
    emoji: "📝",
    placement: "center",
  },
  {
    target: "[data-tour='quizzes-stats']",
    title: "At-a-glance metrics",
    body: "Total quizzes, total attempts, average pass rate, average score. Updates live as students submit.",
    emoji: "📊",
    placement: "bottom",
  },
  {
    target: "[data-tour='quizzes-search']",
    title: "Find any quiz fast",
    body: "Type any part of a title — fuzzy match, typos welcome. Pair with the course filter to narrow further.",
    emoji: "🔍",
    placement: "bottom",
  },
  {
    target: "[data-tour='quizzes-create']",
    title: "Create a quiz",
    body: "Start from scratch, or pick a template from the empty state if you don't have any quizzes yet — Pop quiz, Module assessment, Reflection.",
    emoji: "✨",
    placement: "left",
  },
  {
    target: "[data-tour='quizzes-table']",
    title: "Pass rates & pending reviews",
    body: "Each row shows attempts, pass rate, average score. A red 'to review' chip means teacher-graded submissions are waiting. Use checkboxes for bulk delete, duplicate, or move-to-course.",
    emoji: "✅",
    placement: "top",
  },
]

function buildQuizFromTemplate(seed: QuizTemplateSeed, courseId: string): Quiz {
  return {
    id: generateId("quiz"),
    title: seed.title,
    description: seed.description,
    courseId,
    questions: seed.questions.map((q) => ({ ...q, id: generateId("q") })),
    timeLimit: seed.timeLimit,
    passingScore: seed.passingScore,
    maxAttempts: 3,
    shuffleQuestions: false,
    showAnswers: true,
    gradingMode: seed.gradingMode,
    createdAt: new Date().toISOString(),
  }
}

export default function QuizzesPage() {
  const router = useRouter()
  const { quizzes, quizAttempts, courses, getCourseById, getUserById, deleteQuiz, addQuiz, updateQuiz, currentUser } = useLMS()
  const confirm = useConfirm()
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false)

  // Materialise a Quiz from a QuizTemplate. Uses the first course as
  // the destination if the teacher didn't pre-pick one — the editor
  // re-asks immediately so the choice surfaces.
  const createFromQuizTemplate = (t: QuizTemplate) => {
    const defaultCourseId = courses[0]?.id
    if (!defaultCourseId) {
      toast.error("Create a course first so the quiz has a home.")
      router.push("/dashboard/courses/new")
      return
    }
    const quiz: Quiz = {
      id: generateId("quiz"),
      title: t.title,
      description: t.description,
      courseId: defaultCourseId,
      questions: t.questions.map((q) => ({ ...q, id: generateId("q") })),
      timeLimit: t.timeLimit,
      passingScore: t.passingScore,
      maxAttempts: 3,
      shuffleQuestions: false,
      showAnswers: true,
      gradingMode: t.gradingMode,
      createdAt: new Date().toISOString(),
      // Track ownership so the list card can render the creator's
      // avatar. Falls back to "unknown" if the auth session hasn't
      // hydrated yet — matches whiteboard behaviour.
      createdBy: currentUser?.id ?? "unknown",
    }
    addQuiz(quiz)
    setTemplatePickerOpen(false)
    toast.success(`Created "${quiz.title}" — edit the questions next.`)
    router.push(`/dashboard/quizzes/${quiz.id}`)
  }

  // Initials helper reused by the owner pill below the card title.
  const initialsOf = (name: string): string => {
    const tokens = name.trim().split(/\s+/).filter(Boolean)
    if (tokens.length === 0) return "??"
    if (tokens.length === 1) return tokens[0].slice(0, 2).toUpperCase()
    return (tokens[0][0] + tokens[tokens.length - 1][0]).toUpperCase()
  }
  // Filters synced to ?q= and ?course= so refresh + back button
  // preserve the view. Defaults are stripped from the URL — a clean
  // /dashboard/quizzes link means "everything, no filter".
  const [search, setSearch] = useUrlState<string>("q", { defaultValue: "" })
  const [courseFilter, setCourseFilter] = useUrlState<string>("course", {
    defaultValue: "all",
  })
  // Sticky list ↔ kanban toggle, scoped to this surface so the
  // teacher-quizzes preference doesn't bleed into the student-side
  // kanban scope.
  const [view, setView] = useStickyView("teacher.quizzes", "list")
  const [shareQuizId, setShareQuizId] = useState<string | null>(null)
  const shareQuiz = shareQuizId ? quizzes.find(q => q.id === shareQuizId) ?? null : null

  // "/" focus shortcut is owned by SearchInput. "n" still lives here.
  usePageShortcut({
    id: "quizzes:new",
    keys: "n",
    description: "New quiz",
    handler: () => router.push("/dashboard/quizzes/new"),
  })

  // Bulk selection. Tracks the *filtered* quizzes the user can see —
  // not all quizzes in the workspace — so "select all" never silently
  // grabs rows hidden behind a search filter. Stale ids (selected
  // before a delete happened) are pruned at use sites via filter.
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const toggleOne = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  const clearSelection = () => setSelected(new Set())

  const filteredQuizzes = useMemo(
    () =>
      fuzzySearch(
        quizzes.filter(
          (quiz) => courseFilter === "all" || quiz.courseId === courseFilter,
        ),
        search,
        (q) => q.title,
      ),
    [quizzes, search, courseFilter],
  )

  // Select-all checkbox state — fully on if every visible row is
  // selected, indeterminate when partial. Treated as "false" + indeterminate
  // because the underlying Checkbox component takes a boolean.
  const visibleIds = filteredQuizzes.map((q) => q.id)
  const allVisibleSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selected.has(id))
  const someVisibleSelected =
    !allVisibleSelected && visibleIds.some((id) => selected.has(id))
  const toggleAllVisible = () => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (allVisibleSelected) {
        for (const id of visibleIds) next.delete(id)
      } else {
        for (const id of visibleIds) next.add(id)
      }
      return next
    })
  }

  // ---- Bulk actions ----
  const selectedIds = () =>
    Array.from(selected).filter((id) => quizzes.some((q) => q.id === id))

  const bulkDelete = async () => {
    const ids = selectedIds()
    if (ids.length === 0) return
    const ok = await confirm({
      title: `Delete ${ids.length} quiz${ids.length === 1 ? "" : "zes"}?`,
      description:
        "Quiz attempts stay linked to each student's history, but the quiz itself disappears.",
      destructive: true,
      confirmLabel: "Delete",
    })
    if (!ok) return
    ids.forEach((id) => deleteQuiz(id))
    clearSelection()
    toastUndoableDelete({ kind: "quiz", ids, itemNoun: "quiz" })
  }

  const bulkDuplicate = () => {
    const ids = selectedIds()
    if (ids.length === 0) return
    let copies = 0
    for (const id of ids) {
      const original = quizzes.find((q) => q.id === id)
      if (!original) continue
      const copy: Quiz = {
        ...original,
        id: generateId("quiz"),
        title: `${original.title} (copy)`,
        // Re-id questions so a future edit on the copy doesn't mutate
        // the original via shared object refs.
        questions: original.questions.map((q) => ({ ...q, id: generateId("q") })),
        createdAt: new Date().toISOString(),
      }
      addQuiz(copy)
      copies++
    }
    clearSelection()
    toast.success(`Duplicated ${copies} quiz${copies === 1 ? "" : "zes"}.`)
  }

  const bulkMoveToCourse = (targetCourseId: string) => {
    const ids = selectedIds()
    if (ids.length === 0) return
    const targetCourse = courses.find((c) => c.id === targetCourseId)
    if (!targetCourse) return
    ids.forEach((id) =>
      updateQuiz(id, {
        courseId: targetCourseId,
        // Clear module/lesson — the new course almost certainly
        // doesn't have the same internal structure, so leaving stale
        // refs would orphan the quiz inside the course.
        moduleId: undefined,
        lessonId: undefined,
      }),
    )
    clearSelection()
    toast.success(
      `Moved ${ids.length} quiz${ids.length === 1 ? "" : "zes"} to "${targetCourse.title}".`,
    )
  }

  const getQuizStats = (quizId: string) => {
    const attempts = quizAttempts.filter(a => a.quizId === quizId)
    const totalAttempts = attempts.length
    const graded = attempts.filter(a => (a.status ?? "graded") === "graded")
    const pendingReview = attempts.filter(a => (a.status ?? "graded") === "pending-review").length
    const passedAttempts = graded.filter(a => a.passed).length
    const averageScore = graded.length > 0
      ? Math.round(graded.reduce((acc, a) => acc + a.score, 0) / graded.length)
      : 0
    return { totalAttempts, passedAttempts, averageScore, pendingReview, gradedCount: graded.length }
  }

  // Summary stats
  const totalQuizzes = quizzes.length
  const totalAttempts = quizAttempts.length
  const passRate = totalAttempts > 0
    ? Math.round((quizAttempts.filter(a => a.passed).length / totalAttempts) * 100)
    : 0
  const averageScore = totalAttempts > 0
    ? Math.round(quizAttempts.reduce((acc, a) => acc + a.score, 0) / totalAttempts)
    : 0

  return (
    <div className="space-y-6">
      <ProductTour tourId="quizzes-list-v1" steps={QUIZZES_LIST_TOUR} />
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Quizzes & Assessments</h1>
          <p className="text-muted-foreground">Create and manage course quizzes</p>
        </div>
        <div className="flex items-center gap-2">
          <TakeATourButton tourId="quizzes-list-v1" />
          {/* Single Create Quiz entrypoint — opens the template picker.
              The picker itself carries "Start blank instead" in its
              header for the from-scratch path, so this one button
              covers both flows like the whiteboard "+ New board". */}
          <Button onClick={() => setTemplatePickerOpen(true)} data-tour="quizzes-create" className="gap-2">
            <Plus className="h-4 w-4" />
            Create Quiz
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" data-tour="quizzes-stats">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <FileQuestion className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalQuizzes}</p>
                <p className="text-sm text-muted-foreground">Total Quizzes</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent/10">
                <Users className="h-6 w-6 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalAttempts}</p>
                <p className="text-sm text-muted-foreground">Total Attempts</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-success/10">
                <CheckCircle className="h-6 w-6 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">{passRate}%</p>
                <p className="text-sm text-muted-foreground">Pass Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
                <Clock className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{averageScore}%</p>
                <p className="text-sm text-muted-foreground">Avg Score</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div data-tour="quizzes-search" className="flex-1">
              <SearchInput
                pageId="quizzes"
                value={search}
                onChange={setSearch}
                placeholder="Search quizzes…"
                ariaLabel="Search quizzes"
                shortcutDescription="Focus quiz search"
              />
            </div>
            <Select value={courseFilter} onValueChange={setCourseFilter}>
              <SelectTrigger className="w-full sm:w-64">
                <SelectValue placeholder="Filter by course" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Courses</SelectItem>
                {courses.map((course) => (
                  <SelectItem key={course.id} value={course.id}>{course.title}</SelectItem>
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

      {/* Bulk action bar — only when at least one row is selected.
          Move-to-course needs its own picker so it's rendered as a
          dropdown next to the BulkActionBar instead of one of the
          flat actions. */}
      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <BulkActionBar
            selectedCount={selected.size}
            totalCount={filteredQuizzes.length}
            onClear={clearSelection}
            actions={[
              {
                key: "duplicate",
                label: "Duplicate",
                icon: <Copy className="h-3.5 w-3.5" />,
                onClick: bulkDuplicate,
              },
              {
                key: "delete",
                label: "Delete",
                icon: <Trash2 className="h-3.5 w-3.5" />,
                destructive: true,
                onClick: bulkDelete,
              },
            ]}
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" disabled={courses.length === 0}>
                <FolderInput className="mr-1.5 h-3.5 w-3.5" />
                Move to course
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="max-h-72 overflow-auto">
              {courses.length === 0 ? (
                <DropdownMenuItem disabled>No courses yet</DropdownMenuItem>
              ) : (
                courses.map((c) => (
                  <DropdownMenuItem
                    key={c.id}
                    onSelect={() => bulkMoveToCourse(c.id)}
                  >
                    {c.title}
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* Quizzes Table */}
      <Card data-tour="quizzes-table">
        <CardHeader>
          <CardTitle>All Quizzes</CardTitle>
          <CardDescription>{filteredQuizzes.length} quizzes found</CardDescription>
        </CardHeader>
        <CardContent>
          {quizzes.length === 0 ? (
            // True-empty: no quizzes at all in the workspace. We show a
            // featured trio of templates inline, then route the
            // "Browse all" button to the full picker (18 templates with
            // search + subject filters). Keeps the empty state quick to
            // scan while still exposing the full library.
            (() => {
              const featured = ["pop-quiz", "module-assessment", "reflection"]
                .map((k) => QUIZ_TEMPLATES.find((t) => t.key === k))
                .filter((t): t is QuizTemplate => Boolean(t))
              const accentByKey: Record<string, "amber" | "emerald" | "violet"> = {
                "pop-quiz": "amber",
                "module-assessment": "emerald",
                reflection: "violet",
              }
              const iconByKey: Record<string, React.ReactNode> = {
                "pop-quiz": <Zap className="h-4 w-4" />,
                "module-assessment": <Award className="h-4 w-4" />,
                reflection: <MessageSquareText className="h-4 w-4" />,
              }
              const templates: EmptyStateTemplate[] = featured.map((t) => ({
                key: t.key,
                title: t.title,
                preview: t.description,
                icon: iconByKey[t.key] ?? <Sparkles className="h-4 w-4" />,
                accent: accentByKey[t.key] ?? "primary",
                onSelect: () => createFromQuizTemplate(t),
              }))
              return (
                <EmptyStateWithTemplates
                  icon={<FileQuestion className="h-5 w-5" />}
                  title="No quizzes yet"
                  description={`Pick one of the popular starters, or browse all ${QUIZ_TEMPLATES.length} templates across K-12, engineering, management, and entrance prep.`}
                  templates={templates}
                  blankAction={{
                    label: `Browse all ${QUIZ_TEMPLATES.length} templates`,
                    onSelect: () => setTemplatePickerOpen(true),
                  }}
                />
              )
            })()
          ) : filteredQuizzes.length === 0 ? (
            // Filtered-to-empty: quizzes exist but search/course filter
            // hid them all. Don't push templates here — the teacher's
            // not trying to start over, they want to adjust the filter.
            <div className="py-10 text-center">
              <FileQuestion className="mx-auto h-10 w-10 text-muted-foreground" />
              <h3 className="mt-3 text-base font-semibold">No matches</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Try clearing the search or course filter.
              </p>
            </div>
          ) : view === "kanban" ? (
            <TeacherQuizzesKanban
              rows={filteredQuizzes}
              getCourseById={getCourseById}
              getQuizStats={getQuizStats}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8">
                    <Checkbox
                      aria-label="Select all visible quizzes"
                      checked={
                        allVisibleSelected
                          ? true
                          : someVisibleSelected
                            ? "indeterminate"
                            : false
                      }
                      onCheckedChange={toggleAllVisible}
                    />
                  </TableHead>
                  <TableHead className="w-[42%] min-w-[320px]">Quiz</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Questions</TableHead>
                  <TableHead>Attempts</TableHead>
                  <TableHead>Pass Rate</TableHead>
                  <TableHead>Avg Score</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredQuizzes.map((quiz) => {
                  const course = getCourseById(quiz.courseId)
                  const stats = getQuizStats(quiz.id)
                  const quizPassRate = stats.gradedCount > 0
                    ? Math.round((stats.passedAttempts / stats.gradedCount) * 100)
                    : 0
                  const mode = quiz.gradingMode ?? "auto"
                  const isChecked = selected.has(quiz.id)

                  return (
                    <TableRow
                      key={quiz.id}
                      data-state={isChecked ? "selected" : undefined}
                    >
                      <TableCell>
                        <Checkbox
                          aria-label={`Select ${quiz.title}`}
                          checked={isChecked}
                          onCheckedChange={() => toggleOne(quiz.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <Link
                              href={`/dashboard/quizzes/${quiz.id}`}
                              className="font-medium text-foreground hover:underline"
                            >
                              {quiz.title}
                            </Link>
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                                mode === "teacher"
                                  ? "bg-primary/10 text-primary"
                                  : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {mode === "teacher" ? "Instructor-graded" : "Auto-graded"}
                            </span>
                            {stats.pendingReview > 0 && (
                              <Link
                                href={`/dashboard/quizzes/${quiz.id}`}
                                className="inline-flex items-center rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-medium text-accent hover:bg-accent/25"
                              >
                                {stats.pendingReview} to review
                              </Link>
                            )}
                          </div>
                          {/* Description is authored in the rich-text
                              editor and stored as HTML. Render it as
                              plain text in the list (tags would leak
                              like "<p>te</p>" otherwise). */}
                          <p className="mt-0.5 text-sm text-muted-foreground line-clamp-1">{stripRichTextTags(quiz.description)}</p>
                          {/* Owner pill — avatar + name. Same shape as
                              the whiteboard list so attribution reads
                              the same across surfaces. */}
                          {(() => {
                            const owner = quiz.createdBy ? getUserById(quiz.createdBy) : undefined
                            const ownerName = owner?.name ?? "Unknown"
                            return (
                              <div className="mt-1 flex items-center gap-1.5">
                                <Avatar className="h-5 w-5">
                                  {owner?.avatar ? <AvatarImage src={owner.avatar} alt={ownerName} /> : null}
                                  <AvatarFallback className="text-[9px] font-semibold">
                                    {initialsOf(ownerName)}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-[11px] font-medium text-foreground/80" title={ownerName}>
                                  {ownerName}
                                </span>
                              </div>
                            )
                          })()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {course?.title || "Unknown Course"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{quiz.questions.length}</span>
                        <span className="text-muted-foreground"> questions</span>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{stats.totalAttempts}</span>
                      </TableCell>
                      <TableCell>
                        <span className={`font-medium ${quizPassRate >= 60 ? "text-success" : "text-destructive"}`}>
                          {quizPassRate}%
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{stats.averageScore}%</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShareQuizId(quiz.id)}
                            title="Share quiz link"
                          >
                            <Share2 className="h-4 w-4" />
                            <span className="sr-only">Share</span>
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <Link href={`/quiz/${quiz.id}`} target="_blank" rel="noreferrer">
                                  <Play className="mr-2 h-4 w-4" />
                                  Open / Try
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem onSelect={() => setShareQuizId(quiz.id)}>
                                <Share2 className="mr-2 h-4 w-4" />
                                Share
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link href={`/dashboard/quizzes/${quiz.id}`}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  View Results
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link href={`/dashboard/quizzes/${quiz.id}/edit`}>
                                  <Pencil className="mr-2 h-4 w-4" />
                                  Edit Quiz
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onSelect={async () => {
                                  const ok = await confirm({
                                    title: `Delete "${quiz.title}"?`,
                                    description: "Moved to Trash — you can restore it within 7 days. Existing attempts are kept in your records.",
                                    destructive: true,
                                  })
                                  if (!ok) return
                                  deleteQuiz(quiz.id)
                                  toastUndoableDelete({
                                    kind: "quiz",
                                    ids: quiz.id,
                                    label: quiz.title,
                                    itemNoun: "quiz",
                                  })
                                }}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
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

      {shareQuiz && (
        <QuizShareDialog
          quiz={shareQuiz}
          open={!!shareQuizId}
          onOpenChange={(open) => !open && setShareQuizId(null)}
        />
      )}

      {/* Quiz template picker — single entrypoint from the header
          "+ Create Quiz" button. The picker carries "Start blank
          instead" in its own header to cover the from-scratch path,
          so we route that here. */}
      <QuizTemplatePicker
        open={templatePickerOpen}
        onOpenChange={setTemplatePickerOpen}
        onPick={createFromQuizTemplate}
        onStartBlank={() => router.push("/dashboard/quizzes/new")}
      />
    </div>
  )
}

// Three-column board grouped by submission state. Columns line up
// with the "to review" chip the list view already shows, so a teacher
// toggling between views never sees a card jump unexpectedly.
function TeacherQuizzesKanban({
  rows,
  getCourseById,
  getQuizStats,
}: {
  rows: Quiz[]
  getCourseById: (id: string) => { title?: string } | undefined
  getQuizStats: (id: string) => {
    totalAttempts: number
    passedAttempts: number
    averageScore: number
    pendingReview: number
    gradedCount: number
  }
}) {
  type Row = { quiz: Quiz; stats: ReturnType<typeof getQuizStats>; state: "awaiting" | "review" | "graded" }
  const annotated: Row[] = rows.map((quiz) => {
    const stats = getQuizStats(quiz.id)
    const state: Row["state"] =
      stats.pendingReview > 0
        ? "review"
        : stats.totalAttempts > 0
          ? "graded"
          : "awaiting"
    return { quiz, stats, state }
  })
  const columns: Array<KanbanColumn<Row>> = [
    {
      key: "awaiting",
      label: "Awaiting submissions",
      tone: "slate",
      rows: annotated.filter((r) => r.state === "awaiting"),
    },
    {
      key: "review",
      label: "Needs review",
      tone: "amber",
      rows: annotated.filter((r) => r.state === "review"),
    },
    {
      key: "graded",
      label: "Graded",
      tone: "emerald",
      rows: annotated.filter((r) => r.state === "graded"),
    },
  ]
  return (
    <KanbanBoard
      columns={columns}
      keyOf={(r) => r.quiz.id}
      renderCard={(row) => {
        const course = getCourseById(row.quiz.courseId)
        const meta =
          row.stats.totalAttempts === 0 ? (
            <span>No attempts yet</span>
          ) : (
            <span>
              {row.stats.passedAttempts} passed / {row.stats.totalAttempts} attempts
              {row.stats.gradedCount > 0 ? ` · avg ${row.stats.averageScore}%` : ""}
            </span>
          )
        return (
          <KanbanCard
            href={`/dashboard/quizzes/${row.quiz.id}`}
            title={row.quiz.title}
            subtitle={course?.title ?? "—"}
            meta={meta}
          />
        )
      }}
    />
  )
}
