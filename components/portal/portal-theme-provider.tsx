"use client"

// Injects per-tenant brand colors + fonts as scoped CSS variables.
// Wraps every public portal route under /p/[tenant]/*. The block lives
// inline so first paint already uses the right colors — no flash-of-
// default-theme while React hydrates.
//
// Scoping: variables are written to `[data-portal-tenant]` (any attribute
// value) so any descendant of the layout's wrapper picks them up. Outside
// the portal (dashboard, marketing) the global :root values win.

import { useMemo, type ReactNode } from "react"
import type { PortalBrand } from "@/lib/portal-store"

interface Props {
  tenant: string
  brand: PortalBrand
  children: ReactNode
}

export function PortalThemeProvider({ tenant, brand, children }: Props) {
  // Compute the CSS once per brand change. The selector intentionally uses
  // `[data-portal-tenant="<slug>"]` (exact match) so a future "preview
  // another tenant" tab can have its own scope without bleeding.
  const css = useMemo(() => buildThemeCss(tenant, brand), [tenant, brand])

  // Google Fonts link (only when the user picked custom typography). Two
  // separate links — the network can parallelize, and we don't need
  // every weight; just 400 and 700 covers headings + body.
  const fontHrefs = useMemo(() => fontUrlsFor(brand), [brand])

  // @font-face rules for workspace-uploaded custom fonts. Without
  // these, headingFont/bodyFont pointing at a custom family wouldn't
  // resolve and the browser would fall back to the next-in-chain.
  const customFontCss = useMemo(() => {
    const fonts = brand.customFonts ?? []
    return fonts
      .map(
        (f) =>
          `@font-face { font-family: "${escapeFontName(f.family)}"; src: url("${escapeFontUrl(f.url)}"); font-display: swap; }`,
      )
      .join("\n")
  }, [brand.customFonts])

  return (
    <>
      {fontHrefs.map((href) => (
        // eslint-disable-next-line @next/next/no-css-tags
        <link key={href} rel="stylesheet" href={href} />
      ))}
      {customFontCss && <style dangerouslySetInnerHTML={{ __html: customFontCss }} />}
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <div data-portal-tenant={tenant} className="min-h-screen bg-background text-foreground">
        {children}
      </div>
    </>
  )
}

