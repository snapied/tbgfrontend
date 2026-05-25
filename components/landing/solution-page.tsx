"use client"

// Shared skeleton for every /solutions/* lander.
//
// Each lander is essentially the same skeleton with different data:
//   1. Hero — eyebrow + 4-6 word headline + subhead + dual CTA
//   2. Outcomes strip — 3 concrete jobs-to-be-done
//   3. How it maps — 4 feature cards with deep links into /features/*
//   4. Why this beats the obvious alternative — 3-row matrix
//   5. Trust line + final CTA
//
// Data-driven so a new lander is ~80 lines of config, not 400 lines
// of layout duplication.

import Link from "next/link"
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"

// Icons accept ReactNode (pre-rendered <Icon /> JSX), not
// component references — server-component callers pass React
// elements which serialize cleanly across the RSC boundary,
// whereas raw component refs (lucide forwardRefs etc.) do not.
export interface SolutionPageProps {
  eyebrow: string
  title: React.ReactNode
  subtitle: string
  primaryCta?: { label: string; href: string }
  secondaryCta?: { label: string; href: string }
  /** 3 outcomes the visitor wants. Lead with verbs. */
  outcomes: Array<{
    icon: React.ReactNode
    title: string
    body: string
  }>
  /** 4 platform capabilities mapped to this audience. Each links
   *  to the relevant /features/* page. */
  featureMap: Array<{
    icon: React.ReactNode
    title: string
    body: string
    href: string
  }>
  /** Optional comparison row — 3 rows comparing this platform to
   *  the alternative most of this audience considers. */
  comparison?: {
    alternativeName: string
    rows: Array<{
      label: string
      us: string
      them: string
    }>
  }
  /** Optional final-CTA override. */
  cta?: { title: string; body: string }
  /** Optional hero visual override. Falls back to the generic
   *  creator-mosaic-style preview. */
  heroVisual?: React.ReactNode
}

