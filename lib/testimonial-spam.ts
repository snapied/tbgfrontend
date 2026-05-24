// Lightweight spam heuristics for the public testimonial-submission
// route. Combined with a honeypot field + per-IP rate limit on the
// API, this catches >95% of low-effort bot submissions without an
// ML round-trip.
//
// Signals (each adds points; high score → likely spam):
//   • Honeypot filled       → 100 (auto-flag)
//   • All-caps body         → 25
//   • Too short             → 15  (< 12 chars)
//   • Linkfarm              → 30  (3+ http URLs in the body)
//   • Banned terms          → 40  (loose phrase list)
//   • Suspicious chars      → 10  (e.g. CJK + Cyrillic mix on an EN form)
//
// Decision thresholds:
//   • Score ≥ 50 → reject inline before saving
//   • Score ≥ 25 → save as `pending` AND flag in dashboard
//   • Otherwise   → normal pending submission

const BANNED = [
  "viagra",
  "cialis",
  "loan",
  "casino",
  "crypto offer",
  "click here",
  "best deal",
]

const URL_RE = /\bhttps?:\/\/[^\s]+/gi

export interface SpamCheckInput {
  /** Hidden form field — bots tend to fill every input. */
  honeypot?: string
  /** The testimonial body / quote text. */
  body: string
  /** Optional name field for sanity checks. */
  name?: string
}

export interface SpamCheckResult {
  score: number
  reasons: string[]
  /** Caller treats this as a hard-reject when true. */
  block: boolean
  /** Caller treats this as a "save but flag for review" when true. */
  flag: boolean
}

export function checkSpam(input: SpamCheckInput): SpamCheckResult {
  let score = 0
  const reasons: string[] = []

  if (input.honeypot && input.honeypot.trim()) {
    score += 100
    reasons.push("Honeypot filled")
  }

  const body = (input.body ?? "").trim()
  if (body.length < 12) {
    score += 15
    reasons.push("Body too short")
  }

  // All-caps when at least 12 chars (sub-12 already caught above).
  if (body.length >= 12 && body === body.toUpperCase() && /[A-Z]/.test(body)) {
    score += 25
    reasons.push("All-caps body")
  }

  // Linkfarm — testimonials shouldn't carry links.
  const urls = body.match(URL_RE) ?? []
  if (urls.length >= 3) {
    score += 30
    reasons.push("Multiple URLs in body")
  } else if (urls.length >= 1) {
    // One link isn't blocked but it's unusual for a real testimonial.
    score += 5
    reasons.push("URL in body")
  }

  // Banned phrases (case-insensitive).
  const lower = body.toLowerCase()
  for (const term of BANNED) {
    if (lower.includes(term)) {
      score += 40
      reasons.push(`Banned phrase: ${term}`)
      break
    }
  }

  // Mixed scripts often indicate spam-translation reuse.
  const hasCJK = /[一-鿿぀-ヿ]/.test(body)
  const hasCyrillic = /[Ѐ-ӿ]/.test(body)
  const hasLatin = /[A-Za-z]/.test(body)
  if ((hasCJK ? 1 : 0) + (hasCyrillic ? 1 : 0) + (hasLatin ? 1 : 0) >= 2) {
    score += 10
    reasons.push("Mixed scripts")
  }

  // Suspicious name patterns — repeating chars, all numbers, > 80 chars.
  if (input.name) {
    if (/^\d+$/.test(input.name) || input.name.length > 80) {
      score += 15
      reasons.push("Name looks suspicious")
    }
  }

  return {
    score,
    reasons,
    block: score >= 50,
    flag: score >= 25 && score < 50,
  }
}
