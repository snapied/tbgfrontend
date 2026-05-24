"use client"

// Curated portal templates the teacher can apply with one click.
//
// Each template is a self-contained recipe: brand fields (colors,
// fonts, background, layout presets), header nav config (visibility +
// order), footer columns, and the home page sections. Applying a
// template overwrites the corresponding slices of PortalConfig + the
// home PortalPage.sections — everything else (courses, students,
// blog posts, etc.) is untouched.
//
// New templates go in TEMPLATES below. They're rendered visually in the
// picker via the same iframe preview that drives the live preview, so
// you don't need to ship a screenshot — the design IS the screenshot.

import type {
  PortalBrand,
  PortalConfig,
  PortalFooterColumn,
  PortalNavConfig,
  PortalSection,
} from "./portal-store"
import { generatePortalId } from "./portal-store"

// A complete colour palette for a template — every Tailwind/shadcn
// theme variable that actually controls visible text or surfaces. Setting
// all of these per-template avoids the bug where switching from a dark
// template to a light one left the dark `--foreground` behind and made
// headlines invisible on cream paper.
//
// Each field maps 1:1 to a CSS custom property the rest of the app
// already reads via Tailwind utilities (text-foreground, bg-card, etc.).
export interface PortalThemeColors {
  // Page background COLOUR variable — the value Tailwind's bg-background
  // class reads. Distinct from the visual background (which can be a
  // gradient / image set on the portal root). Templates MUST set this
  // so shadcn's outline button (`bg-background text-foreground`) doesn't
  // render light-text-on-light-cream when a dark template is active.
  background: string
  foreground: string         // body text + headings
  mutedForeground: string    // subtitles, captions, descriptions
  card: string               // card / panel backgrounds
  cardForeground: string     // text on cards
  popover: string            // dropdowns, dialogs
  popoverForeground: string
  border: string             // dividers + input borders
  input: string              // form field background
  secondary: string          // chip / quiet button backgrounds
  secondaryForeground: string
  primaryForeground: string  // text colour on the primary button
  accentForeground: string   // text colour on the accent surface
  ring: string               // focus ring
}

// Builds the customCss block that applies a theme spec. We write CSS
// variables (not raw selectors like h1/p) because the rest of the
// dashboard already reads those vars through Tailwind utilities, so a
// single block updates every text colour, every card, every border.
// Also styles the bare HTML elements visitors see in rich-text blocks
// (h1-h6, p, a, blockquote, code) so prose lands in the right font
// and contrast even when authors don't add Tailwind classes.
function buildThemeBlock(spec: PortalThemeColors): string {
  return `
--background: ${spec.background};
--foreground: ${spec.foreground};
--muted-foreground: ${spec.mutedForeground};
--card: ${spec.card};
--card-foreground: ${spec.cardForeground};
--popover: ${spec.popover};
--popover-foreground: ${spec.popoverForeground};
--border: ${spec.border};
--input: ${spec.input};
--secondary: ${spec.secondary};
--secondary-foreground: ${spec.secondaryForeground};
--primary-foreground: ${spec.primaryForeground};
--accent-foreground: ${spec.accentForeground};
--ring: ${spec.ring};
--muted: ${spec.secondary};

color: ${spec.foreground};

/* Headings inherit color (so a parent like <footer
   className="bg-foreground text-background"> can flip them light) —
   we only enforce the heading font family. Previously the explicit
   color: foreground rule painted black headings inside the dark
   footer and made them invisible. */
h1, h2, h3, h4, h5, h6 { font-family: var(--font-serif); }
/* p deliberately omitted — let it inherit from its parent. Same
   reason as above: forcing p { color: foreground } broke any block
   that used Tailwind's text-* utilities on a parent (e.g. the
   bg-foreground footer variant). */
/* Anchor styling is scoped to inline prose links only. Excludes:
     • anchors with element children (icons / wrapped cards)
     • shadcn's Button-as-anchor (data-slot="button")
     • any anchor anywhere inside <nav>, <header>, or <footer>
   These three regions all have their own link styling rules (or
   should). Practically the rule then only fires on bare-text
   anchors inside page sections / rich-text blocks — the actual
   prose case. */
a:not(:has(*)):not([data-slot="button"]):not(nav *):not(header *):not(footer *) { color: var(--primary); }
a:not(:has(*)):not([data-slot="button"]):not(nav *):not(header *):not(footer *):hover { text-decoration: underline; }
blockquote { color: ${spec.mutedForeground}; border-left-color: ${spec.border}; }
code, kbd { color: ${spec.foreground}; background-color: ${spec.secondary}; }
hr { border-color: ${spec.border}; }
input, textarea, select { color: ${spec.foreground}; background-color: ${spec.input}; border-color: ${spec.border}; }
input::placeholder, textarea::placeholder { color: ${spec.mutedForeground}; }
`.trim()
}

// Compose the full per-template stylesheet: theme palette + a "flair"
// block. Flair is the template's identity — sharp vs round, glassy vs
// flat, glow vs shadow, classic vs brutalist. Keeping it as a string
// lets each template paint over Tailwind utilities (.rounded-xl,
// .bg-card, etc.) without us having to extend PortalBrand for every
// stylistic knob.
function compose(palette: string, flair: string): string {
  return `${palette}\n\n/* template flair */\n${flair.trim()}`
}

