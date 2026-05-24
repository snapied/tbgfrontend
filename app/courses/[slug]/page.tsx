"use client"

import { use, useEffect, useMemo, useState } from "react"
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
  Sparkles,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { LessonType } from "@/lib/lms-store"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { useLMS } from "@/lib/lms-store"
import { useStore, money as storeMoney } from "@/lib/store-store"
import { formatMoney } from "@/lib/currency"
import { RichTextContent, isRichTextEmpty, stripRichTextTags } from "@/components/editor/rich-text-content"
import { LessonTypeIcon, lessonTypeLabel } from "@/components/learn/lesson-type-icon"
import { VideoUrlPreview } from "@/components/upload/video-url-preview"
import { CourseReviews } from "@/components/learn/course-reviews"
import { CertificateFull } from "@/components/certificates/certificate-preview"
import { CourseQnA } from "@/components/learn/course-qna"
import { InstructorOtherCourses } from "@/components/learn/instructor-other-courses"
import { InstructorSocials } from "@/components/learn/instructor-socials"
import { PreviewLessonModal, type PreviewLesson } from "@/components/portal/preview-lesson-modal"
import { CourseTestimonialsInline } from "@/components/learn/course-testimonials-inline"
import { useExperiment } from "@/lib/experiments"
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
import { AnimatedStrike } from "@/components/learn/animated-strike"
import { useWishlist } from "@/lib/wishlist"
import { Heart } from "lucide-react"
import { TenantBrandedQuoteCard } from "@/components/portal/branded-quote-card"
import { toast } from "sonner"
import { canViewCourse, hasPasswordOk } from "@/lib/course-visibility"
import { CoursePasswordGate } from "@/components/course/course-password-gate"

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
    enrollments,
  } = useLMS()
  // Storefront read — used to surface the auto-generated bundle
  // (course + bump + 1:1) under the Enroll button. Bundle was
  // created by the Monetize wizard at publish time; we only render
  // the CTA when one exists and overlaps with this course's bump
  // or coaching product. No bundle → no CTA → buyer sees the
  // unchanged Enroll button.
  const { products } = useStore()
  // Pull the tenant's portal config so the global course detail page
  // obeys the same brand (colors, fonts, custom CSS) the customer
  // portal does. Without this, a tenant who set "Editorial" sees a
  // navy-default hero on their own course page — a jarring jump out
  // of their brand. Wrapping in PortalThemeProvider gets us the
  // baseline polish + every template's overrides for free.
  const { currentTenant } = useTenant()
  const { config, faculty } = usePortal()
  // When this page is rendered through the portal wrapper
  // (/p/<tenant>/courses/details/<slug>) the tenant layout already
  // paints the tenant's site header + footer. Detect that via the URL
  // so we can suppress our own platform chrome and avoid a duplicate
  // header — otherwise the visitor sees both stacked on top of each
  // other.
  const { tenant: urlTenant, inTenant, basePath } = useTenantBasePath()
  // The URL-resolved tenant always wins. `currentTenant` can lag the
  // URL (e.g. a visitor lands directly on /p/gaurav-academy/... before
  // the tenant store has switched), and falling back to "default"
  // pointed Instructor / enroll links at the wrong workspace — that's
  // what produced the "Instructor not found" 404 when clicking the
  // instructor link on another tenant's course detail page.
  const tenantSlug = urlTenant ?? currentTenant?.slug ?? "default"
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

  // Sprint D — A/B experiment using the Sprint 3 primitive.
  // Tests three pricing displays on the sticky enroll rail:
  //   • "control"   — current behaviour (price + strikethrough + % off)
  //   • "anchor"    — leads with the strikethrough original, then price
  //                   below in primary colour. Tests if visual anchoring
  //                   to the higher number lifts perceived value.
  //   • "savings"   — leads with "Save ${diff}" framed in a chip,
  //                   then the price. Tests loss-aversion framing.
  // The admin defines this experiment in /dashboard/experiments
  // under key "course-price-display". If absent, hook returns
  // "control" silently — no production crash when an experiment
  // gets deleted. Conversion fires on actual enrolment below.
  const priceExperiment = useExperiment({
    tenantSlug: currentTenant?.slug ?? "default",
    key: "course-price-display",
    variantIds: ["control", "anchor", "savings"],
  })
  useEffect(() => {
    // Only fire exposure once we've actually rendered the rail
    // (i.e. course is published and viewable). De-duped by the
    // hook so route-bounces don't inflate impressions.
    if (course && course.status === "published") priceExperiment.exposure()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [course?.id, course?.status])

  // Sprint A Brand #25 — preview lesson modal. Clicking a lesson
  // marked `isPreview` in the curriculum opens this modal instead of
  // routing to /learn. State holds the selected lesson; null closes
  // the modal. We keep it as state on this page (not the modal) so
  // the curriculum row can drive it from any module/lesson position.
  const [previewLesson, setPreviewLesson] = useState<PreviewLesson | null>(null)
  // Password-unlock state. Hook order rule: this MUST live above the
  // early "course not found" return so the hook is invoked on every
  // render regardless of branch. `course?.id` falls back to a
  // sentinel so the initializer never explodes when the course
  // hasn't resolved yet.
  const [pwUnlocked, setPwUnlocked] = useState<boolean>(() =>
    course?.id ? hasPasswordOk(course.id) : false,
  )
  useEffect(() => {
    if (!course?.id) return
    setPwUnlocked(hasPasswordOk(course.id))
  }, [course?.id])

  // Bundle CTA — find a published `bundle`-kind product whose child
  // ids overlap with this course's bump or coaching product. Matches
  // whatever the Monetize wizard auto-created at publish. Null when
  // no overlap exists (instructor opted out of the bundle, or the
  // course was published before the wizard landed).
  const bundleProduct = useMemo(() => {
    if (!course) return null
    const bumpId = course.checkoutBumpProductId
    const coachId = course.coachingProductId
    if (!bumpId && !coachId) return null
    return (
      products.find((p) => {
        if (p.kind !== "bundle") return null
        if (p.status !== "published") return null
        if (p.delivery.kind !== "bundle") return null
        const children = p.delivery.childProductIds ?? []
        return (
          (bumpId && children.includes(bumpId)) ||
          (coachId && children.includes(coachId))
        )
      }) ?? null
    )
  }, [course, products])
  // Modules the visitor has expanded in the curriculum accordion.
  // Sprint B Brand #24 — default-open the first module AND every
  // module that contains a free-preview lesson, so the visitor's
  // first glance shows the actual "try before you enrol" surface
  // (clicking the preview row opens the preview modal — Sprint A
  // Brand #25). Modules without preview stay collapsed so a 20-
  // module course doesn't paint a screen-long wall of triggers.
  // The "Expand all" button still works the same way.
  const [openModules, setOpenModules] = useState<string[]>(() => {
    if (!course) return []
    const initial: string[] = []
    course.modules.forEach((m, idx) => {
      const hasPreview = (m.lessons ?? []).some((l) => l.isPreview)
      if (idx === 0 || hasPreview) initial.push(m.id)
    })
    return initial
  })

  // Counts derived from the lessons + assignments attached to this
  // course. Surfaced as a stat grid above the curriculum so a visitor
  // sees at a glance how much video / reading / practice the course
  // actually contains — instead of having to expand every module.
  // Updates automatically as the Instructor adds or removes content.
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

  // Visibility gate. The decision lives in one place (canViewCourse)
  // so the catalogue, detail page and lesson player can never drift
  // out of sync. Instructors / co-instructors / workspace admins
  // bypass every gate — they need to be able to preview their own
  // course or troubleshoot a student's report.
  //   • password   → render the password gate; on unlock the host
  //                  re-renders and the gate returns "allowed"
  //   • private    → render an invite-required wall with the
  //                  instructor's contact button
  //   • unlisted   → already passed (the link is the gate)
  //   • public     → render normally
  //
  // Re-checked on every render so a Instructor who flips a course to
  // private mid-session sees it lock immediately. The pwUnlocked
  // state hook itself lives at the top of the component (above the
  // 404 return) so React always sees the same hook order.
  const access = canViewCourse(course, {
    user: currentUser,
    enrollments,
    passwordOk: pwUnlocked,
  })

  if (!access.allowed && access.reason === "needs-password") {
    return (
      <CoursePasswordGate
        courseId={course.id}
        courseTitle={course.title}
        expectedPassword={course.accessPassword ?? ""}
        onUnlock={() => setPwUnlocked(true)}
        backHref={inTenant ? `${basePath}/courses` : "/courses"}
      />
    )
  }
  if (!access.allowed && access.reason === "needs-invite") {
    return (
      <PortalThemeProvider tenant={tenantSlug} brand={liveBrand}>
        <div className="min-h-screen flex flex-col">
          {!inTenant && <Header />}
          <main className="flex-1 flex items-center justify-center px-6 py-12">
            <div className="max-w-md text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Lock className="h-5 w-5 text-primary" />
              </div>
              <h1 className="mt-4 font-serif text-2xl font-bold">Private course</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{course.title}</span>{" "}
                is invite-only. Only enrolled students can open it. If your
                instructor sent you here, sign in with the email they invited
                — or reach out so they can add you to the roster.
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                {!currentUser && (
                  <Button asChild>
                    <Link
                      href={`/login?next=${encodeURIComponent(
                        typeof window === "undefined" ? "" : window.location.pathname,
                      )}`}
                    >
                      Sign in
                    </Link>
                  </Button>
                )}
                <Button variant="outline" asChild>
                  <Link href={inTenant ? `${basePath}/courses` : "/courses"}>
                    Browse other courses
                  </Link>
                </Button>
              </div>
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
  // a Instructor who renames themselves never sees the new name on their own
  // course pages. Falls back to the snapshot when the user record has
  // been deleted, so the page never breaks on missing data.
  const instructor = getUserById(course.instructor.id) ?? course.instructor
  const facultyMember = faculty?.find(f => f.userId === instructor.id)
  const instructorHandle = facultyMember?.handle || instructor.email.split("@")[0]
  // Canonical instructor URL — /instructors/* alias remains for legacy
  // shared links but every internal byline points at /instructors/*.
  const profileUrl = `/p/${tenantSlug}/instructors/${instructorHandle}`

  // Enrollment is gated to published courses. Drafts can still be
  // previewed via direct link (e.g. the instructor's "Preview" button
  // in the editor) but the catalog never lists them and the Enroll
  // button is disabled here, with a toast if anyone reaches the
  // handler through a stale UI state.
  const isPublishedForEnrollment = course.status === "published"

  const handleEnroll = () => {
    if (!currentUser) {
      // Pass the current course path as ?next= so the visitor lands
      // back here after sign-in instead of on the generic dashboard.
      // `postAuthDestination` validates the value for safety.
      const here = typeof window !== "undefined" ? window.location.pathname : `/courses/${course.slug}`
      toast.info("Sign in to enrol", {
        description: "We'll bring you right back to this course after you log in.",
      })
      router.push(`/login?next=${encodeURIComponent(here)}`)
      return
    }
    if (!isPublishedForEnrollment) {
      toast.error("This course isn't published yet — enrollment is disabled.")
      return
    }

    setIsEnrolling(true)
    // Simulate enrollment, then drop the learner into the lesson
    // player. When the visitor came from a tenant context, prefer
    // the portal-scoped learn route so the URL stays inside the
    // tenant namespace.
    setTimeout(() => {
      enrollStudent(course.id, currentUser.id)
      // Sprint D A/B — fire the conversion event so the price-
      // display experiment can compute per-variant lift. Event name
      // is the same the admin types into "goals" on the experiment
      // form. We also fire a generic "enroll" so any future
      // experiment (CTA copy, etc.) gated on the same name picks
      // up the same conversion.
      priceExperiment.convert("enroll")
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
  // Schema.org Course JSON-LD. Beyond the basic identity fields,
  // Google Search renders rich snippets (price, ratings, duration)
  // when `offers`, `aggregateRating`, and `hasCourseInstance` are
  // present — well worth the extra few lines.
  //
  //   • `offers` lets the search result show the price; we omit it
  //     for free courses so Google doesn't show "₹0".
  //   • `aggregateRating` only renders when at least one review
  //     exists — fewer than 1 vote makes the snippet look unloved.
  //   • `hasCourseInstance` is required by Google's Course content
  //     guidelines as of 2024; we ship a minimal Online + Self-paced
  //     instance so the structured data validates.
  const totalDurationIso = course.totalDuration && course.totalDuration > 0
    ? `PT${Math.floor(course.totalDuration / 60)}H${course.totalDuration % 60}M`
    : undefined
  // Sprint A Brand #50 — emit a graph of structured-data objects in
  // ONE @graph payload so Google can correlate them. Order:
  //   1. Course (main entity, already comprehensive)
  //   2. BreadcrumbList (rich result on SERP)
  //   3. Organization (provider identity; cross-references siteName)
  // We previously emitted only the Course object; merging into a
  // @graph reduces total ld+json blocks the crawler has to parse and
  // explicitly links the entities together via @id.
  const pageUrl = typeof window !== "undefined" ? window.location.href : undefined
  const courseUrl = pageUrl ?? `${inTenant ? `/p/${tenantSlug}` : ""}/courses/${course.slug}`
  const courseJsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Course",
        "@id": `${courseUrl}#course`,
        name: course.title,
        description: courseMetaDescription,
        image: course.thumbnail,
        provider: { "@id": `${courseUrl}#org` },
        author: instructor?.name
          ? { "@type": "Person", name: instructor.name }
          : undefined,
        inLanguage: course.language || "en",
        educationalLevel: course.level,
        hasCourseInstance: {
          "@type": "CourseInstance",
          courseMode: "Online",
          courseWorkload: totalDurationIso,
        },
        offers:
          course.price && course.price > 0
            ? {
              "@type": "Offer",
              price: course.price,
              priceCurrency: course.currency || "INR",
              availability: "https://schema.org/InStock",
              url: courseUrl,
            }
            : undefined,
        aggregateRating:
          course.rating && course.reviewCount && course.reviewCount > 0
            ? {
              "@type": "AggregateRating",
              ratingValue: course.rating,
              reviewCount: course.reviewCount,
              bestRating: 5,
              worstRating: 1,
            }
            : undefined,
      },
      {
        "@type": "Organization",
        "@id": `${courseUrl}#org`,
        name: siteName,
        url: inTenant ? `/p/${tenantSlug}` : undefined,
        logo: inTenant ? brand.logoUrl : undefined,
      },
      // Breadcrumbs surface the path on Google SERP, which lifts CTR
      // because users can see they're getting to a course detail and
      // not a category dump.
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: inTenant ? `/p/${tenantSlug}` : "/" },
          { "@type": "ListItem", position: 2, name: "Courses", item: inTenant ? `/p/${tenantSlug}/courses` : "/courses" },
          { "@type": "ListItem", position: 3, name: course.title, item: courseUrl },
        ],
      },
    ].filter(Boolean),
  })

  return (
    <PortalThemeProvider tenant={tenantSlug} brand={liveBrand}>
    <DynamicMeta
      title={course.title}
      titleTemplate={`%s · ${siteName}`}
      description={courseMetaDescription}
        image={course.ogImage || course.thumbnail || (inTenant ? brand.logoUrl : undefined)}
      type="website"
      siteName={siteName}
      keywords={course.category ? [course.category, course.level, "course", "online learning"] : undefined}
      jsonLd={courseJsonLd}
    />
    <PortalAnalyticsScripts analytics={config.analytics} />
    <div className="min-h-screen flex flex-col">
      {!inTenant && <Header />}

        <main id="main-content" className="flex-1">
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

                <div className="flex flex-wrap items-start justify-between gap-3">
                  <h1 className="font-serif text-3xl font-bold leading-tight sm:text-5xl">
                    {course.title}
                  </h1>
                  {/* Save-for-later — wishlist primitive is already
                    visitor-scoped (anon + signed-in), so this works
                    on cold traffic too. Lives in the hero so it's
                    obvious to a hesitant buyer that "I'll come back
                    later" is a first-class action, not a hunt. */}
                  <WishlistHeart courseId={course.id} tenantSlug={currentTenant?.slug ?? ""} />
                </div>
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
                  {/* Hide the duration chip entirely when nothing's been
                    set — "0h total" reads as a broken/empty course
                    instead of an honest "self-paced, no recorded
                    content yet". Below 1 hour we display "Under 1h"
                    so a 35-minute mini-course doesn't show "0h". */}
                  {course.totalDuration > 0 && (
                    <span className="inline-flex items-center gap-1.5">
                      <Clock className="h-4 w-4" />
                      {course.totalDuration >= 60
                        ? `${Math.round(course.totalDuration / 60)}h total`
                        : "Under 1h"}
                    </span>
                  )}
                  {course.totalLessons > 0 && (
                    <span className="inline-flex items-center gap-1.5">
                      <BookOpen className="h-4 w-4" />
                      {course.totalLessons} {course.totalLessons === 1 ? "lesson" : "lessons"}
                    </span>
                  )}
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
                  hero sees one obvious way to reach the Instructor
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

          {/* Jump-to nav — sticky horizontal chip rail under the hero so
            visitors can skip the 6+ minute scroll on long course pages.
            Each chip anchors to a Card by id; we conditionally hide
            the chip whose section won't render (e.g. no certificate,
            no whatYouLearn). The bar overflows horizontally on mobile
            with scroll-snap so it feels like a native pill rail. */}
          <nav
            aria-label="Course sections"
            className="sticky top-0 z-30 border-y border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80"
          >
            <div className="mx-auto max-w-7xl overflow-x-auto px-6 lg:px-8">
              <ul className="flex min-w-max items-center gap-1 py-2 text-[12.5px] font-medium">
                {!isRichTextEmpty(course.description) && courseDescriptionPlain.trim().length > 12 && (
                  <li><a href="#about" className="inline-block rounded-full px-3 py-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">About</a></li>
                )}
                {course.whatYouLearn.filter((s) => s.trim()).length > 0 && (
                  <li><a href="#learn" className="inline-block rounded-full px-3 py-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">What you&rsquo;ll learn</a></li>
                )}
                {stats && (stats.lessons + stats.assignments + stats.projects + stats.tests + stats.attachments + stats.liveSessions) > 0 && (
                  <li><a href="#contents" className="inline-block rounded-full px-3 py-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">Curriculum</a></li>
                )}
                {course.certificateEligible !== false && course.certificateTemplate && (
                  <li><a href="#certificate" className="inline-block rounded-full px-3 py-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">Certificate</a></li>
                )}
                {/* Hide Reviews + Q&A chips on cold courses (no reviews,
                  no answered questions). The empty sections still
                  render below — buyers can still ask — but the
                  jump-nav chips don't pretend there's content to
                  jump to. */}
                {course.reviewCount > 0 && (
                  <li><a href="#reviews" className="inline-block rounded-full px-3 py-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">Reviews</a></li>
                )}
              </ul>
            </div>
          </nav>

        {/* Main Content */}
          <section className="py-12 scroll-smooth">
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
                    instead of fighting the dark navy hero. We also
                    suppress the card for trivial descriptions like
                    "add" or "TBD" — `isRichTextEmpty` only checks
                    for empty HTML, but a Instructor who typed a single
                    placeholder word shouldn't ship a hero-sized
                    "About" card that reads "add". 12-char floor is
                    short enough that "Free course" still renders. */}
                  {!isRichTextEmpty(course.description) &&
                    courseDescriptionPlain.trim().length > 12 && (
                      <div id="about" className="scroll-mt-24">
                        <TenantBrandedQuoteCard
                          icon={<Sparkles className="h-4 w-4" />}
                          eyebrow="About"
                          title="About this course"
                        >
                      <RichTextContent html={course.description} />
                      </TenantBrandedQuoteCard>
                    </div>
                )}

                {/* What you'll learn — only when the instructor filled it in. */}
                {course.whatYouLearn.filter((s) => s.trim()).length > 0 && (
                    <Card id="learn" className="scroll-mt-24">
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
                    stay accurate as the Instructor edits content. We hide
                    the whole card only when literally everything is
                    zero (a brand-new empty course); otherwise zeros for
                    individual tiles are skipped so the grid never
                    shows "0 projects". */}
                {stats && (stats.lessons + stats.assignments + stats.projects + stats.tests + stats.attachments + stats.liveSessions) > 0 && (
                    <Card id="contents" className="scroll-mt-24">
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
                          <CardTitle className="flex flex-wrap items-center gap-2">
                            Course Content
                            {/* Freshness pill. Visitors trust courses
                              that are actively maintained more than
                              ones that look frozen. We surface
                              "Updated <relative>" when the course
                              has been touched in the last 60 days;
                              older edits stay quiet (showing
                              "updated 14 months ago" hurts more
                              than it helps). */}
                            {(() => {
                              const updated = course.updatedAt
                              if (!updated) return null
                              const ms = Date.now() - new Date(updated).getTime()
                              const days = Math.floor(ms / 86_400_000)
                              if (days < 0 || days > 60) return null
                              const label =
                                days <= 1 ? "Updated today" :
                                  days <= 7 ? `Updated ${days} days ago` :
                                    days <= 30 ? `Updated this month` :
                                      `Updated last month`
                              return (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
                                  <Sparkles className="h-3 w-3" />
                                  {label}
                                </span>
                              )
                            })()}
                          </CardTitle>
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
                                            {/* Sprint A Brand #25 — clicking a preview
                                                lesson opens the in-place preview modal
                                                instead of routing to /learn. Enrolled
                                                students still get the deep-link straight
                                                to the full player; locked lessons
                                                render as a static row (no click). */}
                                            {lesson.isPreview && !userEnrolled ? (
                                              <button
                                                type="button"
                                                onClick={() =>
                                                  setPreviewLesson({
                                                    id: lesson.id,
                                                    title: lesson.title || "Untitled lesson",
                                                    description: lesson.description,
                                                    type: lesson.type,
                                                    content: lesson.content,
                                                    duration: lesson.duration,
                                                  })
                                                }
                                                className="block w-full text-left"
                                              >
                                                {Row}
                                              </button>
                                            ) : accessible ? (
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

                  {/* Certificate preview — shown only on certificate-
                    eligible courses. We render the real `CertificateFull`
                    component (the same one students download on
                    completion) with placeholder name + today's date,
                    signed by the course instructor. Visitors get to see
                    exactly what they'll earn before they enroll — a
                    fairly strong conversion signal for credential-
                    seeking learners. The "(preview)" tag + "Your name
                    here" placeholder keep the dummy nature obvious. */}
                  {course.certificateEligible !== false && course.certificateTemplate && (
                    <Card id="certificate" className="scroll-mt-24">
                      <CardHeader>
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <CardTitle>Your certificate on completion</CardTitle>
                            <p className="mt-1 text-sm text-muted-foreground">
                              Finish every lesson and we issue this certificate, signed by{" "}
                              <span className="font-medium text-foreground">
                                {course.instructor?.name ?? "the instructor"}
                              </span>
                              . Verifiable via a unique ID, downloadable as PDF.
                            </p>
                          </div>
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">
                            Preview
                          </span>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="overflow-hidden rounded-lg border border-border bg-muted/20 p-4">
                          <CertificateFull
                            template={course.certificateTemplate as Parameters<typeof CertificateFull>[0]["template"]}
                            name="Your name here"
                            course={course.title}
                            date={new Date().toLocaleDateString(undefined, {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })}
                            instructor={course.instructor?.name ?? "Instructor"}
                            certificateId="CERT-PREVIEW"
                          />
                        </div>
                        <p className="mt-3 text-[11px] text-muted-foreground">
                          This is a preview. Your real certificate carries a unique verification ID and your name as it appears in your account.
                        </p>
                      </CardContent>
                    </Card>
                  )}

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

                  {/* Sprint B Brand #38 — inline testimonials. Renders
                    portal testimonials matching this course OR its
                    instructor. Hidden when fewer than 2 match so a
                    single quote doesn't read as cherry-picked. The
                    Wall of Love link routes to the full collection. */}
                  <CourseTestimonialsInline
                    courseId={course.id}
                    instructorId={instructor.id}
                    wallHref={inTenant ? `${basePath}/wall` : "/wall"}
                  />

                {/* Reviews — aggregate score + distribution + recent
                    reviews. Enrolled students see a "Write a review"
                    form pre-filled with their existing review if any.
                    Wrapper div carries the anchor since CourseReviews
                    doesn't accept arbitrary props. */}
                  <div id="reviews" className="scroll-mt-24">
                    <CourseReviews
                      courseId={course.id}
                      studentId={currentUser?.id}
                      canReview={userEnrolled}
                    />
                  </div>

                {/* Q&A — resolved/answered student questions shown
                    publicly so prospective students can see real
                    Instructor responses before buying. Includes an
                    "Ask a question" form for new enquiries. */}
                  <div id="qna" className="scroll-mt-24">
                    <CourseQnA
                      courseId={course.id}
                      courseTitle={course.title}
                      instructorId={instructor.id}
                      instructorName={instructor.name}
                      instructorEmail={instructor.email}
                    />
                  </div>

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
                        {/* Sprint D A/B — three variants of the price
                          display, resolved by the experiments hook.
                          The conversion event ("enroll") fires from
                          handleEnroll below. Each variant keeps the
                          same data; only framing changes. */}
                        {(() => {
                          const hasDiscount = !!course.originalPrice && course.originalPrice > course.price
                          const isFree = course.price === 0
                          if (isFree) {
                            return (
                              <div className="mb-4 flex items-baseline gap-2">
                                <span className="text-3xl font-bold">Free</span>
                              </div>
                            )
                          }
                          if (priceExperiment.variant === "anchor" && hasDiscount) {
                            // Lead with the strikethrough anchor in
                            // muted; show the actual price big in
                            // primary colour below. Tests if visual
                            // anchoring lifts perceived value.
                            return (
                              <div className="mb-4">
                                <p className="text-sm text-muted-foreground">
                                  <AnimatedStrike>
                                    {formatMoney(course.originalPrice!, course.currency)}
                                  </AnimatedStrike>
                                </p>
                                <p className="text-3xl font-bold text-primary">
                                  {formatMoney(course.price, course.currency)}
                                </p>
                              </div>
                            )
                          }
                          if (priceExperiment.variant === "savings" && hasDiscount) {
                            // Loss-aversion framing — "Save $X" in a
                            // chip, then the price as supporting
                            // detail.
                            const savings = course.originalPrice! - course.price
                            return (
                              <div className="mb-4 space-y-1.5">
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[12px] font-bold text-emerald-700 dark:text-emerald-300">
                                  Save {formatMoney(savings, course.currency)}
                                </span>
                                <div className="flex items-baseline gap-2">
                                  <span className="text-3xl font-bold">
                                  {formatMoney(course.price, course.currency)}
                                </span>
                                  <span className="text-sm text-muted-foreground">
                                    <AnimatedStrike>
                                      {formatMoney(course.originalPrice!, course.currency)}
                                    </AnimatedStrike>
                                  </span>
                                </div>
                              </div>
                            )
                          }
                          // Control — current behaviour.
                          return (
                            <div className="mb-4 flex items-baseline gap-2">
                              <span className="text-3xl font-bold">
                                {formatMoney(course.price, course.currency)}
                              </span>
                              {hasDiscount && (
                                <>
                                <span className="text-lg text-muted-foreground">
                                  <AnimatedStrike>
                                    {formatMoney(course.originalPrice!, course.currency)}
                                  </AnimatedStrike>
                                </span>
                                <span className="text-sm text-destructive font-medium">
                                  {Math.round((1 - course.price / course.originalPrice!) * 100)}% off
                                </span>
                              </>
                            )}
                          </div>
                          )
                        })()}

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
                            <>
                              <Button
                                className="w-full"
                                size="lg"
                                onClick={handleEnroll}
                                disabled={isEnrolling || !isPublishedForEnrollment}
                                title={
                                  !isPublishedForEnrollment
                                    ? "This course isn't published yet"
                                    : undefined
                                }
                              >
                                {isEnrolling
                                  ? "Enrolling..."
                                  : !isPublishedForEnrollment
                                    ? "Not yet available"
                                    : "Enroll Now"}
                              </Button>
                            {/* Sprint A Brand #23 — trust microcopy
                              directly under the primary action. Three
                              short reassurances + 30d refund anchor
                              the conversion right at the moment of
                              decision. Hidden when the CTA is
                              disabled (not yet published) — there's
                              no enrollment to reassure about. */}
                            {isPublishedForEnrollment && (
                              <p className="mt-2 text-center text-[11.5px] text-muted-foreground">
                                <span className="inline-flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5">
                                  <span>30-day refund</span>
                                  <span aria-hidden>·</span>
                                  <span>Secure payment</span>
                                  <span aria-hidden>·</span>
                                  <span>Lifetime access</span>
                                </span>
                              </p>
                            )}
                            {!isPublishedForEnrollment && (
                              <p className="mt-2 rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
                                This course is still a {course.status}. Enrollment will
                                open as soon as the instructor publishes it.
                              </p>
                            )}
                          </>
                        )}

                        {/* Bundle CTA — auto-surfaced when the
                          Monetize wizard created a bundle whose
                          child ids overlap with this course's bump
                          / 1:1. Visitors get one click to upgrade
                          before they even hit checkout. */}
                        {/* Auto-generated "What you get" checklist —
                          derived from the Monetize wizard settings on
                          the Course. Reuses the existing storefront
                          product lookups for the bump + 1:1 + bundle so
                          the lines mirror what the buyer actually
                          ends up with in their cart. */}
                        {!userEnrolled && (
                          <WhatYouGetChecklist
                            lessonsCount={course.modules.reduce(
                              (acc, m) => acc + m.lessons.length,
                              0,
                            )}
                            hasCommunity={!!course.defaultBatchId}
                            hasBump={!!course.checkoutBumpProductId}
                            bumpTitle={
                              course.checkoutBumpProductId
                                ? products.find((p) => p.id === course.checkoutBumpProductId)?.title
                                : undefined
                            }
                            hasCoaching={!!course.coachingProductId}
                            certificate={!!course.certificateEligible}
                            totalDurationMinutes={course.totalDuration ?? 0}
                          />
                        )}

                        {!userEnrolled && bundleProduct && bundleProduct.pricing.type === "one-time" && (
                          <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3">
                            <p className="text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                              Or get the complete package
                            </p>
                            <p className="mt-1 text-sm">
                              {bundleProduct.title}
                              <span className="ml-1 font-semibold tabular-nums">
                                · {storeMoney(bundleProduct.pricing.amount, bundleProduct.pricing.currency)}
                              </span>
                              {bundleProduct.pricing.comparePrice &&
                                bundleProduct.pricing.comparePrice > bundleProduct.pricing.amount && (
                                  <span className="ml-1 text-xs text-muted-foreground line-through">
                                    {storeMoney(bundleProduct.pricing.comparePrice, bundleProduct.pricing.currency)}
                                  </span>
                                )}
                            </p>
                            {bundleProduct.description && (
                              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                                {bundleProduct.description}
                              </p>
                            )}
                            <Button
                              asChild
                              className="mt-2 w-full"
                              variant="secondary"
                              size="sm"
                            >
                              <Link href={`/checkout/${bundleProduct.id}`}>
                                Get the bundle instead
                              </Link>
                            </Button>
                          </div>
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

                        {/* Removed standalone "30-day money-back guarantee"
                          muted text — same claim already appears as a
                          bullet inside the "What you get" checklist
                          above. Two of the same line stacked vertically
                          read as a layout bug, not extra reassurance. */}

                        {/* "This course includes" — features the Instructor
                          typed in the editor. Dedupe against what's
                          already in the "What you get" checklist (e.g.
                          if they typed "Certificate of completion" as a
                          feature, the checklist already has a richer
                          version). Hide the block entirely when no
                          features survive the dedupe. */}
                        {(() => {
                          const checklistTokens = [
                            "lifetime access",
                            "certificate",
                            "community",
                            "money-back",
                            "mobile",
                            "1-on-1",
                          ]
                          const surviving = course.features
                            .filter((s) => s.trim())
                            .filter((s) => {
                              const lower = s.toLowerCase()
                              return !checklistTokens.some((t) => lower.includes(t))
                            })
                          if (surviving.length === 0) return null
                          return (
                            <div className="mt-6 space-y-3">
                              <h4 className="font-semibold">This course includes:</h4>
                            {surviving.map((feature, index) => (
                              <div key={index} className="flex items-center gap-2 text-sm">
                                <Check className="h-4 w-4 text-success" />
                                {feature}
                              </div>
                            ))}
                          </div>
                          )
                        })()}
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
                            alt={`${instructor.name} cover banner`}
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

        {/* Sticky mobile CTA bar. The desktop pricing card already
          pins the Enroll CTA in the right sidebar, but on a mobile
          viewport the visitor has to scroll past the curriculum,
          reviews, and FAQ to reach the price + button. This bar
          appears once they've scrolled past the hero and keeps a
          purchase CTA on screen at all times. */}
        {!userEnrolled && (
          <StickyMobileEnrollBar
            price={course.price}
            originalPrice={course.originalPrice}
            currency={course.currency}
            earlyBirdUntil={course.earlyBirdUntil}
            enrolling={isEnrolling}
            enrollable={isPublishedForEnrollment}
            onEnroll={handleEnroll}
          />
        )}

      {!inTenant && <Footer />}

        {/* Sprint A Brand #25 — preview lesson modal. Mounted once at
          the page root so it survives across curriculum module
          re-expansions. Enroll button inside the modal routes
          through the same handleEnroll the rail uses, so the flow
          (sign-in gate, store enrollment, redirect to /learn)
          stays single-sourced. */}
        <PreviewLessonModal
          open={!!previewLesson}
          onOpenChange={(o) => !o && setPreviewLesson(null)}
          lesson={previewLesson}
          courseTitle={course.title}
          onEnroll={handleEnroll}
          learnHref={inTenant ? `${basePath}/learn/${course.slug}` : `/learn/${course.slug}`}
          enrollLabel={
            course.price > 0
              ? `Enroll · ${formatMoney(course.price, course.currency)}`
              : "Enroll free"
          }
        />
    </div>
    </PortalThemeProvider>
  )
}

// ============================================================
// Mobile-only sticky bottom bar with price + countdown + Enroll.
// ============================================================
function StickyMobileEnrollBar({
  price,
  originalPrice,
  currency,
  earlyBirdUntil,
  enrolling,
  enrollable,
  onEnroll,
}: {
  price: number
  originalPrice?: number
  currency: string
  earlyBirdUntil?: string
  enrolling: boolean
  enrollable: boolean
  onEnroll: () => void
}) {
  // Show only after the user has scrolled a hero's-worth — keeps
  // the bar from competing with the hero CTA while it's on screen.
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 320)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  // Light countdown ticker — only renders when the early-bird
  // window is still open. Re-renders every second so the visitor
  // sees the seconds tick (urgency!).
  const [now, setNow] = useState<number>(() => Date.now())
  useEffect(() => {
    if (!earlyBirdUntil) return
    const i = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(i)
  }, [earlyBirdUntil])
  const earlyBirdEndsMs = earlyBirdUntil ? new Date(earlyBirdUntil).getTime() : null
  const earlyBirdRemaining = earlyBirdEndsMs && earlyBirdEndsMs > now ? earlyBirdEndsMs - now : 0
  const countdown = earlyBirdRemaining > 0 ? formatCountdown(earlyBirdRemaining) : null

  return (
    <div
      className={cn(
        "fixed inset-x-0 bottom-0 z-50 border-t border-border bg-card/95 px-4 py-3 shadow-[0_-4px_18px_rgba(0,0,0,0.08)] backdrop-blur md:hidden",
        "transition-transform duration-200 ease-out",
        visible ? "translate-y-0" : "translate-y-full",
      )}
      // aria-hidden when not yet visible so screen readers don't
      // pick it up before the user scrolls past the hero.
      aria-hidden={!visible}
    >
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold tabular-nums">
              {price > 0 ? formatMoney(price, currency) : "Free"}
            </span>
            {originalPrice && originalPrice > price && (
              <span className="text-xs text-muted-foreground line-through tabular-nums">
                {formatMoney(originalPrice, currency)}
              </span>
            )}
          </div>
          {countdown && (
            <p className="text-[11px] font-medium uppercase tracking-wide text-destructive">
              Early-bird ends in {countdown}
            </p>
          )}
        </div>
        <Button
          size="lg"
          className="shrink-0"
          onClick={onEnroll}
          disabled={enrolling || !enrollable}
        >
          {enrolling ? "Enrolling…" : !enrollable ? "Not available" : "Enroll Now"}
        </Button>
      </div>
    </div>
  )
}

// "What you get" — concrete checklist of everything the buyer takes
// home. Derived from the course's Monetize wizard settings so it
// updates automatically when the instructor adds a bump / 1:1 /
// community. Never silent: if no add-ons are configured we still
// surface lesson access + certificate / community lines when
// applicable, so the section is useful on every course.
function WhatYouGetChecklist({
  lessonsCount,
  totalDurationMinutes,
  hasCommunity,
  hasBump,
  bumpTitle,
  hasCoaching,
  certificate,
}: {
  lessonsCount: number
  totalDurationMinutes: number
  hasCommunity: boolean
  hasBump: boolean
  bumpTitle?: string
  hasCoaching: boolean
  certificate: boolean
}) {
  const lines: string[] = []
  if (lessonsCount > 0) {
    const hours = Math.round(totalDurationMinutes / 60)
    const lessonsCopy = `Lifetime access to ${lessonsCount} lesson${lessonsCount === 1 ? "" : "s"}`
    lines.push(hours > 0 ? `${lessonsCopy} (~${hours}h of content)` : lessonsCopy)
  }
  if (hasCommunity) lines.push("Instant access to the private cohort community")
  if (certificate) lines.push("Certificate of completion you can share on LinkedIn")
  if (hasBump) {
    lines.push(
      bumpTitle
        ? `Option to add ${bumpTitle} at checkout`
        : "Option to add the resource pack at checkout",
    )
  }
  if (hasCoaching) lines.push("Option to book 1-on-1 strategy calls with the instructor")
  // Always-on baseline so the section never looks empty.
  lines.push("30-day money-back guarantee")
  lines.push("Mobile + desktop access — pick up exactly where you left off")
  return (
    <div className="mt-4 rounded-md border border-border bg-card/60 p-3">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        What you get
      </p>
      <ul className="space-y-1.5 text-sm">
        {lines.map((line, idx) => (
          <li key={idx} className="flex items-start gap-2">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
            <span className="leading-snug">{line}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

// Hero-mounted "save for later" button. Visually lives on the dark
// hero, so light glassmorphism (border-white/25 + bg-white/10) keeps
// it legible. Filled-heart state is the saved tell; aria-pressed
// carries the semantic state for screen readers without a label
// change. No toast — the on-button state change IS the feedback.
function WishlistHeart({ courseId, tenantSlug }: { courseId: string; tenantSlug: string }) {
  const wishlist = useWishlist(tenantSlug)
  const saved = wishlist.ids.includes(courseId)
  return (
    <button
      type="button"
      aria-pressed={saved}
      aria-label={saved ? "Saved to wishlist — click to remove" : "Save for later"}
      onClick={() => wishlist.toggle(courseId)}
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[12.5px] font-semibold backdrop-blur transition",
        saved
          ? "border-rose-300/60 bg-rose-500/20 text-rose-50 hover:bg-rose-500/30"
          : "border-white/25 bg-white/10 text-white hover:bg-white/20",
      )}
    >
      <Heart className={cn("h-4 w-4", saved && "fill-current")} />
      {saved ? "Saved" : "Save for later"}
    </button>
  )
}

function formatCountdown(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000))
  const d = Math.floor(s / 86_400)
  const h = Math.floor((s % 86_400) / 3_600)
  const m = Math.floor((s % 3_600) / 60)
  const sec = s % 60
  if (d > 0) return `${d}d ${h}h ${m}m`
  if (h > 0) return `${h}h ${m}m ${sec}s`
  return `${m}m ${sec}s`
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
