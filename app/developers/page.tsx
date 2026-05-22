// Public developer landing page.
//
// Listed in the marketing footer; this is where prospective
// integrators learn what the API can do, how auth works, what
// the rate limits are, and which endpoints exist today.
//
// Two audiences:
//   1. Builders evaluating "can I integrate this?" — they need
//      the endpoint catalogue + auth shape on one page they can
//      ctrl-F through.
//   2. Existing creators who clicked the dashboard link — they
//      need the "where do I get a key + what scopes do I need"
//      story explicit.
//
// We don't render this inside the marketing /(landing) shell
// because that shell carries product-tour scaffolding the dev
// audience doesn't need. Self-contained with the platform Header
// and Footer.

import Link from "next/link"
import type { Metadata } from "next"
import {
  ArrowRight,
  CheckCircle2,
  Code2,
  Key,
  ShieldCheck,
  Terminal,
  Zap,
} from "lucide-react"
import { Header } from "@/components/landing/header"
import { Footer } from "@/components/landing/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export const metadata: Metadata = {
  title: "API & integrations · The Big Class",
  description:
    "Open, scoped REST API for the platform. Generate a key in your dashboard and start integrating in minutes — students, courses, orders, enrollments. Rate-limited, versioned, documented.",
}

// Source of truth for the endpoint table. Adding a new endpoint
// means a single entry here + a corresponding /api/v1/... route.
// Keep the order stable (read first, then write) so the page
// reads top-to-bottom like a setup guide.
const ENDPOINTS = [
  {
    method: "GET",
    path: "/api/v1/courses",
    summary: "List published courses with pagination.",
    scope: "read:courses",
    status: "live" as const,
  },
  {
    method: "GET",
    path: "/api/v1/courses/{id}",
    summary: "Fetch a single course, including modules + lessons metadata.",
    scope: "read:courses",
    status: "live" as const,
  },
  {
    method: "GET",
    path: "/api/v1/students",
    summary: "List students with progress + enrolment history.",
    scope: "read:students",
    status: "live" as const,
  },
  {
    method: "POST",
    path: "/api/v1/students",
    summary: "Create a student. Used by external CRMs syncing leads.",
    scope: "write:students",
    status: "live" as const,
  },
  {
    method: "GET",
    path: "/api/v1/orders",
    summary: "Receipt + entitlement history for analytics dashboards.",
    scope: "read:orders",
    status: "live" as const,
  },
  {
    method: "POST",
    path: "/api/v1/enrollments",
    summary: "Enrol a student in a course. Idempotent on (studentId, courseId).",
    scope: "write:enrollments",
    status: "live" as const,
  },
  {
    method: "GET",
    path: "/api/v1/analytics/summary",
    summary: "Aggregate revenue + completion metrics over a window.",
    scope: "read:analytics",
    status: "live" as const,
  },
] as const

