"use client"

import { Suspense, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Eye, EyeOff, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Logo } from "@/components/brand/logo"
import { useTenant } from "@/lib/tenant-store"
import { ACCESS_TOKEN_KEY } from "@/lib/billing-client"
import { postAuthDestination } from "@/lib/post-auth-redirect"
import { AuthRedirectGate } from "@/components/auth/auth-redirect-gate"

// The login page lives outside the LMS provider tree, so we can't
// read `currentUser` via the React hook to decide where to route.
// Instead we peek at the tenant-scoped users blob in localStorage —
// same key the LMS store hydrates from — to find the role of the
// person who just signed in. Email-only lookup; the form no longer
// accepts a phone number.
function lookupRoleFromTenantStore(
  tenantSlug: string,
  email: string,
): "admin" | "instructor" | "student" | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.localStorage.getItem(
      `thebigclass.t.${tenantSlug}.lms.users.v1`,
    )
    if (!raw) return null
    const users = JSON.parse(raw) as Array<{
      email?: string
      role?: "admin" | "instructor" | "student"
    }>
    if (!Array.isArray(users)) return null
    const wanted = email.toLowerCase().trim()
    const match = users.find(
      (u) => (u.email?.toLowerCase() ?? "") === wanted,
    )
    return match?.role ?? null
  } catch {
    return null
  }
}

// Permissive but practical email check — same shape the rest of the
// app uses. Server still validates strictly; this just keeps obvious
// typos out of the request.
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

// `useSearchParams` requires a Suspense boundary in Next 14+, otherwise
// the build de-opts the whole page to dynamic. Wrap the form in an
// inner component and Suspense it at the export so the static shell
// (header, hero image) stays prerenderable.
export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageInner />
    </Suspense>
  )
}

