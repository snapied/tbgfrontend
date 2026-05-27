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

import { Suspense, useEffect, useMemo, useRef, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Globe, Palette, Sparkles, Type, RotateCcw, Star, Users, BookOpen, Plus, Check } from "lucide-react"
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
import { suggestSlug, useTenant, validateSlug, type Tenant } from "@/lib/tenant-store"
import { cn } from "@/lib/utils"
import { ThemePresetPicker } from "@/components/portal/theme-preset-picker"
import { GoogleFontLoader } from "@/components/portal/font-loader"
import { SavedIndicator, type SaveStatus } from "@/components/dashboard/saved-indicator"
import { FontPicker, type CustomFont } from "@/components/portal/font-picker"
import { LayoutPresetPicker } from "@/components/portal/layout-preset-picker"
import { FooterColumnsEditor } from "@/components/portal/footer-columns-editor"
import { HeaderNavEditor } from "@/components/portal/header-nav-editor"
import { PortalLivePreview } from "@/components/portal/portal-live-preview"
import { ContrastMeter } from "@/components/portal/contrast-meter"
import { PresetApplyDialog } from "@/components/portal/preset-apply-dialog"
import type { ThemePreset } from "@/lib/portal-theme-presets"
import { HealthScore } from "@/components/ui/health-score"
import { ThumbnailField } from "@/components/upload/thumbnail-field"
import { Image as ImageIcon, MessageSquarePlus, History } from "lucide-react"
import { useReviewThread } from "@/lib/review-store"
import { ReviewPanel } from "@/components/ui/review-panel"
import { useVersionedDoc } from "@/lib/versioning"
import { VersionsSheet } from "@/components/ui/versions-sheet"
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
    target: "[data-tour='brand-tab-advanced']",
    title: "Workspace URL",
    body:
      "Change `<your-name>.thebigclass.com` here. We auto-redirect anything we control, but external links you've already shared (Slack, WhatsApp, marketing emails) keep pointing at the old slug — re-share or set up a custom domain.",
    emoji: "🔗",
    placement: "bottom",
  },
  {
    target: "[data-tour='brand-tab-advanced']",
    title: "Analytics + test connection",
    body:
      "Paste your GA4 / Plausible / Hotjar / Meta Pixel ID and hit Test — we'll fire a dummy event so you can verify it lands in your dashboard's Realtime view in the next 10 seconds.",
    emoji: "📊",
    placement: "bottom",
  },
  {
    target: "[data-tour='brand-tab-advanced']",
    title: "White-label + custom code",
    body:
      "On Pro and above you can hide the Powered-by badge, paste custom CSS to override our tokens, and inject your own <head> tags. Scripts go through an allowlist; arbitrary inline code is blocked for safety.",
    emoji: "🧪",
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
  // useSearchParams must sit inside a Suspense boundary at the
  // page root so Next.js doesn't blow up on static generation.
  return (
    <Suspense fallback={null}>
      <PortalBrandPageInner />
    </Suspense>
  )
}

