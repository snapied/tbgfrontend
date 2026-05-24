// Pre-baked Excalidraw scenes used when seeding new whiteboards from
// the template picker. Each export is a `StoredScene`-compatible
// payload that we write to localStorage at
//   "vidyanxt.whiteboard.<persistenceKey>"
// BEFORE navigating to the board route — the canvas reads from that
// cache on first mount, so the teacher lands on a pre-populated
// canvas instead of staring at a blank grid.
//
// Frame wrapping:
//   Every template starts with an Excalidraw `frame` element. Its
//   children carry `frameId: <frame-id>` so the frame label sits at
//   the top and the contents move as a single unit when the teacher
//   drags it. This is the Figjam/Miro-style "container" idiom — much
//   better than loose elements scattered across the canvas.
//
// Font choice:
//   Templates use fontFamily=2 (Helvetica / system Sans). Excalidraw's
//   default Excalifont goes through a subsetting Web Worker that loads
//   font assets from our unpkg-proxied CDN — on slow networks it logs
//   "Active worker did not respond for 1000ms!" while bootstrapping a
//   newly seeded scene full of text elements. System sans bypasses
//   that worker entirely. The teacher's own subsequent edits still use
//   whatever font they pick in the toolbar.
//
// Authoring rules — every element must have:
//   • A unique `id` (we scope readable ones per template so multiple
//     boards from the same template don't collide on shared ids inside
//     the same Y.Doc room).
//   • A `seed` (any int) and `versionNonce` (any int) — Excalidraw
//     uses these for change detection.
//   • `groupIds: []`, `boundElements: null` (unless we wire a label
//     into a container), `link: null`, `locked: false`.
//   • `roundness: { type: 3 }` for sticky/section rectangles to get
//     the soft-corner look; `null` for crisp grid cells.
//
// IMPORTANT: do NOT include the `index` field on hand-authored
// elements below. The seeder rewrites all indices in a single sweep
// to guarantee they're strictly increasing.

import { generateNKeysBetween } from "fractional-indexing"
import type { ExcalidrawElement } from "@excalidraw/excalidraw/element/types"
import type { AppState, BinaryFiles } from "@excalidraw/excalidraw/types"

const STORAGE_PREFIX = "vidyanxt.whiteboard."

// Helvetica — Excalidraw's built-in system-sans family. Skips the
// font-subsetting worker (no "active worker" warning on seed) and
// looks crisp at any zoom level.
const FONT_SANS = 2

export interface StoredScene {
  elements: ExcalidrawElement[]
  appState: Partial<AppState>
  files: BinaryFiles
}

export type TemplateKey =
  | "blank"
  | "lesson-plan"
  | "brainstorm"
  | "weekly-schedule"
  | "swot"
  | "persona"
  | "mind-map"
  | "fishbone"
  | "kwl"
  | "frayer"
  | "empathy-map"
  | "eisenhower"
  | "five-whys"
  | "venn"
  | "sprint-retro"
  | "okr"
  | "storyboard"
  | "lab-report"
  | "decision-tree"
  // K-12 grade-band templates
  | "kg-numbers"
  | "kg-shapes"
  | "primary-times-table"
  | "primary-fractions"
  | "middle-pos"
  | "middle-algebra"
  | "secondary-periodic"
  | "senior-supply-demand"

type ElementBase = Partial<ExcalidrawElement> & {
  id: string
  type: string
  x: number
  y: number
  width: number
  height: number
}

function el(base: ElementBase): ExcalidrawElement {
  return {
    angle: 0,
    strokeColor: "#1e293b",
    backgroundColor: "transparent",
    fillStyle: "solid",
    strokeWidth: 1.5,
    strokeStyle: "solid",
    roughness: 0,
    opacity: 100,
    groupIds: [],
    frameId: null,
    boundElements: null,
    link: null,
    locked: false,
    seed: Math.floor(Math.random() * 2_000_000),
    versionNonce: Math.floor(Math.random() * 2_000_000),
    version: 1,
    updated: Date.now(),
    isDeleted: false,
    roundness: null,
    ...base,
  } as ExcalidrawElement
}

function text(opts: {
  id: string
  x: number
  y: number
  width: number
  height: number
  text: string
  fontSize?: number
  fontFamily?: number
  color?: string
  align?: "left" | "center" | "right"
  containerId?: string
  bold?: boolean
  frameId?: string
}): ExcalidrawElement {
  const fontSize = opts.fontSize ?? 18
  const fontFamily = opts.fontFamily ?? FONT_SANS
  const align = opts.align ?? "left"
  return el({
    id: opts.id,
    type: "text",
    x: opts.x,
    y: opts.y,
    width: opts.width,
    height: opts.height,
    text: opts.text,
    originalText: opts.text,
    fontSize,
    fontFamily,
    textAlign: align,
    verticalAlign: opts.containerId ? "middle" : "top",
    baseline: Math.round(fontSize * 0.85),
    lineHeight: 1.25 as unknown as number,
    autoResize: !opts.containerId,
    containerId: opts.containerId ?? null,
    strokeColor: opts.color ?? "#1e293b",
    strokeWidth: opts.bold ? 2 : 1,
    frameId: opts.frameId ?? null,
  } as unknown as ElementBase)
}

function rect(opts: {
  id: string
  x: number
  y: number
  width: number
  height: number
  fill: string
  stroke?: string
  strokeWidth?: number
  rounded?: boolean
  dashed?: boolean
  frameId?: string
}): ExcalidrawElement {
  return el({
    id: opts.id,
    type: "rectangle",
    x: opts.x,
    y: opts.y,
    width: opts.width,
    height: opts.height,
    backgroundColor: opts.fill,
    fillStyle: "solid",
    strokeColor: opts.stroke ?? "#94a3b8",
    strokeWidth: opts.strokeWidth ?? 1.5,
    strokeStyle: opts.dashed ? "dashed" : "solid",
    roundness: opts.rounded ? { type: 3 } : null,
    frameId: opts.frameId ?? null,
  } as ElementBase)
}

function ellipse(opts: {
  id: string
  x: number
  y: number
  width: number
  height: number
  fill: string
  stroke?: string
  strokeWidth?: number
  dashed?: boolean
  frameId?: string
}): ExcalidrawElement {
  return el({
    id: opts.id,
    type: "ellipse",
    x: opts.x,
    y: opts.y,
    width: opts.width,
    height: opts.height,
    backgroundColor: opts.fill,
    fillStyle: "solid",
    strokeColor: opts.stroke ?? "#94a3b8",
    strokeWidth: opts.strokeWidth ?? 1.5,
    strokeStyle: opts.dashed ? "dashed" : "solid",
    frameId: opts.frameId ?? null,
  } as ElementBase)
}

function arrow(opts: {
  id: string
  x: number
  y: number
  endX: number
  endY: number
  color?: string
  strokeWidth?: number
  dashed?: boolean
  frameId?: string
}): ExcalidrawElement {
  const dx = opts.endX - opts.x
  const dy = opts.endY - opts.y
  return el({
    id: opts.id,
    type: "arrow",
    x: opts.x,
    y: opts.y,
    width: Math.abs(dx),
    height: Math.abs(dy),
    points: [
      [0, 0],
      [dx, dy],
    ],
    lastCommittedPoint: null,
    startBinding: null,
    endBinding: null,
    startArrowhead: null,
    endArrowhead: "arrow",
    strokeColor: opts.color ?? "#64748b",
    strokeWidth: opts.strokeWidth ?? 2,
    strokeStyle: opts.dashed ? "dashed" : "solid",
    frameId: opts.frameId ?? null,
  } as ElementBase)
}

// A `line` is like an arrow but without an arrowhead — used for the
// fishbone spine when we want a clean unidirectional spine but don't
// want a separate arrow shaft.
function line(opts: {
  id: string
  x: number
  y: number
  endX: number
  endY: number
  color?: string
  strokeWidth?: number
  frameId?: string
}): ExcalidrawElement {
  const dx = opts.endX - opts.x
  const dy = opts.endY - opts.y
  return el({
    id: opts.id,
    type: "line",
    x: opts.x,
    y: opts.y,
    width: Math.abs(dx),
    height: Math.abs(dy),
    points: [
      [0, 0],
      [dx, dy],
    ],
    lastCommittedPoint: null,
    startBinding: null,
    endBinding: null,
    strokeColor: opts.color ?? "#475569",
    strokeWidth: opts.strokeWidth ?? 2,
  } as ElementBase)
}

// Frame container. Excalidraw renders frames with a thin border and a
// label above the top-left corner. Children with `frameId` set are
// visually clipped/grouped to the frame's bounds and move with it.
function frame(opts: {
  id: string
  x: number
  y: number
  width: number
  height: number
  name: string
}): ExcalidrawElement {
  return el({
    id: opts.id,
    type: "frame",
    x: opts.x,
    y: opts.y,
    width: opts.width,
    height: opts.height,
    name: opts.name,
    backgroundColor: "transparent",
    strokeColor: "#cbd5e1",
    strokeWidth: 2,
  } as ElementBase)
}

