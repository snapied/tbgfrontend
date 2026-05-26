"use client"

// Dashboard billing — workspace owner's view of their plan.
//
// Shows: current plan + status, usage bars vs. limits, upgrade options
// (cheapest path to next tier), cancel + reactivate, and a "refresh
// from Razorpay" escape hatch in case the local row drifted from
// the source of truth.
//
// All state comes from /api/billing/subscription. The upgrade flow
// posts to /api/billing/checkout, gets a Razorpay-hosted URL, and
// redirects to it. After payment, Razorpay fires webhooks to mark
// status=active; the page re-fetches on focus to pick that up
// without needing a manual refresh.

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  CreditCard,
  ExternalLink,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import {
  PLANS,
  PLAN_ORDER,
  PERIOD_LABEL,
  PERIOD_DISCOUNT,
  periodPerMonthPaise,
  periodTotalPaise,
  type PlanId,
  type BillingPeriod,
} from "@/lib/plans"
import {
  fetchSubscription,
  startCheckout,
  cancelSubscription,
  refreshFromRazorpay,
  ensureAuthed,
  type BillingStatus,
} from "@/lib/billing-client"
import { SignInRequired } from "@/components/dashboard/signin-required"
import { CancelSubscriptionDialog } from "@/components/dashboard/cancel-subscription-dialog"
import type { CancelPayload } from "@/lib/billing-client"
import { ContactSupportDialog } from "@/components/support/contact-support-dialog"

type Status = "active" | "trialing" | "past_due" | "cancelled" | "paused"

const STATUS_LABEL: Record<Status, string> = {
  active: "Active",
  trialing: "In trial",
  past_due: "Payment past due",
  cancelled: "Cancelling at period end",
  paused: "Paused",
}

const STATUS_BADGE: Record<Status, string> = {
  active: "bg-success/15 text-success border-success/30",
  trialing: "bg-primary/15 text-primary border-primary/30",
  past_due: "bg-amber-500/15 text-amber-600 border-amber-500/30",
  cancelled: "bg-muted text-muted-foreground border-border",
  paused: "bg-muted text-muted-foreground border-border",
}

