// Server-backed portal state for a single tenant.
//
// GET  /api/portal-state/<slug>           → returns the full key→value
//                                           blob (brand/pages/etc.) so
//                                           a fresh browser can paint
//                                           the right portal without
//                                           waiting on a teacher to
//                                           re-publish.
// POST /api/portal-state/<slug>           → body { key, value } upserts
//                                           one key into the blob.
//                                           Called by lib/portal-store
//                                           from the dashboard whenever
//                                           the teacher edits something.
//
// No auth gate yet — same trust model as the rest of the POC's API
// surface. The slug acts as the isolation boundary; lib/portal-state-
// server enforces a strict [a-z0-9-_] slug regex to prevent path
// traversal.

import { NextResponse, type NextRequest } from "next/server"
import {
  loadPortalState,
  upsertPortalKey,
} from "@/lib/portal-state-server"

export const runtime = "nodejs"

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ slug: string }> },
) {
  const { slug } = await ctx.params
  try {
    const blob = await loadPortalState(slug)
    return NextResponse.json({ ok: true, state: blob })
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: (err as Error).message },
      { status: 400 },
    )
  }
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ slug: string }> },
) {
  const { slug } = await ctx.params
  let body: { key?: string; value?: unknown }
  try {
    body = (await req.json()) as { key?: string; value?: unknown }
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }
  if (!body.key || typeof body.key !== "string") {
    return NextResponse.json({ error: "Missing `key`" }, { status: 400 })
  }
  try {
    await upsertPortalKey(slug, body.key, body.value)
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: (err as Error).message },
      { status: 400 },
    )
  }
}
