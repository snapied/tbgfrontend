"use client"

// Workspace invite acceptance page.
//
// Lands here from the email link the admin sends via
// /api/auth/invite-request. On mount we verify the token (which
// also gives us the invitee's email back), surface the workspace +
// inviter name from query params, and let the user pick a password
// (zxcvbn-validated, min score 3). On submit we:
//   1. POST to /api/auth/invite-verify to commit server-side (this
//      will become "create the password hash + session" once a
//      real auth backend exists).
//   2. Add a User row to the inviter's tenant via useLMS().addUser
//      using the email from the token as identity.
//   3. setCurrentUser → instant sign-in for the POC.
//   4. Redirect to /onboarding so the new teacher lands somewhere
//      welcoming, not a cold dashboard.

import { use, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { AlertTriangle, ArrowLeft, CheckCircle2, Loader2, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Logo } from "@/components/brand/logo"
import {
  PasswordStrengthInput,
  MIN_PASSWORD_SCORE,
} from "@/components/forms/password-strength-input"
import { generateId, useLMS, type User } from "@/lib/lms-store"
import { useTenant } from "@/lib/tenant-store"

type Phase =
  | { kind: "checking" }
  | { kind: "valid"; email: string }
  | { kind: "invalid"; reason: string }
  | { kind: "done" }

export default function AcceptInvitePage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = use(params)
  const router = useRouter()
  const search = useSearchParams()
  const { users, addUser, updateUser, setCurrentUser } = useLMS()
  const { currentTenant } = useTenant()

  // Context delivered alongside the token via query string. None of
  // these are trusted (anyone with the link can read them), so they
  // only influence display copy — never user role / permissions.
  // The authoritative role comes from the token's signed payload,
  // but for the POC we treat the URL param as the role hint and
  // upgrade to admin only when explicitly requested.
  const workspaceName = search.get("w") ?? "the workspace"
  const inviterName = search.get("i") ?? "Your admin"
  // Role from the invite URL. Instructor invites use ?r=admin or omit
  // (defaults to instructor); student invites use ?r=student.
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

  // Verify the token on mount so we never let the user fill in a
  // form just to get a 400 on submit.
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
          error?: string
        }
        if (cancelled) return
        if (res.ok && json.ok && json.email) {
          setPhase({ kind: "valid", email: json.email })
        } else {
          setPhase({ kind: "invalid", reason: json.error ?? "This invite link is invalid." })
        }
      } catch (err) {
        if (!cancelled) {
          setPhase({ kind: "invalid", reason: (err as Error).message ?? "Network error." })
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [token])

  // User-context for zxcvbn — passwords containing the user's name,
  // email, or the workspace name score lower.
  const userInputs = useMemo(
    () => [name, phase.kind === "valid" ? phase.email : "", workspaceName],
    [name, phase, workspaceName],
  )

  const canSubmit =
    phase.kind === "valid" &&
    !!name.trim() &&
    pwValid &&
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

      // Provision the user in the current tenant's LMS store. If an
      // existing row already matches this email (the admin may have
      // pre-created the User shell when they sent the invite),
      // upgrade it in place; otherwise create.
      const existing = users.find(
        (u) => u.email.toLowerCase() === phase.email.toLowerCase(),
      )
      let provisionedId: string
      if (existing) {
        updateUser(existing.id, {
          name: name.trim() || existing.name,
          role,
          // Stamp lastLoginAt so the Faculty list shows them as
          // "Active" right away instead of "pending invite".
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

      // Sign them in (POC: no real session — setCurrentUser flips
      // the in-memory current user in the LMS store).
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
      // Students land on the tenant-scoped student dashboard. Instructors
      // / admins go to /onboarding to walk through the workspace
      // setup wizard. Falls back to /onboarding if the tenant slug
      // isn't resolved (shouldn't happen — invite is always scoped).
      const dest =
        role === "student" && currentTenant?.slug
          ? `/p/${currentTenant.slug}/my`
          : "/onboarding"
      setTimeout(() => router.push(dest), 800)
    } catch (err) {
      setServerError((err as Error).message ?? "Network error.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 py-12">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <Logo size="md" />
        </div>

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
                <Link href="/login">
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
                <h1 className="mt-3 text-xl font-bold">
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
                  <label htmlFor="ai-name" className="text-sm font-medium">
                    Your name
                  </label>
                  <input
                    id="ai-name"
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
                  {submitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
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
                Taking you to your dashboard…
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
