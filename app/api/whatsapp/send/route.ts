// Generic WhatsApp send — POST { to, text, kind? }.
//
// Mirrors /api/email/send. Delegates to lib/whatsapp which picks a
// provider from env (Meta cloud API or Twilio) or falls back to a
// server-side stub log when neither is configured. This route is the
// public seam; server-internal callers (e.g. /api/auth/invite-request)
// should import sendWhatsApp from "@/lib/whatsapp" directly to avoid
// the extra HTTP hop.

import { NextResponse, type NextRequest } from "next/server"
import { sendWhatsApp } from "@/lib/whatsapp"

export const runtime = "nodejs"

interface SendPayload {
  to: string
  text?: string
  kind?: string
}

export async function POST(req: NextRequest) {
  let payload: SendPayload
  try {
    payload = (await req.json()) as SendPayload
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }
  if (!payload.to) return NextResponse.json({ error: "Missing `to`" }, { status: 400 })
  if (!payload.text) return NextResponse.json({ error: "Missing `text`" }, { status: 400 })

  const result = await sendWhatsApp({
    to: payload.to,
    text: payload.text,
    kind: payload.kind,
  })
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 502 })
  }
  return NextResponse.json(result)
}
