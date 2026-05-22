"use client"

// Tenant-branded reset-password page.
//
// Reuses the same verify-then-prompt flow as the platform-level
// /reset-password/[token], but rendered inside the tenant layout
// so the page picks up the workspace's logo, colors, and fonts.
// The verifier returns the tenant slug bound to the token; we
// hard-redirect to the platform page (or 404) if the token's
// tenant doesn't match the URL — keeps tokens from being
// inadvertently consumed inside the wrong portal.

import { use, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { AlertTriangle, ArrowLeft, CheckCircle2, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  PasswordStrengthInput,
  MIN_PASSWORD_SCORE,
} from "@/components/forms/password-strength-input"
import { useTenantBrand } from "@/lib/tenant-brand"

type Phase =
  | { kind: "checking" }
  | { kind: "valid"; email: string }
  | { kind: "invalid"; reason: string }
  | { kind: "done" }

export default function PortalResetPasswordPage({
  params,
}: {
  params: Promise<{ tenant: string; token: string }>
}) {
  const { tenant, token } = use(params)
  const router = useRouter()
  const brand = useTenantBrand()

  const [phase, setPhase] = useState<Phase>({ kind: "checking" })
  const [pw, setPw] = useState("")
  const [pwValid, setPwValid] = useState(false)
  const [confirm, setConfirm] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const res = await fetch("/api/auth/reset-verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        })
        const json = (await res.json().catch(() => ({}))) as {
          ok?: boolean
          email?: string
          tenant?: string
          error?: string
        }
        if (cancelled) return
        if (!res.ok || !json.ok || !json.email) {
          setPhase({ kind: "invalid", reason: json.error ?? "This link is invalid." })
          return
        }
        // Tokens issued for a different workspace shouldn't be
        // consumable from this one. The server is the source of
        // truth here — we don't trust the URL slug for routing
        // decisions. Refuse the mismatch.
        if (json.tenant && json.tenant !== tenant) {
          setPhase({
            kind: "invalid",
            reason: "This link belongs to a different workspace. Open it from the email and try again.",
          })
          return
        }
        setPhase({ kind: "valid", email: json.email })
      } catch (err) {
        if (!cancelled) {
          setPhase({ kind: "invalid", reason: (err as Error).message ?? "Network error." })
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [token, tenant])

  const userInputs = useMemo(
    () => [phase.kind === "valid" ? phase.email : "", brand.name],
    [phase, brand.name],
  )
  const canSubmit =
    phase.kind === "valid" && pwValid && !!confirm && pw === confirm && !submitting

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setSubmitting(true)
    setServerError(null)
    try {
      const res = await fetch("/api/auth/reset-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: pw }),
      })
      const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string }
      if (!res.ok || !json.ok) {
        setServerError(json.error ?? `Request failed (${res.status})`)
        return
      }
      setPhase({ kind: "done" })
      setTimeout(() => router.push(`/p/${tenant}/login`), 1200)
    } catch (err) {
      setServerError((err as Error).message ?? "Network error.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-md px-6 py-12 lg:px-8">
      {phase.kind === "checking" && (
        <Card>
          <CardContent className="flex items-center justify-center gap-3 p-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Checking your link…
          </CardContent>
        </Card>
      )}

      {phase.kind === "invalid" && (
        <Card>
          <CardContent className="space-y-4 p-6 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/15 text-destructive">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <h1 className="text-xl font-bold">Link no good</h1>
            <p className="text-sm text-muted-foreground">{phase.reason}</p>
            <div className="grid gap-2">
              <Button asChild className="w-full">
                <Link href={`/p/${tenant}/forgot-password`}>Request a new link</Link>
              </Button>
              <Button asChild variant="ghost" className="w-full">
                <Link href={`/p/${tenant}/login`}>
                  <ArrowLeft className="mr-2 h-4 w-4" /> Back to sign in
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {phase.kind === "valid" && (
        <Card>
          <CardContent className="space-y-5 p-6">
            <div>
              <h1 className="font-serif text-2xl font-bold tracking-tight">
                Choose a new password
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                For <span className="font-medium text-foreground">{phase.email}</span> on {brand.name}.
              </p>
            </div>

            <form onSubmit={submit} className="space-y-4">
              <PasswordStrengthInput
                label="New password"
                value={pw}
                onChange={(next, valid) => {
                  setPw(next)
                  setPwValid(valid)
                }}
                confirmValue={confirm}
                onConfirmChange={setConfirm}
                userInputs={userInputs}
                minScore={MIN_PASSWORD_SCORE}
                autoFocus
              />

              {serverError && (
                <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                  {serverError}
                </div>
              )}

              <Button type="submit" className="w-full" disabled={!canSubmit}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Set new password
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {phase.kind === "done" && (
        <Card>
          <CardContent className="space-y-3 p-6 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success/15 text-success">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <h1 className="text-xl font-bold">Password updated</h1>
            <p className="text-sm text-muted-foreground">Taking you to sign in…</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
