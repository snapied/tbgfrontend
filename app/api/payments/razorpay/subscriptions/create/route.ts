// POST /api/payments/razorpay/subscriptions/create
//
// Creates (or reuses) a Razorpay Plan that matches the requested
// {amount, currency, intervalDays} pricing and then mints a
// Subscription for the buyer against that plan. The client wires the
// returned subscription_id into the browser modal so the buyer can
// authorise the first charge.
//
// Razorpay's Plan/Subscription model:
//   • A Plan is reusable — "INR 999 / month" is one Plan, shared by
//     everyone subscribing to that price.
//   • A Subscription points at a Plan + a customer.
//   • payment.captured fires on each successful renewal; our webhook
//     route logs it for the reconciler to bump Entitlement.expiresAt.
//
// We cache Plans in Postgres (table portal_state, slug=_system,
// key=razorpay.plans.v1) so repeat subscribes don't churn through
// Razorpay's create-plan endpoint. Survives server restarts and
// scales across multiple Next processes hitting the same backend.

import { NextResponse, type NextRequest } from "next/server"
import {
  SYSTEM_SLUG,
  loadPortalKey,
  upsertPortalKey,
} from "@/lib/portal-state-client"

export const runtime = "nodejs"

interface CreateRequest {
  /** Major-unit amount per cycle (e.g. 999 for ₹999/month). */
  amount?: number
  currency?: string
  /** One of the intervals our PricingModel union allows. */
  intervalDays?: 30 | 90 | 180 | 365
  /** How many cycles to charge before stopping. 0 / undefined =
   *  open-ended (Razorpay caps at 12 unless you set this).
   *  Match this to whatever the buyer agreed to. */
  totalCount?: number
  /** Free-trial length in days. When set, Razorpay defers the first
   *  charge to `now + trialDays` via the Subscription's `start_at`
   *  field; the buyer authorises the card now and isn't billed
   *  until the trial ends. Defaults to 0 (no trial). */
  trialDays?: number
  customerEmail?: string
  customerName?: string
  productId?: string
  notes?: Record<string, string>
}

interface RazorpayPlanResponse {
  id: string
  period: "daily" | "weekly" | "monthly" | "quarterly" | "yearly"
  interval: number
  item?: { amount?: number; currency?: string }
}
interface RazorpaySubResponse {
  id: string
  status: string
  plan_id: string
  short_url?: string
  total_count: number
}
interface RazorpayErrorBody {
  error?: { code?: string; description?: string }
}

const PLANS_CACHE_KEY = "razorpay.plans.v1"

type PlansCache = Record<string, string> // cacheKey → razorpay_plan_id

async function loadPlansCache(): Promise<PlansCache> {
  return (
    (await loadPortalKey<PlansCache>(SYSTEM_SLUG, PLANS_CACHE_KEY)) ?? {}
  )
}

async function savePlansCache(cache: PlansCache): Promise<void> {
  await upsertPortalKey(SYSTEM_SLUG, PLANS_CACHE_KEY, cache)
}

