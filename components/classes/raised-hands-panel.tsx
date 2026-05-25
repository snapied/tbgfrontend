"use client"

// RaisedHandsPanel — host's view of the live queue. Each row:
//   • Avatar initials + name
//   • "Raised 2 min ago" relative time
//   • [Answer] action (removes from queue)
//   • [Lower] action (removes without "answered" semantics — useful
//     when the student lowered hand themselves but the host still
//     wants to dismiss the row)
// Empty state explains the channel so a host opening this rail
// before anyone raises understands it's not broken.

import { useEffect, useState } from "react"
import { Check, Hand, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { answerHand, clearAllHands, lowerHand, useRaisedHands } from "@/lib/raised-hands"

interface Props {
  sessionId: string
  onClose?: () => void
}

export function RaisedHandsPanel({ sessionId, onClose }: Props) {
  const hands = useRaisedHands(sessionId)
  // Live "raised N min ago" clock — 30s tick keeps the relative
  // time copy honest without burning CPU on a per-second timer.
  const [, setNow] = useState(Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000)
    return () => window.clearInterval(id)
  }, [])

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-border pb-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold">Raised hands</p>
          <p className="text-[11px] text-muted-foreground">
            {hands.length === 0
              ? "No hands raised right now"
              : `${hands.length} ${hands.length === 1 ? "student is" : "students are"} waiting · oldest first`}
          </p>
        </div>
        {onClose && (
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose} aria-label="Close panel">
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {hands.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 py-8 text-center">
          <Hand className="h-8 w-8 text-muted-foreground/40" />
          <p className="text-xs text-muted-foreground">
            Students raise their hand from their stage controls.
            You&apos;ll see them queue here in raise order.
          </p>
        </div>
      ) : (
        <>
          <ol className="mt-3 space-y-1.5 overflow-y-auto pr-1">
            {hands.map((h, idx) => {
              const initials = h.name
                .split(/\s+/)
                .map((w) => w[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()
              // Visibility-aware styling. Public (default) inherits
              // the primary highlight on the first-in-queue card.
              // Private gets an amber treatment so the host's eye
              // catches it instantly — "this one wants a DM, not a
              // mic unmute."
              const isPrivate = h.visibility === "private"
              return (
                <li
                  key={h.userId}
                  className={cn(
                    "rounded-md border bg-card p-2 transition-colors",
                    isPrivate
                      ? "border-amber-500/40 bg-amber-500/[0.05]"
                      : idx === 0
                        ? "border-primary/40 bg-primary/[0.04]"
                        : "border-border",
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className={cn(
                        "inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                        isPrivate
                          ? "bg-amber-500/15 text-amber-700"
                          : "bg-primary/10 text-primary",
                      )}
                    >
                      {idx + 1}
                    </span>
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-bold text-foreground">
                      {initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium">
                        {h.name}
                        {isPrivate && (
                          <span className="ml-1.5 rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-bold text-amber-700">
                            🤫 private
                          </span>
                        )}
                      </p>
                      <p className="text-[10.5px] text-muted-foreground">
                        Raised {formatAgo(h.raisedAt)}
                        {isPrivate && " · wants a DM, not a mic unmute"}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-end gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 gap-1 px-2 text-[11px]"
                      onClick={() => lowerHand(sessionId, h.userId)}
                      title="Dismiss without answering"
                    >
                      Lower
                    </Button>
                    <Button
                      size="sm"
                      className={cn(
                        "h-7 gap-1 px-2 text-[11px]",
                        isPrivate && "bg-amber-500 text-white hover:bg-amber-600",
                      )}
                      onClick={() => answerHand(sessionId, h.userId)}
                      title={
                        isPrivate
                          ? "Mark answered (you'll typically follow up in DM)"
                          : "Mark this question as answered"
                      }
                    >
                      <Check className="h-3 w-3" />
                      {isPrivate ? "Answered (DM)" : "Answer"}
                    </Button>
                  </div>
                </li>
              )
            })}
          </ol>
          <div className="mt-auto flex items-center justify-end gap-2 border-t border-border pt-3">
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={() => clearAllHands(sessionId)}
            >
              Clear all
            </Button>
          </div>
        </>
      )}
    </div>
  )
}

function formatAgo(iso: string): string {
  const ms = Date.now() - Date.parse(iso)
  const sec = Math.max(1, Math.floor(ms / 1000))
  if (sec < 60) return `${sec}s ago`
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min} min ago`
  const hr = Math.floor(min / 60)
  return `${hr}h ${min % 60}m ago`
}
