"use client"

import Link from "next/link"
import { GraduationCap, LibraryBig } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTenant } from "@/lib/tenant-store"
import { useOrgSettings } from "@/lib/org-settings"

/**
 * Shared brand header for the public storefront, product detail, checkout,
 * receipt, and library pages. Renders the tenant's name + logo so a buyer
 * lands on something that looks like the academy's own site, not ours.
 */
export function StorefrontHeader({ rightSlot }: { rightSlot?: React.ReactNode }) {
  const { currentTenant } = useTenant()
  const { settings } = useOrgSettings()
  const brandName = currentTenant?.name ?? settings.organisationName ?? "The Big Class"
  const logoUrl = settings.logoUrl ?? currentTenant?.branding.logoUrl

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-card/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link href="/store" className="flex items-center gap-2">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt={brandName} className="h-7 w-7 rounded object-cover" />
          ) : (
            <span className="flex h-7 w-7 items-center justify-center rounded bg-primary text-primary-foreground">
              <GraduationCap className="h-4 w-4" />
            </span>
          )}
          <span className="font-semibold">{brandName}</span>
        </Link>
        <div className="flex items-center gap-2">
          {rightSlot}
          <Button variant="ghost" size="sm" asChild>
            <Link href="/library">
              <LibraryBig className="mr-2 h-4 w-4" />
              My library
            </Link>
          </Button>
        </div>
      </div>
    </header>
  )
}
