"use client"

// Canvas-based cover composer.
//
// Loads the photograph (Picsum) with CORS, draws the same eyebrow /
// title / audience / pills overlay the inline-SVG preview shows,
// then exports the whole thing as a JPEG data URL. The result is
// ONE image the rest of the app treats as the saved thumbnail —
// `<img src={course.thumbnail}>` everywhere works without an
// overlay component.
//
// We accept the trade-off that this is a baked, rasterised cover —
// it doesn't update when the teacher renames the course later, so
// the caller is responsible for re-baking on edit (or showing a
// "regenerate cover" button in the editor). For the homepage
// generator's "drop it into my workspace as-is" flow this is the
// right move: the visitor saw the cover with the title baked in,
// and that's what should land in their dashboard.

import {
  CATEGORY_LABEL,
  pickCoverImageUrl,
  type CourseSeed,
} from "./course-builder-templates"

// Use standard 800×500 dimensions (aspect ratio 1.6) so the coordinates
// mapped from the SVG match 1-to-1 without rounding or truncation errors,
// while keeping the uploaded image extremely sharp on high-DPI retina screens.
const W = 800
const H = 500

// Size cap (in characters of the data URL). Past this we treat the
// bake as "too big to store" and the caller falls back to the bare
// image URL. localStorage typically caps at ~5 MB; 220 KB per
// course leaves plenty of room for the rest of the workspace.
const MAX_DATAURL_LEN = 220_000

// Hard timeout for the bake. If the photo fetch or canvas roundtrip
// doesn't finish in this window we give up and let the caller fall
// back to the bare image URL — never makes the user wait forever
// on a stalled connection or a misbehaving CDN.
const BAKE_TIMEOUT_MS = 10_000

export async function composeCoverPng(seed: CourseSeed): Promise<string | null> {
  if (typeof window === "undefined" || typeof document === "undefined") return null

  // Race the real bake against a timeout so the caller never hangs.
  const timeoutPromise = new Promise<null>((resolve) =>
    setTimeout(() => resolve(null), BAKE_TIMEOUT_MS),
  )
  return Promise.race([composeCoverPngInner(seed), timeoutPromise])
}

