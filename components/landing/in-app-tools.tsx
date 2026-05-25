"use client"

// "Built right into the app" section — calls out the two in-house
// tools most LMS platforms make you bolt on from elsewhere: a
// multiplayer whiteboard and a cloud-recording video room. Both
// illustrated with hand-rolled SVG (not bitmaps) so the section
// renders crisp at every size + theme.

import Link from "next/link"
import { ArrowRight, Film, PenSquare, Users, Video, Zap } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

export function InAppTools() {
  return (
    <section className="relative overflow-hidden border-y border-border bg-background py-20">
      {/* Ambient blooms */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-32 top-20 h-72 w-72 rounded-full bg-accent/[0.08] blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-32 bottom-20 h-80 w-80 rounded-full bg-primary/[0.08] blur-3xl"
      />

      <div className="relative mx-auto max-w-6xl px-6 lg:px-8">
        {/* Section header */}
        <div className="mx-auto max-w-3xl text-center">
          <Badge variant="outline" className="mb-4 border-accent/30 bg-accent/[0.05] text-accent">
            <Zap className="mr-1 h-3 w-3" />
            Built right in
          </Badge>
          <h2 className="font-serif text-3xl font-bold tracking-tight sm:text-4xl">
            A whiteboard and a video room.{" "}
            <span className="text-primary">Built into every class.</span>
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
            No standalone whiteboard licence, no separate video-conferencing seat, no &ldquo;please install this Chrome
            extension.&rdquo; The two tools you teach with are inside the app — on every plan, on every
            class.
          </p>
        </div>

        {/* Two feature blocks */}
        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          <ToolCard
            eyebrowIcon={PenSquare}
            eyebrow="Multiplayer whiteboard"
            title="Sketch together. Live."
            body="A real-time multiplayer canvas built into every live class. Sketch diagrams, teach math, brainstorm with your cohort — saved per session. No standalone whiteboard account."
            bullets={[
              "Hand-drawn aesthetic — feels human",
              "Every cursor labelled with the participant's name",
              "Autosaves locally + to your backend",
              "Library at /dashboard/whiteboards for standalone boards",
            ]}
            cta={{ href: "/features/whiteboard", label: "Explore the whiteboard" }}
            illustration={<WhiteboardIllustration />}
            accent="amber"
          />
          <ToolCard
            eyebrowIcon={Video}
            eyebrow="Live calling, in-app"
            title="Click. Teach. We record."
            body="Built-in cloud room — students join with a name, no signup, no app install. Click Start recording and a server-side worker captures the full room and uploads to your CDN."
            bullets={[
              "No third-party signup — students join from the browser",
              "Adaptive 1080p simulcast — weak networks degrade gracefully",
              "Server-side recording → your Cloudflare R2 bucket",
              "Auto-email with the Watch link when the file lands",
            ]}
            cta={{ href: "/features/live-classes", label: "See the live room" }}
            illustration={<CallingIllustration />}
            accent="rose"
          />
        </div>

        {/* Sub-CTA bar */}
        <div className="mt-12 flex flex-col items-center gap-3 rounded-xl border border-border bg-card p-6 text-center sm:flex-row sm:justify-between sm:text-left">
          <div>
            <p className="font-medium">Two more in-house surfaces worth knowing</p>
            <p className="mt-1 text-sm text-muted-foreground">
              A unified inbox for everything that needs your reply, and cross-channel notifications
              that fan out to in-app + email + WhatsApp automatically.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/features/inbox">
                <Users className="mr-1.5 h-3.5 w-3.5" />
                Unified Inbox
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/features/realtime">
                <Film className="mr-1.5 h-3.5 w-3.5" />
                Real-time updates
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}

// ============================================================
// ToolCard — split-frame layout: illustration left, copy right
// (stacks on mobile). Accent driver pulls a different colour
// per card so the section reads as variety, not repetition.
// ============================================================

type Accent = "amber" | "rose"

interface ToolCardProps {
  eyebrowIcon: typeof PenSquare
  eyebrow: string
  title: string
  body: string
  bullets: string[]
  cta: { href: string; label: string }
  illustration: React.ReactNode
  accent: Accent
}

const ACCENTS: Record<Accent, { ring: string; chip: string; chipText: string; iconBg: string; iconText: string }> = {
  amber: {
    ring: "ring-amber-200/60 dark:ring-amber-900/40",
    chip: "bg-amber-50 dark:bg-amber-950/40",
    chipText: "text-amber-700 dark:text-amber-400",
    iconBg: "bg-amber-100 dark:bg-amber-900/40",
    iconText: "text-amber-600 dark:text-amber-400",
  },
  rose: {
    ring: "ring-rose-200/60 dark:ring-rose-900/40",
    chip: "bg-rose-50 dark:bg-rose-950/40",
    chipText: "text-rose-700 dark:text-rose-400",
    iconBg: "bg-rose-100 dark:bg-rose-900/40",
    iconText: "text-rose-600 dark:text-rose-400",
  },
}

function ToolCard({ eyebrowIcon: EyebrowIcon, eyebrow, title, body, bullets, cta, illustration, accent }: ToolCardProps) {
  const a = ACCENTS[accent]
  return (
    <article className={`group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm ring-1 ${a.ring}`}>
      {/* Illustration — square-ish at top of card */}
      <div className="aspect-[16/10] overflow-hidden">{illustration}</div>

      {/* Copy block */}
      <div className="flex flex-1 flex-col gap-3 p-6">
        <div className="flex items-center gap-2">
          <span className={`inline-flex h-7 w-7 items-center justify-center rounded-md ${a.iconBg}`}>
            <EyebrowIcon className={`h-4 w-4 ${a.iconText}`} />
          </span>
          <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${a.chip} ${a.chipText}`}>
            {eyebrow}
          </span>
        </div>
        <h3 className="font-serif text-2xl font-bold leading-tight">{title}</h3>
        <p className="text-sm text-muted-foreground">{body}</p>
        <ul className="space-y-1.5 text-sm">
          {bullets.map((b) => (
            <li key={b} className="flex items-start gap-2">
              <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-foreground/40" />
              <span className="text-foreground/85">{b}</span>
            </li>
          ))}
        </ul>
        <div className="mt-auto pt-2">
          <Button asChild variant="outline">
            <Link href={cta.href}>
              {cta.label}
              <ArrowRight className="ml-1.5 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </Button>
        </div>
      </div>
    </article>
  )
}

// ============================================================
// SVG #1 — Whiteboard
//
// A canvas with a paper-grid backdrop, three hand-drawn sketches
// (circle + arrow + rectangle), and three labelled multiplayer
// cursors in distinct colours. The grid + jittery stroke widths
// give it the Excalidraw feel.
// ============================================================

function WhiteboardIllustration() {
  return (
    <div className="relative h-full w-full bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/30">
      <svg
        viewBox="0 0 480 300"
        className="absolute inset-0 h-full w-full"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="Multiplayer whiteboard with three participant cursors"
        role="img"
      >
        {/* Paper grid */}
        <defs>
          <pattern id="grid" width="24" height="24" patternUnits="userSpaceOnUse">
            <path d="M 24 0 L 0 0 0 24" fill="none" stroke="oklch(0.85 0 0)" strokeWidth="0.5" opacity="0.5" />
          </pattern>
          <filter id="rough">
            <feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="2" />
            <feDisplacementMap in="SourceGraphic" scale="1.5" />
          </filter>
        </defs>
        <rect width="480" height="300" fill="url(#grid)" />

        {/* Sketch 1 — circle with arrow into it */}
        <g stroke="oklch(0.55 0.15 30)" strokeWidth="2.5" fill="none" strokeLinecap="round" filter="url(#rough)">
          <ellipse cx="120" cy="100" rx="50" ry="36" />
          <text x="98" y="105" fontSize="14" fill="oklch(0.55 0.15 30)" stroke="none" fontFamily="'Caveat', cursive, system-ui" fontWeight="600">
            MVP
          </text>
        </g>

        {/* Arrow connecting to sketch 2 */}
        <g stroke="oklch(0.5 0 0)" strokeWidth="2" fill="none" strokeLinecap="round" filter="url(#rough)">
          <path d="M 175 100 Q 220 95 260 110" />
          <path d="M 252 102 L 264 112 L 252 118" />
        </g>

        {/* Sketch 2 — sticky note rectangle */}
        <g filter="url(#rough)">
          <rect x="270" y="70" width="120" height="80" fill="oklch(0.92 0.08 95)" stroke="oklch(0.7 0.1 80)" strokeWidth="2" rx="3" />
          <line x1="280" y1="92" x2="380" y2="92" stroke="oklch(0.6 0.06 80)" strokeWidth="1" />
          <line x1="280" y1="108" x2="370" y2="108" stroke="oklch(0.6 0.06 80)" strokeWidth="1" />
          <line x1="280" y1="124" x2="360" y2="124" stroke="oklch(0.6 0.06 80)" strokeWidth="1" />
        </g>

        {/* Sketch 3 — bottom flow */}
        <g stroke="oklch(0.55 0.18 240)" strokeWidth="2.5" fill="none" strokeLinecap="round" filter="url(#rough)">
          <path d="M 70 220 L 200 220 L 200 250 L 320 250" />
          <path d="M 310 242 L 322 250 L 310 258" />
          <circle cx="70" cy="220" r="10" fill="oklch(0.55 0.18 240)" />
          <rect x="310" y="240" width="60" height="22" rx="3" fill="oklch(0.97 0.02 240)" />
        </g>
        <text x="318" y="256" fontSize="11" fill="oklch(0.4 0.18 240)" fontFamily="'Caveat', cursive, system-ui" fontWeight="600">
          ship
        </text>

        {/* Cursor 1 — Renu (rose) */}
        <g transform="translate(150 165)">
          <path d="M 0 0 L 14 8 L 8 9 L 7 16 Z" fill="oklch(0.6 0.18 0)" />
          <rect x="14" y="6" width="38" height="14" rx="3" fill="oklch(0.6 0.18 0)" />
          <text x="18" y="16" fontSize="9" fill="white" fontFamily="system-ui" fontWeight="600">
            Renu
          </text>
        </g>

        {/* Cursor 2 — Dinesh (sky) */}
        <g transform="translate(340 140)">
          <path d="M 0 0 L 14 8 L 8 9 L 7 16 Z" fill="oklch(0.55 0.18 240)" />
          <rect x="14" y="6" width="50" height="14" rx="3" fill="oklch(0.55 0.18 240)" />
          <text x="18" y="16" fontSize="9" fill="white" fontFamily="system-ui" fontWeight="600">
            Dinesh
          </text>
        </g>

        {/* Cursor 3 — Anaya (violet) */}
        <g transform="translate(90 245)">
          <path d="M 0 0 L 14 8 L 8 9 L 7 16 Z" fill="oklch(0.55 0.2 300)" />
          <rect x="14" y="6" width="44" height="14" rx="3" fill="oklch(0.55 0.2 300)" />
          <text x="18" y="16" fontSize="9" fill="white" fontFamily="system-ui" fontWeight="600">
            Anaya
          </text>
        </g>

        {/* Top-right meta — "3 drawing" + "Saved" */}
        <g>
          <rect x="340" y="14" width="124" height="22" rx="11" fill="oklch(1 0 0)" opacity="0.95" stroke="oklch(0.85 0 0)" strokeWidth="0.5" />
          <circle cx="354" cy="25" r="3" fill="oklch(0.7 0.18 145)" />
          <text x="364" y="29" fontSize="11" fill="oklch(0.3 0 0)" fontFamily="system-ui" fontWeight="500">
            3 drawing · Saved 2s
          </text>
        </g>
      </svg>
    </div>
  )
}

// ============================================================
// SVG #2 — In-app calling
//
// A dark video-room frame with a 2x2 participant grid, a live REC
// pill, an active-speaker glow on one tile, and a clean control
// bar across the bottom. Matches the actual product layout.
// ============================================================

function CallingIllustration() {
  return (
    <div className="relative h-full w-full bg-gradient-to-br from-slate-900 via-slate-950 to-black">
      <svg
        viewBox="0 0 480 300"
        className="absolute inset-0 h-full w-full"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="Live class video room with four participants and recording in progress"
        role="img"
      >
        {/* REC pill — top-left */}
        <g>
          <rect x="14" y="14" width="84" height="22" rx="11" fill="oklch(0.16 0 0)" opacity="0.9" />
          <circle cx="28" cy="25" r="4" fill="oklch(0.65 0.2 25)">
            <animate attributeName="opacity" values="1;0.3;1" dur="1.5s" repeatCount="indefinite" />
          </circle>
          <text x="40" y="29" fontSize="11" fill="white" fontFamily="system-ui" fontWeight="700" letterSpacing="0.5">
            REC · 12:34
          </text>
        </g>

        {/* Participant count pill — top-right */}
        <g>
          <rect x="380" y="14" width="86" height="22" rx="11" fill="oklch(0.16 0 0)" opacity="0.9" />
          <circle cx="394" cy="25" r="3.5" fill="oklch(0.7 0.05 240)" />
          <text x="404" y="29" fontSize="11" fill="white" fontFamily="system-ui" fontWeight="500">
            4 in call
          </text>
        </g>

        {/* Active speaker — top-left tile (glow) */}
        <g>
          <rect x="40" y="58" width="190" height="100" rx="8" fill="url(#participant1)" />
          <rect
            x="40"
            y="58"
            width="190"
            height="100"
            rx="8"
            fill="none"
            stroke="oklch(0.75 0.15 145)"
            strokeWidth="2.5"
          />
          <defs>
            <linearGradient id="participant1" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="oklch(0.55 0.18 30)" />
              <stop offset="100%" stopColor="oklch(0.35 0.12 25)" />
            </linearGradient>
          </defs>
          {/* Name strip */}
          <rect x="40" y="138" width="190" height="20" rx="0" fill="black" opacity="0.4" />
          <text x="50" y="153" fontSize="11" fill="white" fontFamily="system-ui" fontWeight="600">
            Renu Rawat
          </text>
          {/* Speaker icon */}
          <g transform="translate(210 145)">
            <path d="M 0 -4 L 0 4 M -2 -2 L -2 2 M 2 -2 L 2 2" stroke="oklch(0.75 0.15 145)" strokeWidth="1.5" strokeLinecap="round" />
          </g>
        </g>

        {/* Tile 2 — top right */}
        <g>
          <rect x="250" y="58" width="190" height="100" rx="8" fill="url(#participant2)" />
          <defs>
            <linearGradient id="participant2" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="oklch(0.55 0.18 240)" />
              <stop offset="100%" stopColor="oklch(0.35 0.12 240)" />
            </linearGradient>
          </defs>
          <rect x="250" y="138" width="190" height="20" rx="0" fill="black" opacity="0.4" />
          <text x="260" y="153" fontSize="11" fill="white" fontFamily="system-ui" fontWeight="600">
            Dinesh
          </text>
          {/* Camera-off icon */}
          <g transform="translate(415 145)">
            <rect x="-6" y="-3" width="10" height="6" rx="1" fill="none" stroke="oklch(0.6 0 0)" strokeWidth="1.2" />
            <path d="M 4 -2 L 8 -4 L 8 4 L 4 2 Z" fill="oklch(0.6 0 0)" />
          </g>
        </g>

        {/* Tile 3 — bottom left */}
        <g>
          <rect x="40" y="170" width="190" height="58" rx="8" fill="url(#participant3)" />
          <defs>
            <linearGradient id="participant3" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="oklch(0.5 0.2 300)" />
              <stop offset="100%" stopColor="oklch(0.3 0.12 300)" />
            </linearGradient>
          </defs>
          <rect x="40" y="208" width="190" height="20" rx="0" fill="black" opacity="0.4" />
          <text x="50" y="223" fontSize="11" fill="white" fontFamily="system-ui" fontWeight="600">
            Anaya
          </text>
        </g>

        {/* Tile 4 — bottom right */}
        <g>
          <rect x="250" y="170" width="190" height="58" rx="8" fill="url(#participant4)" />
          <defs>
            <linearGradient id="participant4" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="oklch(0.5 0.15 145)" />
              <stop offset="100%" stopColor="oklch(0.3 0.1 145)" />
            </linearGradient>
          </defs>
          <rect x="250" y="208" width="190" height="20" rx="0" fill="black" opacity="0.4" />
          <text x="260" y="223" fontSize="11" fill="white" fontFamily="system-ui" fontWeight="600">
            Vikram
          </text>
        </g>

        {/* Control bar */}
        <g transform="translate(0 248)">
          <rect x="120" y="0" width="240" height="42" rx="21" fill="oklch(0.16 0 0)" opacity="0.95" />

          {/* Mic */}
          <circle cx="148" cy="21" r="15" fill="oklch(0.22 0 0)" />
          <g transform="translate(148 21)" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round">
            <rect x="-3" y="-7" width="6" height="10" rx="3" fill="white" stroke="none" />
            <path d="M -6 0 Q -6 6 0 6 Q 6 6 6 0" />
            <line x1="0" y1="6" x2="0" y2="10" />
          </g>

          {/* Camera */}
          <circle cx="188" cy="21" r="15" fill="oklch(0.22 0 0)" />
          <g transform="translate(188 21)" stroke="white" strokeWidth="1.5" fill="none">
            <rect x="-6" y="-4" width="9" height="8" rx="1" fill="white" stroke="none" />
            <path d="M 3 -2 L 7 -4 L 7 4 L 3 2 Z" fill="white" stroke="none" />
          </g>

          {/* Screen share */}
          <circle cx="228" cy="21" r="15" fill="oklch(0.22 0 0)" />
          <g transform="translate(228 21)" stroke="white" strokeWidth="1.4" fill="none">
            <rect x="-7" y="-5" width="14" height="9" rx="1" />
            <path d="M 0 -2 L 0 2 M -2 0 L 0 -2 L 2 0" strokeLinecap="round" />
            <line x1="-4" y1="6" x2="4" y2="6" />
          </g>

          {/* Chat */}
          <circle cx="268" cy="21" r="15" fill="oklch(0.22 0 0)" />
          <g transform="translate(268 21)" stroke="white" strokeWidth="1.4" fill="none">
            <path d="M -7 -4 L 7 -4 L 7 3 L -3 3 L -7 6 Z" />
          </g>

          {/* Hangup — red */}
          <circle cx="312" cy="21" r="17" fill="oklch(0.55 0.22 25)" />
          <g transform="translate(312 21)" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round">
            <path d="M -6 2 Q 0 -4 6 2" />
            <line x1="-5" y1="2" x2="-7" y2="0" />
            <line x1="5" y1="2" x2="7" y2="0" />
          </g>
        </g>
      </svg>
    </div>
  )
}
