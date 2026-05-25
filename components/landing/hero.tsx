"use client"

// Above-the-fold hero — creator-business OS positioning.
//
// Headline is intentionally 4 words. Subhead names the five things
// the platform does in plain verbs so the visitor recognises the
// breadth in one read. CTA pair = primary subdomain claim + a
// secondary link into a live tenant so visitors who want to *see*
// the product (not pitch-read) have a path.
//
// Visual = a quiet creator-mosaic. Four product surfaces (Portal,
// Live, Docs, Storefront) rendered as tilted stacked cards — proof
// of breadth without the animated-orbit / live-counter noise the
// prior hero leaned on.

import Link from "next/link"
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  FileText,
  Globe2,
  IndianRupee,
  PenSquare,
  Play,
  ShoppingBag,
  Sparkles,
  Users,
} from "lucide-react"
import { HeroCTAClaim } from "@/components/landing/hero-cta-claim"

export function LandingHero() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-secondary/70 via-background to-background" />
      <div className="pointer-events-none absolute -top-32 left-1/2 h-[520px] w-[920px] -translate-x-1/2 rounded-full bg-primary/10 opacity-50 blur-3xl" />
      <div className="pointer-events-none absolute top-40 right-[15%] h-[260px] w-[260px] rounded-full bg-accent/10 opacity-40 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-6 py-20 sm:py-24 lg:px-8 lg:py-28">
        <div className="grid items-center gap-14 lg:grid-cols-[1.05fr_1fr] lg:gap-20">
          {/* LEFT — copy column */}
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-semibold text-accent-foreground">
              <Sparkles className="h-3 w-3 text-accent" />
              The creator-business platform · built India-first
            </div>

            <h1 className="mt-6 text-balance text-5xl font-black leading-[1.02] tracking-[-0.03em] sm:text-6xl lg:text-7xl">
              Build your{" "}
              <span className="relative inline-block">
                <span className="relative z-10 bg-gradient-to-r from-primary via-primary to-emerald-700 bg-clip-text text-transparent">
                  internet business.
                </span>
                <span className="absolute inset-x-0 bottom-2 -z-0 h-3 -skew-x-6 bg-accent/40" />
              </span>
            </h1>

            <p className="mt-6 max-w-xl text-balance text-lg leading-relaxed text-muted-foreground">
              One place to host your audience, ship your products, run your community, go
              live, and get paid — on your own URL, with zero commission on what you earn.
            </p>

            {/* Primary CTA — interactive subdomain claim. Typing
                commits the visitor mentally before they ever sign up. */}
            <div className="mt-8">
              <HeroCTAClaim />
            </div>

            {/* Secondary path — show, don't tell. Links to a real
                tenant so visitors who want to see a finished
                creator site can. */}
            <p className="mt-5 text-sm text-muted-foreground">
              Or{" "}
              <Link
                href="/p/snapied"
                className="inline-flex items-center gap-1 font-semibold text-primary underline-offset-2 hover:underline"
              >
                see a real creator site
                <ArrowRight className="h-3 w-3" />
              </Link>{" "}
              · No card needed to start.
            </p>

            {/* Trust ribbon — four product commitments, one row.
                Replaces the 4-cluster credibility ribbon from the
                old hero. */}
            <div className="mt-10 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
              <TrustChip label="0% commission" />
              <TrustChip label="Direct payouts (UPI + cards)" />
              <TrustChip label="Custom domain · white-label" />
              <TrustChip label="One-click full export" />
            </div>
          </div>

          {/* RIGHT — creator mosaic. Four tilted product surfaces
              composed as a single visual. Each card is a quiet
              miniature of a real product surface. */}
          <CreatorMosaic />
        </div>
      </div>
    </section>
  )
}

// ─── Creator mosaic — the right-column visual ────────────────────

