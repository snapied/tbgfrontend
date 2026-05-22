"use client"

// Course-thumbnail render with a guaranteed-renders fallback.
//
// Three tiers of resilience, all client-side:
//
//   1. course.thumbnail (whatever the store has — baked JPEG data
//      URL, bare Picsum URL, uploaded URL).
//   2. If thumbnail is empty: a deterministic Picsum URL
//      regenerated from the course's title + category, so the same
//      course always gets the same photograph.
//   3. If THAT image also fails to load (Picsum down, rate-limited,
//      CORS issue, network offline, whatever) — onError swaps in a
//      self-contained graphic-cover SVG data URL with the course's
//      title and category baked in. No external request, ~2 KB,
//      ALWAYS renders.
//
// The card NEVER shows a broken-image icon or a blank placeholder.

import { useEffect, useState } from "react"
import type { Course } from "@/lib/lms-store"
import {
  buildGraphicCoverDataUrl,
  resolveCoverUrl,
} from "@/lib/cover-fallback"

interface Props {
  course: Pick<Course, "title" | "category" | "thumbnail">
  alt?: string
  className?: string
}

export function CourseCoverImage({ course, alt, className }: Props) {
  const primary = resolveCoverUrl(course)
  const [src, setSrc] = useState(primary)
  const [errored, setErrored] = useState(false)

  // Reset state when the course (or its primary URL) changes — the
  // parent can swap courses without remounting this component.
  useEffect(() => {
    setSrc(primary)
    setErrored(false)
  }, [primary])

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt ?? course.title}
      className={className}
      loading="lazy"
      onError={() => {
        if (errored) return // already showing the SVG fallback
        setErrored(true)
        setSrc(buildGraphicCoverDataUrl(course))
      }}
    />
  )
}
