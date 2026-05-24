// WCAG 2.1 contrast helpers — used by the brand colour picker to
// surface "your CTA can't be read on white" warnings inline.
//
// Reference: https://www.w3.org/TR/WCAG21/#contrast-minimum
//   AA  · normal text: 4.5:1   · large text (18pt+ / 14pt+ bold): 3:1
//   AAA · normal text: 7:1     · large text: 4.5:1
// Non-text UI (button background vs page background): 3:1 minimum
// per WCAG 1.4.11.

export type ContrastLevel = "fail" | "AA-large" | "AA" | "AAA"

/** Parse any of: "#abc", "#aabbcc", "rgb(...)", "rgba(...)". Returns
 *  null on malformed input — caller is expected to fall back. */
function parseToRgb(input: string): [number, number, number] | null {
  if (!input) return null
  const s = input.trim().toLowerCase()
  // #abc → #aabbcc
  if (/^#[0-9a-f]{3}$/.test(s)) {
    const r = parseInt(s[1] + s[1], 16)
    const g = parseInt(s[2] + s[2], 16)
    const b = parseInt(s[3] + s[3], 16)
    return [r, g, b]
  }
  if (/^#[0-9a-f]{6}$/.test(s)) {
    return [
      parseInt(s.slice(1, 3), 16),
      parseInt(s.slice(3, 5), 16),
      parseInt(s.slice(5, 7), 16),
    ]
  }
  const rgb = s.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i)
  if (rgb) return [+rgb[1], +rgb[2], +rgb[3]]
  return null
}

// Relative luminance per WCAG.
function relativeLuminance([r, g, b]: [number, number, number]): number {
  const transform = (c: number) => {
    const sc = c / 255
    return sc <= 0.03928 ? sc / 12.92 : Math.pow((sc + 0.055) / 1.055, 2.4)
  }
  return 0.2126 * transform(r) + 0.7152 * transform(g) + 0.0722 * transform(b)
}

/** Contrast ratio between two colours. Returns 1 (worst, identical)
 *  to 21 (best, black-on-white). NaN if either input fails to parse. */
export function contrastRatio(fg: string, bg: string): number {
  const a = parseToRgb(fg)
  const b = parseToRgb(bg)
  if (!a || !b) return NaN
  const la = relativeLuminance(a)
  const lb = relativeLuminance(b)
  const lighter = Math.max(la, lb)
  const darker = Math.min(la, lb)
  return (lighter + 0.05) / (darker + 0.05)
}

/** Round to 1 decimal place for display. */
export function formatRatio(r: number): string {
  if (!Number.isFinite(r)) return "—"
  return `${r.toFixed(2)}:1`
}

/** Map a numeric ratio to a WCAG compliance bucket. */
export function contrastLevel(ratio: number): ContrastLevel {
  if (!Number.isFinite(ratio)) return "fail"
  if (ratio >= 7) return "AAA"
  if (ratio >= 4.5) return "AA"
  if (ratio >= 3) return "AA-large"
  return "fail"
}

/** Lighten or darken a hex colour toward the target luminance until
 *  it clears the requested ratio. Used to suggest a "safer" shade
 *  when the user-picked colour fails contrast.
 *
 *  Strategy: walk in 5% HSL-lightness steps toward whichever side
 *  (dark or light) starts gaining contrast first. Caps at 20 steps
 *  to avoid pathological loops. Returns the original hex if no
 *  safer shade can be found within ±100% lightness. */
export function suggestSaferShade(
  fg: string,
  bg: string,
  targetRatio = 4.5,
): string | null {
  const fgRgb = parseToRgb(fg)
  if (!fgRgb) return null
  const startRatio = contrastRatio(fg, bg)
  if (startRatio >= targetRatio) return fg

  // Convert to HSL so we can adjust lightness predictably.
  const [r, g, b] = fgRgb.map((c) => c / 255)
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  let s = 0
  const l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0)
        break
      case g:
        h = (b - r) / d + 2
        break
      case b:
        h = (r - g) / d + 4
        break
    }
    h /= 6
  }

  // Try both directions; pick whichever crosses the target first.
  for (let step = 1; step <= 20; step++) {
    for (const dir of [-1, 1]) {
      const newL = Math.min(1, Math.max(0, l + dir * step * 0.05))
      const candidate = hslToHex(h, s, newL)
      if (contrastRatio(candidate, bg) >= targetRatio) {
        return candidate
      }
    }
  }
  return null
}

function hslToHex(h: number, s: number, l: number): string {
  let r: number, g: number, b: number
  if (s === 0) {
    r = g = b = l
  } else {
    const hue2rgb = (p: number, q: number, t: number): number => {
      let tt = t
      if (tt < 0) tt += 1
      if (tt > 1) tt -= 1
      if (tt < 1 / 6) return p + (q - p) * 6 * tt
      if (tt < 1 / 2) return q
      if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6
      return p
    }
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q
    r = hue2rgb(p, q, h + 1 / 3)
    g = hue2rgb(p, q, h)
    b = hue2rgb(p, q, h - 1 / 3)
  }
  const toHex = (c: number) =>
    Math.round(c * 255)
      .toString(16)
      .padStart(2, "0")
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}
