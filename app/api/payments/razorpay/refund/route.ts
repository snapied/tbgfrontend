// POST /api/payments/razorpay/refund
//
// Issues a refund against a Razorpay payment. The caller passes the
// Razorpay payment id (NOT our internal order id — they're different
// shapes) plus an amount in MAJOR units (or omit for a full refund).
//
// Razorpay's refund endpoint:
//   POST /v1/payments/<payment_id>/refund
//   body: { amount?: <minor>, speed?: "normal"|"optimum", notes? }
//
// On success Razorpay returns a refund object with id `rfnd_XXX` and
// status `processed` (instant) or `pending` (batch). We return the
// full object so the caller (UI) can flip the local order to
// `refunded` and stamp the gateway refund id for reconciliation.
//
// IMPORTANT: this route does NOT mutate any local state — it ONLY
// talks to Razorpay. The store mutation (refundOrder) runs client-
// side after the call returns; the webhook (refund.processed) is the
// authoritative backstop in case the client never receives the
// response (closed tab, network drop). Both paths converge on the
// same Order.status === "refunded".
//
// Request body:
//   { paymentId: string,
//     amount?: number (major units; omit for full refund),
//     reason?: string,
//     notes?: Record<string, string> }
//
// Response (200):
//   { ok: true, refund: { id, amount, currency, status, ... } }
// Response (error):
//   { ok: false, error: string }

import { NextResponse, type NextRequest } from "next/server"

export const runtime = "nodejs"

interface RefundRequest {
  paymentId?: string
  amount?: number
  reason?: string
  notes?: Record<string, string>
}

interface RazorpayRefundResponse {
  id: string
  payment_id: string
  amount: number
  currency: string
  status: string
  speed_processed?: string
  notes?: Record<string, string>
  receipt?: string | null
  created_at?: number
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

  let body: RefundRequest
  try {
    body = (await req.json()) as RefundRequest
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 })
  }

  const paymentId = String(body.paymentId ?? "").trim()
  if (!paymentId || !/^pay_[A-Za-z0-9]+$/.test(paymentId)) {
    return NextResponse.json(
      { ok: false, error: "Missing or malformed `paymentId` (expected pay_XXX)." },
      { status: 400 },
    )
  }

  // Build payload. Amount omitted = full refund. Razorpay rejects a
  // 0 amount with a confusing "amount must be > 0" — surface that
  // before the round-trip if the caller passes 0 explicitly.
  const payload: Record<string, unknown> = {}
  if (body.amount !== undefined) {
    const amountMajor = Number(body.amount)
    if (!Number.isFinite(amountMajor) || amountMajor <= 0) {
      return NextResponse.json(
        { ok: false, error: "Refund amount must be a positive number (or omit for full refund)." },
        { status: 400 },
      )
    }
    payload.amount = Math.round(amountMajor * 100)
  }
  const notes: Record<string, string> = { ...(body.notes ?? {}) }
  if (body.reason) notes.reason = body.reason
  if (Object.keys(notes).length > 0) payload.notes = notes
  // `speed: optimum` uses RBI's instant-refund rails when supported
  // by the card network; falls back to the usual batch otherwise.
  // Safe default — same outcome as "normal" for non-eligible methods.
  payload.speed = "optimum"

  const basicAuth = Buffer.from(`${keyId}:${keySecret}`).toString("base64")
  let res: Response
  try {
    res = await fetch(
      `https://api.razorpay.com/v1/payments/${encodeURIComponent(paymentId)}/refund`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${basicAuth}`,
        },
        body: JSON.stringify(payload),
      },
    )
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: `Network error contacting Razorpay: ${(err as Error).message}` },
      { status: 502 },
    )
  }

  const json = (await res.json().catch(() => null)) as
    | RazorpayRefundResponse
    | RazorpayErrorBody
    | null

  if (!res.ok || !json || !("id" in json)) {
    const err =
      json && "error" in json && json.error?.description
        ? json.error.description
        : `Razorpay returned ${res.status}`
    return NextResponse.json({ ok: false, error: err }, { status: 502 })
  }

  return NextResponse.json({ ok: true, refund: json })
}
