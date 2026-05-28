"use client"

import Link from "next/link"
import Image from "next/image"
import {
  ArrowRight,
  Award,
  Bell,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  Globe,
  GraduationCap,
  Languages,
  MessageSquare,
  Mic,
  Monitor,
  Palette,
  Phone,
  PlayCircle,
  Send,
  Sparkles,
  Star,
  UserCheck,
  Users,
  Video,
  Zap,
} from "lucide-react"
import { Header } from "@/components/landing/header"
import { Footer } from "@/components/landing/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

// ── Data ────────────────────────────────────────────────────────

const BEFORE_PROBLEMS = [
  {
    icon: Bell,
    title: "Class reminders eat 2 hours every day",
    desc: "Lovejeet manually messages 80+ students on WhatsApp before every class. Copy-paste the Zoom link, remind them of the time, chase absentees. Two hours of admin work for a 45-minute class.",
  },
  {
    icon: Phone,
    title: "Students forget to join — or join the wrong link",
    desc: "She uses Zoom, but the link changes every session. Students DM her asking for 'today's link' 10 minutes before class. Some join yesterday's link and sit in an empty room.",
  },
  {
    icon: MessageSquare,
    title: "No recordings = no catch-up",
    desc: "Students who miss a class have to wait until she re-explains the topic. There's no recording, no replay, no notes. Absent students fall behind and eventually drop out.",
  },
  {
    icon: Award,
    title: "Certificates are a manual nightmare",
    desc: "At the end of each batch, parents ask for certificates. Lovejeet designs each one in Canva, fills in the student name, downloads the PDF, sends it on WhatsApp. For 30 students, that's an entire evening.",
  },
  {
    icon: Globe,
    title: "No online presence — only word of mouth",
    desc: "Lovejeet has no website, no course page, no public listing. New students find her through WhatsApp forwards. She can't share a professional link when someone asks 'what do you teach?'",
  },
  {
    icon: Calendar,
    title: "Scheduling is a WhatsApp group nightmare",
    desc: "Schedule changes, holiday announcements, makeup classes — everything happens in a 200-message WhatsApp group where important updates get buried under 'thank you ma'am' replies.",
  },
]

