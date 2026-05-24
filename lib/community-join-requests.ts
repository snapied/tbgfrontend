"use client"

// Per-community join requests — Sprint C Communities #24.
//
// Backs the "approve-each-member" community join policy. When a
// visitor hits a community with that policy, instead of adding them
// to memberIds we land a JoinRequest here. Admins see a "Pending"
// tab with cards showing name + "why I want to join" + mutual
// communities + a bulk approve action.
//
// Storage:
//   `thebigclass.t.<slug>.community-joins.<communityId>` →
//     { requests: JoinRequest[] }
//
// Promotion path: an approve() call removes the entry here AND
// returns the resolved userId so the caller can fire
// addStudentsToGroup(communityId, [userId]). Keeping the two writes
// separate lets us add other side-effects (welcome DM, analytics
// event) without coupling them to the store internals.

import { useCallback, useEffect, useMemo, useState } from "react"

export interface JoinRequest {
  id: string
  userId: string
  /** Whatever the join form asked — "Why I want to join", typically.
   *  Empty string when the policy didn't collect any context. */
  message: string
  createdAt: string
}

interface JoinRecord {
  requests: JoinRequest[]
}

function storageKey(tenantSlug: string, communityId: string): string {
  return `thebigclass.t.${tenantSlug || "default"}.community-joins.${communityId}`
}

function readJoins(key: string): JoinRecord {
  if (typeof window === "undefined") return { requests: [] }
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return { requests: [] }
    const parsed = JSON.parse(raw) as Partial<JoinRecord>
    return { requests: Array.isArray(parsed.requests) ? parsed.requests : [] }
  } catch {
    return { requests: [] }
  }
}

function writeJoins(key: string, record: JoinRecord): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(key, JSON.stringify(record))
    window.dispatchEvent(new CustomEvent("community-joins-changed"))
  } catch {
    /* best-effort */
  }
}

export interface UseJoinRequestsApi {
  requests: JoinRequest[]
  /** File a fresh request. Idempotent on `userId` — a duplicate
   *  request from the same user replaces the previous one (keeps
   *  the latest message). */
  request: (userId: string, message: string) => JoinRequest
  /** Approve a request and remove it from the queue. Returns the
   *  userId so the caller can promote them into membership. */
  approve: (id: string) => string | null
  /** Reject and remove. No memory of rejection — we trust the user
   *  not to spam. */
  reject: (id: string) => void
  /** Bulk approve every queued request — returns the userIds. */
  approveAll: () => string[]
}

export function useJoinRequests(
  tenantSlug: string,
  communityId: string | undefined,
): UseJoinRequestsApi {
  const key = useMemo(
    () => (communityId ? storageKey(tenantSlug, communityId) : null),
    [tenantSlug, communityId],
  )
  const [record, setRecord] = useState<JoinRecord>({ requests: [] })

  useEffect(() => {
    if (!key) return
    const refresh = () => setRecord(readJoins(key))
    refresh()
    window.addEventListener("community-joins-changed", refresh)
    window.addEventListener("storage", refresh)
    return () => {
      window.removeEventListener("community-joins-changed", refresh)
      window.removeEventListener("storage", refresh)
    }
  }, [key])

  const request = useCallback(
    (userId: string, message: string): JoinRequest => {
      const entry: JoinRequest = {
        id: `jr-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
        userId,
        message: message.trim(),
        createdAt: new Date().toISOString(),
      }
      const filtered = record.requests.filter((r) => r.userId !== userId)
      const next = { requests: [entry, ...filtered] }
      if (key) writeJoins(key, next)
      setRecord(next)
      return entry
    },
    [key, record.requests],
  )

  const approve = useCallback(
    (id: string): string | null => {
      const target = record.requests.find((r) => r.id === id)
      if (!target) return null
      const next = { requests: record.requests.filter((r) => r.id !== id) }
      if (key) writeJoins(key, next)
      setRecord(next)
      return target.userId
    },
    [key, record.requests],
  )

  const reject = useCallback(
    (id: string) => {
      const next = { requests: record.requests.filter((r) => r.id !== id) }
      if (key) writeJoins(key, next)
      setRecord(next)
    },
    [key, record.requests],
  )

  const approveAll = useCallback((): string[] => {
    const userIds = record.requests.map((r) => r.userId)
    const next = { requests: [] }
    if (key) writeJoins(key, next)
    setRecord(next)
    return userIds
  }, [key, record.requests])

  return { requests: record.requests, request, approve, reject, approveAll }
}
