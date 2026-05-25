"use client"

// Real-time "are you with me?" temperature check.
//
// The mechanic, copied from in-person classrooms: each student
// signals "with you" or "lost" without unmuting. Host sees a live
// ratio. When >30% of participants are lost, the host gets a one-time
// suggestion to slow down or ask a question.
//
// Architecture mirrors live-poll.ts: tenant-scoped localStorage as a
// poor-man's broadcast for the POC. Same browser session can see
// each tab's vote because of the shared storage event. Production
// swap to LiveKit data channel changes the IO layer only.
//
// Votes auto-expire every 2 minutes so the ratio reflects "current
// mood", not cumulative drift. A student who marked "lost" at the
// start of class shouldn't keep dragging the average down 40 minutes
// later.

import { useCallback, useEffect, useSyncExternalStore } from "react"
import { readCurrentTenantSlug } from "@/lib/tenant-store"

const VOTE_TTL_MS = 2 * 60 * 1000

export type ComprehensionVote = "with" | "lost"

interface VoteEntry {
  vote: ComprehensionVote
  ts: number
}

function key(sessionId: string): string {
  return `thebigclass.t.${readCurrentTenantSlug() ?? "default"}.comprehension.${sessionId}.v1`
}

function readVotes(sessionId: string): Record<string, VoteEntry> {
  if (typeof window === "undefined") return {}
  try {
    const raw = window.localStorage.getItem(key(sessionId))
    if (!raw) return {}
    const obj = JSON.parse(raw) as Record<string, VoteEntry>
    // Prune expired votes on every read so writers + readers see a
    // consistent picture without a separate cron.
    const now = Date.now()
    const cleaned: Record<string, VoteEntry> = {}
    let changed = false
    for (const [k, v] of Object.entries(obj)) {
      if (v && now - v.ts < VOTE_TTL_MS) {
        cleaned[k] = v
      } else {
        changed = true
      }
    }
    if (changed) writeVotes(sessionId, cleaned)
    return cleaned
  } catch {
    return {}
  }
}

function writeVotes(sessionId: string, votes: Record<string, VoteEntry>): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(key(sessionId), JSON.stringify(votes))
  } catch { /* private mode — best-effort */ }
}

export function castComprehensionVote(
  sessionId: string,
  userId: string,
  vote: ComprehensionVote | null,
): void {
  const current = readVotes(sessionId)
  if (vote === null) {
    delete current[userId]
  } else {
    current[userId] = { vote, ts: Date.now() }
  }
  writeVotes(sessionId, current)
  // Fire a synthetic storage event so subscribers in the same tab
  // also see the change (the native event fires only cross-tab).
  if (typeof window !== "undefined") {
    try {
      window.dispatchEvent(
        new StorageEvent("storage", { key: key(sessionId) }),
      )
    } catch { /* StorageEvent constructor unsupported — ignore */ }
  }
}

// React hook for both host (read-only summary) and student (their
// own vote). Uses useSyncExternalStore so React tears down its
// subscription cleanly on unmount.
export function useComprehensionVotes(sessionId: string) {
  const subscribe = useCallback(
    (cb: () => void) => {
      if (typeof window === "undefined") return () => {}
      const target = key(sessionId)
      function onStorage(e: StorageEvent) {
        if (e.key === null || e.key === target) cb()
      }
      window.addEventListener("storage", onStorage)
      // Also re-poll every ~10s to expire stale votes even when no
      // new votes are cast (the prune runs on read, so a poll forces
      // it).
      const id = window.setInterval(cb, 10_000)
      return () => {
        window.removeEventListener("storage", onStorage)
        window.clearInterval(id)
      }
    },
    [sessionId],
  )
  const getSnapshot = useCallback(() => {
    return JSON.stringify(readVotes(sessionId))
  }, [sessionId])
  const getServerSnapshot = useCallback(() => "{}", [])
  const serialized = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  return JSON.parse(serialized) as Record<string, VoteEntry>
}

export interface ComprehensionTally {
  withCount: number
  lostCount: number
  total: number
  lostRatio: number // 0..1 — fraction of votes that are "lost"
}

export function tallyComprehension(
  votes: Record<string, VoteEntry>,
): ComprehensionTally {
  let withCount = 0
  let lostCount = 0
  for (const v of Object.values(votes)) {
    if (v.vote === "with") withCount++
    else if (v.vote === "lost") lostCount++
  }
  const total = withCount + lostCount
  return {
    withCount,
    lostCount,
    total,
    lostRatio: total === 0 ? 0 : lostCount / total,
  }
}

// Self-pruning effect — clears your own vote when it ages out so the
// UI on the student side stays honest about "you currently have no
// vote". Used in the bar component below.
export function useExpireOwnVote(
  sessionId: string,
  userId: string,
  onExpire: () => void,
) {
  const votes = useComprehensionVotes(sessionId)
  const myVote = votes[userId]
  useEffect(() => {
    if (!myVote) return
    const remaining = VOTE_TTL_MS - (Date.now() - myVote.ts)
    if (remaining <= 0) {
      onExpire()
      return
    }
    const t = window.setTimeout(onExpire, remaining)
    return () => window.clearTimeout(t)
  }, [myVote, onExpire])
}
