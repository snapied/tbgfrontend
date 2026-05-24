"use client"

// CompletionConfetti — one-shot celebratory confetti the first time
// a student lands on the course-complete state for an enrollment.
//
// Deliberately implemented with vanilla CSS instead of a confetti
// library: we want a tiny, never-loaded-twice payload that ships
// only when there's actually something to celebrate. No imperative
// canvas, no requestAnimationFrame loop — just N positioned divs
// with random keyframe animations.
//
// The "fired once per enrollment" guard lives in localStorage:
//
//   thebigclass.learn.completion.<enrollmentId>
//
// Once that key is set, the component renders null on subsequent
// visits. Instructors in preview-mode (enrollment id = "preview") get
// the celebration every time so they can see what students see;
// nothing is persisted for that synthetic enrollment.

import { useEffect, useState } from "react"

interface Props {
  /** The enrollment we're celebrating. "preview" disables the
   *  one-shot guard (teacher preview re-fires every visit). */
  enrollmentId: string
}

// Curated palette — saturated but not garish. Same vibe as the
// platform's primary/accent so the celebration reads "branded"
// rather than "stock template."
const COLORS = [
  "#f59e0b", // amber
  "#10b981", // emerald
  "#3b82f6", // blue
  "#ec4899", // pink
  "#a855f7", // purple
  "#facc15", // yellow
]

const CONFETTI_COUNT = 36

export function CompletionConfetti({ enrollmentId }: Props) {
  const [active, setActive] = useState(false)
  const isPreview = enrollmentId === "preview"

  useEffect(() => {
    if (typeof window === "undefined") return
    if (!isPreview) {
      const key = `thebigclass.learn.completion.${enrollmentId}`
      try {
        if (window.localStorage.getItem(key)) return
        window.localStorage.setItem(key, new Date().toISOString())
      } catch {
        // private mode — still fire; the worst that happens is
        // re-celebration next visit.
      }
    }
    setActive(true)
    // Auto-clean after the longest animation duration so the DOM
    // doesn't carry 36 absolutely-positioned divs forever.
    const t = window.setTimeout(() => setActive(false), 4500)
    return () => window.clearTimeout(t)
  }, [enrollmentId, isPreview])

  if (!active) return null

  return (
    <div
      // pointer-events-none so the confetti doesn't intercept clicks
      // on the celebration card it's draped over. aria-hidden because
      // the celebration is purely decorative — the screen-reader
      // experience comes from the surrounding "Course complete!" h2.
      aria-hidden
      className="pointer-events-none fixed inset-0 z-50 overflow-hidden"
    >
      {Array.from({ length: CONFETTI_COUNT }).map((_, i) => {
        const color = COLORS[i % COLORS.length]
        const leftPct = Math.random() * 100
        const delay = Math.random() * 1.2
        const duration = 3 + Math.random() * 1.5
        const drift = (Math.random() - 0.5) * 200
        const rotateEnd = Math.floor(Math.random() * 720) - 360
        const isSquare = i % 2 === 0
        return (
          <span
            key={i}
            style={{
              left: `${leftPct}%`,
              top: "-2rem",
              backgroundColor: color,
              animationDelay: `${delay}s`,
              animationDuration: `${duration}s`,
              // CSS custom properties drive each piece's drift + spin
              // so the keyframes stay shared.
              ["--confetti-drift" as string]: `${drift}px`,
              ["--confetti-rotate" as string]: `${rotateEnd}deg`,
              borderRadius: isSquare ? "2px" : "50%",
            }}
            className="confetti-piece absolute h-2 w-2"
          />
        )
      })}
      <style jsx>{`
        @keyframes confetti-fall {
          0% {
            transform: translate3d(0, 0, 0) rotate(0deg);
            opacity: 1;
          }
          80% {
            opacity: 1;
          }
          100% {
            transform: translate3d(var(--confetti-drift), 110vh, 0)
              rotate(var(--confetti-rotate));
            opacity: 0;
          }
        }
        .confetti-piece {
          animation-name: confetti-fall;
          animation-timing-function: cubic-bezier(0.25, 0.6, 0.35, 1);
          animation-fill-mode: forwards;
          will-change: transform, opacity;
        }
      `}</style>
    </div>
  )
}
