"use client"

// First-visit-per-batch onboarding overlay for community members.
//
// Surfaces a 4-stop centered overlay the very first time a member
// lands on a batch detail page. Each stop covers one thing the
// member needs to know to stop feeling lost:
//
//   1. Who teaches here (instructors)
//   2. Where the next live class is (Classes tab)
//   3. How to introduce themselves (intro template)
//   4. How loud the cohort will be (notification preferences)
//
// We deliberately don't use a tour library — a 4-step modal with
// Next / Skip / Done buttons is simpler, doesn't require DOM
// highlighting, and works on mobile without quirks.
//
// Storage: localStorage key per-(user, batch). Once dismissed or
// finished, it never reappears.

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  ArrowRight,
  Bell,
  CalendarClock,
  Check,
  GraduationCap,
  Sparkles,
  Users,
  X,
} from "lucide-react"
import { readCurrentTenantSlug } from "@/lib/tenant-store"

interface Props {
  userId: string | undefined
  batchId: string
  batchName: string
  instructorNames: string[]
  hasUpcomingClass: boolean
  onIntroAction?: () => void
}

const STORAGE_KEY = (slug: string, userId: string, batchId: string) =>
  `thebigclass.t.${slug}.user.${userId}.community.onboarded.${batchId}.v1`

const STOPS = [
  { id: "instructors", icon: GraduationCap, accent: "from-violet-500/15 to-purple-500/[0.04]" },
  { id: "classes",     icon: CalendarClock, accent: "from-primary/15 to-primary/[0.04]" },
  { id: "intro",       icon: Sparkles,      accent: "from-emerald-500/15 to-emerald-500/[0.04]" },
  { id: "notify",      icon: Bell,          accent: "from-amber-500/15 to-amber-500/[0.04]" },
] as const

export function CommunityMemberOnboarding({
  userId,
  batchId,
  batchName,
  instructorNames,
  hasUpcomingClass,
  onIntroAction,
}: Props) {
  const [mounted, setMounted] = useState(false)
  const [step, setStep] = useState(0)
  const [done, setDone] = useState(false)

  useEffect(() => {
    setMounted(true)
    if (typeof window === "undefined") return
    if (!userId) return
    const slug = readCurrentTenantSlug()
    if (!slug) return
    try {
      const seen = window.localStorage.getItem(STORAGE_KEY(slug, userId, batchId))
      if (seen === "1") setDone(true)
    } catch { /* private mode — show once per page-load */ }
  }, [userId, batchId])

  function finish() {
    const slug = readCurrentTenantSlug()
    if (slug && userId) {
      try {
        window.localStorage.setItem(STORAGE_KEY(slug, userId, batchId), "1")
      } catch { /* ignore */ }
    }
    setDone(true)
  }

  // ESC to dismiss
  useEffect(() => {
    if (done || !mounted) return
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") finish()
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done, mounted])

  if (!mounted || done || !userId) return null

  const current = STOPS[step]
  const isLast = step === STOPS.length - 1

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="member-onb-title"
      className="fixed inset-0 z-[150] flex items-center justify-center px-4"
    >
      <button
        type="button"
        aria-label="Dismiss onboarding"
        className="absolute inset-0 bg-background/75 backdrop-blur-sm"
        onClick={finish}
      />

      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
        <div className={`h-1 bg-gradient-to-r ${current.accent.replace(/from-|to-|\/.*$/g, "").trim()}`} />

        {/* Step progress dots + close */}
        <div className="flex items-center justify-between border-b border-border/60 px-5 py-3">
          <div className="flex items-center gap-1.5">
            {STOPS.map((_, i) => (
              <span
                key={i}
                aria-hidden
                className={`h-1.5 rounded-full transition-all ${
                  i === step ? "w-6 bg-primary" : i < step ? "w-1.5 bg-primary/60" : "w-1.5 bg-border"
                }`}
              />
            ))}
            <span className="ml-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Step {step + 1} of {STOPS.length}
            </span>
          </div>
          <button
            type="button"
            onClick={finish}
            aria-label="Skip onboarding"
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className={`bg-gradient-to-br ${current.accent} px-6 py-7`}>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-card text-primary shadow-sm">
            <current.icon className="h-6 w-6" />
          </div>
        </div>

        <div className="space-y-3 px-6 pb-6 pt-4">
          <StepBody
            stop={current.id}
            batchName={batchName}
            instructorNames={instructorNames}
            hasUpcomingClass={hasUpcomingClass}
            onIntroAction={() => {
              onIntroAction?.()
              finish()
            }}
          />
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-border/60 bg-muted/30 px-5 py-3">
          <button
            type="button"
            onClick={finish}
            className="text-xs font-semibold text-muted-foreground hover:text-foreground"
          >
            Skip
          </button>
          <div className="flex items-center gap-2">
            {step > 0 && (
              <button
                type="button"
                onClick={() => setStep((s) => Math.max(0, s - 1))}
                className="rounded-md border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:border-primary/40"
              >
                Back
              </button>
            )}
            <button
              type="button"
              onClick={() => (isLast ? finish() : setStep((s) => s + 1))}
              className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground transition-transform hover:scale-[1.02]"
              autoFocus
            >
              {isLast ? (
                <>
                  <Check className="h-3.5 w-3.5" /> Done
                </>
              ) : (
                <>
                  Next <ArrowRight className="h-3.5 w-3.5" />
                </>
              )}
            </button>
          </div>
        </div>

        <p id="member-onb-title" className="sr-only">
          Welcome to {batchName}
        </p>
      </div>
    </div>
  )
}

