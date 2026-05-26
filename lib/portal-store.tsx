"use client"

// The Portal store. Owns every slice that drives the tenant's branded
// public website — pages, brand config, faculty, testimonials, blog,
// leads, and the per-page announcement bar + popups. Tenant-scoped via
// the same `thebigclass.t.${slug}.…` key convention used by lms-store.
//
// Persistence: localStorage with the same safeSetItem wrapper that
// surfaces QuotaExceededError on the storage-error bus, so a bad save
// shows the user a real toast instead of silently dropping.
//
// Why a separate store from lms-store: the portal is a strictly
// public-side concern (no enrollments, no quizzes). Keeping it separate
// keeps lms-store from ballooning further and lets the portal slice be
// loaded lazily in Phase 4 of the rollout when the page builder lands.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useRef,
  type ReactNode,
} from "react"
import { usePathname } from "next/navigation"
import { readCurrentTenantSlug, useTenant } from "./tenant-store"
import { reportStorageError } from "./storage-error"
import { pushToTrash, registerRestoreHandler } from "./trash"
import { mirrorSliceToServer } from "./tenant-state-sync"

// ============================================================
// Types
// ============================================================

export type SectionKind =
  | "hero"
  | "features"
  | "courses-grid"
  | "store-grid"
  | "testimonials"
  | "faculty"
  | "cta"
  | "rich-text"
  | "faq"
  | "stats"
  | "contact-form"
  | "blog-teaser"
  | "video"
  | "image-gallery"
  | "logos-strip"
  // Author-controlled trust badges. Replaces the hardcoded
  // "Secure payment · 30-day refund · Email support in 24h" row
  // that used to ship inside the Hero — teachers had no way to
  // change those claims to match their actual policy. Now it's a
  // configurable section the admin drops anywhere on the page
  // with editable icon + label pairs.
  | "trust-badges"

// Per-section config is intentionally a loose `Record<string, unknown>`
// rather than a discriminated union: each section renderer reads what it
// needs and shrugs off missing keys. Lets the data model evolve without
// breaking older saved pages, which matters because the editor will be
// shipping new section kinds over multiple releases.
export interface PortalSection {
  id: string
  kind: SectionKind
  config: Record<string, unknown>
  hidden?: boolean
}

export interface PortalPageSEO {
  title?: string         // <title> override; defaults to PortalPage.title
  description?: string   // <meta name="description">
  ogImage?: string       // social share image
  noindex?: boolean      // adds "noindex,nofollow" robots meta
  jsonLd?: string        // JSON+LD script content
}

export interface PortalPage {
  id: string
  // Path the page is mounted at. "/" = home, "/about", "/pricing", etc.
  // Unique within the tenant. The home page MUST exist; deletion of "/"
  // is blocked in the editor.
  slug: string
  title: string
  status: "draft" | "published"
  sections: PortalSection[]
  seo?: PortalPageSEO
  // Nav inclusion — when true, the header renders a link to this page
  // with `navLabel` (or title) in `navOrder` position.
  showInNav: boolean
  navLabel?: string
  navOrder?: number
  // Lets the editor know whether the page was authored from a template
  // (so "reset to template" makes sense) — purely informational.
  fromTemplate?: string
  // Soft-delete marker. Pages with `deletedAt` set are hidden from
  // the public portal AND from the default index, but live in a
  // dedicated Trash tab for 7 days where they can be restored or
  // permanently removed. A nightly job purges entries older than
  // the retention window — handled outside this store.
  deletedAt?: string
  createdAt: string
  updatedAt: string
}

// ----- Brand / nav / footer / announcement / popups -----

export interface PortalCustomFont {
  family: string  // CSS font-family value
  url: string     // path to the uploaded .woff2/.woff/.ttf/.otf
}

export interface PortalBrand {
  logoUrl?: string
  faviconUrl?: string
  // Display name shown in the header next to the logo.
  siteName?: string
  tagline?: string
  primaryColor?: string   // hex; oklch derived in CSS layer
  accentColor?: string
  // White-label toggles. Hide the "Powered by The Big Class"
  // attribution in the portal footer. Available on every plan in
  // this repo (real production gates this behind a tier, but the
  // shape is the same). `hidePoweredBy` only hides the platform
  // attribution; `hideAttribution` is the harder-stop "remove
  // every platform-branded element from the public surface" flag
  // — kept separate so we can change one without the other.
  hidePoweredBy?: boolean
  hideAttribution?: boolean
  // Font picks — values are Google Fonts family names OR a family
  // listed in customFonts (matched by `family`).
  headingFont?: string
  bodyFont?: string
  // User-uploaded webfonts. Registered as @font-face on every portal
  // page so headingFont/bodyFont can reference them by name.
  customFonts?: PortalCustomFont[]
  // Layout style — picks from a small set of preset chrome variants
  // (see lib/portal-layout-presets.ts).
  headerLayout?: string   // e.g. "centered-minimal", "split-classic"
  footerLayout?: string   // e.g. "multi-column", "compact-mono"

  // Social share card. 1200x630 PNG/JPG used as the `og:image` for
  // every public portal page. Can be auto-generated from logo +
  // siteName + primary colour via the OgImageGenerator component on
  // the Brand page, or uploaded directly. Per-page SEO overrides can
  // still set their own; this is the workspace-wide fallback.
  ogImage?: string

  // Page background. Three mutually-exclusive options drive the
  // <body> of every /p/[tenant]/* page via the PortalThemeProvider.
  // Set only the keys you care about; PortalThemeProvider composes
  // a single `background:` shorthand in order: image > gradient > color.
  backgroundKind?: "default" | "solid" | "gradient" | "image"
  backgroundColor?: string       // CSS color (hex / oklch / rgb / etc)
  backgroundGradient?: string    // any CSS gradient (e.g. "linear-gradient(135deg, #fde68a, #fb7185)")
  backgroundImageUrl?: string    // remote or local image URL
  backgroundOpacity?: number     // 0-100, scrim opacity over image
  // Free-form CSS the teacher writes in the Brand → Custom CSS field.
  // Scoped to the portal root via `[data-portal-tenant="<slug>"]` so
  // it can't leak into the dashboard. Use at your own risk.
  customCss?: string
}

// Third-party analytics tags surfaced as a top-level field on PortalConfig
// (separate from brand because they're operations data, not visual).
export interface PortalAnalytics {
  // GA4 measurement id (G-XXXXXXXX). When set we inject the gtag.js
  // snippet on every public portal page.
  ga4MeasurementId?: string
  // Plausible domain (e.g. "acme.thebigclass.com"). We load the
  // standard plausible.io/js/script.js with the supplied data-domain.
  plausibleDomain?: string
  // Hotjar HJID + version (defaults to 6).
  hotjarId?: string
  hotjarVersion?: number
  // Open Meta Pixel id (Facebook Pixel).
  metaPixelId?: string
  // Bring-your-own snippet — raw <script>...</script> the teacher
  // pastes in. Injected verbatim in the <head>. Use sparingly.
  customHeadHtml?: string
}

export interface PortalSocials {
  twitter?: string
  linkedin?: string
  youtube?: string
  instagram?: string
  facebook?: string
  github?: string
  tiktok?: string
  email?: string
}

export interface PortalFooterColumn {
  id: string
  heading: string
  links: { label: string; href: string }[]
}

export interface PortalAnnouncementBar {
  enabled: boolean
  message: string
  cta?: { label: string; href: string }
  variant: "info" | "promo" | "warning"
  dismissable: boolean
  // How long a dismissal sticks. "session" = until the tab is closed;
  // "forever" = until the bar's message changes (we key the persisted
  // dismissal on a hash of the message so editing it shows it again).
  dismissPersists?: "session" | "forever"
}

