"use client"

// ContrastMeter — accessibility-feedback strip rendered under a
// colour input. Shows the WCAG ratio against a light AND dark
// backdrop, the compliance bucket, and a one-tap "use a safer
// shade" suggestion when the picked colour fails AA.
//
// The point: a teacher picks pale yellow as their primary CTA and
// the meter says "Can't be read on white — 2.1:1 (fails). Try
// #b07a00 (4.6:1, passes AA)." with a button to swap in the
// suggested hex.

import { useMemo } from "react"
import { AlertTriangle, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  contrastLevel,
  contrastRatio,
  formatRatio,
  suggestSaferShade,
} from "@/lib/wcag-contrast"

interface Props {
  /** Foreground (the colour the user is picking). */
  color: string
  /** Backgrounds to test against. Defaults to white + near-black, the
   *  two real surfaces every portal renders this colour on. */
  testBackgrounds?: { label: string; color: string }[]
  /** Fires when the user clicks "Use this shade". Receives a
   *  WCAG-AA-clearing hex derived from the user's choice. */
  onPickSuggestion?: (hex: string) => void
  className?: string
}

const DEFAULT_BG: Array<{ label: string; color: string }> = [
  { label: "on white", color: "#ffffff" },
  { label: "on dark", color: "#0f172a" },
]

export function ContrastMeter({
  color,
  testBackgrounds = DEFAULT_BG,
  onPickSuggestion,
  className,
}: Props) {
  // Per-backdrop check.
  const checks = useMemo(
    () =>
      testBackgrounds.map((bg) => {
        const ratio = contrastRatio(color, bg.color)
        return { ...bg, ratio, level: contrastLevel(ratio) }
      }),
    [color, testBackgrounds],
  )

  // Worst case wins the headline tone.
  const worstRatio = Math.min(...checks.map((c) => c.ratio))
  const worstLevel = contrastLevel(worstRatio)
  const failing = worstLevel === "fail"

  // Suggest a safer shade against the surface that's failing.
  const failingBg = checks.find((c) => c.level === "fail")
  const suggestion = useMemo(() => {
    if (!failingBg) return null
    const safer = suggestSaferShade(color, failingBg.color, 4.5)
    if (!safer || safer.toLowerCase() === color.toLowerCase()) return null
    return safer
  }, [color, failingBg])

  if (!Number.isFinite(worstRatio)) return null

  return (
    <div
      className={cn(
        "rounded-md border px-2.5 py-2 text-[11px]",
        failing
          ? "border-amber-500/40 bg-amber-500/5"
          : worstLevel === "AA-large"
          ? "border-amber-400/30 bg-amber-400/5"
          : "border-emerald-500/30 bg-emerald-500/5",
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-1.5 font-semibold">
        {failing ? (
          <AlertTriangle className="h-3 w-3 text-amber-600" />
        ) : (
          <Check className="h-3 w-3 text-emerald-600" />
        )}
        <span
          className={cn(
            failing ? "text-amber-700 dark:text-amber-300" : "text-emerald-700 dark:text-emerald-300",
          )}
        >
          {failing ? "Hard to read on one of your surfaces" : "Readable everywhere"}
        </span>
      </div>
      <ul className="mt-1 grid gap-0.5 sm:grid-cols-2">
        {checks.map((c) => (
          <li key={c.label} className="flex items-center gap-1.5 text-muted-foreground">
            <span
              className="inline-block h-3 w-3 rounded-sm border border-border"
              style={{ background: c.color }}
              aria-hidden
            />
            <span className="tabular-nums">{formatRatio(c.ratio)}</span>
            <span>{c.label}</span>
            <span
              className={cn(
                "ml-auto rounded px-1 py-px text-[9.5px] font-bold uppercase tracking-wide",
                c.level === "AAA" && "bg-emerald-200/60 text-emerald-800",
                c.level === "AA" && "bg-emerald-100 text-emerald-700",
                c.level === "AA-large" && "bg-amber-100 text-amber-700",
                c.level === "fail" && "bg-red-100 text-red-700",
              )}
            >
              {c.level === "AA-large" ? "AA · large only" : c.level}
            </span>
          </li>
        ))}
      </ul>
      {suggestion && onPickSuggestion && (
        <div className="mt-1.5 flex items-center justify-between gap-2 rounded border border-amber-500/30 bg-amber-50 px-2 py-1.5 dark:bg-amber-950/30">
          <span className="flex items-center gap-1.5 text-[11px] text-amber-800 dark:text-amber-200">
            <span
              className="inline-block h-3 w-3 rounded-sm border border-amber-600"
              style={{ background: suggestion }}
              aria-hidden
            />
            <span className="font-mono">{suggestion}</span>
            <span>clears AA</span>
          </span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-6 px-2 text-[10.5px]"
            onClick={() => onPickSuggestion(suggestion)}
          >
            Use this shade
          </Button>
        </div>
      )}
    </div>
  )
}
