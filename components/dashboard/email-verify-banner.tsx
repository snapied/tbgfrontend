"use client"

import { useState } from "react"
import { CheckCircle2, Loader2, Mail, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTenant } from "@/lib/tenant-store"

// Soft banner above the dashboard. Asks the user to verify their email but
// doesn't block the app. Auto-hides when the tenant has `emailVerifiedAt`.
// Resend is throttled to once a minute so a worried user can't pound it.

const RESEND_THROTTLE_MS = 60_000

export function EmailVerifyBanner() {
  const { currentTenant, updateTenant } = useTenant()
  const [dismissed, setDismissed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [justSent, setJustSent] = useState(false)

  if (!currentTenant) return null
  if (currentTenant.emailVerifiedAt) return null
  if (dismissed) return null

  const lastSent = currentTenant.lastVerifyEmailSentAt
    ? new Date(currentTenant.lastVerifyEmailSentAt).getTime()
    : 0
  const canResend = Date.now() - lastSent > RESEND_THROTTLE_MS
  const secondsLeft = Math.max(0, Math.ceil((RESEND_THROTTLE_MS - (Date.now() - lastSent)) / 1000))

  const resend = async () => {
    if (!canResend || busy) return
    setBusy(true)
    try {
      await fetch("/api/auth/verify-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: currentTenant.ownerEmail, name: currentTenant.ownerName }),
      })
      updateTenant(currentTenant.id, { lastVerifyEmailSentAt: new Date().toISOString() })
      setJustSent(true)
      setTimeout(() => setJustSent(false), 4_000)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mb-4 flex flex-col gap-2 rounded-md border border-accent/30 bg-accent/10 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent/20 text-accent">
          <Mail className="h-3.5 w-3.5" />
        </span>
        <div>
          <p className="font-medium text-foreground">
            Verify your email
          </p>
          <p className="text-xs text-muted-foreground">
            We sent a verification link to <span className="font-medium text-foreground">{currentTenant.ownerEmail}</span>.
            Check your inbox — receipts and password resets won&apos;t reach you until you confirm.
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {justSent ? (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-success">
            <CheckCircle2 className="h-3.5 w-3.5" /> Sent — check inbox
          </span>
        ) : (
          <Button size="sm" onClick={resend} disabled={!canResend || busy}>
            {busy && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
            {canResend ? "Resend email" : `Wait ${secondsLeft}s`}
          </Button>
        )}
        <Button size="icon" variant="ghost" onClick={() => setDismissed(true)} title="Dismiss for this session">
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}
