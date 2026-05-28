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
    icon: Mic,
    title: "15 different 1:1 schedules in a notebook",
    desc: "Each coaching student has a different day and time. Lovejeet tracks them in a paper diary. When someone reschedules, she erases and rewrites. Double-bookings happen. She once had two students show up at the same time.",
  },
  {
    icon: Bell,
    title: "Reminders for 15 individuals + 3 groups — daily",
    desc: "She sends separate WhatsApp messages to each 1:1 student ('Your class is at 4 PM today') and to each group chat ('Batch 2, class at 5 PM'). That's 18+ manual messages every day — before she even starts teaching.",
  },
  {
    icon: Phone,
    title: "Different Zoom links for 1:1 vs group — chaos",
    desc: "She creates a separate Zoom meeting for each 1:1 and each group. Students DM her 'which link is mine?' 10 minutes before class. 1:1 students accidentally join the group session link.",
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
    icon: Mic,
    title: "Sets up 1:1 coaching sessions as products",
    subtitle: "Storefront → create a 'session' product → students book & pay",
    desc: "Lovejeet creates a '1:1 Spoken English Coaching' product in the storefront. She sets the price (₹2,000/month or ₹500/session), adds available time slots, and publishes it. Students book directly from her site. Each booking creates a private live class — one permanent link per student, auto-scheduled.",
    image: "/images/features/storefront.png",
    detail: "The 1:1 product supports: per-session pricing OR monthly subscription, time-slot selection by the student, automatic calendar blocking (prevents double-booking), and a private class link that's different from group classes. Each 1:1 student sees only their own sessions in their dashboard — never the group batches. Lovejeet sees all 15 individual sessions + 3 group classes in one unified calendar.",
  },
  {
    step: 4,
    icon: Calendar,
    title: "One calendar for everything — 1:1 and group",
    subtitle: "All 15 individual sessions + 3 group batches in one view",
    desc: "Lovejeet opens the calendar and sees everything: Monday 3 PM — Ananya (1:1), Monday 5 PM — Batch 1 (group), Tuesday 4 PM — Rohit (1:1), and so on. Color-coded by type: blue for 1:1, green for group. Drag to reschedule — the student gets an auto-notification. No notebook, no double-bookings.",
    image: "/images/features/live-classes.png",
    detail: "The calendar supports: weekly/monthly views, recurring class scheduling (repeat every week for 12 weeks), color-coded by course, drag-and-drop rescheduling with automatic student notification, holiday blocking, and conflict detection. Students see a synced version on their dashboard. Teachers can export the schedule as an .ics file for Google Calendar / Apple Calendar.",
  },
  {
    step: 5,
    icon: Bell,
    title: "Auto-reminders on WhatsApp, email, and push — she sends nothing",
    subtitle: "24 hours → 1 hour → 5 minutes before class. Zero manual work.",
    desc: "The moment a class is scheduled, the reminder engine kicks in. Students get 3 automatic reminders: a WhatsApp message 24 hours before ('Spoken English tomorrow at 5 PM — here\\'s your class link'), an email 1 hour before, and a push notification 5 minutes before. Lovejeet sends zero manual messages.",
    image: "/images/features/live-classes.png",
    detail: "Reminder flow: (1) 24h before — WhatsApp + email with class title, time, and direct join link. (2) 1h before — WhatsApp only ('Starting in 1 hour'). (3) 5min before — push notification + WhatsApp ('Class starts in 5 minutes — join now'). If a student hasn\\'t joined 10 minutes after start, they get a 'Class is live — join now' nudge. All reminders are configurable: admin can change timing, enable/disable channels, and customize the message template. Parents of minor students also receive the reminders.",
  },
  {
    step: 6,
    icon: Video,
    title: "Runs live classes with one permanent link",
    subtitle: "No Zoom link juggling — students join from the course page",
    desc: "Lovejeet clicks 'Start Class' on the dashboard. Students join from their course page — same link every time. The class has a waiting room, raise-hand queue, screen sharing, and in-class chat. Attendance is tracked automatically.",
    image: "/images/features/live-classes.png",
    detail: "The live class features: lobby with student count before starting, raise-hand queue (ordered by time), screen + whiteboard sharing, in-class polls, chat with anti-bypass filter (auto-redacts phone numbers/emails), and real-time attendance tracking. Late joiners see a 'You missed: [topic covered]' banner. The class auto-records.",
  },
  {
    step: 7,
    icon: PlayCircle,
    title: "Every class is auto-recorded and chaptered",
    subtitle: "Absent students catch up on their own — no re-explaining",
    desc: "After every live class, the recording appears in the course timeline within minutes. AI generates chapters ('Tenses review at 4:12', 'Practice exercise at 18:30') so students can jump to what they missed. Absent students get a notification: 'You missed Session 5 — watch the recording here.'",
    image: "/images/features/courses.png",
    detail: "Recordings include: auto-generated chapters from transcript, searchable full-text transcript, class chat replay synced to the video timeline, and download option for offline viewing. Students who missed the class get an automatic notification with the recording link. The teacher can trim recordings or mark them private.",
  },
  {
    step: 8,
    icon: Send,
    title: "Sends payment links to parents via WhatsApp",
    subtitle: "Course page → Send Payment Link → parent pays → student enrolled",
    desc: "When a parent enquires, Lovejeet sends a payment link from the course's menu. The parent opens it on their phone, sees the course details, pays via Razorpay, and the student is enrolled automatically. No manual enrollment.",
    image: "/images/features/storefront.png",
    detail: "The payment link shows: academy branding, course title, class count, fee breakdown, and Lovejeet's personal note ('Hi Ananya's mom, this is the spoken English batch we discussed'). After payment, the parent registers and the student gets access immediately.",
  },
  {
    step: 9,
    icon: Award,
    title: "Generates certificates in bulk — one click",
    subtitle: "CSV upload → 30 certificates in 2 minutes",
    desc: "At the end of the batch, Lovejeet uploads a CSV with student names. The platform generates beautiful certificates from 17 built-in templates — each with the student's name, course title, date, and her signature. Download all as a ZIP or send individually.",
    image: "/images/features/certificates.png",
    detail: "Certificate templates include: modern, classic, elegant, playful, and more. Each can be customized with logo, colors, and signature. Certificates have a unique QR code linking to a public verification page — parents can verify authenticity by scanning.",
  },
  {
    step: 10,
    icon: Users,
    title: "Builds a community around her teaching",
    subtitle: "Announcements, doubt sessions, leaderboard, wall of love",
    desc: "Students post doubts, Lovejeet answers with AI-assisted replies. A leaderboard tracks quiz scores. Parents leave testimonials on the Wall of Love. Announcements reach everyone without getting buried in a WhatsApp group.",
    image: "/images/features/community.png",
    detail: "The community includes: per-batch discussion groups, Q&A with doubt threading, announcement broadcasts (email + WhatsApp + in-app), a public testimonial wall, and a gamified leaderboard with points for quiz scores and assignment submissions.",
  },
  {
    step: 11,
    icon: Star,
    title: "Students rate her after every class",
    subtitle: "Feedback popup → ratings + tags → teaching insights",
    desc: "After each live class, students see a quick feedback popup: 5-star rating, tags like 'Clear', 'Engaging', 'Helpful', and an optional comment. Lovejeet sees her strengths trending up and areas to improve — without it becoming a complaint wall.",
    image: "/images/features/courses.png",
    detail: "Admin sees full feedback with student names. Lovejeet sees only aggregate ratings and moderated comments. Improvement tags only show when 3+ students mention the same thing. Feedback doesn't affect payouts — it's purely for teaching quality improvement.",
  },
]