export interface PortalTemplate {
  id: string
  name: string
  // One-line pitch surfaced under the name in the picker.
  tagline: string
  // 1-2 sentence description that explains who the template is for.
  description: string
  // Quick chips: "Serif", "Dark", "Image", etc. — surfaced in the picker.
  tags: string[]
  // Tiny inline thumbnail rendered when iframe preview isn't available.
  // Two stripes of color + a gradient line — enough for the picker to
  // look like a screenshot without needing real screenshots.
  swatch: {
    primary: string
    accent: string
    background: string
  }
  brand: Partial<PortalBrand>
  nav?: Partial<PortalNavConfig>
  footerColumns?: PortalFooterColumn[]
  // Replaces the home page sections wholesale. Function form so each
  // apply gets fresh ids (otherwise multiple applies = duplicate ids).
  homeSections: () => PortalSection[]
}

// --- Templates -----------------------------------------------------

const editorial: PortalTemplate = {
  id: "editorial",
  name: "Editorial",
  tagline: "Magazine-style serif portal with paper-warmth and drop caps",
  description:
    "Cream paper, Fraunces headings, hand-set body. Pull-quotes get an oversize opening mark; rich-text blocks earn a classical drop cap on the first letter. Built for long-form courses, philosophy, literature — anywhere words do the work.",
  tags: ["Serif", "Paper", "Editorial", "Drop cap"],
  swatch: {
    primary: "#1a1a1a",
    accent: "#b45309",
    background: "#faf6ee",
  },
  brand: {
    primaryColor: "#1a1a1a",
    accentColor: "#b45309",
    headingFont: "Fraunces",
    bodyFont: "Inter",
    headerLayout: "split-classic",
    footerLayout: "compact-mono",
    backgroundKind: "solid",
    backgroundColor: "#faf6ee",
    customCss: compose(
      buildThemeBlock({
        background: "#faf6ee",
        foreground: "#171210",
        mutedForeground: "#736658",
        card: "#fffdf7",
        cardForeground: "#171210",
        popover: "#fffdf7",
        popoverForeground: "#171210",
        border: "#e7dcc8",
        input: "#fffdf7",
        secondary: "#f3ebd8",
        secondaryForeground: "#171210",
        primaryForeground: "#faf6ee",
        accentForeground: "#fffdf7",
        ring: "#1a1a1a",
      }),
      `
/* Paper feel: subtle warm gradient overlay so the cream isn't flat */
background-image: radial-gradient(ellipse at top, #fffaee 0%, #faf6ee 60%);
background-attachment: fixed;

/* Refined serif chrome on every card + section */
h1 { font-weight: 700; letter-spacing: -0.02em; line-height: 1.05; }
h2 { font-weight: 600; letter-spacing: -0.015em; }
h3 { font-weight: 600; }
.rounded-md, .rounded-lg, .rounded-xl { border-radius: 4px !important; }
.bg-card { box-shadow: 0 1px 0 rgba(23,18,16,0.04), 0 0 0 1px #efe6d0; }
button, .bg-primary { letter-spacing: 0.01em; }

/* Drop cap on rich-text section first paragraph */
.tiptap-content > p:first-of-type::first-letter,
.prose > p:first-of-type::first-letter {
  font-family: var(--font-serif);
  float: left;
  font-size: 4.2em;
  line-height: 0.85;
  padding: 0.1em 0.12em 0 0;
  font-weight: 700;
  color: var(--primary);
}

/* Oversize open-quote on blockquote — proper editorial pull-quote */
blockquote {
  font-family: var(--font-serif);
  font-style: italic;
  font-size: 1.35em;
  border-left: none !important;
  padding-left: 0;
  position: relative;
  margin: 2rem 1rem;
}
blockquote::before {
  content: "\\201C";
  position: absolute;
  left: -0.6em;
  top: -0.2em;
  font-size: 3em;
  line-height: 1;
  color: ${"#b45309"};
  opacity: 0.5;
}
`,
    ),
  },
  nav: {
    builtInOrder: ["courses", "teachers", "blog", "wall", "store"],
    showWall: true,
  },
  homeSections: () => [
    {
      id: generatePortalId("sec"),
      kind: "hero",
      config: {
        eyebrow: "Volume 1",
        headline: "Slow learning, well-bound.",
        subhead:
          "Long-form courses built like books — chapter by chapter, with room to think between.",
        primaryCta: { label: "Browse the shelf", href: "/courses" },
        secondaryCta: { label: "About the press", href: "/about" },
        alignment: "left",
      },
    },
    {
      id: generatePortalId("sec"),
      kind: "features",
      config: {
        heading: "What sets these courses apart",
        items: [
          { title: "Hand-edited transcripts", body: "Every video comes with prose worth reading on its own." },
          { title: "Office hours, not chatbots", body: "Real letters back from a real teacher — usually within a day." },
          { title: "Lifetime revisions", body: "Buy once; the chapters keep improving." },
        ],
      },
    },
    {
      id: generatePortalId("sec"),
      kind: "courses-grid",
      config: { heading: "Latest editions", mode: "popular", limit: 6 },
    },
    {
      id: generatePortalId("sec"),
      kind: "testimonials",
      config: { heading: "From the readers", source: "featured", layout: "grid" },
    },
    {
      id: generatePortalId("sec"),
      kind: "cta",
      config: {
        headline: "Subscribe to the next volume.",
        subhead: "Get a heads-up when the next course lands.",
        primaryCta: { label: "Start reading", href: "/courses" },
      },
    },
  ],
}

