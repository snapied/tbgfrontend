// Tours for the Docs surface.
//
// Two flavours — a hub tour for /dashboard/docs (the gallery + recents)
// and an editor tour for /dashboard/docs/<id> (the BlockNote surface).
// Each is mounted independently so a teacher can re-trigger whichever
// is relevant without seeing the other.

import type { TourStep } from "@/components/tour/product-tour"

// ── Docs hub: /dashboard/docs ─────────────────────────────────────
export const DOCS_HUB_TOUR_ID = "docs-hub-v1"
export const DOCS_HUB_TOUR: TourStep[] = [
  {
    title: "Meet Docs — your knowledge layer",
    body:
      "Docs are the connective tissue across your academy. Write study guides, course handbooks, cohort wikis, public landing pages — all in one editor, all with live embeds of your lessons, recordings, whiteboards and quizzes.",
    emoji: "📚",
    placement: "center",
  },
  {
    title: "Start from a template",
    body:
      "Eight scaffolds, picked because teachers actually need them — Course handbook, Lesson study guide, Cohort wiki, Public knowledge hub, plus operations templates. Click a tile to spin up a new draft pre-filled with that template's structure.",
    emoji: "🧱",
    placement: "center",
  },
  {
    title: "Or jump straight in",
    body:
      "'New blank doc' creates an empty page. The editor opens with a single paragraph and a slash menu — type '/' to insert any block, including the five typed embeds.",
    emoji: "✏️",
    placement: "center",
  },
  {
    title: "Your sidebar tree",
    body:
      "The left rail organises docs by space and shows your recent activity. Drag docs between spaces, nest one inside another (max two levels), and pin the ones you keep returning to.",
    emoji: "🗂️",
    placement: "center",
  },
  {
    title: "Search across every doc",
    body:
      "The search input matches against titles and body content — useful when you remember a phrase but not which doc it lives in. Permissions are respected — you only see what you're allowed to see.",
    emoji: "🔍",
    placement: "center",
  },
  {
    title: "Publishing — six audiences",
    body:
      "Every doc starts private. The audience pill in the editor top-right opens a dialog with six options: Private, Admins, Workspace, Cohort, Course, or Public on the web. Public docs get a custom slug at /k/<your-slug>.",
    emoji: "🌐",
    placement: "center",
  },
]

// ── Doc editor: /dashboard/docs/<id> ──────────────────────────────
export const DOC_EDITOR_TOUR_ID = "docs-editor-v1"
export const DOC_EDITOR_TOUR: TourStep[] = [
  {
    title: "The editor — multiplayer, slash-driven",
    body:
      "This is a BlockNote editor wrapped in Liveblocks. Type '/' anywhere to open the slash menu — every block type and every embed lives there. Drafts auto-save 300ms after the last keystroke.",
    emoji: "✍️",
    placement: "center",
  },
  {
    target: "#doc-header",
    title: "Title, icon, audience",
    body:
      "Click the emoji to swap it. Click the title to rename. The audience pill on the right shows the current visibility — click it to open the publish dialog.",
    emoji: "📝",
    placement: "bottom",
  },
  {
    target: "#doc-editor-surface",
    title: "Five typed embeds",
    body:
      "Type '/' inside the editor and scroll to 'Embeds from your academy'. Pick lesson / recording / whiteboard / quiz / doc — we open a searchable picker across every embeddable artifact in your workspace.",
    emoji: "🔌",
    placement: "top",
  },
  {
    target: "#doc-editor-surface",
    title: "Embeds are LIVE references",
    body:
      "Every embed stores only the artifact id. If a recording gets new chapters or a quiz gets two more questions, every doc embedding it shows the latest — automatically.",
    emoji: "♻️",
    placement: "top",
  },
  {
    target: "#doc-right-rail",
    title: "Comments + Links",
    body:
      "The Comments tab is for threaded discussion — @-mention anyone in your workspace and they're notified. The Links tab shows backlinks (what embeds this doc) and forward links (what this doc embeds), updated live.",
    emoji: "💬",
    placement: "left",
  },
  {
    target: "#doc-publish-button",
    title: "Publish when ready",
    body:
      "Pick an audience. Set an optional public slug. Toggle SEO metadata. When you publish to Public for the first time, admins and instructors are notified — so your team sees the knowledge hub grow.",
    emoji: "🚀",
    placement: "bottom",
  },
]
