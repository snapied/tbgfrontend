"use client"

// /p/<tenant>/signup — student signup for THIS academy.
//
// Different audience from /signup (which creates a NEW academy
// workspace + admin user — the creator funnel). This one is for
// visitors who land on a tenant's public portal organically and want
// to buy a course / join the academy.
//
// Flow:
//   1. Visitor on /p/<slug>/store/<product> clicks Buy
//   2. If not logged in, they're routed here with ?next=/checkout/<id>
//   3. They fill the small form; we POST to /api/auth/student-signup
//      which creates a User with role=student in that tenant's Org
//   4. accessToken stored in localStorage, user added to local LMS
//      store + setCurrentUser, then we router.push the `next` URL so
//      checkout resumes exactly where they were.
//
// We deliberately keep the form minimal (name + email + password) so
// the friction between "I want this course" and "card details" is
// short — that's the whole reason this page exists.

import { use, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowRight, Loader2, Lock, Mail, UserPlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useTenantBrand } from "@/lib/tenant-brand"
import { generateId, useLMS } from "@/lib/lms-store"
import { toast } from "sonner"

function apiBase(): string {
  return (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000").replace(/\/$/, "")
}

// Same key as the access token used by lib/billing-client.ts so the
// student is authenticated against the backend right after signup.
const ACCESS_TOKEN_KEY = "thebigclass.accessToken"

interface SignupSuccess {
  accessToken: string
  user: { id: number; email: string; display_name: string; role: string }
  organisation: { id: number; name: string; slug: string }
}

export default function TenantStudentSignupPage({
  params,
}: {
  params: Promise<{ tenant: string }>
}) {
  const { tenant } = use(params)
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams?.get("next") ?? `/p/${tenant}/my`
  const brand = useTenantBrand()
  const { setCurrentUser, addUser } = useLMS()

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const emailValid = useMemo(
    () => !email || /^[^@]+@[^@]+\.[^@]+$/.test(email),
    [email],
  )
  const canSubmit =
    !!name.trim() &&
    !!email.trim() &&
    emailValid &&
    password.length >= 8 &&
    !submitting

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch(`${apiBase()}/api/auth/student-signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          tenantSlug: tenant,
          email: email.trim().toLowerCase(),
          password,
          displayName: name.trim(),
        }),
      })
      const body = (await res.json().catch(() => ({}))) as
        | SignupSuccess
        | { error?: string }
      if (!res.ok) {
        const message =
          (body as { error?: string }).error ??
          (res.status === 409
            ? "An account with that email already exists. Sign in instead."
            : "Sign-up failed. Please try again.")
        setError(message)
        setSubmitting(false)
        return
      }
      const ok = body as SignupSuccess
      // Persist the access token under the same key the billing
      // client + dashboard auth gate read from, so the new student
      // is immediately authenticated against the backend.
      try { window.localStorage.setItem(ACCESS_TOKEN_KEY, ok.accessToken) } catch { /* tolerable */ }

      // Mirror the new user into the per-tenant LMS store so the
      // tenant portal recognises them as a known user (powers
      // "Welcome, <name>", entitlement lookups, /my/* gating).
      const localUser = {
        id: generateId("user"),
        name: ok.user.display_name,
        email: ok.user.email,
        role: "student" as const,
        createdAt: new Date().toISOString(),
      }
      addUser(localUser)
      setCurrentUser(localUser)
      toast.success(`Welcome to ${brand.name || ok.organisation.name}!`)
      router.push(next)
    } catch (err) {
      setError((err as Error).message || "Sign-up failed. Please try again.")
      setSubmitting(false)
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-12">
      <Card>
        <CardContent className="space-y-5 p-6">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <UserPlus className="h-3.5 w-3.5" />
              Join {brand.name || "this academy"}
            </div>
            <h1 className="mt-3 font-serif text-2xl font-bold">Create your account</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {next.startsWith("/checkout/")
                ? "Quick sign-up so we can complete your purchase and grant access right after payment."
                : "Track your courses, attend live classes, and download materials — all under one login."}
            </p>
          </div>

          <form onSubmit={submit} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="su-name">Your name</Label>
              <Input
                id="su-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Aanya Sharma"
                autoComplete="name"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="su-email">Email</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="su-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  className="pl-9"
                  aria-invalid={!!email && !emailValid}
                />
              </div>
              {!!email && !emailValid && (
                <p className="text-[11px] text-destructive">Doesn&apos;t look like a valid email.</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="su-pw">Password</Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="su-pw"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  autoComplete="new-password"
                  className="pl-9"
                />
              </div>
            </div>

            {error && (
              <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" size="lg" disabled={!canSubmit}>
              {submitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ArrowRight className="mr-2 h-4 w-4" />
              )}
              Create account
            </Button>
          </form>

          <p className="text-center text-xs text-muted-foreground">
            Already have an account?{" "}
            <Link
              href={`/p/${tenant}/login${next ? `?next=${encodeURIComponent(next)}` : ""}`}
              className="font-semibold text-primary hover:underline"
            >
              Sign in
            </Link>
          </p>
          <p className="text-center text-[11px] text-muted-foreground/80">
            By continuing you agree to {brand.name || "the academy"}&apos;s terms.
          </p>
        </CardContent>
      </Card>
    </main>
  )
}