const studio: PortalTemplate = {
  id: "studio",
  name: "Studio",
  tagline: "Dark, confident, designed for creators",
  description:
    "Near-black background with a vivid violet accent. Built for design, code, and music portals where the portfolio matters more than the marketing copy.",
  tags: ["Dark", "Bold", "Creative"],
  swatch: {
    primary: "#a78bfa",
    accent: "#22d3ee",
    background: "#0b0b10",
  },
  brand: {
    primaryColor: "#a78bfa",
    accentColor: "#22d3ee",
    headingFont: "Outfit",
    bodyFont: "Inter",
    headerLayout: "centered-minimal",
    footerLayout: "multi-column",
    backgroundKind: "gradient",
    backgroundGradient:
      "radial-gradient(1200px 600px at 20% -10%, rgba(167,139,250,0.18), transparent), radial-gradient(900px 500px at 100% 10%, rgba(34,211,238,0.12), transparent), #0b0b10",
    customCss: compose(
      buildThemeBlock({
        background: "#0b0b10",
        foreground: "#f8fafc",
        mutedForeground: "#94a3b8",
        card: "rgba(255,255,255,0.04)",
        cardForeground: "#f8fafc",
        popover: "#15151c",
        popoverForeground: "#f8fafc",
        border: "rgba(255,255,255,0.08)",
        input: "rgba(255,255,255,0.04)",
        secondary: "rgba(255,255,255,0.06)",
        secondaryForeground: "#f8fafc",
        primaryForeground: "#0b0b10",
        accentForeground: "#0b0b10",
        ring: "#a78bfa",
      }),
      `
/* Glassmorphic cards — frosted, with a soft inner glow on hover */
.bg-card {
  backdrop-filter: blur(20px) saturate(140%);
  -webkit-backdrop-filter: blur(20px) saturate(140%);
  background-image: linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01));
}
.rounded-md, .rounded-lg, .rounded-xl { border-radius: 1.25rem !important; }

/* Headlines pick up a soft neon glow that mirrors the brand */
h1 {
  font-weight: 800;
  letter-spacing: -0.03em;
  text-shadow: 0 0 60px rgba(167,139,250,0.35), 0 0 120px rgba(34,211,238,0.15);
}
h2 { font-weight: 700; letter-spacing: -0.02em; }

/* On a dark page, the convention is light CTAs against the dark
   field (think Apple / Tesla). We override the shadcn primary and
   outline buttons specifically (data-slot="button") so the brand
   primary colour (violet) is still used for hyperlinks, focus rings
   and accent surfaces — buttons just go white-on-black. */
[data-slot="button"].bg-primary {
  background: #ffffff !important;
  color: #0b0b10 !important;
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,1),
    0 8px 28px -10px rgba(255,255,255,0.35);
}
[data-slot="button"].bg-primary:hover {
  background: #f1f5f9 !important;
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,1),
    0 12px 36px -10px rgba(255,255,255,0.5);
}
/* Secondary / outline buttons: light-tinted background with black
   text so they sit next to the primary CTA as a clearly secondary
   light pill (Apple-style "Watch the film" pattern). */
[data-slot="button"][class*="border"] {
  border-color: transparent !important;
  color: #0b0b10 !important;
  background: rgba(255,255,255,0.85) !important;
  backdrop-filter: blur(8px);
}
[data-slot="button"][class*="border"]:hover {
  background: #ffffff !important;
  border-color: transparent !important;
}

/* Animated aurora overlay so the page feels alive without being noisy */
&::before {
  content: "";
  position: fixed;
  inset: -50%;
  background:
    radial-gradient(circle at 30% 40%, rgba(167,139,250,0.06), transparent 40%),
    radial-gradient(circle at 70% 60%, rgba(34,211,238,0.06), transparent 40%);
  pointer-events: none;
  z-index: -1;
  animation: studio-aurora 22s linear infinite;
}
@keyframes studio-aurora {
  0%   { transform: translate(0, 0) rotate(0deg); }
  100% { transform: translate(0, 0) rotate(360deg); }
}
`,
    ),
  },
  nav: {
    builtInOrder: ["courses", "store", "teachers", "blog", "wall"],
    showWall: true,
  },
  homeSections: () => [
    {
      id: generatePortalId("sec"),
      kind: "hero",
      config: {
        eyebrow: "Studio sessions",
        headline: "Make better work, faster.",
        subhead:
          "Short, dense courses for designers, developers, and musicians. No fluff, no filler — just craft.",
        primaryCta: { label: "Start a course", href: "/courses" },
        secondaryCta: { label: "Shop tools", href: "/store" },
        alignment: "center",
      },
    },
    {
      id: generatePortalId("sec"),
      kind: "stats",
      config: {
        items: [
          { value: "12k", label: "Working creators" },
          { value: "84", label: "Hours of HD video" },
          { value: "4.9★", label: "Average rating" },
        ],
      },
    },
    {
      id: generatePortalId("sec"),
      kind: "courses-grid",
      config: { heading: "Featured sessions", mode: "popular", limit: 6 },
    },
    {
      id: generatePortalId("sec"),
      kind: "logos-strip",
      config: {
        heading: "Trusted by teams at",
        items: [],
      },
    },
    {
      id: generatePortalId("sec"),
      kind: "cta",
      config: {
        headline: "Join the next cohort.",
        subhead: "Live walkthroughs, recorded for catch-up.",
        primaryCta: { label: "See the schedule", href: "/courses" },
      },
    },
  ],
}

