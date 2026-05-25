// WhatsApp transport. Mirrors /lib/zepto.ts but for WhatsApp.
//
// Two send modes:
//   1. Free-form `text` — only works inside the 24-hour customer
//      service window after the recipient last messaged the business.
//      Used for replies, invite confirmations, etc.
//   2. Pre-approved `template` — works any time (proactive class
//      reminders, certificates, marketing). Required for messages
//      sent BEFORE the recipient has messaged us.
//
// Picks a provider from env vars:
//   • Meta WhatsApp Cloud API when META_WHATSAPP_TOKEN +
//     META_WHATSAPP_PHONE_ID are set (also accepts the script-style
//     aliases WA_TOKEN + WA_PHONE_ID so the env can be reused 1-for-1
//     with backend/scripts/send-wa-reminder.sh).
//   • Twilio WhatsApp when TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN +
//     TWILIO_WHATSAPP_FROM are set
//   • Stub log otherwise — returns { ok: true, stub: true } so callers
//     can still treat the channel as "reached" during development.

interface TemplateSpec {
  /** Template name as approved in Meta WhatsApp Manager (e.g. "the_big_class_reminder"). */
  name: string
  /** Language code the template was approved under (default "en"). */
  language?: string
  /** Plain-text values for {{1}}, {{2}}, ... in the HEADER component, in order. */
  headerParams?: string[]
  /** Plain-text values for {{1}}, {{2}}, ... in the BODY component, in order. */
  bodyParams?: string[]
}

interface SendInput {
  to: string
  /** Required for free-form sends (inside 24h window). */
  text?: string
  /** Required for template sends (outside 24h window — most reminders). */
  template?: TemplateSpec
  kind?: string
}

export type SendWhatsAppResult =
  | { ok: true; messageId: string; provider: "meta" | "twilio" }
  | { ok: true; stub: true; reason: string }
  | { ok: false; error: string }

export async function sendWhatsApp(input: SendInput): Promise<SendWhatsAppResult> {
  if (!input.text && !input.template) {
    return { ok: false, error: "sendWhatsApp requires either `text` or `template`" }
  }
  const to = input.to.replace(/[\s\-()+]/g, "")
  const provider = pickProvider()
  if (!provider) {
    // eslint-disable-next-line no-console
    console.info("[whatsapp:send STUB]", {
      to,
      kind: input.kind,
      mode: input.template ? `template:${input.template.name}` : "text",
      preview: input.text ?? `${input.template?.bodyParams?.join(" | ")}`,
    })
    return {
      ok: true,
      stub: true,
      reason:
        "no whatsapp provider configured (set META_WHATSAPP_TOKEN + META_WHATSAPP_PHONE_ID, or TWILIO_* env vars)",
    }
  }
  try {
    if (provider === "meta") {
      const messageId = await sendViaMeta(to, input)
      return { ok: true, messageId, provider: "meta" }
    }
    // Twilio only supports free-form here. For templates over Twilio
    // you'd configure a Content SID — out of scope for this seam.
    if (input.template) {
      return {
        ok: false,
        error:
          "Twilio provider doesn't support `template` sends through this seam — switch to Meta or wire a Twilio Content SID.",
      }
    }
    const messageId = await sendViaTwilio(to, input.text!)
    return { ok: true, messageId, provider: "twilio" }
  } catch (err) {
    return { ok: false, error: (err as Error).message }
  }
}

function pickProvider(): "meta" | "twilio" | null {
  if (metaToken() && metaPhoneId()) return "meta"
  if (
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_WHATSAPP_FROM
  )
    return "twilio"
  return null
}

function metaToken(): string | undefined {
  return process.env.META_WHATSAPP_TOKEN || process.env.WA_TOKEN
}
function metaPhoneId(): string | undefined {
  return process.env.META_WHATSAPP_PHONE_ID || process.env.WA_PHONE_ID
}

async function sendViaMeta(to: string, input: SendInput): Promise<string> {
  // Pinned to v21.0 — same as backend/scripts/send-wa-reminder.sh. Older
  // versions (v18) still work but Meta keeps deprecating them; bump
  // both call sites together when v21 reaches EOL.
  const url = `https://graph.facebook.com/v21.0/${metaPhoneId()}/messages`

  const payload: Record<string, unknown> = {
    messaging_product: "whatsapp",
    to,
  }

  if (input.template) {
    const components: Array<{ type: string; parameters: Array<{ type: "text"; text: string }> }> = []
    if (input.template.headerParams && input.template.headerParams.length > 0) {
      components.push({
        type: "header",
        parameters: input.template.headerParams.map((text) => ({ type: "text", text })),
      })
    }
    if (input.template.bodyParams && input.template.bodyParams.length > 0) {
      components.push({
        type: "body",
        parameters: input.template.bodyParams.map((text) => ({ type: "text", text })),
      })
    }
    payload.type = "template"
    payload.template = {
      name: input.template.name,
      language: { code: input.template.language ?? "en" },
      ...(components.length > 0 ? { components } : {}),
    }
  } else {
    payload.type = "text"
    payload.text = { body: input.text! }
  }

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${metaToken()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  })
  const body = (await res.json().catch(() => ({}))) as {
    messages?: { id?: string }[]
    error?: { message?: string; code?: number }
  }
  if (!res.ok) {
    const code = body.error?.code ? ` [${body.error.code}]` : ""
    throw new Error(`${body.error?.message ?? `Meta WhatsApp returned ${res.status}`}${code}`)
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
