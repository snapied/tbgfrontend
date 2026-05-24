"use client"

// Inline video-player dialog for recording playback.
//
// Used on the post-class wrap screen + anywhere else we want to surface a
// class recording. Handles three URL shapes:
//
//   - Direct file URLs (.mp4 / .webm / R2 CDN, etc.) → native <video> tag.
//   - Embeddable providers (YouTube, Loom, Vimeo, Wistia, ...) → iframe via
//     the same videoEmbedUrl helper the recap editor uses.
//   - Anything else → falls back to a plain "Open in new tab" link.

import { useEffect, useRef, useState } from "react"
import { ExternalLink, Play, RotateCcw } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { detectVideoProvider, videoEmbedUrl } from "@/lib/lesson-utils"
import {
  getProgress,
  setProgress,
  clearProgress,
  COMPLETION_RATIO,
  type RecordingProgressEntry,
} from "@/lib/recording-progress"

interface RecordingPlayerDialogProps {
  url: string
  title?: string
  /**
   * Custom trigger element. Falls back to a "Watch" outline button if omitted.
   * Pass `triggerLabel` to keep the default button shape but change its text.
   */
  trigger?: React.ReactNode
  triggerLabel?: string
  /** Public URL of the WebVTT captions sidecar, if available. */
  transcriptUrl?: string | null
  /** Plain-text transcript for the "Transcript" panel. */
  transcriptText?: string | null
  /**
   * Recording identity for progress tracking. When supplied with a
   * userId, the player remembers playback position across sessions
   * and prompts the viewer to resume on next open. Both are needed
   * — without them the player runs stateless (legacy behavior).
   */
  recordingId?: string
  userId?: string
}

