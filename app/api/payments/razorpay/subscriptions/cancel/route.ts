// POST /api/payments/razorpay/subscriptions/cancel
//
// Tells Razorpay to stop charging a subscription. Razorpay's cancel
// endpoint accepts a `cancel_at_cycle_end` flag:
//   • true  → buyer keeps access until the current period ends; no
//             further charges. Default — matches the "Cancel at
//             period end" CTA on /my/billing.
//   • false → cancels immediately; access would still need to be
//             revoked separately. We don't expose this path yet.
//
// The local Subscription is flipped via the store's
// cancelSubscription() mutation in the same buyer click — this
// route owns the gateway side of that operation. On success the
// subscription.cancelled webhook also fires; the reconciler is
// idempotent so the double-write is safe.

import { NextResponse, type NextRequest } from "next/server"

export const runtime = "nodejs"

interface CancelRequest {
  /** Razorpay subscription id, e.g. "sub_OABC...". */
  subscriptionId?: string
  /** Cancel immediately if false; cancel at period end if true.
   *  Defaults to true — the buyer-friendly behaviour. */
  atCycleEnd?: boolean
}

interface RazorpaySubResponse {
  id: string
  status: string
}
interface RazorpayErrorBody {
  error?: { code?: string; description?: string }
}

export async function POST(req: NextRequest) {
  const keyId = process.env.RAZORPAY_KEY_ID
  const keySecret = process.env.RAZORPAY_KEY_SECRET
  if (!keyId || !keySecret) {
    return NextResponse.json(
      { ok: false, error: "Razorpay keys not configured on the server." },
      { status: 503 },
    )
  }

  let body: CancelRequest
  try {
    body = (await req.json()) as CancelRequest
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 })
  }
  const subscriptionId = body.subscriptionId?.trim()
  if (!subscriptionId) {
    return NextResponse.json({ ok: false, error: "Missing subscriptionId." }, { status: 400 })
  }
  const atCycleEnd = body.atCycleEnd !== false

  const basicAuth = Buffer.from(`${keyId}:${keySecret}`).toString("base64")
  let res: Response
  try {
    res = await fetch(
      `https://api.razorpay.com/v1/subscriptions/${encodeURIComponent(subscriptionId)}/cancel`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${basicAuth}`,
        },
        body: JSON.stringify({ cancel_at_cycle_end: atCycleEnd ? 1 : 0 }),
      },
    )
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: `Network error contacting Razorpay: ${(err as Error).message}` },
      { status: 502 },
    )
  }
  const json = (await res.json().catch(() => null)) as
    | RazorpaySubResponse
    | RazorpayErrorBody
    | null
  if (!res.ok || !json || !("id" in json)) {
    const err =
      json && "error" in json && json.error?.description
        ? json.error.description
        : `Razorpay returned ${res.status}`
    return NextResponse.json({ ok: false, error: err }, { status: 502 })
  }
  return NextResponse.json({ ok: true, status: json.status, atCycleEnd })
}
