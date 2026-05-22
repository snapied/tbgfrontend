// Public certificate lookup. No auth — anyone with a cert id (or a
// LinkedIn scraping the page) can verify it.
//
// We scan every tenant's server-side blob for a matching certificate
// id. The blob layout is `{ [keySuffix]: value }` per tenant — see
// /api/portal-state/[slug] — so we look for `certificates.v1` inside
// each file and walk its batches.
//
// Returns:
//   { ok: true, certificate, tenantSlug, tenantName, brand }
//   { ok: false, error: "not-found" | "revoked" }

import { NextResponse, type NextRequest } from "next/server"
import { promises as fs } from "fs"
import path from "path"

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

function dataDir(): string {
  return path.join(process.cwd(), ".portal-state")
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

  let entries: string[] = []
  try {
    entries = await fs.readdir(dataDir())
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return NextResponse.json({ ok: false, error: "not-found" }, { status: 404 })
    }
    throw err
  }

  for (const file of entries) {
    if (!file.endsWith(".json")) continue
    const slug = file.slice(0, -".json".length)
    let blob: Record<string, unknown>
    try {
      const raw = await fs.readFile(path.join(dataDir(), file), "utf8")
      blob = JSON.parse(raw) as Record<string, unknown>
    } catch {
      continue
    }
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