const bootcamp: PortalTemplate = {
  id: "bootcamp",
  name: "Bootcamp",
  tagline: "High-energy gradient hero for intensive cohorts",
  description:
    "Sunset gradient hero, bold Manrope headings, big numbers. Built for accelerators, bootcamps and \"30 days to X\" programs where outcomes do the selling.",
  tags: ["Gradient", "Energetic", "Cohort"],
  swatch: {
    primary: "#ea580c",
    accent: "#f59e0b",
    background: "linear-gradient(135deg, #fef3c7, #fed7aa)",
  },
  brand: {
    primaryColor: "#ea580c",
    accentColor: "#f59e0b",
    headingFont: "Manrope",
    bodyFont: "Inter",
    headerLayout: "split-classic",
    footerLayout: "multi-column",
    backgroundKind: "gradient",
    backgroundGradient:
      "linear-gradient(180deg, #fef3c7 0%, #fff7ed 40%, #ffffff 100%)",
    customCss: compose(
      buildThemeBlock({
        background: "#fef3c7",
        foreground: "#1c1917",
        mutedForeground: "#57534e",
        card: "#ffffff",
        cardForeground: "#1c1917",
        popover: "#ffffff",
        popoverForeground: "#1c1917",
        border: "#fed7aa",
        input: "#ffffff",
        secondary: "#fff7ed",
        secondaryForeground: "#7c2d12",
        primaryForeground: "#fff7ed",
        accentForeground: "#1c1917",
        ring: "#ea580c",
      }),
      `
/* Energy — chunky cards, hot CTA shadows, oversize stat numbers */
h1 { font-weight: 800; letter-spacing: -0.035em; line-height: 1; }
h2 { font-weight: 800; letter-spacing: -0.02em; }
.rounded-md { border-radius: 0.6rem !important; }
.rounded-lg, .rounded-xl { border-radius: 1rem !important; }
.bg-card { border-width: 2px !important; }

/* Primary button leans into the brand: thick, hot, with a saturated drop */
.bg-primary {
  box-shadow: 0 8px 0 -2px #c2410c, 0 12px 24px -6px rgba(234,88,12,0.45);
  font-weight: 700;
  letter-spacing: 0.02em;
  text-transform: none;
}
.bg-primary:hover { transform: translateY(-1px); }
.bg-primary:active { transform: translateY(2px); box-shadow: 0 4px 0 -2px #c2410c; }

/* Make the stats section feel like a sales page — huge numbers */
.text-3xl, .text-4xl, .text-5xl { letter-spacing: -0.03em; }
[class*="text-primary"][class*="font-bold"] { font-weight: 900; }
`,
    ),
  },
  nav: {
    builtInOrder: ["courses", "teachers", "wall", "blog", "store"],
    showWall: true,
  },
  homeSections: () => [
    {
      id: generatePortalId("sec"),
      kind: "hero",
      config: {
        eyebrow: "Next cohort starts soon",
        headline: "30 days to ship something real.",
        subhead:
          "Live sessions, code reviews, peer accountability. Cohort-based learning that actually finishes.",
        primaryCta: { label: "Reserve a seat", href: "/courses" },
        secondaryCta: { label: "Talk to a mentor", href: "/contact" },
        alignment: "center",
      },
    },
    {
      id: generatePortalId("sec"),
      kind: "stats",
      config: {
        items: [
          { value: "92%", label: "Finish rate" },
          { value: "300+", label: "Projects shipped" },
          { value: "30 days", label: "From start to demo" },
        ],
      },
    },
    {
      id: generatePortalId("sec"),
      kind: "features",
      config: {
        heading: "How the cohort works",
        items: [
          { title: "Live, twice weekly", body: "Mentor-led walkthroughs with Q&A on Zoom." },
          { title: "Peer pods", body: "Three other builders at your level — accountability that sticks." },
          { title: "Code reviews", body: "Every submission gets reviewed by a working engineer." },
        ],
      },
    },
    {
      id: generatePortalId("sec"),
      kind: "testimonials",
      config: { heading: "Built by past cohorts", source: "featured", layout: "carousel" },
    },
    {
      id: generatePortalId("sec"),
      kind: "faq",
      config: {
        heading: "Common questions",
        items: [
          { q: "What if I can't make a live session?", a: "Every session is recorded and posted within hours." },
          { q: "Is there a refund policy?", a: "Full refund within the first 7 days, no questions asked." },
          { q: "What level is this for?", a: "Junior to mid-level — comfortable with the basics, ready to ship." },
        ],
      },
    },
    {
      id: generatePortalId("sec"),
      kind: "cta",
      config: {
        headline: "Doors close Friday.",
        subhead: "Limited to 30 builders per cohort.",
        primaryCta: { label: "Apply now", href: "/courses" },
      },
    },
  ],
}

