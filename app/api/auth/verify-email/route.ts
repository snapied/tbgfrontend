// Confirm an email-verification token — POST { token }.
//
// Returns { ok, email } when the HMAC validates and isn't expired. The
// client-side /verify-email page then marks the local tenant record as
// verified (since this POC doesn't have a server-side user DB yet).

import { NextResponse, type NextRequest } from "next/server"
import { verifyToken } from "@/lib/auth-tokens"

export const runtime = "nodejs"

export async function POST(req: NextRequest) {
  let body: { token?: string }
  try { body = await req.json() }
  catch { return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 }) }

  const v = verifyToken(body.token ?? "", "email-verify")
  if (!v.ok) {
    const message =
      v.reason === "expired"      ? "This verification link has expired. Request a new one."
    : v.reason === "bad-signature"? "This link is invalid or has been tampered with."
    : v.reason === "wrong-kind"   ? "This link isn't an email verification."
    : "This link is malformed."
    return NextResponse.json({ ok: false, error: message }, { status: 400 })
  }
  return NextResponse.json({ ok: true, email: v.payload.sub })
}
