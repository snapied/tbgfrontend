// Thin proxy to the backend's portal-state rename endpoint. The
// frontend's renameTenantSlug action calls this immediately after
// the localStorage migration so Postgres ends up matching what
// the editing browser already sees.
//
// Body: { from: string, to: string } — both required, both
// validated server-side. Returns { ok, moved, overwritten } on
// success or { ok:false, error } when the backend rejects.

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

function safeSlug(raw: unknown): string | null {
  const v = String(raw ?? "").trim()
  if (!v || !SLUG_RE.test(v)) return null
  return v.toLowerCase()
}

export async function POST(req: NextRequest) {
  let body: { from?: string; to?: string }
  try {
    body = (await req.json()) as { from?: string; to?: string }
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 })
  }
  const from = safeSlug(body.from)
  const to = safeSlug(body.to)
  if (!from || !to) {
    return NextResponse.json(
      { ok: false, error: "Both `from` and `to` slugs required" },
      { status: 400 },
    )
  }
  try {
    const res = await fetch(`${backendBase()}/api/portal-state/rename`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ from, to }),
      keepalive: true,
    })
    const out = await res.json().catch(() => ({}))
    return NextResponse.json(out, { status: res.status })
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: (err as Error).message || "Backend unreachable" },
      { status: 502 },
    )
  }
}
