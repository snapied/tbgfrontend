"use client"

// Inline quiz creator. Opens from the lesson editor so a teacher can spin
// up a quick check without bouncing to the standalone Quizzes page and
// losing their lesson-editing flow.
//
// Scope is intentionally narrow: title, optional description, a list of
// multiple-choice questions (one correct option each), passing score. For
// short-answer / true-false questions or fancier features (timer, shuffle,
// answer reveal), the user can refine the quiz from the Quizzes dashboard
// after it's created.
//
// The dialog needs a courseId — quizzes are scoped per course. The caller
// is responsible for only mounting this when a courseId is available.

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

type DraftQuestion = {
  id: string
  question: string
  options: [string, string, string, string]
  correctIndex: number
}

function freshQuestion(): DraftQuestion {
  return {
    id: generateId("q"),
    question: "",
    options: ["", "", "", ""],
    correctIndex: 0,
  }
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
        q.id === qid
          ? { ...q, options: q.options.map((o, i) => (i === optionIdx ? value : o)) as DraftQuestion["options"] }
          : q,
      ),
    )
  }

  // "Ready" gates the Save button. Title + at least one fully-filled
  // question (text + at least 2 options + a correct-answer pick).
  const ready =
    title.trim().length > 0 &&
    questions.length > 0 &&
    questions.every(
      (q) =>
        q.question.trim().length > 0 &&
        q.options.filter((o) => o.trim().length > 0).length >= 2 &&
        q.options[q.correctIndex]?.trim().length > 0,
    )

  const save = () => {
    if (!ready) return
    setSaving(true)
    const id = generateId("quiz")
    const quiz: Quiz = {
      id,
      title: title.trim(),
      description: description.trim(),
      courseId,
      questions: questions.map<QuizQuestion>((q) => ({
        id: q.id,
        question: q.question.trim(),
        type: "multiple-choice",
        options: q.options.map((o) => o.trim()).filter((o) => o.length > 0),
        correctAnswer: q.correctIndex,
        points: 1,
      })),
      passingScore,
      maxAttempts: 3,
      shuffleQuestions: false,
      showAnswers: true,
      gradingMode: "auto",
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
      <DialogContent className="flex max-h-[90vh] max-w-2xl flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>Quick quiz</DialogTitle>
          <DialogDescription>
            Build a short multiple-choice check. You can refine it from the Quizzes dashboard later.
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
              <div key={q.id} className="space-y-2 rounded-md border border-border bg-muted/30 p-3">
                <div className="flex items-start gap-2">
                  <span className="mt-2 text-xs font-semibold text-muted-foreground">Q{qi + 1}</span>
                  <Input
                    value={q.question}
                    onChange={(e) => updateQuestion(q.id, { question: e.target.value })}
                    placeholder="Question"
                    className="flex-1"
                  />
                  {questions.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setQuestions((prev) => prev.filter((x) => x.id !== q.id))}
                      className="text-destructive hover:text-destructive"
                      aria-label="Delete question"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
                <p className="ml-7 text-[11px] text-muted-foreground">
                  Tap the circle next to the correct answer.
                </p>
                <div className="ml-7 grid gap-1.5 sm:grid-cols-2">
                  {q.options.map((opt, oi) => {
                    const isCorrect = q.correctIndex === oi
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
                          onClick={() => updateQuestion(q.id, { correctIndex: oi })}
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
