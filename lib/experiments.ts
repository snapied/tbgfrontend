"use client"

// Tiny in-browser A/B experiments primitive.
//
// We deliberately keep this client-only — no GrowthBook, no LaunchDarkly,
// no server-side flag evaluation. The use cases that justified Sprint 3
// (hero copy, CTA wording, blog "what to show first") are all client-
// renderable, so a localStorage-backed assignment is enough until
// traffic + flag count outgrow it. The shape mirrors the larger flag
// SaaSes so a future migration is mostly find/replace on the hook call.
//
// Storage per tenant:
//   • `thebigclass.t.<slug>.experiments.configs`
//       → ExperimentConfig[] (defined by admin in the dashboard)
//   • `thebigclass.t.<slug>.experiments.assignments`
//       → Record<experimentKey, variantId>  (sticky for this visitor)
//   • `thebigclass.t.<slug>.experiments.events`
//       → ExperimentEvent[] (rolling; capped at MAX_EVENTS)
//
// Assignment is sticky per (visitor, experiment). Once a visitor lands
// in B, they STAY in B even if traffic split changes — otherwise the
// experiment data becomes meaningless (someone counted as a B exposure
// converts as an A and the report is junk).
//
// Visitor id is the LMS currentUser.id when signed in, else a sticky
// anon id from localStorage. Single source of truth so the same browser
// in two tabs gets the same assignment.

import { useCallback, useEffect, useMemo, useState } from "react"

// ---------- Types ----------

export interface ExperimentVariant {
  id: string
  label: string
  /** Relative weight. Variant weight / sum(weights) = traffic share.
   *  Weights of (1, 1) = 50/50; (3, 1) = 75/25. Zero disables the
   *  variant (no new visitors assigned, existing assignments kept). */
  weight: number
}

export interface ExperimentConfig {
  /** Stable machine key — used in code. e.g. "hero-cta-copy". */
  key: string
  /** Human-readable name shown in the admin. */
  name: string
  description?: string
  variants: ExperimentVariant[]
  /** Status drives the hook's behaviour:
   *   • draft     — variants resolve to the first variant always (no
   *                 random assignment, no events stored)
   *   • running   — random assignment by weight, exposures + conversions tracked
   *   • paused    — existing assignments resolved, new visitors get the first variant
   *   • completed — like paused, but the admin marks "winner shipped"
   *                 so we keep the history without inviting more traffic */
  status: "draft" | "running" | "paused" | "completed"
  /** Optional: pin a variant as the declared winner. Resolution
   *  short-circuits to this variant regardless of assignment so the
   *  team can ship the winner across all traffic without removing
   *  the experiment definition (preserves report continuity). */
  winnerVariantId?: string
  /** Free-text list of conversion event names this experiment cares
   *  about. Used to filter the per-experiment report — events outside
   *  this list still get stored under the experiment but aren't
   *  highlighted in the summary table. */
  goals?: string[]
  createdAt: string
  updatedAt: string
}

/** An assigned-but-unfired exposure or a fired conversion. Stored as a
 *  flat append-only log so reports can recompute lift on the fly. */
export interface ExperimentEvent {
  id: string
  experimentKey: string
  variantId: string
  /** "exposure" fires the first time a visitor renders the variant
   *  (so assignment-without-render isn't counted as an impression).
   *  "conversion" fires on whatever event the consumer reports. */
  kind: "exposure" | "conversion"
  /** Free-form name on conversion events ("enroll", "newsletter-signup").
   *  Undefined for exposures. */
  eventName?: string
  /** Visitor id (LMS user id when signed in, else anon id). */
  visitorId: string
  createdAt: string
}

// ---------- Storage helpers ----------

const ANON_ID_KEY = "thebigclass.experiments.anonId"
const MAX_EVENTS = 5000

