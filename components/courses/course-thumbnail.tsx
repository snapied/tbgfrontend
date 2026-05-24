"use client"

// Smart course thumbnail — renders the instructor's uploaded image
// when present, otherwise paints a branded fallback derived from the
// course title.
//
// Why a fallback instead of `/placeholder.svg`:
//   • The generic grey placeholder makes a fresh catalog look broken
//     ("did the images fail to load?").
//   • Per-course gradients give each tile a unique identity so a row
//     of fallbacks reads as a curated lineup, not duplicates.
//   • The course's first initial in the centre keeps the tile useful
//     even without a real image — same visual idiom we already use
//     for community avatars.

import { useMemo } from "react"
import { BookOpen } from "lucide-react"

interface Props {
  title: string
  category?: string
  thumbnail?: string
  /** Tailwind aspect / sizing class applied to the wrapper. Defaults
   *  to a 4:3 ratio that matches both card layouts in /courses. */
  className?: string
  /** Hover-zoom effect on the real image — opt-in because the
   *  storefront card uses it but the bigger Pro card doesn't. */
  hoverZoom?: boolean
}

// FNV-1a-ish 32-bit hash. Stable across renders, sufficient for
// picking one of N gradient buckets.
function hashSeed(seed: string): number {
  let h = 2166136261 >>> 0
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = (h * 16777619) >>> 0
  }
  return h
}

const GRADIENTS = [
  "from-violet-500 via-purple-500 to-indigo-600",
  "from-rose-500 via-pink-500 to-fuchsia-600",
  "from-emerald-500 via-teal-500 to-cyan-600",
  "from-amber-500 via-orange-500 to-red-500",
  "from-sky-500 via-blue-500 to-indigo-600",
  "from-fuchsia-500 via-pink-500 to-rose-600",
  "from-lime-500 via-emerald-500 to-teal-600",
  "from-yellow-500 via-amber-500 to-orange-600",
]

function initialsOf(title: string): string {
  const tokens = title
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 0 && !/^(the|a|an|of|and|for|to|in|on)$/i.test(t))
  if (tokens.length === 0) return title.slice(0, 2).toUpperCase()
  if (tokens.length === 1) return tokens[0].slice(0, 2).toUpperCase()
  return (tokens[0][0] + tokens[tokens.length - 1][0]).toUpperCase()
}

export function CourseThumbnail({ title, category, thumbnail, className, hoverZoom }: Props) {
  // Pre-compute the gradient + initials so React isn't re-deriving
  // them every render on a long catalog list.
  const { gradient, initials } = useMemo(() => {
    const h = hashSeed(title + (category ?? ""))
    return {
      gradient: GRADIENTS[h % GRADIENTS.length],
      initials: initialsOf(title),
    }
  }, [title, category])

  if (thumbnail) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={thumbnail}
        alt={`Cover image for ${title}`}
        loading="lazy"
        decoding="async"
        className={`h-full w-full object-cover transition-transform duration-300 ${hoverZoom ? "group-hover:scale-[1.03]" : ""} ${className ?? ""}`}
      />
    )
  }

  // Branded fallback. Pure CSS — no network request, instant render.
  return (
    <div
      role="img"
      aria-label={`${title} cover placeholder`}
      className={`relative flex h-full w-full items-center justify-center overflow-hidden bg-gradient-to-br ${gradient} ${className ?? ""}`}
    >
      {/* Decorative noise — subtle dot grid + soft glow so the tile
          doesn't read as a flat block of colour. */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.4), transparent 40%), radial-gradient(circle at 80% 80%, rgba(0,0,0,0.18), transparent 50%)",
        }}
      />
      {/* Centre stamp */}
      <div className="relative flex flex-col items-center gap-2 text-white">
        <BookOpen className="h-6 w-6 opacity-80" aria-hidden />
        <span className="font-serif text-4xl font-bold tracking-tight drop-shadow-sm">
          {initials}
        </span>
        {category && (
          <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide backdrop-blur-sm">
            {category}
          </span>
        )}
      </div>
    </div>
  )
}
