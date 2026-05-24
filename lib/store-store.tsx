"use client"

// Digital storefront.
//
// One "Product" record covers everything a tenant can sell — course access,
// downloads, bundles, memberships, sessions, webinars, license keys. Pricing
// is a discriminated union so per-product types stay strict; an Order is the
// frozen receipt; an Entitlement is the denormalised "what this customer can
// access right now" row that the gating code on /library and /learn checks.
//
// Today this is a frontend-only store with localStorage persistence, scoped
// per tenant via the existing key namespacing. Payment is stubbed — every
// checkout immediately resolves to `paid` and emits an Entitlement so the
// full purchase → access flow works. Swap the `processPayment` stub for a
// real Stripe call (or Razorpay / Paddle) and nothing else needs to change.

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"
import { readCurrentTenantSlug } from "./tenant-store"
import { generateId } from "./lms-store"
import { formatMoney } from "./currency"
import { isQuotaError, reportStorageError } from "./storage-error"
import { fireWebhookEvent } from "./event-dispatcher"
import { pushToTrash, registerRestoreHandler } from "./trash"
import {
  ensureTenantBlobPulled,
  mirrorSliceToServer,
  persistTenantSlice,
} from "./tenant-state-sync"

// ============================================================
// Types
// ============================================================

export type ProductKind =
  | "course"        // grants access to an existing Course
  | "download"      // delivers one or more files
  | "bundle"        // composite of other products
  | "membership"    // subscription granting access to a set of products
  | "session"       // 1-on-1 booking (calendar link delivered on purchase)
  | "webinar"       // paid live event (joins via a meeting link)
  | "license"       // serial-key delivery for software / templates

export type PricingModel =
  | { type: "free" }
  | {
      type: "one-time"
      amount: number          // in major units (e.g. 49.99 USD)
      currency: string        // ISO-4217
      comparePrice?: number   // strike-through "was" price for marketing
    }
  | {
      type: "pay-what-you-want"
      minAmount: number
      suggestedAmount?: number
      currency: string
    }
  | {
      type: "subscription"
      amount: number
      currency: string
      intervalDays: 30 | 90 | 180 | 365  // monthly, quarterly, half-year, annual
      trialDays?: number
    }

export interface ProductFile {
  id: string
  filename: string
  url: string
  sizeBytes?: number
  mime?: string
}

export type ProductDelivery =
  | { kind: "course-access"; courseId: string }
  | { kind: "file-download"; files: ProductFile[] }
  | { kind: "bundle"; childProductIds: string[] }
  | { kind: "membership"; includedProductIds: string[] }
  | { kind: "session"; durationMinutes: number; bookingUrl?: string; instructorEmail?: string }
  | { kind: "webinar"; sessionId?: string; meetingUrl?: string; scheduledAt?: string }
  | { kind: "license"; keyPool?: string[]; keyTemplate?: string }

export interface ProductTestimonial {
  id: string
  author: string
  role?: string
  quote: string
  avatarUrl?: string
}
export interface ProductFaq {
  id: string
  question: string
  answer: string
}

export interface Product {
  id: string
  kind: ProductKind
  // Storefront identity
  title: string
  subtitle?: string
  slug: string                    // unique within tenant, used in /store/<slug>
  description: string             // markdown
  coverImageUrl?: string
  galleryUrls?: string[]
  previewVideoUrl?: string
  // Pricing + delivery
  pricing: PricingModel
  delivery: ProductDelivery
  // Marketing / sales-page polish
  features?: string[]             // bullet list (e.g. "8 hours of video")
  outcomes?: string[]             // "By the end you'll be able to…"
  faq?: ProductFaq[]
  testimonials?: ProductTestimonial[]
  // Discovery
  category?: string
  tags?: string[]
  // Lifecycle
  status: "draft" | "published" | "archived"
  publishedAt?: string
  // Inventory / scarcity
  inventoryLimit?: number          // optional cap on lifetime sales
  inventorySold: number
  // Compliance
  refundPolicy?: string            // free text — "14 days, no questions asked"
  // Affiliate / referral
  affiliateCommissionPercent?: number
  createdAt: string
  updatedAt: string
}

export interface StorefrontCoupon {
  id: string
  code: string                     // uppercased
  discount:
    | { type: "percent"; value: number }     // 10 → 10% off
    | { type: "fixed"; value: number; currency: string }
  appliesToProductIds?: string[]   // empty/undef = all products
  validFrom?: string
  validUntil?: string
  maxUses?: number
  uses: number
  oneTimePerCustomer: boolean
  createdAt: string
}

