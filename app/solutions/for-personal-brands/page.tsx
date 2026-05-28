// /solutions/for-personal-brands — multi-product creator brand at one URL.

import type { Metadata } from "next"
import Link from "next/link"
import {
  ArrowRight,
  Award,
  BookOpen,
  Calendar,
  CheckCircle2,
  Code,
  FileText,
  Globe2,
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
} from "lucide-react"
import { Header } from "@/components/landing/header"
import { Footer } from "@/components/landing/footer"
import { SolutionPage } from "@/components/landing/solution-page"

export const metadata: Metadata = {
  title: "Why Personal Brands Choose Our Multi-Product Suite · The Big Class",
  description:
    "Launch your unified brand portal. Sell course curriculums, digital storefront products, 1:1 consults, and recurring communities under your own white-labeled custom URL.",
  alternates: { canonical: "https://thebigclass.com/solutions/for-personal-brands" },
}

export default function ForPersonalBrandsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1">
        <SolutionPage
          eyebrow="For Personal Brands"
          title={
            <>
              One Unified brand.{" "}
              <span className="bg-gradient-to-r from-rose-500 via-pink-500 to-indigo-600 bg-clip-text text-transparent">
                One custom URL.
              </span>
            </>
          }
          subtitle="Your personal brand isn't a single product — it's a diverse portfolio. Stop fragmenting your business across six different subscription bills. Launch a white-labeled portal under your custom CNAME domain. Sell structured courses, digital assets, 1:1 consults, and premium community feeds in one elegant dashboard."
          heroVisual={<PersonalBrandsHeroVisual />}
          outcomes={[
            {
              icon: <Sparkles className="h-5 w-5" />,
              title: "Unified Multi-Product Storefronts",
              body: "Deliver all your offers under one digital roof. Sell cohort batches, self-paced video modules, e-books, Notion templates, and 1:1 booking consults in a single high-conversion mobile storefront.",
            },
            {
              icon: <Heart className="h-5 w-5" />,
              title: "Establish Your Inner Circle Community",
              body: "Build a premium community feed away from algorithm changes. Host active student boards, cohort schedules, doubt-resolving rooms, and leaderboards to keep followers engaged.",
            },
            {
              icon: <Award className="h-5 w-5" />,
              title: "Compound Organic Search Traffic",
              body: "Optimize your SEO. Host built-in blogs and public knowledge documents at /k to capture organic search traffic from Google on top of your social media following.",
            },
          ]}
          featureMap={[
            {
              icon: <Globe2 className="h-4 w-4" />,
              title: "White-labeled portal hub",
              body: "Consolidate your links. Host everything under your own branded domain (e.g. jessica.tv) instead of messy link directories.",
              href: "/features/portal",
            },
            {
              icon: <BookOpen className="h-4 w-4" />,
              title: "Integrated Blog & Docs",
              body: "Draft high-value articles, cheat sheets, and references at /k to establish your authoritative personal voice online.",
              href: "/features/blog",
            },
            {
              icon: <Users className="h-4 w-4" />,
              title: "Cohort Communities",
              body: "Support active student threads, doubts resolving queues, andPoints leaderboards directly under your domain.",
              href: "/solutions/paid-communities",
            },
            {
              icon: <Repeat className="h-4 w-4" />,
              title: "Memberships & Bundles",
              body: "Package your offerings. Sell bundled recurring memberships containing courses, presets, and live coaching slots.",
              href: "/solutions/memberships",
            },
          ]}
          comparison={{
            alternativeName: "Glued App Stacks",
            rows: [
              {
                label: "Client Experience",
                us: "Seamless: customers log into one professional domain to access courses, books, bookings, and VIP feeds.",
                them: "Messy: customers receive four separate links across Notion, Patreon, Calendly, and Gumroad.",
              },
              {
                label: "Unified Fan Record",
                us: "One client profile: tracks their entire course progress, consult tickets, forum messages, and checkout logs.",
                them: "Scattered data across 4 platforms that never talk to each other, making admin tasks exhausting.",
              },
              {
                label: "Commission cuts",
                us: "0% platform commission. Pay a flat monthly membership and keep 100% of your earnings.",
                them: "Takes a painful 5% to 15% cut on every course checkout, membership tier, or preset sale.",
              },
            ],
          }}
          cta={{
            title: "Your name is a business. Build a proper home for it.",
            body: "Get started in 10 minutes. The free Starter plan is fully equipped to support your custom domain portal, first digital product storefront, and cohort batches.",
          }}
        />

        {/* ── Workflow Guide Section ── */}
        <section className="border-t border-border/60 py-20 bg-muted/10">
          <div className="mx-auto max-w-5xl px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-primary">The Brand Roadmap</span>
              <h2 className="mt-3 text-balance text-3xl font-bold tracking-tight sm:text-4xl">
                The 3-Step Personal Brand Scaling Funnel
              </h2>
              <p className="mt-3 text-muted-foreground">
                How professional creators consolidate their channels into successful multi-source enterprises.
              </p>
            </div>

            <div className="mt-14 grid gap-8 md:grid-cols-3">
              {/* Step 1 */}
              <div className="relative rounded-2xl border border-border/80 bg-card p-6 shadow-sm">
                <div className="absolute -top-4 left-6 flex h-8 w-8 items-center justify-center rounded-full bg-rose-500 font-bold text-white text-sm shadow-md">
                  1
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <Globe2 className="h-5 w-5 text-rose-500" />
                  <h3 className="text-base font-bold text-foreground">Consolidate Your CNAME</h3>
                </div>
                <p className="mt-4 text-xs font-bold uppercase text-muted-foreground tracking-wide">THE BRAND STAGE</p>
                <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                  Establish your central hub (e.g. jessica.tv) on day one. Drop in your professional headshot, outline your consulting fields, integrate custom brand colors, and replace scattered link directories.
                </p>
              </div>

              {/* Step 2 */}
              <div className="relative rounded-2xl border border-border/80 bg-card p-6 shadow-sm">
                <div className="absolute -top-4 left-6 flex h-8 w-8 items-center justify-center rounded-full bg-violet-600 font-bold text-white text-sm shadow-md">
                  2
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <ShoppingBag className="h-5 w-5 text-violet-500" />
                  <h3 className="text-base font-bold text-foreground">Launch Multi-Product Stores</h3>
                </div>
                <p className="mt-4 text-xs font-bold uppercase text-muted-foreground tracking-wide">THE OFFER STAGE</p>
                <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                  List diverse products. Offer downloadable asset packs, Lightroom presets, workout PDFs, bookable 1:1 strategy consultation sessions, and self-paced video modules under one storefront.
                </p>
              </div>

              {/* Step 3 */}
              <div className="relative rounded-2xl border border-border/80 bg-card p-6 shadow-sm">
                <div className="absolute -top-4 left-6 flex h-8 w-8 items-center justify-center rounded-full bg-indigo-500 font-bold text-white text-sm shadow-md">
                  3
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <Users className="h-5 w-5 text-indigo-500" />
                  <h3 className="text-base font-bold text-foreground">Upsell VIP Memberships</h3>
                </div>
                <p className="mt-4 text-xs font-bold uppercase text-muted-foreground tracking-wide">THE MEMBERSHIP STAGE</p>
                <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                  Upsell followers to interactive group cohorts or private recurring community feeds. Bundle coaching content with leaderboards, doubst panels, and custom verified completion certificates.
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
                Who builds on our platform?
              </h2>
              <p className="mt-3 text-muted-foreground">
                How diverse personal brands configure their portals to scale.
              </p>
            </div>

            <div className="mt-12 grid gap-6 sm:grid-cols-2">
              <div className="rounded-xl border border-border/80 p-5 flex items-start gap-4 hover:bg-muted/10 transition-colors">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10 text-red-500 shrink-0">
                  <Code className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-foreground">Tech & Developer Brands</h4>
                  <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
                    Sell gated masterclass course repositories, Notion templates, publish documentation guides at /k, and run cohort bootcamps with built-in student doubt-solving channels.
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-border/80 p-5 flex items-start gap-4 hover:bg-muted/10 transition-colors">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/10 text-violet-500 shrink-0">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-foreground">Professional Consultants & Advisors</h4>
                  <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
                    Sell 1:1 strategy time slots, list Excel template calculators, launch recurring newsletter membership tiers, and stream live weekly market summary sessions.
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-border/80 p-5 flex items-start gap-4 hover:bg-muted/10 transition-colors">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500 shrink-0">
                  <ShoppingBag className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-foreground">Visual Artists & Designers</h4>
                  <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
                    Provide 1:1 design reviews. Sell digital preset packs: LUT color-grading files, Lightroom templates, Figma assets, and audio sounds directly under their domain.
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-border/80 p-5 flex items-start gap-4 hover:bg-muted/10 transition-colors">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500 shrink-0">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-foreground">Lifestyle & Wellness Teachers</h4>
                  <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
                    Sell workout schedules, diet guides, cooking recipe sheets, and coordinate group batches with active student progress tracking and verified certificates.
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

