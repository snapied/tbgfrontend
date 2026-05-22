"use client"

import {
  Bell,
  Crown,
  Heart,
  Mail,
  Medal,
  Megaphone,
  MessageSquare,
  Send,
  Sparkles,
  Trophy,
  Users,
} from "lucide-react"
import { Header } from "@/components/landing/header"
import { Footer } from "@/components/landing/footer"
import {
  FeatureCTA,
  FeaturePageShell,
  FeatureSplit,
  PreviewFrame,
} from "@/components/landing/feature-page"

export default function CommunityFeaturePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <FeaturePageShell
          eyebrow="Community"
          title={<>The cohort feeling, <span className="text-primary">on-brand</span>.</>}
          subtitle="Per-batch Common Rooms with @-mentions and file previews. A leaderboard that gamifies attendance. Announcements that land on phones, not just inboxes. The retention story most LMS platforms forget to ship."
          heroImage="/images/features/community.png"
        />

        <FeatureSplit
          title="Per-batch Common Rooms — Slack-grade, built in."
          body={<>Every batch in your workspace gets its own feed. Post rich text, tag specific people, attach any file (images / videos / audio / PDF — type-aware preview), edit your own posts, react with emojis. Members get cross-channel notifications when something lands. Teachers pin the best stuff.</>}
          bullets={[
            "@-mention picker — teachers first, members below, profile deep-link",
            "File uploads with type-aware previews (images / video / audio / PDF / other)",
            "Broadcast notifications on every post + reply (in-app + email + WhatsApp)",
            "Edit your own posts inline; admins can edit anyone's",
            "Member directory tab with search + profile sheets",
          ]}
          mockup={<CohortRoomMockup />}
        />

        <FeatureSplit
          reverse
          title="Leaderboard that rewards real work."
          body="Points come from attending live classes, taking quizzes, passing them, submitting assignments, scoring high on assignments, completing lessons, completing courses. Best score per item counts — no farming. Scoring rules are visible to everyone."
          bullets={[
            "10 pts per live class attended",
            "5 pts per quiz attempt + 15 bonus for a pass",
            "15 pts per assignment submitted + 10 bonus for ≥ 80%",
            "Filter by course or by last 7 / 30 days",
          ]}
          mockup={<LeaderboardMockup />}
        />

        <FeatureSplit
          reverse
          title="Announcements that reach phones."
          body="Send an announcement once — it lands in the in-app bell, in their inbox, and on WhatsApp. Same dispatcher used by live classes, with the same per-channel toggles. No copy-pasting into a community group."
          bullets={[
            "One composer, three channels",
            "Course-scoped or workspace-wide",
            "Priority levels for urgent vs. routine",
            "Discussions thread under each announcement",
          ]}
          mockup={<AnnouncementMockup />}
        />

        <FeatureSplit
          title="Discussions that thread, not flatten."
          body="Every course, every cohort, every announcement gets a discussion thread. Students reply, instructors pin the best answers, and the whole conversation stays attached to the lesson it came from — not lost in a WhatsApp group history."
          bullets={[
            "Per-course discussion forum",
            "Threaded replies with @-mentions",
            "Pin instructor answers as canonical",
            "Notifications respect the student's channel preferences",
          ]}
          mockup={<DiscussionMockup />}
        />

        <FeatureCTA
          title="Cohorts don't drift when there's somewhere to talk."
          body="Spin up an academy in three minutes and you'll have something to point students at."
        />
      </main>
      <Footer />
    </div>
  )
}

// ============================================================
// Mockup #1 — Leaderboard with podium + rest of list + rules pills
// ============================================================

