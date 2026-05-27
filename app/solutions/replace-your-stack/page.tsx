// /solutions/replace-your-stack — one bill replaces 6 tools.

import type { Metadata } from "next"
import {
  Calendar,
  CreditCard,
  FileText,
  Globe2,
  Layers,
  MessageSquare,
  ShoppingBag,
  Users,
  Video,
} from "lucide-react"
import { Header } from "@/components/landing/header"
import { Footer } from "@/components/landing/footer"
import { SolutionPage } from "@/components/landing/solution-page"

export const metadata: Metadata = {
  title: "Replace your fragmented stack — one platform · The Big Class",
  description:
    "Cancel Discord + Zoom + Teachable + Notion + a custom landing site. One workspace replaces all of it — your audience, your products, your community, your content. One bill. One member record.",
  alternates: { canonical: "https://thebigclass.com/solutions/replace-your-stack" },
}

// Stack-replacement cost table — honest about what each tool typically
// costs at a creator's working tier, not headline pricing.
const REPLACEMENT_ROWS = [
  { tool: "Notion (team)",       cost: "₹680/seat/mo",  replaces: "Docs · pages · public site", here: "Docs + Portal — built in" },
  { tool: "Discord (Nitro server)", cost: "₹400+/mo",   replaces: "Community feed",              here: "Cohort feed with leaderboard + reactions" },
  { tool: "Zoom Pro",            cost: "₹1,200/host/mo", replaces: "Live classes + recording",   here: "LiveKit rooms + cloud recording — every plan" },
  { tool: "Teachable Pro",       cost: "₹4,000+/mo",    replaces: "Courses + checkout",          here: "Course builder + storefront + 0% commission" },
  { tool: "Mailchimp / ConvertKit", cost: "₹1,500+/mo", replaces: "Newsletter + lead capture",  here: "Blog subscribe + contact-form leads" },
  { tool: "A custom Next.js site", cost: "₹6,000+/mo dev",replaces: "Landing pages + blog",      here: "Portal page builder + real blog with SEO" },
]

