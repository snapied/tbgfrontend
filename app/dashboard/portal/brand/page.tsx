"use client"

// Brand — visual identity for the public portal. Layout:
//
//   • Theme presets up top — one-click brand combos for the teacher
//     who "doesn't know what looks good". Cheap visual win.
//   • Form (identity / colors / typography) on the left.
//   • Compelling live preview on the right: a real-looking hero card
//     + button row + course card sample, rendered with the active
//     colors AND the active fonts (Google Fonts loaded on the fly).
//   • Live iframe preview at the bottom so the teacher can see the
//     actual public site react to brand changes.
//
// Brand fields are mirrored to OrgSettings on save so the certificate
// engine — which reads OrgSettings — stays in sync without separate
// admin work.

import { useMemo, useState } from "react"
import { Globe, Palette, Sparkles, Type, RotateCcw, Star, Users, BookOpen } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { FileUploadField } from "@/components/upload/file-upload-field"
import type { PortalBrand } from "@/lib/portal-store"
import { usePortal } from "@/lib/portal-store"
import { useOrgSettings } from "@/lib/org-settings"
import { useTenant } from "@/lib/tenant-store"
import { ThemePresetPicker } from "@/components/portal/theme-preset-picker"
import { GoogleFontLoader } from "@/components/portal/font-loader"
import { SavedIndicator, type SaveStatus } from "@/components/dashboard/saved-indicator"
import { FontPicker, type CustomFont } from "@/components/portal/font-picker"
import { LayoutPresetPicker } from "@/components/portal/layout-preset-picker"
import { FooterColumnsEditor } from "@/components/portal/footer-columns-editor"
import { HeaderNavEditor } from "@/components/portal/header-nav-editor"
import { PortalLivePreview } from "@/components/portal/portal-live-preview"
import { PRESETS } from "@/lib/portal-theme-presets"
import { DEFAULT_HEADER_PRESET, DEFAULT_FOOTER_PRESET } from "@/lib/portal-layout-presets"
import { ProductTour, TakeATourButton, type TourStep } from "@/components/tour/product-tour"
import { useConfirm } from "@/lib/use-confirm"
import { toast } from "sonner"
import { PortalTemplatePicker } from "@/components/portal/template-picker"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PlanFeatureGate } from "@/components/dashboard/plan-lock"

const BRAND_TOUR: TourStep[] = [
  {
    title: "Your portal's design system, in five tabs",
    body: "Templates, Identity, Style, Layout, Advanced. The live preview on the right reflects every change — flip tabs, tweak fields, watch the iframe.",
    emoji: "🎨",
    placement: "center",
  },
  // --- Templates tab -----------------------------------------------
  {
    beforeShow: "[data-tour='brand-tab-templates']",
    target: "[data-tour='brand-tab-templates']",
    title: "Templates tab",
    body: "Full-recipe starting points (Editorial, Studio, Bootcamp, Scholar, Botanical, Brutalist, Midnight) — one click to overwrite colours, fonts, layout AND home page sections. The first card is 'Default theme' if you want to reset.",
    emoji: "✨",
    placement: "bottom",
  },
  {
    beforeShow: "[data-tour='brand-tab-templates']",
    target: "[data-tour='brand-presets']",
    title: "Quick palettes",
    body: "Smaller, two-colour combos when you just want to nudge primary + accent + a font pair without overwriting your home page.",
    emoji: "🎨",
    placement: "top",
  },
  // --- Identity tab ------------------------------------------------
  {
    beforeShow: "[data-tour='brand-tab-identity']",
    target: "[data-tour='brand-tab-identity']",
    title: "Identity tab",
    body: "Site name + tagline (header text), logo (top-left, ~32 px tall), and favicon (browser tab icon). These survive every template switch.",
    emoji: "🪪",
    placement: "bottom",
  },
  // --- Style tab ---------------------------------------------------
  {
    beforeShow: "[data-tour='brand-tab-style']",
    target: "[data-tour='brand-tab-style']",
    title: "Style tab",
    body: "Colors (primary + accent), Typography (heading + body fonts, custom uploads supported), and Page background (solid, gradient, or image with overlay).",
    emoji: "🎨",
    placement: "bottom",
  },
  // --- Layout tab --------------------------------------------------
  {
    beforeShow: "[data-tour='brand-tab-layout']",
    target: "[data-tour='brand-tab-layout']",
    title: "Layout tab",
    body: "Header layout preset + nav (curate links, reorder built-ins, set up to two CTAs). Footer layout + columns of links.",
    emoji: "🧭",
    placement: "bottom",
  },
  // --- Advanced tab ------------------------------------------------
  {
    beforeShow: "[data-tour='brand-tab-advanced']",
    target: "[data-tour='brand-tab-advanced']",
    title: "Advanced tab",
    body: "Custom CSS scoped to your portal, plus drop-in tags for GA4 / Plausible / Hotjar / Meta Pixel, and a custom <head> escape hatch.",
    emoji: "🛠️",
    placement: "bottom",
  },
  {
    title: "Save is automatic",
    body: "Every change persists instantly and propagates to the public site, course pages, and certificates. Tour ends — flip tabs anytime.",
    emoji: "💾",
    placement: "center",
  },
]

