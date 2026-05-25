// Feature page — Cloud recording.
//
// Server-side recording via LiveKit egress, uploaded straight to
// your S3-compatible CDN. Auto-emails instructor when ready,
// recordings index lists every class, inline player dialog.

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
const PAGE_PATH = "/features/recordings"

export const metadata: Metadata = {
  title: "Cloud class recording — straight to your CDN · The Big Class",
  description:
    "Server-side recording for every live class. 1080p MP4 uploads directly to your Cloudflare R2 bucket. Auto-emails the instructor when ready. Inline player on every class page.",
  keywords: [
    "class recording",
    "cloud class recording",
    "livekit recording",
    "automated class recording",
    "online teaching recording",
    "course recording library",
    "cloudflare r2 video hosting",
  ],
  alternates: { canonical: `${SITE_URL}${PAGE_PATH}` },
  openGraph: {
    type: "website",
    url: `${SITE_URL}${PAGE_PATH}`,
    siteName: "The Big Class",
    title: "Click Start. We do the rest.",
    description:
      "Server-side recording → encoded → uploaded → email sent. You teach the class. The MP4 shows up on your CDN.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Cloud recording · The Big Class",
    description:
      "Server-side class recording uploaded straight to your CDN. No browser to keep open, no FFmpeg to run.",
  },
}

export default function RecordingsFeaturePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <FeaturePageShell
          eyebrow="Cloud recording"
          title={
            <>
              Click <span className="text-primary">Start</span>. We do the rest.
            </>
          }
          subtitle="Server-side recording for every live class — captured by LiveKit's egress workers, encoded at 1080p, uploaded directly to your Cloudflare R2 bucket. The instructor gets an email the moment the MP4 lands. No browser to keep open, no FFmpeg to run, no transcoding service to set up."
          heroImage="/tab_wedges.png"
        />

        <FeatureSplit
          title="The recording survives a closed laptop."
          body={
            <>
              Most LMS platforms record in the host&apos;s browser. Close the tab, lose the recording. Ours runs <strong className="font-medium text-foreground">server-side</strong> — LiveKit spins up a headless browser that joins the room and captures the composited view. You can close your laptop, switch devices, or even leave the call early. The recording keeps running.
            </>
          }
          bullets={[
            "Server-side capture — independent of the host's browser",
            "Captures the full composited room — every participant",
            "1080p / 30fps H.264 MP4, screen share at 1440p",
            "Direct upload to S3-compatible storage (Cloudflare R2 by default)",
            "Auto-email to the instructor when the file lands — link included",
          ]}
          mockup={<RecordingStartMockup />}
        />

        <FeatureSplit
          reverse
          title="One library for every recording."
          body={
            <>
              The new <span className="font-medium text-foreground">/dashboard/recordings</span> page lists every class with a recording in one searchable table — title, course, duration, recorded date. Click Watch and the recording plays inline in a dialog with full HTML5 controls. No new-tab navigation, no &quot;wait, which Google Drive folder did this go in?&quot;
            </>
          }
          bullets={[
            "Single library at /dashboard/recordings — every class with a recording",
            "Fuzzy search across class titles",
            "Inline player dialog — MP4 / WebM + common video-host embed URLs",
            "Native HTML5 controls + picture-in-picture",
            "Same player surfaces on class detail, past meetings, and student view",
          ]}
          mockup={<RecordingsLibraryMockup />}
        />

        <FeatureSplit
          title="Your bucket. Your CDN. Your cost basis."
          body={
            <>
              Recordings upload directly to your Cloudflare R2 bucket. Files are served from your CDN — never proxied through our backend. You own the URLs, you pay for storage at R2&apos;s rates (~$0.015/GB/month), and you get unlimited egress for free because Cloudflare doesn&apos;t charge for it.
            </>
          }
          bullets={[
            "Direct upload to your S3-compatible bucket — no middleman",
            "Files served from your CDN domain (cdn.yourdomain.com)",
            "Cloudflare R2: ~$0.015/GB/month storage, free egress",
            "S3, MinIO, Wasabi, Backblaze all supported via the same config",
            "Recording metadata stored locally — file URLs only saved if upload succeeds",
          ]}
          mockup={<R2UploadMockup />}
        />

        {/* Playback + discovery — the recently-shipped player +
            list improvements. Card grid so the visitor sees all
            of them at once instead of scrolling through 5
            FeatureSplits. */}
        <section className="border-y border-border bg-muted/30 py-16">
          <div className="mx-auto max-w-6xl px-6 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-xs font-bold uppercase tracking-wider text-primary">
                Player + library
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
                Watch the way you actually watch lectures.
              </h2>
              <p className="mt-3 text-base text-muted-foreground">
                Speed control, chapter navigation, resume-where-you-left-off,
                searchable transcripts, and a list that knows what you&rsquo;ve
                already watched.
              </p>
            </div>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <PlayerCard
                title="Auto-generated chapters"
                body="Transcript-derived chapter markers parsed from transition phrases (&ldquo;Now let's talk about&hellip;&rdquo;, &ldquo;Moving on to&hellip;&rdquo;). Click to seek. 5–12 chapters per recording, ≥90s spacing so you never get a chapter cluster."
              />
              <PlayerCard
                title="Playback speed"
                body="0.75× / 1× / 1.25× / 1.5× / 2× chips below the video. Speed persists across recordings — set 1.5× once, every video opens at 1.5×."
              />
              <PlayerCard
                title="Resume from last position"
                body="Player remembers where you stopped. Open it again → ‘Resume from 12:34?’ overlay. Watched-90% trips the Completed badge."
              />
              <PlayerCard
                title="Class chat in the recording"
                body="Side-channel chat from the live class persists alongside the video. Re-watchers see the questions that came up in real time, not just the lecture."
              />
              <PlayerCard
                title="Watch-state filters"
                body="Unwatched / In progress / Watched chips on the recordings list, with live counts. Slice a 40-recording backlog down to the 8 you haven't started yet."
              />
              <PlayerCard
                title="Visibility tier filter"
                body="Filter the list by who can see each recording — Public, Enrolled, Community, or Link only. Self-hides on workspaces where everything is set to the default tier."
              />
            </div>
          </div>
        </section>

        <FeatureCTA />
      </main>
      <Footer />
    </div>
  )
}

