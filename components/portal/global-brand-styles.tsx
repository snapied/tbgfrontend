"use client"

// Globally injects the active tenant's brand CSS variables (primary +
// accent colors, heading + body fonts, custom @font-face rules) at
// :root so EVERY page on the workspace — dashboard, /courses/[slug],
// /learn/[slug], /verify, the public portal, certificates — picks up
// the brand without each consumer needing to opt in.
//
// Mounted once in app/layout.tsx. Reads from the same fallback chain
// the portal layout uses (Portal → OrgSettings → Tenant.branding) so
// existing workspaces show their onboarding colors immediately.

import { useEffect, useMemo } from "react"
import { usePortal } from "@/lib/portal-store"
import { useOrgSettings } from "@/lib/org-settings"
import { useTenant } from "@/lib/tenant-store"

export function GlobalBrandStyles() {
  const { config } = usePortal()
  const { settings } = useOrgSettings()
  const { currentTenant } = useTenant()
  const tenantBranding = currentTenant?.branding ?? {}

  const firstNonEmpty = (...xs: (string | undefined)[]) =>
    xs.find((x) => x && x.trim())

  const primary = firstNonEmpty(
    config.brand.primaryColor,
    settings.brandPrimaryColor,
    tenantBranding.primaryColor,
  )
  const accent = firstNonEmpty(
    config.brand.accentColor,
    settings.brandAccentColor,
    tenantBranding.accentColor,
  )
  const headingFont = firstNonEmpty(config.brand.headingFont)
  const bodyFont = firstNonEmpty(config.brand.bodyFont)
  const customFonts = config.brand.customFonts ?? []

  const css = useMemo(() => {
    const lines: string[] = []
    if (primary) {
      lines.push(`--primary: ${primary};`)
      lines.push(`--ring: ${primary};`)
    }
    if (accent) lines.push(`--accent: ${accent};`)
    if (headingFont) lines.push(`--font-serif: "${escapeFontName(headingFont)}", ui-serif, Georgia, serif;`)
    if (bodyFont) lines.push(`--font-sans: "${escapeFontName(bodyFont)}", ui-sans-serif, system-ui, sans-serif;`)
    if (lines.length === 0) return ""
    return `:root {\n  ${lines.join("\n  ")}\n}`
  }, [primary, accent, headingFont, bodyFont])

  const customFontCss = useMemo(
    () =>
      customFonts
        .map(
          (f) =>
            `@font-face { font-family: "${escapeFontName(f.family)}"; src: url("${escapeFontUrl(f.url)}"); font-display: swap; }`,
        )
        .join("\n"),
    [customFonts],
  )

  // Lazily request the Google Fonts the user picked. Dedupe via the
  // INJECTED set so flipping between picks doesn't pile up stylesheet
  // <link>s. Doesn't run on the server.
  useEffect(() => {
    const families = [headingFont, bodyFont].filter(
      (f): f is string => !!f && !customFonts.some((c) => c.family === f),
    )
    for (const family of families) {
      const href = `https://fonts.googleapis.com/css2?family=${family.trim().replace(/\s+/g, "+")}:wght@400;600;700&display=swap`
      if (INJECTED_FONTS.has(href)) continue
      const link = document.createElement("link")
      link.rel = "stylesheet"
      link.href = href
      link.setAttribute("data-google-font", family)
      document.head.appendChild(link)
      INJECTED_FONTS.add(href)
    }
  }, [headingFont, bodyFont, customFonts])

  if (!css && !customFontCss) return null
  return (
    <>
      {customFontCss && <style dangerouslySetInnerHTML={{ __html: customFontCss }} />}
      {css && <style dangerouslySetInnerHTML={{ __html: css }} />}
    </>
  )
}

const INJECTED_FONTS = new Set<string>()

function escapeFontName(s: string): string {
  return s.replace(/["\\]/g, "")
}
function escapeFontUrl(s: string): string {
  return s.replace(/["\\]/g, "\\$&")
}