// ── Lesson plan ─────────────────────────────────────────────────────
function lessonPlanScene(): StoredScene {
  const FRAME_ID = "lp-frame"
  const cardW = 320
  const cardH = 200
  const gap = 32
  const left = 60
  const top = 100
  const titleBarY = 30

  const cards: Array<{ id: string; title: string; hint: string; fill: string; stroke: string; pos: [number, number] }> = [
    { id: "lp-obj", title: "Objective", hint: "By the end of class, students will…", fill: "#dbeafe", stroke: "#3b82f6", pos: [left, top] },
    { id: "lp-hook", title: "Hook", hint: "Open question · story · demo to grab attention", fill: "#fef3c7", stroke: "#f59e0b", pos: [left + cardW + gap, top] },
    { id: "lp-practice", title: "Practice", hint: "Guided activity · pair work · worked example", fill: "#dcfce7", stroke: "#22c55e", pos: [left, top + cardH + gap] },
    { id: "lp-exit", title: "Exit ticket", hint: "1 question that proves they got it", fill: "#fce7f3", stroke: "#ec4899", pos: [left + cardW + gap, top + cardH + gap] },
  ]

  const elements: ExcalidrawElement[] = []
  elements.push(frame({ id: FRAME_ID, x: 0, y: 0, width: cardW * 2 + gap + left * 2, height: top + (cardH * 2) + gap + 60, name: "Lesson plan" }))
  elements.push(
    text({ id: "lp-title", x: left, y: titleBarY, width: cardW * 2 + gap, height: 36, text: "Lesson plan", fontSize: 28, color: "#0f172a", bold: true, frameId: FRAME_ID }),
    text({ id: "lp-date", x: left, y: titleBarY + 38, width: cardW * 2 + gap, height: 22, text: new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" }), fontSize: 14, color: "#64748b", frameId: FRAME_ID }),
  )
  for (const c of cards) {
    elements.push(
      rect({ id: c.id, x: c.pos[0], y: c.pos[1], width: cardW, height: cardH, fill: c.fill, stroke: c.stroke, rounded: true, frameId: FRAME_ID }),
      text({ id: `${c.id}-title`, x: c.pos[0] + 18, y: c.pos[1] + 18, width: cardW - 36, height: 32, text: c.title, fontSize: 22, color: c.stroke, bold: true, frameId: FRAME_ID }),
      text({ id: `${c.id}-hint`, x: c.pos[0] + 18, y: c.pos[1] + 58, width: cardW - 36, height: 28, text: `• ${c.hint}`, fontSize: 14, color: "#475569", frameId: FRAME_ID }),
    )
  }
  return finalise(elements)
}

// ── Brainstorm ──────────────────────────────────────────────────────
function brainstormScene(): StoredScene {
  const FRAME_ID = "bs-frame"
  const cx = 540
  const cy = 400
  const centreW = 220
  const centreH = 110
  const stickyW = 160
  const stickyH = 100
  const radius = 280

  const elements: ExcalidrawElement[] = []
  elements.push(frame({ id: FRAME_ID, x: 100, y: 40, width: 880, height: 720, name: "Brainstorm" }))
  elements.push(
    text({ id: "bs-title", x: cx - 200, y: 70, width: 400, height: 36, text: "Brainstorm", fontSize: 28, color: "#0f172a", align: "center", bold: true, frameId: FRAME_ID }),
    text({ id: "bs-subtitle", x: cx - 200, y: 108, width: 400, height: 22, text: "Drop ideas around the topic — branch, group, connect.", fontSize: 13, color: "#64748b", align: "center", frameId: FRAME_ID }),
  )
  elements.push(
    rect({ id: "bs-centre", x: cx - centreW / 2, y: cy - centreH / 2, width: centreW, height: centreH, fill: "#1e293b", stroke: "#0f172a", rounded: true, frameId: FRAME_ID }),
    text({ id: "bs-centre-label", x: cx - centreW / 2 + 10, y: cy - 14, width: centreW - 20, height: 28, text: "Topic →", fontSize: 20, color: "#f8fafc", align: "center", bold: true, frameId: FRAME_ID }),
  )

  const stickies = [
    { label: "Idea 1", fill: "#fef9c3", stroke: "#facc15" },
    { label: "Idea 2", fill: "#bae6fd", stroke: "#0ea5e9" },
    { label: "Idea 3", fill: "#fbcfe8", stroke: "#ec4899" },
    { label: "Idea 4", fill: "#bbf7d0", stroke: "#22c55e" },
    { label: "Idea 5", fill: "#fed7aa", stroke: "#f97316" },
    { label: "Idea 6", fill: "#ddd6fe", stroke: "#8b5cf6" },
    { label: "Idea 7", fill: "#fecaca", stroke: "#ef4444" },
    { label: "Idea 8", fill: "#a7f3d0", stroke: "#14b8a6" },
  ]
  stickies.forEach((s, i) => {
    const angle = (i / stickies.length) * Math.PI * 2 - Math.PI / 2
    const x = cx + Math.cos(angle) * radius - stickyW / 2
    const y = cy + Math.sin(angle) * radius - stickyH / 2
    elements.push(
      rect({ id: `bs-sticky-${i}`, x, y, width: stickyW, height: stickyH, fill: s.fill, stroke: s.stroke, rounded: true, frameId: FRAME_ID }),
      text({ id: `bs-sticky-${i}-label`, x: x + 12, y: y + 16, width: stickyW - 24, height: 24, text: s.label, fontSize: 17, color: "#0f172a", align: "center", bold: true, frameId: FRAME_ID }),
      text({ id: `bs-sticky-${i}-hint`, x: x + 12, y: y + 44, width: stickyW - 24, height: 40, text: "double-click to edit", fontSize: 11, color: "#64748b", align: "center", frameId: FRAME_ID }),
    )
    const sx = cx + Math.cos(angle) * (centreW / 2 + 6)
    const sy = cy + Math.sin(angle) * (centreH / 2 + 6)
    const ex = cx + Math.cos(angle) * (radius - stickyW / 2 - 8)
    const ey = cy + Math.sin(angle) * (radius - stickyH / 2 - 8)
    elements.push(arrow({ id: `bs-arrow-${i}`, x: sx, y: sy, endX: ex, endY: ey, color: "#94a3b8", frameId: FRAME_ID }))
  })
  return finalise(elements)
}

// ── Weekly schedule ─────────────────────────────────────────────────
function weeklyScheduleScene(): StoredScene {
  const FRAME_ID = "ws-frame"
  const left = 40
  const top = 100
  const colW = 150
  const rowH = 110
  const headerH = 50
  const labelW = 90

  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
  const blocks = [
    { label: "Morning", hint: "08:00 – 12:00" },
    { label: "Midday", hint: "12:00 – 15:00" },
    { label: "Afternoon", hint: "15:00 – 18:00" },
    { label: "Evening", hint: "18:00 – 21:00" },
  ]
  const todayDow = (new Date().getDay() + 6) % 7

  const elements: ExcalidrawElement[] = []
  const frameW = labelW + colW * days.length + 60
  const frameH = top + headerH + 8 + blocks.length * (rowH + 8) + 30
  elements.push(frame({ id: FRAME_ID, x: 0, y: 0, width: frameW, height: frameH, name: "Weekly schedule" }))
  elements.push(
    text({ id: "ws-title", x: left, y: 30, width: 500, height: 36, text: "Weekly schedule", fontSize: 28, color: "#0f172a", bold: true, frameId: FRAME_ID }),
    text({ id: "ws-subtitle", x: left, y: 68, width: 800, height: 22, text: "Block out your week — drag sessions, swap blocks, share with the team.", fontSize: 13, color: "#64748b", frameId: FRAME_ID }),
  )
  days.forEach((d, i) => {
    const x = left + labelW + i * colW
    const isToday = i === todayDow
    elements.push(
      rect({ id: `ws-head-${i}`, x, y: top, width: colW - 4, height: headerH, fill: isToday ? "#1e293b" : "#f8fafc", stroke: isToday ? "#0f172a" : "#cbd5e1", rounded: true, frameId: FRAME_ID }),
      text({ id: `ws-head-${i}-label`, x: x + 8, y: top + 14, width: colW - 20, height: 24, text: d, fontSize: 17, color: isToday ? "#f8fafc" : "#475569", align: "center", bold: true, frameId: FRAME_ID }),
    )
  })
  blocks.forEach((b, ri) => {
    const y = top + headerH + 8 + ri * (rowH + 8)
    elements.push(
      text({ id: `ws-row-${ri}-label`, x: left + 4, y: y + 22, width: labelW - 8, height: 24, text: b.label, fontSize: 15, color: "#0f172a", align: "right", bold: true, frameId: FRAME_ID }),
      text({ id: `ws-row-${ri}-hint`, x: left + 4, y: y + 50, width: labelW - 8, height: 18, text: b.hint, fontSize: 11, color: "#94a3b8", align: "right", frameId: FRAME_ID }),
    )
    for (let ci = 0; ci < days.length; ci++) {
      const x = left + labelW + ci * colW
      elements.push(rect({ id: `ws-cell-${ri}-${ci}`, x, y, width: colW - 4, height: rowH, fill: "#ffffff", stroke: "#e2e8f0", rounded: true, dashed: true, frameId: FRAME_ID }))
    }
  })
  return finalise(elements)
}

// ── SWOT Analysis ───────────────────────────────────────────────────
// Strategy classic: 2×2 grid mapping internal (S/W) vs external (O/T)
// and positive (S/O) vs negative (W/T). Cell colours follow standard
// SWOT convention — green / amber / blue / red.
function swotScene(): StoredScene {
  const FRAME_ID = "sw-frame"
  const left = 60
  const top = 110
  const cardW = 380
  const cardH = 240
  const gap = 20

  const cells = [
    { id: "sw-s", label: "Strengths",     hint: "What we do better than anyone",   fill: "#dcfce7", stroke: "#16a34a", text: "#15803d", pos: [left, top] },
    { id: "sw-w", label: "Weaknesses",    hint: "Where alternatives beat us",      fill: "#fef9c3", stroke: "#ca8a04", text: "#a16207", pos: [left + cardW + gap, top] },
    { id: "sw-o", label: "Opportunities", hint: "Market shifts we can ride",       fill: "#dbeafe", stroke: "#2563eb", text: "#1d4ed8", pos: [left, top + cardH + gap] },
    { id: "sw-t", label: "Threats",       hint: "External risks to plan against",  fill: "#fee2e2", stroke: "#dc2626", text: "#b91c1c", pos: [left + cardW + gap, top + cardH + gap] },
  ]

  const elements: ExcalidrawElement[] = []
  const frameW = left * 2 + cardW * 2 + gap
  const frameH = top + cardH * 2 + gap + 50
  elements.push(frame({ id: FRAME_ID, x: 0, y: 0, width: frameW, height: frameH, name: "SWOT analysis" }))
  elements.push(
    text({ id: "sw-title", x: left, y: 30, width: 600, height: 36, text: "SWOT analysis", fontSize: 28, color: "#0f172a", bold: true, frameId: FRAME_ID }),
    text({ id: "sw-subtitle", x: left, y: 68, width: 800, height: 22, text: "Internal (above) vs external (below) · Helpful (left) vs harmful (right)", fontSize: 13, color: "#64748b", frameId: FRAME_ID }),
  )
  for (const c of cells) {
    elements.push(
      rect({ id: c.id, x: c.pos[0], y: c.pos[1], width: cardW, height: cardH, fill: c.fill, stroke: c.stroke, strokeWidth: 2, rounded: true, frameId: FRAME_ID }),
      // Header band — a darker stripe across the top of each card
      rect({ id: `${c.id}-band`, x: c.pos[0], y: c.pos[1], width: cardW, height: 40, fill: c.stroke, stroke: c.stroke, rounded: true, frameId: FRAME_ID }),
      text({ id: `${c.id}-label`, x: c.pos[0] + 18, y: c.pos[1] + 9, width: cardW - 36, height: 24, text: c.label, fontSize: 18, color: "#ffffff", bold: true, frameId: FRAME_ID }),
      text({ id: `${c.id}-hint`, x: c.pos[0] + 18, y: c.pos[1] + 60, width: cardW - 36, height: 24, text: `• ${c.hint}`, fontSize: 14, color: c.text, frameId: FRAME_ID }),
      text({ id: `${c.id}-h2`, x: c.pos[0] + 18, y: c.pos[1] + 90, width: cardW - 36, height: 24, text: "• …", fontSize: 14, color: "#64748b", frameId: FRAME_ID }),
      text({ id: `${c.id}-h3`, x: c.pos[0] + 18, y: c.pos[1] + 120, width: cardW - 36, height: 24, text: "• …", fontSize: 14, color: "#64748b", frameId: FRAME_ID }),
    )
  }
  return finalise(elements)
}

// ── User Persona ────────────────────────────────────────────────────
// Product/UX staple: a single human profile so a team can argue with a
// specific user in mind rather than "the customer". Lays out an avatar,
// identity strip, then three insight columns + a quote line.
function personaScene(): StoredScene {
  const FRAME_ID = "pe-frame"
  const left = 60
  const top = 30
  const frameW = 940
  const frameH = 620

  const elements: ExcalidrawElement[] = []
  elements.push(frame({ id: FRAME_ID, x: 0, y: 0, width: frameW, height: frameH, name: "User persona" }))

  // Title
  elements.push(
    text({ id: "pe-title", x: left, y: top, width: 400, height: 36, text: "User persona", fontSize: 28, color: "#0f172a", bold: true, frameId: FRAME_ID }),
    text({ id: "pe-sub", x: left, y: top + 38, width: 700, height: 22, text: "Make decisions for one specific person, not 'the user'.", fontSize: 13, color: "#64748b", frameId: FRAME_ID }),
  )

  // Identity strip — avatar + name/role
  const idTop = top + 90
  elements.push(
    rect({ id: "pe-id-bg", x: left, y: idTop, width: frameW - left * 2, height: 140, fill: "#f8fafc", stroke: "#e2e8f0", rounded: true, frameId: FRAME_ID }),
    ellipse({ id: "pe-avatar", x: left + 24, y: idTop + 20, width: 100, height: 100, fill: "#0a3024", stroke: "#0a3024", frameId: FRAME_ID }),
    text({ id: "pe-avatar-init", x: left + 24, y: idTop + 50, width: 100, height: 40, text: "AB", fontSize: 32, color: "#ffffff", align: "center", bold: true, frameId: FRAME_ID }),
    text({ id: "pe-name", x: left + 150, y: idTop + 26, width: 500, height: 32, text: "Aisha B.", fontSize: 24, color: "#0f172a", bold: true, frameId: FRAME_ID }),
    text({ id: "pe-role", x: left + 150, y: idTop + 60, width: 500, height: 24, text: "Engineering manager · mid-sized SaaS", fontSize: 15, color: "#475569", frameId: FRAME_ID }),
    text({ id: "pe-demo", x: left + 150, y: idTop + 88, width: 500, height: 22, text: "32 · Bengaluru · 8 yrs experience", fontSize: 13, color: "#64748b", frameId: FRAME_ID }),
  )

  // 3 insight columns: Goals · Frustrations · Behaviours
  const colTop = idTop + 160
  const colH = 220
  const colW = (frameW - left * 2 - 32) / 3
  const cols = [
    { id: "pe-goals",   label: "Goals",        hint: "What does success look like?",       fill: "#dbeafe", stroke: "#3b82f6" },
    { id: "pe-frust",   label: "Frustrations", hint: "What is broken or slow today?",      fill: "#fee2e2", stroke: "#ef4444" },
    { id: "pe-behav",   label: "Behaviours",   hint: "Tools they use · how they decide",   fill: "#dcfce7", stroke: "#22c55e" },
  ]
  cols.forEach((c, i) => {
    const x = left + i * (colW + 16)
    elements.push(
      rect({ id: c.id, x, y: colTop, width: colW, height: colH, fill: c.fill, stroke: c.stroke, strokeWidth: 2, rounded: true, frameId: FRAME_ID }),
      text({ id: `${c.id}-label`, x: x + 16, y: colTop + 14, width: colW - 32, height: 28, text: c.label, fontSize: 18, color: c.stroke, bold: true, frameId: FRAME_ID }),
      text({ id: `${c.id}-hint`, x: x + 16, y: colTop + 50, width: colW - 32, height: 24, text: c.hint, fontSize: 12, color: "#64748b", frameId: FRAME_ID }),
      text({ id: `${c.id}-1`, x: x + 16, y: colTop + 88, width: colW - 32, height: 22, text: "• …", fontSize: 14, color: "#0f172a", frameId: FRAME_ID }),
      text({ id: `${c.id}-2`, x: x + 16, y: colTop + 116, width: colW - 32, height: 22, text: "• …", fontSize: 14, color: "#0f172a", frameId: FRAME_ID }),
      text({ id: `${c.id}-3`, x: x + 16, y: colTop + 144, width: colW - 32, height: 22, text: "• …", fontSize: 14, color: "#0f172a", frameId: FRAME_ID }),
    )
  })

  // Quote line
  const quoteY = colTop + colH + 20
  elements.push(
    rect({ id: "pe-quote-bg", x: left, y: quoteY, width: frameW - left * 2, height: 60, fill: "#fef3c7", stroke: "#f59e0b", rounded: true, frameId: FRAME_ID }),
    text({ id: "pe-quote", x: left + 20, y: quoteY + 18, width: frameW - left * 2 - 40, height: 28, text: "“ A short, vivid quote in their own voice. ”", fontSize: 16, color: "#92400e", align: "center", frameId: FRAME_ID }),
  )
  return finalise(elements)
}

// ── Mind Map ────────────────────────────────────────────────────────
// One central topic, four primary branches at the corners, each with
// two trailing sub-topic boxes. The teacher repurposes this as a
// concept-map skeleton for any unit.
function mindMapScene(): StoredScene {
  const FRAME_ID = "mm-frame"
  const cx = 540
  const cy = 380
  const centreW = 240
  const centreH = 100
  const branchW = 180
  const branchH = 70
  const subW = 130
  const subH = 50

  const elements: ExcalidrawElement[] = []
  elements.push(frame({ id: FRAME_ID, x: 60, y: 40, width: 1000, height: 700, name: "Mind map" }))
  elements.push(
    text({ id: "mm-title", x: 100, y: 60, width: 600, height: 32, text: "Mind map", fontSize: 26, color: "#0f172a", bold: true, frameId: FRAME_ID }),
  )

  // Centre
  elements.push(
    ellipse({ id: "mm-centre", x: cx - centreW / 2, y: cy - centreH / 2, width: centreW, height: centreH, fill: "#1e293b", stroke: "#0f172a", strokeWidth: 2, frameId: FRAME_ID }),
    text({ id: "mm-centre-label", x: cx - centreW / 2 + 12, y: cy - 14, width: centreW - 24, height: 28, text: "Main topic", fontSize: 20, color: "#f8fafc", align: "center", bold: true, frameId: FRAME_ID }),
  )

  const branches = [
    { id: "mm-b1", label: "Branch 1", fill: "#dbeafe", stroke: "#3b82f6", offset: [-360, -200] },
    { id: "mm-b2", label: "Branch 2", fill: "#fef3c7", stroke: "#f59e0b", offset: [ 360, -200] },
    { id: "mm-b3", label: "Branch 3", fill: "#dcfce7", stroke: "#22c55e", offset: [-360,  200] },
    { id: "mm-b4", label: "Branch 4", fill: "#fce7f3", stroke: "#ec4899", offset: [ 360,  200] },
  ] as const

  branches.forEach((b) => {
    const bx = cx + b.offset[0] - branchW / 2
    const by = cy + b.offset[1] - branchH / 2
    elements.push(
      ellipse({ id: b.id, x: bx, y: by, width: branchW, height: branchH, fill: b.fill, stroke: b.stroke, strokeWidth: 2, frameId: FRAME_ID }),
      text({ id: `${b.id}-label`, x: bx + 12, y: by + 22, width: branchW - 24, height: 28, text: b.label, fontSize: 17, color: b.stroke, align: "center", bold: true, frameId: FRAME_ID }),
    )
    // Arrow centre → branch (anchored to rims so the line doesn't pierce shapes)
    const angle = Math.atan2(b.offset[1], b.offset[0])
    const sx = cx + Math.cos(angle) * (centreW / 2 + 4)
    const sy = cy + Math.sin(angle) * (centreH / 2 + 4)
    const ex = bx + branchW / 2 - Math.cos(angle) * (branchW / 2 + 4)
    const ey = by + branchH / 2 - Math.sin(angle) * (branchH / 2 + 4)
    elements.push(arrow({ id: `${b.id}-arrow`, x: sx, y: sy, endX: ex, endY: ey, color: b.stroke, strokeWidth: 2, frameId: FRAME_ID }))

    // Two sub-topics trailing out
    const subOffsetX = b.offset[0] < 0 ? -branchW / 2 - subW - 30 : branchW / 2 + 30
    const subAnchorX = bx + branchW / 2 + subOffsetX
    const subAnchorYTop = by + branchH / 2 - subH - 8
    const subAnchorYBot = by + branchH / 2 + 8
    for (const [j, sy2] of [[1, subAnchorYTop], [2, subAnchorYBot]] as const) {
      const id = `${b.id}-sub${j}`
      elements.push(
        rect({ id, x: subAnchorX, y: sy2, width: subW, height: subH, fill: "#ffffff", stroke: b.stroke, rounded: true, dashed: true, frameId: FRAME_ID }),
        text({ id: `${id}-label`, x: subAnchorX + 8, y: sy2 + 14, width: subW - 16, height: 22, text: "Sub-topic", fontSize: 13, color: "#475569", align: "center", frameId: FRAME_ID }),
      )
      // Branch → sub line
      const lineStartX = b.offset[0] < 0 ? bx + 4 : bx + branchW - 4
      const lineStartY = by + branchH / 2
      const lineEndX = b.offset[0] < 0 ? subAnchorX + subW : subAnchorX
      const lineEndY = sy2 + subH / 2
      elements.push(line({ id: `${id}-line`, x: lineStartX, y: lineStartY, endX: lineEndX, endY: lineEndY, color: b.stroke, strokeWidth: 1.5, frameId: FRAME_ID }))
    }
  })
  return finalise(elements)
}

// ── Fishbone (Ishikawa) ─────────────────────────────────────────────
// Root-cause analysis classic. Horizontal spine to a Problem head,
// six diagonal "bones" categorising where causes typically live —
// People · Process · Equipment (top), Materials · Environment ·
// Measurement (bottom).
function fishboneScene(): StoredScene {
  const FRAME_ID = "fb-frame"
  const left = 60
  const spineY = 360
  const spineStart = 120
  const spineEnd = 950
  const elements: ExcalidrawElement[] = []
  elements.push(frame({ id: FRAME_ID, x: 0, y: 0, width: 1200, height: 700, name: "Fishbone diagram" }))
  elements.push(
    text({ id: "fb-title", x: left, y: 30, width: 700, height: 32, text: "Root cause analysis", fontSize: 26, color: "#0f172a", bold: true, frameId: FRAME_ID }),
    text({ id: "fb-sub", x: left, y: 66, width: 900, height: 22, text: "Why is this happening? Trace causes up the bones to their category.", fontSize: 13, color: "#64748b", frameId: FRAME_ID }),
  )

  // Spine
  elements.push(arrow({ id: "fb-spine", x: spineStart, y: spineY, endX: spineEnd, endY: spineY, color: "#0f172a", strokeWidth: 3, frameId: FRAME_ID }))

  // Problem head
  elements.push(
    rect({ id: "fb-head", x: spineEnd + 10, y: spineY - 40, width: 180, height: 80, fill: "#fee2e2", stroke: "#dc2626", strokeWidth: 2, rounded: true, frameId: FRAME_ID }),
    text({ id: "fb-head-label", x: spineEnd + 20, y: spineY - 14, width: 160, height: 28, text: "Problem", fontSize: 18, color: "#b91c1c", align: "center", bold: true, frameId: FRAME_ID }),
  )

  const topBones = ["People", "Process", "Equipment"]
  const botBones = ["Materials", "Environment", "Measurement"]
  const boneXs = [240, 460, 680]
  const boneLen = 200

  // Top bones (angle up-right toward spine)
  topBones.forEach((b, i) => {
    const x = boneXs[i]
    const startX = x
    const startY = spineY - boneLen + 20
    const endX = x + 120
    const endY = spineY
    elements.push(
      line({ id: `fb-top-${i}`, x: startX, y: startY, endX, endY, color: "#1e40af", strokeWidth: 2, frameId: FRAME_ID }),
      text({ id: `fb-top-${i}-label`, x: startX - 70, y: startY - 28, width: 200, height: 28, text: b, fontSize: 16, color: "#1e40af", align: "center", bold: true, frameId: FRAME_ID }),
      text({ id: `fb-top-${i}-c1`, x: startX + 30, y: startY + 40, width: 140, height: 20, text: "• cause", fontSize: 12, color: "#475569", frameId: FRAME_ID }),
      text({ id: `fb-top-${i}-c2`, x: startX + 60, y: startY + 90, width: 140, height: 20, text: "• cause", fontSize: 12, color: "#475569", frameId: FRAME_ID }),
    )
  })

  // Bottom bones (angle down-right toward spine)
  botBones.forEach((b, i) => {
    const x = boneXs[i]
    const startX = x
    const startY = spineY + boneLen - 20
    const endX = x + 120
    const endY = spineY
    elements.push(
      line({ id: `fb-bot-${i}`, x: startX, y: startY, endX, endY, color: "#92400e", strokeWidth: 2, frameId: FRAME_ID }),
      text({ id: `fb-bot-${i}-label`, x: startX - 70, y: startY + 4, width: 200, height: 28, text: b, fontSize: 16, color: "#92400e", align: "center", bold: true, frameId: FRAME_ID }),
      text({ id: `fb-bot-${i}-c1`, x: startX + 30, y: startY - 60, width: 140, height: 20, text: "• cause", fontSize: 12, color: "#475569", frameId: FRAME_ID }),
      text({ id: `fb-bot-${i}-c2`, x: startX + 60, y: startY - 110, width: 140, height: 20, text: "• cause", fontSize: 12, color: "#475569", frameId: FRAME_ID }),
    )
  })

  return finalise(elements)
}

// ── KWL Chart ───────────────────────────────────────────────────────
// Three columns: K (Know) · W (Want to know) · L (Learned). Used at
// the open + close of a unit so students can see what they actually
// gained. Each column has a coloured header band and four dashed
// content rows.
function kwlScene(): StoredScene {
  const FRAME_ID = "kw-frame"
  const left = 60
  const top = 130
  const colW = 280
  const gap = 16
  const headerH = 60
  const rowH = 60
  const rows = 4

  const cols = [
    { id: "kw-k", letter: "K", label: "Know",         hint: "What do we already know?", fill: "#dbeafe", stroke: "#2563eb", text: "#1d4ed8" },
    { id: "kw-w", letter: "W", label: "Want to know", hint: "What do we want to find out?", fill: "#fef3c7", stroke: "#d97706", text: "#a16207" },
    { id: "kw-l", letter: "L", label: "Learned",      hint: "Fill in at the end of the unit.", fill: "#dcfce7", stroke: "#16a34a", text: "#15803d" },
  ]

  const elements: ExcalidrawElement[] = []
  const frameW = left * 2 + colW * 3 + gap * 2
  const frameH = top + headerH + 8 + rows * (rowH + 8) + 30
  elements.push(frame({ id: FRAME_ID, x: 0, y: 0, width: frameW, height: frameH, name: "K-W-L chart" }))
  elements.push(
    text({ id: "kw-title", x: left, y: 30, width: 600, height: 36, text: "K-W-L chart", fontSize: 28, color: "#0f172a", bold: true, frameId: FRAME_ID }),
    text({ id: "kw-topic", x: left, y: 70, width: 800, height: 28, text: "Topic: ____________________", fontSize: 16, color: "#475569", frameId: FRAME_ID }),
  )

  cols.forEach((c, i) => {
    const x = left + i * (colW + gap)
    elements.push(
      rect({ id: `${c.id}-head`, x, y: top, width: colW, height: headerH, fill: c.stroke, stroke: c.stroke, rounded: true, frameId: FRAME_ID }),
      text({ id: `${c.id}-letter`, x: x + 16, y: top + 14, width: 40, height: 32, text: c.letter, fontSize: 26, color: "#ffffff", bold: true, frameId: FRAME_ID }),
      text({ id: `${c.id}-label`, x: x + 60, y: top + 16, width: colW - 80, height: 24, text: c.label, fontSize: 16, color: "#ffffff", bold: true, frameId: FRAME_ID }),
      text({ id: `${c.id}-hint`, x: x + 60, y: top + 38, width: colW - 80, height: 18, text: c.hint, fontSize: 11, color: "#f1f5f9", frameId: FRAME_ID }),
    )
    for (let r = 0; r < rows; r++) {
      const ry = top + headerH + 8 + r * (rowH + 8)
      elements.push(
        rect({ id: `${c.id}-row-${r}`, x, y: ry, width: colW, height: rowH, fill: c.fill, stroke: c.stroke, rounded: true, dashed: true, frameId: FRAME_ID }),
      )
    }
  })
  return finalise(elements)
}

// ── Frayer Model ────────────────────────────────────────────────────
// Vocabulary teaching staple. Word in the centre oval; four quadrants
// (Definition, Characteristics, Examples, Non-examples) build a
// 360° picture of the concept. Very common in K-12 science / math.
function frayerScene(): StoredScene {
  const FRAME_ID = "fr-frame"
  const left = 60
  const top = 110
  const cellW = 360
  const cellH = 280
  const gap = 0 // share borders → cross effect

  const elements: ExcalidrawElement[] = []
  const frameW = left * 2 + cellW * 2 + gap
  const frameH = top + cellH * 2 + gap + 40
  elements.push(frame({ id: FRAME_ID, x: 0, y: 0, width: frameW, height: frameH, name: "Frayer model" }))
  elements.push(
    text({ id: "fr-title", x: left, y: 30, width: 600, height: 36, text: "Frayer model", fontSize: 28, color: "#0f172a", bold: true, frameId: FRAME_ID }),
    text({ id: "fr-sub", x: left, y: 68, width: 800, height: 22, text: "Vocabulary: ____________________  ·  build a 360° picture of one word.", fontSize: 13, color: "#64748b", frameId: FRAME_ID }),
  )

  const quadrants = [
    { id: "fr-def",  label: "Definition",       fill: "#dbeafe", stroke: "#2563eb", text: "#1d4ed8", pos: [left, top] },
    { id: "fr-char", label: "Characteristics",  fill: "#fef3c7", stroke: "#d97706", text: "#a16207", pos: [left + cellW + gap, top] },
    { id: "fr-ex",   label: "Examples",         fill: "#dcfce7", stroke: "#16a34a", text: "#15803d", pos: [left, top + cellH + gap] },
    { id: "fr-non",  label: "Non-examples",     fill: "#fee2e2", stroke: "#dc2626", text: "#b91c1c", pos: [left + cellW + gap, top + cellH + gap] },
  ]
  for (const q of quadrants) {
    elements.push(
      rect({ id: q.id, x: q.pos[0], y: q.pos[1], width: cellW, height: cellH, fill: q.fill, stroke: q.stroke, strokeWidth: 2, frameId: FRAME_ID }),
      text({ id: `${q.id}-label`, x: q.pos[0] + 18, y: q.pos[1] + 14, width: cellW - 36, height: 28, text: q.label, fontSize: 18, color: q.text, bold: true, frameId: FRAME_ID }),
      text({ id: `${q.id}-hint`, x: q.pos[0] + 18, y: q.pos[1] + 50, width: cellW - 36, height: 24, text: "• …", fontSize: 14, color: "#475569", frameId: FRAME_ID }),
      text({ id: `${q.id}-hint2`, x: q.pos[0] + 18, y: q.pos[1] + 80, width: cellW - 36, height: 24, text: "• …", fontSize: 14, color: "#64748b", frameId: FRAME_ID }),
    )
  }
  // Central oval sitting on the cross junction
  const cx = left + cellW
  const cy = top + cellH
  const ovalW = 200
  const ovalH = 90
  elements.push(
    ellipse({ id: "fr-word", x: cx - ovalW / 2, y: cy - ovalH / 2, width: ovalW, height: ovalH, fill: "#1e293b", stroke: "#0f172a", strokeWidth: 2, frameId: FRAME_ID }),
    text({ id: "fr-word-label", x: cx - ovalW / 2 + 10, y: cy - 14, width: ovalW - 20, height: 28, text: "Word", fontSize: 22, color: "#f8fafc", align: "center", bold: true, frameId: FRAME_ID }),
  )
  return finalise(elements)
}

// ── Empathy map ─────────────────────────────────────────────────────
// Design-thinking staple. Cross dividing the canvas into Says ·
// Thinks · Does · Feels — what we observe about the user from each
// angle. Pairs naturally with the Persona template.
function empathyMapScene(): StoredScene {
  const FRAME_ID = "em-frame"
  const left = 60
  const top = 110
  const cellW = 380
  const cellH = 230
  const elements: ExcalidrawElement[] = []
  const frameW = left * 2 + cellW * 2
  const frameH = top + cellH * 2 + 40
  elements.push(frame({ id: FRAME_ID, x: 0, y: 0, width: frameW, height: frameH, name: "Empathy map" }))
  elements.push(
    text({ id: "em-title", x: left, y: 30, width: 600, height: 36, text: "Empathy map", fontSize: 28, color: "#0f172a", bold: true, frameId: FRAME_ID }),
    text({ id: "em-sub", x: left, y: 68, width: 800, height: 22, text: "Observe one user from four angles. Fill the cells with verbatim notes from research.", fontSize: 13, color: "#64748b", frameId: FRAME_ID }),
  )
  const cells = [
    { id: "em-says",   label: "SAYS",   hint: "Direct quotes from interviews",   fill: "#dbeafe", stroke: "#2563eb", pos: [left, top] },
    { id: "em-thinks", label: "THINKS", hint: "What occupies their mind",        fill: "#dcfce7", stroke: "#16a34a", pos: [left + cellW, top] },
    { id: "em-does",   label: "DOES",   hint: "Observable actions and habits",   fill: "#fef3c7", stroke: "#ca8a04", pos: [left, top + cellH] },
    { id: "em-feels",  label: "FEELS",  hint: "Emotional state — frustrated, hopeful, …", fill: "#fee2e2", stroke: "#dc2626", pos: [left + cellW, top + cellH] },
  ]
  for (const c of cells) {
    elements.push(
      rect({ id: c.id, x: c.pos[0], y: c.pos[1], width: cellW, height: cellH, fill: c.fill, stroke: c.stroke, strokeWidth: 2, frameId: FRAME_ID }),
      text({ id: `${c.id}-label`, x: c.pos[0] + 18, y: c.pos[1] + 14, width: cellW - 36, height: 28, text: c.label, fontSize: 20, color: c.stroke, bold: true, frameId: FRAME_ID }),
      text({ id: `${c.id}-hint`, x: c.pos[0] + 18, y: c.pos[1] + 50, width: cellW - 36, height: 22, text: c.hint, fontSize: 12, color: "#64748b", frameId: FRAME_ID }),
      text({ id: `${c.id}-1`, x: c.pos[0] + 18, y: c.pos[1] + 90, width: cellW - 36, height: 22, text: "• …", fontSize: 14, color: "#0f172a", frameId: FRAME_ID }),
      text({ id: `${c.id}-2`, x: c.pos[0] + 18, y: c.pos[1] + 120, width: cellW - 36, height: 22, text: "• …", fontSize: 14, color: "#0f172a", frameId: FRAME_ID }),
    )
  }
  // Central user oval at the cross junction
  const cx = left + cellW
  const cy = top + cellH
  elements.push(
    ellipse({ id: "em-user", x: cx - 70, y: cy - 35, width: 140, height: 70, fill: "#1e293b", stroke: "#0f172a", strokeWidth: 2, frameId: FRAME_ID }),
    text({ id: "em-user-label", x: cx - 60, y: cy - 12, width: 120, height: 24, text: "USER", fontSize: 18, color: "#f8fafc", align: "center", bold: true, frameId: FRAME_ID }),
  )
  return finalise(elements)
}

// ── Eisenhower matrix ───────────────────────────────────────────────
// Productivity classic — Important × Urgent quadrants. Drives "do
// now / schedule / delegate / drop" decisions. Used in management
// and study-skill teaching.
function eisenhowerScene(): StoredScene {
  const FRAME_ID = "ei-frame"
  const left = 100
  const top = 130
  const cellW = 360
  const cellH = 230
  const labelGutter = 60
  const elements: ExcalidrawElement[] = []
  const frameW = left * 2 + cellW * 2 + labelGutter
  const frameH = top + cellH * 2 + 40 + labelGutter
  elements.push(frame({ id: FRAME_ID, x: 0, y: 0, width: frameW, height: frameH, name: "Eisenhower matrix" }))
  elements.push(
    text({ id: "ei-title", x: left, y: 30, width: 600, height: 36, text: "Eisenhower matrix", fontSize: 28, color: "#0f172a", bold: true, frameId: FRAME_ID }),
    text({ id: "ei-sub", x: left, y: 68, width: 900, height: 22, text: "Sort tasks by importance vs urgency. Do · Schedule · Delegate · Drop.", fontSize: 13, color: "#64748b", frameId: FRAME_ID }),
  )

  // Axis labels
  elements.push(
    text({ id: "ei-x-urg", x: left + labelGutter + cellW - 80, y: top - 26, width: 160, height: 22, text: "Urgent", fontSize: 14, color: "#475569", align: "center", bold: true, frameId: FRAME_ID }),
    text({ id: "ei-x-not", x: left + labelGutter + cellW + 80, y: top - 26, width: 200, height: 22, text: "Not urgent", fontSize: 14, color: "#475569", align: "center", bold: true, frameId: FRAME_ID }),
    text({ id: "ei-y-imp", x: left - 20, y: top + cellH / 2 - 60, width: 60, height: 22, text: "Important", fontSize: 14, color: "#475569", align: "right", bold: true, frameId: FRAME_ID }),
    text({ id: "ei-y-not", x: left - 30, y: top + cellH + cellH / 2 - 60, width: 70, height: 22, text: "Not important", fontSize: 14, color: "#475569", align: "right", bold: true, frameId: FRAME_ID }),
  )

  const cells = [
    { id: "ei-do",       label: "DO",        verb: "Crises · deadlines · key meetings",     fill: "#fee2e2", stroke: "#dc2626", pos: [left + labelGutter, top] },
    { id: "ei-schedule", label: "SCHEDULE",  verb: "Planning · skills · relationships",     fill: "#dcfce7", stroke: "#16a34a", pos: [left + labelGutter + cellW, top] },
    { id: "ei-delegate", label: "DELEGATE",  verb: "Interruptions · some emails · calls",   fill: "#fef3c7", stroke: "#ca8a04", pos: [left + labelGutter, top + cellH] },
    { id: "ei-drop",     label: "DROP",      verb: "Time-wasters · scrolling · trivia",     fill: "#dbeafe", stroke: "#2563eb", pos: [left + labelGutter + cellW, top + cellH] },
  ]
  for (const c of cells) {
    elements.push(
      rect({ id: c.id, x: c.pos[0], y: c.pos[1], width: cellW, height: cellH, fill: c.fill, stroke: c.stroke, strokeWidth: 2, frameId: FRAME_ID }),
      text({ id: `${c.id}-label`, x: c.pos[0] + 18, y: c.pos[1] + 16, width: cellW - 36, height: 32, text: c.label, fontSize: 24, color: c.stroke, bold: true, frameId: FRAME_ID }),
      text({ id: `${c.id}-verb`, x: c.pos[0] + 18, y: c.pos[1] + 56, width: cellW - 36, height: 22, text: c.verb, fontSize: 13, color: "#475569", frameId: FRAME_ID }),
      text({ id: `${c.id}-1`, x: c.pos[0] + 18, y: c.pos[1] + 100, width: cellW - 36, height: 22, text: "• …", fontSize: 14, color: "#0f172a", frameId: FRAME_ID }),
      text({ id: `${c.id}-2`, x: c.pos[0] + 18, y: c.pos[1] + 128, width: cellW - 36, height: 22, text: "• …", fontSize: 14, color: "#0f172a", frameId: FRAME_ID }),
    )
  }
  return finalise(elements)
}

// ── 5 Whys ──────────────────────────────────────────────────────────
// Engineering / quality-improvement classic — chain five "why" boxes
// past a problem statement to find the root cause. Used in manufacturing,
// software incident reviews, and classroom critical-thinking exercises.
function fiveWhysScene(): StoredScene {
  const FRAME_ID = "fw-frame"
  const left = 60
  const top = 120
  const boxW = 280
  const boxH = 90
  const gap = 40
  const elements: ExcalidrawElement[] = []
  const frameW = left * 2 + (boxW + gap) * 3 - gap + 60
  const frameH = top + boxH * 2 + 120
  elements.push(frame({ id: FRAME_ID, x: 0, y: 0, width: frameW, height: frameH, name: "5 Whys" }))
  elements.push(
    text({ id: "fw-title", x: left, y: 30, width: 600, height: 36, text: "5 Whys", fontSize: 28, color: "#0f172a", bold: true, frameId: FRAME_ID }),
    text({ id: "fw-sub", x: left, y: 68, width: 900, height: 22, text: "Ask 'why?' five times to walk past symptoms and find the root cause.", fontSize: 13, color: "#64748b", frameId: FRAME_ID }),
  )

  // Problem statement
  elements.push(
    rect({ id: "fw-problem", x: left, y: top, width: boxW, height: boxH, fill: "#fee2e2", stroke: "#dc2626", strokeWidth: 2, rounded: true, frameId: FRAME_ID }),
    text({ id: "fw-problem-label", x: left + 16, y: top + 12, width: boxW - 32, height: 24, text: "Problem", fontSize: 16, color: "#b91c1c", bold: true, frameId: FRAME_ID }),
    text({ id: "fw-problem-hint", x: left + 16, y: top + 40, width: boxW - 32, height: 40, text: "What happened? Be specific.", fontSize: 12, color: "#475569", frameId: FRAME_ID }),
  )

  // 5 Whys in a snake pattern (3 across top, 2 across bottom)
  const positions: Array<{ x: number; y: number; i: number }> = [
    { x: left + boxW + gap, y: top, i: 1 },
    { x: left + (boxW + gap) * 2, y: top, i: 2 },
    { x: left + (boxW + gap) * 2, y: top + boxH + 60, i: 3 },
    { x: left + boxW + gap, y: top + boxH + 60, i: 4 },
    { x: left, y: top + boxH + 60, i: 5 },
  ]
  positions.forEach((p) => {
    const id = `fw-w${p.i}`
    elements.push(
      rect({ id, x: p.x, y: p.y, width: boxW, height: boxH, fill: "#fef3c7", stroke: "#ca8a04", strokeWidth: 1.5, rounded: true, frameId: FRAME_ID }),
      text({ id: `${id}-label`, x: p.x + 16, y: p.y + 12, width: boxW - 32, height: 24, text: `Why #${p.i}?`, fontSize: 14, color: "#a16207", bold: true, frameId: FRAME_ID }),
      text({ id: `${id}-hint`, x: p.x + 16, y: p.y + 42, width: boxW - 32, height: 38, text: "Because…", fontSize: 12, color: "#475569", frameId: FRAME_ID }),
    )
  })

  // Arrows between boxes
  const seq = [
    { from: [left + boxW, top + boxH / 2], to: [positions[0].x, top + boxH / 2] },
    { from: [positions[0].x + boxW, top + boxH / 2], to: [positions[1].x, top + boxH / 2] },
    { from: [positions[1].x + boxW / 2, top + boxH], to: [positions[2].x + boxW / 2, positions[2].y] },
    { from: [positions[2].x, positions[2].y + boxH / 2], to: [positions[3].x + boxW, positions[3].y + boxH / 2] },
    { from: [positions[3].x, positions[3].y + boxH / 2], to: [positions[4].x + boxW, positions[4].y + boxH / 2] },
  ]
  seq.forEach((s, i) => elements.push(arrow({ id: `fw-arr-${i}`, x: s.from[0], y: s.from[1], endX: s.to[0], endY: s.to[1], color: "#94a3b8", strokeWidth: 2, frameId: FRAME_ID })))

  // Root cause callout
  const rootY = positions[4].y + boxH + 28
  elements.push(
    rect({ id: "fw-root", x: left, y: rootY, width: frameW - left * 2 - 60, height: 60, fill: "#dcfce7", stroke: "#16a34a", strokeWidth: 2, rounded: true, frameId: FRAME_ID }),
    text({ id: "fw-root-label", x: left + 18, y: rootY + 18, width: frameW - left * 2 - 100, height: 28, text: "Root cause: ____________________", fontSize: 16, color: "#15803d", bold: true, frameId: FRAME_ID }),
  )
  return finalise(elements)
}

// ── Venn diagram ────────────────────────────────────────────────────
// Math / science compare-and-contrast. Two overlapping circles, with
// "A only", "B only", and "Both" zones labelled.
function vennScene(): StoredScene {
  const FRAME_ID = "vn-frame"
  const elements: ExcalidrawElement[] = []
  const cx1 = 380
  const cx2 = 580
  const cy = 340
  const r = 180
  elements.push(frame({ id: FRAME_ID, x: 60, y: 40, width: 900, height: 600, name: "Venn diagram" }))
  elements.push(
    text({ id: "vn-title", x: 100, y: 60, width: 600, height: 36, text: "Venn diagram", fontSize: 28, color: "#0f172a", bold: true, frameId: FRAME_ID }),
    text({ id: "vn-sub", x: 100, y: 98, width: 800, height: 22, text: "Compare two sets — what's unique to each, what's shared.", fontSize: 13, color: "#64748b", frameId: FRAME_ID }),
  )
  // Two semi-transparent circles
  elements.push(
    ellipse({ id: "vn-a", x: cx1 - r, y: cy - r, width: r * 2, height: r * 2, fill: "#3b82f6", stroke: "#1d4ed8", strokeWidth: 2, frameId: FRAME_ID }),
    ellipse({ id: "vn-b", x: cx2 - r, y: cy - r, width: r * 2, height: r * 2, fill: "#ef4444", stroke: "#b91c1c", strokeWidth: 2, frameId: FRAME_ID }),
  )
  // Soften via low opacity rectangles overlaid? Excalidraw doesn't blend
  // ellipses natively but the high-contrast strokes still read as
  // separate sets. Labels make it unambiguous.
  elements.push(
    text({ id: "vn-a-label", x: cx1 - 180, y: cy - r - 40, width: 200, height: 28, text: "Set A", fontSize: 18, color: "#1d4ed8", align: "center", bold: true, frameId: FRAME_ID }),
    text({ id: "vn-b-label", x: cx2 - 20, y: cy - r - 40, width: 200, height: 28, text: "Set B", fontSize: 18, color: "#b91c1c", align: "center", bold: true, frameId: FRAME_ID }),
    // Zone labels with white pill backgrounds for readability
    rect({ id: "vn-z1", x: cx1 - 130, y: cy - 18, width: 110, height: 36, fill: "#ffffff", stroke: "#1d4ed8", rounded: true, frameId: FRAME_ID }),
    text({ id: "vn-z1-label", x: cx1 - 124, y: cy - 8, width: 100, height: 22, text: "A only", fontSize: 14, color: "#1d4ed8", align: "center", bold: true, frameId: FRAME_ID }),
    rect({ id: "vn-z2", x: cx2 + 20, y: cy - 18, width: 110, height: 36, fill: "#ffffff", stroke: "#b91c1c", rounded: true, frameId: FRAME_ID }),
    text({ id: "vn-z2-label", x: cx2 + 26, y: cy - 8, width: 100, height: 22, text: "B only", fontSize: 14, color: "#b91c1c", align: "center", bold: true, frameId: FRAME_ID }),
    rect({ id: "vn-both", x: (cx1 + cx2) / 2 - 60, y: cy - 18, width: 120, height: 36, fill: "#1e293b", stroke: "#0f172a", rounded: true, frameId: FRAME_ID }),
    text({ id: "vn-both-label", x: (cx1 + cx2) / 2 - 54, y: cy - 8, width: 108, height: 22, text: "Both", fontSize: 14, color: "#ffffff", align: "center", bold: true, frameId: FRAME_ID }),
  )
  return finalise(elements)
}

// ── Sprint retro (4Ls) ──────────────────────────────────────────────
// Agile retro structure. 2×2 of Liked · Learned · Lacked · Longed for.
// Used in engineering team retros and after group projects in school.
function sprintRetroScene(): StoredScene {
  const FRAME_ID = "sr-frame"
  const left = 60
  const top = 110
  const cellW = 380
  const cellH = 240
  const gap = 18
  const elements: ExcalidrawElement[] = []
  const frameW = left * 2 + cellW * 2 + gap
  const frameH = top + cellH * 2 + gap + 40
  elements.push(frame({ id: FRAME_ID, x: 0, y: 0, width: frameW, height: frameH, name: "Sprint retro · 4Ls" }))
  elements.push(
    text({ id: "sr-title", x: left, y: 30, width: 600, height: 36, text: "Sprint retro", fontSize: 28, color: "#0f172a", bold: true, frameId: FRAME_ID }),
    text({ id: "sr-sub", x: left, y: 68, width: 900, height: 22, text: "Reflect on the cycle through four lenses — what to keep, fix, and try next.", fontSize: 13, color: "#64748b", frameId: FRAME_ID }),
  )
  const cells = [
    { id: "sr-liked",   label: "Liked",     emoji: "👍", hint: "Energising · what worked",       fill: "#dcfce7", stroke: "#16a34a", pos: [left, top] },
    { id: "sr-learned", label: "Learned",   emoji: "💡", hint: "New skills · surprising findings", fill: "#dbeafe", stroke: "#2563eb", pos: [left + cellW + gap, top] },
    { id: "sr-lacked",  label: "Lacked",    emoji: "🚧", hint: "Missing tools · support · clarity", fill: "#fef3c7", stroke: "#ca8a04", pos: [left, top + cellH + gap] },
    { id: "sr-longed",  label: "Longed for", emoji: "🌱", hint: "Hopes for the next cycle",         fill: "#fce7f3", stroke: "#db2777", pos: [left + cellW + gap, top + cellH + gap] },
  ]
  for (const c of cells) {
    elements.push(
      rect({ id: c.id, x: c.pos[0], y: c.pos[1], width: cellW, height: cellH, fill: c.fill, stroke: c.stroke, strokeWidth: 2, rounded: true, frameId: FRAME_ID }),
      text({ id: `${c.id}-label`, x: c.pos[0] + 18, y: c.pos[1] + 14, width: cellW - 36, height: 30, text: `${c.emoji}  ${c.label}`, fontSize: 20, color: c.stroke, bold: true, frameId: FRAME_ID }),
      text({ id: `${c.id}-hint`, x: c.pos[0] + 18, y: c.pos[1] + 50, width: cellW - 36, height: 22, text: c.hint, fontSize: 12, color: "#64748b", frameId: FRAME_ID }),
      text({ id: `${c.id}-1`, x: c.pos[0] + 18, y: c.pos[1] + 92, width: cellW - 36, height: 22, text: "• …", fontSize: 14, color: "#0f172a", frameId: FRAME_ID }),
      text({ id: `${c.id}-2`, x: c.pos[0] + 18, y: c.pos[1] + 122, width: cellW - 36, height: 22, text: "• …", fontSize: 14, color: "#0f172a", frameId: FRAME_ID }),
      text({ id: `${c.id}-3`, x: c.pos[0] + 18, y: c.pos[1] + 152, width: cellW - 36, height: 22, text: "• …", fontSize: 14, color: "#0f172a", frameId: FRAME_ID }),
    )
  }
  return finalise(elements)
}

// ── OKR planner ─────────────────────────────────────────────────────
// Management classic. One Objective + three measurable Key Results.
// Common in product, engineering, and academic departmental planning.
function okrScene(): StoredScene {
  const FRAME_ID = "ok-frame"
  const left = 60
  const top = 110
  const cardW = 800
  const obCardH = 130
  const krH = 110
  const elements: ExcalidrawElement[] = []
  const frameW = left * 2 + cardW
  const frameH = top + obCardH + krH * 3 + 60
  elements.push(frame({ id: FRAME_ID, x: 0, y: 0, width: frameW, height: frameH, name: "OKR planner" }))
  elements.push(
    text({ id: "ok-title", x: left, y: 30, width: 600, height: 36, text: "OKR planner", fontSize: 28, color: "#0f172a", bold: true, frameId: FRAME_ID }),
    text({ id: "ok-sub", x: left, y: 68, width: 800, height: 22, text: "One aspirational objective + three measurable key results. Score 0.0 – 1.0 at cycle end.", fontSize: 13, color: "#64748b", frameId: FRAME_ID }),
  )

  // Objective card
  elements.push(
    rect({ id: "ok-obj", x: left, y: top, width: cardW, height: obCardH, fill: "#1e293b", stroke: "#0f172a", strokeWidth: 2, rounded: true, frameId: FRAME_ID }),
    text({ id: "ok-obj-tag", x: left + 22, y: top + 16, width: 120, height: 22, text: "OBJECTIVE", fontSize: 12, color: "#94a3b8", bold: true, frameId: FRAME_ID }),
    text({ id: "ok-obj-text", x: left + 22, y: top + 44, width: cardW - 44, height: 36, text: "What we want to achieve this cycle.", fontSize: 22, color: "#ffffff", bold: true, frameId: FRAME_ID }),
    text({ id: "ok-obj-hint", x: left + 22, y: top + 90, width: cardW - 44, height: 22, text: "Inspirational · qualitative · time-bound.", fontSize: 12, color: "#94a3b8", frameId: FRAME_ID }),
  )

  // KR rows
  const colors = [
    { fill: "#dbeafe", stroke: "#2563eb", text: "#1d4ed8" },
    { fill: "#dcfce7", stroke: "#16a34a", text: "#15803d" },
    { fill: "#fef3c7", stroke: "#ca8a04", text: "#a16207" },
  ]
  for (let i = 0; i < 3; i++) {
    const y = top + obCardH + 16 + i * (krH + 10)
    const c = colors[i]
    elements.push(
      rect({ id: `ok-kr${i}`, x: left, y, width: cardW, height: krH, fill: c.fill, stroke: c.stroke, strokeWidth: 1.5, rounded: true, frameId: FRAME_ID }),
      text({ id: `ok-kr${i}-tag`, x: left + 22, y: y + 14, width: 120, height: 22, text: `KEY RESULT ${i + 1}`, fontSize: 11, color: c.text, bold: true, frameId: FRAME_ID }),
      text({ id: `ok-kr${i}-text`, x: left + 22, y: y + 36, width: cardW - 200, height: 26, text: "Measurable outcome we'll move from X to Y.", fontSize: 16, color: "#0f172a", frameId: FRAME_ID }),
      text({ id: `ok-kr${i}-metric`, x: left + 22, y: y + 68, width: cardW - 200, height: 22, text: "From ___ → To ___ by ___", fontSize: 12, color: "#64748b", frameId: FRAME_ID }),
      // Score pill
      rect({ id: `ok-kr${i}-score`, x: left + cardW - 130, y: y + 30, width: 110, height: 44, fill: "#ffffff", stroke: c.stroke, rounded: true, frameId: FRAME_ID }),
      text({ id: `ok-kr${i}-score-num`, x: left + cardW - 124, y: y + 38, width: 98, height: 30, text: "0.0", fontSize: 22, color: c.text, align: "center", bold: true, frameId: FRAME_ID }),
    )
  }
  return finalise(elements)
}

// ── Storyboard ──────────────────────────────────────────────────────
// Six-panel narrative scaffold. Used in design (UX flow), film/media
// classes, and any subject teaching narrative or sequencing.
function storyboardScene(): StoredScene {
  const FRAME_ID = "sb-frame"
  const left = 60
  const top = 110
  const panelW = 280
  const panelH = 220
  const gap = 14
  const cols = 3
  const rows = 2
  const elements: ExcalidrawElement[] = []
  const frameW = left * 2 + panelW * cols + gap * (cols - 1)
  const frameH = top + panelH * rows + gap * (rows - 1) + 40
  elements.push(frame({ id: FRAME_ID, x: 0, y: 0, width: frameW, height: frameH, name: "Storyboard" }))
  elements.push(
    text({ id: "sb-title", x: left, y: 30, width: 600, height: 36, text: "Storyboard", fontSize: 28, color: "#0f172a", bold: true, frameId: FRAME_ID }),
    text({ id: "sb-sub", x: left, y: 68, width: 800, height: 22, text: "Six frames to plan a narrative — sketch the scene up top, caption it below.", fontSize: 13, color: "#64748b", frameId: FRAME_ID }),
  )
  let panelN = 1
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = left + c * (panelW + gap)
      const y = top + r * (panelH + gap)
      const id = `sb-panel-${panelN}`
      elements.push(
        // Outer card
        rect({ id, x, y, width: panelW, height: panelH, fill: "#ffffff", stroke: "#cbd5e1", strokeWidth: 1.5, rounded: true, frameId: FRAME_ID }),
        // Sketch zone (top 65%)
        rect({ id: `${id}-sketch`, x: x + 12, y: y + 36, width: panelW - 24, height: 110, fill: "#f8fafc", stroke: "#e2e8f0", rounded: true, dashed: true, frameId: FRAME_ID }),
        // Panel number badge
        ellipse({ id: `${id}-badge`, x: x + 12, y: y + 12, width: 26, height: 26, fill: "#1e293b", stroke: "#0f172a", frameId: FRAME_ID }),
        text({ id: `${id}-num`, x: x + 12, y: y + 16, width: 26, height: 22, text: String(panelN), fontSize: 13, color: "#ffffff", align: "center", bold: true, frameId: FRAME_ID }),
        // Scene label
        text({ id: `${id}-label`, x: x + 48, y: y + 18, width: panelW - 60, height: 22, text: "Scene title", fontSize: 13, color: "#475569", bold: true, frameId: FRAME_ID }),
        // Caption
        text({ id: `${id}-caption`, x: x + 14, y: y + 156, width: panelW - 28, height: 22, text: "Caption · what happens here?", fontSize: 12, color: "#475569", frameId: FRAME_ID }),
        text({ id: `${id}-caption2`, x: x + 14, y: y + 182, width: panelW - 28, height: 22, text: "Dialogue / VO · …", fontSize: 12, color: "#94a3b8", frameId: FRAME_ID }),
      )
      panelN++
    }
  }
  return finalise(elements)
}

