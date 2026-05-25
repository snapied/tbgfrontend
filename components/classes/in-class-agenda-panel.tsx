"use client"

// InClassAgendaPanel — host's compact agenda checklist inside the
// live class shell. Two host actions per item:
//   • ✓ Done       — flips `done: true`, stamps `markedAt`
//   • ⏭ Skip       — flips `skipped: true`, stamps `markedAt`
// Clicking again clears the mark (toggles). Progress chip at the
// top summarises "3 / 7 covered" so the host sees pace at a
// glance without counting.
//
// Why explicit marks instead of inferred-from-elapsed-time: the
// late-joiner recap used to guess what was "done" based on item
// minute budgets — wrong whenever the teacher skipped an item or
// went deep on one. Explicit marks are the source of truth; the
// inferred path stays as a fallback for sessions whose host
// doesn't touch the panel.

import { useMemo } from "react"
import { Check, CircleSlash, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

export interface AgendaItem {
  title: string
  minutes?: number
  done?: boolean
  skipped?: boolean
  markedAt?: string
}

interface Props {
  /** Current agenda items from the session. */
  items: AgendaItem[]
  /** Fired with the next agenda array. The parent persists via
   *  updateLiveSession. We keep the contract narrow (full array
   *  in, full array out) so the consumer doesn't reason about
   *  per-index mutation. */
  onChange: (next: AgendaItem[]) => void
  /** Optional close handler — when set, renders an X in the panel
   *  header so the host can dismiss the rail. */
  onClose?: () => void
}

export function InClassAgendaPanel({ items, onChange, onClose }: Props) {
  const doneCount = useMemo(
    () => items.filter((i) => i.done || i.skipped).length,
    [items],
  )
  const totalMin = useMemo(
    () => items.reduce((a, b) => a + (b.minutes ?? 0), 0),
    [items],
  )

  const updateAt = (idx: number, patch: Partial<AgendaItem>) => {
    onChange(items.map((it, i) => (i === idx ? { ...it, ...patch } : it)))
  }
  const toggleDone = (idx: number) => {
    const it = items[idx]
    if (it.done) {
      updateAt(idx, { done: false, markedAt: undefined })
    } else {
      updateAt(idx, { done: true, skipped: false, markedAt: new Date().toISOString() })
    }
  }
  const toggleSkip = (idx: number) => {
    const it = items[idx]
    if (it.skipped) {
      updateAt(idx, { skipped: false, markedAt: undefined })
    } else {
      updateAt(idx, { skipped: true, done: false, markedAt: new Date().toISOString() })
    }
  }

  if (items.length === 0) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between gap-2 border-b border-border pb-2">
          <p className="text-sm font-semibold">Agenda</p>
          {onClose && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-3 py-6 text-center">
          <CircleSlash className="h-7 w-7 text-muted-foreground/40" />
          <p className="text-xs text-muted-foreground">
            No agenda for this class.
          </p>
          <p className="text-[11px] text-muted-foreground/80">
            Set one from the class detail page before class so this panel
            shows up live.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-border pb-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold">Agenda</p>
          <p className="text-[11px] text-muted-foreground">
            {doneCount} of {items.length} covered
            {totalMin > 0 && <span> · {totalMin} min planned</span>}
          </p>
        </div>
        {onClose && (
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      <ol className="mt-3 space-y-1.5 overflow-y-auto pr-1">
        {items.map((it, i) => {
          const marked = !!(it.done || it.skipped)
          return (
            <li
              key={i}
              className={cn(
                "rounded-md border p-2 transition-colors",
                it.done && "border-success/30 bg-success/5",
                it.skipped && "border-border bg-muted/40 opacity-70",
                !marked && "border-border bg-background",
              )}
            >
              <div className="flex items-start gap-2">
                <span className="mt-1 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      "text-[13px] font-medium leading-snug",
                      it.skipped && "line-through",
                    )}
                  >
                    {it.title || "Untitled item"}
                  </p>
                  {(it.minutes != null || it.markedAt) && (
                    <p className="mt-0.5 text-[10.5px] text-muted-foreground">
                      {it.minutes != null && <span>{it.minutes}m planned</span>}
                      {it.markedAt && (
                        <span>
                          {it.minutes != null && " · "}
                          {it.done ? "Done" : "Skipped"} at{" "}
                          {new Date(it.markedAt).toLocaleTimeString(undefined, {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      )}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => toggleDone(i)}
                    aria-pressed={!!it.done}
                    title={it.done ? "Mark not done" : "Mark done"}
                    className={cn(
                      "inline-flex h-7 w-7 items-center justify-center rounded-md border transition-colors",
                      it.done
                        ? "border-success/40 bg-success text-white"
                        : "border-border text-muted-foreground hover:border-success/40 hover:text-success",
                    )}
                  >
                    <Check className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleSkip(i)}
                    aria-pressed={!!it.skipped}
                    title={it.skipped ? "Un-skip" : "Skip"}
                    className={cn(
                      "inline-flex h-7 w-7 items-center justify-center rounded-md border text-[14px] font-bold transition-colors",
                      it.skipped
                        ? "border-border bg-muted text-foreground"
                        : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground",
                    )}
                  >
                    ⏭
                  </button>
                </div>
              </div>
            </li>
          )
        })}
      </ol>

      <p className="mt-3 border-t border-border pt-2 text-[10.5px] text-muted-foreground">
        Marks are saved instantly. Late joiners see &ldquo;covered at HH:MM&rdquo;
        on each item in the recap.
      </p>
    </div>
  )
}