const HEADING_FONTS = [
  "Playfair Display", "Fraunces", "Cormorant Garamond", "EB Garamond",
  "Cinzel", "Manrope", "Outfit", "Inter",
]
const BODY_FONTS = [
  "Inter", "Manrope", "Outfit", "Source Sans 3", "Public Sans", "Lato", "Nunito",
]

export default function PortalBrandPage() {
  const { config, updateConfig } = usePortal()
  const { settings, update: updateOrg } = useOrgSettings()
  const { currentTenant } = useTenant()
  const brand = config.brand
  // Autosave indicator — every setBrand call below funnels through
  // markSaved so the user sees the timestamp tick up immediately
  // after a colour swap or text edit.
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle")
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null)
  const markSaved = () => {
    setSaveStatus("saved")
    setLastSavedAt(new Date().toISOString())
    setTimeout(() => setSaveStatus("idle"), 1500)
  }
  const tenantBranding = currentTenant?.branding ?? {}
  const tenantSlug = currentTenant?.slug ?? ""

  // Effective values — fall back through Portal → OrgSettings → Tenant
  // so an existing workspace's onboarding data shows up immediately, no
  // save required. `firstNonEmpty` (not `??`) is intentional: once the
  // user has saved an empty string for a field, ?? wouldn't fall back
  // and the form would mysteriously show empty placeholders even though
  // OrgSettings still has the onboarding value.
  const effective = {
    siteName: firstNonEmpty(brand.siteName, settings.organisationName, currentTenant?.name),
    tagline: firstNonEmpty(brand.tagline, settings.tagline, tenantBranding.tagline),
    logoUrl: firstNonEmpty(brand.logoUrl, settings.logoUrl, tenantBranding.logoUrl),
    faviconUrl: firstNonEmpty(brand.faviconUrl),
    primaryColor: firstNonEmpty(
      brand.primaryColor,
      settings.brandPrimaryColor,
      tenantBranding.primaryColor,
    ),
    accentColor: firstNonEmpty(
      brand.accentColor,
      settings.brandAccentColor,
      tenantBranding.accentColor,
    ),
    headingFont: firstNonEmpty(brand.headingFont),
    bodyFont: firstNonEmpty(brand.bodyFont),
  }

  const setBrand = (patch: Partial<typeof brand>) => {
    // Normalize empty strings to undefined so the fallback chain on
    // read still sees onboarding values. Otherwise typing then deleting
    // text in a field would freeze the form into "empty for ever".
    const norm: Partial<typeof brand> = {}
    for (const [k, v] of Object.entries(patch)) {
      const key = k as keyof typeof brand
      if (typeof v === "string") {
        ;(norm as Record<string, unknown>)[key] = v.trim() ? v : undefined
      } else {
        ;(norm as Record<string, unknown>)[key] = v
      }
    }
    updateConfig({ brand: { ...brand, ...norm } })

    const orgPatch: Record<string, unknown> = {}
    if ("siteName" in norm) orgPatch.organisationName = norm.siteName ?? ""
    if ("tagline" in norm) orgPatch.tagline = norm.tagline
    if ("logoUrl" in norm) orgPatch.logoUrl = norm.logoUrl
    if ("primaryColor" in norm) orgPatch.brandPrimaryColor = norm.primaryColor
    if ("accentColor" in norm) orgPatch.brandAccentColor = norm.accentColor
    if (Object.keys(orgPatch).length > 0) updateOrg(orgPatch)
    markSaved()
  }

  const applyPreset = (preset: (typeof PRESETS)[number]) => {
    setBrand({
      primaryColor: preset.primaryColor,
      accentColor: preset.accentColor,
      headingFont: preset.headingFont,
      bodyFont: preset.bodyFont,
    })
  }

  const confirm = useConfirm()
  const resetBrand = async () => {
    const ok = await confirm({
      title: "Reset brand to defaults?",
      description: "Logo, colors, fonts, header layout, footer, and everything else on this page will be cleared. Your onboarding values come back as fallback.",
      destructive: true,
      confirmLabel: "Reset",
    })
    if (!ok) return
    setBrand({
      siteName: undefined,
      tagline: undefined,
      logoUrl: undefined,
      faviconUrl: undefined,
      primaryColor: undefined,
      accentColor: undefined,
      headingFont: undefined,
      bodyFont: undefined,
    })
    toast.success("Brand reset to defaults.")
  }

  // Live preview style. Mirrors what PortalThemeProvider does in CSS.
  const previewStyle = useMemo(
    () => ({
      ["--preview-primary" as string]: effective.primaryColor || "var(--primary)",
      ["--preview-accent" as string]: effective.accentColor || "var(--accent)",
      ["--preview-font-heading" as string]: effective.headingFont
        ? `"${effective.headingFont}", serif`
        : "var(--font-serif)",
      ["--preview-font-body" as string]: effective.bodyFont
        ? `"${effective.bodyFont}", sans-serif`
        : "var(--font-sans)",
    }),
    [
      effective.primaryColor,
      effective.accentColor,
      effective.headingFont,
      effective.bodyFont,
    ],
  )

  return (
    <div className="space-y-6">
      <ProductTour tourId="portal-brand-v1" steps={BRAND_TOUR} />
      {/* Load whichever fonts the user has picked so the in-page
          preview shows the real typography, not the platform default. */}
      <GoogleFontLoader families={[effective.headingFont, effective.bodyFont]} />

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            Designer
          </div>
          <h1 className="mt-3 font-serif text-2xl font-bold tracking-tight">Brand</h1>
          <p className="text-muted-foreground">
            Identity that appears on every public page — header, footer, course cards, certificates.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <SavedIndicator status={saveStatus} lastSavedAt={lastSavedAt} />
          <TakeATourButton tourId="portal-brand-v1" />
        </div>
      </div>

      {/* All brand controls live under tabs so the page stays short.
          The live preview column on the right sticks regardless of
          which tab is active, so the teacher can flip tabs and still
          watch their edits land. */}
      <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
        <Tabs defaultValue="templates" className="space-y-6">
          <TabsList className="w-full justify-start overflow-x-auto">
            <TabsTrigger value="templates" data-tour="brand-tab-templates">Templates</TabsTrigger>
            <TabsTrigger value="identity" data-tour="brand-tab-identity">Identity</TabsTrigger>
            <TabsTrigger value="style" data-tour="brand-tab-style">Style</TabsTrigger>
            <TabsTrigger value="layout" data-tour="brand-tab-layout">Layout</TabsTrigger>
            <TabsTrigger value="advanced" data-tour="brand-tab-advanced">Advanced</TabsTrigger>
          </TabsList>

          {/* ---- Templates tab: opinionated recipes + quick palettes ---- */}
          <TabsContent value="templates" className="space-y-6">
            <PlanFeatureGate feature="whiteLabel">
              <Card>
                <CardHeader>
                  <CardTitle>Portal templates</CardTitle>
                  <CardDescription>
                    Curated, full-template starting points. Picks brand colours, fonts, header layout, background and a home page lay-out for you in one click. You can keep editing afterwards, or reset to default any time.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <PortalTemplatePicker />
                </CardContent>
              </Card>
            </PlanFeatureGate>

            <Card data-tour="brand-presets">
              <CardHeader>
                <CardTitle>Quick palettes</CardTitle>
                <CardDescription>
                  Smaller, two-colour combos when you want to tweak just the brand colours and a font pair without overwriting your home page.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ThemePresetPicker
                  currentPrimary={effective.primaryColor}
                  currentAccent={effective.accentColor}
                  onPick={applyPreset}
                  onReset={() =>
                    setBrand({
                      primaryColor: undefined,
                      accentColor: undefined,
                      headingFont: undefined,
                      bodyFont: undefined,
                    })
                  }
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* ---- Identity tab ---- */}
          <TabsContent value="identity" className="space-y-6">
          {/* Identity */}
          <Card data-tour="brand-identity">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Identity
              </CardTitle>
              <CardDescription>The name and tagline visitors see in the header.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="site-name">Site name</Label>
                <Input
                  id="site-name"
                  value={effective.siteName}
                  onChange={(e) => setBrand({ siteName: e.target.value })}
                  placeholder="Acme Academy"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tagline">Tagline</Label>
                <Input
                  id="tagline"
                  value={effective.tagline}
                  onChange={(e) => setBrand({ tagline: e.target.value })}
                  placeholder="Practical training for builders."
                />
              </div>
              <div className="space-y-2">
                <Label>Logo</Label>
                <FileUploadField
                  value={effective.logoUrl}
                  onChange={(url) => setBrand({ logoUrl: url || undefined })}
                  accept="image/png,image/svg+xml,image/jpeg,image/webp"
                  maxSizeMB={4}
                  hint="Wide rectangular logos work best. Renders at ~32 px tall on the header."
                  variant="compact"
                  compress={{ maxDim: 600, quality: 0.9, mime: "image/webp" }}
                />
              </div>
              <div className="space-y-2">
                <Label>Favicon</Label>
                <FileUploadField
                  value={effective.faviconUrl}
                  onChange={(url) => setBrand({ faviconUrl: url || undefined })}
                  accept="image/png,image/svg+xml,image/x-icon"
                  maxSizeMB={1}
                  hint="Browser tab icon. Square; 32×32 ideal."
                  variant="compact"
                  compress={{ maxDim: 128, quality: 0.92, mime: "image/webp" }}
                />
              </div>
            </CardContent>
          </Card>

          {/* Customer-facing URLs.
              Reference card so a teacher can copy-paste the
              correct sign-in / forgot-password / reset URLs into
              their own marketing pages, transactional emails, etc.
              Production launches under <tenant>.thebigclass.com;
              today we show the path-based form so the URLs work
              on localhost + the staging host. The shape stays the
              same when the CNAME flips to a custom domain — only
              the host changes. */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Customer-facing URLs
              </CardTitle>
              <CardDescription>
                The links to drop into your emails + marketing. They always live inside your portal — never the platform root.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {tenantSlug ? (
                <>
                  <UrlRow
                    label="Sign in"
                    path={`/p/${tenantSlug}/login`}
                    futureHost={`https://${tenantSlug}.thebigclass.com/login`}
                  />
                  <UrlRow
                    label="Forgot password"
                    path={`/p/${tenantSlug}/forgot-password`}
                    futureHost={`https://${tenantSlug}.thebigclass.com/forgot-password`}
                  />
                  <UrlRow
                    label="My library"
                    path={`/p/${tenantSlug}/library`}
                    futureHost={`https://${tenantSlug}.thebigclass.com/library`}
                  />
                  <UrlRow
                    label="Shop"
                    path={`/p/${tenantSlug}/store`}
                    futureHost={`https://${tenantSlug}.thebigclass.com/store`}
                  />
                  <p className="pt-2 text-[11px] text-muted-foreground">
                    In production these will be served at
                    <code className="ml-1 rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">
                      {tenantSlug}.thebigclass.com
                    </code>{" "}
                    once your CNAME points at us. Bookmark either form — both resolve.
                  </p>
                </>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Pick a workspace to see the URL list.
                </p>
              )}
            </CardContent>
          </Card>
          </TabsContent>

          {/* ---- Style tab: colours, typography, background ---- */}
          <TabsContent value="style" className="space-y-6">
          {/* Colors */}
          <Card data-tour="brand-colors">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Colors
              </CardTitle>
              <CardDescription>
                Primary drives buttons and links. Accent is highlights and ratings.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <ColorField
                label="Primary"
                value={effective.primaryColor}
                onChange={(v) => setBrand({ primaryColor: v })}
              />
              <ColorField
                label="Accent"
                value={effective.accentColor}
                onChange={(v) => setBrand({ accentColor: v })}
              />
            </CardContent>
          </Card>

          {/* Fonts */}
          <Card data-tour="brand-fonts">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Type className="h-5 w-5" />
                Typography
              </CardTitle>
              <CardDescription>
                Google Fonts loaded on every public page, or upload your own brand font. Keep blank to inherit the platform default.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Discoverability hint — the existing Upload tab inside
                  the font picker popover was easy to miss. Flag it
                  up-front so admins know they can bring their own
                  woff2/woff/ttf/otf without leaving this page. */}
              <p className="flex items-start gap-2 rounded-md border border-border/60 bg-muted/30 p-2.5 text-[11px] text-muted-foreground">
                <Type className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                <span>
                  <span className="font-medium text-foreground">Bring your own font.</span>{" "}
                  Open either picker below, switch to the <em>Upload</em> tab, name it (e.g. &ldquo;My Brand Sans&rdquo;) and drop a .woff2 / .woff / .ttf / .otf — the file is registered as an @font-face and shows up under <em>Your fonts</em> alongside Google Fonts.
                </span>
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <FontPicker
                  label="Heading font"
                  options={HEADING_FONTS}
                  value={effective.headingFont}
                  onChange={(v) => setBrand({ headingFont: v })}
                  customFonts={(brand.customFonts ?? []) as CustomFont[]}
                  onCustomFontsChange={(next) => updateConfig({ brand: { ...brand, customFonts: next } })}
                  sample="Headlines look like this"
                />
                <FontPicker
                  label="Body font"
                  options={BODY_FONTS}
                  value={effective.bodyFont}
                  onChange={(v) => setBrand({ bodyFont: v })}
                  customFonts={(brand.customFonts ?? []) as CustomFont[]}
                  onCustomFontsChange={(next) => updateConfig({ brand: { ...brand, customFonts: next } })}
                  sample="Body copy reads like this — the workhorse."
                />
              </div>
            </CardContent>
          </Card>

          {/* Page background — solid / gradient / image. Applied via
              PortalThemeProvider to the portal root. */}
          <Card>
            <CardHeader>
              <CardTitle>Page background</CardTitle>
              <CardDescription>
                Replace the default off-white with a solid colour, gradient or image. Applied to every public portal page.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <BackgroundEditor brand={brand} onChange={setBrand} />
            </CardContent>
          </Card>

          </TabsContent>

          {/* ---- Layout tab: header layout/nav, footer layout/links ---- */}
          <TabsContent value="layout" className="space-y-6">
          {/* Header layout */}
          <Card>
            <CardHeader>
              <CardTitle>Header layout</CardTitle>
              <CardDescription>
                The chrome at the top of every page. Pick a shape that matches your brand voice.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <LayoutPresetPicker
                kind="header"
                value={brand.headerLayout || DEFAULT_HEADER_PRESET}
                onChange={(id) => setBrand({ headerLayout: id })}
              />
            </CardContent>
          </Card>

          {/* Header navigation + CTAs */}
          <Card data-tour="brand-header-nav">
            <CardHeader>
              <CardTitle>Header navigation</CardTitle>
              <CardDescription>
                What links and CTAs show up in the top bar. Curate your own list or let us assemble one
                from your pages.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <HeaderNavEditor
                nav={config.nav ?? {}}
                onChange={(next) => updateConfig({ nav: next })}
              />
            </CardContent>
          </Card>

          {/* Footer layout */}
          <Card>
            <CardHeader>
              <CardTitle>Footer layout</CardTitle>
              <CardDescription>
                What sits at the bottom. Newsletter, compact mono, brand-and-contact, and more.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <LayoutPresetPicker
                kind="footer"
                value={brand.footerLayout || DEFAULT_FOOTER_PRESET}
                onChange={(id) => setBrand({ footerLayout: id })}
              />
            </CardContent>
          </Card>

          {/* Footer columns + links */}
          <Card>
            <CardHeader>
              <CardTitle>Footer links</CardTitle>
              <CardDescription>
                Columns of links shown in the footer. Add a Legal column with /privacy and /terms — visit{" "}
                <a href="/dashboard/portal/pages" className="font-medium text-primary hover:underline">Pages</a>{" "}
                to spin those up with one-click legal templates.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FooterColumnsEditor
                columns={config.footerColumns ?? []}
                onChange={(next) => updateConfig({ footerColumns: next })}
              />
            </CardContent>
          </Card>

          </TabsContent>

          {/* ---- Advanced tab: custom CSS, analytics tags ---- */}
          <TabsContent value="advanced" className="space-y-6">
          {/* White-label toggles. Hide the "Powered by The Big
              Class" attribution in the portal footer + hide every
              other platform-branded element from the public
              surface (favicon falls back to the tenant logo, etc.).
              Pro+ feature — wrapped in PlanFeatureGate so starter
              users see the lock instead of an editable toggle.
              (The portal footer itself reads brand.hidePoweredBy
              directly, so a Pro→Starter downgrade leaves any
              already-set flag in place until the user re-saves.
              Acceptable for now; revisit when downgrade is a
              common path.) */}
          <PlanFeatureGate feature="whiteLabel">
            <Card>
              <CardHeader>
                <CardTitle>White-label</CardTitle>
                <CardDescription>
                  Strip platform attribution from your public portal so visitors only see your brand.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <label className="flex cursor-pointer items-start gap-3 rounded-md border border-border p-3 hover:bg-muted/40">
                  <input
                    type="checkbox"
                    checked={!!brand.hidePoweredBy}
                    onChange={(e) => setBrand({ hidePoweredBy: e.target.checked })}
                    className="mt-1"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium">Hide “Powered by The Big Class” in the footer</p>
                    <p className="text-xs text-muted-foreground">
                      The thin attribution line at the bottom of every portal page is removed.
                    </p>
                  </div>
                </label>
                <label className="flex cursor-pointer items-start gap-3 rounded-md border border-border p-3 hover:bg-muted/40">
                  <input
                    type="checkbox"
                    checked={!!brand.hideAttribution}
                    onChange={(e) => setBrand({ hideAttribution: e.target.checked })}
                    className="mt-1"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium">Hide every platform-branded element</p>
                    <p className="text-xs text-muted-foreground">
                      Stronger toggle. Implies the option above and reserves headroom for future
                      surfaces (email footers, error pages, share previews) so flipping this once
                      covers them all.
                    </p>
                  </div>
                </label>
              </CardContent>
            </Card>
          </PlanFeatureGate>

          {/* Custom CSS — free-form, scoped to portal root */}
          <Card>
            <CardHeader>
              <CardTitle>Custom CSS</CardTitle>
              <CardDescription>
                Advanced tweaks scoped to your portal only. We wrap the CSS in <code className="font-mono">[data-portal-tenant="{tenantSlug || 'you'}"]</code> so it can&apos;t leak into the dashboard.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <textarea
                value={brand.customCss ?? ""}
                onChange={(e) => setBrand({ customCss: e.target.value })}
                placeholder={".prose h2 { color: var(--primary); }"}
                rows={6}
                className="block w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-xs text-foreground outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
                spellCheck={false}
              />
            </CardContent>
          </Card>

          {/* Third-party analytics + custom head HTML */}
          <Card>
            <CardHeader>
              <CardTitle>Analytics &amp; tags</CardTitle>
              <CardDescription>
                Paste IDs from the platforms you use. We inject the official snippets on every public page.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <AnalyticsField
                label="Google Analytics 4 ID"
                value={config.analytics?.ga4MeasurementId ?? ""}
                onChange={(v) => updateConfig({ analytics: { ...(config.analytics ?? {}), ga4MeasurementId: v || undefined } })}
                placeholder="G-XXXXXXXXXX"
              />
              <AnalyticsField
                label="Plausible domain"
                value={config.analytics?.plausibleDomain ?? ""}
                onChange={(v) => updateConfig({ analytics: { ...(config.analytics ?? {}), plausibleDomain: v || undefined } })}
                placeholder="acme.thebigclass.com"
              />
              <AnalyticsField
                label="Hotjar Site ID"
                value={config.analytics?.hotjarId ?? ""}
                onChange={(v) => updateConfig({ analytics: { ...(config.analytics ?? {}), hotjarId: v || undefined } })}
                placeholder="1234567"
              />
              <AnalyticsField
                label="Meta Pixel ID"
                value={config.analytics?.metaPixelId ?? ""}
                onChange={(v) => updateConfig({ analytics: { ...(config.analytics ?? {}), metaPixelId: v || undefined } })}
                placeholder="1234567890"
              />
              <div className="sm:col-span-2">
                <Label className="text-sm font-medium">Custom &lt;head&gt; HTML</Label>
                <p className="mb-1.5 mt-0.5 text-xs text-muted-foreground">
                  Anything else — verification tags, Segment, PostHog, your own scripts. Injected verbatim. Use only scripts you trust.
                </p>
                <textarea
                  value={config.analytics?.customHeadHtml ?? ""}
                  onChange={(e) => updateConfig({ analytics: { ...(config.analytics ?? {}), customHeadHtml: e.target.value || undefined } })}
                  placeholder={'<meta name="google-site-verification" content="..." />'}
                  rows={5}
                  className="block w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-xs text-foreground outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
                  spellCheck={false}
                />
              </div>
            </CardContent>
          </Card>

          <p className="text-xs text-muted-foreground">
            Changes save automatically and propagate to your public site, course pages, and certificates.
          </p>
          </TabsContent>
        </Tabs>

        {/* ============================== Compelling preview column ============================== */}
        <div className="lg:sticky lg:top-6 lg:self-start">
          <Card>
            <CardHeader>
              <CardTitle>Live preview</CardTitle>
              <CardDescription>
                Hero, button, course card &mdash; all painted with your current brand.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Hero sample */}
              <div
                className="overflow-hidden rounded-xl border border-border"
                style={
                  {
                    background:
                      "linear-gradient(135deg, var(--preview-primary) 0%, color-mix(in srgb, var(--preview-primary) 70%, var(--preview-accent)) 100%)",
                    ...previewStyle,
                  } as React.CSSProperties
                }
              >
                <div className="p-5 text-white">
                  {effective.logoUrl ? (
                    <img
                      src={effective.logoUrl}
                      alt=""
                      className="mb-4 h-7 w-auto max-w-[140px] object-contain"
                    />
                  ) : (
                    <span
                      className="mb-4 inline-flex h-7 w-7 items-center justify-center rounded-md bg-white/20 text-xs font-bold backdrop-blur"
                    >
                      {(effective.siteName || "S").slice(0, 1).toUpperCase()}
                    </span>
                  )}
                  <h3
                    className="text-2xl font-bold tracking-tight"
                    style={{ fontFamily: "var(--preview-font-heading)" }}
                  >
                    {effective.siteName || "Your site name"}
                  </h3>
                  {effective.tagline && (
                    <p
                      className="mt-1.5 text-sm text-white/85"
                      style={{ fontFamily: "var(--preview-font-body)" }}
                    >
                      {effective.tagline}
                    </p>
                  )}
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      className="rounded-md px-3.5 py-2 text-sm font-semibold shadow-sm"
                      style={{
                        background: "var(--preview-accent)",
                        color: "var(--preview-primary)",
                        fontFamily: "var(--preview-font-body)",
                      }}
                    >
                      Browse courses
                    </button>
                    <button
                      type="button"
                      className="rounded-md border border-white/40 px-3.5 py-2 text-sm font-semibold text-white"
                      style={{ fontFamily: "var(--preview-font-body)" }}
                    >
                      Meet Your instructor
                    </button>
                  </div>
                </div>
              </div>

              {/* Body card sample (course card) */}
              <div
                className="overflow-hidden rounded-xl border border-border bg-card"
                style={previewStyle as React.CSSProperties}
              >
                <div className="aspect-[16/10] bg-muted">
                  {/* Decorative gradient stand-in for a course thumbnail */}
                  <div
                    className="h-full w-full"
                    style={{
                      background:
                        "linear-gradient(135deg, var(--preview-primary), var(--preview-accent))",
                    }}
                  />
                </div>
                <div className="p-4">
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                    style={{
                      background: "color-mix(in srgb, var(--preview-primary) 10%, transparent)",
                      color: "var(--preview-primary)",
                      fontFamily: "var(--preview-font-body)",
                    }}
                  >
                    Bestseller
                  </span>
                  <h4
                    className="mt-2 text-base font-semibold"
                    style={{ fontFamily: "var(--preview-font-heading)" }}
                  >
                    Intro to your subject
                  </h4>
                  <p
                    className="mt-1 text-xs text-muted-foreground"
                    style={{ fontFamily: "var(--preview-font-body)" }}
                  >
                    Sample course description — what students will learn and walk away with.
                  </p>
                  <div className="mt-3 flex items-center gap-3 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Star className="h-3 w-3" style={{ color: "var(--preview-accent)", fill: "var(--preview-accent)" }} />
                      <span className="font-medium text-foreground">4.8</span>
                      <span>(124)</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      1,240
                    </span>
                    <span className="flex items-center gap-1">
                      <BookOpen className="h-3 w-3" />
                      12 lessons
                    </span>
                  </div>
                </div>
              </div>

              {/* Type sample */}
              <div
                className="rounded-xl border border-border bg-card p-4"
                style={previewStyle as React.CSSProperties}
              >
                <p
                  className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
                  style={{ fontFamily: "var(--preview-font-body)" }}
                >
                  Typography
                </p>
                <p
                  className="mt-1.5 text-2xl font-bold tracking-tight"
                  style={{ fontFamily: "var(--preview-font-heading)" }}
                >
                  Headings use {effective.headingFont || "Playfair Display"}
                </p>
                <p
                  className="mt-1.5 text-sm text-muted-foreground"
                  style={{ fontFamily: "var(--preview-font-body)" }}
                >
                  Body copy uses {effective.bodyFont || "Inter"} — comfortable for paragraphs,
                  works at every size, pairs cleanly with the heading.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ============================== Live iframe ============================== */}
      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle>Real site preview</CardTitle>
          <CardDescription>
            Your actual public portal rendered live. Hit refresh after saving to see brand changes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {tenantSlug ? (
            <PortalLivePreview tenant={tenantSlug} />
          ) : (
            <p className="text-sm text-muted-foreground">Tenant loading…</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// Returns the first non-empty (trimmed) string from the args. Empty
// strings and undefined both count as "missing" — important because
// the form persists empty strings when the user clears a field, and we
// still want the OrgSettings/Tenant fallback to win in that case.
function firstNonEmpty(...candidates: (string | undefined)[]): string {
  for (const c of candidates) {
    if (c && c.trim()) return c
  }
  return ""
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value || "#000000"}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-12 cursor-pointer rounded border border-input bg-background"
        />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#0a3024"
          className="font-mono text-sm"
        />
        {value && (
          <Button variant="ghost" size="sm" onClick={() => onChange("")}>
            Reset
          </Button>
        )}
      </div>
    </div>
  )
}

