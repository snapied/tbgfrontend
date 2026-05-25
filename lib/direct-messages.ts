"use client"

// Minimum-viable Direct Messages (C9).
//
// 1:1 only. No groups, no threading, no presence. Each DM is a
// single message in a long-running conversation between two users
// scoped to the workspace. Stored in tenant-scoped localStorage so
// every user in the same browser session sees their own messages;
// production swaps the storage layer for a Postgres table + a real
// notification dispatch without changing the consumer API.
//
// Storage shape (per tenant):
//   thebigclass.t.<slug>.dms.v1
//     → DirectMessage[]   (sorted by sentAt asc)
//
// Per-user filtering happens at read time — a viewer sees only DMs
// where they are sender or recipient. Read receipts piggy-back on
// the same record via `readAt: Record<userId, iso>`.

import { useCallback, useSyncExternalStore } from "react"
import { readCurrentTenantSlug } from "@/lib/tenant-store"

export interface DirectMessage {
  id: string
  senderId: string
  recipientId: string
  body: string
  sentAt: string
  /** ISO timestamp the recipient marked this message read. Absent
   *  while unread. */
  readAt?: string
}

function storageKey(): string | null {
  if (typeof window === "undefined") return null
  const slug = readCurrentTenantSlug()
  if (!slug) return null
  return `thebigclass.t.${slug}.dms.v1`
}

function readAll(): DirectMessage[] {
  const k = storageKey()
  if (!k) return []
  try {
    const raw = window.localStorage.getItem(k)
    if (!raw) return []
    const parsed = JSON.parse(raw) as DirectMessage[]
    return Array.isArray(parsed) ? parsed.sort((a, b) => a.sentAt.localeCompare(b.sentAt)) : []
  } catch {
    return []
  }
}

function writeAll(msgs: DirectMessage[]): void {
  const k = storageKey()
  if (!k) return
  try {
    window.localStorage.setItem(k, JSON.stringify(msgs))
    window.dispatchEvent(new StorageEvent("storage", { key: k }))
  } catch { /* quota — ignore */ }
}

export function sendDirectMessage(args: {
  senderId: string
  recipientId: string
  body: string
}): DirectMessage | null {
  const body = args.body.trim()
  if (!body) return null
  if (args.senderId === args.recipientId) return null // no DMs to self
  const msg: DirectMessage = {
    id: `dm-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    senderId: args.senderId,
    recipientId: args.recipientId,
    body,
    sentAt: new Date().toISOString(),
  }
  writeAll([...readAll(), msg])
  return msg
}

export function markDirectMessagesRead(
  viewerId: string,
  partnerId: string,
): void {
  const nowIso = new Date().toISOString()
  const next = readAll().map((m) =>
    !m.readAt && m.recipientId === viewerId && m.senderId === partnerId
      ? { ...m, readAt: nowIso }
      : m,
  )
  writeAll(next)
}

/** All DMs the viewer is a participant in, sorted oldest-first. */
export function getDirectMessagesForViewer(viewerId: string): DirectMessage[] {
  return readAll().filter(
    (m) => m.senderId === viewerId || m.recipientId === viewerId,
  )
}

/** Just the conversation with one partner, oldest-first. */
export function getConversation(
  viewerId: string,
  partnerId: string,
): DirectMessage[] {
  return readAll().filter(
    (m) =>
      (m.senderId === viewerId && m.recipientId === partnerId) ||
      (m.senderId === partnerId && m.recipientId === viewerId),
  )
}

/** Unread count for the viewer across all conversations. */
export function getUnreadDMCount(viewerId: string): number {
  return readAll().filter((m) => m.recipientId === viewerId && !m.readAt).length
}

// React hooks
export function useDirectMessagesForViewer(viewerId: string): DirectMessage[] {
  const subscribe = useCallback((cb: () => void) => {
    if (typeof window === "undefined") return () => {}
    const target = storageKey()
    function onStorage(e: StorageEvent) {
      if (e.key === null || e.key === target) cb()
    }
    window.addEventListener("storage", onStorage)
    return () => window.removeEventListener("storage", onStorage)
  }, [])
  const getSnapshot = useCallback(
    () => JSON.stringify(getDirectMessagesForViewer(viewerId)),
    [viewerId],
  )
  const getServerSnapshot = useCallback(() => "[]", [])
  const serialized = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  return JSON.parse(serialized) as DirectMessage[]
}

export function useConversation(viewerId: string, partnerId: string): DirectMessage[] {
  const subscribe = useCallback((cb: () => void) => {
    if (typeof window === "undefined") return () => {}
    const target = storageKey()
    function onStorage(e: StorageEvent) {
      if (e.key === null || e.key === target) cb()
    }
    window.addEventListener("storage", onStorage)
    return () => window.removeEventListener("storage", onStorage)
  }, [])
  const getSnapshot = useCallback(
    () => JSON.stringify(getConversation(viewerId, partnerId)),
    [viewerId, partnerId],
  )
  const getServerSnapshot = useCallback(() => "[]", [])
  const serialized = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  return JSON.parse(serialized) as DirectMessage[]
}

/** Builds a per-viewer summary: one entry per distinct partner with
 *  last message preview + unread count. Used for the Inbox DM list. */
export interface DMSummary {
  partnerId: string
  lastMessage: DirectMessage
  unreadCount: number
}

export function summariseDMs(viewerId: string): DMSummary[] {
  const all = getDirectMessagesForViewer(viewerId)
  const byPartner = new Map<string, DirectMessage[]>()
  for (const m of all) {
    const partner = m.senderId === viewerId ? m.recipientId : m.senderId
    const list = byPartner.get(partner) ?? []
    list.push(m)
    byPartner.set(partner, list)
  }
  const out: DMSummary[] = []
  for (const [partnerId, msgs] of byPartner) {
    const sorted = msgs.sort((a, b) => a.sentAt.localeCompare(b.sentAt))
    const last = sorted[sorted.length - 1]
    if (!last) continue
    const unread = msgs.filter((m) => m.recipientId === viewerId && !m.readAt).length
    out.push({ partnerId, lastMessage: last, unreadCount: unread })
  }
  return out.sort((a, b) => b.lastMessage.sentAt.localeCompare(a.lastMessage.sentAt))
}
