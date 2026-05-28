"use client"

// Helper for tenant portal links. Returns the correct base path
// depending on whether the user is on a subdomain or the /p/ path.
//
// On subdomain (kishorchem.thebigclass.com):
//   basePath = "" → links become /courses, /about, /my
//
// On path-based (/p/kishorchem/...):
//   basePath = "/p/kishorchem" → links become /p/kishorchem/courses, etc.

import { usePathname } from "next/navigation"
import { PLATFORM_HOST } from "./tenant-resolver"

/**
 * Detect if we're on a tenant subdomain (e.g. kishorchem.thebigclass.com).
 * Returns true if the hostname is a single-segment subdomain of PLATFORM_HOST.
 */
function isOnSubdomain(): boolean {
  if (typeof window === "undefined") return false
  const host = window.location.hostname.toLowerCase()
  const suffix = `.${PLATFORM_HOST}`
  if (!host.endsWith(suffix)) return false
  const sub = host.slice(0, -suffix.length)
  return !!sub && !sub.includes(".") && sub !== "www"
}

/**
 * Returns tenant context for building links:
 *
 * On subdomain kishorchem.thebigclass.com:
 *   { tenant: "kishorchem", basePath: "", inTenant: true, isSubdomain: true }
 *   → Link: basePath + "/courses" = "/courses"
 *
 * On path /p/kishorchem/...:
 *   { tenant: "kishorchem", basePath: "/p/kishorchem", inTenant: true, isSubdomain: false }
 *   → Link: basePath + "/courses" = "/p/kishorchem/courses"
 *
 * On bare thebigclass.com:
 *   { tenant: null, basePath: "", inTenant: false, isSubdomain: false }
 */
export function useTenantBasePath(): {
  tenant: string | null
  basePath: string
  inTenant: boolean
  isSubdomain: boolean
} {
  const pathname = usePathname() ?? ""

  // Subdomain takes priority — the middleware rewrites to /p/{slug}/...
  // internally but the browser URL has no /p/ prefix, so links must
  // also omit it.
  if (isOnSubdomain()) {
    const host = typeof window !== "undefined" ? window.location.hostname.toLowerCase() : ""
    const sub = host.slice(0, -(`.${PLATFORM_HOST}`.length))
    return { tenant: sub, basePath: "", inTenant: true, isSubdomain: true }
  }

  // Path-based tenant: /p/<tenant>/...
  if (pathname.startsWith("/p/")) {
    const segment = pathname.split("/")[2]
    if (segment) {
      return { tenant: segment, basePath: `/p/${segment}`, inTenant: true, isSubdomain: false }
    }
  }

  return { tenant: null, basePath: "", inTenant: false, isSubdomain: false }
}
