"use client"

// Helper for shared pages (e.g. /learn/[slug], /assignment/[token]) that
// can be rendered either at the global URL or under a tenant portal at
// /p/[tenant]/.... When the page sits under a tenant we want internal
// links (back-buttons, follow-ups) to stay inside the tenant namespace,
// and we want to suppress chrome (logo headers) that the tenant layout
// already provides.

import { usePathname } from "next/navigation"

/**
 * If the current URL is `/p/<tenant>/...`, returns:
 *   { tenant: "<tenant>", basePath: "/p/<tenant>", inTenant: true }
 * Otherwise returns:
 *   { tenant: null, basePath: "", inTenant: false }
 */
export function useTenantBasePath(): {
  tenant: string | null
  basePath: string
  inTenant: boolean
} {
  const pathname = usePathname() ?? ""
  if (pathname.startsWith("/p/")) {
    const segment = pathname.split("/")[2]
    if (segment) {
      return { tenant: segment, basePath: `/p/${segment}`, inTenant: true }
    }
  }
  return { tenant: null, basePath: "", inTenant: false }
}
