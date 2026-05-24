"use client"

import { use, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Plus, Trash2, Save, Loader2, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useLMS, generateId, type QuizQuestion } from "@/lib/lms-store"
import { AIGenerateButton } from "@/components/ai/ai-generate-button"
import { aiQuizQuestions, aiCourseDescription } from "@/lib/ai-client"
import { ProductTour, TakeATourButton, type TourStep } from "@/components/tour/product-tour"

// Tour for the edit-quiz page. Highlights what's different from
// Create — saved indicator, the "Saved HH:MM" timestamp, the
// review-attempts flow — plus a refresher on questions + settings
// for teachers coming back to a quiz they made weeks ago.
const QUIZZES_EDIT_TOUR: TourStep[] = [
  {
    title: "Edit a quiz you already created",
    body: "Same surfaces as Create — basic info, questions, settings — plus a saved indicator so you always know when your last change landed.",
    emoji: "✏️",
    placement: "center",
  },
  {
    target: "[data-tour='quiz-edit-save']",
    title: "Save changes manually",
    body: "Edits are only persisted when you click Save. The 'Saved 10:42' badge to the left always shows when your last save landed.",
    emoji: "💾",
    placement: "bottom",
  },
  {
    target: "[data-tour='quiz-edit-basics']",
    title: "Title, course, description",
    body: "Move a quiz to a different course here. The slug + URL won't change — student bookmarks stay valid.",
    emoji: "📝",
    placement: "bottom",
  },
  {
    target: "[data-tour='quiz-edit-ai-draft']",
    title: "Add more questions with AI",
    body: "Drafts 5 more questions from the title and appends to the existing list — useful when you want to grow a quiz over time.",
    emoji: "🤖",
    placement: "left",
  },
  {
    target: "[data-tour='quiz-edit-settings']",
    title: "Tune the rules",
    body: "Change grading mode, pass mark, attempts, shuffle. Existing attempts keep their original scores; new attempts use the new rules.",
    emoji: "⚙️",
    placement: "top",
  },
]
import { RichTextEditor } from "@/components/editor/rich-text-editor"
import { SavedIndicator, type SaveStatus } from "@/components/dashboard/saved-indicator"
import { toast } from "sonner"

