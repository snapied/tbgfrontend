// POST /api/payments/razorpay/verify
//
// Verifies the signed payload Razorpay's browser modal hands back via
// its `handler` callback. Razorpay uses TWO different signing
// schemes depending on what the modal was opened against:
//
//   One-time (orderId):
//     signature = HMAC-SHA256("<order_id>|<payment_id>", secret)
//
//   Subscription (subscriptionId):
//     signature = HMAC-SHA256("<payment_id>|<subscription_id>", secret)
//
// Note the operand order flips. We accept both shapes and pick the
// scheme based on which id was set on the request body — if a
// subscriptionId is present, it's a subscription verify; otherwise
// it's a one-time verify.
//
// We deliberately do NOT touch the localStorage-backed store from here
// (no way to reach it server-side). The client takes the {ok: true}
// response and finishes its existing checkout() flow, passing the
// verified payment id in as the new `paymentReference` so the resulting
// Order is stamped with the real gateway reference.

import { NextResponse, type NextRequest } from "next/server"
import { createHmac, timingSafeEqual } from "crypto"

export const runtime = "nodejs"

interface VerifyRequest {
  razorpay_order_id?: string
  razorpay_payment_id?: string
  razorpay_subscription_id?: string
  razorpay_signature?: string
}

export async function POST(req: NextRequest) {
  const secret = process.env.RAZORPAY_KEY_SECRET
  if (!secret) {
    return NextResponse.json(
      { ok: false, error: "Razorpay key secret not configured on the server." },
      { status: 503 },
    )
  }

  let body: VerifyRequest
  try {
    body = (await req.json()) as VerifyRequest
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 })
  }

  const orderId = body.razorpay_order_id
  const paymentId = body.razorpay_payment_id
  const subscriptionId = body.razorpay_subscription_id
  const signature = body.razorpay_signature
  if (!paymentId || !signature) {
    return NextResponse.json(
      { ok: false, error: "Missing razorpay_payment_id or razorpay_signature." },
      { status: 400 },
    )
  }

  // Build the signed payload according to which flow we're verifying.
  // A subscriptionId on the request means this is a subscription
  // payment — operand order is `payment|subscription`. Otherwise
  // we're verifying a one-time order — operand order is `order|payment`.
  let signedPayload: string
  let flow: "subscription" | "order"
  if (subscriptionId) {
    signedPayload = `${paymentId}|${subscriptionId}`
    flow = "subscription"
  } else if (orderId) {
    signedPayload = `${orderId}|${paymentId}`
    flow = "order"
  } else {
    return NextResponse.json(
      { ok: false, error: "Pass either razorpay_order_id (one-time) or razorpay_subscription_id (recurring)." },
      { status: 400 },
    )
  }

  const expected = createHmac("sha256", secret).update(signedPayload).digest("hex")
  const expectedBuf = Buffer.from(expected, "utf8")
  const givenBuf = Buffer.from(signature, "utf8")
  if (
    expectedBuf.length !== givenBuf.length ||
    !timingSafeEqual(expectedBuf, givenBuf)
  ) {
    return NextResponse.json(
      { ok: false, error: "Signature mismatch — refusing to confirm this payment." },
      { status: 400 },
    )
  }

  return NextResponse.json({
    ok: true,
    paymentId,
    orderId: orderId ?? null,
    subscriptionId: subscriptionId ?? null,
    flow,
  })
}
