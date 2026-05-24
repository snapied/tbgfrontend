"use client"

// Student-facing live-class page. Three sub-states gated on the
// session's roomState field:
//
//   scheduled  → Bambinos-style waiting room. Countdown, prep
//                checklist, "Sound alert enabled". Auto-polls so
//                when the teacher hits "Open room" we transition
//                without the student touching anything.
//   open/live  → in-class shell. For the POC the actual video
//                surface is a placeholder ("Video call would render
//                here") that a future LiveKit/Daily/100ms iframe
//                will slot into. Everything around it — header,
//                participants, mute/cam controls — is real UI.
//   ended      → wrap screen with recordings + "see you next time".
//
// The waiting-room design borrows the structure from the reference
// screenshot the user shared: hero countdown card, teacher/class
// pair below, do-these / skip-these checklist columns, marketing
// strip at the bottom.

import { use, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { LateJoinerRecap } from "@/components/classes/late-joiner-recap"
import { useReconnectGuard } from "@/lib/live-class-features"
import Link from "next/link"
import {
  Bell,
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  Lock,
  Sparkles,
  XCircle,
} from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useLMS, type LiveSession } from "@/lib/lms-store"
import { useTenantBrand } from "@/lib/tenant-brand"
import { LiveKitRoom, LiveKitVideoUI } from "@/components/classes/livekit-room"
import { AgendaList } from "@/components/classes/agenda-editor"
import { StudentPreflight } from "@/components/classes/student-preflight"
import { WhiteboardCanvas } from "@/components/whiteboard/whiteboard-canvas"
import { useWhiteboardAccess } from "@/lib/whiteboard-access"
import { cn } from "@/lib/utils"
import { fetchRoomState, type LiveRoomStatePayload } from "@/lib/live-room-state"
import { canonicalRoomCode } from "@/lib/jitsi"
import {
  computeHostPunctuality,
  type PunctualityStat,
} from "@/lib/host-punctuality"

// Cached display name lives in sessionStorage so the prompt only shows once
// per tab. Used by both the "session-found" in-class shell and the
// guest-join fallback when a stranger opens the link in a different browser.
const NAME_STORAGE_KEY = "vidyanxt.displayName"

function useCachedDisplayName(): {
  hydrated: boolean
  displayName: string
  setDisplayName: (n: string) => void
} {
  const [displayName, setName] = useState("")
  const [hydrated, setHydrated] = useState(false)
  useEffect(() => {
    try {
      setName(window.sessionStorage.getItem(NAME_STORAGE_KEY) || "")
    } catch { /* sessionStorage may be unavailable in some privacy modes */ }
    setHydrated(true)
  }, [])
  const setDisplayName = (n: string) => {
    setName(n)
    try { window.sessionStorage.setItem(NAME_STORAGE_KEY, n) } catch { /* ignore */ }
  }
  return { hydrated, displayName, setDisplayName }
}

