// /alternatives — Index page listing all competitive platform comparison landers.

import type { Metadata } from "next"
import Link from "next/link"
import {
  ArrowRight,
  ArrowRightLeft,
  CheckCircle2,
  Database,
  IndianRupee,
  Layers,
  Sparkles,
  Zap,
} from "lucide-react"
import { Header } from "@/components/landing/header"
import { Footer } from "@/components/landing/footer"
import { Button } from "@/components/ui/button"
import { ALTERNATIVES } from "@/lib/alternatives"

export const metadata: Metadata = {
  title: "Compare Honestly with Creator Alternatives · The Big Class",
  description:
    "Honest feature-by-feature comparisons. See how The Big Class replaces expensive platforms like Teachable, Kajabi, Gumroad, and Graphy with a 0% commission suite.",
  alternates: { canonical: "https://thebigclass.com/alternatives" },
}

// Map accents to real Tailwind colors for the border/text glow on the index page
const BORDER_ACCENTS: Record<string, { hoverBorder: string; hoverText: string; lightBg: string }> = {
  blue:   { hoverBorder: "hover:border-blue-500/40", hoverText: "text-blue-500", lightBg: "bg-blue-500/10" },
  purple: { hoverBorder: "hover:border-purple-500/40", hoverText: "text-purple-500", lightBg: "bg-purple-500/10" },
  teal:   { hoverBorder: "hover:border-teal-500/40", hoverText: "text-teal-500", lightBg: "bg-teal-500/10" },
  pink:   { hoverBorder: "hover:border-pink-500/40", hoverText: "text-pink-500", lightBg: "bg-pink-500/10" },
  orange: { hoverBorder: "hover:border-orange-500/40", hoverText: "text-orange-500", lightBg: "bg-orange-500/10" },
  indigo: { hoverBorder: "hover:border-indigo-500/40", hoverText: "text-indigo-500", lightBg: "bg-indigo-500/10" },
  amber:  { hoverBorder: "hover:border-amber-500/40", hoverText: "text-amber-500", lightBg: "bg-amber-500/10" },
  rose:   { hoverBorder: "hover:border-rose-500/40", hoverText: "text-rose-500", lightBg: "bg-rose-500/10" },
}

export default function AlternativesIndexPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1" id="main-content">
        {/* Hero Section */}
        <section className="relative overflow-hidden border-b border-border/60 bg-gradient-to-b from-secondary/50 via-background to-background py-20 lg:py-28">
          {/* Glowing background meshes */}
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none" />

          <div className="mx-auto max-w-5xl px-6 text-center lg:px-8">
            <Link
              href="/solutions"
              className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-primary hover:bg-primary/15 transition-colors mb-6"
            >
              <ArrowRightLeft className="h-3 w-3" /> Move to a Modern Workspace
            </Link>
            <h1 className="text-balance text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl bg-gradient-to-r from-foreground via-foreground to-muted-foreground bg-clip-text text-transparent">
              Honest comparisons. <br className="hidden sm:inline" />
              <span className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-600 bg-clip-text text-transparent">
                No feature-gating. Zero commission.
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-balance text-lg leading-relaxed text-muted-foreground">
              We did the homework for you. Compare The Big Class side-by-side with your existing platform. Find out why modern educators are ditching expensive subscription bundles and high transaction cuts.
            </p>
          </div>
        </section>

        {/* Alternatives Grid Section */}
        <section className="py-20 bg-background">
          <div className="mx-auto max-w-6xl px-6 lg:px-8">
            <div className="mx-auto max-w-3xl text-center mb-16">
              <span className="text-xs font-extrabold uppercase tracking-[0.2em] text-primary">
                Select Your Rival Platform
              </span>
              <h2 className="mt-3 text-3xl font-black text-foreground sm:text-4xl">
                Ready to migrate? Choose your path.
              </h2>
              <p className="mt-3 text-muted-foreground">
                Click any alternative card below to view detailed math, savings calculators, and step-by-step migration playbooks.
              </p>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {ALTERNATIVES.map((alt) => {
                const accentInfo = BORDER_ACCENTS[alt.accent] || BORDER_ACCENTS.indigo
                return (
                  <Link
                    key={alt.slug}
                    href={`/alternatives/${alt.slug}`}
                    className={`group relative flex flex-col justify-between rounded-2xl border border-border/80 bg-card/60 p-6 shadow-sm backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${accentInfo.hoverBorder}`}
                  >
                    <div>
                      {/* Top bar with tiny colored light */}
                      <div className="flex items-center justify-between mb-4">
                        <span className={`h-2.5 w-2.5 rounded-full ${accentInfo.lightBg} ring-2 ring-card group-hover:scale-125 transition-transform duration-300`} style={{ backgroundColor: alt.accent }} />
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                          {alt.category}
                        </span>
                      </div>

                      <h3 className="text-lg font-black text-foreground group-hover:text-primary transition-colors flex items-center gap-1.5">
                        {alt.name} Alternative
                        <ArrowRight className="h-4 w-4 shrink-0 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-300 text-primary" />
                      </h3>

                      <p className="mt-3 text-sm leading-relaxed text-muted-foreground/90 font-medium line-clamp-3">
                        {alt.shortPitch}
                      </p>
                    </div>

                    <div className="mt-6 pt-4 border-t border-border/40 flex items-center justify-between text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground group-hover:text-primary transition-colors">
                      <span>View Detailed Review</span>
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/5 group-hover:bg-primary/10 transition-colors">
                        <Sparkles className="h-3.5 w-3.5" />
                      </span>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        </section>

        {/* Benefits strip */}
        <section className="border-t border-b border-border/60 bg-muted/20 py-16">
          <div className="mx-auto max-w-5xl px-6 lg:px-8">
            <div className="grid gap-8 sm:grid-cols-3">
              <div className="flex flex-col items-center text-center p-4">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500 mb-4 shadow-inner">
                  <IndianRupee className="h-6 w-6" />
                </span>
                <h4 className="text-base font-black">0% Commission Payouts</h4>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  Keep 100% of your course and cohort sales. Money goes straight from your gateway to your bank account.
                </p>
              </div>

              <div className="flex flex-col items-center text-center p-4">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-500 mb-4 shadow-inner">
                  <Layers className="h-6 w-6 animate-pulse" />
                </span>
                <h4 className="text-base font-black">One Workspace, One Bill</h4>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  Replace Discord, Zoom, Teachable, convertKit, and site hosting. Manage your whole business in one clean workspace.
                </p>
              </div>

              <div className="flex flex-col items-center text-center p-4">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-500/10 text-purple-500 mb-4 shadow-inner">
                  <Database className="h-6 w-6" />
                </span>
                <h4 className="text-base font-black">Zero-Hostage Data Portability</h4>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  Export your student roster, courses, order history, and settings as JSON/CSV in one click, any time.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Closing CTA */}
        <section className="relative overflow-hidden py-24 text-center">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.03] via-background to-background" />
          <div className="relative mx-auto max-w-3xl px-6 lg:px-8">
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full border border-primary/20 bg-primary/5 text-[11px] font-extrabold uppercase tracking-widest text-primary">
              <Zap className="h-3 w-3" /> No setup fees · day-1 live
            </span>
            <h2 className="mt-6 text-3xl font-black sm:text-4xl lg:text-5xl">
              Ready to claim your domain?
            </h2>
            <p className="mt-4 text-base text-muted-foreground leading-relaxed">
              Start setting up your workspace under your customized subdomain in under 5 minutes. No credit card required.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button asChild size="lg" className="gap-2">
                <Link href="/signup">
                  Get Started Free <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/pricing">View Pricing Plans</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
