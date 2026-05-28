"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  Plus, Search, MoreHorizontal, Eye, Pencil, Trash2, Users, Clock, Star,
  Archive, ArchiveRestore, X, ArrowDownAZ, ArrowUpAZ, ArrowDown01, ArrowUp01,
  TrendingUp, Send, Copy as CopyIcon, BookOpen, Sparkles,
} from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Eye as EyeIcon, EyeOff as EyeOffIcon, Lock as LockIcon } from "lucide-react"
import { useLMS, generateId, type Course, type Module } from "@/lib/lms-store"
import { slugify } from "@/lib/lesson-utils"
import { AIGenerateButton } from "@/components/ai/ai-generate-button"
import { AICourseBuilderDialog } from "@/components/ai/ai-course-builder-dialog"
import type { GeneratedCourse, CourseBuilderInput } from "@/lib/ai-client"
import { PlanLimitHint, PlanLimitWarning } from "@/components/dashboard/plan-lock"
import { usePlan } from "@/lib/use-plan"
import { fireWebhookEvent } from "@/lib/event-dispatcher"
import { useConfirm } from "@/lib/use-confirm"
import { toast } from "sonner"
import { toastUndoableDelete } from "@/lib/toast-undo"
import { CourseCoverImage } from "@/components/courses/course-cover-image"
import { formatMoney } from "@/lib/currency"
import { stripRichTextTags } from "@/components/editor/rich-text-content"
import { CategoryFilterSelect } from "@/components/course-editor/category-filter-select"
import { fuzzySearch } from "@/lib/fuzzy-search"
import { SearchInput } from "@/components/ui/search-input"
import { EmptyState } from "@/components/ui/empty-state"
import { useTenant } from "@/lib/tenant-store"
import { tenantPublicUrl } from "@/lib/tenant-resolver"
import { ProductTour, TakeATourButton, type TourStep } from "@/components/tour/product-tour"
import { CreateInviteDialog } from "@/components/invite/create-invite-dialog"
import { ModuleTrashButton } from "@/components/dashboard/module-trash-button"

// Verb labels shown on every visibility action — confirm dialog,
// toast, and dialog header all read from the same map so the copy
// can't drift between surfaces.
const VIS_VERB = {
  public:   "Make public",
  unlisted: "Mark unlisted",
  password: "Lock with a password",
  private:  "Make private",
} as const

const COURSES_TOUR: TourStep[] = [
  {
    title: "Your course library",
    body: "Everything you teach lives here. Search, filter by status or category, and jump into any course to edit it.",
    emoji: "📚",
    placement: "center",
  },
  {
    target: "[data-tour='courses-new']",
    title: "Create a course",
    body: "Start from scratch or duplicate an existing one. A course holds modules, lessons, quizzes, assignments and live sessions.",
    emoji: "➕",
    placement: "bottom",
  },
  {
    target: "[data-tour='courses-search']",
    title: "Find courses fast",
    body: "Fuzzy search across title, category and description — typos welcome.",
    emoji: "🔍",
    placement: "bottom",
  },
  {
    target: "[data-tour='courses-filters']",
    title: "Filter by status & category",
    body: "Narrow down to published vs draft, or focus on a single category.",
    emoji: "🎛️",
    placement: "bottom",
  },
  {
    title: "That's it — try creating a course",
    body: "Tip: the curriculum editor supports drag-to-reorder, bulk import, and AI-assisted outlines.",
    emoji: "✨",
    placement: "center",
  },
]

