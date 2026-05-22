"use client"

import { useMemo, useState } from "react"
import {
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Film,
  Paperclip,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { useLMS, type LiveSession } from "@/lib/lms-store"
import { computeSessionStatus, providerLabel } from "@/lib/live-session-utils"
import { ClassRecapView } from "@/components/classes/class-recap-editor"

/**
 * Student view of past live classes for the course they're currently in.
 * Shows everything the teacher posted after the session — recording,
 * summary, materials. Collapsed by default; clicking expands the recap.
 */
export function PastClasses({ courseId }: { courseId: string }) {
  const { getSessionsForCourse } = useLMS()
  const [expanded, setExpanded] = useState<string | null>(null)

  const past = useMemo(() => {
    return getSessionsForCourse(courseId)
      .filter((s) => {
        const status = computeSessionStatus(s)
        const hasRecap = !!(s.summary || s.recordingUrl || (s.materials && s.materials.length > 0))
        // Show the class if it has any recap content, or if it's ended/held —
        // either way it belongs in the student's "look back" section.
        return s.wasHeld || status === "ended" || hasRecap
      })
      .sort((a, b) => b.scheduledAt.localeCompare(a.scheduledAt))
      .slice(0, 10)
  }, [getSessionsForCourse, courseId])

  if (past.length === 0) return null

  return (
    <section className="space-y-2">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Past classes
      </h2>
      <div className="space-y-2">
        {past.map((s) => <Row key={s.id} session={s} open={expanded === s.id} onToggle={() => setExpanded(expanded === s.id ? null : s.id)} />)}
      </div>
    </section>
  )
}

function Row({ session, open, onToggle }: { session: LiveSession; open: boolean; onToggle: () => void }) {
  const status = computeSessionStatus(session)
  const cancelled = session.status === "cancelled"
  const held = session.wasHeld === true || (status === "ended" && !cancelled)
  const materialCount = session.materials?.length ?? 0
  const hasRecording = !!session.recordingUrl
  const hasSummary = !!session.summary
  const hasRecap = hasRecording || hasSummary || materialCount > 0

  return (
    <div className={cn("rounded-lg border", open ? "border-primary/30 bg-card" : "border-border bg-card")}>
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-start gap-3 px-4 py-3 text-left"
      >
        <div
          className={cn(
            "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
            held ? "bg-success/15 text-success" : "bg-muted text-muted-foreground",
          )}
        >
          {held ? <CheckCircle2 className="h-4 w-4" /> : <Calendar className="h-4 w-4" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate font-medium">{session.title}</p>
            {cancelled && <Badge variant="outline">Cancelled</Badge>}
            {!cancelled && held && (
              <Badge className="gap-1 bg-success text-success-foreground">
                <CheckCircle2 className="h-3 w-3" />
                Held
              </Badge>
            )}
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            <Calendar className="mr-1 inline h-3 w-3" />
            {new Date(session.scheduledAt).toLocaleString(undefined, {
              weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
            })} · {session.durationMinutes} min · {providerLabel(session.provider)}
          </p>
          {hasRecap && (
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              {hasRecording && (
                <Badge variant="outline" className="gap-1 text-[10px]">
                  <Film className="h-3 w-3" /> Recording
                </Badge>
              )}
              {hasSummary && (
                <Badge variant="outline" className="gap-1 text-[10px]">
                  <CheckCircle2 className="h-3 w-3" /> Notes
                </Badge>
              )}
              {materialCount > 0 && (
                <Badge variant="outline" className="gap-1 text-[10px]">
                  <Paperclip className="h-3 w-3" /> {materialCount} material{materialCount === 1 ? "" : "s"}
                </Badge>
              )}
            </div>
          )}
        </div>
        {hasRecap && (
          open ? <ChevronDown className="mt-1 h-4 w-4 text-muted-foreground" /> : <ChevronRight className="mt-1 h-4 w-4 text-muted-foreground" />
        )}
      </button>
      {open && hasRecap && (
        <div className="border-t border-border px-4 py-4">
          <ClassRecapView session={session} />
        </div>
      )}
    </div>
  )
}
