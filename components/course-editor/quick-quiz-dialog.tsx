"use client"

// Inline quiz creator. Opens from the lesson editor so a teacher can spin
// up a quick check without bouncing to the standalone Quizzes page and
// losing their lesson-editing flow.
//
// Mirrors the question editor on /dashboard/quizzes/new — all four
// question types (multiple-choice, true-false, short-answer,
// long-answer), per-question points, and a per-question explanation
// shown to students after they answer. Inline + standalone quiz
// builders should never drift apart; both write the same QuizQuestion
// shape so the player renders them identically.

import { useState } from "react"
import { Check, Loader2, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { useLMS, generateId, type Quiz, type QuizQuestion } from "@/lib/lms-store"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  courseId: string
  // Defaults the dialog seeds itself with — typically the lesson's title
  // so the new quiz reads "<Lesson title> — Quick check".
  defaultTitle?: string
  // Called with the new quiz's id after it's saved. The caller usually
  // sets this on the lesson's content field so the linkage is one click.
  onCreated: (quizId: string) => void
}

type QuestionType = QuizQuestion["type"]

// Draft shape used while the user is editing. We persist points + type
// + options + correctAnswer in the same fields the QuizQuestion type
// already supports, so save() is a near-identity transformation.
type DraftQuestion = {
  id: string
  question: string
  type: QuestionType
  options?: string[]
  // For multiple-choice / true-false: numeric index of the right
  // option. For short-answer: the expected string. For long-answer:
  // a model answer / rubric (rich text would be overkill here — we
  // keep it as plain text since the inline editor stays compact).
  correctAnswer: string | number
  explanation: string
  points: number
}

function freshQuestion(): DraftQuestion {
  return {
    id: generateId("q"),
    question: "",
    type: "multiple-choice",
    options: ["", "", "", ""],
    correctAnswer: 0,
    explanation: "",
    points: 1,
  }
}

// Defaults applied when the type changes — mirrors the standalone
// /dashboard/quizzes/new behaviour so options + correctAnswer never
// land in a shape the player can't render.
function applyTypeDefaults(q: DraftQuestion, type: QuestionType): DraftQuestion {
  if (type === "multiple-choice") {
    return { ...q, type, options: q.options ?? ["", "", "", ""], correctAnswer: 0 }
  }
  if (type === "true-false") {
    return { ...q, type, options: ["True", "False"], correctAnswer: 0 }
  }
  // short-answer | long-answer — no options, string correctAnswer.
  return { ...q, type, options: undefined, correctAnswer: "" }
}

