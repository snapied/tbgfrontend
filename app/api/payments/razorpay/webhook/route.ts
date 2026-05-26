// POST /api/payments/razorpay/webhook
//
// Async event sink for Razorpay. Configure the webhook URL +
// RAZORPAY_WEBHOOK_SECRET in the Razorpay dashboard under
// Settings → Webhooks. Razorpay signs every payload with the
// secret in the `X-Razorpay-Signature` header (HMAC-SHA256, hex).
//
// Events handled:
//   • payment.captured      — backup grant for buyers whose verify
//                             call never reached us (e.g. closed tab,
//                             second device). Idempotent: skips if
//                             an Order with this paymentReference
//                             already exists in the tenant blob.
//   • payment.failed        — log only; surfaced for diagnostics.
//   • subscription.charged  — extend Entitlement.expiresAt forward
//                             by one billing period and bump the
//                             Subscription's currentPeriodEnd.
//   • subscription.halted   — fire a "your card failed, update
//                             payment" notification to the buyer.
//   • subscription.cancelled
//   • subscription.completed
//
// The tenant slug rides along inside the Razorpay `notes` we set at
// order/subscription create time (see checkout page + create
// routes). When `notes.tenant` is present we mutate that tenant's
// blob directly; otherwise we walk every tenant's portal_state and
// match by `notes.customerEmail`.
//
// Every received event is also appended to a system-scoped audit log
// (portal_state row with slug=_system, key=razorpay.events.v1; capped
// at 500 entries) so
// the dashboard can build a history view later if needed.

import { NextResponse, type NextRequest } from "next/server"
import { createHmac, timingSafeEqual } from "crypto"
import {
  SYSTEM_SLUG,
  listSlugs,
  loadPortalKey,
  loadPortalState,
  upsertPortalKey,
  upsertPortalKeys,
} from "@/lib/portal-state-client"
import { lookupTenantsByEmail } from "@/lib/tenant-user-index-client"

export const runtime = "nodejs"

const KNOWN_EVENTS = new Set([
  "payment.captured",
  "payment.failed",
  // Refund events — the dashboard-initiated refund flow already
  // mutates the Order locally on the click, but Razorpay-dashboard
  // refunds (created outside our UI) need to flow back here so the
  // tenant blob doesn't drift. Idempotent — if the order is already
  // refunded the reconciler short-circuits.
  "refund.processed",
  "refund.failed",
  "subscription.charged",
  "subscription.halted",
  "subscription.cancelled",
  "subscription.completed",
])

// ── Razorpay payload shapes (loose — only the fields we actually
//    read are typed; the rest is opaque `unknown`) ─────────────
interface RpPayment {
  id: string
  order_id?: string
  subscription_id?: string
  amount?: number
  currency?: string
  status?: string
  email?: string
  contact?: string
  notes?: Record<string, string>
}
interface RpSubscription {
  id: string
  plan_id?: string
  status?: string
  current_start?: number
  current_end?: number
  charge_at?: number
  notes?: Record<string, string>
}
interface RpRefund {
  id: string
  payment_id: string
  amount?: number
  currency?: string
  status?: string
  notes?: Record<string, string>
}
interface RpWebhookBody {
  event?: string
  payload?: {
    payment?: { entity?: RpPayment }
    subscription?: { entity?: RpSubscription }
    refund?: { entity?: RpRefund }
  }
  created_at?: number
}

// ── Minimal local types — match what the LMS / store blob holds.
//    Kept here (not imported) so the route stays buildable even if
//    the store-store interface drifts a bit; the field names are
//    the contract we rely on.                          ──
interface StoreOrder {
  id: string
  productId: string
  customerId: string
  customerEmail: string
  customerName: string
  subtotal: number
  discount: number
  total: number
  currency: string
  status: string
  paymentMethod: string
  paymentReference?: string
  affiliateRef?: string
  productSnapshot: unknown
  subscriptionId?: string
  createdAt: string
  paidAt?: string
}
interface StoreEntitlement {
  id: string
  customerId: string
  productId: string
  type: string
  reference?: string
  expiresAt?: string
  source: string
  grantedAt: string
  orderId?: string
}
interface StoreSubscription {
  id: string
  productId: string
  customerId: string
  orderId: string
  status: string
  currentPeriodStart: string
  currentPeriodEnd: string
  cancelAt?: string
  canceledAt?: string
  gatewaySubscriptionId?: string
}
interface StoreProduct {
  id: string
  kind: string
  pricing?: { type?: string; intervalDays?: number }
  delivery?: { kind?: string; courseId?: string }
}
interface LMSUser {
  id: string
  email: string
  name?: string
  notificationChannels?: { inApp?: boolean }
}
interface LMSNotification {
  id: string
  userId: string
  channel: string
  type: string
  title: string
  body: string
  url?: string
  createdAt: string
  status: string
  meta?: Record<string, unknown>
}

