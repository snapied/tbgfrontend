"use client"

// Dashboard payouts — where creators see "where my money goes" and
// finish KYC. Shape mirrors Stripe Connect's dashboard but stripped
// down to one page:
//
//   1. Headline status (KYC + bank state) so they see green/amber at a
//      glance.
//   2. Settlement schedule + a 60-second money-flow diagram so the
//      "how does this work" question gets answered before they ask.
//   3. Payout history (last 50) with gross / gateway / net columns.
//   4. KYC form, only shown when status='not_started' or 'rejected'.
//   5. BYO-Razorpay switch — collapsed by default, for power users.
//
// We DO NOT show the unmasked bank account anywhere. Razorpay's
// dashboard is the source of truth for sensitive payout details.

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowRight,
  Banknote,
  CheckCircle2,
  ExternalLink,
  Info,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import {
  fetchPayoutsStatus,
  submitPayoutsSetup,
  refreshPayoutsFromRazorpay,
  setPayoutsMode,
  type PayoutsStatusResponse,
  type PayoutsStatus,
  type PayoutsSetupInput,
} from "@/lib/payouts-client"
import { ensureAuthed } from "@/lib/billing-client"
import { SignInRequired } from "@/components/dashboard/signin-required"

const STATUS_LABEL: Record<PayoutsStatus, string> = {
  not_started: "Not started",
  pending: "In setup",
  under_review: "Razorpay review",
  activated: "Active",
  rejected: "Action needed",
  suspended: "Suspended",
}

const STATUS_BADGE: Record<PayoutsStatus, string> = {
  not_started: "bg-muted text-muted-foreground border-border",
  pending: "bg-amber-500/15 text-amber-700 border-amber-500/30",
  under_review: "bg-primary/15 text-primary border-primary/30",
  activated: "bg-success/15 text-success border-success/30",
  rejected: "bg-destructive/15 text-destructive border-destructive/30",
  suspended: "bg-destructive/15 text-destructive border-destructive/30",
}

function rupees(paise: number): string {
  return "₹" + (paise / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 })
}

