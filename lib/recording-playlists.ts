"use client"

// Per-user personal playlists for recordings (R8).
//
// A playlist is a named ordered list of recordingIds the viewer
// curated. Private by default — no peer visibility — but stored
// in a shape that's compatible with a future "share playlist as a
// public link" feature.
//
// Storage (per tenant, per user):
//   thebigclass.t.<slug>.user.<userId>.recording.playlists.v1
//     → Playlist[]
//
// API surface:
//   listPlaylists / createPlaylist / renamePlaylist / deletePlaylist
//   addToPlaylist / removeFromPlaylist / reorderPlaylist
//   useRecordingPlaylists() React hook
//   playlistContaining(recordingId) helper

import { useCallback, useMemo, useSyncExternalStore } from "react"
import { readCurrentTenantSlug } from "@/lib/tenant-store"

export interface RecordingPlaylist {
  id: string
  name: string
  recordingIds: string[]
  createdAt: string
  updatedAt: string
}

const DEFAULT_NAME = "Watch later"
const MAX_PLAYLISTS = 30

function key(userId: string | undefined): string | null {
  if (typeof window === "undefined") return null
  const slug = readCurrentTenantSlug()
  if (!slug) return null
  const u = userId ?? "_anon"
  return `thebigclass.t.${slug}.user.${u}.recording.playlists.v1`
}

export function listPlaylists(userId: string | undefined): RecordingPlaylist[] {
  const k = key(userId)
  if (!k) return []
  try {
    const raw = window.localStorage.getItem(k)
    if (!raw) return []
    const parsed = JSON.parse(raw) as RecordingPlaylist[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function write(userId: string | undefined, playlists: RecordingPlaylist[]): void {
  const k = key(userId)
  if (!k) return
  try {
    window.localStorage.setItem(k, JSON.stringify(playlists.slice(0, MAX_PLAYLISTS)))
    window.dispatchEvent(new StorageEvent("storage", { key: k }))
  } catch { /* quota — best-effort */ }
}

export function createPlaylist(
  userId: string | undefined,
  name?: string,
): RecordingPlaylist {
  const nowIso = new Date().toISOString()
  const pl: RecordingPlaylist = {
    id: `playlist-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: (name ?? DEFAULT_NAME).trim() || DEFAULT_NAME,
    recordingIds: [],
    createdAt: nowIso,
    updatedAt: nowIso,
  }
  const next = [...listPlaylists(userId), pl]
  write(userId, next)
  return pl
}

export function renamePlaylist(
  userId: string | undefined,
  playlistId: string,
  name: string,
): void {
  const next = listPlaylists(userId).map((p) =>
    p.id === playlistId ? { ...p, name: name.trim() || p.name, updatedAt: new Date().toISOString() } : p,
  )
  write(userId, next)
}

export function deletePlaylist(userId: string | undefined, playlistId: string): void {
  write(userId, listPlaylists(userId).filter((p) => p.id !== playlistId))
}

export function addToPlaylist(
  userId: string | undefined,
  playlistId: string,
  recordingId: string,
): void {
  const next = listPlaylists(userId).map((p) => {
    if (p.id !== playlistId) return p
    if (p.recordingIds.includes(recordingId)) return p // idempotent
    return {
      ...p,
      recordingIds: [...p.recordingIds, recordingId],
      updatedAt: new Date().toISOString(),
    }
  })
  write(userId, next)
}

export function removeFromPlaylist(
  userId: string | undefined,
  playlistId: string,
  recordingId: string,
): void {
  const next = listPlaylists(userId).map((p) => {
    if (p.id !== playlistId) return p
    return {
      ...p,
      recordingIds: p.recordingIds.filter((r) => r !== recordingId),
      updatedAt: new Date().toISOString(),
    }
  })
  write(userId, next)
}

export function reorderPlaylist(
  userId: string | undefined,
  playlistId: string,
  recordingIds: string[],
): void {
  const next = listPlaylists(userId).map((p) =>
    p.id === playlistId ? { ...p, recordingIds, updatedAt: new Date().toISOString() } : p,
  )
  write(userId, next)
}

/** Convenience: which playlists contain this recording? Used by the
 *  "Add to playlist" popover to show ticks next to playlists the
 *  recording is already in. */
export function playlistsContaining(
  userId: string | undefined,
  recordingId: string,
): Set<string> {
  return new Set(
    listPlaylists(userId)
      .filter((p) => p.recordingIds.includes(recordingId))
      .map((p) => p.id),
  )
}

// React hook
export function useRecordingPlaylists(userId: string | undefined): RecordingPlaylist[] {
  const subscribe = useCallback(
    (cb: () => void) => {
      if (typeof window === "undefined") return () => {}
      const target = key(userId)
      if (!target) return () => {}
      function onStorage(e: StorageEvent) {
        if (e.key === null || e.key === target) cb()
      }
      window.addEventListener("storage", onStorage)
      return () => window.removeEventListener("storage", onStorage)
    },
    [userId],
  )
  // getSnapshot returns a JSON string — a stable primitive. useSyncExternalStore
  // only calls subscribers when the string value actually changes, so the hook
  // won't re-render unless the data changed.
  const getSnapshot = useCallback(() => JSON.stringify(listPlaylists(userId)), [userId])
  const getServerSnapshot = useCallback(() => "[]", [])
  const serialized = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  // Parse ONCE per unique serialized value. Without useMemo here,
  // JSON.parse(...) returns a NEW array on every render even when
  // `serialized` hasn't changed — that makes the array a new reference
  // every time, which breaks downstream effect dependency arrays and
  // causes "Maximum update depth exceeded" loops.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => JSON.parse(serialized) as RecordingPlaylist[], [serialized])
}
