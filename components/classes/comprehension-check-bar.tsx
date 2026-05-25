"use client"

// In-class comprehension check.
//
// Renders TWO surfaces in one file so they can share the same hook
// (avoid double-subscribing): student variant (the two With-you /
// Lost buttons) and host variant (the live ratio + alert when too
// many students are lost).
//
// Both live inside the LiveKit video stage, positioned above the
// control bar via a parent absolute container so the pill doesn't
// fight participant tiles for space.

import { useEffect, useRef, useState } from "react"
import { CircleHelp, ThumbsUp } from "lucide-react"
import {
  castComprehensionVote,
  tallyComprehension,
  useComprehensionVotes,
  type ComprehensionVote,
} from "@/lib/comprehension-check"

const LOST_ALERT_THRESHOLD = 0.3

export function ComprehensionCheckStudent({
  sessionId,
  userId,
}: {
  sessionId: string
  userId: string
}) {
  const votes = useComprehensionVotes(sessionId)
  const myVote = votes[userId]?.vote ?? null
  function send(v: ComprehensionVote) {
    castComprehensionVote(sessionId, userId, myVote === v ? null : v)
  }
  return (
    <div className="pointer-events-auto inline-flex items-center gap-1 rounded-full border border-border bg-background/85 px-1.5 py-1 shadow-sm backdrop-blur">
      <span className="ml-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        Are you with me?
      </span>
      <button
        type="button"
        onClick={() => send("with")}
        aria-pressed={myVote === "with"}
        className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold transition-colors ${
          myVote === "with"
            ? "bg-success text-white"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        }`}
        title="Tap if you're following along"
      >
        <ThumbsUp className="h-3 w-3" />
        With you
      </button>
      <button
        type="button"
        onClick={() => send("lost")}
        aria-pressed={myVote === "lost"}
        className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold transition-colors ${
          myVote === "lost"
            ? "bg-amber-500 text-white"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        }`}
        title="Tap if you're lost — the host will see and slow down"
      >
        <CircleHelp className="h-3 w-3" />
        Lost
      </button>
    </div>
  )
}

export function ComprehensionCheckHost({ sessionId }: { sessionId: string }) {
  const votes = useComprehensionVotes(sessionId)
  const tally = tallyComprehension(votes)
  // One-shot alert when the lost ratio crosses the threshold. We
  // remember the last alerted minute so the host doesn't get
  // re-pinged every render — only on a fresh "the room just got
  // lost" event. Reset when the ratio drops back below threshold.
  const alertedRef = useRef(false)
  const [showAlert, setShowAlert] = useState(false)
  useEffect(() => {
    if (tally.total < 3) return // ignore noise from sparse votes
    if (tally.lostRatio > LOST_ALERT_THRESHOLD && !alertedRef.current) {
      alertedRef.current = true
      setShowAlert(true)
      // Auto-dismiss the alert after 8s so it doesn't shout for the
      // whole class.
      window.setTimeout(() => setShowAlert(false), 8_000)
    } else if (tally.lostRatio < LOST_ALERT_THRESHOLD * 0.7) {
      // Re-arm once the ratio drops well below threshold so a second
      // wave of confusion later in class still alerts.
      alertedRef.current = false
    }
  }, [tally.lostRatio, tally.total])

  if (tally.total === 0) {
    return (
      <div className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full border border-border bg-background/80 px-2.5 py-1 text-[11px] text-muted-foreground shadow-sm backdrop-blur">
        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />
        Comprehension check — quiet so far
      </div>
    )
  }
  return (
    <div className="pointer-events-auto flex flex-col items-end gap-1">
      <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/85 px-2.5 py-1 text-[11px] font-semibold shadow-sm backdrop-blur">
        <span className="inline-flex items-center gap-1 text-success">
          <ThumbsUp className="h-3 w-3" />
          {tally.withCount}
        </span>
        <span className="text-muted-foreground/60">·</span>
        <span className="inline-flex items-center gap-1 text-amber-600">
          <CircleHelp className="h-3 w-3" />
          {tally.lostCount}
        </span>
        <span className="ml-1 text-[10px] font-normal text-muted-foreground">
          {Math.round(tally.lostRatio * 100)}% lost
        </span>
      </div>
      {showAlert && (
        <div className="max-w-xs rounded-lg border border-amber-500/40 bg-amber-50 px-3 py-2 text-[11px] text-amber-900 shadow-md dark:bg-amber-950/40 dark:text-amber-100">
          <p className="font-semibold">
            ⚠️ {tally.lostCount} of {tally.total} are lost.
          </p>
          <p className="mt-0.5 text-amber-800/80 dark:text-amber-200/70">
            Slow down or ask a question — they&apos;ll catch up.
          </p>
        </div>
      )}
    </div>
  )
}
