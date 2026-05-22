"use client"

// Reusable block snippets the editor offers in the Component Library.
// A snippet is a partial set of Block objects plus an offset hint. When
// the user drops one onto the canvas, the editor clones the blocks, gives
// them fresh ids, and applies the offset so they don't collide with
// existing content.
//
// Snippets give the user a head-start for common cert sections (header,
// recipient row, body paragraph, signature row, footer with QR + cert id)
// while still leaving every property editable. This is what makes "design
// your own template" not "fight your way to a blank canvas".

import { type Block } from "./custom-templates"

export type SnippetCategory = "Headers" | "Recipient" | "Bodies" | "Signatures" | "Footers" | "Layouts"

// Distributive Omit so the union members keep their discriminant-specific
// properties (Omit<A|B, K> alone collapses to common fields only).
type WithoutId<T> = T extends unknown ? Omit<T, "id"> : never

export interface Snippet {
  id: string
  label: string
  category: SnippetCategory
  description?: string
  // Width/height of the snippet's bounding box, for preview sizing.
  previewW: number
  previewH: number
  // The blocks to add. Coordinates are RELATIVE to the snippet's top-left;
  // the editor offsets them by where the user wants to drop the snippet.
  blocks: WithoutId<Block>[]
}

// Stable id helper used inside the snippet templates so each preview
// renders predictably while still being unique enough to debug.
let n = 0
const nid = () => `snip-${++n}`

