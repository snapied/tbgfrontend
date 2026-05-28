// /solutions/for-teachers — 1:1 sessions, group cohorts, content.

import type { Metadata } from "next"
import Link from "next/link"
import {
  ArrowRight,
  BookOpen,
  Calendar,
  CheckCircle2,
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
  title: "Why Teachers Use Our Booking & Cohort Suite · The Big Class",
  description:
    "Launch your branded coaching portal. Sell 1:1 consultation slots, run interactive group cohorts, and ship structured course libraries under your own white-labeled custom URL.",
  alternates: { canonical: "https://thebigclass.com/solutions/for-teachers" },
}

export default function ForCoachesPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1">
        <SolutionPage
          eyebrow="For Teachers & Consultants"
          title={
            <>
              Your complete{" "}
              <span className="bg-gradient-to-r from-emerald-500 via-teal-500 to-violet-600 bg-clip-text text-transparent">
                Coaching Portal.
              </span>
            </>
          }
          subtitle="Stop managing your consulting practice through chaotic WhatsApp threads and multiple app bills. Host your custom white-labeled domain, sell 1:1 video slots, run group cohorts, and deliver gated resource libraries — all in one unified workspace with direct UPI & card checkouts."
          heroVisual={<CoachesHeroVisual />}
          outcomes={[
            {
              icon: <Mic className="h-5 w-5" />,
              title: "Sell 1:1 consultation slots instantly",
              body: "Provide a seamless client booking experience. Set your custom duration, select your availability, and configure buffer periods. Clients pay via native UPI and receive instant video credentials.",
            },
            {
              icon: <Users className="h-5 w-5" />,
              title: "Scale LTV with Premium Group Cohorts",
              body: "Move beyond trading hours for money. Launch high-value group coaching cohorts containing structured batch classes, interactive whiteboard sessions, doubts feeds, and automatic video replays.",
            },
            {
              icon: <BookOpen className="h-5 w-5" />,
              title: "Deliver Gated Resource Libraries",
              body: "Package your knowledge. Bundle guides, worksheets, Notion trackers, code repositories, or self-paced video modules as value additions to your premium coaching programs.",
            },
          ]}
          featureMap={[
            {
              icon: <Globe2 className="h-4 w-4" />,
              title: "White-labeled portal domains",
              body: "Deliver a premium, distraction-free experience (e.g. teacher.yourname.com) featuring your customized branding.",
              href: "/features/portal",
            },
            {
              icon: <Mic className="h-4 w-4" />,
              title: "1:1 Booking Slots",
              body: "Create premium consultation tickets with custom time buffers, slot parameters, and auto-generated room info.",
              href: "/features/storefront",
            },
            {
              icon: <Calendar className="h-4 w-4" />,
              title: "Interactive Live Cohorts",
              body: "Coordinate cohort sessions with LiveKit-powered classes, interactive polls, and automatic transcripts.",
              href: "/solutions/live-cohorts",
            },
            {
              icon: <Trophy className="h-4 w-4" />,
              title: "Student Communities",
              body: "Host active discussion rooms, homework feeds, leaderboard systems, and doubt resolving modules.",
              href: "/features/community",
            },
          ]}
          comparison={{
            alternativeName: "Glued App Stacks",
            rows: [
              {
                label: "All-in-One Capabilities",
                us: "Integrated: custom storefronts, time-slot calendars, video classes, cohort feeds, and certificates in one single dashboard.",
                them: "Forces you to maintain separate bills for Calendly + Zoom + Teachable + your custom website builder.",
              },
              {
                label: "Unified Client Database",
                us: "One comprehensive student profile: traces all their 1:1 consult histories, batch progress, and billing history seamlessly.",
                them: "Scattered data across 4 different platforms that never reconcile, causing endless manual admin work.",
              },
              {
                label: "Commission & Pricing",
                us: "0% platform commission. You pay a flat monthly fee and keep 100% of your earnings.",
                them: "Steals a heavy 5% to 10% commission fee cut on every checkout and membership ticket.",
              },
            ],
          }}
          cta={{
            title: "Your coaching practice — one workspace, your brand.",
            body: "Get started in 10 minutes. The free Starter plan is fully equipped to support your custom domain portal, first 1:1 consultation slot, and cohort batches.",
          }}
        />

        {/* ── Workflow Guide Section — How Teachers use this to monetize ── */}
        <section className="border-t border-border/60 py-20 bg-muted/10">
          <div className="mx-auto max-w-5xl px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-primary">The Workflow Guide</span>
              <h2 className="mt-3 text-balance text-3xl font-bold tracking-tight sm:text-4xl">
                The 3-Step Coaching & Client Funnel
              </h2>
              <p className="mt-3 text-muted-foreground">
                How professional educators configure their portals to land high-value consulting clients.
              </p>
            </div>

            <div className="mt-14 grid gap-8 md:grid-cols-3">
              {/* Step 1 */}
              <div className="relative rounded-2xl border border-border/80 bg-card p-6 shadow-sm">
                <div className="absolute -top-4 left-6 flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 font-bold text-white text-sm shadow-md">
                  1
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <Globe2 className="h-5 w-5 text-emerald-500" />
                  <h3 className="text-base font-bold text-foreground">Launch Your Portal</h3>
                </div>
                <p className="mt-4 text-xs font-bold uppercase text-muted-foreground tracking-wide">THE BRAND STAGE</p>
                <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                  Setup your white-labeled consulting portal (e.g. teacher.yourname.com) on day one. List your expertise, credentials, past client reviews, and custom branding templates without writing a line of code.
                </p>
              </div>

              {/* Step 2 */}
              <div className="relative rounded-2xl border border-border/80 bg-card p-6 shadow-sm">
                <div className="absolute -top-4 left-6 flex h-8 w-8 items-center justify-center rounded-full bg-violet-600 font-bold text-white text-sm shadow-md">
                  2
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <Mic className="h-5 w-5 text-violet-500" />
                  <h3 className="text-base font-bold text-foreground">Sell Gated 1:1 Slots</h3>
                </div>
                <p className="mt-4 text-xs font-bold uppercase text-muted-foreground tracking-wide">THE CONSULT STAGE</p>
                <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                  List custom 1:1 strategy consultation slots. Clients land on your domain, select an available date/time slot, checkout instantly using mobile UPI, and automatically receive secure video credentials.
                </p>
              </div>

              {/* Step 3 */}
              <div className="relative rounded-2xl border border-border/80 bg-card p-6 shadow-sm">
                <div className="absolute -top-4 left-6 flex h-8 w-8 items-center justify-center rounded-full bg-indigo-500 font-bold text-white text-sm shadow-md">
                  3
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <Users className="h-5 w-5 text-indigo-500" />
                  <h3 className="text-base font-bold text-foreground">Upsell Cohorts & Content</h3>
                </div>
                <p className="mt-4 text-xs font-bold uppercase text-muted-foreground tracking-wide">THE SCALE STAGE</p>
                <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                  Move your 1:1 consulting clients into high-margin cohort groups, monthly training batches, or self-paced learning programs. Bundle video courses with interactive homework and points leaderboards.
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
                Who uses our coaching suite?
              </h2>
              <p className="mt-3 text-muted-foreground">
                Tailored solutions for every genre of professional educator, consultant, and mentor.
              </p>
            </div>

            <div className="mt-12 grid gap-6 sm:grid-cols-2">
              <div className="rounded-xl border border-border/80 p-5 flex items-start gap-4 hover:bg-muted/10 transition-colors">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500 shrink-0">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-foreground">Business & Executive Coaching</h4>
                  <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
                    Conduct private strategy reviews, coordinate custom company action plans, host team whiteboard sprints, and secure high-value consulting checks natively.
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-border/80 p-5 flex items-start gap-4 hover:bg-muted/10 transition-colors">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/10 text-violet-500 shrink-0">
                  <Calendar className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-foreground">Fitness, Diet & Wellness Mentors</h4>
                  <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
                    List custom calorie trackers, schedule 1:1 diet consult sheets, host live group wellness cohorts, and drip-feed weekly training videos safely inside their portal.
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-border/80 p-5 flex items-start gap-4 hover:bg-muted/10 transition-colors">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-500 shrink-0">
                  <GraduationCap className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-foreground">Career & Leadership Mentors</h4>
                  <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
                    Organize cohort career acceleration bootcamps. Bundle resume checklist guides, coordinate job assignment deadlines, and award verifiable certificates of completion.
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-border/80 p-5 flex items-start gap-4 hover:bg-muted/10 transition-colors">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500 shrink-0">
                  <ShoppingBag className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-foreground">Creative & Technical Advisors</h4>
                  <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
                    Provide 1:1 portfolio or system architecture code reviews. Instantly sell Notion frameworks, preset asset directories, and custom guides under their brand.
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

