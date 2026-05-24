"use client"

// StudentPreflight — quick device check students run before joining
// a live class. Catches three things that ruin classes:
//
//   • Camera blocked / unplugged / wrong device picked
//   • Mic blocked / wrong device / muted at OS level
//   • Speaker output too quiet to hear the teacher
//
// We deliberately keep it lean — no internet-speed test (too noisy),
// no LiveKit room handshake (would require a real token, defeating
// the "before joining" purpose). Just the three media checks via
// browser APIs the user can fix in 30 seconds.
//
// State machine per device:
//   idle → testing → ok | failed | skipped
//
// Once all three are green (or explicitly skipped), the parent's
// onComplete fires. Closing without completing fires onSkip.

import { useEffect, useRef, useState } from "react"
import {
  AlertCircle,
  Camera,
  CameraOff,
  Check,
  Loader2,
  Mic,
  MicOff,
  Volume2,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type CheckStatus = "idle" | "testing" | "ok" | "failed" | "skipped"

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  /** Fires when the user clicks Join (after passing or skipping the
   *  checks). Caller decides what "join" means — usually closes the
   *  preflight and proceeds to the LiveKit room mount. */
  onJoin: () => void
}

// Sprint A Classes #2 — persist a "preflight passed within 7d" stamp
// so returning students aren't asked to re-test their AV every class.
// We key the stamp on a stable browser-scoped flag rather than per-
// user because devices change less often than user identity in
// shared-device contexts (siblings sharing a laptop).
const PREFLIGHT_VERIFIED_KEY = "thebigclass.preflight.verifiedAt.v1"
const PREFLIGHT_VALID_WINDOW_MS = 7 * 24 * 60 * 60 * 1000
function readPreflightVerified(): number | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.localStorage.getItem(PREFLIGHT_VERIFIED_KEY)
    if (!raw) return null
    const n = Number(raw)
    if (!Number.isFinite(n)) return null
    if (Date.now() - n > PREFLIGHT_VALID_WINDOW_MS) return null
    return n
  } catch {
    return null
  }
}
function stampPreflightVerified(): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(PREFLIGHT_VERIFIED_KEY, String(Date.now()))
  } catch {
    /* private browsing — best-effort */
  }
}

/** Returns true when the visitor has run a successful preflight in
 *  the last 7 days. Consumers can use this to skip auto-prompting
 *  the AV wizard on every class. The user can still open it
 *  manually from the waiting room. */
export function hasFreshPreflight(): boolean {
  return readPreflightVerified() !== null
}