// ── Lab report ──────────────────────────────────────────────────────
// Science scaffold — Hypothesis · Method · Results · Conclusion.
// Standardised so students hand in a recognisable shape.
function labReportScene(): StoredScene {
  const FRAME_ID = "lb-frame"
  const left = 60
  const top = 110
  const sectW = 820
  const sectH = 130
  const gap = 16
  const elements: ExcalidrawElement[] = []
  const frameW = left * 2 + sectW
  const frameH = top + sectH * 4 + gap * 3 + 40
  elements.push(frame({ id: FRAME_ID, x: 0, y: 0, width: frameW, height: frameH, name: "Lab report" }))
  elements.push(
    text({ id: "lb-title", x: left, y: 30, width: 600, height: 36, text: "Lab report", fontSize: 28, color: "#0f172a", bold: true, frameId: FRAME_ID }),
    text({ id: "lb-sub", x: left, y: 68, width: 800, height: 22, text: "Experiment scaffold — turn observations into conclusions.", fontSize: 13, color: "#64748b", frameId: FRAME_ID }),
  )
  const sections = [
    { id: "lb-hyp",  num: "01", label: "Hypothesis",    hint: "If __, then __, because __.",                  fill: "#dbeafe", stroke: "#2563eb" },
    { id: "lb-met",  num: "02", label: "Method",         hint: "Materials · steps · controls · variables.",    fill: "#dcfce7", stroke: "#16a34a" },
    { id: "lb-res",  num: "03", label: "Results",        hint: "Data, tables, observations — no interpretation yet.", fill: "#fef3c7", stroke: "#ca8a04" },
    { id: "lb-conc", num: "04", label: "Conclusion",     hint: "Was the hypothesis supported? What's next?",   fill: "#fce7f3", stroke: "#db2777" },
  ]
  sections.forEach((s, i) => {
    const y = top + i * (sectH + gap)
    elements.push(
      rect({ id: s.id, x: left, y, width: sectW, height: sectH, fill: s.fill, stroke: s.stroke, strokeWidth: 1.5, rounded: true, frameId: FRAME_ID }),
      // Number bubble
      ellipse({ id: `${s.id}-num`, x: left + 16, y: y + 24, width: 50, height: 50, fill: s.stroke, stroke: s.stroke, frameId: FRAME_ID }),
      text({ id: `${s.id}-num-text`, x: left + 16, y: y + 36, width: 50, height: 28, text: s.num, fontSize: 16, color: "#ffffff", align: "center", bold: true, frameId: FRAME_ID }),
      text({ id: `${s.id}-label`, x: left + 80, y: y + 22, width: sectW - 100, height: 28, text: s.label, fontSize: 20, color: s.stroke, bold: true, frameId: FRAME_ID }),
      text({ id: `${s.id}-hint`, x: left + 80, y: y + 56, width: sectW - 100, height: 22, text: s.hint, fontSize: 12, color: "#64748b", frameId: FRAME_ID }),
      text({ id: `${s.id}-body`, x: left + 80, y: y + 86, width: sectW - 100, height: 22, text: "…", fontSize: 14, color: "#0f172a", frameId: FRAME_ID }),
    )
  })
  return finalise(elements)
}

