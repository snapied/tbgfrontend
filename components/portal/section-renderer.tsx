"use client"

// One file, all 14 section renderers. Kept together because:
//   • Each renderer is small (a few dozen lines of JSX).
//   • The page builder dispatches by `kind`, so having them co-located
//     makes adding a new section a single-file change.
//   • Section configs are intentionally loose (Record<string, unknown>);
//     each renderer's getX() helpers normalize once at the top so the
//     JSX stays readable.
//
// The renderers are presentational only. Data-aware sections
// (courses-grid, testimonials, faculty, blog-teaser) read from the
// portal store + lms-store via props, NOT directly — so the page editor
// can pass a draft preview without committing.

import { useEffect, useState, type CSSProperties, type ReactNode, type FormEvent } from "react"
import { useExperiment } from "@/lib/experiments"
import Link from "next/link"
import {
  ArrowRight,
  Award,
  CheckCircle2,
  ChevronDown,
  Clock,
  Globe,
  Heart,
  Lock,
  MessageCircle,
  Quote,
  Radio,
  RefreshCw,
  ShieldCheck,
  Star,
  Sparkles,
  Users,
} from "lucide-react"
import { useWishlist } from "@/lib/wishlist"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  RichTextContent,
  stripRichTextTags,
} from "@/components/editor/rich-text-content"
import {
  type PortalSection,
  type PortalFacultyMember,
  type PortalTestimonial,
  type PortalBlogPost,
} from "@/lib/portal-store"

// Public courses are referenced by id from courses-grid sections. The
// renderer takes a thin shape rather than the full Course interface so
// it can be hydrated from either lms-store or a future server fetch
// without leaking types.
export interface PortalCourseLite {
  id: string
  slug: string
  title: string
  description?: string
  thumbnail?: string
  category?: string
  level?: string
  rating?: number
  reviewCount?: number
  enrolledCount?: number
  price?: number
  originalPrice?: number
  currency?: string
  /** Sprint D Brand #20 — early-bird countdown anchor on cards.
   *  When set + in the future, cards show "Ends in Nd" to drive
   *  urgency. Empty when the course has no time-bound discount. */
  earlyBirdUntil?: string
  // Sprint A Brand #18 — derived signal: does any lesson on this
  // course have `isPreview: true`? Drives the "Free preview" ribbon
  // on cards and the course detail's "watch a lesson before enrolling"
  // affordance (#25). Pre-computed in the dataset so cards don't have
  // to load full course data to check.
  hasFreePreview?: boolean
  /** Lesson ids the visitor can watch without enrolling. Empty array
   *  when none. Used by the preview-lesson modal on course detail. */
  previewLessonIds?: string[]
  /** Sprint B Brand #19 — top 3 recent enrollee avatars for the
   *  "social density" stack on the card. Pre-computed in the dataset
   *  once so cards don't each scan the enrollments collection. Empty
   *  for brand-new courses. Each entry is {avatar?, name} so a
   *  missing image renders as an initials chip. */
  recentEnrolleeAvatars?: Array<{ name: string; avatar?: string }>
}

export interface PortalStoreProductLite {
  id: string
  slug: string
  title: string
  subtitle?: string
  coverImageUrl?: string
  kind: string
  priceLabel: string
}

/** Pre-computed social-proof stats shown in the hero's trust strip.
 *  Aggregated once per dataset hydration to avoid every section
 *  redoing the sum. Hidden by the consumer when totals are too small
 *  to be persuasive (≤50 students kills the credibility instead of
 *  building it). */
export interface PortalTrustStats {
  studentCount: number
  reviewCount: number
  avgRating: number      // 0..5; 0 when no reviews
  countryCount: number   // distinct country codes from enrolled users
  courseCount: number    // published courses (used as fallback signal)
}

/** Lightweight next-live-session shape so the hero can render an
 *  urgency strip without importing the full LiveSession type into
 *  every section file. Caller picks the soonest upcoming session
 *  within a sensible window (default 12h). */
export interface PortalNextLiveSession {
  id: string
  title: string
  scheduledAt: string
  courseTitle?: string
  enrolledCount?: number
  /** Public deep-link to the join / waiting room. */
  href: string
}

export interface PortalDataset {
  courses: PortalCourseLite[]
  faculty: PortalFacultyMember[]
  testimonials: PortalTestimonial[]
  posts: PortalBlogPost[]
  storeProducts: PortalStoreProductLite[]
  // Tenant slug — section renderers need this to scope per-tenant
  // primitives (experiments, attribution capture). Always set; falls
  // back to "default" only when the caller couldn't resolve a tenant.
  tenantSlug: string
  // Routing helpers — the public portal lives at /p/[tenant]/...; this
  // lets every link prefix itself correctly.
  basePath: string
  // Currency formatter — passed in so the section doesn't have to import
  // currency utils and pick a fallback.
  formatMoney: (amount: number, currency?: string) => string
  // Aggregated social-proof. Sprint A item — Hero trust strip
  // consumes this; renders nothing when below the credibility floor.
  trustStats: PortalTrustStats
  // Soonest upcoming live session in the next ~12h. Sprint A item —
  // Hero live-state strip renders when present. Null when nothing's
  // scheduled within the window.
  nextLiveSession: PortalNextLiveSession | null
  // Where lead submissions go. The contact-form section POSTs to it.
  submitLead: (payload: {
    formId: string
    pageSlug: string
    name?: string
    email: string
    phone?: string
    message?: string
    fields?: Record<string, string>
  }) => Promise<void>
}

export function SectionRenderer({
  section,
  dataset,
  pageSlug,
}: {
  section: PortalSection
  dataset: PortalDataset
  pageSlug: string
}) {
  if (section.hidden) return null
  switch (section.kind) {
    case "hero": return <Hero section={section} dataset={dataset} />
    case "features": return <Features section={section} />
    case "courses-grid": return <CoursesGrid section={section} dataset={dataset} />
    case "store-grid": return <StoreGrid section={section} dataset={dataset} />
    case "testimonials": return <Testimonials section={section} dataset={dataset} />
    case "faculty": return <Faculty section={section} dataset={dataset} />
    case "cta": return <CTA section={section} basePath={dataset.basePath} />
    case "rich-text": return <RichTextSection section={section} />
    case "faq": return <FAQ section={section} />
    case "stats": return <Stats section={section} />
    case "contact-form": return <ContactForm section={section} dataset={dataset} pageSlug={pageSlug} />
    case "blog-teaser": return <BlogTeaser section={section} dataset={dataset} />
    case "video": return <VideoSection section={section} />
    case "image-gallery": return <ImageGallery section={section} />
    case "logos-strip": return <LogosStrip section={section} />
    case "trust-badges": return <TrustBadges section={section} />
    default: return null
  }
}

// ============================================================
// Helpers — config readers + shared wrappers
// ============================================================

function str(v: unknown, fb = ""): string { return typeof v === "string" ? v : fb }
function num(v: unknown, fb = 0): number { return typeof v === "number" ? v : fb }
function arr<T>(v: unknown): T[] { return Array.isArray(v) ? (v as T[]) : [] }
function obj(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : {}
}

