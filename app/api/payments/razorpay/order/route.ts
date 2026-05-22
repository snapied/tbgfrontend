// POST /api/payments/razorpay/order
//
// Mints a Razorpay order id for an amount the client is about to charge.
// The client computes the total (with coupons / pay-what-you-want
// override) — we do NOT re-derive product pricing server-side here
// because the existing store lives in localStorage and isn't reachable
// from the server. The verify step is what makes the flow trustworthy:
// the buyer can fudge the amount client-side, but Razorpay's HMAC ties
// the signed `razorpay_order_id` to whatever amount we minted here, and
// the verify route refuses to grant entitlements unless the signature
// matches. The amount the buyer actually paid is the source of truth.
//
// Request body:
//   { amount: number (major units), currency: string, productId?: string,
//     customerEmail?: string, customerName?: string, notes?: object }
//
// Response (200):
//   { ok: true, order: { id, amount, currency }, keyId }
// Response (error):
//   { ok: false, error: string }

import { NextResponse, type NextRequest } from "next/server"

export const runtime = "nodejs"

interface RazorpayOrderRequest {
  amount?: number
  currency?: string
  productId?: string
  customerEmail?: string
  customerName?: string
  notes?: Record<string, string>
}

interface RazorpayOrderResponse {
  id: string
  amount: number
  currency: string
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

  let body: RazorpayOrderRequest
  try {
    body = (await req.json()) as RazorpayOrderRequest
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 })
  }

  const amountMajor = Number(body.amount)
  if (!Number.isFinite(amountMajor) || amountMajor <= 0) {
    return NextResponse.json({ ok: false, error: "Amount must be a positive number." }, { status: 400 })
  }
  const currency = (body.currency ?? "INR").toUpperCase()
  // Razorpay expects integers in the minor unit (paise / cents).
  const amountMinor = Math.round(amountMajor * 100)

  // Notes are surfaced in the Razorpay dashboard + webhooks — useful for
  // reconciling a payment back to our internal product/buyer ids.
  const notes: Record<string, string> = {
    ...(body.notes ?? {}),
  }
  if (body.productId) notes.productId = body.productId
  if (body.customerEmail) notes.customerEmail = body.customerEmail
  if (body.customerName) notes.customerName = body.customerName

  // Receipt is a free-form string echoed back on the order — Razorpay
  // dedupes by it within a short window, so we want it unique per
  // attempt (a buyer retrying a failed card on the same product should
  // still get a fresh order id).
  const receipt = `rcpt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`

  const basicAuth = Buffer.from(`${keyId}:${keySecret}`).toString("base64")
  let res: Response
  try {
    res = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${basicAuth}`,
      },
      body: JSON.stringify({
        amount: amountMinor,
        currency,
        receipt,
        notes,
        // payment_capture: 1 → auto-captures on success (no manual
        // capture step). This matches how the storefront currently
        // models orders: paid means access granted.
        payment_capture: 1,
      }),
    })
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: `Network error contacting Razorpay: ${(err as Error).message}` },
      { status: 502 },
    )
  }

  const json = (await res.json().catch(() => null)) as
    | RazorpayOrderResponse
    | RazorpayErrorBody
    | null

  if (!res.ok || !json || !("id" in json)) {
    const err =
      json && "error" in json && json.error?.description
        ? json.error.description
        : `Razorpay returned ${res.status}`
    return NextResponse.json({ ok: false, error: err }, { status: 502 })
  }

  return NextResponse.json({
    ok: true,
    order: { id: json.id, amount: json.amount, currency: json.currency },
    keyId,
  })
}
