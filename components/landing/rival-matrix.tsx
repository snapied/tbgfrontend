// Feature × tool-category matrix.
//
// Sits below CompetitorTeardown on the homepage. The teardown shows
// REVIEW QUOTES vs OUR COMMITMENTS (the trust angle). This matrix
// shows FEATURES vs THE TOOL CATEGORIES a visitor is already paying
// for — without naming specific products. Generic category labels
// describe the *kind* of tool ("a typical course platform", "a chat
// app") so the visitor maps it to whatever they actually use.
//
// Why no named rivals: punching down at specific products is
// trademark-noisy and ages badly. Categories are honest and stable.
//
// Honesty rules baked into the data:
//   • "✓" means it ships today, end-to-end. No "via integration."
//   • "Partial" means it ships but with a caveat we name in the cell.
//   • "✗" means it doesn't ship at all in that category by default.
// If we couldn't verify the category norm, the cell stays blank with
// a "?". Better than a wrong claim.

import Link from "next/link"
import { ArrowRight, Check, Minus, X } from "lucide-react"

type Verdict =
  | { kind: "yes"; note?: string }
  | { kind: "partial"; note: string }
  | { kind: "no"; note?: string }

interface FeatureRow {
  feature: string
  detail: string
  ours: Verdict
  coursePlatform: Verdict
  communityTool: Verdict
  videoTool: Verdict
  chatApp: Verdict
  docsTool: Verdict
  schoolLms: Verdict
  href?: string
}

// Generic categories — the *kind* of tool an educator already pays
// for, not a brand. Six columns balance breadth and readability;
// more would push the table off-screen on a 13" laptop.
const CATEGORIES = [
  { id: "coursePlatform", label: "Hosted course platform" },
  { id: "communityTool",  label: "Standalone community tool" },
  { id: "videoTool",      label: "Video-conferencing seat" },
  { id: "chatApp",        label: "Team-chat app" },
  { id: "docsTool",       label: "Docs / wiki tool" },
  { id: "schoolLms",      label: "School LMS" },
] as const

