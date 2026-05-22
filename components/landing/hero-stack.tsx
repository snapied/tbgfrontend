"use client"

import {
  Award,
  CalendarCheck,
  CheckCircle2,
  Clock,
  Heart,
  Mic,
  ShoppingBag,
  Trophy,
  Users,
} from "lucide-react"

/**
 * Hero visual — a layered "product is real" stack.
 *
 * Centre piece is a faux live-class detail screen with attendance, a recording
 * placeholder, attached quiz + homework, and a recurring-series chip. Around
 * it float four product cards (Wall of Love, leaderboard, certificate, sale
 * notification) that gently bob — no carousel, no spinning, no motion-sickness
 * orbits. Pure CSS keyframes so it costs nothing at runtime.
 */
export function HeroStack() {
  return (
    <div className="relative mx-auto aspect-[10/11] w-full max-w-[560px]">
      {/* Glow underlay */}
      <div className="pointer-events-none absolute inset-x-6 inset-y-12 rounded-[36px] bg-gradient-to-br from-primary/15 via-primary/5 to-accent/15 blur-2xl" />

      {/* Primary screen — live class detail */}
      <PrimaryScreen />

      {/* Floating accent cards. Each uses a distinct float delay so the
          composition has natural rhythm without going chaotic. */}
      <FloatingCard
        className="absolute -top-2 right-2 w-[58%] sm:w-[42%] rotate-[-2deg]"
        delay="0s"
      >
        <WallCard />
      </FloatingCard>

      <FloatingCard
        className="absolute -bottom-4 -left-3 w-[60%] sm:w-[46%] rotate-[3deg]"
        delay="-2s"
      >
        <LeaderboardCard />
      </FloatingCard>

      <FloatingCard
        className="absolute top-[42%] -right-4 w-[50%] sm:w-[36%] rotate-[4deg] hidden sm:block"
        delay="-4s"
      >
        <CertificateCard />
      </FloatingCard>

      <FloatingCard
        className="absolute -top-1 left-0 w-[52%] sm:w-[38%] rotate-[-3deg]"
        delay="-1s"
      >
        <SaleToast />
      </FloatingCard>

      {/* Tiny floating sparkles for life */}
      <Sparkle className="absolute left-[18%] bottom-[26%]" delay="0s" />
      <Sparkle className="absolute right-[14%] top-[28%]"   delay="1.4s" />
      <Sparkle className="absolute left-[8%] top-[64%]"     delay="2.8s" />
    </div>
  )
}

// ============================================================
// Primary screen — live class detail
// ============================================================

