"use client"

import { use, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Play, FileText, CheckCircle, Circle, ChevronDown, ChevronUp, Award, Clock, BarChart3, Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import { useLMS } from "@/lib/lms-store"
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

export default function LearnCoursePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  const {
    getCourseBySlug,
    enrollments,
    currentUser,
    updateProgress,
    getQuizById,
    getAssignmentsForLesson,
  } = useLMS()
  
  const { basePath, inTenant } = useTenantBasePath()
  const coursesHref = `${basePath}/courses`

  const course = getCourseBySlug(slug)
  const enrollment = currentUser
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

  if (!course || !enrollment) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Course not found or not enrolled</h1>
          <Button asChild className="mt-4">
            <Link href={coursesHref}>Browse Courses</Link>
          </Button>
        </div>
      </div>
    )
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
      updateProgress(enrollment.id, activeLesson)
    }
  }

  const isLessonCompleted = (lessonId: string) => 
    enrollment.completedLessons.includes(lessonId)

  const getNextLesson = () => {
    const allLessons = course.modules.flatMap(m => m.lessons)
    const currentIndex = allLessons.findIndex(l => l.id === activeLesson)
    return allLessons[currentIndex + 1] || null
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

  return (
    <div className="min-h-screen bg-background">
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
                <Progress value={enrollment.progress} className="w-24" />
                <span className="text-xs text-muted-foreground">{enrollment.progress}%</span>
              </div>
              {enrollment.progress === 100 && (
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
                <Progress value={enrollment.progress} className="w-24" />
                <span className="text-sm text-muted-foreground">{enrollment.progress}%</span>
              </div>
              {enrollment.progress === 100 && (
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
              {/* Teacher announcements live at the top of the
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
                        if (a.passed && enrollment) {
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
                <div className="rounded-lg border border-success/30 bg-success/5 p-6 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success/15 text-success">
                    <Award className="h-6 w-6" />
                  </div>
                  <h2 className="mt-3 text-xl font-bold text-foreground">
                    Course complete!
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    You finished every lesson. Pick anything below — or revisit a lesson from the sidebar.
                  </p>
                  {enrollment.certificateId && (
                    <Button asChild className="mt-4">
                      <Link href={`/verify/${enrollment.certificateId}`}>
                        <Award className="mr-2 h-4 w-4" />
                        View your certificate
                      </Link>
                    </Button>
                  )}
                </div>
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