export interface PortalPopup {
  id: string
  enabled: boolean
  title: string
  body: string                // rich-text HTML
  imageUrl?: string
  cta?: { label: string; href: string }
  trigger:
    | { type: "time"; afterSec: number }
    | { type: "exit-intent" }
    | { type: "scroll"; percent: number }
  frequency: "once-per-visit" | "once-per-day" | "always"
  // Restrict to specific page slugs. Empty = all pages.
  showOnPages?: string[]
  // Optional inline lead-capture form. When enabled, the popup
  // renders an embedded form instead of (or in addition to) the
  // standard CTA, and a submission writes through to the lead inbox.
  // Captured fields default to name+email; phone + message are
  // opt-in so a low-friction newsletter popup can keep itself tight.
  leadForm?: {
    enabled: boolean
    captureName: boolean
    captureEmail: boolean        // always recommended on; we still keep the flag for symmetry
    capturePhone: boolean
    captureMessage: boolean
    submitLabel: string          // "Get the guide" / "Book a call"
    successMessage: string       // shown in-popup after submit
  }
}

export interface PortalNavCta {
  label: string
  href: string
  // Visual weight on desktop. "primary" = solid filled button,
  // "secondary" = outlined.
  variant?: "primary" | "secondary"
}

export interface PortalNavConfig {
  // Curated list of nav links. When non-empty, REPLACES the
  // auto-generated nav from pages + built-in tiles. When empty (the
  // default), the header falls back to:
  //   pages.filter(showInNav) + built-in Courses/Instructors/Blog
  // controlled by showBuiltIns below.
  items?: { label: string; href: string }[]
  // Toggle visibility of the auto-included Courses / Instructors / Blog
  // links — useful when a teacher doesn't sell courses publicly, or
  // doesn't have a blog yet and wants to hide the empty link.
  showCourses?: boolean
  showTeachers?: boolean
  showBlog?: boolean
  showStore?: boolean
  // Surface the Wall of Love (student wins, testimonials, demo
  // videos) as a public page. Default false because not every
  // teacher curates a wall.
  showWall?: boolean
  // Custom order for the built-in destinations. Keys are the same
  // strings as the show* fields ("courses" | "teachers" | "store" |
  // "blog" | "wall"). When unset, falls back to insertion order.
  builtInOrder?: string[]
  // Up to two header CTAs (Enroll / Login / Book a call …). On
  // desktop they render to the right of nav; on mobile they appear in
  // the disclosure menu.
  primaryCta?: PortalNavCta
  secondaryCta?: PortalNavCta
}

export interface PortalConfig {
  brand: PortalBrand
  socials: PortalSocials
  // Legacy: appended to the end of the auto-built nav. Kept for
  // backwards-compat with tenants that set links here; the new
  // `nav.items` field is the preferred surface.
  headerExtraLinks?: { label: string; href: string }[]
  nav?: PortalNavConfig
  footerColumns: PortalFooterColumn[]
  footerCopyright?: string
  announcementBar: PortalAnnouncementBar
  popups: PortalPopup[]
  // Site-wide SEO defaults. Per-page overrides win.
  defaultSeo: PortalPageSEO
  // If true the portal is treated as a private staging site — robots.txt
  // disallows everything and pages emit `noindex`.
  privatePortal?: boolean
  // Third-party tags (GA4, Plausible, Hotjar, etc.) injected on every
  // public portal page. See PortalAnalytics for the shape.
  analytics?: PortalAnalytics
  // Multilingual portal config. Surfaced in /dashboard/portal/languages
  // so admins can turn the picker off entirely, pin a default locale,
  // pick which languages to expose, and override individual strings
  // without changing source code. Schema is intentionally additive —
  // existing tenants without this field fall back to the i18n built-in
  // defaults (English default, all "ready" Indian locales enabled).
  i18n?: PortalI18nConfig
  // When true, course reviews of 4 or 5 stars are auto-mirrored into
  // the testimonials store with status="pending" so the teacher can
  // review and feature without re-typing. Idempotent — the testimonial
  // is keyed by source review id and won't re-import after the
  // teacher rejects it.
  testimonialAutoImportFiveStar?: boolean
}

// Locale codes shipped by lib/i18n.tsx. Kept as a stringly-typed
// string array here (rather than `Locale[]`) to avoid a circular
// import — the i18n module imports from this store.
//
// TENANT ISOLATION: every field in this struct lives inside the
// per-tenant PortalConfig, which the store persists under a
// slug-scoped key (`tk(slug, "config")` → `thebigclass.t.<slug>.portal.config.v1`).
// Two tenants on the same browser/localStorage have separate
// PortalConfig blobs and therefore separate `overrides`. Tenant A's
// admin changing the Hindi translation of "Enroll Now" cannot
// affect tenant B's portal — different slug, different storage key,
// different React tree. If you ever move overrides to a shared
// store (e.g. a global translation cache), preserve this isolation
// or you'll leak one tenant's edits into another's portal.
export interface PortalI18nConfig {
  /** Master switch. When false, the language picker is hidden and
   *  the portal renders in `defaultLocale` only. */
  multilingualEnabled: boolean
  /** Locale code rendered on first paint (and when picker is off). */
  defaultLocale: string
  /** Which locales appear in the picker. Hidden locales can't be
   *  switched to even via a stored localStorage value. */
  enabledLocales: string[]
  /** Per-locale, per-key string overrides. Merged over the built-in
   *  dictionary so tenants can rebrand "Sign in" → "Log in" or
   *  translate a missing key without a code change. Shape:
   *  `{ [locale]: { [dictionaryKey]: "custom string" } }`.
   *
   *  Tenant-scoped — see the isolation note on the interface itself. */
  overrides?: Record<string, Record<string, string>>
}

// ----- Faculty -----

export interface PortalFacultyMember {
  id: string
  // If set, autopulls name/avatar/bio/socials from the matching User in
  // lms-store. Otherwise the fields below are authoritative.
  userId?: string
  name: string
  role?: string                  // "Head of Mathematics", "Guest Faculty"
  // Two-field bio split (mirrors the User model):
  //   bio   — short Bio (≤55 chars, plain text).
  //   about — long-form Tiptap HTML for the public profile.
  // Curated faculty entries override the linked User's fields, so
  // an admin can write a workspace-specific tagline + about
  // without touching the teacher's personal profile.
  bio?: string
  about?: string
  photo?: string
  coverImageUrl?: string
  socials?: PortalSocials
  // Custom URL-safe handle for /p/[tenant]/instructors/[handle].
  handle: string
  // Hand-picked subset of course IDs taught by this member.
  courseIds?: string[]
  expertise?: string[]           // tags for filtering on the faculty page
  featured?: boolean
  order?: number
}

// ----- Testimonials -----

export interface PortalTestimonial {
  id: string
  authorName: string
  authorRole?: string
  avatar?: string
  courseId?: string              // optional linkage to a course
  rating?: number                // 1–5; renders stars when set
  quote: string
  featured?: boolean
  source: "wall" | "manual" | "student-submission"
  // Direct attribution to a specific instructor. When set, the
  // public profile page for that instructor will surface this
  // testimonial in its "What students say" rail. Falls back to a
  // `course.instructor.id` join via `courseId` when this is unset.
  aboutInstructorId?: string
  createdAt: string
  // Moderation state. Absence / "published" means the testimonial
  // renders on the public surfaces (Wall of Love, page-builder
  // testimonial sections). "pending" means a student just submitted
  // it and the instructor hasn't reviewed yet — hidden from public.
  // "rejected" stays in the store so the same student can't re-
  // submit identical content silently, but is also hidden.
  status?: "published" | "pending" | "rejected"
  // Optional media attachment uploaded by the student. Each
  // submission can include ONE media file in addition to the quote.
  mediaUrl?: string
  mediaKind?: "image" | "video" | "audio" | "file"
  mediaFilename?: string
  // Audit fields populated when a student submits (so the teacher's
  // review screen knows who sent it without losing the public-facing
  // authorName, which may differ from the submitter's profile name).
  submittedByUserId?: string
  // Optional rejection reason — captured in the Reject dialog so the
  // teacher (or a follow-up reviewer) has context. Visible only to
  // admins; never rendered on the public surface.
  rejectionReason?: string
  // Reviewer attribution — who approved/rejected this.
  moderatedByUserId?: string
  moderatedAt?: string
  // Anti-spam — score from the public submission's heuristics check.
  // Caller decides what to do with it (auto-flag vs. auto-trash);
  // we persist it so subsequent reviewers can see the signal.
  spamScore?: number
}