export type OrderStatus =
  | "pending"            // checkout initiated, not yet paid
  | "paid"               // payment succeeded, entitlement granted
  | "failed"             // payment failed
  | "refunded"           // money returned, entitlement revoked
  | "canceled"           // subscription canceled

export interface Order {
  id: string
  productId: string
  // Snapshot the product so a receipt is reproducible even after the product
  // changes / is archived. Tax law tends to require this.
  productSnapshot: {
    title: string
    kind: ProductKind
    delivery: ProductDelivery["kind"]
    pricingAtPurchase: PricingModel
  }
  customerId: string
  customerEmail: string
  customerName: string
  // Money
  subtotal: number                 // before discount
  discount: number                 // amount discounted
  total: number                    // what was charged
  currency: string
  couponCode?: string
  // Payment trail
  status: OrderStatus
  paymentMethod: "stripe" | "razorpay" | "manual" | "free"
  paymentReference?: string        // gateway id, e.g. razorpay_payment_id or Stripe charge_xxx
  // Subscription pointer
  subscriptionId?: string
  // Affiliate attribution
  affiliateRef?: string
  // Phase 2B — checkout order bumps that rode along on this order.
  // The receipt page renders these as additional line items under the
  // headline product; their entitlements are stamped to this orderId
  // alongside the main one.
  bumpLineItems?: Array<{
    productId: string
    title: string
    amount: number
  }>
  // Timestamps
  createdAt: string
  paidAt?: string
  refundedAt?: string
  // Test purchases — true when the order was placed via the
  // "Test purchase" admin affordance. Renders a "TEST" watermark
  // on receipts + skips webhook fan-out so test orders don't
  // pollute real CRM streams or revenue charts.
  testMode?: boolean
}

export type EntitlementType =
  | "course"
  | "download"
  | "session"
  | "webinar"
  | "license"
  | "membership"

export interface Entitlement {
  // The thing the customer can do/see RIGHT NOW. Denormalised from orders
  // so /library and gating code don't have to compute it on every render.
  id: string
  customerId: string
  productId: string                 // the product that granted this
  // For bundles + memberships we expand into individual entitlements per
  // contained item, so course gating only ever asks "do I have a course
  // entitlement for courseId X?".
  type: EntitlementType
  // Reference to the underlying asset, by type:
  //   course        → courseId
  //   download      → productId (we look up files via the product)
  //   session       → productId
  //   webinar       → sessionId
  //   license       → licenseKey string
  //   membership    → productId of the membership product
  reference?: string
  expiresAt?: string                // for subscriptions / time-bound access
  source: "purchase" | "gift" | "manual" | "trial"
  grantedAt: string
  orderId?: string
}

export interface Subscription {
  id: string
  productId: string
  customerId: string
  orderId: string
  status: "active" | "trialing" | "past_due" | "canceled"
  currentPeriodStart: string
  currentPeriodEnd: string
  cancelAt?: string
  canceledAt?: string
  /** Razorpay's subscription id (e.g. "sub_OABC...") — set when the
   *  buyer paid through the real gateway. Used by the webhook
   *  reconciler to match incoming subscription.charged events back
   *  to the right local Subscription. Absent on stub-mode subs. */
  gatewaySubscriptionId?: string
}

// ============================================================
// Storage (per-tenant, namespaced)
// ============================================================

function key(slug: string, name: string) {
  return `thebigclass.t.${slug}.${suffix(name)}`
}

// The suffix portion of the storage key — also used as the server
// blob's key so the per-tenant JSON file at /api/portal-state/<slug>
// round-trips cleanly. Suffixes are namespaced under "store." so they
// can't collide with lms.* or portal.* entries in the same blob.
function suffix(name: string): string {
  return `store.${name}.v1`
}

// When a product save blows past localStorage's ~5 MB origin quota,
// the culprit is almost always a base64 data: URL the user got back
// for a cover image or preview video (uploadAsset fell back when no
// backend was reachable). Strip those fields so the rest of the
// product — title, pricing, license keys, etc — still persists.
// Anything starting with `data:` is the bloat; short paths (e.g.
// `/uploads/foo.jpg`) are tiny and stay.
function stripHeavyDataUrls(p: Product): Product {
  const next = { ...p }
  if (next.coverImageUrl?.startsWith("data:")) next.coverImageUrl = undefined
  if (next.previewVideoUrl?.startsWith("data:")) next.previewVideoUrl = undefined
  return next
}

// ============================================================
// Public store API
// ============================================================

