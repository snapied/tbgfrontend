"use client"

// Server-side class recording via LiveKit Egress.
//
// The browser no longer captures or uploads anything — LiveKit's cloud egress
// workers record the composited room and write the final MP4 straight to R2.
// Our backend just owns the start/stop lifecycle and stores the resulting URL.
//
// The hook's public shape is unchanged from the old MediaRecorder version so
// the host page didn't need code edits: { status, start, stop, error, recording }.
//
// Flow:
//   1. Instructor clicks "Start recording" → POST /recording/start (no browser prompt).
//   2. Backend asks LiveKit to start a room composite egress to R2.
//   3. Instructor clicks "Stop" → POST /recording/stop.
//   4. We poll /state every 5s until recording_url shows up, then mark "done".

import { useCallback, useEffect, useRef, useState } from "react"
import { apiBase } from "./jitsi"

export type RecordingStatus =
  | "idle"
  | "asking"        // kept in the union for backward compat — never set by this impl
  | "recording"
  | "uploading"     // after stop, while LiveKit finalises + uploads to R2
  | "done"
  | "error"

export interface FinalRecording {
  url: string
  startedAt: string
  endedAt: string
  durationSec: number
}

interface Opts {
  /** Stable room code — must match what LiveKitRoom uses (canonicalRoomCode). */
  roomId: string
  /** Optional list of emails to notify when the recording URL lands on R2. */
  notifyEmails?: string[]
  /** Optional friendly title for the email subject + dashboard. */
  title?: string
  onFinal?: (r: FinalRecording) => void
  onError?: (e: Error) => void
}

export function useHostRecording({
  roomId,
  notifyEmails,
  title,
  onFinal,
  onError,
}: Opts) {
  const [status, setStatus] = useState<RecordingStatus>("idle")
  const [error, setError] = useState<string | null>(null)
  const [recording, setRecording] = useState<FinalRecording | null>(null)

  const startedAtRef = useRef<number>(0)
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current)
      pollTimerRef.current = null
    }
  }, [])

  useEffect(() => () => stopPolling(), [stopPolling])

  // Watch /state for recording_url to appear after we stop the egress. R2
  // upload typically takes 5-30s after stop — depends on egress duration and
  // network. Once we see the URL we resolve to "done".
  const startPolling = useCallback(() => {
    stopPolling()
    pollTimerRef.current = setInterval(async () => {
      try {
        const token = window.localStorage.getItem("thebigclass.accessToken")
        const headers: HeadersInit = {}
        if (token) headers["Authorization"] = `Bearer ${token}`

        const res = await fetch(
          `${apiBase()}/api/live-sessions/${encodeURIComponent(roomId)}/state`,
          { credentials: "include", headers },
        )
        if (!res.ok) return
        const j = await res.json()
        // /state returns the row in camelCase: { roomCode, recordingUrl, … }
        const errMsg: string | null = j?.recordingError ?? null
        if (errMsg) {
          stopPolling()
          setError(errMsg)
          setStatus("error")
          onError?.(new Error(errMsg))
          return
        }
        const url: string | null =
          j?.recordingUrl ?? j?.recording_url ?? j?.state?.recording_url ?? null
        if (url) {
          stopPolling()
          const final: FinalRecording = {
            url,
            startedAt: new Date(startedAtRef.current).toISOString(),
            endedAt: new Date().toISOString(),
            durationSec: Math.round((Date.now() - startedAtRef.current) / 1000),
          }
          setRecording(final)
          setStatus("done")
          onFinal?.(final)
        }
      } catch {
        // Network flake — keep polling. The state endpoint is cheap.
      }
    }, 5000)
  }, [roomId, onFinal, stopPolling])

  const start = useCallback(async () => {
    setError(null)
    // Show a brief "asking" state while the backend starts the egress.
    // We do NOT flip to "recording" yet — we only do that after the backend
    // confirms. This prevents the host UI showing "Recording" for a start
    // that silently failed, which would cause the subsequent Stop to fire
    // against a non-existent egress and get a 404.
    setStatus("asking")
    startedAtRef.current = Date.now()
    try {
      const token = window.localStorage.getItem("thebigclass.accessToken")
      const headers: HeadersInit = { "Content-Type": "application/json" }
      if (token) headers["Authorization"] = `Bearer ${token}`

      const res = await fetch(
        `${apiBase()}/api/live-sessions/${encodeURIComponent(roomId)}/recording/start`,
        {
          method: "POST",
          credentials: "include",
          headers,
          body: JSON.stringify({ notifyEmails, title }),
        },
      )
      if (!res.ok) {
        const body = await res.text().catch(() => "")
        throw new Error(`start recording failed (${res.status}): ${body || res.statusText}`)
      }
      // Backend confirmed — NOW flip to recording. Any egress failure
      // before this point lands in the catch block below.
      setStatus("recording")
    } catch (e) {
      const err = e as Error
      setError(err.message)
      setStatus("error")
      onError?.(err)
    }
  }, [roomId, notifyEmails, title, onError])

  const stop = useCallback(async () => {
    setStatus("uploading")
    try {
      const token = window.localStorage.getItem("thebigclass.accessToken")
      const headers: HeadersInit = {}
      if (token) headers["Authorization"] = `Bearer ${token}`

      const res = await fetch(
        `${apiBase()}/api/live-sessions/${encodeURIComponent(roomId)}/recording/stop`,
        { method: "POST", credentials: "include", headers },
      )
      if (!res.ok) {
        const body = await res.text().catch(() => "")
        // 404 = no active egress on the backend. This can happen if
        // the egress already completed on its own, or if the start call
        // never reached LiveKit. Treat it as a soft no-op: the recording
        // either never existed or is already done — in both cases, stop
        // polling for a URL since there's nothing to wait for.
        if (res.status === 404) {
          console.warn("[recording] stop 404 — no active egress; likely start failed or egress already completed")
          setStatus("idle")
          return
        }
        throw new Error(`stop recording failed (${res.status}): ${body || res.statusText}`)
      }
      startPolling()
    } catch (e) {
      const err = e as Error
      setError(err.message)
      setStatus("error")
      onError?.(err)
    }
  }, [roomId, startPolling, onError])

  return {
    status,
    error,
    recording,
    start,
    stop,
  }
}