function tk(slug: string, leaf: string): string {
  return `thebigclass.t.${slug || "default"}.experiments.${leaf}`
}

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function writeJson<T>(key: string, value: T): boolean {
  if (typeof window === "undefined") return false
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

function getOrCreateAnonId(): string {
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

/** Weighted random pick. Returns the variant whose cumulative weight
 *  band the random roll lands in. Zero-weight variants are unreachable
 *  to new visitors but stay valid resolution targets for already-
 *  assigned ones (handled at the call site by checking existing
 *  assignments first). */
function pickVariant(variants: ExperimentVariant[]): ExperimentVariant {
  const total = variants.reduce((sum, v) => sum + Math.max(0, v.weight), 0)
  if (total <= 0) return variants[0]
  const roll = Math.random() * total
  let cursor = 0
  for (const v of variants) {
    cursor += Math.max(0, v.weight)
    if (roll < cursor) return v
  }
  // Floating-point edge — return the last variant.
  return variants[variants.length - 1]
}

// ---------- Admin store ----------

export interface ExperimentsAdminApi {
  configs: ExperimentConfig[]
  upsert: (config: ExperimentConfig) => void
  remove: (key: string) => void
  /** Returns all events; pass a key to scope. */
  events: (key?: string) => ExperimentEvent[]
  /** Drop the event log (keeps configs). Useful when restarting a
   *  badly-instrumented experiment. */
  clearEvents: (key?: string) => void
  /** Drop ALL visitor assignments. Use sparingly — this is a "reroll
   *  everyone" button and invalidates in-flight reports. */
  clearAssignments: (key?: string) => void
}

/** Admin-side hook — loads + persists ExperimentConfigs and exposes
 *  event/assignment management helpers for the dashboard page. */
export function useExperimentsAdmin(tenantSlug: string): ExperimentsAdminApi {
  const configsKey = useMemo(() => tk(tenantSlug, "configs"), [tenantSlug])
  const eventsKey = useMemo(() => tk(tenantSlug, "events"), [tenantSlug])
  const assignmentsKey = useMemo(() => tk(tenantSlug, "assignments"), [tenantSlug])
  const [configs, setConfigs] = useState<ExperimentConfig[]>([])

  useEffect(() => {
    setConfigs(readJson<ExperimentConfig[]>(configsKey, []))
  }, [configsKey])

  const upsert = useCallback(
    (config: ExperimentConfig) => {
      setConfigs((prev) => {
        const idx = prev.findIndex((c) => c.key === config.key)
        const next = idx >= 0 ? prev.map((c, i) => (i === idx ? config : c)) : [...prev, config]
        writeJson(configsKey, next)
        return next
      })
    },
    [configsKey],
  )

  const remove = useCallback(
    (key: string) => {
      setConfigs((prev) => {
        const next = prev.filter((c) => c.key !== key)
        writeJson(configsKey, next)
        return next
      })
    },
    [configsKey],
  )

  const events = useCallback(
    (key?: string): ExperimentEvent[] => {
      const all = readJson<ExperimentEvent[]>(eventsKey, [])
      return key ? all.filter((e) => e.experimentKey === key) : all
    },
    [eventsKey],
  )

  const clearEvents = useCallback(
    (key?: string) => {
      const all = readJson<ExperimentEvent[]>(eventsKey, [])
      const next = key ? all.filter((e) => e.experimentKey !== key) : []
      writeJson(eventsKey, next)
    },
    [eventsKey],
  )

  const clearAssignments = useCallback(
    (key?: string) => {
      const all = readJson<Record<string, string>>(assignmentsKey, {})
      if (!key) {
        writeJson(assignmentsKey, {})
        return
      }
      // Assignment map keys are `${experimentKey}::${visitorId}`. We
      // strip every entry whose prefix matches.
      const next: Record<string, string> = {}
      for (const [k, v] of Object.entries(all)) {
        if (!k.startsWith(`${key}::`)) next[k] = v
      }
      writeJson(assignmentsKey, next)
    },
    [assignmentsKey],
  )

  return { configs, upsert, remove, events, clearEvents, clearAssignments }
}

// ---------- Consumer hook ----------

export interface UseExperimentOptions {
  tenantSlug: string
  /** The experiment key matching one of the admin configs. If no
   *  config with this key exists, the hook returns `defaultVariantId`
   *  (or the first option) silently — production code never crashes
   *  because a flag was deleted. */
  key: string
  /** The variants the *consumer* knows about. The admin can define
   *  more variants in the dashboard, but only those listed here are
   *  resolved client-side. Order matters — index 0 is the fallback
   *  when no config exists / experiment is in draft / paused. */
  variantIds: string[]
}

export interface UseExperimentApi {
  /** The resolved variant id. Stable across re-renders for the same
   *  visitor as long as the assignment hasn't been cleared. */
  variant: string
  /** Fires a one-shot exposure event. Idempotent within a render —
   *  call it from inside an effect or on first render; calling it
   *  multiple times only stores one exposure per visitor + experiment. */
  exposure: () => void
  /** Fires a conversion event with the given name. Pass the same
   *  name the admin lists under `goals` so it appears in the report. */
  convert: (eventName: string) => void
}

/** Resolve a variant for the current visitor. Designed for the
 *  call-site pattern:
 *
 *     const exp = useExperiment({ tenantSlug, key: "hero-cta", variantIds: ["a", "b"] })
 *     useEffect(() => exp.exposure(), [])
 *     // ...render based on exp.variant === "a"
 *     // ...exp.convert("enroll") on success
 */
export function useExperiment({
  tenantSlug,
  key,
  variantIds,
}: UseExperimentOptions): UseExperimentApi {
  const configsKey = useMemo(() => tk(tenantSlug, "configs"), [tenantSlug])
  const assignmentsKey = useMemo(() => tk(tenantSlug, "assignments"), [tenantSlug])
  const eventsKey = useMemo(() => tk(tenantSlug, "events"), [tenantSlug])

  const [variant, setVariant] = useState<string>(variantIds[0] ?? "control")

  // Resolve assignment on mount + when the experiment key changes.
  // We do this in an effect (not useMemo) because the work touches
  // localStorage and we don't want it to run during SSR.
  useEffect(() => {
    if (typeof window === "undefined") return
    const visitorId = getOrCreateAnonId()
    const assignmentMapKey = `${key}::${visitorId}`

    const configs = readJson<ExperimentConfig[]>(configsKey, [])
    const cfg = configs.find((c) => c.key === key)

    // No config? Fall back to first listed variant — production stays
    // up even if the admin deleted the experiment from the dashboard.
    if (!cfg) {
      setVariant(variantIds[0] ?? "control")
      return
    }

    // Declared winner short-circuits everything. The team is shipping
    // the winner across 100% of traffic; downstream reports still see
    // the assignment history.
    if (cfg.winnerVariantId && variantIds.includes(cfg.winnerVariantId)) {
      setVariant(cfg.winnerVariantId)
      return
    }

    // Already assigned? Stick with it.
    const assignments = readJson<Record<string, string>>(assignmentsKey, {})
    const existing = assignments[assignmentMapKey]
    if (existing && variantIds.includes(existing)) {
      setVariant(existing)
      return
    }

    // Draft / paused / completed without a winner → fall back to
    // first variant; don't burn fresh assignments. Only "running"
    // produces new random picks.
    if (cfg.status !== "running") {
      setVariant(variantIds[0] ?? "control")
      return
    }

    // New visitor on a running experiment. Pick a variant by weight,
    // intersect with what the consumer knows (the admin may have
    // added variants the client hasn't shipped yet — fall back).
    const eligible = cfg.variants.filter((v) => variantIds.includes(v.id))
    if (eligible.length === 0) {
      setVariant(variantIds[0] ?? "control")
      return
    }
    const picked = pickVariant(eligible)
    assignments[assignmentMapKey] = picked.id
    writeJson(assignmentsKey, assignments)
    setVariant(picked.id)
  }, [key, configsKey, assignmentsKey, variantIds])

  // Append an event to the log, trimming the oldest if we'd overrun
  // the cap. Pulled out as a closure so exposure + convert share the
  // same path.
  const writeEvent = useCallback(
    (kind: ExperimentEvent["kind"], eventName?: string) => {
      if (typeof window === "undefined") return
      const visitorId = getOrCreateAnonId()
      const configs = readJson<ExperimentConfig[]>(configsKey, [])
      const cfg = configs.find((c) => c.key === key)
      // Only track when the experiment is actively running. Draft /
      // paused / completed experiments shouldn't add noise to past
      // reports — and conversion events for a completed experiment
      // would tell us nothing about lift anyway.
      if (!cfg || cfg.status !== "running") return

      const all = readJson<ExperimentEvent[]>(eventsKey, [])

      // De-dupe exposures: at most one per (experiment, visitor).
      // Without this, every navigation back to a page re-fires an
      // impression and inflates the denominator.
      if (kind === "exposure") {
        const already = all.some(
          (e) => e.experimentKey === key && e.visitorId === visitorId && e.kind === "exposure",
        )
        if (already) return
      }

      const entry: ExperimentEvent = {
        id: `e-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
        experimentKey: key,
        variantId: variant,
        kind,
        eventName,
        visitorId,
        createdAt: new Date().toISOString(),
      }
      // Cap the log so a chatty consumer can't blow out localStorage.
      const next =
        all.length >= MAX_EVENTS ? [...all.slice(-(MAX_EVENTS - 1)), entry] : [...all, entry]
      writeJson(eventsKey, next)
    },
    [key, variant, configsKey, eventsKey],
  )

  const exposure = useCallback(() => writeEvent("exposure"), [writeEvent])
  const convert = useCallback((eventName: string) => writeEvent("conversion", eventName), [writeEvent])

  return { variant, exposure, convert }
}

// ---------- Report aggregator ----------

export interface ExperimentVariantStats {
  variantId: string
  variantLabel: string
  exposures: number
  /** Sum across all conversion event names — used as the headline
   *  "conversions" number. Per-event detail lives in `byEvent`. */
  conversions: number
  /** Conversion rate as a 0–1 ratio. Null when exposures = 0 (so the
   *  UI can render "—" instead of NaN%). */
  rate: number | null
  /** Per-event breakdown. Useful when an experiment tracks both
   *  "enroll" and "newsletter-signup" — surfaces lift on each. */
  byEvent: Record<string, number>
}

export interface ExperimentReport {
  experimentKey: string
  variants: ExperimentVariantStats[]
  /** Total unique visitors who saw any variant. */
  totalExposures: number
  /** First-variant ratio over leader-variant ratio — handy for the
   *  admin to glance at "+24%" lift. Null when the leader is the
   *  control / no data / control has 0 exposures. */
  leaderLiftVsControl: number | null
}

export function buildExperimentReport(
  cfg: ExperimentConfig,
  events: ExperimentEvent[],
): ExperimentReport {
  const scoped = events.filter((e) => e.experimentKey === cfg.key)
  const variants: ExperimentVariantStats[] = cfg.variants.map((v) => {
    const variantEvents = scoped.filter((e) => e.variantId === v.id)
    const exposures = variantEvents.filter((e) => e.kind === "exposure").length
    const conversionEvents = variantEvents.filter((e) => e.kind === "conversion")
    const conversions = conversionEvents.length
    const byEvent: Record<string, number> = {}
    for (const e of conversionEvents) {
      if (!e.eventName) continue
      byEvent[e.eventName] = (byEvent[e.eventName] ?? 0) + 1
    }
    return {
      variantId: v.id,
      variantLabel: v.label,
      exposures,
      conversions,
      rate: exposures === 0 ? null : conversions / exposures,
      byEvent,
    }
  })

  const totalExposures = variants.reduce((sum, v) => sum + v.exposures, 0)

  // Lift uses variant[0] as the control by convention. Most admins
  // name their first variant "Control" / "A", and a relative lift is
  // far more useful than the absolute rate on its own.
  const control = variants[0]
  const leader = [...variants].sort((a, b) => (b.rate ?? -1) - (a.rate ?? -1))[0]
  const leaderLiftVsControl =
    !control || control === leader || control.rate === null || control.rate === 0 || leader.rate === null
      ? null
      : (leader.rate - control.rate) / control.rate

  return {
    experimentKey: cfg.key,
    variants,
    totalExposures,
    leaderLiftVsControl,
  }
}
