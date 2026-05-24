// Client-side cover-image generator.
//
// Why canvas instead of an image-gen API:
//   • No round-trip cost, no rate-limits, runs offline.
//   • Visual style stays consistent with the workspace brand
//     (gradient + typography + kind glyph) rather than the random
//     output of a model.
//   • Same input → same output, so re-clicking is a refresh of the
//     same layout, not a slot-machine generator.
//
// What we render onto a 1200×630 canvas (OG-ratio):
//   1. A two-stop gradient seeded by the title — deterministic so
//      the same product always looks the same.
//   2. A diagonal frosted-glass highlight band (subtle depth).
//   3. The product title in a serif weight (with auto-wrap and
//      auto-shrink so 60-char titles still read).
//   4. An emoji glyph mapped from the product kind (top-left).
//   5. A small "by <workspace>" tag (bottom-left).
//   6. The price chip (top-right) when an amount is provided.
//
// Output is a PNG data URL. The caller uploads it via uploadAsset to
// get a permanent CDN URL — we never persist data: URLs to the
// product record because they'd swell the localStorage payload.

export interface CoverGenInput {
  title: string
  kind: string
  workspaceName?: string
  priceLabel?: string
  /** When set, used as the gradient seed instead of the title.
   *  Lets the caller "shuffle" by passing a new seed. */
  variantSeed?: string
}

// Palette pairs picked to feel premium (no Tailwind defaults — these
// are colors that read at 1200×630 thumbnail size in feeds).
const PALETTES: Array<[string, string]> = [
  ["#7c3aed", "#ec4899"],   // violet → pink
  ["#0ea5e9", "#22d3ee"],   // sky → cyan
  ["#10b981", "#84cc16"],   // emerald → lime
  ["#f97316", "#f59e0b"],   // orange → amber
  ["#ef4444", "#f97316"],   // red → orange
  ["#0f172a", "#1e40af"],   // slate → blue (dark)
  ["#1e293b", "#7c3aed"],   // slate → violet
  ["#06b6d4", "#3b82f6"],   // cyan → blue
  ["#db2777", "#7c3aed"],   // pink → violet
  ["#0891b2", "#0f766e"],   // cyan → teal
  ["#a855f7", "#3b82f6"],   // purple → blue
  ["#f43f5e", "#fb7185"],   // rose
]

const KIND_GLYPHS: Record<string, string> = {
  course: "📘",
  download: "⬇️",
  bundle: "📦",
  membership: "✨",
  session: "🎯",
  webinar: "🎥",
  license: "🔑",
}

function hashString(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = (h * 16777619) >>> 0
  }
  return h
}

/** Pick the palette index for a given seed string. Stable. */
export function paletteIndexFor(seed: string): number {
  return hashString(seed) % PALETTES.length
}

/** Wrap text into lines that fit within `maxWidth`, breaking on
 *  spaces. If no break-point exists we fall back to a hard slice. */
function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/)
  const lines: string[] = []
  let line = ""
  for (const w of words) {
    const next = line ? `${line} ${w}` : w
    if (ctx.measureText(next).width <= maxWidth) {
      line = next
    } else {
      if (line) lines.push(line)
      line = w
    }
  }
  if (line) lines.push(line)
  return lines
}

