// Per-platform URL validators for profile social links.
//
// Each entry knows:
//   • how to recognise a URL as belonging to that platform
//   • the canonical example shown as a placeholder
//   • a `normalise` function that auto-fixes the common slips —
//     missing `https://`, bare handles like `@you` or `you`, and
//     stray whitespace — so the teacher's paste-and-tab habit
//     ships clean URLs without nag.
//
// API is intentionally tiny: pass the platform key + the raw value,
// receive `{ ok, normalised, error }`. The profile page renders
// `error` inline; on blur the input swaps in `normalised`.

export type SocialPlatform =
  | "portfolio"
  | "twitter"
  | "linkedin"
  | "youtube"
  | "instagram"
  | "github"

interface PlatformSpec {
  label: string
  example: string
  /** Returns true if the URL looks like THIS platform. Loose by design — we
   *  use it to detect cross-paste (e.g. LinkedIn URL in the Twitter slot)
   *  and surface a helpful hint, not to block. */
  detect: RegExp
  /** Auto-fix common slips. Run on blur or before validation. */
  normalise: (raw: string) => string
}

const ensureHttps = (raw: string): string => {
  const v = raw.trim()
  if (!v) return ""
  if (/^https?:\/\//i.test(v)) return v
  // Bare domain — prepend https. We don't auto-fix protocols other
  // than http(s); the rare ftp/mailto user can paste fully-qualified.
  return `https://${v.replace(/^\/+/, "")}`
}

const handleToUrl = (host: string, raw: string): string => {
  const v = raw.trim().replace(/^@+/, "")
  if (!v) return ""
  if (/^https?:\/\//i.test(v)) return v
  // Bare handle → canonical URL.
  if (!v.includes("/") && !v.includes(".")) return `https://${host}/${v}`
  return ensureHttps(v)
}

export const PLATFORMS: Record<SocialPlatform, PlatformSpec> = {
  portfolio: {
    label: "Website / portfolio",
    example: "https://your-website.com",
    // Anything that LOOKS like a URL after the scheme is acceptable
    // here — portfolios are intentionally varied.
    detect: /^https?:\/\/[^.]+\.[^/]/i,
    normalise: ensureHttps,
  },
  twitter: {
    label: "X (Twitter)",
    example: "https://x.com/yourhandle",
    detect: /^https?:\/\/(www\.)?(twitter|x)\.com\//i,
    normalise: (raw) => handleToUrl("x.com", raw),
  },
  linkedin: {
    label: "LinkedIn",
    example: "https://linkedin.com/in/you",
    detect: /^https?:\/\/(www\.)?linkedin\.com\/(in|company|pub)\//i,
    normalise: (raw) => {
      const v = raw.trim()
      if (!v) return ""
      // Bare handle "you" → linkedin.com/in/you. We default to /in/
      // because individual profiles outnumber companies on creator
      // pages.
      if (!v.includes("/") && !v.includes(".")) {
        return `https://linkedin.com/in/${v.replace(/^@+/, "")}`
      }
      return ensureHttps(v)
    },
  },
  youtube: {
    label: "YouTube",
    example: "https://youtube.com/@channel",
    detect: /^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\//i,
    normalise: (raw) => {
      const v = raw.trim().replace(/^@+/, "")
      if (!v) return ""
      // Bare channel handle → youtube.com/@handle.
      if (!v.includes("/") && !v.includes(".")) return `https://youtube.com/@${v}`
      return ensureHttps(v)
    },
  },
  instagram: {
    label: "Instagram",
    example: "https://instagram.com/handle",
    detect: /^https?:\/\/(www\.)?instagram\.com\//i,
    normalise: (raw) => handleToUrl("instagram.com", raw),
  },
  github: {
    label: "GitHub",
    example: "https://github.com/you",
    detect: /^https?:\/\/(www\.)?github\.com\//i,
    normalise: (raw) => handleToUrl("github.com", raw),
  },
}

export interface ValidationResult {
  ok: boolean
  /** Normalised value — what we'd save if the teacher hits Save. */
  normalised: string
  /** When set, render under the field. `null` for valid inputs. */
  error: string | null
  /** When the URL is structurally OK but looks like a DIFFERENT platform,
   *  surface a soft hint so the teacher knows they may have crossed wires.
   *  e.g. user pasted a LinkedIn URL into the Twitter field. */
  warning?: string
}

/** Validate a single field. Empty strings are always valid (optional
 *  field semantics). */
export function validateSocialUrl(
  platform: SocialPlatform,
  raw: string,
): ValidationResult {
  const spec = PLATFORMS[platform]
  const trimmed = raw.trim()
  if (!trimmed) return { ok: true, normalised: "", error: null }

  const normalised = spec.normalise(trimmed)

  // Final structural check — has to parse as a URL after normalisation.
  let parsed: URL | null = null
  try {
    parsed = new URL(normalised)
  } catch {
    /* fall-through */
  }
  if (!parsed) {
    return {
      ok: false,
      normalised,
      error: `That doesn't look like a URL. Example: ${spec.example}`,
    }
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return {
      ok: false,
      normalised,
      error: "URLs must start with http:// or https://",
    }
  }

  // Cross-platform paste hint — non-blocking.
  let warning: string | undefined
  for (const [otherKey, otherSpec] of Object.entries(PLATFORMS)) {
    if (otherKey === platform) continue
    if (otherSpec.detect.test(normalised)) {
      warning = `This looks like a ${otherSpec.label} URL — did you mean to paste it under ${otherSpec.label}?`
      break
    }
  }

  return { ok: true, normalised, error: null, warning }
}
