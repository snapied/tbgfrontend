// Curated theme presets — one-click brand combos so a teacher who
// "doesn't know what looks good" can ship a polished site in seconds.
// Each preset bundles primary + accent colors and a matching font
// pairing. The preset names map to the "feel" a teacher is going for
// rather than a color name, which is friendlier than "Olive/Gold".
//
// To add a preset: append to PRESETS. Keep the list under ~8 — at that
// point the picker becomes a wall and stops feeling curated.

export interface ThemePreset {
  id: string
  name: string
  description: string
  primaryColor: string
  accentColor: string
  headingFont?: string
  bodyFont?: string
}

export const PRESETS: ThemePreset[] = [
  {
    id: "classic-academy",
    name: "Classic Academy",
    description: "Deep navy + warm gold. Trust, gravitas, the safe default.",
    primaryColor: "#0a3024",
    accentColor: "#d4af37",
    headingFont: "Playfair Display",
    bodyFont: "Inter",
  },
  {
    id: "forest-modern",
    name: "Forest Modern",
    description: "Emerald + amber. Earnest, modern, vaguely Scandinavian.",
    primaryColor: "#15803d",
    accentColor: "#f59e0b",
    headingFont: "Fraunces",
    bodyFont: "Manrope",
  },
  {
    id: "midnight-coral",
    name: "Midnight Coral",
    description: "Indigo + coral. Confident, design-forward, for creative teachers.",
    primaryColor: "#1e1b4b",
    accentColor: "#fb7185",
    headingFont: "Cormorant Garamond",
    bodyFont: "Outfit",
  },
  {
    id: "warm-mono",
    name: "Warm Mono",
    description: "Espresso + cream. Editorial, calm, type-led.",
    primaryColor: "#1f1310",
    accentColor: "#c8997a",
    headingFont: "EB Garamond",
    bodyFont: "Manrope",
  },
  {
    id: "ocean-fresh",
    name: "Ocean Fresh",
    description: "Teal + sunshine. Approachable, friendly, kid-and-parent ready.",
    primaryColor: "#0f766e",
    accentColor: "#facc15",
    headingFont: "Outfit",
    bodyFont: "Inter",
  },
  {
    id: "royal-bold",
    name: "Royal Bold",
    description: "Royal purple + electric lime. Bold, attention-grabbing.",
    primaryColor: "#581c87",
    accentColor: "#a3e635",
    headingFont: "Cinzel",
    bodyFont: "Manrope",
  },
  {
    id: "sunset-warm",
    name: "Sunset Warm",
    description: "Rust + butter. Cozy, welcoming, slow-living.",
    primaryColor: "#9a3412",
    accentColor: "#fde68a",
    headingFont: "Fraunces",
    bodyFont: "Inter",
  },
  {
    id: "mono-minimal",
    name: "Mono Minimal",
    description: "Pure black + slate. Editorial-minimal, lets the content shine.",
    primaryColor: "#0a0a0a",
    accentColor: "#737373",
    headingFont: "Manrope",
    bodyFont: "Inter",
  },
]