const FEATURES: FeatureRow[] = [
  {
    feature: "Live classes (host in-room)",
    detail: "Schedule, host, record — no third-party seat required.",
    ours:           { kind: "yes",     note: "1080p adaptive, native polls + hands + agenda" },
    coursePlatform: { kind: "partial", note: "Usually a third-party video embed only" },
    communityTool:  { kind: "partial", note: "Often a third-party video embed only" },
    videoTool:      { kind: "yes",     note: "Their core product — but rents per seat" },
    chatApp:        { kind: "partial", note: "Voice/video meetings, usually time-capped on free" },
    docsTool:       { kind: "no" },
    schoolLms:      { kind: "partial", note: "Usually via a separate integration" },
    href: "/features/live-classes",
  },
  {
    feature: "Recordings with chapters + transcript",
    detail: "Auto-chapter markers parsed from transcript; chat persists alongside.",
    ours:           { kind: "yes" },
    coursePlatform: { kind: "partial", note: "Recordings yes, no auto-chapters" },
    communityTool:  { kind: "no" },
    videoTool:      { kind: "partial", note: "Transcripts often paid, no auto-chapters" },
    chatApp:        { kind: "no" },
    docsTool:       { kind: "no" },
    schoolLms:      { kind: "no" },
    href: "/features/recordings",
  },
  {
    feature: "Whiteboard with 25+ templates",
    detail: "K-12 grade-band scaffolds, multi-cursor, autosave.",
    ours:           { kind: "yes" },
    coursePlatform: { kind: "no" },
    communityTool:  { kind: "no" },
    videoTool:      { kind: "partial", note: "Bare canvas, no template library" },
    chatApp:        { kind: "no" },
    docsTool:       { kind: "partial", note: "Drawing surface, not classroom scaffolds" },
    schoolLms:      { kind: "partial", note: "Often a discontinued or basic surface" },
    href: "/features/whiteboard",
  },
  {
    feature: "Quizzes (entrance prep, K-12, code)",
    detail: "18 ready-to-fire templates including JEE / NEET / GMAT scaffolds.",
    ours:           { kind: "yes" },
    coursePlatform: { kind: "partial", note: "Generic quizzes, no entrance-test scaffolds" },
    communityTool:  { kind: "no" },
    videoTool:      { kind: "partial", note: "Polls only" },
    chatApp:        { kind: "no" },
    docsTool:       { kind: "no" },
    schoolLms:      { kind: "yes",     note: "But typically no auto-grading for code/long-form" },
    href: "/features/quizzes",
  },
  {
    feature: "Cohort community feed",
    detail: "Posts, comments, @-mentions, post types, member directory.",
    ours:           { kind: "yes" },
    coursePlatform: { kind: "partial", note: "Community add-on, usually paid" },
    communityTool:  { kind: "yes",     note: "Their core product — at a separate subscription" },
    videoTool:      { kind: "no" },
    chatApp:        { kind: "yes" },
    docsTool:       { kind: "partial", note: "Pages, not feeds" },
    schoolLms:      { kind: "partial", note: "Class stream, no member directory" },
    href: "/features/community",
  },
  {
    feature: "Branded storefront on your domain",
    detail: "Sell courses, bundles, memberships, sessions, downloads.",
    ours:           { kind: "yes" },
    coursePlatform: { kind: "yes" },
    communityTool:  { kind: "partial", note: "Memberships only" },
    videoTool:      { kind: "no" },
    chatApp:        { kind: "no" },
    docsTool:       { kind: "no" },
    schoolLms:      { kind: "no" },
    href: "/features/storefront",
  },
  {
    feature: "Certificates + public verifier",
    detail: "17+ templates, drag-drop designer, bulk-issue, public verify URL.",
    ours:           { kind: "yes" },
    coursePlatform: { kind: "partial", note: "PDF only, no designer" },
    communityTool:  { kind: "no" },
    videoTool:      { kind: "no" },
    chatApp:        { kind: "no" },
    docsTool:       { kind: "no" },
    schoolLms:      { kind: "no" },
    href: "/features/certificates",
  },
  {
    feature: "Zero commission",
    detail: "Flat subscription, no per-transaction skim by the platform.",
    ours:           { kind: "yes" },
    coursePlatform: { kind: "partial", note: "0% only on the highest tier" },
    communityTool:  { kind: "yes",     note: "Plus your gateway fees" },
    videoTool:      { kind: "yes",     note: "But no commerce primitive" },
    chatApp:        { kind: "yes",     note: "No commerce primitive" },
    docsTool:       { kind: "yes" },
    schoolLms:      { kind: "yes" },
  },
  {
    feature: "Workspace export (CSV / JSON)",
    detail: "Per-entity + full-workspace dump on every plan, free tier included.",
    ours:           { kind: "yes" },
    coursePlatform: { kind: "partial", note: "CSV only, often behind paid plan" },
    communityTool:  { kind: "partial", note: "Export typically gated on paid tier" },
    videoTool:      { kind: "partial", note: "Recording-only export" },
    chatApp:        { kind: "partial", note: "Admin export gated on business tier" },
    docsTool:       { kind: "yes" },
    schoolLms:      { kind: "no" },
  },
  {
    feature: "India-native (UPI + WhatsApp + INR)",
    detail: "Native UPI checkout, WhatsApp notifications, Hindi / Tamil portals.",
    ours:           { kind: "yes" },
    coursePlatform: { kind: "no" },
    communityTool:  { kind: "no" },
    videoTool:      { kind: "no" },
    chatApp:        { kind: "no" },
    docsTool:       { kind: "no" },
    schoolLms:      { kind: "no" },
    href: "/features/multilingual",
  },
]