const scholar: PortalTemplate = {
  id: "scholar",
  name: "Scholar",
  tagline: "Quiet, white-space-first, university-style portal",
  description:
    "Lots of breathing room, EB Garamond headings, deep green primary. Best for academic disciplines, certifications and institutes that value gravitas.",
  tags: ["Minimal", "Academic", "Quiet"],
  swatch: {
    primary: "#0f3d2e",
    accent: "#9f7a1f",
    background: "#ffffff",
  },
  brand: {
    primaryColor: "#0f3d2e",
    accentColor: "#9f7a1f",
    headingFont: "EB Garamond",
    bodyFont: "Inter",
    headerLayout: "centered-minimal",
    footerLayout: "multi-column",
    backgroundKind: "solid",
    backgroundColor: "#ffffff",
    customCss: compose(
      buildThemeBlock({
        background: "#ffffff",
        foreground: "#0a0a0a",
        mutedForeground: "#525252",
        card: "#fafafa",
        cardForeground: "#0a0a0a",
        popover: "#ffffff",
        popoverForeground: "#0a0a0a",
        border: "#e5e5e5",
        input: "#ffffff",
        secondary: "#f5f5f5",
        secondaryForeground: "#0a0a0a",
        primaryForeground: "#ffffff",
        accentForeground: "#0a0a0a",
        ring: "#0f3d2e",
      }),
      `
/* Quiet, library-quiet typography. Generous leading, classical sizes */
h1 { font-weight: 600; letter-spacing: -0.015em; line-height: 1.1; }
h2 { font-weight: 500; }
h3 { font-weight: 500; }
p { line-height: 1.7; }

/* Thin underline accent on h2 — like a classical chapter heading */
h2 { padding-bottom: 0.4rem; border-bottom: 1px solid var(--border); margin-bottom: 1.25rem; }

/* Tighter card chrome — minimal shadow, hairline border */
.rounded-md, .rounded-lg, .rounded-xl { border-radius: 6px !important; }
.bg-card { box-shadow: none; }

/* Primary button is restrained: filled but with a gold underline that
   appears on hover (subtle scholarly affordance) */
.bg-primary { border-radius: 2px !important; font-weight: 500; letter-spacing: 0.04em; text-transform: uppercase; font-size: 0.8em; }
.bg-primary:hover { box-shadow: inset 0 -2px 0 0 #9f7a1f; }
`,
    ),
  },
  nav: {
    builtInOrder: ["courses", "teachers", "blog", "store", "wall"],
  },
  homeSections: () => [
    {
      id: generatePortalId("sec"),
      kind: "hero",
      config: {
        eyebrow: "Est. 2024",
        headline: "An institute for serious learners.",
        subhead:
          "Multi-month programs that move the needle on careers. Mentored, examined, certified.",
        primaryCta: { label: "Browse programs", href: "/courses" },
        secondaryCta: { label: "About the institute", href: "/about" },
        alignment: "center",
      },
    },
    {
      id: generatePortalId("sec"),
      kind: "courses-grid",
      config: { heading: "Programs", mode: "all", limit: 9 },
    },
    {
      id: generatePortalId("sec"),
      kind: "faculty",
      config: { heading: "Faculty", members: "all", cardStyle: "compact" },
    },
    {
      id: generatePortalId("sec"),
      kind: "stats",
      config: {
        items: [
          { value: "2,400", label: "Graduates" },
          { value: "12", label: "Programs" },
          { value: "94%", label: "Job placement" },
        ],
      },
    },
    {
      id: generatePortalId("sec"),
      kind: "cta",
      config: {
        headline: "Applications now open.",
        subhead: "Next intake closes at the end of the month.",
        primaryCta: { label: "Apply", href: "/courses" },
      },
    },
  ],
}

// --- New opinionated templates -----------------------------------