function PortalBrandPageInner() {
  const router = useRouter()
  const pathname = usePathname() ?? ""
  const searchParams = useSearchParams()
  // Active tab tracked in the URL so a refresh / share-link lands
  // the visitor on the same tab. Accepts only known values; falls
  // back to "templates" when missing or unknown.
  const TAB_VALUES = ["templates", "identity", "style", "layout", "advanced"] as const
  type BrandTab = (typeof TAB_VALUES)[number]
  const tabFromUrl = (searchParams?.get("tab") ?? "") as BrandTab | ""
  const activeTab: BrandTab = (TAB_VALUES as readonly string[]).includes(tabFromUrl)
    ? (tabFromUrl as BrandTab)
    : "templates"
  const setActiveTab = (next: string) => {
    const params = new URLSearchParams(searchParams?.toString() ?? "")
    if (next === "templates") params.delete("tab")
    else params.set("tab", next)
    const q = params.toString()
    router.replace(q ? `${pathname}?${q}` : pathname)
    // Smooth-scroll to top of tab content on every tab change so the
    // user gets visible feedback even when the tab is already active
    // (the common case when Brand Health "Edit" lands them on the
    // same tab they were already on).
    if (typeof window !== "undefined") {
      window.setTimeout(() => {
        const el = document.querySelector(`[role="tabpanel"][data-state="active"]`)
        if (el && "scrollIntoView" in el) {
          (el as HTMLElement).scrollIntoView({ behavior: "smooth", block: "start" })
        }
      }, 50)
    }
  }

  const { config, updateConfig } = usePortal()
  const { settings, update: updateOrg } = useOrgSettings()
  const { currentTenant, updateTenant, renameTenantSlug, isSlugAvailable } = useTenant()
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

  // Reviews — anchored comment threads. Same shape will land on the
  // Pages editor + Blog editor + Profile pages so reviewers leave
  // notes the team can actually action.
  const reviews = useReviewThread({
    tenantSlug,
    kind: "brand",
    artifactId: "brand",
    actor: { name: currentTenant?.name ?? "Owner" },
  })
  const [reviewsOpen, setReviewsOpen] = useState(false)

  // Versions — manual snapshots ("Save a version") because the brand
  // form autosaves on every keystroke and a per-character history is
  // useless. Restore replaces the brand record in place.
  const versions = useVersionedDoc<PortalBrand>({
    tenantSlug,
    kind: "brand",
    artifactId: "brand",
    actor: { name: currentTenant?.name ?? "Owner" },
    isEqual: (a, b) => JSON.stringify(a) === JSON.stringify(b),
  })
  const [versionsOpen, setVersionsOpen] = useState(false)

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

  // Fields where an empty string is a meaningful user choice and
  // must NOT be silently coerced to undefined. The previous policy
  // — "any blank string falls back to onboarding" — caused the Site
  // name field to feel like characters were vanishing: clearing the
  // box snapped the display back to the tenant default, and the
  // next keystroke prepended to that default. For identity text
  // fields we now persist the empty string as-is; the "Reset brand
  // to defaults" button is the explicit path to bring fallbacks
  // back.
  const KEEP_EMPTY = new Set<keyof typeof brand>([
    "siteName",
    "tagline",
  ])
  const setBrand = (patch: Partial<typeof brand>) => {
    // Normalize empty strings to undefined for URL/asset fields so
    // the fallback chain still finds onboarding logo / favicon
    // values after a clear. Identity text fields (siteName,
    // tagline) keep the empty string literally — see KEEP_EMPTY.
    const norm: Partial<typeof brand> = {}
    for (const [k, v] of Object.entries(patch)) {
      const key = k as keyof typeof brand
      if (typeof v === "string") {
        if (KEEP_EMPTY.has(key)) {
          ;(norm as Record<string, unknown>)[key] = v
        } else {
          ;(norm as Record<string, unknown>)[key] = v.trim() ? v : undefined
        }
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

    // Mirror the site name into the tenant record too. The sidebar
    // workspace label, the dashboard breadcrumb, and the email
    // dispatcher all read `currentTenant.name`. Without this mirror
    // the Brand form would update the portal display but the
    // chrome around the dashboard kept showing the old name.
    if (currentTenant) {
      const tenantPatch: Partial<Tenant> = {}
      if ("siteName" in norm && typeof norm.siteName === "string") {
        const trimmed = norm.siteName.trim()
        if (trimmed && trimmed !== currentTenant.name) {
          tenantPatch.name = trimmed
        }
      }
      
      const newBranding = { ...currentTenant.branding }
      let brandingChanged = false
      if ("logoUrl" in norm && norm.logoUrl !== newBranding.logoUrl) {
        newBranding.logoUrl = norm.logoUrl
        brandingChanged = true
      }
      if ("tagline" in norm && norm.tagline !== newBranding.tagline) {
        newBranding.tagline = norm.tagline
        brandingChanged = true
      }
      if ("primaryColor" in norm && norm.primaryColor !== newBranding.primaryColor) {
        newBranding.primaryColor = norm.primaryColor
        brandingChanged = true
      }
      if ("accentColor" in norm && norm.accentColor !== newBranding.accentColor) {
        newBranding.accentColor = norm.accentColor
        brandingChanged = true
      }

      if (brandingChanged) {
        tenantPatch.branding = newBranding
      }

      if (Object.keys(tenantPatch).length > 0) {
        updateTenant(currentTenant.id, tenantPatch)
      }
    }
    markSaved()
  }

  // Preset apply is now a two-step dance: click previews live in the
  // iframe, dialog shows the diff, the teacher confirms or discards.
  // Snapshot is the pre-preview state we revert to on discard.
  const [pendingPreset, setPendingPreset] = useState<ThemePreset | null>(null)
  const presetSnapshotRef = useRef<{
    primaryColor?: string
    accentColor?: string
    headingFont?: string
    bodyFont?: string
  } | null>(null)

  const beginPresetPreview = (preset: ThemePreset) => {
    // Snapshot before we mutate so we can revert on discard. We grab
    // from `brand` (the stored value) not `effective` so the snapshot
    // captures what the teacher actually authored.
    presetSnapshotRef.current = {
      primaryColor: brand.primaryColor,
      accentColor: brand.accentColor,
      headingFont: brand.headingFont,
      bodyFont: brand.bodyFont,
    }
    setBrand({
      primaryColor: preset.primaryColor,
      accentColor: preset.accentColor,
      headingFont: preset.headingFont,
      bodyFont: preset.bodyFont,
    })
    setPendingPreset(preset)
  }
  const cancelPresetPreview = () => {
    // Revert the live preview to what was there before.
    if (presetSnapshotRef.current) {
      setBrand(presetSnapshotRef.current)
    }
    presetSnapshotRef.current = null
    setPendingPreset(null)
  }
  const confirmPresetPreview = () => {
    // Nothing extra to write — the preview already mutated. Just
    // drop the snapshot so a subsequent discard wouldn't roll back
    // past the now-committed preset.
    presetSnapshotRef.current = null
    setPendingPreset(null)
  }

  // Logo → favicon auto-fill. When the teacher uploads a logo but has
  // never set a favicon, mirror the logo URL into faviconUrl so the
  // public portal's browser-tab icon isn't the platform default. The
  // teacher can override at any time — we only auto-set when
  // brand.faviconUrl is empty. Re-running after favicon removal is
  // safe because the effect only writes when the favicon slot is
  // empty.
  useEffect(() => {
    if (!brand.logoUrl) return
    if (brand.faviconUrl) return
    setBrand({ faviconUrl: brand.logoUrl })
    // setBrand is stable from the portal store; we intentionally don't
    // include it in deps to avoid loop noise from store ref changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brand.logoUrl])

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
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              const e = versions.snapshot(
                brand,
                `Saved · ${new Date().toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}`,
              )
              if (e) {
                toast.success("Brand version saved.")
                setVersionsOpen(true)
              } else {
                toast.info("Nothing changed since the last version.")
              }
            }}
            className="gap-1.5"
            title="Snapshot the current brand so you can roll back later"
          >
            <History className="h-4 w-4" />
            Save version
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setVersionsOpen(true)}
            className="gap-1.5"
          >
            <History className="h-4 w-4" />
            Versions
            {versions.history.length > 0 && (
              <span className="rounded-full bg-muted px-1.5 text-[10px] font-bold text-muted-foreground">
                {versions.history.length}
              </span>
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setReviewsOpen(true)}
            className="gap-1.5"
          >
            <MessageSquarePlus className="h-4 w-4" />
            Reviews
            {reviews.openCount > 0 && (
              <span className="rounded-full bg-primary/10 px-1.5 text-[10px] font-bold text-primary">
                {reviews.openCount}
              </span>
            )}
          </Button>
          <TakeATourButton tourId="portal-brand-v1" />
        </div>
      </div>

      {/* Brand health — completion meter. Collapsible so teachers
          who hit 85+ aren't nagged on every page load, but always-
          visible while the score is below "Looking sharp". Each
          checklist row jumps the teacher to the right tab so the
          fix is one tap away. */}
      <HealthScore
        title="Brand health"
        description="Ten signals that tell us your brand is ready for visitors. Aim for 85+ before launch."
        collapsible
        items={[
          {
            id: "siteName",
            label: "Set your display name",
            done: !!(brand.siteName ?? "").trim(),
            weight: 3,
            hint: "Shows on tab title, certificates, and share previews.",
            action: { label: "Open", onClick: () => setActiveTab("identity") },
          },
          {
            id: "tagline",
            label: "Add a tagline",
            done: !!(brand.tagline ?? "").trim(),
            weight: 1,
            hint: "Short line under your name on hero + share previews.",
            action: { label: "Open", onClick: () => setActiveTab("identity") },
          },
          {
            id: "logo",
            label: "Upload a logo",
            done: !!(effective.logoUrl ?? "").trim(),
            weight: 3,
            hint: "Renders at ~32 px in your header. Wide rectangles work best.",
            action: { label: "Open", onClick: () => setActiveTab("identity") },
          },
          {
            id: "favicon",
            label: "Upload a favicon (or keep auto)",
            done: !!(effective.faviconUrl ?? "").trim(),
            weight: 1,
            hint: "Browser tab icon. We'll auto-use your logo if blank.",
            action: { label: "Open", onClick: () => setActiveTab("identity") },
          },
          {
            id: "primary",
            label: "Pick a primary colour",
            done: !!(brand.primaryColor ?? "").trim(),
            weight: 2,
            hint: "Drives buttons and links across every public surface.",
            action: { label: "Open", onClick: () => setActiveTab("style") },
          },
          {
            id: "accent",
            label: "Pick an accent colour",
            done: !!(brand.accentColor ?? "").trim(),
            weight: 1,
            hint: "Used for highlights, ratings, and secondary buttons.",
            action: { label: "Open", onClick: () => setActiveTab("style") },
          },
          {
            id: "headingFont",
            label: "Set a heading font",
            done: !!(brand.headingFont ?? "").trim(),
            weight: 1,
            hint: "Display font on titles, hero copy, and course names.",
            action: { label: "Open", onClick: () => setActiveTab("style") },
          },
          {
            id: "bodyFont",
            label: "Set a body font",
            done: !!(brand.bodyFont ?? "").trim(),
            weight: 1,
            hint: "Body copy on lessons, blog posts, descriptions.",
            action: { label: "Open", onClick: () => setActiveTab("style") },
          },
          {
            id: "headerLayout",
            label: "Pick a header layout",
            done: !!(brand.headerLayout ?? "").trim(),
            weight: 1,
            hint: "Where your logo + nav sit at the top of every page.",
            action: { label: "Open", onClick: () => setActiveTab("layout") },
          },
          {
            id: "ogImage",
            label: "Generate a share card (OG image)",
            done: !!(brand.ogImage ?? "").trim(),
            weight: 2,
            hint: "What shows up when you paste a link in WhatsApp, Slack, or X.",
            action: { label: "Open", onClick: () => setActiveTab("identity") },
          },
        ]}
      />

      {/* All brand controls live under tabs so the page stays short.
          The live preview column on the right sticks regardless of
          which tab is active, so the teacher can flip tabs and still
          watch their edits land. */}
      <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
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
                  onPick={beginPresetPreview}
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
                <Label htmlFor="site-name">Display name</Label>
                <LocalSyncInput
                  id="site-name"
                  fallbackValue={effective.siteName}
                  storedValue={brand.siteName}
                  onChange={(v) => setBrand({ siteName: v })}
                  placeholder="Acme Academy"
                />
                {/* One-time clarifier — the field used to be called
                    "Site name" and the legacy "Organisation name" was
                    a separate setting that wrote to the same store via
                    the fallback chain (see firstNonEmpty above). The
                    rename + this hint resolve the confusion in one
                    place; we don't need a "what changed?" toast since
                    the existing data flows through unchanged. */}
                <p className="text-[11px] text-muted-foreground">
                  Shows on browser tab titles, certificates, share previews, and emails. (We used to call this “Site name” or “Organisation name”.)
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="tagline">Tagline</Label>
                <LocalSyncInput
                  id="tagline"
                  fallbackValue={effective.tagline}
                  storedValue={brand.tagline}
                  onChange={(v) => setBrand({ tagline: v })}
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
                {(() => {
                  const usingLogoAsFavicon =
                    brand.faviconUrl === brand.logoUrl && !!brand.logoUrl
                  return (
                    <>
                      <Label className="flex items-center gap-2">
                        Favicon
                        {usingLogoAsFavicon && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-1.5 py-0.5 text-[9.5px] font-semibold text-primary">
                            Auto · using logo
                          </span>
                        )}
                      </Label>
                      <FileUploadField
                        value={effective.faviconUrl}
                        onChange={(url) => setBrand({ faviconUrl: url || undefined })}
                        accept="image/png,image/svg+xml,image/x-icon"
                        maxSizeMB={1}
                        hint={
                          usingLogoAsFavicon
                            ? "We're using your logo as the tab icon. Upload a square version (32×32) for sharper tabs."
                            : "Browser tab icon. Square; 32×32 ideal."
                        }
                        variant="compact"
                        compress={{ maxDim: 128, quality: 0.92, mime: "image/webp" }}
                      />
                    </>
                  )
                })()}
                {/* Mini browser-tab simulator — shows the favicon at the
                    16px size that actually ships. Helps teachers see
                    "ah, my detailed logo is illegible at this scale". */}
                {(effective.faviconUrl || effective.logoUrl) && (
                  <div className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-2 py-1.5">
                    <div className="flex items-center gap-1 rounded-t-md bg-card px-1.5 py-1 text-[10px] text-muted-foreground shadow-sm">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={effective.faviconUrl || effective.logoUrl}
                        alt=""
                        className="h-3.5 w-3.5 rounded-sm object-cover"
                      />
                      <span className="max-w-[100px] truncate">
                        {effective.siteName || "Your site"}
                      </span>
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      ← what it looks like at 16×16 in a browser tab
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Share card / OG image. Auto-generates a 1200×630 PNG
              from logo + name + primary colour for the workspace-
              wide default. Instructors can also upload a custom card.
              Feeds the `og:image` meta tag rendered by every portal
              page through PortalThemeProvider. */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5" />
                Share card
              </CardTitle>
              <CardDescription>
                The 1200×630 image that shows when your portal link is
                pasted into WhatsApp, Slack, LinkedIn, X, or anywhere
                that unfurls a URL. We can generate one from your
                brand or you can upload your own.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ThumbnailField
                value={brand.ogImage ?? ""}
                onChange={(url) => setBrand({ ogImage: url || undefined })}
                compress={{ maxDim: 1200, quality: 0.85, mime: "image/jpeg" }}
              />
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
                  {(() => {
                    const navItems = config.nav?.items ?? []
                    const inNav = (href: string) => navItems.some((i) => i.href === href)
                    const addToNav = (lbl: string, href: string) => {
                      if (inNav(href)) return
                      updateConfig({
                        nav: {
                          ...(config.nav ?? {}),
                          items: [...navItems, { label: lbl, href }],
                        },
                      })
                      toast.success(`Added "${lbl}" to header nav`)
                    }
                    return (
                      <>
                        <UrlRow
                          label="Sign in"
                          futureHost={`https://${tenantSlug}.thebigclass.com/login`}
                          navHref="/login"
                          alreadyInNav={inNav("/login")}
                          onAddToNav={addToNav}
                        />
                        <UrlRow
                          label="Forgot password"
                          futureHost={`https://${tenantSlug}.thebigclass.com/forgot-password`}
                          navHref="/forgot-password"
                          alreadyInNav={inNav("/forgot-password")}
                          onAddToNav={addToNav}
                        />
                        <UrlRow
                          label="My library"
                          futureHost={`https://${tenantSlug}.thebigclass.com/library`}
                          navHref="/my"
                          alreadyInNav={inNav("/my")}
                          onAddToNav={addToNav}
                        />
                        <UrlRow
                          label="Shop"
                          futureHost={`https://${tenantSlug}.thebigclass.com/store`}
                          navHref="/store"
                          alreadyInNav={inNav("/store")}
                          onAddToNav={addToNav}
                        />
                      </>
                    )
                  })()}
                  <p className="pt-2 text-[11px] text-muted-foreground">
                    These go live at
                    <code className="ml-1 rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">
                      {tenantSlug}.thebigclass.com
                    </code>{" "}
                    once your CNAME points at us. Use <strong>Add to nav</strong> to
                    surface a link in the header instantly.
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
              <div className="space-y-2">
                <ColorField
                  label="Primary"
                  value={effective.primaryColor}
                  onChange={(v) => setBrand({ primaryColor: v })}
                />
                {/* WCAG meter — surfaces "your CTA can't be read" the
                    moment the teacher picks a low-contrast shade. */}
                <ContrastMeter
                  color={effective.primaryColor}
                  onPickSuggestion={(hex) => setBrand({ primaryColor: hex })}
                />
              </div>
              <div className="space-y-2">
                <ColorField
                  label="Accent"
                  value={effective.accentColor}
                  onChange={(v) => setBrand({ accentColor: v })}
                />
                <ContrastMeter
                  color={effective.accentColor}
                  onPickSuggestion={(hex) => setBrand({ accentColor: hex })}
                />
              </div>
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
                onChange={(next) => {
                  updateConfig((prev) => {
                    const latestNav = prev.nav ?? {}
                    const resolvedNext = typeof next === "function" ? next(latestNav) : next
                    // HeaderNavEditor's onChange expects to replace the whole nav object,
                    // but since it closes over the old nav during rapid edits, we must merge
                    // its keys on top of the latest nav to avoid clobbering concurrent edits.
                    // If it's a completely new structure, this still works for the CTAs and items.
                    return { nav: { ...latestNav, ...resolvedNext } }
                  })
                }}
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
                onChange={(next) => {
                  updateConfig((prev) => {
                    const latestCols = prev.footerColumns ?? []
                    return { footerColumns: typeof next === "function" ? next(latestCols) : next }
                  })
                }}
              />
            </CardContent>
          </Card>

          </TabsContent>

          {/* ---- Advanced tab: custom CSS, analytics tags ---- */}
          <TabsContent value="advanced" className="space-y-6">
          {/* Workspace URL — the slug that becomes <slug>.thebigclass.com
              and the /p/<slug>/* path. Changing it breaks links the
              creator has already shared (course pages, certificates,
              etc.) so we treat it as a real cost: live validation,
              uniqueness check, explicit Save, plus a warning before
              the change applies. */}
          <WorkspaceUrlCard
            currentSlug={currentTenant?.slug ?? ""}
            currentName={currentTenant?.name ?? ""}
            currentTenantId={currentTenant?.id ?? ""}
            isSlugAvailable={(s) => isSlugAvailable(s, currentTenant?.id)}
            onSave={(nextSlug) => {
              if (!currentTenant) {
                // Defensive: if the parent lost track of the tenant
                // pointer, surface an actionable error instead of
                // silently dropping the save.
                return { ok: false as const, error: "No active workspace — refresh and try again." }
              }
              const result = renameTenantSlug(currentTenant.id, nextSlug)
              if (result.ok) {
                toast.success(`Workspace URL updated.`, {
                  description: `New URL: ${result.slug}.thebigclass.com`,
                })
              }
              return result
            }}
          />

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
                provider="ga4"
                value={config.analytics?.ga4MeasurementId ?? ""}
                onChange={(v) => updateConfig({ analytics: { ...(config.analytics ?? {}), ga4MeasurementId: v || undefined } })}
                placeholder="G-XXXXXXXXXX"
              />
              <AnalyticsField
                label="Plausible domain"
                provider="plausible"
                value={config.analytics?.plausibleDomain ?? ""}
                onChange={(v) => updateConfig({ analytics: { ...(config.analytics ?? {}), plausibleDomain: v || undefined } })}
                placeholder="acme.thebigclass.com"
              />
              <AnalyticsField
                label="Hotjar Site ID"
                provider="hotjar"
                value={config.analytics?.hotjarId ?? ""}
                onChange={(v) => updateConfig({ analytics: { ...(config.analytics ?? {}), hotjarId: v || undefined } })}
                placeholder="1234567"
              />
              <AnalyticsField
                label="Meta Pixel ID"
                provider="metaPixel"
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
              <CardTitle>Draft preview</CardTitle>
              <CardDescription>
                Hero, button, course card painted with your <strong>unsaved draft</strong>. Hit <strong>Publish changes</strong> below to make this live on your public site.
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

      {/* Preset apply confirm — opened by beginPresetPreview, closes
          via cancelPresetPreview (revert) or confirmPresetPreview
          (keep). Snapshot uses brand (the stored value) so the diff
          reflects what was actually authored, not what was inherited. */}
      <PresetApplyDialog
        open={!!pendingPreset}
        onOpenChange={(v) => {
          // Closing the dialog by any path other than confirm is a
          // discard. The X button, escape key, and outside-click all
          // route here.
          if (!v && pendingPreset) cancelPresetPreview()
        }}
        preset={pendingPreset}
        current={presetSnapshotRef.current ?? {}}
        onConfirm={confirmPresetPreview}
        onCancel={cancelPresetPreview}
      />

      {/* Versions sheet — restore writes the snapshot back into the
          portal store via setBrand so the live preview + downstream
          OrgSettings mirror stay coherent. The sheet auto-snapshots
          the current state before restore so the rollback is itself
          reversible. */}
      <VersionsSheet<PortalBrand>
        open={versionsOpen}
        onOpenChange={setVersionsOpen}
        api={versions}
        current={brand}
        onRestore={(snapshot) => {
          setBrand(snapshot)
          toast.success("Brand restored — preview will refresh.")
        }}
        fieldLabels={{
          siteName: "Display name",
          tagline: "Tagline",
          logoUrl: "Logo",
          faviconUrl: "Favicon",
          primaryColor: "Primary colour",
          accentColor: "Accent colour",
          headingFont: "Heading font",
          bodyFont: "Body font",
          headerLayout: "Header layout",
          footerLayout: "Footer layout",
          ogImage: "Share card",
          backgroundKind: "Background kind",
          backgroundColor: "Background colour",
          backgroundGradient: "Background gradient",
          backgroundImageUrl: "Background image",
          customCss: "Custom CSS",
          hidePoweredBy: "Hide Powered-by",
          hideAttribution: "Hide attribution",
        }}
        renderValuePreview={(field, v) => {
          // Color fields show a swatch chip so the diff is visual,
          // not "primaryColor: #aabbcc → #112233".
          if (typeof v === "string" && /^(primary|accent|background)Color$/i.test(field)) {
            return (
              <span
                title={v}
                className="inline-flex h-4 w-4 shrink-0 rounded border border-border"
                style={{ background: v }}
              />
            )
          }
          return null
        }}
      />

      {/* Review panel — anchored comment threads. Anchor options
          mirror the most-commented-on brand surfaces so a reviewer
          can tie "this colour is hard to read" to the actual primary
          colour field. Clicking an anchor switches to the right tab
          via setActiveTab. */}
      <ReviewPanel
        open={reviewsOpen}
        onOpenChange={setReviewsOpen}
        api={reviews}
        title="Brand reviews"
        description="Anchored comments on specific brand fields. Resolved threads stay in the audit log."
        anchorOptions={[
          { target: "siteName", label: "Display name", kind: "field" },
          { target: "tagline", label: "Tagline", kind: "field" },
          { target: "logo", label: "Logo", kind: "field" },
          { target: "favicon", label: "Favicon", kind: "field" },
          { target: "primaryColor", label: "Primary colour", kind: "field" },
          { target: "accentColor", label: "Accent colour", kind: "field" },
          { target: "headingFont", label: "Heading font", kind: "field" },
          { target: "bodyFont", label: "Body font", kind: "field" },
          { target: "headerLayout", label: "Header layout", kind: "field" },
          { target: "ogImage", label: "Share card", kind: "field" },
        ]}
        onAnchorClick={(anchor) => {
          if (anchor.kind === "free") return
          // Map anchor target → tab so a click jumps to the right
          // section of the page.
          const tabMap: Record<string, string> = {
            siteName: "identity",
            tagline: "identity",
            logo: "identity",
            favicon: "identity",
            ogImage: "identity",
            primaryColor: "style",
            accentColor: "style",
            headingFont: "style",
            bodyFont: "style",
            headerLayout: "layout",
          }
          const tab = tabMap[anchor.target]
          if (tab) setActiveTab(tab)
        }}
      />
    </div>
  )
}

// Returns the first non-empty (trimmed) string from the args. Empty
// strings and undefined both count as "missing" — important because
// the form persists empty strings when the user clears a field, and we
// still want the OrgSettings/Tenant fallback to win in that case.
// ============================================================
// Workspace URL change card (Advanced tab).
// ============================================================
// The slug is one of the few fields where a wrong save is real
// damage: shared links break, the workspace switches subdomain,
// and incoming traffic to the old URL dies. So:
//   - live validation (validateSlug from tenant-store enforces
//     length + character class + reserved names)
//   - availability check against other tenants (excluding self)
//   - explicit Save button (no autosave)
//   - confirm dialog before applying — with the new URL preview
//   - inline error states color-coded so the user sees the
//     problem before clicking Save
function WorkspaceUrlCard({
  currentSlug,
  currentName,
  currentTenantId,
  isSlugAvailable,
  onSave,
}: {
  currentSlug: string
  currentName: string
  currentTenantId: string
  /** Returns true when the candidate slug is not used by another
   *  tenant. Caller pre-binds the current tenant's id so a no-op
   *  edit doesn't conflict with itself. */
  isSlugAvailable: (s: string) => boolean
  /** Save handler. Returns ok:true with the persisted slug (which may
   *  differ from input after normalisation) or ok:false with a human
   *  string we render inline. The card never optimistically clears
   *  itself — the parent must confirm via the result. */
  onSave: (nextSlug: string) => { ok: true; slug: string } | { ok: false; error: string } | Promise<{ ok: true; slug: string } | { ok: false; error: string }>
}) {
  const [draft, setDraft] = useState<string>(currentSlug)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const draftFocusedRef = useRef(false)
  const confirm = useConfirm()

  // External resync: when the parent's currentSlug changes (after a
  // successful rename, after the user switches workspaces, or after a
  // hydrated tenant fills in) and the user isn't actively typing,
  // mirror the new value into the draft. Without this, the field
  // would stay stuck on whatever the user last typed even after a
  // workspace switch surfaced a different tenant.
  useEffect(() => {
    if (draftFocusedRef.current) return
    setDraft(currentSlug)
  }, [currentSlug])

  // Normalize as the user types — lowercase, strip whitespace, hyphenate
  // illegal runs. Keeps the field always-legal-looking even on paste.
  const normalize = (raw: string): string =>
    raw
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 32)

  const normalized = normalize(draft)
  const currentNormalized = currentSlug.trim().toLowerCase()
  const unchanged = normalized === currentNormalized && normalized.length > 0
  const noTenant = !currentTenantId
  // When the parent has lost track of the tenant pointer, every save
  // would silently fail — surface that as the only error so the user
  // knows the underlying state is broken.
  const formatError = noTenant
    ? "No active workspace — refresh and try again."
    : validateSlug(normalized)
  const taken = !unchanged && !formatError && !isSlugAvailable(normalized)
  const error = formatError ?? (taken ? "That URL is taken — try another." : null)
  const okToSave = !unchanged && !error && !saving && !noTenant

  const handleSave = async () => {
    if (!okToSave) return
    const ok = await confirm({
      title: "Change your workspace URL?",
      description:
        `Your portal will move from "${currentSlug || "(none)"}.thebigclass.com" to "${normalized}.thebigclass.com". ` +
        "We'll migrate your portal data to the new URL automatically — but anything you've already shared (course pages, certificates, embeds) keeps the old link, so re-share or set up a custom domain.",
      destructive: true,
      confirmLabel: "Change URL",
    })
    if (!ok) return
    setSaving(true)
    setSaveError(null)
    try {
      const result = await Promise.resolve(onSave(normalized))
      if (!result.ok) {
        setSaveError(result.error)
      } else {
        // Re-seat the visible draft to whatever the store decided to
        // persist (may differ if normalisation diverged). This also
        // flips `unchanged` to true so the Save button disables until
        // the user types something new.
        setDraft(result.slug)
      }
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Save failed — please try again.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Workspace URL</CardTitle>
        <CardDescription>
          The subdomain (and <code className="font-mono">/p/&lt;slug&gt;/…</code>) your portal lives on. 3–32 lowercase letters, numbers, or hyphens. Reserved names (admin, api, www, etc.) are blocked.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* PRE-action warning — visitors only see this when the field
            has an unsaved new value, so the warning only nags when
            there's actually something to lose. Moved above the Save
            button (was below) so it doesn't get scrolled past. */}
        {!unchanged && !error && (
          <div
            className="rounded-md border border-amber-500/40 bg-amber-500/5 px-3 py-2 text-[11px] text-amber-700 dark:text-amber-300"
            role="alert"
          >
            <p className="font-semibold">Heads up before you save</p>
            <p className="mt-0.5">
              Links you&rsquo;ve already shared (course pages, certificates,
              embeds in emails or Slack) keep pointing at{" "}
              <span className="font-mono">{currentSlug || "(unset)"}.thebigclass.com</span>{" "}
              — we don&rsquo;t auto-redirect them. Re-share the new URL or set up a
              custom domain on the Domain page.
            </p>
          </div>
        )}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
          <div className="relative flex-1">
            <Input
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value)
                if (saveError) setSaveError(null)
              }}
              onFocus={() => {
                draftFocusedRef.current = true
              }}
              onBlur={() => {
                draftFocusedRef.current = false
              }}
              placeholder={suggestSlug(currentName || "your-workspace")}
              aria-invalid={!!error || !!saveError}
              className={cn(
                "font-mono",
                (error || saveError) && "border-destructive focus-visible:ring-destructive/30",
                !error && !saveError && !unchanged && "border-success/60",
              )}
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-mono text-muted-foreground">
              .thebigclass.com
            </span>
          </div>
          <Button onClick={handleSave} disabled={!okToSave}>
            {saving ? "Saving…" : "Change URL"}
          </Button>
        </div>
        {/* Status line — four states (in priority order): post-save
            error from the store, inline validation/availability error,
            unchanged hint, or live preview of the new URL. */}
        {saveError ? (
          <p className="text-[11px] text-destructive">{saveError}</p>
        ) : error ? (
          <p className="text-[11px] text-destructive">{error}</p>
        ) : unchanged ? (
          <p className="text-[11px] text-muted-foreground">
            Type a new URL to change. Current: <span className="font-mono">{currentSlug || "(unset)"}.thebigclass.com</span>
          </p>
        ) : (
          <p className="text-[11px] text-success">
            Available — your portal will move to{" "}
            <span className="font-mono font-semibold">{normalized}.thebigclass.com</span>
          </p>
        )}
        {normalized && normalized !== draft && (
          <p className="text-[11px] text-muted-foreground">
            We&apos;ll save it as <span className="font-mono">{normalized}</span> after normalising.
          </p>
        )}
        {/* Suppress the "tenantId is unused" lint when this component
            is dropped without the calling page passing it. The id is
            still part of the API in case the caller wants per-tenant
            log lines or analytics on the save event. */}
        {void currentTenantId}
      </CardContent>
    </Card>
  )
}