async function composeCoverPngInner(seed: CourseSeed): Promise<string | null> {
  try {
    const photoUrl = pickCoverImageUrl(seed)
    // CORS-safe image load. Picsum 302-redirects to a Fastly URL
    // and the redirect can sometimes drop the
    // Access-Control-Allow-Origin header — when that happens, a
    // direct <img crossOrigin="anonymous"> taints the canvas and
    // toDataURL throws SecurityError, so the bake silently returns
    // null. Going through fetch+FileReader instead converts the
    // photo to a same-origin data: URL before we hand it to the
    // <img> element, which means the canvas can never be tainted.
    const photoDataUrl = await fetchAsDataUrl(photoUrl)
    if (!photoDataUrl) return null
    const img = await loadImage(photoDataUrl)

    const canvas = document.createElement("canvas")
    canvas.width = W
    canvas.height = H
    const ctx = canvas.getContext("2d")
    if (!ctx) return null

    // 1. Solid fallback so the cover never reads as blank if the
    //    photo's transparent areas show through (rare for JPEGs but
    //    the gradient also gives the cover a coloured backdrop in
    //    case the image fails partway).
    const bg = ctx.createLinearGradient(0, 0, W, H)
    bg.addColorStop(0, `hsl(${seed.brandHue}, 78%, 58%)`)
    bg.addColorStop(1, `hsl(${(seed.brandHue + 50) % 360}, 64%, 24%)`)
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, W, H)

    // 2. Photograph, cover-fit (matches the SVG's xMidYMid slice).
    drawImageCover(ctx, img, 0, 0, W, H)

    // 3. Category-tinted radial accent (bottom-right).
    const tint = ctx.createRadialGradient(W * 0.95, H * 0.95, 50, W * 0.95, H * 0.95, W * 0.7)
    tint.addColorStop(0, `hsla(${seed.brandHue}, 78%, 55%, 0.35)`)
    tint.addColorStop(1, "rgba(0,0,0,0)")
    ctx.fillStyle = tint
    ctx.fillRect(0, 0, W, H)

    // 4. Dark vertical overlay — keeps the title legible.
    const overlay = ctx.createLinearGradient(0, 0, 0, H)
    overlay.addColorStop(0, "rgba(0,0,0,0.15)")
    overlay.addColorStop(0.55, "rgba(0,0,0,0.40)")
    overlay.addColorStop(1, "rgba(0,0,0,0.82)")
    ctx.fillStyle = overlay
    ctx.fillRect(0, 0, W, H)

    // 5. Eyebrow chip (top-left).
    const category = CATEGORY_LABEL[seed.category].toUpperCase()
    ctx.font = "700 11px Inter, system-ui, sans-serif"
    ctx.textBaseline = "middle"
    const catTrackedWidth = measureTracked(ctx, category, 2)
    const chipW = catTrackedWidth + 20
    roundRect(ctx, 40, 40, chipW, 22, 11)
    ctx.fillStyle = "rgba(255,255,255,0.15)"
    ctx.fill()
    ctx.fillStyle = "#ffffff"
    drawTrackedText(ctx, category, 50, 40 + 11, 2)

    // 6. Brand mark (top-right).
    ctx.font = "500 11px Inter, system-ui, sans-serif"
    ctx.fillStyle = "rgba(255,255,255,0.85)"
    ctx.textAlign = "right"
    drawTrackedText(ctx, "THEBIGCLASS", W - 40, 40 + 11, 1.5)
    ctx.textAlign = "left"

    // 7. Title layout (matches the SVG / inline preview).
    const titleLines = wrapTitle(seed.topic, 18, 3)
    const titleFontSize = titleLines.length === 1 ? 64 : 52
    const titleLineHeight = Math.round(titleFontSize * 1.05)
    const lastLineY = 380
    const titleAnchorY = lastLineY - (titleLines.length - 1) * titleLineHeight
    const audienceY = Math.round(titleAnchorY - 24)

    // 7a. Audience hint above the title.
    if (seed.audienceHint) {
      const audience = `For ${seed.audienceHint}`.toUpperCase()
      ctx.font = "400 12px ui-monospace, SFMono-Regular, Menlo, monospace"
      ctx.fillStyle = "rgba(255,255,255,0.85)"
      ctx.textBaseline = "middle"
      drawTrackedText(ctx, audience, 48, audienceY, 2.5)
    }

    // 7b. Title with drop-shadow.
    ctx.font = `700 ${titleFontSize}px Georgia, "Times New Roman", serif`
    ctx.textBaseline = "alphabetic"
    ctx.fillStyle = "#ffffff"
    ctx.shadowColor = "rgba(0,0,0,0.6)"
    ctx.shadowBlur = 8
    ctx.shadowOffsetX = 0
    ctx.shadowOffsetY = 2
    titleLines.forEach((line, i) => {
      ctx.fillText(line, 48, titleAnchorY + i * titleLineHeight)
    })
    ctx.shadowColor = "transparent"
    ctx.shadowBlur = 0
    ctx.shadowOffsetY = 0

    // 8. Info pills (bottom-left).
    ctx.font = "400 11px ui-monospace, SFMono-Regular, Menlo, monospace"
    ctx.textBaseline = "middle"
    const pillLabels = [
      `${seed.modules.length} modules`,
      `${seed.modules.reduce((n, m) => n + m.lessons.length, 0)} lessons`,
      "Certificate",
    ]
    pillLabels.forEach((label, i) => {
      const x = 48 + i * 100
      roundRect(ctx, x, 424, 92, 22, 4)
      ctx.fillStyle = "rgba(0,0,0,0.22)"
      ctx.fill()
      ctx.fillStyle = "#ffffff"
      ctx.fillText(label, x + 10, 424 + 11)
    })

    // 9. Export. JPEG quality 0.85 hits ~80-150 KB for the typical
    //    photographic content. Caller checks length against
    //    MAX_DATAURL_LEN before saving.
    const dataUrl = canvas.toDataURL("image/jpeg", 0.78)
    return dataUrl
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("[cover-compose] bake failed, caller will fall back to bare URL", err)
    return null
  }
}