// Reuses ColorField for solid/gradient end-stops + a FileUploadField
// for the image variant. Persists everything through setBrand so the
// PortalThemeProvider picks up the changes via the live-reload bus.
const GRADIENT_PRESETS: { label: string; value: string }[] = [
  { label: "Warm peach", value: "linear-gradient(135deg, #fde68a 0%, #fb7185 100%)" },
  { label: "Cool mist",  value: "linear-gradient(135deg, #cffafe 0%, #818cf8 100%)" },
  { label: "Mint dawn",  value: "linear-gradient(135deg, #d1fae5 0%, #14b8a6 100%)" },
  { label: "Plum dusk",  value: "linear-gradient(135deg, #fbcfe8 0%, #7c3aed 100%)" },
  { label: "Slate paper",value: "linear-gradient(180deg, #f8fafc 0%, #e2e8f0 100%)" },
]

function BackgroundEditor({
  brand,
  onChange,
}: {
  brand: PortalBrand
  onChange: (patch: Partial<PortalBrand>) => void
}) {
  const kind = brand.backgroundKind ?? "default"
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {(["default", "solid", "gradient", "image"] as const).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => onChange({ backgroundKind: k })}
            className={
              kind === k
                ? "rounded-md border-2 border-primary bg-primary/5 px-3 py-2 text-sm font-medium capitalize"
                : "rounded-md border border-border bg-card px-3 py-2 text-sm capitalize hover:border-primary/40"
            }
          >
            {k}
          </button>
        ))}
      </div>

      {kind === "solid" && (
        <ColorField
          label="Background colour"
          value={brand.backgroundColor ?? ""}
          onChange={(v) => onChange({ backgroundColor: v || undefined })}
        />
      )}

      {kind === "gradient" && (
        <div className="space-y-3">
          <div>
            <Label className="text-sm">Preset gradients</Label>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-5">
              {GRADIENT_PRESETS.map((g) => (
                <button
                  key={g.label}
                  type="button"
                  onClick={() => onChange({ backgroundGradient: g.value })}
                  className={
                    brand.backgroundGradient === g.value
                      ? "h-14 rounded-md ring-2 ring-primary ring-offset-2"
                      : "h-14 rounded-md ring-1 ring-border hover:ring-primary/40"
                  }
                  style={{ background: g.value }}
                  title={g.label}
                />
              ))}
            </div>
          </div>
          <div>
            <Label htmlFor="bg-grad" className="text-sm">Custom gradient (CSS)</Label>
            <Input
              id="bg-grad"
              value={brand.backgroundGradient ?? ""}
              onChange={(e) => onChange({ backgroundGradient: e.target.value || undefined })}
              placeholder="linear-gradient(135deg, #fde68a, #fb7185)"
              className="mt-1 font-mono text-xs"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Any CSS gradient — linear, radial, conic. Paste from your favourite gradient picker.
            </p>
          </div>
        </div>
      )}

      {kind === "image" && (
        <div className="space-y-3">
          <FileUploadField
            value={brand.backgroundImageUrl ?? ""}
            onChange={(url) => onChange({ backgroundImageUrl: url || undefined })}
            accept="image/jpeg,image/png,image/webp"
            maxSizeMB={5}
            hint="Wide, hero-style images work best. 2560 × 1440 or larger."
            variant="compact"
            compress={{ maxDim: 2560, quality: 0.8, mime: "image/jpeg" }}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <ColorField
              label="Overlay colour (sits below image)"
              value={brand.backgroundColor ?? ""}
              onChange={(v) => onChange({ backgroundColor: v || undefined })}
            />
            <div className="space-y-2">
              <Label htmlFor="bg-op" className="text-sm">Darken overlay (%)</Label>
              <Input
                id="bg-op"
                type="number"
                min={0}
                max={100}
                value={brand.backgroundOpacity ?? 0}
                onChange={(e) => onChange({ backgroundOpacity: Number(e.target.value) || 0 })}
              />
              <p className="text-xs text-muted-foreground">
                A semi-transparent black scrim that helps your text stay readable over busy images.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function AnalyticsField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder: string
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm">{label}</Label>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="font-mono text-xs"
      />
    </div>
  )
}

// Copyable URL row used by the Customer-facing URLs card. Shows
// both the path form (works today on every host) and the future
// subdomain form so the teacher knows what their link will look
// like once their CNAME is verified. Click-to-copy reduces the
// "I have to highlight + Cmd-C" friction.
function UrlRow({
  label,
  path,
  futureHost,
}: {
  label: string
  path: string
  futureHost: string
}) {
  const fullPath =
    typeof window !== "undefined" ? `${window.location.origin}${path}` : path
  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      /* clipboard blocked — silently noop */
    }
  }
  return (
    <div className="rounded-md border border-border/60 p-3">
      <p className="text-xs font-semibold text-muted-foreground">{label}</p>
      <button
        type="button"
        onClick={() => copy(fullPath)}
        className="mt-1 block w-full truncate text-left font-mono text-xs text-foreground hover:text-primary"
        title="Click to copy"
      >
        {fullPath}
      </button>
      <button
        type="button"
        onClick={() => copy(futureHost)}
        className="mt-0.5 block w-full truncate text-left font-mono text-[11px] text-muted-foreground hover:text-primary"
        title="Click to copy — production URL once your CNAME is verified"
      >
        {futureHost}
      </button>
    </div>
  )
}
