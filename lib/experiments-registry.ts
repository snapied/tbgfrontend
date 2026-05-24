// Pre-built experiment registry — single source of truth for the
// experiments that the platform's code already knows how to render.
//
// Why a separate file from lib/experiments.ts:
//   • lib/experiments.ts is the *engine* — assignment, sticky
//     visitor id, exposure/conversion log, report. It's
//     intentionally key-agnostic so any new experiment can be added
//     by spinning up a config in the admin.
//   • This file is the *catalog* — the experiments the product team
//     has already wired surfaces for. When a teacher opens the
//     admin we surface this list as "Pre-built" cards so they can
//     spin up a tested experiment in one click instead of guessing
//     the key + variant ids.
//
// Adding a new pre-built experiment is a two-step contract:
//   1. Add an entry here with key + variantIds + goals + which
//      surface in the app consumes it.
//   2. Wire `useExperiment({ key, variantIds })` in that surface
//      (already done for the two below).
// Forgetting step 1 silently works but the admin won't surface it
// as a quick-create card. Forgetting step 2 silently works but the
// experiment will just always resolve to control because no
// consumer is listening.

import type { ExperimentConfig, ExperimentVariant } from "@/lib/experiments"

export interface PrebuiltExperiment {
  /** Stable key the consumer code passes to useExperiment. */
  key: string
  /** Display name shown on the admin "spin up" card. */
  name: string
  /** One-line elevator pitch — what's being tested. */
  description: string
  /** Human-readable description of where this experiment runs.
   *  Surfaces in the admin "Running on:" indicator. */
  surface: string
  /** Variants the consumer code knows about. The admin's "spin up"
   *  creates the experiment with these variants pre-filled so the
   *  teacher only picks weights + status. Adding admin-side
   *  variants beyond this list silently no-ops — the consumer
   *  doesn't know how to render them. */
  variants: ExperimentVariant[]
  /** Conversion event names the consumer code fires. These get
   *  pre-filled into the experiment config's `goals` field so the
   *  report's per-event breakdown is meaningful. */
  goals: string[]
  /** Emoji for the catalog card. Pure cosmetic. */
  emoji: string
}

export const PREBUILT_EXPERIMENTS: PrebuiltExperiment[] = [
  {
    key: "hero-cta-copy",
    name: "Hero CTA copy",
    description:
      "Test three framings of your home-page hero button: editor-defined, urgent, or aspirational.",
    surface: "Public portal · Home page hero",
    emoji: "✨",
    variants: [
      { id: "control", label: "Editor copy (your text)", weight: 1 },
      { id: "urgent", label: "Urgent — 'Start free today'", weight: 1 },
      { id: "aspirational", label: "Aspirational — 'Begin your journey'", weight: 1 },
    ],
    goals: ["hero-cta-click"],
  },
  {
    key: "course-price-display",
    name: "Course price display",
    description:
      "Test three layouts of the price chip on course detail pages: current, anchor-with-strikethrough-first, or 'Save $X' loss-aversion chip.",
    surface: "Public portal · Course detail enroll rail",
    emoji: "💰",
    variants: [
      { id: "control", label: "Current — price, strikethrough, % off", weight: 1 },
      { id: "anchor", label: "Anchor — strikethrough first, price below", weight: 1 },
      { id: "savings", label: "Savings — 'Save $X' chip + price", weight: 1 },
    ],
    goals: ["enroll"],
  },
]

/** Resolve a config key back to its pre-built definition, if any.
 *  Returns null when the key was created manually (not pre-built),
 *  so the admin can render that experiment without a surface tag. */
export function prebuiltFor(key: string): PrebuiltExperiment | null {
  return PREBUILT_EXPERIMENTS.find((p) => p.key === key) ?? null
}

/** Materialise a pre-built into a full ExperimentConfig the admin
 *  can persist. Defaults to "draft" status so the teacher reviews
 *  the variants + traffic split before sending real traffic. */
export function materialisePrebuilt(prebuilt: PrebuiltExperiment): ExperimentConfig {
  const now = new Date().toISOString()
  return {
    key: prebuilt.key,
    name: prebuilt.name,
    description: prebuilt.description,
    status: "draft",
    variants: prebuilt.variants,
    goals: prebuilt.goals,
    createdAt: now,
    updatedAt: now,
  }
}
