"use client"

// Shell for every /p/[tenant]/* page. Wires up the PortalThemeProvider
// (so the tenant's brand colors paint everything below), site header,
// announcement bar, popups, and footer. Each child page focuses on its
// section content — chrome lives here.

import { use, useMemo } from "react"
import { usePathname } from "next/navigation"
import { PortalThemeProvider } from "@/components/portal/portal-theme-provider"
import { PortalSiteHeader } from "@/components/portal/site-header"
import { PortalSiteFooter } from "@/components/portal/site-footer"
import { AnnouncementBar } from "@/components/portal/announcement-bar"
import { Popup } from "@/components/portal/popup"
import { PortalAnalyticsScripts } from "@/components/portal/portal-analytics"
import { usePortal, type PortalConfig } from "@/lib/portal-store"
import { resolveLiveBrand } from "@/lib/portal-templates"
import { useTenant } from "@/lib/tenant-store"
import { usePlan } from "@/lib/use-plan"
import { DynamicMeta } from "@/components/seo/dynamic-meta"
import { I18nProvider, type Locale } from "@/lib/i18n"
import type { Dictionary } from "@/lib/i18n"
import { useAttributionCapture } from "@/lib/attribution"
import { WishlistTray } from "@/components/portal/wishlist-tray"
import { BackToTop } from "@/components/portal/back-to-top"
import { SkipToContent } from "@/components/accessibility/skip-to-content"

