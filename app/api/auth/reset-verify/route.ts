// Verify a reset token — POST { token }.
//
// Used by the /reset-password page to:
//   1. On mount, check the link is still valid (avoid letting the user fill
//      out a form just to get a 400 on submit).
//   2. On submit (with `newPassword`), confirm + (in production) persist.
//
// Right now this is a POC without a real password store, so a successful
// submit just signals success — the seam to flip is "store the hashed
// password" once a backing user table lands.

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

  const v = verifyToken(body.token ?? "", "password-reset")
  if (!v.ok) {
    const message =
      v.reason === "expired"      ? "This link has expired. Request a new one."
    : v.reason === "bad-signature"? "This link is invalid or has been tampered with."
    : v.reason === "wrong-kind"   ? "This link isn't a password reset."
    : "This link is malformed."
    return NextResponse.json({ ok: false, error: message }, { status: 400 })
  }

  // If only checking validity (no newPassword), say "valid".
  // `tenant` echoes back the workspace slug when the token was
  // tenant-scoped so the client can land the user inside the right
  // portal after a successful reset.
  if (!body.newPassword) {
    return NextResponse.json({ ok: true, email: v.payload.sub, tenant: v.payload.tnt })
  }
  if (body.newPassword.length < 8) {
    return NextResponse.json({ ok: false, error: "Password must be at least 8 characters." }, { status: 400 })
  }

  // TODO(real-auth): hash + persist the password against the user row keyed
  //   by v.payload.sub. For the POC, we accept-and-acknowledge so the demo
  //   flow is end-to-end testable.
  return NextResponse.json({ ok: true, email: v.payload.sub, tenant: v.payload.tnt })
}
