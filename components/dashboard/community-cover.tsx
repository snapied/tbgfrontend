"use client"

// Decorative SVG covers for community cards.
//
// Five hand-rolled illustrations, each tuned to a specific
// classroom/professional theme — books, atoms, code, charts,
// laurel-wreath alumni. The cover layered on top of the gradient
// hero band gives every community a unique visual identity without
// needing per-tenant uploaded art.
//
// Pick is deterministic: a stable hash of the community id + name
// selects an illustration, so the same community always shows the
// same cover across renders / sessions / users.

import { useMemo } from "react"

interface Props {
  /** Stable id used to deterministically pick which illustration to render. */
  seed: string
  /** Tint of the decorative artwork — derived from the community's identity colour. */
  color: string
  className?: string
}

// FNV-1a-ish 32-bit hash. Small, deterministic, plenty for picking
// one of 5 buckets — we don't need crypto strength here, just
// stability across renders. crypto.subtle would require async; for a
// 5-way bucket pick it's overkill.
function hashSeed(seed: string): number {
  let h = 2166136261 >>> 0
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = (h * 16777619) >>> 0
  }
  return h
}

// Convert the community's brand hex into a translucent overlay colour
// — keeps the illustration in the same hue family as the avatar puck.
function alpha(hex: string, a: number): string {
  if (!/^#?[0-9a-fA-F]{6}$/.test(hex)) hex = "#0a3024"
  const h = hex.replace(/^#/, "")
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r},${g},${b},${a})`
}

type Illustration = (color: string) => React.ReactNode

// 1. Books — stacked spines for academic / reading communities
const BooksCover: Illustration = (color) => (
  <svg viewBox="0 0 400 160" className="h-full w-full" preserveAspectRatio="xMidYMid slice" aria-hidden>
    <defs>
      <linearGradient id="cv-books-shine" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%" stopColor="rgba(255,255,255,0.35)" />
        <stop offset="100%" stopColor="rgba(255,255,255,0)" />
      </linearGradient>
    </defs>
    {/* Floor */}
    <rect x="0" y="130" width="400" height="30" fill={alpha(color, 0.15)} />
    {/* Stacks */}
    {[
      { x: 60,  w: 90, h: 18, c: alpha("#ffffff", 0.85) },
      { x: 60,  w: 90, h: 18, c: alpha(color, 0.55), y: 112 },
      { x: 50,  w: 110, h: 20, c: alpha("#ffffff", 0.7), y: 92 },
      { x: 70,  w: 80, h: 16, c: alpha(color, 0.7), y: 76 },
    ].map((s, i) => (
      <rect key={`s-${i}`} x={s.x} y={s.y ?? 130 - s.h} width={s.w} height={s.h} rx="2" fill={s.c} />
    ))}
    {/* Tall standing book */}
    <rect x="180" y="58" width="22" height="72" rx="2" fill={alpha("#ffffff", 0.9)} />
    <rect x="180" y="58" width="22" height="8" fill={alpha(color, 0.7)} />
    <rect x="210" y="48" width="22" height="82" rx="2" fill={alpha(color, 0.85)} />
    <rect x="210" y="48" width="22" height="10" fill={alpha("#ffffff", 0.7)} />
    <rect x="240" y="68" width="22" height="62" rx="2" fill={alpha("#ffffff", 0.85)} />
    <rect x="240" y="68" width="22" height="8" fill={alpha(color, 0.6)} />
    {/* Apple */}
    <circle cx="290" cy="120" r="10" fill="#dc2626" />
    <rect x="289" y="106" width="2" height="6" fill="#15803d" />
    {/* Sparkles */}
    <circle cx="340" cy="40" r="2" fill="rgba(255,255,255,0.9)" />
    <circle cx="360" cy="70" r="1.5" fill="rgba(255,255,255,0.7)" />
    <circle cx="40" cy="40" r="2" fill="rgba(255,255,255,0.7)" />
    {/* Top shine */}
    <rect x="0" y="0" width="400" height="60" fill="url(#cv-books-shine)" />
  </svg>
)

// 2. Atom — orbiting electrons for STEM / science communities
const AtomCover: Illustration = (color) => (
  <svg viewBox="0 0 400 160" className="h-full w-full" preserveAspectRatio="xMidYMid slice" aria-hidden>
    {/* Background sparkles */}
    {Array.from({ length: 12 }).map((_, i) => {
      const x = (i * 73) % 400
      const y = (i * 41) % 160
      const r = 1 + (i % 2)
      return <circle key={i} cx={x} cy={y} r={r} fill="rgba(255,255,255,0.6)" />
    })}
    {/* Three orbits, rotated */}
    <g transform="translate(200 80)">
      <ellipse cx="0" cy="0" rx="120" ry="36" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="2" />
      <ellipse cx="0" cy="0" rx="120" ry="36" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="2" transform="rotate(60)" />
      <ellipse cx="0" cy="0" rx="120" ry="36" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="2" transform="rotate(-60)" />
      {/* Electrons */}
      <circle cx="120" cy="0" r="6" fill={alpha("#ffffff", 0.95)} />
      <circle cx="-60" cy="-31" r="5" fill={alpha(color, 0.95)} />
      <circle cx="-60" cy="31" r="5" fill={alpha(color, 0.85)} />
      {/* Nucleus */}
      <circle cx="0" cy="0" r="14" fill="#0f172a" />
      <circle cx="-4" cy="-4" r="4" fill={alpha(color, 0.9)} />
    </g>
  </svg>
)

// 3. Code — terminal lines for engineering / coding communities
const CodeCover: Illustration = (color) => (
  <svg viewBox="0 0 400 160" className="h-full w-full" preserveAspectRatio="xMidYMid slice" aria-hidden>
    {/* Window chrome */}
    <rect x="50" y="30" width="300" height="110" rx="8" fill="rgba(15,23,42,0.92)" />
    <circle cx="65" cy="44" r="3.5" fill="#ef4444" />
    <circle cx="76" cy="44" r="3.5" fill="#f59e0b" />
    <circle cx="87" cy="44" r="3.5" fill="#22c55e" />
    {/* Code lines */}
    {[
      { y: 65, segs: [["#94a3b8", 18], [alpha(color, 0.95), 60], ["#94a3b8", 14], [alpha("#fde68a", 0.9), 78] ] },
      { y: 80, segs: [["#94a3b8", 26], [alpha("#a7f3d0", 0.9), 90], ["#94a3b8", 20]] },
      { y: 95, segs: [["#94a3b8", 12], [alpha(color, 0.7), 50], ["#94a3b8", 16], [alpha("#fde68a", 0.7), 60]] },
      { y: 110, segs: [["#94a3b8", 36], [alpha("#fca5a5", 0.85), 70]] },
      { y: 125, segs: [["#22c55e", 8], ["#94a3b8", 130]] },
    ].map((row, i) => {
      let cursor = 68
      return (
        <g key={i}>
          {row.segs.map(([fill, w], j) => {
            const x = cursor
            cursor += (w as number) + 4
            return <rect key={j} x={x} y={row.y - 4} width={w as number} height={6} rx="1.5" fill={fill as string} />
          })}
        </g>
      )
    })}
    {/* Blinking cursor */}
    <rect x="68" y="121" width="6" height="8" fill={alpha(color, 0.9)} />
  </svg>
)

// 4. Chart — bar + trend line for management / analytics communities
const ChartCover: Illustration = (color) => (
  <svg viewBox="0 0 400 160" className="h-full w-full" preserveAspectRatio="xMidYMid slice" aria-hidden>
    {/* Axis */}
    <line x1="60" y1="130" x2="350" y2="130" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" />
    <line x1="60" y1="130" x2="60" y2="40" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" />
    {/* Bars */}
    {[
      { x: 80,  h: 30, c: alpha("#ffffff", 0.6) },
      { x: 120, h: 50, c: alpha("#ffffff", 0.7) },
      { x: 160, h: 42, c: alpha(color, 0.7) },
      { x: 200, h: 70, c: alpha(color, 0.85) },
      { x: 240, h: 58, c: alpha("#ffffff", 0.8) },
      { x: 280, h: 80, c: alpha(color, 0.95) },
      { x: 320, h: 64, c: alpha("#ffffff", 0.85) },
    ].map((b, i) => (
      <rect key={i} x={b.x} y={130 - b.h} width="22" height={b.h} rx="3" fill={b.c} />
    ))}
    {/* Trend line */}
    <polyline
      points="80,100 120,80 160,90 200,55 240,68 280,40 320,55"
      fill="none"
      stroke={alpha("#fbbf24", 1)}
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {[ [80,100],[120,80],[160,90],[200,55],[240,68],[280,40],[320,55] ].map(([x,y], i) => (
      <circle key={i} cx={x} cy={y} r="3" fill="#fbbf24" />
    ))}
  </svg>
)

// 5. Laurel + cap — alumni / graduation / cohort communities
const LaurelCover: Illustration = (color) => (
  <svg viewBox="0 0 400 160" className="h-full w-full" preserveAspectRatio="xMidYMid slice" aria-hidden>
    {/* Confetti */}
    {[
      { x: 60, y: 30, fill: "#fbbf24" },
      { x: 90, y: 60, fill: "#a7f3d0" },
      { x: 320, y: 35, fill: "#fbcfe8" },
      { x: 340, y: 90, fill: "#fde68a" },
      { x: 30, y: 100, fill: "#bae6fd" },
      { x: 360, y: 130, fill: "#fecaca" },
    ].map((c, i) => (
      <rect key={i} x={c.x} y={c.y} width="6" height="6" rx="1" fill={c.fill} transform={`rotate(${(i * 47) % 360} ${c.x + 3} ${c.y + 3})`} />
    ))}
    {/* Mortarboard */}
    <g transform="translate(200 80)">
      {/* Cap top */}
      <polygon points="-70,-10 0,-30 70,-10 0,10" fill="#0f172a" />
      <polygon points="-70,-10 0,-30 70,-10 0,10" fill={alpha(color, 0.3)} />
      {/* Cap base */}
      <rect x="-30" y="-6" width="60" height="22" rx="3" fill="#0f172a" />
      <rect x="-30" y="-6" width="60" height="6" fill={alpha(color, 0.5)} />
      {/* Tassel */}
      <line x1="0" y1="-30" x2="36" y2="-12" stroke="#fbbf24" strokeWidth="2" />
      <circle cx="38" cy="-10" r="4" fill="#fbbf24" />
      <rect x="36" y="-8" width="4" height="14" fill="#fbbf24" />
      {/* Star above */}
      <polygon points="0,-50 4,-42 12,-42 6,-37 8,-29 0,-34 -8,-29 -6,-37 -12,-42 -4,-42" fill="#fde68a" />
    </g>
    {/* Laurel branches */}
    <g transform="translate(40 90)" stroke={alpha("#ffffff", 0.85)} strokeWidth="2" fill="none">
      <path d="M0,40 Q20,20 30,-10" />
      {[0, 1, 2, 3].map((i) => (
        <ellipse key={i} cx={5 + i * 7} cy={30 - i * 10} rx="6" ry="3" transform={`rotate(${30 + i * 10} ${5 + i * 7} ${30 - i * 10})`} fill={alpha("#ffffff", 0.7)} />
      ))}
    </g>
    <g transform="translate(360 90) scale(-1 1)" stroke={alpha("#ffffff", 0.85)} strokeWidth="2" fill="none">
      <path d="M0,40 Q20,20 30,-10" />
      {[0, 1, 2, 3].map((i) => (
        <ellipse key={i} cx={5 + i * 7} cy={30 - i * 10} rx="6" ry="3" transform={`rotate(${30 + i * 10} ${5 + i * 7} ${30 - i * 10})`} fill={alpha("#ffffff", 0.7)} />
      ))}
    </g>
  </svg>
)

const ILLUSTRATIONS: Illustration[] = [BooksCover, AtomCover, CodeCover, ChartCover, LaurelCover]

export function CommunityCover({ seed, color, className }: Props) {
  const Illustration = useMemo(() => {
    const idx = hashSeed(seed) % ILLUSTRATIONS.length
    return ILLUSTRATIONS[idx]
  }, [seed])
  return <div className={className}>{Illustration(color)}</div>
}
