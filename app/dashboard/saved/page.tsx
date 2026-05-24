"use client"

// Saved posts tray.
//
// One stop for everything the current user has bookmarked across
// every community they're in. Reads the per-user
// thebigclass.t.<slug>.user.<userId>.community.bookmarks.v1 bucket
// and joins each id against the lms-store's batchPosts so we render
// the actual post (with author, community, embed, reactions) right
// here without a separate fetch.
//
// Why a standalone page rather than a sidebar drawer:
//   • A drawer would compete with the existing notification bell +
//     command palette for screen real estate.
//   • Bookmarks accumulate over months; a full page handles the
//     scale better (filters, search, batch unsave).
//   • Same URL is shareable + bookmarkable on its own.
//
// The route is intentionally not nested under /community since
// "saved" cuts across every community the user belongs to.

import { useMemo, useState } from "react"
import Link from "next/link"
import { Bookmark, MessageCircle, Search, X } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useLMS } from "@/lib/lms-store"
import { RichTextContent, stripRichTextTags } from "@/components/editor/rich-text-content"
import { EmptyState } from "@/components/ui/empty-state"
import { SearchInput } from "@/components/ui/search-input"
import { fuzzySearch } from "@/lib/fuzzy-search"
import {
  getBookmarkedPostIds,
  setPostBookmarked,
} from "@/lib/community-post-prefs"

export default function SavedPostsPage() {
  const { currentUser, batchPosts, studentGroups, getUserById } = useLMS()
  // Re-render trigger after an unsave action. The localStorage
  // store doesn't notify subscribers, so we bump a counter to force
  // the memo to re-run.
  const [bump, setBump] = useState(0)
  const [search, setSearch] = useState("")

  const items = useMemo(() => {
    if (!currentUser) return []
    const ids = getBookmarkedPostIds(currentUser.id)
    const byId = new Map(batchPosts.map((p) => [p.id, p]))
    const resolved = ids
      .map((id) => byId.get(id))
      .filter((p): p is NonNullable<typeof p> => !!p)
    if (!search.trim()) return resolved
    return fuzzySearch(resolved, search, (p) => {
      const author = getUserById(p.authorId)?.name ?? ""
      return [stripRichTextTags(p.body), author]
    })
    // bump in deps so unsave actions trigger a re-eval. batchPosts
    // already covers store-side updates.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, batchPosts, search, bump])

  const unsave = (postId: string) => {
    if (!currentUser) return
    setPostBookmarked(currentUser.id, postId, false)
    setBump((n) => n + 1)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold tracking-tight">
            Saved posts
          </h1>
          <p className="text-muted-foreground">
            Every post you&rsquo;ve bookmarked across your communities.
          </p>
        </div>
      </div>

      {items.length === 0 && !search.trim() ? (
        <EmptyState
          icon={<span>🔖</span>}
          title="Nothing saved yet"
          description="When you bookmark a post inside a community, it'll show up here. Useful for resources, longer threads, and anything worth revisiting."
          paths={[
            {
              id: "communities",
              label: "Open Communities",
              hint: "Find a post worth saving",
              icon: <MessageCircle className="h-4 w-4" />,
              href: "/dashboard/batches",
              primary: true,
            },
          ]}
        />
      ) : (
        <>
          <SearchInput
            pageId="saved-posts"
            value={search}
            onChange={setSearch}
            placeholder="Search saved posts…"
            ariaLabel="Search saved posts"
            shortcutDescription="Focus saved-post search"
            className="max-w-md"
          />
          {items.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-10 text-center">
                <Search className="h-7 w-7 text-muted-foreground" />
                <p className="mt-3 text-sm font-semibold">
                  No matches for &ldquo;{search.trim()}&rdquo;
                </p>
                <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                  Try a different word, or clear the search.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 h-7 text-xs"
                  onClick={() => setSearch("")}
                >
                  Clear search
                </Button>
              </CardContent>
            </Card>
          ) : (
            <ul className="space-y-3">
              {items.map((post) => {
                const community = studentGroups.find((g) => g.id === post.batchId)
                const author = getUserById(post.authorId)
                return (
                  <li key={post.id}>
                    <Card>
                      <CardHeader className="flex flex-row items-start justify-between gap-3 pb-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <span className="font-medium text-foreground">
                              {author?.name ?? "Someone"}
                            </span>
                            <span aria-hidden>·</span>
                            {community ? (
                              <Link
                                href={`/dashboard/batches/${community.id}`}
                                className="font-medium text-primary hover:underline"
                              >
                                {community.name}
                              </Link>
                            ) : (
                              <span className="italic">Community removed</span>
                            )}
                            <span aria-hidden>·</span>
                            <span>
                              {new Date(post.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          {post.comments.length > 0 && (
                            <CardDescription className="mt-1 text-[11px]">
                              {post.comments.length} comment
                              {post.comments.length === 1 ? "" : "s"}
                            </CardDescription>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 gap-1 px-2 text-xs text-muted-foreground hover:text-destructive"
                          onClick={() => unsave(post.id)}
                          title="Remove from saved"
                        >
                          <X className="h-3 w-3" /> Unsave
                        </Button>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <RichTextContent
                          html={post.body}
                          className="text-sm leading-relaxed"
                        />
                        {post.attachments && post.attachments.length > 0 && (
                          <p className="text-[11px] text-muted-foreground">
                            {post.attachments.length} attachment
                            {post.attachments.length === 1 ? "" : "s"}
                          </p>
                        )}
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <Bookmark className="h-3 w-3 text-amber-500" />
                            Saved
                          </span>
                          {community && (
                            <Link
                              href={`/dashboard/batches/${community.id}`}
                              className="text-primary hover:underline"
                            >
                              Open in {community.name} →
                            </Link>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </li>
                )
              })}
            </ul>
          )}
        </>
      )}
    </div>
  )
}
