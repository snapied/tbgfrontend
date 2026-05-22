"use client"

// "Everything good before you go live?" panel that replaces the host
// page's static prep checklist. Five live checks:
//
//   1. Signed in            — backend recognises the host. The exact
//                             check the silent-401 lobby bug bypassed.
//   2. Camera tested        — getUserMedia returns a video track.
//   3. Mic tested           — getUserMedia returns an audio track.
//   4. Recording ready      — MediaRecorder API is available in this
//                             browser (Safari < 14.1 ships without it).
//   5. Students enrolled    — N students enrolled in the parent course.
//                             Proxy for "people who will join" — we
//                             don't have a per-room waiting counter yet.
//
// The camera + mic checks are gated behind a "Test" button click so we
// don't prompt for permissions on page load (annoying, and the host
// might be reviewing the page before they're ready to grant). The
// permissions API is queried passively on mount so the row reflects
// the cached grant state — denied/granted/prompt — without firing the
// browser permission dialog.

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import {
  AlertCircle,
  Camera,
  CheckCircle2,
  CircleDashed,
  Loader2,
  Mic,
  ShieldCheck,
  Users,
  Video,
  XCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

type CheckStatus = "ok" | "warn" | "fail" | "checking" | "idle"

interface Props {
  /** Backend recognises the host. Null = probe in flight. */
  backendAuthed: boolean | null
  /** Students currently enrolled in the parent course. */
  enrolledCount: number
}

export function PreflightChecklist({ backendAuthed, enrolledCount }: Props) {
  // Camera + mic permission state. "idle" = not yet checked at all;
  // "ok"/"fail" = we have a confirmed answer; "checking" = active probe.
  const [camStatus, setCamStatus] = useState<CheckStatus>("idle")
  const [micStatus, setMicStatus] = useState<CheckStatus>("idle")
  const [camError, setCamError] = useState<string | null>(null)
  const [micError, setMicError] = useState<string | null>(null)

  // Passive permission query — no prompt. Lets us pre-populate the row
  // as "ok" if the user already granted permission previously, so they
  // don't have to click Test just to confirm yesterday's grant.
  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.permissions) return
    let cancelled = false
    const queryOne = async (
      name: "camera" | "microphone",
      setter: (s: CheckStatus) => void,
    ) => {
      try {
        // The TypeScript DOM lib hasn't caught up to "camera"/"microphone"
        // as PermissionName values in every release, so we cast through
        // unknown to keep the call valid in older targets.
        const status = await navigator.permissions.query({
          name: name as unknown as PermissionName,
        })
        if (cancelled) return
        if (status.state === "granted") setter("ok")
        // "denied"/"prompt" — leave as "idle" so the row stays neutral
        // until the user actually clicks Test; we don't want to flag
        // "fail" just because they haven't granted yet.
      } catch {
        // Firefox throws on querying "camera"/"microphone" in some
        // versions — silently fall back to the manual-test flow.
      }
    }
    void queryOne("camera", setCamStatus)
    void queryOne("microphone", setMicStatus)
    return () => {
      cancelled = true
    }
  }, [])

  const testCamera = useCallback(async () => {
    setCamStatus("checking")
    setCamError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      // Immediately stop all tracks — we only wanted to confirm access;
      // leaving the stream open would burn battery and trip the
      // "camera in use" indicator unnecessarily.
      stream.getTracks().forEach((t) => t.stop())
      setCamStatus("ok")
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setCamError(humanizeMediaError(msg))
      setCamStatus("fail")
    }
  }, [])

  const testMic = useCallback(async () => {
    setMicStatus("checking")
    setMicError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.getTracks().forEach((t) => t.stop())
      setMicStatus("ok")
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setMicError(humanizeMediaError(msg))
      setMicStatus("fail")
    }
  }, [])

  // Recording is "ready" when the browser supports MediaRecorder. No
  // permissions to test — just feature detect. We don't currently
  // plan-gate recording in the host UI, so no plan check here either.
  const recordingStatus: CheckStatus =
    typeof window === "undefined"
      ? "checking"
      : typeof window.MediaRecorder === "function"
        ? "ok"
        : "fail"

  const authStatus: CheckStatus =
    backendAuthed === null ? "checking" : backendAuthed ? "ok" : "fail"

  const enrolledStatus: CheckStatus =
    enrolledCount > 0 ? "ok" : "warn"

  // Overall "everything good?" rolls up to fail if anything's failed,
  // warn if any unchecked, ok if all green. Drives the colour of the
  // top-line summary chip.
  const overall: CheckStatus = (() => {
    const list: CheckStatus[] = [
      authStatus,
      camStatus,
      micStatus,
      recordingStatus,
      enrolledStatus,
    ]
    if (list.includes("fail")) return "fail"
    if (list.includes("checking")) return "checking"
    if (list.includes("idle") || list.includes("warn")) return "warn"
    return "ok"
  })()

  return (
    <Card>
      <CardContent className="space-y-3 p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Pre-class check
            </p>
            <p className="mt-0.5 text-sm">
              {overall === "ok" && "Everything looks good — you're set to go live."}
              {overall === "warn" && "Almost there — finish the checks below before students arrive."}
              {overall === "fail" && "Something's not right. Fix the items below or students may get stuck in the lobby."}
              {overall === "checking" && "Running checks…"}
            </p>
          </div>
          <SummaryPill status={overall} />
        </div>

        <ul className="divide-y divide-border/60 rounded-lg border border-border/60">
          <ChecklistRow
            icon={<ShieldCheck className="h-4 w-4" />}
            status={authStatus}
            label="Signed in"
            detail={
              authStatus === "fail"
                ? "Backend doesn't recognise you — students won't be admitted."
                : authStatus === "ok"
                  ? "Backend session is fresh."
                  : "Probing your session…"
            }
            action={
              authStatus === "fail" ? (
                <Button asChild size="sm" variant="outline" className="h-7 text-xs">
                  <Link href="/login">Sign in</Link>
                </Button>
              ) : null
            }
          />
          <ChecklistRow
            icon={<Camera className="h-4 w-4" />}
            status={camStatus}
            label="Camera"
            detail={
              camStatus === "ok"
                ? "Camera permission granted."
                : camStatus === "fail"
                  ? camError ?? "Couldn't access the camera."
                  : camStatus === "checking"
                    ? "Testing camera…"
                    : "Not tested yet."
            }
            action={
              camStatus === "checking" ? null : (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={testCamera}
                >
                  {camStatus === "ok" ? "Re-test" : "Test camera"}
                </Button>
              )
            }
          />
          <ChecklistRow
            icon={<Mic className="h-4 w-4" />}
            status={micStatus}
            label="Microphone"
            detail={
              micStatus === "ok"
                ? "Mic permission granted."
                : micStatus === "fail"
                  ? micError ?? "Couldn't access the microphone."
                  : micStatus === "checking"
                    ? "Testing microphone…"
                    : "Not tested yet."
            }
            action={
              micStatus === "checking" ? null : (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={testMic}
                >
                  {micStatus === "ok" ? "Re-test" : "Test mic"}
                </Button>
              )
            }
          />
          <ChecklistRow
            icon={<Video className="h-4 w-4" />}
            status={recordingStatus}
            label="Recording"
            detail={
              recordingStatus === "ok"
                ? "Browser supports MediaRecorder."
                : "Your browser doesn't support MediaRecorder. Recording will fail — switch to Chrome / Edge / Safari 14.1+."
            }
          />
          <ChecklistRow
            icon={<Users className="h-4 w-4" />}
            status={enrolledStatus}
            label="Audience"
            detail={
              enrolledCount === 0
                ? "No students enrolled in this course yet — opening the room won't admit anyone."
                : `${enrolledCount} student${enrolledCount === 1 ? "" : "s"} enrolled in the course.`
            }
          />
        </ul>
      </CardContent>
    </Card>
  )
}

