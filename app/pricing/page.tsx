"use client"

import { Fragment, useState } from "react"
import Link from "next/link"
import {
  ArrowRight,
  CheckCircle2,
  HelpCircle,
  Minus,
  Sparkles,
  Zap,
  X as XIcon,
} from "lucide-react"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Header } from "@/components/landing/header"
import { Footer } from "@/components/landing/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { ContactSupportDialog } from "@/components/support/contact-support-dialog"

// Pricing is the single most-edited page on the site — the source of
// truth lives in the PLANS / MATRIX / ADDONS / FAQS arrays below.
// Anything you change here flows into the cards, the comparison
// matrix, and the FAQ in one go. Don't fork the data into JSX.
//
// USD approximation: visitors landing from outside India see ₹ amounts
// with no reference point. We display an "≈ $X USD" tag beside every
// INR price using a conservative static rate (kept slightly more
// pessimistic than market so the actual charge feels like a discount).
// The exact charged amount remains in INR at the gateway; the USD
// figure is a courtesy estimate only.
const INR_TO_USD = 85 // rounded conservative rate
function approxUsd(inr: number): string {
  if (!Number.isFinite(inr) || inr <= 0) return ""
  const usd = inr / INR_TO_USD
  // For very small amounts (< $10) keep one decimal so the estimate
  // doesn't snap to $0 on add-ons.
  if (usd < 10) return `$${usd.toFixed(1)}`
  return `$${Math.round(usd)}`
}
//
// Tier shape:
//   starter  → free, acquisition. Strict caps. Watermarked.
//   pro      → ₹1,499/mo. The "real product". Custom domain, community.
//   studio   → ₹3,499/mo. Solo creator going pro / small institute.
//   institute → from ₹9,999/mo, sales-led. Coaching chains, schools.

interface Plan {
  id: "starter" | "pro" | "studio" | "institute"
  name: string
  tagline: string
  monthly: number  // 0 = free, -1 = custom "Talk to us"
  yearly: number
  highlight?: boolean
  cta: string
  ctaHref: string
  bullets: string[]
  /**
   * Optional reassurance line under the price. Every plan carries the
   * same zero-commission promise — see /founder-bill-of-rights
   * article 1 — so use this for the "0% from us · Razorpay's standard
   * fee passes through" line, not for variable rates.
   */
  feeNote?: string
}