export default function PortalLayoutClient({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ tenant: string }>
}) {
  const { tenant } = use(params)
  const { config, pages } = usePortal()
  const { currentTenant } = useTenant()
  const { limits: planLimits } = usePlan()
  const pathname = usePathname() ?? "/"

  // Capture attribution once per session. Hook is idempotent — multiple
  // remounts inside the same session do not overwrite the touch chain.
  // First-touch is preserved forever; subsequent visits with fresh
  // UTMs or a foreign referrer append to the chain.
  useAttributionCapture({ tenantSlug: tenant })
  const basePath = `/p/${tenant}`
  // Strip the /p/[tenant] prefix to get the "logical" page slug ("/",
  // "/about", "/blog/foo") so the popup config can scope by slug.
  const pageSlug = pathname.startsWith(basePath)
    ? pathname.slice(basePath.length) || "/"
    : "/"

  // Zen routes — surfaces that should take the entire viewport with no
  // portal chrome (announcement bar, site header, footer, popups).
  //   • /live/* — the call / waiting room takes the screen.
  //   • /my/*  — the signed-in student dashboard owns the layout
  //     (sidebar + breadcrumbs + command palette). Stacking the
  //     marketing header on top of dashboard chrome looks broken.
  const isZenRoute = pageSlug.startsWith("/live/") || pageSlug.startsWith("/my")

  // Onboarding-aware brand. Falls back through Portal → OrgSettings →
  // Tenant.branding so an existing workspace shows its real identity
  // on the public site without needing a save first. We treat empty
  // strings as missing (not just undefined) because the dashboard form
  // persists "" when a field is cleared, and ?? would let that win
  // over the onboarding values.
  const tenantBranding = currentTenant?.branding ?? {}
  const firstNonEmpty = (...xs: (string | undefined)[]) =>
    xs.find((x) => x && x.trim())
  // Important: spread `config.brand` FIRST so fields not in the
  // fallback chain (headerLayout, footerLayout, customFonts, …) survive.
  // The earlier version rebuilt the object key-by-key and silently
  // dropped them — that's why header/footer layout pickers seemed to
  // do nothing.
  const effectiveConfig = useMemo<PortalConfig>(() => {
    // Active template id is stored on PortalConfig as a free-form
    // extra. When present, resolveLiveBrand swaps in the LATEST
    // template-controlled fields (colour palette, customCss, layout
    // presets) so platform-side template fixes / new theme variables
    // reach existing tenants without forcing a re-apply.
    const activeTemplateId = (config as { activeTemplateId?: string }).activeTemplateId
    const liveBrand = resolveLiveBrand(config.brand, activeTemplateId)
    // Fallback chain for the *public portal* brand:
    //   1. What the teacher typed into the portal brand editor
    //   2. What's on the Tenant record (set at signup)
    //   3. The tenant slug itself, title-cased
    // We deliberately do NOT mix in OrgSettings (org-settings.tsx) here.
    // That store powers certificates + cert-issuer identity and tends to
    // carry stale "first workspace" values (e.g. "Snapied") because of
    // an older legacy-key migration. Using it as a portal-brand fallback
    // made every new tenant look like the previous one. Cert flows
    // continue to read OrgSettings directly.
    return {
      ...config,
      brand: {
        ...liveBrand,
        siteName: firstNonEmpty(
          liveBrand.siteName,
          currentTenant?.name,
        ),
        tagline: firstNonEmpty(
          liveBrand.tagline,
          tenantBranding.tagline,
        ),
        logoUrl: firstNonEmpty(
          liveBrand.logoUrl,
          tenantBranding.logoUrl,
        ),
        primaryColor: firstNonEmpty(
          liveBrand.primaryColor,
          tenantBranding.primaryColor,
        ),
        accentColor: firstNonEmpty(
          liveBrand.accentColor,
          tenantBranding.accentColor,
        ),
      },
    }
  }, [config, tenantBranding, currentTenant?.name])

  // Default tenant-level SEO. Every tenant page inherits these values
  // so the browser tab / share preview reads as the tenant's site,
  // not "The Big Class …". Individual pages (blog posts, course
  // details, etc.) mount their own <DynamicMeta /> with a more
  // specific title/description and the most-recently-mounted instance
  // wins — without losing the tenant defaults on cleanup.
  const brandName = effectiveConfig.brand.siteName || currentTenant?.name || "Customer portal"
  const brandTagline = effectiveConfig.brand.tagline
  const brandLogo = effectiveConfig.brand.logoUrl
  // Share image preference order: explicit ogImage (auto-generated
  // from Brand → Share card OR hand-uploaded) > logo > nothing.
  // We avoid sending an empty `image` because some scrapers cache
  // the empty value and skip subsequent fetches.
  const brandShareImage = effectiveConfig.brand.ogImage || brandLogo
  // Favicon preference order: explicit favicon > logo > auto-derived
  // initials data-URI. The fallback keeps tenant tabs from showing
  // the platform default when the teacher hasn't uploaded anything.
  const brandFavicon =
    effectiveConfig.brand.faviconUrl ||
    brandLogo ||
    buildInitialsFavicon(brandName, effectiveConfig.brand.primaryColor)
  const defaultTitle = brandTagline ? `${brandName} — ${brandTagline}` : brandName
  const defaultDescription =
    brandTagline ||
    `Welcome to ${brandName}. Explore courses, classes, and content from ${brandName}.`

  return (
    // I18nProvider sits inside the theme provider so individual
    // tenant pages can consume both the brand vars + translation
    // strings without separate hookups. We don't expose a
    // per-tenant default locale field in PortalConfig yet — every
    // portal starts in "en" and the visitor switches via the
    // header LanguagePicker. When tenants ask for a default
    // (e.g. "render in Hindi for first-time visitors"), thread a
    // `defaultLocale` prop here from the brand config.
    <PortalThemeProvider tenant={tenant} brand={effectiveConfig.brand}>
      <I18nProvider
        // Plan-gated language config. The multilingual flag belongs to
        // paid tiers (Pro/Studio/Institute on this catalog). Free
        // (Starter) tenants render English-only — even if the saved
        // i18n config has more locales enabled, we collapse to ["en"]
        // here so the public portal can't ship a feature the plan
        // doesn't include. The dashboard's Languages page surfaces an
        // upgrade gate that matches.
        defaultLocale={
          planLimits.multilingual
            ? ((effectiveConfig.i18n?.defaultLocale as Locale) ?? "en")
            : "en"
        }
        enabledLocales={
          planLimits.multilingual
            ? (effectiveConfig.i18n?.enabledLocales as Locale[] | undefined)
            : (["en"] as Locale[])
        }
        multilingualEnabled={
          planLimits.multilingual
            ? (effectiveConfig.i18n?.multilingualEnabled ?? true)
            : false
        }
        overrides={effectiveConfig.i18n?.overrides as Partial<Record<Locale, Partial<Dictionary>>> | undefined}
      >
        <DynamicMeta
          title={defaultTitle}
          // No template at the tenant layer — page-level instances supply
          // their own "<page> · <brand>" composition with their own
          // titleTemplate prop.
          description={defaultDescription}
          image={brandShareImage}
          siteName={brandName}
          faviconUrl={brandFavicon}
          type="website"
        />
        <PortalAnalyticsScripts analytics={effectiveConfig.analytics} />
        {isZenRoute ? (
          // Zen mode — no header, no footer, no announcement banner,
          // no popups. Just the page (live call). Keeps the student
          // focused on the class and matches the dashboard host view.
          <>{children}</>
        ) : (
          <>
            {/* Sprint C Brand #48 — skip-to-content link. First
                focusable element on every public page; tab from
                the address bar lands here and pressing Enter
                jumps focus past the header into <main>. */}
            <SkipToContent />
            <AnnouncementBar bar={effectiveConfig.announcementBar} tenant={tenant} />
            <PortalSiteHeader tenant={tenant} config={effectiveConfig} pages={pages} basePath={basePath} />
            <main id="main-content" tabIndex={-1} className="min-h-[60vh] focus:outline-none">{children}</main>
            <PortalSiteFooter tenant={tenant} config={effectiveConfig} basePath={basePath} />
            <Popup popups={effectiveConfig.popups} tenant={tenant} pageSlug={pageSlug} />
            {/* Sprint B Brand #21 — wishlist tray. Self-hiding when
                count = 0 and on the /courses route so it doesn't
                clutter pages where it'd be redundant. */}
            <WishlistTray tenantSlug={tenant} basePath={basePath} />
            {/* Floating back-to-top — auto-hidden on short pages
                via internal scroll threshold (1.5 viewports). */}
            <BackToTop />
          </>
        )}
      </I18nProvider>
    </PortalThemeProvider>
  )
}

// Auto-generated favicon for tenants who haven't uploaded one. We
// build a 32×32 SVG with the brand initials over a primary-coloured
// square and return it as a data URI. The browser treats data: URIs
// just like any other favicon source. Falls back to platform default
// if the input is unusable.
function buildInitialsFavicon(name: string, primaryColor?: string): string {
  const trimmed = (name ?? "").trim()
  if (!trimmed) return "/icon.svg"
  const initials = trimmed
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .join("")
    .slice(0, 2)
    .toUpperCase()
  const bg = primaryColor && /^#?[0-9a-fA-F]{6}$/.test(primaryColor.replace(/^#/, ""))
    ? (primaryColor.startsWith("#") ? primaryColor : `#${primaryColor}`)
    : "#0a3024"
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">` +
    `<rect width="32" height="32" rx="6" fill="${bg}"/>` +
    `<text x="50%" y="50%" dy="0.35em" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="700" fill="white">${initials}</text>` +
    `</svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}
