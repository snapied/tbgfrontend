"use client"

import {
  CheckCircle2,
  Copy,
  Gift,
  Globe,
  Mail,
  MessageSquare,
  Send,
  Sparkles,
  UserPlus,
} from "lucide-react"
import { Header } from "@/components/landing/header"
import { Footer } from "@/components/landing/footer"
import {
  FeatureCTA,
  FeaturePageShell,
  FeatureSplit,
  PreviewFrame,
} from "@/components/landing/feature-page"

export default function ReferAndEarnFeaturePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <FeaturePageShell
          eyebrow="Refer & Earn"
          title={<>Word-of-mouth that <span className="text-primary">pays you back</span>.</>}
          subtitle="Drop a friend's name, country and WhatsApp number — we hand you a personal share link. When they sign up, we credit you automatically. No spreadsheets, no manual reconciliation."
          heroImage="/images/features/refer.png"
        />

        <FeatureSplit
          title="One form. One link. One reward."
          body="No referral codes to remember. No platform-wide leaderboard you don't care about. You enter who you're inviting, we make a personal URL — and when they finish signup through it, the dashboard quietly flips to 'Joined'."
          bullets={[
            "Friend's name, country, and WhatsApp captured up front",
            "Short 6-character code embedded in a personal link",
            "Cross-tenant attribution so credit always lands",
            "Reward: 1 month free per friend who joins",
          ]}
          mockup={<ReferFormMockup />}
        />

        <FeatureSplit
          reverse
          title="Share the way you'd actually share."
          body="Each invite gets row-level Copy, WhatsApp deep-link, and Email buttons. The WhatsApp one pre-fills a message addressed to your friend by name, with the link inline. No copy-paste gymnastics."
          bullets={[
            "Copy link · WhatsApp deep-link · Email — all per-invite",
            "Pre-filled message uses your friend's first name",
            "Status badges: Pending → Joined → Rewarded",
            "Per-invite stats: when sent, who joined, when",
          ]}
          mockup={<InvitesListMockup />}
        />

        <FeatureSplit
          title="The reward shows up — without you chasing it."
          body="When the invitee finishes signup, our cross-tenant conversion log flips the invite to Joined the next time you load your dashboard. No webhook setup. No reconciliation work. The math is visible at the top of the page."
          bullets={[
            "Conversion happens at signup completion",
            "Dashboard widget shows Sent · Joined · Rewarded · Pending",
            "Stackable — every friend who joins counts",
            "Works even when your friend creates their own workspace",
          ]}
          mockup={<RewardOverviewMockup />}
        />

        <FeatureCTA
          title="Bring a friend with you."
          body="Sign up first — then your refer dashboard waits inside. Every conversion lands a free month."
        />

        {/* Trust strip */}
        <section className="pb-16">
          <div className="mx-auto max-w-3xl px-6 lg:px-8">
            <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-success" /> No double-attribution</span>
              <span className="inline-flex items-center gap-1.5"><UserPlus className="h-3.5 w-3.5 text-success" /> Personal link per friend</span>
              <span className="inline-flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5 text-success" /> One month free, stackable</span>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}

// ============================================================
// Mockup #1 — Refer form + generated link card sliding in
// ============================================================

function ReferFormMockup() {
  return (
    <div className="space-y-3">
      <PreviewFrame title="refer a friend">
        <div className="space-y-2 text-[11px]">
          <FormRow label="Friend's name" value="Priya Sharma" />
          <FormRow label="Country" value="India  (+91)" select />
          <FormRow label="WhatsApp" value="+91 98XXX XX912" mono />
          <FormRow label="Note (optional)" value="Met at Bangalore design jam." textarea />
          <button className="mt-1 inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-primary px-2 py-1.5 text-[10px] font-semibold text-primary-foreground">
            <Sparkles className="h-3 w-3" /> Generate share link
          </button>
        </div>
      </PreviewFrame>

      {/* Generated link card */}
      <div className="rounded-md border border-success/30 bg-success/5 p-3 shadow-sm">
        <p className="inline-flex items-center gap-1 text-[10px] font-semibold text-success">
          <CheckCircle2 className="h-3 w-3" /> Link generated · code K7M3PQ
        </p>
        <div className="mt-1.5 flex items-center gap-1.5">
          <code className="flex-1 truncate rounded bg-card px-2 py-1.5 font-mono text-[10px]">
            studio-cohort.thebigclass.com/r/K7M3PQ
          </code>
          <button className="rounded border border-border bg-card px-2 py-1 text-[9px] font-semibold">
            <Copy className="h-3 w-3" />
          </button>
        </div>
        <p className="mt-1.5 text-[9px] text-muted-foreground">
          Auto-copied to your clipboard. Send it via WhatsApp, email, or just paste it anywhere.
        </p>
      </div>
    </div>
  )
}

function FormRow({
  label, value, mono, textarea, select,
}: {
  label: string; value: string; mono?: boolean; textarea?: boolean; select?: boolean
}) {
  return (
    <div className="space-y-0.5">
      <p className="text-[9px] font-medium text-muted-foreground">{label}</p>
      <div className={`rounded border border-border bg-card px-2 ${textarea ? "py-1.5" : "py-1"}`}>
        <p className={`text-[10px] ${mono ? "font-mono" : ""}`}>
          {value}
          {select && <span className="float-right text-muted-foreground">▾</span>}
        </p>
      </div>
    </div>
  )
}

// ============================================================
// Mockup #2 — Invites list with three statuses + WhatsApp deep-link
// ============================================================

