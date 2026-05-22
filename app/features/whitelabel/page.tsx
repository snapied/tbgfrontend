// Feature page — White-label.
//
// Targets the buyer who searched "white-label LMS India",
// "remove powered-by line course platform", "custom domain LMS".
// The wedge is straightforward: most platforms gate white-label
// behind their highest tier; ours ships on every plan.

import Link from "next/link"
import type { Metadata } from "next"
import {
  ArrowRight,
  CheckCircle2,
  Globe,
  Palette,
  ShieldCheck,
  Sparkles,
} from "lucide-react"
import { Header } from "@/components/landing/header"
import { Footer } from "@/components/landing/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

const SITE_URL = "https://thebigclass.com"
const PAGE_PATH = "/features/whitelabel"

export const metadata: Metadata = {
  title: "White-label course platform · The Big Class",
  description:
    "Ship a portal that reads entirely as your brand — your logo, your colors, your domain, no 'Powered by' line. White-label on every plan, custom domain in one click.",
  keywords: [
    "white label LMS",
    "white label course platform",
    "remove powered-by line course platform",
    "branded course portal",
    "custom domain LMS India",
    "white label creator platform India",
    "branded creator platform",
  ],
  alternates: { canonical: `${SITE_URL}${PAGE_PATH}` },
  openGraph: {
    type: "website",
    url: `${SITE_URL}${PAGE_PATH}`,
    siteName: "The Big Class",
    title: "Your brand. Not ours.",
    description:
      "Strip platform attribution. Your portal at your domain, with your colors and fonts. On every plan.",
  },
  twitter: {
    card: "summary_large_image",
    title: "White-label your portal — on every plan",
    description: "Your logo, your colors, your domain. No 'Powered by' line.",
  },
}

const FAQ_JSONLD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Is white-label gated behind a higher plan?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "No. Both the 'hide Powered by' toggle and the broader 'hide every platform-branded element' toggle ship on every plan. Custom domains are also included.",
      },
    },
    {
      "@type": "Question",
      name: "Can I use my own domain?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. Launch on your-slug.thebigclass.com, then point a CNAME at us to map your custom domain. SSL is auto-provisioned. The path-based URL (/p/<slug>/…) keeps working as a fallback.",
      },
    },
    {
      "@type": "Question",
      name: "What about transactional emails (password resets, invites)?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "By default they send from our platform sender for deliverability. Once DMARC + SPF for your domain are verified, those emails ship from your domain too — same content, no platform branding.",
      },
    },
  ],
}

