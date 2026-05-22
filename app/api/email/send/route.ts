// Generic email send — POST { to, subject, html, text? }.
//
// Open by design for the demo so client code can fire notifications without
// a separate auth layer. For production, gate this with a session cookie
// (or move all email sending into purpose-specific routes that don't accept
// raw HTML from the client).

import { NextResponse, type NextRequest } from "next/server"
import { sendEmail } from "@/lib/zepto"

export const runtime = "nodejs"

interface SendPayload {
  to: string | Array<{ email: string; name?: string }>
  subject?: string
  html?: string
  text?: string
  replyTo?: string
}

export async function POST(req: NextRequest) {
  let payload: SendPayload
  try {
    payload = (await req.json()) as SendPayload
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }
  if (!payload.to) return NextResponse.json({ error: "Missing `to`" }, { status: 400 })
  if (!payload.subject) return NextResponse.json({ error: "Missing `subject`" }, { status: 400 })
  if (!payload.html && !payload.text) return NextResponse.json({ error: "Need `html` or `text`" }, { status: 400 })

  const result = await sendEmail({
    to: payload.to,
    subject: payload.subject,
    html: payload.html ?? `<pre>${payload.text}</pre>`,
    text: payload.text,
    replyTo: payload.replyTo,
  })
  if ("stub" in result && result.stub) {
    return NextResponse.json({ ok: false, stub: true, reason: result.reason }, { status: 200 })
  }
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 502 })
  }
  return NextResponse.json({ ok: true, messageId: result.messageId })
}
