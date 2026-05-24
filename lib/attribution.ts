"use client"

// Visitor attribution — captures where a visitor came from on their
// first landing (first-touch) and on every subsequent landing
// (multi-touch chain). Lets the dashboard answer "how did people who
// enrolled find us?"
//
// What we record per touch:
//   • UTM params (source/medium/campaign/term/content)
//   • Referrer hostname (e.g. "google.com", "twitter.com")
//   • Landing path
//   • Inferred channel (organic-search, paid, social, email, direct, ...)
//   • Timestamp
//
// Storage per visitor:
//   thebigclass.t.<slug>.attribution.<visitorId>
//     → AttributionRecord
//
// Visitor id: LMS user id when known, else the same anon id the
// experiments primitive uses (single anon id per browser so
// experiments + attribution can be joined later).
//
// The capture hook runs once per session (per `sessionStorage` flag) so
// SPA navigations don't re-record a fresh touch — only a full page
// load with UTMs or a foreign referrer counts as a new touch.

import { useEffect } from "react"

// ---------- Types ----------

export type AttributionChannel =
  | "direct"
  | "organic-search"
  | "paid-search"
  | "social"
  | "paid-social"
  | "email"
  | "referral"
  | "affiliate"
  | "unknown"

export interface AttributionTouch {
  id: string
  /** ISO timestamp of the touch. */
  at: string
  /** Inferred channel — see classifyTouch() rules below. */
  channel: AttributionChannel
  /** Resolved referrer hostname or null when direct/empty. */
  referrerHost: string | null
  /** Raw landing path (`/p/<tenant>/courses/foo?utm_source=fb`). */
  landingPath: string
  utm: {
    source?: string
    medium?: string
    campaign?: string
    term?: string
    content?: string
  }
}

export interface AttributionRecord {
  visitorId: string
  /** First-touch — never overwritten once set. */
  firstTouch: AttributionTouch
  /** Last-touch — overwritten each time a fresh touch lands. */
  lastTouch: AttributionTouch
  /** Full chain of touches up to MAX_TOUCHES — FIFO eviction. */
  touches: AttributionTouch[]
  /** Conversions logged against this visitor (enrollments, leads).
   *  Each links back to the touch index that brought them in. */
  conversions: AttributionConversion[]
}

export interface AttributionConversion {
  id: string
  at: string
  /** "enroll" | "lead" | "purchase" etc. Free-form. */
  kind: string
  /** Optional monetary value — used by the dashboard to compute
   *  revenue per channel. */
  value?: number
  currency?: string
  /** Optional artifact id (e.g. courseId). */
  artifactId?: string
}

// ---------- Storage helpers ----------

const ANON_ID_KEY = "thebigclass.experiments.anonId"
const SESSION_FLAG = "thebigclass.attribution.sessionCaptured"
const MAX_TOUCHES = 25

function storageKey(tenantSlug: string, visitorId: string): string {
  return `thebigclass.t.${tenantSlug || "default"}.attribution.${visitorId}`
}

