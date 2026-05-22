"use client"

import { useId } from "react"
import { cn } from "@/lib/utils"

// The Big Class brand mark — "Badge".
//
// A single rounded-square emerald tile with a chunky chalk-coloured "B"
// knocked out and one gold dot in the top-right corner as a status spark.
// Reads as a real product mark (Notion's N, Vercel's ▲, Linear's L) and
// scales cleanly to the favicon. The wordmark drops the serif drama for
// a tight modern sans — "thebigclass" with a small gold square as the
// terminal (instead of a period dot) so the gold accent visually rhymes
// across the lockup.
//
// Variants
//   default       — full horizontal lockup (badge + wordmark)
//   white         — recoloured for dark backgrounds
//   dark          — alias of default (kept for back-compat)
//   icon          — badge only
//   stacked       — badge above wordmark, centred
//   stacked-white — stacked, on dark

interface LogoProps {
  variant?: "default" | "white" | "dark" | "icon" | "stacked" | "stacked-white"
  size?: "sm" | "md" | "lg" | "xl"
  className?: string
  /** Disable the subtle hover lift. */
  animated?: boolean
}

const sizes = {
  sm: { mark: 28, text: "text-base", big: "text-xl",    gap: "gap-2",   square: 4 },
  md: { mark: 36, text: "text-xl",   big: "text-2xl",   gap: "gap-2.5", square: 5 },
  lg: { mark: 52, text: "text-3xl",  big: "text-[2.5rem]", gap: "gap-3",   square: 7 },
  xl: { mark: 76, text: "text-5xl",  big: "text-7xl",   gap: "gap-4",   square: 10 },
}

export const BRAND = {
  primary: "#0a3024",
  primaryLift: "#16553f",
  accent: "#d4af37",
  chalk: "#fdf6e3",
} as const

// ------------------------- Badge (SVG) -------------------------

interface Palette {
  primary: string
  primaryLift: string
  accent: string
  chalk: string
}

function Mark({ size, palette }: { size: number; palette: Palette }) {
  // Scoped IDs so multiple marks on the same page don't share <defs>.
  const uid = useId().replace(/[:]/g, "")
  const gradId = `tbc-badge-${uid}`

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="The Big Class"
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%"   stopColor={palette.primaryLift} />
          <stop offset="100%" stopColor={palette.primary} />
        </linearGradient>
      </defs>

      {/* Tile */}
      <rect x="0" y="0" width="64" height="64" rx="14" fill={`url(#${gradId})`} />

      {/* Knocked-out "b" — rendered via SVG <text> with a generic heavy
          sans stack. textLength + lengthAdjust pins the optical size so
          the letter sits identically across systems/browsers. */}
      <text
        x="32"
        y="49"
        textAnchor="middle"
        fontFamily='ui-sans-serif, system-ui, -apple-system, "Segoe UI", Helvetica, Arial, sans-serif'
        fontWeight={900}
        fontSize="46"
        fill={palette.chalk}
        // Slight optical tightening — chunky letterform sits flush.
        style={{ letterSpacing: "-0.04em" }}
      >
        b
      </text>

      {/* Gold corner spark — the brand's single accent, sitting like a
          notification dot on the badge. */}
      <rect
        x="48"
        y="10"
        width="6"
        height="6"
        rx="1.5"
        fill={palette.accent}
      />
    </svg>
  )
}

// ------------------------- Wordmark -------------------------

function Wordmark({
  size,
  onDark,
  align = "start",
}: {
  size: keyof typeof sizes
  onDark: boolean
  align?: "start" | "center"
}) {
  const s = sizes[size]
  const wordColor = onDark ? "text-white" : "text-foreground"
  const softColor = onDark ? "text-white/70" : "text-foreground/60"

  return (
    <span
      className={cn(
        "inline-flex items-baseline leading-none",
        align === "center" ? "justify-center" : "",
      )}
    >
      {/* "the" — quieter, sets up the punch */}
      <span
        className={cn(
          "font-sans font-medium lowercase tracking-[-0.02em]",
          s.text,
          softColor,
        )}
      >
        the
      </span>
      {/* "big" — the brand's hero word. Heavier weight + larger size, set
          slightly tighter so it nests with the surrounding lowercase. */}
      <span
        className={cn(
          "font-sans font-black lowercase tracking-[-0.05em]",
          s.big,
          wordColor,
        )}
        style={{ marginLeft: "0.04em", marginRight: "0.04em" }}
      >
        big
      </span>
      {/* "class" — back to the quieter weight to bracket the hero */}
      <span
        className={cn(
          "font-sans font-medium lowercase tracking-[-0.02em]",
          s.text,
          softColor,
        )}
      >
        class
      </span>
      {/* The gold square terminator — rhymes with the badge's corner spark
          and replaces the old serif period. */}
      <span
        aria-hidden
        style={{
          width: s.square,
          height: s.square,
          marginLeft: Math.max(2, s.square * 0.5),
          marginBottom: 1,
          backgroundColor: BRAND.accent,
          borderRadius: 1,
          display: "inline-block",
        }}
      />
    </span>
  )
}

// ------------------------- Public API -------------------------

export function Logo({
  variant = "default",
  size = "md",
  className,
  animated = true,
}: LogoProps) {
  const s = sizes[size]
  const onDark = variant === "white" || variant === "stacked-white"
  const stacked = variant === "stacked" || variant === "stacked-white"
  const iconOnly = variant === "icon"

  const palette: Palette = {
    primary: BRAND.primary,
    primaryLift: BRAND.primaryLift,
    accent: BRAND.accent,
    chalk: BRAND.chalk,
  }

  const hoverFx = animated
    ? "transition-transform duration-200 ease-out group-hover:-translate-y-[1px]"
    : ""

  if (iconOnly) {
    return (
      <span className={cn("group inline-flex items-center justify-center", className)}>
        <span className={hoverFx}>
          <Mark size={s.mark} palette={palette} />
        </span>
      </span>
    )
  }

  return (
    <span
      className={cn(
        "group inline-flex",
        stacked ? `flex-col items-center ${s.gap}` : `items-center ${s.gap}`,
        className,
      )}
    >
      <span className={hoverFx}>
        <Mark size={s.mark} palette={palette} />
      </span>
      <Wordmark size={size} onDark={onDark} align={stacked ? "center" : "start"} />
    </span>
  )
}

// Mark-only export — used by certificate templates and tight surfaces.
export function LogoMark({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <span className={cn("inline-flex", className)}>
      <Mark
        size={size}
        palette={{
          primary: BRAND.primary,
          primaryLift: BRAND.primaryLift,
          accent: BRAND.accent,
          chalk: BRAND.chalk,
        }}
      />
    </span>
  )
}