// Caller-facing helper: returns the baked JPEG only if it fits.
// `null` means "skip — keep the bare URL".
export function isBakedThumbnailAcceptable(dataUrl: string | null): boolean {
  return !!dataUrl && dataUrl.length <= MAX_DATAURL_LEN
}

// ---------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    // For data: URLs (which we always use after fetchAsDataUrl) we
    // don't need crossOrigin. For cross-origin URLs we'd need it,
    // but the canvas-tainting risk from a redirect dropping CORS
    // is what made us route everything through a data URL first.
    if (!url.startsWith("data:")) img.crossOrigin = "anonymous"
    img.onload = () => resolve(img)
    img.onerror = (e) =>
      reject(new Error(`Failed to load cover image: ${String(e)}`))
    img.src = url
  })
}

// Fetch a remote image and base64-encode it as a data URL. This is
// our defence against canvas-tainting CORS issues: by the time the
// pixel data reaches the Image element it's same-origin (a data
// URL), so toDataURL on the canvas can never throw SecurityError.
async function fetchAsDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { mode: "cors" })
    if (!res.ok) return null
    const blob = await res.blob()
    return await new Promise<string | null>((resolve) => {
      const reader = new FileReader()
      reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : null)
      reader.onerror = () => resolve(null)
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

// Cover-fit draw — crops to fill without distorting aspect ratio.
function drawImageCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
): void {
  const sourceAr = img.naturalWidth / img.naturalHeight
  const targetAr = dw / dh
  let sx = 0
  let sy = 0
  let sw = img.naturalWidth
  let sh = img.naturalHeight
  if (sourceAr > targetAr) {
    sw = sh * targetAr
    sx = (img.naturalWidth - sw) / 2
  } else if (sourceAr < targetAr) {
    sh = sw / targetAr
    sy = (img.naturalHeight - sh) / 2
  }
  ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh)
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
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

// Canvas fillText doesn't honour letter-spacing. We draw each
// character one at a time, advancing by glyph width + tracking, so
// the small all-caps labels (eyebrow chip, brand mark, audience
// hint) carry the same tracked-out look the SVG version uses.
function drawTrackedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  tracking: number,
): void {
  if (ctx.textAlign === "right") {
    const total = measureTracked(ctx, text, tracking)
    let cursor = x - total
    ctx.textAlign = "left"
    for (let i = 0; i < text.length; i++) {
      ctx.fillText(text[i], cursor, y)
      cursor += ctx.measureText(text[i]).width + tracking
    }
    ctx.textAlign = "right"
    return
  }
  let cursor = x
  for (let i = 0; i < text.length; i++) {
    ctx.fillText(text[i], cursor, y)
    cursor += ctx.measureText(text[i]).width + tracking
  }
}

function measureTracked(
  ctx: CanvasRenderingContext2D,
  text: string,
  tracking: number,
): number {
  let total = 0
  for (let i = 0; i < text.length; i++) {
    total += ctx.measureText(text[i]).width + tracking
  }
  return total - tracking
}

// Same word-wrap algorithm as the inline SVG preview.
function wrapTitle(input: string, maxCharsPerLine: number, maxLines: number): string[] {
  const words = input.split(/\s+/).filter(Boolean)
  if (words.length === 0) return [input]
  const lines: string[] = []
  let current = ""
  for (let idx = 0; idx < words.length; idx++) {
    const w = words[idx]
    const candidate = current ? `${current} ${w}` : w
    if (candidate.length <= maxCharsPerLine || current === "") {
      current = candidate
    } else {
      lines.push(current)
      current = w
      if (lines.length >= maxLines - 1) {
        const remaining = words.slice(idx).join(" ")
        const truncated =
          remaining.length > maxCharsPerLine
            ? remaining.slice(0, maxCharsPerLine - 1).trimEnd() + "…"
            : remaining
        lines.push(truncated)
        return lines
      }
    }
  }
  if (current) lines.push(current)
  return lines
}
