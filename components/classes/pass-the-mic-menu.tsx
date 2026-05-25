"use client"

// Pass-the-mic menu (CL9).
//
// Drops into the live host top-bar so the active host can transfer
// hosting controls to a co-instructor mid-class. Shows a popover
// list of in-room co-instructors; one click hands off and fires a
// "you are now hosting" toast on the receiving end.
//
// "Pass" semantics:
//   • Original host stays in the call, downgraded to a co-host view
//   • Receiver sees the host panels (polls, hands, agenda, recap)
//   • Either can take back hosting via the same menu
//
// Note: the UI signal is shipped here. LiveKit's track-level
// permissions still belong to whoever joined as host; the visual
// affordance is the source of truth for ownership of the panels.

import { useState } from "react"
import { Check, Crown, Mic2, RotateCcw, Users } from "lucide-react"
import {
  passTheMic,
  reclaimHostingControls,
  useActiveHost,
} from "@/lib/active-host"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { toast } from "sonner"

interface Props {
  sessionId: string
  originalHostId: string
  /** The viewer rendering this menu — the only person who can
   *  pass/reclaim. */
  viewerId: string
  /** Candidate receivers — co-instructors of the course (excluding
   *  the original host). The menu hides itself if this list is
   *  empty. */
  coInstructors: Array<{ id: string; name: string }>
}

export function PassTheMicMenu({
  sessionId,
  originalHostId,
  viewerId,
  coInstructors,
}: Props) {
  const active = useActiveHost(sessionId)
  const effectiveHostId = active?.userId ?? originalHostId
  const viewerIsEffectiveHost = effectiveHostId === viewerId
  const [open, setOpen] = useState(false)

  // Hide entirely when there's no one to hand off to. The original
  // host with zero co-instructors has no reason to see the button.
  if (coInstructors.length === 0 && !active) return null

  function handPick(to: { id: string; name: string }) {
    passTheMic(sessionId, to, viewerId)
    setOpen(false)
    toast.success(`${to.name} now has hosting controls.`)
  }

  function takeBack() {
    reclaimHostingControls(sessionId)
    setOpen(false)
    toast.success("You have the controls back.")
  }

  // Original-host viewer with no override → show "Pass the mic"
  // Original-host viewer with override → show "Take back"
  // Co-instructor viewer who currently holds the mic → show "Hand back"
  // Co-instructor viewer who doesn't hold the mic → hide
  const canPass = viewerIsEffectiveHost && coInstructors.length > 0
  const canTakeBack = viewerId === originalHostId && active && active.userId !== originalHostId
  if (!canPass && !canTakeBack) return null

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Pass the mic"
          title={canTakeBack ? `${active?.name} is hosting — click to take back` : "Pass hosting to a co-instructor"}
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
            canTakeBack
              ? "border-amber-500/40 bg-amber-500/[0.08] text-amber-700 hover:bg-amber-500/15"
              : "border-border bg-card text-foreground hover:border-primary/40 hover:text-primary"
          }`}
        >
          {canTakeBack ? (
            <>
              <Crown className="h-3 w-3" />
              {active?.name} is hosting
            </>
          ) : (
            <>
              <Mic2 className="h-3 w-3" />
              Pass the mic
            </>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-2">
        {canTakeBack ? (
          <div className="space-y-2">
            <p className="px-2 text-[11px] text-muted-foreground">
              <span className="font-semibold text-foreground">{active?.name}</span> currently has hosting controls.
            </p>
            <button
              type="button"
              onClick={takeBack}
              className="flex w-full items-center gap-2 rounded-md border border-primary bg-primary/[0.04] px-2 py-2 text-left text-[12px] font-semibold text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Take back hosting
            </button>
          </div>
        ) : (
          <>
            <p className="mb-1 px-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Hand to a co-instructor
            </p>
            <ul className="space-y-0.5">
              {coInstructors.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => handPick(c)}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[12.5px] transition-colors hover:bg-muted"
                  >
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-[9px] font-bold text-primary">
                      {c.name
                        .split(/\s+/)
                        .map((w) => w[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()}
                    </span>
                    <span className="flex-1 truncate font-medium">{c.name}</span>
                    <Check className="h-3 w-3 text-muted-foreground/40 transition-opacity hover:opacity-100" />
                  </button>
                </li>
              ))}
            </ul>
            <p className="mt-2 inline-flex items-center gap-1 px-2 pb-1 text-[10px] text-muted-foreground">
              <Users className="h-2.5 w-2.5" />
              They keep the call. You become a co-host.
            </p>
          </>
        )}
      </PopoverContent>
    </Popover>
  )
}
