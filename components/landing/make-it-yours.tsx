"use client"

// "Make every surface yours" — homepage section that shows the nine
// editable surfaces of the customer portal as mini SVG illustrations.
//
// Why this section earns a spot
// -----------------------------
// A common buyer fear is "I'll be locked into the platform's
// look." Listing nine separately-editable surfaces — each with a
// recognisable little visual — answers that fear by showing the
// shape and breadth of the customisation surface area without
// needing the visitor to dig through screenshots.
//
// Each card is a real route in /dashboard/portal/* so the labels
// double as a sitemap for the customisation toolkit.

import Link from "next/link"
import { ArrowRight, Sparkles } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

interface Surface {
  title: string
  body: string
  href: string
  illustration: React.ReactNode
}

const SURFACES: Surface[] = [
  {
    title: "Home page",
    body: "Hero, sections, CTAs — drag to reorder, swap content, ship.",
    href: "/dashboard/portal/home",
    illustration: <HomePageIllustration />,
  },
  {
    title: "Pages",
    body: "Add as many as you want — About, FAQ, contact — your sitemap.",
    href: "/dashboard/portal/pages",
    illustration: <PagesIllustration />,
  },
  {
    title: "Brand",
    body: "Logo, colours, fonts, dark mode. Every surface inherits.",
    href: "/dashboard/portal/brand",
    illustration: <BrandIllustration />,
  },
  {
    title: "Public profile",
    body: "Your founder card — photo, story, links, social proof.",
    href: "/dashboard/portal/profile",
    illustration: <ProfileIllustration />,
  },
  {
    title: "Testimonials",
    body: "Wall of Love — quotes with photos, video, star ratings.",
    href: "/dashboard/portal/testimonials",
    illustration: <TestimonialsIllustration />,
  },
  {
    title: "Blog",
    body: "First-class blog. SEO meta, OG cards, RSS — done for you.",
    href: "/dashboard/portal/blog",
    illustration: <BlogIllustration />,
  },
  {
    title: "Announcements",
    body: "Banner across the portal — sale ending, class moved, new batch.",
    href: "/dashboard/portal/announcements",
    illustration: <AnnouncementsIllustration />,
  },
  {
    title: "Lead inbox",
    body: "Enquiries from your public pages land here, sorted, taggable.",
    href: "/dashboard/portal/leads",
    illustration: <LeadInboxIllustration />,
  },
  {
    title: "Domain & URL",
    body: "Your own domain. Custom URLs per page. SSL set up for you.",
    href: "/dashboard/portal/domain",
    illustration: <DomainIllustration />,
  },
]