// ============================================================
// Mockup #1 — Start recording control
// ============================================================
function RecordingStartMockup() {
  return (
    <PreviewFrame title="Live class · host view">
      <div className="rounded-md border border-border bg-black p-3 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-red-500" />
            <span className="text-[11px] font-semibold uppercase tracking-wide">
              Recording
            </span>
            <span className="text-[10px] text-white/60">· 12:34</span>
          </div>
          <span className="rounded bg-white/10 px-2 py-1 text-[10px] font-medium">
            ⬛ Stop recording
          </span>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="aspect-video rounded bg-gradient-to-br from-rose-500/30 to-rose-700/20" />
          <div className="aspect-video rounded bg-gradient-to-br from-sky-500/30 to-sky-700/20" />
        </div>
      </div>
      <p className="mt-2 text-[10px] text-muted-foreground">
        Uploading to <span className="font-mono">cdn.thebigclass.com/recordings/…</span> · LiveKit egress
      </p>
    </PreviewFrame>
  )
}

// ============================================================
// Mockup #2 — Recordings library
// ============================================================
function RecordingsLibraryMockup() {
  const items = [
    { title: "Vedic maths · Squares & cubes", course: "Vedic maths · 10-14", duration: "47 min", when: "2h ago" },
    { title: "Hooks deep dive — class 4", course: "React for builders", duration: "62 min", when: "1d ago" },
    { title: "ER diagrams from scratch", course: "Database fundamentals", duration: "55 min", when: "3d ago" },
    { title: "Cohort 7 launch Q&A", course: "—", duration: "38 min", when: "5d ago" },
  ]
  return (
    <PreviewFrame title="dashboard › recordings">
      <div className="space-y-1.5">
        {items.map((it) => (
          <div
            key={it.title}
            className="flex items-center gap-3 rounded-md border border-border bg-card p-2"
          >
            <div className="grid h-10 w-14 place-items-center rounded bg-gradient-to-br from-primary/15 to-accent/5">
              <span className="text-base">▶</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[11px] font-semibold">{it.title}</p>
              <p className="text-[9px] text-muted-foreground">
                {it.course} · {it.duration} · {it.when}
              </p>
            </div>
            <span className="rounded border border-border bg-background px-2 py-0.5 text-[9px] font-medium">
              Watch
            </span>
          </div>
        ))}
      </div>
    </PreviewFrame>
  )
}

// ============================================================
// Player + library — compact card
// ============================================================
function PlayerCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h3 className="text-sm font-bold leading-snug">{title}</h3>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{body}</p>
    </div>
  )
}

// ============================================================
// Mockup #3 — R2 upload trace
// ============================================================
function R2UploadMockup() {
  return (
    <PreviewFrame title="Upload flow">
      <div className="space-y-2 text-[10px]">
        <div className="rounded-md border border-success/30 bg-success/[0.04] p-2 font-mono text-success">
          ✓ recordings/tbc-abc123/2026-05-20T06-04-29-235Z.mp4 — 87.4 MB
        </div>
        <p className="text-[9px] text-muted-foreground">
          Direct upload — no proxy through your server. Cloudflare R2 default region,
          ~30s for a 60-minute class.
        </p>
        <div className="rounded-md border border-border bg-card p-2">
          <p className="font-mono text-[10px] text-primary">
            https://cdn.thebigclass.com/recordings/...mp4
          </p>
          <p className="mt-1 text-[9px] text-muted-foreground">
            Stamped on the class record. Auto-emailed to the instructor.
          </p>
        </div>
      </div>
    </PreviewFrame>
  )
}
