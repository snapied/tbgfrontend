// Feature page — Quizzes.
//
// 18 ready-to-fire quiz templates spanning K-12, higher ed,
// engineering, management, and entrance prep (JEE / NEET / GMAT).
// Auto-grading, teacher-grading, time-bounded, pass-score gated.
// Embeddable inside lessons, live classes, and follow-ups.
//
// This page didn't exist before — the homepage referenced quizzes
// in a generic "courses with quizzes" sentence, burying 18 real
// templates a coaching centre would search for by name.

import type { Metadata } from "next"
import {
  BarChart3,
  Bot,
  Brain,
  Briefcase,
  Clock,
  ClipboardCheck,
  Code2,
  Cpu,
  FlaskConical,
  GraduationCap,
  HelpCircle,
  Image as ImageIcon,
  Layers,
  Mic,
  PenSquare,
  ScanLine,
  Send,
  ShieldCheck,
  Sparkles,
  Target,
  Trophy,
  Users,
  Zap,
} from "lucide-react"
import { Header } from "@/components/landing/header"
import { Footer } from "@/components/landing/footer"
import {
  FeatureCTA,
  FeaturePageShell,
  FeatureSplit,
  PreviewFrame,
} from "@/components/landing/feature-page"

const SITE_URL = "https://thebigclass.com"
const PAGE_PATH = "/features/quizzes"

// Source of truth mirrors lib/quiz-templates.ts. Keep in sync.
const QUIZ_GROUPS = [
  {
    id: "entrance",
    label: "Entrance prep",
    emoji: "🎯",
    hint: "JEE · NEET · GMAT timing and difficulty — built by educators who've coached cohorts to the test.",
    templates: [
      { title: "JEE Mathematics drill",  description: "Single-correct MCQs on calculus, algebra, coordinate geometry. JEE-style difficulty + timing.", time: "60 min", grading: "Auto", badge: "JEE" },
      { title: "NEET Biology MCQs",       description: "Single-correct biology MCQs — cell, genetics, human physiology. NEET-style framing.",         time: "45 min", grading: "Auto", badge: "NEET" },
      { title: "GMAT data sufficiency",   description: "Classic DS items — judge if each statement is sufficient, alone or together. 2-min pacing.",     time: "30 min", grading: "Auto", badge: "GMAT" },
    ],
  },
  {
    id: "classroom",
    label: "Classroom (K-12 + general)",
    emoji: "🎒",
    hint: "The four checkpoints every classroom uses — pop quiz, module test, reflection, fluency drill.",
    templates: [
      { title: "Pop quiz",                description: "Quick 5-question check-in to confirm students caught today's main ideas.", time: "10 min", grading: "Auto" },
      { title: "End-of-module assessment", description: "Graded 10-question test covering everything in a module. 70% to pass.",  time: "30 min", grading: "Auto" },
      { title: "Reflection prompt",       description: "Single open-ended question — teacher reviews each response.",              time: "—",     grading: "Teacher" },
      { title: "Reading comprehension",   description: "Short passage + 4 inference questions. Primary/secondary critical reading.", time: "15 min", grading: "Auto" },
      { title: "Math fluency drill",      description: "Eight quick arithmetic questions. Times tables, fractions, basic algebra.", time: "8 min",  grading: "Auto" },
      { title: "Vocabulary check",        description: "Synonyms · antonyms · usage in a sentence. Word-of-the-week scaffold.",   time: "10 min", grading: "Auto" },
      { title: "Physics laws check",      description: "MCQs on Newton's laws, conservation, kinematics. Mid-secondary level.",   time: "20 min", grading: "Auto" },
      { title: "Chemistry equations",     description: "Balance equations, identify reaction types, predict products.",            time: "20 min", grading: "Auto" },
    ],
  },
  {
    id: "highered",
    label: "Higher education",
    emoji: "🎓",
    hint: "Long-form prompts with rubrics for college / university classes that grade for reasoning, not recall.",
    templates: [
      { title: "Essay with rubric",       description: "One long-response prompt graded against a 4-point rubric. Instructor reviews each.", time: "—",     grading: "Teacher" },
      { title: "Case study analysis",     description: "Case prompt + four guided questions. Used in business, law, medicine, ethics courses.", time: "60 min", grading: "Mixed" },
    ],
  },
  {
    id: "engineering",
    label: "Engineering / CS",
    emoji: "💻",
    hint: "Made for code bootcamps, CS departments, and engineering training tracks.",
    templates: [
      { title: "Code review quiz",        description: "Short code snippets with bugs to spot. Tunes review skills in CS / SE classes.",   time: "25 min", grading: "Auto" },
      { title: "Algorithm complexity",    description: "Big-O for common algorithms — sorting, searching, graph traversal.",                time: "15 min", grading: "Auto" },
      { title: "System design fundamentals", description: "Open-ended scenarios — design a URL shortener, a chat service, a notifications system.", time: "—",     grading: "Teacher" },
    ],
  },
  {
    id: "management",
    label: "Management / Product",
    emoji: "📊",
    hint: "Situational quizzes for PM, ops, and product-sense interview prep.",
    templates: [
      { title: "Project management scenarios", description: "Situational MCQs — scope creep, risk, dependencies. PMBOK / PMP-style framing.", time: "20 min", grading: "Auto" },
      { title: "Product sense interview",  description: "Open-ended design + prioritisation. Common at FAANG/PM interview prep.",            time: "—",     grading: "Teacher" },
    ],
  },
]

