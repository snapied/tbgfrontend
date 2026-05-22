// /founder-bill-of-rights — the long-form, linkable version of
// the six commitments we surface on the home page. Reads like a
// contract, on purpose: every promise spelled out, every "what
// this means in practice" footnote attached, every related page
// linked so a buyer can verify it on the spot.
//
// This page is the destination for every "Read the bill" CTA we
// fire on the marketing site + the trust card inside the new-
// features showcase. The /about page stays focused on company
// identity (Dehradun, who we are, the team) and the bill stays
// focused on what we owe creators.

import Link from "next/link"
import type { Metadata } from "next"
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Download,
  HeartHandshake,
  IndianRupee,
  Lock,
  Mail,
  ShieldCheck,
  Signature,
  Sparkles,
} from "lucide-react"
import { Header } from "@/components/landing/header"
import { Footer } from "@/components/landing/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

const SITE_URL = "https://thebigclass.com"
const PAGE_PATH = "/founder-bill-of-rights"

export const metadata: Metadata = {
  title: "The Founder Bill of Rights · The Big Class",
  description:
    "Six contractual commitments to every creator on The Big Class — flat fees, one-click data export, 30-day refund, public uptime, lifetime deals honoured, audience never sold.",
  keywords: [
    "creator platform commitments",
    "course platform refund policy",
    "no commission creator platform",
    "data portability LMS",
    "Founder Bill of Rights",
    "platform terms creators",
  ],
  alternates: { canonical: `${SITE_URL}${PAGE_PATH}` },
  openGraph: {
    type: "article",
    url: `${SITE_URL}${PAGE_PATH}`,
    siteName: "The Big Class",
    title: "The Founder Bill of Rights",
    description:
      "Six contractual commitments to every creator. Flat fee, one-click export, 30-day refund, public uptime, lifetime deals stay lifetime, audience never sold.",
  },
  twitter: {
    card: "summary_large_image",
    title: "The Founder Bill of Rights",
    description:
      "Six commitments. Each one with the page that holds us accountable.",
  },
}

// FAQ JSON-LD — the questions buyers actually type into search
// when evaluating creator platforms. Surfaces in Google rich
// results once the page ranks.
const FAQ_JSONLD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Does The Big Class take a commission on creator revenue?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "No. We charge a flat fee per plan and take zero percent of what creators earn. The pricing page is public and we never change it for existing customers — grandfathered for life.",
      },
    },
    {
      "@type": "Question",
      name: "What's the refund policy on The Big Class?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "30 days, no fine print, no retention squad. Onboarding fees are included in the refund. Email one address, money back.",
      },
    },
    {
      "@type": "Question",
      name: "Can I export my data if I want to leave?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes — two ways. Per-entity CSV or JSON for students, courses, and orders (Excel-ready). Or one workspace JSON envelope with every byte (courses, students, orders, certificates, blog posts, portal config, the lot). Download from /dashboard/settings → Workspace data. Re-upload to any workspace to restore.",
      },
    },
    {
      "@type": "Question",
      name: "Will my plan terms change after I sign up?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "No. Whatever was promised in your sign-up email is binding — including lifetime deals. We don't force-convert grandfathered plans, and acquisitions don't break your contract.",
      },
    },
  ],
}

interface Article {
  no: number
  icon: React.ElementType
  shortTitle: string
  title: string
  promise: string
  inPractice: string[]
  links: { href: string; label: string }[]
}

