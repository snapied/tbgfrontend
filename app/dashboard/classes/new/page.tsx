"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft, CalendarRange, CheckCircle2, Copy, ExternalLink, Link as LinkIcon, Mail, MessageSquare, Radio, Repeat, Send, Video } from "lucide-react"
import { toast } from "sonner"
import { readCurrentTenantSlug } from "@/lib/tenant-store"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { generateId, useLMS, type LiveSession } from "@/lib/lms-store"
import {
  buildNotifications,
  detectProvider,
  liveSessionAnnouncement,
} from "@/lib/notifications"
import { providerLabel } from "@/lib/live-session-utils"
import { ProductTour, TakeATourButton, type TourStep } from "@/components/tour/product-tour"

// Tour for the Schedule a Live Class form. Walks through Simple-mode
// essentials, flips into Advanced to show provider override + recurrence
// + per-channel notify toggles, then flips back.
const NEW_CLASS_TOUR: TourStep[] = [
  {
    placement: "center",
    title: "Schedule a class in under a minute",
    body: "Walkthrough of how the form adapts based on what you need. Hit Next, or close to skip.",
    emoji: "📅",
  },
  {
    target: "[data-tour='class-mode-toggle']",
    title: "Simple by default — Advanced when you need it",
    body: "Simple mode keeps the form to Title + Date + Duration with the in-house room ready. Advanced adds course-linking, custom providers (Zoom / Meet / Teams), recurrence, host picker, and channel-level notification controls.",
    emoji: "🎚️",
  },
  {
    beforeShow: "[data-tour='class-mode-toggle'][data-mode='advanced']",
    target: "[data-tour='class-details']",
    title: "Class details",
    body: "Just give it a title in Simple mode. Description, course-link, and host picker only show in Advanced — they're rarely needed for an instant or one-off class.",
    emoji: "📝",
  },
  {
    target: "[data-tour='class-join']",
    title: "Where students join",
    body: "Defaults to the in-house room — the join link is ready immediately, no Zoom or Meet account needed. Recording is built-in for in-house calls. Flip to Advanced to paste a Zoom / Meet / Teams URL instead.",
    emoji: "📺",
  },
  {
    target: "[data-tour='class-when']",
    title: "Date, time, duration",
    body: "The only other required fields. Datetime accepts any valid value; duration defaults to 60 minutes.",
    emoji: "⏱️",
  },
  {
    beforeShow: "[data-tour='class-mode-toggle'][data-mode='simple']",
    target: "[data-tour='class-repeats']",
    title: "Advanced: Repeats",
    body: "For weekly office hours or a multi-session cohort. Pick a cadence, set an end (after N sessions or by a date), and we expand the series — sharing the same join link across every instance.",
    emoji: "🔁",
  },
  {
    target: "[data-tour='class-notify']",
    title: "Advanced: Notification channels",
    body: "Simple sends in-app + email + WhatsApp by default to every enrolled student. Advanced lets you mute any channel — useful for a low-priority class or a make-up session.",
    emoji: "🔔",
  },
  {
    beforeShow: "[data-tour='class-mode-toggle'][data-mode='advanced']",
    placement: "center",
    title: "You're set",
    body: "Title + when + duration → Schedule & Notify. Or hit Start instant class if it's about to start. Click Take a tour any time to see this again.",
    emoji: "🚀",
  },
]

const PROVIDER_OPTIONS: Array<{ value: LiveSession["provider"]; label: string }> = [
  { value: "in-house",    label: "In-house room (default)" },
  { value: "google-meet", label: "Google Meet" },
  { value: "zoom",        label: "Zoom" },
  { value: "ms-teams",    label: "Microsoft Teams" },
  { value: "other",       label: "Other" },
]

// Recurrence presets. "custom" lets the teacher set an arbitrary interval.
type RepeatPreset = "once" | "daily" | "every-2" | "every-3" | "every-4" | "weekly" | "custom"
const REPEAT_OPTIONS: Array<{ value: RepeatPreset; label: string; intervalDays: number }> = [
  { value: "once",     label: "Doesn't repeat",  intervalDays: 0 },
  { value: "daily",    label: "Daily",           intervalDays: 1 },
  { value: "every-2",  label: "Every 2 days",    intervalDays: 2 },
  { value: "every-3",  label: "Every 3 days",    intervalDays: 3 },
  { value: "every-4",  label: "Every 4 days",    intervalDays: 4 },
  { value: "weekly",   label: "Weekly",          intervalDays: 7 },
  { value: "custom",   label: "Custom interval", intervalDays: 0 },
]

type EndMode = "count" | "until"

