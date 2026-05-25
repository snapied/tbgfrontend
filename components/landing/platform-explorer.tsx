"use client"

// PlatformExplorer — tabbed section showing 4 angles of the platform.
// Design: each tab gets ONE full-width hero banner (showing the full
// illustration), then a compact 3-col icon card grid below. No images
// on individual cards — they're too small to show illustrations usefully.
// Every card instead gets a unique colour accent per product type.

import Link from "next/link"
import {
  ArrowRight,
  AtSign,
  BookOpen,
  Briefcase,
  CalendarCheck,
  Code2,
  Download,
  FileText,
  Film,
  Globe,
  Heart,
  Home,
  Inbox,
  Languages,
  Megaphone,
  MessageCircle,
  MessageSquare,
  Palette,
  PenSquare,
  Phone,
  Receipt,
  Sparkles,
  Trophy,
  UserPlus,
  Users,
  Video,
  Wallet,
  Zap,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

// Card accent colours — each product type gets its own hue so the grid
// has instant visual variety without needing photos.
type AccentKey =
  | "coral" | "teal" | "violet" | "amber" | "sky" | "emerald"
  | "rose"  | "indigo" | "fuchsia" | "orange" | "cyan" | "lime"

const ACCENT_CLASSES: Record<AccentKey, { bg: string; text: string; ring: string }> = {
  coral:   { bg: "bg-rose-50 dark:bg-rose-950/40",    text: "text-rose-600 dark:text-rose-400",    ring: "ring-rose-200/60 dark:ring-rose-800/40" },
  teal:    { bg: "bg-teal-50 dark:bg-teal-950/40",    text: "text-teal-600 dark:text-teal-400",    ring: "ring-teal-200/60 dark:ring-teal-800/40" },
  violet:  { bg: "bg-violet-50 dark:bg-violet-950/40",text: "text-violet-600 dark:text-violet-400",ring: "ring-violet-200/60 dark:ring-violet-800/40" },
  amber:   { bg: "bg-amber-50 dark:bg-amber-950/40",  text: "text-amber-600 dark:text-amber-400",  ring: "ring-amber-200/60 dark:ring-amber-800/40" },
  sky:     { bg: "bg-sky-50 dark:bg-sky-950/40",      text: "text-sky-600 dark:text-sky-400",      ring: "ring-sky-200/60 dark:ring-sky-800/40" },
  emerald: { bg: "bg-emerald-50 dark:bg-emerald-950/40",text:"text-emerald-600 dark:text-emerald-400",ring:"ring-emerald-200/60 dark:ring-emerald-800/40" },
  rose:    { bg: "bg-pink-50 dark:bg-pink-950/40",    text: "text-pink-600 dark:text-pink-400",    ring: "ring-pink-200/60 dark:ring-pink-800/40" },
  indigo:  { bg: "bg-indigo-50 dark:bg-indigo-950/40",text:"text-indigo-600 dark:text-indigo-400",ring:"ring-indigo-200/60 dark:ring-indigo-800/40" },
  fuchsia: { bg: "bg-fuchsia-50 dark:bg-fuchsia-950/40",text:"text-fuchsia-600 dark:text-fuchsia-400",ring:"ring-fuchsia-200/60 dark:ring-fuchsia-800/40" },
  orange:  { bg: "bg-orange-50 dark:bg-orange-950/40",text:"text-orange-600 dark:text-orange-400",ring:"ring-orange-200/60 dark:ring-orange-800/40" },
  cyan:    { bg: "bg-cyan-50 dark:bg-cyan-950/40",    text: "text-cyan-600 dark:text-cyan-400",    ring: "ring-cyan-200/60 dark:ring-cyan-800/40" },
  lime:    { bg: "bg-lime-50 dark:bg-lime-950/40",    text: "text-lime-600 dark:text-lime-400",    ring: "ring-lime-200/60 dark:ring-lime-800/40" },
}

interface ExplorerCard {
  icon: React.ElementType
  title: string
  body: string
  href?: string
  badges?: string[]
  accent: AccentKey
}

interface TabDef {
  value: string
  label: string
  hero: string            // full-width banner image (shown in full, no crop)
  heroAlt: string
  heroCaption: string
  cards: ExplorerCard[]
  cta: { href: string; label: string }
}

const TABS: TabDef[] = [
  {
    value: "products",
    label: "Products",
    hero: "/tab_products.png",
    heroAlt: "Six product types you can sell on The Big Class",
    heroCaption: "Sell 6 kinds of products — all under your own brand.",
    cta: { href: "/features/storefront", label: "See the storefront in detail" },
    cards: [
      { icon: Video,         title: "Live cohorts",       body: "Live sessions with attendance, recordings, and roll-call. Built-in room or paste your own.",       href: "/features/live-classes", badges: ["Built-in room", "Attendance"],  accent: "coral" },
      { icon: BookOpen,      title: "Self-paced courses", body: "Modules + lessons + 18 ready-to-fire quiz templates (JEE / NEET / GMAT / K-12). Drip + auto-grade.", href: "/features/courses",       badges: ["18 quiz templates", "Auto Graded"], accent: "teal" },
      { icon: CalendarCheck, title: "Coaching sessions",  body: "1-on-1 bookings on your calendar. UPI checkout, automated reminders.",          href: "/features/coaching",      badges: ["Calendar Sync", "1-on-1"],      accent: "violet" },
      { icon: Trophy,        title: "Memberships",        body: "Recurring revenue + a private library + community for paying members.",          href: "/features/memberships",   badges: ["Recurring Plans", "Batches"],   accent: "amber" },
      { icon: Download,      title: "Digital downloads",  body: "Sell PDFs, templates, slide decks, doc files — one-time price, instant delivery.",         href: "/features/downloads",     badges: ["Instant Access", "Any Format"], accent: "sky" },
      { icon: Briefcase,     title: "Bundles",            body: "Package a course + workshop + downloads at a single bundled price.",             href: "/features/bundles",       badges: ["Multi-product", "Discounts"],   accent: "emerald" },
    ],
  },
  {
    value: "portal",
    label: "Your portal",
    hero: "/tab_portal.png",
    heroAlt: "The Big Class portal builder with drag-and-drop, brand colors, and testimonials",
    heroCaption: "Every surface yours — colours, fonts, pages, testimonials, and your own domain.",
    cta: { href: "/features/whitelabel", label: "Read the white-label brief" },
    cards: [
      { icon: Home,      title: "Home page",     body: "Hero, sections, CTAs — drag to reorder, swap content, ship.",          href: "/dashboard/portal/home",          badges: ["Visual Customizer", "Drag & Drop"], accent: "violet" },
      { icon: FileText,  title: "Pages",         body: "Add About, FAQ, contact — unlimited pages, all SEO-tuned.",            href: "/dashboard/portal/pages",         badges: ["SEO Tuned", "Unlimited"],          accent: "sky" },
      { icon: Palette,   title: "Brand",         body: "Logo, colours, fonts, dark mode. Every surface inherits.",             href: "/dashboard/portal/brand",         badges: ["Custom Domain", "Dark Mode"],      accent: "fuchsia" },
      { icon: Heart,     title: "Testimonials",  body: "Wall of Love — quotes with photos, video, star ratings.",              href: "/dashboard/portal/testimonials",  badges: ["Wall of Love", "Social Proof"],    accent: "rose" },
      { icon: Megaphone, title: "Announcements", body: "Banner across the portal — sale ending, class moved, new batch.",      href: "/dashboard/portal/announcements", badges: ["Global Banner", "CTA Trigger"],    accent: "orange" },
      { icon: Inbox,     title: "Lead inbox",    body: "Enquiries from your public pages land here — sorted, taggable.",       href: "/dashboard/portal/leads",         badges: ["Lead CRM", "Exportable"],          accent: "teal" },
    ],
  },
  {
    value: "india",
    label: "Made for India",
    hero: "/tab_india.png",
    heroAlt: "UPI payment success, WhatsApp notification, GST invoice, and Hindi language selector",
    heroCaption: "UPI checkout, WhatsApp alerts, GST invoices, and 12+ Indian languages — built in.",
    cta: { href: "/features/multilingual", label: "See the India-first stack" },
    cards: [
      { icon: Wallet,        title: "UPI checkout",  body: "UPI-first checkout via your own payment-gateway account. Zero friction for Indian students.", href: "/features/checkout",     badges: ["UPI & Netbanking", "Zero Setup"],       accent: "amber" },
      { icon: Phone,         title: "WhatsApp",      body: "Class reminders, certificate links, doubt responses — all on WhatsApp.",    href: "/features/whatsapp",     badges: ["99% Open Rate", "Auto Alerts"],         accent: "emerald" },
      { icon: Languages,     title: "Multilingual",  body: "Portal speaks Hindi, Tamil, Bengali, Marathi — your students choose.",      href: "/features/multilingual", badges: ["12+ Local Languages"],                  accent: "indigo" },
      { icon: Receipt,       title: "GST invoices",  body: "GST-compliant invoices auto-issued for every payment, downloadable.",       href: "/features/gst",          badges: ["B2B & B2C GST"],                        accent: "orange" },
      { icon: MessageSquare, title: "IST support",   body: "We answer in IST hours, in plain English + Hindi.",                        href: "/help",                  badges: ["Chat & Call", "Hindi/English"],         accent: "rose" },
      { icon: Globe,         title: "India hosting", body: "Mumbai-region by default. Sub-100ms reads for Indian visitors.",            href: "/features/hosting",      badges: ["Mumbai Servers", "Ultra Low Latency"],  accent: "cyan" },
    ],
  },
  {
    value: "wedges",
    label: "New wedges",
    hero: "/tab_wedges.png",
    heroAlt: "REST API keys, webhook logs, white-label logo switcher, and faculty profile cards",
    heroCaption: "The capabilities no other Indian edtech platform ships — API, white-label, doubts, faculty showcase.",
    cta: { href: "/features", label: "Browse all features" },
    cards: [
      { icon: Code2,         title: "Public API",          body: "Scoped REST keys, transparent rate limits, free on every plan.",            href: "/features/api",          badges: ["REST Keys", "Webhooks"],             accent: "indigo" },
      { icon: Sparkles,      title: "White-label",         body: "No 'powered by' line — on every plan, not just the top tier.",              href: "/features/whitelabel",   badges: ["Custom Domain", "White Label"],      accent: "violet" },
      { icon: Languages,     title: "Multilingual portal", body: "Translate your portal end-to-end. Real-time language switcher.",            href: "/features/multilingual", badges: ["Translate End-to-End"],              accent: "cyan" },
      { icon: MessageCircle, title: "Doubts inbox",        body: "Student questions + pre-sale enquiries in one inbox. Sub-2h on P0.",        href: "/features/doubts",       badges: ["Inline Student Doubts", "Inbox Sync"],accent: "teal" },
      { icon: UserPlus, title: "Faculty showcase", body: "Profile pages for every co-teacher. Public team page, free.", href: "/features/faculty", badges: ["Co-Instructor Pages", "Bio Showcase"], accent: "emerald" },
      { icon: Users,         title: "Community spaces",    body: "Per-batch Common Room — posts, threads, reactions, pinning.",               href: "/features/community",    badges: ["Common Room", "Posts & Threads"],    accent: "lime" },
    ],
  },
  {
    value: "shipped",
    label: "Shipped recently",
    hero: "/tab_wedges.png",
    heroAlt: "Cloud live room, recording library, unified inbox, whiteboard, real-time updates",
    heroCaption: "The most-recent shipped surfaces — cloud live room, recordings, unified inbox, multiplayer whiteboard, cross-channel notifications.",
    cta: { href: "/whats-new", label: "See the full changelog" },
    cards: [
      { icon: Video,         title: "Cloud live room",     body: "Built-in LiveKit room — no third-party signup, students join with a name. Adaptive 1080p.",   href: "/features/live-classes", badges: ["No Signup", "1080p Adaptive"],       accent: "coral" },
      { icon: Film,          title: "Cloud recording",     body: "Server-side recording uploads straight to your CDN. Auto-email when ready.",            href: "/features/recordings",   badges: ["LiveKit Egress", "Direct to R2"],     accent: "rose" },
      { icon: Inbox,         title: "Unified Inbox",       body: "Doubts, discussions, leads, batch posts in one feed. Reply inline across channels.",   href: "/features/inbox",        badges: ["Cross-channel reply"],                accent: "violet" },
      { icon: PenSquare,     title: "Whiteboard · 25+ templates", body: "Multi-cursor canvas with K-12 grade-band scaffolds, brainstorms, SWOT, mind maps.", href: "/features/whiteboard",   badges: ["25+ templates", "Multi-cursor"],      accent: "amber" },
      { icon: Zap,           title: "Real-time updates",   body: "Mentions, post broadcasts, lead alerts — fan out in-app + email + WhatsApp instantly.", href: "/features/realtime",     badges: ["In-app · Email · WhatsApp"],          accent: "fuchsia" },
      { icon: AtSign,        title: "Cohort community",    body: "Per-batch room with @-mentions, file previews, post editing. Chat-grade, course-scoped.", href: "/features/community",    badges: ["@-mentions", "File previews"],        accent: "emerald" },
    ],
  },
]

export function PlatformExplorer() {
  return (
    <section className="relative overflow-hidden border-y border-border bg-gradient-to-b from-background via-secondary/30 to-background py-20">
      {/* Ambient blooms */}
      <div aria-hidden className="pointer-events-none absolute -left-24 top-12 h-72 w-72 rounded-full bg-primary/[0.08] blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -right-24 bottom-20 h-80 w-80 rounded-full bg-accent/[0.08] blur-3xl" />

      <div className="relative mx-auto max-w-6xl px-6 lg:px-8">
        {/* Section heading */}
        <div className="mx-auto max-w-3xl text-center">
          <Badge variant="outline" className="mb-4 border-primary/30 bg-primary/[0.05] text-primary">
            <Sparkles className="mr-1 h-3 w-3" />
            Explore the platform
          </Badge>
          <h2 className="font-serif text-4xl font-bold tracking-tight sm:text-5xl">
            One workspace. Every surface{" "}
            <span className="text-primary">yours to shape</span>.
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
            Four angles on the same platform — sell anything, brand everything, ship in India, and cover the wedges no one else has.
          </p>
        </div>

        <Tabs defaultValue="products" className="mt-12">
          <TabsList className="mx-auto grid h-auto w-full max-w-3xl grid-cols-2 sm:grid-cols-5">
            {TABS.map((t) => (
              <TabsTrigger key={t.value} value={t.value} className="py-2.5 text-sm font-medium">
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {TABS.map((tab) => (
            <TabsContent key={tab.value} value={tab.value} className="mt-8 focus-visible:outline-none">
              {/* ── Full-width hero banner — shown complete, no cropping ── */}


              {/* ── Card grid — icon-only, unique colour per card ── */}
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {tab.cards.map((card, i) => (
                  <ExplorerTile key={card.title} card={card} delay={i * 40} />
                ))}
              </div>

              {/* CTA */}
              <div className="mt-8 flex justify-center">
                <Button asChild variant="outline" size="lg">
                  <Link href={tab.cta.href}>
                    {tab.cta.label}
                    <ArrowRight className="ml-1.5 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </section>
  )
}

function ExplorerTile({ card, delay }: { card: ExplorerCard; delay: number }) {
  const Icon = card.icon
  const accent = ACCENT_CLASSES[card.accent]

  const inner = (
    <div
      className="group relative flex h-full flex-col gap-3 overflow-hidden rounded-xl border border-border/70 bg-card/80 p-5 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-lg"
      style={{ animation: `explorerIn 0.45s ease-out ${delay}ms both` }}
    >
      {/* Unique colour icon pill */}
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ${accent.bg} ${accent.text} ${accent.ring} transition-transform duration-300 group-hover:scale-110`}>
        <Icon className="h-5 w-5" />
      </div>

      <div className="flex-1 space-y-1">
        <h3 className="font-semibold leading-snug text-foreground transition-colors group-hover:text-primary">
          {card.title}
        </h3>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {card.body}
        </p>
      </div>

      {/* Micro-badges */}
      {card.badges && card.badges.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {card.badges.map((badge) => (
            <span
              key={badge}
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ${accent.bg} ${accent.text} ${accent.ring}`}
            >
              {badge}
            </span>
          ))}
        </div>
      )}

      {card.href && (
        <div className="flex items-center gap-1 text-xs font-semibold text-primary opacity-0 transition-all duration-200 group-hover:opacity-100 group-hover:gap-1.5">
          <span>Learn more</span>
          <ArrowRight className="h-3 w-3" />
        </div>
      )}
    </div>
  )

  if (card.href) {
    return (
      <Link href={card.href} className="block h-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xl">
        {inner}
      </Link>
    )
  }
  return inner
}

// Keyframes — staggered fade-in.
const _styles = (
  <style suppressHydrationWarning>{`
    @keyframes explorerIn {
      0%   { opacity: 0; transform: translateY(10px); }
      100% { opacity: 1; transform: translateY(0); }
    }
  `}</style>
)
void _styles