// ----- Blog -----

export interface PortalBlogPost {
  id: string
  slug: string
  title: string
  excerpt?: string
  coverImage?: string
  // Tiptap HTML — shares the same .tiptap-content renderer everything
  // else uses, so the public read view inherits all the typography work.
  body: string
  authorId: string
  tags?: string[]
  categories?: string[]
  allowComments?: boolean
  allowLikes?: boolean
  allowSharing?: boolean
  status: "draft" | "published"
  publishedAt?: string
  // Optional schedule — when set, status="draft" + scheduledFor in
  // the future means the post should auto-publish at that timestamp.
  // A nightly cron flips status when scheduledFor <= now; until then
  // it shows as "Scheduled · <date>" in the dashboard list.
  scheduledFor?: string
  // Editor-pinned: shown at the top of the dashboard list AND on the
  // public blog index. Max 3 pinned posts (soft cap; the UI warns
  // past that).
  pinned?: boolean
  seo?: PortalPageSEO
  // Visitor-submitted comments stored on the post itself. Cheap and
  // tenant-scoped via the parent post's storage key — no separate
  // moderation queue needed for the POC.
  comments?: PortalBlogComment[]
  // Emoji-reaction tallies. Key is the emoji glyph, value is the
  // list of *visitor IDs* who reacted (so a visitor can toggle their
  // own reaction off without affecting anyone else's count). Visitor
  // ID is a stable random string in localStorage keyed per-browser.
  reactions?: Record<string, string[]>
  // Admin moderation marker — when the instructor visited the
  // moderation queue last. Comments newer than this are "unread"
  // and drive the sidebar badge.
  lastCommentsReviewedAt?: string
  createdAt: string
  updatedAt: string
}

// Emoji set we surface in the reactions widget. Curated so the row
// reads as "useful signal" not "infinite emoji picker" — same six
// you'd find in any modern reactions UI.
export const BLOG_REACTION_EMOJIS = ["👍", "❤️", "🎉", "💡", "🔥", "👀"] as const
export type BlogReactionEmoji = typeof BLOG_REACTION_EMOJIS[number]

export interface PortalBlogComment {
  id: string
  // What the visitor typed. Plain text — we render with whitespace
  // preserved but no HTML so comments can't inject scripts.
  body: string
  authorName: string
  authorEmail?: string
  // ISO timestamp; rendered as relative ("3 days ago") in the UI.
  createdAt: string
  // Reserved for moderation: hide a comment without deleting it.
  hidden?: boolean
  // Optional parent for threaded replies. Empty = top-level comment.
  parentId?: string
}

// ----- Leads -----

export type LeadStatus = "new" | "contacted" | "qualified" | "archived"

// Lead temperature — set by the admin when triaging the inbox. Different
// from `status` (which is workflow state) — priority is judgement state.
// A "hot" lead can be in any status; a contacted lead can still be cold.
export type LeadPriority = "hot" | "warm" | "cold"

export interface PortalLead {
  id: string
  formId: string                 // "contact", "popup-newsletter", custom
  pageSlug: string               // which page captured this
  name?: string
  email: string
  phone?: string
  message?: string
  // Any extra form fields not in the canonical set go here.
  fields?: Record<string, string>
  source?: string                // referrer, UTM, etc.
  status: LeadStatus
  // Triage flags — all optional so old leads (no flags set) keep working.
  // The leads page surfaces these as inline controls so triage is
  // possible without opening the detail dialog.
  priority?: LeadPriority
  starred?: boolean              // manual "important" flag
  tags?: string[]                // free-form admin tags
  notes?: string
  createdAt: string
  updatedAt?: string             // bumped any time status / flags / notes change
}

// ============================================================
// Defaults
// ============================================================

const DEFAULT_ANNOUNCEMENT: PortalAnnouncementBar = {
  enabled: false,
  message: "",
  variant: "info",
  dismissable: true,
  dismissPersists: "session",
}

// Real links by default. Earlier this was empty headings with no items,
// which made every fresh footer look broken. The "Legal" column points
// at /privacy /terms etc.; the user spins those pages up from the
// Pages editor (a single click via the "Add legal pages" preset).
const DEFAULT_FOOTER_COLUMNS: PortalFooterColumn[] = [
  {
    id: "col-explore",
    heading: "Explore",
    links: [
      { label: "Courses", href: "/courses" },
      { label: "Instructors", href: "/instructors" },
      { label: "Blog", href: "/blog" },
      { label: "About", href: "/about" },
    ],
  },
  {
    id: "col-company",
    heading: "Company",
    links: [
      { label: "Contact", href: "/contact" },
    ],
  },
  {
    id: "col-legal",
    heading: "Legal",
    links: [
      { label: "Privacy", href: "/privacy" },
      { label: "Terms", href: "/terms" },
    ],
  },
]

// The 10 Indian-language codes lib/i18n.tsx ships with real
// translations for. Mirror them here as plain strings so this file
// avoids a circular import on the i18n module.
const DEFAULT_ENABLED_LOCALES = [
  "en", "hi", "bn", "ta", "te", "mr", "gu", "kn", "ml", "pa",
]

export const DEFAULT_I18N_CONFIG: PortalI18nConfig = {
  multilingualEnabled: true,
  defaultLocale: "en",
  enabledLocales: DEFAULT_ENABLED_LOCALES,
  overrides: {},
}

export const DEFAULT_PORTAL_CONFIG: PortalConfig = {
  brand: {},
  socials: {},
  footerColumns: DEFAULT_FOOTER_COLUMNS,
  announcementBar: DEFAULT_ANNOUNCEMENT,
  popups: [],
  defaultSeo: {},
  i18n: DEFAULT_I18N_CONFIG,
}

// Starter sections for a brand-new tenant's home page — gets them to
// "this looks like a real site" the first time they open the editor,
// without forcing them through a wizard.
function defaultHomeSections(): PortalSection[] {
  return [
    {
      id: genId("sec"),
      kind: "hero",
      config: {
        eyebrow: "Welcome",
        headline: "Learn from a teacher who's done it before",
        subhead:
          "Practical, taught-live, and proven by hundreds of students. Pick a course below to get started.",
        primaryCta: { label: "Browse courses", href: "/courses" },
        secondaryCta: { label: "Meet Your instructor", href: "/instructors" },
        alignment: "center",
      },
    },
    {
      id: genId("sec"),
      kind: "features",
      config: {
        heading: "Why learn here",
        items: [
          { title: "Real-world projects", body: "Every course ends with something you can show off." },
          { title: "Live Q&A", body: "Drop into office hours — no chatbot, no canned answers." },
          { title: "Lifetime access", body: "Buy once, revisit forever as the material updates." },
        ],
      },
    },
    {
      id: genId("sec"),
      kind: "courses-grid",
      config: { heading: "Popular courses", mode: "popular", limit: 6 },
    },
    {
      id: genId("sec"),
      kind: "testimonials",
      config: { heading: "What students say", source: "featured", layout: "grid" },
    },
    {
      id: genId("sec"),
      kind: "cta",
      config: {
        headline: "Ready to start?",
        subhead: "Join the next cohort or self-pace through a course at your own speed.",
        primaryCta: { label: "Get started", href: "/courses" },
      },
    },
  ]
}

function defaultAboutSections(): PortalSection[] {
  return [
    {
      id: genId("sec"),
      kind: "hero",
      config: {
        eyebrow: "About",
        headline: "Our story",
        subhead: "Edit this section to tell visitors who you are and what you're building.",
        alignment: "center",
      },
    },
    {
      id: genId("sec"),
      kind: "rich-text",
      config: {
        html: "<p>Tell your story here. Where did you start? What do you teach? Who are your students?</p>",
      },
    },
    {
      id: genId("sec"),
      kind: "faculty",
      config: { heading: "Meet the team", members: "all" },
    },
    {
      id: genId("sec"),
      kind: "stats",
      config: {
        items: [
          { value: "10k+", label: "Students taught" },
          { value: "120+", label: "Hours of content" },
          { value: "4.8★", label: "Average rating" },
        ],
      },
    },
  ]
}

