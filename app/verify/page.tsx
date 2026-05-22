"use client"

import { useState } from "react"
import Link from "next/link"
import { Search, Loader2 } from "lucide-react"
import { Logo } from "@/components/brand/logo"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function VerifyPage() {
  const [certificateId, setCertificateId] = useState("")
  const [isSearching, setIsSearching] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!certificateId.trim()) return

    setIsSearching(true)
    // Simulate search delay
    await new Promise((resolve) => setTimeout(resolve, 500))
    
    // Navigate to the specific certificate page
    window.location.href = `/verify/${certificateId.trim().toUpperCase()}`
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
      <main className="flex flex-1 flex-col items-center justify-center px-6 py-12">
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
                onChange={(e) => setCertificateId(e.target.value)}
                placeholder="e.g., CERT-2026-A1B2C3D4"
                className="text-center font-mono uppercase"
              />
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
