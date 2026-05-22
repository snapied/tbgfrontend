"use client"

// Visitor comments on a public blog post.
//
// Public-side behaviours:
//
//   - Name + email pre-fill from `localStorage` after the visitor's
//     first successful submit. Reduces the friction of leaving a
//     second or third comment on any post on any tenant.
//   - Rate limit: max 3 comments per email per post per calendar
//     day. The cap reads + writes through `lib/blog-visitor` so
//     reactions, identity, and rate limits all share one source of
//     truth.
//
// Admin-side behaviours:
//
//   - Every successful submit dispatches an in-app + email
//     notification to the post's author so they actually see new
//     comments arrive — comments were previously silently appended
//     to the post with no surface anywhere in the dashboard.
//
// Storage of the comment itself is unchanged: it lives on the
// PortalBlogPost.comments array via `addBlogComment`. Hidden
// comments are filtered out for the visitor render, but kept in
// the array for the moderation queue.

import { useEffect, useMemo, useState } from "react"
import { AlertTriangle, MessageCircle, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import {
  usePortal,
  generatePortalId,
  type PortalBlogPost,
} from "@/lib/portal-store"
import { useLMS } from "@/lib/lms-store"
import { buildNotifications } from "@/lib/notifications"
import {
  MAX_COMMENTS_PER_EMAIL_PER_POST_PER_DAY,
  bumpDailyCommentCount,
  getDailyCommentCount,
  readBlogVisitorIdentity,
  writeBlogVisitorIdentity,
} from "@/lib/blog-visitor"

interface Props {
  post: PortalBlogPost
}

export function BlogComments({ post }: Props) {
  const { addBlogComment } = usePortal()
  const { getUserById, addNotifications } = useLMS()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [body, setBody] = useState("")
  const [submitting, setSubmitting] = useState(false)
  // Hydration-aware "remaining today" counter. We can't read the
  // count on first render (SSR) so we delay it to a useEffect.
  const [remainingToday, setRemainingToday] = useState<number | null>(null)

  // Pre-fill identity from localStorage on mount. A visitor who's
  // commented on any post in any tenant gets their name + email
  // populated the next time they land on a comment box — same vibe
  // as letting a browser remember a checkout form.
  useEffect(() => {
    const stored = readBlogVisitorIdentity()
    if (stored) {
      setName(stored.name)
      setEmail(stored.email)
    }
  }, [])

  // Recompute "comments left today" whenever the email field changes
  // (and on mount once we know the prefill value). Empty email
  // means we can't enforce a limit yet, so we show null.
  useEffect(() => {
    if (!email.trim()) {
      setRemainingToday(null)
      return
    }
    const used = getDailyCommentCount(post.id, email)
    setRemainingToday(
      Math.max(0, MAX_COMMENTS_PER_EMAIL_PER_POST_PER_DAY - used),
    )
  }, [email, post.id])

  const comments = useMemo(
    () => (post.comments ?? []).filter((c) => !c.hidden),
    [post.comments],
  )

  const overLimit = remainingToday !== null && remainingToday <= 0
  const canSubmit =
    name.trim().length > 1 &&
    body.trim().length > 1 &&
    email.trim().length > 3 &&
    !submitting &&
    !overLimit

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    setSubmitting(true)
    try {
      const trimmedName = name.trim()
      const trimmedEmail = email.trim()
      const trimmedBody = body.trim()
      // Persist the visitor's identity so future post pages pre-fill.
      writeBlogVisitorIdentity({ name: trimmedName, email: trimmedEmail })
      // Add the comment to the post.
      addBlogComment(post.id, {
        id: generatePortalId("cmt"),
        body: trimmedBody,
        authorName: trimmedName,
        authorEmail: trimmedEmail || undefined,
        createdAt: new Date().toISOString(),
      })
      // Notify the post's author (in-app + email if they have one).
      // Wrapped in try/catch so a notification failure never blocks
      // the visitor's comment from going through.
      try {
        const author = getUserById(post.authorId)
        if (author) {
          const entries = buildNotifications(
            [author],
            {
              type: "blog.comment.new",
              title: `New comment on "${post.title}"`,
              body: `${trimmedName}: ${trimmedBody.slice(0, 200)}`,
              url: `/dashboard/portal/blog/comments?post=${post.id}`,
              meta: { postId: post.id, commenterEmail: trimmedEmail },
            },
            { channels: ["in-app", "email"] },
          )
          if (entries.length > 0) addNotifications(entries)
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn("[blog-comments] notification dispatch failed", err)
      }
      // Bump the per-day counter for this email × post combo, then
      // re-read so the helper text below the composer updates.
      const newCount = bumpDailyCommentCount(post.id, trimmedEmail)
      setRemainingToday(
        Math.max(0, MAX_COMMENTS_PER_EMAIL_PER_POST_PER_DAY - newCount),
      )
      setBody("")
      toast.success("Comment posted.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="mt-12 border-t border-border pt-8">
      <div className="mb-6 flex items-center gap-2">
        <MessageCircle className="h-4 w-4 text-muted-foreground" />
        <h2 className="font-serif text-2xl font-bold tracking-tight">
          {comments.length === 0
            ? "Be the first to comment"
            : `${comments.length} comment${comments.length === 1 ? "" : "s"}`}
        </h2>
      </div>

      {/* Composer first — visitors see the input before scrolling
          through long threads. The label is collapsed into the field
          for compact layout. */}
      <form onSubmit={submit} className="space-y-3 rounded-lg border border-border bg-card p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="cmt-name" className="text-xs">Name *</Label>
            <Input
              id="cmt-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Renu Rawat"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cmt-email" className="text-xs">
              Email * <span className="text-muted-foreground">(not shown)</span>
            </Label>
            <Input
              id="cmt-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value.toLowerCase())}
              placeholder="you@example.com"
              required
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cmt-body" className="text-xs">Comment *</Label>
          <Textarea
            id="cmt-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Add to the conversation…"
            rows={4}
            required
          />
        </div>
        <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[11px] text-muted-foreground">
            Be respectful. The author can hide or delete any comment.
            {remainingToday !== null && !overLimit && (
              <>
                {" · "}
                <span className="text-foreground/70">
                  {remainingToday} of {MAX_COMMENTS_PER_EMAIL_PER_POST_PER_DAY} comments left today
                </span>
              </>
            )}
          </p>
          <Button type="submit" size="sm" disabled={!canSubmit}>
            <Send className="mr-1.5 h-3.5 w-3.5" />
            {submitting ? "Posting…" : "Post comment"}
          </Button>
        </div>
        {overLimit && (
          // Friendly explanation rather than a wall — the rate limit
          // is per-email-per-post, so a different post or a different
          // email lets the visitor keep contributing.
          <div className="inline-flex items-start gap-2 rounded-md border border-accent/40 bg-accent/[0.06] p-2.5 text-[11px] text-foreground/80">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
            <p>
              You&apos;ve hit the daily limit of{" "}
              {MAX_COMMENTS_PER_EMAIL_PER_POST_PER_DAY} comments on this post for{" "}
              <span className="font-mono">{email}</span>. Come back tomorrow, or comment on a
              different post.
            </p>
          </div>
        )}
      </form>

      {/* Existing comments */}
      {comments.length > 0 && (
        <ul className="mt-6 space-y-4">
          {comments.map((c) => (
            <li key={c.id} className="flex items-start gap-3 rounded-lg border border-border/60 bg-card/60 p-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                {initials(c.authorName)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <p className="text-sm font-semibold text-foreground">{c.authorName}</p>
                  <span className="text-[11px] text-muted-foreground">{timeAgo(c.createdAt)}</span>
                </div>
                <p className="mt-1 whitespace-pre-wrap text-sm text-foreground/90">{c.body}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0] ?? "")
    .join("")
    .toUpperCase() || "?"
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.round(diff / 60000)
  if (m < 1) return "just now"
  if (m < 60) return `${m} min ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.round(h / 24)
  if (d === 1) return "yesterday"
  if (d < 30) return `${d}d ago`
  return new Date(iso).toLocaleDateString()
}
