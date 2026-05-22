// Deterministic fallback cover URL for a course.
//
// Used when course.thumbnail is empty or got stripped by the
// persist cascade. Same hash + Picsum seed pattern the original
// pickCoverImageUrl uses on the homepage generator, so a course's
// cover stays visually consistent across saves, refreshes, and
// quota-driven thumbnail strips.

function hash(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32)
}

export function regenerateCoverUrl(course: {
  title: string
  category?: string
}): string {
  const cat = (course.category || "general").toLowerCase().replace(/[^a-z0-9]+/g, "-")
  const slug = slugify(course.title)
  const seed = `${cat}-${slug}-${hash(course.title) % 99999}`
  return `https://picsum.photos/seed/${encodeURIComponent(seed)}/800/500`
}

// Resolve the URL we should actually render. Prefers the saved
// thumbnail, falls through to a regenerated URL when it's empty or
// missing. Uploaded thumbnails (anything that doesn't look like
// our auto-generated URL OR a data URL) pass through verbatim.
export function resolveCoverUrl(course: {
  title: string
  category?: string
  thumbnail?: string
}): string {
  const t = course.thumbnail?.trim() ?? ""
  if (t.length > 0) return t
  return regenerateCoverUrl(course)
}

// ---------------------------------------------------------------
// Inline graphic-cover renderer
// ---------------------------------------------------------------
// Produces a self-contained SVG data URL — gradient + topic motif +
// title text — that's GUARANTEED to render. No external image
// requests, no CORS, no rate limits, no quota concerns (~2-3 KB).
// Used as the onError fallback in CourseCoverImage so a card never
// shows a broken-image icon, no matter what.

const HUE_BY_CATEGORY: Record<string, number> = {
  // Map both the user-friendly category labels and the internal
  // category slugs to a deterministic hue. Anything unknown falls
  // through to a deterministic per-title hash.
  Education: 210,
  "Health & Fitness": 265,
  Technology: 150,
  Business: 285,
  Language: 340,
  Arts: 20,
  General: 230,
  math: 210,
  yoga: 265,
  coding: 150,
  finance: 45,
  language: 340,
  "exam-prep": 195,
  creative: 20,
  wellness: 170,
  business: 285,
  general: 230,
}

function colorForCourse(course: { title: string; category?: string }): number {
  if (course.category && HUE_BY_CATEGORY[course.category] != null) {
    return HUE_BY_CATEGORY[course.category]
  }
  return hash(course.title) % 360
}

function xmlEscape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}

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

/**
 * Build a graphic-cover SVG data URL for a course. Always renders.
 * No external dependencies. Roughly 1.5-3 KB.
 */
export function buildGraphicCoverDataUrl(course: {
  title: string
  category?: string
}): string {
  const hue = colorForCourse(course)
  const category = course.category ?? ""
  const titleLines = wrapTitle(course.title, 18, 3)
  const titleFontSize = titleLines.length === 1 ? 56 : titleLines.length === 2 ? 50 : 44
  const titleLineHeight = Math.round(titleFontSize * 1.05)
  const lastLineY = 394
  const titleAnchorY = lastLineY - (titleLines.length - 1) * titleLineHeight
  const safeTitle = xmlEscape(course.title)
  const safeCat = xmlEscape(category.toUpperCase())
  const titleTspans = titleLines
    .map(
      (line, i) =>
        `<tspan x="40" y="${titleAnchorY + i * titleLineHeight}">${xmlEscape(line)}</tspan>`,
    )
    .join("")
  const chipWidth = category.length > 0 ? Math.max(60, 20 + safeCat.length * 7.2) : 0

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500" role="img" aria-label="${safeTitle}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%"  stop-color="hsl(${hue},78%,58%)"/>
      <stop offset="55%" stop-color="hsl(${(hue + 20) % 360},70%,42%)"/>
      <stop offset="100%" stop-color="hsl(${(hue + 50) % 360},64%,24%)"/>
    </linearGradient>
    <radialGradient id="l" cx="0.18" cy="0.12" r="0.55">
      <stop offset="0%"  stop-color="rgba(255,255,255,0.55)"/>
      <stop offset="100%" stop-color="rgba(255,255,255,0)"/>
    </radialGradient>
    <radialGradient id="t" cx="0.95" cy="0.95" r="0.7">
      <stop offset="0%"  stop-color="hsl(${(hue + 80) % 360},90%,70%)" stop-opacity="0.5"/>
      <stop offset="100%" stop-color="rgba(0,0,0,0)"/>
    </radialGradient>
  </defs>
  <rect width="800" height="500" fill="url(#g)"/>
  <rect width="800" height="500" fill="url(#l)"/>
  <rect width="800" height="500" fill="url(#t)"/>
  ${category ? `<g><rect x="32" y="32" rx="13" ry="13" width="${chipWidth}" height="24" fill="rgba(255,255,255,0.22)"/><text x="42" y="49" font-family="Inter,system-ui,sans-serif" font-size="11" font-weight="700" letter-spacing="2" fill="white">${safeCat}</text></g>` : ""}
  <text x="768" y="49" text-anchor="end" font-family="Inter,system-ui,sans-serif" font-size="11" font-weight="500" letter-spacing="1.5" fill="white" opacity="0.85">THEBIGCLASS</text>
  <text font-family="Georgia,'Times New Roman',serif" font-size="${titleFontSize}" font-weight="700" fill="#ffffff">${titleTspans}</text>
</svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg.replace(/\s+/g, " ").trim())}`
}

