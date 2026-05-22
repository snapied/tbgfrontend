"use client"

// Public course catalogue. Redesigned to feel modern and inviting:
//
//   • Editorial hero with a single big search input — the primary
//     discovery affordance — plus a one-line value prop.
//   • "Trending categories" chip rail right under the hero, so visitors
//     who don't know what to search can jump straight into a topic.
//   • Optional featured course strip at the top of results when no
//     filters are active (pulled from highest-rated published course).
//   • Larger, image-forward cards with a hover lift, instructor avatar,
//     rating + enrolment chips, and price.
//   • Typo-tolerant fuzzy search across title, description, category,
//     and instructor name (so "javscrpt" still matches "JavaScript").
//
// State is purely client-side over the LMS store. No server filtering.

import { useMemo, useState } from "react"
import Link from "next/link"
import {
  Search,
  Clock,
  Users,
  Star,
  BookOpen,
  Sparkles,
  TrendingUp,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { useLMS } from "@/lib/lms-store"
import { formatMoney } from "@/lib/currency"
import { CategoryFilterSelect } from "@/components/course-editor/category-filter-select"
import { stripRichTextTags } from "@/components/editor/rich-text-content"
import { Header } from "@/components/landing/header"
import { Footer } from "@/components/landing/footer"
import { fuzzyScore } from "@/lib/fuzzy-search"

export default function CourseCatalogPage() {
  const { courses, getUserById } = useLMS()
  const [search, setSearch] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [levelFilter, setLevelFilter] = useState<string>("all")
  const [sortBy, setSortBy] = useState<string>("popular")

  const publishedCourses = useMemo(
    () => courses.filter((c) => c.status === "published"),
    [courses],
  )

  // Categories sorted by enrollment so the most active topics float to
  // the front of the chip rail.
  const trendingCategories = useMemo(() => {
    const counts = new Map<string, number>()
    for (const c of publishedCourses) {
      if (!c.category?.trim()) continue
      counts.set(c.category, (counts.get(c.category) ?? 0) + c.enrolledCount)
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([cat]) => cat)
  }, [publishedCourses])

  const allCategories = useMemo(
    () => [...new Set(publishedCourses.map((c) => c.category).filter(Boolean))],
    [publishedCourses],
  )

  // Featured course: highest-rated published course with the most
  // enrolment as a tiebreaker. Only surfaced on the unfiltered view to
  // avoid stealing focus from the filtered grid.
  const featured = useMemo(() => {
    if (publishedCourses.length === 0) return null
    return [...publishedCourses].sort(
      (a, b) => b.rating - a.rating || b.enrolledCount - a.enrolledCount,
    )[0]
  }, [publishedCourses])

  const filteredCourses = useMemo(() => {
    const filtered = publishedCourses.filter((course) => {
      const matchesCategory = categoryFilter === "all" || course.category === categoryFilter
      const matchesLevel = levelFilter === "all" || course.level === levelFilter
      return matchesCategory && matchesLevel
    })

    // Fuzzy search wins over the sort order — relevance first.
    if (search.trim()) {
      const instructorName = (id: string) => getUserById(id)?.name ?? ""
      return filtered
        .map((c, idx) => {
          const fields = [
            c.title,
            c.category ?? "",
            stripRichTextTags(c.description ?? "").slice(0, 200),
            instructorName(c.instructor.id),
          ]
          const best = Math.min(...fields.map((f) => fuzzyScore(search, f)))
          return { c, score: best, idx }
        })
        .filter(({ score }) => Number.isFinite(score))
        .sort((a, b) => (a.score === b.score ? a.idx - b.idx : a.score - b.score))
        .map(({ c }) => c)
    }

    // No active search — apply the selected sort order.
    const arr = [...filtered]
    switch (sortBy) {
      case "popular":
        return arr.sort((a, b) => b.enrolledCount - a.enrolledCount)
      case "rating":
        return arr.sort((a, b) => b.rating - a.rating)
      case "newest":
        return arr.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        )
      case "price-low":
        return arr.sort((a, b) => a.price - b.price)
      case "price-high":
        return arr.sort((a, b) => b.price - a.price)
      default:
        return arr
    }
  }, [publishedCourses, search, categoryFilter, levelFilter, sortBy, getUserById])

  const hasActiveFilters =
    !!search.trim() || categoryFilter !== "all" || levelFilter !== "all"

  const clearFilters = () => {
    setSearch("")
    setCategoryFilter("all")
    setLevelFilter("all")
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex-1">
        {/* Editorial hero */}
        <section className="relative overflow-hidden border-b border-border bg-gradient-to-br from-primary/5 via-background to-accent/5">
          {/* Soft blurred blobs for depth — purely decorative. */}
          <div
            aria-hidden
            className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-primary/15 blur-3xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-accent/15 blur-3xl"
          />
          <div className="relative mx-auto max-w-6xl px-6 py-16 sm:py-20 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                <Sparkles className="h-3.5 w-3.5" />
                {publishedCourses.length} {publishedCourses.length === 1 ? "course" : "courses"} live now
              </span>
              <h1 className="mt-5 font-serif text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                Find a course you&apos;ll actually finish.
              </h1>
              <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
                Hand-picked classes from working teachers and creators. Search by
                topic, instructor, or just type roughly what you&apos;re looking
                for — we&apos;ll figure it out.
              </p>

              {/* Big search */}
              <div className="mx-auto mt-8 max-w-2xl">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Try 'react', 'painting', 'gate prep'…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="h-14 rounded-full border-2 pl-14 pr-14 text-base shadow-sm focus-visible:ring-primary/30"
                  />
                  {search && (
                    <button
                      type="button"
                      onClick={() => setSearch("")}
                      aria-label="Clear search"
                      className="absolute right-5 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Trending category chips */}
              {trendingCategories.length > 0 && (
                <div className="mx-auto mt-6 flex max-w-3xl flex-wrap items-center justify-center gap-2">
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
                    <TrendingUp className="h-3.5 w-3.5" />
                    Trending:
                  </span>
                  {trendingCategories.map((cat) => {
                    const active = categoryFilter === cat
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setCategoryFilter(active ? "all" : cat)}
                        className={cn(
                          "rounded-full border px-3 py-1 text-xs font-medium transition",
                          active
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-card text-foreground hover:border-primary/40 hover:bg-primary/5",
                        )}
                      >
                        {cat}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Featured course — only on unfiltered view */}
        {!hasActiveFilters && featured && (
          <section className="border-b border-border bg-card/40 py-10">
            <div className="mx-auto max-w-6xl px-6 lg:px-8">
              <div className="mb-4 flex items-center gap-2">
                <Star className="h-4 w-4 fill-accent text-accent" />
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Top pick this week
                </h2>
              </div>
              <FeaturedCourseCard
                course={featured}
                instructorName={
                  getUserById(featured.instructor.id)?.name ?? featured.instructor.name
                }
              />
            </div>
          </section>
        )}

        {/* Filters + Results */}
        <section className="py-12">
          <div className="mx-auto max-w-6xl px-6 lg:px-8">
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-3">
                <CategoryFilterSelect
                  value={categoryFilter}
                  onChange={setCategoryFilter}
                  available={allCategories}
                  className="w-48"
                  allLabel="All categories"
                />
                <Select value={levelFilter} onValueChange={setLevelFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All levels</SelectItem>
                    <SelectItem value="beginner">Beginner</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9">
                    Clear filters
                  </Button>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">
                  {filteredCourses.length} {filteredCourses.length === 1 ? "course" : "courses"}
                </span>
                <Select
                  value={sortBy}
                  onValueChange={setSortBy}
                  disabled={!!search.trim()}
                >
                  <SelectTrigger className="w-44">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="popular">Most popular</SelectItem>
                    <SelectItem value="rating">Highest rated</SelectItem>
                    <SelectItem value="newest">Newest</SelectItem>
                    <SelectItem value="price-low">Price: Low to high</SelectItem>
                    <SelectItem value="price-high">Price: High to low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {filteredCourses.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border py-16 text-center">
                <BookOpen className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">No courses match your search</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Try a different keyword, or clear the filters to see everything.
                </p>
                {hasActiveFilters && (
                  <Button variant="outline" size="sm" onClick={clearFilters} className="mt-4">
                    Clear filters
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {filteredCourses.map((course) => {
                  const instructor =
                    getUserById(course.instructor.id) ?? course.instructor
                  return (
                    <CourseGridCard
                      key={course.id}
                      course={course}
                      instructorName={instructor.name}
                      instructorAvatar={
                        "avatar" in instructor ? instructor.avatar : undefined
                      }
                    />
                  )
                })}
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}

// ============================================================
// Cards
// ============================================================

function CourseGridCard({
  course,
  instructorName,
  instructorAvatar,
}: {
  course: ReturnType<typeof useLMS>["courses"][number]
  instructorName: string
  instructorAvatar?: string
}) {
  const discountPct =
    course.originalPrice && course.originalPrice > course.price
      ? Math.round((1 - course.price / course.originalPrice) * 100)
      : 0

  return (
    <Link
      href={`/courses/${course.slug}`}
      className="group block focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-xl"
    >
      <Card className="overflow-hidden h-full transition-all duration-200 group-hover:-translate-y-1 group-hover:shadow-lg py-0">
        <div className="relative aspect-video bg-muted overflow-hidden">
          <img
            src={course.thumbnail || "/placeholder.svg?height=400&width=600"}
            alt={course.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
          {discountPct > 0 && (
            <div className="absolute left-3 top-3 rounded-full bg-destructive px-2.5 py-1 text-[11px] font-semibold text-destructive-foreground shadow-sm">
              {discountPct}% OFF
            </div>
          )}
          {course.price === 0 && (
            <div className="absolute left-3 top-3 rounded-full bg-success px-2.5 py-1 text-[11px] font-semibold text-success-foreground shadow-sm">
              Free
            </div>
          )}
        </div>
        <CardContent className="p-5">
          <div className="mb-2 flex items-center gap-2">
            {course.category && (
              <span className="truncate rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                {course.category}
              </span>
            )}
            <span className="text-[11px] capitalize text-muted-foreground">
              {course.level}
            </span>
          </div>
          <h3 className="line-clamp-2 font-semibold text-foreground transition-colors group-hover:text-primary">
            {course.title}
          </h3>
          <div className="mt-3 flex items-center gap-2">
            {instructorAvatar ? (
              <img
                src={instructorAvatar}
                alt=""
                className="h-6 w-6 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground">
                {instructorName
                  .split(" ")
                  .map((p) => p[0])
                  .join("")
                  .slice(0, 2)}
              </div>
            )}
            <span className="truncate text-xs text-muted-foreground">{instructorName}</span>
          </div>
          <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Star className="h-3.5 w-3.5 fill-accent text-accent" />
              <span className="font-medium text-foreground">{course.rating.toFixed(1)}</span>
              <span>({course.reviewCount})</span>
            </div>
            <div className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              <span>{course.enrolledCount.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              <span>{Math.round(course.totalDuration / 60)}h</span>
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between border-t border-border pt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-bold text-foreground">
                {course.price > 0 ? formatMoney(course.price, course.currency) : "Free"}
              </span>
              {course.originalPrice && course.originalPrice > course.price && (
                <span className="text-xs text-muted-foreground line-through">
                  {formatMoney(course.originalPrice, course.currency)}
                </span>
              )}
            </div>
            <span className="text-[11px] text-muted-foreground">
              {course.totalLessons} lessons
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

function FeaturedCourseCard({
  course,
  instructorName,
}: {
  course: ReturnType<typeof useLMS>["courses"][number]
  instructorName: string
}) {
  return (
    <Link
      href={`/courses/details/${course.slug}`}
      className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-2xl"
    >
      <Card className="overflow-hidden py-0 transition-shadow hover:shadow-xl">
        <div className="grid md:grid-cols-2">
          <div className="relative aspect-video md:aspect-auto bg-muted">
            <img
              src={course.thumbnail || "/placeholder.svg?height=400&width=600"}
              alt={course.title}
              className="h-full w-full object-cover"
            />
          </div>
          <div className="flex flex-col justify-center gap-3 p-6 sm:p-8">
            <div className="flex flex-wrap items-center gap-2">
              {course.category && (
                <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                  {course.category}
                </span>
              )}
              <span className="text-xs capitalize text-muted-foreground">
                {course.level}
              </span>
            </div>
            <h3 className="font-serif text-2xl font-bold leading-tight text-foreground sm:text-3xl">
              {course.title}
            </h3>
            <p className="line-clamp-3 text-sm text-muted-foreground">
              {stripRichTextTags(course.description)}
            </p>
            <p className="text-xs text-muted-foreground">By {instructorName}</p>
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <div className="flex items-center gap-1.5">
                <Star className="h-4 w-4 fill-accent text-accent" />
                <span className="font-semibold">{course.rating.toFixed(1)}</span>
                <span className="text-muted-foreground">
                  ({course.reviewCount} reviews)
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Users className="h-4 w-4" />
                <span>{course.enrolledCount.toLocaleString()} enrolled</span>
              </div>
            </div>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold">
                  {course.price > 0
                    ? formatMoney(course.price, course.currency)
                    : "Free"}
                </span>
                {course.originalPrice && course.originalPrice > course.price && (
                  <span className="text-sm text-muted-foreground line-through">
                    {formatMoney(course.originalPrice, course.currency)}
                  </span>
                )}
              </div>
              <Button>View course</Button>
            </div>
          </div>
        </div>
      </Card>
    </Link>
  )
}
