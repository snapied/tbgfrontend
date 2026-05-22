"use client"

// Browser-local rolling-window rate limiter shared by the
// pre-sale enquiry dialog and the in-course "ask the teacher"
// dialog. Stores ISO timestamps of recent submissions keyed by
// `<bucket>:<scope>` (typically "<dialog-name>:<courseId>") so the
// same browser can submit to different courses independently.
//
// The limiter is best-effort — a determined user can always clear
// localStorage. It's a UX guardrail to stop accidental flooding
// (and bots that don't bother with cookies), not a security
// boundary. Server-side enforcement should layer on top once we
// have a real backend behind these forms.

const STORAGE_KEY = "thebigclass.enquiry.rate.v1"

export interface RateState {
  recent: string[]
  left: number
  unlocksAt: number | null
}

type Bucket = Record<string, string[]>

function readBucket(): Bucket {
  if (typeof window === "undefined") return {}
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Bucket
    return parsed && typeof parsed === "object" ? parsed : {}
  } catch {
    return {}
  }
}

function writeBucket(b: Bucket) {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(b))
  } catch {
    /* quota — silently ignore; user will hit any server guard if any */
  }
}

/**
 * Read the rolling window for the given key without writing.
 * `maxPerWindow` = how many submissions are allowed inside `windowMs`.
 * `now` is injected for tests; defaults to Date.now().
 */
export function readRate(
  key: string,
  maxPerWindow: number,
  windowMs: number,
  now: number = Date.now(),
): RateState {
  const bucket = readBucket()
  const cutoff = now - windowMs
  const recent = (bucket[key] ?? []).filter(
    (t) => new Date(t).getTime() >= cutoff,
  )
  const left = Math.max(0, maxPerWindow - recent.length)
  const unlocksAt =
    recent.length >= maxPerWindow && recent.length > 0
      ? new Date(recent[0]).getTime() + windowMs
      : null
  return { recent, left, unlocksAt }
}

/**
 * Push a new timestamp into the window for the given key, pruning
 * expired entries first. Returns the post-write state so callers
 * can update their UI in a single trip.
 */
export function pushRate(
  key: string,
  maxPerWindow: number,
  windowMs: number,
  now: number = Date.now(),
): RateState {
  const bucket = readBucket()
  const cutoff = now - windowMs
  const existing = (bucket[key] ?? []).filter(
    (t) => new Date(t).getTime() >= cutoff,
  )
  bucket[key] = [...existing, new Date(now).toISOString()]
  writeBucket(bucket)
  return readRate(key, maxPerWindow, windowMs, now)
}

/**
 * Human-readable countdown string. Picks the largest unit that
 * reads naturally — "in 4 h" or "in 7 min" rather than awkward
 * fractional hours. Returns "shortly" when the unlock is imminent.
 */
export function formatUnlock(unlocksAt: number, now: number = Date.now()): string {
  const ms = Math.max(0, unlocksAt - now)
  if (ms < 60_000) return "shortly"
  const totalMinutes = Math.ceil(ms / 60_000)
  if (totalMinutes < 60) return `${totalMinutes} min`
  const hours = Math.ceil(totalMinutes / 60)
  return `${hours} h`
}

// Default tunings for the doubt + enquiry dialogs.
export const ENQUIRY_MAX_PER_DAY = 3
export const ENQUIRY_WINDOW_MS = 24 * 60 * 60 * 1000
