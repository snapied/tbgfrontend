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
        const res = await fetch(
          `${apiBase()}/api/live-sessions/${encodeURIComponent(roomId)}/state`,
          { credentials: "include" },
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
    setStatus("recording")
    startedAtRef.current = Date.now()
    try {
      const res = await fetch(
        `${apiBase()}/api/live-sessions/${encodeURIComponent(roomId)}/recording/start`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notifyEmails, title }),
        },
      )
      if (!res.ok) {
        const body = await res.text().catch(() => "")
        throw new Error(`start recording failed (${res.status}): ${body || res.statusText}`)
      }
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
      const res = await fetch(
        `${apiBase()}/api/live-sessions/${encodeURIComponent(roomId)}/recording/stop`,
        { method: "POST", credentials: "include" },
      )
      if (!res.ok) {
        const body = await res.text().catch(() => "")
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
