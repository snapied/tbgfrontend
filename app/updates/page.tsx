"use client"

import Link from "next/link"
import {
  Award,
  BarChart3,
  Captions,
  Globe2,
  Heart,
  History,
  Lock,
  Repeat,
  ShieldCheck,
  Sparkles,
  Trophy,
  UserPlus,
  Video,
  Webhook as WebhookIcon,
} from "lucide-react"
import { Header } from "@/components/landing/header"
import { Footer } from "@/components/landing/footer"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface UpdateEntry {
  date: string
  tag: "Feature" | "Improvement" | "Fix"
  icon: React.ElementType
  title: string
  body: string
  link?: { href: string; label: string }
}

const UPDATES: UpdateEntry[] = [
  {
    date: "May 21, 2026",
    tag: "Feature",
    icon: Sparkles,
    title: "White-label your portal — strip platform attribution",
    body: "The Brand → Advanced tab now exposes two toggles: hide the “Powered by The Big Class” footer line, and a stronger “hide every platform-branded element” switch that reserves headroom for email footers, error pages, and share previews. Both gated behind Pro (and up) so the lock icon points to billing; once enabled, the public portal footer drops the attribution row entirely.",
    link: { href: "/dashboard/portal/brand", label: "Open brand settings" },
  },
  {
    date: "May 20, 2026",
    tag: "Fix",
    icon: Captions,
    title: "Transcripts now actually surface on the recordings page",
    body: "The recordings page wasn't fetching transcript_url from the backend, so the .vtt sidecar produced by Whisper never reached the player. Now each row fetches its room state lazily, badges with \"Captions + transcript ready\" when present, and offers a one-click Transcribe button on rows that don't yet have a transcript (handy for recordings made before GROQ_API_KEY was set).",
  },
  {
    date: "May 20, 2026",
    tag: "Improvement",
    icon: Captions,
    title: "Clearer live-caption state during calls",
    body: "The captions toggle now shows real-time status (Starting → Listening → Captions on, with a \"Listening — start speaking…\" hint while you're still silent). Mic-permission denials surface as an amber banner with a fix-it instruction instead of failing silently. SR errors log to the browser console for support.",
  },
  {
    date: "May 20, 2026",
    tag: "Fix",
    icon: ShieldCheck,
    title: "Billing / Payouts / Webhooks now respect your live session",
    body: "Pages on /dashboard/billing, /dashboard/payouts, and /dashboard/developer/webhooks were showing a sign-in card to users who were already signed in but whose access token wasn't in localStorage (older signup, incognito clear, cross-device). They now try the refresh-cookie path first and only fall back to the sign-in card when the cookie session is truly gone.",
  },
  {
    date: "May 20, 2026",
    tag: "Feature",
    icon: Sparkles,
    title: "AI course builder — free",
    body: "Sparkles buttons on the course editor draft titles, descriptions, and full outlines. Powered by Llama-3.3-70b via Groq's free tier (OpenAI as a fallback if you'd rather). Shows up only when the backend has a key configured — no broken buttons.",
    link: { href: "/pricing", label: "See pricing" },
  },
  {
    date: "May 20, 2026",
    tag: "Feature",
    icon: Captions,
    title: "Auto-transcripts on every recording + live captions",
    body: "Every class recording runs through Whisper-large-v3 after egress, producing a .vtt sidecar that the player picks up natively (CC button works) and a plain-text panel under the video. In-call captions overlay your own speech via Web Speech API — Chrome / Edge / Safari supported.",
  },
  {
    date: "May 20, 2026",
    tag: "Feature",
    icon: History,
    title: "Publish changes — with 3-month version history",
    body: "Edits to your portal (brand, pages, blog, faculty, testimonials) stay in a draft until you click Publish. Confirm-before-publish modal, label each version, restore from any snapshot within 90 days. The 3-month history + restore is paid-tier; publish itself works on every plan.",
  },
  {
    date: "May 20, 2026",
    tag: "Feature",
    icon: Lock,
    title: "Plan-aware lock icons across the dashboard",
    body: "Restricted features now show a small amber lock with a click-to-explain popover and a one-click upgrade CTA — instead of bouncing you off the page. Wired into the sidebar (Domain & URL), the storefront product cap, and published-courses cap; more surfaces will pick this up as we expand.",
  },
  {
    date: "May 20, 2026",
    tag: "Feature",
    icon: BarChart3,
    title: "Analytics deep dive — real numbers, real charts",
    body: "12-month revenue area chart, signups vs. enrollments overlay, acquisition funnel from signup to certificate, top courses by revenue with completion %, and a cohort-retention heatmap. The retention heatmap is Studio-tier (advanced analytics).",
    link: { href: "/dashboard/analytics", label: "Open analytics" },
  },
  {
    date: "May 20, 2026",
    tag: "Feature",
    icon: WebhookIcon,
    title: "13 webhook events wired end-to-end",
    body: "student.created/updated/deleted, enrollment.created, order.paid, course.published/archived, live_session.started/ended, recording.ready, certificate.issued — all firing from the right code paths. HMAC-signed payloads, automatic retries, delivery logs.",
    link: { href: "/dashboard/developer/webhooks", label: "Manage webhooks" },
  },
  {
    date: "May 20, 2026",
    tag: "Improvement",
    icon: Globe2,
    title: "Wider native-language coverage on the customer portal",
    body: "53 new strings translated accurately into Hindi, Bengali, Tamil, Telugu, and Marathi — covering home, courses, store, library, blog, footer, and sign-in flow. Other Indian languages fall back through English until natives land.",
  },
  {
    date: "May 17, 2026",
    tag: "Feature",
    icon: UserPlus,
    title: "Refer & Earn — built in",
    body: "Generate personal invite links with one form (friend's name, country, WhatsApp). Cross-tenant conversion log automatically flips invites to Joined when your friend completes signup. Reward: 1 month free per converted referral.",
    link: { href: "/features/refer-and-earn", label: "How it works" },
  },
  {
    date: "May 17, 2026",
    tag: "Feature",
    icon: Heart,
    title: "Wall of Love",
    body: "A public showcase of student work, quotes, and wins. Upload an image, drop a quote, embed a video. Pin the best ones. Tag by vibe — Love, Win, Creative, Milestone. Lives publicly at /wall.",
    link: { href: "/features/community", label: "See community" },
  },
  {
    date: "May 17, 2026",
    tag: "Feature",
    icon: Trophy,
    title: "Leaderboard with scoring rules",
    body: "Students earn points for attending classes, taking and passing quizzes, submitting assignments, completing lessons. Best score per item counts. Filter by course or last 7/30 days. Visible scoring rules — no black box.",
    link: { href: "/features/community", label: "See leaderboard" },
  },
  {
    date: "May 17, 2026",
    tag: "Feature",
    icon: Repeat,
    title: "Recurring live classes",
    body: "Schedule a single class or a whole series — daily, weekly, every-2/3/4 days, or custom. One Meet link reused across instances. Bulk-edit, bulk-cancel, bulk-notify from the list view.",
    link: { href: "/features/live-classes", label: "See live classes" },
  },
  {
    date: "May 17, 2026",
    tag: "Feature",
    icon: Video,
    title: "Post-class recap + attach-a-quiz",
    body: "After class, mark as held, drop the recording, paste the summary, attach materials — including quizzes and homework with due dates. Students see them on the class card with one-tap actions.",
    link: { href: "/features/live-classes", label: "Recap workflow" },
  },
  {
    date: "May 17, 2026",
    tag: "Feature",
    icon: Award,
    title: "Past Classes archive",
    body: "Browse every past session across every course. Filter by missing-recap so nothing slips. Embedded recordings + materials render inline; videos are width-capped so nothing overflows.",
    link: { href: "/features/live-classes", label: "See live classes" },
  },
  {
    date: "May 17, 2026",
    tag: "Feature",
    icon: Award,
    title: "Certificate Template Designer",
    body: "A drag-and-drop canvas editor for your own certificate templates. Six block types — Text, Rectangle, Circle, Signature (text or image), QR code, Image. 17 typefaces across Sans / Serif / Display / Signature / Mono. Bind any text block to a variable like {{student_name}}. Save, favourite, duplicate. Custom templates flow straight into the bulk-issue pipeline.",
    link: { href: "/features/certificates", label: "See the designer" },
  },
  {
    date: "May 17, 2026",
    tag: "Improvement",
    icon: Sparkles,
    title: "Brand refresh",
    body: "New wordmark — \"the\" + bold BIG + \"class\" — that visually echoes how the brand is said. New homepage with animated SVG orbit, six feature pages, dedicated pricing + use-cases + about pages.",
  },
]

