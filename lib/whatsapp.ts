// WhatsApp transport. Mirrors /lib/zepto.ts but for WhatsApp.
//
// Picks a provider from env vars:
//   • Meta WhatsApp Cloud API when META_WHATSAPP_TOKEN +
//     META_WHATSAPP_PHONE_ID are set
//   • Twilio WhatsApp when TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN +
//     TWILIO_WHATSAPP_FROM are set
//   • Stub log otherwise — returns { ok: true, stub: true } so callers
//     can still treat the channel as "reached" during development.
//
// Used by /api/whatsapp/send (generic transport) and
// /api/auth/invite-request (server-side fan-out without a second HTTP
// hop). Keep this as the single seam so wiring a new provider only
// touches one file.

interface SendInput {
  to: string
  text: string
  kind?: string
}

export type SendWhatsAppResult =
  | { ok: true; messageId: string; provider: "meta" | "twilio" }
  | { ok: true; stub: true; reason: string }
  | { ok: false; error: string }

export async function sendWhatsApp(input: SendInput): Promise<SendWhatsAppResult> {
  const to = input.to.replace(/[\s\-()]/g, "")
  const provider = pickProvider()
  if (!provider) {
    // eslint-disable-next-line no-console
    console.info("[whatsapp:send STUB]", { to, kind: input.kind, text: input.text })
    return {
      ok: true,
      stub: true,
      reason:
        "no whatsapp provider configured (set META_WHATSAPP_TOKEN + META_WHATSAPP_PHONE_ID, or TWILIO_* env vars)",
    }
  }
  try {
    if (provider === "meta") {
      const messageId = await sendViaMeta(to, input.text)
      return { ok: true, messageId, provider: "meta" }
    }
    const messageId = await sendViaTwilio(to, input.text)
    return { ok: true, messageId, provider: "twilio" }
  } catch (err) {
    return { ok: false, error: (err as Error).message }
  }
}

function pickProvider(): "meta" | "twilio" | null {
  if (process.env.META_WHATSAPP_TOKEN && process.env.META_WHATSAPP_PHONE_ID) return "meta"
  if (
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_WHATSAPP_FROM
  )
    return "twilio"
  return null
}

async function sendViaMeta(to: string, text: string): Promise<string> {
  const url = `https://graph.facebook.com/v18.0/${process.env.META_WHATSAPP_PHONE_ID}/messages`
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.META_WHATSAPP_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: text },
    }),
  })
  const body = (await res.json().catch(() => ({}))) as {
    messages?: { id?: string }[]
    error?: { message?: string }
  }
  if (!res.ok) {
    throw new Error(body.error?.message ?? `Meta WhatsApp returned ${res.status}`)
  }
  return body.messages?.[0]?.id ?? "unknown"
}

async function sendViaTwilio(to: string, text: string): Promise<string> {
  const sid = process.env.TWILIO_ACCOUNT_SID!
  const token = process.env.TWILIO_AUTH_TOKEN!
  const from = process.env.TWILIO_WHATSAPP_FROM!
  const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`
  const form = new URLSearchParams({
    From: from.startsWith("whatsapp:") ? from : `whatsapp:${from}`,
    To: to.startsWith("whatsapp:") ? to : `whatsapp:${to}`,
    Body: text,
  })
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: form.toString(),
  })
  const body = (await res.json().catch(() => ({}))) as {
    sid?: string
    message?: string
  }
  if (!res.ok) {
    throw new Error(body.message ?? `Twilio returned ${res.status}`)
  }
  return body.sid ?? "unknown"
}
