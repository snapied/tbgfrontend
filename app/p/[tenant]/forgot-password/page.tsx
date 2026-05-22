"use client"

// Branded "forgot password" surface for a tenant. Sends the email
// + tenant slug to /api/auth/reset-request so the resulting reset
// link lands back on /p/<tenant>/reset-password/<token> with the
// tenant chrome instead of the platform default.

import { use, useMemo, useState } from "react"
import Link from "next/link"
import { CheckCircle2, Loader2, Mail } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useTenantBrand } from "@/lib/tenant-brand"

export default function PortalForgotPasswordPage({
  params,
}: {
  params: Promise<{ tenant: string }>
}) {
  const { tenant } = use(params)
  const brand = useTenantBrand()
  const [email, setEmail] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)

  const emailValid = useMemo(
    () => !email || /^[^@]+@[^@]+\.[^@]+$/.test(email),
    [email],
  )
  const canSubmit = !!email && emailValid && !submitting

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setSubmitting(true)
    try {
      // The API always returns 200 to avoid leaking which addresses
      // have accounts. We mirror that on the client — show "we
      // sent a link if the address matches" regardless of the
      // backing existence.
      await fetch("/api/auth/reset-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), tenant }),
      }).catch(() => {})
      setSent(true)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-md px-6 py-12 lg:px-8">
      <Card>
        <CardContent className="space-y-5 p-6">
          {sent ? (
            <div className="space-y-3 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success/15 text-success">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h1 className="text-xl font-bold">Check your inbox</h1>
              <p className="text-sm text-muted-foreground">
                If <span className="font-medium text-foreground">{email}</span> has an account at {brand.name}, we just sent a link to reset the password. The link works for the next 60 minutes.
              </p>
              <Button asChild variant="ghost" className="w-full">
                <Link href={`/p/${tenant}/login`}>Back to sign in</Link>
              </Button>
            </div>
          ) : (
            <>
              <div>
                <h1 className="font-serif text-2xl font-bold tracking-tight">
                  Reset your password
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Type the email you sign in with. We&apos;ll send you a link to set a new password.
                </p>
              </div>

              <form onSubmit={submit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="fp-email">Email</Label>
                  <Input
                    id="fp-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value.toLowerCase())}
                    placeholder="you@example.com"
                    autoComplete="email"
                    autoFocus
                  />
                </div>
                <Button type="submit" className="w-full" disabled={!canSubmit}>
                  {submitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Mail className="mr-2 h-4 w-4" />
                  )}
                  Send reset link
                </Button>
              </form>

              <p className="border-t border-border pt-4 text-center text-xs text-muted-foreground">
                Remembered it?{" "}
                <Link
                  href={`/p/${tenant}/login`}
                  className="font-medium text-primary hover:underline"
                >
                  Back to sign in
                </Link>
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
