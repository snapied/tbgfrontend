// Portal page templates — starter blueprints surfaced in the empty
// state AND in the New Page dialog so a teacher's first action isn't
// "stare at a blank rich-text box".
//
// Each template ships:
//   • A `kind` label + emoji for the picker
//   • A `description` for the card
//   • A `slug` suggestion (the teacher can override)
//   • A list of `sections` that hydrate into PortalSection[] on
//     creation. We use the same `rich-text` section kind for every
//     content slot because the section editor handles HTML
//     uniformly; teachers can split into hero/CTA/etc. later via
//     the section picker.
//
// Adding a template:
//   • Push a new entry to PAGE_TEMPLATES.
//   • Keep `sections[]` minimal — visitors prefer to author from
//     the structure of a real example rather than a 12-section
//     wall of placeholder copy.

import type { PortalSection } from "@/lib/portal-store"
import { generatePortalId } from "@/lib/portal-store"

export interface PortalPageTemplate {
  /** Stable key — used by the picker grid + analytics. */
  key: string
  /** Card title. */
  title: string
  /** One-line preview. Be concrete: "What you get", not marketing copy. */
  description: string
  /** Default slug (with leading slash). Instructor can override on create. */
  defaultSlug: string
  /** Default page title (visible in tab bar + nav). */
  defaultTitle: string
  /** Emoji rendered on the picker card. */
  emoji: string
  /** Builder that returns the seed sections. We use a builder (not
   *  a constant) so each instantiation gets fresh IDs and the
   *  template can interpolate the page's title into the heading
   *  text. */
  build: (title: string) => PortalSection[]
}

const richText = (html: string): PortalSection => ({
  id: generatePortalId("sec"),
  kind: "rich-text",
  config: { html },
})

