"use client"

// Compact pill that surfaces "what plan am I on + when do I lose it"
// inside the sidebar/header chrome. Tracks usePlan() so it's the same
// source of truth as the billing page and updates without a refetch.
//
// States:
//   - trialing → "<Plan> · N days left in trial"  (accent tone)
//   - cancelled (in grace period) → "<Plan> · ends <date>"  (amber tone)
//   - past_due → "<Plan> · payment overdue"        (destructive tone)
//   - active → "<Plan>"                            (neutral tone)
// Clicking always routes to /dashboard/billing.

import Link from "next/link"
import { Sparkles, AlertTriangle, Clock } from "lucide-react"
import { cn } from "@/lib/utils"
import { usePlan } from "@/lib/use-plan"
import { PLANS } from "@/lib/plans"

export function PlanBadge({ className }: { className?: string }) {
  const { plan, status, trialDaysLeft, currentPeriodEnd, hydrated } = usePlan()
  if (!hydrated) return null
  const meta = PLANS[plan]
  const planLabel = meta?.name ?? plan

  let tone = "bg-muted text-muted-foreground border-border"
  let icon: React.ReactNode = null
  let suffix: string | null = null

  if (status === "trialing") {
    tone = "bg-primary/15 text-primary border-primary/30"
    icon = <Sparkles className="h-3 w-3" aria-hidden />
    suffix =
      trialDaysLeft == null
        ? "in trial"
        : trialDaysLeft === 0
          ? "trial ends today"
          : `${trialDaysLeft} day${trialDaysLeft === 1 ? "" : "s"} left`
  } else if (status === "past_due") {
    tone = "bg-destructive/15 text-destructive border-destructive/30"
    icon = <AlertTriangle className="h-3 w-3" aria-hidden />
    suffix = "payment overdue"
  } else if (status === "cancelled") {
    tone = "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30"
    icon = <Clock className="h-3 w-3" aria-hidden />
    suffix = currentPeriodEnd
      ? `ends ${new Date(currentPeriodEnd).toLocaleDateString()}`
      : "cancelling"
  } else if (status === "paused") {
    tone = "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30"
    icon = <Clock className="h-3 w-3" aria-hidden />
    suffix = "paused"
  }

  return (
    <Link
      href="/dashboard/billing"
      title="Manage billing & plan"
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide transition-colors hover:opacity-90",
        tone,
        className,
      )}
    >
      {icon}
      <span>{planLabel}</span>
      {suffix && (
        <>
          <span className="opacity-60">·</span>
          <span className="normal-case tracking-normal">{suffix}</span>
        </>
      )}
    </Link>
  )
}