const ARTICLES: Article[] = [
  {
    no: 1,
    icon: IndianRupee,
    shortTitle: "Flat fee. Zero commission.",
    title: "We don't take a cut of what you earn.",
    promise:
      "Our pricing is one predictable amount per plan, listed publicly, paid by you to us — and that's the entire commercial relationship. We do not take a percentage of your course sales, your storefront orders, your memberships, your live-class tickets, your certificate fees, or any other revenue stream you run on the platform.",
    inPractice: [
      "The pricing page at /pricing is the canonical source. It never changes mid-billing-cycle for existing customers.",
      "Payment processor fees (Razorpay ~2%, Stripe ~2.9% + 30¢) pass through transparently — we don't mark them up, you can verify against your processor's dashboard.",
      "If a future feature is gated to a higher plan, you'll be told before that plan exists — not surprised after sign-up.",
    ],
    links: [
      { href: "/pricing", label: "See current pricing" },
      { href: "/features/api", label: "Free on every plan: API" },
      { href: "/features/whitelabel", label: "Free on every plan: white-label" },
    ],
  },
  {
    no: 2,
    icon: HeartHandshake,
    shortTitle: "30-day refund. No fine print.",
    title: "30 days. Money back. No retention squad.",
    promise:
      "Any time in your first 30 days, email one address and we refund every rupee — including any onboarding fees. We do not require you to talk to a retention specialist, schedule an exit call, fill out a five-page survey, or wait for an internal approval ladder. One reply, one refund.",
    inPractice: [
      "Cancellations beyond 30 days follow the standard mid-cycle proration — you keep access until the end of the paid period, and we don't auto-renew without your consent.",
      "Refunds process on the same payment method you used. Stripe + Razorpay typically settle in 5–10 business days; we don't control that timing but we surface every status update.",
      "If a refund is delayed beyond two billing weeks, escalate to the workspace owner address in your invoice — we'll resolve it in 24 hours.",
    ],
    links: [
      { href: "/legal/refund", label: "Read the refund policy" },
      { href: "/help", label: "How to request a refund" },
    ],
  },
  {
    no: 3,
    icon: Download,
    shortTitle: "Your data, one click.",
    title: "You can leave with everything, any day.",
    promise:
      "Every byte of your workspace is exportable from /dashboard/settings → Workspace data. Two flavours: per-entity CSV or JSON (students, courses, orders — Excel-ready spreadsheets) or one lossless workspace JSON envelope with the lot. Re-upload either back into a fresh workspace and you're back where you were. We measure switching cost as a key metric and try to lower it.",
    inPractice: [
      "Full workspace export covers: courses, lessons, students, faculty, enrolments, quizzes + attempts, assignments + submissions, certificates + batches, orders + entitlements, products, portal pages, blog posts, brand config, notifications, doubts, announcements, reviews — everything.",
      "Per-entity exports — students, courses, orders — as CSV (Excel/Google Sheets/Mailchimp ready) or JSON (structured, format-versioned).",
      "Plain CSV/JSON, no proprietary container. Open in any text editor, diff it, audit it, archive it.",
      "Export is browser-local. Nothing transits our servers during export — the file is generated on your machine.",
      "Reimport: one click for the full workspace, or upload an edited CSV (students by email, courses by id/slug) — non-destructive merge.",
    ],
    links: [
      { href: "/help/workspace-export", label: "Export + reimport guide" },
      { href: "/dashboard/settings", label: "Run an export now" },
    ],
  },
  {
    no: 4,
    icon: ShieldCheck,
    shortTitle: "Public uptime + incidents.",
    title: "When we break, we say so. Out loud.",
    promise:
      "Our status page is open to the world — not gated to logged-in customers, not buried behind a support ticket. Every P0 incident gets a post-mortem within seven days, posted publicly, with the fix shipped or scheduled. You don't have to email us to find out whether the platform is down.",
    inPractice: [
      "Status page lives at /updates (will move to a status.thebigclass.com subdomain in production).",
      "Incident page includes time-to-detect, time-to-mitigate, root cause, and remediation timeline — Stripe-style.",
      "Maintenance windows are announced 48 hours ahead in your dashboard + emailed to workspace owners.",
      "We don't claim five-nines we can't deliver. The status page shows the real number every quarter.",
    ],
    links: [{ href: "/updates", label: "See status + changelog" }],
  },
  {
    no: 5,
    icon: Signature,
    shortTitle: "Lifetime deals stay lifetime.",
    title: "What we promised at sign-up is what you have.",
    promise:
      "Whatever your sign-up email confirmed — including lifetime deals, grandfathered prices, custom limits, and bundled features — is a binding commitment. We do not force-convert legacy customers onto new terms. Acquisitions, recapitalisations, and pivots do not break your contract.",
    inPractice: [
      "Your sign-up email is the canonical record. We keep a copy server-side; you should keep yours too.",
      "Plan changes from us only apply on new sign-ups. Existing customers stay on their original terms unless they opt in.",
      "If we ever sell or restructure, your contract transfers with the same terms. We will not strip rights as part of a sale.",
      "If we sunset a feature, we either preserve it for legacy customers or give 12 months' notice + a one-click migration to the replacement.",
    ],
    links: [{ href: "/legal/terms", label: "Read the Terms of Service" }],
  },
  {
    no: 6,
    icon: Lock,
    shortTitle: "We never sell your audience.",
    title: "Your student list is yours. Full stop.",
    promise:
      "We do not sell, rent, license, or monetize your student or buyer data. We do not cross-promote your students into other creators' funnels. We do not profile your audience to sell ad-targeting. We do not train ad-revenue AI on their behavior.",
    inPractice: [
      "Student emails, phone numbers, course progress, and payment history stay scoped to your workspace.",
      "When you export your data (Article 3), every byte goes with you and nothing stays cached in our analytics pipeline.",
      "Aggregated, anonymized platform stats (e.g. \"X creators on the platform issued Y certificates this quarter\") may appear in marketing — never linked to your students or your courses by name without consent.",
      "GDPR + DPDP compliance handled by us, not you — see the Privacy Policy + DPA for the formal language.",
    ],
    links: [
      { href: "/legal/privacy", label: "Privacy Policy" },
      { href: "/legal/dpa", label: "Data Processing Addendum" },
    ],
  },
]

