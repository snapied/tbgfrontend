"use client"

// Robust host → backend live-state sync. Lives inside the host's
// LiveKitRoom and pushes state="live" to the backend the moment the
// host's call is actually connected, then keeps re-pushing every
// 30 seconds for as long as the host stays in the room.
//
// Why a beacon and not just the "Open the room" button:
//   1. The original openLiveRoom / startLiveRoom calls happen
//      BEFORE the LiveKit room actually connects. If anything in
//      that path silently fails (network blip, missing auth token,
//      stale session in store), the backend never flips and
//      students get stuck in the lobby forever.
//   2. A host who landed directly on the host URL and joined the
//      call without clicking "Open the room" should still admit
//      students. The beacon makes the "host is actually in the
//      LiveKit room" signal authoritative, not a button click.
//   3. The heartbeat re-issues the push every 30s so transient
//      auth blips (token refreshed mid-class) self-heal within
//      one cycle — students never sit in a stale waiting room.
//
// On disconnect we DON'T push "ended" — that's an explicit
// teacher action via the End class button. A network drop should
// not boot students out.

import { useEffect, useRef } from "react"
import { useMaybeRoomContext } from "@livekit/components-react"
import { ConnectionState, RoomEvent } from "livekit-client"
import { pushRoomState } from "@/lib/live-room-state"

interface Props {
  /** Room code as known to /api/live-sessions/<roomCode>/state. */
  roomCode: string
  /** Session metadata; passed through so the backend row has
   *  scheduledAt + title even if a previous push raced this one. */
  scheduledAt?: string
  durationMinutes?: number
  title?: string
  hostName?: string
}

export function LiveStateBeacon({
  roomCode,
  scheduledAt,
  durationMinutes,
  title,
  hostName,
}: Props) {
  const room = useMaybeRoomContext()
  // Coalesce in-flight pushes so a fast reconnect cycle doesn't
  // queue six PUTs back-to-back.
  const lastSentRef = useRef<number>(0)

  useEffect(() => {
    if (!room || !roomCode) return

    const push = () => {
      const now = Date.now()
      // Throttle: at most one push per 10s irrespective of cause.
      if (now - lastSentRef.current < 10_000) return
      lastSentRef.current = now
      void pushRoomState(roomCode, {
        state: "live",
        scheduledAt: scheduledAt ?? null,
        durationMinutes: durationMinutes ?? null,
        title: title ?? null,
        hostName: hostName ?? null,
      })
    }

    const onConnected = () => push()
    const onReconnected = () => push()

    // Fire once immediately if we're already connected when the
    // component mounts (Strict Mode / re-render races).
    if (room.state === ConnectionState.Connected) push()

    room.on(RoomEvent.Connected, onConnected)
    room.on(RoomEvent.Reconnected, onReconnected)

    // Heartbeat — re-affirm state every 30s. Cheap (one tiny PUT),
    // and means a transient backend hiccup auto-recovers on the
    // next tick instead of leaving students stuck.
    const heartbeat = setInterval(push, 30_000)

    return () => {
      room.off(RoomEvent.Connected, onConnected)
      room.off(RoomEvent.Reconnected, onReconnected)
      clearInterval(heartbeat)
    }
  }, [room, roomCode, scheduledAt, durationMinutes, title, hostName])

  return null
}
