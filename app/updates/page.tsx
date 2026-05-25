"use client"

import Link from "next/link"
import {
  ArrowRightLeft,
  Award,
  BarChart3,
  BarChart4,
  Bell,
  Captions,
  ClipboardCheck,
  ClipboardList,
  FileText,
  Filter,
  Film,
  Globe2,
  Hand,
  Heart,
  History,
  Layers,
  Link2,
  Lock,
  MoonStar,
  Palette,
  PenSquare,
  Play,
  Repeat,
  ShieldCheck,
  Sparkles,
  ThumbsUp,
  Trophy,
  UserPlus,
  Users,
  Video,
  Webhook as WebhookIcon,
  Wifi,
} from "lucide-react"
import { Header } from "@/components/landing/header"
import { Footer } from "@/components/landing/footer"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface UpdateEntry {
  date: string
  tag: "Feature" | "Improvement" | "Fix"
  icon: React.ElementType
  title: string
  body: string
  link?: { href: string; label: string }
}

const UPDATES: UpdateEntry[] = [
  // ── Today: hero refresh + alternatives suite ─────────────────
  {
    date: "May 24, 2026",
    tag: "Improvement",
    icon: Sparkles,
    title: "Textual hero CTA — typography over chrome",
    body:
      "The above-the-fold CTA is now a clean text-led cluster: a large bold 'Launch your academy free →' as a primary link with an animated underline + arrow slide, paired with a quieter 'or see pricing' secondary, and a single trust line below (no card · 60-second setup · cancel any day). Plus a tertiary nudge to try the certificate designer with no signup. Premium feel via typography + micro-animation, not visual weight.",
  },
  {
    date: "May 24, 2026",
    tag: "Feature",
    icon: ArrowRightLeft,
    title: "Eight alternative-platform comparison pages",
    body:
      "Dedicated /alternatives/<slug> pages for Teachable, Kajabi, Thinkific, Podia, Gumroad, LearnWorlds, Graphy, and TagMango. Each one ships a side-by-side illustration, a savings calculator with real ₹ math, illustrated pain-point cards, a feature × rival matrix, a 5-step migration timeline, a per-rival FAQ, and a closing CTA — all tinted to a per-rival accent. Surfaced in a new featured panel inside the Resources mega-menu.",
    link: { href: "/alternatives/kajabi", label: "See the Kajabi comparison" },
  },

  // ── Marketing sprint ─────────────────────────────────────────
  {
    date: "May 23, 2026",
    tag: "Improvement",
    icon: Sparkles,
    title: "Homepage hero rebuilt around the 4 USPs",
    body:
      "New H1 'An academy that's actually yours' plus a live USP showcase in the right column — animated ₹ earnings counter, all-in-one teacher-side surface stack, export demo, India-native chip cycle. Below the hero: a dedicated Four-USP section, a feature × tool-category honesty matrix, and a 'Switching from?' chip rail. Every visitor-facing surface scrubbed of competitor brand names; alternatives live on their own pages.",
  },
  {
    date: "May 23, 2026",
    tag: "Feature",
    icon: PenSquare,
    title: "Whiteboard feature page — 25+ teaching templates surfaced",
    body:
      "The whiteboard page now leads with the template library, not the canvas. K-12 grade-band scaffolds (KG → Class 11-12), teaching scaffolds (lesson plan, K-W-L, Frayer, lab report), thinking templates (mind map, Venn, brainstorm), analysis (SWOT, persona, fishbone), planning (Eisenhower, OKR, retro). Three Indian-classroom scenarios show how vedic-maths, NEET-bio, and JEE-coaching teachers actually use the surface.",
    link: { href: "/features/whiteboard", label: "See the whiteboard" },
  },
  {
    date: "May 23, 2026",
    tag: "Feature",
    icon: ClipboardCheck,
    title: "New quizzes feature page — 18 ready-to-fire templates",
    body:
      "Entrance prep (JEE Mathematics drill, NEET Biology MCQs, GMAT data sufficiency), classroom (pop quiz, math fluency, physics laws, chemistry equations), higher ed (essay rubric, case study), engineering (code review, system design), management (PM scenarios, product sense). Five question types, auto + teacher grading, anti-cheat, leaderboard feed, cross-channel score notifications.",
    link: { href: "/features/quizzes", label: "See quiz templates" },
  },

  // ── Week 2: engagement levers ────────────────────────────────
  {
    date: "May 22, 2026",
    tag: "Feature",
    icon: FileText,
    title: "Post types in cohort communities — and wins auto-cross-post to the Wall of Love",
    body:
      "Composer now opens with a 4-way type chooser: Announcement (auto-pins, host-only), Question (mark answered with a green ✓), Win (auto-🎉, cross-posts to the public Wall of Love), Discussion (the catch-all). A filter chip rail above the feed lets students slice by type with live counts. Questions tracked through to resolution with an authored-by-comment credit for future helpfulness scoring.",
  },
  {
    date: "May 22, 2026",
    tag: "Feature",
    icon: BarChart4,
    title: "Community health pulse + at-risk member nudges",
    body:
      "Host-only collapsible strip on every batch detail page: 14-day DAU ratio, posts/day, reactions/post — each with a trend arrow vs the prior 14-day window. Expand to a drawer with the at-risk member list (no activity in 7 days) and a one-click 'Send a check-in to all' button that fires cross-channel notifications via the same dispatcher live polls use.",
  },
  {
    date: "May 22, 2026",
    tag: "Feature",
    icon: MoonStar,
    title: "Dead-community recovery — auto-surfaces when a batch goes quiet",
    body:
      "When a batch has >5 members and no posts in 14 days, a host-only amber banner appears with three one-click actions: send a templated 'we miss you' (auto-pins as a real post), schedule a Q&A session (deep-links the new-class form with course pre-selected), or archive (soft-delete via the existing trash with 7-day recovery). Dismissible for 7 days so the host gets a fresh nudge if it keeps drifting.",
  },
  {
    date: "May 22, 2026",
    tag: "Feature",
    icon: Play,
    title: "Up-next autoplay in the recording player",
    body:
      "In the last 30 seconds of any recording, an 'Up next' preview card slides into the bottom-right with the next recording's title + duration. When the video ends, it promotes to a 10-second countdown with a progress bar — click the card to skip ahead, click X to stay on this recording. Same-course continuation preferred; falls back to next-in-sort-order.",
  },
  {
    date: "May 22, 2026",
    tag: "Improvement",
    icon: History,
    title: "Watch-history pill rail on the recordings list",
    body:
      "Three sort-mode pills on /dashboard/recordings: Newest (default for teachers), Continue (in-progress recordings sorted by last-played-first, with a live count of your backlog), Recent (everything you've touched, last-played first). Default sticks per-browser via localStorage so a returning student lands in the mode they left in.",
  },
  {
    date: "May 22, 2026",
    tag: "Feature",
    icon: Hand,
    title: "Raised-hand variants — Got it / Public / Private",
    body:
      "Students raising a hand now have three intents on a chevron popover next to the main button: raise publicly (whole-room question, the default), ask privately (host sees the question in amber with a 'wants a DM, not a mic unmute' hint), or 'Got it — never mind' (lowers the hand and signals a tiny 👍 to the host instead of a silent disappear). Host queue colour-codes the two visibility states.",
  },

  // ── Week 1: bleeding wounds ──────────────────────────────────
  {
    date: "May 22, 2026",
    tag: "Improvement",
    icon: Sparkles,
    title: "Welcome-back banner — signed-in users skip the marketing pitch",
    body:
      "Signed-in operators visiting / now see a one-line banner at the top: avatar + 'Welcome back, [name]. Cohort 7 live class in 32 min.' with a direct 'Open dashboard' CTA. Pulls from the same liveSessions selector the dashboard uses, dismissible for 7 days via localStorage. The marketing surface still renders below for users who landed there intentionally.",
  },
  {
    date: "May 22, 2026",
    tag: "Feature",
    icon: Link2,
    title: "Recordings now have shareable timestamp links",
    body:
      "Every recording has a standalone route at /dashboard/recordings/<id>?t=<seconds>. The player exposes a 'Copy link to this moment' button that writes the current playhead into the URL so you can paste 'watch this at minute 12:30' into a community post or email. Direct visits auto-seek and resume from the deep-linked moment.",
  },
  {
    date: "May 22, 2026",
    tag: "Improvement",
    icon: Filter,
    title: "Unified filters popover on the recordings list",
    body:
      "The two parallel chip rails (watch state + visibility tier) collapsed into a single 'Filters' button with grouped checkboxes inside a popover, plus an active-pill rail so you always see what's narrowing your results without re-opening. Same pattern coming to other list pages next.",
  },
  {
    date: "May 22, 2026",
    tag: "Improvement",
    icon: Repeat,
    title: "Resume overlay countdown + Enter/R shortcuts",
    body:
      "Opening a half-watched recording now shows 'Resume from 12:30?' with a 4-second auto-resume countdown. Move the cursor over the overlay to cancel the countdown, press Enter to resume, R to start over. Calmer than the previous 'wait forever for a click' pattern.",
  },
  {
    date: "May 22, 2026",
    tag: "Feature",
    icon: Bell,
    title: "Per-community notification preferences + 24h snooze",
    body:
      "A bell popover in every batch header lets members pick one of four notification levels (Everything, @Mentions + replies, Announcements only, Off), plus a separate 'ping me when a live class starts' toggle that's independent of feed activity. A 'Quiet for 24 hours' snooze pill defers everything except class-start alerts. New defaults are 'mentions + announcements' so a fresh member isn't drowned on day one.",
  },
  {
    date: "May 22, 2026",
    tag: "Feature",
    icon: Wifi,
    title: "Sticky 'live now' bar in every community feed",
    body:
      "When a class attached to the community is live or starting within 15 minutes, a colour-coded bar pinned to the top of the feed shows the class title, the countdown, and a one-click Join / Hop into the lobby button. Auto-hides when the class ends or the host dismisses it.",
  },
  {
    date: "May 22, 2026",
    tag: "Improvement",
    icon: Users,
    title: "New batches now ship with three seeded posts",
    body:
      "Fresh batches no longer open to an empty feed — they ship with three real posts the host can edit or delete: a pinned welcome card, an 'introduce yourself' thread, and a 'what you'll get from this cohort' post. The first student to land sees an active-looking community instead of dead silence.",
  },
  {
    date: "May 22, 2026",
    tag: "Feature",
    icon: ThumbsUp,
    title: "Comprehension check inside live classes",
    body:
      "Students get two pill buttons during class: 'With you 👍' and 'Lost 🤔'. The host sees a live ratio with an automatic alert when more than 30% of votes flip to Lost — 'slow down or ask a question.' Votes expire every 2 minutes so the ratio reflects current mood, not cumulative drift.",
  },
  {
    date: "May 22, 2026",
    tag: "Feature",
    icon: Wifi,
    title: "Host connection health bar — recording survives a wifi drop",
    body:
      "Floating bar in the top-left of the live host stage. Green when connected with student count + recording state. On disconnect, flips to amber 'Reconnecting — your class is still live, recording continues' and auto-mutes the host mic so garbled half-connected audio doesn't blast the room. After three failed reconnects, escalates to a red 'Connection lost' card with a one-tap 'Refresh & rejoin' button.",
  },
  {
    date: "May 22, 2026",
    tag: "Improvement",
    icon: ClipboardList,
    title: "End-of-class wrap — one screen, not three steps",
    body:
      "The wrap wizard collapsed from a 3-step form to a single recap card with everything pre-filled: outcome defaults to 'held', summary auto-drafts from the agenda items you ticked off, follow-up defaults to none. Host's only required action is one click: 'Looks good — send to students'. Edit anything inline before publishing.",
  },
  {
    date: "May 22, 2026",
    tag: "Feature",
    icon: Film,
    title: "Recording-processing card — no more dead time between class end and player ready",
    body:
      "The 30-180 seconds between class end and the recording URL landing used to show nothing. Now: a processing card on the class detail page with three synthetic stages (Saving → Encoding → Uploading) and a live pseudo-progress bar. Students see the recording is on its way; the host email still fires when the file is genuinely ready.",
  },
  {
    date: "May 22, 2026",
    tag: "Improvement",
    icon: Layers,
    title: "Live class right-rail panels — one expanded at a time",
    body:
      "Host stage panels (Agenda, Polls, Hands, Breakouts) now follow mutual-exclusion: only one is expanded at a time. When a hand goes up, the Hands panel auto-previews for 4 seconds then restores whichever panel was previously open. Counters live on the panel pills so the host sees backlog depth at a glance.",
  },
  {
    date: "May 22, 2026",
    tag: "Improvement",
    icon: Video,
    title: "Inline AV preflight strip — no more first-visit modal wall",
    body:
      "First-time visitors to a live class lobby no longer get a blocking modal asking to test camera + mic. Replaced with a silent traffic-light strip inside the waiting room (📷 mic / 📹 camera / 📶 network), auto-probing in the background. The full AV wizard still mounts but only opens when the student clicks 'Run a full setup check' OR a probe fails.",
  },
  {
    date: "May 22, 2026",
    tag: "Fix",
    icon: ShieldCheck,
    title: "Removed unverified review count from structured data",
    body:
      "JSON-LD on the homepage previously declared aggregateRating with a specific count + score that wasn't backed by a public review page — Google's rich-snippet policy disallows that and would have suppressed the snippet (or worse, flagged in Search Console). Removed pending a real reviews surface.",
  },
  {
    date: "May 22, 2026",
    tag: "Fix",
    icon: Palette,
    title: "Hover-revealed CTAs now visible on touch devices",
    body:
      "Dozens of feature tiles across the marketing site used Tailwind's opacity-0 / group-hover:opacity-100 pattern for 'See how it works →' affordances. On touchscreens (which never fire hover) those CTAs were permanently invisible. A single CSS rule in @media (hover: none) now forces them visible at 70% opacity so a tap target is always clear.",
  },

  // ── Older entries follow ─────────────────────────────────────
  {
    date: "May 21, 2026",
    tag: "Feature",
    icon: Sparkles,
    title: "White-label your portal — strip platform attribution",
    body: "The Brand → Advanced tab now exposes two toggles: hide the “Powered by The Big Class” footer line, and a stronger “hide every platform-branded element” switch that reserves headroom for email footers, error pages, and share previews. Both gated behind Pro (and up) so the lock icon points to billing; once enabled, the public portal footer drops the attribution row entirely.",
    link: { href: "/dashboard/portal/brand", label: "Open brand settings" },
  },
  {
    date: "May 20, 2026",
    tag: "Fix",
    icon: Captions,
    title: "Transcripts now actually surface on the recordings page",
    body: "The recordings page wasn't fetching transcript_url from the backend, so the .vtt sidecar produced by Whisper never reached the player. Now each row fetches its room state lazily, badges with \"Captions + transcript ready\" when present, and offers a one-click Transcribe button on rows that don't yet have a transcript (handy for recordings made before GROQ_API_KEY was set).",
  },
  {
    date: "May 20, 2026",
    tag: "Improvement",
    icon: Captions,
    title: "Clearer live-caption state during calls",
    body: "The captions toggle now shows real-time status (Starting → Listening → Captions on, with a \"Listening — start speaking…\" hint while you're still silent). Mic-permission denials surface as an amber banner with a fix-it instruction instead of failing silently. SR errors log to the browser console for support.",
  },
  {
    date: "May 20, 2026",
    tag: "Fix",
    icon: ShieldCheck,
    title: "Billing / Payouts / Webhooks now respect your live session",
    body: "Pages on /dashboard/billing, /dashboard/payouts, and /dashboard/developer/webhooks were showing a sign-in card to users who were already signed in but whose access token wasn't in localStorage (older signup, incognito clear, cross-device). They now try the refresh-cookie path first and only fall back to the sign-in card when the cookie session is truly gone.",
  },
  {
    date: "May 20, 2026",
    tag: "Feature",
    icon: Sparkles,
    title: "AI course builder — free",
    body: "Sparkles buttons on the course editor draft titles, descriptions, and full outlines. Powered by Llama-3.3-70b via Groq's free tier (OpenAI as a fallback if you'd rather). Shows up only when the backend has a key configured — no broken buttons.",
    link: { href: "/pricing", label: "See pricing" },
  },
  {
    date: "May 20, 2026",
    tag: "Feature",
    icon: Captions,
    title: "Auto-transcripts on every recording + live captions",
    body: "Every class recording runs through Whisper-large-v3 after egress, producing a .vtt sidecar that the player picks up natively (CC button works) and a plain-text panel under the video. In-call captions overlay your own speech via Web Speech API — Chrome / Edge / Safari supported.",
  },
  {
    date: "May 20, 2026",
    tag: "Feature",
    icon: History,
    title: "Publish changes — with 3-month version history",
    body: "Edits to your portal (brand, pages, blog, faculty, testimonials) stay in a draft until you click Publish. Confirm-before-publish modal, label each version, restore from any snapshot within 90 days. The 3-month history + restore is paid-tier; publish itself works on every plan.",
  },
  {
    date: "May 20, 2026",
    tag: "Feature",
    icon: Lock,
    title: "Plan-aware lock icons across the dashboard",
    body: "Restricted features now show a small amber lock with a click-to-explain popover and a one-click upgrade CTA — instead of bouncing you off the page. Wired into the sidebar (Domain & URL), the storefront product cap, and published-courses cap; more surfaces will pick this up as we expand.",
  },
  {
    date: "May 20, 2026",
    tag: "Feature",
    icon: BarChart3,
    title: "Analytics deep dive — real numbers, real charts",
    body: "12-month revenue area chart, signups vs. enrollments overlay, acquisition funnel from signup to certificate, top courses by revenue with completion %, and a cohort-retention heatmap. The retention heatmap is Studio-tier (advanced analytics).",
    link: { href: "/dashboard/analytics", label: "Open analytics" },
  },
  {
    date: "May 20, 2026",
    tag: "Feature",
    icon: WebhookIcon,
    title: "13 webhook events wired end-to-end",
    body: "student.created/updated/deleted, enrollment.created, order.paid, course.published/archived, live_session.started/ended, recording.ready, certificate.issued — all firing from the right code paths. HMAC-signed payloads, automatic retries, delivery logs.",
    link: { href: "/dashboard/developer/webhooks", label: "Manage webhooks" },
  },
  {
    date: "May 20, 2026",
    tag: "Improvement",
    icon: Globe2,
    title: "Wider native-language coverage on the customer portal",
    body: "53 new strings translated accurately into Hindi, Bengali, Tamil, Telugu, and Marathi — covering home, courses, store, library, blog, footer, and sign-in flow. Other Indian languages fall back through English until natives land.",
  },
  {
    date: "May 17, 2026",
    tag: "Feature",
    icon: UserPlus,
    title: "Refer & Earn — built in",
    body: "Generate personal invite links with one form (friend's name, country, WhatsApp). Cross-tenant conversion log automatically flips invites to Joined when your friend completes signup. Reward: 1 month free per converted referral.",
    link: { href: "/features/refer-and-earn", label: "How it works" },
  },
  {
    date: "May 17, 2026",
    tag: "Feature",
    icon: Heart,
    title: "Wall of Love",
    body: "A public showcase of student work, quotes, and wins. Upload an image, drop a quote, embed a video. Pin the best ones. Tag by vibe — Love, Win, Creative, Milestone. Lives publicly at /wall.",
    link: { href: "/features/community", label: "See community" },
  },
  {
    date: "May 17, 2026",
    tag: "Feature",
    icon: Trophy,
    title: "Leaderboard with scoring rules",
    body: "Students earn points for attending classes, taking and passing quizzes, submitting assignments, completing lessons. Best score per item counts. Filter by course or last 7/30 days. Visible scoring rules — no black box.",
    link: { href: "/features/community", label: "See leaderboard" },
  },
  {
    date: "May 17, 2026",
    tag: "Feature",
    icon: Repeat,
    title: "Recurring live classes",
    body: "Schedule a single class or a whole series — daily, weekly, every-2/3/4 days, or custom. One Meet link reused across instances. Bulk-edit, bulk-cancel, bulk-notify from the list view.",
    link: { href: "/features/live-classes", label: "See live classes" },
  },
  {
    date: "May 17, 2026",
    tag: "Feature",
    icon: Video,
    title: "Post-class recap + attach-a-quiz",
    body: "After class, mark as held, drop the recording, paste the summary, attach materials — including quizzes and homework with due dates. Students see them on the class card with one-tap actions.",
    link: { href: "/features/live-classes", label: "Recap workflow" },
  },
  {
    date: "May 17, 2026",
    tag: "Feature",
    icon: Award,
    title: "Past Classes archive",
    body: "Browse every past session across every course. Filter by missing-recap so nothing slips. Embedded recordings + materials render inline; videos are width-capped so nothing overflows.",
    link: { href: "/features/live-classes", label: "See live classes" },
  },
  {
    date: "May 17, 2026",
    tag: "Feature",
    icon: Award,
    title: "Certificate Template Designer",
    body: "A drag-and-drop canvas editor for your own certificate templates. Six block types — Text, Rectangle, Circle, Signature (text or image), QR code, Image. 17 typefaces across Sans / Serif / Display / Signature / Mono. Bind any text block to a variable like {{student_name}}. Save, favourite, duplicate. Custom templates flow straight into the bulk-issue pipeline.",
    link: { href: "/features/certificates", label: "See the designer" },
  },
  {
    date: "May 17, 2026",
    tag: "Improvement",
    icon: Sparkles,
    title: "Brand refresh",
    body: "New wordmark — \"the\" + bold BIG + \"class\" — that visually echoes how the brand is said. New homepage with animated SVG orbit, six feature pages, dedicated pricing + use-cases + about pages.",
  },
]