function CreatorMosaic() {
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[520px]">
      {/* Card 1 — Public portal (back-left) */}
      <MosaicCard
        className="absolute left-0 top-4 w-[62%] -rotate-[4deg]"
        eyebrow="Your URL"
        title="ananya.com / academy"
        tone="primary"
        icon={<Globe2 className="h-3.5 w-3.5" />}
      >
        <div className="space-y-1.5">
          <div className="h-2 w-3/4 rounded bg-foreground/15" />
          <div className="h-2 w-1/2 rounded bg-foreground/10" />
          <div className="mt-3 grid grid-cols-3 gap-1.5">
            <div className="aspect-video rounded overflow-hidden bg-primary/10">
              <img
                src="https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=120&h=80&q=80"
                alt="Math Course"
                className="h-full w-full object-cover"
              />
            </div>
            <div className="aspect-video rounded overflow-hidden bg-rose-500/10">
              <img
                src="https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=120&h=80&q=80"
                alt="Yoga Course"
                className="h-full w-full object-cover"
              />
            </div>
            <div className="aspect-video rounded overflow-hidden bg-amber-500/10">
              <img
                src="https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=120&h=80&q=80"
                alt="Coding Course"
                className="h-full w-full object-cover"
              />
            </div>
          </div>
        </div>
      </MosaicCard>

      {/* Card 2 — Live class (back-right) */}
      <MosaicCard
        className="absolute right-0 top-0 w-[58%] rotate-[5deg]"
        eyebrow="Live now · 142"
        title="Cohort B · Week 3"
        tone="rose"
        icon={<Play className="h-3.5 w-3.5" />}
      >
        <div className="grid grid-cols-3 gap-1.5">
          {[
            "/people/student-1.png",
            "/people/student-2.png",
            "/people/student-3.png",
            "/people/student-4.jpg",
            "/people/meena.jpg",
            "/people/deepika.jpg",
          ].map((src, i) => (
            <div
              key={i}
              className="aspect-video rounded overflow-hidden bg-foreground/10 transition-transform hover:scale-105"
            >
              <img
                src={src}
                alt="Live student avatar"
                className="h-full w-full object-cover"
              />
            </div>
          ))}
        </div>
        <div className="mt-2 flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-rose-500" />
          <span className="text-[9px] font-bold uppercase tracking-wider text-rose-600">
            Recording · auto-chapters
          </span>
        </div>
      </MosaicCard>

      {/* Card 3 — Storefront (front-left) */}
      <MosaicCard
        className="absolute bottom-4 left-6 w-[55%] -rotate-[2deg]"
        eyebrow="Storefront"
        title="3 products · ₹84,210 today"
        tone="emerald"
        icon={<ShoppingBag className="h-3.5 w-3.5" />}
      >
        <div className="space-y-1.5">
          {[
            {
              label: "Cohort 04 · Live",
              price: "₹14,999",
              img: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=40&h=40&q=80",
            },
            {
              label: "Annual membership",
              price: "₹4,999/yr",
              img: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=40&h=40&q=80",
            },
            {
              label: "Notion templates",
              price: "₹599",
              img: "https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&w=40&h=40&q=80",
            },
          ].map((p) => (
            <div
              key={p.label}
              className="flex items-center gap-1.5 rounded bg-muted/40 px-1.5 py-1 transition-all hover:bg-muted/60"
            >
              <img
                src={p.img}
                alt={p.label}
                className="h-4.5 w-4.5 rounded object-cover"
              />
              <span className="flex-1 truncate text-[9px] font-semibold">{p.label}</span>
              <span className="text-[9px] font-bold text-emerald-600">{p.price}</span>
            </div>
          ))}
        </div>
      </MosaicCard>

      {/* Card 4 — Docs (front-right) */}
      <MosaicCard
        className="absolute bottom-0 right-4 w-[50%] rotate-[3deg]"
        eyebrow="Knowledge layer"
        title="Onboarding doc"
        tone="violet"
        icon={<FileText className="h-3.5 w-3.5" />}
      >
        <div className="space-y-1">
          <div className="h-1.5 w-full rounded bg-foreground/15" />
          <div className="h-1.5 w-5/6 rounded bg-foreground/10" />
          <div className="h-1.5 w-2/3 rounded bg-foreground/10" />
          <div className="mt-2 flex items-center gap-1.5 rounded bg-violet-500/10 px-1.5 py-1">
            <img
              src="https://images.unsplash.com/photo-1616469829581-73993eb86b02?auto=format&fit=crop&w=40&h=30&q=80"
              alt="Whiteboard embed thumbnail"
              className="h-3.5 w-5 rounded object-cover"
            />
            <span className="text-[9px] font-semibold text-violet-700">
              Embed · Whiteboard
            </span>
          </div>
        </div>
      </MosaicCard>

      {/* Float chips — five product-surface tags drifting around
          the mosaic. Each names a real capability. */}
      <FloatChip className="-top-2 right-1/3" icon={<Users className="h-3 w-3" />}>
        Community
      </FloatChip>
      <FloatChip
        className="top-1/3 -right-2"
        icon={<Calendar className="h-3 w-3" />}
      >
        Cohorts
      </FloatChip>
      <FloatChip
        className="bottom-1/3 -left-2"
        icon={<IndianRupee className="h-3 w-3" />}
      >
        UPI · Razorpay
      </FloatChip>
    </div>
  )
}

function MosaicCard({
  className,
  eyebrow,
  title,
  tone,
  icon,
  children,
}: {
  className?: string
  eyebrow: string
  title: string
  tone: "primary" | "rose" | "emerald" | "violet"
  icon: React.ReactNode
  children: React.ReactNode
}) {
  const ringByTone: Record<typeof tone, string> = {
    primary: "ring-primary/15",
    rose: "ring-rose-500/15",
    emerald: "ring-emerald-500/15",
    violet: "ring-violet-500/15",
  }
  const dotByTone: Record<typeof tone, string> = {
    primary: "bg-primary/15 text-primary",
    rose: "bg-rose-500/15 text-rose-600",
    emerald: "bg-emerald-500/15 text-emerald-700",
    violet: "bg-violet-500/15 text-violet-700",
  }
  return (
    <div
      className={`rounded-2xl border border-border/80 bg-card p-3 shadow-2xl ring-1 ${ringByTone[tone]} backdrop-blur-sm transition-transform hover:rotate-0 ${className ?? ""}`}
    >
      <div className="mb-2 flex items-center gap-1.5">
        <span
          className={`flex h-5 w-5 items-center justify-center rounded ${dotByTone[tone]}`}
        >
          {icon}
        </span>
        <p className="flex-1 truncate text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
          {eyebrow}
        </p>
      </div>
      <p className="mb-2 truncate text-xs font-bold">{title}</p>
      {children}
    </div>
  )
}

function FloatChip({
  className,
  icon,
  children,
}: {
  className?: string
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div
      className={`absolute inline-flex items-center gap-1 rounded-full border border-border bg-card px-2 py-1 text-[10px] font-bold shadow-md ${className ?? ""}`}
    >
      <span className="text-primary">{icon}</span>
      {children}
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
