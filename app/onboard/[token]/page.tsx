"use client"

import { use, useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  CheckCircle2,
  Loader2,
  FileSignature,
  Building2,
  Wallet,
  AlertTriangle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"

const API_BASE = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
).replace(/\/$/, "")

type PayoutMethod = "bank_transfer" | "upi" | "razorpay_linked"

interface OnboardingData {
  academyName: string
  welcomeMessage: string
  agreementHtml: string
  requiresPayoutDetails: boolean
  teacherName?: string
}

type Phase =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "agreement"; data: OnboardingData }
  | { kind: "payout"; data: OnboardingData }
  | { kind: "done"; academyName: string }

export default function TeacherOnboardPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = use(params)
  const router = useRouter()

  const [phase, setPhase] = useState<Phase>({ kind: "loading" })
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  // Step 1 state
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false)
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [signatureName, setSignatureName] = useState("")
  const agreementRef = useRef<HTMLDivElement>(null)

  // Step 2 state
  const [payoutMethod, setPayoutMethod] = useState<PayoutMethod>("bank_transfer")
  const [accountHolderName, setAccountHolderName] = useState("")
  const [accountNumber, setAccountNumber] = useState("")
  const [ifscCode, setIfscCode] = useState("")
  const [upiId, setUpiId] = useState("")
  const [panNumber, setPanNumber] = useState("")
  const [gstNumber, setGstNumber] = useState("")
  const [confirmedDetails, setConfirmedDetails] = useState(false)

  // Fetch onboarding data on mount
  useEffect(() => {
    let cancelled = false
    const fetchData = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/onboard/${token}`)
        const json = await res.json().catch(() => ({}))
        if (cancelled) return
        if (!res.ok) {
          setPhase({
            kind: "error",
            message: json.error ?? json.message ?? "This onboarding link is invalid or has expired.",
          })
          return
        }
        const data: OnboardingData = {
          academyName: json.academyName ?? json.academy_name ?? "Academy",
          welcomeMessage: json.welcomeMessage ?? json.welcome_message ?? "",
          agreementHtml: json.agreementHtml ?? json.agreement_html ?? "",
          requiresPayoutDetails:
            json.requiresPayoutDetails ?? json.requires_payout_details ?? false,
          teacherName: json.teacherName ?? json.teacher_name,
        }
        if (data.teacherName) setSignatureName(data.teacherName)
        setPhase({ kind: "agreement", data })
      } catch (err) {
        if (!cancelled) {
          setPhase({
            kind: "error",
            message: (err as Error).message ?? "Network error. Please try again.",
          })
        }
      }
    }
    void fetchData()
    return () => {
      cancelled = true
    }
  }, [token])

  // Track scroll position in agreement container
  const handleAgreementScroll = useCallback(() => {
    const el = agreementRef.current
    if (!el) return
    const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 20
    if (atBottom) setHasScrolledToBottom(true)
  }, [])

  // Check if agreement content is short enough to not need scrolling
  useEffect(() => {
    if (phase.kind !== "agreement") return
    const el = agreementRef.current
    if (!el) return
    // If content doesn't overflow, consider it "scrolled"
    requestAnimationFrame(() => {
      if (el.scrollHeight <= el.clientHeight + 20) {
        setHasScrolledToBottom(true)
      }
    })
  }, [phase.kind])

  // Step 1: Sign agreement
  const handleSign = async (e: React.FormEvent) => {
    e.preventDefault()
    if (phase.kind !== "agreement") return
    if (!agreedToTerms || !signatureName.trim()) return

    setSubmitting(true)
    setServerError(null)
    try {
      const res = await fetch(`${API_BASE}/api/onboard/${token}/sign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signer_name: signatureName.trim(), accepted: true }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setServerError(json.error ?? json.message ?? `Request failed (${res.status})`)
        return
      }
      if (phase.data.requiresPayoutDetails) {
        setPhase({ kind: "payout", data: phase.data })
      } else {
        setPhase({ kind: "done", academyName: phase.data.academyName })
      }
    } catch (err) {
      setServerError((err as Error).message ?? "Network error.")
    } finally {
      setSubmitting(false)
    }
  }

  // Step 2: Submit payout details
  const handlePayoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (phase.kind !== "payout") return
    if (!confirmedDetails || !panNumber.trim()) return

    setSubmitting(true)
    setServerError(null)

    const body: Record<string, string> = {
      payout_method: payoutMethod,
      pan_number: panNumber.trim(),
    }
    if (gstNumber.trim()) body.gst_number = gstNumber.trim()
    if (payoutMethod === "bank_transfer") {
      body.account_holder = accountHolderName.trim()
      body.account_number = accountNumber.trim()
      body.ifsc_code = ifscCode.trim()
    } else if (payoutMethod === "upi") {
      body.upi_id = upiId.trim()
    }

    try {
      const res = await fetch(`${API_BASE}/api/onboard/${token}/payout-details`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setServerError(json.error ?? json.message ?? `Request failed (${res.status})`)
        return
      }
      setPhase({ kind: "done", academyName: phase.data.academyName })
    } catch (err) {
      setServerError((err as Error).message ?? "Network error.")
    } finally {
      setSubmitting(false)
    }
  }

  const canSignAgreement = hasScrolledToBottom && agreedToTerms && signatureName.trim().length > 0

  const canSubmitPayout = (() => {
    if (!confirmedDetails || !panNumber.trim()) return false
    if (payoutMethod === "bank_transfer") {
      return !!(accountHolderName.trim() && accountNumber.trim() && ifscCode.trim())
    }
    if (payoutMethod === "upi") {
      return !!upiId.trim()
    }
    return true // razorpay — no extra fields needed
  })()

  // Derive current step index for the stepper
  const currentStep =
    phase.kind === "loading" || phase.kind === "error" || phase.kind === "agreement"
      ? 0
      : phase.kind === "payout"
        ? 1
        : 2

  // Whether payout step exists (for stepper display)
  const hasPayout =
    phase.kind === "payout" ||
    (phase.kind === "agreement" && phase.data.requiresPayoutDetails) ||
    (phase.kind === "done" && currentStep === 2)

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/40 px-4 py-12">
      <div className="mx-auto w-full max-w-lg">
        {/* Stepper */}
        {phase.kind !== "loading" && phase.kind !== "error" && (
          <div className="mb-6 flex items-center justify-center gap-2 text-sm">
            <StepIndicator
              step={1}
              label="Agreement"
              icon={<FileSignature className="h-3.5 w-3.5" />}
              status={currentStep === 0 ? "current" : "complete"}
            />
            {hasPayout && (
              <>
                <StepConnector active={currentStep >= 1} />
                <StepIndicator
                  step={2}
                  label="Payout Details"
                  icon={<Wallet className="h-3.5 w-3.5" />}
                  status={
                    currentStep < 1
                      ? "upcoming"
                      : currentStep === 1
                        ? "current"
                        : "complete"
                  }
                />
              </>
            )}
            <StepConnector active={currentStep >= 2} />
            <StepIndicator
              step={hasPayout ? 3 : 2}
              label="Done"
              icon={<CheckCircle2 className="h-3.5 w-3.5" />}
              status={currentStep < 2 ? "upcoming" : "current"}
            />
          </div>
        )}

        {/* Loading */}
        {phase.kind === "loading" && (
          <Card>
            <CardContent className="flex items-center justify-center gap-3 p-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading onboarding details...
            </CardContent>
          </Card>
        )}

        {/* Error */}
        {phase.kind === "error" && (
          <Card>
            <CardContent className="space-y-4 p-6 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/15 text-destructive">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <h1 className="text-xl font-bold">Invalid Link</h1>
              <p className="text-sm text-muted-foreground">{phase.message}</p>
            </CardContent>
          </Card>
        )}

        {/* Step 1: Agreement */}
        {phase.kind === "agreement" && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Building2 className="h-4 w-4" />
                <span className="text-xs font-medium uppercase tracking-wide">
                  {phase.data.academyName}
                </span>
              </div>
              <CardTitle className="text-xl">Welcome! Review & Sign Agreement</CardTitle>
              {phase.data.welcomeMessage && (
                <p className="text-sm text-muted-foreground">
                  {phase.data.welcomeMessage}
                </p>
              )}
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSign} className="space-y-4">
                {/* Agreement HTML */}
                <div
                  ref={agreementRef}
                  onScroll={handleAgreementScroll}
                  className="max-h-64 overflow-y-auto rounded-md border bg-muted/30 p-4 text-sm leading-relaxed prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: phase.data.agreementHtml }}
                />
                {!hasScrolledToBottom && (
                  <p className="text-xs text-muted-foreground text-center">
                    Please scroll to the bottom of the agreement to continue.
                  </p>
                )}

                {/* Agree checkbox */}
                <div className="flex items-start gap-2">
                  <Checkbox
                    id="agree-terms"
                    checked={agreedToTerms}
                    onCheckedChange={(v) => setAgreedToTerms(v === true)}
                    disabled={!hasScrolledToBottom}
                  />
                  <Label
                    htmlFor="agree-terms"
                    className={`text-sm leading-snug ${
                      !hasScrolledToBottom
                        ? "text-muted-foreground/50 cursor-not-allowed"
                        : "cursor-pointer"
                    }`}
                  >
                    I have read and agree to the terms above
                  </Label>
                </div>

                {/* Signature name */}
                <div className="space-y-1.5">
                  <Label htmlFor="signature-name">Full name for signature</Label>
                  <Input
                    id="signature-name"
                    placeholder="Enter your full name"
                    value={signatureName}
                    onChange={(e) => setSignatureName(e.target.value)}
                    required
                  />
                </div>

                {serverError && (
                  <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                    {serverError}
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full"
                  disabled={!canSignAgreement || submitting}
                >
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <FileSignature className="mr-2 h-4 w-4" />
                  Sign & Continue
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Payout Details */}
        {phase.kind === "payout" && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Building2 className="h-4 w-4" />
                <span className="text-xs font-medium uppercase tracking-wide">
                  {phase.data.academyName}
                </span>
              </div>
              <CardTitle className="text-xl">Payout & KYC Details</CardTitle>
              <p className="text-sm text-muted-foreground">
                Please provide your payout information to receive payments.
              </p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePayoutSubmit} className="space-y-5">
                {/* Payout method */}
                <div className="space-y-2">
                  <Label>Payout Method</Label>
                  <RadioGroup
                    value={payoutMethod}
                    onValueChange={(v) => setPayoutMethod(v as PayoutMethod)}
                    className="space-y-2"
                  >
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="bank_transfer" id="pm-bank" />
                      <Label htmlFor="pm-bank" className="cursor-pointer font-normal">
                        Bank Transfer
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="upi" id="pm-upi" />
                      <Label htmlFor="pm-upi" className="cursor-pointer font-normal">
                        UPI
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="razorpay_linked" id="pm-razorpay" />
                      <Label htmlFor="pm-razorpay" className="cursor-pointer font-normal">
                        Razorpay Linked Account
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                {/* Bank Transfer fields */}
                {payoutMethod === "bank_transfer" && (
                  <div className="space-y-3 rounded-md border bg-muted/30 p-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="account-holder">Account Holder Name</Label>
                      <Input
                        id="account-holder"
                        placeholder="Name as on bank account"
                        value={accountHolderName}
                        onChange={(e) => setAccountHolderName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="account-number">Account Number</Label>
                      <Input
                        id="account-number"
                        placeholder="Enter account number"
                        value={accountNumber}
                        onChange={(e) => setAccountNumber(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="ifsc">IFSC Code</Label>
                      <Input
                        id="ifsc"
                        placeholder="e.g. SBIN0001234"
                        value={ifscCode}
                        onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                        required
                      />
                    </div>
                  </div>
                )}

                {/* UPI field */}
                {payoutMethod === "upi" && (
                  <div className="space-y-3 rounded-md border bg-muted/30 p-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="upi-id">UPI ID</Label>
                      <Input
                        id="upi-id"
                        placeholder="e.g. name@upi"
                        value={upiId}
                        onChange={(e) => setUpiId(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                )}

                {/* KYC fields */}
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="pan">PAN Number</Label>
                    <Input
                      id="pan"
                      placeholder="e.g. ABCDE1234F"
                      value={panNumber}
                      onChange={(e) => setPanNumber(e.target.value.toUpperCase())}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="gst">
                      GST Number{" "}
                      <span className="text-muted-foreground font-normal">(optional)</span>
                    </Label>
                    <Input
                      id="gst"
                      placeholder="e.g. 22ABCDE1234F1Z5"
                      value={gstNumber}
                      onChange={(e) => setGstNumber(e.target.value.toUpperCase())}
                    />
                  </div>
                </div>

                {/* Confirm checkbox */}
                <div className="flex items-start gap-2">
                  <Checkbox
                    id="confirm-details"
                    checked={confirmedDetails}
                    onCheckedChange={(v) => setConfirmedDetails(v === true)}
                  />
                  <Label htmlFor="confirm-details" className="text-sm leading-snug cursor-pointer">
                    I confirm the above details are accurate
                  </Label>
                </div>

                {serverError && (
                  <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                    {serverError}
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full"
                  disabled={!canSubmitPayout || submitting}
                >
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <Wallet className="mr-2 h-4 w-4" />
                  Submit & Complete Onboarding
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Done */}
        {phase.kind === "done" && (
          <Card>
            <CardContent className="space-y-4 p-8 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 animate-in zoom-in-50 duration-300">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <h1 className="text-2xl font-bold">
                Welcome to {phase.academyName}!
              </h1>
              <p className="text-sm text-muted-foreground">
                Your onboarding is complete. You can now access your dashboard to get started.
              </p>
              <Button asChild className="w-full">
                <Link href="/dashboard">Go to Dashboard</Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Stepper sub-components                                              */
/* ------------------------------------------------------------------ */

function StepIndicator({
  step,
  label,
  icon,
  status,
}: {
  step: number
  label: string
  icon: React.ReactNode
  status: "upcoming" | "current" | "complete"
}) {
  const base = "flex items-center gap-1.5 text-xs font-medium whitespace-nowrap"
  const colors =
    status === "complete"
      ? "text-emerald-600"
      : status === "current"
        ? "text-foreground"
        : "text-muted-foreground/50"

  return (
    <span className={`${base} ${colors}`}>
      <span
        className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold ${
          status === "complete"
            ? "bg-emerald-100 text-emerald-600"
            : status === "current"
              ? "bg-foreground text-background"
              : "bg-muted text-muted-foreground/50"
        }`}
      >
        {status === "complete" ? (
          <CheckCircle2 className="h-3.5 w-3.5" />
        ) : (
          step
        )}
      </span>
      <span className="hidden sm:inline">{label}</span>
    </span>
  )
}

function StepConnector({ active }: { active: boolean }) {
  return (
    <span
      className={`h-px w-8 ${active ? "bg-emerald-400" : "bg-border"}`}
    />
  )
}