export async function generateCoverDataUrl(input: CoverGenInput): Promise<string> {
  const W = 1200
  const H = 630
  const canvas = document.createElement("canvas")
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("Canvas not supported")

  const seed = input.variantSeed ?? input.title
  const [c1, c2] = PALETTES[paletteIndexFor(seed)]

  // Diagonal gradient — top-left → bottom-right.
  const g = ctx.createLinearGradient(0, 0, W, H)
  g.addColorStop(0, c1)
  g.addColorStop(1, c2)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, W, H)

  // Frosted band — gives the flat gradient a sense of depth without
  // a noise/grain texture (which doesn't survive JPEG compression).
  ctx.save()
  ctx.translate(W / 2, H / 2)
  ctx.rotate(-Math.PI / 12)
  ctx.fillStyle = "rgba(255,255,255,0.08)"
  ctx.fillRect(-W, -60, W * 2, 120)
  ctx.restore()

  // Soft vignette so the corners don't pull the eye away from the
  // title block.
  const vg = ctx.createRadialGradient(W / 2, H / 2, W * 0.2, W / 2, H / 2, W * 0.7)
  vg.addColorStop(0, "rgba(0,0,0,0)")
  vg.addColorStop(1, "rgba(0,0,0,0.25)")
  ctx.fillStyle = vg
  ctx.fillRect(0, 0, W, H)

  // Kind glyph (emoji top-left).
  const glyph = KIND_GLYPHS[input.kind] ?? "🛍️"
  ctx.font = "64px system-ui, -apple-system, 'Segoe UI Emoji', sans-serif"
  ctx.textBaseline = "top"
  ctx.fillText(glyph, 72, 72)

  // Price chip (top-right).
  if (input.priceLabel) {
    const pad = 24
    const fontSize = 28
    ctx.font = `600 ${fontSize}px ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif`
    const metrics = ctx.measureText(input.priceLabel)
    const chipW = metrics.width + pad * 2
    const chipH = fontSize + pad
    const chipX = W - 72 - chipW
    const chipY = 72
    ctx.fillStyle = "rgba(255,255,255,0.95)"
    roundRect(ctx, chipX, chipY, chipW, chipH, 999)
    ctx.fill()
    ctx.fillStyle = "#0f172a"
    ctx.textBaseline = "middle"
    ctx.fillText(input.priceLabel, chipX + pad, chipY + chipH / 2)
  }

  // Title block — auto-shrink from 88px down to 52px until it fits 3 lines.
  const title = (input.title || "Untitled product").trim()
  const maxTitleWidth = W - 144
  let titleFont = 88
  let lines: string[] = []
  while (titleFont >= 52) {
    ctx.font = `700 ${titleFont}px ui-serif, Georgia, "Times New Roman", serif`
    lines = wrap(ctx, title, maxTitleWidth)
    if (lines.length <= 3) break
    titleFont -= 6
  }
  // If still over 3 lines, hard-truncate the 3rd with ellipsis.
  if (lines.length > 3) {
    lines = lines.slice(0, 3)
    let last = lines[2]
    while (ctx.measureText(last + "…").width > maxTitleWidth && last.length > 0) {
      last = last.slice(0, -1)
    }
    lines[2] = last + "…"
  }
  ctx.fillStyle = "#ffffff"
  ctx.textBaseline = "alphabetic"
  ctx.shadowColor = "rgba(0,0,0,0.35)"
  ctx.shadowBlur = 24
  ctx.shadowOffsetY = 4
  const lineHeight = titleFont * 1.12
  const totalHeight = lineHeight * lines.length
  let y = H / 2 - totalHeight / 2 + titleFont * 0.85
  for (const line of lines) {
    ctx.fillText(line, 72, y)
    y += lineHeight
  }
  ctx.shadowBlur = 0
  ctx.shadowOffsetY = 0

  // Workspace tag (bottom-left).
  if (input.workspaceName) {
    ctx.font = "500 22px ui-sans-serif, system-ui, -apple-system, sans-serif"
    ctx.fillStyle = "rgba(255,255,255,0.85)"
    ctx.textBaseline = "alphabetic"
    ctx.fillText(`by ${input.workspaceName}`, 72, H - 56)
  }

  return canvas.toDataURL("image/png")
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.lineTo(x + w - radius, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius)
  ctx.lineTo(x + w, y + h - radius)
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h)
  ctx.lineTo(x + radius, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius)
  ctx.lineTo(x, y + radius)
  ctx.quadraticCurveTo(x, y, x + radius, y)
  ctx.closePath()
}

/** Convert a data URL produced by generateCoverDataUrl into a File
 *  ready to hand to uploadAsset. */
export function dataUrlToFile(dataUrl: string, filename: string): File {
  const [meta, b64] = dataUrl.split(",")
  const mime = /data:([^;]+)/.exec(meta)?.[1] ?? "image/png"
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return new File([bytes], filename, { type: mime })
}
