"use client"

// Resolve the tenant's brand identity (name, tagline, logo, favicon)
// using the same fallback chain as the portal layout: PortalConfig →
// OrgSettings → Tenant.branding. Pages call this so SEO / share
// previews always reflect what the tenant has actually configured,
// not the platform's default copy. Returns null fields when nothing
// is set rather than throwing — callers decide whether to fall back
// to the platform brand or omit the field entirely.

import { usePortal } from "./portal-store"
import { useTenant } from "./tenant-store"
import { resolveLiveBrand } from "./portal-templates"

export interface TenantBrand {
  name: string
  tagline?: string
  logoUrl?: string
  faviconUrl?: string
}

export function useTenantBrand(): TenantBrand {
  const { config } = usePortal()
  const { currentTenant } = useTenant()
  const activeTemplateId = (config as { activeTemplateId?: string }).activeTemplateId
  const liveBrand = resolveLiveBrand(config.brand, activeTemplateId)
  const tenantBranding = currentTenant?.branding ?? {}
  const firstNonEmpty = (...xs: (string | undefined)[]) =>
    xs.find((x) => x && x.trim())
  // OrgSettings is intentionally NOT in this chain. That store is used
  // by the certificate issuer (org name + signing block) and tends to
  // carry stale "first workspace" values from a legacy localStorage
  // migration — pulling it into the portal/student brand made every
  // new tenant look like the previous one. The portal/student chrome
  // sticks to: portal config (what the teacher typed in the brand
  // editor) → tenant.branding (set at signup) → tenant.name.
  const name =
    firstNonEmpty(liveBrand.siteName, currentTenant?.name) || "Customer portal"
  return {
    name,
    tagline: firstNonEmpty(liveBrand.tagline, tenantBranding.tagline),
    logoUrl: firstNonEmpty(liveBrand.logoUrl, tenantBranding.logoUrl),
    faviconUrl: firstNonEmpty(liveBrand.faviconUrl, liveBrand.logoUrl, tenantBranding.logoUrl),
  }
}
