"use client"

// Client-side image compressor. Used before we store images as data: URLs
// so a 5 MB phone-camera photo doesn't blow past localStorage's ~5 MB
// per-origin quota and silently drop someone's profile photo.
//
// Strategy: load the file into an <img>, draw it into an offscreen canvas
// scaled so the longer edge hits `maxDim`, export as JPEG (or WebP) at
// the requested quality. JPEG by default — it's the smallest format with
// universal browser support, and we don't need alpha for profile/cover.

export interface CompressOptions {
  // Longest-edge target in CSS pixels. The shorter edge keeps the aspect
  // ratio. Caller should set this based on render size, not source size:
  // a 400-px avatar doesn't need a 4000-px source.
  maxDim: number
  // JPEG/WebP quality 0–1. 0.82 is a sweet spot — barely distinguishable
  // from quality 1 to the eye, ~3× smaller file.
  quality?: number
  // Output mime. JPEG by default. Pass image/webp for a ~25% size win on
  // browsers that support it (all modern do).
  mime?: "image/jpeg" | "image/webp"
}

export interface CompressResult {
  url: string       // data: URL ready to put in <img src>
  bytes: number     // size of the encoded data
  width: number     // final width after scaling
  height: number    // final height after scaling
  mime: string
}

// Round-tripped through canvas → toDataURL. Falls back to the original
// data URL on any error (caller still sees an image; just larger).
export async function compressImage(
  file: File,
  opts: CompressOptions,
): Promise<CompressResult> {
  const { maxDim, quality = 0.82, mime = "image/jpeg" } = opts

  // SVG and GIF can't go through canvas safely (GIF would lose animation;
  // SVG is already tiny). Pass through untouched.
  if (file.type === "image/svg+xml" || file.type === "image/gif") {
    const url = await readFileAsDataUrl(file)
    return { url, bytes: file.size, width: 0, height: 0, mime: file.type }
  }

  const sourceUrl = await readFileAsDataUrl(file)
  const img = await loadImage(sourceUrl)

  // Compute the target dimensions, preserving the aspect ratio. If the
  // source is already smaller than maxDim, don't upscale.
  const longest = Math.max(img.naturalWidth, img.naturalHeight)
  const scale = longest > maxDim ? maxDim / longest : 1
  const targetW = Math.round(img.naturalWidth * scale)
  const targetH = Math.round(img.naturalHeight * scale)

  const canvas = document.createElement("canvas")
  canvas.width = targetW
  canvas.height = targetH
  const ctx = canvas.getContext("2d")
  if (!ctx) {
    // Canvas unavailable (very rare). Bail to the source.
    return { url: sourceUrl, bytes: file.size, width: img.naturalWidth, height: img.naturalHeight, mime: file.type }
  }
  // White background so JPEG-encoded transparency doesn't go black.
  if (mime === "image/jpeg") {
    ctx.fillStyle = "#ffffff"
    ctx.fillRect(0, 0, targetW, targetH)
  }
  ctx.drawImage(img, 0, 0, targetW, targetH)

  const url = canvas.toDataURL(mime, quality)
  return {
    url,
    bytes: estimateDataUrlBytes(url),
    width: targetW,
    height: targetH,
    mime,
  }
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result as string)
    r.onerror = () => reject(r.error ?? new Error("FileReader failed"))
    r.readAsDataURL(file)
  })
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error("Image load failed"))
    img.src = src
  })
}

// data: URL byte size = base64 length × 3/4 (minus header). Cheap enough
// to do exactly via the comma split.
function estimateDataUrlBytes(url: string): number {
  const i = url.indexOf(",")
  if (i === -1) return url.length
  const b64 = url.slice(i + 1)
  return Math.floor((b64.length * 3) / 4)
}

// ---------------------------------------------------------------
// Convenience presets for common upload spots.
// ---------------------------------------------------------------

export const COMPRESS_PRESETS = {
  // Avatar — square, used at 64–96 px on most surfaces. 400 px gives
  // crisp 2× retina renders. Target ~50–120 KB.
  avatar: { maxDim: 400, quality: 0.85, mime: "image/jpeg" } as const,
  // Cover banner — 16:9 hero strip on profile/course pages. 1600 px wide
  // is enough for any retina display under 800 px height.
  cover: { maxDim: 1600, quality: 0.82, mime: "image/jpeg" } as const,
  // Course thumbnail — grid cards top out around 600 px wide.
  thumbnail: { maxDim: 1200, quality: 0.82, mime: "image/jpeg" } as const,
  // Inline content (rich-text body image, blog cover). A little more
  // headroom since these can be hero images on a blog post.
  content: { maxDim: 1600, quality: 0.82, mime: "image/jpeg" } as const,
}
