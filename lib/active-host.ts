"use client"

// Active-host signalling for live classes (CL9 — pass-the-mic).
//
// During a live class, "who has hosting controls right now" is a
// transient state that needs to survive a tab refresh and propagate
// to co-instructors in the same room. Same broadcast pattern as
// live-poll / raised-hands / lobby-presence: a tenant-scoped
// localStorage key + storage event, swappable for the LiveKit data
// channel when we move it server-side.
//
// Semantics:
//   • Default active host = session.hostId. We only persist a value
//     here when the original host actively passes it.
//   • A co-instructor with the active-host token sees the host UI
//     (panels, controls, badge). The original host downgrades to a
//     co-host view but can take back at any time.
//   • When the class ends, the entry clears.

import { useCallback, useSyncExternalStore } from "react"
import { readCurrentTenantSlug } from "@/lib/tenant-store"

export interface ActiveHostEntry {
  /** User id of the current active host. */
  userId: string
  /** Display name — denormalised so co-instructors see "Karan is hosting" without joining the users table. */
  name: string
  /** ISO timestamp the handoff happened. */
  passedAt: string
  /** Optional user id of the previous host (so they can take back). */
  passedFrom?: string
}

function key(sessionId: string): string {
  return `thebigclass.t.${readCurrentTenantSlug() ?? "default"}.activeHost.${sessionId}.v1`
}

function read(sessionId: string): ActiveHostEntry | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.localStorage.getItem(key(sessionId))
    if (!raw) return null
    const parsed = JSON.parse(raw) as ActiveHostEntry
    return parsed && parsed.userId ? parsed : null
  } catch {
    return null
  }
}

function write(sessionId: string, entry: ActiveHostEntry | null): void {
  if (typeof window === "undefined") return
  try {
    if (entry === null) {
      window.localStorage.removeItem(key(sessionId))
    } else {
      window.localStorage.setItem(key(sessionId), JSON.stringify(entry))
    }
    // Synthetic storage event so same-tab subscribers also react.
    window.dispatchEvent(new StorageEvent("storage", { key: key(sessionId) }))
  } catch { /* quota / private mode — best-effort */ }
}

export function passTheMic(
  sessionId: string,
  to: { id: string; name: string },
  from?: string,
): ActiveHostEntry {
  const entry: ActiveHostEntry = {
    userId: to.id,
    name: to.name,
    passedAt: new Date().toISOString(),
    passedFrom: from,
  }
  write(sessionId, entry)
  return entry
}

export function reclaimHostingControls(sessionId: string): void {
  write(sessionId, null)
}

export function useActiveHost(sessionId: string): ActiveHostEntry | null {
  const subscribe = useCallback(
    (cb: () => void) => {
      if (typeof window === "undefined") return () => {}
      const target = key(sessionId)
      function onStorage(e: StorageEvent) {
        if (e.key === null || e.key === target) cb()
      }
      window.addEventListener("storage", onStorage)
      return () => window.removeEventListener("storage", onStorage)
    },
    [sessionId],
  )
  const getSnapshot = useCallback(() => {
    return JSON.stringify(read(sessionId))
  }, [sessionId])
  const getServerSnapshot = useCallback(() => "null", [])
  const serialized = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  return JSON.parse(serialized) as ActiveHostEntry | null
}

/** Convenience read used by the host page to decide which UI to
 *  render for the current viewer. Returns true when this user is
 *  the *effective* host right now — either via active-host override
 *  or by virtue of being the original session.hostId with no
 *  override set. */
export function isEffectiveHost(
  active: ActiveHostEntry | null,
  viewerId: string,
  originalHostId: string,
): boolean {
  if (active) return active.userId === viewerId
  return viewerId === originalHostId
}
