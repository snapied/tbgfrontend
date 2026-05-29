// Single source of truth for pricing plans, limits, and Razorpay plan
// IDs. Imported by:
//   - /pricing page (display cards)
//   - dashboard billing page (current plan, upgrade flow)
//   - backend billing routes (enforcement + Razorpay subscription creation)
//
// When you change a price or a limit, change it here ONLY. The pricing
// page card array is currently duplicated — when you next touch it,
// migrate it to read from this catalog.
//
// Razorpay plan IDs are pulled from env at the backend; the catalog
// stores the *env var name* that holds each ID rather than the ID
// itself. That way the same TypeScript catalog can run in staging vs
// production with different Razorpay accounts behind the scenes.

export type PlanId = "starter" | "pro" | "studio" | "institute"
export type BillingPeriod = "monthly" | "quarterly" | "halfYearly" | "yearly"

/**
 * Multiplier of months covered by one billing cycle. Used to convert
 * the catalog's monthlyPaise → period total, and to discount the
 * effective per-month rate as the commitment increases. Numbers
 * picked to mirror what creators expect on Razorpay's subscription
 * intervals (monthly / quarterly / half-yearly / yearly).
 */
export const PERIOD_MONTHS: Record<BillingPeriod, number> = {
  monthly: 1,
  quarterly: 3,
  halfYearly: 6,
  yearly: 12,
}

/**
 * Effective discount per period, applied to `monthlyPaise * months`.
 * 0 = no discount. We deliberately don't discount monthly (full
 * price), give a small bump on quarterly (~4% off — one week free),
 * a bigger one on half-yearly (~8%, two weeks free), and the
 * advertised "2 months free" on yearly (~17%).
 *
 * These numbers feed BOTH the display ("Save 17%") AND the
 * Razorpay-side plan setup; the price you create in Razorpay's
 * dashboard for each plan_id should equal `monthlyPaise * months *
 * (1 - discount)` to the rupee.
 */
export const PERIOD_DISCOUNT: Record<BillingPeriod, number> = {
  monthly: 0,
  quarterly: 0.04,
  halfYearly: 0.08,
  yearly: 0.1667, // 2 months free out of 12
}

export interface PlanLimits {
  /** Active students cap. Infinity = unlimited. */
  students: number
  /** Instructor seats. Infinity = unlimited. */
  teachers: number
  /** Recording storage cap in GB. Infinity = unlimited. */
  storageGB: number
  /** Recording retention in days. Infinity = forever. */
  retentionDays: number
  /** Live classes per week. Infinity = unlimited. */
  liveClassesPerWeek: number
  /** Max length of a single live class in minutes. */
  liveClassMaxMinutes: number
  /** Published courses cap. Infinity = unlimited. */
  publishedCourses: number
  /**
   * Storefront products cap (digital downloads, memberships, bundles,
   * one-on-ones, etc.). This is the lead metric in the Graphy /
   * Tagmango bracket — most creators care more about "how many things
   * can I sell" than "how many courses can I publish".
   */
  storefrontProducts: number
  /** Community batches cap. Infinity = unlimited. */
  batches: number
  /** Custom domain (CNAME). */
  customDomain: boolean
  /** Watermark on recordings. */
  watermark: boolean
  /**
   * Marketing toolkit — coupons, drip emails, abandoned-cart, referrals.
   * Either you get it or you don't (no per-feature staircase yet).
   */
  marketingTools: boolean
  /**
   * Depth of analytics dashboard. "basic" = revenue + signups only;
   * "standard" = + engagement + completion; "advanced" = + cohort
   * comparisons + funnels + exports.
   */
  analytics: "basic" | "standard" | "advanced"
  /** Strip "Powered by The Big Class" from the public portal footer. */
  whiteLabel: boolean
  /**
   * Auto-transcripts + live captions. Whisper post-class transcript
   * runs server-side (still costs us inference); the in-call
   * captions overlay needs the toggle to even render.
   */
  transcripts: boolean
  /** Custom certificate designer (free version uses fixed templates). */
  customCertificates: boolean
  /** Drip / scheduled lesson unlock. */
  dripUnlock: boolean
  /** WhatsApp Business notifications. */
  whatsappNotifications: boolean
  /** Multilingual portal — 10-language picker, per-tenant translation
   *  overrides for both chrome and admin-typed content. Off on
   *  Starter; on for every paid tier. */
  multilingual: boolean
  /** REST API access + webhook subscriptions. Pricing page advertises
   *  this as Institute-only; matching that here keeps the dashboard
   *  honest with the marketing copy. Pro/Studio see the Developer +
   *  Webhooks pages as a preview behind the upgrade card. */
  apiAccess: boolean
  /**
   * Course version history — every Publish snapshots the course
   * and the teacher can preview / restore old versions. Free tier
   * gets the current state only; paid tiers see the full history.
   * Snapshots are always written (so an upgrade reveals history
   * captured during the trial), but the UI is gated.
   */
  courseVersioning: boolean
  /** AI content generation calls per calendar month. 0 = none. */
  aiCallsPerMonth: number
  // NOTE: There is no `transactionFeePercent`. The Founder Bill of
  // Rights (Article 1) and the homepage hero both commit to ZERO
  // commission on creator revenue, on every plan. The flat
  // subscription IS the entire commercial relationship; payment
  // processor fees (Razorpay ~2%) pass through transparently and we
  // don't mark them up. Don't add this field back without changing
  // those commitments first.
}

