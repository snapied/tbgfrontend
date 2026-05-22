// POST /api/payments/razorpay/verify
//
// Verifies the {orderId, paymentId, signature} triplet Razorpay's
// browser modal hands back via its `handler` callback. The signature
// is HMAC-SHA256(orderId + "|" + paymentId) using the server-side
// RAZORPAY_KEY_SECRET — if the secret didn't sign it, the buyer's
// browser couldn't have minted it, so this is the proof that the
// payment really happened.
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
  const signature = body.razorpay_signature
  if (!orderId || !paymentId || !signature) {
    return NextResponse.json(
      { ok: false, error: "Missing one of razorpay_order_id / razorpay_payment_id / razorpay_signature." },
      { status: 400 },
    )
  }

  // Razorpay's spec: signature = HMAC-SHA256("<order_id>|<payment_id>", secret)
  // hex-encoded, lowercased. timingSafeEqual guards against the tiny
  // class of attacks where a determined caller probes signatures
  // byte-by-byte off response timing.
  const expected = createHmac("sha256", secret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex")
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
    orderId,
  })
}
