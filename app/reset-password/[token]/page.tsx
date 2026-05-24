"use client"

import { use, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Lock,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Logo } from "@/components/brand/logo"
import { PasswordStrengthInput, MIN_PASSWORD_SCORE } from "@/components/forms/password-strength-input"
import { AuthRedirectGate } from "@/components/auth/auth-redirect-gate"

type Phase =
  | { kind: "checking" }
  | { kind: "valid"; email: string }
  | { kind: "invalid"; reason: string }
  | { kind: "done" }

export default function ResetPasswordPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)
  const router = useRouter()

  const [phase, setPhase] = useState<Phase>({ kind: "checking" })
  const [pw, setPw] = useState("")
  const [pwValid, setPwValid] = useState(false)
  const [confirmPw, setConfirmPw] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  // Verify the token on mount so we never let the user fill out a useless form.
  useEffect(() => {
    let cancelled = false
    const check = async () => {
      try {
        const res = await fetch("/api/auth/reset-verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        })
        const json = (await res.json().catch(() => ({}))) as { ok?: boolean; email?: string; error?: string }
        if (cancelled) return
        if (res.ok && json.ok && json.email) {
          setPhase({ kind: "valid", email: json.email })
        } else {
          setPhase({ kind: "invalid", reason: json.error ?? "This link is invalid." })
        }
      } catch (err) {
        if (!cancelled) setPhase({ kind: "invalid", reason: (err as Error).message ?? "Network error." })
      }
    }
    void check()
    return () => { cancelled = true }
  }, [token])

  const canSubmit = phase.kind === "valid" && pwValid && pw === confirmPw && !!confirmPw

  const submit = async (e: React.FormEvent) => {
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
      // Auto-bounce to login after a beat.
      setTimeout(() => router.push("/login"), 1500)
    } catch (err) {
      setServerError((err as Error).message ?? "Network error.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 py-12">
      <AuthRedirectGate />
      <div className="mx-auto w-full max-w-sm">
        <div className="mb-6 flex justify-center"><Logo size="md" /></div>

        {/* Checking */}
        {phase.kind === "checking" && (
          <Card>
            <CardContent className="flex items-center justify-center gap-3 p-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Checking your link…
            </CardContent>
          </Card>
        )}

        {/* Invalid */}
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
                  <Link href="/forgot-password">Request a new link</Link>
                </Button>
                <Button asChild variant="ghost" className="w-full">
                  <Link href="/login"><ArrowLeft className="mr-2 h-4 w-4" /> Back to sign in</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Form */}
        {phase.kind === "valid" && (
          <Card>
            <CardContent className="p-6">
              <Link href="/login" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-3 w-3" /> Sign in
              </Link>
              <h1 className="mt-3 text-xl font-bold">Choose a new password</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                For <span className="font-medium text-foreground">{phase.email}</span>.
              </p>

              <form onSubmit={submit} className="mt-5 space-y-4">
                <PasswordStrengthInput
                  label="New password"
                  value={pw}
                  onChange={(next, valid) => {
                    setPw(next)
                    setPwValid(valid)
                  }}
                  confirmValue={confirmPw}
                  onConfirmChange={setConfirmPw}
                  userInputs={[phase.kind === "valid" ? phase.email : ""]}
                  minScore={MIN_PASSWORD_SCORE}
                  autoFocus
                />

                {serverError && (
                  <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                    {serverError}
                  </div>
                )}

                <Button type="submit" className="w-full" disabled={!canSubmit || submitting}>
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Set new password
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Done */}
        {phase.kind === "done" && (
          <Card>
            <CardContent className="space-y-4 p-6 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success/15 text-success">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h1 className="text-xl font-bold">Password updated</h1>
              <p className="text-sm text-muted-foreground">Taking you to sign in…</p>
              <Button asChild className="w-full">
                <Link href="/login">Sign in</Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
