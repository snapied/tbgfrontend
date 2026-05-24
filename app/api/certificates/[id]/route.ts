// Public certificate lookup. No auth — anyone with a cert id (or a
// LinkedIn scraping the page) can verify it.
//
// We scan every tenant's portal-state in Postgres for a matching
// certificate id. The blob layout is `{ [keySuffix]: value }` per
// tenant — see /api/portal-state/[slug] — so we look for
// `certificates.v1` inside each tenant's blob and walk its batches.
//
// Returns:
//   { ok: true, certificate, tenantSlug, tenantName, brand }
//   { ok: false, error: "not-found" | "revoked" }

import { NextResponse, type NextRequest } from "next/server"
import {
  SYSTEM_SLUG,
  listSlugs,
  loadPortalState,
} from "@/lib/portal-state-client"

export const runtime = "nodejs"

interface CertificateRow {
  id: string
  studentName: string
  email: string
  courseName: string
  completionDate: string
  grade?: string
  instructorName: string
  template: string
  customTemplateId?: string
  status: "active" | "revoked"
  batchId: string
  createdAt: string
}

interface BatchRow {
  id: string
  certificates: CertificateRow[]
}

interface PortalBrandRow {
  siteName?: string
  logoUrl?: string
  primaryColor?: string
  accentColor?: string
}

interface PortalConfigRow {
  brand?: PortalBrandRow
}

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params
  const needle = id.trim()
  if (!needle) {
    return NextResponse.json({ ok: false, error: "missing-id" }, { status: 400 })
  }

  // Enumerate tenants from the DB instead of a filesystem dir. Skip
  // the reserved system slug — it holds caches (razorpay events,
  // plan IDs), never certificate data.
  const slugs = (await listSlugs()).filter((s) => s !== SYSTEM_SLUG)

  for (const slug of slugs) {
    const blob = await loadPortalState(slug)
    const batches = blob["certificates.v1"] as BatchRow[] | undefined
    if (!Array.isArray(batches)) continue
    for (const batch of batches) {
      const cert = batch.certificates?.find(
        (c) => c.id === needle || c.id.toUpperCase() === needle.toUpperCase(),
      )
      if (!cert) continue
      const portalConfig = blob["portal.config.v1"] as PortalConfigRow | undefined
      const brand = portalConfig?.brand ?? {}
      return NextResponse.json({
        ok: true,
        certificate: cert,
        tenantSlug: slug,
        tenantName: brand.siteName ?? slug,
        brand: {
          siteName: brand.siteName,
          logoUrl: brand.logoUrl,
          primaryColor: brand.primaryColor,
          accentColor: brand.accentColor,
        },
      })
    }
  }

  return NextResponse.json({ ok: false, error: "not-found" }, { status: 404 })
}
