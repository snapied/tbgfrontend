"use client"

// Wishlist primitive — Sprint B Brand #21.
//
// Lets anonymous + signed-in visitors mark a course "save for later"
// before they enrol. Key behaviour:
//   • Anonymous: stored in localStorage keyed by the same anon-id
//     the experiments + attribution primitives use. Survives across
//     visits in the same browser.
//   • Signed-in: same storage, plus on sign-up the parent app can
//     promote the anon list into the user's account-side wishlist
//     (out of scope for this hook; we expose `getAll()` so a
//     migrator can read the staged list).
//
// Storage key: `thebigclass.t.<slug>.wishlist.<visitorId>` →
//   { courseIds: string[], updatedAt: ISO }
//
// We capped at 50 entries — anything past that is a power-user
// edge case we'd serve better via account-side wishlists.

import { useCallback, useEffect, useState } from "react"

const ANON_ID_KEY = "thebigclass.experiments.anonId"
const MAX_WISHLIST = 50

interface WishlistRecord {
  courseIds: string[]
  updatedAt: string
}

function storageKey(tenantSlug: string, visitorId: string): string {
  return `thebigclass.t.${tenantSlug || "default"}.wishlist.${visitorId}`
}

function getVisitorId(): string {
  if (typeof window === "undefined") return "ssr"
  try {
    const existing = window.localStorage.getItem(ANON_ID_KEY)
    if (existing) return existing
    const id = `anon-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
    window.localStorage.setItem(ANON_ID_KEY, id)
    return id
  } catch {
    return "anon-fallback"
  }
}

function readRecord(tenantSlug: string, visitorId: string): WishlistRecord {
  if (typeof window === "undefined") return { courseIds: [], updatedAt: "" }
  try {
    const raw = window.localStorage.getItem(storageKey(tenantSlug, visitorId))
    if (!raw) return { courseIds: [], updatedAt: "" }
    const parsed = JSON.parse(raw) as WishlistRecord
    return parsed.courseIds ? parsed : { courseIds: [], updatedAt: "" }
  } catch {
    return { courseIds: [], updatedAt: "" }
  }
}

function writeRecord(tenantSlug: string, visitorId: string, record: WishlistRecord): boolean {
  if (typeof window === "undefined") return false
  try {
    window.localStorage.setItem(storageKey(tenantSlug, visitorId), JSON.stringify(record))
    // Fire a same-tab event so other useWishlist hooks on the page
    // (e.g. tray badge + per-card heart) re-render in sync. The
    // browser's native `storage` event only fires cross-tab.
    window.dispatchEvent(new CustomEvent("wishlist-changed"))
    return true
  } catch {
    return false
  }
}

export interface UseWishlistApi {
  /** Course IDs in the wishlist, newest-first. */
  ids: string[]
  /** Quick membership check. */
  has: (courseId: string) => boolean
  /** Toggle a course in/out of the wishlist. Returns the next
   *  membership state so callers can update local UI immediately. */
  toggle: (courseId: string) => boolean
  /** Add explicitly (idempotent). */
  add: (courseId: string) => void
  /** Remove (idempotent). */
  remove: (courseId: string) => void
  /** Wipe everything. */
  clear: () => void
}

/** React hook bound to the current visitor's wishlist for the given
 *  tenant. Anon and signed-in visitors share the same hook — the
 *  primitive resolves the visitor id internally. */
export function useWishlist(tenantSlug: string): UseWishlistApi {
  const [ids, setIds] = useState<string[]>([])

  // Hydrate on mount + when the tenant changes. Also listen for
  // cross-component changes so an `<HeartButton>` on a card stays in
  // sync with the `<WishlistTray>` floating chip without prop drilling.
  useEffect(() => {
    const visitorId = getVisitorId()
    const refresh = () => setIds(readRecord(tenantSlug, visitorId).courseIds)
    refresh()
    window.addEventListener("wishlist-changed", refresh)
    window.addEventListener("storage", refresh)
    return () => {
      window.removeEventListener("wishlist-changed", refresh)
      window.removeEventListener("storage", refresh)
    }
  }, [tenantSlug])

  const persist = useCallback(
    (next: string[]) => {
      const visitorId = getVisitorId()
      writeRecord(tenantSlug, visitorId, {
        courseIds: next.slice(0, MAX_WISHLIST),
        updatedAt: new Date().toISOString(),
      })
      setIds(next.slice(0, MAX_WISHLIST))
    },
    [tenantSlug],
  )

  const toggle = useCallback(
    (courseId: string): boolean => {
      const next = ids.includes(courseId)
        ? ids.filter((id) => id !== courseId)
        : [courseId, ...ids]
      persist(next)
      return next.includes(courseId)
    },
    [ids, persist],
  )

  const add = useCallback(
    (courseId: string) => {
      if (ids.includes(courseId)) return
      persist([courseId, ...ids])
    },
    [ids, persist],
  )

  const remove = useCallback(
    (courseId: string) => {
      if (!ids.includes(courseId)) return
      persist(ids.filter((id) => id !== courseId))
    },
    [ids, persist],
  )

  const clear = useCallback(() => persist([]), [persist])

  return {
    ids,
    has: (courseId: string) => ids.includes(courseId),
    toggle,
    add,
    remove,
    clear,
  }
}

/** Reads the current visitor's wishlist outside React. Used by the
 *  signup migrator to promote the anon list into the new account. */
export function readVisitorWishlist(tenantSlug: string): string[] {
  if (typeof window === "undefined") return []
  return readRecord(tenantSlug, getVisitorId()).courseIds
}
