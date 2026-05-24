"use client"

// Per-(user, community) preferences and progress.
//
// Powers three Sprint B Communities items:
//   • #4  onboarding checklist (5 actions; per-member, dismissable)
//   • #16 notification preset (Off / Mentions / All)
//   • #47 read-state markers (last post seen)
//
// Storage shape:
//   `thebigclass.t.<slug>.community-prefs.<userId>.<communityId>` →
//     { onboardingDone: Record<step, boolean>, onboardingDismissed,
//       notificationPreset, lastPostSeenAt }
//
// localStorage-only for the POC; promote to server when cross-device
// continuity becomes worth a round trip.

import { useCallback, useEffect, useMemo, useState } from "react"

export type OnboardingStep =
  | "intro"          // wrote an intro post
  | "set-notifs"     // visited notification settings
  | "react"          // reacted to a post
  | "follow-spaces"  // (placeholder, surfaces in #25 channels later)
  | "invite"         // tapped the invite button

export type NotificationPreset = "all" | "mentions" | "off"

interface MemberPrefs {
  onboardingDone: Partial<Record<OnboardingStep, boolean>>
  onboardingDismissed: boolean
  notificationPreset: NotificationPreset
  /** ISO timestamp of the most recent post the user has seen (used
   *  to compute unread counts cheaply). */
  lastPostSeenAt: string
}

const DEFAULT_PREFS: MemberPrefs = {
  onboardingDone: {},
  onboardingDismissed: false,
  notificationPreset: "mentions",
  lastPostSeenAt: new Date(0).toISOString(),
}

function storageKey(tenantSlug: string, userId: string, communityId: string): string {
  return `thebigclass.t.${tenantSlug || "default"}.community-prefs.${userId}.${communityId}`
}

function readPrefs(key: string): MemberPrefs {
  if (typeof window === "undefined") return DEFAULT_PREFS
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return DEFAULT_PREFS
    const parsed = JSON.parse(raw) as Partial<MemberPrefs>
    return { ...DEFAULT_PREFS, ...parsed }
  } catch {
    return DEFAULT_PREFS
  }
}

function writePrefs(key: string, prefs: MemberPrefs): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(key, JSON.stringify(prefs))
    window.dispatchEvent(new CustomEvent("community-prefs-changed"))
  } catch {
    /* private browsing — best-effort */
  }
}

interface UseMemberPrefsOptions {
  tenantSlug: string
  userId: string | undefined
  communityId: string | undefined
}

export interface UseMemberPrefsApi {
  prefs: MemberPrefs
  markOnboardingDone: (step: OnboardingStep) => void
  dismissOnboarding: () => void
  /** Sprint D bugfix — restore the checklist after a dismissal.
   *  Surfaced as "Show checklist" link in the toolkit. */
  restoreOnboarding: () => void
  setNotificationPreset: (next: NotificationPreset) => void
  /** Mark the feed read up to "now". Called when the member opens
   *  the community page so the next visit knows what's new. */
  markFeedSeen: () => void
  /** Count of posts created after lastPostSeenAt — caller supplies
   *  the post list because the prefs hook doesn't see community
   *  data directly. */
  unreadCount: (postCreatedAts: string[]) => number
}

