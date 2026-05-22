"use client"

// Cross-tenant faculty registry.
//
// Each tenant's LMS store is keyed by tenant slug in localStorage, so
// a User record only exists inside one tenant at a time. But the same
// teacher might be invited to several workspaces (e.g. an instructor
// who runs courses for two different schools, both on the platform).
// This module keeps a tiny browser-local registry keyed by email
// address that's NOT tenant-scoped — when you invite a faculty
// member, we record which tenant(s) they belong to so the UI can
// show "this person also teaches at <other tenant>" and skip the
// duplicate-invite flow when appropriate.
//
// Backend implementation note: replace this with a server-side
// lookup once auth + a real users table land. The shape returned
// here intentionally matches what such an endpoint would deliver.

const REGISTRY_KEY = "thebigclass.faculty.registry.v1"

export interface FacultyRegistryEntry {
  email: string
  name: string
  phone?: string
  tenantSlugs: string[]
}

type Registry = Record<string, FacultyRegistryEntry>

function readRegistry(): Registry {
  if (typeof window === "undefined") return {}
  try {
    const raw = window.localStorage.getItem(REGISTRY_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === "object" ? (parsed as Registry) : {}
  } catch {
    return {}
  }
}

function writeRegistry(r: Registry) {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(REGISTRY_KEY, JSON.stringify(r))
  } catch {
    /* quota — silently ignore; the registry is a UX hint, not a source of truth */
  }
}

function keyFor(email: string): string {
  return email.trim().toLowerCase()
}

/**
 * Read the registry entry for an email, or undefined if the platform
 * has never seen this teacher before.
 */
export function lookupFaculty(email: string): FacultyRegistryEntry | undefined {
  return readRegistry()[keyFor(email)]
}

/**
 * Mark this faculty member as belonging to the given tenant.
 * Creates the entry if it didn't exist, otherwise unions the tenant
 * slug into the existing list. Also updates name/phone if newer
 * values were passed (an edit in tenant B should improve the hint
 * shown when inviting the same teacher in tenant C).
 */
export function recordFacultyTenant(args: {
  email: string
  name: string
  phone?: string
  tenantSlug: string
}): FacultyRegistryEntry {
  const reg = readRegistry()
  const key = keyFor(args.email)
  const existing = reg[key]
  const tenantSlugs = existing
    ? Array.from(new Set([...existing.tenantSlugs, args.tenantSlug]))
    : [args.tenantSlug]
  const next: FacultyRegistryEntry = {
    email: key,
    name: args.name || existing?.name || "",
    phone: args.phone || existing?.phone,
    tenantSlugs,
  }
  reg[key] = next
  writeRegistry(reg)
  return next
}

/**
 * Remove this tenant from the faculty member's list. Called when the
 * teacher is deleted from a workspace. If the resulting list is
 * empty, the entry itself is dropped so /dashboard/faculty/new can
 * cleanly invite them again later.
 */
export function dropFacultyTenant(email: string, tenantSlug: string) {
  const reg = readRegistry()
  const key = keyFor(email)
  const existing = reg[key]
  if (!existing) return
  const tenantSlugs = existing.tenantSlugs.filter((s) => s !== tenantSlug)
  if (tenantSlugs.length === 0) {
    delete reg[key]
  } else {
    reg[key] = { ...existing, tenantSlugs }
  }
  writeRegistry(reg)
}

/**
 * Lazy hook-ish helper for components — returns the registry entry
 * for an email (or undefined). Doesn't subscribe to storage events
 * because this is a one-shot lookup at form-render time; if the
 * caller needs reactivity they can wrap in useState themselves.
 */
export function useFacultyLookup(email: string | undefined): FacultyRegistryEntry | undefined {
  if (!email) return undefined
  return lookupFaculty(email)
}
