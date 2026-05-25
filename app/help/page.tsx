// Help & guides index.
//
// Single browsable index of every help topic we ship. The list
// is the source of truth — articles linked from elsewhere (the
// dashboard, the developer landing, the marketing footer) should
// match exactly what's here so visitors never bounce between
// dead-end pages.
//
// Topics are grouped by audience (creators / learners /
// developers) because the same word can mean two different
// things to those audiences. Inside each group, ordered roughly
// by "what you need first".

import Link from "next/link"
import type { Metadata } from "next"
import {
  ArrowRight,
  Award,
  BarChart3,
  BookOpen,
  Bell,
  Briefcase,
  CalendarClock,
  ClipboardList,
  Code2,
  Coins,
  CreditCard,
  Download,
  FileText,
  Film,
  Globe,
  GraduationCap,
  Hand,
  Heart,
  KeyRound,
  Languages,
  Layers,
  Lock,
  Megaphone,
  MessageCircleQuestion,
  MessageSquare,
  Newspaper,
  Package,
  Palette,
  Play,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Trash2,
  TrendingUp,
  UserPlus,
  Users,
  Video,
} from "lucide-react"
import { Header } from "@/components/landing/header"
import { Footer } from "@/components/landing/footer"
import { Card, CardContent } from "@/components/ui/card"
import { ContactSupportDialog } from "@/components/support/contact-support-dialog"

export const metadata: Metadata = {
  title: "Help & guides · The Big Class",
  description:
    "Every guide for creators, learners, and developers — one searchable index. From inviting your first faculty member to issuing an API key.",
}

interface Topic {
  href: string
  title: string
  body: string
  icon: React.ElementType
  status?: "new" | "updated"
}

// Groups are alphabetised inside each section by article title
// so the index reads predictably; new articles are flagged with
// status:"new" so visitors can skim what changed.

const COURSES: Topic[] = [
  { href: "/help/course-ai-draft",            title: "Draft a course from just the title (AI)", body: "Type a title, let AI fill the description, subtitle, and curriculum.",                  icon: Sparkles,        status: "new" },
  { href: "/help/course-create",              title: "Create your first course",          body: "Empty workspace → published course in 15 minutes.",                                            icon: BookOpen,        status: "new" },
  { href: "/help/course-curriculum",          title: "Build a course curriculum",         body: "Modules, lessons, eight content types. Drag-to-reorder.",                                       icon: Layers,          status: "new" },
  { href: "/help/course-quizzes",             title: "Build quizzes that aren't gameable", body: "Five question types, time limits, attempt caps.",                                              icon: ClipboardList,   status: "new" },
  { href: "/help/course-drip",                title: "Drip course content on a schedule", body: "Release modules N days after enrolment or on absolute dates.",                                  icon: CalendarClock,   status: "new" },
  { href: "/help/course-pricing",             title: "Set course pricing + currencies",    body: "One-time, free, pay-what-you-want. Early-bird, original price, multi-currency.",               icon: Coins,           status: "new" },
  { href: "/help/course-publish-vs-draft",    title: "Drafts, published, archived + visibility", body: "Status vs visibility — public, private, unlisted, password-gated.",                     icon: FileText,        status: "new" },
  { href: "/help/course-bulk-import",         title: "Bulk-import students via CSV",       body: "10,000+ rows. Dedupes by email. Provisions accounts + enrols.",                                 icon: UserPlus,        status: "new" },
  { href: "/help/assignments",                title: "Assignments + grading workflow",    body: "Lesson, session, or course-level. Submission via link or upload.",                              icon: ClipboardList,   status: "new" },
]

