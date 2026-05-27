// /solutions/memberships — recurring access to a bundle.

import type { Metadata } from "next"
import Link from "next/link"
import {
  ArrowRight,
  Award,
  BookOpen,
  Calendar,
  CheckCircle2,
  Code,
  CreditCard,
  FileText,
  Globe2,
  GraduationCap,
  Heart,
  IndianRupee,
  Layers,
  Link2,
  Mic,
  Package,
  Phone,
  Play,
  Repeat,
  ShoppingBag,
  Sparkles,
  TrendingUp,
  Trophy,
  Users,
  Video,
  Wallet,
} from "lucide-react"
import { Header } from "@/components/landing/header"
import { Footer } from "@/components/landing/footer"
import { SolutionPage } from "@/components/landing/solution-page"

export const metadata: Metadata = {
  title: "Why Creators Choose Our Recurring Membership Suite · The Big Class",
  description:
    "Launch your branded subscription academy. Package courses, digital downloads, cohort batches, and VIP communities into a single high-margin recurring membership.",
  alternates: { canonical: "https://thebigclass.com/solutions/memberships" },
}

export default function MembershipsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1">
        <SolutionPage
          eyebrow="For Membership Creators"
          title={
            <>
              Recurring memberships.{" "}
              <span className="bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-600 bg-clip-text text-transparent">
                To everything you build.
              </span>
            </>
          }
          subtitle="Stop managing your subscriptions across fragmented, high-fee platforms. Bundle your courses, digital presets, live bootcamps, and VIP discussion boards into one elegant monthly or annual recurring membership under your custom domain."
          heroVisual={<MembershipsHeroVisual />}
          outcomes={[
            {
              icon: <Repeat className="h-5 w-5" />,
              title: "Compound Predictable Monthly Revenue",
              body: "Settle stable income streams. Set recurring monthly, quarterly, or annual plans in INR and USD. Our billing system auto-renews billing cycles natively.",
            },
            {
              icon: <Layers className="h-5 w-5" />,
              title: "Bundle Any Creative Product",
              body: "Wrap your entire output in a single subscription. Package video course modules, downloadable templates, live Q&A batches, and discussion feeds into one recurring fee.",
            },
            {
              icon: <Wallet className="h-5 w-5" />,
              title: "Support Trial Days & Easy Cancellations",
              body: "Incentivize enrollment. Offer custom free trial windows to let students preview your academy before the first charge, with simple cancellation controls.",
            },
          ]}
          featureMap={[
            {
              icon: <Globe2 className="h-4 w-4" />,
              title: "White-labeled portal hub",
              body: "Consolidate your links. Host everything under your own branded domain (e.g. academy.yourname.com) instead of messy link directories.",
              href: "/features/portal",
            },
            {
              icon: <Package className="h-4 w-4" />,
              title: "Bundle Composition",
              body: "Easily compose your recurring offer. Select which courses, communities, and digital books are unlocked automatically.",
              href: "/solutions/digital-products",
            },
            {
              icon: <Users className="h-4 w-4" />,
              title: "VIP Communities Feed",
              body: "Create private student feeds featuring posts, comments, doubts rooms, and leaderboards to keep paying members engaged.",
              href: "/solutions/paid-communities",
            },
            {
              icon: <CreditCard className="h-4 w-4" />,
              title: "Direct UPI & Card Checkouts",
              body: "Native one-click mobile UPI settlements, NetBanking, and global credit cards with 0% platform commission.",
              href: "/help/payouts-gateway-fees",
            },
          ]}
          comparison={{
            alternativeName: "Glued App Stacks",
            rows: [
              {
                label: "Client Experience",
                us: "Seamless: customers access courses, community boards, and download files inside one branded account.",
                them: "Forces members to jump across Patreon links, separate Slack invites, and external course portals.",
              },
              {
                label: "Checkout & Payments",
                us: "Native UPI and cards settlements with direct payouts straight to your business bank account.",
                them: "USD-first billing pipelines that reject Indian cards or impose heavy FX conversion transaction fees.",
              },
              {
                label: "Revenue cuts",
                us: "0% platform commission. You pay a flat monthly fee and keep 100% of your earnings.",
                them: "Takes a painful 5% to 12% cut of your recurring membership earnings on every renewal.",
              },
            ],
          }}
          cta={{
            title: "Your value is recurring. Your revenue should be too.",
            body: "Get started in 10 minutes. The free Starter plan is fully equipped to support your custom domain portal, first digital product storefront, and cohort batches.",
          }}
        />

        {/* ── Workflow Guide Section ── */}
        <section className="border-t border-border/60 py-20 bg-muted/10">
          <div className="mx-auto max-w-5xl px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-primary">The Subscription Funnel</span>
              <h2 className="mt-3 text-balance text-3xl font-bold tracking-tight sm:text-4xl">
                The 3-Step Membership Funnel
              </h2>
              <p className="mt-3 text-muted-foreground">
                How professional educators bundle their knowledge into high-margin recurring businesses.
              </p>
            </div>

            <div className="mt-14 grid gap-8 md:grid-cols-3">
              {/* Step 1 */}
              <div className="relative rounded-2xl border border-border/80 bg-card p-6 shadow-sm">
                <div className="absolute -top-4 left-6 flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 font-bold text-white text-sm shadow-md">
                  1
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <Layers className="h-5 w-5 text-emerald-500" />
                  <h3 className="text-base font-bold text-foreground">Compose Your Bundle</h3>
                </div>
                <p className="mt-4 text-xs font-bold uppercase text-muted-foreground tracking-wide">THE BUNDLE STAGE</p>
                <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                  Compose your membership offer in seconds. Check which courses, digital presets, worksheets, and cohort community feeds are bundled inside the subscription ticket.
                </p>
              </div>

              {/* Step 2 */}
              <div className="relative rounded-2xl border border-border/80 bg-card p-6 shadow-sm">
                <div className="absolute -top-4 left-6 flex h-8 w-8 items-center justify-center rounded-full bg-violet-600 font-bold text-white text-sm shadow-md">
                  2
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <Repeat className="h-5 w-5 text-violet-500" />
                  <h3 className="text-base font-bold text-foreground">Configure Billing Parameters</h3>
                </div>
                <p className="mt-4 text-xs font-bold uppercase text-muted-foreground tracking-wide">THE BILLING STAGE</p>
                <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                  Set recurring timelines (monthly, quarterly, or yearly), specify trial windows to let students preview materials risk-free, and list coupons.
                </p>
              </div>

              {/* Step 3 */}
              <div className="relative rounded-2xl border border-border/80 bg-card p-6 shadow-sm">
                <div className="absolute -top-4 left-6 flex h-8 w-8 items-center justify-center rounded-full bg-indigo-500 font-bold text-white text-sm shadow-md">
                  3
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <Users className="h-5 w-5 text-indigo-500" />
                  <h3 className="text-base font-bold text-foreground">Direct Bank Payouts</h3>
                </div>
                <p className="mt-4 text-xs font-bold uppercase text-muted-foreground tracking-wide">THE PAYOUT STAGE</p>
                <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                  Students checkout instantly using mobile UPI or credit cards. The recurring checks are managed automatically, settling straight to your bank account with 0% platform cuts.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Genre Cases ── */}
        <section className="border-t border-border/60 py-20 bg-background">
          <div className="mx-auto max-w-5xl px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Creator Cases</span>
              <h2 className="mt-3 text-balance text-3xl font-bold tracking-tight sm:text-4xl">
                Who scales on our platform?
              </h2>
              <p className="mt-3 text-muted-foreground">
                How diverse creators configure their portals for recurring subscription scale.
              </p>
            </div>

            <div className="mt-12 grid gap-6 sm:grid-cols-2">
              <div className="rounded-xl border border-border/80 p-5 flex items-start gap-4 hover:bg-muted/10 transition-colors">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10 text-red-500 shrink-0">
                  <Code className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-foreground">Developers & Technical Creators</h4>
                  <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
                    Bundle premium coding course libraries, Notion checklist templates, cheat sheets, and active Q&A forum boards into one VIP monthly developer subscription.
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-border/80 p-5 flex items-start gap-4 hover:bg-muted/10 transition-colors">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/10 text-violet-500 shrink-0">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-foreground">Business Consultants & Stock Analysts</h4>
                  <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
                    Launch weekly market recap streams, Excel calculation model sheets, and private masterclass discussion groups in a recurring yearly package.
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-border/80 p-5 flex items-start gap-4 hover:bg-muted/10 transition-colors">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500 shrink-0">
                  <ShoppingBag className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-foreground">Designers & Creative Directors</h4>
                  <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
                    Sell Lightroom preset bundles, LUT files, sound fx directory files, Figma UI packages, and creative consult reviews under a flat membership plan.
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-border/80 p-5 flex items-start gap-4 hover:bg-muted/10 transition-colors">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500 shrink-0">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-foreground">Fitness, Wellness & Yoga Mentors</h4>
                  <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
                    Coordinate cohort fitness groups. Bundle nutritional diet plans, live yoga streams, homework schedules, and track detailed individual student analytical progress.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}

