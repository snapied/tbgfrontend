"use client"

import {
  Award,
  BookOpen,
  Briefcase,
  Building2,
  Calendar,
  CheckCircle2,
  ClipboardCheck,
  CreditCard,
  Crown,
  Globe,
  GraduationCap,
  Heart,
  Languages,
  Mic,
  Play,
  Radio,
  Send,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  TrendingUp,
  Trophy,
  UserCheck,
  Users,
  Video,
  Wifi,
} from "lucide-react"

/**
 * Persona "scenes" used on the /use-cases page. Each scene is a hand-
 * crafted, layered SVG/HTML composition that shows what that user's
 * workspace actually feels like — instead of a generic icon-in-a-circle
 * decoration. Pure CSS/SVG so they animate everywhere and weigh nothing.
 */

// ============================================================
// Shared frame
// ============================================================

function SceneFrame({
  tint = "from-secondary/40 via-background to-secondary/20",
  bgImage,
  children,
}: {
  tint?: string
  bgImage?: string
  children: React.ReactNode
}) {
  return (
    <div className={`relative aspect-square w-full overflow-hidden rounded-2xl border border-border bg-gradient-to-br ${tint} p-4`}>
      {bgImage && (
        <div className="absolute inset-0 z-0">
          <img src={bgImage} alt="" className="h-full w-full object-cover opacity-60 dark:opacity-40" />
          <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/40 to-transparent" />
        </div>
      )}
      {/* Soft accent blobs */}
      <div className="pointer-events-none absolute -top-10 -right-10 z-0 h-32 w-32 rounded-full bg-primary/10 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-10 -left-10 z-0 h-32 w-32 rounded-full bg-accent/10 blur-2xl" />
      <div className="relative z-10 h-full w-full">
        {children}
      </div>
    </div>
  )
}

function Sparkle({ className = "", delay = "0s" }: { className?: string; delay?: string }) {
  return (
    <span
      className={`pointer-events-none absolute h-1.5 w-1.5 rounded-full bg-accent ${className}`}
      style={{
        animation: "sparkle-pulse 2.6s ease-in-out infinite",
        animationDelay: delay,
        boxShadow: "0 0 10px 2px rgba(212,175,55,0.4)",
      }}
    />
  )
}

// ============================================================
// 1. Solo creator — one person, one brand, one busy day
// ============================================================

