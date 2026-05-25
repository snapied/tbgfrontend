"use client"

import {
  Calendar,
  CheckCircle2,
  Download,
  Globe,
  Key,
  Layers,
  Lock,
  Package,
  ShieldCheck,
  ShoppingBag,
  Tag,
  Video,
} from "lucide-react"
import { ProductsYouCanSell } from "@/components/landing/products-you-can-sell"
import { Header } from "@/components/landing/header"
import { Footer } from "@/components/landing/footer"
import {
  FeatureCTA,
  FeaturePageShell,
  FeatureSplit,
  PreviewFrame,
} from "@/components/landing/feature-page"

export default function StorefrontFeaturePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <FeaturePageShell
          eyebrow="Storefront"
          title={<>A storefront, not a <span className="text-primary">checkout link</span>.</>}
          subtitle="Sell every digital thing a teacher actually has — courses (live or recorded), memberships, webinars, communities, digital downloads, coaching, license keys. All under your brand, on your own subdomain, with your own customer library."
          heroImage="/images/features/storefront.png"
        />

        <ProductsYouCanSell />


        <FeatureSplit
          title="Seven product kinds, one builder."
          body="Stop forcing every offering into the same shape. A 1:1 session isn't a course. A monthly community isn't a download. We give each kind a sensible model — entitlements, expiry, capacity, license-key issuance — so what students see and what they get actually match."
          bullets={[
            "Course · Bundle · Membership · Session · Webinar · Download · License",
            "Per-product pricing with one-time or recurring",
            "Public store page at yourbrand.thebigclass.com",
            "Inventory & capacity caps where they make sense",
          ]}
          mockup={<ProductGridMockup />}
        />

        <FeatureSplit
          reverse
          title="Orders, entitlements, library — wired."
          body="Every purchase becomes an order, every order grants entitlements, every entitlement opens content in the student's Library. They see exactly what they've bought, you see exactly what's been delivered."
          bullets={[
            "Order log with status & timestamps",
            "Entitlements separate ownership from content",
            "Student Library auto-built from purchases",
            "License keys auto-issued for software products",
          ]}
          mockup={<LibraryMockup />}
        />

        <FeatureSplit
          title="Your brand. Your domain. Your customer."
          body="The store lives at your subdomain on day one. Point a CNAME from learn.yourdomain.com when you're ready and it becomes your domain end-to-end — no platform branding wedged in the URL."
          bullets={[
            "Subdomain provisioned at signup",
            "Custom domain (CNAME) when you're ready",
            "Your logo, brand colours, copy across every page",
            "Public store + checkout + invoice all under your brand",
          ]}
          mockup={<DomainMockup />}
        />

        <FeatureCTA />
      </main>
      <Footer />
    </div>
  )
}

// ============================================================
// Mockup #1 — Public storefront with 7 product kinds
// Browser-framed page with header + 6 visible cards covering each
// kind, each card has a colour-coded thumbnail + kind chip + price.
// ============================================================

const PRODUCTS = [
  { t: "UX Foundations",  k: "Course",      p: "₹4,999",    grad: "from-emerald-400 to-emerald-600",  Icon: Package },
  { t: "Design Bundle",   k: "Bundle",      p: "₹9,999",    grad: "from-sky-400 to-indigo-600",       Icon: Layers, badge: "Save 30%" },
  { t: "Studio Member",   k: "Membership",  p: "₹999/mo",   grad: "from-amber-400 to-rose-500",       Icon: Tag,    badge: "Recurring" },
  { t: "Portfolio 1:1",   k: "Session",     p: "₹2,499",    grad: "from-violet-400 to-fuchsia-600",   Icon: Calendar },
  { t: "Brand Webinar",   k: "Webinar",     p: "Free",      grad: "from-slate-600 to-slate-900",      Icon: Video,  badge: "Live event" },
  { t: "Wireframe Kit",   k: "Download",    p: "₹499",      grad: "from-amber-300 to-amber-600",      Icon: Download },
]