function ChecklistRow({
  icon,
  status,
  label,
  detail,
  action,
}: {
  icon: React.ReactNode
  status: CheckStatus
  label: string
  detail: string
  action?: React.ReactNode
}) {
  return (
    <li className="flex items-center gap-3 px-3 py-2.5">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted/60 text-muted-foreground">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 text-sm font-medium">
          <StatusIcon status={status} />
          {label}
        </p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">{detail}</p>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </li>
  )
}

function StatusIcon({ status }: { status: CheckStatus }) {
  if (status === "ok") {
    return <CheckCircle2 className="h-4 w-4 text-success" aria-label="OK" />
  }
  if (status === "fail") {
    return <XCircle className="h-4 w-4 text-destructive" aria-label="Fail" />
  }
  if (status === "warn") {
    return <AlertCircle className="h-4 w-4 text-amber-500" aria-label="Warning" />
  }
  if (status === "checking") {
    return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-label="Checking" />
  }
  return <CircleDashed className="h-4 w-4 text-muted-foreground" aria-label="Not tested" />
}

function SummaryPill({ status }: { status: CheckStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold",
        status === "ok" && "bg-success/10 text-success",
        status === "warn" && "bg-amber-500/10 text-amber-600 dark:text-amber-400",
        status === "fail" && "bg-destructive/10 text-destructive",
        status === "checking" && "bg-muted text-muted-foreground",
      )}
    >
      <StatusIcon status={status} />
      {status === "ok" && "Ready"}
      {status === "warn" && "Almost ready"}
      {status === "fail" && "Needs attention"}
      {status === "checking" && "Checking"}
    </span>
  )
}

// getUserMedia rejects with DOMException names like "NotAllowedError",
// "NotFoundError", etc. Translate the common ones into a sentence the
// host can act on. Falls back to the raw message for unknown cases.
function humanizeMediaError(msg: string): string {
  if (/NotAllowedError|Permission/i.test(msg)) {
    return "Permission denied. Click the camera icon in the address bar to re-enable, then re-test."
  }
  if (/NotFoundError|DevicesNotFound/i.test(msg)) {
    return "No device found. Plug one in (or pick a different one in your system settings) and re-test."
  }
  if (/NotReadable|TrackStart/i.test(msg)) {
    return "Device is in use by another app. Close Zoom / Meet / etc. and re-test."
  }
  if (/SecurityError/i.test(msg)) {
    return "Browser blocked the request — this can happen on http:// pages. Use https or localhost."
  }
  return msg
}
