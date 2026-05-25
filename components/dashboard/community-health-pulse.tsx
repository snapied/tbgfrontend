"use client"

// Community health pulse strip — host-only signal of whether a batch
// is alive or quietly dying.
//
// Compact mode is the one-line summary: "💚 Cohort 7 is buzzing —
// 18 of 22 active this week" with three trend dots (DAU ratio,
// posts/day, reactions). Click to expand → a drawer with the last
// 14-day trend per metric + an at-risk member list with a one-click
// "Send a check-in" nudge.
//
// Metric definitions (14d window):
//   • DAU ratio       — unique members who posted OR commented OR
//                       reacted at least once / total members.
//   • Posts per day   — total posts in window / 14.
//   • Reactions/post  — total reactions across all posts in window /
//                       post count. Zero when no posts.
//
// Color coding (compared to the prior 14-day window):
//   • green  — trending up >5%
//   • amber  — flat (-5% .. +5%) or insufficient data
//   • red    — trending down >5%
//
// At-risk member = no post + no comment + no reaction in 7d.

import { useMemo, useState } from "react"
import { ChevronDown, Heart, MessageSquare, Send, Users, X } from "lucide-react"
import type { BatchPost, User } from "@/lib/lms-store"

interface Props {
  batchName: string
  members: Array<{ id: string; name: string }>
  posts: BatchPost[]
  onSendCheckIn: (memberIds: string[], draft: string) => void
}

interface MemberActivity {
  user: { id: string; name: string }
  lastActivityMs: number | null
}

type Trend = "up" | "flat" | "down" | "unknown"

const DAY_MS = 24 * 60 * 60 * 1000
const WINDOW_DAYS = 14
const AT_RISK_QUIET_DAYS = 7

