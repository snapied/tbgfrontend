"use client"

// Secure checkout page — order-first, enrollment-after-payment.
//
// Flow:
//   1. Validate session tenant matches page tenant
//   2. Show course + price + optional coupon field
//   3. On "Confirm Purchase" → POST /checkout/initiate
//   4. If net=0 → enrolled immediately, redirect
//   5. If net>0 → open Razorpay checkout → poll /checkout/status
//   6. On paid → redirect to course dashboard

import { use, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { BackButton } from "@/components/ui/back-button"
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Loader2,
  ShieldCheck,
  Tag,
  XCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useLMS, type Course } from "@/lib/lms-store"
import { useTenant } from "@/lib/tenant-store"
import { TenantSwitchModal } from "@/components/checkout/tenant-switch-modal"
import { ACCESS_TOKEN_KEY } from "@/lib/billing-client"
import {
  validateCoupon,
  initiateCheckout,
  waitForPayment,
  type CouponValidation,
} from "@/lib/checkout-client"
import { toast } from "sonner"
// cn unused — removed to keep imports clean

function formatINR(n: number): string {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 0 }).format(n)
}

type Phase =
  | { kind: "checkout" }
  | { kind: "processing" }
  | { kind: "verifying"; orderId: number; attempt: number }
  | { kind: "success"; courseId: string }
  | { kind: "failed"; message: string }
  | { kind: "timeout"; orderId: number }

