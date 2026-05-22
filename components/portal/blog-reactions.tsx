"use client"

// Emoji-reaction strip for a public blog post.
//
// Renders the six curated emojis from BLOG_REACTION_EMOJIS as a row
// of pill buttons. Each pill shows its own count + highlights when
// the current browser has already reacted with that emoji. Tapping
// toggles the visitor's reaction without affecting anyone else's.
//
// The "did this browser already react?" check uses the same
// `visitorId` localStorage key the rest of the public blog surface
// reads from, so a visitor's identity is consistent across
// reactions, comment prefill, and rate limits.

import { useMemo } from "react"
import { cn } from "@/lib/utils"
import {
  BLOG_REACTION_EMOJIS,
  usePortal,
  type PortalBlogPost,
} from "@/lib/portal-store"
import { getBlogVisitorId } from "@/lib/blog-visitor"

interface Props {
  post: PortalBlogPost
}

export function BlogReactions({ post }: Props) {
  const { toggleBlogReaction } = usePortal()
  // Reading the visitor id from localStorage is safe inside a
  // "use client" component — but useMemo ensures we don't read it
  // on every render. Empty-string fallback during SSR keeps the
  // render pure (no useEffect needed for the read itself).
  const visitorId = useMemo(() => getBlogVisitorId(), [])
  const reactions = post.reactions ?? {}

  return (
    <section
      aria-label="React to this post"
      className="mt-10 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card/60 p-3"
    >
      <span className="text-xs font-medium text-muted-foreground">
        React:
      </span>
      <div className="flex flex-wrap items-center gap-1.5">
        {BLOG_REACTION_EMOJIS.map((emoji) => {
          const owners = reactions[emoji] ?? []
          const count = owners.length
          const mine = owners.includes(visitorId)
          return (
            <button
              key={emoji}
              type="button"
              onClick={() => toggleBlogReaction(post.id, emoji, visitorId)}
              title={mine ? "Remove your reaction" : "Add your reaction"}
              aria-pressed={mine}
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-sm transition-colors",
                mine
                  ? "border-primary/40 bg-primary/10 text-foreground"
                  : "border-border bg-background text-foreground/80 hover:border-primary/40 hover:bg-primary/[0.05]",
              )}
            >
              <span className="text-base leading-none" aria-hidden>
                {emoji}
              </span>
              {/* Tabular nums so a row of counts doesn't reflow as
                  numbers tick up while the visitor is reacting. */}
              <span className="min-w-[1ch] text-xs font-semibold tabular-nums">
                {count}
              </span>
            </button>
          )
        })}
      </div>
    </section>
  )
}
