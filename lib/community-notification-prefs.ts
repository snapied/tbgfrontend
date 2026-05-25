// Per-(user, community) notification preferences.
//
// Different model from community-post-prefs.ts (which is per-thread
// mute / bookmark). This file is per-community: a member who decides
// "I only want @mentions from Cohort 7" sets it once and all post
// types respect it.
//
// Why localStorage and not the server: the LMS store hydrates from
// localStorage today; when notifications start firing through a real
// server, this file becomes the read-through cache. Same shape stays
// valid.
//
// Schema (per tenant, per user, per community):
//   thebigclass.t.<slug>.user.<userId>.community.prefs.<batchId>.v1
//     → { level, snoozeUntilMs?, classStartAlerts? }
//
// `level` controls regular feed activity. `snoozeUntilMs` is an
// absolute epoch ms — set by the 24h snooze pill; ignored once
// elapsed. `classStartAlerts` is *separate* from `level` because a
// member who muted feed activity still typically wants to know when
// their live class is starting.

import { readCurrentTenantSlug } from "@/lib/tenant-store"

export type CommunityNotifLevel = "all" | "mentions" | "announcements" | "off"

export interface CommunityNotifPrefs {
  level: CommunityNotifLevel
  snoozeUntilMs?: number
  classStartAlerts?: boolean
}

const SCHEMA = "community.prefs"
const VERSION = "v1"
const SNOOZE_24H_MS = 24 * 60 * 60 * 1000

// Sensible defaults for a member who's never touched the prefs:
//   • Hear @mentions + announcements (the "loud, but only for me" bar)
//   • Snooze unset
//   • Class-start alerts on (independent of level — students who muted
//     a chatty cohort almost always still want the class ping)
const DEFAULT_PREFS: CommunityNotifPrefs = {
  level: "mentions",
  classStartAlerts: true,
}

function storageKey(userId: string | undefined, communityId: string): string | null {
  if (typeof window === "undefined") return null
  const slug = readCurrentTenantSlug()
  if (!slug) return null
  const u = userId ?? "_anon"
  return `thebigclass.t.${slug}.user.${u}.${SCHEMA}.${communityId}.${VERSION}`
}

export function getCommunityNotifPrefs(
  userId: string | undefined,
  communityId: string,
): CommunityNotifPrefs {
  const key = storageKey(userId, communityId)
  if (!key) return DEFAULT_PREFS
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return DEFAULT_PREFS
    const parsed = JSON.parse(raw) as CommunityNotifPrefs
    return {
      level: parsed.level ?? DEFAULT_PREFS.level,
      snoozeUntilMs: parsed.snoozeUntilMs,
      classStartAlerts: parsed.classStartAlerts ?? DEFAULT_PREFS.classStartAlerts,
    }
  } catch {
    return DEFAULT_PREFS
  }
}

export function setCommunityNotifPrefs(
  userId: string | undefined,
  communityId: string,
  next: Partial<CommunityNotifPrefs>,
): CommunityNotifPrefs {
  const current = getCommunityNotifPrefs(userId, communityId)
  const merged: CommunityNotifPrefs = { ...current, ...next }
  const key = storageKey(userId, communityId)
  if (key) {
    try {
      window.localStorage.setItem(key, JSON.stringify(merged))
    } catch { /* quota — ignore */ }
  }
  return merged
}

export function snoozeCommunity24h(
  userId: string | undefined,
  communityId: string,
): CommunityNotifPrefs {
  return setCommunityNotifPrefs(userId, communityId, {
    snoozeUntilMs: Date.now() + SNOOZE_24H_MS,
  })
}

export function clearCommunitySnooze(
  userId: string | undefined,
  communityId: string,
): CommunityNotifPrefs {
  return setCommunityNotifPrefs(userId, communityId, { snoozeUntilMs: undefined })
}

// Convenience read used by the notification dispatcher (eventually).
// Returns true iff a fan-out should actually deliver to this member
// for the given event kind. For now the UI is the only consumer — the
// dispatcher integration lands when notifications move server-side.
export function shouldDeliverToMember(
  userId: string | undefined,
  communityId: string,
  kind: "post" | "mention" | "announcement" | "class-start",
): boolean {
  const prefs = getCommunityNotifPrefs(userId, communityId)
  if (prefs.snoozeUntilMs && prefs.snoozeUntilMs > Date.now()) {
    // Snoozed — let class-start alerts through (if enabled), block
    // everything else.
    return kind === "class-start" && prefs.classStartAlerts !== false
  }
  if (kind === "class-start") return prefs.classStartAlerts !== false
  switch (prefs.level) {
    case "all":
      return true
    case "mentions":
      return kind === "mention" || kind === "announcement"
    case "announcements":
      return kind === "announcement"
    case "off":
      return false
  }
}

export const COMMUNITY_NOTIF_LEVELS: Array<{
  id: CommunityNotifLevel
  label: string
  description: string
}> = [
  { id: "all",           label: "Everything",         description: "Every post, comment, and reply." },
  { id: "mentions",      label: "@Mentions + replies", description: "Only when someone tags you or replies to you, plus announcements." },
  { id: "announcements", label: "Announcements only", description: "Just the host's announcements. No regular posts." },
  { id: "off",           label: "Off",                description: "Nothing from this community. (Class start alerts can stay on separately.)" },
]
