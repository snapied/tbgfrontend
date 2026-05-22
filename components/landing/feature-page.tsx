"use client"

import Link from "next/link"
import { ArrowLeft, ArrowRight, CheckCircle2, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/**
 * Shared layout primitives for /features/* pages. Every feature page
 * uses the same hero + alternating section + CTA structure so the
 * marketing surface stays coherent without per-page custom design.
 */

export function FeaturePageShell({
  eyebrow,
  title,
  subtitle,
  heroImage,
  children,
}: {
  eyebrow: string
  title: React.ReactNode
  subtitle: string
  heroImage?: string
  children?: React.ReactNode
}) {
  return (
    <>
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-secondary/60 via-background to-background" />
        <div className="relative mx-auto max-w-6xl px-6 py-20 sm:py-24 lg:px-8">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to home
          </Link>
          <div className="mt-6 flex flex-col lg:flex-row lg:items-center gap-12 lg:gap-16">
            <div className="max-w-2xl flex-1">
              <div className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-semibold text-accent-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                {eyebrow}
              </div>
              <h1 className="mt-4 text-4xl font-bold tracking-tight text-balance sm:text-5xl">
                {title}
              </h1>
              <p className="mt-4 text-lg leading-relaxed text-muted-foreground text-balance">
                {subtitle}
              </p>
              <div className="mt-8 flex flex-col items-start gap-3 sm:flex-row">
                <Button asChild size="lg" className="gap-2">
                  <Link href="/signup">
                    Launch your academy
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link href="/login">Sign in</Link>
                </Button>
              </div>
            </div>
            
            {heroImage && (
              <div className="relative flex-1 w-full max-w-2xl lg:max-w-none">
                <div className="overflow-hidden rounded-2xl border border-border bg-muted/20 shadow-2xl">
                  <img src={heroImage} alt="" className="w-full h-auto object-cover" />
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {children}
    </>
  )
}

export function FeatureSplit({
  title, body, bullets, mockup, reverse,
}: {
  title: React.ReactNode
  body: React.ReactNode
  bullets?: string[]
  mockup: React.ReactNode
  reverse?: boolean
}) {
  return (
    <section className="py-16 sm:py-20">
      <div className="mx-auto max-w-5xl px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div className={cn(reverse && "lg:order-2")}>
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h2>
            <div className="mt-3 leading-relaxed text-muted-foreground">{body}</div>
            {bullets && bullets.length > 0 && (
              <ul className="mt-5 space-y-2 text-sm">
                {bullets.map((b) => (
                  <li key={b} className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className={cn(reverse && "lg:order-1")}>{mockup}</div>
        </div>
      </div>
    </section>
  )
}

export function FeatureCTA({
  title = "Ready to launch your own?",
  body = "Pick your subdomain, drop in your logo, and you're live. No demo call. No credit card.",
}: {
  title?: string
  body?: string
}) {
  return (
    <section className="py-20">
      <div className="mx-auto max-w-3xl px-6 text-center lg:px-8">
        <div className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-semibold text-accent-foreground">
          <Sparkles className="h-3 w-3" /> Free to start
        </div>
        <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">{title}</h2>
        <p className="mt-3 text-muted-foreground">{body}</p>
        <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button asChild size="lg" className="gap-2">
            <Link href="/signup">
              Launch your academy free
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/login">Already have one? Sign in</Link>
          </Button>
        </div>
      </div>
    </section>
  )
}

export function PreviewFrame({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-md">
      <div className="flex items-center gap-2 border-b border-border/60 bg-muted/40 px-3 py-2">
        <span className="h-2 w-2 rounded-full bg-rose-400/70" />
        <span className="h-2 w-2 rounded-full bg-amber-400/70" />
        <span className="h-2 w-2 rounded-full bg-emerald-400/70" />
        <span className="ml-2 truncate font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
          {title}
        </span>
      </div>
      <div className="p-4">{children}</div>
    </div>
  )
}