function defaultContactSections(): PortalSection[] {
  return [
    {
      id: genId("sec"),
      kind: "hero",
      config: {
        eyebrow: "Get in touch",
        headline: "Let's talk",
        subhead: "Questions about a course, custom training, or partnerships? Send a note.",
        alignment: "center",
      },
    },
    {
      id: genId("sec"),
      kind: "contact-form",
      config: {
        heading: "Send a message",
        fields: ["name", "email", "phone", "message"],
        successMessage: "Thanks — we'll get back to you within a business day.",
      },
    },
  ]
}

function defaultPages(): PortalPage[] {
  const now = new Date().toISOString()
  return [
    {
      id: genId("page"),
      slug: "/",
      title: "Home",
      status: "published",
      sections: defaultHomeSections(),
      showInNav: false,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: genId("page"),
      slug: "/about",
      title: "About",
      status: "published",
      sections: defaultAboutSections(),
      showInNav: true,
      navLabel: "About",
      navOrder: 1,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: genId("page"),
      slug: "/contact",
      title: "Contact",
      status: "published",
      sections: defaultContactSections(),
      showInNav: true,
      navLabel: "Contact",
      navOrder: 4,
      createdAt: now,
      updatedAt: now,
    },
  ]
}

// ============================================================
// Persistence
// ============================================================

const KEY_SUFFIXES = {
  config: "portal.config.v1",
  pages: "portal.pages.v1",
  faculty: "portal.faculty.v1",
  testimonials: "portal.testimonials.v1",
  posts: "portal.posts.v1",
  leads: "portal.leads.v1",
  // "Live" mirrors of the editor surfaces — these are what the public
  // /p/[tenant] site reads. Dashboard edits write to the draft keys
  // above; clicking "Publish changes" copies draft → live atomically.
  // Existing tenants are seeded by the migration in hydrate(): first
  // load with no live.* key copies the draft state across so nothing
  // visibly changes after this rollout.
  liveConfig: "portal.live.config.v1",
  livePages: "portal.live.pages.v1",
  liveFaculty: "portal.live.faculty.v1",
  liveTestimonials: "portal.live.testimonials.v1",
  livePosts: "portal.live.posts.v1",
  // History of published snapshots, newest first. Trimmed to the last
  // 3 months on every publish (`PortalVersion[]`).
  versions: "portal.versions.v1",
  // Timestamps used to decide whether the draft is ahead of live, so
  // we don't have to deep-compare two huge JSON blobs.
  lastEditedAt: "portal.lastEditedAt.v1",
  lastPublishedAt: "portal.lastPublishedAt.v1",
} as const

type KeyName = keyof typeof KEY_SUFFIXES

// THIS IS THE SINGLE CHOKEPOINT FOR TENANT ISOLATION on the portal
// store. Every read + write goes through loadJSON / saveJSON which
// build the key via tk(slug, name). Two tenants on the same browser
// have non-overlapping keys (different slug prefix), so tenant A's
// translation overrides, pages, brand, etc. can NEVER reach tenant
// B's portal. If you add a new persistence path that bypasses this
// helper, you're going to leak data across tenants — don't.
function tk(slug: string, name: KeyName): string {
  return `thebigclass.t.${slug}.${KEY_SUFFIXES[name]}`
}

function loadJSON<T>(slug: string, name: KeyName, fallback: T): T {
  if (typeof window === "undefined") return fallback
  try {
    const raw = window.localStorage.getItem(tk(slug, name))
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function saveJSON(slug: string, name: KeyName, value: unknown): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(tk(slug, name), JSON.stringify(value))
  } catch (err) {
    reportStorageError(`portal.${name}`, err)
  }
  // Mirror to the server so a different browser / incognito session
  // visiting the same tenant sees the same brand + pages. Coalesced/debounced
  // in a single transactional bulk save to prevent database lockups.
  mirrorSliceToServer(slug, KEY_SUFFIXES[name], value)
}


