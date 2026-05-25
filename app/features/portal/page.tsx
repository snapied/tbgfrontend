// Feature page — Public portal (the customer-facing site each
// tenant gets out-of-the-box).
//
// This is the single most under-sold capability on the platform.
// Every workspace ships a real, themable, SEO-grade public site at
// the creator's URL — page builder, 14 section types, 8 themes,
// custom domain, white-label, blog, faculty showcase, Wall of Love.
//
// This page treats the portal as a flagship product story, with
// real screenshots / mockups of the components that ship.

import type { Metadata } from "next"
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Globe2,
  Image as ImageIcon,
  LayoutDashboard,
  MessageSquare,
  Palette,
  Search,
  ShoppingBag,
  Sparkles,
  Type,
  Users,
} from "lucide-react"
import { Header } from "@/components/landing/header"
import { Footer } from "@/components/landing/footer"
import {
  FeatureCTA,
  FeaturePageShell,
  FeatureSplit,
  PreviewFrame,
} from "@/components/landing/feature-page"

const SITE_URL = "https://thebigclass.com"
const PAGE_PATH = "/features/portal"

export const metadata: Metadata = {
  title: "Your audience · your URL · your brand · The Big Class",
  description:
    "Every workspace ships a public portal — page builder, 14 section types, 8 theme presets, custom domain, white-label, real blog, faculty showcase. Your audience lives on your URL, not someone else's platform.",
  alternates: { canonical: `${SITE_URL}${PAGE_PATH}` },
  openGraph: {
    title: "Your audience · your URL · your brand",
    description:
      "A real public site for every creator — page builder, custom domain, full SEO, real blog, white-label.",
    url: `${SITE_URL}${PAGE_PATH}`,
  },
}

// ── Real shipped section types (mirrors lib/portal-store.tsx) ──
//
// Listing the actual 14 reorderable section names keeps this page
// honest. If a section gets added or renamed in the store, this
// list goes stale and a reader notices.
const SECTION_TYPES = [
  { icon: Sparkles, name: "Hero", body: "Headline, subhead, dual CTA, bg image, trust stats" },
  { icon: LayoutDashboard, name: "Features", body: "3+ column grid of titled points with icons" },
  { icon: BookOpen, name: "Courses grid", body: "Cards with ratings, price, early-bird countdown, enrollees" },
  { icon: ShoppingBag, name: "Store grid", body: "Sessions · memberships · downloads · webinars · licenses · bundles" },
  { icon: MessageSquare, name: "Testimonials", body: "Quotes with rating stars + avatar + featured subset" },
  { icon: Users, name: "Faculty", body: "Team cards with photos, bios, social links, course listings" },
  { icon: Type, name: "Rich text", body: "Free-form WYSIWYG editor for any custom copy" },
  { icon: MessageSquare, name: "FAQ", body: "Expandable Q&A pairs — search engines eat these for breakfast" },
  { icon: Sparkles, name: "Stats", body: "By-the-numbers row — student count, reviews, outcomes" },
  { icon: MessageSquare, name: "Contact form", body: "Lead capture with custom fields, feeds your inbox" },
  { icon: BookOpen, name: "Blog teaser", body: "Latest posts preview — links into the full blog" },
  { icon: ImageIcon, name: "Video", body: "Embedded YouTube · Vimeo · MP4 with responsive sizing" },
  { icon: ImageIcon, name: "Image gallery", body: "Photo grid for events, work samples, behind-the-scenes" },
  { icon: CheckCircle2, name: "Trust badges", body: "Configurable icons — secure payment, refund window, support SLA" },
]

// ── 6 + 6 layout presets ──
const HEADER_PRESETS = [
  "Split classic", "Centered minimal", "Split with CTA",
  "Logo only", "Floating pill", "Promo marquee",
]
const FOOTER_PRESETS = [
  "Multi-column", "Compact mono", "Newsletter CTA",
  "Brand + contact", "Centered tight", "Card grid",
]

// ── 8 theme presets ──
const THEMES = [
  { name: "Classic Academy", chips: ["#0f766e", "#fef3c7"] },
  { name: "Forest Modern", chips: ["#14532d", "#fef9c3"] },
  { name: "Midnight Coral", chips: ["#1e1b4b", "#fda4af"] },
  { name: "Warm Mono", chips: ["#27272a", "#f5f5f4"] },
  { name: "Ocean Fresh", chips: ["#0c4a6e", "#bae6fd"] },
  { name: "Royal Bold", chips: ["#6b21a8", "#fde047"] },
  { name: "Sunset Warm", chips: ["#9a3412", "#fed7aa"] },
  { name: "Mono Minimal", chips: ["#171717", "#fafafa"] },
]