interface StoreState {
  products: Product[]
  coupons: StorefrontCoupon[]
  orders: Order[]
  entitlements: Entitlement[]
  subscriptions: Subscription[]
  // True once we've finished reading from localStorage. Editors must
  // gate on this before rendering form inputs whose initial useState
  // values are derived from products[] — otherwise a "not found yet"
  // first render captures empty strings and the next Save overwrites
  // the real product with blanks.
  hydrated: boolean

  // ---- Products ----
  addProduct: (p: Product) => void
  updateProduct: (id: string, patch: Partial<Product>) => void
  deleteProduct: (id: string) => void
  getProductById: (id: string) => Product | undefined
  getProductBySlug: (slug: string) => Product | undefined
  isSlugAvailable: (slug: string, excludeId?: string) => boolean

  // ---- Coupons ----
  addCoupon: (c: StorefrontCoupon) => void
  deleteCoupon: (id: string) => void
  applyCoupon: (code: string, productId: string, subtotal: number, currency: string) => { ok: true; discount: number; coupon: StorefrontCoupon } | { ok: false; reason: string }

  // ---- Checkout ----
  // Synchronously runs the (stubbed) payment + grants entitlements. Returns
  // the new Order so the UI can route to the receipt page.
  checkout: (input: CheckoutInput) => CheckoutResult

  // ---- Reads ----
  getOrdersForCustomer: (customerId: string) => Order[]
  getOrdersForProduct: (productId: string) => Order[]
  getEntitlementsForCustomer: (customerId: string) => Entitlement[]
  // Quick yes/no for content gating:
  hasCourseAccess: (customerId: string, courseId: string) => boolean
  hasProductAccess: (customerId: string, productId: string) => boolean

  // ---- Subscriptions ----
  // Flips the local Subscription to canceled. The real Razorpay
  // cancel call goes through a separate API route (Phase 5
  // server-side); this is the local-state half that drives the
  // "Manage membership" UI. The membership stays active until
  // `currentPeriodEnd` either way — the cancel only stops future
  // auto-renewals.
  cancelSubscription: (subscriptionId: string) => void
}

export interface CheckoutInput {
  productId: string
  customerId: string
  customerEmail: string
  customerName: string
  couponCode?: string
  // For pay-what-you-want, the buyer-chosen amount (major units).
  amountOverride?: number
  // For affiliate attribution.
  affiliateRef?: string
  // When the buyer just completed a real gateway flow (e.g. Razorpay
  // browser modal + server signature verify), the caller passes the
  // verified gateway payment id here. The store skips its in-process
  // stub, stamps the order with paymentMethod === "razorpay", and
  // uses this string as the paymentReference. Leave undefined to keep
  // the old stub behaviour (every charge auto-succeeds).
  paymentReference?: string
  paymentMethod?: "razorpay"
  // Razorpay subscription id paired with paymentReference when the
  // buyer authorised a recurring product through the real gateway.
  // Stamped into the resulting Subscription row so the webhook
  // reconciler can match charge events back to it later.
  gatewaySubscriptionId?: string
  // Phase 2B — checkout order bumps. Each id refers to an existing
  // Product in the storefront; the buyer ticked a "Add the resource
  // pack for ₹X" checkbox alongside the main product. Bumps add
  // their `one-time` price to the total, get their own entitlement
  // rows stamped to the same orderId, and surface on the receipt as
  // additional line items. Free / non-one-time bumps are silently
  // skipped — only deterministic-price products can ride along.
  bumpProductIds?: string[]
  // Test mode — when true, the checkout runs the full pipeline
  // (computes money, builds the order, mints entitlements) but
  // SKIPS the webhook fan-out so the teacher's CRM doesn't see a
  // fake "order.paid" event. The resulting Order is stamped with
  // testMode=true so receipts + invoices show a "TEST" watermark.
  // Used by the per-course "Test purchase" affordance — lets a
  // teacher dry-run their own checkout flow without polluting
  // real numbers.
  testMode?: boolean
}

export type CheckoutResult =
  | { ok: true; order: Order; entitlements: Entitlement[] }
  | { ok: false; error: string }

const StoreContext = createContext<StoreState | null>(null)

// ============================================================
// Provider
// ============================================================