export function StudentPreflight({ open, onOpenChange, onJoin }: Props) {
  const [cameraStatus, setCameraStatus] = useState<CheckStatus>("idle")
  const [micStatus, setMicStatus] = useState<CheckStatus>("idle")
  const [speakerStatus, setSpeakerStatus] = useState<CheckStatus>("idle")
  // mic level (0..1) so the UI shows a live VU meter while testing
  const [micLevel, setMicLevel] = useState(0)
  const videoRef = useRef<HTMLVideoElement>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const streamsRef = useRef<MediaStream[]>([])
  const speakerAudioRef = useRef<HTMLAudioElement>(null)

  // Tear down any active media streams when the dialog closes so we
  // don't leave the user's camera light on after they bail.
  useEffect(() => {
    if (open) return
    for (const s of streamsRef.current) {
      s.getTracks().forEach((t) => t.stop())
    }
    streamsRef.current = []
    audioCtxRef.current?.close().catch(() => undefined)
    audioCtxRef.current = null
    setCameraStatus("idle")
    setMicStatus("idle")
    setSpeakerStatus("idle")
    setMicLevel(0)
  }, [open])

  const testCamera = async () => {
    setCameraStatus("testing")
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      streamsRef.current.push(stream)
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play().catch(() => {})
      }
      setCameraStatus("ok")
    } catch {
      setCameraStatus("failed")
    }
  }

  const testMic = async () => {
    setMicStatus("testing")
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamsRef.current.push(stream)
      // Build a tiny WebAudio analyser to sample input level. We
      // run rAF for ~3 seconds, watching for at least one above-
      // threshold sample. Pass = "the mic produced sound louder
      // than ambient at some point during the test."
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext
      const ctx = new AC()
      audioCtxRef.current = ctx
      const source = ctx.createMediaStreamSource(stream)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 256
      source.connect(analyser)
      const buf = new Uint8Array(analyser.frequencyBinCount)
      const start = Date.now()
      let peak = 0
      const tick = () => {
        analyser.getByteFrequencyData(buf)
        const avg = buf.reduce((acc, v) => acc + v, 0) / buf.length
        const normalized = avg / 255
        if (normalized > peak) peak = normalized
        setMicLevel(normalized)
        if (Date.now() - start < 3500) {
          requestAnimationFrame(tick)
        } else {
          setMicStatus(peak > 0.04 ? "ok" : "failed")
          setMicLevel(0)
        }
      }
      requestAnimationFrame(tick)
    } catch {
      setMicStatus("failed")
    }
  }

  const testSpeaker = async () => {
    setSpeakerStatus("testing")
    const audio = speakerAudioRef.current
    if (!audio) {
      setSpeakerStatus("failed")
      return
    }
    try {
      audio.currentTime = 0
      await audio.play()
      // Mark "ok" once playback starts — we can't programmatically
      // verify the user actually heard it, but autoplay succeeding
      // means the output device is wired and unmuted at the OS
      // level. We expose a manual override below ("I couldn't hear
      // it") so a deaf-or-muted-speaker edge case can still mark
      // failed.
      audio.addEventListener(
        "ended",
        () => {
          // Bumps to ok once playback completes — user got the chime.
          setSpeakerStatus((s) => (s === "testing" ? "ok" : s))
        },
        { once: true },
      )
    } catch {
      setSpeakerStatus("failed")
    }
  }

  const allChecked =
    cameraStatus !== "idle" && micStatus !== "idle" && speakerStatus !== "idle"
  const anyFailed =
    cameraStatus === "failed" || micStatus === "failed" || speakerStatus === "failed"

  const handleSkip = () => {
    setCameraStatus((s) => (s === "idle" ? "skipped" : s))
    setMicStatus((s) => (s === "idle" ? "skipped" : s))
    setSpeakerStatus((s) => (s === "idle" ? "skipped" : s))
    onJoin()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Quick setup check</DialogTitle>
          <DialogDescription>
            Make sure your teacher can see + hear you before you
            join. Takes about 30 seconds.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <CheckRow
            icon={<Camera className="h-4 w-4" />}
            failIcon={<CameraOff className="h-4 w-4" />}
            title="Camera"
            description={
              cameraStatus === "ok"
                ? "Looking good — you should see yourself in the preview below."
                : cameraStatus === "failed"
                  ? "Couldn't access the camera. Check the browser's permission prompt + that no other app (Zoom, Meet) is using it."
                  : "Click to test — the preview will show you what your camera sees."
            }
            status={cameraStatus}
            onTest={testCamera}
          />
          {cameraStatus !== "idle" && (
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="aspect-video w-full rounded-md bg-black"
            />
          )}
          <CheckRow
            icon={<Mic className="h-4 w-4" />}
            failIcon={<MicOff className="h-4 w-4" />}
            title="Microphone"
            description={
              micStatus === "ok"
                ? "Heard you — your teacher will too."
                : micStatus === "failed"
                  ? "We didn't pick up any sound. Check the mic isn't muted at the OS level + that the right device is selected in your browser."
                  : "Click to test — say something for 3 seconds while it listens."
            }
            status={micStatus}
            onTest={testMic}
          />
          {micStatus === "testing" && (
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-primary transition-[width] duration-75"
                style={{ width: `${Math.min(100, Math.round(micLevel * 100 * 2))}%` }}
              />
            </div>
          )}
          <CheckRow
            icon={<Volume2 className="h-4 w-4" />}
            failIcon={<AlertCircle className="h-4 w-4" />}
            title="Speakers"
            description={
              speakerStatus === "ok"
                ? "Playback worked — the chime made it through."
                : speakerStatus === "failed"
                  ? "Couldn't play the chime. Unmute your output device or pick a different one."
                  : "Click to play a short chime. If you don't hear it, mark below."
            }
            status={speakerStatus}
            onTest={testSpeaker}
          />
          {/* Built-in test chime — tiny base64 WAV (440Hz, 0.4s).
              Inline so no asset request, no CDN dependency. */}
          <audio
            ref={speakerAudioRef}
            preload="auto"
            src="data:audio/wav;base64,UklGRiQEAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAEAAAAAAACAAUACAAJAAoACgAJAAcABAACAP3/+v/3//T/8v/x//D/8f/y//T/+P/8/wAABQAJAA0AEAARABEAEAANAAkABAD///r/9P/v/+v/6P/n/+f/6f/t//L/+P/+/wQACQANABAAEgASABAADAAGAAAA+v/0/+7/6f/m/+T/4//l/+j/7P/y//j///8GAAsAEAATABMAEgAOAAcAAQD7//T/7//q/+f/5P/k/+X/6P/s//L/+P///wYACwAQABMAEwASAA4ABwAAAPv/9P/v/+r/5//k/+T/5f/o/+z/8v/4//7/BgALABAAEwATABIADgAHAAAA+//0/+//6v/n/+T/5P/l/+j/7P/y//j///8GAAsAEAATABMAEgAOAAcAAAD7//T/7//q/+f/5P/k/+X/6P/s//L/+P///wYACwAQABMAEwASAA4ABwAAAPv/9P/v/+r/5//k/+T/5f/o/+z/8v/4//7/BgALABAAEwATABIADgAHAAAA+//0/+//6v/n/+T/5P/l/+j/7P/y//j///8GAAsAEAATABMAEgAOAAcAAAD7//T/7//q/+f/5P/k/+X/6P/s//L/+P///wYACwAQABMAEwASAA4ABwAAAPv/9P/v/+r/5//k/+T/5f/o/+z/8v/4//7/BgALABAAEwATABIADgAHAAAA+//0/+//6v/n/+T/5P/l/+j/7P/y//j///8GAAsAEAATABMAEgAOAAcAAAD7//T/7//q/+f/5P/k/+X/6P/s//L/+P///wYACwAQABMAEwASAA4ABwAAAPv/9P/v/+r/5//k/+T/5f/o/+z/8v/4//7/BgALABAAEwATABIADgAHAAAA+//0/+//6v/n/+T/5P/l/+j/7P/y//j///8GAAsAEAATABMAEgAOAAcAAAD7//T/7//q/+f/5P/k/+X/6P/s//L/+P///wYACwAQABMAEwASAA4ABwAAAPv/9P/v/+r/5//k/+T/5f/o/+z/8v/4//7/BgALABAAEwATABIADgAHAAAA+//0/+//6v/n/+T/5P/l/+j/7P/y//j///8GAAsAEAATABMAEgAOAAcAAAD7//T/7//q/+f/5P/k/+X/6P/s//L/+P///wYACwAQABMAEwASAA4ABwAAAPv/9P/v/+r/5//k/+T/5f/o/+z/8v/4//7/BgALABAAEwATABIADgAHAAAA+//0/+//6v/n/+T/5P/l/+j/7P/y//j///8GAAsAEAATABMAEgAOAAcAAAD7//T/7//q/+f/5P/k/+X/6P/s//L/+P///wYA"
          />
          {speakerStatus === "ok" && (
            <button
              type="button"
              onClick={() => setSpeakerStatus("failed")}
              className="text-[11px] text-muted-foreground underline-offset-2 hover:underline"
            >
              I couldn&rsquo;t hear it
            </button>
          )}
        </div>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="ghost" onClick={handleSkip}>
            Skip checks &amp; join
          </Button>
          <Button
            onClick={() => {
              // Sprint A Classes #2 — stamp the verified marker only
              // when all three checks ran green (no failures, no
              // skips). The waiting room can then auto-skip the
              // prompt for 7 days. Failed/skipped runs don't stamp
              // because we want to keep nagging the visitor whose
              // setup is broken.
              if (
                allChecked &&
                !anyFailed &&
                cameraStatus === "ok" &&
                micStatus === "ok" &&
                speakerStatus === "ok"
              ) {
                stampPreflightVerified()
              }
              onJoin()
            }}
            disabled={!allChecked}
          >
            {allChecked && !anyFailed
              ? "Looks good — join class"
              : allChecked
                ? "Join anyway"
                : "Run all 3 checks"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function CheckRow({
  icon,
  failIcon,
  title,
  description,
  status,
  onTest,
}: {
  icon: React.ReactNode
  failIcon: React.ReactNode
  title: string
  description: string
  status: CheckStatus
  onTest: () => void
}) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-md border p-3",
        status === "ok" && "border-success/40 bg-success/5",
        status === "failed" && "border-destructive/40 bg-destructive/5",
        status === "testing" && "border-primary/40 bg-primary/5",
        (status === "idle" || status === "skipped") && "border-border bg-card",
      )}
    >
      <span
        className={cn(
          "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
          status === "ok" && "bg-success/15 text-success",
          status === "failed" && "bg-destructive/15 text-destructive",
          status === "testing" && "bg-primary/15 text-primary",
          (status === "idle" || status === "skipped") &&
            "bg-muted text-muted-foreground",
        )}
      >
        {status === "ok" ? (
          <Check className="h-4 w-4" />
        ) : status === "testing" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : status === "failed" ? (
          failIcon
        ) : (
          icon
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-[11px] text-muted-foreground">{description}</p>
      </div>
      {status !== "ok" && status !== "testing" && (
        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={onTest}>
          {status === "failed" ? "Retry" : "Test"}
        </Button>
      )}
    </div>
  )
}
