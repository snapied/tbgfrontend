// Per-tenant student-tag store.
//
// Tags are short freeform labels teachers attach to students for
// quick filtering and scanning ("Beta", "VIP", "Mentor",
// "Refunded"). Unlike private notes, tags are SHARED across the
// workspace — every teacher sees the same tags on every student.
//
// Storage shape (per tenant):
//   thebigclass.t.<slug>.lms.studentTags.v1
//   → { [studentId]: string[] }
//
// We keep it tenant-namespaced so it goes through the existing
// portal-state mirror to Postgres. No new table needed; the value
// rides in the per-tenant blob alongside lms.users.v1 etc.
//
// Naming convention: tags are stored in their displayed form
// (case preserved), but matched case-insensitively when filtering.
// Trimmed at write time so "VIP" and " VIP " never both exist.

import { readCurrentTenantSlug } from "@/lib/tenant-store"

const SCHEMA = "lms.studentTags.v1"
const MAX_TAGS_PER_STUDENT = 10
const MAX_TAG_LENGTH = 24

export type StudentTagsMap = Record<string, string[]>

function storageKey(): string | null {
  if (typeof window === "undefined") return null
  const slug = readCurrentTenantSlug()
  if (!slug) return null
  return `thebigclass.t.${slug}.${SCHEMA}`
}

export function getAllTags(): StudentTagsMap {
  const key = storageKey()
  if (!key) return {}
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as StudentTagsMap
    return parsed && typeof parsed === "object" ? parsed : {}
  } catch {
    return {}
  }
}

export function getTagsForStudent(studentId: string): string[] {
  return getAllTags()[studentId] ?? []
}

// Distinct tag list across the whole workspace, useful for the
// roster filter dropdown + autocomplete in the editor. Returns
// sorted case-insensitively, with case preserved from first sight.
export function getAllUniqueTags(): string[] {
  const map = getAllTags()
  const seen = new Map<string, string>() // lowercase → original case
  for (const tags of Object.values(map)) {
    for (const t of tags) {
      const lower = t.toLowerCase()
      if (!seen.has(lower)) seen.set(lower, t)
    }
  }
  return [...seen.values()].sort((a, b) => a.localeCompare(b))
}

export function setTagsForStudent(studentId: string, tags: string[]): void {
  const key = storageKey()
  if (!key || !studentId) return
  // Normalize: trim, clamp length, dedupe case-insensitively.
  const seen = new Set<string>()
  const cleaned: string[] = []
  for (const raw of tags) {
    const trimmed = (raw ?? "").trim().slice(0, MAX_TAG_LENGTH)
    if (!trimmed) continue
    const lower = trimmed.toLowerCase()
    if (seen.has(lower)) continue
    seen.add(lower)
    cleaned.push(trimmed)
    if (cleaned.length >= MAX_TAGS_PER_STUDENT) break
  }
  const map = getAllTags()
  if (cleaned.length === 0) {
    if (!(studentId in map)) return
    delete map[studentId]
  } else {
    map[studentId] = cleaned
  }
  try {
    window.localStorage.setItem(key, JSON.stringify(map))
  } catch { /* ignore */ }
}

// Tag color derivation. Deterministic per tag string so the same
// tag always renders in the same color across rows/pages. Curated
// palette so the chips read calm + scannable (no clashy reds).
const TAG_COLORS: Array<{ bg: string; text: string }> = [
  { bg: "bg-amber-500/15", text: "text-amber-700 dark:text-amber-300" },
  { bg: "bg-blue-500/15", text: "text-blue-700 dark:text-blue-300" },
  { bg: "bg-emerald-500/15", text: "text-emerald-700 dark:text-emerald-300" },
  { bg: "bg-pink-500/15", text: "text-pink-700 dark:text-pink-300" },
  { bg: "bg-violet-500/15", text: "text-violet-700 dark:text-violet-300" },
  { bg: "bg-slate-500/15", text: "text-slate-700 dark:text-slate-300" },
]

export function colorForTag(tag: string): { bg: string; text: string } {
  // Simple djb2-style hash → palette index. Deterministic across
  // re-renders + sessions; no Math.random.
  let hash = 5381
  const s = tag.toLowerCase()
  for (let i = 0; i < s.length; i++) {
    hash = ((hash << 5) + hash + s.charCodeAt(i)) | 0
  }
  return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length]
}