export default function WhitelabelFeaturePage() {
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
              <Palette className="mr-1 h-3 w-3" />
              Free on every plan
            </Badge>
            <h1 className="font-serif text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Your brand. <span className="text-primary">Not ours.</span>
            </h1>
            <p className="mt-5 max-w-3xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
              Most creator platforms gate white-label behind their top tier or hide it behind a
              sales call. We don&apos;t. Flip a toggle, the &quot;Powered by The Big Class&quot;
              line disappears, your portal looks like a site you built.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/dashboard/portal/brand">
                  Configure your brand <ArrowRight className="ml-1.5 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/help/white-label">Read the guide</Link>
              </Button>
            </div>
            <ul className="mt-8 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2 lg:grid-cols-4">
              <li className="inline-flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-success" /> Hide all platform branding
              </li>
              <li className="inline-flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-success" /> Custom domain + auto-SSL
              </li>
              <li className="inline-flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-success" /> Brand colors, fonts, logos
              </li>
              <li className="inline-flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-success" /> No tier upsell
              </li>
            </ul>
          </div>
        </section>

        <section className="border-b border-border py-16">
          <div className="mx-auto max-w-5xl px-6 lg:px-8">
            <h2 className="font-serif text-3xl font-bold tracking-tight">
              Three toggles to flip
            </h2>
            <p className="mt-3 max-w-3xl text-muted-foreground">
              You don&apos;t have to learn a templating system or read 30 minutes of docs. The
              white-label surface is three controls in one panel.
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Pillar
                icon={<ShieldCheck className="h-5 w-5 text-primary" />}
                title="Hide attribution"
                body="Drop the 'Powered by' footer line. The harder-stop toggle next to it reserves the same opt-out for future surfaces — email footers, share previews, error pages — so flipping it once covers them all."
              />
              <Pillar
                icon={<Palette className="h-5 w-5 text-primary" />}
                title="Full brand control"
                body="Logo, favicon, primary + accent colors, heading + body fonts (Google + custom). Templates seed sensible defaults; you override anything from a single panel."
              />
              <Pillar
                icon={<Globe className="h-5 w-5 text-primary" />}
                title="Custom domain"
                body="Launch on your-slug.thebigclass.com, then point a CNAME at us. SSL auto-provisioned. The path-based form (/p/<slug>/…) keeps working as a fallback so you never break old bookmarks."
              />
            </div>
          </div>
        </section>

        <section className="border-b border-border bg-muted/20 py-16">
          <div className="mx-auto max-w-5xl px-6 lg:px-8">
            <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
              <div>
                <h2 className="font-serif text-3xl font-bold tracking-tight">
                  How tenants render today
                </h2>
                <p className="mt-3 text-muted-foreground">
                  Every <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">/p/&lt;tenant&gt;/*</code>{" "}
                  page is wrapped in a per-tenant theme provider that paints brand colours and
                  fonts as scoped CSS variables. No leakage, no platform default sneaking in.
                </p>
                <ul className="mt-5 space-y-2 text-sm">
                  <li className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" /> Tenant logo + favicon override the platform default everywhere.</li>
                  <li className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" /> Brand colors flow into every shadcn-ui component via CSS vars.</li>
                  <li className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" /> Google Fonts + custom-uploaded webfonts both supported.</li>
                  <li className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" /> 7 portal templates with one-click apply (Editorial, Brutalist, Minimal, etc.).</li>
                </ul>
              </div>
              <Card>
                <CardContent className="p-0">
                  <div className="border-b border-border bg-muted/40 px-4 py-2 text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
                    /dashboard/portal/brand → Advanced
                  </div>
                  <div className="space-y-3 p-5">
                    <ToggleRow
                      label="Hide “Powered by The Big Class”"
                      hint="Drops the thin attribution line in the portal footer."
                      on
                    />
                    <ToggleRow
                      label="Hide every platform-branded element"
                      hint="Stronger toggle — implies the option above and reserves the opt-out for future surfaces."
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section className="border-b border-border py-16">
          <div className="mx-auto max-w-5xl px-6 lg:px-8">
            <h2 className="font-serif text-3xl font-bold tracking-tight">
              What stays platform-branded — and when it stops
            </h2>
            <p className="mt-3 max-w-3xl text-muted-foreground">
              We&apos;re honest about the seam: transactional emails (invites, password resets)
              ship from a platform sender so they land in inboxes, not spam folders. Once DMARC +
              SPF for your domain are verified, those become yours too.
            </p>
            <Card className="mt-6">
              <CardContent className="space-y-3 p-5 text-sm">
                <p>
                  <Sparkles className="mr-1.5 inline h-4 w-4 text-primary" />
                  In flight on the roadmap:
                </p>
                <ul className="ml-6 list-disc space-y-1 text-muted-foreground">
                  <li>Per-tenant email sender after DKIM verification.</li>
                  <li>White-labeled status page on your domain.</li>
                  <li>Branded WhatsApp template namespaces once Meta Business API is wired.</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="py-16">
          <div className="mx-auto max-w-3xl px-6 text-center lg:px-8">
            <h2 className="font-serif text-3xl font-bold tracking-tight">
              Ship your portal as your brand
            </h2>
            <p className="mt-3 text-muted-foreground">
              No upsell call. No tier comparison. Open the brand panel, flip the toggle, see the
              change immediately.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button size="lg" asChild>
                <Link href="/dashboard/portal/brand">
                  Open brand settings <ArrowRight className="ml-1.5 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/help/white-label">White-label guide</Link>
              </Button>
            </div>
            <p className="mt-6 text-xs text-muted-foreground">
              See also:{" "}
              <Link href="/features/multilingual" className="font-medium hover:underline">Multilingual portal</Link>
              {" · "}
              <Link href="/features/api" className="font-medium hover:underline">API & integrations</Link>
              {" · "}
              <Link href="/help/customer-urls" className="font-medium hover:underline">Customer-facing URLs</Link>
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

function ToggleRow({
  label,
  hint,
  on,
}: {
  label: string
  hint: string
  on?: boolean
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-md border border-border p-3">
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
      <div
        className={`mt-0.5 inline-flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 ${
          on ? "bg-primary" : "bg-muted-foreground/30"
        }`}
        aria-hidden
      >
        <span
          className={`h-4 w-4 rounded-full bg-card transition-transform ${
            on ? "translate-x-4" : ""
          }`}
        />
      </div>
    </div>
  )
}