export function CommunityHealthPulse({ batchName, members, posts, onSendCheckIn }: Props) {
  const [expanded, setExpanded] = useState(false)

  const stats = useMemo(() => computeHealthStats(members, posts), [members, posts])

  const overall = pickOverall([stats.dauTrend, stats.postsTrend, stats.reactionsTrend])
  const emoji = overall === "up" ? "💚" : overall === "down" ? "⚠️" : "🟡"
  const headline = (() => {
    if (members.length === 0) return `${batchName} has no members yet.`
    const activeCount = stats.activeMemberIds.size
    if (overall === "up") return `${emoji} ${batchName} is buzzing — ${activeCount} of ${members.length} active this week.`
    if (overall === "down") return `${emoji} ${batchName} engagement dipped — ${members.length - activeCount} quieter than last week.`
    return `${emoji} ${batchName} — ${activeCount} of ${members.length} active this week.`
  })()

  const atRisk: MemberActivity[] = useMemo(() => {
    return members
      .map((m): MemberActivity => ({
        user: m,
        lastActivityMs: stats.lastActivityByMember.get(m.id) ?? null,
      }))
      .filter((a) => {
        if (a.lastActivityMs == null) return true
        return Date.now() - a.lastActivityMs > AT_RISK_QUIET_DAYS * DAY_MS
      })
  }, [members, stats.lastActivityByMember])

  return (
    <div className="rounded-xl border border-border bg-card">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left transition-colors hover:bg-muted/40"
        aria-expanded={expanded}
      >
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <p className="truncate text-sm font-medium">{headline}</p>
          <div className="hidden items-center gap-1.5 sm:flex">
            <TrendDot label="active" trend={stats.dauTrend} />
            <TrendDot label="posts" trend={stats.postsTrend} />
            <TrendDot label="rxn" trend={stats.reactionsTrend} />
          </div>
        </div>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`}
        />
      </button>

      {expanded && (
        <div className="space-y-4 border-t border-border px-4 py-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <MetricCard
              icon={<Users className="h-3.5 w-3.5" />}
              label="Active members"
              value={stats.activeMemberIds.size}
              suffix={`/ ${members.length}`}
              trend={stats.dauTrend}
              hint={`Posted, commented, or reacted in the last ${WINDOW_DAYS} days.`}
            />
            <MetricCard
              icon={<MessageSquare className="h-3.5 w-3.5" />}
              label="Posts / day"
              value={Math.round(stats.postsPerDay * 10) / 10}
              trend={stats.postsTrend}
              hint={`Rolling ${WINDOW_DAYS}-day average.`}
            />
            <MetricCard
              icon={<Heart className="h-3.5 w-3.5" />}
              label="Reactions / post"
              value={Math.round(stats.reactionsPerPost * 10) / 10}
              trend={stats.reactionsTrend}
              hint="Engagement per post in the window."
            />
          </div>

          {atRisk.length > 0 && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/[0.04] p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-amber-700">
                    ⚠️ {atRisk.length} at-risk {atRisk.length === 1 ? "member" : "members"}
                  </p>
                  <p className="text-[11px] text-amber-800/80">
                    No post, comment, or reaction in {AT_RISK_QUIET_DAYS} days.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const draft =
                      `Hey — noticed you've been quiet in ${batchName} lately. ` +
                      `Anything I can help with? Drop a reply or DM me if it's easier.`
                    onSendCheckIn(atRisk.map((a) => a.user.id), draft)
                  }}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-amber-500/40 bg-background px-3 py-1.5 text-[12px] font-semibold text-amber-700 transition-colors hover:bg-amber-500/10"
                >
                  <Send className="h-3 w-3" />
                  Send a check-in to all {atRisk.length}
                </button>
              </div>
              <ul className="mt-2 flex flex-wrap gap-1">
                {atRisk.slice(0, 12).map((a) => (
                  <li
                    key={a.user.id}
                    className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2 py-0.5 text-[11px]"
                  >
                    <span className="font-medium">{a.user.name}</span>
                    <span className="text-muted-foreground">
                      ·{" "}
                      {a.lastActivityMs == null
                        ? "never active"
                        : `${Math.floor((Date.now() - a.lastActivityMs) / DAY_MS)}d quiet`}
                    </span>
                  </li>
                ))}
                {atRisk.length > 12 && (
                  <li className="px-2 text-[11px] text-muted-foreground">
                    + {atRisk.length - 12} more
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function TrendDot({ label, trend }: { label: string; trend: Trend }) {
  const color =
    trend === "up"
      ? "bg-success"
      : trend === "down"
        ? "bg-destructive"
        : trend === "unknown"
          ? "bg-muted-foreground/40"
          : "bg-amber-500"
  return (
    <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
      <span className={`h-1.5 w-1.5 rounded-full ${color}`} />
      <span>{label}</span>
    </span>
  )
}

function MetricCard({
  icon,
  label,
  value,
  suffix,
  trend,
  hint,
}: {
  icon: React.ReactNode
  label: string
  value: number | string
  suffix?: string
  trend: Trend
  hint: string
}) {
  const arrow =
    trend === "up" ? "↗" : trend === "down" ? "↘" : trend === "flat" ? "→" : "—"
  const arrowColor =
    trend === "up"
      ? "text-success"
      : trend === "down"
        ? "text-destructive"
        : "text-muted-foreground"
  return (
    <div className="rounded-lg border border-border bg-background p-3">
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
          {icon}
          {label}
        </span>
        <span className={`text-xs font-bold tabular-nums ${arrowColor}`}>{arrow}</span>
      </div>
      <p className="mt-1 text-lg font-bold tabular-nums">
        {value}
        {suffix && <span className="ml-1 text-xs font-normal text-muted-foreground">{suffix}</span>}
      </p>
      <p className="text-[10.5px] leading-tight text-muted-foreground">{hint}</p>
    </div>
  )
}

// ------------------------------------------------------------------
// Stats computation
// ------------------------------------------------------------------
interface HealthStats {
  activeMemberIds: Set<string>
  postsPerDay: number
  reactionsPerPost: number
  dauTrend: Trend
  postsTrend: Trend
  reactionsTrend: Trend
  lastActivityByMember: Map<string, number>
}

function computeHealthStats(
  members: Array<{ id: string }>,
  posts: BatchPost[],
): HealthStats {
  const now = Date.now()
  const windowStart = now - WINDOW_DAYS * DAY_MS
  const priorWindowStart = now - 2 * WINDOW_DAYS * DAY_MS

  const activeNow = new Set<string>()
  const activePrior = new Set<string>()
  let postsNow = 0
  let postsPrior = 0
  let reactionsNow = 0
  let reactionsPrior = 0
  const lastActivityByMember = new Map<string, number>()

  function bump(map: Map<string, number>, id: string, ts: number) {
    const prev = map.get(id) ?? 0
    if (ts > prev) map.set(id, ts)
  }

  for (const p of posts) {
    const t = Date.parse(p.createdAt)
    if (!Number.isFinite(t)) continue
    if (t >= windowStart) {
      postsNow++
      activeNow.add(p.authorId)
      bump(lastActivityByMember, p.authorId, t)
    } else if (t >= priorWindowStart) {
      postsPrior++
      activePrior.add(p.authorId)
    }
    for (const c of p.comments ?? []) {
      const ct = Date.parse(c.createdAt)
      if (!Number.isFinite(ct)) continue
      if (ct >= windowStart) {
        activeNow.add(c.authorId)
        bump(lastActivityByMember, c.authorId, ct)
      } else if (ct >= priorWindowStart) {
        activePrior.add(c.authorId)
      }
    }
    const reactionUsers = Object.values(p.reactions ?? {}).flat()
    for (const uid of reactionUsers) {
      // Reactions don't have timestamps; we count them against the
      // post's window. Imperfect, but the relative-trend signal is
      // what matters here, not absolute attribution.
      if (t >= windowStart) {
        reactionsNow++
        activeNow.add(uid)
        bump(lastActivityByMember, uid, t)
      } else if (t >= priorWindowStart) {
        reactionsPrior++
        activePrior.add(uid)
      }
    }
  }

  return {
    activeMemberIds: activeNow,
    postsPerDay: postsNow / WINDOW_DAYS,
    reactionsPerPost: postsNow === 0 ? 0 : reactionsNow / postsNow,
    dauTrend: trendBetween(activeNow.size, activePrior.size, members.length),
    postsTrend: trendBetween(postsNow, postsPrior),
    reactionsTrend: trendBetween(reactionsNow, reactionsPrior),
    lastActivityByMember,
  }
}

function trendBetween(current: number, prior: number, denom?: number): Trend {
  // Tiny denominators produce noisy trends — fall back to "unknown".
  if (current === 0 && prior === 0) return "unknown"
  if (denom !== undefined && denom < 5) return "unknown"
  if (prior === 0) return current > 0 ? "up" : "unknown"
  const delta = (current - prior) / prior
  if (delta > 0.05) return "up"
  if (delta < -0.05) return "down"
  return "flat"
}

function pickOverall(trends: Trend[]): Trend {
  if (trends.includes("down")) return "down"
  if (trends.every((t) => t === "unknown")) return "unknown"
  if (trends.includes("up")) return "up"
  return "flat"
}

// Re-export ambient User type so callers don't have to re-import it
// alongside this component just to type the members prop.
export type { User }
