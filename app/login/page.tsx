"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Logo } from "@/components/brand/logo"
import { useTenant } from "@/lib/tenant-store"
import { ACCESS_TOKEN_KEY } from "@/lib/billing-client"
import { postAuthDestination } from "@/lib/post-auth-redirect"

// The login page lives outside the LMS provider tree, so we can't
// read `currentUser` via the React hook to decide where to route.
// Instead we peek at the tenant-scoped users blob in localStorage —
// same key the LMS store hydrates from — to find the role of the
// person who just signed in.
function lookupRoleFromTenantStore(
  tenantSlug: string,
  identifier: string,
): "admin" | "instructor" | "student" | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.localStorage.getItem(
      `thebigclass.t.${tenantSlug}.lms.users.v1`,
    )
    if (!raw) return null
    const users = JSON.parse(raw) as Array<{
      email?: string
      phone?: string
      role?: "admin" | "instructor" | "student"
    }>
    if (!Array.isArray(users)) return null
    const wanted = identifier.toLowerCase().trim()
    const match = users.find(
      (u) =>
        (u.email?.toLowerCase() ?? "") === wanted ||
        (u.phone ?? "").replace(/\s/g, "") === wanted.replace(/\s/g, ""),
    )
    return match?.role ?? null
  } catch {
    return null
  }
}

export default function LoginPage() {
  const router = useRouter()
  const { findTenantByLogin, switchTenant } = useTenant()
  const [identifier, setIdentifier] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    const id = identifier.trim()
    if (!id || password.length < 8) {
      setError("Enter your email or phone number and a password (8+ characters).")
      setIsLoading(false)
      return
    }

    // Try the real backend first. Success here gives us a real
    // accessToken which the dashboard's billing page (and any future
    // authed API) reads from localStorage. If the backend is down or
    // doesn't know this user, fall through to the legacy demo flow
    // (tenant matcher) so the rest of the app keeps working.
    const apiBase = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000").replace(/\/$/, "")
    let backendOk = false
    if (id.includes("@")) {
      try {
        const res = await fetch(`${apiBase}/api/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ email: id, password }),
        })
        if (res.ok) {
          const body = (await res.json()) as { accessToken?: string }
          if (body.accessToken) {
            window.localStorage.setItem(ACCESS_TOKEN_KEY, body.accessToken)
            backendOk = true
          }
        } else if (res.status === 401) {
          setError("Wrong email or password.")
          setIsLoading(false)
          return
        }
        // Any other non-OK status (500, network) just falls through to
        // the demo flow — we don't want to block users when the API is
        // down. Real production: surface this as a hard error.
      } catch {
        // Network error — backend unreachable. Fall through to demo.
      }
    }

    // Match the workspace by identifier so the browser lands on the
    // right tenant subdomain. Even with a real backend login we still
    // run this to switch tenants client-side; until tenant-aware auth
    // lands on the backend, demo data drives most of the dashboard.
    const tenant = findTenantByLogin(id)
    if (!tenant && !backendOk) {
      setError(
        id.includes("@")
          ? "No account found for this email."
          : "No account found for this phone number.",
      )
      setIsLoading(false)
      return
    }

    if (tenant) switchTenant(tenant.slug)
    // Drop a breadcrumb so lms-store can stamp lastLoginAt on the
    // matching user once it hydrates inside the dashboard provider.
    // We can't reach lms-store from here (different provider tree).
    try {
      window.localStorage.setItem(
        "thebigclass.pendingLogin",
        JSON.stringify({ identifier: id, at: new Date().toISOString() }),
      )
    } catch { /* private browsing — fine */ }
    // Branch on role so students land on /p/<slug>/my and
    // teachers/admins land on /dashboard. We resolve the role by
    // reading the tenant-scoped users blob directly — the LMS
    // provider isn't mounted on this page.
    const role = tenant
      ? lookupRoleFromTenantStore(tenant.slug, id)
      : null
    const destination = postAuthDestination({
      user: role ? { role } : null,
      tenantSlug: tenant?.slug ?? "",
    })
    router.push(destination)
  }

  return (
    <div className="flex min-h-screen">
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
              Sign in to your account to manage certificates
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
                <Label htmlFor="identifier">Email or phone number</Label>
                <Input
                  id="identifier"
                  type="text"
                  inputMode="email"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="you@example.com or +91 98765 43210"
                  required
                  autoComplete="username"
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
            <p className="font-semibold text-white">Dr. Sarah Chen</p>
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