export default function LiveClassPage({
  params,
}: {
  params: Promise<{ tenant: string; sessionId: string }>
}) {
  const { tenant, sessionId } = use(params)
  const {
    liveSessions,
    getCourseById,
    getUserById,
    startLiveRoom,
    currentUser,
    // Sprint A Communities #20 — for the post-class "join the
    // community" CTA on EndedScreen.
    studentGroups,
    addStudentsToGroup,
  } = useLMS()
  const brand = useTenantBrand()
  const nameState = useCachedDisplayName()

  // Auto-fill the display name from the signed-in user — students
  // shouldn't have to retype their name every time they join a room
  // when the system already knows it. Only fires when no sessionStorage
  // override exists (so a guest who typed a custom name earlier in the
  // tab keeps it) and only when we have a real authenticated user.
  useEffect(() => {
    if (!nameState.hydrated) return
    if (nameState.displayName) return
    const name = currentUser?.name?.trim()
    if (!name) return
    nameState.setDisplayName(name)
  }, [nameState, currentUser])

  const [localSessions, setLocalSessions] = useState<LiveSession[]>([])

  useEffect(() => {
    setLocalSessions(liveSessions)
  }, [liveSessions])

  useEffect(() => {
    const key = `thebigclass.t.${tenant}.lms.liveSessions.v1`
    const sync = () => {
      try {
        const raw = window.localStorage.getItem(key)
        if (raw) {
          const parsed = JSON.parse(raw)
          if (Array.isArray(parsed)) {
            setLocalSessions(parsed)
          }
        }
      } catch (e) {
        console.error(e)
      }
    }

    const interval = setInterval(sync, 1500)
    window.addEventListener("storage", sync)

    return () => {
      clearInterval(interval)
      window.removeEventListener("storage", sync)
    }
  }, [tenant])

  // Resolve the session from id OR roomCode — the teacher may share
  // a friendly /live/<code> URL but we also accept the internal id.
  const localSession = useMemo<LiveSession | undefined>(() => {
    return (
      localSessions.find((s) => s.id === sessionId) ??
      localSessions.find((s) => s.roomCode === sessionId)
    )
  }, [localSessions, sessionId])

  // Server-side room state — the cross-browser source of truth. Polled every
  // 3 seconds. When the host (in their own browser) clicks "Open the room"
  // and the backend record flips to state=live, students viewing from a
  // different browser learn about it via this poll.
  const [serverState, setServerState] = useState<LiveRoomStatePayload | null>(null)
  useEffect(() => {
    let cancelled = false
    const code = localSession?.roomCode ?? sessionId
    if (!code) return
    const poll = async () => {
      const data = await fetchRoomState(code)
      if (!cancelled && data) setServerState(data)
    }
    void poll()
    const t = setInterval(poll, 3000)
    return () => {
      cancelled = true
      clearInterval(t)
    }
  }, [localSession?.roomCode, sessionId])

  // The session we render with. Prefer the locally stored row (richer — has
  // host id, course id, recordings, etc.) and synthesise from server state
  // when this browser has no record (cross-browser / incognito).
  const session = useMemo<LiveSession | undefined>(() => {
    if (localSession) {
      // Even when we have a local row, let server state override the room
      // state and recording URL — those change in another browser and we
      // want the latest.
      return {
        ...localSession,
        roomState:
          (serverState?.state as LiveSession["roomState"]) ?? localSession.roomState,
      }
    }
    if (!serverState) return undefined
    return {
      id: sessionId,
      title: serverState.title ?? "Live class",
      description: undefined,
      provider: "in-house",
      meetingUrl: "",
      scheduledAt: serverState.scheduledAt ?? new Date().toISOString(),
      durationMinutes: serverState.durationMinutes ?? 60,
      hostId: "instructor",
      status: "scheduled",
      roomState: serverState.state,
      roomCode: serverState.roomCode,
      createdAt: serverState.updatedAt ?? new Date().toISOString(),
    } as LiveSession
  }, [localSession, serverState, sessionId])

  const course = session ? getCourseById(session.courseId) : undefined
  const host = session ? getUserById(session.hostId) : undefined

  // Intentionally NO auto-bump from "open" → "live" here. Earlier we did that
  // when a student landed, which had the side effect of letting students
  // bypass the waiting room. The host page now owns the transition: the
  // instructor explicitly starts the room (Open the room → startLiveRoom)
  // before students see anything other than the countdown card.
  // Suppress startLiveRoom unused warnings
  void startLiveRoom

  if (!nameState.hydrated) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f6f3ee] text-xs text-muted-foreground">
        Loading…
      </main>
    )
  }

  // Ask for name first for all student entries (regular and guest)
  if (!nameState.displayName) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6">
        <Card className="w-full">
          <CardContent className="space-y-4 p-6">
            <Badge variant="outline" className="border-primary/40 bg-primary/5 text-primary">
              Live class
            </Badge>
            <h1 className="font-serif text-2xl font-bold">Join the room</h1>
            <p className="text-sm text-muted-foreground">
              Type the name your instructor will see, then click Join. We&apos;ll connect you to the
              class waiting lobby.
            </p>
            <GuestNameInput onSubmit={nameState.setDisplayName} />
            <p className="text-[11px] text-muted-foreground">
              {brand.name ? `${brand.name} · ` : ""}Powered by The Big Class
            </p>
          </CardContent>
        </Card>
      </main>
    )
  }

  if (session && session.provider !== "in-house") {
    // External provider — just forward to the meeting URL with a
    // friendly card so the student doesn't land in a "what is this"
    // moment. Instructors using Zoom/Meet shouldn't lose their flow.
    return (
      <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center px-6 text-center">
        <h1 className="font-serif text-2xl font-bold">Joining your class…</h1>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          This class runs on {prettyProvider(session.provider)}. Click below to open the meeting.
        </p>
        <Button asChild className="mt-6">
          <a href={session.meetingUrl} target="_blank" rel="noopener noreferrer">
            Open meeting
          </a>
        </Button>
      </main>
    )
  }

  // While we wait for the first /state poll to resolve, render a soft
  // loading card instead of a 5-minute fake countdown. Avoids the bug where
  // a cross-browser student saw "starts in 3 min" for a class actually
  // scheduled an hour away.
  if (!session) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#faf7f1]">
        <div className="text-center">
          <div className="mx-auto h-6 w-6 animate-pulse rounded-full bg-primary/30" />
          <p className="mt-3 text-xs text-muted-foreground">Connecting to the class…</p>
        </div>
      </main>
    )
  }

  // In-house room state machine. Server state already merged into session.roomState.
  //   scheduled → student waits (host hasn't touched the room yet).
  //   open      → host has opened the room; students join immediately.
  //   live      → class is in progress; same as open from the student's view.
  //   ended     → after-class screen below.
  //
  // The earlier code lumped "scheduled" and "open" into the waiting
  // room, which meant a student sat in the lobby even after the host
  // opened the call — the exact bug the user flagged. "open" now
  // routes straight into the in-class shell so the student lands
  // in the call the moment the host fires it up.
  const state = session.roomState ?? "scheduled"

  // Time-based fallback admission. If the host's backend state push
  // silently fails (stale token + dead refresh cookie), the server
  // never flips to "open"/"live" and students stay stuck in the
  // waiting room past their scheduled time. To survive that failure
  // mode, once the scheduled time has arrived AND the room row
  // exists on the backend (anyone has touched it), promote the
  // student into the LiveKit shell. LiveKit itself becomes the
  // ground truth — if the host is in the call, the student meets
  // them; if not, both wait inside the call instead of in our lobby.
  const scheduledMs = new Date(session.scheduledAt).getTime()
  const shouldAutoAdmitByTime =
    state === "scheduled" &&
    Number.isFinite(scheduledMs) &&
    Date.now() >= scheduledMs &&
    serverState != null

  if (state === "scheduled" && !shouldAutoAdmitByTime) {
    // Punctuality stat — last 5 sessions this instructor opened,
    // median diff vs scheduledAt. Computed from localSessions so it
    // updates as new history lands without a refresh. We pass the
    // stat into WaitingRoom rather than letting it compute, so the
    // lobby stays focused on layout.
    const punctuality = computeHostPunctuality(
      localSessions,
      session.hostId,
      session.id,
    )
    return (
      <WaitingRoom
        session={session}
        courseTitle={course?.title}
        hostName={host?.name ?? serverState?.hostName ?? undefined}
        tenant={tenant}
        brandLabel={brand.name}
        punctuality={punctuality}
      />
    )
  }

  if (state === "open" || state === "live" || shouldAutoAdmitByTime) {
    return (
      <InClassShell
        session={session}
        hostName={host?.name ?? serverState?.hostName ?? undefined}
        tenant={tenant}
        nameState={nameState}
      />
    )
  }

  // Sprint A Communities #20 — surface the attached community on the
  // post-class wrap screen for students who attended but aren't yet
  // members. Resolve the community via course.defaultBatchId, then
  // check the current user's membership. We pass the resolved
  // {id, name, isMember} so EndedScreen can render the join CTA
  // without re-resolving stores.
  const attachedCommunity = (() => {
    if (!course?.defaultBatchId) return null
    const group = studentGroups.find((g) => g.id === course.defaultBatchId)
    if (!group) return null
    const memberIds = group.memberIds ?? []
    const isMember = currentUser ? memberIds.includes(currentUser.id) : false
    return { id: group.id, name: group.name, isMember, memberCount: memberIds.length }
  })()

  // Ended screen
  return (
    <EndedScreen
      session={session}
      tenant={tenant}
      courseTitle={course?.title}
      community={attachedCommunity}
      currentUserId={currentUser?.id}
    />
  )
}