const botanical: PortalTemplate = {
  id: "botanical",
  name: "Botanical",
  tagline: "Sage-green wellness portal with organic curves",
  description:
    "Soft sage palette, italic Cormorant headings, generous rounded corners. Designed for yoga, mindfulness, naturopathy, holistic practice — anywhere a calm, breathing layout matters more than urgency.",
  tags: ["Sage", "Wellness", "Soft", "Italic"],
  swatch: {
    primary: "#3f5d4a",
    accent: "#c89b6c",
    background: "#f4f1ea",
  },
  brand: {
    primaryColor: "#3f5d4a",
    accentColor: "#c89b6c",
    headingFont: "Cormorant Garamond",
    bodyFont: "Inter",
    headerLayout: "centered-minimal",
    footerLayout: "multi-column",
    backgroundKind: "gradient",
    backgroundGradient:
      "linear-gradient(180deg, #f6f3ec 0%, #ebe4d4 100%)",
    customCss: compose(
      buildThemeBlock({
        background: "#f4f1ea",
        foreground: "#2d3b32",
        mutedForeground: "#6b7866",
        card: "#fbf9f3",
        cardForeground: "#2d3b32",
        popover: "#fbf9f3",
        popoverForeground: "#2d3b32",
        border: "#d9d2bf",
        input: "#fbf9f3",
        secondary: "#ece5d2",
        secondaryForeground: "#3f5d4a",
        primaryForeground: "#f4f1ea",
        accentForeground: "#2d3b32",
        ring: "#3f5d4a",
      }),
      `
/* Soft, organic chrome */
.rounded-md { border-radius: 0.75rem !important; }
.rounded-lg, .rounded-xl { border-radius: 1.5rem !important; }
.bg-card { box-shadow: 0 1px 0 rgba(63,93,74,0.04); }

/* Italic display headings with a hand-set warmth */
h1 { font-weight: 500; font-style: italic; letter-spacing: -0.005em; }
h2 { font-weight: 500; font-style: italic; }
h1 em, h2 em { font-style: normal; }

/* Gentle primary button — pill shape, no shadow */
.bg-primary { border-radius: 9999px !important; font-weight: 500; padding-left: 1.25rem; padding-right: 1.25rem; }

/* Sage leaf accent on section headings (a thin ::before line) */
section h2::before {
  content: "";
  display: block;
  width: 36px;
  height: 2px;
  background: #c89b6c;
  margin: 0 auto 1rem;
  border-radius: 2px;
}
`,
    ),
  },
  nav: {
    builtInOrder: ["courses", "wall", "blog", "teachers", "store"],
    showWall: true,
  },
  homeSections: () => [
    {
      id: generatePortalId("sec"),
      kind: "hero",
      config: {
        eyebrow: "Welcome, friend",
        headline: "A quieter way to learn.",
        subhead:
          "Live circles, recorded practices, and a community that moves at the speed of breath. Take a seat — no rush.",
        primaryCta: { label: "Explore practices", href: "/courses" },
        secondaryCta: { label: "Meet Your instructor", href: "/instructors" },
        alignment: "center",
      },
    },
    {
      id: generatePortalId("sec"),
      kind: "features",
      config: {
        heading: "What you'll find here",
        items: [
          { title: "Daily 10-minute sits", body: "Bite-size practices for the in-between moments." },
          { title: "Live monthly circles", body: "Show up, sit together, sip tea afterwards." },
          { title: "Library of recordings", body: "Drop in any time — your seat is always saved." },
        ],
      },
    },
    {
      id: generatePortalId("sec"),
      kind: "courses-grid",
      config: { heading: "Current offerings", mode: "all", limit: 6 },
    },
    {
      id: generatePortalId("sec"),
      kind: "testimonials",
      config: { heading: "From the community", source: "featured", layout: "grid" },
    },
    {
      id: generatePortalId("sec"),
      kind: "cta",
      config: {
        headline: "Begin where you are.",
        subhead: "No level requirements, no streak counters. Just practice.",
        primaryCta: { label: "Start a practice", href: "/courses" },
      },
    },
  ],
}

