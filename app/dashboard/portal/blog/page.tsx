"use client"

// Blog post list. Posts are tenant-scoped and feed
// /p/[tenant]/blog and the blog-teaser section on the page builder.

import { useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Plus,
  Trash2,
  Pencil,
  BookOpen,
  Eye,
  EyeOff,
  MessageCircle,
  Pin,
  PinOff,
  Users2,
  Sparkles,
  Calendar,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
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
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  usePortal,
  generatePortalId,
  type PortalBlogPost,
} from "@/lib/portal-store"
import { useLMS } from "@/lib/lms-store"
import { cn } from "@/lib/utils"
import { ProductTour, TakeATourButton, type TourStep } from "@/components/tour/product-tour"
import { useConfirm } from "@/lib/use-confirm"
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
import { Checkbox } from "@/components/ui/checkbox"
import { CrossPosterDialog } from "@/components/ui/cross-poster-dialog"
import { useTenant } from "@/lib/tenant-store"

const BLOG_TOUR: TourStep[] = [
  {
    title: "Your portal blog",
    body: "Posts you publish here go live at /blog on your public site and feed the blog-teaser section on landing pages.",
    emoji: "📝",
    placement: "center",
  },
  {
    target: "[data-tour='blog-new']",
    title: "Write a post",
    body: "Title, slug, tags, cover image, full WYSIWYG body. Save as draft, publish when ready.",
    emoji: "✍️",
    placement: "left",
  },
  {
    title: "Why blog?",
    body: "Each post is a server-rendered page with its own meta tags — Google indexes them, and they drive long-tail traffic to your courses.",
    emoji: "🔍",
    placement: "center",
  },
  {
    title: "Start from a shape",
    body: "Six starter templates (course launch, behind-the-scenes, tips, student story, Q&A, weekly update) seed real outlines you can edit — no blank canvas.",
    emoji: "✨",
    placement: "center",
  },
  {
    title: "Pin + share",
    body: "Pin up to 3 posts to top of the public index. Share any post directly into a community feed so your students get the prompt without checking the blog.",
    emoji: "📌",
    placement: "center",
  },
  {
    title: "Comments in one inbox",
    body: "Every comment across every post lives in your Comments inbox. Reply inline, mark spam, or mark everything as read in one tap.",
    emoji: "💬",
    placement: "center",
  },
]

