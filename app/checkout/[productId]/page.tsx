"use client"

import { use, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Lock,
  ShieldCheck,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import {
  baseAmountFor,
  formatPrice,
  money,
  useStore,
} from "@/lib/store-store"
import { useLMS } from "@/lib/lms-store"
import { Checkbox } from "@/components/ui/checkbox"
import { StorefrontHeader } from "@/components/store/storefront-header"
import { KindBadge } from "@/app/dashboard/store/page"
import { useTenant } from "@/lib/tenant-store"
import { useTenantBrand } from "@/lib/tenant-brand"
import {
  isRazorpayEnabled,
  openRazorpayCheckout,
  toMinorUnits,
  type RazorpayPaymentResponse,
} from "@/lib/payments/razorpay-client"

const GUEST_KEY = "thebigclass.checkout.guest.v1"

export default function CheckoutPage({ params }: { params: Promise<{ productId: string }> }) {
  const { productId } = use(params)
  const router = useRouter()
  const { getProductById, applyCoupon, checkout } = useStore()
  const { currentUser, getCourseById } = useLMS()
  // Store + library live inside the tenant portal only. Build a
  // tenant-prefixed href when we know which workspace the buyer
  // came from; fall back to the legacy /store + /library paths
  // (which are redirect stubs) otherwise.
  const { currentTenant } = useTenant()
  const brand = useTenantBrand()
  const tenantBase = currentTenant?.slug ? `/p/${currentTenant.slug}` : ""
  const storeHref = tenantBase ? `${tenantBase}/store` : "/store"
  const libraryHref = tenantBase ? `${tenantBase}/library` : "/library"
  // True when the server has Razorpay keys configured AND we aren't
  // forcing stub mode. When false, every checkout still works — it
  // just routes through the in-process stub (the original POC path).
  const useRazorpay = isRazorpayEnabled()

  const product = getProductById(productId)

  // Buyer info — pre-fill from signed-in user, otherwise prompt + persist
  // to localStorage so subsequent purchases skip the form.
  const initialBuyer = useMemo(() => {
    if (currentUser) return { name: currentUser.name, email: currentUser.email }
    if (typeof window === "undefined") return { name: "", email: "" }
    try {
      const raw = window.localStorage.getItem(GUEST_KEY)
      if (raw) return JSON.parse(raw) as { name: string; email: string }
    } catch { /* ignore */ }
    return { name: "", email: "" }
  }, [currentUser])
  const [name, setName] = useState(initialBuyer.name)
  const [email, setEmail] = useState(initialBuyer.email)

  // PWYW
  const pwywSuggested = product?.pricing.type === "pay-what-you-want" ? (product.pricing.suggestedAmount ?? product.pricing.minAmount) : 0
  const [pwywAmount, setPwywAmount] = useState<string>(pwywSuggested ? String(pwywSuggested) : "")

  // Coupon
  const [couponCode, setCouponCode] = useState("")
  const [couponMsg, setCouponMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [appliedDiscount, setAppliedDiscount] = useState(0)

  // Order bump — only meaningful when this product is course-access
  // AND the underlying Course has a bump product configured by the
  // monetize wizard. We resolve the bump Product up front so the
  // checkbox can show its title + price; the actual bump charge
  // happens only when the buyer ticks it.
  const bumpProduct = useMemo(() => {
    if (!product || product.delivery.kind !== "course-access") return null
    const course = getCourseById(product.delivery.courseId)
    const bumpId = course?.checkoutBumpProductId
    if (!bumpId) return null
    const bp = getProductById(bumpId)
    if (!bp || bp.status !== "published") return null
    // Bump must share the main product's currency and be a one-time
    // price — anything else would surprise the buyer or break the
    // store's bump-handling guard rails.
    if (bp.pricing.type !== "one-time") return null
    const baseCurrency = product.pricing.type !== "free" ? product.pricing.currency : "USD"
    if (bp.pricing.currency !== baseCurrency) return null
    return bp
  }, [product, getCourseById, getProductById])
  const [bumpChecked, setBumpChecked] = useState(false)
  const bumpAmount = bumpProduct && bumpProduct.pricing.type === "one-time"
    ? bumpProduct.pricing.amount
    : 0

  // Submitting
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!product || product.status !== "published") {
    return (
      <div className="min-h-screen bg-background">
        <StorefrontHeader />
        <main className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center px-4 text-center">
          <h1 className="text-xl font-bold">Product not available</h1>
          <Button asChild className="mt-4"><Link href={storeHref}>Back to store</Link></Button>
        </main>
      </div>
    )
  }

  const currency = product.pricing.type !== "free" ? product.pricing.currency : "USD"
  const baseSubtotal = baseAmountFor(product.pricing, pwywAmount ? parseFloat(pwywAmount) : undefined)
  const bumpAdd = bumpChecked ? bumpAmount : 0
  const subtotal = Math.round((baseSubtotal + bumpAdd) * 100) / 100
  const total = Math.max(0, Math.round((subtotal - appliedDiscount) * 100) / 100)

  const tryCoupon = () => {
    setCouponMsg(null)
    if (!couponCode.trim()) { setAppliedDiscount(0); return }
    const r = applyCoupon(couponCode.trim(), product.id, subtotal, currency)
    if (!r.ok) {
      setAppliedDiscount(0)
      setCouponMsg({ ok: false, text: r.reason })
      return
    }
    setAppliedDiscount(r.discount)
    setCouponMsg({ ok: true, text: `${r.coupon.code} applied — ${money(r.discount, currency)} off.` })
  }

  const canSubmit =
    !!name.trim() &&
    !!email.trim() && /^[^@]+@[^@]+\.[^@]+$/.test(email) &&
    (product.pricing.type !== "pay-what-you-want" || parseFloat(pwywAmount) >= (product.pricing.type === "pay-what-you-want" ? product.pricing.minAmount : 0))

  // Finalise the store-side order. Shared between the free / stub
  // path (no gateway involved) and the Razorpay path (where we've
  // already verified the signature server-side and just need to
  // persist the order with the real paymentReference).
  const finalisePurchase = (
    paymentReference?: string,
    gatewaySubscriptionId?: string,
  ): boolean => {
    const customerId = currentUser?.id ?? `cust-${hashId(email.toLowerCase())}`
    const result = checkout({
      productId: product.id,
      customerId,
      customerEmail: email.trim().toLowerCase(),
      customerName: name.trim(),
      couponCode: appliedDiscount > 0 ? couponCode.trim() : undefined,
      amountOverride: product.pricing.type === "pay-what-you-want" ? parseFloat(pwywAmount) : undefined,
      bumpProductIds: bumpChecked && bumpProduct ? [bumpProduct.id] : undefined,
      ...(paymentReference
        ? { paymentReference, paymentMethod: "razorpay" as const }
        : {}),
      ...(gatewaySubscriptionId ? { gatewaySubscriptionId } : {}),
    })
    if (!result.ok) {
      setError(result.error)
      setSubmitting(false)
      return false
    }
    // Land buyers on the "What's next" page first — they get the
    // course-start CTA + 1:1 / community offers right after paying.
    // Full receipt stays accessible from a button on that page.
    router.push(`/order/${result.order.id}/next`)
    return true
  }

  const handlePay = async () => {
    if (!canSubmit) return
    setSubmitting(true)
    setError(null)
    // Persist guest info for the next checkout.
    if (!currentUser) {
      try { window.localStorage.setItem(GUEST_KEY, JSON.stringify({ name, email })) } catch { /* ignore */ }
    }

    // Subscriptions ALWAYS need a card mandate, even when the
    // immediate amount is zero (free trial → recurring). Skipping
    // Razorpay here would grant access without a card on file, and
    // when the trial ends we'd have no way to charge — silent
    // freeloader bug.
    const isSubscription = product.pricing.type === "subscription"

    if (isSubscription && !useRazorpay) {
      // Stub mode + subscription = misconfiguration. Refuse rather
      // than fake-grant a trial that can never auto-bill. Surfaces
      // the missing-key problem early instead of after the trial
      // ends with confused customers.
      setError(
        "Subscriptions require a configured payment gateway to capture the card. Set RAZORPAY_KEY_ID + NEXT_PUBLIC_RAZORPAY_KEY_ID on the server and rebuild, then try again.",
      )
      setSubmitting(false)
      return
    }

    // Free / stub short-circuit applies ONLY to one-time and free
    // products — there's literally nothing to bill later for those,
    // so no card is needed.
    if (!isSubscription && (total === 0 || !useRazorpay)) {
      finalisePurchase()
      return
    }

    // Real Razorpay path. Subscription products take a different
    // route — Razorpay's Subscriptions API mints a subscription_id
    // that the modal authorises on the buyer's first charge.
    //   1. Server mints either a Razorpay order id (one-time) OR
    //      subscription id (recurring) for this purchase.
    //   2. Browser modal collects the payment / authorisation.
    //   3. Server verifies the HMAC signature.
    //   4. Finalise the store order with the verified payment id.
    try {
      let openInput: Parameters<typeof openRazorpayCheckout>[0]

      if (isSubscription && product.pricing.type === "subscription") {
        const subRes = await fetch("/api/payments/razorpay/subscriptions/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: product.pricing.amount,
            currency: product.pricing.currency,
            intervalDays: product.pricing.intervalDays,
            ...(product.pricing.trialDays
              ? { trialDays: product.pricing.trialDays }
              : {}),
            productId: product.id,
            customerEmail: email.trim().toLowerCase(),
            customerName: name.trim(),
            notes: {
              productTitle: product.title,
              ...(currentTenant?.slug ? { tenant: currentTenant.slug } : {}),
            },
          }),
        })
        const subJson = (await subRes.json().catch(() => null)) as
          | { ok: true; subscriptionId: string }
          | { ok: false; error: string }
          | null
        if (!subJson || !subJson.ok) {
          setError(subJson && "error" in subJson ? subJson.error : "Could not start subscription.")
          setSubmitting(false)
          return
        }
        openInput = {
          subscriptionId: subJson.subscriptionId,
          brandName: brand.name || "Checkout",
          description: product.title,
          prefill: { name: name.trim(), email: email.trim().toLowerCase() },
        }
      } else {
        const orderRes = await fetch("/api/payments/razorpay/order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: total,
            currency,
            productId: product.id,
            customerEmail: email.trim().toLowerCase(),
            customerName: name.trim(),
            notes: {
              productTitle: product.title,
              ...(currentTenant?.slug ? { tenant: currentTenant.slug } : {}),
            },
          }),
        })
        const orderJson = (await orderRes.json().catch(() => null)) as
          | { ok: true; order: { id: string; amount: number; currency: string }; keyId: string }
          | { ok: false; error: string }
          | null
        if (!orderJson || !orderJson.ok) {
          setError(orderJson && "error" in orderJson ? orderJson.error : "Could not start payment.")
          setSubmitting(false)
          return
        }
        openInput = {
          orderId: orderJson.order.id,
          amountInMinor: orderJson.order.amount || toMinorUnits(total),
          currency: orderJson.order.currency || currency,
          brandName: brand.name || "Checkout",
          description: product.title,
          prefill: { name: name.trim(), email: email.trim().toLowerCase() },
        }
      }

      let modalResponse: RazorpayPaymentResponse
      try {
        modalResponse = await openRazorpayCheckout(openInput)
      } catch (err) {
        // Razorpay modal dismissed or failed to load. Either way the
        // buyer hasn't paid; let them try again without surfacing a
        // scary error for the deliberate "close" case.
        if ((err as Error).message === "dismissed") {
          setSubmitting(false)
          return
        }
        setError((err as Error).message || "Payment was cancelled.")
        setSubmitting(false)
        return
      }

      const verifyRes = await fetch("/api/payments/razorpay/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(modalResponse),
      })
      const verifyJson = (await verifyRes.json().catch(() => null)) as
        | { ok: true; paymentId: string; subscriptionId: string | null; orderId: string | null; flow: "order" | "subscription" }
        | { ok: false; error: string }
        | null
      if (!verifyJson || !verifyJson.ok) {
        setError(
          verifyJson && "error" in verifyJson
            ? verifyJson.error
            : "Could not verify payment.",
        )
        setSubmitting(false)
        return
      }

      finalisePurchase(
        verifyJson.paymentId,
        verifyJson.subscriptionId ?? undefined,
      )
    } catch (err) {
      setError((err as Error).message || "Payment failed.")
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <StorefrontHeader />
      <main className="mx-auto max-w-4xl px-4 py-6 sm:py-10">
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          {/* Form */}
          <Card>
            <CardContent className="space-y-5 p-5 sm:p-6">
              <h1 className="text-xl font-bold">Checkout</h1>

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Your name *</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" />
                </div>
                <div className="space-y-1.5">
                  <Label>Email *</Label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value.toLowerCase())}
                    placeholder="you@example.com"
                  />
                  <p className="text-xs text-muted-foreground">
                    The receipt and access to your purchase go to this email.
                  </p>
                </div>
              </div>

              {product.pricing.type === "pay-what-you-want" && (
                <div className="space-y-1.5">
                  <Label>Your price ({currency})</Label>
                  <Input
                    type="number"
                    min={product.pricing.minAmount}
                    step="0.01"
                    value={pwywAmount}
                    onChange={(e) => setPwywAmount(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Minimum {money(product.pricing.minAmount, currency)}{product.pricing.suggestedAmount ? ` · suggested ${money(product.pricing.suggestedAmount, currency)}` : ""}.
                  </p>
                </div>
              )}

              <div className="space-y-1.5">
                <Label>Coupon code</Label>
                <div className="flex gap-2">
                  <Input
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    placeholder="e.g. LAUNCH25"
                    className="font-mono uppercase"
                  />
                  <Button variant="outline" type="button" onClick={tryCoupon} disabled={!couponCode.trim()}>
                    Apply
                  </Button>
                </div>
                {couponMsg && (
                  <p className={cn("text-xs", couponMsg.ok ? "text-success" : "text-destructive")}>
                    {couponMsg.text}
                  </p>
                )}
              </div>

              {/* Order bump — single-checkbox add-on. Instructor wires
                  this on by setting Course.checkoutBumpProductId via
                  the Monetize wizard. The bump amount folds into the
                  total + flows through to the Razorpay order. */}
              {bumpProduct && bumpProduct.pricing.type === "one-time" && (
                <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-3">
                  <label className="flex cursor-pointer items-start gap-3">
                    <Checkbox
                      checked={bumpChecked}
                      onCheckedChange={(v) => setBumpChecked(v === true)}
                      className="mt-0.5"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">
                        Add: {bumpProduct.title}{" "}
                        <span className="text-amber-700 dark:text-amber-300">
                          (+{money(bumpProduct.pricing.amount, bumpProduct.pricing.currency)})
                        </span>
                      </p>
                      {bumpProduct.subtitle && (
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {bumpProduct.subtitle}
                        </p>
                      )}
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        One-click add — included with your purchase, charged together.
                      </p>
                    </div>
                  </label>
                </div>
              )}

              {/* Trust badge — customer-facing trust signal. Production
                  visitors only see the polished message; the env-var
                  hint stays gated to the stub-mode (developer) path so
                  it never leaks into a real payment context. */}
              {useRazorpay ? (
                <div className="rounded-md border border-border/60 bg-muted/30 p-3 text-xs text-muted-foreground">
                  <div className="flex items-start gap-2">
                    <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                    <div className="space-y-1">
                      <p className="font-semibold text-foreground">
                        Securely processed by Razorpay
                      </p>
                      <p>
                        PCI-DSS certified · 256-bit TLS · we never see or store your card details. Pay with cards, UPI, netbanking, or wallets.
                      </p>
                      <p className="flex flex-wrap gap-x-3 gap-y-0.5 pt-0.5 text-[11px]">
                        <Link href="/privacy" className="underline-offset-2 hover:underline">Privacy</Link>
                        <Link href="/terms" className="underline-offset-2 hover:underline">Terms</Link>
                        <Link href="/refund-policy" className="underline-offset-2 hover:underline">Refund policy</Link>
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-md border border-dashed border-border/60 p-3 text-xs text-muted-foreground">
                  <ShieldCheck className="mr-1 inline h-3.5 w-3.5" />
                  Payment is currently <span className="font-semibold">in stub mode</span> — no charge will be made. Set <code className="rounded bg-muted px-1 font-mono">RAZORPAY_KEY_ID</code> + <code className="rounded bg-muted px-1 font-mono">NEXT_PUBLIC_RAZORPAY_KEY_ID</code> and unset <code className="rounded bg-muted px-1 font-mono">NEXT_PUBLIC_PAYMENTS_STUB</code> to enable real charges.
                </div>
              )}

              {error && (
                <div className="rounded-md border border-destructive/30 bg-destructive/5 p-2 text-xs text-destructive">
                  <AlertTriangle className="mr-1 inline h-3 w-3" /> {error}
                </div>
              )}

              <Button onClick={handlePay} disabled={!canSubmit || submitting} className="w-full" size="lg">
                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lock className="mr-2 h-4 w-4" />}
                Pay {total === 0 ? "(free)" : money(total, currency)}
              </Button>
            </CardContent>
          </Card>

          {/* Summary */}
          <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
            <Card>
              <CardContent className="space-y-3 p-5">
                <div className="flex items-start gap-3">
                  {product.coverImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={product.coverImageUrl} alt="" className="h-16 w-24 rounded object-cover" />
                  ) : (
                    <div className="h-16 w-24 rounded bg-muted" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 font-semibold">{product.title}</p>
                    <div className="mt-1 flex items-center gap-1.5">
                      <KindBadge kind={product.kind} />
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5 border-t border-border pt-3 text-sm">
                  <Row label={product.title}>{money(baseSubtotal, currency)}</Row>
                  {bumpChecked && bumpProduct && bumpProduct.pricing.type === "one-time" && (
                    <Row label={`+ ${bumpProduct.title}`}>
                      <span className="text-amber-700 dark:text-amber-300">
                        {money(bumpProduct.pricing.amount, bumpProduct.pricing.currency)}
                      </span>
                    </Row>
                  )}
                  <Row label="Subtotal">{money(subtotal, currency)}</Row>
                  {appliedDiscount > 0 && (
                    <Row label={`Coupon (${couponCode})`}><span className="text-success">−{money(appliedDiscount, currency)}</span></Row>
                  )}
                  <div className="flex items-center justify-between border-t border-border pt-2 text-base font-bold">
                    <span>Total</span>
                    <span className="tabular-nums">{money(total, currency)}</span>
                  </div>
                  {product.pricing.type === "subscription" && (
                    <p className="pt-1 text-[11px] text-muted-foreground">
                      Recurs {formatPrice(product.pricing)}.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            <p className="px-1 text-[11px] text-muted-foreground">
              <CheckCircle2 className="mr-1 inline h-3 w-3 text-success" />
              Your purchase appears in <Link href={libraryHref} className="underline">My library</Link> immediately.
            </p>
          </aside>
        </div>
      </main>
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="tabular-nums">{children}</span>
    </div>
  )
}

// Minimal stable hash (djb2). Good enough to derive a customerId from an
// email when no real auth exists — when auth is wired, replace with the real
// user id.
function hashId(s: string): string {
  let h = 5381
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h) ^ s.charCodeAt(i)
  return (h >>> 0).toString(36)
}

