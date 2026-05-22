// Feature page — Doubts inbox + pre-sale enquiries.
//
// Targets buyers searching for creator-platform support that
// actually answers — the single most consistent complaint pattern
// across public buyer reviews of incumbent platforms is "pre-sale
// heaven, post-sale silence." Our wedge: in-course doubts +
// public-page enquiries land in the same inbox, with WhatsApp +
// email + in-app notifications.

import Link from "next/link"
import type { Metadata } from "next"
import {
  ArrowRight,
  CheckCircle2,
  Inbox,
  MessageCircleQuestion,
  Phone,
  Shield,
  Sparkles,
} from "lucide-react"
import { Header } from "@/components/landing/header"
import { Footer } from "@/components/landing/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

const SITE_URL = "https://thebigclass.com"
const PAGE_PATH = "/features/doubts"

export const metadata: Metadata = {
  title: "Student doubts inbox + pre-sale enquiries · The Big Class",
  description:
    "Catch student doubts and prospective-buyer enquiries in one inbox. WhatsApp + email + in-app notifications, rate-limited, audit-friendly. Built so 'post-sale silence' never happens here.",
  keywords: [
    "student doubts inbox",
    "course platform support",
    "creator platform support response time",
    "pre-sale enquiry form",
    "creator platform CRM",
    "WhatsApp student support",
    "course platform customer service alternative",
    "Q&A course platform",
  ],
  alternates: { canonical: `${SITE_URL}${PAGE_PATH}` },
  openGraph: {
    type: "website",
    url: `${SITE_URL}${PAGE_PATH}`,
    siteName: "The Big Class",
    title: "Questions in. Replies out.",
    description:
      "Student support + pre-sale leads in one inbox. WhatsApp + email + in-app, rate-limited, audit-friendly.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Doubts inbox — questions in, replies out",
    description: "Catch student doubts + pre-sale enquiries in one inbox.",
  },
}

const FAQ_JSONLD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Where do student questions go?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Into /dashboard/doubts. Both in-course questions (asked from the lesson player) and public pre-sale enquiries (asked from a course page) land in the same inbox. Pre-sale enquiries get an accent badge so leads stand out from support work.",
      },
    },
    {
      "@type": "Question",
      name: "How are teachers notified?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Three channels fire on every question: in-app notification to workspace owner + admins, email with replyTo set to the asker, and WhatsApp (queued through our notifications dispatcher; provider-pluggable). An acknowledgement email is sent to the asker too.",
      },
    },
    {
      "@type": "Question",
      name: "Is there rate limiting?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes — 3 questions per browser per course per 24 hours. The dialog shows a precise countdown when exhausted. It's a UX guardrail, not a security boundary; server-side limits layer on top.",
      },
    },
  ],
}

