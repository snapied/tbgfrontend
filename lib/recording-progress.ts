// Per-user, per-recording watch position store.
//
// Powers three UX surfaces:
//   1. Resume prompt on the player ("Resume from 23:47?")
//   2. Thin progress bar under recording rows in the listing
//   3. "Watched" / "New" / "X min left" badges in the listing
//
// Storage shape (per tenant, per user):
//   thebigclass.t.<slug>.user.<userId>.recordingProgress.v1
//   → { [recordingId]: { positionSec, durationSec, completed, updatedAt } }
//
// Per-user keying matters: two students sharing a browser shouldn't
// see each other's resume positions, and a teacher previewing the
// learn page shouldn't pollute their students' progress.
//
// The player calls setProgress() every ~5s while playing; the
// listing reads getAllProgress() once per render. Both are cheap
// localStorage ops (~200B per recording at most), and the absolute
// bound is the user's recording count — fine for any realistic
// tenant.

import { readCurrentTenantSlug } from "@/lib/tenant-store"

export interface RecordingProgressEntry {
  positionSec: number
  durationSec: number
  /** True once we've stamped this recording as watched-through. We
   *  flip it at ≥90% so a viewer who skips the outro still counts. */
  completed: boolean
  updatedAt: string
}

export type RecordingProgressMap = Record<string, RecordingProgressEntry>

const SCHEMA = "recordingProgress.v1"

// Threshold for "this recording was effectively watched." Anything
// past 90% of the duration trips completion — accounts for outro
// credits, sponsor reads, and the natural tendency to bail in the
// last minute of a 60-min class.
export const COMPLETION_RATIO = 0.9

function storageKey(userId: string | undefined): string | null {
  if (typeof window === "undefined") return null
  const slug = readCurrentTenantSlug()
  if (!slug) return null
  // Anonymous viewers (preview links) still get a progress bucket
  // keyed off the magic "_anon" subkey so their session-local
  // progress doesn't leak into a signed-in user's bucket.
  const u = userId ?? "_anon"
  return `thebigclass.t.${slug}.user.${u}.${SCHEMA}`
}

export function getAllProgress(userId: string | undefined): RecordingProgressMap {
  const key = storageKey(userId)
  if (!key) return {}
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as RecordingProgressMap
    return parsed && typeof parsed === "object" ? parsed : {}
  } catch {
    return {}
  }
}

export function getProgress(
  userId: string | undefined,
  recordingId: string,
): RecordingProgressEntry | undefined {
  return getAllProgress(userId)[recordingId]
}

export function setProgress(
  userId: string | undefined,
  recordingId: string,
  positionSec: number,
  durationSec: number,
): void {
  const key = storageKey(userId)
  if (!key) return
  if (!Number.isFinite(positionSec) || positionSec < 0) return
  if (!Number.isFinite(durationSec) || durationSec <= 0) return
  // Clamp position into the [0, duration] range. Browsers
  // occasionally report timeUpdate events with positions slightly
  // past duration during seeks; clamping avoids polluting the bar.
  const safePos = Math.max(0, Math.min(positionSec, durationSec))
  const completed = safePos / durationSec >= COMPLETION_RATIO
  const map = getAllProgress(userId)
  map[recordingId] = {
    positionSec: safePos,
    durationSec,
    completed,
    updatedAt: new Date().toISOString(),
  }
  try {
    window.localStorage.setItem(key, JSON.stringify(map))
  } catch { /* quota — silently swallow */ }
}

export function markComplete(userId: string | undefined, recordingId: string): void {
  const key = storageKey(userId)
  if (!key) return
  const map = getAllProgress(userId)
  const existing = map[recordingId]
  if (!existing) return
  map[recordingId] = {
    ...existing,
    positionSec: existing.durationSec,
    completed: true,
    updatedAt: new Date().toISOString(),
  }
  try {
    window.localStorage.setItem(key, JSON.stringify(map))
  } catch { /* ignore */ }
}

export function clearProgress(userId: string | undefined, recordingId: string): void {
  const key = storageKey(userId)
  if (!key) return
  const map = getAllProgress(userId)
  if (!(recordingId in map)) return
  delete map[recordingId]
  try {
    window.localStorage.setItem(key, JSON.stringify(map))
  } catch { /* ignore */ }
}

// Human formatter for the "remaining" badge. Mirrors the duration
// pattern used elsewhere ("45m" / "1h 23m") so the listing reads
// consistently. Returns "" if nothing meaningful to show.
export function formatRemaining(entry: RecordingProgressEntry): string {
  if (entry.completed) return ""
  const remainingSec = Math.max(0, entry.durationSec - entry.positionSec)
  if (remainingSec < 30) return "Almost done"
  const mins = Math.round(remainingSec / 60)
  if (mins < 60) return `${mins} min left`
  const hours = Math.floor(mins / 60)
  const rem = mins % 60
  return rem === 0 ? `${hours}h left` : `${hours}h ${rem}m left`
}
