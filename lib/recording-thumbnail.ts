"use client"

// Client-side recording thumbnail extraction.
//
// Server-side ffmpeg is the long-term right answer (egress hook
// generates a JPEG sidecar at upload time, served from your CDN).
// In the meantime, this lib does the next-best thing: a viewer's
// browser silently spins up an off-screen <video>, seeks to the
// midpoint, captures one frame to a canvas, and caches the data
// URL in localStorage so the same recording renders instantly on
// every subsequent list paint.
//
// Limitations:
//   • Cross-origin recordings without CORS need `crossOrigin="anonymous"`
//     plus a CORS header from the CDN. R2 with the right config
//     works; arbitrary embeds (YouTube etc.) won't.
//   • Cap each thumbnail at ~50KB so localStorage doesn't explode.
//   • Cache lives forever per (tenant, recording) — recordings are
//     immutable, so this is safe.
//
// API:
//   getCachedThumbnail(recordingId)
//   extractThumbnailFromUrl(recordingId, url) → Promise<string | null>

import { readCurrentTenantSlug } from "@/lib/tenant-store"

const SCHEMA = "recording.thumb.v1"
const CACHE_MAX_BYTES = 50_000

function key(recordingId: string): string | null {
  if (typeof window === "undefined") return null
  const slug = readCurrentTenantSlug()
  if (!slug) return null
  return `thebigclass.t.${slug}.${SCHEMA}.${recordingId}`
}

export function getCachedThumbnail(recordingId: string): string | null {
  const k = key(recordingId)
  if (!k) return null
  try {
    return window.localStorage.getItem(k)
  } catch {
    return null
  }
}

function cacheThumbnail(recordingId: string, dataUrl: string): void {
  const k = key(recordingId)
  if (!k) return
  if (dataUrl.length > CACHE_MAX_BYTES) return
  try {
    window.localStorage.setItem(k, dataUrl)
    window.dispatchEvent(new StorageEvent("storage", { key: k }))
  } catch { /* quota — drop silently */ }
}

/** Extracts a single thumbnail frame from the given recording URL.
 *  Returns a data:image/jpeg URL or null on failure. */
export async function extractThumbnailFromUrl(
  recordingId: string,
  url: string,
  opts: { atFraction?: number; maxWidth?: number } = {},
): Promise<string | null> {
  // Hit cache first.
  const cached = getCachedThumbnail(recordingId)
  if (cached) return cached

  if (typeof document === "undefined") return null

  const atFraction = opts.atFraction ?? 0.4
  const maxWidth = opts.maxWidth ?? 320

  return new Promise<string | null>((resolve) => {
    const video = document.createElement("video")
    video.crossOrigin = "anonymous"
    video.preload = "metadata"
    video.muted = true
    video.playsInline = true
    video.style.position = "fixed"
    video.style.left = "-9999px"
    video.style.width = "1px"
    video.style.height = "1px"

    let resolved = false
    function cleanup() {
      try { video.removeAttribute("src"); video.load() } catch { /* ignore */ }
      try { document.body.removeChild(video) } catch { /* not attached */ }
    }
    function done(out: string | null) {
      if (resolved) return
      resolved = true
      cleanup()
      resolve(out)
    }

    video.addEventListener("loadedmetadata", () => {
      if (!Number.isFinite(video.duration) || video.duration <= 0) {
        done(null)
        return
      }
      try {
        video.currentTime = Math.max(0.1, video.duration * atFraction)
      } catch { done(null) }
    })

    video.addEventListener("seeked", () => {
      try {
        const w = Math.min(maxWidth, video.videoWidth || maxWidth)
        const aspect = (video.videoHeight || 1) / (video.videoWidth || 1)
        const h = Math.round(w * aspect)
        const canvas = document.createElement("canvas")
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext("2d")
        if (!ctx) return done(null)
        ctx.drawImage(video, 0, 0, w, h)
        const dataUrl = canvas.toDataURL("image/jpeg", 0.6)
        cacheThumbnail(recordingId, dataUrl)
        done(dataUrl)
      } catch {
        // Cross-origin taint → toDataURL throws. Cache nothing and
        // bail out; caller falls back to the gradient placeholder.
        done(null)
      }
    })

    video.addEventListener("error", () => done(null))
    // Safety timeout — some networks stall forever on a single
    // requested seek frame.
    window.setTimeout(() => done(null), 10_000)

    video.src = url
    document.body.appendChild(video)
  })
}

/** Deterministic gradient placeholder when extraction fails.
 *  Same recordingId always renders the same colours, so an absent
 *  thumbnail is still recognisable in the list. */
export function placeholderGradientFor(recordingId: string): { from: string; to: string } {
  let h = 0
  for (let i = 0; i < recordingId.length; i++) h = (h * 31 + recordingId.charCodeAt(i)) >>> 0
  const hue1 = h % 360
  const hue2 = (hue1 + 40) % 360
  return {
    from: `hsl(${hue1}deg 60% 60% / 0.4)`,
    to:   `hsl(${hue2}deg 60% 30% / 0.35)`,
  }
}
