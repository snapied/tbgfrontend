"use client"

// CommunityHealthWidget — Sprint B Communities #17.
//
// Admin-only banner that shows when a community is showing signs of
// going dead: declining post velocity, no admin posts in the last
// 2 weeks, or near-zero member engagement.
//
// Score formula (0–100):
//   • Post velocity score (40 pts max)
//     posts_last_7d ÷ posts_prior_7d ratio, clamped 0–2 → 0–40.
//   • Admin activity (20 pts)
//     +20 if any admin/instructor post in last 14d.
//   • Member engagement (40 pts)
//     unique_authors_last_14d ÷ members ratio, clamped 0–0.3 → 0–40.
//
// Threshold:
//   ≥ 70 → hidden (the community is doing fine)
//   < 70 → show with prescriptive nudges
//
// The widget is intentionally a single dismissable strip — we don't
// want to clutter the page for healthy communities. Re-evaluates
// each render so it auto-disappears once the admin acts.

import { useMemo } from "react"
import Link from "next/link"
import { AlertCircle, Sparkles, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface PostLite {
  authorId: string
  createdAt: string
}
interface MemberLite {
  id: string
  role?: string
}

interface Props {
  posts: PostLite[]
  members: MemberLite[]
  /** When set + truthy, the widget hides itself entirely (dismissed
   *  this session). Parent owns the storage if persistence is wanted. */
  dismissed?: boolean
  onDismiss?: () => void
  /** Click-through actions the widget can suggest. Each is optional;
   *  the widget surfaces only the nudges that have a handler. */
  onPostPrompt?: () => void
  onInvitePrompt?: () => void
}

export function CommunityHealthWidget({
  posts,
  members,
  dismissed,
  onDismiss,
  onPostPrompt,
  onInvitePrompt,
}: Props) {
  const stats = useMemo(() => {
    const now = Date.now()
    const last7d = posts.filter(
      (p) => now - new Date(p.createdAt).getTime() < 7 * 24 * 3600_000,
    )
    const prior7d = posts.filter((p) => {
      const ms = now - new Date(p.createdAt).getTime()
      return ms >= 7 * 24 * 3600_000 && ms < 14 * 24 * 3600_000
    })
    const last14d = posts.filter(
      (p) => now - new Date(p.createdAt).getTime() < 14 * 24 * 3600_000,
    )
    const adminIds = new Set(
      members.filter((m) => m.role === "admin" || m.role === "instructor").map((m) => m.id),
    )
    const adminPostsLast14d = last14d.filter((p) => adminIds.has(p.authorId)).length
    const uniqueAuthorsLast14d = new Set(last14d.map((p) => p.authorId)).size
    const memberCount = Math.max(1, members.length)

    // Score components
    const velocityRatio = prior7d.length === 0
      ? last7d.length > 0 ? 1 : 0
      : last7d.length / prior7d.length
    const velocityScore = Math.min(40, Math.max(0, velocityRatio * 20))
    const adminScore = adminPostsLast14d > 0 ? 20 : 0
    const engagementRatio = uniqueAuthorsLast14d / memberCount
    const engagementScore = Math.min(40, Math.max(0, engagementRatio * 130))

    const total = Math.round(velocityScore + adminScore + engagementScore)
    return {
      total,
      last7d: last7d.length,
      prior7d: prior7d.length,
      adminPostsLast14d,
      uniqueAuthorsLast14d,
      memberCount,
    }
  }, [posts, members])

  if (dismissed) return null
  if (stats.total >= 70) return null

  // Tier the colour to communicate severity at a glance.
  const tier = stats.total < 40 ? "critical" : stats.total < 55 ? "warning" : "watch"
  const tone =
    tier === "critical"
      ? "border-red-500/40 bg-red-500/5 text-red-700 dark:text-red-300"
      : tier === "warning"
        ? "border-amber-500/40 bg-amber-500/5 text-amber-700 dark:text-amber-300"
        : "border-muted-foreground/30 bg-muted/30 text-muted-foreground"

  // Build a 3-prompt suggestion list ordered by impact. Each
  // prompt's CTA is omitted when its handler is missing.
  const prompts: Array<{ label: string; action?: () => void; href?: string }> = []
  if (stats.adminPostsLast14d === 0) {
    prompts.push({
      label: "Drop a quick teacher post — even a one-liner restarts the feed.",
      action: onPostPrompt,
    })
  }
  if (stats.last7d < 2) {
    prompts.push({
      label: "Pin a question post — open-ended prompts wake quiet communities up.",
      action: onPostPrompt,
    })
  }
  if (stats.uniqueAuthorsLast14d < Math.max(2, stats.memberCount * 0.1)) {
    prompts.push({
      label: "Invite 5 more people — communities under 25 unique posters tend to stall.",
      action: onInvitePrompt,
    })
  }

  return (
    <div className={cn("flex flex-wrap items-start gap-3 rounded-lg border p-3", tone)}>
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="min-w-0 flex-1 space-y-1.5 text-[12.5px]">
        <p className="font-semibold">
          Community health: {stats.total}/100 ·{" "}
          {tier === "critical" ? "needs attention" : tier === "warning" ? "trending quiet" : "watch closely"}
        </p>
        <p className="opacity-80">
          Last 7d: {stats.last7d.toLocaleString()} {stats.last7d === 1 ? "post" : "posts"}
          {stats.prior7d > 0 && (
            <> (vs {stats.prior7d.toLocaleString()} the week before)</>
          )}
          {" · "}
          {stats.uniqueAuthorsLast14d.toLocaleString()} unique posters in 14d.
        </p>
        {prompts.length > 0 && (
          <ul className="space-y-1 pt-1">
            {prompts.slice(0, 3).map((p, i) => (
              <li key={i} className="flex items-start gap-1.5">
                <Sparkles className="mt-0.5 h-3 w-3 shrink-0 opacity-60" />
                <span className="flex-1">{p.label}</span>
                {p.action && (
                  <button
                    type="button"
                    onClick={p.action}
                    className="shrink-0 text-[11px] font-bold uppercase tracking-wider underline-offset-2 hover:underline"
                  >
                    Do it
                  </button>
                )}
                {p.href && (
                  <Link
                    href={p.href}
                    className="shrink-0 text-[11px] font-bold uppercase tracking-wider underline-offset-2 hover:underline"
                  >
                    Open
                  </Link>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
      {onDismiss && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onDismiss}
          className="shrink-0 h-7 px-1.5"
          title="Dismiss for this session"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  )
}
