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

import { useEffect, useRef, useState } from "react"
import {
  AlertCircle,
  Check,
  ClipboardList,
  MessageCircle,
  Mic,
  Sparkles,
  Users2,
  Wand2,
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
  /** Optional — when provided, renders a "Generate study guide"
   *  button that calls this with the current summary + agenda. The
   *  parent host page is responsible for creating the Doc + adding
   *  the generated-from ReferenceEdge. */
  onGenerateStudyGuide?: (args: { summary: string; agendaTitles: string[] }) => void
  /** Title of the class we're ending — shown for context so the
   *  teacher knows the modal is about the right session. */
  sessionTitle: string
  /** Whether the course has an attached community. Drives the
   *  "share to community" checkbox visibility — there's nothing to
   *  share to when no community exists. */
  hasAttachedCommunity: boolean
  /** Optional community name — shown in the checkbox label. */
  attachedCommunityName?: string
  /** Optional course title — feeds the AI draft button on the
   *  summary step so the draft mentions the course. Falls back to
   *  a generic "today's class" line when missing. */
  courseTitle?: string
  /** Optional list of pre-class agenda item titles — used by the
   *  AI draft to enumerate what was covered. */
  agendaTitles?: string[]
}

// Single-screen recap card.
//
// Replaced a 3-step wizard (Outcome → Summary → Follow-up) that
// hit the host at the worst moment — they just finished an hour of
// teaching and the last thing they want is a multi-screen form.
//
// Now: all three sections stacked on one screen, defaults pre-filled
// (held = true, summary auto-drafted from agenda titles, follow-up
// null/skipped). The host's only required action is one click to
// publish — every section is editable inline if they want to tweak,
// but the default path is "looks good → publish & sign off."
export function EndClassWrapWizard({
  open,
  onOpenChange,
  onConfirm,
  sessionTitle,
  hasAttachedCommunity,
  attachedCommunityName,
  courseTitle,
  agendaTitles,
  onGenerateStudyGuide,
}: Props) {
  const [wasHeld, setWasHeld] = useState(true)
  const [summary, setSummary] = useState("")
  const [shareToCommunity, setShareToCommunity] = useState(hasAttachedCommunity)
  const [followUp, setFollowUp] = useState<EndClassDecision["followUp"]>(null)

  // Auto-draft the summary the first time the dialog opens so the
  // host doesn't face an empty textarea. They can edit, blank it,
  // or accept as-is. Re-draft skipped on subsequent opens of the
  // same session (the host's edit wins).
  const autoDrafted = useRef(false)
  useEffect(() => {
    if (!open) return
    if (autoDrafted.current) return
    if (summary.trim().length > 0) return
    const items = (agendaTitles ?? []).filter(Boolean).slice(0, 3)
    const context = courseTitle
      ? `Today's ${courseTitle} session covered`
      : `Today we covered`
    const draft = items.length > 0
      ? `${context}: ${items.join(", ")}. Recording + notes are linked below.`
      : `${context} ${sessionTitle}. Recording + key takeaways are linked below.`
    setSummary(draft.slice(0, 280))
    autoDrafted.current = true
  }, [open, agendaTitles, courseTitle, sessionTitle, summary])

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
    // Reset for next time. Done after the close animation so a
    // teacher who reopens immediately doesn't see a state flash.
    setTimeout(() => {
      setWasHeld(true)
      setSummary("")
      setShareToCommunity(hasAttachedCommunity)
      setFollowUp(null)
      autoDrafted.current = false
    }, 200)
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close(false)}>
      <DialogContent className="recording-box max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Class wrapped — {sessionTitle}
          </DialogTitle>
          <p className="pt-1 text-[12.5px] text-muted-foreground">
            Here&apos;s the recap that&apos;ll go out. Edit anything you want, then publish.
          </p>
        </DialogHeader>

        {/* All three sections stacked. No step state — defaults are
            sensible (held + auto-drafted summary + no follow-up) so
            the host's required path is one click to publish. */}
        {/* Outcome */}
        {true && (
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

        {/* Summary */}
        {true && (
          <div className="space-y-3 pt-2">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <p className="flex-1 text-[12.5px] text-muted-foreground">
                One line on what you covered. Lands in the recording post + the recap email so
                students who missed it know what they missed.
              </p>
              {/* Help me draft — fills the textarea from session
                  title + course + (when present) the pre-class
                  agenda. Template-driven, runs locally, no API
                  round-trip. Teacher edits afterwards. */}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const items = (agendaTitles ?? []).filter(Boolean).slice(0, 3)
                  const context = courseTitle
                    ? `Today's ${courseTitle} session covered`
                    : `Today we covered`
                  const draft = items.length > 0
                    ? `${context}: ${items.join(", ")}. Recording + notes are linked below.`
                    : `${context} ${sessionTitle}. Recording + key takeaways are linked below.`
                  setSummary(draft.slice(0, 280))
                }}
                className="gap-1.5"
              >
                <Wand2 className="h-3.5 w-3.5" />
                Help me draft
              </Button>
            </div>

            {/* Generate study guide — creates a new Doc using the
                agenda + summary as scaffolding and opens it in a new
                tab. The Doc gets a `generated-from` ReferenceEdge
                back to this session so the recording page surfaces it
                as a related artifact. */}
            {onGenerateStudyGuide && (
              <button
                type="button"
                onClick={() =>
                  onGenerateStudyGuide({
                    summary,
                    agendaTitles: agendaTitles ?? [],
                  })
                }
                className="group flex w-full items-start gap-3 rounded-lg border border-primary/30 bg-primary/[0.04] p-3 text-left transition-colors hover:border-primary hover:bg-primary/[0.08]"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Wand2 className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[12.5px] font-bold text-primary">
                    Generate a study guide doc
                  </span>
                  <span className="block text-[11px] leading-snug text-muted-foreground">
                    Auto-creates a Doc with the agenda items, your summary, and a recording embed. Edit, then publish to your cohort or the public.
                  </span>
                </span>
                <span className="shrink-0 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
                  Open in new tab →
                </span>
              </button>
            )}
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

        {/* Follow-up (optional) */}
        {true && (
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
          <Button onClick={() => close(true)} className="gap-1.5">
            <Check className="h-3.5 w-3.5" />
            {wasHeld ? "Looks good — send to students" : "End class without recap"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
