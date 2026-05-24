// Deterministic gradient palette for placeholder covers, derived
// from a string seed (handle, slug, name — anything stable). Same
// input always returns the same gradient so a teacher's card stays
// visually consistent across page loads.
//
// Why duplicate this from lib/generate-cover.ts: cover-gen is for
// rendering a real image at 1200×630 (PNG export). This is for
// CSS `background: linear-gradient(...)` strings — cheaper, no
// canvas, used on every card render. Sharing a palette would be
// nice but introduces an import cycle (cover-gen pulls in canvas
// shims that we don't want in lightweight client surfaces).

const PALETTES: Array<[string, string]> = [
  ["#7c3aed", "#ec4899"],
  ["#0ea5e9", "#22d3ee"],
  ["#10b981", "#84cc16"],
  ["#f97316", "#f59e0b"],
  ["#ef4444", "#f97316"],
  ["#1e293b", "#7c3aed"],
  ["#06b6d4", "#3b82f6"],
  ["#db2777", "#7c3aed"],
  ["#0891b2", "#0f766e"],
  ["#a855f7", "#3b82f6"],
  ["#f43f5e", "#fb7185"],
  ["#0f172a", "#1e40af"],
]

function hash(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = (h * 16777619) >>> 0
  }
  return h
}

/** A CSS linear-gradient string seeded by `seed`. Drop straight
 *  into `style={{ background: gradientFor(seed) }}`. */
export function gradientFor(seed: string, angleDeg = 135): string {
  const [c1, c2] = PALETTES[hash(seed) % PALETTES.length]
  return `linear-gradient(${angleDeg}deg, ${c1}, ${c2})`
}
