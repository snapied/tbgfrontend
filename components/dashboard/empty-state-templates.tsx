"use client"

// Shared empty-state with one-click templates. Replaces the "blank screen
// + Create" pattern on list pages (Quizzes, Classes, Whiteboards). Each
// template card shows a two-line preview of what gets created so the
// teacher can pick the closest starting point instead of staring at an
// empty form. A "Start blank" escape hatch remains for the rare case
// where none of the presets fit.

import type { ReactNode } from "react"
import { Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export interface EmptyStateTemplate {
  /** Stable key for React lists; also used for analytics if we add it later. */
  key: string
  /** Short label — fits on one line, 2-4 words. */
  title: string
  /** Two-line preview. Keep it concrete: what the user gets, not marketing copy. */
  preview: string
  /** Lucide icon component. Rendered ~h-4 w-4 inside a tinted square. */
  icon: ReactNode
  /** Color hint for the icon square. Tailwind tokens; keep palette consistent. */
  accent?: "primary" | "amber" | "emerald" | "sky" | "violet" | "rose"
  /** Called when the user clicks the card. Page wires this to its own create flow. */
  onSelect: () => void
}

interface Props {
  /** Big icon at the top of the empty state. */
  icon: ReactNode
  /** Headline above the templates. */
  title: string
  /** One-line subtext under the headline. */
  description: string
  templates: EmptyStateTemplate[]
  /** Optional escape hatch button (e.g. "Start blank"). Omit to hide. */
  blankAction?: { label: string; onSelect: () => void }
  className?: string
}

const ACCENT_CLASSES: Record<NonNullable<EmptyStateTemplate["accent"]>, string> = {
  primary: "bg-primary/10 text-primary",
  amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  sky: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  violet: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  rose: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
}

export function EmptyStateWithTemplates({
  icon,
  title,
  description,
  templates,
  blankAction,
  className,
}: Props) {
  return (
    <div className={cn("px-6 py-10 text-center", className)}>
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-muted/40 text-muted-foreground">
        {icon}
      </div>
      <h3 className="mt-4 font-serif text-lg font-semibold">{title}</h3>
      <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
        {description}
      </p>

      <div className="mt-6 inline-flex items-center gap-1.5 rounded-full bg-primary/[0.06] px-3 py-1 text-[11px] font-semibold tracking-wide text-primary">
        <Sparkles className="h-3 w-3" />
        Start from a template
      </div>

      <div className="mx-auto mt-4 grid max-w-3xl gap-3 text-left sm:grid-cols-3">
        {templates.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={t.onSelect}
            className="group flex h-full flex-col gap-2 rounded-xl border border-border bg-card p-4 text-left transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <span
              className={cn(
                "inline-flex h-8 w-8 items-center justify-center rounded-lg",
                ACCENT_CLASSES[t.accent ?? "primary"],
              )}
            >
              {t.icon}
            </span>
            <span className="text-sm font-semibold text-foreground">{t.title}</span>
            <span className="text-xs leading-relaxed text-muted-foreground line-clamp-2">
              {t.preview}
            </span>
          </button>
        ))}
      </div>

      {blankAction && (
        <div className="mt-5">
          <Button variant="ghost" size="sm" onClick={blankAction.onSelect}>
            {blankAction.label}
          </Button>
        </div>
      )}
    </div>
  )
}
