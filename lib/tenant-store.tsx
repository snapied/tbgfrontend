"use client"

// Multi-tenant foundation.
//
// Today this is a frontend-only stub: the tenant list and "current tenant"
// pointer live in localStorage. The provider exposes the shape every consumer
// needs (current tenant + CRUD) so when a real backend lands the swap is just
// changing this module — store reads become API calls, and the storage-key
// namespacing in `lms-store.tsx` becomes a `WHERE tenant_id = ?` filter on
// the server.
//
// Tenant resolution at runtime (subdomain / custom domain / dev override)
// lives in `lib/tenant-resolver.ts`.

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"
import {
  PLATFORM_HOST,
  resolveTenantSlug,
  setDevTenantOverride,
} from "./tenant-resolver"
import { runLegacyKeyMigration } from "./storage-migration"

// Run the prefix migration the moment this module is evaluated on the client.
// Every other store imports through here (or via lms-store / org-settings,
// which also import the migration helper), so the rename happens before any
// reader looks at localStorage.
if (typeof window !== "undefined") runLegacyKeyMigration()

// ============================================================
// Types
// ============================================================

export type TenantStatus = "trial" | "active" | "suspended" | "archived"
export type TenantPlan = "free" | "starter" | "growth" | "scale"
export type CustomDomainStatus = "none" | "pending" | "verified" | "failed"

export interface TenantBranding {
  logoUrl?: string
  primaryColor?: string
  accentColor?: string
  tagline?: string
}

// "What are you mostly here for?" — surfaces what kind of academy this is
// so the dashboard can prioritise the right tooling later.
export type TenantUseCase =
  | "solo-instructor"   // a single creator selling courses
  | "school"            // K-12 / coaching institute
  | "college"           // higher-ed department
  | "corporate"         // L&D / employee training
  | "ngo"               // non-profit / mission-driven
  | "other"

// Attribution: how did this tenant find the platform? Drives marketing-spend
// allocation. Optional but the dropdown is sticky on first paint.
export type AcquisitionChannel =
  | "google"
  | "social"            // Twitter / LinkedIn / etc.
  | "youtube"
  | "friend"            // word-of-mouth
  | "podcast"
  | "blog-article"
  | "event"
  | "other"

export interface Tenant {
  id: string
  slug: string                // subdomain part: `<slug>.<PLATFORM_HOST>`
  name: string
  customDomain?: string       // e.g. learn.acmeacademy.com
  customDomainStatus: CustomDomainStatus
  plan: TenantPlan
  status: TenantStatus
  trialEndsAt?: string        // ISO
  ownerEmail: string
  ownerName: string
  branding: TenantBranding
  // Signup intake fields — optional, collected during /signup.
  ownerPhone?: string         // E.164 / freeform — used for WhatsApp later
  country?: string            // ISO-3166 alpha-2 (e.g. "IN")
  useCase?: TenantUseCase
  acquisitionChannel?: AcquisitionChannel
  acquisitionDetail?: string  // free-form note when channel === "other"
  existingWebsite?: string    // optional URL collected before onboarding scrape
  // Verification stamps. Email is set after the user clicks the link in
  // their welcome email. Phone is reserved for the future WhatsApp-OTP
  // flow (Twilio / WhatsApp Cloud API).
  emailVerifiedAt?: string
  phoneVerifiedAt?: string
  // Throttle "resend verification email" so a worried user can't pound it.
  lastVerifyEmailSentAt?: string
  createdAt: string
  notes?: string              // platform-admin-only notes
}

interface CreateTenantInput {
  workspaceName: string
  slug: string
  ownerName: string
  ownerEmail: string
  ownerPhone: string                   // E.164 — required (WhatsApp number)
  country?: string
  useCase?: TenantUseCase
  acquisitionChannel?: AcquisitionChannel
  acquisitionDetail?: string
  existingWebsite?: string
}

// ============================================================
// Storage
// ============================================================

const TENANTS_KEY = "thebigclass.platform.tenants.v1"
const CURRENT_TENANT_KEY = "thebigclass.platform.currentTenant.v1"
// Shared with /verify-email/[token]/page.tsx — every successfully-validated
// verification stamps the email here so future TenantProvider mounts (in
// other tabs, after reloads, on dashboards opened before signup) can
// back-fill `emailVerifiedAt` for any tenant whose owner email matches.
const VERIFIED_EMAILS_KEY = "thebigclass.global.verifiedEmails.v1"

