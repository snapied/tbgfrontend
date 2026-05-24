"use client"

// EndClassWrapWizard — Sprint A Classes #22.
//
// Replaces the bare "are you sure?" confirm with a 3-step wrap flow
// so a teacher leaves the room with the next set of follow-ups
// already in motion. Each step is optional and skippable; the goal
// is to make the right action the easy action, not to gate the end-
// class button behind paperwork.
//
// Step 1 — Mark held vs cancelled
//   The single most important data point post-class. Held → attendance
//   counts, recording publishes, summary fires. Cancelled → attendance
//   suppressed, refund flow can pick up the marker, no follow-ups
//   fire. Defaults to "Held" because >95% of clicks are honest ends.
//
// Step 2 — Summary + share
//   One-line "what we covered today" + checkbox "share to attached
//   community". The summary gets auto-suggested from an AI prompt
//   the teacher can edit (omitted here; UX is "type or auto-fill
//   button"). Shipping the summary fires the existing
//   recording-ready notification with the summary embedded.
//
// Step 3 — Follow-up (assignment or doubts review)
//   Quick toggles to schedule an assignment, open the doubts inbox
//   pre-filtered to today's class, or skip. Each option deep-links
//   the appropriate dashboard surface so the teacher lands on the
//   right composer; we don't try to host the assignment editor
//   inside the wizard.
//
// Confirm-once at the bottom of step 3 actually ends the class.
// Any step can "End class now" — the wizard isn't a gate.

import { useState } from "react"
import {
  AlertCircle,
  Check,
  ClipboardList,
  MessageCircle,
  Mic,
  Sparkles,
  Users2,
  X,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"

export interface EndClassDecision {
  /** Was the class actually held? Drives attendance + recording
   *  publish. `false` = cancelled at the door; suppress follow-ups. */
  wasHeld: boolean
  /** Short summary (≤ 280 chars). Empty when teacher skipped. */
  summary?: string
  /** When true, the parent should also auto-post the recording +
   *  summary to the attached community. Default true when a
   *  community is attached. */
  shareToCommunity: boolean
  /** Optional follow-up the teacher wants to act on next. */
  followUp?: "assignment" | "doubts" | "next-class" | null
}

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  /** Called when the teacher commits the decision. The actual room
   *  shutdown still happens inside the parent — this wizard just
   *  collects intent. */
  onConfirm: (decision: EndClassDecision) => void
  /** Title of the class we're ending — shown for context so the
   *  teacher knows the modal is about the right session. */
  sessionTitle: string
  /** Whether the course has an attached community. Drives the
   *  "share to community" checkbox visibility — there's nothing to
   *  share to when no community exists. */
  hasAttachedCommunity: boolean
  /** Optional community name — shown in the checkbox label. */
  attachedCommunityName?: string
}

