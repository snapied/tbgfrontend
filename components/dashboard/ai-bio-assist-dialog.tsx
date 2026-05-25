"use client"

// AiBioAssistDialog — generates three opinionated draft bios for
// an instructor profile. Used by both:
//   • /dashboard/portal/profile  — Help me write next to Bio
//   • /dashboard/faculty/<id>/edit — Help me write next to About
//
// We use template-driven local drafts (no external API) so the
// dialog works offline and zero round-trip. Each draft swaps in
// the teacher's name + role + any keyword we can scrape from
// whatever they've already typed in the source field — so picks
// feel personal, not boilerplate.
//
// A v2 swap to /api/ai/refine slots in cleanly: the dialog's
// shape (open/onOpenChange + currentName/Role/Bio + onPick) is
// stable; only the `drafts` useMemo gets replaced.

import { useMemo } from "react"
import { ArrowRight, Wand2 } from "lucide-react"
import { Button } from "@/components/ui/button"

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  currentName: string
  currentRole: string
  /** Whatever the teacher has already typed in the source field
   *  (bio or About). Used to scrape one keyword for personalisation. */
  currentBio: string
  /** Fired with the picked draft text. Caller writes it into the
   *  appropriate field (setBio / setAbout). */
  onPick: (text: string) => void
}

export function AiBioAssistDialog({
  open,
  onOpenChange,
  currentName,
  currentRole,
  currentBio,
  onPick,
}: Props) {
  const drafts = useMemo(() => {
    const first = currentName.split(/\s+/)[0] || "I"
    const role = currentRole === "admin" ? "founder & instructor" : currentRole
    const keyword = (currentBio.match(/\b([a-zA-Z]{5,})\b/g) ?? [])[0] ?? "teaching"
    return [
      {
        label: "Warm",
        text:
          `Hi! I'm ${first}, a ${role} who's been ${keyword} for the last few years. ` +
          `I love working with students who want clear, no-fluff explanations and a real plan for what to do next. ` +
          `Outside of teaching: long walks, slow cooking, the occasional weekend project.`,
      },
      {
        label: "Authoritative",
        text:
          `${currentName || "Instructor"} · ${role}. Eight years inside the craft, three years teaching it. ` +
          `Curriculum designed around the moves that actually move students forward — not the moves that look good in a syllabus. ` +
          `Specialises in ${keyword}.`,
      },
      {
        label: "Outcome-led",
        text:
          `${first} helps students go from "I think I get it" to "I can do this on my own" in ${keyword} — usually inside ${
            currentBio.includes("week") ? "a few weeks" : "a single cohort"
          }. ` +
          `Background: ${role}. Past students have gone on to careers, freelance gigs, and the kind of confidence that doesn't fade.`,
      },
    ]
  }, [currentName, currentRole, currentBio])

  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={() => onOpenChange(false)}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-border bg-card p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2">
          <Wand2 className="h-5 w-5 text-primary" />
          <h2 className="font-serif text-xl font-bold tracking-tight">Help me write</h2>
        </div>
        <p className="mt-1 text-[12.5px] text-muted-foreground">
          Three draft bios using your name + role + anything you&rsquo;ve already
          typed. Pick the closest one, then tweak. Generated locally — none of
          your data leaves your browser.
        </p>
        <div className="mt-4 space-y-2">
          {drafts.map((d) => (
            <button
              key={d.label}
              type="button"
              onClick={() => onPick(d.text)}
              className="group flex w-full flex-col items-start gap-1.5 rounded-lg border border-border bg-card p-3 text-left transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
            >
              <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
                {d.label}
              </span>
              <span className="whitespace-pre-wrap text-[13px] leading-relaxed text-foreground">
                {d.text}
              </span>
              <span className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-primary opacity-0 transition-opacity group-hover:opacity-100">
                Use this <ArrowRight className="h-3 w-3" />
              </span>
            </button>
          ))}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </div>
    </div>
  )
}
