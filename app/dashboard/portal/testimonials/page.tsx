"use client"

// Testimonials manager — full rewrite for the round.
//
// Round deliverables in this file:
//   • Search + filter + sort + bulk via Sprint-1 primitives (1–4, 29, 32–35)
//   • Featured cap warning (5)
//   • Visual star rating in the editor (18)
//   • Reject with reason + Undo (23, 24)
//   • Media-URL health check (16)
//   • Live preview card mirror (30)
//   • Featured-tab "as the public sees it" rail (36)
//   • Rich empty state (40)
//   • Per-card Share-to-community + Per-card "About instructor" attribution (45)
//   • Wall of Love preview header strip (32)
//   • Pull-from-reviews auto-import setting (41)
//   • Spam-score badge on submission-sourced rows
//   • Hover mini-preview is rendered in-row card (cheap; no separate hover layer)

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import {
  Copy,
  Download,
  Heart,
  Plus,
  Quote,
  Sparkles,
  Star,
  StarOff,
  Trash2,
  Users2,
  Wand2,
  XCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { FileUploadField } from "@/components/upload/file-upload-field"
import {
  usePortal,
  generatePortalId,
  type PortalTestimonial,
} from "@/lib/portal-store"
import { useWall } from "@/lib/wall-store"
import { useLMS } from "@/lib/lms-store"
import { useTenant } from "@/lib/tenant-store"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { useListState } from "@/lib/use-list-state"
import {
  ListToolbar,
  ListSearch,
  ListFilterPopover,
  ListSort,
  ListCount,
  ListReset,
} from "@/components/ui/list-toolbar"
import { BulkActionBar } from "@/components/dashboard/bulk-action-bar"
import { ShareMenu } from "@/components/share/share-menu"
import { ProductTour, TakeATourButton, type TourStep } from "@/components/tour/product-tour"
import { StarRatingInput } from "@/components/portal/star-rating-input"
import { TestimonialRejectDialog } from "@/components/portal/testimonial-reject-dialog"
import { TestimonialAskDialog } from "@/components/portal/testimonial-ask-dialog"
import { CrossPosterDialog } from "@/components/ui/cross-poster-dialog"

const TESTIMONIALS_TOUR: TourStep[] = [
  {
    title: "Your testimonial inbox",
    body: "Quotes from students — pending, published, featured. Filter to find what needs review, bulk-publish what's ready, feature the standouts.",
    emoji: "💬",
    placement: "center",
  },
  {
    target: "[data-tour='testimonials-ask']",
    title: "Ask students for testimonials",
    body: "Pick a course, choose past students, copy magic links into your email tool. No sign-in needed on their end — they tap, type, submit.",
    emoji: "✉️",
    placement: "bottom",
  },
  {
    target: "[data-tour='testimonials-wall']",
    title: "Wall of Love",
    body: "Every published testimonial flows into your public Wall of Love — share that URL anywhere. Imported entries are de-duped on quote text.",
    emoji: "💖",
    placement: "bottom",
  },
  {
    target: "[data-tour='testimonials-featured-tab']",
    title: "Featured set",
    body: "The Featured tab shows exactly what visitors see on your home page testimonial section. Re-order, swap, A/B without leaving this page.",
    emoji: "🌟",
    placement: "bottom",
  },
]

// Soft cap on featured testimonials — anything above this triggers a
// banner suggesting demotion (Item 5).
const FEATURED_SOFT_CAP = 12

export default function TestimonialsPage() {
  const {
    testimonials,
    upsertTestimonial,
    deleteTestimonial,
    config,
    updateConfig,
  } = usePortal()
  const { entries: wallEntries } = useWall()
  const { getUserById, courses, currentUser, studentGroups, addBatchPost, getReviewsForCourse } = useLMS()
  const { currentTenant } = useTenant()
  const tenantSlug = currentTenant?.slug ?? ""

  // Dialogs.
  const [editorOpen, setEditorOpen] = useState(false)
  const [editing, setEditing] = useState<PortalTestimonial | null>(null)
  const [importOpen, setImportOpen] = useState(false)
  const [askOpen, setAskOpen] = useState(false)
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [pinTestimonial, setPinTestimonial] = useState<PortalTestimonial | null>(null)

  // List view mode — "All" is the default; "Featured" renders a public-
  // preview rail (Item 36).
  const [view, setView] = useState<"all" | "featured">("all")

  // Bulk-active set + reject all flow.
  const [bulkRejectOpen, setBulkRejectOpen] = useState(false)

  // Counts for filter pills (always derived from the raw list so the
  // pill labels don't shift as the filter narrows).
  const pendingCount = testimonials.filter((t) => t.status === "pending").length
  const publishedCount = testimonials.filter((t) => !t.status || t.status === "published").length
  const featuredCount = testimonials.filter((t) => t.featured && (!t.status || t.status === "published")).length
  const rejectedCount = testimonials.filter((t) => t.status === "rejected").length
  const flaggedCount = testimonials.filter((t) => typeof t.spamScore === "number" && t.spamScore >= 25 && t.status !== "rejected").length

  // useListState — filters: status (pending/published/featured/rejected/flagged),
  // course (any course id), instructor (any user id), rating (any 1-5).
  const list = useListState({
    pageId: "portal-testimonials",
    items: testimonials,
    searchFields: (t) => [t.quote, t.authorName, t.authorRole ?? ""],
    filters: {
      status: {
        defaultValue: "all",
        match: (t, v) => {
          if (v === "all") return true
          if (v === "pending") return t.status === "pending"
          if (v === "published") return !t.status || t.status === "published"
          if (v === "featured") return !!t.featured && (!t.status || t.status === "published")
          if (v === "rejected") return t.status === "rejected"
          if (v === "flagged") return typeof t.spamScore === "number" && t.spamScore >= 25 && t.status !== "rejected"
          return true
        },
      },
      course: {
        defaultValue: "all",
        match: (t, v) => v === "all" || t.courseId === v,
      },
      instructor: {
        defaultValue: "all",
        match: (t, v) => v === "all" || t.aboutInstructorId === v,
      },
    },
    sorts: {
      newest: {
        label: "Newest",
        cmp: (a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""),
      },
      rating: {
        label: "Rating high → low",
        cmp: (a, b) => (b.rating ?? 0) - (a.rating ?? 0),
      },
      pendingFirst: {
        label: "Pending first",
        cmp: (a, b) => {
          const aP = a.status === "pending" ? 0 : 1
          const bP = b.status === "pending" ? 0 : 1
          if (aP !== bP) return aP - bP
          return (b.createdAt ?? "").localeCompare(a.createdAt ?? "")
        },
      },
    },
    defaultSort: "pendingFirst",
  })

  // Reorder so featured-with-published always sits ahead of plain
  // published when sorting by "newest" — small subjective tweak that
  // reflects how a teacher mentally browses.
  const rows = list.filtered

  // Distinct courses with at least one testimonial — drives the
  // "Course" filter options.
  const courseFilterOptions = useMemo(() => {
    const seen = new Set<string>()
    const out: Array<{ value: string; label: string; count: number }> = [
      { value: "all", label: "Any course", count: testimonials.length },
    ]
    for (const t of testimonials) {
      if (!t.courseId || seen.has(t.courseId)) continue
      seen.add(t.courseId)
      const c = courses.find((c) => c.id === t.courseId)
      out.push({
        value: t.courseId,
        label: c?.title ?? "(deleted course)",
        count: testimonials.filter((x) => x.courseId === t.courseId).length,
      })
    }
    return out
  }, [testimonials, courses])

  // Distinct instructors with at least one attributed testimonial.
  const instructorFilterOptions = useMemo(() => {
    const seen = new Set<string>()
    const out: Array<{ value: string; label: string; count: number }> = [
      { value: "all", label: "Any instructor", count: testimonials.length },
    ]
    for (const t of testimonials) {
      if (!t.aboutInstructorId || seen.has(t.aboutInstructorId)) continue
      seen.add(t.aboutInstructorId)
      const u = getUserById(t.aboutInstructorId)
      out.push({
        value: t.aboutInstructorId,
        label: u?.name ?? "(deleted user)",
        count: testimonials.filter((x) => x.aboutInstructorId === t.aboutInstructorId).length,
      })
    }
    return out
  }, [testimonials, getUserById])

  // Wall import (kept from original).
  const importedQuotes = new Set(
    testimonials.filter((t) => t.source === "wall").map((t) => t.quote),
  )
  const importable = wallEntries.filter(
    (e) => e.kind === "quote" && e.caption && !importedQuotes.has(e.caption.trim()),
  )

  // Item 41 — auto-import 4-5★ course reviews as pending testimonials.
  // We run this effect when the setting flips on and on store changes;
  // a Set of "source review ids" lives in localStorage so a teacher
  // rejecting an auto-imported quote doesn't see it return.
  const autoImportFiveStar = !!config?.testimonialAutoImportFiveStar
  const importedReviewKeysRef = useRef<Set<string>>(new Set())
  useEffect(() => {
    // Hydrate the reject-memory from localStorage so it survives
    // across sessions.
    try {
      const raw = window.localStorage.getItem(
        `thebigclass.t.${tenantSlug}.testimonials.importedReviewIds.v1`,
      )
      importedReviewKeysRef.current = new Set(
        raw ? (JSON.parse(raw) as string[]) : [],
      )
    } catch {
      importedReviewKeysRef.current = new Set()
    }
  }, [tenantSlug])

  useEffect(() => {
    if (!autoImportFiveStar) return
    if (!getReviewsForCourse) return
    // Walk every authored course and pull 4-5★ reviews not yet seen.
    const newly: PortalTestimonial[] = []
    for (const c of courses) {
      const reviews = getReviewsForCourse(c.id) ?? []
      for (const r of reviews) {
        if ((r.rating ?? 0) < 4) continue
        const key = `${c.id}:${r.id}`
        if (importedReviewKeysRef.current.has(key)) continue
        // Skip if a testimonial with the same body already exists.
        if (
          testimonials.some(
            (t) => t.quote.trim().toLowerCase() === (r.comment ?? "").trim().toLowerCase(),
          )
        ) {
          importedReviewKeysRef.current.add(key)
          continue
        }
        const student = getUserById(r.studentId)
        newly.push({
          id: generatePortalId("test"),
          authorName: student?.name ?? "Anonymous student",
          authorRole: undefined,
          avatar: student?.avatar,
          courseId: c.id,
          aboutInstructorId: c.instructor.id,
          rating: r.rating,
          quote: r.comment,
          featured: false,
          source: "manual",
          status: "pending",
          submittedByUserId: r.studentId,
          createdAt: new Date().toISOString(),
        })
        importedReviewKeysRef.current.add(key)
      }
    }
    if (newly.length === 0) return
    newly.forEach(upsertTestimonial)
    try {
      window.localStorage.setItem(
        `thebigclass.t.${tenantSlug}.testimonials.importedReviewIds.v1`,
        JSON.stringify(Array.from(importedReviewKeysRef.current)),
      )
    } catch {
      /* quota — ignore */
    }
    toast.success(`Auto-imported ${newly.length} 4-5★ ${newly.length === 1 ? "review" : "reviews"}`, {
      description: "Review them in the Pending tab.",
    })
    // We intentionally exclude `testimonials` from deps — the effect
    // runs on the courses/reviews change, not on every testimonial
    // mutation (which would cause an infinite loop).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoImportFiveStar, courses, getReviewsForCourse])

  // ───── Per-row helpers ────────────────────────────────────────────
  const publish = (t: PortalTestimonial) =>
    upsertTestimonial({
      ...t,
      status: "published",
      moderatedByUserId: currentUser?.id,
      moderatedAt: new Date().toISOString(),
    })
  const reject = (t: PortalTestimonial, reason: string) => {
    const next: PortalTestimonial = {
      ...t,
      status: "rejected",
      rejectionReason: reason || undefined,
      moderatedByUserId: currentUser?.id,
      moderatedAt: new Date().toISOString(),
    }
    upsertTestimonial(next)
    // Item 24 — undo toast for 10s.
    toast.success(`Rejected "${t.authorName}"`, {
      description: reason ? `Reason: ${reason}` : "Hidden from the public site.",
      action: {
        label: "Undo",
        onClick: () => {
          upsertTestimonial({
            ...t,
            status: t.status === "pending" ? "pending" : undefined,
            rejectionReason: undefined,
            moderatedByUserId: undefined,
            moderatedAt: undefined,
          })
        },
      },
      duration: 10_000,
    })
  }
  const toggleFeature = (t: PortalTestimonial) => {
    const next = { ...t, featured: !t.featured }
    upsertTestimonial(next)
    if (next.featured && featuredCount + 1 > FEATURED_SOFT_CAP) {
      toast.warning(`You now have ${featuredCount + 1} featured testimonials`, {
        description: "Most home pages show 3–6 — too many dilutes their impact. Demote some?",
      })
    }
  }

  // Bulk operations.
  const bulkPublish = () => {
    list.selectedIds.forEach((id) => {
      const t = testimonials.find((x) => x.id === id)
      if (t) publish(t)
    })
    toast.success(`Published ${list.selectedIds.size} testimonials.`)
    list.clearSelection()
  }
  const bulkFeature = () => {
    list.selectedIds.forEach((id) => {
      const t = testimonials.find((x) => x.id === id)
      if (t && !t.featured) upsertTestimonial({ ...t, featured: true })
    })
    toast.success(`Featured ${list.selectedIds.size} testimonials.`)
    list.clearSelection()
  }
  const bulkReject = (reason: string) => {
    list.selectedIds.forEach((id) => {
      const t = testimonials.find((x) => x.id === id)
      if (t) reject(t, reason)
    })
    list.clearSelection()
    setBulkRejectOpen(false)
  }
  const bulkDelete = () => {
    list.selectedIds.forEach((id) => deleteTestimonial(id))
    toast.success(`Deleted ${list.selectedIds.size} testimonials.`)
    list.clearSelection()
  }

  // Share-to-community is now handled by the CrossPosterDialog
  // mount below — multi-channel (LinkedIn / X / WhatsApp / email /
  // communities) instead of the old single-target dialog.

  // ───── Render ─────────────────────────────────────────────────────
  const featuredItems = useMemo(
    () =>
      testimonials
        .filter((t) => t.featured && (!t.status || t.status === "published"))
        .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? "")),
    [testimonials],
  )

  return (
    <div className="space-y-6">
      <ProductTour tourId="portal-testimonials-v2" steps={TESTIMONIALS_TOUR} />

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <Quote className="h-3.5 w-3.5" />
            Testimonials
          </div>
          <h1 className="mt-3 font-serif text-2xl font-bold tracking-tight">
            Student voices, sorted and ready
          </h1>
          <p className="text-muted-foreground">
            Pending submissions go up top. Featured testimonials surface on your home page and your
            public Wall of Love.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <TakeATourButton tourId="portal-testimonials-v2" />
          <Button variant="outline" asChild data-tour="testimonials-wall">
            <Link href={tenantSlug ? `/p/${tenantSlug}/wall` : "/wall"} target="_blank" rel="noopener noreferrer">
              <Heart className="mr-1.5 h-4 w-4" /> Wall of Love
            </Link>
          </Button>
          {importable.length > 0 && (
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              <Download className="mr-1.5 h-4 w-4" /> Import {importable.length} from Wall
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => setAskOpen(true)}
            data-tour="testimonials-ask"
            className="gap-1.5"
          >
            <Wand2 className="h-4 w-4" />
            Ask students
          </Button>
          <Button onClick={() => { setEditing(null); setEditorOpen(true) }}>
            <Plus className="mr-1.5 h-4 w-4" /> New testimonial
          </Button>
        </div>
      </div>

      {/* Pending banner — surfaces unreviewed count above the fold. */}
      {pendingCount > 0 && view === "all" && (
        <div
          role="status"
          className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-amber-500/40 bg-amber-500/5 px-4 py-3 text-[13px] text-amber-700 dark:text-amber-300"
        >
          <p>
            <span className="font-semibold">
              {pendingCount} {pendingCount === 1 ? "testimonial waits" : "testimonials wait"} for your review.
            </span>{" "}
            Approve and feature the best, reject the rest.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="border-amber-500/40 text-amber-700 hover:bg-amber-500/10"
            onClick={() => list.setFilter("status", "pending")}
          >
            Show pending
          </Button>
        </div>
      )}

      {/* Featured cap warning */}
      {featuredCount > FEATURED_SOFT_CAP && (
        <div
          role="status"
          className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-blue-500/40 bg-blue-500/5 px-4 py-3 text-[13px] text-blue-700 dark:text-blue-300"
        >
          <p>
            <span className="font-semibold">{featuredCount} featured</span> — most home pages show 3–6. Demote some?
          </p>
          <Button
            variant="outline"
            size="sm"
            className="border-blue-500/40 text-blue-700 hover:bg-blue-500/10"
            onClick={() => { setView("featured"); list.setFilter("status", "featured") }}
          >
            Review featured
          </Button>
        </div>
      )}

      {/* Auto-import setting */}
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
          <label className="flex flex-1 cursor-pointer items-start gap-3">
            <Checkbox
              checked={!!config?.testimonialAutoImportFiveStar}
              onCheckedChange={(v) =>
                updateConfig({
                  testimonialAutoImportFiveStar: !!v,
                })
              }
              className="mt-0.5"
            />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium">
                Auto-import 4-5 star course reviews as pending testimonials
              </span>
              <span className="block text-[11.5px] text-muted-foreground">
                Reviews you reject stay rejected — they won&rsquo;t reappear. Idempotent and safe to toggle off.
              </span>
            </span>
          </label>
        </CardContent>
      </Card>

      {/* View tabs */}
      <Tabs value={view} onValueChange={(v) => { setView(v as "all" | "featured"); list.clearSelection() }}>
        <TabsList>
          <TabsTrigger value="all">
            All
            <span className="ml-1.5 rounded-full bg-muted px-1.5 text-[10px] font-bold text-muted-foreground">
              {testimonials.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="featured" data-tour="testimonials-featured-tab">
            <Star className="mr-1.5 h-3.5 w-3.5" />
            Featured preview
            <span className="ml-1.5 rounded-full bg-amber-100 px-1.5 text-[10px] font-bold text-amber-700">
              {featuredCount}
            </span>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {view === "all" && testimonials.length > 0 && (
        <>
          <ListToolbar>
            <ListSearch
              value={list.search}
              onChange={list.setSearch}
              placeholder="Search quote, author, role — / to focus"
            />
            <ListFilterPopover
              label="Status"
              value={list.getFilter("status")}
              onChange={(v) => list.setFilter("status", v)}
              options={[
                { value: "all", label: "All", count: testimonials.length },
                { value: "pending", label: "Pending", count: pendingCount },
                { value: "published", label: "Published", count: publishedCount },
                { value: "featured", label: "Featured", count: featuredCount },
                { value: "rejected", label: "Rejected", count: rejectedCount },
                { value: "flagged", label: "Flagged as spam", count: flaggedCount },
              ]}
            />
            <ListFilterPopover
              label="Course"
              value={list.getFilter("course")}
              onChange={(v) => list.setFilter("course", v)}
              options={courseFilterOptions}
            />
            {instructorFilterOptions.length > 1 && (
              <ListFilterPopover
                label="Instructor"
                value={list.getFilter("instructor")}
                onChange={(v) => list.setFilter("instructor", v)}
                options={instructorFilterOptions}
              />
            )}
            <ListSort value={list.sort} onChange={list.setSort} options={list.sortOptions} />
          </ListToolbar>

          <div className="flex items-center justify-between">
            <ListCount visible={rows.length} total={testimonials.length} noun="testimonials" />
            {list.hasActiveFilters && <ListReset onClick={list.resetFilters} />}
          </div>

          <BulkActionBar
            selectedCount={list.selectedIds.size}
            totalCount={rows.length}
            onClear={list.clearSelection}
            actions={[
              { key: "publish", label: "Publish", onClick: bulkPublish },
              { key: "feature", label: "Feature", icon: <Star className="h-3.5 w-3.5" />, onClick: bulkFeature },
              { key: "reject", label: "Reject", icon: <XCircle className="h-3.5 w-3.5" />, destructive: true, onClick: () => setBulkRejectOpen(true) },
              { key: "delete", label: "Delete", icon: <Trash2 className="h-3.5 w-3.5" />, destructive: true, onClick: bulkDelete },
            ]}
          />
        </>
      )}

      {/* List body */}
      {view === "all" ? (
        testimonials.length === 0 ? (
          <EmptyState
            onCreate={() => { setEditing(null); setEditorOpen(true) }}
            onAsk={() => setAskOpen(true)}
            tenantSlug={tenantSlug}
          />
        ) : rows.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Quote className="h-8 w-8 text-muted-foreground" />
              <p className="mt-3 text-sm font-medium">No testimonials match your filters.</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={list.resetFilters}>
                Reset filters
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rows.map((t) => {
              const course = t.courseId ? courses.find((c) => c.id === t.courseId) : undefined
              const instructor = t.aboutInstructorId ? getUserById(t.aboutInstructorId) : undefined
              const checked = list.isSelected(t.id)
              const flagged = typeof t.spamScore === "number" && t.spamScore >= 25
              return (
                <Card key={t.id} className={cn(checked && "border-primary ring-1 ring-primary/30", flagged && "border-amber-500/50")}>
                  <CardContent className="space-y-3 p-5">
                    {/* Top bar — selection checkbox + status pills */}
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={checked}
                          onCheckedChange={() => list.toggleSelect(t.id)}
                          aria-label={`Select testimonial from ${t.authorName}`}
                        />
                        <Quote className="h-4 w-4 text-accent" />
                      </div>
                      <div className="flex flex-wrap items-center gap-1">
                        {t.source === "student-submission" && (
                          <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-secondary-foreground">
                            Submitted by student
                          </span>
                        )}
                        {t.status === "pending" && (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-900 dark:bg-amber-500/20 dark:text-amber-200">
                            Pending
                          </span>
                        )}
                        {t.status === "rejected" && (
                          <span className="rounded-full bg-destructive/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-destructive">
                            Rejected
                          </span>
                        )}
                        {t.featured && (
                          <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent">
                            Featured
                          </span>
                        )}
                        {flagged && (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                            Spam score {t.spamScore}
                          </span>
                        )}
                      </div>
                    </div>

                    <p className="text-sm">&ldquo;{t.quote}&rdquo;</p>

                    {t.mediaUrl && (
                      <div className="rounded-md border border-border/60 bg-muted/30 p-2">
                        {t.mediaKind === "image" ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={t.mediaUrl}
                            alt={`${t.authorName} photo or media`}
                            className="max-h-40 w-full rounded object-cover"
                            onError={(e) => {
                              ;(e.currentTarget as HTMLImageElement).style.display = "none"
                              ;(e.currentTarget.parentElement as HTMLDivElement | null)?.classList.add("border-destructive/40", "bg-destructive/5")
                            }}
                          />
                        ) : t.mediaKind === "video" ? (
                          <video src={t.mediaUrl} controls className="max-h-40 w-full rounded" />
                        ) : t.mediaKind === "audio" ? (
                          <audio src={t.mediaUrl} controls className="w-full" />
                        ) : (
                          <a
                            href={t.mediaUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs font-medium text-primary hover:underline"
                          >
                            Open attachment ({t.mediaFilename ?? "file"})
                          </a>
                        )}
                      </div>
                    )}

                    {typeof t.rating === "number" && t.rating > 0 && (
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <Star
                            key={i}
                            className={cn(
                              "h-3.5 w-3.5",
                              i <= (t.rating ?? 0) ? "fill-accent text-accent" : "text-muted-foreground/30",
                            )}
                            aria-hidden
                          />
                        ))}
                        <span className="sr-only">{t.rating} of 5 stars</span>
                      </div>
                    )}

                    {/* Context strip — course + instructor + spam reason */}
                    {(course || instructor || t.rejectionReason) && (
                      <div className="flex flex-wrap items-center gap-2 text-[11px]">
                        {course && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-1.5 py-0.5 font-medium text-muted-foreground">
                            <Quote className="h-2.5 w-2.5" />
                            {course.title}
                          </span>
                        )}
                        {instructor && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-1.5 py-0.5 font-medium text-muted-foreground">
                            About {instructor.name}
                          </span>
                        )}
                        {t.rejectionReason && (
                          <span className="text-destructive">Reason: {t.rejectionReason}</span>
                        )}
                      </div>
                    )}

                    {/* Author */}
                    <div className="flex items-center gap-3 border-t border-border pt-3">
                      {t.avatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={t.avatar}
                          alt={`${t.authorName} avatar`}
                          className="h-8 w-8 rounded-full object-cover"
                          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none" }}
                        />
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                          {t.authorName.split(" ").map((p) => p[0]).join("").slice(0, 2)}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{t.authorName}</p>
                        {t.authorRole && <p className="truncate text-xs text-muted-foreground">{t.authorRole}</p>}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      {t.status === "pending" ? (
                        <div className="flex items-center gap-1">
                          <Button size="sm" onClick={() => publish(t)}>
                            Publish
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setRejectingId(t.id)}
                          >
                            Reject
                          </Button>
                        </div>
                      ) : (
                        <Button variant="ghost" size="sm" onClick={() => toggleFeature(t)}>
                          {t.featured
                            ? <><StarOff className="mr-1 h-3.5 w-3.5" /> Unfeature</>
                            : <><Star className="mr-1 h-3.5 w-3.5" /> Feature</>}
                        </Button>
                      )}
                      <div className="flex items-center gap-1">
                        {/* Share-to-community */}
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Pin to a community"
                          disabled={studentGroups.length === 0}
                          onClick={() => setPinTestimonial(t)}
                        >
                          <Users2 className="h-3.5 w-3.5" />
                        </Button>
                        {/* Share as link / image */}
                        <ShareMenu
                          artifact={{
                            kind: "testimonial",
                            title: `Testimonial from ${t.authorName}`,
                            description: t.quote,
                            url:
                              typeof window !== "undefined" && tenantSlug
                                ? `${window.location.origin}/p/${tenantSlug}/wall`
                                : "/wall",
                            source: course?.title,
                          }}
                          hideEmbed
                          trigger={
                            <Button variant="ghost" size="sm" title="Share">
                              <Sparkles className="h-3.5 w-3.5" />
                            </Button>
                          }
                        />
                        <Button variant="ghost" size="sm" onClick={() => { setEditing(t); setEditorOpen(true) }}>
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => deleteTestimonial(t.id)}
                          aria-label={`Delete testimonial from ${t.authorName}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )
      ) : (
        // Featured preview tab — mirrors how the public testimonial
        // section renders on the home page.
        <FeaturedPreview items={featuredItems} onToggle={toggleFeature} />
      )}

      {/* Editor dialog */}
      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        {/* `key` forces a fresh mount when switching between
            "new" and any specific editing target, so the dialog's
            local form state (avatar URL, rating, etc.) starts from
            the right defaults instead of stale closure values. */}
        <TestimonialDialog
          key={editing?.id ?? "new"}
          editing={editing}
          onClose={() => setEditorOpen(false)}
          onSave={(t) => { upsertTestimonial(t); setEditorOpen(false) }}
        />
      </Dialog>

      {/* Reject dialog */}
      {rejectingId && (
        <TestimonialRejectDialog
          open={true}
          onOpenChange={(o) => !o && setRejectingId(null)}
          authorName={testimonials.find((t) => t.id === rejectingId)?.authorName ?? ""}
          quotePreview={testimonials.find((t) => t.id === rejectingId)?.quote ?? ""}
          onConfirm={(reason) => {
            const t = testimonials.find((x) => x.id === rejectingId)
            if (t) reject(t, reason)
            setRejectingId(null)
          }}
        />
      )}

      {/* Bulk reject dialog */}
      {bulkRejectOpen && (
        <TestimonialRejectDialog
          open={true}
          onOpenChange={(o) => !o && setBulkRejectOpen(false)}
          authorName={`${list.selectedIds.size} testimonials`}
          quotePreview={`This rejects all ${list.selectedIds.size} selected entries with the same reason.`}
          onConfirm={(reason) => bulkReject(reason)}
        />
      )}

      {/* Ask students */}
      <TestimonialAskDialog open={askOpen} onOpenChange={setAskOpen} />

      {/* Cross-poster — opens multi-channel for the picked
          testimonial. Quote goes in the body, author + course
          context lands in the caption preview. */}
      {pinTestimonial && (
        <CrossPosterDialog
          open={!!pinTestimonial}
          onOpenChange={(o) => !o && setPinTestimonial(null)}
          artifact={{
            kind: "testimonial",
            title: `Testimonial from ${pinTestimonial.authorName}`,
            description: `&ldquo;${pinTestimonial.quote.replace(/<[^>]+>/g, "").slice(0, 200)}${pinTestimonial.quote.length > 200 ? "…" : ""}&rdquo; — ${pinTestimonial.authorName}`,
            url:
              typeof window !== "undefined" && tenantSlug
                ? `${window.location.origin}/p/${tenantSlug}/wall`
                : "/wall",
            thumbnailUrl: pinTestimonial.avatar,
          }}
          defaultSelections={{
            communities: studentGroups[0]?.id ? [studentGroups[0].id] : [],
          }}
        />
      )}

      {/* Wall import dialog (kept) */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Import from Wall of Love</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 pt-2">
            {importable.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing new to import.</p>
            ) : (
              importable.map((e) => {
                const student = e.studentId ? getUserById(e.studentId) : undefined
                return (
                  <div
                    key={e.id}
                    className="flex items-start justify-between gap-3 rounded-md border border-border bg-card p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm">&ldquo;{e.caption}&rdquo;</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {student?.name ?? e.studentName ?? "Anonymous"}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => {
                        upsertTestimonial({
                          id: generatePortalId("test"),
                          authorName: student?.name ?? e.studentName ?? "Anonymous",
                          authorRole: undefined,
                          avatar: student?.avatar,
                          courseId: e.courseId,
                          quote: e.caption ?? "",
                          featured: false,
                          source: "wall",
                          createdAt: new Date().toISOString(),
                        })
                      }}
                    >
                      Import
                    </Button>
                  </div>
                )
              })
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ───── Empty state with template rows ──────────────────────────────

function EmptyState({
  onCreate,
  onAsk,
  tenantSlug,
}: {
  onCreate: () => void
  onAsk: () => void
  tenantSlug: string
}) {
  return (
    <Card>
      <CardContent className="space-y-6 py-12">
        <div className="text-center">
          <Quote className="mx-auto h-10 w-10 text-muted-foreground" />
          <h3 className="mt-3 text-lg font-semibold">No testimonials yet</h3>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            Visitors look for proof before they enrol. Five short quotes from past students
            usually beats five paragraphs of marketing copy.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <EmptyCard
            icon={<Wand2 className="h-4 w-4" />}
            title="Ask 5 past students"
            body="Send magic links — no sign-in needed. Replies land here for review."
            ctaLabel="Open wizard"
            onClick={onAsk}
          />
          <EmptyCard
            icon={<Plus className="h-4 w-4" />}
            title="Add one by hand"
            body="Paste a quote you already got over email or DM."
            ctaLabel="New testimonial"
            onClick={onCreate}
          />
          <EmptyCard
            icon={<Heart className="h-4 w-4" />}
            title="Public Wall of Love"
            body="Every published quote auto-flows into your Wall. Share that URL anywhere."
            ctaLabel="Visit wall"
            href={tenantSlug ? `/p/${tenantSlug}/wall` : "/wall"}
          />
        </div>
      </CardContent>
    </Card>
  )
}

function EmptyCard({
  icon,
  title,
  body,
  ctaLabel,
  onClick,
  href,
}: {
  icon: React.ReactNode
  title: string
  body: string
  ctaLabel: string
  onClick?: () => void
  href?: string
}) {
  const inner = (
    <div className="flex h-full flex-col items-start gap-1.5 rounded-xl border border-border bg-card p-4 text-left transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">
      <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </span>
      <span className="text-sm font-semibold">{title}</span>
      <span className="text-[11.5px] leading-relaxed text-muted-foreground">{body}</span>
      <span className="mt-auto text-[11px] font-semibold text-primary">
        {ctaLabel} →
      </span>
    </div>
  )
  return href ? (
    <Link href={href} target={href.startsWith("/") ? "_blank" : undefined} rel="noopener noreferrer">
      {inner}
    </Link>
  ) : (
    <button type="button" onClick={onClick} className="text-left">
      {inner}
    </button>
  )
}

// ───── Featured preview rail ───────────────────────────────────────

function FeaturedPreview({
  items,
  onToggle,
}: {
  items: PortalTestimonial[]
  onToggle: (t: PortalTestimonial) => void
}) {
  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Star className="h-10 w-10 text-muted-foreground" />
          <h3 className="mt-3 text-lg font-semibold">No featured testimonials</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Toggle the star on any published testimonial to feature it.
          </p>
        </CardContent>
      </Card>
    )
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">As students will see it</CardTitle>
        <CardDescription>
          This is the order featured testimonials render on your home page&rsquo;s testimonial section.
          Click the star to unfeature.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((t) => (
            <div
              key={t.id}
              className="relative rounded-xl border border-border bg-card p-5 shadow-sm"
            >
              <button
                type="button"
                onClick={() => onToggle(t)}
                aria-label="Unfeature this testimonial"
                className="absolute right-3 top-3 rounded-full bg-amber-100 p-1 text-amber-700 hover:bg-amber-200"
              >
                <Star className="h-3.5 w-3.5 fill-current" />
              </button>
              <p className="pr-8 text-sm leading-relaxed">&ldquo;{t.quote}&rdquo;</p>
              {typeof t.rating === "number" && t.rating > 0 && (
                <div className="mt-3 flex gap-0.5 text-amber-500">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star
                      key={i}
                      className={cn("h-3 w-3", i <= (t.rating ?? 0) ? "fill-current" : "opacity-30")}
                    />
                  ))}
                </div>
              )}
              <div className="mt-4 flex items-center gap-2 border-t border-border pt-3">
                {t.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={t.avatar} alt={`${t.authorName} avatar`} className="h-8 w-8 rounded-full object-cover" />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                    {t.authorName.split(" ").map((p) => p[0]).join("").slice(0, 2)}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate text-[12.5px] font-semibold">{t.authorName}</p>
                  {t.authorRole && (
                    <p className="truncate text-[11px] text-muted-foreground">{t.authorRole}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// ───── Editor dialog (with star input) ─────────────────────────────

function TestimonialDialog({
  editing,
  onClose,
  onSave,
}: {
  editing: PortalTestimonial | null
  onClose: () => void
  onSave: (t: PortalTestimonial) => void
}) {
  const [authorName, setAuthorName] = useState(editing?.authorName ?? "")
  const [authorRole, setAuthorRole] = useState(editing?.authorRole ?? "")
  const [quote, setQuote] = useState(editing?.quote ?? "")
  const [rating, setRating] = useState<number>(editing?.rating ?? 5)
  const [avatar, setAvatar] = useState(editing?.avatar ?? "")
  const { courses, users } = useLMS()
  const [courseId, setCourseId] = useState<string>(editing?.courseId ?? "")
  const [aboutInstructorId, setAboutInstructorId] = useState<string>(editing?.aboutInstructorId ?? "")

  const save = () => {
    if (!authorName.trim() || !quote.trim()) return
    onSave({
      id: editing?.id ?? generatePortalId("test"),
      authorName: authorName.trim(),
      authorRole: authorRole.trim() || undefined,
      avatar: avatar.trim() || undefined,
      quote: quote.trim(),
      rating: rating || undefined,
      courseId: courseId || undefined,
      aboutInstructorId: aboutInstructorId || undefined,
      featured: editing?.featured,
      source: editing?.source ?? "manual",
      status: editing?.status,
      createdAt: editing?.createdAt ?? new Date().toISOString(),
    })
  }

  return (
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <DialogTitle>{editing ? "Edit testimonial" : "New testimonial"}</DialogTitle>
      </DialogHeader>
      <div className="space-y-4 pt-2">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Author name *</Label>
            <Input value={authorName} onChange={(e) => setAuthorName(e.target.value)} placeholder="Priya S." />
          </div>
          <div className="space-y-2">
            <Label>Role</Label>
            <Input value={authorRole} onChange={(e) => setAuthorRole(e.target.value)} placeholder="Engineering student" />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Quote *</Label>
          <Textarea
            value={quote}
            onChange={(e) => setQuote(e.target.value)}
            rows={4}
            placeholder="The best practical course I've taken."
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Rating</Label>
            <StarRatingInput value={rating} onChange={setRating} />
          </div>
          <div className="space-y-2">
            <Label>About course</Label>
            <Select value={courseId || "_none"} onValueChange={(v) => setCourseId(v === "_none" ? "" : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Optional" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">No course</SelectItem>
                {courses.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-2">
          <Label>About instructor</Label>
          <Select value={aboutInstructorId || "_none"} onValueChange={(v) => setAboutInstructorId(v === "_none" ? "" : v)}>
            <SelectTrigger>
              <SelectValue placeholder="Optional — surfaces on their public profile" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_none">No specific instructor</SelectItem>
              {users
                .filter((u) => u.role === "instructor" || u.role === "admin")
                .map((u) => (
                  <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Avatar (optional)</Label>
          <FileUploadField
            value={avatar}
            onChange={setAvatar}
            accept="image/png,image/jpeg,image/webp"
            maxSizeMB={4}
            variant="compact"
            compress={{ maxDim: 300, quality: 0.85, mime: "image/jpeg" }}
          />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={save} disabled={!authorName.trim() || !quote.trim()}>
          {editing ? "Update" : "Add"}
        </Button>
      </DialogFooter>
    </DialogContent>
  )
}

// PinToCommunityDialog removed — replaced by CrossPosterDialog
// (multi-channel: communities + LinkedIn + X + WhatsApp + email).

