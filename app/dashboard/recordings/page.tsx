"use client"

// All-recordings index.
//
// Every live class that has a recording_url lands in one place so the
// instructor (or a returning student bookmarking this page) can rewatch
// without first navigating to the specific class. Cuts the "where did
// I save that recording" friction in half.

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { CalendarPlus, Captions, Circle, Play, Search, Trash2, Video } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { BulkActionBar } from "@/components/dashboard/bulk-action-bar"
import { useConfirm } from "@/lib/use-confirm"
import { usePageShortcut } from "@/components/dashboard/shortcuts-provider"
import { useLMS, type LiveSession } from "@/lib/lms-store"
import { useUrlState } from "@/lib/use-url-state"
import { fuzzySearch } from "@/lib/fuzzy-search"
import { RecordingPlayerDialog } from "@/components/classes/recording-player-dialog"
import { canonicalRoomCode } from "@/lib/jitsi"
import { fetchRoomState, requestTranscription } from "@/lib/live-room-state"
import { Sparkles, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { usePlan } from "@/lib/use-plan"
import { PlanLockIcon } from "@/components/dashboard/plan-lock"

export default function RecordingsPage() {
  const { liveSessions, courses, updateLiveSession } = useLMS()
  const confirm = useConfirm()
  // Search synced to ?q= so a teacher who searched "algebra" can hit
  // refresh / share the link without losing the filter.
  const [search, setSearch] = useUrlState<string>("q", { defaultValue: "" })

  // Search input ref so "/" can focus it. No "n" shortcut on this page —
  // recordings are produced as a side-effect of running a live class,
  // there's nothing to "create" here.
  const searchInputRef = useRef<HTMLInputElement | null>(null)
  usePageShortcut({
    id: "recordings:focus-search",
    keys: "/",
    description: "Focus search",
    handler: () => searchInputRef.current?.focus(),
  })

  const recorded = useMemo(() => {
    const withRecording = liveSessions
      .filter((s) => !!s.recordingUrl)
      .sort((a, b) => (b.roomEndedAt ?? b.scheduledAt).localeCompare(a.roomEndedAt ?? a.scheduledAt))
    return fuzzySearch(withRecording, search, (s) => s.title)
  }, [liveSessions, search])

  // Bulk selection. Stores session ids (not recording ids — a session
  // has a single `recordingUrl` we clear, plus the `recordings` array
  // we wipe). Filter against the visible list at action time so stale
  // ids from a prior filter don't survive.
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const toggleOne = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  const clearSelection = () => setSelected(new Set())

  const visibleIds = recorded.map((s) => s.id)
  const allVisibleSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selected.has(id))
  const someVisibleSelected =
    !allVisibleSelected && visibleIds.some((id) => selected.has(id))
  const toggleAllVisible = () => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (allVisibleSelected) {
        for (const id of visibleIds) next.delete(id)
      } else {
        for (const id of visibleIds) next.add(id)
      }
      return next
    })
  }

  const bulkDeleteRecordings = async () => {
    const ids = Array.from(selected).filter((id) =>
      liveSessions.some((s) => s.id === id),
    )
    if (ids.length === 0) return
    const ok = await confirm({
      title: `Delete ${ids.length} recording${ids.length === 1 ? "" : "s"}?`,
      description:
        "The video URL is cleared from each class. The class itself stays — just the recording link goes.",
      destructive: true,
      confirmLabel: "Delete recordings",
    })
    if (!ok) return
    // Clearing both recordingUrl AND the recordings array — the recordings
    // page filters on recordingUrl, but the class detail page reads from
    // recordings[]. Without clearing both, the recording would silently
    // come back on the class detail view.
    ids.forEach((id) => updateLiveSession(id, { recordingUrl: undefined, recordings: [] }))
    clearSelection()
    toast.success(
      `Deleted ${ids.length} recording${ids.length === 1 ? "" : "s"}.`,
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Recordings</h1>
          <p className="text-muted-foreground">
            Every class recording in one place. Click watch to play inline — no jumping between class pages.
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={searchInputRef}
              placeholder="Search by class title…  ( / )"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      <BulkActionBar
        selectedCount={selected.size}
        totalCount={recorded.length}
        onClear={clearSelection}
        actions={[
          {
            key: "delete",
            label: "Delete recording",
            icon: <Trash2 className="h-3.5 w-3.5" />,
            destructive: true,
            onClick: bulkDeleteRecordings,
          },
        ]}
      />

      <Card>
        <CardContent className="p-0">
          {recorded.length === 0 ? (
            // Recordings can't be authored from scratch — they're a
            // by-product of running a live class with recording on. So
            // instead of "Start from a template" (the pattern Quizzes /
            // Classes / Whiteboards use), this empty state shows a
            // ghosted preview of what a real row will look like, plus a
            // 3-step path to getting one.
            <div className="px-6 py-12 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted/40 text-muted-foreground">
                <Video className="h-5 w-5" />
              </div>
              <h3 className="font-serif text-lg font-semibold">No recordings yet</h3>
              <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
                When you record a live class, the link lands here automatically. Here&apos;s what a row will look like.
              </p>

              {/* Ghosted sample row — opacity-50 so it reads as a
                  preview, not a real entry. Same shape as the real
                  TableRow below so the teacher recognises the layout. */}
              <div className="mx-auto mt-6 max-w-2xl rounded-lg border border-dashed border-border bg-card/40 px-4 py-3 text-left opacity-70">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">Algebra: solving quadratics</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Math 101 · Recorded 2 days ago · 47 min
                    </p>
                  </div>
                  <Button size="sm" variant="outline" disabled className="gap-1.5">
                    <Play className="h-3.5 w-3.5" />
                    Watch
                  </Button>
                </div>
              </div>

              {/* Three-step path: schedule → record → it shows up here. */}
              <ol className="mx-auto mt-8 grid max-w-2xl gap-3 text-left sm:grid-cols-3">
                <li className="flex items-start gap-3 rounded-lg border border-border bg-card p-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <CalendarPlus className="h-3.5 w-3.5" />
                  </span>
                  <div>
                    <p className="text-xs font-semibold">1. Schedule a class</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      Set time + duration on the Classes page.
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3 rounded-lg border border-border bg-card p-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400">
                    <Circle className="h-3.5 w-3.5 fill-current" />
                  </span>
                  <div>
                    <p className="text-xs font-semibold">2. Hit record live</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      Click the red dot once you&apos;re in the room.
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3 rounded-lg border border-border bg-card p-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <Video className="h-3.5 w-3.5" />
                  </span>
                  <div>
                    <p className="text-xs font-semibold">3. It lands here</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      Auto-saved with title + duration filled in.
                    </p>
                  </div>
                </li>
              </ol>

              <div className="mt-6 flex flex-wrap justify-center gap-2">
                <Button asChild size="sm">
                  <Link href="/dashboard/classes">
                    <CalendarPlus className="mr-1.5 h-3.5 w-3.5" />
                    Go to live classes
                  </Link>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link href="/dashboard/classes/new">Schedule one now</Link>
                </Button>
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8">
                    <Checkbox
                      aria-label="Select all visible recordings"
                      checked={
                        allVisibleSelected
                          ? true
                          : someVisibleSelected
                            ? "indeterminate"
                            : false
                      }
                      onCheckedChange={toggleAllVisible}
                    />
                  </TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Recorded</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead className="text-right">Watch</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recorded.map((s) => {
                  const course = courses.find((c) => c.id === s.courseId)
                  return (
                    <RecordingRow
                      key={s.id}
                      session={s}
                      courseTitle={course?.title ?? "—"}
                      isSelected={selected.has(s.id)}
                      onToggle={() => toggleOne(s.id)}
                    />
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────
// Single row — fetches the backend LiveRoomState lazily so the
// player can render captions + transcript even though the rest of
// the page reads from the frontend lms-store. Without this fetch
// the .vtt sidecar produced by the egress poller is invisible.
// ────────────────────────────────────────────────────────────────────

function RecordingRow({
  session,
  courseTitle,
  isSelected,
  onToggle,
}: {
  session: LiveSession
  courseTitle: string
  isSelected: boolean
  onToggle: () => void
}) {
  const { isAllowed } = usePlan()
  const transcriptsAllowed = isAllowed("transcripts")
  const lastRec = session.recordings?.[session.recordings.length - 1]
  const recordedAt = session.roomEndedAt ?? lastRec?.endedAt ?? session.scheduledAt
  const [transcriptUrl, setTranscriptUrl] = useState<string | null>(null)
  const [transcriptText, setTranscriptText] = useState<string | null>(null)
  const [transcribing, setTranscribing] = useState(false)

  // The roomCode helper falls back to a derived value when an older
  // session was created before roomCode existed, so this works for
  // every recording in the table.
  const roomCode = canonicalRoomCode({ id: session.id, roomCode: session.roomCode ?? null })

  useEffect(() => {
    let cancelled = false
    fetchRoomState(roomCode).then((state) => {
      if (cancelled || !state) return
      setTranscriptUrl(state.transcriptUrl ?? null)
      setTranscriptText(state.transcriptText ?? null)
    })
    return () => { cancelled = true }
  }, [roomCode])

  const hasCaptions = !!transcriptUrl || !!transcriptText

  const handleTranscribe = async () => {
    setTranscribing(true)
    const promise = requestTranscription(roomCode)
    toast.promise(promise, {
      loading: "Transcribing — this can take a couple of minutes for long classes…",
      success: (r) => "error" in r ? `Couldn't transcribe: ${r.error}` : "Transcript ready — open the player to see captions.",
      error: "Couldn't transcribe.",
    })
    const r = await promise
    setTranscribing(false)
    if ("error" in r) return
    setTranscriptUrl(r.transcriptUrl)
    setTranscriptText(r.transcriptText)
  }

  return (
    <TableRow data-state={isSelected ? "selected" : undefined}>
      <TableCell>
        <Checkbox
          aria-label={`Select recording for ${session.title}`}
          checked={isSelected}
          onCheckedChange={onToggle}
        />
      </TableCell>
      <TableCell>
        <Link href={`/dashboard/classes/${session.id}`} className="font-medium hover:underline">
          {session.title}
        </Link>
        {session.summary && (
          <p className="line-clamp-1 text-xs text-muted-foreground">{session.summary}</p>
        )}
        {hasCaptions && (
          <p className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-success">
            <Captions className="h-3 w-3" /> Captions + transcript ready
          </p>
        )}
      </TableCell>
      <TableCell>
        <span className="text-sm text-muted-foreground">{courseTitle}</span>
      </TableCell>
      <TableCell>
        <span className="text-sm tabular-nums">
          {recordedAt
            ? new Date(recordedAt).toLocaleString(undefined, {
                month: "short",
                day: "numeric",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })
            : "—"}
        </span>
      </TableCell>
      <TableCell>
        <span className="text-sm text-muted-foreground tabular-nums">
          {lastRec ? `${Math.round(lastRec.durationSec / 60)} min` : "—"}
        </span>
      </TableCell>
      <TableCell className="text-right">
        <div className="inline-flex items-center gap-1.5">
          {!hasCaptions && (
            transcriptsAllowed ? (
              <Button
                size="sm"
                variant="ghost"
                className="gap-1.5 text-xs text-primary hover:bg-primary/5"
                onClick={handleTranscribe}
                disabled={transcribing}
                title="Run Whisper on this recording."
              >
                {transcribing ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5" />
                )}
                Transcribe
              </Button>
            ) : (
              <PlanLockIcon feature="transcripts" />
            )
          )}
          <RecordingPlayerDialog
            url={session.recordingUrl!}
            title={session.title}
            triggerLabel="Watch"
            transcriptUrl={transcriptUrl}
            transcriptText={transcriptText}
          />
        </div>
      </TableCell>
    </TableRow>
  )
}
