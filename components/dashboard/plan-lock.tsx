"use client"

// Plan-restriction lock + gate primitives. Used everywhere a feature
// isn't on the user's current plan — small lock icon with a popover
// that explains what they'd get + a one-click "Upgrade" CTA.
//
// Three flavours:
//   <PlanLockIcon feature="customDomain" /> — inline ✱ on a button label
//   <PlanFeatureGate feature="marketingTools">…</PlanFeatureGate>
//                                      — wraps a whole feature block
//   <PlanLimitWarning metric="students" current={n} />
//                                      — usage-bar style "X of Y used,
//                                        upgrade for more" reminder

import Link from "next/link"
import { Lock, Sparkles, ArrowRight } from "lucide-react"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { usePlan } from "@/lib/use-plan"
import { PLANS, type PlanId, type PlanLimits } from "@/lib/plans"

// ────────────────────────────────────────────────────────────────────
// Display strings for each gate-able feature. Centralised so the same
// copy shows up regardless of which call-site triggered the popover.
// ────────────────────────────────────────────────────────────────────

interface FeatureMeta {
  label: string
  description: string
  /** Lowest plan that includes this feature. */
  minPlan: PlanId
}

const FEATURE_COPY: Partial<Record<keyof PlanLimits, FeatureMeta>> = {
  multilingual: {
    label: "Multilingual portal",
    description:
      "10-language portal (English + 9 Indian languages) with a header language picker and per-tenant translation overrides for your own CTAs, page nav labels, and footer columns.",
    minPlan: "pro",
  },
  apiAccess: {
    label: "REST API + webhooks",
    description:
      "Programmatic access to your workspace — issue API keys, subscribe to webhook events (lead.created, enrolment.created, payment.captured, …), and integrate with your CRM / data warehouse. Included on Institute as part of the developer plan.",
    minPlan: "institute",
  },
  customDomain: {
    label: "Custom domain",
    description:
      "Run your portal on your own domain (yoursite.com) instead of a thebigclass.com subdomain.",
    minPlan: "pro",
  },
  whiteLabel: {
    label: "White-label your portal",
    description:
      "Strip \"Powered by The Big Class\" from your footer and every other platform-branded element so visitors only see your brand.",
    minPlan: "pro",
  },
  transcripts: {
    label: "Live captions + transcripts",
    description:
      "In-call captions during live classes plus auto-transcripts on every recording (Whisper). The transcript appears alongside each recording in the dashboard and the .vtt sidecar drives the player's CC button.",
    minPlan: "studio",
  },
  customCertificates: {
    label: "Custom certificate designer",
    description:
      "Design your own certificate templates with the drag-and-drop canvas editor instead of using the fixed ones.",
    minPlan: "pro",
  },
  dripUnlock: {
    label: "Drip + scheduled lessons",
    description:
      "Release lessons over time (every 3 days, every Monday, etc.) instead of unlocking everything on enrolment.",
    minPlan: "pro",
  },
  whatsappNotifications: {
    label: "WhatsApp Business notifications",
    description:
      "Send class reminders, drip messages, and certificate notifications via WhatsApp Business API.",
    minPlan: "studio",
  },
  marketingTools: {
    label: "Marketing toolkit",
    description:
      "Coupons, drip emails, abandoned-cart, and referral rewards. The growth lever between hobby and business.",
    minPlan: "pro",
  },
  watermark: {
    label: "Recordings without watermark",
    description:
      "Paid plans get clean recordings — no \"The Big Class · Free plan\" stamp in the corner.",
    minPlan: "pro",
  },
  analytics: {
    label: "Advanced analytics",
    description:
      "Cohort retention, revenue trends, completion funnels, and CSV exports. Goes beyond the Starter's basic counters.",
    minPlan: "studio",
  },
  storefrontProducts: {
    label: "More storefront products",
    description:
      "Sell more than your current cap — courses, downloads, memberships, one-on-ones, bundles.",
    minPlan: "pro",
  },
  students: {
    label: "More students",
    description:
      "Raise the active-student cap so you can keep enrolling without bumping the ceiling.",
    minPlan: "pro",
  },
  teachers: {
    label: "More Instructor seats",
    description:
      "Add co-instructors so they can build courses, grade work, and run their own communities.",
    minPlan: "pro",
  },
  publishedCourses: {
    label: "More published courses",
    description:
      "Publish past your current cap. Drafts and archived courses don't count.",
    minPlan: "pro",
  },
  batches: {
    label: "More communities",
    description:
      "Run more communities in parallel — each with its own feed, members, access settings, leaderboard, and live schedule.",
    minPlan: "pro",
  },
  storageGB: {
    label: "More recording storage",
    description:
      "Raise your recording-storage cap. Starter is 2 GB; Pro is 100 GB; Studio is 1 TB; Institute is unlimited.",
    minPlan: "pro",
  },
  retentionDays: {
    label: "Longer recording retention",
    description:
      "Hold recordings longer before automatic cleanup. Starter retains 30 days; paid plans keep recordings indefinitely (or per your contract).",
    minPlan: "pro",
  },
  liveClassesPerWeek: {
    label: "More live classes per week",
    description:
      "Starter caps at 1 class/week. Pro and above remove the weekly cap so you can run cohorts, office hours, and daily classes.",
    minPlan: "pro",
  },
  liveClassMaxMinutes: {
    label: "Longer live classes",
    description:
      "Starter classes cap at 60 minutes. Paid plans run up to 4 hours per session (or unlimited on Institute).",
    minPlan: "pro",
  },
}