export default function UpdatesPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <section className="relative overflow-hidden border-b border-border bg-gradient-to-b from-secondary/40 to-background">
          <div className="mx-auto max-w-4xl px-6 py-16 lg:px-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-semibold text-accent-foreground">
              <Sparkles className="h-3 w-3" /> Product updates
            </div>
            <h1 className="mt-4 text-4xl font-bold tracking-tight">What we shipped.</h1>
            <p className="mt-3 text-muted-foreground">
              Honest changelog. Every entry is something you can actually use today — no &quot;coming soon&quot;.
            </p>
          </div>
        </section>

        <section className="py-14">
          <div className="mx-auto max-w-3xl space-y-4 px-6 lg:px-8">
            {UPDATES.map((u, i) => (
              <UpdateCard key={`${u.title}-${i}`} entry={u} />
            ))}

            <div className="mt-10 rounded-xl border border-dashed border-border bg-card/50 p-6 text-center text-sm text-muted-foreground">
              Want updates delivered? Sign up for a workspace and we&apos;ll surface new features in your dashboard.
              <div className="mt-3">
                <Link href="/signup" className="text-primary font-semibold hover:underline">Launch your academy →</Link>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}

function UpdateCard({ entry }: { entry: UpdateEntry }) {
  const Icon = entry.icon
  const tagColor =
    entry.tag === "Feature"     ? "bg-primary/10 text-primary"          :
    entry.tag === "Improvement" ? "bg-accent/15 text-accent-foreground" :
    "bg-muted text-muted-foreground"
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${tagColor}`}>
                {entry.tag}
              </span>
              <span className="text-[11px] text-muted-foreground">{entry.date}</span>
            </div>
            <h2 className="mt-1 text-lg font-bold leading-snug">{entry.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{entry.body}</p>
            {entry.link && (
              <Link
                href={entry.link.href}
                className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
              >
                {entry.link.label} →
              </Link>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
