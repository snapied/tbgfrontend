"use client"

// Polished, reusable Kanban board. Used by student + teacher
// assignments and doubts surfaces. Caller supplies the column
// definitions (key, label, tone) and a render function for cards;
// the board takes care of the chrome — column header, count chip,
// empty state, hover lift, responsive layout.
//
// Stays presentation-only: no data fetching, no drag-and-drop. The
// list views already drive the source-of-truth filtering; this just
// re-projects the same rows into grouped columns.

import type { ReactNode } from "react"
import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"

export interface KanbanColumn<T> {
  /** Stable key — used for React reconciliation + the column header tag. */
  key: string
  label: string
  /** Tailwind colour token used for the top accent strip + header pill.
   *  Keep it short — "amber", "blue", "emerald", "violet", "slate". */
  tone: KanbanTone
  /** Rows that belong in this column. Caller pre-filters from its own
   *  source of truth so the kanban matches list-view counts exactly. */
  rows: T[]
}

export type KanbanTone =
  | "amber"
  | "blue"
  | "emerald"
  | "violet"
  | "rose"
  | "slate"

const TONE_STYLES: Record<
  KanbanTone,
  { strip: string; chip: string; dot: string }
> = {
  amber: {
    strip: "bg-amber-400/70",
    chip: "bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-200",
    dot: "bg-amber-400",
  },
  blue: {
    strip: "bg-blue-400/70",
    chip: "bg-blue-100 text-blue-900 dark:bg-blue-500/20 dark:text-blue-200",
    dot: "bg-blue-400",
  },
  emerald: {
    strip: "bg-emerald-400/70",
    chip: "bg-emerald-100 text-emerald-900 dark:bg-emerald-500/20 dark:text-emerald-200",
    dot: "bg-emerald-400",
  },
  violet: {
    strip: "bg-violet-400/70",
    chip: "bg-violet-100 text-violet-900 dark:bg-violet-500/20 dark:text-violet-200",
    dot: "bg-violet-400",
  },
  rose: {
    strip: "bg-rose-400/70",
    chip: "bg-rose-100 text-rose-900 dark:bg-rose-500/20 dark:text-rose-200",
    dot: "bg-rose-400",
  },
  slate: {
    strip: "bg-slate-300",
    chip: "bg-slate-100 text-slate-700 dark:bg-slate-500/20 dark:text-slate-200",
    dot: "bg-slate-400",
  },
}

interface Props<T> {
  columns: Array<KanbanColumn<T>>
  /** Render a single card. The caller decides the card shape, which
   *  fields to surface, and the click target. */
  renderCard: (row: T, columnKey: string) => ReactNode
  /** Stable react key per row. */
  keyOf: (row: T) => string
  /** Optional empty-column message — defaults to "Nothing here yet." */
  emptyText?: string
  /** Optional tweak to the outer grid classes. */
  className?: string
}

export function KanbanBoard<T>({
  columns,
  renderCard,
  keyOf,
  emptyText = "Nothing here yet.",
  className,
}: Props<T>) {
  // Auto-fits up to 4 columns on wide screens, 2 on tablets, 1 on
  // phones. We pick a sensible breakpoint per column count so a
  // 3-column board doesn't look squashed on a 4-col grid.
  const colGrid = (() => {
    const n = columns.length
    if (n <= 1) return "grid-cols-1"
    if (n === 2) return "grid-cols-1 md:grid-cols-2"
    if (n === 3) return "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
    return "grid-cols-1 md:grid-cols-2 lg:grid-cols-4"
  })()

  return (
    <div className={cn("grid gap-4", colGrid, className)}>
      {columns.map((col) => {
        const tone = TONE_STYLES[col.tone]
        return (
          <div key={col.key} className="flex flex-col">
            {/* Accent strip — gives each column a visual identity
                without overpowering the cards. */}
            <div className={cn("h-1 w-full rounded-t-lg", tone.strip)} />
            <Card className="flex h-full flex-col rounded-t-none border-t-0 bg-muted/30">
              <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className={cn("h-2 w-2 rounded-full", tone.dot)} aria-hidden />
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-foreground/80">
                    {col.label}
                  </p>
                </div>
                <span
                  className={cn(
                    "inline-flex min-w-[1.75rem] items-center justify-center rounded-full px-1.5 py-0.5 text-[11px] font-semibold tabular-nums",
                    tone.chip,
                  )}
                >
                  {col.rows.length}
                </span>
              </div>
              <CardContent className="flex-1 space-y-2 p-3">
                {col.rows.length === 0 ? (
                  <div className="flex h-full min-h-[80px] items-center justify-center rounded-md border border-dashed border-border/60 text-xs text-muted-foreground">
                    {emptyText}
                  </div>
                ) : (
                  col.rows.map((row) => (
                    <div key={keyOf(row)}>{renderCard(row, col.key)}</div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        )
      })}
    </div>
  )
}

// Convenience card primitive — most kanban callers want the same shape:
// title, subtitle line, optional badge, click-through. Use this when
// the row data fits the common case; otherwise pass any JSX you want
// to `renderCard`.
export function KanbanCard({
  title,
  subtitle,
  meta,
  badge,
  href,
  onClick,
}: {
  title: string
  subtitle?: string
  meta?: ReactNode
  badge?: ReactNode
  href?: string
  onClick?: () => void
}) {
  const inner = (
    <div
      className={cn(
        "group cursor-pointer rounded-md border border-border bg-card p-3 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="line-clamp-2 text-sm font-medium leading-snug">{title}</p>
        {badge}
      </div>
      {subtitle && (
        <p className="mt-1 line-clamp-1 text-[11px] text-muted-foreground">
          {subtitle}
        </p>
      )}
      {meta && <div className="mt-2 text-[11px] text-muted-foreground">{meta}</div>}
    </div>
  )
  if (href) {
    return (
      <a href={href} className="block no-underline">
        {inner}
      </a>
    )
  }
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className="block w-full text-left">
        {inner}
      </button>
    )
  }
  return inner
}
