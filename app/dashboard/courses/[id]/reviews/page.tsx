"use client"

// Instructor-facing reviews dashboard. Three filter tabs across one list:
//   • Active   — published reviews (the public list)
//   • Needs reply — published reviews the teacher hasn't replied to yet
//   • Spam      — reviews the teacher has flagged; kept for audit but
//                 hidden from the public list and rating aggregate.
//
// Per row the teacher can: inline reply (post / update / clear),
// mark / unmark as spam, or hard-delete with a confirm.

import { use, useMemo, useState } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  CheckCircle2,
  Reply,
  Search,
  Shield,
  ShieldAlert,
  ShieldOff,
  Star,
  Trash2,
  X,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import { useLMS, type Review } from "@/lib/lms-store"
import { useConfirm } from "@/lib/use-confirm"
import { toast } from "sonner"
import { toastUndoableDelete } from "@/lib/toast-undo"

type Filter = "active" | "needs-reply" | "spam"

export default function ManageReviewsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const {
    getCourseById,
    getReviewsForCourse,
    getUserById,
    replyToReview,
    markReviewSpam,
    deleteReview,
  } = useLMS()
  const confirm = useConfirm()
  const course = getCourseById(id)
  // includeSpam: true so we can show the Spam tab too.
  const allReviews = useMemo(() => getReviewsForCourse(id, true), [getReviewsForCourse, id])

  const counts = useMemo(() => {
    const active = allReviews.filter((r) => !r.isSpam)
    return {
      active: active.length,
      needsReply: active.filter((r) => !r.teacherReply).length,
      spam: allReviews.filter((r) => r.isSpam).length,
    }
  }, [allReviews])

  const [filter, setFilter] = useState<Filter>("active")
  const [search, setSearch] = useState("")
  const [ratingFilter, setRatingFilter] = useState<"all" | "1" | "2" | "3" | "4" | "5">("all")
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "highest" | "lowest">("newest")
  const visible = useMemo(() => {
    let pool =
      filter === "spam"
        ? allReviews.filter((r) => r.isSpam)
        : filter === "needs-reply"
          ? allReviews.filter((r) => !r.isSpam && !r.teacherReply)
          : allReviews.filter((r) => !r.isSpam)
    if (ratingFilter !== "all") {
      const wanted = Number(ratingFilter)
      pool = pool.filter((r) => Math.round(r.rating) === wanted)
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      pool = pool.filter(
        (r) =>
          (r.comment ?? "").toLowerCase().includes(q) ||
          (r.teacherReply ?? "").toLowerCase().includes(q),
      )
    }
    pool = [...pool]
    switch (sortBy) {
      case "newest": pool.sort((a, b) => b.createdAt.localeCompare(a.createdAt)); break
      case "oldest": pool.sort((a, b) => a.createdAt.localeCompare(b.createdAt)); break
      case "highest": pool.sort((a, b) => b.rating - a.rating); break
      case "lowest": pool.sort((a, b) => a.rating - b.rating); break
    }
    return pool
  }, [allReviews, filter, ratingFilter, sortBy, search])

  if (!course) {
    return (
      <div className="space-y-4">
        <Button asChild variant="ghost" size="sm">
          <Link href="/dashboard/courses">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Link>
        </Button>
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            Course not found.
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/dashboard/courses/${course.id}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to course
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Reviews</h1>
        <p className="text-sm text-muted-foreground">
          Reply to feedback on <span className="font-medium text-foreground">{course.title}</span> or mark spam to hide it from the public page.
        </p>
      </div>

      {/* Aggregate strip — average + counts so the teacher sees the
          health of feedback at a glance before triaging. */}
      <div className="grid gap-3 sm:grid-cols-4">
        <SummaryCard
          label="Average rating"
          value={course.rating ? `${course.rating.toFixed(1)} ★` : "—"}
          tone="accent"
        />
        <SummaryCard label="Active reviews" value={counts.active.toString()} />
        <SummaryCard
          label="Needs reply"
          value={counts.needsReply.toString()}
          tone={counts.needsReply > 0 ? "warn" : undefined}
        />
        <SummaryCard
          label="Marked spam"
          value={counts.spam.toString()}
          tone={counts.spam > 0 ? "destructive" : undefined}
        />
      </div>

      <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="active">
            Active
            <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-normal text-muted-foreground">
              {counts.active}
            </span>
          </TabsTrigger>
          <TabsTrigger value="needs-reply">
            Needs reply
            <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-normal text-muted-foreground">
              {counts.needsReply}
            </span>
          </TabsTrigger>
          <TabsTrigger value="spam">
            Spam
            <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-normal text-muted-foreground">
              {counts.spam}
            </span>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <Card>
        <CardContent className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search comments + replies…"
              className="pl-9 pr-9"
              aria-label="Search reviews"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <Select value={ratingFilter} onValueChange={(v) => setRatingFilter(v as typeof ratingFilter)}>
            <SelectTrigger className="w-full sm:w-36" aria-label="Filter by rating">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All ratings</SelectItem>
              <SelectItem value="5">5 stars</SelectItem>
              <SelectItem value="4">4 stars</SelectItem>
              <SelectItem value="3">3 stars</SelectItem>
              <SelectItem value="2">2 stars</SelectItem>
              <SelectItem value="1">1 star</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
            <SelectTrigger className="w-full sm:w-40" aria-label="Sort reviews">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest first</SelectItem>
              <SelectItem value="oldest">Oldest first</SelectItem>
              <SelectItem value="highest">Highest rated</SelectItem>
              <SelectItem value="lowest">Lowest rated</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {visible.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm text-muted-foreground">
              {filter === "spam"
                ? "Nothing flagged as spam. Use the shield button on a review to mark it."
                : filter === "needs-reply"
                  ? "All caught up — every active review has a reply."
                  : "No reviews yet. They'll appear here as students post them."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {visible.map((review) => {
            const author = getUserById(review.studentId)
            return (
              <ReviewRow
                key={review.id}
                review={review}
                authorName={author?.name ?? "Anonymous"}
                onReply={(reply) => replyToReview(review.id, reply)}
                onToggleSpam={() => markReviewSpam(review.id, !review.isSpam)}
                onDelete={async () => {
                  const ok = await confirm({
                    title: "Delete this review?",
                    description: "Moved to Trash — you can restore it within 7 days.",
                    destructive: true,
                  })
                  if (!ok) return
                  deleteReview(review.id)
                  toastUndoableDelete({
                    kind: "review",
                    ids: review.id,
                    label: `Review (${review.rating}★)`,
                    itemNoun: "review",
                  })
                }}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}

// ============================================================
// Pieces
// ============================================================

function ReviewRow({
  review,
  authorName,
  onReply,
  onToggleSpam,
  onDelete,
}: {
  review: Review
  authorName: string
  onReply: (reply: string) => void
  onToggleSpam: () => void
  onDelete: () => void
}) {
  const [draft, setDraft] = useState<string>(review.teacherReply ?? "")
  const [editing, setEditing] = useState<boolean>(!review.teacherReply)
  const [justSaved, setJustSaved] = useState(false)

  const submit = () => {
    onReply(draft)
    setEditing(false)
    setJustSaved(true)
    setTimeout(() => setJustSaved(false), 1800)
  }

  return (
    <Card
      className={cn(
        review.isSpam && "border-destructive/30 bg-destructive/[0.04]",
      )}
    >
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
              {authorName.split(" ").map((n) => n[0]).join("").slice(0, 2)}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium">{authorName}</p>
              <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                <StarRow value={review.rating} />
                <span>·</span>
                <span>{new Date(review.createdAt).toLocaleDateString()}</span>
                {review.isSpam && (
                  <>
                    <span>·</span>
                    <span className="inline-flex items-center gap-0.5 font-medium text-destructive">
                      <ShieldAlert className="h-3 w-3" />
                      Flagged spam
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onToggleSpam}
              className={cn(review.isSpam ? "text-success hover:text-success" : "text-muted-foreground")}
              title={review.isSpam ? "Unmark as spam — re-publish" : "Mark as spam — hide from the public page"}
            >
              {review.isSpam ? (
                <>
                  <ShieldOff className="mr-1 h-3.5 w-3.5" />
                  Not spam
                </>
              ) : (
                <>
                  <Shield className="mr-1 h-3.5 w-3.5" />
                  Spam
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onDelete}
              className="text-destructive hover:text-destructive"
              title="Delete permanently"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {review.comment && (
          <p className="whitespace-pre-wrap rounded-md border border-border bg-background p-3 text-sm">
            {review.comment}
          </p>
        )}

        {/* Reply panel — collapsed to a one-line summary when a reply
            already exists; expands to an editable Textarea on click. */}
        {!editing ? (
          <div className="rounded-md border border-primary/20 bg-primary/[0.04] p-3">
            <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-primary">
              <Reply className="h-3 w-3" />
              Your reply
              {review.teacherReplyAt && (
                <span className="font-normal normal-case text-muted-foreground">
                  · {new Date(review.teacherReplyAt).toLocaleDateString()}
                </span>
              )}
            </p>
            <p className="mt-1 whitespace-pre-wrap text-sm">{review.teacherReply}</p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setEditing(true)}
              className="mt-2 h-7 px-2 text-[11px] text-primary hover:text-primary"
            >
              Edit reply
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <label className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              <Reply className="h-3 w-3" />
              {review.teacherReply ? "Update your reply" : "Reply publicly"}
            </label>
            <Textarea
              value={draft}
                onChange={(e) => setDraft(e.target.value.slice(0, 1000))}
              rows={3}
                maxLength={1000}
              placeholder="Thanks for the feedback! Here's what we're doing about it…"
            />
              <p className="text-[11px] text-muted-foreground">{draft.length}/1000</p>
            <div className="flex items-center justify-between">
              {justSaved ? (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-success">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Saved
                </span>
              ) : (
                <span className="text-[11px] text-muted-foreground">
                  Shown publicly under the review. Leave blank to remove your reply.
                </span>
              )}
              <div className="flex gap-2">
                {review.teacherReply && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => { setDraft(review.teacherReply ?? ""); setEditing(false) }}
                  >
                    Cancel
                  </Button>
                )}
                <Button type="button" size="sm" onClick={submit}>
                  {review.teacherReply ? "Update reply" : "Post reply"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone?: "accent" | "warn" | "destructive"
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
        <p
          className={cn(
            "mt-1 text-2xl font-semibold",
            tone === "accent" && "text-accent-foreground",
            tone === "warn" && "text-amber-600 dark:text-amber-400",
            tone === "destructive" && "text-destructive",
          )}
        >
          {value}
        </p>
      </CardContent>
    </Card>
  )
}

function StarRow({ value }: { value: number }) {
  const filled = Math.round(value)
  return (
    <span className="inline-flex items-center gap-0.5 text-accent">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={cn("h-3 w-3", i <= filled ? "fill-current" : "text-muted-foreground/30")}
        />
      ))}
    </span>
  )
}

