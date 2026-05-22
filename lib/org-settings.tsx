"use client"

// Org-level settings that flow into every certificate (organisation name,
// logo, brand colours). Persisted to localStorage so the user only types
// them once, then every cert + every new template picks them up by
// default. Replace the localStorage layer with an API call when a real
// backend is wired up — the consumer hooks stay the same.

import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react"
import { currentTenantCountry, readCurrentTenantSlug } from "./tenant-store"
import { countryToCurrency } from "./currency"

export interface OrgNotificationPrefs {
  batchCompletion: boolean
  verificationAlerts: boolean
  weeklySummary: boolean
  newEnrollment: boolean
  assignmentSubmitted: boolean
}

export interface OrgSettings {
  organisationName: string
  logoUrl?: string
  brandPrimaryColor?: string
  brandAccentColor?: string
  // Free-form short tagline used by some templates as a sub-headline.
  tagline?: string
  // Outbound notification preferences for the admin/instructor. These were
  // local component state before — moving here so they survive a refresh and
  // can be consumed by the dispatcher later.
  notifications?: OrgNotificationPrefs
  // ISO-4217 — the default currency new courses / products are priced in.
  // Seeded on first boot from the tenant's signup country (India → INR,
  // otherwise USD) and overridable from the Settings page.
  defaultCurrency?: string
}

// Per-tenant storage. The legacy unscoped key is migrated to the platform
// workspace on first boot (see lms-store.tsx) so this just reads the
// already-correct value.
const LEGACY_STORAGE_KEY = "thebigclass.orgSettings.v1"
function storageKey(slug: string) {
  return `thebigclass.t.${slug}.orgSettings.v1`
}

const DEFAULT_NOTIFICATIONS: OrgNotificationPrefs = {
  batchCompletion: true,
  verificationAlerts: false,
  weeklySummary: true,
  newEnrollment: true,
  assignmentSubmitted: true,
}

const DEFAULTS: OrgSettings = {
  organisationName: "The Big Class",
  brandPrimaryColor: "#0a3024",
  brandAccentColor: "#d4af37",
  notifications: DEFAULT_NOTIFICATIONS,
}

interface OrgSettingsStore {
  settings: OrgSettings
  update: (patch: Partial<OrgSettings>) => void
  reset: () => void
}

const OrgSettingsContext = createContext<OrgSettingsStore | null>(null)

export function OrgSettingsProvider({ children }: { children: ReactNode }) {
  // Resolve the tenant slug once at mount; switching tenants triggers a
  // full reload (via the resolver's localStorage override + URL query),
  // so the provider re-mounts with fresh state.
  const slug = typeof window !== "undefined" ? readCurrentTenantSlug() : "default"
  const KEY = storageKey(slug)

  const [settings, setSettings] = useState<OrgSettings>(DEFAULTS)
  const [hydrated, setHydrated] = useState(false)

  // Read-from-storage extracted so we can call it both on mount and on
  // cross-frame `storage` events (so the iframe preview reflects brand
  // edits made in the parent dashboard immediately).
  const hydrate = useCallback(() => {
    let next: OrgSettings = DEFAULTS
    try {
      let raw = window.localStorage.getItem(KEY)
      if (!raw) {
        raw = window.localStorage.getItem(LEGACY_STORAGE_KEY)
        if (raw) window.localStorage.setItem(KEY, raw)
      }
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<OrgSettings>
        next = { ...DEFAULTS, ...parsed }
      }
    } catch { /* ignore */ }
    if (!next.defaultCurrency) {
      next = { ...next, defaultCurrency: countryToCurrency(currentTenantCountry()) }
    }
    setSettings(next)
  }, [KEY])

  useEffect(() => {
    hydrate()
    setHydrated(true)
  }, [hydrate])

  useEffect(() => {
    if (!hydrated) return
    try { window.localStorage.setItem(KEY, JSON.stringify(settings)) } catch { /* ignore */ }
  }, [settings, hydrated, KEY])

  // Cross-frame sync. When the dashboard updates brand fields in the
  // parent window, the iframe-rendered public portal needs to pick up
  // the change without a manual refresh. The `storage` event fires in
  // every OTHER same-origin window when localStorage is written.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== KEY) return
      hydrate()
    }
    window.addEventListener("storage", onStorage)
    return () => window.removeEventListener("storage", onStorage)
  }, [KEY, hydrate])

  const update = useCallback((patch: Partial<OrgSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }))
  }, [])

  const reset = useCallback(() => setSettings(DEFAULTS), [])

  return (
    <OrgSettingsContext.Provider value={{ settings, update, reset }}>
      {children}
    </OrgSettingsContext.Provider>
  )
}

export function useOrgSettings(): OrgSettingsStore {
  const ctx = useContext(OrgSettingsContext)
  if (!ctx) throw new Error("useOrgSettings must be used inside <OrgSettingsProvider>")
  return ctx
}

// Synchronous reader for code outside React (e.g. the PDF generator).
export function readOrgSettings(): OrgSettings {
  if (typeof window === "undefined") return DEFAULTS
  try {
    const slug = readCurrentTenantSlug()
    const raw =
      window.localStorage.getItem(storageKey(slug)) ??
      window.localStorage.getItem(LEGACY_STORAGE_KEY)
    const base = raw ? { ...DEFAULTS, ...(JSON.parse(raw) as Partial<OrgSettings>) } : DEFAULTS
    // Mirror the provider's first-boot default so callers outside React
    // (PDF generator, server-rendered email templates) see the same
    // currency the dashboard does.
    return base.defaultCurrency
      ? base
      : { ...base, defaultCurrency: countryToCurrency(currentTenantCountry()) }
  } catch {
    return DEFAULTS
  }
}
