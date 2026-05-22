// POST /api/payments/razorpay/webhook
//
// Async event sink for Razorpay. Configure the webhook URL +
// RAZORPAY_WEBHOOK_SECRET in the Razorpay dashboard under
// Settings → Webhooks. Razorpay signs every payload with the
// secret in the `X-Razorpay-Signature` header (HMAC-SHA256, hex).
//
// Events handled (Phase 1 scope):
//   • payment.captured  — primary success signal; the browser-modal
//     verify route already grants entitlements, so this is the
//     "backup" path for buyers who pay from a second device or
//     close the tab before the modal finishes.
//   • payment.failed    — log for retries / instructor visibility.
//
// Events stubbed for Phase 5 (subscription auto-renewal):
//   • subscription.charged  — bump Entitlement.expiresAt forward
//   • subscription.halted   — surface "card failed" notification
//
// Phase 1 deliberately keeps this idempotent + side-effect-light:
// we persist the event to a tenant-scoped log file under
// .portal-state/<slug>.razorpay-events.json so a deferred reconciler
// can read it. Granting an entitlement here would require knowing
// the tenant (which the webhook payload doesn't carry directly), so
// we punt that to the reconciler that joins this log against
// .portal-state/<slug>.json's `lms.users.v1` by email.

import { NextResponse, type NextRequest } from "next/server"
import { createHmac, timingSafeEqual } from "crypto"
import { promises as fs } from "fs"
import path from "path"

export const runtime = "nodejs"

// Razorpay webhook events we care about. Anything else is logged with
// `handled: false` so the audit trail stays complete without crashing
// on future event types we haven't taught the route about yet.
const KNOWN_EVENTS = new Set([
  "payment.captured",
  "payment.failed",
  "subscription.charged",
  "subscription.halted",
  "subscription.cancelled",
  "subscription.completed",
])

interface RazorpayWebhookPayload {
  event?: string
  payload?: Record<string, unknown>
  created_at?: number
}

function eventsLogPath(): string {
  return path.join(process.cwd(), ".portal-state", "razorpay-events.json")
}

interface LoggedEvent {
  id: string                 // razorpay's `id` field from inside the payload, fallback random
  event: string
  receivedAt: string         // ISO timestamp of when WE got it
  payload: unknown
  handled: boolean           // whether THIS route did anything; reconcilers flip this later
  note?: string              // free-form for diagnostics
}

async function appendEventLog(entry: LoggedEvent): Promise<void> {
  const file = eventsLogPath()
  await fs.mkdir(path.dirname(file), { recursive: true })
  let existing: LoggedEvent[] = []
  try {
    const raw = await fs.readFile(file, "utf8")
    const parsed = JSON.parse(raw) as unknown
    if (Array.isArray(parsed)) existing = parsed as LoggedEvent[]
  } catch {
    // First write — file doesn't exist yet.
  }
  // De-dupe by event id so a webhook retry doesn't fan out twice. Same
  // pattern Razorpay docs recommend: skip if the id is already logged.
  if (existing.some((e) => e.id === entry.id)) return
  existing.unshift(entry)
  // Cap the log to the last 500 events so .portal-state stays small;
  // the reconciler walks the file newest-first so dropping the tail
  // is safe.
  if (existing.length > 500) existing.length = 500
  const tmp = `${file}.${process.pid}.tmp`
  await fs.writeFile(tmp, JSON.stringify(existing, null, 2), "utf8")
  await fs.rename(tmp, file)
}

export async function POST(req: NextRequest) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET
  if (!secret) {
    return NextResponse.json(
      { ok: false, error: "Webhook secret not configured." },
      { status: 503 },
    )
  }

  // Razorpay signs the raw body — Next gives us a Request whose .text()
  // returns exactly the bytes the platform sent, which is what we
  // need to feed into HMAC. Reading it twice (text + json) would
  // change the bytes, so we keep the text form and parse it
  // ourselves below.
  const raw = await req.text()
  const signature = req.headers.get("x-razorpay-signature") ?? ""
  const expected = createHmac("sha256", secret).update(raw).digest("hex")
  const expectedBuf = Buffer.from(expected, "utf8")
  const givenBuf = Buffer.from(signature, "utf8")
  if (
    expectedBuf.length !== givenBuf.length ||
    !timingSafeEqual(expectedBuf, givenBuf)
  ) {
    return NextResponse.json(
      { ok: false, error: "Signature mismatch." },
      { status: 401 },
    )
  }

  let body: RazorpayWebhookPayload
  try {
    body = JSON.parse(raw) as RazorpayWebhookPayload
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 })
  }

  const event = body.event ?? "unknown"
  const known = KNOWN_EVENTS.has(event)
  // Pull a stable id off the payload for de-dupe. Razorpay nests it
  // under payload.payment.entity.id (or payload.subscription.entity.id
  // for sub events); we walk a couple of shapes and fall back to a
  // random id so the log never collides.
  const id = extractEntityId(body) ?? genId("evt")

  await appendEventLog({
    id,
    event,
    receivedAt: new Date().toISOString(),
    payload: body,
    // Phase 1: we acknowledge known events but defer the actual
    // entitlement / subscription side-effects to the reconciler the
    // dashboard analytics page can wire up later. Unknown events
    // are still logged so we never silently drop a payload.
    handled: known,
    note: known
      ? "Logged for reconciler; verify route already grants entitlements for browser-modal payments."
      : "Unknown event — captured for audit, no side effects.",
  })

  return NextResponse.json({ ok: true, event, id })
}

function extractEntityId(body: RazorpayWebhookPayload): string | null {
  const payload = body.payload as Record<string, unknown> | undefined
  if (!payload) return null
  for (const slot of ["payment", "subscription", "order", "refund"]) {
    const wrapper = payload[slot] as
      | { entity?: { id?: string } }
      | undefined
    const id = wrapper?.entity?.id
    if (typeof id === "string" && id) return id
  }
  return null
}

function genId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`
}
