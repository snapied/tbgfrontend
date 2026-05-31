"use client"

// "Generate with AI" button with plan gating.
//   Starter: gated — clicking opens an upgrade popover (no lock icon)
//   Pro: 100/mo, Studio: 500/mo, Institute: 5000/mo
//   Exhausted: gated — clicking opens a "limit reached" popover
// The cap is enforced on click via the popover, not a disabled/locked
// affordance, so the button always looks inviting rather than blocked.

import { useEffect, useState } from "react"
import Link from "next/link"
import { Sparkles, Loader2, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { fetchAIStatus, type AIStatus } from "@/lib/ai-client"

interface Props {
  onGenerate: () => Promise<void> | void
  label?: string
  className?: string
  size?: "sm" | "default" | "xs"
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

  const btnSize = size === "xs" ? "sm" as const : size
  const sizeClass = size === "xs" ? "h-7 px-2 text-xs" : ""

  // Loading
  if (status === null) {
    return (
      <Button type="button" variant="outline" size={btnSize} disabled className={cn("gap-1.5 border-primary/30 text-primary opacity-60", sizeClass, className)}>
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        {label}
      </Button>
    )
  }

  // Not configured
  if (!status.configured) return null

  // Starter (0 cap) or limit exhausted
  const locked = status.limit === 0
  const exhausted = !locked && !status.planAllowed

  if (locked || exhausted) {
    return (
      <Popover>
        <PopoverTrigger asChild>
          {/* Gated state: no lock icon. The cap is still enforced —
              clicking opens the upgrade / limit-reached popover below
              instead of running onGenerate. The softer text tone is the
              only visual cue that it's not yet active. */}
          <Button type="button" variant="outline" size={btnSize} className={cn("gap-1.5 border-primary/30 text-primary/70", sizeClass, className)}>
            <Sparkles className="h-3.5 w-3.5" />
            {label}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 text-sm" side="bottom" align="end">
          <p className="font-semibold text-foreground">
            {locked ? "AI is a Pro feature" : "AI limit reached"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {locked
              ? "Upgrade to Pro to unlock AI course building, text refinement, and quiz generation."
              : "You've hit your AI usage limit. It resets automatically — wait a bit and try again."}
          </p>
          {locked && (
            <Button asChild size="sm" className="mt-3 w-full gap-1.5">
              <Link href="/dashboard/billing">
                Upgrade plan <ArrowRight className="h-3 w-3" />
              </Link>
            </Button>
          )}
        </PopoverContent>
      </Popover>
    )
  }

  // Unlocked — working button
  return (
    <Button
      type="button"
      variant="outline"
      size={btnSize}
      onClick={async () => {
        setBusy(true)
        try {
          await onGenerate()
          fetchAIStatus().then(setStatus).catch(() => {})
        } finally {
          setBusy(false)
        }
      }}
      disabled={busy || disabled}
      className={cn("gap-1.5 border-primary/30 text-primary hover:bg-primary/5", sizeClass, className)}
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
