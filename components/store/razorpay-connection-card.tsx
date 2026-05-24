"use client"

// Admin-facing card showing the Razorpay connection state + the
// webhook URL the admin needs to paste into the Razorpay dashboard.
// Sits on /dashboard/store so workspace owners stumble onto it
// while setting up their storefront (rather than burying it in a
// settings sub-route they may never visit).
//
// State:
//   • "Connected"   — NEXT_PUBLIC_RAZORPAY_KEY_ID is set AND the
//                     stub override flag is off. Real charges flow.
//   • "Stub mode"   — keys missing or the override flag is on.
//                     Checkout still works (orders auto-succeed) but
//                     nothing real moves.
// The hint about the webhook URL renders regardless — the admin
// usually wants to copy that BEFORE flipping out of stub mode so
// the very first real charge already has reconciliation wired up.

import { useEffect, useState } from "react"
import { Check, Copy, ExternalLink, ShieldCheck, Webhook } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"

export function RazorpayConnectionCard() {
  const connected =
    !!process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID &&
    process.env.NEXT_PUBLIC_PAYMENTS_STUB !== "1"

  // Compute the webhook URL on mount — needs `window.location.origin`
  // because the server doesn't know the public URL the buyer hits.
  // Empty string until the effect fires; the input shows a
  // placeholder in the meantime.
  const [webhookUrl, setWebhookUrl] = useState("")
  useEffect(() => {
    if (typeof window === "undefined") return
    setWebhookUrl(`${window.location.origin}/api/payments/razorpay/webhook`)
  }, [])

  const copyWebhookUrl = async () => {
    if (!webhookUrl) return
    try {
      await navigator.clipboard.writeText(webhookUrl)
      toast.success("Webhook URL copied — paste into Razorpay dashboard.")
    } catch {
      toast.error("Could not copy. Select the URL manually.")
    }
  }

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-semibold">Razorpay payments</span>
            {connected ? (
              <Badge variant="default" className="gap-1">
                <Check className="h-3 w-3" />
                Connected
              </Badge>
            ) : (
              <Badge variant="secondary">Stub mode</Badge>
            )}
          </div>
          <Button asChild variant="ghost" size="sm">
            <a
              href="https://dashboard.razorpay.com/app/webhooks"
              target="_blank"
              rel="noreferrer"
            >
              Open Razorpay
              <ExternalLink className="ml-1.5 h-3 w-3" />
            </a>
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          {connected
            ? "Real charges flow through the gateway. Add the webhook URL below to your Razorpay dashboard so renewals, failed charges, and second-device payments reconcile automatically."
            : "Checkout is running in stub mode — no real charges. Set RAZORPAY_KEY_ID + NEXT_PUBLIC_RAZORPAY_KEY_ID and unset NEXT_PUBLIC_PAYMENTS_STUB to switch on real payments."}
        </p>

        <div className="space-y-1.5">
          <label className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            <Webhook className="h-3.5 w-3.5" />
            Webhook URL
          </label>
          <div className="flex gap-2">
            <input
              readOnly
              value={webhookUrl}
              placeholder="https://your-host/api/payments/razorpay/webhook"
              onClick={(e) => e.currentTarget.select()}
              className="flex-1 rounded-md border border-input bg-muted px-3 py-1.5 font-mono text-xs"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={copyWebhookUrl}
              disabled={!webhookUrl}
            >
              <Copy className="mr-1 h-3.5 w-3.5" />
              Copy
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            In Razorpay dashboard → Settings → Webhooks → Add new. Subscribe to:{" "}
            <code className="rounded bg-muted px-1 font-mono">payment.captured</code>,{" "}
            <code className="rounded bg-muted px-1 font-mono">payment.failed</code>,{" "}
            <code className="rounded bg-muted px-1 font-mono">subscription.charged</code>,{" "}
            <code className="rounded bg-muted px-1 font-mono">subscription.halted</code>,{" "}
            <code className="rounded bg-muted px-1 font-mono">subscription.cancelled</code>. Set the secret to match{" "}
            <code className="rounded bg-muted px-1 font-mono">RAZORPAY_WEBHOOK_SECRET</code>{" "}
            from your <code className="rounded bg-muted px-1 font-mono">.env</code>.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
