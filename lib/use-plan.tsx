"use client"

// Single hook for "what plan am I on, and what's my limit for X".
//
// Source of truth, in order of preference:
//   1. /api/billing/subscription (when the user is properly signed
//      into the backend) — this also returns server-side usage.
//   2. localStorage-cached billing snapshot (so the dashboard doesn't
//      flash "starter" while the request is in flight).
//   3. Hardcoded "starter" — fresh signups + demo sessions land here,
//      which matches what they actually have access to.
//
// Consumers usually want one of:
//   - `plan` — the resolved PlanId for current tenant
//   - `limits` — full PlanLimits (Infinity already deserialised)
//   - `isAllowed(feature)` — boolean, e.g. `isAllowed("customDomain")`
//   - `usageRemaining(metric, current)` — e.g.
//     `usageRemaining("publishedCourses", courses.length)` returns
//     Infinity for unlimited or the number left before they hit the
//     cap. Use this to decide whether to show a lock icon.

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import {
  PLANS,
  PLAN_ORDER,
  deserializeLimits,
  type PlanId,
  type PlanLimits,
} from "./plans"
import { fetchSubscription, ensureAuthed } from "./billing-client"

const CACHE_KEY = "thebigclass.planCache"

type SubscriptionStatus = "active" | "trialing" | "past_due" | "cancelled" | "paused"

interface CachedPlan {
  plan: PlanId
  limits: PlanLimits
  /** Cached server-side usage counts; null when not yet known. */
  usage: {
    students?: number
    teachers?: number
    batches?: number
    storageBytes?: number
    publishedCourses?: number
  } | null
  status?: SubscriptionStatus
  trialEndsAt?: string | null
  currentPeriodEnd?: string | null
  fetchedAt: string
}

interface PlanContextValue {
  /** Current plan id. Defaults to "starter". */
  plan: PlanId
  /** Resolved limits (Infinity for "unlimited"). */
  limits: PlanLimits
  /** True when we've successfully hydrated from the backend. */
  hydrated: boolean
  /** Server-side usage counts (when available). */
  serverUsage: CachedPlan["usage"]
  /** Subscription lifecycle status — drives trial pill + cancel banner. */
  status: SubscriptionStatus
  /** ISO end of the trial when status === "trialing", else null. */
  trialEndsAt: string | null
  /** Days remaining in the current trial; null when not trialing. Floors at 0. */
  trialDaysLeft: number | null
  /** ISO end of the current paid period when known (any status). */
  currentPeriodEnd: string | null
  /**
   * Returns true when this feature is included in the current plan.
   * Boolean features (`customDomain`, `marketingTools`) → direct lookup.
   * Tiered features (`analytics`) → use isAtLeast() instead.
   */
  isAllowed: (feature: keyof PlanLimits) => boolean
  /**
   * For tiered features. e.g. `isAtLeast("analytics", "standard")`
   * returns true on Pro / Studio / Institute, false on Starter.
   */
  isAtLeast: (
    feature: "analytics",
    tier: PlanLimits["analytics"],
  ) => boolean
  /**
   * How many of `metric` are still available before the cap. Returns
   * Infinity when unlimited, negative when already over.
   */
  usageRemaining: (
    metric: "students" | "teachers" | "batches" | "publishedCourses" | "storefrontProducts" | "liveClassesPerWeek",
    current: number,
  ) => number
  /** Lowest paid plan that includes `feature`. Used in upgrade CTAs. */
  cheapestPlanFor: (feature: keyof PlanLimits) => PlanId
  /** Force re-fetch from the backend (e.g. after upgrade). */
  refresh: () => Promise<void>
}

const FALLBACK: PlanContextValue = {
  plan: "starter",
  limits: PLANS.starter.limits,
  hydrated: false,
  serverUsage: null,
  status: "active",
  trialEndsAt: null,
  trialDaysLeft: null,
  currentPeriodEnd: null,
  isAllowed: (f) => Boolean(PLANS.starter.limits[f]),
  isAtLeast: (_, tier) => tier === "basic",
  usageRemaining: () => Infinity,
  cheapestPlanFor: () => "pro",
  refresh: async () => {},
}

const PlanContext = createContext<PlanContextValue>(FALLBACK)

