"use client"

// Live captions overlay for the in-call UI.
//
// Approach: browser-side Web Speech API (`SpeechRecognition`). Free,
// zero-setup, runs entirely in the user's browser. Each participant
// captions their OWN audio locally (we don't share captions across
// the room because LiveKit Agents would be the right way to do that
// and it's a much bigger lift).
//
// Limitations to flag in the UI:
//   - Chrome / Edge / Safari support it; Firefox does NOT. We
//     gracefully no-op there.
//   - Captions appear ONLY for the local speaker — students see
//     their own words, not the host's. The post-class transcript
//     (Whisper on the recording) is the source of truth for
//     "what everyone said".
//   - Caption text is never sent anywhere — privacy by default.
//
// Diagnostics: the button cycles through Off → Starting → Listening
// → Caption text. If it stays on "Starting…" the SR engine isn't
// receiving audio (mic permission denied, or another tab grabbed it
// first). `onerror` logs the SR error code to the browser console
// so support can pinpoint the cause.

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { AlertTriangle, ArrowRight, Captions, CaptionsOff, Lock, Mic } from "lucide-react"
import { cn } from "@/lib/utils"
import { usePlan } from "@/lib/use-plan"

// Type guard for the prefixed API — TypeScript doesn't ship it.
interface RecognitionLike {
  start(): void
  stop(): void
  abort(): void
  continuous: boolean
  interimResults: boolean
  lang: string
  onstart: ((this: RecognitionLike) => void) | null
  onaudiostart: ((this: RecognitionLike) => void) | null
  onspeechstart: ((this: RecognitionLike) => void) | null
  onresult:
    | ((this: RecognitionLike, ev: { results: ArrayLike<ArrayLike<{ transcript: string; isFinal?: boolean }>>; resultIndex: number }) => void)
    | null
  onerror: ((this: RecognitionLike, ev: { error?: string }) => void) | null
  onend: ((this: RecognitionLike) => void) | null
}

function getRecognitionCtor(): { new (): RecognitionLike } | null {
  if (typeof window === "undefined") return null
  const w = window as unknown as {
    SpeechRecognition?: { new (): RecognitionLike }
    webkitSpeechRecognition?: { new (): RecognitionLike }
  }
  return w.SpeechRecognition || w.webkitSpeechRecognition || null
}

type Status = "off" | "starting" | "listening" | "denied" | "error"

interface Props {
  /** BCP-47 tag. Defaults to en-IN for the Indian launch market. */
  lang?: string
  /** Mirror the local user's name for the caption strip. */
  speakerName?: string
}