function LoginPageInner() {
  const { findTenantByLogin, switchTenant } = useTenant()
  const searchParams = useSearchParams()
  // `?next=…` lets surfaces like the course detail page send a
  // visitor here and have them land back on the original page after
  // successful sign-in. `postAuthDestination` validates the value to
  // block open-redirect tricks.
  const nextParam = searchParams.get("next")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    // Email-only login. Phone / WhatsApp identifier was removed —
    // the workspace's WhatsApp number is still collected at signup
    // (for class-reminder fan-out), but not as a login key.
    const id = email.trim().toLowerCase()
    if (!id || !EMAIL_RE.test(id)) {
      setError("Enter a valid email address.")
      setIsLoading(false)
      return
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.")
      setIsLoading(false)
      return
    }

    // Call the backend. It's the only source that knows which
    // workspace this email belongs to — the frontend's localStorage
    // tenant list is per-browser and won't help a fresh browser. If
    // the backend is unreachable we still try the demo / localStorage
    // path so dev usage keeps working when the API is down.
    const apiBase = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000").replace(/\/$/, "")
    let backendOk = false
    let backendRole: "admin" | "instructor" | "student" | null = null
    let backendSlug: string | null = null
    let backendOrgName: string | null = null
    let backendUser: { id?: number; email?: string; display_name?: string } | null = null
    try {
      const res = await fetch(`${apiBase}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: id, password }),
      })
      if (res.ok) {
        const body = (await res.json()) as {
          accessToken?: string
          user?: { id?: number; email?: string; display_name?: string; role?: "admin" | "instructor" | "student" }
          organisation?: { id?: number; name?: string; slug?: string | null } | null
        }
        if (body.accessToken) {
          window.localStorage.setItem(ACCESS_TOKEN_KEY, body.accessToken)
          backendOk = true
          backendRole = body.user?.role ?? null
          backendUser = body.user ?? null
          backendSlug = body.organisation?.slug ?? null
          backendOrgName = body.organisation?.name ?? null
        }
      } else if (res.status === 401) {
        setError("Wrong email or password.")
        setIsLoading(false)
        return
      }
    } catch {
      // Network error — backend unreachable. Fall through to demo.
    }

    // Pick the authoritative tenant slug:
    //   1. Whatever the backend told us — works for fresh browsers.
    //   2. The localStorage tenant matcher — works for offline / demo.
    const localTenant = findTenantByLogin(id)
    const slug = backendSlug || localTenant?.slug || null

    if (!slug && !backendOk) {
      setError("No account found for this email.")
      setIsLoading(false)
      return
    }
    if (!slug) {
      // Backend authenticated but didn't return a slug AND nothing
      // in localStorage matches. Without a slug the dashboard has
      // no workspace to mount under, so refuse instead of pushing
      // a guaranteed broken state.
      setError("Your workspace isn't set up yet. Try signing up to create one.")
      setIsLoading(false)
      return
    }

    // Lock in the tenant override BEFORE anything reads it. switchTenant
    // writes the localStorage key that readCurrentTenantSlug() reads,
    // so the LMSProvider that mounts after the hard nav reads the
    // right workspace's data.
    if (localTenant) switchTenant(localTenant.slug)
    else switchTenant(slug)

    // Seed a Tenant record in the platform tenants blob so the
    // dashboard's TenantProvider can resolve currentTenant on the
    // next mount. Without this, a fresh browser arrives at /dashboard
    // with OVERRIDE_KEY pointing at the user's slug but the local
    // tenants array only containing the seed "platform" row —
    // currentTenant returns null and every workspace-bound surface
    // (brand editor, customer URLs, plan badge) breaks until the
    // user signs up again. The record is intentionally minimal —
    // a fuller payload arrives when the dashboard pulls from /api
    // — but it's enough for currentTenant lookups to succeed.
    if (!localTenant && typeof window !== "undefined") {
      try {
        const TENANTS_KEY = "thebigclass.platform.tenants.v1"
        const raw = window.localStorage.getItem(TENANTS_KEY)
        const arr = raw ? (JSON.parse(raw) as Array<{ id?: string; slug?: string }>) : []
        const list = Array.isArray(arr) ? arr : []
        if (!list.some((t) => (t.slug ?? "").toLowerCase() === slug.toLowerCase())) {
          const stub = {
            id: `tenant-${slug}-${Date.now().toString(36)}`,
            slug,
            name: backendOrgName ?? slug,
            customDomainStatus: "none" as const,
            plan: "free" as const,
            status: "active" as const,
            ownerEmail: backendUser?.email ?? id,
            ownerName: backendUser?.display_name ?? id.split("@")[0],
            createdAt: new Date().toISOString(),
          }
          window.localStorage.setItem(
            TENANTS_KEY,
            JSON.stringify([stub, ...list]),
          )
        }
      } catch { /* quota / private browsing — best effort */ }
    }

    // Seed the tenant's LMS roster with this user if it's missing
    // (fresh browser case). Without this, /dashboard mounts with an
    // empty users array, the pendingLogin handler finds no match,
    // and currentUser stays null forever — the spinner-of-doom.
    if (typeof window !== "undefined") {
      try {
        const usersKey = `thebigclass.t.${slug}.lms.users.v1`
        const currentUserKey = `thebigclass.t.${slug}.lms.currentUserId.v1`
        const signedOutKey = `thebigclass.t.${slug}.signedOut.v1`
        const raw = window.localStorage.getItem(usersKey)
        const arr = raw ? (JSON.parse(raw) as Array<{ id: string; email?: string }>) : []
        const existing = Array.isArray(arr)
          ? arr.find((u) => (u.email ?? "").toLowerCase() === id)
          : undefined
        if (existing?.id) {
          window.localStorage.setItem(currentUserKey, existing.id)
        } else {
          const ownerId = `user-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
          const ownerUser = {
            id: ownerId,
            name: backendUser?.display_name?.trim() || id.split("@")[0],
            email: id,
            role: (backendRole ?? "admin") as "admin" | "instructor" | "student",
            createdAt: new Date().toISOString(),
          }
          const nextArr = Array.isArray(arr) ? [ownerUser, ...arr] : [ownerUser]
          window.localStorage.setItem(usersKey, JSON.stringify(nextArr))
          window.localStorage.setItem(currentUserKey, ownerId)
        }
        window.localStorage.removeItem(signedOutKey)
      } catch { /* quota / private browsing — best effort */ }
    }

    // Drop a breadcrumb so lms-store stamps lastLoginAt on the
    // matching user row when it hydrates.
    try {
      window.localStorage.setItem(
        "thebigclass.pendingLogin",
        JSON.stringify({ identifier: id, at: new Date().toISOString() }),
      )
    } catch { /* ignore */ }

    // Resolve the role and pick the destination. Students go to the
    // tenant-scoped /my; admins/instructors go to /dashboard.
    const role: "admin" | "instructor" | "student" =
      backendRole ??
      lookupRoleFromTenantStore(slug, id) ??
      "admin"
    const destination = postAuthDestination({
      user: { role },
      tenantSlug: slug,
      nextPath: nextParam,
    })

    // Hard reload — soft nav keeps the root-mounted LMSProvider
    // running with whatever slug it had on the /login mount
    // (typically an anonymous bucket with no users). /signup uses
    // the same trick for the same reason.
    window.location.href = destination
  }

  return (
    <div className="flex min-h-screen">
      {/* Bounce already-signed-in users into wherever they belong
          (teacher → /dashboard, student → /p/<tenant>/my) so a
          signed-in user can never see the login form. */}
      <AuthRedirectGate />
      {/* Left Side - Form */}
      <div className="flex flex-1 flex-col justify-center px-6 py-12 lg:px-8">
        <div className="mx-auto w-full max-w-sm">
          {/* Logo */}
          <Link href="/" className="mb-10 inline-flex">
            <Logo size="lg" />
          </Link>

          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Welcome back
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Sign in to access your courses, live classes, and certificates.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-6">
            {error && (
              <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  inputMode="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  autoComplete="username email"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Link
                    href="/forgot-password"
                    className="text-sm font-medium text-primary hover:text-primary/80"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    autoComplete="current-password"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Minimum 8 characters, at least one letter and number
                </p>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign in"
              )}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              {"Don't have an account? "}
              <Link href="/signup" className="font-medium text-primary hover:text-primary/80">
                Register your workspace
              </Link>
            </p>
          </form>
        </div>
      </div>

      {/* Right Side - Visual */}
      <div className="relative hidden lg:flex lg:flex-1 lg:flex-col lg:justify-end lg:px-12 pb-24">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <img src="/images/auth/login-bg.png" alt="Instructor in cafe" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent" />
        </div>

        <div className="relative z-10 max-w-lg">
          <blockquote className="text-xl font-medium text-white">
            &quot;The Big Class has transformed how we issue certificates. What used to take days now takes minutes.&quot;
          </blockquote>
          <div className="mt-6">
            <p className="font-semibold text-white">Dr. Emily</p>
            <p className="text-sm text-white/80">Director of Training, TechEd Institute</p>
          </div>

          {/* Stats */}
          <div className="mt-12 grid grid-cols-3 gap-8 border-t border-white/20 pt-8">
            <div>
              <p className="text-3xl font-bold text-white">50K+</p>
              <p className="text-sm text-white/80">Certificates issued</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-white">500+</p>
              <p className="text-sm text-white/80">Organisations</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-white">99.9%</p>
              <p className="text-sm text-white/80">Uptime</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
