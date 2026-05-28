"use client"

import { Suspense, useCallback, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Plus, Trash2, Award } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
import { useLMS, generateId, type Course, type Module } from "@/lib/lms-store"
import { slugify } from "@/lib/lesson-utils"
import { usePlan } from "@/lib/use-plan"
import { PlanGatedCard } from "@/components/dashboard/plan-lock"
import { isBuiltinTemplateId } from "@/lib/certificate-templates"
import { CertificateTemplatePicker } from "@/components/course-editor/certificate-template-picker"
import { CategoryCombobox } from "@/components/course-editor/category-combobox"
import { cn } from "@/lib/utils"
import { ThumbnailField } from "@/components/upload/thumbnail-field"
import { VideoUrlPreview } from "@/components/upload/video-url-preview"
import { CurriculumEditor } from "@/components/course-editor/curriculum-editor"
import { useOrgSettings } from "@/lib/org-settings"
import { SUPPORTED_CURRENCIES, currencyInfo } from "@/lib/currency"
import { useUnsavedChangesGuard } from "@/lib/use-unsaved-changes-guard"
import { RichTextEditor } from "@/components/editor/rich-text-editor"
import { isRichTextEmpty } from "@/components/editor/rich-text-content"
import { ProductTour, TakeATourButton, type TourStep } from "@/components/tour/product-tour"
import { AIGenerateButton } from "@/components/ai/ai-generate-button"
import { AICourseBuilderDialog } from "@/components/ai/ai-course-builder-dialog"
import { aiCourseDescription, aiCourseOutline, type GeneratedCourse, type CourseBuilderInput } from "@/lib/ai-client"
import { toast } from "sonner"
import { COURSE_LANGUAGES } from "@/lib/course-languages"

// Step-by-step tour for the Create Course form. Walks through:
//   1. Welcome (centered intro)
//   2. The Simple/Advanced mode pill — what it controls
//   3-6. The four sections that ALWAYS show (title, thumbnail, pricing, curriculum)
//   7-8. Auto-flips into Advanced via `beforeShow` so the user can SEE the
//        certificate/outcomes/requirements cards appear, then flips back.
//
// The toggle is flipped by programmatic click events on its data-tour
// attribute — same handler the user would invoke, so state + localStorage
// stay in sync. We end the tour back in Simple so the preference doesn't
// change unexpectedly after the user finishes the tour.
const NEW_COURSE_TOUR: TourStep[] = [
  {
    placement: "center",
    title: "Welcome to course creation",
    body: "Two-minute walkthrough of what each section is for and how the form adapts to your needs. Hit Next, or close to skip.",
    emoji: "🎓",
  },
  {
    target: "[data-tour='course-mode-toggle']",
    title: "Simple by default — Advanced when you need it",
    body: "Simple mode shows only the four essentials so you can ship a course fast. Switch to Advanced to add Learning Outcomes, a Certificate template, and Requirements. Your choice sticks across sessions.",
    emoji: "🎚️",
  },
  {
    // Make sure we're in Simple before showing the rest of the simple
    // walkthrough — even if the user previously toggled to Advanced.
    beforeShow: "[data-tour='course-mode-toggle'][data-mode='advanced']",
    target: "[data-tour='course-basic-info']",
    title: "Basic information",
    body: "The only required field is the title. Subtitle, description, category, and level all have sensible defaults — fill them when you have time.",
    emoji: "📝",
  },
  {
    target: "[data-tour='course-curriculum']",
    title: "Course curriculum",
    body: "Add modules and lessons here. You can also build curriculum after creating the course — many teachers ship a skeleton first and flesh it out as they teach.",
    emoji: "📚",
  },
  {
    target: "[data-tour='course-thumbnail']",
    title: "Course thumbnail",
    body: "Upload your own image, search Unsplash, or design one inline. The thumbnail is the single biggest click-through signal on your public catalogue.",
    emoji: "🖼️",
  },
  {
    target: "[data-tour='course-pricing']",
    title: "Pricing",
    body: "Leave the price blank or set 0 to make the course free. Currency defaults to your workspace setting. Optional original-price field shows a discount strike-through on the public page.",
    emoji: "💰",
  },
  {
    // Flip to Advanced so the next step's target exists in the DOM.
    beforeShow: "[data-tour='course-mode-toggle'][data-mode='simple']",
    target: "[data-tour='course-certificate']",
    title: "Advanced: Certificate, Outcomes, Requirements",
    body: "Flipping to Advanced adds a Certificate template picker, a Learning Outcomes list, and a Requirements list. All optional — you can also set these from the course settings page later.",
    emoji: "✨",
  },
  {
    // Flip back to Simple so the user's preference returns to the
    // lighter default after the tour. Last centered card.
    beforeShow: "[data-tour='course-mode-toggle'][data-mode='advanced']",
    placement: "center",
    title: "You're set",
    body: "Title, thumbnail, and you can hit Create. Everything else is editable from the course detail page after creation. Click Take a tour anytime if you want to see this again.",
    emoji: "🚀",
  },
]

