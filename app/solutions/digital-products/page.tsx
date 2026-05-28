// /solutions/digital-products — PDFs, audio, video, ZIPs, license keys.

import type { Metadata } from "next"
import Link from "next/link"
import {
  ArrowRight,
  Award,
  BookOpen,
  Calendar,
  CheckCircle2,
  Code,
  Download,
  FileText,
  Film,
  Gift,
  Globe2,
  GraduationCap,
  Heart,
  IndianRupee,
  Key,
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
  title: "Why Creators Choose Our Digital Products Storefront · The Big Class",
  description:
    "Launch your branded digital storefront. Sell Notion templates, LUT presets, guides, audio ZIP files, and license keys under your own white-labeled custom domain with 0% platform commission.",
  alternates: { canonical: "https://thebigclass.com/solutions/digital-products" },
}

export default function DigitalProductsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1">
        <SolutionPage
          eyebrow="For Digital Sellers"
          title={
            <>
              Sell your files.{" "}
              <span className="bg-gradient-to-r from-amber-500 via-rose-500 to-indigo-600 bg-clip-text text-transparent">
                Keep all your earnings.
              </span>
            </>
          }
          subtitle="Stop letting generic marketplace directories skim massive transaction cuts off your digital files. Sell Lightroom presets, Notion templates, e-books, LUTs, code blocks, and audio sample ZIPs under your custom white-labeled domain with 0% platform commission."
          heroVisual={<DigitalProductsHeroVisual />}
          outcomes={[
            {
              icon: <Download className="h-5 w-5" />,
              title: "One-Click Auto-Delivery System",
              body: "Provide an elegant purchasing process. Upload your PDFs, templates, presets, or ZIP archives in seconds. The moment payment clears, the secure download triggers instantly with automated email files.",
            },
            {
              icon: <Gift className="h-5 w-5" />,
              title: "Enable 'Pay-What-You-Want' Flex Billing",
              body: "Leverage fan loyalty. Set a price floor, suggest an ideal amount, and let supporters pay more. Creators routinely see average transaction values bump 2.5× higher than the minimum fee.",
            },
            {
              icon: <Key className="h-5 w-5" />,
              title: "Auto-Issued License Key Pools",
              body: "Sell templates or software seamlessly. Upload a bulk text pool of license keys. The platform automatically allocates one unique key per sale, ensuring secure product verification.",
            },
          ]}
          featureMap={[
            {
              icon: <Globe2 className="h-4 w-4" />,
              title: "White-labeled portal link",
              body: "Create a premium branded storefront (e.g. store.yourname.com) featuring your customized themes instead of generic marketplace templates.",
              href: "/features/portal",
            },
            {
              icon: <Package className="h-4 w-4" />,
              title: "Digital Downloads",
              body: "List presets, worksheets, video templates, travel guides, recipe sheets, and Notion bundles with fast file delivery.",
              href: "/features/storefront",
            },
            {
              icon: <Key className="h-4 w-4" />,
              title: "License key allocator",
              body: "Upload key codes once. The platform manages stock levels and emails individual codes instantly after checkout.",
              href: "/features/storefront",
            },
            {
              icon: <Layers className="h-4 w-4" />,
              title: "Product Bundles",
              body: "Package your offerings. Compose bundles containing multiple downloads and premium courses at one price.",
              href: "/features/storefront",
            },
          ]}
          comparison={{
            alternativeName: "Generic Marketplace Sites",
            rows: [
              {
                label: "Platform Revenue Cuts",
                us: "0% commission. You pay a flat monthly subscription fee and keep 100% of your earnings.",
                them: "Gumroad takes a painful 10% flat take rate on every single download, presets, or template sale.",
              },
              {
                label: "Client Experience",
                us: "Integrated: custom storefronts, time-slot calendars, video classes, cohort feeds, and certificates in one single workspace.",
                them: "A single generic marketplace product listing page without your own custom domain or communities.",
              },
              {
                label: "INR & UPI Checkout native",
                us: "High-speed native mobile UPI settlements and cards, settling directly to your business bank account T+2.",
                them: "USD-first transaction checkouts that trigger high foreign exchange fee conversions for Indian shoppers.",
              },
            ],
          }}
          cta={{
            title: "Your creations deserve a premium storefront.",
            body: "Get started in 10 minutes. The free Starter plan is fully equipped to support your custom domain portal, first digital product storefront, and cohort batches.",
          }}
        />

        {/* ── Workflow Guide Section ── */}
        <section className="border-t border-border/60 py-20 bg-muted/10">
          <div className="mx-auto max-w-5xl px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-primary">The Storefront Funnel</span>
              <h2 className="mt-3 text-balance text-3xl font-bold tracking-tight sm:text-4xl">
                The 3-Step Digital Product Funnel
              </h2>
              <p className="mt-3 text-muted-foreground">
                How professional creators package their knowledge into automated digital assets.
              </p>
            </div>

            <div className="mt-14 grid gap-8 md:grid-cols-3">
              {/* Step 1 */}
              <div className="relative rounded-2xl border border-border/80 bg-card p-6 shadow-sm">
                <div className="absolute -top-4 left-6 flex h-8 w-8 items-center justify-center rounded-full bg-rose-500 font-bold text-white text-sm shadow-md">
                  1
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <Package className="h-5 w-5 text-rose-500" />
                  <h3 className="text-base font-bold text-foreground">Upload Gated Files</h3>
                </div>
                <p className="mt-4 text-xs font-bold uppercase text-muted-foreground tracking-wide">THE UPLOAD STAGE</p>
                <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                  Drop your worksheets, presets, Notion templates, or ZIP archives in our secure cloud portal. Specify parameters, write detailed descriptions, and select ideal product mockup graphics.
                </p>
              </div>

              {/* Step 2 */}
              <div className="relative rounded-2xl border border-border/80 bg-card p-6 shadow-sm">
                <div className="absolute -top-4 left-6 flex h-8 w-8 items-center justify-center rounded-full bg-violet-600 font-bold text-white text-sm shadow-md">
                  2
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <IndianRupee className="h-5 w-5 text-violet-500" />
                  <h3 className="text-base font-bold text-foreground">Configure Pricing Tiers</h3>
                </div>
                <p className="mt-4 text-xs font-bold uppercase text-muted-foreground tracking-wide">THE BILLING STAGE</p>
                <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                  Select flat rates or enable flexible Pay-What-You-Want parameters (specify a price floor and a suggested value). Apply custom coupons and list multi-product bundle packages.
                </p>
              </div>

              {/* Step 3 */}
              <div className="relative rounded-2xl border border-border/80 bg-card p-6 shadow-sm">
                <div className="absolute -top-4 left-6 flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 font-bold text-white text-sm shadow-md">
                  3
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <Download className="h-5 w-5 text-emerald-500" />
                  <h3 className="text-base font-bold text-foreground">Auto-Deliver Assets</h3>
                </div>
                <p className="mt-4 text-xs font-bold uppercase text-muted-foreground tracking-wide">THE DELIVERY STAGE</p>
                <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                  Buyers complete checkouts instantly using high-speed mobile UPI. The secure file download activates immediately in their browser and receives copy confirmations via automated email.
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
                Tailored solutions for every genre of digital creator, developer, and author.
              </p>
            </div>

            <div className="mt-12 grid gap-6 sm:grid-cols-2">
              <div className="rounded-xl border border-border/80 p-5 flex items-start gap-4 hover:bg-muted/10 transition-colors">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10 text-red-500 shrink-0">
                  <Code className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-foreground">Designers & Creative Brands</h4>
                  <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
                    Sell Lightroom preset bundles, LUT files, high-res texture packs, Figma UI kits, sound fx directories, and layout graphics in seconds directly under your branded store.
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-border/80 p-5 flex items-start gap-4 hover:bg-muted/10 transition-colors">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/10 text-violet-500 shrink-0">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-foreground">Business & Productive Advisors</h4>
                  <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
                    Package Notion template dashboards, Excel financial model spreadsheets, digital checklist guides, e-books, and weekly consult booking slots under one roof.
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-border/80 p-5 flex items-start gap-4 hover:bg-muted/10 transition-colors">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500 shrink-0">
                  <ShoppingBag className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-foreground">Developers & Technical Creators</h4>
                  <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
                    Sell gated software scripts, advanced database repositories, boilerplate source codes, configure secure license key issuers, and provide private dudas support threads.
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
                    Deliver custom workout PDFs, meal-prep PDF schedules, travel itinerary books, lifestyle planners, and coordinate cohort wellness masterclasses directly.
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