// ── Decision tree ───────────────────────────────────────────────────
// Root question branching into options, each leading to outcomes.
// Used in maths, CS, ethics, and management decision-modelling.
function decisionTreeScene(): StoredScene {
  const FRAME_ID = "dt-frame"
  const left = 60
  const elements: ExcalidrawElement[] = []
  elements.push(frame({ id: FRAME_ID, x: 0, y: 0, width: 1100, height: 660, name: "Decision tree" }))
  elements.push(
    text({ id: "dt-title", x: left + 40, y: 30, width: 600, height: 36, text: "Decision tree", fontSize: 28, color: "#0f172a", bold: true, frameId: FRAME_ID }),
    text({ id: "dt-sub", x: left + 40, y: 68, width: 800, height: 22, text: "Root question → branch by option → trace each path to its outcome.", fontSize: 13, color: "#64748b", frameId: FRAME_ID }),
  )

  // Root
  const rootX = 500
  const rootY = 130
  const rootW = 220
  const rootH = 80
  elements.push(
    rect({ id: "dt-root", x: rootX, y: rootY, width: rootW, height: rootH, fill: "#1e293b", stroke: "#0f172a", strokeWidth: 2, rounded: true, frameId: FRAME_ID }),
    text({ id: "dt-root-label", x: rootX + 14, y: rootY + 14, width: rootW - 28, height: 22, text: "DECISION", fontSize: 12, color: "#94a3b8", bold: true, frameId: FRAME_ID }),
    text({ id: "dt-root-text", x: rootX + 14, y: rootY + 38, width: rootW - 28, height: 28, text: "What's the question?", fontSize: 16, color: "#ffffff", bold: true, frameId: FRAME_ID }),
  )

  // 3 branches
  const branches = [
    { id: "dt-b1", label: "Option A", fill: "#dbeafe", stroke: "#2563eb", x: 140 },
    { id: "dt-b2", label: "Option B", fill: "#dcfce7", stroke: "#16a34a", x: 470 },
    { id: "dt-b3", label: "Option C", fill: "#fef3c7", stroke: "#ca8a04", x: 800 },
  ]
  const branchY = 280
  const branchW = 180
  const branchH = 70
  branches.forEach((b) => {
    elements.push(
      rect({ id: b.id, x: b.x, y: branchY, width: branchW, height: branchH, fill: b.fill, stroke: b.stroke, strokeWidth: 2, rounded: true, frameId: FRAME_ID }),
      text({ id: `${b.id}-label`, x: b.x + 12, y: branchY + 22, width: branchW - 24, height: 28, text: b.label, fontSize: 16, color: b.stroke, align: "center", bold: true, frameId: FRAME_ID }),
      // Arrow root → branch
      arrow({ id: `${b.id}-arr`, x: rootX + rootW / 2, y: rootY + rootH, endX: b.x + branchW / 2, endY: branchY, color: b.stroke, strokeWidth: 2, frameId: FRAME_ID }),
    )
    // Two outcomes per branch (Pros / Cons)
    const outcomes = [
      { id: `${b.id}-pro`, label: "✓ Pros", fill: "#ffffff", stroke: "#22c55e", offset: -60 },
      { id: `${b.id}-con`, label: "✗ Cons", fill: "#ffffff", stroke: "#ef4444", offset: 60 },
    ]
    outcomes.forEach((o) => {
      const ox = b.x + branchW / 2 + o.offset - 70
      const oy = 450
      elements.push(
        rect({ id: o.id, x: ox, y: oy, width: 140, height: 90, fill: o.fill, stroke: o.stroke, strokeWidth: 1.5, rounded: true, dashed: true, frameId: FRAME_ID }),
        text({ id: `${o.id}-label`, x: ox + 10, y: oy + 12, width: 120, height: 22, text: o.label, fontSize: 13, color: o.stroke, bold: true, frameId: FRAME_ID }),
        text({ id: `${o.id}-hint`, x: ox + 10, y: oy + 40, width: 120, height: 40, text: "…", fontSize: 12, color: "#64748b", frameId: FRAME_ID }),
        line({ id: `${o.id}-line`, x: b.x + branchW / 2, y: branchY + branchH, endX: ox + 70, endY: oy, color: "#cbd5e1", strokeWidth: 1.5, frameId: FRAME_ID }),
      )
    })
  })
  return finalise(elements)
}