export const PAGE_TEMPLATES: PortalPageTemplate[] = [
  {
    key: "blank",
    title: "Blank page",
    description: "A single empty rich-text section. For when you want full control.",
    defaultSlug: "/new-page",
    defaultTitle: "New page",
    emoji: "📄",
    build: (title) => [
      richText(`<h1>${escapeHtml(title)}</h1><p>Tell visitors what this page is about.</p>`),
    ],
  },
  {
    key: "about",
    title: "About us",
    description: "Hero + mission + team + values + CTA. The standard about-page shape.",
    defaultSlug: "/about",
    defaultTitle: "About us",
    emoji: "👋",
    build: (title) => [
      richText(`<h1>${escapeHtml(title)}</h1><p class="lead">A one-line elevator pitch readers should know in the first 3 seconds.</p>`),
      richText(`<h2>Our mission</h2><p>Two sentences on the why. Keep it concrete and human — not "synergy" or "world-class".</p>`),
      richText(`<h2>Meet the team</h2><p>A photo + bio rail goes here. Tell us who's behind the work.</p>`),
      richText(`<h2>What we believe</h2><ul><li>Belief one — backed by something specific.</li><li>Belief two.</li><li>Belief three.</li></ul>`),
      richText(`<h2>Want to work with us?</h2><p>Add a primary CTA — book a call, see open courses, or get in touch.</p>`),
    ],
  },
  {
    key: "faq",
    title: "FAQ",
    description: "Question-and-answer scaffold pre-loaded with five common categories.",
    defaultSlug: "/faq",
    defaultTitle: "Frequently asked questions",
    emoji: "❓",
    build: (title) => [
      richText(`<h1>${escapeHtml(title)}</h1><p class="lead">Most-asked questions, answered in plain English.</p>`),
      richText(`<h2>About the courses</h2><h3>Who is this for?</h3><p>Answer in two sentences.</p><h3>How long does each course take?</h3><p>Specific. "Six weeks at ~4 hrs/week" beats "depends on you".</p>`),
      richText(`<h2>Payment & refunds</h2><h3>What's your refund policy?</h3><p>State the exact window in days, the eligibility criteria, the contact.</p><h3>Do you offer payment plans?</h3><p>Yes/no + how to ask.</p>`),
      richText(`<h2>Support</h2><h3>How fast do you reply?</h3><p>Set the expectation — "within 24 hours on weekdays".</p><h3>Can I talk to the instructor?</h3><p>Office hours, Q&A sessions, direct contact rules.</p>`),
      richText(`<h2>Certificates & outcomes</h2><h3>Do I get a certificate?</h3><p>Yes/no + what the certificate verifies.</p>`),
      richText(`<h2>Still curious?</h2><p>Email a real human — link or button to your support channel.</p>`),
    ],
  },
  {
    key: "sales-letter",
    title: "Sales letter",
    description: "Long-form sales page — promise, proof, objections, CTA. Built for conversion.",
    defaultSlug: "/offer",
    defaultTitle: "Your offer",
    emoji: "💼",
    build: (title) => [
      richText(`<h1>${escapeHtml(title)}</h1><p class="lead">A one-line promise. Specific. Outcome-focused. Time-bound.</p>`),
      richText(`<h2>Who this is for</h2><p>Name your reader in the first sentence. "If you're a high-school physics teacher who…"</p>`),
      richText(`<h2>The problem we keep seeing</h2><p>One paragraph about the pattern. Be specific to make readers nod.</p>`),
      richText(`<h2>What you'll walk away with</h2><ul><li>Outcome one — measurable.</li><li>Outcome two.</li><li>Outcome three.</li></ul>`),
      richText(`<h2>What you'll learn</h2><p>Module breakdown with one-line summaries.</p>`),
      richText(`<h2>Who's behind this</h2><p>Authority statement + photo. Make the buyer trust the seller.</p>`),
      richText(`<h2>What students are saying</h2><blockquote>Three short testimonials. Quote first, name second.</blockquote>`),
      richText(`<h2>Frequently asked</h2><p>Answer the top 3 objections preemptively.</p>`),
      richText(`<h2>Ready when you are</h2><p>Repeat the CTA. Time pressure if real. Price clarity.</p>`),
    ],
  },
  {
    key: "lead-magnet",
    title: "Lead magnet",
    description: "Free download landing page — promise, sample, email opt-in.",
    defaultSlug: "/free-guide",
    defaultTitle: "Free guide",
    emoji: "🎁",
    build: (title) => [
      richText(`<h1>${escapeHtml(title)}</h1><p class="lead">A one-line promise + who it's for.</p>`),
      richText(`<h2>What's inside</h2><ul><li>Section one — exact deliverable.</li><li>Section two.</li><li>Section three.</li></ul>`),
      richText(`<h2>Who wrote this</h2><p>Quick credibility line + photo.</p>`),
      richText(`<h2>Get the guide</h2><p>Email opt-in goes here. We'll send it instantly.</p>`),
    ],
  },
  {
    key: "coming-soon",
    title: "Coming soon",
    description: "Placeholder while you build — countdown, single CTA, sign-up for early access.",
    defaultSlug: "/coming-soon",
    defaultTitle: "Coming soon",
    emoji: "🚧",
    build: (title) => [
      richText(`<h1>${escapeHtml(title)}</h1><p class="lead">Something useful is on the way. Drop your email and we'll tell you first.</p>`),
      richText(`<h2>What to expect</h2><p>Two or three lines about what's coming. Date if you have one.</p>`),
      richText(`<h2>Get notified</h2><p>Email opt-in placeholder.</p>`),
    ],
  },
  {
    key: "contact",
    title: "Contact",
    description: "How-to-reach-us page — channels, hours, location, contact form spot.",
    defaultSlug: "/contact",
    defaultTitle: "Contact us",
    emoji: "✉️",
    build: (title) => [
      richText(`<h1>${escapeHtml(title)}</h1><p class="lead">The fastest way to reach us, with realistic response times.</p>`),
      richText(`<h2>Email us</h2><p>support@your-domain.com — we reply within 24 hrs on weekdays.</p>`),
      richText(`<h2>For students</h2><p>If you're enrolled in a course, post in your community first — it's faster.</p>`),
      richText(`<h2>For partnership & press</h2><p>partnerships@your-domain.com</p>`),
    ],
  },
]

export function getPageTemplate(key: string): PortalPageTemplate | undefined {
  return PAGE_TEMPLATES.find((t) => t.key === key)
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}