// ─── Gorgeous Custom Digital Products Visual ─────────────────────────────────

function DigitalProductsHeroVisual() {
  return (
    <div className="relative mx-auto w-full max-w-[500px]">
      {/* Background glow orbs */}
      <div
        className="pointer-events-none absolute -top-10 -right-10 h-64 w-64 rounded-full opacity-20 blur-[80px]"
        style={{
          background: "radial-gradient(circle, #ec4899 0%, transparent 70%)",
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

      {/* ── Main Mockup: Premium Storefront Item Page ── */}
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
            store.designcreator.com
          </div>
        </div>

        {/* Product Details Header */}
        <div className="p-4 bg-muted/10 border-b border-border/50">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[9px] font-extrabold uppercase tracking-wider text-muted-foreground">Digital Storefront Item</span>
              <h4 className="text-xs font-black text-foreground mt-0.5">Premium Notion Creator Bundle</h4>
            </div>
            <span className="text-[8px] font-extrabold text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">5 TEMPLATES</span>
          </div>
        </div>

        {/* File information block */}
        <div className="p-4 space-y-3">
          <div className="rounded-lg border border-border bg-card/60 p-2.5 flex items-center gap-3">
            <span className="flex h-6 w-6 items-center justify-center rounded bg-amber-500/10 text-amber-500 shrink-0">
              <Package className="h-4 w-4" />
            </span>
            <div className="flex-1 min-w-0">
              <h5 className="text-[9px] font-bold text-foreground truncate">Notion Creator Bundle 2026</h5>
              <p className="text-[7.5px] text-muted-foreground">Format: ZIP File (12 MB) · Immediate auto-delivery</p>
            </div>
          </div>

          {/* Pay what you want pricing */}
          <div className="space-y-1">
            <div className="flex justify-between text-[8px] font-extrabold uppercase tracking-wider text-muted-foreground">
              <span>Pay What You Want pricing</span>
              <span className="text-emerald-600">Min: ₹299 · Suggested: ₹499</span>
            </div>
            <div className="rounded-lg border border-border bg-muted/20 p-2 flex items-center justify-between text-[9px] font-bold">
              <span className="text-muted-foreground">Enter your price:</span>
              <span className="text-foreground">₹999 (Supporter tier)</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Floating Widget 1: Secure Delivery Widget ── */}
      <div
        className="absolute -left-8 -bottom-5 z-20 w-44 rounded-xl border border-emerald-500/30 bg-card/95 p-3.5 shadow-2xl backdrop-blur-md"
        style={{
          animation: "floatInUp 0.6s ease-out 0.2s both",
          boxShadow: "0 20px 50px -10px rgba(0,0,0,0.3)",
        }}
      >
        <div className="flex items-center gap-1.5 text-[8px] font-bold text-emerald-600 uppercase tracking-wider mb-2">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
          Secure Delivery
        </div>
        <div className="border border-dashed border-emerald-500/20 rounded-lg p-2 text-center bg-emerald-500/5">
          <p className="text-[7px] text-muted-foreground font-semibold">NOTION_CREATOR.ZIP</p>
          <div className="mt-2 flex h-5 w-full items-center justify-center rounded bg-emerald-500 text-[8px] font-bold text-white shadow-sm cursor-pointer hover:bg-emerald-600">
            Download Gated File
          </div>
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
          <p className="text-[8px] font-bold leading-none text-muted-foreground">DIGITAL SALE</p>
          <p className="mt-0.5 text-[9px] font-extrabold text-foreground">₹999 from Rohan K.</p>
        </div>
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
      </div>

      {/* ── Floating Badge 3: Active Coupon status ── */}
      <div
        className="absolute -right-4 -bottom-3 z-20 flex items-center gap-2 rounded-lg border border-amber-500/20 bg-card/95 p-2 shadow-lg backdrop-blur-md"
        style={{
          animation: "floatInUp 0.5s ease-out 0.6s both",
        }}
      >
        <Sparkles className="h-4 w-4 text-amber-500" />
        <div className="text-[8px] leading-tight">
          <span className="font-bold block text-foreground">Code EARLYBIRD applied</span>
          <span className="text-muted-foreground font-semibold">Saved ₹200 at checkout</span>
        </div>
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
