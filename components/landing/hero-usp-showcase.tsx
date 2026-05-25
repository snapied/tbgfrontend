"use client"

// Hero right-column visual — a live demo of the 4 USPs in one
// composition. Replaces both the original HeroStack and the
// HeroInstantPrompt entry point. Single self-contained card that
// renders four live "proof" tiles in a 2×2 grid:
//
//   1. 💰 Zero commission — animated ₹ counter that shows "you keep
//      100%" with a small disappearing "platform's cut: ₹0" line.
//   2. 🧩 All-in-one — six mini tool chips that animate from
//      "scattered" to "one workspace card."
//   3. 📤 Own your data — an "Export" button with file glyphs
//      cascading out + per-format chips.
//   4. 🇮🇳 India-first — UPI · WhatsApp · INR · Hindi · Tamil chip
//      rail with a soft pulse cycling between them.
//
// Why no rotation/carousel: 4 USPs visible at once gives the
// scanner the whole story in one glance. A carousel forces them to
// wait — and scanners don't wait.

import { useEffect, useState } from "react"
import { ArrowDown, Check, Download, FileJson, FileText, IndianRupee, Languages, MessageSquare, Sparkles, Wand2 } from "lucide-react"

export function HeroUSPShowcase() {
  return (
    <div className="relative">
      {/* Soft glow behind the composition so the card feels lifted
          off the page without a hard shadow. */}
      <div className="absolute -inset-6 -z-10 rounded-3xl bg-gradient-to-br from-primary/20 via-accent/10 to-emerald-500/10 opacity-70 blur-3xl" />
      <div className="rounded-3xl border border-border bg-card/95 p-4 shadow-2xl backdrop-blur-sm sm:p-5">
        {/* App-chrome cue so the card reads as "a live product
            view," not a marketing graphic. Three dots, a generic
            teacher-dashboard label (no public-site domain), and a
            tiny LIVE pill. */}
        <div className="mb-3 flex items-center gap-2">
          <span className="flex gap-1">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-400/60" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400/60" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/60" />
          </span>
          <span className="ml-1 flex-1 truncate rounded-md border border-border/60 bg-background/60 px-2.5 py-1 font-mono text-[10px] text-muted-foreground">
            Teacher dashboard · this month
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/[0.08] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-700">
            <span className="h-1 w-1 animate-pulse rounded-full bg-emerald-500" />
            Live
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <ZeroCommissionTile />
          <AllInOneTile />
          <OwnYourDataTile />
          <IndiaFirstTile />
        </div>

        {/* Footer caption — orients the reader on what they just saw. */}
        <p className="mt-3 text-center text-[11px] text-muted-foreground">
          Four promises. Visible from day one — and on the way out the door.
        </p>
      </div>
    </div>
  )
}

// ─── Tile 1: Zero commission ────────────────────────────────────────
function ZeroCommissionTile() {
  // Live counter that climbs ₹0 → ₹1,00,000 over ~3s on mount, then
  // settles. Pulls the visitor's eye into the tile and proves "we
  // count nothing" — both numbers stay visible simultaneously.
  const TARGET = 100000
  const [earnings, setEarnings] = useState(0)
  useEffect(() => {
    let raf = 0
    const t0 = performance.now()
    const DURATION = 2400
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / DURATION)
      // Ease-out cubic for a satisfying settle.
      const eased = 1 - Math.pow(1 - p, 3)
      setEarnings(Math.round(TARGET * eased))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])
  return (
    <Tile
      tone="emerald"
      eyebrow="Zero commission"
      title="You keep 100%."
    >
      <div className="space-y-2">
        <div className="flex items-baseline justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            You earned this month
          </span>
          <span className="font-mono text-[18px] font-bold tabular-nums text-emerald-700">
            ₹{earnings.toLocaleString("en-IN")}
          </span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-emerald-500/10">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all duration-300"
            style={{ width: `${(earnings / 100000) * 100}%` }}
          />
        </div>
        <div className="flex items-center justify-between rounded-md border border-emerald-500/20 bg-emerald-500/[0.04] px-2 py-1">
          <span className="text-[10px] font-medium text-muted-foreground">Platform&rsquo;s cut</span>
          <span className="font-mono text-xs font-bold text-emerald-700">₹0</span>
        </div>
      </div>
    </Tile>
  )
}

