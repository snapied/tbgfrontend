"use client"

import { use, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Clock,
  Users,
  Star,
  BookOpen,
  Check,
  Award,
  Globe,
  Video,
  FileText,
  HelpCircle,
  Radio,
  Paperclip,
  ClipboardList,
  Briefcase,
  Headphones,
  FileSymlink,
  Lock,
  Play,
  PlayCircle,
  CheckCircle2,
  MessageCircleQuestion,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { LessonType } from "@/lib/lms-store"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { useLMS } from "@/lib/lms-store"
import { formatMoney } from "@/lib/currency"
import { RichTextContent, isRichTextEmpty, stripRichTextTags } from "@/components/editor/rich-text-content"
import { LessonTypeIcon, lessonTypeLabel } from "@/components/learn/lesson-type-icon"
import { VideoUrlPreview } from "@/components/upload/video-url-preview"
import { CourseReviews } from "@/components/learn/course-reviews"
import { CourseQnA } from "@/components/learn/course-qna"
import { InstructorOtherCourses } from "@/components/learn/instructor-other-courses"
import { InstructorSocials } from "@/components/learn/instructor-socials"
import { Ticket } from "lucide-react"
import { Header } from "@/components/landing/header"
import { Footer } from "@/components/landing/footer"
import { PortalThemeProvider } from "@/components/portal/portal-theme-provider"
import { PortalAnalyticsScripts } from "@/components/portal/portal-analytics"
import { usePortal } from "@/lib/portal-store"
import { useTenant } from "@/lib/tenant-store"
import { resolveLiveBrand } from "@/lib/portal-templates"
import { useTenantBasePath } from "@/lib/tenant-path"
import { DynamicMeta } from "@/components/seo/dynamic-meta"
import { useTenantBrand } from "@/lib/tenant-brand"
import { EmailTeacherDialog } from "@/components/learn/email-teacher-dialog"

export default function CoursePublicPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  const router = useRouter()
  const {
    getCourseBySlug,
    getUserById,
    isEnrolled,
    enrollStudent,
    currentUser,
    getAssignmentsForCourse,
  } = useLMS()
  // Pull the tenant's portal config so the global course detail page
  // obeys the same brand (colors, fonts, custom CSS) the customer
  // portal does. Without this, a tenant who set "Editorial" sees a
  // navy-default hero on their own course page — a jarring jump out
  // of their brand. Wrapping in PortalThemeProvider gets us the
  // baseline polish + every template's overrides for free.
  const { currentTenant } = useTenant()
  const { config, faculty } = usePortal()
  const tenantSlug = currentTenant?.slug ?? "default"
  // When this page is rendered through the portal wrapper
  // (/p/<tenant>/courses/details/<slug>) the tenant layout already
  // paints the tenant's site header + footer. Detect that via the URL
  // so we can suppress our own platform chrome and avoid a duplicate
  // header — otherwise the visitor sees both stacked on top of each
  // other.
  const { inTenant, basePath } = useTenantBasePath()
  const brand = useTenantBrand()
  // Live-resolve the brand so platform-side template updates take
  // effect without forcing the tenant to re-apply. activeTemplateId
  // is a free-form extra on PortalConfig.
  const activeTemplateId = (config as { activeTemplateId?: string }).activeTemplateId
  const liveBrand = resolveLiveBrand(config.brand, activeTemplateId)

  // NOTE: we intentionally do NOT redirect tenant visitors from
  // /courses/<slug> to /p/<tenant>/courses/<slug>. The portal-scoped
  // page is a thin teaser; the rich curriculum + enrollment flow
  // lives here, and other surfaces (e.g. the portal teaser's "See
  // full curriculum & enroll" button) link to this URL. Redirecting
  // turned that button into a no-op. Visual continuity is preserved
  // by wrapping this page in PortalThemeProvider with the tenant's
  // live brand — same colours, fonts, layout — without changing the
  // URL or hiding the rich content.

  const course = getCourseBySlug(slug)
  const [isEnrolling, setIsEnrolling] = useState(false)
  // Modules the visitor has expanded in the curriculum accordion. The
  // first one defaults open so the page never lands on a wall of
  // closed accordion triggers — the visitor sees real content
  // immediately. State is uncontrolled-friendly via openModules so we
  // can also flip every module open from the "Expand all" button.
  const [openModules, setOpenModules] = useState<string[]>(() =>
    course?.modules[0]?.id ? [course.modules[0].id] : [],
  )

  // Counts derived from the lessons + assignments attached to this
  // course. Surfaced as a stat grid above the curriculum so a visitor
  // sees at a glance how much video / reading / practice the course
  // actually contains — instead of having to expand every module.
  // Updates automatically as the teacher adds or removes content.
  const stats = useMemo(() => {
    if (!course) return null
    const lessons = course.modules.flatMap((m) => m.lessons)
    const countByType = (t: string) => lessons.filter((l) => l.type === t).length
    const totalAttachments = lessons.reduce(
      (acc, l) => acc + (l.attachments?.length ?? 0) + (l.resources?.length ?? 0),
      0,
    )
    const assignments = getAssignmentsForCourse(course.id)
    const countByKind = (k: string) => assignments.filter((a) => a.kind === k).length
    return {
      lessons: lessons.length,
      videos: countByType("video"),
      readings: countByType("text") + countByType("pdf") + countByType("document") + countByType("embed"),
      audio: countByType("audio"),
      quizzes: countByType("quiz"),
      liveSessions: countByType("live"),
      attachments: totalAttachments,
      assignments: countByKind("assignment"),
      projects: countByKind("project"),
      tests: countByKind("test"),
      totalHours: Math.round(course.totalDuration / 60),
    }
  }, [course, getAssignmentsForCourse])

  // Curriculum-level breakdown surfaced in the Course Content card
  // header. We collapse pdf/document/embed into one "reading" bucket
  // because a visitor doesn't care about file format — they care
  // about "what kind of work am I going to do." Ordered by frequency
  // so the dominant type leads.
  const curriculumChips = useMemo(() => {
    if (!course) return [] as Array<{
      key: string
      label: string
      count: number
      icon: LessonType
    }>
    const lessons = course.modules.flatMap((m) => m.lessons)
    const buckets: Record<string, { label: string; count: number; icon: LessonType }> = {
      video:   { label: "video",   count: 0, icon: "video" },
      reading: { label: "reading", count: 0, icon: "text" },
      audio:   { label: "audio",   count: 0, icon: "audio" },
      quiz:    { label: "quiz",    count: 0, icon: "quiz" },
      live:    { label: "live session", count: 0, icon: "live" },
    }
    for (const l of lessons) {
      if (l.type === "video") buckets.video.count++
      else if (l.type === "audio") buckets.audio.count++
      else if (l.type === "quiz") buckets.quiz.count++
      else if (l.type === "live") buckets.live.count++
      else buckets.reading.count++  // text / pdf / document / embed
    }
    return Object.entries(buckets)
      .filter(([, v]) => v.count > 0)
      .sort((a, b) => b[1].count - a[1].count)
      .map(([key, v]) => ({ key, ...v }))
  }, [course])

  if (!course) {
    return (
      <PortalThemeProvider tenant={tenantSlug} brand={liveBrand}>
        <div className="min-h-screen flex flex-col">
          {!inTenant && <Header />}
          <main className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <h1 className="text-2xl font-bold">Course not found</h1>
              <Button asChild className="mt-4">
                <Link href={inTenant ? `${basePath}/courses` : "/courses"}>Browse Courses</Link>
              </Button>
            </div>
          </main>
          {!inTenant && <Footer />}
        </div>
      </PortalThemeProvider>
    )
  }

  const userEnrolled = currentUser ? isEnrolled(course.id, currentUser.id) : false
  // Resolve the live instructor record so name / bio / socials edits in
  // /dashboard/settings appear here immediately. The course only stores a
  // snapshot of the instructor at creation time; if we render from that,
  // a teacher who renames themselves never sees the new name on their own
  // course pages. Falls back to the snapshot when the user record has
  // been deleted, so the page never breaks on missing data.
  const instructor = getUserById(course.instructor.id) ?? course.instructor
  const facultyMember = faculty?.find(f => f.userId === instructor.id)
  const instructorHandle = facultyMember?.handle || instructor.email.split("@")[0]
  const profileUrl = `/p/${tenantSlug}/teachers/${instructorHandle}`

  const handleEnroll = () => {
    if (!currentUser) {
      router.push("/login")
      return
    }
    
    setIsEnrolling(true)
    // Simulate enrollment, then drop the learner into the lesson
    // player. When the visitor came from a tenant context, prefer
    // the portal-scoped learn route so the URL stays inside the
    // tenant namespace.
    setTimeout(() => {
      enrollStudent(course.id, currentUser.id)
      setIsEnrolling(false)
      router.push(
        currentTenant?.slug
          ? `/p/${currentTenant.slug}/learn/${course.slug}`
          : `/learn/${course.slug}`,
      )
    }, 1000)
  }

  // SEO copy. Outside a tenant we sign the page as "The Big Class";
  // inside a tenant we use the tenant brand so the share preview /
  // tab title reads as the tenant's own course page. Description
  // falls back to a trimmed rich-text description so even a course
  // without a custom SEO description ships with useful preview copy.
  const courseDescriptionPlain = stripRichTextTags(course.description ?? "")
  const courseMetaDescription =
    course.subtitle ||
    (courseDescriptionPlain ? courseDescriptionPlain.slice(0, 160).trim() + (courseDescriptionPlain.length > 160 ? "…" : "") : undefined)
  const siteName = inTenant ? brand.name : "The Big Class"
  const courseJsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Course",
    name: course.title,
    description: courseMetaDescription,
    image: course.thumbnail,
    provider: {
      "@type": "Organization",
      name: siteName,
    },
    author: instructor?.name
      ? { "@type": "Person", name: instructor.name }
      : undefined,
  })

  return (
    <PortalThemeProvider tenant={tenantSlug} brand={liveBrand}>
    <DynamicMeta
      title={course.title}
      titleTemplate={`%s · ${siteName}`}
      description={courseMetaDescription}
      image={course.thumbnail || (inTenant ? brand.logoUrl : undefined)}
      type="website"
      siteName={siteName}
      keywords={course.category ? [course.category, course.level, "course", "online learning"] : undefined}
      jsonLd={courseJsonLd}
    />
    <PortalAnalyticsScripts analytics={config.analytics} />
    <div className="min-h-screen flex flex-col">
      {!inTenant && <Header />}

      <main className="flex-1">
        {/* Hero — identification only. Rich description moves into an
            "About this course" card below so the dark navy section stays
            tight and readable. Subtle radial gradient + small chips give
            it presence without being noisy. */}
        <section className="relative overflow-hidden bg-primary text-primary-foreground">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(255,255,255,0.08),transparent_60%)]"
          />
          <div className="relative mx-auto max-w-7xl px-6 py-14 lg:px-8 lg:py-16">
            <div className="max-w-3xl">
              <div className="mb-4 flex flex-wrap items-center gap-1.5">
                <span className="rounded-full bg-primary-foreground/15 px-2.5 py-0.5 text-[11px] font-medium capitalize">
                  {course.level}
                </span>
                {course.category && (
                  <span className="rounded-full bg-primary-foreground/15 px-2.5 py-0.5 text-[11px]">
                    {course.category}
                  </span>
                )}
                {course.certificateEligible && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-accent/20 px-2.5 py-0.5 text-[11px] font-medium text-accent">
                    <Award className="h-3 w-3" />
                    Certificate
                  </span>
                )}
              </div>

              <h1 className="font-serif text-3xl font-bold leading-tight sm:text-5xl">
                {course.title}
              </h1>
              {course.subtitle && (
                <p className="mt-3 max-w-2xl text-lg leading-relaxed text-primary-foreground/85">
                  {course.subtitle}
                </p>
              )}

              {/* Meta strip — one row, dot-separated. Reviewed at a
                  glance; full detail moves to the cards below. */}
              <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-primary-foreground/80">
                {course.reviewCount > 0 && (
                  <span className="inline-flex items-center gap-1.5">
                    <Star className="h-4 w-4 fill-accent text-accent" />
                    <span className="font-semibold text-primary-foreground">{course.rating}</span>
                    <span>({course.reviewCount.toLocaleString()})</span>
                  </span>
                )}
                {course.enrolledCount > 0 && (
                  <span className="inline-flex items-center gap-1.5">
                    <Users className="h-4 w-4" />
                    {course.enrolledCount.toLocaleString()} students
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="h-4 w-4" />
                  {Math.round(course.totalDuration / 60) || 0}h total
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <BookOpen className="h-4 w-4" />
                  {course.totalLessons} {course.totalLessons === 1 ? "lesson" : "lessons"}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Globe className="h-4 w-4" />
                  {course.language}
                </span>
              </div>

              {/* Instructor line — small, after the meta strip so the
                  reader's eye lands on it last. */}
              <div className="mt-6 flex items-center gap-2.5">
                {/* Show the real avatar when the instructor has one
                    set. The bottom instructor card already does this;
                    the hero used to fall straight through to initials
                    even when an avatar URL existed. */}
                {instructor.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={instructor.avatar}
                    alt={instructor.name}
                    className="h-9 w-9 rounded-full object-cover ring-2 ring-primary-foreground/20"
                  />
                ) : (
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-foreground/15 text-sm font-semibold">
                    {instructor.name.split(" ").map((n) => n[0]).join("")}
                  </div>
                )}
                <span className="text-sm">
                  Created by{" "}
                  <span className="font-semibold text-primary-foreground">{instructor.name}</span>
                </span>
              </div>

              {/* Prominent pre-sale enquiry CTA. Lives right under the
                  instructor line so a hesitant buyer evaluating the
                  hero sees one obvious way to reach the teacher
                  without leaving the page — no scrolling required. */}
              <div className="mt-6">
                <EmailTeacherDialog
                  courseId={course.id}
                  courseTitle={course.title}
                  instructor={{
                    id: instructor.id,
                    name: instructor.name,
                    email: instructor.email,
                  }}
                  variant="prominent"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Main Content */}
        <section className="py-12">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="grid gap-8 lg:grid-cols-3">
              {/* Left Content */}
              <div className="lg:col-span-2 space-y-6">
                {/* Intro / preview video — biggest single conversion lever
                    for paid courses. Only renders when the instructor has
                    set one; type detection happens inside VideoUrlPreview. */}
                {course.introVideoUrl && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Course preview</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <VideoUrlPreview url={course.introVideoUrl} />
                    </CardContent>
                  </Card>
                )}

                {/* About this course — the rich description. Moved here
                    from the hero so it renders against a white card
                    background where the prose styles read correctly,
                    instead of fighting the dark navy hero. */}
                {!isRichTextEmpty(course.description) && (
                  <Card>
                    <CardHeader>
                      <CardTitle>About this course</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <RichTextContent html={course.description} />
                    </CardContent>
                  </Card>
                )}

                {/* What you'll learn — only when the instructor filled it in. */}
                {course.whatYouLearn.filter((s) => s.trim()).length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>What you&apos;ll learn</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {course.whatYouLearn.filter((s) => s.trim()).map((item, index) => (
                        <div key={index} className="flex gap-2">
                          <Check className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
                          <span className="text-sm">{item}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
                )}

                {/* What's in this course — counts derived from the
                    lessons + assignments themselves, so the numbers
                    stay accurate as the teacher edits content. We hide
                    the whole card only when literally everything is
                    zero (a brand-new empty course); otherwise zeros for
                    individual tiles are skipped so the grid never
                    shows "0 projects". */}
                {stats && (stats.lessons + stats.assignments + stats.projects + stats.tests + stats.attachments + stats.liveSessions) > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>What&apos;s in this course</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Pulled live from the curriculum — updates as new content is added.
                      </p>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                        <StatTile
                          icon={BookOpen}
                          label="Lessons"
                          value={stats.lessons}
                          hint={`across ${course.modules.length} module${course.modules.length === 1 ? "" : "s"}`}
                        />
                        {/* <StatTile icon={Clock} label="Hours of content" value={stats.totalHours} suffix="h" /> */}
                        <StatTile icon={Video} label="Videos" value={stats.videos} hideIfZero />
                        <StatTile icon={FileText} label="Readings" value={stats.readings} hideIfZero />
                        <StatTile icon={Headphones} label="Audio" value={stats.audio} hideIfZero />
                        <StatTile icon={HelpCircle} label="Quizzes" value={stats.quizzes} hideIfZero />
                        <StatTile icon={Radio} label="Live sessions" value={stats.liveSessions} hideIfZero />
                        <StatTile icon={Paperclip} label="Resources" value={stats.attachments} hideIfZero />
                        <StatTile icon={ClipboardList} label="Assignments" value={stats.assignments} hideIfZero />
                        <StatTile icon={Briefcase} label="Projects" value={stats.projects} hideIfZero />
                        <StatTile icon={FileSymlink} label="Tests" value={stats.tests} hideIfZero />
                        {course.certificateEligible && (
                          <StatTile icon={Award} label="Certificate" value={1} suffix="" hint="on completion" />
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Course Content
                    Redesigned for at-a-glance comprehension:
                    • Header gives a real-language summary ("2 lessons ·
                      20 min total") and a chip rail showing the work
                      mix ("2 readings · 1 quiz") so visitors know what
                      they're signing up for without expanding anything.
                    • First module auto-expands so the page lands on
                      content, not a wall of triggers.
                    • Numbered module badge + "Expand/Collapse all" lets
                      power-users scan long curricula fast.
                    • Lesson rows show their position, type, duration,
                      and access state — free previews are clickable
                      into the player; locked lessons surface a lock
                      icon instead of pretending to be interactive. */}
                <Card>
                  <CardHeader>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <CardTitle>Course Content</CardTitle>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {course.modules.length}{" "}
                          {course.modules.length === 1 ? "module" : "modules"}
                          {" · "}
                          {course.totalLessons}{" "}
                          {course.totalLessons === 1 ? "lesson" : "lessons"}
                          {course.totalDuration > 0 && (
                            <>{" · "}{formatLessonDuration(course.totalDuration)} total</>
                          )}
                        </p>
                        {curriculumChips.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {curriculumChips.map((c) => (
                              <span
                                key={c.key}
                                className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground"
                              >
                                <LessonTypeIcon type={c.icon} className="h-3 w-3" />
                                {c.count} {pluralizeLabel(c.label, c.count)}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      {course.modules.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setOpenModules((prev) =>
                              prev.length === course.modules.length
                                ? []
                                : course.modules.map((m) => m.id),
                            )
                          }
                          className="shrink-0"
                        >
                          {openModules.length === course.modules.length ? "Collapse all" : "Expand all"}
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {course.modules.length === 0 ? (
                      <div className="py-10 text-center">
                        <BookOpen className="mx-auto h-10 w-10 text-muted-foreground/40" />
                        <p className="mt-3 text-sm font-medium">No content yet</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          The instructor hasn&apos;t published any modules yet.
                        </p>
                      </div>
                    ) : (
                      <Accordion
                        type="multiple"
                        value={openModules}
                        onValueChange={setOpenModules}
                        className="w-full"
                      >
                        {course.modules.map((module, moduleIndex) => {
                          const moduleDuration = module.lessons.reduce(
                            (a, l) => a + (l.duration || 0),
                            0,
                          )
                          const previewCount = module.lessons.filter((l) => l.isPreview).length
                          // Module description: plain text (180-char cap in
                          // the editor). Strip any legacy HTML so older
                          // courses still render cleanly. Shown on its own
                          // line directly under the module title so a
                          // visitor sees the takeaway without expanding.
                          const moduleBlurb = stripRichTextTags(module.description ?? "").trim()
                          return (
                            <AccordionItem key={module.id} value={module.id} className="border-b border-border last:border-b-0">
                              <AccordionTrigger className="py-3 hover:no-underline">
                                <div className="flex w-full min-w-0 items-start gap-3 text-left">
                                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">
                                    {moduleIndex + 1}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate font-semibold">
                                      {module.title || "Untitled module"}
                                    </p>
                                    {moduleBlurb && (
                                      <p className="mt-1 line-clamp-2 text-xs font-normal leading-relaxed text-muted-foreground">
                                        {moduleBlurb}
                                      </p>
                                    )}
                                    <p className="mt-1 truncate text-xs font-normal text-muted-foreground/80">
                                      {module.lessons.length}{" "}
                                      {module.lessons.length === 1 ? "lesson" : "lessons"}
                                      {moduleDuration > 0 && (
                                        <>{" · "}{formatLessonDuration(moduleDuration)}</>
                                      )}
                                      {previewCount > 0 && (
                                        <>
                                          {" · "}
                                          <span className="text-success">
                                            {previewCount} free preview{previewCount === 1 ? "" : "s"}
                                          </span>
                                        </>
                                      )}
                                    </p>
                                  </div>
                                </div>
                              </AccordionTrigger>
                              <AccordionContent>
                                <div className="pl-12">
                                  {/* Description used to be rendered here as
                                      rich text too, but it now lives in the
                                      trigger sub-line above so it's visible
                                      without expanding. */}
                                  <ol className="space-y-1.5">
                                    {module.lessons.length === 0 ? (
                                      <li className="py-3 text-center text-xs italic text-muted-foreground">
                                        No lessons in this module yet.
                                      </li>
                                    ) : (
                                      module.lessons.map((lesson, lessonIndex) => {
                                        const accessible = lesson.isPreview || userEnrolled
                                        const lessonHref = inTenant
                                          ? `${basePath}/learn/${course.slug}`
                                          : `/learn/${course.slug}`
                                        const Row = (
                                          <div
                                            className={cn(
                                              "flex items-center justify-between gap-3 rounded-md px-3 py-2.5 text-sm transition",
                                              accessible
                                                ? "bg-muted/40 hover:bg-primary/5 hover:text-foreground"
                                                : "bg-muted/20 text-muted-foreground",
                                            )}
                                          >
                                            <div className="flex min-w-0 items-center gap-2.5">
                                              <span className="w-5 shrink-0 text-xs font-medium text-muted-foreground">
                                                {lessonIndex + 1}.
                                              </span>
                                              <LessonTypeIcon
                                                type={lesson.type}
                                                className={cn(
                                                  "h-4 w-4 shrink-0",
                                                  accessible ? "text-primary" : "text-muted-foreground",
                                                )}
                                              />
                                              <span className="truncate">
                                                {lesson.title || "Untitled lesson"}
                                              </span>
                                              {lesson.isPreview && (
                                                <span className="shrink-0 rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-medium text-success">
                                                  <Play className="mr-0.5 inline h-2.5 w-2.5" />
                                                  Free preview
                                                </span>
                                              )}
                                            </div>
                                            <div className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                                              {!accessible && <Lock className="h-3.5 w-3.5" />}
                                              <span className="whitespace-nowrap">
                                                {lessonTypeLabel(lesson.type)} · {lesson.duration} min
                                              </span>
                                            </div>
                                          </div>
                                        )
                                        return (
                                          <li key={lesson.id}>
                                            {accessible ? (
                                              <Link href={lessonHref} className="block">
                                                {Row}
                                              </Link>
                                            ) : (
                                              Row
                                            )}
                                          </li>
                                        )
                                      })
                                    )}
                                  </ol>
                                </div>
                              </AccordionContent>
                            </AccordionItem>
                          )
                        })}
                      </Accordion>
                    )}
                  </CardContent>
                </Card>

                {/* Requirements — hidden entirely when none, so a free
                    course with no prerequisites doesn't show an empty
                    headed card. */}
                {course.requirements.filter((s) => s.trim()).length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Requirements</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {course.requirements.filter((s) => s.trim()).map((req, index) => (
                          <li key={index} className="flex items-start gap-2 text-sm">
                            <span className="text-muted-foreground">•</span>
                            {req}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                {/* Reviews — aggregate score + distribution + recent
                    reviews. Enrolled students see a "Write a review"
                    form pre-filled with their existing review if any. */}
                <CourseReviews
                  courseId={course.id}
                  studentId={currentUser?.id}
                  canReview={userEnrolled}
                />

                {/* Q&A — resolved/answered student questions shown
                    publicly so prospective students can see real
                    teacher responses before buying. Includes an
                    "Ask a question" form for new enquiries. */}
                <CourseQnA
                  courseId={course.id}
                  courseTitle={course.title}
                  instructorId={instructor.id}
                  instructorName={instructor.name}
                  instructorEmail={instructor.email}
                />

                {/* More courses by this instructor */}
                <InstructorOtherCourses
                  currentCourseId={course.id}
                  instructorId={instructor.id}
                  instructorName={instructor.name}
                />
              </div>

              {/* Sidebar - Sticky Purchase Card + Instructor card */}
              <div className="lg:col-span-1">
                <div className="sticky top-24 space-y-4">
                  {/* py-0 strips Card's default vertical padding so the
                      thumbnail butts straight up against the top edge of
                      the card. Inner CardContent re-introduces its own
                      padding below. */}
                  <Card className="overflow-hidden py-0">
                    <div className="aspect-video bg-muted">
                      <img
                        src={course.thumbnail || "/placeholder.svg?height=400&width=600"}
                        alt={course.title}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <CardContent className="p-6">
                      <div className="flex items-baseline gap-2 mb-4">
                        <span className="text-3xl font-bold">
                          {course.price > 0 ? formatMoney(course.price, course.currency) : "Free"}
                        </span>
                        {course.originalPrice && course.originalPrice > course.price && (
                          <>
                            <span className="text-lg text-muted-foreground line-through">
                              {formatMoney(course.originalPrice, course.currency)}
                            </span>
                            <span className="text-sm text-destructive font-medium">
                              {Math.round((1 - course.price / course.originalPrice) * 100)}% off
                            </span>
                          </>
                        )}
                      </div>

                      {userEnrolled ? (
                        <Button asChild className="w-full" size="lg">
                          <Link
                            href={
                              currentTenant?.slug
                                ? `/p/${currentTenant.slug}/learn/${course.slug}`
                                : `/learn/${course.slug}`
                            }
                          >
                            Continue Learning
                          </Link>
                        </Button>
                      ) : (
                        <Button
                          className="w-full"
                          size="lg"
                          onClick={handleEnroll}
                          disabled={isEnrolling}
                        >
                          {isEnrolling ? "Enrolling..." : "Enroll Now"}
                        </Button>
                      )}

                      {/* Coupon banner — only shows when the course has
                          at least one currently-valid coupon. Surfaces
                          the best code + discount so a visitor knows a
                          deal exists before they hit checkout. */}
                      {(() => {
                        const now = Date.now()
                        const active = (course.coupons ?? []).filter((c) => {
                          const after = !c.validFrom || new Date(c.validFrom).getTime() <= now
                          const before = !c.validUntil || new Date(c.validUntil).getTime() >= now
                          const underCap = !c.maxUses || (c.uses ?? 0) < c.maxUses
                          return after && before && underCap
                        })
                        if (active.length === 0) return null
                        // Lead with the biggest discount on offer.
                        const best = [...active].sort((a, b) => b.discountPercent - a.discountPercent)[0]
                        return (
                          <div className="mt-3 flex items-center gap-2 rounded-md border border-dashed border-accent/40 bg-accent/5 p-2.5 text-xs">
                            <Ticket className="h-4 w-4 shrink-0 text-accent" />
                            <span className="min-w-0 flex-1">
                              Use{" "}
                              <code className="rounded bg-background px-1.5 py-0.5 font-mono font-semibold text-accent">
                                {best.code}
                              </code>{" "}
                              at checkout for <span className="font-semibold">{best.discountPercent}% off</span>
                              {active.length > 1 && (
                                <span className="text-muted-foreground"> · {active.length - 1} more code{active.length === 2 ? "" : "s"} available</span>
                              )}
                            </span>
                          </div>
                        )
                      })()}

                      <p className="mt-3 text-center text-xs text-muted-foreground">
                        30-day money-back guarantee
                      </p>

                      {course.features.filter((s) => s.trim()).length > 0 && (
                        <div className="mt-6 space-y-3">
                          <h4 className="font-semibold">This course includes:</h4>
                          {course.features.filter((s) => s.trim()).map((feature, index) => (
                            <div key={index} className="flex items-center gap-2 text-sm">
                              <Check className="h-4 w-4 text-success" />
                              {feature}
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Instructor card — improved with profile linking */}
                  <Card className="overflow-hidden py-0 group">
                    <Link href={profileUrl} className="block relative h-24 w-full bg-muted transition-opacity hover:opacity-90"
                      style={
                        instructor.coverImageUrl
                          ? undefined
                          : { backgroundImage: "linear-gradient(135deg, var(--primary), var(--accent))" }
                      }
                    >
                      {instructor.coverImageUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={instructor.coverImageUrl}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      )}
                    </Link>
                    <CardContent className="-mt-8 px-4 pb-4">
                      <div className="flex items-end gap-3">
                        <Link href={profileUrl} className="shrink-0 transition-transform hover:scale-105">
                          {instructor.avatar ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={instructor.avatar}
                              alt={instructor.name}
                              className="relative h-16 w-16 rounded-full object-cover ring-4 ring-card bg-card"
                            />
                          ) : (
                            <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-primary text-base font-semibold text-primary-foreground ring-4 ring-card">
                              {instructor.name.split(" ").map((n) => n[0]).join("")}
                            </div>
                          )}
                        </Link>
                        <div className="min-w-0 pb-1">
                          <Link href={profileUrl} className="hover:underline">
                            <p className="truncate text-sm font-semibold">{instructor.name}</p>
                          </Link>
                          <p className="truncate text-xs text-muted-foreground">Instructor</p>
                        </div>
                      </div>
                      {instructor.bio && (
                        <p className="mt-3 line-clamp-3 whitespace-pre-wrap text-sm text-muted-foreground">
                          {instructor.bio}
                        </p>
                      )}
                      
                      <InstructorSocials user={instructor} className="mt-3" />

                      <Button variant="outline" className="w-full mt-4" asChild>
                        <Link href={profileUrl}>
                          View full profile
                        </Link>
                      </Button>

                      {/* Pre-sale enquiry, sidebar entry. Same
                          dialog as the prominent hero CTA — lands the
                          guest's question in the dashboard inbox and
                          fires owner notifications. Kept as a quieter
                          ghost variant here because the hero CTA is
                          already shouting; this is the "I scrolled to
                          the instructor card and want a second
                          chance" affordance. */}
                      <div className="mt-2">
                        <EmailTeacherDialog
                          courseId={course.id}
                          courseTitle={course.title}
                          instructor={{
                            id: instructor.id,
                            name: instructor.name,
                            email: instructor.email,
                          }}
                          variant="ghost"
                        />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {!inTenant && <Footer />}
    </div>
    </PortalThemeProvider>
  )
}

// Smart duration label.
//
// Lesson durations are stored as minutes, but a course summed across
// many short readings ends up with a number like "1247 minutes" — too
// noisy. We render <60 min as "X min", 60-3600 as "Xh Ym" (skipping
// zero minutes for clean hours), and anything beyond that as plain
// "Xh". Always returns a non-empty string so callers can drop it
// inline without checking for null.
function formatLessonDuration(totalMinutes: number): string {
  const m = Math.max(0, Math.round(totalMinutes))
  if (m < 60) return `${m} min`
  const hours = Math.floor(m / 60)
  const mins = m % 60
  if (mins === 0) return `${hours}h`
  return `${hours}h ${mins}m`
}

// Pluralize a label by appending "s" when the count isn't 1. Keeps a
// short hand-built list of irregular forms in line so the curriculum
// chips read naturally ("1 quiz" / "3 quizzes").
function pluralizeLabel(label: string, count: number): string {
  if (count === 1) return label
  if (label.endsWith("z")) return `${label}zes`
  if (label.endsWith("s")) return `${label}es`
  return `${label}s`
}

// Small stat tile used in the "What's in this course" grid above the
// curriculum. `hideIfZero` lets the caller silently drop a tile whose
// value is 0 — e.g. a course with no quizzes shouldn't say "0 Quizzes".
function StatTile({
  icon: Icon,
  label,
  value,
  suffix,
  hint,
  hideIfZero,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: number
  suffix?: string
  hint?: string
  hideIfZero?: boolean
}) {
  if (hideIfZero && value === 0) return null
  return (
    <div className="flex items-start gap-3 rounded-lg border border-border bg-card/50 p-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-lg font-bold leading-none text-foreground">
          {value.toLocaleString()}
          {suffix}
        </p>
        <p className="mt-1 text-xs font-medium text-muted-foreground">{label}</p>
        {hint && <p className="mt-0.5 text-[11px] text-muted-foreground/80">{hint}</p>}
      </div>
    </div>
  )
}