function getOrCreateVisitorId(): string {
  if (typeof window === "undefined") return "ssr"
  try {
    const existing = window.localStorage.getItem(ANON_ID_KEY)
    if (existing) return existing
    const id = `anon-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
    window.localStorage.setItem(ANON_ID_KEY, id)
    return id
  } catch {
    return "anon-fallback"
  }
}

function readRecord(tenantSlug: string, visitorId: string): AttributionRecord | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.localStorage.getItem(storageKey(tenantSlug, visitorId))
    return raw ? (JSON.parse(raw) as AttributionRecord) : null
  } catch {
    return null
  }
}

function writeRecord(tenantSlug: string, record: AttributionRecord): boolean {
  if (typeof window === "undefined") return false
  try {
    window.localStorage.setItem(storageKey(tenantSlug, record.visitorId), JSON.stringify(record))
    return true
  } catch {
    return false
  }
}

// ---------- Channel classification ----------

/** Map a touch's UTM + referrer into one of our channel buckets.
 *  Rules (first match wins):
 *   1. utm_medium hints (cpc/ppc → paid-search, social → paid-social)
 *   2. utm_source domain match (google/bing → search; facebook/twitter → social)
 *   3. Known referrer hostname → channel
 *   4. No referrer + no UTM → direct
 *   5. Foreign referrer with no special pattern → referral
 *  Easier to maintain than a giant regex tower; new rules slot in
 *  near the top. */
export function classifyTouch(touch: {
  utm: AttributionTouch["utm"]
  referrerHost: string | null
}): AttributionChannel {
  const u = touch.utm
  const medium = (u.medium || "").toLowerCase()
  const source = (u.source || "").toLowerCase()

  // Explicit medium wins. CPC / PPC / display = paid; "email" = email; etc.
  if (["cpc", "ppc", "paidsearch", "paid-search"].includes(medium)) return "paid-search"
  if (["paidsocial", "paid-social", "display"].includes(medium)) return "paid-social"
  if (medium === "email" || medium === "newsletter") return "email"
  if (medium === "social") return "social"
  if (medium === "affiliate" || medium === "partner") return "affiliate"
  if (medium === "referral") return "referral"
  if (medium === "organic") return "organic-search"

  // Source pattern matching.
  if (/google|bing|duckduckgo|yahoo|yandex|baidu/.test(source)) return "organic-search"
  if (/facebook|fb|instagram|twitter|x\.com|linkedin|youtube|tiktok|reddit|whatsapp|telegram|pinterest|snapchat/.test(source)) {
    return "social"
  }
  if (/mailchimp|sendgrid|substack|newsletter|email/.test(source)) return "email"

  // Referrer-only classification.
  const ref = (touch.referrerHost || "").toLowerCase()
  if (!ref) return "direct"
  if (/google\.|bing\.|duckduckgo\.|yahoo\.|yandex\.|baidu\./.test(ref)) return "organic-search"
  if (/facebook\.|instagram\.|twitter\.|x\.com|linkedin\.|youtube\.|tiktok\.|reddit\.|whatsapp\.|telegram\.|pinterest\.|snapchat\./.test(ref)) {
    return "social"
  }
  // Foreign referrer with no special pattern → generic referral.
  return "referral"
}

// ---------- Capture hook ----------

interface CaptureOptions {
  /** Tenant slug — keys the storage namespace. Defaults to "default"
   *  when omitted (e.g. early SSR mount). */
  tenantSlug?: string
  /** Override the visitor id (e.g. signed-in user id) — defaults to
   *  the sticky anon id. When you pass a known user id, the
   *  attribution chain stays under that id so future sessions
   *  continue to add to it. */
  visitorId?: string
}

/** Captures the current landing as a fresh attribution touch when:
 *   • the page just loaded (sessionStorage flag absent), AND
 *   • either a UTM is present OR the referrer is foreign.
 *
 * Idempotent within a tab: re-mounting the hook (e.g. SPA navigation)
 * does NOT add a new touch. A full page reload with the same URL but
 * cleared sessionStorage does. This matches the GA / Plausible
 * convention for "visit" boundaries. */
export function useAttributionCapture(opts: CaptureOptions = {}): void {
  const { tenantSlug = "default", visitorId } = opts

  useEffect(() => {
    if (typeof window === "undefined") return
    try {
      if (window.sessionStorage.getItem(SESSION_FLAG) === "1") return
    } catch {
      // SessionStorage disabled — proceed; worst case we record a
      // single extra touch per navigation in this exotic environment.
    }

    const id = visitorId ?? getOrCreateVisitorId()
    const url = new URL(window.location.href)
    const utm: AttributionTouch["utm"] = {
      source: url.searchParams.get("utm_source") ?? undefined,
      medium: url.searchParams.get("utm_medium") ?? undefined,
      campaign: url.searchParams.get("utm_campaign") ?? undefined,
      term: url.searchParams.get("utm_term") ?? undefined,
      content: url.searchParams.get("utm_content") ?? undefined,
    }
    const refRaw = document.referrer || ""
    const referrerHost = (() => {
      try {
        if (!refRaw) return null
        const u = new URL(refRaw)
        // Same-host referrer counts as no referrer — internal nav
        // shouldn't ever count as a fresh touch.
        if (u.host === window.location.host) return null
        return u.host
      } catch {
        return null
      }
    })()

    const hasUtm = Object.values(utm).some(Boolean)
    const isForeignReferrer = !!referrerHost

    const existing = readRecord(tenantSlug, id)

    // Skip recording when there's nothing new AND the visitor already
    // has a first-touch — otherwise we'd overwrite "google.com" with
    // "direct" every refresh.
    if (existing && !hasUtm && !isForeignReferrer) {
      try {
        window.sessionStorage.setItem(SESSION_FLAG, "1")
      } catch {
        // ignore
      }
      return
    }

    const touch: AttributionTouch = {
      id: `t-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      at: new Date().toISOString(),
      channel: classifyTouch({ utm, referrerHost }),
      referrerHost,
      landingPath: window.location.pathname + window.location.search,
      utm,
    }

    const record: AttributionRecord = existing
      ? {
          ...existing,
          lastTouch: touch,
          touches:
            existing.touches.length >= MAX_TOUCHES
              ? [...existing.touches.slice(-(MAX_TOUCHES - 1)), touch]
              : [...existing.touches, touch],
        }
      : {
          visitorId: id,
          firstTouch: touch,
          lastTouch: touch,
          touches: [touch],
          conversions: [],
        }

    writeRecord(tenantSlug, record)
    try {
      window.sessionStorage.setItem(SESSION_FLAG, "1")
    } catch {
      // ignore
    }
  }, [tenantSlug, visitorId])
}