const WALKTHROUGH_STEPS = [
  {
    step: 1,
    icon: Globe,
    title: "Lovejeet gets her own branded academy site",
    subtitle: "lovejeet.thebigclass.com — live in 5 minutes",
    desc: "She picks a subdomain, uploads her logo, sets her brand colors, and has a professional course catalog live on the internet. Parents can see her courses, pricing, and schedule — all in one place.",
    image: "/images/features/storefront.png",
    detail: "The public site includes: course listings with descriptions and pricing, instructor bio, testimonials wall, and a branded checkout. She shares lovejeet.thebigclass.com on WhatsApp and her Instagram bio.",
  },
  {
    step: 2,
    icon: BookOpen,
    title: "Creates her English courses with AI",
    subtitle: "AI Course Builder → full curriculum in 2 minutes",
    desc: "She types 'Spoken English for Class 8-10' and the AI generates a complete course: 12 modules, 40 lessons, quiz questions, learning outcomes, and SEO metadata. She tweaks the titles and hits Create.",
    image: "/images/features/courses.png",
    detail: "Each course has: modules with lessons, video/text/PDF content types, quizzes per module, assignments, a preview lesson for free, and pricing. She creates 3 courses: Spoken English, Grammar Masterclass, and IELTS Prep.",
  },
  {
    step: 3,
    icon: Video,
    title: "Runs live classes — with auto-reminders",
    subtitle: "No more copy-pasting Zoom links on WhatsApp",
    desc: "She schedules a live class in the dashboard. The platform automatically sends reminders to enrolled students via WhatsApp and email — 24 hours before, 1 hour before, and 5 minutes before. One permanent link, no Zoom juggling.",
    image: "/images/features/live-classes.png",
    detail: "The live class has: a waiting room, attendance tracking, raise-hand queue, screen sharing, in-class chat (with anti-bypass filter), and auto-recording. Students join from the course page — no separate link needed. Absent students get a 'you missed this class' notification with the recording link.",
  },
  {
    step: 4,
    icon: PlayCircle,
    title: "Every class is auto-recorded and chaptered",
    subtitle: "Students who miss class catch up on their own",
    desc: "After every live class, the recording appears in the course timeline within minutes. AI generates chapters ('Tenses review at 4:12', 'Practice exercise at 18:30') so students can jump to what they missed. No more re-explaining the same topic.",
    image: "/images/features/courses.png",
    detail: "Recordings include: auto-generated chapters, searchable transcript, class chat replay synced to the video timeline, and download option for offline viewing. The teacher can trim the recording or hide it for specific classes.",
  },
  {
    step: 5,
    icon: Send,
    title: "Sends payment links to parents via WhatsApp",
    subtitle: "Course page → Send Payment Link → parent pays → student enrolled",
    desc: "When a parent enquires, Lovejeet sends a payment link from the course's menu. The parent opens it on their phone, sees the course details, pays via Razorpay, and the student is enrolled automatically. No manual enrollment.",
    image: "/images/features/storefront.png",
    detail: "The payment link shows: academy branding, course title, class count, fee breakdown, and Lovejeet's personal note ('Hi Ananya's mom, this is the spoken English batch we discussed'). After payment, the parent registers and the student gets access immediately.",
  },
  {
    step: 6,
    icon: Award,
    title: "Generates certificates in bulk — one click",
    subtitle: "CSV upload → 30 certificates in 2 minutes",
    desc: "At the end of the batch, Lovejeet uploads a CSV with student names. The platform generates beautiful certificates from 17 built-in templates — each with the student's name, course title, date, and her signature. Download all as a ZIP or send individually.",
    image: "/images/features/certificates.png",
    detail: "Certificate templates include: modern, classic, elegant, playful, and more. Each can be customized with logo, colors, and signature. Certificates have a unique QR code linking to a public verification page — parents can verify authenticity by scanning.",
  },
  {
    step: 7,
    icon: Users,
    title: "Builds a community around her teaching",
    subtitle: "Announcements, doubt sessions, leaderboard, wall of love",
    desc: "Students post doubts, Lovejeet answers with AI-assisted replies. A leaderboard tracks quiz scores. Parents leave testimonials on the Wall of Love. Announcements reach everyone without getting buried in a WhatsApp group.",
    image: "/images/features/community.png",
    detail: "The community includes: per-batch discussion groups, Q&A with doubt threading, announcement broadcasts (email + WhatsApp + in-app), a public testimonial wall, and a gamified leaderboard with points for quiz scores and assignment submissions.",
  },
  {
    step: 8,
    icon: Star,
    title: "Students rate her after every class",
    subtitle: "Feedback popup → ratings + tags → teaching insights",
    desc: "After each live class, students see a quick feedback popup: 5-star rating, tags like 'Clear', 'Engaging', 'Helpful', and an optional comment. Lovejeet sees her strengths trending up and areas to improve — without it becoming a complaint wall.",
    image: "/images/features/courses.png",
    detail: "Admin sees full feedback with student names. Lovejeet sees only aggregate ratings and moderated comments. Improvement tags only show when 3+ students mention the same thing. Feedback doesn't affect payouts — it's purely for teaching quality improvement.",
  },
]

const AFTER_BENEFITS = [
  { icon: CheckCircle2, text: "Auto WhatsApp + email reminders — no more manual messaging before every class" },
  { icon: CheckCircle2, text: "One permanent class link — students join from the course page, no Zoom link juggling" },
  { icon: CheckCircle2, text: "Auto-recorded classes with chapters — absent students catch up on their own" },
  { icon: CheckCircle2, text: "Professional academy site — shareable link for WhatsApp bio and Instagram" },
  { icon: CheckCircle2, text: "AI course builder — full curriculum generated in 2 minutes" },
  { icon: CheckCircle2, text: "Payment links via WhatsApp — parent pays, student auto-enrolled" },
  { icon: CheckCircle2, text: "Bulk certificates with verification QR codes — 30 certificates in 2 minutes" },
  { icon: CheckCircle2, text: "Student feedback after every class — strengths and improvement insights" },
  { icon: CheckCircle2, text: "Community with announcements — no more buried WhatsApp messages" },
  { icon: CheckCircle2, text: "Multilingual support — teach in Hindi, English, or both" },
]

