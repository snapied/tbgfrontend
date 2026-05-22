"use client"

// Reviews section for the public course page. Three jobs:
//   1. Aggregate score + a small 5-bar distribution chart at the top so
//      a visitor sees the overall sentiment without scrolling.
//   2. List the actual reviews (most recent first) with the reviewer's
//      name, star rating, and comment.
//   3. "Write a review" inline form for enrolled students — pre-filled
//      with the student's existing review if they've left one before.
//
// Renders nothing when there are zero reviews AND the visitor can't
// write one — keeps the public page from looking sparse on day one.

import { useMemo, useState } from "react"
import { Reply, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import {
  MAX_REVIEW_EDITS_PER_WINDOW,
  generateId,
  reviewEditWindow,
  useLMS,
  type Review,
} from "@/lib/lms-store"

interface Props {
  courseId: string
  // The student viewing the page, if any. When set + enrolled, the
  // "Write a review" form is enabled and pre-filled with their existing
  // review (if any).
  studentId?: string
  canReview?: boolean
}

export function CourseReviews({ courseId, studentId, canReview }: Props) {
  const { getReviewsForCourse, getReviewByStudent, getUserById, addReview } = useLMS()
  const reviews = useMemo(() => getReviewsForCourse(courseId), [getReviewsForCourse, courseId])
  const existing = studentId ? getReviewByStudent(courseId, studentId) : undefined

  const stats = useMemo(() => aggregate(reviews), [reviews])

  if (reviews.length === 0 && !(canReview && studentId)) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reviews</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {reviews.length > 0 && (
          <div className="grid gap-6 sm:grid-cols-[200px_1fr]">
            {/* Big number + star line on the left */}
            <div className="flex flex-col items-center justify-center rounded-md border border-border bg-card p-4 text-center">
              <p className="text-4xl font-bold tracking-tight">{stats.avg.toFixed(1)}</p>
              <StarRow value={stats.avg} className="mt-1.5 text-accent" />
              <p className="mt-1.5 text-xs text-muted-foreground">
                {reviews.length} {reviews.length === 1 ? "review" : "reviews"}
              </p>
            </div>
            {/* 5-bar histogram on the right — each row is clickable copy
                for skim-readability, not a filter (keep the surface
                simple for v1). */}
            <div className="space-y-1.5">
              {[5, 4, 3, 2, 1].map((star) => {
                const count = stats.byStar[star] ?? 0
                const pct = reviews.length > 0 ? Math.round((count / reviews.length) * 100) : 0
                return (
                  <div key={star} className="flex items-center gap-3 text-xs">
                    <span className="w-12 text-muted-foreground">
                      {star} star{star === 1 ? "" : "s"}
                    </span>
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-accent"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="w-10 text-right text-muted-foreground">{count}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {canReview && studentId && (
          <ReviewForm
            existing={existing}
            onSubmit={(rating, comment) => {
              addReview({
                id: existing?.id ?? generateId("rev"),
                courseId,
                studentId,
                rating,
                comment: comment.trim(),
                createdAt: new Date().toISOString(),
              })
            }}
          />
        )}

        {reviews.length > 0 && (
          <div className="space-y-3">
            {reviews.slice(0, 6).map((r) => {
              const author = getUserById(r.studentId)
              return (
                <div key={r.id} className="border-t border-border pt-3 first:border-t-0 first:pt-0">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                      {(author?.name ?? "?").split(" ").map((n) => n[0]).join("").slice(0, 2)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{author?.name ?? "Anonymous"}</p>
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                        <StarRow value={r.rating} className="text-accent" small />
                        <span>·</span>
                        <span>{new Date(r.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  {r.comment && (
                    <p className="mt-1.5 whitespace-pre-wrap text-sm text-muted-foreground">
                      {r.comment}
                    </p>
                  )}
                  {/* Instructor response — rendered inline below the
                      review so future readers see the back-and-forth at
                      a glance. Only shown when the teacher has actually
                      replied. */}
                  {r.teacherReply && (
                    <div className="mt-2 rounded-md border border-primary/20 bg-primary/[0.04] p-3">
                      <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-primary">
                        <Reply className="h-3 w-3" />
                        Response from the instructor
                        {r.teacherReplyAt && (
                          <span className="font-normal normal-case text-muted-foreground">
                            · {new Date(r.teacherReplyAt).toLocaleDateString()}
                          </span>
                        )}
                      </p>
                      <p className="mt-1 whitespace-pre-wrap text-sm">
                        {r.teacherReply}
                      </p>
                    </div>
                  )}
                </div>
              )
            })}
            {reviews.length > 6 && (
              <p className="pt-2 text-center text-xs text-muted-foreground">
                Showing 6 of {reviews.length}. Older reviews will be paginated when there are enough.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ============================================================
// Helpers
// ============================================================

function aggregate(reviews: Review[]) {
  if (reviews.length === 0) return { avg: 0, byStar: {} as Record<number, number> }
  const byStar: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  let total = 0
  for (const r of reviews) {
    const rounded = Math.max(1, Math.min(5, Math.round(r.rating)))
    byStar[rounded] = (byStar[rounded] ?? 0) + 1
    total += r.rating
  }
  return { avg: total / reviews.length, byStar }
}

function StarRow({
  value,
  className,
  small,
}: {
  value: number
  className?: string
  small?: boolean
}) {
  const filled = Math.round(value)
  const size = small ? "h-3 w-3" : "h-4 w-4"
  return (
    <div className={cn("inline-flex items-center gap-0.5", className)}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={cn(size, i <= filled ? "fill-current" : "text-muted-foreground/30")}
        />
      ))}
    </div>
  )
}

function ReviewForm({
  existing,
  onSubmit,
}: {
  existing?: Review
  onSubmit: (rating: number, comment: string) => void
}) {
  const [rating, setRating] = useState<number>(existing?.rating ?? 5)
  const [hoverRating, setHoverRating] = useState<number | null>(null)
  const [comment, setComment] = useState<string>(existing?.comment ?? "")
  const [submitted, setSubmitted] = useState(false)
  // No need for a countdown tick — lock is permanent, no unlock timer.

  // Lifetime cap: editsLeft comes from editCount, not a rolling window.
  const { editsLeft } = reviewEditWindow(existing)
  const locked = !!existing && editsLeft === 0

  const submit = () => {
    if (!rating || locked) return
    onSubmit(rating, comment)
    setSubmitted(true)
    setTimeout(() => setSubmitted(false), 2500)
  }

  return (
    <div className="rounded-md border border-border bg-card p-4">
      <p className="text-sm font-semibold">
        {existing ? "Update your review" : "Write a review"}
      </p>
      <p className="mt-0.5 text-xs text-muted-foreground">
        Help others decide. Your name and rating will be public.
      </p>
      <div className="mt-3 flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((i) => {
          const active = (hoverRating ?? rating) >= i
          return (
            <button
              key={i}
              type="button"
              disabled={locked}
              onMouseEnter={() => setHoverRating(i)}
              onMouseLeave={() => setHoverRating(null)}
              onClick={() => setRating(i)}
              aria-label={`Rate ${i} star${i === 1 ? "" : "s"}`}
              className="p-0.5 disabled:cursor-not-allowed"
            >
              <Star
                className={cn(
                  "h-6 w-6 transition",
                  active ? "fill-accent text-accent" : "text-muted-foreground/40",
                )}
              />
            </button>
          )
        })}
        <span className="ml-2 text-xs text-muted-foreground">{rating}/5</span>
      </div>
      <Textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="What did you like? What could be better?"
        rows={3}
        className="mt-3"
        disabled={locked}
      />
      <div className="mt-3 flex items-center justify-between gap-3">
        {locked ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-destructive">
            <span className="inline-block h-2 w-2 rounded-full bg-destructive" />
            Review is permanently locked — 3&#47;3 edits used.
          </span>
        ) : submitted ? (
          <span className="text-xs font-medium text-success">Thanks — your review is saved.</span>
        ) : (
          <span className="text-xs text-muted-foreground">
            {existing
              ? `${editsLeft} of ${MAX_REVIEW_EDITS_PER_WINDOW} edit${editsLeft === 1 ? "" : "s"} remaining — locked permanently after.`
              : `You can update this later — up to ${MAX_REVIEW_EDITS_PER_WINDOW} edits total.`}
          </span>
        )}
        <Button size="sm" onClick={submit} disabled={!rating || locked}>
          {existing ? "Update review" : "Submit review"}
        </Button>
      </div>
    </div>
  )
}