export function useCommunityMemberPrefs({
  tenantSlug,
  userId,
  communityId,
}: UseMemberPrefsOptions): UseMemberPrefsApi {
  const key = useMemo(
    () =>
      userId && communityId
        ? storageKey(tenantSlug, userId, communityId)
        : null,
    [tenantSlug, userId, communityId],
  )
  const [prefs, setPrefs] = useState<MemberPrefs>(DEFAULT_PREFS)

  // Hydrate on mount + listen for cross-component updates so the
  // sidebar badge updates the moment the user clears their onboarding
  // step in the main feed.
  useEffect(() => {
    if (!key) {
      setPrefs(DEFAULT_PREFS)
      return
    }
    const refresh = () => setPrefs(readPrefs(key))
    refresh()
    window.addEventListener("community-prefs-changed", refresh)
    window.addEventListener("storage", refresh)
    return () => {
      window.removeEventListener("community-prefs-changed", refresh)
      window.removeEventListener("storage", refresh)
    }
  }, [key])

  // The bugfix that matters: read localStorage as source of truth
  // on every update instead of merging against the closure-captured
  // `prefs`. The previous version raced — when a parent useEffect
  // (e.g. CommonRoom's markFeedSeen on mount) fired around the same
  // tick as the hydration effect, the update used the stale
  // DEFAULT_PREFS closure and wrote it back to localStorage,
  // wiping any onboarding ticks the user had just made. Symptom:
  // the checklist ticked visually, then on refresh came back empty.
  //
  // Reading fresh from localStorage costs one synchronous read (≤ 1
  // ms for our payload size) and makes the writes commutative
  // regardless of render order. The setPrefs at the end keeps the
  // React mirror in sync for the current component.
  const update = useCallback(
    (patch: Partial<MemberPrefs>) => {
      if (!key) return
      const current = readPrefs(key)
      const next = { ...current, ...patch }
      writePrefs(key, next)
      setPrefs(next)
    },
    [key],
  )

  // Same race-fix story as `update` above. We compose the new
  // onboardingDone map from localStorage, not the closure'd prefs,
  // so two rapid ticks (e.g. user clicks intro + reacts within the
  // same render tick) compose correctly even if React batched the
  // re-renders. The setPrefs in `update` keeps the mirror current.
  const markOnboardingDone = useCallback(
    (step: OnboardingStep) => {
      if (!key) return
      const current = readPrefs(key)
      if (current.onboardingDone[step]) return
      const next: MemberPrefs = {
        ...current,
        onboardingDone: { ...current.onboardingDone, [step]: true },
      }
      writePrefs(key, next)
      setPrefs(next)
    },
    [key],
  )

  const dismissOnboarding = useCallback(() => {
    if (!key) return
    const current = readPrefs(key)
    if (current.onboardingDismissed) return
    const next: MemberPrefs = { ...current, onboardingDismissed: true }
    writePrefs(key, next)
    setPrefs(next)
  }, [key])

  /** Sprint D bugfix — restore-checklist affordance. Lets the user
   *  bring the onboarding strip back after they X'd it, instead of
   *  permanently hiding it. The toolkit surfaces a small "Show
   *  checklist" link when dismissed=true and the user has unfinished
   *  steps. */
  const restoreOnboarding = useCallback(() => {
    if (!key) return
    const current = readPrefs(key)
    if (!current.onboardingDismissed) return
    const next: MemberPrefs = { ...current, onboardingDismissed: false }
    writePrefs(key, next)
    setPrefs(next)
  }, [key])

  const setNotificationPreset = useCallback(
    (nextPreset: NotificationPreset) => {
      // Route through `update`, which now reads fresh on every
      // write — so changing notification settings doesn't clobber
      // onboarding progress saved milliseconds earlier.
      update({ notificationPreset: nextPreset })
    },
    [update],
  )

  const markFeedSeen = useCallback(() => {
    // Same path. Stamping lastPostSeenAt used to overwrite
    // onboarding state when this fired during the mount race —
    // fixed by `update` now reading localStorage first.
    update({ lastPostSeenAt: new Date().toISOString() })
  }, [update])

  const unreadCount = useCallback(
    (postCreatedAts: string[]): number => {
      const last = prefs.lastPostSeenAt
      return postCreatedAts.filter((t) => (t ?? "") > last).length
    },
    [prefs.lastPostSeenAt],
  )

  return {
    prefs,
    markOnboardingDone,
    dismissOnboarding,
    restoreOnboarding,
    setNotificationPreset,
    markFeedSeen,
    unreadCount,
  }
}

/** Static list of onboarding steps + descriptions, used by the
 *  checklist UI. Order = display order. */
export const ONBOARDING_STEPS: Array<{
  id: OnboardingStep
  label: string
  hint: string
}> = [
  {
    id: "intro",
    label: "Introduce yourself",
    hint: "Drop a hello in the feed — even one line counts.",
  },
  {
    id: "react",
    label: "React to a post",
    hint: "Hit an emoji on something — lowest-effort engagement.",
  },
  {
    id: "set-notifs",
    label: "Set how loud you want this to be",
    hint: "Pick: All posts · Mentions only · Off. Default is Mentions.",
  },
  {
    id: "follow-spaces",
    label: "Skim the pinned posts",
    hint: "The pins are the orientation guide. Two minutes well spent.",
  },
  {
    id: "invite",
    label: "Invite someone in",
    hint: "Communities with friends inside have 4x retention.",
  },
]
