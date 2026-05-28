"use client"

// Teacher Feedback Dashboard — shows the teacher's controlled view
// of student feedback. Reads from the feedback API with graceful
// fallback to empty state when the backend is unavailable.

import { useState, useEffect, useCallback } from "react"
import {
  Star,
  TrendingUp,
  MessageSquare,
  Shield,
  BookOpen,
  ThumbsUp,
  AlertCircle,
  Wallet,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  CheckCircle,
} from "lucide-react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { useLMS } from "@/lib/lms-store"
import {
  getTeacherFeedback,
  type TeacherFeedbackSummary,
} from "@/lib/feedback-client"

// ── Helpers ─────────────────────────────────────────────────────

function renderStars(rating: number, size = "h-4 w-4") {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`${size} ${
            star <= Math.round(rating)
              ? "fill-amber-400 text-amber-400"
              : "text-muted-foreground/30"
          }`}
        />
      ))}
    </div>
  )
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  } catch {
    return dateStr
  }
}

// ── Main Page Component ─────────────────────────────────────────

export default function MyFeedbackPage() {
  const { currentUser } = useLMS()
  const [feedback, setFeedback] = useState<TeacherFeedbackSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [commentsExpanded, setCommentsExpanded] = useState(false)
  const [acknowledgedNotes, setAcknowledgedNotes] = useState<Set<string>>(new Set())

  const fetchFeedback = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getTeacherFeedback()
      setFeedback(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load feedback.")
      setFeedback(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchFeedback()
  }, [fetchFeedback])

  function handleAcknowledge(noteId: string) {
    setAcknowledgedNotes((prev) => new Set(prev).add(noteId))
  }

  if (!currentUser) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">Sign in to view your feedback.</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-serif text-2xl font-bold tracking-tight">My Feedback</h1>
          <p className="text-muted-foreground">Student feedback insights for your classes.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="py-6">
                <div className="h-16 animate-pulse rounded bg-muted" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  // ── Empty State ───────────────────────────────────────────────
  if (error || !feedback || feedback.total_responses === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-serif text-2xl font-bold tracking-tight">My Feedback</h1>
          <p className="text-muted-foreground">Student feedback insights for your classes.</p>
        </div>
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <Wallet className="mx-auto h-10 w-10 text-muted-foreground/50" />
            <h2 className="mt-3 font-semibold">No student feedback has been submitted yet.</h2>
            <p className="mt-1 max-w-md mx-auto text-sm text-muted-foreground">
              Once students provide ratings after classes, your feedback insights will appear here.
            </p>
            <a
              href="/support/feedback-guide"
              className="mt-4 inline-flex items-center gap-1 text-sm text-primary hover:underline"
            >
              Learn how feedback works
              <ExternalLink className="h-3 w-3" />
            </a>
          </CardContent>
        </Card>
      </div>
    )
  }

  const overallRating = feedback.avg_rating
  const totalResponses = feedback.total_responses
  const responseRate = feedback.response_rate
  const lastClassRating = feedback.last_class_rating?.rating ?? null
  const lastClassTitle = feedback.last_class_rating?.class_title ?? null
  const positiveTags = Object.entries(feedback.positive_tags).map(([tag, count]) => ({ tag, count }))
  const improvementTags = Object.entries(feedback.improvement_tags).map(([tag, count]) => ({ tag, count }))
  const publishedComments = feedback.published_comments
  const coachingNotes = feedback.coaching_notes

  const hasEnoughData = feedback.has_enough_data
  const showImprovementTags =
    totalResponses >= 10 &&
    improvementTags.some((t) => t.count >= 3)

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="font-serif text-2xl font-bold tracking-tight">My Feedback</h1>
        <p className="text-muted-foreground">Student feedback insights for your classes.</p>
      </div>

      {/* Section 1 — Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Overall Rating */}
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <Star className="h-4 w-4" />
              Overall Rating
            </CardDescription>
          </CardHeader>
          <CardContent>
            {hasEnoughData && overallRating !== null ? (
              <div className="space-y-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold">{overallRating.toFixed(1)}</span>
                  <span className="text-sm text-muted-foreground">/ 5</span>
                </div>
                {renderStars(overallRating)}
                <p className="text-xs text-muted-foreground">{totalResponses} responses</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Not enough data</p>
            )}
          </CardContent>
        </Card>

        {/* Last Class Rating */}
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <BookOpen className="h-4 w-4" />
              Last Class Rating
            </CardDescription>
          </CardHeader>
          <CardContent>
            {lastClassRating !== null ? (
              <div className="space-y-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold">{lastClassRating.toFixed(1)}</span>
                  <span className="text-sm text-muted-foreground">/ 5</span>
                </div>
                {renderStars(lastClassRating)}
                {lastClassTitle && (
                  <p className="text-xs text-muted-foreground truncate" title={lastClassTitle}>
                    {lastClassTitle}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No class data</p>
            )}
          </CardContent>
        </Card>

        {/* Response Rate */}
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4" />
              Response Rate
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <span className="text-2xl font-bold">{Math.round(responseRate)}%</span>
              <Progress value={responseRate} className="h-2" />
            </div>
          </CardContent>
        </Card>

        {/* Total Responses */}
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <MessageSquare className="h-4 w-4" />
              Total Responses
            </CardDescription>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold">{totalResponses}</span>
          </CardContent>
        </Card>
      </div>

      {/* Section 2 — Your Strengths */}
      {positiveTags.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <ThumbsUp className="h-5 w-5 text-emerald-500" />
              Your Strengths
            </CardTitle>
            <CardDescription>What students appreciate most about your classes.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {positiveTags.map((tag: { tag: string; count: number }) => (
                <Badge
                  key={tag.tag}
                  variant="secondary"
                  className="border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                >
                  {tag.tag} ({tag.count})
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Section 3 — Areas to Grow */}
      {showImprovementTags && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="h-5 w-5 text-orange-500" />
              Areas to Grow
            </CardTitle>
            <CardDescription>
              Suggestions from students based on recurring feedback themes.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {improvementTags
                .filter((t: { tag: string; count: number }) => t.count >= 3)
                .map((tag: { tag: string; count: number }) => (
                  <Badge
                    key={tag.tag}
                    variant="outline"
                    className="border-muted-foreground/30 text-muted-foreground"
                  >
                    {tag.tag} ({tag.count})
                  </Badge>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Section 4 — Published Comments */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <MessageSquare className="h-5 w-5 text-primary" />
                Published Comments
              </CardTitle>
              <CardDescription>
                Comments reviewed and shared by your academy admin.
              </CardDescription>
            </div>
            {publishedComments.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCommentsExpanded((prev) => !prev)}
              >
                {commentsExpanded ? (
                  <>
                    Collapse <ChevronUp className="ml-1 h-4 w-4" />
                  </>
                ) : (
                  <>
                    Expand <ChevronDown className="ml-1 h-4 w-4" />
                  </>
                )}
              </Button>
            )}
          </div>
        </CardHeader>
        {commentsExpanded && (
          <CardContent>
            {publishedComments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No published comments yet.</p>
            ) : (
              <div className="space-y-4">
                {publishedComments.map((c: TeacherFeedbackSummary["published_comments"][number]) => (
                  <div
                    key={c.id}
                    className="rounded-lg border bg-muted/30 p-4 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{formatDate(c.created_at)}</span>
                        <span>&middot;</span>
                        <span>{c.course_id}</span>
                      </div>
                      {renderStars(c.rating, "h-3.5 w-3.5")}
                    </div>
                    <p className="text-sm">{c.comment}</p>
                    <p className="text-xs text-muted-foreground">
                      {c.student_name || "Anonymous student"}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        )}
        {!commentsExpanded && publishedComments.length === 0 && (
          <CardContent>
            <p className="text-sm text-muted-foreground">No published comments yet.</p>
          </CardContent>
        )}
      </Card>

      {/* Section 5 — Admin Insights / Coaching Notes */}
      {coachingNotes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <AlertCircle className="h-5 w-5 text-blue-500" />
              Admin Insights
            </CardTitle>
            <CardDescription>Notes from your academy based on feedback trends.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {coachingNotes.map((note: TeacherFeedbackSummary["coaching_notes"][number]) => (
                <div
                  key={note.id}
                  className="rounded-lg border border-blue-200 bg-blue-50/50 p-4 dark:border-blue-900 dark:bg-blue-950/30"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-blue-600 dark:text-blue-400">
                        Note from your academy
                      </p>
                      <p className="text-sm">{note.note}</p>
                      <p className="text-xs text-muted-foreground">
                        {note.course_id} &middot; {formatDate(note.created_at)}
                      </p>
                    </div>
                    {!note.acknowledged && !acknowledgedNotes.has(String(note.id)) ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="shrink-0"
                        onClick={() => handleAcknowledge(String(note.id))}
                      >
                        Acknowledge
                      </Button>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 shrink-0">
                        <CheckCircle className="h-3.5 w-3.5" />
                        Acknowledged
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Section 6 — Privacy Note */}
      <Card className="border-muted bg-muted/20">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <Shield className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">
                Student feedback is confidential. Comments are reviewed by your academy admin
                before being shared here.
              </p>
              <a
                href="/support/feedback-visibility"
                className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
              >
                How feedback visibility works
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
