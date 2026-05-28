// Feature page — Whiteboard.
//
// The multiplayer whiteboard built into every class, course, and
// session. 25+ ready-to-teach templates with K-12 grade-band
// scaffolds (KG → Class 11-12), real-time multi-cursor co-editing
// powered by LiveKit data channel, autosave per session.
//
// This page is now organised around what a teacher actually does:
// pick a template → teach with it live → save it forever. The old
// page undersold the product by leading with "the canvas tool" — but
// the canvas is just the surface; the templates are the leverage.

import type { Metadata } from "next"
import {
  Hand,
  Layers,
  PenTool,
  ScanSearch,
  Sparkles,
  Users,
  Wifi,
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
const PAGE_PATH = "/features/whiteboard"

// ── Real template surface, lifted from lib/whiteboard-templates.ts ──
// Mirroring the lib list keeps the marketing page honest. If a
// template ships, it shows up here; if one is removed, this list goes
// stale and a reader notices. Better than an alphabet of fake names.
const TEMPLATE_GROUPS: Array<{
  id: string
  label: string
  emoji: string
  hint: string
  templates: Array<{ title: string; description: string; gradeBand?: string }>
}> = [
  {
    id: "k12",
    label: "K-12 grade bands",
    emoji: "🎒",
    hint: "Pre-built scaffolds per grade — KG to Class 11-12. Indian teachers told us 'I just want the worksheet that fits Class 6'. Here.",
    templates: [
      { title: "Numbers 1 - 10",      description: "Trace-ready number boxes with dot-counts underneath",       gradeBand: "KG" },
      { title: "Shapes & colours",    description: "Four big shape outlines with drop zones",                    gradeBand: "KG" },
      { title: "Times table grid",    description: "10×10 multiplication grid — practise a row, quiz across",   gradeBand: "Class 3-5" },
      { title: "Fraction circles",    description: "Whole · halves · thirds · quarters · sixths · eighths",     gradeBand: "Class 4-6" },
      { title: "Parts of speech",     description: "Noun · Verb · Adjective · Adverb with drop zones",          gradeBand: "Class 5-8" },
      { title: "Algebra workspace",   description: "Given → Find → Solve — the working IS the answer",          gradeBand: "Class 6-9" },
      { title: "Periodic table",      description: "18-column × 7-row skeleton — fill in as you study",         gradeBand: "Class 8-11" },
      { title: "Supply & demand",     description: "Price-quantity axes — shift one to predict the next",       gradeBand: "Class 11-12" },
    ],
  },
  {
    id: "teaching",
    label: "Teaching scaffolds",
    emoji: "📚",
    hint: "The four moves of a good class, prepped as a board. Drop in the topic, teach.",
    templates: [
      { title: "Lesson plan",     description: "Objective · Hook · Practice · Exit ticket" },
      { title: "K-W-L chart",     description: "Know · Want to know · Learned" },
      { title: "Frayer model",    description: "Definition · Characteristics · Examples · Non-examples" },
      { title: "Storyboard",      description: "Six-panel narrative scaffold" },
      { title: "Lab report",      description: "Hypothesis · Method · Results · Conclusion" },
      { title: "Weekly schedule", description: "Seven-day grid, today highlighted" },
    ],
  },
  {
    id: "thinking",
    label: "Thinking & ideation",
    emoji: "🧠",
    hint: "When the class needs to brainstorm, classify, or reason together.",
    templates: [
      { title: "Brainstorm",    description: "Centre topic with eight sticky notes radiating out" },
      { title: "Mind map",      description: "Main topic, four primary branches, sub-topics trailing" },
      { title: "Venn diagram",  description: "Two overlapping sets — unique vs shared" },
      { title: "Decision tree", description: "Root question → branch by option → trace each path" },
    ],
  },
  {
    id: "analysis",
    label: "Analysis & strategy",
    emoji: "🔍",
    hint: "Bring case-study energy into the room without spinning up a separate tool.",
    templates: [
      { title: "SWOT analysis", description: "Strengths · Weaknesses · Opportunities · Threats" },
      { title: "User persona",  description: "Avatar + name + goals + frustrations + behaviours" },
      { title: "Empathy map",   description: "Says · Thinks · Does · Feels" },
      { title: "Fishbone",      description: "Spine to a problem head, six bones for causes" },
      { title: "5 Whys",        description: "Walk past symptoms to find the root cause" },
    ],
  },
  {
    id: "planning",
    label: "Planning & retros",
    emoji: "🗓️",
    hint: "Run the cohort kick-off, the goals week, the wrap-up — same board, three uses.",
    templates: [
      { title: "Eisenhower matrix",   description: "Important × Urgent — Do · Schedule · Delegate · Drop" },
      { title: "OKR planner",         description: "One objective + three measurable key results" },
      { title: "Sprint retrospective", description: "Liked · Learned · Lacked · Longed for" },
    ],
  },
]

export const metadata: Metadata = {
  title: "Whiteboard — 25+ ready-to-teach templates, multiplayer, built-in · The Big Class",
  description:
    "A real-time multi-cursor whiteboard inside every live class. 25+ templates spanning K-12 (KG → Class 11-12), teaching scaffolds, brainstorms, SWOT, mind maps. No standalone whiteboard licence, no per-host-seat caps.",
  keywords: [
    "online whiteboard for teachers",
    "K-12 whiteboard templates",
    "Class 6 whiteboard worksheet",
    "JEE NEET whiteboard",
    "math whiteboard online",
    "live class whiteboard India",
    "collaborative teaching whiteboard",
    "free whiteboard alternative for teachers",
    "vedic maths whiteboard",
    "fraction circles whiteboard template",
  ],
  alternates: { canonical: `${SITE_URL}${PAGE_PATH}` },
  openGraph: {
    type: "website",
    url: `${SITE_URL}${PAGE_PATH}`,
    siteName: "The Big Class",
    title: "Pick a template. Teacher. Done.",
    description:
      "25+ teaching-ready whiteboard templates — from KG number boxes to Class 11 periodic tables. Real-time multi-cursor. Saves itself per class.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Whiteboard with 25+ templates · The Big Class",
    description:
      "K-12 grade-band scaffolds, brainstorms, SWOT, mind maps. Multiplayer. Built into every live class.",
  },
}

export default function WhiteboardFeaturePage() {
  const totalTemplates = TEMPLATE_GROUPS.reduce((s, g) => s + g.templates.length, 0)
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main id="main-content" className="flex-1">
        <FeaturePageShell
          eyebrow={`${totalTemplates}+ ready-to-teach templates · multiplayer · built-in`}
          title={
            <>
              Pick a template.
              <br />
              <span className="text-primary">Teacher. Done.</span>
            </>
          }
          subtitle={`A real-time, multi-cursor whiteboard sitting next to your video — with ${totalTemplates}+ teaching-ready scaffolds. KG number boxes through Class 11 periodic tables, brainstorms, SWOT, mind maps, lab reports. Pick one in two clicks and you're teaching, not setting up.`}
          heroImage="/tab_wedges.png"
        />

        {/* Templates-first proof. Lead with the leverage before the
            tooling. A teacher decides this page is for them based on
            whether they see *their* worksheet here. */}
        <section className="border-y border-border bg-muted/20 py-16">
          <div className="mx-auto max-w-6xl px-6 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-xs font-bold uppercase tracking-wider text-primary">
                The template library
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
                {totalTemplates} ready-to-teach boards, grouped by what you&rsquo;re teaching.
              </h2>
              <p className="mt-3 text-base leading-relaxed text-muted-foreground">
                None of these are &ldquo;starter shapes&rdquo; you spend 20 minutes wiring up. Pick a card → the board opens with the layout, labels, and prompts pre-placed. You add the words.
              </p>
            </div>

            <div className="mt-12 space-y-10">
              {TEMPLATE_GROUPS.map((group) => (
                <div key={group.id}>
                  <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="flex items-center gap-2 text-xl font-bold">
                      <span aria-hidden>{group.emoji}</span>
                      {group.label}
                      <span className="text-sm font-normal text-muted-foreground">
                        · {group.templates.length} {group.templates.length === 1 ? "template" : "templates"}
                      </span>
                    </h3>
                    <p className="max-w-xl text-sm text-muted-foreground">{group.hint}</p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {group.templates.map((t) => (
                      <div
                        key={t.title}
                        className="group rounded-xl border border-border bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-sm font-bold leading-snug">{t.title}</h4>
                          {t.gradeBand && (
                            <span className="shrink-0 rounded-full border border-primary/30 bg-primary/[0.06] px-1.5 py-0.5 text-[10px] font-bold text-primary">
                              {t.gradeBand}
                            </span>
                          )}
                        </div>
                        <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                          {t.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="mx-auto mt-12 max-w-2xl text-center">
              <p className="text-sm text-muted-foreground">
                Plus a <span className="font-medium text-foreground">blank canvas</span> when you want to draw from nothing — infinite grid, every tool ready.
              </p>
            </div>
          </div>
        </section>

        {/* What teachers actually do with this — Indian-classroom
            scenarios that show the leverage end-to-end. Removes the
            "great tool, but how do I use it on Monday morning?" gap. */}
        <section className="bg-background py-16">
          <div className="mx-auto max-w-6xl px-6 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-xs font-bold uppercase tracking-wider text-primary">
                In an Indian classroom
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
                What the board actually does between 7 pm and 9 pm.
              </h2>
              <p className="mt-3 text-base text-muted-foreground">
                Three scenarios from the educators we work with most.
              </p>
            </div>
            <div className="mt-10 grid gap-4 lg:grid-cols-3">
              <ScenarioCard
                emoji="🧮"
                title="Vedic maths · Class 5"
                quote="&ldquo;I open the Times table grid template, multiply 13 by 9 the Vedic way live, then drop the same board into the cohort feed so kids who missed it can replay.&rdquo;"
                stack={[
                  "Times table grid template (Class 3-5)",
                  "Multi-cursor — two kids race a row each",
                  "Saved to the past-class page automatically",
                ]}
              />
              <ScenarioCard
                emoji="🧪"
                title="NEET Biology · Class 11-12"
                quote="&ldquo;Lab report template gives me Hypothesis · Method · Results · Conclusion already laid out. I diagram the experiment, students copy into their notebooks, recording links the board to the explanation.&rdquo;"
                stack={[
                  "Lab report template (Teaching)",
                  "Frayer model for term-of-the-day",
                  "Board attaches to the recording sidebar",
                ]}
              />
              <ScenarioCard
                emoji="📈"
                title="JEE coaching · Cohort weekly"
                quote="&ldquo;OKR planner on Sunday for the week's targets. Sprint retro on Saturday — Liked · Learned · Lacked · Longed for. Same tool, two ends of the week. Parents see the recap auto-post in the community feed.&rdquo;"
                stack={[
                  "OKR planner + Sprint retrospective",
                  "Boards inline in the Common Room feed",
                  "Members react with 🎉 when they hit the OKR",
                ]}
              />
            </div>
          </div>
        </section>

        <FeatureSplit
          title="Real-time multi-cursor. Now, not 'soon.'"
          body={
            <>
              Open the same board in two browsers and you&rsquo;ll see two cursors moving at the same time — colour-coded per participant. Edits sync via the <span className="font-medium text-foreground">LiveKit data channel</span> you&rsquo;re already paying for, so a 20-student class draws on one canvas with zero extra infra. No standalone whiteboard licence. No &ldquo;upgrade to collaborative.&rdquo;
            </>
          }
          bullets={[
            "Named cursors with per-participant colour — Renu blue, Anaya rose, you in primary",
            "Edits stream live — no refresh-to-sync, no merge dialogs",
            "Students can request edit access; you approve from the same panel (no leaving the call)",
            "Read-only mode for late joiners catching up — they see the board, can't disturb it",
            "Snapshot per session — 'the board at minute 14' survives the class end",
          ]}
          mockup={<WhiteboardMockup />}
        />

        <FeatureSplit
          reverse
          title="One board per class, plus a standalone library."
          body={
            <>
              Every live class auto-attaches its own board. End the class, the board stays — students revisit from the past-class page. Need a scratchpad outside any class? <span className="font-medium text-foreground">/dashboard/whiteboards</span> is a full canvas library with auto-generated thumbnails, search, and folders. Drag-drop, rename, duplicate — same patterns as the rest of the app.
            </>
          }
          bullets={[
            "Per-session boards attach to the class automatically — no manual filing",
            "Standalone library at /dashboard/whiteboards",
            "Thumbnails auto-generated from the canvas itself (not a placeholder image)",
            "Click a thumbnail to open fullscreen — presentation-grade",
            "Rename, duplicate, delete; export as PNG/SVG with one click",
          ]}
          mockup={<WhiteboardLibraryMockup />}
        />

        <FeatureSplit
          title="The tools you'd expect, none you don't."
          body="Excalidraw under the hood — the most-loved sketching tool on the planet. Hand-drawn aesthetic, snappy export to PNG/SVG, full keyboard shortcuts, dark mode that doesn't suck. Your students recognise it. They don't need a tutorial."
          bullets={[
            "Hand-drawn aesthetic — feels human, not corporate",
            "Pen · eraser · shapes · arrows · text · sticky notes · images",
            "Pan + zoom infinite canvas — no fixed page size, no 'export to A4' nonsense",
            "Export selection or the whole board to PNG / SVG / clipboard",
            "Keyboard shortcuts for every common operation",
            "Dark mode + accessibility-tested colour palette",
          ]}
          mockup={<WhiteboardToolsMockup />}
        />

        {/* AI assist + access control — power features that
            differentiate from a plain hosted-whiteboard embed. */}
        <section className="border-y border-border bg-muted/30 py-16">
          <div className="mx-auto max-w-6xl px-6 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-xs font-bold uppercase tracking-wider text-primary">
                Power features
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
                Two things a standalone whiteboard won&rsquo;t do in your classroom.
              </h2>
            </div>
            <div className="mt-10 grid gap-4 sm:grid-cols-2">
              <PowerCard
                icon={<Sparkles className="h-4 w-4" />}
                title="AI refine — clean up a messy board"
                body="Drew a quick concept map mid-class? Hit ✨ Refine. We straighten the lines, align the boxes, harmonise the colours — and leave the meaning intact. One click, no tutorial."
              />
              <PowerCard
                icon={<Hand className="h-4 w-4" />}
                title="Student edit requests — host stays in control"
                body="Students ask to draw; you approve from a dropdown on the board itself. Cross-channel notifications both ways. No more 'who's drawing on my class?' moments."
              />
            </div>
          </div>
        </section>

        {/* "vs the alternatives" — direct competitor framing teachers
            actually search for. Beats abstract claims. */}
        <section className="bg-background py-16">
          <div className="mx-auto max-w-5xl px-6 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-xs font-bold uppercase tracking-wider text-primary">
                vs. the alternatives
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
                You came from one of these. Here&rsquo;s why this is different.
              </h2>
            </div>
            <div className="mx-auto mt-10 grid max-w-3xl gap-3">
              <ComparisonRow
                rival="A standalone hosted whiteboard"
                problem="Separate licence, separate sign-in, separate brand. Students need an account; classroom plans paywalled. Two browsers, two invoices."
                ours="Already inside your workspace. Students see it inside the class — no extra signup, no extra invoice."
              />
              <ComparisonRow
                rival="A built-in video-app whiteboard"
                problem="Disappears the moment the call ends. No template library. Bound to a paid host seat."
                ours="Saves per class, stays on the past-class page. 25+ templates. No per-host paywall."
              />
              <ComparisonRow
                rival="A sunset whiteboard product"
                problem="Discontinued by its vendor. Whatever you saved lives on borrowed time; export paths often half-broken."
                ours="Your boards, your CDN. One-click export to PNG / SVG. Workspace export in CSV / JSON, free tier included."
              />
              <ComparisonRow
                rival="A physical whiteboard"
                problem="Only one student in the room can write. No replay. Wiped at the end of the period."
                ours="20+ students can co-edit. Recording links to the board. Search the library months later."
              />
            </div>
          </div>
        </section>

        <FeatureCTA
          title="Open a board in 60 seconds. Free."
          body="Start your workspace, open /dashboard/whiteboards, pick a template — you're teaching."
        />
      </main>
      <Footer />
    </div>
  )
}

// ============================================================
// Helpers
// ============================================================

function ScenarioCard({
  emoji,
  title,
  quote,
  stack,
}: {
  emoji: string
  title: string
  quote: string
  stack: string[]
}) {
  return (
    <div className="flex h-full flex-col rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <span aria-hidden className="text-2xl">{emoji}</span>
        <h3 className="text-base font-bold">{title}</h3>
      </div>
      <p className="mt-3 text-sm italic leading-relaxed text-muted-foreground">{quote}</p>
      <div className="mt-auto pt-4">
        <p className="text-[10px] font-bold uppercase tracking-wider text-primary">
          Templates + features used
        </p>
        <ul className="mt-1.5 space-y-1">
          {stack.map((s) => (
            <li key={s} className="flex items-start gap-1.5 text-xs">
              <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-primary" />
              <span>{s}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function PowerCard({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode
  title: string
  body: string
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
          {icon}
        </span>
        <h3 className="text-base font-bold">{title}</h3>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
    </div>
  )
}

function ComparisonRow({ rival, problem, ours }: { rival: string; problem: string; ours: string }) {
  return (
    <div className="grid gap-3 rounded-xl border border-border bg-card p-4 sm:grid-cols-[160px_1fr_1fr]">
      <div className="flex items-center">
        <span className="text-sm font-bold">{rival}</span>
      </div>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-destructive">
          What hurts
        </p>
        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{problem}</p>
      </div>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-success">
          The Big Class
        </p>
        <p className="mt-0.5 text-xs leading-relaxed">{ours}</p>
      </div>
    </div>
  )
}

// ============================================================
// Mockups
// ============================================================
function WhiteboardMockup() {
  return (
    <PreviewFrame title="dashboard › classes › live › whiteboard">
      <div className="relative aspect-[16/10] overflow-hidden rounded-md border border-border bg-card">
        <div
          aria-hidden
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "linear-gradient(to right, oklch(0.85 0 0 / 0.4) 1px, transparent 1px), linear-gradient(to bottom, oklch(0.85 0 0 / 0.4) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />
        <svg
          aria-hidden
          className="absolute left-8 top-8 h-24 w-40 text-primary/80"
          viewBox="0 0 160 96"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <path d="M10 80 Q40 10 80 50 T150 30" />
          <circle cx="80" cy="50" r="4" />
        </svg>
        <svg
          aria-hidden
          className="absolute right-12 top-16 h-20 w-28 text-accent"
          viewBox="0 0 120 80"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
        >
          <rect x="10" y="10" width="100" height="60" rx="6" />
          <line x1="10" y1="35" x2="110" y2="35" />
        </svg>
        <svg
          aria-hidden
          className="absolute bottom-8 left-1/3 h-12 w-32 text-foreground/70"
          viewBox="0 0 128 48"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M5 24 H120" markerEnd="url(#a)" />
          <defs>
            <marker id="a" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
              <path d="M0 0 L6 3 L0 6 Z" fill="currentColor" />
            </marker>
          </defs>
        </svg>
        {[
          { x: "40%", y: "30%", label: "Renu", colour: "bg-rose-500" },
          { x: "70%", y: "55%", label: "Dinesh", colour: "bg-sky-500" },
          { x: "25%", y: "70%", label: "Anaya", colour: "bg-violet-500" },
        ].map((c) => (
          <div key={c.label} className="absolute" style={{ left: c.x, top: c.y }}>
            <svg className={`h-4 w-4 ${c.colour.replace("bg-", "fill-")} drop-shadow`} viewBox="0 0 16 16">
              <path d="M2 1 L14 8 L8 9 L7 15 Z" />
            </svg>
            <span
              className={`ml-2 inline-block rounded px-1.5 py-0.5 text-[9px] font-medium text-white ${c.colour}`}
            >
              {c.label}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <Users className="h-3 w-3" />
          3 drawing
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Wifi className="h-3 w-3 text-success" />
          Auto-saved · 2s ago
        </span>
      </div>
    </PreviewFrame>
  )
}

function WhiteboardLibraryMockup() {
  const boards = [
    { title: "Vedic maths · Squares & cubes", updated: "2h", strokes: 42 },
    { title: "Hooks deep dive — class 4",     updated: "1d", strokes: 117 },
    { title: "Brainstorm · cohort 7 launch",  updated: "3d", strokes: 28 },
    { title: "ER diagram demo",               updated: "5d", strokes: 64 },
  ]
  return (
    <PreviewFrame title="dashboard › whiteboards">
      <div className="grid grid-cols-2 gap-2">
        {boards.map((b) => (
          <div key={b.title} className="rounded-md border border-border bg-card p-2">
            <div className="aspect-video rounded bg-gradient-to-br from-primary/10 via-accent/5 to-transparent" />
            <p className="mt-2 truncate text-[11px] font-medium">{b.title}</p>
            <p className="text-[9px] text-muted-foreground">
              {b.strokes} strokes · {b.updated} ago
            </p>
          </div>
        ))}
      </div>
      <p className="mt-2 inline-flex items-center gap-1 text-[10px] text-muted-foreground">
        <ScanSearch className="h-3 w-3" /> Searchable + filterable · auto-thumbnails
      </p>
    </PreviewFrame>
  )
}

function WhiteboardToolsMockup() {
  const tools = [
    { label: "Pen",       short: "P", icon: PenTool },
    { label: "Eraser",    short: "E", icon: Layers },
    { label: "Rectangle", short: "R", icon: Layers },
    { label: "Arrow",     short: "A", icon: Layers },
    { label: "Text",      short: "T", icon: Layers },
    { label: "Sticky",    short: "S", icon: Layers },
  ]
  return (
    <PreviewFrame title="Whiteboard tools">
      <div className="flex flex-wrap gap-2">
        {tools.map((t) => (
          <div
            key={t.label}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1.5 text-xs"
          >
            <span className="font-medium">{t.label}</span>
            <kbd className="rounded bg-muted px-1 text-[9px] font-mono text-muted-foreground">
              {t.short}
            </kbd>
          </div>
        ))}
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-[10px] text-muted-foreground">
        <div className="rounded-md border border-border/60 bg-muted/30 p-2">
          <p className="font-semibold text-foreground">⌘+Z</p>
          <p>Undo</p>
        </div>
        <div className="rounded-md border border-border/60 bg-muted/30 p-2">
          <p className="font-semibold text-foreground">⌘+Shift+E</p>
          <p>Export PNG</p>
        </div>
        <div className="rounded-md border border-border/60 bg-muted/30 p-2">
          <p className="font-semibold text-foreground">F</p>
          <p>Fullscreen</p>
        </div>
      </div>
    </PreviewFrame>
  )
}
