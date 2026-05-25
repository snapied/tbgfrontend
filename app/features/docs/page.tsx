// Feature page — Docs (knowledge layer of the platform).
//
// Docs are not "Notion bolted on" — they are the connective tissue
// across courses, classes, recordings, whiteboards and quizzes. Five
// typed embeds keep references LIVE (the recording you embed today
// still plays tomorrow with the latest chapters). Multiplayer comes
// from Liveblocks. Audience model is shared with everything else on
// the platform — no separate sharing config to learn.
//
// This page is built around the four scenarios that make Docs
// indispensable in an Indian academy: study guide from yesterday's
// class, course handbook, cohort wiki, public knowledge hub.

import type { Metadata } from "next"
import {
  ArrowRight,
  Film,
  GraduationCap,
  Globe2,
  Layers,
  Link2,
  PenSquare,
  Sparkles,
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

const SITE_URL = "https://thebigclass.com"
const PAGE_PATH = "/features/docs"

export const metadata: Metadata = {
  title: "Docs — the knowledge layer of your academy · The Big Class",
  description:
    "A multiplayer doc editor with live embeds of your lessons, recordings, whiteboards, quizzes and other docs. Built on BlockNote + Liveblocks. AI-generate study guides from any class.",
  alternates: { canonical: `${SITE_URL}${PAGE_PATH}` },
  openGraph: {
    title: "Docs — the knowledge layer of your academy",
    description:
      "Multiplayer docs with live embeds of lessons, recordings, whiteboards & quizzes. AI study guides from any class.",
    url: `${SITE_URL}${PAGE_PATH}`,
  },
}

// ── Templates the docs hub ships with ─────────────────────────────
// Mirrors lib/doc-templates.ts. Listing the real names here keeps
// the marketing page honest; if a template gets renamed in the lib
// and not here, that's a noticeable mismatch.
const TEMPLATE_GROUPS: Array<{
  label: string
  emoji: string
  hint: string
  templates: Array<{ title: string; description: string }>
}> = [
  {
    label: "Teaching scaffolds",
    emoji: "🎓",
    hint: "The four docs that pay back the first week — write once, reuse forever.",
    templates: [
      { title: "Course handbook",   description: "Syllabus, schedule, FAQ, rubrics — the doc you wish you'd written" },
      { title: "Lesson study guide", description: "Notes + recording + worked examples, one page per lesson" },
      { title: "Cohort wiki",       description: "Shared notes for a single batch — students contribute too" },
      { title: "Public knowledge hub", description: "SEO-indexed pages for the topics you want to rank for" },
    ],
  },
  {
    label: "Operations",
    emoji: "🛠",
    hint: "Internal docs the team keeps; visible to admins + instructors only.",
    templates: [
      { title: "Onboarding playbook",  description: "Day-1 / Week-1 / Month-1 for new students or staff" },
      { title: "SOP",                  description: "How we run live classes, grade submissions, refund cancellations" },
      { title: "Meeting notes",        description: "Decision · owner · date — copy-pasted into the right doc later" },
      { title: "Blank doc",            description: "Empty page. Slash command for everything else." },
    ],
  },
]

const EMBED_TYPES = [
  {
    icon: GraduationCap,
    eyebrow: "Lesson",
    title: "Embed any lesson from any course",
    body: "Drop a live lesson card — students click through to the lesson in your LMS. Move the lesson, the link follows.",
    color: "text-primary",
  },
  {
    icon: Film,
    eyebrow: "Recording",
    title: "Embed a recording, optionally timestamped",
    body: "Reference a specific moment (\"the part about derivatives, 12:34\"). Updates to the recording (new chapters, AI summary) flow through.",
    color: "text-rose-600",
  },
  {
    icon: PenSquare,
    eyebrow: "Whiteboard",
    title: "Embed a whiteboard preview",
    body: "Click-to-open opens the live canvas. New strokes, new versions — same embed.",
    color: "text-amber-600",
  },
  {
    icon: Sparkles,
    eyebrow: "Quiz",
    title: "Reference a quiz from your bank",
    body: "Embed once; if you add questions later, the doc still points at the latest version. No copy-paste rot.",
    color: "text-violet-600",
  },
  {
    icon: Layers,
    eyebrow: "Doc",
    title: "Cross-link to another doc",
    body: "Embed the handbook from a study guide. Embed a study guide from the handbook. Backlinks are automatic.",
    color: "text-muted-foreground",
  },
]

const ALT_COMPARISON = [
  {
    name: "Notion",
    issue: "Beautiful editor, no LMS underneath. You pay for two tools and reconcile permissions between them.",
  },
  {
    name: "Google Docs",
    issue: "Multiplayer + comments are great. No embeds of your courses, no audience model that knows about cohorts.",
  },
  {
    name: "Wiki.js / BookStack",
    issue: "Self-host, theme it, build the cohort auth yourself. Year-one cost dwarfs the SaaS bill.",
  },
  {
    name: "Old block editor we replaced",
    issue: "Worked. Wasn't pleasant. We rebuilt on BlockNote + Liveblocks so the writing experience would feel familiar from day one.",
  },
]

export default function DocsFeaturePage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1">
        <FeaturePageShell
          eyebrow="Docs · knowledge layer"
          title={
            <>
              The knowledge layer of your academy.
              <br />
              <span className="text-primary">Multiplayer. Embeds everything. Public when you want.</span>
            </>
          }
          subtitle="Write study guides, course handbooks, cohort wikis and a public knowledge hub — all in one editor. Drop in live embeds of your lessons, recordings, whiteboards and quizzes. Built on BlockNote and Liveblocks so multi-cursor editing feels exactly like the tools your team already knows."
        >
          <FeatureSplit
            title="The editor your students already know"
            body={
              <>
                Slash commands for everything. Drag-to-rearrange. Markdown-in if you like markdown, rich
                toolbar if you don&rsquo;t. Powered by{" "}
                <a
                  href="https://www.blocknotejs.org"
                  className="font-semibold text-primary underline-offset-2 hover:underline"
                >
                  BlockNote
                </a>{" "}
                — the open-source editor that powers Notion-style tools — and{" "}
                <a
                  href="https://liveblocks.io"
                  className="font-semibold text-primary underline-offset-2 hover:underline"
                >
                  Liveblocks
                </a>{" "}
                for multi-cursor editing.
              </>
            }
            bullets={[
              "Slash menu with every block type, including our 5 typed embeds",
              "Multiplayer cursors, presence avatars, conflict-free Yjs persistence",
              "Same keyboard shortcuts as Notion / Coda / Craft — no relearning",
              "Drafts auto-save 300ms after the last keystroke",
            ]}
            mockup={
              <PreviewFrame title="docs/your-first-doc">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">📝</span>
                  <div className="flex-1">
                    <p className="font-serif text-lg font-black tracking-tight">
                      Calculus 1 · Week 3 — Derivatives
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      A pinch-of-salt take on the chain rule, with worked examples and the Tuesday recording.
                    </p>
                    <div className="mt-3 space-y-2">
                      <EmbedCardMockup
                        eyebrow="Recording · 12:34"
                        title="Week 3 live class — Derivatives crash"
                        icon={<Film className="h-4 w-4" />}
                        iconClass="bg-rose-500/10 text-rose-600"
                      />
                      <EmbedCardMockup
                        eyebrow="Whiteboard"
                        title="Chain rule worked-example board"
                        icon={<PenSquare className="h-4 w-4" />}
                        iconClass="bg-amber-500/10 text-amber-600"
                      />
                      <EmbedCardMockup
                        eyebrow="Quiz · 8 questions"
                        title="Derivatives mini-quiz"
                        icon={<Sparkles className="h-4 w-4" />}
                        iconClass="bg-violet-500/10 text-violet-600"
                      />
                    </div>
                  </div>
                </div>
              </PreviewFrame>
            }
          />

          <FeatureSplit
            reverse
            title="Five typed embeds. Live references, not snapshots."
            body={
              <>
                The thing that breaks every other docs tool: you paste a link to a recording, the recording moves,
                the link rots. Here, every embed is a typed reference by id. The artifact moves, the embed follows.
                The artifact gets updated (new chapters, more quiz questions, a re-saved whiteboard) — every doc
                referencing it shows the latest.
              </>
            }
            bullets={EMBED_TYPES.map((e) => `${e.eyebrow}: ${e.title}`)}
            mockup={
              <PreviewFrame title="slash menu — embeds">
                <ul className="space-y-1.5">
                  {EMBED_TYPES.map((e) => (
                    <li
                      key={e.eyebrow}
                      className="flex items-start gap-2 rounded-md border border-border bg-card px-2 py-1.5"
                    >
                      <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded ${e.color} bg-muted/40`}>
                        <e.icon className="h-3.5 w-3.5" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                          /{e.eyebrow.toLowerCase()}
                        </span>
                        <span className="block text-sm font-semibold">{e.title}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </PreviewFrame>
            }
          />

          <FeatureSplit
            title="One audience model. Same one you already learned."
            body={
              <>
                Private · admins · workspace · cohort · course · public on the web — exactly the audience model
                you set for lessons and announcements. Nothing new to learn. A doc shared to a cohort is visible
                to that cohort the moment they sign in.
              </>
            }
            bullets={[
              "Private — only you",
              "Admins & instructors — internal SOPs and runbooks",
              "Everyone in workspace — staff-wide announcements",
              "Specific cohort — week-by-week course pages",
              "Specific course — full handbook",
              "Public on the web — SEO-indexed knowledge hub with custom slug + OG tags",
            ]}
            mockup={
              <PreviewFrame title="publish dialog">
                <div className="space-y-2">
                  {[
                    { emoji: "🔒", label: "Private", hint: "Only you can see this" },
                    { emoji: "🛡", label: "Admins + instructors", hint: "Workspace operations" },
                    { emoji: "🏢", label: "Everyone in workspace", hint: "All staff" },
                    { emoji: "👥", label: "Community", hint: "A single cohort" },
                    { emoji: "🎓", label: "Course", hint: "Everyone enrolled" },
                    { emoji: "🌐", label: "Public on the web", hint: "Custom slug · SEO · OG image" },
                  ].map((row) => (
                    <div
                      key={row.label}
                      className="flex items-center gap-2 rounded-md border border-border px-2 py-1.5"
                    >
                      <span className="text-base">{row.emoji}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold">{row.label}</span>
                        <span className="block text-[11px] text-muted-foreground">{row.hint}</span>
                      </span>
                    </div>
                  ))}
                </div>
              </PreviewFrame>
            }
          />

          <FeatureSplit
            reverse
            title="AI study guide from any class — one click"
            body={
              <>
                After a live class ends, the End-of-Class wizard offers &ldquo;Generate study guide.&rdquo; The
                AI pulls the transcript, the whiteboard snapshots and the chat&rsquo;s pinned questions, and
                drafts a doc with sections, embedded recording timestamps and a follow-up quiz block. You
                proof-read for ten minutes and ship.
              </>
            }
            bullets={[
              "Pulls transcript + whiteboard + pinned chat",
              "Drafts sections in your tone, not generic outline",
              "Embeds the recording at the right moments automatically",
              "Suggests a 5-question quiz at the end — accept or skip",
            ]}
            mockup={
              <PreviewFrame title="end-of-class wizard">
                <div className="rounded-lg border border-border bg-card p-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <p className="text-sm font-bold">Generate study guide?</p>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Class ended 4 minutes ago. We have the transcript, three whiteboards and 12 pinned questions.
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-md bg-muted/40 p-2">
                      <p className="font-bold">Title</p>
                      <p className="text-muted-foreground">Week 3 — Derivatives crash</p>
                    </div>
                    <div className="rounded-md bg-muted/40 p-2">
                      <p className="font-bold">Audience</p>
                      <p className="text-muted-foreground">Calc-1 Cohort B</p>
                    </div>
                  </div>
                  <button className="mt-3 inline-flex items-center gap-1 rounded-md bg-primary px-2.5 py-1 text-[11px] font-bold text-primary-foreground">
                    Draft it <ArrowRight className="h-3 w-3" />
                  </button>
                </div>
              </PreviewFrame>
            }
          />

          <FeatureSplit
            title="Backlinks, automatically"
            body={
              <>
                Every embed writes a row in a global reference table — &ldquo;this doc embeds this lesson&rdquo;.
                The reverse query is free: a recording&rsquo;s sidebar shows every doc that references it, with
                authors and updated-on dates. No tags to maintain. No manual cross-links. Just edges, both ways.
              </>
            }
            bullets={[
              "Embed once → backlink appears on the artifact automatically",
              "Mentions count too — @lesson in any doc shows up on the lesson",
              "AI-generated study guides record their source class as a backlink — 'generated from'",
              "Soft-deletes show '⚠ referenced from this doc' so cleanup is intentional",
            ]}
            mockup={
              <PreviewFrame title="recording → backlinks">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Referenced from
                </p>
                <ul className="mt-2 space-y-1.5">
                  {[
                    { icon: "📝", title: "Week 3 — Derivatives crash", by: "Asha Iyer · 2d ago" },
                    { icon: "📘", title: "Calculus 1 — Course handbook", by: "Asha Iyer · 6d ago" },
                    { icon: "🏛", title: "Public · How we teach calculus", by: "Asha Iyer · 11d ago" },
                  ].map((r) => (
                    <li key={r.title} className="flex items-center gap-2 rounded-md border border-border px-2 py-1.5">
                      <span className="text-lg">{r.icon}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">{r.title}</span>
                        <span className="block text-[10px] text-muted-foreground">{r.by}</span>
                      </span>
                      <Link2 className="h-3 w-3 text-muted-foreground" />
                    </li>
                  ))}
                </ul>
              </PreviewFrame>
            }
          />

          {/* Templates row */}
          <section className="border-y border-border/60 bg-muted/20 py-16">
            <div className="mx-auto max-w-5xl px-6 lg:px-8">
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                Templates for what teachers actually write
              </h2>
              <p className="mt-2 max-w-2xl text-muted-foreground">
                Eight scaffolds at /dashboard/docs. Real docs, not lorem ipsum. Pick one, swap your words in,
                publish.
              </p>
              <div className="mt-6 grid gap-6 lg:grid-cols-2">
                {TEMPLATE_GROUPS.map((g) => (
                  <div key={g.label}>
                    <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-muted-foreground">
                      <span aria-hidden>{g.emoji}</span>
                      {g.label}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">{g.hint}</p>
                    <ul className="mt-3 space-y-2">
                      {g.templates.map((t) => (
                        <li
                          key={t.title}
                          className="rounded-md border border-border bg-card p-2.5"
                        >
                          <p className="text-sm font-semibold">{t.title}</p>
                          <p className="text-[11px] text-muted-foreground">{t.description}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Public hub callout */}
          <section className="py-16">
            <div className="mx-auto max-w-4xl px-6 lg:px-8">
              <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6 lg:p-10">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Globe2 className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="text-xl font-bold tracking-tight">
                      Your public knowledge hub — on your URL
                    </h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Any doc you publish public lives at <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px]">yourdomain.com/k/your-slug</code> with full SEO control —
                      title, description, OG image, noindex flag. Tags become hub categories. The hub itself is a free traffic source for your academy — on your domain, in your brand.
                    </p>
                    <ul className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
                      {[
                        "Custom slug per page",
                        "OG title + description + image",
                        "Auto-indexed hub at yourdomain.com/k",
                        "Comment-only mode for cohort wikis",
                      ].map((b) => (
                        <li key={b} className="flex items-start gap-2">
                          <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-primary" />
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Comparison */}
          <section className="border-t border-border/60 bg-muted/20 py-16">
            <div className="mx-auto max-w-4xl px-6 lg:px-8">
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                Why not just Notion (or Google Docs, or your own wiki)?
              </h2>
              <p className="mt-2 text-muted-foreground">
                Because none of them know your courses. Here are the honest trade-offs.
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {ALT_COMPARISON.map((a) => (
                  <div key={a.name} className="rounded-lg border border-border bg-card p-4">
                    <p className="text-sm font-bold">{a.name}</p>
                    <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{a.issue}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Who it's for */}
          <section className="py-16">
            <div className="mx-auto max-w-4xl px-6 lg:px-8">
              <div className="grid gap-6 sm:grid-cols-3">
                {[
                  {
                    icon: Users,
                    title: "Solo creators",
                    body: "One handbook, one study guide per lesson, one public page per topic. Done in week 1.",
                  },
                  {
                    icon: GraduationCap,
                    title: "Coaching academies",
                    body: "SOPs for staff, cohort wikis for students, course handbooks per batch. All audiences in one tool.",
                  },
                  {
                    icon: Globe2,
                    title: "Schools & colleges",
                    body: "Department-level spaces, public landing pages for admissions, internal-only runbooks. RBAC built in.",
                  },
                ].map((c) => (
                  <div key={c.title} className="rounded-lg border border-border bg-card p-5">
                    <c.icon className="h-5 w-5 text-primary" />
                    <p className="mt-3 text-sm font-bold">{c.title}</p>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{c.body}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <FeatureCTA
            title="Stop pasting links between Notion and your LMS"
            body="One editor. Live embeds of everything you already have. Audience model you already know. Free to start, no demo call."
          />
        </FeaturePageShell>
      </main>
      <Footer />
    </div>
  )
}

// ── Helpers ────────────────────────────────────────────────────────

function EmbedCardMockup({
  eyebrow,
  title,
  icon,
  iconClass,
}: {
  eyebrow: string
  title: string
  icon: React.ReactNode
  iconClass: string
}) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-border bg-card p-2">
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${iconClass}`}>
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          {eyebrow}
        </p>
        <p className="mt-0.5 truncate text-xs font-semibold">{title}</p>
      </div>
    </div>
  )
}
