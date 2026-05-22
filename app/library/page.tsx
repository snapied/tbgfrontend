"use client"

// Legacy /library route — redirect stub. "My library" is now a
// tenant-scoped surface at /p/<tenant>/library, mounted inside
// the workspace's branded chrome. Older receipt links continue
// to land somewhere useful: routed into the right tenant when a
// current one is known, fall back to home otherwise.

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useTenant } from "@/lib/tenant-store"

export default function LegacyLibraryRedirect() {
  const router = useRouter()
  const { currentTenant } = useTenant()
  useEffect(() => {
    const target = currentTenant?.slug ? `/p/${currentTenant.slug}/library` : "/"
    router.replace(target)
  }, [router, currentTenant?.slug])
  return null
}
