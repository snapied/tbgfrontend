"use client"

// Live polls for in-class engagement.
//
// Architecture mirrors lobby-presence: tenant-scoped localStorage
// as a poor-man's broadcast channel for the POC. The same browser
// shared across tabs sees the same poll/votes; production swaps
// the storage layer for LiveKit's data channel without changing
// the host/student components.
//
// One poll per session at a time. Launching a new poll closes the
// previous one (snapshotted into a recap log on the session
// record at End — separate from this hot-state cache).

import { useEffect, useState } from "react"
import { readCurrentTenantSlug } from "@/lib/tenant-store"

const POLL_KEY = (sessionId: string) =>
  `thebigclass.t.${readCurrentTenantSlug() ?? "default"}.poll.${sessionId}.v1`

export interface LivePollOption {
  id: string
  label: string
}

export interface LivePoll {
  id: string
  question: string
  options: LivePollOption[]
  /** ISO. New polls reset votes — `launchedAt` doubles as the
   *  cache-bust so a student who voted on the previous poll can
   *  vote again on the new one. */
  launchedAt: string
  /** When set, students can no longer change their vote — the
   *  host has "closed" the poll. Visible results stay rendered. */
  closedAt?: string
  /** `userId → optionId`. Stored inline so a single localStorage
   *  read covers both the poll meta and the tally. */
  votes: Record<string, string>
}

function read(sessionId: string): LivePoll | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.localStorage.getItem(POLL_KEY(sessionId))
    if (!raw) return null
    const obj = JSON.parse(raw) as LivePoll
    return obj && typeof obj === "object" && obj.id ? obj : null
  } catch {
    return null
  }
}

function write(sessionId: string, poll: LivePoll | null): void {
  if (typeof window === "undefined") return
  try {
    if (poll === null) {
      window.localStorage.removeItem(POLL_KEY(sessionId))
    } else {
      window.localStorage.setItem(POLL_KEY(sessionId), JSON.stringify(poll))
    }
  } catch {
    /* private mode — best-effort */
  }
}

/** Host action: launch a new poll. Replaces any existing one. */
export function launchPoll(
  sessionId: string,
  args: { question: string; optionLabels: string[] },
): LivePoll {
  const poll: LivePoll = {
    id: `poll-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    question: args.question.trim(),
    options: args.optionLabels
      .map((label, i) => ({
        id: `opt-${i}`,
        label: label.trim(),
      }))
      .filter((o) => o.label),
    launchedAt: new Date().toISOString(),
    votes: {},
  }
  write(sessionId, poll)
  return poll
}

/** Host action: close the poll. Locks votes but keeps results
 *  visible. Students see "Poll closed — final results". */
export function closePoll(sessionId: string): void {
  const cur = read(sessionId)
  if (!cur) return
  write(sessionId, { ...cur, closedAt: new Date().toISOString() })
}

/** Host action: clear the poll entirely — removes it from the
 *  shared channel so students no longer see anything. */
export function clearPoll(sessionId: string): void {
  write(sessionId, null)
}

/** Student action: cast / change vote. No-op if the poll is
 *  closed or the option id isn't recognised. */
export function castVote(sessionId: string, userId: string, optionId: string): void {
  const cur = read(sessionId)
  if (!cur || cur.closedAt) return
  if (!cur.options.some((o) => o.id === optionId)) return
  write(sessionId, { ...cur, votes: { ...cur.votes, [userId]: optionId } })
}

/** Both host + student hook. Returns the live poll (null if none).
 *  Polls every 1.5s + listens to the storage event so cross-tab
 *  writes show up without needing to refresh. */
export function useLivePoll(sessionId: string, pollMs = 1500): LivePoll | null {
  const [poll, setPoll] = useState<LivePoll | null>(() => read(sessionId))
  useEffect(() => {
    if (!sessionId) return
    const refresh = () => setPoll(read(sessionId))
    refresh()
    const id = window.setInterval(refresh, pollMs)
    const onStorage = (e: StorageEvent) => {
      if (e.key === POLL_KEY(sessionId)) refresh()
    }
    window.addEventListener("storage", onStorage)
    return () => {
      window.clearInterval(id)
      window.removeEventListener("storage", onStorage)
    }
  }, [sessionId, pollMs])
  return poll
}

/** Helper for the result bar — returns [{ optionId, count, pct }]
 *  in the original option order so the UI stays stable as votes
 *  arrive. */
export function tallyPoll(poll: LivePoll): Array<{ optionId: string; label: string; count: number; pct: number }> {
  const total = Object.keys(poll.votes).length
  return poll.options.map((opt) => {
    const count = Object.values(poll.votes).filter((v) => v === opt.id).length
    return {
      optionId: opt.id,
      label: opt.label,
      count,
      pct: total === 0 ? 0 : Math.round((count / total) * 100),
    }
  })
}
