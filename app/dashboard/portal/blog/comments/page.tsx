"use client"

// Centralised moderation surface for every comment across every blog
// post in this workspace. Three jobs:
//
//   1. Show the admin the comments they haven't seen yet (anything
//      newer than each post's `lastCommentsReviewedAt`).
//   2. Let them act on a comment — hide, unhide, delete — without
//      having to navigate into each individual post's editor.
//   3. Let them mark everything reviewed in one click so the
//      sidebar badge clears.
//
// We don't paginate yet — the existing per-post comment cap (500)
// keeps the total cheap to render even on a workspace with 200
// posts. If that ever bites, paginate by post (load 20 newest, "see
// more") rather than across all comments at once.

import { useMemo, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import {
  ArrowLeft,
  CheckCheck,
  Eye,
  EyeOff,
  Inbox,
  MessageCircle,
  Search,
  Trash2,
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
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import {
  usePortal,
  type PortalBlogComment,
  type PortalBlogPost,
} from "@/lib/portal-store"
import { fuzzySearch } from "@/lib/fuzzy-search"
import { useConfirm } from "@/lib/use-confirm"
import { toast } from "sonner"

// "Row" flattens a comment + its parent post so the table can show
// post context without each row needing a re-lookup. The unread flag
// is computed once per row at filter time and reused for both the
// row class + the unread counter.
interface CommentRow {
  comment: PortalBlogComment
  post: PortalBlogPost
  unread: boolean
}

export default function BlogCommentsPage() {
  const {
    posts,
    setBlogCommentHidden,
    deleteBlogComment,
    markBlogCommentsReviewed,
  } = usePortal()
  const confirm = useConfirm()
  const searchParams = useSearchParams()
  // Optional ?post=<id> filter — the public comment notification
  // deep-links here with this param so a click from the bell jumps
  // straight to the matching post's comments.
  const postParam = searchParams.get("post") ?? "all"
  const [postFilter, setPostFilter] = useState<string>(postParam)
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [search, setSearch] = useState("")

  const rows = useMemo<CommentRow[]>(() => {
    const all: CommentRow[] = []
    for (const post of posts) {
      const reviewedAt = post.lastCommentsReviewedAt
        ? new Date(post.lastCommentsReviewedAt).getTime()
        : 0
      for (const comment of post.comments ?? []) {
        const created = new Date(comment.createdAt).getTime()
        all.push({
          comment,
          post,
          unread: created > reviewedAt,
        })
      }
    }
    // Newest first across the whole workspace.
    return all.sort(
      (a, b) =>
        new Date(b.comment.createdAt).getTime() -
        new Date(a.comment.createdAt).getTime(),
    )
  }, [posts])

  const unreadCount = rows.filter((r) => r.unread).length

  const filtered = useMemo(() => {
    const base = rows
      .filter((r) => postFilter === "all" || r.post.id === postFilter)
      .filter((r) => {
        if (statusFilter === "all") return true
        if (statusFilter === "unread") return r.unread
        if (statusFilter === "hidden") return !!r.comment.hidden
        if (statusFilter === "visible") return !r.comment.hidden
        return true
      })
    return fuzzySearch(base, search, (r) => [
      r.comment.body,
      r.comment.authorName,
      r.comment.authorEmail ?? "",
      r.post.title,
    ])
  }, [rows, postFilter, statusFilter, search])

  // Posts that actually have at least one comment — keeps the
  // post-picker dropdown from listing every empty draft.
  const postsWithComments = useMemo(
    () => posts.filter((p) => (p.comments?.length ?? 0) > 0),
    [posts],
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            href="/dashboard/portal/blog"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3 w-3" /> Back to blog posts
          </Link>
          <h1 className="mt-1 font-serif text-2xl font-bold tracking-tight">
            Blog comments
          </h1>
          <p className="text-muted-foreground">
            Every visitor comment across your posts, in one place. Hide a comment to keep it
            off the public page without losing the audit trail.
          </p>
          {rows.length > 0 && (
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
              {unreadCount > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-accent/15 px-2 py-0.5 text-accent">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                  {unreadCount} new
                </span>
              )}
              <span className="text-muted-foreground">· {rows.length} total</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            disabled={unreadCount === 0}
            onClick={() => markBlogCommentsReviewed()}
            title="Mark every comment as reviewed"
          >
            <CheckCheck className="mr-1.5 h-4 w-4" /> Mark all reviewed
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by comment, commenter, or post"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={postFilter} onValueChange={setPostFilter}>
          <SelectTrigger className="w-full sm:w-56">
            <SelectValue placeholder="All posts" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All posts</SelectItem>
            {postsWithComments.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All comments</SelectItem>
            <SelectItem value="unread">Unread</SelectItem>
            <SelectItem value="visible">Visible</SelectItem>
            <SelectItem value="hidden">Hidden</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Inbox className="h-10 w-10 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">No comments match</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {rows.length === 0 ? (
                <>Visitor comments will show up here as they arrive.</>
              ) : (
                <>Adjust the filters above to see more.</>
              )}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((row) => (
            <CommentCard
              key={row.comment.id}
              row={row}
              onHide={() =>
                setBlogCommentHidden(row.post.id, row.comment.id, !row.comment.hidden)
              }
              onDelete={async () => {
                // Delete is hard. Hide is the soft alternative we
                // recommend in the dialog body so a teacher who
                // intended "hide" doesn't lose the audit trail.
                const preview =
                  row.comment.body.length > 80
                    ? row.comment.body.slice(0, 80) + "…"
                    : row.comment.body
                const ok = await confirm({
                  title: `Delete this comment?`,
                  description: `From ${row.comment.authorName}: "${preview}". This can't be undone. Use "Hide" instead if you just want it off the public page but kept in the audit trail.`,
                  destructive: true,
                  confirmLabel: "Delete comment",
                })
                if (!ok) return
                deleteBlogComment(row.post.id, row.comment.id)
                toast.success("Comment deleted.")
              }}
              onMarkReviewed={() => markBlogCommentsReviewed(row.post.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function CommentCard({
  row,
  onHide,
  onDelete,
  onMarkReviewed,
}: {
  row: CommentRow
  onHide: () => void
  onDelete: () => void
  onMarkReviewed: () => void
}) {
  const { comment, post, unread } = row
  return (
    <Card
      className={cn(
        "transition-colors",
        unread && "border-l-4 border-l-accent",
        comment.hidden && "opacity-60",
      )}
    >
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
            {initials(comment.authorName)}
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-baseline gap-2">
              <p className="text-sm font-semibold">{comment.authorName}</p>
              {comment.authorEmail && (
                <span className="text-xs text-muted-foreground">{comment.authorEmail}</span>
              )}
              <span className="text-[11px] text-muted-foreground">
                · {timeAgo(comment.createdAt)}
              </span>
              {unread && (
                <Badge
                  variant="outline"
                  className="border-accent/40 bg-accent/10 text-[10px] text-accent"
                >
                  New
                </Badge>
              )}
              {comment.hidden && (
                <Badge variant="outline" className="text-[10px]">
                  Hidden from visitors
                </Badge>
              )}
            </div>
            <p className="whitespace-pre-wrap rounded-md bg-muted/30 p-2.5 text-sm text-foreground/90">
              {comment.body}
            </p>
            <p className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
              <MessageCircle className="h-3 w-3" />
              on{" "}
              <Link
                href={`/dashboard/portal/blog/${post.id}/edit`}
                className="font-medium text-primary hover:underline"
              >
                {post.title}
              </Link>
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {unread && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onMarkReviewed}
                title="Mark this post's comments as reviewed"
              >
                <CheckCheck className="h-3.5 w-3.5" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={onHide}
              title={comment.hidden ? "Show comment again" : "Hide comment from visitors"}
            >
              {comment.hidden ? (
                <Eye className="h-3.5 w-3.5" />
              ) : (
                <EyeOff className="h-3.5 w-3.5" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onDelete}
              className="text-destructive hover:text-destructive"
              title="Delete comment permanently"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function initials(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((s) => s[0] ?? "")
      .join("")
      .toUpperCase() || "?"
  )
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

