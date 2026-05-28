// /solutions/for-youtubers — convert subscribers into paying members.

import type { Metadata } from "next"
import Link from "next/link"
import {
  ArrowRight,
  CheckCircle2,
  Code,
  FileText,
  Globe2,
  IndianRupee,
  Layout,
  Play,
  Repeat,
  ShoppingBag,
  Sparkles,
  TrendingUp,
  Tv,
  Users,
  Video,
  Youtube,
} from "lucide-react"
import { Header } from "@/components/landing/header"
import { Footer } from "@/components/landing/footer"
import { SolutionPage } from "@/components/landing/solution-page"

export const metadata: Metadata = {
  title: "Why YouTubers Use Our Creator Suite · The Big Class",
  description:
    "Launch your branded course academy, sell digital storefront products, host live cohorts, and build a premium video library under your own custom domain.",
  alternates: { canonical: "https://thebigclass.com/solutions/for-youtubers" },
}

export default function ForYouTubersPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1">
        <SolutionPage
          eyebrow="For YouTubers"
          title={
            <>
              Launch your own{" "}
              <span className="bg-gradient-to-r from-red-500 via-rose-500 to-violet-600 bg-clip-text text-transparent">
                Branded Video Academy.
              </span>
            </>
          }
          subtitle="Give your YouTube subscribers a premium learning destination. Teacher structured video courses, sell digital storefront assets, run live cohorts, and host active student communities — all under your own white-labeled custom domain."
          heroVisual={<YouTuberHeroVisual />}
          outcomes={[
            {
              icon: <Tv className="h-5 w-5" />,
              title: "Host Premium Video Courses & Academies",
              body: "Create fully structured video modules and lessons. Host your premium files securely with high-speed direct 4K video uploads. Students get their own login portal to trace lessons, watch recorded chapters, and resume playback.",
            },
            {
              icon: <ShoppingBag className="h-5 w-5" />,
              title: "Launch an Instant Digital Storefront",
              body: "Sell digital products directly underneath your video tutorials. Host Notion setups, code repositories, LUT presets, design assets, guides, and worksheets with a secure, instant UPI & card checkout.",
            },
            {
              icon: <Video className="h-5 w-5" />,
              title: "Run Live Interactive Cohort Batches",
              body: "Take your teaching live. Schedule time-boxed cohort groups with interactive whiteboards, direct Q&As, student assignments, and auto-generated video chapters of live streams — with zero Zoom fee dependencies.",
            },
          ]}
          featureMap={[
            {
              icon: <Globe2 className="h-4 w-4" />,
              title: "Branded custom domains",
              body: "Host everything on your domain (academy.yourname.com) with complete white-labeling that presents you as a professional academy.",
              href: "/features/portal",
            },
            {
              icon: <Play className="h-4 w-4" />,
              title: "Direct R2 4K video hosting",
              body: "Host premium videos securely. High-speed uncompressed R2 uploads keep your lessons crisp and secure.",
              href: "/features/recordings",
            },
            {
              icon: <Users className="h-4 w-4" />,
              title: "Structured communities",
              body: "Give students a common room feed with posts, doubts channels, @-mentions, and leaderboards to keep them engaged.",
              href: "/features/community",
            },
            {
              icon: <FileText className="h-4 w-4" />,
              title: "SEO Companion Notes",
              body: "Publish your video's code snippets, formulas, and cheatsheets at /k to capture organic search traffic from Google.",
              href: "/features/docs",
            },
          ]}
          comparison={{
            alternativeName: "Generic Member Platforms",
            rows: [
              {
                label: "All-in-One Capabilities",
                us: "Fully integrated: secure video hosting, storefronts, cohort feeds, doubt resolving, and certificates in one single workspace.",
                them: "Forces you to buy and glue 4 separate apps together (video hosting + storefront + community + certificate generators).",
              },
              {
                label: "Checkout & UPI Natives",
                us: "High-speed native UPI (GPay, PhonePe, Paytm), NetBanking, and credit card checkouts with T+2 direct settlements.",
                them: "Typically USD/Stripe-centric with heavy FX transaction conversions and delayed payout schedules.",
              },
              {
                label: "Commission & Pricing",
                us: "0% platform commission. You pay a flat monthly subscription and keep 100% of your earnings.",
                them: "Takes a painful 5% to 15% cut on every course, membership, or digital file checkout.",
              },
            ],
          }}
          cta={{
            title: "Your channel built the trust. Our tools build the academy.",
            body: "Get started in 10 minutes. The free Starter plan is fully equipped to support your custom portal, first digital product storefront, and cohort batches.",
          }}
        />

        {/* ── Why YouTubers Choose Our Tools ── */}
        <section className="border-t border-border/60 py-20 bg-muted/10">
          <div className="mx-auto max-w-5xl px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Why Creators Love Us</span>
              <h2 className="mt-3 text-balance text-3xl font-bold tracking-tight sm:text-4xl">
                The ultimate toolset for your video business
              </h2>
              <p className="mt-3 text-muted-foreground">
                Replaces multiple monthly subscriptions with one beautiful, unified creator portal.
              </p>
            </div>

            <div className="mt-14 grid gap-8 md:grid-cols-3">
              {/* Point 1 */}
              <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10 text-red-500 mb-4">
                  <Play className="h-5 w-5" />
                </div>
                <h3 className="text-base font-bold text-foreground">Secure Video Academy</h3>
                <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                  Upload your premium masterclass lessons in up to 4K resolution. Students enjoy an immersive player featuring resume-playback, speed adjustments, and auto-generated notes.
                </p>
              </div>

              {/* Point 2 */}
              <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600/10 text-violet-600 mb-4">
                  <ShoppingBag className="h-5 w-5" />
                </div>
                <h3 className="text-base font-bold text-foreground">Digital Storefronts</h3>
                <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                  Turn viewers into buyers. Instantly list worksheets, templates, code repositories, LUTs, presets, or e-books. One-click checkouts let your viewers download assets seamlessly.
                </p>
              </div>

              {/* Point 3 */}
              <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500 mb-4">
                  <Users className="h-5 w-5" />
                </div>
                <h3 className="text-base font-bold text-foreground">Cohort Communities</h3>
                <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                  Bundle your content with a real community. Host student discussion boards, doubts channels, interactive batch schedules, and leaderboards under your own URL.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Genre Cases ── */}
        <section className="border-t border-border/60 py-20 bg-background">
          <div className="mx-auto max-w-5xl px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Creator Scenarios</span>
              <h2 className="mt-3 text-balance text-3xl font-bold tracking-tight sm:text-4xl">
                Built for every genre of channel
              </h2>
              <p className="mt-3 text-muted-foreground">
                How different video creators configure their platforms to deliver value.
              </p>
            </div>

            <div className="mt-12 grid gap-6 sm:grid-cols-2">
              <div className="rounded-xl border border-border/80 p-5 flex items-start gap-4 hover:bg-muted/10 transition-colors">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10 text-red-500 shrink-0">
                  <Code className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-foreground">Coding & Tech Channels</h4>
                  <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
                    Sell gated masterclass course repositories, downloadable PDF architectures, and Notion checklist templates. Resolve students&apos; code issues in a built-in doubts feed.
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-border/80 p-5 flex items-start gap-4 hover:bg-muted/10 transition-colors">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/10 text-violet-500 shrink-0">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-foreground">Finance & Productivity Channels</h4>
                  <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
                    Offer recurring memberships that grant access to exclusive video analyses, Excel model sheets, templates, and premium monthly live recap streams.
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-border/80 p-5 flex items-start gap-4 hover:bg-muted/10 transition-colors">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500 shrink-0">
                  <ShoppingBag className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-foreground">Design & Creative Channels</h4>
                  <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
                    Create an instant storefront for downloadable assets: LUT color-grading files, audio sample presets, Lightroom templates, Figma assets, and custom textures.
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-border/80 p-5 flex items-start gap-4 hover:bg-muted/10 transition-colors">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500 shrink-0">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-foreground">Academia & Exam Prep Channels</h4>
                  <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
                    Run structured online study batches. Deliver live video classes, coordinate daily student homework, assign quizzes, and award authenticated certificates of completion.
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