const TOTAL_TEMPLATES = QUIZ_GROUPS.reduce((s, g) => s + g.templates.length, 0)

export const metadata: Metadata = {
  title: `Quizzes — ${TOTAL_TEMPLATES} ready-to-fire templates · JEE, NEET, GMAT, K-12 · The Big Class`,
  description: `${TOTAL_TEMPLATES} quiz templates a teacher can fire in two minutes — JEE Maths, NEET Biology, GMAT data sufficiency, K-12 fluency drills, system design, essay rubrics. Auto-grading, time limits, attempt caps, retake rules.`,
  keywords: [
    "quiz templates for teachers",
    "JEE quiz online",
    "NEET MCQ practice",
    "GMAT data sufficiency",
    "K-12 quiz platform",
    "online quiz with auto-grading",
    "essay rubric grading",
    "code review quiz",
    "system design quiz",
    "coaching center quiz software",
    "vedic maths quiz",
  ],
  alternates: { canonical: `${SITE_URL}${PAGE_PATH}` },
  openGraph: {
    type: "website",
    url: `${SITE_URL}${PAGE_PATH}`,
    siteName: "The Big Class",
    title: `${TOTAL_TEMPLATES} quiz templates · The Big Class`,
    description:
      "Pick a template, edit the questions, send to the cohort. JEE Maths, NEET Biology, GMAT DS, K-12 fluency drills — and 14 more.",
  },
  twitter: {
    card: "summary_large_image",
    title: `${TOTAL_TEMPLATES} quiz templates · The Big Class`,
    description:
      "JEE · NEET · GMAT · K-12 · CS · Management. Two-minute setup, auto-grade, share to your cohort.",
  },
}

