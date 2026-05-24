"use client"

// ScheduleNextClassDialog — one-click "duplicate this class for
// next week" flow.
//
// Most teachers running a cohort hold the same class at the same
// time every week. The default destination is `originalScheduledAt
// + 7 days`, same duration, same title (the dialog lets them edit
// any of it). Submit creates a fresh LiveSession via addLiveSession
// and toasts a deep link to the new class so they can jump in if
// they want to add an agenda before bouncing off.
//
// We deliberately don't carry over `agenda` / `summary` /
// `materials` from the original — those are class-specific. We DO
// carry hostId, courseId, durationMinutes, provider, and (where
// applicable) the meetingUrl so external providers (Zoom, Meet)
// don't need a new meeting link if the teacher reuses one.

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { CalendarPlus, Loader2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import {
  useLMS,
  generateId,
  type LiveSession,
} from "@/lib/lms-store"
import { canonicalRoomCode } from "@/lib/jitsi"

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  source: LiveSession
}

// Smart-default offset. Most cohorts run weekly; if a teacher wants
// daily/biweekly they edit the date directly, so the seed value
// just needs to be the most-common case.
const DEFAULT_OFFSET_DAYS = 7

export function ScheduleNextClassDialog({ open, onOpenChange, source }: Props) {
  const { addLiveSession, liveSessions } = useLMS()

  // Three quick-pick offset options + a custom date. Defaults to
  // weekly. The selected offset just pre-fills the datetime input;
  // the input remains the source of truth so a teacher can still
  // hand-edit time-of-day after picking +14 days.
  const [offsetDays, setOffsetDays] = useState<number>(DEFAULT_OFFSET_DAYS)
  const [title, setTitle] = useState<string>(source.title)
  const [scheduledAt, setScheduledAt] = useState<string>("")
  const [submitting, setSubmitting] = useState(false)
  // Series mode — when count > 1 we bulk-create N classes at
  // offsetDays apart, all linked by a fresh seriesId so the class
  // list can render them as one unit. Default is 1 (single class)
  // so the dialog still works for one-off "schedule the next one"
  // moves; advanced users tick the toggle to build a cohort.
  const [count, setCount] = useState<number>(1)

  // Rebuild the default scheduledAt every time the dialog opens
  // (source date might have shifted via a reschedule between visits)
  // and whenever the teacher picks a different quick-offset.
  useEffect(() => {
    if (!open) return
    setTitle(source.title)
    setCount(1)
    const sourceMs = Date.parse(source.scheduledAt)
    const baseMs = Number.isFinite(sourceMs) ? sourceMs : Date.now()
    setScheduledAt(toLocalInputValue(baseMs + offsetDays * 86_400_000))
  }, [open, source.scheduledAt, source.title, offsetDays])

  const computedISO = useMemo(() => {
    // datetime-local emits a "YYYY-MM-DDTHH:mm" string without a
    // timezone. Convert via Date so we store UTC ISO consistently.
    if (!scheduledAt) return null
    const d = new Date(scheduledAt)
    if (!Number.isFinite(d.getTime())) return null
    return d.toISOString()
  }, [scheduledAt])

  const handleSubmit = () => {
    if (!computedISO) {
      toast.error("Pick a valid date and time first.")
      return
    }
    const trimmedTitle = title.trim() || source.title
    const safeCount = Math.max(1, Math.min(52, Math.round(count)))
    setSubmitting(true)
    try {
      // Series ID: reuse the source's seriesId when the source is
      // already part of a series (so the new instances extend it
      // rather than starting a parallel series), otherwise mint
      // one when we're creating >1 class. Single-class clones get
      // no seriesId — that's a one-off.
      const reuseSeriesId =
        source.seriesId && (safeCount > 1 || source.seriesId)
          ? source.seriesId
          : undefined
      const newSeriesId =
        safeCount > 1
          ? reuseSeriesId ?? generateId("series")
          : reuseSeriesId
      // When extending an existing series, the next instance index
      // should follow the highest index already in the series.
      const existingMaxIndex = newSeriesId
        ? liveSessions
            .filter((s) => s.seriesId === newSeriesId)
            .reduce(
              (m, s) => (s.recurrence ? Math.max(m, s.recurrence.index) : m),
              0,
            )
        : 0
      const totalForLabel = newSeriesId
        ? existingMaxIndex + safeCount
        : safeCount

      const created: LiveSession[] = []
      for (let i = 0; i < safeCount; i++) {
        const newId = generateId("sess")
        const newRoomCode = canonicalRoomCode({ id: newId, roomCode: null })
        const startMs = new Date(computedISO).getTime() + i * offsetDays * 86_400_000
        const instance: LiveSession = {
          id: newId,
          courseId: source.courseId,
          title: trimmedTitle,
          description: source.description,
          provider: source.provider,
          // External providers (Zoom, Meet, etc.): reuse the
          // meeting link by default — most teachers use a single
          // recurring meeting URL across the cohort. They can edit
          // per-class afterwards if needed.
          meetingUrl: source.meetingUrl,
          scheduledAt: new Date(startMs).toISOString(),
          durationMinutes: source.durationMinutes,
          hostId: source.hostId,
          status: "scheduled",
          roomState:
            source.provider === "in-house" ? "scheduled" : undefined,
          roomCode: source.provider === "in-house" ? newRoomCode : undefined,
          recordings: [],
          wasHeld: false,
          // Per-class artefacts intentionally dropped — see the
          // single-class path above for the same reasoning.
          chatEnabled: source.chatEnabled,
          createdAt: new Date().toISOString(),
          seriesId: newSeriesId,
          recurrence: newSeriesId
            ? {
                label: `Every ${offsetDays} day${offsetDays === 1 ? "" : "s"}`,
                intervalDays: offsetDays,
                count: totalForLabel,
                index: existingMaxIndex + i + 1,
              }
            : undefined,
        }
        addLiveSession(instance)
        created.push(instance)
      }
      const head = created[0]
      toast.success(
        safeCount === 1
          ? "Next class scheduled."
          : `Series scheduled · ${safeCount} new classes`,
        {
          description:
            safeCount === 1
              ? new Date(head.scheduledAt).toLocaleString()
              : `Starting ${new Date(head.scheduledAt).toLocaleDateString()} · every ${offsetDays} day${offsetDays === 1 ? "" : "s"}`,
          action: {
            label: "Open first",
            onClick: () => {
              window.location.assign(`/dashboard/classes/${head.id}`)
            },
          },
        },
      )
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
            <CalendarPlus className="h-5 w-5" />
            {count > 1 ? "Build a class series" : "Schedule the next one"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 pt-2">
          <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            {count > 1 ? "Cloning" : "Cloning"}{" "}
            <span className="font-medium text-foreground">{source.title}</span>{" "}
            ({source.durationMinutes} min) · {source.provider === "in-house" ? "in-house room" : `via ${source.provider}`}. Recordings, summary,
            and agenda stay with the original — every new class is fresh.
          </div>
          <div className="space-y-1.5">
            <Label>Quick pick</Label>
            <div className="flex flex-wrap gap-1.5">
              {[
                { label: "Same time next week", days: 7 },
                { label: "+3 days", days: 3 },
                { label: "+14 days", days: 14 },
              ].map((opt) => (
                <button
                  key={opt.days}
                  type="button"
                  onClick={() => setOffsetDays(opt.days)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    offsetDays === opt.days
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sn-title">Title</Label>
            <Input
              id="sn-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Class title"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sn-when">
              {count > 1 ? "First class · date & time" : "Date & time"}
            </Label>
            <Input
              id="sn-when"
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
            />
            <p className="text-[11px] text-muted-foreground">
              Pre-filled from the quick pick above — edit if you want
              a different slot.
            </p>
          </div>
          {/* Series builder. The count input is always visible but
              labelled honestly: "1" = single class (default),
              anything more becomes a series. We cap at 52 to stop a
              fat-finger 999 from minting a year of garbage data. */}
          <div className="space-y-1.5">
            <Label htmlFor="sn-count">How many classes?</Label>
            <div className="flex items-center gap-2">
              <Input
                id="sn-count"
                type="number"
                min={1}
                max={52}
                value={count}
                onChange={(e) => {
                  const n = parseInt(e.target.value, 10)
                  setCount(Number.isFinite(n) ? n : 1)
                }}
                className="w-24"
                inputMode="numeric"
              />
              <span className="text-xs text-muted-foreground">
                {count > 1
                  ? `Series · ${count} classes, every ${offsetDays} day${offsetDays === 1 ? "" : "s"}`
                  : "Single class"}
              </span>
            </div>
            {count > 1 && (
              <p className="text-[11px] text-muted-foreground">
                Each class is its own room with its own attendance
                + recap. They&rsquo;re linked by a shared series id so
                you can edit them as a group later.
                {source.seriesId
                  ? " This extends the existing series."
                  : ""}
              </p>
            )}
          </div>
          <Link
            href={`/dashboard/classes/${source.id}`}
            className="block text-[11px] text-muted-foreground hover:text-foreground"
          >
            ← Back to {source.title}
          </Link>
        </div>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || !computedISO}>
            {submitting ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <CalendarPlus className="mr-1.5 h-3.5 w-3.5" />
            )}
            {count > 1 ? `Schedule ${count} classes` : "Schedule"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Convert a Date (or ms) into the local-ISO format that
// <input type="datetime-local" /> requires — "YYYY-MM-DDTHH:mm".
// The native input doesn't accept a UTC suffix, so we slice the
// local representation rather than calling toISOString().
function toLocalInputValue(ms: number): string {
  const d = new Date(ms)
  const pad = (n: number) => n.toString().padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