export function RecordingPlayerDialog({
  url,
  title = "Class recording",
  trigger,
  triggerLabel = "Watch",
  transcriptUrl,
  transcriptText,
  recordingId,
  userId,
}: RecordingPlayerDialogProps) {
  const [open, setOpen] = useState(false)
  const provider = detectVideoProvider(url)
  const embed = videoEmbedUrl(url)
  const videoRef = useRef<HTMLVideoElement>(null)
  // Saved position surfaces a "Resume from X?" overlay before the
  // user hits play. Latched on dialog open so toggling open/close
  // re-queries fresh state (the prior session might have set it).
  const [savedEntry, setSavedEntry] = useState<RecordingProgressEntry | null>(null)
  // resumeChoice gates the player effect: until the user picks
  // resume or restart, we don't auto-seek anywhere.
  const [resumeChoice, setResumeChoice] = useState<"pending" | "resume" | "restart">("pending")

  // On dialog open, pull the persisted progress entry (if any).
  // We only surface the resume overlay when the entry has real
  // headroom — already-completed recordings reset to the start,
  // and entries < 30s in are treated as "they didn't really watch
  // yet" so the overlay doesn't ask about a 5-second blip.
  useEffect(() => {
    if (!open) return
    if (!recordingId) {
      setResumeChoice("restart")
      return
    }
    const entry = getProgress(userId, recordingId) ?? null
    setSavedEntry(entry)
    if (
      entry &&
      !entry.completed &&
      entry.positionSec > 30 &&
      entry.positionSec < entry.durationSec * COMPLETION_RATIO
    ) {
      setResumeChoice("pending")
    } else {
      setResumeChoice("restart")
    }
  }, [open, recordingId, userId])

  // Wire the <video> element: seek to the saved position once the
  // metadata is loaded (so currentTime persists), then write
  // progress every ~5s as playback advances. We use timeupdate
  // throttled by a small interval rather than per-tick because
  // timeupdate fires up to 4×/s which would thrash localStorage.
  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    if (provider !== "file") return
    if (!recordingId) return
    if (resumeChoice === "pending") return

    const onLoaded = () => {
      if (resumeChoice === "resume" && savedEntry) {
        try {
          v.currentTime = savedEntry.positionSec
        } catch { /* some browsers throw on seek-before-ready */ }
      }
    }
    let lastWriteAt = 0
    const onTime = () => {
      if (!Number.isFinite(v.duration) || v.duration <= 0) return
      const now = Date.now()
      if (now - lastWriteAt < 5000) return
      lastWriteAt = now
      setProgress(userId, recordingId, v.currentTime, v.duration)
    }
    const onEnded = () => {
      if (!Number.isFinite(v.duration) || v.duration <= 0) return
      setProgress(userId, recordingId, v.duration, v.duration)
    }
    v.addEventListener("loadedmetadata", onLoaded)
    v.addEventListener("timeupdate", onTime)
    v.addEventListener("ended", onEnded)
    return () => {
      v.removeEventListener("loadedmetadata", onLoaded)
      v.removeEventListener("timeupdate", onTime)
      v.removeEventListener("ended", onEnded)
      // Final flush — beat the unmount with whatever the player's
      // last known position was, so a close-mid-play still captures.
      if (Number.isFinite(v.duration) && v.duration > 0) {
        setProgress(userId, recordingId, v.currentTime, v.duration)
      }
    }
  }, [provider, recordingId, userId, resumeChoice, savedEntry])

  const showResumeOverlay =
    resumeChoice === "pending" && savedEntry !== null && provider === "file"

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm">
            <Play className="mr-1.5 h-3.5 w-3.5" />
            {triggerLabel}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl p-0 sm:max-w-4xl">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="flex items-center justify-between gap-3">
            <span className="truncate">{title}</span>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-normal text-muted-foreground hover:text-foreground"
            >
              <ExternalLink className="h-3 w-3" />
              Open in new tab
            </a>
          </DialogTitle>
        </DialogHeader>
        <div className="px-6 pb-6">
          {provider === "file" ? (
            // Native player: gives us playback controls, fullscreen, picture-in-picture.
            // `preload="metadata"` keeps initial bandwidth low until the user hits play.
            // When a VTT sidecar exists, browsers expose the CC button
            // automatically — no extra UI work.
            <div
              className="relative"
              // Sprint C Recordings #48 — keyboard shortcut layer.
              // Matches YouTube's mental model so power viewers don't
              // have to relearn:
              //   Space / K   play / pause
              //   J / L       seek -10s / +10s
              //   ← / →       seek -5s / +5s
              //   ↑ / ↓       volume up / down
              //   M           mute toggle
              //   F           fullscreen toggle
              //   C           captions toggle (if available)
              //   0..9        seek to N0% of duration
              // We only intercept when the focus is on this wrapper
              // (or inside it) — won't steal keys from the
              // resume-overlay buttons because they handle their own
              // events first.
              onKeyDown={(e) => {
                const v = videoRef.current
                if (!v) return
                const k = e.key
                const tag = (e.target as HTMLElement | null)?.tagName
                // Ignore typing in inputs / textareas (no inputs in
                // this dialog today, but defensive against future
                // composer additions inside the player chrome).
                if (tag === "INPUT" || tag === "TEXTAREA") return
                let handled = true
                if (k === " " || k === "k" || k === "K") {
                  if (v.paused) v.play().catch(() => {}); else v.pause()
                } else if (k === "j" || k === "J") {
                  v.currentTime = Math.max(0, v.currentTime - 10)
                } else if (k === "l" || k === "L") {
                  v.currentTime = Math.min(v.duration || Infinity, v.currentTime + 10)
                } else if (k === "ArrowLeft") {
                  v.currentTime = Math.max(0, v.currentTime - 5)
                } else if (k === "ArrowRight") {
                  v.currentTime = Math.min(v.duration || Infinity, v.currentTime + 5)
                } else if (k === "ArrowUp") {
                  v.volume = Math.min(1, v.volume + 0.1)
                } else if (k === "ArrowDown") {
                  v.volume = Math.max(0, v.volume - 0.1)
                } else if (k === "m" || k === "M") {
                  v.muted = !v.muted
                } else if (k === "f" || k === "F") {
                  if (document.fullscreenElement) {
                    void document.exitFullscreen()
                  } else {
                    void v.requestFullscreen()
                  }
                } else if (k === "c" || k === "C") {
                  const t = v.textTracks?.[0]
                  if (t) t.mode = t.mode === "showing" ? "hidden" : "showing"
                } else if (/^[0-9]$/.test(k)) {
                  const pct = Number(k) / 10
                  if (v.duration > 0) v.currentTime = v.duration * pct
                } else {
                  handled = false
                }
                if (handled) {
                  e.preventDefault()
                  e.stopPropagation()
                }
              }}
              tabIndex={-1}
            >
              <video
                ref={videoRef}
                src={url}
                controls
                preload="metadata"
                // Only autoplay when there's no resume decision pending —
                // otherwise the overlay covers the player anyway, and
                // autoplay would buffer past the resume point.
                autoPlay={!showResumeOverlay}
                crossOrigin={transcriptUrl ? "anonymous" : undefined}
                // Sprint C Recordings #48 — explicit aria-label so
                // screen readers announce the recording title rather
                // than just "video, paused" with no context.
                aria-label={title ? `Recording: ${title}` : "Recording player"}
                className="aspect-video w-full rounded-md bg-black"
              >
                {transcriptUrl && (
                  <track
                    kind="captions"
                    src={transcriptUrl}
                    srcLang="en"
                    label="Auto-generated"
                    default
                  />
                )}
              </video>
              {showResumeOverlay && savedEntry && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-md bg-black/80 p-6 text-center">
                  <p className="text-sm font-semibold text-white">
                    Pick up where you left off?
                  </p>
                  <p className="text-xs text-white/70">
                    You were at {formatTime(savedEntry.positionSec)} of{" "}
                    {formatTime(savedEntry.durationSec)}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => {
                        setResumeChoice("resume")
                        // Manually kick playback because autoPlay was off
                        // while the overlay was up.
                        videoRef.current?.play().catch(() => {})
                      }}
                    >
                      Resume from {formatTime(savedEntry.positionSec)}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-white/40 bg-white/10 text-white hover:bg-white/20"
                      onClick={() => {
                        setResumeChoice("restart")
                        if (videoRef.current) {
                          try { videoRef.current.currentTime = 0 } catch { /* ignore */ }
                          videoRef.current.play().catch(() => {})
                        }
                        if (recordingId) clearProgress(userId, recordingId)
                      }}
                    >
                      <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Start over
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : embed ? (
            <iframe
              src={embed}
              title={title}
              className="aspect-video w-full rounded-md border border-border/60"
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 rounded-md border border-border/60 bg-muted/40 p-12 text-center">
              <p className="text-sm text-muted-foreground">
                This recording can&apos;t be inlined here.
              </p>
              <Button asChild variant="outline" size="sm">
                <a href={url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                  Open recording
                </a>
              </Button>
            </div>
          )}
          {transcriptText && (
            <details className="mt-4 rounded-md border border-border/60 bg-muted/30 p-3 text-sm">
              <summary className="cursor-pointer font-medium">
                Transcript
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  Auto-generated · Whisper
                </span>
              </summary>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-foreground/80">
                {transcriptText}
              </p>
            </details>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Tiny mm:ss / h:mm:ss formatter for the resume overlay. We use
// our own rather than depending on Intl to avoid locale variation
// — recording timestamps should always read the same.
function formatTime(totalSec: number): string {
  const safe = Math.max(0, Math.floor(totalSec))
  const h = Math.floor(safe / 3600)
  const m = Math.floor((safe % 3600) / 60)
  const s = safe % 60
  const pad = (n: number) => n.toString().padStart(2, "0")
  if (h > 0) return `${h}:${pad(m)}:${pad(s)}`
  return `${m}:${pad(s)}`
}