export default function FounderBillOfRightsPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_JSONLD) }}
      />
      <Header />
      <main className="flex-1">
        {/* Preamble */}
        <section className="border-b border-border bg-gradient-to-br from-primary/5 via-background to-accent/5">
          <div className="mx-auto max-w-3xl px-6 py-16 lg:px-8 lg:py-24">
            <Badge variant="outline" className="mb-4">
              <Sparkles className="mr-1 h-3 w-3" />
              The Founder Bill of Rights — v1
            </Badge>
            <h1 className="font-serif text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Six things we owe you,{" "}
              <span className="text-primary">in writing</span>.
            </h1>
            <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
              Public buyer reviews of incumbent creator platforms repeat the same five themes —
              hidden commission, refund-window theatre, data lock-in, broken lifetime deals, and
              platforms acting like the boss instead of the partner. We read every thread before
              we built. This page is what we&apos;ve committed to in response.
            </p>
            <p className="mt-3 text-sm text-muted-foreground">
              Each article links to the page that holds us accountable — refund policy, status
              page, privacy policy, the export tool itself. Print it, tape it to your monitor,
              hold us to every line.
            </p>
          </div>
        </section>

        {/* Quick-jump nav */}
        <section className="border-b border-border bg-card/40">
          <div className="mx-auto max-w-3xl px-6 py-6 lg:px-8">
            <ol className="grid gap-2 text-sm sm:grid-cols-2">
              {ARTICLES.map((a) => (
                <li key={a.no}>
                  <a
                    href={`#article-${a.no}`}
                    className="flex items-baseline gap-2 rounded-md px-2 py-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <span className="font-mono text-xs text-primary">{a.no.toString().padStart(2, "0")}</span>
                    <span>{a.shortTitle}</span>
                  </a>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* The articles */}
        {ARTICLES.map((a) => (
          <ArticleSection key={a.no} article={a} />
        ))}

        {/* Signature block */}
        <section className="border-y border-border bg-muted/30 py-16">
          <div className="mx-auto max-w-2xl px-6 text-center lg:px-8">
            <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Signature className="h-6 w-6" />
            </div>
            <h2 className="mt-4 font-serif text-2xl font-bold tracking-tight">
              Signed by us — and binding on us.
            </h2>
            <p className="mt-3 text-muted-foreground">
              This document is published under our company name, dated, and version-controlled
              in the same repository that builds the product. Future revisions will be
              announced via your workspace owner email at least 30 days before they take
              effect.
            </p>
            <p className="mt-6 font-serif text-base italic">
              — The Big Class team
              <br />
              <span className="text-sm text-muted-foreground">
                Dehradun, India · Version 1 · 2026
              </span>
            </p>
          </div>
        </section>

        {/* What this isn't */}
        <section className="border-b border-border py-16">
          <div className="mx-auto max-w-3xl px-6 lg:px-8">
            <h2 className="font-serif text-2xl font-bold tracking-tight">
              What this isn&apos;t
            </h2>
            <p className="mt-3 text-muted-foreground">
              This bill is a layered commitment on top of our standard{" "}
              <Link href="/legal/terms" className="font-medium text-primary hover:underline">
                Terms of Service
              </Link>
              ,{" "}
              <Link href="/legal/privacy" className="font-medium text-primary hover:underline">
                Privacy Policy
              </Link>
              , and{" "}
              <Link href="/legal/dpa" className="font-medium text-primary hover:underline">
                Data Processing Addendum
              </Link>
              . Where the bill is more generous to the customer (refund window, lifetime-deal
              guarantees, etc.) the bill applies. Where the legal documents add specific
              compliance language not covered here (GDPR, GST, lawful intercept), they apply
              alongside.
            </p>
            <p className="mt-3 text-muted-foreground">
              Nothing in this bill is intended as legal advice or an enforceable warranty
              outside what your jurisdiction&apos;s consumer-protection law already provides —
              but every commitment in it is taken seriously enough that we&apos;ve put it on a
              public, indexable page with a version number.
            </p>
          </div>
        </section>

        {/* Closing CTA */}
        <section className="py-20">
          <div className="mx-auto max-w-3xl px-6 text-center lg:px-8">
            <h2 className="font-serif text-3xl font-bold tracking-tight sm:text-4xl">
              Hold us to it.
            </h2>
            <p className="mt-3 text-muted-foreground">
              Sign up, try it, and the day you want to leave — export your workspace in one
              click. We&apos;d rather earn you again every renewal than trap you for one.
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <Button asChild size="lg">
                <Link href="/signup">
                  Start a workspace free
                  <ArrowRight className="ml-1.5 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/about">About the team behind this</Link>
              </Button>
            </div>
            <p className="mt-6 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <Mail className="h-3 w-3" />
              Found a gap or an unkept promise? Email{" "}
              <a
                href="mailto:hello@thebigclass.com"
                className="font-medium text-primary hover:underline"
              >
                hello@thebigclass.com
              </a>{" "}
              — we&apos;ll fix it within 7 days or publish why we can&apos;t.
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}

function ArticleSection({ article }: { article: Article }) {
  const Icon = article.icon
  return (
    <section
      id={`article-${article.no}`}
      className="scroll-mt-20 border-b border-border py-14"
    >
      <div className="mx-auto max-w-3xl px-6 lg:px-8">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
              Article {article.no.toString().padStart(2, "0")} — {article.shortTitle}
            </p>
            <h2 className="mt-1 font-serif text-2xl font-bold tracking-tight sm:text-3xl">
              {article.title}
            </h2>
          </div>
        </div>

        <p className="mt-5 text-lg leading-relaxed text-foreground/90">
          {article.promise}
        </p>

        <Card className="mt-6 border-primary/20 bg-primary/[0.03]">
          <CardContent className="space-y-2 p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">
              What this means in practice
            </p>
            <ul className="space-y-2 text-sm leading-relaxed">
              {article.inPractice.map((item, i) => (
                <li key={i} className="flex gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span className="text-foreground/85">{item}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {article.links.length > 0 && (
          <div className="mt-5 flex flex-wrap gap-2">
            {article.links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-foreground transition hover:border-primary/40 hover:bg-primary/5"
              >
                {l.label}
                <ArrowRight className="h-3 w-3" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

// Keep imports we use only as types/icons quiet.
// eslint-disable-next-line @typescript-eslint/no-unused-expressions
;[Building2]
