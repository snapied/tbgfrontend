// Per-author, per-student private notes store.
//
// Notes are sensitive — they hold a teacher's working observations
// about a student ("eager but inconsistent", "watch out for late
// submissions"). We deliberately scope by the AUTHOR (the teacher
// writing them), not by the student, so two co-teachers can each
// keep their own notebook on the same student without overwriting
// each other.
//
// Storage shape (per tenant):
//   thebigclass.t.<slug>.user.<authorId>.privateNotes.v1
//   → { [studentId]: { body, updatedAt } }
//
// localStorage-only — these never sync to a community feed, never
// fan out as notifications, never appear on the public site. The
// teacher is the sole audience.

import { readCurrentTenantSlug } from "@/lib/tenant-store"

const SCHEMA = "privateNotes.v1"

export interface StudentPrivateNote {
  body: string
  updatedAt: string
}

export type PrivateNotesMap = Record<string, StudentPrivateNote>

function storageKey(authorId: string | undefined): string | null {
  if (typeof window === "undefined") return null
  const slug = readCurrentTenantSlug()
  if (!slug) return null
  // Anonymous viewers shouldn't be able to write private notes at
  // all — but we keep an _anon bucket so guard-mounting components
  // doesn't throw before auth resolves.
  const a = authorId ?? "_anon"
  return `thebigclass.t.${slug}.user.${a}.${SCHEMA}`
}

export function getAllNotes(authorId: string | undefined): PrivateNotesMap {
  const key = storageKey(authorId)
  if (!key) return {}
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as PrivateNotesMap
    return parsed && typeof parsed === "object" ? parsed : {}
  } catch {
    return {}
  }
}

export function getNote(
  authorId: string | undefined,
  studentId: string,
): StudentPrivateNote | undefined {
  return getAllNotes(authorId)[studentId]
}

export function saveNote(
  authorId: string | undefined,
  studentId: string,
  body: string,
): void {
  const key = storageKey(authorId)
  if (!key || !studentId) return
  const trimmed = body.trim()
  const map = getAllNotes(authorId)
  if (!trimmed) {
    if (!(studentId in map)) return
    delete map[studentId]
  } else {
    map[studentId] = { body: trimmed, updatedAt: new Date().toISOString() }
  }
  try {
    window.localStorage.setItem(key, JSON.stringify(map))
  } catch { /* quota — silently swallow */ }
}
