"use client"

import Link from "next/link"
import {
  ArrowRight,
  BarChart3,
  Briefcase,
  Building2,
  CheckCircle2,
  ClipboardList,
  Film,
  FlaskConical,
  GraduationCap,
  Languages,
  Hand,
  Heart,
  MessageSquare,
  Sparkles,
  User as UserIcon,
  Users,
} from "lucide-react"
import { Header } from "@/components/landing/header"
import { Footer } from "@/components/landing/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { UseCaseScene } from "@/components/landing/use-case-scenes"
import { cn } from "@/lib/utils"

interface UseCase {
  id: string
  icon: React.ElementType
  who: string
  headline: string
  body: string
  pillars: Array<{ title: string; detail: string }>
  cta: string
}

const USE_CASES: UseCase[] = [
  {
    id: "school-teacher-kishor",
    icon: FlaskConical,
    who: "School teachers with hired staff",
    headline: "Commissions, contracts, and student privacy — on auto-pilot.",
    body:
      "Kishor runs a chemistry academy in Jaipur with a hired teacher, Gaurav. Commission tracking used to live on paper. Now it's automated, transparent, and legally signed — with student data locked down.",
    pillars: [
      { title: "Invite & set commission", detail: "Two-step wizard: profile + 70/30 split with live preview of the exact math." },
      { title: "Legal agreement built in", detail: "Auto-generated contract with IP, privacy, and non-compete clauses. Signed digitally." },
      { title: "Full payout transparency", detail: "Gaurav sees every transaction's math. Student names are masked. No hidden fees." },
      { title: "Student data is locked", detail: "Anti-bypass filter auto-redacts phone numbers and emails in messages." },
    ],
    cta: "Read Kishor's full story →",
  },
  {
    id: "english-teacher-lovejeet",
    icon: Languages,
    who: "Solo teachers with live classes",
    headline: "Auto-reminders, recordings, certificates — zero admin work.",
    body:
      "Lovejeet teaches spoken English in Chandigarh to 80 students. She was spending 2 hours daily on WhatsApp reminders. Now the platform sends them automatically, records every class, and generates certificates in bulk.",
    pillars: [
      { title: "Auto class reminders", detail: "WhatsApp + email reminders 24h, 1h, and 5min before every live class. Zero manual messaging." },
      { title: "Auto-recorded classes", detail: "Every live class is recorded with AI-generated chapters. Absent students catch up on their own." },
      { title: "Bulk certificates", detail: "17 templates, CSV upload, QR verification. 30 certificates in 2 minutes." },
      { title: "Payment links via WhatsApp", detail: "Send a link, parent pays, student auto-enrolled. No manual enrollment." },
    ],
    cta: "Read Lovejeet's full story →",
  },
  {
    id: "solo-instructor",
    icon: UserIcon,
    who: "Solo creators & teachers",
    headline: "Stop stitching seven tools together.",
    body:
      "You teach, you market, you run the store — alone. The Big Class collapses the toolchain into one workspace so you can focus on the cohort, not the plumbing.",
    pillars: [
      { title: "Sell day one",          detail: "Your own subdomain + checkout in three minutes." },
      { title: "Run weekly cohorts",    detail: "Recurring live classes with one reusable Meet link." },
      { title: "Show social proof",     detail: "Wall of Love grows itself as students share their wins." },
      { title: "Get paid for referrals", detail: "Refer & Earn gives every fan a personal invite link." },
    ],
    cta: "Launch your creator academy",
  },
  {
    id: "school",
    icon: GraduationCap,
    who: "Schools & coaching institutes",
    headline: "Move your batches online without losing the structure.",
    body:
      "Instructors run their own subjects under your brand. Bulk-import the roster from CSV, assign instructors, and you have a parent-facing platform on Monday.",
    pillars: [
      { title: "One brand, many teachers", detail: "Each instructor gets their own classes + courses inside one workspace." },
      { title: "Attendance + reports",     detail: "Per-class attendance feeds the leaderboard and parent-facing progress." },
      { title: "Parent comms",             detail: "Announcements hit in-app, email, and WhatsApp in one shot." },
      { title: "Certificates at term end", detail: "CSV upload → 200 certificates in two minutes." },
    ],
    cta: "Set up your institute",
  },
  {
    id: "college",
    icon: Building2,
    who: "Colleges & universities",
    headline: "A modern LMS that doesn't require an IT department.",
    body:
      "Departments self-serve their own courses. Custom domain stays under your university brand. SSO on Scale plugs into Google Workspace or Microsoft 365.",
    pillars: [
      { title: "Department-led courses",  detail: "Faculty members own their syllabi without admin bottlenecks." },
      { title: "Verified credentials",    detail: "Every graduating student gets a tamper-evident cert + public verify page." },
      { title: "Bring your own domain",   detail: "Runs end-to-end at learn.youruniversity.edu." },
      { title: "SSO on Scale",            detail: "Google Workspace / Microsoft 365 single sign-on." },
    ],
    cta: "Get a department live",
  },
  {
    id: "corporate",
    icon: Briefcase,
    who: "Corporate L&D",
    headline: "Internal training that people actually finish.",
    body:
      "Roll out compliance training, onboarding tracks, or sales academies. Track completion at the team level, run live AMAs, issue verifiable certs that employees can post on LinkedIn.",
    pillars: [
      { title: "Onboarding tracks",       detail: "New-hire courses unlock as they progress, with quizzes for sign-off." },
      { title: "Live AMAs with leaders",  detail: "Recurring office hours auto-record and stay on the class card." },
      { title: "Manager dashboards",      detail: "Team-level completion + quiz scores, no IT ticket required." },
      { title: "LinkedIn-share certs",    detail: "17 templates plus your custom one — verifiable by recruiters." },
    ],
    cta: "Spin up an internal academy",
  },
  {
    id: "ngo",
    icon: Heart,
    who: "Non-profits & NGOs",
    headline: "Train educators and beneficiaries at zero infrastructure cost.",
    body:
      "Starter is free, forever. Run training programs for field workers, beneficiaries, or partner schools — without a server bill, a developer, or a procurement cycle.",
    pillars: [
      { title: "Forever-free Starter",    detail: "50 active students, 3 courses, all teaching features." },
      { title: "WhatsApp-first reminders", detail: "Where your participants actually are." },
      { title: "Multilingual content",    detail: "Lessons accept any language — Hindi, Tamil, Swahili, Spanish." },
      { title: "40% off Scale",           detail: "When you outgrow Starter, NGOs get Scale at 40% off." },
    ],
    cta: "Start your training program",
  },
]

