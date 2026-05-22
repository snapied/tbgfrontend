"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, ArrowRight, CheckCircle2, Layers, Lock, MousePointerClick, QrCode, Sparkles, Wand2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Logo } from "@/components/brand/logo"
import { TemplateBuilder } from "@/components/certificates/template-builder"

/**
 * Public, no-signup-required playground for the certificate Template
 * Designer. Mounts the real editor used inside the dashboard so prospects
 * can drag text, shapes, signatures and QR codes onto a real A4 canvas
 * before they create a workspace.
 *
 * Save is intercepted with a "create an account to keep this" modal —
 * we never silently persist a stranger's work into a real tenant.
 */
export default function PublicTemplateDesignerPage() {
  const [showSaveGate, setShowSaveGate] = useState(false)

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-muted/30 via-background to-background">
      {/* Sticky marketing top bar */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/features/certificates" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" /> <span className="hidden sm:inline">Back</span>
            </Link>
            <span className="h-4 w-px bg-border" />
            <Link href="/" className="inline-flex">
              <Logo size="sm" />
            </Link>
          </div>

          <div className="hidden items-center gap-2 md:flex">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-success/15 px-2.5 py-1 text-xs font-semibold text-success">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" />
              Live demo · the real editor
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" className="hidden sm:inline-flex">
              <Link href="/features/certificates">Why use it</Link>
            </Button>
            <Button asChild className="gap-1.5">
              <Link href="/signup">
                Sign up free <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </div>

        {/* Demo notice strip — replaces the marketing "build a course"
            CTA noise; appears only on small screens where the top-right
            badge is hidden. */}
        <div className="border-t border-border bg-amber-500/5 px-4 py-1.5 text-center text-[11px] text-amber-700 dark:text-amber-300 md:hidden">
          Live demo of the real editor · sign up to keep your work
        </div>
      </header>

      {/* Marketing hero above the editor — gives first-time visitors a
          sense of what they're looking at and why they should care before
          the editor itself takes over the viewport. Compact enough that
          the editor is still visible without scrolling on a typical
          laptop. */}
      <section className="border-b border-border bg-background/50">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
          <div className="grid items-center gap-4 lg:grid-cols-[1fr_auto]">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/5 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-accent">
                <Sparkles className="h-3 w-3" />
                Free playground
              </div>
              <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
                Design your certificate. <span className="text-primary">No signup needed.</span>
              </h1>
              <p className="mt-1.5 text-sm text-muted-foreground sm:text-base">
                Drag text, shapes, signatures, a QR code, and an image of your seal — exactly the editor your students will see issued on. Sign up to keep what you make and bulk-issue from CSV.
              </p>
            </div>
            <ul className="grid gap-2 text-xs sm:grid-cols-3 sm:text-[13px] lg:grid-cols-1">
              <HeroBullet icon={MousePointerClick} label="Drag · drop · nudge with arrow keys" />
              <HeroBullet icon={QrCode} label="QR code that verifies live" />
              <HeroBullet icon={Layers} label="Real variables — student, course, date" />
            </ul>
          </div>
        </div>
      </section>

      {/* The actual editor mounted below the hero. */}
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 sm:py-6">
          <TemplateBuilder
            onSaved={() => setShowSaveGate(true)}
            onBack={() => { /* the marketing top bar already has Back */ }}
          />
        </div>

        {/* Tips strip — reinforces the cheat-sheet shown inside the
            editor's Inspector for users who haven't selected a block yet. */}
        <div className="border-t border-border bg-muted/30">
          <div className="mx-auto grid max-w-7xl gap-3 px-4 py-4 sm:grid-cols-3 sm:px-6">
            <TipCard
              icon={Wand2}
              title="Variables auto-fill at issue time"
              body="Drop {{student_name}} or {{course_name}} into any text or signature block — we'll replace them per recipient."
            />
            <TipCard
              icon={QrCode}
              title="Every certificate is verifiable"
              body="The QR block links to a live verify URL. Anyone scanning it sees who earned it and when."
            />
            <TipCard
              icon={CheckCircle2}
              title="Saved locally as you build"
              body="Your work is in your browser. Come back later — it'll still be here until you sign up and move it in."
            />
          </div>
        </div>
      </main>

      {/* Save-gate modal — appears the first time the visitor hits Save. */}
      {showSaveGate && (
        <SaveGate onClose={() => setShowSaveGate(false)} />
      )}
    </div>
  )
}

function HeroBullet({
  icon: Icon,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
}) {
  return (
    <li className="flex items-center gap-2 text-muted-foreground">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Icon className="h-3.5 w-3.5" />
      </span>
      <span>{label}</span>
    </li>
  )
}

function TipCard({
  icon: Icon,
  title,
  body,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  body: string
}) {
  return (
    <div className="rounded-md border border-border bg-card p-3">
      <div className="flex items-start gap-2.5">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-accent/10 text-accent">
          <Icon className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold">{title}</p>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{body}</p>
        </div>
      </div>
    </div>
  )
}

function SaveGate({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-3 top-3 rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="bg-gradient-to-br from-primary/[0.05] via-card to-accent/[0.08] p-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-2.5 py-1 text-[11px] font-semibold text-accent-foreground">
            <Lock className="h-3 w-3" />
            One more step to keep this
          </div>
          <h2 className="mt-3 text-2xl font-bold tracking-tight">
            Nice template. <span className="text-primary">Let&apos;s save it.</span>
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            This is the real editor — but it&apos;s running in your browser as a demo. Create a free workspace and we&apos;ll move this template in, ready to use on real certificates.
          </p>

          <ul className="mt-4 space-y-1.5 text-sm">
            {[
              "Free forever — no credit card",
              "Your subdomain in 3 minutes",
              "Bulk-issue from CSV the same day",
            ].map((line) => (
              <li key={line} className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                <span>{line}</span>
              </li>
            ))}
          </ul>

          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <Button asChild className="gap-2">
              <Link href="/signup">
                <Sparkles className="h-4 w-4" />
                Create my workspace
              </Link>
            </Button>
            <Button variant="outline" onClick={onClose}>
              Keep playing
            </Button>
          </div>

          <p className="mt-3 text-[11px] text-muted-foreground">
            Tip: your work is saved locally in this browser. If you come back later it&apos;ll still be here.
          </p>
        </div>
      </div>
    </div>
  )
}