// ── K-12 templates ──────────────────────────────────────────────────
// Eight grade-band-specific layouts. Each frame is named with the
// applicable class range so the teacher can spot the right one at a
// glance from the picker swatch.

// KG · Numbers 1-10
function kgNumbersScene(): StoredScene {
  const FRAME_ID = "kgn-frame"
  const left = 60
  const top = 110
  const cellW = 110
  const cellH = 150
  const gap = 12
  const elements: ExcalidrawElement[] = []
  const frameW = left * 2 + cellW * 10 + gap * 9
  const frameH = top + cellH + 80
  elements.push(frame({ id: FRAME_ID, x: 0, y: 0, width: frameW, height: frameH, name: "KG · Numbers 1-10" }))
  elements.push(
    text({ id: "kgn-title", x: left, y: 30, width: 800, height: 36, text: "Numbers 1 - 10", fontSize: 28, color: "#0f172a", bold: true, frameId: FRAME_ID }),
    text({ id: "kgn-sub", x: left, y: 68, width: 800, height: 22, text: "Trace each number · count the dots underneath · say the number aloud.", fontSize: 13, color: "#64748b", frameId: FRAME_ID }),
  )
  for (let n = 1; n <= 10; n++) {
    const x = left + (n - 1) * (cellW + gap)
    // Pastel rotating colours so each digit reads as its own cell
    const palette = [
      { fill: "#fef9c3", stroke: "#facc15" },
      { fill: "#bae6fd", stroke: "#0ea5e9" },
      { fill: "#fbcfe8", stroke: "#ec4899" },
      { fill: "#bbf7d0", stroke: "#22c55e" },
      { fill: "#fed7aa", stroke: "#f97316" },
      { fill: "#ddd6fe", stroke: "#8b5cf6" },
      { fill: "#fecaca", stroke: "#ef4444" },
      { fill: "#a7f3d0", stroke: "#14b8a6" },
      { fill: "#e0e7ff", stroke: "#6366f1" },
      { fill: "#fef3c7", stroke: "#f59e0b" },
    ][n - 1]
    elements.push(
      rect({ id: `kgn-${n}`, x, y: top, width: cellW, height: cellH * 0.66, fill: palette.fill, stroke: palette.stroke, strokeWidth: 2, rounded: true, dashed: true, frameId: FRAME_ID }),
      // Giant outline number (text is the easiest way without glyph paths)
      text({ id: `kgn-${n}-num`, x: x + 6, y: top + 10, width: cellW - 12, height: 80, text: String(n), fontSize: 64, color: palette.stroke, align: "center", bold: true, frameId: FRAME_ID }),
    )
    // Dot count below the box — one dot per unit, capped at 10
    const dotRowY = top + cellH * 0.66 + 10
    const dotCols = n <= 5 ? n : 5
    const dotRows = Math.ceil(n / 5)
    for (let i = 0; i < n; i++) {
      const dr = Math.floor(i / dotCols)
      const dc = i % dotCols
      const dotW = (cellW - 28) / dotCols
      elements.push(
        ellipse({
          id: `kgn-${n}-d${i}`,
          x: x + 14 + dc * dotW,
          y: dotRowY + dr * 18,
          width: 10,
          height: 10,
          fill: palette.stroke,
          stroke: palette.stroke,
          frameId: FRAME_ID,
        }),
      )
    }
    // Lightly cap the dot-row footprint regardless of digit
    void dotRows
  }
  return finalise(elements)
}

