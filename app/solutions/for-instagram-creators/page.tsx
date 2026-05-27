// /solutions/for-instagram-creators — link-in-bio that earns.

import type { Metadata } from "next"
import Link from "next/link"
import {
  ArrowRight,
  BookOpen,
  Calendar,
  CheckCircle2,
  Globe2,
  Heart,
  IndianRupee,
  Instagram,
  Layers,
  Link2,
  Mic,
  Package,
  Phone,
  Repeat,
  ShoppingBag,
  Sparkles,
  TrendingUp,
  Users,
  Video,
} from "lucide-react"
import { Header } from "@/components/landing/header"
import { Footer } from "@/components/landing/footer"
import { SolutionPage } from "@/components/landing/solution-page"

export const metadata: Metadata = {
  title: "Why Instagram Creators Use Our Link-in-Bio Storefront · The Big Class",
  description:
    "Turn your Instagram bio link into a premium branded storefront. Sell e-books, creative presets, live cohorts, and 1:1 sessions under your own custom URL with 0% platform commission.",
  alternates: { canonical: "https://thebigclass.com/solutions/for-instagram-creators" },
}

export default function ForInstagramCreatorsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1">
        <SolutionPage
          eyebrow="For Instagram Creators"
          title={
            <>
              A Link-in-Bio{" "}
              <span className="bg-gradient-to-r from-amber-500 via-rose-500 to-violet-600 bg-clip-text text-transparent">
                that actually sells.
              </span>
            </>
          }
          subtitle="Stop pointing your Instagram followers at dry text link lists. Turn your prime real estate link into a conversion-optimized storefront — host structured video courses, sell presets/downloads, book 1:1 coaching slots, and accept instant UPI payments under your own custom domain."
          heroVisual={<InstagramHeroVisual />}
          outcomes={[
            {
              icon: <ShoppingBag className="h-5 w-5" />,
              title: "Launch an Instant Digital Storefront",
              body: "Turn your content assets into income. Sell Lightroom presets, cooking PDFs, travel guides, e-books, workout plans, and Notion setups in seconds with a high-speed checkout optimized for mobile shoppers.",
            },
            {
              icon: <Calendar className="h-5 w-5" />,
              title: "Book 1:1 Coaching & Consultation Slots",
              body: "Sell your time. Integrate 1:1 consultation schedules directly inside your bio link. Followers can book mentorship spots, diet reviews, or portfolio consults with automated confirmations and meeting links.",
            },
            {
              icon: <Repeat className="h-5 w-5" />,
              title: "Establish Premium Cohorts & Memberships",
              body: "Run time-boxed challenges or private community groups. Bundle video streams with an interactive common feed, doubt resolving, and automated student progress tracking.",
            },
          ]}
          featureMap={[
            {
              icon: <Globe2 className="h-4 w-4" />,
              title: "Custom domain CNAMEs",
              body: "Your storefront belongs entirely to your brand (e.g. jessica.fit/links) instead of promoting third-party link directories.",
              href: "/features/portal",
            },
            {
              icon: <Package className="h-4 w-4" />,
              title: "Digital downloads storefront",
              body: "Auto-deliver files immediately after checkout. Perfect for presets, PDFs, guides, and templates.",
              href: "/solutions/digital-products",
            },
            {
              icon: <Mic className="h-4 w-4" />,
              title: "1:1 Video Booking Tools",
              body: "Followers choose a time slots, pay native UPI, and automatically receive secure classroom credentials.",
              href: "/features/storefront",
            },
            {
              icon: <Users className="h-4 w-4" />,
              title: "Private community feeds",
              body: "A safe space to interact with your VIP members without algorithm filters deciding who gets to see your updates.",
              href: "/solutions/paid-communities",
            },
          ]}
          comparison={{
            alternativeName: "Generic Link-in-Bio Stacks",
            rows: [
              {
                label: "All-in-One Integration",
                us: "Integrated: custom digital storefront, live scheduling, gated communities, and courses in one clean portal.",
                them: "Forces you to patch together Linktree + Calendly + Stripe + Patreon (separate bills and setups).",
              },
              {
                label: "Mobile checkout ease",
                us: "Native mobile-first checkouts with one-click UPI (GPay, PhonePe, Paytm) and cards, ensuring high conversions.",
                them: "Stripe-centric models that force customers to type in full credit card numbers, hurting mobile conversion.",
              },
              {
                label: "Earnings Cuts",
                us: "0% commission. Settle directly to your bank account via your own Razorpay, keeping 100% of your earnings.",
                them: "Takes a painful 5% to 12% cut of your hard-earned sales plus monthly membership fees.",
              },
            ],
          }}
          cta={{
            title: "Your Instagram built the trust. Our tools build the storefront.",
            body: "Get started in 10 minutes. The free Starter plan is fully equipped to support your custom domain portal, first digital product storefront, and cohort batches.",
          }}
        />

        {/* ── Workflow Guide Section — How Instagram Creators use this to monetize ── */}
        <section className="border-t border-border/60 py-20 bg-muted/10">
          <div className="mx-auto max-w-5xl px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-primary">The Monetization Guide</span>
              <h2 className="mt-3 text-balance text-3xl font-bold tracking-tight sm:text-4xl">
                The 3-Step Bio-Link Funnel
              </h2>
              <p className="mt-3 text-muted-foreground">
                How top Instagram creators convert story views into stable, recurring business revenue.
              </p>
            </div>

            <div className="mt-14 grid gap-8 md:grid-cols-3">
              {/* Step 1 */}
              <div className="relative rounded-2xl border border-border/80 bg-card p-6 shadow-sm">
                <div className="absolute -top-4 left-6 flex h-8 w-8 items-center justify-center rounded-full bg-rose-500 font-bold text-white text-sm shadow-md">
                  1
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <Instagram className="h-5 w-5 text-rose-500" />
                  <h3 className="text-base font-bold text-foreground">The Story/Reel CTA</h3>
                </div>
                <p className="mt-4 text-xs font-bold uppercase text-muted-foreground tracking-wide">WHAT YOU POST</p>
                <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                  Post a high-value reel or story tutorial. Tell your audience: <span className="font-semibold text-foreground">"Get the complete Lightroom presets pack, workouts guide, or recipe sheet instantly in my bio-link!"</span>
                </p>
              </div>

              {/* Step 2 */}
              <div className="relative rounded-2xl border border-border/80 bg-card p-6 shadow-sm">
                <div className="absolute -top-4 left-6 flex h-8 w-8 items-center justify-center rounded-full bg-violet-600 font-bold text-white text-sm shadow-md">
                  2
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <Link2 className="h-5 w-5 text-violet-500" />
                  <h3 className="text-base font-bold text-foreground"> Branded Mobile Hub</h3>
                </div>
                <p className="mt-4 text-xs font-bold uppercase text-muted-foreground tracking-wide">WHAT THEY LAND ON</p>
                <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                  Followers land on your custom domain link. They see a premium, branded mobile store containing your digital presets, e-books, cohort courses, or 1:1 consult links in one place.
                </p>
              </div>

              {/* Step 3 */}
              <div className="relative rounded-2xl border border-border/80 bg-card p-6 shadow-sm">
                <div className="absolute -top-4 left-6 flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 font-bold text-white text-sm shadow-md">
                  3
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-emerald-500" />
                  <h3 className="text-base font-bold text-foreground">One-Click Checkout</h3>
                </div>
                <p className="mt-4 text-xs font-bold uppercase text-muted-foreground tracking-wide">HOW THEY PAY YOU</p>
                <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                  Students complete purchases using one-click mobile UPI (Google Pay, PhonePe, Paytm). The digital product is auto-delivered instantly, and funds transfer directly to your bank account.
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
                What can you build & sell?
              </h2>
              <p className="mt-3 text-muted-foreground">
                Tailored solutions for every genre of Instagram content creator.
              </p>
            </div>

            <div className="mt-12 grid gap-6 sm:grid-cols-2">
              <div className="rounded-xl border border-border/80 p-5 flex items-start gap-4 hover:bg-muted/10 transition-colors">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10 text-red-500 shrink-0">
                  <ShoppingBag className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-foreground">Photography & Creative Creators</h4>
                  <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
                    Sell Lightroom preset bundles, photography asset ZIP files, LUT files, travel itineraries, and host 1:1 creative consult sessions or reviews.
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-border/80 p-5 flex items-start gap-4 hover:bg-muted/10 transition-colors">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/10 text-violet-500 shrink-0">
                  <Calendar className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-foreground">Fitness, Wellness & Yoga Coaches</h4>
                  <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
                    Sell digital workout sheets, customized diet PDF schedules, and let followers easily book 1:1 diet consult calls or live group yoga cohorts directly.
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-border/80 p-5 flex items-start gap-4 hover:bg-muted/10 transition-colors">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500 shrink-0">
                  <BookOpen className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-foreground">Business & Marketing Creators</h4>
                  <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
                    Sell Notion tracker setups, cold email templates, digital checklist guides, e-books, and premium cohort mentorship courses.
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-border/80 p-5 flex items-start gap-4 hover:bg-muted/10 transition-colors">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500 shrink-0">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-foreground">Lifestyle & Cooking Creators</h4>
                  <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
                    Deliver custom meal-prep PDF guides, recipe e-books, hosting tips checklists, and host premium culinary classes directly inside your academy.
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