const FEATURE_HIGHLIGHTS = [
  {
    q: "How does the auto-reminder work?",
    a: "When you schedule a live class, the platform sends 3 automatic reminders: 24 hours before (email + WhatsApp), 1 hour before (WhatsApp), and 5 minutes before (push notification + WhatsApp). Students get the class link in every reminder. You don't send a single manual message.",
  },
  {
    q: "What if a student misses the class?",
    a: "They get a notification: 'You missed Spoken English — Session 5. Watch the recording here.' The recording has AI-generated chapters so they can jump to the exact topic they missed. The teacher doesn't need to re-explain anything.",
  },
  {
    q: "Can parents see the student's progress?",
    a: "Yes. Parents log in with their own account and see: courses enrolled, lessons completed, quiz scores, attendance, and certificates earned. No separate report card needed.",
  },
  {
    q: "How do certificates work?",
    a: "Choose a template, upload your student list (CSV or from the enrolled list), and click Generate. Each certificate gets the student's name, course title, completion date, your signature, and a QR code. The QR links to a public verification page — tamper-proof and shareable on LinkedIn.",
  },
  {
    q: "Can I teach in Hindi?",
    a: "Yes. The platform supports 10 Indian languages (Hindi, Bengali, Tamil, Telugu, Marathi, Gujarati, Kannada, Malayalam, Punjabi) plus English. Your public site, course content, and student dashboard all adapt. You can even create courses with mixed-language content.",
  },
  {
    q: "What about payment collection?",
    a: "Three options: (1) Students buy directly from your public course page. (2) You send a personal payment link via WhatsApp. (3) You share a reusable payment link on social media. All payments go through Razorpay with UPI, cards, and net banking. Money lands in your account — zero platform commission.",
  },
]

// ── Components ──────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
      <Sparkles className="h-3 w-3" />
      {children}
    </div>
  )
}

