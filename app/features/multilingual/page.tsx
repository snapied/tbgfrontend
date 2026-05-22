// Feature page — Multilingual customer portal.
//
// Indian creators repeatedly say their learner base reads in Hindi
// + a regional language. Most platforms ship English-only. Our
// wedge: 5 locales today (EN / HI / TA / ES / FR), real picker in
// the header, choice persists per visitor.

import Link from "next/link"
import type { Metadata } from "next"
import {
  ArrowRight,
  CheckCircle2,
  Globe,
  Languages,
  Sparkles,
} from "lucide-react"
import { Header } from "@/components/landing/header"
import { Footer } from "@/components/landing/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

const SITE_URL = "https://thebigclass.com"
const PAGE_PATH = "/features/multilingual"

export const metadata: Metadata = {
  title: "Multilingual course platform — Hindi, Tamil, Spanish, French",
  description:
    "Serve learners in English, Hindi, Tamil, Spanish, or French. Auto-detect on first visit, picker in every portal header, choice persists across sessions.",
  keywords: [
    "multilingual LMS",
    "Hindi course platform",
    "Tamil online learning",
    "regional language LMS India",
    "i18n creator platform",
    "Spanish course platform",
    "multilingual creator platform alternative",
    "vernacular learning platform",
  ],
  alternates: { canonical: `${SITE_URL}${PAGE_PATH}` },
  openGraph: {
    type: "website",
    url: `${SITE_URL}${PAGE_PATH}`,
    siteName: "The Big Class",
    title: "Meet learners in their own language",
    description:
      "Five locales today. Picker in every portal header. Choice persists per visitor.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Multilingual customer portal",
    description: "EN · HI · TA · ES · FR — switchable from every page.",
  },
}

const FAQ_JSONLD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Which languages does the customer portal support?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "English, Hindi (हिन्दी), Tamil (தமிழ்), Spanish (Español), and French (Français). EN, HI, and ES are fully translated today; TA and FR ship as English fallbacks while native review is pending.",
      },
    },
    {
      "@type": "Question",
      name: "Does the platform translate my course content?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "No — authored content (course descriptions, lessons, blog posts, product copy) stays in the language you wrote it. The i18n layer only translates the platform chrome (navigation, sign-in, common CTAs) so visitors can navigate in their own language.",
      },
    },
    {
      "@type": "Question",
      name: "How is the language detected on first visit?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "We read navigator.language and match the primary subtag (hi-IN → Hindi). The visitor can override with the picker in the header at any time; the choice persists in their browser across sessions.",
      },
    },
  ],
}

const LOCALES = [
  { code: "en", flag: "🇬🇧", label: "English",  status: "live" as const,    sample: "Sign in" },
  { code: "hi", flag: "🇮🇳", label: "हिन्दी (Hindi)",    status: "live" as const,    sample: "साइन इन करें" },
  { code: "ta", flag: "🇮🇳", label: "தமிழ் (Tamil)",      status: "fallback" as const, sample: "Sign in" },
  { code: "es", flag: "🇪🇸", label: "Español",           status: "live" as const,    sample: "Iniciar sesión" },
  { code: "fr", flag: "🇫🇷", label: "Français",          status: "fallback" as const, sample: "Sign in" },
]

