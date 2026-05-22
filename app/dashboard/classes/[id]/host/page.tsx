"use client"

// Teacher host-control page for an in-house live class.
//
// Three states map 1:1 with the LiveSession.roomState machine:
//
//   scheduled  → "Open the room" button. Students sitting in the
//                waiting room get auto-beamed in when this fires.
//   open/live  → the active class. Mute / cam / share controls
//                plus a panel showing waiting students. "End class"
//                stops the room and stamps a stub recording.
//   ended      → wrap screen with recording link + "schedule the
//                next class" CTA.
//
// Like the student page, the actual video surface here is a
// placeholder — when LiveKit/Daily/100ms gets wired in, the room
// iframe slots into the same shell with no other changes.

import { use, useEffect, useRef, useState } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  PhoneOff,
  Play,
  Radio,
  Settings,
  Sparkles,
  Circle,
  Square,
  StopCircle,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useLMS, type LiveSession } from "@/lib/lms-store"
import { useConfirm } from "@/lib/use-confirm"
import { toast } from "sonner"
import { LiveKitRoom, LiveKitVideoUI } from "@/components/classes/livekit-room"
import { RecordingPlayerDialog } from "@/components/classes/recording-player-dialog"
import { apiBase, canonicalRoomCode } from "@/lib/jitsi"
import { WhiteboardCanvas } from "@/components/whiteboard/whiteboard-canvas"
import { useHostRecording } from "@/lib/use-host-recording"
import { useWhiteboardAccess } from "@/lib/whiteboard-access"
import { LiveStateBeacon } from "@/components/classes/live-state-beacon"
import { PreflightChecklist } from "@/components/classes/preflight-checklist"
import { DashboardBreadcrumbs } from "@/components/dashboard/dashboard-breadcrumbs"
import { ensureAuthed } from "@/lib/billing-client"
import { AlertTriangle, Lock, Unlock } from "lucide-react"
import { cn } from "@/lib/utils"

