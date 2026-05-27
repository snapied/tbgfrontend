"use client"

import { use, useMemo, useState } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  Archive,
  Award,
  Check,
  ChevronDown,
  ClipboardList,
  Clock,
  Users,
  Star,
  BookOpen,
  Eye,
  EyeOff,
  Globe,
  Lock,
  Loader2,
  Megaphone,
  Pencil,
  Share2,
  Tag,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { useLMS } from "@/lib/lms-store"
import { useConfirm } from "@/lib/use-confirm"
import { classifyStudents, STAGE_META } from "@/lib/engagement-score"
import { CourseCoverImage } from "@/components/courses/course-cover-image"
import { formatMoney } from "@/lib/currency"
import { RichTextContent, isRichTextEmpty } from "@/components/editor/rich-text-content"
import { LessonTypeIcon, lessonTypeLabel } from "@/components/learn/lesson-type-icon"
import { LessonContentBlock } from "@/components/learn/lesson-content-block"
import { AttachmentList } from "@/components/learn/attachment-list"
import { InstructorSocials } from "@/components/learn/instructor-socials"
import { VideoUrlPreview } from "@/components/upload/video-url-preview"
import { BUILTIN_TEMPLATES } from "@/lib/certificate-templates"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DashboardBreadcrumbs } from "@/components/dashboard/dashboard-breadcrumbs"
import { Separator } from "@/components/ui/separator"
import { MonetizePublishDialog } from "@/components/course/monetize-publish-dialog"
import { useTenant } from "@/lib/tenant-store"
import { tenantPublicUrl } from "@/lib/tenant-resolver"
import { usePlan } from "@/lib/use-plan"
import { PlanGatedCard } from "@/components/dashboard/plan-lock"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ShareMenu } from "@/components/share/share-menu"
import { stripRichTextTags } from "@/components/editor/rich-text-content"
import { CourseAnnouncementDialog } from "@/components/courses/course-announcement-dialog"
import { TestPurchaseDialog } from "@/components/courses/test-purchase-dialog"
import { DuplicateCourseDialog } from "@/components/courses/duplicate-course-dialog"
import { useStore } from "@/lib/store-store"
import { Copy, FlaskConical } from "lucide-react"

