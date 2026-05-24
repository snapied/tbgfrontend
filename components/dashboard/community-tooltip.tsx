"use client"

// Multipurpose "what is a Community?" hover popover. The Communities
// nav entry, the "New community" button, and any other community-
// CTA surface wrap their content in <CommunityTooltip>...</>  to
// surface a polished explainer.
//
// Built on Radix HoverCard (not Popover) — HoverCard handles the
// open-on-hover + close-on-leave + grace-period semantics natively,
// so we don't oscillate when the cursor moves trigger → content or
// when it exits the content area. The earlier hand-rolled
// Popover + mouseEnter/Leave approach flickered because the close
// timer would fire before the content's enter handler could cancel
// it across the trigger ↔ content boundary.

import * as React from "react"
import {
  Users2,
  GraduationCap,
  CalendarRange,
  Compass,
  Heart,
  ShieldCheck,
  Sparkles,
  ArrowRight,
} from "lucide-react"
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card"
import Link from "next/link"

const POINTS: Array<{
  Icon: typeof Users2
  label: string
  body: string
  tone: "primary" | "accent" | "amber" | "success" | "muted"
}> = [
  {
    Icon: GraduationCap,
    label: "A class of students",
    body: "Group students taking the same course together — they share a feed and announcements.",
    tone: "primary",
  },
  {
    Icon: CalendarRange,
    label: "A batch or intake",
    body: "January batch, JEE Mains 2026, scholarship round 3 — members + posts scoped per intake.",
    tone: "accent",
  },
  {
    Icon: Compass,
    label: "A group of common interest",
    body: "Alumni, mentors, beta testers, study circle — anyone who wants to talk under a shared theme.",
    tone: "amber",
  },
  {
    Icon: Heart,
    label: "A staff or peer room",
    body: "Instructors-only chats, working groups, after-class hangouts. Flip the &ldquo;teachers-only&rdquo; flag in access settings.",
    tone: "success",
  },
  {
    Icon: ShieldCheck,
    label: "Open, invite-link, or tag-gated",
    body: "Pick how new members join — open to the workspace, restricted to invitees, or gated by user tags (WhatsApp-style).",
    tone: "muted",
  },
]

const TONE_BG: Record<(typeof POINTS)[number]["tone"], string> = {
  primary: "bg-primary/15 text-primary",
  accent: "bg-accent/15 text-accent",
  amber: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  success: "bg-success/15 text-success",
  muted: "bg-muted text-muted-foreground",
}

interface Props {
  children: React.ReactNode
  /** Skip the popover (when the explainer is already visible on the
   *  page itself — e.g. the Communities landing page). */
  disabled?: boolean
}

export function CommunityTooltip({ children, disabled = false }: Props) {
  if (disabled) return <>{children}</>

  return (
    // openDelay 200ms = doesn't pop on cursor flyovers; closeDelay
    // 120ms gives the user a beat to cross the trigger ↔ content
    // gap without the card snapping shut. Radix HoverCard handles
    // the boundary semantics correctly — exiting both surfaces and
    // staying out for closeDelay closes it, single mouseleave alone
    // doesn't (which is what was causing the prior flicker).
    <HoverCard openDelay={200} closeDelay={120}>
      <HoverCardTrigger asChild>{children}</HoverCardTrigger>
      <HoverCardContent
        side="right"
        align="start"
        sideOffset={10}
        // Override default padding — we want the polished header
        // strip + bullet list, not the standard padded card.
        className="w-[360px] overflow-hidden p-0 shadow-xl"
      >
        {/* Header strip — gradient + icon + headline + subhead */}
        <div className="relative overflow-hidden bg-gradient-to-br from-primary/15 via-primary/5 to-transparent p-4">
          <div className="flex items-start gap-3">
            <div className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
              <Users2 className="h-4.5 w-4.5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-serif text-base font-bold leading-tight">
                One feature, many shapes
              </p>
              <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
                Communities cover every group surface in your workspace — same engine, different
                purpose.
              </p>
            </div>
          </div>
        </div>

        {/* Bullet list */}
        <ul className="divide-y divide-border/60">
          {POINTS.map((p) => (
            <li key={p.label} className="flex items-start gap-3 px-4 py-2.5">
              <span
                className={`mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${TONE_BG[p.tone]}`}
              >
                <p.Icon className="h-3.5 w-3.5" />
              </span>
              <span className="min-w-0">
                <span className="block text-[13px] font-semibold leading-tight">{p.label}</span>
                <span className="mt-0.5 block text-[11.5px] leading-snug text-muted-foreground">
                  {p.body}
                </span>
              </span>
            </li>
          ))}
        </ul>

        {/* Footer CTA — opens the Communities page so the user can dive in */}
        <div className="flex items-center justify-between gap-2 border-t border-border/60 bg-muted/30 px-4 py-2.5">
          <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Sparkles className="h-3 w-3 text-primary" />
            Feed, members, access — all from one place.
          </p>
          <Link
            href="/dashboard/batches"
            className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
          >
            Open Communities <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </HoverCardContent>
    </HoverCard>
  )
}
