// Tour for /dashboard/experiments — the A/B testing admin.
//
// Built around the mental model the page sells: spin up a test,
// set it running, ship the winner. Each step targets a real element
// on the page by id/data-attr; falls back gracefully if the element
// hasn't mounted yet (e.g. when the list is empty).

import type { TourStep } from "@/components/tour/product-tour"

export const EXPERIMENTS_TOUR_ID = "experiments-v1"
export const EXPERIMENTS_TOUR: TourStep[] = [
  {
    title: "A/B experiments — test what actually converts",
    body:
      "Run two or three variants of the same surface (hero CTA copy, course price display, checkout button, anything). Each visitor sticks to the variant they first saw, so the lift table stays honest from day one.",
    emoji: "🧪",
    placement: "center",
  },
  {
    target: "#experiments-prebuilts",
    title: "Pre-built tests — wired into your portal",
    body:
      "These experiments are already plugged into real surfaces. Click 'Spin up' and we materialise the config with the right variant ids. You just set the traffic split and start.",
    emoji: "⚡",
    placement: "top",
  },
  {
    target: "#experiments-create-button",
    title: "Or build a custom test",
    body:
      "Need to test something the pre-builts don't cover? Create a custom experiment — name it, pick a key, define variants with weights, and wire it into any component via useExperiment(key).",
    emoji: "🛠",
    placement: "bottom",
  },
  {
    title: "Sticky assignments — the 'honest reports' bit",
    body:
      "Once a visitor sees variant A, they always see variant A — across pages, across days, across devices once they sign in. This is why the lift table can be trusted: no flip-flopping skews the numbers.",
    emoji: "📌",
    placement: "center",
  },
  {
    title: "Conversion goals + lift",
    body:
      "Each experiment has one or more goals — 'signup-clicked', 'paid-order', 'lesson-completed'. The card shows exposures, conversions, rate and lift per variant. When the green arrow on one variant is sustained, you've found a winner.",
    emoji: "📈",
    placement: "center",
  },
  {
    title: "Ship the winner — one click",
    body:
      "Click the trophy on the winning variant. We promote it to 100% traffic and freeze the experiment. The next visitor sees only the winner; the loser variant stops being served. Move on to the next test.",
    emoji: "🏆",
    placement: "center",
  },
  {
    title: "Need a hand?",
    body:
      "Every experiment card has 'Pause', 'Reroll assignments' and 'Delete' in its action row. The Help docs go deeper — search 'experiments' from /help anytime.",
    emoji: "💡",
    placement: "center",
  },
]
