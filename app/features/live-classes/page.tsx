"use client"

import {
  BarChart3,
  Bell,
  CalendarCheck,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  Clock,
  ExternalLink,
  Film,
  Globe,
  Hand,
  Mail,
  MessageSquare,
  Mic,
  NotebookPen,
  Pin,
  Play,
  Repeat,
  Sparkles,
  Users,
  Video,
} from "lucide-react"
import { Header } from "@/components/landing/header"
import { Footer } from "@/components/landing/footer"
import {
  FeatureCTA,
  FeaturePageShell,
  FeatureSplit,
  PreviewFrame,
} from "@/components/landing/feature-page"

export default function LiveClassesFeaturePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <FeaturePageShell
          eyebrow="Live classes"
          title={<>Live classes that don&apos;t end when you say <span className="text-primary">&quot;bye for now&quot;</span>.</>}
          subtitle="Built-in cloud room — no third-party video-conferencing seat needed for you or your students. Cloud recording uploads straight to your CDN. We send the invites, mark attendance, stitch the recap, and email everyone when the recording is ready. Zero infra to host."
          heroImage="/images/features/live-classes.png"
        />

        <FeatureSplit
          title="Built-in cloud room. No third-party seat. Recording included."
          body={
            <>
              Click <span className="font-medium text-foreground">Start instant class</span> and the room is live. Students open the join link, set a name once, and they&apos;re in — no account, no app install. The whole stack runs on <span className="font-medium text-foreground">LiveKit Cloud</span>, so media is rock-solid even with 30+ participants. Already paying for a video-conferencing seat? Flip to Advanced and paste your room URL — we&rsquo;ll auto-detect the provider.
            </>
          }
          bullets={[
            "In-house room runs on LiveKit Cloud — no XMPP, no UDP forwarding",
            "Students join with a display name, no signup, no app",
            "Adaptive 1080p simulcast — weak networks downgrade gracefully",
            "Or paste a third-party meeting URL — provider auto-detected",
          ]}
          mockup={<RecurringSchedulerMockup />}
        />

        <FeatureSplit
          reverse
          title="One click → cloud recording → your CDN."
          body={
            <>
              Hit <span className="font-medium text-foreground">Start recording</span> inside the host view. LiveKit&apos;s egress workers capture the full composited room, encode 1080p / 30fps MP4, and upload directly to your Cloudflare R2 bucket — never touches your server. The instructor gets an email the moment the file lands. Students see a Watch button on the class detail page.
            </>
          }
          bullets={[
            "Server-side recording — keeps running if you close your browser",
            "1080p / 30fps H.264 MP4, screen share at 1440p",
            "Direct upload to Cloudflare R2 (your bucket, your CDN, your cost basis)",
            "Watch button opens an inline player dialog — no new-tab navigation",
            "/dashboard/recordings index lists every class with a recording",
          ]}
          mockup={<ClassRecapMockup />}
        />

        <FeatureSplit
          title="Schedule a one-off — or a 12-week cohort — in the same form."
          body={
            <>
              The schedule form defaults to <span className="font-medium text-foreground">Simple</span> — title, when, duration, done. Flip to Advanced for <span className="font-medium text-foreground">Repeats</span>: daily, weekly, every 2/3/4 days, or a custom interval. End after N sessions or by a date. Each instance gets its own attendance, recap, and follow-up.
            </>
          }
          bullets={[
            "Simple / Advanced mode — sensible defaults visible, decisions opt-in",
            "One link reused across the whole series",
            "Edit one instance without breaking the rest",
            "Bulk-cancel, bulk-delete, bulk-notify from the list",
            "WhatsApp + email + in-app reminders fire once per series",
          ]}
          mockup={<RecurringSchedulerMockup />}
        />

        <FeatureSplit
          reverse
          title="Reminders that actually land."
          body="Three windows fire automatically — T-3h, T-1h, T-15m — across the channels each student opted into. In-app bell, email, WhatsApp. Each delivery shows up in the student's inbox under the right channel tab so they can see we tried even if their inbox was full. Re-send manually from the session card; we stamp markers so you can't accidentally double-ping."
          bullets={[
            "Automatic T-3h / T-1h / T-15m windows (no cron to configure)",
            "Channel-respecting — honours each student's notification prefs",
            "Every dispatch is logged to the student inbox (in-app + email + WhatsApp tabs)",
            "Resend or bulk-notify from the session card",
          ]}
          mockup={<MultiChannelRemindersMockup />}
        />

        <FeatureSplit
          title="The class ends. The class card doesn't."
          body="Mark the session as held, drop the recording URL, paste the summary, and attach materials — slides, Canva embeds, PDFs, screenshots, even a follow-up quiz or homework brief. Students who attended (and the ones who didn't) come back to one page with everything."
          bullets={[
            "Embed recordings from any common video host or direct MP4 URL",
            "Attach quizzes with one click — students take them in-app",
            "Assign homework with a due date and an optional brief",
            "Past Classes archive surfaces sessions missing a recap",
            "Class chat history persists alongside the recording",
            "AI-draft button on the wrap-wizard summary",
          ]}
          mockup={<ClassRecapMockup />}
        />

        {/* In-class engagement grid — surfaces the 6 new
            capabilities shipped over the last three days. Card
            grid (not FeatureSplit) because each is small and the
            visitor benefits from seeing the breadth at once. */}
        <section className="border-y border-border bg-muted/30 py-16">
          <div className="mx-auto max-w-6xl px-6 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-xs font-bold uppercase tracking-wider text-primary">
                Inside the live room
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
                Engagement primitives every class needs.
              </h2>
              <p className="mt-3 text-base text-muted-foreground">
                Six features that used to require third-party plugins or
                separate tools — all native, all persisted to the recording.
              </p>
            </div>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <InClassCard
                icon={<BarChart3 className="h-5 w-5" />}
                title="Live polls"
                body="2–4 option polls with a launch composer in the host rail and a vote card on every student's stage. Results update live. Launch and result broadcasts fan out as notifications to every invited participant — even the ones who weren't in the room."
                bullet="Notifications hit students + co-instructors"
              />
              <InClassCard
                icon={<Hand className="h-5 w-5" />}
                title="Raised-hand queue"
                body="Students raise hands without unmuting. The host sees them ordered by raise time with Answer / Lower buttons. The button pulses primary the moment any hand goes up so the host doesn't need the panel open to know."
                bullet="Live #N in queue badge for students"
              />
              <InClassCard
                icon={<ClipboardList className="h-5 w-5" />}
                title="Mark agenda done"
                body="The agenda you set pre-class becomes a host checklist mid-class. Tap ✓ to mark done, ⏭ to skip — each with a timestamp. Late joiners see real coverage instead of time-inferred guesses."
                bullet="Header chip shows 3/7 covered"
              />
              <InClassCard
                icon={<Users className="h-5 w-5" />}
                title="Waiting-room presence"
                body="The host preflight shows 'N waiting now' and the first 5 names live as students arrive in the lobby. No more guessing whether to open the room with only one student visible."
                bullet="3s polling, 15s staleness window"
              />
              <InClassCard
                icon={<Clock className="h-5 w-5" />}
                title="Time-left pill"
                body="Host-only in-call indicator that shows 'Time left: 18m' while in window, flips to amber (+7m over) past the planned end, and red after +15 min. Wrap-up cues without checking the clock."
                bullet="30s tick, no CPU burn"
              />
              <InClassCard
                icon={<MessageSquare className="h-5 w-5" />}
                title="Chat persists to recording"
                body="The class chat doesn't evaporate when the room closes. Every message is buffered live, flushed to the session record on End, and rendered alongside the video so re-watchers get the side-channel context."
                bullet="Session.chatTranscript field"
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

