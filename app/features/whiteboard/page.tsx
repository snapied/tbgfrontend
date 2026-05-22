// Feature page — Whiteboard.
//
// The multiplayer whiteboard built into every class, course, and
// session. Sketch ideas, diagram concepts, teach math live, save
// per-session boards. Powered by Excalidraw under the hood with
// SQLite persistence + real-time collaboration.

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
const PAGE_PATH = "/features/whiteboard"

export const metadata: Metadata = {
  title: "Whiteboard — collaborative, multiplayer, built-in · The Big Class",
  description:
    "A real-time multiplayer whiteboard built into every live class. Sketch diagrams, teach math, brainstorm with your cohort — saved per session, available anytime.",
  keywords: [
    "online whiteboard",
    "collaborative whiteboard",
    "live class whiteboard",
    "teaching whiteboard",
    "multiplayer whiteboard LMS",
    "excalidraw whiteboard",
    "real-time whiteboard for teachers",
  ],
  alternates: { canonical: `${SITE_URL}${PAGE_PATH}` },
  openGraph: {
    type: "website",
    url: `${SITE_URL}${PAGE_PATH}`,
    siteName: "The Big Class",
    title: "A whiteboard that's part of the class, not a separate tab.",
    description:
      "Multiplayer sketching, diagrams, math — saved per session. No Miro account, no Zoom whiteboard limits, no extra license.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Whiteboard built into every class",
    description:
      "Real-time multiplayer canvas — sketch, diagram, teach. Saved per session.",
  },
}

export default function WhiteboardFeaturePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <FeaturePageShell
          eyebrow="Whiteboard"
          title={
            <>
              A whiteboard that&apos;s part of the class,{" "}
              <span className="text-primary">not a separate tab</span>.
            </>
          }
          subtitle="Sketch diagrams, teach math, brainstorm with your cohort — without leaving the live class or asking everyone to install Miro. The board is part of every class, course, and quick scratchpad. Saves itself, opens where you left off."
          heroImage="/tab_wedges.png"
        />

        <FeatureSplit
          title="A canvas inside every class, zero setup."
          body={
            <>
              Open the Whiteboard tab inside any live class and the canvas appears next to the video. Sketch live, save automatically, and the board lives on for students to revisit from the past-class page. No Miro account, no separate link, no &quot;please install this Chrome extension.&quot;
            </>
          }
          bullets={[
            "Available inside every live class as a second-pane tab",
            "Eraser, pen, shapes, sticky notes, arrows, text — the staples",
            "Pan + zoom with infinite canvas — no fixed page size",
            "Autosaves to IndexedDB locally + your backend so nothing's lost",
            "Real-time multiplayer cursors + co-editing — coming soon (see below)",
          ]}
          mockup={<WhiteboardMockup />}
        />

        <FeatureSplit
          reverse
          title="One board per session. Or one global library."
          body={
            <>
              Every live class gets its own board, persistent across the session. End the class, the board lives on — students can revisit it from the past-class page. Need a scratchpad outside a class? Open <span className="font-medium text-foreground">/dashboard/whiteboards</span> for a standalone canvas library with thumbnails, search, and folders.
            </>
          }
          bullets={[
            "Per-session boards — auto-attached to the right class",
            "Standalone boards library at /dashboard/whiteboards",
            "Thumbnails auto-generated from the canvas itself",
            "Rename, duplicate, delete — same patterns as the rest of the app",
            "Open a board fullscreen for a presentation-grade view",
          ]}
          mockup={<WhiteboardLibraryMockup />}
        />

        <FeatureSplit
          title="The tools you'd expect, none you don't."
          body="We picked Excalidraw under the hood because it's the most-loved diagramming tool on the planet. Hand-drawn aesthetic, snappy export to PNG/SVG, full keyboard shortcuts, dark mode that doesn't suck. Your students recognise it. They don't need a tutorial."
          bullets={[
            "Hand-drawn aesthetic — feels human, not corporate",
            "Export selection (or the whole board) to PNG / SVG / clipboard",
            "Keyboard shortcuts for every common operation",
            "Dark mode + readable colour palette out of the box",
            "Library of starter shapes for diagrams, flowcharts, mind maps",
          ]}
          mockup={<WhiteboardToolsMockup />}
        />

        {/* Coming-soon transparency block — honest about what's shipped
            and what's planned, so visitors know where the product is
            going without being misled. */}
        <section className="border-t border-border bg-card">
          <div className="mx-auto max-w-4xl px-6 py-12">
            <div className="rounded-2xl border border-dashed border-primary/30 bg-primary/[0.03] p-6">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                Coming soon
              </p>
              <h2 className="mt-2 font-serif text-2xl font-bold">
                Real-time multiplayer + named cursors
              </h2>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                Today the whiteboard is single-author at a time with refresh-to-sync. We&apos;re
                building real-time multi-cursor co-editing on top of the LiveKit data channel
                you&apos;re already paying for — so a class with 20 students draws on one canvas
                with their colours visible. No new infra, no extra cost.
              </p>
              <ul className="mt-3 grid gap-2 text-sm text-foreground/85 sm:grid-cols-2">
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  <span>Yjs / CRDT-based merge so concurrent edits don&apos;t fight</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  <span>Named cursors with per-participant colour</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  <span>Read-only mode for late joiners catching up</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  <span>Snapshot per session so &quot;the board at minute 14&quot; survives</span>
                </li>
              </ul>
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
// Mockup #1 — Multiplayer canvas with 3 cursors
// ============================================================
function WhiteboardMockup() {
  return (
    <PreviewFrame title="dashboard › classes › live › whiteboard">
      <div className="relative aspect-[16/10] overflow-hidden rounded-md border border-border bg-card">
        {/* Faux paper grid */}
        <div
          aria-hidden
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "linear-gradient(to right, oklch(0.85 0 0 / 0.4) 1px, transparent 1px), linear-gradient(to bottom, oklch(0.85 0 0 / 0.4) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />
        {/* Faux sketches */}
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
        {/* Cursors */}
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
        <span>3 participants drawing</span>
        <span>Auto-saved · 2s ago</span>
      </div>
    </PreviewFrame>
  )
}

// ============================================================
// Mockup #2 — Whiteboards library
// ============================================================
function WhiteboardLibraryMockup() {
  const boards = [
    { title: "Vedic maths · Squares", updated: "2h", strokes: 42 },
    { title: "Hooks deep dive — class 4", updated: "1d", strokes: 117 },
    { title: "Brainstorm: cohort 7 launch", updated: "3d", strokes: 28 },
    { title: "Sketch: ER diagram demo", updated: "5d", strokes: 64 },
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
    </PreviewFrame>
  )
}

// ============================================================
// Mockup #3 — Tools palette
// ============================================================
function WhiteboardToolsMockup() {
  const tools = [
    { label: "Pen", short: "P" },
    { label: "Eraser", short: "E" },
    { label: "Rectangle", short: "R" },
    { label: "Arrow", short: "A" },
    { label: "Text", short: "T" },
    { label: "Sticky", short: "S" },
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