export default function UpdatesPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <section className="relative overflow-hidden border-b border-border bg-gradient-to-b from-secondary/40 to-background">
          <div className="mx-auto max-w-4xl px-6 py-16 lg:px-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-semibold text-accent-foreground">
              <Sparkles className="h-3 w-3" /> Product updates
            </div>
            <h1 className="mt-4 text-4xl font-bold tracking-tight">What we shipped.</h1>
            <p className="mt-3 text-muted-foreground">
              Honest changelog. Every entry is something you can actually use today — no &quot;coming soon&quot;.
            </p>
          </div>
        </section>

        <section className="py-14">
          <div className="mx-auto max-w-3xl space-y-4 px-6 lg:px-8">
            {UPDATES.map((u, i) => (
              <UpdateCard key={`${u.title}-${i}`} entry={u} />
            ))}

            <div className="mt-10 rounded-xl border border-dashed border-border bg-card/50 p-6 text-center text-sm text-muted-foreground">
              Want updates delivered? Sign up for a workspace and we&apos;ll surface new features in your dashboard.
              <div className="mt-3">
                <Link href="/signup" className="text-primary font-semibold hover:underline">Launch your academy →</Link>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}

function UpdateCard({ entry }: { entry: UpdateEntry }) {
  const Icon = entry.icon
  const tagColor =
    entry.tag === "Feature"     ? "bg-primary/10 text-primary"          :
    entry.tag === "Improvement" ? "bg-accent/15 text-accent-foreground" :
    "bg-muted text-muted-foreground"
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${tagColor}`}>
                {entry.tag}
              </span>
              <span className="text-[11px] text-muted-foreground">{entry.date}</span>
            </div>
            <h2 className="mt-1 text-lg font-bold leading-snug">{entry.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{entry.body}</p>
            {entry.link && (
              <Link
                href={entry.link.href}
                className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
              >
                {entry.link.label} →
              </Link>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