function PrimaryScreen() {
  return (
    <div
      className="absolute inset-x-6 top-10 bottom-6 overflow-hidden rounded-2xl border border-border bg-card shadow-[0_30px_80px_-30px_rgba(10,48,36,0.45)]"
      style={{ animation: "float-soft 8s ease-in-out infinite" }}
    >
      {/* Faux window chrome */}
      <div className="flex items-center gap-2 border-b border-border/60 bg-muted/40 px-3 py-2">
        <span className="h-2.5 w-2.5 rounded-full bg-rose-400/80" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
        <span className="ml-2 truncate font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
          studio.thebigclass.com › classes › hooks deep-dive
        </span>
      </div>

      <div className="grid h-[calc(100%-2rem)] grid-cols-[64px_1fr]">
        {/* Side rail */}
        <aside className="space-y-1 border-r border-border/60 bg-muted/20 py-3">
          {[
            { icon: CalendarCheck, active: true  },
            { icon: Users,         active: false },
            { icon: ShoppingBag,   active: false },
            { icon: Heart,         active: false },
            { icon: Trophy,        active: false },
            { icon: Award,         active: false },
          ].map((r, i) => (
            <div
              key={i}
              className={`mx-2 flex h-8 items-center justify-center rounded-md ${
                r.active ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground"
              }`}
            >
              <r.icon className="h-3.5 w-3.5" />
            </div>
          ))}
        </aside>

        {/* Main pane */}
        <div className="flex flex-col gap-3 overflow-hidden p-3">
          {/* Header strip */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-[12px] font-semibold leading-tight">Hooks Deep-Dive · Cohort 4</p>
              <p className="mt-0.5 inline-flex items-center gap-1 text-[9px] text-muted-foreground">
                <Clock className="h-2.5 w-2.5" />
                Today · 7:00 pm IST · 60 min
              </p>
            </div>
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-destructive/15 px-1.5 py-0.5 text-[9px] font-bold text-destructive">
              <span className="h-1 w-1 animate-pulse rounded-full bg-current" />
              LIVE NOW
            </span>
          </div>

          {/* Recurrence chip */}
          <div className="inline-flex w-fit items-center gap-1 rounded-full border border-primary/30 bg-primary/5 px-2 py-0.5 text-[9px] font-medium">
            ↻ Weekly · session 3 of 8
          </div>

          {/* Live classroom — instructor PIP + shared code + chat + waveform */}
          <LiveClassroomScreen />


          {/* Attendance ticker */}
          <div className="flex items-center gap-2 rounded-md border border-border/60 bg-muted/30 px-2 py-1.5">
            <Users className="h-3 w-3 text-primary" />
            <div className="flex -space-x-1">
              {["A","V","S","K","M"].map((c, i) => (
                <span
                  key={i}
                  className="flex h-4 w-4 items-center justify-center rounded-full border border-card bg-primary/70 text-[8px] font-bold text-primary-foreground"
                >
                  {c}
                </span>
              ))}
            </div>
            <span className="font-mono text-[10px] tabular-nums">
              <AnimatedAttendance />
            </span>
            <span className="text-[10px] text-muted-foreground">joined</span>
          </div>

          {/* Recap previews */}
          <div className="grid grid-cols-2 gap-1.5">
            <MiniCard tone="primary" title="Attached quiz" body="Hooks check · 6 q" icon={<CheckCircle2 className="h-3 w-3" />} />
            <MiniCard tone="accent"  title="Homework"     body="Due Fri · custom hook" icon={<Mic className="h-3 w-3" />} />
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * The "video frame" inside the dashboard mockup. A composed live-class
 * screen showing what a real session looks like: a faux code slide being
 * shared, a small instructor PIP with a pulsing speaker ring, live chat
 * reactions drifting up the right side, and an animated audio waveform
 * across the bottom. All-CSS animations.
 */
function LiveClassroomScreen() {
  return (
    <div className="relative aspect-video overflow-hidden rounded-md bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 ring-1 ring-white/5">
      {/* Subtle grid wash for "screen share" feel */}
      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.6) 1px, transparent 1px)",
          backgroundSize: "16px 16px",
        }}
      />

      {/* Soft cursor glow — gives the slide some depth */}
      <div className="pointer-events-none absolute -left-10 -top-10 h-32 w-32 rounded-full bg-emerald-400/15 blur-2xl" />
      <div className="pointer-events-none absolute -right-12 bottom-0 h-36 w-36 rounded-full bg-sky-400/10 blur-3xl" />

      {/* Recording badge */}
      <span className="absolute right-2 top-2 z-20 inline-flex items-center gap-1 rounded-full bg-black/70 px-1.5 py-0.5 text-[8px] font-bold text-rose-400 ring-1 ring-white/10">
        <span className="h-1 w-1 animate-pulse rounded-full bg-current" /> REC
      </span>

      {/* Top-left — shared "slide title" */}
      <div className="absolute left-2 top-2 z-10 inline-flex items-center gap-1 rounded-md bg-white/5 px-1.5 py-0.5 font-mono text-[8px] text-white/60 ring-1 ring-white/10">
        <span className="h-1 w-1 rounded-full bg-emerald-400" /> sharing · hooks.tsx
      </div>

      {/* Code being typed — the "slide" */}
      <pre className="absolute left-3 right-[34%] top-7 z-10 font-mono text-[8px] leading-[1.4] text-slate-200/90 sm:text-[9px]">
{`function useTimer(ms) {`}
        <br />
{`  const [t, setT] = useState(0)`}
        <br />
{`  useEffect(() => {`}
        <br />
{`    const id = setInterval(`}
        <br />
{`      () => setT(t => t + 1), ms`}
        <br />
{`    )`}
        <br />
{`    return () => `}
        <span className="rounded bg-emerald-500/30 px-0.5 text-emerald-200">{"clearInterval(id)"}</span>
        <span className="ml-0.5 inline-block h-[10px] w-[5px] -translate-y-[1px] bg-emerald-300/90 align-middle" style={{ animation: "caret-blink 1.05s steps(1, end) infinite" }} />
        <br />
{`  }, [ms])`}
      </pre>

      {/* Instructor PIP with pulsing speaker rings */}
      <div className="absolute right-2 top-2 z-20 hidden sm:block">
        <div className="relative h-[68px] w-[88px] overflow-hidden rounded-md bg-gradient-to-br from-emerald-700 via-emerald-800 to-emerald-950 ring-1 ring-white/10">
          {/* Speaker rings */}
          <span className="absolute -bottom-2 -left-2 h-10 w-10 rounded-full border border-emerald-300/40" style={{ animation: "speaker-ring 1.8s ease-out infinite" }} />
          <span className="absolute -bottom-2 -left-2 h-10 w-10 rounded-full border border-emerald-300/40" style={{ animation: "speaker-ring 1.8s ease-out infinite", animationDelay: "0.6s" }} />

          {/* Avatar (initials) */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-300 text-[10px] font-bold text-emerald-950 ring-2 ring-emerald-300/30">
              MR
            </span>
          </div>

          {/* Mic on indicator */}
          <span className="absolute bottom-1 right-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-emerald-400 text-emerald-950 ring-1 ring-emerald-950/50">
            <Mic className="h-2 w-2" />
          </span>

          {/* "Speaking" label */}
          <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1 py-px font-mono text-[7px] text-white/80">
            Maya · host
          </span>
        </div>
      </div>

      {/* Live chat reactions rising */}
      <div className="absolute right-2 bottom-8 z-20 flex flex-col items-end gap-1">
        <ChatBubble text="🔥 makes sense"  delay="0s"   />
        <ChatBubble text="ohh nice"        delay="2.6s" />
        <ChatBubble text="🙏 thank you"    delay="5.2s" />
      </div>

      {/* Audio waveform across the bottom */}
      <Waveform />

      {/* Time scrubber */}
      <div className="absolute bottom-1.5 right-2 z-10 font-mono text-[8px] text-white/60">
        12:34 / 60:00
      </div>
    </div>
  )
}