export default function UseCasesPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-secondary via-background to-background" />
          <div className="relative mx-auto max-w-5xl px-6 py-20 text-center lg:px-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-semibold text-accent-foreground">
              <Sparkles className="h-3 w-3" />
              Built for everyone who teaches, from one to a thousand
            </div>
            <h1 className="mt-4 text-4xl font-bold tracking-tight text-balance sm:text-5xl">
              One platform. Many ways to teach.
            </h1>
            <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
              Whether you&apos;re a solo teacher, a coaching institute with 80 teachers, a university department, a corporate L&amp;D team, or an NGO running training programs — the workspace adapts.
            </p>
          </div>
        </section>

        {/* Quick-jump tiles */}
        <section className="pb-2">
          <div className="mx-auto grid max-w-5xl gap-3 px-6 sm:grid-cols-2 lg:grid-cols-3 lg:px-8">
            {USE_CASES.map((u) => (
              <a
                key={u.id}
                href={`#${u.id}`}
                className="group flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary transition-transform group-hover:scale-110">
                  <u.icon className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{u.who}</p>
                  <p className="truncate text-[11px] text-muted-foreground">{u.headline}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </a>
            ))}
          </div>
        </section>

        {/* Each use case section */}
        <div className="space-y-2 pb-10">
          {USE_CASES.map((u, i) => (
            <UseCaseBlock key={u.id} useCase={u} reverse={i % 2 === 1} />
          ))}
        </div>

        {/* In-class scenarios — real moments inside a live class
            where the May 2026 sprint features pay off. Each card
            is a 30-second vignette: the problem the host had on
            other platforms vs. how it plays out here. */}
        <section className="border-y border-border bg-muted/30 py-16">
          <div className="mx-auto max-w-6xl px-6 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-xs font-bold uppercase tracking-wider text-primary">
                Live-class scenarios
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
                The moments other LMS platforms quietly drop.
              </h2>
              <p className="mt-3 text-base text-muted-foreground">
                Six recurring &ldquo;wait, how do I do this live?&rdquo; situations
                — and how the in-class surface answers them without you alt-tabbing
                to a second tool.
              </p>
            </div>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <ScenarioCard
                icon={BarChart3}
                moment="Mid-lecture pulse check"
                before="You ask 'who's with me so far?' and three students unmute at once."
                after="Launch a 4-option poll from the host rail. Results render live; everyone enrolled (plus invited co-instructors) gets a notification so absentees can tap in to vote."
              />
              <ScenarioCard
                icon={Hand}
                moment="Five hands at once"
                before="Three students unmute over each other while two type a question in chat. You forget who was first."
                after="The raised-hand queue orders questions by raise time with a Live #N badge. One click Answers them and clears the queue."
              />
              <ScenarioCard
                icon={ClipboardList}
                moment="Late joiner walks in at 12:30"
                before="They DM 'what did I miss?' and you re-explain Module 3 while losing the room."
                after="Late joiners auto-see a 'You missed: Recap last week, Hooks intro' banner — pulled from the agenda items you ticked off."
              />
              <ScenarioCard
                icon={Users}
                moment="Punctual start, awkward wait"
                before="You open the Meet on time but don't know if anyone showed up. You wait 10 minutes for 'enough' students."
                after="The lobby roster shows you 18 students loaded before you opened the door. Hit Start — everyone auto-admits."
              />
              <ScenarioCard
                icon={MessageSquare}
                moment="Best question of the class — at minute 41"
                before="A student types a brilliant question in chat. After the class, the chat is gone and the recording has no context."
                after="Class chat persists to the recording. Re-watchers see the question at minute 41 and can click it to jump to the moment."
              />
              <ScenarioCard
                icon={Film}
                moment="60-min lecture, no way to skim"
                before="A student needs the 4-minute bit on useEffect cleanup. They scrub through the whole hour."
                after="Auto-chapters parse 'now let's talk about cleanup' from the transcript. The chip rail under the video drops them at minute 38."
              />
            </div>
          </div>
        </section>

        {/* Switch-from playbook strip */}
        <section className="border-y border-border bg-card py-16">
          <div className="mx-auto max-w-4xl px-6 lg:px-8">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Switching from another LMS?
            </h2>
            <p className="mt-3 text-muted-foreground">
              We&apos;ve helped teachers migrate from spreadsheets, Notion pages, Google Classroom, paid LMS tools, and homegrown WordPress builds. The playbook is the same.
            </p>
            <ol className="mt-6 space-y-3 text-sm">
              {[
                "Export your student roster to CSV (we accept any column order).",
                "Drop the CSV into Manage Students — we ask for WhatsApp + email up front so reminders just work.",
                "Build a course or import one syllabus at a time — modules / lessons / quizzes.",
                "Schedule your next live class. Students get a Meet/Zoom invite via in-app + email + WhatsApp.",
                "Wall of Love + leaderboard fill in as the cohort runs. Refer & Earn captures word-of-mouth automatically.",
              ].map((step, i) => (
                <li key={step} className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
                    {i + 1}
                  </span>
                  <span className="flex-1 leading-relaxed">{step}</span>
                </li>
              ))}
            </ol>
            <Button asChild className="mt-6 gap-2">
              <Link href="/signup">
                Start the migration <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>

        {/* Closing CTA */}
        <section className="py-20">
          <div className="mx-auto max-w-3xl px-6 text-center lg:px-8">
            <h2 className="text-3xl font-bold tracking-tight">
              Your workspace is three minutes away.
            </h2>
            <p className="mt-3 text-muted-foreground">
              Free to start. No credit card. Your subdomain ready before your tea is brewed.
            </p>
            <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button asChild size="lg" className="gap-2">
                <Link href="/signup">
                  Launch your academy free
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/pricing">See pricing</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}

