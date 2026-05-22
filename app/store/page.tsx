"use client"

// Legacy /store route — kept as a redirect stub.
//
// The store now lives exclusively inside each tenant's portal at
// /p/<tenant>/store. We don't delete this file outright because
// older links (emails, bookmarks, indexed search results) may
// still point here; instead we silently route the visitor to the
// right tenant's storefront when we know one, otherwise to home.
//
// To bring back a platform-level store, build a per-tenant index
// listing every workspace's public storefront and mount it here —
// the current redirect is intentionally trivial so any future
// replacement is one file away.

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useTenant } from "@/lib/tenant-store"

export default function LegacyStoreRedirect() {
  const router = useRouter()
  const { currentTenant } = useTenant()
  useEffect(() => {
    const target = currentTenant?.slug ? `/p/${currentTenant.slug}/store` : "/"
    router.replace(target)
  }, [router, currentTenant?.slug])
  return null
}