export default function PayoutsPage() {
  const [state, setState] = useState<PayoutsStatusResponse | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<"submit" | "refresh" | "mode" | null>(null)
  const [showByoPanel, setShowByoPanel] = useState(false)

  const [unauthed, setUnauthed] = useState(false)

  const reload = useCallback(async () => {
    setLoading(true)
    const authed = await ensureAuthed()
    if (!authed) {
      setUnauthed(true)
      setState(null)
      setErr(null)
      setLoading(false)
      return
    }
    setUnauthed(false)
    const result = await fetchPayoutsStatus()
    if ("error" in result) {
      setErr(result.error)
      setState(null)
    } else {
      setErr(null)
      setState(result)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  if (loading && !state) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Loading payouts…
      </div>
    )
  }

  if (unauthed) {
    return (
      <SignInRequired
        title="Sign in to set up payouts"
        description="Payouts go directly from Razorpay to your bank — you keep 100% of revenue minus Razorpay's gateway fee."
        bullets={[
          "Connect a bank account via Razorpay Route (one-time KYC)",
          "Daily / weekly settlement, your choice",
          "Money never touches our balance — 0% commission, structurally",
        ]}
      />
    )
  }

  if (err && !state) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-sm">
        <div className="flex items-center gap-2 font-semibold text-destructive">
          <AlertTriangle className="h-4 w-4" />
          Couldn&apos;t load payouts
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

  if (!state) return null

  const acct = state.account
  const needsKyc = acct.status === "not_started" || acct.status === "rejected"

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Payouts</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Where the money students pay you lands — and when.
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={async () => {
            setBusy("refresh")
            await refreshPayoutsFromRazorpay()
            await reload()
            setBusy(null)
          }}
          disabled={busy === "refresh"}
          className="gap-2"
        >
          <RefreshCw className={cn("h-4 w-4", busy === "refresh" && "animate-spin")} />
          Refresh status
        </Button>
      </header>

      {!state.billing.configured && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 text-sm">
          <div className="flex items-center gap-2 font-semibold text-amber-700 dark:text-amber-400">
            <AlertTriangle className="h-4 w-4" />
            Payouts system is in setup mode
          </div>
          <p className="mt-1 text-muted-foreground">
            {state.billing.configurationError}. You can fill in your details
            below; we&apos;ll push them to Razorpay once an operator wires the
            credentials.
          </p>
        </div>
      )}

      {err && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {err}
        </div>
      )}

      {/* Status headline */}
      <Card>
        <CardContent className="space-y-4 p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Account status
              </p>
              <div className="mt-1 flex items-center gap-3">
                <h2 className="text-2xl font-bold">
                  {acct.legalBusinessName || "Not set up"}
                </h2>
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                    STATUS_BADGE[acct.status],
                  )}
                >
                  {STATUS_LABEL[acct.status]}
                </span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Mode: {acct.mode === "route" ? "Managed payouts (Razorpay Route)" : "Bring-your-own Razorpay"}
              </p>
            </div>
            <div className="text-right text-sm">
              <p className="text-muted-foreground">Settlement schedule</p>
              <p className="text-lg font-bold tabular-nums">{acct.settlementSchedule}</p>
              <p className="text-xs text-muted-foreground">working days</p>
            </div>
          </div>

          {acct.bank && (
            <div className="rounded-md border border-border bg-muted/30 p-3 text-sm">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <Banknote className="h-3.5 w-3.5" />
                Payout bank account
              </div>
              <p className="mt-1 font-medium">{acct.bank.holderName}</p>
              <p className="text-xs text-muted-foreground">
                {acct.bank.accountNumberMasked} · {acct.bank.ifsc}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* How the money flows */}
      <MoneyFlowDiagram />

      {/* Totals */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Stat label="Sales (gross)" value={rupees(state.totals.grossPaise)} />
        <Stat label="Razorpay fees" value={rupees(state.totals.gatewayFeePaise)} muted />
        <Stat
          label="Our cut"
          value={rupees(state.totals.platformFeePaise)}
          accent="success"
          subtitle="0% commitment"
        />
        <Stat label="Net to you" value={rupees(state.totals.netPaise)} accent="primary" />
      </div>

      {/* KYC form */}
      {needsKyc && (
        <KycForm
          busy={busy === "submit"}
          onSubmit={async (input) => {
            setBusy("submit")
            const r = await submitPayoutsSetup(input)
            setBusy(null)
            if ("error" in r) {
              setErr(r.error)
              return
            }
            await reload()
          }}
        />
      )}

      {/* History table */}
      <Card>
        <CardContent className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Recent payouts
            </h3>
            {acct.razorpayAccountId && (
              <a
                href="https://dashboard.razorpay.com/app/settlements"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
              >
                View on Razorpay <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
          {state.recent.length === 0 ? (
            <p className="rounded-md border border-dashed border-border bg-muted/20 p-6 text-center text-sm text-muted-foreground">
              No payouts yet. As soon as a student buys something from your
              storefront, the order will show up here with the gross / fee /
              net breakdown.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                    <th className="py-2 pr-3">When</th>
                    <th className="py-2 pr-3">Product</th>
                    <th className="py-2 pr-3 text-right">Gross</th>
                    <th className="py-2 pr-3 text-right">Razorpay fee</th>
                    <th className="py-2 pr-3 text-right">Net to you</th>
                    <th className="py-2 pr-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {state.recent.map((r) => (
                    <tr key={r.id} className="border-b border-border last:border-0">
                      <td className="py-2 pr-3 text-muted-foreground">
                        {new Date(r.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-2 pr-3 font-medium">{r.productLabel ?? "—"}</td>
                      <td className="py-2 pr-3 text-right tabular-nums">{rupees(r.grossPaise)}</td>
                      <td className="py-2 pr-3 text-right tabular-nums text-muted-foreground">
                        −{rupees(r.gatewayFeePaise)}
                      </td>
                      <td className="py-2 pr-3 text-right tabular-nums font-semibold">
                        {rupees(r.netPaise)}
                      </td>
                      <td className="py-2 pr-3">
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
                          {r.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* BYO panel — collapsed by default */}
      <Card>
        <CardContent className="p-6">
          <button
            type="button"
            onClick={() => setShowByoPanel((v) => !v)}
            className="flex w-full items-center justify-between text-left"
          >
            <div>
              <h3 className="text-sm font-semibold">Bring your own Razorpay account</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Already have a merchant account with negotiated rates? Connect
                it here and we&apos;ll route checkouts to your own keys instead
                of our managed flow.
              </p>
            </div>
            <ArrowRight
              className={cn(
                "h-4 w-4 text-muted-foreground transition-transform",
                showByoPanel && "rotate-90",
              )}
            />
          </button>

          {showByoPanel && (
            <ByoPanel
              currentMode={acct.mode}
              busy={busy === "mode"}
              onSwitch={async (mode, keyId, secret) => {
                setBusy("mode")
                const r = await setPayoutsMode(mode, keyId, secret)
                setBusy(null)
                if ("error" in r) setErr(r.error)
                else await reload()
              }}
            />
          )}
        </CardContent>
      </Card>

      {/* Footer reassurance */}
      <div className="rounded-md border border-success/20 bg-success/5 p-3 text-xs text-muted-foreground">
        <ShieldCheck className="mr-1 inline h-3 w-3 text-success" />
        Money never sits in our accounts. Razorpay deducts their gateway
        fee at checkout and settles the rest directly to your bank on
        their schedule. Our cut is 0% — verifiable against your Razorpay
        dashboard.{" "}
        <Link href="/help/payouts" className="text-primary hover:underline">
          How payouts work →
        </Link>
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────
// Subcomponents
// ────────────────────────────────────────────────────────────────────

function Stat({
  label, value, subtitle, muted, accent,
}: {
  label: string
  value: string
  subtitle?: string
  muted?: boolean
  accent?: "primary" | "success"
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p
          className={cn(
            "mt-2 text-2xl font-bold tabular-nums",
            muted && "text-muted-foreground",
            accent === "primary" && "text-primary",
            accent === "success" && "text-success",
          )}
        >
          {value}
        </p>
        {subtitle && <p className="mt-1 text-[11px] text-muted-foreground">{subtitle}</p>}
      </CardContent>
    </Card>
  )
}

function MoneyFlowDiagram() {
  // Pure visual — three labelled boxes with arrows between them.
  // Communicates the entire payout flow in the same vertical space as
  // a paragraph, without anyone having to read.
  return (
    <Card>
      <CardContent className="p-6">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          How a ₹500 sale flows
        </h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto_1fr_auto_1fr]">
          <FlowBox
            title="Student pays"
            amount="₹500"
            note="UPI / card / netbanking"
          />
          <div className="flex items-center justify-center text-muted-foreground">
            <ArrowRight className="h-5 w-5 -rotate-0 sm:rotate-0" />
          </div>
          <FlowBox
            title="Razorpay deducts ~2%"
            amount="−₹10"
            note="Standard gateway fee"
            tone="muted"
          />
          <div className="flex items-center justify-center text-muted-foreground">
            <ArrowDownToLine className="h-5 w-5" />
          </div>
          <FlowBox
            title="Your bank"
            amount="₹490"
            note="Settles in T+2 working days"
            tone="success"
          />
        </div>
        <p className="mt-4 flex items-center gap-2 rounded-md border border-border bg-muted/20 p-3 text-xs text-muted-foreground">
          <Info className="h-3.5 w-3.5 shrink-0 text-primary" />
          Our cut is{" "}
          <span className="font-bold text-success">₹0</span>. Money never
          touches our accounts — Razorpay routes the net amount straight
          to the bank account you registered.
        </p>
      </CardContent>
    </Card>
  )
}

function FlowBox({
  title, amount, note, tone,
}: {
  title: string
  amount: string
  note: string
  tone?: "muted" | "success"
}) {
  return (
    <div
      className={cn(
        "rounded-md border p-3 text-center",
        tone === "muted" && "border-border bg-muted/30",
        tone === "success" && "border-success/30 bg-success/5",
        !tone && "border-primary/30 bg-primary/5",
      )}
    >
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </p>
      <p
        className={cn(
          "mt-1 text-2xl font-bold tabular-nums",
          tone === "muted" && "text-muted-foreground",
          tone === "success" && "text-success",
          !tone && "text-foreground",
        )}
      >
        {amount}
      </p>
      <p className="mt-1 text-[11px] text-muted-foreground">{note}</p>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────
// KYC form
// ────────────────────────────────────────────────────────────────────

function KycForm({
  busy, onSubmit,
}: {
  busy: boolean
  onSubmit: (input: PayoutsSetupInput) => Promise<void>
}) {
  const [legalBusinessName, setLegalBusinessName] = useState("")
  const [businessType, setBusinessType] = useState<PayoutsSetupInput["businessType"]>("proprietorship")
  const [contactEmail, setContactEmail] = useState("")
  const [contactPhone, setContactPhone] = useState("")
  const [pan, setPan] = useState("")
  const [gstin, setGstin] = useState("")
  const [street1, setStreet1] = useState("")
  const [city, setCity] = useState("")
  const [stateField, setStateField] = useState("")
  const [postalCode, setPostalCode] = useState("")
  const [country, setCountry] = useState("IN")
  const [holderName, setHolderName] = useState("")
  const [accountNumber, setAccountNumber] = useState("")
  const [ifsc, setIfsc] = useState("")
  const [stakeholderName, setStakeholderName] = useState("")
  const [stakeholderEmail, setStakeholderEmail] = useState("")

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSubmit({
      legalBusinessName,
      businessType,
      contactEmail,
      contactPhone,
      pan,
      gstin: gstin || undefined,
      registeredAddress: { street1, city, state: stateField, postalCode, country },
      bankAccount: { holderName, accountNumber, ifsc },
      stakeholder: { name: stakeholderName, email: stakeholderEmail, relationship: "director" },
    })
  }

  return (
    <Card>
      <CardContent className="space-y-4 p-6">
        <div>
          <h3 className="text-lg font-semibold">Set up payouts</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Razorpay needs your business + bank details to settle student
            payments to your account. Activation typically takes 24–48 hours
            after you submit.
          </p>
        </div>

        <form onSubmit={submit} className="space-y-5">
          <Section title="Business">
            <FormField label="Legal business name" required>
              <Input
                value={legalBusinessName}
                onChange={(e) => setLegalBusinessName(e.target.value)}
                placeholder="Acme Tutorials Pvt Ltd / Mr Rakesh Sharma"
                required
              />
            </FormField>
            <FormField label="Business type" required>
              <Select
                value={businessType}
                onValueChange={(v) => setBusinessType(v as PayoutsSetupInput["businessType"])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="proprietorship">Proprietorship</SelectItem>
                  <SelectItem value="partnership">Partnership</SelectItem>
                  <SelectItem value="private_limited">Private limited</SelectItem>
                  <SelectItem value="public_limited">Public limited</SelectItem>
                  <SelectItem value="llp">LLP</SelectItem>
                  <SelectItem value="individual">Individual</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Contact email" required>
              <Input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="ops@yourbusiness.com"
                required
              />
            </FormField>
            <FormField label="Contact phone" required>
              <Input
                type="tel"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="+91 98765 43210"
                required
              />
            </FormField>
            <FormField label="PAN" required>
              <Input
                value={pan}
                onChange={(e) => setPan(e.target.value.toUpperCase())}
                placeholder="ABCDE1234F"
                pattern="[A-Z]{5}[0-9]{4}[A-Z]"
                required
              />
            </FormField>
            <FormField label="GSTIN (optional)">
              <Input
                value={gstin}
                onChange={(e) => setGstin(e.target.value.toUpperCase())}
                placeholder="22ABCDE1234F1Z5"
              />
            </FormField>
          </Section>

          <Section title="Registered address">
            <FormField label="Street" required span={2}>
              <Input value={street1} onChange={(e) => setStreet1(e.target.value)} required />
            </FormField>
            <FormField label="City" required>
              <Input value={city} onChange={(e) => setCity(e.target.value)} required />
            </FormField>
            <FormField label="State" required>
              <Input value={stateField} onChange={(e) => setStateField(e.target.value)} required />
            </FormField>
            <FormField label="PIN" required>
              <Input value={postalCode} onChange={(e) => setPostalCode(e.target.value)} required />
            </FormField>
            <FormField label="Country" required>
              <Input
                value={country}
                onChange={(e) => setCountry(e.target.value.toUpperCase())}
                maxLength={2}
                required
              />
            </FormField>
          </Section>

          <Section title="Bank account (where payouts land)">
            <FormField label="Account holder name" required span={2}>
              <Input
                value={holderName}
                onChange={(e) => setHolderName(e.target.value)}
                placeholder="Exactly as in your bank records"
                required
              />
            </FormField>
            <FormField label="Account number" required>
              <Input
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                placeholder="123456789012"
                required
              />
            </FormField>
            <FormField label="IFSC" required>
              <Input
                value={ifsc}
                onChange={(e) => setIfsc(e.target.value.toUpperCase())}
                placeholder="HDFC0001234"
                required
              />
            </FormField>
          </Section>

          <Section title="Authorised stakeholder">
            <FormField label="Full name" required>
              <Input value={stakeholderName} onChange={(e) => setStakeholderName(e.target.value)} required />
            </FormField>
            <FormField label="Email" required>
              <Input
                type="email"
                value={stakeholderEmail}
                onChange={(e) => setStakeholderEmail(e.target.value)}
                required
              />
            </FormField>
          </Section>

          <div className="flex items-center justify-between border-t border-border pt-4">
            <p className="text-xs text-muted-foreground">
              By submitting you authorise Razorpay to verify your KYC
              documents and settle payments to the bank account above.
            </p>
            <Button type="submit" disabled={busy} className="gap-2">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Submit for review
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </p>
      <div className="grid gap-3 sm:grid-cols-2">{children}</div>
    </div>
  )
}

function FormField({
  label, children, required, span,
}: {
  label: string
  children: React.ReactNode
  required?: boolean
  span?: number
}) {
  return (
    <div className={cn(span === 2 && "sm:col-span-2")}>
      <Label className="mb-1.5 block text-xs">
        {label}
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </Label>
      {children}
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────
// BYO panel
// ────────────────────────────────────────────────────────────────────

function ByoPanel({
  currentMode, busy, onSwitch,
}: {
  currentMode: "route" | "byo"
  busy: boolean
  onSwitch: (mode: "route" | "byo", keyId?: string, secret?: string) => Promise<void>
}) {
  const [keyId, setKeyId] = useState("")
  const [secret, setSecret] = useState("")

  if (currentMode === "byo") {
    return (
      <div className="mt-4 space-y-3 rounded-md border border-border bg-muted/20 p-4 text-sm">
        <div className="flex items-center gap-2 font-semibold">
          <CheckCircle2 className="h-4 w-4 text-success" />
          BYO Razorpay is active
        </div>
        <p className="text-xs text-muted-foreground">
          Checkouts route to your own merchant account. Settlements,
          refunds, and disputes live on your Razorpay dashboard.
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onSwitch("route")}
          disabled={busy}
        >
          Switch back to managed payouts
        </Button>
      </div>
    )
  }
  return (
    <div className="mt-4 space-y-3 rounded-md border border-border bg-muted/20 p-4">
      <p className="text-xs text-muted-foreground">
        We&apos;ll proxy student checkout to your own Razorpay credentials.
        We never see the money, never touch settlement timing. Same 0%
        from us in either mode.
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        <div>
          <Label className="mb-1.5 block text-xs">Razorpay Key ID</Label>
          <Input value={keyId} onChange={(e) => setKeyId(e.target.value)} placeholder="rzp_live_…" />
        </div>
        <div>
          <Label className="mb-1.5 block text-xs">Razorpay Key Secret</Label>
          <Input
            type="password"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            placeholder="••••••••"
          />
        </div>
      </div>
      <Button
        size="sm"
        onClick={() => onSwitch("byo", keyId, secret)}
        disabled={busy || !keyId || !secret}
      >
        Connect my Razorpay account
      </Button>
    </div>
  )
}