// ─── Gorgeous Custom Personal Brands Visual ──────────────────────────────────

function PersonalBrandsHeroVisual() {
  return (
    <div className="relative mx-auto w-full max-w-[500px]">
      {/* Background glow orbs */}
      <div
        className="pointer-events-none absolute -top-10 -right-10 h-64 w-64 rounded-full opacity-20 blur-[80px]"
        style={{
          background: "radial-gradient(circle, #f43f5e 0%, transparent 70%)",
          animation: "redPulse 6s ease-in-out infinite",
        }}
      />
      <div
        className="pointer-events-none absolute -bottom-10 -left-10 h-64 w-64 rounded-full opacity-20 blur-[80px]"
        style={{
          background: "radial-gradient(circle, #6366f1 0%, transparent 70%)",
          animation: "indigoPulse 6s ease-in-out infinite 3s",
        }}
      />

      {/* ── Main Mockup: Mobile Storefront Hub ── */}
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
            jessica.tv
          </div>
        </div>

        {/* Profile header */}
        <div className="p-4 border-b border-border/50 bg-muted/20 flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-rose-500 to-indigo-500 p-[1.5px]">
            <div className="h-full w-full rounded-full border border-background overflow-hidden bg-slate-800 flex items-center justify-center text-sm">
              👩‍🎨
            </div>
          </div>
          <div>
            <h4 className="text-xs font-black text-foreground leading-none">Jessica Rawat</h4>
            <p className="text-[9px] text-muted-foreground mt-1">Creative Director & Educator</p>
          </div>
        </div>

        {/* Products list */}
        <div className="p-4 space-y-2.5">
          <div className="flex items-center justify-between text-[8px] font-bold text-muted-foreground uppercase tracking-wider">
            <span>Jessica&apos;s Storefront</span>
            <span className="text-rose-500">4 active products</span>
          </div>

          {/* Product 1: Course */}
          <div className="rounded-lg border border-border bg-card/60 p-2 flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded bg-rose-500/10 text-rose-500 shrink-0">
              <Play className="h-3 w-3 fill-rose-500" />
            </span>
            <div className="flex-1 min-w-0">
              <h5 className="text-[9px] font-bold text-foreground truncate">Video Masterclass Academy</h5>
              <p className="text-[7.5px] text-muted-foreground">12 lessons · Verifiable Certificate</p>
            </div>
            <span className="text-[9px] font-black text-rose-600">₹4,999</span>
          </div>

          {/* Product 2: Asset bundle */}
          <div className="rounded-lg border border-border bg-card/60 p-2 flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded bg-violet-600/10 text-violet-600 shrink-0">
              <ShoppingBag className="h-3 w-3" />
            </span>
            <div className="flex-1 min-w-0">
              <h5 className="text-[9px] font-bold text-foreground truncate"> Light presets & Notion Bundle</h5>
              <p className="text-[7.5px] text-muted-foreground">ZIP download · PDF cheatsheet</p>
            </div>
            <span className="text-[9px] font-black text-violet-600">₹999</span>
          </div>
        </div>
      </div>

      {/* ── Floating Widget 1: Revenue Stack Comparison ── */}
      <div
        className="absolute -left-10 -bottom-5 z-20 w-44 rounded-xl border border-border bg-card/95 p-3.5 shadow-2xl backdrop-blur-md"
        style={{
          animation: "floatInUp 0.6s ease-out 0.2s both",
          boxShadow: "0 20px 50px -10px rgba(0,0,0,0.3)",
        }}
      >
        <div className="flex items-center gap-1.5 text-[8px] font-bold text-muted-foreground uppercase tracking-wider">
          <TrendingUp className="h-3 w-3 text-emerald-500" />
          Revenue lift
        </div>
        <div className="mt-2.5 space-y-2">
          <div>
            <div className="flex justify-between text-[8px] font-semibold text-rose-500 mb-0.5">
              <span>Glued app stack</span>
              <span>₹4,800/mo</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-muted">
              <div className="h-full rounded-full bg-rose-500" style={{ width: "25%" }} />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-[8px] font-bold text-emerald-600 mb-0.5">
              <span>Personal Domain</span>
              <span>₹1,94,800</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-muted">
              <div className="h-full rounded-full bg-emerald-500" style={{ width: "95%" }} />
            </div>
          </div>
        </div>
      </div>

      {/* ── Floating Widget 2: Checkout Alert ── */}
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
          <p className="text-[8px] font-bold leading-none text-muted-foreground">NEW SALE</p>
          <p className="mt-0.5 text-[9px] font-extrabold text-foreground">₹999/mo from Tanya S.</p>
        </div>
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
      </div>

      {/* Keyframe Styling */}
      <style>{`
        @keyframes redPulse {
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
