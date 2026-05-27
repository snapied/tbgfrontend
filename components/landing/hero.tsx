"use client"

// Above-the-fold hero — creator-business OS positioning.
//
// Visual = a modern animated dashboard preview that shows the product
// in action. Glassmorphism cards, animated activity indicators, floating
// metric chips, and subtle entrance animations replace the old static
// tilted-card mosaic.

import Link from "next/link"
import { useEffect, useState } from "react"
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  CheckCircle2,
  Globe2,
  IndianRupee,
  Play,
  ShoppingBag,
  Sparkles,
  TrendingUp,
  Users,
  Video,
  Zap,
} from "lucide-react"
import { HeroCTAClaim } from "@/components/landing/hero-cta-claim"

export function LandingHero() {
  return (
    <section className="relative overflow-hidden">
      {/* Background — multi-layer gradient mesh */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-background" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(var(--primary-rgb,79,70,229),0.12),transparent)]" />

      {/* Animated gradient orbs */}
      <div
        className="pointer-events-none absolute -top-40 -left-20 h-[600px] w-[600px] rounded-full opacity-30 blur-[100px]"
        style={{
          background: "radial-gradient(circle, hsl(var(--primary)/0.4) 0%, transparent 70%)",
          animation: "orbFloat 8s ease-in-out infinite",
        }}
      />
      <div
        className="pointer-events-none absolute -bottom-20 right-0 h-[500px] w-[500px] rounded-full opacity-20 blur-[100px]"
        style={{
          background: "radial-gradient(circle, hsl(263 70% 60%/0.4) 0%, transparent 70%)",
          animation: "orbFloat 10s ease-in-out infinite reverse",
        }}
      />
      <div
        className="pointer-events-none absolute top-1/2 left-1/2 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-10 blur-[80px]"
        style={{
          background: "radial-gradient(circle, hsl(142 76% 36%/0.5) 0%, transparent 70%)",
          animation: "orbFloat 12s ease-in-out infinite 2s",
        }}
      />

      {/* Grid pattern overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)`,
          backgroundSize: "64px 64px",
        }}
      />

      <div className="relative mx-auto max-w-7xl px-6 py-20 sm:py-24 lg:px-8 lg:py-28">
        <div className="grid items-center gap-14 lg:grid-cols-[1fr_1.1fr] lg:gap-16">

          {/* LEFT — copy column */}
          <div style={{ animation: "fadeSlideUp 0.7s ease-out both" }}>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/8 px-3.5 py-1.5 text-xs font-semibold text-primary shadow-[0_0_20px_-8px] shadow-primary/40">
              <Sparkles className="h-3 w-3" />
              Built India-first · Loved worldwide
            </div>

            <h1 className="mt-5 text-balance text-5xl font-black leading-[1.02] tracking-[-0.03em] sm:text-6xl lg:text-7xl">
              Build your{" "}
              <span className="relative inline-block">
                <span className="relative z-10 bg-gradient-to-r from-primary via-violet-500 to-primary bg-clip-text text-transparent"
                  style={{ backgroundSize: "200% auto", animation: "shimmer 4s linear infinite" }}>
                  independent
                </span>
              </span>
              {" "}teaching brand.
            </h1>

            <p className="mt-5 max-w-xl text-balance text-lg leading-relaxed text-muted-foreground">
              One workspace to host your audience, ship your products, run your community,
              go live, and get paid — on your own URL, with{" "}
              <span className="font-semibold text-foreground">zero commission</span>.
            </p>

            <div className="mt-8">
              <HeroCTAClaim />
            </div>

            <p className="mt-4 text-sm text-muted-foreground">
              Or{" "}
              <Link
                href="/p/snapied"
                className="inline-flex items-center gap-1 font-semibold text-primary underline-offset-2 hover:underline"
              >
                see a live creator site
                <ArrowRight className="h-3 w-3" />
              </Link>
              {" "}· No card needed.
            </p>

            {/* Trust chips */}
            <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
              <TrustChip label="0% commission" />
              <TrustChip label="UPI + Cards" />
              <TrustChip label="Custom domain" />
              <TrustChip label="One-click export" />
            </div>
          </div>

          {/* RIGHT — animated dashboard visual */}
          <div
            className="relative w-full"
            style={{ animation: "fadeSlideUp 0.7s ease-out 0.15s both" }}
          >
            <HeroDashboard />
          </div>
        </div>
      </div>

      {/* Keyframe injector */}
      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes orbFloat {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33%       { transform: translate(30px, -30px) scale(1.05); }
          66%       { transform: translate(-20px, 20px) scale(0.95); }
        }
        @keyframes shimmer {
          from { background-position: 0% center; }
          to   { background-position: 200% center; }
        }
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.5; transform: scale(0.8); }
        }
        @keyframes countUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes floatIn0 { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        @keyframes floatIn1 { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        @keyframes barGrow { from { width: 0; } to { width: var(--bar-w); } }
        @keyframes avatarPop {
          from { opacity: 0; transform: scale(0.7); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </section>
  )
}

// ─── Hero Dashboard ───────────────────────────────────────────────────────────

function HeroDashboard() {
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 2200)
    return () => clearInterval(id)
  }, [])

  const revenue = [84210, 91440, 88920, 97600, 102340, 89870, 114200]
  const todayRev = revenue[tick % revenue.length]

  return (
    <div className="relative mx-auto w-full max-w-[560px]">

      {/* Ambient glow behind the cards */}
      <div className="pointer-events-none absolute inset-8 rounded-3xl bg-primary/5 blur-2xl" />

      {/* ── Main card — live class console ───────────────────────── */}
      <div
        className="relative z-10 overflow-hidden rounded-2xl border border-border/60 bg-card/80 p-5 shadow-2xl backdrop-blur-xl"
        style={{ boxShadow: "0 32px 80px -16px rgba(0,0,0,0.25), 0 0 0 1px hsl(var(--border)/0.6), inset 0 1px 0 hsl(var(--border)/0.3)" }}
      >
        {/* Glass highlight */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

        {/* Top bar */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-500/15">
              <Video className="h-3.5 w-3.5 text-rose-500" />
            </div>
            <div>
              <p className="text-xs font-bold leading-none">Week 3 · Cohort B</p>
              <p className="mt-0.5 text-[10px] text-muted-foreground">Advanced React Patterns</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-rose-500/10 px-2.5 py-1">
            <span
              className="h-1.5 w-1.5 rounded-full bg-rose-500"
              style={{ animation: "pulse-dot 1.4s ease-in-out infinite" }}
            />
            <span className="text-[10px] font-bold text-rose-500">LIVE</span>
            <span className="text-[10px] text-rose-500/70">· 142 watching</span>
          </div>
        </div>

        {/* Screen share preview */}
        <div className="relative mb-4 overflow-hidden rounded-xl bg-gradient-to-br from-slate-900 to-slate-800"
          style={{ aspectRatio: "16/7" }}>
          {/* Code on screen */}
          <div className="absolute inset-0 p-3 font-mono text-[8px] leading-relaxed text-slate-400 opacity-70">
            <span className="text-violet-400">const</span>{" "}
            <span className="text-sky-300">useSubscription</span>{" "}
            <span className="text-slate-300">= (planId) {"=>"} {"{"}</span>
            <br />
            {"  "}<span className="text-violet-400">const</span>{" "}
            <span className="text-slate-300">[data, setData] =</span>{" "}
            <span className="text-sky-300">useState</span>
            <span className="text-slate-300">(null)</span>
            <br />
            {"  "}<span className="text-violet-400">useEffect</span>
            <span className="text-slate-300">{"(() => {"}</span>
            <br />
            {"    "}<span className="text-sky-300">fetchPlan</span>
            <span className="text-slate-300">(planId).then(setData)</span>
            <br />
            {"  "}<span className="text-slate-300">{"}, [planId])"}</span>
          </div>
          {/* Host video pip */}
          <div className="absolute bottom-2 right-2 h-12 w-16 overflow-hidden rounded-lg border border-white/10 bg-gradient-to-br from-slate-700 to-slate-600">
            <div className="flex h-full items-center justify-center">
              <div className="h-6 w-6 rounded-full bg-gradient-to-br from-violet-400 to-primary" />
            </div>
          </div>
          {/* Recording badge */}
          <div className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 backdrop-blur-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-500"
              style={{ animation: "pulse-dot 1s ease-in-out infinite" }} />
            <span className="text-[9px] font-bold text-white">REC</span>
          </div>
        </div>

        {/* Participant row */}
        <div className="flex items-center gap-3">
          <div className="flex -space-x-2">
            {["🧑‍💻", "👩‍🎓", "🧑‍🎨", "👩‍💼", "🧑‍🔬"].map((emoji, i) => (
              <div
                key={i}
                className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-card bg-gradient-to-br from-primary/20 to-violet-500/20 text-xs"
                style={{ animation: `avatarPop 0.4s ease-out ${0.05 * i}s both` }}
              >
                {emoji}
              </div>
            ))}
            <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-card bg-muted text-[9px] font-bold text-muted-foreground">
              +137
            </div>
          </div>
          <div className="flex-1" />
          <div className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-semibold text-primary">
            Auto-transcript ON
          </div>
        </div>
      </div>

      {/* ── Revenue card — bottom-left ────────────────────────────── */}
      <div
        className="absolute -bottom-4 -left-6 z-20 w-52 overflow-hidden rounded-2xl border border-border/60 bg-card/90 p-3.5 shadow-2xl backdrop-blur-xl"
        style={{
          animation: "floatIn0 0.6s ease-out 0.4s both",
          boxShadow: "0 20px 60px -12px rgba(0,0,0,0.3), 0 0 0 1px hsl(var(--border)/0.5)",
        }}
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
        <div className="mb-2 flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-500/15">
            <IndianRupee className="h-3 w-3 text-emerald-600" />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Today&apos;s revenue</span>
        </div>
        <p
          className="text-xl font-black tracking-tight text-foreground"
          key={todayRev}
          style={{ animation: "countUp 0.4s ease-out both" }}
        >
          ₹{todayRev.toLocaleString("en-IN")}
        </p>
        <div className="mt-2 flex items-center gap-1">
          <TrendingUp className="h-3 w-3 text-emerald-500" />
          <span className="text-[10px] font-semibold text-emerald-600">+23% vs last week</span>
        </div>
        {/* Mini bar chart */}
        <div className="mt-2.5 flex items-end gap-0.5 h-6">
          {[55, 70, 60, 80, 65, 90, 100].map((h, i) => (
            <div
              key={i}
              className="flex-1 rounded-sm"
              style={{
                height: `${h}%`,
                background: i === 6
                  ? "hsl(var(--primary))"
                  : "hsl(var(--primary)/0.25)",
              }}
            />
          ))}
        </div>
      </div>

      {/* ── Students card — top-right ─────────────────────────────── */}
      <div
        className="absolute -top-5 -right-6 z-20 w-44 overflow-hidden rounded-2xl border border-border/60 bg-card/90 p-3.5 shadow-2xl backdrop-blur-xl"
        style={{
          animation: "floatIn1 0.6s ease-out 0.55s both",
          boxShadow: "0 20px 60px -12px rgba(0,0,0,0.3), 0 0 0 1px hsl(var(--border)/0.5)",
        }}
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
        <div className="mb-2 flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-sky-500/15">
            <Users className="h-3 w-3 text-sky-500" />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Students</span>
        </div>
        <p className="text-xl font-black tracking-tight">3,847</p>
        <div className="mt-2 space-y-1">
          {[
            { label: "Active", pct: 82, color: "hsl(var(--primary))" },
            { label: "Trial", pct: 12, color: "hsl(200 80% 50%)" },
          ].map(({ label, pct, color }) => (
            <div key={label}>
              <div className="flex justify-between text-[9px] text-muted-foreground mb-0.5">
                <span>{label}</span><span>{pct}%</span>
              </div>
              <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${pct}%`, background: color, transition: "width 1s ease" }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Floating pill — new sale ─────────────────────────────── */}
      <div
        className="absolute -right-3 bottom-16 z-20 flex items-center gap-2 rounded-full border border-emerald-500/20 bg-card/95 px-3 py-1.5 shadow-lg backdrop-blur-xl"
        style={{ animation: "floatIn1 0.5s ease-out 0.8s both" }}
      >
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/15">
          <ShoppingBag className="h-2.5 w-2.5 text-emerald-600" />
        </span>
        <span className="text-[10px] font-bold">New sale · ₹14,999</span>
        <span
          className="h-1.5 w-1.5 rounded-full bg-emerald-500"
          style={{ animation: "pulse-dot 1.2s ease-in-out infinite" }}
        />
      </div>

      {/* ── Floating pill — AI ───────────────────────────────────── */}
      <div
        className="absolute -left-4 top-1/3 z-20 flex items-center gap-2 rounded-full border border-violet-500/20 bg-card/95 px-3 py-1.5 shadow-lg backdrop-blur-xl"
        style={{ animation: "floatIn0 0.5s ease-out 1s both" }}
      >
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-violet-500/15">
          <Zap className="h-2.5 w-2.5 text-violet-500" />
        </span>
        <span className="text-[10px] font-bold">AI transcript ready</span>
      </div>

    </div>
  )
}

// ─── Trust chip ───────────────────────────────────────────────────────────────

function TrustChip({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
      <span className="font-medium text-foreground/75">{label}</span>
    </span>
  )
}