// ─── Tile 2: All-in-one ─────────────────────────────────────────────
function AllInOneTile() {
  // Six teacher-side surface chips representing the platform's
  // bundled stack. Public-site surfaces (storefront, store, public
  // checkout, the portal) are intentionally NOT in this tile — the
  // hero focuses on what the teacher does inside the workspace, not
  // what students see on the public side.
  const SURFACES = [
    { emoji: "🎥", label: "Live" },
    { emoji: "📚", label: "Courses" },
    { emoji: "👥", label: "Community" },
    { emoji: "🎨", label: "Whiteboard" },
    { emoji: "📝", label: "Quizzes" },
    { emoji: "🏆", label: "Certs" },
  ]
  return (
    <Tile
      tone="primary"
      eyebrow="All-in-one"
      title="One workspace, not seven."
    >
      <div className="grid grid-cols-3 gap-1.5">
        {SURFACES.map((s, i) => (
          <div
            key={s.label}
            className="flex flex-col items-center gap-0.5 rounded-md border border-border/60 bg-background/70 px-1 py-1.5 transition-transform hover:scale-105"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <span aria-hidden className="text-base">{s.emoji}</span>
            <span className="text-[9px] font-semibold text-foreground/80">{s.label}</span>
          </div>
        ))}
      </div>
      <p className="mt-2 inline-flex items-center gap-1 text-[10px] text-muted-foreground">
        <Sparkles className="h-2.5 w-2.5 text-primary" /> One login · one student record
      </p>
    </Tile>
  )
}

// ─── Tile 3: Own your data ──────────────────────────────────────────
function OwnYourDataTile() {
  // Live "Export" button that pulses every ~3s with files cascading
  // out. Reinforces "one click, your data leaves with you." Two
  // format chips (CSV, JSON) below.
  const [pulse, setPulse] = useState(0)
  useEffect(() => {
    const id = window.setInterval(() => setPulse((p) => p + 1), 3000)
    return () => window.clearInterval(id)
  }, [])
  return (
    <Tile
      tone="amber"
      eyebrow="Your data"
      title="Export any day. Free tier included."
    >
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          className="relative inline-flex items-center gap-1.5 rounded-md bg-foreground px-2.5 py-1.5 text-[11px] font-bold text-background"
          aria-label="Export workspace"
          // Decorative — wrapped in a tile that isn't clickable, so the
          // button is here for visual texture only.
          tabIndex={-1}
        >
          <Download className="h-3 w-3" />
          Export
        </button>
        {/* Two file glyphs animate out on each pulse cycle. Keyed on
            the pulse counter so React re-mounts them every tick →
            CSS animation replays from zero without manual reset. */}
        <div key={pulse} className="flex items-center gap-1">
          <FileGlyph icon={<FileText className="h-3 w-3" />} label="CSV" delay={0} />
          <FileGlyph icon={<FileJson className="h-3 w-3" />} label="JSON" delay={150} />
        </div>
      </div>
      <p className="mt-2 inline-flex items-center gap-1 text-[10px] text-muted-foreground">
        <Check className="h-2.5 w-2.5 text-success" /> Per-entity + full workspace dump
      </p>
    </Tile>
  )
}