// ─── Gorgeous Custom Instagram Visual ────────────────────────────────────────

function InstagramHeroVisual() {
  return (
    <div className="relative mx-auto w-full max-w-[420px]">
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
          background: "radial-gradient(circle, #eab308 0%, transparent 70%)",
          animation: "yellowPulse 6s ease-in-out infinite 3s",
        }}
      />

      {/* ── iPhone Device Container ── */}
      <div
        className="relative z-10 mx-auto overflow-hidden rounded-[38px] border-[6px] border-slate-900 bg-background shadow-2xl"
        style={{
          aspectRatio: "9/19",
          maxWidth: "300px",
          boxShadow: "0 30px 60px -15px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)",
        }}
      >
        {/* Dynamic Island */}
        <div className="absolute top-2 left-1/2 h-4 w-16 -translate-x-1/2 rounded-full bg-slate-900 z-30" />

        {/* Inner Branded Link-in-Bio Hub */}
        <div className="h-full flex flex-col pt-9 px-4 pb-4 overflow-y-auto">
          {/* Header profile info */}
          <div className="flex flex-col items-center text-center mt-3">
            <div className="relative">
              <div className="h-14 w-14 rounded-full p-[2px] bg-gradient-to-tr from-amber-500 via-rose-500 to-violet-600">
                <div className="h-full w-full rounded-full border border-background overflow-hidden bg-slate-800 flex items-center justify-center text-lg">
                  👩‍🎨
                </div>
              </div>
              <span className="absolute bottom-0 right-0 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-500 border-2 border-background text-[7px]" />
            </div>
            <h3 className="mt-2 text-xs font-black text-foreground">academy.jessica.tv</h3>
            <p className="text-[9px] text-muted-foreground leading-none mt-0.5">Creative Director & Educator</p>
          </div>

          {/* Links list */}
          <div className="mt-5 space-y-2 flex-1">
            {/* Link 1: Presets Storefront */}
            <div className="rounded-xl border border-border bg-card/60 p-2.5 flex items-center gap-2 hover:bg-card/90 transition-colors cursor-pointer">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-rose-500/10 text-rose-500 shrink-0">
                <ShoppingBag className="h-3.5 w-3.5" />
              </span>
              <div className="flex-1 truncate">
                <h4 className="text-[10px] font-bold text-foreground">Lightroom Presets Pack</h4>
                <p className="text-[8px] text-muted-foreground leading-none">Instant PDF download · ₹499</p>
              </div>
              <span className="text-[8px] font-bold text-emerald-600 bg-emerald-500/10 px-1.5 py-0.5 rounded-full">ACTIVE</span>
            </div>

            {/* Link 2: Live Cohort */}
            <div className="rounded-xl border border-border bg-card/60 p-2.5 flex items-center gap-2 hover:bg-card/90 transition-colors cursor-pointer">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-violet-600/10 text-violet-600 shrink-0">
                <Video className="h-3.5 w-3.5" />
              </span>
              <div className="flex-1 truncate">
                <h4 className="text-[10px] font-bold text-foreground">Live Creator Masterclass</h4>
                <p className="text-[8px] text-muted-foreground leading-none">Cohort Batch B starts Saturday</p>
              </div>
              <span className="text-[8px] font-bold text-violet-600 bg-violet-500/10 px-1.5 py-0.5 rounded-full">LIVE</span>
            </div>

            {/* Link 3: 1:1 booking */}
            <div className="rounded-xl border border-border bg-card/60 p-2.5 flex items-center gap-2 hover:bg-card/90 transition-colors cursor-pointer">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500 shrink-0">
                <Calendar className="h-3.5 w-3.5" />
              </span>
              <div className="flex-1 truncate">
                <h4 className="text-[10px] font-bold text-foreground">1:1 Creative Mentorship Call</h4>
                <p className="text-[8px] text-muted-foreground leading-none">Book 30-min Zoom slots</p>
              </div>
              <span className="text-[8px] font-bold text-amber-600 bg-amber-500/10 px-1.5 py-0.5 rounded-full">BOOK</span>
            </div>
          </div>

          {/* Footer Logo */}
          <div className="text-center mt-4">
            <span className="text-[8px] text-muted-foreground uppercase tracking-widest font-bold">The Big Class</span>
          </div>
        </div>
      </div>

      {/* ── Floating Widget 1: Revenue Comparison ── */}
      <div
        className="absolute -left-12 -bottom-5 z-20 w-44 rounded-xl border border-border bg-card/95 p-3 shadow-2xl backdrop-blur-md"
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
              <span>Linktree directory</span>
              <span>₹2,400</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-muted">
              <div className="h-full rounded-full bg-rose-500" style={{ width: "8%" }} />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-[8px] font-bold text-emerald-600 mb-0.5">
              <span>Big Class Store</span>
              <span>₹94,800</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-muted">
              <div className="h-full rounded-full bg-emerald-500" style={{ width: "92%" }} />
            </div>
          </div>
        </div>
      </div>

      {/* ── Floating Widget 2: Direct UPI Payouts ── */}
      <div
        className="absolute -right-8 top-1/3 z-20 flex items-center gap-2 rounded-full border border-emerald-500/20 bg-card/95 px-3 py-1.5 shadow-xl backdrop-blur-md"
        style={{
          animation: "floatInUp 0.5s ease-out 0.4s both",
        }}
      >
        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/15">
          <IndianRupee className="h-3 w-3 text-emerald-600" />
        </div>
        <div>
          <p className="text-[8px] font-bold leading-none text-muted-foreground">UPI PAYMENT</p>
          <p className="mt-0.5 text-[9px] font-extrabold text-foreground">₹499 from Tanya S.</p>
        </div>
        <span className="h-1 w-1 rounded-full bg-emerald-500 animate-ping" />
      </div>

      {/* Keyframe Styling */}
      <style>{`
        @keyframes redPulse {
          0%, 100% { transform: scale(1); opacity: 0.15; }
          50% { transform: scale(1.1); opacity: 0.25; }
        }
        @keyframes yellowPulse {
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
