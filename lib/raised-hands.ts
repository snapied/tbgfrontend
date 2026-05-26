"use client"

// Raised-hand queue — students signal "I have a question" without
// unmuting and interrupting the host.
//
// Channel: tenant-scoped localStorage (same pattern as lobby-
// presence + live-polls). Student writes their entry on Raise;
// removes on Lower or when the host marks them "answered." Host
// reads via useRaisedHands hook (polls every 1.5s + listens for
// the `storage` event so cross-tab writes propagate).
//
// Queue ordering = raisedAt asc — first hand up gets the host's
// attention first. The host's "Mark as answered" action also
// posts an in-app notification to the student (the chip on their
// floating Hand button flips to "Answered" briefly before being
// cleared) — those plumbed at the call site, not in this lib.

import { useEffect, useState } from "react"
import { readCurrentTenantSlug } from "@/lib/tenant-store"

const KEY = (sessionId: string) =>
  `thebigclass.t.${readCurrentTenantSlug() ?? "default"}.hands.${sessionId}.v1`

export interface RaisedHand {
  userId: string
  name: string
  /** ISO timestamp the student raised. Queue sort key. */
  raisedAt: string
  /**
   * "public"  — default. Question is for the whole room — host will
   *             typically unmute the student to ask it.
   * "private" — Student wants a 1:1 answer. Host sees a different
   *             colour in the queue + can DM instead of unmuting.
   * Legacy entries (no visibility field) treat as "public".
   */
  visibility?: "public" | "private"
}

function readMap(sessionId: string): Record<string, RaisedHand> {
  if (typeof window === "undefined") return {}
  try {
    const raw = window.localStorage.getItem(KEY(sessionId))
    if (!raw) return {}
    const obj = JSON.parse(raw) as Record<string, RaisedHand>
    return obj && typeof obj === "object" ? obj : {}
  } catch {
    return {}
  }
}

function writeMap(sessionId: string, next: Record<string, RaisedHand>): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(KEY(sessionId), JSON.stringify(next))
  } catch {
    /* private mode / quota — hand-raise is best-effort */
  }
}

function emitLocalChange(sessionId: string, action: any) {
  if (typeof window === "undefined") return
  window.dispatchEvent(new CustomEvent("tbc-raised-hands-local-change", {
    detail: { sessionId, ...action }
  }))
}

/** Student action: raise hand. Idempotent — re-raising bumps the
 *  timestamp which would push them to the back; we keep the
 *  original raisedAt when already in the queue so cheating by
 *  spamming the button doesn't reset position. Switching visibility
 *  on an already-raised hand updates the flag without losing the
 *  queue position. */
export function raiseHand(
  sessionId: string,
  user: { id: string; name: string },
  visibility: "public" | "private" = "public",
): void {
  const map = readMap(sessionId)
  if (map[user.id]) {
    if (map[user.id].visibility !== visibility) {
      map[user.id] = { ...map[user.id], visibility }
      writeMap(sessionId, map)
      emitLocalChange(sessionId, { type: "RAISE", user, visibility })
    }
    return
  }
  map[user.id] = {
    userId: user.id,
    name: user.name,
    raisedAt: new Date().toISOString(),
    visibility,
  }
  writeMap(sessionId, map)
  emitLocalChange(sessionId, { type: "RAISE", user, visibility })
}

/** Student action: lower hand. No-op if not raised. */
export function lowerHand(sessionId: string, userId: string): void {
  const map = readMap(sessionId)
  if (!map[userId]) return
  delete map[userId]
  writeMap(sessionId, map)
  emitLocalChange(sessionId, { type: "LOWER", userId })
}

/** Host action: mark a hand answered. Removes from the queue the
 *  same way Lower does, but a host action is its own intent —
 *  the call site can fire an in-app notification to the student
 *  ("Your question was answered"). */
export function answerHand(sessionId: string, userId: string): void {
  lowerHand(sessionId, userId)
  emitLocalChange(sessionId, { type: "ANSWER", userId })
}

/** Host action: clear ALL hands. Useful when the queue is stale
 *  (e.g. host took everyone's question in one round). */
export function clearAllHands(sessionId: string): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.removeItem(KEY(sessionId))
    emitLocalChange(sessionId, { type: "CLEAR" })
  } catch {
    /* ignore */
  }
}

/** Internal: apply an update received from LiveKit DataChannel.
 *  Modifies local storage directly so `useRaisedHands` picks it up,
 *  but deliberately skips `emitLocalChange` to avoid a broadcast loop. */
export function _applyNetworkSync(sessionId: string, action: any): void {
  const map = readMap(sessionId)
  if (action.type === "RAISE") {
    map[action.user.id] = {
      userId: action.user.id,
      name: action.user.name,
      raisedAt: action.raisedAt || new Date().toISOString(),
      visibility: action.visibility,
    }
  } else if (action.type === "LOWER" || action.type === "ANSWER") {
    delete map[action.userId]
  } else if (action.type === "CLEAR") {
    if (typeof window !== "undefined") window.localStorage.removeItem(KEY(sessionId))
    return
  }
  writeMap(sessionId, map)
}

/** Read-only snapshot, sorted oldest-first (first hand-up wins). */
export function readRaisedHands(sessionId: string): RaisedHand[] {
  return Object.values(readMap(sessionId)).sort((a, b) =>
    a.raisedAt.localeCompare(b.raisedAt),
  )
}

/** Both host + student hook. Returns the live queue (sorted
 *  oldest-first). Polls every `pollMs` and listens to storage
 *  events for cross-tab updates. */
export function useRaisedHands(sessionId: string, pollMs = 1500): RaisedHand[] {
  const [hands, setHands] = useState<RaisedHand[]>(() => readRaisedHands(sessionId))
  useEffect(() => {
    if (!sessionId) return
    const refresh = () => setHands(readRaisedHands(sessionId))
    refresh()
    const id = window.setInterval(refresh, pollMs)
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY(sessionId)) refresh()
    }
    window.addEventListener("storage", onStorage)
    return () => {
      window.clearInterval(id)
      window.removeEventListener("storage", onStorage)
    }
  }, [sessionId, pollMs])
  return hands
}

/** Convenience hook: is THIS viewer's hand currently raised?
 *  Used by the student button to flip its label between
 *  "Raise hand" and "Lower hand (#N in queue)". */
export function useMyHandState(sessionId: string, userId: string): { raised: boolean; positionInQueue: number } {
  const hands = useRaisedHands(sessionId)
  const idx = hands.findIndex((h) => h.userId === userId)
  return { raised: idx >= 0, positionInQueue: idx >= 0 ? idx + 1 : 0 }
}
