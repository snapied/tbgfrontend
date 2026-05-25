"use client"

// Continue-where-you-left-off rail.
//
// One scroll-rail card on /dashboard that aggregates the four
// "you have unfinished business" signals across modules into a
// single eye-line:
//
//   • Recordings the user has in progress (last-played-first)
//   • Live classes scheduled in the next 24h (their context)
//   • Draft wrap-recap cards if the host ended a class but didn't
//     publish the recap
//   • Recently-edited courses (the operator's primary loop)
//
// Each tile deep-links to its source surface. Self-hides entirely
// when there's nothing pending — empty rails feel sad.

import Link from "next/link"
import { useMemo } from "react"
import {
  ArrowRight,
  BookOpen,
  CalendarClock,
  ClipboardList,
  Film,
  PlayCircle,
} from "lucide-react"
import { useLMS } from "@/lib/lms-store"
import { getAllProgress, formatRemaining } from "@/lib/recording-progress"

interface Tile {
  id: string
  kind: "resume" | "live-soon" | "draft-recap" | "recent-course"
  title: string
  meta: string
  href: string
  emoji: string
  progressPct?: number
}

export function ContinueRail() {
  const { liveSessions, courses, currentUser } = useLMS()

  const tiles = useMemo<Tile[]>(() => {
    const out: Tile[] = []

    // 1. Resume — in-progress recordings, last-played-first
    if (currentUser) {
      const progressMap = getAllProgress(currentUser.id)
      const inProgress = Object.entries(progressMap)
        .filter(([, p]) => !p.completed && p.positionSec > 0)
        .sort((a, b) => b[1].updatedAt.localeCompare(a[1].updatedAt))
        .slice(0, 4)
      for (const [rid, p] of inProgress) {
        const session = liveSessions.find((s) => s.id === rid)
        if (!session) continue
        const pct = p.durationSec > 0 ? Math.min(100, Math.round((p.positionSec / p.durationSec) * 100)) : 0
        out.push({
          id: `resume-${rid}`,
          kind: "resume",
          emoji: "📺",
          title: session.title,
          meta: formatRemaining(p) || "Continue watching",
          href: `/dashboard/recordings/${rid}`,
          progressPct: pct,
        })
      }
    }

    // 2. Live-soon — classes starting in next 24h
    const now = Date.now()
    const horizon = now + 24 * 3600 * 1000
    const upcoming = liveSessions
      .filter((s) => {
        const t = Date.parse(s.scheduledAt)
        return Number.isFinite(t) && t > now && t < horizon && s.status !== "cancelled"
      })
      .sort((a, b) => Date.parse(a.scheduledAt) - Date.parse(b.scheduledAt))
      .slice(0, 3)
    for (const s of upcoming) {
      const ms = Date.parse(s.scheduledAt) - now
      const mins = Math.round(ms / 60_000)
      const meta = mins < 60
        ? `Starts in ${mins} min`
        : `Starts in ${Math.round(mins / 60)}h`
      out.push({
        id: `live-${s.id}`,
        kind: "live-soon",
        emoji: "🟢",
        title: s.title,
        meta,
        href: `/dashboard/classes/${s.id}`,
      })
    }

    // 3. Draft recap — classes that ended but have no summary
    const draftRecaps = liveSessions
      .filter((s) => s.roomState === "ended" && s.roomEndedAt && !s.summary)
      .sort((a, b) => (b.roomEndedAt ?? "").localeCompare(a.roomEndedAt ?? ""))
      .slice(0, 2)
    for (const s of draftRecaps) {
      out.push({
        id: `recap-${s.id}`,
        kind: "draft-recap",
        emoji: "📝",
        title: `Finish recap: ${s.title}`,
        meta: "Wrap card pending publish",
        href: `/dashboard/classes/${s.id}`,
      })
    }

    // 4. Recent course — last-edited course (just one, as a context
    // pin for operators)
    const recentCourse = [...courses]
      .sort((a, b) => (b.updatedAt ?? b.createdAt ?? "").localeCompare(a.updatedAt ?? a.createdAt ?? ""))[0]
    if (recentCourse) {
      out.push({
        id: `course-${recentCourse.id}`,
        kind: "recent-course",
        emoji: "📚",
        title: recentCourse.title,
        meta: "Last edited",
        href: `/dashboard/courses/${recentCourse.id}`,
      })
    }

    return out.slice(0, 8)
  }, [liveSessions, courses, currentUser])

  if (tiles.length === 0) return null

  return (
    <section className="rounded-2xl border border-border bg-gradient-to-br from-primary/[0.03] via-card to-accent/[0.03] p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <PlayCircle className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-sm font-bold leading-tight">Pick up where you left off</h2>
            <p className="text-[11px] leading-tight text-muted-foreground">
              The work you haven&rsquo;t finished — across recordings, classes, and courses.
            </p>
          </div>
        </div>
        <Link
          href="/dashboard/recordings?sort=continue"
          className="hidden text-xs font-semibold text-primary hover:underline sm:inline-flex sm:items-center sm:gap-1"
        >
          All in-progress <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {/* Horizontal scroll rail — Netflix pattern. Each tile is
          ~260px wide; rail scrolls horizontally on mobile, wraps
          on desktop. */}
      <div className="-mx-1 flex gap-2.5 overflow-x-auto pb-2 pl-1 [scrollbar-width:thin] sm:flex-wrap sm:overflow-x-visible sm:pb-0">
        {tiles.map((t) => (
          <TileCard key={t.id} tile={t} />
        ))}
      </div>
    </section>
  )
}

function TileCard({ tile }: { tile: Tile }) {
  const accent = (() => {
    switch (tile.kind) {
      case "resume":        return { icon: <Film className="h-3.5 w-3.5" />, badge: "Resume", text: "text-primary", bg: "bg-primary/[0.08]", border: "border-primary/30" }
      case "live-soon":     return { icon: <CalendarClock className="h-3.5 w-3.5" />, badge: "Live soon", text: "text-emerald-700", bg: "bg-emerald-500/[0.08]", border: "border-emerald-500/30" }
      case "draft-recap":   return { icon: <ClipboardList className="h-3.5 w-3.5" />, badge: "Draft recap", text: "text-amber-700", bg: "bg-amber-500/[0.08]", border: "border-amber-500/30" }
      case "recent-course": return { icon: <BookOpen className="h-3.5 w-3.5" />, badge: "Recent", text: "text-violet-700", bg: "bg-violet-500/[0.08]", border: "border-violet-500/30" }
    }
  })()
  return (
    <Link
      href={tile.href}
      className={`group relative flex w-[260px] shrink-0 flex-col gap-2 rounded-xl border bg-card p-3 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md sm:w-auto sm:flex-[1_1_220px] ${accent.border}`}
    >
      <div className="flex items-center gap-1.5">
        <span className={`inline-flex items-center gap-1 rounded-full ${accent.bg} px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${accent.text}`}>
          {accent.icon}
          {accent.badge}
        </span>
        <span aria-hidden className="ml-auto text-base">{tile.emoji}</span>
      </div>
      <p className="line-clamp-2 text-sm font-semibold leading-snug">{tile.title}</p>
      <p className="text-[11px] text-muted-foreground">{tile.meta}</p>
      {tile.progressPct != null && (
        <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${tile.progressPct}%` }}
          />
        </div>
      )}
      <span className="mt-auto inline-flex items-center gap-1 text-[11px] font-semibold text-primary opacity-0 transition-opacity group-hover:opacity-100">
        Open <ArrowRight className="h-3 w-3" />
      </span>
    </Link>
  )
}
