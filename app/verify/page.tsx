"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Search, Loader2 } from "lucide-react"
import { Logo } from "@/components/brand/logo"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

// Certificate IDs look like `CERT-XXXXXXXX` (with or without optional year prefixes).
// Match loosely to accept all system variations while catching obvious garbage.
const CERT_ID_RE = /^CERT-[A-Z0-9-]+$/

export default function VerifyPage() {
  const [certificateId, setCertificateId] = useState("")
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search)
      const code = params.get("code")
      if (code) {
        const clean = code.trim().toUpperCase()
        if (clean) {
          setIsSearching(true)
          window.location.href = `/verify/${clean}`
        }
      }
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const id = certificateId.trim().toUpperCase()
    if (!id) return

    // Pre-flight format check so the user gets an inline error
    // instead of a 404. The detail page's lookup still handles the
    // case where the format is valid but the ID isn't in the system.
    if (!CERT_ID_RE.test(id)) {
      setError(
        "That doesn't look like a valid certificate ID. The format starts with CERT- followed by alphanumeric characters."
      )
      return
    }
    setError(null)
    setIsSearching(true)
    // Brief delay so the spinner registers — pure UX nicety, no real work.
    await new Promise((resolve) => setTimeout(resolve, 500))
    window.location.href = `/verify/${id}`
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link href="/" className="inline-flex">
            <Logo size="md" />
          </Link>
          <Button variant="outline" asChild>
            <Link href="/login">Sign In</Link>
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main id="main-content" className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-md text-center">
          {/* Icon */}
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Search className="h-8 w-8 text-primary" />
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Verify a Certificate
          </h1>
          <p className="mt-3 text-muted-foreground">
            Enter a certificate ID to verify its authenticity. The ID can be found on the certificate or in the QR code.
          </p>

          {/* Search Form */}
          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div className="space-y-2 text-left">
              <Label htmlFor="certificate-id">Certificate ID</Label>
              <Input
                id="certificate-id"
                value={certificateId}
                onChange={(e) => {
                  setCertificateId(e.target.value)
                  // Clear the prior error as soon as the user starts editing —
                  // re-validation happens on next submit.
                  if (error) setError(null)
                }}
                placeholder="e.g., CERT-2026-A1B2C3D4"
                className="text-center font-mono uppercase"
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? "verify-error" : undefined}
              />
              {error && (
                <p id="verify-error" role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-left text-xs text-destructive">
                  {error}
                </p>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={isSearching || !certificateId.trim()}>
              {isSearching ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Verify Certificate
                </>
              )}
            </Button>
          </form>

          {/* Example */}
          <p className="mt-6 text-sm text-muted-foreground">
            Example: <code className="rounded bg-muted px-2 py-1 font-mono text-xs">CERT-2026-A1B2C3D4</code>
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-6 text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} The Big Class. Professional certificates, made simple.</p>
      </footer>
    </div>
  )
}
