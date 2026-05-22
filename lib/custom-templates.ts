"use client"

// JSON schema for user-designed certificate templates. Kept storage-agnostic
// so we can move from localStorage to the backend later without breaking
// existing user data — the schema is the contract.

import { pushToTrash } from "./trash"

export const TEMPLATE_CANVAS = {
  // A4 landscape in CSS px at ~144dpi. The renderer + editor share this so a
  // block at (200, 100) means exactly the same place everywhere.
  width: 1188,
  height: 840,
} as const

// The set of values that can be interpolated into a text block via {{tokens}}.
// Add to this list if you add a new placeholder; the renderer and inspector
// both read from here.
export const TEMPLATE_VARIABLES = [
  { key: 'student_name', label: 'Recipient name', sample: 'Aanya Sharma' },
  { key: 'course_name', label: 'Course name', sample: 'Full-Stack JavaScript Bootcamp' },
  { key: 'completion_date', label: 'Completion date', sample: 'May 14, 2026' },
  { key: 'instructor_name', label: 'Instructor name', sample: 'Dr. Priya Iyer' },
  { key: 'organisation_name', label: 'Organisation', sample: 'The Big Class' },
  { key: 'certificate_id', label: 'Certificate ID', sample: 'CERT-2026-DEMO' },
  { key: 'grade', label: 'Grade (optional)', sample: 'A+' },
] as const

export type TemplateVariable = (typeof TEMPLATE_VARIABLES)[number]['key']

export interface BlockBase {
  id: string
  // Position + size in canvas units (px). Always absolute on the canvas.
  x: number
  y: number
  w: number
  h: number
  rotation?: number // degrees, clockwise
  zIndex?: number
}

export interface TextBlock extends BlockBase {
  type: 'text'
  // Plain text with {{token}} interpolation. Use TEMPLATE_VARIABLES keys.
  content: string
  fontFamily: string
  fontSize: number // px
  fontWeight: 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900
  italic?: boolean
  color: string
  align: 'left' | 'center' | 'right'
  letterSpacing?: number // em
  lineHeight?: number
  uppercase?: boolean
}

export interface ShapeBlock extends BlockBase {
  type: 'shape'
  shape: 'rect' | 'line' | 'circle'
  fill?: string // hex, or null for no fill
  stroke?: string
  strokeWidth?: number
  borderRadius?: number
}

// Placeholder blocks. Backend/renderer fills these at render time.
export interface QrBlock extends BlockBase {
  type: 'qr'
  // Always renders the verification QR for the certificate.
  // Optional design customisation. The QR data is always the verify URL.
  style?: 'square' | 'rounded' | 'dots'
  fgColor?: string  // foreground module colour, default #000000
  bgColor?: string  // background colour, default #ffffff
  padding?: number  // px of quiet-zone padding (default 8). Must be > 0
                    // for the QR to be scannable.
  // Optional centre overlay: lets the user drop a logo / mark in the
  // middle of the QR. Works because the QR uses high error correction.
  centerSrc?: string
  centerSize?: number  // px diameter, defaults to 18% of block size
  centerRounded?: boolean
}

export interface SignatureBlock extends BlockBase {
  type: 'signature'
  // mode = "text" renders the instructor's name in a chosen (cursive) font
  // above a line + label. mode = "image" renders an uploaded signature
  // image above the same line + label.
  mode?: 'text' | 'image'
  imageSrc?: string // when mode === 'image'
  label?: string    // defaults to "Instructor"
  lineColor?: string
  textColor?: string
  fontFamily?: string // when mode === 'text'; default 'Great Vibes, cursive'
  fontSize?: number
  // Override the name shown above the line. Defaults to {{instructor_name}}.
  // Supports the same {{token}} interpolation as text blocks.
  text?: string
}

export interface ImageBlock extends BlockBase {
  type: 'image'
  // Backend asset URL (served from /static/assets/...) or data: URL.
  // Data URLs always work; backend URLs keep template JSON small.
  src: string
  objectFit?: 'cover' | 'contain'
  opacity?: number
  rounded?: boolean
}