// Map our intervalDays into Razorpay's {period, interval} pair.
// Razorpay's "period" is the unit; "interval" is the multiplier. So
// 30d → monthly×1, 90d → monthly×3, etc.
function razorpayCadence(intervalDays: number): { period: string; interval: number } {
  if (intervalDays % 365 === 0) {
    return { period: "yearly", interval: intervalDays / 365 || 1 }
  }
  if (intervalDays === 90) return { period: "quarterly", interval: 1 }
  if (intervalDays === 180) return { period: "monthly", interval: 6 }
  // Default to monthly for 30-day plans; anything weird (e.g. 14)
  // falls through here too, multiplied as a fraction of a month.
  return { period: "monthly", interval: Math.max(1, Math.round(intervalDays / 30)) }
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

  let body: CreateRequest
  try {
    body = (await req.json()) as CreateRequest
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 })
  }

  const amountMajor = Number(body.amount)
  if (!Number.isFinite(amountMajor) || amountMajor <= 0) {
    return NextResponse.json({ ok: false, error: "Amount must be a positive number." }, { status: 400 })
  }
  const currency = (body.currency ?? "INR").toUpperCase()
  const intervalDays = body.intervalDays ?? 30
  const amountMinor = Math.round(amountMajor * 100)
  // Razorpay requires a finite `total_count`. The buyer-friendly
  // default is "effectively forever" — pick a count large enough that
  // the subscription auto-expires only well past anything a creator
  // would call a normal customer lifecycle. Compute it from the
  // billing interval so each cadence gets ~10 years of cycles:
  //   • monthly (30d)  → 120 cycles
  //   • quarterly (90d) → 40
  //   • semi-annual (180d) → 20
  //   • yearly (365d)  → 10
  // Caller can still override by passing an explicit `totalCount`.
  const defaultTotalCount = Math.max(
    10,
    Math.round((10 * 365) / intervalDays),
  )
  const totalCount =
    Number.isFinite(body.totalCount) && (body.totalCount as number) > 0
      ? (body.totalCount as number)
      : defaultTotalCount

  const cadence = razorpayCadence(intervalDays)
  const cacheKey = `${amountMinor}-${currency}-${cadence.period}-${cadence.interval}`

  const basicAuth = Buffer.from(`${keyId}:${keySecret}`).toString("base64")
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Basic ${basicAuth}`,
  }

  // ── Plan (cached) ──
  const cache = await loadPlansCache()
  let planId = cache[cacheKey]
  if (!planId) {
    let planRes: Response
    try {
      planRes = await fetch("https://api.razorpay.com/v1/plans", {
        method: "POST",
        headers,
        body: JSON.stringify({
          period: cadence.period,
          interval: cadence.interval,
          item: {
            name: `Subscription ${amountMajor} ${currency}`,
            amount: amountMinor,
            currency,
          },
          notes: body.notes ?? {},
        }),
      })
    } catch (err) {
      return NextResponse.json(
        { ok: false, error: `Network error contacting Razorpay: ${(err as Error).message}` },
        { status: 502 },
      )
    }
    const planJson = (await planRes.json().catch(() => null)) as
      | RazorpayPlanResponse
      | RazorpayErrorBody
      | null
    if (!planRes.ok || !planJson || !("id" in planJson)) {
      const err =
        planJson && "error" in planJson && planJson.error?.description
          ? planJson.error.description
          : `Razorpay returned ${planRes.status}`
      return NextResponse.json({ ok: false, error: err }, { status: 502 })
    }
    planId = planJson.id
    cache[cacheKey] = planId
    await savePlansCache(cache)
  }

  // ── Subscription ──
  const subNotes: Record<string, string> = {
    ...(body.notes ?? {}),
  }
  if (body.productId) subNotes.productId = body.productId
  if (body.customerEmail) subNotes.customerEmail = body.customerEmail
  if (body.customerName) subNotes.customerName = body.customerName

  // Trial — defer the first charge by `trialDays`. Razorpay uses
  // unix-seconds for `start_at`. Zero / unset = charge immediately.
  const trialDays = Number(body.trialDays)
  const startAt =
    Number.isFinite(trialDays) && trialDays > 0
      ? Math.floor(Date.now() / 1000) + trialDays * 24 * 60 * 60
      : undefined

  let subRes: Response
  try {
    subRes = await fetch("https://api.razorpay.com/v1/subscriptions", {
      method: "POST",
      headers,
      body: JSON.stringify({
        plan_id: planId,
        total_count: totalCount,
        customer_notify: 1,
        notes: subNotes,
        ...(startAt ? { start_at: startAt } : {}),
      }),
    })
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: `Network error contacting Razorpay: ${(err as Error).message}` },
      { status: 502 },
    )
  }
  const subJson = (await subRes.json().catch(() => null)) as
    | RazorpaySubResponse
    | RazorpayErrorBody
    | null
  if (!subRes.ok || !subJson || !("id" in subJson)) {
    const err =
      subJson && "error" in subJson && subJson.error?.description
        ? subJson.error.description
        : `Razorpay returned ${subRes.status}`
    return NextResponse.json({ ok: false, error: err }, { status: 502 })
  }

  return NextResponse.json({
    ok: true,
    subscriptionId: subJson.id,
    planId,
    keyId,
    shortUrl: subJson.short_url,
  })
}