export function StoreProvider({ children }: { children: ReactNode }) {
  const slug = typeof window !== "undefined" ? readCurrentTenantSlug() : "default"
  const PRODUCTS_KEY = key(slug, "products")
  const COUPONS_KEY = key(slug, "coupons")
  const ORDERS_KEY = key(slug, "orders")
  const ENTITLEMENTS_KEY = key(slug, "entitlements")
  const SUBSCRIPTIONS_KEY = key(slug, "subscriptions")

  const [products, setProducts] = useState<Product[]>([])
  const [coupons, setCoupons] = useState<StorefrontCoupon[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [entitlements, setEntitlements] = useState<Entitlement[]>([])
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [hydrated, setHydrated] = useState(false)
  const [serverHydrated, setServerHydrated] = useState(false)

  // Pull the cross-browser blob from the server. The helper dedupes
  // concurrent calls per slug, so the LMS provider and this store hit
  // the network once and share the result.
  useEffect(() => {
    let cancelled = false
    void ensureTenantBlobPulled(slug).then(() => {
      if (!cancelled) setServerHydrated(true)
    })
    return () => {
      cancelled = true
    }
  }, [slug])

  // Local hydrate (always runs). When the server pull resolves it
  // populates the same localStorage keys, so re-reading after
  // `serverHydrated` flips is what makes the incognito visitor see
  // the editing browser's products / orders / entitlements.
  useEffect(() => {
    try {
      const hydrate = <T,>(k: string, set: (v: T[]) => void) => {
        const raw = window.localStorage.getItem(k)
        if (!raw) return
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) set(parsed as T[])
      }
      hydrate<Product>(PRODUCTS_KEY, setProducts)
      hydrate<StorefrontCoupon>(COUPONS_KEY, setCoupons)
      hydrate<Order>(ORDERS_KEY, setOrders)
      hydrate<Entitlement>(ENTITLEMENTS_KEY, setEntitlements)
      hydrate<Subscription>(SUBSCRIPTIONS_KEY, setSubscriptions)
    } catch { /* ignore */ }
    setHydrated(true)
  }, [PRODUCTS_KEY, COUPONS_KEY, ORDERS_KEY, ENTITLEMENTS_KEY, SUBSCRIPTIONS_KEY, serverHydrated])

  // Persisters. Replaced the bare `catch {}` swallow with
  // reportStorageError so a quota overflow (typically a base64 cover
  // image / video pushing the products blob past the 5 MB origin
  // cap) surfaces in the dashboard's storage-error bus instead of
  // silently dropping the save.
  useEffect(() => {
    if (!hydrated) return
    persistTenantSlice(slug, suffix("products"), products, (err) =>
      reportStorageError("store.products", err),
    )
  }, [products, hydrated, slug])
  useEffect(() => {
    if (!hydrated) return
    persistTenantSlice(slug, suffix("coupons"), coupons)
  }, [coupons, hydrated, slug])
  useEffect(() => {
    if (!hydrated) return
    persistTenantSlice(slug, suffix("orders"), orders, (err) =>
      reportStorageError("store.orders", err),
    )
  }, [orders, hydrated, slug])
  useEffect(() => {
    if (!hydrated) return
    persistTenantSlice(slug, suffix("entitlements"), entitlements)
  }, [entitlements, hydrated, slug])
  useEffect(() => {
    if (!hydrated) return
    persistTenantSlice(slug, suffix("subscriptions"), subscriptions)
  }, [subscriptions, hydrated, slug])

  // -------- Actions --------
  //
  // The three product mutators each compute the next array and write to
  // localStorage SYNCHRONOUSLY inside the setState updater. Belt-and-
  // suspenders against any timing race in the post-commit persist
  // effect — without this, "Save" would say "Saved" the moment React
  // batched the setState, but if anything caused the effect not to run
  // (unmount, re-render storm, key change, etc) the actual write would
  // never happen. Now the write happens in the same microtask as the
  // state update; the effect below is now a redundant safety net.
  //
  // Returns the products array that was ACTUALLY written. When the
  // unmodified payload exceeds the localStorage quota, we retry once
  // with data: URLs stripped out (they're typically a 50+ MB cover
  // image / preview video that the user uploaded without a backend to
  // host them). The metadata still saves so the teacher doesn't lose
  // hours of work; we surface a recovered=true warning so they know
  // the image will need to be re-uploaded smaller next time.
  const writeProducts = (next: Product[]): Product[] => {
    // Server mirror is always the unstripped payload — the server
    // doesn't share the 5 MB localStorage budget, so cross-browser
    // visitors get the full product list even when the local quota
    // forces us to drop data: URL covers from the cache.
    mirrorSliceToServer(slug, suffix("products"), next)
    try {
      window.localStorage.setItem(PRODUCTS_KEY, JSON.stringify(next))
      return next
    } catch (err) {
      if (isQuotaError(err)) {
        const stripped = next.map(stripHeavyDataUrls)
        try {
          window.localStorage.setItem(PRODUCTS_KEY, JSON.stringify(stripped))
          reportStorageError("store.products", err, { recovered: true })
          return stripped
        } catch (err2) {
          reportStorageError("store.products", err2)
          return next
        }
      }
      reportStorageError("store.products", err)
      return next
    }
  }
  const addProduct = useCallback((p: Product) => setProducts(prev => {
    const next = [...prev, p]
    return writeProducts(next)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [PRODUCTS_KEY])
  const updateProduct = useCallback((id: string, patch: Partial<Product>) => {
    setProducts(prev => {
      const next = prev.map(p => p.id === id ? { ...p, ...patch, updatedAt: new Date().toISOString() } : p)
      return writeProducts(next)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [PRODUCTS_KEY])
  const deleteProduct = useCallback((id: string) => setProducts(prev => {
    const target = prev.find(p => p.id === id)
    if (target) {
      pushToTrash({
        id: target.id,
        kind: "product",
        label: target.title || "Product",
        sublabel: target.kind,
        payload: target,
      })
    }
    const next = prev.filter(p => p.id !== id)
    return writeProducts(next)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [PRODUCTS_KEY])
  const getProductById = useCallback((id: string) => products.find(p => p.id === id), [products])
  const getProductBySlug = useCallback((s: string) => products.find(p => p.slug === s), [products])
  const isSlugAvailable = useCallback(
    (s: string, excludeId?: string) => !products.some(p => p.slug === s && p.id !== excludeId),
    [products],
  )

  const addCoupon = useCallback((c: StorefrontCoupon) => setCoupons(prev => [...prev, c]), [])
  const deleteCoupon = useCallback((id: string) => setCoupons(prev => prev.filter(c => c.id !== id)), [])

  const applyCoupon = useCallback(
    (code: string, productId: string, subtotal: number, currency: string) => {
      const c = coupons.find(c => c.code.toUpperCase() === code.toUpperCase())
      if (!c) return { ok: false as const, reason: "Coupon not found." }
      const now = Date.now()
      if (c.validFrom && new Date(c.validFrom).getTime() > now)
        return { ok: false as const, reason: "Coupon not yet active." }
      if (c.validUntil && new Date(c.validUntil).getTime() < now)
        return { ok: false as const, reason: "Coupon has expired." }
      if (c.maxUses !== undefined && c.uses >= c.maxUses)
        return { ok: false as const, reason: "Coupon usage limit reached." }
      if (c.appliesToProductIds && c.appliesToProductIds.length > 0 && !c.appliesToProductIds.includes(productId))
        return { ok: false as const, reason: "Coupon doesn't apply to this product." }
      if (c.discount.type === "fixed" && c.discount.currency !== currency)
        return { ok: false as const, reason: "Coupon currency mismatch." }

      const discount = c.discount.type === "percent"
        ? Math.round(subtotal * (c.discount.value / 100) * 100) / 100
        : Math.min(c.discount.value, subtotal)
      return { ok: true as const, discount, coupon: c }
    },
    [coupons],
  )

  // -------- Checkout --------

  const grantEntitlementsForProduct = useCallback(
    (product: Product, customerId: string, orderId: string): Entitlement[] => {
      const now = new Date().toISOString()
      const out: Entitlement[] = []
      const make = (type: EntitlementType, reference: string | undefined, expiresAt?: string): Entitlement => ({
        id: generateId("ent"),
        customerId,
        productId: product.id,
        type,
        reference,
        expiresAt,
        source: "purchase",
        grantedAt: now,
        orderId,
      })

      switch (product.delivery.kind) {
        case "course-access":
          out.push(make("course", product.delivery.courseId))
          break
        case "file-download":
          out.push(make("download", product.id))
          break
        case "session":
          out.push(make("session", product.id))
          break
        case "webinar":
          out.push(make("webinar", product.delivery.sessionId ?? product.id))
          break
        case "license": {
          // Pull the next free key off the pool if there is one; otherwise
          // generate from the template (TBC-XXXX-XXXX-XXXX style).
          const pool = product.delivery.keyPool ?? []
          let licenseKey: string | undefined = undefined
          if (pool.length > 0) {
            licenseKey = pool[0]
            // burn the used key from the pool
            const remaining = pool.slice(1)
            updateProduct(product.id, {
              delivery: { ...product.delivery, keyPool: remaining },
            })
          } else {
            const tmpl = product.delivery.keyTemplate ?? "TBC-XXXX-XXXX-XXXX"
            licenseKey = tmpl.replace(/X/g, () =>
              "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[Math.floor(Math.random() * 32)],
            )
          }
          out.push(make("license", licenseKey))
          break
        }
        case "bundle": {
          // Recurse into child products.
          const children = product.delivery.childProductIds
            .map(id => products.find(p => p.id === id))
            .filter((p): p is Product => !!p)
          for (const child of children) {
            out.push(...grantEntitlementsForProduct(child, customerId, orderId))
          }
          out.push(make("membership", product.id))  // also mark the bundle itself owned
          break
        }
        case "membership": {
          // For now, membership entitles to every included product as
          // separate entitlements. Real subscription mgmt revokes these
          // when the sub lapses.
          out.push(make("membership", product.id, addDays(now, intervalDaysFor(product.pricing))))
          for (const includedId of product.delivery.includedProductIds) {
            const included = products.find(p => p.id === includedId)
            if (!included) continue
            // Recursive grant so a membership of a bundle still works.
            const subEnts = grantEntitlementsForProduct(included, customerId, orderId)
            // Inherit the membership expiry so access lapses together.
            for (const e of subEnts) e.expiresAt = addDays(now, intervalDaysFor(product.pricing))
            out.push(...subEnts)
          }
          break
        }
      }
      return out
    },
    [products, updateProduct],
  )

  const checkout = useCallback((input: CheckoutInput): CheckoutResult => {
    const product = products.find(p => p.id === input.productId)
    if (!product) return { ok: false, error: "Product not found." }
    if (product.status !== "published") return { ok: false, error: "This product isn't available." }
    if (product.inventoryLimit !== undefined && product.inventorySold >= product.inventoryLimit) {
      return { ok: false, error: "Sold out." }
    }

    // --- compute money ---
    const currency = currencyFor(product.pricing)
    let subtotal = baseAmountFor(product.pricing, input.amountOverride)
    if (subtotal < 0) subtotal = 0

    let discount = 0
    let appliedCoupon: StorefrontCoupon | undefined
    if (input.couponCode) {
      const r = applyCoupon(input.couponCode, product.id, subtotal, currency)
      if (!r.ok) return { ok: false, error: r.reason }
      discount = r.discount
      appliedCoupon = r.coupon
    }

    // ── Resolve bump line items (Phase 2B) ──────────────────
    // Each bump is a `one-time` priced storefront Product the buyer
    // ticked on the checkout page. We pick them up here so the price
    // stays canonical (we don't trust a client-side amount) and they
    // share a currency with the main product. Anything that doesn't
    // fit those rules is silently dropped — the entitlement grant
    // below would still work without it, so we'd rather miss a row
    // than poison the Order shape.
    const bumpLineItems: NonNullable<Order["bumpLineItems"]> = []
    const bumpProducts: Product[] = []
    if (input.bumpProductIds && input.bumpProductIds.length > 0) {
      for (const bid of input.bumpProductIds) {
        const bp = products.find((p) => p.id === bid)
        if (!bp || bp.status !== "published") continue
        if (bp.pricing.type !== "one-time") continue
        if (bp.pricing.currency !== currency) continue
        bumpLineItems.push({
          productId: bp.id,
          title: bp.title,
          amount: bp.pricing.amount,
        })
        bumpProducts.push(bp)
      }
    }
    const bumpsSum = bumpLineItems.reduce((acc, b) => acc + b.amount, 0)
    subtotal = Math.round((subtotal + bumpsSum) * 100) / 100

    const total = Math.max(0, Math.round((subtotal - discount) * 100) / 100)

    // --- "pay" ---
    // When the caller already ran a real gateway (e.g. Razorpay
    // browser modal → server-side signature verify), they pass the
    // verified gateway payment id in via `input.paymentReference`.
    // We skip the in-process stub in that case and stamp the order
    // with the real gateway info. Free orders also skip the stub
    // (nothing to charge). Everything else still routes through
    // processPaymentStub for dev convenience until the real client
    // is wired up.
    const usingRealGateway = !!input.paymentReference
    const isTest = input.testMode === true
    let paymentReference: string
    let paymentMethod: Order["paymentMethod"]
    if (isTest) {
      // Test purchase — synthetic reference stamped TEST so the
      // origin is obvious in every downstream surface (receipt,
      // invoices list, Razorpay reconciler). No real money path.
      paymentReference = `TEST-${Date.now().toString(36)}`
      paymentMethod = "manual"
    } else if (total === 0) {
      paymentReference = `free_${Date.now().toString(36)}`
      paymentMethod = "free"
    } else if (usingRealGateway) {
      paymentReference = input.paymentReference!
      paymentMethod = input.paymentMethod ?? "razorpay"
    } else {
      const paymentResult = processPaymentStub({ total, currency })
      if (!paymentResult.ok) return { ok: false, error: paymentResult.error }
      paymentReference = paymentResult.reference
      paymentMethod = "stripe"  // legacy stub label preserved for old orders
    }

    const now = new Date().toISOString()
    const orderId = generateId("order")
    const order: Order = {
      id: orderId,
      productId: product.id,
      productSnapshot: {
        title: product.title,
        kind: product.kind,
        delivery: product.delivery.kind,
        pricingAtPurchase: product.pricing,
      },
      customerId: input.customerId,
      customerEmail: input.customerEmail,
      customerName: input.customerName,
      subtotal,
      discount,
      total,
      currency,
      couponCode: appliedCoupon?.code,
      status: "paid",
      paymentMethod,
      paymentReference,
      affiliateRef: input.affiliateRef,
      bumpLineItems: bumpLineItems.length > 0 ? bumpLineItems : undefined,
      createdAt: now,
      paidAt: now,
      testMode: isTest || undefined,
    }

    // Subscription bookkeeping
    let sub: Subscription | undefined
    if (product.pricing.type === "subscription") {
      const periodEnd = addDays(now, product.pricing.intervalDays)
      sub = {
        id: generateId("sub"),
        productId: product.id,
        customerId: input.customerId,
        orderId,
        status: product.pricing.trialDays ? "trialing" : "active",
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        gatewaySubscriptionId: input.gatewaySubscriptionId,
      }
      order.subscriptionId = sub.id
    }

    // Entitlements — main product first, then any bump line items.
    // Bumps stamp to the same orderId so the receipt + the analytics
    // can group them; their entitlement types follow the bump
    // product's own delivery shape (downloads → file-download, etc.).
    const ents = grantEntitlementsForProduct(product, input.customerId, orderId)
    for (const bp of bumpProducts) {
      ents.push(...grantEntitlementsForProduct(bp, input.customerId, orderId))
    }

    // Cross-store hook (Phase 3C — Gap 11). Emit a DOM event for each
    // course entitlement granted so the LMS store can auto-add the
    // buyer to that course's default batch (when set). Two separate
    // providers can't directly call each other's mutations, so we
    // route through window dispatch — same pattern the trash module
    // uses. Listeners are best-effort: an unmounted store just
    // ignores the event. The next-step page still attempts the join
    // when the user lands there as a belt-and-braces fallback.
    if (typeof window !== "undefined") {
      for (const e of ents) {
        if (e.type === "course" && e.reference) {
          window.dispatchEvent(
            new CustomEvent("entitlement.course-granted", {
              detail: { customerId: input.customerId, courseId: e.reference },
            }),
          )
        }
      }
    }

    // Commit all state in one go.
    setOrders(prev => [order, ...prev])
    if (sub) setSubscriptions(prev => [sub!, ...prev])
    setEntitlements(prev => [...ents, ...prev])
    if (appliedCoupon) {
      setCoupons(prev => prev.map(c => c.id === appliedCoupon!.id ? { ...c, uses: c.uses + 1 } : c))
    }
    updateProduct(product.id, { inventorySold: product.inventorySold + 1 })

    // Fire webhooks (no-op when not signed into the backend). Each
    // entitlement granted maps 1:1 to an enrollment.created event so
    // CRM / fulfilment hooks can react to course access independently
    // of the order itself.
    //
    // Test orders skip the entire fan-out: webhooks are downstream-
    // facing (CRM, fulfilment, analytics) and a teacher running a
    // dry-run should not see fake conversions appear in real
    // dashboards. The order + entitlements ARE persisted so the
    // teacher can walk the post-purchase flow end-to-end.
    if (!isTest) {
      fireWebhookEvent("order.paid", {
        id: order.id,
        productId: order.productId,
        customerEmail: order.customerEmail,
        total: order.total,
        currency: order.currency,
        paymentReference: order.paymentReference,
      })
      for (const e of ents) {
        fireWebhookEvent("enrollment.created", {
          id: e.id,
          type: e.type,
          reference: e.reference,
          customerId: e.customerId,
          orderId,
        })
      }
    }

    return { ok: true, order, entitlements: ents }
  }, [products, applyCoupon, grantEntitlementsForProduct, updateProduct])

  // -------- Reads --------

  const getOrdersForCustomer = useCallback(
    (customerId: string) => orders.filter(o => o.customerId === customerId),
    [orders],
  )
  const getOrdersForProduct = useCallback(
    (productId: string) => orders.filter(o => o.productId === productId),
    [orders],
  )
  const getEntitlementsForCustomer = useCallback(
    (customerId: string) => entitlements.filter(e =>
      e.customerId === customerId &&
      (!e.expiresAt || new Date(e.expiresAt).getTime() > Date.now()),
    ),
    [entitlements],
  )
  const hasCourseAccess = useCallback(
    (customerId: string, courseId: string) =>
      entitlements.some(e =>
        e.customerId === customerId &&
        e.type === "course" &&
        e.reference === courseId &&
        (!e.expiresAt || new Date(e.expiresAt).getTime() > Date.now()),
      ),
    [entitlements],
  )
  const hasProductAccess = useCallback(
    (customerId: string, productId: string) =>
      entitlements.some(e =>
        e.customerId === customerId &&
        e.productId === productId &&
        (!e.expiresAt || new Date(e.expiresAt).getTime() > Date.now()),
      ),
    [entitlements],
  )

  const cancelSubscription = useCallback((subscriptionId: string) => {
    setSubscriptions((prev) =>
      prev.map((s) =>
        s.id === subscriptionId
          ? { ...s, status: "canceled", canceledAt: new Date().toISOString() }
          : s,
      ),
    )
  }, [])

  const value: StoreState = useMemo(() => ({
    products, coupons, orders, entitlements, subscriptions, hydrated,
    addProduct, updateProduct, deleteProduct, getProductById, getProductBySlug, isSlugAvailable,
    addCoupon, deleteCoupon, applyCoupon,
    checkout,
    getOrdersForCustomer, getOrdersForProduct, getEntitlementsForCustomer, hasCourseAccess, hasProductAccess,
    cancelSubscription,
  }), [
    products, coupons, orders, entitlements, subscriptions, hydrated,
    addProduct, updateProduct, deleteProduct, getProductById, getProductBySlug, isSlugAvailable,
    addCoupon, deleteCoupon, applyCoupon, checkout,
    getOrdersForCustomer, getOrdersForProduct, getEntitlementsForCustomer, hasCourseAccess, hasProductAccess,
    cancelSubscription,
  ])

  // Trash restore handler — re-inserts a soft-deleted product.
  useEffect(() => {
    return registerRestoreHandler(["product"], (entry) => {
      const p = entry.payload as Product
      setProducts(prev => prev.some(x => x.id === p.id) ? prev : writeProducts([...prev, p]))
      return true
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [PRODUCTS_KEY])

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore(): StoreState {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error("useStore must be used inside <StoreProvider>")
  return ctx
}

// ============================================================
// Helpers
// ============================================================

export function currencyFor(p: PricingModel): string {
  if (p.type === "free") return "USD"
  return p.currency
}
export function baseAmountFor(p: PricingModel, override?: number): number {
  switch (p.type) {
    case "free": return 0
    case "one-time": return p.amount
    case "subscription": return p.amount
    case "pay-what-you-want": return Math.max(p.minAmount, override ?? p.suggestedAmount ?? p.minAmount)
  }
}
export function intervalDaysFor(p: PricingModel): number {
  if (p.type === "subscription") return p.intervalDays
  return 365 * 100  // effectively "forever" for one-time / free
}
export function isFree(p: PricingModel): boolean {
  return p.type === "free" || (p.type === "one-time" && p.amount === 0)
}
export function formatPrice(p: PricingModel): string {
  if (p.type === "free") return "Free"
  if (p.type === "pay-what-you-want") return `From ${money(p.minAmount, p.currency)} · pay what you want`
  if (p.type === "subscription") {
    const each =
      p.intervalDays === 30 ? "/ month" :
      p.intervalDays === 90 ? "/ quarter" :
      p.intervalDays === 180 ? "/ 6 months" :
      "/ year"
    return `${money(p.amount, p.currency)} ${each}`
  }
  return money(p.amount, p.currency)
}
// Delegated to lib/currency.ts so course/store/checkout/dashboard all share
// the same formatter. Kept as `money` for backward compatibility with the
// store layer; new code should import `formatMoney` directly.
export function money(amount: number, currency: string): string {
  return formatMoney(amount, currency)
}

function addDays(iso: string, days: number): string {
  const d = new Date(iso)
  d.setDate(d.getDate() + days)
  return d.toISOString()
}

// ---- Payment stub ----
// Returns "ok" for everything. The single seam to replace with a real
// gateway. Keep the return shape: a reference string lets you store the
// gateway's id on the Order without changing anything else.
function processPaymentStub(input: { total: number; currency: string }):
  | { ok: true; reference: string }
  | { ok: false; error: string } {
  void input  // unused in stub
  return { ok: true, reference: `stub_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}` }
}