// Given the first scheduledAt (ISO), interval in days, count and optional end
// date, expand into [{ scheduledAt }] for every instance in the series.
function expandSeries(opts: {
  firstAt: string
  intervalDays: number
  count: number
  until?: string
}): Array<{ scheduledAt: string; index: number }> {
  const out: Array<{ scheduledAt: string; index: number }> = []
  if (opts.intervalDays <= 0) {
    return [{ scheduledAt: opts.firstAt, index: 1 }]
  }
  const start = new Date(opts.firstAt).getTime()
  const stopAt = opts.until ? new Date(opts.until).getTime() : Infinity
  const max = Math.max(1, Math.min(opts.count, 200))
  for (let i = 0; i < max; i++) {
    const t = start + i * opts.intervalDays * 86400000
    if (t > stopAt) break
    out.push({ scheduledAt: new Date(t).toISOString(), index: i + 1 })
  }
  return out
}

function repeatLabel(preset: RepeatPreset, intervalDays: number): string {
  if (preset !== "custom") {
    return REPEAT_OPTIONS.find((o) => o.value === preset)?.label ?? "Doesn't repeat"
  }
  if (intervalDays === 1) return "Daily"
  if (intervalDays === 7) return "Weekly"
  return `Every ${intervalDays} day${intervalDays === 1 ? "" : "s"}`
}

