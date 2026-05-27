// /solutions/launch-your-creator-business — day-1 setup, every tool included.

import type { Metadata } from "next"
import Link from "next/link"
import {
  ArrowRight,
  Award,
  BookOpen,
  Calendar,
  CheckCircle2,
  Code,
  CreditCard,
  FileText,
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
  Rocket,
  ShoppingBag,
  Sparkles,
  TrendingUp,
  Trophy,
  Users,
  Video,
  Wand2,
} from "lucide-react"
import { Header } from "@/components/landing/header"
import { Footer } from "@/components/landing/footer"
import { SolutionPage } from "@/components/landing/solution-page"

export const metadata: Metadata = {
  title: "Why Creators Launch on Our Business Suite · The Big Class",
  description:
    "Day-1 launch checklist: claim subdomain, customize your brand, list e-books/courses, host live cohorts, and collect UPI payouts on your white-labeled custom URL.",
  alternates: { canonical: "https://thebigclass.com/solutions/launch-your-creator-business" },
}

export default function LaunchPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1">
        <SolutionPage
          eyebrow="Launch Your Business · Day One"
          title={
            <>
              From idea to live.{" "}
              <span className="bg-gradient-to-r from-violet-500 via-purple-500 to-indigo-600 bg-clip-text text-transparent">
                In one afternoon.
              </span>
            </>
          }
          subtitle="Stop delaying your launch. The Big Class is built to eliminate technical friction. Claim your subdomain, personalize your brand colors, list digital products, schedule live cohorts, and accept direct UPI & card checkouts under your own custom domain in under 45 minutes."
          heroVisual={<LaunchHeroVisual />}
          outcomes={[
            {
              icon: <Rocket className="h-5 w-5 animate-pulse text-indigo-500" />,
              title: "Your Professional Portal is Live by Tonight",
              body: "Claim your subdomain in 30 seconds. Drop in your headshot or academy logo. Your storefront is active at yourname.thebigclass.com instantly — with clean layouts and zero competitor ads.",
            },
            {
              icon: <ShoppingBag className="h-5 w-5 text-emerald-500" />,
              title: "List Your First Product & Accept Payments",
              body: "Select your monetization model: list self-paced courses, coaching calls, downloadable ZIPs/PDFs, or annual memberships. Native UPI and cards settle checkouts straight to your business bank account.",
            },
            {
              icon: <Users className="h-5 w-5 text-violet-500" />,
              title: "Build & Roster Your First Member Cohort",
              body: "Share your branded link. Your first student purchases automatically compile in a unified roster directory where you track their course progress, doubt tickets, and billing details.",
            },
          ]}
          featureMap={[
            {
              icon: <Globe2 className="h-4 w-4" />,
              title: "White-labeled portal hub",
              body: "Establish a beautiful personal destination (e.g. academy.yourname.com) featuring your customized branding.",
              href: "/features/portal",
            },
            {
              icon: <Package className="h-4 w-4" />,
              title: "Digital Downloads storefront",
              body: "Upload presets, Notion setups, worksheets, e-books, LUTs, or guides with secure browser direct-delivery.",
              href: "/solutions/digital-products",
            },
            {
              icon: <Calendar className="h-4 w-4" />,
              title: "Interactive Live Cohorts",
              body: "Schedule cohort sessions with LiveKit-powered classes, automated cloud recording, and point standings.",
              href: "/solutions/live-cohorts",
            },
            {
              icon: <Repeat className="h-4 w-4" />,
              title: "Recurring Memberships",
              body: "Bundle courses, template downloads, live Q&As, and VIP feeds inside one automated recurring plan.",
              href: "/solutions/memberships",
            },
          ]}
          comparison={{
            alternativeName: "Obvious Multi-SaaS Stack",
            rows: [
              {
                label: "Monthly Tool Cost",
                us: "$0 platform fees to start. One low monthly flat subscription when you scale, keeping 100% of your earnings.",
                them: "$150+/month combined for Teachable starter + Gumroad transaction cuts + Linktree Pro + Zoom Pro.",
              },
              {
                label: "Student Account Experience",
                us: "Single unified login. Students purchase downloads, join live cohorts, track progress, and post in the community using one password.",
                them: "Jumbled mess. Students must manage 4 different logins, search emails for links, and bounce between disconnected apps.",
              },
              {
                label: "Branded Setup Time",
                us: "Under 45 minutes. Subdomain, color palette, custom domain CNAME, storefront product, and payouts all configured today.",
                them: "Days or weeks of API integrations, Zapier connectors, webhook configuration, and styling custom CSS sheets.",
              },
            ],
          }}
          cta={{
            title: "Your launch isn't a complex project. It's a Saturday afternoon.",
            body: "The free Starter plan has everything you need to launch. Professional branding, cohorts, and custom CNAME domains can be configured whenever you're ready.",
          }}
        />

        {/* Launch checklist — extra section unique to this lander */}
        <section className="relative border-t border-border/60 bg-muted/10 py-24 overflow-hidden">
          {/* Subtle background visual highlights */}
          <div className="absolute top-1/3 left-10 w-96 h-96 bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none" />

          <div className="mx-auto max-w-3xl px-6 lg:px-8">
            <div className="text-center">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.2em] text-primary">
                Day-1 checklist
              </span>
              <h2 className="mt-4 text-balance text-3xl font-black tracking-tight sm:text-4xl bg-gradient-to-r from-foreground via-foreground to-muted-foreground bg-clip-text text-transparent">
                Five steps. Under 45 minutes.
              </h2>
              <p className="mt-4 text-base text-muted-foreground max-w-xl mx-auto leading-relaxed">
                Your zero-friction roadmap from account creation to a fully functional teaching empire.
              </p>
            </div>

            {/* Glowing sequential vertical timeline */}
            <ol className="relative mt-16 space-y-6 before:absolute before:left-9 before:top-14 before:bottom-14 before:w-[2px] before:bg-gradient-to-b before:from-primary/40 before:via-indigo-500/20 before:to-transparent">
              {[
                {
                  num: "01",
                  title: "Claim your custom subdomain",
                  body: "Specify your academy name. Hit verify. Your subdomain goes live instantly at yourname.thebigclass.com with zero setup fees.",
                  minutes: "30 sec",
                  badgeColor: "bg-primary/15 text-primary border-primary/20",
                },
                {
                  num: "02",
                  title: "Customize your layout theme",
                  body: "Open /dashboard/portal/brand. Upload your logo, write a short bio, and select one of 8 premium color palettes to reflect your brand identity.",
                  minutes: "5 min",
                  badgeColor: "bg-indigo-500/15 text-indigo-500 border-indigo-500/20",
                },
                {
                  num: "03",
                  title: "Publish your first storefront offer",
                  body: "Navigate to Storefront → New Product. Select your monetization path (course / 1:1 consults / memberships / downloads), set pricing, and publish.",
                  minutes: "10 min",
                  badgeColor: "bg-violet-500/15 text-violet-500 border-violet-500/20",
                },
                {
                  num: "04",
                  title: "Write your hero headline & blog post",
                  body: "Outline your course page and edit the landing hero text. Launch a companion blog at /dashboard/blog to start driving organic traffic from Google.",
                  minutes: "20 min",
                  badgeColor: "bg-pink-500/15 text-pink-500 border-pink-500/20",
                },
                {
                  num: "05",
                  title: "Share your branded link",
                  body: "Post your custom URL everywhere your audience lives. The moment your first checkout clears, your student registers automatically in your unified roster list.",
                  minutes: "5 min",
                  badgeColor: "bg-emerald-500/15 text-emerald-500 border-emerald-500/20",
                },
              ].map((step) => (
                <li
                  key={step.num}
                  className="relative group flex items-start gap-5 rounded-2xl border border-border/80 bg-card/50 p-6 shadow-sm backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:bg-card hover:shadow-md"
                >
                  <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border font-mono text-sm font-black shadow-inner z-10 transition-colors ${step.badgeColor}`}>
                    {step.num}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-base font-extrabold text-foreground tracking-tight group-hover:text-primary transition-colors">
                        {step.title}
                      </p>
                      <span className="rounded-full bg-secondary/80 px-2.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-muted-foreground border border-border/50">
                        {step.minutes}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground/90 font-medium">
                      {step.body}
                    </p>
                  </div>
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}

// ─── Gorgeous Custom Launch Visual ──────────────────────────────────────────

function LaunchHeroVisual() {
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
          background: "radial-gradient(circle, #10b981 0%, transparent 70%)",
          animation: "greenPulse 6s ease-in-out infinite 3s",
        }}
      />

      {/* ── Main Mockup: Day-1 Active Launchpad ── */}
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

        {/* Dashboard launch checklist status */}
        <div className="p-4 border-b border-border/50 bg-muted/10">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">Day-1 Setup Progress</span>
            <span className="text-[9px] font-bold text-indigo-500 bg-indigo-500/10 px-2 py-0.5 rounded-full">4/5 Steps Done</span>
          </div>

          {/* Checklist progress */}
          <div className="space-y-2">
            {[
              { label: "Subdomain Claimed: Snapied", done: true },
              { label: "Theme Customization Applied", done: true },
              { label: "First Video Course Published", done: true },
              { label: "Direct UPI & Cards Checkout Connected", done: true },
              { label: "CNAME Custom Domain Connection", done: false },
            ].map((step) => (
              <div key={step.label} className="rounded-lg border border-border bg-card/60 p-2 flex items-center gap-2.5 justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className={`h-3.5 w-3.5 ${step.done ? "text-emerald-500" : "text-muted-foreground/35"}`} />
                  <span className={`text-[9.5px] font-bold ${step.done ? "text-foreground" : "text-muted-foreground"}`}>{step.label}</span>
                </div>
                {!step.done && (
                  <span className="text-[7.5px] font-extrabold text-indigo-500 bg-indigo-500/10 px-2 py-0.5 rounded cursor-pointer border border-indigo-500/20">CONNECT</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Floating Widget 1: Direct UPI Payouts ── */}
      <div
        className="absolute -left-12 -bottom-5 z-20 w-44 rounded-xl border border-emerald-500/20 bg-card/95 p-3.5 shadow-2xl backdrop-blur-md"
        style={{
          animation: "floatInUp 0.6s ease-out 0.2s both",
          boxShadow: "0 20px 50px -10px rgba(0,0,0,0.3)",
        }}
      >
        <div className="flex items-center gap-1.5 text-[8px] font-bold text-emerald-600 uppercase tracking-wider mb-2">
          <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
          First Sale Live!
        </div>
        <div className="border border-dashed border-emerald-500/20 rounded-lg p-2.5 text-center bg-emerald-500/5">
          <p className="text-[7px] text-muted-foreground font-semibold">PAYOUT COMPLETED T+2</p>
          <p className="text-[10px] font-black text-foreground mt-1">₹4,999 from Rohan K.</p>
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
          <p className="text-[8px] font-bold leading-none text-muted-foreground">PORTAL LIVE 🚀</p>
          <p className="mt-0.5 text-[9px] font-extrabold text-foreground">academy.yourname.com</p>
        </div>
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
      </div>

      {/* Keyframe Styling */}
      <style>{`
        @keyframes indigoPulse {
          0%, 100% { transform: scale(1); opacity: 0.15; }
          50% { transform: scale(1.1); opacity: 0.25; }
        }
        @keyframes greenPulse {
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