const brutalist: PortalTemplate = {
  id: "brutalist",
  name: "Brutalist",
  tagline: "Loud, sharp, in-your-face design school energy",
  description:
    "Pure black, neon yellow, zero rounded corners, hard shadows, oversize Manrope shouting at the viewer. For design programs, type-foundries, anyone who wants the portal itself to be the marketing.",
  tags: ["Bold", "Sharp", "Design"],
  swatch: {
    primary: "#000000",
    accent: "#facc15",
    background: "#facc15",
  },
  brand: {
    primaryColor: "#000000",
    accentColor: "#facc15",
    headingFont: "Manrope",
    bodyFont: "Inter",
    headerLayout: "split-classic",
    footerLayout: "compact-mono",
    backgroundKind: "solid",
    backgroundColor: "#facc15",
    customCss: compose(
      buildThemeBlock({
        background: "#facc15",
        foreground: "#000000",
        mutedForeground: "#1f1f1f",
        card: "#ffffff",
        cardForeground: "#000000",
        popover: "#ffffff",
        popoverForeground: "#000000",
        border: "#000000",
        input: "#ffffff",
        secondary: "#000000",
        secondaryForeground: "#facc15",
        primaryForeground: "#facc15",
        accentForeground: "#000000",
        ring: "#000000",
      }),
      `
/* No rounded corners. No soft edges. Hard shadows. */
* { border-radius: 0 !important; }
.bg-card, .bg-popover { border: 3px solid #000 !important; box-shadow: 8px 8px 0 0 #000 !important; }
button, .bg-primary { border: 3px solid #000 !important; box-shadow: 6px 6px 0 0 #000 !important; font-weight: 800 !important; letter-spacing: 0.02em; text-transform: uppercase; font-size: 0.85em; }
button:hover, .bg-primary:hover { transform: translate(2px, 2px); box-shadow: 4px 4px 0 0 #000 !important; }
button:active, .bg-primary:active { transform: translate(6px, 6px); box-shadow: 0 0 0 0 #000 !important; }

/* Oversize, screaming headlines */
h1 { font-weight: 900 !important; letter-spacing: -0.04em; line-height: 0.9; font-size: clamp(3rem, 8vw, 6rem) !important; }
h2 { font-weight: 900 !important; letter-spacing: -0.03em; text-transform: uppercase; }
h3 { font-weight: 800 !important; text-transform: uppercase; letter-spacing: 0.02em; font-size: 1rem; }

/* Thick black underline for inline links. Mirrors the buildThemeBlock
   anchor scope: text-only, not a button, and not inside the chrome
   regions (nav / header / footer have their own link treatment). */
a:not(:has(*)):not([data-slot="button"]):not(nav *):not(header *):not(footer *) { font-weight: 700; text-decoration: underline; text-decoration-thickness: 2px; text-underline-offset: 4px; }
`,
    ),
  },
  nav: {
    builtInOrder: ["courses", "wall", "store", "teachers", "blog"],
    showWall: true,
  },
  homeSections: () => [
    {
      id: generatePortalId("sec"),
      kind: "hero",
      config: {
        eyebrow: "Now enrolling",
        headline: "MAKE LOUDER WORK.",
        subhead:
          "Type, identity, motion, packaging. Six-week intensives for designers who want their portfolio to actually say something.",
        primaryCta: { label: "See the syllabi", href: "/courses" },
        secondaryCta: { label: "About the school", href: "/about" },
        alignment: "left",
      },
    },
    {
      id: generatePortalId("sec"),
      kind: "stats",
      config: {
        items: [
          { value: "600+", label: "Designers shipped" },
          { value: "6 wks", label: "Per intensive" },
          { value: "1:1", label: "Critique with the teacher" },
        ],
      },
    },
    {
      id: generatePortalId("sec"),
      kind: "courses-grid",
      config: { heading: "INTENSIVES", mode: "all", limit: 6 },
    },
    {
      id: generatePortalId("sec"),
      kind: "testimonials",
      config: { heading: "FORMER STUDENTS", source: "featured", layout: "grid" },
    },
    {
      id: generatePortalId("sec"),
      kind: "cta",
      config: {
        headline: "DOORS CLOSE FRIDAY.",
        subhead: "Limited to 24 designers per intensive.",
        primaryCta: { label: "APPLY", href: "/courses" },
      },
    },
  ],
}

const midnight: PortalTemplate = {
  id: "midnight",
  name: "Midnight Library",
  tagline: "Premium navy + gold — for serious, expensive programs",
  description:
    "Deep navy night sky, brushed-gold headings, EB Garamond serif. Built for premium executive courses, certifications, and institutes that want \"this is worth the money\" to be the first impression.",
  tags: ["Navy", "Gold", "Premium"],
  swatch: {
    primary: "#c5a572",
    accent: "#fbbf24",
    background: "#0f172a",
  },
  brand: {
    primaryColor: "#c5a572",
    accentColor: "#fbbf24",
    headingFont: "EB Garamond",
    bodyFont: "Inter",
    headerLayout: "centered-minimal",
    footerLayout: "multi-column",
    backgroundKind: "gradient",
    backgroundGradient:
      "radial-gradient(1400px 700px at 50% -20%, #1e293b 0%, #0f172a 60%, #020617 100%)",
    customCss: compose(
      buildThemeBlock({
        background: "#0f172a",
        foreground: "#f5f3ee",
        mutedForeground: "#a8a29e",
        card: "rgba(15,23,42,0.7)",
        cardForeground: "#f5f3ee",
        popover: "#0f172a",
        popoverForeground: "#f5f3ee",
        border: "rgba(197,165,114,0.25)",
        input: "rgba(15,23,42,0.6)",
        secondary: "rgba(197,165,114,0.1)",
        secondaryForeground: "#f5f3ee",
        primaryForeground: "#0f172a",
        accentForeground: "#0f172a",
        ring: "#c5a572",
      }),
      `
/* Premium chrome — glassy cards with a gold hairline */
.bg-card {
  backdrop-filter: blur(14px) saturate(120%);
  -webkit-backdrop-filter: blur(14px) saturate(120%);
  background-image: linear-gradient(180deg, rgba(30,41,59,0.55), rgba(15,23,42,0.75));
  border: 1px solid rgba(197,165,114,0.18) !important;
}
.rounded-md, .rounded-lg, .rounded-xl { border-radius: 0.4rem !important; }

/* Headings: gold gradient text — like a leather-bound spine */
h1, h2 {
  background: linear-gradient(135deg, #f3e3b5 0%, #c5a572 60%, #8a6d3f 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  font-weight: 500;
  letter-spacing: -0.01em;
}
h3 { color: #c5a572; font-weight: 500; }

/* Buttons: dark with gold trim */
.bg-primary {
  background: linear-gradient(180deg, #c5a572 0%, #a88456 100%) !important;
  color: #0f172a !important;
  font-weight: 600;
  box-shadow: 0 8px 24px -8px rgba(197,165,114,0.5);
  letter-spacing: 0.02em;
}
.bg-primary:hover { box-shadow: 0 12px 28px -8px rgba(197,165,114,0.7); }

/* Outlined / ghost buttons get a gold border */
button[class*="border"] { border-color: rgba(197,165,114,0.4) !important; color: #c5a572; }

/* Section dividers are gold hairlines */
hr, .border-t, .border-b { border-color: rgba(197,165,114,0.2) !important; }
`,
    ),
  },
  nav: {
    builtInOrder: ["courses", "teachers", "blog", "store", "wall"],
  },
  homeSections: () => [
    {
      id: generatePortalId("sec"),
      kind: "hero",
      config: {
        eyebrow: "By application",
        headline: "An education worth the time.",
        subhead:
          "Executive programs that move careers. Limited intake, in-depth mentorship, and a peer cohort that stays with you for life.",
        primaryCta: { label: "Begin application", href: "/courses" },
        secondaryCta: { label: "Read the prospectus", href: "/about" },
        alignment: "center",
      },
    },
    {
      id: generatePortalId("sec"),
      kind: "stats",
      config: {
        items: [
          { value: "1,200", label: "Alumni" },
          { value: "94%", label: "Promotion within 12 months" },
          { value: "1:8", label: "Mentor-to-student ratio" },
        ],
      },
    },
    {
      id: generatePortalId("sec"),
      kind: "courses-grid",
      config: { heading: "Current programs", mode: "all", limit: 6 },
    },
    {
      id: generatePortalId("sec"),
      kind: "faculty",
      config: { heading: "The faculty", members: "all", cardStyle: "compact" },
    },
    {
      id: generatePortalId("sec"),
      kind: "testimonials",
      config: { heading: "From past cohorts", source: "featured", layout: "grid" },
    },
    {
      id: generatePortalId("sec"),
      kind: "cta",
      config: {
        headline: "Applications close at month-end.",
        subhead: "Limited to 30 admits per cohort.",
        primaryCta: { label: "Apply", href: "/courses" },
      },
    },
  ],
}