// ────────────────────────────────────────────────────────────────────
// <PlanLockIcon> — inline indicator + popover. Use next to a label
// that you want to mark as locked.
// ────────────────────────────────────────────────────────────────────

export function PlanLockIcon({
  feature,
  className,
}: {
  feature: keyof PlanLimits
  className?: string
}) {
  const { isAllowed } = usePlan()
  if (isAllowed(feature)) return null
  return <PlanLockPopover feature={feature} className={className} />
}

// ────────────────────────────────────────────────────────────────────
// <PlanFeatureGate> — wraps content. If the feature is allowed, just
// renders children. If not, renders the children as a non-interactive
// preview (dimmed + blurred) with a sticky upgrade card pinned on
// top so the user always sees BOTH "what the feature looks like" and
// "how to unlock it". No click needed to read the upgrade message.
//
// The same component handles full-page modules AND inline blocks —
// the visual treatment is identical, only the dimensions vary
// with the content that's wrapped.
// ────────────────────────────────────────────────────────────────────

export function PlanFeatureGate({
  feature,
  children,
}: {
  feature: keyof PlanLimits
  children: React.ReactNode
}) {
  const { isAllowed, hydrated } = usePlan()
  // Wait for the plan to hydrate from the backend before deciding —
  // otherwise the first paint shows the "locked" card even for
  // entitled users and then flickers back to content.
  if (!hydrated) return null
  if (isAllowed(feature)) return <>{children}</>

  return (
    <div className="relative isolate">
      {/* Preview — the actual feature, dimmed + blurred + non-interactive.
          We keep it in the DOM (rather than swapping for a placeholder)
          so the user sees a real picture of what they'd get. */}
      <div
        className="pointer-events-none select-none opacity-45 blur-[1.5px] saturate-75"
        aria-hidden
        // The preview must not capture keyboard focus either — pulling
        // tabIndex=-1 on every descendant via inert is the cleanest
        // way to do that without rewriting every inner control.
        ref={(el) => {
          if (el) el.setAttribute("inert", "")
        }}
      >
        {children}
      </div>

      {/* Overlay — gradient backdrop + sticky upgrade card. The wrapper
          has `pointer-events-none` so scroll passes through to the page
          body; only the card itself is interactive. Sticky keeps the
          card visible as the user scrolls down long previews. */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background/60 via-background/80 to-background/95">
        <div className="sticky top-16 flex justify-center px-4 pt-8">
          <div className="pointer-events-auto w-full max-w-xl">
            <PlanGatedCard feature={feature} />
          </div>
        </div>
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────
// <PlanGatedCard> — visible-by-default upgrade card. Drops in as the
// whole content of a page when the user's plan doesn't include the
// feature. No click required to read the message — the lock icon,
// the required-plan pill, the description, and the Upgrade CTA are
// all on screen immediately.
// ────────────────────────────────────────────────────────────────────

export function PlanGatedCard({
  feature,
  className,
}: {
  feature: keyof PlanLimits
  className?: string
}) {
  const { plan } = usePlan()
  const copy = FEATURE_COPY[feature]
  // Defensive fallback so a missing FEATURE_COPY entry never renders
  // an empty page — the user opened a paid page and deserves to see
  // SOMETHING that explains why they can't use it.
  const label = copy?.label ?? "Paid feature"
  const description =
    copy?.description ??
    "This feature is included on the paid plans. Upgrade your workspace to use it."
  const minPlan = copy?.minPlan ?? "pro"
  const requiredPlanName = PLANS[minPlan]?.name ?? "Pro"
  const currentPlanName = PLANS[plan]?.name ?? "Starter"

  return (
    <div
      className={cn(
        // No explicit max-width here — when used as the overlay inside
        // <PlanFeatureGate> the parent wrapper sets the width. When
        // used standalone (e.g. inside a Card), it fills its container.
        "flex flex-col items-center gap-4 rounded-xl border border-amber-500/40 bg-card p-8 text-center shadow-lg backdrop-blur-md",
        className,
      )}
    >
      <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/15 text-amber-600">
        <Lock className="h-5 w-5" />
      </div>
      <div className="space-y-1">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">
          Paid feature · Included in {requiredPlanName}
        </p>
        <h2 className="text-xl font-bold tracking-tight">{label}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <p className="text-xs text-muted-foreground">
        You&apos;re on <span className="font-semibold text-foreground">{currentPlanName}</span>.
        Upgrade unlocks this feature instantly and starts a 14-day free trial of {requiredPlanName} — cancel before day 14 and you&apos;re never charged.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button asChild className="gap-1.5">
          <Link href="/dashboard/billing">
            Start 14-day trial of {requiredPlanName} <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href="/pricing">Compare plans</Link>
        </Button>
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────
// <PlanLimitHint> — always-visible "X/Y on Starter" chip rendered
// next to the create action it gates. The complement to
// <PlanLimitWarning> below: that one shouts at ≥80%; this one
// quietly tells the user the cap exists even when they're at 1/50,
// so the wall is never a surprise.
//
// Hidden when:
//   • the limit is Infinity (current plan has no cap on this metric)
//   • the plan hasn't hydrated yet (no flicker on first paint)
//
// Tone scales with proximity:
//   under 60%  → muted ("Quiz: 4/25 on Starter")
//   60-99%    → amber ("Quizzes: 22/25 on Starter — close to cap")
//   ≥100%     → red    ("Quizzes: 25/25 — upgrade to add more")
// ────────────────────────────────────────────────────────────────────

export function PlanLimitHint({
  metric,
  current,
  /** Human label — singular noun. We pluralise on count > 1. */
  noun = "item",
  className,
}: {
  metric: "students" | "teachers" | "batches" | "publishedCourses" | "storefrontProducts" | "liveClassesPerWeek"
  current: number
  noun?: string
  className?: string
}) {
  const { hydrated, plan, limits } = usePlan()
  if (!hydrated) return null
  const cap = limits[metric]
  if (typeof cap !== "number" || !Number.isFinite(cap)) return null

  const planName = PLANS[plan]?.name ?? "your plan"
  const ratio = cap > 0 ? current / cap : 1
  const atOrOver = current >= cap
  const near = !atOrOver && ratio >= 0.6
  // Pluralise the label when the count isn't exactly 1. Naive but
  // good enough for "Quiz" / "Quizzes", "Class" / "Classes",
  // "Course" / "Courses", "Student" / "Students".
  const label = (() => {
    if (current === 1) return noun
    if (/s$|x$|z$/i.test(noun)) return noun + "es"
    if (/y$/i.test(noun) && !/[aeiou]y$/i.test(noun)) return noun.slice(0, -1) + "ies"
    return noun + "s"
  })()

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium",
        atOrOver
          ? "border-destructive/30 bg-destructive/10 text-destructive"
          : near
            ? "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400"
            : "border-border bg-muted/40 text-muted-foreground",
        className,
      )}
      title={`${current} of ${cap} ${label.toLowerCase()} used on the ${planName} plan`}
    >
      {atOrOver && <Lock className="h-3 w-3" />}
      <span>
        {label}: {current}/{cap} on {planName}
      </span>
      {(atOrOver || near) && (
        <Link
          href="/dashboard/billing"
          className="font-semibold underline-offset-2 hover:underline"
        >
          Upgrade
        </Link>
      )}
    </span>
  )
}

// ────────────────────────────────────────────────────────────────────
// <PlanLimitWarning> — soft warning when usage is over 80% of cap.
// Use this *next to* the usage UI itself (e.g. "12 / 50 students").
// ────────────────────────────────────────────────────────────────────

export function PlanLimitWarning({
  metric,
  current,
  className,
}: {
  metric: "students" | "teachers" | "batches" | "publishedCourses" | "storefrontProducts"
  current: number
  className?: string
}) {
  const { usageRemaining, limits } = usePlan()
  const remaining = usageRemaining(metric, current)
  if (remaining === Infinity) return null
  const cap = limits[metric] as number
  const overOrAt = remaining <= 0
  const near = !overOrAt && current / cap >= 0.8
  if (!overOrAt && !near) return null
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium",
        overOrAt
          ? "border-destructive/30 bg-destructive/10 text-destructive"
          : "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400",
        className,
      )}
    >
      <Lock className="h-3 w-3" />
      <span>
        {overOrAt
          ? `Cap reached (${current}/${cap})`
          : `${current}/${cap} used`}
      </span>
      <Link href="/dashboard/billing" className="font-semibold underline-offset-2 hover:underline">
        Upgrade
      </Link>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────
// Shared popover body — the actual "locked, here's why, upgrade" UI.
// ────────────────────────────────────────────────────────────────────

function PlanLockPopover({
  feature,
  className,
  variant = "icon",
}: {
  feature: keyof PlanLimits
  className?: string
  variant?: "icon" | "card"
}) {
  const copy = FEATURE_COPY[feature]
  if (!copy) {
    // Fall back to a generic message so we never render nothing.
    return null
  }
  const minPlan = PLANS[copy.minPlan]

  return (
    <Popover>
      <PopoverTrigger asChild>
        {variant === "icon" ? (
          <button
            type="button"
            aria-label={`${copy.label} is locked on your plan`}
            className={cn(
              "inline-flex h-5 w-5 items-center justify-center rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-700 transition hover:bg-amber-500/20",
              className,
            )}
          >
            <Lock className="h-3 w-3" />
          </button>
        ) : (
          <button
            type="button"
            className={cn(
              "flex items-center gap-2 rounded-lg border border-amber-500/40 bg-card px-4 py-2 text-sm font-medium shadow-sm transition hover:border-amber-500 hover:shadow-md",
              className,
            )}
          >
            <Lock className="h-4 w-4 text-amber-600" />
            {copy.label} — upgrade to {minPlan.name}
          </button>
        )}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-amber-500/15 text-amber-600">
              <Sparkles className="h-3.5 w-3.5" />
            </div>
            <div>
              <p className="text-sm font-semibold">{copy.label}</p>
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Included in {minPlan.name}
              </p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">{copy.description}</p>
          <Button asChild size="sm" className="w-full gap-1.5">
            <Link href="/dashboard/billing">
              Upgrade to {minPlan.name} <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
