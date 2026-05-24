// Per-student, per-kind nudge cooldown.
//
// Prevents teachers from accidentally hammering the same student with
// repeated check-ins/come-back nudges. Without this, an enthusiastic
// teacher can fire 5 "Just checking in!" pings in a row — and the
// pattern is invisible because each send dialog opens fresh.
//
// Storage shape (per tenant):
//   thebigclass.t.<slug>.lms.nudgeCooldowns.v1
//   → { "<kind>:<studentId>": isoTimestamp }
//
// We keep this in localStorage (not the LMS store) because:
//   • It's a sender-side guard, not a piece of student data.
//   • Other teachers in the same tenant *should* see each other's
//     cooldowns — the storage key is tenant-scoped so they share.
//   • Zero schema migration risk vs. adding to the LMS store.

import { readCurrentTenantSlug } from "@/lib/tenant-store"

// 48 hours feels like the right tradeoff:
//   • Long enough that a teacher who hits "Send" twice doesn't blast
//     anyone twice in a single sitting.
//   • Short enough that legitimately re-nudging a slipping student
//     after two days isn't blocked — by then the previous nudge has
//     either landed or been ignored, and a second touch is fair.
export const NUDGE_COOLDOWN_MS = 48 * 60 * 60 * 1000

export type NudgeKind = "checkin" | "comeback"

interface CooldownMap {
  [key: string]: string // ISO timestamp
}

function storageKey(): string | null {
  if (typeof window === "undefined") return null
  const slug = readCurrentTenantSlug()
  if (!slug) return null
  return `thebigclass.t.${slug}.lms.nudgeCooldowns.v1`
}

function readMap(): CooldownMap {
  const key = storageKey()
  if (!key) return {}
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as CooldownMap
    return parsed && typeof parsed === "object" ? parsed : {}
  } catch {
    return {}
  }
}

function writeMap(map: CooldownMap): void {
  const key = storageKey()
  if (!key) return
  try {
    window.localStorage.setItem(key, JSON.stringify(map))
  } catch { /* quota — silently ignore */ }
}

function recordKey(kind: NudgeKind, studentId: string): string {
  return `${kind}:${studentId}`
}

// Partition a list of recipient ids into:
//   • fresh    — fair game to nudge right now
//   • recent   — were nudged within the cooldown window
// Caller decides whether to skip-recent, override, or cancel.
export function partitionByCooldown(
  kind: NudgeKind,
  recipientIds: string[],
): { fresh: string[]; recent: { id: string; lastNudgedAt: string }[] } {
  const map = readMap()
  const now = Date.now()
  const fresh: string[] = []
  const recent: { id: string; lastNudgedAt: string }[] = []
  for (const id of recipientIds) {
    const last = map[recordKey(kind, id)]
    if (!last) {
      fresh.push(id)
      continue
    }
    const lastMs = Date.parse(last)
    if (Number.isNaN(lastMs)) {
      fresh.push(id)
      continue
    }
    if (now - lastMs < NUDGE_COOLDOWN_MS) {
      recent.push({ id, lastNudgedAt: last })
    } else {
      fresh.push(id)
    }
  }
  return { fresh, recent }
}

// Stamp the cooldown for every recipient after a successful send.
// Caller invokes once with the full list it actually dispatched to.
export function markNudged(kind: NudgeKind, recipientIds: string[]): void {
  if (recipientIds.length === 0) return
  const map = readMap()
  const now = new Date().toISOString()
  for (const id of recipientIds) {
    map[recordKey(kind, id)] = now
  }
  writeMap(map)
}

// Human relative-time helper for confirm dialogs. Round to whole
// hours; <1h is "just now-ish."
export function relativeFromNow(iso: string): string {
  const diffMs = Date.now() - Date.parse(iso)
  if (!Number.isFinite(diffMs) || diffMs < 0) return "just now"
  const hours = Math.floor(diffMs / 3_600_000)
  if (hours < 1) return "less than 1h ago"
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return days === 1 ? "1 day ago" : `${days} days ago`
}
