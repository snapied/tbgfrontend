"use client"

// Student Feedback Popup — shown after class completion. Collects a
// star rating, positive/improvement tag selections, optional comment,
// and anonymity preference, then submits via the feedback API client.

import { useState, useCallback } from "react"
import { Star, MessageSquare, Shield } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import {
  submitFeedback,
  skipFeedback,
} from "@/lib/feedback-client"

// ── Constants ───────────────────────────────────────────────────

// Values must be lowercase to match backend validation (feedback.ts).
// Display labels are derived via capitalize().
const POSITIVE_TAGS: string[] = ["helpful", "clear", "engaging", "punctual", "well-prepared"]
const IMPROVEMENT_TAGS: string[] = ["pacing", "clarity", "preparation", "interaction"]

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

// ── Props ───────────────────────────────────────────────────────

interface FeedbackPopupProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  classTitle: string
  classDate: string
  teacherName: string
  courseId: string
  classId: string
  teacherId: string
  onSubmitted?: () => void
}

// ── Component ───────────────────────────────────────────────────

export function FeedbackPopup({
  open,
  onOpenChange,
  classTitle,
  classDate,
  teacherName,
  courseId,
  classId,
  teacherId,
  onSubmitted,
}: FeedbackPopupProps) {
  const [rating, setRating] = useState(0)
  const [hoveredStar, setHoveredStar] = useState(0)
  const [selectedPositive, setSelectedPositive] = useState<string[]>([])
  const [selectedImprovement, setSelectedImprovement] = useState<string[]>([])
  const [comment, setComment] = useState("")
  const [shareIdentity, setShareIdentity] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const resetForm = useCallback(() => {
    setRating(0)
    setHoveredStar(0)
    setSelectedPositive([])
    setSelectedImprovement([])
    setComment("")
    setShareIdentity(false)
    setError(null)
  }, [])

  function togglePositiveTag(tag: string) {
    setSelectedPositive((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    )
  }

  function toggleImprovementTag(tag: string) {
    setSelectedImprovement((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    )
  }

  async function handleSubmit() {
    if (rating === 0) {
      setError("Please select a rating before submitting.")
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await submitFeedback({
        class_id: classId,
        course_id: courseId,
        teacher_id: Number(teacherId),
        class_title: classTitle,
        class_date: classDate,
        rating,
        positive_tags: selectedPositive,
        improvement_tags: selectedImprovement,
        comment: comment.trim() || undefined,
        anonymous: !shareIdentity,
      })
      resetForm()
      onOpenChange(false)
      onSubmitted?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit feedback.")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleSkipOrRemind(action: "skip" | "remind") {
    try {
      await skipFeedback({ class_id: classId, course_id: courseId, action })
    } catch {
      // Silently ignore skip/remind errors — not critical
    }
    resetForm()
    onOpenChange(false)
  }

  const formattedDate = (() => {
    try {
      return new Date(classDate).toLocaleDateString("en-IN", {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    } catch {
      return classDate
    }
  })()

  const displayedStars = hoveredStar || rating

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            How was your class?
          </DialogTitle>
          <DialogDescription>
            <span className="font-medium text-foreground">{classTitle}</span>
            <br />
            {formattedDate} &middot; {teacherName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Star Rating */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Rating</Label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  className="rounded-sm p-0.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onMouseEnter={() => setHoveredStar(star)}
                  onMouseLeave={() => setHoveredStar(0)}
                  onClick={() => setRating(star)}
                  aria-label={`Rate ${star} star${star > 1 ? "s" : ""}`}
                >
                  <Star
                    className={`h-7 w-7 transition-colors ${
                      star <= displayedStars
                        ? "fill-amber-400 text-amber-400"
                        : "text-muted-foreground/40"
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Positive Tags */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">What went well?</Label>
            <div className="flex flex-wrap gap-2">
              {POSITIVE_TAGS.map((tag) => {
                const active = selectedPositive.includes(tag)
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => togglePositiveTag(tag)}
                    className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                      active
                        ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                        : "border-border bg-background text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {capitalize(tag)}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Improvement Tags */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Areas for improvement</Label>
            <div className="flex flex-wrap gap-2">
              {IMPROVEMENT_TAGS.map((tag) => {
                const active = selectedImprovement.includes(tag)
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleImprovementTag(tag)}
                    className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                      active
                        ? "border-orange-500 bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300"
                        : "border-border bg-background text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {capitalize(tag)}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Comment */}
          <div className="space-y-2">
            <Label htmlFor="feedback-comment" className="text-sm font-medium">
              Comments (optional)
            </Label>
            <Textarea
              id="feedback-comment"
              placeholder="Any additional thoughts..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              maxLength={1000}
            />
          </div>

          {/* Anonymity */}
          <div className="flex items-start gap-2">
            <Checkbox
              id="share-identity"
              checked={shareIdentity}
              onCheckedChange={(checked) => setShareIdentity(checked === true)}
            />
            <Label htmlFor="share-identity" className="text-sm leading-tight cursor-pointer">
              Share my name with the teacher
            </Label>
          </div>

          {/* Privacy Note */}
          <div className="flex items-start gap-2 rounded-md bg-muted/50 px-3 py-2">
            <Shield className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">
              Your feedback is confidential. Comments are reviewed before being shared.
            </p>
          </div>

          {/* Error */}
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleSkipOrRemind("skip")}
            disabled={submitting}
          >
            Skip
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleSkipOrRemind("remind")}
            disabled={submitting}
          >
            Remind me later
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={submitting || rating === 0}
          >
            {submitting ? "Submitting..." : "Submit"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
