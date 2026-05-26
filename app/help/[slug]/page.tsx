// Single-file help-article router.
//
// Every help topic listed in /help lives in the TOPICS map below.
// The page resolves the slug, renders the article, and 404s for
// unknown slugs. Keeping one file (rather than 17 individual
// page.tsx files) lets us refactor the article shape once, see
// every article side-by-side when copy-editing, and avoid
// path-mismatch typos between the index and the destination.
//
// When the catalogue gets larger or needs richer formatting
// (images, callouts, code blocks beyond the basics), we'll graduate
// to MDX. For the launch set, simple paragraph + bullet content
// keeps the surface honest.

import { notFound } from "next/navigation"
import Link from "next/link"
import { use } from "react"
import { ArrowLeft, ArrowRight } from "lucide-react"
import { Header } from "@/components/landing/header"
import { Footer } from "@/components/landing/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import type { Metadata } from "next"

// ---- Article shape ----
//
// Each article is title + lede + a series of sections. Sections
// are either paragraphs (one or more) or bullet lists.
type Section =
  | { kind: "p"; body: string }
  | { kind: "ul"; items: string[] }
  | { kind: "h2"; text: string }
  | { kind: "code"; lang?: string; body: string }
  | { kind: "callout"; tone: "info" | "warn"; body: string }

interface Article {
  title: string
  lede: string
  audience: "creator" | "learner" | "developer" | "admin"
  sections: Section[]
  related?: { slug: string; label: string }[]
  // SEO knobs — optional but recommended for every article we
  // actually want ranking. `keywords` becomes the meta keywords
  // tag + a hint for our internal search ranking; `updated` is
  // the ISO date we last edited the article and renders as a
  // visible "Last updated" line + a datePublished/dateModified
  // in the Article JSON-LD payload.
  keywords?: string[]
  updated?: string
}

