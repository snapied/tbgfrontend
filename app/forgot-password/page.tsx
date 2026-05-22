"use client"

import { useState } from "react"
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

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
      if (!res.ok) throw new Error(`Request failed (${res.status})`)
      setDone(true)
    } catch (err) {
      setError((err as Error).message ?? "Something went wrong.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 py-12">
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
              <p className="text-sm text-muted-foreground">
                If <span className="font-medium text-foreground">{email}</span> is on file, we just sent a reset link.
                It works for the next <span className="font-semibold">60 minutes</span>.
              </p>
              <div className="rounded-md border border-border/60 bg-muted/30 p-3 text-left text-xs text-muted-foreground">
                <p className="font-semibold text-foreground">Didn&apos;t get it?</p>
                <ul className="mt-1 list-disc space-y-0.5 pl-4">
                  <li>Check your spam folder.</li>
                  <li>Make sure the email you typed is correct.</li>
                  <li>Wait a minute — transactional mail can take a bit.</li>
                </ul>
              </div>
              <Button asChild variant="outline" className="w-full">
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
