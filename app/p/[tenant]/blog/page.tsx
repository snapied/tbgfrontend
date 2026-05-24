"use client"

// Public blog index.
//
// Search + filters live in the header rail. Cards do the heavy
// visual lifting:
//   • Featured post (newest with a cover) gets a wide hero-style
//     card on top of the grid.
//   • Coverless posts fall back to a per-slug deterministic
//     gradient (same util the teacher pages use) so the grid never
//     mixes "full photo" with "grey placeholder".
//   • Author avatar + chip pulled from lms-store so the blog rail
//     cross-promotes the instructor profile.
//
// Why fuzzy search not exact: titles change, typos happen, and a
// visitor searching "react" should still hit "Composing with
// React Server Components". The existing fuzzySearch util scores
// across title + excerpt + body so the user gets the right post
// even with sloppy queries.

import { use, useMemo, useState } from "react"
import Link from "next/link"
import { ArrowRight, BookOpen, Clock, Filter } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { usePortal } from "@/lib/portal-store"
import { useLMS } from "@/lib/lms-store"
import { DynamicMeta } from "@/components/seo/dynamic-meta"
import { useTenantBrand } from "@/lib/tenant-brand"
import { stripRichTextTags } from "@/components/editor/rich-text-content"
import { SearchInput } from "@/components/ui/search-input"
import { fuzzySearch } from "@/lib/fuzzy-search"
import { gradientFor } from "@/lib/handle-gradient"
import { cn } from "@/lib/utils"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

// Words-per-minute baseline used by Medium, Substack, the Reader app —
// 220 wpm is the established floor for English prose. We strip Tiptap
// HTML first so embed shortcodes don't inflate the count.
function readingTimeMinutes(html: string): number {
  const words = stripRichTextTags(html).trim().split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.round(words / 220))
}

type SortMode = "newest" | "oldest" | "longest" | "shortest"