const TOPICS: Record<string, Article> = {
  // ---------- For creators ----------
  faculty: {
    title: "Invite a faculty member",
    lede: "End-to-end invite flow. The recipient gets a welcoming email, sets a strong password, and lands inside your workspace dashboard.",
    audience: "creator",
    sections: [
      { kind: "h2", text: "Send the invite" },
      { kind: "p", body: "Open /dashboard/faculty and click Add faculty. Fill in name, email, WhatsApp, and role (instructor or admin). Add a short bio + social links if you want — they'll appear on the public instructor card." },
      { kind: "p", body: "Hit Add & send invite. We send the recipient a workspace-branded email (not a confusing 'reset your password' email) with a 7-day link." },
      { kind: "h2", text: "What the recipient sees" },
      { kind: "ul", items: [
        "An email titled '<you> invited you to <workspace>' — workspace-branded, not platform-branded.",
        "Clicking the link lands them on /p/<tenant>/accept-invite/<token> inside your portal.",
        "They pick a password (zxcvbn-validated, min strength 'good').",
        "We provision the user record in your workspace + sign them in.",
        "Instructors + admins land on /dashboard; students land on /p/<tenant>.",
      ]},
      { kind: "h2", text: "Multi-tenant teachers" },
      { kind: "p", body: "If the same email is already a faculty member at another workspace on the platform, we surface a soft notice — no duplicate account is created, but the recipient still has to opt in to your workspace. Each workspace keeps its own copy of the profile so changes here don't propagate sideways." },
      { kind: "callout", tone: "info", body: "Email is locked after invite. To change it, remove the faculty member and re-invite." },
    ],
    related: [
      { slug: "multi-faculty-courses", label: "Multi-faculty courses + per-module owners" },
      { slug: "onboarding-new-faculty", label: "Onboarding new faculty in your workspace" },
    ],
  },

  "multi-faculty-courses": {
    title: "Multi-faculty courses + per-module owners",
    lede: "Courses can be co-taught. Assign co-instructors at the course level and a different owner for each module.",
    audience: "creator",
    sections: [
      { kind: "h2", text: "Co-instructors" },
      { kind: "p", body: "Open a course → Curriculum tab. Above the curriculum you'll see a Co-instructors chip rail. Tap any faculty name to add them; tap again to remove." },
      { kind: "p", body: "The primary owner stays the headline teacher (signs the certificate, shown in the hero). Co-instructors are additional contributors with edit access." },
      { kind: "h2", text: "Per-module owner" },
      { kind: "p", body: "Each module has a 'Module owner (optional)' selector. Empty means the module inherits the course owner — pick a specific faculty member to override. Useful when Module 1 is taught by one teacher and Module 2 by another." },
      { kind: "callout", tone: "info", body: "The picker only appears when there are 2+ faculty in the workspace. Solo workspaces don't see the noise." },
    ],
    related: [{ slug: "faculty", label: "Invite a faculty member" }],
  },

  announcements: {
    title: "Publish announcements to learners",
    lede: "Course-scoped or workspace-wide announcements that surface in the lesson player. Priority levels float urgent items to the top.",
    audience: "creator",
    sections: [
      { kind: "p", body: "Compose at /dashboard/announcements. Pick a priority (low / normal / high / urgent), course scope (one course or all), and publish status. Students see published announcements at the top of the lesson canvas." },
      { kind: "h2", text: "Where students see them" },
      { kind: "ul", items: [
        "Top of the main canvas in the lesson player (above the LiveClassesBanner).",
        "Empty-canvas state when no lesson is selected — including the course-complete screen.",
        "Dismissable per-browser. Once a student closes it, it stays closed for them on that device.",
      ]},
      { kind: "h2", text: "Priority styling" },
      { kind: "ul", items: [
        "Urgent — destructive (red) accent.",
        "High — accent (amber) treatment.",
        "Normal — primary (brand) tint.",
        "Low — muted card.",
      ]},
    ],
  },

  "doubts-and-enquiries": {
    title: "Doubts inbox + pre-sale enquiries",
    lede: "One inbox for student support questions and prospective-buyer enquiries. WhatsApp, email, in-app — same place.",
    audience: "creator",
    sections: [
      { kind: "h2", text: "Two doorways, one inbox" },
      { kind: "ul", items: [
        "Inside a lesson: 'Got a question? Ask the teacher' opens a dialog scoped to that lesson.",
        "Public course pages: 'Email the teacher' prominent CTA opens a popup that captures name + email + WhatsApp + message.",
      ]},
      { kind: "h2", text: "Rate limits" },
      { kind: "p", body: "3 questions per browser per 24h per course. The dialog shows the countdown when you hit the cap. This is a UX guardrail, not a security boundary." },
      { kind: "h2", text: "Notifications fired" },
      { kind: "ul", items: [
        "In-app notification to the workspace owner / admins.",
        "Email to the workspace owner with replyTo set to the asker.",
        "WhatsApp via the existing notification dispatcher (stubbed until a real provider is wired).",
        "Acknowledgement email to the asker — they know it actually went somewhere.",
      ]},
      { kind: "h2", text: "Where it lands" },
      { kind: "p", body: "Both types of doubt show up in /dashboard/doubts. Guest enquiries get a 'Pre-sale' badge so support work + sales leads stay distinguishable. Click into a guest doubt for the reply thread + a 'Reply by email' shortcut." },
      { kind: "callout", tone: "info", body: "Replies to guest doubts auto-email the captured address. The asker can reply directly to the email to continue the conversation." },
    ],
  },

  "white-label": {
    title: "White-label your portal",
    lede: "Strip platform attribution so your public portal reads entirely as your brand.",
    audience: "creator",
    sections: [
      { kind: "p", body: "Open /dashboard/portal/brand → Advanced. Two toggles control what visitors see at the bottom of every portal page:" },
      { kind: "ul", items: [
        "Hide 'Powered by The Big Class' — removes the thin attribution line in the portal footer.",
        "Hide every platform-branded element — stronger toggle that implies the first and reserves the same opt-out for future surfaces (email footers, share previews, error pages).",
      ]},
      { kind: "callout", tone: "info", body: "Custom domains use the same toggles. Once your CNAME is verified to <yourdomain>.com, visitors see your portal at your own URL with no platform branding." },
    ],
  },

  "seo-and-meta": {
    title: "Tenant SEO + meta tags",
    lede: "Browser tab titles, share previews, and structured data all read from your portal config — not 'The Big Class'.",
    audience: "creator",
    sections: [
      { kind: "p", body: "Every /p/<tenant>/* page mounts a DynamicMeta client component that patches <head> with your tenant brand. Tab titles read '<page> · <your brand>'; Open Graph + Twitter share previews use your logo + brand name." },
      { kind: "h2", text: "Per-page overrides" },
      { kind: "ul", items: [
        "Blog posts: post.seo.title / .description / .ogImage take precedence over auto-fields.",
        "Course pages: include a Course JSON-LD payload (Schema.org) with provider, author, image.",
        "Store pages, library, blog list — all picked up automatically.",
      ]},
    ],
  },

  "customer-urls": {
    title: "Customer-facing URLs (paths today, subdomains soon)",
    lede: "Where to send your learners, and what the URLs look like once your subdomain / CNAME is live.",
    audience: "creator",
    sections: [
      { kind: "h2", text: "Today" },
      { kind: "p", body: "Your customer-facing URLs live under /p/<your-tenant-slug>/...:" },
      { kind: "ul", items: [
        "/p/<slug>/login — branded sign-in",
        "/p/<slug>/forgot-password — password recovery",
        "/p/<slug>/library — purchase history",
        "/p/<slug>/store — your storefront",
        "/p/<slug>/courses — public course catalogue",
      ]},
      { kind: "h2", text: "Production" },
      { kind: "p", body: "Once you launch on production, those same URLs are served at <slug>.thebigclass.com (subdomain) — then optionally at your own custom domain once your CNAME is verified. The path-based form keeps working forever as a fallback." },
      { kind: "callout", tone: "info", body: "Copyable list with both forms lives at /dashboard/portal/brand → Identity → Customer-facing URLs." },
    ],
  },

  // ---------- For learners ----------
  "learner-sign-in": {
    title: "Sign in to a workspace",
    lede: "Every workspace has its own sign-in page. The URL looks like /p/<workspace>/login — or <workspace>.thebigclass.com/login on production.",
    audience: "learner",
    sections: [
      { kind: "p", body: "If you got an invite email, the link inside lands you on the accept-invite page where you pick a password. Lost the email? Go to the workspace URL Your instructor gave you, click 'Forgot password?' to request a fresh link." },
      { kind: "callout", tone: "info", body: "There is no platform-wide sign-in. Each workspace's accounts are separate." },
    ],
  },

  "learner-language": {
    title: "Change the portal language",
    lede: "The language picker sits in the top-right of every portal page. Your choice persists across sessions.",
    audience: "learner",
    sections: [
      { kind: "ul", items: [
        "🇬🇧 English (default)",
        "🇮🇳 हिन्दी (Hindi)",
        "🇮🇳 தமிழ் (Tamil) — coming soon",
        "🇪🇸 Español",
        "🇫🇷 Français — coming soon",
      ]},
      { kind: "p", body: "Your preference is stored locally in your browser. Switching devices means picking again — that's intentional so you don't get unexpected language switches if you share a device." },
    ],
  },

  "learner-library": {
    title: "Find your library after a purchase",
    lede: "Your library lives inside the workspace you bought from. Open /p/<workspace>/library or the link in your receipt email.",
    audience: "learner",
    sections: [
      { kind: "p", body: "Already signed in? The library finds your account automatically. Not signed in? Type the email the receipt was sent to — we'll match against your purchase history." },
    ],
  },

  "asking-a-question": {
    title: "Ask the teacher a question",
    lede: "Inside a lesson, or from a public course page before buying — both routes work.",
    audience: "learner",
    sections: [
      { kind: "ul", items: [
        "Inside a lesson: hit the 'Got a question?' pill in the player chrome, or the bigger 'Stuck on something?' card under the lesson controls.",
        "Before buying: click 'Have a question? Email the teacher' on the course page hero.",
      ]},
      { kind: "p", body: "The teacher gets pinged in-app, by email, and (when wired) by WhatsApp. You'll get an acknowledgement email so you know the question went through." },
    ],
  },

  "edit-a-review": {
    title: "Edit a review you've written",
    lede: "3 edits per 24 hours. The form locks once you burn the budget and unlocks automatically when the oldest edit ages out.",
    audience: "learner",
    sections: [
      { kind: "p", body: "When the form is locked, the message tells you exactly when it unlocks — 'You can edit again in 4 h' (or 'in 23 min'). The countdown ticks every minute so you don't have to refresh." },
      { kind: "callout", tone: "info", body: "Why the limit? Stops rapid-fire star changes from being used to retaliate against a teacher's reply." },
    ],
  },

  // ---------- For developers ----------
  "api-keys": {
    title: "Generate + rotate API keys",
    lede: "Open /dashboard/developer → New API key. The full secret is shown exactly once.",
    audience: "developer",
    sections: [
      { kind: "h2", text: "Creating a key" },
      { kind: "ul", items: [
        "Pick a human name you'll recognise in logs ('Zapier integration', 'Mobile app v1').",
        "Select scopes — only check what the integration actually needs.",
        "Add an optional note so future-you knows what the key is for.",
        "Hit Generate. Copy the secret immediately — we never store plaintext.",
      ]},
      { kind: "h2", text: "Rotation" },
      { kind: "p", body: "There's no in-place rotation. To rotate: generate a new key, update your client, revoke the old one. Revoked keys remain visible for audit so you can match a log line back to the key that produced it." },
      { kind: "h2", text: "Scopes" },
      { kind: "ul", items: [
        "read:courses — list courses, lessons, modules",
        "read:students — list enrolled students + progress",
        "read:orders — receipt + entitlement history",
        "read:analytics — aggregate metrics",
        "write:students — create / update student profiles",
        "write:enrollments — enrol / revoke access",
      ]},
      { kind: "callout", tone: "warn", body: "Never embed a key in a client bundle or mobile app. Those should proxy through your backend, which holds the secret." },
    ],
    related: [{ slug: "rate-limits", label: "Rate limits + headers" }],
  },

  "rate-limits": {
    title: "Rate limits + the X-RateLimit-* headers",
    lede: "60 requests/minute and 1,000/day per API key. Every response carries headers so your client can back off proactively.",
    audience: "developer",
    sections: [
      { kind: "h2", text: "Limits" },
      { kind: "ul", items: [
        "60 requests per minute, aligned to clock minutes (resets at :00).",
        "1,000 requests per day, aligned to UTC midnight.",
        "Token-bucket: the failed-rate-limited request doesn't consume budget.",
      ]},
      { kind: "h2", text: "Headers (always present)" },
      { kind: "code", lang: "http", body: `X-RateLimit-Limit: 60
X-RateLimit-Remaining: 47
X-RateLimit-Reset: 1715990400
X-RateLimit-Daily-Limit: 1000
X-RateLimit-Daily-Remaining: 832
X-RateLimit-Daily-Reset: 1716076800
Retry-After: 12      # only on 429 responses` },
      { kind: "p", body: "Pre-emptively back off when X-RateLimit-Remaining is under 5 — otherwise you'll trip a 429 and have to wait for the Retry-After window." },
      { kind: "callout", tone: "info", body: "Enterprise plans get custom quotas — talk to us if 60/min isn't enough for your integration." },
    ],
  },

  webhooks: {
    title: "Webhooks (roadmap)",
    lede: "Outbound webhooks are on the near-term roadmap. The contract below is what we'll ship — file an issue if anything's wrong before we lock it.",
    audience: "developer",
    sections: [
      { kind: "p", body: "We'll sign every webhook with an HMAC-SHA256 over the raw body, sent in the Tbc-Signature header. Verify on receipt by computing the same HMAC with your webhook secret and constant-time comparing." },
      { kind: "p", body: "Retries: 5 attempts, exponential backoff (1m, 5m, 30m, 6h, 24h). After the last failure the event goes to a dead-letter queue you can replay from the dashboard." },
      { kind: "p", body: "Event shape will match the bigger ones in the catalogue (Stripe-style): a top-level type + an embedded data object that mirrors the GET response of the entity." },
    ],
  },

  // ---------- For workspace admins ----------
  "onboarding-new-faculty": {
    title: "Onboarding new faculty in your workspace",
    lede: "Invite → password setup → land on dashboard. The whole flow takes about 90 seconds for the recipient.",
    audience: "admin",
    sections: [
      { kind: "h2", text: "What gets emailed" },
      { kind: "p", body: "A workspace-branded email titled '<your name> invited you to <workspace>'. The CTA is 'Accept invite & set up account', linked to /p/<tenant>/accept-invite/<token> (7-day expiry)." },
      { kind: "h2", text: "Password requirements" },
      { kind: "p", body: "Passwords are scored by dropbox/zxcvbn with a minimum 'good' score (3/4). Passwords containing the invitee's name, email, or workspace name score lower; a passphrase or generator output always passes." },
      { kind: "h2", text: "What the recipient lands on" },
      { kind: "ul", items: [
        "Instructor / admin → /dashboard (the build surface).",
        "Student → /p/<tenant> (the public portal home).",
      ]},
    ],
  },

  "per-tenant-login-pages": {
    title: "Per-tenant login + password recovery",
    lede: "Every workspace has its own login, forgot-password, and reset pages — branded with that workspace's logo/colors/fonts.",
    audience: "admin",
    sections: [
      { kind: "h2", text: "Pages" },
      { kind: "ul", items: [
        "/p/<tenant>/login — branded sign-in",
        "/p/<tenant>/forgot-password — email + send link",
        "/p/<tenant>/reset-password/<token> — set a new password",
        "/p/<tenant>/accept-invite/<token> — accept an invite + set initial password",
      ]},
      { kind: "h2", text: "Tenant-scoped tokens" },
      { kind: "p", body: "Tokens carry a signed tenant binding. A link issued for tenant A is rejected if it lands inside tenant B's portal — even if the URL slug is swapped manually." },
      { kind: "h2", text: "Sign-in routing" },
      { kind: "ul", items: [
        "Instructors + admins land on /dashboard.",
        "Students land on /p/<tenant>/courses.",
      ]},
    ],
  },

  // ============================================================
  // Authoring courses
  // ============================================================
  "course-create": {
    title: "Create your first course",
    lede: "From empty workspace to a published course in 15 minutes. The dashboard course editor walks you through metadata, curriculum, pricing, and publish state in one place.",
    audience: "creator",
    keywords: ["create online course", "publish first course", "course platform setup", "LMS course builder"],
    updated: "2026-05-19",
    sections: [
      { kind: "p", body: "Open /dashboard/courses → New course. Set title, subtitle, category, level, language, and a thumbnail. We auto-derive an SEO title + description from your inputs; override anything in the SEO tab when you're ready." },
      { kind: "h2", text: "Minimum to publish" },
      { kind: "ul", items: [
        "Title + slug (auto-generated; editable).",
        "At least one module with one lesson.",
        "Pricing (free or paid; you can change later).",
        "Visibility: public, private, unlisted, or password-gated.",
      ]},
      { kind: "h2", text: "Drafts vs published" },
      { kind: "p", body: "Drafts are invisible to the public + don't surface in /courses or your tenant portal. Publish flips visibility, surfaces the course in the catalog, and starts indexing for SEO. You can unpublish anytime — nothing destructive happens." },
    ],
    related: [
      { slug: "course-curriculum", label: "Building the curriculum" },
      { slug: "course-publish-vs-draft", label: "Drafts vs published" },
    ],
  },

  "course-curriculum": {
    title: "Build a course curriculum",
    lede: "Modules, lessons, content types. Drag to reorder. Eight lesson types covering every content shape — video, audio, reading, embed, quiz, live, document, PDF.",
    audience: "creator",
    keywords: ["course curriculum builder", "course modules", "video lessons", "drip schedule", "SCORM"],
    updated: "2026-05-19",
    sections: [
      { kind: "h2", text: "Modules" },
      { kind: "p", body: "Group related lessons into modules. Each module has a title, an optional 180-char description, and an optional per-module instructor (used when courses are co-taught — see Multi-faculty courses)." },
      { kind: "h2", text: "Lesson types" },
      { kind: "ul", items: [
        "video — upload + transcript, with optional captions",
        "audio — lecture-style audio",
        "text — rich-text reading (Tiptap editor)",
        "pdf / document — attached files learners can open inline",
        "embed — Canva / Gamma / Slides / Notion / Figma / Loom",
        "quiz — built-in quiz player with multiple question types",
        "live — links to a scheduled live class",
      ]},
      { kind: "h2", text: "Free previews + lock" },
      { kind: "p", body: "Toggle `isPreview` on any lesson to surface it publicly even when the course is paid — used as a sample for buyers. Toggle `isLocked` to gate a lesson behind enrolment regardless of pricing." },
    ],
    related: [{ slug: "course-quizzes", label: "Quizzes + question types" }],
  },

  "course-quizzes": {
    title: "Build quizzes that aren't gameable",
    lede: "Five question types, time limits, attempt caps, randomised order. Learners who fail can retake; quiz lessons auto-complete on a passing score.",
    audience: "creator",
    keywords: ["course quiz builder", "online quiz", "LMS quiz types", "anti-cheat quiz"],
    updated: "2026-05-19",
    sections: [
      { kind: "p", body: "Open a course → Curriculum → add a lesson of type Quiz. The quick-quiz dialog seeds an MCQ; the full editor at /dashboard/quizzes/<id> exposes every option." },
      { kind: "h2", text: "Question types" },
      { kind: "ul", items: [
        "Single-choice (one right answer)",
        "Multi-choice (any number right)",
        "True / false",
        "Short answer (exact-match grading)",
        "Numeric (integer or float with tolerance)",
      ]},
      { kind: "h2", text: "Anti-cheat knobs" },
      { kind: "ul", items: [
        "Time limit per attempt (e.g. 20 min).",
        "Attempt cap (1, 3, unlimited).",
        "Randomise question + option order per attempt.",
        "Hide correct answer until the score is final.",
      ]},
    ],
  },

  "course-drip": {
    title: "Drip course content on a schedule",
    lede: "Release modules N days after enrolment, or on a fixed calendar date. Use it for cohort courses, weekly newsletter-style content, or pacing learners through dense material.",
    audience: "creator",
    keywords: ["drip course content", "cohort course schedule", "release lessons gradually"],
    updated: "2026-05-19",
    sections: [
      { kind: "p", body: "Two scheduling modes per module: relative (N days after the learner enrols) or absolute (release on YYYY-MM-DD). Learners see locked modules in the curriculum with an unlock date — they're not invisible." },
      { kind: "h2", text: "Cohort recipe" },
      { kind: "ul", items: [
        "Open enrolment for 7 days.",
        "Set all modules to absolute dates aligned with the cohort start.",
        "Pair with announcements to nudge learners on each unlock.",
      ]},
    ],
  },

  "course-pricing": {
    title: "Set course pricing + currencies",
    lede: "One-time, free, or pay-what-you-want. Set early-bird windows, original (strike-through) prices, multi-currency. Tax handling auto-derived from your workspace country.",
    audience: "creator",
    keywords: ["course pricing", "early bird course", "multi-currency course", "pay what you want course"],
    updated: "2026-05-19",
    sections: [
      { kind: "p", body: "Open a course → Pricing. Pick base price + currency, optionally an `originalPrice` for the strike-through, and an `earlyBirdPrice` valid until a date. Coupons live in their own section." },
      { kind: "h2", text: "Free vs paid" },
      { kind: "p", body: "Set price = 0 for free courses. They still go through enrolment so you capture the learner; the checkout becomes a one-click 'enroll for free' button. Switching from free → paid only affects new enrolments — existing learners keep access." },
    ],
    related: [{ slug: "coupons-early-bird", label: "Coupons + early-bird" }],
  },

  "course-publish-vs-draft": {
    title: "Drafts, published, archived — and visibility states",
    lede: "Drafts hide everywhere. Published is public. Visibility (public / private / unlisted / password) gates *who* sees a published course independently of status.",
    audience: "creator",
    keywords: ["unlisted course", "private course", "password-protected course"],
    updated: "2026-05-19",
    sections: [
      { kind: "h2", text: "Status" },
      { kind: "ul", items: [
        "draft — invisible, no indexing, no checkout",
        "published — public, indexable, checkout enabled",
        "archived — hidden from new buyers, existing learners keep access",
      ]},
      { kind: "h2", text: "Visibility (only meaningful when published)" },
      { kind: "ul", items: [
        "public — listed in catalogue + SEO",
        "private — hidden from catalogue, accessible by direct invite",
        "unlisted — accessible via direct link, not in catalogue or SEO",
        "password — visitor must enter `accessPassword` to see content",
      ]},
    ],
  },

  "course-bulk-import": {
    title: "Bulk-import students via CSV",
    lede: "Upload a CSV with email, name, and optional phone — we provision accounts, enrol them in the target course, and email an invite. Handles 10,000+ rows.",
    audience: "creator",
    keywords: ["bulk import students", "CSV student upload", "mass enrol course"],
    updated: "2026-05-19",
    sections: [
      { kind: "p", body: "Open /dashboard/students → Import. Drop a CSV with columns email,name,phone (phone optional). We dedupe by email — re-uploading an existing student updates their profile, doesn't create a duplicate." },
      { kind: "h2", text: "What happens on each row" },
      { kind: "ul", items: [
        "User row created or updated.",
        "Enrolment created against the chosen course (idempotent).",
        "Invite email queued (skipped if the student already logged in).",
      ]},
      { kind: "callout", tone: "info", body: "Imports under 100 rows run in-browser. Larger imports queue server-side and email you a report when done." },
    ],
  },

  "live-classes-schedule": {
    title: "Schedule a live class — single or recurring",
    lede: "Pick a course, set the start time, choose your meeting provider, hit save. Recurring schedules generate every instance up to a cap so you can edit any single occurrence.",
    audience: "creator",
    keywords: ["schedule live class", "recurring live class", "cohort class scheduler", "Zoom course platform"],
    updated: "2026-05-19",
    sections: [
      { kind: "p", body: "/dashboard/classes/new. Fill in class details, host (defaults to you; admins can re-assign), schedule, and meeting link. Recurrence presets cover weekly / fortnightly / monthly / custom interval-days." },
      { kind: "h2", text: "How notifications fan out" },
      { kind: "ul", items: [
        "Enrolled students get an in-app notification.",
        "Email goes out to every enrolled student with the meeting link.",
        "WhatsApp dispatch fires for students with a phone on file.",
        "A reminder fires 1 hour before the class.",
      ]},
    ],
  },

  "live-classes-zoom": {
    title: "Zoom, Google Meet, Microsoft Teams integration",
    lede: "Paste your meeting link — we auto-detect the provider and surface provider-specific affordances (Zoom recording auto-import, Meet calendar invite, Teams meeting ID).",
    audience: "creator",
    keywords: ["zoom integration LMS", "Google Meet course", "Microsoft Teams class"],
    updated: "2026-05-19",
    sections: [
      { kind: "p", body: "We don't run our own video — we surface the provider you already use. Paste a zoom.us / meet.google.com / teams.microsoft.com link; the class meta picks up the provider and renders the right icon, naming, and join button." },
      { kind: "h2", text: "Recordings" },
      { kind: "p", body: "Once the class ends, attach a recording URL on the session detail page. It lands in the Past Classes shelf inside the lesson player so absentees can catch up without leaving the course." },
    ],
  },

  "live-classes-past-classes-shelf": {
    title: "Past Classes shelf inside the course",
    lede: "Every live class becomes a permanent shelf inside the course — attendance + recording + materials in one place.",
    audience: "creator",
    keywords: ["past classes", "class history", "asynchronous catch-up"],
    updated: "2026-05-19",
    sections: [
      { kind: "ul", items: [
        "Every session, attended or not, lives in /dashboard/classes/history.",
        "Inside the lesson player, the Past Classes shelf shows the 5 most recent recordings for the active course.",
        "Click any past class to see attendance + recording URL + any session-linked assignments.",
      ]},
    ],
  },

  "live-classes-attendance": {
    title: "Attendance — auto-tracked, manually editable",
    lede: "We log a Joined event when a learner clicks the meeting link. Edit attendance after the fact, mark someone present-but-late, or excuse an absence — all visible in the student timeline.",
    audience: "creator",
    keywords: ["online class attendance", "course attendance system", "cohort attendance"],
    updated: "2026-05-19",
    sections: [
      { kind: "p", body: "/dashboard/classes/<id>/attendance. Click a row to flip presence. Bulk actions cover the common cases (mark all present, all absent except…)." },
      { kind: "h2", text: "Auto-nudges" },
      { kind: "p", body: "Learners with 3+ consecutive absences trigger a 'check in' nudge to the teacher's inbox. Tunable in /dashboard/settings → Engagement nudges." },
    ],
  },

  "assignments": {
    title: "Assignments + grading workflow",
    lede: "Post an assignment from a lesson, from a course, or from a live session. Submissions land in /dashboard/assignments. Grade in a side panel with rich feedback.",
    audience: "creator",
    keywords: ["course assignments", "grading workflow LMS", "homework submissions"],
    updated: "2026-05-19",
    sections: [
      { kind: "h2", text: "Three scopes" },
      { kind: "ul", items: [
        "Lesson-linked — shown as a 'follow-up' under the lesson.",
        "Session-linked — attached to a live class; shown in past-class recap.",
        "Course-level — surfaces in the course's Assignments & Projects tab.",
      ]},
      { kind: "h2", text: "Submission" },
      { kind: "p", body: "Learners submit a link or upload + optional notes. The public share token means a student can submit without being signed in (useful for legacy invites)." },
      { kind: "h2", text: "Grading" },
      { kind: "p", body: "Open a submission → score + feedback + status (graded). The learner gets notified by in-app + email; their lesson auto-marks complete when the assignment is graded above passing." },
    ],
  },

  // ============================================================
  // Storefront / payments
  // ============================================================
  "products-7-kinds": {
    title: "The 7 product kinds you can sell",
    lede: "Course access, downloads, bundles, memberships, 1:1 sessions, paid webinars, license keys. One store, one checkout, one fulfilment system.",
    audience: "creator",
    keywords: ["sell digital products", "course bundle", "membership platform", "paid webinar", "1:1 session"],
    updated: "2026-05-19",
    sections: [
      { kind: "ul", items: [
        "course — grants access to one or more courses",
        "download — file delivery on purchase (PDFs, ebooks, music)",
        "bundle — multiple products at one price",
        "membership — subscription, monthly / annual / lifetime",
        "session — 1:1 booking against a calendar URL",
        "webinar — single-occurrence paid event with meeting link",
        "license — auto-generated license keys for software / templates",
      ]},
    ],
  },

  "products-bundles": {
    title: "Course bundles + cross-sells",
    lede: "Bundle a beginner + intermediate + advanced course at a discount. Set the bundle price; we compute the savings vs buying individually and show it on the storefront card.",
    audience: "creator",
    keywords: ["course bundle pricing", "cross-sell course", "package course"],
    updated: "2026-05-19",
    sections: [
      { kind: "p", body: "Open /dashboard/store → New product → Bundle. Pick the courses to include, set the bundle price. The storefront card auto-renders a 'Save ₹X vs separate' badge." },
      { kind: "callout", tone: "info", body: "Buying a bundle creates separate enrolments for each included course. Cancelling a bundle revokes all of them at once." },
    ],
  },

  "products-memberships": {
    title: "Memberships with monthly / annual / lifetime tiers",
    lede: "Recurring billing with grace periods, retry logic, dunning emails. Each tier can grant access to a curated bundle of courses, a community, or 1:1 office hours.",
    audience: "creator",
    keywords: ["membership platform", "recurring billing course", "subscription LMS"],
    updated: "2026-05-19",
    sections: [
      { kind: "ul", items: [
        "Tier intervals: 30 / 90 / 180 / 365 days, or lifetime.",
        "Grace period after a failed payment (default: 3 days).",
        "Automatic dunning emails on each retry.",
        "Cancel anytime — access stays until the end of the paid period.",
      ]},
    ],
  },

  "products-checkout": {
    title: "Checkout flow + India payment stack",
    lede: "UPI (intent flow, no redirect), NetBanking, Cards, Wallets, Pay-Later, No-Cost EMI. Stripe globally. GST-compliant invoices auto-generated.",
    audience: "creator",
    keywords: ["UPI checkout course", "Indian payment LMS", "GST invoice course platform", "no-cost EMI course"],
    updated: "2026-05-19",
    sections: [
      { kind: "h2", text: "Payment methods" },
      { kind: "ul", items: [
        "UPI intent flow — no redirect, the user approves in their UPI app",
        "Cards, NetBanking, Wallets",
        "Pay-Later: Simpl, LazyPay",
        "No-Cost EMI on orders above ₹6,000",
        "Stripe for international creators (cards + bank debits)",
      ]},
      { kind: "h2", text: "Invoices" },
      { kind: "p", body: "Every successful order auto-generates a GST-compliant invoice with HSN codes and IGST/CGST/SGST split. The receipt page + the buyer's email both link to the PDF." },
    ],
  },

  "coupons-early-bird": {
    title: "Coupons, early-bird, flash sales",
    lede: "Issue percentage or fixed-amount coupons. Cap usage globally or per-customer. Early-bird auto-expires at a date; flash sales fire announcement broadcasts on activation.",
    audience: "creator",
    keywords: ["course coupon codes", "early bird course price", "flash sale LMS"],
    updated: "2026-05-19",
    sections: [
      { kind: "p", body: "Open a course → Pricing → Coupons. Code, discount, valid-until, max-uses, max-uses-per-customer. Stack rules: only one coupon applies per checkout (the best one for the buyer)." },
    ],
  },

  // ============================================================
  // Certificates
  // ============================================================
  "certificates-templates": {
    title: "Certificate templates + the Template Designer",
    lede: "17 starter templates covering 'achievement', 'participation', 'completion'. The Template Designer lets you build your own with cursive fonts, real signatures, and dynamic fields.",
    audience: "creator",
    keywords: ["certificate template", "certificate designer", "course completion certificate", "training certificate"],
    updated: "2026-05-19",
    sections: [
      { kind: "p", body: "/dashboard/templates lists every certificate template in your workspace. Click any to edit; clone the platform templates as starting points. Drag fields, set fonts, attach a signature image — there's no separate PDF render path." },
      { kind: "h2", text: "Dynamic fields" },
      { kind: "ul", items: [
        "{name} — recipient's full name",
        "{course} — course title",
        "{date} — issue date, locale-formatted",
        "{score} — final score for graded courses",
        "{id} — verifiable certificate ID",
      ]},
    ],
    related: [{ slug: "certificates-bulk-issue", label: "Bulk-issue from CSV" }],
  },

  "certificates-bulk-issue": {
    title: "Bulk-issue certificates from CSV",
    lede: "Upload a CSV with the names + emails of recipients. We render a personalised certificate for each, email them with a verify URL, and log the batch for audit.",
    audience: "creator",
    keywords: ["bulk certificate issue", "CSV certificate batch", "training certificate batch"],
    updated: "2026-05-19",
    sections: [
      { kind: "p", body: "/dashboard/new-batch. Pick a template, upload the CSV (name,email + any extra columns you map to template fields), preview the first row, hit Issue." },
      { kind: "h2", text: "What the recipient gets" },
      { kind: "ul", items: [
        "Email with the certificate PDF attached.",
        "A unique verify URL that anyone can hit to confirm the certificate is real.",
        "A LinkedIn-shareable preview image.",
      ]},
    ],
  },

  "certificates-verify": {
    title: "The public verify page",
    lede: "Anyone with a certificate ID can hit /verify/<id> to confirm it was issued by you, see the issue date, and inspect the recipient name. No account required.",
    audience: "creator",
    keywords: ["verify certificate", "certificate authenticity", "credential verification"],
    updated: "2026-05-19",
    sections: [
      { kind: "p", body: "Every certificate carries an unguessable ID. We surface the verify page at /verify/<id> publicly — recruiters, parents, employers can all confirm a credential without signing up." },
      { kind: "callout", tone: "info", body: "On-chain notarisation is on the roadmap. The verify URL stays the same; we add a 'verified on-chain' badge once the hash is published." },
    ],
  },

  // ============================================================
  // Audience / community
  // ============================================================
  "wall-of-love": {
    title: "Build a Wall of Love",
    lede: "Collect testimonials via a public form, approve the ones you want, embed the wall anywhere. Auto-import recent five-star course reviews so the wall stays fresh.",
    audience: "creator",
    keywords: ["testimonials wall", "Wall of Love", "social proof course platform"],
    updated: "2026-05-19",
    sections: [
      { kind: "p", body: "Open /dashboard/wall. Share the public collect URL with happy learners; their submissions land as drafts until you publish. Auto-import pulls every 5-star course review you've received in the last 30 days." },
    ],
  },

  "referrals": {
    title: "Referrals — personal links + auto crediting",
    lede: "Every student gets a personal /r/<code> link. When someone they refer enrols, we credit the referrer (wallet credit, fixed reward, or % of revenue) and notify both sides.",
    audience: "creator",
    keywords: ["course referral program", "affiliate course platform", "Refer and Earn LMS"],
    updated: "2026-05-19",
    sections: [
      { kind: "p", body: "/dashboard/referrals. Pick the reward type, the cap, and the attribution window (default 30 days). Students see their referral dashboard at /p/<tenant>/refer." },
    ],
  },

  // ============================================================
  // Portal surfaces
  // ============================================================
  "portal-template": {
    title: "Pick a portal template",
    lede: "Seven starter templates (Editorial, Brutalist, Minimal, Modern, Studio, …). One-click apply seeds colors, fonts, layouts, and home-page sections without touching content.",
    audience: "creator",
    keywords: ["portal template", "course platform theme", "creator website template"],
    updated: "2026-05-19",
    sections: [
      { kind: "p", body: "/dashboard/portal/brand → Templates. Hover any template to preview against your real content. Apply → every brand field updates, your courses + blog posts keep flowing through." },
      { kind: "callout", tone: "info", body: "Re-applying a template only overwrites fields you haven't customised. Your edits are preserved." },
    ],
  },

  "portal-pages": {
    title: "Page builder — sections, blocks, custom HTML",
    lede: "Drag-arranged section library covering hero, testimonials, FAQ, CTA, embedded video, social proof, and free-form HTML. Pages get their own URL + SEO panel.",
    audience: "creator",
    keywords: ["page builder LMS", "no-code landing page", "custom page course platform"],
    updated: "2026-05-19",
    sections: [
      { kind: "p", body: "/dashboard/portal/pages. New page → mount it at any path under your portal. Add sections from the library; reorder by drag; toggle visibility per section." },
    ],
  },

  "portal-domain": {
    title: "Custom domain + auto-SSL",
    lede: "Launch on <slug>.thebigclass.com, point a CNAME at us, and we provision SSL automatically. The path-based URL keeps working forever as a fallback.",
    audience: "admin",
    keywords: ["custom domain LMS", "CNAME setup course platform", "SSL course portal"],
    updated: "2026-05-19",
    sections: [
      { kind: "h2", text: "Steps" },
      { kind: "ul", items: [
        "Open /dashboard/portal/domain. Enter your domain (e.g. learn.yourbrand.com).",
        "Add the CNAME record we show to your DNS provider.",
        "Click Verify. Once DNS propagates (usually < 30 min), the domain status flips to verified.",
        "SSL provisions automatically via Let's Encrypt; renews every 60 days.",
      ]},
      { kind: "callout", tone: "info", body: "The /p/<slug>/… path keeps working after CNAME so old bookmarks never break." },
    ],
  },

  // ============================================================
  // Analytics + ops
  // ============================================================
  "analytics-dashboard": {
    title: "What the analytics dashboard tracks",
    lede: "Revenue, enrolments, completion rate, per-lesson drop-off, conversion funnels, retention cohorts. Pulled live from the tenant store — no separate analytics setup.",
    audience: "creator",
    keywords: ["course analytics", "LMS dashboard metrics", "revenue dashboard creator"],
    updated: "2026-05-19",
    sections: [
      { kind: "ul", items: [
        "Revenue — gross, net of refunds, by day / week / month.",
        "Enrolments — by course, by source (referral, organic, ad).",
        "Completion — per-course %, per-lesson drop-off chart.",
        "Funnels — landing → checkout → enrolled, with stage drop-off.",
        "Cohorts — retention curves grouped by acquisition month.",
      ]},
    ],
  },

  "analytics-cohorts": {
    title: "Cohort retention + LTV",
    lede: "Group learners by enrolment month and see the % still active at week 1, 4, 12, 24. LTV is computed from order history — gross revenue per learner over their lifetime.",
    audience: "creator",
    keywords: ["cohort retention course", "course LTV", "learner retention"],
    updated: "2026-05-19",
    sections: [
      { kind: "p", body: "/dashboard/analytics → Cohorts. Pick a window (last 12 months default). The grid shows month-over-month retention; click any cell to drill into the specific cohort." },
    ],
  },

  "notifications": {
    title: "Notifications — in-app, email, WhatsApp",
    lede: "Every event the platform fires (enrolment, payment, class reminder, doubt, certificate) fans out across in-app, email, and WhatsApp. Per-event channels are toggleable.",
    audience: "creator",
    keywords: ["course notifications", "WhatsApp class reminder", "in-app notification LMS"],
    updated: "2026-05-19",
    sections: [
      { kind: "ul", items: [
        "In-app — always on. Bell icon in the dashboard surfaces unread.",
        "Email — opt-out per user. Templates live in lib/email-templates.",
        "WhatsApp — opt-in per user; needs phone on file. Provider-pluggable.",
      ]},
      { kind: "callout", tone: "info", body: "The notification dispatcher is one function call — when a new event ships, it gets all three channels for free." },
    ],
  },

  "trash-restore": {
    title: "Trash + restore deleted content",
    lede: "Deleted courses, lessons, students, products, and announcements all land in Trash for 7 days. One-click restore brings everything back exactly as it was.",
    audience: "admin",
    keywords: ["restore deleted course", "trash LMS", "soft delete course platform"],
    updated: "2026-05-19",
    sections: [
      { kind: "p", body: "/dashboard/trash. Each row shows what was deleted, by whom, when, and a Restore button. After 7 days items are permanently purged — there's a daily auto-prune." },
    ],
  },

  "workspace-export": {
    title: "Export your workspace — CSV, JSON, or the lot",
    lede: "Two ways out. Full workspace as a single JSON envelope (lossless, every byte). Or per-entity sheets — students, courses, orders — as CSV or JSON, ready to open in Excel or pipe into another tool. Re-upload any of them and you're back where you were.",
    audience: "admin",
    keywords: [
      "export course platform data",
      "workspace backup LMS",
      "migrate creator platform",
      "import course platform data",
      "import students csv",
      "export students csv",
      "export courses csv",
      "GDPR data portability creator",
      "switch creator platform export india",
      "migrate from creator platform export",
    ],
    updated: "2026-05-19",
    sections: [
      { kind: "h2", text: "Three flavours of export" },
      { kind: "ul", items: [
        "Full workspace JSON — every byte, one file, lossless. Use for backup + cross-workspace migration.",
        "Per-entity CSV — students, courses, or orders as a flat spreadsheet. Use for Mailchimp / Excel / Google Sheets.",
        "Per-entity JSON — same row data as the CSV, but as a structured array with format/version metadata. Use for scripting + tool integrations.",
      ]},

      { kind: "h2", text: "Export everything (full workspace)" },
      { kind: "p", body: "Open /dashboard/settings → Workspace data → Export workspace. We scan every tenant-scoped slice in your workspace, package it into a single versioned JSON envelope, and trigger a browser download. Nothing leaves your machine — the file is generated client-side." },
      { kind: "h2", text: "What's in the file" },
      { kind: "ul", items: [
        "Courses, modules, lessons (including quiz definitions + drip schedules)",
        "Students, faculty, enrolments, completion + attendance history",
        "Quiz attempts + assignment submissions + grades",
        "Live sessions + past-class recordings + attendance",
        "Orders, entitlements, subscriptions, products, coupons",
        "Certificates + certificate batches + verification records",
        "Portal config, pages, blog posts, faculty showcase, testimonials",
        "Reviews, doubts (incl. guest enquiries), announcements, discussions",
        "Org settings (notification prefs, currency, brand attribution)",
        "Wall of Love entries, referral codes + conversions",
      ]},
      { kind: "h2", text: "File format" },
      { kind: "code", lang: "json", body: `{
  "format": "thebigclass.workspace-export",
  "version": 1,
  "exportedAt": "2026-05-19T08:42:13.521Z",
  "sourceTenant": "snapied",
  "sourceTenantName": "Snapied",
  "counts": { "courses": 47, "students": 1243, "orders": 89, "posts": 12 },
  "slices": {
    "lms.courses.v1": [ /* … */ ],
    "lms.users.v1": [ /* … */ ],
    "store.orders.v1": [ /* … */ ],
    "portal.config.v1": { /* … */ },
    "portal.pages.v1": [ /* … */ ]
  }
}` },
      { kind: "callout", tone: "info", body: "Plain JSON, no proprietary container. Open it in any text editor, diff it, audit it — same shape going out as coming in." },

      { kind: "h2", text: "Export by entity (CSV or JSON)" },
      { kind: "p", body: "Same panel, the \"Export by entity\" row. Three entities, two formats each: Students, Courses, Orders × CSV or JSON. CSV is the universal spreadsheet format — Excel, Numbers, Google Sheets, Mailchimp, every CRM. JSON keeps the same shape but as a structured array with format + version metadata so a script can consume it." },
      { kind: "ul", items: [
        "Students CSV columns — id, name, email, phone, enrolledCourses (pipe-separated), joinedAt.",
        "Courses CSV columns — id, slug, title, description, priceInr, status, facultyId, modulesCount, lessonsCount, createdAt. Curriculum trees don't fit a flat CSV — use the workspace JSON for those.",
        "Orders CSV columns — id, studentEmail, itemTitle, amountInr, status, createdAt.",
      ]},
      { kind: "callout", tone: "info", body: "Filenames look like snapied.students.2026-05-19.csv — tenant slug, entity, date, format. Drop them straight into a backup folder and the chronology is obvious." },

      { kind: "h2", text: "Import a CSV (students or courses)" },
      { kind: "p", body: "Same panel: \"Import CSV →\" → Students CSV / Courses CSV. The picker accepts any RFC 4180 CSV — same shape Excel and Google Sheets export by default. We parse client-side, show you the detected columns + first-row preview in a dialog, you confirm. Existing rows get updated, new rows get added. Unlike the full workspace import, CSV import is non-destructive." },
      { kind: "ul", items: [
        "Students match on the email column (case-insensitive). Rows without an email are skipped + counted.",
        "Courses match on id first, then slug. Module + lesson trees from the existing course record are preserved — CSV import only touches flat metadata.",
        "Non-student users (admins, faculty) in your workspace are untouched by a student CSV import.",
      ]},

      { kind: "h2", text: "Reimport (full workspace JSON)" },
      { kind: "p", body: "Same panel: \"Import from a full workspace export\" → Choose export file. We parse the file, validate the envelope, and surface a preview with row counts (\"47 courses, 1,243 students, 89 orders, …\") before anything writes. You confirm; we overwrite the target workspace and hard-reload so every store re-hydrates against the fresh state." },
      { kind: "callout", tone: "warn", body: "Full-workspace replace is destructive. CSV import is not. If you want a safety net before a full restore, export the target workspace first — that gives you a rollback point." },

      { kind: "h2", text: "Cross-workspace import" },
      { kind: "p", body: "The same file works in a different workspace — perfect for \"I'm starting fresh, bring everything from the old account\". Sign into the new workspace, open settings, pick the export file you downloaded earlier, confirm. Everything lands in the new workspace's storage." },

      { kind: "h2", text: "Async + safe on big workspaces" },
      { kind: "p", body: "Both export and import yield to the browser between every slice (setTimeout 0) so the dashboard never freezes — even on workspaces with tens of thousands of records. A live progress bar shows \"reading lms.courses.v1 (47/89)\" as it works. If browser localStorage quota is exceeded mid-import, we stop and tell you exactly where; partial writes leave the workspace in a consistent state because each slice is one atomic localStorage.setItem." },

      { kind: "h2", text: "When to use this" },
      { kind: "ul", items: [
        "Switching to a new workspace (paid plan upgrade, multi-tenant setup, fresh account).",
        "Backing up before a major migration or template apply.",
        "GDPR / data-portability requests from your audit team.",
        "Moving everything off the platform — yes, including off our platform. Keep the file.",
      ]},

      { kind: "callout", tone: "info", body: "Once we move off browser-local storage and onto a real backend, this same tool will hit a server endpoint that streams the export back. The file format stays identical so any exports you take now stay valid forever." },
    ],
    related: [
      { slug: "trash-restore", label: "Trash + restore deleted content" },
      { slug: "course-bulk-import", label: "Bulk-import students via CSV" },
    ],
  },

  // ============================================================
  // Developers (more)
  // ============================================================
  "tenant-tokens": {
    title: "Tenant-scoped auth tokens",
    lede: "Every reset / invite / email-verify token carries a signed tenant binding. A link issued for workspace A can't be consumed inside workspace B.",
    audience: "developer",
    keywords: ["tenant scoped tokens", "JWT tenant binding", "multi-tenant auth"],
    updated: "2026-05-19",
    sections: [
      { kind: "p", body: "Tokens are HMAC-SHA256 signed with the AUTH_TOKEN_SECRET environment variable. The payload includes { sub, kind, exp, nonce, tnt? }. The tenant slug (tnt) is optional — platform-level tokens omit it." },
      { kind: "h2", text: "Verification" },
      { kind: "code", lang: "ts", body: `import { verifyToken } from "@/lib/auth-tokens"

const v = verifyToken(token, "password-reset")
if (!v.ok) return res.status(400).json({ error: v.reason })

// payload.tnt is the workspace slug. Compare against the URL
// slug; reject mismatches to prevent cross-tenant token reuse.
if (v.payload.tnt && v.payload.tnt !== urlTenantSlug) {
  return res.status(403).json({ error: "tenant-mismatch" })
}` },
    ],
  },

  // ============================================================
  // Learners (more)
  // ============================================================
  "learner-progress": {
    title: "How learner progress is tracked",
    lede: "Every lesson view is logged. Completion happens when the learner hits 'Mark as complete', passes a quiz, or has their assignment graded above passing.",
    audience: "learner",
    keywords: ["course progress tracking", "online learning progress", "course completion"],
    updated: "2026-05-19",
    sections: [
      { kind: "p", body: "The progress bar at the top of the lesson player + the sidebar is computed from completed lessons / total lessons. Your last-viewed lesson is remembered per course so you can pick up where you left off." },
    ],
  },

  // ----------------------------------------------------------------
  // New articles — features shipped in the most recent releases.
  // Listed at /whats-new and indexed from /help.
  // ----------------------------------------------------------------

  "live-classes-livekit": {
    title: "Live classes on LiveKit Cloud",
    lede: "Why we moved off self-hosted Jitsi, what's the same for students, and what changes for instructors.",
    audience: "creator",
    keywords: ["livekit", "live classes", "video conferencing", "online teaching", "webrtc"],
    updated: "2026-05-20",
    sections: [
      { kind: "h2", text: "What changed" },
      { kind: "p", body: "In-house live classes now run on LiveKit Cloud. The student-facing flow didn't change — they still open the join link, set a display name once, and land in the room. What did change is the entire backend stack." },
      { kind: "h2", text: "Why we switched" },
      { kind: "ul", items: [
        "No more \"waiting for moderator\" gates that anonymous-friendly Jitsi instances increasingly enforced.",
        "No XMPP / Prosody / Jicofo / JVB octopus to host yourself — LiveKit is a single Go binary.",
        "UDP forwarding 'just works' on every browser and OS; no Colima-broke-my-recording diagnostic loops.",
        "Built-in egress (cloud recording) with direct upload to your S3-compatible bucket.",
        "Adaptive 1080p simulcast — students on weak networks fall back to a lower layer automatically.",
      ] },
      { kind: "h2", text: "What you do" },
      { kind: "p", body: "Nothing — existing live-class records keep working. New rooms automatically use LiveKit. If you want to self-host LiveKit later (instead of using LiveKit Cloud), one env var swap moves you over with no other code change." },
      { kind: "callout", tone: "info", body: "Free tier on LiveKit Cloud covers thousands of class-minutes per month. Egress (cloud recording) is metered separately — see the recordings doc." },
    ],
    related: [
      { slug: "live-classes-recordings", label: "Cloud recording → your CDN" },
      { slug: "recordings-index", label: "The Recordings index page" },
      { slug: "recording-player-dialog", label: "Watching a recording inline" },
    ],
  },

  "recordings-index": {
    title: "The Recordings index page",
    lede: "Every class with a recording in one searchable table — no hunting through individual classes.",
    audience: "creator",
    keywords: ["class recordings", "recordings library", "video archive"],
    updated: "2026-05-20",
    sections: [
      { kind: "p", body: "Open /dashboard/recordings (sidebar → Teach → Recordings). Every live class that has a recording_url shows up here, newest first." },
      { kind: "h2", text: "What you see" },
      { kind: "ul", items: [
        "Class title (links to the full class settings page)",
        "Linked course (or — if it was an instant class)",
        "Recorded date + time",
        "Duration in minutes",
        "Watch button — opens the same inline player dialog used everywhere else in the app",
      ] },
      { kind: "h2", text: "Search" },
      { kind: "p", body: "Fuzzy search across class titles. Type a fragment, hits update live. Sort is always newest-first; pin / favourites coming in a future release." },
    ],
    related: [
      { slug: "live-classes-recordings", label: "How recordings work" },
      { slug: "recording-player-dialog", label: "Watching a recording inline" },
    ],
  },

  "recording-player-dialog": {
    title: "Watching a recording inline",
    lede: "The Watch button on any recording opens a player dialog with full controls — no new-tab navigation.",
    audience: "creator",
    keywords: ["video player", "recording playback", "class video"],
    updated: "2026-05-20",
    sections: [
      { kind: "p", body: "Wherever a class recording is surfaced — the class detail page, the Recordings index, the post-class wrap screen, past-meetings tile — the Watch button opens a dialog with the video playing inline." },
      { kind: "h2", text: "Supported formats" },
      { kind: "ul", items: [
        "Native MP4 / WebM (your R2-hosted LiveKit recordings) — full HTML5 video controls + picture-in-picture.",
        "YouTube — converted to an embed automatically (privacy-enhanced nocookie domain).",
        "Vimeo — same.",
        "Loom, Wistia, and other recognised providers — iframe embed.",
        "Anything else — falls back to an \"Open in new tab\" link so nothing 404s.",
      ] },
      { kind: "h2", text: "Behaviour" },
      { kind: "p", body: "Autoplay is on so the recording starts the moment the dialog opens. Preload is metadata-only so the dialog opens instantly even on a slow connection. Click \"Open in new tab\" in the dialog header for a fullscreen viewing experience." },
    ],
  },

  "live-classes-recordings": {
    title: "Cloud recording → your CDN",
    lede: "How class recording works end-to-end: who clicks what, what gets stored where, and who gets notified.",
    audience: "creator",
    keywords: ["class recording", "cloud recording", "livekit egress", "cloudflare r2", "video storage"],
    updated: "2026-05-20",
    sections: [
      { kind: "h2", text: "Start a recording" },
      { kind: "p", body: "Inside the host view, click Start recording in the top-right of the call. LiveKit's egress workers spin up a headless browser that joins the room, captures the composited view (active speaker + filmstrip), encodes 1080p / 30fps H.264, and uploads the final MP4 to your Cloudflare R2 bucket." },
      { kind: "h2", text: "Stop + finalise" },
      { kind: "p", body: "Click Stop recording. The button flips to \"Finalizing recording…\" while LiveKit wraps the encode + upload. A backend poller checks every 15 seconds; the moment the file lands on R2, the class's recording_url is set and an email goes to the instructor." },
      { kind: "h2", text: "Where the file lives" },
      { kind: "p", body: "Object key: recordings/<roomCode>/<timestamp>.mp4 inside your R2 bucket. Public URL is your CDN base + the same key (e.g. https://cdn.thebigclass.com/recordings/...). The file is served directly from Cloudflare — no proxy through your backend, no bandwidth cost on your origin." },
      { kind: "h2", text: "What students see" },
      { kind: "p", body: "Once the recording URL is stamped, it appears on the class detail page, the past-meetings tile, and any course-recap surface. Students who join via the public live page can replay it; no separate account or login needed." },
      { kind: "callout", tone: "warn", body: "LiveKit Cloud egress is metered separately (~$0.30 per recorded hour at the time of writing). Free tier covers ~10 hours/month. Self-hosting the egress service unlocks unlimited recording at a fixed VPS cost." },
      { kind: "h2", text: "Email notification" },
      { kind: "p", body: "If you've set SMTP_HOST + SMTP_USER + SMTP_PASS + SMTP_FROM on the backend, the instructor gets a workspace-branded email titled \"Recording ready — {class title}\" with a Watch button linking to the CDN URL. Without SMTP, the would-have-been email is logged to the backend console — useful for local dev." },
    ],
    related: [
      { slug: "live-classes-livekit", label: "Live classes on LiveKit" },
      { slug: "recordings-index", label: "The Recordings index page" },
    ],
  },

  inbox: {
    title: "The unified Inbox",
    lede: "One place for student doubts, discussions, batch posts, public-site leads, and blog comments. Reply without leaving the page.",
    audience: "creator",
    keywords: ["inbox", "triage", "doubts", "discussions", "leads"],
    updated: "2026-05-20",
    sections: [
      { kind: "p", body: "Open /dashboard/inbox (sidebar → Community → Inbox). It aggregates five signals into one feed, sorted newest-first, with a count badge so you know at a glance whether there's work to do." },
      { kind: "h2", text: "What shows up" },
      { kind: "ul", items: [
        "Open student questions (Doubts & Q&A)",
        "Discussions where you owe a reply",
        "Recent batch-room posts (last 7 days) where you're an admin or instructor",
        "New leads captured from your public site",
        "Unread blog comments based on each post's review marker",
      ] },
      { kind: "h2", text: "Needs attention vs Show all" },
      { kind: "p", body: "Default view (Needs attention) only shows open / unresolved items. Flip to Show all to surface resolved doubts and contacted leads — useful when you've triaged something and want to find it again. Resolved items get a green Resolved badge." },
      { kind: "h2", text: "Filter pills" },
      { kind: "p", body: "Slice by source: Questions · Discussions · Batches · Leads · Blog. Each pill carries its own count." },
      { kind: "h2", text: "Pre-sale signals are highlighted" },
      { kind: "p", body: "Guest doubts (questions filed from your public course pages, not from logged-in students) and new leads get an accent border. They're the most revenue-sensitive items, so the eye should land there first." },
    ],
    related: [
      { slug: "inbox-reply", label: "Reply from the inbox" },
      { slug: "doubts-and-enquiries", label: "Doubts + pre-sale enquiries" },
    ],
  },

  "inbox-reply": {
    title: "Replying from the Inbox",
    lede: "Type a response inline. Your reply fires in-app + email + WhatsApp to the original sender.",
    audience: "creator",
    keywords: ["inbox reply", "doubt reply", "lead follow-up", "cross-channel notifications"],
    updated: "2026-05-20",
    sections: [
      { kind: "h2", text: "How to reply" },
      { kind: "p", body: "Click Reply on any row that supports it (doubts, discussions, leads). The row expands with a textarea + Send button. Type your message, hit Send. The reply gets appended to the source AND a notification fires to the original sender across every channel they're reachable on." },
      { kind: "h2", text: "Cross-channel fanout" },
      { kind: "ul", items: [
        "Doubt from a logged-in student → in-app bell + email + WhatsApp",
        "Doubt from a guest (public site) → email + WhatsApp (no in-app — they have no account)",
        "Discussion → in-app + email + WhatsApp to the discussion author",
        "Lead → email + WhatsApp; the lead is also auto-bumped from \"new\" to \"contacted\"",
      ] },
      { kind: "h2", text: "Mark resolved" },
      { kind: "p", body: "For doubts, a Mark resolved button appears inside the reply panel — close the thread without sending a message. Resolved items disappear from the default view but remain visible under Show all with a Resolved badge." },
      { kind: "callout", tone: "info", body: "Email + WhatsApp dispatch run through the same notifications pipeline used by class invites + assignment publishes. If SMTP isn't configured the email content is logged to the backend console so you can verify locally." },
    ],
    related: [
      { slug: "inbox", label: "The unified Inbox" },
      { slug: "doubts-and-enquiries", label: "Doubts + pre-sale enquiries" },
    ],
  },

  "batches-mentions": {
    title: "Tagging people in batch posts",
    lede: "@-mention any teacher or member to pull them into a thread. They get a louder notification across every channel.",
    audience: "creator",
    keywords: ["@mentions", "tagging", "batch posts", "cohort community"],
    updated: "2026-05-20",
    sections: [
      { kind: "h2", text: "How to tag" },
      { kind: "p", body: "In the batch Common Room composer, click the Tag button. A picker opens with two groups: Instructors (course instructor + co-instructors) and Members. Click a name and a styled @Name chip drops into your post at the cursor." },
      { kind: "h2", text: "What happens on Post" },
      { kind: "ul", items: [
        "Tagged users get a separate \"X tagged you in {Batch name}\" notification — louder than the regular new-post broadcast.",
        "The chip in the published post is a clickable link to the user's profile (opens in a new tab).",
        "Every other batch member still gets the regular \"New post in {Batch}\" notification (in-app + email + WhatsApp).",
        "Tagged users are excluded from the broadcast so they don't get pinged twice.",
      ] },
      { kind: "h2", text: "Tagging in replies" },
      { kind: "p", body: "Same picker is available in the comment composer. Tagging someone in a reply also pulls them in — they get the \"X tagged you in a reply\" notification even if they weren't already in the thread." },
    ],
    related: [
      { slug: "batches-attachments", label: "File attachments + previews" },
    ],
  },

  "batches-attachments": {
    title: "File attachments + previews",
    lede: "Drop any file into a batch post. The right preview renders automatically — images, videos, audio, PDFs, anything.",
    audience: "creator",
    keywords: ["file uploads", "attachments", "batch posts", "previews", "PDF preview", "video preview"],
    updated: "2026-05-20",
    sections: [
      { kind: "h2", text: "How to attach" },
      { kind: "p", body: "Click Attach in the batch Common Room composer and pick any file (multi-select supported). Each upload uses the same R2 pipeline as course thumbnails and lesson assets, so files end up on your CDN with a permanent URL." },
      { kind: "h2", text: "Type-aware previews" },
      { kind: "ul", items: [
        "Images (PNG / JPG / GIF / WebP / AVIF / SVG) → inline thumbnail; click to open fullscreen.",
        "Videos (MP4 / WebM / OGV / MOV) → inline <video> with native HTML5 controls + picture-in-picture.",
        "Audio (MP3 / WAV / OGG / M4A) → audio widget under the filename.",
        "PDFs → embedded preview iframe + a download chip beneath.",
        "Anything else → download chip with the filename + file size.",
      ] },
      { kind: "h2", text: "Empty bodies are allowed" },
      { kind: "p", body: "You can post a file with no commentary — drop a slides PDF and hit Post. The composer accepts body-only, attachment-only, or both." },
    ],
    related: [
      { slug: "batches-mentions", label: "Tagging people in batch posts" },
    ],
  },

  "getting-started": {
    title: "Get started in 5 minutes",
    lede: "A 4-step rail at the top of your dashboard walks you from empty workspace to live class. Self-hides once you're done.",
    audience: "creator",
    keywords: ["onboarding", "getting started", "new workspace", "first course"],
    updated: "2026-05-20",
    sections: [
      { kind: "p", body: "Brand-new tenants land on a Dashboard with a highlighted Get started card at the top. It tracks four milestones automatically — no checkbox to tick, no \"mark as done\" friction." },
      { kind: "h2", text: "The four steps" },
      { kind: "ul", items: [
        "Create your first course — just a title and a one-liner.",
        "Add a lesson — a video, doc, or text note.",
        "Schedule your first live class — sets up the room, the join link, and the calendar invite in one step.",
        "Invite your first student — send them the join link by email; they don't need an account.",
      ] },
      { kind: "h2", text: "Self-hiding logic" },
      { kind: "p", body: "Each step is marked done based on real data — does the tenant have a course? does any course have a lesson? do they have a live session scheduled? do they have any students? Once all four are true, the rail vanishes. If you'd rather hide it before completing, click the ✕ in the corner — the preference sticks in localStorage." },
      { kind: "h2", text: "Power-user note" },
      { kind: "p", body: "The card never re-appears once dismissed. If you want it back (e.g. on a fresh demo account), clear the localStorage key dashboard:getting-started:dismissed in the browser console." },
    ],
    related: [
      { slug: "sidebar-groups", label: "Collapsible sidebar" },
      { slug: "simple-advanced", label: "Simple / Advanced form mode" },
    ],
  },

  "sidebar-groups": {
    title: "Collapsible sidebar",
    lede: "30 nav items condensed into 5 collapsible groups + a pinned Dashboard. State sticks across sessions.",
    audience: "creator",
    keywords: ["sidebar", "navigation", "dashboard layout"],
    updated: "2026-05-20",
    sections: [
      { kind: "p", body: "The dashboard sidebar reorganised: Dashboard sits at the top, always visible, one click away. Everything else lives in 5 collapsible groups — Teach, Certificates, Community, Public site, Workspace." },
      { kind: "h2", text: "What's where" },
      { kind: "ul", items: [
        "Teach — Courses, Students, Batches, Live Classes, Recordings, Whiteboards, Quizzes, Assignments, Storefront, Analytics.",
        "Certificates — New Batch, Batch History, Templates.",
        "Community — Inbox, Discussions, Doubts & Q&A, Announcements, Leaderboard, Wall of Love, Refer & Earn.",
        "Public site — Overview, Home page, Pages, Brand, Public profile, Testimonials, Blog, Announcements, Lead inbox, Domain & URL.",
        "Workspace — Instructors, Manage Users, Developer, Trash, Settings.",
      ] },
      { kind: "h2", text: "Smart behaviour" },
      { kind: "ul", items: [
        "Default-open: Teach (the most-used section). Everything else is collapsed.",
        "The group containing the current page auto-expands.",
        "Collapsed groups still show a rolled-up count of pending items inside (e.g. unresolved doubts under Community).",
        "Open / closed state persists in localStorage across navigations and refreshes.",
      ] },
    ],
    related: [
      { slug: "getting-started", label: "Get started in 5 minutes" },
    ],
  },

  "simple-advanced": {
    title: "Simple / Advanced form mode",
    lede: "Course creation and live-class scheduling default to Simple — only the essentials. Flip to Advanced for the full surface.",
    audience: "creator",
    keywords: ["simple advanced mode", "form mode", "course creation", "live class form"],
    updated: "2026-05-20",
    sections: [
      { kind: "p", body: "Two forms in the dashboard now ship a Simple / Advanced toggle in the header: Create New Course (/dashboard/courses/new) and Schedule a Live Class (/dashboard/classes/new). The toggle controls how much of the form is visible." },
      { kind: "h2", text: "Course creation — Simple mode" },
      { kind: "ul", items: [
        "Basic Information (title, subtitle, description, category, level, language)",
        "Course Curriculum (modules + lessons)",
        "Course thumbnail",
        "Pricing",
      ] },
      { kind: "p", body: "Advanced adds back: Learning Outcomes, Certificate template, Requirements." },
      { kind: "h2", text: "Live-class scheduling — Simple mode" },
      { kind: "ul", items: [
        "Title",
        "Date & time + duration",
        "In-house room URL preview (auto-generated)",
        "One-line notification summary (\"24 students will be notified via In-app · Email · WhatsApp\")",
      ] },
      { kind: "p", body: "Advanced adds back: Course link, Description, Host picker, Provider override (Zoom / Meet / Teams), Custom URL, Recurrence card, per-channel notification toggles." },
      { kind: "h2", text: "Mode sticks per browser" },
      { kind: "p", body: "Each toggle stores its preference in localStorage so power users don't flip it every time. Defaults to Simple for first-time visitors." },
      { kind: "callout", tone: "info", body: "All fields hidden in Simple mode have sensible defaults applied at save time — they're not dropped from the database. You can fill them in later from the course / class settings pages." },
    ],
    related: [
      { slug: "course-create", label: "Create your first course" },
      { slug: "live-classes-schedule", label: "Schedule a live class" },
    ],
  },

  // ────────────────────────────────────────────────────────────────
  // Payouts — referenced from /dashboard/payouts and pricing FAQ
  // ────────────────────────────────────────────────────────────────
  payouts: {
    title: "How payouts work (where your money goes)",
    lede: "End-to-end explanation of how a student's payment becomes money in your bank account — gateway fees, settlement timing, and our 0% commitment.",
    audience: "creator",
    sections: [
      { kind: "p", body: "The Big Class never holds your money. When a student pays for a course, a download, or any storefront product, Razorpay (our payment gateway) collects the payment, deducts their standard fee, and settles the rest directly to the bank account you registered. Our cut is 0%, on every plan, forever." },

      { kind: "h2", text: "The flow, with numbers" },
      { kind: "p", body: "A student buys a ₹500 course from your storefront. Here's exactly what happens to that ₹500:" },
      { kind: "ul", items: [
        "Student pays ₹500 via UPI / card / netbanking — through Razorpay's secure checkout.",
        "Razorpay deducts their standard gateway fee (~2% for domestic UPI/cards, ~3% for international cards). That's roughly ₹10 on a ₹500 sale.",
        "The remaining ₹490 lands in your Razorpay linked-account balance.",
        "On Razorpay's settlement schedule (T+2 working days by default), the ₹490 settles to the bank account you connected.",
        "The Big Class takes ₹0. We never see the money — it goes from student → Razorpay → your bank. We can prove this because the funds never touch our merchant balance.",
      ] },

      { kind: "h2", text: "Settlement timing" },
      { kind: "p", body: "Default schedule: T+2 working days from the order capture. An order on Tuesday morning typically lands in your bank by Thursday. Weekends and bank holidays push timing out — Saturday's order usually settles Wednesday." },
      { kind: "p", body: "New accounts may be on T+3 for the first few weeks while Razorpay completes risk-onboarding. That's not us holding the money — Razorpay's settlement engine is the gate." },
      { kind: "callout", tone: "info", body: "Want faster? Razorpay offers next-day and instant-settlement add-ons (extra fee, payable to them directly). You can enable these on your Razorpay dashboard — we'll inherit the schedule automatically." },

      { kind: "h2", text: "What you need to set up payouts" },
      { kind: "p", body: "Open /dashboard/payouts and fill in the KYC form. Razorpay needs the following before they activate your linked account:" },
      { kind: "ul", items: [
        "Legal business name (proprietorship / LLP / private limited / individual)",
        "Business PAN (or your personal PAN for sole proprietors)",
        "Contact email + phone",
        "Registered address (street, city, state, PIN, country)",
        "Bank account where payouts should land (holder name exactly as in bank records, account number, IFSC)",
        "GSTIN if you're registered (optional but speeds up large-amount approvals)",
        "Authorised stakeholder name + email (the human Razorpay can contact about the account)",
      ] },

      { kind: "h2", text: "How long activation takes" },
      { kind: "p", body: "Standard: 24–48 hours after you submit. Razorpay runs PAN + IFSC checks against bureau data, sometimes asks for clarifications. You'll see status flip from \"In setup\" to \"Razorpay review\" to \"Active\" on /dashboard/payouts." },
      { kind: "p", body: "While in review, your storefront still works — students can browse and even buy — but settlements stay on Razorpay's side until the account flips to Active. No money is lost; it just queues." },

      { kind: "h2", text: "How to verify our 0% commitment" },
      { kind: "p", body: "Every settlement shows the gross / Razorpay-fee / net breakdown on the dashboard. Cross-check any row against your Razorpay merchant dashboard at dashboard.razorpay.com — the numbers will match to the paisa. Razorpay can't show a platform-fee column for us because we don't take one." },
      { kind: "callout", tone: "info", body: "If you ever see a discrepancy between The Big Class's reported numbers and Razorpay's, email welcome@thebigclass.com — that's an Article 1 escalation and we treat it as a hair-on-fire bug." },

      { kind: "h2", text: "BYO Razorpay (power users)" },
      { kind: "p", body: "If you already run a Razorpay merchant account with negotiated rates (1.6–1.8% instead of the public 2%), you can connect those credentials directly under /dashboard/payouts → Bring your own Razorpay. Checkouts will use your keys, money lands in your merchant balance, and you get whatever rate you negotiated. Our cut is still 0%." },
      { kind: "p", body: "Tradeoff: refunds, disputes, and settlement queries become your Razorpay dashboard conversation rather than ours." },

      { kind: "h2", text: "GST + invoices" },
      { kind: "p", body: "Customer-facing invoices (the receipt the student gets) carry your GSTIN and brand. The Big Class issues you a separate monthly invoice for the platform subscription — that one has our GSTIN on it. Two separate transactions, two separate paper trails." },

      { kind: "h2", text: "Refunds" },
      { kind: "p", body: "Refunds initiated from /dashboard/store reverse the payout: Razorpay claws the amount back from your balance (or your next settlement) and returns it to the student. Razorpay's gateway fee is non-refundable on most plans — your loss when a refund happens is the gateway fee, not the full amount. We don't take a cut of refunds either." },
    ] as Section[],
    related: [
      { slug: "getting-started", label: "Get started in 5 minutes" },
      { slug: "course-create", label: "Create your first course" },
    ],
  },

  // ----------------------------------------------------------------
  // Billing & lifecycle articles — written when we shipped the
  // trial-first signup, plan badge, and reason-capturing cancel flow.
  // ----------------------------------------------------------------

  "trial-and-plan-badge": {
    title: "Your trial, your plan, your time left",
    lede: "How the new sidebar badge shows what plan you're on and exactly how many days remain — and what happens when the trial ends.",
    audience: "creator",
    keywords: ["trial", "billing", "plan", "subscription", "trial ends", "days remaining"],
    updated: "2026-05-21",
    sections: [
      { kind: "h2", text: "Where to see it" },
      { kind: "p", body: "Every page in the dashboard now shows a small pill in the sidebar (or, on mobile, the top header) with your plan name and — if you're on a trial — the days remaining. Clicking the pill jumps straight to Billing & plan." },
      { kind: "h2", text: "What the colours mean" },
      { kind: "ul", items: [
        "Blue / primary — you're in a trial. The pill reads e.g. 'Studio · 9 days left'.",
        "Neutral — you're on a paid plan in good standing. The pill reads just the plan name.",
        "Amber — your subscription is cancelled but you still have access until the period end. The pill shows the end date.",
        "Red / destructive — a recent payment failed. The pill reads 'payment overdue'. Open Billing to retry.",
      ] },
      { kind: "h2", text: "How the trial works" },
      { kind: "p", body: "New workspaces start on a 14-day Studio trial with every paid feature unlocked. No card is needed to begin. If you don't upgrade by day 14, the workspace automatically returns to the free Starter plan — none of your content is lost, just the limits change." },
      { kind: "callout", tone: "info", body: "Want to commit before the trial ends? Open Billing & plan and click Upgrade. The 30-day refund window starts on the upgrade payment date — see the Refund Policy for details." },
    ],
    related: [
      { slug: "upgrade-mid-trial", label: "Upgrade mid-trial without losing days" },
      { slug: "cancel-with-reason", label: "Cancel — with or without deleting data" },
    ],
  },

  "upgrade-mid-trial": {
    title: "Upgrade mid-trial without losing days",
    lede: "Stay on the trial as long as you like — then upgrade the moment you're ready. Here's what happens to your remaining trial days.",
    audience: "creator",
    keywords: ["upgrade", "billing", "trial", "subscription", "razorpay"],
    updated: "2026-05-21",
    sections: [
      { kind: "h2", text: "When the payment gateway is involved" },
      { kind: "p", body: "Nothing on Razorpay happens until you click Upgrade. The trial lives only in our database. The first time you upgrade, we create your Razorpay customer + subscription, and you're redirected to their hosted checkout to authorise a UPI mandate or save a card." },
      { kind: "h2", text: "What you pay" },
      { kind: "ul", items: [
        "We bill the full first period (monthly, quarterly, half-yearly, or yearly) right away.",
        "Your remaining trial days are not 'lost' — features stay unlocked from day one of the trial, and now they stay unlocked beyond day 14 too.",
        "Pick yearly to save ~17% (the equivalent of two months free).",
      ] },
      { kind: "h2", text: "How fast it activates" },
      { kind: "p", body: "Most UPI mandates clear within a few seconds; cards typically activate instantly. We update your dashboard status the moment Razorpay confirms — the focus listener on the Billing page picks up the change when you switch tabs back from the checkout window. If something looks stuck, the Refresh button on the Billing page re-syncs from Razorpay manually." },
      { kind: "callout", tone: "info", body: "Need a different billing cadence later? Cancel and re-subscribe at the new cadence — pro-rata switches are coming, but for now this is the cleanest path." },
    ],
    related: [
      { slug: "trial-and-plan-badge", label: "Your trial, your plan, your time left" },
      { slug: "cancel-with-reason", label: "Cancel — with or without deleting data" },
    ],
  },

  "cancel-with-reason": {
    title: "Cancel — with or without deleting data",
    lede: "Cancelling a subscription is two questions: why you're leaving, and whether to keep your workspace on the free Starter plan or deactivate everything.",
    audience: "creator",
    keywords: ["cancel subscription", "delete account", "data retention", "billing"],
    updated: "2026-05-21",
    sections: [
      { kind: "h2", text: "Where to cancel" },
      { kind: "p", body: "Open Billing & plan from the sidebar, then click Cancel subscription on the current plan card. (If you're still on the trial, the same button reads 'Cancel trial'.)" },
      { kind: "h2", text: "What the dialog asks" },
      { kind: "ul", items: [
        "Reason — pick from the short preset list (too expensive, missing feature, switching tools, not using, hit bugs, temporary, other). This is the single biggest signal we have for what to fix.",
        "Tell us more — optional free-text up to ~2000 characters. Skip if you don't have anything specific to add.",
        "Also deactivate the account + data — leave this OFF if you want to keep the workspace and come back later. Turning it on signs everyone out and hides your courses, students, recordings, and certificates.",
      ] },
      { kind: "h2", text: "What happens after you confirm" },
      { kind: "p", body: "If you only cancelled the subscription, you keep paid access until the end of the current billing cycle, then auto-downgrade to the free Starter plan. If you also asked to deactivate the account, every user in your workspace is signed out and our login route refuses further sessions. We keep a soft-deleted copy of your data for the refund window in case you change your mind — see the Refund Policy and Privacy pages linked inside the dialog." },
      { kind: "callout", tone: "warn", body: "Deactivating the account is reversible only by emailing welcome@thebigclass.com within the retention window. After that, data is permanently removed." },
    ],
    related: [
      { slug: "trial-and-plan-badge", label: "Your trial, your plan, your time left" },
      { slug: "upgrade-mid-trial", label: "Upgrade mid-trial without losing days" },
    ],
  },

  // ────────────────────────────────────────────────────────────────
  // Engagement + retention (Phase 3/4 features)
  // ────────────────────────────────────────────────────────────────
  "leaderboard-gamification": {
    title: "Levels, badges, and streaks — how the leaderboard actually works",
    lede: "Every student in your workspace has a level, a streak, and a wall of unlockable badges. None of it is fluff — the points come from the work they do, the level shows them how far they've come, and the badges name the milestones they've already hit.",
    audience: "creator",
    keywords: ["leaderboard", "gamification", "levels", "badges", "streaks", "engagement", "xp", "rank"],
    updated: "2026-05-22",
    sections: [
      { kind: "h2", text: "What earns points" },
      { kind: "p", body: "Two halves: graded work + engagement. Both feed the same total." },
      {
        kind: "ul", items: [
          "Attended a live class — 10 pts.",
          "Took a quiz — 5 pts. Passed it — another 15.",
          "Submitted an assignment — 15 pts. Scored 80%+ on it — another 10.",
          "Finished a lesson — 2 pts. Finished a whole course — 50.",
          "Welcome bonus — 50 pts, once, on the day they sign up.",
          "Profile complete (avatar + phone) — 20 pts.",
          "Joined a community — 15 pts each, up to however many they join.",
          "Asked a doubt — 5 pts each.",
          "Posted on the Wall of Love — 10 pts.",
          "Daily activity — 1 pt per day, capped at 30. Encourages showing up without rewarding farming.",
        ]
      },
      { kind: "h2", text: "Levels" },
      { kind: "p", body: "Seven levels, point-based, named so they map onto a learning arc rather than a gaming ladder. The bar on the student's home page shows their XP-to-next-level so the climb feels concrete." },
      {
        kind: "ul", items: [
          "🌱 Newcomer — 0 to 99",
          "📘 Learner — 100 to 249",
          "🎓 Scholar — 250 to 499",
          "🏅 Achiever — 500 to 999",
          "⚡ Expert — 1,000 to 1,999",
          "🌟 Master — 2,000 to 4,999",
          "👑 Legend — 5,000+",
        ]
      },
      { kind: "h2", text: "Badges" },
      { kind: "p", body: "Sixteen achievement badges live on every student's leaderboard page — earned ones light up in amber, locked ones stay greyed with their unlock condition in the hover tooltip. They're all derived from existing stats, so no extra setup on your side." },
      {
        kind: "ul", items: [
          "Welcome aboard — joined the workspace.",
          "Profile star — avatar + phone filled in.",
          "First class · Regular — attended 1 / 5 live sessions.",
          "Quiz rookie · Quiz hunter — passed 1 / 5 quizzes.",
          "Sharpshooter — 3 assignments scored 80%+.",
          "Course finisher — completed a whole course.",
          "Social butterfly · Curious mind · Storyteller — 3 communities / 5 doubts / 1 wall post.",
          "Veteran · Dedicated — active 7 / 30 days.",
          "Top 10 · Podium · Champion — currently ranked top 10 / top 3 / #1.",
        ]
      },
      { kind: "h2", text: "Streaks" },
      { kind: "p", body: "A streak is the number of consecutive recent days a student has done anything — attended a class, taken a quiz, submitted an assignment, asked a doubt, or opened a lesson. The streak chip (🔥 N-day streak) shows up on their leaderboard card once it hits 2." },
      { kind: "p", body: "We walk backwards from today through their activity timestamps; the moment a day is missing we stop counting. Caps at 90 days." },
      { kind: "h2", text: "Why everyone starts non-zero" },
      { kind: "p", body: "Old behaviour: a brand-new workspace with no quizzes / classes had an empty leaderboard for weeks. The welcome bonus + engagement points fix that — on day one, every student appears with at least 50 pts, and joining a community or asking a doubt bumps them up before they ever take a quiz. Movement on the board reflects engagement, not just graded artefacts." },
      { kind: "callout", tone: "info", body: "Looking at points and want to know which lever to pull? The student's leaderboard page has a 'How you earned' card that splits their total into five named buckets (Engagement / Live classes / Quizzes / Assignments / Lessons & courses) with mini progress bars." },
    ],
    related: [
      { slug: "engagement-table", label: "Engagement table — spotting at-risk students" },
      { slug: "cohort-window", label: "Cohort start dates + countdown banner" },
    ],
  },

  "engagement-table": {
    title: "Engagement — who's about to churn, who's your champion",
    lede: "Every enrolled student × course gets a lifecycle stage chip — Champion, Active, Onboarding, Cooling, At risk, Churned — derived from the signals you already track. The table at /dashboard/students/engagement leads with the rows that need attention.",
    audience: "creator",
    keywords: ["engagement", "churn", "at risk", "retention", "instructor crm", "lifecycle", "students"],
    updated: "2026-05-22",
    sections: [
      { kind: "h2", text: "The six stages" },
      { kind: "p", body: "Most-concerning first — the table sorts that way too, so the rows that need a nudge sit at the top instead of being buried under a wall of 'Active'." },
      {
        kind: "ul", items: [
          "Churned — no activity for 30+ days. Often a write-off; you decide whether to attempt reactivation or move on.",
          "At risk — last activity 15 to 29 days ago. This is where one outreach saves the enrollment.",
          "Cooling — last activity 7 to 14 days ago. A nudge usually pulls them back.",
          "Onboarding — enrolled less than 7 days ago, regardless of activity. Don't flag them as cooling before they've had a chance.",
          "Active — any signal in the last 7 days. Keep them in flow.",
          "Champion — top 10% by points AND active. Your evangelist material.",
        ]
      },
      { kind: "h2", text: "What counts as 'activity'" },
      { kind: "p", body: "Last-active is computed across every signal we already track per student: attendance records, quiz attempts (started or completed), assignment submissions, doubts posted, and lesson-completion timestamps from their enrollment. Whichever is most recent wins." },
      { kind: "h2", text: "Bulk nudges" },
      { kind: "p", body: "Filter to a stage (e.g. 'At risk'), select the students you want to reach, and use the bulk-action bar to send either a 'Quick check-in' or a 'We miss you in class' come-back. Each fires through the existing notification pipeline — in-app, email, and WhatsApp, channel-respecting (a student who's opted out of WhatsApp won't get a WhatsApp ping)." },
      { kind: "h2", text: "Per-course view" },
      { kind: "p", body: "Open any course → Students tab to see the same lifecycle chips scoped to just that course's enrolled population. Useful when a cohort is misbehaving but the rest of the workspace is fine." },
      { kind: "callout", tone: "info", body: "This is a read-model — no new persistence. We compute the stage on every render from the data already in your store. Means a student's stage flips the instant they take an action, and unenrolling them removes their row entirely with no cleanup step on your side." },
    ],
    related: [
      { slug: "leaderboard-gamification", label: "Levels, badges, and streaks" },
      { slug: "doubts-and-enquiries", label: "Doubts + pre-sale enquiries" },
    ],
  },

  "cohort-window": {
    title: "Cohort start + end dates",
    lede: "Time-box a community to a cohort window — opens on a date, wraps on a date, with the right countdown / archive banner on the batch page. Leave both dates empty for an always-on group.",
    audience: "creator",
    keywords: ["cohort", "batch", "start date", "end date", "countdown", "community", "live cohort"],
    updated: "2026-05-22",
    sections: [
      { kind: "h2", text: "Setting the window" },
      { kind: "p", body: "Open /dashboard/batches/<id> → Community settings → Edit community. Two date pickers — 'Cohort starts' and 'Cohort ends'. Both optional." },
      {
        kind: "ul", items: [
          "Both set — a time-boxed cohort. Opens on the start date, wraps on the end date.",
          "Only starts set — a rolling cohort with a launch date. No end.",
          "Only ends set — an always-on community that wraps on a fixed date.",
          "Both empty — the default. The community is always-on and never archives.",
        ]
      },
      { kind: "h2", text: "What the banner says" },
      { kind: "p", body: "A single chip strip on the batch hero, with three states. No reconfiguration needed — the chip just reads the dates and computes." },
      {
        kind: "ul", items: [
          "Pre-launch (amber) — 'Cohort begins in N days · <date>'.",
          "Live (primary) — 'Cohort live · wraps in N days (<date>)'.",
          "Past (muted) — 'Cohort wrapped on <date>'.",
        ]
      },
      { kind: "h2", text: "Pairing with a course" },
      { kind: "p", body: "Cohorts make the most sense when paired with a course that has drip-unlocked modules. Set the cohort start date, then on the course set per-module unlock days (Module 2 = 7 days, Module 3 = 14, etc.). The cohort opens, modules unlock on schedule, the cohort wraps — that's a complete 'program' without renaming anything." },
      { kind: "callout", tone: "info", body: "The dates are display + scheduling hints — they don't hide the common room from members. If you want the room hidden before the cohort opens, switch visibility to 'closed' until launch day, then flip it back to 'open' / 'tag-gated'." },
    ],
    related: [
      { slug: "drip-modules", label: "Drip-unlock modules over time" },
      { slug: "community-auto-join", label: "Auto-join buyers into a course's community" },
    ],
  },

  "drip-modules": {
    title: "Drip — release modules over time",
    lede: "Lock Module 2 until Day 7, Module 3 until Day 14. Students see 'Unlocks on <date>' in the player instead of the lesson list. Set the offset days right in the curriculum editor.",
    audience: "creator",
    keywords: ["drip", "drip content", "module unlock", "scheduled release", "cohort", "pacing"],
    updated: "2026-05-22",
    sections: [
      { kind: "h2", text: "Setting it up" },
      { kind: "p", body: "Open the course → Curriculum tab → click a module to expand. Below the description, there's a 'Drip — unlock days after enrollment' field. Type a number from 0 to 365." },
      {
        kind: "ul", items: [
          "0 or blank — module is available immediately. The current default.",
          "7 — locked for the first 7 days after the student enrolls.",
          "14 — locked for the first 14 days. And so on.",
        ]
      },
      { kind: "p", body: "A live hint right beside the field reads 'Module locked for first N days' so you can see the effect without saving." },
      { kind: "h2", text: "What students see" },
      { kind: "p", body: "Locked modules in the player render a single amber card in place of the lesson list: '🔒 Unlocks on Mar 5, 2026. 4 lessons will be available — finish earlier modules in the meantime.' The module header shows a small lock chip." },
      { kind: "p", body: "Once the offset has elapsed, the lesson list appears and they can play through normally. No reload needed — the gate is computed every render." },
      { kind: "h2", text: "How the date is computed" },
      { kind: "p", body: "enrollment.enrolledAt + unlockOffsetDays. Each student's clock starts when they personally enroll, not when the course was published. Different students therefore see different unlock dates — exactly what you want for rolling enrollment." },
      { kind: "callout", tone: "info", body: "If you want every student in a cohort to see the same unlock date, pair drip with cohort start dates. Enroll everyone on the cohort start day; their offsets align automatically." },
    ],
    related: [
      { slug: "cohort-window", label: "Cohort start + end dates" },
      { slug: "course-curriculum", label: "Build a course curriculum" },
    ],
  },

  "whiteboard-edit-requests": {
    title: "Whiteboard edit access — students request, you approve",
    lede: "Students see your boards read-only by default. A 'Request edit access' button on the board page pings you in the notification bell; you approve from a dropdown on the same board. Approved students can edit alongside you; the rest just watch.",
    audience: "creator",
    keywords: ["whiteboard", "edit access", "permissions", "collaboration", "students", "instructor"],
    updated: "2026-05-22",
    sections: [
      { kind: "h2", text: "The student's side" },
      { kind: "p", body: "When a student opens one of your public whiteboards from /p/<tenant>/my/whiteboards/<id>, they see the canvas in read-only mode with a 'Request edit access' button in the top-right. Clicking it does two things:" },
      {
        kind: "ul", items: [
          "Drops a request row into the workspace's pending-requests list.",
          "Fires an in-app notification to you — title is 'NameStudent wants to edit \"BoardTitle\"', body invites you to approve or deny.",
        ]
      },
      { kind: "p", body: "From then on the request button on their side flips to 'Edit request pending' so they can't pile on duplicate notifications." },
      { kind: "h2", text: "Your side" },
      { kind: "p", body: "When a request is open, the board editor at /dashboard/whiteboards/<id> shows an 'Edit requests' button in the top bar with the pending count. Click it for a dropdown listing each pending student + Approve / Deny buttons." },
      {
        kind: "ul", items: [
          "Approve → the student is added to the board's invitedUserIds. Their next render drops readOnly and they can draw alongside you. We also fire them an in-app notification ('You can now edit \"BoardTitle\"').",
          "Deny → the request is marked declined. We notify the student ('Edit access denied — the instructor kept the board read-only.'). The board stays untouched.",
        ]
      },
      { kind: "h2", text: "Why not just make boards public-editable" },
      { kind: "p", body: "Two reasons. First, public-editable whiteboards become free-for-alls once a class gets large — someone always nukes the canvas by accident. Second, the request flow doubles as engagement signal: students who ask to edit are leaning in, and you'd usually rather know which students those are than blanket-grant everyone." },
      { kind: "callout", tone: "info", body: "Private boards (visibility = private, no invitees) stay private — students can't see them at all, let alone request access. Make a board 'public' from the editor's visibility chip to expose it to students in read mode." },
    ],
    related: [
      { slug: "private-whiteboards", label: "Private whiteboards + invitees" },
    ],
  },

  "community-auto-join": {
    title: "Auto-join buyers into a course's community",
    lede: "Set Course.defaultBatchId once, and every student who enrolls or buys the course lands inside that batch automatically. No 'now join the community' second sale, no manual roster keeping.",
    audience: "creator",
    keywords: ["community", "auto-join", "batch", "default batch", "course", "enrollment", "retention"],
    updated: "2026-05-22",
    sections: [
      { kind: "h2", text: "Set the default batch" },
      { kind: "p", body: "Open a course → settings → Default community → pick one of your batches. (Or set it up the other way: open the batch and link it back to the course.) That single field wires up the auto-join — no separate flow." },
      { kind: "h2", text: "What happens on each purchase" },
      {
        kind: "ul", items: [
          "Buyer completes checkout — storefront grants the course entitlement.",
          "An entitlement.course-granted event fires across the in-app store layer.",
          "The community store listens, looks up the course's defaultBatchId, and adds the buyer's userId to memberIds if they're not already in.",
          "The post-purchase 'What's next' page surfaces a 'Join the discussion' card pointing straight into the batch.",
          "Belt-and-braces: the next-step page also runs the same idempotent join, so a guest who skipped post-purchase still ends up in the community when they next visit.",
        ]
      },
      { kind: "h2", text: "Why this matters for retention" },
      { kind: "p", body: "Course completion rates are dragged down by 'I'll join the community later' — which almost always means 'never'. Auto-join removes the second sale: every buyer is in the room with the other students from the moment they pay, which means the first lesson question, the first 'hi I'm new' post, the first instructor reply all happen in one place instead of being spread across email threads." },
      { kind: "callout", tone: "info", body: "The auto-join is idempotent. Existing members aren't duplicated, and a student who later leaves the batch isn't forcibly re-added — they have to re-enrol or re-purchase to trigger it again." },
    ],
    related: [
      { slug: "cohort-window", label: "Cohort start + end dates" },
      { slug: "engagement-table", label: "Engagement — who's about to churn" },
    ],
  },

  "course-ai-draft": {
    title: "Draft a course from just the title (AI)",
    lede: "Type a course title, click 'Draft course from title', and the new-course form fills the description, subtitle, and curriculum for you. Edit anything before you hit Create.",
    audience: "creator",
    keywords: ["ai", "course creation", "generate course", "ai content", "course outline"],
    updated: "2026-05-21",
    sections: [
      { kind: "h2", text: "How to use it" },
      { kind: "ul", items: [
        "Open /dashboard/courses/new.",
        "Type the course title. That's the only required input.",
        "Click the 'Draft course from title' AI button next to the title field.",
        "Wait ~5-10 seconds for the description and outline to populate.",
        "Edit anything you don't love. Hit Create when you're ready.",
      ] },
      { kind: "h2", text: "What gets generated" },
      { kind: "ul", items: [
        "A rich description with sections + bullets — formatted, not a wall of text.",
        "A subtitle pulled from the first sentence of the description, when the subtitle field is empty.",
        "An outline of 4-8 modules with 3-6 lessons each, plus estimated minutes per lesson.",
        "Lessons default to the 'video' content type with the first lesson marked as a free preview. Swap content types per lesson from the curriculum editor.",
      ] },
      { kind: "h2", text: "When the button is hidden" },
      { kind: "p", body: "If your workspace operator hasn't configured an AI provider, the button hides itself rather than presenting a broken affordance. The same applies to every other AI surface in the dashboard." },
      { kind: "callout", tone: "info", body: "AI suggestions are a starting point. Always review and edit — the model doesn't know your audience or your teaching style as well as you do." },
    ],
    related: [
      { slug: "course-create", label: "Create your first course" },
      { slug: "course-curriculum", label: "Build a course curriculum" },
    ],
  },

  // ---------- Productivity / shortcuts ----------
  "fuzzy-search-and-slash": {
    title: "Fuzzy search and the “/” shortcut",
    lede: "Every list in the dashboard — courses, students, recordings, quizzes, assignments, products, instructors, team — has the same search field. Press “/” anywhere on the page to jump into it, and the matching is typo-tolerant.",
    audience: "creator",
    updated: "2026-05-22",
    keywords: ["search", "fuzzy", "keyboard shortcut", "slash", "/"],
    sections: [
      { kind: "h2", text: "Press “/” to focus" },
      { kind: "p", body: "From anywhere on a list page, tap the “/” key. The search input takes focus and pre-selects whatever is in it, so you can start typing immediately to replace the old query. We skip the shortcut when you’re already typing in another input — it never steals keystrokes from a form." },
      { kind: "p", body: "The shortcut shows up in the ? overlay alongside the page-local actions, so you don’t have to memorise it: just press ? and the shortcut card lists what’s wired on the current screen." },
      { kind: "h2", text: "Typos are fine" },
      { kind: "p", body: "Search is fuzzy. You can mistype a word and still find what you’re looking for. “javscrpt” still surfaces “JavaScript fundamentals”; “onbording” still surfaces “Onboarding cohort.” The matcher ranks exact substring hits highest, then falls back to in-order character matches with a gap penalty so closer matches sort first." },
      {
        kind: "ul", items: [
          "Courses — search by title, category, or description.",
          "Students — search by name or email.",
          "Recordings — search by class title.",
          "Quizzes — search by title.",
          "Assignments — search by title.",
          "Storefront — search by product title or slug.",
          "Instructors — search by name, email, or phone.",
          "Team — search by name or email.",
        ]
      },
      { kind: "h2", text: "Clearing the query" },
      { kind: "p", body: "When the field has a query, the “/” hint on the right swaps for an X button. Click it (or hit Escape after focusing) to clear and re-show the full list." },
      { kind: "callout", tone: "info", body: "On mobile the “/” hint hides itself — touch keyboards don’t map to it cleanly. The fuzzy match still works." },
    ],
    related: [
      { slug: "engagement-table", label: "Engagement — at-risk students at a glance" },
      { slug: "sidebar-groups", label: "Collapsible sidebar" },
    ],
  },

  // ---------- Engagement ----------
  "engagement-bottom-actions": {
    title: "Send a check-in or come-back nudge",
    lede: "The engagement table now ships with two always-visible buttons at the bottom of the page — Send check-in and Send come-back. They work whether or not you’ve selected rows.",
    audience: "creator",
    updated: "2026-05-22",
    keywords: ["engagement", "nudge", "check-in", "come-back", "students", "retention"],
    sections: [
      { kind: "h2", text: "Two buttons, two intents" },
      { kind: "p", body: "Send check-in is the warm one — for students who are progressing but might benefit from encouragement. Send come-back is the rescue version — for students who’ve gone quiet. Both open the same preview dialog with editable subject + body and a multi-channel send (in-app + email + WhatsApp where opted in)." },
      { kind: "h2", text: "Recipients" },
      {
        kind: "ul", items: [
          "If you’ve ticked any rows, the nudge fires to that selection — count shown above the button.",
          "If nothing is ticked, the nudge fires to every student currently visible after your filters. The button label reflects this.",
          "Tighten the audience with the search field and filter chips first, then hit Send.",
        ]
      },
      { kind: "h2", text: "Before you send" },
      { kind: "p", body: "The preview dialog shows the subject, the body, and a live email preview using your portal brand. Edit either freely — your changes ride along on every recipient in the batch. The system stamps {{name}} per recipient at send time, so you keep one template instead of N." },
      { kind: "callout", tone: "warn", body: "WhatsApp delivery requires the student to have opted in. We won’t silently fall back — students without opt-in just receive the in-app + email versions." },
    ],
    related: [
      { slug: "engagement-table", label: "Engagement — at-risk students at a glance" },
      { slug: "notifications", label: "Notifications — in-app, email, WhatsApp" },
    ],
  },

  // ---------- Tabs / persistence ----------
  "tab-persistence": {
    title: "Tabs stay where you left them",
    lede: "Refresh the brand editor or a student detail page and the tab you were on is still active — no more landing back on the first tab every time the page reloads.",
    audience: "creator",
    updated: "2026-05-22",
    keywords: ["tabs", "refresh", "url", "persistence", "brand", "student"],
    sections: [
      { kind: "h2", text: "How it works" },
      { kind: "p", body: "Switching tabs writes the active tab into the URL as a ?tab= query parameter. Reload, share the link, bookmark it, navigate back from a sub-page — the tab survives all of it. The first tab on each page omits the param (so the URL stays clean for the common case)." },
      { kind: "h2", text: "Where it’s live" },
      {
        kind: "ul", items: [
          "Portal → Brand (Templates / Identity / Style / Layout / Advanced).",
          "Students → student detail (Overview / Activity / Doubts / Invoices / Messages).",
          "Other tabbed surfaces are migrating over the next few releases — same pattern.",
        ]
      },
      { kind: "h2", text: "Sharing a tab" },
      { kind: "p", body: "Copy the URL while on the Style tab and send it to a co-instructor — they land on Style, not on the default. Useful for design review sessions where you don’t want to spend the first 30 seconds saying “click the third tab.”" },
      { kind: "callout", tone: "info", body: "If you pass an unknown ?tab= value (typo, stale link, removed tab), we silently fall back to the first tab — no error toast." },
    ],
    related: [
      { slug: "portal-template", label: "Pick a portal template" },
      { slug: "engagement-table", label: "Engagement — at-risk students at a glance" },
    ],
  },

  // ---------- Customer-facing URLs ----------
  "customer-urls-add-to-nav": {
    title: "Add a customer-facing URL to your nav in one click",
    lede: "The Customer-facing URLs card on the brand page now has an Add to nav button next to each URL. Click it and the link drops straight into your header — no context-switching to the nav editor.",
    audience: "creator",
    updated: "2026-05-22",
    keywords: ["nav", "header", "customer urls", "portal", "branding"],
    sections: [
      { kind: "h2", text: "Where it lives" },
      { kind: "p", body: "Portal → Brand → Identity tab → Customer-facing URLs card. You’ll see four production URLs (Sign in, Forgot password, My library, Shop). Each row has a small Add to nav button next to the label." },
      { kind: "h2", text: "What clicking does" },
      {
        kind: "ul", items: [
          "We push the link into config.nav.items, so it appears in the header nav alongside your other curated entries.",
          "The href stored is the portal-relative path (e.g. /login, /store) so it auto-resolves to the right destination whether the portal is on a path, subdomain, or your own custom domain.",
          "If the link is already in the nav, the button switches to “In nav” and disables — no duplicates.",
        ]
      },
      { kind: "h2", text: "Reordering or removing afterwards" },
      { kind: "p", body: "Once it’s in, the link is just a regular nav entry. Open Portal → Brand → Layout → Header nav to drag it into position, rename it, or remove it. The Add to nav button is a shortcut for the first 80% of cases — the nav editor is still the source of truth." },
      { kind: "callout", tone: "info", body: "We hide the dev-host URL (localhost/path form). Only the production subdomain URL is shown — that’s the link you’d actually paste into a marketing page or email." },
    ],
    related: [
      { slug: "customer-urls", label: "Customer-facing URLs (paths today, subdomains soon)" },
      { slug: "portal-domain", label: "Custom domain + auto-SSL" },
    ],
  },

  // ---------- Payouts / fees ----------
  "payouts-gateway-fees": {
    title: "What Razorpay’s gateway fee actually costs",
    lede: "Gateway fees depend on the payment method (UPI, card, netbanking, international). The exact number is set by Razorpay, not us — we link straight to their pricing page so you’re never reading a stale number.",
    audience: "creator",
    updated: "2026-05-22",
    keywords: ["razorpay", "payouts", "gateway fee", "settlement", "pricing"],
    sections: [
      { kind: "h2", text: "Why we don’t quote a fixed percentage" },
      { kind: "p", body: "Razorpay’s rate card is a matrix: UPI is the cheapest, domestic cards are mid-band, international cards are the highest, and the fees flex with your processing volume. Anything we print on the dashboard is going to be out of date within a quarter. We’d rather under-promise than mislead." },
      { kind: "h2", text: "Where to see the live rate" },
      {
        kind: "ul", items: [
          "Open razorpay.com/pricing for the public rate card.",
          "Inside your Razorpay dashboard you’ll see the negotiated rate for your account (sometimes lower than public, if you’ve hit volume tiers).",
          "Per-transaction fee is shown in your Razorpay dashboard alongside each settlement — that’s the source of truth.",
        ]
      },
      { kind: "h2", text: "Where the money actually flows" },
      { kind: "p", body: "Money never sits in our accounts. Razorpay deducts their fee at checkout and settles the net amount directly to the bank you registered, on Razorpay’s own schedule (typically T+2 working days)." },
      { kind: "h2", text: "Our cut" },
      { kind: "p", body: "Zero. You’re paying us for the platform via your subscription plan, not via per-transaction skim. Verify it any time against your Razorpay dashboard — what they settle is what hits your bank, untouched by us." },
      { kind: "callout", tone: "info", body: "If you bring your own Razorpay account (BYO mode), the fee structure is whatever you’ve negotiated directly with Razorpay. The same dashboard URL applies — you’re looking at your own rate card." },
    ],
    related: [
      { slug: "products-checkout", label: "Checkout flow + India payment stack" },
    ],
  },

  // ---------- Students onboarding ----------
  students: {
    title: "How student onboarding works",
    lede: "Three ways students land in your roster — invite link, CSV import, or manual add. Each path's mechanics, what the student sees, and when to use which.",
    audience: "creator",
    sections: [
      { kind: "h2", text: "The three paths" },
      {
        kind: "ul", items: [
          "Invite link — paste once, anyone with the link self-onboards. Best for marketing, social, WhatsApp groups.",
          "CSV import — bulk-add a cohort from a spreadsheet. Best for batches you already have a list of.",
          "Add one manually — quick name + email form. Best for the occasional individual.",
        ]
      },
      { kind: "h2", text: "Invite link" },
      { kind: "p", body: "Open /dashboard/students → Share an invite link (or the Share link button on the empty-state). We surface your workspace URL plus pre-written WhatsApp + email copy you can fire off in one tap." },
      { kind: "p", body: "Anyone who opens the link lands on your course catalog. They sign up (one screen) and the account is provisioned in your workspace immediately. No seat allocation step — students are free up to your plan's student cap." },
      { kind: "callout", tone: "info", body: "Same link, infinite invitees. Rotate it only if it leaked somewhere you didn't want — there's no usage cap to worry about." },
      { kind: "h2", text: "CSV import" },
      { kind: "p", body: "Open /dashboard/students → Add → Import CSV. Drop a file with name + email columns (other columns are optional and map automatically). We dedupe by email so re-importing the same file twice is safe." },
      {
        kind: "ul", items: [
          "Names are imported as-is — exact match including capitalisation.",
          "Email is the unique key. Existing students aren't created twice.",
          "Optional columns: phone, dateOfBirth, school, city. We read them if present.",
        ]
      },
      { kind: "h2", text: "Manual add" },
      { kind: "p", body: "/dashboard/students/new → fill name + email. The student gets a 'You've been added to <workspace>' email with a one-click sign-in. They don't pick their own password — they land signed-in via the email link and can set one from /p/<tenant>/settings if they want." },
      { kind: "h2", text: "What the student sees once they're in" },
      {
        kind: "ul", items: [
          "The course catalog at /p/<tenant>/courses — every published course in your workspace.",
          "Their library at /p/<tenant>/library — anything they've enrolled in.",
          "The class wall for any batch they've joined.",
        ]
      },
    ],
    related: [
      { slug: "course-bulk-import", label: "Bulk-import students via CSV" },
      { slug: "learner-sign-in", label: "How learners sign in" },
    ],
    keywords: ["student", "onboarding", "invite", "csv import", "roster"],
  },

  // ---------- Experiments ----------
  experiments: {
    title: "Experiments — A/B test your portal",
    lede: "Run experiments on your hero CTA copy, course price display, and anywhere else you want to know what converts. Sticky per-visitor assignments, server-side fairness, conversion reporting.",
    audience: "creator",
    sections: [
      { kind: "h2", text: "Why bother" },
      { kind: "p", body: "Most pricing + landing-page decisions are gut calls. They don't have to be. The Experiments module lets you split traffic across two or three variants of a piece of UI, measures who clicks / enrols / converts, and tells you which variant won — without you writing any code." },
      { kind: "h2", text: "Who it's for" },
      {
        kind: "ul", items: [
          "Instructors who want to test 'urgent' vs 'aspirational' hero copy.",
          "Course creators wanting to A/B price-display formats (strikethrough first vs 'Save $X' chip vs current).",
          "Anyone who's ever wondered 'would more students enrol if I changed the button?' and not had a way to find out.",
        ]
      },
      { kind: "h2", text: "Pre-built vs custom" },
      { kind: "p", body: "The Experiments admin lists pre-built cards for the surfaces we've already wired up (hero CTA copy, course price display). One click spins those up — variants + goal events are pre-filled, you just pick traffic split + activate. Behind the scenes it's the same engine you'd use for a custom experiment, just with the rendering already done." },
      { kind: "p", body: "Custom experiments are for surfaces your team has wired with useExperiment yourself. They're identical in mechanics — pre-built ones just skip the integration step." },
      { kind: "h2", text: "How assignment works" },
      {
        kind: "ul", items: [
          "Each visitor gets a sticky id stored in localStorage on first hit.",
          "We hash (visitorId + experimentKey) to pick a variant. Same visitor + same experiment = same variant forever, even across sessions.",
          "Weights determine traffic split — equal weights mean 50/50, 1/9 means 10% to one variant and 90% to the other.",
          "An exposure event is logged the first time a visitor sees each variant. Conversion events are logged when they fire the goal action (e.g. 'enroll' or 'hero-cta-click').",
        ]
      },
      { kind: "h2", text: "Reading the report" },
      { kind: "p", body: "Open the experiment from /dashboard/experiments to see exposures + conversions per variant, plus the conversion rate. We don't compute statistical significance for you — the rule of thumb is wait until each variant has at least 200–300 exposures before reading anything into the difference." },
      { kind: "callout", tone: "info", body: "Status matters: draft = no traffic, running = traffic split per weights, paused = stop new assignments but keep existing visitors on their sticky variant, completed = report-only. Draft → running when you're ready to ship the test." },
      { kind: "h2", text: "Example: hero CTA copy" },
      { kind: "p", body: "Three variants are pre-wired: editor copy (whatever you typed in the page builder), 'Start free today' (urgent), 'Begin your journey' (aspirational). Goal event: hero-cta-click. Spin it up, send your normal traffic at it for a week, and you'll have an empirical answer to 'does urgency outperform aspiration on my audience?'." },
      { kind: "h2", text: "Example: course price display" },
      { kind: "p", body: "Three variants for the price chip: current (price + strikethrough + % off), anchor-first (strikethrough first, price below), savings ('Save $X' chip + price). Goal event: enroll. Pick which framing actually drives the cheque-out, not which one looks nicest in Figma." },
    ],
    related: [
      { slug: "analytics-dashboard", label: "What the analytics dashboard tracks" },
    ],
    keywords: ["experiments", "ab test", "a/b testing", "conversion", "split test"],
  },

  // ---------- In-class wedges (May 2026 sprint) ----------
  "live-polls": {
    title: "Run a live poll during class",
    lede: "Drop a 2–4 option poll into the live room. Students vote inside the call, results render in real time, and a notification fans out to every enrolled student + invited co-instructor.",
    audience: "creator",
    updated: "2026-05-22",
    keywords: ["live poll", "in-class poll", "engagement", "student voting", "notification"],
    sections: [
      { kind: "h2", text: "Launch a poll" },
      { kind: "p", body: "Open the host view at /dashboard/classes/<id>/host. The right-rail Poll panel has a composer pinned at the top — type a question, add 2–4 options, hit Launch. The poll appears for every joined participant within ~500ms via the in-call data channel." },
      { kind: "h2", text: "What students see" },
      { kind: "ul", items: [
        "An overlay card with the question and tap-to-vote chips.",
        "After voting, the card flips to live results — bar per option with vote count + percentage.",
        "Their vote is sticky across reconnects (we key it to participant id, not socket).",
      ]},
      { kind: "h2", text: "Notification fan-out" },
      { kind: "p", body: "The moment you launch the poll, every enrolled student and every invited co-instructor on the course gets a notification — in-app bell + (per their channel preferences) email or WhatsApp. The notification deep-links straight to the live URL so they can vote even if they're on another tab." },
      { kind: "p", body: "When you close the poll, a second notification ships with the result: winner label, vote count, and percentage. Re-watchers see the question + the result baked into the recording so it stays referenceable after the class." },
      { kind: "callout", tone: "info", body: "Hosts don't receive their own poll notifications — recipients = enrolled ∪ co-instructors, minus the launching host." },
    ],
    related: [
      { slug: "raised-hands", label: "How the raised-hand queue works" },
      { slug: "in-class-agenda", label: "Mark agenda items done in class" },
      { slug: "class-chat-transcript", label: "Class chat persists to the recording" },
    ],
  },

  "raised-hands": {
    title: "How the raised-hand queue works",
    lede: "Students signal a question without unmuting. Host sees a queue ordered by raise time with a one-click Answer button and a 'Live #N' badge.",
    audience: "creator",
    updated: "2026-05-21",
    keywords: ["raised hand", "queue", "q&a", "questions", "live class"],
    sections: [
      { kind: "h2", text: "Student side" },
      { kind: "p", body: "In the live call, students tap the raised-hand icon in the bottom bar. Their hand goes up immediately — others in the room see a small ✋ over their tile. They can lower it any time, or the host can clear it after answering." },
      { kind: "h2", text: "Host queue" },
      { kind: "p", body: "The host's right-rail Hands panel shows everyone who's raised, ordered by raise time (oldest first). Each row has the student name, how long their hand has been up, and an Answer button. Click Answer to clear them from the queue and signal you're addressing them now." },
      { kind: "ul", items: [
        "Order by raise time — fair-first-in-first-out.",
        "Live #N badge on the panel so you see backlog depth at a glance.",
        "Persists across host reconnects — the queue lives on the data channel, not the host browser.",
        "Auto-clears when the room ends.",
      ]},
      { kind: "callout", tone: "info", body: "Hands are scoped to the current session. Closing the room wipes the queue — there's no notion of a hand persisted into a future class." },
    ],
    related: [
      { slug: "live-polls", label: "Run a live poll during class" },
      { slug: "in-class-agenda", label: "Mark agenda items done in class" },
    ],
  },

  "in-class-agenda": {
    title: "Mark agenda items done in class",
    lede: "Add an agenda when you schedule the class. During the call, mark items done, skipped, or timestamped. Late joiners get a one-line recap of what they missed.",
    audience: "creator",
    updated: "2026-05-20",
    keywords: ["agenda", "class checklist", "pacing", "lesson plan"],
    sections: [
      { kind: "h2", text: "Set the agenda" },
      { kind: "p", body: "Open the class edit form → Agenda section. Add items in order; each is a short string ('Recap last week', 'New material', 'Q&A'). The agenda renders in the host's right rail during the call and in the student waiting room before it." },
      { kind: "h2", text: "During the class" },
      { kind: "ul", items: [
        "Click an item to mark it Done — a timestamp is captured.",
        "Right-click (or long-press on mobile) to mark Skipped instead.",
        "Done count chip ('3 / 7') sits at the top of the panel — a live pacing signal.",
        "Late joiners see a 'You missed: <list of done items>' banner when they enter, so they're not lost.",
      ]},
      { kind: "h2", text: "After the class" },
      { kind: "p", body: "Done items + timestamps roll into the wrap wizard's summary draft. If you used the AI summary button, the agenda items seed the prompt so the recap reflects what actually happened, not what you planned." },
    ],
    related: [
      { slug: "raised-hands", label: "How the raised-hand queue works" },
      { slug: "live-classes-schedule", label: "Schedule a live class" },
    ],
  },

  "recording-chapters": {
    title: "Auto-chapters from your transcript",
    lede: "Every recording auto-generates chapter markers from the transcript. Transition phrases like 'now let's talk about…' become seekable chapter points in the player.",
    audience: "creator",
    updated: "2026-05-21",
    keywords: ["chapters", "recording", "transcript", "video chapters", "navigation"],
    sections: [
      { kind: "h2", text: "How chapters are generated" },
      { kind: "p", body: "When a recording's WebVTT transcript is available, we scan cues for transition markers — phrases like 'now let's talk about', 'moving on to', 'next up', 'finally'. Each match becomes a candidate chapter at the cue's start time. We dedupe candidates within 90 seconds of each other so you never get a chapter cluster." },
      { kind: "h2", text: "Output" },
      { kind: "ul", items: [
        "5–12 chapters per recording (capped to keep the player chip rail readable).",
        "Minimum 90s spacing between chapters.",
        "Chip rail rendered below the video — click any chip to seek.",
        "Stored in the same recording metadata as the WebVTT URL; no extra processing step.",
      ]},
      { kind: "h2", text: "When chapters don't show up" },
      { kind: "p", body: "If there's no transcript, or the transcript has no recognised transition phrases, the chapter chip rail is hidden — we don't show empty UI. Add a transcript (or let the auto-transcription service finish) and reload the player to pick them up." },
      { kind: "callout", tone: "info", body: "The chapter parser is heuristic, not semantic. If your lecturing style doesn't include explicit transitions, expect fewer chapters — that's the system being honest rather than inventing fake structure." },
    ],
    related: [
      { slug: "recordings-index", label: "How the recordings index works" },
      { slug: "recording-player-dialog", label: "The recording player dialog" },
      { slug: "class-chat-transcript", label: "Class chat persists to the recording" },
    ],
  },

  "community-classes-tab": {
    title: "Surface your class series in the community",
    lede: "Every community attached to a course now has a Classes tab — upcoming live sessions, past recordings with watched badges, and a cohort window banner.",
    audience: "creator",
    updated: "2026-05-22",
    keywords: ["community", "classes tab", "cohort", "common room", "recordings"],
    sections: [
      { kind: "h2", text: "Where it lives" },
      { kind: "p", body: "Open any community whose attached course has live classes — there's now a Classes tab alongside Feed, Members, and Resources. The tab is hidden when the course has no live classes, so you don't get an empty surface." },
      { kind: "h2", text: "What it shows" },
      { kind: "ul", items: [
        "Upcoming live sessions for the course, in chronological order.",
        "A live banner with a Join button when the host opens the room.",
        "Recordings grid with per-viewer watched / in-progress / unwatched badges.",
        "Cohort window banner ('wraps in N days') when the course has an end date.",
      ]},
      { kind: "h2", text: "Auto-recap" },
      { kind: "p", body: "When the host finishes a class via the wrap wizard, a recap post auto-publishes into the community feed — title, summary, attendance, and the recording link. Re-watchers and absentees see what they missed without you having to copy-paste anything." },
    ],
    related: [
      { slug: "cohort-window", label: "Cohort window dates" },
      { slug: "community-auto-join", label: "Community auto-join on enrolment" },
      { slug: "recording-chapters", label: "Auto-chapters from your transcript" },
    ],
  },

  "instructor-bio-sync": {
    title: "Two-field bio model + AI help",
    lede: "Instructor profiles have a short bio (≤55 chars for cards) and a long About (rich text). Both auto-sync between the faculty form and the workspace profile page. AI 'Help me write' drafts three opinionated variants.",
    audience: "creator",
    updated: "2026-05-22",
    keywords: ["instructor", "bio", "faculty profile", "ai bio", "wysiwyg"],
    sections: [
      { kind: "h2", text: "The two fields" },
      { kind: "p", body: "Short bio — capped at ~55 characters, used on instructor cards and the storefront teacher rail. Treat it as a tagline, not a summary. About — long-form Tiptap editor for the workspace profile page (bold, italic, lists, links). Treat it as the 'tell me more' surface." },
      { kind: "h2", text: "Two-way sync" },
      { kind: "p", body: "Edit either field on the faculty edit form (/dashboard/faculty/<id>) and the change pushes to the public profile page within the same render. Edit on the public profile page and the faculty form picks it up on next load. There's a manual 'Sync from public profile' button if you've edited in another tab and want to pull the latest now." },
      { kind: "h2", text: "AI 'Help me write'" },
      { kind: "ul", items: [
        "Click the Sparkles button on either field.",
        "We generate three drafts in three voices: Warm, Authoritative, Outcome-led.",
        "Each draft is editable inline before you accept.",
        "Seed inputs: your name, role, workspace name, and any existing bio text — we never invent credentials.",
      ]},
      { kind: "callout", tone: "info", body: "Generated drafts are suggestions, not auto-applied. Nothing changes on your profile until you click Use this one." },
    ],
    related: [
      { slug: "faculty", label: "Invite a faculty member" },
      { slug: "onboarding-new-faculty", label: "Onboarding new faculty" },
    ],
  },

  "class-chat-transcript": {
    title: "Class chat persists to the recording",
    lede: "Every message in the live class chat is captured alongside the video. Re-watchers see the same questions and asides that the live audience saw, in time.",
    audience: "creator",
    updated: "2026-05-21",
    keywords: ["class chat", "transcript", "recording chat", "live chat", "side channel"],
    sections: [
      { kind: "h2", text: "How it works" },
      { kind: "p", body: "We listen to the LiveKit chat channel and persist every message with its sender, body, and timestamp to the session record. When the recording finishes uploading, the chat history is attached to it — no extra setup, no manual save." },
      { kind: "h2", text: "In the player" },
      { kind: "ul", items: [
        "A Chat tab sits next to Transcript in the recording player dialog.",
        "Messages render in chronological order with their original timestamps.",
        "Clicking a message seeks the video to that moment — handy for catching the context behind a question.",
        "Hosts can hide individual messages (moderation) without deleting them from the session record.",
      ]},
      { kind: "callout", tone: "info", body: "Chat persistence is on by default. To disable it for a class, untick 'Persist chat to recording' on the class edit form before the class starts. Toggling mid-class is intentionally not supported — the live audience has already seen the messages." },
    ],
    related: [
      { slug: "recording-chapters", label: "Auto-chapters from your transcript" },
      { slug: "recording-player-dialog", label: "The recording player dialog" },
      { slug: "live-polls", label: "Run a live poll during class" },
    ],
  },

  "waiting-room-presence": {
    title: "See who's actually in the lobby",
    lede: "Before you open the room, the host sees a live roster of every student who's loaded the waiting room. Polled every 3 seconds. Stops dispatch confusion of 'is anyone here yet?'.",
    audience: "creator",
    updated: "2026-05-20",
    keywords: ["waiting room", "lobby", "presence", "attendance", "live class"],
    sections: [
      { kind: "h2", text: "How presence is detected" },
      { kind: "p", body: "When a student opens /p/<tenant>/live/<roomCode> before the host has opened the room, we register them as present in the lobby. The signal refreshes every 3 seconds — close the tab and they drop off within ~6 seconds." },
      { kind: "h2", text: "Host view" },
      { kind: "ul", items: [
        "Right rail on /dashboard/classes/<id>/host shows the lobby roster.",
        "Names + initials, ordered by arrival.",
        "A running count chip ('5 in lobby') updates live.",
        "When you open the room, every lobby member auto-admits — no per-student click.",
      ]},
      { kind: "h2", text: "Why it matters" },
      { kind: "p", body: "Hosts ship a punctuality stat to students ('Maya started 92% of past classes on time') because of this signal. The lobby roster tells you whether to wait for stragglers or kick off; the auto-admit removes the friction of admitting 30 students one-by-one." },
      { kind: "callout", tone: "info", body: "Late joiners after you've opened the room skip the lobby — they auto-admit instantly and get the 'You missed: …' agenda banner so they catch up." },
    ],
    related: [
      { slug: "in-class-agenda", label: "Mark agenda items done in class" },
      { slug: "live-classes-schedule", label: "Schedule a live class" },
    ],
  },

  // ============================================================
  // Docs — the knowledge layer
  // ============================================================
  "docs-create-your-first": {
    title: "Create your first doc",
    lede: "Start from a template or a blank page. The editor is a Notion-style multiplayer surface — slash commands, drag-to-rearrange, keyboard shortcuts your team already knows.",
    audience: "creator",
    keywords: ["docs", "knowledge base", "wiki", "notion alternative", "study guide", "course handbook", "blocknote editor"],
    updated: "2026-05-24",
    sections: [
      { kind: "h2", text: "Open the hub" },
      { kind: "p", body: "Open /dashboard/docs. You'll see your sidebar tree on the left, recent docs in the middle, and the template gallery below. The gallery has eight scaffolds — Course handbook, Lesson study guide, Cohort wiki, Public knowledge hub, plus four operations templates." },
      { kind: "h2", text: "Pick a template (or start blank)" },
      { kind: "ul", items: [
        "Click any template tile — we copy its starter content into a new draft doc owned by you.",
        "Or click 'New blank doc' for an empty page seeded with a single paragraph.",
        "Templates are starting points — once a doc exists, you can change anything.",
      ]},
      { kind: "h2", text: "Write" },
      { kind: "p", body: "The editor is built on BlockNote with Liveblocks for multi-cursor editing. Type '/' anywhere to open the slash menu — every block type lives there, including our five typed embeds (lesson, recording, whiteboard, quiz, another doc)." },
      { kind: "ul", items: [
        "/ — slash menu (everything)",
        "Cmd/Ctrl + B / I / U — bold / italic / underline",
        "## + space — heading 2 (Markdown-in works for every block)",
        "Drag the handle on the left of any block to rearrange",
        "Drafts auto-save 300ms after the last keystroke — no save button",
      ]},
      { kind: "callout", tone: "info", body: "All docs start as Drafts visible only to you. Use the audience picker in the top-right when you're ready to share — see the publishing doc for the six audience options." },
    ],
    related: [
      { slug: "docs-embed-artifacts", label: "Embed lessons, recordings, whiteboards & quizzes" },
      { slug: "docs-publish-audiences", label: "Publish a doc — private to public" },
      { slug: "docs-ai-study-guide", label: "AI-generate a study guide from any class" },
    ],
  },

  "docs-embed-artifacts": {
    title: "Embed lessons, recordings, whiteboards & quizzes",
    lede: "Five typed embeds. Live references, not snapshots — when the source artifact changes, every doc embedding it shows the latest.",
    audience: "creator",
    keywords: ["embed lesson", "embed recording", "embed whiteboard", "embed quiz", "cross-link docs", "knowledge graph", "backlinks"],
    updated: "2026-05-24",
    sections: [
      { kind: "h2", text: "The five embeds" },
      { kind: "ul", items: [
        "Lesson — a card linking to any lesson in any course",
        "Recording — a past-class recording, optionally timestamped to a specific moment",
        "Whiteboard — a click-to-open preview of a canvas",
        "Quiz — a card pointing at a quiz from your bank",
        "Doc — cross-link to another doc (backlinks are automatic)",
      ]},
      { kind: "h2", text: "How to insert one" },
      { kind: "p", body: "Type '/' to open the slash menu, then start typing the embed type ('lesson', 'recording'…) or scroll to the 'Embeds from your academy' group. Click one and we open a searchable picker across every embeddable artifact in your workspace — pick the one you want and the card lands in your doc at the cursor." },
      { kind: "h2", text: "Why these are LIVE references" },
      { kind: "p", body: "Every embed stores only an id, not a snapshot. If a recording gets new chapters, a quiz gets two more questions, or a whiteboard gets re-saved, every doc embedding it shows the latest — automatically. No copy-paste rot." },
      { kind: "h2", text: "When the source disappears" },
      { kind: "p", body: "Deleted artifacts don't crash the doc. The embed renders a graceful '⚠ this embed pointed to a recording that no longer exists' stub, so you know what's missing and can replace or remove it." },
      { kind: "h2", text: "Backlinks come free" },
      { kind: "p", body: "Every embed writes an edge in the universal ReferenceEdge table. Open any recording/whiteboard/quiz and the right rail's Links tab shows every doc referencing it — no tags to maintain, no manual cross-links." },
      { kind: "callout", tone: "info", body: "The Doc editor's right rail has a 'Links' tab that shows what THIS doc embeds (forward links) and what embeds THIS doc (backlinks). Two-way graph, zero config." },
    ],
    related: [
      { slug: "docs-create-your-first", label: "Create your first doc" },
      { slug: "docs-ai-study-guide", label: "AI-generate a study guide from any class" },
    ],
  },

  "docs-publish-audiences": {
    title: "Publish a doc — private, cohort, course or public on the web",
    lede: "Six audiences, the same model as everything else on the platform. Public docs get a custom slug, OG metadata, and live at /p/<your-tenant>/k/<slug> on your portal.",
    audience: "creator",
    keywords: ["publish doc", "share doc", "doc audience", "private doc", "public doc", "knowledge hub", "seo doc", "cohort wiki"],
    updated: "2026-05-24",
    sections: [
      { kind: "h2", text: "Open the publish dialog" },
      { kind: "p", body: "In the doc editor top-right, click the audience pill (it shows the current state — 🔒 Private / Draft by default). The publish dialog opens with six options." },
      { kind: "h2", text: "The six audiences" },
      { kind: "ul", items: [
        "🔒 Private — only you.",
        "🛡 Admins + instructors — for SOPs, runbooks, internal docs.",
        "🏢 Everyone in workspace — workspace-wide announcements, staff handbooks.",
        "👥 Community — pick one cohort; only its members can see this doc.",
        "🎓 Course — pick one course; everyone enrolled (current and future) can see this doc.",
        "🌐 Public on the web — anyone with the URL, indexed by search engines.",
      ]},
      { kind: "h2", text: "Draft vs Published" },
      { kind: "p", body: "Every doc has a status orthogonal to audience. Audience says WHO can see it; status says WHETHER it's visible at all. A doc published to 'Course' but left as Draft stays invisible to the cohort until you flip status to Published." },
      { kind: "h2", text: "Public docs — slug & SEO" },
      { kind: "ul", items: [
        "Pick a slug — lowercase, hyphens. We validate against the reserved-slugs list so you don't collide with platform routes.",
        "Set SEO title, description and OG image — these override the doc's title for search engines and link previews.",
        "Toggle 'noindex' if you want the page reachable by URL but hidden from Google.",
        "The page lives at /p/<your-tenant>/k/<your-slug> on your portal — same chrome as the rest of your site. The hub index at /p/<your-tenant>/k lists every published-public doc.",
      ]},
      { kind: "h2", text: "Who gets notified" },
      { kind: "p", body: "When a doc goes public for the first time, every admin and instructor in the workspace (except the author) gets a notification. Cohort and course audience changes don't fan out — they're picked up next time a student loads the docs sidebar." },
      { kind: "callout", tone: "info", body: "Comment-only mode is the right setting for cohort wikis — students can leave comments without editing the doc itself. Set it on the publish dialog → Permissions toggle." },
    ],
    related: [
      { slug: "docs-create-your-first", label: "Create your first doc" },
      { slug: "docs-embed-artifacts", label: "Embed lessons, recordings, whiteboards & quizzes" },
      { slug: "seo-and-meta", label: "Tenant SEO + meta tags" },
    ],
  },

  "docs-ai-study-guide": {
    title: "AI-generate a study guide from any class",
    lede: "End-of-class wizard offers 'Draft a study guide'. We pull transcript + whiteboards + pinned chat questions and produce a publish-ready doc with the recording embedded at the right moments.",
    audience: "creator",
    keywords: ["ai study guide", "lesson notes from recording", "auto generate course notes", "class summary ai", "post-class wrap"],
    updated: "2026-05-24",
    sections: [
      { kind: "h2", text: "Where the prompt appears" },
      { kind: "p", body: "When you end a live class via /dashboard/classes/<id>/host, the End-of-Class wizard fires. One of its panels is 'Draft a study guide' — it shows up automatically when we have the transcript ready (typically within a minute of class end)." },
      { kind: "h2", text: "What we pull" },
      { kind: "ul", items: [
        "The class transcript (LiveKit egress + STT)",
        "Whiteboard snapshots taken during class",
        "Pinned questions from the chat panel",
        "The class metadata — title, course, cohort, instructor",
      ]},
      { kind: "h2", text: "What the AI drafts" },
      { kind: "ul", items: [
        "Title and short hook, derived from the class title + topics discussed.",
        "Sections corresponding to the major topic transitions (the same heuristics that produce recording chapters).",
        "Recording embeds at the right timestamps — 'see the explanation at 12:34' is a real link to that moment.",
        "A 5-question recall quiz at the end, drawn from the pinned questions. Accept, edit, or skip it.",
      ]},
      { kind: "h2", text: "Audience picker is part of the same flow" },
      { kind: "p", body: "Before you click 'Draft it', set the audience — usually the cohort that attended the class. The draft lands as a doc shared with that cohort the moment you click Publish. From here you can proof-read, tweak wording, drop additional embeds, then publish without leaving the editor." },
      { kind: "h2", text: "Backlink — 'generated from'" },
      { kind: "p", body: "The AI-generated doc records its source class via a 'generated-from' edge in the ReferenceEdge table. Open the source recording later and you'll see this doc listed in the backlinks rail — context flows both ways." },
      { kind: "callout", tone: "info", body: "Two-minute rule: most teachers proof-read an AI study guide in two minutes before publishing. The drafts are good, not perfect — your voice in the edits is what makes them yours." },
    ],
    related: [
      { slug: "docs-create-your-first", label: "Create your first doc" },
      { slug: "docs-publish-audiences", label: "Publish a doc — audiences" },
      { slug: "recording-chapters", label: "Auto-chapters from your transcript" },
    ],
  },

  // ============================================================
  // Public portal — the customer-facing site every tenant ships
  // ============================================================
  "portal-page-builder": {
    title: "Build a page with the section library",
    lede: "14 reorderable section types — drag, drop, show/hide, draft, publish. No code. No theme-template lock-in.",
    audience: "creator",
    keywords: ["page builder", "landing page", "drag and drop", "portal sections", "no-code", "site builder for creators"],
    updated: "2026-05-24",
    sections: [
      { kind: "h2", text: "Open the page editor" },
      { kind: "p", body: "Open /dashboard/portal/pages and pick the page you want to edit (Home, About, Courses, or any custom page you've created). The left rail lists every section currently on the page; the right rail is a live iframe preview of the public URL." },
      { kind: "h2", text: "The 14 section types you can add" },
      { kind: "ul", items: [
        "Hero — headline, subhead, eyebrow, two CTAs, optional background image with overlay, optional trust stats strip",
        "Features — 3+ column grid of titled points with icons",
        "Courses grid — published courses with thumbnails, ratings, price, early-bird countdown",
        "Store grid — digital products (sessions, memberships, downloads, webinars, licenses, bundles)",
        "Testimonials — student quotes with rating stars, avatar, featured subset",
        "Faculty — team cards with photos, bios, social links, course listings",
        "CTA — standalone call-to-action block with one or two buttons",
        "Rich text — Tiptap WYSIWYG for any custom copy",
        "FAQ — expandable Q&A pairs",
        "Stats — by-the-numbers row (student count, reviews, outcomes)",
        "Contact form — lead capture with custom fields",
        "Blog teaser — latest posts preview",
        "Video — embedded YouTube/Vimeo/MP4",
        "Image gallery — photo grid",
        "Logos strip — trusted-by row",
        "Trust badges — configurable icons (secure payment, refund window, support SLA)",
      ]},
      { kind: "h2", text: "Reorder, hide, or trash" },
      { kind: "ul", items: [
        "Drag the handle on any section to move it up or down. The preview updates as you drop.",
        "Click the eye icon to hide a section without deleting it (useful for seasonal sections).",
        "Click the trash icon to soft-delete — sections sit in trash for 7 days before purging, so accidental deletes are recoverable.",
        "Save a version — snapshots the current page state. Restore any version from history if a future edit goes wrong.",
      ]},
      { kind: "h2", text: "Drafts vs publish" },
      { kind: "p", body: "Pages have a draft and a published state. Visitors always see the last-published version; you edit drafts safely. Hit 'Publish' when ready — every change after that promotes again." },
      { kind: "callout", tone: "info", body: "Every page has per-page SEO. Set meta title, description, OG image, JSON-LD, and noindex flag in the same editor — no separate plugin to install." },
    ],
    related: [
      { slug: "portal-custom-domain", label: "Connect your custom domain" },
      { slug: "portal-themes-fonts", label: "Themes, fonts, and white-label" },
      { slug: "blog-publish", label: "Publish a blog post" },
    ],
  },

  "portal-custom-domain": {
    title: "Connect your custom domain",
    lede: "Every workspace ships on a free subdomain. Pro+ adds a CNAME flow so your portal lives at your own URL — your visitors never see thebigclass.com.",
    audience: "creator",
    keywords: ["custom domain", "cname", "white label", "own URL", "creator domain", "subdomain to root", "portal domain"],
    updated: "2026-05-24",
    sections: [
      { kind: "h2", text: "Your free subdomain (day one)" },
      { kind: "p", body: "When you sign up, you claim a subdomain like ananya.thebigclass.com. The full portal — home, courses, blog, store, faculty, contact — is live on that URL immediately. You can do everything on the free subdomain that you can on a custom domain; the URL is the only difference." },
      { kind: "h2", text: "Upgrade to a custom domain" },
      { kind: "p", body: "On Pro+ open /dashboard/portal/domain. Pick the subdomain you want to point at us — usually learn.<yourdomain>.com or academy.<yourdomain>.com. Avoid the apex (yourdomain.com) unless your DNS provider supports ALIAS records." },
      { kind: "h2", text: "Add the CNAME record" },
      { kind: "ul", items: [
        "In your DNS provider (GoDaddy, Cloudflare, Route 53, etc.), add a CNAME record",
        "Name (host) — learn (or whatever subdomain you picked)",
        "Value (target) — <your-slug>.thebigclass.com",
        "TTL — leave default (or 300 if you want fast propagation)",
        "Save",
      ]},
      { kind: "h2", text: "Verify + SSL" },
      { kind: "p", body: "DNS propagation can take a few minutes to a few hours. Once we detect the CNAME, your custom domain is live and serves over HTTPS — SSL is auto-provisioned. The dashboard banner shows current status (Pending DNS / Verifying SSL / Live)." },
      { kind: "callout", tone: "info", body: "You can keep the free subdomain redirecting to your custom domain so old links never break. Both URLs stay valid; one becomes canonical." },
    ],
    related: [
      { slug: "portal-page-builder", label: "Build a page with the section library" },
      { slug: "portal-themes-fonts", label: "Themes, fonts, and white-label" },
      { slug: "white-label", label: "Strip platform branding" },
    ],
  },

  "portal-themes-fonts": {
    title: "Themes, fonts, and white-label",
    lede: "8 designed theme presets, 6 header layouts, 6 footer layouts, Google Fonts picker, custom CSS on Pro+. White-label toggles strip every platform-branded element.",
    audience: "creator",
    keywords: ["portal themes", "creator theme", "fonts", "white label", "custom CSS", "brand colors", "portal layout"],
    updated: "2026-05-24",
    sections: [
      { kind: "h2", text: "Pick a theme preset" },
      { kind: "p", body: "/dashboard/portal/brand opens with the theme picker. Eight presets ship — Classic Academy, Forest Modern, Midnight Coral, Warm Mono, Ocean Fresh, Royal Bold, Sunset Warm, Mono Minimal. Click one to apply primary + accent + heading font + body font in one move. Tweak from there." },
      { kind: "h2", text: "Layouts (header + footer)" },
      { kind: "ul", items: [
        "6 header layouts — Split classic · Centered minimal · Split with CTA · Logo only · Floating pill · Promo marquee",
        "6 footer layouts — Multi-column · Compact mono · Newsletter CTA · Brand + contact · Centered tight · Card grid",
        "Pick once per portal; applies to every page",
      ]},
      { kind: "h2", text: "Fonts" },
      { kind: "p", body: "Heading and body fonts each have their own picker. We bundle the most-used Google Fonts (Playfair, Inter, Manrope, Outfit, Fraunces, Cinzel, Cormorant Garamond, and more). Custom Google Font upload is available on Studio+." },
      { kind: "h2", text: "Custom CSS (Pro+)" },
      { kind: "p", body: "When the presets don't quite hit it, drop scoped CSS into /dashboard/portal/brand → Advanced. Your rules are auto-namespaced to your tenant (selector wrapped in [data-portal-tenant=\"your-slug\"]) so they only apply to your portal and never leak across tenants." },
      { kind: "h2", text: "White-label toggles" },
      { kind: "ul", items: [
        "Hide 'Powered by The Big Class' — removes the thin attribution line in the portal footer.",
        "Hide every platform-branded element — stronger toggle that strips attribution from emails, share previews, and error pages too.",
        "Both ship with custom domain so visitors see only your brand at your URL.",
      ]},
    ],
    related: [
      { slug: "portal-page-builder", label: "Build a page with the section library" },
      { slug: "portal-custom-domain", label: "Connect your custom domain" },
      { slug: "white-label", label: "Strip platform branding" },
    ],
  },

  // ============================================================
  // Blog — the creator content engine
  // ============================================================
  "blog-publish": {
    title: "Publish a blog post (drafts, scheduling, pinning)",
    lede: "Write in a Tiptap editor, set tags, drop a cover image, schedule for a future date, optionally pin to the top. Per-post SEO and JSON-LD are auto-wired.",
    audience: "creator",
    keywords: ["blog post", "publish blog", "schedule post", "pin post", "creator blog", "content marketing"],
    updated: "2026-05-24",
    sections: [
      { kind: "h2", text: "Open the blog editor" },
      { kind: "p", body: "Open /dashboard/blog and click New post. Or, from the blog list, click any existing post to edit." },
      { kind: "h2", text: "Fill the basics" },
      { kind: "ul", items: [
        "Title — your H1, also the default meta title and OG title",
        "Slug — auto-suggested from the title; override if you want a shorter URL",
        "Excerpt — one-paragraph preview shown on the blog index and used as meta description fallback",
        "Cover image — appears at the top of the post and as the OG share preview if you don't set one explicitly",
        "Tags + categories — free-form labels; visitors can filter the blog index by them",
        "Body — Tiptap-powered rich-text editor (formatting, lists, links, images, code blocks)",
      ]},
      { kind: "h2", text: "Draft, schedule, or publish" },
      { kind: "ul", items: [
        "Save as draft — visible only to you. The blog index never shows drafts.",
        "Set scheduledFor — pick a future date/time. Our nightly cron auto-publishes when the time comes.",
        "Publish now — goes live immediately. Visitors see the post on /blog and /blog/<slug>. Sitemap and JSON-LD update.",
      ]},
      { kind: "h2", text: "Pin a post" },
      { kind: "p", body: "Toggle Pinned on. The post sticks to the top of /blog. You can pin up to three at once — extras are queued (newest pinned wins)." },
      { kind: "h2", text: "Reading time + author" },
      { kind: "p", body: "Reading time auto-calculates at 220 words per minute. Author is whichever workspace user is editing the post — appears as a byline with avatar." },
      { kind: "callout", tone: "info", body: "Comments are on by default. Toggle Allow comments off per post if you want a comment-free article." },
    ],
    related: [
      { slug: "blog-seo-per-post", label: "Per-post SEO and JSON-LD" },
      { slug: "blog-comments-reactions", label: "Comments, reactions, and moderation" },
      { slug: "portal-page-builder", label: "Build a page with the section library" },
    ],
  },

  "blog-seo-per-post": {
    title: "Per-post SEO and JSON-LD",
    lede: "Override meta title, description, and OG image per post. BlogPosting JSON-LD (with Organization + BreadcrumbList) auto-wires. Sitemap updates on publish.",
    audience: "creator",
    keywords: ["blog SEO", "JSON-LD article", "meta title", "OG image per post", "schema.org BlogPosting", "blog sitemap"],
    updated: "2026-05-24",
    sections: [
      { kind: "h2", text: "Where the SEO panel lives" },
      { kind: "p", body: "Inside any blog post → SEO tab. Three fields you'll set, three you can leave alone (sensible defaults apply)." },
      { kind: "h2", text: "What you can override" },
      { kind: "ul", items: [
        "Meta title — the <title> in the tab + the SERP headline. Defaults to your post title.",
        "Meta description — the snippet under the SERP headline. Defaults to your excerpt, then the first 160 chars of body.",
        "OG image — the social-share thumbnail. Defaults to your cover image, then your tenant default OG.",
        "noindex — hide this post from search engines while keeping it accessible by URL.",
        "Custom JSON-LD — paste your own structured-data block if you need a non-default schema.",
      ]},
      { kind: "h2", text: "Auto-wired JSON-LD" },
      { kind: "p", body: "Every published post auto-renders three structured-data blocks in a single @graph:" },
      { kind: "ul", items: [
        "BlogPosting — headline, description, image, datePublished, dateModified, author, wordCount, timeRequired, tags-as-keywords, category-as-articleSection",
        "Organization — your tenant brand name, logo, URL (publisher of the post)",
        "BreadcrumbList — Home → Blog → This post",
      ]},
      { kind: "h2", text: "Sitemap + robots" },
      { kind: "p", body: "The sitemap.xml regenerates on every publish so search engines discover new posts within hours, not weeks. Robots.txt auto-allows your blog paths." },
      { kind: "callout", tone: "info", body: "Reading time auto-calculates at 220 wpm and feeds into timeRequired in the JSON-LD. Rich-snippet eligible without any extra work." },
    ],
    related: [
      { slug: "blog-publish", label: "Publish a blog post" },
      { slug: "seo-and-meta", label: "Tenant SEO + meta tags" },
    ],
  },

  "blog-comments-reactions": {
    title: "Comments, reactions, and moderation",
    lede: "Six emoji reactions per post. Threaded comments with hidden-flag moderation. Subscribe form below every article. Native share API with clipboard fallback.",
    audience: "creator",
    keywords: ["blog comments", "blog reactions", "moderate comments", "blog engagement", "blog share", "blog subscribe form"],
    updated: "2026-05-24",
    sections: [
      { kind: "h2", text: "Comments" },
      { kind: "ul", items: [
        "Visible by default — toggle Allow comments off per post to silence one article",
        "Visitors leave a name + comment; signed-in students post under their profile",
        "Hide a comment via the moderation menu — it stays in the database but doesn't render publicly",
        "Notifications fan out to the post author when a new comment lands",
      ]},
      { kind: "h2", text: "Reactions" },
      { kind: "p", body: "Six curated emojis — 👍 ❤️ 🎉 💡 🔥 👀 — that visitors can toggle on each post. Counts persist; one reaction per visitor per emoji per post." },
      { kind: "h2", text: "Subscribe form" },
      { kind: "p", body: "A subscribe form renders below every post (and can be disabled per post). Submissions feed into your portal leads inbox — the same place contact-form leads land." },
      { kind: "h2", text: "Sharing" },
      { kind: "p", body: "The share button uses the Web Share API on mobile (iOS / Android show the native share sheet) and falls back to clipboard copy with a toast on desktop." },
      { kind: "callout", tone: "info", body: "Spam: comments don't currently have CAPTCHA. If you start getting spam, hide it via the moderation menu and consider disabling comments on high-traffic posts where the conversation doesn't add value." },
    ],
    related: [
      { slug: "blog-publish", label: "Publish a blog post" },
      { slug: "blog-seo-per-post", label: "Per-post SEO and JSON-LD" },
    ],
  },
}