// ─── Gorgeous Custom Teachers Visual ──────────────────────────────────────────

function CoachesHeroVisual() {
  return (
    <div className="relative mx-auto w-full max-w-[500px]">
      {/* Background glow orbs */}
      <div
        className="pointer-events-none absolute -top-10 -right-10 h-64 w-64 rounded-full opacity-20 blur-[80px]"
        style={{
          background: "radial-gradient(circle, #10b981 0%, transparent 70%)",
          animation: "greenPulse 6s ease-in-out infinite",
        }}
      />
      <div
        className="pointer-events-none absolute -bottom-10 -left-10 h-64 w-64 rounded-full opacity-20 blur-[80px]"
        style={{
          background: "radial-gradient(circle, #6366f1 0%, transparent 70%)",
          animation: "indigoPulse 6s ease-in-out infinite 3s",
        }}
      />

      {/* ── Main Mockup: Calendar Scheduling Dashboard ── */}
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
            academy.executivecoach.com
          </div>
        </div>

        {/* Calendar visual */}
        <div className="p-4 bg-muted/20 border-b border-border/50">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">Jessica&apos;s Availability</span>
            <span className="text-[9px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">12 slots open this week</span>
          </div>
          {/* Calendar row of dates */}
          <div className="grid grid-cols-5 gap-1.5">
            {[
              { day: "Mon", date: "28", active: true },
              { day: "Tue", date: "29", active: true, selected: true },
              { day: "Wed", date: "30", active: true },
              { day: "Thu", date: "31", active: false },
              { day: "Fri", date: "01", active: true },
            ].map((d) => (
              <div
                key={d.date}
                className={`rounded-lg p-2 text-center border transition-all ${
                  d.selected
                    ? "bg-emerald-500 border-emerald-600 text-white shadow-md scale-105"
                    : d.active
                    ? "bg-card border-border hover:border-emerald-500"
                    : "bg-muted/40 border-transparent opacity-40"
                }`}
              >
                <p className={`text-[8px] font-bold ${d.selected ? "text-white/90" : "text-muted-foreground"}`}>{d.day}</p>
                <p className="text-xs font-black mt-0.5">{d.date}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Selected Day Slots */}
        <div className="p-4 space-y-2">
          <p className="text-[9px] font-extrabold uppercase tracking-wider text-muted-foreground">Select a time slot (IST)</p>
          <div className="grid grid-cols-3 gap-2">
            {["10:00 AM", "11:30 AM", "03:00 PM"].map((time, i) => (
              <div
                key={time}
                className={`rounded-lg border text-center py-2 text-[10px] font-bold transition-all cursor-pointer ${
                  i === 2
                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600"
                    : "border-border bg-card/50 hover:border-border-hover"
                }`}
              >
                {time}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Floating Widget 1: Revenue Stack Comparison ── */}
      <div
        className="absolute -left-10 -bottom-5 z-20 w-44 rounded-xl border border-border bg-card/95 p-3.5 shadow-2xl backdrop-blur-md"
        style={{
          animation: "floatInUp 0.6s ease-out 0.2s both",
          boxShadow: "0 20px 50px -10px rgba(0,0,0,0.3)",
        }}
      >
        <div className="flex items-center gap-1.5 text-[8px] font-bold text-muted-foreground uppercase tracking-wider">
          <TrendingUp className="h-3 w-3 text-emerald-500" />
          Revenue lift
        </div>
        <div className="mt-2.5 space-y-2">
          <div>
            <div className="flex justify-between text-[8px] font-semibold text-rose-500 mb-0.5">
              <span>Calendly + Zoom fees</span>
              <span>₹3,800/mo</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-muted">
              <div className="h-full rounded-full bg-rose-500" style={{ width: "20%" }} />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-[8px] font-bold text-emerald-600 mb-0.5">
              <span>Unified Academy</span>
              <span>₹1,84,200</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-muted">
              <div className="h-full rounded-full bg-emerald-500" style={{ width: "95%" }} />
            </div>
          </div>
        </div>
      </div>

      {/* ── Floating Widget 2: Booking Notification ── */}
      <div
        className="absolute -right-6 top-1/4 z-20 flex items-center gap-2.5 rounded-full border border-emerald-500/20 bg-card/95 px-3.5 py-2 shadow-xl backdrop-blur-md"
        style={{
          animation: "floatInUp 0.5s ease-out 0.4s both",
        }}
      >
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/15">
          <IndianRupee className="h-3.5 w-3.5 text-emerald-600" />
        </div>
        <div>
          <p className="text-[8px] font-bold leading-none text-muted-foreground">1:1 BOOKING CONFIRMED</p>
          <p className="mt-0.5 text-[9px] font-extrabold text-foreground">₹2,999 from Rohan K.</p>
        </div>
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
      </div>

      {/* ── Floating Badge 3: Client active status ── */}
      <div
        className="absolute -right-4 -bottom-3 z-20 flex items-center gap-2 rounded-lg border border-indigo-500/20 bg-card/95 p-2 shadow-lg backdrop-blur-md"
        style={{
          animation: "floatInUp 0.5s ease-out 0.6s both",
        }}
      >
        <Users className="h-4 w-4 text-indigo-500" />
        <div className="text-[8px] leading-tight">
          <span className="font-bold block text-foreground">184 active clients</span>
          <span className="text-muted-foreground font-semibold">1:1s + cohort batches</span>
        </div>
      </div>

      {/* Keyframe Styling */}
      <style>{`
        @keyframes greenPulse {
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
