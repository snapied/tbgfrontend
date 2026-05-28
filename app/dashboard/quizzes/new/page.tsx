"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Plus, Trash2, GripVertical } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  useLMS,
  generateId,
  type Quiz,
  type QuizQuestion,
  type BatchPost,
  type User,
} from "@/lib/lms-store"
import { buildNotifications, type DispatchPayload } from "@/lib/notifications"
import { RichTextEditor } from "@/components/editor/rich-text-editor"
import { AIGenerateButton } from "@/components/ai/ai-generate-button"
import { aiQuizQuestions, aiCourseDescription } from "@/lib/ai-client"
import { ProductTour, TakeATourButton, type TourStep } from "@/components/tour/product-tour"
import { useMemo } from "react"
import { Bell, MessageSquare, Phone, Send, Users2 } from "lucide-react"

// Tour for the create-quiz page. Walks through the title field, AI
// drafter, manual add-question button, and the settings card so a
// brand-new teacher knows what each section does before they start
// typing.
const QUIZZES_NEW_TOUR: TourStep[] = [
  {
    title: "Build a quiz in three steps",
    body: "Title and course, then questions (manually or with AI), then settings. Hit Create when you're happy — you can edit anything later.",
    emoji: "✨",
    placement: "center",
  },
  {
    target: "[data-tour='quiz-basics']",
    title: "Start with the basics",
    body: "Title and course are required. Description is optional but helps students know what they're about to attempt.",
    emoji: "📝",
    placement: "bottom",
  },
  {
    target: "[data-tour='quiz-ai-draft']",
    title: "Skip the blank page",
    body: "Type a title, click Draft questions — AI generates 5 mixed-type questions you can edit. Faster than writing from scratch.",
    emoji: "🤖",
    placement: "left",
  },
  {
    target: "[data-tour='quiz-add-question']",
    title: "Or add questions manually",
    body: "Multiple-choice, true/false, short answer, or long answer. Drag to reorder. Set points per question.",
    emoji: "➕",
    placement: "left",
  },
  {
    target: "[data-tour='quiz-settings']",
    title: "Grading rules",
    body: "Pick auto-graded (students see the score on submit) or teacher-graded (you release results manually). Pass mark, attempt limit, and shuffle live here too.",
    emoji: "⚙️",
    placement: "top",
  },
]

