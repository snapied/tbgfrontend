"use client"

// Blog post list. Posts are tenant-scoped and feed
// /p/[tenant]/blog and the blog-teaser section on the page builder.

import { useMemo } from "react"
import Link from "next/link"
import {
  Plus,
  Trash2,
  Pencil,
  BookOpen,
  Eye,
  EyeOff,
  MessageCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { usePortal } from "@/lib/portal-store"
import { cn } from "@/lib/utils"
import { ProductTour, TakeATourButton, type TourStep } from "@/components/tour/product-tour"
import { useConfirm } from "@/lib/use-confirm"
import { toast } from "sonner"

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
]

export default function BlogListPage() {
  const { posts, upsertPost, deletePost } = usePortal()
  const confirm = useConfirm()

  const sorted = useMemo(
    () =>
      posts
        .slice()
        .sort(
          (a, b) =>
            (b.publishedAt ?? b.createdAt).localeCompare(
              a.publishedAt ?? a.createdAt,
            ),
        ),
    [posts],
  )

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

      {sorted.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <BookOpen className="h-10 w-10 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">No posts yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Write your first post — a tutorial, an announcement, a case study.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {sorted.map((p) => (
            <Card key={p.id}>
              <CardContent className="flex items-start gap-4 p-4">
                {p.coverImage && (
                  <img
                    src={p.coverImage}
                    alt=""
                    className="hidden h-20 w-32 shrink-0 rounded-md object-cover sm:block"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
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
                  </div>
                  <p className="truncate text-xs text-muted-foreground">/blog/{p.slug}</p>
                  {p.excerpt && (
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{p.excerpt}</p>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/dashboard/portal/blog/${p.id}/edit`}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
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
          ))}
        </div>
      )}
    </div>
  )
}