// ============================================================
// Mockup #0 — Cohort Common Room (newest section)
// ============================================================
function CohortRoomMockup() {
  return (
    <PreviewFrame title="batches › Cohort 7 › Common Room">
      <div className="space-y-2">
        <div className="rounded-md border border-primary/30 bg-primary/[0.04] p-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[9px] font-medium uppercase tracking-wide text-primary">🛡 Teachers</span>
            <span className="rounded-full border border-primary/40 bg-background px-2 py-0.5 text-[9px]">Renu</span>
            <span className="rounded-full border border-primary/40 bg-background px-2 py-0.5 text-[9px]">Dinesh</span>
            <span className="ml-auto text-[8px] text-muted-foreground">22 members</span>
          </div>
        </div>
        <div className="rounded-md border border-border bg-card p-2">
          <p className="text-[10px]">
            Hey <span className="rounded bg-primary/15 px-1 font-medium text-primary">@Renu</span> — what hour is the next office hours?
          </p>
          <div className="mt-1 inline-flex items-center gap-1 text-[8px] text-muted-foreground">
            <span>Anaya</span><span>·</span><span>3m</span>
          </div>
        </div>
        <div className="rounded-md border border-border bg-card p-2">
          <p className="text-[10px]">Just shipped my first React app — feedback?</p>
          <div className="mt-1 grid grid-cols-2 gap-1">
            <div className="aspect-video rounded bg-gradient-to-br from-sky-200 to-sky-100 dark:from-sky-900 dark:to-sky-950" />
            <div className="aspect-video rounded bg-black" />
          </div>
        </div>
      </div>
    </PreviewFrame>
  )
}

function LeaderboardMockup() {
  return (
    <PreviewFrame title="dashboard › leaderboard › this month">
      <div className="space-y-3 text-[11px]">
        {/* Podium */}
        <div className="grid grid-cols-3 items-end gap-1.5">
          <Podium rank={2} name="Vikram M." pts={240} initials="VM" h="h-16" Icon={Medal} tone="from-slate-300 to-slate-500 text-slate-950" />
          <Podium rank={1} name="Aanya R."  pts={285} initials="AR" h="h-20" Icon={Crown} tone="from-amber-300 to-amber-600 text-amber-950" />
          <Podium rank={3} name="Sara T."   pts={215} initials="ST" h="h-14" Icon={Medal} tone="from-orange-400 to-orange-700 text-white" />
        </div>

        {/* Rest of list */}
        <ul className="divide-y divide-border overflow-hidden rounded-md border border-border/60 bg-card">
          {[
            { r: 4, n: "Karan Bhan",  p: 180, c: 12, q: 5 },
            { r: 5, n: "Meera Iyer",  p: 155, c: 10, q: 4 },
            { r: 6, n: "Rohan Das",   p: 140, c: 9,  q: 4 },
          ].map((e) => (
            <li key={e.r} className="flex items-center gap-2 px-2 py-1.5">
              <span className="w-5 text-center font-mono text-[10px] font-semibold text-muted-foreground">#{e.r}</span>
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-[9px] font-bold text-primary">
                {e.n.split(" ").map(s => s[0]).join("")}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{e.n}</p>
                <p className="text-[8px] text-muted-foreground">{e.c} classes · {e.q} quizzes passed</p>
              </div>
              <span className="font-mono text-[10px] font-bold tabular-nums">{e.p}</span>
            </li>
          ))}
        </ul>

        {/* Scoring rules teaser */}
        <div className="flex flex-wrap items-center gap-1 rounded-md border border-border/60 bg-muted/20 p-2 text-[9px]">
          <span className="font-semibold text-muted-foreground">Rules</span>
          <Pill>+10 attended class</Pill>
          <Pill>+5 quiz attempted</Pill>
          <Pill>+15 quiz pass</Pill>
          <Pill>+15 assignment</Pill>
          <Pill>+10 hi-score bonus</Pill>
        </div>
      </div>
    </PreviewFrame>
  )
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-border bg-card px-1.5 py-0.5 text-[8px]">
      {children}
    </span>
  )
}

