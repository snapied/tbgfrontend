"use client"

// "Generate with AI" affordance used across the dashboard.
//
// Three render states based on /api/ai/status:
//
//   1. configured + planAllowed  → normal button. Clicking fires the
//                                  caller's onGenerate.
//   2. configured but plan-locked → "lock" button styled as Pro+ teaser.
//                                  Clicking routes to /dashboard/billing.
//                                  Instructors on Starter see the feature
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
import { Sparkles, Loader2 } from "lucide-react"
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

  // Still loading — show a loading state button (don't hide)
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

  // Always render the button. Plan gating is handled inside the
  // AI Course Builder dialog, not on the button itself.
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
