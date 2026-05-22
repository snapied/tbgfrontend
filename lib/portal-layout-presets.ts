// Header + footer layout presets — small set of curated chrome
// variants the teacher can pick from. Each preset is a "kind" string
// the SiteHeader / SiteFooter components dispatch on. The shape stays
// open so future presets can add their own tweaks (e.g. transparent
// hero overlay, animated newsletter strip) without touching unrelated
// callers.

export interface PortalLayoutPreset {
  id: string
  name: string
  description: string
}

export const HEADER_PRESETS: PortalLayoutPreset[] = [
  {
    id: "split-classic",
    name: "Split classic",
    description: "Logo + name on the left, nav links on the right. The safe default.",
  },
  {
    id: "centered-minimal",
    name: "Centered minimal",
    description: "Logo center, nav under it. Editorial feel.",
  },
  {
    id: "split-with-cta",
    name: "Split with CTA button",
    description: "Logo left, nav center, prominent CTA button on the right.",
  },
  {
    id: "logo-only",
    name: "Logo only",
    description: "Just the logo, hamburger reveals nav. Distraction-free.",
  },
  {
    id: "sticky-pill",
    name: "Floating pill",
    description: "Rounded pill header that floats on scroll. Modern, design-forward.",
  },
  {
    id: "marquee-promo",
    name: "Promo marquee",
    description: "Thin scrolling promo row above the standard split header.",
  },
]

export const FOOTER_PRESETS: PortalLayoutPreset[] = [
  {
    id: "multi-column",
    name: "Multi-column",
    description: "Brand + 3 link columns + socials. The standard.",
  },
  {
    id: "compact-mono",
    name: "Compact mono",
    description: "Single dark strip with logo, copyright, and socials.",
  },
  {
    id: "newsletter-cta",
    name: "Newsletter CTA",
    description: "Big newsletter signup band above the standard footer.",
  },
  {
    id: "two-column",
    name: "Brand + contact",
    description: "Brand block on the left, contact details + socials on the right.",
  },
  {
    id: "centered-tight",
    name: "Centered tight",
    description: "Logo, tagline, socials, and copyright — all centered. Minimal.",
  },
  {
    id: "card-grid",
    name: "Card grid",
    description: "Footer wrapped in a soft card with grid sections inside.",
  },
]

export const DEFAULT_HEADER_PRESET = "split-classic"
export const DEFAULT_FOOTER_PRESET = "multi-column"
