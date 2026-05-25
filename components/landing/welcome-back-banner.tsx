"use client"

// Welcome-back banner for signed-in users on the marketing home (/).
//
// Why this exists: /` is auth-agnostic by design (marketing surface).
// But a signed-in operator visiting it sees the pitch for a product
// they already pay for — frustrating context switch. This banner
// flips the top of `/` into a workspace-first call to action when a
// session is present, while leaving the rest of the marketing page
// intact for users who land on `/` intentionally to share / re-read.
//
// Source of truth: `useLMS().currentUser` (already derived from the
// LMSProvider mounted in the root layout) + the soonest `liveSession`
// scheduled for today/tomorrow. No new fetch — same selectors used
// across the dashboard.
//
// Dismissal: a single localStorage key with a 7-day expiry. Cookies
// would be cleaner but require server-side rendering. The marketing
// page is already client-hydrated, so a localStorage gate is fine.

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { ArrowRight, CalendarClock, X } from "lucide-react"
import { useLMS } from "@/lib/lms-store"

const DISMISS_KEY = "thebigclass.home.welcomeback.dismissedUntil.v1"
const DISMISS_MS = 7 * 24 * 60 * 60 * 1000

export function WelcomeBackBanner() {
  const { currentUser, liveSessions } = useLMS()
  const [mounted, setMounted] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    setMounted(true)
    try {
      const raw = window.localStorage.getItem(DISMISS_KEY)
      if (raw) {
        const until = Number(raw)
        if (Number.isFinite(until) && until > Date.now()) setDismissed(true)
      }
    } catch { /* localStorage unavailable (private mode) — render banner */ }
  }, [])

  // Soonest upcoming live session for this user (host or enrolled).
  // We use a permissive filter — if the user is signed in at all,
  // show them the next live session in their workspace. Per-user
  // filtering would require a join across enrollments; for the
  // home-page hook, "next in workspace" is good enough and the
  // dashboard does the precise filtering.
  const nextSession = useMemo(() => {
    if (!currentUser) return null
    const now = Date.now()
    return liveSessions
      .filter((s) => {
        const t = new Date(s.scheduledAt).getTime()
        return Number.isFinite(t) && t > now
      })
      .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())[0] ?? null
  }, [currentUser, liveSessions])

  if (!mounted) return null
  if (!currentUser) return null
  if (dismissed) return null

  const minutesUntil = nextSession
    ? Math.round((new Date(nextSession.scheduledAt).getTime() - Date.now()) / 60000)
    : null

  const sessionLabel = (() => {
    if (!nextSession || minutesUntil == null) return null
    if (minutesUntil <= 60) return `in ${minutesUntil} min`
    if (minutesUntil <= 60 * 24) return `in ${Math.round(minutesUntil / 60)}h`
    return new Date(nextSession.scheduledAt).toLocaleDateString(undefined, {
      weekday: "short",
      hour: "numeric",
      minute: "2-digit",
    })
  })()

  return (
    <div className="sticky top-0 z-40 border-b border-primary/20 bg-gradient-to-r from-primary/10 via-primary/[0.04] to-accent/10 backdrop-blur supports-[backdrop-filter]:bg-primary/[0.04]">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2.5 sm:px-6 lg:px-8">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
          <span className="text-sm font-semibold">
            {(currentUser.name ?? "?")
              .split(" ")
              .map((p) => p[0])
              .join("")
              .slice(0, 2)
              .toUpperCase()}
          </span>
        </div>
        <div className="min-w-0 flex-1 text-sm">
          <p className="truncate">
            <span className="font-semibold text-foreground">
              Welcome back, {currentUser.name?.split(" ")[0] ?? "there"}.
            </span>{" "}
            {nextSession ? (
              <span className="text-muted-foreground">
                <CalendarClock className="mr-1 inline h-3.5 w-3.5 -translate-y-0.5" />
                {nextSession.title} · {sessionLabel}
              </span>
            ) : (
              <span className="text-muted-foreground">
                Nothing scheduled — pick up where you left off.
              </span>
            )}
          </p>
        </div>
        <Link
          href="/dashboard"
          className="inline-flex shrink-0 items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Open dashboard
          <ArrowRight className="h-3 w-3" />
        </Link>
        <button
          type="button"
          aria-label="Dismiss"
          className="shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-background/60 hover:text-foreground"
          onClick={() => {
            try {
              window.localStorage.setItem(DISMISS_KEY, String(Date.now() + DISMISS_MS))
            } catch { /* private mode — dismissal is just for this session */ }
            setDismissed(true)
          }}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}