export const PORTAL_TEMPLATES: PortalTemplate[] = [
  editorial, studio, bootcamp, scholar, botanical, brutalist, midnight,
]

// Brand fields owned by templates. When switching templates, anything
// in this list gets RESET to undefined before applying the new
// template's brand — otherwise a custom-css escape hatch from one
// template (e.g. Studio's dark-mode override) leaks into the next
// template and breaks its text contrast. User-authored fields like
// logoUrl / faviconUrl / siteName / tagline / customFonts are kept.
const TEMPLATE_CONTROLLED_BRAND_FIELDS: (keyof PortalBrand)[] = [
  "primaryColor",
  "accentColor",
  "headingFont",
  "bodyFont",
  "headerLayout",
  "footerLayout",
  "backgroundKind",
  "backgroundColor",
  "backgroundGradient",
  "backgroundImageUrl",
  "backgroundOpacity",
  "customCss",
]

// "Live" template resolution: if a tenant has an active template,
// merge the LATEST template definition's template-controlled brand
// fields on top of the saved brand. Lets us ship template fixes /
// upgrades that take effect without forcing every tenant to re-apply.
//
// Logo, favicon, site name, tagline and custom fonts (user data) are
// preserved. Everything in TEMPLATE_CONTROLLED_BRAND_FIELDS is
// refreshed from the template if one is active.
export function resolveLiveBrand(
  brand: PortalBrand,
  activeTemplateId?: string,
): PortalBrand {
  if (!activeTemplateId) return brand
  const template = PORTAL_TEMPLATES.find((t) => t.id === activeTemplateId)
  if (!template) return brand
  const refreshed: PortalBrand = { ...brand }
  for (const k of TEMPLATE_CONTROLLED_BRAND_FIELDS) {
    const v = template.brand[k]
    if (v !== undefined) (refreshed as Record<string, unknown>)[k] = v
    else delete (refreshed as Record<string, unknown>)[k]
  }
  return refreshed
}

// Builds the patch a template applies to a tenant's PortalConfig.
// Template-owned brand fields are RESET before the template's values
// are layered on, so switching from a dark template to a light one
// doesn't leave dark-mode CSS overrides behind. User-data brand
// fields (logo, favicon, site name, tagline, uploaded fonts) survive.
// Nav and footer columns also merge so a teacher's CTAs / extra
// links don't get blown away by the template apply.
export function buildTemplatePatch(
  template: PortalTemplate,
  currentConfig: PortalConfig,
): Partial<PortalConfig> {
  const clearedBrand: PortalBrand = { ...currentConfig.brand }
  for (const k of TEMPLATE_CONTROLLED_BRAND_FIELDS) {
    ;(clearedBrand as Record<string, unknown>)[k] = undefined
  }
  return {
    brand: { ...clearedBrand, ...template.brand },
    nav: { ...(currentConfig.nav ?? {}), ...(template.nav ?? {}) },
    footerColumns: template.footerColumns ?? currentConfig.footerColumns,
  }
}
