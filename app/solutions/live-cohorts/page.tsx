// /solutions/live-cohorts — time-boxed batches, zero seat fees.

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
  Film,
  Globe2,
  GraduationCap,
  Heart,
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
  title: "Why Creators Choose Our Live Cohort Suite · The Big Class",
  description:
    "Run interactive, time-boxed live cohorts. Enjoy direct built-in LiveKit class rooms, cloud recordings, community feeds, and points leaderboards under your custom domain.",
  alternates: { canonical: "https://thebigclass.com/solutions/live-cohorts" },
}

export default function LiveCohortsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1">
        <SolutionPage
          eyebrow="For Cohort Creators"
          title={
            <>
              Interactive Live Cohorts.{" "}
              <span className="bg-gradient-to-r from-rose-500 via-pink-500 to-indigo-600 bg-clip-text text-transparent">
                Without Zoom seat-fees.
              </span>
            </>
          }
          subtitle="Stop managing your cohort batches across multiple separate tools. Host your white-labeled portal, schedule time-boxed batches, stream interactive live classes with built-in whiteboard tools, manage student homework, and gamify progress on dedicated feeds."
          heroVisual={<LiveCohortsHeroVisual />}
          outcomes={[
            {
              icon: <Video className="h-5 w-5" />,
              title: "Built-In Live Class Rooms & Recording",
              body: "Stream high-definition classes directly inside your portal via LiveKit. Record to R2 in one click, generate interactive transcript chapters, and support speed changes — completely free from Zoom bill quotas.",
            },
            {
              icon: <Users className="h-5 w-5" />,
              title: "Unified Student Batch Feeds",
              body: "Build a highly collaborative environment. Give each cohort its own exclusive community feed for student discussions, doubt-solving threads, announcements, and direct file uploads.",
            },
            {
              icon: <Trophy className="h-5 w-5" />,
              title: "Gamified Student Leaderboards",
              body: "Keep student momentum high. Award automated points for class attendance, quiz submissions, and homework completion. Showcase points standings in an interactive student leaderboard.",
            },
          ]}
          featureMap={[
            {
              icon: <Globe2 className="h-4 w-4" />,
              title: "White-labeled portal domains",
              body: "Keep your students focused. Host your cohorts under your own domain (e.g. academy.yourname.com) featuring your customized branding.",
              href: "/features/portal",
            },
            {
              icon: <Video className="h-4 w-4" />,
              title: "Direct R2 video hosting",
              body: "Host premium course recorded modules. Direct uncompressed browser R2 uploads keep your lessons secure.",
              href: "/features/recordings",
            },
            {
              icon: <Trophy className="h-4 w-4" />,
              title: "Cohort leaderboards",
              body: "Incentivize cohort progression with automated points standing panels based on student quiz scores.",
              href: "/features/community",
            },
            {
              icon: <FileText className="h-4 w-4" />,
              title: "AI Study Guides",
              body: "Instantly draft cheatsheets and study guides from live class transcripts directly inside the docs tab.",
              href: "/features/docs",
            },
          ]}
          comparison={{
            alternativeName: "Glued App Stacks",
            rows: [
              {
                label: "Live Class Pricing",
                us: "Fully integrated: unlimited live sessions and secure cloud recording included on flat monthly memberships.",
                them: "Zoom Pro licenses per host plus paid Zoom cloud quota additions (costs grow with team size).",
              },
              {
                label: "Community Gating",
                us: "Built-in cohort feeds and dudas boards. Access is automatically synced with student course enrollment.",
                them: "Separate tools (Circle, Discord, Slack) with separate billing, requiring complicated Zapier integrations.",
              },
              {
                label: "Commission Cuts",
                us: "0% platform commission. Settle directly to your business bank account via native mobile UPI and cards.",
                them: "Gumroad or Patreon skim a heavy 5% to 15% transaction fee cut of every cohort enrollment sale.",
              },
            ],
          }}
          cta={{
            title: "Your cohorts deserve a professional home.",
            body: "Get started in 10 minutes. The free Starter plan is fully equipped to support your custom domain portal, first digital product storefront, and cohort batches.",
          }}
        />

        {/* ── Workflow Guide Section ── */}
        <section className="border-t border-border/60 py-20 bg-muted/10">
          <div className="mx-auto max-w-5xl px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-primary">The Cohort Funnel</span>
              <h2 className="mt-3 text-balance text-3xl font-bold tracking-tight sm:text-4xl">
                The 3-Step Live Cohort Funnel
              </h2>
              <p className="mt-3 text-muted-foreground">
                How professional educators configure their cohorts to land and engage paying student groups.
              </p>
            </div>

            <div className="mt-14 grid gap-8 md:grid-cols-3">
              {/* Step 1 */}
              <div className="relative rounded-2xl border border-border/80 bg-card p-6 shadow-sm">
                <div className="absolute -top-4 left-6 flex h-8 w-8 items-center justify-center rounded-full bg-rose-500 font-bold text-white text-sm shadow-md">
                  1
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-rose-500" />
                  <h3 className="text-base font-bold text-foreground">Schedule Batch Cohorts</h3>
                </div>
                <p className="mt-4 text-xs font-bold uppercase text-muted-foreground tracking-wide">THE BATCH STAGE</p>
                <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                  Setup your batch cohorts on day one. Schedule upcoming class times, compile module calendars, write course descriptions, and invite co-hosts to your white-labeled domain portal.
                </p>
              </div>

              {/* Step 2 */}
              <div className="relative rounded-2xl border border-border/80 bg-card p-6 shadow-sm">
                <div className="absolute -top-4 left-6 flex h-8 w-8 items-center justify-center rounded-full bg-violet-600 font-bold text-white text-sm shadow-md">
                  2
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <Video className="h-5 w-5 text-violet-500" />
                  <h3 className="text-base font-bold text-foreground">Stream Interactive Classes</h3>
                </div>
                <p className="mt-4 text-xs font-bold uppercase text-muted-foreground tracking-wide">THE CLASS STAGE</p>
                <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                  Go live directly inside your domain. Use high-speed interactive screensharing, whiteboards, group chats, live poll modules, and auto-record your streams in high-definition up to 4K resolution.
                </p>
              </div>

              {/* Step 3 */}
              <div className="relative rounded-2xl border border-border/80 bg-card p-6 shadow-sm">
                <div className="absolute -top-4 left-6 flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 font-bold text-white text-sm shadow-md">
                  3
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <Users className="h-5 w-5 text-emerald-500" />
                  <h3 className="text-base font-bold text-foreground">Engage Your Community</h3>
                </div>
                <p className="mt-4 text-xs font-bold uppercase text-muted-foreground tracking-wide">THE ENGAGEMENT STAGE</p>
                <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                  Students access recorded streams with auto-generated chapters, write comments on cohort discussion boards, resolve doubt threads, complete quizzes, and trace their progress standings.
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
                Who uses our live cohorts suite?
              </h2>
              <p className="mt-3 text-muted-foreground">
                How diverse cohort creators organize their portals to scale.
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
                    Host private developer cohorts, stream live screenshare code reviews, resolve student doubts directly in discussion feeds, and issue smart verifiable certificates.
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-border/80 p-5 flex items-start gap-4 hover:bg-muted/10 transition-colors">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/10 text-violet-500 shrink-0">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-foreground">Business & Marketing Academies</h4>
                  <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
                    Conduct high-value cohort strategy bootcamps. Bundle Notion templates, outline corporate project deadlines, and support live doubt-solving channels.
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-border/80 p-5 flex items-start gap-4 hover:bg-muted/10 transition-colors">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500 shrink-0">
                  <ShoppingBag className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-foreground">Creative & Visual Art Masterclasses</h4>
                  <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
                    Host creative design courses. Sell digital asset preset files, Lightroom template bundles, and offer bookable 1:1 portfolio consultation sessions directly.
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-border/80 p-5 flex items-start gap-4 hover:bg-muted/10 transition-colors">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500 shrink-0">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-foreground">Fitness, Wellness & Yoga Challenges</h4>
                  <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
                    Organize structured wellness challenges. Deliver live group yoga streams, list diet recipe checklist guides, and track detailed individual client analytical progress.
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