interface LoggedEvent {
  id: string
  event: string
  receivedAt: string
  payload: unknown
  handled: boolean
  note?: string
}

const EVENTS_LOG_KEY = "razorpay.events.v1"
const EVENTS_LOG_CAP = 500

// Tenant blob mutation: the webhook reads multiple keys per event
// handler and writes back the changed ones. The old file-based
// helpers truncated the whole tenant JSON on every save; with the
// DB-backed store we persist only the keys the handler actually
// mutated. Callers fetch the whole blob via loadPortalState() then
// call saveTenantKeys() with the subset they changed.
async function appendEventLog(entry: LoggedEvent): Promise<void> {
  const existing =
    (await loadPortalKey<LoggedEvent[]>(SYSTEM_SLUG, EVENTS_LOG_KEY)) ?? []
  if (existing.some((e) => e.id === entry.id)) return // dedupe
  const next = [entry, ...existing].slice(0, EVENTS_LOG_CAP)
  await upsertPortalKey(SYSTEM_SLUG, EVENTS_LOG_KEY, next)
}

async function loadBlob(slug: string): Promise<Record<string, unknown> | null> {
  const blob = await loadPortalState(slug)
  // Empty blob is the "no tenant" signal — callers used to get null
  // from ENOENT. Keep the same shape so dispatch logic doesn't branch
  // on undefined vs. null.
  return Object.keys(blob).length === 0 ? null : blob
}

// Save back ONLY the listed keys, atomically. Razorpay can deliver
// duplicate webhooks (5xx retry, network blip) and a busy tenant can
// have multiple `subscription.charged` events processed in parallel —
// using independent per-key writes (the prior `Promise.all` over
// `upsertPortalKey`) opened a race where two webhooks both read the
// same snapshot, both compute deltas, both write back, and the second
// write silently overwrites the first's changes (lost grants or
// orphaned entitlements).
//
// The bulk endpoint wraps the whole patch in a single Postgres
// transaction, so a concurrent webhook either sees the prior write's
// committed result (correct) or blocks briefly until the first
// commits (also correct). All keys land together or none do.
async function saveTenantKeys(
  slug: string,
  patch: Record<string, unknown>,
): Promise<void> {
  await upsertPortalKeys(slug, patch)
}

// Resolve which tenant owns this email. Try the indexed lookup
// first (O(1) — backend table maintained by the user-store mutations
// in lib/lms-store.tsx). If the index has no hit, fall back to the
// legacy O(N) walk so older users created before the index existed
// still resolve correctly.
//
// We sanity-check every indexed hit against the tenant's actual
// `lms.users.v1` blob before trusting it — stale index rows (left
// behind by a failed delete, or imported from a half-migrated tenant)
// would otherwise route a webhook to the wrong workspace. The cost
// of the verification is one extra blob read per match, vs N reads
// in the brute-force walk.
async function findTenantByEmail(email: string): Promise<string | null> {
  const lowered = email.toLowerCase()

  const indexed = await lookupTenantsByEmail(lowered)
  for (const match of indexed) {
    if (match.slug === SYSTEM_SLUG) continue
    const users =
      (await loadPortalKey<LMSUser[]>(match.slug, "lms.users.v1")) ?? []
    if (users.some((u) => u.email?.toLowerCase() === lowered)) {
      return match.slug
    }
  }

  // Fallback — legacy users predate the index, or the upsert failed
  // silently at signup time. Cap the walk so a buggy poller can't
  // burn the whole tenant list on every webhook.
  const slugs = await listSlugs()
  for (const slug of slugs) {
    if (slug === SYSTEM_SLUG) continue
    const users =
      (await loadPortalKey<LMSUser[]>(slug, "lms.users.v1")) ?? []
    if (users.some((u) => u.email?.toLowerCase() === lowered)) return slug
  }
  return null
}

