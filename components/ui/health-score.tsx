"use client"

// HealthScore — the universal completion meter.
//
// Used as "Brand health: 72/100", "Profile completeness: 7/10",
// "Course publish-readiness", "Page SEO score", etc. One primitive
// renders all of them consistently — score circle on the left,
// checklist on the right, click-to-fix on each item.
//
// API:
//
//   const items: HealthCheckItem[] = [
//     { id: "logo",     label: "Add a logo",          done: true,  weight: 3 },
//     { id: "primary",  label: "Set primary colour",  done: true,  weight: 2 },
//     { id: "favicon",  label: "Add a favicon",       done: false, weight: 1,
//       hint: "Shows in browser tabs · 32×32 PNG is fine",
//       action: { label: "Add favicon", onClick: () => focusFavicon() } },
//   ]
//   <HealthScore title="Brand health" items={items} />
//
// The score is computed as: Σ(weight where done) / Σ(weight) → 0–100.
// Caller can override by passing `score` explicitly.

import { ReactNode, useMemo, useState } from "react"
import {
  Check,
  ChevronDown,
  ChevronUp,
  Circle,
  Sparkles,
  type LucideIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export interface HealthCheckItem {
  /** Stable id (used as React key + analytics). */
  id: string
  /** One-line label shown in the checklist. */
  label: string
  /** Whether this check is satisfied. */
  done: boolean
  /** Relative importance — lifts the item's contribution to the
   *  score so "Add a logo" can count for more than "Add a favicon".
   *  Defaults to 1. */
  weight?: number
  /** Tooltip-ish hint shown under the label. Use to explain WHY
   *  this matters, not just what to do. */
  hint?: string
  /** One-click fix — bound to the parent's UI (focus a field, open
   *  a dialog, jump to a tab). When provided, the row renders a
   *  small "Fix" button. */
  action?: {
    label: string
    onClick: () => void
    icon?: LucideIcon
  }
}

interface Props {
  /** Card header — "Brand health", "Profile completeness", etc. */
  title: string
  /** Optional one-line context shown under the title. */
  description?: string
  items: HealthCheckItem[]
  /** Override the computed score. Useful when the parent already
   *  has a custom scoring formula. Range 0–100. */
  score?: number
  /** When true, the checklist starts collapsed and the user can
   *  expand. Default false (open). */
  collapsible?: boolean
  /** Optional right-aligned slot in the header — e.g. a "Re-check"
   *  button on Brand health. */
  trailing?: ReactNode
  className?: string
  /** Render variant. "card" wraps in a Card (default). "inline"
   *  ditches the wrapper for use inside dialogs / settings panels. */
  variant?: "card" | "inline"
}

// Two-key score breakdown for the headline ring.
const RING_COPY = (score: number) =>
  score >= 85 ? "Looking sharp" : score >= 65 ? "Almost there" : score >= 40 ? "Halfway" : "Just getting started"

const RING_TONE = (score: number) =>
  score >= 85
    ? "stroke-emerald-500 text-emerald-500"
    : score >= 65
    ? "stroke-amber-500 text-amber-500"
    : score >= 40
    ? "stroke-orange-500 text-orange-500"
    : "stroke-red-500 text-red-500"

export function HealthScore({
  title,
  description,
  items,
  score,
  collapsible = false,
  trailing,
  className,
  variant = "card",
}: Props) {
  const [open, setOpen] = useState(!collapsible)

  // Computed score = weighted percent. Weights default to 1.
  const computed = useMemo(() => {
    if (typeof score === "number") return Math.max(0, Math.min(100, Math.round(score)))
    const total = items.reduce((s, i) => s + (i.weight ?? 1), 0) || 1
    const done = items.reduce((s, i) => s + (i.done ? i.weight ?? 1 : 0), 0)
    return Math.round((done / total) * 100)
  }, [items, score])

  const doneCount = items.filter((i) => i.done).length
  const allDone = items.length > 0 && doneCount === items.length

  const body = (
    <>
      <div className="flex items-start gap-4">
        <ScoreRing score={computed} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                {RING_COPY(computed)}
              </p>
              <h3 className="font-serif text-lg font-bold leading-tight">{title}</h3>
              {description && (
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{description}</p>
              )}
            </div>
            {trailing}
          </div>
          <p className="mt-2 text-[12.5px] text-muted-foreground">
            <span className="font-semibold text-foreground">{doneCount}</span>
            <span> of </span>
            <span className="font-semibold text-foreground">{items.length}</span>
            <span> done</span>
            {allDone && (
              <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                <Sparkles className="h-2.5 w-2.5" />
                All clear
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Checklist */}
      {items.length > 0 && (
        <>
          {collapsible && (
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="mt-3 inline-flex items-center gap-1 text-[11.5px] font-semibold text-primary hover:underline"
            >
              {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              {open ? "Hide checklist" : `Show ${items.length - doneCount} remaining`}
            </button>
          )}
          {open && (
            <ul className="mt-3 divide-y divide-border/60">
              {items.map((item) => (
                <ChecklistRow key={item.id} item={item} />
              ))}
            </ul>
          )}
        </>
      )}
    </>
  )

  if (variant === "inline") {
    return <div className={cn("space-y-1", className)}>{body}</div>
  }
  return (
    <Card className={className}>
      <CardContent className="p-5">{body}</CardContent>
    </Card>
  )
}

function ChecklistRow({ item }: { item: HealthCheckItem }) {
  return (
    <li className="flex items-start gap-3 py-2.5">
      <span
        className={cn(
          "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
          item.done ? "bg-emerald-500 text-white" : "border border-border bg-card text-muted-foreground",
        )}
        aria-hidden
      >
        {item.done ? <Check className="h-3 w-3" /> : <Circle className="h-2 w-2" />}
      </span>
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "text-[13px] font-medium leading-tight",
            item.done ? "text-muted-foreground line-through" : "text-foreground",
          )}
        >
          {item.label}
        </p>
        {item.hint && !item.done && (
          <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">{item.hint}</p>
        )}
      </div>
      {item.action && (
        <Button
          type="button"
          variant={item.done ? "ghost" : "outline"}
          size="sm"
          onClick={item.action.onClick}
          className="shrink-0 gap-1 text-[11.5px]"
        >
          {item.action.icon && <item.action.icon className="h-3 w-3" />}
          {item.done ? "Edit" : item.action.label}
        </Button>
      )}
    </li>
  )
}

// Circular ring rendered via inline SVG so the colour gradient
// matches RING_TONE and the score number anchors crisply at the
// centre regardless of digits (e.g. 7 vs 72 vs 100).
function ScoreRing({ score }: { score: number }) {
  const radius = 28
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference
  const tone = RING_TONE(score)
  return (
    <div className="relative h-16 w-16 shrink-0">
      <svg viewBox="0 0 72 72" className="h-16 w-16 -rotate-90">
        <circle
          cx="36"
          cy="36"
          r={radius}
          strokeWidth="6"
          fill="none"
          className="stroke-muted"
        />
        <circle
          cx="36"
          cy="36"
          r={radius}
          strokeWidth="6"
          fill="none"
          strokeLinecap="round"
          className={cn("transition-[stroke-dashoffset] duration-700 ease-out", tone)}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={cn("font-serif text-lg font-bold tabular-nums", tone.split(" ").find((c) => c.startsWith("text-")))}>
          {score}
        </span>
      </div>
    </div>
  )
}
