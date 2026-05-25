"use client"

// Inline AV preflight strip for the student waiting room.
//
// Why this exists separately from <StudentPreflight />: the modal
// shoves a full-screen wizard in the student's face on first visit
// before they've even seen what they came for. This strip lives
// inline in the waiting-room hero, runs the same browser probes
// (camera + mic + permissions) silently, and surfaces 🟢/🟡/🔴
// status without blocking anything.
//
// The "Run a full setup check" button still opens the existing modal
// for cases where the strip reports trouble — keeps a single source
// of truth for the deep AV wizard while making the routine case
// frictionless.

import { useEffect, useState } from "react"
import { Camera, Mic, Wifi } from "lucide-react"
import { hasFreshPreflight, markPreflightFresh } from "@/components/classes/student-preflight"

type Status = "checking" | "ok" | "warn" | "fail"

interface Probe {
  camera: Status
  mic: Status
  network: Status
}

const INITIAL: Probe = { camera: "checking", mic: "checking", network: "checking" }

export function StudentPreflightInline({
  onOpenFullCheck,
}: {
  onOpenFullCheck: () => void
}) {
  const [probe, setProbe] = useState<Probe>(INITIAL)

  useEffect(() => {
    // If the student already passed the deep check in the last 7d,
    // we still want the strip to *render* with optimistic green
    // status so they see "all good" reassurance. Skip the probe so
    // we don't ask for camera permission again.
    if (hasFreshPreflight()) {
      setProbe({ camera: "ok", mic: "ok", network: "ok" })
      return
    }

    let cancelled = false
    let stream: MediaStream | null = null
    const ac: AbortController = new AbortController()

    async function run() {
      // Camera + mic — single getUserMedia call probes both. Resolved
      // status keys off track presence, not permission alone, so a
      // user with "allow but unplugged" reads as warn not ok.
      if (!navigator?.mediaDevices?.getUserMedia) {
        if (!cancelled) setProbe((p) => ({ ...p, camera: "fail", mic: "fail" }))
      } else {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true })
          if (cancelled) return
          const hasVideo = stream.getVideoTracks().length > 0 && stream.getVideoTracks()[0]?.readyState === "live"
          const hasAudio = stream.getAudioTracks().length > 0 && stream.getAudioTracks()[0]?.readyState === "live"
          setProbe((p) => ({
            ...p,
            camera: hasVideo ? "ok" : "warn",
            mic: hasAudio ? "ok" : "warn",
          }))
          // Mark fresh — same 7d gate the modal uses, so a student
          // who's run the inline check doesn't get the modal pushed
          // at them on subsequent classes either.
          if (hasVideo && hasAudio) markPreflightFresh()
        } catch {
          if (!cancelled) {
            setProbe((p) => ({ ...p, camera: "fail", mic: "fail" }))
          }
        } finally {
          // Release the camera immediately — we've measured, we're
          // done. The light goes off.
          if (stream) stream.getTracks().forEach((t) => t.stop())
        }
      }

      // Network — a cheap RTT probe to our own origin. Anything
      // under 200ms → ok, 200-500ms → warn, > 500ms or fail → fail.
      // Better than a true bandwidth test (which would burn data
      // and time) for a quick "is your link any good" signal.
      try {
        const t0 = performance.now()
        await fetch(`${window.location.origin}/favicon.ico`, {
          method: "HEAD",
          cache: "no-store",
          signal: ac.signal,
        })
        if (cancelled) return
        const rtt = performance.now() - t0
        setProbe((p) => ({
          ...p,
          network: rtt < 200 ? "ok" : rtt < 500 ? "warn" : "fail",
        }))
      } catch {
        if (!cancelled) setProbe((p) => ({ ...p, network: "fail" }))
      }
    }
    void run()

    return () => {
      cancelled = true
      ac.abort()
      if (stream) stream.getTracks().forEach((t) => t.stop())
    }
  }, [])

  const overall: Status = [probe.camera, probe.mic, probe.network].reduce<Status>((acc, s) => {
    const rank = (x: Status) => (x === "fail" ? 3 : x === "warn" ? 2 : x === "checking" ? 1 : 0)
    return rank(s) > rank(acc) ? s : acc
  }, "ok")
  const headline = (() => {
    if (overall === "ok") return "You're set — mic, camera, and network look good."
    if (overall === "warn") return "Almost ready — one thing to double-check."
    if (overall === "fail") return "Setup looks shaky — fix this before class starts."
    return "Checking your setup…"
  })()

  return (
    <div
      className={`rounded-2xl border px-4 py-3 backdrop-blur-sm ${
        overall === "ok"
          ? "border-success/30 bg-success/[0.05]"
          : overall === "warn"
            ? "border-amber-500/40 bg-amber-500/[0.06]"
            : overall === "fail"
              ? "border-destructive/40 bg-destructive/[0.06]"
              : "border-border bg-card/60"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="min-w-0 flex-1 text-sm font-medium">{headline}</p>
        <button
          type="button"
          onClick={onOpenFullCheck}
          className="shrink-0 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-semibold transition-colors hover:border-primary/40 hover:text-primary"
        >
          Run a full setup check
        </button>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px]">
        <ProbeChip icon={<Camera className="h-3 w-3" />} label="Camera" status={probe.camera} />
        <ProbeChip icon={<Mic className="h-3 w-3" />} label="Mic" status={probe.mic} />
        <ProbeChip icon={<Wifi className="h-3 w-3" />} label="Network" status={probe.network} />
      </div>
    </div>
  )
}

function ProbeChip({
  icon,
  label,
  status,
}: {
  icon: React.ReactNode
  label: string
  status: Status
}) {
  const dot =
    status === "ok"
      ? "bg-success"
      : status === "warn"
        ? "bg-amber-500"
        : status === "fail"
          ? "bg-destructive"
          : "bg-muted-foreground/40 animate-pulse"
  const text =
    status === "ok"
      ? "OK"
      : status === "warn"
        ? "Check it"
        : status === "fail"
          ? "Trouble"
          : "Checking…"
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/80 px-2 py-0.5">
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {icon}
      <span className="font-semibold">{label}</span>
      <span className="text-muted-foreground">· {text}</span>
    </span>
  )
}
