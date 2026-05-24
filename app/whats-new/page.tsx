// Changelog / What's New page.
//
// Single browsable place that captures every meaningful improvement
// shipped on the product. Lives at /whats-new so the marketing footer
// + dashboard "What's new" links resolve to one canonical URL.
//
// SEO: rich metadata so the changelog is its own crawlable surface —
// new buyers comparing tools land here and see how active the product
// is. No client-side state needed; this is a server-rendered list.

import Link from "next/link"
import type { Metadata } from "next"
import { Header } from "@/components/landing/header"
import { Footer } from "@/components/landing/footer"
import { Badge } from "@/components/ui/badge"

const SITE_URL = "https://thebigclass.com"

export const metadata: Metadata = {
  title: "What's new · The Big Class",
  description:
    "Every meaningful improvement shipped on The Big Class — live class recording, unified inbox, cohort community tools, simpler forms, and more. Updated as we ship.",
  alternates: { canonical: `${SITE_URL}/whats-new` },
  openGraph: {
    title: "What's new on The Big Class",
    description:
      "Live class cloud recording, unified inbox with inline replies, cohort community with @mentions, Simple/Advanced forms, and more — the running changelog.",
    url: `${SITE_URL}/whats-new`,
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "What's new on The Big Class",
    description:
      "Cloud recording, unified inbox, cohort community, simpler forms, sticky onboarding. The running product changelog.",
  },
}

interface ChangeItem {
  title: string
  body: string
  href?: string
}

interface ChangeSection {
  id: string
  emoji: string
  title: string
  blurb: string
  items: ChangeItem[]
}