// ---------- Conversion logging ----------

/** Append a conversion to the current visitor's attribution record.
 *  Safe to call from anywhere (signup form submit, enrollment success
 *  callback, checkout webhook). Silently no-ops in SSR / when no
 *  attribution record exists (visitor never captured a touch). */
export function logConversion(
  tenantSlug: string,
  conversion: Omit<AttributionConversion, "id" | "at">,
  visitorIdOverride?: string,
): boolean {
  if (typeof window === "undefined") return false
  const id = visitorIdOverride ?? getOrCreateVisitorId()
  const existing = readRecord(tenantSlug, id)
  if (!existing) return false
  const entry: AttributionConversion = {
    id: `cv-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    at: new Date().toISOString(),
    ...conversion,
  }
  const next: AttributionRecord = {
    ...existing,
    conversions: [...existing.conversions, entry],
  }
  return writeRecord(tenantSlug, next)
}

// ---------- Report aggregator ----------

export interface ChannelBreakdownRow {
  channel: AttributionChannel
  /** Unique visitors whose first-touch was this channel. */
  visitors: number
  /** Conversion count from visitors whose first-touch is this channel. */
  conversions: number
  /** Sum of conversion value (for channels where the conversion
   *  recorded a value). */
  revenue: number
  /** First-touch / last-touch split — handy when a channel
   *  introduces visitors but rarely closes them. */
  lastTouchConversions: number
}

export interface AttributionReport {
  totalVisitors: number
  totalConversions: number
  totalRevenue: number
  /** Per-channel rows sorted by visitors desc. */
  byChannel: ChannelBreakdownRow[]
  /** Per-campaign rollup. Smaller surface — only campaigns that
   *  drove at least one visitor are listed. */
  byCampaign: Array<{
    campaign: string
    visitors: number
    conversions: number
    revenue: number
  }>
  /** Top referring hostnames — useful when a partner / blog post
   *  drives a spike and we want to know who. */
  topReferrers: Array<{ host: string; visitors: number }>
}

/** Read every visitor record under a tenant and roll it into one
 *  report. Reads via a key scan on localStorage so we don't have to
 *  keep a separate index; performant at the < 5000 visitor mark this
 *  client-side store is dimensioned for. */
export function buildAttributionReport(tenantSlug: string): AttributionReport {
  if (typeof window === "undefined") {
    return {
      totalVisitors: 0,
      totalConversions: 0,
      totalRevenue: 0,
      byChannel: [],
      byCampaign: [],
      topReferrers: [],
    }
  }
  const prefix = `thebigclass.t.${tenantSlug || "default"}.attribution.`
  const records: AttributionRecord[] = []
  for (let i = 0; i < window.localStorage.length; i++) {
    const k = window.localStorage.key(i)
    if (!k || !k.startsWith(prefix)) continue
    try {
      const raw = window.localStorage.getItem(k)
      if (!raw) continue
      records.push(JSON.parse(raw) as AttributionRecord)
    } catch {
      // Corrupt entry — skip rather than crashing the report.
    }
  }

  // Per-channel rollup. We count first-touch attribution as the
  // primary visitor → channel mapping (the "where did we acquire
  // them?" question). Last-touch conversions are a secondary metric
  // for funnel debugging.
  const channelMap = new Map<AttributionChannel, ChannelBreakdownRow>()
  const ensureChannel = (ch: AttributionChannel): ChannelBreakdownRow => {
    let row = channelMap.get(ch)
    if (!row) {
      row = { channel: ch, visitors: 0, conversions: 0, revenue: 0, lastTouchConversions: 0 }
      channelMap.set(ch, row)
    }
    return row
  }

  let totalVisitors = 0
  let totalConversions = 0
  let totalRevenue = 0
  const campaignMap = new Map<string, { visitors: number; conversions: number; revenue: number }>()
  const referrerMap = new Map<string, number>()

  for (const r of records) {
    totalVisitors++
    const ftRow = ensureChannel(r.firstTouch.channel)
    ftRow.visitors++

    const cs = r.conversions
    const revenue = cs.reduce((s, c) => s + (c.value ?? 0), 0)
    totalConversions += cs.length
    totalRevenue += revenue

    if (cs.length > 0) {
      ftRow.conversions += cs.length
      ftRow.revenue += revenue
      const ltRow = ensureChannel(r.lastTouch.channel)
      ltRow.lastTouchConversions += cs.length
    }

    const campaign = r.firstTouch.utm.campaign?.trim()
    if (campaign) {
      const c = campaignMap.get(campaign) ?? { visitors: 0, conversions: 0, revenue: 0 }
      c.visitors++
      c.conversions += cs.length
      c.revenue += revenue
      campaignMap.set(campaign, c)
    }

    const host = r.firstTouch.referrerHost
    if (host) referrerMap.set(host, (referrerMap.get(host) ?? 0) + 1)
  }

  const byChannel = Array.from(channelMap.values()).sort((a, b) => b.visitors - a.visitors)
  const byCampaign = Array.from(campaignMap.entries())
    .map(([campaign, v]) => ({ campaign, ...v }))
    .sort((a, b) => b.visitors - a.visitors)
  const topReferrers = Array.from(referrerMap.entries())
    .map(([host, visitors]) => ({ host, visitors }))
    .sort((a, b) => b.visitors - a.visitors)
    .slice(0, 10)

  return {
    totalVisitors,
    totalConversions,
    totalRevenue,
    byChannel,
    byCampaign,
    topReferrers,
  }
}

/** Convenience: list every attribution record under a tenant (used by
 *  the dashboard's "recent visitors" table). */
export function listAttributionRecords(tenantSlug: string): AttributionRecord[] {
  if (typeof window === "undefined") return []
  const prefix = `thebigclass.t.${tenantSlug || "default"}.attribution.`
  const out: AttributionRecord[] = []
  for (let i = 0; i < window.localStorage.length; i++) {
    const k = window.localStorage.key(i)
    if (!k || !k.startsWith(prefix)) continue
    try {
      const raw = window.localStorage.getItem(k)
      if (!raw) continue
      out.push(JSON.parse(raw) as AttributionRecord)
    } catch {
      /* skip corrupt */
    }
  }
  return out.sort(
    (a, b) => new Date(b.firstTouch.at).getTime() - new Date(a.firstTouch.at).getTime(),
  )
}
