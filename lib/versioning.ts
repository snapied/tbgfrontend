"use client"

// Shared versioning primitive — used by Brand, Pages, Profile,
// Testimonials, Blog, anything that benefits from "what did I
// change?" + "restore a previous version".
//
// Storage shape (per tenant):
//   `thebigclass.t.<slug>.versions.<kind>.<artifactId>`
//   → VersionEntry[]
//
// Capacity is capped at MAX_VERSIONS so a chatty autosave loop
// can't blow out the localStorage quota. When the cap is hit, the
// oldest UNPINNED entry is dropped (pinned entries survive forever
// or until explicitly unpinned/deleted).
//
// Snapshot policy is the caller's call — we expose helpers but
// don't auto-snapshot internally. Two patterns we use:
//   • Snapshot on save/publish boundaries (Blog, Pages)
//   • Manual "Save a version" button (Brand)
//
// Diff: shallow per-key comparison returning `{ changed, added, removed }`.
// Good enough for the typical artifact (flat-ish JSON). Deep diffs
// can be added if a consumer needs them.

import { useCallback, useEffect, useMemo, useState } from "react"

/** Supported artifact kinds. Adding a new one is purely additive —
 *  storage keys are namespaced by kind so two artifacts don't clash. */
export type VersionedKind =
  | "brand"
  | "page"
  | "profile"
  | "testimonial"
  | "blog-post"
  | "course"
  | "whiteboard"

export interface VersionEntry<T> {
  id: string
  /** ISO timestamp of when this snapshot was taken. */
  createdAt: string
  /** Optional user id of the actor who triggered the snapshot. */
  actorId?: string
  /** Optional name of the actor (cached so we don't depend on the
   *  user being still resolvable when the version is restored). */
  actorName?: string
  /** Optional label — "Before launch", "Pre-redesign", etc. */
  label?: string
  /** Pinned snapshots survive the FIFO eviction cap. */
  pinned?: boolean
  /** The full snapshot of the artifact. */
  snapshot: T
}

const MAX_VERSIONS = 50

function storageKey(tenantSlug: string, kind: VersionedKind, artifactId: string) {
  return `thebigclass.t.${tenantSlug || "default"}.versions.${kind}.${artifactId}`
}