export default function MultilingualFeaturePage() {
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
              <Languages className="mr-1 h-3 w-3" />
              Five locales — and growing
            </Badge>
            <h1 className="font-serif text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Meet learners in{" "}
              <span className="text-primary">their own language</span>.
            </h1>
            <p className="mt-5 max-w-3xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
              English-only platforms lose Indian and LATAM creators a 30-second pageview after a
              30-month sell. Our customer portal ships with a real language picker in every
              header — visitors land in their own tongue, the rest of your funnel keeps working.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/dashboard/portal/brand">
                  Configure your portal <ArrowRight className="ml-1.5 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/help/learner-language">How learners switch</Link>
              </Button>
            </div>
            <ul className="mt-8 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2 lg:grid-cols-4">
              <li className="inline-flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-success" /> Picker in every portal header
              </li>
              <li className="inline-flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-success" /> Auto-detect via navigator
              </li>
              <li className="inline-flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-success" /> Choice persists per device
              </li>
              <li className="inline-flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-success" /> Adds zero KB to first paint
              </li>
            </ul>
          </div>
        </section>

        <section className="border-b border-border py-16">
          <div className="mx-auto max-w-5xl px-6 lg:px-8">
            <h2 className="font-serif text-3xl font-bold tracking-tight">
              Locales available today
            </h2>
            <p className="mt-3 max-w-3xl text-muted-foreground">
              Live locales are reviewed by native speakers; fallbacks render the English string
              while we line up a translator. Want a new language? Tell us which one and we&apos;ll
              prioritise on demand.
            </p>
            <div className="mt-8 overflow-hidden rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Locale</th>
                    <th className="px-4 py-3 font-semibold">Sample (&quot;Sign in&quot;)</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {LOCALES.map((l) => (
                    <tr key={l.code}>
                      <td className="px-4 py-3">
                        <span className="mr-2">{l.flag}</span>
                        {l.label}{" "}
                        <code className="ml-1 rounded bg-muted px-1 font-mono text-[10px] text-muted-foreground">
                          {l.code}
                        </code>
                      </td>
                      <td className="px-4 py-3 font-serif text-base">{l.sample}</td>
                      <td className="px-4 py-3">
                        {l.status === "live" ? (
                          <Badge className="bg-success/15 text-[10px] text-success">Native</Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px]">English fallback</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="border-b border-border bg-muted/20 py-16">
          <div className="mx-auto max-w-5xl px-6 lg:px-8">
            <h2 className="font-serif text-3xl font-bold tracking-tight">
              How it works under the hood
            </h2>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Pillar
                icon={<Languages className="h-5 w-5 text-primary" />}
                title="Real picker, not Google Translate"
                body="Strings are hand-translated, scoped per surface, version-controlled. We don't pipe your portal through an auto-translate widget that ages badly."
              />
              <Pillar
                icon={<Sparkles className="h-5 w-5 text-primary" />}
                title="Lightweight"
                body="Pure React Context — no 50 KB i18n library on the first-load bundle. Adding a locale means dropping in a JSON-like dictionary object. SSR-safe."
              />
              <Pillar
                icon={<Globe className="h-5 w-5 text-primary" />}
                title="Works with white-label"
                body="The picker uses your brand colors + fonts. Set a tenant default locale in the brand panel so first-time visitors land in the right language without picking."
              />
            </div>
          </div>
        </section>

        <section className="border-b border-border py-16">
          <div className="mx-auto max-w-5xl px-6 lg:px-8">
            <h2 className="font-serif text-3xl font-bold tracking-tight">
              What gets translated (and what doesn&apos;t)
            </h2>
            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              <Card>
                <CardContent className="space-y-2 p-5">
                  <p className="font-semibold">Platform chrome — translated</p>
                  <ul className="ml-5 list-disc space-y-1 text-sm text-muted-foreground">
                    <li>Header navigation, footer, language picker.</li>
                    <li>Sign-in, forgot-password, accept-invite flows.</li>
                    <li>Course catalogue + shop landing copy.</li>
                    <li>Library, common CTAs, error states.</li>
                  </ul>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="space-y-2 p-5">
                  <p className="font-semibold">Your content — stays as authored</p>
                  <ul className="ml-5 list-disc space-y-1 text-sm text-muted-foreground">
                    <li>Course titles, descriptions, lesson bodies.</li>
                    <li>Blog posts, store products, page sections.</li>
                    <li>Certificates + email templates.</li>
                  </ul>
                  <p className="mt-3 text-xs text-muted-foreground">
                    Sell into multiple markets with the same product? Author the course twice, set
                    each one&apos;s SEO language. Course-content auto-translation is on the AI roadmap.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section className="py-16">
          <div className="mx-auto max-w-3xl px-6 text-center lg:px-8">
            <h2 className="font-serif text-3xl font-bold tracking-tight">
              Open your portal in Hindi today
            </h2>
            <p className="mt-3 text-muted-foreground">
              No configuration required. The picker is already in your tenant header. Switch and
              see — the chrome around your courses turns Hindi in &lt;100 ms.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button asChild size="lg">
                <Link href="/dashboard/portal/brand">
                  Open brand settings <ArrowRight className="ml-1.5 h-4 w-4" />
                </Link>
              </Button>
            </div>
            <p className="mt-6 text-xs text-muted-foreground">
              See also:{" "}
              <Link href="/features/whitelabel" className="font-medium hover:underline">White-label</Link>
              {" · "}
              <Link href="/help/learner-language" className="font-medium hover:underline">Learner: change language</Link>
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
