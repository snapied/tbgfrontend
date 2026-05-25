"use client"

// Drop-in thumbnail for a recording row.
// Calls extractThumbnailFromUrl() lazily (after the row mounts, with
// a small idle delay so we don't block initial paint). Renders the
// captured frame when ready; falls back to a deterministic gradient
// placeholder so the row never looks broken.

import { useEffect, useState } from "react"
import { Play } from "lucide-react"
import {
  extractThumbnailFromUrl,
  getCachedThumbnail,
  placeholderGradientFor,
} from "@/lib/recording-thumbnail"

interface Props {
  recordingId: string
  url: string
  /** Optional duration label rendered as a tiny corner badge. */
  durationLabel?: string
  /** Optional extra className for the wrapper. */
  className?: string
}

export function RecordingThumbnail({
  recordingId,
  url,
  durationLabel,
  className,
}: Props) {
  const [src, setSrc] = useState<string | null>(() => getCachedThumbnail(recordingId))
  const grad = placeholderGradientFor(recordingId)

  useEffect(() => {
    if (src) return
    if (!url) return
    let cancelled = false
    // Defer extraction so a list of 20 rows doesn't all spin up
    // hidden <video> tags at once. Use requestIdleCallback when
    // available, fall back to setTimeout otherwise.
    const schedule = (cb: () => void) => {
      const ric = (window as Window & { requestIdleCallback?: (cb: () => void) => number }).requestIdleCallback
      if (typeof ric === "function") ric(cb)
      else window.setTimeout(cb, 250)
    }
    schedule(() => {
      if (cancelled) return
      void extractThumbnailFromUrl(recordingId, url).then((dataUrl) => {
        if (!cancelled && dataUrl) setSrc(dataUrl)
      })
    })
    return () => {
      cancelled = true
    }
  }, [recordingId, url, src])

  return (
    <div
      className={`relative flex h-10 w-14 shrink-0 items-center justify-center overflow-hidden rounded ${
        className ?? ""
      }`}
      style={{
        background: `linear-gradient(135deg, ${grad.from}, ${grad.to})`,
      }}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          aria-hidden
          className="h-full w-full object-cover"
        />
      ) : (
        <Play
          className="h-3.5 w-3.5 text-foreground/60"
          aria-hidden
        />
      )}
      {/* Subtle play-hint overlay so the thumbnail still reads as
          "video, click to play" even when the captured frame
          happens to be a slide / dark scene. */}
      {src && (
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/30">
          <Play className="h-3.5 w-3.5 text-white opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
        </span>
      )}
      {durationLabel && (
        <span className="pointer-events-none absolute bottom-0 right-0 rounded-tl bg-black/70 px-1 py-0.5 font-mono text-[8px] font-bold text-white">
          {durationLabel}
        </span>
      )}
    </div>
  )
}
