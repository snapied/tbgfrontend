"use client"

// Compact "View public site" affordance — opens the tenant's
// branded portal in a new tab. Surfaced next to the bell on every
// dashboard surface so a teacher can switch to the visitor view
// from anywhere, not just /dashboard/portal.

import Link from "next/link"
import { ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTenant } from "@/lib/tenant-store"
import { tenantPublicUrl } from "@/lib/tenant-resolver"

interface Props {
  /** Use `compact` on tight chrome (mobile header) — icon only. */
  variant?: "default" | "compact"
}

export function ViewPublicSiteButton({ variant = "default" }: Props) {
  const { currentTenant } = useTenant()
  if (!currentTenant) return null
  const href = tenantPublicUrl(
    currentTenant.slug,
    currentTenant.customDomain,
    currentTenant.customDomainStatus,
  )
  const label = "Open your public site in a new tab"
  if (variant === "compact") {
    return (
      <Button
        variant="ghost"
        size="icon"
        asChild
        title={label}
        aria-label={label}
        className="h-9 w-9"
      >
        <Link href={href} target="_blank" rel="noopener noreferrer">
          <ExternalLink className="h-4 w-4" />
        </Link>
      </Button>
    )
  }
  return (
    <Button
      variant="outline"
      size="sm"
      asChild
      title={label}
      className="gap-1.5"
    >
      <Link href={href} target="_blank" rel="noopener noreferrer">
        <ExternalLink className="h-3.5 w-3.5" />
        View site
      </Link>
    </Button>
  )
}