export default function CoursesPage() {
  const { courses, updateCourse, deleteCourse, getEnrolledCount, addCourse, currentUser } = useLMS()
  const { currentTenant } = useTenant()
  // Build the public-site URL for a course card. Prefers the tenant's
  // verified custom domain, falls back to <slug>.<platform>. When we
  // can't resolve a tenant at all (rare — admin in a global view) we
  // settle for the local /learn/<slug> path so the action still does
  // something useful.
  const publicCourseUrl = (slug: string): string => {
    if (currentTenant) {
      const root = tenantPublicUrl(
        currentTenant.slug,
        currentTenant.customDomain,
        currentTenant.customDomainStatus,
      )
      return `${root}/courses/details/${slug}`
    }
    if (typeof window === "undefined") return `/courses/${slug}`
    return `${window.location.origin}/courses/${slug}`
  }
  const { usageRemaining, limits } = usePlan()
  // The cap metric is `publishedCourses` — count only that. Drafts
  // and archived courses don't take cap slots; they convert (or
  // don't) when the user actually flips status to "published".
  // This matches the metric name and lets teachers draft freely
  // while still policing the public-catalog footprint.
  const publishedCount = courses.filter((c) => c.status === "published").length
  const coursesRemaining = usageRemaining("publishedCourses", publishedCount)
  const atCourseCap = coursesRemaining !== Infinity && coursesRemaining <= 0
  const cap = limits.publishedCourses
  const confirm = useConfirm()
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [sortBy, setSortBy] = useState<
    "updatedDesc" | "updatedAsc" | "titleAsc" | "titleDesc" | "enrolledDesc" | "priceDesc"
  >("updatedDesc")
  const [selected, setSelected] = useState<Set<string>>(new Set())
  // Bulk-password dialog state. Opened by bulkSetVisibility("password").
  const [pwBulkOpen, setPwBulkOpen] = useState(false)

  // ── AI Course Builder ─────────────────────────────────────────
  const [aiBuilderOpen, setAiBuilderOpen] = useState(false)

  // Invite dialog state
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false)
  const [inviteCourse, setInviteCourse] = useState<{ id: string; title: string; price: number } | null>(null)
  const router = useRouter()

  const handleAICourseGenerated = useCallback(
    (generated: GeneratedCourse, builderInput: CourseBuilderInput) => {
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

      const totalLessons = mappedModules.reduce((sum, m) => sum + m.lessons.length, 0)
      const totalDuration = mappedModules.reduce(
        (sum, m) => sum + m.lessons.reduce((s, l) => s + l.duration, 0),
        0,
      )

      const newCourse: Course = {
        id: generateId("course"),
        title: generated.title,
        subtitle: generated.subtitle || undefined,
        slug: slugify(generated.title),
        description: generated.description,
        thumbnail: "/placeholder.svg?height=400&width=600",
        instructor: currentUser!,
        price: builderInput.price ?? 0,
        originalPrice: builderInput.originalPrice,
        currency: "INR",
        category: generated.category || builderInput.category || "",
        tags: generated.tags,
        level: generated.level,
        language: generated.language || "English",
        modules: mappedModules,
        totalDuration,
        totalLessons,
        enrolledCount: 0,
        rating: 0,
        reviewCount: 0,
        status: "draft",
        features: generated.features,
        requirements: generated.requirements,
        whatYouLearn: generated.whatYouLearn,
        seoTitle: generated.seoTitle,
        seoDescription: generated.seoDescription,
        seoKeywords: generated.seoKeywords,
        certificateEligible: false,
        certificateTemplate: "modern",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      addCourse(newCourse)
      toast.success("AI course created as draft!")
      router.push(`/dashboard/courses/${newCourse.id}`)
    },
    [addCourse, currentUser, router],
  )

  // Background self-healing migration to automatically regenerate legacy cut-off thumbnails.
  // Run-once flag is *checked* before we even read `courses`, so the
  // updateCourse calls inside don't restart the effect on every render.
  // Also wait for hydration to settle (no localStorage write yet) so
  // the initial empty `courses` array doesn't mark the migration done
  // before any real data hydrates.
  useEffect(() => {
    if (typeof window === "undefined") return
    const migratedKey = "thebigclass.covers-migrated-v2"
    if (window.localStorage.getItem(migratedKey) === "true") return
    if (courses.length === 0) return

    let cancelled = false
    const migrateLegacyCovers = async () => {
      let madeChanges = false
      for (const course of courses) {
        if (cancelled) return
        const thumb = course.thumbnail || ""
        const isLegacyThumbnail = thumb.startsWith("data:") || thumb.includes("/uploads/course-cover/")
        if (isLegacyThumbnail) {
          try {
            // Reconstruct the CourseSeed category
            const norm = (course.category || "").toLowerCase()
            let seedCat: "math" | "yoga" | "coding" | "finance" | "language" | "exam-prep" | "creative" | "wellness" | "business" | "general" = "general"
            if (norm.includes("math") || norm.includes("edu")) seedCat = "math"
            else if (norm.includes("yoga") || norm.includes("fitness")) seedCat = "yoga"
            else if (norm.includes("cod") || norm.includes("tech")) seedCat = "coding"
            else if (norm.includes("fin") || norm.includes("money")) seedCat = "finance"
            else if (norm.includes("lang")) seedCat = "language"
            else if (norm.includes("exam") || norm.includes("prep")) seedCat = "exam-prep"
            else if (norm.includes("creat") || norm.includes("art")) seedCat = "creative"
            else if (norm.includes("well") || norm.includes("health")) seedCat = "wellness"
            else if (norm.includes("bus")) seedCat = "business"

            const CATEGORY_HUE = {
              math:        210,
              yoga:        265,
              coding:      150,
              finance:     45,
              language:    340,
              "exam-prep": 195,
              creative:    20,
              wellness:    170,
              business:    285,
              general:     230,
            }

            const seed = {
              rawInput: course.title,
              topic: course.title,
              category: seedCat,
              audienceHint: course.subtitle || undefined,
              brandHue: CATEGORY_HUE[seedCat] || 230,
              modules: (course.modules || []).map((m) => ({
                title: m.title,
                lessons: (m.lessons || []).map((l) => l.title),
              })),
              priceInr: course.price || 0,
              promiseLines: [],
              sampleStudentName: "Student",
            }

            const { composeCoverPng } = await import("@/lib/cover-image-compose")
            const baked = await composeCoverPng(seed)
            if (baked) {
              const { uploadDataUrl } = await import("@/lib/upload-asset")
              const uploadedUrl = await uploadDataUrl(baked, "course-cover")
              updateCourse(course.id, { thumbnail: uploadedUrl })
              madeChanges = true
            }
          } catch (err) {
            console.error(`Failed to self-heal cover for course ${course.id}:`, err)
          }
        }
      }
      if (!cancelled) window.localStorage.setItem(migratedKey, "true")
      void madeChanges // intentionally unused; the effect mutates via updateCourse
    }

    void migrateLegacyCovers()
    return () => {
      cancelled = true
    }
    // Intentionally only depend on the IDENTITIES of courses/updateCourse
    // (length is enough to retrigger when new courses come in) — the
    // inner loop reads `courses` fresh each invocation anyway.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courses.length])

  const categories = [...new Set(courses.map(c => c.category))]

  const filteredCourses = useMemo(() => {
    // Defensive dedupe — old localStorage from before addCourse learned
    // to dedupe can carry duplicate rows, which trips React's
    // "two children with the same key" warning. Keep the first
    // occurrence per id; later writes already update-in-place.
    const seen = new Set<string>()
    const deduped = courses.filter((c) => {
      if (seen.has(c.id)) return false
      seen.add(c.id)
      return true
    })
    const base = deduped.filter((course) => {
      const matchesStatus = statusFilter === "all" || course.status === statusFilter
      const matchesCategory = categoryFilter === "all" || course.category === categoryFilter
      return matchesStatus && matchesCategory
    })
    const searched = fuzzySearch(base, search, (c) => [
      c.title,
      c.category ?? "",
      stripRichTextTags(c.description ?? "").slice(0, 200),
    ])
    // Fuzzy-search ranks by relevance — only apply the explicit sort
    // when no search is active, so the user's query isn't reshuffled.
    if (search.trim()) return searched
    const sorted = [...searched]
    const updated = (c: typeof sorted[number]) =>
      (c.updatedAt ?? c.createdAt ?? "") || ""
    switch (sortBy) {
      case "titleAsc":      sorted.sort((a, b) => a.title.localeCompare(b.title)); break
      case "titleDesc":     sorted.sort((a, b) => b.title.localeCompare(a.title)); break
      case "updatedDesc":   sorted.sort((a, b) => updated(b).localeCompare(updated(a))); break
      case "updatedAsc":    sorted.sort((a, b) => updated(a).localeCompare(updated(b))); break
      case "enrolledDesc":  sorted.sort((a, b) => getEnrolledCount(b.id) - getEnrolledCount(a.id)); break
      case "priceDesc":     sorted.sort((a, b) => (b.price ?? 0) - (a.price ?? 0)); break
    }
    return sorted
  }, [courses, search, statusFilter, categoryFilter, sortBy, getEnrolledCount])

  const hasActiveFilter =
    !!search.trim() || statusFilter !== "all" || categoryFilter !== "all"
  const clearFilters = () => {
    setSearch("")
    setStatusFilter("all")
    setCategoryFilter("all")
  }

  // Visible-only selection — the user expects "select all" to act on
  // the currently visible cards, not the entire workspace catalogue.
  const allVisibleSelected =
    filteredCourses.length > 0 && filteredCourses.every((c) => selected.has(c.id))
  const toggleAllVisible = () => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (allVisibleSelected) {
        for (const c of filteredCourses) next.delete(c.id)
      } else {
        for (const c of filteredCourses) next.add(c.id)
      }
      return next
    })
  }
  const toggleOne = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  const clearSelection = () => setSelected(new Set())
  const selectedCourses = courses.filter((c) => selected.has(c.id))

  const bulkSetStatus = async (status: "published" | "draft" | "archived") => {
    const verb = status === "published" ? "Publish" : status === "archived" ? "Archive" : "Move to draft"
    const ok = await confirm({
      title: `${verb} ${selected.size} course${selected.size === 1 ? "" : "s"}?`,
      description:
        status === "published"
          ? "Selected courses become discoverable on the public catalogue immediately."
          : status === "archived"
            ? "Archived courses disappear from the public catalogue and enrolled students' library."
            : "Selected courses revert to drafts and stop being publicly listed.",
      destructive: status === "archived",
      confirmLabel: verb,
    })
    if (!ok) return
    for (const c of selectedCourses) updateCourse(c.id, { status })
    if (status === "published") {
      for (const c of selectedCourses) {
        if (c.status !== "published") {
          fireWebhookEvent("course.published", { id: c.id, title: c.title, slug: c.slug })
        }
      }
    }
    toast.success(`${verb}d ${selected.size} course${selected.size === 1 ? "" : "s"}.`)
    clearSelection()
  }

  // Bulk visibility change. Asks for confirmation (and a password
  // via a styled dialog — not window.prompt — when switching into
  // Password mode); applies updateCourse for every selected course.
  // Password mode without a password is useless — we refuse it so
  // the gate doesn't silently fail open.
  const applyBulkVisibility = (
    visibility: "public" | "unlisted" | "password" | "private",
    password: string,
  ) => {
    for (const c of selectedCourses) {
      updateCourse(c.id, {
        visibility,
        accessPassword: visibility === "password" ? password : undefined,
      })
    }
    const verb = VIS_VERB[visibility]
    toast.success(
      `${verb.toLowerCase()} applied to ${selected.size} course${selected.size === 1 ? "" : "s"}.`,
    )
    clearSelection()
  }

  const bulkSetVisibility = async (
    visibility: "public" | "unlisted" | "password" | "private",
  ) => {
    if (visibility === "password") {
      // Password mode needs the actual code — pop the styled dialog
      // and finish the bulk-apply only after the user submits it.
      setPwBulkOpen(true)
      return
    }
    const verb = VIS_VERB[visibility]
    const ok = await confirm({
      title: `${verb}? (${selected.size} course${selected.size === 1 ? "" : "s"})`,
      description:
        visibility === "public"
          ? "Selected courses will appear on the public catalogue and anyone can open them."
          : visibility === "unlisted"
            ? "Selected courses disappear from the public catalogue — only people with the direct link can open them."
            : "Selected courses are hidden from the catalogue and only enrolled students can open them.",
      confirmLabel: verb,
    })
    if (!ok) return
    applyBulkVisibility(visibility, "")
  }

  const bulkDelete = async () => {
    const ok = await confirm({
      title: `Delete ${selected.size} course${selected.size === 1 ? "" : "s"}?`,
      description:
        "Each course is removed together with its enrolments, assignments, submissions, live sessions, attendance, quiz attempts, doubts and reviews. Restore individually from Trash within 7 days.",
      destructive: true,
      confirmLabel: "Delete",
    })
    if (!ok) return
    const ids = selectedCourses.map((c) => c.id)
    for (const id of ids) deleteCourse(id)
    toastUndoableDelete({ kind: "course", ids, itemNoun: "course" })
    clearSelection()
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "published": return "bg-success/10 text-success"
      case "draft": return "bg-muted text-muted-foreground"
      case "archived": return "bg-destructive/10 text-destructive"
      default: return "bg-muted text-muted-foreground"
    }
  }

  return (
    <div className="space-y-6">
      <ProductTour tourId="courses-v1" steps={COURSES_TOUR} />
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Courses</h1>
          <p className="text-muted-foreground">Create and manage your courses</p>
          <PlanLimitWarning
            metric="publishedCourses"
            current={publishedCount}
            className="mt-2"
          />
        </div>
        <div className="flex items-center gap-2">
          {/* Pre-warning chip — always visible when the plan caps
              courses, so the user knows how close they are before
              they ever click Create. The button below already
              swaps to "Upgrade" at the cap; this is the calm
              "you have 1 left" version. */}
          <PlanLimitHint
            metric="publishedCourses"
            current={publishedCount}
            noun="Course"
          />
          <TakeATourButton tourId="courses-v1" />
          <ModuleTrashButton kinds={["course", "course-module", "course-lesson"]} noun="course" />
          {atCourseCap ? (
            <Button asChild data-tour="courses-new" variant="outline" title={`You're at the ${cap}-course cap on your current plan. Upgrade to add another.`}>
              <Link href="/dashboard/billing">
                <Plus className="mr-2 h-4 w-4" />
                Upgrade to add a course
              </Link>
            </Button>
          ) : (
            <>
              {/* Show AI builder in the header only when courses exist —
                  when empty, the AI path lives in the EmptyState card below. */}
              {courses.length > 0 && (
                <AIGenerateButton
                  label="AI Course Builder"
                  size="default"
                  onGenerate={() => setAiBuilderOpen(true)}
                />
              )}
              <Button asChild data-tour="courses-new">
                <Link href="/dashboard/courses/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Course
                </Link>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Filters — drop the Card's default vertical padding (and the
          space between header/content) so the row hugs its contents. */}
      <Card className="py-0 gap-0">
        <CardContent className="p-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div data-tour="courses-search" className="flex-1">
              <SearchInput
                pageId="courses"
                value={search}
                onChange={setSearch}
                placeholder="Search by title, category, description…"
                ariaLabel="Search courses"
                shortcutDescription="Focus course search"
              />
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center" data-tour="courses-filters">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-40" aria-label="Filter by status">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
              <CategoryFilterSelect
                value={categoryFilter}
                onChange={setCategoryFilter}
                available={categories}
                className="w-full sm:w-48"
                allLabel="All categories"
              />
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
                <SelectTrigger className="w-full sm:w-44" aria-label="Sort">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="updatedDesc">
                    <span className="inline-flex items-center gap-1.5"><ArrowDown01 className="h-3.5 w-3.5" /> Recently updated</span>
                  </SelectItem>
                  <SelectItem value="updatedAsc">
                    <span className="inline-flex items-center gap-1.5"><ArrowUp01 className="h-3.5 w-3.5" /> Oldest first</span>
                  </SelectItem>
                  <SelectItem value="titleAsc">
                    <span className="inline-flex items-center gap-1.5"><ArrowDownAZ className="h-3.5 w-3.5" /> Title A–Z</span>
                  </SelectItem>
                  <SelectItem value="titleDesc">
                    <span className="inline-flex items-center gap-1.5"><ArrowUpAZ className="h-3.5 w-3.5" /> Title Z–A</span>
                  </SelectItem>
                  <SelectItem value="enrolledDesc">
                    <span className="inline-flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /> Most enrolled</span>
                  </SelectItem>
                  <SelectItem value="priceDesc">
                    <span className="inline-flex items-center gap-1.5"><TrendingUp className="h-3.5 w-3.5" /> Highest price</span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {hasActiveFilter && (
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
              <span className="text-muted-foreground">Filtering:</span>
              {search.trim() && <CourseFilterChip label={`"${search.trim()}"`} onClear={() => setSearch("")} />}
              {statusFilter !== "all" && <CourseFilterChip label={`Status: ${statusFilter}`} onClear={() => setStatusFilter("all")} />}
              {categoryFilter !== "all" && <CourseFilterChip label={`Category: ${categoryFilter || "—"}`} onClear={() => setCategoryFilter("all")} />}
              <button
                type="button"
                onClick={clearFilters}
                className="text-muted-foreground hover:text-foreground hover:underline"
              >
                Clear all
              </button>
              <span className="ml-auto text-muted-foreground">
                {filteredCourses.length} of {courses.length} courses
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bulk-action drawer — appears once the user ticks at least one
          card. Carries the count + every bulk operation the table
          dropdown does per-row. Sticky so scrolling the grid keeps
          the actions reachable. */}
      {selected.size > 0 && (
        <div className="sticky top-2 z-10 flex flex-wrap items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 shadow-sm backdrop-blur">
          <span className="mr-1 inline-flex items-center gap-1.5 text-sm font-semibold">
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-bold text-primary-foreground">
              {selected.size}
            </span>
            selected
          </span>
          <Button variant="outline" size="sm" onClick={() => bulkSetStatus("published")}>
            <Send className="mr-1 h-3.5 w-3.5" /> Publish
          </Button>
          <Button variant="outline" size="sm" onClick={() => bulkSetStatus("draft")}>
            <Pencil className="mr-1 h-3.5 w-3.5" /> Move to draft
          </Button>
          <Button variant="outline" size="sm" onClick={() => bulkSetStatus("archived")}>
            <Archive className="mr-1 h-3.5 w-3.5" /> Archive
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" title="Change who can access the selected courses">
                <BookOpen className="mr-1 h-3.5 w-3.5" /> Access ▾
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => bulkSetVisibility("public")}>
                <Eye className="mr-2 h-4 w-4" /> Public — discoverable + open
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => bulkSetVisibility("unlisted")}>
                <Pencil className="mr-2 h-4 w-4" /> Unlisted — link only
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => bulkSetVisibility("password")}>
                <Archive className="mr-2 h-4 w-4" /> Password — set a code
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => bulkSetVisibility("private")}>
                <Trash2 className="mr-2 h-4 w-4" /> Private — invite-only
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={bulkDelete}>
            <Trash2 className="mr-1 h-3.5 w-3.5" /> Delete
          </Button>
          <div className="ml-auto">
            <Button variant="ghost" size="sm" onClick={clearSelection} title="Clear selection">
              <X className="mr-1 h-3.5 w-3.5" /> Clear
            </Button>
          </div>
        </div>
      )}

      {/* Course Grid */}
      {filteredCourses.length === 0 ? (
        (search || statusFilter !== "all" || categoryFilter !== "all") ? (
          // Filter-empty branch — they have courses, just none
          // matching. Keep the prompt small and direct.
          <EmptyState
            icon={<span>🔍</span>}
            title="No courses match your filters"
            description="Loosen a filter or clear the search to see everything."
          />
        ) : atCourseCap ? (
          // Capacity-empty branch — they hit the plan ceiling. The
          // CTA changes to "Upgrade" with no destruction-of-choice
          // alternative path.
          <EmptyState
            icon={<span>🚧</span>}
            title="You've hit the course cap on your plan"
            description="Upgrade to add more courses and unlock the rest of the catalogue surface."
            paths={[
              {
                id: "upgrade",
                label: "Upgrade plan",
                hint: "Lift the cap + unlock pro features",
                icon: <Plus className="h-4 w-4" />,
                href: "/dashboard/billing",
                primary: true,
              },
            ]}
          />
        ) : (
          // First-run empty — three viable paths to first content.
          // Order matters: AI is the fastest WOW; blank gives full
          // control; templates is the safe middle path. Most users
          // will pick AI on first read.
          <EmptyState
            icon={<span>📚</span>}
            title="Build your first course"
            description="Three ways to start — most teachers go with the AI builder. You can edit anything it produces."
            paths={[
              {
                id: "ai",
                label: "AI Course Builder",
                hint: "Provide a few details, get a full course",
                icon: <Sparkles className="h-4 w-4" />,
                onClick: () => setAiBuilderOpen(true),
                primary: true,
              },
              {
                id: "blank",
                label: "Start blank",
                hint: "Full control from lesson one",
                icon: <Plus className="h-4 w-4" />,
                href: "/dashboard/courses/new",
              },
              {
                id: "help",
                label: "How courses work",
                hint: "5-min read with examples",
                icon: <BookOpen className="h-4 w-4" />,
                href: "/help/course-create",
              },
            ]}
            footerLink={{ label: "See every help doc", href: "/help" }}
          />
        )
      ) : (
        <>
        <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
          <label className="inline-flex cursor-pointer items-center gap-2">
            <Checkbox
              checked={allVisibleSelected ? true : selected.size > 0 ? "indeterminate" : false}
              onCheckedChange={toggleAllVisible}
              aria-label="Select all visible courses"
            />
            <span>{allVisibleSelected ? "Selected all visible" : "Select all visible"}</span>
          </label>
          <span>
            {filteredCourses.length} course{filteredCourses.length === 1 ? "" : "s"}
          </span>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredCourses.map((course) => {
            const isSelected = selected.has(course.id)
            const totalLessonsLive = course.modules.reduce((acc, m) => acc + m.lessons.length, 0)
            const attentionFlags = computeAttentionFlags(course, totalLessonsLive)
            return (
            <Card
              key={course.id}
              className={cn(
                "overflow-hidden py-0 gap-0 transition-shadow",
                isSelected && "ring-2 ring-primary",
                attentionFlags.length > 0 && "ring-1 ring-amber-500/30",
              )}
            >
              <div className="aspect-video relative bg-muted">
                <CourseCoverImage
                  course={course}
                  alt=""
                  className="h-full w-full object-cover"
                />
                <div className="absolute top-3 left-3">
                  <label
                    className="inline-flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-card/90 shadow-sm backdrop-blur"
                    title={isSelected ? "Deselect course" : "Select course"}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleOne(course.id)}
                      aria-label={`Select ${course.title}`}
                    />
                  </label>
                </div>
                {/* Top-right stack: status pill on top, visibility
                    chip below. Surfacing access at-a-glance lets the
                    teacher spot a course that's accidentally
                    Unlisted / Private / Password-locked without
                    drilling into the detail page. */}
                <div className="absolute top-3 right-3 flex flex-col items-end gap-1">
                  <span
                    className={cn(
                      "px-2 py-1 rounded-full text-xs font-medium capitalize shadow-sm",
                      getStatusColor(course.status),
                    )}
                    aria-label={`Status: ${course.status}`}
                  >
                    {course.status}
                  </span>
                  <CardVisibilityChip
                    visibility={course.visibility ?? "public"}
                    hasPassword={!!course.accessPassword}
                  />
                </div>
                {/* Needs-attention chips, bottom-left of the cover.
                    Surface the most impactful issues so a teacher
                    scanning the catalogue can spot trouble without
                    drilling into each course. We cap at 2 to keep
                    the card calm; further issues collapse into a
                    "+N more" pill that hovers to the detail page. */}
                {attentionFlags.length > 0 && (
                  <div className="absolute bottom-3 left-3 flex flex-wrap items-center gap-1">
                    {attentionFlags.slice(0, 2).map((f) => (
                      <span
                        key={f.id}
                        className="inline-flex items-center gap-1 rounded-full border border-amber-500/50 bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-800 shadow-sm backdrop-blur dark:text-amber-200"
                        title={f.detail}
                      >
                        <span aria-hidden>{f.emoji}</span>
                        {f.label}
                      </span>
                    ))}
                    {attentionFlags.length > 2 && (
                      <Link
                        href={`/dashboard/courses/${course.id}`}
                        className="inline-flex items-center rounded-full border border-amber-500/50 bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-800 shadow-sm backdrop-blur dark:text-amber-200"
                        title={attentionFlags
                          .slice(2)
                          .map((f) => f.label)
                          .join(" · ")}
                      >
                        +{attentionFlags.length - 2} more
                      </Link>
                    )}
                  </div>
                )}
              </div>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/dashboard/courses/${course.id}`}
                      className="font-semibold text-foreground hover:text-primary line-clamp-1"
                      title={course.title}
                    >
                      {course.title}
                    </Link>
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                      {stripRichTextTags(course.description) || (
                        <span className="italic">No description yet</span>
                      )}
                    </p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        aria-label={`Actions for ${course.title}`}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/dashboard/courses/${course.id}`}>
                          <Eye className="mr-2 h-4 w-4" />
                          View Details
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href={`/dashboard/courses/${course.id}/edit`}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit Course
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={async () => {
                          const url = publicCourseUrl(course.slug)
                          try {
                            await navigator.clipboard.writeText(url)
                            toast.success("Public URL copied.", { description: url })
                          } catch {
                            toast.error("Couldn't access the clipboard.", { description: url })
                          }
                        }}
                      >
                        <CopyIcon className="mr-2 h-4 w-4" />
                        Copy public URL
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          setInviteCourse({ id: course.id, title: course.title, price: course.price })
                          setInviteDialogOpen(true)
                        }}
                      >
                        <Send className="mr-2 h-4 w-4" />
                        Send Payment Link
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {course.status !== "archived" ? (
                        <DropdownMenuItem
                          onClick={async () => {
                            const ok = await confirm({
                              title: `Archive "${course.title}"?`,
                              description:
                                "Archived courses are hidden from your public storefront and from enrolled students' library. They keep their lessons, quizzes, and recordings — un-archive any time to bring them back.",
                              confirmLabel: "Archive",
                            })
                            if (!ok) return
                            updateCourse(course.id, { status: "archived" })
                            fireWebhookEvent("course.archived", {
                              id: course.id,
                              title: course.title,
                              slug: course.slug,
                            })
                            toast.success(`"${course.title}" archived.`)
                          }}
                        >
                          <Archive className="mr-2 h-4 w-4" />
                          Archive
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem
                          onClick={() => {
                            updateCourse(course.id, { status: "draft" })
                            toast.success(`"${course.title}" un-archived. It's a draft — publish to make it public.`)
                          }}
                        >
                          <ArchiveRestore className="mr-2 h-4 w-4" />
                          Un-archive (to draft)
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={async () => {
                          const liveEnrolled = getEnrolledCount(course.id)
                          const ok = await confirm({
                            title: `Delete "${course.title}"?`,
                            description: liveEnrolled > 0
                              ? `${liveEnrolled.toLocaleString()} student${liveEnrolled === 1 ? "" : "s"} enrolled. Deleting also removes their enrolments, every assignment and submission, every live session and attendance, every quiz attempt, every doubt, and every review on this course. Restore from Trash brings the whole bundle back.`
                              : "Deletes the course together with every assignment, submission, live session, attendance record, quiz attempt, doubt and review attached to it. Restore from Trash brings the whole bundle back.",
                            destructive: true,
                            confirmLabel: "Delete course",
                          })
                          if (!ok) return
                          deleteCourse(course.id)
                          toastUndoableDelete({
                            kind: "course",
                            ids: course.id,
                            label: course.title,
                            itemNoun: "course",
                          })
                        }}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1" title={`${getEnrolledCount(course.id)} enrolled`}>
                    <Users className="h-4 w-4" aria-hidden />
                    <span className="tabular-nums">{getEnrolledCount(course.id).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-1" title={`${course.totalDuration || 0} minutes total`}>
                    <Clock className="h-4 w-4" aria-hidden />
                    <span className="tabular-nums">{formatDuration(course.totalDuration ?? 0)}</span>
                  </div>
                  <div className="flex items-center gap-1" title={`${totalLessonsLive} lessons`}>
                    <BookOpen className="h-4 w-4" aria-hidden />
                    <span className="tabular-nums">{totalLessonsLive}</span>
                  </div>
                  {course.rating > 0 ? (
                    <div className="flex items-center gap-1" title={`${course.rating.toFixed(1)} average rating`}>
                      <Star className="h-4 w-4 fill-accent text-accent" aria-hidden />
                      <span className="tabular-nums">{course.rating.toFixed(1)}</span>
                    </div>
                  ) : null}
                </div>

                <div className="mt-4 flex items-center justify-between gap-2 border-t border-border pt-4">
                  <div className="min-w-0">
                    <span className="text-lg font-bold text-foreground">
                      {course.price > 0 ? formatMoney(course.price, course.currency) : "Free"}
                    </span>
                    {course.originalPrice && course.originalPrice > course.price && (
                      <span className="ml-2 text-sm text-muted-foreground line-through">
                        {formatMoney(course.originalPrice, course.currency)}
                      </span>
                    )}
                  </div>
                  <span className="shrink-0 rounded bg-muted px-2 py-1 text-xs capitalize text-muted-foreground">
                    {course.level}
                  </span>
                </div>
              </CardContent>
            </Card>
            )
          })}
        </div>
        </>
      )}

      {/* Bulk password-mode dialog — replaces the native
          window.prompt with a focused, themed input that fits the
          rest of the dashboard chrome and supports show / hide. */}
      {/* AI Course Builder Dialog */}
      <AICourseBuilderDialog
        open={aiBuilderOpen}
        onOpenChange={setAiBuilderOpen}
        onCourseGenerated={handleAICourseGenerated}
      />

      {/* Invite / Payment Link Dialog */}
      {inviteCourse && (
        <CreateInviteDialog
          open={inviteDialogOpen}
          onOpenChange={setInviteDialogOpen}
          courseId={inviteCourse.id}
          courseTitle={inviteCourse.title}
          coursePrice={inviteCourse.price}
          onCreated={() => toast.success("Payment link created!")}
        />
      )}

      <BulkSetPasswordDialog
        open={pwBulkOpen}
        onOpenChange={setPwBulkOpen}
        courseCount={selected.size}
        onConfirm={async (password) => {
          setPwBulkOpen(false)
          // Confirm step after the password is captured, so the
          // user sees the count + description before we touch state.
          const ok = await confirm({
            title: `${VIS_VERB.password}? (${selected.size} course${selected.size === 1 ? "" : "s"})`,
            description:
              "Selected courses will be hidden from the catalogue. Visitors need the password to open them.",
            confirmLabel: VIS_VERB.password,
          })
          if (!ok) return
          applyBulkVisibility("password", password)
        }}
      />
    </div>
  )
}

