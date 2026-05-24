// Per-tenant portal state API — thin proxy to the Express backend.
//
// The Next.js layer used to own the storage itself (one JSON file
// per tenant under web/.portal-state/). That created a second
// persistence layer running alongside Postgres, surprised every
// migration, and had no operational visibility. Now the canonical
// store lives in Postgres (table `portal_state`, served by the
// backend's /api/portal-state/<slug>). This route forwards GET/POST
// to that backend so the frontend keeps the same client URL it
// always used.
//
// We accept the same shape on both ends — { ok, state } on GET,
// { key, value } on POST — so no caller-side changes are needed.

import { NextResponse, type NextRequest } from "next/server"

export const runtime = "nodejs"

const SLUG_RE = /^[a-z0-9_-]+$/i

function backendBase(): string {
  // Server-side env first (set in web/.env.local or the Next runtime);
  // fall back to the public var so a single-config setup also works;
  // last-resort default mirrors the Express dev port.
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

export async function GET(
  _req: NextRequest,
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
  try {
    const res = await fetch(
      `${backendBase()}/api/portal-state/${encodeURIComponent(slug)}`,
      { cache: "no-store" },
    )
    const body = await res.json().catch(() => ({}))
    return NextResponse.json(body, { status: res.status })
  } catch (err) {
    // Backend unreachable — return empty state so the frontend can
    // still hydrate from localStorage and the editor stays usable.
    // The next POST attempt will retry and report a real error.
    return NextResponse.json(
      {
        ok: false,
        state: {},
        error: (err as Error).message || "Backend unreachable",
      },
      { status: 200 },
    )
  }
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
  let body: { key?: string; value?: unknown }
  try {
    body = (await req.json()) as { key?: string; value?: unknown }
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 })
  }
  if (!body.key) {
    return NextResponse.json({ ok: false, error: "Missing `key`" }, { status: 400 })
  }
  try {
    const res = await fetch(
      `${backendBase()}/api/portal-state/${encodeURIComponent(slug)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: body.key, value: body.value }),
        // keepalive so an in-flight write survives a tab-close during
        // the 600ms debounce window on the frontend.
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
