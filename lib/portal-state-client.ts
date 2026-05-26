// Server-side helper for Next.js API routes that need to read or
// write tenant portal state — without going through the public
// /api/portal-state/[slug] proxy. Same HTTP target, just bypasses
// the extra Next hop so server code doesn't loop back through its
// own routing layer.
//
// The previous file-based implementation lived at
// lib/portal-state-server.ts (deleted). This one is a drop-in
// replacement with three additions over the old surface:
//
//   • listSlugs()           — replaces fs.readdir() for code that
//                             needs to enumerate tenants (cert
//                             lookup, razorpay webhook dispatch).
//   • SYSTEM_SLUG           — reserved namespace for non-tenant
//                             caches (razorpay events log,
//                             razorpay plan cache). Anything that
//                             used to live next to tenant blobs
//                             but wasn't tenant data lands here
//                             instead.
//   • Failures don't throw  — backend unreachable returns empty
//                             results so a wedged backend never
//                             corrupts a webhook handler. Callers
//                             that need strict semantics can check
//                             the returned error in the .error field.
//
// All functions are `runtime: "nodejs"` safe (use `fetch`, no
// browser globals).

const SLUG_RE = /^[a-z0-9_-]+$/i

export const SYSTEM_SLUG = "_system"

function backendBase(): string {
  return (
    process.env.BACKEND_API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:4000"
  ).replace(/\/$/, "")
}

function assertSlug(slug: string): void {
  if (!slug || !SLUG_RE.test(slug)) {
    throw new Error(`Invalid tenant slug: ${slug}`)
  }
}

export type PortalStateBlob = Record<string, unknown>

// Load every key for a tenant as one object. Returns {} on miss or
// backend error — semantically the same as the old fs.readFile that
// caught ENOENT.
export async function loadPortalState(slug: string): Promise<PortalStateBlob> {
  assertSlug(slug)
  try {
    const res = await fetch(
      `${backendBase()}/api/portal-state/${encodeURIComponent(slug)}`,
      { cache: "no-store" },
    )
    if (!res.ok) return {}
    const body = (await res.json()) as { ok?: boolean; state?: PortalStateBlob }
    return body.state ?? {}
  } catch {
    return {}
  }
}

// Single-key read. Convenience for callers that only need one
// suffix — internally still a full GET because the backend returns
// the whole blob in one round-trip. If hot enough we can add a
// per-key endpoint later, but the blob is small (rarely >50 KB)
// and the savings would be marginal.
export async function loadPortalKey<T = unknown>(
  slug: string,
  key: string,
): Promise<T | undefined> {
  const blob = await loadPortalState(slug)
  return blob[key] as T | undefined
}

export async function upsertPortalKey(
  slug: string,
  key: string,
  value: unknown,
): Promise<void> {
  assertSlug(slug)
  const res = await fetch(
    `${backendBase()}/api/portal-state/${encodeURIComponent(slug)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, value }),
      keepalive: true,
    },
  )
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(
      (body as { error?: string }).error ||
        `Backend rejected upsert (HTTP ${res.status})`,
    )
  }
}

// Atomic multi-key upsert. Use this when a single business event
// mutates several keys and partial writes would corrupt invariants
// (e.g. order row + entitlement row must land together). The backend
// wraps the whole patch in a single transaction — any failure rolls
// the whole thing back.
//
// For single-key autosave, `upsertPortalKey` is cheaper (no txn
// overhead, no row lock on unrelated keys).
export async function upsertPortalKeys(
  slug: string,
  patch: Record<string, unknown>,
): Promise<void> {
  assertSlug(slug)
  const entries = Object.entries(patch).map(([key, value]) => ({ key, value }))
  if (entries.length === 0) return
  const res = await fetch(
    `${backendBase()}/api/portal-state/${encodeURIComponent(slug)}/bulk`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entries }),
      keepalive: true,
    },
  )
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(
      (body as { error?: string }).error ||
        `Backend rejected bulk upsert (HTTP ${res.status})`,
    )
  }
}

// Enumerate every tenant slug that has at least one stored key.
// Used by routes that need to scan across tenants (certificate
// public lookup, razorpay webhook tenant resolution by email).
// Calls a dedicated backend endpoint — see backend/src/routes/
// portalState.ts.
export async function listSlugs(): Promise<string[]> {
  try {
    const res = await fetch(`${backendBase()}/api/portal-state`, {
      cache: "no-store",
    })
    if (!res.ok) return []
    const body = (await res.json()) as { ok?: boolean; slugs?: string[] }
    return Array.isArray(body.slugs) ? body.slugs : []
  } catch {
    return []
  }
}
