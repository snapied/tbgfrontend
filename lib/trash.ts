"use client"

// App-wide soft-delete with a 7-day TTL.
//
// Every store that wants undoable deletes calls `pushToTrash` with a
// snapshot of the row being removed. The Trash page at
// /dashboard/trash lists everything still in window (7 days), lets the
// user Restore (the original store re-imports the row) or Empty (hard
// delete now). Entries older than 7 days are silently pruned at app
// boot.
//
// One store per tenant, so trash from workspace A doesn't bleed into B.
//
// Design notes:
//   • The trash is a single localStorage blob — simpler than a separate
//     slice per resource type and the data is small (we only keep the
//     row, not blobs / attachments).
//   • Restore is a per-resource concern; the trash UI fires a custom
//     event with the entry, and each store registers a listener that
//     handles its own kinds. Avoids a circular dependency from trash
//     back into every store.
//   • `kind` is free-form; pick a stable string per resource type so
//     listeners can dispatch on it. Examples below.

import { readCurrentTenantSlug } from "./tenant-store"

export const TRASH_TTL_DAYS = 7
const TRASH_TTL_MS = TRASH_TTL_DAYS * 24 * 60 * 60 * 1000

export type TrashKind =
  | "course"
  | "course-module"
  | "course-lesson"
  | "student"
  | "student-group"
  | "quiz"
  | "assignment"
  | "live-session"
  | "doubt"
  | "review"
  | "product"
  | "blog-post"
  | "portal-page"
  | "wall-entry"
  | "template"
  | "referral"
  | "user"
  | "tenant"
  | "team-member"
  // Catch-all so callers can pass their own string if needed.
  | (string & {})

export interface TrashEntry<T = unknown> {
  // Stable id of the trashed row — used as the React key in the UI
  // AND to de-dupe if the user accidentally deletes the same thing twice.
  id: string
  kind: TrashKind
  // Friendly label rendered in the trash list ("Maths 101", "Renu Rawat").
  label: string
  // Optional secondary detail ("12 lessons · 3 quizzes").
  sublabel?: string
  // ISO timestamp of when the user pressed Delete.
  deletedAt: string
  // The actual snapshot the store handed us — opaque to trash, but
  // the store's restore handler will need it intact to re-import.
  payload: T
  // Optional parent reference — e.g. lesson trashed because the
  // module was trashed; restoring the module also restores nested.
  // Trash doesn't act on this itself; stores read it during restore.
  parentId?: string
}

function key(slug: string): string {
  return `thebigclass.t.${slug}.trash.v1`
}

function readAll(slug: string): TrashEntry[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(key(slug))
    if (!raw) return []
    const parsed = JSON.parse(raw) as TrashEntry[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeAll(slug: string, entries: TrashEntry[]): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(key(slug), JSON.stringify(entries))
    // Tell every mounted listener to refresh.
    window.dispatchEvent(new CustomEvent("trash:changed"))
  } catch {
    /* quota — ignored; the in-store hard delete already happened */
  }
}

// Drop anything older than the TTL. Called lazily on read so we don't
// need a background timer. Returns the cleaned list.
function pruneExpired(entries: TrashEntry[]): TrashEntry[] {
  const cutoff = Date.now() - TRASH_TTL_MS
  return entries.filter((e) => new Date(e.deletedAt).getTime() >= cutoff)
}

export function listTrash(): TrashEntry[] {
  const slug = readCurrentTenantSlug()
  const raw = readAll(slug)
  const pruned = pruneExpired(raw)
  if (pruned.length !== raw.length) writeAll(slug, pruned)
  // Newest first.
  return pruned.slice().sort((a, b) => b.deletedAt.localeCompare(a.deletedAt))
}

export function pushToTrash<T>(entry: Omit<TrashEntry<T>, "deletedAt">): void {
  const slug = readCurrentTenantSlug()
  const all = pruneExpired(readAll(slug))
  const next = [
    { ...entry, deletedAt: new Date().toISOString() } as TrashEntry,
    ...all.filter((e) => !(e.kind === entry.kind && e.id === entry.id)),
  ]
  writeAll(slug, next)
}

// Remove from the trash without restoring (hard delete).
export function purgeTrash(kind: TrashKind, id: string): void {
  const slug = readCurrentTenantSlug()
  const all = pruneExpired(readAll(slug))
  writeAll(slug, all.filter((e) => !(e.kind === kind && e.id === id)))
}

// Empty the trash entirely (UI action).
export function emptyTrash(): void {
  const slug = readCurrentTenantSlug()
  writeAll(slug, [])
}

// Tries to restore by dispatching a window event that each store
// listens for. Returns true when at least one listener acknowledged
// (set `event.detail.handled = true`). The trash entry is removed
// only on a successful restore.
export function restoreFromTrash(kind: TrashKind, id: string): boolean {
  const slug = readCurrentTenantSlug()
  const all = pruneExpired(readAll(slug))
  const entry = all.find((e) => e.kind === kind && e.id === id)
  if (!entry) return false
  const detail = { entry, handled: false }
  window.dispatchEvent(new CustomEvent("trash:restore", { detail }))
  if (detail.handled) {
    writeAll(slug, all.filter((e) => !(e.kind === kind && e.id === id)))
    return true
  }
  return false
}

// Stores call this on mount to register a restore handler for their
// kinds. The handler receives the original snapshot and is responsible
// for re-importing it (setUsers([...prev, snapshot]), etc).
//
// Return value: true to acknowledge (entry will be cleared from trash),
// false to leave the entry in trash for another listener to try.
export function registerRestoreHandler(
  kinds: TrashKind[],
  handler: (entry: TrashEntry) => boolean,
): () => void {
  if (typeof window === "undefined") return () => {}
  const fn = (e: Event) => {
    const ev = e as CustomEvent<{ entry: TrashEntry; handled: boolean }>
    if (!ev.detail || ev.detail.handled) return
    if (!kinds.includes(ev.detail.entry.kind)) return
    if (handler(ev.detail.entry)) ev.detail.handled = true
  }
  window.addEventListener("trash:restore", fn)
  return () => window.removeEventListener("trash:restore", fn)
}

// React hook — returns the current trash list and re-renders when the
// trash changes (any tab, any window). Use in /dashboard/trash.
import { useEffect, useState } from "react"
export function useTrash(): TrashEntry[] {
  const [items, setItems] = useState<TrashEntry[]>([])
  useEffect(() => {
    const refresh = () => setItems(listTrash())
    refresh()
    window.addEventListener("trash:changed", refresh)
    window.addEventListener("storage", refresh)
    return () => {
      window.removeEventListener("trash:changed", refresh)
      window.removeEventListener("storage", refresh)
    }
  }, [])
  return items
}

// Friendly remaining-time string ("6d left", "9h left").
export function trashRemainingLabel(deletedAt: string): string {
  const ms = TRASH_TTL_MS - (Date.now() - new Date(deletedAt).getTime())
  if (ms <= 0) return "expiring now"
  const days = Math.floor(ms / (24 * 60 * 60 * 1000))
  if (days >= 1) return `${days}d left`
  const hours = Math.floor(ms / (60 * 60 * 1000))
  if (hours >= 1) return `${hours}h left`
  const mins = Math.max(1, Math.floor(ms / (60 * 1000)))
  return `${mins}m left`
}
