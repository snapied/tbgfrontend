// /solutions/launch-your-creator-business — day-1 setup, every tool included.

import type { Metadata } from "next"
import {
  Calendar,
  CheckCircle2,
  CreditCard,
  Globe2,
  GraduationCap,
  Rocket,
  ShoppingBag,
  Users,
  Wand2,
} from "lucide-react"
import { Header } from "@/components/landing/header"
import { Footer } from "@/components/landing/footer"
import { SolutionPage } from "@/components/landing/solution-page"

export const metadata: Metadata = {
  title: "Launch your creator business · The Big Class",
  description:
    "Day-1 setup checklist: subdomain → portal → first product → first cohort → custom domain. Every tool included from day one — no add-ons, no surprise bills. Free Starter plan covers the launch.",
  alternates: { canonical: "https://thebigclass.com/solutions/launch-your-creator-business" },
}

export default function LaunchPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1">
        <SolutionPage
          eyebrow="Launch · day one"
          title={
            <>
              Day one to live.{" "}
              <span className="text-primary">In one afternoon.</span>
            </>
          }
          subtitle="A clear 5-step path from a blank account to a live workspace selling your first product. No setup fee. No demo call. No add-ons. Free Starter plan covers everything on this page."
          outcomes={[
            {
              icon: <Rocket className="h-5 w-5" />,
              title: "Live on a real URL by tonight",
              body: "Claim your subdomain in 30 seconds. Drop in your logo. Your portal is live at <yourname>.thebigclass.com immediately.",
            },
            {
              icon: <ShoppingBag className="h-5 w-5" />,
              title: "Your first product, taking payments",
              body: "Pick a kind (course / cohort / download / 1:1 / membership), set INR pricing, hit publish. UPI + cards work out of the box.",
            },
            {
              icon: <Users className="h-5 w-5" />,
              title: "Your first audience members on the roster",
              body: "Share the URL. Your first sale lands on your member list — same place every future purchase will appear.",
            },
          ]}
          featureMap={[
            { icon: <Globe2 className="h-4 w-4" />, title: "Public portal", body: "Page builder, themes, blog, faculty showcase — your audience hub.", href: "/features/portal" },
            { icon: <ShoppingBag className="h-4 w-4" />, title: "Storefront", body: "8 product types, INR + UPI, zero commission.", href: "/features/storefront" },
            { icon: <GraduationCap className="h-4 w-4" />, title: "Course builder", body: "Modules, lessons, quizzes, certificates.", href: "/features/courses" },
            { icon: <Calendar className="h-4 w-4" />, title: "Live + cohorts", body: "LiveKit class rooms, cohort feeds, recordings, included.", href: "/solutions/live-cohorts" },
          ]}
          cta={{
            title: "Your launch isn't a project. It's a Saturday afternoon.",
            body: "Free Starter plan covers every capability above. Pro+ unlocks custom domain, white-label, team seats — flip when you're ready to scale.",
          }}
        />

        {/* Launch checklist — extra section unique to this lander */}
        <section className="border-t border-border/60 bg-muted/20 py-20">
          <div className="mx-auto max-w-3xl px-6 lg:px-8">
            <div className="text-center">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
                Day-1 checklist
              </p>
              <h2 className="mt-3 text-balance text-3xl font-bold tracking-tight sm:text-4xl">
                Five steps. About 45 minutes.
              </h2>
            </div>
            <ol className="mt-10 space-y-4">
              {[
                {
                  num: "01",
                  title: "Claim your subdomain",
                  body: "Type your brand name on the homepage. Hit go. You're on <yourname>.thebigclass.com.",
                  minutes: "30 sec",
                },
                {
                  num: "02",
                  title: "Drop in your logo + pick a theme",
                  body: "Open /dashboard/portal/brand. Upload logo, pick one of 8 theme presets. Your portal is live and on-brand.",
                  minutes: "5 min",
                },
                {
                  num: "03",
                  title: "Publish your first product",
                  body: "Storefront → New product. Pick a kind (course / 1:1 / membership / download), set INR price, publish.",
                  minutes: "10 min",
                },
                {
                  num: "04",
                  title: "Write your hero + first blog post",
                  body: "Page builder → Hero section, drop in your headline. Then /dashboard/blog → first post for SEO + lead capture.",
                  minutes: "20 min",
                },
                {
                  num: "05",
                  title: "Share the URL",
                  body: "Post your subdomain everywhere your audience lives. First sale = first member in your roster — same place every future purchase appears.",
                  minutes: "5 min",
                },
              ].map((step) => (
                <li
                  key={step.num}
                  className="flex items-start gap-4 rounded-2xl border border-border bg-card p-5"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 font-mono text-sm font-bold text-primary">
                    {step.num}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-base font-bold">{step.title}</p>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        {step.minutes}
                      </span>
                    </div>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      {step.body}
                    </p>
                  </div>
                  <CheckCircle2 className="mt-1.5 h-4 w-4 shrink-0 text-success/40" />
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

void CreditCard
void Wand2