const LIVE_CLASSES: Topic[] = [
  { href: "/help/live-classes-schedule",      title: "Schedule a live class",             body: "Single or recurring, with Zoom / Meet / Teams. Fan-out reminders included.", icon: Video,           status: "new" },
  { href: "/help/live-classes-livekit",       title: "Live classes on LiveKit Cloud",     body: "How the new in-house room works. No XMPP, no UDP pain, real cloud recording.", icon: Video,          status: "new" },
  { href: "/help/live-classes-zoom",          title: "Zoom, Meet, Teams integration",     body: "Paste a link — we auto-detect the provider and render the right UI.",        icon: Video,           status: "new" },
  { href: "/help/live-classes-recordings",    title: "Cloud recording → your CDN",        body: "Server-side recording via LiveKit Egress, uploaded straight to R2. Auto-emails when ready.", icon: Film,         status: "new" },
  { href: "/help/recordings-index",           title: "The Recordings index page",         body: "Every class with a recording in one searchable table — no hunting.",          icon: Film,            status: "new" },
  { href: "/help/recording-player-dialog",    title: "Watching a recording inline",       body: "Click Watch → inline player. MP4 / YouTube / Loom / Vimeo / Wistia.",          icon: Play,            status: "new" },
  { href: "/help/live-classes-attendance",    title: "Attendance — auto + manual",         body: "Auto-logged on Join. Editable after. Auto-nudges on 3+ absences.",            icon: CalendarClock,   status: "new" },
]

// In-class wedges — the May 2026 sprint set. Polls, raised hands,
// in-class agenda, waiting-room presence, chat persistence,
// auto-chapters. These are the features visitors search for after
// reading the live-classes feature page.
const INSIDE_LIVE_ROOM: Topic[] = [
  { href: "/help/live-polls",              title: "Run a live poll during class",             body: "2–4 option polls. Launch + close fan out as notifications to enrolled students and co-instructors.", icon: BarChart3,    status: "new" },
  { href: "/help/raised-hands",            title: "How the raised-hand queue works",          body: "Students raise; you see an ordered queue with a Live #N badge and one-click Answer.",                 icon: Hand,          status: "new" },
  { href: "/help/in-class-agenda",         title: "Mark agenda items done in class",          body: "3 / 7 pacing chip, late-joiner recap, AI summary seeded from what actually happened.",                icon: ClipboardList, status: "new" },
  { href: "/help/waiting-room-presence",   title: "See who's actually in the lobby",          body: "Live roster of every student who's loaded the waiting room. Auto-admit when you open the door.",   icon: Users,         status: "new" },
  { href: "/help/class-chat-transcript",   title: "Class chat persists to the recording",     body: "Live chat messages render in the recording player at their original timestamps.",                     icon: MessageSquare, status: "new" },
  { href: "/help/recording-chapters",      title: "Auto-chapters from your transcript",       body: "Transition phrases become seekable chapters. 5–12 per recording, ≥90s spacing.",                     icon: Film,          status: "new" },
  { href: "/help/community-classes-tab",   title: "Surface your class series in the community", body: "Upcoming live + recordings grid + cohort window banner, all in the community surface.",            icon: Users,         status: "new" },
  { href: "/help/instructor-bio-sync",     title: "Two-field bio + AI 'Help me write'",       body: "Short tagline + long About, two-way sync, three opinionated AI drafts.",                              icon: Sparkles,      status: "new" },
]