export default function QuizzesFeaturePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main id="main-content" className="flex-1">
        <FeaturePageShell
          eyebrow={`${TOTAL_TEMPLATES} ready-to-fire templates · auto-graded · cohort-scoped`}
          title={
            <>
              Quizzes you don&rsquo;t have to{" "}
              <span className="text-primary">build from scratch</span>.
            </>
          }
          subtitle={`${TOTAL_TEMPLATES} templates a teacher fires in two minutes — JEE Mathematics, NEET Biology, GMAT data sufficiency, K-12 fluency drills, system design, essay rubrics. Edit the seed questions, pick auto-grade or teacher-grade, share to a cohort. The scores land in your gradebook, the leaderboard updates, students get notified.`}
          heroImage="/tab_wedges.png"
        />

        {/* Template gallery — the page's centre of gravity. Same
            organising idea as the whiteboard page: lead with the
            specific things a teacher would search for ("JEE Maths
            quiz", "NEET MCQs") because those are the queries that
            convert. */}
        <section className="border-y border-border bg-muted/20 py-16">
          <div className="mx-auto max-w-6xl px-6 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-xs font-bold uppercase tracking-wider text-primary">
                The quiz library
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
                {TOTAL_TEMPLATES} templates, grouped by who&rsquo;s teaching.
              </h2>
              <p className="mt-3 text-base leading-relaxed text-muted-foreground">
                Every template ships with real starter questions — not &ldquo;Sample MCQ.&rdquo; You edit them, you don&rsquo;t write from a blank page.
              </p>
            </div>

            <div className="mt-12 space-y-10">
              {QUIZ_GROUPS.map((group) => (
                <div key={group.id}>
                  <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="flex items-center gap-2 text-xl font-bold">
                      <span aria-hidden>{group.emoji}</span>
                      {group.label}
                      <span className="text-sm font-normal text-muted-foreground">
                        · {group.templates.length} {group.templates.length === 1 ? "template" : "templates"}
                      </span>
                    </h3>
                    <p className="max-w-xl text-sm text-muted-foreground">{group.hint}</p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {group.templates.map((t) => (
                      <div
                        key={t.title}
                        className="group rounded-xl border border-border bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-sm font-bold leading-snug">{t.title}</h4>
                          {"badge" in t && t.badge && (
                            <span className="shrink-0 rounded-full border border-primary/30 bg-primary/[0.06] px-1.5 py-0.5 text-[10px] font-bold text-primary">
                              {t.badge}
                            </span>
                          )}
                        </div>
                        <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                          {t.description}
                        </p>
                        <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground">
                          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-1.5 py-0.5">
                            <Clock className="h-2.5 w-2.5" /> {t.time}
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-1.5 py-0.5">
                            {t.grading === "Auto" ? (
                              <Bot className="h-2.5 w-2.5" />
                            ) : t.grading === "Teacher" ? (
                              <PenSquare className="h-2.5 w-2.5" />
                            ) : (
                              <Layers className="h-2.5 w-2.5" />
                            )}
                            {t.grading}-graded
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Question types: 5 of them — the "any quiz you'd want" claim
            needs the receipts. */}
        <section className="bg-background py-16">
          <div className="mx-auto max-w-5xl px-6 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-xs font-bold uppercase tracking-wider text-primary">
                Question types
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
                Five question shapes. Cover any subject.
              </h2>
            </div>
            <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <QTypeCard icon={<HelpCircle className="h-3.5 w-3.5" />} title="Multiple choice"  body="2-6 options, single correct. Auto-graded with optional explanation." />
              <QTypeCard icon={<ClipboardCheck className="h-3.5 w-3.5" />} title="True / False"  body="Two-option specialisation of MCQ — fastest to write, fastest to grade." />
              <QTypeCard icon={<Zap className="h-3.5 w-3.5" />}        title="Short answer"     body="Single line. Auto-grade vs. expected text, or hand-grade." />
              <QTypeCard icon={<PenSquare className="h-3.5 w-3.5" />}  title="Long answer"      body="Essay/explanation. Teacher-graded with rubric weights." />
              <QTypeCard icon={<ScanLine className="h-3.5 w-3.5" />}   title="File / code upload" body="Student uploads PDF, image, or code. Teacher reviews + scores." />
            </div>
          </div>
        </section>

        <FeatureSplit
          title="Two-minute setup, two-second grading."
          body={
            <>
              Pick a template → edit the seed questions → set a time limit + pass score → send. Auto-graded quizzes flow into the gradebook the instant the student submits. Teacher-graded essays land in your <span className="font-medium text-foreground">/dashboard/inbox</span> with the same inline-reply pattern as doubts and discussions.
            </>
          }
          bullets={[
            "Time limits — 5 min to no-limit, per quiz",
            "Pass score — % gate or absolute points",
            "Attempt caps — one shot, three shots, unlimited",
            "Randomised question + option order — anti-copying",
            "Auto-grade for objective, teacher-grade for subjective, mixed for case studies",
            "Notifications fan out to in-app + email + WhatsApp on score posted",
          ]}
          mockup={<QuizComposerMockup />}
        />

        <FeatureSplit
          reverse
          title="Where they live: lessons, classes, follow-ups, leaderboard."
          body={
            <>
              A quiz isn&rsquo;t a separate destination — it&rsquo;s a block. Drop it as a lesson inside a course, attach it as a follow-up after a live class, or send it as a standalone link to a cohort. Scores feed the public leaderboard (with student opt-out) so &ldquo;who topped the JEE drill this week&rdquo; becomes a live signal.
            </>
          }
          bullets={[
            "Embed inside any course lesson — counts toward course completion",
            "Attach as a class follow-up — auto-shared in the wrap recap",
            "Standalone share link — works for non-enrolled prospects",
            "Score → Leaderboard (10 pts attempted, +15 bonus for a pass)",
            "Mistake review — students see what they got wrong + the right answer",
            "Anti-cheat: shuffled options, attempt-cap enforcement, time-window",
          ]}
          mockup={<QuizSurfacesMockup />}
        />

        {/* Power features — what makes this more than a Google Form. */}
        <section className="border-y border-border bg-muted/30 py-16">
          <div className="mx-auto max-w-6xl px-6 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-xs font-bold uppercase tracking-wider text-primary">
                Why this isn&rsquo;t a Google Form
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
                Six things teachers ask for and Google Forms won&rsquo;t do.
              </h2>
            </div>
            <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <PowerCard
                icon={<Trophy className="h-4 w-4" />}
                title="Scores hit the leaderboard"
                body="Pass a quiz → +15 helpfulness points. Students see their rank against the cohort in real time."
              />
              <PowerCard
                icon={<Brain className="h-4 w-4" />}
                title="Cohort-scoped, not link-scoped"
                body="Only enrolled students can attempt. No 'anyone with the link can vote' chaos."
              />
              <PowerCard
                icon={<Clock className="h-4 w-4" />}
                title="Hard time limits with auto-submit"
                body="When the timer hits zero, the quiz submits with whatever's filled. JEE pacing, enforced."
              />
              <PowerCard
                icon={<Sparkles className="h-4 w-4" />}
                title="Inline mistake review"
                body="After submit, the student sees their wrong answers with the correct one + an optional explanation."
              />
              <PowerCard
                icon={<Send className="h-4 w-4" />}
                title="Cross-channel score notifications"
                body="When you grade, the student gets pinged in-app + email + WhatsApp — they don't have to refresh."
              />
              <PowerCard
                icon={<ShieldCheck className="h-4 w-4" />}
                title="Workspace-owned data"
                body="Every question, every response, every grade — exports as CSV/JSON on every plan. Even the free tier."
              />
            </div>
          </div>
        </section>

        {/* India-specific scenarios (entrance coaching, K-12). */}
        <section className="bg-background py-16">
          <div className="mx-auto max-w-6xl px-6 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-xs font-bold uppercase tracking-wider text-primary">
                In an Indian coaching centre
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
                Where quizzes carry the cohort.
              </h2>
            </div>
            <div className="mt-10 grid gap-4 lg:grid-cols-3">
              <ScenarioCard
                emoji="🎯"
                title="JEE Mains weekly mock"
                quote="&ldquo;Saturday: JEE Maths drill auto-fires at 6 pm. 60 minutes, hard cap. Sunday morning the leaderboard shows top scorers across all batches. The kid who topped gets a 🏆 in the community feed.&rdquo;"
                stack={[
                  "JEE Mathematics drill template",
                  "Time cap + auto-submit at 7 pm",
                  "Score → Leaderboard → Wall of Love auto-promote",
                ]}
              />
              <ScenarioCard
                emoji="🧬"
                title="NEET Biology — chapter close"
                quote="&ldquo;Finish the genetics chapter Friday evening, NEET Biology MCQ template Saturday morning. Mistake review shows which inheritance pattern they got wrong — I open that exact slide in next week's class.&rdquo;"
                stack={[
                  "NEET Biology MCQs template",
                  "Inline mistake review per student",
                  "Score feeds the parent-facing progress email",
                ]}
              />
              <ScenarioCard
                emoji="🧮"
                title="K-12 Vedic maths · Class 5"
                quote="&ldquo;Math fluency drill template, swap in Vedic squaring questions. 8 minutes, retake allowed twice. Parents get a WhatsApp with the score — they're hooked on the cohort.&rdquo;"
                stack={[
                  "Math fluency drill template",
                  "2 attempts allowed, best-of counts",
                  "Score notification → WhatsApp to parent",
                ]}
              />
            </div>
          </div>
        </section>

        {/* vs the alternatives */}
        <section className="border-t border-border bg-muted/20 py-16">
          <div className="mx-auto max-w-5xl px-6 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-xs font-bold uppercase tracking-wider text-primary">
                vs. the alternatives
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
                Why coaching centres switch.
              </h2>
            </div>
            <div className="mx-auto mt-10 grid max-w-3xl gap-3">
              <ComparisonRow
                rival="A generic form tool"
                problem="No leaderboard. No cohort scoping. No real time limits. Grades stay in a spreadsheet you forget to open. Acknowledgement to the student? None."
                ours="Cohort-scoped, time-bounded, leaderboard-feeding, parent-WhatsApp-notifying. Live by default."
              />
              <ComparisonRow
                rival="A hosted entrance-prep portal"
                problem="Their content library, their student account, their brand. You're the channel; they're the platform. Your roster lives behind their login."
                ours="Your templates, your edits, your students under your brand. Export anything to CSV / JSON the day you leave."
              />
              <ComparisonRow
                rival="A game-show quiz tool"
                problem="Buzzer culture works for primary classes. For JEE / NEET prep, the music + scoreboard distracts from time-pressure practice."
                ours="Test-realistic pacing — silent timer, single attempt, no mid-quiz leaderboard. Buzzer-style mode available when you want it."
              />
              <ComparisonRow
                rival="A typical LMS quiz builder"
                problem="3-4 question types, no entrance-test templates, no India-specific framing. Generic and shallow."
                ours={`${TOTAL_TEMPLATES} templates including JEE / NEET / GMAT, 5 question types, real starter questions per template.`}
              />
            </div>
          </div>
        </section>

        <FeatureCTA
          title="Fire your first quiz in two minutes."
          body="Start your workspace, pick a template, edit the seed questions, send to your cohort. Score lands in your gradebook before they finish their tea."
        />
      </main>
      <Footer />
    </div>
  )
}

// ============================================================
// Helpers
// ============================================================

function QTypeCard({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">
          {icon}
        </span>
        <p className="text-sm font-bold leading-snug">{title}</p>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{body}</p>
    </div>
  )
}

function PowerCard({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
          {icon}
        </span>
        <h3 className="text-base font-bold">{title}</h3>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
    </div>
  )
}

function ScenarioCard({
  emoji, title, quote, stack,
}: { emoji: string; title: string; quote: string; stack: string[] }) {
  return (
    <div className="flex h-full flex-col rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <span aria-hidden className="text-2xl">{emoji}</span>
        <h3 className="text-base font-bold">{title}</h3>
      </div>
      <p className="mt-3 text-sm italic leading-relaxed text-muted-foreground">{quote}</p>
      <div className="mt-auto pt-4">
        <p className="text-[10px] font-bold uppercase tracking-wider text-primary">
          Templates + features used
        </p>
        <ul className="mt-1.5 space-y-1">
          {stack.map((s) => (
            <li key={s} className="flex items-start gap-1.5 text-xs">
              <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-primary" />
              <span>{s}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function ComparisonRow({ rival, problem, ours }: { rival: string; problem: string; ours: string }) {
  return (
    <div className="grid gap-3 rounded-xl border border-border bg-card p-4 sm:grid-cols-[180px_1fr_1fr]">
      <div className="flex items-center">
        <span className="text-sm font-bold">{rival}</span>
      </div>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-destructive">What hurts</p>
        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{problem}</p>
      </div>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-success">The Big Class</p>
        <p className="mt-0.5 text-xs leading-relaxed">{ours}</p>
      </div>
    </div>
  )
}

// ============================================================
// Mockups
// ============================================================
function QuizComposerMockup() {
  return (
    <PreviewFrame title="dashboard › quizzes › new — JEE Maths drill">
      <div className="space-y-2.5 text-[11px]">
        <div className="rounded-md border border-border bg-card p-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-primary">Question 1 of 12</p>
          <p className="mt-1 text-[12px] font-semibold">If x² + 4x + 3 = 0, what are the roots?</p>
          <div className="mt-2 grid gap-1.5">
            {[
              { label: "−1 and −3", correct: true },
              { label: "−1 and 3" },
              { label: "1 and −3" },
              { label: "1 and 3" },
            ].map((o, i) => (
              <div
                key={i}
                className={`flex items-center justify-between rounded border px-2 py-1.5 ${
                  o.correct ? "border-success/40 bg-success/[0.06]" : "border-border bg-background"
                }`}
              >
                <span className="font-medium">{o.label}</span>
                {o.correct && <span className="text-[9px] font-bold text-success">CORRECT</span>}
              </div>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5 text-[10px]">
          <span className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2 py-0.5">
            <Clock className="h-2.5 w-2.5" /> 60 min · auto-submit
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2 py-0.5">
            <Target className="h-2.5 w-2.5" /> Pass: 60%
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2 py-0.5">
            <ShieldCheck className="h-2.5 w-2.5" /> 1 attempt
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2 py-0.5">
            <Bot className="h-2.5 w-2.5" /> Auto-grade
          </span>
        </div>
      </div>
    </PreviewFrame>
  )
}

function QuizSurfacesMockup() {
  return (
    <PreviewFrame title="Where the quiz appears">
      <div className="space-y-2 text-[11px]">
        <SurfaceRow icon={<GraduationCap className="h-3 w-3" />} label="Course lesson"     hint="Counts toward course completion" />
        <SurfaceRow icon={<Mic className="h-3 w-3" />}            label="Class follow-up"   hint="Auto-shared in the wrap recap" />
        <SurfaceRow icon={<Users className="h-3 w-3" />}          label="Cohort feed"       hint="Pinned post in the community" />
        <SurfaceRow icon={<BarChart3 className="h-3 w-3" />}       label="Leaderboard"      hint="+15 helpfulness bonus on pass" />
        <SurfaceRow icon={<Send className="h-3 w-3" />}            label="Standalone link"   hint="Works for guests + prospects" />
      </div>
    </PreviewFrame>
  )
}

function SurfaceRow({ icon, label, hint }: { icon: React.ReactNode; label: string; hint: string }) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-border bg-card p-2">
      <span className="flex h-6 w-6 items-center justify-center rounded bg-primary/10 text-primary">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[11px] font-semibold">{label}</span>
        <span className="block text-[10px] text-muted-foreground">{hint}</span>
      </span>
    </div>
  )
}