// Pull the server-stored portal blob for this tenant and write each
// key into localStorage. Called once on hydrate so a fresh browser /
// incognito session sees the same portal as the editing browser. The
// per-key timestamps ensure we don't clobber unsaved edits made in
// this browser if the server is behind.
async function pullServerBlob(slug: string): Promise<void> {
  if (typeof window === "undefined") return

  // Snapshot localStorage BEFORE the async fetch so we can detect whether
  // the user edited a key while the network round-trip was in flight. If
  // they did, we must not overwrite their fresh value with stale server data.
  const preSnapshot = new Map<string, string | null>()
  for (const name of Object.keys(KEY_SUFFIXES) as KeyName[]) {
    const k = `thebigclass.t.${slug}.${KEY_SUFFIXES[name]}`
    preSnapshot.set(k, window.localStorage.getItem(k))
  }

  let serverState: Record<string, unknown> = {}
  let serverOk = false
  try {
    const res = await fetch(`/api/portal-state/${encodeURIComponent(slug)}`, {
      // No-store so the editing browser always sees the latest writes
      // after a publish, not a stale CDN cached blob.
      cache: "no-store",
    })
    if (res.ok) {
      const json = (await res.json()) as {
        ok?: boolean
        state?: Record<string, unknown>
      }
      if (json.ok && json.state) {
        serverState = json.state
        serverOk = true
      }
    }
  } catch {
    /* offline / dev backend down — fall back to whatever's in localStorage */
    return
  }
  if (!serverOk) return

  // Three-way sync between localStorage and the server blob, keyed by
  // each known portal suffix. The matrix:
  //   server-only      → write into localStorage (incognito visitor's
  //                      first paint becomes the right brand/pages)
  //   localStorage-only → upload to server (one-shot bootstrap for the
  //                      teacher whose data lived only locally before
  //                      the server store existed)
  //   both present     → server wins UNLESS the local value changed
  //                      during the fetch (user was editing while the
  //                      server was slow — keep the fresh local edit)
  //   neither          → leave defaults
  for (const name of Object.keys(KEY_SUFFIXES) as KeyName[]) {
    const suffix = KEY_SUFFIXES[name]
    const lsKey = `thebigclass.t.${slug}.${suffix}`
    const inServer = Object.prototype.hasOwnProperty.call(serverState, suffix)
    const lsRaw = window.localStorage.getItem(lsKey)
    if (inServer) {
      // Skip overwriting if the local value changed while we were fetching
      // (e.g. the user edited the Display Name while the server GET was in
      // flight). Their write is fresher than anything the server can return
      // from this request — the next autosave/publish will push it up.
      if (lsRaw !== preSnapshot.get(lsKey)) continue
      try {
        window.localStorage.setItem(lsKey, JSON.stringify(serverState[suffix]))
      } catch {
        /* quota — tolerable */
      }
    } else if (lsRaw) {
      // Promote local-only data to the server so other browsers can
      // see it. Fire-and-forget; if it fails we'll retry next save.
      let parsed: unknown
      try {
        parsed = JSON.parse(lsRaw)
      } catch {
        continue
      }
      void fetch(`/api/portal-state/${encodeURIComponent(slug)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: suffix, value: parsed }),
        keepalive: true,
      }).catch(() => {
        /* tolerable */
      })
    }
  }
}

function genId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`
}
export const generatePortalId = genId

// Best-effort URL-safe handle generator for new faculty members.
export function suggestHandle(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 40) || "teacher"
}

// ============================================================
// Context
// ============================================================

/**
 * One published snapshot of the entire portal surface. We keep the
 * last ~3 months of these so the creator can restore if they ship a
 * bad change. Trimmed on every publish.
 */
export interface PortalVersion {
  id: string
  /** Creator-supplied label, or auto-generated "Published at …". */
  label: string
  takenAt: string
  /** Frozen copy of all editor state at publish time. */
  snapshot: {
    config: PortalConfig
    pages: PortalPage[]
    faculty: PortalFacultyMember[]
    testimonials: PortalTestimonial[]
    posts: PortalBlogPost[]
  }
}

interface PortalContextValue {
  slug: string
  config: PortalConfig
  updateConfig: (patch: Partial<PortalConfig>) => void
  resetConfig: () => void

  pages: PortalPage[]
  getPage: (slug: string) => PortalPage | undefined
  upsertPage: (page: PortalPage) => void
  deletePage: (id: string) => void

  faculty: PortalFacultyMember[]
  getFacultyByHandle: (handle: string) => PortalFacultyMember | undefined
  upsertFaculty: (member: PortalFacultyMember) => void
  deleteFaculty: (id: string) => void

  testimonials: PortalTestimonial[]
  upsertTestimonial: (t: PortalTestimonial) => void
  deleteTestimonial: (id: string) => void

  posts: PortalBlogPost[]
  getPostBySlug: (slug: string) => PortalBlogPost | undefined
  addBlogComment: (postId: string, comment: PortalBlogComment) => void
  deleteBlogComment: (postId: string, commentId: string) => void
  setBlogCommentHidden: (postId: string, commentId: string, hidden: boolean) => void
  markBlogCommentsReviewed: (postId?: string) => void
  toggleBlogReaction: (postId: string, emoji: string, visitorId: string) => void
  upsertPost: (p: PortalBlogPost) => void
  deletePost: (id: string) => void

  leads: PortalLead[]
  addLead: (l: PortalLead) => void
  updateLead: (id: string, patch: Partial<PortalLead>) => void
  deleteLead: (id: string) => void

  // ─── Publishing ────────────────────────────────────────────────
  /** True when the draft has edits the public site doesn't have yet. */
  hasUnpublishedChanges: boolean
  /** ISO timestamp of the last publish. Null if never published. */
  lastPublishedAt: string | null
  /** Snapshot list (newest first), trimmed to ~3 months. */
  versions: PortalVersion[]
  /** Take a snapshot from current draft and push it live. */
  publishDraft: (label?: string) => PortalVersion
  /** Apply a version's snapshot to BOTH draft and live. */
  restoreVersion: (id: string) => void
  /** Permanently remove a version from the history. */
  deleteVersion: (id: string) => void
}

const PortalContext = createContext<PortalContextValue | null>(null)

export function PortalProvider({ children }: { children: ReactNode }) {
  const slug = readCurrentTenantSlug() || "default"
  const { currentTenant } = useTenant()
  const ownerEmail = currentTenant?.ownerEmail
  const pathname = usePathname()
  // Routes under /p/<tenant>/... are the public, customer-facing
  // portal. They should see the LIVE snapshot, not the editor draft.
  // Everywhere else (the dashboard) sees the draft so edits show up
  // immediately while the creator works.
  const publishedView = !!pathname?.startsWith("/p/")

  // Draft state — what the dashboard editor mutates.
  const [config, setConfig] = useState<PortalConfig>(DEFAULT_PORTAL_CONFIG)
  const [pages, setPages] = useState<PortalPage[]>([])
  const [faculty, setFaculty] = useState<PortalFacultyMember[]>([])
  const [testimonials, setTestimonials] = useState<PortalTestimonial[]>([])
  const [posts, setPosts] = useState<PortalBlogPost[]>([])
  const [leads, setLeads] = useState<PortalLead[]>([])
  // Live snapshot — what the public /p/<tenant> site reads. Seeded
  // from draft on first hydrate so existing tenants don't suddenly
  // serve empty content after this rollout.
  const [liveConfig, setLiveConfig] = useState<PortalConfig>(DEFAULT_PORTAL_CONFIG)
  const [livePages, setLivePages] = useState<PortalPage[]>([])
  const [liveFaculty, setLiveFaculty] = useState<PortalFacultyMember[]>([])
  const [liveTestimonials, setLiveTestimonials] = useState<PortalTestimonial[]>([])
  const [livePosts, setLivePosts] = useState<PortalBlogPost[]>([])
  const [versions, setVersions] = useState<PortalVersion[]>([])
  const [lastEditedAt, setLastEditedAt] = useState<string | null>(null)
  const [lastPublishedAt, setLastPublishedAt] = useState<string | null>(null)
  const [hydrated, setHydrated] = useState(false)

  // Hydrate everything for this tenant. Used both on mount and when a
  // `storage` event fires from another window/iframe on the same
  // origin — so the dashboard editing the brand and the public-portal
  // iframe showing the preview stay in sync without a page reload.
  // We must not trigger saveJSON immediately on hydrate, because that
  // would echo the server's snapshot straight back over the wire
  // (and overwrite the DB if it happened in Incognito). We skip
  // saving during the hydration window.
  const isHydrating = useRef(true)
  useEffect(() => {
    if (hydrated) {
      // Small timeout ensures the synchronous React render cycle
      // that flips hydrated=true completes without triggering effects.
      const timer = setTimeout(() => {
        isHydrating.current = false
      }, 50)
      return () => clearTimeout(timer)
    }
  }, [hydrated])

  const hydrate = useCallback(() => {
    const loaded = loadJSON<PortalConfig>(slug, "config", DEFAULT_PORTAL_CONFIG)
    // One-time language reset. Earlier dev iterations let users set
    // non-English defaults (e.g. Marathi-only) on a tenant and then
    // every new tenant inherited that state through the legacy
    // migration. This migration runs once per browser per tenant: if
    // the marker isn't set, force i18n back to DEFAULT_I18N_CONFIG
    // (English default, multilingual on, all locales enabled) and
    // stamp the marker so subsequent edits stick.
    const RESET_MARKER = `thebigclass.t.${slug}.i18n-reset.en-v1`
    const i18nFromStorage = loaded.i18n
    let i18n: PortalI18nConfig
    try {
      if (typeof window !== "undefined" && !window.localStorage.getItem(RESET_MARKER)) {
        i18n = DEFAULT_I18N_CONFIG
        window.localStorage.setItem(RESET_MARKER, "1")
      } else {
        i18n = { ...DEFAULT_I18N_CONFIG, ...(i18nFromStorage ?? {}) }
      }
    } catch {
      i18n = { ...DEFAULT_I18N_CONFIG, ...(i18nFromStorage ?? {}) }
    }
    const draftCfg: PortalConfig = {
      ...DEFAULT_PORTAL_CONFIG,
      ...loaded,
      brand: { ...DEFAULT_PORTAL_CONFIG.brand, ...(loaded.brand ?? {}) },
      socials: { ...DEFAULT_PORTAL_CONFIG.socials, ...(loaded.socials ?? {}) },
      announcementBar: {
        ...DEFAULT_ANNOUNCEMENT,
        ...(loaded.announcementBar ?? {}),
      },
      footerColumns: loaded.footerColumns ?? DEFAULT_FOOTER_COLUMNS,
      popups: loaded.popups ?? [],
      defaultSeo: loaded.defaultSeo ?? {},
      i18n,
    }
    setConfig(draftCfg)
    // Hydrate pages with a self-heal: if the saved pages array is
    // missing the "/" home page (which is what the earlier deletePage
    // bug caused), splice in the default home so the editor + public
    // site never end up in a broken "no home page" state.
    const ps = loadJSON<PortalPage[]>(slug, "pages", [])
    let draftPages: PortalPage[]
    if (ps.length === 0) {
      draftPages = defaultPages()
    } else if (!ps.some((p) => p.slug === "/")) {
      const seeded = defaultPages()
      const home = seeded.find((p) => p.slug === "/")
      draftPages = home ? [home, ...ps] : ps
    } else {
      draftPages = ps
    }
    setPages(draftPages)
    const draftFaculty = loadJSON<PortalFacultyMember[]>(slug, "faculty", [])
    const draftTestimonials = loadJSON<PortalTestimonial[]>(slug, "testimonials", [])
    const draftPosts = loadJSON<PortalBlogPost[]>(slug, "posts", [])
    setFaculty(draftFaculty)
    setTestimonials(draftTestimonials)
    setPosts(draftPosts)
    setLeads(loadJSON<PortalLead[]>(slug, "leads", []))

    // Live snapshot — only the explicitly published version is used here.
    // We no longer fall back to draft so that edits in the dashboard do
    // NOT appear on the public site until the user clicks "Publish changes".
    // Before a first publish the public site shows the default template;
    // after publish it shows the saved live snapshot.
    const liveCfgRaw = loadJSON<PortalConfig | null>(slug, "liveConfig", null)
    setLiveConfig(liveCfgRaw ?? { ...DEFAULT_PORTAL_CONFIG })
    const livePagesRaw = loadJSON<PortalPage[] | null>(slug, "livePages", null)
    setLivePages(livePagesRaw ?? defaultPages())
    const liveFacRaw = loadJSON<PortalFacultyMember[] | null>(slug, "liveFaculty", null)
    setLiveFaculty(liveFacRaw ?? [])
    const liveTestRaw = loadJSON<PortalTestimonial[] | null>(slug, "liveTestimonials", null)
    setLiveTestimonials(liveTestRaw ?? [])
    const livePostsRaw = loadJSON<PortalBlogPost[] | null>(slug, "livePosts", null)
    setLivePosts(livePostsRaw ?? [])

    // Versions, trimmed to the last 90 days. Anything older is dropped
    // here so a tenant returning after a long absence doesn't carry
    // years of stale snapshots.
    const cutoff = Date.now() - 90 * 24 * 60 * 60 * 1000
    const loadedVersions = loadJSON<PortalVersion[]>(slug, "versions", [])
    setVersions(
      loadedVersions
        .filter((v) => new Date(v.takenAt).getTime() >= cutoff)
        .sort((a, b) => b.takenAt.localeCompare(a.takenAt)),
    )
    setLastEditedAt(loadJSON<string | null>(slug, "lastEditedAt", null))
    setLastPublishedAt(loadJSON<string | null>(slug, "lastPublishedAt", null))
  }, [slug])

  // Initial hydrate. First paints from whatever's in localStorage
  // (instant, may be empty in a fresh browser), then asynchronously
  // pulls the server-stored blob for this tenant and re-hydrates.
  // That second pass is what makes the brand + pages visible in a
  // separate browser / incognito window that's never edited locally.
  useEffect(() => {
    hydrate()
    setHydrated(true)
    let cancelled = false
    void pullServerBlob(slug).then(() => {
      if (cancelled) return
      // Re-run the same hydrate path so all the state setters see the
      // newly-populated localStorage. Cheap — it's the same code that
      // runs on mount.
      hydrate()
    })
    return () => {
      cancelled = true
    }
  }, [hydrate, slug])

  // Cross-frame sync. The `storage` event fires in OTHER same-origin
  // windows (including iframes) when localStorage is written. We
  // listen for changes to keys under this tenant's prefix and re-load
  // the relevant slice. Without this, the dashboard's brand edits
  // wouldn't show up in the embedded `/p/[tenant]` preview until the
  // iframe was manually refreshed.
  useEffect(() => {
    const prefix = `thebigclass.t.${slug}.portal.`
    const onStorage = (e: StorageEvent) => {
      if (!e.key || !e.key.startsWith(prefix)) return
      hydrate()
    }
    window.addEventListener("storage", onStorage)
    return () => window.removeEventListener("storage", onStorage)
  }, [slug, hydrate])

  // One-shot migration: replace every `[YOUR-SUPPORT-EMAIL]` placeholder
  // in saved page content with the workspace owner email. Legal page
  // templates use that placeholder; older pages created before the
  // dialog substituted it on insert still carry the literal text.
  // Idempotent — once replaced the placeholder is gone, so this effect
  // is a no-op on subsequent renders.
  useEffect(() => {
    if (!hydrated || !ownerEmail || pages.length === 0) return
    const PLACEHOLDER = "[YOUR-SUPPORT-EMAIL]"
    let changed = false
    const next = pages.map((p) => {
      let pageChanged = false
      const sections = p.sections.map((s) => {
        const html = typeof s.config.html === "string" ? (s.config.html as string) : ""
        if (!html.includes(PLACEHOLDER)) return s
        pageChanged = true
        changed = true
        return {
          ...s,
          config: {
            ...s.config,
            html: html.split(PLACEHOLDER).join(ownerEmail),
          },
        }
      })
      return pageChanged ? { ...p, sections, updatedAt: new Date().toISOString() } : p
    })
    if (changed) setPages(next)
  }, [hydrated, ownerEmail, pages])

  // Persist draft state. The "unpublished changes" indicator is
  // driven by lastEditedAt, which is bumped explicitly inside each
  // mutation method (not from the save effects) so that the initial
  // hydrate flush doesn't falsely mark the workspace as dirty.
  const stampEdited = useCallback(() => {
    console.log("[PortalStore] stampEdited CALLED. hydrated:", hydrated, "slug:", slug)
    if (!hydrated) return
    const now = new Date().toISOString()
    console.log("[PortalStore] stampEdited setting lastEditedAt to:", now)
    setLastEditedAt(now)
    saveJSON(slug, "lastEditedAt", now)
  }, [hydrated, slug])

  // Persist draft state to localStorage + queue a debounced server mirror.
  // Guard: skip the write when the serialized value already matches what's
  // in localStorage — this prevents hydrate() from triggering redundant
  // saveJSON calls and server POSTs. (The isHydrating.current guard was
  // unreliable because React 18 batches state updates asynchronously, so
  // effects always ran after isHydrating was reset to false.)
  useEffect(() => {
    if (typeof window === "undefined" || !slug) return
    const next = JSON.stringify(config)
    if (window.localStorage.getItem(tk(slug, "config")) !== next) saveJSON(slug, "config", config)
  }, [slug, config])
  useEffect(() => {
    if (typeof window === "undefined" || !slug) return
    const next = JSON.stringify(pages)
    if (window.localStorage.getItem(tk(slug, "pages")) !== next) saveJSON(slug, "pages", pages)
  }, [slug, pages])
  useEffect(() => {
    if (typeof window === "undefined" || !slug) return
    const next = JSON.stringify(faculty)
    if (window.localStorage.getItem(tk(slug, "faculty")) !== next) saveJSON(slug, "faculty", faculty)
  }, [slug, faculty])
  useEffect(() => {
    if (typeof window === "undefined" || !slug) return
    const next = JSON.stringify(testimonials)
    if (window.localStorage.getItem(tk(slug, "testimonials")) !== next) saveJSON(slug, "testimonials", testimonials)
  }, [slug, testimonials])
  useEffect(() => {
    if (typeof window === "undefined" || !slug) return
    const next = JSON.stringify(posts)
    if (window.localStorage.getItem(tk(slug, "posts")) !== next) saveJSON(slug, "posts", posts)
  }, [slug, posts])
  useEffect(() => {
    if (typeof window === "undefined" || !slug) return
    const next = JSON.stringify(leads)
    if (window.localStorage.getItem(tk(slug, "leads")) !== next) saveJSON(slug, "leads", leads)
  }, [slug, leads])

  // ────────────────────────────────────────────────────────────────
  // Publishing.
  //
  // publishDraft  → snapshot the current draft → live; prepend a
  //                 `PortalVersion` to history; trim to ~3 months.
  // restoreVersion → overwrite both draft and live with a version's
  //                  snapshot; bump lastPublishedAt so the "Publish"
  //                  bar collapses again afterward.
  // deleteVersion  → remove a single version from history. Doesn't
  //                  touch live (you can't "unpublish a published
  //                  state" by deleting its history entry).
  // ────────────────────────────────────────────────────────────────

  const publishDraft = useCallback((label?: string): PortalVersion => {
    const now = new Date().toISOString()
    const snapshot = {
      config,
      pages,
      faculty,
      testimonials,
      posts,
    }
    const version: PortalVersion = {
      id: genId("ver"),
      label: label?.trim() || `Published ${new Date(now).toLocaleString()}`,
      takenAt: now,
      snapshot,
    }

    // Synchronously write live configurations to local storage & queue them for immediate bulk sync
    saveJSON(slug, "liveConfig", snapshot.config)
    saveJSON(slug, "livePages", snapshot.pages)
    saveJSON(slug, "liveFaculty", snapshot.faculty)
    saveJSON(slug, "liveTestimonials", snapshot.testimonials)
    saveJSON(slug, "livePosts", snapshot.posts)

    const cutoff = Date.now() - 90 * 24 * 60 * 60 * 1000
    const nextVersions = [version, ...versions].filter((v) => new Date(v.takenAt).getTime() >= cutoff)
    saveJSON(slug, "versions", nextVersions)
    saveJSON(slug, "lastPublishedAt", now)

    // Update React states for reactive UI rendering
    setLiveConfig(snapshot.config)
    setLivePages(snapshot.pages)
    setLiveFaculty(snapshot.faculty)
    setLiveTestimonials(snapshot.testimonials)
    setLivePosts(snapshot.posts)
    setVersions(nextVersions)
    setLastPublishedAt(now)

    return version
  }, [slug, config, pages, faculty, testimonials, posts, versions])

  const restoreVersion = useCallback((id: string) => {
    const v = versions.find((x) => x.id === id)
    if (!v) return

    const now = new Date().toISOString()

    // Synchronously write draft configurations to local storage & queue them for sync
    saveJSON(slug, "config", v.snapshot.config)
    saveJSON(slug, "pages", v.snapshot.pages)
    saveJSON(slug, "faculty", v.snapshot.faculty)
    saveJSON(slug, "testimonials", v.snapshot.testimonials)
    saveJSON(slug, "posts", v.snapshot.posts)
    saveJSON(slug, "lastEditedAt", now)

    // Synchronously write live configurations to local storage & queue them for sync
    saveJSON(slug, "liveConfig", v.snapshot.config)
    saveJSON(slug, "livePages", v.snapshot.pages)
    saveJSON(slug, "liveFaculty", v.snapshot.faculty)
    saveJSON(slug, "liveTestimonials", v.snapshot.testimonials)
    saveJSON(slug, "livePosts", v.snapshot.posts)
    saveJSON(slug, "lastPublishedAt", now)

    // Update React states for reactive UI rendering
    setConfig(v.snapshot.config)
    setPages(v.snapshot.pages)
    setFaculty(v.snapshot.faculty)
    setTestimonials(v.snapshot.testimonials)
    setPosts(v.snapshot.posts)
    setLiveConfig(v.snapshot.config)
    setLivePages(v.snapshot.pages)
    setLiveFaculty(v.snapshot.faculty)
    setLiveTestimonials(v.snapshot.testimonials)
    setLivePosts(v.snapshot.posts)
    setLastPublishedAt(now)
    setLastEditedAt(now)
  }, [slug, versions])

  const deleteVersion = useCallback((id: string) => {
    const nextVersions = versions.filter((v) => v.id !== id)
    saveJSON(slug, "versions", nextVersions)
    setVersions(nextVersions)
  }, [slug, versions])

  const hasUnpublishedChanges = useMemo(() => {
    // Compare draft and live snapshots to determine if there are unpublished changes.
    // Simple shallow checks for config and pages length; deep compare can be added if needed.
    if (!liveConfig || !livePages) return false;
    const configChanged = JSON.stringify(config) !== JSON.stringify(liveConfig);
    const pagesChanged = JSON.stringify(pages) !== JSON.stringify(livePages);
    const facultyChanged = JSON.stringify(faculty) !== JSON.stringify(liveFaculty);
    const testimonialsChanged = JSON.stringify(testimonials) !== JSON.stringify(liveTestimonials);
    const postsChanged = JSON.stringify(posts) !== JSON.stringify(livePosts);
    const anyChanged = configChanged || pagesChanged || facultyChanged || testimonialsChanged || postsChanged;
    console.log("[PortalStore] hasUnpublishedChanges computed:", anyChanged);
    return anyChanged;
  }, [config, pages, faculty, testimonials, posts, liveConfig, livePages, liveFaculty, liveTestimonials, livePosts]);

  const updateConfig = useCallback((patch: Partial<PortalConfig>) => {
    setConfig((prev) => ({ ...prev, ...patch }))
    stampEdited()
  }, [stampEdited])
  const resetConfig = useCallback(() => {
    setConfig(DEFAULT_PORTAL_CONFIG)
    stampEdited()
  }, [stampEdited])

  const getPage = useCallback(
    // Trashed pages (deletedAt set) are excluded from the public
    // resolver so a deleted slug 404s immediately — the Trash tab
    // in the dashboard is the only place they remain visible.
    (s: string) => pages.find((p) => p.slug === s && !p.deletedAt),
    [pages],
  )
  const upsertPage = useCallback((page: PortalPage) => {
    setPages((prev) => {
      const i = prev.findIndex((p) => p.id === page.id)
      const stamped = { ...page, updatedAt: new Date().toISOString() }
      if (i === -1) return [...prev, stamped]
      const next = prev.slice()
      next[i] = stamped
      return next
    })
    stampEdited()
  }, [stampEdited])
  const deletePage = useCallback((id: string) => {
    // Guard: never delete the home page (slug === "/"). Earlier this was
    // `filter(p => p.id !== id && p.slug !== "/")` which incorrectly
    // dropped the home page on EVERY delete because the filter kept
    // only pages that matched BOTH conditions.
    setPages((prev) => {
      const target = prev.find((p) => p.id === id && p.slug !== "/")
      if (target) {
        pushToTrash({
          id: target.id,
          kind: "portal-page",
          label: target.title || target.slug,
          sublabel: target.slug,
          payload: target,
        })
      }
      return prev.filter((p) => {
        if (p.slug === "/") return true
        return p.id !== id
      })
    })
    stampEdited()
  }, [stampEdited])

  const getFacultyByHandle = useCallback(
    (h: string) => faculty.find((m) => m.handle === h),
    [faculty],
  )
  const upsertFaculty = useCallback((m: PortalFacultyMember) => {
    setFaculty((prev) => {
      const i = prev.findIndex((x) => x.id === m.id)
      if (i === -1) return [...prev, m]
      const next = prev.slice()
      next[i] = m
      return next
    })
    stampEdited()
  }, [stampEdited])
  const deleteFaculty = useCallback((id: string) => {
    setFaculty((prev) => prev.filter((m) => m.id !== id))
    stampEdited()
  }, [stampEdited])

  const upsertTestimonial = useCallback((t: PortalTestimonial) => {
    setTestimonials((prev) => {
      const i = prev.findIndex((x) => x.id === t.id)
      if (i === -1) return [...prev, t]
      const next = prev.slice()
      next[i] = t
      return next
    })
    stampEdited()
  }, [stampEdited])
  const deleteTestimonial = useCallback((id: string) => {
    setTestimonials((prev) => prev.filter((t) => t.id !== id))
    stampEdited()
  }, [stampEdited])

  const getPostBySlug = useCallback(
    (s: string) => posts.find((p) => p.slug === s),
    [posts],
  )
  const upsertPost = useCallback((p: PortalBlogPost) => {
    setPosts((prev) => {
      const i = prev.findIndex((x) => x.id === p.id)
      const stamped = { ...p, updatedAt: new Date().toISOString() }
      if (i === -1) return [...prev, stamped]
      const next = prev.slice()
      next[i] = stamped
      return next
    })
    stampEdited()
  }, [stampEdited])
  const deletePost = useCallback((id: string) => {
    setPosts((prev) => {
      const target = prev.find((p) => p.id === id)
      if (target) {
        pushToTrash({
          id: target.id,
          kind: "blog-post",
          label: target.title || "Blog post",
          sublabel: target.slug,
          payload: target,
        })
      }
      return prev.filter((p) => p.id !== id)
    })
    stampEdited()
  }, [stampEdited])

  // Blog comments live on the post itself (PortalBlogPost.comments[])
  // so they're persisted with the rest of the blog state — no separate
  // collection or moderation queue. Newest first, capped at sane limit
  // to keep one post from blowing the localStorage budget.
  const addBlogComment = useCallback((postId: string, comment: PortalBlogComment) => {
    setPosts((prev) =>
      prev.map((p) =>
        p.id !== postId
          ? p
          : {
              ...p,
              comments: [comment, ...(p.comments ?? [])].slice(0, 500),
              updatedAt: new Date().toISOString(),
            },
      ),
    )
  }, [])
  const deleteBlogComment = useCallback((postId: string, commentId: string) => {
    setPosts((prev) =>
      prev.map((p) =>
        p.id !== postId
          ? p
          : {
              ...p,
              comments: (p.comments ?? []).filter((c) => c.id !== commentId),
              updatedAt: new Date().toISOString(),
            },
      ),
    )
  }, [])

  // Moderation: hide / unhide a comment without deleting it. Hidden
  // comments stay in the post's comments array but are filtered out
  // of the public render. Keeps an audit trail for the admin.
  const setBlogCommentHidden = useCallback((postId: string, commentId: string, hidden: boolean) => {
    setPosts((prev) =>
      prev.map((p) =>
        p.id !== postId
          ? p
          : {
              ...p,
              comments: (p.comments ?? []).map((c) =>
                c.id === commentId ? { ...c, hidden } : c,
              ),
              updatedAt: new Date().toISOString(),
            },
      ),
    )
  }, [])

  // Mark comments as reviewed — either for a specific post or for
  // every post when `postId` is omitted. The sidebar badge reads
  // `lastCommentsReviewedAt` to decide whether a comment is "new"
  // to the moderator.
  const markBlogCommentsReviewed = useCallback((postId?: string) => {
    const now = new Date().toISOString()
    setPosts((prev) =>
      prev.map((p) =>
        postId && p.id !== postId
          ? p
          : { ...p, lastCommentsReviewedAt: now, updatedAt: now },
      ),
    )
  }, [])

  // Toggle a visitor's emoji reaction on a post. Each emoji holds an
  // array of visitor IDs — same visitor tapping the same emoji again
  // removes their entry; tapping a different emoji adds a new entry.
  // This lets a single visitor express multiple distinct reactions
  // (👍 + ❤️) without conflicting counts.
  const toggleBlogReaction = useCallback((postId: string, emoji: string, visitorId: string) => {
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id !== postId) return p
        const current = p.reactions ?? {}
        const owners = current[emoji] ?? []
        const already = owners.includes(visitorId)
        const nextOwners = already
          ? owners.filter((id) => id !== visitorId)
          : [...owners, visitorId]
        const nextReactions = { ...current }
        if (nextOwners.length === 0) {
          delete nextReactions[emoji]
        } else {
          nextReactions[emoji] = nextOwners
        }
        return { ...p, reactions: nextReactions, updatedAt: new Date().toISOString() }
      }),
    )
  }, [])

  const addLead = useCallback((l: PortalLead) => {
    setLeads((prev) => [l, ...prev])
  }, [])
  const updateLead = useCallback((id: string, patch: Partial<PortalLead>) => {
    setLeads((prev) =>
      prev.map((l) =>
        l.id === id ? { ...l, ...patch, updatedAt: new Date().toISOString() } : l,
      ),
    )
  }, [])
  const deleteLead = useCallback((id: string) => {
    setLeads((prev) => prev.filter((l) => l.id !== id))
  }, [])

  // Trash restore — re-imports a soft-deleted page or blog post.
  useEffect(() => {
    return registerRestoreHandler(["portal-page", "blog-post"], (entry) => {
      if (entry.kind === "portal-page") {
        const p = entry.payload as PortalPage
        setPages(prev => prev.some(x => x.id === p.id) ? prev : [...prev, p])
        return true
      }
      if (entry.kind === "blog-post") {
        const p = entry.payload as PortalBlogPost
        setPosts(prev => prev.some(x => x.id === p.id) ? prev : [p, ...prev])
        return true
      }
      return false
    })
  }, [])

  // What the consumers actually see for portal content. The dashboard
  // sees draft state; everything under /p/<tenant> sees the live
  // snapshot. Helpers like getPage / getFacultyByHandle / getPostBySlug
  // need to follow the same view, so build them off the resolved set.
  const viewConfig = publishedView ? liveConfig : config
  const viewPages = publishedView ? livePages : pages
  const viewFaculty = publishedView ? liveFaculty : faculty
  const viewTestimonials = publishedView ? liveTestimonials : testimonials
  const viewPosts = publishedView ? livePosts : posts
  const getPageView = useCallback(
    (s: string) => viewPages.find((p) => p.slug === s),
    [viewPages],
  )
  const getFacultyByHandleView = useCallback(
    (h: string) => viewFaculty.find((f) => f.handle === h),
    [viewFaculty],
  )
  const getPostBySlugView = useCallback(
    (s: string) => viewPosts.find((p) => p.slug === s),
    [viewPosts],
  )

  const value = useMemo<PortalContextValue>(
    () => ({
      slug,
      config: viewConfig, updateConfig, resetConfig,
      pages: viewPages, getPage: getPageView, upsertPage, deletePage,
      faculty: viewFaculty, getFacultyByHandle: getFacultyByHandleView, upsertFaculty, deleteFaculty,
      testimonials: viewTestimonials, upsertTestimonial, deleteTestimonial,
      posts: viewPosts, getPostBySlug: getPostBySlugView, upsertPost, deletePost,
      addBlogComment, deleteBlogComment,
      setBlogCommentHidden, markBlogCommentsReviewed, toggleBlogReaction,
      leads, addLead, updateLead, deleteLead,
      hasUnpublishedChanges, lastPublishedAt, versions,
      publishDraft, restoreVersion, deleteVersion,
    }),
    [
      slug,
      viewConfig, updateConfig, resetConfig,
      viewPages, getPageView, upsertPage, deletePage,
      viewFaculty, getFacultyByHandleView, upsertFaculty, deleteFaculty,
      viewTestimonials, upsertTestimonial, deleteTestimonial,
      viewPosts, getPostBySlugView, upsertPost, deletePost,
      addBlogComment, deleteBlogComment,
      setBlogCommentHidden, markBlogCommentsReviewed, toggleBlogReaction,
      leads, addLead, updateLead, deleteLead,
      hasUnpublishedChanges, lastPublishedAt, versions,
      publishDraft, restoreVersion, deleteVersion,
    ],
  )

  return <PortalContext.Provider value={value}>{children}</PortalContext.Provider>
}

export function usePortal(): PortalContextValue {
  const ctx = useContext(PortalContext)
  if (!ctx) throw new Error("usePortal must be used inside <PortalProvider>")
  return ctx
}

// ============================================================
// Server-safe snapshot reader
// ============================================================
//
// Used by server components under /p/[tenant] to render meta tags and
// initial HTML. Right now this just returns sensible defaults — the
// real data lives in the client's localStorage, which a server can't
// read. When a backend lands, this is the single function that swaps
// from "return defaults" to "fetch from DB".

export interface PortalSnapshot {
  config: PortalConfig
  pages: PortalPage[]
  faculty: PortalFacultyMember[]
  testimonials: PortalTestimonial[]
  posts: PortalBlogPost[]
}

export function emptyPortalSnapshot(): PortalSnapshot {
  return {
    config: DEFAULT_PORTAL_CONFIG,
    pages: defaultPages(),
    faculty: [],
    testimonials: [],
    posts: [],
  }
}

export async function getServerPortalSnapshot(_tenant: string): Promise<PortalSnapshot> {
  // Placeholder. Returns the same defaults every tenant gets at first
  // open. The hydration on the client immediately replaces this with
  // whatever's in localStorage so users still see their saved content.
  return emptyPortalSnapshot()
}
