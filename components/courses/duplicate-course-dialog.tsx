"use client"

// DuplicateCourseDialog — wizard around the addCourse action.
//
// "Duplicate course" is the most common moment a teacher rebrands
// existing work for a new cohort. The naive path (deep clone the
// whole record) tends to carry over things the teacher doesn't
// actually want: live student enrollments, the published status,
// review counts, dated pricing. This dialog asks the small set of
// questions that matter before minting the new course.
//
// Questions:
//   • New title (free text, defaults to "Copy of {original}")
//   • Start as draft (default ON — duplicating a live course
//     shouldn't accidentally relaunch it)
//   • Reset pricing to free (default OFF — teachers typically
//     reuse the same price across cohorts)
//   • Clone certificate template (default ON)
//   • Clone curriculum (default ON — usually the whole point)
//
// We DELIBERATELY don't clone enrollments, reviews, version
// history, publishAt/publishReminderSentAt, or any per-instance
// runtime fields. The new course is a fresh canvas with the same
// teaching plan.

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Copy, Loader2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "sonner"
import {
  useLMS,
  generateId,
  type Course,
} from "@/lib/lms-store"

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  source: Course
}

export function DuplicateCourseDialog({ open, onOpenChange, source }: Props) {
  const { addCourse } = useLMS()
  const router = useRouter()
  const [title, setTitle] = useState(`Copy of ${source.title}`)
  const [keepCurriculum, setKeepCurriculum] = useState(true)
  const [keepCertificate, setKeepCertificate] = useState(true)
  const [resetPricing, setResetPricing] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Reset the form every time we re-open so a previous attempt's
  // tweaks don't bleed into a fresh duplicate.
  useEffect(() => {
    if (!open) return
    setTitle(`Copy of ${source.title}`)
    setKeepCurriculum(true)
    setKeepCertificate(true)
    setResetPricing(false)
  }, [open, source.title])

  const handleSubmit = () => {
    const trimmed = title.trim()
    if (!trimmed) {
      toast.error("Give the duplicate a title first.")
      return
    }
    setSubmitting(true)
    try {
      // Generate a fresh slug derived from the new title — we
      // don't reuse the source slug because that would collide on
      // the public route. The slug-availability check in the
      // store-level addCourse will normalise + uniquify further.
      const slugBase = trimmed
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 48) || `course-${generateId("c").slice(0, 6)}`
      const slug = `${slugBase}-${generateId("dup").slice(-4)}`

      // Curriculum carry-over: deep-clone modules + lessons with
      // fresh ids so quiz/assignment/enrollment lookups don't
      // accidentally couple back to the source course's records.
      const clonedModules = keepCurriculum
        ? source.modules.map((m) => ({
            ...m,
            id: generateId("module"),
            lessons: m.lessons.map((l) => ({
              ...l,
              id: generateId("lesson"),
              // For live-class lessons, drop the content pointer —
              // a duplicated course pointing at the original's live
              // session would conflict with attendance tracking. The
              // teacher re-binds in the curriculum editor.
              content: l.type === "live" ? "" : l.content,
              attachments: l.attachments ? [...l.attachments] : undefined,
              resources: l.resources ? [...l.resources] : undefined,
            })),
          }))
        : []

      const now = new Date().toISOString()
      const newCourse: Course = {
        // ───── Identity ─────
        id: generateId("course"),
        slug,
        title: trimmed,
        subtitle: source.subtitle,
        description: source.description,
        thumbnail: source.thumbnail,
        introVideoUrl: source.introVideoUrl,
        category: source.category,
        level: source.level,
        language: source.language,
        tags: source.tags ? [...source.tags] : undefined,
        instructor: source.instructor,
        coInstructorIds: source.coInstructorIds
          ? [...source.coInstructorIds]
          : undefined,
        modules: clonedModules,
        // ───── Lifecycle (always reset for the duplicate) ─────
        status: "draft",
        // publishAt + publishReminderSentAt deliberately dropped —
        // a duplicate shouldn't auto-publish on the original's
        // schedule.
        visibility: source.visibility,
        accessPassword: source.accessPassword,
        // ───── Pricing ─────
        price: resetPricing ? 0 : source.price,
        originalPrice: resetPricing ? undefined : source.originalPrice,
        earlyBirdPrice: resetPricing ? undefined : source.earlyBirdPrice,
        earlyBirdUntil: resetPricing ? undefined : source.earlyBirdUntil,
        currency: source.currency,
        coupons: undefined, // Coupons are per-instance — start fresh.
        // ───── Marketing ─────
        features: source.features ? [...source.features] : [],
        requirements: source.requirements ? [...source.requirements] : [],
        whatYouLearn: source.whatYouLearn ? [...source.whatYouLearn] : [],
        // ───── Certification ─────
        certificateEligible: keepCertificate ? source.certificateEligible : false,
        // certificateTemplate is required on Course; fall back to
        // a safe default when the teacher opted out of cert clone.
        certificateTemplate: keepCertificate
          ? source.certificateTemplate
          : "modern",
        // ───── Defaults ─────
        defaultBatchId: undefined, // Each duplicate gets its own community pairing.
        // ───── Counters (always reset) ─────
        totalLessons: source.totalLessons,
        totalDuration: source.totalDuration,
        enrolledCount: 0,
        rating: 0,
        reviewCount: 0,
        // ───── Timestamps ─────
        createdAt: now,
        updatedAt: now,
      }
      addCourse(newCourse)
      toast.success("Course duplicated.", {
        description: `"${trimmed}" created as a draft — edit it before publishing.`,
        action: {
          label: "Open editor",
          onClick: () => {
            router.push(`/dashboard/courses/${newCourse.id}/edit`)
          },
        },
      })
      onOpenChange(false)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="h-5 w-5" />
            Duplicate course
          </DialogTitle>
          <DialogDescription>
            Mints a new draft course from{" "}
            <span className="font-medium text-foreground">{source.title}</span>.
            Students, reviews, and the publish schedule are NOT copied — the
            duplicate is a fresh canvas.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="dup-title">New title</Label>
            <Input
              id="dup-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Copy of My Course"
            />
            <p className="text-[11px] text-muted-foreground">
              You can rename and edit everything else from the course
              editor once it lands.
            </p>
          </div>
          <div className="space-y-2 rounded-md border border-border/60 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              What carries over
            </p>
            <Toggle
              checked={keepCurriculum}
              onChange={setKeepCurriculum}
              label="Curriculum (modules + lessons)"
              hint="Drops live-class bindings — re-attach those after."
            />
            <Toggle
              checked={keepCertificate}
              onChange={setKeepCertificate}
              label="Certificate template"
              hint="The dynamic fields stay; signatures use your tenant defaults."
            />
            <Toggle
              checked={!resetPricing}
              onChange={(v) => setResetPricing(!v)}
              label="Pricing"
              hint="Untick to start at Free — useful when cloning into a giveaway."
            />
          </div>
          <p className="text-[11px] text-muted-foreground">
            The duplicate lands as a draft so you can review before
            publishing. Existing students stay on the original course.
          </p>
        </div>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || !title.trim()}>
            {submitting ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Copy className="mr-1.5 h-3.5 w-3.5" />
            )}
            Duplicate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
  hint: string
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-md p-1 hover:bg-muted/30">
      <Checkbox
        checked={checked}
        onCheckedChange={(v) => onChange(v === true)}
        className="mt-0.5"
      />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium">{label}</span>
        <span className="block text-[11px] text-muted-foreground">{hint}</span>
      </span>
    </label>
  )
}
