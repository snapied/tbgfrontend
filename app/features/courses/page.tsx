"use client"

import {
  BookOpen,
  Check,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  Film,
  GripVertical,
  Image as ImageIcon,
  Lock,
  Play,
  Sparkles,
  Type,
  Video,
} from "lucide-react"
import { Header } from "@/components/landing/header"
import { Footer } from "@/components/landing/footer"
import {
  FeatureCTA,
  FeaturePageShell,
  FeatureSplit,
  PreviewFrame,
} from "@/components/landing/feature-page"

export default function CoursesFeaturePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <FeaturePageShell
          eyebrow="Courses"
          title={<>Courses with <span className="text-primary">real structure</span>, not just a video dump.</>}
          subtitle="Modules and lessons. Embedded video. Inline quizzes. Per-lesson progress that rolls up. Everything you'd expect from a real LMS, in a builder that doesn't make you click through five wizards."
          heroImage="/images/features/courses.png"
        />

        <FeatureSplit
          title="A curriculum builder that respects your time."
          body="Drag a module. Drag a lesson into it. Set the type — video, text, PDF, quiz. That's the loop. Resources (Canva, Gamma, Slides, Notion, Figma) embed inline so students don't tab-hop to consume your content."
          bullets={[
            "Drag-and-drop modules + lessons",
            "Video, text, PDF, and quiz lesson types",
            "Inline embeds for Canva / Gamma / Slides / Notion / Figma",
            "Preview lessons that show before purchase",
          ]}
          mockup={<CurriculumBuilderMockup />}
        />

        <FeatureSplit
          reverse
          title="Quizzes that teach, not just grade."
          body="Two grading modes: auto (results instantly, optional answer reveal) or teacher-review (submissions queue, you release results when ready). Per-question feedback. Pass-fail threshold. Shuffle. Time limit. All the knobs without the menu."
          bullets={[
            "Auto-grade or teacher-review modes",
            "Per-question teacher feedback",
            "Pass/fail thresholds with attempt limits",
            "Shareable quiz link works without an account",
          ]}
          mockup={<QuizPlayerMockup />}
        />

        <FeatureSplit
          title="Progress that rolls up cleanly."
          body="Every completed lesson, every quiz attempt, every assignment submission feeds the student's progress bar — and the analytics dashboard. No magic threshold to hit before the data shows up."
          bullets={[
            "Per-lesson completion → per-module → per-course rollup",
            "Per-student performance summary across all enrolled courses",
            "Average quiz score, pass rate, pending teacher reviews",
            "Assignment submission rate + grade distribution",
          ]}
          mockup={<ProgressMockup />}
        />

        {/* Drip + cohort window — newly shipped (Phase 3). Surfaced
            here because "structured release" is a real reason
            cohort-based creators pick a platform; the page used to
            describe a flat always-on course. */}
        <FeatureSplit
          reverse
          title="Cohorts that open on a date. Modules that wait their turn."
          body="Stamp a cohort start date on a community — the batch page shows a live countdown until launch, then a 'wraps in N days' chip while it runs. Pair that with per-module drip — Module 2 unlocks on Day 7, Module 3 on Day 14 — and you have a real program, not just a video library. Students who enroll mid-cohort see their own clock; nobody waits for catch-up logic you have to maintain."
          bullets={[
            "Cohort start + end dates with a countdown banner",
            "Per-module unlock-offset in days (0–365)",
            "Players show 'Unlocks on <date>' instead of an empty lesson list",
            "Every buyer auto-lands in the course's community — no second sale",
          ]}
          mockup={<ProgressMockup />}
        />

        <FeatureCTA />
      </main>
      <Footer />
    </div>
  )
}

// ============================================================
// Mockup #1 — Curriculum builder
// Module/lesson tree with drag handles, completion ticks, lesson
// types coloured, a "selected" lesson with details panel hint.
// ============================================================

