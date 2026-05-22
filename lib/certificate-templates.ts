// Registry of every built-in certificate layout that ships with the platform.
// These render through <CertificatePreview /> (raw JSX in certificate-preview.tsx,
// not the data-driven CustomTemplateRenderer) and are selectable on any
// course's certificate settings. Kept in one place so the templates gallery
// and the course form can never drift out of sync on names or order.

import type { TemplateType } from "@/components/certificates/certificate-preview"

export interface BuiltinTemplate {
  id: TemplateType
  name: string
  // One short line — shown under the name in the gallery and as a tooltip in
  // the per-course picker. Keep it scannable, not marketing copy.
  tagline: string
}

// Order roughly reflects popularity so the first row is the most useful at
// a glance. Don't sort alphabetically — the gallery would feel arbitrary.
export const BUILTIN_TEMPLATES: BuiltinTemplate[] = [
  { id: "classic",       name: "Classic",       tagline: "Double-border gold, traditional honour" },
  { id: "modern",        name: "Modern",        tagline: "Clean type, plenty of whitespace" },
  { id: "elegant",       name: "Elegant",       tagline: "Soft serif with script signature" },
  { id: "minimal",       name: "Minimal",       tagline: "Just the essentials, nothing else" },
  { id: "corporate",     name: "Corporate",     tagline: "Boardroom-ready, navy and slate" },
  { id: "achievement",   name: "Achievement",   tagline: "Big seal, badge-style centrepiece" },
  { id: "participation", name: "Participation", tagline: "Warm, encouraging, course-completion" },
  { id: "botanical",     name: "Botanical",     tagline: "Leafy accents, soft greens" },
  { id: "executive",     name: "Executive",     tagline: "Heavyweight serif, deep tones" },
  { id: "midnight",      name: "Midnight",      tagline: "Dark theme, metallic accents" },
  { id: "monogram",      name: "Monogram",      tagline: "Centred initial mark, refined" },
  { id: "diploma",       name: "Diploma",       tagline: "University-style scroll layout" },
  { id: "wave",          name: "Wave",          tagline: "Curved banner, friendly modern" },
  { id: "aurora",        name: "Aurora",        tagline: "Gradient backdrop, vivid" },
  { id: "vintage",       name: "Vintage",       tagline: "Antiqued paper, ornamental" },
  { id: "blueprint",     name: "Blueprint",     tagline: "Drafting-grid lines, technical" },
  { id: "artdeco",       name: "Art Deco",      tagline: "Geometric chevrons, 1920s feel" },
  { id: "neon",          name: "Neon",          tagline: "Glow accents, bootcamp / dev" },
]

export const BUILTIN_TEMPLATE_IDS: TemplateType[] = BUILTIN_TEMPLATES.map((t) => t.id)

export function isBuiltinTemplateId(id: string): id is TemplateType {
  return (BUILTIN_TEMPLATE_IDS as string[]).includes(id)
}
