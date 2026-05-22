// Lightweight fuzzy-search helpers — typo-tolerant matching without
// pulling in a 30 KB library like fuse.js. Two functions:
//
//   • fuzzyMatch(needle, haystack) — boolean
//       True if every character of `needle` appears in `haystack` in
//       order (case-insensitive). Cheap, predictable, handles typos
//       like "javscrpt" → "JavaScript" because the subsequence still
//       lines up. Good enough for live filters over a list of <1000
//       items, which is every search surface in the app today.
//
//   • fuzzyScore(needle, haystack) — number (lower = better)
//       Returns a relevance score for sorting. Penalises gaps between
//       matched characters and weights an exact substring hit at the
//       start of the haystack heavily. Returns Infinity for no match.
//
// Both treat empty needles as "match everything" so a blank search
// input doesn't accidentally filter the entire list to nothing.

export function fuzzyMatch(needle: string, haystack: string): boolean {
  if (!needle) return true
  const n = needle.toLowerCase().trim()
  const h = haystack.toLowerCase()
  let i = 0
  for (let j = 0; j < h.length && i < n.length; j++) {
    if (h.charCodeAt(j) === n.charCodeAt(i)) i++
  }
  return i === n.length
}

export function fuzzyScore(needle: string, haystack: string): number {
  if (!needle) return 0
  const n = needle.toLowerCase().trim()
  const h = haystack.toLowerCase()
  // Exact-substring shortcut — strongest signal.
  const exactAt = h.indexOf(n)
  if (exactAt !== -1) return exactAt * 0.1 // earlier = better
  // Subsequence score with gap penalty.
  let score = 0
  let i = 0
  let lastIdx = -1
  for (let j = 0; j < h.length && i < n.length; j++) {
    if (h.charCodeAt(j) === n.charCodeAt(i)) {
      // Gap since last match contributes to the score (lower = tighter).
      if (lastIdx !== -1) score += j - lastIdx
      lastIdx = j
      i++
    }
  }
  if (i < n.length) return Infinity
  return score + 100 // baseline penalty so substring matches always win
}

// Sort + filter an array by fuzzy score against a single needle across
// one or more keys. Items that don't match on any key are dropped.
// Stable: ties preserve the original order.
export function fuzzySearch<T>(
  items: T[],
  needle: string,
  pick: (item: T) => string | string[],
): T[] {
  if (!needle.trim()) return items
  return items
    .map((item, idx) => {
      const fields = pick(item)
      const arr = Array.isArray(fields) ? fields : [fields]
      const best = Math.min(...arr.map((f) => fuzzyScore(needle, f)))
      return { item, score: best, idx }
    })
    .filter(({ score }) => Number.isFinite(score))
    .sort((a, b) => (a.score === b.score ? a.idx - b.idx : a.score - b.score))
    .map(({ item }) => item)
}
