"use client"

// Tiny mount-point for useTenantBrandSync. Renders nothing — just
// runs the effect that pushes the local workspace brand to the
// backend so incognito visitors and link recipients see the same
// theme as the logged-in teacher. Mounted in the dashboard layout
// once per session.

import { useTenantBrandSync } from "@/lib/tenant-brand-sync"

export function TenantBrandSyncer(): null {
  useTenantBrandSync()
  return null
}
