"use client"

// The portal's site-wide header. Layout dispatches on
// config.brand.headerLayout — one of the presets in
// lib/portal-layout-presets.ts. Each preset is a small variation on
// the same data (nav links + logo + optional CTA), not a separate set
// of features — so a teacher switching layouts never loses content.

import { useEffect, useState } from "react"
import Link from "next/link"
import { ChevronDown, GraduationCap, LogOut, Menu, ShoppingBag, X, ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"
import type { PortalConfig, PortalPage } from "@/lib/portal-store"
import { DEFAULT_HEADER_PRESET } from "@/lib/portal-layout-presets"
import { useLMS } from "@/lib/lms-store"
import { LanguagePicker } from "@/components/portal/language-picker"
import { useT, type Dictionary } from "@/lib/i18n"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface Props {
  tenant: string
  config: PortalConfig
  pages: PortalPage[]
  basePath: string
}

export function PortalSiteHeader({ tenant, config, pages, basePath }: Props) {
  const { t, tenantT } = useT()
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  const nav = config.nav ?? {}
  // When the teacher's curated nav.items is empty (the default), we
  // auto-build from pages + built-in tiles. When they've set items,
  // their explicit list wins — no auto-tiles, no surprises.
  const allLinks = (() => {
    if (nav.items && nav.items.length > 0) {
      // Each curated item is identified by index so the Languages
      // admin page can write per-locale overrides under
      // "nav.items.<index>.label". Falls back to the English label
      // the admin typed in the nav editor.
      return nav.items.map((it, idx) => ({
        label: tenantT(`nav.items.${idx}.label`, it.label),
        href: it.href.startsWith("/") ? `${basePath}${it.href === "/" ? "" : it.href}` : it.href,
      }))
    }
    const fromPages = pages
      .filter((p) => p.showInNav && p.status === "published")
      .sort((a, b) => {
        if (a.slug === "/") return -1
        if (b.slug === "/") return 1
        return (a.navOrder ?? 99) - (b.navOrder ?? 99) || (a.title || "").localeCompare(b.title || "")
      })
      .map((p) => ({
        // page.<id>.navLabel is the tenant-content key — translatable
        // from the Languages admin page. Falls back to the English
        // navLabel the admin typed (or the page title if they didn't).
        label: tenantT(`page.${p.id}.navLabel`, p.navLabel ?? p.title),
        href: `${basePath}${p.slug === "/" ? "" : p.slug}` || "/",
      }))
    // Built-in destinations, rendered in the teacher-configured order
    // (nav.builtInOrder) and gated by per-destination visibility flags.
    // Defaults to insertion order + Wall of Love off (opt-in).
    // Labels run through t() so a tenant in Hindi gets "कोर्सेज़"
    // for "Courses" automatically. The dictionary keys mirror the
    // English defaults so swapping locales is the only thing
    // needed — no per-tile translation work in the header.
    const BUILT_IN_DEFS: Record<string, { label: string; href: string; default: boolean; flag: keyof typeof nav }> = {
      courses:  { label: t("header.courses" as keyof Dictionary),      href: `${basePath}/courses`,  default: true,  flag: "showCourses" },
      teachers: { label: t("header.teachers" as keyof Dictionary), href: `${basePath}/instructors`, default: true, flag: "showTeachers" },
      store:    { label: t("header.shop" as keyof Dictionary),         href: `${basePath}/store`,    default: true,  flag: "showStore" },
      blog:     { label: t("header.blog" as keyof Dictionary),         href: `${basePath}/blog`,     default: true,  flag: "showBlog" },
      wall:     { label: t("header.wallOfLove" as keyof Dictionary),   href: `${basePath}/wall`,     default: false, flag: "showWall" },
    }
    const order = nav.builtInOrder && nav.builtInOrder.length > 0
      ? nav.builtInOrder
      : ["courses", "teachers", "store", "blog", "wall"]
    const builtIns: { label: string; href: string }[] = []
    for (const key of order) {
      const def = BUILT_IN_DEFS[key]
      if (!def) continue
      const v = nav[def.flag] as boolean | undefined
      const visible = v === undefined ? def.default : v
      if (visible) builtIns.push({ label: def.label, href: def.href })
    }
    return [...fromPages, ...builtIns, ...(config.headerExtraLinks ?? [])]
  })()

  const siteName = config.brand.siteName ?? tenant
  const logo = config.brand.logoUrl
  const layout = config.brand.headerLayout || DEFAULT_HEADER_PRESET
  // Any relative URL the teacher typed in the nav editor (e.g.
  // "/login", "/courses") must live UNDER /p/<tenant>/ on the public
  // portal — otherwise the CTA jumps the visitor out to the
  // platform's root login screen instead of the workspace's branded
  // one. Absolute URLs (https://…) pass through unchanged.
  const scopeHref = (href: string): string => {
    if (!href) return href
    if (/^[a-z][a-z0-9+.-]*:/i.test(href) || href.startsWith("//")) return href
    if (!href.startsWith("/")) return href
    if (basePath && href.startsWith(`${basePath}/`)) return href
    return `${basePath}${href === "/" ? "" : href}`
  }

  // Sprint A Brand #14 — returning-visitor detection. We set a
  // sticky flag after the visitor has spent >30s on the portal on
  // their first visit. On subsequent visits, the header swaps CTA
  // emphasis: returning anonymous visitors see a prominent Sign in
  // (they've been here, probably have an account), while new
  // visitors still see Enroll as primary. Hydration-safe: starts
  // false (matches SSR), flips after the 30s timer or on remount.
  const [isReturning, setIsReturning] = useState(false)
  useEffect(() => {
    try {
      // Already-flagged returning visitor (subsequent visit).
      if (window.localStorage.getItem("thebigclass.returningVisitor") === "1") {
        setIsReturning(true)
        return
      }
      // First visit: flag once they've stuck around 30s. The flag
      // is set in the timer callback so a hit-and-bounce visitor
      // doesn't get demoted to "returning" prematurely.
      const timer = window.setTimeout(() => {
        try { window.localStorage.setItem("thebigclass.returningVisitor", "1") } catch { /* ignore */ }
      }, 30 * 1000)
      return () => window.clearTimeout(timer)
    } catch {
      /* private browsing — treat as new visitor every time */
    }
  }, [])

  // Explicit nav CTAs win over the legacy "first extra link is CTA" path.
  // Both labels run through tenantT so the admin can translate the
  // exact string they typed in the nav editor (e.g. "Enroll Now" →
  // "अभी नामांकन करें") without changing the underlying config.
  const rawPrimaryCta = nav.primaryCta ?? config.headerExtraLinks?.[0]
  const primaryCta = rawPrimaryCta
    ? {
        ...rawPrimaryCta,
        label: tenantT("nav.primaryCta.label", rawPrimaryCta.label),
        href: scopeHref(rawPrimaryCta.href),
      }
    : undefined
  // Anonymous visitors get an automatic "Sign in" secondary CTA so
  // every page in the portal carries an obvious way back to the
  // login surface. Once they sign in, the slot returns to the
  // teacher-configured secondary CTA (if any) — we never overwrite
  // an explicit choice. Hydration-safe: useLMS().currentUser is
  // null until the store hydrates from localStorage, so the
  // initial render matches the SSR'd "no user" state.
  const { currentUser } = useLMS()
  const rawSecondaryCta =
    nav.secondaryCta ??
    (currentUser ? undefined : { label: t("header.signIn" as keyof Dictionary), href: `${basePath}/login` })
  const secondaryCta = rawSecondaryCta
    ? {
        ...rawSecondaryCta,
        label: tenantT("nav.secondaryCta.label", rawSecondaryCta.label),
        href: scopeHref(rawSecondaryCta.href),
      }
    : undefined

  // Sprint A Brand #14 — for returning anonymous visitors, promote
  // Sign in to primary and demote the teacher-set primary (if any)
  // to secondary. We only swap when:
  //   • The visitor is anonymous (signed-in users never see auth CTAs).
  //   • The auto-generated "Sign in" secondary is in play (we don't
  //     override an explicit teacher-configured secondary).
  //   • The visitor is flagged returning.
  // This is conservative on purpose: misclassifying a new visitor as
  // returning costs us the Enroll click; the reverse is recoverable
  // (they sign in elsewhere). The 30s threshold above is the safety.
  const shouldSwapCtas =
    !currentUser &&
    isReturning &&
    !nav.secondaryCta && // teacher didn't set a custom secondary
    !!primaryCta
  const finalPrimary = shouldSwapCtas
    ? { label: t("header.signIn" as keyof Dictionary), href: `${basePath}/login` }
    : primaryCta
  const finalSecondary = shouldSwapCtas
    ? primaryCta // demote the original primary to a quiet link
    : secondaryCta

  // Marquee variant prepends a thin promo row above the standard
  // split layout. Reuses the announcementBar's message + cta — feels
  // duplicative if both are set, so we hide if no message.
  const marqueeMessage = config.announcementBar.message

  return (
    <>
      {layout === "marquee-promo" && marqueeMessage && (
        <div className="overflow-hidden border-b border-border bg-primary py-1.5 text-xs text-primary-foreground">
          <div className="animate-[marquee_30s_linear_infinite] whitespace-nowrap">
            <span className="mx-8 inline-block">{marqueeMessage}</span>
            <span className="mx-8 inline-block">{marqueeMessage}</span>
            <span className="mx-8 inline-block">{marqueeMessage}</span>
            <span className="mx-8 inline-block">{marqueeMessage}</span>
          </div>
        </div>
      )}

      <header
        className={cn(
          "z-40 transition-all",
          layout === "sticky-pill"
            ? "sticky top-3 mx-auto mt-3 w-[min(1100px,calc(100%-1.5rem))] rounded-full border border-border bg-background/90 px-2 shadow-md backdrop-blur"
            : "sticky top-0 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80",
          scrolled && layout !== "sticky-pill" && "shadow-sm",
        )}
      >
        {layout === "centered-minimal" ? (
          <CenteredMinimal
            siteName={siteName}
            logo={logo}
            basePath={basePath}
            allLinks={allLinks}
          />
        ) : layout === "logo-only" ? (
          <LogoOnly
            siteName={siteName}
            logo={logo}
            basePath={basePath}
            allLinks={allLinks}
            open={open}
            setOpen={setOpen}
          />
        ) : layout === "split-with-cta" ? (
          <SplitWithCta
            siteName={siteName}
            logo={logo}
            basePath={basePath}
            allLinks={allLinks}
                primaryCta={finalPrimary ?? { label: t("header.enroll" as keyof Dictionary), href: `${basePath}/courses` }}
                secondaryCta={finalSecondary}
            open={open}
            setOpen={setOpen}
          />
        ) : (
          // split-classic / sticky-pill / marquee-promo (the marquee
          // adds the strip above; the inner row is the same split).
          <SplitClassic
            siteName={siteName}
            logo={logo}
            basePath={basePath}
            allLinks={allLinks}
                  primaryCta={finalPrimary}
                  secondaryCta={finalSecondary}
            open={open}
            setOpen={setOpen}
            pill={layout === "sticky-pill"}
          />
        )}

        {/* Mobile menu drops below for variants that opt in */}
        {open && (
          <div className="border-t border-border md:hidden">
            <nav className="flex flex-col gap-1 px-4 py-3">
              {finalPrimary && (
                <Link
                  key="primary-cta"
                  href={finalPrimary.href}
                  onClick={() => setOpen(false)}
                  className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground text-center"
                >
                  {finalPrimary.label}
                </Link>
              )}
              {finalSecondary && (
                <Link
                  key="secondary-cta"
                  href={finalSecondary.href}
                  onClick={() => setOpen(false)}
                  className="rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground text-center"
                >
                  {finalSecondary.label}
                </Link>
              )}
              {allLinks.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="rounded-md px-3 py-2 text-sm font-medium text-foreground/80 hover:bg-muted hover:text-primary"
                >
                  {l.label}
                </Link>
              ))}
            </nav>
          </div>
        )}
      </header>

      {/* The CSS for the marquee — kept inline since it's not used
          anywhere else and we don't want to pollute globals.css. */}
      {layout === "marquee-promo" && (
        <style>{`@keyframes marquee {from {transform: translateX(0)} to {transform: translateX(-50%)}}`}</style>
      )}
    </>
  )
}

