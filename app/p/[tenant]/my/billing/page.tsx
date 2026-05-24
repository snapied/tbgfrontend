"use client"

// "My billing" — every order placed by the signed-in user against
// this tenant's storefront. Reuses the existing StudentInvoices
// component (already filters by customerId / email) so we don't
// duplicate the receipt-list rendering logic.
//
// Receipts deep-link to /order/<id> which already shows the line
// items + payment method + a copy-link button.

import Link from "next/link"
import { useMemo } from "react"
import { useParams } from "next/navigation"
import { CalendarClock, CreditCard, Library, Repeat, X } from "lucide-react"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { StudentInvoices } from "@/components/students/student-invoices"
import { money, useStore } from "@/lib/store-store"
import { useLMS } from "@/lib/lms-store"
import { useConfirm } from "@/lib/use-confirm"
import { ProductTour, TakeATourButton } from "@/components/tour/product-tour"
import {
  STUDENT_BILLING_TOUR,
  STUDENT_BILLING_TOUR_ID,
} from "@/components/student/tours"

function tenantSlug(params: { tenant?: string | string[] }): string {
  const t = params.tenant
  return Array.isArray(t) ? t[0] ?? "" : t ?? ""
}

export default function MyBillingPage() {
  const params = useParams<{ tenant: string }>()
  const slug = tenantSlug(params)
  const { currentUser } = useLMS()
  const { subscriptions, products, cancelSubscription } = useStore()
  const confirm = useConfirm()

  // Mine = subscriptions owned by the signed-in user, joined with the
  // membership product so we can render a title + cadence label
  // without re-querying. Canceled subs stay visible (with a chip) so
  // the buyer can see what they used to have access to.
  const mySubscriptions = useMemo(() => {
    if (!currentUser) return []
    return subscriptions
      .filter((s) => s.customerId === currentUser.id)
      .map((s) => ({
        sub: s,
        product: products.find((p) => p.id === s.productId),
      }))
      .filter((row): row is { sub: typeof row.sub; product: NonNullable<typeof row.product> } => !!row.product)
      .sort((a, b) => b.sub.currentPeriodStart.localeCompare(a.sub.currentPeriodStart))
  }, [currentUser, subscriptions, products])

  const handleCancel = async (
    subId: string,
    productTitle: string,
    gatewaySubscriptionId: string | undefined,
  ) => {
    const ok = await confirm({
      title: `Cancel "${productTitle}" at period end?`,
      description:
        "You keep access until the current billing period ends — we won't charge you again after that. You can resubscribe any time from the storefront.",
      destructive: true,
      confirmLabel: "Cancel auto-renewal",
    })
    if (!ok) return
    // Hit the gateway first so the local "canceled" badge never
    // lies about Razorpay's state. Stub-mode subscriptions (no
    // gatewaySubscriptionId — checkout went through the in-process
    // stub) skip the API call entirely; the local flip is the only
    // source of truth in that case.
    if (gatewaySubscriptionId) {
      try {
        const res = await fetch("/api/payments/razorpay/subscriptions/cancel", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subscriptionId: gatewaySubscriptionId, atCycleEnd: true }),
        })
        const json = (await res.json().catch(() => null)) as
          | { ok: true }
          | { ok: false; error: string }
          | null
        if (!json || !json.ok) {
          toast.error(
            json && "error" in json
              ? `Razorpay said: ${json.error}`
              : "Could not stop the gateway charge — try again or contact support.",
          )
          return
        }
      } catch (err) {
        toast.error(`Cancellation failed: ${(err as Error).message}`)
        return
      }
    }
    cancelSubscription(subId)
    toast.success("Auto-renewal stopped. You keep access through the current period.")
  }

  if (!currentUser) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          Sign in to see your billing history.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <ProductTour tourId={STUDENT_BILLING_TOUR_ID} steps={STUDENT_BILLING_TOUR} />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold tracking-tight">Billing</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your receipts for every course and product purchased on this workspace.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <TakeATourButton tourId={STUDENT_BILLING_TOUR_ID} />
          <Button asChild variant="outline" size="sm">
            <Link href={`/p/${slug}/library`}>
              <Library className="mr-1.5 h-3.5 w-3.5" />
              Open library
            </Link>
          </Button>
        </div>
      </div>

      {/* Manage memberships — recurring subscriptions only. Hidden
          entirely when the user has none, so the panel doesn't sit
          there empty for the typical case (course-only purchases). */}
      {mySubscriptions.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Repeat className="h-4 w-4" />
              My memberships
            </CardTitle>
            <CardDescription>
              Recurring subscriptions on this workspace. Cancel auto-renewal any time — your access stays active through the end of the current period.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {mySubscriptions.map(({ sub, product }) => {
              const periodEnd = new Date(sub.currentPeriodEnd)
              const periodEndLabel = periodEnd.toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                year: "numeric",
              })
              const cadence =
                product.pricing.type === "subscription"
                  ? product.pricing.intervalDays === 30
                    ? "monthly"
                    : product.pricing.intervalDays === 90
                      ? "quarterly"
                      : product.pricing.intervalDays === 180
                        ? "every 6 months"
                        : "yearly"
                  : "recurring"
              const priceLabel =
                product.pricing.type === "subscription"
                  ? `${money(product.pricing.amount, product.pricing.currency)} / ${cadence}`
                  : ""
              const isActive = sub.status === "active" || sub.status === "trialing"
              const isCanceled = sub.status === "canceled"
              return (
                <div
                  key={sub.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border p-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{product.title}</p>
                      <Badge
                        variant={isActive ? "default" : isCanceled ? "outline" : "secondary"}
                        className="text-[10px]"
                      >
                        {sub.status === "trialing" ? "Free trial" : sub.status}
                      </Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {priceLabel}
                      {priceLabel && " · "}
                      <CalendarClock className="mr-1 inline h-3 w-3 -translate-y-px" />
                      {isCanceled ? "Access ends" : "Next renewal"}: {periodEndLabel}
                    </p>
                  </div>
                  {isActive && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCancel(sub.id, product.title, sub.gatewaySubscriptionId)}
                    >
                      <X className="mr-1.5 h-3.5 w-3.5" />
                      Cancel at period end
                    </Button>
                  )}
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}

      <StudentInvoices student={currentUser} />

      <Card>
        <CardContent className="flex items-start gap-3 p-4 text-sm text-muted-foreground">
          <CreditCard className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            Need a corrected GST invoice or a refund? Mail your workspace admin from your receipt link — they can re-issue or refund directly.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
