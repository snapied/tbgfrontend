"use client"

// The Founder Bill of Rights — six contractual commitments
// surfaced as a card grid on the home page. Each one is a
// promise we can be held to; clicking through goes to the
// authoritative page (refund policy, status page, the help
// article that documents the export tooling, etc.).
//
// This is the trust closer that sits between the competitor
// teardown ("here's what's broken elsewhere") and the
// product-feature sections ("here's what we built instead").
// Reading order matters — by the time a visitor reaches
// products-you-can-sell, the framing is set.

import Link from "next/link"
import {
  ArrowRight,
  Download,
  HeartHandshake,
  IndianRupee,
  Lock,
  ShieldCheck,
  Signature,
  Sparkles,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

interface Right {
  icon: React.ElementType
  title: string
  body: string
  href: string
  hrefLabel: string
}

const RIGHTS: Right[] = [
  {
    icon: IndianRupee,
    title: "Flat fee. No commission.",
    body:
      "One predictable price per plan. Zero percent of your revenue, ever. The pricing page never changes for existing customers — grandfathered for life.",
    href: "/pricing",
    hrefLabel: "See pricing",
  },
  {
    icon: HeartHandshake,
    title: "30-day refund, no fine print.",
    body:
      "Full money-back guarantee within 30 days — including onboarding fees. No retention squad, no cancellation maze. One support reply, done.",
    href: "/legal/refund",
    hrefLabel: "Refund policy",
  },
  {
    icon: Download,
    title: "Your data, one click.",
    body:
      "Full-workspace export from settings — CSV per entity for Excel, or one JSON file for the lot. Reimport rebuilds a fresh workspace from either. We measure switching cost. We try to lower it.",
    href: "/help/workspace-export",
    hrefLabel: "Export + reimport guide",
  },
  {
    icon: ShieldCheck,
    title: "Public uptime + incidents.",
    body:
      "Status page open to the world. Post-mortems within 7 days of every P0 incident, with the fix shipped or scheduled. We don't hide outages.",
    href: "/updates",
    hrefLabel: "See status + changelog",
  },
  {
    icon: Signature,
    title: "Lifetime deals stay lifetime.",
    body:
      "Whatever was promised in your sign-up email is binding. We don't force-convert grandfathered plans. Acquisitions don't break your contract.",
    href: "/founder-bill-of-rights#article-5",
    hrefLabel: "Read Article 5",
  },
  {
    icon: Lock,
    title: "We never sell your audience.",
    body:
      "Your student list is yours. We don't cross-promote your students into other creators' funnels. We don't profile or resell their data — full stop.",
    href: "/legal/privacy",
    hrefLabel: "Privacy policy",
  },
]

export function FounderBillOfRights() {
  return (
    <section className="relative overflow-hidden py-24">
      {/* Soft brand-tint background. Different from the teardown
          section above (white card surface) so the rhythm of the
          page alternates as you scroll. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-primary/[0.03] via-background to-accent/[0.02]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 right-1/4 h-72 w-72 rounded-full bg-accent/10 blur-3xl"
      />

      <div className="relative mx-auto max-w-6xl px-6 lg:px-8">
        {/* Section header */}
        <div className="mx-auto max-w-3xl text-center">
          <Badge variant="outline" className="mb-4 animate-[billUp_0.5s_ease-out]">
            <Sparkles className="mr-1 h-3 w-3" />
            Founder Bill of Rights
          </Badge>
          <h2 className="font-serif text-4xl font-bold tracking-tight sm:text-5xl">
            The platform that treats you{" "}
            <span className="text-primary">like the founder</span>, not the product.
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
            Six commitments. Each one links to the page that holds us accountable. Print this,
            tape it to your monitor, hold us to every line — that&apos;s the entire deal.
          </p>
        </div>

        {/* Cards */}
        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {RIGHTS.map((r, i) => (
            <RightCard key={r.title} right={r} delay={i * 70} />
          ))}
        </div>

        {/* Footer CTA */}
        <div className="mt-14 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button asChild size="lg">
            <Link href="/founder-bill-of-rights">
              Read the full bill
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/pricing">See pricing</Link>
          </Button>
        </div>
      </div>

      <style>{`
        @keyframes billUp {
          0%   { opacity: 0; transform: translateY(12px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes billStaggerIn {
          0%   { opacity: 0; transform: translateY(16px) scale(0.98); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </section>
  )
}

function RightCard({ right, delay }: { right: Right; delay: number }) {
  const Icon = right.icon
  return (
    <Link
      href={right.href}
      className="group block"
      style={{ animation: `billStaggerIn 0.6s ease-out ${delay}ms both` }}
    >
      <Card className="h-full transition-all duration-200 group-hover:-translate-y-1 group-hover:border-primary/40 group-hover:shadow-lg">
        <CardContent className="space-y-3 p-6">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
            <Icon className="h-5 w-5" />
          </div>
          <h3 className="font-serif text-xl font-bold leading-tight">{right.title}</h3>
          <p className="text-sm leading-relaxed text-muted-foreground">{right.body}</p>
          <p className="inline-flex items-center gap-1 pt-1 text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
            {right.hrefLabel} <ArrowRight className="h-3 w-3" />
          </p>
        </CardContent>
      </Card>
    </Link>
  )
}