// ============================================================
// Layout variants
// ============================================================

function Logo({
  siteName,
  logo,
  basePath,
  size = "md",
}: {
  siteName: string
  logo?: string
  basePath: string
  size?: "sm" | "md"
}) {
  const dim = size === "sm" ? "h-7" : "h-8"
  return (
    <Link href={basePath || "/"} className="flex items-center gap-2.5">
      {logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logo} alt={siteName} className={cn(dim, "w-auto max-w-[160px] object-contain")} />
      ) : (
        <span className={cn("flex items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground", dim, "w-8")}>
          {siteName.slice(0, 1).toUpperCase()}
        </span>
      )}
      <span className="font-semibold tracking-tight">{siteName}</span>
    </Link>
  )
}

function NavRow({ links, className }: { links: { label: string; href: string }[]; className?: string }) {
  return (
    <nav className={cn("hidden items-center gap-6 md:flex", className)}>
      {links.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className="text-sm font-medium text-foreground/80 transition hover:text-primary"
        >
          {l.label}
        </Link>
      ))}
    </nav>
  )
}

function MobileToggle({ open, setOpen }: { open: boolean; setOpen: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => setOpen(!open)}
      className="rounded-md p-2 text-foreground/70 hover:bg-muted md:hidden"
      aria-label="Toggle navigation"
    >
      {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
    </button>
  )
}

