"use client"

// Animated home-page showcase for the five wedge features:
// API, white-label, multilingual, doubts inbox, faculty.
//
// These are the moats vs incumbent creator platforms that aren't
// visible from the existing "Live classes / Courses / Storefront /
// Community" strip — they go higher up the buyer evaluation funnel.
// Putting them on the home page (between the products-you-can-sell
// rail and the certificate templates section) is where a competitor-
// hopping visitor actually looks for "is this different?"
//
// The graphics are pure CSS — we avoid pulling in framer-motion
// because (a) it's a 50 KB first-load tax we don't yet pay, and
// (b) Tailwind + tw-animate-css already cover the patterns we
// need (fade-in, slide, marquee, blink). Each card has a tiny
// custom motion that maps to the feature — a curl response
// stream for API, a colour-swap for white-label, a typing
// cycle for multilingual, an inbox-drop for doubts, a stacked
// avatar reveal for faculty.

import Link from "next/link"
import {
  ArrowRight,
  Code2,
  KeyRound,
  Languages,
  Mail,
  MessageCircleQuestion,
  Palette,
  ShieldCheck,
  Sparkles,
  Users,
  Zap,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

export function NewFeaturesShowcase() {
  return (
    <section className="relative overflow-hidden border-y border-border bg-gradient-to-b from-background via-primary/[0.02] to-background py-24">
      {/* Soft blurred blobs for depth, animated on a slow loop so
          the page never feels static. Pointer-events:none so they
          don't intercept clicks on the cards above. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 left-1/3 h-72 w-72 -translate-x-1/2 animate-[blob_18s_ease-in-out_infinite] rounded-full bg-primary/15 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 right-1/4 h-80 w-80 animate-[blob_22s_ease-in-out_infinite_reverse] rounded-full bg-accent/15 blur-3xl"
      />

      <div className="relative mx-auto max-w-6xl px-6 lg:px-8">
        {/* Section header */}
        <div className="mx-auto max-w-3xl text-center">
          <Badge variant="outline" className="mb-4 animate-[fadeUp_0.6s_ease-out]">
            <Sparkles className="mr-1 h-3 w-3" />
            New this season
          </Badge>
          <h2 className="font-serif text-4xl font-bold tracking-tight sm:text-5xl">
            Five things every other platform{" "}
            <span className="text-primary">forgot to ship</span>.
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
            Read enough creator-platform reviews and the same five complaints surface again and
            again, in different tones. We built the answers.
          </p>
        </div>

        {/* Feature cards — staggered fade-in via Tailwind keyframes
            keyed in globals.css. Each card has a custom inline
            graphic that visually nods at the feature. */}
        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <FeatureCard
            href="/features/api"
            badge="Developers"
            badgeIcon={<Code2 className="h-3 w-3" />}
            title="An API that exists"
            body="Public REST under /api/v1, scoped bearer keys, transparent rate limits. Free on every plan."
            cta="See API docs"
            accent="primary"
            delay={0}
          >
            <ApiGraphic />
          </FeatureCard>

          <FeatureCard
            href="/features/whitelabel"
            badge="White-label"
            badgeIcon={<Palette className="h-3 w-3" />}
            title="Your brand, not ours"
            body="Strip platform attribution, map your domain. Not a top-tier gate — every plan."
            cta="See white-label"
            accent="accent"
            delay={80}
          >
            <WhitelabelGraphic />
          </FeatureCard>

          <FeatureCard
            href="/features/multilingual"
            badge="Multilingual"
            badgeIcon={<Languages className="h-3 w-3" />}
            title="Speaks five languages"
            body="EN · HI · TA · ES · FR. Auto-detect, picker in every header, choice persists."
            cta="See languages"
            accent="primary"
            delay={160}
          >
            <MultilingualGraphic />
          </FeatureCard>

          <FeatureCard
            href="/features/doubts"
            badge="Support"
            badgeIcon={<MessageCircleQuestion className="h-3 w-3" />}
            title="Catches every question"
            body="Pre-sale leads + in-course doubts in one inbox. WhatsApp + email + in-app delivery."
            cta="See doubts inbox"
            accent="accent"
            delay={240}
          >
            <DoubtsGraphic />
          </FeatureCard>

          <FeatureCard
            href="/features/faculty"
            badge="Multi-faculty"
            badgeIcon={<Users className="h-3 w-3" />}
            title="Co-taught by default"
            body="Invite as many teachers as you need. Per-module owners, multi-tenant accounts, zxcvbn passwords."
            cta="See faculty"
            accent="primary"
            delay={320}
          >
            <FacultyGraphic />
          </FeatureCard>

          <TrustCard delay={400} />
        </div>

        {/* Footer strip of links */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-sm text-muted-foreground">
          <Link href="/developers" className="font-medium text-primary hover:underline">
            Open API docs
          </Link>
          <span aria-hidden>·</span>
          <Link href="/dashboard/developer" className="font-medium hover:text-foreground">
            Get an API key
          </Link>
          <span aria-hidden>·</span>
          <Link href="/dashboard/portal/brand" className="font-medium hover:text-foreground">
            Brand settings
          </Link>
          <span aria-hidden>·</span>
          <Link href="/dashboard/faculty" className="font-medium hover:text-foreground">
            Invite faculty
          </Link>
          <span aria-hidden>·</span>
          <Link href="/help" className="font-medium hover:text-foreground">
            All guides
          </Link>
        </div>
      </div>

      {/* Keyframes for the animations used above. Scoped via the
          <style> tag so we don't pollute globals — these only run
          when this section is on the page anyway. */}
      <style>{`
        @keyframes blob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33%      { transform: translate(20px, -30px) scale(1.05); }
          66%      { transform: translate(-15px, 25px) scale(0.95); }
        }
        @keyframes fadeUp {
          0%   { opacity: 0; transform: translateY(12px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes typing {
          0%, 18%        { content: ""; }
          22%, 38%       { content: "EN"; }
          42%, 58%       { content: "हि"; }
          62%, 78%       { content: "தம"; }
          82%, 98%       { content: "ES"; }
        }
        @keyframes pulseDot {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50%      { opacity: 1;   transform: scale(1.2); }
        }
        @keyframes inboxDrop {
          0%   { opacity: 0; transform: translateY(-12px); }
          12%  { opacity: 1; transform: translateY(0); }
          88%  { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(8px); }
        }
        @keyframes streamLine {
          0%   { opacity: 0; transform: translateX(-8px); }
          10%  { opacity: 1; transform: translateX(0); }
          90%  { opacity: 1; transform: translateX(0); }
          100% { opacity: 0; transform: translateX(0); }
        }
        @keyframes brandSwap {
          0%, 49%   { color: oklch(0.25 0.06 260); }
          50%, 100% { color: oklch(0.55 0.18 30);  }
        }
      `}</style>
    </section>
  )
}

// ============================================================
// Card
// ============================================================

function FeatureCard({
  href,
  badge,
  badgeIcon,
  title,
  body,
  cta,
  accent,
  delay,
  children,
}: {
  href: string
  badge: string
  badgeIcon: React.ReactNode
  title: string
  body: string
  cta: string
  accent: "primary" | "accent"
  delay: number
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      className="group block"
      style={{ animation: `fadeUp 0.7s ease-out ${delay}ms both` }}
    >
      <Card
        className={cn(
          "h-full overflow-hidden transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-xl",
          accent === "primary"
            ? "group-hover:border-primary/40"
            : "group-hover:border-accent/40",
        )}
      >
        <CardContent className="space-y-4 p-0">
          {/* Graphic well — fixed aspect so cards line up */}
          <div
            className={cn(
              "relative flex h-32 items-center justify-center overflow-hidden border-b border-border",
              accent === "primary"
                ? "bg-gradient-to-br from-primary/5 to-primary/[0.02]"
                : "bg-gradient-to-br from-accent/5 to-accent/[0.02]",
            )}
          >
            {children}
          </div>
          <div className="space-y-2 p-5">
            <Badge
              variant="outline"
              className={cn(
                "text-[10px] font-semibold uppercase tracking-wide",
                accent === "primary"
                  ? "border-primary/30 text-primary"
                  : "border-accent/40 text-accent",
              )}
            >
              <span className="mr-1">{badgeIcon}</span>
              {badge}
            </Badge>
            <h3 className="font-serif text-xl font-bold leading-tight">{title}</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">{body}</p>
            <p
              className={cn(
                "inline-flex items-center gap-1 pt-1 text-xs font-medium",
                accent === "primary" ? "text-primary" : "text-accent",
              )}
            >
              {cta}
              <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
            </p>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

// ============================================================
// Trust card (the 6th tile — anti-feature commitment)
// ============================================================

function TrustCard({ delay }: { delay: number }) {
  return (
    <div style={{ animation: `fadeUp 0.7s ease-out ${delay}ms both` }}>
      <Card className="h-full overflow-hidden border-primary/30 bg-gradient-to-br from-primary/5 via-card to-accent/5">
        <CardContent className="space-y-4 p-6">
          <Badge className="bg-primary text-primary-foreground">
            <ShieldCheck className="mr-1 h-3 w-3" />
            Founder Bill of Rights
          </Badge>
          <h3 className="font-serif text-xl font-bold leading-tight">
            We treat you like the founder, not the product.
          </h3>
          <ul className="space-y-1.5 text-sm text-muted-foreground">
            <li className="flex gap-1.5">
              <span className="text-primary">✓</span> Flat-fee pricing. No commission on your revenue.
            </li>
            <li className="flex gap-1.5">
              <span className="text-primary">✓</span> One-click export of every byte of your data.
            </li>
            <li className="flex gap-1.5">
              <span className="text-primary">✓</span> 30-day refund. No fine print.
            </li>
            <li className="flex gap-1.5">
              <span className="text-primary">✓</span> Public uptime + incident dashboard.
            </li>
          </ul>
          <Button asChild variant="outline" size="sm" className="w-full">
            <Link href="/founder-bill-of-rights">
              Read the bill <ArrowRight className="ml-1 h-3 w-3" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

// ============================================================
// Per-card graphics
// ============================================================

// API — animated terminal stream. Lines fade in / out on a loop
// so the eye catches motion but the content isn't a distraction.
function ApiGraphic() {
  return (
    <div className="flex w-full max-w-[220px] flex-col gap-1 rounded-md border border-border/60 bg-card/90 p-2.5 font-mono text-[10px] shadow-sm">
      <div className="flex items-center gap-1 border-b border-border/40 pb-1">
        <span className="h-1.5 w-1.5 rounded-full bg-destructive/60" />
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500/60" />
        <span className="h-1.5 w-1.5 rounded-full bg-success/60" />
        <span className="ml-1 text-muted-foreground/60">curl</span>
      </div>
      <div
        className="text-muted-foreground"
        style={{ animation: "streamLine 4s ease-in-out infinite" }}
      >
        <span className="text-primary">GET</span> /api/v1/courses
      </div>
      <div
        className="text-muted-foreground/70"
        style={{ animation: "streamLine 4s ease-in-out 0.4s infinite" }}
      >
        Authorization: Bearer tbc_…
      </div>
      <div
        className="text-success"
        style={{ animation: "streamLine 4s ease-in-out 0.8s infinite" }}
      >
        200 OK · 47/60 left
      </div>
      <div
        className="text-foreground/80"
        style={{ animation: "streamLine 4s ease-in-out 1.2s infinite" }}
      >
        {`{ "data": [...], "has_more": false }`}
      </div>
    </div>
  )
}

// White-label — brand swap. The logo glyph and tagline strip
// flip from a neutral grey to the tenant accent color halfway
// through the loop, suggesting the moment a creator toggles
// white-label on.
function WhitelabelGraphic() {
  return (
    <div className="flex w-full max-w-[220px] flex-col gap-2">
      <div className="flex items-center gap-2 rounded-md border border-border/60 bg-card/90 p-2 shadow-sm">
        <div
          className="flex h-7 w-7 items-center justify-center rounded-full"
          style={{ animation: "brandSwap 4s ease-in-out infinite", background: "currentColor" }}
        >
          <span className="text-[10px] font-bold text-card">A</span>
        </div>
        <div className="min-w-0">
          <div
            className="h-2 w-20 rounded-full"
            style={{ animation: "brandSwap 4s ease-in-out infinite", background: "currentColor" }}
          />
          <div className="mt-1 h-1.5 w-14 rounded-full bg-muted-foreground/20" />
        </div>
      </div>
      <div className="ml-2 rounded-md border border-dashed border-border/60 bg-card/60 p-2 text-[10px] text-muted-foreground">
        <span className="line-through opacity-60">Powered by The Big Class</span>
      </div>
    </div>
  )
}

// Multilingual — looped typing of "Sign in" in five languages.
// Using ::before content cycles the glyphs without re-rendering.
function MultilingualGraphic() {
  return (
    <div className="flex w-full max-w-[220px] flex-col gap-2 rounded-md border border-border/60 bg-card/90 p-3 shadow-sm">
      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span>Sign in</span>
        <span className="rounded-full border border-border/60 bg-background px-1.5 py-0.5">
          🌐
        </span>
      </div>
      <div className="rounded-md bg-muted/60 px-2 py-1.5 font-serif text-base">
        <span
          className="block before:inline before:font-serif before:text-base before:content-['EN']"
          style={{ animation: "typing 6s steps(1, end) infinite" } as React.CSSProperties}
        />
      </div>
      <div className="flex gap-1 text-[9px]">
        {["🇬🇧 EN", "🇮🇳 हि", "🇮🇳 தம", "🇪🇸 ES", "🇫🇷 FR"].map((s, i) => (
          <span
            key={s}
            className="rounded-full bg-muted/70 px-1.5 py-0.5"
            style={{ animation: `pulseDot 2s ease-in-out ${i * 0.15}s infinite` }}
          >
            {s}
          </span>
        ))}
      </div>
    </div>
  )
}

// Doubts — inbox row dropping in with a pulse, suggesting a
// fresh question landing. Real avatar adds human warmth.
function DoubtsGraphic() {
  return (
    <div className="flex w-full max-w-[220px] flex-col gap-2">
      <div
        className="rounded-md border border-accent/40 bg-accent/10 p-2 text-[10px] shadow-sm"
        style={{ animation: "inboxDrop 4s ease-in-out infinite" }}
      >
        <div className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/people/student-1.jpg" alt="" className="h-5 w-5 rounded-full object-cover ring-1 ring-accent/30" />
          <span className="font-semibold">Aanya R.</span>
          <span className="ml-auto rounded-full bg-accent px-1.5 text-[9px] font-bold text-accent-foreground">
            PRE-SALE
          </span>
        </div>
        <p className="mt-1 text-muted-foreground">Will this work for cohort batches?</p>
      </div>
      <div className="ml-3 flex items-center gap-1 text-[10px] text-muted-foreground">
        <Mail className="h-3 w-3" />
        <Zap className="h-3 w-3" />
        <span className="rounded bg-success/15 px-1.5 py-0.5 text-success">WhatsApp queued</span>
      </div>
    </div>
  )
}

// Faculty — real circular photo avatars that bloom in on a stagger,
// suggesting a growing team of real teachers.
function FacultyGraphic() {
  const AVATARS = [
    { src: "/people/teacher-1.jpg", alt: "Priya S." },
    { src: "/people/teacher-2.jpg", alt: "Vikram M." },
    { src: "/people/teacher-3.jpg", alt: "Arjun K." },
  ]
  return (
    <div className="flex w-full max-w-[220px] flex-col items-center gap-3">
      <div className="flex -space-x-3">
        {AVATARS.map((a, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={a.alt}
            src={a.src}
            alt={a.alt}
            className="h-11 w-11 rounded-full object-cover ring-2 ring-card"
            style={{ animation: `fadeUp 0.6s ease-out ${i * 0.14}s both` }}
          />
        ))}
        <div
          className="flex h-11 w-11 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground ring-2 ring-card"
          style={{ animation: `fadeUp 0.6s ease-out 0.42s both` }}
        >
          +7
        </div>
      </div>
      <div className="flex flex-col items-center gap-0.5 text-[10px] text-muted-foreground">
        <span>10 faculty · 3 admins · multi-tenant</span>
        <span className="inline-flex items-center gap-1">
          <KeyRound className="h-2.5 w-2.5" />
          zxcvbn-secured logins
        </span>
      </div>
    </div>
  )
}