function ProductGridMockup() {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-md">
      {/* Browser chrome */}
      <div className="flex items-center gap-2 border-b border-border/60 bg-muted/40 px-3 py-2">
        <span className="h-2 w-2 rounded-full bg-rose-400/70" />
        <span className="h-2 w-2 rounded-full bg-amber-400/70" />
        <span className="h-2 w-2 rounded-full bg-emerald-400/70" />
        <span className="ml-2 inline-flex items-center gap-1 rounded-full border border-border bg-background px-2 py-0.5 font-mono text-[9px] text-muted-foreground">
          <Lock className="h-2.5 w-2.5 text-success" />
          studio.thebigclass.com / store
        </span>
      </div>

      {/* Store header */}
      <div className="border-b border-border/60 bg-gradient-to-br from-secondary/50 via-background to-background px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-[9px] font-bold text-primary-foreground">S</div>
          <p className="font-semibold">Studio Cohort</p>
          <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-[9px]">Cart · 0</span>
        </div>
        <p className="mt-1 text-[10px] text-muted-foreground">Everything Studio Cohort sells, in one place.</p>
      </div>

      {/* Product grid */}
      <div className="grid grid-cols-2 gap-3 p-3 sm:grid-cols-3">
        {PRODUCTS.map((p) => (
          <div key={p.t} className="overflow-hidden rounded-md border border-border bg-card transition-transform hover:-translate-y-0.5">
            <div className={`relative flex h-16 items-center justify-center bg-gradient-to-br ${p.grad}`}>
              <p.Icon className="h-5 w-5 text-white/90" />
              {p.badge && (
                <span className="absolute right-1 top-1 rounded-full bg-black/40 px-1.5 py-0.5 text-[7px] font-bold text-white backdrop-blur">
                  {p.badge}
                </span>
              )}
            </div>
            <div className="space-y-1 p-2">
              <p className="truncate text-[10px] font-semibold">{p.t}</p>
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-muted px-1.5 py-0.5 text-[8px] font-medium text-muted-foreground">{p.k}</span>
                <span className="font-mono text-[10px] font-bold">{p.p}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer strip */}
      <div className="flex items-center justify-between border-t border-border/60 bg-muted/30 px-3 py-1.5 text-[9px] text-muted-foreground">
        <span>7 product kinds · 6 published</span>
        <span className="font-mono">studio.thebigclass.com</span>
      </div>
    </div>
  )
}

// ============================================================
// Mockup #2 — Student library after purchase
// Order + entitlement rows + a license-key reveal panel.
// ============================================================

function LibraryMockup() {
  return (
    <PreviewFrame title="library · Aanya Rao">
      <div className="space-y-3 text-[11px]">
        {/* Welcome strip */}
        <div className="flex items-center gap-2 rounded-md border border-success/30 bg-success/5 p-2">
          <CheckCircle2 className="h-3.5 w-3.5 text-success" />
          <div className="flex-1">
            <p className="font-semibold">Order #ORD-7F2K9 · paid · ₹13,997</p>
            <p className="text-[9px] text-muted-foreground">3 items unlocked just now</p>
          </div>
        </div>

        {/* Items */}
        <div className="space-y-1.5">
          {[
            { t: "UX Foundations",     d: "Continue lesson 8 of 21",     Icon: Package,  cta: "Continue" },
            { t: "Wireframe Kit (zip)", d: "Download · 12 MB · 1 file",  Icon: Download, cta: "Download" },
            { t: "Studio Member",       d: "Renews 12 Jun 2026",          Icon: Tag,      cta: "Manage" },
            { t: "Portfolio 1:1 — Wed", d: "4 pm · Video call · 60 min", Icon: Calendar, cta: "Join" },
          ].map((i) => (
            <div key={i.t} className="flex items-center gap-2 rounded-md border border-border/60 bg-card p-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">
                <i.Icon className="h-3.5 w-3.5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{i.t}</p>
                <p className="text-[9px] text-muted-foreground">{i.d}</p>
              </div>
              <button className="rounded-md border border-border bg-card px-2 py-0.5 text-[9px] font-semibold hover:bg-muted/40">
                {i.cta}
              </button>
            </div>
          ))}
        </div>

        {/* License key reveal */}
        <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-2">
          <div className="flex items-center gap-1 text-amber-700 dark:text-amber-400">
            <Key className="h-3 w-3" />
            <span className="text-[9px] font-bold uppercase tracking-wide">License key</span>
            <span className="ml-auto text-[9px] text-muted-foreground">1 of 1 activated</span>
          </div>
          <code className="mt-1 block rounded bg-card px-2 py-1 font-mono text-[10px] tracking-widest">
            UXKIT-V42P-7M9N-Q3R8-WZ5K
          </code>
        </div>
      </div>
    </PreviewFrame>
  )
}

// ============================================================
// Mockup #3 — Domain setup
// Browser address bar with custom domain verified + DNS record
// row + before/after subdomain → custom-domain transition.
// ============================================================

function DomainMockup() {
  return (
    <PreviewFrame title="settings › domains">
      <div className="space-y-3 text-[11px]">
        {/* Live URL — custom domain */}
        <div className="overflow-hidden rounded-md border border-border bg-card">
          <div className="flex items-center gap-2 border-b border-border/60 bg-muted/40 px-2 py-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-400/70" />
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400/70" />
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400/70" />
            <span className="ml-2 inline-flex flex-1 items-center gap-1 rounded-full border border-border bg-background px-2 py-1 font-mono text-[9px]">
              <Lock className="h-2.5 w-2.5 text-success" />
              learn.studio-cohort.com
              <ShieldCheck className="ml-auto h-2.5 w-2.5 text-success" />
            </span>
          </div>
          <div className="px-3 py-3 text-center">
            <div className="mx-auto inline-flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-[9px] font-semibold text-success">
              <CheckCircle2 className="h-3 w-3" /> Verified · SSL active · 200 ms
            </div>
            <p className="mt-2 text-[10px] font-semibold">Your students see your domain, not ours.</p>
          </div>
        </div>

        {/* DNS record row */}
        <div className="rounded-md border border-border/60 bg-card p-2">
          <p className="mb-1 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">DNS record to add (one line)</p>
          <div className="grid grid-cols-[60px_1fr_1fr] gap-2 text-[10px]">
            <div className="rounded bg-muted/60 px-1.5 py-1 font-mono">TYPE</div>
            <div className="rounded bg-muted/60 px-1.5 py-1 font-mono">NAME</div>
            <div className="rounded bg-muted/60 px-1.5 py-1 font-mono">VALUE</div>
            <div className="rounded border border-border bg-card px-1.5 py-1 font-mono font-bold">CNAME</div>
            <div className="rounded border border-border bg-card px-1.5 py-1 font-mono">learn</div>
            <div className="rounded border border-border bg-card px-1.5 py-1 font-mono">cname.thebigclass.com</div>
          </div>
        </div>

        {/* Subdomain fallback */}
        <div className="rounded-md border border-border/60 bg-muted/20 p-2">
          <div className="flex items-center gap-2">
            <Globe className="h-3 w-3 text-muted-foreground" />
            <p className="flex-1 font-mono text-[10px] text-muted-foreground">studio-cohort.thebigclass.com</p>
            <span className="rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-semibold text-muted-foreground">Always on</span>
          </div>
          <p className="mt-1 text-[9px] text-muted-foreground">Your subdomain stays alive even after you point a custom domain.</p>
        </div>
      </div>
    </PreviewFrame>
  )
}