interface CtaLink { label: string; href: string }
interface LayoutProps {
  siteName: string
  logo?: string
  basePath: string
  allLinks: { label: string; href: string }[]
  open: boolean
  setOpen: (v: boolean) => void
  primaryCta?: CtaLink
  secondaryCta?: CtaLink
}

// Small helper — renders the optional secondary / primary CTAs +
// the signed-in account menu on desktop. Mobile leaves them out
// (they'd duplicate links the hamburger menu already exposes).
function HeaderCtas({
  primary,
  secondary,
  basePath,
}: {
  primary?: CtaLink
  secondary?: CtaLink
  basePath?: string
}) {
  const { currentUser } = useLMS()
  if (!primary && !secondary && !currentUser) return null
  return (
    <div className="hidden items-center gap-2 md:flex">
      {currentUser && <AccountMenu basePath={basePath ?? ""} />}
      {secondary && (
        <Link
          href={secondary.href}
          className="rounded-md border border-border px-3.5 py-2 text-sm font-semibold text-foreground transition hover:border-primary/40 hover:text-primary"
        >
          {secondary.label}
        </Link>
      )}
      {primary && (
        <Link
          href={primary.href}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
        >
          {primary.label}
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </div>
  )
}

function SplitClassic({ siteName, logo, basePath, allLinks, open, setOpen, pill, primaryCta, secondaryCta }: LayoutProps & { pill?: boolean }) {
  return (
    <div className={cn("mx-auto flex max-w-6xl items-center justify-between gap-4", pill ? "px-3 py-2" : "px-6 py-3 lg:px-8")}>
      <Logo siteName={siteName} logo={logo} basePath={basePath} size={pill ? "sm" : "md"} />
      <NavRow links={allLinks} />
      <div className="flex items-center gap-2">
        <LanguagePicker />
        <HeaderCtas primary={primaryCta} secondary={secondaryCta} basePath={basePath} />
        <MobileToggle open={open} setOpen={setOpen} />
      </div>
    </div>
  )
}

function CenteredMinimal({
  siteName,
  logo,
  basePath,
  allLinks,
}: {
  siteName: string
  logo?: string
  basePath: string
  allLinks: { label: string; href: string }[]
}) {
  return (
    <div className="mx-auto max-w-6xl px-6 py-4 lg:px-8">
      <div className="flex justify-center">
        <Logo siteName={siteName} logo={logo} basePath={basePath} />
      </div>
      <nav className="mt-3 flex flex-wrap justify-center gap-x-6 gap-y-2">
        {allLinks.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="text-sm font-medium text-foreground/80 transition hover:text-primary"
          >
            {l.label}
          </Link>
        ))}
      </nav>
    </div>
  )
}