export interface PlanPrice {
  /**
   * Headline price in paise (₹ × 100), 0 = free. All other period
   * totals are derived: `monthlyPaise * PERIOD_MONTHS[period] *
   * (1 - PERIOD_DISCOUNT[period])`.
   */
  monthlyPaise: number
  /**
   * Optional override for yearly billing — if set, takes precedence
   * over the derived value. Used during the migration to four
   * billing periods so existing plans don't change price overnight.
   */
  yearlyPaise: number
  /** Env var holding the Razorpay plan ID for monthly billing. */
  razorpayPlanEnvMonthly?: string
  /** Env var holding the Razorpay plan ID for quarterly billing. */
  razorpayPlanEnvQuarterly?: string
  /** Env var holding the Razorpay plan ID for half-yearly billing. */
  razorpayPlanEnvHalfYearly?: string
  /** Env var holding the Razorpay plan ID for yearly billing. */
  razorpayPlanEnvYearly?: string
}

export interface Plan {
  id: PlanId
  name: string
  tagline: string
  /** Sales-led? If true, no self-serve checkout, link to contact. */
  contact?: boolean
  /** Recommended tier — gets the "Most popular" badge. */
  highlight?: boolean
  /** What appears on cards (also drives matrix rows). */
  limits: PlanLimits
  price: PlanPrice
}

// ────────────────────────────────────────────────────────────────────
// The catalog. Source of truth.
// ────────────────────────────────────────────────────────────────────

