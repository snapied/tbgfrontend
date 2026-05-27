// /solutions/for-course-creators — the full course platform on your URL.

import type { Metadata } from "next"
import Link from "next/link"
import {
  ArrowRight,
  Award,
  BookOpen,
  Calendar,
  CheckCircle2,
  Code,
  FileText,
  Globe2,
  GraduationCap,
  IndianRupee,
  Layers,
  Link2,
  Mic,
  Package,
  Phone,
  Play,
  Repeat,
  ShoppingBag,
  Sparkles,
  TrendingUp,
  Trophy,
  Users,
  Video,
} from "lucide-react"
import { Header } from "@/components/landing/header"
import { Footer } from "@/components/landing/footer"
import { SolutionPage } from "@/components/landing/solution-page"

export const metadata: Metadata = {
  title: "Why Course Creators Choose Our LMS & Course Suite · The Big Class",
  description:
    "Build secure self-paced courses with modules, interactive quizzes, automated smart certificates, and high-speed direct video hosting under your own CNAME domain.",
  alternates: { canonical: "https://thebigclass.com/solutions/for-course-creators" },
}

export default function ForCourseCreatorsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1">
        <SolutionPage
          eyebrow="For Course Creators"
          title={
            <>
              Your independent{" "}
              <span className="bg-gradient-to-r from-violet-500 via-purple-500 to-indigo-600 bg-clip-text text-transparent">
                Learning Academy.
              </span>
            </>
          }
          subtitle="Stop hosting your premium content in fragmented directories or paying heavy course commissions. Create a professional, white-labeled LMS platform under your custom CNAME domain. Build structured curriculums, deliver secure videos, issue verifiable certificates, and scale your brand."
          heroVisual={<CourseCreatorsHeroVisual />}
          outcomes={[
            {
              icon: <GraduationCap className="h-5 w-5" />,
              title: "Build High-Fidelity Course Curriculums",
              body: "Organize lessons into clean chapters and modules. Embed premium Secure Video lessons, downloadable templates, and cheatsheets. Students get dedicated learning rosters featuring automatic playback progress tracking.",
            },
            {
              icon: <Trophy className="h-5 w-5" />,
              title: "Deliver Interactive Quizzes & Assessments",
              body: "Create inline assessments to test client understanding. Utilize standard templates for multiple choice, text questions, and project submissions with auto-grading and immediate feedback.",
            },
            {
              icon: <Award className="h-5 w-5" />,
              title: "Issue Smart Verifiable Certificates",
              body: "Reward completion with beautiful, custom-branded credentials. Use our drag-and-drop designer and issue in bulk from CSV. Fully integrated verification pages at /verify boost student sharing.",
            },
          ]}
          featureMap={[
            {
              icon: <Globe2 className="h-4 w-4" />,
              title: "White-Labeled Portal URL",
              body: "Establish a premium branded destination (e.g. academy.yourbrand.com) with custom CSS and complete design control.",
              href: "/features/portal",
            },
            {
              icon: <Play className="h-4 w-4" />,
              title: "Secure direct R2 Video",
              body: "Stream high-definition, uncompressed video up to 4K resolution directly from the browser, completely secure from leaks.",
              href: "/features/recordings",
            },
            {
              icon: <Trophy className="h-4 w-4" />,
              title: "Interactive Quizzes",
              body: "Build pre-class filters or end-of-module quizzes to gauge student comprehension with automatic score reporting.",
              href: "/features/quizzes",
            },
            {
              icon: <Award className="h-4 w-4" />,
              title: "Verifiable Certificates",
              body: "Generate secure PDF certificates with individual QR verification codes and a public authentication portal.",
              href: "/features/certificates",
            },
          ]}
          comparison={{
            alternativeName: "Traditional Course Tools",
            rows: [
              {
                label: "All-in-One Capabilities",
                us: "Integrated: custom course templates, verifiable certificates, direct UPI payments, and batch feeds in one workspace.",
                them: "Forces you to patch together Teachable + Zoom + Typeform + separate certificate generator services.",
              },
              {
                label: "Razorpay UPI checkout",
                us: "Native UPI and cards settlements with direct payouts straight to your business bank account.",
                them: "Requires complicated USD-first payment setups with slow weekly payout times and heavy conversion fees.",
              },
              {
                label: "Commission & Fees",
                us: "0% platform commission. You pay a flat monthly membership and keep 100% of your earnings.",
                them: "Takes a massive 5% to 10% commission on every transaction, hurting your scale.",
              },
            ],
          }}
          cta={{
            title: "Your knowledge deserves a professional home.",
            body: "Launch your portal in 10 minutes. The free Starter plan is fully equipped to support your custom domain portal, first digital product storefront, and cohort batches.",
          }}
        />

        {/* ── Workflow Guide Section — How Course Creators use this ── */}
        <section className="border-t border-border/60 py-20 bg-muted/10">
          <div className="mx-auto max-w-5xl px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-primary">The Course Funnel</span>
              <h2 className="mt-3 text-balance text-3xl font-bold tracking-tight sm:text-4xl">
                The 3-Step Course Creation & Delivery Roadmap
              </h2>
              <p className="mt-3 text-muted-foreground">
                How professional educators configure their platforms to deliver high-value training.
              </p>
            </div>

            <div className="mt-14 grid gap-8 md:grid-cols-3">
              {/* Step 1 */}
              <div className="relative rounded-2xl border border-border/80 bg-card p-6 shadow-sm">
                <div className="absolute -top-4 left-6 flex h-8 w-8 items-center justify-center rounded-full bg-indigo-500 font-bold text-white text-sm shadow-md">
                  1
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <Globe2 className="h-5 w-5 text-indigo-500" />
                  <h3 className="text-base font-bold text-foreground">Launch Your Academy</h3>
                </div>
                <p className="mt-4 text-xs font-bold uppercase text-muted-foreground tracking-wide">THE BRAND STAGE</p>
                <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                  Establish your secure learning domain (e.g. academy.yourbrand.com) instantly. Apply custom themes, upload headers and logos, and outline your student onboarding requirements.
                </p>
              </div>

              {/* Step 2 */}
              <div className="relative rounded-2xl border border-border/80 bg-card p-6 shadow-sm">
                <div className="absolute -top-4 left-6 flex h-8 w-8 items-center justify-center rounded-full bg-violet-600 font-bold text-white text-sm shadow-md">
                  2
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <GraduationCap className="h-5 w-5 text-violet-500" />
                  <h3 className="text-base font-bold text-foreground">Build Curriculum depth</h3>
                </div>
                <p className="mt-4 text-xs font-bold uppercase text-muted-foreground tracking-wide">THE CURRICULUM STAGE</p>
                <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                  Draft modules, chapters, and lessons. Upload up to 4K resolution videos directly, attach worksheets, assign comprehensive quizzes, and customize your automated certificate triggers.
                </p>
              </div>

              {/* Step 3 */}
              <div className="relative rounded-2xl border border-border/80 bg-card p-6 shadow-sm">
                <div className="absolute -top-4 left-6 flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 font-bold text-white text-sm shadow-md">
                  3
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-emerald-500" />
                  <h3 className="text-base font-bold text-foreground">Drive Sales & Enrollments</h3>
                </div>
                <p className="mt-4 text-xs font-bold uppercase text-muted-foreground tracking-wide">THE ENROLL STAGE</p>
                <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                  Point students to your optimized course details landing page. They checkout instantly with native UPI, receive secure log in keys, and trace their progress automatically.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Genre Cases ── */}
        <section className="border-t border-border/60 py-20 bg-background">
          <div className="mx-auto max-w-5xl px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Creator Cases</span>
              <h2 className="mt-3 text-balance text-3xl font-bold tracking-tight sm:text-4xl">
                What can you build & sell?
              </h2>
              <p className="mt-3 text-muted-foreground">
                Tailored solutions for every genre of online instructor, trainer, and mentor.
              </p>
            </div>

            <div className="mt-12 grid gap-6 sm:grid-cols-2">
              <div className="rounded-xl border border-border/80 p-5 flex items-start gap-4 hover:bg-muted/10 transition-colors">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10 text-red-500 shrink-0">
                  <Code className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-foreground">Technical & Coding Bootcamps</h4>
                  <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
                    Sell comprehensive engineering modules, list cheat sheets and code repositories, integrate technical mock exams, and issue professional completion credentials.
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-border/80 p-5 flex items-start gap-4 hover:bg-muted/10 transition-colors">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/10 text-violet-500 shrink-0">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-foreground">Professional Business & Finance Academies</h4>
                  <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
                    Deliver structured courses on finance, excel modeling, or team leadership. Gate analysis templates, assign project deadlines, and support live doubt feeds.
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-border/80 p-5 flex items-start gap-4 hover:bg-muted/10 transition-colors">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500 shrink-0">
                  <ShoppingBag className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-foreground">Creative & Visual Art Academies</h4>
                  <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
                    Host photography, video editing, or design masterclasses. Bundle Lightroom presets, video asset files, template checklist downloads directly inside the course modules.
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-border/80 p-5 flex items-start gap-4 hover:bg-muted/10 transition-colors">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500 shrink-0">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-foreground">Exam Preparation & K-12 Institutes</h4>
                  <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
                    Build batch course directories. Deliver mock quiz papers, compile past exam answers, drip weekly lesson plans, and track detailed individual student analytical metrics.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}