function LogoOnly({ siteName, logo, basePath, open, setOpen }: LayoutProps) {
  return (
    <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3 lg:px-8">
      <Logo siteName={siteName} logo={logo} basePath={basePath} />
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="rounded-md p-2 text-foreground/70 hover:bg-muted"
        aria-label="Toggle navigation"
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>
    </div>
  )
}

function SplitWithCta({
  siteName,
  logo,
  basePath,
  allLinks,
  primaryCta,
  secondaryCta,
  open,
  setOpen,
}: LayoutProps) {
  return (
    <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3 lg:px-8">
      <Logo siteName={siteName} logo={logo} basePath={basePath} />
      <NavRow links={allLinks} className="flex-1 justify-center" />
      <div className="flex items-center gap-2">
        <LanguagePicker />
        <HeaderCtas primary={primaryCta} secondary={secondaryCta} basePath={basePath} />
        <MobileToggle open={open} setOpen={setOpen} />
      </div>
    </div>
  )
}

// Signed-in account dropdown shown in the portal header. Mirrors the
// avatar-menu pattern from the dashboard sidebar but with student-
// oriented destinations (their learning hub + library + sign out).
// basePath is the tenant prefix (e.g. "/p/maths-academy"), so links
// stay inside the tenant brand.
function AccountMenu({ basePath }: { basePath: string }) {
  const { currentUser, setCurrentUser } = useLMS()
  if (!currentUser) return null
  const initial = (currentUser.name?.trim()?.[0] ?? currentUser.email?.[0] ?? "?").toUpperCase()
  const learningHref = `${basePath}/my`
  const libraryHref = `${basePath}/library`
  const signOutHref = `${basePath}/login`
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-2 py-1 text-sm font-medium text-foreground transition hover:border-primary/40 hover:text-primary"
          aria-label="Account menu"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
            {initial}
          </span>
          <span className="hidden max-w-[120px] truncate lg:inline">{currentUser.name || currentUser.email}</span>
          <ChevronDown className="h-3.5 w-3.5 opacity-70" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem asChild>
          <Link href={learningHref} className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4" />
            My learning
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={libraryHref} className="flex items-center gap-2">
            <ShoppingBag className="h-4 w-4" />
            My library
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link
            href={signOutHref}
            onClick={() => setCurrentUser(null)}
            className="flex items-center gap-2 text-destructive focus:text-destructive"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
