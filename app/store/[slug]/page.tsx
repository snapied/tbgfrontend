"use client"

// Legacy /store/[slug] route — redirect stub. The product detail
// surface now lives inside the tenant portal at
// /p/<tenant>/store/<slug>. We preserve the URL pattern so older
// shared links keep working: when a current tenant is known, we
// route the visitor into that tenant's product page; otherwise
// fall back to home.

import { use, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useTenant } from "@/lib/tenant-store"

export default function LegacyProductRedirect({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = use(params)
  const router = useRouter()
  const { currentTenant } = useTenant()
  useEffect(() => {
    const target = currentTenant?.slug
      ? `/p/${currentTenant.slug}/store/${slug}`
      : "/"
    router.replace(target)
  }, [router, currentTenant?.slug, slug])
  return null
}
