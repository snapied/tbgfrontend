// Per-user community-post preferences (mute + bookmark).
//
// Stored in localStorage rather than the post itself because:
//   • These are personal — muting a thread doesn't affect anyone
//     else; bookmarking is intrinsically per-user.
//   • Keeping them off the BatchPost record means every other
//     teacher / member sees the same canonical post array without
//     hydrating other people's preferences.
//
// Storage shape (per tenant, per user):
//
//   thebigclass.t.<slug>.user.<userId>.community.muted.v1
//     → string[] of muted postIds
//
//   thebigclass.t.<slug>.user.<userId>.community.bookmarks.v1
//     → string[] of bookmarked postIds (most recently saved first)
//
// API mirrors the recently-viewed-students pattern: read, set,
// remove. Maps the muted set is implicit (Set<string>) so callers
// can do O(1) "is muted" checks while iterating posts.

import { readCurrentTenantSlug } from "@/lib/tenant-store"

const MUTED_SCHEMA = "community.muted.v1"
const BOOKMARKS_SCHEMA = "community.bookmarks.v1"
const BOOKMARK_CAP = 200

function storageKey(userId: string | undefined, schema: string): string | null {
  if (typeof window === "undefined") return null
  const slug = readCurrentTenantSlug()
  if (!slug) return null
  const u = userId ?? "_anon"
  return `thebigclass.t.${slug}.user.${u}.${schema}`
}

// ─── Muted threads ─────────────────────────────────────────────────

export function getMutedThreadIds(userId: string | undefined): Set<string> {
  const key = storageKey(userId, MUTED_SCHEMA)
  if (!key) return new Set()
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return new Set()
    const parsed = JSON.parse(raw) as string[]
    return Array.isArray(parsed) ? new Set(parsed) : new Set()
  } catch {
    return new Set()
  }
}

export function setThreadMuted(
  userId: string | undefined,
  postId: string,
  muted: boolean,
): void {
  const key = storageKey(userId, MUTED_SCHEMA)
  if (!key) return
  const current = getMutedThreadIds(userId)
  if (muted) current.add(postId)
  else current.delete(postId)
  try {
    window.localStorage.setItem(key, JSON.stringify([...current]))
  } catch { /* quota — ignore */ }
}

// ─── Bookmarks ─────────────────────────────────────────────────────

export function getBookmarkedPostIds(userId: string | undefined): string[] {
  const key = storageKey(userId, BOOKMARKS_SCHEMA)
  if (!key) return []
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return []
    const parsed = JSON.parse(raw) as string[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function setPostBookmarked(
  userId: string | undefined,
  postId: string,
  bookmarked: boolean,
): void {
  const key = storageKey(userId, BOOKMARKS_SCHEMA)
  if (!key) return
  const current = getBookmarkedPostIds(userId)
  // LRU ordering — most-recently bookmarked at the front so the
  // saved-tray view is "newest first" by default.
  const filtered = current.filter((id) => id !== postId)
  const next = bookmarked ? [postId, ...filtered].slice(0, BOOKMARK_CAP) : filtered
  try {
    window.localStorage.setItem(key, JSON.stringify(next))
  } catch { /* ignore */ }
}

export function isPostBookmarked(
  userId: string | undefined,
  postId: string,
): boolean {
  return getBookmarkedPostIds(userId).includes(postId)
}