// What's new — a single rail of the most-recent shipped features. Mirrors the
// /whats-new changelog so visitors can land on either surface and find the
// same things. Articles are also slotted into their category groups above.
const WHATS_NEW: Topic[] = [
  { href: "/whats-new",                       title: "The running changelog",             body: "Every meaningful improvement we've shipped — recording, inbox, community, onboarding.", icon: Sparkles,      status: "new" },
  { href: "/help/fuzzy-search-and-slash",     title: "Fuzzy search + the “/” shortcut",   body: "Press / anywhere on a list page to focus search. Typos still find the row.",                  icon: Sparkles,       status: "new" },
  { href: "/help/engagement-bottom-actions",  title: "Send a check-in or come-back nudge", body: "Two persistent buttons at the bottom of the engagement table. Selection optional.",          icon: Bell,           status: "new" },
  { href: "/help/tab-persistence",            title: "Tabs stay where you left them",     body: "Refresh the brand editor or a student detail page — your tab is still active.",                icon: Sparkles,       status: "new" },
  { href: "/help/customer-urls-add-to-nav",   title: "Add a customer URL to your nav",    body: "Sign in / library / shop — one click drops the link straight into your header.",             icon: Globe,          status: "new" },
  { href: "/help/payouts-gateway-fees",       title: "What Razorpay's gateway fee really costs", body: "Why we don't quote a fixed % — fees vary by method. Straight to Razorpay's live pricing.", icon: CreditCard,    status: "new" },
  { href: "/help/leaderboard-gamification",   title: "Levels, badges, and streaks",       body: "Seven levels (Newcomer → Legend), 16 badges, daily streaks. Day-one points so nobody sees an empty board.", icon: Sparkles,    status: "new" },
  { href: "/help/engagement-table",           title: "Engagement — at-risk students at a glance", body: "Lifecycle stage chips per student. Bulk-nudge a stage with one click.", icon: Users,    status: "new" },
  { href: "/help/cohort-window",              title: "Cohort start + end dates",          body: "Time-box a community to a launch date. Banner counts down, then archives when it wraps.", icon: Sparkles,    status: "new" },
  { href: "/help/drip-modules",               title: "Drip — release modules over time",  body: "Lock Module 2 until Day 7. Students see 'Unlocks on <date>' instead of the lesson list.", icon: Sparkles,    status: "new" },
  { href: "/help/whiteboard-edit-requests",   title: "Whiteboard edit access — request + approve", body: "Students ask, you approve from a dropdown on the board. Notifications both ways.", icon: Sparkles,    status: "new" },
  { href: "/help/community-auto-join",        title: "Auto-join buyers into a course's community", body: "Set defaultBatchId once. Every enrollment lands in the right room — no second sale.", icon: Users,    status: "new" },
  { href: "/help/course-ai-draft",            title: "Draft a course from just the title (AI)", body: "Type a title, let AI fill description + curriculum.",                              icon: Sparkles,        status: "new" },
  { href: "/help/trial-and-plan-badge",       title: "Plan + trial badge in the sidebar",   body: "Always-visible pill: plan name, days left in trial, or 'payment overdue'.",      icon: CreditCard,      status: "new" },
  { href: "/help/cancel-with-reason",         title: "Cancel — with or without deleting data", body: "Reason + free-text + a separate 'deactivate the workspace' toggle.",          icon: ShieldCheck,    status: "new" },
  { href: "/help/inbox",                      title: "The unified Inbox",                 body: "One place for doubts, discussions, batch posts, leads, and blog comments.",  icon: Bell,            status: "new" },
  { href: "/help/inbox-reply",                title: "Replying from the Inbox",           body: "Inline reply with cross-channel notifications (in-app + email + WhatsApp).",  icon: Bell,            status: "new" },
  { href: "/help/getting-started",            title: "Get started in 5 minutes",          body: "A 4-step rail on the dashboard from empty workspace to live class.",          icon: Sparkles,        status: "new" },
  { href: "/help/sidebar-groups",             title: "Collapsible sidebar",               body: "30 items → 5 collapsible groups + a pinned Dashboard.",                       icon: Layers,          status: "new" },
  { href: "/help/simple-advanced",            title: "Simple / Advanced form mode",       body: "Course + class forms default to Simple. Flip for the full surface.",         icon: Sparkles,        status: "new" },
  { href: "/help/batches-mentions",           title: "Tagging people in batch posts",     body: "@-mention picker. Tagged users get a louder cross-channel notification.",     icon: Users,           status: "new" },
  { href: "/help/batches-attachments",        title: "File attachments + previews",       body: "Image / video / audio / PDF / generic. Type-aware preview in the post.",      icon: Briefcase,       status: "new" },
]