export function SolutionPage({
  eyebrow,
  title,
  subtitle,
  primaryCta = { label: "Start free", href: "/signup" },
  secondaryCta = { label: "See a live creator site", href: "/p/snapied" },
  outcomes,
  featureMap,
  comparison,
  cta,
  heroVisual,
}: SolutionPageProps) {
  return (
    <>
      {/* ── Hero ────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-secondary/60 via-background to-background" />
        <div className="pointer-events-none absolute -top-24 left-1/2 h-[480px] w-[840px] -translate-x-1/2 rounded-full bg-primary/10 opacity-50 blur-3xl" />
        <div className="relative mx-auto max-w-6xl px-6 py-20 sm:py-24 lg:px-8">
          <Link
            href="/solutions"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> All solutions
          </Link>
          <div className="mt-6 grid items-center gap-12 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-semibold text-accent-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                {eyebrow}
              </div>
              <h1 className="mt-5 text-balance text-4xl font-black leading-[1.02] tracking-[-0.025em] sm:text-5xl lg:text-[3.75rem]">
                {title}
              </h1>
              <p className="mt-5 max-w-xl text-balance text-lg leading-relaxed text-muted-foreground">
                {subtitle}
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Button asChild size="lg" className="gap-2">
                  <Link href={primaryCta.href}>
                    {primaryCta.label}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link href={secondaryCta.href}>{secondaryCta.label}</Link>
                </Button>
              </div>
              <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
                <TrustChip label="0% commission" />
                <TrustChip label="Free to start, no card" />
                <TrustChip label="Full export, any plan" />
              </div>
            </div>

            {/* Visual */}
            <div>{heroVisual ?? <DefaultSolutionVisual />}</div>
          </div>
        </div>
      </section>

      {/* ── Outcomes — what you're trying to do ────────────────── */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-5xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
              What you actually want
            </p>
            <h2 className="mt-3 text-balance text-3xl font-bold tracking-tight sm:text-4xl">
              Three things this needs to do.
            </h2>
          </div>
          <div className="mt-10 grid gap-3 sm:grid-cols-3">
            {outcomes.map((o) => (
              <div
                key={o.title}
                className="rounded-2xl border border-border bg-card p-6"
              >
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  {o.icon}
                </span>
                <p className="mt-4 text-base font-bold leading-snug">{o.title}</p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {o.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How the platform maps ───────────────────────────────── */}
      <section className="border-y border-border/60 bg-muted/20 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
              How it maps
            </p>
            <h2 className="mt-3 text-balance text-3xl font-bold tracking-tight sm:text-4xl">
              Every job above — one workspace.
            </h2>
            <p className="mt-3 text-muted-foreground">
              Each capability below ships in the free Starter tier. Pro+ unlocks
              custom domain, white-label, and team seats.
            </p>
          </div>
          <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {featureMap.map((f) => (
              <Link
                key={f.title}
                href={f.href}
                className="group flex flex-col gap-2 rounded-xl border border-border bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
              >
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  {f.icon}
                </span>
                <p className="mt-2 text-sm font-bold">{f.title}</p>
                <p className="text-[12.5px] leading-relaxed text-muted-foreground">
                  {f.body}
                </p>
                <span className="mt-auto inline-flex items-center gap-1 text-[11px] font-semibold text-primary opacity-0 transition-opacity group-hover:opacity-100">
                  See how
                  <ArrowRight className="h-3 w-3" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Comparison ──────────────────────────────────────────── */}
      {comparison && (
        <section className="py-16 sm:py-20">
          <div className="mx-auto max-w-4xl px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
                vs the alternative
              </p>
              <h2 className="mt-3 text-balance text-3xl font-bold tracking-tight sm:text-4xl">
                Why not just use {comparison.alternativeName}?
              </h2>
              <p className="mt-3 text-muted-foreground">
                You can. Here&rsquo;s where the trade-off lands.
              </p>
            </div>
            <div className="mt-10 overflow-hidden rounded-2xl border border-border bg-card">
              <div className="grid grid-cols-[1.4fr_1fr_1fr] divide-x divide-border border-b border-border bg-muted/30">
                <div className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Capability
                </div>
                <div className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-primary">
                  The Big Class
                </div>
                <div className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  {comparison.alternativeName}
                </div>
              </div>
              {comparison.rows.map((r) => (
                <div
                  key={r.label}
                  className="grid grid-cols-[1.4fr_1fr_1fr] divide-x divide-border/60 border-b border-border/60 last:border-b-0"
                >
                  <div className="px-4 py-3 text-sm font-semibold">{r.label}</div>
                  <div className="flex items-start gap-2 px-4 py-3 text-sm">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                    <span>{r.us}</span>
                  </div>
                  <div className="flex items-start gap-2 px-4 py-3 text-sm text-muted-foreground">
                    <X className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/60" />
                    <span>{r.them}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Final CTA ───────────────────────────────────────────── */}
      <section className="relative overflow-hidden py-20 sm:py-24">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.04] via-background to-background" />
        <div className="relative mx-auto max-w-3xl px-6 text-center lg:px-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <Sparkles className="h-3 w-3" />
            Free Starter tier · no card
          </div>
          <h2 className="mt-5 text-balance text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            {cta?.title ?? "Start in 30 seconds."}
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-balance text-base leading-relaxed text-muted-foreground sm:text-lg">
            {cta?.body ??
              "Claim your subdomain, drop in your logo, and you're live. Bring your audience over whenever you're ready."}
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="gap-2">
              <Link href="/signup">
                Claim your subdomain
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/pricing">See pricing</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  )
}

// ─── Default hero visual (used when a lander doesn't override) ───

function DefaultSolutionVisual() {
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[460px]">
      <div className="absolute inset-4 rounded-2xl border border-border bg-card shadow-2xl">
        <div className="flex items-center gap-1.5 border-b border-border/60 bg-muted/40 px-3 py-2">
          <span className="h-2 w-2 rounded-full bg-rose-400/70" />
          <span className="h-2 w-2 rounded-full bg-amber-400/70" />
          <span className="h-2 w-2 rounded-full bg-emerald-400/70" />
        </div>
        <div className="p-5">
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="h-2 rounded bg-foreground/10"
                style={{ width: `${90 - i * 12}%` }}
              />
            ))}
          </div>
          <div className="mt-5 grid grid-cols-3 gap-2">
            {["bg-primary/20", "bg-rose-500/20", "bg-amber-500/20"].map((c, i) => (
              <div key={i} className={`aspect-video rounded ${c}`} />
            ))}
          </div>
        </div>
      </div>
      <div className="pointer-events-none absolute -bottom-6 -right-6 h-32 w-32 rounded-full bg-primary/10 blur-2xl" />
    </div>
  )
}

function TrustChip({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <CheckCircle2 className="h-3.5 w-3.5 text-success" />
      <span className="font-medium text-foreground/80">{label}</span>
    </span>
  )
}
