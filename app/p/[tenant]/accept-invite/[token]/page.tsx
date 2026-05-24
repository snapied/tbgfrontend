"use client"

// Tenant-branded invite acceptance page.
//
// Same shape as the platform-level /accept-invite/[token] but
// rendered inside the tenant layout so the recipient sees the
// workspace's logo, colors, and fonts the moment the link opens.
// The token carries a bound tenant slug; we hard-reject if it
// doesn't match the URL slug so a link issued for tenant A can't
// be consumed inside tenant B's portal.

import { use, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { AlertTriangle, ArrowLeft, CheckCircle2, Loader2, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  PasswordStrengthInput,
  MIN_PASSWORD_SCORE,
} from "@/components/forms/password-strength-input"
import { generateId, useLMS, type User } from "@/lib/lms-store"
import { useTenantBrand } from "@/lib/tenant-brand"

type Phase =
  | { kind: "checking" }
  | { kind: "valid"; email: string }
  | { kind: "invalid"; reason: string }
  | { kind: "done" }

export default function PortalAcceptInvitePage({
  params,
}: {
  params: Promise<{ tenant: string; token: string }>
}) {
  const { tenant, token } = use(params)
  const router = useRouter()
  const search = useSearchParams()
  const brand = useTenantBrand()
  const { users, addUser, updateUser, setCurrentUser } = useLMS()

  const workspaceName = search.get("w") ?? brand.name
  const inviterName = search.get("i") ?? "Your admin"
  // Role from the invite URL. Instructor invites use ?r=admin or omit
  // (defaults to instructor); student invites use ?r=student. The
  // landing page handles all three, so a single invite generator can
  // pick whichever role applies.
  const roleParam = search.get("r")
  const role = (
    roleParam === "admin"
      ? "admin"
      : roleParam === "student"
        ? "student"
        : "instructor"
  ) as "admin" | "instructor" | "student"
  const inviteeName = search.get("n") ?? ""

  const [phase, setPhase] = useState<Phase>({ kind: "checking" })
  const [name, setName] = useState(inviteeName)
  const [pw, setPw] = useState("")
  const [pwValid, setPwValid] = useState(false)
  const [confirm, setConfirm] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const res = await fetch("/api/auth/invite-verify", {
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
          setPhase({ kind: "invalid", reason: json.error ?? "This invite link is invalid." })
          return
        }
        if (json.tenant && json.tenant !== tenant) {
          setPhase({
            kind: "invalid",
            reason:
              "This invite belongs to a different workspace. Open the link from the email so it lands in the right one.",
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
    () => [name, phase.kind === "valid" ? phase.email : "", workspaceName],
    [name, phase, workspaceName],
  )

  const canSubmit =
    phase.kind === "valid" &&
    !!name.trim() &&
    pwValid &&
    !!confirm &&
    pw === confirm &&
    !submitting

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit || phase.kind !== "valid") return
    setSubmitting(true)
    setServerError(null)
    try {
      const res = await fetch("/api/auth/invite-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: pw }),
      })
      const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string }
      if (!res.ok || !json.ok) {
        setServerError(json.error ?? `Request failed (${res.status})`)
        return
      }

      const existing = users.find(
        (u) => u.email.toLowerCase() === phase.email.toLowerCase(),
      )
      let provisionedId: string
      if (existing) {
        updateUser(existing.id, {
          name: name.trim() || existing.name,
          role,
          lastLoginAt: new Date().toISOString(),
        })
        provisionedId = existing.id
      } else {
        const created: User = {
          id: generateId("user"),
          name: name.trim() || phase.email.split("@")[0],
          email: phase.email,
          role,
          createdAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString(),
        }
        addUser(created)
        provisionedId = created.id
      }

      const signedIn =
        users.find((u) => u.id === provisionedId) ??
        ({
          id: provisionedId,
          name: name.trim() || phase.email.split("@")[0],
          email: phase.email,
          role,
          createdAt: new Date().toISOString(),
        } as User)
      setCurrentUser(signedIn)

      setPhase({ kind: "done" })
      // Instructors / admins land on the platform dashboard so they
      // can start building immediately; students land on their
      // tenant-scoped student dashboard with the full sidebar.
      setTimeout(() => {
        if (role === "student") {
          router.push(`/p/${tenant}/my`)
        } else {
          router.push("/dashboard")
        }
      }, 800)
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
            Checking your invite…
          </CardContent>
        </Card>
      )}

      {phase.kind === "invalid" && (
        <Card>
          <CardContent className="space-y-4 p-6 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/15 text-destructive">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <h1 className="text-xl font-bold">Invite no good</h1>
            <p className="text-sm text-muted-foreground">{phase.reason}</p>
            <Button asChild variant="ghost" className="w-full">
              <Link href={`/p/${tenant}/login`}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to sign in
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {phase.kind === "valid" && (
        <Card>
          <CardContent className="space-y-5 p-6">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-accent/15 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-accent">
                <Sparkles className="h-3 w-3" />
                You&apos;re invited
              </div>
              <h1 className="mt-3 font-serif text-2xl font-bold tracking-tight">
                Join {workspaceName}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{inviterName}</span> invited{" "}
                <span className="font-medium text-foreground">{phase.email}</span>{" "}
                {role === "admin"
                  ? "as an admin"
                  : role === "student"
                    ? "as a student"
                    : "as an instructor"}
                . Set a password to finish setup.
              </p>
            </div>

            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="pai-name" className="text-sm font-medium">
                  Your name
                </label>
                <input
                  id="pai-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Jane Doe"
                  className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              <PasswordStrengthInput
                label="Choose a password"
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
                <p className="text-sm text-destructive">{serverError}</p>
              )}

              <Button type="submit" className="w-full" disabled={!canSubmit}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Accept invite & continue
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
            <h1 className="text-xl font-bold">You&apos;re in!</h1>
            <p className="text-sm text-muted-foreground">
              Taking you to your workspace…
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
