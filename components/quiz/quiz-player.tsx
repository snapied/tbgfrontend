"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  AlertCircle,
  Award,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  Flag,
  Hourglass,
  ListChecks,
  MessageSquare,
  RotateCcw,
  Send,
  Sparkles,
  Trophy,
  UserCheck,
  XCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
import { RichTextEditor } from "@/components/editor/rich-text-editor"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { cn } from "@/lib/utils"
import {
  generateId,
  useLMS,
  type Quiz,
  type QuizAttempt,
  type QuizQuestion,
} from "@/lib/lms-store"
import { readCurrentTenantSlug } from "@/lib/tenant-store"

type Phase = "intro" | "playing" | "submitted" | "results"

type AnswerValue = string | number

interface QuizPlayerProps {
  quiz: Quiz
  studentId?: string
  onExit?: () => void
  onComplete?: (attempt: QuizAttempt) => void
}

const formatClock = (totalSeconds: number) => {
  const s = Math.max(0, Math.floor(totalSeconds))
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${m.toString().padStart(2, "0")}:${r.toString().padStart(2, "0")}`
}

const seededShuffle = <T,>(arr: T[], seed: number): T[] => {
  const out = [...arr]
  let s = seed || 1
  for (let i = out.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280
    const j = Math.floor((s / 233280) * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

const isCorrect = (q: QuizQuestion, answer: AnswerValue | undefined): boolean => {
  if (answer === undefined || answer === "") return false
  if (q.type === "short-answer") {
    return (
      String(answer).trim().toLowerCase() ===
      String(q.correctAnswer).trim().toLowerCase()
    )
  }
  // Long-answer questions are never auto-correct — they go through
  // teacher review. Treat as "answered, not yet judged".
  if (q.type === "long-answer") return false
  return Number(answer) === Number(q.correctAnswer)
}

export function stripRichTextTags(html: string | null | undefined): string {
  if (!html) return ""
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim()
}

export function QuizPlayer({ quiz, studentId, onExit, onComplete }: QuizPlayerProps) {
  const { currentUser, submitQuizAttempt, getAttemptsForQuiz } = useLMS()
  const effectiveStudentId = studentId ?? currentUser?.id ?? "guest"

  const gradingMode: "auto" | "teacher" = quiz.gradingMode ?? "auto"

  const prevAttempts = useMemo(
    () =>
      getAttemptsForQuiz(quiz.id)
        .filter((a) => a.studentId === effectiveStudentId)
        .sort((a, b) => (a.completedAt ?? a.startedAt).localeCompare(b.completedAt ?? b.startedAt)),
    [getAttemptsForQuiz, quiz.id, effectiveStudentId],
  )
  const attemptsUsed = prevAttempts.length
  const attemptsRemaining = Math.max(0, quiz.maxAttempts - attemptsUsed)
  const bestScore = prevAttempts
    .filter((a) => (a.status ?? "graded") === "graded")
    .reduce((m, a) => Math.max(m, a.score), 0)
  const hasPassed = prevAttempts.some((a) => (a.status ?? "graded") === "graded" && a.passed)
  const latestAttempt = prevAttempts[prevAttempts.length - 1] ?? null
  const latestPending = latestAttempt && (latestAttempt.status ?? "graded") === "pending-review"

  // Tenant-scoped so a draft in tenant A can't surface for tenant B even
  // if both somehow share a quiz id (which they shouldn't, but defence in
  // depth — quiz IDs are random but the prefix gives us proof of isolation).
  const draftKey =
    typeof window !== "undefined"
      ? `thebigclass.t.${readCurrentTenantSlug()}.quiz.draft.${quiz.id}.${effectiveStudentId}`
      : `thebigclass.quiz.draft.${quiz.id}.${effectiveStudentId}`

  const [phase, setPhase] = useState<Phase>("intro")
  const [questionOrder, setQuestionOrder] = useState<string[]>(() =>
    quiz.questions.map((q) => q.id),
  )
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({})
  const [flagged, setFlagged] = useState<Record<string, boolean>>({})
  const [currentIdx, setCurrentIdx] = useState(0)
  const [startedAt, setStartedAt] = useState<string | null>(null)
  const [timeLeft, setTimeLeft] = useState<number | null>(null)
  const [confirmSubmit, setConfirmSubmit] = useState(false)
  const [submittedAttempt, setSubmittedAttempt] = useState<QuizAttempt | null>(null)
  const timeUpRef = useRef(false)

  const orderedQuestions = useMemo(
    () =>
      questionOrder
        .map((id) => quiz.questions.find((q) => q.id === id))
        .filter((q): q is QuizQuestion => Boolean(q)),
    [questionOrder, quiz.questions],
  )
  const totalQuestions = orderedQuestions.length
  const totalPoints = quiz.questions.reduce((acc, q) => acc + q.points, 0)
  const currentQ = orderedQuestions[currentIdx]
  const answeredCount = Object.keys(answers).filter(
    (k) => answers[k] !== undefined && answers[k] !== "",
  ).length
  const progressPct = totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0

  // Restore draft on mount (browser only)
  useEffect(() => {
    if (typeof window === "undefined") return
    try {
      const raw = window.localStorage.getItem(draftKey)
      if (raw) {
        const draft = JSON.parse(raw) as {
          phase: Phase
          questionOrder: string[]
          answers: Record<string, AnswerValue>
          flagged: Record<string, boolean>
          currentIdx: number
          startedAt: string
          timeLeft: number | null
        }
        if (draft.phase === "playing") {
          const knownIds = new Set(quiz.questions.map((q) => q.id))
          const order = draft.questionOrder.filter((id) => knownIds.has(id))
          if (order.length > 0) {
            setQuestionOrder(order)
            setAnswers(draft.answers || {})
            setFlagged(draft.flagged || {})
            setCurrentIdx(Math.min(draft.currentIdx ?? 0, order.length - 1))
            setStartedAt(draft.startedAt)
            if (quiz.timeLimit) {
              const elapsed = Math.floor(
                (Date.now() - new Date(draft.startedAt).getTime()) / 1000,
              )
              const remaining = quiz.timeLimit * 60 - elapsed
              setTimeLeft(Math.max(0, remaining))
            }
            setPhase("playing")
            return
          }
        }
      }
      // No in-progress draft. If the most recent attempt is still awaiting
      // review, surface the "submitted" state so the student isn't tempted
      // to retake before the teacher releases the grade.
      if (latestPending) setPhase("submitted")
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Persist draft
  useEffect(() => {
    if (typeof window === "undefined") return
    if (phase !== "playing") return
    try {
      window.localStorage.setItem(
        draftKey,
        JSON.stringify({
          phase,
          questionOrder,
          answers,
          flagged,
          currentIdx,
          startedAt,
          timeLeft,
        }),
      )
    } catch {
      /* ignore */
    }
  }, [phase, questionOrder, answers, flagged, currentIdx, startedAt, timeLeft, draftKey])

  const startQuiz = useCallback(() => {
    timeUpRef.current = false
    const order = quiz.shuffleQuestions
      ? seededShuffle(quiz.questions, Date.now()).map((q) => q.id)
      : quiz.questions.map((q) => q.id)
    setQuestionOrder(order)
    setAnswers({})
    setFlagged({})
    setCurrentIdx(0)
    setStartedAt(new Date().toISOString())
    setTimeLeft(quiz.timeLimit ? quiz.timeLimit * 60 : null)
    setSubmittedAttempt(null)
    setPhase("playing")
  }, [quiz.questions, quiz.shuffleQuestions, quiz.timeLimit])

  const computeAttempt = useCallback((): QuizAttempt => {
    const started = startedAt ?? new Date().toISOString()
    const completed = new Date().toISOString()
    const timeSpent = Math.max(
      1,
      Math.floor(
        (new Date(completed).getTime() - new Date(started).getTime()) / 1000,
      ),
    )
    if (gradingMode === "teacher") {
      // Defer scoring to the teacher — record the raw submission only.
      return {
        id: generateId("attempt"),
        quizId: quiz.id,
        studentId: effectiveStudentId,
        answers,
        score: 0,
        passed: false,
        startedAt: started,
        completedAt: completed,
        timeSpent,
        status: "pending-review",
      }
    }
    let earned = 0
    for (const q of quiz.questions) {
      if (isCorrect(q, answers[q.id])) earned += q.points
    }
    const score =
      totalPoints > 0 ? Math.round((earned / totalPoints) * 100) : 0
    return {
      id: generateId("attempt"),
      quizId: quiz.id,
      studentId: effectiveStudentId,
      answers,
      score,
      passed: score >= quiz.passingScore,
      startedAt: started,
      completedAt: completed,
      timeSpent,
      status: "graded",
    }
  }, [
    answers,
    effectiveStudentId,
    gradingMode,
    quiz.id,
    quiz.passingScore,
    quiz.questions,
    startedAt,
    totalPoints,
  ])

  const finishQuiz = useCallback(
    (auto = false) => {
      const attempt = computeAttempt()
      submitQuizAttempt(attempt)
      setSubmittedAttempt(attempt)
      setPhase(gradingMode === "teacher" ? "submitted" : "results")
      if (typeof window !== "undefined") {
        try {
          window.localStorage.removeItem(draftKey)
        } catch {
          /* ignore */
        }
      }
      onComplete?.(attempt)
      void auto
    },
    [computeAttempt, draftKey, gradingMode, onComplete, submitQuizAttempt],
  )

  // Countdown timer
  useEffect(() => {
    if (phase !== "playing" || timeLeft === null) return
    if (timeLeft <= 0) {
      if (!timeUpRef.current) {
        timeUpRef.current = true
        finishQuiz(true)
      }
      return
    }
    const t = setTimeout(() => setTimeLeft((s) => (s === null ? null : s - 1)), 1000)
    return () => clearTimeout(t)
  }, [phase, timeLeft, finishQuiz])

  const setAnswer = (qid: string, value: AnswerValue) => {
    setAnswers((prev) => ({ ...prev, [qid]: value }))
  }
  const toggleFlag = (qid: string) => {
    setFlagged((prev) => ({ ...prev, [qid]: !prev[qid] }))
  }
  const goPrev = () => setCurrentIdx((i) => Math.max(0, i - 1))
  const goNext = () =>
    setCurrentIdx((i) => Math.min(totalQuestions - 1, i + 1))

  // Keyboard shortcuts during play
  useEffect(() => {
    if (phase !== "playing" || !currentQ) return
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName?.toLowerCase()
      const isTyping = tag === "input" || tag === "textarea"
      if (e.key === "ArrowRight" && !isTyping) {
        e.preventDefault()
        goNext()
      } else if (e.key === "ArrowLeft" && !isTyping) {
        e.preventDefault()
        goPrev()
      } else if (e.key === "f" && !isTyping) {
        e.preventDefault()
        toggleFlag(currentQ.id)
      } else if (!isTyping && /^[1-9]$/.test(e.key)) {
        const idx = parseInt(e.key, 10) - 1
        if (currentQ.type === "multiple-choice" && currentQ.options && idx < currentQ.options.length) {
          e.preventDefault()
          setAnswer(currentQ.id, idx)
        } else if (currentQ.type === "true-false" && idx < 2) {
          e.preventDefault()
          setAnswer(currentQ.id, idx)
        }
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, currentQ, totalQuestions])

  // -------- RENDER --------

  if (phase === "intro") {
    const noAttemptsLeft = attemptsRemaining <= 0
    return (
      <Card className="border-border/60 shadow-sm">
        <CardContent className="p-6 sm:p-8 space-y-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <ListChecks className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <h2 className="text-2xl font-bold tracking-tight">{quiz.title}</h2>
              {quiz.description && (
                <p className="mt-1 text-muted-foreground">{stripRichTextTags(quiz.description)}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatTile
              icon={<ListChecks className="h-4 w-4" />}
              label="Questions"
              value={`${quiz.questions.length}`}
            />
            <StatTile
              icon={<Hourglass className="h-4 w-4" />}
              label="Time Limit"
              value={quiz.timeLimit ? `${quiz.timeLimit} min` : "No limit"}
            />
            <StatTile
              icon={<Trophy className="h-4 w-4" />}
              label="Pass Score"
              value={`${quiz.passingScore}%`}
            />
            <StatTile
              icon={<RotateCcw className="h-4 w-4" />}
              label="Attempts"
              value={`${attemptsUsed}/${quiz.maxAttempts}`}
            />
          </div>

          <div className="rounded-lg border border-border/60 bg-muted/40 p-4 text-sm">
            <p className="font-medium">Before you begin</p>
            <ul className="mt-2 space-y-1 text-muted-foreground">
              <li>• You have {attemptsRemaining} attempt{attemptsRemaining === 1 ? "" : "s"} remaining.</li>
              {quiz.timeLimit && (
                <li>• The timer starts the moment you press Start.</li>
              )}
              {quiz.shuffleQuestions && <li>• Questions will appear in a random order.</li>}
              {gradingMode === "teacher" ? (
                <li className="inline-flex items-center gap-1.5">
                  <UserCheck className="h-3.5 w-3.5 text-primary" />
                  Your instructor will review your submission and release the result.
                </li>
              ) : (
                quiz.showAnswers && (
                  <li>• Correct answers are revealed after you submit.</li>
                )
              )}
              <li>• You can flag questions and return to them before submitting.</li>
            </ul>
          </div>

          {prevAttempts.length > 0 && (
            <div className="rounded-lg border border-border/60 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Your history</p>
                <p className="text-sm text-muted-foreground">
                  Best score: <span className="font-semibold text-foreground">{bestScore}%</span>
                  {hasPassed && (
                    <span className="ml-2 inline-flex items-center gap-1 text-success">
                      <CheckCircle2 className="h-4 w-4" /> Passed
                    </span>
                  )}
                </p>
              </div>
              {latestAttempt && (latestAttempt.status ?? "graded") === "graded" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSubmittedAttempt(latestAttempt)
                    setPhase("results")
                  }}
                >
                  <Eye className="mr-2 h-4 w-4" />
                  View latest result
                </Button>
              )}
            </div>
          )}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            {onExit && (
              <Button variant="outline" onClick={onExit}>
                Cancel
              </Button>
            )}
            <Button
              size="lg"
              onClick={startQuiz}
              disabled={noAttemptsLeft || quiz.questions.length === 0}
              className="sm:min-w-40"
            >
              <Sparkles className="mr-2 h-4 w-4" />
              {noAttemptsLeft ? "No attempts left" : "Start Quiz"}
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (phase === "submitted") {
    const pending = submittedAttempt ?? latestAttempt
    return (
      <SubmittedView
        quiz={quiz}
        attempt={pending}
        onExit={onExit}
      />
    )
  }

  if (phase === "results") {
    const resultAttempt = submittedAttempt ?? latestAttempt
    if (!resultAttempt) return null
    return (
      <ResultsView
        quiz={quiz}
        attempt={resultAttempt}
        answers={resultAttempt.answers ?? answers}
        attemptsRemaining={Math.max(0, quiz.maxAttempts - attemptsUsed)}
        onRetry={startQuiz}
        onExit={onExit}
      />
    )
  }

  // playing
  if (!currentQ) return null

  const isAnswered = (qid: string) =>
    answers[qid] !== undefined && answers[qid] !== ""
  const unansweredCount = totalQuestions - answeredCount
  const lowTime = timeLeft !== null && timeLeft <= 30

  return (
    <Card className="border-border/60 shadow-sm">
      <CardContent className="p-0">
        {/* Sticky header */}
        <div className="sticky top-0 z-10 border-b border-border/60 bg-card/95 backdrop-blur px-4 py-3 sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{quiz.title}</p>
              <p className="text-xs text-muted-foreground">
                Question {currentIdx + 1} of {totalQuestions} · {answeredCount} answered
              </p>
            </div>
            <div className="flex items-center gap-2">
              {timeLeft !== null && (
                <div
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium tabular-nums",
                    lowTime
                      ? "border-destructive/40 bg-destructive/10 text-destructive animate-pulse"
                      : "border-border/60 bg-muted/60 text-foreground",
                  )}
                  aria-live="polite"
                >
                  <Clock className="h-4 w-4" />
                  {formatClock(timeLeft)}
                </div>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmSubmit(true)}
              >
                <Send className="mr-2 h-4 w-4" />
                Submit
              </Button>
            </div>
          </div>
          <Progress value={progressPct} className="mt-3 h-1.5" />
        </div>

        <div className="grid gap-6 p-4 sm:p-6 lg:grid-cols-[1fr_220px]">
          {/* Question */}
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs">
                <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 font-medium text-primary">
                  {currentQ.type === "multiple-choice"
                    ? "Multiple Choice"
                    : currentQ.type === "true-false"
                      ? "True / False"
                      : "Short Answer"}
                </span>
                <span className="text-muted-foreground">
                  {currentQ.points} point{currentQ.points === 1 ? "" : "s"}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleFlag(currentQ.id)}
                className={cn(
                  flagged[currentQ.id] && "text-accent",
                )}
                aria-pressed={!!flagged[currentQ.id]}
                title="Flag for review (F)"
              >
                <Flag
                  className={cn(
                    "mr-1.5 h-4 w-4",
                    flagged[currentQ.id] && "fill-accent text-accent",
                  )}
                />
                {flagged[currentQ.id] ? "Flagged" : "Flag"}
              </Button>
            </div>

            <h3 className="text-lg font-semibold leading-relaxed sm:text-xl">
              {currentQ.question || "Untitled question"}
            </h3>

            {/* Answer area */}
            <QuestionInput
              question={currentQ}
              value={answers[currentQ.id]}
              onChange={(v) => setAnswer(currentQ.id, v)}
            />

            <div className="flex items-center justify-between border-t border-border/60 pt-4">
              <Button
                variant="outline"
                onClick={goPrev}
                disabled={currentIdx === 0}
              >
                <ChevronLeft className="mr-2 h-4 w-4" />
                Previous
              </Button>
              {currentIdx === totalQuestions - 1 ? (
                <Button onClick={() => setConfirmSubmit(true)}>
                  <Send className="mr-2 h-4 w-4" />
                  Review &amp; Submit
                </Button>
              ) : (
                <Button onClick={goNext}>
                  Next
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              )}
            </div>

            <p className="text-xs text-muted-foreground">
              Keyboard: ← → to navigate · 1-9 to pick an option · F to flag
            </p>
          </div>

          {/* Palette */}
          <aside className="space-y-3 lg:border-l lg:border-border/60 lg:pl-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Questions
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {answeredCount} answered · {Object.values(flagged).filter(Boolean).length} flagged
              </p>
            </div>
            <div className="grid grid-cols-6 gap-1.5 lg:grid-cols-5">
              {orderedQuestions.map((q, idx) => {
                const answered = isAnswered(q.id)
                const isFlagged = !!flagged[q.id]
                const isCurrent = idx === currentIdx
                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => setCurrentIdx(idx)}
                    className={cn(
                      "relative h-9 w-full rounded-md border text-xs font-medium tabular-nums transition-colors",
                      isCurrent
                        ? "border-primary bg-primary text-primary-foreground"
                        : answered
                          ? "border-success/40 bg-success/10 text-foreground hover:bg-success/15"
                          : "border-border bg-background text-muted-foreground hover:bg-muted",
                    )}
                    aria-label={`Question ${idx + 1}${answered ? ", answered" : ", not answered"}${isFlagged ? ", flagged" : ""}`}
                  >
                    {idx + 1}
                    {isFlagged && (
                      <span
                        className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-accent ring-2 ring-card"
                        aria-hidden
                      />
                    )}
                  </button>
                )
              })}
            </div>
            <div className="space-y-1 pt-2 text-xs text-muted-foreground">
              <LegendDot className="bg-primary" label="Current" />
              <LegendDot className="bg-success/40" label="Answered" />
              <LegendDot className="bg-background border" label="Unanswered" />
              <LegendDot className="bg-accent" label="Flagged" />
            </div>
          </aside>
        </div>
      </CardContent>

      <AlertDialog open={confirmSubmit} onOpenChange={setConfirmSubmit}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {unansweredCount > 0 ? "Submit with unanswered questions?" : "Submit your quiz?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {unansweredCount > 0 ? (
                <>
                  You still have <span className="font-semibold text-foreground">{unansweredCount}</span> unanswered
                  question{unansweredCount === 1 ? "" : "s"}. Unanswered questions count as incorrect.
                </>
              ) : (
                <>
                  You answered all {totalQuestions} questions. You can&apos;t change your answers after submitting.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction onClick={() => finishQuiz(false)}>
              <Send className="mr-2 h-4 w-4" /> Submit now
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}

// ---------------- Subcomponents ----------------

function QuestionInput({
  question,
  value,
  onChange,
}: {
  question: QuizQuestion
  value: AnswerValue | undefined
  onChange: (v: AnswerValue) => void
}) {
  if (question.type === "multiple-choice" && question.options) {
    return (
      <div className="space-y-2">
        {question.options.map((opt, idx) => {
          const selected = Number(value) === idx
          return (
            <button
              key={idx}
              type="button"
              onClick={() => onChange(idx)}
              className={cn(
                "group flex w-full items-start gap-3 rounded-lg border p-4 text-left transition-all",
                selected
                  ? "border-primary bg-primary/5 ring-2 ring-primary/30"
                  : "border-border hover:border-primary/40 hover:bg-muted/40",
              )}
            >
              <span
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-md border text-xs font-semibold tabular-nums",
                  selected
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-muted-foreground group-hover:border-primary/40",
                )}
              >
                {String.fromCharCode(65 + idx)}
              </span>
              <span className="text-sm leading-relaxed">{opt || `Option ${idx + 1}`}</span>
            </button>
          )
        })}
      </div>
    )
  }
  if (question.type === "true-false") {
    return (
      <div className="grid grid-cols-2 gap-3">
        {["True", "False"].map((label, idx) => {
          const selected = Number(value) === idx
          return (
            <button
              key={label}
              type="button"
              onClick={() => onChange(idx)}
              className={cn(
                "flex items-center justify-center gap-2 rounded-lg border p-4 text-sm font-medium transition-all",
                selected
                  ? "border-primary bg-primary/5 ring-2 ring-primary/30"
                  : "border-border hover:border-primary/40 hover:bg-muted/40",
              )}
            >
              {label === "True" ? (
                <CheckCircle2
                  className={cn(
                    "h-4 w-4",
                    selected ? "text-primary" : "text-muted-foreground",
                  )}
                />
              ) : (
                <XCircle
                  className={cn(
                    "h-4 w-4",
                    selected ? "text-primary" : "text-muted-foreground",
                  )}
                />
              )}
              {label}
            </button>
          )
        })}
      </div>
    )
  }
  // Long-answer (essay) — render with the same Tiptap editor used for
  // assignment instructions and blog posts. Plain text questions
  // continue to use the simpler Textarea below.
  if (question.type === "long-answer") {
    return (
      <RichTextEditor
        value={(value as string) ?? ""}
        onChange={(html) => onChange(html)}
        placeholder="Write your answer. You can format, link, and embed images."
        minHeight={200}
      />
    )
  }
  return (
    <Textarea
      autoFocus
      placeholder="Type your answer here…"
      value={(value as string) ?? ""}
      onChange={(e) => onChange(e.target.value)}
      rows={3}
    />
  )
}

function StatTile({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-card p-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className="mt-1 text-base font-semibold">{value}</p>
    </div>
  )
}

function LegendDot({ className, label }: { className?: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={cn("h-3 w-3 rounded-sm", className)} />
      <span>{label}</span>
    </div>
  )
}

function ResultsView({
  quiz,
  attempt,
  answers,
  attemptsRemaining,
  onRetry,
  onExit,
}: {
  quiz: Quiz
  attempt: QuizAttempt
  answers: Record<string, AnswerValue>
  attemptsRemaining: number
  onRetry: () => void
  onExit?: () => void
}) {
  const teacherGraded = !!attempt.questionGrades
  const isQuestionCorrect = (q: QuizQuestion) =>
    teacherGraded
      ? !!attempt.questionGrades?.[q.id]?.correct
      : isCorrect(q, answers[q.id])
  const correctCount = quiz.questions.filter(isQuestionCorrect).length
  const incorrectCount = quiz.questions.length - correctCount
  const earnedPoints = quiz.questions.reduce(
    (acc, q) => acc + (isQuestionCorrect(q) ? q.points : 0),
    0,
  )
  const totalPoints = quiz.questions.reduce((acc, q) => acc + q.points, 0)
  const passed = attempt.passed
  const canRetry = attemptsRemaining > 0
  // In teacher-graded attempts, the review panel is always meaningful because
  // the teacher curated per-question verdicts and notes. In auto mode, only
  // show it if the quiz opted into showAnswers.
  const showReview = teacherGraded || quiz.showAnswers

  return (
    <div className="space-y-5">
      <Card className="overflow-hidden border-border/60 shadow-sm">
        <div
          className={cn(
            "px-6 py-8 text-center sm:px-10",
            passed
              ? "bg-gradient-to-br from-success/10 via-success/5 to-transparent"
              : "bg-gradient-to-br from-destructive/10 via-destructive/5 to-transparent",
          )}
        >
          <div
            className={cn(
              "mx-auto flex h-16 w-16 items-center justify-center rounded-full",
              passed ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive",
            )}
          >
            {passed ? <Award className="h-8 w-8" /> : <AlertCircle className="h-8 w-8" />}
          </div>
          <h2 className="mt-4 text-2xl font-bold">
            {passed ? "Congratulations — you passed!" : "Not quite there yet"}
          </h2>
          <p className="mt-1 text-muted-foreground">
            {passed
              ? "Great work. Your result has been recorded."
              : `You need ${quiz.passingScore}% to pass. ${canRetry ? "Give it another shot." : "No attempts remaining."}`}
          </p>

          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <ResultStat label="Score" value={`${attempt.score}%`} />
            <ResultStat label="Correct" value={`${correctCount}/${quiz.questions.length}`} />
            <ResultStat label="Points" value={`${earnedPoints}/${totalPoints}`} />
            <ResultStat label="Time" value={formatClock(attempt.timeSpent)} />
          </div>

          <div className="mt-6 flex flex-col items-center justify-center gap-2 sm:flex-row">
            {canRetry && (
              <Button onClick={onRetry} variant={passed ? "outline" : "default"}>
                <RotateCcw className="mr-2 h-4 w-4" />
                Retry ({attemptsRemaining} left)
              </Button>
            )}
            {onExit && (
              <Button onClick={onExit} variant={passed ? "default" : "outline"}>
                Done
              </Button>
            )}
          </div>
        </div>
      </Card>

      {attempt.teacherFeedback && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                <MessageSquare className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold">Feedback from Your instructor</p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-foreground/90">
                  {attempt.teacherFeedback}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {showReview && (
        <Card className="border-border/60">
          <CardContent className="p-4 sm:p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold">Review answers</h3>
              <div className="flex items-center gap-3 text-xs">
                <span className="inline-flex items-center gap-1 text-success">
                  <CheckCircle2 className="h-3.5 w-3.5" /> {correctCount} correct
                </span>
                <span className="inline-flex items-center gap-1 text-destructive">
                  <XCircle className="h-3.5 w-3.5" /> {incorrectCount} incorrect
                </span>
              </div>
            </div>
            <div className="space-y-3">
              {quiz.questions.map((q, idx) => {
                const ans = answers[q.id]
                const correct = isQuestionCorrect(q)
                const note = attempt.questionGrades?.[q.id]?.note
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
                      <div
                        className={cn(
                          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                          correct
                            ? "bg-success text-success-foreground"
                            : "bg-destructive text-destructive-foreground",
                        )}
                      >
                        {idx + 1}
                      </div>
                      <div className="min-w-0 flex-1 space-y-2">
                        <p className="font-medium leading-snug">{q.question}</p>
                        <AnswerSummary question={q} answer={ans} correct={correct} />
                        {note && (
                          <p className="rounded-md border border-primary/20 bg-primary/5 p-3 text-sm">
                            <span className="font-medium">Instructor: </span>
                            {note}
                          </p>
                        )}
                        {q.explanation && (
                          <p className="rounded-md bg-background/60 p-3 text-sm text-muted-foreground">
                            <span className="font-medium text-foreground">Why: </span>
                            {q.explanation}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function SubmittedView({
  quiz,
  attempt,
  onExit,
}: {
  quiz: Quiz
  attempt: QuizAttempt | null
  onExit?: () => void
}) {
  const submittedAt = attempt?.completedAt ?? attempt?.startedAt
  const formatted = submittedAt
    ? new Date(submittedAt).toLocaleString()
    : null
  return (
    <Card className="overflow-hidden border-border/60 shadow-sm">
      <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent px-6 py-10 text-center sm:px-10">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/15 text-primary">
          <UserCheck className="h-8 w-8" />
        </div>
        <h2 className="mt-4 text-2xl font-bold">Submission received</h2>
        <p className="mt-1 text-muted-foreground">
          Your answers for <span className="font-medium text-foreground">{quiz.title}</span> are with Your instructor.
          You&apos;ll see the result here once it&apos;s released.
        </p>
        {formatted && (
          <p className="mt-3 text-xs text-muted-foreground">Submitted {formatted}</p>
        )}
        {attempt && (
          <div className="mt-6 mx-auto grid max-w-md grid-cols-2 gap-3">
            <ResultStat
              label="Questions"
              value={`${Object.keys(attempt.answers ?? {}).length}/${quiz.questions.length}`}
            />
            <ResultStat label="Time" value={formatClock(attempt.timeSpent)} />
          </div>
        )}
        {onExit && (
          <div className="mt-6">
            <Button onClick={onExit}>Done</Button>
          </div>
        )}
      </div>
    </Card>
  )
}

function ResultStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/40 bg-card/80 px-3 py-2 backdrop-blur">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold tabular-nums">{value}</p>
    </div>
  )
}

function AnswerSummary({
  question,
  answer,
  correct,
}: {
  question: QuizQuestion
  answer: AnswerValue | undefined
  correct: boolean
}) {
  const formatVal = (v: AnswerValue | undefined) => {
    if (v === undefined || v === "") return <em className="text-muted-foreground">No answer</em>
    if (question.type === "multiple-choice" && question.options) {
      const opt = question.options[Number(v)]
      return <>{opt ?? String(v)}</>
    }
    if (question.type === "true-false") {
      return Number(v) === 0 ? "True" : "False"
    }
    return <>{String(v)}</>
  }
  const correctDisplay = () => {
    if (question.type === "multiple-choice" && question.options) {
      return question.options[Number(question.correctAnswer)] ?? String(question.correctAnswer)
    }
    if (question.type === "true-false") {
      return Number(question.correctAnswer) === 0 ? "True" : "False"
    }
    return String(question.correctAnswer)
  }
  return (
    <div className="grid gap-2 text-sm sm:grid-cols-2">
      <div>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Your answer</p>
        <p
          className={cn(
            "mt-0.5 font-medium",
            correct ? "text-success" : "text-destructive",
          )}
        >
          {formatVal(answer)}
        </p>
      </div>
      {!correct && (
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Correct answer</p>
          <p className="mt-0.5 font-medium text-success">{correctDisplay()}</p>
        </div>
      )}
    </div>
  )
}

