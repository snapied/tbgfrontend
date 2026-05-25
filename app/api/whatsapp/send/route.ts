// Generic WhatsApp send — POST { to, text?, template?, kind? }.
//
// Two modes:
//   • `text`     — free-form message. Only delivers inside the 24h
//                  customer service window (i.e. after the recipient
//                  has messaged the business). Meta returns 131047
//                  outside that window.
//   • `template` — pre-approved template. Delivers any time, used for
//                  proactive sends (class reminders, certificates).
//
// Exactly one of `text` or `template` is required. Both can be passed
// (template wins; text becomes the stub-log preview when no provider
// is configured).
//
// Mirrors /api/email/send. Delegates to lib/whatsapp which picks a
// provider from env (Meta cloud API or Twilio) or falls back to a
// server-side stub log when neither is configured. Server-internal
// callers (e.g. /api/auth/invite-request, /api/cron/class-reminders)
// should import sendWhatsApp from "@/lib/whatsapp" directly to avoid
// the extra HTTP hop.

import { NextResponse, type NextRequest } from "next/server"
import { sendWhatsApp } from "@/lib/whatsapp"

export const runtime = "nodejs"

interface SendPayload {
  to: string
  text?: string
  template?: {
    name: string
    language?: string
    headerParams?: string[]
    bodyParams?: string[]
  }
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
  if (!payload.text && !payload.template) {
    return NextResponse.json(
      { error: "Provide either `text` (free-form) or `template` (proactive sends)" },
      { status: 400 },
    )
  }
  if (payload.template && !payload.template.name) {
    return NextResponse.json({ error: "Missing `template.name`" }, { status: 400 })
  }

  const result = await sendWhatsApp({
    to: payload.to,
    text: payload.text,
    template: payload.template,
    kind: payload.kind,
  })
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 502 })
  }
  return NextResponse.json(result)
}
