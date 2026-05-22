"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import {
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Film,
  Paperclip,
  Search,
  Video,
  XCircle,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { useLMS, type LiveSession } from "@/lib/lms-store"
import { computeSessionStatus, providerLabel } from "@/lib/live-session-utils"
import { ClassRecapView } from "@/components/classes/class-recap-editor"

/**
 * Teacher-facing archive of past classes across every course in the tenant.
 * Each session card shows its recap (recording, summary, materials) inline,
 * with an expand/collapse for compactness on long histories. Empty states
 * help guide the teacher toward filling in recordings/materials for any
 * session that ended without a recap.
 */
export function PastClassesArchive() {
  const { liveSessions, courses, getAttendanceForSession } = useLMS()
  const [search, setSearch] = useState("")
  const [courseFilter, setCourseFilter] = useState("all")
  const [recapFilter, setRecapFilter] = useState<"all" | "with-recap" | "missing-recap">("all")
  const [openId, setOpenId] = useState<string | null>(null)

  const past = useMemo(() => {
    return liveSessions
      .filter((s) => {
        const status = computeSessionStatus(s)
        const cancelled = s.status === "cancelled"
        return s.wasHeld || status === "ended" || cancelled
      })
      .filter((s) => {
        if (courseFilter !== "all" && s.courseId !== courseFilter) return false
        if (search && !s.title.toLowerCase().includes(search.toLowerCase())) return false
        const hasRecap = !!(s.summary || s.recordingUrl || (s.materials?.length ?? 0) > 0)
        if (recapFilter === "with-recap" && !hasRecap) return false
        if (recapFilter === "missing-recap" && hasRecap) return false
        return true
      })
      .sort((a, b) => b.scheduledAt.localeCompare(a.scheduledAt))
  }, [liveSessions, search, courseFilter, recapFilter])

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search past classes…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={courseFilter} onValueChange={setCourseFilter}>
              <SelectTrigger className="w-full sm:w-56">
                <SelectValue placeholder="Course" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All courses</SelectItem>
                {courses.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={recapFilter}
              onValueChange={(v) => setRecapFilter(v as typeof recapFilter)}
            >
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All past classes</SelectItem>
                <SelectItem value="with-recap">With recording / recap</SelectItem>
                <SelectItem value="missing-recap">Missing recap</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {past.length === 0 ? (
        <Card>
          <CardContent className="px-6 py-12 text-center">
            <Video className="mx-auto h-10 w-10 text-muted-foreground" />
            <h3 className="mt-3 font-semibold">No past classes yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Once a scheduled class has ended (or you mark it as held), it appears here with its recording, summary, and materials.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {past.map((s) => (
            <PastClassCard
              key={s.id}
              session={s}
              courseTitle={courses.find((c) => c.id === s.courseId)?.title ?? "—"}
              attendedCount={getAttendanceForSession(s.id).length}
              open={openId === s.id}
              onToggle={() => setOpenId(openId === s.id ? null : s.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function PastClassCard({
  session,
  courseTitle,
  attendedCount,
  open,
  onToggle,
}: {
  session: LiveSession
  courseTitle: string
  attendedCount: number
  open: boolean
  onToggle: () => void
}) {
  const cancelled = session.status === "cancelled"
  const held = session.wasHeld === true || (computeSessionStatus(session) === "ended" && !cancelled)
  const materialCount = session.materials?.length ?? 0
  const hasRecording = !!session.recordingUrl
  const hasSummary = !!session.summary
  const hasRecap = hasRecording || hasSummary || materialCount > 0

  return (
    <Card className={cn(open && "border-primary/40")}>
      <CardContent className="p-0">
        <button
          type="button"
          onClick={onToggle}
          className="flex w-full items-start gap-3 px-4 py-3 text-left"
        >
          <div
            className={cn(
              "mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
              cancelled
                ? "bg-destructive/15 text-destructive"
                : held
                  ? "bg-success/15 text-success"
                  : "bg-muted text-muted-foreground",
            )}
          >
            {cancelled
              ? <XCircle className="h-5 w-5" />
              : held
                ? <CheckCircle2 className="h-5 w-5" />
                : <Calendar className="h-5 w-5" />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`/dashboard/classes/${session.id}`}
                className="truncate font-medium hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                {session.title}
              </Link>
              {cancelled && <Badge variant="outline">Cancelled</Badge>}
              {!cancelled && held && (
                <Badge className="gap-1 bg-success text-success-foreground">
                  <CheckCircle2 className="h-3 w-3" /> Held
                </Badge>
              )}
              {!hasRecap && !cancelled && (
                <Badge variant="outline" className="border-amber-500/50 text-amber-700 dark:text-amber-400">
                  Missing recap
                </Badge>
              )}
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {courseTitle} · {providerLabel(session.provider)} ·{" "}
              {new Date(session.scheduledAt).toLocaleString(undefined, {
                weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
              })} · {session.durationMinutes} min · {attendedCount} joined
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
                    <CheckCircle2 className="h-3 w-3" /> Summary
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
            open
              ? <ChevronDown className="mt-1 h-4 w-4 text-muted-foreground" />
              : <ChevronRight className="mt-1 h-4 w-4 text-muted-foreground" />
          )}
        </button>
        {open && hasRecap && (
          <div className="border-t border-border px-4 py-4">
            <ClassRecapView session={session} />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
