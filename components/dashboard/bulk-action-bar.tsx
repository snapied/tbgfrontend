"use client"

// Floating action bar shown when at least one row in a list table is
// selected. Sits above the table and surfaces the bulk operations that
// would otherwise require a row-by-row dropdown trip.
//
// Visual pattern mirrors the original bar on the Classes page so the
// experience stays consistent across Quizzes / Recordings / Classes.

import type { ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export interface BulkAction {
  key: string
  label: string
  icon?: ReactNode
  /** Renders the button in destructive colours. */
  destructive?: boolean
  onClick: () => void
  /** Optional disabled flag (e.g. "Move to course" with no courses). */
  disabled?: boolean
}

interface Props {
  selectedCount: number
  /** Caller clears its own selection state — we just fire the callback. */
  onClear: () => void
  actions: BulkAction[]
  /** Optional "of N total" subtitle. Lets the bar say "3 of 50 selected". */
  totalCount?: number
  className?: string
}

export function BulkActionBar({
  selectedCount,
  onClear,
  actions,
  totalCount,
  className,
}: Props) {
  if (selectedCount === 0) return null
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 rounded-md border border-primary/30 bg-primary/5 px-4 py-2 text-sm",
        className,
      )}
    >
      <span className="font-medium">
        {selectedCount} selected
        {typeof totalCount === "number" && totalCount > selectedCount && (
          <span className="ml-1 font-normal text-muted-foreground">
            of {totalCount}
          </span>
        )}
      </span>
      <span className="text-muted-foreground">·</span>
      {actions.map((a) => (
        <Button
          key={a.key}
          size="sm"
          variant="outline"
          disabled={a.disabled}
          onClick={a.onClick}
          className={cn(
            a.destructive && "text-destructive hover:text-destructive",
          )}
        >
          {a.icon && <span className="mr-1.5 inline-flex">{a.icon}</span>}
          {a.label}
        </Button>
      ))}
      <Button size="sm" variant="ghost" onClick={onClear} className="ml-auto">
        Clear
      </Button>
    </div>
  )
}
