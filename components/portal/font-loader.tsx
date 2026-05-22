"use client"

// Inject Google Fonts <link> tags for the given family names. Used by
// the dashboard previews so font picks show their *actual* typography
// even before the user navigates to the public portal.
//
// We dedupe by href so swapping fonts on the picker doesn't pile up
// rel=stylesheet nodes in the document head.

import { useEffect } from "react"

interface Props {
  families: (string | undefined)[]
  weights?: number[]
}

const INJECTED = new Set<string>()

export function GoogleFontLoader({ families, weights = [400, 600, 700] }: Props) {
  useEffect(() => {
    const clean = families.filter((f): f is string => !!f && !!f.trim())
    for (const family of clean) {
      const href = buildHref(family, weights)
      if (INJECTED.has(href)) continue
      const link = document.createElement("link")
      link.rel = "stylesheet"
      link.href = href
      link.setAttribute("data-google-font", family)
      document.head.appendChild(link)
      INJECTED.add(href)
    }
    // Don't remove on cleanup — fonts are cumulative across the
    // session and removing them would cause flashes when the picker
    // bounces between values.
  }, [families.join("|"), weights.join("|")]) // eslint-disable-line react-hooks/exhaustive-deps
  return null
}

function buildHref(family: string, weights: number[]): string {
  const f = family.trim().replace(/\s+/g, "+")
  const w = weights.join(";")
  return `https://fonts.googleapis.com/css2?family=${f}:wght@${w}&display=swap`
}
