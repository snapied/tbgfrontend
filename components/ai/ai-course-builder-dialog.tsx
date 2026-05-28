"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import Link from "next/link"
import { Sparkles, Loader2, X, CheckCircle2, AlertTriangle, ChevronDown, Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import { Switch } from "@/components/ui/switch"
import { Progress } from "@/components/ui/progress"
import { CategoryCombobox } from "@/components/course-editor/category-combobox"
import { COURSE_LANGUAGES } from "@/lib/course-languages"
import {
  fetchAIStatus,
  aiGenerateFullCourse,
  type AIStatus,
  type CourseBuilderInput,
  type CourseBuilderProgress,
  type GeneratedCourse,
} from "@/lib/ai-client"
import { cn } from "@/lib/utils"

type DialogState = "form" | "generating" | "complete" | "error"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Pre-fill the title field if the user already typed one. */
  initialTitle?: string
  /** Called when the user accepts the generated course. */
  onCourseGenerated: (course: GeneratedCourse, input: CourseBuilderInput) => void
}

const TONE_OPTIONS = [
  { value: "conversational", label: "Conversational" },
  { value: "formal", label: "Formal / Academic" },
  { value: "practical", label: "Practical / Hands-on" },
  { value: "encouraging", label: "Encouraging / Kids-friendly" },
]

const DURATION_OPTIONS = [
  { value: "Short (1-2 hours)", label: "Short (1-2 hours)" },
  { value: "Medium (3-5 hours)", label: "Medium (3-5 hours)" },
  { value: "Full (8-12 hours)", label: "Full (8-12 hours)" },
]

