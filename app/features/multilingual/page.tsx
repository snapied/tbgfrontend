// Feature page — Multilingual customer portal.
//
// Indian creators repeatedly say their learner base reads in Hindi
// + a regional language. Most platforms ship English-only. Our
// wedge: 10 Indian languages live today, with native review and
// portal-wide chrome translation. 5 international locales (es / fr
// / ar / pt / id) are surfaced as "coming soon" so visitors see the
// roadmap. Sample strings + status pulled live from lib/i18n.tsx —
// when a new locale flips from disabled to enabled, update both.

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
  title: "Multilingual course platform — 10 Indian languages, hand-translated",
  description:
    "Serve learners in English, Hindi, Bengali, Tamil, Telugu, Marathi, Gujarati, Kannada, Malayalam, or Punjabi. Auto-detect on first visit, picker in every portal header, choice persists across sessions. Spanish, French, Arabic, Portuguese, Indonesian on the way.",
  keywords: [
    "multilingual LMS",
    "Hindi course platform",
    "Bengali online learning",
    "Tamil online learning",
    "Telugu LMS",
    "Marathi LMS",
    "Gujarati LMS",
    "Kannada LMS",
    "Malayalam LMS",
    "Punjabi LMS",
    "regional language LMS India",
    "vernacular learning platform",
    "i18n creator platform",
  ],
  alternates: { canonical: `${SITE_URL}${PAGE_PATH}` },
  openGraph: {
    type: "website",
    url: `${SITE_URL}${PAGE_PATH}`,
    siteName: "The Big Class",
    title: "Meet learners in their own language",
    description:
      "10 Indian languages live in the portal today. 5 more on the roadmap. Picker in every header, choice persists per visitor.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Multilingual customer portal",
    description: "EN · हिन्दी · বাংলা · தமிழ் · తెలుగు · मराठी · ગુજરાતી · ಕನ್ನಡ · മലയാളം · ਪੰਜਾਬੀ — switchable from every page.",
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
        text: "Ten languages live today: English, Hindi (हिन्दी), Bengali (বাংলা), Tamil (தமிழ்), Telugu (తెలుగు), Marathi (मराठी), Gujarati (ગુજરાતી), Kannada (ಕನ್ನಡ), Malayalam (മലയാളം), and Punjabi (ਪੰਜਾਬੀ). All ten are hand-translated and reviewed by native speakers. Spanish, French, Arabic, Portuguese, and Indonesian are visible in the roadmap and ship next.",
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
        text: "We read navigator.language and match the primary subtag (hi-IN → Hindi, bn-IN → Bengali). The visitor can override with the picker in the header at any time; the choice persists in their browser across sessions.",
      },
    },
    {
      "@type": "Question",
      name: "Can the workspace owner disable specific languages?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. Each tenant configures which of the ten ready locales are shown in their picker via the Portal → Brand → Languages panel. A creator who only sells in Hindi + English can hide the rest. The picker disappears entirely if the tenant disables multilingual mode.",
      },
    },
  ],
}