const SECTIONS: ChangeSection[] = [
  {
    id: "live-classes",
    emoji: "🎥",
    title: "Live classes you can run from the browser",
    blurb:
      "We moved off the self-hosted Jitsi stack onto LiveKit Cloud — same one-link experience for students, dramatically more reliable media, and recording you actually trust.",
    items: [
      {
        title: "LiveKit-powered live rooms",
        body: "In-house live calls now run on LiveKit Cloud. No moderator-gate prompts, no XMPP / Prosody / Jicofo octopus to host, no UDP forwarding gymnastics on local dev. Same join-link experience for your students.",
        href: "/help/live-classes-livekit",
      },
      {
        title: "Cloud recording → your CDN",
        body: "Start recording inside the host view; LiveKit's egress workers capture the composited room, encode at 1080p / 30fps, and upload the MP4 directly to your Cloudflare R2 bucket. The instructor gets an email the moment the file lands.",
        href: "/help/live-classes-recordings",
      },
      {
        title: "Watch recordings inline (new dialog)",
        body: "Click Watch on any past class and the recording opens in an inline player dialog with full playback controls. Supports MP4 files, YouTube, Loom, Vimeo, and Wistia — falls back to a download link for anything else.",
        href: "/help/recording-player-dialog",
      },
      {
        title: "Recordings index page",
        body: "A new /dashboard/recordings sidebar entry lists every class with a recording in one searchable table — duration, recorded date, the linked course. No more hunting through individual classes to find one you watched last week.",
        href: "/help/recordings-index",
      },
      {
        title: "Zen mode for live calls",
        body: "When you're inside a class, the dashboard sidebar and header vanish so the call takes the whole viewport. Same treatment for students on the join page — students see exactly the class, nothing else.",
      },
      {
        title: "1080p across the pipeline",
        body: "Browser captures at 1080p, LiveKit publishes at 1080p simulcast, and the egress encoder writes 1080p / 30fps MP4. Screen share goes higher (1440p) so slides + IDE text read sharp.",
      },
    ],
  },
  {
    id: "inbox",
    emoji: "📬",
    title: "Unified Inbox",
    blurb:
      "Stop checking five different pages. The new Inbox aggregates everything that needs your attention — and lets you reply without leaving the page.",
    items: [
      {
        title: "One front door for everything",
        body: "Doubts, discussions, batch-room posts, public-site leads, and unread blog comments all land in /dashboard/inbox. Sorted newest-first. Filter pills slice by source.",
        href: "/help/inbox",
      },
      {
        title: "Inline reply with cross-channel fanout",
        body: "Click Reply on any row to type a response without leaving — your reply gets appended to the source and fires a notification across in-app, email, and WhatsApp to the original sender. Guests with only an email get email + WhatsApp.",
        href: "/help/inbox-reply",
      },
      {
        title: "Needs attention vs Show all",
        body: "Default view shows open / unresolved items. Toggle to Show all to surface resolved doubts and contacted leads with a status badge — useful when triaging a backlog.",
      },
      {
        title: "Pre-sale signals are highlighted",
        body: "Guest doubts (from your public site) and new leads get an accent border because they're the highest revenue-sensitive items. The eye lands there first.",
      },
    ],
  },
  {
    id: "community",
    emoji: "👥",
    title: "Cohort community tools",
    blurb:
      "Your Batch detail page just became a Slack-grade workspace — minus Slack. Mentions, file previews, broadcasts, post editing.",
    items: [
      {
        title: "@-mention picker",
        body: "Click Tag in the composer, pick a teacher or member, and a styled @Name chip drops into the post. Click the chip in a published post to open the profile in a new tab.",
        href: "/help/batches-mentions",
      },
      {
        title: "Type-aware file previews",
        body: "Click Attach to upload anything. Images render as thumbnails, videos play inline, audio gets an audio widget, PDFs open in an embedded viewer, and other files become download chips with the filename + size.",
        href: "/help/batches-attachments",
      },
      {
        title: "Broadcast notifications",
        body: "Every new post fires an in-app + email + WhatsApp notification to every member of the batch (skipping the author). Replies notify the post author plus anyone who already commented in the thread.",
      },
      {
        title: "Mention notifications are louder",
        body: "Tagging someone fires a separate \"X tagged you in {Batch}\" notification with the author's name in the title — it beats the regular broadcast and pulls the tagged user into the conversation.",
      },
      {
        title: "Edit posts",
        body: "Author or admin can edit any post via the ⋯ menu. Edited posts show a subtle \"edited · 3m\" footnote so readers know it changed.",
      },
      {
        title: "Instructors pinned at the top",
        body: "A Instructors card sits above the feed showing the course's primary instructor + co-instructors as chips. Member count is on the right. Everyone knows who's leading at a glance.",
      },
    ],
  },
  {
    id: "onboarding",
    emoji: "🚀",
    title: "Onboarding + simpler forms",
    blurb:
      "New tenants land on a guided path. Returning power users keep their full surface. Both happy.",
    items: [
      {
        title: "Get started in 5 minutes",
        body: "A 4-step rail at the top of the dashboard (create your first course → add a lesson → schedule a live class → invite a student) tracks progress automatically and self-hides once you're done.",
        href: "/help/getting-started",
      },
      {
        title: "Collapsible sidebar",
        body: "The 30-item sidebar is now 5 collapsible sections (Teach · Certificates · Community · Public site · Workspace), with Dashboard pinned at the top. State sticks across navigations; the section you're in auto-expands.",
        href: "/help/sidebar-groups",
      },
      {
        title: "Simple / Advanced form mode",
        body: "Course creation and Live-class creation now default to Simple mode — only the essentials are visible. Flip the pill in the header to Advanced for the full surface (certificate template, learning outcomes, recurrence, host picker, channel-level notify toggles). Sticks per browser.",
        href: "/help/simple-advanced",
      },
      {
        title: "Product tours on every key form",
        body: "Course creation, live-class scheduling, the Inbox, and the Batch detail page each ship a step-by-step tour with a Take a tour button in the header. Auto-flips Simple/Advanced toggles during the walkthrough so you see what each mode contains.",
      },
    ],
  },
  {
    id: "polish",
    emoji: "✨",
    title: "Polish + bug fixes",
    blurb:
      "Less spectacular, but the kind of things that quietly add up.",
    items: [
      {
        title: "Quiz creation in the follow-up composer",
        body: "Post follow-up → Quiz tile now actually opens the Quick Quiz Dialog. Previously the tile rendered but didn't fire on class detail pages.",
      },
      {
        title: "HTML-safe assignment previews",
        body: "Description previews in the assignments table now strip HTML so a WYSIWYG paragraph reads as plain text instead of <p>asdf</p>.",
      },
      {
        title: "\"From class\" deep-link on assignments",
        body: "Assignments created from a class settings page now show a small From class · {title} link beneath the description — one click back to the source.",
      },
      {
        title: "Notify channels collapsed by default",
        body: "Assignment composer no longer shows 3 toggle rows up front. A single line summarises which channels will fire; click Customize to expand and mute one.",
      },
      {
        title: "Confirm before deleting a space",
        body: "Removing a Batch space now asks for confirmation. Same dialog pattern as the rest of the app.",
      },
      {
        title: "Profile sheet redesign",
        body: "Member profile sheet (Batch directory → click a member) no longer drifts the avatar to the wrong corner. Cover stretches edge-to-edge, avatar lands bottom-left as designed.",
      },
    ],
  },
]