export default function CheckoutPage({
  params,
}: {
  params: Promise<{ tenant: string; courseSlug: string }>
}) {
  const { tenant: tenantSlug, courseSlug } = use(params)
  const router = useRouter()
  const { courses, currentUser } = useLMS()
  const { currentTenant } = useTenant()

  // Find the course
  const course = useMemo(
    () => courses.find((c) => c.slug === courseSlug),
    [courses, courseSlug],
  )

  // Tenant mismatch detection
  const [tenantSwitchOpen, setTenantSwitchOpen] = useState(false)
  const sessionTenantSlug = currentTenant?.slug
  const isTenantMismatch = currentUser && sessionTenantSlug && sessionTenantSlug !== tenantSlug

  // Coupon state
  const [couponCode, setCouponCode] = useState("")
  const [couponResult, setCouponResult] = useState<CouponValidation | null>(null)
  const [couponLoading, setCouponLoading] = useState(false)

  // Checkout state
  const [phase, setPhase] = useState<Phase>({ kind: "checkout" })

  const coursePrice = course?.price ?? 0
  const finalPrice = couponResult?.valid ? (couponResult.final_price ?? coursePrice) : coursePrice
  const discountAmount = couponResult?.valid ? (couponResult.discount_amount ?? 0) : 0

  // ── Coupon handlers ──────────────────────────────────────────

  async function handleApplyCoupon() {
    if (!couponCode.trim() || !course) return
    setCouponLoading(true)
    try {
      const result = await validateCoupon(course.id, couponCode.trim(), coursePrice)
      setCouponResult(result)
      if (result.valid) {
        toast.success(`Coupon applied! You save ${formatINR(result.discount_amount ?? 0)}`)
      } else {
        toast.error(result.error ?? "Invalid coupon")
      }
    } catch {
      toast.error("Failed to validate coupon")
    } finally {
      setCouponLoading(false)
    }
  }

  function handleRemoveCoupon() {
    setCouponCode("")
    setCouponResult(null)
  }

  // ── Checkout handler ─────────────────────────────────────────

  async function handleConfirmPurchase() {
    if (!course || !currentUser) return

    // Tenant mismatch check
    if (isTenantMismatch) {
      setTenantSwitchOpen(true)
      return
    }

    setPhase({ kind: "processing" })

    try {
      // Stable key: same user + same course = same order. Prevents
      // duplicate orders from double-clicks or retries.
      const idempotencyKey = `checkout_${currentUser.id}_${course.id}`

      const result = await initiateCheckout({
        course_id: course.id,
        course_price: coursePrice,
        coupon_code: couponResult?.valid ? couponCode.trim() : undefined,
        idempotency_key: idempotencyKey,
      })

      // Already paid or free enrollment
      if (result.status === "paid" || result.already_paid) {
        setPhase({ kind: "success", courseId: course.id })
        toast.success("Enrolled successfully!")
        return
      }

      // Razorpay payment path
      if (result.razorpay_order_id && result.razorpay_key) {
        openRazorpayCheckout(result, course)
      } else {
        setPhase({ kind: "failed", message: "Unable to create payment order" })
      }
    } catch (err) {
      setPhase({ kind: "failed", message: err instanceof Error ? err.message : "Checkout failed" })
    }
  }

  function openRazorpayCheckout(
    result: { order_id: number; razorpay_order_id?: string; razorpay_key?: string; amount_paise?: number; prefill?: { name?: string; email?: string; contact?: string } },
    course: Course,
  ) {
    // Load Razorpay script if not already loaded
    const RZP_SRC = "https://checkout.razorpay.com/v1/checkout.js"
    const existingScript = document.querySelector(`script[src="${RZP_SRC}"]`)

    function launchRzp() {
      const options = {
        key: result.razorpay_key,
        amount: result.amount_paise,
        currency: "INR",
        name: currentTenant?.name ?? "Academy",
        description: course.title,
        order_id: result.razorpay_order_id,
        handler: async () => {
          // Payment completed on Razorpay side — poll our server for confirmation.
          setPhase({ kind: "verifying", orderId: result.order_id, attempt: 0 })
          const status = await waitForPayment(result.order_id, (attempt) => {
            setPhase({ kind: "verifying", orderId: result.order_id, attempt })
          })
          if (status.status === "paid") {
            setPhase({ kind: "success", courseId: course.id })
          } else if ("timeout" in status && status.timeout) {
            setPhase({ kind: "timeout", orderId: result.order_id })
          } else {
            setPhase({ kind: "failed", message: `Payment status: ${status.status}` })
          }
        },
        modal: {
          ondismiss: () => {
            setPhase({ kind: "checkout" })
            toast.info("Payment cancelled")
          },
        },
        prefill: {
          name: result.prefill?.name || currentUser?.name || "",
          email: result.prefill?.email || currentUser?.email || "",
          contact: result.prefill?.contact || currentUser?.phone || "",
        },
        theme: { color: "#6366f1" },
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rzp = new (window as any).Razorpay(options)
      rzp.open()
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (existingScript && (window as any).Razorpay) {
      launchRzp()
    } else {
      const script = document.createElement("script")
      script.src = RZP_SRC
      script.onload = launchRzp
      script.onerror = () => {
        setPhase({ kind: "failed", message: "Failed to load payment gateway. Please check your internet connection or disable ad blockers and try again." })
      }
      document.body.appendChild(script)
    }
  }

  // ── Tenant switch handler ────────────────────────────────────

  function handleTenantSwitch() {
    // Clear current session
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(ACCESS_TOKEN_KEY)
    }
    setTenantSwitchOpen(false)
    router.push(`/p/${tenantSlug}/login?next=/p/${tenantSlug}/checkout/${courseSlug}`)
  }

  // ── Render ───────────────────────────────────────────────────

  if (!course) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md border-dashed">
          <CardContent className="py-12 text-center">
            <p className="font-semibold">Course not found</p>
            <Button asChild className="mt-4" variant="outline">
              <Link href={`/p/${tenantSlug}/courses`}>Browse courses</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="mx-auto max-w-lg px-4 py-12">

        {/* Back link */}
        <BackButton label="Back" fallbackHref={`/p/${tenantSlug}/courses/${courseSlug}`} className="-ml-2 mb-6" />

        {/* ── CHECKOUT PHASE ────────────────────────────────────── */}
        {phase.kind === "checkout" && (
          <Card>
            <CardHeader>
              <CardTitle>Checkout</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Course info */}
              <div className="flex items-start gap-3">
                {course.thumbnail && (
                  <img src={course.thumbnail} alt={course.title} className="h-16 w-16 rounded-lg object-cover" />
                )}
                <div>
                  <p className="font-semibold">{course.title}</p>
                  <p className="text-sm text-muted-foreground">{course.category || "Course"}</p>
                </div>
              </div>

              {/* Price breakdown */}
              <div className="rounded-lg border p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Price</span>
                  <span className="font-medium">{formatINR(coursePrice)}</span>
                </div>

                {/* Coupon field */}
                {!couponResult?.valid ? (
                  <div className="space-y-1.5 pt-2 border-t">
                    <Label className="text-xs text-muted-foreground">Have a coupon?</Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Enter coupon code"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleApplyCoupon() } }}
                        className="uppercase"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleApplyCoupon}
                        disabled={!couponCode.trim() || couponLoading}
                      >
                        {couponLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Tag className="h-3.5 w-3.5" />}
                        <span className="ml-1.5">Apply</span>
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between text-sm text-green-600">
                      <span className="flex items-center gap-1.5">
                        <Tag className="h-3.5 w-3.5" />
                        Discount ({couponResult.coupon_id ? couponCode : ""})
                      </span>
                      <span>-{formatINR(discountAmount)}</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveCoupon}
                      className="text-xs text-muted-foreground hover:text-destructive"
                    >
                      Remove coupon
                    </button>
                  </>
                )}

                <div className="flex justify-between font-semibold text-base pt-2 border-t">
                  <span>Total</span>
                  <span>{formatINR(finalPrice)}</span>
                </div>
              </div>

              {/* Auth check */}
              {!currentUser && (
                <div className="rounded-lg border border-amber-300/50 bg-amber-50 dark:bg-amber-950/20 p-3">
                  <p className="text-sm text-amber-700 dark:text-amber-400">
                    You need to sign in to complete your purchase.
                  </p>
                  <Button asChild size="sm" className="mt-2">
                    <Link href={`/p/${tenantSlug}/login?next=/p/${tenantSlug}/checkout/${courseSlug}`}>
                      Sign in
                    </Link>
                  </Button>
                </div>
              )}

              {/* Purchase button */}
              <Button
                onClick={handleConfirmPurchase}
                disabled={!currentUser}
                className="w-full gap-2"
                size="lg"
              >
                <ShieldCheck className="h-4 w-4" />
                {finalPrice > 0 ? `Pay ${formatINR(finalPrice)}` : "Enroll Free"}
              </Button>

              <p className="text-center text-[10px] text-muted-foreground">
                Payments processed securely by Razorpay. By proceeding you agree to the Terms of Service.
              </p>
            </CardContent>
          </Card>
        )}

        {/* ── PROCESSING PHASE ──────────────────────────────────── */}
        {phase.kind === "processing" && (
          <Card>
            <CardContent className="py-16 text-center">
              <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />
              <p className="mt-4 font-semibold">Preparing your order...</p>
            </CardContent>
          </Card>
        )}

        {/* ── VERIFYING PHASE ───────────────────────────────────── */}
        {phase.kind === "verifying" && (
          <Card>
            <CardContent className="py-16 text-center space-y-4">
              <Clock className="mx-auto h-10 w-10 text-primary animate-pulse" />
              <div>
                <p className="text-lg font-semibold">Verifying your payment...</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  We&apos;re confirming your payment with the bank. This usually takes a few seconds.
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                Check {phase.attempt} of 10 — don&apos;t close this page.
              </p>
            </CardContent>
          </Card>
        )}

        {/* ── SUCCESS PHASE ─────────────────────────────────────── */}
        {phase.kind === "success" && (
          <Card>
            <CardContent className="py-16 text-center space-y-4">
              <CheckCircle2 className="mx-auto h-12 w-12 text-green-500" />
              <div>
                <p className="text-lg font-semibold">You&apos;re enrolled!</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Welcome to <strong>{course.title}</strong>. Start learning now.
                </p>
              </div>
              <Button asChild size="lg">
                <Link href={`/p/${tenantSlug}/my/courses/${courseSlug}`}>
                  Go to Course Dashboard
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* ── FAILED PHASE ──────────────────────────────────────── */}
        {phase.kind === "failed" && (
          <Card>
            <CardContent className="py-16 text-center space-y-4">
              <XCircle className="mx-auto h-12 w-12 text-destructive" />
              <div>
                <p className="text-lg font-semibold">Payment failed</p>
                <p className="mt-1 text-sm text-muted-foreground">{phase.message}</p>
              </div>
              <Button onClick={() => setPhase({ kind: "checkout" })}>
                Try again
              </Button>
            </CardContent>
          </Card>
        )}

        {/* ── TIMEOUT PHASE ─────────────────────────────────────── */}
        {phase.kind === "timeout" && (
          <Card>
            <CardContent className="py-16 text-center space-y-4">
              <CheckCircle2 className="mx-auto h-10 w-10 text-amber-500" />
              <div>
                <p className="text-lg font-semibold">Payment received</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Verification is taking longer than usual. You can safely close this page —
                  the course will appear in your dashboard shortly.
                </p>
              </div>
              <Button asChild variant="outline">
                <Link href={`/p/${tenantSlug}/my`}>Go to My Courses</Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Tenant switch modal */}
      <TenantSwitchModal
        open={tenantSwitchOpen}
        onOpenChange={setTenantSwitchOpen}
        currentTenantName={currentTenant?.name ?? "Current Academy"}
        currentEmail={currentUser?.email ?? ""}
        targetTenantName={tenantSlug}
        targetTenantSlug={tenantSlug}
        returnUrl={`/p/${tenantSlug}/checkout/${courseSlug}`}
        onConfirmSwitch={handleTenantSwitch}
      />
    </div>
  )
}
