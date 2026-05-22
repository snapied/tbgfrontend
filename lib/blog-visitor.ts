"use client"

// Tiny browser-local helpers for the public blog surfaces.
//
// We track three things in localStorage, all anonymous:
//
//   1. A stable per-browser `visitorId` (random base36 string) so a
//      visitor's emoji reactions can be toggled idempotently without
//      asking them to sign in.
//   2. The visitor's `name` + `email` after they leave a comment, so
//      the comment composer pre-fills next time they visit any post
//      on any tenant.
//   3. A per-post-per-email comment counter for the current calendar
//      day, used to enforce the "3 comments per email per post per
//      day" rate limit.
//
// All keys live under the global `thebigclass.global.*` namespace
// because the visitor identity is per-browser, not per-tenant — a
// fan of one creator might subscribe to another and the same
// browser identity should carry across.

const VISITOR_ID_KEY = "thebigclass.global.blogVisitorId.v1"
const VISITOR_IDENTITY_KEY = "thebigclass.global.blogVisitorIdentity.v1"
const COMMENT_RATE_LIMIT_KEY = "thebigclass.global.blogCommentRate.v1"

export const MAX_COMMENTS_PER_EMAIL_PER_POST_PER_DAY = 3

export interface BlogVisitorIdentity {
  name: string
  email: string
}

// Stable browser identity. Created on first read; persists across
// sessions until the user clears their storage. Used as the array
// member for reaction tallies so a visitor can untoggle their own
// reaction without affecting other visitors' counts.
export function getBlogVisitorId(): string {
  if (typeof window === "undefined") return "ssr"
  const existing = window.localStorage.getItem(VISITOR_ID_KEY)
  if (existing) return existing
  const fresh =
    `v-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
  try {
    window.localStorage.setItem(VISITOR_ID_KEY, fresh)
  } catch {
    /* private mode / quota — fall through; the id just won't persist */
  }
  return fresh
}

export function readBlogVisitorIdentity(): BlogVisitorIdentity | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.localStorage.getItem(VISITOR_IDENTITY_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<BlogVisitorIdentity>
    if (!parsed?.email || !parsed?.name) return null
    return { name: parsed.name, email: parsed.email }
  } catch {
    return null
  }
}

export function writeBlogVisitorIdentity(identity: BlogVisitorIdentity): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(VISITOR_IDENTITY_KEY, JSON.stringify(identity))
  } catch {
    /* ignore */
  }
}

// ---------------------------------------------------------------
// Per-day, per-post, per-email comment counter
// ---------------------------------------------------------------
// Shape on disk: { [postId]: { [emailLower]: { count, ymd } } }
// We don't track time-of-day — the rate limit is "comments per
// calendar day" which is honest and easy to explain. When the day
// flips (`ymd` differs), the counter resets.

interface RateLimitState {
  count: number
  ymd: string
}

type RateLimitTable = Record<string, Record<string, RateLimitState>>

function readRateLimitTable(): RateLimitTable {
  if (typeof window === "undefined") return {}
  try {
    const raw = window.localStorage.getItem(COMMENT_RATE_LIMIT_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === "object" ? (parsed as RateLimitTable) : {}
  } catch {
    return {}
  }
}

function writeRateLimitTable(table: RateLimitTable): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(COMMENT_RATE_LIMIT_KEY, JSON.stringify(table))
  } catch {
    /* ignore */
  }
}

function currentYmd(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

// Returns the number of comments this email has posted to this post
// *today*. Stale entries from previous days are treated as zero.
export function getDailyCommentCount(postId: string, email: string): number {
  const e = email.trim().toLowerCase()
  if (!e) return 0
  const table = readRateLimitTable()
  const entry = table[postId]?.[e]
  if (!entry) return 0
  if (entry.ymd !== currentYmd()) return 0
  return entry.count
}

// Bumps the counter after a successful comment submit. Returns the
// new count so callers can also surface "you have 1 left" hints.
export function bumpDailyCommentCount(postId: string, email: string): number {
  const e = email.trim().toLowerCase()
  if (!e) return 0
  const table = readRateLimitTable()
  const today = currentYmd()
  const postBucket = table[postId] ?? {}
  const prev = postBucket[e]
  const nextCount = !prev || prev.ymd !== today ? 1 : prev.count + 1
  postBucket[e] = { count: nextCount, ymd: today }
  table[postId] = postBucket
  writeRateLimitTable(table)
  return nextCount
}