// SVG decoration presets — ribbons, seals, badges, stars. The renderer
// looks up the variant by name and renders a parameterised SVG that
// scales with the block's W/H. `primary` and `accent` recolour the
// preset; `text` is optional (e.g. a ribbon banner caption).
export interface DecorationBlock extends BlockBase {
  type: 'decoration'
  // Variant key — looked up by name in decoration-presets.tsx. Kept as
  // string (rather than a giant union) so adding a new SVG preset only
  // requires touching one file.
  variant: string
  primary: string  // hex
  accent: string   // hex
  text?: string    // banner caption (interpolated)
  opacity?: number
}

export type Block =
  | TextBlock
  | ShapeBlock
  | QrBlock
  | SignatureBlock
  | ImageBlock
  | DecorationBlock

export interface CustomTemplate {
  id: string // "custom-<random>"
  name: string
  description?: string
  background: {
    color: string // hex
    // Optional gradient or image background (image as data URL).
    gradient?: { from: string; via?: string; to: string; angle?: number }
    image?: { src: string; opacity?: number }
  }
  blocks: Block[]
  createdAt: string
  updatedAt: string
  // User-controlled flag — favourites surface to the top of the templates
  // list and the new-batch picker.
  favorite?: boolean
}

export function setTemplateFavorite(id: string, favorite: boolean): CustomTemplate[] {
  const list = loadCustomTemplates().map((t) =>
    t.id === id ? { ...t, favorite, updatedAt: new Date().toISOString() } : t
  )
  saveCustomTemplates(list)
  return list
}

// Tenant-scoped storage. Each tenant has its own custom-template library;
// nothing crosses workspaces. The legacy flat key (pre-multi-tenant) is
// migrated into the platform tenant on first read so existing installs
// don't lose their templates.
import { readCurrentTenantSlug } from './tenant-store'

const LEGACY_KEY = 'thebigclass.customTemplates.v1'
function storageKey(slug: string) {
  return `thebigclass.t.${slug}.customTemplates.v1`
}

export function loadCustomTemplates(): CustomTemplate[] {
  if (typeof window === 'undefined') return []
  try {
    const slug = readCurrentTenantSlug()
    const key = storageKey(slug)
    let raw = window.localStorage.getItem(key)
    // One-time migration: copy the legacy flat key into the platform
    // workspace so pre-multi-tenant template libraries survive the upgrade.
    if (!raw && slug === 'platform') {
      const legacy = window.localStorage.getItem(LEGACY_KEY)
      if (legacy) {
        window.localStorage.setItem(key, legacy)
        raw = legacy
      }
    }
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as CustomTemplate[]) : []
  } catch {
    return []
  }
}

export function saveCustomTemplates(list: CustomTemplate[]): void {
  if (typeof window === 'undefined') return
  try {
    const slug = readCurrentTenantSlug()
    window.localStorage.setItem(storageKey(slug), JSON.stringify(list))
  } catch {
    // quota or serialization failure — ignore, user keeps in-memory copy
  }
}

export function upsertCustomTemplate(t: CustomTemplate): CustomTemplate[] {
  const list = loadCustomTemplates()
  const idx = list.findIndex((x) => x.id === t.id)
  const next = idx === -1 ? [t, ...list] : list.map((x) => (x.id === t.id ? t : x))
  saveCustomTemplates(next)
  return next
}

export function deleteCustomTemplate(id: string): CustomTemplate[] {
  const list = loadCustomTemplates()
  const target = list.find((x) => x.id === id)
  if (target) {
    pushToTrash({
      id: target.id,
      kind: "template",
      label: target.name || "Certificate template",
      sublabel: `${target.blocks?.length ?? 0} blocks`,
      payload: target,
    })
  }
  const next = list.filter((x) => x.id !== id)
  saveCustomTemplates(next)
  return next
}