export default function BlogListPage() {
  const { posts, upsertPost, deletePost } = usePortal()
  const { studentGroups, addBatchPost, currentUser } = useLMS()
  const { currentTenant } = useTenant()
  const router = useRouter()
  const confirm = useConfirm()
  // Cross-poster replaces the old single-target "Pin to community"
  // dialog — the same row click now opens the multi-channel
  // CrossPosterDialog. Old per-row state lifted into one slot.
  const [sharePost, setSharePost] = useState<PortalBlogPost | null>(null)

  // useListState bundles the URL-backed search + status filter + sort
  // + multi-selection logic that this page used to do by hand. Counts
  // on each filter option are derived from raw `posts` so they reflect
  // global totals, not post-search counts.
  const draftCount = posts.filter((p) => p.status === "draft").length
  const publishedCount = posts.filter((p) => p.status === "published").length
  const list = useListState({
    pageId: "portal-blog",
    items: posts,
    searchFields: (p) => [p.title, p.slug, p.excerpt ?? "", ...(p.tags ?? [])],
    filters: {
      status: {
        defaultValue: "all",
        match: (p, v) => v === "all" || p.status === v,
      },
    },
    sorts: {
      recent: {
        label: "Recently published",
        cmp: (a, b) =>
          (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""),
      },
      edited: {
        label: "Recently edited",
        // PortalBlogPost doesn't currently track updatedAt — fall
        // back to publishedAt then to slug for deterministic order.
        cmp: (a, b) =>
          (b.publishedAt ?? "").localeCompare(a.publishedAt ?? "") ||
          a.slug.localeCompare(b.slug),
      },
      title: { label: "A → Z", cmp: (a, b) => a.title.localeCompare(b.title) },
      comments: {
        label: "Most commented",
        cmp: (a, b) => (b.comments?.length ?? 0) - (a.comments?.length ?? 0),
      },
    },
    defaultSort: "recent",
  })

  // Reorder so pinned + drafts surface at the top of the recent view.
  // Pinned posts always lead (max 3 expected); inside that group we
  // honour whatever the active sort produced. Drafts come next so the
  // "I just wrote a draft, where did it go?" trap stays solved.
  const ordered = useMemo(() => {
    const pinned = list.filtered.filter((p) => p.pinned)
    const rest = list.filtered.filter((p) => !p.pinned)
    if (list.sort !== "recent") return [...pinned, ...rest]
    const drafts = rest.filter((p) => p.status === "draft")
    const others = rest.filter((p) => p.status !== "draft")
    return [...pinned, ...drafts, ...others]
  }, [list.filtered, list.sort])

  // Soft cap on pinned posts — 3 keeps the visual hierarchy clean.
  const pinnedCount = posts.filter((p) => p.pinned).length

  // Toggle pin with cap warning.
  const togglePin = (p: PortalBlogPost) => {
    if (!p.pinned && pinnedCount >= 3) {
      toast.warning("You already have 3 pinned posts", {
        description: "Unpin one first — 3 keeps the visual hierarchy clean.",
      })
      return
    }
    upsertPost({ ...p, pinned: !p.pinned })
    toast.success(p.pinned ? "Unpinned" : "Pinned to top")
  }

  // Share-to-community is now subsumed by the CrossPosterDialog
  // mount below. The previous single-target dialog is gone; this
  // comment stays as a breadcrumb for git-blame archaeologists.

  // Unread comment count across every post. Matches the per-post
  // `lastCommentsReviewedAt` marker so the badge here mirrors the
  // sidebar's Blog badge — clicking through and hitting "Mark all
  // reviewed" clears both at once.
  const unreadCommentCount = useMemo(() => {
    let n = 0
    for (const p of posts) {
      const reviewedAt = p.lastCommentsReviewedAt
        ? new Date(p.lastCommentsReviewedAt).getTime()
        : 0
      for (const c of p.comments ?? []) {
        if (new Date(c.createdAt).getTime() > reviewedAt) n++
      }
    }
    return n
  }, [posts])

  // Bulk actions on selected rows.
  const bulkPublish = () => {
    const ids = list.selectedIds
    const now = new Date().toISOString()
    posts
      .filter((p) => ids.has(p.id) && p.status === "draft")
      .forEach((p) => upsertPost({ ...p, status: "published", publishedAt: p.publishedAt ?? now }))
    toast.success(`Published ${ids.size} ${ids.size === 1 ? "post" : "posts"}.`)
    list.clearSelection()
  }
  const bulkUnpublish = () => {
    const ids = list.selectedIds
    posts
      .filter((p) => ids.has(p.id) && p.status === "published")
      .forEach((p) => upsertPost({ ...p, status: "draft" }))
    toast.success(`Moved ${ids.size} to draft.`)
    list.clearSelection()
  }
  const bulkDelete = async () => {
    const ok = await confirm({
      title: `Delete ${list.selectedIds.size} posts?`,
      description: "Moved to Trash — you can restore within 7 days.",
      destructive: true,
      confirmLabel: "Delete",
    })
    if (!ok) return
    list.selectedIds.forEach((id) => deletePost(id))
    toast.success(`Deleted ${list.selectedIds.size} posts.`)
    list.clearSelection()
  }

  return (
    <div className="space-y-6">
      <ProductTour tourId="portal-blog-v1" steps={BLOG_TOUR} />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold tracking-tight">Blog</h1>
          <p className="text-muted-foreground">
            Articles drive SEO. Each post becomes a page under /blog with its own meta tags.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <TakeATourButton tourId="portal-blog-v1" />
          <Button variant="outline" asChild className="relative">
            <Link href="/dashboard/portal/blog/comments">
              <MessageCircle className="mr-1.5 h-4 w-4" /> Comments
              {unreadCommentCount > 0 && (
                <span
                  className="ml-1 inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-accent px-1.5 text-[10px] font-semibold leading-5 tabular-nums text-accent-foreground"
                  aria-label={`${unreadCommentCount} new comment${unreadCommentCount === 1 ? "" : "s"}`}
                >
                  {unreadCommentCount > 99 ? "99+" : unreadCommentCount}
                </span>
              )}
            </Link>
          </Button>
          <Button asChild data-tour="blog-new">
            <Link href="/dashboard/portal/blog/new">
              <Plus className="mr-1.5 h-4 w-4" /> New post
            </Link>
          </Button>
        </div>
      </div>

      {posts.length === 0 ? (
        <Card>
          <CardContent className="space-y-6 py-12">
            <div className="text-center">
              <BookOpen className="mx-auto h-10 w-10 text-muted-foreground" />
              <h3 className="mt-3 text-lg font-semibold">Your blog is empty</h3>
              <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
                Pick a starting shape — five minutes to swap the words and
                publish. Each template seeds a real outline you can
                edit, not a blank canvas.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {BLOG_STARTERS.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => {
                    // Create a draft post seeded with the template
                    // body and route into the editor.
                    const now = new Date().toISOString()
                    const id = generatePortalId("post")
                    upsertPost({
                      id,
                      slug: s.slug,
                      title: s.title,
                      excerpt: s.excerpt,
                      body: s.body,
                      authorId: currentUser?.id ?? "unknown",
                      status: "draft",
                      tags: s.tags,
                      createdAt: now,
                    } as PortalBlogPost)
                    router.push(`/dashboard/portal/blog/${id}/edit`)
                    toast.success("Draft created — edit it now.")
                  }}
                  className="group flex h-full flex-col items-start gap-1.5 rounded-xl border border-border bg-card p-4 text-left transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <span className="text-2xl" aria-hidden>{s.emoji}</span>
                  <span className="text-sm font-semibold">{s.title}</span>
                  <span className="text-[11.5px] leading-relaxed text-muted-foreground">{s.preview}</span>
                  <span className="mt-auto inline-flex items-center gap-1 text-[11px] font-semibold text-primary opacity-0 transition-opacity group-hover:opacity-100">
                    Start from this →
                  </span>
                </button>
              ))}
            </div>
            <div className="text-center">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/dashboard/portal/blog/new">
                  <Plus className="mr-1.5 h-4 w-4" /> Start from blank instead
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Toolbar — search + status filter + sort + count. Replaces
              the hand-rolled scroll-hunt the page used to ship. */}
          <ListToolbar>
            <ListSearch
              value={list.search}
              onChange={list.setSearch}
              placeholder="Search posts by title, slug, or tag — press / to focus"
            />
            <ListFilterPopover
              label="Status"
              value={list.getFilter("status")}
              onChange={(v) => list.setFilter("status", v)}
              options={[
                { value: "all", label: "All", count: posts.length },
                { value: "draft", label: "Drafts", count: draftCount },
                { value: "published", label: "Published", count: publishedCount },
              ]}
            />
            <ListSort
              value={list.sort}
              onChange={list.setSort}
              options={list.sortOptions}
            />
          </ListToolbar>

          <div className="flex items-center justify-between">
            <ListCount visible={list.visibleCount} total={list.totalCount} noun="posts" />
            {list.hasActiveFilters && <ListReset onClick={list.resetFilters} />}
          </div>

          {/* Bulk action bar — sticks above the list when any row is
              selected. Hidden otherwise. */}
          <BulkActionBar
            selectedCount={list.selectedIds.size}
            totalCount={list.visibleCount}
            onClear={list.clearSelection}
            actions={[
              { key: "publish", label: "Publish", icon: <Eye className="h-3.5 w-3.5" />, onClick: bulkPublish },
              { key: "unpublish", label: "Move to draft", icon: <EyeOff className="h-3.5 w-3.5" />, onClick: bulkUnpublish },
              {
                key: "pin",
                label: "Pin to top",
                icon: <Pin className="h-3.5 w-3.5" />,
                onClick: () => {
                  const ids = Array.from(list.selectedIds)
                  if (pinnedCount + ids.length > 3) {
                    toast.warning("Soft cap of 3 pinned posts", {
                      description: "Unpin some first — 3 keeps the visual hierarchy clean.",
                    })
                    return
                  }
                  ids.forEach((id) => {
                    const p = posts.find((x) => x.id === id)
                    if (p && !p.pinned) upsertPost({ ...p, pinned: true })
                  })
                  toast.success(`Pinned ${ids.length} ${ids.length === 1 ? "post" : "posts"}.`)
                  list.clearSelection()
                },
              },
              { key: "delete", label: "Delete", icon: <Trash2 className="h-3.5 w-3.5" />, destructive: true, onClick: bulkDelete },
            ]}
          />

          {/* "Select all visible" master checkbox lives above the
              rows. Indeterminate when some-but-not-all selected. */}
          {ordered.length > 0 && (
            <label className="flex items-center gap-2 px-1 text-[12px] text-muted-foreground">
              <Checkbox
                checked={list.isAllSelected || (list.isSomeSelected && "indeterminate")}
                onCheckedChange={(v) => {
                  if (v) list.selectAll()
                  else list.clearSelection()
                }}
                aria-label="Select all posts in the current view"
              />
              <span>Select all on this page</span>
            </label>
          )}

          {/* Filtered-but-empty state — different copy than zero-posts
              because here the action is "loosen filters", not
              "write a post". */}
          {ordered.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <BookOpen className="h-8 w-8 text-muted-foreground" />
                <p className="mt-3 text-sm font-medium">No posts match your filters.</p>
                <Button variant="outline" size="sm" className="mt-3" onClick={list.resetFilters}>
                  Reset filters
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {ordered.map((p) => {
                const checked = list.isSelected(p.id)
                // Latest 2 comments — surface as a hover preview so the
                // teacher can spot spam/triviality without opening
                // every post.
                const latestComments = (p.comments ?? [])
                  .slice()
                  .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""))
                  .slice(0, 2)
                return (
                  <Card key={p.id} className={cn(checked && "border-primary ring-1 ring-primary/30", p.pinned && "border-amber-500/50")}>
                    <CardContent className="flex items-start gap-4 p-4">
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => list.toggleSelect(p.id)}
                        aria-label={`Select ${p.title}`}
                        className="mt-1.5 shrink-0"
                      />
                      {p.coverImage && (
                        <img
                          src={p.coverImage}
                          alt={`Cover for ${p.title}`}
                          className="hidden h-20 w-32 shrink-0 rounded-md object-cover sm:block"
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          {p.pinned && (
                            <span
                              className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-700"
                              title="Pinned to the top of the public blog index"
                            >
                              <Pin className="h-2.5 w-2.5" />
                              Pinned
                            </span>
                          )}
                          <h3 className="truncate font-semibold">{p.title}</h3>
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                              p.status === "published"
                                ? "bg-success/15 text-success"
                                : "bg-muted text-muted-foreground",
                            )}
                          >
                            {p.status}
                          </span>
                          {p.scheduledFor && p.status === "draft" && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700">
                              <Calendar className="h-2.5 w-2.5" />
                              {new Date(p.scheduledFor).toLocaleDateString()}
                            </span>
                          )}
                          {(p.comments?.length ?? 0) > 0 && (
                            <span
                              className="group/comments relative inline-flex items-center gap-1 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
                            >
                              <MessageCircle className="h-2.5 w-2.5" />
                              {p.comments!.length}
                              {/* Comment hover preview — shows the latest
                                  2 comments so the teacher knows whether
                                  it's "Thanks!" or substantive feedback. */}
                              <div className="invisible absolute left-0 top-full z-10 mt-1 w-72 rounded-md border border-border bg-card p-2 text-left shadow-lg opacity-0 transition-opacity group-hover/comments:visible group-hover/comments:opacity-100">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                  Latest {latestComments.length} {latestComments.length === 1 ? "comment" : "comments"}
                                </p>
                                {latestComments.map((c) => (
                                  <div key={c.id} className="mt-1.5 border-t border-border/60 pt-1.5 first:border-0 first:pt-0">
                                    <p className="text-[11px] font-semibold text-foreground">{c.authorName ?? "Anonymous"}</p>
                                    <p className="line-clamp-2 text-[10.5px] text-muted-foreground">{c.body}</p>
                                  </div>
                                ))}
                              </div>
                            </span>
                          )}
                        </div>
                        <p className="truncate text-xs text-muted-foreground">/blog/{p.slug}</p>
                        {p.excerpt && (
                          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{p.excerpt}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label={p.pinned ? "Unpin" : "Pin to top"}
                          title={p.pinned ? "Unpin" : "Pin to top"}
                          onClick={() => togglePin(p)}
                        >
                          {p.pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label="Share to community"
                          title={studentGroups.length === 0 ? "No communities yet" : "Share to a community"}
                          disabled={studentGroups.length === 0}
                          onClick={() => setSharePost(p)}
                        >
                          <Users2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/dashboard/portal/blog/${p.id}/edit`} aria-label={`Edit ${p.title}`}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label={p.status === "published" ? "Move to draft" : "Publish"}
                          onClick={() =>
                            upsertPost({
                              ...p,
                              status: p.status === "published" ? "draft" : "published",
                              publishedAt: p.publishedAt ?? new Date().toISOString(),
                            })
                          }
                        >
                          {p.status === "published" ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label={`Delete ${p.title}`}
                          className="text-destructive hover:text-destructive"
                          onClick={async () => {
                            const ok = await confirm({
                              title: `Delete "${p.title}"?`,
                              description: "Moved to Trash — you can restore it within 7 days.",
                              destructive: true,
                            })
                            if (!ok) return
                            deletePost(p.id)
                            toast.success(`Deleted "${p.title}".`, { description: "Restore from Trash within 7 days." })
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* Cross-poster — opens with the row's post pre-loaded and
          defaults the "communities" channel to the first community
          so the legacy "Pin to community" muscle memory still works
          in one tap. */}
      {sharePost && (
        <CrossPosterDialog
          open={!!sharePost}
          onOpenChange={(o) => !o && setSharePost(null)}
          artifact={{
            kind: "blog-post",
            title: sharePost.title,
            description: sharePost.excerpt ?? undefined,
            url:
              typeof window !== "undefined" && currentTenant?.slug
                ? `${window.location.origin}/p/${currentTenant.slug}/blog/${sharePost.slug}`
                : `/blog/${sharePost.slug}`,
            thumbnailUrl: sharePost.coverImage,
            hashtags: sharePost.tags?.slice(0, 3),
          }}
          defaultSelections={{
            communities: studentGroups[0]?.id ? [studentGroups[0].id] : [],
          }}
        />
      )}
    </div>
  )
}

// ───── Starter templates ───────────────────────────────────────────

interface BlogStarter {
  key: string
  emoji: string
  title: string
  preview: string
  slug: string
  excerpt: string
  tags?: string[]
  body: string
}

const BLOG_STARTERS: BlogStarter[] = [
  {
    key: "course-launch",
    emoji: "🚀",
    title: "Course launch announcement",
    preview: "Tell your audience what's new, who it's for, and why this is the right time to enrol.",
    slug: "new-course-launch",
    excerpt: "We just launched a new course — here's what's inside and who it's for.",
    tags: ["launch", "announcement"],
    body: `<h2>We just launched something new</h2><p>One paragraph framing the course — who it's for and what changes after they complete it.</p><h2>What's inside</h2><ul><li>Module one — the foundation</li><li>Module two — the real practice</li><li>Module three — the synthesis</li></ul><h2>Who this is for</h2><p>Be specific. "If you're a 2nd-year engineering student trying to ship your first side project…"</p><h2>Why now</h2><p>Optional time pressure — launch price, early-bird cohort, etc.</p><h2>Get in</h2><p>One CTA. Link to the course page or the enrol button.</p>`,
  },
  {
    key: "behind-scenes",
    emoji: "🎬",
    title: "Behind the scenes",
    preview: "Show your process — how a lesson got made, what you struggled with, what changed.",
    slug: "behind-the-scenes",
    excerpt: "A peek at how we build the course — the messy real version, not the marketing one.",
    tags: ["behind-the-scenes", "process"],
    body: `<h2>The boring (and useful) truth</h2><p>One paragraph framing the post — why you're sharing the process publicly.</p><h2>How this lesson got made</h2><p>Specifics. Tools, drafts, what you cut, what surprised you.</p><h2>What I'd do differently</h2><p>Owning the trade-offs builds trust faster than any sales line.</p>`,
  },
  {
    key: "tips-tricks",
    emoji: "💡",
    title: "Tips & tricks",
    preview: "Five specific moves your students can use right away — no fluff, no theory dumps.",
    slug: "five-tips",
    excerpt: "Five things students always ask me — answered in plain English.",
    tags: ["tips", "how-to"],
    body: `<h2>Five things to do today</h2><ol><li><strong>Tip one.</strong> One concrete instruction.</li><li><strong>Tip two.</strong></li><li><strong>Tip three.</strong></li><li><strong>Tip four.</strong></li><li><strong>Tip five.</strong></li></ol><h2>Why these five</h2><p>Tie them back to the bigger arc — these are the moves that compound.</p>`,
  },
  {
    key: "student-story",
    emoji: "🌱",
    title: "Student success story",
    preview: "One student, one transformation, one quote. Three short sections — before, during, after.",
    slug: "student-story",
    excerpt: "How one student went from stuck to shipped — in their own words.",
    tags: ["case-study", "stories"],
    body: `<h2>Meet [Name]</h2><p>One paragraph — who they were when they started.</p><h2>What changed during the course</h2><p>Specifics. What they tried, what worked, what stuck.</p><h2>Where they are now</h2><p>The outcome. Quote them directly if you can.</p><blockquote>"One short, vivid quote in their own voice."</blockquote>`,
  },
  {
    key: "qa-digest",
    emoji: "❓",
    title: "Q&A digest",
    preview: "Roll up your top five student questions of the month with one-paragraph answers.",
    slug: "monthly-questions",
    excerpt: "Five questions students kept asking this month — and the short, honest answers.",
    tags: ["q-and-a"],
    body: `<h2>This month's five</h2><h3>Question one</h3><p>Short answer — two or three sentences.</p><h3>Question two</h3><p>Short answer.</p><h3>Question three</h3><p>Short answer.</p><h3>Question four</h3><p>Short answer.</p><h3>Question five</h3><p>Short answer.</p><h2>Want to ask the next one?</h2><p>Link to your contact form / community.</p>`,
  },
  {
    key: "weekly-update",
    emoji: "📅",
    title: "Weekly update",
    preview: "A repeatable rhythm — what shipped, what's next, what you noticed.",
    slug: "weekly-update",
    excerpt: "A short check-in on what shipped this week and what's coming next.",
    tags: ["update"],
    body: `<h2>This week</h2><ul><li>Shipped — concrete deliverables.</li><li>Started — works-in-progress.</li><li>Noticed — something a student said that stuck with you.</li></ul><h2>Next week</h2><ul><li>One or two specific items.</li></ul>`,
  },
]

// ShareBlogToCommunityDialog was removed in favour of the universal
// CrossPosterDialog (multi-channel: communities + LinkedIn + X +
// WhatsApp + email). The trigger sits on every row's Users2 button.