export function SoloCreatorScene() {
  return (
    <SceneFrame 
      tint="from-rose-100/60 via-background to-amber-100/40 dark:from-rose-950/30 dark:to-amber-950/20"
      bgImage="/images/use-cases/solo.png"
    >
      {/* Centre: creator's workspace browser */}
      <div className="absolute inset-x-4 top-6 bottom-10 overflow-hidden rounded-xl border border-border bg-card shadow-lg">
        <div className="flex items-center gap-1.5 border-b border-border/60 bg-muted/40 px-2 py-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-rose-400/70" />
          <span className="h-1.5 w-1.5 rounded-full bg-amber-400/70" />
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400/70" />
          <span className="ml-1.5 font-mono text-[8px] text-muted-foreground truncate">maya.thebigclass.com</span>
        </div>
        <div className="p-3">
          {/* Creator header */}
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-rose-400 to-amber-400 text-[10px] font-bold text-white">M</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[10px] font-bold">Maya · Studio Cohort</p>
              <p className="text-[8px] text-muted-foreground">Wed · 6 things to ship today</p>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-1.5 py-0.5 text-[8px] font-semibold text-success">
              <Wifi className="h-2 w-2" /> Live
            </span>
          </div>

          {/* Today's lineup */}
          <p className="mt-3 text-[8px] font-bold uppercase tracking-wide text-muted-foreground">Today</p>
          <div className="mt-1 space-y-1">
            {[
              { Icon: Mic,            t: "Record Module 2 · 24 min",    when: "10:00",  done: true  },
              { Icon: Video,          t: "Live Q&A — Hooks",            when: "6:00 pm", live: true },
              { Icon: ShoppingBag,    t: "Tune storefront copy",        when: "9:00 pm" },
            ].map((row, i) => (
              <div key={i} className={`flex items-center gap-1.5 rounded-md border px-1.5 py-1 text-[9px] ${row.live ? "border-rose-400/40 bg-rose-500/5" : row.done ? "border-success/30 bg-success/5" : "border-border bg-card"}`}>
                <row.Icon className={`h-2.5 w-2.5 ${row.live ? "text-rose-500" : row.done ? "text-success" : "text-primary"}`} />
                <span className="flex-1 truncate font-medium">{row.t}</span>
                <span className="font-mono text-[7px] text-muted-foreground">{row.when}</span>
                {row.done && <CheckCircle2 className="h-2.5 w-2.5 text-success" />}
                {row.live && <span className="inline-flex items-center gap-0.5 rounded-full bg-rose-500 px-1 py-px text-[6px] font-bold text-white"><span className="h-0.5 w-0.5 animate-pulse rounded-full bg-current" />LIVE</span>}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Floating sale toast — top-left */}
      <div
        className="absolute top-3 left-2 z-20 flex items-center gap-1.5 rounded-lg border border-border bg-card p-1.5 shadow-md rotate-[-3deg]"
        style={{ animation: "float-soft 6s ease-in-out infinite" }}
      >
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-success/15 text-success">
          <ShoppingBag className="h-3 w-3" />
        </div>
        <div className="min-w-0">
          <p className="text-[8px] font-bold">+₹4,999</p>
          <p className="text-[7px] text-muted-foreground">Priya · UX Foundations</p>
        </div>
      </div>

      {/* Floating quote — bottom-right */}
      <div
        className="absolute bottom-3 right-2 z-20 max-w-[120px] rounded-lg border border-border bg-card p-2 shadow-md rotate-[3deg]"
        style={{ animation: "float-soft 7s ease-in-out infinite", animationDelay: "-2s" }}
      >
        <p className="font-serif text-[9px] italic leading-tight">&quot;Worth every rupee.&quot;</p>
        <p className="mt-0.5 text-[7px] text-muted-foreground">— Aanya R.</p>
      </div>

      {/* Bottom strip — channel badges */}
      <div className="absolute inset-x-4 bottom-2 flex items-center justify-center gap-1.5">
        <span className="inline-flex items-center gap-0.5 rounded-full border border-border bg-card px-1.5 py-0.5 text-[7px] font-semibold">
          <Video className="h-2 w-2 text-rose-500" /> Class
        </span>
        <span className="inline-flex items-center gap-0.5 rounded-full border border-border bg-card px-1.5 py-0.5 text-[7px] font-semibold">
          <BookOpen className="h-2 w-2 text-emerald-500" /> Course
        </span>
        <span className="inline-flex items-center gap-0.5 rounded-full border border-border bg-card px-1.5 py-0.5 text-[7px] font-semibold">
          <ShoppingBag className="h-2 w-2 text-amber-500" /> Store
        </span>
      </div>

      <Sparkle className="top-[40%] left-[8%]" delay="0s"   />
      <Sparkle className="top-[20%] right-[14%]" delay="1.3s" />
    </SceneFrame>
  )
}

// ============================================================
// 2. School / coaching institute — many teachers, one brand
// ============================================================

export function SchoolScene() {
  const teachers = [
    { i: "RM", color: "from-sky-400 to-sky-700" },
    { i: "NV", color: "from-violet-400 to-violet-700" },
    { i: "PK", color: "from-emerald-400 to-emerald-700" },
    { i: "AS", color: "from-amber-400 to-amber-700" },
    { i: "JD", color: "from-rose-400 to-rose-700" },
    { i: "VG", color: "from-indigo-400 to-indigo-700" },
  ]
  return (
    <SceneFrame 
      tint="from-sky-100/60 via-background to-indigo-100/40 dark:from-sky-950/30 dark:to-indigo-950/20"
      bgImage="/images/use-cases/school.png"
    >
      {/* Brand bar */}
      <div className="absolute inset-x-4 top-4 flex items-center gap-2 rounded-lg border border-border bg-card px-2 py-1.5 shadow-sm">
        <div className="flex h-5 w-5 items-center justify-center rounded bg-primary text-[8px] font-bold text-primary-foreground">SS</div>
        <p className="flex-1 text-[10px] font-bold">Sunrise School · Cohort 2026</p>
        <span className="inline-flex items-center gap-0.5 rounded-full bg-success/15 px-1.5 py-0.5 text-[7px] font-semibold text-success">
          <Users className="h-2 w-2" /> 6 teachers
        </span>
      </div>

      {/* Instructor grid */}
      <div className="absolute inset-x-4 top-14 grid grid-cols-3 gap-1.5">
        {teachers.map((t, i) => (
          <div key={i} className="overflow-hidden rounded-md border border-border bg-card p-1.5">
            <span className={`flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br text-[9px] font-bold text-white ${t.color}`}>{t.i}</span>
            <p className="mt-1 text-[8px] font-semibold truncate">{["Math","Physics","Chem","Bio","English","CS"][i]}</p>
            <div className="mt-0.5 h-1 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary" style={{ width: `${50 + i * 8}%` }} />
            </div>
          </div>
        ))}
      </div>

      {/* Roster strip */}
      <div className="absolute inset-x-4 bottom-12 rounded-md border border-border bg-card p-2 shadow-sm">
        <div className="flex items-center gap-1.5 text-[9px]">
          <UserCheck className="h-3 w-3 text-primary" />
          <span className="font-bold">240 students imported</span>
          <span className="ml-auto font-mono text-[8px] text-muted-foreground">CSV · 6 batches</span>
        </div>
        <div className="mt-1 flex -space-x-1">
          {Array.from({ length: 9 }).map((_, i) => (
            <span
              key={i}
              className="flex h-4 w-4 items-center justify-center rounded-full border border-card text-[6px] font-bold text-white"
              style={{ background: `hsl(${(i * 38) % 360} 70% 55%)` }}
            >
              {String.fromCharCode(65 + i)}
            </span>
          ))}
          <span className="ml-1 flex h-4 items-center rounded-full border border-card bg-muted px-1 text-[7px] font-bold">+231</span>
        </div>
      </div>

      {/* Parent comm toast */}
      <div
        className="absolute right-2 bottom-2 z-20 rounded-lg border border-border bg-card p-1.5 shadow-md rotate-[-2deg]"
        style={{ animation: "float-soft 7s ease-in-out infinite", animationDelay: "-1s" }}
      >
        <p className="flex items-center gap-1 text-[7px] font-bold text-emerald-600">
          <Send className="h-2 w-2" /> Parent reminder
        </p>
        <p className="text-[7px] text-muted-foreground">240 WhatsApp · 240 email</p>
      </div>

      <Sparkle className="top-[12%] left-[10%]" delay="0s" />
      <Sparkle className="bottom-[36%] right-[8%]" delay="1.8s" />
    </SceneFrame>
  )
}

// ============================================================
// 3. College / university — department-led + SSO + your domain
// ============================================================

export function CollegeScene() {
  const deps = [
    { Icon: GraduationCap, t: "Computer Science",    n: 412, color: "from-sky-400 to-sky-700" },
    { Icon: Building2,     t: "Architecture",        n: 158, color: "from-amber-400 to-amber-700" },
    { Icon: BookOpen,      t: "Design",              n: 290, color: "from-violet-400 to-violet-700" },
    { Icon: TrendingUp,    t: "Business",            n: 380, color: "from-emerald-400 to-emerald-700" },
  ]
  return (
    <SceneFrame 
      tint="from-slate-100 via-background to-secondary/40 dark:from-slate-900/40 dark:to-secondary/20"
      bgImage="/images/use-cases/college.png"
    >
      {/* Custom-domain browser bar */}
      <div className="absolute inset-x-4 top-4 rounded-lg border border-border bg-card shadow-sm overflow-hidden">
        <div className="flex items-center gap-1.5 border-b border-border/60 bg-muted/40 px-2 py-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-rose-400/70" />
          <span className="h-1.5 w-1.5 rounded-full bg-amber-400/70" />
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400/70" />
          <span className="ml-2 inline-flex items-center gap-1 rounded-full border border-border bg-background px-2 py-0.5 font-mono text-[8px]">
            <ShieldCheck className="h-2 w-2 text-success" />
            learn.youruniversity.edu
          </span>
        </div>
      </div>

      {/* Department grid */}
      <div className="absolute inset-x-4 top-14 grid grid-cols-2 gap-1.5">
        {deps.map((d, i) => (
          <div key={i} className="overflow-hidden rounded-md border border-border bg-card">
            <div className={`h-6 bg-gradient-to-br ${d.color} flex items-center justify-center`}>
              <d.Icon className="h-3 w-3 text-white" />
            </div>
            <div className="p-1.5">
              <p className="text-[8px] font-bold leading-tight">{d.t}</p>
              <div className="mt-0.5 flex items-center justify-between">
                <span className="text-[7px] text-muted-foreground">{d.n} enrolled</span>
                <span className="font-mono text-[7px] font-bold">{Math.round(d.n / 6)} this wk</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* SSO chips */}
      <div className="absolute inset-x-4 bottom-12 rounded-md border border-border bg-card p-2 shadow-sm">
        <p className="text-[8px] font-bold uppercase tracking-wide text-muted-foreground">Single sign-on</p>
        <div className="mt-1 flex flex-wrap gap-1">
          <SsoChip label="Google Workspace" letter="G" color="bg-blue-500" />
          <SsoChip label="Microsoft 365"    letter="M" color="bg-orange-500" />
          <span className="inline-flex items-center gap-0.5 rounded-full border border-success/30 bg-success/5 px-1.5 py-0.5 text-[7px] font-semibold text-success">
            <CheckCircle2 className="h-2 w-2" /> Active
          </span>
        </div>
      </div>

      {/* Floating degree certificate */}
      <div
        className="absolute right-2 bottom-2 z-20 w-[110px] rounded-md border border-border bg-card p-2 shadow-md rotate-[2deg]"
        style={{ animation: "float-soft 7s ease-in-out infinite", animationDelay: "-1.6s" }}
      >
        <p className="text-center font-mono text-[6px] uppercase tracking-[0.18em] text-muted-foreground">Diploma</p>
        <p className="mt-0.5 text-center font-serif text-[10px] font-bold leading-tight">Class of 2026</p>
        <p className="text-center text-[7px] text-muted-foreground">412 verified</p>
        <Award className="mx-auto mt-1 h-3 w-3 text-amber-500" />
      </div>

      <Sparkle className="top-[14%] right-[12%]" delay="0.4s" />
      <Sparkle className="top-[58%] left-[8%]"   delay="2.1s" />
    </SceneFrame>
  )
}

function SsoChip({ label, letter, color }: { label: string; letter: string; color: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-1.5 py-0.5 text-[8px] font-medium">
      <span className={`flex h-3 w-3 items-center justify-center rounded-sm text-[7px] font-bold text-white ${color}`}>{letter}</span>
      {label}
    </span>
  )
}

// ============================================================
// 4. Corporate L&D — onboarding tracks + manager view + LinkedIn cert
// ============================================================

export function CorporateScene() {
  const team = [
    { n: "Priya",   pct: 100, badge: "Done" },
    { n: "Aditya",  pct: 84 },
    { n: "Reema",   pct: 72 },
    { n: "Karan",   pct: 56 },
    { n: "Sara",    pct: 38 },
  ]
  return (
    <SceneFrame 
      tint="from-slate-200/60 via-background to-sky-100/40 dark:from-slate-800/40 dark:to-sky-950/20"
      bgImage="/images/use-cases/corporate.png"
    >
      {/* Header */}
      <div className="absolute inset-x-4 top-4 flex items-center gap-2 rounded-lg border border-border bg-card px-2 py-1.5 shadow-sm">
        <div className="flex h-5 w-5 items-center justify-center rounded-md bg-slate-800 text-[8px] font-bold text-white">
          <Briefcase className="h-3 w-3" />
        </div>
        <p className="flex-1 text-[10px] font-bold">Onboarding · Sales Q3 cohort</p>
        <span className="font-mono text-[8px] text-muted-foreground">84%</span>
      </div>

      {/* Team progress list */}
      <div className="absolute inset-x-4 top-14 rounded-lg border border-border bg-card p-2 shadow-sm">
        <p className="mb-1 text-[8px] font-bold uppercase tracking-wide text-muted-foreground">Team progress</p>
        <ul className="space-y-1">
          {team.map((t, i) => (
            <li key={i} className="flex items-center gap-1.5 text-[8px]">
              <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[7px] font-bold text-white ${t.badge ? "bg-success" : "bg-primary/60"}`}>
                {t.n[0]}
              </span>
              <span className="w-12 truncate font-medium">{t.n}</span>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                <div className={`h-full rounded-full ${t.badge ? "bg-success" : "bg-primary"}`} style={{ width: `${t.pct}%` }} />
              </div>
              <span className="font-mono text-[7px] tabular-nums">{t.pct}%</span>
              {t.badge && <CheckCircle2 className="h-2.5 w-2.5 text-success" />}
            </li>
          ))}
        </ul>
      </div>

      {/* AMA card */}
      <div className="absolute inset-x-4 bottom-12 flex items-center gap-2 rounded-md border border-rose-500/30 bg-rose-500/5 px-2 py-1.5 shadow-sm">
        <Radio className="h-3 w-3 text-rose-500" />
        <div className="flex-1">
          <p className="text-[9px] font-bold">VP Sales AMA · Wed 4 pm</p>
          <p className="text-[7px] text-muted-foreground">Recurring · weekly · 12 attendees confirmed</p>
        </div>
        <span className="inline-flex items-center gap-0.5 rounded-full bg-rose-500 px-1 py-0.5 text-[6px] font-bold text-white">
          <span className="h-0.5 w-0.5 animate-pulse rounded-full bg-current" /> LIVE
        </span>
      </div>

      {/* LinkedIn share cert */}
      <div
        className="absolute right-2 bottom-2 z-20 w-[120px] rounded-md border border-border bg-card p-2 shadow-md rotate-[-2deg]"
        style={{ animation: "float-soft 8s ease-in-out infinite", animationDelay: "-3s" }}
      >
        <div className="flex items-center justify-between">
          <span className="inline-flex h-3 items-center justify-center rounded-sm bg-[#0a66c2] px-1 text-[6px] font-bold text-white">in</span>
          <span className="text-[6px] text-muted-foreground">Shared 8h ago</span>
        </div>
        <p className="mt-1 text-[8px] font-bold leading-tight">Priya completed Sales Onboarding</p>
        <p className="text-[7px] text-muted-foreground">CERT-Z7K2M9 · verified</p>
        <div className="mt-1 flex items-center gap-1 text-[7px] text-muted-foreground">
          <Heart className="h-2 w-2" /> 42
          <CreditCard className="ml-1 h-2 w-2" /> 8 comments
        </div>
      </div>

      <Sparkle className="top-[12%] right-[12%]" delay="0s" />
      <Sparkle className="top-[50%] left-[8%]"   delay="1.4s" />
    </SceneFrame>
  )
}

// ============================================================
// 5. NGO — WhatsApp-first reminders + multilingual + free badge
// ============================================================

export function NgoScene() {
  return (
    <SceneFrame 
      tint="from-emerald-100/60 via-background to-amber-100/40 dark:from-emerald-950/30 dark:to-amber-950/20"
      bgImage="/images/use-cases/ngo.png"
    >
      {/* Forever-free top ribbon */}
      <div className="absolute inset-x-4 top-4 flex items-center justify-between rounded-lg border border-success/30 bg-success/5 px-2 py-1.5 shadow-sm">
        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-success">
          <Heart className="h-3 w-3 fill-current" /> Free forever · Starter
        </span>
        <span className="font-mono text-[8px] text-success">50 students · 3 courses</span>
      </div>

      {/* Phone with WhatsApp reminder */}
      <div className="absolute left-3 top-14 w-[40%] rotate-[-4deg]">
        <div className="relative aspect-[9/16] rounded-[12px] border border-border bg-slate-900 p-1 shadow-md">
          <div className="absolute left-1/2 top-1 h-1 w-6 -translate-x-1/2 rounded-full bg-slate-700" />
          <div className="h-full overflow-hidden rounded-[8px] bg-card p-1 pt-3">
            <div className="rounded-lg rounded-bl-sm bg-emerald-100 dark:bg-emerald-950/40 p-1.5">
              <p className="text-[6px] font-bold text-emerald-700 dark:text-emerald-300">📚 Saksham Training</p>
              <p className="mt-0.5 text-[6px] leading-tight">Aaj sham 5 baje session · field worker module 3</p>
              <p className="mt-0.5 text-[5px] text-emerald-700 dark:text-emerald-400 underline truncate">meet.google.com/abc</p>
            </div>
            <p className="mt-1 text-right text-[5px] text-muted-foreground">4:30 pm ✓✓</p>
          </div>
        </div>
      </div>

      {/* Lesson cards in multiple languages */}
      <div className="absolute right-3 top-14 w-[50%] space-y-1">
        {[
          { l: "हिन्दी", t: "नल जल अनुप्रयोग",  k: "Hindi" },
          { l: "தமிழ்",  t: "முதலுதவி பயிற்சி",  k: "Tamil" },
          { l: "Eng",    t: "WASH essentials",  k: "English" },
        ].map((l, i) => (
          <div key={i} className="rounded-md border border-border bg-card p-1.5">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[6px] font-bold text-amber-700 dark:text-amber-400">
                <Languages className="h-2 w-2" /> {l.k}
              </span>
              <span className="text-[6px] font-mono text-muted-foreground">8 min</span>
            </div>
            <p className="mt-1 text-[8px] font-semibold leading-tight">{l.t}</p>
            <div className="mt-0.5 flex items-center gap-1 text-[7px] text-muted-foreground">
              <Play className="h-2 w-2 text-primary" /> Lesson 3 of 6
            </div>
          </div>
        ))}
      </div>

      {/* Beneficiary stat */}
      <div className="absolute inset-x-4 bottom-2 rounded-md border border-border bg-card p-2 shadow-sm">
        <div className="flex items-center gap-2 text-[9px]">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-700">
            <Users className="h-4 w-4" />
          </div>
          <div className="flex-1">
            <p className="font-bold">1,240 beneficiaries reached</p>
            <p className="text-[7px] text-muted-foreground">across 18 villages · 3 districts · ₹0 infra cost</p>
          </div>
          <Trophy className="h-3 w-3 text-amber-500" />
        </div>
      </div>

      <Sparkle className="top-[20%] left-[44%]" delay="0s" />
      <Sparkle className="bottom-[28%] left-[8%]" delay="1.7s" />
    </SceneFrame>
  )
}

// ============================================================
// Dispatcher — picks the right scene for a given use-case id
// ============================================================

export function UseCaseScene({ id }: { id: string }) {
  switch (id) {
    case "solo-instructor": return <SoloCreatorScene />
    case "school":          return <SchoolScene />
    case "college":         return <CollegeScene />
    case "corporate":       return <CorporateScene />
    case "ngo":             return <NgoScene />
    default: return <SoloCreatorScene />
  }
}