export function getCustomTemplate(id: string): CustomTemplate | undefined {
  return loadCustomTemplates().find((x) => x.id === id)
}

export function newTemplateId(): string {
  return `custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

// Truly blank template — used by the "Clear template" button in the editor.
// White background, zero blocks. Designed for a user who wants to build
// from scratch instead of editing the curated starter.
export function trulyBlankTemplate(name = 'Untitled Template'): CustomTemplate {
  const now = new Date().toISOString()
  return {
    id: newTemplateId(),
    name,
    background: { color: '#ffffff' },
    blocks: [],
    createdAt: now,
    updatedAt: now,
  }
}

// Starter template a new user gets when they hit "Create new". This is
// deliberately not blank: it shows a beautiful, fully-laid-out cert with
// every {{variable}} visible in plain sight so the user can learn the
// syntax by inspection. The layout has been measured to ensure nothing
// overlaps at the canonical canvas (1188×840 px). Each block is sized
// generously (height > content height) so text won't be clipped after
// the recent renderer change.
export function blankTemplate(name = 'My Custom Template'): CustomTemplate {
  const now = new Date().toISOString()
  return {
    id: newTemplateId(),
    name,
    background: {
      color: '#fbf5e7',
      gradient: { from: '#fefce8', via: '#fdf2c0', to: '#fbeec5', angle: 135 },
    },
    blocks: [
      // Decorative border (full-canvas) — sets the cert's frame.
      {
        id: 'frame-outer', type: 'shape',
        x: 36, y: 36, w: 1116, h: 768,
        shape: 'rect',
        fill: 'transparent',
        stroke: '#0a3024', strokeWidth: 3,
      },
      {
        id: 'frame-inner', type: 'shape',
        x: 50, y: 50, w: 1088, h: 740,
        shape: 'rect',
        fill: 'transparent',
        stroke: '#d4af37', strokeWidth: 1,
      },
      // Ribbon banner across the top.
      {
        id: 'top-ribbon', type: 'decoration',
        variant: 'ribbon-banner',
        x: 364, y: 12, w: 460, h: 92,
        primary: '#0a3024', accent: '#1a4d3a',
        text: 'HONOURED',
      },
      // Organisation eyebrow (visible {{variable}}).
      {
        id: 'org', type: 'text',
        x: 90, y: 138, w: 1008, h: 36,
        content: '{{organisation_name}}',
        fontFamily: 'var(--font-cinzel), Cinzel, Georgia, serif',
        fontSize: 16, fontWeight: 700,
        color: '#0a3024', align: 'center',
        letterSpacing: 0.45, uppercase: true,
      },
      // Title — big, bold display serif in deep emerald + gold underline.
      {
        id: 'title', type: 'text',
        x: 90, y: 196, w: 1008, h: 110,
        content: 'CERTIFICATE',
        fontFamily: 'var(--font-cinzel), Cinzel, Georgia, serif',
        fontSize: 64, fontWeight: 900,
        color: '#0a3024', align: 'center',
        letterSpacing: 0.08,
      },
      {
        id: 'title-sub', type: 'text',
        x: 90, y: 296, w: 1008, h: 56,
        content: 'of Completion',
        fontFamily: 'var(--font-cormorant), Cormorant Garamond, Georgia, serif',
        fontSize: 36, fontWeight: 600,
        color: '#b8860b', align: 'center', italic: true,
      },
      // Gold divider line.
      {
        id: 'divider', type: 'shape',
        x: 524, y: 340, w: 140, h: 2,
        shape: 'rect', fill: '#d4af37',
      },
      // Italic preamble.
      {
        id: 'lead', type: 'text',
        x: 90, y: 360, w: 1008, h: 32,
        content: 'This certificate is proudly awarded to',
        fontFamily: 'var(--font-cormorant), Cormorant Garamond, Georgia, serif',
        fontSize: 18, fontWeight: 400,
        color: '#5d6b56', align: 'center', italic: true,
      },
      // Recipient name — visible {{student_name}} variable.
      {
        id: 'recipient', type: 'text',
        x: 90, y: 408, w: 1008, h: 90,
        content: '{{student_name}}',
        fontFamily: 'var(--font-cormorant), Cormorant Garamond, Georgia, serif',
        fontSize: 60, fontWeight: 700,
        color: '#0a3024', align: 'center',
        lineHeight: 1,
      },
      // Underline for the name.
      {
        id: 'name-rule', type: 'shape',
        x: 290, y: 502, w: 608, h: 1,
        shape: 'rect', fill: '#d4af37',
      },
      // Body paragraph with multiple {{variables}}.
      {
        id: 'body', type: 'text',
        x: 130, y: 528, w: 928, h: 72,
        content: 'for the successful completion of {{course_name}}\non {{completion_date}}.',
        fontFamily: 'Inter, sans-serif',
        fontSize: 17, fontWeight: 400,
        color: '#3b4536', align: 'center', lineHeight: 1.6,
      },
      // Cursive signature — centred, with {{instructor_name}} visible
      // so the user can change it (or pull from CSV) from the inspector.
      {
        id: 'sig', type: 'signature',
        x: 444, y: 624, w: 300, h: 116,
        mode: 'text',
        label: 'Signing Authority',
        text: '{{instructor_name}}',
        fontFamily: "var(--font-great-vibes), 'Great Vibes', cursive",
        fontSize: 44,
        textColor: '#0a3024', lineColor: '#0a3024',
      },
      // QR code on the bottom-left, well-padded for scannability.
      {
        id: 'qr', type: 'qr',
        x: 96, y: 624, w: 116, h: 116,
        padding: 8, fgColor: '#0a3024', bgColor: '#ffffff',
      },
      // Classic seal on the bottom-right.
      {
        id: 'seal', type: 'decoration',
        variant: 'seal-classic',
        x: 976, y: 614, w: 116, h: 134,
        primary: '#0a3024', accent: '#d4af37',
        text: 'CERTIFIED',
      },
      // Cert ID — between the QR and the signature, top-aligned with them.
      {
        id: 'cert-id-label', type: 'text',
        x: 240, y: 624, w: 180, h: 16,
        content: 'CERTIFICATE ID',
        fontFamily: 'Inter, sans-serif', fontSize: 9, fontWeight: 700,
        color: '#5d6b56', align: 'left', letterSpacing: 0.3, uppercase: true,
      },
      {
        id: 'cert-id', type: 'text',
        x: 240, y: 644, w: 200, h: 20,
        content: '{{certificate_id}}',
        fontFamily: 'Courier New, monospace', fontSize: 11, fontWeight: 600,
        color: '#0a3024', align: 'left',
      },
      {
        id: 'verify-label', type: 'text',
        x: 240, y: 700, w: 180, h: 16,
        content: 'VERIFY AT',
        fontFamily: 'Inter, sans-serif', fontSize: 9, fontWeight: 700,
        color: '#5d6b56', align: 'left', letterSpacing: 0.3, uppercase: true,
      },
      {
        id: 'verify-url', type: 'text',
        x: 240, y: 720, w: 200, h: 18,
        content: 'Scan the QR code →',
        fontFamily: 'Inter, sans-serif', fontSize: 10, fontWeight: 500,
        color: '#0a3024', align: 'left', italic: true,
      },
      // Digital signature footer — always identifies the issuing platform
      // + a unique signature id so the cert is traceable even off-line.
      {
        id: 'sig-footer', type: 'text',
        x: 70, y: 808, w: 1048, h: 18,
        content: 'Issued by The Big Class · Digital Signature {{certificate_id}}',
        fontFamily: 'var(--font-geist-mono), JetBrains Mono, Courier New, monospace',
        fontSize: 8, fontWeight: 500,
        color: '#0a3024', align: 'center', letterSpacing: 0.15,
      },
    ],
    createdAt: now,
    updatedAt: now,
  }
}