export default function EditQuizPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { quizzes, courses, updateQuiz, hydrated: lmsHydrated } = useLMS()

  const quiz = quizzes.find(q => q.id === id)

  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  // Persistent "Saved HH:MM" timestamp shown next to the Save button.
  // Survives the brief "Saved ✓" pulse so the teacher always sees when
  // they last persisted — calms the "did that go through?" reflex.
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null)
  const saveStatus: SaveStatus = saving ? "saving" : saved ? "saved" : "idle"
  const [title, setTitle] = useState(quiz?.title || "")
  const [description, setDescription] = useState(quiz?.description || "")
  const [courseId, setCourseId] = useState(quiz?.courseId || "")
  const [timeLimit, setTimeLimit] = useState(quiz?.timeLimit?.toString() || "")
  const [passingScore, setPassingScore] = useState(quiz?.passingScore?.toString() || "60")
  const [maxAttempts, setMaxAttempts] = useState(quiz?.maxAttempts?.toString() || "3")
  const [shuffleQuestions, setShuffleQuestions] = useState<boolean>(quiz?.shuffleQuestions ?? false)
  const [showAnswers, setShowAnswers] = useState<boolean>(quiz?.showAnswers ?? true)
  const [gradingMode, setGradingMode] = useState<"auto" | "teacher">(quiz?.gradingMode ?? "teacher")
  const [questions, setQuestions] = useState<QuizQuestion[]>(quiz?.questions || [])
  // Re-initialize every field when the quiz arrives. lms-store hydrates
  // asynchronously (localStorage first, then the server blob), so on a
  // hard refresh the `quizzes` array starts empty — without this
  // effect the useState defaults stick and the form renders blank.
  // Gated by `id` so opening a different quiz also re-seeds the form.
  const [initialised, setInitialised] = useState(false)
  useEffect(() => {
    if (!quiz || initialised) return
    setTitle(quiz.title)
    setDescription(quiz.description ?? "")
    setCourseId(quiz.courseId)
    setTimeLimit(quiz.timeLimit?.toString() ?? "")
    setPassingScore(quiz.passingScore?.toString() ?? "60")
    setMaxAttempts(quiz.maxAttempts?.toString() ?? "3")
    setShuffleQuestions(quiz.shuffleQuestions ?? false)
    setShowAnswers(quiz.showAnswers ?? true)
    setGradingMode(quiz.gradingMode ?? "teacher")
    setQuestions(quiz.questions ?? [])
    setInitialised(true)
  }, [quiz, initialised])

  // While the store is still hydrating (lms-store reads from
  // localStorage and the server blob asynchronously) we render a
  // small loading state instead of the "Quiz not found" screen — a
  // hard refresh would otherwise look like the quiz was deleted.
  if (!quiz && !lmsHydrated) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!quiz) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold">Quiz not found</h2>
          <p className="mt-2 text-muted-foreground">The quiz you are looking for does not exist.</p>
          <Button asChild className="mt-4">
            <Link href="/dashboard/quizzes">Back to Quizzes</Link>
          </Button>
        </div>
      </div>
    )
  }

  const handleSave = async () => {
    if (saving) return
    setSaving(true)
    setSaved(false)
    try {
      // Give React one frame to render the "Saving…" state before the
      // synchronous store write (which would otherwise batch with setSaving).
      await new Promise((r) => setTimeout(r, 400))
      updateQuiz(id, {
        title,
        description,
        courseId,
        timeLimit: timeLimit ? parseInt(timeLimit) : undefined,
        passingScore: parseInt(passingScore) || 0,
        maxAttempts: parseInt(maxAttempts) || 1,
        shuffleQuestions,
        showAnswers,
        gradingMode,
        questions,
      })
      const stamp = new Date().toISOString()
      setSaved(true)
      setLastSavedAt(stamp)
      toast.success("Quiz saved", { description: "All changes have been saved." })
      // Brief "Saved ✓" state before resetting — the SavedIndicator
      // keeps the "Saved HH:MM" timestamp visible after this pulse.
      setTimeout(() => setSaved(false), 2500)
    } catch (err) {
      toast.error("Save failed", { description: "Please try again." })
      console.error("[quiz save]", err)
    } finally {
      setSaving(false)
    }
  }

  const addQuestion = () => {
    const newQuestion: QuizQuestion = {
      id: `q-${Date.now()}`,
      question: "",
      type: "multiple-choice",
      options: ["Option A", "Option B", "Option C", "Option D"],
      correctAnswer: 0,
      points: 10,
    }
    setQuestions([...questions, newQuestion])
  }

  const updateQuestion = (questionId: string, updates: Partial<QuizQuestion>) => {
    setQuestions(questions.map(q => q.id === questionId ? { ...q, ...updates } : q))
  }

  const deleteQuestion = (questionId: string) => {
    setQuestions(questions.filter(q => q.id !== questionId))
  }

  const updateOption = (questionId: string, optionIndex: number, value: string) => {
    const question = questions.find(q => q.id === questionId)
    if (!question || !question.options) return
    
    const newOptions = [...question.options]
    newOptions[optionIndex] = value
    updateQuestion(questionId, { options: newOptions })
  }

  return (
    <div className="space-y-6">
      <ProductTour tourId="quizzes-edit-v1" steps={QUIZZES_EDIT_TOUR} />
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/quizzes">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Edit Quiz</h1>
            <p className="text-muted-foreground">Update quiz details and questions</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <TakeATourButton tourId="quizzes-edit-v1" />
          <SavedIndicator status={saveStatus} lastSavedAt={lastSavedAt} />
          <Button
            data-tour="quiz-edit-save"
            onClick={handleSave}
            disabled={saving}
            className={saved ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""}
          >
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : saved ? (
              <CheckCircle2 className="mr-2 h-4 w-4" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            {saving ? "Saving…" : saved ? "Saved ✓" : "Save changes"}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Info */}
          <Card data-tour="quiz-edit-basics">
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>Quiz title and settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Quiz Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter quiz title"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="description">Description</Label>
                  {/* AI drafter — re-uses the course-description
                      endpoint with the quiz title as the topic.
                      Overwrites the field on success; the teacher
                      edits before saving. */}
                  <AIGenerateButton
                    size="xs"
                    label="Draft with AI"
                    disabled={!title.trim()}
                    onGenerate={async () => {
                      const r = await aiCourseDescription({ title })
                      if ("error" in r) {
                        toast.error(`Couldn't draft: ${r.error}`)
                        return
                      }
                      setDescription(r.description)
                      toast.success("Drafted — edit as needed.")
                    }}
                  />
                </div>
                <RichTextEditor
                  value={description}
                  onChange={setDescription}
                  placeholder="Enter quiz description"
                  minHeight={120}
                />
              </div>
              <div className="space-y-2">
                <Label>Associated Course</Label>
                <Select value={courseId} onValueChange={setCourseId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a course" />
                  </SelectTrigger>
                  <SelectContent>
                    {courses.map((course) => (
                      <SelectItem key={course.id} value={course.id}>
                        {course.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Questions */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Questions</CardTitle>
                <CardDescription>Add and edit quiz questions</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {/* AI drafter — generates 5 mixed-type questions
                    from the quiz title and appends them to the
                    existing list. Disabled until the quiz has a
                    title (the model needs something to write about). */}
                <span data-tour="quiz-edit-ai-draft">
                  <AIGenerateButton
                    size="sm"
                    label="Draft questions"
                    disabled={!title.trim()}
                    onGenerate={async () => {
                      const r = await aiQuizQuestions({ topic: title, count: 5 })
                      if ("error" in r) {
                        toast.error(`Couldn't draft: ${r.error}`)
                        return
                      }
                      const drafted: QuizQuestion[] = r.questions.map((q) => ({
                        id: generateId("q"),
                        question: q.question,
                        type:
                          q.type === "multiple-choice" || q.type === "true-false" || q.type === "short-answer"
                            ? q.type
                            : "multiple-choice",
                        options: q.options,
                        correctAnswer: q.correctAnswer,
                        explanation: q.explanation,
                        points: typeof q.points === "number" ? q.points : 1,
                      }))
                      setQuestions([...questions, ...drafted])
                      toast.success(`Added ${drafted.length} drafted questions — review and edit.`)
                    }}
                  />
                </span>
                <Button onClick={addQuestion} size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Question
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {questions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No questions yet. Click &quot;Add Question&quot; to get started.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {questions.map((question, index) => (
                    <div key={question.id} className="border border-border rounded-lg p-4 space-y-4">
                      <div className="flex items-start justify-between">
                        <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-primary text-primary-foreground text-sm font-medium">
                          {index + 1}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteQuestion(question.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Question</Label>
                        <Textarea
                          value={question.question}
                          onChange={(e) => updateQuestion(question.id, { question: e.target.value })}
                          placeholder="Enter your question"
                          rows={2}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Type</Label>
                          <Select 
                            value={question.type} 
                            onValueChange={(v) => updateQuestion(question.id, { type: v as QuizQuestion["type"] })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="multiple-choice">Multiple Choice</SelectItem>
                              <SelectItem value="true-false">True/False</SelectItem>
                              <SelectItem value="short-answer">Short Answer</SelectItem>
                              <SelectItem value="long-answer">Long Answer (essay)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Points</Label>
                          <Input
                            type="number"
                            value={question.points}
                            onChange={(e) => updateQuestion(question.id, { points: parseInt(e.target.value) || 0 })}
                          />
                        </div>
                      </div>

                      {question.type === "multiple-choice" && question.options && (
                        <div className="space-y-2">
                          <Label>Options</Label>
                          <div className="space-y-2">
                            {question.options.map((option, optIndex) => (
                              <div key={optIndex} className="flex items-center gap-2">
                                <input
                                  type="radio"
                                  name={`correct-${question.id}`}
                                  checked={question.correctAnswer === optIndex}
                                  onChange={() => updateQuestion(question.id, { correctAnswer: optIndex })}
                                  className="h-4 w-4"
                                />
                                <Input
                                  value={option}
                                  onChange={(e) => updateOption(question.id, optIndex, e.target.value)}
                                  placeholder={`Option ${optIndex + 1}`}
                                />
                              </div>
                            ))}
                          </div>
                          <p className="text-xs text-muted-foreground">Select the radio button for the correct answer</p>
                        </div>
                      )}

                      {question.type === "true-false" && (
                        <div className="space-y-2">
                          <Label>Correct Answer</Label>
                          <Select 
                            value={question.correctAnswer?.toString()} 
                            onValueChange={(v) => updateQuestion(question.id, { correctAnswer: parseInt(v) })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="0">True</SelectItem>
                              <SelectItem value="1">False</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {question.type === "short-answer" && (
                        <div className="space-y-2">
                          <Label>Correct Answer</Label>
                          <Input
                            value={question.correctAnswer?.toString() || ""}
                            onChange={(e) => updateQuestion(question.id, { correctAnswer: e.target.value })}
                            placeholder="Enter the correct answer"
                          />
                        </div>
                      )}

                      {question.type === "long-answer" && (
                        <div className="space-y-2">
                          <Label>Model answer / rubric (optional)</Label>
                          <RichTextEditor
                            value={(question.correctAnswer as string) ?? ""}
                            onChange={(html) => updateQuestion(question.id, { correctAnswer: html })}
                            placeholder="Notes for the teacher, an exemplar answer, or rubric points to look for."
                            minHeight={140}
                          />
                          <p className="text-[11px] text-muted-foreground">
                            Essay-style — no auto-grading. Students answer with the same editor.
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Settings */}
          <Card data-tour="quiz-edit-settings">
            <CardHeader>
              <CardTitle>Quiz Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Time Limit (minutes)</Label>
                <Input
                  type="number"
                  value={timeLimit}
                  onChange={(e) => setTimeLimit(e.target.value)}
                  placeholder="No limit"
                />
              </div>
              <div className="space-y-2">
                <Label>Passing Score (%)</Label>
                <Input
                  type="number"
                  value={passingScore}
                  onChange={(e) => setPassingScore(e.target.value)}
                  min="0"
                  max="100"
                />
              </div>
              <div className="space-y-2">
                <Label>Max Attempts</Label>
                <Input
                  type="number"
                  value={maxAttempts}
                  onChange={(e) => setMaxAttempts(e.target.value)}
                  min="1"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="shuffle"
                  checked={shuffleQuestions}
                  onCheckedChange={(checked) => setShuffleQuestions(checked as boolean)}
                />
                <Label htmlFor="shuffle" className="text-sm font-normal">
                  Shuffle questions
                </Label>
              </div>

              <div className="space-y-2 rounded-md border border-border/60 p-3">
                <Label>Grading</Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setGradingMode("teacher")}
                    className={`rounded-md border p-2.5 text-left text-xs transition-colors ${
                      gradingMode === "teacher"
                        ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                        : "border-border hover:bg-muted/40"
                    }`}
                  >
                    <p className="text-sm font-medium">Instructor reviews</p>
                    <p className="mt-0.5 text-muted-foreground">
                      Wait for manual grading.
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setGradingMode("auto")}
                    className={`rounded-md border p-2.5 text-left text-xs transition-colors ${
                      gradingMode === "auto"
                        ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                        : "border-border hover:bg-muted/40"
                    }`}
                  >
                    <p className="text-sm font-medium">Auto-grade</p>
                    <p className="mt-0.5 text-muted-foreground">
                      Score shown instantly.
                    </p>
                  </button>
                </div>
                {gradingMode === "auto" && (
                  <div className="flex items-center space-x-2 pt-1">
                    <Checkbox
                      id="showAnswers"
                      checked={showAnswers}
                      onCheckedChange={(checked) => setShowAnswers(checked as boolean)}
                    />
                    <Label htmlFor="showAnswers" className="text-sm font-normal">
                      Reveal correct answers after submission
                    </Label>
                  </div>
                )}
                {gradingMode === "teacher" && (
                  <p className="pt-1 text-xs text-muted-foreground">
                    Students see &quot;awaiting review&quot; until you publish the grade.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Questions</dt>
                  <dd className="font-medium">{questions.length}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Total Points</dt>
                  <dd className="font-medium">{questions.reduce((acc, q) => acc + q.points, 0)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Passing Score</dt>
                  <dd className="font-medium">{passingScore}%</dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