function ChatBubble({ text, delay }: { text: string; delay: string }) {
  return (
    <span
      className="rounded-full bg-white/10 px-2 py-0.5 text-[9px] font-medium text-white/90 backdrop-blur ring-1 ring-white/10"
      style={{ animation: "chat-rise 7.8s ease-in-out infinite", animationDelay: delay, opacity: 0 }}
    >
      {text}
    </span>
  )
}

function Waveform() {
  // 28 bars, varying base heights, each animates with a staggered delay so
  // the pattern looks alive without repeating obviously.
  const bars = Array.from({ length: 28 }, (_, i) => ({
    base: 18 + ((i * 7) % 32),         // base height %
    delay: `${(i * 0.08).toFixed(2)}s`, // stagger
  }))
  return (
    <div className="absolute inset-x-2 bottom-3 z-10 flex h-5 items-end gap-[2px]">
      {bars.map((b, i) => (
        <span
          key={i}
          className="block w-[3px] rounded-full bg-gradient-to-t from-emerald-400 to-emerald-200"
          style={{
            height: `${b.base}%`,
            animation: "wave-bounce 1.4s ease-in-out infinite",
            animationDelay: b.delay,
          }}
        />
      ))}
    </div>
  )
}

function MiniCard({
  tone, title, body, icon,
}: { tone: "primary" | "accent"; title: string; body: string; icon: React.ReactNode }) {
  const cls = tone === "primary"
    ? "border-primary/30 bg-primary/5 text-primary"
    : "border-amber-500/30 bg-amber-500/5 text-amber-700"
  return (
    <div className={`rounded-md border p-1.5 ${cls.replace("text-primary", "").replace("text-amber-700", "")}`}>
      <div className={`inline-flex items-center gap-1 text-[10px] font-semibold ${tone === "primary" ? "text-primary" : "text-amber-700"}`}>
        {icon}
        {title}
      </div>
      <p className="mt-0.5 text-[9px] text-muted-foreground">{body}</p>
    </div>
  )
}

