"use client"

import { use, useEffect, useState } from "react"
import Link from "next/link"
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Loader2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Logo } from "@/components/brand/logo"
import { useTenant } from "@/lib/tenant-store"

type Phase =
  | { kind: "checking" }
  | { kind: "verified"; email: string }
  | { kind: "invalid"; reason: string }

// Global localStorage key — every successfully-verified email is added here.
// The TenantProvider isn't authoritative for verification (it's frontend-only)
// and the verify page may run before tenants have hydrated, so this backup
// store lets the dashboard back-fill `emailVerifiedAt` on any tenant whose
// owner email appears in the set. Survives page reloads in the same browser
// origin. Does not help across browsers/devices — that needs server auth.
const VERIFIED_EMAILS_KEY = "thebigclass.global.verifiedEmails.v1"

function rememberVerifiedEmail(email: string) {
  try {
    const raw = window.localStorage.getItem(VERIFIED_EMAILS_KEY)
    const set = new Set<string>(raw ? (JSON.parse(raw) as string[]) : [])
    set.add(email.toLowerCase())
    window.localStorage.setItem(VERIFIED_EMAILS_KEY, JSON.stringify([...set]))
  } catch { /* ignore quota / parse errors */ }
}

export default function VerifyEmailPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)
  const { tenants, updateTenant, isHydrated } = useTenant()
  const [phase, setPhase] = useState<Phase>({ kind: "checking" })
  // Email returned by the API — held in state so the stamping effect below
  // can react when the tenant store finishes hydrating, even if hydration
  // completes *after* the API call returns.
  const [verifiedEmail, setVerifiedEmail] = useState<string | null>(null)

  // Step 1 — validate the token. Runs once on mount; doesn't touch tenant
  // state so it stays decoupled from the provider's hydration timing.
  useEffect(() => {
    let cancelled = false
    const check = async () => {
      try {
        const res = await fetch("/api/auth/verify-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        })
        const json = (await res.json().catch(() => ({}))) as { ok?: boolean; email?: string; error?: string }
        if (cancelled) return
        if (!res.ok || !json.ok || !json.email) {
          setPhase({ kind: "invalid", reason: json.error ?? "This link is invalid." })
          return
        }
        const email = json.email.toLowerCase()
        // Stash in the global "verified emails" set immediately so even if
        // tenants never hydrate (e.g. user opened the link in a fresh tab
        // before TenantProvider mounted on another route), a future page
        // load can still back-fill the verification.
        rememberVerifiedEmail(email)
        setVerifiedEmail(email)
        setPhase({ kind: "verified", email })
      } catch (err) {
        if (!cancelled) setPhase({ kind: "invalid", reason: (err as Error).message ?? "Network error." })
      }
    }
    void check()
    return () => { cancelled = true }
  }, [token])

  // Step 2 — once we have an email AND the tenant store has finished hydrating
  // from localStorage, stamp every matching tenant as verified. Splitting this
  // from Step 1 is what fixes the stale-closure bug: previously the loop ran
  // against the initial SEED_TENANTS before hydration replaced it.
  useEffect(() => {
    if (!verifiedEmail || !isHydrated) return
    for (const t of tenants) {
      if (t.ownerEmail.toLowerCase() === verifiedEmail && !t.emailVerifiedAt) {
        updateTenant(t.id, { emailVerifiedAt: new Date().toISOString() })
      }
    }
  }, [verifiedEmail, isHydrated, tenants, updateTenant])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 py-12">
      <div className="mx-auto w-full max-w-sm">
        <div className="mb-6 flex justify-center"><Logo size="md" /></div>

        {phase.kind === "checking" && (
          <Card>
            <CardContent className="flex items-center justify-center gap-3 p-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Checking your link…
            </CardContent>
          </Card>
        )}

        {phase.kind === "verified" && (
          <Card>
            <CardContent className="space-y-4 p-6 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success/15 text-success">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h1 className="text-xl font-bold">Email verified</h1>
              <p className="text-sm text-muted-foreground">
                Thanks — we&apos;ve confirmed <span className="font-medium text-foreground">{phase.email}</span>.
              </p>
              <Button asChild className="w-full">
                <Link href="/dashboard">
                  Go to dashboard <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
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
              <Button asChild className="w-full">
                <Link href="/dashboard">Open dashboard</Link>
              </Button>
              <p className="text-[11px] text-muted-foreground">
                You can re-send a verification email from your dashboard banner.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