function Podium({
  rank, name, pts, h, Icon, tone,
}: {
  rank: number; name: string; pts: number; initials: string; h: string
  Icon: React.ElementType; tone: string
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className={`flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br text-sm font-bold ring-2 ring-card ${tone}`}>
        <Icon className="h-4 w-4" />
      </span>
      <p className="truncate text-[9px] font-semibold">{name}</p>
      <p className="font-mono text-[10px] font-bold tabular-nums">{pts}</p>
      <div className={`flex w-full items-end justify-center rounded-t-md bg-gradient-to-t from-primary/15 to-primary/5 text-[8px] font-bold text-primary ${h}`}>
        <span className="pb-1">#{rank}</span>
      </div>
    </div>
  )
}

// ============================================================
// Mockup #2 — Announcement composer + devices
// ============================================================

function AnnouncementMockup() {
  return (
    <div className="space-y-3">
      <PreviewFrame title="announcements › new">
        <div className="space-y-2 text-[11px]">
          <div className="rounded-md border border-border bg-card p-2">
            <div className="flex items-center gap-2">
              <Megaphone className="h-3.5 w-3.5 text-primary" />
              <input className="flex-1 bg-transparent text-[11px] font-semibold focus:outline-none" defaultValue="Cohort 4 starts Monday" readOnly />
              <span className="inline-flex items-center rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-bold text-amber-700">High</span>
            </div>
            <p className="mt-1.5 text-[10px] leading-snug text-muted-foreground">
              Welcome to the new batch — we kick off with the design heuristics module on Mon at 7pm IST. The first live class is recurring, weekly, 8 sessions.
            </p>
          </div>

          {/* Channels */}
          <div className="grid grid-cols-3 gap-1.5">
            <ChannelTile icon={<Bell className="h-3 w-3" />}            label="In-app"    detail="24 students" on />
            <ChannelTile icon={<Mail className="h-3 w-3" />}            label="Email"     detail="22 reach" on />
            <ChannelTile icon={<MessageSquare className="h-3 w-3" />}   label="WhatsApp"  detail="20 reach" on />
          </div>

          <button className="mt-1 inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-primary px-2 py-1.5 text-[10px] font-semibold text-primary-foreground">
            <Megaphone className="h-3 w-3" /> Send to all enrolled
          </button>
        </div>
      </PreviewFrame>

      {/* Dispatch preview */}
      <div className="grid grid-cols-[1fr_1.4fr] gap-3">
        {/* Phone */}
        <div className="relative mx-auto aspect-[9/16] w-full max-w-[100px] rounded-[16px] border border-border bg-slate-900 p-1 shadow">
          <div className="absolute left-1/2 top-1 h-1 w-6 -translate-x-1/2 rounded-full bg-slate-700" />
          <div className="h-full rounded-[12px] bg-card p-1.5 pt-3">
            <div className="rounded-xl bg-emerald-100 dark:bg-emerald-950/40 p-1.5">
              <p className="text-[7px] font-bold text-emerald-700 dark:text-emerald-300">📣 Studio Cohort</p>
              <p className="mt-0.5 text-[7px] leading-tight text-foreground">Cohort 4 starts Monday — first live class 7 pm IST.</p>
            </div>
          </div>
        </div>

        {/* Inbox row */}
        <div className="overflow-hidden rounded-md border border-border bg-card p-2 shadow">
          <div className="mb-1 flex items-center gap-1 border-b border-border/60 pb-1">
            <Mail className="h-2.5 w-2.5 text-muted-foreground" />
            <p className="font-mono text-[7px] text-muted-foreground">Inbox · today</p>
          </div>
          <div className="space-y-1 text-[8px]">
            <div className="rounded border border-primary/30 bg-primary/5 p-1.5">
              <p className="font-bold">📣 Cohort 4 starts Monday</p>
              <p className="text-[7px] text-muted-foreground">from Maya · just now</p>
            </div>
            <div className="rounded border border-border p-1.5 opacity-60">
              <p>Receipt · UX Foundations</p>
              <p className="text-[7px] text-muted-foreground">from billing · 3h ago</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function ChannelTile({ icon, label, detail, on }: { icon: React.ReactNode; label: string; detail: string; on?: boolean }) {
  return (
    <div className="rounded-md border border-border/60 p-1.5 text-[9px]">
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1 font-semibold">{icon}{label}</span>
        <span className={`relative h-2.5 w-4 rounded-full ${on ? "bg-primary" : "bg-muted"}`}>
          <span className={`absolute top-0.5 h-1.5 w-1.5 rounded-full bg-card transition-transform ${on ? "right-0.5" : "left-0.5"}`} />
        </span>
      </div>
      <p className="mt-0.5 text-[8px] text-muted-foreground">{detail}</p>
    </div>
  )
}

// ============================================================
// Mockup #3 — Discussion thread with pinned instructor answer
// ============================================================

function DiscussionMockup() {
  return (
    <PreviewFrame title="discussions › UX Foundations › Module 2">
      <div className="space-y-2 text-[11px]">
        {/* Thread header */}
        <div className="flex items-center gap-2 rounded-md border border-border/60 bg-muted/20 p-2">
          <Users className="h-3.5 w-3.5 text-primary" />
          <p className="flex-1 font-semibold">When should I stop interviewing?</p>
          <span className="font-mono text-[9px] text-muted-foreground">4 replies · 14h</span>
        </div>

        {/* Question (op) */}
        <ReplyRow
          name="Aanya R." initials="AR" role=""
          time="14h ago"
          body="I&apos;ve done 6 interviews and started hearing the same patterns. Is that the moment to stop?"
        />

        {/* Pinned instructor answer */}
        <ReplyRow
          name="Maya R." initials="MR" role="Instructor"
          time="11h ago"
          pinned
          body="That&apos;s saturation. 5–8 interviews per persona is the rule of thumb. If you can fill in answers in your head before asking, you&apos;ve probably saturated."
        />

        {/* Student replies */}
        <ReplyRow
          name="Karan B." initials="KB" role=""
          time="9h ago"
          body="Same here — by the 5th interview I knew what they&apos;d say about navigation."
        />
        <ReplyRow
          name="Sara T." initials="ST" role=""
          time="6h ago"
          body="Curious — does the rule change for B2B users vs consumers?"
        />

        {/* Composer */}
        <div className="flex items-center gap-1.5 rounded-md border border-border bg-card p-1.5">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[8px] font-bold text-primary">YOU</span>
          <input
            className="flex-1 bg-transparent text-[10px] focus:outline-none"
            defaultValue="Reply to the thread…"
            readOnly
          />
          <button className="rounded bg-primary p-1 text-primary-foreground">
            <Send className="h-2.5 w-2.5" />
          </button>
        </div>
      </div>
    </PreviewFrame>
  )
}

function ReplyRow({
  name, initials, role, time, body, pinned,
}: {
  name: string; initials: string; role?: string; time: string; body: string; pinned?: boolean
}) {
  return (
    <div className={`flex gap-2 rounded-md border p-2 ${pinned ? "border-primary/30 bg-primary/5" : "border-border/60 bg-card"}`}>
      <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[9px] font-bold ${
        pinned ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"
      }`}>
        {initials}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] font-semibold">{name}</span>
          {role && (
            <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-[8px] font-bold text-primary">{role}</span>
          )}
          {pinned && (
            <span className="rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[8px] font-bold text-amber-700">★ Pinned</span>
          )}
          <span className="ml-auto text-[9px] text-muted-foreground">{time}</span>
        </div>
        <p className="mt-1 text-[10px] leading-snug">{body}</p>
        <div className="mt-1 flex items-center gap-2 text-[9px] text-muted-foreground">
          <span className="inline-flex items-center gap-0.5 hover:text-foreground">
            <Heart className="h-2.5 w-2.5" /> {pinned ? 18 : 4}
          </span>
          <span className="hover:text-foreground">Reply</span>
        </div>
      </div>
    </div>
  )
}