function PersonaCard({ name, role, emoji, traits, color }: {
  name: string; role: string; emoji: string; traits: string[]; color: string
}) {
  return (
    <Card className={cn("border-2", color)}>
      <CardContent className="p-6">
        <div className="flex items-center gap-4">
          <span className="text-5xl">{emoji}</span>
          <div>
            <p className="text-xl font-bold">{name}</p>
            <p className="text-sm text-muted-foreground">{role}</p>
          </div>
        </div>
        <ul className="mt-4 space-y-1.5">
          {traits.map((t, i) => (
            <li key={i} className="flex items-start gap-2 text-sm">
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
              {t}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}

// ── Page ────────────────────────────────────────────────────────

export default function LovejeetUseCasePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main id="main-content" className="flex-1">

        {/* ── Hero ──────────────────────────────────────────────── */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-secondary via-background to-background" />
          <div className="relative mx-auto max-w-5xl px-6 py-20 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <SectionLabel>Real-world use case</SectionLabel>
              <h1 className="mt-4 text-4xl font-bold tracking-tight text-balance sm:text-5xl lg:text-6xl">
                How Lovejeet teaches English to 80 students
                <span className="text-primary"> without burning out.</span>
              </h1>
              <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
                Lovejeet teaches spoken English and grammar in Chandigarh. She was spending 2 hours
                every day just sending class reminders on WhatsApp. Here&apos;s how she replaced
                manual admin work with a system that runs itself — and grew her batch from 30 to 80 students.
              </p>
            </div>
          </div>
        </section>

        {/* ── Meet Lovejeet ─────────────────────────────────────── */}
        <section className="py-16">
          <div className="mx-auto max-w-5xl px-6 lg:px-8">
            <div className="text-center mb-10">
              <SectionLabel>The teacher</SectionLabel>
              <h2 className="mt-3 text-3xl font-bold">Meet Lovejeet</h2>
            </div>
            <div className="mx-auto max-w-xl">
              <PersonaCard
                name="Lovejeet Kaur"
                role="English Teacher — Solo Instructor"
                emoji="👩‍🏫"
                color="border-purple-200 dark:border-purple-800"
                traits={[
                  "Teaches Spoken English, Grammar, and IELTS Prep in Chandigarh",
                  "80 students across 3 batches (Class 8-10, College, Working professionals)",
                  "Uses Zoom for live classes — different link every time",
                  "Sends reminders manually on WhatsApp before every session",
                  "Makes certificates in Canva one by one",
                  "No website — students find her through WhatsApp forwards",
                  "Biggest pain: 2 hours/day just on admin, not teaching",
                ]}
              />
            </div>
          </div>
        </section>

        {/* ── The problem ───────────────────────────────────────── */}
        <section className="border-y border-border bg-muted/30 py-16">
          <div className="mx-auto max-w-5xl px-6 lg:px-8">
            <div className="text-center mb-10">
              <SectionLabel>The problem</SectionLabel>
              <h2 className="mt-3 text-3xl font-bold">
                What <span className="text-red-500">2 hours of daily admin</span> looks like
              </h2>
              <p className="mt-3 text-muted-foreground">
                Lovejeet is a great teacher. But half her working day is spent on logistics,
                not teaching. Here&apos;s what eats her time.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {BEFORE_PROBLEMS.map((p) => (
                <Card key={p.title} className="border-red-200/50 dark:border-red-800/30">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
                        <p.icon className="h-4.5 w-4.5" />
                      </span>
                      <p className="text-sm font-bold">{p.title}</p>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">{p.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* ── The walkthrough ───────────────────────────────────── */}
        <section className="py-20">
          <div className="mx-auto max-w-6xl px-6 lg:px-8">
            <div className="text-center mb-16">
              <SectionLabel>Step-by-step walkthrough</SectionLabel>
              <h2 className="mt-3 text-3xl font-bold sm:text-4xl">
                How Lovejeet runs her academy — <span className="text-primary">without the admin work</span>
              </h2>
              <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">
                From zero online presence to a fully automated teaching business. Every feature she uses, shown in action.
              </p>
            </div>

            <div className="space-y-24">
              {WALKTHROUGH_STEPS.map((step, i) => (
                <div
                  key={step.step}
                  className={cn(
                    "grid items-center gap-10 lg:grid-cols-2",
                    i % 2 === 1 && "lg:[&>*:first-child]:order-2",
                  )}
                >
                  {/* Text side */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                        {step.step}
                      </span>
                      <step.icon className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="text-2xl font-bold">{step.title}</h3>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {step.subtitle}
                    </p>
                    <p className="text-base text-muted-foreground leading-relaxed">
                      {step.desc}
                    </p>
                    <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                      <p className="text-xs font-semibold text-primary mb-1">Under the hood</p>
                      <p className="text-sm text-muted-foreground">{step.detail}</p>
                    </div>
                  </div>

                  {/* Image side */}
                  <div className="overflow-hidden rounded-xl border border-border bg-card shadow-lg">
                    <div className="flex items-center gap-2 border-b border-border bg-muted/50 px-4 py-2">
                      <div className="flex gap-1.5">
                        <span className="h-3 w-3 rounded-full bg-red-400" />
                        <span className="h-3 w-3 rounded-full bg-amber-400" />
                        <span className="h-3 w-3 rounded-full bg-green-400" />
                      </div>
                      <span className="flex-1 text-center text-xs text-muted-foreground">{step.subtitle}</span>
                    </div>
                    <div className="relative aspect-[16/10]">
                      <Image
                        src={step.image}
                        alt={step.title}
                        fill
                        className="object-cover object-top"
                        sizes="(max-width: 768px) 100vw, 50vw"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── After — benefits summary ──────────────────────────── */}
        <section className="border-y border-border bg-green-50/50 dark:bg-green-950/10 py-16">
          <div className="mx-auto max-w-4xl px-6 lg:px-8">
            <div className="text-center mb-10">
              <SectionLabel>The result</SectionLabel>
              <h2 className="mt-3 text-3xl font-bold">
                What changed for Lovejeet
              </h2>
              <p className="mt-3 text-muted-foreground">
                From 2 hours of daily admin to 10 minutes. From 30 students to 80.
                From no online presence to a professional academy site.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {AFTER_BENEFITS.map((b, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 rounded-lg border border-green-200 dark:border-green-800/40 bg-card p-4"
                >
                  <b.icon className="h-5 w-5 shrink-0 text-green-600" />
                  <p className="text-sm">{b.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Feature FAQ ───────────────────────────────────────── */}
        <section className="py-16">
          <div className="mx-auto max-w-4xl px-6 lg:px-8">
            <div className="text-center mb-10">
              <SectionLabel>How it works</SectionLabel>
              <h2 className="mt-3 text-3xl font-bold">
                &ldquo;But how does...?&rdquo;
              </h2>
              <p className="mt-3 text-muted-foreground">
                Common questions from teachers like Lovejeet — answered.
              </p>
            </div>
            <div className="space-y-4">
              {FEATURE_HIGHLIGHTS.map((e, i) => (
                <div key={i} className="rounded-lg border p-5">
                  <p className="font-semibold text-sm">{e.q}</p>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{e.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ───────────────────────────────────────────────── */}
        <section className="border-t border-border bg-primary/5 py-20">
          <div className="mx-auto max-w-3xl px-6 text-center lg:px-8">
            <Languages className="mx-auto h-12 w-12 text-primary" />
            <h2 className="mt-4 text-3xl font-bold sm:text-4xl">
              Ready to teach like Lovejeet?
            </h2>
            <p className="mt-4 text-muted-foreground">
              Live classes with auto-reminders, recordings with chapters, bulk certificates, payment links,
              student feedback, and a professional academy site — all built in. Start on Starter for free.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Button asChild size="lg">
                <Link href="/signup">
                  Start free — no card needed
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/pricing">
                  See pricing & plans
                </Link>
              </Button>
            </div>
          </div>
        </section>

      </main>
      <Footer />
    </div>
  )
}