// KG · Shape & colour sort
function kgShapesScene(): StoredScene {
  const FRAME_ID = "kgs-frame"
  const left = 60
  const top = 120
  const cellW = 220
  const cellH = 280
  const gap = 20
  const elements: ExcalidrawElement[] = []
  const frameW = left * 2 + cellW * 4 + gap * 3
  const frameH = top + cellH + 60
  elements.push(frame({ id: FRAME_ID, x: 0, y: 0, width: frameW, height: frameH, name: "KG · Shapes & colours" }))
  elements.push(
    text({ id: "kgs-title", x: left, y: 30, width: 800, height: 36, text: "Shapes & colours", fontSize: 28, color: "#0f172a", bold: true, frameId: FRAME_ID }),
    text({ id: "kgs-sub", x: left, y: 68, width: 800, height: 22, text: "Drag each shape into the matching outline. Say its colour and name.", fontSize: 13, color: "#64748b", frameId: FRAME_ID }),
  )

  type ShapeDef = { id: string; label: string; fill: string; stroke: string; shape: "circle" | "square" | "triangle" | "rectangle" }
  const shapes: ShapeDef[] = [
    { id: "kgs-circle",    label: "Circle",    fill: "#bae6fd", stroke: "#0ea5e9", shape: "circle" },
    { id: "kgs-square",    label: "Square",    fill: "#bbf7d0", stroke: "#22c55e", shape: "square" },
    { id: "kgs-triangle",  label: "Triangle",  fill: "#fed7aa", stroke: "#f97316", shape: "triangle" },
    { id: "kgs-rectangle", label: "Rectangle", fill: "#fbcfe8", stroke: "#ec4899", shape: "rectangle" },
  ]
  shapes.forEach((s, i) => {
    const x = left + i * (cellW + gap)
    elements.push(
      rect({ id: `${s.id}-card`, x, y: top, width: cellW, height: cellH, fill: "#ffffff", stroke: "#cbd5e1", strokeWidth: 1.5, rounded: true, dashed: true, frameId: FRAME_ID }),
      text({ id: `${s.id}-label`, x: x + 10, y: top + 14, width: cellW - 20, height: 28, text: s.label, fontSize: 20, color: s.stroke, align: "center", bold: true, frameId: FRAME_ID }),
    )
    // The reference shape — outlined, filled with pastel
    const sx = x + cellW / 2
    const sy = top + cellH / 2 + 10
    if (s.shape === "circle") {
      elements.push(ellipse({ id: s.id, x: sx - 60, y: sy - 60, width: 120, height: 120, fill: s.fill, stroke: s.stroke, strokeWidth: 3, frameId: FRAME_ID }))
    } else if (s.shape === "square") {
      elements.push(rect({ id: s.id, x: sx - 60, y: sy - 60, width: 120, height: 120, fill: s.fill, stroke: s.stroke, strokeWidth: 3, frameId: FRAME_ID }))
    } else if (s.shape === "rectangle") {
      elements.push(rect({ id: s.id, x: sx - 80, y: sy - 45, width: 160, height: 90, fill: s.fill, stroke: s.stroke, strokeWidth: 3, frameId: FRAME_ID }))
    } else {
      // Triangle — Excalidraw has no built-in triangle, draw via lines
      elements.push(
        line({ id: `${s.id}-a`, x: sx, y: sy - 60, endX: sx + 60, endY: sy + 60, color: s.stroke, strokeWidth: 3, frameId: FRAME_ID }),
        line({ id: `${s.id}-b`, x: sx + 60, y: sy + 60, endX: sx - 60, endY: sy + 60, color: s.stroke, strokeWidth: 3, frameId: FRAME_ID }),
        line({ id: `${s.id}-c`, x: sx - 60, y: sy + 60, endX: sx, endY: sy - 60, color: s.stroke, strokeWidth: 3, frameId: FRAME_ID }),
      )
    }
  })
  return finalise(elements)
}

