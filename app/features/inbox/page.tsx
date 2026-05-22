// Feature page — Unified Inbox.
//
// One front door for everything that needs a teacher's reply —
// doubts, discussions, leads, batch posts, blog comments. Inline
// reply fans out across in-app + email + WhatsApp.

import type { Metadata } from "next"
import { Header } from "@/components/landing/header"
import { Footer } from "@/components/landing/footer"
import {
  FeatureCTA,
  FeaturePageShell,
  FeatureSplit,
  PreviewFrame,
} from "@/components/landing/feature-page"

const SITE_URL = "https://thebigclass.com"
const PAGE_PATH = "/features/inbox"

export const metadata: Metadata = {
  title: "Unified Inbox — one place for every reply you owe · The Big Class",
  description:
    "Student doubts, discussions, public-site leads, cohort posts, blog comments — all in one inbox. Reply inline; we fan out the notification across in-app, email, and WhatsApp.",
  keywords: [
    "unified inbox LMS",
    "teacher inbox",
    "student doubts inbox",
    "lead management LMS",
    "reply across channels",
    "cross-channel notifications",
    "online teaching inbox",
  ],
  alternates: { canonical: `${SITE_URL}${PAGE_PATH}` },
  openGraph: {
    type: "website",
    url: `${SITE_URL}${PAGE_PATH}`,
    siteName: "The Big Class",
    title: "Stop checking five different pages.",
    description:
      "Every doubt, discussion, lead, and cohort post in one feed. Reply inline. We send your reply across in-app, email, and WhatsApp automatically.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Unified Inbox · The Big Class",
    description:
      "One feed for every reply you owe — students, leads, cohort posts. Inline reply fans out across channels.",
  },
}

export default function InboxFeaturePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <FeaturePageShell
          eyebrow="Unified Inbox"
          title={
            <>
              Stop checking{" "}
              <span className="text-primary">five different pages</span>.
            </>
          }
          subtitle="Every doubt, discussion, lead, batch post, and blog comment that needs your attention lives in one inbox. Reply inline; we send your reply across in-app, email, and WhatsApp — to the right channel for the right person."
          heroImage="/tab_wedges.png"
        />

        <FeatureSplit
          title="Five surfaces, one feed."
          body={
            <>
              The Inbox at <span className="font-medium text-foreground">/dashboard/inbox</span> aggregates everything that historically lived across five separate pages. Sorted newest-first. Filter pills slice by source. Pre-sale signals (guest doubts + new leads) get an accent border so the eye lands there first.
            </>
          }
          bullets={[
            "Open student questions (Doubts & Q&A)",
            "Discussions waiting on your reply",
            "Recent batch-room posts (last 7 days)",
            "New leads from your public site",
            "Unread blog comments based on per-post review markers",
            "Accent border on pre-sale signals (guest doubts + leads)",
          ]}
          mockup={<InboxMockup />}
        />

        <FeatureSplit
          reverse
          title="Reply without leaving."
          body={
            <>
              Click Reply on any row. The textarea expands inline. Type, hit Send. We append the reply to the source <strong className="font-medium text-foreground">and</strong> fire a notification across every channel the recipient is reachable on — bell, email, WhatsApp. No tab-switching, no copy-paste, no &quot;wait, did I reply to this on WhatsApp?&quot;
            </>
          }
          bullets={[
            "Doubts from logged-in students → in-app + email + WhatsApp",
            "Doubts from guests on your public site → email + WhatsApp (no in-app — no account)",
            "Discussions → in-app + email + WhatsApp to the author",
            "Leads → email + WhatsApp; auto-bumped from \"new\" to \"contacted\"",
            "Mark resolved with one click — no need to send a reply",
          ]}
          mockup={<InlineReplyMockup />}
        />

        <FeatureSplit
          title="Needs attention. Or show me everything."
          body={"Default view shows only open / unresolved items so you can triage fast. Toggle to Show all when you're trying to find a doubt you closed last week — resolved items reappear with a green Resolved badge. No 'mark as read' friction — once you handle the source, the row vanishes automatically."}
          bullets={[
            "Needs attention (default) — only open / unresolved items",
            "Show all — includes resolved doubts + contacted leads",
            "Auto-hide on resolution — no manual 'mark read' step",
            "Roll-up count badge in the sidebar so you never miss new items",
            "Counts per filter pill so you can scan source-by-source",
          ]}
          mockup={<NeedsAttentionMockup />}
        />

        <FeatureCTA />
      </main>
      <Footer />
    </div>
  )
}