function FileGlyph({ icon, label, delay }: { icon: React.ReactNode; label: string; delay: number }) {
  return (
    <span
      className="inline-flex animate-[exportPop_2.4s_ease-out_forwards] items-center gap-1 rounded border border-border bg-background px-1.5 py-0.5 text-[9px] font-semibold text-foreground/80"
      style={{ animationDelay: `${delay}ms`, opacity: 0 }}
    >
      {icon}
      {label}
      <style jsx>{`
        @keyframes exportPop {
          0%   { transform: translateX(-8px) scale(0.9); opacity: 0; }
          15%  { opacity: 1; }
          50%  { transform: translateX(0) scale(1); opacity: 1; }
          85%  { opacity: 1; }
          100% { transform: translateX(8px) scale(0.95); opacity: 0; }
        }
      `}</style>
    </span>
  )
}

// ─── Tile 4: India-first ────────────────────────────────────────────
function IndiaFirstTile() {
  // Auto-cycle through 4 India-native delivery chips with a soft
  // ring pulse on the active one. Faster than the rotation pattern
  // would be — chips are tiny enough to read at a glance.
  const CHIPS: Array<{ icon: React.ReactNode; label: string; sub: string }> = [
    { icon: <IndianRupee className="h-2.5 w-2.5" />,  label: "UPI",      sub: "checkout in one tap" },
    { icon: <MessageSquare className="h-2.5 w-2.5" />, label: "WhatsApp", sub: "notifications native" },
    { icon: <Languages className="h-2.5 w-2.5" />,    label: "हिन्दी",   sub: "portal in your language" },
    { icon: <Wand2 className="h-2.5 w-2.5" />,        label: "INR + ₹",   sub: "no FX dance" },
  ]
  const [idx, setIdx] = useState(0)
  useEffect(() => {
    const id = window.setInterval(() => setIdx((i) => (i + 1) % CHIPS.length), 1800)
    return () => window.clearInterval(id)
  }, [CHIPS.length])
  return (
    <Tile
      tone="violet"
      eyebrow="Built in India 🇮🇳"
      title="UPI · WhatsApp · हिन्दी · INR"
    >
      <div className="flex flex-wrap gap-1">
        {CHIPS.map((c, i) => (
          <span
            key={c.label}
            className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-semibold transition-all ${
              i === idx
                ? "border-violet-500 bg-violet-500/15 text-violet-700 ring-2 ring-violet-500/30"
                : "border-border bg-background text-muted-foreground"
            }`}
          >
            {c.icon}
            {c.label}
          </span>
        ))}
      </div>
      <p className="mt-2 text-[10px] text-muted-foreground" aria-live="polite">
        {CHIPS[idx].sub}
      </p>
    </Tile>
  )
}

// ─── Tile shell ─────────────────────────────────────────────────────
function Tile({
  tone,
  eyebrow,
  title,
  children,
}: {
  tone: "emerald" | "primary" | "amber" | "violet"
  eyebrow: string
  title: string
  children: React.ReactNode
}) {
  const toneClasses: Record<typeof tone, string> = {
    emerald: "border-emerald-500/30 bg-emerald-500/[0.03]",
    primary: "border-primary/30 bg-primary/[0.03]",
    amber:   "border-amber-500/30 bg-amber-500/[0.03]",
    violet:  "border-violet-500/30 bg-violet-500/[0.03]",
  }
  const eyebrowTone: Record<typeof tone, string> = {
    emerald: "text-emerald-700",
    primary: "text-primary",
    amber:   "text-amber-700",
    violet:  "text-violet-700",
  }
  return (
    <article className={`rounded-2xl border p-3 ${toneClasses[tone]}`}>
      <p className={`text-[10px] font-bold uppercase tracking-wider ${eyebrowTone[tone]}`}>
        {eyebrow}
      </p>
      <h3 className="mt-0.5 text-sm font-bold leading-snug">{title}</h3>
      <div className="mt-2.5">{children}</div>
    </article>
  )
}

// Unused export kept for potential future hand-off — same shape as
// the old HeroInstantPrompt fired. Keeping the door open without
// importing the prompt itself.
export const HERO_VISUAL_EVENT = "tbc:instant-builder:seed"
// satisfies the importer — unused inline reference
void ArrowDown