const PLANS: Plan[] = [
  {
    id: "starter",
    name: "Starter",
    tagline: "Open your storefront. Sell your first course this week.",
    monthly: 0,
    yearly: 0,
    cta: "Start free — no card",
    ctaHref: "/signup",
    feeNote: "0% from us. Razorpay's ~2% gateway fee — not marked up.",
    bullets: [
      "Storefront + UPI/card/netbanking checkout",
      "Up to 5 products (courses, downloads, memberships)",
      "Up to 50 students · 1 community batch · 1 class/week",
      "Solo workspace — 1 teacher seat (add co-teachers on Pro+)",
      "3 courses with the no-code builder",
      "Public site editor — pages, header, footer, sections you can edit",
      "thebigclass subdomain (English only — multilingual portal is Pro+)",
      "Quizzes, assignments, auto certificates",
      "Live + recordings included — 60 min/class",
      "Refer & Earn (referral program is free on every plan)",
      "— PAID FROM PRO+ —",
      "AI course drafting · AI text refinement on every editor",
      "Multilingual portal (10 languages) + per-tenant translation editor",
      "Lead inbox + contact-form section + manual lead creation",
      "Community/student announcements + scheduling",
      "Custom domain + white-label",
      "Custom certificate designer",
      "Marketing toolkit (coupons, drip emails, abandoned-cart)",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    tagline: "Your full creator business under your own domain.",
    monthly: 1499,
    yearly: 14990,
    highlight: true,
    cta: "Subscribe — 30-day money-back",
    ctaHref: "/signup?plan=pro",
    feeNote: "0% from us. Razorpay's ~2% gateway fee — not marked up. Not happy in the first 30 days? Full refund, no questions asked.",
    bullets: [
      "Up to 50 storefront products · 1,000 students · 5 batches",
      "2 teacher / TA seats (you + one co-teacher) — Starter is solo",
      "25 courses with the no-code builder",
      "Bring your own domain + full white-label",
      "Public site editor — header, footer, page sections, hero copy",
      "Multilingual portal — 10 languages (English + 9 Indian) with per-tenant translation overrides",
      "AI course drafting — type a title, ship a course",
      "AI text refinement on hero copy, descriptions, lessons",
      "Lead inbox + contact-form section block + manual lead creation",
      "Community/student announcements (broadcast, per-course, scheduled)",
      "Marketing toolkit — coupons, drip emails, referrals dashboard, abandoned-cart",
      "Custom certificate designer",
      "Standard analytics · Live + recordings unlimited, up to 4 hr each",
      "Priority email support · 30-day refund window",
      "— STILL PAID FROM STUDIO+ —",
      "Live captions + auto-transcription · WhatsApp Business · Cohort/funnel analytics · Unlimited everything",
    ],
  },
  {
    id: "studio",
    name: "Studio",
    tagline: "Full creator business with a team alongside you.",
    monthly: 3499,
    yearly: 33990,
    cta: "Subscribe — 30-day money-back",
    ctaHref: "/signup?plan=studio",
    feeNote: "0% from us. Razorpay's ~2% gateway fee — not marked up. Not happy in the first 30 days? Full refund, no questions asked.",
    bullets: [
      "Everything in Pro",
      "Unlimited products, courses, batches, students",
      "5 teacher / TA seats (Pro is 2 — co-teach with your team)",
      "1 TB recording storage · 1-year retention",
      "Advanced analytics (cohorts, funnels, exports)",
      "Live captions + auto-transcription",
      "WhatsApp Business notifications",
      "Same 10-language multilingual portal + translation editor as Pro",
      "Priority chat support · 30-day refund window",
      "— STILL PAID FROM INSTITUTE —",
      "REST API + webhooks · SSO + RBAC · multi-campus · forever retention · dedicated SLA",
    ],
  },
  {
    id: "institute",
    name: "Institute",
    tagline: "Coaching chains, schools, corporate training.",
    monthly: -1,
    yearly: -1,
    cta: "Talk to us",
    // Non-link sentinel — the PlanCard renders a ContactSupportDialog
    // instead of a Link when ctaHref starts with "dialog:". Keeps the
    // existing Plan type happy without a separate "kind" discriminator.
    ctaHref: "dialog:sales",
    feeNote: "0% from us. Razorpay's ~2% gateway fee — not marked up.",
    bullets: [
      "Everything in Studio",
      "Unlimited Instructor seats + multi-campus",
      "SSO (Google / Microsoft) + RBAC",
      "Recordings retained forever (or BYO-S3/R2)",
      "REST API + webhooks (Institute-only)",
      "Dedicated success manager",
      "99.9% uptime SLA, 1-hour response",
      "Custom contract + DPA",
    ],
  },
]

type Period = "monthly" | "quarterly" | "halfYearly" | "yearly"

// Per-period discount applied to (monthly × months). Same numbers
// the backend's PERIOD_DISCOUNT carries; duplicated here only because
// the pricing card data inlines monthly + yearly totals as flat
// numbers rather than reading from web/lib/plans.ts. Migrate the
// PLANS array to read from the catalog next time you touch it.
const PERIOD_DISCOUNT: Record<Period, number> = {
  monthly: 0,
  quarterly: 0.04,
  halfYearly: 0.08,
  yearly: 0.1667,
}
const PERIOD_MONTHS: Record<Period, number> = {
  monthly: 1,
  quarterly: 3,
  halfYearly: 6,
  yearly: 12,
}
const PERIOD_LABEL: Record<Period, string> = {
  monthly: "Monthly",
  quarterly: "Quarterly",
  halfYearly: "Half-yearly",
  yearly: "Yearly",
}

export default function PricingPage() {
  const [billing, setBilling] = useState<Period>("yearly")

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main id="main-content" className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-secondary via-background to-background" />
          <div className="relative mx-auto max-w-5xl px-6 py-20 text-center lg:px-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-semibold text-accent-foreground">
              <Sparkles className="h-3 w-3" />
              0% commission · free forever tier · cancel any time
            </div>
            <h1 className="mt-4 text-4xl font-bold tracking-tight text-balance sm:text-5xl">
              One workspace for your creator business.
            </h1>
            <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
              Storefront, courses, community, certificates — under your own
              domain, on a flat monthly fee.{" "}
              <span className="font-semibold text-foreground">
                0% commission from us, on every plan, forever
              </span>{" "}
              — payouts land in your bank, Razorpay&apos;s ~2% gateway fee
              goes to them at cost. Live classes are included.
            </p>

            {/* Billing toggle */}
            <div className="mt-8 inline-flex flex-wrap items-center justify-center gap-1 rounded-full border border-border bg-card p-1">
              {(Object.keys(PERIOD_LABEL) as Period[]).map((p) => {
                const discount = PERIOD_DISCOUNT[p]
                return (
                  <BillingTab key={p} active={billing === p} onClick={() => setBilling(p)}>
                    {PERIOD_LABEL[p]}
                    {discount > 0 && (
                      <span className="ml-1 rounded-full bg-success/20 px-1.5 py-0.5 text-[10px] font-bold text-success">
                        −{Math.round(discount * 100)}%
                      </span>
                    )}
                  </BillingTab>
                )
              })}
            </div>
          </div>
        </section>

        {/* Plan grid — 4 columns at xl, 2 at md, 1 at base */}
        <section className="pb-16">
          <div className="mx-auto grid max-w-7xl gap-4 px-6 md:grid-cols-2 xl:grid-cols-4 lg:px-8">
            {PLANS.map((plan) => (
              <PlanCard key={plan.id} plan={plan} billing={billing} />
            ))}
          </div>
        </section>

        {/* What unlocks at each tier — pinned summary so a visitor
            never has to hunt through the bullets to find the one
            feature they came for. Mirrors what /dashboard/portal
            actually gates so this can't drift. */}
        <UpgradeMatrix />

        {/* Add-ons strip */}
        <AddonsStrip />

        {/* Compare matrix */}
        <CompareMatrix />

        {/* FAQ */}
        <Faq />

        {/* Closing CTA */}
        <section className="py-20">
          <div className="mx-auto max-w-3xl px-6 text-center lg:px-8">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Try it free, no card required.
            </h2>
            <p className="mt-3 text-muted-foreground">
              Your subdomain is ready before your coffee. Upgrade if and
              when your batch outgrows the free tier.
            </p>
            <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button asChild size="lg" className="gap-2">
                <Link href="/signup">
                  Launch your academy free
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/use-cases">See how others use it</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}

function BillingTab({
  active, onClick, children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
        active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  )
}

function PlanCard({ plan, billing }: { plan: Plan; billing: Period }) {
  const isFree = plan.monthly === 0
  const isCustom = plan.monthly === -1
  const months = PERIOD_MONTHS[billing]
  const discount = PERIOD_DISCOUNT[billing]
  // Derive the period total from the catalog's monthly headline so
  // discounts and totals stay consistent. Yearly keeps a special-case
  // override on the catalog itself; for the pricing page array we use
  // the flat monthly × months × (1 − discount) formula uniformly.
  const periodTotal = !isFree && !isCustom
    ? (billing === "yearly" && plan.yearly > 0
        ? plan.yearly
        : Math.round(plan.monthly * months * (1 - discount)))
    : 0
  const monthlyDisplay = months === 1 ? plan.monthly : Math.round(periodTotal / months)

  return (
    <Card
      className={cn(
        "relative flex flex-col",
        plan.highlight && "border-primary shadow-lg ring-1 ring-primary/30",
      )}
    >
      {plan.highlight && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-primary-foreground shadow">
          Most teachers pick this
        </div>
      )}
      <CardContent className="flex flex-1 flex-col p-6">
        <div>
          <h3 className="text-lg font-semibold">{plan.name}</h3>
          <p className="mt-1 min-h-[2.5rem] text-sm text-muted-foreground">{plan.tagline}</p>
        </div>

        <div className="mt-5">
          {isFree && <p className="text-4xl font-bold">Free</p>}
          {isCustom && (
            <>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold">From ₹9,999</span>
                <span className="text-sm text-muted-foreground">/ month</span>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                ≈ {approxUsd(9999)} USD · billed in INR
              </p>
            </>
          )}
          {!isFree && !isCustom && (
            <>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold tabular-nums">
                  ₹{monthlyDisplay.toLocaleString("en-IN")}
                </span>
                <span className="text-sm text-muted-foreground">/ month</span>
              </div>
              {/* Approx USD reference for international visitors. Charged
                  amount is the INR figure above; this is a courtesy
                  estimate, not a conversion guarantee. */}
              <p className="mt-1 text-[11px] text-muted-foreground">
                ≈ {approxUsd(monthlyDisplay)} USD / month
              </p>
            </>
          )}

          {!isFree && !isCustom && billing !== "monthly" && (
            <p className="mt-1 text-xs text-muted-foreground">
              ₹{periodTotal.toLocaleString("en-IN")} billed {PERIOD_LABEL[billing].toLowerCase()}
            </p>
          )}
          {!isFree && !isCustom && billing === "monthly" && (
            <p className="mt-1 text-xs text-muted-foreground">
              Switch to yearly to save 17%.
            </p>
          )}
          {isFree && (
            <p className="mt-1 text-xs text-muted-foreground">
              Forever. No card. No trial countdown.
            </p>
          )}
          {isCustom && (
            <p className="mt-1 text-xs text-muted-foreground">
              Custom contract. Sales-led onboarding.
            </p>
          )}
        </div>

        {plan.ctaHref === "dialog:sales" ? (
          <ContactSupportDialog
            intent="sales"
            defaultSubject={`Institute plan enquiry${plan.name ? ` — ${plan.name}` : ""}`}
            trigger={
              <Button className="mt-5" variant={plan.highlight ? "default" : "outline"}>
                {plan.cta}
              </Button>
            }
          />
        ) : (
          <Button asChild className="mt-5" variant={plan.highlight ? "default" : "outline"}>
            <Link href={plan.ctaHref}>{plan.cta}</Link>
          </Button>
        )}

        {plan.feeNote && (
          <p className="mt-3 text-[11px] text-muted-foreground">
            <Sparkles className="mr-1 inline h-3 w-3 text-primary" />
            {plan.feeNote}
          </p>
        )}

        <ul className="mt-5 space-y-2 text-sm">
          {plan.bullets.map((b) => (
            <li key={b} className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
              <span>{b}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}

// ============================================================
// Add-ons strip — applies to any paid plan
// ============================================================

interface Addon {
  name: string
  price: string
  desc: string
}

const ADDONS: Addon[] = [
  { name: "+500 students",     price: "₹499/mo",   desc: "Stack as many as you need." },
  { name: "+1 teacher seat",   price: "₹699/mo",   desc: "For co-instructors or TAs." },
  { name: "+100 GB recordings", price: "₹299/mo",   desc: "Extra retention on top of plan cap." },
  { name: "Auto-transcription", price: "₹2 / min",  desc: "Searchable transcripts + captions." },
  { name: "SMS notifications",  price: "₹0.20/SMS", desc: "Passthrough — we don't mark up." },
]

// ────────────────────────────────────────────────────────────────────
// UpgradeMatrix — single explicit table mapping each gated feature
// to the plan that unlocks it. Visitors come in asking "is X paid?"
// and bounce when they have to read a wall of bullets to find out.
// This is the answer index. Synced with web/lib/plans.ts limits and
// FEATURE_COPY — when you add a new gated feature, add a row here.
// ────────────────────────────────────────────────────────────────────

const UPGRADE_TRIGGERS: Array<{ feature: string; what: string; tier: "Pro+" | "Studio+" | "Institute" }> = [
  { feature: "Multilingual portal", what: "10-language picker + per-tenant translation editor on the public site", tier: "Pro+" },
  { feature: "AI course drafting", what: "Type a course title; AI fills description, subtitle, and curriculum", tier: "Pro+" },
  { feature: "AI text refinement", what: "Refine hero copy, lesson text, and announcements with one click", tier: "Pro+" },
  { feature: "Lead inbox + manual lead creation", what: "View every contact-form submission, add leads manually, triage, export", tier: "Pro+" },
  { feature: "Contact-form section block", what: "Drop a lead-capture form on any portal page", tier: "Pro+" },
  { feature: "Community/student announcements", what: "Broadcast to all students or per-course, with priority + scheduling", tier: "Pro+" },
  { feature: "Public-site promo bar + popups", what: "Marketing announcement bar on the portal + campaign popups", tier: "Pro+" },
  { feature: "Custom domain + auto-SSL", what: "learn.yourdomain.com instead of the thebigclass subdomain", tier: "Pro+" },
  { feature: "White-label", what: "Strip 'Powered by The Big Class' from your portal", tier: "Pro+" },
  { feature: "Portal templates", what: "One-click full-page themes — colours, fonts, header layout, hero. Starter sticks with the default theme + Quick palettes.", tier: "Pro+" },
  { feature: "Custom certificate designer", what: "Design your own templates (Starter uses the built-in ones)", tier: "Pro+" },
  { feature: "Marketing toolkit", what: "Coupons, drip emails, referrals dashboard, abandoned-cart", tier: "Pro+" },
  { feature: "Drip / scheduled lesson unlock", what: "Release lessons over time instead of all-at-once on enrolment", tier: "Pro+" },
  { feature: "Live captions + transcripts", what: "In-call captions + Whisper transcripts on every recording", tier: "Studio+" },
  { feature: "WhatsApp Business notifications", what: "Class reminders + nudges over WhatsApp", tier: "Studio+" },
  { feature: "Cohort / funnel / export analytics", what: "Beyond basic counters — retention, drop-off, CSV exports", tier: "Studio+" },
  { feature: "REST API + Webhooks", what: "Programmatic access for your CRM / data warehouse / Zapier", tier: "Institute" },
  { feature: "SSO + RBAC", what: "Google / Microsoft SSO with role-based access control", tier: "Institute" },
]

function UpgradeMatrix() {
  return (
    <section id="what-unlocks" className="border-y border-border bg-card/40 py-12">
      <div className="mx-auto max-w-5xl px-6 lg:px-8">
        <h2 className="text-2xl font-bold tracking-tight">What unlocks when you upgrade</h2>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          One pass through the features that flip from locked to unlocked at each tier. If a feature isn&apos;t in this list, it&apos;s on every plan (including the free Starter).
        </p>
        <div className="mt-6 overflow-x-auto rounded-lg border border-border bg-background">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Feature</th>
                <th className="px-3 py-2 text-left font-medium">What you get</th>
                <th className="px-3 py-2 text-right font-medium">Required tier</th>
              </tr>
            </thead>
            <tbody>
              {UPGRADE_TRIGGERS.map((row) => (
                <tr key={row.feature} className="border-b border-border last:border-b-0 align-top">
                  <td className="px-3 py-2 font-medium">{row.feature}</td>
                  <td className="px-3 py-2 text-muted-foreground">{row.what}</td>
                  <td className="px-3 py-2 text-right">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                        row.tier === "Pro+" && "border-primary/40 bg-primary/10 text-primary",
                        row.tier === "Studio+" && "border-accent/40 bg-accent/10 text-accent",
                        row.tier === "Institute" && "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400",
                      )}
                    >
                      {row.tier}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-[11px] text-muted-foreground">
          Locked features show a preview behind an upgrade card inside the dashboard — try Starter to see exactly what each one looks like.
        </p>
      </div>
    </section>
  )
}

function AddonsStrip() {
  return (
    <section className="border-y border-border bg-card py-16">
      <div className="mx-auto max-w-6xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-bold tracking-tight">Add-ons, when you outgrow a limit.</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Don&apos;t jump a whole tier for one extra co-teacher.
            Available on any paid plan.
          </p>
        </div>
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {ADDONS.map((a) => (
            <div
              key={a.name}
              className="flex flex-col rounded-lg border border-border bg-background p-4"
            >
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-sm font-semibold">{a.name}</p>
                <p className="text-sm font-bold tabular-nums text-primary">{a.price}</p>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{a.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ============================================================
// Comparison matrix — features vs. tier
// ============================================================

interface MatrixRow {
  feature: string
  starter: string | boolean
  pro: string | boolean
  studio: string | boolean
  institute: string | boolean
}

// Matrix ordering matters here — it's the implicit positioning. The
// top group is the hero feature. We lead with SELLING (storefront,
// products, marketing) because that's the wedge against Graphy and
// Tagmango; Live is intentionally one of the LAST groups because it's
// an included delivery channel, not the product. Don't reorder without
// the same thinking — every group above another is being marketed as
// more important.
const MATRIX: { group: string; rows: MatrixRow[] }[] = [
  {
    group: "Storefront & selling",
    rows: [
      { feature: "Storefront + UPI/card/netbanking checkout", starter: true, pro: true, studio: true, institute: true },
      { feature: "Storefront products (courses, downloads, memberships, bundles)", starter: "5", pro: "50", studio: "Unlimited", institute: "Unlimited" },
      { feature: "Commission on your revenue", starter: "0%", pro: "0%", studio: "0%", institute: "0%" },
      { feature: "Coupons, drip emails, abandoned-cart, referrals", starter: false, pro: true, studio: true, institute: true },
      { feature: "GST invoices + customer receipts", starter: true, pro: true, studio: true, institute: true },
      { feature: "One-click data export (orders, students, courses)", starter: true, pro: true, studio: true, institute: true },
    ],
  },
  {
    group: "Courses & content",
    rows: [
      { feature: "Published courses with no-code builder", starter: "3", pro: "25", studio: "Unlimited", institute: "Unlimited" },
      { feature: "Quizzes, assignments, auto-graded marks", starter: true, pro: true, studio: true, institute: true },
      { feature: "Custom certificate designer + auto-issue", starter: false, pro: true, studio: true, institute: true },
      { feature: "Drip / scheduled lesson unlock", starter: false, pro: true, studio: true, institute: true },
      { feature: "AI course builder (titles, descriptions, modules, lesson drafts)", starter: true, pro: true, studio: true, institute: true },
    ],
  },
  {
    group: "Community & engagement",
    rows: [
      { feature: "Community batches with chat, posts, files", starter: "1", pro: "5", studio: "Unlimited", institute: "Unlimited" },
      { feature: "Unified inbox (doubts, leads, comments)", starter: true, pro: true, studio: true, institute: true },
      { feature: "Email notifications", starter: true, pro: true, studio: true, institute: true },
      { feature: "WhatsApp Business notifications", starter: false, pro: false, studio: true, institute: true },
      { feature: "SMS notifications", starter: false, pro: "Add-on", studio: "Add-on", institute: true },
    ],
  },
  {
    group: "Capacity",
    rows: [
      { feature: "Active students", starter: "50", pro: "1,000", studio: "Unlimited", institute: "Unlimited" },
      { feature: "Instructor / TA seats", starter: "1", pro: "2", studio: "5", institute: "Unlimited" },
    ],
  },
  {
    group: "Branding",
    rows: [
      { feature: "thebigclass subdomain", starter: true, pro: true, studio: true, institute: true },
      { feature: "Custom domain (CNAME)", starter: false, pro: true, studio: true, institute: true },
      { feature: "Full white-label (your logo, colors, favicon)", starter: false, pro: true, studio: true, institute: true },
    ],
  },
  {
    group: "Analytics",
    rows: [
      { feature: "Revenue + signups", starter: true, pro: true, studio: true, institute: true },
      { feature: "Engagement + course completion", starter: false, pro: true, studio: true, institute: true },
      { feature: "Cohort comparisons + funnels + exports", starter: false, pro: false, studio: true, institute: true },
    ],
  },
  {
    group: "Live classes (included)",
    rows: [
      { feature: "Live classes per week", starter: "1", pro: "Unlimited", studio: "Unlimited", institute: "Unlimited" },
      { feature: "Class length cap", starter: "60 min", pro: "4 hours", studio: "4 hours", institute: "Unlimited" },
      { feature: "Multiplayer whiteboard", starter: true, pro: true, studio: true, institute: true },
      { feature: "Auto-recording to CDN", starter: true, pro: true, studio: true, institute: true },
      { feature: "Live captions + transcripts", starter: false, pro: false, studio: true, institute: true },
    ],
  },
  {
    group: "Storage",
    rows: [
      { feature: "Recording storage", starter: "2 GB", pro: "100 GB", studio: "1 TB", institute: "Unlimited" },
      { feature: "Retention", starter: "30 days", pro: "90 days", studio: "1 year", institute: "Forever / BYO" },
      { feature: "Recording watermark", starter: "Yes", pro: "No", studio: "No", institute: "No" },
    ],
  },
  {
    group: "Enterprise",
    rows: [
      { feature: "SSO (Google / Microsoft)", starter: false, pro: false, studio: false, institute: true },
      { feature: "REST API + webhooks", starter: false, pro: false, studio: false, institute: true },
      { feature: "BYO storage region", starter: false, pro: false, studio: false, institute: true },
      { feature: "DPA + custom contract", starter: false, pro: false, studio: false, institute: true },
      { feature: "Uptime SLA", starter: false, pro: false, studio: false, institute: "99.9%" },
      { feature: "Dedicated CSM", starter: false, pro: false, studio: false, institute: true },
    ],
  },
  {
    group: "Support",
    rows: [
      { feature: "Help center", starter: true, pro: true, studio: true, institute: true },
      { feature: "Email support", starter: "Community", pro: "Priority", studio: "Priority", institute: "Priority" },
      { feature: "Chat support", starter: false, pro: false, studio: "Priority", institute: "Priority" },
      { feature: "Response SLA", starter: false, pro: false, studio: false, institute: "1 hr" },
      { feature: "Onboarding + training", starter: false, pro: false, studio: false, institute: true },
    ],
  },
]

// Compare matrix has two rendering modes:
//   • Desktop (>=lg) — original 4-column side-by-side table for easy
//     visual scanning across plans.
//   • Mobile (<lg) — one accordion per plan, each containing the same
//     features grouped + the plan's value. Avoids the prior
//     `min-w-[860px]` horizontal-scroll trap that made the table
//     basically unusable on a phone.
function CompareMatrix() {
  return (
    <section className="py-20">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight">Compare every feature.</h2>
          <p className="mt-3 text-muted-foreground">
            No asterisks, no &quot;contact us&quot; in the middle of the table.
          </p>
        </div>

        {/* Desktop table */}
        <div className="mx-auto mt-10 hidden overflow-x-auto rounded-xl border border-border bg-card lg:block">
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="bg-muted/40 text-left">
                <th className="px-4 py-3 font-semibold">Feature</th>
                <th className="px-4 py-3 font-semibold">Starter</th>
                <th className="px-4 py-3 font-semibold text-primary">Pro</th>
                <th className="px-4 py-3 font-semibold">Studio</th>
                <th className="px-4 py-3 font-semibold">Institute</th>
              </tr>
            </thead>
            <tbody>
              {MATRIX.map((g) => (
                <Fragment key={g.group}>
                  <tr className="border-t border-border bg-muted/20">
                    <td colSpan={5} className="px-4 py-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                      {g.group}
                    </td>
                  </tr>
                  {g.rows.map((row) => (
                    <tr key={row.feature} className="border-t border-border">
                      <td className="px-4 py-3 font-medium">{row.feature}</td>
                      <Cell value={row.starter} />
                      <Cell value={row.pro} highlight />
                      <Cell value={row.studio} />
                      <Cell value={row.institute} />
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile: per-plan accordion. Pro is open by default since it's
            the most-picked tier; the others stay collapsed so the page
            doesn't balloon into one long scroll. */}
        <div className="mx-auto mt-8 max-w-2xl lg:hidden">
          <Accordion type="single" collapsible defaultValue="pro">
            {(["starter", "pro", "studio", "institute"] as const).map((planKey) => {
              const plan = PLANS.find((p) => p.id === planKey)
              if (!plan) return null
              return (
                <AccordionItem key={planKey} value={planKey} className="rounded-xl border border-border bg-card mb-2 px-1">
                  <AccordionTrigger className="px-3">
                    <span className="flex items-baseline gap-2">
                      <span className={cn("text-base font-semibold", planKey === "pro" && "text-primary")}>
                        {plan.name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {plan.monthly === 0
                          ? "Free"
                          : plan.monthly === -1
                          ? "From ₹9,999/mo"
                          : `₹${plan.monthly.toLocaleString("en-IN")}/mo`}
                      </span>
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="px-3 pb-3">
                    {MATRIX.map((g) => (
                      <div key={g.group} className="mt-3 first:mt-0">
                        <p className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground">
                          {g.group}
                        </p>
                        <ul className="mt-1.5 divide-y divide-border/50">
                          {g.rows.map((row) => {
                            const val = row[planKey] as string | boolean
                            return (
                              <li key={row.feature} className="flex items-center justify-between gap-3 py-2">
                                <span className="text-[13px]">{row.feature}</span>
                                <span className="shrink-0 text-[12px]">
                                  {typeof val === "boolean" ? (
                                    val ? (
                                      <CheckCircle2 className="h-4 w-4 text-success" aria-label="Included" />
                                    ) : (
                                      <XIcon className="h-4 w-4 text-muted-foreground/50" aria-label="Not included" />
                                    )
                                  ) : (
                                    <span className="font-medium text-foreground">{val}</span>
                                  )}
                                </span>
                              </li>
                            )
                          })}
                        </ul>
                      </div>
                    ))}
                  </AccordionContent>
                </AccordionItem>
              )
            })}
          </Accordion>
        </div>
      </div>
    </section>
  )
}

function Cell({ value, highlight }: { value: string | boolean; highlight?: boolean }) {
  return (
    <td className={cn("px-4 py-3 text-sm", highlight && "bg-primary/[0.03]")}>
      {typeof value === "boolean" ? (
        value
          ? <CheckCircle2 className="h-4 w-4 text-success" />
          : <Minus className="h-4 w-4 text-muted-foreground/60" />
      ) : (
        <span>{value}</span>
      )}
    </td>
  )
}

// ============================================================
// FAQ
// ============================================================

const FAQS: Array<{ q: string; a: string }> = [
  {
    q: "Do you take a cut of my sales?",
    a: "Zero from us — on every plan, forever. Razorpay (our payment gateway) charges their standard processing fee (~2% on UPI/cards, ~3% on international cards) directly at checkout. That fee goes to them, not us — we don't mark it up, and you can verify every paisa against your own Razorpay dashboard. This is Article 1 of our Founder Bill of Rights — it doesn't change.",
  },
  {
    q: "How do payouts work? Where does my money go?",
    a: "When a student pays ₹500 for your course: Razorpay receives the payment, deducts ~₹10 (their 2% gateway fee), and settles ₹490 directly into the bank account you connected during setup. The money never sits in our accounts — we use Razorpay Route to pay creators directly. Default settlement timing is T+2 working days (Razorpay's standard); instant-settlement options exist on Razorpay's side if you want them faster.",
  },
  {
    q: "When will I get my money? What's the settlement timing?",
    a: "Razorpay's standard schedule: T+2 working days from the order being captured. So an order on Tuesday morning typically settles to your bank by Thursday. New accounts may be on T+3 for the first few weeks while Razorpay finishes risk-onboarding. You can see every settlement in /dashboard/payouts — and on your own Razorpay dashboard, which we link to.",
  },
  {
    q: "Do I need my own Razorpay account?",
    a: "No — we set up a 'linked account' for you during onboarding via Razorpay Route. You provide PAN, bank details, and basic business info; we wire it to Razorpay so payouts go directly to you. Power users can switch to BYO-Razorpay (connect your own merchant account) from /dashboard/payouts if you've negotiated better rates separately — same 0% from us in either case.",
  },
  {
    q: "What can I sell through the storefront?",
    a: "Courses, downloadable PDFs / files, memberships, cohort batches, bundles, and one-on-one sessions. Each is a 'product' — Starter lets you publish 5, Pro lets you publish 50, Studio and Institute are unlimited. UPI / cards / netbanking checkout works out of the box; GST invoices are generated automatically.",
  },
  {
    q: "Do you charge per student?",
    a: "No per-student fees. Each plan has a student cap (50 / 1,000 / Unlimited / Unlimited) and you pick the tier that fits. If you hit your cap and don't want to jump tiers, the +500 students add-on is ₹499/mo.",
  },
  {
    q: "What are the marketing tools?",
    a: "Coupons (% off, flat off, BOGO), drip-email campaigns, abandoned-cart recovery, and a built-in Refer & Earn program. Included on Pro and above — no extra app required, no per-email fee from us.",
  },
  {
    q: "Can I bring my own domain?",
    a: "Yes — on Pro and above. Point a CNAME from learn.yourdomain.com to us and the whole experience (storefront, courses, dashboard, certificates) runs under your domain. Free tier uses thebigclass.com/p/<your-handle>.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. Cancel from the dashboard in two clicks. We don't have a retention squad or exit interview. Your data is exportable for 30 days after cancellation — one click takes your students, content, orders, and revenue history out the door.",
  },
  {
    q: "Is there a free trial of Pro / Studio?",
    a: "There's no separate trial — you get something better. The Starter plan is free forever, no card, no countdown. Use it as long as you like; upgrade to Pro or Studio when you outgrow the caps (more students, white-label, AI, etc.). Paid plans charge immediately at signup and come with a 30-day full money-back window — not happy in the first month, you get every rupee back. We'd rather you try the paid surface for real than tiptoe through a trial.",
  },
  {
    q: "Does the public site translate? Which languages?",
    a: "The 10-language portal (English plus 9 Indian languages — Hindi, Bengali, Tamil, Telugu, Marathi, Gujarati, Kannada, Malayalam, Punjabi) is included on every paid plan. Visitors get a language picker in the header; admins manage it from Portal → Languages, including disabling specific languages, switching the default, or turning multilingual off entirely. Starter portals render in English only.",
  },
  {
    q: "What can I edit on my public site?",
    a: "The whole thing. Header (logo, nav links, primary/secondary CTAs), footer (columns, links, copyright), and every page section (hero, features, course grid, testimonials, CTA, custom HTML) — all edited from Portal → Home / Pages / Brand. Sections can be reordered, hidden, or duplicated. Custom CSS and section variants are coming on Pro+; the structural editor is on every plan.",
  },
  {
    q: "When does AI course drafting work?",
    a: "Type a course title; we generate a description, subtitle, and a full outline (modules + lessons) for you to edit. Available on Pro and above. Starter sees the button as locked with an upgrade prompt — we don't burn LLM calls on the free tier.",
  },
  {
    q: "Are live classes included?",
    a: "Yes — every plan includes live classes with the multiplayer whiteboard and auto-recording. Starter caps at 1 class per week (60 min); Pro and above are unlimited up to 4 hours per session. Live is one of several delivery channels we ship, not a paid add-on.",
  },
  {
    q: "What happens when I hit a plan limit?",
    a: "We warn you at 80% usage by email, and again at 100%. You'll never get a surprise overage charge — when you hit a hard limit (e.g. recording storage), uploads pause until you add the relevant add-on or upgrade. The platform never deletes existing data automatically.",
  },
  {
    q: "What about WhatsApp messaging cost?",
    a: "WhatsApp Business API messaging is metered by Meta. On Studio and Institute, you connect your own sender — we don't mark up message fees. SMS works the same way (passthrough at ₹0.20/SMS).",
  },
  {
    q: "Do you offer education / non-profit pricing?",
    a: "Yes. Email hello@thebigclass.com from your institution address — we discount Institute by 40% for accredited schools and registered non-profits.",
  },
  {
    q: "Where is my data hosted?",
    a: "By default in India (Mumbai region). Institute customers can request EU or US region hosting, or bring their own S3 / R2 bucket for recording storage at no extra cost.",
  },
]

function Faq() {
  return (
    <section className="border-t border-border py-20">
      <div className="mx-auto max-w-3xl px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight">Common questions.</h2>
          <p className="mt-3 text-muted-foreground">
            If yours isn&apos;t here, email{" "}
            <a href="mailto:hello@thebigclass.com" className="text-primary hover:underline">
              hello@thebigclass.com
            </a>{" "}
            — we reply same business day.
          </p>
        </div>

        <div className="mt-10 space-y-3">
          {FAQS.map((f) => (
            <details
              key={f.q}
              className="group rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/30"
            >
              <summary className="flex cursor-pointer list-none items-start gap-3 font-semibold">
                <HelpCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span className="flex-1">{f.q}</span>
                <Zap className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-90" />
              </summary>
              <p className="mt-3 pl-7 text-sm leading-relaxed text-muted-foreground">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}