export default function ReplaceYourStackPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1">
        <SolutionPage
          eyebrow="Replace your stack"
          title={
            <>
              One workspace.{" "}
              <span className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-600 bg-clip-text text-transparent">
                Six fewer subscriptions.
              </span>
            </>
          }
          subtitle="Most creators end up paying for Notion + Discord + Zoom + Teachable + ConvertKit + a custom site — and the data never reconciles. One workspace replaces all of it. Same capabilities. One bill. One member record."
          heroVisual={<ReplaceStackHeroVisual />}
          outcomes={[
            {
              icon: <Layers className="h-5 w-5 text-indigo-500" />,
              title: "One member record across every product",
              body: "Who attended which class · who completed which course · who's in which membership — all in one row, one analytics view.",
            },
            {
              icon: <CreditCard className="h-5 w-5 text-emerald-500" />,
              title: "One bill that scales with you",
              body: "Flat subscription instead of 6 line items + 4 transaction percentages. Predictable cost at every audience size.",
            },
            {
              icon: <Users className="h-5 w-5 text-violet-500" />,
              title: "Your audience never bounces",
              body: "Today: visitor lands on your site, leaves for your checkout, leaves again for your community. Now: all on your URL.",
            },
          ]}
          featureMap={[
            { icon: <Globe2 className="h-4 w-4" />, title: "Portal + blog", body: "Replaces a custom Next.js site + Ghost / WordPress.", href: "/features/portal" },
            { icon: <ShoppingBag className="h-4 w-4" />, title: "Storefront + checkout", body: "Replaces Teachable + Gumroad + Stripe Checkout.", href: "/features/storefront" },
            { icon: <Video className="h-4 w-4" />, title: "Live + recordings", body: "Replaces Zoom Pro + the post-class drive folder.", href: "/features/live-classes" },
            { icon: <Users className="h-4 w-4" />, title: "Community + cohort feeds", body: "Replaces Discord + Circle + Mighty Networks.", href: "/features/community" },
          ]}
          comparison={{
            alternativeName: "SaaS Spaghetti Stack",
            rows: [
              {
                label: "Audience Database",
                us: "Single unified profile. Roster syncs course progress, live attendance, and templates in one place.",
                them: "Disconnected sheets. Zoom rosters, Teachable buyers, and Discord emails must be stitched with Zapier.",
              },
              {
                label: "Transaction Cut",
                us: "0% platform commission on checkout. You keep every single rupee you make.",
                them: "Gumroad takes a 10% fee. Teachable takes up to 5% + processing overhead on lower tiers.",
              },
              {
                label: "Portal Branding",
                us: "Fully white-labeled custom CNAME domain. Zero 'powered-by' co-branding badges.",
                them: "Franchise look. Bouncing customers between teachable.com subdomains and third-party widgets.",
              },
            ],
          }}
        />

        {/* The replacement table — unique to this lander */}
        <section className="relative border-t border-border/60 bg-muted/10 py-24 overflow-hidden">
          {/* Subtle background glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />

          <div className="mx-auto max-w-5xl px-6 lg:px-8">
            <div className="text-center">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.2em] text-primary">
                The honest math
              </span>
              <h2 className="mt-4 text-balance text-3xl font-black tracking-tight sm:text-4xl">
                Six tools. Six bills. One workspace.
              </h2>
              <p className="mt-4 text-muted-foreground max-w-xl mx-auto leading-relaxed">
                Indicative monthly costs at a creator&rsquo;s typical working tier. Your actual numbers vary; the saving pattern doesn&rsquo;t.
              </p>
            </div>

            <div className="mt-14 overflow-hidden rounded-2xl border border-border/80 bg-card/60 shadow-xl backdrop-blur-sm">
              {/* Header */}
              <div className="grid grid-cols-[1.3fr_0.8fr_1.3fr_1.5fr] divide-x divide-border border-b border-border/80 bg-muted/50">
                <div className="px-5 py-4 text-[10.5px] font-extrabold uppercase tracking-wider text-muted-foreground">
                  Tool you might pay for
                </div>
                <div className="px-5 py-4 text-[10.5px] font-extrabold uppercase tracking-wider text-muted-foreground">
                  Approx cost
                </div>
                <div className="px-5 py-4 text-[10.5px] font-extrabold uppercase tracking-wider text-muted-foreground">
                  What it gives you
                </div>
                <div className="px-5 py-4 text-[10.5px] font-extrabold uppercase tracking-wider text-primary">
                  Replaced here by
                </div>
              </div>

              {/* Rows */}
              {REPLACEMENT_ROWS.map((r) => (
                <div
                  key={r.tool}
                  className="grid grid-cols-[1.3fr_0.8fr_1.3fr_1.5fr] divide-x divide-border/50 border-b border-border/50 bg-card/40 transition-colors duration-200 hover:bg-muted/10"
                >
                  <div className="px-5 py-4 text-sm font-bold text-foreground">{r.tool}</div>
                  <div className="px-5 py-4 font-mono text-[12px] text-muted-foreground/90 font-medium">
                    {r.cost}
                  </div>
                  <div className="px-5 py-4 text-[13px] leading-relaxed text-muted-foreground/80 font-medium">
                    {r.replaces}
                  </div>
                  <div className="px-5 py-4 text-[13.5px] font-extrabold leading-relaxed text-indigo-500 bg-primary/[0.01]">
                    {r.here}
                  </div>
                </div>
              ))}

              {/* Total Summary Row */}
              <div className="grid grid-cols-[1.3fr_0.8fr_1.3fr_1.5fr] divide-x divide-border border-t-2 border-primary/30 bg-gradient-to-r from-primary/[0.02] via-primary/[0.04] to-emerald-500/[0.04]">
                <div className="px-5 py-5 text-sm font-black text-foreground">Total stack</div>
                <div className="px-5 py-5 font-mono text-sm font-black text-rose-500">
                  ₹13,780+/mo
                </div>
                <div className="px-5 py-5 text-[13px] font-semibold leading-relaxed text-muted-foreground/90">
                  Six bills · four transaction fees · zero sync
                </div>
                <div className="px-5 py-5 text-[13.5px] font-black text-emerald-500 flex items-center gap-1.5 bg-emerald-500/[0.03]">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  Pro plan: ₹1,499/mo · one bill · 0% commission
                </div>
              </div>
            </div>

            <p className="mt-5 text-center text-xs text-muted-foreground font-semibold">
              Costs above are approximate creator-tier prices in INR at time of writing. Your exact numbers depend on tier and audience size — the structural saving doesn&rsquo;t.
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}

// ─── Gorgeous Custom Replace Stack Connection Visual ─────────────────────────

