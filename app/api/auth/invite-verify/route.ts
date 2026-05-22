// Verify an invitation token — POST { token, newPassword? }.
//
// Mirrors /api/auth/reset-verify but for kind="invite". The accept
// page calls this:
//   1. On mount — `{ token }` — to confirm the link is still valid
//      (and return the recipient's email so the page can address
//      them by it).
//   2. On submit — `{ token, newPassword }` — to commit. With no
//      real password store yet, "commit" is a no-op signal; the
//      client persists the new User row in its tenant-scoped store
//      and treats this 200 as authoritative success.
//
// We deliberately accept the same minimum length as reset-verify
// (8 chars) — the *real* strength check lives client-side via
// zxcvbn before the request is even sent. The server check is the
// last line of defence against a bot bypassing the UI; it doesn't
// need to duplicate the zxcvbn scoring there.

import { NextResponse, type NextRequest } from "next/server"
import { verifyToken } from "@/lib/auth-tokens"

export const runtime = "nodejs"

export async function POST(req: NextRequest) {
  let body: { token?: string; newPassword?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 })
  }

  const v = verifyToken(body.token ?? "", "invite")
  if (!v.ok) {
    const message =
      v.reason === "expired"        ? "This invite has expired. Ask the admin to send a new one."
    : v.reason === "bad-signature"  ? "This invite link is invalid or has been tampered with."
    : v.reason === "wrong-kind"     ? "This link isn't an invitation."
    : "This invite link is malformed."
    return NextResponse.json({ ok: false, error: message }, { status: 400 })
  }

  // `tenant` is the workspace slug bound to the invite when one
  // was passed at issue time. The accept page reads it to land the
  // new user inside /p/<tenant>/ after sign-in instead of the
  // platform dashboard.
  if (!body.newPassword) {
    return NextResponse.json({ ok: true, email: v.payload.sub, tenant: v.payload.tnt })
  }
  if (body.newPassword.length < 8) {
    return NextResponse.json(
      { ok: false, error: "Password must be at least 8 characters." },
      { status: 400 },
    )
  }
  return NextResponse.json({ ok: true, email: v.payload.sub, tenant: v.payload.tnt })
}