export const PLANS: Record<PlanId, Plan> = {
  starter: {
    id: "starter",
    name: "Starter",
    tagline: "Open your storefront. Sell your first course this week.",
    limits: {
      students: 50,
      teachers: 1,
      storageGB: 2,
      retentionDays: 30,
      liveClassesPerWeek: 1,
      liveClassMaxMinutes: 60,
      publishedCourses: 3,
      storefrontProducts: 5,
      batches: 1,
      customDomain: false,
      watermark: true,
      marketingTools: false,
      analytics: "basic",
      whiteLabel: false,
      transcripts: false,
      customCertificates: false,
      dripUnlock: false,
      whatsappNotifications: false,
      multilingual: false,
      apiAccess: false,
      courseVersioning: false,
      aiCallsPerMonth: 0,
    },
    price: { monthlyPaise: 0, yearlyPaise: 0 },
  },
  pro: {
    id: "pro",
    name: "Pro",
    tagline: "Your full creator business under your own domain.",
    highlight: true,
    limits: {
      students: 1000,
      teachers: 2,
      storageGB: 100,
      retentionDays: 90,
      liveClassesPerWeek: Infinity,
      liveClassMaxMinutes: 240,
      publishedCourses: 25,
      storefrontProducts: 50,
      batches: 5,
      customDomain: true,
      watermark: false,
      marketingTools: true,
      analytics: "standard",
      whiteLabel: true,
      transcripts: false,
      customCertificates: true,
      dripUnlock: true,
      whatsappNotifications: false,
      multilingual: true,
      apiAccess: false,
      courseVersioning: true,
      aiCallsPerMonth: 100,
    },
    price: {
      monthlyPaise: 149_900,
      yearlyPaise: 1_499_000,
      razorpayPlanEnvMonthly: "RAZORPAY_PLAN_PRO_MONTHLY",
      razorpayPlanEnvQuarterly: "RAZORPAY_PLAN_PRO_QUARTERLY",
      razorpayPlanEnvHalfYearly: "RAZORPAY_PLAN_PRO_HALFYEARLY",
      razorpayPlanEnvYearly: "RAZORPAY_PLAN_PRO_YEARLY",
    },
  },
  studio: {
    id: "studio",
    name: "Studio",
    tagline: "Full creator business with a team alongside you.",
    limits: {
      students: Infinity,
      teachers: 5,
      storageGB: 1024,
      retentionDays: 365,
      liveClassesPerWeek: Infinity,
      liveClassMaxMinutes: 240,
      publishedCourses: Infinity,
      storefrontProducts: Infinity,
      batches: Infinity,
      customDomain: true,
      watermark: false,
      marketingTools: true,
      analytics: "advanced",
      whiteLabel: true,
      transcripts: true,
      customCertificates: true,
      dripUnlock: true,
      whatsappNotifications: true,
      multilingual: true,
      apiAccess: false,
      courseVersioning: true,
      aiCallsPerMonth: 500,
    },
    price: {
      monthlyPaise: 349_900,
      yearlyPaise: 3_399_000,
      razorpayPlanEnvMonthly: "RAZORPAY_PLAN_STUDIO_MONTHLY",
      razorpayPlanEnvQuarterly: "RAZORPAY_PLAN_STUDIO_QUARTERLY",
      razorpayPlanEnvHalfYearly: "RAZORPAY_PLAN_STUDIO_HALFYEARLY",
      razorpayPlanEnvYearly: "RAZORPAY_PLAN_STUDIO_YEARLY",
    },
  },
  institute: {
    id: "institute",
    name: "Institute",
    tagline: "Coaching chains, schools, corporate training.",
    contact: true,
    limits: {
      students: Infinity,
      teachers: Infinity,
      storageGB: Infinity,
      retentionDays: Infinity,
      liveClassesPerWeek: Infinity,
      liveClassMaxMinutes: Infinity,
      publishedCourses: Infinity,
      storefrontProducts: Infinity,
      batches: Infinity,
      customDomain: true,
      watermark: false,
      marketingTools: true,
      analytics: "advanced",
      whiteLabel: true,
      transcripts: true,
      customCertificates: true,
      dripUnlock: true,
      whatsappNotifications: true,
      multilingual: true,
      apiAccess: true,
      courseVersioning: true,
      aiCallsPerMonth: 5000,
    },
    // Institute is sales-led — no Razorpay self-checkout. Backend
    // operators provision manually after the contract is signed.
    price: { monthlyPaise: 999_900, yearlyPaise: 9_999_000 },
  },
}

export const PLAN_ORDER: PlanId[] = ["starter", "pro", "studio", "institute"]

// ────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────

export function getPlan(id: PlanId): Plan {
  return PLANS[id]
}

export function paiseToRupees(paise: number): number {
  return Math.round(paise / 100)
}