// Build a default datetime-local string ~1h from now, rounded to next 15m.
function defaultStart(): string {
  const d = new Date(Date.now() + 60 * 60 * 1000)
  d.setMinutes(Math.ceil(d.getMinutes() / 15) * 15, 0, 0)
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function NewClassPage() {
  const router = useRouter()
  const {
    courses,
    currentUser,
    enrollments,
    users,
    addLiveSession,
    addNotifications,
    openLiveRoom,
    // For prefill-from-previous-session via ?fromSessionId — the
    // wrap wizard's "Schedule next class" follow-up hands off the
    // source session id; we look it up here and pre-fill the form
    // with title (Week-N incremented), scheduledAt (+7d), duration,
    // agenda, host, provider, meeting URL.
    liveSessions,
  } = useLMS()
  const searchParams = useSearchParams()
  const prefillCourseId = searchParams?.get("courseId") ?? ""
  const fromSessionId = searchParams?.get("fromSessionId") ?? ""
  const fromSession = fromSessionId ? liveSessions.find((s) => s.id === fromSessionId) : undefined

  // Pre-generated room code + tenant + origin so the join URL renders BEFORE
  // submit. All three rely on browser-only state (Date.now/Math.random,
  // localStorage, window.location), so we defer to a client-side effect to
  // avoid an SSR hydration mismatch — the server has no way to predict the
  // same room code or know which tenant this browser belongs to.
  const [previewRoomCode, setPreviewRoomCode] = useState<string>("")
  const [tenantSlug, setTenantSlug] = useState<string>("")
  const [appBase, setAppBase] = useState<string>("")
  useEffect(() => {
    const sid = generateId("session")
    setPreviewRoomCode(sid.replace(/[^a-z0-9]/gi, "").slice(-10) || sid)
    setTenantSlug(readCurrentTenantSlug() || "platform")
    setAppBase((process.env.NEXT_PUBLIC_APP_URL || window.location.origin).replace(/\/$/, ""))
  }, [])
  const previewJoinUrl = previewRoomCode && appBase && tenantSlug
    ? `${appBase}/p/${tenantSlug}/live/${previewRoomCode}`
    : ""

  // Prefill bundle. When the wrap wizard's "Schedule next class"
  // path lands here it carries ?fromSessionId=<just-ended-class>.
  // We pull the source session and pre-fill every editable field so
  // a weekly-series teacher just confirms instead of re-typing.
  // ?courseId on its own (without fromSessionId) pre-selects the
  // course but leaves everything else default — the lighter
  // "schedule next" entry point from the class list still works.
  const prefill = (() => {
    if (!fromSession) {
      return {
        courseId: prefillCourseId,
        title: "",
        description: "",
        meetingUrl: "",
        provider: "in-house" as LiveSession["provider"],
        scheduledAt: defaultStart(),
        duration: "60",
        hostId: currentUser?.id ?? "",
      }
    }
    // +7 days at the same local time. Same-cadence default is
    // correct for the weekly cohort case (the most common reason
    // to use "Schedule next class"). Teacher can edit before save.
    const nextStart = new Date(Date.parse(fromSession.scheduledAt) + 7 * 24 * 60 * 60 * 1000)
    const pad = (n: number) => String(n).padStart(2, "0")
    const nextStartLocal = `${nextStart.getFullYear()}-${pad(nextStart.getMonth() + 1)}-${pad(nextStart.getDate())}T${pad(nextStart.getHours())}:${pad(nextStart.getMinutes())}`
    // Title — bump "Week N" when present, else suffix "(next week)".
    const weekMatch = fromSession.title.match(/\bweek\s*(\d+)\b/i)
    const nextTitle = weekMatch
      ? fromSession.title.replace(/\bweek\s*(\d+)\b/i, `Week ${Number(weekMatch[1]) + 1}`)
      : `${fromSession.title} (next week)`
    return {
      courseId: fromSession.courseId || prefillCourseId,
      title: nextTitle,
      description: fromSession.description ?? "",
      meetingUrl: fromSession.meetingUrl ?? "",
      provider: fromSession.provider,
      scheduledAt: nextStartLocal,
      duration: String(fromSession.durationMinutes ?? 60),
      hostId: fromSession.hostId,
    }
  })()

  const [courseId, setCourseId] = useState(prefill.courseId)
  const [title, setTitle] = useState(prefill.title)
  const [description, setDescription] = useState(prefill.description)
  const [meetingUrl, setMeetingUrl] = useState(prefill.meetingUrl)
  // Default to in-house — that's our hosted video room, no external
  // link required. Instructors who prefer Zoom/Meet/Teams just override.
  const [providerOverride, setProviderOverride] = useState<LiveSession["provider"] | null>(
    prefill.provider,
  )
  const [scheduledAt, setScheduledAt] = useState(prefill.scheduledAt)
  const [duration, setDuration] = useState(prefill.duration)
  // Host (instructor) for this class. Defaults to the logged-in
  // user so the common "I'm scheduling my own class" case is
  // zero-click; can be reassigned to any faculty member when an
  // admin is scheduling on someone else's behalf.
  const [hostUserId, setHostUserId] = useState<string>(prefill.hostId || currentUser?.id || "")
  const [notifyInApp, setNotifyInApp] = useState(true)
  const [notifyEmail, setNotifyEmail] = useState(true)
  const [notifyWhatsApp, setNotifyWhatsApp] = useState(true)
  const [saving, setSaving] = useState(false)

  // Recurrence
  const [repeatPreset, setRepeatPreset] = useState<RepeatPreset>("once")
  const [customInterval, setCustomInterval] = useState("5")
  const [endMode, setEndMode] = useState<EndMode>("count")
  const [endCount, setEndCount] = useState("4")
  const [endUntil, setEndUntil] = useState("")

  // Simple vs Advanced form mode — same pattern as /dashboard/courses/new.
  // Simple shows title + when + duration + the auto in-house join link.
  // Advanced re-adds course pick, description, host, provider override,
  // custom URL, recurrence, and per-channel notification toggles.
  const FORM_MODE_KEY = "classes:new:formMode"
  const [formMode, setFormMode] = useState<"simple" | "advanced">("simple")
  useEffect(() => {
    if (typeof window === "undefined") return
    try {
      const saved = window.localStorage.getItem(FORM_MODE_KEY)
      if (saved === "simple" || saved === "advanced") setFormMode(saved)
    } catch {
      /* localStorage disabled — keep default */
    }
  }, [])
  const toggleFormMode = () => {
    setFormMode((prev) => {
      const next = prev === "simple" ? "advanced" : "simple"
      try {
        window.localStorage.setItem(FORM_MODE_KEY, next)
      } catch {
        /* ignore */
      }
      return next
    })
  }
  const isAdvanced = formMode === "advanced"

  const intervalDays =
    repeatPreset === "custom"
      ? Math.max(1, parseInt(customInterval) || 1)
      : REPEAT_OPTIONS.find((o) => o.value === repeatPreset)?.intervalDays ?? 0
  const isRecurring = intervalDays > 0
  const recurrenceLabel = repeatLabel(repeatPreset, intervalDays)

  const plannedInstances = useMemo(() => {
    if (!isRecurring || !scheduledAt) return [{ scheduledAt, index: 1 }]
    const firstAt = new Date(scheduledAt).toISOString()
    if (endMode === "until") {
      if (!endUntil) return [{ scheduledAt: firstAt, index: 1 }]
      return expandSeries({
        firstAt,
        intervalDays,
        count: 200, // safety cap inside expandSeries
        until: new Date(endUntil + "T23:59:59").toISOString(),
      })
    }
    return expandSeries({
      firstAt,
      intervalDays,
      count: Math.max(1, parseInt(endCount) || 1),
    })
  }, [isRecurring, scheduledAt, intervalDays, endMode, endCount, endUntil])

  const detectedProvider = useMemo(() => detectProvider(meetingUrl), [meetingUrl])
  const provider: LiveSession["provider"] = providerOverride ?? detectedProvider

  const enrolledStudents = useMemo(() => {
    if (!courseId) return []
    const studentIds = enrollments.filter((e) => e.courseId === courseId).map((e) => e.studentId)
    return users.filter((u) => studentIds.includes(u.id))
  }, [courseId, enrollments, users])

  // Audience targeting — matches the quiz + assignment pattern. Defaults
  // to "everyone enrolled" so the existing one-click flow is unchanged
  // when a teacher just picks a course and hits Schedule.
  type ClassAudience = "all" | "selected"
  const [audience, setAudience] = useState<ClassAudience>("all")
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([])
  const targetStudents = useMemo(() => {
    if (audience === "selected") {
      return enrolledStudents.filter((u) => selectedStudentIds.includes(u.id))
    }
    return enrolledStudents
  }, [audience, enrolledStudents, selectedStudentIds])

  const recipientsWithEmail = targetStudents.filter((u) => !!u.email).length
  const recipientsWithPhone = targetStudents.filter((u) => !!u.phone).length

  const isValidUrl = useMemo(() => {
    if (!meetingUrl) return false
    try {
      const u = new URL(meetingUrl)
      return u.protocol === "https:" || u.protocol === "http:"
    } catch { return false }
  }, [meetingUrl])

  // In-house rooms don't need an external meeting URL — students
  // join from /p/<tenant>/live/<roomCode>. Other providers still
  // require a valid URL.
  const isInHouse = provider === "in-house"
  // For in-house we also relax the course-required check — a teacher can
  // spin up an instant link without picking a course; the session lands in
  // "General" / unassigned and still works end-to-end.
  const canSubmit =
    title &&
    scheduledAt &&
    parseInt(duration) > 0 &&
    (isInHouse ? true : (courseId && isValidUrl))

  const handleSubmit = async () => {
    if (!canSubmit) return
    // If Copy / Open already persisted this room, redirect to its detail page
    // instead of double-creating. The teacher can edit details from there.
    if (persistedSessionId) {
      toast.info("This room is already saved. Manage it from the class page.")
      router.push(`/dashboard/classes/${persistedSessionId}`)
      return
    }
    setSaving(true)

    const course = courses.find((c) => c.id === courseId)
    const seriesId = isRecurring && plannedInstances.length > 1 ? generateId("series") : undefined
    const createdAt = new Date().toISOString()
    // Honor the host picker — falls back through the picker value,
    // the logged-in user, and finally a workspace default so the
    // session never lands without an owner.
    const hostId = hostUserId || currentUser?.id || "user-admin"
    const totalInstances = plannedInstances.length

    // Create every instance in the series. The first one carries the
    // full notification payload; siblings inherit the same content but
    // we only send one announcement (mentioning the recurring schedule).
    const created: LiveSession[] = plannedInstances.map((inst, idx) => {
      const sessionId = generateId("session")
      // First instance reuses the URL preview the teacher saw on this page
      // so the link they may have already copied keeps working. Subsequent
      // instances get fresh codes.
      const roomCode = isInHouse
        ? (idx === 0
            ? previewRoomCode
            : sessionId.replace(/[^a-z0-9]/gi, "").slice(-10) || sessionId)
        : undefined
      return {
        id: sessionId,
        courseId,
        title,
        description: description || undefined,
        provider,
        // External providers carry the meeting URL the teacher
        // pasted in. In-house rooms render from /p/<tenant>/live/<code>
        // so we leave meetingUrl empty (the join link is built at
        // render time).
        meetingUrl: isInHouse ? "" : meetingUrl,
        scheduledAt: inst.scheduledAt,
        durationMinutes: parseInt(duration) || 60,
        hostId,
        status: "scheduled",
        roomState: isInHouse ? "scheduled" : undefined,
        roomCode,
        createdAt,
        seriesId,
        recurrence: seriesId
          ? {
              label: recurrenceLabel,
              intervalDays,
              count: totalInstances,
              index: inst.index,
            }
          : undefined,
      }
    })

    // One notification per series (not per instance) so we don't spam.
    const channels: ("in-app" | "email" | "whatsapp")[] = []
    if (notifyInApp) channels.push("in-app")
    if (notifyEmail) channels.push("email")
    if (notifyWhatsApp) channels.push("whatsapp")

    const first = created[0]
    const seriesSuffix = seriesId
      ? `  •  Recurring: ${recurrenceLabel} (${totalInstances} sessions)`
      : ""
    const payload = liveSessionAnnouncement({
      sessionTitle: first.title + seriesSuffix,
      courseTitle: course?.title ?? "Live class",
      scheduledAt: first.scheduledAt,
      durationMinutes: first.durationMinutes,
      provider: first.provider,
      meetingUrl: first.meetingUrl,
      sessionId: first.id,
    })
    if (course) payload.url = `/learn/${course.slug}#live-${first.id}`

    const entries = buildNotifications(targetStudents, payload, { channels })

    // Mark notifiedAt on the first instance only so re-saves of siblings
    // can fire their own reminders later if needed.
    first.notifiedAt = createdAt
    created.forEach((s) => addLiveSession(s))
    addNotifications(entries)

    setSaving(false)
    router.push(`/dashboard/classes/${first.id}`)
  }

  // Tracks the session id once we've persisted it to the store. Copy / Open /
  // Start instant class all funnel through ensureSession() so the preview link
  // becomes a real session the moment anyone tries to use it. Without this, a
  // teacher could copy the URL and share it before clicking submit — students
  // would hit "Class link doesn't look right" because the session doesn't exist
  // yet in localStorage.
  const [persistedSessionId, setPersistedSessionId] = useState<string | null>(null)

  const ensureSession = (markOpen: boolean): string => {
    if (persistedSessionId) {
      if (markOpen) openLiveRoom(persistedSessionId)
      return persistedSessionId
    }
    const sessionId = generateId("session")
    const nowIso = new Date().toISOString()
    const session: LiveSession = {
      id: sessionId,
      courseId: courseId || "",
      title: title || `Instant class · ${new Date().toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}`,
      description: description || undefined,
      provider: "in-house",
      meetingUrl: "",
      scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : nowIso,
      durationMinutes: parseInt(duration) || 60,
      hostId: hostUserId || currentUser?.id || "user-admin",
      status: "scheduled",
      roomState: "scheduled",
      roomCode: previewRoomCode,
      createdAt: nowIso,
    }
    addLiveSession(session)
    if (markOpen) openLiveRoom(sessionId)
    setPersistedSessionId(sessionId)
    return sessionId
  }

  // "Start instant class" — creates the session (if not already persisted),
  // flips the room to "open" so students get beamed in, copies the join link,
  // and jumps straight to the host view.
  const handleStartInstant = () => {
    const sid = ensureSession(true)
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(previewJoinUrl).catch(() => undefined)
    }
    toast.success("Room is open — join link copied to clipboard")
    router.push(`/dashboard/classes/${sid}/host`)
  }

  const handleCopyLink = () => {
    // Persist the session before copying so the link works the moment the
    // teacher pastes it anywhere. Room stays "scheduled" — students see the
    // waiting room until the teacher opens it.
    ensureSession(false)
    if (typeof navigator === "undefined" || !navigator.clipboard) {
      toast.error("Clipboard not available — select and copy manually")
      return
    }
    navigator.clipboard.writeText(previewJoinUrl)
      .then(() => toast.success("Join link copied — share it anywhere"))
      .catch(() => toast.error("Couldn't copy — select and copy manually"))
  }

  const handleOpenLink = () => {
    // Same as copy — make sure the session exists before we navigate to it.
    ensureSession(false)
    if (typeof window !== "undefined") {
      window.open(previewJoinUrl, "_blank", "noopener,noreferrer")
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/classes">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Schedule a Live Class</h1>
            <p className="text-muted-foreground">Paste a Meet/Zoom/Teams link and we&apos;ll notify enrolled students.</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Header is intentionally lean — only the two primary actions
              live here so they never wrap on narrower viewports. The
              form-mode toggle + Take-a-tour link sit inside the form
              body where they're more discoverable + the labels can
              spell out clearly what each option contains. */}
          {isInHouse && (
            <Button variant="outline" onClick={handleStartInstant} disabled={!previewRoomCode}>
              <Radio className="mr-2 h-4 w-4 text-red-500" />
              Start instant class
            </Button>
          )}
          <Button onClick={handleSubmit} disabled={!canSubmit || saving}>
            <Send className="mr-2 h-4 w-4" />
            {saving
              ? "Scheduling…"
              : plannedInstances.length > 1
                ? `Schedule ${plannedInstances.length} sessions & Notify`
                : "Schedule & Notify"}
          </Button>
        </div>
      </div>

      {/* Form-mode segmented control + Take-a-tour link. Segmented
          control shows BOTH options so there's no "which mode am I in?"
          ambiguity — the filled one is current. */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card px-3 py-2">
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-muted-foreground">Form layout</span>
          <div
            className="inline-flex rounded-full border border-border bg-background p-0.5"
            data-tour="class-mode-toggle"
            data-mode={isAdvanced ? "advanced" : "simple"}
          >
            <button
              type="button"
              onClick={() => isAdvanced && toggleFormMode()}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                !isAdvanced
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted",
              )}
              title="Title, when, duration — and a one-line notify summary"
            >
              Simple
            </button>
            <button
              type="button"
              onClick={() => !isAdvanced && toggleFormMode()}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                isAdvanced
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted",
              )}
              title="Adds course-link, description, host, provider, recurrence, channel toggles"
            >
              Advanced
            </button>
          </div>
          <p className="hidden text-[11px] text-muted-foreground sm:block">
            {isAdvanced
              ? "Showing all fields — course, host, provider, repeats, channel toggles."
              : "Just the essentials. Switch to Advanced for the rest."}
          </p>
        </div>
        <TakeATourButton tourId="class-new-v1" label="Take a tour" />
      </div>

      {/* Product tour — replays via the Take-a-tour link above. */}
      <ProductTour tourId="class-new-v1" steps={NEW_CLASS_TOUR} />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Details */}
          <Card data-tour="class-details">
            <CardHeader>
              <CardTitle>Class details</CardTitle>
              <CardDescription>What is this session about?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Live Q&A — Hooks deep dive"
                />
              </div>

              {/* Course pick is now in Simple mode too — teachers told
                  us it was the most common reason to bounce into
                  Advanced just to attach a course to a class. Still
                  optional; leave blank for an instant ad-hoc class. */}
              <div className="space-y-2">
                <Label htmlFor="course">Course</Label>
                <Select value={courseId} onValueChange={setCourseId}>
                  <SelectTrigger id="course">
                    <SelectValue placeholder="Link to a course (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {courses.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Picking a course also unlocks the audience picker below.
                </p>
              </div>

              {courseId && (
                <div className="space-y-2">
                  <Label>Audience</Label>
                  <Select
                    value={audience}
                    onValueChange={(v) => setAudience(v as ClassAudience)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">
                        Everyone enrolled ({enrolledStudents.length})
                      </SelectItem>
                      <SelectItem value="selected">Specific students…</SelectItem>
                    </SelectContent>
                  </Select>
                  {audience === "selected" && (
                    <div className="max-h-48 space-y-1.5 overflow-y-auto rounded-md border border-border/60 p-2">
                      {enrolledStudents.length === 0 ? (
                        <p className="text-xs text-muted-foreground">
                          No students enrolled yet.
                        </p>
                      ) : (
                        enrolledStudents.map((s) => {
                          const checked = selectedStudentIds.includes(s.id)
                          return (
                            <label
                              key={s.id}
                              className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-muted/60"
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(e) =>
                                  setSelectedStudentIds((prev) =>
                                    e.target.checked
                                      ? [...prev, s.id]
                                      : prev.filter((id) => id !== s.id),
                                  )
                                }
                              />
                              <span className="truncate">{s.name}</span>
                              <span className="ml-auto truncate text-xs text-muted-foreground">
                                {s.email}
                              </span>
                            </label>
                          )
                        })
                      )}
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {targetStudents.length} student
                    {targetStudents.length === 1 ? "" : "s"} will receive the class invite when you schedule.
                  </p>
                </div>
              )}

              {isAdvanced && (
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="What students should prepare or expect…"
                    rows={3}
                  />
                </div>
              )}

              {/* Host picker — Advanced only, and only when the workspace
                  has more than one faculty member to pick from. */}
              {isAdvanced && (() => {
                const facultyPool = users.filter(
                  (u) => u.role === "admin" || u.role === "instructor",
                )
                if (facultyPool.length < 2) return null
                return (
                  <div className="space-y-2">
                    <Label htmlFor="host">Host</Label>
                    <Select value={hostUserId} onValueChange={setHostUserId}>
                      <SelectTrigger id="host">
                        <SelectValue placeholder="Pick a host" />
                      </SelectTrigger>
                      <SelectContent>
                        {facultyPool.map((u) => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.name}
                            {u.id === currentUser?.id ? " (you)" : ""}
                            {u.role === "admin" ? " · Admin" : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-[11px] text-muted-foreground">
                      Defaults to you. Switch when you&apos;re scheduling on someone
                      else&apos;s behalf — the email + WhatsApp reminders go out under their name.
                    </p>
                  </div>
                )
              })()}
            </CardContent>
          </Card>

          {/* Meeting link */}
          <Card data-tour="class-join">
            <CardHeader>
              <CardTitle>Where students join</CardTitle>
              <CardDescription>
                {isInHouse
                  ? "Default: students join straight from your portal — no external link, no Zoom account, no friction. Recording is automatic."
                  : "Paste the URL — provider is auto-detected. You can override below if needed."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isInHouse ? (
                <div className="space-y-3">
                  <div className="rounded-md border border-primary/30 bg-primary/[0.04] p-4 text-sm">
                    <p className="font-medium text-foreground">Your join link is ready</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Share this URL with students — anyone with it lands in the waiting room and
                      gets beamed into the class the moment you open the room.
                    </p>
                    <div className="mt-3 flex items-stretch gap-2">
                      <code className="flex-1 truncate rounded-md border border-border/60 bg-background px-3 py-2 font-mono text-xs">
                        {previewJoinUrl || "Generating link…"}
                      </code>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={!previewJoinUrl}
                        onClick={handleCopyLink}
                      >
                        <Copy className="mr-1.5 h-3.5 w-3.5" />
                        Copy
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={!previewJoinUrl}
                        onClick={handleOpenLink}
                      >
                        <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                        Open
                      </Button>
                    </div>
                    <p className="mt-3 text-[11px] text-muted-foreground">
                      Tip: hit <span className="font-medium text-foreground">Start instant class</span> at the top
                      to open the room right now, or <span className="font-medium text-foreground">Schedule &amp; Notify</span> below
                      to put it on the calendar and email enrolled students.
                    </p>
                  </div>

                  <div className="rounded-md border border-amber-500/30 bg-amber-50/40 p-4 text-sm dark:bg-amber-500/5">
                    <p className="font-medium text-foreground">How everyone joins</p>
                    <ul className="mt-2 space-y-1.5 text-xs text-muted-foreground">
                      <li>
                        <span className="font-medium text-foreground">You (instructor):</span> click{" "}
                        <span className="font-medium text-foreground">Start instant class</span> above —
                        or open the class detail page and hit{" "}
                        <span className="font-medium text-foreground">Host live room</span>. You join Jitsi as moderator.
                      </li>
                      <li>
                        <span className="font-medium text-foreground">Students:</span> open the join link.
                        First-time visitors are asked for their name once, then dropped straight into the room.
                        Works in any browser — no login required.
                      </li>
                      <li>
                        <span className="font-medium text-foreground">Recording:</span> click{" "}
                        <span className="font-medium text-foreground">Start recording</span> inside the host view.
                        The webm lands on the class detail page when you end the class.
                      </li>
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="url">Link *</Label>
                  <div className="relative">
                    <LinkIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="url"
                      value={meetingUrl}
                      onChange={(e) => setMeetingUrl(e.target.value)}
                      placeholder="https://meet.google.com/abc-defg-hij  or  https://zoom.us/j/123…"
                      className="pl-9"
                    />
                  </div>
                  {meetingUrl && !isValidUrl && (
                    <p className="text-xs text-destructive">That doesn&apos;t look like a valid URL.</p>
                  )}
                </div>
              )}
              {/* Provider picker + recording tips are Advanced-only. Simple
                  defaults to in-house (the auto-generated join URL block
                  above) — no provider decision required. */}
              {isAdvanced && (
                <div className="space-y-2">
                  <Label>Provider</Label>
                  <div className="flex flex-wrap gap-2">
                    {PROVIDER_OPTIONS.map((opt) => {
                      const isAuto = providerOverride === null && detectedProvider === opt.value
                      const isManual = providerOverride === opt.value
                      const active = isAuto || isManual
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() =>
                            setProviderOverride(isManual ? null : opt.value)
                          }
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm transition-colors",
                            active
                              ? "border-primary bg-primary/5 text-foreground"
                              : "border-border text-muted-foreground hover:bg-muted/50",
                          )}
                        >
                          <Video className="h-3.5 w-3.5" />
                          {opt.label}
                          {isAuto && (
                            <span className="ml-1 text-[10px] uppercase tracking-wide text-muted-foreground">auto</span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                  <div className="rounded-md border border-border/70 bg-muted/40 p-3 text-xs text-muted-foreground">
                    <p className="font-medium text-foreground">Record your class</p>
                    <p className="mt-1">
                      Most providers can record natively:
                    </p>
                    <ul className="mt-1 list-inside list-disc space-y-0.5">
                      <li><span className="font-medium text-foreground">Google Meet</span> — three-dot menu &rarr; Record meeting (Workspace plans).</li>
                      <li><span className="font-medium text-foreground">Zoom</span> — Record button in the host toolbar (local or cloud).</li>
                      <li><span className="font-medium text-foreground">Microsoft Teams</span> — More actions &rarr; Start recording (auto-saved to OneDrive).</li>
                      <li>Standalone: <span className="font-medium text-foreground">OBS Studio</span>, <span className="font-medium text-foreground">Loom</span>, <span className="font-medium text-foreground">Riverside</span>, <span className="font-medium text-foreground">QuickTime</span> (Mac).</li>
                    </ul>
                    <p className="mt-2">
                      After the class, paste the recording URL on the class detail page (Recording field) so students can rewatch.
                    </p>
                  </div>
                </div>
              )}
              <div className="grid gap-4 sm:grid-cols-2" data-tour="class-when">
                <div className="space-y-2">
                  <Label htmlFor="when">Date &amp; time *</Label>
                  <Input
                    id="when"
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dur">Duration (minutes) *</Label>
                  <Input
                    id="dur"
                    type="number"
                    min={5}
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Repeats — Advanced only. Defaults to "Doesn't repeat" so
              Simple mode always schedules a single one-off class. */}
          {isAdvanced && (
          <Card data-tour="class-repeats">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Repeat className="h-4 w-4 text-primary" />
                Repeats
              </CardTitle>
              <CardDescription>
                Schedule a one-off class or a recurring series. Same meeting link is reused for every instance.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="repeat">Cadence</Label>
                <Select value={repeatPreset} onValueChange={(v) => setRepeatPreset(v as RepeatPreset)}>
                  <SelectTrigger id="repeat">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {REPEAT_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {repeatPreset === "custom" && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="custom-int">Every N days</Label>
                    <Input
                      id="custom-int"
                      type="number"
                      min={1}
                      max={60}
                      value={customInterval}
                      onChange={(e) => setCustomInterval(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {isRecurring && (
                <div className="rounded-md border border-border/60 bg-muted/30 p-3">
                  <Label className="mb-2 block text-xs uppercase tracking-wide text-muted-foreground">
                    Ends
                  </Label>
                  <div className="flex flex-wrap items-center gap-3">
                    <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
                      <input
                        type="radio"
                        checked={endMode === "count"}
                        onChange={() => setEndMode("count")}
                      />
                      After
                      <Input
                        type="number"
                        min={1}
                        max={200}
                        value={endCount}
                        onChange={(e) => setEndCount(e.target.value)}
                        onFocus={() => setEndMode("count")}
                        className="h-8 w-20"
                      />
                      <span className="text-muted-foreground">sessions</span>
                    </label>
                    <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
                      <input
                        type="radio"
                        checked={endMode === "until"}
                        onChange={() => setEndMode("until")}
                      />
                      On
                      <Input
                        type="date"
                        value={endUntil}
                        onChange={(e) => setEndUntil(e.target.value)}
                        onFocus={() => setEndMode("until")}
                        className="h-8 w-44"
                      />
                    </label>
                  </div>
                  <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                    <CalendarRange className="h-3 w-3" />
                    {plannedInstances.length} session{plannedInstances.length === 1 ? "" : "s"} will be created
                    {plannedInstances.length > 1 && (
                      <>
                        {" — "}
                        first {new Date(plannedInstances[0].scheduledAt).toLocaleDateString()}, last{" "}
                        {new Date(plannedInstances[plannedInstances.length - 1].scheduledAt).toLocaleDateString()}.
                      </>
                    )}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
          )}
        </div>

        {/* Notifications panel */}
        <div className="space-y-6">
          <Card data-tour="class-notify">
            <CardHeader>
              <CardTitle>Notify students</CardTitle>
              <CardDescription>
                When you schedule, we send invites across the channels you pick.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Simple mode: one-line summary of what'll fire, no
                  decisions. Defaults are all-on so the simplest path is
                  also the most-reach. Advanced re-exposes the 3 toggles. */}
              {!isAdvanced ? (
                <div className="rounded-md border border-border/60 bg-muted/30 p-3 text-xs text-muted-foreground">
                  <p>
                    <span className="font-medium text-foreground">{enrolledStudents.length} student{enrolledStudents.length === 1 ? "" : "s"}</span>{" "}
                    will be notified via{" "}
                    <span className="font-medium text-foreground">
                      {[
                        notifyInApp && "In-app",
                        notifyEmail && "Email",
                        notifyWhatsApp && "WhatsApp",
                      ].filter(Boolean).join(" · ") || "no channel"}
                    </span>.
                  </p>
                  <p className="mt-1 text-[11px]">
                    Switch to <span className="font-medium text-foreground">Advanced</span> mode at the top to pick channels.
                  </p>
                </div>
              ) : (
                <>
                  <ChannelRow
                    icon={<CheckCircle2 className="h-4 w-4 text-primary" />}
                    title="In-app"
                    detail={`${enrolledStudents.length} student${enrolledStudents.length === 1 ? "" : "s"} will see a bell notification.`}
                    checked={notifyInApp}
                    onChange={setNotifyInApp}
                  />
                  <ChannelRow
                    icon={<Mail className="h-4 w-4 text-primary" />}
                    title="Email"
                    detail={
                      recipientsWithEmail === enrolledStudents.length
                        ? `Will go to ${recipientsWithEmail} student${recipientsWithEmail === 1 ? "" : "s"}.`
                        : `${recipientsWithEmail} of ${enrolledStudents.length} students have an email on file.`
                    }
                    checked={notifyEmail}
                    onChange={setNotifyEmail}
                  />
                  <ChannelRow
                    icon={<MessageSquare className="h-4 w-4 text-primary" />}
                    title="WhatsApp"
                    detail={
                      recipientsWithPhone === 0
                        ? "No students have a phone number on file."
                        : `${recipientsWithPhone} of ${enrolledStudents.length} students have a phone number on file.`
                    }
                    checked={notifyWhatsApp}
                    onChange={setNotifyWhatsApp}
                  />
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <SummaryRow label="Provider" value={providerLabel(provider)} />
              <SummaryRow label="Duration" value={`${duration || 0} min`} />
              <SummaryRow label="Repeats" value={recurrenceLabel} />
              {isRecurring && (
                <SummaryRow label="Sessions" value={`${plannedInstances.length}`} />
              )}
              <SummaryRow label="Students" value={`${enrolledStudents.length}`} />
              <SummaryRow
                label="Channels"
                value={[
                  notifyInApp && "in-app",
                  notifyEmail && "email",
                  notifyWhatsApp && "whatsapp",
                ].filter(Boolean).join(", ") || "none"}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function ChannelRow({
  icon,
  title,
  detail,
  checked,
  onChange,
  hint,
}: {
  icon: React.ReactNode
  title: string
  detail: string
  checked: boolean
  onChange: (v: boolean) => void
  hint?: string
}) {
  return (
    <div className="rounded-md border border-border/60 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <div className="mt-0.5">{icon}</div>
          <div>
            <p className="text-sm font-medium">{title}</p>
            <p className="text-xs text-muted-foreground">{detail}</p>
            {hint && <p className="mt-1 text-[10px] text-muted-foreground">{hint}</p>}
          </div>
        </div>
        <Switch checked={checked} onCheckedChange={onChange} />
      </div>
    </div>
  )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  )
}