function ScenarioCard({
  icon: Icon,
  moment,
  before,
  after,
}: {
  icon: React.ElementType
  moment: string
  before: string
  after: string
}) {
  return (
    <Card className="h-full">
      <CardContent className="space-y-3 p-5">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="h-4 w-4" />
          </span>
          <h3 className="text-sm font-bold leading-snug">{moment}</h3>
        </div>
        <div className="rounded-md border border-border bg-muted/40 p-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Elsewhere
          </p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{before}</p>
        </div>
        <div className="rounded-md border border-success/30 bg-success/[0.05] p-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-success">
            Here
          </p>
          <p className="mt-1 text-xs leading-relaxed text-foreground">{after}</p>
        </div>
      </CardContent>
    </Card>
  )
}

function UseCaseBlock({ useCase, reverse }: { useCase: UseCase; reverse: boolean }) {
  const Icon = useCase.icon
  return (
    <section id={useCase.id} className="py-16">
      <div className="mx-auto max-w-5xl px-6 lg:px-8">
        <Card>
          <CardContent className="grid items-stretch gap-0 p-0 lg:grid-cols-2">
            <div className={cn("p-8 lg:p-10", reverse && "lg:order-2")}>
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-primary">
                <Icon className="h-3.5 w-3.5" /> {useCase.who}
              </div>
              <h2 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">{useCase.headline}</h2>
              <p className="mt-3 leading-relaxed text-muted-foreground">{useCase.body}</p>
              <ul className="mt-5 space-y-2.5 text-sm">
                {useCase.pillars.map((p) => (
                  <li key={p.title} className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                    <span>
                      <span className="font-semibold">{p.title}.</span>{" "}
                      <span className="text-muted-foreground">{p.detail}</span>
                    </span>
                  </li>
                ))}
              </ul>
              <Button asChild className="mt-6 gap-2">
                <Link href={
                  useCase.id === "school-teacher-kishor" ? "/use-cases/school-teacher-kishor"
                  : useCase.id === "english-teacher-lovejeet" ? "/use-cases/english-teacher-lovejeet"
                  : "/signup"
                }>
                  {useCase.cta} <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
            <div className={cn("relative flex items-center justify-center bg-gradient-to-br from-secondary/40 via-background to-secondary/20 p-6 lg:p-8", reverse && "lg:order-1")}>
              <UseCaseScene id={useCase.id} />
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  )
}

