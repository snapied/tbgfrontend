"use client"

// Tenant-scoped assignment view. Same pattern as the other portal
// wrappers — the actual page logic lives at
// /app/assignment/[token]/page.tsx and detects tenant context via
// useTenantBasePath so it suppresses its own chrome and uses
// tenant-aware back links. Wrapping it here keeps the canonical URL
// inside the tenant namespace (/p/<tenant>/assignment/<token>).

import { use } from "react"
import PublicAssignmentPage from "@/app/assignment/[token]/page"

export default function PortalAssignmentPage({
  params,
}: {
  params: Promise<{ tenant: string; token: string }>
}) {
  const { token } = use(params)
  return <PublicAssignmentPage params={Promise.resolve({ token })} />
}