const STOREFRONT: Topic[] = [
  { href: "/help/products-7-kinds",           title: "The 7 product kinds you can sell",  body: "Course, download, bundle, membership, session, webinar, license.",            icon: ShoppingBag,     status: "new" },
  { href: "/help/products-bundles",           title: "Course bundles + cross-sells",      body: "Bundle a beginner + intermediate at a discount. Auto-computed savings.",      icon: Package,         status: "new" },
  { href: "/help/products-memberships",       title: "Memberships with monthly / annual / lifetime tiers", body: "Recurring billing, grace periods, retry logic, dunning.", icon: CreditCard,      status: "new" },
  { href: "/help/products-checkout",          title: "Checkout flow + India payment stack", body: "UPI (intent), NetBanking, Cards, Wallets, EMI. Stripe globally.",            icon: CreditCard,     status: "new" },
  { href: "/help/coupons-early-bird",         title: "Coupons, early-bird, flash sales",  body: "% or fixed-amount, usage caps, time windows. Stack rules included.",         icon: Sparkles,        status: "new" },
]

const CERTIFICATES: Topic[] = [
  { href: "/help/certificates-templates",     title: "Certificate templates + Designer",  body: "17 starter templates + a real designer. Dynamic fields, signatures.",       icon: Award,            status: "new" },
  { href: "/help/certificates-bulk-issue",    title: "Bulk-issue certificates from CSV",  body: "Personalised PDF + verify URL emailed to every recipient.",                  icon: Download,         status: "new" },
  { href: "/help/certificates-verify",        title: "The public verify page",            body: "Anyone with a certificate ID can confirm authenticity at /verify/<id>.",     icon: ShieldCheck,      status: "new" },
]

const AUDIENCE: Topic[] = [
  { href: "/help/wall-of-love",               title: "Build a Wall of Love",              body: "Collect testimonials via a public form. Auto-import five-star reviews.",     icon: Heart,            status: "new" },
  { href: "/help/referrals",                  title: "Referrals — personal links + crediting", body: "Every student gets /r/<code>. Auto-credit referrers on enrolment.",     icon: TrendingUp,       status: "new" },
  { href: "/help/blog-publish",               title: "Compose + publish blog posts (SEO)",body: "Tiptap editor, scheduling, tags, per-post SEO overrides.",                   icon: Newspaper,        status: "new" },
]

const FOR_CREATORS: Topic[] = [
  {
    href: "/help/students",
    title: "How student onboarding works",
    body: "Invite link, CSV import, or manual add — when to use which, and what the student actually sees.",
    icon: GraduationCap,
    status: "new",
  },
  {
    href: "/help/experiments",
    title: "Run experiments on your portal",
    body: "A/B test hero CTAs, price displays, or anything else. Sticky assignments + conversion reporting included.",
    icon: Sparkles,
    status: "new",
  },
  {
    href: "/help/faculty",
    title: "Invite a faculty member",
    body: "End-to-end invite flow — branded email, password setup, multi-tenant teachers.",
    icon: UserPlus,
    status: "new",
  },
  {
    href: "/help/multi-faculty-courses",
    title: "Multi-faculty courses + per-module owners",
    body: "Assign co-instructors at the course level and pick a separate owner for each module.",
    icon: Users,
    status: "new",
  },
  {
    href: "/help/announcements",
    title: "Publish announcements to learners",
    body: "Course-scoped and global announcements that surface in the lesson player.",
    icon: Megaphone,
    status: "new",
  },
  {
    href: "/help/doubts-and-enquiries",
    title: "Doubts inbox + pre-sale enquiries",
    body: "Where student questions and prospective-buyer enquiries land. WhatsApp, email, in-app — same inbox.",
    icon: MessageCircleQuestion,
    status: "new",
  },
  {
    href: "/help/white-label",
    title: "White-label your portal",
    body: "Strip platform attribution; ship a portal that reads entirely as your brand.",
    icon: ShieldCheck,
    status: "new",
  },
  {
    href: "/help/seo-and-meta",
    title: "Tenant SEO + meta tags",
    body: "Browser tab title, share previews, structured data — all driven by your portal config.",
    icon: Globe,
  },
  {
    href: "/help/customer-urls",
    title: "Customer-facing URLs (paths today, subdomains soon)",
    body: "Where to send your learners. What the URLs look like once your CNAME flips.",
    icon: Globe,
    status: "new",
  },
]