export function EndClassWrapWizard({
  open,
  onOpenChange,
  onConfirm,
  sessionTitle,
  hasAttachedCommunity,
  attachedCommunityName,
}: Props) {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [wasHeld, setWasHeld] = useState(true)
  const [summary, setSummary] = useState("")
  const [shareToCommunity, setShareToCommunity] = useState(hasAttachedCommunity)
  const [followUp, setFollowUp] = useState<EndClassDecision["followUp"]>(null)

  const close = (commit: boolean) => {
    if (commit) {
      onConfirm({
        wasHeld,
        summary: summary.trim() || undefined,
        shareToCommunity: shareToCommunity && hasAttachedCommunity,
        followUp,
      })
    }
    onOpenChange(false)
    // Reset for next time. We do this on close (not on submit) so
    // a teacher who cancels mid-flow doesn't lose their progress on
    // a misclick — but every fresh open starts clean.
    setTimeout(() => {
      setStep(1)
      setWasHeld(true)
      setSummary("")
      setShareToCommunity(hasAttachedCommunity)
      setFollowUp(null)
    }, 200)
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close(false)}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Wrap up — {sessionTitle}
          </DialogTitle>
        </DialogHeader>

        {/* Step pill strip. Clickable so a teacher mid-wizard can
            jump back to revisit a decision without restarting. */}
        <div className="mt-1 flex items-center gap-1.5 text-[11.5px]">
          {[1, 2, 3].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setStep(n as 1 | 2 | 3)}
              className={cn(
                "rounded-full px-2 py-0.5 font-semibold transition-colors",
                step === n
                  ? "bg-primary text-primary-foreground"
                  : step > n
                    ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                    : "bg-muted text-muted-foreground hover:bg-muted/80",
              )}
            >
              {step > n ? <Check className="inline h-3 w-3" /> : n}
              <span className="ml-1">
                {n === 1 ? "Outcome" : n === 2 ? "Summary" : "Follow-up"}
              </span>
            </button>
          ))}
        </div>

        {/* Step 1 — Outcome */}
        {step === 1 && (
          <div className="space-y-3 pt-2">
            <p className="text-[12.5px] text-muted-foreground">
              Was the class actually held? This drives attendance, recording publishing,
              and follow-up emails — get it right.
            </p>
            <div className="grid gap-2">
              <button
                type="button"
                onClick={() => setWasHeld(true)}
                className={cn(
                  "flex items-start gap-3 rounded-lg border p-3 text-left transition",
                  wasHeld
                    ? "border-emerald-500/40 bg-emerald-500/5"
                    : "border-border bg-card hover:border-primary/30",
                )}
              >
                <Check
                  className={cn(
                    "mt-0.5 h-4 w-4 shrink-0",
                    wasHeld ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground",
                  )}
                />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold">Class was held</span>
                  <span className="block text-[12px] text-muted-foreground">
                    Attendance counts. Recording publishes when ready. Students get the recap.
                  </span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => setWasHeld(false)}
                className={cn(
                  "flex items-start gap-3 rounded-lg border p-3 text-left transition",
                  !wasHeld
                    ? "border-amber-500/40 bg-amber-500/5"
                    : "border-border bg-card hover:border-primary/30",
                )}
              >
                <AlertCircle
                  className={cn(
                    "mt-0.5 h-4 w-4 shrink-0",
                    !wasHeld ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground",
                  )}
                />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold">Cancelled at the door</span>
                  <span className="block text-[12px] text-muted-foreground">
                    Suppress attendance + recording publish + follow-up emails.
                  </span>
                </span>
              </button>
            </div>
          </div>
        )}

        {/* Step 2 — Summary */}
        {step === 2 && (
          <div className="space-y-3 pt-2">
            <p className="text-[12.5px] text-muted-foreground">
              One line on what you covered. Lands in the recording post + the recap email so
              students who missed it know what they missed.
            </p>
            <Textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value.slice(0, 280))}
              placeholder="e.g. Walked through useEffect cleanup, common bugs, and the dependency-array rule."
              rows={3}
            />
            <p className="text-right text-[10.5px] tabular-nums text-muted-foreground">
              {summary.length} / 280
            </p>
            {hasAttachedCommunity && (
              <label className="flex cursor-pointer items-start gap-2 rounded-md border border-border bg-muted/30 p-2.5">
                <Checkbox
                  checked={shareToCommunity}
                  onCheckedChange={(v) => setShareToCommunity(v === true)}
                  className="mt-0.5"
                />
                <span className="text-[12.5px]">
                  <span className="flex items-center gap-1.5 font-semibold">
                    <Users2 className="h-3.5 w-3.5" />
                    Share recording + summary to{" "}
                    {attachedCommunityName ?? "the attached community"}
                  </span>
                  <span className="block text-[11px] text-muted-foreground">
                    Recording auto-pins to the community feed once it&apos;s ready. You can
                    unpin or edit later.
                  </span>
                </span>
              </label>
            )}
          </div>
        )}

        {/* Step 3 — Follow-up */}
        {step === 3 && (
          <div className="space-y-3 pt-2">
            <p className="text-[12.5px] text-muted-foreground">
              One last thing — what&apos;s the natural next step? Pick one and we&apos;ll route
              you there after ending the class.
            </p>
            <div className="grid gap-2">
              {[
                {
                  id: "assignment" as const,
                  Icon: ClipboardList,
                  title: "Assign follow-up work",
                  hint: "Open the assignment composer pre-filled with today's class title.",
                },
                {
                  id: "doubts" as const,
                  Icon: MessageCircle,
                  title: "Review doubts from this class",
                  hint: "Inbox filtered to questions that came in during today's session.",
                },
                {
                  id: "next-class" as const,
                  Icon: Mic,
                  title: "Schedule next class",
                  hint: "Jump to the class scheduler with the course pre-selected.",
                },
              ].map((opt) => {
                const active = followUp === opt.id
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setFollowUp(active ? null : opt.id)}
                    className={cn(
                      "flex items-start gap-3 rounded-lg border p-3 text-left transition",
                      active ? "border-primary/40 bg-primary/5" : "border-border bg-card hover:border-primary/30",
                    )}
                  >
                    <opt.Icon
                      className={cn(
                        "mt-0.5 h-4 w-4 shrink-0",
                        active ? "text-primary" : "text-muted-foreground",
                      )}
                    />
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold">{opt.title}</span>
                      <span className="block text-[11.5px] text-muted-foreground">{opt.hint}</span>
                    </span>
                  </button>
                )
              })}
              <button
                type="button"
                onClick={() => setFollowUp(null)}
                className={cn(
                  "rounded-lg border border-dashed p-2 text-center text-[12px] transition",
                  followUp === null
                    ? "border-primary/40 bg-primary/5 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/30",
                )}
              >
                Skip — just end the class
              </button>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="ghost" onClick={() => close(false)}>
            <X className="mr-1 h-3.5 w-3.5" />
            Cancel
          </Button>
          {step > 1 && (
            <Button variant="outline" onClick={() => setStep((s) => (s - 1) as 1 | 2 | 3)}>
              Back
            </Button>
          )}
          {step < 3 ? (
            <Button onClick={() => setStep((s) => (s + 1) as 1 | 2 | 3)}>
              Next
            </Button>
          ) : (
            <Button onClick={() => close(true)}>
              End class
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