export default function PortalFeaturePage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1">
        <FeaturePageShell
          eyebrow="Public portal · your audience hub"
          title={
            <>
              Your audience{" "}
              <span className="text-primary">doesn&rsquo;t live on someone else&rsquo;s platform.</span>
            </>
          }
          subtitle="Every workspace ships a real public site — page builder, 14 section types, 8 themes, custom domain, a full blog, faculty showcase, and a Wall of Love. Drop it on your own URL. Strip every trace of platform branding. Done."
        >
          {/* The story: portal in 30 seconds */}
          <FeatureSplit
            title="Live in 30 seconds. Live at your URL forever."
            body={
              <>
                Type your brand name into the subdomain claim and you&rsquo;re on
                <code className="mx-1 rounded bg-muted px-1.5 py-0.5 font-mono text-[12px]">
                  yourbrand.thebigclass.com
                </code>
                the next second. Point a CNAME at it whenever you&rsquo;re ready and your
                portal moves to your own domain — same workspace, same data, just the URL changes.
              </>
            }
            bullets={[
              "Free subdomain on day one — your-brand.thebigclass.com",
              "Custom domain via CNAME on Pro+ (e.g. learn.yourdomain.com)",
              "White-label toggles strip the 'Powered by' badge",
              "Same portal works for solo creators and 50-staff academies",
            ]}
            mockup={
              <PreviewFrame title="ananya.com">
                <PortalPreviewMockup />
              </PreviewFrame>
            }
          />

          {/* 14 section types */}
          <section className="border-y border-border/60 bg-muted/20 py-20">
            <div className="mx-auto max-w-6xl px-6 lg:px-8">
              <div className="mx-auto max-w-2xl text-center">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
                  Page builder · 14 section types
                </p>
                <h2 className="mt-3 text-balance text-3xl font-bold tracking-tight sm:text-4xl">
                  Real sections. Drag to reorder. Show/hide per page.
                </h2>
                <p className="mt-3 text-muted-foreground">
                  No code. No theme-template lock-in. Compose pages out of the same 14 pieces every creator on the platform uses.
                </p>
              </div>
              <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {SECTION_TYPES.map((s) => (
                  <div
                    key={s.name}
                    className="flex items-start gap-3 rounded-xl border border-border bg-card p-4"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <s.icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-bold">{s.name}</p>
                      <p className="text-[12px] leading-relaxed text-muted-foreground">
                        {s.body}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Themes + layouts */}
          <FeatureSplit
            reverse
            title="Eight themes. Six header layouts. Six footer layouts."
            body={
              <>
                Pick a theme, swap your fonts, drop in your logo. The portal renders the
                full site — store, courses, blog, faculty, FAQ — in your colors with no
                further design lift. When you outgrow the presets, Pro+ exposes custom CSS
                scoped to your tenant.
              </>
            }
            bullets={[
              "8 curated theme presets — designed, not auto-palettes",
              "6 header layouts (split / centered / floating pill / promo marquee / logo-only / split-with-CTA)",
              "6 footer layouts (multi-column / compact / newsletter / brand+contact / centered / card grid)",
              "Custom Google Font picker — Playfair, Inter, Manrope, Fraunces, Cinzel, more",
              "Per-tenant custom CSS — your design system, scoped to your portal",
            ]}
            mockup={
              <div className="space-y-4">
                <div className="grid grid-cols-4 gap-2">
                  {THEMES.map((t) => (
                    <div
                      key={t.name}
                      className="rounded-lg border border-border bg-card p-2"
                    >
                      <div className="flex h-10 overflow-hidden rounded">
                        <span
                          className="flex-1"
                          style={{ backgroundColor: t.chips[0] }}
                        />
                        <span
                          className="flex-1"
                          style={{ backgroundColor: t.chips[1] }}
                        />
                      </div>
                      <p className="mt-1 text-[10px] font-semibold leading-tight">
                        {t.name}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="rounded-xl border border-border bg-card p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Header layouts
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {HEADER_PRESETS.map((h) => (
                      <span
                        key={h}
                        className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold"
                      >
                        {h}
                      </span>
                    ))}
                  </div>
                  <p className="mt-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Footer layouts
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {FOOTER_PRESETS.map((f) => (
                      <span
                        key={f}
                        className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold"
                      >
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            }
          />

          {/* SEO controls */}
          <FeatureSplit
            title="SEO that doesn't need a plugin."
            body={
              <>
                Per-page meta title and description. Per-page Open Graph image. JSON-LD
                schema (Course · BlogPosting · Organization · BreadcrumbList) wired in
                automatically. Sitemap and robots generated. The same level of control a
                Webflow site gives you — without leaving the dashboard.
              </>
            }
            bullets={[
              "Per-page meta title + description override",
              "Per-page Open Graph image (or auto-generated from the title)",
              "JSON-LD per content type — Course, BlogPosting, Organization, BreadcrumbList",
              "sitemap.xml + robots.txt auto-generated, every published page indexed",
              "noindex toggle per page when you need to hide a draft URL",
              "Per-tenant default OG image — generated by OgImageGenerator if you skip it",
            ]}
            mockup={
              <PreviewFrame title="SEO panel — Calculus 1">
                <div className="space-y-2.5 text-sm">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Meta title
                    </p>
                    <div className="mt-1 rounded-md border border-border bg-background px-2.5 py-1.5 text-[12px]">
                      Calculus 1 · 12-week live cohort · Ananya Iyer
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Description
                    </p>
                    <div className="mt-1 rounded-md border border-border bg-background px-2.5 py-1.5 text-[12px]">
                      Crack JEE-advanced calculus in 12 weeks. Live cohort + recordings + weekly office hours.
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Schema
                    </p>
                    <div className="mt-1 inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-[11px] font-bold text-primary">
                      <CheckCircle2 className="h-3 w-3" /> Course JSON-LD wired
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      OG image
                    </p>
                    <div className="mt-1 aspect-[1.91/1] w-full rounded-md bg-gradient-to-br from-primary to-emerald-700" />
                  </div>
                </div>
              </PreviewFrame>
            }
          />

          {/* White-label */}
          <FeatureSplit
            reverse
            title="Strip every trace of us."
            body={
              <>
                On Pro+ the white-label toggles remove the &ldquo;Powered by The Big
                Class&rdquo; line in the footer plus every other platform-branded element
                across emails, share previews, and error pages. Visitors see your brand —
                only.
              </>
            }
            bullets={[
              "Hide 'Powered by' badge in the footer",
              "Hide all platform-branded elements site-wide (one toggle)",
              "Custom domain — your visitors never see thebigclass.com in the URL",
              "Per-tenant CSS for the last 5% of customization",
            ]}
            mockup={
              <PreviewFrame title="Brand · Advanced">
                <div className="space-y-3">
                  {[
                    { label: "Hide 'Powered by' badge", on: true },
                    { label: "Hide every platform-branded element", on: true },
                    { label: "Custom CSS enabled", on: true },
                    { label: "Default OG image override", on: false },
                  ].map((t) => (
                    <div
                      key={t.label}
                      className="flex items-center justify-between rounded-md border border-border bg-card px-3 py-2 text-sm"
                    >
                      <span className="font-semibold">{t.label}</span>
                      <span
                        className={`flex h-5 w-9 items-center rounded-full px-0.5 ${
                          t.on ? "justify-end bg-primary" : "justify-start bg-muted"
                        }`}
                      >
                        <span className="h-4 w-4 rounded-full bg-background" />
                      </span>
                    </div>
                  ))}
                </div>
              </PreviewFrame>
            }
          />

          {/* Blog + faculty + Wall of Love callout */}
          <section className="py-20">
            <div className="mx-auto max-w-6xl px-6 lg:px-8">
              <div className="grid gap-6 lg:grid-cols-3">
                {[
                  {
                    icon: BookOpen,
                    title: "A real blog",
                    body: "Scheduling, tags, comments, reactions, related posts, lead capture, per-post SEO. Not just a Markdown dump.",
                    href: "/features/blog",
                    cta: "See the blog feature",
                  },
                  {
                    icon: Users,
                    title: "Faculty showcase",
                    body: "Team cards with photos, bios, social links, expertise tags, course listings, individual profiles at /teachers/<handle>.",
                    href: "/features/faculty",
                    cta: "See faculty",
                  },
                  {
                    icon: Sparkles,
                    title: "Wall of Love",
                    body: "Testimonials with rating stars, moderation, auto-import from 5-star reviews, emoji reactions, instructor attribution.",
                    href: "/wall",
                    cta: "See a Wall of Love",
                  },
                ].map((b) => (
                  <div
                    key={b.title}
                    className="rounded-2xl border border-border bg-card p-6"
                  >
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <b.icon className="h-5 w-5" />
                    </span>
                    <p className="mt-4 text-lg font-bold">{b.title}</p>
                    <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                      {b.body}
                    </p>
                    <a
                      href={b.href}
                      className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
                    >
                      {b.cta}
                      <ArrowRight className="h-3.5 w-3.5" />
                    </a>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Comparison */}
          <section className="border-t border-border/60 bg-muted/20 py-20">
            <div className="mx-auto max-w-4xl px-6 lg:px-8">
              <h2 className="text-balance text-2xl font-bold tracking-tight sm:text-3xl">
                Why not just build a Webflow site separately?
              </h2>
              <p className="mt-3 text-muted-foreground">
                You can. Most creators end up regretting it. Here&rsquo;s why.
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {[
                  {
                    name: "A separate site (Webflow / Framer / WordPress)",
                    issue:
                      "Two CMSes (theirs + yours), two billing systems, two member tables, two SEO surfaces. Every product launch is two updates.",
                  },
                  {
                    name: "A link-tree page",
                    issue:
                      "No brand. No SEO. Cap of 10 links. Your audience never lands at your URL — they land at someone else's.",
                  },
                  {
                    name: "Notion as a public site",
                    issue:
                      "Slow. Bad SEO. No real blog. No checkout. Custom domain costs extra. Not built for a buying audience.",
                  },
                  {
                    name: "A custom Next.js / WordPress build",
                    issue:
                      "Year-one cost dwarfs the SaaS bill. Every checkout / blog / cohort feature is a new engineering ticket. You hired a creator team, not a CTO.",
                  },
                ].map((a) => (
                  <div key={a.name} className="rounded-lg border border-border bg-card p-4">
                    <p className="text-sm font-bold">{a.name}</p>
                    <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                      {a.issue}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <FeatureCTA
            title="Your audience belongs at your URL."
            body="Claim your subdomain in 30 seconds. CNAME to your own domain whenever you're ready. White-label and full SEO on every plan."
          />
        </FeaturePageShell>
      </main>
      <Footer />
    </div>
  )
}

// ─── Portal preview mockup ───────────────────────────────────────

function PortalPreviewMockup() {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-background">
      {/* Hero */}
      <div className="bg-gradient-to-b from-primary/10 to-background px-5 py-5">
        <div className="flex items-center justify-between">
          <span className="flex h-6 w-6 items-center justify-center rounded bg-primary/20 text-[10px] font-bold text-primary">
            A
          </span>
          <div className="flex gap-3 text-[10px] font-semibold text-muted-foreground">
            <span>Courses</span>
            <span>Cohorts</span>
            <span>Blog</span>
            <span>Contact</span>
          </div>
        </div>
        <p className="mt-3 text-[10px] font-bold uppercase tracking-wider text-primary">
          Ananya · Maths for engineers
        </p>
        <p className="mt-1 font-serif text-lg font-black leading-tight">
          Crack JEE Advanced without losing your weekends.
        </p>
        <div className="mt-2 flex gap-2">
          <span className="rounded-md bg-primary px-2 py-1 text-[10px] font-bold text-primary-foreground">
            Join Cohort 04
          </span>
          <span className="rounded-md border border-border px-2 py-1 text-[10px] font-semibold">
            Watch a sample
          </span>
        </div>
      </div>
      {/* Courses grid */}
      <div className="border-t border-border/60 px-5 py-3">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          Featured courses
        </p>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {[
            { title: "Calculus crash", color: "bg-primary/20" },
            { title: "Vectors deep", color: "bg-rose-500/20" },
            { title: "Trig in 5 days", color: "bg-amber-500/20" },
          ].map((c) => (
            <div key={c.title} className="rounded border border-border bg-background p-1.5">
              <div className={`aspect-video rounded ${c.color}`} />
              <p className="mt-1 truncate text-[9px] font-semibold">{c.title}</p>
            </div>
          ))}
        </div>
      </div>
      {/* Wall of Love teaser */}
      <div className="border-t border-border/60 px-5 py-3">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Wall of Love
          </p>
          <Search className="h-3 w-3 text-muted-foreground" />
        </div>
        <div className="mt-2 space-y-1.5">
          {[
            "★★★★★ Cleared JEE — Anika",
            "★★★★★ Better than my coaching — Vivek",
          ].map((q) => (
            <div
              key={q}
              className="truncate rounded bg-muted/40 px-2 py-1 text-[9px] font-medium"
            >
              {q}
            </div>
          ))}
        </div>
      </div>
      {/* Footer */}
      <div className="flex items-center justify-between border-t border-border/60 bg-muted/30 px-5 py-2">
        <p className="text-[8px] text-muted-foreground">© Ananya · Made on her own URL.</p>
        <span className="flex items-center gap-1 text-[8px] text-muted-foreground">
          <Globe2 className="h-2.5 w-2.5" />
          ananya.com
        </span>
      </div>
    </div>
  )
}

// Suppress lint on icons reserved for variants.
void Palette