export function QuickQuizDialog({
  open,
  onOpenChange,
  courseId,
  defaultTitle,
  onCreated,
}: Props) {
  const { addQuiz } = useLMS()
  const [title, setTitle] = useState(defaultTitle ? `${defaultTitle} — Quick check` : "Quick check")
  const [description, setDescription] = useState("")
  const [passingScore, setPassingScore] = useState(60)
  const [questions, setQuestions] = useState<DraftQuestion[]>([freshQuestion()])
  const [saving, setSaving] = useState(false)

  // Reset draft state every time the dialog re-opens so a previous abandoned
  // quiz doesn't leak into the next attempt.
  const reset = () => {
    setTitle(defaultTitle ? `${defaultTitle} — Quick check` : "Quick check")
    setDescription("")
    setPassingScore(60)
    setQuestions([freshQuestion()])
    setSaving(false)
  }

  const updateQuestion = (id: string, patch: Partial<DraftQuestion>) => {
    setQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, ...patch } : q)))
  }

  const updateOption = (qid: string, optionIdx: number, value: string) => {
    setQuestions((prev) =>
      prev.map((q) =>
        q.id === qid && q.options
          ? { ...q, options: q.options.map((o, i) => (i === optionIdx ? value : o)) }
          : q,
      ),
    )
  }

  // "Ready" — title present + every question has its required bits.
  // Long-answer is teacher-graded so the model answer is OPTIONAL —
  // the question can ship with just the prompt.
  const isQuestionReady = (q: DraftQuestion): boolean => {
    if (!q.question.trim()) return false
    if (q.type === "multiple-choice") {
      const filled = (q.options ?? []).filter((o) => o.trim().length > 0)
      return filled.length >= 2 && !!(q.options ?? [])[q.correctAnswer as number]?.trim()
    }
    if (q.type === "true-false") {
      return q.correctAnswer === 0 || q.correctAnswer === 1
    }
    if (q.type === "short-answer") {
      return typeof q.correctAnswer === "string" && q.correctAnswer.trim().length > 0
    }
    // long-answer — prompt alone is enough; rubric is optional.
    return true
  }

  const ready =
    title.trim().length > 0 &&
    questions.length > 0 &&
    questions.every(isQuestionReady)

  const save = () => {
    if (!ready) return
    setSaving(true)
    const id = generateId("quiz")
    const quiz: Quiz = {
      id,
      title: title.trim(),
      description: description.trim(),
      courseId,
      // Map draft → QuizQuestion shape. We strip empty option strings
      // for multiple-choice (matches the standalone editor's behaviour),
      // and force `gradingMode` to "teacher" when any question is
      // long-answer — auto-grading can't score essays.
      questions: questions.map<QuizQuestion>((q) => ({
        id: q.id,
        question: q.question.trim(),
        type: q.type,
        options:
          q.type === "multiple-choice"
            ? (q.options ?? []).map((o) => o.trim()).filter((o) => o.length > 0)
            : q.type === "true-false"
              ? ["True", "False"]
              : undefined,
        correctAnswer:
          typeof q.correctAnswer === "string"
            ? q.correctAnswer.trim()
            : q.correctAnswer,
        explanation: q.explanation.trim() || undefined,
        points: q.points > 0 ? q.points : 1,
      })),
      passingScore,
      maxAttempts: 3,
      shuffleQuestions: false,
      showAnswers: true,
      gradingMode: questions.some((q) => q.type === "long-answer") ? "teacher" : "auto",
      createdAt: new Date().toISOString(),
    }
    addQuiz(quiz)
    onCreated(id)
    setSaving(false)
    onOpenChange(false)
    reset()
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v)
        if (!v) reset()
      }}
    >
      <DialogContent className="flex max-h-[90vh] w-[95vw] !max-w-5xl flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>Quick quiz</DialogTitle>
          <DialogDescription>
            Multiple-choice, true/false, short answer, long answer — same shape as the standalone Quizzes editor.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 space-y-4 overflow-y-auto pr-1">
          <div className="grid gap-3 sm:grid-cols-[1fr_140px]">
            <div className="space-y-1.5">
              <Label htmlFor="quick-quiz-title">Title</Label>
              <Input
                id="quick-quiz-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What's this quiz checking?"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="quick-quiz-pass">Passing score (%)</Label>
              <Input
                id="quick-quiz-pass"
                type="number"
                min={0}
                max={100}
                value={passingScore}
                onChange={(e) => setPassingScore(Math.max(0, Math.min(100, parseInt(e.target.value) || 0)))}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="quick-quiz-desc">Description (optional)</Label>
            <Textarea
              id="quick-quiz-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="One line of context shown to students before they start."
              rows={2}
            />
          </div>

          <div className="space-y-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Questions
            </p>
            {questions.map((q, qi) => (
              <div key={q.id} className="space-y-3 rounded-md border border-border bg-muted/30 p-3">
                {/* Header row — question number, type selector,
                    points input, delete. Same control set as
                    /dashboard/quizzes/new. */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold text-muted-foreground">Q{qi + 1}</span>
                  <Select
                    value={q.type}
                    onValueChange={(v) =>
                      updateQuestion(q.id, applyTypeDefaults(q, v as QuestionType))
                    }
                  >
                    <SelectTrigger className="h-8 w-40 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="multiple-choice">Multiple choice</SelectItem>
                      <SelectItem value="true-false">True/False</SelectItem>
                      <SelectItem value="short-answer">Short answer</SelectItem>
                      <SelectItem value="long-answer">Long answer (essay)</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    min={0}
                    value={q.points}
                    onChange={(e) =>
                      updateQuestion(q.id, { points: Math.max(0, parseInt(e.target.value) || 0) })
                    }
                    className="h-8 w-20 text-xs"
                    placeholder="Pts"
                  />
                  <div className="flex-1" />
                  {questions.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setQuestions((prev) => prev.filter((x) => x.id !== q.id))}
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      aria-label="Delete question"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>

                {/* Prompt — same Textarea shape across all types. */}
                <Textarea
                  value={q.question}
                  onChange={(e) => updateQuestion(q.id, { question: e.target.value })}
                  placeholder="Enter your question…"
                  rows={2}
                />

                {/* Type-specific answer block. Same shape as the
                    standalone editor — radios for choice-style
                    questions, text for short answer, rubric for
                    long answer. */}
                {q.type === "multiple-choice" && q.options && (
                  <div className="space-y-1.5">
                    <Label className="text-xs">Options · tap the circle next to the correct one</Label>
                    {q.options.map((opt, oi) => {
                      const isCorrect = q.correctAnswer === oi
                      return (
                        <div
                          key={oi}
                          className={cn(
                            "flex items-center gap-2 rounded-md border bg-background px-2 py-1.5 transition",
                            isCorrect ? "border-success/40 bg-success/5" : "border-border",
                          )}
                        >
                          <button
                            type="button"
                            onClick={() => updateQuestion(q.id, { correctAnswer: oi })}
                            aria-label={`Mark option ${oi + 1} as correct`}
                            className={cn(
                              "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition",
                              isCorrect
                                ? "border-success bg-success text-success-foreground"
                                : "border-border hover:border-success/60",
                            )}
                          >
                            {isCorrect && <Check className="h-3 w-3" />}
                          </button>
                          <Input
                            value={opt}
                            onChange={(e) => updateOption(q.id, oi, e.target.value)}
                            placeholder={`Option ${oi + 1}`}
                            className="h-7 border-0 bg-transparent text-sm shadow-none focus-visible:ring-0"
                          />
                        </div>
                      )
                    })}
                  </div>
                )}

                {q.type === "true-false" && (
                  <div className="space-y-1.5">
                    <Label className="text-xs">Correct answer</Label>
                    <div className="flex gap-4 text-sm">
                      <label className="inline-flex cursor-pointer items-center gap-2">
                        <input
                          type="radio"
                          name={`correct-${q.id}`}
                          checked={q.correctAnswer === 0}
                          onChange={() => updateQuestion(q.id, { correctAnswer: 0 })}
                          className="h-4 w-4"
                        />
                        True
                      </label>
                      <label className="inline-flex cursor-pointer items-center gap-2">
                        <input
                          type="radio"
                          name={`correct-${q.id}`}
                          checked={q.correctAnswer === 1}
                          onChange={() => updateQuestion(q.id, { correctAnswer: 1 })}
                          className="h-4 w-4"
                        />
                        False
                      </label>
                    </div>
                  </div>
                )}

                {q.type === "short-answer" && (
                  <div className="space-y-1.5">
                    <Label className="text-xs">Expected answer</Label>
                    <Input
                      value={typeof q.correctAnswer === "string" ? q.correctAnswer : ""}
                      onChange={(e) => updateQuestion(q.id, { correctAnswer: e.target.value })}
                      placeholder="What the auto-grader matches against"
                      className="text-sm"
                    />
                  </div>
                )}

                {q.type === "long-answer" && (
                  <div className="space-y-1.5">
                    <Label className="text-xs">Model answer / rubric (optional)</Label>
                    <Textarea
                      value={typeof q.correctAnswer === "string" ? q.correctAnswer : ""}
                      onChange={(e) => updateQuestion(q.id, { correctAnswer: e.target.value })}
                      placeholder="Notes for the teacher, an exemplar answer, or rubric points to look for."
                      rows={3}
                      className="text-sm"
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Long-answer questions are teacher-graded — there&apos;s no automatic scoring. We flip this quiz&apos;s grading mode to &quot;teacher&quot; on save when any question is long-answer.
                    </p>
                  </div>
                )}

                {/* Per-question explanation — shown to students after
                    they submit. Same field as the standalone editor. */}
                <div className="space-y-1.5">
                  <Label className="text-xs">Explanation (shown after answering)</Label>
                  <Input
                    value={q.explanation}
                    onChange={(e) => updateQuestion(q.id, { explanation: e.target.value })}
                    placeholder="Why the correct answer is correct — optional, but students love it."
                    className="text-sm"
                  />
                </div>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setQuestions((prev) => [...prev, freshQuestion()])}
            >
              <Plus className="mr-1 h-3.5 w-3.5" /> Add question
            </Button>
          </div>
        </div>

        <DialogFooter className="shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={save} disabled={!ready || saving}>
            {saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Check className="mr-1.5 h-4 w-4" />}
            Create quiz
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
