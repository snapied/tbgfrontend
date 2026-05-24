"use client"

// Per-community moderator marker — Sprint B Communities #7.
//
// Adds a Moderator tier between Owner/Admin (workspace-wide) and
// Member (community-scoped) without migrating the StudentGroup type.
// Moderators get a "Moderator" pill in the directory + can be
// promoted/demoted by community admins.
//
// We deliberately keep this in a per-tenant localStorage record
// instead of stuffing it into StudentGroup.memberIds because:
//   • The promotion is a non-destructive metadata layer; demoting
//     mustn't accidentally drop the member.
//   • Future server promotion is mechanical — replace the
//     read/write helpers with API calls; consumers stay unchanged.
//
// Storage shape:
//   `thebigclass.t.<slug>.community-mods.<communityId>` →
//     { moderatorIds: string[] }

import { useCallback, useEffect, useMemo, useState } from "react"

interface ModRecord {
  moderatorIds: string[]
}

function storageKey(tenantSlug: string, communityId: string): string {
  return `thebigclass.t.${tenantSlug || "default"}.community-mods.${communityId}`
}

function readMods(key: string): ModRecord {
  if (typeof window === "undefined") return { moderatorIds: [] }
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return { moderatorIds: [] }
    const parsed = JSON.parse(raw) as Partial<ModRecord>
    return { moderatorIds: Array.isArray(parsed.moderatorIds) ? parsed.moderatorIds : [] }
  } catch {
    return { moderatorIds: [] }
  }
}

function writeMods(key: string, record: ModRecord): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(key, JSON.stringify(record))
    window.dispatchEvent(new CustomEvent("community-mods-changed"))
  } catch {
    /* best-effort */
  }
}

export interface UseCommunityModeratorsApi {
  moderatorIds: string[]
  isModerator: (userId: string) => boolean
  promote: (userId: string) => void
  demote: (userId: string) => void
  toggle: (userId: string) => void
}

export function useCommunityModerators(
  tenantSlug: string,
  communityId: string | undefined,
): UseCommunityModeratorsApi {
  const key = useMemo(
    () => (communityId ? storageKey(tenantSlug, communityId) : null),
    [tenantSlug, communityId],
  )
  const [record, setRecord] = useState<ModRecord>({ moderatorIds: [] })

  useEffect(() => {
    if (!key) return
    const refresh = () => setRecord(readMods(key))
    refresh()
    window.addEventListener("community-mods-changed", refresh)
    window.addEventListener("storage", refresh)
    return () => {
      window.removeEventListener("community-mods-changed", refresh)
      window.removeEventListener("storage", refresh)
    }
  }, [key])

  const promote = useCallback(
    (userId: string) => {
      if (!key) return
      if (record.moderatorIds.includes(userId)) return
      const next = { moderatorIds: [...record.moderatorIds, userId] }
      writeMods(key, next)
      setRecord(next)
    },
    [key, record],
  )
  const demote = useCallback(
    (userId: string) => {
      if (!key) return
      if (!record.moderatorIds.includes(userId)) return
      const next = { moderatorIds: record.moderatorIds.filter((id) => id !== userId) }
      writeMods(key, next)
      setRecord(next)
    },
    [key, record],
  )
  const toggle = useCallback(
    (userId: string) => {
      if (record.moderatorIds.includes(userId)) demote(userId)
      else promote(userId)
    },
    [record, promote, demote],
  )

  return {
    moderatorIds: record.moderatorIds,
    isModerator: (userId: string) => record.moderatorIds.includes(userId),
    promote,
    demote,
    toggle,
  }
}