function escapeFontUrl(s: string): string {
  return s.replace(/["\\]/g, "\\$&")
}

function buildThemeCss(tenant: string, brand: PortalBrand): string {
  const sel = `[data-portal-tenant="${cssEscape(tenant)}"]`
  const lines: string[] = []
  if (brand.primaryColor) {
    lines.push(`--primary: ${brand.primaryColor};`)
    lines.push(`--ring: ${brand.primaryColor};`)
  }
  if (brand.accentColor) {
    lines.push(`--accent: ${brand.accentColor};`)
  }
  // Font resolution.
  //
  // Tailwind v4's `@theme inline` block (globals.css) substitutes the
  // LITERAL values of --font-sans / --font-serif into utility class
  // definitions at build time — so `.font-serif` compiles to
  // `font-family: 'Playfair Display', ...` not `var(--font-serif)`.
  // That means setting `--font-serif` here would have no effect: the
  // utility class never reads the variable. We still write the
  // variables (for any custom CSS that does use var() directly), but
  // the real font enforcement happens via explicit rules emitted
  // further down — on the wrapper itself and on h1-h6 inside it,
  // which beat the .font-serif/.font-sans utility specificity.
  //
  // Heading font defaults to the body font when the teacher only
  // picked a body — "I want Inter everywhere" should not leak Playfair
  // into the headings just because they didn't touch a separate field.
  // And when NEITHER is set, both default to Inter (the platform's
  // body face) so the portal never silently inherits the marketing
  // site's Playfair display face on its headings.
  const bodyFont = brand.bodyFont || "Inter"
  const headingFont = brand.headingFont || brand.bodyFont || "Inter"
  const bodyFamily = `"${escapeFontName(bodyFont)}", ui-sans-serif, system-ui, sans-serif`
  // Heading fallback chain skews serif only when the picked face IS a
  // serif (Playfair, Fraunces, etc.). For sans picks like Inter we
  // still surface a sans fallback so the cascade stays consistent.
  const headingFamily = `"${escapeFontName(headingFont)}", ui-sans-serif, system-ui, sans-serif`
  lines.push(`--font-serif: ${headingFamily};`)
  lines.push(`--font-sans: ${bodyFamily};`)

  // Background composition. Layer image (on top via repeat-y/cover) over
  // gradient or solid color so a tenant can mix-and-match. Image wins
  // visually because we apply it as a background-image with a gradient
  // overlay underneath; solid color is the bottom layer.
  const bg = buildBackgroundCss(brand)
  for (const line of bg) lines.push(line)

  let out = ""

  // Baseline polish — applies to every portal, template or not. Lives
  // in @layer base so it loses to both Tailwind utilities AND any
  // template's customCss (which is also in base, but loaded after this
  // string). The goal: even an unstyled "no template" portal should
  // look like a proper, modern public site — warm gradient field,
  // refined typography, subtle card chrome, polished button transitions.
  out += `@layer base {
  :where(${sel}) {
    background-image: radial-gradient(1400px 700px at 50% -10%, color-mix(in oklch, var(--primary) 5%, transparent), transparent 60%), radial-gradient(900px 500px at 100% 110%, color-mix(in oklch, var(--accent) 6%, transparent), transparent 55%);
    background-attachment: fixed;
  }
  :where(${sel} h1) { letter-spacing: -0.025em; line-height: 1.05; }
  :where(${sel} h2) { letter-spacing: -0.02em; line-height: 1.15; }
  :where(${sel} h3) { letter-spacing: -0.015em; }
  :where(${sel} p) { line-height: 1.65; }
  :where(${sel}) section { scroll-margin-top: 5rem; }
  ${[
    // Direct font-family enforcement, ordered carefully:
    //   • Wrapper rule sets a tenant-wide default body font that
    //     cascades to every text node not given an explicit family.
    //   • h1-h6 rule wins over Tailwind's .font-serif utility because
    //     the descendant selector ([attr] h1) has higher specificity
    //     (0,1,1) than .font-serif (0,1,0). Without this rule the
    //     `font-serif` className on a tenant H1 falls through to the
    //     literal value baked in by @theme inline (Playfair Display)
    //     and the chosen brand font silently loses.
    //   • The .font-sans / .font-serif overrides force the chosen
    //     fonts onto code paths that explicitly add those utility
    //     classes (e.g. <body className="font-sans">).
    `${sel} { font-family: ${bodyFamily}; }`,
    `${sel} h1, ${sel} h2, ${sel} h3, ${sel} h4, ${sel} h5, ${sel} h6 { font-family: ${headingFamily}; }`,
    `${sel} .font-sans { font-family: ${bodyFamily}; }`,
    `${sel} .font-serif { font-family: ${headingFamily}; }`,
  ].join("\n  ")}
  :where(${sel} .bg-card) {
    box-shadow: 0 1px 2px rgba(15,23,42,0.04), 0 0 0 1px color-mix(in oklch, var(--foreground) 5%, transparent);
    transition: transform .25s ease, box-shadow .25s ease, border-color .25s ease;
  }
  :where(${sel} a[data-slot="button"]),
  :where(${sel} button[data-slot="button"]) {
    transition: transform .15s ease, box-shadow .2s ease, background-color .2s ease, color .2s ease;
  }
  :where(${sel} a[data-slot="button"]:hover),
  :where(${sel} button[data-slot="button"]:hover) {
    transform: translateY(-1px);
  }
}
`

  if (lines.length > 0) out += `${sel} {\n  ${lines.join("\n  ")}\n}\n`

  // Free-form CSS from the teacher's Custom CSS field. We push it into
  // the `base` cascade layer so Tailwind utility classes (in the
  // `utilities` layer) always win in the cascade — regardless of
  // specificity. This was the real reason CTAs went invisible: an
  // unlayered `a { color: var(--primary) }` in customCss beat
  // Tailwind's `text-primary-foreground` even though the utility class
  // had higher specificity, because cascade-layer order > specificity.
  // With `@layer base`, the template's prose styling still applies
  // anywhere there's no competing utility class, but `<Button>`-style
  // components keep the colours their classes prescribe.
  if (brand.customCss && brand.customCss.trim()) {
    out += `\n@layer base {\n  :where(${sel}) {\n${brand.customCss}\n  }\n}\n`
  }
  return out
}

function buildBackgroundCss(brand: PortalBrand): string[] {
  const kind = brand.backgroundKind ?? "default"
  if (kind === "default") return []
  const lines: string[] = []
  if (kind === "solid" && brand.backgroundColor) {
    lines.push(`background: ${brand.backgroundColor};`)
  } else if (kind === "gradient" && brand.backgroundGradient) {
    lines.push(`background: ${brand.backgroundGradient};`)
    lines.push(`background-attachment: fixed;`)
  } else if (kind === "image" && brand.backgroundImageUrl) {
    const url = brand.backgroundImageUrl.replace(/["\\]/g, "\\$&")
    const base = brand.backgroundColor || "var(--background)"
    const opacity = typeof brand.backgroundOpacity === "number"
      ? Math.max(0, Math.min(100, brand.backgroundOpacity)) / 100
      : 0
    if (opacity > 0) {
      // Tint overlay: layered rgba scrim on top of the image.
      lines.push(
        `background: linear-gradient(rgba(0,0,0,${opacity}), rgba(0,0,0,${opacity})), url("${url}") ${base};`,
      )
    } else {
      lines.push(`background: url("${url}") ${base};`)
    }
    lines.push(`background-size: cover;`)
    lines.push(`background-position: center;`)
    lines.push(`background-attachment: fixed;`)
  }
  return lines
}

// Build the Google Fonts URLs we need. Splits heading + body in separate
// requests so a missing font for one doesn't block the other.
function fontUrlsFor(brand: PortalBrand): string[] {
  const urls: string[] = []
  if (brand.headingFont) urls.push(googleFontUrl(brand.headingFont, [400, 600, 700]))
  if (brand.bodyFont && brand.bodyFont !== brand.headingFont) {
    urls.push(googleFontUrl(brand.bodyFont, [400, 500, 700]))
  }
  return urls
}

function googleFontUrl(family: string, weights: number[]): string {
  const f = family.trim().replace(/\s+/g, "+")
  const w = weights.join(";")
  return `https://fonts.googleapis.com/css2?family=${f}:wght@${w}&display=swap`
}

// CSS.escape isn't available in SSR. Slugs are always [a-z0-9-_] so a
// minimal escape covers the case where a tenant slug accidentally
// contains a quote or backslash.
function cssEscape(s: string): string {
  return s.replace(/["\\]/g, "\\$&")
}
function escapeFontName(s: string): string {
  return s.replace(/["\\]/g, "")
}
