// Phone number helpers.
//
// We stop short of pulling in libphonenumber-js — overkill for a sign-up
// form. These helpers:
//   - Hold a short list of common dialing codes (defaults India because
//     that's where most early users land).
//   - Parse a freeform string into { code, national } if it already starts
//     with a + so the form pre-fills correctly when a user pastes "+91 98…"
//   - Normalize to E.164 (e.g. "+919876543210") on submit.
//   - Validate that the national-number part has 7-15 digits.
//
// Anything below 7 digits is almost certainly an error; anything above 15
// busts the E.164 spec ceiling. Real validation per-country happens server-
// side when you actually send a WhatsApp template — but at signup time we
// only need "shape is sane".

export interface DialCode {
  code: string         // "+91"
  iso: string          // "IN"
  name: string         // "India"
  // Loose national-number length range; just an aid for the warning text.
  minNational: number
  maxNational: number
}

export const DIAL_CODES: DialCode[] = [
  { code: "+91",  iso: "IN", name: "India",         minNational: 10, maxNational: 10 },
  { code: "+1",   iso: "US", name: "US / Canada",   minNational: 10, maxNational: 10 },
  { code: "+44",  iso: "GB", name: "United Kingdom",minNational: 10, maxNational: 10 },
  { code: "+971", iso: "AE", name: "UAE",           minNational: 9,  maxNational: 9  },
  { code: "+65",  iso: "SG", name: "Singapore",     minNational: 8,  maxNational: 8  },
  { code: "+61",  iso: "AU", name: "Australia",     minNational: 9,  maxNational: 9  },
  { code: "+49",  iso: "DE", name: "Germany",       minNational: 10, maxNational: 11 },
  { code: "+33",  iso: "FR", name: "France",        minNational: 9,  maxNational: 9  },
  { code: "+34",  iso: "ES", name: "Spain",         minNational: 9,  maxNational: 9  },
  { code: "+39",  iso: "IT", name: "Italy",         minNational: 9,  maxNational: 10 },
  { code: "+55",  iso: "BR", name: "Brazil",        minNational: 10, maxNational: 11 },
  { code: "+52",  iso: "MX", name: "Mexico",        minNational: 10, maxNational: 10 },
  { code: "+234", iso: "NG", name: "Nigeria",       minNational: 10, maxNational: 11 },
  { code: "+27",  iso: "ZA", name: "South Africa",  minNational: 9,  maxNational: 9  },
  { code: "+63",  iso: "PH", name: "Philippines",   minNational: 10, maxNational: 10 },
  { code: "+62",  iso: "ID", name: "Indonesia",     minNational: 9,  maxNational: 12 },
  { code: "+81",  iso: "JP", name: "Japan",         minNational: 9,  maxNational: 11 },
  { code: "+86",  iso: "CN", name: "China",         minNational: 11, maxNational: 11 },
  { code: "+92",  iso: "PK", name: "Pakistan",      minNational: 10, maxNational: 10 },
  { code: "+880", iso: "BD", name: "Bangladesh",    minNational: 10, maxNational: 10 },
  { code: "+966", iso: "SA", name: "Saudi Arabia",  minNational: 9,  maxNational: 9  },
  { code: "+20",  iso: "EG", name: "Egypt",         minNational: 10, maxNational: 10 },
  { code: "+254", iso: "KE", name: "Kenya",         minNational: 9,  maxNational: 9  },
]

export const DEFAULT_DIAL = DIAL_CODES[0] // India

/** Just the digit characters. Useful for input filtering + validation. */
export function digitsOnly(s: string): string {
  return s.replace(/\D+/g, "")
}

/**
 * Try to split a freeform phone into { code, national } when the string
 * already starts with "+". Falls back to { national } when there's no code.
 */
export function parsePhone(input: string): { code?: DialCode; national: string } {
  const s = input.trim()
  if (!s) return { national: "" }
  if (s.startsWith("+")) {
    // Longest-prefix match against our list (so +91 doesn't get matched as +9).
    const sorted = [...DIAL_CODES].sort((a, b) => b.code.length - a.code.length)
    for (const c of sorted) {
      if (s.startsWith(c.code)) {
        return { code: c, national: digitsOnly(s.slice(c.code.length)) }
      }
    }
  }
  return { national: digitsOnly(s) }
}

/** "+91 98765 43210"-ish display formatting from raw national digits. */
export function formatNational(digits: string): string {
  const d = digitsOnly(digits)
  if (d.length <= 5) return d
  // Group from the right in 4-then-rest, India-ish — fine for everyone.
  return `${d.slice(0, d.length - 5)} ${d.slice(d.length - 5)}`
}

/** Returns the E.164 string for storage, e.g. "+919876543210". */
export function toE164(code: string, nationalDigits: string): string {
  return `${code}${digitsOnly(nationalDigits)}`
}

export type PhoneValidation =
  | { ok: true; e164: string }
  | { ok: false; reason: string }

/**
 * Lightly validate the national-number length against the chosen code's
 * loose range. We don't check carrier-prefixes — Zepto / WhatsApp will
 * reject bad numbers downstream with much better errors than we could.
 */
export function validatePhone(code: DialCode, nationalRaw: string): PhoneValidation {
  const national = digitsOnly(nationalRaw)
  if (!national) return { ok: false, reason: "WhatsApp number is required." }
  if (national.length < code.minNational || national.length > code.maxNational) {
    if (code.minNational === code.maxNational) {
      return { ok: false, reason: `Should be ${code.minNational} digits for ${code.name}.` }
    }
    return { ok: false, reason: `Should be ${code.minNational}–${code.maxNational} digits for ${code.name}.` }
  }
  if (national.length < 7 || national.length > 15) {
    return { ok: false, reason: "Phone numbers are 7–15 digits." }
  }
  return { ok: true, e164: toE164(code.code, national) }
}
