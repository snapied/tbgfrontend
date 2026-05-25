"use client"

import Link from "next/link"
import {
  ArrowRight,
  Award,
  BookOpen,
  Calendar,
  CheckCircle2,
  ClipboardCheck,
  Heart,
  Megaphone,
  NotebookPen,
  Repeat,
  ShoppingBag,
  Sparkles,
  Trophy,
  UserPlus,
  Video,
} from "lucide-react"
import { Button } from "@/components/ui/button"

/**
 * Mid-page sections shown on the homepage. Each card describes a real
 * capability that ships today and links into the dedicated feature page
 * for deeper screenshots + explainers.
 */

interface FeatureRow {
  href: string
  icon: React.ElementType
  title: string
  body: string
  bullets: string[]
}

const ROWS: FeatureRow[] = [
  {
    href: "/features/live-classes",
    icon: Video,
    title: "Live classes — scheduled, run, recapped.",
    body:
      "Open the built-in cloud room — or paste a meeting URL from any common video-conferencing tool — and we handle the rest: in-app + email + WhatsApp reminders, attendance tracking, and a post-class recap card that pins the recording, summary, slides, quizzes and homework right under the session.",
    bullets: [
      "Recurring series — daily, weekly, every-N-days, or fully custom",
      "Bulk-edit, bulk-notify, bulk-cancel from the list view",
      "Per-class attendance with join/leave timestamps",
      "Attach a quiz or homework after class with a due date",
    ],
  },
  {
    href: "/features/courses",
    icon: BookOpen,
    title: "Courses with real structure.",
    body:
      "Build modules and lessons, embed video from any common host, upload PDFs and slides, drop in inline quizzes. Students get a clean player with per-lesson progress that rolls up into course completion.",
    bullets: [
      "Drag-and-drop curriculum builder",
      "Auto-grade or teacher-review quizzes",
      "Lesson resources (slide decks, design files, doc embeds — any common tool)",
      "Per-student progress with completion percentage",
    ],
  },
  {
    href: "/features/storefront",
    icon: ShoppingBag,
    title: "A storefront, not just a checkout link.",
    body:
      "Sell every kind of digital product a teacher actually has — courses, bundles, monthly memberships, 1:1 sessions, webinars, downloads, license keys. Your own public store page lives at your subdomain.",
    bullets: [
      "Seven product kinds out of the box",
      "Orders, entitlements, customer library",
      "Coupon-ready price model",
      "Public store + checkout under your brand",
    ],
  },
  {
    href: "/features/community",
    icon: Heart,
    title: "Community features that actually drive retention.",
    body:
      "A Wall of Love for student work and quotes, a leaderboard that gamifies class attendance + quiz wins + assignments, and a Refer-and-Earn flow that pays back word-of-mouth growth.",
    bullets: [
      "Wall of Love — public showcase, pinned items, vibe tags",
      "Leaderboard with scoring rules anyone can see",
      "Refer-and-Earn with per-invite share links + WhatsApp deep-links",
      "Announcements + discussions for cohort comms",
    ],
  },
  {
    href: "/features/certificates",
    icon: Award,
    title: "Certificates students want to share.",
    body:
      "17 ready-made templates plus a full Template Designer — drag text, shapes, signatures, QR codes and your logo onto an A4 canvas, bind any field to a variable, save. Bulk-issue from a CSV, every cert gets a unique ID and a public verification page anyone can use without an account.",
    bullets: [
      "17 templates (classic, modern, executive, neon, art-deco, more)",
      "Template Designer — text, shapes, signatures, QR, your logo, 17 fonts",
      "Bind any field to a variable like {{student_name}}",
      "Bulk batch upload from CSV, public /verify page",
    ],
  },
]

export function FeaturesSection() {
  return (
    <section id="features" className="py-24">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Everything in one workspace.
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Stop stitching together a video tool, a form tool, a payments tool, a doc tool and a chat group. One login, one brand, one place students go to.
          </p>
        </div>

        <div className="mx-auto mt-16 max-w-6xl space-y-6">
          {ROWS.map((row, i) => (
            <FeatureRowCard key={row.href} row={row} reverse={i % 2 === 1} />
          ))}
        </div>
      </div>
    </section>
  )
}

function FeatureRowCard({ row, reverse }: { row: FeatureRow; reverse: boolean }) {
  const Icon = row.icon
  return (
    <div className="grid items-stretch gap-0 overflow-hidden rounded-2xl border border-border bg-card lg:grid-cols-[1.05fr_1fr]">
      <div className={`order-1 p-8 lg:p-10 ${reverse ? "lg:order-2" : ""}`}>
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <h3 className="mt-4 text-2xl font-bold tracking-tight">{row.title}</h3>
        <p className="mt-3 leading-relaxed text-muted-foreground">{row.body}</p>
        <ul className="mt-5 space-y-2 text-sm">
          {row.bullets.map((b) => (
            <li key={b} className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
              <span>{b}</span>
            </li>
          ))}
        </ul>
        <Button asChild variant="outline" className="mt-6 gap-2">
          <Link href={row.href}>
            Explore {row.title.split(" ")[0].toLowerCase().replace(/[.,]/g, "")}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
      <div className={`order-2 bg-gradient-to-br from-secondary/40 via-background to-secondary/20 p-8 lg:p-10 ${reverse ? "lg:order-1" : ""}`}>
        <FeatureMockup row={row} />
      </div>
    </div>
  )
}

