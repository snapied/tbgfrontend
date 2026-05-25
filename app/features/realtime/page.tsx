// Feature page — Real-time updates.
//
// Cross-channel notification fan-out — every meaningful event
// pings the right people across in-app, email, and WhatsApp.
// Mentions, broadcasts, recording-ready alerts, lead capture.

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
const PAGE_PATH = "/features/realtime"

export const metadata: Metadata = {
  title: "Real-time updates — notifications across every channel · The Big Class",
  description:
    "Mentions, batch posts, lead captures, recording-ready alerts — every event fans out in-app, email, and WhatsApp instantly. No webhooks to wire, no Zapier zaps to maintain.",
  keywords: [
    "real-time notifications LMS",
    "cross-channel notifications",
    "in-app email whatsapp notifications",
    "@mentions LMS",
    "broadcast notifications",
    "instant student alerts",
    "notification fan-out",
  ],
  alternates: { canonical: `${SITE_URL}${PAGE_PATH}` },
  openGraph: {
    type: "website",
    url: `${SITE_URL}${PAGE_PATH}`,
    siteName: "The Big Class",
    title: "Three channels. One pipeline.",
    description:
      "Every meaningful event pings the right people across in-app, email, and WhatsApp — automatically. No webhooks, no Zapier.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Real-time updates · The Big Class",
    description:
      "Cross-channel notifications across in-app, email, and WhatsApp. Mentions, broadcasts, lead alerts.",
  },
}

export default function RealtimeFeaturePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <FeaturePageShell
          eyebrow="Real-time updates"
          title={
            <>
              Three channels.{" "}
              <span className="text-primary">One pipeline</span>.
            </>
          }
          subtitle="Every meaningful event — a student tagging you, a new lead landing on your contact form, a recording finishing — fans out across in-app bell, email, and WhatsApp automatically. No webhooks to wire, no Zapier zaps to maintain, no missed notifications."
          heroImage="/tab_wedges.png"
        />

        <FeatureSplit
          title="@-mentions that pull people into the conversation."
          body={
            <>
              Tag a student or co-instructor in a batch post or reply. They get a louder &quot;<strong className="font-medium text-foreground">X tagged you in Cohort 7</strong>&quot; notification — in-app, email, and WhatsApp — even if they weren&apos;t already in the thread. Click the chip in the published post to open their profile in a new tab.
            </>
          }
          bullets={[
            "Tag picker shows teachers first, members below — alphabetised",
            "Tagged user gets a louder cross-channel ping than the regular broadcast",
            "Clicking the chip opens the profile in a new tab",
            "Self-mentions are silently filtered — no \"X tagged themselves\" noise",
            "Tagging in replies works too — pulls a new person into an active thread",
          ]}
          mockup={<MentionMockup />}
        />

        <FeatureSplit
          reverse
          title="Broadcast notifications on every cohort post."
          body={
            <>
              Drop a post in a Batch Common Room and every member gets a notification — in-app + email + WhatsApp (where they have phone numbers on file). Replies notify the post author plus everyone already in the thread. Tagged users get a separate louder ping so we don&apos;t double-notify them.
            </>
          }
          bullets={[
            "New post → notify every batch member except the author",
            "Reply → notify post author + all prior commenters in the thread",
            "Tagged users get the louder \"X tagged you\" notification, not the broadcast",
            "Email goes via your SMTP; WhatsApp via the same transport as other workspace messages",
            "Disable per-channel via the recipient's notification preferences",
          ]}
          mockup={<BroadcastMockup />}
        />

        <FeatureSplit
          title="Recording-ready emails — automatic."
          body={
            <>
              Stop recording → LiveKit finishes encoding → file uploads to R2 → backend poller detects the URL → instructor gets a workspace-branded email titled &quot;Recording ready — {`{class title}`}&quot; with a Watch button. No manual share. No &quot;hey did the recording come through?&quot; chat-group message.
            </>
          }
          bullets={[
            "Polls every 15 seconds — instructor sees the email within a minute of stopping",
            "Email is workspace-branded (your logo, your reply-to, your tone)",
            "Watch button links to the inline player dialog on the class detail page",
            "Same notification fans out to students if you opt-in",
            "Failure → email surfaces the error message + a manual retry link",
          ]}
          mockup={<RecordingEmailMockup />}
        />

        <FeatureSplit
          reverse
          title="Lead capture, instant alert."
          body={
            <>
              A visitor fills your public contact form. The lead lands in the dashboard. You get an in-app + email + WhatsApp notification within 10 seconds — with the lead&apos;s name, message, and a one-click Reply button that opens the inbox composer. New leads are accent-bordered in the inbox so the eye lands there first — they&apos;re the most revenue-sensitive signal in the workspace.
            </>
          }
          bullets={[
            "Lead lands → workspace admins notified across all 3 channels",
            "Accent-bordered row in the inbox surfaces it above routine items",
            "Reply from the inbox auto-bumps status to \"contacted\"",
            "Per-form routing — different forms can notify different admins",
            "Webhooks (roadmap) for forwarding to your CRM",
          ]}
          mockup={<LeadCaptureMockup />}
        />

        <FeatureCTA />
      </main>
      <Footer />
    </div>
  )
}

