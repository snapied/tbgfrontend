"use client"

// Razorpay Checkout JS wrapper. The browser modal does NOT take card data
// directly — it opens Razorpay's hosted checkout in an iframe, lets the
// buyer pay, and hands back `{razorpay_payment_id, razorpay_order_id,
// razorpay_signature}` which the verify route HMAC-checks server-side.
//
// We deliberately don't pull the Razorpay SDK off npm — the official one
// is a thin wrapper over the global `Razorpay` constructor that Checkout
// JS plants on `window`. Loading the script tag once on demand keeps the
// bundle clean and lets us skip the network round-trip in stub mode.
//
// Stub mode: when NEXT_PUBLIC_PAYMENTS_STUB === "1" or the publishable key
// is empty, `isRazorpayEnabled()` returns false and the checkout page
// falls back to the in-process stub. The script is never loaded.

const SCRIPT_SRC = "https://checkout.razorpay.com/v1/checkout.js"

// Memoised loader. Resolves once Razorpay is on window; subsequent calls
// share the same promise so we never inject two <script> tags.
let scriptPromise: Promise<void> | null = null

declare global {
  interface Window {
    Razorpay?: RazorpayConstructor
  }
}

interface RazorpayConstructor {
  new (options: RazorpayOptions): RazorpayInstance
}

interface RazorpayInstance {
  open: () => void
  on: (event: string, handler: (response: unknown) => void) => void
  close: () => void
}

export interface RazorpayPaymentResponse {
  razorpay_payment_id: string
  /** Set on one-time payments. Mutually exclusive with
   *  razorpay_subscription_id at the modal level — Razorpay sends
   *  whichever id matches how the modal was opened. */
  razorpay_order_id?: string
  /** Set on subscription payments — Razorpay's modal handler
   *  returns this in place of razorpay_order_id when the modal was
   *  opened with `subscription_id`. */
  razorpay_subscription_id?: string
  razorpay_signature: string
}

interface RazorpayOptions {
  key: string
  amount?: number              // in smallest currency unit (paise / cents)
  currency?: string
  /** Exactly one of order_id / subscription_id MUST be set.
   *  order_id          — one-time payment.
   *  subscription_id   — recurring; Razorpay authorises the first
   *                      charge through the same modal.            */
  order_id?: string
  subscription_id?: string
  name?: string
  description?: string
  image?: string
  prefill?: {
    name?: string
    email?: string
    contact?: string
  }
  notes?: Record<string, string>
  theme?: { color?: string }
  modal?: {
    ondismiss?: () => void
  }
  handler: (response: RazorpayPaymentResponse) => void
}

/** True when the env exposes a publishable key AND stub mode isn't forced. */
export function isRazorpayEnabled(): boolean {
  if (typeof window === "undefined") return false
  if (process.env.NEXT_PUBLIC_PAYMENTS_STUB === "1") return false
  return !!process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID
}

/** Lazy-load Razorpay's Checkout JS. Resolves once `window.Razorpay` exists. */
export function loadRazorpay(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Razorpay can only load in the browser."))
  }
  if (window.Razorpay) return Promise.resolve()
  if (scriptPromise) return scriptPromise
  scriptPromise = new Promise<void>((resolve, reject) => {
    const tag = document.createElement("script")
    tag.src = SCRIPT_SRC
    tag.async = true
    tag.onload = () => {
      if (window.Razorpay) resolve()
      else reject(new Error("Razorpay script loaded but constructor missing."))
    }
    tag.onerror = () => {
      // Clear the cache so a retry can re-attempt the load.
      scriptPromise = null
      reject(new Error("Failed to load Razorpay Checkout script."))
    }
    document.head.appendChild(tag)
  })
  return scriptPromise
}

export interface OpenRazorpayInput {
  /** Razorpay order id minted by /api/payments/razorpay/order.
   *  Mutually exclusive with subscriptionId. */
  orderId?: string
  /** Razorpay subscription id minted by
   *  /api/payments/razorpay/subscriptions/create. When set, the
   *  modal authorises the first recurring charge against this
   *  subscription. Mutually exclusive with orderId. */
  subscriptionId?: string
  /** Total amount, in MINOR units (paise for INR, cents for USD).
   *  Required for one-time; informational for subscriptions
   *  (Razorpay reads the plan's amount for recurring). */
  amountInMinor?: number
  currency?: string
  /** Storefront name to show in the modal header. */
  brandName: string
  /** Product title — appears as the subline in the modal. */
  description: string
  /** Pre-fills the buyer fields so they don't have to retype. */
  prefill?: { name?: string; email?: string; contact?: string }
  /** Optional theme primary colour (hex, e.g. "#6366f1"). */
  themeColor?: string
}

/**
 * Open the Razorpay modal. Returns a promise that resolves with the
 * payment response (paymentId / orderId / signature) when the buyer
 * completes, or rejects with `{reason: "dismissed"}` when they close it.
 *
 * Caller MUST send the resolved response to /api/payments/razorpay/verify
 * before granting any entitlement — the signature is the only proof the
 * payment actually completed.
 */
export async function openRazorpayCheckout(
  input: OpenRazorpayInput,
): Promise<RazorpayPaymentResponse> {
  await loadRazorpay()
  const key = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID
  if (!key) throw new Error("Razorpay key id missing — set NEXT_PUBLIC_RAZORPAY_KEY_ID.")
  if (typeof window === "undefined" || !window.Razorpay) {
    throw new Error("Razorpay constructor not on window after script load.")
  }
  if (!input.orderId && !input.subscriptionId) {
    throw new Error("openRazorpayCheckout: pass orderId or subscriptionId.")
  }
  return new Promise<RazorpayPaymentResponse>((resolve, reject) => {
    const options: RazorpayOptions = {
      key,
      name: input.brandName,
      description: input.description,
      prefill: input.prefill,
      modal: {
        ondismiss: () => reject(new Error("dismissed")),
      },
      handler: (response) => resolve(response),
    }
    if (input.orderId) {
      options.order_id = input.orderId
      options.amount = input.amountInMinor
      options.currency = input.currency
    } else if (input.subscriptionId) {
      options.subscription_id = input.subscriptionId
    }
    if (input.themeColor) options.theme = { color: input.themeColor }
    const rzp = new window.Razorpay!(options)
    rzp.open()
  })
}

/**
 * Convert a major-unit decimal amount (e.g. 499.50 INR) into the integer
 * minor units Razorpay expects (49950 paise). Razorpay rejects floats, so
 * we round half-up to avoid trailing-paise mismatches between client
 * total and server order amount.
 */
export function toMinorUnits(amountMajor: number): number {
  return Math.round(amountMajor * 100)
}