function ReplaceStackHeroVisual() {
  return (
    <div className="relative mx-auto w-full max-w-[500px] h-[360px] flex items-center justify-center">
      {/* Background glow orbs */}
      <div
        className="pointer-events-none absolute h-72 w-72 rounded-full opacity-20 blur-[80px]"
        style={{
          background: "radial-gradient(circle, #6366f1 0%, transparent 70%)",
          animation: "indigoPulse 8s ease-in-out infinite",
        }}
      />

      {/* Connection paths (styled SVG lines radiating from center) */}
      <svg className="absolute inset-0 h-full w-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ef4444" stopOpacity="0.4" />
            <stop offset="50%" stopColor="#6366f1" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0.4" />
          </linearGradient>
        </defs>
        <path d="M 80 80 L 250 180" stroke="url(#lineGrad)" strokeWidth="1.5" strokeDasharray="4 4" className="animate-[dash_10s_linear_infinite]" />
        <path d="M 420 80 L 250 180" stroke="url(#lineGrad)" strokeWidth="1.5" strokeDasharray="4 4" className="animate-[dash_10s_linear_infinite]" />
        <path d="M 70 280 L 250 180" stroke="url(#lineGrad)" strokeWidth="1.5" strokeDasharray="4 4" className="animate-[dash_10s_linear_infinite]" />
        <path d="M 410 270 L 250 180" stroke="url(#lineGrad)" strokeWidth="1.5" strokeDasharray="4 4" className="animate-[dash_10s_linear_infinite]" />
      </svg>

      {/* ── Center: The Big Class OS Hub ── */}
      <div
        className="relative z-20 flex flex-col items-center justify-center rounded-2xl border border-indigo-500/30 bg-card/95 p-5 shadow-2xl backdrop-blur-md w-48 text-center"
        style={{
          boxShadow: "0 25px 60px -10px rgba(99, 102, 241, 0.25), inset 0 1px 1px rgba(255,255,255,0.1)",
          animation: "centerPulse 4s ease-in-out infinite",
        }}
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-500/15 border border-indigo-500/30 mb-2">
          <Layers className="h-6 w-6 text-indigo-500 animate-[spin_10s_linear_infinite]" />
        </div>
        <p className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-500">The Big Class OS</p>
        <p className="text-[11.5px] font-black text-foreground mt-0.5">1 Unified Dashboard</p>
        <span className="mt-2 text-[8px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
          PRO PLAN ACTIVE
        </span>
      </div>

      {/* ── Surrounding Card 1: Zoom Pro (Top Left) ── */}
      <div
        className="absolute left-4 top-4 z-10 w-36 rounded-xl border border-red-500/20 bg-card/90 p-2.5 shadow-lg backdrop-blur-sm flex items-center gap-2"
        style={{ animation: "floatCard1 6s ease-in-out infinite" }}
      >
        <div className="flex h-7 w-7 items-center justify-center rounded bg-red-500/10 text-red-500 shrink-0">
          <Video className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[9px] font-black text-foreground truncate">Zoom Pro</p>
          <span className="text-[7px] font-extrabold text-red-500 bg-red-500/10 px-1 rounded">CANCELLED</span>
        </div>
      </div>

      {/* ── Surrounding Card 2: Teachable (Top Right) ── */}
      <div
        className="absolute right-4 top-4 z-10 w-36 rounded-xl border border-red-500/20 bg-card/90 p-2.5 shadow-lg backdrop-blur-sm flex items-center gap-2"
        style={{ animation: "floatCard2 6s ease-in-out infinite 1.5s" }}
      >
        <div className="flex h-7 w-7 items-center justify-center rounded bg-red-500/10 text-red-500 shrink-0">
          <ShoppingBag className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[9px] font-black text-foreground truncate">Teachable</p>
          <span className="text-[7.5px] font-extrabold text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded">SAVED ₹4,000</span>
        </div>
      </div>

      {/* ── Surrounding Card 3: Discord (Bottom Left) ── */}
      <div
        className="absolute left-6 bottom-4 z-10 w-36 rounded-xl border border-red-500/20 bg-card/90 p-2.5 shadow-lg backdrop-blur-sm flex items-center gap-2"
        style={{ animation: "floatCard3 6s ease-in-out infinite 3s" }}
      >
        <div className="flex h-7 w-7 items-center justify-center rounded bg-red-500/10 text-red-500 shrink-0">
          <MessageSquare className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[9px] font-black text-foreground truncate">Discord Nitro</p>
          <span className="text-[7px] font-extrabold text-red-500 bg-red-500/10 px-1 rounded">CANCELLED</span>
        </div>
      </div>

      {/* ── Surrounding Card 4: Mailchimp (Bottom Right) ── */}
      <div
        className="absolute right-6 bottom-6 z-10 w-36 rounded-xl border border-red-500/20 bg-card/90 p-2.5 shadow-lg backdrop-blur-sm flex items-center gap-2"
        style={{ animation: "floatCard4 6s ease-in-out infinite 4.5s" }}
      >
        <div className="flex h-7 w-7 items-center justify-center rounded bg-red-500/10 text-red-500 shrink-0">
          <FileText className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[9px] font-black text-foreground truncate">ConvertKit</p>
          <span className="text-[7px] font-extrabold text-red-500 bg-red-500/10 px-1 rounded">SAVED ₹1,500</span>
        </div>
      </div>

      <style>{`
        @keyframes indigoPulse {
          0%, 100% { transform: scale(1); opacity: 0.15; }
          50% { transform: scale(1.15); opacity: 0.25; }
        }
        @keyframes centerPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.03); }
        }
        @keyframes floatCard1 {
          0%, 100% { transform: translateY(0px) rotate(-1deg); }
          50% { transform: translateY(-6px) rotate(1deg); }
        }
        @keyframes floatCard2 {
          0%, 100% { transform: translateY(0px) rotate(1deg); }
          50% { transform: translateY(-6px) rotate(-1deg); }
        }
        @keyframes floatCard3 {
          0%, 100% { transform: translateY(0px) rotate(-2deg); }
          50% { transform: translateY(-5px) rotate(0deg); }
        }
        @keyframes floatCard4 {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-5px) rotate(2deg); }
        }
      `}</style>
    </div>
  )
}
