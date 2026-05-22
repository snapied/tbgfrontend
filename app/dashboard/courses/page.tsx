"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Plus, Search, MoreHorizontal, Eye, Pencil, Trash2, Users, Clock, Star, Archive, ArchiveRestore } from "lucide-react"
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
import { useLMS } from "@/lib/lms-store"
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
import { ProductTour, TakeATourButton, type TourStep } from "@/components/tour/product-tour"

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
  const { courses, updateCourse, deleteCourse } = useLMS()
  const { usageRemaining, limits } = usePlan()
  // /pricing markets the cap as "3 courses" (Starter) — total, not
  // just published. We count EVERY course row toward the cap so a
  // user who created 3 drafts can't keep going indefinitely.
  // The metric key is still `publishedCourses` because that's what
  // PlanLimits ships with; the cap value is the same number either
  // way, only the interpretation changes.
  const totalCourseCount = courses.length
  const coursesRemaining = usageRemaining("publishedCourses", totalCourseCount)
  const atCourseCap = coursesRemaining !== Infinity && coursesRemaining <= 0
  const cap = limits.publishedCourses
  const confirm = useConfirm()
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")

  // Background self-healing migration to automatically regenerate legacy cut-off thumbnails
  useEffect(() => {
    if (typeof window === "undefined" || courses.length === 0) return
    const migratedKey = "thebigclass.covers-migrated-v2"
    if (window.localStorage.getItem(migratedKey) === "true") return

    const migrateLegacyCovers = async () => {
      let madeChanges = false
      for (const course of courses) {
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
      window.localStorage.setItem(migratedKey, "true")
    }

    void migrateLegacyCovers()
  }, [courses, updateCourse])

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
    return fuzzySearch(base, search, (c) => [
      c.title,
      c.category ?? "",
      stripRichTextTags(c.description ?? "").slice(0, 200),
    ])
  }, [courses, search, statusFilter, categoryFilter])

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
            current={totalCourseCount}
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
            current={totalCourseCount}
            noun="Course"
          />
          <TakeATourButton tourId="courses-v1" />
          {atCourseCap ? (
            <Button asChild data-tour="courses-new" variant="outline" title={`You're at the ${cap}-course cap on your current plan. Upgrade to add another.`}>
              <Link href="/dashboard/billing">
                <Plus className="mr-2 h-4 w-4" />
                Upgrade to add a course
              </Link>
            </Button>
          ) : (
            <Button asChild data-tour="courses-new">
              <Link href="/dashboard/courses/new">
                <Plus className="mr-2 h-4 w-4" />
                Create Course
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Filters — drop the Card's default vertical padding (and the
          space between header/content) so the row hugs its contents. */}
      <Card className="py-0 gap-0">
        <CardContent className="p-3">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="relative flex-1" data-tour="courses-search">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search courses..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center" data-tour="courses-filters">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
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
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Course Grid */}
      {filteredCourses.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-muted p-4">
              <Plus className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="mt-4 text-lg font-semibold">No courses found</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {search || statusFilter !== "all" || categoryFilter !== "all"
                ? "Try adjusting your filters"
                : "Create your first course to get started"}
            </p>
            {!search && statusFilter === "all" && categoryFilter === "all" && (
              atCourseCap ? (
                <Button asChild variant="outline" className="mt-4">
                  <Link href="/dashboard/billing">
                    <Plus className="mr-2 h-4 w-4" />
                    Upgrade to add a course
                  </Link>
                </Button>
              ) : (
                <Button asChild className="mt-4">
                  <Link href="/dashboard/courses/new">
                    <Plus className="mr-2 h-4 w-4" />
                    Create Course
                  </Link>
                </Button>
              )
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredCourses.map((course) => (
            <Card key={course.id} className="overflow-hidden py-0 gap-0">
              <div className="aspect-video relative bg-muted">
                <CourseCoverImage
                  course={course}
                  alt={course.title}
                  className="h-full w-full object-cover"
                />
                <div className="absolute top-3 right-3">
                  <span className={cn(
                    "px-2 py-1 rounded-full text-xs font-medium capitalize",
                    getStatusColor(course.status)
                  )}>
                    {course.status}
                  </span>
                </div>
              </div>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <Link 
                      href={`/dashboard/courses/${course.id}`}
                      className="font-semibold text-foreground hover:text-primary line-clamp-1"
                    >
                      {course.title}
                    </Link>
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                      {stripRichTextTags(course.description)}
                    </p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
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
                          const ok = await confirm({
                            title: `Delete "${course.title}"?`,
                            description: course.enrolledCount > 0
                              ? `This course has ${course.enrolledCount.toLocaleString()} enrolled student${course.enrolledCount === 1 ? "" : "s"}. Deleting removes it from your dashboard and unenrols them. Move to Trash instead if you might bring it back.`
                              : "Deleting removes the course and every lesson, quiz, and assignment under it. This can be restored from Trash within 7 days.",
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

                <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    <span>{course.enrolledCount.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span>{Math.round(course.totalDuration / 60)}h</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-accent text-accent" />
                    <span>{course.rating}</span>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
                  <div>
                    <span className="text-lg font-bold text-foreground">
                      {course.price > 0 ? formatMoney(course.price, course.currency) : "Free"}
                    </span>
                    {course.originalPrice && course.originalPrice > course.price && (
                      <span className="ml-2 text-sm text-muted-foreground line-through">
                        {formatMoney(course.originalPrice, course.currency)}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground capitalize px-2 py-1 bg-muted rounded">
                    {course.level}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
