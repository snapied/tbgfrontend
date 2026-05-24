// Feature page — Faculty management.

import Link from "next/link"
import type { Metadata } from "next"
import {
  ArrowRight,
  CheckCircle2,
  Mail,
  ShieldCheck,
  Sparkles,
  Users,
  KeyRound,
  Layers,
} from "lucide-react"
import { Header } from "@/components/landing/header"
import { Footer } from "@/components/landing/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

const SITE_URL = "https://thebigclass.com"
const PAGE_PATH = "/features/faculty"

export const metadata: Metadata = {
  title: "Faculty management for course platforms · The Big Class",
  description:
    "Invite co-teachers + admins with a branded email, zxcvbn-validated passwords, and per-module course ownership. The same teacher works across multiple workspaces.",
  keywords: [
    "faculty management LMS",
    "multi-instructor course platform",
    "co-teaching course tool",
    "teacher invite flow",
    "team-of-teachers platform",
    "course platform admin roles",
    "zxcvbn password course platform",
    "multi-tenant teacher accounts",
  ],
  alternates: { canonical: `${SITE_URL}${PAGE_PATH}` },
  openGraph: {
    type: "website",
    url: `${SITE_URL}${PAGE_PATH}`,
    siteName: "The Big Class",
    title: "Teaching is a team sport",
    description:
      "Invite co-teachers, assign per-module owners, manage admins. Branded invites, strong passwords, multi-tenant teacher accounts.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Faculty management — invite, co-teach, secure",
    description: "Workspace-branded invites + zxcvbn passwords + per-module course owners.",
  },
}

const FAQ_JSONLD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Can a single course have multiple teachers?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. The primary owner stays the headline teacher (signs the certificate, shown in the hero), and you can add any number of co-instructors with full edit access. Modules can also have their own owners — Module 1 by Faculty A, Module 2 by Faculty B.",
      },
    },
    {
      "@type": "Question",
      name: "What does the invite email look like?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Workspace-branded — '<inviter> invited you to <workspace>'. The accept-invite link lands the recipient inside your branded portal (not the platform default), where they pick a password and land in the dashboard. The link is good for 7 days.",
      },
    },
    {
      "@type": "Question",
      name: "Can the same teacher work across multiple workspaces?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes — a teacher invited at workspace A and workspace B keeps a separate profile in each (different bio, colors, course list) but uses the same email identity. The invite UX surfaces this so admins aren't surprised when they see 'already on the platform'.",
      },
    },
  ],
}

