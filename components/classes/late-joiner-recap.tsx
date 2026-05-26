"use client"

// LateJoinerRecap — Sprint C Classes #6.
//
// When a student joins a live class after it's already started,
// drop a "You missed X minutes — here's what was just covered"
// panel into the join experience. Closes off the worst class
// drop-off pattern: students arrive late, feel lost, leave.
//
// Three signals power the recap:
//   1. Agenda items that the teacher has marked done (pre-class
//      list lives on the session, ordered + minute-budgeted).
//   2. Chat highlights — last 3 chat messages with ≥2 reactions
//      OR messages flagged as "question" by either AI or the
//      teacher. Hopefully includes "the punchline".
//   3. Current agenda item — what we're on right now, so the late
//      joiner can synchronise their attention.
//
// This component is purely presentational: hosts pass in the
// data. The live page computes the inputs from session state. For
// the POC we don't have an AI-summary feed, so the "missed" copy
// is mechanical (time diff). The hook is in place for a future
// transcript-summarisation pass.

import { useEffect, useState } from "react"
import { Clock, MessageCircle, Sparkles, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export interface AgendaItemLite {
  title: string
  minutes?: number
  /** Set by the live class as the teacher progresses; not stored
   *  on the session in the POC (would need pushRoomState). */
  done?: boolean
}

export interface ChatHighlight {
  author: string
  body: string
  reactions?: number
  isQuestion?: boolean
}

interface Props {
  /** Minutes the student missed. Negative or 0 hides the panel. */
  minutesMissed: number
  agenda?: AgendaItemLite[]
  /** Title of the agenda item the class is currently on. Computed
   *  from elapsed-time + per-item minute budgets at the call site. */
  currentItem?: string | null
  highlights?: ChatHighlight[]
  /** Optional override copy; defaults to a friendly mechanical line. */
  summary?: string
}

export function LateJoinerRecap({
  minutesMissed,
  agenda,
  currentItem,
  highlights,
  summary,
}: Props) {
  const [dismissed, setDismissed] = useState(false)
  // Auto-dismiss after 45s so the recap doesn't stick around when
  // the student is reading. Click X resets the timer (idempotent).
  useEffect(() => {
    if (dismissed) return
    const t = window.setTimeout(() => setDismissed(true), 45_000)
    return () => window.clearTimeout(t)
  }, [dismissed])

  if (minutesMissed <= 0 || dismissed) return null
  const minutesLabel = minutesMissed < 60
    ? `${minutesMissed} min`
    : `${(minutesMissed / 60).toFixed(1)}h`

  return (
    <div
      role="region"
      aria-label="What you missed"
      className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-3 text-[12.5px]"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="inline-flex items-center gap-1.5 font-semibold text-amber-700 dark:text-amber-300">
          <Clock className="h-3.5 w-3.5" />
          You&apos;re {minutesLabel}&nbsp;late · here&apos;s the catch-up
        </p>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Dismiss catch-up"
        >
          <X className="h-3 w-3" />
        </button>
      </div>

      <p className="mt-1.5 leading-relaxed">
        {summary ??
          "We've already covered the warm-up. Skim below for context and you'll catch up in a minute."}
      </p>

      {/* Agenda — show items marked done + the current one */}
      {agenda && agenda.length > 0 && (
        <ul className="mt-2 space-y-1">
          {agenda.map((a, i) => {
            const isCurrent = a.title === currentItem
            return (
              <li
                key={i}
                className={cn(
                  "flex items-start gap-1.5",
                  a.done && "opacity-70 line-through",
                )}
              >
                <span className="mt-0.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{
                    background: a.done ? "currentColor" : isCurrent ? "#f59e0b" : "transparent",
                    border: isCurrent ? "1px solid currentColor" : "1px solid currentColor",
                  }}
                />
                <span className="flex-1">
                  {a.title}
                  {a.minutes ? (
                    <span className="ml-1 text-muted-foreground">({a.minutes} min)</span>
                  ) : null}
                  {isCurrent && (
                    <span className="ml-1 rounded-full bg-amber-500 px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wider text-white">
                      Now
                    </span>
                  )}
                </span>
              </li>
            )
          })}
        </ul>
      )}

      {/* Chat highlights — top 3 by reaction count + flagged questions */}
      {highlights && highlights.length > 0 && (
        <div className="mt-2.5 space-y-1.5">
          <p className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            <MessageCircle className="h-3 w-3" />
            Hot moments
          </p>
          {highlights.slice(0, 3).map((h, i) => (
            <div
              key={i}
              className="rounded-md border border-border bg-background p-2 text-[11.5px]"
            >
              <p className="font-semibold">{h.author}</p>
              <p className="mt-0.5 line-clamp-2 text-muted-foreground">{h.body}</p>
              {(h.reactions ?? 0) > 0 && (
                <p className="mt-0.5 inline-flex items-center gap-1 text-[10.5px]">
                  <Sparkles className="h-2.5 w-2.5" />
                  {h.reactions} reactions
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      <Button
        size="sm"
        variant="ghost"
        onClick={() => setDismissed(true)}
        className="mt-2 h-7 text-[11px]"
      >
        Got it
      </Button>
    </div>
  )
}