export default function BillingPage() {
  const [status, setStatus] = useState<BillingStatus | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<"checkout" | "cancel" | "refresh" | null>(null)
  const [period, setPeriod] = useState<BillingPeriod>("yearly")

  const [unauthed, setUnauthed] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)

  const reload = useCallback(async () => {
    setLoading(true)
    // Try to mint an access token from the refresh cookie before
    // declaring "not signed in" — the user may have a valid session
    // even when localStorage is empty (older signup, different
    // device, incognito clear, …).
    const authed = await ensureAuthed()
    if (!authed) {
      setUnauthed(true)
      setStatus(null)
      setErr(null)
      setLoading(false)
      return
    }
    setUnauthed(false)
    const result = await fetchSubscription()
    if ("error" in result) {
      setErr(result.error)
      setStatus(null)
    } else {
      setErr(null)
      setStatus(result)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  // Re-fetch when the tab regains focus — covers the Razorpay checkout
  // round-trip, where the user pays in a new tab and switches back.
  // Without this they'd see the old "Trialing" status until manually
  // refreshing.
  useEffect(() => {
    const onFocus = () => {
      void reload()
    }
    window.addEventListener("focus", onFocus)
    return () => window.removeEventListener("focus", onFocus)
  }, [reload])

  const handleUpgrade = async (plan: Exclude<PlanId, "starter" | "institute">) => {
    setBusy("checkout")
    const result = await startCheckout(plan, period)
    setBusy(null)
    if ("error" in result) {
      setErr(result.error)
      return
    }
    // Razorpay's hosted checkout. Pop in a new tab so the user can
    // come back to the dashboard mid-flow; the focus listener picks
    // up status changes after payment.
    window.open(result.shortUrl, "_blank", "noopener,noreferrer")
  }

  const handleCancel = async (payload: CancelPayload) => {
    setBusy("cancel")
    const result = await cancelSubscription(payload)
    setBusy(null)
    if ("error" in result) {
      setErr(result.error)
      setCancelOpen(false)
      return
    }
    setCancelOpen(false)
    if (payload.deleteAccount) {
      // Account is deactivated — bounce to login so they aren't left on
      // a 401-spamming dashboard.
      window.location.href = "/login?deactivated=1"
      return
    }
    await reload()
  }

  const handleRefresh = async () => {
    setBusy("refresh")
    const result = await refreshFromRazorpay()
    setBusy(null)
    if ("error" in result) {
      setErr(result.error)
    } else {
      await reload()
    }
  }

  if (loading && !status) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Loading billing…
      </div>
    )
  }

  if (unauthed) {
    return (
      <SignInRequired
        title="Sign in to manage billing"
        description="Plans, usage, and subscriptions live in your real workspace account — not the demo session."
        bullets={[
          "See your current plan + usage in real time",
          "Upgrade, downgrade, or cancel from one place",
          "0% commission on revenue — Razorpay's ~2% gateway fee at cost",
        ]}
      />
    )
  }

  if (err && !status) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-sm">
        <div className="flex items-center gap-2 font-semibold text-destructive">
          <AlertTriangle className="h-4 w-4" />
          Couldn&apos;t load billing
        </div>
        <p className="mt-2 text-muted-foreground">{err}</p>
        <p className="mt-2 text-muted-foreground">
          If you&apos;re not logged in, sign in first.{" "}
          <Link href="/login" className="text-primary hover:underline">
            Go to login
          </Link>
          .
        </p>
        <Button variant="outline" size="sm" onClick={reload} className="mt-3">
          Try again
        </Button>
      </div>
    )
  }

  if (!status) return null

  const planId = (status.subscription.plan as PlanId) || "starter"
  const plan = PLANS[planId] ?? PLANS.starter
  const subStatus = (status.subscription.status as Status) || "active"

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Billing & plan</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your subscription, see usage, and upgrade when you need more.
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRefresh}
          disabled={busy === "refresh"}
          className="gap-2"
        >
          <RefreshCw className={cn("h-4 w-4", busy === "refresh" && "animate-spin")} />
          Refresh
        </Button>
      </header>

      {/* Razorpay-not-configured warning (operator-visible) */}
      {!status.billing.configured && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 text-sm">
          <div className="flex items-center gap-2 font-semibold text-amber-700 dark:text-amber-400">
            <AlertTriangle className="h-4 w-4" />
            Billing system is in setup mode
          </div>
          <p className="mt-1 text-muted-foreground">
            {status.billing.configurationError}. You can still browse plans;
            upgrades become available once an operator wires Razorpay
            credentials.
          </p>
        </div>
      )}

      {err && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {err}
        </div>
      )}

      {/* Card-verified trial banner. Fires when we're inside a 14-day
          trial AND Razorpay holds an authenticated subscription mandate
          for this org. Communicates the exact charge date so the
          customer knows when money actually moves — defuses the "wait,
          did I get billed?" worry that surfaces partway through a
          trial. Hidden after the trial converts (status !== 'trialing'). */}
      {subStatus === "trialing" && status.subscription.razorpaySubscriptionId && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm">
          <div className="flex items-start gap-3">
            <div className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-foreground">
                Card verified — you&apos;re in the {plan.name} 14-day trial
              </p>
              <p className="mt-1 text-muted-foreground">
                Nothing has been charged yet. Razorpay holds the mandate and
                will fire the first charge on{" "}
                <span className="font-semibold text-foreground">
                  {status.subscription.currentPeriodEnd
                    ? new Date(status.subscription.currentPeriodEnd).toLocaleDateString(undefined, {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })
                    : "the trial end date"}
                </span>
                . Cancel before then and you&apos;re never billed. The 30-day
                refund window starts on that first paid charge.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Current plan card */}
      <Card>
        <CardContent className="space-y-4 p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Current plan
              </p>
              <div className="mt-1 flex items-center gap-3">
                <h2 className="text-2xl font-bold">{plan.name}</h2>
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                    STATUS_BADGE[subStatus],
                  )}
                >
                  {STATUS_LABEL[subStatus]}
                </span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{plan.tagline}</p>
            </div>
            <div className="text-right">
              {plan.price.monthlyPaise === 0 ? (
                <p className="text-2xl font-bold">Free</p>
              ) : (
                <>
                  <p className="text-2xl font-bold tabular-nums">
                    ₹{Math.round(
                      periodPerMonthPaise(planId, status.subscription.period ?? "monthly") / 100,
                    ).toLocaleString("en-IN")}
                    <span className="ml-1 text-sm font-normal text-muted-foreground">/ month</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Billed {PERIOD_LABEL[status.subscription.period ?? "monthly"].toLowerCase()}
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Renewal / period info */}
          {status.subscription.currentPeriodEnd && (
            <div className="rounded-md border border-border bg-muted/30 p-3 text-sm">
              {subStatus === "cancelled" ? (
                <>
                  Access ends on{" "}
                  <span className="font-semibold">
                    {new Date(status.subscription.currentPeriodEnd).toLocaleDateString()}
                  </span>
                  . After that the workspace returns to the Starter plan.
                </>
              ) : (
                <>
                  Next renewal:{" "}
                  <span className="font-semibold">
                    {new Date(status.subscription.currentPeriodEnd).toLocaleDateString()}
                  </span>
                </>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            {planId !== "institute" && subStatus !== "cancelled" && (planId !== "starter" || subStatus === "trialing") && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCancelOpen(true)}
                disabled={busy === "cancel"}
              >
                {subStatus === "trialing" ? "Cancel trial" : "Cancel subscription"}
              </Button>
            )}
            {subStatus === "cancelled" && (
              <Button
                size="sm"
                onClick={() => handleUpgrade(planId === "starter" ? "pro" : (planId as Exclude<PlanId, "starter" | "institute">))}
                disabled={busy === "checkout"}
              >
                Reactivate
              </Button>
            )}
            <Button asChild variant="ghost" size="sm" className="gap-1">
              <Link href="/pricing">
                See all plans <ArrowUpRight className="h-3 w-3" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Usage bars */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Usage this period
          </h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <UsageBar
              label="Active students"
              used={status.usage.students}
              limit={status.limits.students}
            />
            <UsageBar
              label="Instructor seats"
              used={status.usage.teachers}
              limit={status.limits.teachers}
            />
            <UsageBar
              label="Community batches"
              used={status.usage.batches}
              limit={status.limits.batches}
            />
            <UsageBar
              label="Published courses"
              used={status.usage.publishedCourses}
              limit={status.limits.publishedCourses}
            />
            <UsageBar
              label="Recording storage"
              used={status.usage.storageBytes / (1024 * 1024 * 1024)}
              limit={status.limits.storageGB}
              unit="GB"
            />
            <ZeroCommissionRow />
          </div>
        </CardContent>
      </Card>

      {/* Upgrade ladder — only show plans above the current one */}
      <UpgradeLadder
        currentPlan={planId}
        period={period}
        onPeriodChange={setPeriod}
        onUpgrade={handleUpgrade}
        busy={busy === "checkout"}
      />

      <CancelSubscriptionDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        onConfirm={handleCancel}
        busy={busy === "cancel"}
      />
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────
// UsageBar — shows used / limit with a gradient bar
// ────────────────────────────────────────────────────────────────────

function UsageBar({
  label, used, limit, unit,
}: {
  label: string
  used: number | null | undefined
  limit: number | null | undefined
  unit?: string
}) {
  const safeUsed = used ?? 0
  const safeLimit = limit ?? Infinity
  const isUnlimited = safeLimit === Infinity
  const pct = isUnlimited ? 0 : Math.min(100, Math.round((safeUsed / Math.max(1, safeLimit)) * 100))
  const formatNum = (n: number) => {
    if (n === Infinity) return "Unlimited"
    if (unit === "GB") return `${n.toFixed(1)} GB`
    return n.toLocaleString("en-IN")
  }
  return (
    <div>
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-xs text-muted-foreground tabular-nums">
          {formatNum(safeUsed)} {isUnlimited ? "" : `/ ${formatNum(safeLimit)}`}
        </span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
        {isUnlimited ? (
          <div className="h-full w-full bg-gradient-to-r from-primary/40 via-primary/20 to-transparent" />
        ) : (
          <div
            className={cn(
              "h-full transition-all",
              pct >= 100 ? "bg-destructive" : pct >= 80 ? "bg-amber-500" : "bg-primary",
            )}
            style={{ width: `${pct}%` }}
          />
        )}
      </div>
    </div>
  )
}

// The "you keep everything you earn" reassurance — sits in the usage
// grid where the old transaction-fee row used to be. Same shape as
// UsageBar so the grid stays balanced, but visually flagged with the
// shield icon to signal "this is a commitment, not a limit you can
// bump into".
function ZeroCommissionRow() {
  return (
    <div>
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-medium">Commission on your revenue</span>
      </div>
      <div className="mt-1 flex items-center gap-2 rounded-md border border-success/30 bg-success/5 px-3 py-2 text-sm">
        <ShieldCheck className="h-4 w-4 text-success" />
        <span className="font-semibold tabular-nums">0%</span>
        <span className="text-xs text-muted-foreground">
          from us, forever · Razorpay&apos;s ~2% gateway fee at cost
        </span>
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────
// UpgradeLadder — shows plans above the current one
// ────────────────────────────────────────────────────────────────────

function UpgradeLadder({
  currentPlan, period, onPeriodChange, onUpgrade, busy,
}: {
  currentPlan: PlanId
  period: BillingPeriod
  onPeriodChange: (p: BillingPeriod) => void
  onUpgrade: (plan: Exclude<PlanId, "starter" | "institute">) => void
  busy: boolean
}) {
  const currentIdx = PLAN_ORDER.indexOf(currentPlan)
  const upgrades = PLAN_ORDER.slice(currentIdx + 1)
  if (upgrades.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          You&apos;re on the highest plan. Need something custom? Email{" "}
          <a href="mailto:hello@thebigclass.com" className="text-primary hover:underline">
            hello@thebigclass.com
          </a>
          .
        </CardContent>
      </Card>
    )
  }
  return (
    <Card>
      <CardContent className="space-y-4 p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Upgrade
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Get more capacity and lower transaction fees.
            </p>
          </div>
          <div className="inline-flex flex-wrap items-center gap-1 rounded-full border border-border bg-card p-1">
            {(Object.keys(PERIOD_LABEL) as BillingPeriod[]).map((p) => {
              const pct = Math.round(PERIOD_DISCOUNT[p] * 100)
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => onPeriodChange(p)}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                    period === p
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {PERIOD_LABEL[p]}
                  {pct > 0 && <span className="ml-1 opacity-70">−{pct}%</span>}
                </button>
              )
            })}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {upgrades.map((id) => {
            const p = PLANS[id]
            const monthlyDisplay = Math.round(periodPerMonthPaise(id, period) / 100)
            const periodTotal = Math.round(periodTotalPaise(id, period) / 100)
            return (
              <div
                key={id}
                className={cn(
                  "rounded-lg border bg-card p-4",
                  p.highlight && "border-primary/40 ring-1 ring-primary/20",
                )}
              >
                <div className="flex items-baseline justify-between">
                  <h4 className="text-lg font-semibold">{p.name}</h4>
                  {p.highlight && (
                    <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
                      Recommended
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{p.tagline}</p>
                <div className="mt-3 flex items-baseline gap-1">
                  {p.contact ? (
                    <span className="text-2xl font-bold">From ₹9,999/mo</span>
                  ) : (
                    <>
                      <span className="text-3xl font-bold tabular-nums">
                        ₹{monthlyDisplay.toLocaleString("en-IN")}
                      </span>
                      <span className="text-sm text-muted-foreground">/ mo</span>
                    </>
                  )}
                </div>
                {!p.contact && period !== "monthly" && (
                  <p className="text-xs text-muted-foreground">
                    Billed ₹{periodTotal.toLocaleString("en-IN")} {PERIOD_LABEL[period].toLowerCase()}
                  </p>
                )}
                <ul className="mt-3 space-y-1 text-xs">
                  <BulletLimit label="Students" value={formatLimit(p.limits.students)} />
                  <BulletLimit label="Storage" value={formatLimit(p.limits.storageGB, "GB")} />
                  <BulletLimit label="Instructor seats" value={formatLimit(p.limits.teachers)} />
                  <BulletLimit label="Commission on revenue" value="0%" />
                </ul>
                <div className="mt-4">
                  {p.contact ? (
                    <ContactSupportDialog
                      intent="sales"
                      defaultSubject={`Institute plan enquiry — ${p.name}`}
                      trigger={
                        <Button variant="outline" className="w-full gap-1">
                          Talk to us <ExternalLink className="h-3 w-3" />
                        </Button>
                      }
                    />
                  ) : (
                    <Button
                      onClick={() => onUpgrade(id as Exclude<PlanId, "starter" | "institute">)}
                      disabled={busy}
                      className="w-full gap-2"
                    >
                      {busy ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <CreditCard className="h-4 w-4" />
                      )}
                      Start 14-day trial of {p.name}
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        <div className="flex items-start gap-2 rounded-md border border-border bg-muted/20 p-3 text-xs text-muted-foreground">
          <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
          <span>
            <strong>14-day free trial on every paid plan.</strong> You add a
            card up-front so Razorpay can authenticate the mandate, but
            nothing is billed during the trial. Cancel before day 14 and
            you&apos;re never charged. After that, the card is billed for the
            period you picked; you keep access through any cycle you&apos;ve
            already paid for. Flat fee, zero commission — forever — and a
            30-day refund window once paid. Payments processed by Razorpay
            (UPI AutoPay, cards, netbanking).
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

function BulletLimit({ label, value }: { label: string; value: string }) {
  return (
    <li className="flex items-center gap-2">
      <CheckCircle2 className="h-3 w-3 text-success" />
      <span className="text-muted-foreground">{label}:</span>
      <span className="font-medium text-foreground">{value}</span>
    </li>
  )
}

function formatLimit(n: number, unit?: string): string {
  if (n === Infinity) return "Unlimited"
  if (unit === "GB") return n >= 1024 ? `${(n / 1024).toFixed(0)} TB` : `${n} GB`
  return n.toLocaleString("en-IN")
}
