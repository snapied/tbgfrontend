"use client"

// RaiseHandButton — floating student-side affordance that toggles
// the viewer's entry in the raised-hands queue.
//
// Three intents now expressed (CL4 W2 sprint):
//   • Public hand    — default. Question for the whole room.
//   • Private hand   — 1:1 question. Host sees a different colour in
//                      the queue and can choose to DM instead of
//                      unmuting. Lets shy students ask without going
//                      live on camera.
//   • "Got it" lower — explicit "never mind, I figured it out" exit
//                      that doubles as a tiny positive signal to the
//                      host (vs. silent lower).
//
// UX:
//   • Pill button on the bottom-right is the primary action — one
//     tap raises a public hand (the 90% case).
//   • A small chevron next to it opens a popover with the secondary
//     options (Private, Got it). Discoverable but not in the way.
//   • Once raised, the pill text changes to show queue position +
//     visibility ("Lower hand · public · #2") and the popover swaps
//     to "Switch to public/private" + "Got it".

import { useEffect, useRef, useState } from "react"
import { ChevronUp, EyeOff, Hand, ThumbsUp } from "lucide-react"
import { cn } from "@/lib/utils"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { lowerHand, raiseHand, useMyHandState, useRaisedHands } from "@/lib/raised-hands"

interface Props {
  sessionId: string
  viewerId: string
  viewerName: string
}

export function RaiseHandButton({ sessionId, viewerId, viewerName }: Props) {
  const { raised, positionInQueue } = useMyHandState(sessionId, viewerId)
  // Read my own entry to know current visibility — useMyHandState
  // doesn't expose it because most callers don't need it.
  const allHands = useRaisedHands(sessionId)
  const myEntry = allHands.find((h) => h.userId === viewerId)
  const myVisibility = myEntry?.visibility ?? "public"

  // Track raised → false transitions so we can flash "Answered"
  // for 3s after the host clears the student. Prev-state ref so
  // we react on the edge, not the steady-state.
  const wasRaisedRef = useRef(raised)
  const [justAnswered, setJustAnswered] = useState(false)
  useEffect(() => {
    if (wasRaisedRef.current && !raised) {
      setJustAnswered(true)
      const id = window.setTimeout(() => setJustAnswered(false), 3000)
      return () => window.clearTimeout(id)
    }
    wasRaisedRef.current = raised
  }, [raised])

  function raisePublic() {
    raiseHand(sessionId, { id: viewerId, name: viewerName }, "public")
  }
  function raisePrivate() {
    raiseHand(sessionId, { id: viewerId, name: viewerName }, "private")
  }
  function gotIt() {
    lowerHand(sessionId, viewerId)
  }

  // Primary action depends on whether they're already raised.
  // Resting → raises a public hand (the 90% case).
  // Raised  → lowers (same behavior as before).
  const onPrimary = () => {
    if (raised) {
      lowerHand(sessionId, viewerId)
    } else {
      raisePublic()
    }
  }

  return (
    <div
      className={cn(
        "fixed bottom-24 right-4 z-30 inline-flex h-11 items-stretch overflow-hidden rounded-full border shadow-lg backdrop-blur transition-all sm:bottom-20",
        justAnswered
          ? "border-emerald-500/50 bg-emerald-500/95 text-white"
          : raised
            ? myVisibility === "private"
              ? "border-amber-500/60 bg-amber-500 text-white"
              : "border-primary/60 bg-primary text-primary-foreground"
            : "border-border bg-card/95 text-foreground",
      )}
    >
      <button
        type="button"
        onClick={onPrimary}
        aria-pressed={raised}
        aria-label={
          raised
            ? `Lower hand — ${myVisibility} · position ${positionInQueue} in queue`
            : "Raise hand"
        }
        className="inline-flex items-center gap-2 px-4 text-[12.5px] font-semibold transition-colors hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
      >
        <Hand className={cn("h-4 w-4", raised && "animate-pulse")} />
        {justAnswered ? (
          <span>Answered</span>
        ) : raised ? (
          <span>
            Lower hand
            <span className="ml-1 opacity-80">
              · {myVisibility === "private" ? "🤫 private" : "public"}
              {positionInQueue > 0 && ` · #${positionInQueue}`}
            </span>
          </span>
        ) : (
          <span>Raise hand</span>
        )}
      </button>
      {!justAnswered && (
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label="More hand options"
              className="inline-flex items-center justify-center border-l border-current/20 px-2 text-current transition-colors hover:bg-black/[0.06] dark:hover:bg-white/[0.08]"
            >
              <ChevronUp className="h-3.5 w-3.5" />
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" side="top" className="w-56 p-1.5">
            {!raised ? (
              <>
                <PopoverAction
                  icon={<Hand className="h-3.5 w-3.5" />}
                  label="Raise hand publicly"
                  hint="Question for the whole class"
                  onClick={raisePublic}
                  emphasize
                />
                <PopoverAction
                  icon={<EyeOff className="h-3.5 w-3.5" />}
                  label="Ask privately"
                  hint="Host can DM instead of unmuting you"
                  onClick={raisePrivate}
                />
              </>
            ) : (
              <>
                {myVisibility === "public" ? (
                  <PopoverAction
                    icon={<EyeOff className="h-3.5 w-3.5" />}
                    label="Switch to private"
                    hint="Quietly ask just the host"
                    onClick={raisePrivate}
                  />
                ) : (
                  <PopoverAction
                    icon={<Hand className="h-3.5 w-3.5" />}
                    label="Switch to public"
                    hint="Ask the whole room"
                    onClick={raisePublic}
                  />
                )}
                <PopoverAction
                  icon={<ThumbsUp className="h-3.5 w-3.5" />}
                  label="Got it — never mind"
                  hint="Lower hand; the host gets a tiny 👍 signal"
                  onClick={gotIt}
                />
              </>
            )}
          </PopoverContent>
        </Popover>
      )}
    </div>
  )
}

function PopoverAction({
  icon,
  label,
  hint,
  onClick,
  emphasize,
}: {
  icon: React.ReactNode
  label: string
  hint: string
  onClick: () => void
  emphasize?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-muted",
        emphasize && "bg-primary/[0.05]",
      )}
    >
      <span className="mt-0.5 text-muted-foreground">{icon}</span>
      <span className="min-w-0">
        <span className="block text-[12.5px] font-semibold">{label}</span>
        <span className="block text-[11px] leading-snug text-muted-foreground">
          {hint}
        </span>
      </span>
    </button>
  )
}