function genId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`
}

function extractEntityId(body: RpWebhookBody): string | null {
  const slots: Array<RpPayment | RpSubscription | RpRefund | undefined> = [
    body.payload?.payment?.entity,
    body.payload?.subscription?.entity,
    body.payload?.refund?.entity,
  ]
  for (const e of slots) if (e?.id) return e.id
  return null
}

// Grant entitlements for a product into the tenant blob. Mirrors the
// minimum subset of grantEntitlementsForProduct() from store-store.tsx
// so the server doesn't have to import the React hook. Returns the
// new entitlement rows so the caller can push them into the array.
function entitlementsFor(
  product: StoreProduct,
  customerId: string,
  orderId: string,
  expiresAt?: string,
): StoreEntitlement[] {
  const now = new Date().toISOString()
  const make = (type: StoreEntitlement["type"], reference?: string): StoreEntitlement => ({
    id: genId("ent"),
    customerId,
    productId: product.id,
    type,
    reference,
    expiresAt,
    source: "purchase",
    grantedAt: now,
    orderId,
  })
  const out: StoreEntitlement[] = []
  switch (product.kind) {
    case "course":
      if (product.delivery?.courseId) out.push(make("course", product.delivery.courseId))
      break
    case "download":
      out.push(make("download", product.id))
      break
    case "session":
      out.push(make("session", product.id))
      break
    case "webinar":
      out.push(make("webinar", product.id))
      break
    case "license":
      out.push(make("license", product.id))
      break
    case "membership":
      out.push(make("membership", product.id))
      break
    case "bundle":
      // Bundles fan out client-side; the webhook is most often called
      // for non-bundle products (recurring subs / single course
      // orphans). Stamp a generic entitlement so the buyer at least
      // shows up in /library; the client will reconcile properly
      // next time the store hydrates.
      out.push(make("download", product.id))
      break
  }
  return out
}

function addDaysIso(iso: string, days: number): string {
  const d = new Date(iso)
  d.setDate(d.getDate() + days)
  return d.toISOString()
}

// ============================================================
// Reconcilers — one per event family
// ============================================================

/**
 * payment.captured — backup grant for orphan payments. Skips when an
 * Order with this paymentReference already exists. Useful for
 * second-device / closed-tab edge cases where the browser modal's
 * verify call never reached us.
 */
async function reconcilePaymentCaptured(
  slug: string,
  payment: RpPayment,
): Promise<{ handled: boolean; note: string }> {
  // Subscription payments go through a separate reconciler — this
  // one only handles one-time payments. Detect that via the
  // presence of subscription_id on the payment entity.
  if (payment.subscription_id) {
    return { handled: false, note: "Skipped — subscription payment handled by subscription.charged path." }
  }
  const blob = await loadBlob(slug)
  if (!blob) return { handled: false, note: `Tenant blob not found for slug=${slug}.` }
  const orders = (blob["store.orders.v1"] as StoreOrder[] | undefined) ?? []
  // Idempotency: the browser-modal verify path stamps each Order
  // with `paymentReference = razorpay_payment_id`. If we already
  // have one, no-op.
  if (orders.some((o) => o.paymentReference === payment.id)) {
    return { handled: true, note: "Idempotent skip — order already exists." }
  }
  const products = (blob["store.products.v1"] as StoreProduct[] | undefined) ?? []
  const users = (blob["lms.users.v1"] as LMSUser[] | undefined) ?? []
  const productId = payment.notes?.productId
  if (!productId) return { handled: false, note: "Payment notes lacks productId; cannot grant." }
  const product = products.find((p) => p.id === productId)
  if (!product) return { handled: false, note: `Product ${productId} not in tenant blob.` }
  const email = (payment.notes?.customerEmail ?? payment.email ?? "").toLowerCase()
  const user = email ? users.find((u) => u.email?.toLowerCase() === email) : undefined
  const customerId = user?.id ?? `cust-orphan-${payment.id}`

  const now = new Date().toISOString()
  const newOrder: StoreOrder = {
    id: `order-${genId("rzp")}`,
    productId,
    customerId,
    customerEmail: email,
    customerName: payment.notes?.customerName ?? user?.name ?? "",
    subtotal: (payment.amount ?? 0) / 100,
    discount: 0,
    total: (payment.amount ?? 0) / 100,
    currency: payment.currency ?? "INR",
    status: "paid",
    paymentMethod: "razorpay",
    paymentReference: payment.id,
    productSnapshot: { backfilled: true },
    createdAt: now,
    paidAt: now,
  }
  const entitlements = (blob["store.entitlements.v1"] as StoreEntitlement[] | undefined) ?? []
  const newEnts = entitlementsFor(product, customerId, newOrder.id)
  await saveTenantKeys(slug, {
    "store.orders.v1": [newOrder, ...orders],
    "store.entitlements.v1": [...newEnts, ...entitlements],
  })
  return { handled: true, note: `Backfilled order + ${newEnts.length} entitlement(s).` }
}

/**
 * subscription.charged — successful recurring charge. Bumps the
 * Subscription's currentPeriodEnd by one interval and any matching
 * membership Entitlement.expiresAt to the same date so the buyer's
 * access doesn't lapse at the old period end.
 */
async function reconcileSubscriptionCharged(
  slug: string,
  sub: RpSubscription,
): Promise<{ handled: boolean; note: string }> {
  const blob = await loadBlob(slug)
  if (!blob) return { handled: false, note: `Tenant blob not found for slug=${slug}.` }
  const subs = (blob["store.subscriptions.v1"] as StoreSubscription[] | undefined) ?? []
  // Match by gatewaySubscriptionId first; fall back to id equality
  // for legacy rows.
  const target =
    subs.find((s) => s.gatewaySubscriptionId === sub.id) ??
    subs.find((s) => s.id === sub.id)
  if (!target) return { handled: false, note: `Local Subscription not found for razorpay id=${sub.id}.` }
  const products = (blob["store.products.v1"] as StoreProduct[] | undefined) ?? []
  const product = products.find((p) => p.id === target.productId)
  // Razorpay sends current_end (unix seconds) when the event is a
  // charge — that's the new period end. If absent, fall back to
  // bumping by the product's interval.
  const newPeriodEnd = sub.current_end
    ? new Date(sub.current_end * 1000).toISOString()
    : product?.pricing?.intervalDays
      ? addDaysIso(target.currentPeriodEnd, product.pricing.intervalDays)
      : target.currentPeriodEnd
  const newPeriodStart = sub.current_start
    ? new Date(sub.current_start * 1000).toISOString()
    : target.currentPeriodEnd

  const nextSubs = subs.map((s) =>
    s.id === target.id
      ? {
          ...s,
          status: "active",
          currentPeriodStart: newPeriodStart,
          currentPeriodEnd: newPeriodEnd,
        }
      : s,
  )
  // Extend any membership entitlement tied to this subscription. We
  // match by productId + customerId (membership entitlements stamp
  // reference = productId).
  const entitlements = (blob["store.entitlements.v1"] as StoreEntitlement[] | undefined) ?? []
  const nextEnts = entitlements.map((e) => {
    if (
      e.customerId === target.customerId &&
      e.productId === target.productId &&
      e.type === "membership"
    ) {
      return { ...e, expiresAt: newPeriodEnd }
    }
    return e
  })
  await saveTenantKeys(slug, {
    "store.subscriptions.v1": nextSubs,
    "store.entitlements.v1": nextEnts,
  })
  return { handled: true, note: `Bumped period to ${newPeriodEnd}.` }
}

/**
 * refund.processed — Razorpay successfully refunded a payment.
 *
 * The dashboard-initiated refund path already flipped the Order locally
 * before this webhook ever fires, so the reconciler's primary job is
 * to catch refunds that originated OUTSIDE our UI (Razorpay dashboard,
 * partial refunds via API, etc.). Idempotent: if the Order is already
 * `refunded` we no-op.
 *
 * Matching logic: look up the Order by paymentReference. The refund
 * event carries `payment_id` directly, which the order stamps via the
 * verify flow.
 */
async function reconcileRefundProcessed(
  slug: string,
  refund: RpRefund,
): Promise<{ handled: boolean; note: string }> {
  const blob = await loadBlob(slug)
  if (!blob) return { handled: false, note: `Tenant blob not found for slug=${slug}.` }
  const orders = (blob["store.orders.v1"] as StoreOrder[] | undefined) ?? []
  const target = orders.find((o) => o.paymentReference === refund.payment_id)
  if (!target) {
    return {
      handled: false,
      note: `No order with paymentReference=${refund.payment_id} in tenant.`,
    }
  }
  if (target.status === "refunded") {
    return { handled: true, note: "Idempotent skip — order already refunded." }
  }
  const now = new Date().toISOString()
  const nextOrders = orders.map((o) =>
    o.id === target.id
      ? {
          ...o,
          status: "refunded",
          paidAt: o.paidAt,
          // Stamp the gateway refund id so the dashboard can show the
          // rfnd_ reference and ops can reconcile against Razorpay's
          // panel. Reason comes through notes when present (dashboard-
          // initiated refunds set notes.reason on the refund object).
          // Cast through `unknown` because the StoreOrder type doesn't
          // formally know about these fields yet — they were added on
          // the client-side type at the same time as the refundOrder
          // mutator, but the webhook's local type mirror hasn't been
          // extended. Either approach works; this keeps the route file
          // self-contained.
          refundedAt: now,
          ...(refund.notes?.reason ? { refundReason: refund.notes.reason } : {}),
          refundReference: refund.id,
        } as StoreOrder & {
          refundedAt?: string
          refundReason?: string
          refundReference?: string
        }
      : o,
  )
  // Revoke any entitlements granted by this order — same shape as the
  // client-side refundOrder mutator.
  const entitlements = (blob["store.entitlements.v1"] as StoreEntitlement[] | undefined) ?? []
  const nextEnts = entitlements.map((e) =>
    e.orderId === target.id
      ? {
          ...e,
          expiresAt: e.expiresAt && e.expiresAt < now ? e.expiresAt : now,
        }
      : e,
  )
  await saveTenantKeys(slug, {
    "store.orders.v1": nextOrders,
    "store.entitlements.v1": nextEnts,
  })
  return {
    handled: true,
    note: `Order ${target.id} refunded via ${refund.id}; entitlements revoked.`,
  }
}

/**
 * subscription.halted / subscription.cancelled — fire an in-app
 * notification so the buyer can update their card and resume. Also
 * marks the local Subscription so the UI reflects reality.
 */
async function reconcileSubscriptionTroubled(
  slug: string,
  sub: RpSubscription,
  event: string,
): Promise<{ handled: boolean; note: string }> {
  const blob = await loadBlob(slug)
  if (!blob) return { handled: false, note: `Tenant blob not found for slug=${slug}.` }
  const subs = (blob["store.subscriptions.v1"] as StoreSubscription[] | undefined) ?? []
  const target =
    subs.find((s) => s.gatewaySubscriptionId === sub.id) ??
    subs.find((s) => s.id === sub.id)
  if (!target) return { handled: false, note: `Local Subscription not found for razorpay id=${sub.id}.` }
  const newStatus =
    event === "subscription.halted"
      ? "past_due"
      : event === "subscription.cancelled" || event === "subscription.completed"
        ? "canceled"
        : target.status
  const nextSubs = subs.map((s) =>
    s.id === target.id
      ? {
          ...s,
          status: newStatus,
          canceledAt:
            newStatus === "canceled" ? new Date().toISOString() : s.canceledAt,
        }
      : s,
  )
  // Fire an in-app notification — channel-respecting (skip when the
  // buyer turned in-app off). Email/WhatsApp could ride along here
  // too via the existing dispatch helpers, but Phase 5 keeps this
  // surface narrow.
  const patch: Record<string, unknown> = {
    "store.subscriptions.v1": nextSubs,
  }
  if (event === "subscription.halted") {
    const users = (blob["lms.users.v1"] as LMSUser[] | undefined) ?? []
    const buyer = users.find((u) => u.id === target.customerId)
    if (buyer && buyer.notificationChannels?.inApp !== false) {
      const notifs =
        (blob["lms.notifications.v1"] as LMSNotification[] | undefined) ?? []
      const notif: LMSNotification = {
        id: genId("notif"),
        userId: buyer.id,
        channel: "in-app",
        type: "subscription.halted",
        title: "Your subscription is on hold",
        body: "We couldn't charge your card. Update payment details to keep your membership active.",
        url: `/p/${slug}/my/billing`,
        createdAt: new Date().toISOString(),
        status: "queued",
        meta: { subscriptionId: target.id, gatewayId: sub.id },
      }
      patch["lms.notifications.v1"] = [notif, ...notifs]
    }
  }
  await saveTenantKeys(slug, patch)
  return { handled: true, note: `Status flipped to ${newStatus}.` }
}

// ============================================================
// Route entry
// ============================================================

export async function POST(req: NextRequest) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET
  if (!secret) {
    return NextResponse.json(
      { ok: false, error: "Webhook secret not configured." },
      { status: 503 },
    )
  }

  const raw = await req.text()
  const signature = req.headers.get("x-razorpay-signature") ?? ""
  const expected = createHmac("sha256", secret).update(raw).digest("hex")
  const expectedBuf = Buffer.from(expected, "utf8")
  const givenBuf = Buffer.from(signature, "utf8")
  if (
    expectedBuf.length !== givenBuf.length ||
    !timingSafeEqual(expectedBuf, givenBuf)
  ) {
    return NextResponse.json({ ok: false, error: "Signature mismatch." }, { status: 401 })
  }

  let body: RpWebhookBody
  try {
    body = JSON.parse(raw) as RpWebhookBody
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 })
  }

  const event = body.event ?? "unknown"
  const id = extractEntityId(body) ?? genId("evt")

  // Resolve the tenant from notes first (cheap), otherwise the email
  // index + walk fallback. Refund events don't carry an email — for
  // those we try notes, then look up the order by paymentReference
  // across tenants.
  let slug: string | null = null
  let resolutionNote = ""
  const payment = body.payload?.payment?.entity
  const sub = body.payload?.subscription?.entity
  const refund = body.payload?.refund?.entity
  const notesTenant =
    payment?.notes?.tenant ??
    sub?.notes?.tenant ??
    refund?.notes?.tenant ??
    null
  if (notesTenant) {
    slug = notesTenant
  } else if (refund?.payment_id) {
    // Refund without a tenant note — find the tenant whose orders
    // contain a row with paymentReference matching this refund's
    // payment id. O(N tenants) but refunds are infrequent and we
    // bail on first match.
    const slugs = await listSlugs()
    for (const s of slugs) {
      if (s === SYSTEM_SLUG) continue
      const orders =
        (await loadPortalKey<StoreOrder[]>(s, "store.orders.v1")) ?? []
      if (orders.some((o) => o.paymentReference === refund.payment_id)) {
        slug = s
        resolutionNote = `Resolved tenant by paymentReference walk (${refund.payment_id}).`
        break
      }
    }
    if (!slug) {
      resolutionNote = `Could not resolve tenant for refund of payment ${refund.payment_id}.`
    }
  } else {
    const email = (payment?.notes?.customerEmail ?? payment?.email ?? sub?.notes?.customerEmail ?? "").toLowerCase()
    if (email) {
      slug = await findTenantByEmail(email)
      resolutionNote = slug
        ? `Resolved tenant by email lookup (${email}).`
        : `Could not resolve tenant by email (${email}).`
    }
  }

  let handled = false
  let note = ""
  if (KNOWN_EVENTS.has(event) && slug) {
    try {
      if (event === "payment.captured" && payment) {
        const r = await reconcilePaymentCaptured(slug, payment)
        handled = r.handled
        note = r.note
      } else if (event === "subscription.charged" && sub) {
        const r = await reconcileSubscriptionCharged(slug, sub)
        handled = r.handled
        note = r.note
      } else if (
        sub &&
        (event === "subscription.halted" ||
          event === "subscription.cancelled" ||
          event === "subscription.completed")
      ) {
        const r = await reconcileSubscriptionTroubled(slug, sub, event)
        handled = r.handled
        note = r.note
      } else if (event === "payment.failed") {
        // No state change — payment.failed without a captured prior
        // means the buyer never had access. Log only.
        handled = true
        note = "Payment failed — no state change needed."
      } else if (event === "refund.processed" && refund) {
        const r = await reconcileRefundProcessed(slug, refund)
        handled = r.handled
        note = r.note
      } else if (event === "refund.failed") {
        // Refund attempt didn't succeed at the gateway. The local
        // order may already be flipped to "refunded" optimistically
        // — that's fine, the gateway dashboard remains authoritative
        // for funds movement. We log and surface in the audit feed
        // so ops can investigate manually if it happens.
        handled = true
        note = "Refund failed at gateway — no automatic state change."
      } else {
        note = "Recognised event but no reconciler matched the payload shape."
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn(`[razorpay webhook] reconciler threw for ${event}:`, err)
      note = `Reconciler error: ${(err as Error).message}`
    }
  } else if (!slug) {
    note = resolutionNote || "No tenant resolved; event logged but not applied."
  } else {
    note = "Unknown event — captured for audit, no side effects."
  }

  await appendEventLog({
    id,
    event,
    receivedAt: new Date().toISOString(),
    payload: body,
    handled,
    note,
  })

  return NextResponse.json({ ok: true, event, id, handled, note })
}