function firstNonEmpty(...candidates: (string | undefined)[]): string {
  for (const c of candidates) {
    if (c && c.trim()) return c
  }
  return ""
}

// Controlled text input that owns its own visible value, decoupled
// from the parent's fallback chain. Why this exists:
//
//   • The parent computes a "display" value as
//     firstNonEmpty(stored, settings.value, tenantDefault)
//     so that an existing tenant lands on its onboarding name before
//     any save.
//   • The previous setBrand normalised empty strings to `undefined`
//     so the fallback could resurface after a clear.
//   • Together, those two policies made typing feel broken: clearing
//     the field to empty (or pasting whitespace) snapped the value
//     back to the tenant default mid-typing, and the next keystroke
//     prepended to that default instead of the user's draft.
//
// This component fixes that by:
//   1. Initialising local state from the fallback once.
//   2. From then on, every keystroke stays in local state; the parent
//      only hears about it on blur (no mid-type API calls).
//   3. After blur, store syncs are suppressed for BLUR_LOCK_MS so the
//      async save cannot clobber the value the user just committed.
function LocalSyncInput({
  id,
  fallbackValue,
  storedValue,
  onChange,
  placeholder,
}: {
  id?: string;
  /** Best display value when no draft exists (e.g. tenant default). */
  fallbackValue: string;
  /** Currently-saved value on the brand config, or undefined when
   * the user hasn't touched it. */
  storedValue: string | undefined;
  /** Called on blur with the latest value. */
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const [value, setValue] = useState<string>(storedValue ?? fallbackValue)
  const focusedRef = useRef(false)
  // Timestamp (ms) of the last blur. We ignore store updates for
  // BLUR_LOCK_MS after a blur so the async save can't clobber the
  // value the user just typed.
  const blurredAtRef = useRef<number>(0)
  const BLUR_LOCK_MS = 1500

  // Sync external store changes into local state — but only when:
  //  1. The field is not focused, and
  //  2. It has been more than BLUR_LOCK_MS since the last blur.
  useEffect(() => {
    if (focusedRef.current) return
    if (Date.now() - blurredAtRef.current < BLUR_LOCK_MS) return
    const next = storedValue ?? fallbackValue
    if (next !== value) {
      setValue(next)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storedValue, fallbackValue])

  const handleFocus = () => {
    focusedRef.current = true
  }

  const handleBlur = () => {
    focusedRef.current = false
    blurredAtRef.current = Date.now()
    onChange(value)
  }

  return (
    <Input
      id={id}
      value={value}
      placeholder={placeholder}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onChange={(e) => setValue(e.target.value)}
    />
  )
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

// Per-provider analytics ID patterns. Loose enough to accept legit
// new ID shapes but strict enough to catch obvious paste-noise like
// the whole snippet (`<script>…</script>`) into the field.
const ANALYTICS_PATTERNS: Record<string, { re: RegExp; example: string }> = {
  ga4: { re: /^G-[A-Z0-9]{6,}$/, example: "G-XXXXXXXXXX" },
  plausible: { re: /^[a-z0-9.-]+\.[a-z]{2,}$/i, example: "yoursite.com" },
  hotjar: { re: /^\d{5,}$/, example: "3812345" },
  metaPixel: { re: /^\d{10,}$/, example: "1234567890123" },
}

function AnalyticsField({
  label,
  value,
  onChange,
  placeholder,
  provider,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder: string
  /** Drives validation + test-fire copy. */
  provider?: keyof typeof ANALYTICS_PATTERNS
}) {
  const [testState, setTestState] = useState<"idle" | "sent" | "error">("idle")
  const pattern = provider ? ANALYTICS_PATTERNS[provider] : undefined
  const trimmed = value.trim()
  const isEmpty = trimmed.length === 0
  const isValid = !pattern || isEmpty || pattern.re.test(trimmed)

  const handleTest = () => {
    if (!provider || !isValid || isEmpty) return
    // For now this is a client-side "we wired the id" smoke test —
    // the real network event fires from the public portal where
    // the snippet is mounted. We mark `sent` to confirm the id is
    // structurally valid AND surface "now check Realtime in your
    // analytics dashboard". A future v2 can render an iframe that
    // POSTs a test event from the actual portal route.
    try {
      // GA4-only client-side dataLayer ping for instant verification
      // in the dashboard window if a teacher happens to have GA4
      // loaded here too. Otherwise this is a no-op + UX feedback.
      if (provider === "ga4" && typeof window !== "undefined") {
        ;(window as unknown as { dataLayer?: unknown[] }).dataLayer =
          (window as unknown as { dataLayer?: unknown[] }).dataLayer ?? []
        ;((window as unknown as { dataLayer: unknown[] }).dataLayer).push({
          event: "vidyanxt_analytics_test",
          measurement_id: trimmed,
          ts: Date.now(),
        })
      }
      setTestState("sent")
      window.setTimeout(() => setTestState("idle"), 6000)
    } catch {
      setTestState("error")
    }
  }

  return (
    <div className="space-y-1.5">
      <Label className="text-sm">{label}</Label>
      <div className="flex gap-2">
        <Input
          value={value}
          onChange={(e) => {
            onChange(e.target.value)
            if (testState !== "idle") setTestState("idle")
          }}
          placeholder={placeholder}
          aria-invalid={!isValid}
          className={cn(
            "font-mono text-xs",
            !isValid && "border-destructive focus-visible:ring-destructive/30",
          )}
        />
        {provider && !isEmpty && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!isValid}
            onClick={handleTest}
            className="shrink-0"
          >
            Test
          </Button>
        )}
      </div>
      {!isValid && pattern && (
        <p className="text-[11px] text-destructive">
          Doesn&rsquo;t look like a {label} id. Expected format:{" "}
          <span className="font-mono">{pattern.example}</span>
        </p>
      )}
      {testState === "sent" && (
        <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
          Test event queued. Open your {label} dashboard&rsquo;s Realtime view in
          the next 10 seconds to confirm.
        </p>
      )}
      {testState === "error" && (
        <p className="text-[11px] text-destructive">
          Couldn&rsquo;t fire the test — check your network and try again.
        </p>
      )}
    </div>
  )
}

// Copyable URL row used by the Customer-facing URLs card. Shows
// the production URL (subdomain form) — the dev-host form is
// intentionally hidden because pasting `localhost:3000/...` into
// teacher marketing copy would be embarrassing and wrong. The "Add
// to nav" shortcut pushes the link straight into the header so the
// teacher doesn't have to context-switch to the nav editor.
function UrlRow({
  label,
  futureHost,
  navHref,
  alreadyInNav,
  onAddToNav,
}: {
  label: string
  futureHost: string
  navHref: string
  alreadyInNav: boolean
  onAddToNav: (label: string, href: string) => void
}) {
  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      /* clipboard blocked — silently noop */
    }
  }
  return (
    <div className="rounded-md border border-border/60 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-muted-foreground">{label}</p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="-my-1 h-7 px-2 text-[11px]"
          onClick={() => onAddToNav(label, navHref)}
          disabled={alreadyInNav}
          title={alreadyInNav ? "Already in header nav" : "Add this link to your header nav"}
        >
          {alreadyInNav ? (
            <>
              <Check className="mr-1 h-3 w-3" /> In nav
            </>
          ) : (
            <>
              <Plus className="mr-1 h-3 w-3" /> Add to nav
            </>
          )}
        </Button>
      </div>
      <button
        type="button"
        onClick={() => copy(futureHost)}
        className="mt-1 block w-full truncate text-left font-mono text-xs text-foreground hover:text-primary"
        title="Click to copy"
      >
        {futureHost}
      </button>
    </div>
  )
}