/** Detect SHOUTY copy (≥50% upper-case letters AND ≥4 uppercase
 *  glyphs) and soft-case it to "Title Case With First Letter Up"
 *  so a serif hero doesn't read like a billboard. Strings that
 *  aren't SHOUTY pass through unchanged. */
function softCase(s: string): string {
  if (!s) return s
  const letters = s.replace(/[^A-Za-z]/g, "")
  if (letters.length < 6) return s
  const upper = letters.replace(/[^A-Z]/g, "").length
  if (upper < 4 || upper / letters.length < 0.5) return s
  // Title-case each word; lowercase the rest. Keeps numbers + punct
  // intact. The first letter of the string is always upper.
  const lowered = s.toLowerCase()
  const titled = lowered.replace(/(^|\s)([a-z])/g, (_, ws, ch) => ws + ch.toUpperCase())
  return titled
}

function SectionWrap({
  children,
  bg,
  className,
}: {
  children: ReactNode
  bg?: string
  className?: string
}) {
  return (
    <section
      className={cn("relative overflow-hidden px-6 py-16 sm:py-20 lg:px-8", className)}
      style={bg ? ({ background: bg } as CSSProperties) : undefined}
    >
      <div className="mx-auto max-w-6xl break-words">{children}</div>
    </section>
  )
}

// Internal links stay <Link>; external (anything starting with http) gets
// rel=noopener so we don't leak the referrer.
function CtaButton({
  href,
  label,
  variant = "default",
  basePath,
  onClick,
}: {
  href: string
  label: string
  variant?: "default" | "outline"
  basePath: string
    /** Fires alongside the navigation — used by the hero CTA to register
     *  an experiment conversion. We don't preventDefault, so the link
     *  still navigates normally. */
    onClick?: () => void
}) {
  const isExternal = /^https?:\/\//.test(href)
  const finalHref = isExternal ? href : prefix(basePath, href)
  if (isExternal) {
    return (
      <Button variant={variant} asChild>
        <a href={finalHref} target="_blank" rel="noopener noreferrer nofollow" onClick={onClick}>
          {label}
        </a>
      </Button>
    )
  }
  return (
    <Button variant={variant} asChild>
      <Link href={finalHref} onClick={onClick}>{label}</Link>
    </Button>
  )
}

function prefix(basePath: string, path: string): string {
  if (!path) return basePath || "/"
  if (path.startsWith("/")) return (basePath || "") + path
  return path
}

// ============================================================
// Renderers
// ============================================================

// Sprint A Brand #1 — Placeholder strings the page editor ships as
// defaults. When the published portal still contains any of these,
// we treat the section as "untouched template" and synthesise a copy
// from brand + first published course so visitors never see literal
// placeholder text. Add new ones here as they're introduced in the
// editor; comparison is case-insensitive + trimmed.
const HERO_PLACEHOLDER_STRINGS = [
  "a line that sells the dream",
  "welcome",
  "your headline",
  "your tagline",
  "edit me",
  "lorem ipsum",
]

function isPlaceholder(value: string | undefined): boolean {
  if (!value) return false
  const v = value.trim().toLowerCase()
  return HERO_PLACEHOLDER_STRINGS.includes(v)
}

