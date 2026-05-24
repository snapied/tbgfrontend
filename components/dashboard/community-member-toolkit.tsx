"use client"

// CommunityMemberToolkit — combines Sprint B Communities #4 (5-step
// onboarding checklist), #16 (notification preset selector), and #47
// (read-state badge) into one focused strip at the top of a
// community's feed.
//
// Each piece is self-hiding:
//   • Checklist hides when all 5 steps are done OR the user has
//     dismissed it.
//   • Notification preset is always available via a small icon
//     button (one click → popover).
//   • "X new since you were last here" badge renders only when
//     unreadCount > 0 AND the member has been to this community
//     before (lastPostSeenAt > epoch).

import { useState } from "react"
import { Bell, Check, ChevronDown, Sparkles, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import {
  ONBOARDING_STEPS,
  useCommunityMemberPrefs,
  type NotificationPreset,
  type OnboardingStep,
} from "@/lib/community-member-prefs"

interface Props {
  tenantSlug: string
  userId: string | undefined
  communityId: string
  /** Total posts in the feed. Used to compute the "X new" badge. */
  postCreatedAts: string[]
  /** Optional handler so a step's action button can route the user
   *  to the relevant action (intro → composer focus, invite →
   *  invite dialog). When omitted, the row is just informational. */
  onStepAction?: (step: OnboardingStep) => void
}

const NOTIFICATION_LABEL: Record<NotificationPreset, string> = {
  all: "All posts",
  mentions: "Mentions + replies to me",
  off: "Off",
}

export function CommunityMemberToolkit({
  tenantSlug,
  userId,
  communityId,
  postCreatedAts,
  onStepAction,
}: Props) {
  const api = useCommunityMemberPrefs({ tenantSlug, userId, communityId })
  const {
    prefs,
    markOnboardingDone,
    dismissOnboarding,
    restoreOnboarding,
    setNotificationPreset,
    unreadCount,
  } = api

  const doneCount = ONBOARDING_STEPS.filter((s) => prefs.onboardingDone[s.id]).length
  const checklistOpen =
    !!userId &&
    !prefs.onboardingDismissed &&
    doneCount < ONBOARDING_STEPS.length
  // Sprint D bugfix — restore-checklist link visibility. Shows
  // when the user dismissed but still has incomplete steps; gives
  // them a one-click path back without us nagging via a banner.
  const showRestoreLink =
    !!userId &&
    prefs.onboardingDismissed &&
    doneCount < ONBOARDING_STEPS.length

  const unread = unreadCount(postCreatedAts)
  // Suppress the "new since" badge for first-ever visits — the user
  // has nothing to compare against yet, and "47 new" would feel
  // misleading for someone landing on the community for the first
  // time. epoch-vs-now check is the test.
  const hasVisitedBefore = prefs.lastPostSeenAt > new Date(0).toISOString()
  const showUnreadBadge = hasVisitedBefore && unread > 0

  return (
    <div className="space-y-2">
      {/* Unread badge + notification preset, always rendered as a
          tight bar above the checklist. */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex flex-wrap items-center gap-2">
          {showUnreadBadge ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-[11.5px] font-semibold text-primary">
              <Sparkles className="h-3 w-3" />
              {unread.toLocaleString()} new since you were last here
            </span>
          ) : (
            <span className="text-[11.5px] text-muted-foreground">
              {hasVisitedBefore ? "All caught up ✓" : "Welcome — start by saying hi 👋"}
            </span>
          )}
          {/* Sprint D bugfix — restore-checklist link. Tiny anchor-
              style button, only when the user has dismissed but
              hasn't completed every step. Reads like an honest
              "I was wrong, bring it back" affordance. */}
          {showRestoreLink && (
            <button
              type="button"
              onClick={restoreOnboarding}
              className="rounded-md text-[11px] font-semibold text-primary underline-offset-2 hover:underline"
              title={`${ONBOARDING_STEPS.length - doneCount} of ${ONBOARDING_STEPS.length} unfinished`}
            >
              Show getting-started checklist
            </button>
          )}
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 gap-1 text-[11.5px]">
              <Bell className="h-3 w-3" />
              {NOTIFICATION_LABEL[prefs.notificationPreset]}
              <ChevronDown className="h-3 w-3 opacity-60" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-72 p-2">
            <p className="px-2 pb-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Notify me about
            </p>
            {(["all", "mentions", "off"] as NotificationPreset[]).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => {
                  setNotificationPreset(p)
                  markOnboardingDone("set-notifs")
                }}
                className={cn(
                  "flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left text-[12.5px] transition-colors",
                  prefs.notificationPreset === p
                    ? "bg-primary/10 text-primary"
                    : "hover:bg-muted",
                )}
              >
                <span className="mt-0.5 inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border border-current">
                  {prefs.notificationPreset === p && (
                    <span className="h-1.5 w-1.5 rounded-full bg-current" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{NOTIFICATION_LABEL[p]}</span>
                  <span className="block text-[11px] text-muted-foreground">
                    {p === "all" && "Every post + reply pings you. Best for tight cohorts."}
                    {p === "mentions" && "Only @-mentions and direct replies to you."}
                    {p === "off" && "No notifications. You'll need to check in manually."}
                  </span>
                </span>
              </button>
            ))}
          </PopoverContent>
        </Popover>
      </div>

      {/* Onboarding checklist — collapses when complete or dismissed. */}
      {checklistOpen && (
        <div className="rounded-lg border border-primary/20 bg-primary/[0.04] p-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[12px] font-bold uppercase tracking-wider text-primary">
                Get going · {doneCount} / {ONBOARDING_STEPS.length}
              </p>
              <p className="mt-0.5 text-[11.5px] text-muted-foreground">
                Five small actions that turn a brand-new community into a place you actually return to.
                Your ticks save automatically — refresh-safe.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                // Sprint D bugfix — confirm-then-hide. The X used
                // to permanently dismiss with no signal of what
                // would happen. Now we ask, and the toolkit
                // surfaces a small "Show checklist" link when
                // dismissed so the action is reversible.
                if (
                  typeof window !== "undefined" &&
                  window.confirm(
                    "Hide this checklist? You can bring it back any time from the link above the composer.",
                  )
                ) {
                  dismissOnboarding()
                }
              }}
              aria-label="Hide checklist (you can restore it later)"
              title="Hide this checklist — you can restore it later"
              className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <ul className="mt-2.5 space-y-1.5">
            {ONBOARDING_STEPS.map((step) => {
              const done = !!prefs.onboardingDone[step.id]
              return (
                <li
                  key={step.id}
                  className={cn(
                    "flex items-start gap-2 rounded-md border p-2 text-[12px]",
                    done ? "border-emerald-500/30 bg-emerald-500/5" : "border-border bg-card",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => markOnboardingDone(step.id)}
                    aria-label={done ? `Completed: ${step.label}` : `Mark ${step.label} done`}
                    className={cn(
                      "mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2",
                      done
                        ? "border-emerald-500 bg-emerald-500 text-white"
                        : "border-border hover:border-primary",
                    )}
                  >
                    {done && <Check className="h-2.5 w-2.5" />}
                  </button>
                  <span className="min-w-0 flex-1">
                    <span className={cn("block font-semibold", done && "text-muted-foreground line-through")}>
                      {step.label}
                    </span>
                    {!done && (
                      <span className="block text-[11px] text-muted-foreground">{step.hint}</span>
                    )}
                  </span>
                  {!done && onStepAction && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onStepAction(step.id)}
                      className="h-6 shrink-0 px-2 text-[11px]"
                    >
                      Go
                    </Button>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