// ============================================================
// Bulk "lock with a password" dialog.
// ============================================================
function BulkSetPasswordDialog({
  open,
  onOpenChange,
  courseCount,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  courseCount: number
  onConfirm: (password: string) => void
}) {
  const [value, setValue] = useState("")
  const [show, setShow] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Reset whenever the dialog is opened so a previous attempt
  // doesn't leak in.
  useEffect(() => {
    if (open) {
      setValue("")
      setShow(false)
      setError(null)
    }
  }, [open])

  const submit = () => {
    const trimmed = value.trim()
    if (!trimmed) {
      setError("Enter a password — Password mode without a code would fail open.")
      return
    }
    if (trimmed.length < 4) {
      setError("Use at least 4 characters so it isn't trivially guessable.")
      return
    }
    onConfirm(trimmed)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LockIcon className="h-5 w-5 text-primary" />
            Lock {courseCount} course{courseCount === 1 ? "" : "s"} with a password
          </DialogTitle>
          <DialogDescription>
            Anyone with the link AND this password will be able to open these courses.
            Share both with the students you want to let in.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <Label htmlFor="bulk-pw">Course password</Label>
          <div className="relative">
            <Input
              id="bulk-pw"
              type={show ? "text" : "password"}
              value={value}
              onChange={(e) => {
                setValue(e.target.value)
                if (error) setError(null)
              }}
              placeholder="e.g. blue-river-37"
              autoFocus
              autoComplete="off"
              aria-invalid={!!error}
              className="pr-10"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  submit()
                }
              }}
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label={show ? "Hide password" : "Show password"}
              title={show ? "Hide password" : "Show password"}
            >
              {show ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
            </button>
          </div>
          {error ? (
            <p className="text-[11px] text-destructive">{error}</p>
          ) : (
            <p className="text-[11px] text-muted-foreground">
              Stored plain on the course row (POC). Avoid reusing personal passwords.
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit}>
            <LockIcon className="mr-2 h-4 w-4" />
            Set password
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Small dismissible chip used in the active-filter strip. Keep here
// (not in /components/ui) because nothing else in the app uses
// exactly this shape and the chip is one of the file's only inline
// helpers.
function CourseFilterChip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2 py-0.5 text-[11px] font-medium">
      <span className="max-w-[220px] truncate">{label}</span>
      <button
        type="button"
        onClick={onClear}
        className="rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
        aria-label={`Remove filter: ${label}`}
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  )
}