// ---------------------------------------------------------------
// Waiting room (the Bambinos-style screen)
// ---------------------------------------------------------------

function WaitingRoom({
  session,
  courseTitle,
  hostName,
  tenant,
  brandLabel,
  punctuality,
}: {
  session: LiveSession
  courseTitle?: string
  hostName?: string
  tenant: string
  brandLabel?: string
  punctuality: PunctualityStat
}) {
  const [now, setNow] = useState(() => Date.now())
  const [preflightOpen, setPreflightOpen] = useState(false)
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(t)
  }, [])

  const startMs = new Date(session.scheduledAt).getTime()
  const diff = Math.max(0, startMs - now)
  const totalSeconds = Math.floor(diff / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  const roomIsOpen = session.roomState === "open"
  // Progress = how much of the "30 min before class" prep window has elapsed.
  // Caps at 100 when class is about to start / has started.
  const prepWindowMs = 30 * 60 * 1000
  const progress = Math.min(
    100,
    Math.max(0, ((prepWindowMs - diff) / prepWindowMs) * 100),
  )

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#faf7f1]">
      {/* Ambient background — radial mesh + decorative blurred orbs.
          Gives the page depth without competing with the content. */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 0%, rgba(251, 191, 36, 0.12), transparent 40%), radial-gradient(circle at 80% 10%, rgba(16, 185, 129, 0.10), transparent 45%), radial-gradient(circle at 50% 100%, rgba(99, 102, 241, 0.08), transparent 50%)",
        }}
      />
      <div className="pointer-events-none absolute -left-32 top-40 h-80 w-80 rounded-full bg-amber-200/40 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute -right-32 top-10 h-72 w-72 rounded-full bg-emerald-200/35 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute left-1/2 bottom-0 h-96 w-[40rem] -translate-x-1/2 rounded-full bg-indigo-200/25 blur-3xl" aria-hidden />

      <div className="relative z-10 px-4 py-6 sm:px-6">
        {/* Top bar */}
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <Link href={`/p/${tenant}`} className="inline-flex items-center gap-2 group">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm transition-transform group-hover:scale-105">
              <span className="text-sm font-bold">{(brandLabel ?? "T").slice(0, 1).toUpperCase()}</span>
            </span>
            <span className="font-mono text-sm tracking-tight">
              {brandLabel ?? "thebigclass"}
              <span className="text-muted-foreground">.live</span>
            </span>
          </Link>
          <Badge variant="outline" className="border-success/40 bg-white/80 backdrop-blur text-xs text-success shadow-sm">
            <span className="relative mr-1.5 inline-flex h-2 w-2">
              <span className="absolute inset-0 animate-ping rounded-full bg-success/60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
            </span>
            Waiting room
          </Badge>
          {/* Preflight test — sits adjacent to the badge so it
              feels like a paired affordance ("you're waiting · while
              you wait, check your setup"). Skippable; doesn't block
              joining when the host opens the room. */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPreflightOpen(true)}
            className="ml-2 h-7 text-xs"
          >
            Quick setup check
          </Button>
        </div>
        <StudentPreflight
          open={preflightOpen}
          onOpenChange={setPreflightOpen}
          onJoin={() => setPreflightOpen(false)}
        />

        {/* Hero countdown card */}
        <div className="mx-auto mt-8 max-w-5xl">
          <div className="relative overflow-hidden rounded-3xl border border-white/40 bg-white/85 p-8 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.08),0_8px_25px_-8px_rgba(0,0,0,0.04)] backdrop-blur-sm sm:p-14">
            {/* Subtle gradient accent at the top */}
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-300 via-primary to-emerald-400" />
            <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-yellow-200/30 blur-3xl" aria-hidden />

            <div className="relative text-center">
              <Badge
                variant="outline"
                className="border-primary/25 bg-primary/[0.06] px-3 py-1 text-xs font-semibold text-primary"
              >
                <span className="mr-1.5 inline-flex h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
                {roomIsOpen ? "Instructor is in the room" : "Live class starting soon"}
              </Badge>

              {diff <= 0 ? (
                <>
                  <h1 className="mt-5 font-serif text-3xl font-bold leading-tight tracking-tight text-slate-900 sm:text-5xl">
                    <span className="bg-gradient-to-br from-orange-500 to-rose-500 bg-clip-text text-transparent">
                      Class time is here!
                    </span>
                  </h1>
                  <p className="mx-auto mt-4 max-w-xl text-sm text-muted-foreground sm:text-base">
                    Waiting for your instructor to launch the session. We&apos;ll beam you in the moment it opens — no need to refresh.
                  </p>
                </>
              ) : (
                <>
                  <h1 className="mt-5 font-serif text-3xl font-bold leading-tight tracking-tight text-slate-900 sm:text-6xl">
                    Your seat is saved.
                    <br />
                    <span className="relative inline-block">
                      <span className="relative z-10 text-primary">Class begins</span>
                      <span className="absolute inset-x-0 bottom-1.5 -z-0 h-3 -rotate-1 bg-yellow-200/80" />
                    </span>{" "}
                    in a flash
                  </h1>
                  <p className="mx-auto mt-5 max-w-xl text-sm text-muted-foreground sm:text-base">
                    {roomIsOpen ? (
                      <>Your instructor just opened the room. Hold tight — we&apos;re beaming you in.</>
                    ) : (
                      <>
                        Hang tight, superstar. As soon as your instructor opens the room, we&apos;ll
                        beam you straight in. No buttons to press.
                      </>
                    )}
                  </p>
                </>
              )}

              {/* Countdown */}
              <div className="mt-10 flex items-center justify-center gap-3 sm:gap-5">
                <CountdownChunk value={hours} label="Hours" />
                <span className="text-3xl font-bold text-slate-300 sm:text-5xl">:</span>
                <CountdownChunk value={minutes} label="Minutes" />
                <span className="text-3xl font-bold text-slate-300 sm:text-5xl">:</span>
                <CountdownChunk value={seconds} label="Seconds" />
              </div>

              {/* Progress bar */}
              <div className="mx-auto mt-10 max-w-xl">
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-400 via-primary to-emerald-400 transition-[width] duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="mt-3 flex items-center justify-center gap-3 text-xs text-muted-foreground">
                  <span>{roomIsOpen ? "Instructor is in the room — joining you now…" : "Instructor is getting ready"}</span>
                  <span className="text-slate-300">•</span>
                  <span className="inline-flex items-center gap-1 text-emerald-700">
                    <Bell className="h-3 w-3" />
                    Sound alert on
                  </span>
                </div>

                {/* Punctuality reassurance — reframes the wait with the
                    instructor's track record instead of a raw clock.
                    Hidden once the room is actually open since the
                    student is about to be admitted. Hidden when the
                    instructor has no past sessions and the helper
                    returned its neutral fallback (sampleSize===0). */}
                {!roomIsOpen && punctuality.sampleSize > 0 && (
                  <p className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white/60 px-3 py-1 text-[11px] font-medium text-slate-600 ring-1 ring-slate-200/70 backdrop-blur-sm">
                    <span aria-hidden>📊</span>
                    {punctuality.label}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Instructor + class meta cards */}
        <div className="mx-auto mt-5 grid max-w-5xl gap-4 sm:grid-cols-2">
          <Card className="group overflow-hidden border-0 bg-white/85 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.08)] backdrop-blur-sm transition-all hover:shadow-[0_12px_40px_-12px_rgba(0,0,0,0.12)]">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-100 to-amber-200 text-2xl shadow-inner">
                <span className="relative">👩‍🏫</span>
                <span className="absolute -bottom-1 -right-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[8px] font-bold text-white ring-2 ring-white">
                  ✓
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Your instructor
                </p>
                <p className="truncate text-base font-bold text-slate-900">{hostName ?? "Your instructor"}</p>
                <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-amber-700">
                  <span>⭐</span>
                  <span className="font-medium">Top 1% Educator</span>
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="group overflow-hidden border-0 bg-white/85 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.08)] backdrop-blur-sm transition-all hover:shadow-[0_12px_40px_-12px_rgba(0,0,0,0.12)]">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-100 to-blue-200 text-2xl shadow-inner">
                <span>📘</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Today&apos;s class
                </p>
                <p className="truncate text-base font-bold text-slate-900">{session.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {new Date(session.scheduledAt).toLocaleString(undefined, {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  <span className="mx-1.5 text-slate-300">•</span>
                  {session.durationMinutes} min
                  {courseTitle && (
                    <>
                      <span className="mx-1.5 text-slate-300">•</span>
                      {courseTitle}
                    </>
                  )}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Instructor's agenda — pulled straight from the LiveSession
            record so what shows here matches what the teacher edited
            on the class detail page. Hidden when no agenda is set so
            silent classes don't get an awkward empty card. */}
        {session.agenda && session.agenda.length > 0 && (
          <div className="mx-auto mt-5 max-w-5xl">
            <Card className="overflow-hidden border-0 bg-gradient-to-br from-amber-50 to-white shadow-[0_8px_30px_-12px_rgba(0,0,0,0.06)]">
              <CardContent className="p-6">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500 text-base text-white shadow-sm">
                    📋
                  </span>
                  <p className="font-serif text-lg font-bold text-amber-900">
                    Today&rsquo;s plan
                  </p>
                </div>
                <div className="mt-4">
                  <AgendaList items={session.agenda} />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Do / Skip checklists */}
        <div className="mx-auto mt-5 grid max-w-5xl gap-4 sm:grid-cols-2">
          <Card className="overflow-hidden border-0 bg-gradient-to-br from-emerald-50 to-white shadow-[0_8px_30px_-12px_rgba(0,0,0,0.06)]">
            <CardContent className="p-6">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500 text-base text-white shadow-sm">
                  ✓
                </span>
                <p className="font-serif text-lg font-bold text-emerald-900">Do these</p>
              </div>
              <ul className="mt-4 space-y-2.5 text-sm">
                <ChecklistDo>Notebook open, pencil sharp, water nearby</ChecklistDo>
                <ChecklistDo>Quiet, well-lit corner; headphones on</ChecklistDo>
                <ChecklistDo>Camera on; smile when your instructor waves</ChecklistDo>
                <ChecklistDo>Raise hand to speak; one voice at a time</ChecklistDo>
              </ul>
            </CardContent>
          </Card>
          <Card className="overflow-hidden border-0 bg-gradient-to-br from-rose-50 to-white shadow-[0_8px_30px_-12px_rgba(0,0,0,0.06)]">
            <CardContent className="p-6">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-500 text-base text-white shadow-sm">
                  ✕
                </span>
                <p className="font-serif text-lg font-bold text-rose-900">Skip these</p>
              </div>
              <ul className="mt-4 space-y-2.5 text-sm">
                <ChecklistSkip>No snacks, no toys, no TV in background</ChecklistSkip>
                <ChecklistSkip>No other tabs or games during class</ChecklistSkip>
                <ChecklistSkip>Never share your class link with friends</ChecklistSkip>
                <ChecklistSkip>No private chats with classmates</ChecklistSkip>
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Active Learning Manifesto — high-contrast dark section */}
        <div className="mx-auto mt-8 max-w-5xl">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-8 shadow-2xl sm:p-14">
            {/* Decorative gradient orbs */}
            <div className="pointer-events-none absolute -left-20 -top-20 h-72 w-72 rounded-full bg-amber-500/15 blur-3xl" aria-hidden />
            <div className="pointer-events-none absolute -right-20 bottom-0 h-72 w-72 rounded-full bg-indigo-500/15 blur-3xl" aria-hidden />
            {/* Grid pattern overlay */}
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.03]"
              style={{
                backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)",
                backgroundSize: "24px 24px",
              }}
              aria-hidden
            />

            <div className="relative text-center">
              <Badge className="border border-amber-300/30 bg-amber-300/10 px-3 py-1 font-mono text-[10px] tracking-widest text-amber-200 hover:bg-amber-300/10">
                THE ACTIVE LEARNING MANIFESTO
              </Badge>
              <h2 className="mx-auto mt-6 max-w-3xl font-serif text-3xl font-bold leading-[1.15] tracking-tight text-white sm:text-5xl">
                We don&apos;t just teach lessons.
                <br />
                <span className="text-amber-300">We cultivate active, curious minds.</span>
              </h2>
              <p className="mx-auto mt-6 max-w-2xl text-sm leading-relaxed text-slate-300 sm:text-base">
                Traditional edtech rewards memorization. Standard online platforms deliver flat video
                screens. We engineer dynamic learning moments — small enough to fit in 50 minutes, deep
                enough to change how a child synthesizes and builds knowledge for life.
              </p>

              {/* Numbered pillars */}
              <div className="mt-12 grid gap-4 text-left sm:grid-cols-3">
                <ManifestoPillar
                  number="01"
                  emoji="🎨"
                  title="Active shared ideation"
                  body="Every class integrates our interactive whiteboard so students learn by drawing, creating, and experimenting — not just watching."
                />
                <ManifestoPillar
                  number="02"
                  emoji="👥"
                  title="Empathetic peer-flow"
                  body="Collaborative panels, live chat, and feedback circles cultivate the communication skills and confidence that lectures never build."
                />
                <ManifestoPillar
                  number="03"
                  emoji="⚡"
                  title="Live-class infrastructure"
                  body="A high-fidelity SFU pipeline that scales to 100+ concurrent joiners with crisp video, recording, and zero setup."
                />
              </div>
            </div>
          </div>
        </div>

        <div className="mx-auto mt-6 max-w-5xl text-center text-xs text-muted-foreground">
          Today&apos;s class runs on{" "}
          <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 font-medium text-primary shadow-sm">
            <span className="text-amber-500">⚡</span>
            The Big Class
          </span>{" "}
          — sit back, we&apos;ll handle the rest.
        </div>
      </div>
    </main>
  )
}

function ManifestoPillar({
  number,
  emoji,
  title,
  body,
}: {
  number: string
  emoji: string
  title: string
  body: string
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-6 transition-colors hover:bg-white/[0.07]">
      <div className="flex items-center justify-between">
        <span className="font-mono text-xs font-semibold tracking-widest text-amber-300/80">{number}</span>
        <span className="text-2xl opacity-90">{emoji}</span>
      </div>
      <h3 className="mt-4 font-serif text-lg font-semibold leading-tight text-white">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-300">{body}</p>
    </div>
  )
}

function CountdownChunk({ value, label }: { value: number; label: string }) {
  return (
    <div className="group relative flex flex-col items-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white shadow-[0_10px_30px_-10px_rgba(0,0,0,0.10),0_4px_8px_-4px_rgba(0,0,0,0.04)] ring-1 ring-slate-200/60 sm:h-28 sm:w-28">
        <span className="font-serif text-4xl font-bold tabular-nums text-slate-900 sm:text-6xl">
          {String(value).padStart(2, "0")}
        </span>
      </div>
      <span className="mt-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </span>
    </div>
  )
}

function ChecklistDo({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3 text-slate-700">
      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600">
        <CheckCircle2 className="h-3.5 w-3.5" />
      </span>
      <span className="leading-snug">{children}</span>
    </li>
  )
}

function ChecklistSkip({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3 text-slate-700">
      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-rose-500/15 text-rose-600">
        <XCircle className="h-3.5 w-3.5" />
      </span>
      <span className="leading-snug">{children}</span>
    </li>
  )
}

// ---------------------------------------------------------------
// In-class shell (the actual room — placeholder video surface)
// ---------------------------------------------------------------

function InClassShell({
  session,
  hostName,
  tenant,
  nameState,
}: {
  session: LiveSession
  hostName?: string
  tenant: string
  nameState: {
    hydrated: boolean
    displayName: string
    setDisplayName: (n: string) => void
  }
}) {
  // True once the participant hangs up — unmounts the Jitsi iframe (so we
  // don't see Jitsi's leave overlay) and renders our own LeftRoomCard.
  const [hasLeft, setHasLeft] = useState(false)
  // Stage tab — Video by default. Students can flip to the whiteboard to
  // see (and edit) the same canvas the teacher is drawing on, with their
  // own cursor visible to everyone else in the room.
  const [stageTab, setStageTab] = useState<"video" | "whiteboard">("video")

  // Sprint C Classes #6 — minutes-missed at join time. We derive
  // from roomStartedAt when the host actually started the class
  // (preferred — accurate) and fall back to scheduledAt for sessions
  // that never had a startedAt stamp (rare; pre-stamp legacy data).
  // Computed once on mount because we don't want the recap to keep
  // updating as time passes — it's a snapshot of "what you missed
  // before you walked in".
  const [minutesMissedAtJoin] = useState<number>(() => {
    const startedMs = session.roomStartedAt
      ? Date.parse(session.roomStartedAt)
      : Date.parse(session.scheduledAt)
    if (!Number.isFinite(startedMs)) return 0
    const diff = Date.now() - startedMs
    if (diff <= 60_000) return 0 // ≤ 1 min late = not really late
    return Math.round(diff / 60_000)
  })

  // Build the agenda + "current item" hint from the session's
  // pre-class agenda + minute budgets. We tick the cursor through
  // items by accumulating per-item minutes against elapsed time at
  // join. The teacher hasn't marked "done" explicitly in the data
  // model yet, so we infer "done before me" / "current" from time.
  const agendaWithProgress = useMemo(() => {
    const items = session.agenda ?? []
    if (items.length === 0) return { items: [], currentTitle: null as string | null }
    const startedMs = session.roomStartedAt
      ? Date.parse(session.roomStartedAt)
      : Date.parse(session.scheduledAt)
    const elapsedMin = Math.max(0, (Date.now() - startedMs) / 60_000)
    let cursor = 0
    let currentTitle: string | null = null
    const annotated = items.map((it) => {
      const minutes = it.minutes ?? 5
      const itemEnd = cursor + minutes
      const status = elapsedMin >= itemEnd ? "done" : elapsedMin >= cursor ? "current" : "future"
      if (status === "current" && !currentTitle) currentTitle = it.title
      cursor = itemEnd
      return { title: it.title, minutes: it.minutes, done: status === "done" }
    })
    return { items: annotated, currentTitle }
  }, [session.agenda, session.roomStartedAt, session.scheduledAt])

  // Sprint C Classes #28 — reconnect guard. Surfaces an overlay
  // when the participant loses network, then a brief "welcome back
  // — you missed Ns" banner when they return. The actual LiveKit
  // SDK has its own reconnect logic; this wrapper adds the user-
  // facing "missed N seconds" copy + recap nudge that a pure SDK
  // toast misses.
  const reconnect = useReconnectGuard()

  return (
    <main className="fixed inset-0 z-50 flex flex-col bg-background overflow-hidden">
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-border/60 bg-card px-4">
        <Link
          href={`/p/${tenant}`}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Leave class
        </Link>
        <div className="flex items-center gap-2 truncate text-xs">
          <Badge variant="outline" className="border-emerald-500/40 bg-emerald-500/10 text-emerald-600">
            <span className="mr-1 h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live
          </Badge>
          <span className="truncate font-medium">{session.title}</span>
          {hostName && (
            <span className="hidden text-muted-foreground sm:inline">· with {hostName}</span>
          )}
          {/* Stage switcher — students can flip to the whiteboard tab to
              see + edit the same canvas the teacher is drawing on. */}
          {!hasLeft && nameState.displayName && (
            <div className="ml-3 inline-flex rounded-md border border-border bg-background p-0.5">
              <button
                type="button"
                onClick={() => setStageTab("video")}
                className={cn(
                  "rounded px-2 py-0.5 text-[11px] font-medium transition-colors",
                  stageTab === "video"
                    ? "bg-black text-white shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                Video
              </button>
              <button
                type="button"
                onClick={() => setStageTab("whiteboard")}
                className={cn(
                  "rounded px-2 py-0.5 text-[11px] font-medium transition-colors",
                  stageTab === "whiteboard"
                    ? "bg-black text-white shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                Whiteboard
              </button>
            </div>
          )}
        </div>
        <span className="text-[11px] text-muted-foreground tabular-nums">
          {nameState.displayName ? `Joined as ${nameState.displayName}` : ""}
        </span>
      </div>
      {/* Sprint C Classes #6 — late-joiner recap. Floats at the top
          of the stage area for ≤45s, dismiss-on-Got-it. Renders
          nothing when the student joined on time (minutesMissed = 0).
          Outside the LiveKit wrapper so it sits above the call
          chrome without competing with Jitsi's iframe layout. */}
      {!hasLeft && nameState.displayName && minutesMissedAtJoin > 0 && (
        <div className="px-3 pt-2">
          <LateJoinerRecap
            minutesMissed={minutesMissedAtJoin}
            agenda={agendaWithProgress.items}
            currentItem={agendaWithProgress.currentTitle}
            summary={
              session.summary && session.summary.length > 0
                ? session.summary
                : undefined
            }
          />
        </div>
      )}

      {/* Sprint C Classes #28 — reconnect overlay. Two render paths:
          (a) Offline now → full-screen modal blocks the call (the
              user can't do anything without network anyway).
          (b) Just-reconnected → top banner with the seconds-away
              count + Got-it button to acknowledge. */}
      {!reconnect.online && !hasLeft && (
        <div
          role="alertdialog"
          aria-label="Reconnecting"
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur"
        >
          <div className="max-w-sm space-y-3 rounded-xl border border-amber-500/40 bg-card p-6 text-center shadow-2xl">
            <span className="mx-auto inline-flex h-3 w-3">
              <span className="absolute h-3 w-3 animate-ping rounded-full bg-amber-500/70" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-amber-500" />
            </span>
            <p className="text-sm font-semibold">Trying to reconnect…</p>
            <p className="text-[12px] text-muted-foreground">
              Your connection dropped. We&apos;ll bring you back in as soon as it&apos;s up.
            </p>
          </div>
        </div>
      )}
      {reconnect.justReconnected && reconnect.offlineSeconds > 0 && !hasLeft && (
        <div className="px-3 pt-2">
          <div className="flex items-center justify-between gap-3 rounded-lg border border-emerald-500/40 bg-emerald-500/5 px-3 py-2 text-[12.5px]">
            <span className="font-semibold text-emerald-700 dark:text-emerald-300">
              Welcome back — you missed{" "}
              {reconnect.offlineSeconds < 60
                ? `${reconnect.offlineSeconds}s`
                : `${Math.round(reconnect.offlineSeconds / 60)}m`}
              .
            </span>
            <button
              type="button"
              onClick={reconnect.ackReconnect}
              className="rounded-md border border-emerald-500/30 px-2 py-0.5 text-[11px] font-semibold hover:bg-emerald-500/10"
            >
              Got it
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-hidden p-2">
        {hasLeft ? (
          <LeftRoomCard tenant={tenant} sessionTitle={session.title} />
        ) : nameState.hydrated && !nameState.displayName ? (
          <NamePromptCard onSubmit={nameState.setDisplayName} />
        ) : (
          <LiveKitRoom
            roomCode={canonicalRoomCode(session)}
            user={{
              id: `student-${session.id}`,
              name: nameState.displayName || "Student",
            }}
            isHost={false}
            onLeft={() => setHasLeft(true)}
            className="h-full w-full rounded-xl overflow-hidden border border-border/60"
          >
            <div className={cn("h-full w-full flex-col", stageTab === "video" ? "flex" : "hidden")}>
                  <LiveKitVideoUI chatEnabled={session.chatEnabled !== false} />
            </div>
            <div className={cn("h-full w-full", stageTab === "whiteboard" ? "block" : "hidden")}>
              {/* Whiteboard defaults to private; host toggles open via
                  the data-channel hook. Students see a locked card
                  until then. The instant the host opens it, the card
                  swaps for the canvas and a toast fires. */}
              <StudentWhiteboardStage
                persistenceKey={session.id}
                participantName={nameState.displayName || "Student"}
              />
            </div>
          </LiveKitRoom>
        )}
      </div>
    </main>
  )
}

// ---------------------------------------------------------------
// Ended screen — class is over, show recordings + next-class CTA
// ---------------------------------------------------------------

function EndedScreen({
  session,
  tenant,
  courseTitle,
  community,
  currentUserId,
}: {
  session: LiveSession
  tenant: string
  courseTitle?: string
    // Sprint A Communities #20 — attached community + member-state.
    // Null when course has no defaultBatchId or the user isn't signed in.
    community: {
      id: string
      name: string
      isMember: boolean
      memberCount: number
    } | null
    currentUserId?: string
}) {
  const recordings = session.recordings ?? []
  const { addStudentsToGroup } = useLMS()
  const router = useRouter()
  const [joining, setJoining] = useState(false)
  const [justJoined, setJustJoined] = useState(false)

  // The CTA shows only when:
  //   - A community is attached to the course
  //   - The user is signed in
  //   - They aren't already a member
  // No CTA for guest/anonymous viewers — the join action requires a
  // user id; we'd just be teasing.
  const canJoinCommunity = !!(community && currentUserId && !community.isMember)
  const joinCommunity = () => {
    if (!community || !currentUserId) return
    setJoining(true)
    addStudentsToGroup(community.id, [currentUserId])
    setJustJoined(true)
    setJoining(false)
  }

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-6 py-12">
      <Card>
        <CardContent className="space-y-5 p-8 text-center">
          <Badge variant="outline" className="border-success/40 bg-success/5 text-success">
            <Sparkles className="mr-1 h-3 w-3" />
            Class complete
          </Badge>
          <h1 className="font-serif text-3xl font-bold tracking-tight">
            That&apos;s a wrap on {session.title}.
          </h1>
          <p className="text-sm text-muted-foreground">
            Thanks for being here. The recording is{" "}
            {recordings.some((r) => !r.pending)
              ? "ready below."
              : "processing — we'll have it up shortly."}
          </p>

          {/* Sprint A Communities #20 — community join CTA. The
              moment-of-impact prompt: the student just spent an hour
              with the instructor and other learners; this is the
              warmest possible time to offer them the community as the
              place to keep that going. We render this BEFORE the
              recording list because join-to-community is the action
              with the highest activation lift; recording rewatch can
              happen from any surface later. */}
          {canJoinCommunity && community && !justJoined && (
            <div className="mx-auto mt-2 max-w-md rounded-lg border border-primary/30 bg-primary/5 p-4 text-left">
              <p className="text-[12px] font-bold uppercase tracking-wider text-primary">
                Keep learning together
              </p>
              <p className="mt-1 text-sm">
                Want to keep going with this group? Join the{" "}
                <span className="font-semibold">{community.name}</span> community to
                ask questions, share progress, and find the next class.
              </p>
              {community.memberCount > 0 && (
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {community.memberCount.toLocaleString()}{" "}
                  {community.memberCount === 1 ? "member" : "members"} already inside.
                </p>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" onClick={joinCommunity} disabled={joining}>
                  {joining ? "Joining…" : "Join the community"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => router.push(`/dashboard/batches/${community.id}`)}
                >
                  Take a look first
                </Button>
              </div>
            </div>
          )}
          {/* Confirmation state — replaces the CTA in-place rather
              than disappearing, so the student can act on the next
              step (open the community) immediately. */}
          {justJoined && community && (
            <div className="mx-auto mt-2 max-w-md rounded-lg border border-success/30 bg-success/5 p-4 text-left">
              <p className="text-[12px] font-bold uppercase tracking-wider text-success">
                You&apos;re in
              </p>
              <p className="mt-1 text-sm">
                Welcome to <span className="font-semibold">{community.name}</span>.
                There&apos;s a recording post waiting for you with the highlights.
              </p>
              <Button
                size="sm"
                className="mt-2"
                onClick={() => router.push(`/dashboard/batches/${community.id}`)}
              >
                Open community →
              </Button>
            </div>
          )}

          {recordings.length > 0 && (
            <div className="mt-6 space-y-2 text-left">
              {recordings.map((r) => (
                <Card key={r.id} className="border-border/60">
                  <CardContent className="flex items-center justify-between gap-3 p-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded bg-primary/10 text-primary">
                        <BookOpen className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Recording</p>
                        <p className="text-xs text-muted-foreground">
                          {Math.round(r.durationSec / 60)} min ·{" "}
                          {new Date(r.startedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    {r.pending ? (
                      <Badge variant="outline">Processing…</Badge>
                    ) : (
                      <Button asChild variant="outline" size="sm">
                        <a href={r.url} target="_blank" rel="noopener noreferrer">
                          Watch
                        </a>
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          <div className="flex flex-wrap justify-center gap-3 pt-4">
            <Button asChild variant="outline">
              <Link href={`/p/${tenant}`}>Back to home</Link>
            </Button>
            {courseTitle && (
              <Button asChild>
                <Link href={`/p/${tenant}/learn`}>Continue {courseTitle}</Link>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </main>
  )
}

function prettyProvider(p: LiveSession["provider"]): string {
  switch (p) {
    case "google-meet": return "Google Meet"
    case "zoom":        return "Zoom"
    case "ms-teams":    return "Microsoft Teams"
    default:            return "an external link"
  }
}

// ---------------------------------------------------------------
// NamePromptCard — full-bleed name input shown inside the Jitsi
// pane until the participant tells us who they are. Once submitted
// we cache to sessionStorage (via the parent hook) and remount
// JitsiRoom with the real name.
// ---------------------------------------------------------------

// ---------------------------------------------------------------
// Student-side whiteboard stage. Subscribes to the host's
// access flag via useWhiteboardAccess; renders a locked card
// until the host opens it, then swaps in the live canvas.
// A toast fires the moment access flips from closed → open so
// the student notices the change even if they're focused on
// the video tab.
//
// Why default private: kids are naughty, and a wide-open canvas
// in front of 30 unsupervised students degenerates into doodles
// in 10 seconds. Host has to explicitly invite them in.
// ---------------------------------------------------------------
function StudentWhiteboardStage({
  persistenceKey,
  participantName,
}: {
  persistenceKey: string
  participantName: string
}) {
  const { isOpen, justGranted } = useWhiteboardAccess(false)

  useEffect(() => {
    if (justGranted) {
      toast.success("Whiteboard is open — you can draw now.", {
        description: "The host just gave you access.",
      })
    }
  }, [justGranted])

  if (!isOpen) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-muted/30 p-6">
        <Card className="max-w-md">
          <CardContent className="space-y-4 py-10 text-center">
            <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/15 text-amber-600">
              <Lock className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-bold tracking-tight">Whiteboard is private</h2>
              <p className="text-sm text-muted-foreground">
                The host hasn&apos;t opened the whiteboard for students yet.
                Raise your hand or unmute and ask them to enable it for you.
              </p>
            </div>
            <p className="rounded-md border border-border bg-card p-2 text-[11px] text-muted-foreground">
              The tab will switch to the live canvas the moment they tap{" "}
              <span className="font-semibold">Allow students to draw</span> — no
              refresh needed.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <WhiteboardCanvas
      persistenceKey={persistenceKey}
      className="h-full w-full"
      enableSync
      participantName={participantName}
    />
  )
}

function NamePromptCard({ onSubmit }: { onSubmit: (name: string) => void }) {
  const [value, setValue] = useState("")
  const submit = () => {
    const v = value.trim()
    if (!v) return
    onSubmit(v)
  }
  return (
    <div className="flex h-full w-full items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-4 rounded-2xl border border-white/10 bg-[#11131a] p-6">
        <div>
          <h2 className="font-serif text-xl font-bold text-white">Join the class</h2>
          <p className="mt-1 text-xs text-white/60">
            Type the name your instructor will see in the room.
          </p>
        </div>
        <Input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit()
          }}
          placeholder="Your name"
          className="bg-white/5 text-white placeholder:text-white/30"
        />
        <Button className="w-full" disabled={!value.trim()} onClick={submit}>
          Join class
        </Button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------
// LeftRoomCard — shown inside the JitsiRoom pane after the user
// hangs up. Replaces Jitsi's "you've left" / "Powered by Jitsi" /
// "Rejoin" overlay with our own branding.
// ---------------------------------------------------------------

function LeftRoomCard({ tenant, sessionTitle }: { tenant: string; sessionTitle: string }) {
  return (
    <div className="flex h-full w-full items-center justify-center p-6">
      <div className="w-full max-w-md space-y-4 rounded-2xl border border-white/10 bg-[#11131a] p-6 text-center">
        <Sparkles className="mx-auto h-8 w-8 text-primary" />
        <h2 className="font-serif text-xl font-bold text-white">You&apos;ve left the class</h2>
        <p className="text-xs text-white/60">
          {sessionTitle ? `“${sessionTitle}” is still running for everyone else.` : "The class is still running for everyone else."}
        </p>
        <div className="flex justify-center gap-2">
          <Button variant="outline" onClick={() => window.location.reload()}>
            Rejoin
          </Button>
          <Button asChild>
            <Link href={`/p/${tenant}`}>Back to home</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}

function GuestNameInput({ onSubmit }: { onSubmit: (name: string) => void }) {
  const [value, setValue] = useState("")
  const submit = () => {
    const v = value.trim()
    if (v) onSubmit(v)
  }
  return (
    <div className="space-y-2">
      <Input
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit()
        }}
        placeholder="Your name"
      />
      <Button className="w-full" disabled={!value.trim()} onClick={submit}>
        Join class
      </Button>
    </div>
  )
}
