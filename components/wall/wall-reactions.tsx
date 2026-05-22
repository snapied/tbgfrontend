"use client"

// Reusable emoji-reactions bar for Wall of Love entries. Same set of
// 4 emojis everywhere so the data is consistent across the public
// wall, the tenant-portal wall, and the student-side wall page.
//
// Visitor identity:
//   • Signed-in user → their currentUser.id (stable across sessions).
//   • Anonymous visitor on the public wall → a sticky sessionStorage
//     id ("wall:<random>") so toggling stays consistent inside one
//     browser tab. Different tabs/devices count separately, which is
//     fine for casual emoji counts.

import { useCallback, useEffect, useState } from "react"
import { cn } from "@/lib/utils"

export const WALL_EMOJI = ["❤️", "🔥", "👏", "🎉"] as const
const ANON_KEY = "thebigclass.wall.anonId.v1"

function readAnonId(): string {
  if (typeof window === "undefined") return "anon"
  try {
    let id = window.sessionStorage.getItem(ANON_KEY)
    if (!id) {
      id = `wall-${Math.random().toString(36).slice(2, 10)}`
      window.sessionStorage.setItem(ANON_KEY, id)
    }
    return id
  } catch {
    return "anon"
  }
}

export function useReactionIdentity(currentUserId?: string | null): string {
  // Lock onto either the signed-in id or the sticky anon id at mount.
  // We compute it once per (signed-in) identity change so toggles
  // reference the same actor across re-renders.
  const [id, setId] = useState<string>(currentUserId ?? "anon")
  useEffect(() => {
    if (currentUserId) {
      setId(currentUserId)
      return
    }
    setId(readAnonId())
  }, [currentUserId])
  return id
}

export function WallReactions({
  reactions,
  who,
  onToggle,
  size = "md",
}: {
  reactions: Record<string, string[]> | undefined
  who: string
  onToggle: (emoji: string) => void
  size?: "sm" | "md"
}) {
  const handle = useCallback(
    (emoji: string) => () => onToggle(emoji),
    [onToggle],
  )
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {WALL_EMOJI.map((emoji) => {
        const list = reactions?.[emoji] ?? []
        const count = list.length
        const reacted = list.includes(who)
        return (
          <button
            key={emoji}
            type="button"
            onClick={handle(emoji)}
            className={cn(
              "inline-flex items-center gap-1 rounded-full border border-border bg-card transition-all",
              size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-sm",
              reacted
                ? "border-primary/60 bg-primary/10 text-foreground"
                : "text-muted-foreground hover:border-primary/40 hover:bg-muted",
              "active:scale-95",
            )}
            aria-pressed={reacted}
            aria-label={
              reacted
                ? `Remove ${emoji} reaction`
                : `React with ${emoji}${count > 0 ? ` (${count})` : ""}`
            }
          >
            <span>{emoji}</span>
            {count > 0 && (
              <span className="font-medium tabular-nums">{count}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}