// ============================================================
// Mockup #1 — Mention notification
// ============================================================
function MentionMockup() {
  return (
    <PreviewFrame title="Notification bell">
      <div className="rounded-md border border-amber-400/40 bg-amber-50/30 p-3 dark:bg-amber-950/10">
        <p className="text-[11px] font-semibold">
          🔔 Dinesh tagged you in <span className="text-primary">Cohort 7</span>
        </p>
        <p className="mt-1 text-[10px] text-muted-foreground">
          &quot;@Renu can you weigh in on this question? It&apos;s right up your alley.&quot;
        </p>
        <p className="mt-2 text-[9px] text-muted-foreground">
          Fanned out across · 🔔 In-app · ✉️ Email · 📱 WhatsApp
        </p>
      </div>
    </PreviewFrame>
  )
}

// ============================================================
// Mockup #2 — Broadcast
// ============================================================
function BroadcastMockup() {
  return (
    <PreviewFrame title="Broadcast">
      <div className="space-y-2">
        <p className="text-[11px] font-semibold">
          Dinesh posted in Cohort 7 · 12s ago
        </p>
        <p className="text-[10px] text-muted-foreground">
          24 members will be pinged across:
        </p>
        <div className="grid grid-cols-3 gap-2 text-[10px]">
          <div className="rounded-md border border-border bg-card p-2 text-center">
            <p className="text-base">🔔</p>
            <p className="font-medium">24 in-app</p>
          </div>
          <div className="rounded-md border border-border bg-card p-2 text-center">
            <p className="text-base">✉️</p>
            <p className="font-medium">22 emails</p>
          </div>
          <div className="rounded-md border border-border bg-card p-2 text-center">
            <p className="text-base">📱</p>
            <p className="font-medium">18 WhatsApp</p>
          </div>
        </div>
        <p className="text-[9px] text-muted-foreground">
          Mentioned users get a separate louder notification — no double pings.
        </p>
      </div>
    </PreviewFrame>
  )
}

// ============================================================
// Mockup #3 — Recording-ready email
// ============================================================
function RecordingEmailMockup() {
  return (
    <PreviewFrame title="Email preview">
      <div className="rounded-md border border-border bg-card p-3">
        <p className="text-[11px] font-medium">
          Subject: Recording ready — Vedic maths · Squares
        </p>
        <div className="mt-2 border-t border-border pt-2">
          <p className="text-[10px] text-muted-foreground">
            The recording for <span className="font-semibold text-foreground">Vedic maths · Squares</span> has been uploaded and is ready to watch.
          </p>
          <div className="mt-3 inline-block rounded bg-primary px-3 py-1 text-[10px] font-medium text-primary-foreground">
            Watch recording →
          </div>
          <p className="mt-2 text-[9px] font-mono text-muted-foreground">
            cdn.thebigclass.com/recordings/tbc-abc123/...mp4
          </p>
        </div>
      </div>
    </PreviewFrame>
  )
}

// ============================================================
// Mockup #4 — Lead capture
// ============================================================
function LeadCaptureMockup() {
  return (
    <PreviewFrame title="Inbox · new lead">
      <div className="rounded-md border border-amber-400/50 bg-amber-50/40 p-3 dark:bg-amber-950/10">
        <div className="flex items-center justify-between">
          <span className="rounded bg-amber-200/60 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-amber-900 dark:text-amber-200">
            New lead
          </span>
          <span className="text-[9px] text-muted-foreground">10s ago</span>
        </div>
        <p className="mt-2 text-[11px] font-semibold">Riya reached out</p>
        <p className="mt-1 text-[10px] text-muted-foreground">
          Hi — interested in your IGCSE Computer Science cohort. Is there an EMI option?
        </p>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-[9px] text-muted-foreground">riya@gmail.com</span>
          <span className="rounded bg-primary px-2 py-0.5 text-[9px] font-medium text-primary-foreground">
            Reply
          </span>
        </div>
      </div>
    </PreviewFrame>
  )
}
