"use client"

// StarRatingInput — clickable 5-star rating control.
//
// Replaces the original Select dropdown (Item 18). Click a star to
// set the rating, hover to preview, click the active star again to
// clear. Keyboard: ←/→ move, Space/Enter commit. Always-visible
// numeric label for screen readers.

import { useState } from "react"
import { Star } from "lucide-react"
import { cn } from "@/lib/utils"

interface Props {
  value: number
  onChange: (rating: number) => void
  /** Render at a smaller scale (for inline previews). */
  size?: "sm" | "md"
  /** Label announced to screen readers. Defaults to "Rating". */
  ariaLabel?: string
}

export function StarRatingInput({
  value,
  onChange,
  size = "md",
  ariaLabel = "Rating",
}: Props) {
  const [hover, setHover] = useState<number | null>(null)
  const displayed = hover ?? value
  const cls = size === "sm" ? "h-4 w-4" : "h-6 w-6"

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="inline-flex items-center gap-1"
      onMouseLeave={() => setHover(null)}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") {
          e.preventDefault()
          onChange(Math.min(5, (value || 0) + 1))
        } else if (e.key === "ArrowLeft") {
          e.preventDefault()
          onChange(Math.max(0, (value || 0) - 1))
        }
      }}
      tabIndex={0}
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          role="radio"
          aria-checked={star <= value}
          aria-label={`${star} star${star === 1 ? "" : "s"}`}
          onMouseEnter={() => setHover(star)}
          onClick={() => onChange(value === star ? 0 : star)}
          className={cn(
            "rounded transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
          )}
        >
          <Star
            className={cn(
              cls,
              star <= displayed
                ? "fill-amber-400 text-amber-500"
                : "text-muted-foreground/40",
            )}
          />
        </button>
      ))}
      <span className="ml-1.5 text-xs text-muted-foreground tabular-nums">
        {value > 0 ? `${value}/5` : "—"}
      </span>
    </div>
  )
}
