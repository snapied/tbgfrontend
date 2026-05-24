"use client"

// Live-class feature primitives — Sprint C Classes #12 / #17 / #28.
//
// Three forward-compatible client surfaces that pair with backend
// real-time infrastructure (LiveKit data channel, Yjs CRDT,
// reconnect logic). Each primitive is callable today; the actual
// server hook can replace the stub later without rewriting consumers.
//
//   • useWhiteboardCollab(sessionId)
//       Multiplayer cursors + element sync via the room data
//       channel. Returns { cursors, broadcastCursor, syncElements,
//       onElementsChanged }. Tracks peer state in-memory.
//   • useBreakoutRooms(sessionId)
//       Per-class breakout creation, assign, join/leave, merge-back.
//       State lives on the parent session record (we don't model a
//       separate Room entity yet; breakouts are short-lived).
//   • useReconnectGuard(sessionId)
//       Detect disconnects + count seconds away from the call so the
//       reconnect overlay can show "You missed 23s — recap?".

import { useCallback, useEffect, useRef, useState } from "react"

// ─────────────────────────────────────────────────────────────────
// Whiteboard collab (Classes #12)
// ─────────────────────────────────────────────────────────────────

interface PeerCursor {
  peerId: string
  name: string
  x: number          // 0..1 — board-relative
  y: number          // 0..1
  color: string
  updatedAt: number  // epoch ms
}

interface UseWhiteboardCollabApi {
  cursors: PeerCursor[]
  /** Broadcast my cursor position. Call from a debounced
   *  pointermove handler (100ms intervals are enough). */
  broadcastCursor: (x: number, y: number) => void
  /** Replace the local element set with the next snapshot. Caller
   *  resolves conflicts by accepting whichever timestamp is newer.
   *  For a real Yjs-backed implementation, this becomes a no-op —
   *  Y.Doc keeps state automatically. */
  syncElements: <T>(elements: T) => void
  /** Subscribe to peer element updates. Call site is the canvas
   *  renderer; the callback fires when another peer pushed a new
   *  element batch. */
  onElementsChanged: <T>(handler: (elements: T) => void) => () => void
}