function CurriculumBuilderMockup() {
  return (
    <PreviewFrame title="course › ux foundations › curriculum">
      <div className="space-y-2">
        {MODULES.map((m, mi) => (
          <div key={mi} className="overflow-hidden rounded-md border border-border/60 bg-card">
            <div className="flex items-center gap-2 border-b border-border/60 bg-muted/40 px-2 py-1.5">
              <GripVertical className="h-3 w-3 text-muted-foreground" />
              <p className="flex-1 text-[10px] font-semibold">{m.title}</p>
              <span className="font-mono text-[9px] text-muted-foreground">{m.done}/{m.total}</span>
              <div className="h-1 w-12 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: `${(m.done / m.total) * 100}%` }} />
              </div>
            </div>
            <ul>
              {m.lessons.map((l, li) => (
                <li
                  key={li}
                  className={`flex items-center gap-2 border-b border-border/40 px-2 py-1 last:border-0 text-[10px] ${
                    l.selected ? "bg-primary/5 ring-1 ring-primary/30" : ""
                  }`}
                >
                  <GripVertical className="h-2.5 w-2.5 text-muted-foreground/60" />
                  <span className={`flex h-4 w-4 items-center justify-center rounded-full ${
                    l.complete
                      ? "bg-success text-success-foreground"
                      : l.preview
                        ? "bg-accent text-accent-foreground"
                        : "border border-border bg-card"
                  }`}>
                    {l.complete && <Check className="h-2.5 w-2.5" />}
                  </span>
                  <LessonTypeChip type={l.type} />
                  <span className={`flex-1 ${l.locked ? "text-muted-foreground/60" : ""}`}>{l.title}</span>
                  {l.preview && <span className="rounded-full bg-accent/15 px-1.5 py-0.5 text-[8px] font-semibold text-accent-foreground">Preview</span>}
                  {l.duration && <span className="font-mono text-[8px] text-muted-foreground">{l.duration}</span>}
                  {l.locked && <Lock className="h-2.5 w-2.5 text-muted-foreground/60" />}
                </li>
              ))}
            </ul>
          </div>
        ))}
        <button className="flex w-full items-center justify-center gap-1 rounded-md border border-dashed border-border px-2 py-1.5 text-[10px] text-muted-foreground hover:bg-muted/30">
          <Sparkles className="h-3 w-3" /> Add module
        </button>
      </div>
    </PreviewFrame>
  )
}

type LessonType = "video" | "text" | "pdf" | "quiz"
interface MockLesson {
  type: LessonType
  title: string
  duration?: string
  complete?: boolean
  preview?: boolean
  locked?: boolean
  selected?: boolean
}
interface MockModule {
  title: string
  done: number
  total: number
  lessons: MockLesson[]
}
const MODULES: MockModule[] = [
  {
    title: "Module 1 — Foundations",
    done: 4, total: 4,
    lessons: [
      { type: "video" as const, title: "What is UX",          duration: "8m", complete: true,  preview: true },
      { type: "text"  as const, title: "Design heuristics",   duration: "5m", complete: true },
      { type: "quiz"  as const, title: "Module 1 check",      duration: "5 q", complete: true },
      { type: "pdf"   as const, title: "Heuristic worksheet", duration: "PDF", complete: true },
    ],
  },
  {
    title: "Module 2 — Research",
    done: 2, total: 5,
    lessons: [
      { type: "video" as const, title: "User interviews",     duration: "12m", complete: true },
      { type: "video" as const, title: "Synthesis",           duration: "9m",  complete: true },
      { type: "text"  as const, title: "Field-notes template", selected: true, duration: "Read" },
      { type: "quiz"  as const, title: "Research quiz",        duration: "6 q" },
      { type: "pdf"   as const, title: "Sample interviews",    duration: "PDF" },
    ],
  },
  {
    title: "Module 3 — Wireframes",
    done: 0, total: 6,
    lessons: [
      { type: "video" as const, title: "Sketching basics",   duration: "10m", locked: true },
      { type: "video" as const, title: "Hi-fi vs lo-fi",     duration: "7m",  locked: true },
      { type: "text"  as const, title: "Wireframe checklist", duration: "Read", locked: true },
    ],
  },
]

function LessonTypeChip({ type }: { type: "video" | "text" | "pdf" | "quiz" }) {
  const styles =
    type === "video" ? "bg-rose-500/15 text-rose-700 dark:text-rose-300"   :
    type === "text"  ? "bg-sky-500/15 text-sky-700 dark:text-sky-300"      :
    type === "pdf"   ? "bg-amber-500/15 text-amber-700 dark:text-amber-300" :
                       "bg-primary/15 text-primary"
  const Icon =
    type === "video" ? Film :
    type === "text"  ? Type :
    type === "pdf"   ? FileText :
                       ClipboardCheck
  return (
    <span className={`inline-flex items-center gap-0.5 rounded px-1 py-0.5 text-[8px] font-semibold capitalize ${styles}`}>
      <Icon className="h-2.5 w-2.5" />
      {type}
    </span>
  )
}

// ============================================================
// Mockup #2 — Quiz player with rich feedback
// Question + 3 answers (one selected correct, one chosen wrong),
// per-question explanation, progress dots, countdown.
// ============================================================