export default function BlogIndexPage({
  params,
}: {
  params: Promise<{ tenant: string }>
}) {
  const { tenant } = use(params)
  const { posts } = usePortal()
  const { getUserById } = useLMS()
  const brand = useTenantBrand()

  const [search, setSearch] = useState("")
  const [tagFilter, setTagFilter] = useState<string>("all")
  const [sortMode, setSortMode] = useState<SortMode>("newest")

  // Universe of published posts — date-sort up front so sort-by-newest
  // is the trivial slice.
  const published = useMemo(
    () =>
      posts
        .filter((p) => p.status === "published")
        .sort(
          (a, b) =>
            (b.publishedAt ?? b.createdAt).localeCompare(
              a.publishedAt ?? a.createdAt,
            ),
        ),
    [posts],
  )

  // Unique tag list with counts so the chip rail can show "react · 4"
  // and hide tags that no longer have surviving posts. Capped at 8 so
  // a workspace that tags aggressively doesn't ship a wrapping wall
  // of chips above the grid.
  const tagCounts = useMemo(() => {
    const map = new Map<string, number>()
    for (const p of published) {
      for (const t of p.tags ?? []) map.set(t, (map.get(t) ?? 0) + 1)
    }
    return [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
  }, [published])

  // Filtered + fuzzy-searched + sorted view. Fuzzy ranges across the
  // title, excerpt, and the first 400 chars of the stripped body —
  // searching the full body is expensive on bigger posts and the
  // first paragraph almost always carries the relevant terms.
  const visible = useMemo(() => {
    const byTag = tagFilter === "all"
      ? published
      : published.filter((p) => (p.tags ?? []).includes(tagFilter))
    const searched = fuzzySearch(byTag, search, (p) => [
      p.title,
      p.excerpt ?? "",
      stripRichTextTags(p.body).slice(0, 400),
    ])
    if (sortMode === "newest") {
      return [...searched].sort((a, b) =>
        (b.publishedAt ?? b.createdAt).localeCompare(a.publishedAt ?? a.createdAt),
      )
    }
    if (sortMode === "oldest") {
      return [...searched].sort((a, b) =>
        (a.publishedAt ?? a.createdAt).localeCompare(b.publishedAt ?? b.createdAt),
      )
    }
    // Longest / shortest by reading time.
    return [...searched].sort((a, b) => {
      const da = readingTimeMinutes(a.body)
      const db = readingTimeMinutes(b.body)
      return sortMode === "longest" ? db - da : da - db
    })
  }, [published, search, tagFilter, sortMode])

  const basePath = `/p/${tenant}`

  // Featured post: the first post in the natural (search-respecting)
  // order. Pulled out for a hero-style card on top of the grid so the
  // index feels editorial, not catalog-flat. Hidden when the user is
  // actively searching/filtering — at that point they want the
  // result set, not a curated lead.
  const featured = !search && tagFilter === "all" && sortMode === "newest"
    ? visible[0]
    : null
  const rest = featured ? visible.slice(1) : visible

  return (
    <div className="mx-auto max-w-6xl px-6 py-12 lg:px-8">
      <DynamicMeta
        title="Blog"
        titleTemplate={`%s · ${brand.name}`}
        description={`Tutorials, behind-the-scenes notes, and announcements from ${brand.name}.`}
        image={brand.logoUrl}
        siteName={brand.name}
        type="website"
      />

      <header className="mx-auto max-w-2xl text-center">
        <h1 className="font-serif text-4xl font-bold tracking-tight sm:text-5xl">Blog</h1>
        <p className="mt-3 text-lg text-muted-foreground">
          Tutorials, behind-the-scenes notes, and announcements.
        </p>
      </header>

      {published.length > 0 && (
        <div className="mt-8 space-y-3">
          {/* Search rail. `/` shortcut works without a
              ShortcutsProvider on the public surface — the hook
              gracefully no-ops the overlay registration and the
              keyboard listener keeps working. */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <SearchInput
              pageId="public-blog"
              value={search}
              onChange={setSearch}
              placeholder="Search posts — typos OK · press / to focus"
              ariaLabel="Search blog posts"
              shortcutDescription="Focus blog search"
              className="flex-1"
            />
            <Select value={sortMode} onValueChange={(v) => setSortMode(v as SortMode)}>
              <SelectTrigger className="w-full sm:w-44">
                <Filter className="mr-1.5 h-3.5 w-3.5" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest first</SelectItem>
                <SelectItem value="oldest">Oldest first</SelectItem>
                <SelectItem value="longest">Longest reads</SelectItem>
                <SelectItem value="shortest">Quick reads</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {tagCounts.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <TagChip
                active={tagFilter === "all"}
                onClick={() => setTagFilter("all")}
                label="All"
                count={published.length}
              />
              {tagCounts.map(([t, n]) => (
                <TagChip
                  key={t}
                  active={tagFilter === t}
                  onClick={() => setTagFilter(t)}
                  label={t}
                  count={n}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {published.length === 0 ? (
        <Card className="mt-10">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <BookOpen className="h-10 w-10 text-muted-foreground" />
            <h2 className="mt-4 text-lg font-semibold">No posts yet</h2>
            <p className="mt-1 text-sm text-muted-foreground">Check back soon.</p>
          </CardContent>
        </Card>
      ) : visible.length === 0 ? (
        <div className="mt-10 rounded-xl border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
          Nothing matches that search.{" "}
          <button
            type="button"
            onClick={() => { setSearch(""); setTagFilter("all") }}
            className="font-semibold text-primary underline-offset-2 hover:underline"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="mt-10 space-y-6">
          {featured && (
            <FeaturedPostCard
              post={featured}
              basePath={basePath}
              authorName={getUserById(featured.authorId)?.name}
              authorAvatar={getUserById(featured.authorId)?.avatar}
            />
          )}
          {rest.length > 0 && (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {rest.map((p) => {
                const author = getUserById(p.authorId)
                return (
                  <PostCard
                    key={p.id}
                    post={p}
                    basePath={basePath}
                    authorName={author?.name}
                    authorAvatar={author?.avatar}
                  />
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function TagChip({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean
  onClick: () => void
  label: string
  count: number
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card text-foreground hover:border-primary/40",
      )}
    >
      {label}
      <span className={cn("text-[10px] font-normal", active ? "opacity-80" : "text-muted-foreground")}>
        {count}
      </span>
    </button>
  )
}

// Wider card for the lead post. Two-column layout above sm — cover
// left, copy right — so the editorial weight is obvious. Falls back
// to a one-column stack with gradient placeholder when no cover.
function FeaturedPostCard({
  post,
  basePath,
  authorName,
  authorAvatar,
}: {
  post: { id: string; slug: string; title: string; excerpt?: string; coverImage?: string; tags?: string[]; body: string; publishedAt?: string; createdAt: string }
  basePath: string
  authorName?: string
  authorAvatar?: string
}) {
  const minutes = readingTimeMinutes(post.body)
  return (
    <Link href={`${basePath}/blog/${post.slug}`} className="group block">
      <Card className="overflow-hidden py-0 transition-shadow group-hover:shadow-xl">
        <div className="grid gap-0 sm:grid-cols-[1.4fr_1fr]">
          <div className="aspect-[16/10] overflow-hidden sm:aspect-auto sm:min-h-[280px]">
            {post.coverImage ? (
              <img
                src={post.coverImage}
                alt=""
                onLoad={(e) => e.currentTarget.classList.remove("opacity-0")}
                className="h-full w-full object-cover opacity-0 transition-[opacity,transform] duration-300 group-hover:scale-[1.02]"
              />
            ) : (
              <div className="h-full w-full" style={{ background: gradientFor(post.slug) }} />
            )}
          </div>
          <CardContent className="flex flex-col justify-center p-6 sm:p-8">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-primary">
              Featured
            </p>
            {post.tags && post.tags.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-1.5">
                {post.tags.slice(0, 3).map((t) => (
                  <span key={t} className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                    {t}
                  </span>
                ))}
              </div>
            )}
            <h2 className="font-serif text-2xl font-bold leading-tight tracking-tight group-hover:text-primary sm:text-3xl">
              {post.title}
            </h2>
            {post.excerpt && (
              <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
                {post.excerpt}
              </p>
            )}
            <AuthorMeta
              name={authorName}
              avatar={authorAvatar}
              dateIso={post.publishedAt ?? post.createdAt}
              readingMin={minutes}
              className="mt-5"
            />
            <p className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary">
              Read post <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </p>
          </CardContent>
        </div>
      </Card>
    </Link>
  )
}

function PostCard({
  post,
  basePath,
  authorName,
  authorAvatar,
}: {
  post: { id: string; slug: string; title: string; excerpt?: string; coverImage?: string; tags?: string[]; body: string; publishedAt?: string; createdAt: string }
  basePath: string
  authorName?: string
  authorAvatar?: string
}) {
  const minutes = readingTimeMinutes(post.body)
  return (
    <Link href={`${basePath}/blog/${post.slug}`} className="group block">
      <Card className="h-full overflow-hidden py-0 transition-all group-hover:-translate-y-0.5 group-hover:shadow-lg">
        <div className="aspect-video overflow-hidden">
          {post.coverImage ? (
            <img
              src={post.coverImage}
              alt=""
              loading="lazy"
              onLoad={(e) => e.currentTarget.classList.remove("opacity-0")}
              className="h-full w-full object-cover opacity-0 transition-[opacity,transform] duration-300 group-hover:scale-[1.03]"
            />
          ) : (
            // Coverless posts get a deterministic gradient seeded
            // by slug. Mixing real photos with grey placeholders
            // in the same grid reads as "broken image" — this
            // keeps the grid visually consistent.
            <div className="h-full w-full" style={{ background: gradientFor(post.slug) }} />
          )}
        </div>
        <CardContent className="p-5">
          {post.tags && post.tags.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-1.5">
              {post.tags.slice(0, 3).map((t) => (
                <span key={t} className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                  {t}
                </span>
              ))}
            </div>
          )}
          <h3 className="line-clamp-2 font-serif text-xl font-bold tracking-tight group-hover:text-primary">
            {post.title}
          </h3>
          {post.excerpt && (
            <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{post.excerpt}</p>
          )}
          <AuthorMeta
            name={authorName}
            avatar={authorAvatar}
            dateIso={post.publishedAt ?? post.createdAt}
            readingMin={minutes}
            className="mt-4"
          />
          <p className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary">
            Read post <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </p>
        </CardContent>
      </Card>
    </Link>
  )
}

function AuthorMeta({
  name,
  avatar,
  dateIso,
  readingMin,
  className,
}: {
  name?: string
  avatar?: string
  dateIso: string
  readingMin: number
  className?: string
}) {
  return (
    <div className={cn("flex items-center gap-2.5 text-xs text-muted-foreground", className)}>
      {avatar ? (
        <img
          src={avatar}
          alt=""
          className="h-7 w-7 shrink-0 rounded-full object-cover"
        />
      ) : (
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10.5px] font-bold text-primary">
          {(name ?? "?").split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase()}
        </div>
      )}
      <div className="min-w-0 leading-tight">
        <p className="truncate font-medium text-foreground">{name ?? "Author"}</p>
        <p className="inline-flex items-center gap-1">
          {new Date(dateIso).toLocaleDateString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric",
          })}
          <span aria-hidden>·</span>
          <Clock className="h-3 w-3" />
          {readingMin} min read
        </p>
      </div>
    </div>
  )
}