// Class 3-5 · Times table grid (10×10)
function primaryTimesTableScene(): StoredScene {
  const FRAME_ID = "ptt-frame"
  const left = 60
  const top = 120
  const cell = 56
  const elements: ExcalidrawElement[] = []
  const frameW = left * 2 + cell * 11 + 80
  const frameH = top + cell * 11 + 60
  elements.push(frame({ id: FRAME_ID, x: 0, y: 0, width: frameW, height: frameH, name: "Class 3-5 · Times table" }))
  elements.push(
    text({ id: "ptt-title", x: left, y: 30, width: 800, height: 36, text: "Times table 1 – 10", fontSize: 28, color: "#0f172a", bold: true, frameId: FRAME_ID }),
    text({ id: "ptt-sub", x: left, y: 68, width: 800, height: 22, text: "Fill in each cell. Practise the row, then quiz across rows.", fontSize: 13, color: "#64748b", frameId: FRAME_ID }),
  )
  // 11×11 grid: top-left is "×", first row + column are headers
  for (let r = 0; r < 11; r++) {
    for (let c = 0; c < 11; c++) {
      const x = left + c * cell
      const y = top + r * cell
      const isHeader = r === 0 || c === 0
      elements.push(
        rect({
          id: `ptt-${r}-${c}`,
          x, y, width: cell, height: cell,
          fill: isHeader ? "#1e293b" : "#ffffff",
          stroke: isHeader ? "#0f172a" : "#e2e8f0",
          frameId: FRAME_ID,
        }),
      )
      let label = ""
      if (r === 0 && c === 0) label = "×"
      else if (r === 0) label = String(c)
      else if (c === 0) label = String(r)
      if (label) {
        elements.push(
          text({
            id: `ptt-${r}-${c}-l`,
            x: x + 6, y: y + 14, width: cell - 12, height: 28,
            text: label,
            fontSize: 18,
            color: isHeader ? "#f8fafc" : "#0f172a",
            align: "center",
            bold: true,
            frameId: FRAME_ID,
          }),
        )
      }
    }
  }
  return finalise(elements)
}

// Class 4-6 · Fraction circles
function primaryFractionsScene(): StoredScene {
  const FRAME_ID = "pf-frame"
  const left = 60
  const top = 120
  const elements: ExcalidrawElement[] = []
  const frameW = 1000
  const frameH = 560
  elements.push(frame({ id: FRAME_ID, x: 0, y: 0, width: frameW, height: frameH, name: "Class 4-6 · Fractions" }))
  elements.push(
    text({ id: "pf-title", x: left, y: 30, width: 800, height: 36, text: "Fraction circles", fontSize: 28, color: "#0f172a", bold: true, frameId: FRAME_ID }),
    text({ id: "pf-sub", x: left, y: 68, width: 900, height: 22, text: "Whole · halves · thirds · quarters · sixths · eighths — colour each slice and label it.", fontSize: 13, color: "#64748b", frameId: FRAME_ID }),
  )
  const denominators = [
    { d: 1, label: "1 whole",  fill: "#fef9c3", stroke: "#ca8a04" },
    { d: 2, label: "halves",   fill: "#bae6fd", stroke: "#0ea5e9" },
    { d: 3, label: "thirds",   fill: "#bbf7d0", stroke: "#22c55e" },
    { d: 4, label: "quarters", fill: "#fed7aa", stroke: "#f97316" },
    { d: 6, label: "sixths",   fill: "#ddd6fe", stroke: "#8b5cf6" },
    { d: 8, label: "eighths",  fill: "#fbcfe8", stroke: "#ec4899" },
  ]
  const cols = 3
  const dia = 180
  const padX = 100
  const padY = 220
  denominators.forEach((f, i) => {
    const col = i % cols
    const row = Math.floor(i / cols)
    const cx = left + 80 + col * (dia + padX) + dia / 2
    const cy = top + 30 + row * (dia + padY) + dia / 2
    // Whole circle
    elements.push(
      ellipse({ id: `pf-${f.d}`, x: cx - dia / 2, y: cy - dia / 2, width: dia, height: dia, fill: f.fill, stroke: f.stroke, strokeWidth: 2, frameId: FRAME_ID }),
    )
    // Slice lines from centre — d>1 gets d division lines
    if (f.d > 1) {
      for (let k = 0; k < f.d; k++) {
        const ang = (k / f.d) * Math.PI * 2 - Math.PI / 2
        const ex = cx + Math.cos(ang) * (dia / 2)
        const ey = cy + Math.sin(ang) * (dia / 2)
        elements.push(line({ id: `pf-${f.d}-l${k}`, x: cx, y: cy, endX: ex, endY: ey, color: f.stroke, strokeWidth: 1.5, frameId: FRAME_ID }))
      }
    }
    elements.push(
      text({ id: `pf-${f.d}-label`, x: cx - dia / 2, y: cy + dia / 2 + 10, width: dia, height: 24, text: `1/${f.d} · ${f.label}`, fontSize: 14, color: f.stroke, align: "center", bold: true, frameId: FRAME_ID }),
    )
  })
  return finalise(elements)
}

// Class 5-8 · Parts of speech
function middlePartsOfSpeechScene(): StoredScene {
  const FRAME_ID = "mpos-frame"
  const left = 60
  const top = 120
  const colW = 230
  const colH = 380
  const gap = 14
  const elements: ExcalidrawElement[] = []
  const frameW = left * 2 + colW * 4 + gap * 3
  const frameH = top + colH + 60
  elements.push(frame({ id: FRAME_ID, x: 0, y: 0, width: frameW, height: frameH, name: "Class 5-8 · Parts of speech" }))
  elements.push(
    text({ id: "mpos-title", x: left, y: 30, width: 800, height: 36, text: "Parts of speech sort", fontSize: 28, color: "#0f172a", bold: true, frameId: FRAME_ID }),
    text({ id: "mpos-sub", x: left, y: 68, width: 800, height: 22, text: "Sort each word into the right column. Add a sample sentence below.", fontSize: 13, color: "#64748b", frameId: FRAME_ID }),
  )
  const cols = [
    { id: "mpos-n", label: "Noun",      hint: "person · place · thing · idea", example: "river, justice", fill: "#dbeafe", stroke: "#2563eb" },
    { id: "mpos-v", label: "Verb",      hint: "action or state of being",       example: "run, is, become", fill: "#dcfce7", stroke: "#16a34a" },
    { id: "mpos-a", label: "Adjective", hint: "describes a noun",                example: "tall, blue, kind", fill: "#fef3c7", stroke: "#ca8a04" },
    { id: "mpos-d", label: "Adverb",    hint: "describes a verb / adj / adverb", example: "quickly, very", fill: "#fce7f3", stroke: "#db2777" },
  ]
  cols.forEach((c, i) => {
    const x = left + i * (colW + gap)
    elements.push(
      rect({ id: `${c.id}-bg`, x, y: top, width: colW, height: colH, fill: c.fill, stroke: c.stroke, strokeWidth: 1.5, rounded: true, frameId: FRAME_ID }),
      rect({ id: `${c.id}-head`, x, y: top, width: colW, height: 50, fill: c.stroke, stroke: c.stroke, rounded: true, frameId: FRAME_ID }),
      text({ id: `${c.id}-label`, x: x + 12, y: top + 12, width: colW - 24, height: 28, text: c.label, fontSize: 18, color: "#ffffff", align: "center", bold: true, frameId: FRAME_ID }),
      text({ id: `${c.id}-hint`, x: x + 12, y: top + 60, width: colW - 24, height: 22, text: c.hint, fontSize: 11, color: c.stroke, frameId: FRAME_ID }),
      text({ id: `${c.id}-ex`, x: x + 12, y: top + 84, width: colW - 24, height: 22, text: `e.g. ${c.example}`, fontSize: 11, color: "#64748b", frameId: FRAME_ID }),
      // Word drop zone
      rect({ id: `${c.id}-zone`, x: x + 10, y: top + 120, width: colW - 20, height: colH - 140, fill: "#ffffff", stroke: c.stroke, rounded: true, dashed: true, frameId: FRAME_ID }),
      text({ id: `${c.id}-zone-hint`, x: x + 10, y: top + 130, width: colW - 20, height: 22, text: "drop words here", fontSize: 11, color: "#94a3b8", align: "center", frameId: FRAME_ID }),
    )
  })
  return finalise(elements)
}

// Class 6-9 · Algebra workspace
function middleAlgebraScene(): StoredScene {
  const FRAME_ID = "mal-frame"
  const left = 60
  const top = 120
  const sectW = 820
  const elements: ExcalidrawElement[] = []
  elements.push(frame({ id: FRAME_ID, x: 0, y: 0, width: left * 2 + sectW, height: 600, name: "Class 6-9 · Algebra workspace" }))
  elements.push(
    text({ id: "mal-title", x: left, y: 30, width: 600, height: 36, text: "Algebra workspace", fontSize: 28, color: "#0f172a", bold: true, frameId: FRAME_ID }),
    text({ id: "mal-sub", x: left, y: 68, width: 900, height: 22, text: "Given → Find → Solve. Show every step — the working IS the answer.", fontSize: 13, color: "#64748b", frameId: FRAME_ID }),
  )
  const sections = [
    { id: "mal-g", num: "1", label: "Given",  hint: "Write down what the problem tells you.",     fill: "#dbeafe", stroke: "#2563eb", h: 120 },
    { id: "mal-f", num: "2", label: "Find",   hint: "What is the question actually asking?",      fill: "#fef3c7", stroke: "#ca8a04", h: 120 },
    { id: "mal-s", num: "3", label: "Solve",  hint: "Show every step. Boxed answer at the end.",  fill: "#dcfce7", stroke: "#16a34a", h: 220 },
  ]
  let yCursor = top
  sections.forEach((s) => {
    elements.push(
      rect({ id: s.id, x: left, y: yCursor, width: sectW, height: s.h, fill: s.fill, stroke: s.stroke, strokeWidth: 1.5, rounded: true, frameId: FRAME_ID }),
      ellipse({ id: `${s.id}-num`, x: left + 16, y: yCursor + 20, width: 44, height: 44, fill: s.stroke, stroke: s.stroke, frameId: FRAME_ID }),
      text({ id: `${s.id}-num-t`, x: left + 16, y: yCursor + 30, width: 44, height: 26, text: s.num, fontSize: 18, color: "#ffffff", align: "center", bold: true, frameId: FRAME_ID }),
      text({ id: `${s.id}-label`, x: left + 76, y: yCursor + 18, width: sectW - 92, height: 28, text: s.label, fontSize: 20, color: s.stroke, bold: true, frameId: FRAME_ID }),
      text({ id: `${s.id}-hint`, x: left + 76, y: yCursor + 50, width: sectW - 92, height: 22, text: s.hint, fontSize: 12, color: "#64748b", frameId: FRAME_ID }),
    )
    yCursor += s.h + 14
  })
  return finalise(elements)
}

// Class 8-11 · Periodic table skeleton
function secondaryPeriodicScene(): StoredScene {
  const FRAME_ID = "spt-frame"
  const left = 50
  const top = 120
  const cell = 42
  const cols = 18
  const rows = 7
  const elements: ExcalidrawElement[] = []
  const frameW = left * 2 + cell * cols + 40
  const frameH = top + cell * rows + 100
  elements.push(frame({ id: FRAME_ID, x: 0, y: 0, width: frameW, height: frameH, name: "Class 8-11 · Periodic table" }))
  elements.push(
    text({ id: "spt-title", x: left, y: 24, width: 600, height: 36, text: "Periodic table", fontSize: 26, color: "#0f172a", bold: true, frameId: FRAME_ID }),
    text({ id: "spt-sub", x: left, y: 60, width: 900, height: 22, text: "Skeleton grid — fill in the elements as you study each group / period.", fontSize: 12, color: "#64748b", frameId: FRAME_ID }),
  )
  // Header row (group labels 1-18)
  for (let g = 1; g <= cols; g++) {
    const x = left + (g - 1) * cell
    elements.push(
      text({ id: `spt-g${g}`, x, y: top - 24, width: cell, height: 22, text: String(g), fontSize: 11, color: "#475569", align: "center", bold: true, frameId: FRAME_ID }),
    )
  }
  // Group-band colours (very loose: alkali · alkaline · transition · …)
  const groupColors: Record<number, string> = {
    1: "#fee2e2", 2: "#fef3c7",
    13: "#dbeafe", 14: "#e0e7ff", 15: "#ddd6fe", 16: "#fce7f3", 17: "#fde68a", 18: "#bae6fd",
  }
  for (let r = 1; r <= rows; r++) {
    elements.push(
      text({ id: `spt-r${r}`, x: left - 28, y: top + (r - 1) * cell + 12, width: 22, height: 20, text: String(r), fontSize: 11, color: "#475569", align: "right", bold: true, frameId: FRAME_ID }),
    )
    for (let g = 1; g <= cols; g++) {
      // The real periodic table has gaps — but we ship a full grid so
      // the teacher can use it as a sketch surface for any unit (e.g.
      // marking the noble gases on one axis). Tint by group band.
      const fill = groupColors[g] ?? "#f1f5f9"
      const stroke = "#cbd5e1"
      elements.push(
        rect({ id: `spt-${r}-${g}`, x: left + (g - 1) * cell, y: top + (r - 1) * cell, width: cell - 2, height: cell - 2, fill, stroke, frameId: FRAME_ID }),
      )
    }
  }
  return finalise(elements)
}