// Next.js 16's static prerender flags useSearchParams() without a
// Suspense boundary. Tiny wrapper here keeps the rest of the page
// unchanged.
export default function NewCoursePage() {
  return (
    <Suspense fallback={null}>
      <NewCoursePageInner />
    </Suspense>
  )
}

function NewCoursePageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { addCourse, currentUser, courses } = useLMS()
  // Hard cap enforcement at the form level — the courses list page
  // already swaps the "Create" button for "Upgrade" when at cap, but
  // a direct URL hit to /dashboard/courses/new would bypass that.
  // We block the submit here too so the cap is a real boundary on
  // every entry point, not just the index card.
  const { usageRemaining, limits, hydrated: planHydrated } = usePlan()
  // Count ONLY currently-published courses against the published-courses
  // cap. The previous `courses.length` lumped drafts + archived in too,
  // so a workspace with five drafts on a 5-published plan couldn't create
  // even a sixth draft (which won't count toward the cap until publish).
  const publishedCount = courses.filter((c) => c.status === "published").length
  const remainingCourses = usageRemaining("publishedCourses", publishedCount)
  const atCourseCap =
    planHydrated && remainingCourses !== Infinity && remainingCourses <= 0
  const courseCap = limits.publishedCourses
  // useOrgSettings used to seed the currency default; now redundant
  // (INR-only v1). The hook still runs for its side-effects on the
  // store init, so we keep the call and discard the value.
  useOrgSettings()

  // Pre-allocate the course id at mount time so course-scoped resources
  // (quizzes, live sessions) the user creates inline from the curriculum
  // editor can attach to a real id before the course itself is saved.
  // On submit we reuse this same id, so the linkage carries through. If
  // the user abandons the form, the attached resources stay in storage
  // unused — a minor cost for the much cleaner inline-create UX.
  const [courseDraftId] = useState(() => generateId("course"))

  // If the user arrived from /dashboard/templates with ?cert=<id>, treat that
  // as "they already picked a certificate" — pre-select the template and turn
  // the eligibility toggle on. Otherwise certificates default to OFF (most
  // first-time courses are not certificate-bearing).
  const presetCert = searchParams?.get("cert") ?? null
  const initialCert: string = presetCert && isBuiltinTemplateId(presetCert) ? presetCert : "modern"

  const [title, setTitle] = useState("")
  // Short single-line hook shown on course cards, search results, and the
  // public catalogue. Lives on the Course type as `subtitle?` and is the
  // single biggest SEO + click-through signal we can collect at create
  // time, so it's surfaced here even though the bulk description lives
  // below it.
  const [subtitle, setSubtitle] = useState("")
  const [description, setDescription] = useState("")
  const [thumbnail, setThumbnail] = useState("")
  // Optional preview trailer URL (YouTube, Vimeo, Loom, MP4). The public
  // course page autoplays this when a visitor opens the listing — the
  // biggest single conversion lever for paid courses.
  const [introVideoUrl, setIntroVideoUrl] = useState("")
  const [category, setCategory] = useState("")
  const [level, setLevel] = useState<"beginner" | "intermediate" | "advanced">("beginner")
  const [price, setPrice] = useState("")
  const [originalPrice, setOriginalPrice] = useState("")
  // Per-course currency — seeded from the workspace default the teacher set
  // (or the country-derived default if they haven't touched it). The picker
  // below lets them override per course in case they want e.g. one INR
  // course and one USD course on the same workspace.
  // INR-only on v1. settings.defaultCurrency exists for the eventual
  // multi-currency world but the settings picker is currently locked
  // to INR. Forcing INR here also covers any grandfathered legacy
  // value persisted before the lock.
  const [currency, setCurrency] = useState<string>("INR")
  const [language, setLanguage] = useState("English")
  const [certificateEligible, setCertificateEligible] = useState<boolean>(
    !!presetCert && isBuiltinTemplateId(presetCert)
  )
  const [certificateTemplate, setCertificateTemplate] = useState<string>(initialCert)
  const [modules, setModules] = useState<Module[]>([])
  // Per-field validation errors keyed by field name. Populated by
  // handleSubmit; cleared as the user edits the field. Drives both the
  // red border on the input and an inline helper line below it.
  const [errors, setErrors] = useState<Record<string, string>>({})
  const clearError = (field: string) =>
    setErrors((e) => (e[field] ? { ...e, [field]: "" } : e))
  const [whatYouLearn, setWhatYouLearn] = useState<string[]>([""])
  const [requirements, setRequirements] = useState<string[]>([""])
  const [features, setFeatures] = useState<string[]>(["Certificate of completion"])

  // "Dirty" if any field has moved off its initial empty state. We exclude
  // settings-derived defaults (currency, language) since they're not really
  // user input. Used to decide whether to nag on Back / Cancel / refresh.
  const dirty =
    !!title.trim() ||
    !!subtitle.trim() ||
    // Tiptap emits "<p></p>" for an empty doc; isRichTextEmpty strips
    // tags before deciding so a fresh form doesn't look dirty.
    !isRichTextEmpty(description) ||
    !!thumbnail ||
    !!introVideoUrl.trim() ||
    !!category ||
    !!price.trim() ||
    !!originalPrice.trim() ||
    modules.length > 0 ||
    whatYouLearn.some((w) => w.trim()) ||
    requirements.some((r) => r.trim()) ||
    // The initial "Certificate of completion" entry doesn't count as dirty.
    features.filter((f) => f.trim() && f !== "Certificate of completion").length > 0

  // Once Create has fired we route away on purpose — disarm the guard right
  // before navigation so we don't double-prompt the user on a successful save.
  const [submitting, setSubmitting] = useState(false)

  // Simple vs Advanced form mode. Simple (the default for first-timers)
  // hides three optional sections — learning outcomes, requirements,
  // certificate template — so a teacher can ship a course with just
  // title + description + thumbnail + price. Power users flip to
  // Advanced and the preference sticks across sessions.
  const FORM_MODE_KEY = "courses:new:formMode"
  const [formMode, setFormMode] = useState<"simple" | "advanced">("simple")
  useEffect(() => {
    if (typeof window === "undefined") return
    try {
      const saved = window.localStorage.getItem(FORM_MODE_KEY)
      if (saved === "simple" || saved === "advanced") setFormMode(saved)
    } catch {
      /* localStorage disabled — keep default */
    }
  }, [])
  const toggleFormMode = () => {
    setFormMode((prev) => {
      const next = prev === "simple" ? "advanced" : "simple"
      try {
        window.localStorage.setItem(FORM_MODE_KEY, next)
      } catch {
        /* ignore */
      }
      return next
    })
  }
  const isAdvanced = formMode === "advanced"
  const { confirmLeave } = useUnsavedChangesGuard(dirty && !submitting)

  // ── AI Course Builder dialog state ────────────────────────────
  const [aiBuilderOpen, setAiBuilderOpen] = useState(false)

  const handleAICourseGenerated = useCallback(
    (generated: GeneratedCourse, builderInput: CourseBuilderInput) => {
      // Map AI output → form fields so the user can review before saving.
      setTitle(generated.title)
      if (generated.subtitle) setSubtitle(generated.subtitle)
      setDescription(generated.description)
      if (generated.category) setCategory(generated.category)
      setLevel(generated.level)
      if (generated.language) setLanguage(generated.language)

      // Price from builder input (user-supplied), not AI.
      if (builderInput.price !== undefined) setPrice(String(builderInput.price))
      if (builderInput.originalPrice !== undefined) setOriginalPrice(String(builderInput.originalPrice))

      // Map modules/lessons.
      const mappedModules: Module[] = generated.modules.map((mod, mi) => ({
        id: generateId("module"),
        title: mod.title,
        description: mod.description,
        order: mi,
        lessons: mod.lessons.map((lesson, li) => ({
          id: generateId("lesson"),
          title: lesson.title,
          description: "",
          type: "text" as const,
          content: lesson.content,
          duration: lesson.estimatedMinutes || 10,
          order: li,
          isPreview: mi === 0 && li === 0,
        })),
      }))
      setModules(mappedModules)

      // Marketing fields.
      if (generated.whatYouLearn.length > 0) setWhatYouLearn(generated.whatYouLearn)
      if (generated.requirements.length > 0) setRequirements(generated.requirements)
      if (generated.features.length > 0) setFeatures(generated.features)

      // Flip to advanced so the user sees the learning outcomes / requirements.
      if (formMode === "simple") toggleFormMode()

      toast.success("Course generated! Review the details below and click Create Course.")
    },
    [formMode, toggleFormMode],
  )

  const goBack = (href: string) => {
    if (confirmLeave()) router.push(href)
  }

  const updateListItem = (
    list: string[],
    setList: (value: string[]) => void,
    index: number,
    value: string
  ) => {
    const newList = [...list]
    newList[index] = value
    setList(newList)
  }

  const addListItem = (list: string[], setList: (value: string[]) => void) => {
    setList([...list, ""])
  }

  const removeListItem = (list: string[], setList: (value: string[]) => void, index: number) => {
    setList(list.filter((_, i) => i !== index))
  }

  const handleSubmit = () => {
    // Cap guard — refuse to create when the workspace is already at
    // its plan-allotted course count. The page also renders an
    // upgrade-card early-return below; this is the belt-and-braces
    // path for any way the user could still reach the submit button.
    if (atCourseCap) {
      toast.error(
        `You're at the ${courseCap}-course cap on your current plan. Upgrade from /dashboard/billing to add more.`,
      )
      return
    }
    // Price is intentionally NOT required — courses can be entirely free
    // (e.g. a school's homework portal, a nonprofit's training, a creator's
    // intro material). A blank price field becomes 0, which downstream
    // rendering treats as "Free".
    const nextErrors: Record<string, string> = {}
    if (!title.trim()) nextErrors.title = "Course title is required."
    if (isRichTextEmpty(description)) nextErrors.description = "Add a description so students know what they'll get."
    if (!category) nextErrors.category = "Pick a category — or choose 'Custom / Other' to type your own."
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      // Scroll the first invalid field into view + focus it.
      const firstField = ["title", "description", "category"].find((f) => nextErrors[f])
      if (firstField && typeof document !== "undefined") {
        const el = document.getElementById(firstField)
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" })
          // Inputs focus directly; non-input wrappers focus their first focusable child.
          if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) el.focus()
          else el.querySelector<HTMLElement>("input,button,[contenteditable]")?.focus()
        }
      }
      return
    }
    setErrors({})
    // Disarm the unsaved-changes guard before we route to the new course
    // page, otherwise router.push would re-render with the guard still
    // armed for the brief moment before unmount and could prompt the user.
    setSubmitting(true)

    const totalLessons = modules.reduce((acc, m) => acc + m.lessons.length, 0)
    const totalDuration = modules.reduce((acc, m) =>
      acc + m.lessons.reduce((lessonAcc, l) => lessonAcc + l.duration, 0), 0)

    // Same slug rules as the edit page (`slugify` from lesson-utils):
    // trim, collapse repeating dashes, strip leading/trailing dashes.
    // addCourse() further suffixes `-2`/`-3`/… if this collides with
    // an existing course, so the public URL is always reachable.
    const slug = slugify(title)

    const newCourse: Course = {
      // Reuse the pre-allocated id so any quizzes / live sessions the
      // teacher created inline from the curriculum editor land on the
      // same course.
      id: courseDraftId,
      title,
      subtitle: subtitle.trim() || undefined,
      slug,
      description,
      thumbnail: thumbnail || "/placeholder.svg?height=400&width=600",
      introVideoUrl: introVideoUrl.trim() || undefined,
      instructor: currentUser!,
      // Blank or non-numeric → 0 (= free).
      price: parseFloat(price) || 0,
      originalPrice: originalPrice ? parseFloat(originalPrice) : undefined,
      currency,
      category,
      level,
      language,
      modules,
      totalDuration,
      totalLessons,
      enrolledCount: 0,
      rating: 0,
      reviewCount: 0,
      status: "draft",
      features: features.filter(f => f.trim()),
      requirements: requirements.filter(r => r.trim()),
      whatYouLearn: whatYouLearn.filter(w => w.trim()),
      certificateEligible,
      certificateTemplate,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    addCourse(newCourse)
    router.push(`/dashboard/courses/${newCourse.id}`)
  }

  // Early return: workspace is at its course cap. Render the same
  // upgrade card the rest of the app uses for plan-gated pages so
  // the user can't even fill out the form — no false hope of saving.
  if (atCourseCap) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard/courses")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to courses
          </Button>
        </div>
        <div className="mx-auto max-w-xl pt-8">
          <PlanGatedCard feature="publishedCourses" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => goBack("/dashboard/courses")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Create New Course</h1>
            <p className="text-muted-foreground">Fill in the details to create your course</p>
          </div>
        </div>
        {/* Header is intentionally lean — only the two primary actions
            live here so the row never wraps on narrow viewports. The
            form-mode toggle + Take-a-tour link sit inside the form body
            (below) where they're more discoverable + the segmented
            control's labels make the current state obvious. */}
        <div className="flex items-center gap-3">
          <AIGenerateButton
            label="AI Course Builder"
            size="default"
            onGenerate={() => setAiBuilderOpen(true)}
          />
          <Button variant="outline" onClick={() => goBack("/dashboard/courses")}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>Create Course</Button>
        </div>
      </div>

      {/* Form-mode segmented control + Take-a-tour. Both options
          visible so there's no "which mode am I in?" ambiguity. */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card px-3 py-2">
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-muted-foreground">Form layout</span>
          <div
            className="inline-flex rounded-full border border-border bg-background p-0.5"
            data-tour="course-mode-toggle"
            data-mode={isAdvanced ? "advanced" : "simple"}
          >
            <button
              type="button"
              onClick={() => isAdvanced && toggleFormMode()}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                !isAdvanced
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted",
              )}
              title="Basic info, curriculum, thumbnail, pricing"
            >
              Simple
            </button>
            <button
              type="button"
              onClick={() => !isAdvanced && toggleFormMode()}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                isAdvanced
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted",
              )}
              title="Adds certificate, learning outcomes, and requirements"
            >
              Advanced
            </button>
          </div>
          <p className="hidden text-[11px] text-muted-foreground sm:block">
            {isAdvanced
              ? "Showing certificate, learning outcomes, and requirements too."
              : "Just the four essentials. Switch to Advanced for the rest."}
          </p>
        </div>
        <TakeATourButton tourId="course-new-v1" label="Take a tour" />
      </div>

      <ProductTour tourId="course-new-v1" steps={NEW_COURSE_TOUR} />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Info */}
          <Card data-tour="course-basic-info">
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>Set up your course details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Label htmlFor="title">Course Title *</Label>
                  <AIGenerateButton
                    label="Draft course from title"
                    size="xs"
                    disabled={!title.trim()}
                    onGenerate={async () => {
                      const trimmed = title.trim()
                      if (!trimmed) {
                        toast.error("Type a course title first — that's all AI needs.")
                        return
                      }
                      const ctx = { title: trimmed, topic: category || undefined }
                      // Description + outline in parallel — they're independent
                      // calls and the editor pretty much always wants both.
                      const [descRes, outlineRes] = await Promise.all([
                        aiCourseDescription(ctx),
                        aiCourseOutline(ctx),
                      ])
                      if ("error" in descRes) {
                        toast.error(descRes.error)
                      } else {
                        setDescription(descRes.description)
                        if (!subtitle.trim()) {
                          // Pull a first-line hook out of the generated
                          // description as a default subtitle. The user
                          // can refine it; we just want the field never
                          // to be empty after AI fills the form.
                          const firstSentence = descRes.description
                            .replace(/<[^>]+>/g, " ")
                            .replace(/\s+/g, " ")
                            .trim()
                            .split(/(?<=[.!?])\s+/)[0]
                            ?.slice(0, 120)
                          if (firstSentence) setSubtitle(firstSentence)
                        }
                        clearError("description")
                      }
                      if ("error" in outlineRes) {
                        // Outline failures aren't fatal — description is the
                        // bigger win. Surface as info, not error.
                        if (!("error" in descRes)) toast.success("Description drafted. Outline couldn't be generated this time.")
                      } else {
                        const drafted: Module[] = outlineRes.modules.map((m, i) => ({
                          id: generateId("module"),
                          title: m.title,
                          description: m.description,
                          order: i,
                          lessons: m.lessons.map((l, j) => ({
                            id: generateId("lesson"),
                            title: l.title,
                            description: "",
                            type: "video",
                            content: "",
                            duration: l.estimatedMinutes || 5,
                            order: j,
                            isPreview: i === 0 && j === 0,
                          })),
                        }))
                        setModules(drafted)
                        toast.success("Course drafted — review the description and curriculum, then hit Create.")
                      }
                    }}
                  />
                </div>
                <Input
                  id="title"
                  placeholder="e.g., Complete Web Development Bootcamp"
                  value={title}
                  onChange={(e) => { setTitle(e.target.value); clearError("title") }}
                  aria-invalid={!!errors.title || undefined}
                  className={cn(errors.title && "border-destructive focus-visible:ring-destructive/30")}
                />
                {errors.title && (
                  <p className="text-xs text-destructive">{errors.title}</p>
                )}
                <p className="text-[11px] text-muted-foreground">
                  Type a title, then let AI draft the description and curriculum for you — review and edit anything you want before you hit Create.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="subtitle">Subtitle</Label>
                <Input
                  id="subtitle"
                  placeholder="One-line hook — shown on cards and in search results"
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  maxLength={120}
                />
                <p className="text-[11px] text-muted-foreground">
                  Keep it under ~100 characters. This is what convinces someone to click.
                </p>
              </div>
              <div className="space-y-2" id="description">
                <Label>Description *</Label>
                <RichTextEditor
                  value={description}
                  onChange={(html) => { setDescription(html); clearError("description") }}
                  placeholder="Describe what students will learn. You can format text, drop in images, and embed YouTube previews."
                  minHeight={180}
                  error={!!errors.description}
                />
                {errors.description ? (
                  <p className="text-xs text-destructive">{errors.description}</p>
                ) : (
                  <p className="text-[11px] text-muted-foreground">
                    Formatting, links, images, and YouTube embeds are all supported.
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="intro-video">Intro / preview video URL</Label>
                <Input
                  id="intro-video"
                  type="url"
                  placeholder="YouTube, Vimeo, Loom, or MP4 link"
                  value={introVideoUrl}
                  onChange={(e) => setIntroVideoUrl(e.target.value)}
                />
                <p className="text-[11px] text-muted-foreground">
                  Optional — autoplays on the public course page. Single biggest conversion lever for paid courses.
                </p>
                <VideoUrlPreview url={introVideoUrl} className="mt-2" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="category">Category *</Label>
                  <CategoryCombobox
                    id="category"
                    value={category}
                    onChange={(v) => { setCategory(v); clearError("category") }}
                    placeholder="Search and pick a category"
                    error={!!errors.category}
                  />
                  {errors.category && (
                    <p className="text-xs text-destructive">{errors.category}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="level">Level</Label>
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
              <div className="space-y-2">
                <Label htmlFor="language">Language</Label>
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {/* Available languages lead — those are also live
                        on the student portal i18n picker. Coming-soon
                        ones sit at the bottom with the option disabled
                        so creators see the roadmap without being able
                        to pick a language students can't read in. */}
                    {COURSE_LANGUAGES.map((lang) => (
                      <SelectItem
                        key={lang.name}
                        value={lang.name}
                        disabled={!lang.available}
                      >
                        {lang.name}
                        {lang.native && (
                          <span className="ml-2 text-muted-foreground">({lang.native})</span>
                        )}
                        {!lang.available && (
                          <span className="ml-2 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                            Coming soon
                          </span>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Curriculum — uses the same full-featured editor as the edit
              page so authors get module descriptions, per-type content
              fields (rich-text article body, video/audio/PDF/embed with
              inline previews, quiz + live-session pickers), attachments,
              transcripts, and duplicate lesson — without having to save a
              draft and bounce to edit. */}
          <Card data-tour="course-curriculum">
            <CardHeader>
              <CardTitle>Course Curriculum</CardTitle>
              <CardDescription>
                Organise your course into modules and lessons. Pick a type per lesson and add the actual content right here.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CurriculumEditor
                modules={modules}
                onChange={setModules}
                coursePriced={parseFloat(price) > 0}
                courseId={courseDraftId}
              />
            </CardContent>
          </Card>

          {/* What You'll Learn — Advanced only. Most first-time teachers
              can leave this empty; the marketing bullets get filled in
              from the course detail page once the structure exists. */}
          {isAdvanced && (
            <Card>
              <CardHeader>
                <CardTitle>What Students Will Learn</CardTitle>
                <CardDescription>List the key skills and knowledge students will gain</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {whatYouLearn.map((item, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      placeholder="e.g., Build full-stack web applications"
                      value={item}
                      onChange={(e) => updateListItem(whatYouLearn, setWhatYouLearn, index, e.target.value)}
                    />
                    {whatYouLearn.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeListItem(whatYouLearn, setWhatYouLearn, index)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={() => addListItem(whatYouLearn, setWhatYouLearn)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Item
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Thumbnail */}
          <Card data-tour="course-thumbnail">
            <CardHeader className="space-y-2">
              <CardTitle>Course thumbnail</CardTitle>
              <CardDescription>
                Upload your own, search Unsplash, or design one in seconds.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ThumbnailField
                value={thumbnail}
                onChange={setThumbnail}
                defaultTitle={title}
                folder="courses"
              />
            </CardContent>
          </Card>

          {/* Pricing */}
          <Card data-tour="course-pricing">
            <CardHeader>
              <CardTitle>Pricing</CardTitle>
              <CardDescription>
                Leave the price blank or set 0 to make the course free. Currency is fixed to INR for v1 — international currencies coming soon.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger id="currency">
                    <SelectValue>
                      <span className="font-medium">
                        {currencyInfo(currency).symbol} {currency}
                      </span>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {SUPPORTED_CURRENCIES.map((c) => (
                      <SelectItem key={c.code} value={c.code} disabled={c.disabled}>
                        <span className="font-medium">{c.symbol} {c.code}</span>
                        <span className="ml-2 text-muted-foreground">— {c.label}</span>
                        {c.disabled && (
                          <span className="ml-2 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                            Coming soon
                          </span>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="price">Price ({currency})</Label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    {currencyInfo(currency).symbol}
                  </span>
                  <Input
                    id="price"
                    type="number"
                    placeholder={currency === "INR" ? "1499" : "99.99"}
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="originalPrice">Original price (optional)</Label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    {currencyInfo(currency).symbol}
                  </span>
                  <Input
                    id="originalPrice"
                    type="number"
                    placeholder={currency === "INR" ? "2999" : "199.99"}
                    value={originalPrice}
                    onChange={(e) => setOriginalPrice(e.target.value)}
                    className="pl-8"
                  />
                </div>
                <p className="text-xs text-muted-foreground">Shown crossed-out next to the live price to signal a discount.</p>
              </div>
            </CardContent>
          </Card>

          {/* Certificate — Advanced only. Default is OFF so the simple
              flow doesn't have to make this decision. Instructors turn this
              on later from the course detail page if they want it. */}
          {isAdvanced && (
            <Card data-tour="course-certificate">
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2">
                    <CardTitle className="flex items-center gap-2">
                      <Award className="h-4 w-4" />
                      Certificate
                    </CardTitle>
                    <CardDescription>
                      Issue a certificate to students who complete this course. Optional — not every course needs one.
                    </CardDescription>
                  </div>
                  <Switch
                    checked={certificateEligible}
                    onCheckedChange={setCertificateEligible}
                    aria-label="Issue a certificate on completion"
                  />
                </div>
              </CardHeader>
              {certificateEligible && (
                <CardContent>
                  <CertificateTemplatePicker
                    value={certificateTemplate}
                    onSelect={setCertificateTemplate}
                  />
                </CardContent>
              )}
            </Card>
          )}

          {/* Requirements — Advanced only. Most courses can ship without
              a prerequisites list at creation time; the field can be
              filled in later from the course detail page. */}
          {isAdvanced && (
            <Card>
              <CardHeader>
                <CardTitle>Requirements</CardTitle>
                <CardDescription>What students need before taking this course</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {requirements.map((item, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      placeholder="e.g., Basic computer skills"
                      value={item}
                      onChange={(e) => updateListItem(requirements, setRequirements, index, e.target.value)}
                    />
                    {requirements.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeListItem(requirements, setRequirements, index)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={() => addListItem(requirements, setRequirements)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Footer reminder so Simple-mode users know they can find
              the rest in the toolbar above (Advanced toggle) or after
              create from the course settings. */}
          {!isAdvanced && (
            <p className="rounded-md border border-dashed border-border/60 bg-muted/30 p-3 text-[11px] text-muted-foreground">
              Looking for learning outcomes, certificate, or requirements? Switch to <span className="font-medium text-foreground">Advanced</span>&nbsp; at the top — or set them later from the course&apos;s settings page.
            </p>
          )}
        </div>
      </div>

      {/* AI Course Builder Dialog */}
      <AICourseBuilderDialog
        open={aiBuilderOpen}
        onOpenChange={setAiBuilderOpen}
        initialTitle={title}
        onCourseGenerated={handleAICourseGenerated}
      />
    </div>
  )
}
