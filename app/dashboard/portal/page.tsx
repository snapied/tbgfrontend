"use client"

// Portal overview — the control center for the customer portal. Three
// big sections:
//
//   1. Hero: live iframe of /p/[tenant] with device toggle. The
//      teacher should be able to feel the site immediately on open.
//   2. Setup checklist + stats: what's done, what's next, by the
//      numbers (faculty, testimonials, posts, leads).
//   3. Configure grid: every tool that ships with the portal, with a
//      one-line description, so the teacher can navigate without
//      reading the sidebar.

import Link from "next/link"
import {
  Megaphone,
  Globe,
  Heart,
  BookOpen,
  Users,
  MessageSquare,
  Palette,
  UserPlus,
  ArrowRight,
  Sparkles,
  ExternalLink as ExternalLinkIcon,
  FileText,
  CheckCircle2,
  AlertCircle,
  Home,
  ShoppingBag,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { usePortal } from "@/lib/portal-store"
import { useTenant } from "@/lib/tenant-store"
import { useOrgSettings } from "@/lib/org-settings"
import { useLMS } from "@/lib/lms-store"
import { PortalLivePreview } from "@/components/portal/portal-live-preview"
import { cn } from "@/lib/utils"
import { ProductTour, TakeATourButton, type TourStep } from "@/components/tour/product-tour"

const PORTAL_TOUR: TourStep[] = [
  {
    title: "Your branded public site",
    body: "Everything visitors see — home, pages, blog, brand, faculty, announcements — is managed here. The preview on this page is live.",
    emoji: "🌐",
    placement: "center",
  },
  {
    target: "[data-tour='portal-open']",
    title: "Open the live site",
    body: "Pops your public portal in a new tab. Share the link with students once you're happy.",
    emoji: "🚀",
    placement: "left",
  },
  {
    target: "[data-tour='portal-preview']",
    title: "Live preview",
    body: "The actual public site rendered in an iframe. Toggle device sizes, refresh after any brand change.",
    emoji: "👀",
    placement: "right",
  },
  {
    target: "[data-tour='portal-checklist']",
    title: "Setup checklist",
    body: "Quick punch-list to a polished portal: brand, profile, faculty, first course, testimonials, blog, announcements.",
    emoji: "✅",
    placement: "top",
  },
  {
    target: "[data-tour='portal-tools']",
    title: "Everything you can configure",
    body: "Brand, pages, faculty, testimonials, blog, announcements, leads, domain — one tile each. Click to jump in.",
    emoji: "🛠️",
    placement: "top",
  },
  {
    title: "Bonus: storefront auto-lists too",
    body: "Anything you publish in /dashboard/store shows up automatically on the public Shop page.",
    emoji: "🛍️",
    placement: "center",
  },
]

const TILES = [
  { name: "Home page", desc: "Hero, welcome, CTAs, sections.", href: "/dashboard/portal/home", icon: Home },
  { name: "Pages", desc: "About, privacy, terms, custom.", href: "/dashboard/portal/pages", icon: FileText },
  { name: "Brand", desc: "Logo, colors, fonts, favicon.", href: "/dashboard/portal/brand", icon: Palette },
  { name: "Public profile", desc: "Your photo, bio, social links.", href: "/dashboard/portal/profile", icon: UserPlus },
  { name: "Testimonials", desc: "Student quotes + ratings.", href: "/dashboard/portal/testimonials", icon: Heart },
  { name: "Blog", desc: "Write articles, drive SEO.", href: "/dashboard/portal/blog", icon: BookOpen },
  { name: "Storefront on portal", desc: "Auto-listed from /dashboard/store.", href: "/dashboard/store", icon: ShoppingBag },
  { name: "Announcements", desc: "Top bar + targeted popups.", href: "/dashboard/portal/announcements", icon: Megaphone },
  { name: "Lead inbox", desc: "Form submissions land here.", href: "/dashboard/portal/leads", icon: MessageSquare },
  { name: "Domain & URL", desc: "Subdomain or custom domain.", href: "/dashboard/portal/domain", icon: ExternalLinkIcon },
]

export default function PortalOverviewPage() {
  const { currentTenant } = useTenant()
  const { settings } = useOrgSettings()
  const { config, faculty, testimonials, posts, leads, pages } = usePortal()
  const { currentUser, courses } = useLMS()
  const tenantSlug = currentTenant?.slug ?? ""
  const portalUrl = tenantSlug ? `/p/${tenantSlug}` : "/"

  // Effective brand (mirrors the Brand page) — covers the case where
  // the user hasn't explicitly saved any portal brand fields yet, AND
  // the case where they cleared a field (which persists as "" — ??
  // wouldn't fall back, so we treat empty strings as missing).
  const tenantBranding = currentTenant?.branding ?? {}
  const firstNonEmpty = (...xs: (string | undefined)[]) =>
    xs.find((x) => x && x.trim()) ?? ""
  const effectiveSiteName =
    firstNonEmpty(
      config.brand.siteName,
      settings.organisationName,
      currentTenant?.name,
    ) || "Your site"
  const effectiveLogo = firstNonEmpty(
    config.brand.logoUrl,
    settings.logoUrl,
    tenantBranding.logoUrl,
  )
  const effectivePrimary =
    firstNonEmpty(
      config.brand.primaryColor,
      settings.brandPrimaryColor,
      tenantBranding.primaryColor,
    ) || "var(--primary)"
  const effectiveAccent =
    firstNonEmpty(
      config.brand.accentColor,
      settings.brandAccentColor,
      tenantBranding.accentColor,
    ) || "var(--accent)"

  const publishedPosts = posts.filter((p) => p.status === "published").length
  const publishedCourses = courses.filter((c) => c.status === "published").length
  const newLeads = leads.filter((l) => l.status === "new").length

  const stats = [
    { label: "Courses", value: publishedCourses, href: "/dashboard/courses", icon: BookOpen },
    { label: "Instructors", value: faculty.length, href: "/dashboard/portal/faculty", icon: Users },
    { label: "Testimonials", value: testimonials.length, href: "/dashboard/portal/testimonials", icon: Heart },
    { label: "Blog posts", value: publishedPosts, href: "/dashboard/portal/blog", icon: BookOpen },
    { label: "New leads", value: newLeads, href: "/dashboard/portal/leads", icon: MessageSquare },
    { label: "Pages", value: pages.length, href: "/dashboard/portal", icon: FileText },
  ]

  const hasBrand = !!(config.brand.logoUrl || config.brand.primaryColor || config.brand.siteName || settings.logoUrl)
  const hasProfile = !!(currentUser?.avatar || currentUser?.bio)
  const hasAnnouncement = config.announcementBar.enabled && !!config.announcementBar.message.trim()
  const checklist = [
    { done: hasBrand, label: "Set your brand", hint: "Logo, primary + accent colors", href: "/dashboard/portal/brand" },
    { done: hasProfile, label: "Fill in your public profile", hint: "Photo, bio, socials", href: "/dashboard/portal/profile" },
    { done: faculty.length > 0, label: "Add at least one faculty member", hint: "Yourself + any co-teachers", href: "/dashboard/portal/faculty" },
    { done: publishedCourses > 0, label: "Publish a course", hint: "Visitors land on the courses grid", href: "/dashboard/courses" },
    { done: testimonials.length > 0, label: "Add a student testimonial", hint: "Social proof", href: "/dashboard/portal/testimonials" },
    { done: publishedPosts > 0, label: "Publish your first blog post", hint: "Drives SEO traffic", href: "/dashboard/portal/blog" },
    { done: hasAnnouncement, label: "Turn on an announcement", hint: "Optional — promo strip on every page", href: "/dashboard/portal/announcements" },
  ]
  const completed = checklist.filter((i) => i.done).length
  const completionPct = Math.round((completed / checklist.length) * 100)

  return (
    <div className="space-y-8">
      <ProductTour tourId="portal-v1" steps={PORTAL_TOUR} />
      {/* ============================== Header ============================== */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            Customer Portal
          </div>
          <h1 className="mt-3 font-serif text-3xl font-bold tracking-tight">
            Your branded public site
          </h1>
          <p className="mt-1.5 max-w-2xl text-muted-foreground">
            Everything visitors see — pages, brand, faculty, blog, announcements — lives here. The
            preview below is live: edits anywhere in this section show up the next time the iframe
            refreshes.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <TakeATourButton tourId="portal-v1" />
          <Button asChild size="lg" data-tour="portal-open">
            <a href={portalUrl} target="_blank" rel="noopener noreferrer">
              Open site
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </a>
          </Button>
        </div>
      </div>

      {/* ============================== Live preview + brand snapshot ============================== */}
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card className="overflow-hidden" data-tour="portal-preview">
          <CardHeader>
            <CardTitle>Live preview</CardTitle>
            <CardDescription>
              The actual public site, rendered in an iframe. Toggle devices, hit refresh after a brand change.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {tenantSlug ? (
              <PortalLivePreview tenant={tenantSlug} />
            ) : (
              <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                Tenant not yet loaded. Hold on a moment.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Brand snapshot card */}
        <Card>
          <CardHeader>
            <CardTitle>Current brand</CardTitle>
            <CardDescription>What your site is rendering today.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-border bg-card p-4">
              {effectiveLogo ? (
                <img
                  src={effectiveLogo}
                  alt={effectiveSiteName}
                  className="mb-3 h-8 w-auto max-w-[160px] object-contain"
                />
              ) : (
                <span
                  className="mb-3 inline-flex h-8 w-8 items-center justify-center rounded-md text-sm font-bold text-white"
                  style={{ background: effectivePrimary }}
                >
                  {effectiveSiteName.slice(0, 1).toUpperCase()}
                </span>
              )}
              <p className="font-serif text-lg font-bold tracking-tight">{effectiveSiteName}</p>
              {(config.brand.tagline ?? settings.tagline ?? tenantBranding.tagline) && (
                <p className="text-xs text-muted-foreground">
                  {config.brand.tagline ?? settings.tagline ?? tenantBranding.tagline}
                </p>
              )}
              <div className="mt-3 flex items-center gap-2">
                <Swatch color={effectivePrimary} label="Primary" />
                <Swatch color={effectiveAccent} label="Accent" />
              </div>
            </div>
            <Button asChild variant="outline" className="w-full">
              <Link href="/dashboard/portal/brand">
                <Palette className="mr-1.5 h-4 w-4" /> Edit brand
              </Link>
            </Button>

            {/* Health checks */}
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Health checks
              </p>
              <ul className="mt-2 space-y-1.5 text-xs">
                <HealthRow ok={hasBrand} label="Brand configured" />
                <HealthRow ok={hasProfile} label="Public profile filled" />
                <HealthRow ok={publishedCourses > 0} label="At least one published course" />
                <HealthRow ok={faculty.length > 0} label="Faculty showcase populated" />
                <HealthRow ok={!!effectiveLogo} label="Logo uploaded" />
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ============================== Stats row ============================== */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className="block">
            <Card className="transition-all hover:-translate-y-0.5 hover:shadow-md">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <p className="text-2xl font-bold tracking-tight text-primary">{s.value}</p>
                  <s.icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="mt-1 text-[11px] uppercase tracking-wide text-muted-foreground">{s.label}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* ============================== Setup checklist ============================== */}
      <Card data-tour="portal-checklist">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle>Setup progress</CardTitle>
              <CardDescription>
                {completed === checklist.length
                  ? "You're set — your portal is fully configured."
                  : `${completed} of ${checklist.length} steps done. Finish these for a polished public site.`}
              </CardDescription>
            </div>
            <div className="text-3xl font-bold tracking-tight">{completionPct}%</div>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${completionPct}%` }}
            />
          </div>
        </CardHeader>
        <CardContent>
          <ul className="grid gap-1.5 sm:grid-cols-2">
            {checklist.map((item) => (
              <li key={item.label}>
                <Link
                  href={item.href}
                  className="group flex items-start gap-3 rounded-md p-2 hover:bg-muted/50"
                >
                  <span
                    className={
                      item.done
                        ? "mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-success text-[10px] font-bold text-success-foreground"
                        : "mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-muted-foreground/25 text-muted-foreground"
                    }
                  >
                    {item.done ? "✓" : ""}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={cn("block text-sm font-medium", item.done && "text-muted-foreground line-through")}>
                      {item.label}
                    </span>
                    <span className="block text-xs text-muted-foreground">{item.hint}</span>
                  </span>
                  <ArrowRight className="mt-1 h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition group-hover:opacity-100" />
                </Link>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* ============================== Page list ============================== */}
      <Card>
        <CardHeader>
          <CardTitle>Pages</CardTitle>
          <CardDescription>
            Every page on your public site. Edit copy and sections from the Brand page for now;
            full page builder lands in a follow-up release.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="divide-y divide-border rounded-md border border-border">
            {pages.map((p) => (
              <div key={p.id} className="flex items-center gap-3 px-4 py-3">
                <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{p.title}</p>
                  <p className="truncate font-mono text-[11px] text-muted-foreground">
                    {p.slug === "/" ? "(home)" : p.slug}
                  </p>
                </div>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                    p.status === "published"
                      ? "bg-success/15 text-success"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {p.status}
                </span>
                <span className="text-[11px] text-muted-foreground">{p.sections.length} sections</span>
                <Button variant="ghost" size="sm" asChild>
                  <a href={`${portalUrl}${p.slug === "/" ? "" : p.slug}`} target="_blank" rel="noopener noreferrer">
                    View <ArrowRight className="ml-1 h-3 w-3" />
                  </a>
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ============================== Tiles ============================== */}
      <div data-tour="portal-tools">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Configure
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {TILES.map((t) => (
            <Link key={t.href} href={t.href} className="group block">
              <Card className="h-full transition-all hover:-translate-y-0.5 hover:shadow-md">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <t.icon className="h-5 w-5" />
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition group-hover:opacity-100" />
                  </div>
                  <h3 className="mt-3 font-semibold group-hover:text-primary">{t.name}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{t.desc}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* ============================== Live URL card ============================== */}
      <Card className="overflow-hidden border-primary/20 bg-primary/[0.04]">
        <CardContent className="flex flex-col items-start justify-between gap-4 p-6 sm:flex-row sm:items-center">
          <div className="flex items-start gap-3">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Globe className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold">Your live site URL</h3>
              <p className="text-sm text-muted-foreground">
                Share <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">{portalUrl}</code> with prospective students. Add a custom domain in Portal → Domain.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline">
              <Link href="/dashboard/portal/domain">Set up domain</Link>
            </Button>
            <Button asChild>
              <a href={portalUrl} target="_blank" rel="noopener noreferrer">
                Open site
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function Swatch({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span
        className="h-5 w-5 rounded border border-border"
        style={{ background: color }}
      />
      <span className="text-[11px] text-muted-foreground">{label}</span>
    </div>
  )
}

function HealthRow({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li className="flex items-center gap-2">
      {ok ? (
        <CheckCircle2 className="h-3.5 w-3.5 text-success" />
      ) : (
        <AlertCircle className="h-3.5 w-3.5 text-muted-foreground" />
      )}
      <span className={ok ? "text-foreground" : "text-muted-foreground"}>{label}</span>
    </li>
  )
}