export default function CourseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { getCourseById, getCourseEnrollments, getUserById, getAssignmentsForCourse, updateCourse, getEnrolledCount } = useLMS()
  const { currentTenant } = useTenant()
  const { isAllowed } = usePlan()
  const versioningAllowed = isAllowed("courseVersioning")
  const confirm = useConfirm()
  // Monetize wizard fires in place of the publish confirm dialog. We
  // open it only on the publish path; restoring an archived course
  // keeps the simpler confirm.
  const [monetizeOpen, setMonetizeOpen] = useState(false)
  const [announceOpen, setAnnounceOpen] = useState(false)
  const [testPurchaseOpen, setTestPurchaseOpen] = useState(false)
  const [duplicateOpen, setDuplicateOpen] = useState(false)
  const { products: storeProducts } = useStore()
  // Inline paid-feature dialog for the Versions button on free plans.
  // No navigation, no half-rendered page — the upgrade card opens
  // over the course detail page and the visitor closes it to keep
  // working.
  const [versionsUpgradeOpen, setVersionsUpgradeOpen] = useState(false)
  // (instructorLive resolved below — needs `course` first)
  
  const course = getCourseById(id)
  const enrollments = getCourseEnrollments(id)
  
  if (!course) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <h1 className="text-2xl font-bold">Course not found</h1>
        <Button asChild className="mt-4">
          <Link href="/dashboard/courses">Back to Courses</Link>
        </Button>
      </div>
    )
  }

  // Resolve the underlying storefront product for this course
  // (1:1 mapping when the publish wizard ran). Used by the test-
  // purchase affordance below.
  const courseStoreProduct = storeProducts.find(
    (p) =>
      p.delivery.kind === "course-access" &&
      p.delivery.courseId === course.id,
  )

  // Live totals derived from the course's CURRENT module/lesson set
  // instead of the denormalized `totalLessons` / `totalDuration` fields,
  // which can drift after curriculum edits.
  const liveLessonTotal = course.modules.reduce(
    (acc, m) => acc + m.lessons.length,
    0,
  )
  const liveDurationMinutes = course.modules.reduce(
    (acc, m) => acc + m.lessons.reduce((la, l) => la + (l.duration || 0), 0),
    0,
  )
  // Live progress per enrollment — derived from the CURRENT lesson
  // set, so a deleted lesson doesn't keep contributing to 100%s.
  const liveLessonIds = new Set(
    course.modules.flatMap((m) => m.lessons.map((l) => l.id)),
  )
  const enrollmentsWithLiveProgress = enrollments.map((e) => {
    const done = e.completedLessons.filter((id) => liveLessonIds.has(id)).length
    const pct = liveLessonIds.size === 0
      ? 0
      : Math.min(100, Math.round((done / liveLessonIds.size) * 100))
    return { ...e, liveProgress: pct }
  })
  const completedEnrollments = enrollmentsWithLiveProgress.filter((e) => e.liveProgress === 100).length
  const averageProgress = enrollmentsWithLiveProgress.length > 0
    ? Math.round(enrollmentsWithLiveProgress.reduce((acc, e) => acc + e.liveProgress, 0) / enrollmentsWithLiveProgress.length)
    : 0

  // Course-level assignment totals, broken down by kind. Surfaced both as
  // a single "Assessments" stat in the hero strip (total across kinds) and
  // as a "Tasks" line in the sidebar so the teacher sees exactly what's
  // expected of students.
  const courseAssignments = getAssignmentsForCourse(course.id)
  const tasksByKind = {
    assignment: courseAssignments.filter((a) => a.kind === "assignment").length,
    project:    courseAssignments.filter((a) => a.kind === "project").length,
    test:       courseAssignments.filter((a) => a.kind === "test").length,
  }
  const totalAssessments = courseAssignments.length

  const getStatusColor = (status: string) => {
    switch (status) {
      case "published": return "bg-success/10 text-success"
      case "draft":     return "bg-amber-500/10 text-amber-700 dark:text-amber-300"
      case "archived":  return "bg-slate-500/10 text-slate-700 dark:text-slate-300"
      default:          return "bg-muted text-muted-foreground"
    }
  }

  // Pretty-print a minutes-based duration so a 25-minute course shows
  // "25m" instead of the prior "0h" — the previous version floor-
  // divided by 60 and showed "0h" for anything under an hour.
  const formatDuration = (totalMinutes: number): string => {
    if (!Number.isFinite(totalMinutes) || totalMinutes <= 0) return "0m"
    const h = Math.floor(totalMinutes / 60)
    const m = Math.round(totalMinutes % 60)
    if (h === 0) return `${m}m`
    if (m === 0) return `${h}h`
    return `${h}h ${m}m`
  }

  // "Course details" accordion — collects intro video, learning outcomes,
  // requirements, included features, and the certificate template into one
  // collapsed card. Defined here so the Overview tab JSX below stays
  // readable. Renders to null when there's nothing worth showing.
  const learnList = course.whatYouLearn.filter((s) => s.trim())
  const reqList = course.requirements.filter((s) => s.trim())
  const featList = course.features.filter((s) => s.trim())
  const detailSections = [
    !!course.introVideoUrl,
    learnList.length > 0,
    reqList.length > 0,
    featList.length > 0,
    !!course.certificateEligible,
  ].filter(Boolean).length

  const courseDetailsCard = detailSections === 0 ? null : (
    <Card>
      <CardHeader>
        <CardTitle>Course details</CardTitle>
        <CardDescription>
          {detailSections} {detailSections === 1 ? "section" : "sections"} — click to expand.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Accordion type="multiple" className="w-full">
          {course.introVideoUrl && (
            <AccordionItem value="intro" className="border-border">
              <AccordionTrigger className="hover:no-underline">
                <span className="font-medium">Intro / preview video</span>
              </AccordionTrigger>
              <AccordionContent>
                <VideoUrlPreview url={course.introVideoUrl} />
              </AccordionContent>
            </AccordionItem>
          )}
          {learnList.length > 0 && (
            <AccordionItem value="learn" className="border-border">
              <AccordionTrigger className="hover:no-underline">
                <span className="flex flex-1 items-baseline justify-between gap-3 pr-3 text-left">
                  <span className="font-medium">What students will learn</span>
                  <span className="text-xs font-normal text-muted-foreground">{learnList.length} {learnList.length === 1 ? "outcome" : "outcomes"}</span>
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <ul className="grid gap-2 sm:grid-cols-2">
                  {learnList.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </AccordionContent>
            </AccordionItem>
          )}
          {reqList.length > 0 && (
            <AccordionItem value="reqs" className="border-border">
              <AccordionTrigger className="hover:no-underline">
                <span className="flex flex-1 items-baseline justify-between gap-3 pr-3 text-left">
                  <span className="font-medium">Requirements</span>
                  <span className="text-xs font-normal text-muted-foreground">{reqList.length} {reqList.length === 1 ? "item" : "items"}</span>
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <ul className="space-y-1.5">
                  {reqList.map((req, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground" />
                      <span>{req}</span>
                    </li>
                  ))}
                </ul>
              </AccordionContent>
            </AccordionItem>
          )}
          {featList.length > 0 && (
            <AccordionItem value="features" className="border-border">
              <AccordionTrigger className="hover:no-underline">
                <span className="flex flex-1 items-baseline justify-between gap-3 pr-3 text-left">
                  <span className="font-medium">What&apos;s included</span>
                  <span className="text-xs font-normal text-muted-foreground">{featList.length} {featList.length === 1 ? "item" : "items"}</span>
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <ul className="grid gap-2 sm:grid-cols-2">
                  {featList.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </AccordionContent>
            </AccordionItem>
          )}
          {course.certificateEligible && (
            <AccordionItem value="cert" className="border-border">
              <AccordionTrigger className="hover:no-underline">
                <span className="flex flex-1 items-center gap-2 pr-3 text-left">
                  <Award className="h-4 w-4 text-accent" />
                  <span className="font-medium">Certificate</span>
                  <span className="ml-auto text-xs font-normal text-muted-foreground">
                    {BUILTIN_TEMPLATES.find((t) => t.id === course.certificateTemplate)?.name ?? course.certificateTemplate}
                  </span>
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <p className="text-sm text-muted-foreground">
                  Auto-issued to students who complete the course, using the{" "}
                  <span className="font-medium text-foreground">
                    {BUILTIN_TEMPLATES.find((t) => t.id === course.certificateTemplate)?.name ?? course.certificateTemplate}
                  </span>{" "}
                  template.
                </p>
              </AccordionContent>
            </AccordionItem>
          )}
        </Accordion>
      </CardContent>
    </Card>
  )

  return (
    <div className="space-y-6">
      <DashboardBreadcrumbs
        crumbs={[
          { label: "Courses", href: "/dashboard/courses" },
          { label: course.title },
        ]}
      />
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/courses">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Link>
        </Button>
      </div>

      {/* Course Header */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Compact identification card — chips + title + subtitle +
              meta strip + actions. Description and all the supplementary
              detail moves into the Overview tab below to keep this short. */}
          <Card>
            <CardContent className="space-y-4 p-6">
              <div className="space-y-3">
                {/* Tag row + title get the full card width so a long course
                    title can breathe. Action buttons live in a separate row
                    below — wrapping is allowed there because 5 actions don't
                    fit on a narrow constrained viewport. */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className={cn(
                    "rounded-full px-2 py-0.5 text-[11px] font-medium capitalize",
                    getStatusColor(course.status)
                  )}>
                    {course.status}
                  </span>
                  <VisibilityChip visibility={course.visibility ?? "public"} hasPassword={!!course.accessPassword} />
                  <span className="rounded bg-muted px-2 py-0.5 text-[11px] capitalize text-muted-foreground">
                    {course.level}
                  </span>
                  {course.category && (
                    <span className="inline-flex items-center gap-1 rounded bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                      <Tag className="h-3 w-3" />
                      {course.category}
                    </span>
                  )}
                  {course.certificateEligible && (
                    <span className="inline-flex items-center gap-1 rounded bg-accent/10 px-2 py-0.5 text-[11px] font-medium text-accent">
                      <Award className="h-3 w-3" />
                      Certificate
                    </span>
                  )}
                </div>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-foreground">{course.title}</h1>
                  {course.subtitle && (
                    <p className="mt-1 text-sm text-muted-foreground">{course.subtitle}</p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button variant="outline" asChild>
                    <Link href={`/dashboard/assignments?course=${course.id}`}>
                      <ClipboardList className="mr-1.5 h-4 w-4" />
                      Assessments
                      {totalAssessments > 0 && (
                        <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                          {totalAssessments}
                        </span>
                      )}
                    </Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link href={`/dashboard/courses/${course.id}/reviews`}>
                      <Star className="mr-1.5 h-4 w-4" />
                      Reviews
                      {course.reviewCount > 0 && (
                        <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                          {course.reviewCount}
                        </span>
                      )}
                    </Link>
                  </Button>
                  {/* Versions — gated. On a plan that includes
                      `courseVersioning` we render a normal Link so
                      the page navigates straight in. On a free plan
                      we render a plain Button that opens the upgrade
                      dialog inline (no navigation, no half-rendered
                      page); the lock chip on the right tells the
                      user this is a paid feature before they click. */}
                  {versioningAllowed ? (
                    <Button
                      variant="outline"
                      asChild
                      title="Browse + restore past published versions"
                    >
                      <Link href={`/dashboard/courses/${course.id}/versions`}>
                        <Clock className="mr-1.5 h-4 w-4" />
                        Versions
                        {(course.versions?.length ?? 0) > 0 && (
                          <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                            {course.versions!.length}
                          </span>
                        )}
                      </Link>
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      onClick={() => setVersionsUpgradeOpen(true)}
                      title="Course version history is a paid feature — click to learn more"
                      className="relative"
                    >
                      <Clock className="mr-1.5 h-4 w-4" />
                      Versions
                      <span
                        className="ml-1.5 inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-700 dark:text-amber-300"
                        aria-label="Paid feature"
                      >
                        <Lock className="h-2.5 w-2.5" />
                        Pro
                      </span>
                    </Button>
                  )}
                  {/* Preview-as dropdown. Three modes lets the
                      teacher see exactly what each audience sees
                      without faking a logout. Each opens /learn in
                      a new tab with the ?as= flag the page reads
                      to swap synthetic enrollment state. */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline">
                        <Eye className="mr-1.5 h-4 w-4" />
                        Preview
                        <ChevronDown className="ml-1.5 h-3 w-3 opacity-60" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuItem asChild>
                        <Link
                          href={`/learn/${course.slug}?as=visitor`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <div className="flex flex-col gap-0.5">
                            <span className="font-medium">As public visitor</span>
                            <span className="text-[11px] text-muted-foreground">
                              Logged-out / not enrolled
                            </span>
                          </div>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link
                          href={`/learn/${course.slug}?as=enrolled`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <div className="flex flex-col gap-0.5">
                            <span className="font-medium">As fresh student</span>
                            <span className="text-[11px] text-muted-foreground">
                              Day 1, zero progress
                            </span>
                          </div>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link
                          href={`/learn/${course.slug}?as=halfway`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <div className="flex flex-col gap-0.5">
                            <span className="font-medium">As halfway student</span>
                            <span className="text-[11px] text-muted-foreground">
                              ~50% complete, drip gates open
                            </span>
                          </div>
                        </Link>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  {/* Share menu — replaces the old "Copy URL" with a
                      full Copy / QR / WhatsApp / Email / Embed /
                      Share-to-community popover. */}
                  <ShareMenu
                    artifact={{
                      kind: "course",
                      title: course.title,
                      description: course.description ? stripRichTextTags(course.description).slice(0, 140) : undefined,
                      url: (() => {
                        const root = currentTenant
                          ? tenantPublicUrl(
                              currentTenant.slug,
                              currentTenant.customDomain,
                              currentTenant.customDomainStatus,
                            )
                          : (typeof window !== "undefined" ? window.location.origin : "")
                        return `${root}/courses/details/${course.slug}`
                      })(),
                      thumbnailUrl: course.thumbnail,
                      source: course.instructor?.name,
                    }}
                    hideEmbed
                    trigger={
                      <Button variant="outline">
                        <Share2 className="mr-1.5 h-4 w-4" />
                        Share
                      </Button>
                    }
                  />
                  {/* Announce — opens a dedicated composer that fans
                      out to in-app + email + WhatsApp + the linked
                      community in one shot. Only enabled on
                      published courses (announcing a draft means
                      announcing to nobody). */}
                  <Button
                    variant="outline"
                    onClick={() => setAnnounceOpen(true)}
                    disabled={course.status !== "published"}
                    title={
                      course.status === "published"
                        ? "Send an update to every enrolled student"
                        : "Publish the course first — drafts have no audience"
                    }
                  >
                    <Megaphone className="mr-1.5 h-4 w-4" />
                    Announce
                  </Button>
                  {/* Test purchase — admin-only dry-run of the
                      full buyer flow. Only renders when there's an
                      underlying storefront product to checkout
                      against (i.e. the publish wizard already
                      minted one). Disabled with explainer copy
                      until the course is published. */}
                  {courseStoreProduct && (
                    <Button
                      variant="outline"
                      onClick={() => setTestPurchaseOpen(true)}
                      title="Walk the buyer's checkout flow without real money or webhooks"
                    >
                      <FlaskConical className="mr-1.5 h-4 w-4" />
                      Test purchase
                    </Button>
                  )}
                  {/* Publish / Unpublish toggle. Always asks first
                      because the action is visible to students:
                      publishing exposes the course on the public
                      site; unpublishing hides it from new students
                      (existing enrollments stay accessible until the
                      teacher archives). */}
                  {course.status === "published" ? (
                    <Button
                      variant="outline"
                      onClick={async () => {
                        const ok = await confirm({
                          title: "Unpublish this course?",
                          description: "Students won't see it on your public site anymore. Already-enrolled students keep their access. You can re-publish any time.",
                          confirmLabel: "Unpublish",
                        })
                        if (!ok) return
                        updateCourse(course.id, { status: "draft" })
                        toast.success(`"${course.title}" is now a draft.`)
                      }}
                    >
                      <EyeOff className="mr-1.5 h-4 w-4" />
                      Unpublish
                    </Button>
                  ) : course.status === "archived" ? (
                    <Button
                      variant="outline"
                      onClick={async () => {
                        const ok = await confirm({
                          title: `Restore "${course.title}" as a draft?`,
                          description: "The course returns to your active list as a draft. Publish it again when ready.",
                          confirmLabel: "Restore as draft",
                        })
                        if (!ok) return
                        updateCourse(course.id, { status: "draft" })
                        toast.success(`"${course.title}" restored as a draft.`)
                      }}
                    >
                      <Archive className="mr-1.5 h-4 w-4" />
                      Restore
                    </Button>
                  ) : (
                    <Button onClick={() => setMonetizeOpen(true)}>
                      <Globe className="mr-1.5 h-4 w-4" />
                      Publish
                    </Button>
                  )}
                  <Button variant="outline" asChild>
                    <Link href={`/dashboard/courses/${course.id}/edit`}>
                      <Pencil className="mr-1.5 h-4 w-4" />
                      Edit
                    </Link>
                  </Button>
                  {/* Duplicate — opens a small wizard. We don't put
                      this behind a "more" menu because cloning is
                      common enough mid-cohort + the wizard prevents
                      the most common mistakes (live status carryover,
                      enrollment co-mingling). */}
                  <Button
                    variant="outline"
                    onClick={() => setDuplicateOpen(true)}
                    title="Make a fresh draft copy of this course"
                  >
                    <Copy className="mr-1.5 h-4 w-4" />
                    Duplicate
                  </Button>
                </div>
              </div>

              <Separator />

              {/* Meta strip — students / duration / lessons / assessments
                  / rating. Single row so the eye picks it up at a glance. */}
              <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-5">
                <Stat icon={Users} label="Students" value={getEnrolledCount(course.id).toLocaleString()} />
                <Stat icon={Clock} label="Duration" value={formatDuration(liveDurationMinutes)} />
                <Stat icon={BookOpen} label="Lessons" value={liveLessonTotal.toString()} />
                <Stat
                  icon={ClipboardList}
                  label="Assessments"
                  value={
                    totalAssessments === 0
                      ? "—"
                      : `${totalAssessments} (${[
                          tasksByKind.assignment && `${tasksByKind.assignment} task${tasksByKind.assignment === 1 ? "" : "s"}`,
                          tasksByKind.project && `${tasksByKind.project} project${tasksByKind.project === 1 ? "" : "s"}`,
                          tasksByKind.test && `${tasksByKind.test} test${tasksByKind.test === 1 ? "" : "s"}`,
                        ].filter(Boolean).join(", ")})`
                  }
                />
                <Stat
                  icon={Star}
                  label="Rating"
                  value={
                    course.rating
                      ? `${course.rating.toFixed(1)} (${course.reviewCount})`
                      : "—"
                  }
                  iconClassName={course.rating ? "fill-accent text-accent" : ""}
                />
              </div>
            </CardContent>
          </Card>

          {/* Tabs — Overview (about + supplementary detail) vs Curriculum
              (modules + lessons). Keeps the page shape predictable and
              moves the long-form content behind a deliberate click. */}
          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="curriculum">
                Curriculum
                <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-normal text-muted-foreground">
                  {course.totalLessons}
                </span>
              </TabsTrigger>
              <TabsTrigger value="students">
                Students
                <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-normal text-muted-foreground">
                  {enrollments.length}
                </span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="students" className="space-y-4">
              <CourseStudentsRoster courseId={course.id} />
            </TabsContent>

            <TabsContent value="overview" className="space-y-4">
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
              {/* Course details accordion (intro video, learn outcomes,
                  requirements, included features, certificate) — rendered
                  here inside the Overview tab. Generated lower in the file
                  via the courseDetailsCard memo for readability. */}
              {courseDetailsCard}
            </TabsContent>

            <TabsContent value="curriculum" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Course Curriculum</CardTitle>
                  <CardDescription>
                    {course.modules.length} {course.modules.length === 1 ? "module" : "modules"} ·{" "}
                    {course.totalLessons} {course.totalLessons === 1 ? "lesson" : "lessons"} ·{" "}
                    {course.totalDuration} min total
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {course.modules.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-border p-8 text-center">
                      <p className="text-sm text-muted-foreground">
                        No modules yet.{" "}
                        <Link
                          href={`/dashboard/courses/${course.id}/edit`}
                          className="font-medium text-primary hover:underline"
                        >
                          Add some →
                        </Link>
                      </p>
                    </div>
                  ) : (
                // Nested accordions — both modules and lessons collapsed by
                // default. The compact summary (title + meta) stays in the
                // trigger; clicking expands the full content. Keeps the page
                // scannable on long courses but everything is one click away.
                <Accordion type="multiple" className="w-full">
                  {course.modules.map((module, moduleIndex) => {
                    const moduleDuration = module.lessons.reduce((a, l) => a + (l.duration || 0), 0)
                    return (
                      <AccordionItem key={module.id} value={module.id} className="border-border">
                        <AccordionTrigger className="hover:no-underline">
                          <div className="flex flex-1 flex-wrap items-baseline justify-between gap-3 pr-3 text-left">
                            <span className="font-semibold">
                              Module {moduleIndex + 1}: {module.title || "Untitled"}
                            </span>
                            <span className="text-xs font-normal text-muted-foreground">
                              {module.lessons.length} {module.lessons.length === 1 ? "lesson" : "lessons"} · {moduleDuration} min
                            </span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          {!isRichTextEmpty(module.description) && (
                            <RichTextContent
                              html={module.description}
                              className="mb-3 text-sm text-muted-foreground"
                            />
                          )}
                          {module.lessons.length === 0 ? (
                            <p className="py-2 text-center text-xs italic text-muted-foreground">
                              No lessons in this module yet.
                            </p>
                          ) : (
                            <Accordion type="multiple" className="w-full">
                              {module.lessons.map((lesson, lessonIndex) => (
                                <AccordionItem key={lesson.id} value={lesson.id} className="border-border/60">
                                  <AccordionTrigger className="hover:no-underline">
                                    <div className="flex flex-1 items-center gap-3 pr-3 text-left">
                                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                                        {lessonIndex + 1}
                                      </span>
                                      <LessonTypeIcon type={lesson.type} className="shrink-0 text-muted-foreground" />
                                      <span className="min-w-0 flex-1 truncate text-sm font-medium">
                                        {lesson.title || "Untitled lesson"}
                                      </span>
                                      {lesson.isPreview ? (
                                        <span className="inline-flex shrink-0 items-center gap-0.5 rounded bg-success/10 px-1.5 py-0.5 text-[10px] font-medium text-success">
                                          <Eye className="h-3 w-3" /> Public
                                        </span>
                                      ) : (
                                        <span className="inline-flex shrink-0 items-center gap-0.5 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                                          <Lock className="h-3 w-3" /> Private
                                        </span>
                                      )}
                                      <span className="hidden shrink-0 text-xs font-normal text-muted-foreground sm:inline">
                                        {lessonTypeLabel(lesson.type)} · {lesson.duration} min
                                      </span>
                                    </div>
                                  </AccordionTrigger>
                                  <AccordionContent>
                                    {lesson.description && (
                                      <p className="mb-3 text-sm text-muted-foreground">{lesson.description}</p>
                                    )}
                                    <LessonContentBlock lesson={lesson} />
                                    {lesson.transcript && (
                                      <details className="mt-3 rounded-md border border-border bg-background p-3 text-sm [&[open]>summary]:mb-2">
                                        <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                          Transcript
                                        </summary>
                                        <div className="whitespace-pre-wrap leading-relaxed">
                                          {lesson.transcript}
                                        </div>
                                      </details>
                                    )}
                                    {lesson.attachments && lesson.attachments.length > 0 && (
                                      <AttachmentList
                                        attachments={lesson.attachments}
                                        className="mt-3"
                                      />
                                    )}
                                  </AccordionContent>
                                </AccordionItem>
                              ))}
                            </Accordion>
                          )}
                        </AccordionContent>
                      </AccordionItem>
                    )
                  })}
                    </Accordion>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Thumbnail */}
          <Card className="py-0">
            <div className="aspect-video bg-muted">
              <CourseCoverImage
                course={course}
                alt={course.title}
                className="h-full w-full rounded-t-lg"
              />
            </div>
            <CardContent className="p-4">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-foreground">
                  {course.price > 0 ? formatMoney(course.price, course.currency) : "Free"}
                </span>
                {course.originalPrice && course.originalPrice > course.price && (
                  <span className="text-lg text-muted-foreground line-through">
                    {formatMoney(course.originalPrice, course.currency)}
                  </span>
                )}
              </div>
              <p className="mt-2 text-sm text-muted-foreground capitalize">
                {course.level} level · {Math.round(course.totalDuration / 60) || 0}h total
              </p>
            </CardContent>
          </Card>

          {/* Enrollment Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Enrollment Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total Enrolled</span>
                <span className="font-semibold">{getEnrolledCount(course.id)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Active Students</span>
                <span className="font-semibold">{enrollments.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Completed</span>
                <span className="font-semibold text-success">{completedEnrollments}</span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Average Progress</span>
                  <span className="font-semibold">{averageProgress}%</span>
                </div>
                <Progress value={averageProgress} />
              </div>
            </CardContent>
          </Card>

          {/* Instructor — pulled live from the user record so name / bio /
              socials edits in Settings flow through here without having
              to re-save each course. */}
          {(() => {
            const live = getUserById(course.instructor.id) ?? course.instructor
            return (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Instructor</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary font-semibold text-primary-foreground">
                      {live.name.split(" ").map((n) => n[0]).join("")}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-foreground">{live.name}</p>
                      <p className="truncate text-sm text-muted-foreground">{live.email}</p>
                    </div>
                  </div>
                  {live.bio && (
                    <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">{live.bio}</p>
                  )}
                  <InstructorSocials user={live} className="mt-3" />
                </CardContent>
              </Card>
            )
          })()}
        </div>
      </div>
      {/* Monetize publish wizard — fires in place of the legacy confirm
          dialog. Wizard internally calls addProduct for the bump / 1:1 /
          bundle SKUs it creates, and hands us back the Course patch
          (accessModel + product ids) that we apply alongside the
          status flip to "published". */}
      <MonetizePublishDialog
        open={monetizeOpen}
        onOpenChange={setMonetizeOpen}
        course={course}
        instructorId={course.instructor.id}
        onPublish={(patch) => {
          // `publishAt` is the scheduled-publish field that the edit
          // form exposes as "Auto-publish at" — a *future* time. A
          // manual publish here happens NOW, so we just flip status
          // and leave publishAt alone (its job is done by the status
          // change). If the course had a future schedule sitting in
          // publishAt, clear it so the cron doesn't try to "publish"
          // an already-live course later.
          const courseNow = getCourseById(course.id)
          const pendingSchedule =
            !!courseNow?.publishAt &&
            new Date(courseNow.publishAt).getTime() > Date.now()
          updateCourse(course.id, {
            ...patch,
            status: "published",
            ...(pendingSchedule ? { publishAt: undefined } : {}),
          })
          toast.success(`"${course.title}" is now live.`)
        }}
      />

      {/* Inline upgrade dialog for the Versions button on free plans.
          Renders the standard PlanGatedCard inside a Dialog so the
          user can read the upgrade case without leaving the course
          detail page. Closing the dialog drops them back where they
          were — they can't accidentally trigger a Restore because
          the actual restore controls only exist on the versions
          page, which is itself gated. */}
      <Dialog open={versionsUpgradeOpen} onOpenChange={setVersionsUpgradeOpen}>
        <DialogContent className="sm:max-w-md">
          <PlanGatedCard feature="courseVersioning" />
        </DialogContent>
      </Dialog>
      <CourseAnnouncementDialog
        open={announceOpen}
        onOpenChange={setAnnounceOpen}
        course={course}
      />
      <TestPurchaseDialog
        open={testPurchaseOpen}
        onOpenChange={setTestPurchaseOpen}
        productId={courseStoreProduct?.id}
        productTitle={course.title}
      />
      <DuplicateCourseDialog
        open={duplicateOpen}
        onOpenChange={setDuplicateOpen}
        source={course}
      />
    </div>
  )
}

// Per-course student roster with lifecycle stage chips. Reuses
// `classifyStudents` from lib/engagement-score.ts (the same
// classifier the workspace-wide /dashboard/students/engagement
// table uses), but scoped to just this course's enrolled
// population so the stage reflects in-course behaviour.
function CourseStudentsRoster({ courseId }: { courseId: string }) {
  const {
    students,
    enrollments,
    attendance,
    quizAttempts,
    submissions,
    doubts,
  } = useLMS()
  // Hoist these so we can pass into the classifier without
  // re-running compute on every nav. ENGAGEMENT_LIB import sits
  // at the top of the file.
  const courseEnrollments = useMemo(
    () => enrollments.filter((e) => e.courseId === courseId),
    [enrollments, courseId],
  )
  const courseStudentIds = useMemo(
    () => new Set(courseEnrollments.map((e) => e.studentId)),
    [courseEnrollments],
  )
  const courseStudents = useMemo(
    () => students.filter((u) => courseStudentIds.has(u.id)),
    [students, courseStudentIds],
  )
  const rows = useMemo(
    () =>
      classifyStudents({
        students: courseStudents,
        enrollments: courseEnrollments,
        attendance,
        attempts: quizAttempts,
        submissions,
        doubts,
      }),
    [courseStudents, courseEnrollments, attendance, quizAttempts, submissions, doubts],
  )

  if (rows.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Users className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-3 font-medium">No students enrolled yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            When a student enrolls, they&apos;ll show up here with a lifecycle stage.
          </p>
        </CardContent>
      </Card>
    )
  }
  return (
    <Card>
      <CardContent className="p-0">
        <ul className="divide-y divide-border">
          {rows.map((row) => {
            const meta = STAGE_META[row.stage]
            const last =
              row.daysSinceLastActive === null
                ? "Never active"
                : row.daysSinceLastActive === 0
                  ? "Active today"
                  : row.daysSinceLastActive === 1
                    ? "Yesterday"
                    : `${row.daysSinceLastActive}d ago`
            return (
              <li
                key={row.student.id}
                className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/40"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{row.student.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {row.student.email}
                  </p>
                </div>
                <span
                  className={cn(
                    "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                    meta.tone === "emerald" && "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
                    meta.tone === "blue" && "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300",
                    meta.tone === "slate" && "border-slate-500/30 bg-slate-500/10 text-slate-700 dark:text-slate-300",
                    meta.tone === "amber" && "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
                    meta.tone === "rose" && "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300",
                    meta.tone === "destructive" && "border-destructive/40 bg-destructive/10 text-destructive",
                  )}
                >
                  {meta.label}
                </span>
                <span className="hidden w-24 text-right text-xs text-muted-foreground sm:inline-block">
                  {last}
                </span>
                <Button asChild variant="ghost" size="sm" className="h-8 px-2">
                  <Link href={`/dashboard/students/${row.student.id}`}>
                    Open
                  </Link>
                </Button>
              </li>
            )
          })}
        </ul>
      </CardContent>
    </Card>
  )
}

// Small meta-stat used in the hero strip — icon + label + value in a
// vertical stack so the row reads cleanly on narrow screens.
function Stat({
  icon: Icon,
  label,
  value,
  iconClassName,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  iconClassName?: string
}) {
  return (
    <div className="flex items-start gap-2">
      <Icon className={cn("mt-0.5 h-4 w-4 shrink-0 text-muted-foreground", iconClassName)} />
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-medium text-foreground">{value}</p>
      </div>
    </div>
  )
}

// Tiny chip telling the teacher which access mode the course is on.
// Colour-coded so "Private" pops red and "Public" stays calm; the
// password chip surfaces a warning when the toggle is set to
// `password` but no password has actually been typed in.
function VisibilityChip({
  visibility,
  hasPassword,
}: {
  visibility: "public" | "unlisted" | "password" | "private"
  hasPassword: boolean
}) {
  const meta = {
    public:   { Icon: Globe,  label: "Public",   cls: "bg-success/10 text-success" },
    unlisted: { Icon: EyeOff, label: "Unlisted", cls: "bg-slate-500/10 text-slate-700 dark:text-slate-300" },
    password: { Icon: Lock,   label: "Password", cls: "bg-amber-500/10 text-amber-700 dark:text-amber-300" },
    private:  { Icon: Lock,   label: "Private",  cls: "bg-destructive/10 text-destructive" },
  }[visibility]
  const passwordMissing = visibility === "password" && !hasPassword
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
        meta.cls,
      )}
      title={
        passwordMissing
          ? "Password mode enabled but no password is set — anyone with the link gets in."
          : `Access: ${meta.label}`
      }
    >
      <meta.Icon className="h-3 w-3" />
      Access: {meta.label}
      {passwordMissing && (
        <span className="ml-1 rounded-full bg-destructive px-1.5 py-0 text-[9px] font-bold uppercase tracking-wide text-destructive-foreground">
          set password
        </span>
      )}
    </span>
  )
}