export function LiveCaptions({ lang = "en-IN", speakerName }: Props) {
  const { isAllowed, hydrated: planHydrated } = usePlan()
  const transcriptsAllowed = isAllowed("transcripts")
  const [enabled, setEnabled] = useState(false)
  const [status, setStatus] = useState<Status>("off")
  const [interim, setInterim] = useState("")
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [supported, setSupported] = useState(true)
  const recRef = useRef<RecognitionLike | null>(null)
  // `enabledRef` mirrors `enabled` so the closure inside onend can
  // see the live value when deciding whether to auto-restart Chrome's
  // ~60-second SR timeout. Without this, `enabled` stays stale.
  const enabledRef = useRef(enabled)
  useEffect(() => { enabledRef.current = enabled }, [enabled])

  // If the user's plan changes and we're mid-call with captions on,
  // stop them immediately. (Edge case — most plans changes happen
  // outside a live call, but keeps the gate honest.)
  useEffect(() => {
    if (!transcriptsAllowed && enabled) setEnabled(false)
  }, [transcriptsAllowed, enabled])

  useEffect(() => {
    const Ctor = getRecognitionCtor()
    if (!Ctor) {
      setSupported(false)
      return
    }
    if (!enabled) {
      recRef.current?.abort()
      recRef.current = null
      setInterim("")
      setStatus("off")
      return
    }

    setStatus("starting")
    setErrorMsg(null)
    setInterim("")
    const r = new Ctor()
    r.continuous = true
    r.interimResults = true
    r.lang = lang
    r.onstart = () => setStatus("starting")
    r.onaudiostart = () => setStatus("listening")
    r.onspeechstart = () => setStatus("listening")
    r.onresult = (ev) => {
      let text = ""
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        text += ev.results[i][0].transcript
      }
      setInterim(text.trim())
      setStatus("listening")
    }
    r.onerror = (ev) => {
      const code = ev?.error || "unknown"
      // Log so support can debug from a screen share without
      // attaching a debugger.
      // eslint-disable-next-line no-console
      console.warn("[live-captions] SR error:", code)
      if (code === "no-speech") {
        // Benign — Chrome fires this every few seconds when the
        // room is quiet. Keep the listener alive.
        return
      }
      if (code === "not-allowed" || code === "service-not-allowed") {
        setStatus("denied")
        setErrorMsg("Microphone permission was denied. Allow mic access in your browser address bar.")
      } else if (code === "aborted") {
        // We aborted on purpose — ignore.
      } else {
        setStatus("error")
        setErrorMsg(`Speech recognition error: ${code}. Try toggling captions off and on again.`)
      }
    }
    r.onend = () => {
      // Re-arm — Chrome auto-stops every ~60s of silence. Use the
      // ref so we don't restart after the user explicitly turned
      // captions off.
      if (enabledRef.current && recRef.current === r) {
        try { r.start() } catch { /* already started */ }
      }
    }

    try {
      r.start()
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn("[live-captions] start threw:", err)
      setStatus("error")
      setErrorMsg("Couldn't start speech recognition. Reload the tab.")
    }
    recRef.current = r

    return () => {
      r.onresult = null
      r.onerror = null
      r.onend = null
      r.onstart = null
      r.onaudiostart = null
      r.onspeechstart = null
      try { r.abort() } catch { /* ignore */ }
    }
  }, [enabled, lang])

  const buttonLabel =
    !supported ? "Captions unavailable" :
    !transcriptsAllowed ? "Captions: Studio plan" :
    status === "off" ? "Live captions" :
    status === "starting" ? "Captions: starting…" :
    status === "denied" ? "Mic blocked" :
    status === "error" ? "Captions error" :
    "Captions on"

  // Don't render anything until the plan is known — avoids a flash
  // of the unlocked toggle for users on free plans.
  if (!planHydrated) return null

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-24 z-50 flex flex-col items-center gap-2 px-4">
      {/* Live caption bubble */}
      {enabled && interim && (
        <div className="pointer-events-none max-w-3xl rounded-2xl bg-black/75 px-4 py-2 text-center text-sm font-medium text-white shadow-lg backdrop-blur-sm">
          {speakerName ? <span className="mr-2 text-white/60">{speakerName}:</span> : null}
          {interim}
        </div>
      )}

      {/* "Listening, but you haven't spoken yet" hint */}
      {enabled && !interim && status === "listening" && (
        <div className="pointer-events-none flex items-center gap-2 rounded-full bg-black/60 px-3 py-1 text-[11px] font-medium text-white/80 shadow backdrop-blur-sm">
          <Mic className="h-3 w-3 animate-pulse text-emerald-400" />
          Listening — start speaking and your words will show up here.
        </div>
      )}

      {/* Permission denied / error banner */}
      {enabled && errorMsg && (
        <div className="pointer-events-auto flex items-center gap-2 rounded-md border border-amber-400/40 bg-amber-500/95 px-3 py-1.5 text-xs font-medium text-white shadow-lg">
          <AlertTriangle className="h-3 w-3" />
          {errorMsg}
        </div>
      )}

      {transcriptsAllowed ? (
        <button
          type="button"
          onClick={() => setEnabled((v) => !v)}
          disabled={!supported}
          title={
            !supported
              ? "Your browser doesn't support live captions. Try Chrome, Edge, or Safari."
              : enabled
                ? "Turn captions off"
                : "Turn captions on"
          }
          className={cn(
            "pointer-events-auto inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium shadow-sm transition",
            enabled
              ? status === "denied" || status === "error"
                ? "border-amber-400/50 bg-amber-500 text-white"
                : "border-primary/50 bg-primary text-primary-foreground"
              : "border-white/20 bg-black/60 text-white hover:bg-black/80",
            !supported && "cursor-not-allowed opacity-50",
          )}
        >
          {enabled ? <Captions className="h-3.5 w-3.5" /> : <CaptionsOff className="h-3.5 w-3.5" />}
          {buttonLabel}
        </button>
      ) : (
        // Locked variant — clicking takes them to billing instead of
        // pretending to toggle. Tooltip explains why.
        <Link
          href="/dashboard/billing"
          className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full border border-amber-400/50 bg-amber-500/90 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-amber-500"
          title="Live captions + transcripts are included from the Studio plan. Click to upgrade."
        >
          <Lock className="h-3.5 w-3.5" />
          {buttonLabel}
          <ArrowRight className="h-3 w-3" />
        </Link>
      )}
    </div>
  )
}