// Seed tenant — so a fresh install isn't an empty platform.
const SEED_TENANTS: Tenant[] = [
  {
    id: "tenant-platform",
    slug: "platform",
    name: "The Big Class HQ",
    customDomainStatus: "none",
    plan: "scale",
    status: "active",
    ownerEmail: "admin@thebigclass.com",
    ownerName: "Platform Admin",
    branding: {
      primaryColor: "#0a3024",
      accentColor: "#d4af37",
    },
    createdAt: "2026-01-01T00:00:00Z",
    notes: "Platform owner workspace — do not delete.",
  },
]

const SLUG_RE = /^[a-z0-9][a-z0-9-]{1,30}[a-z0-9]$/
const RESERVED_SLUGS = new Set([
  "www", "app", "api", "admin", "superadmin", "signup", "login", "signin",
  "signout", "onboarding", "settings", "billing", "help", "support", "docs",
  "blog", "static", "assets", "public", "auth", "dashboard", "learn", "verify",
  "quiz", "assignment", "courses", "platform", "tbc", "thebigclass",
])

export function validateSlug(slug: string): string | null {
  if (!slug) return "Pick a workspace URL."
  if (!SLUG_RE.test(slug)) return "Use 3–32 lowercase letters, numbers, or hyphens (cannot start or end with a hyphen)."
  if (RESERVED_SLUGS.has(slug)) return "That URL is reserved. Pick another."
  return null
}

// Normalize a phone number to its digit-only suffix so "+91 98765 43210" and
// "9876543210" compare equal. Returns "" for empty/undefined input. We keep
// the last 10 digits when the string is long enough — enough to match Indian
// mobile numbers regardless of how the country code was typed — and fall back
// to the full digit string for shorter inputs.
export function normalizePhone(input: string | undefined | null): string {
  const digits = (input ?? "").replace(/\D/g, "")
  if (!digits) return ""
  return digits.length > 10 ? digits.slice(-10) : digits
}

export function suggestSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 32) || "workspace"
}

// ============================================================
// Context
// ============================================================

interface TenantStore {
  // Whole list (platform-admin-level data)
  tenants: Tenant[]
  // The tenant whose data the current browser is viewing. Resolved from
  // hostname (subdomain or custom domain) or from a dev override (?tenant=).
  currentTenant: Tenant | null
  isHydrated: boolean

  registerTenant: (input: CreateTenantInput) => { ok: true; tenant: Tenant } | { ok: false; error: string }
  updateTenant: (id: string, patch: Partial<Tenant>) => void
  deleteTenant: (id: string) => void

  // Returns true if the slug is free (treating it as case-insensitive).
  isSlugAvailable: (slug: string, excludeId?: string) => boolean
  // Same idea for the two other login identifiers — owner email and WhatsApp
  // number. Used by the signup form to give live "already in use" feedback
  // before the user hits submit.
  isEmailAvailable: (email: string, excludeId?: string) => boolean
  isPhoneAvailable: (phone: string, excludeId?: string) => boolean

  // Look up a tenant by either owner email or WhatsApp number. Phone matching
  // is digit-suffix tolerant so users can type "9876543210" or "+919876543210"
  // and still land on the same workspace. Returns null when no match.
  findTenantByLogin: (identifier: string) => Tenant | null

  // For dev: explicitly switch which tenant the browser is viewing.
  // Persists across reloads via localStorage.
  switchTenant: (slug: string | null) => void

  // Custom domain workflow stubs.
  requestCustomDomain: (id: string, domain: string) => void
  verifyCustomDomain: (id: string) => void
  removeCustomDomain: (id: string) => void
}

const TenantContext = createContext<TenantStore | null>(null)

// ============================================================
// Provider
// ============================================================

