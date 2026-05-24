"use client"

import { Suspense, use, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { ArrowLeft, Play, FileText, CheckCircle, Circle, ChevronDown, ChevronUp, Award, Clock, BarChart3, Lock, Share2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import { useLMS, type Course } from "@/lib/lms-store"
import { QuizPlayer } from "@/components/quiz/quiz-player"
import { LiveClassesBanner } from "@/components/learn/live-classes-banner"
import { PastClasses } from "@/components/learn/past-classes"
import { AssignmentsSection } from "@/components/learn/assignments-section"
import { LessonFollowUps } from "@/components/learn/lesson-follow-ups"
import { SmartLessonViewer } from "@/components/learn/smart-lesson-viewer"
import { LessonTypeIcon, lessonTypeLabel } from "@/components/learn/lesson-type-icon"
import { stripRichTextTags } from "@/components/editor/rich-text-content"
import { useTenantBasePath } from "@/lib/tenant-path"
import { AskDoubtDialog } from "@/components/learn/ask-doubt-dialog"
import { CourseAnnouncements } from "@/components/learn/course-announcements"
import { CompletionConfetti } from "@/components/learn/completion-confetti"
import { ShareMenu } from "@/components/share/share-menu"

export default function LearnCoursePage(props: { params: Promise<{ slug: string }> }) {
  // useSearchParams needs a Suspense boundary at the page root for
  // the Next.js static-prerender path. Inner component does the
  // real work; this wrapper just provides the boundary.
  return (
    <Suspense fallback={null}>
      <LearnCoursePageInner {...props} />
    </Suspense>
  )
}

function LearnCoursePageInner({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  const searchParams = useSearchParams()
  // ?as=visitor | enrolled | halfway — opt-in instructor preview
  // modes set by the "Preview as" dropdown on the course detail
  // page. Lets a teacher see exactly what each audience sees
  // without faking a different identity. Falls through to normal
  // resolution when absent.
  const previewAs = (() => {
    const raw = searchParams?.get("as") ?? ""
    if (raw === "visitor" || raw === "enrolled" || raw === "halfway") return raw
    return null
  })()
  const {
    getCourseBySlug,
    enrollments,
    currentUser,
    updateProgress,
    getQuizById,
    getAssignmentsForLesson,
    getEnrollmentProgress,
  } = useLMS()
  
  const { basePath, inTenant } = useTenantBasePath()
  const coursesHref = `${basePath}/courses`

  const course = getCourseBySlug(slug)
  // `let` because we may swap in a synthetic enrollment below when
  // the visitor is the course owner / a teacher previewing.
  let enrollment = currentUser
    ? enrollments.find(e => e.courseId === course?.id && e.studentId === currentUser.id)
    : null

  // ── Drip gate (Phase 3B) ──────────────────────────────────────
  // Modules with `unlockOffsetDays` stay locked until enrolledAt +
  // offset days has elapsed. Returns the unlock Date (future = locked,
  // past = open) so callers can render a "Unlocks on <date>" hint
  // alongside the lock state.
  const unlockDateFor = (mod: { unlockOffsetDays?: number }): Date | null => {
    const offset = mod.unlockOffsetDays ?? 0
    if (offset <= 0) return null
    if (!enrollment) return null
    const enrolledMs = new Date(enrollment.enrolledAt).getTime()
    if (!Number.isFinite(enrolledMs)) return null
    return new Date(enrolledMs + offset * 24 * 60 * 60 * 1000)
  }
  const isModuleLocked = (mod: { unlockOffsetDays?: number }): boolean => {
    const unlocks = unlockDateFor(mod)
    return !!unlocks && unlocks.getTime() > Date.now()
  }

  const [expandedModules, setExpandedModules] = useState<string[]>(
    course?.modules.map(m => m.id) || []
  )
  // Default lesson on mount:
  //   • If the student has finished the whole course (100%), land on the
  //     empty-state "Course complete!" canvas so they see the celebration,
  //     all follow-ups grouped by lesson, and the certificate CTA. Without
  //     this they were dropped into the last-watched lesson and the
  //     follow-ups were buried behind a navigation away.
  //   • Otherwise resume where they left off (currentLessonId) or start
  //     at the first lesson.
  const [activeLesson, setActiveLesson] = useState<string | null>(
    enrollment?.progress === 100
      ? null
      : (enrollment?.currentLessonId || course?.modules[0]?.lessons[0]?.id || null)
  )

  // Stable refs the keyboard-nav effect reads, so the effect can sit
  // ABOVE the early returns (Rules of Hooks). Without these, we'd
  // have to declare the effect after the !course / preview branches,
  // and React would see hook count #5 disappear on a 404 render.
  const courseRef = useRef(course)
  courseRef.current = course
  const activeLessonRef = useRef(activeLesson)
  activeLessonRef.current = activeLesson
  const enrollmentRef = useRef(enrollment)
  enrollmentRef.current = enrollment

  // Keyboard navigation: Alt+ArrowRight / Alt+ArrowLeft jump between
  // lessons. We require Alt to avoid hijacking arrow keys in text
  // inputs and quiz controls. Effect lives here (above the early
  // returns) so it's called every render, in the same order. Reads
  // through refs so we don't need deps that change with each lesson
  // click.
  //
  // `?` (or Shift+/) opens the keyboard-shortcuts cheat sheet so
  // power users can discover the nav without us nagging them with
  // a permanent hint banner.
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // "?" — show the cheat sheet from anywhere on the page, unless
      // the user is typing in a form field.
      if (e.key === "?" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const t = e.target as HTMLElement | null
        const tag = t?.tagName
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return
        if (t?.isContentEditable) return
        e.preventDefault()
        setShortcutsOpen(true)
        return
      }
      if (!e.altKey) return
      const c = courseRef.current
      const lid = activeLessonRef.current
      if (!c) return
      const allLessons = c.modules.flatMap((m) => m.lessons)
      const currentIndex = allLessons.findIndex((l) => l.id === lid)
      if (e.key === "ArrowRight") {
        e.preventDefault()
        const enr = enrollmentRef.current
        // Mark complete only on a real enrollment — not on the
        // synthetic preview row.
        if (lid && enr && enr.id !== "preview") updateProgress(enr.id, lid)
        const nxt = allLessons[currentIndex + 1]
        if (nxt) setActiveLesson(nxt.id)
      } else if (e.key === "ArrowLeft") {
        e.preventDefault()
        const prev = currentIndex > 0 ? allLessons[currentIndex - 1] : null
        if (prev) setActiveLesson(prev.id)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [updateProgress])

  // One-time hint toast on first lesson view. Surfaces the shortcuts
  // existence without requiring the user to discover them. Stored
  // per-browser, never re-fires.
  useEffect(() => {
    if (typeof window === "undefined") return
    const KEY = "thebigclass.learn.shortcuts-hint.v1"
    try {
      if (window.localStorage.getItem(KEY)) return
      window.localStorage.setItem(KEY, "1")
    } catch { return }
    // Defer the hint so it doesn't slam in during the first paint.
    const t = window.setTimeout(() => {
      // Use a lightweight DOM toast hook only if it's already
      // available; we don't want this to be the trigger that pulls
      // sonner into the bundle. So fall back to the cheat-sheet
      // dialog opening directly if the hint render fails.
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { toast } = require("sonner") as typeof import("sonner")
        toast.message("Pro tip · Press ? to see all keyboard shortcuts", {
          description: "Alt + ← → jumps between lessons.",
          duration: 6000,
        })
      } catch {
        // Toast lib unavailable — silently skip.
      }
    }, 1500)
    return () => window.clearTimeout(t)
  }, [])

  // True 404 — slug doesn't match any course on this tenant.
  if (!course) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Course not found</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            The link may have been changed, or the course unpublished.
          </p>
          <Button asChild className="mt-4">
            <Link href={coursesHref}>Browse Courses</Link>
          </Button>
        </div>
      </div>
    )
  }

  // Instructor preview mode. The instructor (or any teacher/admin in
  // the workspace) hitting their own course's lesson player should
  // see the full curriculum exactly as a paying student would —
  // they're previewing, not buying. We treat them as a synthetic
  // enrollment for the rest of this page.
  //
  // Without this branch the "Preview" button on the edit page
  // dropped instructors into PreviewModePlayer (lock icons + an
  // Enroll CTA), which is exactly the opposite of what "Preview"
  // means.
  const isOwnerOrTeacher =
    !!currentUser && (
      currentUser.id === course.instructor?.id ||
      (course.coInstructorIds ?? []).includes(currentUser.id) ||
      currentUser.role === "admin" ||
      currentUser.role === "instructor"
    )

  // Instructor chose "Preview as visitor" — render the PreviewModePlayer
  // even though they are a teacher. Most accurate way to see what a
  // logged-out browser sees: the gated state, free preview lessons,
  // enrol CTA.
  if (previewAs === "visitor" && isOwnerOrTeacher) {
    const previewLessons = course.modules.flatMap((m) =>
      m.lessons.map((l) => ({ moduleTitle: m.title, lesson: l })),
    )
    const hasAnyPreview = previewLessons.some((p) => p.lesson.isPreview)
    const courseDetailHref = inTenant
      ? `${basePath}/courses/details/${course.slug}`
      : `/courses/${course.slug}`
    return (
      <PreviewModePlayer
        course={course}
        courseDetailHref={courseDetailHref}
        coursesHref={coursesHref}
        hasAnyPreview={hasAnyPreview}
      />
    )
  }

  // Course exists but the visitor isn't enrolled AND isn't a
  // teacher. Render a stripped-down preview-mode player instead of
  // bouncing them — every course detail page links "Free preview"
  // lessons here, and bouncing on arrival makes the preview flow
  // look broken. Preview lessons play; the rest stay locked behind
  // an Enroll CTA. When no preview lessons exist, we surface a
  // "course needs enrollment" card with the same CTA.
  if (!enrollment && !isOwnerOrTeacher) {
    const previewLessons = course.modules.flatMap((m) =>
      m.lessons.map((l) => ({ moduleTitle: m.title, lesson: l })),
    )
    const hasAnyPreview = previewLessons.some((p) => p.lesson.isPreview)
    const courseDetailHref = inTenant
      ? `${basePath}/courses/details/${course.slug}`
      : `/courses/${course.slug}`
    return (
      <PreviewModePlayer
        course={course}
        courseDetailHref={courseDetailHref}
        coursesHref={coursesHref}
        hasAnyPreview={hasAnyPreview}
      />
    )
  }

  // Synthetic enrollment for teacher preview. Lets the rest of the
  // page render lessons, progress strip, etc. without forking on
  // every read. Marked with id "preview" so updateProgress (which
  // requires a real enrollment id) is a no-op for teachers.
  //
  // When `?as=halfway`, we additionally fake-complete the first
  // ~50% of lessons (chronological order) so the teacher sees the
  // mid-course experience: progress bar populated, completed
  // checkmarks scattered, the "next-up" lesson at the meaningful
  // midpoint. For `?as=enrolled` (or no flag) we use a fresh-day-
  // one enrollment with zero progress.
  const isTeacherPreview = !enrollment && isOwnerOrTeacher
  if (isTeacherPreview) {
    let completedLessons: string[] = []
    let progress = 0
    let enrolledAtIso = new Date().toISOString()
    if (previewAs === "halfway") {
      const allLessons = course.modules.flatMap((m) => m.lessons.map((l) => l.id))
      const half = Math.floor(allLessons.length / 2)
      completedLessons = allLessons.slice(0, half)
      progress = allLessons.length > 0 ? Math.round((half / allLessons.length) * 100) : 0
      // Roll the enrollment date back so any drip gates open.
      enrolledAtIso = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    }
    enrollment = {
      id: "preview",
      courseId: course.id,
      studentId: currentUser?.id ?? "",
      enrolledAt: enrolledAtIso,
      progress,
      lastAccessedAt: new Date().toISOString(),
      completedLessons,
    }
  }
  // At this point enrollment is guaranteed defined (real student or
  // synthetic teacher-preview). TypeScript can't narrow `let`, so
  // we assert via a local alias the rest of the file already uses.
  if (!enrollment) {
    // Unreachable — the guard above returned for the no-enrollment
    // student case. Keeping this satisfies TS narrowing.
    return null
  }

  const toggleModule = (moduleId: string) => {
    setExpandedModules(prev =>
      prev.includes(moduleId)
        ? prev.filter(id => id !== moduleId)
        : [...prev, moduleId]
    )
  }

  const currentLessonData = course.modules
    .flatMap(m => m.lessons)
    .find(l => l.id === activeLesson)
  // The module containing the active lesson — used to surface the
  // module title + optional intro in the lesson header so students see
  // "what context this lesson belongs to" instead of an isolated title.
  const currentModule = course.modules.find((m) =>
    m.lessons.some((l) => l.id === activeLesson),
  )
  const currentModuleIndex = currentModule
    ? course.modules.findIndex((m) => m.id === currentModule.id)
    : -1
  const currentLessonIndexInModule = currentModule
    ? currentModule.lessons.findIndex((l) => l.id === activeLesson)
    : -1

  const markComplete = () => {
    if (activeLesson && enrollment) {
      // Synthetic teacher-preview enrollment doesn't touch real progress.
      if (enrollment.id !== "preview") updateProgress(enrollment.id, activeLesson)
    }
  }

  // Live lesson-id set so deleted lessons don't keep counting toward
  // completion and the next/prev nav never lands on a missing lesson.
  const currentLessonIds = new Set(course.modules.flatMap((m) => m.lessons.map((l) => l.id)))
  const isLessonCompleted = (lessonId: string) =>
    enrollment.completedLessons.includes(lessonId) && currentLessonIds.has(lessonId)
  // Recompute progress against the live curriculum.
  const livePct = getEnrollmentProgress(enrollment.id)

  const getNextLesson = () => {
    const allLessons = course.modules.flatMap(m => m.lessons)
    const currentIndex = allLessons.findIndex(l => l.id === activeLesson)
    return allLessons[currentIndex + 1] || null
  }
  const getPrevLesson = () => {
    const allLessons = course.modules.flatMap(m => m.lessons)
    const currentIndex = allLessons.findIndex(l => l.id === activeLesson)
    return currentIndex > 0 ? allLessons[currentIndex - 1] : null
  }

  const handleNextLesson = () => {
    if (activeLesson) {
      markComplete()
    }
    const next = getNextLesson()
    if (next) {
      setActiveLesson(next.id)
    }
  }
  const handlePrevLesson = () => {
    const prev = getPrevLesson()
    if (prev) setActiveLesson(prev.id)
  }

  // Keyboard nav effect lives above the early returns — see the
  // top of this component for the implementation.

  return (
    <div className="min-h-screen bg-background">
      {/* Keyboard shortcuts cheat sheet. Opens via "?" key from
          anywhere in the lesson player, or via the help affordance
          in the chrome. A one-shot localStorage flag pops a toast
          hint the first time so users discover this without us
          needing to nag them with a permanent UI element. */}
      <Dialog open={shortcutsOpen} onOpenChange={setShortcutsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Keyboard shortcuts</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2 text-sm">
            <ShortcutRow keys={["Alt", "→"]} action="Next lesson (marks current complete)" />
            <ShortcutRow keys={["Alt", "←"]} action="Previous lesson" />
            <ShortcutRow keys={["?"]} action="Open this shortcuts panel" />
            <ShortcutRow keys={["Esc"]} action="Close any open dialog" />
            <p className="pt-3 text-[11px] text-muted-foreground">
              On macOS, Alt is the Option key (⌥). On Windows / Linux, it&rsquo;s Alt.
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview-mode banner. Pinned at the very top so the teacher
          always knows the experience is faked, and an Exit button to
          drop the synthetic state. Renders nothing in real-student
          mode. */}
      {previewAs && isOwnerOrTeacher && (
        <div className="flex items-center justify-between gap-3 border-b border-amber-500/40 bg-amber-500/10 px-4 py-2 text-xs text-amber-800 dark:text-amber-200">
          <span className="font-medium">
            🔍 Previewing as{" "}
            {previewAs === "visitor"
              ? "a public visitor (not signed in / not enrolled)"
              : previewAs === "halfway"
                ? "a student halfway through the course"
                : "a freshly-enrolled student"}{" "}
            — actions here don&rsquo;t affect real progress.
          </span>
          <Link
            href={typeof window !== "undefined" ? window.location.pathname : "#"}
            className="rounded border border-amber-700/40 px-2 py-0.5 font-semibold hover:bg-amber-500/20"
          >
            Exit preview
          </Link>
        </div>
      )}
      {/* Lesson chrome.
          Outside a tenant we render a full sticky bar with logo-less
          chrome — the platform layout has no header of its own. Inside
          a tenant the layout already paints the tenant's site header,
          so we drop the duplicate bar and inline a slim back + progress
          strip that keeps the lesson-specific affordances accessible
          without doubling chrome. */}
      {inTenant ? (
        <div className="border-b border-border bg-card/60">
          <div className="flex h-12 items-center justify-between gap-3 px-4">
            <Button variant="ghost" size="sm" asChild>
              <Link href={coursesHref}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Courses
              </Link>
            </Button>
            <div className="flex items-center gap-3">
              <AskDoubtDialog
                courseId={course.id}
                lessonId={activeLesson ?? undefined}
                defaultTitle={
                  currentLessonData
                    ? `Question about "${currentLessonData.title || "this lesson"}"`
                    : ""
                }
                variant="inline"
              />
              <div className="flex items-center gap-2">
                <Progress value={livePct} className="w-24" aria-label={`${livePct}% complete`} />
                <span className="text-xs text-muted-foreground tabular-nums">{livePct}%</span>
              </div>
              {livePct === 100 && (
                <Button variant="outline" size="sm" asChild>
                  <Link href={`${basePath}/verify/${enrollment.certificateId || ""}`}>
                    <Award className="mr-2 h-4 w-4" />
                    Certificate
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </div>
      ) : (
        <header className="sticky top-0 z-50 border-b border-border bg-card">
          <div className="flex h-14 items-center justify-between px-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" asChild>
                <Link href={coursesHref}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Courses
                </Link>
              </Button>
              <div className="hidden sm:block">
                <h1 className="font-semibold text-foreground truncate max-w-md">{course.title}</h1>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <AskDoubtDialog
                courseId={course.id}
                lessonId={activeLesson ?? undefined}
                defaultTitle={
                  currentLessonData
                    ? `Question about "${currentLessonData.title || "this lesson"}"`
                    : ""
                }
                variant="inline"
              />
              <div className="flex items-center gap-2">
                  <Progress value={livePct} className="w-24" aria-label={`${livePct}% complete`} />
                  <span className="text-sm text-muted-foreground tabular-nums">{livePct}%</span>
              </div>
                {livePct === 100 && (
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/verify/${enrollment.certificateId || ""}`}>
                    <Award className="mr-2 h-4 w-4" />
                    Certificate
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </header>
      )}

      <div className="flex">
        {/* Sidebar - Course Content */}
        <aside className="min-h-screen hidden lg:flex w-80 shrink-0 flex-col border-r border-border bg-card">
          <div className="p-4 border-b border-border">
            <h2 className="font-semibold">Course Content</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {enrollment.completedLessons.length}/{course.totalLessons} lessons completed
            </p>
          </div>
          
          <div className="flex-1">
            {course.modules.map((module, moduleIndex) => {
              // Module description is plain text (capped at 180 chars
              // in the editor), but we strip legacy HTML defensively so
              // older courses still render cleanly.
              const moduleBlurb = stripRichTextTags(module.description ?? "").trim()
              const locked = isModuleLocked(module)
              const unlocks = unlockDateFor(module)
              return (
              <div key={module.id} className="border-b border-border">
                <button
                  onClick={() => toggleModule(module.id)}
                  className="w-full flex items-start justify-between gap-3 p-4 hover:bg-muted/50 text-left"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm flex items-center gap-1.5">
                      Module {moduleIndex + 1}
                      {locked && (
                        <Lock className="h-3 w-3 text-amber-600 dark:text-amber-400" aria-label="Locked" />
                      )}
                    </p>
                    <p className="text-sm text-muted-foreground truncate">{module.title}</p>
                    {moduleBlurb && (
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground/80">
                        {moduleBlurb}
                      </p>
                    )}
                  </div>
                  {expandedModules.includes(module.id) ? (
                    <ChevronUp className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
                  )}
                </button>

                {moduleBlurb && expandedModules.includes(module.id) && (
                  // Stronger framing of the module blurb when the
                  // module is open — same text the collapsed trigger
                  // teased, now shown in full inside a subtle panel.
                  <p className="mx-4 mb-3 rounded-md border-l-2 border-primary/40 bg-muted/40 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
                    {moduleBlurb}
                  </p>
                )}
                {expandedModules.includes(module.id) && (
                  locked && unlocks ? (
                    // Drip gate — show a single locked card instead of
                    // the lesson list. Date format matches the rest of
                    // the LMS ("Mar 5, 2026") so the messaging is
                    // consistent across surfaces.
                    <div className="mx-4 mb-3 flex items-start gap-3 rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-3 text-xs">
                      <Lock className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                      <div>
                        <p className="font-medium text-amber-900 dark:text-amber-200">
                          Unlocks on{" "}
                          {unlocks.toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </p>
                        <p className="mt-0.5 text-amber-900/70 dark:text-amber-200/70">
                          {module.lessons.length} lesson
                          {module.lessons.length === 1 ? "" : "s"} will be
                          available — finish earlier modules in the meantime.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="pb-2">
                      {module.lessons.map((lesson, lessonIndex) => {
                        const isActive = lesson.id === activeLesson
                        const isCompleted = isLessonCompleted(lesson.id)

                        return (
                          <button
                            key={lesson.id}
                            onClick={() => setActiveLesson(lesson.id)}
                            className={cn(
                              "w-full flex items-center gap-3 px-4 py-2 text-left text-sm hover:bg-muted/50",
                              isActive && "bg-primary/10 border-l-2 border-primary"
                            )}
                          >
                            {isCompleted ? (
                              <CheckCircle className="h-4 w-4 text-success flex-shrink-0" />
                            ) : (
                              <Circle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className={cn(
                                "truncate",
                                isCompleted && "text-muted-foreground"
                              )}>
                                {lessonIndex + 1}. {lesson.title}
                              </p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                {lesson.type === "video" && <Play className="h-3 w-3" />}
                                {lesson.type === "text" && <FileText className="h-3 w-3" />}
                                {lesson.type === "quiz" && <BarChart3 className="h-3 w-3" />}
                                <span>{lesson.duration} min</span>
                              </div>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  )
                )}
              </div>
              )
            })}
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 min-w-0 min-h-screen">
          {currentLessonData ? (
            <div className="max-w-4xl mx-auto p-6 space-y-6">
              {/* Instructor announcements live at the top of the
                  canvas. Students dismiss them per-browser; the
                  dashboard authors them at /dashboard/announcements.
                  This is what was previously authored but had no
                  public surface — students never saw them. */}
              <CourseAnnouncements courseId={course.id} />

              {currentUser && (
                <LiveClassesBanner courseId={course.id} studentId={currentUser.id} />
              )}

              {/* Lesson header — breadcrumb context (module name + lesson
                  number), the lesson title, type chip + duration, and an
                  optional module intro that gives the student a sense of
                  where this lesson sits in the bigger picture. */}
              <div className="mb-6 space-y-5 border-b border-border/50 pb-6">
                {currentModule && (
                  <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-primary">
                    <span className="rounded bg-primary/10 px-2 py-1">
                      Module {currentModuleIndex + 1}
                    </span>
                    <span className="text-muted-foreground/60">/</span>
                    <span className="text-muted-foreground">
                      {currentModule.title || "Untitled"}
                    </span>
                    {currentLessonIndexInModule >= 0 && (
                      <>
                        <span className="text-muted-foreground/60">/</span>
                        <span className="text-muted-foreground">
                          Lesson {currentLessonIndexInModule + 1} of {currentModule.lessons.length}
                        </span>
                      </>
                    )}
                  </div>
                )}
                
                <h1 className="font-serif text-3xl font-bold leading-tight text-foreground sm:text-4xl">
                  {currentLessonData.title}
                </h1>
                
                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5 font-medium">
                    <LessonTypeIcon type={currentLessonData.type} className="h-4 w-4" />
                    <span className="capitalize">{lessonTypeLabel(currentLessonData.type)}</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5 font-medium">
                    <Clock className="h-4 w-4" />
                    {currentLessonData.duration} min
                  </span>
                </div>

                {currentLessonData.description && (
                  <p className="max-w-3xl text-lg text-foreground/80 leading-relaxed">
                    {currentLessonData.description}
                  </p>
                )}

              </div>

              {/* Content Area */}
              {currentLessonData.type === "quiz" ? (
                (() => {
                  const quiz = getQuizById(currentLessonData.content)
                  if (!quiz) {
                    return (
                      <Card>
                        <CardContent className="p-8 text-center">
                          <BarChart3 className="mx-auto h-10 w-10 text-muted-foreground" />
                          <p className="mt-3 font-medium">Quiz not configured</p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            This lesson references a quiz that no longer exists.
                          </p>
                        </CardContent>
                      </Card>
                    )
                  }
                  return (
                    <QuizPlayer
                      quiz={quiz}
                      onComplete={(a) => {
                        // Synthetic teacher-preview enrollment must not touch real progress.
                        if (a.passed && enrollment && enrollment.id !== "preview") {
                          updateProgress(enrollment.id, currentLessonData.id)
                        }
                      }}
                    />
                  )
                })()
              ) : (
                <SmartLessonViewer
                  lesson={currentLessonData}
                  // Free preview always unlocks; otherwise unlock when enrolled.
                  // (The whole page already requires enrollment, but this keeps
                  // the prop honest if/when we open free preview to guests.)
                  locked={
                    !currentLessonData.isPreview &&
                    !!currentLessonData.isLocked &&
                    !enrollment
                  }
                />
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-between border-t border-border pt-6">
                <div className="flex items-center gap-2">
                  {isLessonCompleted(currentLessonData.id) ? (
                    <span className="flex items-center gap-2 text-success text-sm">
                      <CheckCircle className="h-4 w-4" />
                      Completed
                    </span>
                  ) : currentLessonData.type !== "quiz" ? (
                    <Button variant="outline" onClick={markComplete}>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Mark as Complete
                    </Button>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      Complete the quiz with a passing score to mark this lesson done.
                    </span>
                  )}
                </div>
                <Button onClick={handleNextLesson} disabled={!getNextLesson()}>
                  Next Lesson
                </Button>
              </div>

              {/* "Stuck? Ask the teacher" callout. Sits between the
                  finish-this-lesson controls and the follow-up
                  assignments so the moment a student hits a wall in
                  the lesson, they see a way to reach the teacher
                  without leaving the page. Opens the same dialog as
                  the chrome-bar entry — keeps the inbox single. */}
              {currentUser && (
                <Card className="border-dashed">
                  <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                    <div className="min-w-0">
                      <p className="font-medium">Stuck on something?</p>
                      <p className="text-xs text-muted-foreground">
                        Ask the teacher directly — they&apos;ll get notified and reply here.
                      </p>
                    </div>
                    <AskDoubtDialog
                      courseId={course.id}
                      lessonId={currentLessonData.id}
                      defaultTitle={`Question about "${currentLessonData.title || "this lesson"}"`}
                    />
                  </CardContent>
                </Card>
              )}

              {currentUser && (
                <LessonFollowUps lessonId={currentLessonData.id} studentId={currentUser.id} />
              )}

              <PastClasses courseId={course.id} />

              {currentUser && (
                <AssignmentsSection courseId={course.id} studentId={currentUser.id} />
              )}
            </div>
          ) : (
            // Empty-canvas state — no lesson selected. Instead of a bare
            // "pick a lesson" message, surface the course-level activity:
            // live classes coming up, any pending follow-ups / assignments
            // the teacher added, and recordings from past sessions. Adds
            // a celebration banner when the course is 100% complete so
            // the student sees their next step instead of a dead end.
            <div className="mx-auto max-w-4xl space-y-6 p-6">
              <CourseAnnouncements courseId={course.id} />
              {enrollment.progress === 100 ? (
                  <>
                    {/* Confetti is one-shot per enrollment — guard
                      lives in localStorage. Instructor preview-mode
                      ("preview" enrollment id) gets the celebration
                      every time so they can experience it. */}
                    <CompletionConfetti enrollmentId={enrollment.id} />
                    <div className="rounded-lg border border-success/30 bg-success/5 p-6 text-center">
                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success/15 text-success">
                        <Award className="h-6 w-6" />
                      </div>
                      <h2 className="mt-3 text-xl font-bold text-foreground">
                        🎉 Course complete!
                      </h2>
                      <p className="mt-1 text-sm text-muted-foreground">
                        You finished every lesson. {course.instructor?.name ? `${course.instructor.name.split(" ")[0]} will get a heads-up.` : "Your teacher will get a heads-up."}{" "}
                        Pick anything below — or revisit a lesson from the sidebar.
                      </p>
                      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                        {enrollment.certificateId && (
                          <Button asChild>
                            <Link href={`/verify/${enrollment.certificateId}`}>
                              <Award className="mr-2 h-4 w-4" />
                              View your certificate
                            </Link>
                          </Button>
                        )}
                        {/* Cross-module hook: completing a course is
                          the highest-leverage moment to nudge the
                          student into the community. The Share menu
                          handles the post (community pick + composer)
                          so we just pass the artifact descriptor. */}
                        <ShareMenu
                          artifact={{
                            kind: "course",
                            title: `I just finished ${course.title} 🎉`,
                            description: course.subtitle ?? undefined,
                            url:
                              typeof window !== "undefined"
                                ? `${window.location.origin}/learn/${course.slug}`
                                : `/learn/${course.slug}`,
                            thumbnailUrl: course.thumbnail,
                            source: course.instructor?.name,
                          }}
                          hideEmbed
                          trigger={
                            <Button variant="outline">
                              <Share2 className="mr-2 h-4 w-4" />
                              Share with community
                            </Button>
                          }
                        />
                        {/* Highest-leverage moment to ask for a testimonial.
                          One-tap deep-link into the public form pre-fills
                          the course and instructor so the submission
                          lands attributed in the right inbox. Tenant
                          slug derives from the base-path helper so we
                          don't depend on the optional Course.tenantSlug. */}
                        {currentUser && course.instructor?.id && (
                          <Button variant="outline" asChild>
                            <Link
                              href={`/testimonial?${new URLSearchParams({
                                for: inTenant ? basePath.replace(/^\/p\//, "") : "",
                                c: course.id,
                                i: course.instructor.id,
                              }).toString()}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              ❤️ Share a 30-second testimonial
                            </Link>
                          </Button>
                        )}
                      </div>
                    </div>
                  </>
              ) : (
                <div className="rounded-lg border border-border bg-card p-6 text-center">
                  <p className="text-sm text-muted-foreground">
                    Pick a lesson from the sidebar to start — or work through any of the follow-ups below.
                  </p>
                </div>
              )}

              {currentUser && (
                <LiveClassesBanner courseId={course.id} studentId={currentUser.id} />
              )}

              <PastClasses courseId={course.id} />

              {/* Per-lesson follow-ups — surfaced here in the empty
                  state so a student who finished the course (or hasn't
                  picked a lesson) can still see every assignment grouped
                  by the lesson it came from. The per-lesson view inline
                  with the player handles the "while watching" case;
                  this handles the "after I'm done" case. */}
              {currentUser && course.modules.some((m) =>
                m.lessons.some((l) => getAssignmentsForLesson(l.id).length > 0),
              ) && (
                <section className="space-y-3">
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    Follow-ups by lesson
                  </h2>
                  <div className="space-y-4 rounded-lg border border-border bg-card p-4">
                    {course.modules.flatMap((module) =>
                      module.lessons
                        .filter((l) => getAssignmentsForLesson(l.id).length > 0)
                        .map((lesson) => (
                          <div key={lesson.id} className="space-y-2 border-l-2 border-primary/30 pl-3">
                            <button
                              type="button"
                              onClick={() => setActiveLesson(lesson.id)}
                              className="text-left text-xs font-medium text-muted-foreground hover:text-primary"
                            >
                              From{" "}
                              <span className="font-semibold text-foreground">
                                {lesson.title || "Untitled lesson"}
                              </span>
                            </button>
                            <LessonFollowUps lessonId={lesson.id} studentId={currentUser.id} />
                          </div>
                        )),
                    )}
                  </div>
                </section>
              )}

              {currentUser && (
                <AssignmentsSection courseId={course.id} studentId={currentUser.id} />
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────
// Preview-mode player.
//
// Renders the same shell as the enrolled player but locks every
// non-preview lesson. Visitors arriving from "Free preview" links on
// the course detail page land here; the bigger goal is to make the
// preview lessons actually watchable in-app rather than 404ing the
// visitor with "Course not found or not enrolled".
//
// Scope is intentionally lean: lesson list + a single canvas with
// the active preview lesson, plus a persistent Enroll CTA at the
// top. Quizzes / assignments / follow-ups / drip-gating are all
// enrollment-only concerns, so they're omitted in this mode — the
// student gets the full surface the moment they enroll.
// ────────────────────────────────────────────────────────────────
// Single row inside the shortcuts cheat sheet. Keys render as <kbd>
// pills so the visual match a real keyboard. Action is plain text.
function ShortcutRow({ keys, action }: { keys: string[]; action: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-foreground">{action}</span>
      <span className="flex items-center gap-1">
        {keys.map((k, i) => (
          <span key={i} className="flex items-center gap-1">
            {i > 0 && <span className="text-muted-foreground">+</span>}
            <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] leading-none text-muted-foreground">
              {k}
            </kbd>
          </span>
        ))}
      </span>
    </div>
  )
}

function PreviewModePlayer({
  course,
  courseDetailHref,
  coursesHref,
  hasAnyPreview,
}: {
  course: Course
  courseDetailHref: string
  coursesHref: string
  hasAnyPreview: boolean
}) {
  // Default to the first preview lesson; if there is none we render
  // the "nothing to preview here" state below instead of the player.
  const firstPreview = course.modules
    .flatMap((m) => m.lessons)
    .find((l) => l.isPreview)
  const [activeId, setActiveId] = useState<string | null>(firstPreview?.id ?? null)
  const [expandedModules, setExpandedModules] = useState<string[]>(
    course.modules.map((m) => m.id),
  )
  const toggleModule = (id: string) =>
    setExpandedModules((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  const activeLesson = course.modules
    .flatMap((m) => m.lessons)
    .find((l) => l.id === activeId)

  if (!hasAnyPreview) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6">
        <Card className="max-w-md">
          <CardContent className="space-y-3 p-6 text-center">
            <Lock className="mx-auto h-8 w-8 text-muted-foreground" />
            <h1 className="text-xl font-bold">No free preview yet</h1>
            <p className="text-sm text-muted-foreground">
              The instructor hasn&apos;t marked any lesson as a free preview. Enroll to unlock the full curriculum.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
              <Button asChild>
                <Link href={courseDetailHref}>Enroll now</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href={coursesHref}>Browse courses</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Preview-mode banner — sticky so it's always visible regardless of where
          the visitor scrolls. Pushes them toward Enroll without blocking the
          preview itself. */}
      <div className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <Button asChild variant="ghost" size="sm" className="-ml-2">
              <Link href={courseDetailHref}>
                <ArrowLeft className="mr-1 h-4 w-4" />
                Back to course
              </Link>
            </Button>
            <div className="hidden h-5 w-px bg-border sm:block" aria-hidden />
            <p className="hidden truncate text-sm font-semibold sm:block">
              {course.title}
            </p>
            <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-success">
              <Play className="h-2.5 w-2.5" /> Free preview
            </span>
          </div>
          <Button asChild size="sm">
            <Link href={courseDetailHref}>Enroll for full access</Link>
          </Button>
        </div>
      </div>

      <div className="flex flex-1 flex-col lg:flex-row">
        {/* Sidebar — curriculum, with non-preview lessons locked. */}
        <aside className="border-b border-border bg-card lg:w-80 lg:shrink-0 lg:border-b-0 lg:border-r">
          <div className="flex flex-col">
            {course.modules.map((module, mi) => {
              const open = expandedModules.includes(module.id)
              return (
                <div key={module.id} className="border-b border-border last:border-0">
                  <button
                    type="button"
                    onClick={() => toggleModule(module.id)}
                    className="flex w-full items-start justify-between gap-3 p-4 text-left hover:bg-muted/40"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">Module {mi + 1}</p>
                      <p className="truncate text-sm text-muted-foreground">{module.title}</p>
                    </div>
                    {open ? (
                      <ChevronUp className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
                    )}
                  </button>
                  {open && (
                    <div className="pb-2">
                      {module.lessons.map((lesson, li) => {
                        const isPreview = !!lesson.isPreview
                        const isActive = lesson.id === activeId
                        return (
                          <button
                            key={lesson.id}
                            type="button"
                            disabled={!isPreview}
                            onClick={() => isPreview && setActiveId(lesson.id)}
                            className={cn(
                              "flex w-full items-center gap-3 px-4 py-2 text-left text-sm",
                              isPreview ? "hover:bg-muted/50" : "cursor-not-allowed opacity-60",
                              isActive && "border-l-2 border-primary bg-primary/10",
                            )}
                            title={isPreview ? undefined : "Enroll to unlock this lesson"}
                          >
                            {isPreview ? (
                              <Play className="h-4 w-4 shrink-0 text-success" />
                            ) : (
                              <Lock className="h-4 w-4 shrink-0 text-muted-foreground" />
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="truncate">
                                {li + 1}. {lesson.title || "Untitled lesson"}
                              </p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                {lesson.type === "video" && <Play className="h-3 w-3" />}
                                {lesson.type === "text" && <FileText className="h-3 w-3" />}
                                {lesson.type === "quiz" && <BarChart3 className="h-3 w-3" />}
                                <span>{lesson.duration} min</span>
                                {isPreview && (
                                  <span className="rounded-full bg-success/15 px-1.5 py-0 text-[9px] font-semibold uppercase tracking-wider text-success">
                                    Preview
                                  </span>
                                )}
                              </div>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </aside>

        {/* Canvas — the active preview lesson via SmartLessonViewer. */}
        <main className="min-w-0 flex-1">
          <div className="mx-auto max-w-4xl space-y-6 p-6">
            {activeLesson ? (
              <>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-success">
                    Free preview · Lesson {activeLesson.order ?? ""}
                  </p>
                  <h1 className="mt-1 font-serif text-2xl font-bold leading-tight">
                    {activeLesson.title || "Untitled lesson"}
                  </h1>
                  <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>{activeLesson.duration} min</span>
                  </div>
                </div>
                <SmartLessonViewer lesson={activeLesson} />
                {/* Bottom CTA — the visitor just consumed value;
                    convert before they bounce. */}
                <Card className="border-primary/30 bg-primary/5">
                  <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                    <div className="min-w-0">
                      <p className="font-semibold">Liked the preview?</p>
                      <p className="text-sm text-muted-foreground">
                        Enroll to unlock every lesson, quizzes, assignments, and the certificate on completion.
                      </p>
                    </div>
                    <Button asChild className="shrink-0">
                      <Link href={courseDetailHref}>Enroll now</Link>
                    </Button>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card>
                <CardContent className="space-y-3 py-12 text-center">
                  <Award className="mx-auto h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Pick a preview lesson from the sidebar to start watching.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
