"use client"

// Tiny WebRTC signalling channel.
//
// We exchange SDP offers/answers + ICE candidates between the host
// and the student via BroadcastChannel (when available) with a
// localStorage-event fallback. Both run same-origin so the only
// real constraint is "both tabs in the same browser" — sufficient
// for a 1-on-1 demo, mock interviews, or the teacher running the
// classroom from their primary device with students on the same
// machine.
//
// To upgrade to cross-browser / cross-network: swap the underlying
// transport for a backend route (POST /api/live/signal, GET for
// long-poll). The signal envelope shape stays the same.

export type SignalKind = "offer" | "answer" | "ice" | "hello" | "bye"

export interface Signal {
  kind: SignalKind
  from: "host" | "student"
  to: "host" | "student"
  payload: unknown
  ts: number
}

type Listener = (s: Signal) => void

// Pull-channel: each room gets its own keyed channel/storage namespace
// so multiple concurrent rooms in the same browser don't crosstalk.
export function createSignalChannel(roomCode: string) {
  const key = `thebigclass.live-signal.${roomCode}`
  const channelName = `thebigclass-live-${roomCode}`
  const listeners = new Set<Listener>()

  // BroadcastChannel is the cleaner transport — instant delivery,
  // no polling. Falls back to localStorage events when it's not
  // supported (e.g. Safari < 15.4 or some embedded webviews).
  const bc = typeof BroadcastChannel !== "undefined"
    ? new BroadcastChannel(channelName)
    : null

  function deliver(s: Signal) {
    for (const fn of listeners) {
      try { fn(s) } catch { /* listener bug shouldn't crash the channel */ }
    }
  }

  if (bc) {
    bc.onmessage = (e) => deliver(e.data as Signal)
  } else if (typeof window !== "undefined") {
    window.addEventListener("storage", (e) => {
      if (e.key !== key || !e.newValue) return
      try {
        const s = JSON.parse(e.newValue) as Signal
        deliver(s)
      } catch { /* malformed signal — skip */ }
    })
  }

  return {
    /**
     * Push a signal out. Other tabs/peers in the same channel will
     * receive it via their `onSignal` listener.
     */
    send(s: Omit<Signal, "ts">) {
      const full: Signal = { ...s, ts: Date.now() }
      if (bc) {
        bc.postMessage(full)
        return
      }
      if (typeof window === "undefined") return
      // localStorage write fires a `storage` event in OTHER tabs.
      // The writing tab doesn't see its own event, which is what
      // we want (no self-loop).
      try {
        window.localStorage.setItem(key, JSON.stringify(full))
      } catch {
        /* quota — non-fatal for signalling, just means slow path */
      }
    },

    /**
     * Subscribe to incoming signals. Returns an unsubscribe fn.
     */
    onSignal(fn: Listener): () => void {
      listeners.add(fn)
      return () => listeners.delete(fn)
    },

    /** Tear the channel down. */
    close() {
      listeners.clear()
      if (bc) bc.close()
    },
  }
}

// Public STUN servers — free, unlimited, no signup. Google's are
// the canonical pair; Cloudflare's are a backup if Google is
// blocked on a particular network. We don't use a TURN server, so
// peers behind symmetric NATs won't connect — fine for 1-on-1 on
// the same network and most home/office setups; production-grade
// reliability would require a TURN service (paid).
export const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun.cloudflare.com:3478" },
]