export function AICourseBuilderDialog({
  open,
  onOpenChange,
  initialTitle = "",
  onCourseGenerated,
}: Props) {
  // ── Plan gate ────────────────────────────────────────────────────
  const [aiStatus, setAiStatus] = useState<AIStatus | null>(null)
  useEffect(() => {
    if (!open) return
    let cancelled = false
    void fetchAIStatus().then((s) => {
      if (!cancelled) setAiStatus(s)
    })
    return () => { cancelled = true }
  }, [open])

  // ── Form state ──────────────────────────────────────────────────
  const [title, setTitle] = useState(initialTitle)
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState("")
  const [audience, setAudience] = useState("")
  const [level, setLevel] = useState<"beginner" | "intermediate" | "advanced">("beginner")
  const [language, setLanguage] = useState("English")
  const [tone, setTone] = useState("conversational")
  const [duration, setDuration] = useState("Medium (3-5 hours)")
  const [price, setPrice] = useState("")
  const [originalPrice, setOriginalPrice] = useState("")
  const [keywords, setKeywords] = useState("")
  const [quizPerModule, setQuizPerModule] = useState(true)
  const [customInstructions, setCustomInstructions] = useState("")
  const [showAdvanced, setShowAdvanced] = useState(false)

  // ── Generation state ────────────────────────────────────────────
  const [dialogState, setDialogState] = useState<DialogState>("form")
  const [progress, setProgress] = useState<CourseBuilderProgress>({
    stage: "",
    step: 0,
    totalSteps: 1,
  })
  const [generatedCourse, setGeneratedCourse] = useState<GeneratedCourse | null>(null)
  const [errorMessage, setErrorMessage] = useState("")
  const abortRef = useRef<AbortController | null>(null)

  const resetForm = useCallback(() => {
    setDialogState("form")
    setProgress({ stage: "", step: 0, totalSteps: 1 })
    setGeneratedCourse(null)
    setErrorMessage("")
  }, [])

  const handleGenerate = useCallback(async () => {
    if (!title.trim()) return

    const input: CourseBuilderInput = {
      title: title.trim(),
      description: description.trim() || undefined,
      category: category || undefined,
      audience: audience.trim() || undefined,
      level,
      language,
      tone,
      duration,
      price: price ? parseFloat(price) : undefined,
      originalPrice: originalPrice ? parseFloat(originalPrice) : undefined,
      keywords: keywords.trim()
        ? keywords.split(",").map((k) => k.trim()).filter(Boolean)
        : undefined,
      quizPerModule,
      customInstructions: customInstructions.trim() || undefined,
    }

    setDialogState("generating")
    setProgress({ stage: "Starting...", step: 0, totalSteps: 1 })

    const controller = new AbortController()
    abortRef.current = controller

    const result = await aiGenerateFullCourse(
      input,
      (p) => setProgress(p),
      controller.signal,
    )

    abortRef.current = null

    if ("error" in result) {
      if (result.error === "Generation cancelled") {
        resetForm()
      } else {
        setErrorMessage(result.error)
        setDialogState("error")
      }
    } else {
      setGeneratedCourse(result)
      setDialogState("complete")
    }
  }, [title, description, category, audience, level, language, tone, duration, price, originalPrice, keywords, quizPerModule, customInstructions, resetForm])

  const handleCancel = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    resetForm()
  }, [resetForm])

  const handleAccept = useCallback(() => {
    if (!generatedCourse) return
    const input: CourseBuilderInput = {
      title: title.trim(),
      price: price ? parseFloat(price) : undefined,
      originalPrice: originalPrice ? parseFloat(originalPrice) : undefined,
      category: category || undefined,
      level,
      language,
    }
    onCourseGenerated(generatedCourse, input)
    onOpenChange(false)
    // Reset for next use.
    setTimeout(resetForm, 300)
  }, [generatedCourse, title, price, originalPrice, category, level, language, onCourseGenerated, onOpenChange, resetForm])

  const handleOpenChange = useCallback(
    (v: boolean) => {
      // Prevent closing during generation.
      if (dialogState === "generating" && !v) return
      onOpenChange(v)
      if (!v) setTimeout(resetForm, 300)
    },
    [dialogState, onOpenChange, resetForm],
  )

  const progressPercent = progress.totalSteps > 0
    ? Math.round((progress.step / progress.totalSteps) * 100)
    : 0

  const totalLessons = generatedCourse
    ? generatedCourse.modules.reduce((sum, m) => sum + m.lessons.length, 0)
    : 0
  const totalDuration = generatedCourse
    ? generatedCourse.modules.reduce(
        (sum, m) => sum + m.lessons.reduce((s, l) => s + l.estimatedMinutes, 0),
        0,
      )
    : 0

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="max-w-4xl sm:max-w-[var(--container-2xl)] max-h-[90vh] overflow-y-auto"
        onInteractOutside={(e) => {
          if (dialogState === "generating") e.preventDefault()
        }}
        onEscapeKeyDown={(e) => {
          if (dialogState === "generating") e.preventDefault()
        }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Course Builder
          </DialogTitle>
          <DialogDescription>
            {(!aiStatus || !aiStatus.planAllowed) && aiStatus?.configured
              ? "This feature requires a Pro plan or above."
              : dialogState === "form"
                ? "Provide a few details and AI will generate a complete, production-ready course for you."
                : dialogState === "generating"
                  ? "Building your course..."
                  : dialogState === "complete"
                    ? "Your course is ready!"
                    : "Something went wrong during generation."}
          </DialogDescription>
        </DialogHeader>

        {/* ── PLAN GATE ───────────────────────────────────────────── */}
        {aiStatus !== null && !aiStatus.planAllowed && (
          <div className="py-12 space-y-6 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/10">
              <Lock className="h-8 w-8 text-amber-500" />
            </div>
            <div className="space-y-2">
              <p className="text-lg font-semibold">Pro Feature</p>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                AI Course Builder is available on Pro and above plans.
                Upgrade to generate complete courses with AI-powered content,
                quizzes, and SEO metadata in one click.
              </p>
            </div>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button asChild className="gap-2">
                <Link href="/dashboard/billing">
                  <Sparkles className="h-4 w-4" />
                  Upgrade to Pro
                </Link>
              </Button>
            </div>
          </div>
        )}

        {/* ── LOADING AI STATUS ───────────────────────────────────── */}
        {aiStatus === null && (
          <div className="py-12 flex justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* ── FORM STATE ──────────────────────────────────────────── */}
        {aiStatus?.planAllowed && dialogState === "form" && (
          <div className="space-y-5 pt-2">
            {/* Title (required) */}
            <div className="space-y-1.5">
              <Label htmlFor="ai-title">
                Course Title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="ai-title"
                placeholder="e.g. Introduction to Python Programming"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                autoFocus
              />
            </div>

            {/* Description (optional) */}
            <div className="space-y-1.5">
              <Label htmlFor="ai-desc">
                Description{" "}
                <span className="text-muted-foreground text-xs font-normal">
                  (leave blank to auto-generate)
                </span>
              </Label>
              <Textarea
                id="ai-desc"
                placeholder="Brief description of what the course should cover..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>

            {/* Row: Category + Level */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Category</Label>
                <CategoryCombobox
                  id="ai-category"
                  value={category}
                  onChange={setCategory}
                  placeholder="Select category..."
                />
              </div>
              <div className="space-y-1.5">
                <Label>Level</Label>
                <Select value={level} onValueChange={(v) => setLevel(v as typeof level)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">Beginner</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Row: Audience + Language */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="ai-audience">Target Audience</Label>
                <Input
                  id="ai-audience"
                  placeholder="e.g. College students, Working professionals"
                  value={audience}
                  onChange={(e) => setAudience(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Language</Label>
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COURSE_LANGUAGES.filter((l) => l.available).map((l) => (
                      <SelectItem key={l.name} value={l.name}>
                        {l.name}{l.native ? ` (${l.native})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Row: Tone + Duration */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Tone / Style</Label>
                <Select value={tone} onValueChange={setTone}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TONE_OPTIONS.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Estimated Duration</Label>
                <Select value={duration} onValueChange={setDuration}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DURATION_OPTIONS.map((d) => (
                      <SelectItem key={d.value} value={d.value}>
                        {d.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Row: Price + Original Price */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="ai-price">
                  Selling Price{" "}
                  <span className="text-muted-foreground text-xs font-normal">
                    (0 = free)
                  </span>
                </Label>
                <Input
                  id="ai-price"
                  type="number"
                  min="0"
                  placeholder="0"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ai-original-price">
                  Original Price{" "}
                  <span className="text-muted-foreground text-xs font-normal">
                    (optional strikethrough)
                  </span>
                </Label>
                <Input
                  id="ai-original-price"
                  type="number"
                  min="0"
                  placeholder="0"
                  value={originalPrice}
                  onChange={(e) => setOriginalPrice(e.target.value)}
                />
              </div>
            </div>

            {/* Keywords */}
            <div className="space-y-1.5">
              <Label htmlFor="ai-keywords">
                Keywords / Tags{" "}
                <span className="text-muted-foreground text-xs font-normal">
                  (comma-separated)
                </span>
              </Label>
              <Input
                id="ai-keywords"
                placeholder="e.g. python, programming, beginner, data science"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
              />
            </div>

            {/* Quiz toggle */}
            <div className="flex items-center gap-3">
              <Switch
                id="ai-quiz"
                checked={quizPerModule}
                onCheckedChange={setQuizPerModule}
              />
              <Label htmlFor="ai-quiz" className="cursor-pointer">
                Generate quizzes for each module
              </Label>
            </div>

            {/* Advanced section (collapsible) */}
            <div className="border rounded-lg">
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex w-full items-center justify-between px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Advanced Options
                <ChevronDown
                  className={cn(
                    "h-4 w-4 transition-transform",
                    showAdvanced && "rotate-180",
                  )}
                />
              </button>
              {showAdvanced && (
                <div className="px-4 pb-4 space-y-1.5">
                  <Label htmlFor="ai-instructions">Custom Instructions</Label>
                  <Textarea
                    id="ai-instructions"
                    placeholder="Any specific instructions for the AI, e.g. 'Focus on real-world examples', 'Include code snippets', 'Keep explanations simple'..."
                    value={customInstructions}
                    onChange={(e) => setCustomInstructions(e.target.value)}
                    rows={3}
                  />
                </div>
              )}
            </div>

            {/* Generate button */}
            <Button
              onClick={handleGenerate}
              disabled={!title.trim()}
              className="w-full gap-2"
              size="lg"
            >
              <Sparkles className="h-4 w-4" />
              Generate Course
            </Button>
          </div>
        )}

        {/* ── GENERATING STATE ────────────────────────────────────── */}
        {dialogState === "generating" && (
          <div className="py-12 space-y-8 text-center">
            <div className="flex justify-center">
              <div className="relative">
                <Sparkles className="h-12 w-12 text-primary animate-pulse" />
                <Loader2 className="absolute -top-1 -right-1 h-5 w-5 text-primary/60 animate-spin" />
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-lg font-medium">{progress.stage || "Starting..."}</p>
              {progress.detail && (
                <p className="text-sm text-muted-foreground">{progress.detail}</p>
              )}
            </div>

            <div className="max-w-md mx-auto space-y-2">
              <Progress value={progressPercent} className="h-2" />
              <p className="text-xs text-muted-foreground">
                Step {progress.step} of {progress.totalSteps}
              </p>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleCancel}
              className="gap-1.5"
            >
              <X className="h-3.5 w-3.5" />
              Cancel
            </Button>
          </div>
        )}

        {/* ── COMPLETE STATE ──────────────────────────────────────── */}
        {dialogState === "complete" && generatedCourse && (
          <div className="py-6 space-y-6">
            <div className="flex justify-center">
              <CheckCircle2 className="h-12 w-12 text-green-500" />
            </div>

            <div className="text-center space-y-1">
              <p className="text-lg font-semibold">{generatedCourse.title}</p>
              {generatedCourse.subtitle && (
                <p className="text-sm text-muted-foreground">{generatedCourse.subtitle}</p>
              )}
            </div>

            {/* Summary stats */}
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="rounded-lg border p-3">
                <p className="text-2xl font-bold">{generatedCourse.modules.length}</p>
                <p className="text-xs text-muted-foreground">Modules</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-2xl font-bold">{totalLessons}</p>
                <p className="text-xs text-muted-foreground">Lessons</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-2xl font-bold">
                  {totalDuration >= 60
                    ? `${Math.round(totalDuration / 60)}h`
                    : `${totalDuration}m`}
                </p>
                <p className="text-xs text-muted-foreground">Duration</p>
              </div>
            </div>

            {/* Module list preview */}
            <div className="rounded-lg border divide-y max-h-48 overflow-y-auto">
              {generatedCourse.modules.map((mod, i) => (
                <div key={i} className="px-4 py-2.5">
                  <p className="text-sm font-medium">
                    {i + 1}. {mod.title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {mod.lessons.length} lessons
                    {mod.quiz ? ` + ${mod.quiz.length} quiz questions` : ""}
                  </p>
                </div>
              ))}
            </div>

            {generatedCourse.failedLessons > 0 && (
              <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm">
                <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                <p className="text-amber-700 dark:text-amber-400">
                  {generatedCourse.failedLessons} lesson(s) could not be generated. You can
                  regenerate them individually from the course editor.
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  onOpenChange(false)
                  setTimeout(resetForm, 300)
                }}
              >
                Cancel
              </Button>
              <Button className="flex-1 gap-2" onClick={handleAccept}>
                <CheckCircle2 className="h-4 w-4" />
                Create as Draft
              </Button>
            </div>
          </div>
        )}

        {/* ── ERROR STATE ─────────────────────────────────────────── */}
        {dialogState === "error" && (
          <div className="py-8 space-y-6 text-center">
            <div className="flex justify-center">
              <AlertTriangle className="h-12 w-12 text-destructive" />
            </div>

            <div className="space-y-2">
              <p className="text-lg font-medium">Generation Failed</p>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                {errorMessage}
              </p>
            </div>

            <div className="flex gap-3 justify-center">
              <Button
                variant="outline"
                onClick={() => {
                  onOpenChange(false)
                  setTimeout(resetForm, 300)
                }}
              >
                Cancel
              </Button>
              <Button onClick={() => { resetForm(); setDialogState("form") }}>
                Try Again
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