export default function DevelopersPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        {/* Hero */}
        <section className="border-b border-border bg-gradient-to-br from-primary/5 via-background to-accent/5">
          <div className="mx-auto max-w-5xl px-6 py-16 lg:px-8">
            <Badge variant="outline" className="mb-4">
              <Code2 className="mr-1 h-3 w-3" />
              v1 — Public REST API
            </Badge>
            <h1 className="font-serif text-4xl font-bold tracking-tight sm:text-5xl">
              An honest API for creators.
            </h1>
            <p className="mt-4 max-w-3xl text-lg text-muted-foreground">
              Most creator platforms either don&apos;t ship an API or hide it behind a sales call.
              Ours is right here: scoped tokens, transparent rate limits, versioned endpoints, and
              docs you can ctrl-F through. Generate a key in your dashboard and you&apos;re
              integrating in five minutes.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild>
                <Link href="/dashboard/developer">
                  <Key className="mr-2 h-4 w-4" />
                  Generate your first key
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <a href="#endpoints">
                  See endpoints <ArrowRight className="ml-1.5 h-4 w-4" />
                </a>
              </Button>
            </div>
          </div>
        </section>

        {/* Quick principles */}
        <section className="border-b border-border py-12">
          <div className="mx-auto max-w-5xl px-6 lg:px-8">
            <h2 className="font-serif text-2xl font-bold tracking-tight">What you get</h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Principle
                icon={<ShieldCheck className="h-5 w-5 text-primary" />}
                title="Scoped bearer tokens"
                body="Every key is scoped: read:courses, read:students, write:enrollments, etc. Grant only what the integration needs. Revocable anytime, no support ticket."
              />
              <Principle
                icon={<Zap className="h-5 w-5 text-primary" />}
                title="Predictable rate limits"
                body="60 req/min, 1,000 req/day per key on every tier. Every response carries X-RateLimit-* headers so your client can throttle proactively."
              />
              <Principle
                icon={<Code2 className="h-5 w-5 text-primary" />}
                title="Versioned + stable"
                body="All endpoints live under /api/v1/. Breaking changes ship under /v2 with a 6-month deprecation window for v1. You won't wake up to a broken integration."
              />
              <Principle
                icon={<Terminal className="h-5 w-5 text-primary" />}
                title="Standard envelopes"
                body="Lists return { data, pagination }. Errors return { error: { code, message } }. Cursors not page numbers. JSON only — no XML legacy."
              />
              <Principle
                icon={<CheckCircle2 className="h-5 w-5 text-primary" />}
                title="Open source on the wedge"
                body={`Our data-export tooling, webhook receivers, and these endpoint contracts are MIT-licensed. Fork the contract; you don't have to fork the platform.`}
              />
              <Principle
                icon={<Key className="h-5 w-5 text-primary" />}
                title="One-time secret reveal"
                body="The full secret is shown exactly once on creation — same pattern Stripe and GitHub use. We never store plaintext; lose it and you revoke + reissue."
              />
            </div>
          </div>
        </section>

        {/* Quickstart */}
        <section className="border-b border-border py-12">
          <div className="mx-auto max-w-5xl px-6 lg:px-8">
            <h2 className="font-serif text-2xl font-bold tracking-tight">Quickstart</h2>
            <ol className="mt-6 space-y-4">
              <Step
                n={1}
                title="Generate a key"
                body={
                  <>
                    Open <Link href="/dashboard/developer" className="font-medium text-primary hover:underline">/dashboard/developer</Link>{" "}
                    in your workspace and click <em>New API key</em>. Pick scopes, name the key, hit
                    Generate. Copy the secret immediately — you only see it once.
                  </>
                }
              />
              <Step
                n={2}
                title="Make your first call"
                body={
                  <>
                    Pass the key as a bearer token. Example:
                    <pre className="mt-2 overflow-x-auto rounded-md bg-muted p-3 font-mono text-xs">
                      {`curl https://thebigclass.com/api/v1/courses \\
  -H "Authorization: Bearer tbc_YOUR_SECRET_HERE"`}
                    </pre>
                  </>
                }
              />
              <Step
                n={3}
                title="Read the rate-limit headers"
                body={
                  <>
                    Every response includes <code className="rounded bg-muted px-1 text-[11px]">X-RateLimit-Remaining</code>{" "}
                    and <code className="rounded bg-muted px-1 text-[11px]">X-RateLimit-Reset</code>.
                    Back off when you see &lt; 5 remaining; otherwise you&apos;ll trip a 429 with a
                    <code className="rounded bg-muted px-1 text-[11px]">Retry-After</code> header.
                  </>
                }
              />
              <Step
                n={4}
                title="Production checklist"
                body={
                  <>
                    Store secrets in a real secret manager (1Password, Vault, AWS SM). Rotate every
                    90 days. Never embed a key in client-side bundles or mobile apps — those should
                    proxy through your backend, which holds the key.
                  </>
                }
              />
            </ol>
          </div>
        </section>

        {/* Endpoints */}
        <section id="endpoints" className="border-b border-border py-12">
          <div className="mx-auto max-w-5xl px-6 lg:px-8">
            <h2 className="font-serif text-2xl font-bold tracking-tight">Endpoints</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Every endpoint enforces its listed scope. Methods are case-sensitive.
            </p>
            <Card className="mt-6 overflow-hidden p-0">
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-4 py-2 font-semibold">Method</th>
                      <th className="px-4 py-2 font-semibold">Path</th>
                      <th className="px-4 py-2 font-semibold">Scope</th>
                      <th className="px-4 py-2 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {ENDPOINTS.map((e) => (
                      <tr key={e.path + e.method}>
                        <td className="px-4 py-3 font-mono text-xs">
                          <Badge
                            variant="outline"
                            className={
                              e.method === "GET"
                                ? "border-primary/40 text-primary"
                                : "border-accent/40 text-accent"
                            }
                          >
                            {e.method}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <code className="font-mono text-xs">{e.path}</code>
                          <p className="mt-0.5 text-xs text-muted-foreground">{e.summary}</p>
                        </td>
                        <td className="px-4 py-3">
                          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px]">
                            {e.scope}
                          </code>
                        </td>
                        <td className="px-4 py-3 text-xs">
                          {e.status === "live" ? (
                            <Badge className="bg-success/15 text-success">Live</Badge>
                          ) : (
                            <Badge variant="outline">Roadmap</Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Webhooks */}
        <section id="webhooks" className="border-b border-border py-12">
          <div className="mx-auto max-w-5xl px-6 lg:px-8">
            <h2 className="font-serif text-2xl font-bold tracking-tight">Webhooks</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              We POST a signed JSON payload to your URL every time
              something happens in your workspace — student created,
              order paid, recording ready, etc. Subscribe in{" "}
              <Link href="/dashboard/developer/webhooks" className="font-medium text-primary hover:underline">
                /dashboard/developer/webhooks
              </Link>
              .
            </p>

            <div className="mt-6 grid gap-6">
              {/* Outgoing */}
              <Card>
                <CardContent className="space-y-3 p-5">
                  <Badge variant="outline" className="border-primary/40 text-primary">
                    Events we send
                  </Badge>
                  <p className="text-sm text-muted-foreground">
                    Pick the events you care about, paste your URL, get a
                    signing secret. Every delivery carries an{" "}
                    <code className="rounded bg-muted px-1 text-[11px]">X-TBC-Signature</code>{" "}
                    HMAC-SHA256 header we recommend you verify.
                  </p>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Events
                  </p>
                  <ul className="space-y-1 text-xs">
                    <WebhookEvent name="student.created" />
                    <WebhookEvent name="student.updated" />
                    <WebhookEvent name="student.deleted" />
                    <WebhookEvent name="enrollment.created" />
                    <WebhookEvent name="enrollment.revoked" />
                    <WebhookEvent name="order.paid" />
                    <WebhookEvent name="order.refunded" />
                    <WebhookEvent name="course.published" />
                    <WebhookEvent name="course.archived" />
                    <WebhookEvent name="live_session.started" />
                    <WebhookEvent name="live_session.ended" />
                    <WebhookEvent name="recording.ready" />
                    <WebhookEvent name="certificate.issued" />
                  </ul>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Delivery guarantees
                  </p>
                  <ul className="space-y-1 text-xs text-muted-foreground">
                    <li>· At-least-once. Same event id may arrive twice — dedupe on the <code className="rounded bg-muted px-1">id</code> field.</li>
                    <li>· Retries with exponential backoff (1m → 5m → 30m → 2h → 6h → 24h) for 5xx + network errors.</li>
                    <li>· Delivery log retained for 30 days at <Link href="/dashboard/developer/webhooks" className="text-primary hover:underline">/dashboard/developer/webhooks</Link>.</li>
                    <li>· Endpoints failing for 7 consecutive days are auto-disabled; you get an email.</li>
                  </ul>
                  <pre className="overflow-x-auto rounded-md bg-muted p-3 font-mono text-[11px]">
{`POST https://your-app.com/webhooks/tbc HTTP/1.1
Content-Type: application/json
X-TBC-Signature: t=1716102400,v1=8a92…
X-TBC-Event:     order.paid
X-TBC-Delivery:  evd_2k9f…

{
  "id": "evt_01HXYZ…",
  "type": "order.paid",
  "created_at": "2026-05-19T14:23:14Z",
  "workspace_id": "org_…",
  "data": { /* order object */ }
}`}
                  </pre>
                </CardContent>
              </Card>

            </div>

            {/* Real-world examples — what to actually do with webhooks */}
            <Card className="mt-6">
              <CardContent className="space-y-3 p-5">
                <p className="text-sm font-semibold">A few things creators build with these events:</p>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>
                    <strong className="text-foreground">CRM sync.</strong>{" "}
                    Subscribe to <code className="rounded bg-muted px-1 text-[11px]">student.created</code>
                    {" "}and <code className="rounded bg-muted px-1 text-[11px]">enrollment.created</code> — every
                    new student is auto-pushed to HubSpot / Zoho / a Google
                    Sheet, with their course list tagged.
                  </li>
                  <li>
                    <strong className="text-foreground">Slack / Discord pings.</strong>{" "}
                    Subscribe to <code className="rounded bg-muted px-1 text-[11px]">order.paid</code> — your team gets a
                    Slack message every time someone buys, including the
                    product name and customer email.
                  </li>
                  <li>
                    <strong className="text-foreground">Accounting export.</strong>{" "}
                    Subscribe to <code className="rounded bg-muted px-1 text-[11px]">order.paid</code> +{" "}
                    <code className="rounded bg-muted px-1 text-[11px]">order.refunded</code> — your bookkeeping tool
                    (Tally / QuickBooks / Zoho Books) gets each
                    transaction with gross / gateway-fee / net columns
                    pre-split.
                  </li>
                  <li>
                    <strong className="text-foreground">Auto-issue downloads.</strong>{" "}
                    Subscribe to <code className="rounded bg-muted px-1 text-[11px]">order.paid</code> for a digital
                    product — your serverless function generates a
                    watermarked PDF and emails it to the buyer in seconds.
                  </li>
                  <li>
                    <strong className="text-foreground">Recording archival.</strong>{" "}
                    Subscribe to <code className="rounded bg-muted px-1 text-[11px]">recording.ready</code> — when a
                    live class finishes, your script copies the file to
                    your own S3 bucket for long-term storage.
                  </li>
                </ul>
                <p className="pt-2 text-xs text-muted-foreground">
                  Webhooks are the right tool when you need to react in
                  near-real-time. For batch / periodic sync, prefer the
                  REST API above with cursor pagination.
                </p>
              </CardContent>
            </Card>

            {/* Verifying the outgoing signature */}
            <Card className="mt-6">
              <CardContent className="space-y-2 p-5">
                <p className="text-sm font-semibold">Verifying our signature (Node.js example)</p>
                <pre className="overflow-x-auto rounded-md bg-muted p-3 font-mono text-[11px]">
{`import crypto from 'crypto'

const SECRET = process.env.TBC_WEBHOOK_SECRET!
app.post('/webhooks/tbc', express.raw({ type: '*/*' }), (req, res) => {
  const sig = req.header('X-TBC-Signature') || ''
  // X-TBC-Signature: t=<unix>,v1=<hex>
  const parts = Object.fromEntries(sig.split(',').map(p => p.split('=')))
  const ts = Number(parts.t)
  if (Math.abs(Date.now() / 1000 - ts) > 300) return res.status(400).end() // 5-min replay window
  const expected = crypto
    .createHmac('sha256', SECRET)
    .update(\`\${ts}.\${req.body.toString('utf8')}\`)
    .digest('hex')
  if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(parts.v1))) {
    return res.status(401).end()
  }
  // Trust the body now — your job to dedupe on body.id
  const event = JSON.parse(req.body.toString('utf8'))
  /* … */
  res.json({ ok: true })
})`}
                </pre>
                <p className="text-xs text-muted-foreground">
                  Use <code className="rounded bg-muted px-1">express.raw</code>
                  {" "}(or your framework&apos;s equivalent) so the body bytes match
                  what we signed. Parsing JSON BEFORE verifying will silently
                  change whitespace and break the HMAC.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Rate limits */}
        <section id="rate-limits" className="border-b border-border py-12">
          <div className="mx-auto max-w-5xl px-6 lg:px-8">
            <h2 className="font-serif text-2xl font-bold tracking-tight">Rate limits</h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <Card>
                <CardContent className="p-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Per key
                  </p>
                  <p className="mt-1 font-serif text-3xl font-bold">60 / min</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Resets at the top of each minute, aligned to clock minutes.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Per key
                  </p>
                  <p className="mt-1 font-serif text-3xl font-bold">1,000 / day</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Resets at 00:00 UTC. Need more? Enterprise plans get custom quotas.
                  </p>
                </CardContent>
              </Card>
            </div>
            <Card className="mt-4">
              <CardContent className="space-y-2 p-5 text-sm">
                <p className="font-semibold">Response headers (always present)</p>
                <ul className="space-y-1 text-xs text-muted-foreground">
                  <li>
                    <code className="rounded bg-muted px-1">X-RateLimit-Limit</code> — your per-minute cap.
                  </li>
                  <li>
                    <code className="rounded bg-muted px-1">X-RateLimit-Remaining</code> — calls left this minute.
                  </li>
                  <li>
                    <code className="rounded bg-muted px-1">X-RateLimit-Reset</code> — unix-seconds when the per-minute bucket resets.
                  </li>
                  <li>
                    <code className="rounded bg-muted px-1">X-RateLimit-Daily-Limit</code>, <code className="rounded bg-muted px-1">…-Daily-Remaining</code>, <code className="rounded bg-muted px-1">…-Daily-Reset</code> — same shape for the daily bucket.
                  </li>
                  <li>
                    <code className="rounded bg-muted px-1">Retry-After</code> — seconds to wait, only on 429 responses.
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Errors */}
        <section className="border-b border-border py-12">
          <div className="mx-auto max-w-5xl px-6 lg:px-8">
            <h2 className="font-serif text-2xl font-bold tracking-tight">Errors</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Every error response uses the same envelope so generic clients can branch on
              <code className="rounded bg-muted px-1">.error.code</code> without parsing prose.
            </p>
            <pre className="mt-4 overflow-x-auto rounded-md bg-muted p-4 font-mono text-xs">{`{
  "error": {
    "code": "rate_limited",
    "message": "Per-minute rate limit reached. Retry after 23s.",
    "retryAfterSeconds": 23
  }
}`}</pre>
            <ul className="mt-4 space-y-1 text-sm text-muted-foreground">
              <li><code className="rounded bg-muted px-1">unauthorized</code> — 401 — missing or malformed bearer token.</li>
              <li><code className="rounded bg-muted px-1">forbidden</code> — 403 — token exists but lacks the required scope.</li>
              <li><code className="rounded bg-muted px-1">not_found</code> — 404 — id doesn&apos;t resolve in this workspace.</li>
              <li><code className="rounded bg-muted px-1">rate_limited</code> — 429 — per-minute or per-day bucket exhausted.</li>
              <li><code className="rounded bg-muted px-1">invalid_request</code> — 422 — body / params failed validation.</li>
              <li><code className="rounded bg-muted px-1">internal_error</code> — 500 — our fault. Retry with exponential backoff.</li>
            </ul>
          </div>
        </section>

        {/* Footer CTA */}
        <section className="py-12">
          <div className="mx-auto max-w-3xl px-6 text-center lg:px-8">
            <h2 className="font-serif text-2xl font-bold tracking-tight">Ship something today.</h2>
            <p className="mt-2 text-muted-foreground">
              Generate a key, hit your first endpoint in five minutes. If something feels missing or wrong, tell us — every endpoint here was built because a creator asked for it.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button asChild>
                <Link href="/dashboard/developer">
                  <Key className="mr-2 h-4 w-4" />
                  Get an API key
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/help">Talk to us</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}

function Principle({
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
        <p className="text-sm text-muted-foreground">{body}</p>
      </CardContent>
    </Card>
  )
}

function WebhookEvent({ name }: { name: string }) {
  return (
    <li className="flex items-center gap-2">
      <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px]">{name}</code>
    </li>
  )
}

function Step({
  n,
  title,
  body,
}: {
  n: number
  title: string
  body: React.ReactNode
}) {
  return (
    <li className="flex gap-4">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
        {n}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{title}</p>
        <div className="mt-1 text-sm text-muted-foreground">{body}</div>
      </div>
    </li>
  )
}