/** Load history from localStorage. Returns [] on miss / corrupt. */
function loadHistory<T>(key: string): VersionEntry<T>[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return []
    const parsed = JSON.parse(raw) as VersionEntry<T>[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveHistory<T>(key: string, history: VersionEntry<T>[]): boolean {
  if (typeof window === "undefined") return false
  try {
    window.localStorage.setItem(key, JSON.stringify(history))
    return true
  } catch {
    // Quota overflow — drop the oldest unpinned entry and retry once.
    const trimmed = history.filter((v) => v.pinned).concat(
      history.filter((v) => !v.pinned).slice(-10),
    )
    try {
      window.localStorage.setItem(key, JSON.stringify(trimmed))
      return true
    } catch {
      return false
    }
  }
}

export interface UseVersionedDocOptions<T> {
  tenantSlug: string
  kind: VersionedKind
  /** Stable id within the kind. For Brand it's typically the tenant
   *  slug; for a blog post it's the post id. */
  artifactId: string
  /** Optional actor metadata stamped into every entry. */
  actor?: { id?: string; name?: string }
  /** Optional equality fn — used to skip "trivial" snapshots that
   *  would otherwise add a row identical to the previous one. */
  isEqual?: (a: T, b: T) => boolean
}

export interface UseVersionedDocApi<T> {
  history: VersionEntry<T>[]
  /** Snapshot the supplied value into history. Returns the entry
   *  that was written (or null when isEqual matched the previous
   *  entry). */
  snapshot: (current: T, label?: string) => VersionEntry<T> | null
  /** Resolve a snapshot's payload by id. */
  get: (versionId: string) => T | null
  /** Pin / unpin a version. */
  togglePin: (versionId: string) => void
  /** Delete a specific version. */
  remove: (versionId: string) => void
  /** Wipe everything. */
  clear: () => void
  /** Rename / re-label a version. */
  rename: (versionId: string, label: string) => void
  /** Most recent entry (or null when empty). */
  latest: VersionEntry<T> | null
}

/** React hook bound to a single artifact's version history. */
export function useVersionedDoc<T>(
  opts: UseVersionedDocOptions<T>,
): UseVersionedDocApi<T> {
  const { tenantSlug, kind, artifactId, actor, isEqual } = opts
  const key = useMemo(
    () => storageKey(tenantSlug, kind, artifactId),
    [tenantSlug, kind, artifactId],
  )

  const [history, setHistory] = useState<VersionEntry<T>[]>([])

  // Hydrate on mount + when the key changes.
  useEffect(() => {
    setHistory(loadHistory<T>(key))
  }, [key])

  const snapshot = useCallback(
    (current: T, label?: string): VersionEntry<T> | null => {
      // Skip a no-op snapshot when isEqual says nothing changed.
      const prev = history[0]
      if (prev && isEqual && isEqual(prev.snapshot, current)) {
        return null
      }
      const entry: VersionEntry<T> = {
        id: `v-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
        createdAt: new Date().toISOString(),
        actorId: actor?.id,
        actorName: actor?.name,
        label: label?.trim() || undefined,
        snapshot: current,
      }
      const next = [entry, ...history]
      // Trim — keep all pinned + last (MAX_VERSIONS - pinned.length) unpinned.
      const pinned = next.filter((v) => v.pinned)
      const unpinned = next.filter((v) => !v.pinned)
      const room = Math.max(0, MAX_VERSIONS - pinned.length)
      const trimmed = [...pinned, ...unpinned.slice(0, room)]
        // Sort newest-first (Date string compare is fine for ISO).
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      setHistory(trimmed)
      saveHistory(key, trimmed)
      return entry
    },
    [history, isEqual, actor, key],
  )

  const get = useCallback(
    (versionId: string): T | null => {
      const e = history.find((v) => v.id === versionId)
      return e ? e.snapshot : null
    },
    [history],
  )

  const togglePin = useCallback(
    (versionId: string) => {
      setHistory((prev) => {
        const next = prev.map((v) =>
          v.id === versionId ? { ...v, pinned: !v.pinned } : v,
        )
        saveHistory(key, next)
        return next
      })
    },
    [key],
  )

  const remove = useCallback(
    (versionId: string) => {
      setHistory((prev) => {
        const next = prev.filter((v) => v.id !== versionId)
        saveHistory(key, next)
        return next
      })
    },
    [key],
  )

  const clear = useCallback(() => {
    setHistory([])
    saveHistory(key, [])
  }, [key])

  const rename = useCallback(
    (versionId: string, label: string) => {
      setHistory((prev) => {
        const next = prev.map((v) =>
          v.id === versionId ? { ...v, label: label.trim() || undefined } : v,
        )
        saveHistory(key, next)
        return next
      })
    },
    [key],
  )

  return {
    history,
    snapshot,
    get,
    togglePin,
    remove,
    clear,
    rename,
    latest: history[0] ?? null,
  }
}

/** Shallow diff helper — returns the keys that changed between two
 *  objects + their old/new values. Used by VersionsSheet to render
 *  "what changed" pills. Nested objects compare by JSON identity. */
export interface FieldDiff {
  field: string
  before: unknown
  after: unknown
  kind: "changed" | "added" | "removed"
}

export function diffShallow<T extends object>(
  before: T,
  after: T,
): FieldDiff[] {
  const out: FieldDiff[] = []
  // Cast to indexable record so we can grab keys without forcing
  // every artifact interface to declare an index signature.
  const beforeRec = (before ?? {}) as unknown as Record<string, unknown>
  const afterRec = (after ?? {}) as unknown as Record<string, unknown>
  const keys = new Set<string>([...Object.keys(beforeRec), ...Object.keys(afterRec)])
  for (const k of keys) {
    const a = beforeRec[k]
    const b = afterRec[k]
    if (a === undefined && b !== undefined) {
      out.push({ field: k, before: undefined, after: b, kind: "added" })
    } else if (a !== undefined && b === undefined) {
      out.push({ field: k, before: a, after: undefined, kind: "removed" })
    } else if (a !== b) {
      // Compare nested objects via JSON identity so a re-keyed but
      // structurally identical object doesn't show as changed.
      const aJson = typeof a === "object" ? JSON.stringify(a) : a
      const bJson = typeof b === "object" ? JSON.stringify(b) : b
      if (aJson !== bJson) {
        out.push({ field: k, before: a, after: b, kind: "changed" })
      }
    }
  }
  return out
}