function Hero({
  section,
  dataset,
}: {
  section: PortalSection
  dataset: PortalDataset
}) {
  const { basePath, tenantSlug, trustStats, nextLiveSession, courses, storeProducts } = dataset
  const c = section.config
  const eyebrow = str(c.eyebrow)
  const rawHeadline = str(c.headline)
  const subhead = str(c.subhead)
  const primary = obj(c.primaryCta) as { label?: string; href?: string }
  const secondary = obj(c.secondaryCta) as { label?: string; href?: string }

  // Sprint A Brand #1 — derive a sensible headline when the teacher
  // left the placeholder in. Falls back through: first published
  // course topic → "Learn at <site>" → static safe copy. The site
  // name is read from the first course's "tenant" implicitly via
  // the courses list. Editor-side banner (separate change) tells
  // teachers to fix it; this just makes sure the public never sees
  // "A line that sells the dream".
  const headline = (() => {
    if (rawHeadline && !isPlaceholder(rawHeadline)) return rawHeadline
    const lead = courses[0]
    if (lead?.title) return `Learn ${lead.title.split(/[:—-]/)[0].trim()} — at your pace`
    return "Learn at your pace. Get further than you thought you could."
  })()
  const effectiveSubhead = isPlaceholder(subhead) ? "" : subhead

  // Sprint A Brand #1 — same fix for CTA labels. A primary CTA stuck
  // at "Browse" reads as a placeholder; derive a stronger default
  // when the link points at courses, otherwise keep the author's text.
  //
  // Offer-aware CTA. When the teacher hasn't customised the label
  // (or left a placeholder) AND the link points at courses, we
  // *don't* blindly say "Browse courses". We inspect what the
  // workspace actually sells:
  //   • only sessions → "Book a call"
  //   • only memberships → "Join the membership"
  //   • only downloads → "See the downloads"
  //   • mostly courses → "Browse courses"
  //   • mixed catalogue → "See what's available"
  // Picks by simple plurality across published store products. The
  // teacher's authored label always wins if they bothered to set
  // one.
  const fallbackPrimaryLabel = (() => {
    if (primary.label && !isPlaceholder(primary.label)) return primary.label
    if (!primary.href?.includes("course")) return primary.label
    // Bucket the catalogue by kind. Courses are double-counted here:
    // the dataset surfaces both LMS courses (real curricula) AND
    // store products that re-sell those courses, so we union the
    // two sets when deciding the offer's centre of gravity.
    const counts: Record<string, number> = { course: 0, session: 0, webinar: 0, membership: 0, download: 0, license: 0, bundle: 0 }
    for (const p of storeProducts) counts[p.kind] = (counts[p.kind] ?? 0) + 1
    counts.course += courses.length
    const total = Object.values(counts).reduce((a, b) => a + b, 0)
    if (total === 0) return "Browse courses"
    const top = (Object.entries(counts) as Array<[keyof typeof counts, number]>)
      .filter(([, n]) => n > 0)
      .sort((a, b) => b[1] - a[1])
    const [dominant, n] = top[0]
    const monoculture = n / total >= 0.7
    if (monoculture) {
      if (dominant === "session") return "Book a call"
      if (dominant === "membership") return "Join the membership"
      if (dominant === "download") return "See the downloads"
      if (dominant === "webinar") return "Register for the webinar"
      if (dominant === "license") return "Get a license"
      if (dominant === "bundle") return "See the bundles"
      return "Browse courses"
    }
    return "See what's available"
  })()

  // Hero CTA copy A/B — the most common experiment a teacher wants.
  // Admin defines variants in /dashboard/experiments under the key
  // "hero-cta-copy". Each variant id maps to a label override below
  // (control = whatever the page editor specified, urgent / aspirational
  // = canned overrides). If the experiment is absent / draft / paused,
  // the hook returns "control" and we render the editor-authored label.
  const exp = useExperiment({
    tenantSlug,
    key: "hero-cta-copy",
    variantIds: ["control", "urgent", "aspirational"],
  })
  // Fire an exposure on first paint. The experiments hook de-dupes
  // by (visitor, experiment) so navigation back to the page doesn't
  // inflate impressions.
  useEffect(() => {
    if (fallbackPrimaryLabel && primary.href) exp.exposure()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const heroCtaLabel = (() => {
    if (!fallbackPrimaryLabel) return fallbackPrimaryLabel
    if (exp.variant === "urgent") return "Start free today"
    if (exp.variant === "aspirational") return "Begin your journey"
    return fallbackPrimaryLabel
  })()
  const bgImage = str(c.backgroundImage)
  const align = str(c.alignment, "center") as "left" | "center"
  const overlay = num(c.overlayOpacity, bgImage ? 0.55 : 0)

  // Use color-mix to blend primary/accent with transparent and let
  // the page background show through the middle. Previously this
  // hard-stopped through `var(--background)`, which painted a
  // light-cream band over dark templates (Studio, Midnight) — making
  // headline text invisible. Transparent middle = whatever's behind
  // (template gradient, solid color, etc.) shows through cleanly.
  const bg = bgImage
    ? `url("${bgImage}") center/cover`
    : "linear-gradient(135deg, color-mix(in oklch, var(--primary) 12%, transparent) 0%, transparent 50%, color-mix(in oklch, var(--accent) 14%, transparent) 100%)"

  // Sprint A Brand #2 — Trust strip eligibility. We render the
  // social-proof line only when totals are persuasive enough that
  // they help rather than hurt (≤ ~50 students looks worse than
  // showing nothing). Tunable per market; for the IN POC the bar
  // is intentionally low (10 students + 3 reviews).
  const showTrustStrip =
    trustStats.studentCount >= 10 ||
    trustStats.reviewCount >= 3
  // Cold-start framing. When the trust strip can't show *real*
  // social proof but the workspace has at least one published
  // course (it isn't a totally blank workspace), surface a
  // "Just launched" badge that reframes low numbers as an early
  // opportunity rather than emptiness. Hidden when even courseCount
  // is zero — there's nothing to invite people to yet.
  const showJustLaunched = !showTrustStrip && trustStats.courseCount > 0

  return (
    <section
      // Sprint D mobile P0 (Brand #6 + #7) — reserve vertical
      // space with min-height so the hero doesn't pop in late
      // and shift the page (CLS). Default min is 60vh on mobile
      // and 70vh on desktop — gives the hero presence without
      // pushing everything below off the fold on small screens.
      // The image still lazy-paints; the reserved box prevents the
      // layout jump.
      className="relative min-h-[40vh] overflow-hidden border-b border-border md:min-h-[50vh]"
      style={{ background: bg }}
    >
      {bgImage && overlay > 0 && (
        <div className="absolute inset-0 bg-black" style={{ opacity: overlay }} />
      )}
      <div
        className={cn(
          // Sprint D mobile P0 (Brand #7) — tighter mobile padding
          // (py-14 instead of py-20) so the hero doesn't dominate
          // the entire mobile viewport before content. Desktop
          // keeps the generous py-28.
          "relative mx-auto max-w-5xl px-6 py-10 sm:py-14 lg:px-8 lg:py-20",
          align === "center" ? "text-center" : "text-left",
        )}
      >
        {eyebrow && (
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium",
              bgImage
                ? "border-white/30 bg-white/10 text-white"
                : "border-primary/20 bg-primary/10 text-primary",
            )}
          >
            <Sparkles className="h-3.5 w-3.5" />
            {eyebrow}
          </span>
        )}
        {/* SHOUTY guard. A serif hero in ALL CAPS reads as
            aggressive marketing instead of premium editorial. We
            detect ≥50% upper-case letters with at least 4
            uppercase glyphs and soft-case the headline (sentence
            case) on the public site. The editor still sees what
            the teacher typed; only the rendered hero is calmed.
            `normal-case` defensively pins text-transform so a
            stray .uppercase global utility can't sneak in. */}
        <h1
          className={cn(
            "mt-5 font-serif text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl normal-case",
            "[text-wrap:balance]",
            bgImage ? "text-white" : "text-foreground",
          )}
        >
          {softCase(headline)}
        </h1>
        {effectiveSubhead && (
          <p
            className={cn(
              "mx-auto mt-4 max-w-2xl text-lg",
              bgImage ? "text-white/90" : "text-muted-foreground",
              align === "left" && "mx-0",
            )}
          >
            {effectiveSubhead}
          </p>
        )}

        {/* Sprint A Brand #2 — Trust strip. Tight stat row between
            subhead and CTAs. Each stat hides individually when the
            backing count is below its own floor (avoids "1 country").
            Rendered before CTAs because conversion research says
            social proof should precede the ask, not follow it. */}
        {showTrustStrip && (
          <div
            className={cn(
              "mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-[12.5px] font-medium",
              align === "center" && "justify-center",
              bgImage ? "text-white/85" : "text-muted-foreground",
            )}
          >
            {trustStats.studentCount >= 10 && (
              <span className="inline-flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" />
                <span className={cn("font-bold tabular-nums", bgImage ? "text-white" : "text-foreground")}>
                  {trustStats.studentCount.toLocaleString()}+
                </span>
                students
              </span>
            )}
            {trustStats.reviewCount >= 3 && trustStats.avgRating > 0 && (
              <span className="inline-flex items-center gap-1.5">
                <Star className="h-3.5 w-3.5 fill-current" />
                <span className={cn("font-bold tabular-nums", bgImage ? "text-white" : "text-foreground")}>
                  {trustStats.avgRating.toFixed(1)}
                </span>
                across {trustStats.reviewCount.toLocaleString()} reviews
              </span>
            )}
            {trustStats.countryCount >= 3 && (
              <span className="inline-flex items-center gap-1.5">
                <Globe className="h-3.5 w-3.5" />
                <span className={cn("font-bold tabular-nums", bgImage ? "text-white" : "text-foreground")}>
                  {trustStats.countryCount}
                </span>
                countries
              </span>
            )}
          </div>
        )}

        {/* Just-launched pill — shown only when the real trust strip
            can't render (no enrolments + no reviews yet) but the
            workspace has at least one course. Reframes "0 students"
            as an opportunity instead of leaving the hero with no
            social signal at all. */}
        {showJustLaunched && (
          <p
            className={cn(
              "mt-5",
              align === "center" && "text-center",
            )}
          >
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-semibold",
                bgImage
                  ? "border border-white/30 bg-white/10 text-white"
                  : "border border-primary/20 bg-primary/10 text-primary",
              )}
            >
              <Sparkles className="h-3.5 w-3.5" />
              Just launched · be one of the first
            </span>
          </p>
        )}

        {/* Sprint A Brand #3 — CTA pair. Primary stays filled-and-bold
            (default CtaButton variant). Secondary moves to a quiet
            ghost-link style so it stops competing visually. If the
            author didn't supply a secondary, no second button — no
            placeholder. */}
        {(fallbackPrimaryLabel || secondary.label) && (
          <div
            className={cn(
              "mt-8 flex flex-wrap items-center gap-4",
              align === "center" ? "justify-center" : "justify-start",
            )}
          >
            {fallbackPrimaryLabel && primary.href && (
              <CtaButton
                href={primary.href}
                label={heroCtaLabel ?? fallbackPrimaryLabel}
                basePath={basePath}
                onClick={() => exp.convert("hero-cta-click")}
              />
            )}
            {secondary.label && secondary.href && !isPlaceholder(secondary.label) && (
              <a
                href={secondary.href.startsWith("http") ? secondary.href : prefix(basePath, secondary.href)}
                className={cn(
                  "group inline-flex items-center gap-1.5 text-[14px] font-semibold underline-offset-4 hover:underline",
                  bgImage ? "text-white" : "text-foreground",
                )}
              >
                {secondary.label}
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </a>
            )}
          </div>
        )}

        {/* Trust strip + live-session strip removed from the hero
            (Sprint X — public-site cleanup).
            • Trust badges now ship as a dedicated `trust-badges`
              section so the teacher controls the labels + icons
              (instead of the platform shipping its own claim
              about refund + support windows that may not match the
              workspace's actual policy).
            • The "UPCOMING · Instant class · In 4m" live strip used
              to render here for visitors who happened to land while
              a class was scheduled. It bled internal scheduling
              detail to the public marketing surface and confused
              cold visitors who didn't know what "Instant class"
              meant. Removed entirely from public — enrolled learners
              still see live state inside /p/<tenant>/my. */}
      </div>
    </section>
  )
}

