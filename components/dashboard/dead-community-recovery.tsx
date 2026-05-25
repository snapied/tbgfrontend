"use client"

// Dead-community recovery banner.
//
// Conditions to surface:
//   • Host-only (admin / instructor / batch owner). Members shouldn't
//     see the host's "is this dying?" cue.
//   • Community has >5 members (smaller is "just started" not "dying").
//   • No posts AT ALL in the last 14 days OR no posts ever and the
//     batch was created >14 days ago.
//   • Banner can be dismissed for 7 days via localStorage so the host
//     gets a fresh nag if it keeps drifting.
//
// Three one-click actions:
//   1. "Send a 'we miss you' announcement" — opens the composer
//      pre-filled with a templated draft the host can edit/send.
//   2. "Schedule a Q&A session" — deep-links to /dashboard/classes/new
//      with the course pre-selected and a sensible title prefilled.
//   3. "Archive for now" — soft-archives the batch (recoverable via
//      the trash for 7d via the existing pushToTrash pattern).

import { useEffect, useState } from "react"
import Link from "next/link"
import { Archive, Megaphone, MoonStar, Sparkles, Video, X } from "lucide-react"
import { readCurrentTenantSlug } from "@/lib/tenant-store"

interface Props {
  batchId: string
  batchName: string
  memberCount: number
  /** ISO timestamp of the most recent post in this batch (any author,
   *  any space). Null when the batch has never had a post. */
  lastPostAtIso: string | null
  /** ISO timestamp the batch was created. Falls back to lastPostAtIso
   *  if the batch record doesn't store createdAt. */
  createdAtIso?: string
  /** Optional course id — when present, "Schedule a Q&A" deep-links
   *  the new-class form with this course preselected. */
  courseId?: string
  /** Called when the host clicks "Send 'we miss you'". Parent typically
   *  opens its own announcement composer pre-filled with the draft. */
  onSendMissYou: (draft: string) => void
  /** Called when the host clicks "Archive". Parent typically calls
   *  deleteStudentGroup (soft-delete via pushToTrash) and routes back
   *  to /dashboard/batches. */
  onArchive: () => void
}

const DISMISS_KEY = (slug: string, batchId: string) =>
  `thebigclass.t.${slug}.host.deadCommunityDismissedUntil.${batchId}.v1`
const DISMISS_MS = 7 * 24 * 60 * 60 * 1000
const QUIET_THRESHOLD_DAYS = 14
const MIN_MEMBERS = 5

export function DeadCommunityRecoveryBanner({
  batchId,
  batchName,
  memberCount,
  lastPostAtIso,
  createdAtIso,
  courseId,
  onSendMissYou,
  onArchive,
}: Props) {
  const [mounted, setMounted] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    setMounted(true)
    const slug = readCurrentTenantSlug()
    if (!slug) return
    try {
      const raw = window.localStorage.getItem(DISMISS_KEY(slug, batchId))
      if (raw) {
        const until = Number(raw)
        if (Number.isFinite(until) && until > Date.now()) setDismissed(true)
      }
    } catch { /* private mode — render banner anyway */ }
  }, [batchId])

  if (!mounted || dismissed) return null
  if (memberCount < MIN_MEMBERS) return null

  // "Days since signal" — the most recent of (last post, batch
  // creation). If both are missing we can't reason about staleness,
  // so we hide the banner.
  const anchorIso = lastPostAtIso ?? createdAtIso ?? null
  if (!anchorIso) return null
  const anchorMs = Date.parse(anchorIso)
  if (!Number.isFinite(anchorMs)) return null
  const daysSince = (Date.now() - anchorMs) / (24 * 60 * 60 * 1000)
  if (daysSince < QUIET_THRESHOLD_DAYS) return null

  const headline = lastPostAtIso
    ? `${batchName} has been quiet for ${Math.floor(daysSince)} days.`
    : `${batchName} hasn't seen a single post yet.`

  const draft =
    `Hey ${batchName} — I've been heads-down on what's coming next, but I want to hear from you. ` +
    `What's been hard recently? What clicked? Drop a comment below — even one word counts.`

  function dismiss() {
    const slug = readCurrentTenantSlug()
    if (slug) {
      try {
        window.localStorage.setItem(DISMISS_KEY(slug, batchId), String(Date.now() + DISMISS_MS))
      } catch { /* ignore */ }
    }
    setDismissed(true)
  }

  return (
    <div className="rounded-xl border border-amber-500/40 bg-gradient-to-br from-amber-50 to-amber-100/30 p-4 dark:from-amber-950/30 dark:to-amber-900/10">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-700">
            <MoonStar className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-sm font-semibold text-amber-900 dark:text-amber-100">
              <Sparkles className="h-3.5 w-3.5" />
              {headline}
            </p>
            <p className="mt-0.5 text-[12px] text-amber-800/80 dark:text-amber-200/70">
              Want to wake it up? Pick one — none of these are permanent.
            </p>
          </div>
        </div>
        <button
          type="button"
          aria-label="Hide for 7 days"
          className="-mr-1 -mt-1 rounded-md p-1.5 text-amber-700/70 transition-colors hover:bg-amber-500/10 hover:text-amber-900"
          onClick={dismiss}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <button
          type="button"
          onClick={() => onSendMissYou(draft)}
          className="group flex flex-col items-start gap-1 rounded-lg border border-amber-500/30 bg-white/70 p-3 text-left transition-all hover:-translate-y-0.5 hover:border-amber-500 hover:shadow-sm dark:bg-background/40"
        >
          <span className="inline-flex items-center gap-1.5 text-[12px] font-bold text-amber-900 dark:text-amber-100">
            <Megaphone className="h-3.5 w-3.5" />
            Send a &ldquo;we miss you&rdquo;
          </span>
          <span className="text-[11px] text-amber-800/80 dark:text-amber-200/70">
            We&apos;ll draft it — you tweak and send.
          </span>
        </button>
        <Link
          href={
            courseId
              ? `/dashboard/classes/new?courseId=${courseId}&title=Q%26A%20%E2%80%94%20${encodeURIComponent(batchName)}`
              : `/dashboard/classes/new?title=Q%26A%20%E2%80%94%20${encodeURIComponent(batchName)}`
          }
          className="group flex flex-col items-start gap-1 rounded-lg border border-amber-500/30 bg-white/70 p-3 text-left transition-all hover:-translate-y-0.5 hover:border-amber-500 hover:shadow-sm dark:bg-background/40"
        >
          <span className="inline-flex items-center gap-1.5 text-[12px] font-bold text-amber-900 dark:text-amber-100">
            <Video className="h-3.5 w-3.5" />
            Schedule a Q&amp;A
          </span>
          <span className="text-[11px] text-amber-800/80 dark:text-amber-200/70">
            A 30-min session pulls everyone back in.
          </span>
        </Link>
        <button
          type="button"
          onClick={onArchive}
          className="group flex flex-col items-start gap-1 rounded-lg border border-border bg-white/70 p-3 text-left transition-all hover:-translate-y-0.5 hover:border-destructive/40 hover:shadow-sm dark:bg-background/40"
        >
          <span className="inline-flex items-center gap-1.5 text-[12px] font-bold text-foreground">
            <Archive className="h-3.5 w-3.5" />
            Archive for now
          </span>
          <span className="text-[11px] text-muted-foreground">
            Hide from the list. Recover any time from trash.
          </span>
        </button>
      </div>
    </div>
  )
}
