"use client"

// One-shot "strikethrough draws across" effect for original-price
// reveals on the course detail enroll card. The strike line slides
// from width:0 to width:100% on first paint — visitors register the
// discount as a moment instead of a static muted number.
//
// Implementation: the text sits in a relative span; an absolute
// ::after-equivalent <span /> overlays a 2px line whose `width`
// animates via a one-frame deferred class swap (initial render at
// 0%, then useEffect bumps to 100% on next tick). The CSS
// `transition: width 700ms ease-out` does the rest. No
// requestAnimationFrame, no keyframes file — works on every page
// reload, respects `prefers-reduced-motion` via the `motion-safe:`
// utility so users opted out get the static strike immediately.

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

interface Props {
  children: React.ReactNode
  className?: string
  /** Delay before the line starts drawing, in ms. Default 250 so
   *  the price card renders first + the animation pulls the eye. */
  delayMs?: number
}

export function AnimatedStrike({ children, className, delayMs = 250 }: Props) {
  const [drawn, setDrawn] = useState(false)
  useEffect(() => {
    const t = window.setTimeout(() => setDrawn(true), delayMs)
    return () => window.clearTimeout(t)
  }, [delayMs])
  return (
    <span className={cn("relative inline-block whitespace-nowrap", className)}>
      <span>{children}</span>
      {/* Static line for users with reduced motion — appears
          immediately. `motion-safe` hides it; the animated overlay
          below takes over. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-1/2 h-[2px] -translate-y-1/2 bg-current motion-safe:hidden"
      />
      {/* Animated overlay — width transitions from 0 to 100% on
          mount. transform-origin keeps the line growing left-to-
          right so the eye tracks the reveal. */}
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute left-0 top-1/2 h-[2px] -translate-y-1/2 bg-current motion-reduce:hidden",
          "transition-[width] duration-700 ease-out",
          drawn ? "w-full" : "w-0",
        )}
      />
    </span>
  )
}
