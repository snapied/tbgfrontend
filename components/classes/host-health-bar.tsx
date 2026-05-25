"use client"

// Host connection health bar.
//
// What the host needs that LiveKit doesn't give them out-of-the-box:
// a calm signal that "your wifi just dropped — your class is fine,
// students didn't notice." Without it, a 30-second wifi blip makes a
// host panic-refresh the page mid-lecture.
//
// The bar:
//   • 🟢 Connected — recording + N students. Calm bar, no animation.
//   • ⚠️  Reconnecting — auto-mutes the host mic so a garbled
//                       reconnect audio doesn't blast into the room.
//   • 🔴 Connection lost — shows after 3 failed reconnect attempts;
//                          offers a one-tap refresh that preserves
//                          the recording (LiveKit Egress keeps going
//                          server-side regardless of host browser).
//
// Mounted inside the LiveKitRoom context — uses useRoomContext().
// The host page wraps the LiveKit room with this bar already (see
// host/page.tsx).

import { useEffect, useRef, useState } from "react"
import { useRoomContext, useParticipants } from "@livekit/components-react"
import { ConnectionState, RoomEvent } from "livekit-client"
import { CheckCircle2, RefreshCw, WifiOff } from "lucide-react"

type Phase = "connected" | "reconnecting" | "lost"

export function HostHealthBar() {
  const room = useRoomContext()
  const participants = useParticipants()
  const [phase, setPhase] = useState<Phase>("connected")
  const [isRecording, setIsRecording] = useState(false)
  const reconnectAttemptsRef = useRef(0)
  // Remember whether the host's mic was on at the moment we
  // auto-muted, so we can restore on reconnect rather than leaving
  // them silent.
  const autoMutedRef = useRef(false)

  useEffect(() => {
    if (!room) return
    setIsRecording(room.isRecording)

    function onStateChange(state: ConnectionState) {
      if (state === ConnectionState.Connected) {
        setPhase("connected")
        reconnectAttemptsRef.current = 0
        // Restore mic if we muted it during the drop.
        if (autoMutedRef.current && room) {
          void room.localParticipant.setMicrophoneEnabled(true).catch(() => {})
          autoMutedRef.current = false
        }
      } else if (state === ConnectionState.Reconnecting) {
        setPhase("reconnecting")
        reconnectAttemptsRef.current += 1
        // Defensive mute — half-connected audio is worse than silent.
        if (room && room.localParticipant.isMicrophoneEnabled) {
          autoMutedRef.current = true
          void room.localParticipant.setMicrophoneEnabled(false).catch(() => {})
        }
      } else if (state === ConnectionState.Disconnected) {
        // Only escalate to "lost" after 3 failed reconnects; first
        // couple of attempts are normal for spotty wifi.
        if (reconnectAttemptsRef.current >= 3) {
          setPhase("lost")
        }
      }
    }

    function onRecordingChange() {
      setIsRecording(!!room?.isRecording)
    }

    // Subscribe + seed with current state for the case we mount
    // mid-class.
    room.on(RoomEvent.ConnectionStateChanged, onStateChange)
    room.on(RoomEvent.RecordingStatusChanged, onRecordingChange)
    onStateChange(room.state)

    return () => {
      room.off(RoomEvent.ConnectionStateChanged, onStateChange)
      room.off(RoomEvent.RecordingStatusChanged, onRecordingChange)
    }
  }, [room])

  const remoteCount = Math.max(0, participants.length - 1)

  if (phase === "connected") {
    return (
      <div className="inline-flex items-center gap-2 rounded-full border border-success/30 bg-success/[0.06] px-2.5 py-1 text-[11px] font-semibold text-success">
        <span className="relative inline-flex h-2 w-2">
          <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
        </span>
        Connected
        {isRecording && (
          <>
            <span aria-hidden className="h-1 w-1 rounded-full bg-success/40" />
            <span className="inline-flex items-center gap-1 text-success/90">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-destructive" />
              Recording
            </span>
          </>
        )}
        <span aria-hidden className="h-1 w-1 rounded-full bg-success/40" />
        <span className="text-success/80">
          {remoteCount} student{remoteCount === 1 ? "" : "s"}
        </span>
      </div>
    )
  }

  if (phase === "reconnecting") {
    return (
      <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/40 bg-amber-500/[0.08] px-2.5 py-1 text-[11px] font-semibold text-amber-700">
        <RefreshCw className="h-3 w-3 animate-spin" />
        Reconnecting — class is still live, recording continues
      </div>
    )
  }

  // phase === "lost"
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-destructive/40 bg-destructive/10 px-2.5 py-1 text-[11px] font-semibold text-destructive">
      <WifiOff className="h-3 w-3" />
      Connection lost
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="ml-1 inline-flex items-center gap-1 rounded-full bg-destructive px-2 py-0.5 text-[10px] font-bold text-destructive-foreground transition-colors hover:bg-destructive/90"
      >
        <CheckCircle2 className="h-3 w-3" />
        Refresh & rejoin
      </button>
    </div>
  )
}
