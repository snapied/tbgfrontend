"use client"

// "Generate with AI" affordance used across the dashboard.
//
// Three render states based on /api/ai/status:
//
//   1. configured + planAllowed  → normal button. Clicking fires the
//                                  caller's onGenerate.
//   2. configured but plan-locked → "lock" button styled as Pro+ teaser.
//                                  Clicking routes to /dashboard/billing.
//                                  Teachers on Starter see the feature
//                                  exists and what they'd unlock by
//                                  upgrading. (The pricing-rule memory
//                                  applies: the upgrade nudge is the
//                                  defence-in-depth UX layer; the
//                                  backend's requireMinimumPlan is the
//                                  trust boundary.)
//   3. not configured            → hidden. No point teasing a feature
//                                  the platform genuinely can't deliver
//                                  because the workspace owner hasn't
//                                  set OPENAI_API_KEY / GROQ_API_KEY.

import { useEffect, useState } from "react"
import Link from "next/link"
import { Sparkles, Loader2, Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { fetchAIStatus, type AIStatus } from "@/lib/ai-client"

interface Props {
  /** Called when the button is clicked AND the user is on a plan that
   *  includes AI. Plan-locked clicks bypass this and route to billing. */
  onGenerate: () => Promise<void> | void
  label?: string
  className?: string
  size?: "sm" | "default" | "xs"
  /** Disabled state from the caller (e.g. missing title for outline). */
  disabled?: boolean
}

export function AIGenerateButton({
  onGenerate,
  label = "Generate with AI",
  className,
  size = "sm",
  disabled = false,
}: Props) {
  const [status, setStatus] = useState<AIStatus | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let cancelled = false
    void fetchAIStatus().then((s) => {
      if (!cancelled) setStatus(s)
    })
    return () => { cancelled = true }
  }, [])

  // Backend has no provider key — hide entirely. There's nothing the
  // viewer can do about this from the editor; the workspace owner
  // needs to set the env var. Showing a locked button here would
  // mislead Starter users into thinking upgrading would unlock it.
  if (status && !status.configured) return null

  // Still loading the probe — render the button in a neutral
  // disabled state so the editor doesn't reflow when status lands.
  if (status === null) {
    return (
      <Button
        type="button"
        variant="outline"
        size={size === "xs" ? "sm" : size}
        disabled
        className={cn(
          "gap-1.5 border-primary/30 text-primary opacity-60",
          size === "xs" && "h-7 px-2 text-xs",
          className,
        )}
      >
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        {label}
      </Button>
    )
  }

  // Plan-locked variant — visible to Starter so the feature is
  // discoverable, clickable to route to /dashboard/billing instead
  // of running generation. Lock icon + amber tone signal "this is
  // gated" without screaming "DENIED".
  //
  // When the caller has also marked the button disabled (e.g. "no
  // lesson title yet"), we skip the upgrade link too — pulling the
  // user toward billing before they've even drafted enough to
  // generate against would be a tone-deaf upsell.
  if (!status.planAllowed) {
    const lockClasses = cn(
      "gap-1.5 border-amber-500/40 bg-amber-500/5 text-amber-700 hover:bg-amber-500/10 dark:text-amber-400",
      size === "xs" && "h-7 px-2 text-xs",
      className,
    )
    const ProPill = (
      <span className="ml-1 rounded-full bg-amber-500/15 px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide">
        Pro
      </span>
    )
    if (disabled) {
      return (
        <Button
          type="button"
          variant="outline"
          size={size === "xs" ? "sm" : size}
          disabled
          className={lockClasses}
        >
          <Lock className="h-3.5 w-3.5" />
          {label}
          {ProPill}
        </Button>
      )
    }
    return (
      <Button
        asChild
        type="button"
        variant="outline"
        size={size === "xs" ? "sm" : size}
        className={lockClasses}
        title="AI generation is included on Pro and above — upgrade to unlock."
      >
        <Link href="/dashboard/billing">
          <Lock className="h-3.5 w-3.5" />
          {label}
          {ProPill}
        </Link>
      </Button>
    )
  }

  return (
    <Button
      type="button"
      variant="outline"
      size={size === "xs" ? "sm" : size}
      onClick={async () => {
        setBusy(true)
        try {
          await onGenerate()
        } finally {
          setBusy(false)
        }
      }}
      disabled={busy || disabled}
      className={cn(
        "gap-1.5 border-primary/30 text-primary hover:bg-primary/5",
        size === "xs" && "h-7 px-2 text-xs",
        className,
      )}
    >
      {busy ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Sparkles className="h-3.5 w-3.5" />
      )}
      {label}
    </Button>
  )
}