/** Hero #8 — animated countdown / live chip. Pulled out of Hero so
 *  the live-time ticker doesn't re-render the whole hero every second. */
function HeroLiveStrip({
  session,
  onDarkBg,
  basePath,
}: {
  session: PortalNextLiveSession
  onDarkBg: boolean
  basePath: string
}) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    // 30s tick is enough for human-readable time-from copy without
    // burning CPU. Drift on minutes is invisible to the eye.
    const id = window.setInterval(() => setNow(Date.now()), 30 * 1000)
    return () => window.clearInterval(id)
  }, [])
  const startMs = Date.parse(session.scheduledAt)
  const diffMs = startMs - now
  const isLive = diffMs <= 0
  const timeLabel = isLive
    ? "Live now"
    : diffMs < 60 * 60_000
      ? `In ${Math.max(1, Math.round(diffMs / 60_000))}m`
      : diffMs < 12 * 3600_000
        ? `In ${Math.round(diffMs / 3600_000)}h`
        : new Date(startMs).toLocaleString(undefined, { weekday: "short", hour: "2-digit", minute: "2-digit" })

  const href = session.href.startsWith("http") ? session.href : prefix(basePath, session.href.replace(basePath, "") || "/")

  return (
    <a
      href={href}
      className={cn(
        "mt-7 inline-flex max-w-full flex-wrap items-center gap-2 rounded-full border px-3 py-1.5 text-[12.5px] font-semibold transition-colors",
        onDarkBg
          ? "border-white/25 bg-white/10 text-white hover:bg-white/20"
          : "border-rose-500/30 bg-rose-500/10 text-rose-700 hover:bg-rose-500/15 dark:text-rose-300",
      )}
    >
      <Radio className={cn("h-3.5 w-3.5", isLive && "animate-pulse")} />
      <span className="uppercase tracking-wider">{isLive ? "Live" : "Upcoming"}</span>
      <span className="opacity-60">·</span>
      <span className="truncate max-w-[180px]">{session.title}</span>
      {session.courseTitle && (
        <>
          <span className="opacity-60">·</span>
          <span className="truncate max-w-[140px] opacity-80">{session.courseTitle}</span>
        </>
      )}
      <span className="opacity-60">·</span>
      <span>{timeLabel}</span>
      <ArrowRight className="h-3 w-3 opacity-80" />
    </a>
  )
}

function Features({ section }: { section: PortalSection }) {
  const c = section.config
  const heading = str(c.heading)
  const subhead = str(c.subhead)
  const items = arr<{ title?: string; body?: string; icon?: string }>(c.items)
  if (items.length === 0) return null
  // Gate on real authoring. The default config seeds 3 generic
  // items ("Feature 1 · What's great about it"). Publishing those
  // verbatim makes the workspace look unfinished. We require at
  // least one item whose title is non-placeholder before rendering
  // the whole section; if every title is still placeholder, the
  // teacher hasn't actually authored anything and the section is
  // hidden.
  const PLACEHOLDER_TITLES = /^feature\s*\d?$|^\s*$/i
  const PLACEHOLDER_BODIES = /^what'?s great about it\.?$|^\s*$/i
  const hasCustomItem = items.some((it) =>
    !(PLACEHOLDER_TITLES.test(str(it.title)) && PLACEHOLDER_BODIES.test(str(it.body))),
  )
  if (!hasCustomItem) return null
  return (
    <SectionWrap>
      {(heading || subhead) && (
        <div className="mx-auto mb-12 max-w-2xl text-center">
          {heading && (
            <h2 className="font-serif text-3xl font-bold tracking-tight sm:text-4xl">
              {heading}
            </h2>
          )}
          {subhead && <p className="mt-3 text-lg text-muted-foreground">{subhead}</p>}
        </div>
      )}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((it, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <h3 className="font-semibold">{str(it.title, "Feature")}</h3>
              {it.body && <p className="mt-2 text-sm text-muted-foreground">{it.body}</p>}
            </CardContent>
          </Card>
        ))}
      </div>
    </SectionWrap>
  )
}