// Class 11-12 · Supply & demand curve
function seniorSupplyDemandScene(): StoredScene {
  const FRAME_ID = "ssd-frame"
  const left = 60
  const top = 120
  const axisW = 700
  const axisH = 460
  const ox = left + 60   // origin x
  const oy = top + axisH - 40
  const elements: ExcalidrawElement[] = []
  elements.push(frame({ id: FRAME_ID, x: 0, y: 0, width: left * 2 + axisW + 100, height: top + axisH + 80, name: "Class 11-12 · Supply & demand" }))
  elements.push(
    text({ id: "ssd-title", x: left, y: 30, width: 600, height: 36, text: "Supply & demand", fontSize: 28, color: "#0f172a", bold: true, frameId: FRAME_ID }),
    text({ id: "ssd-sub", x: left, y: 68, width: 900, height: 22, text: "Plot the curves, mark equilibrium, then shift one curve and predict the new point.", fontSize: 13, color: "#64748b", frameId: FRAME_ID }),
  )
  // Axes — y points up, x to the right
  elements.push(
    arrow({ id: "ssd-yaxis", x: ox, y: oy, endX: ox, endY: top + 60, color: "#0f172a", strokeWidth: 2, frameId: FRAME_ID }),
    arrow({ id: "ssd-xaxis", x: ox, y: oy, endX: left + axisW - 20, endY: oy, color: "#0f172a", strokeWidth: 2, frameId: FRAME_ID }),
    text({ id: "ssd-y-label", x: ox - 50, y: top + 70, width: 60, height: 22, text: "Price (P)", fontSize: 13, color: "#0f172a", align: "right", bold: true, frameId: FRAME_ID }),
    text({ id: "ssd-x-label", x: left + axisW - 100, y: oy + 14, width: 100, height: 22, text: "Quantity (Q)", fontSize: 13, color: "#0f172a", align: "right", bold: true, frameId: FRAME_ID }),
  )
  // Demand curve — downward slope
  elements.push(
    line({ id: "ssd-d", x: ox + 20, y: top + 90, endX: left + axisW - 60, endY: oy - 30, color: "#dc2626", strokeWidth: 2.5, frameId: FRAME_ID }),
    text({ id: "ssd-d-label", x: left + axisW - 60, y: oy - 50, width: 80, height: 22, text: "D", fontSize: 20, color: "#dc2626", bold: true, frameId: FRAME_ID }),
  )
  // Supply curve — upward slope
  elements.push(
    line({ id: "ssd-s", x: ox + 20, y: oy - 30, endX: left + axisW - 60, endY: top + 90, color: "#2563eb", strokeWidth: 2.5, frameId: FRAME_ID }),
    text({ id: "ssd-s-label", x: left + axisW - 60, y: top + 70, width: 80, height: 22, text: "S", fontSize: 20, color: "#2563eb", bold: true, frameId: FRAME_ID }),
  )
  // Equilibrium dot at the intersection (geometric midpoint of the two line segments)
  const eqX = (ox + 20 + left + axisW - 60) / 2
  const eqY = (top + 90 + oy - 30) / 2
  elements.push(
    ellipse({ id: "ssd-eq", x: eqX - 8, y: eqY - 8, width: 16, height: 16, fill: "#0f172a", stroke: "#0f172a", strokeWidth: 2, frameId: FRAME_ID }),
    text({ id: "ssd-eq-label", x: eqX + 14, y: eqY - 8, width: 200, height: 22, text: "Equilibrium (P*, Q*)", fontSize: 13, color: "#0f172a", bold: true, frameId: FRAME_ID }),
  )
  // Dashed dotted lines down + left from equilibrium
  elements.push(
    line({ id: "ssd-eq-v", x: eqX, y: eqY, endX: eqX, endY: oy, color: "#94a3b8", strokeWidth: 1, frameId: FRAME_ID }),
    line({ id: "ssd-eq-h", x: eqX, y: eqY, endX: ox, endY: eqY, color: "#94a3b8", strokeWidth: 1, frameId: FRAME_ID }),
  )
  return finalise(elements)
}

// Stamp fresh fractional indices on every element. Frames are placed
// FIRST in the list so they sit visually behind their children, and
// the children's frameId references resolve to an element that
// already exists in the stream.
function finalise(elements: ExcalidrawElement[]): StoredScene {
  // Promote frames to the front of the list to satisfy Excalidraw's
  // expectation that the container precedes its members in the
  // element ordering.
  const frames = elements.filter((e) => e.type === "frame")
  const others = elements.filter((e) => e.type !== "frame")
  const ordered = [...frames, ...others]
  const keys = generateNKeysBetween(null, null, ordered.length)
  const indexed = ordered.map((e, i) => ({ ...e, index: keys[i] }) as ExcalidrawElement)
  return {
    elements: indexed,
    appState: {
      viewBackgroundColor: "#fefefe",
      gridSize: 20,
      gridModeEnabled: true,
      scrollX: 0,
      scrollY: 0,
    },
    files: {},
  }
}

const SCENE_BUILDERS: Record<Exclude<TemplateKey, "blank">, () => StoredScene> = {
  "lesson-plan": lessonPlanScene,
  brainstorm: brainstormScene,
  "weekly-schedule": weeklyScheduleScene,
  swot: swotScene,
  persona: personaScene,
  "mind-map": mindMapScene,
  fishbone: fishboneScene,
  kwl: kwlScene,
  frayer: frayerScene,
  "empathy-map": empathyMapScene,
  eisenhower: eisenhowerScene,
  "five-whys": fiveWhysScene,
  venn: vennScene,
  "sprint-retro": sprintRetroScene,
  okr: okrScene,
  storyboard: storyboardScene,
  "lab-report": labReportScene,
  "decision-tree": decisionTreeScene,
  "kg-numbers": kgNumbersScene,
  "kg-shapes": kgShapesScene,
  "primary-times-table": primaryTimesTableScene,
  "primary-fractions": primaryFractionsScene,
  "middle-pos": middlePartsOfSpeechScene,
  "middle-algebra": middleAlgebraScene,
  "secondary-periodic": secondaryPeriodicScene,
  "senior-supply-demand": seniorSupplyDemandScene,
}

/** Subject tags used by the picker filter chips. A template can list
 *  multiple subjects so a cross-cutting tool (Venn, Mind map) is
 *  discoverable from several filter contexts. */
export type Subject =
  | "Engineering"
  | "Management"
  | "Science"
  | "Technology"
  | "Maths"
  | "Design"
  | "Teaching"
  | "Productivity"
  | "K-12"

export interface TemplateMeta {
  key: TemplateKey
  title: string
  description: string
  defaultBoardTitle: string
  /** Loose grouping shown as a sub-header in the picker. K-12 sits
   *  in the middle of the order so grade-band scaffolds are
   *  prominent without dominating the picker for non-K-12 teachers. */
  category: "Teaching" | "K-12 grades" | "Thinking" | "Analysis" | "Planning" | "Other"
  /** Subject tags — drive the filter-chip UI. */
  subjects: Subject[]
  /** Optional grade-band label (e.g. "KG", "Class 3-5") shown as a
   *  small pill on K-12 cards so a teacher can scan to their grade
   *  level instantly. */
  gradeBand?: string
}

export const WHITEBOARD_TEMPLATES: TemplateMeta[] = [
  // ── Teaching scaffolds ─────────────────────────────────────────────
  { key: "lesson-plan",     title: "Lesson plan",     description: "Objective · Hook · Practice · Exit ticket — the four moves of a good class.",                            defaultBoardTitle: "Lesson plan",          category: "Teaching", subjects: ["Teaching"] },
  { key: "kwl",             title: "K-W-L chart",     description: "Know · Want to know · Learned. Open and close any unit with the same scaffold.",                         defaultBoardTitle: "K-W-L chart",          category: "Teaching", subjects: ["Teaching", "Science"] },
  { key: "frayer",          title: "Frayer model",    description: "One word, four quadrants — Definition · Characteristics · Examples · Non-examples.",                      defaultBoardTitle: "Frayer model",         category: "Teaching", subjects: ["Teaching", "Science", "Maths"] },
  { key: "weekly-schedule", title: "Weekly schedule", description: "Seven-day grid with morning, midday, afternoon, and evening blocks. Today highlighted.",                  defaultBoardTitle: "Weekly schedule",      category: "Planning", subjects: ["Teaching", "Productivity"] },
  { key: "storyboard",      title: "Storyboard",      description: "Six-panel narrative scaffold — sketch the scene, caption it, sequence the story.",                        defaultBoardTitle: "Storyboard",           category: "Teaching", subjects: ["Teaching", "Design"] },
  { key: "lab-report",      title: "Lab report",      description: "Hypothesis · Method · Results · Conclusion. Standardised science write-up.",                              defaultBoardTitle: "Lab report",           category: "Teaching", subjects: ["Science", "Teaching"] },

  // ── K-12 grade-band scaffolds ──────────────────────────────────────
  { key: "kg-numbers",          title: "Numbers 1 - 10",      description: "Ten trace-ready number boxes with dot-counts underneath. Kindergarten staple.",                   defaultBoardTitle: "Numbers 1-10",          category: "K-12 grades", subjects: ["K-12", "Teaching", "Maths"],    gradeBand: "KG" },
  { key: "kg-shapes",           title: "Shapes & colours",     description: "Four big shape outlines (circle · square · triangle · rectangle) with drop zones.",              defaultBoardTitle: "Shapes & colours",      category: "K-12 grades", subjects: ["K-12", "Teaching"],            gradeBand: "KG" },
  { key: "primary-times-table", title: "Times table grid",     description: "10×10 multiplication grid. Practise a row, then quiz across rows.",                              defaultBoardTitle: "Times table",           category: "K-12 grades", subjects: ["K-12", "Maths"],               gradeBand: "Class 3-5" },
  { key: "primary-fractions",   title: "Fraction circles",     description: "Whole · halves · thirds · quarters · sixths · eighths. Colour each slice and label it.",          defaultBoardTitle: "Fraction circles",      category: "K-12 grades", subjects: ["K-12", "Maths"],               gradeBand: "Class 4-6" },
  { key: "middle-pos",          title: "Parts of speech",      description: "Four colour-coded columns — Noun · Verb · Adjective · Adverb — with drop zones.",                defaultBoardTitle: "Parts of speech",       category: "K-12 grades", subjects: ["K-12", "Teaching"],            gradeBand: "Class 5-8" },
  { key: "middle-algebra",      title: "Algebra workspace",    description: "Given → Find → Solve. Show every step — the working IS the answer.",                              defaultBoardTitle: "Algebra workspace",     category: "K-12 grades", subjects: ["K-12", "Maths"],               gradeBand: "Class 6-9" },
  { key: "secondary-periodic",  title: "Periodic table",       description: "18-column × 7-row skeleton with group/period labels. Fill in as you study each band.",            defaultBoardTitle: "Periodic table",        category: "K-12 grades", subjects: ["K-12", "Science"],             gradeBand: "Class 8-11" },
  { key: "senior-supply-demand",title: "Supply & demand",      description: "Price–quantity axes with intersecting curves and equilibrium dot. Shift one to predict the next.", defaultBoardTitle: "Supply & demand",       category: "K-12 grades", subjects: ["K-12", "Management"],          gradeBand: "Class 11-12" },

  // ── Thinking & ideation ────────────────────────────────────────────
  { key: "brainstorm",      title: "Brainstorm",      description: "Centre topic with eight sticky notes radiating out. Branch and connect.",                                 defaultBoardTitle: "Brainstorm",           category: "Thinking", subjects: ["Design", "Teaching", "Management"] },
  { key: "mind-map",        title: "Mind map",        description: "Main topic in the centre, four primary branches, sub-topics trailing out.",                              defaultBoardTitle: "Mind map",             category: "Thinking", subjects: ["Teaching", "Science", "Maths"] },
  { key: "venn",            title: "Venn diagram",    description: "Two overlapping sets — what's unique to each, what's shared.",                                            defaultBoardTitle: "Venn diagram",         category: "Thinking", subjects: ["Maths", "Science", "Teaching"] },
  { key: "decision-tree",   title: "Decision tree",   description: "Root question → branch by option → trace each path to its outcome.",                                      defaultBoardTitle: "Decision tree",        category: "Thinking", subjects: ["Maths", "Technology", "Management"] },

  // ── Analysis & strategy ────────────────────────────────────────────
  { key: "swot",            title: "SWOT analysis",   description: "Strengths · Weaknesses · Opportunities · Threats. Map internal vs external, helpful vs harmful.",         defaultBoardTitle: "SWOT analysis",        category: "Analysis", subjects: ["Management"] },
  { key: "persona",         title: "User persona",    description: "Avatar + name + goals + frustrations + behaviours. Decide for one specific user.",                        defaultBoardTitle: "User persona",         category: "Analysis", subjects: ["Design", "Management", "Technology"] },
  { key: "empathy-map",     title: "Empathy map",     description: "Says · Thinks · Does · Feels. Observe one user from four angles.",                                        defaultBoardTitle: "Empathy map",          category: "Analysis", subjects: ["Design", "Management"] },
  { key: "fishbone",        title: "Fishbone (Ishikawa)", description: "Spine to a problem head, six bones for cause categories — root-cause classic.",                       defaultBoardTitle: "Root cause analysis",  category: "Analysis", subjects: ["Engineering", "Management"] },
  { key: "five-whys",       title: "5 Whys",          description: "Ask why five times to walk past symptoms and find the root cause.",                                       defaultBoardTitle: "5 Whys",               category: "Analysis", subjects: ["Engineering", "Management"] },

  // ── Planning ───────────────────────────────────────────────────────
  { key: "eisenhower",      title: "Eisenhower matrix", description: "Important × Urgent. Sort tasks into Do · Schedule · Delegate · Drop.",                                  defaultBoardTitle: "Eisenhower matrix",    category: "Planning", subjects: ["Productivity", "Management"] },
  { key: "okr",             title: "OKR planner",     description: "One objective + three measurable key results. Score 0.0 – 1.0 at cycle end.",                              defaultBoardTitle: "OKR planner",          category: "Planning", subjects: ["Management"] },
  { key: "sprint-retro",    title: "Sprint retrospective", description: "4Ls — Liked · Learned · Lacked · Longed for. Reflect on the cycle.",                                  defaultBoardTitle: "Sprint retrospective", category: "Planning", subjects: ["Engineering", "Management"] },

  { key: "blank",           title: "Blank canvas",    description: "Start from nothing — infinite grid, every tool ready.",                                                   defaultBoardTitle: "",                     category: "Other",    subjects: [] },
]

/** All subjects used across the template set. The picker turns each
 *  into a filter chip; we derive this from the templates rather than
 *  hardcoding so adding a new subject tag is a one-edit operation. */
export const TEMPLATE_SUBJECTS: Subject[] = (() => {
  const set = new Set<Subject>()
  for (const t of WHITEBOARD_TEMPLATES) for (const s of t.subjects) set.add(s)
  return Array.from(set)
})()

export function seedTemplateForBoard(persistenceKey: string, template: TemplateKey): void {
  if (typeof window === "undefined") return
  if (template === "blank") return
  const builder = SCENE_BUILDERS[template]
  if (!builder) return
  const scene = builder()
  try {
    window.localStorage.setItem(STORAGE_PREFIX + persistenceKey, JSON.stringify(scene))
  } catch {
    // Quota — unlikely on a fresh template. Falls back to blank.
  }
}