// Compact card used in the "Inside the live room" grid. Each card
// is intentionally small — the breadth of capabilities lands at a
// glance; deep-dives live in the per-feature help docs.
function InClassCard({
  icon,
  title,
  body,
  bullet,
}: {
  icon: React.ReactNode
  title: string
  body: string
  bullet: string
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 transition-shadow hover:shadow-md">
      <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </div>
      <h3 className="mt-3 font-semibold">{title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{body}</p>
      <p className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-semibold text-primary">
        <Sparkles className="h-3 w-3" />
        {bullet}
      </p>
    </div>
  )
}

// ============================================================
// Mockup #1 — Recurring scheduler
// Cadence pill row + full mini calendar with the 4 recurring
// instances highlighted across consecutive Mondays.
// ============================================================

function RecurringSchedulerMockup() {
  return (
    <PreviewFrame title="dashboard › classes › new">
      {/* Cadence row */}
      <div className="mb-3 flex flex-wrap items-center gap-1.5 text-[10px]">
        <span className="font-medium text-foreground/80">Repeats</span>
        {[
          ["Doesn't repeat", false],
          ["Daily",          false],
          ["Weekly",         true],
          ["Every 3 days",   false],
          ["Custom",         false],
        ].map(([label, active]) => (
          <span
            key={label as string}
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 ${
              active
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border text-muted-foreground"
            }`}
          >
            {active && <Repeat className="h-2.5 w-2.5" />}
            {label as string}
          </span>
        ))}
      </div>

      {/* Mini calendar */}
      <MiniMonth />

      {/* Summary chip */}
      <div className="mt-3 flex items-center gap-2 rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-[11px]">
        <Repeat className="h-3.5 w-3.5 text-primary" />
        <div className="flex-1">
          <p className="font-semibold">4 sessions will be created</p>
          <p className="text-[10px] text-muted-foreground">First Mon May 18 · last Mon Jun 8 · 7:00 pm IST · 60 min</p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-md bg-success/15 px-1.5 py-0.5 text-[9px] font-semibold text-success">
          <CheckCircle2 className="h-3 w-3" /> Ready
        </span>
      </div>
    </PreviewFrame>
  )
}

function MiniMonth() {
  // May 2026 — 1st falls on a Friday. Highlight Mondays 18, 25; June 1, 8
  // (the recurring series). The first Monday gets a "today" treatment.
  const days = [
    { d: 27, mute: true }, { d: 28, mute: true }, { d: 29, mute: true }, { d: 30, mute: true },
    { d: 1 }, { d: 2 }, { d: 3 },
    { d: 4 }, { d: 5 }, { d: 6 }, { d: 7 }, { d: 8 }, { d: 9 }, { d: 10 },
    { d: 11 }, { d: 12 }, { d: 13 }, { d: 14 }, { d: 15 }, { d: 16 }, { d: 17 },
    { d: 18, session: 1, today: true }, { d: 19 }, { d: 20 }, { d: 21 }, { d: 22 }, { d: 23 }, { d: 24 },
    { d: 25, session: 2 }, { d: 26 }, { d: 27 }, { d: 28 }, { d: 29 }, { d: 30 }, { d: 31 },
    { d: 1,  session: 3, junemark: true }, { d: 2, mute: true }, { d: 3, mute: true }, { d: 4, mute: true }, { d: 5, mute: true }, { d: 6, mute: true }, { d: 7, mute: true },
    { d: 8,  session: 4, junemark: true }, { d: 9, mute: true }, { d: 10, mute: true }, { d: 11, mute: true }, { d: 12, mute: true }, { d: 13, mute: true }, { d: 14, mute: true },
  ]
  return (
    <div className="overflow-hidden rounded-md border border-border/60 bg-card">
      <div className="flex items-center justify-between border-b border-border/60 bg-muted/40 px-2.5 py-1.5">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">May → June 2026</p>
        <div className="inline-flex items-center gap-1 text-[9px] text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" /> session in series
        </div>
      </div>
      <div className="grid grid-cols-7 text-center text-[9px] text-muted-foreground">
        {["M","T","W","T","F","S","S"].map((d, i) => (
          <div key={i} className="py-1 border-b border-border/60">{d}</div>
        ))}
        {days.map((d, i) => (
          <div
            key={i}
            className={`relative aspect-square border-b border-r border-border/40 last:border-r-0 ${
              d.mute ? "text-muted-foreground/40" : ""
            } ${d.session ? "bg-primary/[0.08]" : ""}`}
          >
            <span className={`absolute left-1 top-1 text-[9px] tabular-nums ${d.junemark ? "italic" : ""}`}>
              {d.d}
            </span>
            {d.session && (
              <div className="absolute inset-x-1 bottom-1">
                <div
                  className={`flex h-3.5 items-center justify-center rounded text-[8px] font-bold ${
                    d.today
                      ? "bg-primary text-primary-foreground"
                      : "bg-primary/15 text-primary"
                  }`}
                >
                  S{d.session}
                </div>
              </div>
            )}
            {d.today && (
              <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-rose-500" />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ============================================================
// Mockup #2 — Multi-channel reminders
// Three angled device frames: phone (WhatsApp), laptop (email),
// browser (in-app bell), with the dispatch panel above.
// ============================================================

function MultiChannelRemindersMockup() {
  return (
    <div className="space-y-3">
      {/* Composer */}
      <PreviewFrame title="session › Hooks Deep-Dive › notify">
        <div className="grid grid-cols-3 gap-2 text-[10px]">
          {[
            { icon: <Bell className="h-3.5 w-3.5" />, label: "In-app", detail: "24 students", on: true,  color: "text-primary" },
            { icon: <Mail className="h-3.5 w-3.5" />, label: "Email",  detail: "22 of 24",    on: true,  color: "text-primary" },
            { icon: <MessageSquare className="h-3.5 w-3.5" />, label: "WhatsApp", detail: "20 of 24", on: true, color: "text-success" },
          ].map((c) => (
            <div key={c.label} className="rounded-md border border-border/60 p-2">
              <div className="flex items-center justify-between">
                <span className={`inline-flex items-center gap-1 font-semibold ${c.color}`}>
                  {c.icon}
                  {c.label}
                </span>
                <span className={`h-3 w-5 rounded-full ${c.on ? "bg-primary" : "bg-muted"} relative`}>
                  <span className={`absolute top-0.5 h-2 w-2 rounded-full bg-card transition-transform ${c.on ? "right-0.5" : "left-0.5"}`} />
                </span>
              </div>
              <p className="mt-0.5 text-[9px] text-muted-foreground">{c.detail} on file</p>
            </div>
          ))}
        </div>
        <button className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-primary px-2 py-1.5 text-[10px] font-semibold text-primary-foreground">
          <Bell className="h-3 w-3" /> Send across 3 channels
        </button>
      </PreviewFrame>

      {/* Devices */}
      <div className="relative grid grid-cols-[1fr_1.4fr] gap-3">
        {/* Phone — WhatsApp */}
        <DevicePhone>
          <div className="space-y-1.5">
            <div className="rounded-2xl rounded-bl-sm bg-emerald-100 dark:bg-emerald-950/40 p-1.5">
              <p className="inline-flex items-center gap-1 text-[8px] font-semibold text-emerald-700 dark:text-emerald-300">
                <MessageSquare className="h-2.5 w-2.5" /> Maya R. · Hooks Class
              </p>
              <p className="mt-0.5 text-[8px] leading-tight text-foreground">📚 Hooks Deep-Dive starts in <strong>30 min</strong>. Tap to join the room.</p>
              <p className="mt-1 text-[7px] text-emerald-700 dark:text-emerald-400 underline">meet.google.com/abc-defg-hij</p>
            </div>
            <p className="text-right text-[7px] text-muted-foreground">6:30 pm ✓✓</p>
          </div>
        </DevicePhone>

        {/* Laptop — Email */}
        <DeviceLaptop>
          <div className="border-b border-border/60 pb-1.5">
            <p className="text-[8px] font-bold leading-tight">Reminder: Hooks Deep-Dive · 7:00 pm IST</p>
            <p className="text-[7px] text-muted-foreground">from Maya R. · hello@thebigclass.com</p>
          </div>
          <div className="mt-1.5 space-y-1 text-[8px] leading-tight">
            <p>Hi Aanya,</p>
            <p>Reminder that Hooks Deep-Dive (Cohort 4, session 3 of 8) starts in 30 minutes.</p>
            <div className="mt-1 inline-flex items-center gap-1 rounded bg-primary px-1.5 py-0.5 text-[7px] font-bold text-primary-foreground">
              <Play className="h-2 w-2" /> Join meeting
            </div>
          </div>
        </DeviceLaptop>
      </div>

      {/* In-app browser toast */}
      <DeviceBrowser>
        <div className="flex items-start gap-2 rounded-md border border-primary/30 bg-primary/5 p-2">
          <div className="relative">
            <Bell className="h-3.5 w-3.5 text-primary" />
            <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 animate-ping rounded-full bg-rose-500" />
            <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-rose-500" />
          </div>
          <div className="flex-1">
            <p className="text-[10px] font-semibold">Hooks Deep-Dive starts in 30 min</p>
            <p className="text-[9px] text-muted-foreground">Click to open the join link · Cohort 4 · session 3 of 8</p>
          </div>
          <button className="rounded bg-primary px-1.5 py-0.5 text-[9px] font-bold text-primary-foreground">Join</button>
        </div>
      </DeviceBrowser>
    </div>
  )
}

function DevicePhone({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative mx-auto aspect-[9/16] w-full max-w-[120px] rounded-[18px] border border-border bg-slate-900 p-1 shadow-lg">
      <div className="absolute left-1/2 top-1 h-1.5 w-8 -translate-x-1/2 rounded-full bg-slate-700" />
      <div className="h-full overflow-hidden rounded-[14px] bg-card p-2 pt-4">
        {children}
      </div>
    </div>
  )
}

function DeviceLaptop({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative">
      <div className="overflow-hidden rounded-md border border-border bg-card p-2 shadow-md">
        <div className="mb-1 flex items-center gap-1 border-b border-border/60 pb-1">
          <span className="h-1.5 w-1.5 rounded-full bg-rose-400/70" />
          <span className="h-1.5 w-1.5 rounded-full bg-amber-400/70" />
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400/70" />
          <span className="ml-1 inline-flex items-center gap-1 font-mono text-[7px] text-muted-foreground">
            <Mail className="h-2 w-2" /> Inbox · class reminders
          </span>
        </div>
        {children}
      </div>
      {/* Laptop base */}
      <div className="mx-auto mt-px h-1 w-[105%] -translate-x-[2.5%] rounded-b-md bg-slate-300/60 dark:bg-slate-700/60" />
    </div>
  )
}

function DeviceBrowser({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-md border border-border bg-card shadow-md">
      <div className="flex items-center gap-2 border-b border-border/60 bg-muted/40 px-2 py-1.5">
        <span className="h-1.5 w-1.5 rounded-full bg-rose-400/70" />
        <span className="h-1.5 w-1.5 rounded-full bg-amber-400/70" />
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400/70" />
        <span className="ml-2 inline-flex items-center gap-1 rounded-full border border-border bg-background px-2 py-0.5 font-mono text-[8px] text-muted-foreground">
          <Globe className="h-2 w-2" /> studio.thebigclass.com / dashboard
        </span>
      </div>
      <div className="p-2">{children}</div>
    </div>
  )
}

// ============================================================
// Mockup #3 — Class recap card
// Rich video preview (instructor PIP + waveform + chat) + summary
// + attached quiz/homework follow-ups.
// ============================================================

function ClassRecapMockup() {
  return (
    <PreviewFrame title="session › Hooks Deep-Dive › recap">
      <div className="space-y-2 text-[11px]">
        {/* Held banner */}
        <div className="flex items-center justify-between rounded-md border border-success/30 bg-success/5 px-2 py-1.5 text-[10px]">
          <span className="inline-flex items-center gap-1.5 font-semibold text-success">
            <CheckCircle2 className="h-3.5 w-3.5" /> Class held · 24 of 24 joined
          </span>
          <span className="text-[9px] text-muted-foreground">Tue, May 13 · 7:00 pm IST</span>
        </div>

        {/* Recording */}
        <div className="overflow-hidden rounded-md border border-border/60">
          <div className="flex items-center justify-between border-b border-border/60 bg-muted/30 px-2 py-1 text-[9px]">
            <span className="inline-flex items-center gap-1 font-medium">
              <Film className="h-3 w-3 text-primary" /> Recording · 58:14
            </span>
            <span className="inline-flex items-center gap-1 text-muted-foreground">
              <ExternalLink className="h-2.5 w-2.5" /> Open
            </span>
          </div>
          <MiniRecording />
        </div>

        {/* Summary */}
        <div className="rounded-md border border-border/60 bg-card p-2">
          <p className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">What we covered</p>
          <p className="mt-1 leading-snug">Built a custom <code className="rounded bg-muted px-1 py-0.5 font-mono text-[9px]">useTimer</code> hook. Discussed cleanup, deps, and when abstracting a hook is too eager.</p>
        </div>

        {/* Follow-ups grid */}
        <div className="grid grid-cols-2 gap-1.5">
          <div className="rounded-md border border-primary/30 bg-primary/5 p-2">
            <div className="flex items-center gap-1 text-primary">
              <ClipboardCheck className="h-3 w-3" />
              <span className="text-[9px] font-bold uppercase tracking-wide">Quiz</span>
            </div>
            <p className="mt-1 font-semibold">Hooks check · 6 q</p>
            <p className="text-[9px] text-muted-foreground">Auto-grade · 60% to pass</p>
            <button className="mt-1.5 inline-flex w-full items-center justify-center gap-1 rounded bg-primary px-1.5 py-0.5 text-[9px] font-bold text-primary-foreground">
              Take quiz
            </button>
          </div>
          <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-2">
            <div className="flex items-center gap-1 text-amber-700 dark:text-amber-400">
              <NotebookPen className="h-3 w-3" />
              <span className="text-[9px] font-bold uppercase tracking-wide">Homework</span>
            </div>
            <p className="mt-1 font-semibold">Build a custom hook</p>
            <p className="text-[9px] text-muted-foreground">Brief link · due Fri</p>
            <div className="mt-1.5 inline-flex w-full items-center justify-center gap-1 rounded border border-amber-500/30 px-1.5 py-0.5 text-[9px] font-semibold text-amber-700 dark:text-amber-400">
              Open brief
            </div>
          </div>
        </div>

        {/* Materials chip row */}
        <div className="flex flex-wrap items-center gap-1 rounded-md border border-border/60 bg-muted/20 p-1.5 text-[9px]">
          <span className="font-semibold text-muted-foreground">Materials</span>
          <Chip>Canva slides</Chip>
          <Chip>hooks.tsx</Chip>
          <Chip>useTimer.pdf</Chip>
          <Chip pin>Note from Maya</Chip>
        </div>
      </div>
    </PreviewFrame>
  )
}

function Chip({ children, pin }: { children: React.ReactNode; pin?: boolean }) {
  return (
    <span className="inline-flex items-center gap-0.5 rounded-full border border-border bg-card px-1.5 py-0.5 text-[8px]">
      {pin && <Pin className="h-2 w-2 text-primary" />}
      {children}
    </span>
  )
}

function MiniRecording() {
  return (
    <div className="relative aspect-video bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Grid wash */}
      <div
        className="absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,.7) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.7) 1px, transparent 1px)",
          backgroundSize: "12px 12px",
        }}
      />
      {/* Code being presented */}
      <pre className="absolute left-2 top-2 right-[34%] font-mono text-[7px] leading-tight text-slate-200/90">
{`function useTimer(ms) {`}
        <br />
{`  const [t, setT] = useState(0)`}
        <br />
{`  useEffect(() => {`}
        <br />
{`    const id = setInterval(`}
        <br />
{`      () => setT(t => t+1), ms`}
        <br />
{`    )`}
        <br />
{`    return () => `}
        <span className="rounded bg-emerald-500/30 px-0.5 text-emerald-200">{"clearInterval(id)"}</span>
        <br />
{`  }, [ms])`}
      </pre>

      {/* Instructor PIP */}
      <div className="absolute right-1.5 top-1.5 h-[48px] w-[64px] overflow-hidden rounded ring-1 ring-white/10 bg-gradient-to-br from-emerald-700 to-emerald-950">
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-300 text-[7px] font-bold text-emerald-950">MR</span>
        </div>
        <span className="absolute bottom-0.5 right-0.5 inline-flex h-2.5 w-2.5 items-center justify-center rounded-full bg-emerald-400">
          <Mic className="h-1.5 w-1.5 text-emerald-950" />
        </span>
      </div>

      {/* Play button overlay */}
      <button className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/95 p-2 text-slate-900 shadow-lg">
        <Play className="h-3 w-3 fill-current" />
      </button>

      {/* Scrubber */}
      <div className="absolute bottom-1.5 left-1.5 right-1.5 flex items-center gap-1.5">
        <div className="h-0.5 flex-1 rounded-full bg-white/20">
          <div className="h-full w-1/3 rounded-full bg-rose-400" />
        </div>
        <span className="font-mono text-[7px] text-white/70">19:24 / 58:14</span>
      </div>

      {/* Clock badge */}
      <span className="absolute left-1.5 top-1.5 inline-flex items-center gap-0.5 rounded-full bg-black/60 px-1 py-0.5 text-[7px] text-white/70">
        <Clock className="h-2 w-2" /> Tue
      </span>
    </div>
  )
}
