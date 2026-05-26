// Public org lookup. Used by the public portal layout when the
// visitor's browser has no tenant data in localStorage (incognito,
// share link opened on a fresh device, etc.) so the page can render
// the real workspace name + logo instead of the platform default
// "Customer portal" string.

function backendBase(): string {
  return (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000").replace(/\/$/, "")
}

export interface PublicOrgBrand {
  primaryColor?: string
  accentColor?: string
  tagline?: string
  faviconUrl?: string
}

export interface PublicOrg {
  id: number
  name: string
  slug: string
  logoUrl: string | null
  brand: PublicOrgBrand | null
}

const SLUG_RE = /^[a-z0-9_-]+$/i

/**
 * GET /api/orgs/by-slug/:slug — returns null when the slug doesn't
 * exist, the slug is malformed, or the backend is unreachable.
 * Callers should already have a slug-derived fallback so a null
 * return doesn't blank the UI.
 */
export async function fetchOrgBySlug(slug: string): Promise<PublicOrg | null> {
  const s = slug.trim().toLowerCase()
  if (!s || !SLUG_RE.test(s)) return null
  try {
    const res = await fetch(
      `${backendBase()}/api/orgs/by-slug/${encodeURIComponent(s)}`,
      { cache: "no-store" },
    )
    if (!res.ok) return null
    const body = (await res.json().catch(() => null)) as
      | { ok: true; org: { id: number; name: string; slug: string; logo_url: string | null; brand: PublicOrgBrand | null } }
      | { ok: false; error: string }
      | null
    if (!body || !body.ok) return null
    return {
      id: body.org.id,
      name: body.org.name,
      slug: body.org.slug,
      logoUrl: body.org.logo_url,
      brand: body.org.brand ?? null,
    }
  } catch {
    return null
  }
}

/**
 * Owner-only — patches the workspace's name, logo, or brand colours
 * server-side so incognito visitors and link recipients see the same
 * identity as the logged-in teacher. The dashboard's tenant-store
 * fires this whenever local tenant.branding mutates. Fire-and-forget;
 * failures degrade to the localStorage-only behaviour (logged-in
 * teacher still works, public portal stays on the previous server
 * snapshot).
 */
export async function syncOrgBrand(
  slug: string,
  patch: {
    name?: string
    logoUrl?: string | null
    brand?: PublicOrgBrand | null
  },
  accessToken: string,
): Promise<PublicOrg | null> {
  const s = slug.trim().toLowerCase()
  if (!s || !SLUG_RE.test(s) || !accessToken) return null
  try {
    const res = await fetch(
      `${backendBase()}/api/orgs/by-slug/${encodeURIComponent(s)}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(patch),
        keepalive: true,
      },
    )
    if (!res.ok) return null
    const body = (await res.json().catch(() => null)) as
      | { ok: true; org: { id: number; name: string; slug: string; logo_url: string | null; brand: PublicOrgBrand | null } }
      | { ok: false; error: string }
      | null
    if (!body || !body.ok) return null
    return {
      id: body.org.id,
      name: body.org.name,
      slug: body.org.slug,
      logoUrl: body.org.logo_url,
      brand: body.org.brand ?? null,
    }
  } catch {
    return null
  }
}