export const SNIPPETS: Snippet[] = [
  // ─── Headers ─────────────────────────────────────────────────────────
  {
    id: "header-classic", label: "Classic centred header", category: "Headers",
    description: "Org name in caps + centred serif title",
    previewW: 1080, previewH: 220,
    blocks: [
      { type: "text", x: 90, y: 30, w: 900, h: 30, content: "{{organisation_name}}",
        fontFamily: "Inter, sans-serif", fontSize: 18, fontWeight: 600,
        color: "#64748b", align: "center", letterSpacing: 0.35, uppercase: true },
      { type: "text", x: 90, y: 80, w: 900, h: 110, content: "Certificate of Completion",
        fontFamily: "var(--font-playfair), Playfair Display, Georgia, serif",
        fontSize: 64, fontWeight: 700, color: "#0f172a", align: "center" },
    ],
  },
  {
    id: "header-modern-left", label: "Modern left-aligned", category: "Headers",
    description: "Bold sans-serif, accent-coloured second word",
    previewW: 1080, previewH: 200,
    blocks: [
      { type: "text", x: 0, y: 0, w: 900, h: 28, content: "{{organisation_name}}",
        fontFamily: "Inter, sans-serif", fontSize: 14, fontWeight: 600,
        color: "#2563eb", align: "left", letterSpacing: 0.4, uppercase: true },
      { type: "text", x: 0, y: 38, w: 900, h: 130, content: "Certificate of",
        fontFamily: "Inter, sans-serif", fontSize: 64, fontWeight: 300,
        color: "#0f172a", align: "left", lineHeight: 1 },
      { type: "text", x: 0, y: 110, w: 900, h: 80, content: "Completion",
        fontFamily: "Inter, sans-serif", fontSize: 64, fontWeight: 800,
        color: "#2563eb", align: "left", lineHeight: 1 },
    ],
  },
  {
    id: "header-luxury", label: "Luxury serif + ornament", category: "Headers",
    description: "Italic display serif with gold ornament line",
    previewW: 1080, previewH: 250,
    blocks: [
      { type: "text", x: 0, y: 0, w: 1080, h: 26, content: "❦ ❦ ❦",
        fontFamily: "Georgia, serif", fontSize: 18, fontWeight: 400,
        color: "#d4af37", align: "center", letterSpacing: 0.6 },
      { type: "text", x: 0, y: 40, w: 1080, h: 36, content: "{{organisation_name}}",
        fontFamily: "var(--font-cinzel), Cinzel, Georgia, serif", fontSize: 16,
        fontWeight: 700, color: "#0f172a", align: "center", letterSpacing: 0.5, uppercase: true },
      { type: "text", x: 0, y: 90, w: 1080, h: 130, content: "Certificate of Distinction",
        fontFamily: "var(--font-cormorant), Cormorant Garamond, Georgia, serif",
        fontSize: 64, fontWeight: 600, color: "#0f172a", align: "center", italic: true },
    ],
  },

  // ─── Recipient ───────────────────────────────────────────────────────
  {
    id: "recipient-centered", label: "Centred recipient", category: "Recipient",
    description: "Italic preamble, big serif name, underline",
    previewW: 1080, previewH: 200,
    blocks: [
      { type: "text", x: 0, y: 0, w: 1080, h: 28, content: "This certificate is awarded to",
        fontFamily: "Inter, sans-serif", fontSize: 14, fontWeight: 400,
        color: "#475569", align: "center", italic: true },
      { type: "text", x: 0, y: 40, w: 1080, h: 90, content: "{{student_name}}",
        fontFamily: "var(--font-playfair), Playfair Display, Georgia, serif",
        fontSize: 56, fontWeight: 700, color: "#0f172a", align: "center" },
      { type: "shape", x: 390, y: 150, w: 300, h: 2, shape: "rect", fill: "#0f172a" },
    ],
  },
  {
    id: "recipient-with-label", label: "Recipient + tag label", category: "Recipient",
    description: "Small caps 'AWARDED TO' label above the name",
    previewW: 1080, previewH: 180,
    blocks: [
      { type: "text", x: 0, y: 0, w: 1080, h: 24, content: "— AWARDED TO —",
        fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 700,
        color: "#7c2d12", align: "center", letterSpacing: 0.5, uppercase: true },
      { type: "text", x: 0, y: 36, w: 1080, h: 80, content: "{{student_name}}",
        fontFamily: "Georgia, serif", fontSize: 52, fontWeight: 700,
        color: "#0f172a", align: "center" },
    ],
  },

  // ─── Bodies ──────────────────────────────────────────────────────────
  {
    id: "body-completion", label: "Course completion paragraph", category: "Bodies",
    previewW: 1080, previewH: 90,
    blocks: [
      { type: "text", x: 0, y: 0, w: 1080, h: 90,
        content: "for the successful completion of {{course_name}} on {{completion_date}}.",
        fontFamily: "Inter, sans-serif", fontSize: 18, fontWeight: 400,
        color: "#334155", align: "center", lineHeight: 1.5 },
    ],
  },
  {
    id: "body-recognition", label: "Recognition paragraph", category: "Bodies",
    previewW: 1080, previewH: 120,
    blocks: [
      { type: "text", x: 0, y: 0, w: 1080, h: 120,
        content: "in recognition of outstanding achievement in {{course_name}}, having met every standard set by {{organisation_name}} on {{completion_date}}.",
        fontFamily: "Inter, sans-serif", fontSize: 17, fontWeight: 400,
        color: "#334155", align: "center", lineHeight: 1.6 },
    ],
  },
  {
    id: "body-honoris", label: "Honoris causa (formal)", category: "Bodies",
    previewW: 1080, previewH: 130,
    blocks: [
      { type: "text", x: 0, y: 0, w: 1080, h: 130,
        content: "having faithfully completed the prescribed course of study in {{course_name}}, is hereby admitted to all honours and privileges thereto appertaining.",
        fontFamily: "var(--font-eb-garamond), EB Garamond, Georgia, serif",
        fontSize: 18, fontWeight: 500, color: "#3a2818", align: "center",
        italic: true, lineHeight: 1.6 },
    ],
  },

  // ─── Signatures ──────────────────────────────────────────────────────
  {
    id: "sig-single-cursive", label: "Single cursive signature", category: "Signatures",
    description: "Cursive name above a line + role label",
    previewW: 320, previewH: 110,
    blocks: [
      { type: "signature", x: 0, y: 0, w: 320, h: 110,
        mode: "text", label: "Course Director",
        text: "Dr. Jane Doe",
        fontFamily: "var(--font-great-vibes), 'Great Vibes', cursive",
        fontSize: 42, textColor: "#0f172a", lineColor: "#0f172a" },
    ],
  },
  {
    id: "sig-dual", label: "Dual signatures row", category: "Signatures",
    description: "Two cursive signatures side by side",
    previewW: 720, previewH: 120,
    blocks: [
      { type: "signature", x: 0, y: 0, w: 320, h: 110,
        mode: "text", label: "Programme Director", text: "Dr. Jane Doe",
        fontFamily: "var(--font-great-vibes), 'Great Vibes', cursive", fontSize: 42 },
      { type: "signature", x: 400, y: 0, w: 320, h: 110,
        mode: "text", label: "Issuing Authority", text: "{{organisation_name}}",
        fontFamily: "var(--font-allura), Allura, cursive", fontSize: 42 },
    ],
  },
  {
    id: "sig-from-csv", label: "From CSV instructor", category: "Signatures",
    description: "Pulls {{instructor_name}} from the recipient row",
    previewW: 320, previewH: 110,
    blocks: [
      { type: "signature", x: 0, y: 0, w: 320, h: 110,
        mode: "text", label: "Instructor",
        fontFamily: "var(--font-dancing-script), 'Dancing Script', cursive",
        fontSize: 40 },
    ],
  },

  // ─── Footers ─────────────────────────────────────────────────────────
  {
    id: "footer-id-qr", label: "Cert ID + verify QR", category: "Footers",
    description: "Bottom strip with cert id on left, QR + verify URL on right",
    previewW: 1080, previewH: 130,
    blocks: [
      { type: "text", x: 0, y: 8, w: 600, h: 24, content: "Certificate ID",
        fontFamily: "Inter, sans-serif", fontSize: 10, fontWeight: 600,
        color: "#64748b", align: "left", letterSpacing: 0.25, uppercase: true },
      { type: "text", x: 0, y: 30, w: 600, h: 30, content: "{{certificate_id}}",
        fontFamily: "Courier New, monospace", fontSize: 14, fontWeight: 600,
        color: "#0f172a", align: "left" },
      { type: "text", x: 0, y: 70, w: 600, h: 20, content: "Verify at the QR code →",
        fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: 400,
        color: "#64748b", align: "left", italic: true },
      { type: "qr", x: 960, y: 0, w: 120, h: 120, padding: 8 },
    ],
  },
  {
    id: "footer-three-meta", label: "Date · Instructor · Org", category: "Footers",
    description: "Three columns of metadata across the bottom",
    previewW: 1080, previewH: 90,
    blocks: [
      { type: "text", x: 0, y: 0, w: 320, h: 18, content: "ISSUED",
        fontFamily: "Inter, sans-serif", fontSize: 10, fontWeight: 700,
        color: "#64748b", align: "center", letterSpacing: 0.25, uppercase: true },
      { type: "text", x: 0, y: 24, w: 320, h: 26, content: "{{completion_date}}",
        fontFamily: "Georgia, serif", fontSize: 14, fontWeight: 700, color: "#0f172a", align: "center" },
      { type: "text", x: 380, y: 0, w: 320, h: 18, content: "INSTRUCTOR",
        fontFamily: "Inter, sans-serif", fontSize: 10, fontWeight: 700,
        color: "#64748b", align: "center", letterSpacing: 0.25, uppercase: true },
      { type: "text", x: 380, y: 24, w: 320, h: 26, content: "{{instructor_name}}",
        fontFamily: "Georgia, serif", fontSize: 14, fontWeight: 700, color: "#0f172a", align: "center" },
      { type: "text", x: 760, y: 0, w: 320, h: 18, content: "ORGANISATION",
        fontFamily: "Inter, sans-serif", fontSize: 10, fontWeight: 700,
        color: "#64748b", align: "center", letterSpacing: 0.25, uppercase: true },
      { type: "text", x: 760, y: 24, w: 320, h: 26, content: "{{organisation_name}}",
        fontFamily: "Georgia, serif", fontSize: 14, fontWeight: 700, color: "#0f172a", align: "center" },
    ],
  },

  // ─── Layouts ────────────────────────────────────────────────────────
  // Each layout is a complete certificate composition relative to the
  // canonical 1188×840 canvas. Drop one onto a blank template to skip
  // to a finished design — every block is still independently editable.
  {
    id: "layout-classic-emerald", label: "Classic emerald & gold", category: "Layouts",
    description: "Deep emerald border with gold accents and a cursive signature",
    previewW: 1188, previewH: 840,
    blocks: [
      { type: "shape", x: 36, y: 36, w: 1116, h: 768, shape: "rect", fill: "transparent", stroke: "#0a3024", strokeWidth: 3 },
      { type: "shape", x: 50, y: 50, w: 1088, h: 740, shape: "rect", fill: "transparent", stroke: "#d4af37", strokeWidth: 1 },
      { type: "decoration", variant: "ribbon-banner", x: 364, y: 12, w: 460, h: 92, primary: "#0a3024", accent: "#1a4d3a", text: "HONOURED" },
      { type: "text", x: 90, y: 138, w: 1008, h: 36, content: "{{organisation_name}}",
        fontFamily: "var(--font-cinzel), Cinzel, Georgia, serif", fontSize: 16, fontWeight: 700,
        color: "#0a3024", align: "center", letterSpacing: 0.45, uppercase: true },
      { type: "text", x: 90, y: 196, w: 1008, h: 110, content: "CERTIFICATE",
        fontFamily: "var(--font-cinzel), Cinzel, Georgia, serif", fontSize: 64, fontWeight: 900,
        color: "#0a3024", align: "center", letterSpacing: 0.08 },
      { type: "text", x: 90, y: 296, w: 1008, h: 56, content: "of Completion",
        fontFamily: "var(--font-cormorant), Cormorant Garamond, Georgia, serif",
        fontSize: 36, fontWeight: 600, color: "#b8860b", align: "center", italic: true },
      { type: "shape", x: 524, y: 360, w: 140, h: 2, shape: "rect", fill: "#d4af37" },
      { type: "text", x: 90, y: 376, w: 1008, h: 32, content: "This certificate is proudly awarded to",
        fontFamily: "var(--font-cormorant), Cormorant Garamond, Georgia, serif",
        fontSize: 18, fontWeight: 400, color: "#5d6b56", align: "center", italic: true },
      { type: "text", x: 90, y: 422, w: 1008, h: 90, content: "{{student_name}}",
        fontFamily: "var(--font-cormorant), Cormorant Garamond, Georgia, serif",
        fontSize: 60, fontWeight: 700, color: "#0a3024", align: "center", lineHeight: 1 },
      { type: "text", x: 130, y: 540, w: 928, h: 72,
        content: "for the successful completion of {{course_name}} on {{completion_date}}.",
        fontFamily: "Inter, sans-serif", fontSize: 17, color: "#3b4536", align: "center", fontWeight: 400, lineHeight: 1.6 },
      { type: "signature", x: 444, y: 644, w: 300, h: 110, mode: "text", label: "Signing Authority", text: "{{instructor_name}}",
        fontFamily: "var(--font-great-vibes), 'Great Vibes', cursive", fontSize: 44, textColor: "#0a3024", lineColor: "#0a3024" },
      { type: "qr", x: 96, y: 644, w: 116, h: 116, padding: 8, fgColor: "#0a3024", bgColor: "#ffffff" },
      { type: "decoration", variant: "seal-classic", x: 976, y: 634, w: 116, h: 134, primary: "#0a3024", accent: "#d4af37", text: "CERTIFIED" },
      { type: "text", x: 70, y: 808, w: 1048, h: 18,
        content: "Issued by The Big Class · Digital Signature {{certificate_id}}",
        fontFamily: "var(--font-geist-mono), JetBrains Mono, Courier New, monospace",
        fontSize: 8, fontWeight: 500, color: "#0a3024", align: "center", letterSpacing: 0.15 },
    ],
  },
  {
    id: "layout-modern-minimal", label: "Modern minimal", category: "Layouts",
    description: "Bold sans-serif, accent left-bar, lots of whitespace",
    previewW: 1188, previewH: 840,
    blocks: [
      { type: "shape", x: 0, y: 0, w: 60, h: 840, shape: "rect", fill: "#2563eb" },
      { type: "text", x: 120, y: 110, w: 980, h: 32, content: "{{organisation_name}}",
        fontFamily: "Inter, sans-serif", fontSize: 14, fontWeight: 700,
        color: "#2563eb", align: "left", letterSpacing: 0.4, uppercase: true },
      { type: "text", x: 120, y: 170, w: 980, h: 110, content: "Certificate of",
        fontFamily: "Inter, sans-serif", fontSize: 80, fontWeight: 300,
        color: "#0f172a", align: "left", lineHeight: 1 },
      { type: "text", x: 120, y: 252, w: 980, h: 110, content: "Completion",
        fontFamily: "Inter, sans-serif", fontSize: 80, fontWeight: 800,
        color: "#2563eb", align: "left", lineHeight: 1 },
      { type: "text", x: 120, y: 408, w: 980, h: 24, content: "AWARDED TO",
        fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: 700,
        color: "#64748b", align: "left", letterSpacing: 0.35, uppercase: true },
      { type: "text", x: 120, y: 440, w: 980, h: 80, content: "{{student_name}}",
        fontFamily: "Inter, sans-serif", fontSize: 56, fontWeight: 800,
        color: "#0f172a", align: "left", lineHeight: 1 },
      { type: "text", x: 120, y: 540, w: 900, h: 60,
        content: "for completing {{course_name}} on {{completion_date}}.",
        fontFamily: "Inter, sans-serif", fontSize: 18, color: "#334155", align: "left", fontWeight: 400 },
      { type: "signature", x: 120, y: 660, w: 280, h: 100, mode: "text", label: "Instructor",
        text: "{{instructor_name}}", fontFamily: "var(--font-dancing-script), 'Dancing Script', cursive",
        fontSize: 36, textColor: "#0f172a", lineColor: "#0f172a" },
      { type: "qr", x: 1000, y: 660, w: 120, h: 120, padding: 8, fgColor: "#2563eb", bgColor: "#ffffff" },
      { type: "text", x: 60, y: 808, w: 1108, h: 18,
        content: "Issued by The Big Class · Digital Signature {{certificate_id}}",
        fontFamily: "var(--font-geist-mono), JetBrains Mono, Courier New, monospace",
        fontSize: 8, color: "#2563eb", align: "center", letterSpacing: 0.15, fontWeight: 500 },
    ],
  },
  {
    id: "layout-luxury-dark", label: "Luxury dark + gold", category: "Layouts",
    description: "Black background with gold display serif — premium feel",
    previewW: 1188, previewH: 840,
    blocks: [
      { type: "shape", x: 0, y: 0, w: 1188, h: 840, shape: "rect", fill: "#0a0a0f" },
      { type: "shape", x: 36, y: 36, w: 1116, h: 768, shape: "rect", fill: "transparent", stroke: "#d4af37", strokeWidth: 1 },
      { type: "text", x: 90, y: 90, w: 1008, h: 30, content: "❦ ❦ ❦",
        fontFamily: "Georgia, serif", fontSize: 18, color: "#d4af37", align: "center", letterSpacing: 0.6, fontWeight: 400 },
      { type: "text", x: 90, y: 130, w: 1008, h: 32, content: "{{organisation_name}}",
        fontFamily: "var(--font-cinzel), Cinzel, Georgia, serif", fontSize: 16, fontWeight: 700,
        color: "#d4af37", align: "center", letterSpacing: 0.5, uppercase: true },
      { type: "text", x: 90, y: 200, w: 1008, h: 130, content: "Certificate of",
        fontFamily: "var(--font-cormorant), Cormorant Garamond, Georgia, serif", fontSize: 64,
        fontWeight: 500, color: "#f5e6b3", align: "center", italic: true, lineHeight: 1 },
      { type: "text", x: 90, y: 308, w: 1008, h: 70, content: "DISTINCTION",
        fontFamily: "var(--font-cinzel), Cinzel, Georgia, serif", fontSize: 40, fontWeight: 700,
        color: "#d4af37", align: "center", letterSpacing: 0.15 },
      { type: "text", x: 90, y: 400, w: 1008, h: 22, content: "PRESENTED TO",
        fontFamily: "var(--font-cinzel), Cinzel, Georgia, serif", fontSize: 10, color: "#a8915a", align: "center", letterSpacing: 0.4, fontWeight: 500 },
      { type: "text", x: 90, y: 430, w: 1008, h: 90, content: "{{student_name}}",
        fontFamily: "var(--font-cormorant), Cormorant Garamond, Georgia, serif",
        fontSize: 60, fontWeight: 600, color: "#f5e6b3", align: "center", lineHeight: 1 },
      { type: "shape", x: 444, y: 540, w: 300, h: 1, shape: "rect", fill: "#d4af37" },
      { type: "text", x: 130, y: 560, w: 928, h: 60,
        content: "in recognition of the honourable completion of {{course_name}}.",
        fontFamily: "var(--font-cormorant), Cormorant Garamond, Georgia, serif",
        fontSize: 18, color: "#c9b78a", align: "center", italic: true, fontWeight: 400, lineHeight: 1.6 },
      { type: "signature", x: 130, y: 660, w: 280, h: 90, mode: "text", label: "Signing Authority",
        text: "{{instructor_name}}", fontFamily: "var(--font-allura), Allura, cursive",
        fontSize: 44, textColor: "#f5e6b3", lineColor: "#d4af37" },
      { type: "qr", x: 970, y: 660, w: 100, h: 100, padding: 6, fgColor: "#0a0a0f", bgColor: "#f5e6b3" },
      { type: "decoration", variant: "seal-classic", x: 544, y: 638, w: 100, h: 120, primary: "#d4af37", accent: "#0a0a0f", text: "DISTINCTION" },
      { type: "text", x: 70, y: 808, w: 1048, h: 18,
        content: "Issued by The Big Class · Digital Signature {{certificate_id}}",
        fontFamily: "var(--font-geist-mono), JetBrains Mono, Courier New, monospace",
        fontSize: 8, color: "#a8915a", align: "center", letterSpacing: 0.15, fontWeight: 500 },
    ],
  },
  {
    id: "layout-diploma", label: "University diploma", category: "Layouts",
    description: "Aged-parchment formal diploma with twin seals",
    previewW: 1188, previewH: 840,
    blocks: [
      { type: "shape", x: 0, y: 0, w: 1188, h: 840, shape: "rect", fill: "#fbf5e7" },
      { type: "shape", x: 36, y: 36, w: 1116, h: 768, shape: "rect", fill: "transparent", stroke: "#a8874b", strokeWidth: 3 },
      { type: "shape", x: 50, y: 50, w: 1088, h: 740, shape: "rect", fill: "transparent", stroke: "#a8874b", strokeWidth: 0.6 },
      { type: "text", x: 90, y: 110, w: 1008, h: 24, content: "— EST. MMXXVI —",
        fontFamily: "var(--font-eb-garamond), EB Garamond, Georgia, serif",
        fontSize: 10, color: "#6b4423", align: "center", letterSpacing: 0.5, fontWeight: 500 },
      { type: "text", x: 90, y: 140, w: 1008, h: 30, content: "{{organisation_name}}",
        fontFamily: "var(--font-eb-garamond), EB Garamond, Georgia, serif",
        fontSize: 16, fontWeight: 700, color: "#3a2818", align: "center", letterSpacing: 0.4, uppercase: true },
      { type: "text", x: 90, y: 180, w: 1008, h: 26, content: "❦ ❦ ❦",
        fontFamily: "Georgia, serif", fontSize: 14, color: "#a8874b", align: "center", letterSpacing: 0.6, fontWeight: 400 },
      { type: "text", x: 90, y: 230, w: 1008, h: 110, content: "Diploma of Completion",
        fontFamily: "var(--font-eb-garamond), EB Garamond, Georgia, serif",
        fontSize: 56, fontWeight: 700, color: "#28201a", align: "center", italic: true },
      { type: "text", x: 90, y: 360, w: 1008, h: 28, content: "Be it known to all who shall read these presents that",
        fontFamily: "var(--font-eb-garamond), EB Garamond, Georgia, serif",
        fontSize: 16, color: "#5a4a30", align: "center", italic: true, fontWeight: 500 },
      { type: "text", x: 90, y: 410, w: 1008, h: 90, content: "{{student_name}}",
        fontFamily: "var(--font-eb-garamond), EB Garamond, Georgia, serif",
        fontSize: 56, fontWeight: 500, color: "#28201a", align: "center", italic: true, lineHeight: 1 },
      { type: "shape", x: 244, y: 506, w: 700, h: 1, shape: "rect", fill: "#a8874b" },
      { type: "text", x: 130, y: 530, w: 928, h: 72,
        content: "having faithfully completed the prescribed course in {{course_name}} on {{completion_date}}.",
        fontFamily: "var(--font-eb-garamond), EB Garamond, Georgia, serif",
        fontSize: 16, color: "#3a3025", align: "center", italic: true, fontWeight: 500, lineHeight: 1.6 },
      { type: "decoration", variant: "seal-vintage", x: 110, y: 630, w: 130, h: 140, primary: "#6b4423", accent: "#fde68a", text: "MMXXVI" },
      { type: "signature", x: 444, y: 644, w: 300, h: 110, mode: "text", label: "Faculty Director",
        text: "{{instructor_name}}", fontFamily: "var(--font-great-vibes), 'Great Vibes', cursive",
        fontSize: 44, textColor: "#28201a", lineColor: "#28201a" },
      { type: "decoration", variant: "seal-classic", x: 948, y: 634, w: 130, h: 140, primary: "#6b4423", accent: "#a8874b", text: "CONFERRED" },
      { type: "text", x: 70, y: 808, w: 1048, h: 18,
        content: "Issued by The Big Class · Digital Signature {{certificate_id}}",
        fontFamily: "var(--font-geist-mono), JetBrains Mono, Courier New, monospace",
        fontSize: 8, color: "#6b4423", align: "center", letterSpacing: 0.15, fontWeight: 500 },
    ],
  },
  {
    id: "layout-achievement", label: "Achievement banner", category: "Layouts",
    description: "Bold gradient banner header with star burst",
    previewW: 1188, previewH: 840,
    blocks: [
      { type: "shape", x: 0, y: 0, w: 1188, h: 840, shape: "rect", fill: "#ffffff" },
      // banner block faked with a tall coloured rect — gradient is on background normally
      { type: "shape", x: 0, y: 0, w: 1188, h: 220, shape: "rect", fill: "#6d28d9" },
      { type: "text", x: 90, y: 60, w: 1008, h: 24, content: "{{organisation_name}}",
        fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600,
        color: "#ffffff", align: "center", letterSpacing: 0.45, uppercase: true },
      { type: "text", x: 90, y: 100, w: 1008, h: 100, content: "Certificate of Achievement",
        fontFamily: "var(--font-playfair), Playfair Display, Georgia, serif",
        fontSize: 60, fontWeight: 900, color: "#ffffff", align: "center", lineHeight: 1 },
      { type: "decoration", variant: "star-burst", x: 544, y: 180, w: 100, h: 100, primary: "#fbbf24", accent: "#b45309" },
      { type: "text", x: 90, y: 320, w: 1008, h: 22, content: "PRESENTED TO",
        fontFamily: "Inter, sans-serif", fontSize: 11, color: "#7c3aed", align: "center", letterSpacing: 0.4, uppercase: true, fontWeight: 700 },
      { type: "text", x: 90, y: 360, w: 1008, h: 100, content: "{{student_name}}",
        fontFamily: "var(--font-playfair), Playfair Display, Georgia, serif",
        fontSize: 64, fontWeight: 900, color: "#0f172a", align: "center", lineHeight: 1 },
      { type: "text", x: 130, y: 480, w: 928, h: 80,
        content: "in recognition of outstanding performance in {{course_name}}, completed on {{completion_date}}.",
        fontFamily: "Inter, sans-serif", fontSize: 17, color: "#374151", align: "center", fontWeight: 400, lineHeight: 1.6 },
      { type: "signature", x: 444, y: 640, w: 300, h: 90, mode: "text", label: "Instructor",
        text: "{{instructor_name}}", fontFamily: "var(--font-great-vibes), 'Great Vibes', cursive",
        fontSize: 42, textColor: "#6d28d9", lineColor: "#6d28d9" },
      { type: "qr", x: 96, y: 640, w: 110, h: 110, padding: 8, fgColor: "#6d28d9", bgColor: "#ffffff" },
      { type: "decoration", variant: "badge-medal", x: 990, y: 620, w: 110, h: 150, primary: "#7c3aed", accent: "#f59e0b" },
      { type: "text", x: 70, y: 808, w: 1048, h: 18,
        content: "Issued by The Big Class · Digital Signature {{certificate_id}}",
        fontFamily: "var(--font-geist-mono), JetBrains Mono, Courier New, monospace",
        fontSize: 8, color: "#6d28d9", align: "center", letterSpacing: 0.15, fontWeight: 500 },
    ],
  },
  {
    id: "layout-participation", label: "Participation (friendly)", category: "Layouts",
    description: "Soft pastel with rounded styling — workshops & events",
    previewW: 1188, previewH: 840,
    blocks: [
      { type: "shape", x: 0, y: 0, w: 1188, h: 840, shape: "rect", fill: "#fef6ee" },
      { type: "shape", x: 60, y: 60, w: 1068, h: 720, shape: "rect", fill: "#ffffff", borderRadius: 50 },
      { type: "decoration", variant: "corner-floral", x: 80, y: 80, w: 130, h: 130, primary: "#a78bd6", accent: "#f5c2dc" },
      { type: "text", x: 90, y: 140, w: 1008, h: 28, content: "{{organisation_name}}",
        fontFamily: "var(--font-manrope), Manrope, sans-serif", fontSize: 14, fontWeight: 800,
        color: "#f59ec1", align: "center", letterSpacing: 0.35, uppercase: true },
      { type: "text", x: 90, y: 200, w: 1008, h: 90, content: "Certificate of Participation",
        fontFamily: "var(--font-manrope), Manrope, sans-serif", fontSize: 52, fontWeight: 900,
        color: "#6c5b9c", align: "center", lineHeight: 1 },
      { type: "text", x: 90, y: 320, w: 1008, h: 28, content: "awarded with appreciation to",
        fontFamily: "Inter, sans-serif", fontSize: 16, color: "#8c83a8", align: "center", italic: true, fontWeight: 500 },
      { type: "text", x: 90, y: 370, w: 1008, h: 100, content: "{{student_name}}",
        fontFamily: "var(--font-manrope), Manrope, sans-serif", fontSize: 60, fontWeight: 900,
        color: "#6c5b9c", align: "center", lineHeight: 1 },
      { type: "text", x: 130, y: 500, w: 928, h: 80,
        content: "for joining and taking part in {{course_name}} on {{completion_date}}. Thank you!",
        fontFamily: "Inter, sans-serif", fontSize: 17, color: "#5a5478", align: "center", fontWeight: 400, lineHeight: 1.6 },
      { type: "signature", x: 444, y: 640, w: 300, h: 90, mode: "text", label: "Facilitator",
        text: "{{instructor_name}}", fontFamily: "var(--font-pacifico), Pacifico, cursive",
        fontSize: 32, textColor: "#6c5b9c", lineColor: "#a78bd6" },
      { type: "qr", x: 110, y: 640, w: 100, h: 100, padding: 8, fgColor: "#6c5b9c", bgColor: "#ffffff" },
      { type: "decoration", variant: "badge-rosette", x: 980, y: 630, w: 120, h: 120, primary: "#a78bd6", accent: "#6c5b9c" },
      { type: "text", x: 60, y: 800, w: 1068, h: 18,
        content: "Issued by The Big Class · Digital Signature {{certificate_id}}",
        fontFamily: "var(--font-geist-mono), JetBrains Mono, Courier New, monospace",
        fontSize: 8, color: "#8c83a8", align: "center", letterSpacing: 0.15, fontWeight: 500 },
    ],
  },
]

export const SNIPPET_CATEGORIES: SnippetCategory[] =
  ["Headers", "Recipient", "Bodies", "Signatures", "Footers", "Layouts"]