function AnimatedAttendance() {
  // Pure-CSS counter is overkill; use a marquee-style stack that swaps the
  // last digit so it feels like the count is climbing. No JS, no state.
  return (
    <span className="relative inline-block w-6 overflow-hidden align-middle">
      <span
        className="block"
        style={{ animation: "tick-up 9s steps(4, end) infinite" }}
      >
        18<br />19<br />20<br />21<br />18
      </span>
    </span>
  )
}

// ============================================================
// Floating accent cards
// ============================================================

function FloatingCard({
  className = "",
  delay = "0s",
  children,
}: {
  className?: string
  delay?: string
  children: React.ReactNode
}) {
  return (
    <div
      className={className}
      style={{
        animation: "float-soft 9s ease-in-out infinite",
        animationDelay: delay,
      }}
    >
      {children}
    </div>
  )
}

function WallCard() {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xl">
      <div className="relative aspect-[4/3] bg-muted/20">
        <img src="/images/home/wall-of-love.png" alt="Student showing portfolio" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-br from-rose-500/10 via-transparent to-amber-400/10" />
        <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-rose-500 px-1.5 py-0.5 text-[8px] font-bold text-white shadow">
          <Heart className="h-2.5 w-2.5 fill-current" /> Wall of Love
        </span>
      </div>
      <p className="px-3 py-2 text-[10px] leading-snug">
        &quot;Shipped my first portfolio site!&quot;
        <span className="mt-0.5 block text-[9px] text-muted-foreground">— Aanya R.</span>
      </p>
    </div>
  )
}

function LeaderboardCard() {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xl">
      <div className="flex items-center gap-1.5 border-b border-border/60 bg-muted/40 px-2.5 py-1.5">
        <Trophy className="h-3 w-3 text-amber-500" />
        <span className="text-[10px] font-bold uppercase tracking-wide">Leaderboard</span>
        <span className="ml-auto rounded-full bg-success/15 px-1.5 py-0 text-[8px] font-semibold text-success">
          This week
        </span>
      </div>
      <ul className="divide-y divide-border/60">
        {[
          { r: 1, n: "Aanya R.",  p: 285, medal: "🥇" },
          { r: 2, n: "Vikram M.", p: 240, medal: "🥈" },
          { r: 3, n: "Sara T.",   p: 215, medal: "🥉" },
        ].map((e) => (
          <li key={e.r} className="flex items-center gap-2 px-2.5 py-1.5 text-[10px]">
            <span className="w-4 text-center">{e.medal}</span>
            <span className="flex-1 truncate font-medium">{e.n}</span>
            <span className="font-mono text-[9px] font-bold tabular-nums">{e.p}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function CertificateCard() {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card p-3 shadow-xl">
      <p className="text-center font-mono text-[7px] uppercase tracking-[0.18em] text-muted-foreground">
        Certificate
      </p>
      <p className="mt-1 text-center font-serif text-[11px] font-bold leading-tight">Aanya Rao</p>
      <p className="mt-0.5 text-center text-[7px] text-muted-foreground">has completed</p>
      <p className="text-center text-[8px] font-semibold">UX Foundations</p>
      <div className="mt-2 flex items-center justify-between">
        <span className="font-mono text-[6px] text-muted-foreground">CERT-A1B2C3</span>
        <Award className="h-3 w-3 text-amber-500" />
      </div>
    </div>
  )
}

function SaleToast() {
  return (
    <div className="flex items-start gap-2 rounded-xl border border-border bg-card p-3 shadow-xl">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-success/15 text-success">
        <ShoppingBag className="h-3.5 w-3.5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold leading-tight">New sale · ₹4,999</p>
        <p className="text-[9px] text-muted-foreground">Priya bought UX Foundations</p>
      </div>
      <span className="text-[8px] text-muted-foreground">2m</span>
    </div>
  )
}

// ============================================================
// Sparkles
// ============================================================

function Sparkle({ className = "", delay = "0s" }: { className?: string; delay?: string }) {
  return (
    <span
      className={`pointer-events-none h-2 w-2 rounded-full bg-accent ${className}`}
      style={{
        animation: "sparkle-pulse 2.6s ease-in-out infinite",
        animationDelay: delay,
        boxShadow: "0 0 12px 2px rgba(212,175,55,0.4)",
      }}
    />
  )
}