// ─── Gorgeous Custom Live Cohorts Visual ─────────────────────────────────────

function LiveCohortsHeroVisual() {
  return (
    <div className="relative mx-auto w-full max-w-[500px]">
      {/* Background glow orbs */}
      <div
        className="pointer-events-none absolute -top-10 -right-10 h-64 w-64 rounded-full opacity-20 blur-[80px]"
        style={{
          background: "radial-gradient(circle, #ec4899 0%, transparent 70%)",
          animation: "redPulse 6s ease-in-out infinite",
        }}
      />
      <div
        className="pointer-events-none absolute -bottom-10 -left-10 h-64 w-64 rounded-full opacity-20 blur-[80px]"
        style={{
          background: "radial-gradient(circle, #6366f1 0%, transparent 70%)",
          animation: "indigoPulse 6s ease-in-out infinite 3s",
        }}
      />

      {/* ── Main Mockup: Live Class & Whiteboard ── */}
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

        {/* Live Video room preview */}
        <div className="relative overflow-hidden bg-slate-950 aspect-video">
          <img
            src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=480&q=80"
            alt="Interactive whiteboard screen"
            className="h-full w-full object-cover opacity-35"
          />
          {/* Active Live Pill */}
          <div className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-red-500 px-2 py-0.5 text-[9px] font-bold text-white shadow-md">
            <span className="h-1.5 w-1.5 rounded-full bg-white animate-ping" />
            LIVE CLASS
          </div>

          {/* Teacher preview pip */}
          <div className="absolute bottom-3 right-3 h-14 w-20 overflow-hidden rounded-lg border border-white/20 bg-slate-900 shadow-lg">
            <div className="flex h-full items-center justify-center bg-gradient-to-tr from-rose-500 to-indigo-500 text-xs">
              👩‍🏫
            </div>
          </div>

          {/* Whiteboard content mockup */}
          <div className="absolute inset-0 flex flex-col justify-center px-6 text-center text-white/90">
            <p className="text-[10px] font-mono tracking-wider opacity-60">INTERACTIVE WHITEBOARD</p>
            <p className="text-xs font-bold leading-normal mt-1 text-emerald-400">Week 4: Advanced React Patterns</p>
            <p className="text-[9px] opacity-75 mt-1 font-mono">useLayoutEffect vs useEffect</p>
          </div>
        </div>

        {/* Live Group Chat details view */}
        <div className="p-4 space-y-2 bg-card/50 border-t border-border/50">
          <div className="flex items-center gap-2 text-[10px] font-bold text-foreground">
            <Users className="h-3.5 w-3.5 text-rose-500" />
            <span>Cohort Batch B Common Feed</span>
          </div>
          {/* Mock messages */}
          <div className="space-y-1">
            <p className="text-[8px] leading-relaxed text-muted-foreground">
              <span className="font-bold text-foreground">Rohan K:</span> Loved the whiteboard demo!
            </p>
            <p className="text-[8px] leading-relaxed text-muted-foreground">
              <span className="font-bold text-foreground">Tanya S:</span> Is the transcript uploaded?
            </p>
          </div>
        </div>
      </div>

      {/* ── Floating Widget 1: Gamified Leaderboard Mockup ── */}
      <div
        className="absolute -left-12 -bottom-5 z-20 w-44 rounded-xl border border-border bg-card/95 p-3.5 shadow-2xl backdrop-blur-md"
        style={{
          animation: "floatInUp 0.6s ease-out 0.2s both",
          boxShadow: "0 20px 50px -10px rgba(0,0,0,0.3)",
        }}
      >
        <div className="flex items-center gap-1.5 text-[8px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
          <Trophy className="h-3.5 w-3.5 text-amber-500" />
          Batch Leaderboard
        </div>
        <div className="space-y-1">
          {[
            { name: "Rohan Kapoor", pts: "840 pts" },
            { name: "Tanya Sharma", pts: "720 pts" },
          ].map((s, i) => (
            <div key={s.name} className="flex justify-between items-center text-[8px] font-semibold text-muted-foreground">
              <span>{i+1}. {s.name}</span>
              <span className="text-emerald-600 bg-emerald-500/10 px-1 rounded">{s.pts}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Floating Widget 2: Enrollment Notification ── */}
      <div
        className="absolute -right-8 top-1/4 z-20 flex items-center gap-2.5 rounded-full border border-emerald-500/20 bg-card/95 px-3.5 py-2 shadow-xl backdrop-blur-md"
        style={{
          animation: "floatInUp 0.5s ease-out 0.4s both",
        }}
      >
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/15">
          <IndianRupee className="h-3.5 w-3.5 text-emerald-600" />
        </div>
        <div>
          <p className="text-[8px] font-bold leading-none text-muted-foreground">NEW ENROLLMENT</p>
          <p className="mt-0.5 text-[9px] font-extrabold text-foreground">₹4,999 in Batch B Cohort</p>
        </div>
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
      </div>

      {/* Keyframe Styling */}
      <style>{`
        @keyframes redPulse {
          0%, 100% { transform: scale(1); opacity: 0.15; }
          50% { transform: scale(1.1); opacity: 0.25; }
        }
        @keyframes indigoPulse {
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