// ─── Gorgeous Custom YouTuber Visual ────────────────────────────────────────

function YouTuberHeroVisual() {
  return (
    <div className="relative mx-auto w-full max-w-[500px]">
      {/* Background glow orbs */}
      <div
        className="pointer-events-none absolute -top-10 -right-10 h-64 w-64 rounded-full opacity-20 blur-[80px]"
        style={{
          background: "radial-gradient(circle, #ef4444 0%, transparent 70%)",
          animation: "redPulse 6s ease-in-out infinite",
        }}
      />
      <div
        className="pointer-events-none absolute -bottom-10 -left-10 h-64 w-64 rounded-full opacity-20 blur-[80px]"
        style={{
          background: "radial-gradient(circle, #6366f1 0%, transparent 70%)",
          animation: "bluePulse 6s ease-in-out infinite 3s",
        }}
      />

      {/* ── Main Mockup: Branded Creator Player Page ── */}
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
            academy.devcreator.tv
          </div>
        </div>

        {/* Video Player */}
        <div className="relative overflow-hidden bg-slate-950 aspect-video">
          <img
            src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=480&q=80"
            alt="Premium video content overlay"
            className="h-full w-full object-cover opacity-45"
          />
          {/* Member Exclusive Badge */}
          <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-red-500 px-2 py-0.5 text-[9px] font-bold text-white shadow-md">
            <Sparkles className="h-2.5 w-2.5" />
            MEMBERS EXCLUSIVE
          </div>

          {/* Central Play button */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 backdrop-blur-md border border-white/20 transition-transform hover:scale-105">
              <Play className="h-5 w-5 fill-white text-white translate-x-0.5" />
            </div>
          </div>

          {/* Control Bar */}
          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-[9px] text-white/95 font-semibold">10:42 / 45:00</span>
            </div>
            <div className="text-[9px] text-white/70">4K Ultra HD enabled</div>
          </div>
        </div>

        {/* Video Description area */}
        <div className="p-4">
          <p className="text-xs font-bold leading-tight">Mastering Next.js 15 Server Actions (Deep Dive)</p>
          <div className="mt-2 flex items-center gap-2">
            <div className="h-5 w-5 rounded-full bg-gradient-to-br from-red-500 to-violet-500" />
            <span className="text-[10px] font-bold">DevCreator Academy</span>
            <span className="text-[9px] text-muted-foreground">· 2,840 members</span>
          </div>
        </div>
      </div>

      {/* ── Floating Widget 1: Revenue Comparison ── */}
      <div
        className="absolute -left-8 -bottom-5 z-20 w-48 rounded-xl border border-border bg-card/95 p-3.5 shadow-2xl backdrop-blur-md"
        style={{
          animation: "floatInUp 0.6s ease-out 0.2s both",
          boxShadow: "0 20px 50px -10px rgba(0,0,0,0.3)",
        }}
      >
        <div className="flex items-center gap-1.5 text-[9px] font-bold text-muted-foreground uppercase tracking-wider">
          <TrendingUp className="h-3 w-3 text-emerald-500" />
          Revenue Comparison
        </div>
        <div className="mt-2.5 space-y-2">
          <div>
            <div className="flex justify-between text-[9px] font-semibold text-red-500 mb-0.5">
              <span>Third-party Platform</span>
              <span>₹4,200</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-muted">
              <div className="h-full rounded-full bg-red-500" style={{ width: "5%" }} />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-[9px] font-bold text-emerald-600 mb-0.5">
              <span>Your Branded Suite</span>
              <span>₹1,48,200</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-muted">
              <div className="h-full rounded-full bg-emerald-500" style={{ width: "95%" }} />
            </div>
          </div>
        </div>
      </div>

      {/* ── Floating Widget 2: Direct UPI Payouts ── */}
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
          <p className="text-[9px] font-bold leading-none text-muted-foreground">DIRECT PAYOUT</p>
          <p className="mt-0.5 text-[10px] font-extrabold text-foreground">₹2,999 from Rohan K.</p>
        </div>
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
      </div>

      {/* ── Floating Badge 3: YouTube to Academy Conversion ── */}
      <div
        className="absolute -right-4 -bottom-3 z-20 flex items-center gap-2 rounded-lg border border-red-500/20 bg-card/95 p-2 shadow-lg backdrop-blur-md"
        style={{
          animation: "floatInUp 0.5s ease-out 0.6s both",
        }}
      >
        <Youtube className="h-4 w-4 text-red-500" />
        <div className="text-[9px] leading-tight">
          <span className="font-bold block text-foreground">1.4% Conversion</span>
          <span className="text-muted-foreground font-semibold">scales your video business</span>
        </div>
      </div>

      {/* Keyframe Styling */}
      <style>{`
        @keyframes redPulse {
          0%, 100% { transform: scale(1); opacity: 0.15; }
          50% { transform: scale(1.1); opacity: 0.25; }
        }
        @keyframes bluePulse {
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
