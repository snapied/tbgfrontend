// Feature page — API & integrations.
//
// SEO surface for the "we ship an actual API" wedge. Three jobs:
//   1. Rank for "creator platform API" + tail variants ("LMS REST
//      API India", "course-platform webhooks").
//   2. Land a real read on the value prop in under 10 seconds —
//      the hero + chip rail does that.
//   3. Route motivated visitors into the deep docs at /developers
//      (which is where the contract actually lives).

import Link from "next/link"
import type { Metadata } from "next"
import {
  ArrowRight,
  Code2,
  KeyRound,
  ShieldCheck,
  Zap,
  CheckCircle2,
  Terminal,
  Webhook,
  Layers,
} from "lucide-react"
import { Header } from "@/components/landing/header"
import { Footer } from "@/components/landing/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

const SITE_URL = "https://thebigclass.com"
const PAGE_PATH = "/features/api"

export const metadata: Metadata = {
  title: "API & integrations for creator platforms · The Big Class",
  description:
    "An open, scoped REST API for course creators — generate a key, hit /api/v1, build your integration in 5 minutes. Rate-limited, versioned, free on every plan.",
  keywords: [
    "creator platform API",
    "course platform API",
    "open creator platform API",
    "LMS REST API",
    "teaching platform integrations",
    "education API India",
    "Zapier course platform",
    "course platform webhooks",
  ],
  alternates: { canonical: `${SITE_URL}${PAGE_PATH}` },
  openGraph: {
    type: "website",
    url: `${SITE_URL}${PAGE_PATH}`,
    siteName: "The Big Class",
    title: "An API that exists, is documented, and works",
    description:
      "Scoped REST keys, transparent rate limits, versioned endpoints. Free on every plan. The honest creator-platform API your stack actually needs.",
  },
  twitter: {
    card: "summary_large_image",
    title: "An API that exists, is documented, and works",
    description:
      "Scoped REST keys, rate limits, versioned endpoints, free on every plan.",
  },
}

// FAQ structured data — surfaces in Google's rich results when
// the page ranks. Picks the three questions a buyer actually
// types into search ("does X have an API?", "rate limits?",
// "how do I authenticate?"). Keep answers short + factual.
const FAQ_JSONLD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Does The Big Class have a public API?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes — a versioned REST API at /api/v1/ with scoped bearer tokens. Generate a key in /dashboard/developer; the full secret is shown once on creation. Free on every plan.",
      },
    },
    {
      "@type": "Question",
      name: "What are the API rate limits?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "60 requests per minute and 1,000 per day per key. Every response carries X-RateLimit-Limit / Remaining / Reset headers so clients can back off proactively. 429 responses include Retry-After.",
      },
    },
    {
      "@type": "Question",
      name: "How do I authenticate API requests?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Pass your key as a Bearer token: `Authorization: Bearer tbc_…`. Keys are scoped — grant only what an integration needs. Revoke any key from the developer console; no support ticket required.",
      },
    },
  ],
}