// ============================================================
// Mockup #1 — Inbox feed
// ============================================================
function InboxMockup() {
  const items = [
    {
      kind: "Lead",
      title: "Riya reached out",
      preview: "Hi — interested in your IGCSE Computer Science cohort. Is there an EMI option?",
      who: "riya@gmail.com · 12m",
      accent: true,
    },
    {
      kind: "Question",
      title: "Question about \"Hooks deep dive\"",
      preview: "When does the useEffect cleanup function actually fire?",
      who: "Anaya · 2h",
      accent: false,
    },
    {
      kind: "Batch",
      title: "New post in Cohort 7",
      preview: "Just shipped my first React app — would love feedback!",
      who: "Dinesh · 4h",
      accent: false,
    },
    {
      kind: "Discussion",
      title: "How are people structuring their state?",
      preview: "useContext + useReducer pattern feels heavy for small apps…",
      who: "Renu · 1d",
      accent: false,
    },
  ]
  return (
    <PreviewFrame title="dashboard › inbox">
      <div className="space-y-1.5">
        {items.map((it) => (
          <div
            key={it.title}
            className={`flex items-start gap-2 rounded-md border p-2 ${
              it.accent
                ? "border-amber-400/40 bg-amber-50/40 dark:bg-amber-950/10"
                : "border-border bg-card"
            }`}
          >
            <span
              className={`inline-block rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${
                it.accent
                  ? "bg-amber-200/60 text-amber-900 dark:text-amber-200"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {it.kind}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[11px] font-semibold">{it.title}</p>
              <p className="line-clamp-1 text-[10px] text-muted-foreground">{it.preview}</p>
              <p className="text-[9px] text-muted-foreground">{it.who}</p>
            </div>
          </div>
        ))}
      </div>
    </PreviewFrame>
  )
}

// ============================================================
// Mockup #2 — Inline reply
// ============================================================
function InlineReplyMockup() {
  return (
    <PreviewFrame title="Inline reply">
      <div className="rounded-md border border-border bg-card p-3">
        <p className="text-[11px] font-semibold">Question about Hooks deep dive</p>
        <p className="mt-1 text-[10px] text-muted-foreground">
          When does the useEffect cleanup function actually fire?
        </p>
        <div className="mt-3 rounded-md bg-muted/40 p-2">
          <p className="text-[10px] text-muted-foreground">Your reply</p>
          <p className="mt-1 text-[10px]">
            Cleanup runs before the next effect, and on unmount. Watch lesson 4 again — I covered this around 12:30.
          </p>
        </div>
        <div className="mt-2 flex items-center justify-between text-[9px] text-muted-foreground">
          <span>Will send to Anaya via in-app · email · WhatsApp</span>
          <span className="rounded bg-primary px-2 py-0.5 text-[9px] font-medium text-primary-foreground">
            Send reply
          </span>
        </div>
      </div>
    </PreviewFrame>
  )
}

// ============================================================
// Mockup #3 — Mode toggle
// ============================================================
function NeedsAttentionMockup() {
  return (
    <PreviewFrame title="Mode toggle">
      <div className="space-y-3">
        <div className="inline-flex rounded-full border border-border bg-card p-0.5">
          <span className="rounded-full bg-primary px-3 py-1 text-[10px] font-medium text-primary-foreground">
            Needs attention
          </span>
          <span className="rounded-full px-3 py-1 text-[10px] font-medium text-muted-foreground">
            Show all
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {[
            ["All", 8, true],
            ["Questions", 3, false],
            ["Discussions", 2, false],
            ["Leads", 1, false],
            ["Batches", 2, false],
            ["Blog", 0, false],
          ].map(([label, count, active]) => (
            <span
              key={label as string}
              className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] ${
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground"
              }`}
            >
              {label as string}
              {(count as number) > 0 && (
                <span className="rounded-full bg-background/30 px-1 text-[8px]">
                  {count as number}
                </span>
              )}
            </span>
          ))}
        </div>
        <p className="rounded-md border border-success/30 bg-success/[0.04] p-2 text-[10px] text-success">
          ✓ Marked resolved · Row auto-hides from Needs attention view
        </p>
      </div>
    </PreviewFrame>
  )
}