function StepBody({
  stop,
  batchName,
  instructorNames,
  hasUpcomingClass,
  onIntroAction,
}: {
  stop: typeof STOPS[number]["id"]
  batchName: string
  instructorNames: string[]
  hasUpcomingClass: boolean
  onIntroAction: () => void
}) {
  if (stop === "instructors") {
    return (
      <>
        <h2 className="text-xl font-bold">Welcome to {batchName} 👋</h2>
        <p className="text-sm text-muted-foreground">
          {instructorNames.length > 0 ? (
            <>
              <span className="font-semibold text-foreground">
                {instructorNames.slice(0, 2).join(" and ")}
                {instructorNames.length > 2 && ` +${instructorNames.length - 2}`}
              </span>{" "}
              teach here. Tag them with @ any time you need help.
            </>
          ) : (
            "Your instructors will introduce themselves in the feed shortly."
          )}
        </p>
        <p className="rounded-md border border-border bg-muted/30 px-3 py-2 text-xs text-foreground/80">
          <Users className="mr-1 inline h-3 w-3 text-primary" />
          The Instructors card lives pinned above the feed so you always know who&rsquo;s in charge.
        </p>
      </>
    )
  }
  if (stop === "classes") {
    return (
      <>
        <h2 className="text-xl font-bold">Your live classes are one tab away.</h2>
        <p className="text-sm text-muted-foreground">
          {hasUpcomingClass ? (
            <>
              The <span className="font-semibold text-foreground">Classes tab</span> shows the next live session,
              past recordings (with watched / unwatched badges), and a one-tap Join when the room opens.
            </>
          ) : (
            <>
              The <span className="font-semibold text-foreground">Classes tab</span> will list your live sessions
              and recordings as soon as your host schedules one.
            </>
          )}
        </p>
        <p className="rounded-md border border-border bg-muted/30 px-3 py-2 text-xs text-foreground/80">
          <CalendarClock className="mr-1 inline h-3 w-3 text-primary" />
          When a class goes live, a sticky bar appears at the top of the feed — you can&rsquo;t miss it.
        </p>
      </>
    )
  }
  if (stop === "intro") {
    return (
      <>
        <h2 className="text-xl font-bold">Introduce yourself in the feed.</h2>
        <p className="text-sm text-muted-foreground">
          The fastest way to feel like part of the cohort: drop a one-line intro with your name,
          where you&rsquo;re tuning in from, and one thing you&rsquo;re trying to build.
        </p>
        <button
          type="button"
          onClick={onIntroAction}
          className="flex w-full items-center justify-between gap-2 rounded-md border border-primary bg-primary/[0.04] px-3 py-2 text-left text-xs font-semibold text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
        >
          <span>Open the composer pre-filled with a template</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </>
    )
  }
  // notify
  return (
    <>
      <h2 className="text-xl font-bold">How often should we ping you?</h2>
      <p className="text-sm text-muted-foreground">
        Default: <span className="font-semibold text-foreground">@mentions + replies + announcements</span>.
        Loud enough not to miss real signals, quiet enough not to drown.
      </p>
      <p className="rounded-md border border-border bg-muted/30 px-3 py-2 text-xs text-foreground/80">
        <Bell className="mr-1 inline h-3 w-3 text-primary" />
        The bell icon in the community header lets you change levels or snooze for 24h any time.
      </p>
      <Link
        href="/help/community-classes-tab"
        className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
      >
        See the help doc
        <ArrowRight className="h-3 w-3" />
      </Link>
    </>
  )
}