export default function ApiFeaturePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_JSONLD) }}
      />
      <Header />
      <main className="flex-1">
        {/* Hero — load-bearing for first-paint comprehension. The
            H1 carries the differentiator ("exists, is documented");
            the lede grounds it in real competitor pain. */}
        <section className="border-b border-border bg-gradient-to-br from-primary/5 via-background to-accent/5">
          <div className="mx-auto max-w-5xl px-6 py-16 lg:px-8 lg:py-24">
            <Badge variant="outline" className="mb-4">
              <Code2 className="mr-1 h-3 w-3" />
              Free on every plan
            </Badge>
            <h1 className="font-serif text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              An API for creators that{" "}
              <span className="text-primary">actually exists</span>.
            </h1>
            <p className="mt-5 max-w-3xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
              The most-cited line in public reviews of incumbent creator platforms is the same
              three words: <em>&quot;No API available.&quot;</em> The ones that do ship webhooks
              are notorious for fields that silently don&apos;t fire. We took the opposite bet —
              our REST API is public, scoped, rate-limited, versioned, and documented on a page
              you can ctrl-F through. Generate a key, build your integration in five minutes.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/developers">
                  Open the docs <ArrowRight className="ml-1.5 h-4 w-4" />
                </Link>
              </Button>
              {/* Auth-gated destination — `/dashboard/developer` redirects
                  unauthenticated visitors to /login, which now honours
                  the `?next=` param and bounces them back here after
                  sign-in. New visitors can click "Register" from the
                  login page. AuthRedirectGate on login keeps signed-in
                  teachers from ever seeing the form. */}
              <Button variant="outline" size="lg" asChild>
                <Link href="/login?next=%2Fdashboard%2Fdeveloper">
                  <KeyRound className="mr-2 h-4 w-4" />
                  Get an API key
                </Link>
              </Button>
            </div>
            {/* Mini-checks — quick visual reassurance under the CTAs. */}
            <ul className="mt-8 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2 lg:grid-cols-4">
              <li className="inline-flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-success" /> Versioned (`/api/v1`)
              </li>
              <li className="inline-flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-success" /> Scoped bearer tokens
              </li>
              <li className="inline-flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-success" /> Public rate limits
              </li>
              <li className="inline-flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-success" /> No commission, no surprise fees
              </li>
            </ul>
          </div>
        </section>

        {/* What you get — three pillars + supporting text. The
            three pillars also map to long-tail SEO keywords
            ("scoped API tokens", "API rate limit headers", "REST
            versioning") so the page ranks for buyers who type a
            specific concern. */}
        <section className="border-b border-border py-16">
          <div className="mx-auto max-w-5xl px-6 lg:px-8">
            <h2 className="font-serif text-3xl font-bold tracking-tight">
              Built like every API you already trust
            </h2>
            <p className="mt-3 max-w-3xl text-muted-foreground">
              We didn&apos;t reinvent auth, error envelopes, or pagination — we matched what
              Stripe, GitHub, and Linear already taught your engineers. Less to learn, more to
              ship.
            </p>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Pillar
                icon={<ShieldCheck className="h-5 w-5 text-primary" />}
                title="Scoped bearer tokens"
                body="Six scopes (read:courses, read:students, write:enrollments, …). Grant only what an integration needs. Revoke from the dashboard anytime."
              />
              <Pillar
                icon={<Zap className="h-5 w-5 text-primary" />}
                title="Transparent rate limits"
                body="60 req/min and 1,000 req/day per key. X-RateLimit-* headers on every response so your client can throttle before tripping a 429."
              />
              <Pillar
                icon={<Layers className="h-5 w-5 text-primary" />}
                title="Versioned + stable"
                body="All endpoints under /api/v1/. Breaking changes ship under /v2 with a 6-month deprecation window. Your integration won't break overnight."
              />
              <Pillar
                icon={<Terminal className="h-5 w-5 text-primary" />}
                title="Standard envelopes"
                body="Lists return { data, pagination }. Errors return { error: { code, message } }. Cursors, not page numbers. JSON only — no XML legacy."
              />
              <Pillar
                icon={<Webhook className="h-5 w-5 text-primary" />}
                title="Webhooks that fire"
                body="HMAC-signed events with retries + a dead-letter queue you can replay. Built because the most-cited webhook complaint about incumbent platforms is events that silently drop."
                soon
              />
              <Pillar
                icon={<KeyRound className="h-5 w-5 text-primary" />}
                title="One-time secret reveal"
                body="The full key is shown exactly once on creation — same pattern Stripe + GitHub use. We never store plaintext. Lost it? Revoke and reissue."
              />
            </div>
          </div>
        </section>

        {/* Five-minute integration — concrete code sample. SEO
            loves a real curl on this kind of page; integrators
            love it more. */}
        <section className="border-b border-border bg-muted/20 py-16">
          <div className="mx-auto max-w-5xl px-6 lg:px-8">
            <div className="grid gap-10 lg:grid-cols-[1.1fr_1fr] lg:items-center">
              <div>
                <h2 className="font-serif text-3xl font-bold tracking-tight">
                  Five-minute integration
                </h2>
                <p className="mt-3 text-muted-foreground">
                  Generate a key, hit the courses endpoint, read the rate-limit headers, ship.
                  No sales call. No demo required.
                </p>
                <ol className="mt-6 space-y-3 text-sm">
                  <Step n={1}>
                    Open <Link href="/dashboard/developer" className="font-medium text-primary hover:underline">/dashboard/developer</Link>{" "}
                    in your workspace. Click <em>New API key</em>.
                  </Step>
                  <Step n={2}>
                    Pick scopes, give the key a memorable name, generate. Copy the secret right
                    away — you only see it once.
                  </Step>
                  <Step n={3}>
                    Call the API. The example to the right hits a live endpoint and pages courses.
                  </Step>
                  <Step n={4}>
                    Read{" "}
                    <code className="rounded bg-muted px-1 text-[11px]">X-RateLimit-Remaining</code>{" "}
                    on every response and back off proactively when it gets low.
                  </Step>
                </ol>
              </div>
              <Card>
                <CardContent className="p-0">
                  <div className="border-b border-border bg-muted/40 px-4 py-2 text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
                    Terminal · curl
                  </div>
                  <pre className="overflow-x-auto p-4 font-mono text-xs leading-relaxed">{`# List published courses (cursor-paginated)
curl https://thebigclass.com/api/v1/courses \\
  -H "Authorization: Bearer tbc_YOUR_SECRET_HERE"

# Response (truncated)
HTTP/1.1 200 OK
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 59
X-RateLimit-Reset: 1715990400
Content-Type: application/json

{
  "data": [
    { "id": "course-…", "slug": "react-bootcamp", "title": "…" }
  ],
  "pagination": { "cursor": null, "has_more": false }
}`}</pre>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Endpoints summary — top-of-funnel slice; the canonical
            list lives at /developers. Helps SEO surface the named
            endpoints buyers search for. */}
        <section className="border-b border-border py-16">
          <div className="mx-auto max-w-5xl px-6 lg:px-8">
            <h2 className="font-serif text-3xl font-bold tracking-tight">
              Endpoints you can call today
            </h2>
            <p className="mt-3 max-w-3xl text-muted-foreground">
              First flagship endpoint is live; the rest of the v1 catalogue ships on a public
              roadmap.{" "}
              <Link href="/developers#endpoints" className="font-medium text-primary hover:underline">
                See the full catalogue →
              </Link>
            </p>
            <ul className="mt-6 grid gap-2 text-sm sm:grid-cols-2">
              {[
                ["GET", "/api/v1/courses", "List + paginate published courses", true],
                ["GET", "/api/v1/courses/{id}", "Fetch a course with modules + lessons", false],
                ["GET", "/api/v1/students", "List students with progress + enrolment", false],
                ["POST", "/api/v1/students", "Sync a CRM lead into a student record", false],
                ["GET", "/api/v1/orders", "Receipt + entitlement history", false],
                ["POST", "/api/v1/enrollments", "Idempotent enrol on (studentId, courseId)", false],
              ].map(([method, path, summary, live]) => (
                <li
                  // Path alone isn't unique — GET + POST on the same
                  // resource (e.g. /api/v1/students) share it. Method
                  // + path is the actual REST identity.
                  key={`${String(method)} ${String(path)}`}
                  className="flex items-start gap-3 rounded-md border border-border bg-card p-3"
                >
                  <Badge
                    variant="outline"
                    className={
                      method === "GET"
                        ? "border-primary/40 font-mono text-[10px] text-primary"
                        : "border-accent/40 font-mono text-[10px] text-accent"
                    }
                  >
                    {String(method)}
                  </Badge>
                  <div className="min-w-0 flex-1">
                    <code className="block font-mono text-xs">{String(path)}</code>
                    <p className="mt-0.5 text-xs text-muted-foreground">{String(summary)}</p>
                  </div>
                  {live ? (
                    <Badge className="bg-success/15 text-[10px] text-success">Live</Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px]">Roadmap</Badge>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Wedge — direct comparison. The competitive teardown
            quotes are the single biggest reason a buyer evaluates
            us; surfacing them on the API page itself converts
            comparison traffic. */}
        <section className="border-b border-border py-16">
          <div className="mx-auto max-w-5xl px-6 lg:px-8">
            <h2 className="font-serif text-3xl font-bold tracking-tight">
              Why this matters
            </h2>
            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              <Card className="border-destructive/30 bg-destructive/5">
                <CardContent className="space-y-2 p-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-destructive">
                    Verified buyer review
                  </p>
                  <p className="font-serif text-lg leading-snug">“No API available.”</p>
                  <p className="text-xs text-muted-foreground">Public review site, 2025</p>
                </CardContent>
              </Card>
              <Card className="border-destructive/30 bg-destructive/5">
                <CardContent className="space-y-2 p-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-destructive">
                    Verified buyer review
                  </p>
                  <p className="font-serif text-lg leading-snug">
                    “Webhook integration fields not being captured / triggers not firing.”
                  </p>
                  <p className="text-xs text-muted-foreground">Public feedback portal</p>
                </CardContent>
              </Card>
            </div>
            <p className="mt-6 text-sm text-muted-foreground">
              We read every public complaint thread about creator-platform APIs. Our API + webhook
              contract was built specifically to close the gaps that show up over and over.
            </p>
          </div>
        </section>

        {/* Footer CTA + cross-links — every feature page should
            route back into deeper docs + adjacent surfaces.
            Internal linking is the cheapest SEO win there is. */}
        <section className="py-16">
          <div className="mx-auto max-w-3xl px-6 text-center lg:px-8">
            <h2 className="font-serif text-3xl font-bold tracking-tight">
              Ship something today
            </h2>
            <p className="mt-3 text-muted-foreground">
              Generate a key, hit your first endpoint in five minutes. Tell us if anything&apos;s
              missing — every endpoint here was built because a creator asked for it.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button asChild size="lg">
                <Link href="/dashboard/developer">
                  <KeyRound className="mr-2 h-4 w-4" />
                  Get an API key
                </Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <Link href="/developers">Full developer docs</Link>
              </Button>
            </div>
            <p className="mt-6 text-xs text-muted-foreground">
              See also:{" "}
              <Link href="/help/api-keys" className="font-medium hover:underline">API keys guide</Link>
              {" · "}
              <Link href="/help/rate-limits" className="font-medium hover:underline">Rate limit headers</Link>
              {" · "}
              <Link href="/help/webhooks" className="font-medium hover:underline">Webhooks (roadmap)</Link>
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
  soon,
}: {
  icon: React.ReactNode
  title: string
  body: string
  soon?: boolean
}) {
  return (
    <Card>
      <CardContent className="space-y-2 p-5">
        <div className="flex items-center gap-2">
          {icon}
          <p className="font-semibold">{title}</p>
          {soon && (
            <Badge variant="outline" className="text-[10px]">
              Soon
            </Badge>
          )}
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
