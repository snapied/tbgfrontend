"use client"

// Instructor host-control page for an in-house live class.
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
  Users,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useLMS, type LiveSession } from "@/lib/lms-store"
import { useConfirm } from "@/lib/use-confirm"
import { toast } from "sonner"
import { LiveKitRoom, LiveKitVideoUI } from "@/components/classes/livekit-room"
import { RosterPanel } from "@/components/classes/roster-panel"
import { RecordingPlayerDialog } from "@/components/classes/recording-player-dialog"
import { apiBase, canonicalRoomCode } from "@/lib/jitsi"
import { WhiteboardCanvas } from "@/components/whiteboard/whiteboard-canvas"
import { useHostRecording } from "@/lib/use-host-recording"
import { useWhiteboardAccess } from "@/lib/whiteboard-access"
import { LiveStateBeacon } from "@/components/classes/live-state-beacon"
import { PreflightChecklist } from "@/components/classes/preflight-checklist"
import { EndClassWrapWizard, type EndClassDecision } from "@/components/classes/end-class-wrap-wizard"
import { legacyBlocksToBlocknoteContent, useDocs, type DocBlock } from "@/lib/docs"
import { addReferenceEdge } from "@/lib/doc-references"
import { BreakoutRoomsPanel } from "@/components/classes/breakout-rooms-panel"
import { HostHealthBar } from "@/components/classes/host-health-bar"
import { PassTheMicMenu } from "@/components/classes/pass-the-mic-menu"
import { InClassAgendaPanel } from "@/components/classes/in-class-agenda-panel"
import { LivePollPanel } from "@/components/classes/live-poll-panel"
import { tallyPoll as tallyLivePoll } from "@/lib/live-poll"
import {
  buildNotifications,
  livePollLaunchedNotification,
  livePollClosedNotification,
} from "@/lib/notifications"
import { readCurrentTenantSlug } from "@/lib/tenant-store"
import { RaisedHandsPanel } from "@/components/classes/raised-hands-panel"
import { readChatTranscript, clearChatTranscript } from "@/components/classes/livekit-room"
import { useRaisedHands } from "@/lib/raised-hands"
import { MobileTeacherControls } from "@/components/classes/mobile-teacher-controls"
import { DashboardBreadcrumbs } from "@/components/dashboard/dashboard-breadcrumbs"
import { ensureAuthed } from "@/lib/billing-client"
import { AlertTriangle, BarChart3, ClipboardList, Hand, Layers, Lock, Unlock } from "lucide-react"
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
    // Sprint A Classes #22 — wrap wizard reads the attached
    // community for the "share to community" checkbox and updates
    // session metadata (wasHeld + summary) on confirm.
    studentGroups,
    updateLiveSession,
    // Sprint C Classes #43 — class-end → community recap. Posts a
    // structured recap into the attached community's feed.
    addBatchPost,
    // Enrolled students for the course — used by the breakouts
    // panel so auto-assign has real names to distribute, not the
    // [host-only] placeholder it used to receive. Best available
    // approximation of "people in the room" without piping
    // LiveKit's participant list into a sibling component.
    enrollments,
    users,
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
  // Roster fed to the breakouts panel. We can't read live-room
  // participants from a sibling of LiveKitRoom (no shared context),
  // so we fall back to the course's enrolled students — the
  // closest "people who might be in the room" universe available
  // outside the LiveKit subtree. Host is always pinned first so
  // auto-assign treats them as an anchor rather than a regular
  // participant.
  const breakoutParticipants = (() => {
    const out: Array<{ id: string; name: string }> = [
      { id: `host-${session?.id ?? "x"}`, name: teacherName },
    ]
    if (!session?.courseId) return out
    const enrolledIds = new Set(
      enrollments.filter((e) => e.courseId === session.courseId).map((e) => e.studentId),
    )
    for (const u of users) {
      if (!enrolledIds.has(u.id)) continue
      if (u.id === session?.hostId) continue
      out.push({ id: u.id, name: u.name })
    }
    return out
  })()
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
    // Sprint A Classes #22 — pull attached community for the wrap
    // wizard's "share to community" toggle.
    const attachedCommunity = course?.defaultBatchId
      ? studentGroups.find((g) => g.id === course.defaultBatchId)
      : undefined
    return (
      <LiveHostShellWithWrap
        teacherEmail={teacherEmail}
        session={session}
        courseTitle={course?.title}
        teacherName={teacherName}
        backendAuthed={backendAuthed}
        attachedCommunityName={attachedCommunity?.name}
        hasAttachedCommunity={!!attachedCommunity}
        breakoutParticipants={breakoutParticipants}
        onEnd={(rec, decision) => {
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
          // Sprint A Classes #22 — persist the wrap decisions onto
          // the session record so downstream surfaces (attendance,
          // recap email, recording-ready notification) can read them
          // back. `wasHeld === false` cancels the recording auto-
          // publish chain by clearing recordingUrl too.
          // Flush the buffered LiveKit chat into the session record
          // so the recording detail page can render the side-channel
          // conversation alongside the video. Empty arrays are fine —
          // students might not have used chat at all. Clear the
          // buffer after persist so the localStorage entry doesn't
          // outlive the class.
          const chatTranscript = readChatTranscript(session.id)
          updateLiveSession(session.id, {
            wasHeld: decision.wasHeld,
            summary: decision.summary,
            chatTranscript: chatTranscript.length > 0 ? chatTranscript : undefined,
          })
          if (chatTranscript.length > 0) clearChatTranscript(session.id)
          // Sprint C Classes #43 — class-end → community recap.
          // When the teacher said "share to community" AND the
          // class was actually held AND a community is attached,
          // post a structured recap card to the feed. We dedupe by
          // checking the existing auto-post marker the recording-
          // ready handler uses (so we don't double-post when the
          // recording arrives shortly after).
          if (
            decision.wasHeld &&
            decision.shareToCommunity &&
            course?.defaultBatchId &&
            currentUser
          ) {
            const recapBody = [
              `<p data-recap-class="${session.id}">`,
              `🎬 <strong>Class recap — ${escapeHtml(session.title)}</strong>`,
              `</p>`,
              decision.summary
                ? `<p>${escapeHtml(decision.summary)}</p>`
                : "",
              `<p>Recording will be posted here once it's processed.</p>`,
            ].join("")
            try {
              addBatchPost({
                id: `post-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
                batchId: course.defaultBatchId,
                authorId: currentUser.id,
                body: recapBody,
                pinned: true,
                hidden: false,
                comments: [],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              })
            } catch {
              /* tolerable — wrap flow shouldn't fail because of a
                 follow-up post. The teacher can re-share manually
                 from the recording details sheet. */
            }
          }
          // Route to the appropriate follow-up surface. Skip / null
          // = stay on the ended screen.
          if (decision.followUp === "assignment") {
            window.location.href = `/dashboard/assignments/new?courseId=${course?.id ?? ""}&from=class:${session.id}`
          } else if (decision.followUp === "doubts") {
            window.location.href = `/dashboard/doubts?from=class:${session.id}`
          } else if (decision.followUp === "next-class") {
            // Carry `fromSessionId` so the new-class form can pre-fill
            // from the just-ended class — title (incremented Week N),
            // scheduledAt (+7d at same time), duration, agenda, host,
            // provider. Saves the 5-field re-fill weekly-series
            // teachers used to do by hand.
            window.location.href = `/dashboard/classes/new?courseId=${course?.id ?? ""}&fromSessionId=${session.id}`
          }
          toast.success(
            decision.wasHeld
              ? rec
                ? "Class ended — recording saved"
                : "Class ended"
              : "Class marked cancelled — students notified",
          )
        }}
      />
    )
  }

  // ended
  return <EndedHostScreen session={session} />
}

// ---------------------------------------------------------------
// State: scheduled — pre-open. Instructor prep + "Open the room" CTA.
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
        sessionId={session.id}
      />
    </div>
  )
}

// ---------------------------------------------------------------
// State: open/live — the actual host shell.
// ---------------------------------------------------------------

/** Sprint A Classes #22 — thin wrapper around LiveHostShell that
 *  intercepts the End-Class click and routes through the wrap
 *  wizard. The shell itself is unchanged so all its internal state
 *  (recording, whiteboard, etc.) stays put; we just delay the actual
 *  endLiveRoom call until the wizard returns a decision. */
function LiveHostShellWithWrap({
  session,
  courseTitle,
  teacherName,
  teacherEmail,
  backendAuthed,
  onEnd,
  attachedCommunityName,
  hasAttachedCommunity,
  breakoutParticipants,
}: {
  session: LiveSession
  courseTitle?: string
  teacherName: string
  teacherEmail: string
  backendAuthed: boolean | null
  onEnd: (
    recording: { url: string; startedAt: string; endedAt: string; durationSec: number } | undefined,
    decision: EndClassDecision,
  ) => void
  attachedCommunityName?: string
  hasAttachedCommunity: boolean
  breakoutParticipants: Array<{ id: string; name: string }>
}) {
  const [wrapOpen, setWrapOpen] = useState(false)
  const { currentUser } = useLMS()
  const { createDoc } = useDocs()
  // Hold the recording artifact between "shell asked to end" and
  // "wizard confirmed". Without this we'd lose the recording payload
  // because the shell's onEnd fires once and we need both moments.
  const [pendingRecording, setPendingRecording] = useState<
    | { url: string; startedAt: string; endedAt: string; durationSec: number }
    | undefined
  >(undefined)

  return (
    <>
      <LiveHostShell
        session={session}
        courseTitle={courseTitle}
        teacherName={teacherName}
        teacherEmail={teacherEmail}
        backendAuthed={backendAuthed}
        breakoutParticipants={breakoutParticipants}
        onEnd={(rec) => {
          setPendingRecording(rec)
          setWrapOpen(true)
        }}
      />
      <EndClassWrapWizard
        open={wrapOpen}
        onOpenChange={setWrapOpen}
        sessionTitle={session.title}
        hasAttachedCommunity={hasAttachedCommunity}
        attachedCommunityName={attachedCommunityName}
        // Feed the AI-draft button on the summary step with the
        // course name + pre-class agenda items so the generated
        // recap is concrete instead of generic.
        courseTitle={courseTitle}
        agendaTitles={session.agenda?.map((a) => a.title).filter((t): t is string => !!t)}
        onConfirm={(decision) => {
          onEnd(pendingRecording, decision)
        }}
        // Generate a study guide Doc from the class — uses the
        // agenda + summary as scaffolding and adds a
        // `generated-from` ReferenceEdge so the recording page
        // surfaces it as a related artifact.
        onGenerateStudyGuide={({ summary, agendaTitles }) => {
          if (!currentUser) return
          const nowTitle = `Study guide — ${session.title}`
          const blocks: DocBlock[] = []
          if (summary.trim()) {
            blocks.push({ id: `blk-${Date.now()}-s`, type: "callout", data: { tone: "info", html: `<p>${summary.trim()}</p>` } })
          }
          if (agendaTitles.length > 0) {
            blocks.push({ id: `blk-${Date.now()}-h`, type: "heading", data: { level: 2, text: "What we covered" } })
            blocks.push({
              id: `blk-${Date.now()}-l`,
              type: "rich-text",
              data: { html: `<ul>${agendaTitles.map((t) => `<li>${t}</li>`).join("")}</ul>` },
            })
          }
          blocks.push({ id: `blk-${Date.now()}-rh`, type: "heading", data: { level: 2, text: "Recording" } })
          blocks.push({ id: `blk-${Date.now()}-r`, type: "embed-recording", data: { refId: session.id } })
          blocks.push({ id: `blk-${Date.now()}-qh`, type: "heading", data: { level: 2, text: "Questions raised" } })
          blocks.push({ id: `blk-${Date.now()}-q`, type: "rich-text", data: { html: "<p>(Add top questions from class chat.)</p>" } })
          blocks.push({ id: `blk-${Date.now()}-ah`, type: "heading", data: { level: 2, text: "Action items before next class" } })
          blocks.push({ id: `blk-${Date.now()}-a`, type: "rich-text", data: { html: "<ul><li>(Add an action item)</li></ul>" } })
          const doc = createDoc({
            ownerId: currentUser.id,
            title: nowTitle,
            icon: "🎬",
            blocks,
            // Seed BlockNote content so the new editor opens with the
            // study-guide scaffold visible — without this, opening the
            // doc shows a blank page because the editor only reads
            // from `content`, not legacy `blocks`.
            content: legacyBlocksToBlocknoteContent(blocks),
            audience: { kind: "private" },
            status: "draft",
          })
          addReferenceEdge({
            fromKind: "doc",
            fromId: doc.id,
            toKind: "recording",
            toId: session.id,
            kind: "generated-from",
            createdBy: currentUser.id,
          })
          window.open(`/dashboard/docs/${doc.id}`, "_blank")
          toast.success("Study guide created — open it in the new tab to edit.")
        }}
      />
    </>
  )
}

function LiveHostShell({
  session,
  courseTitle,
  teacherName,
  teacherEmail,
  backendAuthed,
  onEnd,
  breakoutParticipants,
}: {
  session: LiveSession
  courseTitle?: string
  teacherName: string
  teacherEmail: string
  backendAuthed: boolean | null
  onEnd: (recording?: { url: string; startedAt: string; endedAt: string; durationSec: number }) => void
  breakoutParticipants: Array<{ id: string; name: string }>
}) {
  void courseTitle
  // Re-read updateLiveSession + the notification fan-out in this
  // scope — the outer page already calls useLMS but doesn't pass
  // them down. Cheap to re-subscribe; React de-dupes the context.
  const {
    updateLiveSession: updateLiveSessionLocal,
    addNotifications,
    enrollments: enrollmentsLocal,
    users: usersLocal,
    courses: coursesLocal,
    currentUser,
  } = useLMS()

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
    onError: (err) => {
      toast.error(err.message)
    },
  })

  // Stage tab: video call vs whiteboard. Both stay mounted (CSS hide/show)
  // so switching back doesn't drop the Jitsi connection or wipe the canvas.
  const [stageTab, setStageTab] = useState<"video" | "whiteboard">("video")

  // Sprint C Classes #17 — breakouts side panel. Toggled from the
  // top bar (desktop) and the Tools tab (mobile). Independent of
  // stageTab so the teacher can open breakouts while keeping the
  // whiteboard up on screen.
  const [breakoutsOpen, setBreakoutsOpen] = useState(false)
  // Side-rail toggles. We allow only one rail at a time so the
  // stage doesn't get squeezed twice — opening one closes the
  // others.
  const [agendaOpen, setAgendaOpen] = useState(false)
  const [pollOpen, setPollOpen] = useState(false)
  const [handsOpen, setHandsOpen] = useState(false)
  const [rosterOpen, setRosterOpen] = useState(false)
  const openBreakouts = () => { setBreakoutsOpen(true); setAgendaOpen(false); setPollOpen(false); setHandsOpen(false); setRosterOpen(false) }
  const openAgenda = () => { setAgendaOpen(true); setBreakoutsOpen(false); setPollOpen(false); setHandsOpen(false); setRosterOpen(false) }
  const openPoll = () => { setPollOpen(true); setBreakoutsOpen(false); setAgendaOpen(false); setHandsOpen(false); setRosterOpen(false) }
  const openHands = () => { setHandsOpen(true); setBreakoutsOpen(false); setAgendaOpen(false); setPollOpen(false); setRosterOpen(false) }
  const openRoster = () => { setRosterOpen(true); setBreakoutsOpen(false); setAgendaOpen(false); setPollOpen(false); setHandsOpen(false) }
  // Live count for the Hands button badge. Drives the visual
  // urgency cue — the button flips primary and pulses when at
  // least one hand is up.
  const raisedHands = useRaisedHands(session.id)

  // Auto-preview the Hands panel when a hand goes up. We snapshot
  // whichever panel was previously expanded (if any), pop Hands open
  // for ~4s, then restore. The host keeps the visual signal without
  // losing the panel they were actively reading.
  //
  // Skipped when the host already has Hands open (don't restart a
  // restore timer on top of itself) or when no panel was open (then
  // we let the auto-open stick — nothing to restore).
  const prevHandsCountRef = useRef(0)
  const restorePanelTimerRef = useRef<number | null>(null)
  useEffect(() => {
    const before = prevHandsCountRef.current
    const after = raisedHands.length
    prevHandsCountRef.current = after
    if (after <= before) return // no new hand
    if (handsOpen) return // already viewing — no-op
    // Snapshot which panel (if any) was open before the auto-switch.
    const wasOpen: "agenda" | "poll" | "breakouts" | "roster" | null = agendaOpen
      ? "agenda"
      : pollOpen
        ? "poll"
        : breakoutsOpen
          ? "breakouts"
          : rosterOpen
            ? "roster"
            : null
    openHands()
    if (wasOpen == null) return // nothing to restore to
    if (restorePanelTimerRef.current != null) {
      window.clearTimeout(restorePanelTimerRef.current)
    }
    restorePanelTimerRef.current = window.setTimeout(() => {
      if (wasOpen === "agenda") openAgenda()
      else if (wasOpen === "poll") openPoll()
      else if (wasOpen === "breakouts") openBreakouts()
      else if (wasOpen === "roster") openRoster()
      restorePanelTimerRef.current = null
    }, 4000)
    return () => {
      if (restorePanelTimerRef.current != null) {
        window.clearTimeout(restorePanelTimerRef.current)
        restorePanelTimerRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [raisedHands.length])

  // Sprint C Classes #46 — mobile tab state. Drives which surface
  // the mobile bottom-bar focuses. Defaults to "stage" so the
  // teacher always lands in the same orientation. Independent of
  // stageTab (mobile Tools tab → BreakoutsPanel; Roster tab →
  // future participant list).
  const [mobileTab, setMobileTab] = useState<"stage" | "roster" | "tools">("stage")

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background text-foreground overflow-hidden">
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
          {/* Pass-the-mic menu (CL9). Lets the active host transfer
              hosting controls to a co-instructor mid-class. Hides
              itself when there's no co-instructor to hand off to
              and the viewer isn't holding a passed token. */}
          {currentUser && (
            <PassTheMicMenu
              sessionId={session.id}
              originalHostId={session.hostId}
              viewerId={currentUser.id}
              coInstructors={(coursesLocal.find((c) => c.id === session.courseId)?.coInstructorIds ?? [])
                .map((uid) => usersLocal.find((u) => u.id === uid))
                .filter((u): u is NonNullable<typeof u> => !!u)
                .filter((u) => u.id !== session.hostId)
                .map((u) => ({ id: u.id, name: u.name }))}
            />
          )}
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
          {/* Sprint C Classes #17 — Breakouts toggle. Sits next to
              the recording controls in the top bar so a teacher
              splitting the room mid-class doesn't have to hunt for
              the action. Active state visually marked so the
              teacher knows the side rail is consuming horizontal
              space behind the scenes. */}
          <Button
            size="sm"
            variant={rosterOpen ? "default" : "outline"}
            onClick={() => rosterOpen ? setRosterOpen(false) : openRoster()}
            className="hidden gap-1 sm:inline-flex"
            aria-pressed={rosterOpen}
            aria-label="Toggle roster panel"
          >
            <Users className="h-3.5 w-3.5" />
            Roster
          </Button>
          {/* Agenda toggle — mirrors the breakouts pattern. Shows
              a per-item ✓ / ⏭ checklist the host marks during class.
              Pre-filled from session.agenda (set on the class
              detail page before class). The done count surfaces in
              the LateJoinerRecap so new joiners see actual covered
              items, not items inferred from elapsed time. */}
          {(session.agenda?.length ?? 0) > 0 && (
            <Button
              size="sm"
              variant={agendaOpen ? "default" : "outline"}
              onClick={() => agendaOpen ? setAgendaOpen(false) : openAgenda()}
              className="hidden gap-1 sm:inline-flex"
              aria-pressed={agendaOpen}
              aria-label="Toggle agenda checklist"
            >
              <ClipboardList className="h-3.5 w-3.5" />
              Agenda
              {(() => {
                const done = (session.agenda ?? []).filter((a) => a.done || a.skipped).length
                const total = session.agenda?.length ?? 0
                if (total === 0) return null
                return (
                  <span className="ml-0.5 text-[10px] tabular-nums opacity-80">
                    {done}/{total}
                  </span>
                )
              })()}
            </Button>
          )}
          {/* Poll toggle — opens the LivePollPanel rail. Host
              launches 2-4 option polls, students vote inside their
              own panel; results update live across both surfaces
              via the shared-storage channel. */}
          <Button
            size="sm"
            variant={pollOpen ? "default" : "outline"}
            onClick={() => pollOpen ? setPollOpen(false) : openPoll()}
            className="hidden gap-1 sm:inline-flex"
            aria-pressed={pollOpen}
            aria-label="Toggle live poll panel"
          >
            <BarChart3 className="h-3.5 w-3.5" />
            Poll
          </Button>
          {/* Hands toggle — flips to primary + pulse the moment
              any student raises. The button is always visible
              (not gated on count > 0) so a host who wants to
              proactively check sees a calm baseline; the urgency
              styling only kicks in when there's actually someone
              waiting. */}
          <Button
            size="sm"
            variant={raisedHands.length > 0 ? "default" : handsOpen ? "default" : "outline"}
            onClick={() => handsOpen ? setHandsOpen(false) : openHands()}
            className={cn(
              "hidden gap-1 sm:inline-flex",
              raisedHands.length > 0 && !handsOpen && "animate-pulse",
            )}
            aria-pressed={handsOpen}
            aria-label={`Toggle raised hands panel${raisedHands.length > 0 ? ` (${raisedHands.length} waiting)` : ""}`}
          >
            <Hand className="h-3.5 w-3.5" />
            Hands
            {raisedHands.length > 0 && (
              <span className="ml-0.5 text-[10px] tabular-nums opacity-80">
                {raisedHands.length}
              </span>
            )}
          </Button>
          {recording.status === "recording" && (
            <>
              {/* Sprint A Classes #20 — make the "students see this
                  too" reality explicit. Avoids the rare-but-bad case
                  where the host thinks recording is local-only. The
                  pulsing red dot pairs with a tooltip-equivalent
                  microline so the signal lands without needing
                  hover. */}
              <span
                title="Students see this dot too — they know the class is being recorded."
                className="flex items-center gap-1.5 text-xs text-red-500 font-medium animate-pulse"
              >
                <span className="h-2 w-2 rounded-full bg-red-500" />
                <span>Recording</span>
                <span className="ml-1 hidden sm:inline text-[10.5px] font-normal text-muted-foreground">
                  · students can see this
                </span>
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
          {/* End class — was previously commented out, which meant
              the desktop host could only end the class by hitting
              the LiveKit Leave button (bypassing the wrap wizard +
              recap flow). Restored so the wrap wizard always fires
              and the post-class follow-ups (assignment / next-class
              / community recap) are reachable from one obvious
              button instead of buried behind a 3rd-party Leave. */}
          <Button
            variant="destructive"
            size="sm"
            onClick={() => {
              // End-Class is independent from Stop-Recording. If a
              // recording is in-flight, stop it first; then close
              // out the class with whatever was captured. The wrap
              // wizard handles the confirmation — no extra
              // double-confirm needed here.
              if (recording.status === "recording") {
                recording.stop()
              }
              onEnd(recordedRef.current ?? undefined)
            }}
          >
            <PhoneOff className="mr-1.5 h-3.5 w-3.5" />
            End class
          </Button>
        </div>
      </div>

      {/* Stage. Both surfaces stay mounted INSIDE the same LiveKit room
          context — toggling the tab swaps which is visible while the call
          connection stays alive. Sharing the room lets the whiteboard use
          the LiveKit data channel for multiplayer cursors + element sync
          without opening a second connection.

          Sprint C Classes #17 — when the breakouts panel is open on
          desktop we split the flex container into stage + 320px rail.
          Mobile keeps the stage full-width and surfaces breakouts via
          the Tools tab (#46). */}
      <div className="relative flex flex-1 overflow-hidden bg-black">
        <LiveKitRoom
          roomCode={canonicalRoomCode(session)}
          user={{ id: `host-${session.id}`, name: teacherName }}
          isHost
          // Feeds the host-only over-time pill inside LiveIndicatorPill
          // so a teacher running long sees "+7m over" (amber) /
          // "+22m over" (red) without having to glance at the clock.
          scheduledAt={session.scheduledAt}
          durationMinutes={session.durationMinutes ?? 60}
          // ChatTranscriptRecorder buffers chat into localStorage
          // keyed by this id; End Class flushes it into the
          // session record so the recording carries the chat
          // history alongside the video.
          sessionId={session.id}
          onLeft={() => {
            if (recording.status === "recording") {
              recording.stop()
            }
            onEnd(recordedRef.current ?? undefined)
          }}
          className="flex h-full w-full flex-row overflow-hidden bg-black text-white"
        >
          <div className="flex h-full w-full flex-row">
            <div className="min-w-0 flex-1 relative flex flex-col">
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
              {/* Host connection health bar — floats at the top-left of
                  the video stage. Switches between 🟢 connected →
                  ⚠️ reconnecting → 🔴 lost states based on LiveKit's
                  ConnectionStateChanged events. On reconnect, auto-mutes
                  the host so garbled audio doesn't blast into the room.
                  Lives inside the LiveKit room context (uses useRoomContext). */}
              <div className="pointer-events-none absolute left-3 top-3 z-20">
                <div className="pointer-events-auto">
                  <HostHealthBar />
                </div>
              </div>
              {/* Tabs must use flex layout when visible so the LiveKit
                  video grid + control bar stack vertically. The earlier
                  `block`+`flex flex-col` combo silently broke because
                  `block` won the CSS display fight — and the control bar
                  disappeared off-screen as a result. */}
              <div className={cn("h-full w-full flex-col", stageTab === "video" ? "flex" : "hidden")}>
                <LiveKitVideoUI isHost chatEnabled={session.chatEnabled !== false} />
              </div>
              <div className={cn("h-full w-full", stageTab === "whiteboard" ? "block" : "hidden")}>
                <HostWhiteboardStage
                  persistenceKey={session.id}
                  participantName={teacherName}
                />
              </div>
            </div>

            {/* Sprint C Classes #17 — desktop side rail. Hidden on
                mobile (the bottom-bar's Tools tab handles it there).
                We render the panel only when open + on sm+ so the
                LiveKit grid keeps its full width during normal flow. */}
            {rosterOpen && (
              <aside className="hidden w-80 shrink-0 overflow-y-auto border-l border-border bg-card p-0 sm:block">
                <RosterPanel onClose={() => setRosterOpen(false)} />
              </aside>
            )}
            {breakoutsOpen && (
              <aside className="hidden w-80 shrink-0 overflow-y-auto border-l border-border bg-card p-3 sm:block">
                <BreakoutRoomsPanel
                  sessionId={session.id}
                  participants={breakoutParticipants}
                  onClose={() => setBreakoutsOpen(false)}
                />
              </aside>
            )}
            {agendaOpen && (
              <aside className="hidden w-80 shrink-0 overflow-y-auto border-l border-border bg-card p-3 sm:block">
                <InClassAgendaPanel
                  items={session.agenda ?? []}
                  onChange={(next) => updateLiveSessionLocal(session.id, { agenda: next })}
                  onClose={() => setAgendaOpen(false)}
                />
              </aside>
            )}
            {pollOpen && (
              <aside className="hidden w-80 shrink-0 overflow-y-auto border-l border-border bg-card p-3 sm:block">
                <LivePollPanel
                  sessionId={session.id}
                  isHost
                  viewerId={`host-${session.id}`}
                  onClose={() => setPollOpen(false)}
                  prestagedPolls={session.prestagedPolls ?? []}
                  onPrestagedLaunched={(prestagedId, launchedPollId) => {
                    // Mark the pre-staged entry as "launched" so it
                    // disappears from the launcher rail and can't be
                    // double-fired in the same session.
                    updateLiveSessionLocal(session.id, {
                      prestagedPolls: (session.prestagedPolls ?? []).map((p) =>
                        p.id === prestagedId ? { ...p, launchedPollId } : p,
                      ),
                    })
                  }}
                  onLaunched={(poll) => {
                    // Fan-out: notify everyone invited to the call.
                    // Recipients = enrolled students + the course's
                    // co-instructors, minus the host themselves
                    // (no point pinging the person who launched it).
                    const courseForFanout = coursesLocal.find((c) => c.id === session.courseId)
                    const enrolledIds = new Set(
                      enrollmentsLocal
                        .filter((e) => e.courseId === session.courseId)
                        .map((e) => e.studentId),
                    )
                    const coInstructorIds = new Set(courseForFanout?.coInstructorIds ?? [])
                    const recipientIds = new Set<string>()
                    enrolledIds.forEach((id) => recipientIds.add(id))
                    coInstructorIds.forEach((id) => recipientIds.add(id))
                    recipientIds.delete(session.hostId)
                    const recipients = usersLocal.filter((u) => recipientIds.has(u.id))
                    if (recipients.length === 0) return
                    const tenantSlug = readCurrentTenantSlug()
                    const joinUrl = tenantSlug
                      ? `/p/${tenantSlug}/live/${canonicalRoomCode(session)}`
                      : `/dashboard/classes/${session.id}`
                    const entries = buildNotifications(
                      recipients,
                      livePollLaunchedNotification({
                        sessionId: session.id,
                        sessionTitle: session.title,
                        question: poll.question,
                        optionCount: poll.options.length,
                        joinUrl,
                      }),
                    )
                    addNotifications(entries)
                  }}
                  onClosed={(poll) => {
                    // Recompute the tally at close time. Same
                    // recipient set as launch — students who weren't
                    // in the call still get the result delivered so
                    // they can read the outcome of "what the class
                    // decided" without having attended.
                    const tally = tallyLivePoll(poll)
                    const total = Object.keys(poll.votes).length
                    const winner = (() => {
                      if (total === 0) return null
                      const best = [...tally].sort((a, b) => b.count - a.count)[0]
                      if (!best || best.count === 0) return null
                      return { label: best.label, count: best.count, pct: best.pct }
                    })()
                    const courseForFanout = coursesLocal.find((c) => c.id === session.courseId)
                    const enrolledIds = new Set(
                      enrollmentsLocal
                        .filter((e) => e.courseId === session.courseId)
                        .map((e) => e.studentId),
                    )
                    const coInstructorIds = new Set(courseForFanout?.coInstructorIds ?? [])
                    const recipientIds = new Set<string>()
                    enrolledIds.forEach((id) => recipientIds.add(id))
                    coInstructorIds.forEach((id) => recipientIds.add(id))
                    recipientIds.delete(session.hostId)
                    const recipients = usersLocal.filter((u) => recipientIds.has(u.id))
                    if (recipients.length === 0) return
                    const entries = buildNotifications(
                      recipients,
                      livePollClosedNotification({
                        sessionId: session.id,
                        sessionTitle: session.title,
                        question: poll.question,
                        winner,
                        totalVotes: total,
                        resultsUrl: `/dashboard/classes/${session.id}`,
                      }),
                    )
                    addNotifications(entries)
                  }}
                />
              </aside>
            )}
            {handsOpen && (
              <aside className="hidden w-80 shrink-0 overflow-y-auto border-l border-border bg-card p-3 sm:block">
                <RaisedHandsPanel
                  sessionId={session.id}
                  onClose={() => setHandsOpen(false)}
                />
              </aside>
            )}

            {/* Sprint C Classes #46 — mobile Tools surface. Slides
                up over the stage when the Tools tab is active. We
                don't render this on sm+ because the side rail above
                already handles it. */}
            {mobileTab === "tools" && (
              <div className="fixed inset-x-0 bottom-24 top-12 z-20 overflow-y-auto border-t border-border bg-card p-3 sm:hidden">
                <BreakoutRoomsPanel
                  sessionId={session.id}
                  participants={breakoutParticipants}
                  onClose={() => setMobileTab("stage")}
                />
              </div>
            )}
            {/* Mobile Roster slide-out — replaces the previous
                TODO placeholder. Lists the enrolled-student roster
                (best-available source outside the LiveKit subtree
                since we can't read useParticipants here). Host can
                tap a row to scroll its details, useful for tracking
                who's expected. */}
            {mobileTab === "roster" && (
              <div className="fixed inset-x-0 bottom-24 top-12 z-20 overflow-y-auto border-t border-border bg-card p-3 sm:hidden">
                <div className="flex items-center justify-between gap-2 border-b border-border pb-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">Roster</p>
                    <p className="text-[11px] text-muted-foreground">
                      {breakoutParticipants.length - 1} {breakoutParticipants.length - 1 === 1 ? "student" : "students"} expected · plus you
                    </p>
                  </div>
                  <button
                    type="button"
                    className="rounded-md p-1 text-muted-foreground hover:bg-muted"
                    onClick={() => setMobileTab("stage")}
                    aria-label="Close roster"
                  >
                    ✕
                  </button>
                </div>
                <ul className="mt-3 space-y-1.5">
                  {breakoutParticipants.map((p, i) => {
                    const initials = p.name
                      .split(/\s+/)
                      .map((w) => w[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()
                    const isHost = i === 0
                    return (
                      <li
                        key={p.id}
                        className="flex items-center gap-2.5 rounded-md border border-border bg-background p-2"
                      >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
                          {initials}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{p.name}</p>
                          <p className="text-[10.5px] text-muted-foreground">
                            {isHost ? "Host · you" : "Enrolled student"}
                          </p>
                        </div>
                      </li>
                    )
                  })}
                </ul>
                <p className="mt-3 text-[10.5px] text-muted-foreground">
                  Live in-call presence (who's actually here right now) ships next.
                  This list is the course&apos;s enrolled roster.
                </p>
              </div>
            )}
          </div>
        </LiveKitRoom>
      </div>

      {/* Sprint C Classes #46 — mobile teacher controls. Bottom-
          fixed 3-tab bar with persistent Mute + End. Self-hides
          on sm+ via its internal class. The mic toggle ties into
          the LiveKit room's local-track state via window event so
          we don't have to thread an SDK ref through here. */}
      <MobileTeacherControls
        active={mobileTab}
        onChange={(t) => {
          setMobileTab(t)
          // Stage tab pulls the user back to the LiveKit grid; we
          // close any open breakout panel because Tools and Stage
          // share the same screen region on mobile.
        }}
        isRecording={recording.status === "recording"}
        micOn={undefined}
        onMicToggle={() => {
          // Defer to the LiveKit data-channel event the iframe
          // listens for. Inline emulation keeps this component
          // unaware of the SDK internals.
          window.dispatchEvent(new CustomEvent("livekit-toggle-mic"))
        }}
        onEndClass={() => {
          if (recording.status === "recording") recording.stop()
          onEnd(recordedRef.current ?? undefined)
        }}
      />
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

  // One-shot backfill: when the recording URL arrived BEFORE the host clicked
  // End Class (pending=false, url already populated in recordings[last]), the
  // pending-poller below is skipped entirely by its `if (!recording?.pending) return`
  // guard. That means session.recordingUrl is never set, so the class detail
  // page shows "Processing" even though the host page shows Watch. Fix: on mount,
  // if the URL is already present but recordingUrl is missing, write it once.
  useEffect(() => {
    if (!recording?.url || recording.pending) return
    if (session.recordingUrl) return // already in sync
    updateLiveSession(session.id, { recordingUrl: recording.url })
  // Run once on mount — deps intentionally stable (recording.url and
  // session.recordingUrl are both read-once at mount time).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

/** Minimal HTML escape for recap bodies. The community feed
 *  renders via RichTextContent which already sanitises on read,
 *  but we still escape on write so a class titled "Math: <hr>"
 *  doesn't break the surrounding markup. */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}