// ============================================================
// Inline product previews. Premium glassmorphic visual illustration
// mockups in the style of modern SaaS marketing surfaces.
// ============================================================

function FeatureMockup({ row }: { row: FeatureRow }) {
  let imgSrc = ""
  let imgAlt = ""
  switch (row.href) {
    case "/features/live-classes":
      imgSrc = "/workspace_illustration.png"
      imgAlt = "Live cohorts and calling features mockup illustration"
      break
    case "/features/courses":
      imgSrc = "/courses_illustration.png"
      imgAlt = "Self-paced course curriculum and quizzes mockup illustration"
      break
    case "/features/storefront":
      imgSrc = "/storefront_illustration.png"
      imgAlt = "SaaS storefront course listing and UPI checkout mockup illustration"
      break
    case "/features/community":
      imgSrc = "/community_illustration.png"
      imgAlt = "Student leaderboard and Wall of Love student feed mockup illustration"
      break
    case "/features/certificates":
      imgSrc = "/certificates_illustration.png"
      imgAlt = "Drag-and-drop digital certificate designer mockup illustration"
      break
    default:
      return null
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-primary/10 bg-card p-2 shadow-2xl shadow-primary/[0.03] backdrop-blur-md transition-all duration-300 hover:shadow-primary/[0.06] hover:scale-[1.01] max-w-md mx-auto">
      <div className="relative aspect-square overflow-hidden rounded-xl bg-muted/20">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imgSrc}
          alt={imgAlt}
          className="h-full w-full object-cover transition-transform duration-700 hover:scale-[1.01]"
        />
        {/* Soft highlight border overlay */}
        <div className="absolute inset-0 rounded-xl border border-white/10 pointer-events-none" />
      </div>
    </div>
  )
}

// ============================================================
// Closing CTA panel
// ============================================================

export function TemplatesSection() {
  return (
    <section className="py-24">
      <div className="mx-auto max-w-5xl px-6 lg:px-8">
        <div className="grid items-center gap-8 rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/[0.04] via-background to-accent/5 p-8 sm:p-12 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-semibold text-accent-foreground">
              <Sparkles className="h-3 w-3" />
              You can be live in under 3 minutes
            </div>
            <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
              Launch your own academy this afternoon.
            </h2>
            <p className="mt-3 text-muted-foreground">
              Pick your subdomain, drop in your logo, schedule your first class — your students get an invite the same hour. No demos, no sales calls, no setup fees.
            </p>
            <div className="mt-6 flex flex-col items-start gap-3 sm:flex-row">
              <Button asChild size="lg" className="gap-2">
                <Link href="/signup">
                  Launch your academy
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="gap-2">
                <Link href="/features/refer-and-earn">
                  Or, refer a friend
                  <UserPlus className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
          <div className="space-y-3 rounded-xl border border-border bg-card p-5 text-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              What you get on day one
            </p>
            <ul className="space-y-2">
              {[
                "Your own subdomain (yourname.thebigclass.com)",
                "Full course + live-class + storefront workspace",
                "WhatsApp + email class reminders",
                "17 certificate templates + the Template Designer",
                "Public store, public Wall of Love, public verify page",
                "Custom-domain support when you're ready",
              ].map((line) => (
                <li key={line} className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
            <div className="mt-3 inline-flex items-center gap-2 rounded-md border border-border/60 bg-muted/40 px-3 py-1.5 text-[11px] text-muted-foreground">
              <Megaphone className="h-3 w-3 text-primary" />
              Inviting your team works the same way — one click, sends a WhatsApp + email.
            </div>
          </div>
        </div>

        {/* Feature card grid */}
        <div className="mt-12 flex flex-col items-center gap-6">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Sized for teachers, not enterprise procurement
          </p>
          <div className="grid w-full grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {[
              {
                photo: "/features/live-classes.jpg",
                Icon: Calendar,
                label: "Live classes",
                desc: "Recurring cohorts, attendance & recordings",
                href: "/features/live-classes",
              },
              {
                photo: "/features/courses.jpg",
                Icon: BookOpen,
                label: "Courses",
                desc: "Modules, quizzes & per-lesson progress",
                href: "/features/courses",
              },
              {
                photo: "/features/storefront.jpg",
                Icon: ShoppingBag,
                label: "Storefront",
                desc: "Sell 8 product types under your brand",
                href: "/features/storefront",
              },
              {
                photo: "/features/community.jpg",
                Icon: Heart,
                label: "Community",
                desc: "Wall of Love, leaderboard & discussions",
                href: "/features/community",
              },
              {
                photo: "/features/certificates.jpg",
                Icon: Award,
                label: "Certificates",
                desc: "17 templates + a full drag-drop designer",
                href: "/features/certificates",
              },
            ].map(({ photo, Icon, label, desc, href }) => (
              <a
                key={label}
                href={href}
                className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
              >
                {/* Photo */}
                <div className="relative h-28 overflow-hidden bg-muted sm:h-32">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo}
                    alt={label}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  {/* Icon badge pinned bottom-left */}
                  <div className="absolute bottom-2 left-2 flex h-7 w-7 items-center justify-center rounded-lg bg-primary/90 text-primary-foreground shadow">
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                </div>
                {/* Text */}
                <div className="flex flex-1 flex-col gap-0.5 p-3">
                  <p className="text-sm font-semibold leading-tight">{label}</p>
                  <p className="text-[11px] leading-snug text-muted-foreground">{desc}</p>
                </div>
              </a>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