/**
 * For a given paid plan + period, returns the env var name whose value
 * is the Razorpay plan ID. Returns undefined for free / contact plans.
 * Each period maps to its own Razorpay plan_id — Razorpay's
 * Subscriptions product requires one plan per (price, interval) pair.
 */
export function razorpayPlanEnvVar(
  planId: PlanId,
  period: BillingPeriod,
): string | undefined {
  const p = PLANS[planId]
  if (p.contact || p.price.monthlyPaise === 0) return undefined
  switch (period) {
    case "monthly": return p.price.razorpayPlanEnvMonthly
    case "quarterly": return p.price.razorpayPlanEnvQuarterly
    case "halfYearly": return p.price.razorpayPlanEnvHalfYearly
    case "yearly": return p.price.razorpayPlanEnvYearly
  }
}

/**
 * Total paise charged for one billing cycle of `period`. Derived
 * from `monthlyPaise * months * (1 - discount)` except for yearly,
 * where we honour the catalog override (legacy plans were priced as
 * a flat number rather than a discount-from-monthly).
 */
export function periodTotalPaise(planId: PlanId, period: BillingPeriod): number {
  const p = PLANS[planId]
  if (p.price.monthlyPaise === 0) return 0
  if (period === "yearly" && p.price.yearlyPaise > 0) {
    return p.price.yearlyPaise
  }
  const months = PERIOD_MONTHS[period]
  const discount = PERIOD_DISCOUNT[period]
  return Math.round(p.price.monthlyPaise * months * (1 - discount))
}

/**
 * Per-month price for a given period — for display on cards
 * ("₹1,499 / month, billed quarterly").
 */
export function periodPerMonthPaise(planId: PlanId, period: BillingPeriod): number {
  return Math.round(periodTotalPaise(planId, period) / PERIOD_MONTHS[period])
}

/**
 * Headline savings percentage shown next to the period toggle.
 * Returns an integer like 4, 8, 17 — no decimal precision needed for
 * the "Save N%" badge.
 */
export function periodSavingsPercent(period: BillingPeriod): number {
  return Math.round(PERIOD_DISCOUNT[period] * 100)
}

/** Returns the display price in ₹ for a given plan + period. */
export function displayPriceRupees(
  planId: PlanId,
  period: BillingPeriod,
): number {
  return paiseToRupees(periodTotalPaise(planId, period))
}

/** Human label for the period toggle. */
export const PERIOD_LABEL: Record<BillingPeriod, string> = {
  monthly: "Monthly",
  quarterly: "Quarterly",
  halfYearly: "Half-yearly",
  yearly: "Yearly",
}

/**
 * `Infinity` doesn't survive JSON serialisation (becomes `null`). When
 * exposing limits over the wire we replace it with a sentinel large
 * number, and the client converts back. Picking 2^31 - 1 keeps it
 * within safe integer range and obviously "unlimited" in any UI.
 */
export const UNLIMITED_SENTINEL = 2_147_483_647

export function serializeLimits(limits: PlanLimits): PlanLimits {
  // Cast via `unknown` because PlanLimits now contains non-numeric
  // fields (`analytics: "basic" | "standard" | "advanced"`); the
  // sentinel rewrite only touches numeric fields, but TypeScript can't
  // narrow that statically.
  const result = { ...limits }
  ;(Object.keys(result) as Array<keyof PlanLimits>).forEach((k) => {
    const v = result[k]
    if (typeof v === "number" && v === Infinity) {
      ;(result as unknown as Record<string, unknown>)[k as string] = UNLIMITED_SENTINEL
    }
  })
  return result
}

export function deserializeLimits(limits: PlanLimits): PlanLimits {
  const result = { ...limits }
  ;(Object.keys(result) as Array<keyof PlanLimits>).forEach((k) => {
    const v = result[k]
    if (typeof v === "number" && v >= UNLIMITED_SENTINEL) {
      ;(result as unknown as Record<string, unknown>)[k as string] = Infinity
    }
  })
  return result
}