export function TenantProvider({ children }: { children: ReactNode }) {
  const [tenants, setTenants] = useState<Tenant[]>(SEED_TENANTS)
  const [tenantsHydrated, setTenantsHydrated] = useState(false)
  // The resolved slug (from hostname / override) — re-resolved at mount.
  const [currentSlug, setCurrentSlug] = useState<string | null>(null)

  // Hydrate tenants from localStorage. After loading, fold in any "verified
  // emails" recorded by the verify-email page (see VERIFIED_EMAILS_KEY) so
  // tenants whose owner email is in that set are stamped verified even if
  // the verify page ran in a different tab / before tenants were hydrated.
  useEffect(() => {
    let nextTenants: Tenant[] | null = null
    try {
      const raw = window.localStorage.getItem(TENANTS_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as Tenant[]
        if (Array.isArray(parsed) && parsed.length > 0) nextTenants = parsed
      }
    } catch { /* ignore */ }

    // Back-fill emailVerifiedAt from the global verified-emails set.
    try {
      const rawSet = window.localStorage.getItem(VERIFIED_EMAILS_KEY)
      if (rawSet) {
        const verifiedSet = new Set<string>((JSON.parse(rawSet) as string[]).map((e) => e.toLowerCase()))
        const source = nextTenants ?? SEED_TENANTS
        const now = new Date().toISOString()
        const folded = source.map((t) =>
          !t.emailVerifiedAt && verifiedSet.has(t.ownerEmail.toLowerCase())
            ? { ...t, emailVerifiedAt: now }
            : t,
        )
        // Only replace if something actually changed, to avoid an unnecessary
        // setState / localStorage rewrite on every mount.
        if (folded.some((t, i) => t !== source[i])) nextTenants = folded
      }
    } catch { /* ignore */ }

    if (nextTenants) setTenants(nextTenants)
    // Resolve which tenant this browser is viewing.
    setCurrentSlug(resolveTenantSlug())
    setTenantsHydrated(true)
  }, [])

  useEffect(() => {
    if (!tenantsHydrated) return
    try {
      window.localStorage.setItem(TENANTS_KEY, JSON.stringify(tenants))
    } catch { /* ignore */ }
  }, [tenants, tenantsHydrated])

  // Cross-frame sync: if another window/iframe on the same origin
  // updates the tenants blob (e.g. the dashboard saves a brand change
  // that touches tenant.branding), pull it in here so an embedded
  // portal preview reflects the new branding immediately.
  useEffect(() => {
    if (!tenantsHydrated) return
    const onStorage = (e: StorageEvent) => {
      if (e.key !== TENANTS_KEY || !e.newValue) return
      try {
        const parsed = JSON.parse(e.newValue) as Tenant[]
        if (Array.isArray(parsed)) setTenants(parsed)
      } catch { /* ignore */ }
    }
    window.addEventListener("storage", onStorage)
    return () => window.removeEventListener("storage", onStorage)
  }, [tenantsHydrated])

  // ---- Derived ----
  const currentTenant = useMemo<Tenant | null>(() => {
    if (!currentSlug) {
      // Default: first active tenant. Lets the dashboard work out-of-the-box
      // when no subdomain is set (dev or the platform owner's bare host).
      return tenants.find((t) => t.status === "active") ?? tenants[0] ?? null
    }
    return tenants.find((t) => t.slug === currentSlug) ?? null
  }, [tenants, currentSlug])

  // ---- Actions ----
  const isSlugAvailable = useCallback(
    (slug: string, excludeId?: string) =>
      !tenants.some((t) => t.slug.toLowerCase() === slug.toLowerCase() && t.id !== excludeId),
    [tenants],
  )

  const isEmailAvailable = useCallback(
    (email: string, excludeId?: string) => {
      const needle = email.trim().toLowerCase()
      if (!needle) return true
      return !tenants.some((t) => t.ownerEmail.toLowerCase() === needle && t.id !== excludeId)
    },
    [tenants],
  )

  const isPhoneAvailable = useCallback(
    (phone: string, excludeId?: string) => {
      const needle = normalizePhone(phone)
      if (!needle) return true
      return !tenants.some((t) => normalizePhone(t.ownerPhone) === needle && t.id !== excludeId)
    },
    [tenants],
  )

  const findTenantByLogin = useCallback(
    (identifier: string): Tenant | null => {
      const raw = identifier.trim()
      if (!raw) return null
      if (raw.includes("@")) {
        const needle = raw.toLowerCase()
        return tenants.find((t) => t.ownerEmail.toLowerCase() === needle) ?? null
      }
      const needle = normalizePhone(raw)
      if (!needle) return null
      return tenants.find((t) => normalizePhone(t.ownerPhone) === needle) ?? null
    },
    [tenants],
  )

  const registerTenant = useCallback(
    (input: CreateTenantInput) => {
      const slug = input.slug.toLowerCase().trim()
      const slugErr = validateSlug(slug)
      if (slugErr) return { ok: false as const, error: slugErr }
      if (!isSlugAvailable(slug)) return { ok: false as const, error: "That workspace URL is taken." }
      if (!input.ownerEmail || !/^[^@]+@[^@]+\.[^@]+$/.test(input.ownerEmail)) {
        return { ok: false as const, error: "Enter a valid email." }
      }
      if (!isEmailAvailable(input.ownerEmail)) {
        return { ok: false as const, error: "An account with this email already exists. Try signing in instead." }
      }
      // WhatsApp number is required for every new workspace. Accept any
      // E.164-shaped string (+ followed by 7-15 digits) — the form does the
      // strict per-country check; this is the last line of defence.
      const phone = (input.ownerPhone ?? "").trim()
      if (!/^\+\d{7,15}$/.test(phone)) {
        return { ok: false as const, error: "WhatsApp number is required (with country code)." }
      }
      if (!isPhoneAvailable(phone)) {
        return { ok: false as const, error: "This WhatsApp number is already linked to another account. Each number can only be used once." }
      }

      const tenant: Tenant = {
        id: `tenant-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
        slug,
        name: input.workspaceName.trim() || slug,
        customDomainStatus: "none",
        plan: "free",
        status: "trial",
        // 14-day trial.
        trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        ownerEmail: input.ownerEmail.trim().toLowerCase(),
        ownerName: input.ownerName.trim() || input.ownerEmail.split("@")[0],
        ownerPhone: phone,
        country: input.country || undefined,
        useCase: input.useCase,
        acquisitionChannel: input.acquisitionChannel,
        acquisitionDetail: input.acquisitionDetail?.trim() || undefined,
        existingWebsite: input.existingWebsite?.trim() || undefined,
        branding: {
          primaryColor: "#0a3024",
          accentColor: "#d4af37",
        },
        createdAt: new Date().toISOString(),
      }
      setTenants((prev) => [...prev, tenant])
      return { ok: true as const, tenant }
    },
    [isSlugAvailable],
  )

  const updateTenant = useCallback((id: string, patch: Partial<Tenant>) => {
    setTenants((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)))
  }, [])

  const deleteTenant = useCallback((id: string) => {
    setTenants((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const switchTenant = useCallback((slug: string | null) => {
    // Migrate any anonymous-bucket data the user accumulated before
    // signing up into the real tenant namespace. This handles the
    // signup→first-edit window: they may have edited brand / pages
    // before switchTenant fired, and that data was keyed by the
    // per-browser _anon_xxx slug.
    if (slug && typeof window !== "undefined") {
      try {
        const anon = window.localStorage.getItem(ANON_SLUG_KEY)
        if (anon && anon.startsWith("_anon_") && anon !== slug) {
          const prefix = `thebigclass.t.${anon}.`
          const targetPrefix = `thebigclass.t.${slug}.`
          const keys = Object.keys(window.localStorage).filter((k) => k.startsWith(prefix))
          for (const k of keys) {
            const value = window.localStorage.getItem(k)
            if (value == null) continue
            const targetKey = targetPrefix + k.slice(prefix.length)
            // Only migrate when the target doesn't already exist —
            // never overwrite real-tenant data.
            if (window.localStorage.getItem(targetKey) == null) {
              window.localStorage.setItem(targetKey, value)
            }
            window.localStorage.removeItem(k)
          }
          // Rotate the anon slug so the next pre-signup session
          // (after logout) doesn't share with this tenant's old
          // anon bucket either.
          window.localStorage.removeItem(ANON_SLUG_KEY)
        }
      } catch {
        /* private browsing — fine */
      }
    }
    setDevTenantOverride(slug)
    setCurrentSlug(slug)
  }, [])

  // ---- Custom domain workflow ----
  // Real-world: tenant submits domain → we store CNAME instructions and a
  // verification token → background job pings DNS and flips the status →
  // CDN/SSL is provisioned. For now we just walk the state machine locally.
  const requestCustomDomain = useCallback((id: string, domain: string) => {
    const clean = domain.toLowerCase().trim().replace(/^https?:\/\//, "").replace(/\/.*$/, "")
    setTenants((prev) =>
      prev.map((t) => (t.id === id ? { ...t, customDomain: clean, customDomainStatus: "pending" } : t)),
    )
  }, [])
  const verifyCustomDomain = useCallback((id: string) => {
    setTenants((prev) =>
      prev.map((t) => (t.id === id ? { ...t, customDomainStatus: "verified" } : t)),
    )
  }, [])
  const removeCustomDomain = useCallback((id: string) => {
    setTenants((prev) =>
      prev.map((t) => (t.id === id ? { ...t, customDomain: undefined, customDomainStatus: "none" } : t)),
    )
  }, [])

  const value: TenantStore = {
    tenants,
    currentTenant,
    isHydrated: tenantsHydrated,
    registerTenant,
    updateTenant,
    deleteTenant,
    isSlugAvailable,
    isEmailAvailable,
    isPhoneAvailable,
    findTenantByLogin,
    switchTenant,
    requestCustomDomain,
    verifyCustomDomain,
    removeCustomDomain,
  }

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>
}

export function useTenant(): TenantStore {
  const ctx = useContext(TenantContext)
  if (!ctx) throw new Error("useTenant must be used inside <TenantProvider>")
  return ctx
}

// Synchronous read for code outside React (storage-key namespacing in
// lms-store needs to know the current tenant before any provider mounts).
// Per-browser anonymous slug. Used as the localStorage namespace
// before a real tenant is resolved (e.g. between landing on /signup
// and the moment switchTenant(slug) writes the new tenant). Once
// the real tenant resolves, switchTenant migrates the anon bucket
// into the real one.
//
// Why this matters for security:
//   The previous fallback was the literal string "default", which
//   meant every browser that hadn't yet resolved a tenant wrote to
//   the SAME `thebigclass.t.default.*` bucket. Two different users
//   on the same machine, or two parallel signup flows in different
//   windows, would pool their portal pages / brand / etc. into one
//   shared namespace — visible to whichever tenant resolved first.
//
// A per-browser random anon slug eliminates that. It's stored once
// (in plain localStorage) and reused for every subsequent boot, so
// any data the user accumulated before signing up is theirs alone
// and migrates cleanly into their final tenant.
const ANON_SLUG_KEY = "thebigclass.anonTenantSlug.v1"

function readOrCreateAnonSlug(): string {
  try {
    const existing = window.localStorage.getItem(ANON_SLUG_KEY)
    if (existing && existing.startsWith("_anon_")) return existing
    const fresh = `_anon_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`
    window.localStorage.setItem(ANON_SLUG_KEY, fresh)
    return fresh
  } catch {
    // Private browsing / quota — return a deterministic-per-tab
    // sentinel. Worst case the data won't persist; that's fine.
    return "_anon_session"
  }
}

export function readCurrentTenantSlug(): string {
  if (typeof window === "undefined") return "_anon_ssr"
  return resolveTenantSlug() ?? readOrCreateAnonSlug()
}

// Synchronous lookup of the owner email for the current tenant. Used by
// the LMS store to derive currentUser without taking a circular React
// dependency on the TenantContext.
export function currentTenantOwnerEmail(): string | undefined {
  if (typeof window === "undefined") return undefined
  try {
    const raw = window.localStorage.getItem(TENANTS_KEY)
    if (!raw) return undefined
    const parsed = JSON.parse(raw) as Tenant[]
    const slug = resolveTenantSlug()
    if (!slug) return parsed.find(t => t.status === "active")?.ownerEmail
    return parsed.find(t => t.slug === slug)?.ownerEmail
  } catch {
    return undefined
  }
}

// Sibling of currentTenantOwnerEmail — returns the ISO-3166 alpha-2 country
// the tenant signed up from. OrgSettings reads this on first boot to seed
// the default currency (India → INR, otherwise USD). Same lookup pattern,
// same trade-offs.
export function currentTenantCountry(): string | undefined {
  if (typeof window === "undefined") return undefined
  try {
    const raw = window.localStorage.getItem(TENANTS_KEY)
    if (!raw) return undefined
    const parsed = JSON.parse(raw) as Tenant[]
    const slug = resolveTenantSlug()
    if (!slug) return parsed.find(t => t.status === "active")?.country
    return parsed.find(t => t.slug === slug)?.country
  } catch {
    return undefined
  }
}

// Public hostname helpers — exported here so callers don't need to import the
// resolver module directly for the common cases.
export { PLATFORM_HOST }
export const CURRENT_TENANT_STORAGE_KEY = CURRENT_TENANT_KEY
