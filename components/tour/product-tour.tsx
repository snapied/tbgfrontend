"use client"

// Lightweight Shepherd-style product tour. Drop a <ProductTour
// tourId="..." steps={[...]}> onto any page; the first time a user
// hits that page we show a "Want a quick tour?" pill that opens an
// overlay highlighting each step's target element in sequence.
//
// Pair with the exported <TakeATourButton tourId="..."> to give
// every module an explicit "Take a tour" trigger — the first-visit
// prompt only fires once per user, so the button is how the teacher
// re-runs the tour later.
//
// Why home-grown: Shepherd.js is ~30 KB and ships its own theme
// engine that conflicts with shadcn's. This owns its look, has no
// external CSS to fight.
//
// Steps target by CSS selector (`#some-id` or `[data-tour=...]`).
// When the target isn't on the page (e.g. behind a tab) the step
// falls back to a centered "no element" card so the tour doesn't
// stall.

import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { ArrowLeft, ArrowRight, Check, HelpCircle, Sparkles, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

// Module-scope event bus so a "Take a tour" button anywhere on the
// page can start the tour mounted by ProductTour. Cheap pub/sub: a
// ProductTour subscribes by id, the button dispatches by id. Avoids
// threading refs through the React tree.
const TOUR_BUS = typeof window !== "undefined" ? new EventTarget() : null
const startEventName = (id: string) => `tour:start:${id}`

export interface TourStep {
  // CSS selector for the element to highlight. Pass null/undefined
  // for a centered "intro" or "outro" card.
  target?: string
  title: string
  body: string
  // Optional image / emoji to make the step memorable.
  imageUrl?: string
  emoji?: string
  // Override the default "below the element" placement.
  placement?: "top" | "bottom" | "left" | "right" | "center"
  // Optional CSS selector to click BEFORE we measure the target. Used
  // to flip the relevant tab open on a tabbed page (TabsTrigger) so
  // the actual `target` is in the DOM by the time we try to measure
  // and highlight it. Quietly skipped when the trigger isn't found.
  beforeShow?: string
}

interface Props {
  // Stable id used to remember whether this tour has been shown for
  // this user. Stored in localStorage under `thebigclass.tour.<id>`.
  tourId: string
  // Friendly title shown on the prompt pill.
  promptLabel?: string
  steps: TourStep[]
  // When true the tour opens immediately on mount (no prompt). Used
  // for forced first-run tours.
  autoStart?: boolean
}

const SEEN_KEY = "thebigclass.tour.seen.v1"

export function ProductTour({
  tourId,
  promptLabel = "Show me around",
  steps,
  autoStart = false,
}: Props) {
  const [showPrompt, setShowPrompt] = useState(false)
  const [active, setActive] = useState(autoStart)
  const [index, setIndex] = useState(0)

  // Decide on mount whether to show the prompt — only if the user
  // hasn't already completed this tour. The localStorage record
  // survives logout/login so the prompt doesn't badger the same
  // teacher every time they sign in from a new browser session.
  useEffect(() => {
    if (autoStart) return
    try {
      const raw = window.localStorage.getItem(SEEN_KEY)
      const seen = raw ? (JSON.parse(raw) as Record<string, string>) : {}
      if (!seen[tourId]) setShowPrompt(true)
    } catch {
      setShowPrompt(true)
    }
  }, [tourId, autoStart])

  // Listen for an explicit "start this tour" event from a
  // <TakeATourButton tourId="..."> anywhere on the page.
  useEffect(() => {
    if (!TOUR_BUS) return
    const handler = () => {
      setActive(true)
      setIndex(0)
      setShowPrompt(false)
    }
    TOUR_BUS.addEventListener(startEventName(tourId), handler)
    return () => TOUR_BUS.removeEventListener(startEventName(tourId), handler)
  }, [tourId])

  const markSeen = () => {
    try {
      const raw = window.localStorage.getItem(SEEN_KEY)
      const seen = raw ? (JSON.parse(raw) as Record<string, string>) : {}
      seen[tourId] = new Date().toISOString()
      window.localStorage.setItem(SEEN_KEY, JSON.stringify(seen))
    } catch {
      /* fine */
    }
  }

  const start = () => {
    setActive(true)
    setIndex(0)
    setShowPrompt(false)
  }
  const finish = () => {
    setActive(false)
    setShowPrompt(false)
    markSeen()
  }
  const next = () => {
    if (index + 1 >= steps.length) finish()
    else setIndex((i) => i + 1)
  }
  const prev = () => {
    if (index > 0) setIndex((i) => i - 1)
  }

  if (!active && !showPrompt) return null
  if (!active && showPrompt) {
    return (
      <div className="fixed bottom-6 right-6 z-40">
        <div className="flex items-center gap-2 rounded-full border border-primary/30 bg-card px-3 py-2 shadow-lg">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">{promptLabel}</span>
          <Button size="sm" onClick={start}>Start</Button>
          <button
            type="button"
            onClick={() => {
              setShowPrompt(false)
              markSeen()
            }}
            className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Dismiss tour prompt"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    )
  }

  const step = steps[index]
  return (
    <TourOverlay
      step={step}
      index={index}
      total={steps.length}
      onNext={next}
      onPrev={prev}
      onClose={finish}
    />
  )
}

// ============================================================
// Overlay — spotlight + card
// ============================================================

function TourOverlay({
  step,
  index,
  total,
  onNext,
  onPrev,
  onClose,
}: {
  step: TourStep
  index: number
  total: number
  onNext: () => void
  onPrev: () => void
  onClose: () => void
}) {
  // Resolve the target element each render — it might mount lazily
  // (e.g. after a tab switch). If we can't find it after a brief
  // wait, fall back to the centered placement.
  // Open the right tab / drawer / dialog FIRST, then measure the
  // target. Without this the targeted element wouldn't be in the DOM
  // when we tried to highlight it on a tab-paginated page.
  useEffect(() => {
    if (!step.beforeShow) return
    const trigger = document.querySelector<HTMLElement>(step.beforeShow)
    trigger?.click()
  }, [step.beforeShow])
  const rect = useTargetRect(step.target)

  // Position the card next to the target (default: below). When the
  // target is missing or the step explicitly asks for "center", we
  // anchor the card to the viewport center.
  const preferred = step.placement ?? (rect ? "bottom" : "center")

  // Compute the card's actual position after it has rendered, so we
  // can use real measured dimensions and:
  //   (a) auto-flip to the opposite side when the preferred placement
  //       would overflow the viewport (e.g. target near right edge with
  //       placement="right" → flip to "left"),
  //   (b) clamp the final top-left so the card never crosses the
  //       viewport edges minus a safe pad.
  // This is what fixes the "tour card hides behind the viewport" bug —
  // before, we just trusted CSS translate() and any overflow was the
  // user's problem.
  const cardRef = useRef<HTMLDivElement | null>(null)
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null)
  const [resolvedPlacement, setResolvedPlacement] = useState(preferred)

  useLayoutEffect(() => {
    const el = cardRef.current
    if (!el) return
    const cardW = el.offsetWidth || 360
    const cardH = el.offsetHeight || 200
    const vw = window.innerWidth
    const vh = window.innerHeight
    const pad = 12 // safe distance from viewport edge
    const gap = 12 // distance from target to card

    if (!rect || preferred === "center") {
      setResolvedPlacement("center")
      setPos({
        left: Math.max(pad, (vw - cardW) / 2),
        top: Math.max(pad, (vh - cardH) / 2),
      })
      return
    }

    // Helper: compute a candidate top-left for a given placement.
    const candidate = (p: "top" | "bottom" | "left" | "right") => {
      switch (p) {
        case "top":
          return {
            left: rect.left + rect.width / 2 - cardW / 2,
            top: rect.top - gap - cardH,
          }
        case "bottom":
          return {
            left: rect.left + rect.width / 2 - cardW / 2,
            top: rect.bottom + gap,
          }
        case "left":
          return {
            left: rect.left - gap - cardW,
            top: rect.top + rect.height / 2 - cardH / 2,
          }
        case "right":
          return {
            left: rect.right + gap,
            top: rect.top + rect.height / 2 - cardH / 2,
          }
      }
    }

    // Does this candidate fit horizontally and vertically (with pad)?
    const fits = (c: { left: number; top: number }) =>
      c.left >= pad &&
      c.left + cardW <= vw - pad &&
      c.top >= pad &&
      c.top + cardH <= vh - pad

    // Try preferred first, then the opposite side, then the other two.
    const opposite: Record<"top" | "bottom" | "left" | "right" | "center", "top" | "bottom" | "left" | "right" | "center"> = {
      top: "bottom",
      bottom: "top",
      left: "right",
      right: "left",
      center: "center",
    }
    const order: Array<"top" | "bottom" | "left" | "right"> = [
      preferred as "top" | "bottom" | "left" | "right",
      opposite[preferred] as "top" | "bottom" | "left" | "right",
      "bottom",
      "top",
      "right",
      "left",
    ].filter((p, i, arr) => arr.indexOf(p) === i) as Array<"top" | "bottom" | "left" | "right">

    let chosen: "top" | "bottom" | "left" | "right" = preferred as "top" | "bottom" | "left" | "right"
    let pick = candidate(chosen)
    for (const p of order) {
      const c = candidate(p)
      if (fits(c)) {
        chosen = p
        pick = c
        break
      }
    }

    // Clamp into viewport regardless — handles the case where the card
    // is too big to fit on any side and we fall through with the
    // preferred placement.
    pick.left = Math.max(pad, Math.min(pick.left, vw - cardW - pad))
    pick.top = Math.max(pad, Math.min(pick.top, vh - cardH - pad))
    setResolvedPlacement(chosen)
    setPos(pick)
  }, [rect, preferred, step.target, index, total])

  // While we're measuring, hide the card off-screen but mounted so
  // the layout effect can read its dimensions. After measurement,
  // setState triggers a re-render with the real position.
  const cardStyle: React.CSSProperties = pos
    ? { left: pos.left, top: pos.top }
    : { left: -9999, top: -9999, visibility: "hidden" }

  // Spotlight = a 4-rect overlay around the target so the target
  // stays visible + interactive. When there's no target we just dim
  // the whole viewport. Use the user's preferred placement to decide
  // (not the resolved one) so a flip from "right"→"left" still shows
  // the spotlight rather than dimming everything.
  return (
    <>
      {rect && preferred !== "center" ? (
        <SpotlightCutouts rect={rect} onClick={onClose} />
      ) : (
        <div
          className="fixed inset-0 z-50 bg-black/60"
          onClick={onClose}
        />
      )}

      <div
        ref={cardRef}
        className="fixed z-[60] w-[min(420px,calc(100vw-2rem))] rounded-xl border border-border bg-card shadow-2xl"
        style={cardStyle}
        data-placement={resolvedPlacement}
      >
        <div className="flex items-start justify-between gap-3 border-b border-border p-4">
          <div className="flex items-center gap-2">
            {step.emoji && <span className="text-xl">{step.emoji}</span>}
            <h3 className="font-serif text-lg font-bold tracking-tight">{step.title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Close tour"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {step.imageUrl && (
          <img
            src={step.imageUrl}
            alt=""
            className="block w-full border-b border-border object-cover"
            style={{ maxHeight: 180 }}
          />
        )}
        <div className="p-4">
          <p className="text-sm text-foreground/90">{step.body}</p>
        </div>
        <div className="flex items-center justify-between gap-2 border-t border-border p-3">
          <span className="text-[11px] text-muted-foreground">
            Step {index + 1} of {total}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onPrev}
              disabled={index === 0}
            >
              <ArrowLeft className="mr-1 h-3.5 w-3.5" /> Back
            </Button>
            <Button size="sm" onClick={onNext}>
              {index + 1 === total ? (
                <>
                  <Check className="mr-1 h-3.5 w-3.5" /> Done
                </>
              ) : (
                <>
                  Next <ArrowRight className="ml-1 h-3.5 w-3.5" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}

// ============================================================
// Spotlight — four divs that black out everything except the
// rectangle around the target. Cheap, no canvas, no SVG mask.
// ============================================================

function SpotlightCutouts({ rect, onClick }: { rect: DOMRect; onClick: () => void }) {
  const pad = 6
  const t = Math.max(0, rect.top - pad)
  const l = Math.max(0, rect.left - pad)
  const r = Math.min(window.innerWidth, rect.right + pad)
  const b = Math.min(window.innerHeight, rect.bottom + pad)
  const base = "fixed z-50 bg-black/55"
  return (
    <>
      <div className={cn(base)} style={{ top: 0, left: 0, right: 0, height: t }} onClick={onClick} />
      <div className={cn(base)} style={{ top: t, left: 0, width: l, height: b - t }} onClick={onClick} />
      <div className={cn(base)} style={{ top: t, left: r, right: 0, height: b - t }} onClick={onClick} />
      <div className={cn(base)} style={{ top: b, left: 0, right: 0, bottom: 0 }} onClick={onClick} />
      <div
        className="fixed z-50 rounded-md ring-4 ring-primary/70 ring-offset-2 ring-offset-transparent pointer-events-none"
        style={{ top: t, left: l, width: r - l, height: b - t }}
      />
    </>
  )
}

// Explicit "Take a tour" trigger — dispatches an event the ProductTour
// for the matching id picks up. Use this anywhere on the page so the
// teacher can re-run the tour after the first-visit prompt is gone.
export function TakeATourButton({
  tourId,
  label = "Take a tour",
  variant = "outline",
  size = "sm",
  className,
}: {
  tourId: string
  label?: string
  variant?: "outline" | "ghost" | "default" | "secondary"
  size?: "sm" | "default"
  className?: string
}) {
  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={className}
      onClick={() => TOUR_BUS?.dispatchEvent(new Event(startEventName(tourId)))}
    >
      <HelpCircle className="mr-1.5 h-4 w-4" />
      {label}
    </Button>
  )
}

// Hook that resolves a CSS selector to a DOMRect, retrying briefly
// in case the element mounts after the tour opens (tab switch, etc).
function useTargetRect(selector?: string): DOMRect | null {
  const [rect, setRect] = useState<DOMRect | null>(null)
  useEffect(() => {
    if (!selector) {
      setRect(null)
      return
    }
    let cancelled = false
    let tries = 0
    const tick = () => {
      if (cancelled) return
      const el = document.querySelector<HTMLElement>(selector)
      if (el) {
        // Scroll into view politely first so the spotlight lands on
        // something visible.
        el.scrollIntoView({ behavior: "smooth", block: "center" })
        // Wait one frame so the scroll completes before we measure.
        requestAnimationFrame(() => {
          if (!cancelled) setRect(el.getBoundingClientRect())
        })
        return
      }
      if (tries++ < 10) {
        setTimeout(tick, 100)
      } else {
        setRect(null)
      }
    }
    tick()

    const onResize = () => {
      const el = document.querySelector<HTMLElement>(selector)
      if (el) setRect(el.getBoundingClientRect())
    }
    window.addEventListener("resize", onResize)
    window.addEventListener("scroll", onResize, true)
    return () => {
      cancelled = true
      window.removeEventListener("resize", onResize)
      window.removeEventListener("scroll", onResize, true)
    }
  }, [selector])
  return rect
}
