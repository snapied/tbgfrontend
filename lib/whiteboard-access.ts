"use client"

// Realtime "is the whiteboard open for students?" flag, scoped to a
// single LiveKit room. Built so the host can flip access during a
// live class and students see the change instantly — no refresh.
//
// Mechanism:
//   • Host calls setOpen(true|false) which (a) updates the host's
//     own state and (b) publishes a small payload on the LiveKit
//     data channel under a dedicated topic.
//   • Students subscribe to the same topic; the moment a payload
//     arrives they update their local state. They cannot publish
//     (the hook is no-op for non-hosts, and even if they tried,
//     hosts ignore inbound flips from non-hosts via the isLocal /
//     identity check on the receiver side).
//   • New joiners default to private. When the host opens, they
//     also re-broadcast on the next "participantConnected" event so
//     a freshly-joined student gets the current state without
//     having to wait for the next toggle.
//
// Default state is private — kids are naughty, and a wide-open
// canvas in a kids' class invites chaos. Host has to explicitly
// open it.

import { useCallback, useEffect, useRef, useState } from "react"
import { useMaybeRoomContext } from "@livekit/components-react"
import { RoomEvent, type RemoteParticipant } from "livekit-client"

const TOPIC = "wb-access"
const enc = new TextEncoder()
const dec = new TextDecoder()

interface AccessPayload {
  v: 1
  open: boolean
  // Identity of the sender. Students ignore packets that don't come
  // from a participant whose identity starts with "host-".
  from: string
  ts: number
}

export interface UseWhiteboardAccessResult {
  /** Current "students can draw" flag. False = private (host only). */
  isOpen: boolean
  /** Flip the access. No-op for non-hosts. */
  setOpen: (next: boolean) => void
  /** True when this hook believes a LiveKit room is connected. Used
   *  to decide whether to render the gated card vs assume open
   *  (offline whiteboard editor surface). */
  inRoom: boolean
  /** True when the previous render had !isOpen and this render has
   *  isOpen. Lets the consumer fire a toast on the rising edge. */
  justGranted: boolean
}

export function useWhiteboardAccess(isHost: boolean): UseWhiteboardAccessResult {
  const room = useMaybeRoomContext()
  // Default closed. Host-side state is the source of truth; student-
  // side state is updated by inbound data-channel packets only.
  const [isOpen, setIsOpen] = useState(false)
  const prevOpenRef = useRef(false)
  const [justGranted, setJustGranted] = useState(false)

  // Track the rising edge (false → true) so consumers can fire a
  // toast in a separate effect without missing the transition.
  useEffect(() => {
    const wasOpen = prevOpenRef.current
    if (!wasOpen && isOpen) {
      setJustGranted(true)
      // Clear the edge after a tick so a second render in the same
      // tick doesn't re-fire it. The consumer's effect runs first.
      const t = window.setTimeout(() => setJustGranted(false), 100)
      return () => window.clearTimeout(t)
    }
    prevOpenRef.current = isOpen
  }, [isOpen])

  // Receive inbound access packets. Only honor those from a "host-*"
  // identity — defence in depth so a student can't spoof an open.
  useEffect(() => {
    if (!room) return
    const onData = (payload: Uint8Array, participant?: RemoteParticipant) => {
      // Filter by topic. LiveKit gives us the raw bytes; we tagged
      // the topic at publish time below.
      try {
        const text = dec.decode(payload)
        const data = JSON.parse(text) as AccessPayload
        if (data.v !== 1 || typeof data.open !== "boolean") return
        // Only the host can flip access. Identity convention: hosts
        // join as `host-<sessionId>`, students as `student-<sessionId>`.
        const identity = participant?.identity ?? data.from ?? ""
        if (!identity.startsWith("host-")) return
        setIsOpen(data.open)
      } catch {
        /* malformed packet — ignore */
      }
    }
    // Subscribe to data with the access topic only. LiveKit's
    // dataReceived event fires for ALL topics; we filter by checking
    // the topic on the event itself when available, otherwise we
    // sniff the payload shape (covered by the JSON parse above).
    const handler = (
      payload: Uint8Array,
      participant?: RemoteParticipant,
      _kind?: unknown,
      topic?: string,
    ) => {
      if (topic && topic !== TOPIC) return
      onData(payload, participant)
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    room.on(RoomEvent.DataReceived, handler as any)
    return () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      room.off(RoomEvent.DataReceived, handler as any)
    }
  }, [room])

  // Rebroadcast the current state when a new participant joins, so a
  // freshly-arrived student sees the open state instead of being stuck
  // at the default "closed" until the next toggle.
  useEffect(() => {
    if (!room || !isHost) return
    const onJoin = () => {
      void publishOpenState(room, isHost, isOpen)
    }
    room.on(RoomEvent.ParticipantConnected, onJoin)
    return () => {
      room.off(RoomEvent.ParticipantConnected, onJoin)
    }
  }, [room, isHost, isOpen])

  const setOpen = useCallback(
    (next: boolean) => {
      if (!isHost) return
      setIsOpen(next)
      if (room) {
        void publishOpenState(room, isHost, next)
      }
    },
    [isHost, room],
  )

  return { isOpen, setOpen, inRoom: !!room, justGranted }
}

async function publishOpenState(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  room: any,
  isHost: boolean,
  open: boolean,
): Promise<void> {
  if (!isHost) return
  const payload: AccessPayload = {
    v: 1,
    open,
    from: room.localParticipant?.identity ?? "host",
    ts: Date.now(),
  }
  const bytes = enc.encode(JSON.stringify(payload))
  try {
    await room.localParticipant.publishData(bytes, {
      reliable: true,
      topic: TOPIC,
    })
  } catch {
    /* connection blip — next toggle / participant-join will resync */
  }
}