// ─── Gorgeous Custom Course Creators Visual ──────────────────────────────────

function CourseCreatorsHeroVisual() {
  return (
    <div className="relative mx-auto w-full max-w-[500px]">
      {/* Background glow orbs */}
      <div
        className="pointer-events-none absolute -top-10 -right-10 h-64 w-64 rounded-full opacity-20 blur-[80px]"
        style={{
          background: "radial-gradient(circle, #6366f1 0%, transparent 70%)",
          animation: "indigoPulse 6s ease-in-out infinite",
        }}
      />
      <div
        className="pointer-events-none absolute -bottom-10 -left-10 h-64 w-64 rounded-full opacity-20 blur-[80px]"
        style={{
          background: "radial-gradient(circle, #a855f7 0%, transparent 70%)",
          animation: "purplePulse 6s ease-in-out infinite 3s",
        }}
      />

      {/* ── Main Mockup: Curriculum Builder Dashboard ── */}
      <div
        className="relative z-10 overflow-hidden rounded-2xl border border-border/60 bg-card/90 shadow-2xl backdrop-blur-md"
        style={{
          boxShadow: "0 30px 70px -15px rgba(0,0,0,0.3), inset 0 1px 0 hsl(var(--border)/0.2)",
        }}
      >
        {/* Fake Browser Chrome */}
        <div className="flex items-center gap-2 border-b border-border/50 bg-muted/40 px-4 py-3">
          <div className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-red-500/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/80" />
          </div>
          <div className="mx-auto flex h-5 w-44 items-center justify-center rounded bg-background/50 px-2 text-[9px] font-medium text-muted-foreground">
            academy.devcreator.com
          </div>
        </div>

        {/* Curriculum block */}
        <div className="p-4 border-b border-border/50 bg-muted/10">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">Curriculum Builder</span>
            <span className="text-[9px] font-bold text-indigo-500 bg-indigo-500/10 px-2 py-0.5 rounded-full">Pro Course Enabled</span>
          </div>
          
          {/* Modules list */}
          <div className="space-y-2">
            {/* Module 1 */}
            <div className="rounded-lg border border-border bg-card/60 p-2.5 flex items-center gap-2.5">
              <span className="flex h-5 w-5 items-center justify-center rounded bg-indigo-500/10 text-indigo-500 shrink-0 text-[10px] font-bold">M1</span>
              <div className="flex-1 min-w-0">
                <h4 className="text-[10px] font-bold text-foreground truncate">React Server Components Overview</h4>
                <p className="text-[8px] text-muted-foreground">3 lessons · Gated test assessment</p>
              </div>
              <span className="text-[8px] font-semibold text-foreground/85">98% passing</span>
            </div>

            {/* Module 2 */}
            <div className="rounded-lg border border-border bg-card/60 p-2.5 flex items-center gap-2.5">
              <span className="flex h-5 w-5 items-center justify-center rounded bg-indigo-500/10 text-indigo-500 shrink-0 text-[10px] font-bold">M2</span>
              <div className="flex-1 min-w-0">
                <h4 className="text-[10px] font-bold text-foreground truncate">Mastering Async Server Actions</h4>
                <p className="text-[8px] text-muted-foreground">4 lessons · Homework template attached</p>
              </div>
              <span className="text-[8px] font-semibold text-foreground/85">In progress</span>
            </div>
          </div>
        </div>

        {/* Lesson details view */}
        <div className="p-4 space-y-2 bg-card/50">
          <div className="flex items-center gap-2 text-[10px] font-bold text-foreground">
            <Play className="h-3.5 w-3.5 text-indigo-500 fill-indigo-500" />
            <span>Active Lesson: Intro to Server Rendering (12 min)</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
            <div className="h-full rounded-full bg-indigo-500" style={{ width: "84%" }} />
          </div>
          <div className="flex justify-between text-[8px] text-muted-foreground">
            <span>Student Progress: 84% Completed</span>
            <span>Estimated time left: 2 min</span>
          </div>
        </div>
      </div>

      {/* ── Floating Widget 1: Verifiable Certificate Mockup ── */}
      <div
        className="absolute -right-8 -bottom-5 z-20 w-52 rounded-xl border border-amber-500/30 bg-card/95 p-3.5 shadow-2xl backdrop-blur-md"
        style={{
          animation: "floatInUp 0.6s ease-out 0.2s both",
          boxShadow: "0 25px 60px -12px rgba(0,0,0,0.35)",
        }}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 text-[9px] font-bold text-amber-600 uppercase tracking-wider">
            <Award className="h-3.5 w-3.5 text-amber-500" />
            Smart Certificate
          </div>
          <span className="text-[8px] font-extrabold text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">VERIFIED</span>
        </div>
        <div className="border border-dashed border-border/80 rounded-lg p-2.5 text-center bg-muted/10">
          <p className="text-[7px] text-muted-foreground font-semibold">CERTIFICATE OF EXCELLENCE</p>
          <p className="text-[10px] font-black text-foreground mt-1">Rohan Kapoor</p>
          <div className="mt-2.5 flex items-center justify-between border-t border-border/50 pt-2 text-[6px] text-muted-foreground">
            <span>ID: #984-ABC</span>
            <span>VERIFIED ON 27/05</span>
          </div>
        </div>
      </div>

      {/* ── Floating Widget 2: Enrollment Notification ── */}
      <div
        className="absolute -left-12 top-1/4 z-20 flex items-center gap-2.5 rounded-full border border-emerald-500/20 bg-card/95 px-3.5 py-2 shadow-xl backdrop-blur-md"
        style={{
          animation: "floatInUp 0.5s ease-out 0.4s both",
        }}
      >
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/15">
          <IndianRupee className="h-3.5 w-3.5 text-emerald-600" />
        </div>
        <div>
          <p className="text-[8px] font-bold leading-none text-muted-foreground">NEW ENROLLMENT</p>
          <p className="mt-0.5 text-[9px] font-extrabold text-foreground">₹4,999 in React Masterclass</p>
        </div>
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
      </div>

      {/* Keyframe Styling */}
      <style>{`
        @keyframes indigoPulse {
          0%, 100% { transform: scale(1); opacity: 0.15; }
          50% { transform: scale(1.1); opacity: 0.25; }
        }
        @keyframes purplePulse {
          0%, 100% { transform: scale(1); opacity: 0.15; }
          50% { transform: scale(1.1); opacity: 0.25; }
        }
        @keyframes floatInUp {
          from { opacity: 0; transform: translateY(15px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
