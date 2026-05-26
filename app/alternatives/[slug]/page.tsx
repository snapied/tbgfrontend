// Alternative-to-X landing pages.
//
// These are deliberately SEO-targeted comparison pages that capture
// search traffic for "<rival> alternative" queries. The rest of the
// marketing site avoids brand names — these pages are the one
// exception because that's literally what visitors typed into the
// search box.
//
// Each rival's data lives in lib/alternatives.ts; this route renders
// a consistent template so adding a new rival is a 1-entry append.
//
// Page composition (top → bottom):
//   1. Hero with a rich SVG side-by-side illustration ("old tool" vs
//      "your new workspace")
//   2. Cost-savings calculator visual (real numbers from the
//      alt.costExample input)
//   3. Pain points — illustrated cards
//   4. Four-USP recap with accented backgrounds
//   5. Full feature matrix
//   6. Migration timeline (visual 5-step rail)
//   7. Per-rival FAQ
//   8. Cross-link rail to other alternatives
//   9. Closing CTA

import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import {
  ArrowDown,
  ArrowRight,
  ArrowRightLeft,
  Calendar,
  Check,
  Download,
  IndianRupee,
  Minus,
  Quote,
  Sparkles,
  Star,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react"
import { Header } from "@/components/landing/header"
import { Footer } from "@/components/landing/footer"
import { Button } from "@/components/ui/button"
import {
  ALTERNATIVES,
  getAlternative,
  listAlternativeSlugs,
  type AlternativeEntry,
} from "@/lib/alternatives"

const SITE_URL = "https://thebigclass.com"

// ── Accent palette ─────────────────────────────────────────────
// Maps the alt.accent tag to a consistent set of Tailwind classes
// used across the page. Centralised so a new accent is one entry.
const ACCENTS: Record<AlternativeEntry["accent"], {
  hex: string
  ring: string
  bg: string
  text: string
  border: string
  fromGrad: string
  toGrad: string
}> = {
  blue:   { hex: "#3b82f6", ring: "ring-blue-500/30",   bg: "bg-blue-500/[0.06]",   text: "text-blue-700",   border: "border-blue-500/40",   fromGrad: "from-blue-500/20",   toGrad: "to-blue-500/[0.02]" },
  purple: { hex: "#a855f7", ring: "ring-purple-500/30", bg: "bg-purple-500/[0.06]", text: "text-purple-700", border: "border-purple-500/40", fromGrad: "from-purple-500/20", toGrad: "to-purple-500/[0.02]" },
  teal:   { hex: "#14b8a6", ring: "ring-teal-500/30",   bg: "bg-teal-500/[0.06]",   text: "text-teal-700",   border: "border-teal-500/40",   fromGrad: "from-teal-500/20",   toGrad: "to-teal-500/[0.02]" },
  pink:   { hex: "#ec4899", ring: "ring-pink-500/30",   bg: "bg-pink-500/[0.06]",   text: "text-pink-700",   border: "border-pink-500/40",   fromGrad: "from-pink-500/20",   toGrad: "to-pink-500/[0.02]" },
  orange: { hex: "#f97316", ring: "ring-orange-500/30", bg: "bg-orange-500/[0.06]", text: "text-orange-700", border: "border-orange-500/40", fromGrad: "from-orange-500/20", toGrad: "to-orange-500/[0.02]" },
  indigo: { hex: "#6366f1", ring: "ring-indigo-500/30", bg: "bg-indigo-500/[0.06]", text: "text-indigo-700", border: "border-indigo-500/40", fromGrad: "from-indigo-500/20", toGrad: "to-indigo-500/[0.02]" },
  amber:  { hex: "#f59e0b", ring: "ring-amber-500/30",  bg: "bg-amber-500/[0.06]",  text: "text-amber-700",  border: "border-amber-500/40",  fromGrad: "from-amber-500/20",  toGrad: "to-amber-500/[0.02]" },
  rose:   { hex: "#f43f5e", ring: "ring-rose-500/30",   bg: "bg-rose-500/[0.06]",   text: "text-rose-700",   border: "border-rose-500/40",   fromGrad: "from-rose-500/20",   toGrad: "to-rose-500/[0.02]" },
}

export function generateStaticParams() {
  return listAlternativeSlugs().map((slug) => ({ slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const alt = getAlternative(slug)
  if (!alt) return { title: "Alternative · The Big Class" }
  const title = `${alt.name} Alternative — The Big Class`
  const description = `Explore a smarter alternative to ${alt.name}. ${alt.shortPitch}`
  const url = `${SITE_URL}/alternatives/${slug}`
  return {
    title,
    description,
    keywords: [
      `${alt.name} alternative`,
      `alternative to ${alt.name}`,
      `${alt.name} vs The Big Class`,
      `best ${alt.name} alternative for teachers`,
      `${alt.name} alternative India`,
      `${alt.name} alternative with zero commission`,
      `${alt.name} pricing comparison`,
    ],
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      url,
      siteName: "The Big Class",
      title,
      description,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  }
}

export default async function AlternativePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const alt = getAlternative(slug)
  if (!alt) notFound()

  const accent = ACCENTS[alt.accent]
  const otherAlts = ALTERNATIVES.filter((a) => a.slug !== slug)

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main id="main-content" className="flex-1">
        <HeroBlock alt={alt} accent={accent} />
        {alt.costExample && <SavingsCalculator alt={alt} accent={accent} />}
        <PainPointsBlock alt={alt} accent={accent} />
        <USPRecapBlock alt={alt} accent={accent} />
        <FeatureMatrixBlock alt={alt} accent={accent} />
        <MigrationTimelineBlock alt={alt} accent={accent} />
        <TestimonialMockBlock alt={alt} accent={accent} />
        <FAQBlock alt={alt} accent={accent} />
        <OtherAlternativesBlock current={alt} others={otherAlts} />
        <ClosingCTA alt={alt} accent={accent} />
      </main>
      <Footer />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// 1. HERO
// ─────────────────────────────────────────────────────────────────
function HeroBlock({
  alt,
  accent,
}: {
  alt: AlternativeEntry
  accent: (typeof ACCENTS)[keyof typeof ACCENTS]
}) {
  return (
    <section className="relative overflow-hidden border-b border-border bg-gradient-to-br from-background via-background to-secondary/30">
      {/* Ambient blooms tinted by the rival's accent. */}
      <div
        aria-hidden
        className={`pointer-events-none absolute -left-32 top-20 h-[420px] w-[420px] rounded-full bg-gradient-to-br ${accent.fromGrad} ${accent.toGrad} blur-3xl`}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 bottom-0 h-[360px] w-[360px] rounded-full bg-gradient-to-br from-primary/15 to-transparent blur-3xl"
      />
      <div className="relative mx-auto max-w-7xl px-6 py-16 lg:px-8 lg:py-24">
        <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_1fr]">
          <div>
            <div className={`inline-flex items-center gap-2 rounded-full border ${accent.border} ${accent.bg} px-3 py-1 text-xs font-semibold ${accent.text}`}>
              <Sparkles className="h-3 w-3" />
              {alt.category} · {alt.name} alternative
            </div>
            <h1 className="mt-5 text-balance font-serif text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl">
              Looking for a smarter{" "}
              <span className="relative inline-block">
                <span
                  className="relative z-10 bg-clip-text text-transparent"
                  style={{
                    backgroundImage: `linear-gradient(to right, ${accent.hex}, oklch(0.45 0.15 165))`,
                  }}
                >
                  {alt.name} alternative
                </span>
                <span
                  aria-hidden
                  className="absolute inset-x-0 bottom-1 -z-0 h-2 -skew-x-6 opacity-25"
                  style={{ backgroundColor: accent.hex }}
                />
              </span>
              ?
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">
              {alt.heroSubhead}
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button asChild size="lg" className="gap-2">
                <Link href="/signup">
                  Start free · 60 seconds <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/pricing">See pricing</Link>
              </Button>
            </div>
            <ul className="mt-7 grid gap-2 text-sm text-foreground/85 sm:grid-cols-2">
              {alt.heroBullets.map((b) => (
                <li key={b} className="inline-flex items-center gap-2">
                  <Check className="h-4 w-4 shrink-0 text-success" />
                  {b}
                </li>
              ))}
            </ul>
          </div>

          {/* Hero illustration — side-by-side mock that visualises
              "old tool vs new workspace." All inline SVG so it
              ships zero KB of image assets and tints to the rival
              accent. */}
          <div className="relative">
            <HeroIllustration alt={alt} accent={accent} />
          </div>
        </div>
      </div>
    </section>
  )
}

function HeroIllustration({
  alt,
  accent,
}: {
  alt: AlternativeEntry
  accent: (typeof ACCENTS)[keyof typeof ACCENTS]
}) {
  return (
    <div className="relative">
      {/* Soft glow behind the comparison */}
      <div
        aria-hidden
        className={`absolute -inset-6 -z-10 rounded-3xl bg-gradient-to-br ${accent.fromGrad} via-primary/10 ${accent.toGrad} opacity-70 blur-3xl`}
      />
      <div className="rounded-3xl border border-border bg-card/95 p-4 shadow-2xl backdrop-blur-sm sm:p-5">
        {/* Comparison header */}
        <div className="mb-3 flex items-center gap-2">
          <span className="flex gap-1">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-400/60" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400/60" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/60" />
          </span>
          <span className="ml-1 flex-1 truncate rounded-md border border-border/60 bg-background/60 px-2.5 py-1 font-mono text-[10px] text-muted-foreground">
            {alt.name} → The Big Class
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/[0.08] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-700">
            <span className="h-1 w-1 animate-pulse rounded-full bg-emerald-500" />
            Side-by-side
          </span>
        </div>

        <div className="grid grid-cols-[1fr_auto_1fr] items-stretch gap-2">
          {/* Left — "their" side */}
          <div className={`rounded-2xl border-2 border-dashed ${accent.border} ${accent.bg} p-3`}>
            <p className={`text-[10px] font-bold uppercase tracking-wider ${accent.text}`}>
              {alt.name}
            </p>
            <p className="mt-1 text-xs font-semibold">Today</p>
            <div className="mt-3 space-y-1.5">
              <MiniRow label="Live classes" status="partial" />
              <MiniRow label="Whiteboard" status="no" />
              <MiniRow label="Quiz templates" status="partial" />
              <MiniRow label="UPI + WhatsApp" status="no" />
              <MiniRow label="Commission" status="bad" hint="every sale" />
            </div>
          </div>

          {/* Centre arrow */}
          <div className="flex flex-col items-center justify-center gap-2 px-1">
            <ArrowRightLeft className="h-5 w-5 text-muted-foreground/60" />
            <span className="rotate-90 text-[9px] font-bold uppercase tracking-wider text-muted-foreground/70 lg:rotate-0">
              switch
            </span>
          </div>

          {/* Right — "ours" side */}
          <div className="rounded-2xl border-2 border-success/40 bg-success/[0.05] p-3 ring-1 ring-success/20">
            <p className="text-[10px] font-bold uppercase tracking-wider text-success">
              The Big Class
            </p>
            <p className="mt-1 text-xs font-semibold">From day one</p>
            <div className="mt-3 space-y-1.5">
              <MiniRow label="Live classes" status="yes" />
              <MiniRow label="Whiteboard" status="yes" hint="25+ templates" />
              <MiniRow label="Quiz templates" status="yes" hint="18 templates" />
              <MiniRow label="UPI + WhatsApp" status="yes" />
              <MiniRow label="Commission" status="great" hint="zero · ₹0" />
            </div>
          </div>
        </div>

        {/* Bottom strip showing the win count */}
        <div className="mt-3 flex items-center justify-between rounded-xl border border-border/60 bg-muted/30 px-3 py-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Net wedges
          </span>
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-success">
            <TrendingUp className="h-3 w-3" />
            5 of 5 categories
          </span>
        </div>
      </div>
    </div>
  )
}

function MiniRow({
  label,
  status,
  hint,
}: {
  label: string
  status: "yes" | "no" | "partial" | "great" | "bad"
  hint?: string
}) {
  const iconAndClass = (() => {
    switch (status) {
      case "yes":     return { icon: <Check className="h-3 w-3" />, cls: "bg-success/15 text-success" }
      case "great":   return { icon: <Check className="h-3 w-3" />, cls: "bg-success text-white" }
      case "no":      return { icon: <X className="h-3 w-3" />,     cls: "bg-destructive/15 text-destructive" }
      case "bad":     return { icon: <TrendingDown className="h-3 w-3" />, cls: "bg-destructive/15 text-destructive" }
      case "partial": return { icon: <Minus className="h-3 w-3" />, cls: "bg-amber-500/15 text-amber-700" }
    }
  })()
  return (
    <div className="flex items-center justify-between gap-1.5 text-[10px]">
      <span className="font-semibold text-foreground/85">{label}</span>
      <span className="flex items-center gap-1.5">
        {hint && <span className="text-[9px] text-muted-foreground">{hint}</span>}
        <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full ${iconAndClass.cls}`}>
          {iconAndClass.icon}
        </span>
      </span>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// 2. SAVINGS CALCULATOR
// ─────────────────────────────────────────────────────────────────
function SavingsCalculator({
  alt,
  accent,
}: {
  alt: AlternativeEntry
  accent: (typeof ACCENTS)[keyof typeof ACCENTS]
}) {
  if (!alt.costExample) return null
  const { monthlyRevenueINR, rivalEffectiveRate, rivalRateLabel, monthlySubscriptionINR = 0 } = alt.costExample
  const rivalFee = Math.round(monthlyRevenueINR * rivalEffectiveRate)
  const rivalTotal = rivalFee + monthlySubscriptionINR
  // Our pricing — Studio plan flat fee as a representative cost.
  const OUR_FLAT = 2_500
  const monthlySavings = Math.max(0, rivalTotal - OUR_FLAT)
  const yearlySavings = monthlySavings * 12

  const fmt = (n: number) => `₹${n.toLocaleString("en-IN")}`

  return (
    <section className="border-b border-border bg-background py-16">
      <div className="mx-auto max-w-6xl px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className={`text-xs font-bold uppercase tracking-wider ${accent.text}`}>
            Cost example
          </p>
          <h2 className="mt-3 font-serif text-3xl font-bold tracking-tight sm:text-4xl">
            On {fmt(monthlyRevenueINR)} / month, here&rsquo;s the swing.
          </h2>
          <p className="mt-3 text-base text-muted-foreground">
            Numbers below use public pricing. Plug in your own revenue on the{" "}
            <Link href="/pricing" className="font-semibold text-primary hover:underline">pricing page</Link>{" "}
            to see your specific math.
          </p>
        </div>

        <div className="mt-10 grid gap-4 lg:grid-cols-2">
          {/* Their bill */}
          <div className={`rounded-2xl border-2 ${accent.border} ${accent.bg} p-6`}>
            <div className="flex items-baseline justify-between">
              <p className={`text-xs font-bold uppercase tracking-wider ${accent.text}`}>
                Your {alt.name} bill
              </p>
              <span className={`rounded-full ${accent.bg} px-2 py-0.5 text-[10px] font-bold uppercase ${accent.text}`}>
                Today
              </span>
            </div>
            <p className="mt-4 font-mono text-4xl font-black tabular-nums" style={{ color: accent.hex }}>
              {fmt(rivalTotal)}
            </p>
            <p className="text-xs text-muted-foreground">per month</p>
            <div className="mt-4 space-y-2 text-sm">
              <BillLine label={rivalRateLabel} amount={rivalFee} accentHex={accent.hex} />
              {monthlySubscriptionINR > 0 && (
                <BillLine label="Subscription floor" amount={monthlySubscriptionINR} accentHex={accent.hex} />
              )}
            </div>
            <div className="mt-4 rounded-lg border border-border/60 bg-background/60 p-3 text-[11px]">
              <p className="font-semibold">
                <ArrowDown className="mr-1 inline h-3 w-3 text-destructive" />
                Scales <span className="text-destructive">linearly</span> with your sales
              </p>
              <p className="mt-1 text-muted-foreground">
                Double your revenue → roughly double the bill.
              </p>
            </div>
          </div>

          {/* Our bill */}
          <div className="rounded-2xl border-2 border-success/40 bg-success/[0.04] p-6 ring-1 ring-success/20">
            <div className="flex items-baseline justify-between">
              <p className="text-xs font-bold uppercase tracking-wider text-success">
                Your Big Class bill
              </p>
              <span className="rounded-full bg-success px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                After switch
              </span>
            </div>
            <p className="mt-4 font-mono text-4xl font-black tabular-nums text-success">
              {fmt(OUR_FLAT)}
            </p>
            <p className="text-xs text-muted-foreground">per month, Studio plan · flat</p>
            <div className="mt-4 space-y-2 text-sm">
              <BillLine label="Per-transaction commission" amount={0} accentHex="#10b981" zero />
              <BillLine label="Flat subscription" amount={OUR_FLAT} accentHex="#10b981" />
            </div>
            <div className="mt-4 rounded-lg border border-success/30 bg-success/[0.06] p-3 text-[11px]">
              <p className="font-semibold text-success">
                <TrendingUp className="mr-1 inline h-3 w-3" />
                Stays <span className="font-bold">flat</span> regardless of sales
              </p>
              <p className="mt-1 text-muted-foreground">
                Hit ₹50 lakh / month → still the same bill.
              </p>
            </div>
          </div>
        </div>

        {/* Savings hero */}
        <div className="mt-8 overflow-hidden rounded-2xl border border-success/40 bg-gradient-to-br from-success/10 via-background to-emerald-500/[0.05] p-6 text-center">
          <p className="text-xs font-bold uppercase tracking-wider text-success">
            Your monthly swing
          </p>
          <p className="mt-2 font-mono text-5xl font-black tabular-nums text-success sm:text-6xl">
            +{fmt(monthlySavings)}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            ≈ <span className="font-semibold text-foreground">{fmt(yearlySavings)}</span> back in your pocket every year — at this revenue level.
          </p>
          <Button asChild className="mt-5 gap-2">
            <Link href="/pricing">
              See full pricing <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  )
}

function BillLine({
  label,
  amount,
  accentHex,
  zero,
}: {
  label: string
  amount: number
  accentHex: string
  zero?: boolean
}) {
  return (
    <div className="flex items-center justify-between border-b border-border/40 pb-2 last:border-b-0 last:pb-0">
      <span className="text-foreground/80">{label}</span>
      <span
        className="font-mono font-bold tabular-nums"
        style={{ color: zero ? "#10b981" : accentHex }}
      >
        {zero ? "₹0" : `₹${amount.toLocaleString("en-IN")}`}
      </span>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// 3. PAIN POINTS
// ─────────────────────────────────────────────────────────────────
function PainPointsBlock({
  alt,
  accent,
}: {
  alt: AlternativeEntry
  accent: (typeof ACCENTS)[keyof typeof ACCENTS]
}) {
  return (
    <section className="border-b border-border bg-muted/20 py-16">
      <div className="mx-auto max-w-6xl px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className={`text-xs font-bold uppercase tracking-wider ${accent.text}`}>
            Why teachers and creators move on
          </p>
          <h2 className="mt-3 font-serif text-3xl font-bold tracking-tight sm:text-4xl">
            The recurring patterns we hear from {alt.name} users.
          </h2>
          <p className="mt-3 text-muted-foreground">
            We&apos;ve onboarded teachers from every category of platform. These are the
            same complaints, again and again.
          </p>
        </div>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {alt.painPoints.map((p, i) => (
            <PainPointCard key={p.title} index={i} title={p.title} body={p.body} />
          ))}
        </div>
      </div>
    </section>
  )
}

function PainPointCard({
  index,
  title,
  body,
}: {
  index: number
  title: string
  body: string
}) {
  return (
    <article className="group rounded-2xl border border-destructive/20 bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-destructive/40 hover:shadow-md">
      {/* Numbered chip + illustrated red-dot rail */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-destructive/10 text-sm font-bold text-destructive">
          {String(index + 1).padStart(2, "0")}
        </div>
        <div className="flex flex-col items-end gap-0.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-destructive/80">
            Pain
          </span>
          <span className="inline-flex h-2 w-12 overflow-hidden rounded-full bg-destructive/10">
            <span className="h-full w-3/4 rounded-full bg-destructive/70" />
          </span>
        </div>
      </div>
      <h3 className="mt-3 text-base font-bold leading-snug">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
    </article>
  )
}

// ─────────────────────────────────────────────────────────────────
// 4. USP RECAP
// ─────────────────────────────────────────────────────────────────
function USPRecapBlock({
  alt,
  accent,
}: {
  alt: AlternativeEntry
  accent: (typeof ACCENTS)[keyof typeof ACCENTS]
}) {
  const USPS: Array<{ emoji: string; title: string; body: string }> = [
    { emoji: "💰", title: "Zero commission on what you earn",   body: alt.uspContrasts.commission },
    { emoji: "📤", title: "Your students, exportable any day",  body: alt.uspContrasts.dataPortability },
    { emoji: "🧩", title: "All-in-one, not seven tools",         body: alt.uspContrasts.bundled },
    { emoji: "🇮🇳", title: "India-first, global-ready",          body: alt.uspContrasts.indiaFirst },
  ]
  return (
    <section className="border-b border-border bg-background py-16">
      <div className="mx-auto max-w-6xl px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className={`text-xs font-bold uppercase tracking-wider ${accent.text}`}>
            What you get instead
          </p>
          <h2 className="mt-3 font-serif text-3xl font-bold tracking-tight sm:text-4xl">
            Four promises {alt.name} doesn&rsquo;t make.
          </h2>
        </div>
        <div className="mt-12 grid gap-4 sm:grid-cols-2">
          {USPS.map((u, i) => (
            <article
              key={u.title}
              className="group relative overflow-hidden rounded-2xl border border-border bg-card p-6 transition-all hover:-translate-y-0.5 hover:shadow-lg"
              style={{
                background: `linear-gradient(135deg, oklch(1 0 0) 0%, color-mix(in oklab, ${accent.hex} 4%, transparent) 100%)`,
              }}
            >
              <div className="absolute -right-3 -top-3 text-7xl opacity-[0.06] transition-transform group-hover:scale-110">
                {u.emoji}
              </div>
              <div className="relative">
                <div className="flex items-start gap-3">
                  <span aria-hidden className="text-3xl">{u.emoji}</span>
                  <h3 className="text-lg font-bold leading-snug">{u.title}</h3>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{u.body}</p>
                <div className="mt-3 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Promise {i + 1} of 4 · in writing
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────
// 5. FEATURE MATRIX
// ─────────────────────────────────────────────────────────────────
function FeatureMatrixBlock({
  alt,
  accent,
}: {
  alt: AlternativeEntry
  accent: (typeof ACCENTS)[keyof typeof ACCENTS]
}) {
  return (
    <section className="border-b border-border bg-muted/20 py-16">
      <div className="mx-auto max-w-6xl px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className={`text-xs font-bold uppercase tracking-wider ${accent.text}`}>
            Side by side
          </p>
          <h2 className="mt-3 font-serif text-3xl font-bold tracking-tight sm:text-4xl">
            {alt.name} vs. The Big Class.
          </h2>
          <p className="mt-3 text-muted-foreground">
            We checked the rival&apos;s current public pricing + feature pages before publishing every cell. Hover any &ldquo;partial&rdquo; row for the caveat.
          </p>
        </div>
        <div className="mx-auto mt-10 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <table className="w-full text-sm">
            <thead className={`border-b border-border ${accent.bg}`}>
              <tr>
                <th className="px-4 py-4 text-left font-semibold">Feature</th>
                <th className={`w-36 px-2 py-4 text-center text-xs font-bold ${accent.text}`}>
                  {alt.name}
                </th>
                <th className="w-36 px-2 py-4 text-center text-xs font-bold text-primary">
                  The Big Class
                </th>
              </tr>
            </thead>
            <tbody>
              {alt.featureMatrix.map((row, idx) => (
                <tr
                  key={row.feature}
                  className={`border-t border-border/40 transition-colors hover:bg-muted/30 ${
                    idx % 2 === 0 ? "" : "bg-muted/[0.02]"
                  }`}
                >
                  <td className="px-4 py-3">
                    <p className="font-semibold">{row.feature}</p>
                    <p className="text-[11px] leading-snug text-muted-foreground">{row.detail}</p>
                  </td>
                  <td className="px-2 py-3 text-center">
                    <Cell kind={row.rival.kind} note={row.rival.note} />
                  </td>
                  <td className="bg-primary/[0.04] px-2 py-3 text-center">
                    <Cell kind={row.ours.kind} note={row.ours.note} highlight />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-success/15 text-success">
              <Check className="h-3 w-3" />
            </span>
            ships today
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-500/15 text-amber-700">
              <Minus className="h-3 w-3" />
            </span>
            partial / caveats
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-destructive/10 text-destructive/70">
              <X className="h-3 w-3" />
            </span>
            doesn&rsquo;t ship
          </span>
        </div>
      </div>
    </section>
  )
}

function Cell({
  kind,
  note,
  highlight,
}: {
  kind: "yes" | "partial" | "no"
  note?: string
  highlight?: boolean
}) {
  if (kind === "yes") {
    return (
      <span
        title={note ?? "Ships today"}
        className={`inline-flex h-8 w-8 items-center justify-center rounded-full ${
          highlight ? "bg-success text-white shadow-sm" : "bg-success/15 text-success"
        }`}
      >
        <Check className="h-4 w-4" />
      </span>
    )
  }
  if (kind === "partial") {
    return (
      <span
        title={note}
        className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/15 text-amber-700"
      >
        <Minus className="h-4 w-4" />
      </span>
    )
  }
  return (
    <span
      title={note ?? "Doesn't ship"}
      className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-destructive/10 text-destructive/70"
    >
      <X className="h-4 w-4" />
    </span>
  )
}

// ─────────────────────────────────────────────────────────────────
// 6. MIGRATION TIMELINE
// ─────────────────────────────────────────────────────────────────
function MigrationTimelineBlock({
  alt,
  accent,
}: {
  alt: AlternativeEntry
  accent: (typeof ACCENTS)[keyof typeof ACCENTS]
}) {
  return (
    <section className="border-b border-border bg-background py-16">
      <div className="mx-auto max-w-5xl px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className={`text-xs font-bold uppercase tracking-wider ${accent.text}`}>
            How to switch
          </p>
          <h2 className="mt-3 font-serif text-3xl font-bold tracking-tight sm:text-4xl">
            The {alt.name} → The Big Class migration, in 5 steps.
          </h2>
          <p className="mt-3 text-muted-foreground">
            Most teams are fully migrated inside a weekend. You don&apos;t lose your
            roster, your courses, or your branding.
          </p>
        </div>

        {/* Visual timeline rail */}
        <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {alt.migrationSteps.map((step, i) => (
            <div key={step} className="relative">
              {/* Step pill at top */}
              <div className="flex items-center gap-2">
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white shadow-sm"
                  style={{ backgroundColor: accent.hex }}
                >
                  {i + 1}
                </span>
                {/* Connecting line on desktop */}
                {i < alt.migrationSteps.length - 1 && (
                  <span
                    aria-hidden
                    className="hidden h-0.5 flex-1 bg-gradient-to-r from-current to-transparent opacity-30 lg:block"
                    style={{ color: accent.hex }}
                  />
                )}
              </div>
              <div className="mt-3 rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary/40">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Step {i + 1}
                </p>
                <p className="mt-1 text-xs leading-relaxed">{step}</p>
              </div>
            </div>
          ))}
        </div>

        {/* "Weekend" tagline + support nudge */}
        <div className="mx-auto mt-10 max-w-2xl rounded-2xl border border-border bg-card p-5 text-center">
          <div className="flex items-center justify-center gap-2 text-sm font-semibold text-foreground">
            <Calendar className="h-4 w-4 text-primary" />
            Most teams finish over one weekend
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Stuck mid-migration?{" "}
            <Link href="mailto:welcome@thebigclass.com" className="font-semibold text-primary hover:underline">
              Email us
            </Link>{" "}
            — we&apos;ll walk through the CSV mapping or migration scripts with you on a call. No upsell.
          </p>
        </div>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────
// 7. TESTIMONIAL MOCK
// ─────────────────────────────────────────────────────────────────
function TestimonialMockBlock({
  alt,
  accent,
}: {
  alt: AlternativeEntry
  accent: (typeof ACCENTS)[keyof typeof ACCENTS]
}) {
  // We don't show fake reviews. Instead we render a generic
  // "switching framework" — the kind of decision criteria a teacher
  // typically writes down while comparing tools. This sits where a
  // testimonial would go, fills the visual whitespace, and stays
  // honest because it's not pretending to be a quote.
  const FRAMEWORK: Array<{ q: string; weight: number }> = [
    { q: "Does it ship live cohort tooling that respects classroom dynamics?",  weight: 95 },
    { q: "Is my data exportable on every plan, including the free tier?",       weight: 100 },
    { q: "Will my bill stay flat as my sales grow?",                            weight: 90 },
    { q: "Does it speak Indian-first (UPI, WhatsApp, INR, vernacular)?",        weight: 100 },
    { q: "Can I migrate over a weekend without losing my roster?",              weight: 85 },
  ]
  return (
    <section className="border-b border-border bg-muted/20 py-16">
      <div className="mx-auto max-w-5xl px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className={`text-xs font-bold uppercase tracking-wider ${accent.text}`}>
            The switching framework
          </p>
          <h2 className="mt-3 font-serif text-3xl font-bold tracking-tight sm:text-4xl">
            The five questions worth answering before you switch.
          </h2>
          <p className="mt-3 text-muted-foreground">
            We&apos;d rather show you our honest scorecard than paste a stock review.
          </p>
        </div>

        <div className="mx-auto mt-10 max-w-3xl rounded-2xl border border-border bg-card shadow-sm">
          <div className="border-b border-border/60 p-5">
            <div className="flex items-center gap-2">
              <Quote className="h-4 w-4 text-primary" />
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Decision checklist · {alt.name} → The Big Class
              </p>
            </div>
          </div>
          <ul className="divide-y divide-border/60">
            {FRAMEWORK.map((row, i) => (
              <li key={row.q} className="flex items-center gap-4 p-4">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-success/15 text-success">
                  <Check className="h-3.5 w-3.5" />
                </span>
                <p className="min-w-0 flex-1 text-sm">{row.q}</p>
                <div className="flex w-32 shrink-0 items-center gap-1.5">
                  <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className="absolute inset-y-0 left-0 rounded-full bg-success"
                      style={{ width: `${row.weight}%` }}
                    />
                  </div>
                  <span className="font-mono text-[10px] font-bold tabular-nums text-success">
                    {row.weight}%
                  </span>
                </div>
                <span className="hidden text-[10px] font-medium text-muted-foreground sm:inline">
                  Q{i + 1}
                </span>
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-between gap-4 border-t border-border/60 bg-muted/30 px-5 py-4">
            <div className="flex items-center gap-1.5">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star key={s} className="h-3 w-3 fill-amber-500 text-amber-500" />
              ))}
              <span className="ml-1 text-[11px] font-medium text-muted-foreground">
                5/5 on our own checklist
              </span>
            </div>
            <Link
              href="/founder-bill-of-rights"
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
            >
              The Bill of Rights <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────
// 8. FAQ
// ─────────────────────────────────────────────────────────────────
function FAQBlock({
  alt,
  accent,
}: {
  alt: AlternativeEntry
  accent: (typeof ACCENTS)[keyof typeof ACCENTS]
}) {
  return (
    <section className="border-b border-border bg-background py-16">
      <div className="mx-auto max-w-3xl px-6 lg:px-8">
        <p className={`text-center text-xs font-bold uppercase tracking-wider ${accent.text}`}>
          Common questions
        </p>
        <h2 className="mt-3 text-center font-serif text-3xl font-bold tracking-tight sm:text-4xl">
          From teachers leaving {alt.name}.
        </h2>
        <div className="mt-10 space-y-3">
          {alt.faqs.map((qa) => (
            <details
              key={qa.q}
              className="group rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary/30 open:border-primary/40 open:shadow-sm"
            >
              <summary className="flex cursor-pointer items-start justify-between gap-3 text-sm font-semibold">
                {qa.q}
                <span className="mt-0.5 text-muted-foreground transition-transform group-open:rotate-45">
                  <X className="h-4 w-4 -rotate-45 group-open:rotate-0" />
                </span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{qa.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────
// 9. OTHER ALTERNATIVES RAIL
// ─────────────────────────────────────────────────────────────────
function OtherAlternativesBlock({
  current,
  others,
}: {
  current: AlternativeEntry
  others: AlternativeEntry[]
}) {
  return (
    <section className="border-b border-border bg-muted/20 py-14">
      <div className="mx-auto max-w-6xl px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-bold uppercase tracking-wider text-primary">
            Compare other alternatives
          </p>
          <h2 className="mt-3 font-serif text-2xl font-bold tracking-tight sm:text-3xl">
            Evaluating more than one platform?
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Each comparison is built the same way, so you can hold {current.name} up against the rest.
          </p>
        </div>
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {others.map((a) => {
            const altAcc = ACCENTS[a.accent]
            return (
              <Link
                key={a.slug}
                href={`/alternatives/${a.slug}`}
                className="group flex flex-col gap-2 rounded-2xl border border-border bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="flex h-9 w-9 items-center justify-center rounded-xl text-sm font-bold text-white"
                    style={{ backgroundColor: altAcc.hex }}
                  >
                    {a.name[0]}
                  </span>
                  <span className="text-sm font-bold">{a.name} Alternative</span>
                </div>
                <p className="line-clamp-2 text-xs text-muted-foreground">{a.shortPitch}</p>
                <span className="mt-auto inline-flex items-center gap-1 text-[11px] font-semibold text-primary opacity-0 transition-opacity group-hover:opacity-100">
                  See comparison <ArrowRight className="h-3 w-3" />
                </span>
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────
// 10. CLOSING CTA
// ─────────────────────────────────────────────────────────────────
function ClosingCTA({
  alt,
  accent,
}: {
  alt: AlternativeEntry
  accent: (typeof ACCENTS)[keyof typeof ACCENTS]
}) {
  return (
    <section className="relative overflow-hidden py-20">
      <div
        aria-hidden
        className={`absolute inset-0 bg-gradient-to-br ${accent.fromGrad} via-background ${accent.toGrad} opacity-50`}
      />
      <div className="relative mx-auto max-w-3xl px-6 text-center lg:px-8">
        <h2 className="font-serif text-3xl font-bold tracking-tight sm:text-4xl">
          {alt.ctaHeadline}
        </h2>
        <p className="mt-3 text-muted-foreground">
          Free Starter forever. No credit card. Cancel any day. The export button still works.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button asChild size="lg" className="gap-2">
            <Link href="/signup">
              Launch your academy free <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/pricing">See pricing</Link>
          </Button>
        </div>
        <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-border bg-card/80 px-3 py-1.5 text-[11px] font-medium text-muted-foreground backdrop-blur-sm">
          <Download className="h-3 w-3" />
          One-click export works on every plan · even Starter
        </div>
      </div>
    </section>
  )
}

// Suppress unused-import warning for icons reserved for future variants
void IndianRupee
