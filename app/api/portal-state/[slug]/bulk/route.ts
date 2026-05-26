// Bulk upsert proxy — forwards POST /api/portal-state/:slug/bulk to the
// Express backend. The Next.js [slug]/route.ts only handles the single-key
// GET and POST paths; this file handles the /bulk sub-path that
// flushTenantStateSync and mirrorSliceToServer call for every autosave and
// publish flush.
//
// Without this route every bulk write silently received a 404 (Next.js App
// Router [slug] only matches one segment) and the portal_state table in
// Postgres was never updated during normal editing — causing the "value
// reverts after publish" bug.

import { NextResponse, type NextRequest } from "next/server"

export const runtime = "nodejs"

const SLUG_RE = /^[a-z0-9_-]+$/i

function backendBase(): string {
  return (
    process.env.BACKEND_API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:4000"
  ).replace(/\/$/, "")
}

function safeSlug(raw: string): string | null {
  const v = (raw ?? "").trim()
  if (!v || !SLUG_RE.test(v)) return null
  return v.toLowerCase()
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ slug: string }> },
) {
  const { slug: rawSlug } = await ctx.params
  const slug = safeSlug(rawSlug)
  if (!slug) {
    return NextResponse.json(
      { ok: false, error: "Invalid tenant slug" },
      { status: 400 },
    )
  }
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 })
  }
  try {
    const res = await fetch(
      `${backendBase()}/api/portal-state/${encodeURIComponent(slug)}/bulk`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        keepalive: true,
      },
    )
    const out = await res.json().catch(() => ({}))
    return NextResponse.json(out, { status: res.status })
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: (err as Error).message || "Backend unreachable" },
      { status: 502 },
    )
  }
}
