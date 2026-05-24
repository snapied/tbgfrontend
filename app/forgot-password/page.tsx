"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Mail,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Logo } from "@/components/brand/logo"
import { readCurrentTenantSlug } from "@/lib/tenant-store"
import { AuthRedirectGate } from "@/components/auth/auth-redirect-gate"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Sprint C Brand #43 — track when we successfully sent the email
  // so the success state can render "sent X ago" + power the resend
  // cooldown. Resend cooldown is 30s; the button is disabled until
  // `cooldownSec` reaches 0.
  const [sentAt, setSentAt] = useState<Date | null>(null)
  const [cooldownSec, setCooldownSec] = useState(0)
  // Tick the cooldown every second while it's positive. Stops when
  // it reaches 0 so we don't burn re-renders forever.
  useEffect(() => {
    if (cooldownSec <= 0) return
    const t = window.setInterval(() => {
      setCooldownSec((s) => Math.max(0, s - 1))
    }, 1000)
    return () => window.clearInterval(t)
  }, [cooldownSec])

  const emailValid = !email || /^[^@]+@[^@]+\.[^@]+$/.test(email)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !emailValid) return
    setSubmitting(true)
    setError(null)
    try {
      // Pass along the last-known tenant slug so the reset email lands
      // on the workspace's branded /p/<slug>/reset-password URL. Falls
      // back to the platform reset surface when no tenant is known.
      const tenant = readCurrentTenantSlug() || undefined
      const res = await fetch("/api/auth/reset-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), tenant }),
      })
      // The endpoint always returns ok regardless of whether the account
      // exists — same UX either way to avoid leaking which emails are real.
      // We still differentiate the network/server failure modes so the
      // user knows whether to retry, wait, or check their connection.
      if (!res.ok) {
        if (res.status === 429) {
          throw new Error("Too many reset attempts. Wait a minute and try again.")
        }
        if (res.status >= 500) {
          throw new Error("Our mail service is having a moment. Try again in a minute.")
        }
        throw new Error("We couldn't send the reset email right now. Try again, or contact support if this keeps happening.")
      }
      setDone(true)
      // Sprint C Brand #43 — stamp the send time + start cooldown so
      // the success card can render "sent 12s ago" and gate the
      // Resend button. 30s is enough to defeat double-tap abuse +
      // accidental retry while staying within the bounds of "the
      // user actually waited to see if it arrived".
      setSentAt(new Date())
      setCooldownSec(30)
    } catch (err) {
      // Network failure — fetch throws a TypeError when offline.
      if (err instanceof TypeError) {
        setError("Couldn't reach our servers. Check your connection and try again.")
      } else {
        setError((err as Error).message ?? "Something went wrong. Try again, or contact support.")
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 py-12">
      <AuthRedirectGate />
      <div className="mx-auto w-full max-w-sm">
        <div className="mb-6 flex justify-center">
          <Logo size="md" />
        </div>

        {done ? (
          <Card>
            <CardContent className="space-y-4 p-6 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success/15 text-success">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h1 className="text-xl font-bold">Check your inbox</h1>
              {/* Sprint C Brand #43 — masked-email + "sent N ago"
                  framing. The previous copy ("If <email> is on file
                  we just sent a reset link") leaked the literal full
                  address in success state which is fine in this UI
                  but feels generic. Masking the local part beyond
                  the first 3 chars reads as a confirmation rather
                  than a privacy-leaky echo. */}
              <p className="text-sm text-muted-foreground">
                Sent to <span className="font-medium text-foreground">{maskEmail(email)}</span>
                {sentAt && (
                  <>
                    {" "}·{" "}
                    <SentAgo at={sentAt} />
                  </>
                )}
              </p>
              <p className="text-xs text-muted-foreground">
                Reset link works for the next <span className="font-semibold">60 minutes</span>.
              </p>
              <div className="rounded-md border border-border/60 bg-muted/30 p-3 text-left text-xs text-muted-foreground">
                <p className="font-semibold text-foreground">Didn&apos;t get it?</p>
                <ul className="mt-1 list-disc space-y-0.5 pl-4">
                  <li>Check your spam / promotions folder.</li>
                  <li>
                    Make sure you typed{" "}
                    <code className="font-mono text-[11px]">{email}</code> correctly.
                  </li>
                  <li>Some providers add a 30–60s delay.</li>
                </ul>
              </div>
              {/* Resend with cooldown. Disabled + countdown for the
                  first 30s, then becomes a regular button. We
                  re-submit the form (same handler) which restarts
                  the cooldown. */}
              <Button
                type="button"
                variant="outline"
                className="w-full"
                disabled={submitting || cooldownSec > 0}
                onClick={(e) => {
                  void submit(e as unknown as React.FormEvent)
                }}
              >
                {submitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                {cooldownSec > 0
                  ? `Resend in ${cooldownSec}s`
                  : "Resend reset link"}
              </Button>
              <Button asChild variant="ghost" className="w-full">
                <Link href="/login">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to sign in
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-6">
              <Link href="/login" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-3 w-3" /> Sign in
              </Link>
              <h1 className="mt-3 text-xl font-bold">Reset your password</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Enter your email — we&apos;ll mail you a link to choose a new one.
              </p>

              <form onSubmit={submit} className="mt-5 space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value.toLowerCase())}
                      placeholder="you@academy.com"
                      className="pl-8"
                      autoFocus
                    />
                  </div>
                  {!emailValid && (
                    <p className="inline-flex items-center gap-1 text-xs text-destructive">
                      <AlertTriangle className="h-3 w-3" /> That doesn&apos;t look like an email.
                    </p>
                  )}
                </div>

                {error && (
                  <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                    {error}
                  </div>
                )}

                <Button type="submit" className="w-full" disabled={!email || !emailValid || submitting}>
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Send reset link
                </Button>
              </form>

              <p className="mt-4 text-center text-xs text-muted-foreground">
                Don&apos;t have an account?{" "}
                <Link href="/signup" className="font-medium text-primary hover:underline">Register</Link>
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

/** Mask the local part of an email so the success copy reads as a
 *  confirmation without echoing the literal address back. Keeps the
 *  first 3 chars + last char of the local part visible so the user
 *  can recognise the typo case. */
function maskEmail(raw: string): string {
  const at = raw.indexOf("@")
  if (at < 0) return raw
  const local = raw.slice(0, at)
  const domain = raw.slice(at)
  if (local.length <= 4) return `${local[0] ?? ""}••${domain}`
  return `${local.slice(0, 3)}•••${local.slice(-1)}${domain}`
}

/** Human-friendly "sent N ago" pill that re-renders on a 5s tick so
 *  the time feels live without burning re-renders every second. */
function SentAgo({ at }: { at: Date }) {
  const [, force] = useState(0)
  useEffect(() => {
    const id = window.setInterval(() => force((n) => n + 1), 5000)
    return () => window.clearInterval(id)
  }, [])
  const secs = Math.max(1, Math.round((Date.now() - at.getTime()) / 1000))
  const label =
    secs < 60
      ? `${secs}s ago`
      : secs < 3600
        ? `${Math.round(secs / 60)}m ago`
        : at.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
  return <span>{label}</span>
}
