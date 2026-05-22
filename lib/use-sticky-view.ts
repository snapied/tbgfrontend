"use client"

// Persisted "list / kanban" toggle. The user's last choice is what we
// open next time on the same page — across reloads, across tabs, across
// signed-out → signed-in jumps. URL stays the source of truth (so a
// shared link still works), but when the URL has no `view=` param we
// fall back to the last value the user picked, scoped per surface.

import { useCallback, useEffect, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

const LS_PREFIX = "thebigclass.view."
const PARAM = "view"

export type ViewMode = "list" | "kanban"

function isViewMode(v: unknown): v is ViewMode {
  return v === "list" || v === "kanban"
}

export function useStickyView(scope: string, defaultValue: ViewMode = "list"): [ViewMode, (next: ViewMode) => void] {
  const router = useRouter()
  const pathname = usePathname()
  const search = useSearchParams()
  const storageKey = `${LS_PREFIX}${scope}.v1`

  // Initial value resolution order:
  //   1. ?view= from the URL — explicit choice wins.
  //   2. localStorage[<scope>] — what the user picked last time on
  //      this same surface.
  //   3. caller's default.
  // SSR returns the default (no localStorage there); the post-mount
  // effect below corrects to the persisted value on the client.
  const [value, setValue] = useState<ViewMode>(() => {
    const fromUrl = search.get(PARAM)
    if (isViewMode(fromUrl)) return fromUrl
    return defaultValue
  })

  // Reconcile from localStorage on mount when the URL didn't pin a
  // choice. Skipped if the URL already has ?view= — we don't want a
  // shared link's pin to flip away from what was sent.
  useEffect(() => {
    const fromUrl = search.get(PARAM)
    if (isViewMode(fromUrl)) return
    try {
      const stored = window.localStorage.getItem(storageKey)
      if (isViewMode(stored)) setValue(stored)
    } catch {
      /* private browsing — keep state default */
    }
    // We intentionally only run this on mount + when scope changes;
    // re-running every time `search` changes would fight the user's
    // own toggles.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey])

  const update = useCallback(
    (next: ViewMode) => {
      setValue(next)
      try {
        window.localStorage.setItem(storageKey, next)
      } catch {
        /* tolerable */
      }
      // Push ?view=<next> so refresh / share-link continues to honour
      // the choice. Replace (not push) so the back button doesn't
      // gather a history entry per toggle click.
      const params = new URLSearchParams(search.toString())
      params.set(PARAM, next)
      const qs = params.toString()
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    },
    [pathname, router, search, storageKey],
  )

  return [value, update]
}
