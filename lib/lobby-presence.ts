"use client"

// Lobby presence — lightweight "who's actually in the waiting
// room right now" channel for live classes.
//
// Why this exists: the host's preflight used to show
// "12 students enrolled" as the audience count. The real number
// that matters before clicking Open Room is "12 enrolled → but
// only 2 are actually here waiting." That gap turned every
// pre-class minute into a guessing game.
//
// Implementation is intentionally not a server endpoint — for the
// POC, all participants in the same browser-shared tenant write
// the same tenant-scoped localStorage key. Each ping carries a
// fresh timestamp; stale entries (>15s old) are pruned on read.
// The host page polls this every 3s to render a live count.
//
// Production would swap the localStorage tier for a real
// websocket/SSE channel; the API surface (pingPresence /
// readPresence / usePresence) stays the same.

import { useEffect, useState } from "react"
import { readCurrentTenantSlug } from "@/lib/tenant-store"

const KEY = (sessionId: string) =>
  `thebigclass.t.${readCurrentTenantSlug() ?? "default"}.lobby.${sessionId}.v1`
// Entries older than this are treated as departed. 15s is enough
// to ride out a single missed ping (we ping every 5s) without
// holding a ghost student's slot when their tab crashed.
const STALE_MS = 15_000

export interface LobbyPresence {
  userId: string
  name: string
  /** ISO timestamp of the most recent ping. */
  lastSeenAt: string
}

function readMap(sessionId: string): Record<string, LobbyPresence> {
  if (typeof window === "undefined") return {}
  try {
    const raw = window.localStorage.getItem(KEY(sessionId))
    if (!raw) return {}
    const obj = JSON.parse(raw) as Record<string, LobbyPresence>
    return obj && typeof obj === "object" ? obj : {}
  } catch {
    return {}
  }
}

function writeMap(sessionId: string, next: Record<string, LobbyPresence>): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(KEY(sessionId), JSON.stringify(next))
  } catch {
    /* private mode / quota — presence is best-effort */
  }
}

/** Returns the list of fresh-enough entries, newest-ping first.
 *  Prunes stale rows as a side effect so the storage doesn't bloat
 *  across many ended classes. */
export function readPresence(sessionId: string): LobbyPresence[] {
  const map = readMap(sessionId)
  const now = Date.now()
  const fresh: Record<string, LobbyPresence> = {}
  for (const [id, entry] of Object.entries(map)) {
    if (now - Date.parse(entry.lastSeenAt) <= STALE_MS) fresh[id] = entry
  }
  if (Object.keys(fresh).length !== Object.keys(map).length) {
    writeMap(sessionId, fresh)
  }
  return Object.values(fresh).sort((a, b) =>
    b.lastSeenAt.localeCompare(a.lastSeenAt),
  )
}

/** Student-side ping — call once on mount + on an interval. */
export function pingPresence(sessionId: string, user: { id: string; name: string }): void {
  const map = readMap(sessionId)
  map[user.id] = {
    userId: user.id,
    name: user.name,
    lastSeenAt: new Date().toISOString(),
  }
  writeMap(sessionId, map)
}

/** Explicit departure — call when the student navigates away
 *  (page hide). Prevents the host from seeing a ghost entry for
 *  ~15s after the student left. */
export function clearPresence(sessionId: string, userId: string): void {
  const map = readMap(sessionId)
  delete map[userId]
  writeMap(sessionId, map)
}

/** Host-side hook — returns the current waiting list, refreshed
 *  every `pollMs` and on the storage event so cross-tab writes
 *  (the typical case: students in different tabs) propagate. */
export function usePresence(sessionId: string, pollMs = 3000): LobbyPresence[] {
  const [list, setList] = useState<LobbyPresence[]>(() => readPresence(sessionId))
  useEffect(() => {
    if (!sessionId) return
    const refresh = () => setList(readPresence(sessionId))
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
  return list
}
