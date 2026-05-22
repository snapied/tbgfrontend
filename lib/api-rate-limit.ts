// In-memory rate limiter for public API endpoints.
//
// Token-bucket with a fixed window. Sized for the POC: a single
// Node process keeps the buckets in module-level Map. When this
// runs on Vercel edge / multi-region production, swap to a
// Redis-backed implementation (Upstash sliding-window is the
// usual pick). The bucket key + check shape is intentionally what
// you'd send to such a service, so the swap is mechanical.
//
// Strategy: each (key-id, window) pair has its own counter. On
// every request:
//   1. Hash the bearer secret + look up the API key it belongs to.
//   2. Compute the current minute / day buckets.
//   3. Atomically check + increment both.
//   4. Reject 429 when either bucket is full; otherwise pass.
//
// Limits are flat per-key for the POC (60/min, 1k/day). Real
// production differentiates by plan tier — that's a one-line
// change once plan data flows through.

export interface RateLimitTier {
  perMinute: number
  perDay: number
}

export const DEFAULT_TIER: RateLimitTier = {
  perMinute: 60,
  perDay: 1_000,
}

interface Bucket {
  // Window start (ms since epoch, aligned to the unit).
  windowStart: number
  // Count in this window.
  count: number
}

interface Counters {
  minute: Bucket
  day: Bucket
}

// Module-level store. Survives across requests within the same
// Node process / lambda instance. Cold starts wipe it — fine for
// the POC; real prod uses Redis with TTL so the cap holds across
// every replica.
const counters = new Map<string, Counters>()

// Periodically prune stale buckets so the Map doesn't grow
// unbounded as keys come and go. We only do this when the Map
// crosses a soft threshold so the cost is amortized.
const PRUNE_THRESHOLD = 1_000
function maybePrune(now: number) {
  if (counters.size < PRUNE_THRESHOLD) return
  for (const [k, v] of counters) {
    if (now - v.day.windowStart > 24 * 60 * 60 * 1000) counters.delete(k)
  }
}

function bucketFor(now: number, unitMs: number, existing?: Bucket): Bucket {
  const aligned = Math.floor(now / unitMs) * unitMs
  if (!existing || existing.windowStart !== aligned) {
    return { windowStart: aligned, count: 0 }
  }
  return existing
}

export interface RateCheckOk {
  ok: true
  remaining: { minute: number; day: number }
  resetAt: { minute: number; day: number }   // unix ms when each bucket resets
}
export interface RateCheckFail {
  ok: false
  reason: "minute" | "day"
  retryAfterSeconds: number
  remaining: { minute: number; day: number }
  resetAt: { minute: number; day: number }
}
export type RateCheck = RateCheckOk | RateCheckFail

/**
 * Atomically check + increment the buckets for this key. Call
 * exactly once per inbound request; the return value tells you
 * whether to pass the request through or 429 it. The headers
 * helper below builds the standard `X-RateLimit-*` set from the
 * same result.
 */
export function checkAndIncrement(
  keyId: string,
  tier: RateLimitTier = DEFAULT_TIER,
  now: number = Date.now(),
): RateCheck {
  maybePrune(now)
  const existing = counters.get(keyId)
  const minute = bucketFor(now, 60_000, existing?.minute)
  const day = bucketFor(now, 24 * 60 * 60 * 1000, existing?.day)

  // Pre-flight check first so a failed request doesn't consume
  // budget. Otherwise a flood of denied requests could starve the
  // bucket from legitimate retries.
  if (minute.count >= tier.perMinute) {
    counters.set(keyId, { minute, day })
    const minuteReset = minute.windowStart + 60_000
    return {
      ok: false,
      reason: "minute",
      retryAfterSeconds: Math.max(1, Math.ceil((minuteReset - now) / 1000)),
      remaining: { minute: 0, day: Math.max(0, tier.perDay - day.count) },
      resetAt: {
        minute: minuteReset,
        day: day.windowStart + 24 * 60 * 60 * 1000,
      },
    }
  }
  if (day.count >= tier.perDay) {
    counters.set(keyId, { minute, day })
    const dayReset = day.windowStart + 24 * 60 * 60 * 1000
    return {
      ok: false,
      reason: "day",
      retryAfterSeconds: Math.max(1, Math.ceil((dayReset - now) / 1000)),
      remaining: { minute: Math.max(0, tier.perMinute - minute.count), day: 0 },
      resetAt: {
        minute: minute.windowStart + 60_000,
        day: dayReset,
      },
    }
  }

  // Pass — increment both.
  const next: Counters = {
    minute: { windowStart: minute.windowStart, count: minute.count + 1 },
    day: { windowStart: day.windowStart, count: day.count + 1 },
  }
  counters.set(keyId, next)
  return {
    ok: true,
    remaining: {
      minute: tier.perMinute - next.minute.count,
      day: tier.perDay - next.day.count,
    },
    resetAt: {
      minute: minute.windowStart + 60_000,
      day: day.windowStart + 24 * 60 * 60 * 1000,
    },
  }
}

/**
 * Build the standard rate-limit response headers from a check
 * result. Always attach these — even on success — so clients can
 * see how close they are to the cap and back off proactively.
 *
 * We expose the **stricter** of the two windows in the canonical
 * X-RateLimit-* fields (minute) and add the daily numbers under a
 * separate prefix so power users can read both.
 */
export function rateLimitHeaders(result: RateCheck, tier: RateLimitTier = DEFAULT_TIER): Headers {
  const h = new Headers()
  h.set("X-RateLimit-Limit", String(tier.perMinute))
  h.set("X-RateLimit-Remaining", String(result.remaining.minute))
  h.set("X-RateLimit-Reset", String(Math.floor(result.resetAt.minute / 1000)))
  h.set("X-RateLimit-Daily-Limit", String(tier.perDay))
  h.set("X-RateLimit-Daily-Remaining", String(result.remaining.day))
  h.set("X-RateLimit-Daily-Reset", String(Math.floor(result.resetAt.day / 1000)))
  if (!result.ok) {
    h.set("Retry-After", String(result.retryAfterSeconds))
  }
  return h
}