const AFTER_BENEFITS = [
  { icon: CheckCircle2, text: "Visual calendar — schedule the whole week in one view, drag to reschedule, students auto-notified" },
  { icon: CheckCircle2, text: "3-tier auto reminders — WhatsApp + email + push at 24h, 1h, and 5min before every class" },
  { icon: CheckCircle2, text: "Missed-class nudge — students who don't join get a 'class is live, join now' ping" },
  { icon: CheckCircle2, text: "One permanent class link — students join from the course page, no Zoom link juggling" },
  { icon: CheckCircle2, text: "Auto-recorded classes with AI chapters — absent students catch up on their own" },
  { icon: CheckCircle2, text: "Professional academy site — shareable link for WhatsApp bio and Instagram" },
  { icon: CheckCircle2, text: "AI course builder — full curriculum generated in 2 minutes" },
  { icon: CheckCircle2, text: "Payment links via WhatsApp — parent pays, student auto-enrolled" },
  { icon: CheckCircle2, text: "Bulk certificates with verification QR codes — 30 certificates in 2 minutes" },
  { icon: CheckCircle2, text: "Student feedback after every class — strengths and improvement insights" },
  { icon: CheckCircle2, text: "Calendar sync — export schedule to Google Calendar / Apple Calendar (.ics)" },
  { icon: CheckCircle2, text: "Parent reminders — parents of minor students also get class notifications" },
]

