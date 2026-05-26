"use client"

// Dashboard-side brand sync.
//
// The frontend `tenant-store` keeps the workspace's brand identity
// (name, logo, primary/accent color, tagline) in localStorage only.
// That's fine for the logged-in teacher's own browser, but visitors
// to /p/<slug>/* in incognito or on a fresh device have no
// localStorage and would see the platform default theme instead.
//
// This hook bridges that gap. Whenever the logged-in user's
// currentTenant changes, we PATCH the matching Organisation row on
// the backend so the public portal can read the right brand from
// /api/orgs/by-slug/:slug. Fire-and-forget — failures degrade to the
// localStorage-only behaviour (dashboard still works, public portal
// just lags one save behind).
//
// Mount once at the dashboard root so it runs for every signed-in
// session. The body is a no-op on incognito / signed-out pages
// (currentTenant === null).

import { useEffect, useRef } from "react"
import { useTenant } from "./tenant-store"
import { syncOrgBrand } from "./org-public-client"

export function useTenantBrandSync(): void {
  const { currentTenant } = useTenant()
  // De-dupe sequential syncs. We compare a coarse fingerprint of the
  // brand-relevant fields and only push when it changes; a busy
  // dashboard re-renders dozens of times per minute, and posting the
  // same brand on each render would burn the backend transaction
  // limits for nothing.
  const lastFingerprint = useRef<string>("")

  useEffect(() => {
    if (typeof window === "undefined") return
    if (!currentTenant?.slug) return
    const token = window.localStorage.getItem("thebigclass.accessToken")
    if (!token) return // signed-out or token expired — wait for next render

    const b = currentTenant.branding ?? {}
    const fp = JSON.stringify({
      n: currentTenant.name,
      l: b.logoUrl ?? null,
      p: b.primaryColor ?? null,
      a: b.accentColor ?? null,
      t: b.tagline ?? null,
    })
    if (fp === lastFingerprint.current) return
    lastFingerprint.current = fp

    void syncOrgBrand(
      currentTenant.slug,
      {
        name: currentTenant.name,
        logoUrl: b.logoUrl ?? null,
        brand: {
          ...(b.primaryColor ? { primaryColor: b.primaryColor } : {}),
          ...(b.accentColor ? { accentColor: b.accentColor } : {}),
          ...(b.tagline ? { tagline: b.tagline } : {}),
        },
      },
      token,
    )
  }, [currentTenant?.slug, currentTenant?.name, currentTenant?.branding])
}