// Pretty-format a duration stored as total minutes. Courses with
// < 60 min showed "0h" before — meaningless. Now: "45m", "2h 30m",
// "1h", "12h".
function formatDuration(totalMinutes: number): string {
  if (!Number.isFinite(totalMinutes) || totalMinutes <= 0) return "0m"
  const h = Math.floor(totalMinutes / 60)
  const m = Math.round(totalMinutes % 60)
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

// Compact visibility chip shown on each course card. Colour-coded so
// Public stays calm and Private/Password pop; a "set password"
// warning ribbon appears when the toggle is on but no password has
// been entered (would silently fail open otherwise).
// Needs-attention flags surfaced as small chips on each course card.
// We deliberately only check signals that the teacher can FIX from
// the course itself — no "students aren't engaging" flag here because
// that lives on the engagement page. Each flag has a short label
// (chip) + a longer detail (tooltip / hover) so scan-friendly meets
// learn-more.
type AttentionFlag = { id: string; emoji: string; label: string; detail: string }

function computeAttentionFlags(
  course: {
    status: string
    publishAt?: string
    updatedAt?: string
    createdAt?: string
    price?: number
    modules: Array<{ lessons: unknown[] }>
    accessPassword?: string
    visibility?: string
    thumbnail?: string
  },
  lessonCount: number,
): AttentionFlag[] {
  const out: AttentionFlag[] = []
  const now = Date.now()

  // 1. Scheduled publish has already passed but status is still
  //    draft — the cron didn't fire or the teacher forgot to clear
  //    the schedule. Loud chip because it implies a missed launch.
  if (course.status === "draft" && course.publishAt) {
    const target = Date.parse(course.publishAt)
    if (Number.isFinite(target) && target < now) {
      out.push({
        id: "publish-past",
        emoji: "⏰",
        label: "Publish time passed",
        detail: `Scheduled to publish at ${new Date(course.publishAt).toLocaleString()} — still in draft. Publish manually or clear the schedule.`,
      })
    }
  }

  // 2. Password mode but no password actually set. Students hit a
  //    gate they can't solve.
  if (course.visibility === "password" && !course.accessPassword?.trim()) {
    out.push({
      id: "password-missing",
      emoji: "🔒",
      label: "Password missing",
      detail: "This course requires a password but none is set. Add one in the Access tab.",
    })
  }

  // 3. Empty curriculum on a published course. Students arrive at a
  //    course detail page with nothing to learn.
  if (course.status === "published" && lessonCount === 0) {
    out.push({
      id: "empty-curriculum",
      emoji: "📭",
      label: "No lessons",
      detail: "Published, but the curriculum is empty. Add modules + lessons before sharing the link.",
    })
  }

  // 4. Stale content — no edits in 60 days on a published course.
  //    Doesn't block anything, but flags content that probably
  //    deserves a refresh.
  if (course.status === "published" && course.updatedAt) {
    const updatedMs = Date.parse(course.updatedAt)
    const sixtyDaysAgo = now - 60 * 24 * 60 * 60 * 1000
    if (Number.isFinite(updatedMs) && updatedMs < sixtyDaysAgo) {
      const days = Math.floor((now - updatedMs) / (24 * 60 * 60 * 1000))
      out.push({
        id: "stale",
        emoji: "🕸️",
        label: `Stale (${days}d)`,
        detail: `Last edited ${days} days ago. Consider a refresh — outdated content erodes new-student trust.`,
      })
    }
  }

  // 5. Paid course with no thumbnail. Cover image is a major
  //    conversion lever; a blank one signals "unfinished."
  if (
    course.status === "published" &&
    (course.price ?? 0) > 0 &&
    !course.thumbnail
  ) {
    out.push({
      id: "no-thumbnail",
      emoji: "🖼️",
      label: "No cover image",
      detail: "Paid courses without a cover image convert poorly. Add one in the Basics tab.",
    })
  }

  return out
}

function CardVisibilityChip({
  visibility,
  hasPassword,
}: {
  visibility: "public" | "unlisted" | "password" | "private"
  hasPassword: boolean
}) {
  const meta = {
    public:   { Icon: EyeIcon,    label: "Public",   cls: "bg-success/15 text-success border-success/30" },
    unlisted: { Icon: EyeOffIcon, label: "Unlisted", cls: "bg-slate-500/15 text-slate-800 dark:text-slate-200 border-slate-500/30" },
    password: { Icon: LockIcon,   label: "Password", cls: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30" },
    private:  { Icon: LockIcon,   label: "Private",  cls: "bg-destructive/15 text-destructive border-destructive/30" },
  }[visibility]
  const passwordMissing = visibility === "password" && !hasPassword
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold shadow-sm",
        meta.cls,
      )}
      title={
        passwordMissing
          ? "Password mode is on but no password is set — anyone with the link gets in."
          : `Access: ${meta.label}`
      }
    >
      <meta.Icon className="h-2.5 w-2.5" />
      {meta.label}
      {passwordMissing && (
        <span className="rounded-full bg-destructive px-1 py-0 text-[8px] font-bold uppercase tracking-wide text-destructive-foreground">
          !
        </span>
      )}
    </span>
  )
}