export default function DoubtsFeaturePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_JSONLD) }}
      />
      <Header />
      <main className="flex-1">
        <section className="border-b border-border bg-gradient-to-br from-primary/5 via-background to-accent/5">
          <div className="mx-auto max-w-5xl px-6 py-16 lg:px-8 lg:py-24">
            <Badge variant="outline" className="mb-4">
              <Inbox className="mr-1 h-3 w-3" />
              One inbox for support + leads
            </Badge>
            <h1 className="font-serif text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Questions in. <span className="text-primary">Replies out.</span>
            </h1>
            <p className="mt-5 max-w-3xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
              The most consistent complaint across hundreds of public buyer reviews of creator
              platforms is <em>&quot;pre-sale heaven, post-sale silence.&quot;</em> Questions sit
              unread for two or three days. We wired both ends — enrolled students inside lessons
              + prospective buyers on public pages — into the same inbox, with WhatsApp + email +
              in-app delivery.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/dashboard/doubts">
                  Open the inbox <ArrowRight className="ml-1.5 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/help/doubts-and-enquiries">Read the docs</Link>
              </Button>
            </div>
            <ul className="mt-8 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2 lg:grid-cols-4">
              <li className="inline-flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-success" /> One inbox, two doorways
              </li>
              <li className="inline-flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-success" /> WhatsApp + email + in-app
              </li>
              <li className="inline-flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-success" /> Rate-limited 3/24h
              </li>
              <li className="inline-flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-success" /> Sidebar badge for unread
              </li>
            </ul>
          </div>
        </section>

        <section className="border-b border-border py-16">
          <div className="mx-auto max-w-5xl px-6 lg:px-8">
            <h2 className="font-serif text-3xl font-bold tracking-tight">
              Two doorways, one inbox
            </h2>
            <p className="mt-3 max-w-3xl text-muted-foreground">
              Different visitors ask in different places. Both routes drop into the same teacher
              dashboard so nothing gets lost in a separate &quot;leads&quot; queue.
            </p>
            <div className="mt-8 grid gap-4 lg:grid-cols-2">
              <Card>
                <CardContent className="space-y-3 p-6">
                  <Badge variant="outline">Inside a lesson</Badge>
                  <h3 className="font-serif text-xl font-bold">For enrolled students</h3>
                  <p className="text-sm text-muted-foreground">
                    Two entry points — a quiet pill in the player chrome (&quot;Got a question?&quot;)
                    and a dashed &quot;Stuck on something?&quot; card right under the lesson
                    controls. Each doubt is auto-scoped to the current course + lesson.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="space-y-3 p-6">
                  <Badge variant="outline">Public course page</Badge>
                  <h3 className="font-serif text-xl font-bold">For prospective buyers</h3>
                  <p className="text-sm text-muted-foreground">
                    A prominent &quot;Email the teacher&quot; CTA on the hero of every public course
                    page. Captures name + email + WhatsApp + message; the asker doesn&apos;t need an
                    account to submit. Tagged &quot;Pre-sale&quot; in the inbox so it&apos;s
                    triaged distinctly from support.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section className="border-b border-border bg-muted/20 py-16">
          <div className="mx-auto max-w-5xl px-6 lg:px-8">
            <h2 className="font-serif text-3xl font-bold tracking-tight">
              What gets notified when a question lands
            </h2>
            <p className="mt-3 max-w-3xl text-muted-foreground">
              Every channel that&apos;s wired fires automatically. No setup required, no manual
              forwarding rules.
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Channel
                icon={<Inbox className="h-5 w-5 text-primary" />}
                title="In-app"
                body="Notification to the workspace owner + every admin. Sidebar badge bumps the unread count."
              />
              <Channel
                icon={<MessageCircleQuestion className="h-5 w-5 text-primary" />}
                title="Email"
                body="To the workspace owner with replyTo set to the asker — reply from your own inbox if you prefer."
              />
              <Channel
                icon={<Phone className="h-5 w-5 text-primary" />}
                title="WhatsApp"
                body="Queued through our notification dispatcher; production-ready, provider-pluggable."
              />
              <Channel
                icon={<Sparkles className="h-5 w-5 text-primary" />}
                title="Receipt"
                body="Acknowledgement email auto-sent to the asker. They know it landed somewhere real."
              />
            </div>
          </div>
        </section>

        <section className="border-b border-border py-16">
          <div className="mx-auto max-w-5xl px-6 lg:px-8">
            <h2 className="font-serif text-3xl font-bold tracking-tight">Why this matters</h2>
            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              <Card className="border-destructive/30 bg-destructive/5">
                <CardContent className="space-y-2 p-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-destructive">
                    Third-party analysis
                  </p>
                  <p className="font-serif text-lg leading-snug">
                    “Pre-sale heaven, post-sale silence — the single most consistent complaint
                    across 355 public reviews.”
                  </p>
                  <p className="text-xs text-muted-foreground">Independent platform-research report, 2026</p>
                </CardContent>
              </Card>
              <Card className="border-destructive/30 bg-destructive/5">
                <CardContent className="space-y-2 p-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-destructive">
                    Verified buyer review
                  </p>
                  <p className="font-serif text-lg leading-snug">
                    “Bad UI for premium customers — they don&apos;t reply for 2–3 days.”
                  </p>
                  <p className="text-xs text-muted-foreground">Public review site</p>
                </CardContent>
              </Card>
            </div>
            <Card className="mt-4">
              <CardContent className="space-y-2 p-5 text-sm">
                <p className="font-semibold">Our commitment</p>
                <ul className="ml-5 list-disc space-y-1 text-muted-foreground">
                  <li>Sub-2-hour response on P0 issues (auth, billing, data loss).</li>
                  <li>Sub-24-hour response on every other ticket.</li>
                  <li>
                    Public uptime dashboard so &quot;is it just me?&quot; is answerable without
                    a support thread.
                  </li>
                  <li>
                    <Shield className="mr-1 inline h-3.5 w-3.5" /> Refund policy on the page,
                    not buried in invoice fine print.
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="py-16">
          <div className="mx-auto max-w-3xl px-6 text-center lg:px-8">
            <h2 className="font-serif text-3xl font-bold tracking-tight">
              Build a brand learners trust
            </h2>
            <p className="mt-3 text-muted-foreground">
              The platform you sell on is half of the trust contract. Ours catches every
              question before it becomes a public bad review.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button asChild size="lg">
                <Link href="/dashboard/doubts">
                  See the inbox <ArrowRight className="ml-1.5 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/help/doubts-and-enquiries">Read the guide</Link>
              </Button>
            </div>
            <p className="mt-6 text-xs text-muted-foreground">
              See also:{" "}
              <Link href="/features/faculty" className="font-medium hover:underline">Faculty management</Link>
              {" · "}
              <Link href="/features/community" className="font-medium hover:underline">Community</Link>
              {" · "}
              <Link href="/features/whitelabel" className="font-medium hover:underline">White-label</Link>
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}

function Channel({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode
  title: string
  body: string
}) {
  return (
    <Card>
      <CardContent className="space-y-2 p-5">
        <div className="flex items-center gap-2">
          {icon}
          <p className="font-semibold">{title}</p>
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">{body}</p>
      </CardContent>
    </Card>
  )
}
