// Server-side ZeptoMail (Zoho transactional email) client.
//
// Reads credentials from environment:
//   ZEPTO_API_KEY  — the full Authorization header value, including the
//                    "Zoho-enczapikey " prefix that Zoho gives you.
//   ZEPTO_EMAIL    — verified "From" address (must be a mail-from address
//                    your ZeptoMail account is authorised to send as).
//   ZEPTO_NAME     — display name for the From header.
//
// Call site:  await sendEmail({ to, subject, html, text? })
//
// Behaviour when ZEPTO_API_KEY is missing: returns `{ ok: false, stub: true }`
// so dev / preview environments without credentials still boot. Callers can
// fall back to logging.
//
// Server-only by construction — imports `process.env` which isn't usable on
// the client. Always invoke from a Route Handler / server action.

const ZEPTO_ENDPOINT = process.env.ZEPTO_ENDPOINT || "https://api.zeptomail.in/v1.1/email"

export interface SendEmailInput {
  to: string | Array<{ email: string; name?: string }>
  subject: string
  html: string
  text?: string
  replyTo?: string
  // Optional per-message overrides for the global FROM defaults.
  fromAddress?: string
  fromName?: string
}

export type SendEmailResult =
  | { ok: true; messageId?: string }
  | { ok: false; stub: true; reason: string }
  | { ok: false; stub?: false; status: number; error: string }

function readConfig() {
  const apiKey = process.env.ZEPTO_API_KEY?.trim()
  const fromAddress = process.env.ZEPTO_EMAIL?.trim()
  const fromName = process.env.ZEPTO_NAME?.trim() || "The Big Class"
  return { apiKey, fromAddress, fromName }
}

export function isEmailConfigured(): boolean {
  const { apiKey, fromAddress } = readConfig()
  return !!apiKey && !!fromAddress
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const cfg = readConfig()
  const fromAddress = input.fromAddress ?? cfg.fromAddress
  const fromName = input.fromName ?? cfg.fromName

  if (!cfg.apiKey || !fromAddress) {
    // eslint-disable-next-line no-console
    console.warn("[zepto] missing ZEPTO_API_KEY or ZEPTO_EMAIL — falling back to stub", {
      to: input.to,
      subject: input.subject,
    })
    return { ok: false, stub: true, reason: "ZEPTO_API_KEY or ZEPTO_EMAIL not set" }
  }

  const recipients = Array.isArray(input.to)
    ? input.to.map((t) => ({ email_address: { address: t.email, name: t.name } }))
    : [{ email_address: { address: input.to } }]

  const body = {
    from: { address: fromAddress, name: fromName },
    to: recipients,
    subject: input.subject,
    htmlbody: input.html,
    ...(input.text ? { textbody: input.text } : {}),
    ...(input.replyTo ? { reply_to: [{ address: input.replyTo }] } : {}),
  }

  try {
    const res = await fetch(ZEPTO_ENDPOINT, {
      method: "POST",
      headers: {
        // The api key already begins with "Zoho-enczapikey ", so we use it
        // as-is for the Authorization header.
        "Authorization": cfg.apiKey,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const text = await res.text().catch(() => "")
      // eslint-disable-next-line no-console
      console.error("[zepto] send failed", res.status, text)
      return { ok: false, status: res.status, error: text || res.statusText }
    }

    const json = (await res.json().catch(() => ({}))) as {
      data?: Array<{ message_id?: string }>
    }
    return { ok: true, messageId: json.data?.[0]?.message_id }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[zepto] network error", err)
    return { ok: false, status: 0, error: (err as Error).message }
  }
}
