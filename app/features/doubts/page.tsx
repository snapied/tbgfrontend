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

        {/* Indian-classroom scenarios — when "post-sale silence" hits
            an Indian student or parent, the platform breaks the
            parent-trust contract that took months to build. Showing
            the three most painful cases puts the feature in the
            language coaching centres actually live in. */}
        <section className="border-b border-border bg-background py-16">
          <div className="mx-auto max-w-6xl px-6 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-xs font-bold uppercase tracking-wider text-primary">
                In an Indian classroom
              </p>
              <h2 className="mt-3 font-serif text-3xl font-bold tracking-tight">
                When the inbox is the difference between renewal and refund.
              </h2>
            </div>
            <div className="mt-10 grid gap-4 lg:grid-cols-3">
              <DoubtScenario
                emoji="🌙"
                title="Late-night JEE doubt"
                quote="&ldquo;Student stuck on a coordinate-geometry problem at 10:47 pm. Opens the lesson, taps 'Got a question?', WhatsApp pings me at home, I screenshot the solution from my notebook, reply from the inbox. Done in 9 minutes. Parents notice.&rdquo;"
                wedge="WhatsApp notification + reply from inbox without opening a separate app"
              />
              <DoubtScenario
                emoji="🤝"
                title="Pre-sale parent enquiry"
                quote="&ldquo;Mother visits the public course page Saturday afternoon — taps 'Email the teacher', asks about syllabus + timing. Lands tagged 'Pre-sale' in the inbox with a green border. I reply Sunday morning. Sells the seat.&rdquo;"
                wedge="Pre-sale vs in-course tagging so leads never sit behind support queue"
              />
              <DoubtScenario
                emoji="📝"
                title="NEET batch — chapter close"
                quote="&ldquo;After every Biology class, 8-10 doubts hit at once. Same inbox catches in-app, email, and WhatsApp. Bulk-reply to recurring questions; the rare one gets a 5-minute screen-recording reply inline.&rdquo;"
                wedge="One inbox, three channels — never bounce between tools mid-reply"
              />
            </div>
          </div>
        </section>

        {/* Direct alternatives — Indian coaching centres usually
            compare against WhatsApp groups, Telegram channels, or
            Google Forms. Naming them explicitly answers the actual
            question instead of the abstract one. */}
        <section className="border-b border-border bg-muted/30 py-16">
          <div className="mx-auto max-w-5xl px-6 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-xs font-bold uppercase tracking-wider text-primary">
                vs. the alternatives
              </p>
              <h2 className="mt-3 font-serif text-3xl font-bold tracking-tight">
                Why coaching centres stop running support from WhatsApp groups.
              </h2>
            </div>
            <div className="mx-auto mt-10 grid max-w-3xl gap-3">
              <CompRow
                rival="A messaging group"
                problem="Every doubt buried under 200 'good morning' messages. No course context, no audit trail, no second-instructor handoff."
                ours="Each doubt tagged with course + lesson. Threaded reply. Other admins see the thread without you forwarding."
              />
              <CompRow
                rival="A generic form tool"
                problem="Submissions land in a spreadsheet you check on Tuesday. Student gets no acknowledgement. Lead aging silently."
                ours="Acknowledgement email auto-fires. In-app + email + WhatsApp ping. Sidebar badge so you can't miss it."
              />
              <CompRow
                rival="A built-in platform support inbox"
                problem="One generic support@ inbox. Doesn't distinguish in-course doubts from pre-sale enquiries. No WhatsApp delivery."
                ours="Two doorways, one inbox. Pre-sale and support visually separated. WhatsApp native, not bolted on."
              />
              <CompRow
                rival="A broadcast channel"
                problem="One-way broadcast. Students DM you privately; the next admin has zero visibility into the thread."
                ours="Inbox is shared workspace state. Any admin sees + replies. Audit-friendly for parent escalations."
              />
            </div>
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

function DoubtScenario({
  emoji, title, quote, wedge,
}: { emoji: string; title: string; quote: string; wedge: string }) {
  return (
    <div className="flex h-full flex-col rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <span aria-hidden className="text-2xl">{emoji}</span>
        <h3 className="font-serif text-base font-bold">{title}</h3>
      </div>
      <p className="mt-3 text-sm italic leading-relaxed text-muted-foreground">{quote}</p>
      <div className="mt-auto pt-4">
        <p className="text-[10px] font-bold uppercase tracking-wider text-primary">The wedge</p>
        <p className="mt-1 text-xs leading-relaxed">{wedge}</p>
      </div>
    </div>
  )
}

function CompRow({ rival, problem, ours }: { rival: string; problem: string; ours: string }) {
  return (
    <div className="grid gap-3 rounded-xl border border-border bg-card p-4 sm:grid-cols-[170px_1fr_1fr]">
      <div className="flex items-center">
        <span className="text-sm font-bold">{rival}</span>
      </div>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-destructive">What hurts</p>
        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{problem}</p>
      </div>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-success">The Big Class</p>
        <p className="mt-0.5 text-xs leading-relaxed">{ours}</p>
      </div>
    </div>
  )
}