export default function FacultyFeaturePage() {
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
              <Users className="mr-1 h-3 w-3" />
              Multi-instructor courses + admins
            </Badge>
            <h1 className="font-serif text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Teaching is a <span className="text-primary">team sport</span>.
            </h1>
            <p className="mt-5 max-w-3xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
              Solo-creator platforms force a single-instructor mental model on people who run real
              schools, agencies, and cohorts. We don&apos;t. Invite as many co-teachers and admins
              as you want, assign per-module owners, and let the same teacher work across multiple
              workspaces without creating duplicate accounts.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/dashboard/faculty">
                  Open Faculty <ArrowRight className="ml-1.5 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/help/faculty">Read the guide</Link>
              </Button>
            </div>
            <ul className="mt-8 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2 lg:grid-cols-4">
              <li className="inline-flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-success" /> Branded invite emails
              </li>
              <li className="inline-flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-success" /> Strong-password onboarding
              </li>
              <li className="inline-flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-success" /> Co-teach + per-module owners
              </li>
              <li className="inline-flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-success" /> Multi-tenant accounts
              </li>
            </ul>
          </div>
        </section>

        <section className="border-b border-border py-16">
          <div className="mx-auto max-w-5xl px-6 lg:px-8">
            <h2 className="font-serif text-3xl font-bold tracking-tight">
              An invite flow you can actually trust
            </h2>
            <p className="mt-3 max-w-3xl text-muted-foreground">
              Most platforms send a vague &quot;reset your password&quot; email when an admin invites a
              new teacher. We send a real invite email — workspace-branded, with the inviter&apos;s
              name, a 7-day link, and a clean accept-invite landing.
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Pillar
                icon={<Mail className="h-5 w-5 text-primary" />}
                title="Workspace-branded email"
                body="Subject reads '<inviter> invited you to <workspace>'. The CTA lands on your tenant's branded accept-invite page, not the platform default."
              />
              <Pillar
                icon={<ShieldCheck className="h-5 w-5 text-primary" />}
                title="Strong by default"
                body="Passwords scored by dropbox/zxcvbn — minimum 'good' (3/4). Passwords containing the invitee's name, email, or workspace name score lower; generator output passes immediately."
              />
              <Pillar
                icon={<KeyRound className="h-5 w-5 text-primary" />}
                title="Tenant-scoped tokens"
                body="Invite tokens carry the workspace slug in a signed claim. A token issued for workspace A can't be used inside workspace B — even if someone swaps the URL slug."
              />
              <Pillar
                icon={<Users className="h-5 w-5 text-primary" />}
                title="Co-instructors"
                body="Add any number of co-teachers to a course. The primary owner stays the headline teacher; co-instructors get full edit access. Toggle from a chip rail on the course's Curriculum tab."
              />
              <Pillar
                icon={<Layers className="h-5 w-5 text-primary" />}
                title="Per-module ownership"
                body="Module 1 owned by Faculty A, Module 2 by Faculty B. Each module gets its own optional owner; the page falls back to the course owner when not set."
              />
              <Pillar
                icon={<Sparkles className="h-5 w-5 text-primary" />}
                title="Multi-tenant teachers"
                body="The same teacher can be a faculty member at multiple workspaces. We don't create duplicate accounts — we link by email and keep each workspace's profile separate."
              />
            </div>
          </div>
        </section>

        <section className="border-b border-border bg-muted/20 py-16">
          <div className="mx-auto max-w-5xl px-6 lg:px-8">
            <h2 className="font-serif text-3xl font-bold tracking-tight">
              Profiles that look good on the public site
            </h2>
            <p className="mt-3 max-w-3xl text-muted-foreground">
              The fields you collect on the faculty form render straight onto the public
              instructor card on every course they teach, plus the{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">/instructors</code>{" "}
              showcase page. No separate &quot;public profile&quot; data model to maintain.
            </p>
            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              <Card>
                <CardContent className="space-y-2 p-5">
                  <p className="font-semibold">Core identity</p>
                  <ul className="ml-5 list-disc space-y-1 text-sm text-muted-foreground">
                    <li>Full name + email (locked after invite)</li>
                    <li>WhatsApp number (required, E.164 validated)</li>
                    <li>Role — instructor or admin</li>
                    <li>Avatar + cover image</li>
                    <li>Short bio</li>
                  </ul>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="space-y-2 p-5">
                  <p className="font-semibold">Online presence (optional)</p>
                  <ul className="ml-5 list-disc space-y-1 text-sm text-muted-foreground">
                    <li>Personal website / portfolio</li>
                    <li>LinkedIn</li>
                    <li>X / Twitter</li>
                    <li>Instagram</li>
                    <li>YouTube</li>
                    <li>GitHub</li>
                  </ul>
                  <p className="mt-3 text-xs text-muted-foreground">
                    All links rendered with rel=&quot;nofollow noopener noreferrer&quot; on
                    public pages.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section className="border-b border-border py-16">
          <div className="mx-auto max-w-5xl px-6 lg:px-8">
            <h2 className="font-serif text-3xl font-bold tracking-tight">
              90-second onboarding for new teachers
            </h2>
            <ol className="mt-6 space-y-3 text-sm">
              <Step n={1}>
                Admin opens <Link href="/dashboard/faculty" className="font-medium text-primary hover:underline">/dashboard/faculty</Link>{" "}
                and fills the form. We send a workspace-branded email.
              </Step>
              <Step n={2}>
                Recipient clicks the link, lands inside <em>your</em> branded portal at{" "}
                <code className="rounded bg-muted px-1 font-mono text-[11px]">/p/&lt;tenant&gt;/accept-invite</code>.
              </Step>
              <Step n={3}>
                They pick a password (zxcvbn-validated). The strength meter gives live feedback
                until they hit &apos;good&apos; or better.
              </Step>
              <Step n={4}>
                We provision the user in your workspace and sign them in. Instructors + admins land
                on <code className="rounded bg-muted px-1 font-mono text-[11px]">/dashboard</code>;
                students land on <code className="rounded bg-muted px-1 font-mono text-[11px]">/p/&lt;tenant&gt;</code>.
              </Step>
            </ol>
          </div>
        </section>

        <section className="py-16">
          <div className="mx-auto max-w-3xl px-6 text-center lg:px-8">
            <h2 className="font-serif text-3xl font-bold tracking-tight">
              Build a teaching team
            </h2>
            <p className="mt-3 text-muted-foreground">
              No per-seat charges hidden in fine print. Invite as many co-teachers as your
              workspace needs.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button asChild size="lg">
                <Link href="/dashboard/faculty">
                  Invite your first teacher <ArrowRight className="ml-1.5 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/help/faculty">Faculty guide</Link>
              </Button>
            </div>
            <p className="mt-6 text-xs text-muted-foreground">
              See also:{" "}
              <Link href="/help/multi-faculty-courses" className="font-medium hover:underline">Multi-faculty courses</Link>
              {" · "}
              <Link href="/help/onboarding-new-faculty" className="font-medium hover:underline">Onboarding new faculty</Link>
              {" · "}
              <Link href="/help/per-tenant-login-pages" className="font-medium hover:underline">Per-tenant login pages</Link>
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}

function Pillar({
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

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
        {n}
      </span>
      <div className="min-w-0 flex-1 text-muted-foreground">{children}</div>
    </li>
  )
}
