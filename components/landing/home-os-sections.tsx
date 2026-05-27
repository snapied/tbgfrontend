"use client"

// Homepage sections for the creator-OS positioning.
//
// One file, six exports — each section uses the same outer shell so
// the page reads as one rhythm rather than 6 different layouts. The
// sections, in homepage order:
//   1. SellEverything    — the 7 product types the platform actually ships
//   2. PortalPitch       — your audience lives at your URL (the under-sold story)
//   3. LivePitch         — live without Zoom + recordings + transcripts
//   4. DocsPitch         — the newly-shipped knowledge layer
//   5. IndiaReadyWorld   — India-native + multilingual + global-ready
//   6. ClosingCTA        — final claim-your-subdomain prompt
//
// Each section is intentionally short. The homepage's job is to
// answer "what is this and why should I care", not to teach. Depth
// lives on /features/* and /solutions/* pages.

import Link from "next/link"
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  CreditCard,
  FileText,
  Film,
  Gift,
  Globe2,
  GraduationCap,
  IndianRupee,
  Key,
  Languages,
  Layers,
  MessageSquare,
  Mic,
  Package,
  PenSquare,
  Repeat,
  ShoppingBag,
  Sparkles,
  Trophy,
  Users,
  Wallet,
  Zap,
} from "lucide-react"
import { Button } from "@/components/ui/button"

// ─── Shared section primitives ───────────────────────────────────

function SectionShell({
  eyebrow,
  title,
  subtitle,
  tone = "default",
  children,
}: {
  eyebrow: string
  title: React.ReactNode
  subtitle?: React.ReactNode
  tone?: "default" | "muted" | "primary"
  children: React.ReactNode
}) {
  const bgByTone: Record<string, string> = {
    default: "",
    muted: "bg-muted/30 border-y border-border/60",
    primary: "bg-gradient-to-b from-primary/[0.03] via-background to-background",
  }
  return (
    <section className={`py-20 sm:py-24 ${bgByTone[tone] ?? ""}`}>
      <div className="mx-auto max-w-6xl px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
            {eyebrow}
          </p>
          <h2 className="mt-3 text-balance text-3xl font-bold tracking-tight sm:text-4xl lg:text-[2.75rem] lg:leading-[1.1]">
            {title}
          </h2>
          {subtitle && (
            <p className="mx-auto mt-4 max-w-2xl text-balance text-base leading-relaxed text-muted-foreground sm:text-lg">
              {subtitle}
            </p>
          )}
        </div>
        <div className="mt-12">{children}</div>
      </div>
    </section>
  )
}

// ─── 1. SellEverything ───────────────────────────────────────────
// The 7 real product types, surfaced honestly. No invented kinds.

