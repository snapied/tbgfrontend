// Per-user, per-tenant log of "students I recently opened" so the
// roster + sidebar can offer one-tap return to who you were just
// looking at. Stored in localStorage:
//
//   thebigclass.t.<slug>.user.<userId>.recentStudents.v1
//   → string[] of student ids (most recent first)
//
// Capacity capped at MAX so the list stays scannable and the
// localStorage payload stays small. Touching an id moves it to the
// front; new ids push older ones off the tail.

import { readCurrentTenantSlug } from "@/lib/tenant-store"

const SCHEMA = "recentStudents.v1"
const MAX = 8

function storageKey(userId: string | undefined): string | null {
  if (typeof window === "undefined") return null
  const slug = readCurrentTenantSlug()
  if (!slug) return null
  const u = userId ?? "_anon"
  return `thebigclass.t.${slug}.user.${u}.${SCHEMA}`
}

export function getRecentStudentIds(userId: string | undefined): string[] {
  const key = storageKey(userId)
  if (!key) return []
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? (parsed as string[]).filter((x) => typeof x === "string") : []
  } catch {
    return []
  }
}

export function touchRecentStudent(
  userId: string | undefined,
  studentId: string,
): void {
  const key = storageKey(userId)
  if (!key || !studentId) return
  const current = getRecentStudentIds(userId)
  const filtered = current.filter((id) => id !== studentId)
  filtered.unshift(studentId)
  const trimmed = filtered.slice(0, MAX)
  try {
    window.localStorage.setItem(key, JSON.stringify(trimmed))
  } catch { /* ignore quota */ }
}

export function clearRecentStudents(userId: string | undefined): void {
  const key = storageKey(userId)
  if (!key) return
  try {
    window.localStorage.removeItem(key)
  } catch { /* ignore */ }
}