function InvitesListMockup() {
  return (
    <PreviewFrame title="dashboard › refer & earn · invites">
      <div className="space-y-2 text-[11px]">
        {INVITES.map((i) => (
          <div key={i.code} className="rounded-md border border-border bg-card p-2">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-[9px] font-bold text-primary">
                {i.name.split(" ").map(s => s[0]).join("")}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{i.name}</p>
                <p className="text-[9px] text-muted-foreground">{i.country} · <span className="font-mono">{i.phone}</span></p>
              </div>
              <StatusBadge status={i.status} />
            </div>

            <div className="mt-2 flex items-center gap-1">
              <code className="flex-1 truncate rounded bg-muted/60 px-1.5 py-1 font-mono text-[9px]">
                /r/{i.code}
              </code>
              <ActionBtn icon={<Copy className="h-2.5 w-2.5" />} />
              <ActionBtn icon={<MessageSquare className="h-2.5 w-2.5 text-success" />} accent />
              <ActionBtn icon={<Mail className="h-2.5 w-2.5" />} />
            </div>
          </div>
        ))}

        {/* WhatsApp preview */}
        <div className="rounded-md border border-emerald-400/30 bg-emerald-500/5 p-2">
          <p className="text-[9px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">WhatsApp preview · pre-filled</p>
          <p className="mt-1 text-[10px] leading-snug">
            Hey <strong>Priya</strong>! I think you&apos;d love this — join me on studio-cohort.thebigclass.com/r/K7M3PQ
          </p>
        </div>
      </div>
    </PreviewFrame>
  )
}

const INVITES = [
  { name: "Priya Sharma",  country: "IN", phone: "+91 98XXX XX912", code: "K7M3PQ", status: "Pending" as const },
  { name: "Aditya Kumar",  country: "IN", phone: "+91 73XXX XX410", code: "B4XJ8Y", status: "Joined" as const },
  { name: "Reema Patel",   country: "AE", phone: "+971 5X XXX XX2", code: "Q2NR5T", status: "Rewarded" as const },
]

function StatusBadge({ status }: { status: "Pending" | "Joined" | "Rewarded" }) {
  const cls =
    status === "Joined"   ? "bg-success/15 text-success" :
    status === "Rewarded" ? "bg-primary/15 text-primary" :
                            "bg-muted text-muted-foreground"
  const Icon =
    status === "Joined"   ? CheckCircle2 :
    status === "Rewarded" ? Gift :
                            Send
  return (
    <span className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${cls}`}>
      <Icon className="h-2.5 w-2.5" /> {status}
    </span>
  )
}

function ActionBtn({ icon, accent }: { icon: React.ReactNode; accent?: boolean }) {
  return (
    <button className={`rounded border px-1.5 py-1 ${accent ? "border-emerald-400/50 bg-emerald-500/10" : "border-border bg-card"}`}>
      {icon}
    </button>
  )
}

// ============================================================
// Mockup #3 — Reward overview with stat tiles + funnel + earn callout
// ============================================================

function RewardOverviewMockup() {
  return (
    <PreviewFrame title="dashboard › refer & earn · overview">
      <div className="space-y-3 text-[11px]">
        {/* Stat tiles */}
        <div className="grid grid-cols-4 gap-1.5">
          {[
            { l: "Sent",     v: 14, sub: "all-time" },
            { l: "Joined",   v: 6,  sub: "+2 this week", hl: "success" },
            { l: "Rewarded", v: 4,  sub: "credited",       hl: "primary" },
            { l: "Pending",  v: 8,  sub: "share again",    hl: "muted" },
          ].map((s) => (
            <div key={s.l} className="rounded-md border border-border bg-card p-2 text-center">
              <p className="font-mono text-lg font-bold tabular-nums">{s.v}</p>
              <p className="text-[8px] font-bold uppercase tracking-wide text-muted-foreground">{s.l}</p>
              <p className="mt-0.5 text-[8px] text-muted-foreground/80">{s.sub}</p>
            </div>
          ))}
        </div>

        {/* Funnel bar */}
        <div className="rounded-md border border-border bg-card p-2">
          <p className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">Conversion funnel</p>
          <div className="mt-1.5 flex items-stretch gap-px overflow-hidden rounded-md">
            <FunnelStep label="Sent" pct={100} value={14} cls="bg-primary"        />
            <FunnelStep label="Joined" pct={43}  value={6}  cls="bg-success"       />
            <FunnelStep label="Rewarded" pct={29} value={4} cls="bg-amber-500"     />
          </div>
        </div>

        {/* Reward callout */}
        <div className="flex items-center gap-2 rounded-md border border-primary/30 bg-primary/5 p-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-primary">
            <Gift className="h-4 w-4" />
          </span>
          <div className="flex-1">
            <p className="text-[10px] font-bold">4 months free — credited</p>
            <p className="text-[9px] text-muted-foreground">Next billing reduces by 4 cycles. Earn more by sharing the 8 pending invites.</p>
          </div>
          <span className="font-mono text-[10px] font-bold text-primary">-₹5,996</span>
        </div>

        {/* Cross-tenant note */}
        <div className="flex items-start gap-1.5 rounded-md border border-border/60 bg-muted/20 p-1.5 text-[9px]">
          <Globe className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" />
          <p>Attribution survives even when your friend creates their own workspace — we reconcile across tenants automatically.</p>
        </div>
      </div>
    </PreviewFrame>
  )
}

function FunnelStep({ label, value, pct, cls }: { label: string; value: number; pct: number; cls: string }) {
  return (
    <div className={`${cls} text-primary-foreground`} style={{ width: `${pct}%` }}>
      <div className="px-2 py-1.5">
        <p className="text-[8px] font-bold uppercase">{label}</p>
        <p className="font-mono text-[10px] font-bold tabular-nums">{value}</p>
      </div>
    </div>
  )
}
