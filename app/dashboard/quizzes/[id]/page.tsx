"use client"

import { use, useMemo, useState } from "react"
import Link from "next/link"
import { BackButton } from "@/components/ui/back-button"
import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Clock,
  FileQuestion,
  Pencil,
  Send,
  Share2,
  Sparkles,
  UserCheck,
  Users,
  XCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DashboardBreadcrumbs } from "@/components/dashboard/dashboard-breadcrumbs"
import { cn } from "@/lib/utils"
import {
  useLMS,
  type Quiz,
  type QuizAttempt,
  type QuizQuestion,
  type QuizQuestionGrade,
} from "@/lib/lms-store"
import { QuizShareDialog } from "@/components/quiz/quiz-share-dialog"

type StatusFilter = "all" | "pending-review" | "graded"

const formatClock = (totalSeconds: number) => {
  const s = Math.max(0, Math.floor(totalSeconds))
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${m.toString().padStart(2, "0")}:${r.toString().padStart(2, "0")}`
}

const autoCorrect = (q: QuizQuestion, answer: string | number | undefined): boolean => {
  if (answer === undefined || answer === "") return false
  if (q.type === "short-answer") {
    return String(answer).trim().toLowerCase() === String(q.correctAnswer).trim().toLowerCase()
  }
  return Number(answer) === Number(q.correctAnswer)
}

export default function QuizDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { quizzes, quizAttempts, getUserById, getCourseById } = useLMS()
  const quiz = quizzes.find((q) => q.id === id)

  const [status, setStatus] = useState<StatusFilter>("all")
  const [selectedAttemptId, setSelectedAttemptId] = useState<string | null>(null)
  const [shareOpen, setShareOpen] = useState(false)

  const allAttempts = useMemo(
    () =>
      quizAttempts
        .filter((a) => a.quizId === id)
        .sort((a, b) =>
          (b.completedAt ?? b.startedAt).localeCompare(a.completedAt ?? a.startedAt),
        ),
    [quizAttempts, id],
  )
  const pendingCount = allAttempts.filter(
    (a) => (a.status ?? "graded") === "pending-review",
  ).length
  const gradedAttempts = allAttempts.filter((a) => (a.status ?? "graded") === "graded")
  const avgScore =
    gradedAttempts.length > 0
      ? Math.round(
          gradedAttempts.reduce((acc, a) => acc + a.score, 0) / gradedAttempts.length,
        )
      : 0
  const passRate =
    gradedAttempts.length > 0
      ? Math.round(
          (gradedAttempts.filter((a) => a.passed).length / gradedAttempts.length) * 100,
        )
      : 0

  const filteredAttempts =
    status === "all"
      ? allAttempts
      : allAttempts.filter((a) => (a.status ?? "graded") === status)

  const selectedAttempt =
    allAttempts.find((a) => a.id === selectedAttemptId) ??
    (pendingCount > 0
      ? allAttempts.find((a) => (a.status ?? "graded") === "pending-review")
      : allAttempts[0])

  if (!quiz) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <FileQuestion className="mx-auto h-10 w-10 text-muted-foreground" />
          <h2 className="mt-3 text-lg font-semibold">Quiz not found</h2>
          <BackButton label="Back" fallbackHref="/dashboard/quizzes" className="mt-4" />
        </div>
      </div>
    )
  }

  const course = getCourseById(quiz.courseId)

  return (
    <div className="space-y-6">
      <DashboardBreadcrumbs
        crumbs={[
          { label: "Quizzes", href: "/dashboard/quizzes" },
          ...(course
            ? [{ label: course.title, href: `/dashboard/courses/${course.id}` }]
            : []),
          { label: quiz.title },
        ]}
      />
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/quizzes">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-bold tracking-tight">{quiz.title}</h1>
            <p className="truncate text-sm text-muted-foreground">
              {course?.title ?? "Standalone quiz"} ·{" "}
              <span className="inline-flex items-center gap-1">
                {quiz.gradingMode === "auto" ? (
                  <>
                    <Sparkles className="h-3 w-3" /> Auto-graded
                  </>
                ) : (
                  <>
                      <UserCheck className="h-3 w-3" /> Instructor-graded
                  </>
                )}
              </span>
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShareOpen(true)}>
            <Share2 className="mr-2 h-4 w-4" />
            Share
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/dashboard/quizzes/${quiz.id}/edit`}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={<Users />} label="Total attempts" value={`${allAttempts.length}`} />
        <StatCard
          icon={<UserCheck />}
          label="Pending review"
          value={`${pendingCount}`}
          highlight={pendingCount > 0}
        />
        <StatCard icon={<CheckCircle2 />} label="Pass rate" value={`${passRate}%`} />
        <StatCard icon={<Clock />} label="Avg score" value={`${avgScore}%`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
        {/* Attempts list */}
        <Card className="h-fit lg:sticky lg:top-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Submissions</CardTitle>
            <CardDescription>
              {allAttempts.length === 0
                ? "No one has taken this quiz yet."
                : `${allAttempts.length} total · ${pendingCount} awaiting review`}
            </CardDescription>
            <Tabs
              value={status}
              onValueChange={(v) => setStatus(v as StatusFilter)}
              className="pt-2"
            >
              <TabsList className="w-full">
                <TabsTrigger value="all" className="flex-1">All</TabsTrigger>
                <TabsTrigger value="pending-review" className="flex-1">
                  Pending {pendingCount > 0 && (
                    <Badge variant="default" className="ml-1.5 h-4 px-1 text-[10px]">
                      {pendingCount}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="graded" className="flex-1">Graded</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent className="space-y-1.5 px-2 pb-3">
            {filteredAttempts.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                Nothing here yet.
              </p>
            ) : (
              filteredAttempts.map((attempt) => {
                const student = getUserById(attempt.studentId)
                const isSelected = selectedAttempt?.id === attempt.id
                const isPending = (attempt.status ?? "graded") === "pending-review"
                return (
                  <div
                    key={attempt.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedAttemptId(attempt.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault()
                        setSelectedAttemptId(attempt.id)
                      }
                    }}
                    className={cn(
                      "flex w-full cursor-pointer items-center justify-between gap-2 rounded-md border px-3 py-2 text-left text-sm transition-colors",
                      isSelected
                        ? "border-primary bg-primary/5"
                        : "border-transparent hover:border-border hover:bg-muted/40",
                    )}
                  >
                    <div className="min-w-0">
                      {student ? (
                        <Link
                          href={`/dashboard/students/${student.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="block truncate font-medium hover:text-primary hover:underline"
                        >
                          {student.name}
                        </Link>
                      ) : (
                        <p className="truncate font-medium">{attempt.studentId}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {new Date(attempt.completedAt ?? attempt.startedAt).toLocaleString()}
                      </p>
                    </div>
                    {isPending ? (
                      <Badge variant="secondary" className="shrink-0">
                        Pending
                      </Badge>
                    ) : (
                      <div className="shrink-0 text-right">
                        <p
                          className={cn(
                            "text-sm font-semibold tabular-nums",
                            attempt.passed ? "text-success" : "text-destructive",
                          )}
                        >
                          {attempt.score}%
                        </p>
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                          {attempt.passed ? "Pass" : "Fail"}
                        </p>
                      </div>
                    )}
                    <ChevronRight className="hidden h-4 w-4 text-muted-foreground sm:block" />
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>

        {/* Detail */}
        <div className="min-w-0">
          {selectedAttempt ? (
            <AttemptDetail
              key={selectedAttempt.id}
              quiz={quiz}
              attempt={selectedAttempt}
              studentName={getUserById(selectedAttempt.studentId)?.name ?? selectedAttempt.studentId}
            />
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <FileQuestion className="mx-auto h-10 w-10 text-muted-foreground" />
                <p className="mt-3 font-medium">Select a submission</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Pick one from the list to review answers and release the grade.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <QuizShareDialog quiz={quiz} open={shareOpen} onOpenChange={setShareOpen} />
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
  highlight,
}: {
  icon: React.ReactNode
  label: string
  value: string
  highlight?: boolean
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-lg",
              highlight ? "bg-accent/15 text-accent" : "bg-primary/10 text-primary",
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
    </Card>
  )
}

function AttemptDetail({
  quiz,
  attempt,
  studentName,
}: {
  quiz: Quiz
  attempt: QuizAttempt
  studentName: string
}) {
  const { currentUser, gradeQuizAttempt } = useLMS()
  const isPending = (attempt.status ?? "graded") === "pending-review"

  // Seed editable grade from existing teacher grades (if any) or
  // auto-graded comparison so the teacher only needs to adjust what changed.
  const [grades, setGrades] = useState<Record<string, QuizQuestionGrade>>(() => {
    const seed: Record<string, QuizQuestionGrade> = {}
    for (const q of quiz.questions) {
      const existing = attempt.questionGrades?.[q.id]
      if (existing) {
        seed[q.id] = { ...existing }
      } else {
        seed[q.id] = { correct: autoCorrect(q, attempt.answers[q.id]) }
      }
    }
    return seed
  })
  const [feedback, setFeedback] = useState(attempt.teacherFeedback ?? "")
  const [saving, setSaving] = useState(false)

  const setQuestionGrade = (qid: string, partial: Partial<QuizQuestionGrade>) => {
    setGrades((prev) => ({ ...prev, [qid]: { ...prev[qid], ...partial } }))
  }

  const totalPoints = quiz.questions.reduce((acc, q) => acc + q.points, 0)
  const earnedPoints = quiz.questions.reduce(
    (acc, q) => acc + (grades[q.id]?.correct ? q.points : 0),
    0,
  )
  const previewScore =
    totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0
  const willPass = previewScore >= quiz.passingScore

  const markAllCorrect = () => {
    const next: Record<string, QuizQuestionGrade> = {}
    for (const qid of Object.keys(grades)) {
      next[qid] = { ...grades[qid], correct: true }
    }
    setGrades(next)
  }
  const resetToAuto = () => {
    const next: Record<string, QuizQuestionGrade> = {}
    for (const q of quiz.questions) {
      next[q.id] = { correct: autoCorrect(q, attempt.answers[q.id]) }
    }
    setGrades(next)
    setFeedback("")
  }

  const publish = async () => {
    setSaving(true)
    gradeQuizAttempt(attempt.id, {
      questionGrades: grades,
      teacherFeedback: feedback || undefined,
      gradedBy: currentUser?.id,
    })
    setSaving(false)
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <Card>
        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Submission
              </p>
              <p className="mt-0.5 truncate text-lg font-semibold">{studentName}</p>
              <p className="text-xs text-muted-foreground">
                Submitted {new Date(attempt.completedAt ?? attempt.startedAt).toLocaleString()} ·
                Time: {formatClock(attempt.timeSpent)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {isPending ? (
                <Badge variant="secondary">Pending review</Badge>
              ) : (
                <>
                  <Badge variant={attempt.passed ? "default" : "destructive"}>
                    {attempt.passed ? "Passed" : "Failed"}
                  </Badge>
                  <span className="text-xl font-bold tabular-nums">{attempt.score}%</span>
                </>
              )}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-border/60 bg-muted/40 p-3 text-sm">
            <div>
              <span className="text-muted-foreground">Live score </span>
              <span
                className={cn(
                  "ml-1 text-lg font-semibold tabular-nums",
                  willPass ? "text-success" : "text-destructive",
                )}
              >
                {previewScore}%
              </span>
              <span className="ml-2 text-xs text-muted-foreground">
                ({earnedPoints}/{totalPoints} pts · pass {quiz.passingScore}%)
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="ghost" size="sm" onClick={resetToAuto}>
                Reset to auto
              </Button>
              <Button variant="outline" size="sm" onClick={markAllCorrect}>
                Mark all correct
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Questions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Per-question grading</CardTitle>
          <CardDescription>
            Toggle each question correct/incorrect. Optional note is shared with the student.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {quiz.questions.map((q, idx) => {
            const ans = attempt.answers[q.id]
            const grade = grades[q.id]
            const correct = !!grade?.correct
            return (
              <div
                key={q.id}
                className={cn(
                  "rounded-lg border p-4",
                  correct
                    ? "border-success/30 bg-success/5"
                    : "border-destructive/30 bg-destructive/5",
                )}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                      correct
                        ? "bg-success text-success-foreground"
                        : "bg-destructive text-destructive-foreground",
                    )}
                  >
                    {idx + 1}
                  </span>
                  <div className="min-w-0 flex-1 space-y-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <p className="font-medium leading-snug">{q.question}</p>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {q.points} pts
                      </span>
                    </div>

                    <div className="grid gap-2 text-sm sm:grid-cols-2">
                      <div className="rounded-md border border-border/40 bg-background/60 p-2">
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                          Student answer
                        </p>
                        <p className="mt-0.5 font-medium">
                          {formatAnswer(q, ans)}
                        </p>
                      </div>
                      <div className="rounded-md border border-border/40 bg-background/60 p-2">
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                          Expected
                        </p>
                        <p className="mt-0.5 font-medium text-success">
                          {formatExpected(q)}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setQuestionGrade(q.id, { correct: true })}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
                          correct
                            ? "border-success bg-success text-success-foreground"
                            : "border-border hover:border-success/40 hover:bg-success/10",
                        )}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Correct
                      </button>
                      <button
                        type="button"
                        onClick={() => setQuestionGrade(q.id, { correct: false })}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
                          !correct
                            ? "border-destructive bg-destructive text-destructive-foreground"
                            : "border-border hover:border-destructive/40 hover:bg-destructive/10",
                        )}
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        Incorrect
                      </button>
                    </div>

                    <Textarea
                      placeholder="Optional note for the student about this question…"
                      value={grade?.note ?? ""}
                      onChange={(e) => setQuestionGrade(q.id, { note: e.target.value })}
                      rows={2}
                      className="text-sm"
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>

      {/* Overall feedback + publish */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Overall feedback</CardTitle>
          <CardDescription>
            Shown to the student at the top of their result. Optional.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="Great work overall — pay extra attention to question 3 next time…"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            rows={4}
          />
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
            <p className="text-xs text-muted-foreground">
              Publishing will share the score, per-question feedback, and overall note with the student.
            </p>
            <Button onClick={publish} disabled={saving}>
              <Send className="mr-2 h-4 w-4" />
              {isPending ? "Publish grade" : "Update grade"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function formatAnswer(q: QuizQuestion, ans: string | number | undefined) {
  if (ans === undefined || ans === "") return <em className="text-muted-foreground">No answer</em>
  if (q.type === "multiple-choice" && q.options) {
    return <>{q.options[Number(ans)] ?? String(ans)}</>
  }
  if (q.type === "true-false") {
    return Number(ans) === 0 ? "True" : "False"
  }
  return <>{String(ans)}</>
}

function formatExpected(q: QuizQuestion) {
  if (q.type === "multiple-choice" && q.options) {
    return q.options[Number(q.correctAnswer)] ?? String(q.correctAnswer)
  }
  if (q.type === "true-false") {
    return Number(q.correctAnswer) === 0 ? "True" : "False"
  }
  return String(q.correctAnswer)
}