function CoursesGrid({
  section,
  dataset,
}: {
  section: PortalSection
  dataset: PortalDataset
}) {
  // Sprint B Brand #21 — wishlist binding scoped to the dataset's
  // tenant. Single hook for the whole grid so we don't fire one per
  // card; per-card UI reads from the same array.
  const wishlist = useWishlist(dataset.tenantSlug)
  const c = section.config
  const heading = str(c.heading, "Courses")
  const mode = str(c.mode, "popular") as
    | "all" | "popular" | "featured" | "by-category" | "hand-picked"
  const limit = num(c.limit, 6)
  const category = str(c.category)
  const picks = arr<string>(c.pickedIds)

  let list = dataset.courses.slice()
  if (mode === "by-category") list = list.filter((x) => x.category === category)
  else if (mode === "hand-picked") {
    list = picks
      .map((id) => list.find((x) => x.id === id))
      .filter((x): x is PortalCourseLite => !!x)
  } else if (mode === "popular") {
    list.sort((a, b) => (b.enrolledCount ?? 0) - (a.enrolledCount ?? 0))
  } else if (mode === "featured") {
    list.sort(
      (a, b) =>
        (b.rating ?? 0) - (a.rating ?? 0) ||
        (b.enrolledCount ?? 0) - (a.enrolledCount ?? 0),
    )
  }
  list = list.slice(0, limit)

  return (
    <SectionWrap className="bg-card/40">
      <div className="mb-8 flex items-end justify-between gap-4">
        <h2 className="font-serif text-2xl font-bold tracking-tight sm:text-3xl">
          {heading}
        </h2>
        <Link
          href={prefix(dataset.basePath, "/courses")}
          className="text-sm font-medium text-primary hover:underline"
        >
          See all →
        </Link>
      </div>
      {list.length === 0 ? (
        <p className="text-sm text-muted-foreground">No courses yet.</p>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((course) => (
            <Link
              key={course.id}
              href={prefix(dataset.basePath, `/courses/details/${course.slug}`)}
              className="group block"
            >
              <Card className="overflow-hidden py-0 transition-all duration-200 group-hover:-translate-y-1 group-hover:shadow-lg">
                <div className="relative aspect-video overflow-hidden bg-muted">
                  <img
                    src={course.thumbnail || "/placeholder.svg?height=400&width=600"}
                    alt={course.title}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                  />
                  {/* Sprint A Brand #18 — free preview ribbon. Top-
                      right because thumbnails often have left-aligned
                      titles; a right-side ribbon doesn't clash with
                      typical cover art focal points. Click-through
                      uses the parent <Link> — the badge isn't its
                      own action target, so screen readers don't
                      double-announce. */}
                  {course.hasFreePreview && (
                    <span
                      aria-label="Includes a free preview lesson"
                      className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-emerald-500/95 px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wider text-white shadow-sm"
                    >
                      <Sparkles className="h-2.5 w-2.5" />
                      Free preview
                    </span>
                  )}
                  {/* Sprint B Brand #21 — wishlist heart. Placed
                      bottom-right of the thumbnail so it doesn't
                      collide with the top-right preview ribbon when
                      both are present. Stops the parent link
                      navigation on click — toggle wishlist without
                      opening the course. */}
                  <button
                    type="button"
                    aria-label={wishlist.has(course.id) ? "Remove from wishlist" : "Save to wishlist"}
                    aria-pressed={wishlist.has(course.id)}
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      wishlist.toggle(course.id)
                    }}
                    className="absolute bottom-2 right-2 inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/40 bg-black/40 text-white backdrop-blur-sm transition hover:scale-110"
                  >
                    <Heart className={cn("h-4 w-4", wishlist.has(course.id) && "fill-rose-400 text-rose-400")} />
                  </button>
                </div>
                <CardContent className="p-5">
                  {course.category && (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                      {course.category}
                    </span>
                  )}
                  <h3 className="mt-2 line-clamp-2 font-semibold text-foreground group-hover:text-primary">
                    {course.title}
                  </h3>
                  {course.description && (
                    <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                      {stripRichTextTags(course.description).slice(0, 160)}
                    </p>
                  )}
                  {/* Sprint B Brand #19 — social-density row. Renders
                      only when the course has at least one enrollee;
                      keeps brand-new courses from showing an empty
                      avatar slot. Stack of up to 3 avatars + "+N
                      others" label. Initials fallback when a student
                      has no avatar. The "X others" text is the
                      tooltip-style summary so a screen reader picks
                      up "Anita, Priya and 29 others enrolled". */}
                  {course.recentEnrolleeAvatars && course.recentEnrolleeAvatars.length > 0 && (course.enrolledCount ?? 0) > 0 && (
                    <div className="mt-3 flex items-center gap-2">
                      <div className="flex -space-x-1.5">
                        {course.recentEnrolleeAvatars.slice(0, 3).map((e, i) =>
                          e.avatar ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              key={i}
                              src={e.avatar}
                              alt=""
                              title={e.name}
                              className="h-6 w-6 rounded-full border-2 border-card object-cover"
                            />
                          ) : (
                            <span
                              key={i}
                              title={e.name}
                              className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-card bg-muted text-[9px] font-bold text-muted-foreground"
                            >
                              {e.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                            </span>
                          ),
                        )}
                      </div>
                      <span className="text-[11px] text-muted-foreground">
                        {(() => {
                          const names = course.recentEnrolleeAvatars.map((e) => e.name.split(" ")[0])
                          const others = Math.max(0, (course.enrolledCount ?? 0) - names.length)
                          const lead = names.slice(0, 2).join(", ")
                          return others > 0
                            ? `${lead} & ${others.toLocaleString()} others enrolled`
                            : `${names.join(", ")} enrolled`
                        })()}
                      </span>
                    </div>
                  )}
                  <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                    <div className="flex flex-wrap items-baseline gap-1.5">
                      <span className="text-lg font-bold">
                        {(course.price ?? 0) > 0
                          ? dataset.formatMoney(course.price ?? 0, course.currency)
                          : "Free"}
                      </span>
                      {/* Sprint D Brand #20 — price comparison anchor.
                          Two forms:
                            • original price strikethrough when set
                            • discount % when both prices exist
                          Renders inline so a paid course with a
                          discount reads "$49 ($120 · 59% off)".
                          Adds visual proof of value without bloating
                          the card. */}
                      {course.originalPrice && course.originalPrice > (course.price ?? 0) && (
                        <>
                          <span className="text-xs text-muted-foreground line-through">
                            {dataset.formatMoney(course.originalPrice, course.currency)}
                          </span>
                          <span className="rounded-full bg-rose-500/15 px-1.5 py-0 text-[10px] font-bold uppercase text-rose-700 dark:text-rose-300">
                            {Math.round((1 - (course.price ?? 0) / course.originalPrice) * 100)}% off
                          </span>
                        </>
                      )}
                    </div>
                    {course.rating ? (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Star className="h-3.5 w-3.5 fill-accent text-accent" />
                        <span className="font-medium text-foreground">{course.rating.toFixed(1)}</span>
                        <span>({course.reviewCount ?? 0})</span>
                      </span>
                    ) : null}
                  </div>
                  {/* Sprint D Brand #20 — urgency strip when there's
                      an early-bird window in the future. Renders the
                      remaining days as a small chip; sits below the
                      price row so it doesn't crowd the price/rating
                      line. Hides when no earlyBirdUntil or it has
                      passed. */}
                  {course.earlyBirdUntil && (() => {
                    const msLeft = Date.parse(course.earlyBirdUntil) - Date.now()
                    if (msLeft <= 0) return null
                    const days = Math.max(1, Math.round(msLeft / (24 * 3600 * 1000)))
                    const label =
                      msLeft < 24 * 3600 * 1000
                        ? `Ends in ${Math.max(1, Math.round(msLeft / 3600_000))}h`
                        : `Ends in ${days} ${days === 1 ? "day" : "days"}`
                    return (
                      <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                        ⏳ {label}
                      </p>
                    )
                  })()}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </SectionWrap>
  )
}

function StoreGrid({
  section,
  dataset,
}: {
  section: PortalSection
  dataset: PortalDataset
}) {
  const c = section.config
  const heading = str(c.heading, "Shop")
  const subhead = str(c.subhead, "Courses, sessions, downloads — everything we sell.")
  const limit = num(c.limit, 6)
  const kindFilter = str(c.kind, "all")

  let list = dataset.storeProducts.slice()
  if (kindFilter && kindFilter !== "all") {
    list = list.filter((p) => p.kind === kindFilter)
  }
  list = list.slice(0, limit)

  return (
    <SectionWrap className="bg-card/40">
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl font-bold tracking-tight sm:text-3xl">
            {heading}
          </h2>
          {subhead && <p className="mt-1 text-sm text-muted-foreground">{subhead}</p>}
        </div>
        <Link
          href={prefix(dataset.basePath, "/store")}
          className="text-sm font-medium text-primary hover:underline"
        >
          See shop →
        </Link>
      </div>
      {list.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nothing published in the shop yet.
        </p>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((p) => (
            <Link
              key={p.id}
              href={prefix(dataset.basePath, `/store/${p.slug}`)}
              className="group block"
            >
              <Card className="h-full overflow-hidden py-0 transition-all group-hover:-translate-y-1 group-hover:shadow-lg">
                <div className="aspect-[16/10] overflow-hidden bg-muted">
                  {p.coverImageUrl ? (
                    <img
                      src={p.coverImageUrl}
                      alt={p.title}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                    />
                  ) : (
                    <div className="h-full w-full bg-gradient-to-br from-primary/20 to-accent/20" />
                  )}
                </div>
                <CardContent className="p-5">
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-primary">
                    {p.kind.replace(/-/g, " ")}
                  </span>
                  <h3 className="mt-2 line-clamp-2 font-semibold group-hover:text-primary">
                    {p.title}
                  </h3>
                  {p.subtitle && (
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{p.subtitle}</p>
                  )}
                  <p className="mt-3 border-t border-border pt-3 text-lg font-bold">
                    {p.priceLabel}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </SectionWrap>
  )
}

function Testimonials({
  section,
  dataset,
}: {
  section: PortalSection
  dataset: PortalDataset
}) {
  const c = section.config
  const heading = str(c.heading, "What students say")
  const source = str(c.source, "featured") as "all" | "featured"
  // Public surfaces only ever render testimonials the teacher has
  // explicitly approved. Student-submitted ones land with
  // status="pending" and stay hidden until the teacher publishes
  // them from /dashboard/portal/testimonials. Pre-status-field
  // records (undefined) treat as published for backwards compat.
  const approved = dataset.testimonials.filter(
    (t) => t.status === undefined || t.status === "published",
  )
  const list =
    source === "featured" ? approved.filter((t) => t.featured) : approved
  if (list.length === 0) return null
  return (
    <SectionWrap>
      <h2 className="mb-10 text-center font-serif text-3xl font-bold tracking-tight sm:text-4xl">
        {heading}
      </h2>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {list.slice(0, 9).map((t) => (
          <Card key={t.id} className="overflow-hidden py-0">
            {/* Media attachment — image or video above the quote */}
            {t.mediaUrl && t.mediaKind === "video" && (
              <div className="aspect-video bg-black">
                <video src={t.mediaUrl} controls className="h-full w-full object-contain" />
              </div>
            )}
            {t.mediaUrl && t.mediaKind === "image" && (
              <div className="aspect-video overflow-hidden bg-muted">
                <img src={t.mediaUrl} alt="" className="h-full w-full object-cover" />
              </div>
            )}
            {t.mediaUrl && t.mediaKind === "audio" && (
              <div className="border-b border-border bg-muted/30 px-4 py-3">
                <audio src={t.mediaUrl} controls className="w-full" />
              </div>
            )}
            <CardContent className="p-6">
              <Quote className="h-5 w-5 text-accent" />
              <p className="mt-3 text-sm leading-relaxed text-foreground/90">&ldquo;{t.quote}&rdquo;</p>
              {t.rating ? (
                <div className="mt-3 flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star
                      key={i}
                      className={cn(
                        "h-3.5 w-3.5",
                        i <= (t.rating ?? 0)
                          ? "fill-accent text-accent"
                          : "text-muted-foreground/30",
                      )}
                    />
                  ))}
                </div>
              ) : null}
              <div className="mt-4 flex items-center gap-3 border-t border-border pt-4">
                {t.avatar ? (
                  <img
                    src={t.avatar}
                    alt=""
                    className="h-9 w-9 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                    {t.authorName
                      .split(" ")
                      .map((p) => p[0])
                      .join("")
                      .slice(0, 2)}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{t.authorName}</p>
                  {t.authorRole && (
                    <p className="truncate text-xs text-muted-foreground">{t.authorRole}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </SectionWrap>
  )
}

function Faculty({
  section,
  dataset,
}: {
  section: PortalSection
  dataset: PortalDataset
}) {
  const c = section.config
  const heading = str(c.heading, "Meet the team")
  const mode = str(c.members, "all") as "all" | "hand-picked"
  const picks = arr<string>(c.pickedIds)
  let list = dataset.faculty.slice().sort((a, b) => (a.order ?? 99) - (b.order ?? 99))
  if (mode === "hand-picked") {
    list = picks
      .map((id) => list.find((m) => m.id === id))
      .filter((x): x is PortalFacultyMember => !!x)
  }
  if (list.length === 0) return null
  return (
    <SectionWrap>
      <h2 className="mb-10 text-center font-serif text-3xl font-bold tracking-tight sm:text-4xl">
        {heading}
      </h2>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((m) => (
          <Link
            key={m.id}
            href={prefix(dataset.basePath, `/instructors/${m.handle}`)}
            className="group block"
          >
            <Card className="overflow-hidden py-0 transition-shadow group-hover:shadow-lg">
              <div
                className="relative h-24 w-full bg-muted"
                style={
                  m.coverImageUrl
                    ? undefined
                    : { background: "linear-gradient(135deg, var(--primary), var(--accent))" }
                }
              >
                {m.coverImageUrl && (
                  <img src={m.coverImageUrl} alt="" className="h-full w-full object-cover" />
                )}
              </div>
              <CardContent className="-mt-8 p-5">
                <div className="flex items-end gap-3">
                  {m.photo ? (
                    <img
                      src={m.photo}
                      alt={m.name}
                      className="h-16 w-16 shrink-0 rounded-full object-cover ring-4 ring-card"
                    />
                  ) : (
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary text-lg font-semibold text-primary-foreground ring-4 ring-card">
                      {m.name
                        .split(" ")
                        .map((p) => p[0])
                        .join("")
                        .slice(0, 2)}
                    </div>
                  )}
                  <div className="min-w-0 pb-1">
                    <p className="truncate font-semibold group-hover:text-primary">{m.name}</p>
                    {m.role && (
                      <p className="truncate text-xs text-muted-foreground">{m.role}</p>
                    )}
                  </div>
                </div>
                {m.bio && (
                  <p className="mt-3 line-clamp-3 text-sm text-muted-foreground">{m.bio}</p>
                )}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </SectionWrap>
  )
}

function CTA({ section, basePath }: { section: PortalSection; basePath: string }) {
  const c = section.config
  const headline = str(c.headline, "Ready to start?")
  const subhead = str(c.subhead)
  const primary = obj(c.primaryCta) as { label?: string; href?: string }
  return (
    <SectionWrap>
      <Card className="overflow-hidden border-primary/20 bg-primary/[0.04]">
        <CardContent className="flex flex-col items-center justify-between gap-6 p-10 text-center sm:flex-row sm:text-left">
          <div className="flex-1">
            <h2 className="font-serif text-2xl font-bold tracking-tight sm:text-3xl">
              {headline}
            </h2>
            {subhead && <p className="mt-2 text-muted-foreground">{subhead}</p>}
          </div>
          {primary.label && primary.href && (
            <CtaButton href={primary.href} label={primary.label} basePath={basePath} />
          )}
        </CardContent>
      </Card>
    </SectionWrap>
  )
}

function RichTextSection({ section }: { section: PortalSection }) {
  const html = str(section.config.html)
  if (!html.trim()) return null
  return (
    <SectionWrap>
      <RichTextContent html={html} className="mx-auto max-w-3xl" />
    </SectionWrap>
  )
}

function FAQ({ section }: { section: PortalSection }) {
  const c = section.config
  const heading = str(c.heading, "Frequently asked")
  const items = arr<{ q?: string; a?: string }>(c.items)
  if (items.length === 0) return null
  return (
    <SectionWrap>
      <h2 className="mb-10 text-center font-serif text-3xl font-bold tracking-tight sm:text-4xl">
        {heading}
      </h2>
      <div className="mx-auto max-w-3xl divide-y divide-border rounded-lg border border-border bg-card">
        {items.map((it, i) => (
          <details key={i} className="group p-5">
            <summary className="flex cursor-pointer items-center justify-between font-medium">
              {str(it.q, "Question")}
              <ChevronDown className="h-4 w-4 transition group-open:rotate-180" />
            </summary>
            {it.a && (
              <p className="mt-3 text-sm text-muted-foreground whitespace-pre-wrap">{it.a}</p>
            )}
          </details>
        ))}
      </div>
    </SectionWrap>
  )
}

function Stats({ section }: { section: PortalSection }) {
  const items = arr<{ value?: string; label?: string }>(section.config.items)
  if (items.length === 0) return null
  return (
    <SectionWrap>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((it, i) => (
          <div key={i} className="rounded-lg border border-border bg-card p-6 text-center">
            <p className="text-3xl font-bold tracking-tight text-primary">
              {str(it.value, "0")}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">{str(it.label, "")}</p>
          </div>
        ))}
      </div>
    </SectionWrap>
  )
}

function ContactForm({
  section,
  dataset,
  pageSlug,
}: {
  section: PortalSection
  dataset: PortalDataset
  pageSlug: string
}) {
  const c = section.config
  const heading = str(c.heading, "Send a message")
  const successMessage = str(c.successMessage, "Thanks — we'll get back to you shortly.")
  // Field list comes as ["name","email","phone","message"] — used to
  // decide which inputs render and which are required.
  const fields = arr<string>(c.fields)
  const showName = fields.length === 0 || fields.includes("name")
  const showPhone = fields.includes("phone")

  return (
    <SectionWrap>
      <div className="mx-auto max-w-2xl">
        <h2 className="mb-6 text-center font-serif text-3xl font-bold tracking-tight sm:text-4xl">
          {heading}
        </h2>
        <ContactFormInner
          dataset={dataset}
          pageSlug={pageSlug}
          showName={showName}
          showPhone={showPhone}
          successMessage={successMessage}
        />
      </div>
    </SectionWrap>
  )
}

// Pulled out so the local form state doesn't reset on every parent render.
function ContactFormInner({
  dataset,
  pageSlug,
  showName,
  showPhone,
  successMessage,
}: {
  dataset: PortalDataset
  pageSlug: string
  showName: boolean
  showPhone: boolean
  successMessage: string
}) {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [message, setMessage] = useState("")
  const [subject, setSubject] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [sentAt, setSentAt] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Pre-fill subject from ?from=<product-or-course-title> on mount.
  // Visitors arriving from a course / store product carry the
  // origin in the query so the contact form lands with a useful
  // context line ("Question about React Fundamentals"). Big intent
  // signal for the teacher; zero typing for the visitor. Reading
  // from window so we don't have to thread search params through
  // every renderer.
  useEffect(() => {
    if (typeof window === "undefined") return
    const params = new URLSearchParams(window.location.search)
    const from = params.get("from")?.trim()
    if (!from) return
    setSubject(`Question about ${from}`)
    // Also seed message with the same context line — easier to keep
    // or delete than to compose from scratch.
    setMessage((cur) => cur || `Hi! I had a question about ${from}.\n\n`)
  }, [])

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!email.trim()) {
      setError("Email is required.")
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await dataset.submitLead({
        formId: "contact",
        pageSlug,
        name: name.trim() || undefined,
        email: email.trim(),
        phone: phone.trim() || undefined,
        // Merge subject into the message body since the lead schema
        // doesn't carry a separate subject field. Teacher sees both.
        message: [subject.trim(), message.trim()].filter(Boolean).join("\n\n") || undefined,
        // Tag the lead with the originating product/course so the
        // inbox can show "From: <X>" without re-parsing the body.
        fields: subject.trim() ? { subject: subject.trim() } : undefined,
      })
      setSentAt(new Date())
      setName(""); setEmail(""); setPhone(""); setMessage(""); setSubject("")
    } catch (err) {
      setError((err as Error).message ?? "Couldn't send. Try again.")
    } finally {
      setSubmitting(false)
    }
  }

  if (sentAt) {
    return (
      <div className="rounded-lg border border-success/40 bg-success/5 p-6 text-center">
        <CheckCircle2 className="mx-auto h-8 w-8 text-success" />
        <p className="mt-3 font-medium">{successMessage}</p>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-lg border border-border bg-card p-6">
      {showName && (
        <div>
          <label className="mb-1.5 block text-sm font-medium">Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            placeholder="Your name"
          />
        </div>
      )}
      <div>
        <label className="mb-1.5 block text-sm font-medium">Email <span className="text-destructive">*</span></label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          placeholder="you@example.com"
        />
      </div>
      {showPhone && (
        <div>
          <label className="mb-1.5 block text-sm font-medium">Phone</label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            placeholder="+1 555 0123"
          />
        </div>
      )}
      <div>
        <label className="mb-1.5 block text-sm font-medium">Subject</label>
        <input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          placeholder="What's this about?"
        />
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium">Message</label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={5}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          placeholder="What's on your mind?"
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
        {/* Reply-time reassurance — currently a static "within 24h"
            line. Once we wire it to the median reply latency from
            the doubts table this becomes data-driven. Lives next to
            the Submit button so the social-cost of asking is set
            right at the moment of decision. */}
        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          Typical reply within a day
        </span>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Sending…" : <>Send message <ArrowRight className="ml-1.5 h-4 w-4" /></>}
        </Button>
      </div>
    </form>
  )
}

function BlogTeaser({
  section,
  dataset,
}: {
  section: PortalSection
  dataset: PortalDataset
}) {
  const c = section.config
  const heading = str(c.heading, "From the blog")
  const limit = num(c.limit, 3)
  const list = dataset.posts
    .filter((p) => p.status === "published")
    .sort((a, b) => (b.publishedAt ?? b.createdAt).localeCompare(a.publishedAt ?? a.createdAt))
    .slice(0, limit)
  if (list.length === 0) return null
  return (
    <SectionWrap>
      <div className="mb-8 flex items-end justify-between gap-4">
        <h2 className="font-serif text-2xl font-bold tracking-tight sm:text-3xl">{heading}</h2>
        <Link
          href={prefix(dataset.basePath, "/blog")}
          className="text-sm font-medium text-primary hover:underline"
        >
          All posts →
        </Link>
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        {list.map((post) => (
          <Link
            key={post.id}
            href={prefix(dataset.basePath, `/blog/${post.slug}`)}
            className="group block"
          >
            <Card className="overflow-hidden py-0 transition-shadow group-hover:shadow-lg">
              {post.coverImage && (
                <div className="aspect-video overflow-hidden bg-muted">
                  <img
                    src={post.coverImage}
                    alt=""
                    className="h-full w-full object-cover transition-transform group-hover:scale-[1.03]"
                  />
                </div>
              )}
              <CardContent className="p-5">
                <h3 className="line-clamp-2 font-semibold group-hover:text-primary">
                  {post.title}
                </h3>
                {post.excerpt && (
                  <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">
                    {post.excerpt}
                  </p>
                )}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </SectionWrap>
  )
}

function VideoSection({ section }: { section: PortalSection }) {
  const c = section.config
  const source = str(c.source)
  const title = str(c.title)
  const caption = str(c.caption)
  if (!source) return null
  const embed = toEmbedUrl(source)
  return (
    <SectionWrap>
      {title && (
        <h2 className="mb-6 text-center font-serif text-2xl font-bold tracking-tight sm:text-3xl">
          {title}
        </h2>
      )}
      <div className="mx-auto aspect-video max-w-4xl overflow-hidden rounded-lg bg-black shadow-lg">
        {embed ? (
          <iframe
            src={embed}
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <video src={source} controls className="h-full w-full" />
        )}
      </div>
      {caption && (
        <p className="mx-auto mt-3 max-w-2xl text-center text-sm text-muted-foreground">
          {caption}
        </p>
      )}
    </SectionWrap>
  )
}

function toEmbedUrl(url: string): string | null {
  const yt = url.match(/(?:youtu\.be\/|youtube\.com\/watch\?v=|youtube\.com\/embed\/)([\w-]+)/)
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`
  const vimeo = url.match(/vimeo\.com\/(\d+)/)
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`
  return null
}

function ImageGallery({ section }: { section: PortalSection }) {
  const c = section.config
  const heading = str(c.heading)
  const images = arr<{ url?: string; caption?: string }>(c.images).filter((i) => i.url)
  if (images.length === 0) return null
  return (
    <SectionWrap>
      {heading && (
        <h2 className="mb-8 text-center font-serif text-3xl font-bold tracking-tight sm:text-4xl">
          {heading}
        </h2>
      )}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {images.map((img, i) => (
          <figure key={i} className="overflow-hidden rounded-lg border border-border bg-card">
            <img
              src={img.url}
              alt={str(img.caption, "")}
              className="aspect-[4/3] w-full object-cover transition hover:scale-[1.03]"
              loading="lazy"
            />
            {img.caption && (
              <figcaption className="px-3 py-2 text-xs text-muted-foreground">
                {img.caption}
              </figcaption>
            )}
          </figure>
        ))}
      </div>
    </SectionWrap>
  )
}

// Author-controlled trust badges. Each badge is { icon, label } —
// the icon name maps to a Lucide component via TRUST_ICONS below so
// teachers don't paste SVG. Default config seeds the same three
// claims that used to be hardcoded in the Hero, but every label is
// now editable so a tenant with a 14-day refund (or no refund at
// all) doesn't ship a lie on their home page.
const TRUST_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  "shield": ShieldCheck,
  "refresh": RefreshCw,
  "message": MessageCircle,
  "lock": Lock,
  "check": CheckCircle2,
  "star": Star,
  "globe": Globe,
  "award": Award,
}

function TrustBadges({ section }: { section: PortalSection }) {
  const c = section.config
  const heading = str(c.heading)
  const align = (str(c.align, "center") as "left" | "center" | "right")
  const variant = (str(c.variant, "row") as "row" | "cards")
  const items = arr<{ icon?: string; label?: string }>(c.items)
    .filter((i) => i.label && i.label.trim())
  if (items.length === 0) return null
  const alignClass =
    align === "left" ? "justify-start" :
      align === "right" ? "justify-end" :
        "justify-center"
  if (variant === "cards") {
    return (
      <SectionWrap className="py-10">
        {heading && (
          <p className={cn(
            "mb-6 text-xs font-medium uppercase tracking-wider text-muted-foreground",
            align === "left" ? "text-left" : align === "right" ? "text-right" : "text-center",
          )}>
            {heading}
          </p>
        )}
        <div className={cn(
          "grid gap-3",
          items.length === 1 && "grid-cols-1",
          items.length === 2 && "grid-cols-1 sm:grid-cols-2",
          items.length === 3 && "grid-cols-1 sm:grid-cols-3",
          items.length >= 4 && "grid-cols-2 sm:grid-cols-4",
        )}>
          {items.map((it, i) => {
            const Icon = TRUST_ICONS[str(it.icon, "check")] ?? CheckCircle2
            return (
              <div
                key={i}
                className="flex items-start gap-3 rounded-lg border border-border bg-card p-4"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <p className="text-sm font-medium leading-snug">{it.label}</p>
              </div>
            )
          })}
        </div>
      </SectionWrap>
    )
  }
  return (
    <SectionWrap className="py-8">
      {heading && (
        <p className={cn(
          "mb-4 text-xs font-medium uppercase tracking-wider text-muted-foreground",
          align === "left" ? "text-left" : align === "right" ? "text-right" : "text-center",
        )}>
          {heading}
        </p>
      )}
      <ul className={cn(
        "flex flex-wrap items-center gap-x-8 gap-y-2 text-sm text-muted-foreground",
        alignClass,
      )}>
        {items.map((it, i) => {
          const Icon = TRUST_ICONS[str(it.icon, "check")] ?? CheckCircle2
          return (
            <li key={i} className="inline-flex items-center gap-2">
              <Icon className="h-4 w-4 text-primary" />
              <span className="font-medium text-foreground">{it.label}</span>
            </li>
          )
        })}
      </ul>
    </SectionWrap>
  )
}

function LogosStrip({ section }: { section: PortalSection }) {
  const c = section.config
  const heading = str(c.heading)
  const logos = arr<{ url?: string; alt?: string }>(c.logos).filter((l) => l.url)
  const grayscale = !!c.grayscale
  if (logos.length === 0) return null
  return (
    <SectionWrap className="py-10">
      {heading && (
        <p className="mb-6 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {heading}
        </p>
      )}
      <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-6">
        {logos.map((l, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={i}
            src={l.url}
            alt={str(l.alt, "")}
            className={cn(
              "h-8 w-auto max-w-[140px] object-contain opacity-70 transition hover:opacity-100",
              grayscale && "grayscale hover:grayscale-0",
            )}
            loading="lazy"
          />
        ))}
      </div>
    </SectionWrap>
  )
}