// Locale roster — mirror of SUPPORTED_LOCALES in lib/i18n.tsx with
// the sample strings pulled live from each dictionary's
// "header.signIn" key. When a new locale ships, add a row here AND
// flip its `disabled` flag in i18n.tsx.
type LocaleRow = {
  code: string
  flag: string
  label: string
  status: "live" | "soon"
  sample: string
}
const LOCALES: LocaleRow[] = [
  // ── Live — ten Indian languages, native review complete ───────
  { code: "en", flag: "🇬🇧", label: "English",                   status: "live", sample: "Sign in" },
  { code: "hi", flag: "🇮🇳", label: "हिन्दी (Hindi)",              status: "live", sample: "साइन इन" },
  { code: "bn", flag: "🇮🇳", label: "বাংলা (Bengali)",            status: "live", sample: "সাইন ইন" },
  { code: "ta", flag: "🇮🇳", label: "தமிழ் (Tamil)",              status: "live", sample: "உள் நுழை" },
  { code: "te", flag: "🇮🇳", label: "తెలుగు (Telugu)",            status: "live", sample: "సైన్ ఇన్" },
  { code: "mr", flag: "🇮🇳", label: "मराठी (Marathi)",            status: "live", sample: "साइन इन" },
  { code: "gu", flag: "🇮🇳", label: "ગુજરાતી (Gujarati)",          status: "live", sample: "સાઇન ઇન" },
  { code: "kn", flag: "🇮🇳", label: "ಕನ್ನಡ (Kannada)",            status: "live", sample: "ಸೈನ್ ಇನ್" },
  { code: "ml", flag: "🇮🇳", label: "മലയാളം (Malayalam)",          status: "live", sample: "സൈൻ ഇൻ" },
  { code: "pa", flag: "🇮🇳", label: "ਪੰਜਾਬੀ (Punjabi)",            status: "live", sample: "ਸਾਈਨ ਇਨ" },
  // ── Coming soon — disabled in the picker, English fallback ───
  { code: "es", flag: "🇪🇸", label: "Español (Spanish)",         status: "soon", sample: "Iniciar sesión" },
  { code: "fr", flag: "🇫🇷", label: "Français (French)",         status: "soon", sample: "Se connecter" },
  { code: "ar", flag: "🇸🇦", label: "العربية (Arabic)",          status: "soon", sample: "تسجيل الدخول" },
  { code: "pt", flag: "🇧🇷", label: "Português (Portuguese)",    status: "soon", sample: "Entrar" },
  { code: "id", flag: "🇮🇩", label: "Bahasa Indonesia",          status: "soon", sample: "Masuk" },
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
              10 Indian languages live · 5 more coming
            </Badge>
            <h1 className="font-serif text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Meet learners in{" "}
              <span className="text-primary">their own language</span>.
            </h1>
            <p className="mt-5 max-w-3xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
              English-only platforms lose Indian creators a 30-second pageview after a
              30-month sell. Our customer portal ships with a real language picker in every
              header — visitors land in their own tongue, the rest of your funnel keeps working.
              Ten Indian languages live today (Hindi, Bengali, Tamil, Telugu, Marathi, Gujarati,
              Kannada, Malayalam, Punjabi, plus English). Spanish, French, Arabic, Portuguese,
              and Indonesian ship next.
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
              All ten <strong>Live</strong> locales are hand-translated and reviewed by native
              speakers — not piped through Google Translate. The five <strong>Coming soon</strong>{" "}
              entries are surfaced in the roadmap; visitors who pick them today land in
              English while the native dictionaries ship. Want a language not listed?{" "}
              <Link href="/help/learner-language" className="font-medium text-primary hover:underline">
                Tell us which one
              </Link>{" "}
              — we prioritise on demand.
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
                      <td
                        className="px-4 py-3 font-serif text-base"
                        // Arabic + a few other scripts read right-to-left. Set
                        // dir on the cell so the sample renders correctly
                        // without forcing the whole page into RTL.
                        dir={l.code === "ar" ? "rtl" : "ltr"}
                      >
                        {l.sample}
                      </td>
                      <td className="px-4 py-3">
                        {l.status === "live" ? (
                          <Badge className="bg-success/15 text-[10px] text-success">Live</Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px]">Coming soon</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="border-t border-border bg-muted/20 px-4 py-2 text-xs text-muted-foreground">
                Live count: {LOCALES.filter((l) => l.status === "live").length} ·
                {" "}Coming soon: {LOCALES.filter((l) => l.status === "soon").length} ·
                {" "}Total: {LOCALES.length}
              </p>
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
              Open your portal in हिन्दी, বাংলা, தமிழ் — today.
            </h2>
            <p className="mt-3 text-muted-foreground">
              No configuration required. The picker is already in your tenant header with all
              ten Indian languages enabled by default. Switch and see — the chrome around your
              courses flips locale in &lt;100 ms, no page reload.
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