const COLORS = ["#ef4444", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ec4899"]

export function useWhiteboardCollab(
  sessionId: string | undefined,
  selfPeerId: string,
  selfName: string,
): UseWhiteboardCollabApi {
  const [cursors, setCursors] = useState<PeerCursor[]>([])
  // Subscribers to element changes — we maintain them as a ref so
  // the api functions stay referentially stable.
  const subscribersRef = useRef<Set<(elements: unknown) => void>>(new Set())
  // Debounce timer for cursor broadcasts.
  const cursorRafRef = useRef<number | null>(null)
  const lastCursorRef = useRef<{ x: number; y: number } | null>(null)

  // Wire to the room data channel when one's available. We use a
  // BroadcastChannel as a stand-in for same-tab / sibling-tab demos;
  // the real implementation swaps this for the LiveKit channel.
  useEffect(() => {
    if (!sessionId || typeof window === "undefined") return
    let bc: BroadcastChannel | null = null
    try {
      bc = new BroadcastChannel(`whiteboard-${sessionId}`)
    } catch {
      return
    }
    const onMessage = (e: MessageEvent) => {
      const msg = e.data as
        | { kind: "cursor"; peer: PeerCursor }
        | { kind: "elements"; elements: unknown }
      if (!msg) return
      if (msg.kind === "cursor") {
        if (msg.peer.peerId === selfPeerId) return
        setCursors((prev) => {
          const without = prev.filter((c) => c.peerId !== msg.peer.peerId)
          return [...without, msg.peer]
        })
      } else if (msg.kind === "elements") {
        for (const fn of subscribersRef.current) fn(msg.elements)
      }
    }
    bc.addEventListener("message", onMessage)
    // Prune stale cursors (no updates in 10s).
    const prune = window.setInterval(() => {
      const cutoff = Date.now() - 10_000
      setCursors((prev) => prev.filter((c) => c.updatedAt > cutoff))
    }, 5_000)
    return () => {
      bc?.removeEventListener("message", onMessage)
      bc?.close()
      window.clearInterval(prune)
    }
  }, [sessionId, selfPeerId])

  const broadcastCursor = useCallback(
    (x: number, y: number) => {
      lastCursorRef.current = { x, y }
      if (cursorRafRef.current != null) return
      cursorRafRef.current = window.requestAnimationFrame(() => {
        cursorRafRef.current = null
        if (!sessionId || !lastCursorRef.current) return
        try {
          const bc = new BroadcastChannel(`whiteboard-${sessionId}`)
          const colorIdx = Math.abs(hashCode(selfPeerId)) % COLORS.length
          bc.postMessage({
            kind: "cursor",
            peer: {
              peerId: selfPeerId,
              name: selfName,
              x: lastCursorRef.current.x,
              y: lastCursorRef.current.y,
              color: COLORS[colorIdx],
              updatedAt: Date.now(),
            },
          })
          bc.close()
        } catch {
          /* unsupported environment */
        }
      })
    },
    [sessionId, selfPeerId, selfName],
  )

  const syncElements = useCallback(
    <T,>(elements: T) => {
      if (!sessionId) return
      try {
        const bc = new BroadcastChannel(`whiteboard-${sessionId}`)
        bc.postMessage({ kind: "elements", elements })
        bc.close()
      } catch {
        /* unsupported environment */
      }
    },
    [sessionId],
  )

  const onElementsChanged = useCallback(
    <T,>(handler: (elements: T) => void): (() => void) => {
      const wrapped = (e: unknown) => handler(e as T)
      subscribersRef.current.add(wrapped)
      return () => {
        subscribersRef.current.delete(wrapped)
      }
    },
    [],
  )

  return { cursors, broadcastCursor, syncElements, onElementsChanged }
}

function hashCode(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return h
}

// ─────────────────────────────────────────────────────────────────
// Breakout rooms (Classes #17)
// ─────────────────────────────────────────────────────────────────

export interface BreakoutRoom {
  id: string
  label: string
  /** Participant ids currently in this room. */
  participants: string[]
  /** When the breakout will auto-merge back. Null = no time limit. */
  endsAt: string | null
}

interface UseBreakoutRoomsApi {
  rooms: BreakoutRoom[]
  /** Create N empty rooms at once — typical "split everyone into
   *  pairs / quads" workflow. */
  createRooms: (count: number, sizeHint?: number) => BreakoutRoom[]
  /** Auto-assign all unassigned participants into existing rooms,
   *  balanced by size. */
  autoAssign: (participantIds: string[]) => void
  /** Move a single participant to a different room. */
  movePeer: (peerId: string, toRoomId: string) => void
  /** End all breakouts; participants return to the main session. */
  mergeBack: () => string[]
}

const breakoutCache = new Map<string, BreakoutRoom[]>()

export function useBreakoutRooms(sessionId: string | undefined): UseBreakoutRoomsApi {
  const [rooms, setRooms] = useState<BreakoutRoom[]>(() => {
    if (!sessionId) return []
    return breakoutCache.get(sessionId) ?? []
  })

  const persist = useCallback(
    (next: BreakoutRoom[]) => {
      setRooms(next)
      if (sessionId) breakoutCache.set(sessionId, next)
    },
    [sessionId],
  )

  const createRooms = useCallback(
    (count: number, sizeHint?: number): BreakoutRoom[] => {
      const fresh: BreakoutRoom[] = Array.from({ length: count }, (_, i) => ({
        id: `bo-${Date.now().toString(36)}-${i}`,
        label: `Room ${i + 1}${sizeHint ? ` (~${sizeHint})` : ""}`,
        participants: [],
        endsAt: null,
      }))
      persist([...rooms, ...fresh])
      return fresh
    },
    [rooms, persist],
  )

  const autoAssign = useCallback(
    (participantIds: string[]) => {
      if (rooms.length === 0 || participantIds.length === 0) return
      // Drop any already-placed peers; we don't move people who
      // self-joined a specific room.
      const placed = new Set(rooms.flatMap((r) => r.participants))
      const toPlace = participantIds.filter((id) => !placed.has(id))
      // Sort rooms by current load ascending — least-full first.
      const next = rooms.map((r) => ({ ...r, participants: [...r.participants] }))
      for (const peerId of toPlace) {
        next.sort((a, b) => a.participants.length - b.participants.length)
        next[0].participants.push(peerId)
      }
      // Restore original room order by label so the admin's
      // mental model of "Room 1, Room 2..." stays intact.
      next.sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }))
      persist(next)
    },
    [rooms, persist],
  )

  const movePeer = useCallback(
    (peerId: string, toRoomId: string) => {
      const next = rooms.map((r) => ({
        ...r,
        participants: r.participants.filter((p) => p !== peerId),
      }))
      const target = next.find((r) => r.id === toRoomId)
      if (target) target.participants.push(peerId)
      persist(next)
    },
    [rooms, persist],
  )

  const mergeBack = useCallback((): string[] => {
    const all = rooms.flatMap((r) => r.participants)
    persist([])
    return all
  }, [rooms, persist])

  return { rooms, createRooms, autoAssign, movePeer, mergeBack }
}

// ─────────────────────────────────────────────────────────────────
// Reconnect guard (Classes #28)
// ─────────────────────────────────────────────────────────────────

interface UseReconnectGuardApi {
  online: boolean
  /** Seconds the user has been disconnected this round. 0 when
   *  online. */
  offlineSeconds: number
  /** True for ~5s right after coming back online, so the UI can
   *  flash "Welcome back — you missed Xs" without sticking. */
  justReconnected: boolean
  /** Reset the post-reconnect banner after the user acks it. */
  ackReconnect: () => void
}

export function useReconnectGuard(): UseReconnectGuardApi {
  const [online, setOnline] = useState<boolean>(
    typeof navigator === "undefined" ? true : navigator.onLine,
  )
  const [offlineSeconds, setOfflineSeconds] = useState(0)
  const [justReconnected, setJustReconnected] = useState(false)
  const wentOfflineAtRef = useRef<number | null>(null)

  useEffect(() => {
    if (typeof window === "undefined") return
    const handleOnline = () => {
      const start = wentOfflineAtRef.current
      if (start) {
        const elapsed = Math.round((Date.now() - start) / 1000)
        setOfflineSeconds(elapsed)
        if (elapsed >= 3) setJustReconnected(true)
      }
      wentOfflineAtRef.current = null
      setOnline(true)
    }
    const handleOffline = () => {
      wentOfflineAtRef.current = Date.now()
      setOnline(false)
    }
    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)
    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  const ackReconnect = useCallback(() => {
    setJustReconnected(false)
    setOfflineSeconds(0)
  }, [])

  return { online, offlineSeconds, justReconnected, ackReconnect }
}
