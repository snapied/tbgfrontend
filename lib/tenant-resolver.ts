// Tenant resolution: figure out which workspace this browser is viewing.
//
// Resolution order (first hit wins):
//   1. ?tenant=<slug> query param (one-shot override, persisted to localStorage)
//   2. URL path /p/<slug>/... — the public portal lives there, and a
//      fresh / incognito visitor has nothing in localStorage, so the
//      path must take precedence over the persisted override so they
//      see THIS tenant (not whichever one this browser last switched to).
//   3. localStorage override (set by tenant switcher / dev tools)
//   4. customDomain match — handled by the caller using the tenant list
//   5. subdomain of PLATFORM_HOST: <slug>.thebigclass.com → "<slug>"
//   6. bare PLATFORM_HOST or localhost → null (caller picks a default)
//
// In production this same logic should ALSO run on the server (Next.js
// middleware) so cookies + auth are scoped before render. For now the
// frontend stub is enough to demo end-to-end.

const OVERRIDE_KEY = "thebigclass.platform.tenantOverride.v1"

// The host the platform runs on. Anything that's a subdomain of this is
// treated as a tenant. Set NEXT_PUBLIC_PLATFORM_HOST in production.
export const PLATFORM_HOST: string =
  (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_PLATFORM_HOST) ||
  "thebigclass.com"

// Hosts where we never try to extract a tenant from the subdomain.
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0"])

/**
 * Returns the slug of the tenant the current browser is viewing, or null
 * when the host is the platform root / a local dev host with no override.
 * Safe to call during SSR — returns null when window is undefined.
 */
export function resolveTenantSlug(): string | null {
  if (typeof window === "undefined") return null

  // 1. ?tenant=<slug> wins — persist it so refresh keeps the override.
  try {
    const params = new URLSearchParams(window.location.search)
    const fromQuery = params.get("tenant")
    if (fromQuery !== null) {
      const clean = fromQuery.trim().toLowerCase()
      if (clean) {
        window.localStorage.setItem(OVERRIDE_KEY, clean)
        return clean
      } else {
        // ?tenant= (empty) clears the override.
        window.localStorage.removeItem(OVERRIDE_KEY)
      }
    }
  } catch { /* ignore */ }

  // 2. URL path — /p/<slug>/...  The portal lives at this prefix and an
  // incognito visitor has nothing in localStorage, so the path is the
  // only reliable signal that they're viewing tenant <slug>. Pulling it
  // here (before the persisted override) also stops the teacher's last-
  // switched tenant from bleeding into a different /p/<other>/ tab.
  try {
    const m = window.location.pathname.match(/^\/p\/([^/]+)(?:\/|$)/)
    if (m && m[1]) {
      const clean = decodeURIComponent(m[1]).trim().toLowerCase()
      if (clean) return clean
    }
  } catch { /* ignore */ }

  // 3. Persisted override.
  try {
    const stored = window.localStorage.getItem(OVERRIDE_KEY)
    if (stored) return stored
  } catch { /* ignore */ }

  // 3-5. Hostname-based resolution.
  const host = window.location.hostname.toLowerCase()
  if (LOCAL_HOSTS.has(host)) return null
  if (host === PLATFORM_HOST || host === `www.${PLATFORM_HOST}`) return null

  // Subdomain extraction: anything ending with .<PLATFORM_HOST>.
  const suffix = `.${PLATFORM_HOST}`
  if (host.endsWith(suffix)) {
    const sub = host.slice(0, -suffix.length)
    // Multi-level subdomains (e.g. "uk.acme.thebigclass.com") are unsupported;
    // only single-segment workspace subdomains map to a tenant.
    if (sub && !sub.includes(".")) return sub
  }
  return null
}

export function setDevTenantOverride(slug: string | null): void {
  if (typeof window === "undefined") return
  try {
    if (slug) window.localStorage.setItem(OVERRIDE_KEY, slug)
    else window.localStorage.removeItem(OVERRIDE_KEY)
  } catch { /* ignore */ }
}

/**
 * Builds the public URL a tenant's students/instructors should use.
 * Prefers a verified custom domain, falls back to the platform subdomain.
 */
export function tenantPublicUrl(
  slug: string,
  customDomain?: string,
  customDomainStatus?: string,
): string {
  if (customDomain && customDomainStatus === "verified") {
    return `https://${customDomain}`
  }
  return `https://${slug}.${PLATFORM_HOST}`
}
