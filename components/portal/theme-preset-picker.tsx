"use client"

// Grid of theme preset chips. Each chip is a tiny visual swatch (two
// color blocks + a heading-font sample of the preset name) so the
// teacher can see the vibe before clicking. Active preset is
// highlighted by matching primary/accent against the current brand.

import { Check, RotateCcw } from "lucide-react"
import { cn } from "@/lib/utils"
import { PRESETS, type ThemePreset } from "@/lib/portal-theme-presets"

interface Props {
  currentPrimary?: string
  currentAccent?: string
  onPick: (preset: ThemePreset) => void
  // Optional — when provided, a "Reset" tile renders alongside the
  // presets and clicking it clears the active palette. Mirror of the
  // "Default theme" tile on the Portal templates picker.
  onReset?: () => void
}

export function ThemePresetPicker({ currentPrimary, currentAccent, onPick, onReset }: Props) {
  const anyActive = PRESETS.some(
    (p) =>
      currentPrimary?.toLowerCase() === p.primaryColor.toLowerCase() &&
      currentAccent?.toLowerCase() === p.accentColor.toLowerCase(),
  )
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {onReset && (
        <button
          type="button"
          onClick={onReset}
          disabled={!anyActive && !currentPrimary && !currentAccent}
          className={cn(
            "group relative flex flex-col gap-2 overflow-hidden rounded-lg border border-dashed border-border bg-card p-3 text-left transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none",
          )}
        >
          <div className="flex h-12 items-center justify-center overflow-hidden rounded-md bg-gradient-to-br from-muted via-background to-muted">
            <RotateCcw className="h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-semibold">No palette</p>
            <p className="line-clamp-2 text-[11px] text-muted-foreground">
              Clear the current colour pair and revert to your template&apos;s defaults.
            </p>
          </div>
        </button>
      )}
      {PRESETS.map((p) => {
        const active =
          currentPrimary?.toLowerCase() === p.primaryColor.toLowerCase() &&
          currentAccent?.toLowerCase() === p.accentColor.toLowerCase()
        return (
          <button
            key={p.id}
            type="button"
            onClick={() => onPick(p)}
            className={cn(
              "group relative flex flex-col gap-2 overflow-hidden rounded-lg border bg-card p-3 text-left transition hover:-translate-y-0.5 hover:shadow-md",
              active ? "border-primary ring-2 ring-primary/20" : "border-border",
            )}
          >
            {/* Color block */}
            <div className="flex h-12 overflow-hidden rounded-md">
              <div className="flex-[3]" style={{ background: p.primaryColor }} />
              <div className="flex-1" style={{ background: p.accentColor }} />
            </div>
            {/* Name + description */}
            <div>
              <p className="text-sm font-semibold">{p.name}</p>
              <p className="line-clamp-2 text-[11px] text-muted-foreground">
                {p.description}
              </p>
            </div>
            {active && (
              <span className="absolute right-2 top-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Check className="h-3 w-3" />
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
