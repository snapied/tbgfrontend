"use client"

import { Award, BookOpen, Heart, ShoppingBag, Sparkles, Trophy, UserPlus, Video } from "lucide-react"

/**
 * Animated brand visual for the homepage hero.
 *
 * Centred badge with two counter-rotating orbits of feature pills.
 * Pure CSS animation (transform + opacity) so it costs ~0 runtime and
 * works without JS. Pills represent real features we ship.
 */
export function HeroOrbit() {
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[520px]">
      {/* Concentric guide rings */}
      <RingsSvg />

      {/* Centre brand badge — same look as the navbar logo's mark */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative">
          {/* Pulsing aura */}
          <span className="absolute inset-0 -m-3 animate-ping rounded-3xl bg-primary/15" />
          <BadgeMark />
        </div>
      </div>

      {/* Inner orbit — clockwise */}
      <Orbit
        radiusPct={36}
        durationSec={28}
        startDeg={0}
        pills={INNER_PILLS}
        direction="cw"
      />

      {/* Outer orbit — counter-clockwise, smaller pills */}
      <Orbit
        radiusPct={47}
        durationSec={44}
        startDeg={28}
        pills={OUTER_PILLS}
        direction="ccw"
        size="sm"
      />

      {/* Floating sparkles */}
      <Sparkle className="absolute left-[8%] top-[18%]"  delay="0s"   />
      <Sparkle className="absolute right-[6%] top-[32%]" delay="1.5s" />
      <Sparkle className="absolute left-[22%] bottom-[14%]" delay="3s" />
      <Sparkle className="absolute right-[18%] bottom-[8%]" delay="4.5s" />
    </div>
  )
}

// ============================================================
// Orbit primitive
// ============================================================

interface Pill {
  label: string
  icon: React.ElementType
  accent: string  // tailwind text-* class
}

const INNER_PILLS: Pill[] = [
  { label: "Live classes",    icon: Video,       accent: "text-emerald-600" },
  { label: "Courses",         icon: BookOpen,    accent: "text-sky-600" },
  { label: "Storefront",      icon: ShoppingBag, accent: "text-amber-600" },
  { label: "Wall of Love",    icon: Heart,       accent: "text-rose-600" },
  { label: "Certificates",    icon: Award,       accent: "text-violet-600" },
]

const OUTER_PILLS: Pill[] = [
  { label: "Refer & Earn",  icon: UserPlus, accent: "text-emerald-600" },
  { label: "Leaderboard",   icon: Trophy,   accent: "text-amber-600" },
  { label: "Announcements", icon: Sparkles, accent: "text-sky-600" },
]

function Orbit({
  radiusPct,
  durationSec,
  startDeg,
  pills,
  direction,
  size = "md",
}: {
  radiusPct: number
  durationSec: number
  startDeg: number
  pills: Pill[]
  direction: "cw" | "ccw"
  size?: "sm" | "md"
}) {
  const n = pills.length
  // The outer wrapper rotates the whole ring. Each pill counter-rotates the
  // same amount so the text stays upright while the ring spins.
  const rotateClass = direction === "cw" ? "animate-[spin_var(--dur)_linear_infinite]" : "animate-[spin_var(--dur)_linear_infinite_reverse]"
  const counterRotateClass = direction === "cw" ? "animate-[spin_var(--dur)_linear_infinite_reverse]" : "animate-[spin_var(--dur)_linear_infinite]"

  return (
    <div
      className={`absolute inset-0 ${rotateClass}`}
      style={{ ["--dur" as string]: `${durationSec}s`, transform: `rotate(${startDeg}deg)` }}
    >
      {pills.map((p, i) => {
        const angle = (360 / n) * i
        return (
          <div
            key={p.label}
            className="absolute left-1/2 top-1/2"
            style={{
              transform: `rotate(${angle}deg) translate(0, -${radiusPct}%)`,
            }}
          >
            {/* Counter-rotate to keep text upright */}
            <div
              className={`-translate-x-1/2 -translate-y-1/2 ${counterRotateClass}`}
              style={{ ["--dur" as string]: `${durationSec}s` }}
            >
              {/* Pop-in micro animation on hover */}
              <PillCard pill={p} size={size} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

function PillCard({ pill, size }: { pill: Pill; size: "sm" | "md" }) {
  const Icon = pill.icon
  const isSm = size === "sm"
  return (
    <div
      className={`group inline-flex items-center gap-1.5 rounded-full border border-border bg-card shadow-sm backdrop-blur transition-transform hover:scale-110 ${
        isSm ? "px-2 py-1 text-[10px]" : "px-3 py-1.5 text-xs"
      }`}
    >
      <Icon className={`${isSm ? "h-3 w-3" : "h-3.5 w-3.5"} ${pill.accent}`} />
      <span className="font-semibold">{pill.label}</span>
    </div>
  )
}

// ============================================================
// Centre badge (SVG, matches the navbar logo mark)
// ============================================================

function BadgeMark() {
  return (
    <svg
      width={140}
      height={140}
      viewBox="0 0 64 64"
      className="drop-shadow-xl"
    >
      <defs>
        <linearGradient id="hero-badge-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%"   stopColor="#16553f" />
          <stop offset="100%" stopColor="#0a3024" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="64" height="64" rx="14" fill="url(#hero-badge-grad)" />
      <text
        x="32"
        y="49"
        textAnchor="middle"
        fontFamily='ui-sans-serif, system-ui, -apple-system, "Segoe UI", Helvetica, Arial, sans-serif'
        fontWeight={900}
        fontSize="46"
        fill="#fdf6e3"
        style={{ letterSpacing: "-0.04em" }}
      >
        b
      </text>
      <rect x="48" y="10" width="6" height="6" rx="1.5" fill="#d4af37">
        <animate attributeName="opacity" values="1;0.4;1" dur="2.4s" repeatCount="indefinite" />
      </rect>
    </svg>
  )
}

// ============================================================
// Background concentric rings
// ============================================================

function RingsSvg() {
  return (
    <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full text-primary/15">
      <circle cx="50" cy="50" r="48" fill="none" stroke="currentColor" strokeWidth="0.15" strokeDasharray="1 2" />
      <circle cx="50" cy="50" r="36" fill="none" stroke="currentColor" strokeWidth="0.2"  strokeDasharray="1 2" />
      <circle cx="50" cy="50" r="22" fill="none" stroke="currentColor" strokeWidth="0.25" strokeDasharray="0.5 1.5" />
    </svg>
  )
}

// ============================================================
// Sparkle dot
// ============================================================

function Sparkle({ className = "", delay = "0s" }: { className?: string; delay?: string }) {
  return (
    <span
      className={`pointer-events-none h-1.5 w-1.5 rounded-full bg-accent ${className}`}
      style={{
        animation: "pulse 2.4s ease-in-out infinite",
        animationDelay: delay,
      }}
    />
  )
}