// ---- Page ----

// SEO metadata. Per-article canonical, Open Graph, and Twitter
// blocks so articles surface well in search results + look right
// when shared. Title is capped at ~60 chars (everything past that
// gets truncated by Google) by leaving the article title alone
// and adding only " · Help" — most article titles already sit
// well under the limit.
const SITE_URL = "https://thebigclass.com"

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const article = TOPICS[slug]
  if (!article) return { title: "Help · The Big Class" }
  const url = `${SITE_URL}/help/${slug}`
  return {
    title: `${article.title} · Help · The Big Class`,
    description: article.lede,
    keywords: article.keywords,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      url,
      siteName: "The Big Class",
      title: article.title,
      description: article.lede,
    },
    twitter: {
      card: "summary",
      title: article.title,
      description: article.lede,
    },
  }
}

export default function HelpArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = use(params)
  const article = TOPICS[slug]
  if (!article) notFound()

  // Article structured data. Surfaces our help articles in
  // Google's rich results when they rank. Mirrors what we'd
  // emit from a CMS — keep this in sync with the article shape.
  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.lede,
    keywords: article.keywords?.join(", "),
    dateModified: article.updated,
    author: { "@type": "Organization", name: "The Big Class" },
    publisher: { "@type": "Organization", name: "The Big Class" },
    mainEntityOfPage: `${SITE_URL}/help/${slug}`,
  }

  return (
    <div className="flex min-h-screen flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <Header />
      <main className="flex-1">
        <article className="mx-auto max-w-3xl px-6 py-12 lg:px-8">
          <Button asChild variant="ghost" size="sm" className="-ml-2">
            <Link href="/help">
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              All help topics
            </Link>
          </Button>
          <header className="mt-4 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">
              {article.audience === "creator"
                ? "For creators"
                : article.audience === "learner"
                  ? "For learners"
                  : article.audience === "developer"
                    ? "For developers"
                    : "For admins"}
            </p>
            <h1 className="font-serif text-3xl font-bold tracking-tight sm:text-4xl">
              {article.title}
            </h1>
            <p className="text-lg text-muted-foreground">{article.lede}</p>
            {article.updated && (
              <p className="text-xs text-muted-foreground">
                Last updated {new Date(article.updated).toLocaleDateString(undefined, { dateStyle: "medium" })}
              </p>
            )}
          </header>

          <div className="prose prose-sm mt-8 max-w-none">
            {article.sections.map((s, i) => renderSection(s, i))}
          </div>

          {article.related && article.related.length > 0 && (
            <section className="mt-12 border-t border-border pt-6">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Related
              </p>
              <ul className="mt-2 space-y-1">
                {article.related.map((r) => (
                  <li key={r.slug}>
                    <Link
                      href={`/help/${r.slug}`}
                      className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                    >
                      {r.label} <ArrowRight className="h-3 w-3" />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </article>
      </main>
      <Footer />
    </div>
  )
}

function renderSection(s: Section, i: number) {
  switch (s.kind) {
    case "h2":
      return (
        <h2 key={i} className="mt-6 font-serif text-xl font-bold tracking-tight">
          {s.text}
        </h2>
      )
    case "p":
      return (
        <p key={i} className="mt-3 leading-relaxed text-foreground/90">
          {s.body}
        </p>
      )
    case "ul":
      return (
        <ul key={i} className="mt-3 list-disc space-y-1 pl-6 text-foreground/90">
          {s.items.map((it, j) => (
            <li key={j}>{it}</li>
          ))}
        </ul>
      )
    case "code":
      return (
        <pre
          key={i}
          className="mt-3 overflow-x-auto rounded-md bg-muted p-3 font-mono text-xs"
        >
          {s.body}
        </pre>
      )
    case "callout":
      return (
        <Card
          key={i}
          className={
            s.tone === "warn"
              ? "mt-4 border-amber-500/40 bg-amber-500/5"
              : "mt-4 border-primary/30 bg-primary/5"
          }
        >
          <CardContent className="p-3 text-sm">{s.body}</CardContent>
        </Card>
      )
  }
}
