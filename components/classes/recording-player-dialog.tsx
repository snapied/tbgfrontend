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
import { Check, ExternalLink, Layers, Link2, Play, RotateCcw } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { detectVideoProvider, videoEmbedUrl } from "@/lib/lesson-utils"
import { RecordingNotesPanel } from "@/components/classes/recording-notes-panel"
import { deriveChaptersFromVtt, formatChapterTime, type RecordingChapter } from "@/lib/recording-chapters"
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
  /**
   * Optional deep-link URL for the recording (e.g.
   * `/dashboard/recordings/<id>`). When provided, the player exposes
   * a Share button that copies the URL with the current playhead as
   * `?t=<seconds>` so a teacher can paste a link to a specific
   * moment into Slack/community/email.
   */
  shareUrl?: string
  /**
   * Optional "up next" recording. When set, the player shows an
   * autoplay countdown card in the last 30s of playback. After 10s
   * the card auto-navigates to `nextRecording.href`. Click X to
   * dismiss (no autoplay), click the card to skip the countdown
   * and jump now. The href is typically `/dashboard/recordings/<id>`.
   */
  nextRecording?: {
    id: string
    title: string
    courseTitle?: string
    durationMin?: number
    href: string
  } | null
  /**
   * When set (and there's no saved resume entry), the player seeks
   * to this many seconds on load. Powers deep-links like
   * `/dashboard/recordings/abc?t=750` — the route reads `t` from
   * the URL and passes it here.
   */
  initialSeekSec?: number
  /** Open the dialog by default (used by the standalone route page). */
  defaultOpen?: boolean
  /**
   * Optional handler called when the dialog closes via the user.
   * Standalone-route variant uses this to router.back() so the
   * close button feels like "go back to the list".
   */
  onClose?: () => void
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
  shareUrl,
  initialSeekSec,
  defaultOpen,
  onClose,
  nextRecording,
}: RecordingPlayerDialogProps) {
  const [open, setOpen] = useState(!!defaultOpen)
  const [copiedShare, setCopiedShare] = useState(false)
  const provider = detectVideoProvider(url)
  const embed = videoEmbedUrl(url)
  const videoRef = useRef<HTMLVideoElement>(null)
  // Chapters derived from the VTT transcript. We fetch the VTT
  // once when the dialog opens (and a transcriptUrl is set) and
  // run it through the chapter parser. Embeds (YouTube/Vimeo)
  // get nothing — their own players handle chapters via their
  // service-specific metadata.
  const [chapters, setChapters] = useState<RecordingChapter[]>([])
  // Playback speed control. Native <video controls> exposes speed
  // behind the kebab menu — surfacing 0.75/1/1.25/1.5/2× as visible
  // chips makes it discoverable. Speed persists across closes/opens
  // via localStorage so a teacher who prefers 1.5× doesn't reset
  // every recording.
  const PLAYBACK_RATES = [0.75, 1, 1.25, 1.5, 2] as const
  const PLAYBACK_KEY = "thebigclass.recording.playbackRate.v1"
  const [playbackRate, setPlaybackRate] = useState<number>(() => {
    if (typeof window === "undefined") return 1
    const raw = window.localStorage.getItem(PLAYBACK_KEY)
    const n = raw ? Number(raw) : 1
    return Number.isFinite(n) && n > 0 ? n : 1
  })
  // Saved position surfaces a "Resume from X?" overlay before the
  // user hits play. Latched on dialog open so toggling open/close
  // re-queries fresh state (the prior session might have set it).
  const [savedEntry, setSavedEntry] = useState<RecordingProgressEntry | null>(null)
  // resumeChoice gates the player effect: until the user picks
  // resume or restart, we don't auto-seek anywhere.
  const [resumeChoice, setResumeChoice] = useState<"pending" | "resume" | "restart">("pending")
  // Countdown ring on the resume overlay — auto-resumes after 4s
  // unless the user touches the overlay (mouse move / focus). We
  // tick once per second; reaching 0 picks "resume" automatically.
  const RESUME_COUNTDOWN_SECONDS = 4
  const [resumeCountdown, setResumeCountdown] = useState<number | null>(null)
  // Up-next state. `mode` controls visibility:
  //   "hidden"      — default, no card.
  //   "preview"     — last 30s of the video; card slides in but no
  //                   autoplay (the viewer might still be watching
  //                   the outro). Click "Play next" to skip ahead.
  //   "countdown"   — video ended; 10s autoplay timer ticks. The
  //                   card pulses; click X to dismiss.
  //   "dismissed"   — viewer X'd the card. Stays hidden for the rest
  //                   of this dialog session.
  const UP_NEXT_PREVIEW_SECONDS = 30
  const UP_NEXT_AUTOPLAY_SECONDS = 10
  const [upNextMode, setUpNextMode] = useState<"hidden" | "preview" | "countdown" | "dismissed">("hidden")
  const [upNextCountdown, setUpNextCountdown] = useState<number>(UP_NEXT_AUTOPLAY_SECONDS)

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
      setResumeCountdown(RESUME_COUNTDOWN_SECONDS)
    } else {
      setResumeChoice("restart")
      setResumeCountdown(null)
    }
  }, [open, recordingId, userId])

  // Tick the resume countdown once per second while overlay is up.
  // Auto-fires "resume" when it hits zero. Any pointer/key activity
  // on the overlay cancels the countdown (handled by the overlay's
  // own onMouseMove/onKeyDown — we just stop ticking once null).
  useEffect(() => {
    if (resumeChoice !== "pending" || resumeCountdown === null) return
    if (resumeCountdown <= 0) {
      setResumeChoice("resume")
      setResumeCountdown(null)
      videoRef.current?.play().catch(() => {})
      return
    }
    const t = setTimeout(() => setResumeCountdown((c) => (c == null ? null : c - 1)), 1000)
    return () => clearTimeout(t)
  }, [resumeChoice, resumeCountdown])

  // Apply the chosen playback rate whenever it changes or the
  // video is (re)mounted. Cheap effect — runs on the file player
  // only since embeds (YouTube/Vimeo) handle their own controls.
  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    try { v.playbackRate = playbackRate } catch { /* unsupported */ }
    if (typeof window !== "undefined") {
      try { window.localStorage.setItem(PLAYBACK_KEY, String(playbackRate)) } catch { /* private mode */ }
    }
  }, [playbackRate])

  // Fetch + parse the VTT transcript once the dialog opens. We
  // gate on `open` so closed dialogs don't burn a fetch. Embeds
  // (YouTube/Vimeo/Loom) ship their own chapter UI so we skip
  // them — only the native file player gets our chapter rail.
  useEffect(() => {
    if (!open) return
    if (provider !== "file") return
    if (!transcriptUrl) {
      setChapters([])
      return
    }
    let cancelled = false
    fetch(transcriptUrl, { credentials: "include" })
      .then((r) => (r.ok ? r.text() : ""))
      .then((vtt) => {
        if (cancelled) return
        setChapters(deriveChaptersFromVtt(vtt))
      })
      .catch(() => {
        if (!cancelled) setChapters([])
      })
    return () => {
      cancelled = true
    }
  }, [open, provider, transcriptUrl])

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
      // Priority order on seek-at-load:
      //   1. ?t= deep-link (initialSeekSec) wins — explicit user intent.
      //   2. Resume-from-saved-position only if no deep link is set.
      // This way `share at 12:30` always opens at 12:30, even if the
      // viewer had already watched up to minute 25 previously.
      if (initialSeekSec != null && Number.isFinite(initialSeekSec) && initialSeekSec >= 0) {
        try {
          v.currentTime = Math.min(initialSeekSec, v.duration || Infinity)
        } catch { /* ignore */ }
        return
      }
      if (resumeChoice === "resume" && savedEntry) {
        try {
          v.currentTime = savedEntry.positionSec
        } catch { /* some browsers throw on seek-before-ready */ }
      }
    }
    let lastWriteAt = 0
    const onTime = () => {
      if (!Number.isFinite(v.duration) || v.duration <= 0) return
      // Progress write (throttled).
      const now = Date.now()
      if (now - lastWriteAt >= 5000) {
        lastWriteAt = now
        setProgress(userId, recordingId, v.currentTime, v.duration)
      }
      // Up-next preview state. Enter when ≤30s remain. Don't downgrade
      // out of "countdown" once we've ended (the ended event already
      // promoted us). And respect the user's dismiss.
      if (nextRecording && upNextMode === "hidden" && v.duration - v.currentTime <= UP_NEXT_PREVIEW_SECONDS) {
        setUpNextMode("preview")
      }
    }
    const onEnded = () => {
      if (!Number.isFinite(v.duration) || v.duration <= 0) return
      setProgress(userId, recordingId, v.duration, v.duration)
      // Promote preview → countdown the moment the video ends, but
      // only if we have a next recording AND the viewer didn't
      // already X the card during the preview window.
      if (nextRecording && upNextMode !== "dismissed") {
        setUpNextMode("countdown")
        setUpNextCountdown(UP_NEXT_AUTOPLAY_SECONDS)
      }
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
  }, [provider, recordingId, userId, resumeChoice, savedEntry, nextRecording, upNextMode])

  const showResumeOverlay =
    resumeChoice === "pending" && savedEntry !== null && provider === "file"

  // Up-next countdown ticker. Fires only in "countdown" mode; on
  // reaching zero, navigates to the next recording's href. Window
  // navigation (not next/router) so the standalone-route mount and
  // the inline dialog both work the same way.
  useEffect(() => {
    if (upNextMode !== "countdown") return
    if (upNextCountdown <= 0) {
      if (nextRecording) window.location.href = nextRecording.href
      return
    }
    const t = window.setTimeout(() => setUpNextCountdown((c) => c - 1), 1000)
    return () => window.clearTimeout(t)
  }, [upNextMode, upNextCountdown, nextRecording])

  // Mobile lockscreen + headphone controls via Media Session API.
  // Fixes the "audio stops when phone locks" problem for students
  // listening to lectures on commute. Also wires Picture-in-Picture
  // so the video can pop out into a floating window while they
  // switch apps. iOS and Chrome / Edge / Firefox all support these
  // — graceful no-op on browsers that don't.
  useEffect(() => {
    if (!open) return
    if (provider !== "file") return
    if (typeof navigator === "undefined") return
    const ms = (navigator as Navigator & { mediaSession?: MediaSession }).mediaSession
    if (!ms || typeof MediaMetadata === "undefined") return

    // Populate the lockscreen card with the recording title +
    // generic "Class recording" album line.
    ms.metadata = new MediaMetadata({
      title,
      artist: "Class recording",
      album: "The Big Class",
      // Lockscreen artwork — falls back to OS default when our
      // icon isn't resolvable. We point at a static brand icon
      // baked into /public so this doesn't require a generated
      // OG image per recording.
      artwork: [
        { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      ],
    })

    const v = videoRef.current
    if (!v) return

    // Wire the standard transport actions. Each handler is
    // defensive — the API throws on some setters when the action
    // isn't supported, so we wrap in try/catch.
    const set = (action: MediaSessionAction, handler: (() => void) | null) => {
      try { ms.setActionHandler(action, handler) } catch { /* not supported */ }
    }
    set("play",  () => { void v.play().catch(() => {}) })
    set("pause", () => v.pause())
    set("seekbackward", () => { v.currentTime = Math.max(0, v.currentTime - 10) })
    set("seekforward",  () => { v.currentTime = Math.min(v.duration || Infinity, v.currentTime + 10) })
    set("seekto",  () => { /* handled by progress sync below */ })
    if (nextRecording) {
      set("nexttrack", () => { window.location.href = nextRecording.href })
    }

    // Keep the lockscreen progress slider in sync.
    let lastSync = 0
    const syncPositionState = () => {
      const now = Date.now()
      if (now - lastSync < 1000) return
      lastSync = now
      if (!Number.isFinite(v.duration) || v.duration <= 0) return
      try {
        ms.setPositionState?.({
          duration: v.duration,
          position: Math.max(0, Math.min(v.currentTime, v.duration)),
          playbackRate: v.playbackRate || 1,
        })
      } catch { /* ignore */ }
    }
    v.addEventListener("timeupdate", syncPositionState)
    v.addEventListener("loadedmetadata", syncPositionState)

    return () => {
      v.removeEventListener("timeupdate", syncPositionState)
      v.removeEventListener("loadedmetadata", syncPositionState)
      // Clear the handlers so a closed player doesn't keep
      // intercepting lockscreen taps.
      set("play", null)
      set("pause", null)
      set("seekbackward", null)
      set("seekforward", null)
      set("seekto", null)
      set("nexttrack", null)
    }
  }, [open, provider, title, nextRecording])

  // Picture-in-Picture handler. Bound to the button in the player
  // chrome below. iOS Safari and Chrome / Edge / Firefox all
  // support requestPictureInPicture; we feature-detect and hide
  // the button when unsupported.
  function togglePIP() {
    const v = videoRef.current
    if (!v) return
    const d = document as Document & { pictureInPictureElement?: Element | null; exitPictureInPicture?: () => Promise<void> }
    try {
      if (d.pictureInPictureElement === v) {
        void d.exitPictureInPicture?.()
      } else if ("requestPictureInPicture" in v) {
        void (v as HTMLVideoElement & { requestPictureInPicture?: () => Promise<PictureInPictureWindow> }).requestPictureInPicture?.()
      }
    } catch { /* ignore — PIP unsupported or denied */ }
  }
  const [pipSupported, setPipSupported] = useState(false)
  useEffect(() => {
    if (typeof document === "undefined") return
    const d = document as Document & { pictureInPictureEnabled?: boolean }
    setPipSupported(!!d.pictureInPictureEnabled)
  }, [])

  function copyShareLink() {
    const v = videoRef.current
    const t = v && Number.isFinite(v.currentTime) ? Math.floor(v.currentTime) : 0
    const base = shareUrl ?? url
    // If we have a deep-link route, append ?t=N. Otherwise share the
    // raw asset URL (no fragment — most players ignore #t= on R2).
    const link = shareUrl
      ? `${window.location.origin}${base.startsWith("/") ? base : "/" + base}${base.includes("?") ? "&" : "?"}t=${t}`
      : base
    void navigator.clipboard?.writeText(link).then(() => {
      setCopiedShare(true)
      window.setTimeout(() => setCopiedShare(false), 2000)
    }).catch(() => { /* clipboard denied — silent */ })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next && onClose) onClose()
      }}
    >
      {!defaultOpen && (
        <DialogTrigger asChild>
          {trigger ?? (
            <Button variant="outline" size="sm">
              <Play className="mr-1.5 h-3.5 w-3.5" />
              {triggerLabel}
            </Button>
          )}
        </DialogTrigger>
      )}
      <DialogContent className="max-w-4xl p-0 sm:max-w-4xl">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="flex items-center justify-between gap-3">
            <span className="truncate">{title}</span>
            <div className="flex shrink-0 items-center gap-3">
              {shareUrl && (
                <button
                  type="button"
                  onClick={copyShareLink}
                  className="inline-flex items-center gap-1 text-xs font-normal text-muted-foreground transition-colors hover:text-foreground"
                  title="Copy a link that opens at the current moment"
                >
                  {copiedShare ? (
                    <>
                      <Check className="h-3 w-3 text-success" />
                      <span className="text-success">Link copied</span>
                    </>
                  ) : (
                    <>
                      <Link2 className="h-3 w-3" />
                      Copy link to this moment
                    </>
                  )}
                </button>
              )}
              {pipSupported && provider === "file" && (
                <button
                  type="button"
                  onClick={togglePIP}
                  className="inline-flex items-center gap-1 text-xs font-normal text-muted-foreground transition-colors hover:text-foreground"
                  title="Pop the video out — keep watching while you switch apps"
                  aria-label="Picture-in-picture"
                >
                  <Layers className="h-3 w-3" />
                  Pop out
                </button>
              )}
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-normal text-muted-foreground hover:text-foreground"
              >
                <ExternalLink className="h-3 w-3" />
                Open in new tab
              </a>
            </div>
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
                <div
                  className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-md bg-black/80 p-6 text-center"
                  // Any cursor/touch activity cancels the auto-resume
                  // countdown so a viewer who's actually deciding never
                  // gets surprised by autoplay.
                  onMouseMove={() => setResumeCountdown(null)}
                  onTouchStart={() => setResumeCountdown(null)}
                  // Keyboard shortcuts on the overlay (Enter = resume,
                  // R / Esc = restart). Capture phase so the player's
                  // own keydown handler doesn't see these as transport
                  // controls.
                  onKeyDownCapture={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      setResumeChoice("resume")
                      setResumeCountdown(null)
                      videoRef.current?.play().catch(() => {})
                    } else if (e.key === "r" || e.key === "R" || e.key === "Escape") {
                      e.preventDefault()
                      setResumeChoice("restart")
                      setResumeCountdown(null)
                      if (videoRef.current) {
                        try { videoRef.current.currentTime = 0 } catch { /* ignore */ }
                        videoRef.current.play().catch(() => {})
                      }
                      if (recordingId) clearProgress(userId, recordingId)
                    }
                  }}
                  tabIndex={0}
                  role="dialog"
                  aria-label="Resume playback?"
                >
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
                        setResumeCountdown(null)
                        videoRef.current?.play().catch(() => {})
                      }}
                      autoFocus
                    >
                      Resume from {formatTime(savedEntry.positionSec)}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-white/40 bg-white/10 text-white hover:bg-white/20"
                      onClick={() => {
                        setResumeChoice("restart")
                        setResumeCountdown(null)
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
                  {resumeCountdown !== null && resumeCountdown > 0 && (
                    <p className="mt-1 text-[10px] uppercase tracking-wider text-white/50">
                      Resuming in {resumeCountdown}s · move the cursor to cancel · Enter / R for shortcuts
                    </p>
                  )}
                  {resumeCountdown === null && (
                    <p className="mt-1 text-[10px] uppercase tracking-wider text-white/40">
                      Enter to resume · R to start over
                    </p>
                  )}
                </div>
              )}
              {/* Up-next autoplay card. Slides into bottom-right
                  during the last 30s as a calm "what's coming up"
                  preview; promotes to a full countdown the instant
                  the video ends. Click anywhere on the card to skip
                  ahead, click X to stay on this recording. */}
              {nextRecording && (upNextMode === "preview" || upNextMode === "countdown") && (
                <div
                  className={`absolute bottom-3 right-3 z-10 w-72 cursor-pointer rounded-xl border bg-card/95 p-3 shadow-2xl backdrop-blur-sm transition-all ${
                    upNextMode === "countdown" ? "border-primary ring-2 ring-primary/40" : "border-border"
                  }`}
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    window.location.href = nextRecording.href
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") window.location.href = nextRecording.href
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-primary">
                      {upNextMode === "countdown" ? `Playing in ${upNextCountdown}s` : "Up next"}
                    </p>
                    <button
                      type="button"
                      aria-label="Stay on this recording"
                      className="-mr-1 -mt-1 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      onClick={(e) => {
                        e.stopPropagation()
                        setUpNextMode("dismissed")
                      }}
                    >
                      ×
                    </button>
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm font-semibold leading-snug">
                    {nextRecording.title}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {nextRecording.courseTitle ? `${nextRecording.courseTitle} · ` : ""}
                    {nextRecording.durationMin ? `${nextRecording.durationMin} min` : "Play now →"}
                  </p>
                  {upNextMode === "countdown" && (
                    <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-primary/10">
                      <div
                        className="h-full bg-primary transition-all duration-1000"
                        style={{ width: `${100 - (upNextCountdown / UP_NEXT_AUTOPLAY_SECONDS) * 100}%` }}
                      />
                    </div>
                  )}
                </div>
              )}
              {/* Playback speed chips. Only render for the native
                  file player — embed providers (YouTube/Vimeo) carry
                  their own speed controls. Hidden while the resume
                  overlay is up so we don't fight for attention. */}
              {!showResumeOverlay && (
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] font-medium text-muted-foreground">
                    Speed
                  </span>
                  {PLAYBACK_RATES.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setPlaybackRate(r)}
                      className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold tabular-nums transition ${
                        playbackRate === r
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-card text-foreground hover:border-primary/40"
                      }`}
                      aria-pressed={playbackRate === r}
                    >
                      {r}×
                    </button>
                  ))}
                </div>
              )}
              {/* Chapter rail. Derived from the VTT cues; renders
                  only when at least 2 chapters were detected so a
                  short or unstructured recording doesn't get a
                  single useless pill. Clicking a chapter seeks
                  the video and starts playback. */}
              {chapters.length >= 2 && (
                <div className="mt-3">
                  <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Chapters
                  </p>
                  <ol className="space-y-0.5">
                    {chapters.map((ch) => (
                      <li key={ch.id}>
                        <button
                          type="button"
                          onClick={() => {
                            const v = videoRef.current
                            if (!v) return
                            try { v.currentTime = ch.startSec } catch { /* seek failed */ }
                            v.play().catch(() => {})
                          }}
                          className="group flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-muted"
                        >
                          <span className="mt-0.5 inline-flex w-12 shrink-0 justify-end font-mono text-[11px] tabular-nums text-muted-foreground group-hover:text-foreground">
                            {formatChapterTime(ch.startSec)}
                          </span>
                          <span className="min-w-0 flex-1 text-[12.5px] leading-snug text-foreground/90 group-hover:text-foreground">
                            {ch.title}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ol>
                  <p className="mt-1 text-[10.5px] text-muted-foreground">
                    Generated from the transcript · click to jump
                  </p>
                </div>
              )}
              {/* Personal notes panel — press N to add a note
                  stamped with the current moment. Private to the
                  viewer; never visible to instructors or peers. */}
              {recordingId && (
                <RecordingNotesPanel
                  recordingId={recordingId}
                  userId={userId}
                  videoRef={videoRef}
                />
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