export default function WhatsNewPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        {/* Hero */}
        <section className="border-b border-border bg-gradient-to-b from-primary/[0.04] to-background">
          <div className="mx-auto max-w-4xl px-6 py-16 sm:py-24">
            <Badge variant="outline" className="mb-4 text-xs">
              Changelog
            </Badge>
            <h1 className="font-serif text-4xl font-bold tracking-tight sm:text-5xl">
              What&apos;s new
            </h1>
            <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
              The running list of meaningful improvements we&apos;ve shipped — cloud recording, a unified inbox, cohort community tools, an onboarding rail, and the small stuff that quietly piles up. Most items link to a help article that goes deeper.
            </p>
          </div>
        </section>

        {/* Table of contents */}
        <section className="border-b border-border bg-card">
          <div className="mx-auto max-w-4xl px-6 py-6">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Jump to
            </p>
            <ul className="flex flex-wrap gap-2">
              {SECTIONS.map((s) => (
                <li key={s.id}>
                  <a
                    href={`#${s.id}`}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 text-sm font-medium hover:border-primary/40 hover:bg-primary/[0.04]"
                  >
                    <span>{s.emoji}</span>
                    {s.title}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Sections */}
        <section className="bg-background">
          <div className="mx-auto max-w-4xl space-y-16 px-6 py-16">
            {SECTIONS.map((s) => (
              <article key={s.id} id={s.id} className="scroll-mt-24">
                <header className="mb-6">
                  <h2 className="flex items-center gap-3 font-serif text-2xl font-bold tracking-tight sm:text-3xl">
                    <span aria-hidden>{s.emoji}</span>
                    {s.title}
                  </h2>
                  <p className="mt-2 max-w-2xl text-muted-foreground">{s.blurb}</p>
                </header>
                <ul className="space-y-4">
                  {s.items.map((item) => (
                    <li
                      key={item.title}
                      className="rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/40"
                    >
                      <h3 className="text-base font-semibold">{item.title}</h3>
                      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                        {item.body}
                      </p>
                      {item.href && (
                        <Link
                          href={item.href}
                          className="mt-2 inline-flex items-center text-sm font-medium text-primary hover:underline"
                        >
                          Read the help doc →
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>

        {/* Outro CTA */}
        <section className="border-t border-border bg-card">
          <div className="mx-auto max-w-4xl px-6 py-12 text-center">
            <h2 className="font-serif text-2xl font-bold">More on the way</h2>
            <p className="mt-2 max-w-xl mx-auto text-muted-foreground">
              We ship every week. Bookmark this page or follow our changelog for what&apos;s next.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link
                href="/help"
                className="inline-flex items-center rounded-md border border-border bg-background px-4 py-2 text-sm font-medium hover:border-primary/40"
              >
                Browse help docs
              </Link>
              <Link
                href="/signup"
                className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Try The Big Class free
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