export default function HostLiveRoomPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const {
    liveSessions,
    getCourseById,
    getUserById,
    getCourseEnrollments,
    currentUser,
    openLiveRoom,
    startLiveRoom,
    endLiveRoom,
  } = useLMS()
  const confirm = useConfirm()
  // Backend auth check — students-stuck-in-lobby was traced to silent
  // 401s when the host's stored access token was stale (e.g. left
  // open overnight). hasAccessToken() returns true for a stale token
  // too, so the earlier "trust localStorage" check missed it.
  //
  // Real probe: call the authed /api/auth/me endpoint. If it 401s,
  // try a refresh-cookie mint. If THAT also 401s, the host needs to
  // sign in again and we render a loud banner so they know — instead
  // of clicking "Open the room" 10 times wondering why students
  // aren't joining.
  const [backendAuthed, setBackendAuthed] = useState<boolean | null>(null)
  useEffect(() => {
    let cancelled = false
    const apiBase = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000").replace(/\/$/, "")
    const probe = async () => {
      const token = window.localStorage.getItem("thebigclass.accessToken")
      if (token) {
        const r = await fetch(`${apiBase}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
          credentials: "include",
        }).catch(() => null)
        if (r?.ok) return true
      }
      // Token absent or rejected → try a refresh, which writes a new
      // access token to localStorage if the refresh cookie is alive.
      const refreshed = await ensureAuthed()
      if (!refreshed) return false
      // Verify the new token actually works.
      const t2 = window.localStorage.getItem("thebigclass.accessToken")
      if (!t2) return false
      const r2 = await fetch(`${apiBase}/api/auth/me`, {
        headers: { Authorization: `Bearer ${t2}` },
        credentials: "include",
      }).catch(() => null)
      return !!r2?.ok
    }
    void probe().then((ok) => {
      if (!cancelled) setBackendAuthed(ok)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const session = liveSessions.find((s) => s.id === id)
  const course = session ? getCourseById(session.courseId) : undefined
  // The teacher's actual name — pulled from the session's host record (lets
  // an admin host on behalf of a specific instructor) with a fallback to the
  // logged-in user. Jitsi receives this as displayName so the pre-join name
  // input never appears.
  const teacherName =
    (session ? getUserById(session.hostId)?.name : undefined) ??
    currentUser?.name ??
    "Instructor"
  const teacherEmail =
    (session ? getUserById(session.hostId)?.email : undefined) ??
    currentUser?.email ??
    ""

  if (!session) {
    return (
      <div className="space-y-4 py-12 text-center">
        <h2 className="font-serif text-xl font-bold">Class not found</h2>
        <Button asChild variant="outline">
          <Link href="/dashboard/classes">
            <ArrowLeft className="mr-1.5 h-4 w-4" /> Back to classes
          </Link>
        </Button>
      </div>
    )
  }

  if (session.provider !== "in-house") {
    return (
      <div className="space-y-4 py-12 text-center">
        <h2 className="font-serif text-xl font-bold">This class runs on {session.provider}</h2>
        <p className="text-sm text-muted-foreground">
          The Host control screen is only available for in-house rooms. For external providers,
          open the meeting link from the class detail page.
        </p>
        <Button asChild variant="outline">
          <Link href={`/dashboard/classes/${session.id}`}>
            <ArrowLeft className="mr-1.5 h-4 w-4" /> Back to class
          </Link>
        </Button>
      </div>
    )
  }

  const state = session.roomState ?? "scheduled"

  // Loud banner when we couldn't authenticate against the backend.
  // The host's "Open the room" / "Start" actions write to the
  // backend behind requireAuth; if there's no token + no refresh
  // cookie, those writes silently 401 and students never see the
  // room state change. Make that failure mode visible instead of
  // hidden inside the console.
  const authBanner =
    backendAuthed === false ? (
      <div className="mx-auto my-4 flex max-w-3xl items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-destructive">Not signed in — students won&apos;t be admitted</p>
          <p className="mt-1 text-muted-foreground">
            The backend doesn&apos;t see you as the host of this room, so
            opening it here changes your view only. Sign in (or refresh
            your session) so the room state actually reaches students.
          </p>
          <p className="mt-2">
            <Link href="/login" className="font-medium text-primary hover:underline">
              Sign in →
            </Link>
          </p>
        </div>
      </div>
    ) : null

  if (state === "scheduled") {
    return (
      <>
        {authBanner}
        <PreOpenScreen
          session={session}
          courseTitle={course?.title}
          backendAuthed={backendAuthed}
          enrolledCount={getCourseEnrollments(session.courseId).length}
          onOpen={() => {
            openLiveRoom(session.id)
            // Also nudge to "live" — the student page does this when
            // a student lands, but if the teacher opens the room and
            // no student joins immediately we still want to show the
            // "live" UI to them.
            setTimeout(() => startLiveRoom(session.id), 250)
            toast.success("Room is open — students will be beamed in")
          }}
        />
      </>
    )
  }

  if (state === "open" || state === "live") {
    return (
      <LiveHostShell
        teacherEmail={teacherEmail}
        session={session}
        courseTitle={course?.title}
        teacherName={teacherName}
        backendAuthed={backendAuthed}
        onEnd={async (rec) => {
          const ok = await confirm({
            title: "End the class?",
            description:
              "Students get beamed out, the recording is finalised, and the class moves to ‘ended’.",
            destructive: false,
            confirmLabel: "End class",
          })
          if (!ok) return
          const startedAt = rec?.startedAt ?? session.roomStartedAt ?? session.roomOpenedAt ?? new Date().toISOString()
          const endedAt = rec?.endedAt ?? new Date().toISOString()
          const durationSec = rec?.durationSec ?? Math.max(
            0,
            Math.round((new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 1000),
          )
          endLiveRoom(session.id, {
            url: rec?.url ?? "",
            startedAt,
            endedAt,
            durationSec,
            pending: !rec,
          })
          toast.success(rec ? "Class ended — recording saved" : "Class ended")
        }}
      />
    )
  }

  // ended
  return <EndedHostScreen session={session} />
}

// ---------------------------------------------------------------
// State: scheduled — pre-open. Teacher prep + "Open the room" CTA.
// ---------------------------------------------------------------

function PreOpenScreen({
  session,
  courseTitle,
  backendAuthed,
  enrolledCount,
  onOpen,
}: {
  session: LiveSession
  courseTitle?: string
  backendAuthed: boolean | null
  enrolledCount: number
  onOpen: () => void
}) {
  const confirm = useConfirm()

  // How early/late we are vs the scheduled start. Negative = early.
  // Recomputed every second so the button label stays accurate while
  // the host idles on the page waiting for the start time.
  const [nowMs, setNowMs] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNowMs(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])
  const scheduledMs = new Date(session.scheduledAt).getTime()
  const diffMin = Math.round((nowMs - scheduledMs) / 60_000)
  // "Significantly early" = more than 5 min before schedule. Triggers
  // a confirm so a stray click doesn't pull students in 25 min before
  // they expected class to start.
  const isEarly = diffMin <= -5
  const isLate = diffMin >= 5

  const timingLabel = (() => {
    if (diffMin <= -1) return `${Math.abs(diffMin)} min before schedule`
    if (diffMin >= 1) return `${diffMin} min after schedule`
    return "Right on time"
  })()
  const timingTone =
    diffMin <= -5
      ? "amber"
      : diffMin >= 5
        ? "amber"
        : "emerald"

  const handleStart = async () => {
    if (isEarly) {
      const ok = await confirm({
        title: `Start ${Math.abs(diffMin)} min early?`,
        description:
          "Students will be admitted right away. Anyone with the join link who's already on the waiting screen jumps straight into the call — useful if you're ready ahead of schedule and want to bring people in.",
        confirmLabel: "Start now",
      })
      if (!ok) return
    }
    onOpen()
  }

  return (
    <div className="space-y-6">
      {/* Crumbs: Classes › <Course> › <Class> › Host. The Course
          crumb is omitted when this session has no parent course
          (rare — only happens on standalone test sessions). */}
      <DashboardBreadcrumbs
        crumbs={[
          { label: "Classes", href: "/dashboard/classes" },
          ...(courseTitle && session.courseId
            ? [{ label: courseTitle, href: `/dashboard/courses/${session.courseId}` }]
            : []),
          { label: session.title, href: `/dashboard/classes/${session.id}` },
          { label: "Host" },
        ]}
      />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold tracking-tight">
            Host: {session.title}
          </h1>
          <p className="text-sm text-muted-foreground">
            {new Date(session.scheduledAt).toLocaleString()} · {session.durationMinutes} min
            {courseTitle ? ` · ${courseTitle}` : ""}
          </p>
        </div>
        <Badge variant="outline" className="border-amber-500/40 bg-amber-500/5 text-amber-600">
          <Settings className="mr-1 h-3 w-3" />
          Room scheduled — not yet open
        </Badge>
      </div>

      <Card>
        <CardContent className="space-y-5 p-8 text-center">
          <Sparkles className="mx-auto h-10 w-10 text-primary" />
          <h2 className="font-serif text-2xl font-bold">
            {isEarly ? "Want to start early?" : isLate ? "Class is past its start time." : "Ready when you are."}
          </h2>
          <p className="mx-auto max-w-md text-sm text-muted-foreground">
            Click <span className="font-medium text-foreground">Start class now</span> and every student
            on the waiting screen jumps straight into the call. Recording starts automatically.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <div className="flex flex-col items-center gap-1">
              <Button size="lg" onClick={handleStart}>
                <Radio className="mr-1.5 h-4 w-4" />
                Start class now
              </Button>
              <span
                className={cn(
                  "text-[11px] font-medium",
                  timingTone === "emerald"
                    ? "text-success"
                    : "text-amber-600 dark:text-amber-400",
                )}
              >
                {timingLabel}
              </span>
            </div>
            <Button asChild size="lg" variant="outline">
              <Link href={`/dashboard/classes/${session.id}`}>
                Class settings
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Live preflight — replaces the old static "mental tickbox"
          list with five real checks: signed in, camera/mic granted,
          recording supported, audience present. The "signed in" row
          is the one the silent-401 lobby bug needed; it'd have caught
          a stale token before the host clicked "Open the room" and
          students stayed stuck in the lobby. */}
      <PreflightChecklist
        backendAuthed={backendAuthed}
        enrolledCount={enrolledCount}
      />
    </div>
  )
}

// ---------------------------------------------------------------
// State: open/live — the actual host shell.
// ---------------------------------------------------------------

function LiveHostShell({
  session,
  courseTitle,
  teacherName,
  teacherEmail,
  backendAuthed,
  onEnd,
}: {
  session: LiveSession
  courseTitle?: string
  teacherName: string
  teacherEmail: string
  backendAuthed: boolean | null
  onEnd: (recording?: { url: string; startedAt: string; endedAt: string; durationSec: number }) => void
}) {
  void courseTitle

  // Captured recording, kept in local state. Set by useHostRecording.onFinal
  // when the upload completes. End-Class reads from here when the host clicks
  // it. Crucially: finishing the recording NO LONGER triggers End-Class —
  // they're independent actions.
  const recordedRef = useRef<{ url: string; startedAt: string; endedAt: string; durationSec: number } | null>(null)
  const recording = useHostRecording({
    // Must match the room that LiveKitRoom joins, otherwise we'd record a
    // different room than the host is in.
    roomId: canonicalRoomCode(session),
    title: session.title,
    notifyEmails: [teacherEmail].filter(Boolean),
    onFinal: (rec) => {
      recordedRef.current = rec
      // Show a quick toast so the host knows the recording is safe.
      toast.success("Recording saved")
    },
  })

  // Stage tab: video call vs whiteboard. Both stay mounted (CSS hide/show)
  // so switching back doesn't drop the Jitsi connection or wipe the canvas.
  const [stageTab, setStageTab] = useState<"video" | "whiteboard">("video")

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background overflow-hidden">
      {backendAuthed === false && (
        <div className="flex shrink-0 items-center gap-2 border-b border-destructive/40 bg-destructive/10 px-3 py-1.5 text-[11px] text-destructive">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          <span className="font-semibold">Not signed in</span>
          <span className="truncate text-destructive/80">
            — backend doesn&apos;t recognise you as the host, so students stay in the lobby.
          </span>
          <Link href="/login" className="ml-auto shrink-0 font-semibold underline">
            Sign in →
          </Link>
        </div>
      )}
      {/* Slim top bar — just the essentials. Jitsi's own toolbar inside the
          iframe handles mic, camera, screen-share, chat, participants, raise
          hand, tile view. We only own: leave, recording, end class. */}
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-border/60 bg-card px-4">
        <Link
          href="/dashboard/classes"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Leave host view
        </Link>
        <div className="flex items-center gap-3 truncate text-xs">
          <Badge variant="outline" className="border-emerald-500/40 bg-emerald-500/10 text-emerald-600">
            <span className="mr-1 h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live
          </Badge>
          <span className="truncate font-medium">{session.title}</span>
          <div className="ml-2 flex rounded-md border border-border/60 bg-muted/40 p-0.5">
            <button
              type="button"
              onClick={() => setStageTab("video")}
              className={cn(
                "px-2.5 py-0.5 rounded text-[11px] font-medium transition-colors",
                stageTab === "video" ? "bg-black text-white shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              Video
            </button>
            <button
              type="button"
              onClick={() => setStageTab("whiteboard")}
              className={cn(
                "px-2.5 py-0.5 rounded text-[11px] font-medium transition-colors",
                stageTab === "whiteboard" ? "bg-black text-white shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              Whiteboard
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {recording.status === "recording" && (
            <>
              <span className="flex items-center gap-1.5 text-xs text-red-500 font-medium animate-pulse">
                <span className="h-2 w-2 rounded-full bg-red-500" />
                Recording
              </span>
              <Button size="sm" variant="outline" onClick={recording.stop}>
                <Square className="mr-1.5 h-3.5 w-3.5 fill-red-500 text-red-500" />
                Stop recording
              </Button>
            </>
          )}
          {recording.status === "uploading" && (
            <span className="text-xs text-muted-foreground">Finalizing recording…</span>
          )}
          {recording.status === "done" && (
            <>
              <span className="text-xs text-emerald-600 font-medium mr-2">● Recording saved</span>
              <Button size="sm" variant="outline" onClick={recording.start}>
                <Circle className="mr-1.5 h-3.5 w-3.5 fill-red-500 text-red-500" />
                Record again
              </Button>
            </>
          )}
          {(recording.status === "idle" || recording.status === "asking" || recording.status === "error") && (
            <Button size="sm" variant="outline" onClick={recording.start}>
              <Circle className="mr-1.5 h-3.5 w-3.5 fill-red-500 text-red-500" />
              Start recording
            </Button>
          )}
          {recording.error && (
            <span className="text-xs text-red-500 font-medium" title={recording.error}>
              Recording error
            </span>
          )}
          {/* <Button
            variant="destructive"
            size="sm"
            onClick={() => {
              // End-Class is independent from Stop-Recording. If a recording
              // is in-flight, stop it first; then close out the class with
              // whatever was captured. The host only confirms once — here.
              if (recording.status === "recording") {
                recording.stop()
              }
              onEnd(recordedRef.current ?? undefined)
            }}
          >
            <PhoneOff className="mr-1.5 h-3.5 w-3.5" />
            End class
          </Button> */}
        </div>
      </div>

      {/* Stage. Both surfaces stay mounted INSIDE the same LiveKit room
          context — toggling the tab swaps which is visible while the call
          connection stays alive. Sharing the room lets the whiteboard use
          the LiveKit data channel for multiplayer cursors + element sync
          without opening a second connection. */}
      <div className="flex-1 overflow-hidden p-2">
        <LiveKitRoom
          roomCode={canonicalRoomCode(session)}
          user={{ id: `host-${session.id}`, name: teacherName }}
          isHost
          onLeft={() => {
            if (recording.status === "recording") {
              recording.stop()
            }
            onEnd(recordedRef.current ?? undefined)
          }}
          className="h-full w-full rounded-xl overflow-hidden border border-border/60"
        >
          {/* Beacon: pushes state="live" to the backend the moment
              this host's LiveKit room actually connects, then again
              every 30s while connected. Defends against the silent-
              401 / forgot-to-click-Open-the-room class of bugs that
              left students stuck in the lobby even though the host
              was in the call. Renders nothing visible. */}
          <LiveStateBeacon
            roomCode={canonicalRoomCode(session)}
            scheduledAt={session.scheduledAt}
            durationMinutes={session.durationMinutes}
            title={session.title}
            hostName={teacherName}
          />
          {/* Tabs must use flex layout when visible so the LiveKit
              video grid + control bar stack vertically. The earlier
              `block`+`flex flex-col` combo silently broke because
              `block` won the CSS display fight — and the control bar
              disappeared off-screen as a result. */}
          <div className={cn("h-full w-full flex-col", stageTab === "video" ? "flex" : "hidden")}>
            <LiveKitVideoUI />
          </div>
          <div className={cn("h-full w-full", stageTab === "whiteboard" ? "block" : "hidden")}>
            <HostWhiteboardStage
              persistenceKey={session.id}
              participantName={teacherName}
            />
          </div>
        </LiveKitRoom>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------
// Host whiteboard stage — wraps the canvas with a small toolbar
// that lets the host flip between "Private (host only)" and
// "Open for students". The toggle's state is broadcast in real
// time via the LiveKit data channel; students' tabs flip the
// moment the host clicks (no refresh, no polling). Defaults to
// private so naughty kids can't doodle on the canvas the moment
// they arrive — host has to opt them in.
// ---------------------------------------------------------------
function HostWhiteboardStage({
  persistenceKey,
  participantName,
}: {
  persistenceKey: string
  participantName: string
}) {
  const { isOpen, setOpen } = useWhiteboardAccess(true)
  return (
    <div className="flex h-full w-full flex-col">
      <div className="flex shrink-0 items-center justify-between border-b border-border/60 bg-card/60 px-3 py-1.5 text-xs">
        <span className="flex items-center gap-1.5 text-muted-foreground">
          {isOpen ? (
            <Unlock className="h-3.5 w-3.5 text-success" />
          ) : (
            <Lock className="h-3.5 w-3.5 text-amber-600" />
          )}
          Whiteboard access:{" "}
          <span className={cn("font-semibold", isOpen ? "text-success" : "text-amber-700")}>
            {isOpen ? "Open for students" : "Private (host only)"}
          </span>
        </span>
        <Button
          variant="default"
          size="sm"
          className="h-7 gap-1.5 bg-black text-xs text-white hover:bg-black/90"
          onClick={() => {
            setOpen(!isOpen)
            toast.success(
              isOpen
                ? "Whiteboard locked — students see a private notice."
                : "Whiteboard opened — students can draw now.",
            )
          }}
        >
          {isOpen ? (
            <>
              <Lock className="h-3.5 w-3.5" />
              Make private
            </>
          ) : (
            <>
              <Unlock className="h-3.5 w-3.5" />
              Allow students to draw
            </>
          )}
        </Button>
      </div>
      <div className="flex-1 overflow-hidden">
        <WhiteboardCanvas
          persistenceKey={persistenceKey}
          className="h-full w-full"
          enableSync
          participantName={participantName}
        />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------
// State: ended — wrap + recording.
// ---------------------------------------------------------------

function EndedHostScreen({ session }: { session: LiveSession }) {
  const { updateLiveSession } = useLMS()
  const recording = session.recordings?.[session.recordings.length - 1]
  const [recordingErr, setRecordingErr] = useState<string | null>(null)
  // If the recording is still pending (the egress was finalising when the
  // host clicked End Class), poll /state every 5s for the URL or an error.
  useEffect(() => {
    if (!recording?.pending) return
    const roomCode = canonicalRoomCode(session)
    const t = setInterval(async () => {
      try {
        const res = await fetch(
          `${apiBase()}/api/live-sessions/${encodeURIComponent(roomCode)}/state`,
          { credentials: "include" },
        )
        if (!res.ok) return
        const j = await res.json()
        const errMsg: string | null = j?.recordingError ?? null
        if (errMsg) {
          setRecordingErr(errMsg)
          // Drop the pending recording stub so the UI stops showing "Processing"
          // forever — there's no file coming.
          const trimmed = (session.recordings ?? []).slice(0, -1)
          updateLiveSession(session.id, { recordings: trimmed })
          return
        }
        const url: string | null = j?.recordingUrl ?? null
        if (!url) return
        const updatedRecordings = (session.recordings ?? []).map((r, i, arr) =>
          i === arr.length - 1 ? { ...r, url, pending: false } : r,
        )
        updateLiveSession(session.id, {
          recordings: updatedRecordings,
          recordingUrl: url,
        })
      } catch {
        // Network flake — try again on the next tick.
      }
    }, 5000)
    return () => clearInterval(t)
  }, [recording?.pending, session, updateLiveSession])
  return (
    <div className="mx-auto max-w-2xl py-12">
      <Card>
        <CardContent className="space-y-4 p-8 text-center">
          <Badge variant="outline" className="border-success/40 bg-success/5 text-success">
            <Sparkles className="mr-1 h-3 w-3" />
            Class ended
          </Badge>
          <h1 className="font-serif text-2xl font-bold">That&apos;s a wrap.</h1>
          <p className="text-sm text-muted-foreground">
            {recordingErr
              ? recordingErr
              : recording?.pending
                ? "Recording is processing — we'll email you when it's ready."
                : recording
                  ? "Recording is available below."
                  : "No recording was captured for this class."}
          </p>
          {recording && (
            <Card>
              <CardContent className="flex items-center justify-between gap-3 p-3">
                <div className="flex items-center gap-3 text-left">
                  <div className="flex h-10 w-10 items-center justify-center rounded bg-primary/10 text-primary">
                    <Play className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Class recording</p>
                    <p className="text-xs text-muted-foreground">
                      {Math.round(recording.durationSec / 60)} min
                    </p>
                  </div>
                </div>
                {recording.pending ? (
                  <Badge variant="outline">Processing…</Badge>
                ) : recording.url ? (
                  <RecordingPlayerDialog url={recording.url} title={session.title} />
                ) : null}
              </CardContent>
            </Card>
          )}
          <div className="flex justify-center gap-3 pt-4">
            <Button asChild variant="outline">
              <Link href={`/dashboard/classes/${session.id}`}>Class settings</Link>
            </Button>
            <Button asChild>
              <Link href="/dashboard/classes/new">Schedule the next class</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
