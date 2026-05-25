"use client"

// Saved Views for list pages.
//
// A View is a named bundle of (filter values + sort mode + active
// columns) that a user saves so they can return to the same slice
// of a list page later. Per-user, per-page-id, stored in tenant-
// scoped localStorage.
//
// Storage key:
//   thebigclass.t.<slug>.user.<userId>.views.<pageId>.v1
//     → SavedView[]
//
// Future: surface views from URL so a teacher can share a view by
// URL ("here are the recordings I want you to watch"). The View
// schema already supports it — the missing piece is the URL
// encoder, which will live next to useUrlState.

import { useCallback, useSyncExternalStore } from "react"
import { readCurrentTenantSlug } from "@/lib/tenant-store"

export interface SavedView {
  id: string
  name: string
  /** Free-form filter state. Each consumer page interprets its own
   *  shape — we store as JSON-serialisable bag. */
  state: Record<string, unknown>
  createdAt: string
  updatedAt: string
  /** Optional emoji for the chip pill. Visual texture only. */
  emoji?: string
}

const MAX_VIEWS_PER_PAGE = 20

function key(userId: string | undefined, pageId: string): string | null {
  if (typeof window === "undefined") return null
  const slug = readCurrentTenantSlug()
  if (!slug) return null
  const u = userId ?? "_anon"
  return `thebigclass.t.${slug}.user.${u}.views.${pageId}.v1`
}

export function listViews(userId: string | undefined, pageId: string): SavedView[] {
  const k = key(userId, pageId)
  if (!k) return []
  try {
    const raw = window.localStorage.getItem(k)
    if (!raw) return []
    const parsed = JSON.parse(raw) as SavedView[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function write(userId: string | undefined, pageId: string, views: SavedView[]): void {
  const k = key(userId, pageId)
  if (!k) return
  try {
    window.localStorage.setItem(k, JSON.stringify(views.slice(0, MAX_VIEWS_PER_PAGE)))
    window.dispatchEvent(new StorageEvent("storage", { key: k }))
  } catch { /* ignore */ }
}

export function saveView(
  userId: string | undefined,
  pageId: string,
  args: { name: string; state: Record<string, unknown>; emoji?: string },
): SavedView {
  const nowIso = new Date().toISOString()
  const v: SavedView = {
    id: `view-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: args.name.trim().slice(0, 40) || "Untitled view",
    state: args.state,
    createdAt: nowIso,
    updatedAt: nowIso,
    emoji: args.emoji,
  }
  write(userId, pageId, [...listViews(userId, pageId), v])
  return v
}

export function deleteView(
  userId: string | undefined,
  pageId: string,
  viewId: string,
): void {
  write(userId, pageId, listViews(userId, pageId).filter((v) => v.id !== viewId))
}

export function renameView(
  userId: string | undefined,
  pageId: string,
  viewId: string,
  name: string,
): void {
  write(
    userId,
    pageId,
    listViews(userId, pageId).map((v) =>
      v.id === viewId
        ? { ...v, name: name.trim().slice(0, 40) || v.name, updatedAt: new Date().toISOString() }
        : v,
    ),
  )
}

// React hook
export function useSavedViews(
  userId: string | undefined,
  pageId: string,
): SavedView[] {
  const subscribe = useCallback(
    (cb: () => void) => {
      if (typeof window === "undefined") return () => {}
      const target = key(userId, pageId)
      if (!target) return () => {}
      function onStorage(e: StorageEvent) {
        if (e.key === null || e.key === target) cb()
      }
      window.addEventListener("storage", onStorage)
      return () => window.removeEventListener("storage", onStorage)
    },
    [userId, pageId],
  )
  const getSnapshot = useCallback(
    () => JSON.stringify(listViews(userId, pageId)),
    [userId, pageId],
  )
  const getServerSnapshot = useCallback(() => "[]", [])
  const serialized = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  return JSON.parse(serialized) as SavedView[]
}
