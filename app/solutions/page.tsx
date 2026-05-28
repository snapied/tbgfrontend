// /solutions — index page listing every solution lander.
// Grouped by the same 3 buckets the mega menu uses.

import type { Metadata } from "next"
import Link from "next/link"
import {
  ArrowRight,
  Briefcase,
  Calendar,
  Compass,
  GraduationCap,
  Instagram,
  Layers,
  Package,
  Repeat,
  Sparkles,
  Users,
  Wand2,
  Youtube,
} from "lucide-react"
import { Header } from "@/components/landing/header"
import { Footer } from "@/components/landing/footer"

export const metadata: Metadata = {
  title: "Solutions · The Big Class",
  description:
    "Pick the path that matches what you do. Solutions by creator, by business model, and by goal — every page leads to a free workspace you can stand up in 30 seconds.",
}

const GROUPS = [
  {
    title: "By creator",
    items: [
      { href: "/solutions/for-youtubers", icon: Youtube, label: "For YouTubers", body: "Convert subs into paying members" },
      { href: "/solutions/for-instagram-creators", icon: Instagram, label: "For Instagram creators", body: "Link-in-bio that actually earns" },
      { href: "/solutions/for-teachers", icon: Briefcase, label: "For teachers", body: "1:1 sessions, group cohorts, content" },
      { href: "/solutions/for-course-creators", icon: GraduationCap, label: "For course creators", body: "The full course platform — your URL" },
      { href: "/solutions/for-personal-brands", icon: Sparkles, label: "For personal brands", body: "Multi-product creator brand at one URL" },
    ],
  },
  {
    title: "By business model",
    items: [
      { href: "/solutions/paid-communities", icon: Users, label: "Paid communities", body: "Subscription-gated cohort feeds" },
      { href: "/solutions/live-cohorts", icon: Calendar, label: "Live cohorts", body: "Time-boxed batches, zero seat fees" },
      { href: "/solutions/memberships", icon: Repeat, label: "Memberships", body: "Recurring access to a bundle" },
      { href: "/solutions/digital-products", icon: Package, label: "Digital products", body: "PDFs, audio, video, ZIPs, license keys" },
    ],
  },
  {
    title: "By goal",
    items: [
      { href: "/solutions/launch-your-creator-business", icon: Wand2, label: "Launch your business", body: "Day-1 setup, every tool included" },
      { href: "/solutions/replace-your-stack", icon: Layers, label: "Replace your stack", body: "One bill replaces 6 tools" },
      { href: "/use-cases", icon: Compass, label: "All use cases", body: "Solo · School · College · Corporate · NGO" },
    ],
  },
]

export default function SolutionsIndexPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1">
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-secondary/60 via-background to-background" />
          <div className="relative mx-auto max-w-6xl px-6 py-20 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-semibold text-accent-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                Solutions
              </div>
              <h1 className="mt-5 text-balance text-4xl font-black tracking-tight sm:text-5xl">
                Pick the path that matches what you do.
              </h1>
              <p className="mt-4 text-balance text-lg leading-relaxed text-muted-foreground">
                Every lander below opens with the outcomes you&rsquo;re chasing, then maps
                them to exactly what the platform ships. No category-bait. No vague claims.
              </p>
            </div>
            <div className="mt-12 grid gap-8 lg:grid-cols-3">
              {GROUPS.map((g) => (
                <div key={g.title}>
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
                    {g.title}
                  </p>
                  <ul className="mt-4 space-y-2">
                    {g.items.map((i) => (
                      <li key={i.href}>
                        <Link
                          href={i.href}
                          className="group flex items-start gap-3 rounded-xl border border-border bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
                        >
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <i.icon className="h-4 w-4" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold">{i.label}</p>
                            <p className="text-[12px] leading-relaxed text-muted-foreground">
                              {i.body}
                            </p>
                          </div>
                          <ArrowRight className="mt-1 h-3.5 w-3.5 shrink-0 -translate-x-1 text-muted-foreground opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-60" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