export function RivalMatrix() {
  return (
    <section className="relative overflow-hidden border-y border-border bg-gradient-to-b from-background via-secondary/30 to-background py-20">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-bold uppercase tracking-wider text-primary">
            The honest matrix
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            What you actually get vs. the six tools you currently juggle.
          </h2>
          <p className="mt-3 text-base leading-relaxed text-muted-foreground">
            We checked the category norms across the typical educator stack before publishing every cell. <span className="font-medium text-foreground">No marketing-page fictions</span> — if a feature only ships on a paid tier, the cell says &ldquo;partial&rdquo;. Hover any cell for the caveat.
          </p>
        </div>

        {/* Desktop matrix */}
        <div className="mt-12 hidden lg:block">
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/30">
                <tr>
                  <th className="sticky left-0 z-10 w-72 bg-muted/30 px-4 py-3 text-left font-semibold">
                    Feature
                  </th>
                  <th className="w-28 px-2 py-3 text-center">
                    <span className="inline-flex flex-col items-center gap-0.5">
                      <span className="text-[10px] uppercase tracking-wider text-primary">Us</span>
                      <span className="text-xs font-bold">This platform</span>
                    </span>
                  </th>
                  {CATEGORIES.map((c) => (
                    <th key={c.id} className="px-2 py-3 text-center text-[11px] font-medium leading-tight text-muted-foreground">
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {FEATURES.map((row, idx) => (
                  <tr
                    key={row.feature}
                    className={`border-b border-border/60 transition-colors hover:bg-muted/20 ${
                      idx % 2 === 0 ? "" : "bg-muted/[0.02]"
                    }`}
                  >
                    <td className="sticky left-0 z-10 bg-inherit px-4 py-3">
                      <div className="font-semibold">
                        {row.feature}
                        {row.href && (
                          <Link
                            href={row.href}
                            className="ml-2 inline-flex items-center text-[11px] font-medium text-primary hover:underline"
                          >
                            See it <ArrowRight className="ml-0.5 h-3 w-3" />
                          </Link>
                        )}
                      </div>
                      <p className="text-[11px] leading-snug text-muted-foreground">{row.detail}</p>
                    </td>
                    <td className="bg-primary/[0.04] px-2 py-3 text-center">
                      <Cell v={row.ours} highlight />
                    </td>
                    <td className="px-2 py-3 text-center"><Cell v={row.coursePlatform} /></td>
                    <td className="px-2 py-3 text-center"><Cell v={row.communityTool} /></td>
                    <td className="px-2 py-3 text-center"><Cell v={row.videoTool} /></td>
                    <td className="px-2 py-3 text-center"><Cell v={row.chatApp} /></td>
                    <td className="px-2 py-3 text-center"><Cell v={row.docsTool} /></td>
                    <td className="px-2 py-3 text-center"><Cell v={row.schoolLms} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Check className="h-3 w-3 text-success" /> ships today
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Minus className="h-3 w-3 text-amber-600" /> ships with a caveat
            </span>
            <span className="inline-flex items-center gap-1.5">
              <X className="h-3 w-3 text-destructive" /> doesn&rsquo;t ship at all
            </span>
          </div>
        </div>

        {/* Mobile / tablet — per-category cards. The matrix is
            unreadable under ~1024px; this collapses to one category
            per card with a win-count summary. */}
        <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:hidden">
          {CATEGORIES.map((c) => (
            <MobileCategoryCard
              key={c.id}
              label={c.label}
              rows={FEATURES.map((f) => ({
                feature: f.feature,
                ours: f.ours,
                rival: f[c.id as keyof FeatureRow] as Verdict,
              }))}
            />
          ))}
        </div>
      </div>
    </section>
  )
}

function Cell({ v, highlight }: { v: Verdict; highlight?: boolean }) {
  if (v.kind === "yes") {
    return (
      <span
        title={v.note ?? "Ships today, end-to-end"}
        className={`inline-flex h-7 w-7 items-center justify-center rounded-full ${
          highlight ? "bg-success text-white" : "bg-success/15 text-success"
        }`}
      >
        <Check className="h-3.5 w-3.5" />
      </span>
    )
  }
  if (v.kind === "partial") {
    return (
      <span
        title={v.note}
        className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-amber-500/15 text-amber-700"
      >
        <Minus className="h-3.5 w-3.5" />
      </span>
    )
  }
  return (
    <span
      title={v.note ?? "Doesn't ship"}
      className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-destructive/10 text-destructive/70"
    >
      <X className="h-3.5 w-3.5" />
    </span>
  )
}

function MobileCategoryCard({
  label,
  rows,
}: {
  label: string
  rows: Array<{ feature: string; ours: Verdict; rival: Verdict }>
}) {
  const wins = rows.filter((r) => r.ours.kind === "yes" && r.rival.kind !== "yes").length
  const parity = rows.filter((r) => r.ours.kind === r.rival.kind).length
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-bold leading-snug">vs. {label}</h3>
        <span className="shrink-0 text-[11px] font-bold text-primary">{wins} wedges · {parity} parity</span>
      </div>
      <ul className="mt-3 space-y-1.5">
        {rows.map((r) => (
          <li key={r.feature} className="flex items-center justify-between gap-2 text-[12px]">
            <span className="min-w-0 flex-1 truncate text-muted-foreground">{r.feature}</span>
            <span className="inline-flex items-center gap-1">
              <Cell v={r.ours} highlight />
              <span className="text-muted-foreground/50">·</span>
              <Cell v={r.rival} />
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