// ─── Gorgeous Custom Memberships Visual ──────────────────────────────────────

function MembershipsHeroVisual() {
  return (
    <div className="relative mx-auto w-full max-w-[500px]">
      {/* Background glow orbs */}
      <div
        className="pointer-events-none absolute -top-10 -right-10 h-64 w-64 rounded-full opacity-20 blur-[80px]"
        style={{
          background: "radial-gradient(circle, #10b981 0%, transparent 70%)",
          animation: "greenPulse 6s ease-in-out infinite",
        }}
      />
      <div
        className="pointer-events-none absolute -bottom-10 -left-10 h-64 w-64 rounded-full opacity-20 blur-[80px]"
        style={{
          background: "radial-gradient(circle, #6366f1 0%, transparent 70%)",
          animation: "indigoPulse 6s ease-in-out infinite 3s",
        }}
      />

      {/* ── Main Mockup: Membership Bundle Page ── */}
      <div
        className="relative z-10 overflow-hidden rounded-2xl border border-border/60 bg-card/90 shadow-2xl backdrop-blur-md"
        style={{
          boxShadow: "0 30px 70px -15px rgba(0,0,0,0.3), inset 0 1px 0 hsl(var(--border)/0.2)",
        }}
      >
        {/* Fake Browser Chrome */}
        <div className="flex items-center gap-2 border-b border-border/50 bg-muted/40 px-4 py-3">
          <div className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-red-500/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/80" />
          </div>
          <div className="mx-auto flex h-5 w-44 items-center justify-center rounded bg-background/50 px-2 text-[9px] font-medium text-muted-foreground">
            academy.executivecoach.com
          </div>
        </div>

        {/* Selected Tier & Price */}
        <div className="p-4 bg-muted/10 border-b border-border/50">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">Active Subscription</span>
              <h4 className="text-sm font-black text-foreground mt-0.5">VIP Mastermind Plan</h4>
            </div>
            <div className="text-right">
              <span className="text-xs font-black text-emerald-600 block">₹999/mo</span>
              <span className="text-[7.5px] text-muted-foreground uppercase font-bold">Auto-renews next month</span>
            </div>
          </div>
        </div>

        {/* Bundle items list */}
        <div className="p-4 space-y-2">
          <span className="text-[9px] font-extrabold uppercase tracking-wider text-muted-foreground">Products Gated inside this Plan</span>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "4 Premium Courses", icon: <Play className="h-3.5 w-3.5 text-emerald-500 fill-emerald-500" /> },
              { label: "VIP Doubts Feed", icon: <Users className="h-3.5 w-3.5 text-emerald-500" /> },
              { label: "Notion Template Packs", icon: <ShoppingBag className="h-3.5 w-3.5 text-emerald-500" /> },
              { label: "Weekly Live Streams", icon: <Video className="h-3.5 w-3.5 text-emerald-500" /> },
            ].map((item) => (
              <div key={item.label} className="rounded-lg border border-border bg-card/60 p-2 flex items-center gap-2">
                {item.icon}
                <span className="text-[8px] font-bold text-foreground leading-tight truncate">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Floating Widget 1: MRR Progress Chart ── */}
      <div
        className="absolute -left-10 -bottom-5 z-20 w-44 rounded-xl border border-border bg-card/95 p-3.5 shadow-2xl backdrop-blur-md"
        style={{
          animation: "floatInUp 0.6s ease-out 0.2s both",
          boxShadow: "0 20px 50px -10px rgba(0,0,0,0.3)",
        }}
      >
        <div className="flex items-center gap-1.5 text-[8px] font-bold text-muted-foreground uppercase tracking-wider">
          <TrendingUp className="h-3 w-3 text-emerald-500" />
          Recurring Growth
        </div>
        <div className="mt-2 text-center">
          <p className="text-xs font-black text-foreground">MRR: ₹2,48,200</p>
          <p className="text-[7px] text-emerald-500 font-bold mt-0.5">+18% month-over-month</p>
        </div>
      </div>

      {/* ── Floating Widget 2: Checkout Notification ── */}
      <div
        className="absolute -right-6 top-1/4 z-20 flex items-center gap-2.5 rounded-full border border-emerald-500/20 bg-card/95 px-3.5 py-2 shadow-xl backdrop-blur-md"
        style={{
          animation: "floatInUp 0.5s ease-out 0.4s both",
        }}
      >
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/15">
          <IndianRupee className="h-3.5 w-3.5 text-emerald-600" />
        </div>
        <div>
          <p className="text-[8px] font-bold leading-none text-muted-foreground">NEW ANNUAL PLAN</p>
          <p className="mt-0.5 text-[9px] font-extrabold text-foreground">₹9,999 from Rohan K.</p>
        </div>
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
      </div>

      {/* ── Floating Badge 3: Active Trial status ── */}
      <div
        className="absolute -right-4 -bottom-3 z-20 flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-card/95 p-2 shadow-lg backdrop-blur-md"
        style={{
          animation: "floatInUp 0.5s ease-out 0.6s both",
        }}
      >
        <Sparkles className="h-4 w-4 text-emerald-500" />
        <div className="text-[8px] leading-tight">
          <span className="font-bold block text-foreground">7-day free trial active</span>
          <span className="text-muted-foreground font-semibold">for Rahul Sharma</span>
        </div>
      </div>

      {/* Keyframe Styling */}
      <style>{`
        @keyframes greenPulse {
          0%, 100% { transform: scale(1); opacity: 0.15; }
          50% { transform: scale(1.1); opacity: 0.25; }
        }
        @keyframes indigoPulse {
          0%, 100% { transform: scale(1); opacity: 0.15; }
          50% { transform: scale(1.1); opacity: 0.25; }
        }
        @keyframes floatInUp {
          from { opacity: 0; transform: translateY(15px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