export function SellEverything() {
  const types = [
    {
      icon: GraduationCap,
      label: "Courses",
      body: "Self-paced with modules, lessons, quizzes, certificates.",
      color: "text-primary bg-primary/10",
    },
    {
      icon: Calendar,
      label: "Live cohorts",
      body: "Time-boxed batches with a feed, leaderboard, and recordings.",
      color: "text-rose-700 bg-rose-500/10",
    },
    {
      icon: Repeat,
      label: "Memberships",
      body: "Recurring access to a bundle of products. Trials supported.",
      color: "text-violet-700 bg-violet-500/10",
    },
    {
      icon: Mic,
      label: "1:1 sessions",
      body: "Coaching calls with booking-link delivery.",
      color: "text-amber-700 bg-amber-500/10",
    },
    {
      icon: Film,
      label: "Webinars",
      body: "Scheduled events with link delivery and recording.",
      color: "text-emerald-700 bg-emerald-500/10",
    },
    {
      icon: Package,
      label: "Digital downloads",
      body: "PDFs, audio, video, ZIPs, design files.",
      color: "text-blue-700 bg-blue-500/10",
    },
    {
      icon: Key,
      label: "License keys",
      body: "Auto-issued from a pool. For software and templates.",
      color: "text-slate-700 bg-slate-500/10",
    },
    {
      icon: Layers,
      label: "Bundles",
      body: "Combine any of the above into one offer at one price.",
      color: "text-fuchsia-700 bg-fuchsia-500/10",
    },
  ]

  return (
    <SectionShell
      eyebrow="One platform · everything you sell"
      title="Your whole catalogue — one workspace, one checkout."
      subtitle="Pick what fits your audience. Bundle them. Subscription-gate them. Sell them at any price model — one-time, recurring, pay-what-you-want — without bolting on another tool."
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {types.map((t) => (
          <div
            key={t.label}
            className="group flex flex-col gap-2 rounded-xl border border-border bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
          >
            <span
              className={`flex h-9 w-9 items-center justify-center rounded-lg ${t.color}`}
            >
              <t.icon className="h-4 w-4" />
            </span>
            <p className="mt-1 text-sm font-bold">{t.label}</p>
            <p className="text-[12.5px] leading-relaxed text-muted-foreground">
              {t.body}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <Wallet className="h-3.5 w-3.5 text-primary" /> One-time
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Repeat className="h-3.5 w-3.5 text-primary" /> Subscription
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Gift className="h-3.5 w-3.5 text-primary" /> Pay what you want
        </span>
        <span className="inline-flex items-center gap-1.5">
          <CreditCard className="h-3.5 w-3.5 text-primary" /> Coupons + trials
        </span>
        <span className="inline-flex items-center gap-1.5">
          <IndianRupee className="h-3.5 w-3.5 text-primary" /> UPI · cards · NetBanking
        </span>
      </div>

      <div className="mt-8 text-center">
        <Button asChild variant="outline" size="lg" className="gap-2">
          <Link href="/features/storefront">
            See the storefront
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </SectionShell>
  )
}

// ─── 2. PortalPitch ──────────────────────────────────────────────
// The under-sold story: every tenant gets a real portal at their URL.

export function PortalPitch() {
  return (
    <section className="border-y border-border bg-gradient-to-b from-secondary/40 via-background to-background py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-[1fr_1.05fr] lg:gap-16">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
              Your audience · your URL
            </p>
            <h2 className="mt-3 text-balance text-3xl font-bold tracking-tight sm:text-4xl lg:text-[2.75rem] lg:leading-[1.1]">
              Your audience doesn&rsquo;t live on someone else&rsquo;s platform.
            </h2>
            <p className="mt-4 max-w-xl text-balance text-base leading-relaxed text-muted-foreground sm:text-lg">
              Every workspace ships a real public site — page builder, 14 section
              types, 8 theme presets, custom fonts, a blog, faculty showcase, Wall
              of Love. Drop it on your own domain. Strip every trace of platform
              branding. Done.
            </p>
            <ul className="mt-6 space-y-2.5 text-sm">
              {[
                "14 section types — hero, courses, store, FAQ, faculty, testimonials, blog, video, gallery, contact form, and more",
                "8 theme presets · 6 header layouts · 6 footer layouts · custom CSS",
                "Custom domain via CNAME · zero platform badge on Pro+",
                "Per-page SEO — meta, OG image, JSON-LD, sitemap, robots",
                "A real blog with scheduling, tags, comments, reactions, lead capture",
              ].map((b) => (
                <li key={b} className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button asChild size="lg" className="gap-2">
                <Link href="/features/portal">
                  See what a portal can do
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/p/snapied">Visit a live one</Link>
              </Button>
            </div>
          </div>

          {/* Right — portal preview mockup */}
          <PortalMockup />
        </div>
      </div>
    </section>
  )
}

function PortalMockup() {
  return (
    <div className="relative">
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
        {/* Browser chrome */}
        <div className="flex items-center gap-1.5 border-b border-border/60 bg-muted/40 px-3 py-2">
          <span className="h-2 w-2 rounded-full bg-rose-400/70" />
          <span className="h-2 w-2 rounded-full bg-amber-400/70" />
          <span className="h-2 w-2 rounded-full bg-emerald-400/70" />
          <span className="ml-3 inline-flex items-center gap-1.5 rounded-md bg-background px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
            <Globe2 className="h-2.5 w-2.5" />
            ananya.com
          </span>
        </div>
        {/* Portal hero */}
        <div className="bg-gradient-to-b from-primary/10 to-background px-5 py-6">
          <p className="text-[10px] font-bold uppercase tracking-wider text-primary">
            Ananya · Maths for engineers
          </p>
          <p className="mt-2 font-serif text-xl font-black leading-tight">
            Crack JEE Advanced without losing your weekends.
          </p>
          <div className="mt-3 flex gap-2">
            <span className="rounded-md bg-primary px-2.5 py-1 text-[10px] font-bold text-primary-foreground">
              Join Cohort 04
            </span>
            <span className="rounded-md border border-border px-2.5 py-1 text-[10px] font-semibold">
              Watch a sample
            </span>
          </div>
        </div>
        {/* Courses row */}
        <div className="border-t border-border/60 px-5 py-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Featured courses
          </p>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {[
              {
                title: "Calculus crash",
                price: "₹2,999",
                img: "./calculus-crash.webp",
              },
              {
                title: "Vectors deep",
                price: "₹4,499",
                img: "./vector.webp"
              },
              {
                title: "Trig in 5 days",
                price: "₹1,499",
                img: "./trig.webp"
              },
            ].map((c) => (
              <div
                key={c.title}
                className="group/card rounded-lg border border-border bg-background p-2 transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="aspect-video rounded overflow-hidden bg-muted">
                  <img
                    src={c.img}
                    alt={c.title}
                    className="h-full w-full object-cover transition-transform group-hover/card:scale-105"
                  />
                </div>
                <p className="mt-1.5 truncate text-[10px] font-semibold">{c.title}</p>
                <p className="text-[9px] text-emerald-600 font-bold">{c.price}</p>
              </div>
            ))}
          </div>
        </div>
        {/* Faculty + footer */}
        <div className="flex items-center justify-between border-t border-border/60 px-5 py-3">
          <div className="flex -space-x-2">
            {["bg-primary/30", "bg-rose-500/30", "bg-amber-500/30"].map((c, i) => (
              <span
                key={i}
                className={`inline-block h-5 w-5 rounded-full ring-2 ring-card ${c}`}
              />
            ))}
          </div>
          <span className="text-[9px] text-muted-foreground">
            Built on The Big Class · or hidden, your call
          </span>
        </div>
      </div>
      <div className="pointer-events-none absolute -bottom-4 -right-4 h-32 w-32 rounded-full bg-primary/10 blur-2xl" />
    </div>
  )
}

// ─── 3. LivePitch ────────────────────────────────────────────────

export function LivePitch() {
  const features = [
    {
      icon: Film,
      title: "Cloud recordings",
      body: "Every class auto-saves to your library, no extra subscription.",
    },
    {
      icon: PenSquare,
      title: "Auto-chapters",
      body: "Transcript-derived chapter markers ship with the recording.",
    },
    {
      icon: MessageSquare,
      title: "Class chat persists",
      body: "Chat threads stay attached to the recording. Re-watch with context.",
    },
    {
      icon: Trophy,
      title: "Cohort leaderboard",
      body: "Attendance + quiz + assignment points wired into the feed.",
    },
  ]
  return (
    <SectionShell
      eyebrow="Live · Cohorts · Recordings"
      title="Go live without Zoom. Or seat fees."
      subtitle="LiveKit-powered rooms built into every cohort. Cloud recording included. No more 'pay $15/month per host' surprises — live is part of the platform, not a third party."
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {features.map((f) => (
          <div
            key={f.title}
            className="rounded-xl border border-border bg-card p-5"
          >
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-rose-500/10 text-rose-700">
              <f.icon className="h-4 w-4" />
            </span>
            <p className="mt-3 text-sm font-bold">{f.title}</p>
            <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">
              {f.body}
            </p>
          </div>
        ))}
      </div>
      <div className="mt-8 text-center">
        <Button asChild variant="outline" size="lg" className="gap-2">
          <Link href="/features/live-classes">
            See live + cohorts
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </SectionShell>
  )
}

// ─── 4. DocsPitch ────────────────────────────────────────────────

export function DocsPitch() {
  return (
    <section className="border-y border-border bg-gradient-to-b from-violet-500/[0.04] via-background to-background py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
          <div>
            <p className="inline-flex items-center gap-1.5 rounded-full bg-violet-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-violet-700">
              <Zap className="h-3 w-3" /> Just shipped
            </p>
            <h2 className="mt-3 text-balance text-3xl font-bold tracking-tight sm:text-4xl lg:text-[2.75rem] lg:leading-[1.1]">
              The knowledge layer your audience actually reads.
            </h2>
            <p className="mt-4 max-w-xl text-balance text-base leading-relaxed text-muted-foreground sm:text-lg">
              A multiplayer doc editor for handbooks, study guides, cohort wikis,
              and a public knowledge hub. Embed lessons, recordings, whiteboards,
              and quizzes as live cards — references that update when the source
              does. Publish to a cohort, a course, or the open web.
            </p>
            <ul className="mt-6 space-y-2.5 text-sm">
              {[
                "BlockNote editor — slash commands, drag-rearrange, multiplayer cursors",
                "5 typed embeds — lesson · recording · whiteboard · quiz · doc",
                "6-tier audience — private → cohort → course → public on the web",
                "Public hub at yourdomain.com/k — SEO-indexed, custom slug + OG image per page",
              ].map((b) => (
                <li key={b} className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
            <div className="mt-7">
              <Button asChild size="lg" className="gap-2">
                <Link href="/features/docs">
                  See Docs
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>

          {/* Right — doc preview mockup */}
          <div className="relative">
            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
              <div className="flex items-center gap-2 border-b border-border/60 bg-muted/40 px-3 py-2">
                <FileText className="h-3.5 w-3.5 text-violet-700" />
                <span className="font-mono text-[10px] text-muted-foreground">
                  /docs/cohort-04-handbook
                </span>
              </div>
              <div className="p-5">
                <span className="text-2xl">📘</span>
                <p className="mt-1 font-serif text-xl font-black tracking-tight">
                  Cohort 04 · Handbook
                </p>
                <p className="mt-2 text-[11px] text-muted-foreground">
                  How we run this batch · schedule, doubts, grading, refunds.
                </p>
                <div className="mt-4 space-y-1.5">
                  <div className="h-2 w-full rounded bg-foreground/10" />
                  <div className="h-2 w-5/6 rounded bg-foreground/10" />
                  <div className="h-2 w-2/3 rounded bg-foreground/10" />
                </div>
                <div className="mt-4 rounded-lg border border-border bg-muted/30 p-2.5">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                    Recording · 12:34
                  </p>
                  <p className="mt-0.5 truncate text-xs font-semibold">
                    Week 1 — Cohort kick-off
                  </p>
                </div>
                <div className="mt-2 rounded-lg border border-border bg-muted/30 p-2.5">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                    Quiz · 8 questions
                  </p>
                  <p className="mt-0.5 truncate text-xs font-semibold">
                    Onboarding self-check
                  </p>
                </div>
              </div>
            </div>
            <div className="pointer-events-none absolute -top-4 -right-4 h-32 w-32 rounded-full bg-violet-500/10 blur-2xl" />
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── 5. IndiaReadyWorld ──────────────────────────────────────────

export function IndiaReadyWorld() {
  const stack = [
    { label: "UPI", body: "Native checkout via Razorpay" },
    { label: "Cards · NetBanking · EMI", body: "Every Indian + international card" },
    { label: "GST", body: "GSTIN, GST-inclusive invoices" },
    { label: "INR pricing", body: "No forced FX dance" },
    { label: "10 languages", body: "Hindi · Tamil · Spanish · French · more" },
    { label: "Direct payouts", body: "T+2 to your bank, no middleman" },
  ]
  return (
    <SectionShell
      eyebrow="India-native · global-ready"
      title="Built for India. Ready for the world."
      subtitle="The creator economy here moves at UPI speed and INR pricing. We don't bolt that on — it's the base. Your global audience gets cards + email; your Indian audience gets UPI + WhatsApp delivery + GST invoicing."
      tone="muted"
    >
      <div className="mx-auto grid max-w-4xl gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {stack.map((s) => (
          <div
            key={s.label}
            className="flex items-start gap-3 rounded-xl border border-border bg-card p-4"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <IndianRupee className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-bold">{s.label}</p>
              <p className="text-[12px] leading-relaxed text-muted-foreground">
                {s.body}
              </p>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-6 text-center">
        <Button asChild variant="ghost" className="gap-2">
          <Link href="/features/multilingual">
            10-language portals + WhatsApp delivery
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </SectionShell>
  )
}

// ─── 6. ClosingCTA ───────────────────────────────────────────────

export function ClosingCTA() {
  return (
    <section className="relative overflow-hidden py-24 sm:py-32">
      <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.06] via-background to-background" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[420px] w-[820px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 opacity-40 blur-3xl" />

      <div className="relative mx-auto max-w-3xl px-6 text-center lg:px-8">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          <Sparkles className="h-3 w-3" />
          Free to start · no card · 30 seconds
        </div>
        <h2 className="mt-5 text-balance text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
          Your internet business
          <br />
          <span className="bg-gradient-to-r from-primary via-primary to-emerald-700 bg-clip-text text-transparent">
            starts at your subdomain.
          </span>
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-balance text-base leading-relaxed text-muted-foreground sm:text-lg">
          Type your brand name. Hit go. You&rsquo;ll be looking at your live workspace
          in under a minute — store, courses, community, the lot.
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
        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-success" /> 0% commission
          </span>
          <span className="inline-flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-success" /> Full export, any plan
          </span>
          <span className="inline-flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-success" /> 30-day refund
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5 text-primary" /> Creators in 12+ countries
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Languages className="h-3.5 w-3.5 text-primary" /> 10 languages
          </span>
        </div>
      </div>
    </section>
  )
}

// Suppress lint on icons reserved for variants.
void ShoppingBag
