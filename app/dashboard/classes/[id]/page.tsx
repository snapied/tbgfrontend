"use client"

import { use, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Bell,
  Calendar,
  ClipboardList,
  Clock,
  Copy,
  ExternalLink,
  Mail,
  MessageSquare,
  Radio,
  Repeat,
  Send,
  Trash2,
  Users,
  Video,
  XCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { useLMS, type Assignment } from "@/lib/lms-store"
import { useConfirm } from "@/lib/use-confirm"
import { toast } from "sonner"
import { toastUndoableDelete } from "@/lib/toast-undo"
import { DashboardBreadcrumbs } from "@/components/dashboard/dashboard-breadcrumbs"
import {
  buildNotifications,
  liveSessionAnnouncement,
} from "@/lib/notifications"
import { AssignmentComposer } from "@/components/assignments/assignment-composer"
import { QuickQuizDialog } from "@/components/course-editor/quick-quiz-dialog"
import { EditSessionDialog } from "@/components/classes/edit-session-dialog"
import { CalendarClock, CalendarPlus } from "lucide-react"
import { AssignmentShareDialog } from "@/components/assignments/assignment-share-dialog"
import { ClassRecapEditor } from "@/components/classes/class-recap-editor"
import { AgendaEditor, AgendaList } from "@/components/classes/agenda-editor"
import { PrestagedPollsEditor } from "@/components/classes/prestaged-polls-editor"
import { ScheduleNextClassDialog } from "@/components/classes/schedule-next-dialog"
import { AddToCalendarMenu } from "@/components/classes/add-to-calendar-menu"
import { RecordingPlayerDialog } from "@/components/classes/recording-player-dialog"
import {
  computeSessionStatus,
  formatSessionWhen,
  providerLabel,
} from "@/lib/live-session-utils"
import { readCurrentTenantSlug } from "@/lib/tenant-store"

export default function ClassDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const {
    getLiveSessionById,
    getCourseById,
    getAttendanceForSession,
    enrollments,
    users,
    liveSessions,
    addNotifications,
    updateLiveSession,
    deleteLiveSession,
    openLiveRoom,
    startLiveRoom,
  } = useLMS()
  const confirm = useConfirm()

  const session = getLiveSessionById(id)
  const seriesSiblings = useMemo(() => {
    if (!session?.seriesId) return []
    return liveSessions
      .filter((s) => s.seriesId === session.seriesId)
      .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
  }, [session, liveSessions])
  const [copied, setCopied] = useState(false)
  const [resent, setResent] = useState(false)
  const [composerOpen, setComposerOpen] = useState(false)
  const [rescheduleOpen, setRescheduleOpen] = useState(false)
  const [scheduleNextOpen, setScheduleNextOpen] = useState(false)
  const [shareAssignment, setShareAssignment] = useState<Assignment | null>(null)
  const [quizDialogOpen, setQuizDialogOpen] = useState(false)
  const followUps = useLMS().getAssignmentsForSession(session?.id ?? "__none__")

  const roster = useMemo(() => {
    if (!session) return []
    const enrolled = enrollments.filter((e) => e.courseId === session.courseId)
    const recs = getAttendanceForSession(session.id)
    return enrolled
      .map((e) => {
        const student = users.find((u) => u.id === e.studentId)
        const record = recs.find((r) => r.studentId === e.studentId)
        return { student, record }
      })
      .filter((row): row is { student: NonNullable<typeof row.student>; record: typeof row.record } => !!row.student)
  }, [session, enrollments, users, getAttendanceForSession])

  // Both link URLs are derived from browser-only state (localStorage tenant +
  // window.location) so we compute them in an effect to dodge SSR mismatch.
  // MUST live above the early-return below — React's Rules of Hooks forbid
  // conditional hook calls, so all useState/useEffect have to run on every render.
  const [joinUrl, setJoinUrl] = useState<string>("")
  const [hostUrl, setHostUrl] = useState<string>("")
  useEffect(() => {
    if (!session) return
    const tenant = readCurrentTenantSlug() || "platform"
    const origin = (process.env.NEXT_PUBLIC_APP_URL || window.location.origin).replace(/\/$/, "")
    if (session.provider === "in-house") {
      const code = session.roomCode || session.id
      setJoinUrl(`${origin}/p/${tenant}/live/${code}`)
    } else {
      setJoinUrl(session.meetingUrl || "")
    }
    setHostUrl(`${origin}/dashboard/classes/${session.id}/host`)
  }, [session])

  if (!session) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <Video className="mx-auto h-10 w-10 text-muted-foreground" />
          <h2 className="mt-3 text-lg font-semibold">Session not found</h2>
          <Button asChild className="mt-4">
            <Link href="/dashboard/classes">Back to Live Classes</Link>
          </Button>
        </div>
      </div>
    )
  }

  const course = getCourseById(session.courseId)
  const status = computeSessionStatus(session)
  const attendedCount = roster.filter((r) => !!r.record).length
  const rate = roster.length > 0 ? Math.round((attendedCount / roster.length) * 100) : 0

  const copyLink = async () => {
    if (!joinUrl) return
    try {
      await navigator.clipboard.writeText(joinUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch { /* ignore */ }
  }

  const resendInvites = () => {
    const studentIds = enrollments.filter((e) => e.courseId === session.courseId).map((e) => e.studentId)
    const recipients = users.filter((u) => studentIds.includes(u.id))
    const payload = liveSessionAnnouncement({
      sessionTitle: session.title,
      courseTitle: course?.title ?? "Live class",
      scheduledAt: session.scheduledAt,
      durationMinutes: session.durationMinutes,
      provider: session.provider,
      meetingUrl: session.meetingUrl,
      sessionId: session.id,
    })
    if (course) payload.url = `/learn/${course.slug}#live-${session.id}`
    payload.title = `Reminder: ${payload.title}`
    const entries = buildNotifications(recipients, payload)
    addNotifications(entries)
    updateLiveSession(session.id, { notifiedAt: new Date().toISOString() })
    setResent(true)
    setTimeout(() => setResent(false), 2000)
  }

  const cancelSession = async () => {
    const ok = await confirm({
      title: "Cancel this session?",
      description: "Students will see it as cancelled.",
      confirmLabel: "Cancel session",
      cancelLabel: "Keep it",
    })
    if (!ok) return
    updateLiveSession(session.id, { status: "cancelled" })
    toast.success("Session cancelled.")
  }

  const removeSession = async () => {
    const ok = await confirm({
      title: `Delete "${session.title}"?`,
      description: "Attendance records stay but the session disappears.",
      destructive: true,
    })
    if (!ok) return
    const snapshot = { id: session.id, title: session.title }
    deleteLiveSession(session.id)
    toastUndoableDelete({
      kind: "live-session",
      ids: snapshot.id,
      label: snapshot.title,
      itemNoun: "class",
    })
  }

  // "Start now" override — flips the room to open + live and walks
  // the host into the live UI. Same path the host page's button uses,
  // but reachable without first navigating to /host. Confirms when
  // starting more than 5 min before the scheduled time so a stray
  // click doesn't pull students in prematurely.
  const startNow = async () => {
    if (session.provider !== "in-house") return
    const diffMin = Math.round((Date.now() - new Date(session.scheduledAt).getTime()) / 60_000)
    if (diffMin <= -5) {
      const ok = await confirm({
        title: `Start ${Math.abs(diffMin)} min early?`,
        description:
          "Students on the waiting screen are admitted right away. Anyone with the join link can walk into the call.",
        confirmLabel: "Start now",
      })
      if (!ok) return
    }
    openLiveRoom(session.id)
    setTimeout(() => startLiveRoom(session.id), 250)
    toast.success("Class started — joining as host…")
    router.push(`/dashboard/classes/${session.id}/host`)
  }

  return (
    <div className="space-y-6">
      <DashboardBreadcrumbs
        crumbs={[
          { label: "Classes", href: "/dashboard/classes" },
          ...(course
            ? [{ label: course.title, href: `/dashboard/courses/${course.id}` }]
            : []),
          { label: session.title },
        ]}
      />
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/classes">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight">{session.title}</h1>
            <p className="text-sm text-muted-foreground">
              {course?.title ?? "—"} · {providerLabel(session.provider)}
              {session.recurrence && (
                <span className="ml-2 inline-flex items-center gap-1 rounded-full border border-border/70 bg-muted/40 px-2 py-0.5 text-[11px] font-medium text-foreground">
                  <Repeat className="h-3 w-3" />
                  {session.recurrence.label} · {session.recurrence.index}/{session.recurrence.count}
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={status} />
          <Button variant="outline" onClick={() => setComposerOpen(true)}>
            <ClipboardList className="mr-2 h-4 w-4" />
            Post follow-up
          </Button>
          {status !== "cancelled" && status !== "ended" && (
            <Button variant="outline" onClick={() => setRescheduleOpen(true)}>
              <CalendarClock className="mr-2 h-4 w-4" />
              Reschedule
            </Button>
          )}
          {/* Add-to-calendar — only useful before the class actually
              runs. Hides post-end so we don't suggest scheduling a
              class that already happened. */}
          {status !== "cancelled" && status !== "ended" && (
            <AddToCalendarMenu
              event={{
                title: session.title,
                startsAt: session.scheduledAt,
                durationMinutes: session.durationMinutes,
                description: session.description ?? undefined,
                location:
                  typeof window !== "undefined" && joinUrl
                    ? joinUrl
                    : session.meetingUrl,
                uid: `${session.id}@thebigclass.com`,
              }}
            />
          )}
          {/* Schedule next — surfaces after the class wraps so the
              teacher can build a cohort series without bouncing to
              the calendar. Pre-fills same time +7d so weekly
              recurring classes are one click. Available on
              cancelled classes too (you might want to schedule a
              make-up for the same audience). */}
          {(status === "ended" || status === "cancelled") && (
            <Button variant="outline" onClick={() => setScheduleNextOpen(true)}>
              <CalendarPlus className="mr-2 h-4 w-4" />
              Schedule next
            </Button>
          )}
          {status !== "cancelled" && status !== "ended" && (
            session.provider === "in-house" ? (
              <>
                {/* Start now — primary action for an in-house class
                    that hasn't been opened yet. For already-open or
                    live classes we hide it (the room's already running)
                    and show only "Host live room" so the host walks
                    into the existing session. */}
                {(session.roomState ?? "scheduled") === "scheduled" && (
                  <Button onClick={startNow}>
                    <Radio className="mr-2 h-4 w-4" />
                    Start class now
                  </Button>
                )}
                <Button asChild variant="outline">
                  <Link href={`/dashboard/classes/${session.id}/host`}>
                    <Video className="mr-2 h-4 w-4" />
                    Host live room
                  </Link>
                </Button>
              </>
            ) : (
              <Button asChild>
                <a href={session.meetingUrl} target="_blank" rel="noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Open meeting
                </a>
              </Button>
            )
          )}
        </div>
      </div>

      {/* Recording surface — two states stacked:
          (a) Processing: class ended (roomEndedAt set) but recording URL
              hasn't landed yet. Shows an upload-progress card.
          (b) Ready: full playback card.

          Source priority for the URL:
            1. session.recordingUrl — the canonical field, set by endLiveRoom
               (post-fix) or backfilled by the EndedHostScreen poller.
            2. session.recordings[last].url — the host page reads this directly;
               it's populated when the recording finished BEFORE the host clicked
               End (pending=false path where the poller was skipped). Falling back
               here means both pages show the Watch button from the same data. */}
      {(() => {
        const lastRec = session.recordings?.[session.recordings.length - 1]
        const effectiveUrl =
          session.recordingUrl ||
          (lastRec && !lastRec.pending && lastRec.url ? lastRec.url : undefined)

        if (effectiveUrl) {
          return (
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="flex flex-col items-start gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-primary">
                    <Video className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Class recording is ready</p>
                    <p className="text-xs text-muted-foreground">
                      Anyone with this page open can replay the class anytime.
                    </p>
                  </div>
                </div>
                <RecordingPlayerDialog
                  url={effectiveUrl}
                  title={session.title}
                  triggerLabel="Watch recording"
                />
              </CardContent>
            </Card>
          )
        }

        if (session.roomEndedAt && session.roomState === "ended") {
          return <RecordingProcessingCard roomEndedAtIso={session.roomEndedAt} />
        }

        return null
      })()}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="space-y-4 p-5">
            {session.description && (
              <p className="text-sm leading-relaxed text-muted-foreground">{session.description}</p>
            )}

            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
              <Meta icon={<Calendar />} label="Starts" value={formatSessionWhen(session.scheduledAt)} />
              <Meta icon={<Clock />} label="Duration" value={`${session.durationMinutes} min`} />
              <Meta icon={<Users />} label="Joined" value={`${attendedCount}/${roster.length}`} />
              <Meta icon={<Video />} label="Provider" value={providerLabel(session.provider)} />
            </div>

            <div className="rounded-md border border-border/60 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {session.provider === "in-house" ? "Join link (in-house room)" : "Meeting link"}
              </p>
              <div className="mt-1 flex items-center gap-2">
                <code className="flex-1 truncate rounded bg-muted/60 px-2 py-1 text-xs">
                  {joinUrl || "Generating link…"}
                </code>
                <Button variant="outline" size="sm" onClick={copyLink} disabled={!joinUrl}>
                  <Copy className="mr-1.5 h-3.5 w-3.5" />
                  {copied ? "Copied" : "Copy"}
                </Button>
                {session.provider === "in-house" && joinUrl && (
                  <Button variant="outline" size="sm" asChild>
                    <a href={joinUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                      Open
                    </a>
                  </Button>
                )}
              </div>
              {session.provider === "in-house" && (
                <p className="mt-2 text-[11px] text-muted-foreground">
                  Share this link with students. Anyone who opens it joins as a participant.
                </p>
              )}
            </div>

            {session.provider === "in-house" && (
              <div className="rounded-md border border-amber-500/30 bg-amber-500/[0.04] p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-500">
                  Host link (you, the instructor)
                </p>
                <div className="mt-1 flex items-center gap-2">
                  <code className="flex-1 truncate rounded bg-muted/60 px-2 py-1 text-xs">
                    {hostUrl || "Generating link…"}
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (!hostUrl) return
                      navigator.clipboard.writeText(hostUrl).then(() => {
                        toast.success("Host link copied")
                      }).catch(() => undefined)
                    }}
                    disabled={!hostUrl}
                  >
                    <Copy className="mr-1.5 h-3.5 w-3.5" />
                    Copy
                  </Button>
                  {hostUrl && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={hostUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                        Open host view
                      </a>
                    </Button>
                  )}
                </div>
                <p className="mt-2 text-[11px] text-muted-foreground">
                  Open this to host. You join as moderator, can start the recording, and
                  beam students in from the waiting room.
                  <span className="ml-1 font-medium text-foreground">Don&apos;t share this link with students</span> —
                  use the join link above for them.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Notifications</CardTitle>
            <CardDescription>
              {session.notifiedAt
                ? `Last sent ${new Date(session.notifiedAt).toLocaleString()}.`
                : "Invitations have not been sent yet."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <ChannelPill icon={<Bell className="h-3.5 w-3.5" />} label="In-app" />
            <ChannelPill icon={<Mail className="h-3.5 w-3.5" />} label="Email" />
            <ChannelPill icon={<MessageSquare className="h-3.5 w-3.5" />} label="WhatsApp" />
            <Button onClick={resendInvites} className="w-full" variant="outline">
              <Send className="mr-2 h-4 w-4" />
              {resent ? "Reminder queued!" : "Resend reminder"}
            </Button>
            <div className="flex gap-2">
              {status !== "cancelled" && (
                <Button onClick={cancelSession} variant="ghost" size="sm" className="flex-1 text-destructive hover:text-destructive">
                  <XCircle className="mr-1.5 h-4 w-4" />
                  Cancel
                </Button>
              )}
              <Button onClick={removeSession} variant="ghost" size="sm" className="flex-1 text-destructive hover:text-destructive">
                <Trash2 className="mr-1.5 h-4 w-4" />
                Delete
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Series sessions (when part of a recurring series) */}
      {seriesSiblings.length > 1 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Repeat className="h-4 w-4 text-primary" />
              Recurring series
            </CardTitle>
            <CardDescription>
              {session.recurrence
                ? `${session.recurrence.label} · ${seriesSiblings.length} sessions in this series.`
                : `${seriesSiblings.length} sessions in this series.`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-1">
            {seriesSiblings.map((s) => {
              const isThis = s.id === session.id
              const sStatus = computeSessionStatus(s)
              return (
                <Link
                  key={s.id}
                  href={`/dashboard/classes/${s.id}`}
                  className={cn(
                    "flex items-center gap-3 rounded-md border px-3 py-2 text-sm transition-colors",
                    isThis
                      ? "border-primary/40 bg-primary/5 text-foreground"
                      : "border-border/60 hover:bg-muted/40",
                  )}
                >
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-muted text-[11px] font-semibold">
                    {s.recurrence?.index ?? "?"}
                  </span>
                  <span className="flex-1 truncate font-medium">
                    {formatSessionWhen(s.scheduledAt)}
                  </span>
                  <StatusBadge status={sStatus} />
                  {isThis && (
                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      Viewing
                    </span>
                  )}
                </Link>
              )
            })}
          </CardContent>
        </Card>
      )}

      {/* Pre-class agenda — what's planned, in scannable order.
          Always visible (even after the class) so a teacher can
          glance back at what was on the original docket. */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Agenda</CardTitle>
          <CardDescription>
            What you plan to cover. Students see this in the waiting
            room so they arrive ready.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <AgendaEditor
            value={session.agenda ?? []}
            onChange={(next) => updateLiveSession(session.id, { agenda: next })}
          />

          {/* Pre-staged polls (CL6). Composed here, fired one-tap
              from the host's Poll panel during class — no
              mid-lecture composer typing. */}
          <div className="rounded-lg border border-border bg-card p-4">
            <PrestagedPollsEditor
              polls={(session.prestagedPolls ?? []).map((p) => ({
                id: p.id,
                question: p.question,
                options: p.options,
                launchedPollId: p.launchedPollId,
              }))}
              onChange={(next) =>
                updateLiveSession(session.id, { prestagedPolls: next })
              }
            />
          </div>
          {/* Chat toggle. Sits with agenda because both are
              pre-class room configuration. Default-on (the field is
              tri-state with undefined === enabled), so a teacher
              has to actively opt out for focused / lecture-only
              sessions. */}
          <label className="flex cursor-pointer items-start gap-3 rounded-md border border-border p-3 hover:bg-muted/40">
            <input
              type="checkbox"
              checked={session.chatEnabled !== false}
              onChange={(e) =>
                updateLiveSession(session.id, {
                  chatEnabled: e.target.checked,
                })
              }
              className="mt-0.5"
            />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium">
                Chat is{" "}
                {session.chatEnabled === false ? "off" : "on"} for this class
              </span>
              <span className="block text-[11px] text-muted-foreground">
                Students can text-chat during the live class. Turn off
                for focused recording-only sessions or one-way lectures.
              </span>
            </span>
          </label>
        </CardContent>
      </Card>

      {/* Post-class recap — summary, recording, materials */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Class recap</CardTitle>
          <CardDescription>
            After the class, drop a summary, paste the recording, attach slides / Canva / Gamma / PDFs / images — everything stays on the class for students to revisit.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ClassRecapEditor session={session} />
        </CardContent>
      </Card>

      {/* Follow-ups for this session */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-base">Follow-ups</CardTitle>
            <CardDescription>
              Assignments, projects, or notes tied to this class. Sent via in-app, email &amp; WhatsApp on publish.
            </CardDescription>
          </div>
          <Button size="sm" variant="outline" onClick={() => setComposerOpen(true)}>
            <ClipboardList className="mr-1.5 h-3.5 w-3.5" /> Post follow-up
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {followUps.length === 0 ? (
            <p className="rounded-md border border-dashed border-border/60 p-4 text-center text-sm text-muted-foreground">
              Nothing yet. Post a follow-up to share resources, an assignment, or a recap with the students who joined.
            </p>
          ) : (
            followUps.map((a) => (
              <div
                key={a.id}
                className="flex items-center gap-2 rounded-md border border-border/60 px-3 py-2 text-sm"
              >
                <ClipboardList className="h-3.5 w-3.5 text-accent" />
                <Link
                  href={`/dashboard/assignments/${a.id}`}
                  className="min-w-0 flex-1 truncate font-medium hover:underline"
                >
                  {a.title}
                </Link>
                <span className="text-xs capitalize text-muted-foreground">{a.kind}</span>
                {a.dueAt && (
                  <span className="text-xs text-muted-foreground">
                    · due {new Date(a.dueAt).toLocaleDateString()}
                  </span>
                )}
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setShareAssignment(a)}>
                  <Send className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Attendance roster */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Attendance roster</CardTitle>
          <CardDescription>
            {attendedCount} of {roster.length} enrolled students joined · {rate}% attendance.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {roster.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-muted-foreground">
              No students are enrolled in this course yet.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined at</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roster.map(({ student, record }) => (
                  <TableRow key={student.id}>
                    <TableCell>
                      <Link
                        href={`/dashboard/students/${student.id}`}
                        className="font-medium hover:underline"
                      >
                        {student.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">{student.email}</span>
                    </TableCell>
                    <TableCell>
                      {record ? (
                        <Badge className="gap-1 bg-success text-success-foreground">
                          Attended
                        </Badge>
                      ) : (
                        <Badge variant="outline">Not joined</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm tabular-nums">
                        {record ? new Date(record.joinedAt).toLocaleString() : "—"}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Composer always renders — instant classes have no `course`, but
          follow-ups (assignments / projects / notes) should still be possible
          and the publish flow handles the empty-course case gracefully. */}
      <AssignmentComposer
        open={composerOpen}
        onOpenChange={setComposerOpen}
        course={course}
        session={session}
        onPublished={(a) => setShareAssignment(a)}
        onCreateQuiz={() => {
          // Close the assignment composer first so the quiz dialog gets focus
          // instead of stacking two modals on top of each other.
          setComposerOpen(false)
          setQuizDialogOpen(true)
        }}
      />
      <QuickQuizDialog
        open={quizDialogOpen}
        onOpenChange={setQuizDialogOpen}
        courseId={course?.id ?? ""}
        defaultTitle={session.title}
        onCreated={() => {
          toast.success("Quiz created — share it from the Quizzes page.")
          setQuizDialogOpen(false)
        }}
      />
      <EditSessionDialog
        session={session}
        open={rescheduleOpen}
        onOpenChange={setRescheduleOpen}
      />
      <ScheduleNextClassDialog
        source={session}
        open={scheduleNextOpen}
        onOpenChange={setScheduleNextOpen}
      />
      {shareAssignment && (
        <AssignmentShareDialog
          assignment={shareAssignment}
          open={!!shareAssignment}
          onOpenChange={(o) => !o && setShareAssignment(null)}
        />
      )}
    </div>
  )
}

function Meta({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="rounded-md border border-border/60 p-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <span className="[&>svg]:h-3.5 [&>svg]:w-3.5">{icon}</span>
        {label}
      </div>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  )
}

function ChannelPill({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-border/60 px-3 py-2 text-xs">
      <span className="text-primary">{icon}</span>
      <span className="font-medium">{label}</span>
    </div>
  )
}

function StatusBadge({ status }: { status: "upcoming" | "live" | "ended" | "cancelled" }) {
  if (status === "live") {
    return (
      <Badge className={cn("gap-1.5 bg-destructive text-destructive-foreground")}>
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
        Live now
      </Badge>
    )
  }
  if (status === "upcoming") {
    return (
      <Badge variant="secondary" className="gap-1.5">
        <Clock className="h-3 w-3" /> Upcoming
      </Badge>
    )
  }
  if (status === "cancelled") return <Badge variant="outline">Cancelled</Badge>
  return <Badge variant="outline">Ended</Badge>
}


// ============================================================
// RecordingProcessingCard
// ============================================================
//
// Lives in the dead time between class end and recording-URL
// landing. The egress worker takes 30-180s to encode + upload; this
// card is what students + the host see during that window instead
// of an empty page. Self-updates every 5s so a refresh-not-needed
// student sees the elapsed time tick.
//
// Three stages (visual only — we do not have egress-progress events
// over the wire today, so we synthesize based on elapsed time):
//   0-15s   → "Saving your recording…"
//   15-60s  → "Encoding at 1080p…"
//   60s+    → "Uploading to CDN…"
//
// If the URL still hasn't landed after ~5 min, we show a fallback
// hint that something might be wrong — the host email is already
// wired upstream so they will hear about real failures separately.
function RecordingProcessingCard({ roomEndedAtIso }: { roomEndedAtIso: string }) {
  const [nowMs, setNowMs] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 5_000)
    return () => window.clearInterval(id)
  }, [])
  const endedMs = Date.parse(roomEndedAtIso)
  const elapsed = Number.isFinite(endedMs) ? Math.max(0, nowMs - endedMs) : 0
  const elapsedSec = Math.round(elapsed / 1000)
  const stage = elapsed < 15_000
    ? "saving"
    : elapsed < 60_000
      ? "encoding"
      : elapsed < 300_000
        ? "uploading"
        : "slow"
  const stageCopy =
    stage === "saving"
      ? "Saving your recording…"
      : stage === "encoding"
        ? "Encoding at 1080p…"
        : stage === "uploading"
          ? "Uploading to your CDN…"
          : "Still working on it — this is taking longer than usual."
  // Pseudo-progress that reaches ~95% by the 90s mark, capped so it
  // never lies about being done.
  const pct = Math.min(95, Math.round((elapsed / 90_000) * 95))
  return (
    <Card className="border-primary/30 bg-gradient-to-br from-primary/[0.04] to-primary/[0.02]">
      <CardContent className="space-y-3 p-5">
        <div className="flex items-center gap-3">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-primary">
            <Video className="h-5 w-5" />
            <span className="absolute -right-0.5 -top-0.5 inline-flex h-3 w-3">
              <span className="absolute inset-0 animate-ping rounded-full bg-primary/60" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-primary" />
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">📼 Recording is processing</p>
            <p className="text-xs text-muted-foreground">
              {stageCopy} <span className="tabular-nums">· {elapsedSec}s elapsed</span>
            </p>
          </div>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-primary/10">
          <div
            className="h-full bg-primary transition-all duration-700"
            style={{ width: `${pct}%` }}
          />
        </div>
        {stage === "slow" ? (
          <p className="text-[11px] text-muted-foreground">
            Most recordings land in 1-2 minutes. If this card is still here in another minute, refresh — the host will also get an email when the file is ready.
          </p>
        ) : (
          <p className="text-[11px] text-muted-foreground">
            You can leave this page — we&apos;ll email you when it&apos;s ready. The recording usually lands within 2 minutes.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