export function MakeItYours() {
  return (
    <section className="relative overflow-hidden border-y border-border bg-gradient-to-b from-background via-secondary/30 to-background py-24">
      {/* Ambient blooms — keep the colour family but a touch cooler
          than the course-builder above so the page rhythms alternate. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-32 top-24 h-72 w-72 rounded-full bg-accent/[0.10] blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 bottom-32 h-80 w-80 rounded-full bg-primary/[0.10] blur-3xl"
      />

      <div className="relative mx-auto max-w-6xl px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <Badge variant="outline" className="mb-4 inline-flex items-center gap-1.5 border-primary/30 bg-primary/[0.05] text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            Your portal · 9 editable surfaces
          </Badge>
          <h2 className="font-serif text-4xl font-bold tracking-tight sm:text-5xl">
            Every screen your students see —{" "}
            <span className="text-primary">yours to shape</span>.
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
            From the home page to the URL bar, every public surface of the portal has its own
            editor in your dashboard. No themes locked behind paid tiers. No &ldquo;powered by&rdquo;
            line. No code.
          </p>
        </div>

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {SURFACES.map((s, i) => (
            <SurfaceCard key={s.title} surface={s} delay={i * 70} />
          ))}
        </div>

        <div className="mt-14 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Button asChild size="lg">
            <Link href="/dashboard/portal">
              Open the portal editor
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/features/whitelabel">Read the white-label brief</Link>
          </Button>
        </div>
      </div>

      <style>{`
        @keyframes surfaceIn {
          0%   { opacity: 0; transform: translateY(14px) scale(0.985); }
          100% { opacity: 1; transform: translateY(0)    scale(1); }
        }
      `}</style>
    </section>
  )
}

function SurfaceCard({ surface, delay }: { surface: Surface; delay: number }) {
  return (
    <Link
      href={surface.href}
      className="group block focus:outline-none"
      style={{ animation: `surfaceIn 0.55s ease-out ${delay}ms both` }}
    >
      <Card className="h-full overflow-hidden border border-border/80 bg-gradient-to-b from-card via-card to-secondary/10 transition-all duration-300 group-hover:-translate-y-1.5 group-hover:border-primary/50 group-hover:shadow-[0_20px_50px_rgba(124,58,237,0.06)] dark:group-hover:shadow-[0_20px_50px_rgba(124,58,237,0.12)]">
        {/* Modern preview stage with dotted grid & dual glowing spotlights */}
        <div className="relative h-40 overflow-hidden border-b border-border/40 bg-gradient-to-br from-background via-muted/30 to-background flex items-center justify-center p-3">
          {/* Subtle dotted grid fading out towards the edges */}
          <div 
            className="absolute inset-0 opacity-70"
            style={{
              backgroundImage: 'radial-gradient(hsl(var(--muted-foreground)/0.18) 1px, transparent 1px)',
              backgroundSize: '14px 14px',
              maskImage: 'radial-gradient(ellipse at center, black 60%, transparent 100%)',
              WebkitMaskImage: 'radial-gradient(ellipse at center, black 60%, transparent 100%)',
            }}
          />
          
          {/* Glowing spotlights on hover */}
          <div className="absolute -left-10 -top-10 w-28 h-28 rounded-full bg-primary/10 opacity-20 blur-xl group-hover:opacity-40 transition-opacity duration-300 pointer-events-none" />
          <div className="absolute -right-10 -bottom-10 w-28 h-28 rounded-full bg-accent/10 opacity-20 blur-xl group-hover:opacity-40 transition-opacity duration-300 pointer-events-none" />
          
          {/* Floating animated illustration */}
          <div className="relative z-10 w-full h-full flex items-center justify-center transition-all duration-300 ease-out group-hover:scale-[1.05] group-hover:-translate-y-1.5">
            {surface.illustration}
          </div>
        </div>
        
        <CardContent className="space-y-2 p-5 relative">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-lg font-bold leading-tight tracking-tight text-foreground transition-colors duration-200 group-hover:text-primary">
              {surface.title}
            </h3>
            {/* Active glowing locator dot */}
            <span className="h-1.5 w-1.5 rounded-full bg-primary/30 transition-all duration-300 group-hover:scale-125 group-hover:bg-primary group-hover:shadow-[0_0_8px_rgba(124,58,237,0.6)]" />
          </div>
          
          <p className="text-sm leading-relaxed text-muted-foreground min-h-[40px]">
            {surface.body}
          </p>
          
          <div className="pt-1 flex items-center gap-1.5 text-xs font-semibold text-primary transition-all duration-200 opacity-80 group-hover:opacity-100">
            <span>Configure</span>
            <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-1" />
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

// ---------------------------------------------------------------
// Premium Glassmorphic Illustrations
// ---------------------------------------------------------------

const VIEWBOX = "0 0 200 140"

function HomePageIllustration() {
  return (
    <svg viewBox={VIEWBOX} className="h-full w-full">
      <defs>
        <linearGradient id="hp-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#818CF8" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#C084FC" stopOpacity="0.02" />
        </linearGradient>
        <linearGradient id="hp-hero" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#4F46E5" />
          <stop offset="100%" stopColor="#EC4899" />
        </linearGradient>
        <linearGradient id="hp-card" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6366F1" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#6366F1" stopOpacity="0.03" />
        </linearGradient>
      </defs>
      {/* Outer frame */}
      <rect x="12" y="12" width="176" height="116" rx="8" className="fill-card stroke-border" strokeWidth="1.2" />
      <rect x="13" y="13" width="174" height="114" rx="7" fill="url(#hp-bg)" />
      
      {/* Window Controls */}
      <circle cx="22" cy="22" r="2.5" fill="#EF4444" opacity="0.75" />
      <circle cx="30" cy="22" r="2.5" fill="#F59E0B" opacity="0.75" />
      <circle cx="38" cy="22" r="2.5" fill="#10B981" opacity="0.75" />
      <line x1="48" y1="22" x2="80" y2="22" className="stroke-muted-foreground/30" strokeWidth="1" strokeLinecap="round" />
      
      {/* Hero preview banner */}
      <rect x="20" y="32" width="160" height="46" rx="4" fill="url(#hp-hero)" opacity="0.9" />
      
      {/* Hero content */}
      <rect x="28" y="42" width="60" height="5" rx="2.5" fill="#FFFFFF" />
      <rect x="28" y="52" width="84" height="3" rx="1.5" fill="#FFFFFF" opacity="0.6" />
      <rect x="28" y="58" width="48" height="3" rx="1.5" fill="#FFFFFF" opacity="0.6" />
      <rect x="132" y="44" width="40" height="22" rx="4" fill="#FFFFFF" />
      <rect x="140" y="53.5" width="24" height="3" rx="1.5" fill="#4F46E5" />
      
      {/* Dashboard widgets */}
      <rect x="20" y="86" width="48" height="34" rx="4" fill="url(#hp-card)" className="stroke-primary/20" strokeWidth="0.8" />
      <circle cx="32" cy="98" r="6" fill="#818CF8" />
      <rect x="42" y="96" width="20" height="4" rx="2" fill="currentColor" className="text-foreground" opacity="0.8" />
      <rect x="28" y="108" width="32" height="3" rx="1.5" fill="currentColor" className="text-muted-foreground" opacity="0.5" />
      
      <rect x="76" y="86" width="48" height="34" rx="4" fill="url(#hp-card)" className="stroke-primary/20" strokeWidth="0.8" />
      <circle cx="88" cy="98" r="6" fill="#EC4899" />
      <rect x="98" y="96" width="20" height="4" rx="2" fill="currentColor" className="text-foreground" opacity="0.8" />
      <rect x="84" y="108" width="32" height="3" rx="1.5" fill="currentColor" className="text-muted-foreground" opacity="0.5" />

      <rect x="132" y="86" width="48" height="34" rx="4" fill="url(#hp-card)" className="stroke-primary/20" strokeWidth="0.8" />
      <circle cx="144" cy="98" r="6" fill="#10B981" />
      <rect x="154" y="96" width="20" height="4" rx="2" fill="currentColor" className="text-foreground" opacity="0.8" />
      <rect x="140" y="108" width="32" height="3" rx="1.5" fill="currentColor" className="text-muted-foreground" opacity="0.5" />
    </svg>
  )
}

function PagesIllustration() {
  return (
    <svg viewBox={VIEWBOX} className="h-full w-full">
      <defs>
        <linearGradient id="pg-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#10B981" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>
        <linearGradient id="pg-blue" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#6366F1" />
          <stop offset="100%" stopColor="#4F46E5" />
        </linearGradient>
      </defs>
      
      {/* Back fanned page */}
      <g transform="translate(32, 16) rotate(-8)">
        <rect x="0" y="0" width="104" height="106" rx="6" className="fill-card stroke-border" strokeWidth="1" />
        <rect x="10" y="12" width="50" height="4" rx="2" fill="currentColor" className="text-muted-foreground" opacity="0.3" />
        <rect x="10" y="24" width="84" height="20" rx="3" fill="#6366F1" opacity="0.08" />
      </g>
      
      {/* Middle fanned page */}
      <g transform="translate(42, 12) rotate(-4)">
        <rect x="0" y="0" width="104" height="106" rx="6" className="fill-card stroke-border" strokeWidth="1" />
        <rect x="10" y="12" width="50" height="4" rx="2" fill="currentColor" className="text-muted-foreground" opacity="0.4" />
        <rect x="10" y="24" width="84" height="20" rx="3" fill="#10B981" opacity="0.08" />
      </g>

      {/* Front premium page */}
      <g transform="translate(52, 14)">
        <rect x="0" y="0" width="104" height="106" rx="6" className="fill-card stroke-border" strokeWidth="1.2" style={{ filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.06))' }} />
        {/* Navbar line */}
        <line x1="8" y1="12" x2="96" y2="12" className="stroke-border" strokeWidth="0.8" />
        <circle cx="16" cy="12" r="2.5" fill="url(#pg-grad)" />
        <rect x="74" y="9" width="14" height="6" rx="3" fill="url(#pg-blue)" />
        
        {/* Page Hero layout */}
        <rect x="8" y="22" width="88" height="24" rx="3" fill="url(#pg-grad)" opacity="0.15" />
        <rect x="16" y="28" width="44" height="4" rx="2" fill="url(#pg-grad)" />
        <rect x="16" y="36" width="60" height="2" rx="1" fill="currentColor" className="text-foreground" opacity="0.5" />
        
        {/* Grid elements inside page */}
        <rect x="8" y="54" width="40" height="24" rx="3" className="fill-secondary/60 stroke-border" strokeWidth="0.6" />
        <rect x="14" y="60" width="16" height="3" rx="1.5" fill="currentColor" className="text-foreground" opacity="0.7" />
        <rect x="14" y="68" width="28" height="2" rx="1" fill="currentColor" className="text-muted-foreground" opacity="0.5" />
        <rect x="14" y="72" width="20" height="2" rx="1" fill="currentColor" className="text-muted-foreground" opacity="0.5" />

        <rect x="56" y="54" width="40" height="24" rx="3" className="fill-secondary/60 stroke-border" strokeWidth="0.6" />
        <rect x="62" y="60" width="16" height="3" rx="1.5" fill="currentColor" className="text-foreground" opacity="0.7" />
        <rect x="62" y="68" width="28" height="2" rx="1" fill="currentColor" className="text-muted-foreground" opacity="0.5" />
        <rect x="62" y="72" width="20" height="2" rx="1" fill="currentColor" className="text-muted-foreground" opacity="0.5" />
        
        {/* Footer */}
        <rect x="8" y="88" width="88" height="8" rx="2.5" fill="currentColor" className="text-muted" />
        <circle cx="16" cy="92" r="1.5" fill="currentColor" className="text-muted-foreground" opacity="0.6" />
      </g>
    </svg>
  )
}

function BrandIllustration() {
  return (
    <svg viewBox={VIEWBOX} className="h-full w-full">
      <defs>
        <linearGradient id="br-circle" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#8B5CF6" />
          <stop offset="100%" stopColor="#6366F1" />
        </linearGradient>
        <linearGradient id="br-rose" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#F43F5E" />
          <stop offset="100%" stopColor="#BE123C" />
        </linearGradient>
        <linearGradient id="br-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>
        <linearGradient id="br-sky" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#0EA5E9" />
          <stop offset="100%" stopColor="#0369A1" />
        </linearGradient>
      </defs>
      
      {/* Typography Preview Canvas */}
      <rect x="14" y="16" width="82" height="66" rx="6" className="fill-card stroke-border" strokeWidth="1" style={{ filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.03))' }} />
      <rect x="14" y="16" width="82" height="24" rx="6" fill="url(#br-circle)" opacity="0.1" />
      <text x="55" y="46" textAnchor="middle" fill="url(#br-circle)" style={{ fontSize: 28, fontWeight: 800, fontFamily: 'serif' }}>
        Aa
      </text>
      <text x="55" y="68" textAnchor="middle" className="fill-muted-foreground" style={{ fontSize: 7, fontWeight: 600, letterSpacing: '0.1em' }}>
        OUTFIT SANS
      </text>

      {/* Font sample side details */}
      <rect x="108" y="20" width="76" height="5" rx="2.5" fill="currentColor" className="text-foreground" />
      <rect x="108" y="30" width="62" height="3" rx="1.5" fill="currentColor" className="text-muted-foreground" opacity="0.7" />
      <rect x="108" y="37" width="48" height="3" rx="1.5" fill="currentColor" className="text-muted-foreground" opacity="0.5" />
      
      <rect x="108" y="52" width="76" height="30" rx="4" className="fill-secondary/60 stroke-border" strokeWidth="0.8" />
      <line x1="116" y1="62" x2="152" y2="62" fill="none" className="stroke-primary" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="152" cy="62" r="3.5" fill="url(#br-circle)" />
      <rect x="116" y="70" width="30" height="4" rx="2" fill="currentColor" className="text-muted-foreground" opacity="0.6" />

      {/* Color Palette customization dots */}
      <g transform="translate(18, 98)">
        <circle cx="0" cy="0" r="11" fill="url(#br-circle)" style={{ filter: 'drop-shadow(0 4px 8px rgba(99,102,241,0.35))' }} />
        <circle cx="28" cy="0" r="11" fill="url(#br-rose)" style={{ filter: 'drop-shadow(0 4px 8px rgba(244,63,94,0.3))' }} />
        <circle cx="56" cy="0" r="11" fill="url(#br-gold)" style={{ filter: 'drop-shadow(0 4px 8px rgba(245,158,11,0.3))' }} />
        <circle cx="84" cy="0" r="11" fill="url(#br-sky)" style={{ filter: 'drop-shadow(0 4px 8px rgba(14,165,233,0.3))' }} />
        <circle cx="112" cy="0" r="11" fill="#10B981" style={{ filter: 'drop-shadow(0 4px 8px rgba(16,185,129,0.3))' }} />
        <circle cx="140" cy="0" r="11" fill="currentColor" className="text-foreground" />
        <circle cx="168" cy="0" r="11" fill="none" className="stroke-border" strokeWidth="1.5" />
        <path d="M165 -3 L171 3 M165 3 L171 -3" fill="none" className="stroke-muted-foreground" strokeWidth="1.2" />
      </g>
    </svg>
  )
}

function ProfileIllustration() {
  return (
    <svg viewBox={VIEWBOX} className="h-full w-full">
      <defs>
        <linearGradient id="pf-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#EC4899" />
          <stop offset="100%" stopColor="#8B5CF6" />
        </linearGradient>
        <linearGradient id="pf-avatar" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#EF4444" />
        </linearGradient>
      </defs>
      
      {/* Central Profile Card */}
      <rect x="20" y="16" width="160" height="108" rx="8" className="fill-card stroke-border" strokeWidth="1.2" style={{ filter: 'drop-shadow(0 10px 24px rgba(0,0,0,0.05))' }} />
      <rect x="20" y="16" width="160" height="34" rx="8" fill="url(#pf-bg)" opacity="0.12" />
      <line x1="20" y1="50" x2="180" y2="50" className="stroke-border" strokeWidth="0.8" />
      
      {/* Glowing Avatar Node */}
      <circle cx="54" cy="50" r="22" fill="#FFFFFF" className="stroke-border" strokeWidth="1" />
      <circle cx="54" cy="50" r="18" fill="url(#pf-avatar)" />
      
      {/* Avatar details */}
      <circle cx="54" cy="44" r="5.5" fill="#FFFFFF" />
      <path d="M41 59 Q54 48 67 59" fill="#FFFFFF" />
      
      {/* Verified Badge */}
      <circle cx="68" cy="60" r="6" fill="#3B82F6" />
      <path d="M65 60 L67 62 L71 58" fill="none" stroke="#FFFFFF" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />

      {/* Name and Meta */}
      <rect x="88" y="26" width="64" height="6" rx="3" fill="url(#pf-bg)" />
      <rect x="88" y="38" width="40" height="3.5" rx="1.75" fill="currentColor" className="text-muted-foreground" opacity="0.5" />

      {/* Profile Bio Details */}
      <rect x="32" y="78" width="136" height="3" rx="1.5" fill="currentColor" className="text-foreground" opacity="0.8" />
      <rect x="32" y="85" width="120" height="3" rx="1.5" fill="currentColor" className="text-muted-foreground" opacity="0.6" />
      <rect x="32" y="92" width="96" height="3" rx="1.5" fill="currentColor" className="text-muted-foreground" opacity="0.6" />

      {/* Social / Link buttons */}
      <g transform="translate(32, 102)">
        <rect x="0" y="0" width="30" height="10" rx="5" className="fill-secondary stroke-border" strokeWidth="0.6" />
        <circle cx="7" cy="5" r="2.5" fill="#3B82F6" />
        <rect x="13" y="4" width="11" height="2" rx="1" fill="currentColor" className="text-muted-foreground" opacity="0.6" />

        <rect x="36" y="0" width="30" height="10" rx="5" className="fill-secondary stroke-border" strokeWidth="0.6" />
        <circle cx="43" cy="5" r="2.5" fill="#EF4444" />
        <rect x="49" y="4" width="11" height="2" rx="1" fill="currentColor" className="text-muted-foreground" opacity="0.6" />

        <rect x="72" y="0" width="30" height="10" rx="5" className="fill-secondary stroke-border" strokeWidth="0.6" />
        <circle cx="79" cy="5" r="2.5" fill="#10B981" />
        <rect x="85" y="4" width="11" height="2" rx="1" fill="currentColor" className="text-muted-foreground" opacity="0.6" />
      </g>
    </svg>
  )
}

function TestimonialsIllustration() {
  return (
    <svg viewBox={VIEWBOX} className="h-full w-full">
      <defs>
        <linearGradient id="ts-stars" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#EF4444" />
        </linearGradient>
        <linearGradient id="ts-avatar" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#38BDF8" />
          <stop offset="100%" stopColor="#6366F1" />
        </linearGradient>
      </defs>
      
      {/* Background card representing Wall of Love */}
      <rect x="18" y="16" width="164" height="108" rx="8" className="fill-card stroke-border" strokeWidth="1" />
      
      {/* Quote Bubble Card */}
      <g transform="translate(30, 26)">
        <rect x="0" y="0" width="140" height="74" rx="6" fill="currentColor" className="text-secondary/50 stroke-border" strokeWidth="0.8" style={{ filter: 'drop-shadow(0 6px 12px rgba(0,0,0,0.03))' }} />
        
        {/* Star Rating Grid */}
        <g transform="translate(10, 10)">
          {[0, 1, 2, 3, 4].map((i) => (
            <polygon
              key={i}
              points="5,0 6.5,3.5 10,3.5 7,5.5 8.5,9 5,7 1.5,9 3,5.5 0,3.5 3.5,3.5"
              transform={`translate(${i * 12}, 0)`}
              fill="url(#ts-stars)"
            />
          ))}
        </g>
        
        {/* Quote body text skeleton */}
        <rect x="10" y="28" width="120" height="3" rx="1.5" fill="currentColor" className="text-foreground" opacity="0.8" />
        <rect x="10" y="36" width="108" height="3" rx="1.5" fill="currentColor" className="text-muted-foreground" opacity="0.6" />
        <rect x="10" y="44" width="76" height="3" rx="1.5" fill="currentColor" className="text-muted-foreground" opacity="0.6" />

        {/* User signature */}
        <circle cx="16" cy="58" r="6" fill="url(#ts-avatar)" />
        <rect x="28" y="54" width="36" height="3" rx="1.5" fill="currentColor" className="text-foreground" opacity="0.9" />
        <rect x="28" y="60" width="20" height="2" rx="1" fill="currentColor" className="text-muted-foreground" opacity="0.5" />
      </g>

      {/* Verified feedback indicator widget */}
      <rect x="122" y="86" width="56" height="20" rx="10" fill="#10B981" opacity="0.1" className="stroke-success/30" strokeWidth="0.8" />
      <circle cx="132" cy="96" r="4.5" fill="#10B981" />
      <path d="M130 96 L131.5 97.5 L134.5 94.5" fill="none" stroke="#FFFFFF" strokeWidth="1.2" strokeLinecap="round" />
      <rect x="141" y="94.5" width="28" height="3" rx="1.5" fill="#10B981" />
    </svg>
  )
}

function BlogIllustration() {
  return (
    <svg viewBox={VIEWBOX} className="h-full w-full">
      <defs>
        <linearGradient id="bl-hero" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#3B82F6" />
          <stop offset="100%" stopColor="#10B981" />
        </linearGradient>
      </defs>
      
      {/* Blog Detail Sheet */}
      <rect x="16" y="16" width="168" height="108" rx="8" className="fill-card stroke-border" strokeWidth="1.2" style={{ filter: 'drop-shadow(0 8px 18px rgba(0,0,0,0.04))' }} />
      
      {/* Blog visual hero image banner */}
      <rect x="24" y="24" width="56" height="42" rx="4" fill="url(#bl-hero)" opacity="0.85" />
      
      {/* Abstract Sun and Mountain lines inside visual */}
      <circle cx="62" cy="36" r="5" fill="#FFFFFF" opacity="0.6" />
      <path d="M28 62 L42 48 L52 54 L68 38 L76 50 L76 62 Z" fill="#FFFFFF" opacity="0.4" />

      {/* Meta tags and Category Pill */}
      <rect x="88" y="24" width="34" height="8" rx="4" fill="#3B82F6" opacity="0.12" />
      <rect x="94" y="27" width="22" height="2" rx="1" fill="#3B82F6" />

      {/* Article Title header */}
      <rect x="88" y="38" width="86" height="6" rx="3" fill="currentColor" className="text-foreground" />
      <rect x="88" y="48" width="70" height="6" rx="3" fill="currentColor" className="text-foreground" />
      <rect x="88" y="58" width="52" height="3" rx="1.5" fill="currentColor" className="text-muted-foreground" opacity="0.6" />
      
      {/* Paragraph body lines */}
      <rect x="24" y="78" width="150" height="3" rx="1.5" fill="currentColor" className="text-muted-foreground" opacity="0.5" />
      <rect x="24" y="86" width="150" height="3" rx="1.5" fill="currentColor" className="text-muted-foreground" opacity="0.5" />
      <rect x="24" y="94" width="124" height="3" rx="1.5" fill="currentColor" className="text-muted-foreground" opacity="0.5" />

      {/* Author profile and reading meta */}
      <circle cx="30" cy="110" r="5" fill="#6366F1" opacity="0.8" />
      <rect x="40" y="108" width="34" height="3.5" rx="1.75" fill="currentColor" className="text-muted-foreground" opacity="0.6" />
      <rect x="146" y="108" width="28" height="3.5" rx="1.75" fill="currentColor" className="text-muted" />
    </svg>
  )
}

function AnnouncementsIllustration() {
  return (
    <svg viewBox={VIEWBOX} className="h-full w-full">
      <defs>
        <linearGradient id="an-alert" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#EF4444" />
        </linearGradient>
      </defs>
      
      {/* Portal view frame */}
      <rect x="14" y="14" width="172" height="112" rx="6" className="fill-card stroke-border" strokeWidth="1" />
      
      {/* Elegant glowing Alert Notification Banner */}
      <rect x="14" y="14" width="172" height="26" rx="6" fill="url(#an-alert)" />
      
      {/* Bell icon with ring details */}
      <g transform="translate(24, 21)">
        <path d="M6 2 A3 3 0 0 1 9 5 V8 A2 2 0 0 0 11 10 H1 A2 2 0 0 0 3 8 V5 A3 3 0 0 1 6 2 Z" fill="#FFFFFF" />
        <path d="M4 12 A2 2 0 0 0 8 12 Z" fill="#FFFFFF" opacity="0.8" />
      </g>
      
      {/* Alert body text */}
      <rect x="42" y="22" width="84" height="4" rx="2" fill="#FFFFFF" />
      <rect x="42" y="30" width="56" height="2.5" rx="1.25" fill="#FFFFFF" opacity="0.75" />
      
      {/* Close button cross */}
      <circle cx="170" cy="27" r="4.5" fill="#FFFFFF" opacity="0.25" />
      <path d="M168 25 L172 29 M172 25 L168 29" fill="none" stroke="#FFFFFF" strokeWidth="1" />

      {/* Skeletons represent background page content */}
      <rect x="24" y="52" width="112" height="6" rx="3" fill="currentColor" className="text-foreground" opacity="0.4" />
      <rect x="24" y="64" width="152" height="3" rx="1.5" fill="currentColor" className="text-muted-foreground" opacity="0.4" />
      <rect x="24" y="72" width="128" height="3" rx="1.5" fill="currentColor" className="text-muted-foreground" opacity="0.4" />

      {/* Two columns widget */}
      <rect x="24" y="86" width="70" height="30" rx="4" className="fill-secondary/60 stroke-border" strokeWidth="0.8" />
      <rect x="32" y="94" width="40" height="4" rx="2" fill="currentColor" className="text-muted-foreground" opacity="0.6" />
      <rect x="32" y="102" width="28" height="3" rx="1.5" fill="currentColor" className="text-muted" />

      <rect x="106" y="86" width="70" height="30" rx="4" className="fill-secondary/60 stroke-border" strokeWidth="0.8" />
      <rect x="114" y="94" width="40" height="4" rx="2" fill="currentColor" className="text-muted-foreground" opacity="0.6" />
      <rect x="114" y="102" width="28" height="3" rx="1.5" fill="currentColor" className="text-muted" />
    </svg>
  )
}

function LeadInboxIllustration() {
  return (
    <svg viewBox={VIEWBOX} className="h-full w-full">
      <defs>
        <linearGradient id="ld-unread" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#10B981" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>
        <linearGradient id="ld-avatar" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#818CF8" />
          <stop offset="100%" stopColor="#4F46E5" />
        </linearGradient>
      </defs>
      
      {/* Inbox background frame */}
      <rect x="16" y="16" width="168" height="108" rx="8" className="fill-card stroke-border" strokeWidth="1" />
      
      {/* Premium Active message row 1 */}
      <g transform="translate(22, 22)">
        <rect x="0" y="0" width="156" height="30" rx="6" fill="#6366F1" opacity="0.06" className="stroke-primary/10" strokeWidth="0.8" />
        <circle cx="16" cy="15" r="8" fill="url(#ld-avatar)" />
        {/* avatar details */}
        <circle cx="16" cy="12.5" r="2.5" fill="#FFFFFF" />
        <path d="M10 20 Q16 14 22 20" fill="#FFFFFF" />
        
        {/* Text rows */}
        <rect x="30" y="8" width="56" height="4" rx="2" fill="currentColor" className="text-foreground" />
        <rect x="30" y="17" width="96" height="3" rx="1.5" fill="currentColor" className="text-muted-foreground" opacity="0.6" />
        
        {/* Glowing active green dot tag */}
        <circle cx="144" cy="15" r="4" fill="url(#ld-unread)" style={{ filter: 'drop-shadow(0 0 4px #10B981)' }} />
      </g>
      
      {/* Message row 2 */}
      <g transform="translate(22, 58)">
        <rect x="0" y="0" width="156" height="30" rx="6" className="fill-secondary/60 stroke-border" strokeWidth="0.6" />
        <circle cx="16" cy="15" r="8" fill="#EC4899" opacity="0.8" />
        {/* avatar details */}
        <circle cx="16" cy="12.5" r="2.5" fill="#FFFFFF" />
        <path d="M10 20 Q16 14 22 20" fill="#FFFFFF" />
        
        <rect x="30" y="8" width="48" height="4" rx="2" fill="currentColor" className="text-foreground" opacity="0.8" />
        <rect x="30" y="17" width="84" height="3" rx="1.5" fill="currentColor" className="text-muted-foreground" opacity="0.5" />
      </g>

      {/* Message row 3 */}
      <g transform="translate(22, 94)">
        <rect x="0" y="0" width="156" height="24" rx="6" className="fill-secondary/60 stroke-border" strokeWidth="0.6" />
        <circle cx="16" cy="12" r="8" fill="#F59E0B" opacity="0.8" />
        {/* avatar details */}
        <circle cx="16" cy="9.5" r="2.5" fill="#FFFFFF" />
        <path d="M10 17 Q16 11 22 17" fill="#FFFFFF" />
        
        <rect x="30" y="7" width="40" height="4" rx="2" fill="currentColor" className="text-foreground" opacity="0.8" />
        <rect x="30" y="14" width="70" height="3" rx="1.5" fill="currentColor" className="text-muted-foreground" opacity="0.5" />
      </g>
    </svg>
  )
}

function DomainIllustration() {
  return (
    <svg viewBox={VIEWBOX} className="h-full w-full">
      <defs>
        <linearGradient id="dm-glow" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#10B981" />
          <stop offset="50%" stopColor="#6366F1" />
          <stop offset="100%" stopColor="#EC4899" />
        </linearGradient>
        <linearGradient id="dm-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>
      </defs>
      
      {/* URL browser header chrome */}
      <rect x="14" y="20" width="172" height="26" rx="13" className="fill-card stroke-primary/30" strokeWidth="1.2" style={{ filter: 'drop-shadow(0 6px 12px rgba(0,0,0,0.03))' }} />
      
      {/* Green SSL Secure padlock */}
      <g transform="translate(24, 27)">
        <path d="M4 8 V4 A3 3 0 0 1 10 4 V8" fill="none" stroke="#10B981" strokeWidth="1.5" />
        <rect x="1" y="7" width="12" height="8" rx="2" fill="#10B981" />
        <circle cx="7" cy="11" r="1.5" fill="#FFFFFF" />
      </g>
      
      {/* Domain Custom text */}
      <text x="44" y="37" fill="currentColor" className="text-foreground" style={{ fontSize: 10, fontFamily: 'monospace', fontWeight: 700 }}>
        learn.yourbrand.com
      </text>

      {/* SSL Verified status label */}
      <g transform="translate(142, 26)">
        <rect x="0" y="0" width="36" height="14" rx="7" fill="#10B981" opacity="0.1" />
        <text x="18" y="10" textAnchor="middle" fill="#10B981" style={{ fontSize: 7, fontWeight: 800, fontFamily: 'sans-serif' }}>
          SECURE
        </text>
      </g>

      {/* SSL custom certificate token */}
      <g transform="translate(18, 64)">
        <rect x="0" y="0" width="68" height="56" rx="6" className="fill-card stroke-border" strokeWidth="1" />
        <rect x="10" y="12" width="48" height="4" rx="2" fill="currentColor" className="text-foreground" />
        <rect x="10" y="22" width="36" height="3" rx="1.5" fill="currentColor" className="text-muted-foreground" opacity="0.6" />
        
        {/* Mini Gold security shield */}
        <g transform="translate(10, 32)">
          <rect x="0" y="0" width="48" height="14" rx="4" fill="url(#dm-gold)" opacity="0.15" />
          <path d="M7 3 L12 1 L17 3 V7 Q12 11 7 12 Q2 11 2 7 V3 Z" fill="url(#dm-gold)" />
          <rect x="22" y="5" width="20" height="4" rx="2" fill="url(#dm-gold)" />
        </g>
      </g>

      {/* Connection Beam flow lines */}
      <path d="M96 92 H116" fill="none" stroke="url(#dm-glow)" strokeWidth="3" strokeLinecap="round" />
      <circle cx="106" cy="92" r="4" fill="#6366F1" style={{ filter: 'drop-shadow(0 0 6px #6366F1)' }} />

      {/* Academy Custom portal target board */}
      <g transform="translate(116, 64)">
        <rect x="0" y="0" width="66" height="56" rx="6" className="fill-primary/10 stroke-primary" strokeWidth="1.2" />
        <rect x="8" y="12" width="50" height="4" rx="2" fill="#6366F1" />
        <rect x="8" y="22" width="44" height="3" rx="1.5" fill="#6366F1" opacity="0.6" />
        <rect x="8" y="32" width="32" height="3" rx="1.5" fill="#6366F1" opacity="0.6" />
        
        {/* Checked indicator */}
        <circle cx="50" cy="40" r="6" fill="#6366F1" />
        <path d="M47.5 40 L49.5 42 L52.5 38.5" fill="none" stroke="#FFFFFF" strokeWidth="1" strokeLinecap="round" />
      </g>
    </svg>
  )
}
