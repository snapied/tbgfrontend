// Thin client for the backend's tenant-user-index. The index maps a
// lowercase email to one or more (slug, userId) pairs so cross-tenant
// resolvers (Razorpay webhook, certificate public lookup) can skip
// the O(N) tenant-blob walk.
//
// Frontend writes to the index whenever a user is added / their email
// changes / the user is removed from a tenant. Reads are exactly two
// shapes: "give me all matches for this email" and "drop everything
// for this slug" (used when a tenant is deleted).

const SLUG_RE = /^[a-z0-9_-]+$/i

function backendBase(): string {
  return (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000").replace(/\/$/, "")
}

export interface TenantUserMatch {
  slug: string
  userId: string | null
}

/**
 * Look up every (slug, userId) pairing for a given email. Returns
 * an empty array when nobody matches — a missing match is a legit
 * state (e.g. webhook for a one-off public purchase where the buyer
 * was never registered in any workspace).
 */
export async function lookupTenantsByEmail(email: string): Promise<TenantUserMatch[]> {
  const e = email.trim().toLowerCase()
  if (!e) return []
  try {
    const res = await fetch(
      `${backendBase()}/api/tenant-user-index/by-email/${encodeURIComponent(e)}`,
      { cache: "no-store" },
    )
    if (!res.ok) return []
    const body = (await res.json().catch(() => null)) as
      | { ok: true; matches: TenantUserMatch[] }
      | null
    return body?.ok ? body.matches : []
  } catch {
    return []
  }
}

/**
 * Idempotent upsert of an (email, slug) pair plus the user's local
 * id inside that tenant. Safe to call repeatedly — the backend
 * dedupes on (email_lower, slug). Fire-and-forget; failures here
 * shouldn't block user creation, just degrade future webhook
 * resolution back to the email-walk fallback.
 */
export async function upsertTenantUserIndex(
  email: string,
  slug: string,
  userId?: string,
): Promise<void> {
  const e = email.trim().toLowerCase()
  const s = slug.trim().toLowerCase()
  if (!e || !s || !SLUG_RE.test(s)) return
  try {
    await fetch(`${backendBase()}/api/tenant-user-index/upsert`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: e, slug: s, userId: userId ?? null }),
      keepalive: true,
    })
  } catch {
    // Silent — the email-walk fallback still works.
  }
}

/**
 * Remove one (email, slug) mapping, all rows for an email, or all
 * rows for a slug. Pass at least one of the two.
 */
export async function deleteTenantUserIndex(opts: {
  email?: string
  slug?: string
}): Promise<void> {
  const email = opts.email?.trim().toLowerCase() || undefined
  const slug = opts.slug?.trim().toLowerCase() || undefined
  if (!email && !slug) return
  try {
    await fetch(`${backendBase()}/api/tenant-user-index`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, slug }),
      keepalive: true,
    })
  } catch {
    // Stale index entries are harmless — the webhook resolver
    // double-checks the tenant blob for the email before trusting
    // a match. Best-effort cleanup is enough.
  }
}