const FEATURE_HIGHLIGHTS = [
  {
    q: "How does the calendar scheduling work?",
    a: "Open Dashboard → Calendar. You see a weekly or monthly view. Click a time slot to create a class, or drag an existing class to reschedule. Set recurring classes (e.g., every Monday and Wednesday at 5 PM for 12 weeks) in one click. Color-coded by course. Students see their own synced calendar on their dashboard — no separate Google Calendar invite needed. You can also export the full schedule as an .ics file for Google Calendar or Apple Calendar.",
  },
  {
    q: "How do the 3-tier auto-reminders work?",
    a: "The moment you schedule a class, the reminder engine is armed. (1) 24 hours before: WhatsApp message + email with class title, time, teacher name, and a direct 'Join Class' link. (2) 1 hour before: WhatsApp only — 'Starting in 1 hour, here's your link.' (3) 5 minutes before: push notification + WhatsApp — 'Class starts in 5 minutes, join now.' If a student hasn't joined 10 minutes after the class starts, they get a final nudge: 'Class is live — join now.' Parents of minor students also receive every reminder. You configure which channels are on/off and customize the message template per course.",
  },
  {
    q: "What happens when I reschedule a class?",
    a: "Drag the class to a new time slot in the calendar. The platform immediately sends a 'Schedule changed' notification to all enrolled students via WhatsApp and email: 'Spoken English moved from Wednesday 5 PM to Thursday 4 PM.' The student's calendar updates automatically. No manual WhatsApp group message needed.",
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
    q: "How does 1:1 coaching work vs group classes?",
    a: "You create a '1:1 Coaching' product in the storefront with per-session or monthly pricing. Students book from your site and pick a time slot. Each booking creates a private live class with its own link — separate from your group batches. Your calendar shows both: blue for 1:1 sessions, green for group classes. No overlap, no double-bookings. 1:1 students only see their own sessions, group students only see their batch. You see everything in one unified view.",
  },
  {
    q: "Can I charge differently for 1:1 vs group?",
    a: "Yes. Each product has its own pricing. Lovejeet charges ₹2,000/month for 1:1 coaching and ₹800/month for group batches. She can also offer per-session pricing (₹500 per 1:1 session) or package deals (10 sessions for ₹4,500). Each pricing model has its own payment link.",
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
                How Lovejeet runs 1:1 coaching &amp; group classes
                <span className="text-primary"> without an assistant.</span>
              </h1>
              <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
                Lovejeet teaches spoken English in Chandigarh — 15 one-on-one coaching students
                and 3 group batches of 20 each. She was spending 2 hours daily sending WhatsApp
                reminders, juggling different Zoom links for each session, and tracking who paid for what.
                Here&apos;s how she replaced the chaos with a system that handles 1:1 and group sessions equally well.
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
                role="English Coach — 1:1 + Group Sessions"
                emoji="👩‍🏫"
                color="border-purple-200 dark:border-purple-800"
                traits={[
                  "Teaches Spoken English, Grammar, and IELTS Prep in Chandigarh",
                  "15 one-on-one coaching students (personalized pace, flexible timing)",
                  "3 group batches of 20 each (Class 8-10, College, Working professionals)",
                  "Uses Zoom — different link for every 1:1 and every group session",
                  "Tracks 1:1 schedules in a notebook, group schedules in WhatsApp",
                  "Charges differently: ₹2,000/month for 1:1, ₹800/month for group",
                  "Biggest pain: managing 15 individual schedules + 3 group schedules + reminders for ALL of them",
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
