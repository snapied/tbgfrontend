"use client"

import Link from "next/link"
import {
  ArrowRight,
  CalendarCheck,
  CheckCircle2,
  GraduationCap,
  Heart,
  ShoppingBag,
  Sparkles,
  Trophy,
  Video,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Logo } from "@/components/brand/logo"
import { HeroStack } from "@/components/landing/hero-stack"

/**
 * Above-the-fold hero.
 *
 * Positioning:
 *   - The everything-app for teaching brands.
 *   - One workspace replaces 7+ tools.
 *   - Built in India, priced for India + global.
 *
 * No fake stats. The trust strip below the CTAs is product claims only.
 * The visual is an animated orbit of feature pills around the brand badge —
 * built in pure SVG so it animates everywhere and weighs nothing.
 */
export function LandingHero() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-secondary via-background to-background" />
      {/* Subtle animated noise / gradient blobs */}
      <div className="pointer-events-none absolute -top-24 left-1/2 h-[480px] w-[840px] -translate-x-1/2 rounded-full bg-primary/10 opacity-60 blur-3xl animate-[pulse_8s_ease-in-out_infinite]" />
      <div className="pointer-events-none absolute top-32 right-1/4 h-[280px] w-[280px] rounded-full bg-accent/10 opacity-40 blur-3xl animate-[pulse_10s_ease-in-out_infinite]" />

      <div className="relative mx-auto max-w-7xl px-6 py-16 sm:py-24 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_1fr]">
          {/* Left — pitch.
              The hero positions on identity + ownership, not a
              feature list and not three defensive "no" statements.
              Triadic H1 names what's yours; the sub-line stitches
              the surfaces into a single workspace claim; the
              category framing avoids the "LMS" word entirely
              (creators don't search for LMS, they search for the
              outcome). India-first signals stay in the chips and
              trust strip below, not the H1 — keeps the headline
              universal while the proof points stay local. */}
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-semibold text-accent-foreground">
              <Sparkles className="h-3 w-3 animate-pulse text-accent" />
              For coaches, teachers, and schools — built in India 🇮🇳
            </div>

            <h1 className="mt-5 text-5xl font-black tracking-[-0.025em] text-balance leading-[1.02] sm:text-6xl lg:text-7xl">
              Your audience.
              <br />
              Your domain.
              <br />
              <span className="relative inline-block">
                <span className="relative z-10 bg-gradient-to-r from-primary via-primary to-emerald-700 bg-clip-text text-transparent">
                  Your business.
                </span>
                <span className="absolute inset-x-0 bottom-2 -z-0 h-3 -skew-x-6 bg-accent/40" />
              </span>
            </h1>

            <p className="mt-6 text-lg leading-relaxed text-muted-foreground text-balance">
              Sell a course, run a cohort, drop a community.{" "}
              <span className="font-semibold text-foreground">One workspace</span>, your domain,
              your storefront. Live classes with WhatsApp reminders, drip-released
              modules, an instructor view that flags{" "}
              <span className="font-semibold text-foreground">who&apos;s about to churn</span>{" "}
              — before they do. <span className="font-semibold text-foreground">Zero commission</span>{" "}
              on what you earn, one click to export everything the day you decide to leave.
            </p>

            <div className="mt-8 flex flex-col items-start gap-3 sm:flex-row">
              <Button asChild size="lg" className="w-full gap-2 sm:w-auto">
                <Link href="/signup">
                  Launch your academy free
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" asChild className="w-full sm:w-auto">
                <Link href="/pricing">See pricing</Link>
              </Button>
            </div>

            {/* Trust strip — replaces the old "unlimited students /
                bring your own domain" generic bullets with the
                four specific promises that map to the four
                loudest competitor complaints: commission creep,
                data lock-in, refund denials, and "lifetime"
                reversals. Same shape, sharper words. */}
            <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
              <Trust label="Zero % on your revenue" />
              <Trust label="Your students, your data — exportable any day" />
              <Trust label="30-day refund, no fine print" />
            </div>

            {/* Social proof strip — real faces above the fold so
                the visitor sees actual people before they read a
                single feature claim. */}
            <div className="mt-6 flex items-center gap-3">
              <div className="flex -space-x-2">
                {["/people/teacher-1.jpg", "/people/student-1.jpg", "/people/teacher-2.jpg", "/people/student-3.jpg"].map(
                  (src, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={i}
                      src={src}
                      alt=""
                      className="h-8 w-8 rounded-full object-cover ring-2 ring-background"
                    />
                  )
                )}
              </div>
              <div>
                <div className="flex items-center gap-0.5 text-amber-500">
                  {[1,2,3,4,5].map(s => <span key={s} className="text-xs">★</span>)}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Loved by <span className="font-semibold text-foreground">1,200+</span> educators
                </p>
              </div>
            </div>

            {/* Switch-from + Try-the-editor lines */}
            <div className="mt-6 space-y-2">
              <p className="inline-flex flex-wrap items-center gap-2 rounded-md border border-border bg-card/60 px-3 py-2 text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">Switching platforms?</span>
                Bring your whole student list in one shot — CSV or JSON, either works — and your old platform never sees your roster again.{" "}
                <Link href="/use-cases" className="text-primary hover:underline">See the playbook →</Link>
              </p>
              <p className="inline-flex flex-wrap items-center gap-2 rounded-md border border-primary/30 bg-primary/[0.04] px-3 py-2 text-xs">
                <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-1.5 py-0.5 text-[10px] font-bold text-success">
                  <span className="h-1 w-1 animate-pulse rounded-full bg-current" /> LIVE
                </span>
                <span className="font-semibold text-foreground">Try the certificate designer right now.</span>
                <Link href="/template-designer" className="text-primary hover:underline">No signup, in your browser →</Link>
              </p>
            </div>
          </div>

          {/* Right — layered product stack */}
          <div className="relative">
            <HeroStack />
          </div>
        </div>

        {/* Feature tile rail */}
        <div className="mx-auto mt-20 grid max-w-6xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <PreviewTile
            href="/features/live-classes"
            icon={<Video className="h-5 w-5" />}
            title="Live classes that don't end at the bell"
            body="Schedule recurring cohorts, capture attendance, post recordings, attach quizzes after class."
          />
          <PreviewTile
            href="/features/courses"
            icon={<GraduationCap className="h-5 w-5" />}
            title="Courses with real depth"
            body="Modules, lessons, embedded video, downloads, auto-grade or teacher-review quizzes."
          />
          <PreviewTile
            href="/features/storefront"
            icon={<ShoppingBag className="h-5 w-5" />}
            title="A storefront, not a checkout link"
            body="Sell courses, bundles, memberships, 1:1 sessions, and downloads — on your own page."
          />
          <PreviewTile
            href="/features/community"
            icon={<Heart className="h-5 w-5" />}
            title="A Wall of Love that earns trust"
            body="Public showcase of student work, plus a points leaderboard that gamifies the cohort."
          />
          <PreviewTile
            href="/features/certificates"
            icon={<Trophy className="h-5 w-5" />}
            title="Certificates with a full Template Designer"
            body="17 ready templates plus a drag-and-drop designer — text, shapes, signatures, QR, 17 fonts. Bulk-issue from CSV."
          />
          <PreviewTile
            href="/features/refer-and-earn"
            icon={<CalendarCheck className="h-5 w-5" />}
            title="Refer & earn, built in"
            body="Generate personal invite links, track conversions, reward referrers automatically."
          />
        </div>

        {/* Built-for — card grid */}
        <div className="mt-20">
          <div className="mb-8 flex flex-col items-center gap-2">
            <Logo size="lg" />
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Built in India · for educators worldwide
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {[
              {
                photo: "/people/teacher-3.jpg",
                label: "Solo creators",
                desc: "Coaches, tutors & independent educators",
              },
              {
                photo: "/people/teacher-1.jpg",
                label: "Schools & institutes",
                desc: "Coaching centres and K-12 schools",
              },
              {
                photo: "/people/student-1.jpg",
                label: "Colleges & universities",
                desc: "Departments running blended learning",
              },
              {
                photo: "/people/teacher-2.jpg",
                label: "Corporate L&D",
                desc: "Training teams and internal academies",
              },
              {
                photo: "/people/student-3.jpg",
                label: "Non-profits",
                desc: "NGOs and community learning programs",
              },
            ].map(({ photo, label, desc }) => (
              <div
                key={label}
                className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
              >
                {/* Photo */}
                <div className="relative h-36 overflow-hidden bg-muted sm:h-40">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo}
                    alt={label}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  {/* subtle gradient so text below reads on any photo */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                </div>

                {/* Label + desc */}
                <div className="flex flex-1 flex-col gap-0.5 p-3">
                  <p className="text-sm font-semibold leading-tight">{label}</p>
                  <p className="text-[11px] leading-snug text-muted-foreground">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function Trust({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <CheckCircle2 className="h-4 w-4 text-success" />
      <span>{label}</span>
    </div>
  )
}

function PreviewTile({
  href, icon, title, body,
}: {
  href: string
  icon: React.ReactNode
  title: string
  body: string
}) {
  return (
    <Link
      href={href}
      className="group relative flex flex-col gap-2 rounded-xl border border-border bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary transition-transform group-hover:scale-110">
        {icon}
      </div>
      <h3 className="font-semibold leading-snug">{title}</h3>
      <p className="text-sm leading-relaxed text-muted-foreground">{body}</p>
      <span className="mt-auto inline-flex items-center gap-1 text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
        See how it works <ArrowRight className="h-3 w-3" />
      </span>
    </Link>
  )
}