export default function NewQuizPage() {
  const router = useRouter()
  const {
    courses,
    addQuiz,
    enrollments,
    users,
    addNotifications,
    studentGroups,
    addBatchPost,
    currentUser,
  } = useLMS()

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [courseId, setCourseId] = useState("")
  const [timeLimit, setTimeLimit] = useState("")
  const [passingScore, setPassingScore] = useState("60")
  const [maxAttempts, setMaxAttempts] = useState("3")
  const [shuffleQuestions, setShuffleQuestions] = useState(true)
  const [showAnswers, setShowAnswers] = useState(true)
  const [gradingMode, setGradingMode] = useState<"auto" | "teacher">("teacher")
  const [questions, setQuestions] = useState<QuizQuestion[]>([])

  // Assign + notify panel. "All enrolled" is the default — most quizzes
  // go to everyone in the course. The teacher can pick specific student
  // ids (multi-select) or a community to limit the audience.
  type Audience = "all" | "selected" | "community"
  const [audience, setAudience] = useState<Audience>("all")
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([])
  const [communityId, setCommunityId] = useState<string>("")
  const [notifyInApp, setNotifyInApp] = useState(true)
  const [notifyEmail, setNotifyEmail] = useState(true)
  const [notifyWhatsApp, setNotifyWhatsApp] = useState(false)
  const [postToCommunity, setPostToCommunity] = useState(false)

  // The students who would actually receive this quiz, after the
  // course + audience filter. Drives the recipients preview chip + the
  // notification fan-out.
  const enrolledStudents = useMemo<User[]>(() => {
    if (!courseId) {
      // Standalone quiz — all students across all courses
      const allStudentIds = new Set(enrollments.map((e) => e.studentId))
      return users.filter((u) => allStudentIds.has(u.id))
    }
    const studentIds = enrollments
      .filter((e) => e.courseId === courseId)
      .map((e) => e.studentId)
    return users.filter((u) => studentIds.includes(u.id))
  }, [courseId, enrollments, users])

  const targetStudents = useMemo<User[]>(() => {
    if (audience === "selected") {
      return enrolledStudents.filter((u) => selectedStudentIds.includes(u.id))
    }
    if (audience === "community") {
      const group = studentGroups.find((g) => g.id === communityId)
      if (!group) return []
      // Intersect community membership with enrollments — a community
      // member who isn't in this course shouldn't be notified about
      // its quiz.
      return enrolledStudents.filter((u) => group.memberIds.includes(u.id))
    }
    return enrolledStudents
  }, [audience, enrolledStudents, selectedStudentIds, communityId, studentGroups])

  // Communities tied to this course bubble up first; others stay
  // selectable in case the teacher wants to ping a cross-course group
  // (e.g. "Scholarship students").
  const communityOptions = useMemo(() => {
    if (studentGroups.length === 0) return []
    const ranked = [...studentGroups]
    if (courseId) {
      ranked.sort((a, b) => {
        const aMatch = a.courseId === courseId ? 1 : 0
        const bMatch = b.courseId === courseId ? 1 : 0
        return bMatch - aMatch
      })
    }
    return ranked
  }, [studentGroups, courseId])

  const addQuestion = () => {
    const newQuestion: QuizQuestion = {
      id: generateId("q"),
      question: "",
      type: "multiple-choice",
      options: ["", "", "", ""],
      correctAnswer: 0,
      explanation: "",
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

  const handleSubmit = () => {
    if (!title || questions.length === 0) {
      toast.error("Please fill in the title and add at least one question.")
      return
    }

    const newQuiz: Quiz = {
      id: generateId("quiz"),
      title,
      description,
      courseId,
      questions,
      timeLimit: timeLimit ? parseInt(timeLimit) : undefined,
      passingScore: parseInt(passingScore),
      maxAttempts: Math.max(0, parseInt(maxAttempts) || 0),
      shuffleQuestions,
      showAnswers,
      gradingMode,
      createdAt: new Date().toISOString(),
    }

    addQuiz(newQuiz)

    // Fan-out: notify the targeted students (in-app / email / WhatsApp)
    // and optionally post a "New quiz" entry into the picked community's
    // feed. Channel toggles + recipient targeting come from the panel
    // above; respecting them here is what makes the workflow feel
    // intentional instead of a silent save.
    const course = courses.find((c) => c.id === courseId)
    const channelList = [
      notifyInApp ? ("in-app" as const) : null,
      notifyEmail ? ("email" as const) : null,
      notifyWhatsApp ? ("whatsapp" as const) : null,
    ].filter(Boolean) as Array<"in-app" | "email" | "whatsapp">

    if (channelList.length > 0 && targetStudents.length > 0) {
      const payload: DispatchPayload = {
        type: "quiz.published",
        title: `New quiz: ${newQuiz.title}`,
        body: course
          ? `In ${course.title} · ${newQuiz.questions.length} question${newQuiz.questions.length === 1 ? "" : "s"}. Open to attempt.`
          : `${newQuiz.questions.length} question${newQuiz.questions.length === 1 ? "" : "s"}. Open to attempt.`,
        url: `/quiz/${newQuiz.id}`,
        meta: { quizId: newQuiz.id, courseId },
      }
      const entries = buildNotifications(targetStudents, payload, {
        channels: channelList,
      })
      addNotifications(entries)
    }

    if (postToCommunity && communityId && currentUser) {
      const post: BatchPost = {
        id: generateId("post"),
        batchId: communityId,
        authorId: currentUser.id,
        body: `<p><strong>📝 New quiz: ${newQuiz.title}</strong></p>${
          description ? `<p>${description}</p>` : ""
        }<p><a href="/quiz/${newQuiz.id}">Open the quiz →</a></p>`,
        pinned: false,
        hidden: false,
        comments: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      addBatchPost(post)
    }

    const notifyCount = channelList.length > 0 ? targetStudents.length : 0
    if (notifyCount > 0) {
      toast.success(
        `Quiz created · notified ${notifyCount} student${notifyCount === 1 ? "" : "s"}${
          postToCommunity && communityId ? " · posted to community" : ""
        }.`,
      )
    } else if (postToCommunity && communityId) {
      toast.success("Quiz created · posted to community.")
    } else {
      toast.success("Quiz created.")
    }
    router.push("/dashboard/quizzes")
  }

  return (
    <div className="space-y-6">
      <ProductTour tourId="quizzes-new-v1" steps={QUIZZES_NEW_TOUR} />
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/quizzes">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Create Quiz</h1>
            <p className="text-muted-foreground">Build an assessment for your course</p>
          </div>
        </div>
        <div className="flex gap-3">
          <TakeATourButton tourId="quizzes-new-v1" />
          <Button variant="outline" asChild>
            <Link href="/dashboard/quizzes">Cancel</Link>
          </Button>
          <Button onClick={handleSubmit}>Create Quiz</Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Info */}
          <Card data-tour="quiz-basics">
            <CardHeader>
              <CardTitle>Quiz Details</CardTitle>
              <CardDescription>Set up your quiz information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Quiz Title *</Label>
                <Input
                  id="title"
                  placeholder="e.g., Module 1 Assessment"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="description">Description</Label>
                  {/* AI drafter for the description blurb. Uses the
                      course-description endpoint with the quiz title
                      as the topic — the prompt is generic enough that
                      the output reads as a quiz brief, not a course
                      pitch. */}
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
                {/* Rich text instead of a plain Textarea — teachers
                    routinely paste links, lists, and inline formatting
                    into quiz briefings. Shares the same renderer used
                    on the public quiz attempt page. */}
                <RichTextEditor
                  value={description}
                  onChange={setDescription}
                  placeholder="Briefly describe what this quiz covers — pre-reading links, scoring rules, things to bring…"
                  minHeight={140}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="course">Course</Label>
                <Select value={courseId} onValueChange={setCourseId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Standalone (no course)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Standalone (no course)</SelectItem>
                    {courses.map((course) => (
                      <SelectItem key={course.id} value={course.id}>{course.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Optional — leave blank to create a standalone quiz you can share via link.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Questions */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Questions</CardTitle>
                  <CardDescription>{questions.length} questions added</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {/* AI generator — drafts 5 mixed-type questions
                      from the quiz title. Appends to the existing
                      list (doesn't wipe) so the teacher can iterate. */}
                  <span data-tour="quiz-ai-draft">
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
                  <Button onClick={addQuestion} data-tour="quiz-add-question">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Question
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {questions.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border p-8 text-center">
                  <p className="text-muted-foreground">No questions yet. Add your first question to get started.</p>
                </div>
              ) : (
                questions.map((question, index) => (
                  <div key={question.id} className="rounded-lg border border-border p-4">
                    <div className="flex items-start gap-3 mb-4">
                      <GripVertical className="h-5 w-5 text-muted-foreground mt-2" />
                      <div className="flex-1 space-y-4">
                        <div className="flex items-center gap-3">
                          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-medium text-primary-foreground">
                            {index + 1}
                          </span>
                          <Select
                            value={question.type}
                            onValueChange={(v) => {
                              const type = v as QuizQuestion["type"]
                              updateQuestion(question.id, {
                                type,
                                // Reset options + correctAnswer to sensible
                                // defaults per type — leaving the previous
                                // shape behind would confuse the renderer
                                // and the auto-grader.
                                options:
                                  type === "true-false"
                                    ? ["True", "False"]
                                    : type === "multiple-choice"
                                    ? ["", "", "", ""]
                                    : undefined,
                                correctAnswer:
                                  type === "short-answer" || type === "long-answer" ? "" : 0,
                              })
                            }}
                          >
                            <SelectTrigger className="w-40">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="multiple-choice">Multiple Choice</SelectItem>
                              <SelectItem value="true-false">True/False</SelectItem>
                              <SelectItem value="short-answer">Short Answer</SelectItem>
                              <SelectItem value="long-answer">Long Answer (essay)</SelectItem>
                            </SelectContent>
                          </Select>
                          <Input
                            type="number"
                            value={question.points}
                            onChange={(e) => updateQuestion(question.id, { points: parseInt(e.target.value) || 0 })}
                            className="w-24"
                            placeholder="Points"
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteQuestion(question.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                        
                        <Textarea
                          placeholder="Enter your question..."
                          value={question.question}
                          onChange={(e) => updateQuestion(question.id, { question: e.target.value })}
                          rows={2}
                        />

                        {question.type === "multiple-choice" && question.options && (
                          <div className="space-y-2">
                            <Label>Options (select the correct answer)</Label>
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
                                  placeholder={`Option ${optIndex + 1}`}
                                  value={option}
                                  onChange={(e) => updateOption(question.id, optIndex, e.target.value)}
                                />
                              </div>
                            ))}
                          </div>
                        )}

                        {question.type === "true-false" && (
                          <div className="space-y-2">
                            <Label>Correct Answer</Label>
                            <div className="flex gap-4">
                              <label className="flex items-center gap-2">
                                <input
                                  type="radio"
                                  name={`correct-${question.id}`}
                                  checked={question.correctAnswer === 0}
                                  onChange={() => updateQuestion(question.id, { correctAnswer: 0 })}
                                />
                                True
                              </label>
                              <label className="flex items-center gap-2">
                                <input
                                  type="radio"
                                  name={`correct-${question.id}`}
                                  checked={question.correctAnswer === 1}
                                  onChange={() => updateQuestion(question.id, { correctAnswer: 1 })}
                                />
                                False
                              </label>
                            </div>
                          </div>
                        )}

                        {question.type === "short-answer" && (
                          <div className="space-y-2">
                            <Label>Correct Answer</Label>
                            <Input
                              placeholder="Expected answer"
                              value={question.correctAnswer as string}
                              onChange={(e) => updateQuestion(question.id, { correctAnswer: e.target.value })}
                            />
                          </div>
                        )}

                        {question.type === "long-answer" && (
                          <div className="space-y-2">
                            <Label>Model answer / rubric (optional)</Label>
                            {/* Essay-style questions don't auto-grade.
                                The model answer is shown to the teacher
                                in the review queue + optionally to the
                                student once results are released. */}
                            <RichTextEditor
                              value={(question.correctAnswer as string) ?? ""}
                              onChange={(html) => updateQuestion(question.id, { correctAnswer: html })}
                              placeholder="Notes for the teacher, an exemplar answer, or rubric points to look for."
                              minHeight={140}
                            />
                            <p className="text-[11px] text-muted-foreground">
                              Long-answer questions are reviewed manually — there's no automatic
                              scoring. Students answer with the same rich-text editor.
                            </p>
                          </div>
                        )}

                        <div className="space-y-2">
                          <Label>Explanation (shown after answering)</Label>
                          <Input
                            placeholder="Explain why this is the correct answer..."
                            value={question.explanation || ""}
                            onChange={(e) => updateQuestion(question.id, { explanation: e.target.value })}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Settings */}
          <Card data-tour="quiz-settings">
            <CardHeader>
              <CardTitle>Quiz Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="timeLimit">Time Limit (minutes)</Label>
                <Input
                  id="timeLimit"
                  type="number"
                  placeholder="No limit"
                  value={timeLimit}
                  onChange={(e) => setTimeLimit(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">Leave empty for no time limit</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="passingScore">Passing Score (%)</Label>
                <Input
                  id="passingScore"
                  type="number"
                  value={passingScore}
                  onChange={(e) => setPassingScore(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxAttempts">Max Attempts</Label>
                <Input
                  id="maxAttempts"
                  type="number"
                  min={0}
                  value={maxAttempts}
                  onChange={(e) => setMaxAttempts(String(Math.max(0, Number(e.target.value) || 0)))}
                />
                <p className="text-xs text-muted-foreground">0 = unlimited attempts</p>
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="shuffle">Shuffle Questions</Label>
                <Switch
                  id="shuffle"
                  checked={shuffleQuestions}
                  onCheckedChange={setShuffleQuestions}
                />
              </div>

              <div className="space-y-2 rounded-md border border-border/60 p-3">
                <Label>Grading</Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setGradingMode("teacher")}
                    className={`rounded-md border p-3 text-left text-sm transition-colors ${
                      gradingMode === "teacher"
                        ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                        : "border-border hover:bg-muted/40"
                    }`}
                  >
                    <p className="font-medium">Instructor reviews</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Submissions wait for manual grading.
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setGradingMode("auto")}
                    className={`rounded-md border p-3 text-left text-sm transition-colors ${
                      gradingMode === "auto"
                        ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                        : "border-border hover:bg-muted/40"
                    }`}
                  >
                    <p className="font-medium">Auto-grade</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Score is calculated and shown instantly.
                    </p>
                  </button>
                </div>
                {gradingMode === "auto" && (
                  <div className="flex items-center justify-between pt-2">
                    <Label htmlFor="showAnswers" className="text-sm font-normal">
                      Reveal correct answers after submit
                    </Label>
                    <Switch
                      id="showAnswers"
                      checked={showAnswers}
                      onCheckedChange={setShowAnswers}
                    />
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

          {/* Assign + notify */}
          <Card data-tour="quiz-assign">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="h-4 w-4 text-muted-foreground" />
                Assign & notify
              </CardTitle>
              <CardDescription>
                Who gets this quiz, and how they hear about it.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {enrolledStudents.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  {courseId ? "No students enrolled in this course yet." : "No students enrolled yet. You can still share the quiz via link after creating it."}
                </p>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label>Audience</Label>
                    <Select value={audience} onValueChange={(v) => setAudience(v as Audience)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">
                          {courseId ? `Everyone enrolled (${enrolledStudents.length})` : `All students (${enrolledStudents.length})`}
                        </SelectItem>
                        <SelectItem value="selected">Specific students…</SelectItem>
                        <SelectItem value="community" disabled={communityOptions.length === 0}>
                          A community / batch
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {audience === "selected" && (
                    <div className="space-y-2">
                      <Label>Pick students</Label>
                      <div className="max-h-48 space-y-1.5 overflow-y-auto rounded-md border border-border/60 p-2">
                        {enrolledStudents.length === 0 ? (
                          <p className="text-xs text-muted-foreground">
                            No students enrolled yet.
                          </p>
                        ) : (
                          enrolledStudents.map((s) => {
                            const checked = selectedStudentIds.includes(s.id)
                            return (
                              <label
                                key={s.id}
                                className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-muted/60"
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={(e) => {
                                    setSelectedStudentIds((prev) =>
                                      e.target.checked
                                        ? [...prev, s.id]
                                        : prev.filter((id) => id !== s.id),
                                    )
                                  }}
                                />
                                <span className="truncate">{s.name}</span>
                                <span className="ml-auto truncate text-xs text-muted-foreground">
                                  {s.email}
                                </span>
                              </label>
                            )
                          })
                        )}
                      </div>
                    </div>
                  )}

                  {audience === "community" && (
                    <div className="space-y-2">
                      <Label>Community</Label>
                      <Select value={communityId} onValueChange={setCommunityId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Pick a community" />
                        </SelectTrigger>
                        <SelectContent>
                          {communityOptions.map((g) => (
                            <SelectItem key={g.id} value={g.id}>
                              {g.name}
                              {g.courseId === courseId ? " (this course)" : ""} ·{" "}
                              {g.memberIds.length} members
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="rounded-md border border-border/60 bg-muted/30 p-3 text-xs text-muted-foreground">
                    <Users2 className="mr-1 inline-block h-3 w-3" />
                    <span className="font-medium text-foreground">
                      {targetStudents.length} student{targetStudents.length === 1 ? "" : "s"}
                    </span>{" "}
                    will receive this quiz when you publish.
                  </div>

                  <div className="space-y-2">
                    <Label>Notify via</Label>
                    <ChannelToggle
                      icon={<Bell className="h-4 w-4 text-muted-foreground" />}
                      label="In-app"
                      description="Shows in the student's inbox + bell."
                      checked={notifyInApp}
                      onChange={setNotifyInApp}
                    />
                    <ChannelToggle
                      icon={<MessageSquare className="h-4 w-4 text-muted-foreground" />}
                      label="Email"
                      description="Sends a transactional email per recipient."
                      checked={notifyEmail}
                      onChange={setNotifyEmail}
                    />
                    <ChannelToggle
                      icon={<Phone className="h-4 w-4 text-muted-foreground" />}
                      label="WhatsApp"
                      description="Only fires for students with a phone on file."
                      checked={notifyWhatsApp}
                      onChange={setNotifyWhatsApp}
                    />
                  </div>

                  {communityOptions.length > 0 && (
                    <div className="flex items-start justify-between gap-3 rounded-md border border-border/60 p-3">
                      <div>
                        <p className="text-sm font-medium">Post to community</p>
                        <p className="text-xs text-muted-foreground">
                          Drops a &ldquo;New quiz&rdquo; entry into{" "}
                          {communityOptions.find((g) => g.id === communityId)?.name ??
                            "the picked community"}
                          &apos;s Common Room.
                        </p>
                      </div>
                      <Switch
                        checked={postToCommunity}
                        onCheckedChange={(v) => {
                          setPostToCommunity(v)
                          // Default the community to a course-tied one if
                          // the teacher opts in without picking yet.
                          if (v && !communityId) {
                            const auto = communityOptions[0]?.id
                            if (auto) setCommunityId(auto)
                          }
                        }}
                        disabled={!communityId && communityOptions.length === 0}
                      />
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Questions</span>
                <span className="font-medium">{questions.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Points</span>
                <span className="font-medium">{questions.reduce((acc, q) => acc + q.points, 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Passing Score</span>
                <span className="font-medium">{passingScore}%</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function ChannelToggle({
  icon,
  label,
  description,
  checked,
  onChange,
}: {
  icon: React.ReactNode
  label: string
  description: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-md border border-border/60 p-2.5">
      <div className="flex items-start gap-2">
        <div className="mt-0.5">{icon}</div>
        <div>
          <p className="text-sm font-medium">{label}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  )
}