function QuizPlayerMockup() {
  return (
    <PreviewFrame title="quiz › hooks check · Q3 of 6">
      <div className="space-y-2.5 text-[11px]">
        {/* Progress dots + timer */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            {[true, true, "current", false, false, false].map((s, i) => (
              <span
                key={i}
                className={`h-1.5 w-6 rounded-full ${
                  s === true     ? "bg-success" :
                  s === "current" ? "bg-primary" :
                                   "bg-muted"
                }`}
              />
            ))}
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/15 px-2 py-0.5 font-mono text-[10px] font-bold text-rose-600">
            04:12
          </span>
        </div>

        {/* Question */}
        <div className="rounded-md border border-border bg-card p-2">
          <p className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">Question 3</p>
          <p className="mt-1 font-semibold leading-snug">When does <code className="rounded bg-muted px-1 py-0.5 font-mono text-[10px]">useEffect</code> cleanup run?</p>

          {/* Answers */}
          <div className="mt-2 space-y-1">
            <AnswerRow correct={false} chosen={false} text="Once on mount only" />
            <AnswerRow correct={true}  chosen={true}  text="Before every re-run + on unmount" />
            <AnswerRow correct={false} chosen={false} text="Never — useEffect is fire-and-forget" />
          </div>

          {/* Feedback */}
          <div className="mt-2 flex items-start gap-1.5 rounded border border-success/30 bg-success/5 p-1.5">
            <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-success" />
            <p className="text-[10px] leading-snug">
              <span className="font-semibold text-success">Correct.</span> Returning a function from the effect runs it before the next effect and on unmount — useful for clearing intervals or removing listeners.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between text-[10px]">
          <span className="text-muted-foreground">Pass mark · 60% · auto-grade</span>
          <button className="inline-flex items-center gap-1 rounded-md bg-primary px-2 py-1 font-semibold text-primary-foreground">
            Next question →
          </button>
        </div>
      </div>
    </PreviewFrame>
  )
}

function AnswerRow({ text, correct, chosen }: { text: string; correct: boolean; chosen: boolean }) {
  const tone =
    chosen && correct ? "border-success bg-success/10"      :
    correct           ? "border-success/40 bg-success/5"    :
                        "border-border"
  const dot =
    chosen && correct ? "bg-success" :
    correct           ? "border border-success bg-card" :
                        "border border-border bg-card"
  return (
    <div className={`flex items-center gap-2 rounded-md border px-2 py-1.5 ${tone}`}>
      <span className={`h-3 w-3 rounded-full ${dot}`}>
        {chosen && correct && <Check className="h-3 w-3 text-success-foreground" />}
      </span>
      <span className="flex-1">{text}</span>
      {correct && (
        <span className="rounded-full bg-success/15 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide text-success">
          Correct
        </span>
      )}
    </div>
  )
}

// ============================================================
// Mockup #3 — Progress rollup
// Per-course progress bars + cross-course stat tiles + a tiny
// activity sparkline.
// ============================================================

function ProgressMockup() {
  const courses = [
    { name: "UX Foundations", pct: 72, color: "bg-emerald-500" },
    { name: "Visual Systems", pct: 48, color: "bg-sky-500"     },
    { name: "Portfolio Lab",  pct: 21, color: "bg-amber-500"   },
  ]
  return (
    <PreviewFrame title="student › Aanya Rao › progress">
      <div className="space-y-3 text-[11px]">
        {/* Progress bars */}
        <div className="space-y-2">
          {courses.map((c) => (
            <div key={c.name}>
              <div className="mb-0.5 flex items-center justify-between">
                <span className="inline-flex items-center gap-1 font-medium">
                  <BookOpen className="h-3 w-3 text-muted-foreground" /> {c.name}
                </span>
                <span className="font-mono text-[10px] tabular-nums">{c.pct}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div className={`h-full rounded-full ${c.color}`} style={{ width: `${c.pct}%` }} />
              </div>
            </div>
          ))}
        </div>

        {/* Stat tiles */}
        <div className="grid grid-cols-3 gap-1.5">
          <StatTile icon={<BookOpen className="h-3 w-3" />}        label="Lessons"    value="18" sub="completed" />
          <StatTile icon={<ClipboardCheck className="h-3 w-3" />} label="Quizzes"     value="7"  sub="of 9 passed" />
          <StatTile icon={<ImageIcon className="h-3 w-3" />}      label="Assignments" value="4"  sub="submitted" />
        </div>

        {/* Activity sparkline */}
        <div className="rounded-md border border-border/60 bg-card p-2">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">Activity · last 14 days</span>
            <span className="text-[9px] text-muted-foreground">avg quiz · 78%</span>
          </div>
          <Sparkline />
        </div>
      </div>
    </PreviewFrame>
  )
}

function StatTile({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub: string }) {
  return (
    <div className="rounded-md border border-border/60 bg-card p-1.5 text-center">
      <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-primary/10 text-primary">{icon}</span>
      <p className="mt-0.5 font-mono text-base font-bold tabular-nums">{value}</p>
      <p className="text-[8px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-[8px] text-muted-foreground/80">{sub}</p>
    </div>
  )
}

function Sparkline() {
  // 14 days of activity heights (out of 24px max).
  const heights = [6, 9, 14, 8, 12, 18, 22, 11, 7, 15, 19, 21, 10, 17]
  const max = 24
  return (
    <div className="mt-1.5 flex h-6 items-end gap-1">
      {heights.map((h, i) => (
        <div key={i} className="flex-1">
          <div
            className="rounded-sm bg-gradient-to-t from-primary/80 to-primary/40"
            style={{ height: `${(h / max) * 100}%` }}
          />
        </div>
      ))}
    </div>
  )
}
