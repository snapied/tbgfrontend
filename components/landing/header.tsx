"use client"

import { useRef, useState } from "react"
import Link from "next/link"
import {
  ArrowRight, Award, BookOpen, Building2, ChevronDown,
  ClipboardList, Code2, Heart, Languages, Menu,
  MessageCircleQuestion, MessageSquare, Newspaper, Palette,
  ShieldCheck, ShoppingBag, Sparkles, Users, UserPlus, Video, X,
} from "lucide-react"
import { Logo } from "@/components/brand/logo"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface NavItem {
  href: string; label: string; body: string
  icon: React.ElementType; chip?: string; chipVariant?: "new" | "live"
  color: string // tailwind classes for icon well bg + text
}
interface MegaSection { title: string; items: NavItem[] }

const PRODUCTS: MegaSection[] = [
  {
    title: "Run the academy",
    items: [
      { href: "/features/live-classes",   icon: Video,                 label: "Live classes",       body: "Cohorts, attendance & auto-recaps",               color: "bg-sky-100 text-sky-600 dark:bg-sky-900/40 dark:text-sky-400" },
      { href: "/features/courses",        icon: BookOpen,              label: "Courses",             body: "Modules, lessons, quizzes, progress",             color: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400" },
      { href: "/features/faculty",        icon: Users,                 label: "Faculty",             body: "Co-teach, multi-tenant, invite by email",         color: "bg-violet-100 text-violet-600 dark:bg-violet-900/40 dark:text-violet-400", chip: "New", chipVariant: "new" },
      { href: "/features/community",      icon: Heart,                 label: "Community",           body: "Wall of Love, leaderboard, announcements",        color: "bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-400" },
    ],
  },
  {
    title: "Sell the work",
    items: [
      { href: "/features/storefront",     icon: ShoppingBag,           label: "Storefront",          body: "8 product kinds under your brand",                color: "bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400" },
      { href: "/features/certificates",   icon: Award,                 label: "Certificates",        body: "17 templates + designer, bulk CSV",               color: "bg-yellow-100 text-yellow-600 dark:bg-yellow-900/40 dark:text-yellow-400" },
      { href: "/template-designer",       icon: Sparkles,              label: "Template Designer",   body: "Try the real editor — no signup",                 color: "bg-fuchsia-100 text-fuchsia-600 dark:bg-fuchsia-900/40 dark:text-fuchsia-400", chip: "Live", chipVariant: "live" },
      { href: "/features/refer-and-earn", icon: UserPlus,              label: "Refer & Earn",        body: "Personal invite links, auto-credited",            color: "bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-400" },
    ],
  },
  {
    title: "Grow the business",
    items: [
      { href: "/features/api",            icon: Code2,                 label: "API & integrations",  body: "Scoped REST keys, free on every plan",            color: "bg-slate-100 text-slate-600 dark:bg-slate-900/40 dark:text-slate-400", chip: "New", chipVariant: "new" },
      { href: "/features/whitelabel",     icon: Palette,               label: "White-label",         body: "Your domain, your name, zero platform badge",     color: "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400", chip: "New", chipVariant: "new" },
      { href: "/features/multilingual",   icon: Languages,             label: "Multilingual portal", body: "EN · HI · TA · ES · FR. Visitor picks.",          color: "bg-teal-100 text-teal-600 dark:bg-teal-900/40 dark:text-teal-400", chip: "New", chipVariant: "new" },
      { href: "/features/doubts",         icon: MessageCircleQuestion, label: "Doubts inbox",        body: "Pre-sale + post-sale, WhatsApp + email",          color: "bg-cyan-100 text-cyan-600 dark:bg-cyan-900/40 dark:text-cyan-400", chip: "New", chipVariant: "new" },
    ],
  },
]

const RESOURCES: MegaSection[] = [
  {
    title: "Learn",
    items: [
      { href: "/use-cases",  icon: Sparkles,     label: "Use cases",    body: "Solo creator · School · College · Corporate · NGO", color: "bg-violet-100 text-violet-600 dark:bg-violet-900/40 dark:text-violet-400" },
      { href: "/guides",     icon: ClipboardList, label: "Guides",      body: "Step-by-step walkthroughs of every feature",       color: "bg-sky-100 text-sky-600 dark:bg-sky-900/40 dark:text-sky-400" },
      { href: "/updates",    icon: Newspaper,    label: "Updates",      body: "What shipped this month",                          color: "bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400" },
    ],
  },
  {
    title: "Trust & support",
    items: [
      { href: "/about",             icon: Building2,    label: "About us",          body: "Built by Divisocial, Dehradun, India",         color: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400" },
      { href: "/legal/privacy",     icon: ShieldCheck,  label: "Privacy & legal",   body: "Privacy, DPA, GDPR & UK representation",      color: "bg-slate-100 text-slate-600 dark:bg-slate-900/40 dark:text-slate-400" },
      { href: "/verify",            icon: Award,        label: "Verify certificate", body: "Public lookup — no account needed",           color: "bg-yellow-100 text-yellow-600 dark:bg-yellow-900/40 dark:text-yellow-400" },
      { href: "mailto:hello@thebigclass.com", icon: MessageSquare, label: "Talk to us", body: "Same-day reply from a human", color: "bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-400" },
    ],
  },
]

// ── Chip ─────────────────────────────────────────────────────
function Chip({ label, variant }: { label: string; variant?: "new" | "live" }) {
  return (
    <span className={cn(
      "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-bold tracking-wide",
      variant === "live"
        ? "bg-emerald-500 text-white"
        : "bg-primary text-primary-foreground",
    )}>
      {variant === "live" && <span className="h-1 w-1 animate-pulse rounded-full bg-white" />}
      {label}
    </span>
  )
}

// ── Single nav item row ───────────────────────────────────────
function NavRow({ item, onClick }: { item: NavItem; onClick?: () => void }) {
  return (
    <Link
      href={item.href}
      onClick={onClick}
      className="group relative flex items-start gap-3 rounded-xl px-3 py-2.5 transition-all duration-150 hover:bg-muted/60"
    >
      {/* Colored left accent on hover */}
      <span className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-primary opacity-0 transition-opacity group-hover:opacity-100" />
      <span className={cn("mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-110", item.color)}>
        <item.icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-semibold text-foreground">{item.label}</span>
          {item.chip && <Chip label={item.chip} variant={item.chipVariant} />}
        </div>
        <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{item.body}</p>
      </div>
      <ArrowRight className="mt-1.5 h-3 w-3 shrink-0 -translate-x-1 text-muted-foreground opacity-0 transition-all duration-150 group-hover:translate-x-0 group-hover:opacity-60" />
    </Link>
  )
}

// ── Products panel ────────────────────────────────────────────
function ProductsPanel({ onClose }: { onClose: () => void }) {
  return (
    <div className="animate-in fade-in slide-in-from-top-2 w-[1020px] overflow-hidden rounded-2xl border border-border bg-card/95 shadow-2xl shadow-black/15 backdrop-blur-xl ring-1 ring-black/5 duration-150">

      {/* Top gradient banner */}
      <div className="relative flex items-center gap-4 overflow-hidden bg-gradient-to-r from-primary via-primary/95 to-violet-600 px-6 py-3.5">
        <div aria-hidden className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute bottom-0 left-1/3 h-20 w-20 rounded-full bg-white/5 blur-2xl" />
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/20">
          <Sparkles className="h-4 w-4 text-white" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold text-white">Everything in one workspace</p>
          <p className="text-[11px] text-white/75">Live classes · Courses · Storefront · Community · Certificates</p>
        </div>
        <Link
          href="/pricing"
          onClick={onClose}
          className="flex shrink-0 items-center gap-1.5 rounded-full bg-white/20 px-3.5 py-1.5 text-[11px] font-semibold text-white backdrop-blur transition-colors hover:bg-white/30"
        >
          See pricing <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {/* 3 columns + spotlight card */}
      <div className="grid grid-cols-[1fr_1fr_1fr_280px]">
        {PRODUCTS.map((section, si) => (
          <div key={section.title} className={cn("py-4 px-3", si < PRODUCTS.length - 1 ? "border-r border-border/60" : "")}>
            <p className="mb-1 px-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">
              {section.title}
            </p>
            {section.items.map((item) => <NavRow key={item.href} item={item} onClick={onClose} />)}
          </div>
        ))}

        {/* Spotlight card — tall right panel */}
        <div className="relative flex flex-col overflow-hidden border-l border-border/60 bg-gradient-to-b from-muted/30 to-muted/10">
          {/* Screenshot image */}
          <div className="relative h-44 overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/features/live-classes.jpg"
              alt="Live class in action"
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/10 to-black/60" />
            <div className="absolute bottom-3 left-3 right-3">
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500 px-2 py-0.5 text-[9px] font-bold text-white">
                <span className="h-1 w-1 animate-pulse rounded-full bg-white" /> LIVE DEMO
              </span>
            </div>
          </div>
          {/* Text */}
          <div className="flex flex-1 flex-col justify-between p-4">
            <div>
              <p className="font-serif text-base font-bold leading-snug text-foreground">
                Launch your academy this afternoon.
              </p>
              <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
                Pick a subdomain, drop in your logo, paste a Meet link — students get an invite the same hour.
              </p>
            </div>
            <div className="mt-4 space-y-2">
              <Button asChild size="sm" className="w-full gap-1.5 text-xs" onClick={onClose}>
                <Link href="/signup">Start free <ArrowRight className="h-3 w-3" /></Link>
              </Button>
              <p className="text-center text-[10px] text-muted-foreground">
                No demo · No sales call · No setup fee
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom image strip */}
      <div className="grid grid-cols-3 gap-3 border-t border-border/60 bg-muted/20 p-3">
        {[
          { img: "/features/courses.jpg",     label: "Courses →",     href: "/features/courses" },
          { img: "/features/community.jpg",   label: "Community →",   href: "/features/community" },
          { img: "/features/storefront.jpg",  label: "Storefront →",  href: "/features/storefront" },
        ].map((c) => (
          <Link
            key={c.href}
            href={c.href}
            onClick={onClose}
            className="group relative h-16 overflow-hidden rounded-xl border border-border/60 shadow-sm"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={c.img} alt={c.label} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
            <p className="absolute bottom-1.5 left-2.5 text-[11px] font-semibold text-white">{c.label}</p>
          </Link>
        ))}
      </div>

      {/* Social proof footer */}
      <div className="flex items-center justify-between border-t border-border/60 bg-muted/10 px-5 py-2.5">
        <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1"><span className="text-amber-500">★★★★★</span> Loved by 1,200+ educators</span>
          <span className="hidden sm:block">·</span>
          <span className="hidden sm:block">Zero commission on revenue</span>
          <span className="hidden sm:block">·</span>
          <span className="hidden sm:block">30-day refund, no fine print</span>
        </div>
        <Link href="/pricing" onClick={onClose} className="text-[11px] font-semibold text-primary hover:underline">
          See plans →
        </Link>
      </div>
    </div>
  )
}

// ── Resources panel ───────────────────────────────────────────
function ResourcesPanel({ onClose }: { onClose: () => void }) {
  return (
    <div className="animate-in fade-in slide-in-from-top-2 w-[680px] overflow-hidden rounded-2xl border border-border bg-card/95 shadow-2xl shadow-black/15 backdrop-blur-xl ring-1 ring-black/5 duration-150">

      {/* Banner */}
      <div className="relative h-28 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/features/courses.jpg" alt="" aria-hidden className="h-full w-full object-cover opacity-70" />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/90 to-background/50" />
        <div className="absolute inset-0 flex items-center px-6">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-primary">Resources</p>
            <p className="font-serif text-xl font-bold text-foreground">Learn · Verify · Connect.</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">Guides, use cases, updates and support</p>
          </div>
        </div>
      </div>

      {/* 2 columns */}
      <div className="grid grid-cols-2 divide-x divide-border/60">
        {RESOURCES.map((section) => (
          <div key={section.title} className="py-4 px-3">
            <p className="mb-1 px-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">
              {section.title}
            </p>
            {section.items.map((item) => <NavRow key={item.href} item={item} onClick={onClose} />)}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-border/60 bg-muted/20 px-5 py-3">
        <p className="text-[11px] text-muted-foreground">
          Questions?{" "}
          <Link href="mailto:hello@thebigclass.com" onClick={onClose} className="font-semibold text-primary hover:underline">
            hello@thebigclass.com
          </Link>
        </p>
        <Link href="/about" onClick={onClose} className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground hover:text-foreground">
          Our story <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  )
}

// ── Header ────────────────────────────────────────────────────
export function Header() {
  const [open, setOpen] = useState<string | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function scheduleClose() {
    closeTimer.current = setTimeout(() => setOpen(null), 150)
  }
  function cancelClose(key?: string) {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    if (key) setOpen(key)
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 lg:px-8">
        <Link href="/" className="inline-flex">
          <Logo size="md" />
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {/* Products */}
          <div
            className="relative"
            onMouseEnter={() => cancelClose("products")}
            onMouseLeave={scheduleClose}
          >
            <button
              type="button"
              onClick={() => setOpen(open === "products" ? null : "products")}
              className={cn(
                "inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                open === "products" ? "bg-muted/60 text-foreground" : "text-muted-foreground hover:bg-muted/40 hover:text-foreground",
              )}
            >
              Products
              <ChevronDown className={cn("h-3.5 w-3.5 transition-transform duration-200", open === "products" && "rotate-180")} />
            </button>
            {open === "products" && (
              <div
                className="fixed left-1/2 top-16 z-50 -translate-x-1/2 pt-2"
                onMouseEnter={() => cancelClose()}
                onMouseLeave={scheduleClose}
              >
                <ProductsPanel onClose={() => setOpen(null)} />
              </div>
            )}
          </div>

          {/* Resources */}
          <div
            className="relative"
            onMouseEnter={() => cancelClose("resources")}
            onMouseLeave={scheduleClose}
          >
            <button
              type="button"
              onClick={() => setOpen(open === "resources" ? null : "resources")}
              className={cn(
                "inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                open === "resources" ? "bg-muted/60 text-foreground" : "text-muted-foreground hover:bg-muted/40 hover:text-foreground",
              )}
            >
              Resources
              <ChevronDown className={cn("h-3.5 w-3.5 transition-transform duration-200", open === "resources" && "rotate-180")} />
            </button>
            {open === "resources" && (
              <div
                className="fixed left-1/2 top-16 z-50 -translate-x-1/2 pt-2"
                onMouseEnter={() => cancelClose()}
                onMouseLeave={scheduleClose}
              >
                <ResourcesPanel onClose={() => setOpen(null)} />
              </div>
            )}
          </div>

          <Link href="/pricing" className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground">
            Pricing
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <Button variant="ghost" asChild className="hidden sm:inline-flex">
            <Link href="/login">Sign in</Link>
          </Button>
          <Button asChild className="hidden sm:inline-flex">
            <Link href="/signup">Launch your academy</Link>
          </Button>
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileOpen(true)} aria-label="Open menu">
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {mobileOpen && <MobileDrawer onClose={() => setMobileOpen(false)} />}
    </header>
  )
}

// ── Mobile drawer ─────────────────────────────────────────────
function MobileDrawer({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 md:hidden">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-[85%] max-w-sm overflow-y-auto bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <Logo size="sm" />
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            <X className="h-5 w-5" />
          </Button>
        </div>
        <div className="p-5 space-y-6">
          <div className="grid grid-cols-2 gap-2">
            <Button asChild size="sm" onClick={onClose}><Link href="/signup">Launch academy</Link></Button>
            <Button asChild size="sm" variant="outline" onClick={onClose}><Link href="/login">Sign in</Link></Button>
          </div>
          {[{ title: "Products", sections: PRODUCTS }, { title: "Resources", sections: RESOURCES }].map(({ title, sections }) => (
            <div key={title}>
              <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{title}</p>
              <ul className="space-y-0.5">
                {sections.flatMap(s => s.items).map(item => (
                  <li key={item.href}>
                    <Link href={item.href} onClick={onClose} className="flex items-center gap-3 rounded-xl px-2 py-2.5 hover:bg-muted/40">
                      <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", item.color)}>
                        <item.icon className="h-3.5 w-3.5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-medium">{item.label}</p>
                          {item.chip && <Chip label={item.chip} variant={item.chipVariant} />}
                        </div>
                        <p className="text-[11px] text-muted-foreground">{item.body}</p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div className="border-t border-border pt-4">
            <Link href="/pricing" onClick={onClose} className="flex items-center justify-between rounded-xl border border-border p-3 text-sm font-semibold hover:bg-muted/40">
              Pricing & plans <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