const PORTAL: Topic[] = [
  { href: "/help/portal-template",            title: "Pick a portal template",            body: "Seven starter templates. One-click apply, your content keeps flowing.",      icon: Palette,          status: "new" },
  { href: "/help/portal-pages",               title: "Page builder — sections + custom HTML", body: "Drag-arranged section library. Per-page SEO + visibility.",                icon: FileText,         status: "new" },
  { href: "/help/portal-domain",              title: "Custom domain + auto-SSL",          body: "<slug>.thebigclass.com + CNAME → your domain. SSL provisions automatically.", icon: Globe,           status: "new" },
]

const BILLING: Topic[] = [
  { href: "/help/trial-and-plan-badge",       title: "Your trial, your plan, your time left", body: "What the sidebar plan badge shows + how the 14-day Studio trial works.",                      icon: Sparkles,       status: "new" },
  { href: "/help/upgrade-mid-trial",          title: "Upgrade mid-trial without losing days", body: "When Razorpay is involved, what you pay, how fast it activates.",                              icon: CreditCard,     status: "new" },
  { href: "/help/cancel-with-reason",         title: "Cancel — with or without deleting data", body: "Two questions: why you're leaving + whether to keep Starter or deactivate.",                  icon: ShieldCheck,    status: "new" },
]

const ANALYTICS: Topic[] = [
  { href: "/help/analytics-dashboard",        title: "What the analytics dashboard tracks", body: "Revenue, enrolments, completion %, drop-off, funnels.",                     icon: BarChart3,        status: "new" },
  { href: "/help/analytics-cohorts",          title: "Cohort retention + LTV",            body: "Month-over-month retention curves. Revenue per learner over lifetime.",     icon: TrendingUp,       status: "new" },
  { href: "/help/notifications",              title: "Notifications — in-app, email, WhatsApp", body: "Every event fans out across three channels. Per-event toggles.",       icon: Bell,             status: "new" },
  { href: "/help/trash-restore",              title: "Trash + restore deleted content",   body: "7-day recovery window for every soft-deleted entity.",                       icon: Trash2,           status: "new" },
  { href: "/help/workspace-export",           title: "Export your workspace — CSV, JSON, or the lot", body: "Per-entity CSV/JSON for sheets + scripts, or one envelope for the whole workspace.",          icon: Download,         status: "new" },
]

const FOR_LEARNERS: Topic[] = [
  {
    href: "/help/learner-sign-in",
    title: "Sign in to a workspace",
    body: "Every workspace has its own sign-in page. Where to find the right one.",
    icon: Lock,
    status: "new",
  },
  {
    href: "/help/learner-language",
    title: "Change the portal language",
    body: "How the language picker works. Currently English, Hindi, Tamil, Spanish, French.",
    icon: Languages,
    status: "new",
  },
  {
    href: "/help/learner-library",
    title: "Find your library after a purchase",
    body: "The library lives inside the workspace you bought from — not the platform root.",
    icon: BookOpen,
  },
  {
    href: "/help/asking-a-question",
    title: "Ask the teacher a question",
    body: "From inside a lesson — or from a course page if you haven't bought yet.",
    icon: MessageCircleQuestion,
  },
  {
    href: "/help/edit-a-review",
    title: "Edit a review you've written",
    body: "Three edits per 24 hours. Why the limit, and how the countdown works.",
    icon: Sparkles,
  },
  {
    href: "/help/learner-progress",
    title: "How learner progress is tracked",
    body: "Lesson views, quiz scores, assignment grades — what counts as 'complete'.",
    icon: TrendingUp,
    status: "new",
  },
]

const FOR_DEVELOPERS: Topic[] = [
  {
    href: "/developers",
    title: "API & integrations overview",
    body: "What the API can do, how auth works, the full endpoint list.",
    icon: Code2,
  },
  {
    href: "/help/api-keys",
    title: "Generate + rotate API keys",
    body: "Scopes, the one-shot reveal, when to revoke vs rotate.",
    icon: KeyRound,
    status: "new",
  },
  {
    href: "/help/rate-limits",
    title: "Rate limits + the X-RateLimit-* headers",
    body: "60/min, 1,000/day per key. How to back off proactively.",
    icon: Sparkles,
    status: "new",
  },
  {
    href: "/help/webhooks",
    title: "Webhooks (roadmap)",
    body: "What we're shipping next + how signatures will work.",
    icon: Bell,
  },
  {
    href: "/help/tenant-tokens",
    title: "Tenant-scoped auth tokens",
    body: "How invite + reset tokens carry a signed workspace binding. Cross-tenant reuse is blocked.",
    icon: Briefcase,
    status: "new",
  },
]