export function PlanProvider({ children }: { children: React.ReactNode }) {
  const [plan, setPlan] = useState<PlanId>("starter")
  const [limits, setLimits] = useState<PlanLimits>(PLANS.starter.limits)
  const [serverUsage, setServerUsage] = useState<CachedPlan["usage"]>(null)
  const [hydrated, setHydrated] = useState(false)
  const [status, setStatus] = useState<SubscriptionStatus>("active")
  const [trialEndsAt, setTrialEndsAt] = useState<string | null>(null)
  const [currentPeriodEnd, setCurrentPeriodEnd] = useState<string | null>(null)

  // 1. Hydrate from cache synchronously (still falls back if empty).
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(CACHE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as CachedPlan
        if (parsed?.plan && PLANS[parsed.plan]) {
          setPlan(parsed.plan)
          setLimits(deserializeLimits(parsed.limits))
          setServerUsage(parsed.usage)
          if (parsed.status) setStatus(parsed.status)
          if (parsed.trialEndsAt !== undefined) setTrialEndsAt(parsed.trialEndsAt)
          if (parsed.currentPeriodEnd !== undefined) setCurrentPeriodEnd(parsed.currentPeriodEnd)
        }
      }
    } catch {
      /* fine — fall back to starter */
    }
  }, [])

  const refresh = useCallback(async () => {
    // Use the cookie-session aware check so users with a valid
    // refresh cookie but no localStorage token still resolve their
    // real plan (and don't get parked on "starter" forever).
    const authed = await ensureAuthed()
    if (!authed) {
      setHydrated(true)
      return
    }
    const result = await fetchSubscription()
    if ("error" in result) {
      setHydrated(true)
      return
    }
    const planId = (result.subscription.plan as PlanId) || "starter"
    const subStatus = (result.subscription.status as SubscriptionStatus) || "active"
    setPlan(planId)
    // Limits resolution, in priority order:
    //   1. Deserialise the backend response — flips UNLIMITED_SENTINEL
    //      back into Infinity.
    //   2. For any limit field where the backend sent null (older
    //      backend that didn't serialise — Infinity → null on the
    //      wire), fall back to the local PLANS catalog. The catalog
    //      is the same data the backend reads from, so this is a
    //      safe shadow source. Without it, Institute customers
    //      stranded on a stale backend would see "limit hit" on
    //      everything because null reads as 0 in cap checks.
    const fromWire = deserializeLimits(result.limits)
    const fromCatalog = PLANS[planId]?.limits ?? PLANS.starter.limits
    const merged: PlanLimits = { ...fromCatalog, ...fromWire }
    ;(Object.keys(merged) as Array<keyof PlanLimits>).forEach((k) => {
      if (merged[k] === null || merged[k] === undefined) {
        ;(merged as unknown as Record<string, unknown>)[k as string] =
          (fromCatalog as unknown as Record<string, unknown>)[k as string]
      }
    })
    setLimits(merged)
    setServerUsage(result.usage)
    setStatus(subStatus)
    setTrialEndsAt(result.subscription.trialEndsAt)
    setCurrentPeriodEnd(result.subscription.currentPeriodEnd)
    setHydrated(true)
    try {
      window.localStorage.setItem(
        CACHE_KEY,
        JSON.stringify({
          plan: planId,
          limits: result.limits,
          usage: result.usage,
          status: subStatus,
          trialEndsAt: result.subscription.trialEndsAt,
          currentPeriodEnd: result.subscription.currentPeriodEnd,
          fetchedAt: new Date().toISOString(),
        } satisfies CachedPlan),
      )
    } catch {
      /* quota — fine */
    }
  }, [])

  useEffect(() => { void refresh() }, [refresh])

  const value = useMemo<PlanContextValue>(() => {
    const isAllowed = (feature: keyof PlanLimits) => {
      const v = limits[feature]
      if (typeof v === "boolean") return v
      if (typeof v === "number") return v > 0
      return true
    }
    const TIER_ORDER: PlanLimits["analytics"][] = ["basic", "standard", "advanced"]
    const isAtLeast = (_: "analytics", tier: PlanLimits["analytics"]) =>
      TIER_ORDER.indexOf(limits.analytics) >= TIER_ORDER.indexOf(tier)
    const usageRemaining = (metric: Parameters<PlanContextValue["usageRemaining"]>[0], current: number) => {
      const cap = limits[metric] as number
      if (cap === Infinity) return Infinity
      return cap - current
    }
    const cheapestPlanFor = (feature: keyof PlanLimits): PlanId => {
      for (const id of PLAN_ORDER) {
        const v = PLANS[id].limits[feature]
        if (typeof v === "boolean" && v) return id
        if (typeof v === "number" && v > 0 && v >= (limits[feature] as number)) return id
      }
      return "pro"
    }
    const trialDaysLeft = (() => {
      if (status !== "trialing" || !trialEndsAt) return null
      const ms = new Date(trialEndsAt).getTime() - Date.now()
      if (!Number.isFinite(ms)) return null
      return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)))
    })()
    return {
      plan, limits, hydrated, serverUsage,
      status, trialEndsAt, trialDaysLeft, currentPeriodEnd,
      isAllowed, isAtLeast, usageRemaining, cheapestPlanFor, refresh,
    }
  }, [plan, limits, hydrated, serverUsage, status, trialEndsAt, currentPeriodEnd, refresh])

  return <PlanContext.Provider value={value}>{children}</PlanContext.Provider>
}

export function usePlan(): PlanContextValue {
  return useContext(PlanContext)
}
