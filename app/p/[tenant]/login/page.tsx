"use client"

// Branded per-tenant sign-in surface.
//
// Visitors who land on /p/<tenant>/login see the workspace's own
// brand chrome (header, theme, fonts via the existing portal
// layout). The form looks up the User row in the tenant-scoped
// LMS store — the lms-store is already keyed by the current
// tenant slug when we're on /p/<tenant>/*, so useLMS().users
// returns the right pool.
//
// Real password verification will land once a hash store exists.
// For the POC, "sign-in" means: find the user row by email, drop
// them into currentUser, redirect. Password is requested in the
// UI so the surface matches what a real login looks like — but
// the request body isn't checked.

import { use, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { AlertTriangle, Loader2, LogIn } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { generateId, useLMS } from "@/lib/lms-store"
import { useTenantBrand } from "@/lib/tenant-brand"
import { postAuthDestination } from "@/lib/post-auth-redirect"
import { useT } from "@/lib/i18n"
import { currentTenantOwnerEmail } from "@/lib/tenant-store"

export default function PortalLoginPage({
  params,
}: {
  params: Promise<{ tenant: string }>
}) {
  const { tenant } = use(params)
  const router = useRouter()
  const { users, setCurrentUser, addUser } = useLMS()
  const brand = useTenantBrand()
  const { t } = useT()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const emailValid = useMemo(
    () => !email || /^[^@]+@[^@]+\.[^@]+$/.test(email),
    [email],
  )
  const canSubmit = !!email && emailValid && !!password && !submitting

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setSubmitting(true)
    setError(null)
    try {
      // Wait a beat so the UX doesn't feel instant — keeps the
      // shape of a real auth flow even though we're not actually
      // hashing anything yet.
      await new Promise((r) => setTimeout(r, 400))
      const lower = email.trim().toLowerCase()
      let found = users.find((u) => u.email.toLowerCase() === lower)

      // Self-heal: when this email matches the workspace owner email recorded
      // on the tenant but the user record is missing from LMS storage (e.g.
      // signup partially completed, or the users key was cleared), seed an
      // admin user so the owner isn't locked out of their own workspace.
      if (!found) {
        const ownerEmail = currentTenantOwnerEmail()
        if (ownerEmail && ownerEmail.toLowerCase() === lower) {
          const seeded = {
            id: generateId("user"),
            name: lower.split("@")[0] || "Workspace owner",
            email: lower,
            role: "admin" as const,
            createdAt: new Date().toISOString(),
          }
          addUser(seeded)
          found = seeded
        }
      }

      // Cross-tenant self-heal. The lms-store is keyed by tenant slug;
      // before the URL-path tenant resolver landed, users invited to
      // /p/<tenant>/accept-invite/<token> could end up persisted under
      // the WRONG slug (the anon fallback, or the browser's previously-
      // active workspace). Scan every tenant-scoped users blob in
      // localStorage for a matching email; if one's there, copy it into
      // this tenant's user pool so the learner doesn't have to be re-
      // invited just because of a historical mis-scope.
      if (!found && typeof window !== "undefined") {
        try {
          for (let i = 0; i < window.localStorage.length; i++) {
            const key = window.localStorage.key(i)
            if (!key || !key.endsWith(".lms.users.v1")) continue
            const raw = window.localStorage.getItem(key)
            if (!raw) continue
            const parsed = JSON.parse(raw) as Array<{
              email?: string
              name?: string
              role?: "admin" | "instructor" | "student"
              avatar?: string
              phone?: string
            }>
            if (!Array.isArray(parsed)) continue
            const match = parsed.find(
              (u) => (u.email ?? "").toLowerCase() === lower,
            )
            if (match) {
              const recovered = {
                id: generateId("user"),
                name: match.name?.trim() || lower.split("@")[0],
                email: lower,
                // Default to student — a teacher signing in on the
                // tenant-scoped portal login is unusual; if the
                // recovered row claimed admin/instructor we honour it.
                role: match.role ?? "student",
                avatar: match.avatar,
                phone: match.phone,
                createdAt: new Date().toISOString(),
              } as const
              addUser(recovered)
              found = recovered
              break
            }
          }
        } catch {
          /* tolerable — recovery is best-effort */
        }
      }

      if (!found) {
        setError(
          "We couldn't find an account with that email in this workspace. Check the address, or ask your admin to invite you.",
        )
        return
      }
      if (found.disabledAt) {
        setError("This account is disabled. Contact your workspace admin.")
        return
      }
      setCurrentUser(found)
      // Students land on the tenant-scoped /my dashboard; teachers
      // and admins land on the platform teacher dashboard.
      // postAuthDestination centralises this branching.
      router.push(
        postAuthDestination({
          user: { role: found.role },
          tenantSlug: tenant,
        }),
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-md px-6 py-12 lg:px-8">
      <Card>
        <CardContent className="space-y-5 p-6">
          <div>
            <h1 className="font-serif text-2xl font-bold tracking-tight">
              {t("auth.signIn.title")} — {brand.name}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Use the email your admin invited.
            </p>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="login-email">{t("auth.signIn.email")}</Label>
              <Input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value.toLowerCase())}
                placeholder="you@example.com"
                autoComplete="email"
                autoFocus
              />
              {email && !emailValid && (
                <p className="inline-flex items-center gap-1 text-xs text-destructive">
                  <AlertTriangle className="h-3 w-3" /> That doesn&apos;t look like an email.
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="login-pw">{t("auth.signIn.password")}</Label>
                <Link
                  href={`/p/${tenant}/forgot-password`}
                  className="text-xs font-medium text-primary hover:underline"
                >
                  {t("auth.signIn.forgot")}
                </Link>
              </div>
              <Input
                id="login-pw"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your password"
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={!canSubmit}>
              {submitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <LogIn className="mr-2 h-4 w-4" />
              )}
              {t("auth.signIn.submit")}
            </Button>
          </form>

          <p className="border-t border-border pt-4 text-center text-xs text-muted-foreground">
            {t("auth.signIn.inviteHint")}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