const FOR_ADMINS: Topic[] = [
  {
    href: "/help/onboarding-new-faculty",
    title: "Onboarding new faculty in your workspace",
    body: "Invite → set password (zxcvbn-validated) → land on dashboard. The whole flow.",
    icon: GraduationCap,
    status: "new",
  },
  {
    href: "/help/per-tenant-login-pages",
    title: "Per-tenant login + password recovery",
    body: "Every workspace has its own login, forgot-password, and reset surface. Tokens are scoped.",
    icon: Lock,
    status: "new",
  },
]

export default function HelpIndexPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <section className="border-b border-border bg-gradient-to-br from-primary/5 via-background to-accent/5">
          <div className="mx-auto max-w-5xl px-6 py-12 lg:px-8">
            <h1 className="font-serif text-4xl font-bold tracking-tight">Help & guides</h1>
            <p className="mt-3 max-w-2xl text-lg text-muted-foreground">
              Everything we&apos;ve documented, in one place. New topics are flagged so you can skim
              to what changed since your last visit.
            </p>
            {/* Direct line to support. /help is now the only
                top-level entry for both browsing docs + reaching
                humans (the legacy /support index was removed).
                The dialog captures name + email + WhatsApp + a
                rich-text message, rate-limited to 3/24h. */}
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <ContactSupportDialog />
              <p className="text-sm text-muted-foreground">
                Can&apos;t find an answer? A real human replies — usually within a day.
              </p>
            </div>
          </div>
        </section>

        <Group title="What's new" topics={WHATS_NEW} />
        <Group title="Inside the live room" topics={INSIDE_LIVE_ROOM} />
        <Group title="For creators" topics={FOR_CREATORS} />
        <Group title="Courses" topics={COURSES} />
        <Group title="Live classes" topics={LIVE_CLASSES} />
        <Group title="Storefront + payments" topics={STOREFRONT} />
        <Group title="Certificates" topics={CERTIFICATES} />
        <Group title="Audience + marketing" topics={AUDIENCE} />
        <Group title="Customer portal" topics={PORTAL} />
        <Group title="Billing & account" topics={BILLING} />
        <Group title="Analytics + operations" topics={ANALYTICS} />
        <Group title="For learners" topics={FOR_LEARNERS} />
        <Group title="For developers" topics={FOR_DEVELOPERS} />
        <Group title="For workspace admins" topics={FOR_ADMINS} />
      </main>
      <Footer />
    </div>
  )
}

function Group({ title, topics }: { title: string; topics: Topic[] }) {
  return (
    <section className="border-b border-border py-10">
      <div className="mx-auto max-w-5xl px-6 lg:px-8">
        <h2 className="font-serif text-2xl font-bold tracking-tight">{title}</h2>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {topics.map((t) => (
            <Link key={t.href} href={t.href} className="group block">
              <Card className="h-full transition-all group-hover:-translate-y-0.5 group-hover:shadow-md">
                <CardContent className="space-y-1.5 p-4">
                  <div className="flex items-center gap-2">
                    <t.icon className="h-4 w-4 text-primary" />
                    <p className="font-semibold group-hover:text-primary">{t.title}</p>
                    {t.status === "new" && (
                      <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent">
                        New
                      </span>
                    )}
                    {t.status === "updated" && (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                        Updated
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{t.body}</p>
                  <p className="inline-flex items-center gap-1 pt-1 text-xs font-medium text-primary opacity-0 transition group-hover:opacity-100">
                    Read <ArrowRight className="h-3 w-3" />
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
