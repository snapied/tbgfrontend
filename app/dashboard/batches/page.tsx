"use client"

// Batches list — every cohort in the workspace, surfaced as a top-
// level concept (not buried under students). Each card links into
// the batch detail page with two tabs: Members + Common Room.
//
// Internally a "Batch" is a StudentGroup with optional `courseId`
// and `description` — the rename is cosmetic to avoid a giant
// codebase migration, but every UI surface here calls them Batches.

import { useEffect, useMemo, useState } from "react"
import { cn } from "@/lib/utils"
import Link from "next/link"
import {
  ArrowRight,
  Plus,
  Users2,
  Users,
  MessageSquare,
  Clock,
  BookOpen,
  Sparkles,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RichTextEditor } from "@/components/editor/rich-text-editor"
import { AIGenerateButton } from "@/components/ai/ai-generate-button"
import { aiCourseDescription } from "@/lib/ai-client"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useLMS, generateId } from "@/lib/lms-store"
import { fuzzySearch } from "@/lib/fuzzy-search"
import { SearchInput } from "@/components/ui/search-input"
import { PlanLimitHint } from "@/components/dashboard/plan-lock"
import { CommunityTooltip } from "@/components/dashboard/community-tooltip"
import { usePlan } from "@/lib/use-plan"
import { CommunityCover } from "@/components/dashboard/community-cover"

// Curated colour palette for batch tag dots. Hand-picked so each
// batch in a row reads as visually distinct without the admin having
// to pick a hex value. New batches cycle through them.
const BATCH_COLORS = [
  "#0a3024", // primary
  "#d4af37", // accent
  "#5b8def", // sky
  "#e26a52", // terracotta
  "#7c5cff", // violet
  "#21a179", // mint
  "#c2185b", // rose
  "#0288d1", // teal
]

// Pull initials out of a community name for the avatar puck. We
// drop articles and stop-words so "The January Cohort" becomes
// "JC" not "TJ" — much closer to how a person would abbreviate it.
function communityInitials(name: string): string {
  const tokens = name
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 0 && !/^(the|a|an|of|and|for)$/i.test(t))
  if (tokens.length === 0) return name.slice(0, 2).toUpperCase()
  if (tokens.length === 1) return tokens[0].slice(0, 2).toUpperCase()
  return (tokens[0][0] + tokens[tokens.length - 1][0]).toUpperCase()
}

// Lightweight relative-time formatter — keeps each card under
// ~50 chars of timestamp copy regardless of how old the post is.
function relativeFromNow(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  if (Number.isNaN(diff)) return ""
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  if (days < 30) return `${Math.floor(days / 7)}w ago`
  if (days < 365) return `${Math.floor(days / 30)}mo ago`
  return `${Math.floor(days / 365)}y ago`
}

// Build a CSS gradient from a single seed colour. We lighten the
// hue toward white at one corner and darken it toward the seed at
// the other — produces a soft diagonal wash that reads as the
// community's identity without screaming.
function gradientFromColor(hex: string): string {
  // Defensive parse — bad/blank colours just fall back to a neutral grey.
  if (!/^#?[0-9a-fA-F]{6}$/.test(hex)) hex = "#0a3024"
  const h = hex.replace(/^#/, "")
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  const mix = (channel: number, t: number) => Math.round(channel + (255 - channel) * t)
  const light = `rgb(${mix(r, 0.78)}, ${mix(g, 0.78)}, ${mix(b, 0.78)})`
  const mid = `rgb(${mix(r, 0.32)}, ${mix(g, 0.32)}, ${mix(b, 0.32)})`
  return `linear-gradient(135deg, ${light} 0%, ${mid} 60%, ${hex} 100%)`
}

// Assignment descriptions come from the WYSIWYG editor as HTML.  For the
// table preview we want plain text — strip tags + collapse whitespace.
// Server-rendered, no DOM; a small regex is enough since we're not parsing
// for security, just stripping decoration.
function stripHtmlToPreview(html: string | undefined, max = 140): string {
  if (!html) return ""
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max)
}

export default function BatchesPage() {
  const {
    studentGroups,
    addStudentGroup,
    addBatchPost,
    courses,
    getPostsForBatch,
    currentUser,
    users,
  } = useLMS()
  const plan = usePlan()
  const [search, setSearch] = useState("")
  const [openCreate, setOpenCreate] = useState(false)

  // Hard gate on creation: usageRemaining(<=0) means the workspace is
  // already AT or PAST the plan cap and shouldn't be able to mint
  // another community. We used to only show a hint chip — the chip is
  // still there, but it's no longer the only thing stopping creation.
  // `Infinity` means unlimited; treat as never-blocked.
  const remaining = plan.usageRemaining("batches", studentGroups.length)
  const atCap = remaining !== Infinity && remaining <= 0
  // Until the plan hydrates from the server we don't know the cap, so
  // we don't show the limit dialog yet — the chip + button click both
  // wait for hydration before deciding.
  const limitKnown = plan.hydrated
  const requestCreate = () => {
    if (limitKnown && atCap) {
      setShowLimitDialog(true)
      return
    }
    setOpenCreate(true)
  }
  const [showLimitDialog, setShowLimitDialog] = useState(false)
  const cap = plan.limits.batches ?? Infinity
  // Which plan would lift this restriction — drives the upgrade CTA.
  const recommendedPlan = plan.cheapestPlanFor("batches")

  const filtered = useMemo(() => {
    return fuzzySearch(studentGroups, search, (g) => [
      g.name,
      g.purpose ?? "",
      g.description ?? "",
    ])
  }, [studentGroups, search])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="font-serif text-2xl font-bold tracking-tight">Communities</h1>
            {studentGroups.length > 0 && (
              <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                {studentGroups.length}
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Cohorts, staff rooms, alumni circles — each with its own feed,
            roster, and access controls.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Pre-warning chip — calm at low usage, amber/red as the
              user approaches the per-plan community cap. The backend
              gates community creation; this is the friendly heads-up. */}
          <PlanLimitHint
            metric="batches"
            current={studentGroups.length}
            noun="Community"
          />
          <CommunityTooltip>
            <Button onClick={requestCreate}>
              <Plus className="mr-1.5 h-4 w-4" /> New community
            </Button>
          </CommunityTooltip>
        </div>
      </div>

      <SearchInput
        pageId="communities-list"
        value={search}
        onChange={setSearch}
        placeholder="Search communities — typos OK"
        ariaLabel="Search communities"
        shortcutDescription="Focus community search"
        className="max-w-md"
      />

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Users2 className="h-10 w-10 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">
              {studentGroups.length === 0 ? "No communities yet" : "No communities match"}
            </h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              {studentGroups.length === 0
                ? "Spin up your first community — a cohort around a course, a staff room, an alumni circle, anything where members talk. Each one gets its own feed + member roster + access controls."
                : "Try a different search term."}
            </p>
            {studentGroups.length === 0 && (
              <Button className="mt-4" onClick={requestCreate}>
                <Plus className="mr-1.5 h-4 w-4" /> Create your first community
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((batch) => {
            const course = batch.courseId
              ? courses.find((c) => c.id === batch.courseId)
              : undefined
            const posts = getPostsForBatch(batch.id)
            const postCount = posts.length
            const memberCount = batch.memberIds.length
            // "Last active" — most recent post createdAt. We don't
            // include comments here because comment-only activity
            // without a post is rare, and the extra reduce-per-card
            // would blow up cheap-cost render budgets on a workspace
            // with hundreds of communities. Cards stay fast.
            const lastPost = posts.length
              ? posts.reduce((m, p) =>
                  new Date(p.createdAt) > new Date(m.createdAt) ? p : m,
                )
              : null
            const lastActive = lastPost ? relativeFromNow(lastPost.createdAt) : null
            // Fresh = at least one post in the last 7 days. Drives
            // the small "Active" chip on the hero band so a teacher
            // can spot at a glance which cohorts are alive vs.
            // dormant.
            const isFresh = lastPost
              ? Date.now() - new Date(lastPost.createdAt).getTime() < 7 * 24 * 60 * 60 * 1000
              : false
            const color = batch.color ?? BATCH_COLORS[0]
            const initials = communityInitials(batch.name)
            return (
              <Link
                key={batch.id}
                href={`/dashboard/batches/${batch.id}`}
                className="group block focus:outline-none"
              >
                {/* `py-0 gap-0` overrides the shadcn Card defaults
                    (py-6, gap-6 between children) — without these the
                    hero band sits offset from the card edges with
                    awkward white margins above and below it. */}
                <Card className="h-full overflow-hidden border-border/70 py-0 gap-0 transition-all duration-200 group-hover:-translate-y-1 group-hover:border-primary/40 group-hover:shadow-xl group-focus-visible:ring-2 group-focus-visible:ring-primary">
                  {/* Hero band — gradient base + decorative SVG cover.
                      The cover is deterministically picked from a small
                      set of educational illustrations (books, atom,
                      code, chart, laurel) using a hash of the
                      community id, so every community has a unique
                      face without needing per-tenant uploaded art. */}
                  <div
                    className="relative h-28 w-full overflow-hidden"
                    style={{ background: gradientFromColor(color) }}
                  >
                    <CommunityCover
                      seed={batch.id + batch.name}
                      color={color}
                      className="absolute inset-0"
                    />
                    {/* Top-right meta row: fresh-activity chip + course chip */}
                    <div className="absolute right-3 top-3 flex items-center gap-1.5">
                      {isFresh && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 shadow-sm backdrop-blur-sm">
                          <span className="relative flex h-1.5 w-1.5">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          </span>
                          Active
                        </span>
                      )}
                      {course && (
                        <span
                          className="inline-flex max-w-[120px] items-center gap-1 truncate rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-semibold text-foreground shadow-sm backdrop-blur-sm"
                          title={course.title}
                        >
                          <BookOpen className="h-2.5 w-2.5 shrink-0" />
                          <span className="truncate">{course.title}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <CardContent className="relative space-y-3 px-5 pb-4 pt-4">
                    {/* Avatar + title on the same row — avatar acts as
                        an identity puck, title sits to its right.
                        Previously the avatar floated above the title
                        and bled space between them. */}
                    <div className="flex items-start gap-3">
                      <div
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl font-serif text-base font-bold text-white shadow-sm ring-1 ring-black/5"
                        style={{ backgroundColor: color }}
                        aria-hidden
                      >
                        {initials}
                      </div>
                      <div className="min-w-0 flex-1 space-y-1">
                        <h3 className="font-serif text-[17px] font-bold leading-tight tracking-tight text-foreground group-hover:text-primary transition-colors">
                          {batch.name}
                        </h3>
                        {(batch.purpose || batch.description) ? (
                          <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                            {stripHtmlToPreview(batch.description || batch.purpose)}
                          </p>
                        ) : (
                          <p className="text-xs italic text-muted-foreground/70">
                            No description yet — add one to help members orient.
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Stats strip — icon-led so it scans in a sweep
                        rather than reading like a label-value table. */}
                    <div className="flex items-center gap-3 border-t border-border/60 pt-3 text-[11.5px] text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5" />
                        <span className="font-semibold tabular-nums text-foreground">
                          {memberCount}
                        </span>
                        <span className="hidden sm:inline">
                          {memberCount === 1 ? "member" : "members"}
                        </span>
                      </span>
                      <span className="h-3 w-px bg-border" />
                      <span className="inline-flex items-center gap-1.5">
                        <MessageSquare className="h-3.5 w-3.5" />
                        <span className="font-semibold tabular-nums text-foreground">
                          {postCount}
                        </span>
                        <span className="hidden sm:inline">
                          {postCount === 1 ? "post" : "posts"}
                        </span>
                      </span>
                      {lastActive && (
                        <span
                          className="ml-auto inline-flex items-center gap-1.5 truncate"
                          title={`Last activity: ${lastActive}`}
                        >
                          <Clock className="h-3.5 w-3.5" />
                          <span className="truncate">{lastActive}</span>
                        </span>
                      )}
                    </div>

                    {/* Open-cue — reveals on hover. Replaces the static
                        "Open community →" that used to draw the eye
                        even when not interacting. */}
                    <div className="flex items-center justify-between">
                      {memberCount === 0 && postCount === 0 ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-600 dark:text-amber-400">
                          <Sparkles className="h-3 w-3" />
                          Ready to invite members
                        </span>
                      ) : (
                        <span />
                      )}
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100">
                        Open <ArrowRight className="h-3 w-3" />
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}

      <CreateBatchDialog
        open={openCreate}
        onOpenChange={setOpenCreate}
        onCreate={(payload) => {
          // Defence in depth — even if the open-dialog gate is
          // bypassed (e.g. tests, browser-back race), the create
          // submit itself refuses past-cap creation.
          if (limitKnown && atCap) {
            setOpenCreate(false)
            setShowLimitDialog(true)
            return
          }
          const id = generateId("batch")
          const color = BATCH_COLORS[studentGroups.length % BATCH_COLORS.length]
          const now = new Date().toISOString()
          addStudentGroup({
            id,
            name: payload.name,
            description: payload.description,
            purpose: payload.description, // keep `purpose` in sync for legacy reads
            courseId: payload.courseId,
            color,
            memberIds: [],
            createdBy: currentUser?.id,
            createdAt: now,
            updatedAt: now,
          })

          // Sprint A Communities #3 — auto-welcome post. Pinned so
          // it stays at the top of the feed for new joiners. The
          // template chosen in the dialog supplies the body; the
          // Blank template returns empty welcomePost so nothing
          // posts (preserving the explicit "I want it empty" path).
          // Author is the creating admin so the post has a real
          // human signature, not a system message; falls back to
          // first admin in the workspace when currentUser missing.
          if (payload.welcomePost && payload.welcomePost.trim()) {
            const author = currentUser?.id ?? users.find((u) => u.role === "admin")?.id
            if (author) {
              addBatchPost({
                id: generateId("post"),
                batchId: id,
                authorId: author,
                body: payload.welcomePost,
                pinned: true,
                hidden: false,
                comments: [],
                createdAt: now,
                updatedAt: now,
              })
              // Sprint B Communities #50 — seed sample posts after
              // the welcome. We stagger createdAt slightly so the
              // feed sort doesn't collapse them on top of each other
              // — newest first puts seed1 below seed2 below the
              // welcome (which is pinned anyway, so stays on top).
              const seeds = payload.seedPosts ?? []
              for (let i = 0; i < seeds.length; i++) {
                addBatchPost({
                  id: generateId("post"),
                  batchId: id,
                  authorId: author,
                  body: seeds[i].body,
                  pinned: false,
                  hidden: false,
                  comments: [],
                  // 30s back per seed so they show up in stable order
                  // beneath the welcome.
                  createdAt: new Date(Date.now() - (i + 1) * 30_000).toISOString(),
                  updatedAt: now,
                })
              }
            }
          }
        }}
      />

      {/* Plan-limit dialog — replaces the silent "click does nothing"
          we used to ship past the cap. The dialog explains what the
          current plan caps at, what plan would lift the restriction,
          and routes the user to Billing rather than just blocking. */}
      <Dialog open={showLimitDialog} onOpenChange={setShowLimitDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>You&rsquo;ve hit the Communities limit</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2 text-sm">
            <p>
              Your current plan includes{" "}
              <span className="font-semibold text-foreground">
                {cap === Infinity ? "unlimited" : cap} {cap === 1 ? "community" : "communities"}
              </span>
              . You already have{" "}
              <span className="font-semibold text-foreground">
                {studentGroups.length}
              </span>
              .
            </p>
            <p className="text-muted-foreground">
              Upgrade to <span className="font-semibold text-foreground capitalize">{recommendedPlan}</span> to add more — every community gets its own feed, roster, and access controls.
            </p>
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="ghost" onClick={() => setShowLimitDialog(false)}>
              Not now
            </Button>
            <Button asChild>
              <Link href="/dashboard/settings/billing">View plans</Link>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/** Sprint A Communities #1 — template gallery.
 *  Each template pre-fills:
 *    - name suggestion / placeholder
 *    - description copy
 *    - welcome-post body (used by Communities #3 auto-pin on create)
 *    - first-week prompts (3) the auto-welcome post embeds as
 *      starter questions
 *  Keeping templates as a flat const here (not a store) on purpose:
 *  they ship with the product, never user-edited; if templates ever
 *  go server-managed we promote to lib/community-templates.ts.
 */
interface CommunityTemplate {
  id: string
  label: string
  emoji: string
  description: string
  /** Placeholder shown in the name input. */
  namePlaceholder: string
  /** Pre-filled long description body (rich-text safe — plain text
   *  renders fine through the existing RichTextContent). */
  descriptionDraft: string
  /** Welcome-post body inserted as a pinned auto-post. Three starter
   *  prompts at the end push first-week engagement. */
  welcomePost: string
  /** Sprint B Communities #50 — additional non-pinned sample posts
   *  the template seeds on creation. Each is labelled "Sample"
   *  inline so the admin can recognise and delete them once real
   *  content arrives. Empty array for templates where samples
   *  would feel forced (Blank). */
  seedPosts?: Array<{ body: string }>
}

const COMMUNITY_TEMPLATES: CommunityTemplate[] = [
  {
    id: "blank",
    label: "Blank",
    emoji: "✨",
    description: "Start from scratch. No template, no auto-posts.",
    namePlaceholder: "My community",
    descriptionDraft: "",
    welcomePost: "",
  },
  {
    id: "qa",
    label: "Q&A group",
    emoji: "❓",
    description: "Members ask, the group answers. Best for support + study help.",
    namePlaceholder: "React Q&A · open thread",
    descriptionDraft:
      "<p>A place to ask the questions you're stuck on — no judgement, no minimum. Everyone here is figuring it out alongside you. Tag your post with the topic and someone will jump in.</p>",
    welcomePost:
      "<p>👋 Welcome! This community is for asking the questions you're stuck on. A few ground rules:</p><ul><li>Be specific — show the code / the screenshot / the exact error.</li><li>Search before you ask (use the search box).</li><li>If someone helps you, react with 💡 so the answer floats up for the next person.</li></ul><p><strong>Drop your first question below — what are you working on?</strong></p>",
    seedPosts: [
      {
        body:
          "<p><em>Sample post — delete when you're ready.</em></p>" +
          "<p>📌 <strong>How to ask a great question</strong></p>" +
          "<ol><li>Lead with what you actually want to do.</li><li>Paste the exact error / screenshot.</li><li>Mention what you've already tried.</li></ol>",
      },
    ],
  },
  {
    id: "cohort",
    label: "Cohort",
    emoji: "🎓",
    description: "Time-bound group going through a course together.",
    namePlaceholder: "Sep 2026 cohort · Intro to React",
    descriptionDraft:
      "<p>We're a cohort going through the course together over the next 12 weeks. Expect weekly check-ins, group projects, and live office hours. Everyone in this community is starting from the same Module 1.</p>",
    welcomePost:
      "<p>🚀 Welcome to the Sep 2026 cohort! We start Module 1 together this week.</p><p>Quick intro round — reply with:</p><ol><li>Where you're joining from</li><li>What you want to build by week 12</li><li>One thing you're nervous about</li></ol><p>I'll be active here every weekday — let's go.</p>",
    seedPosts: [
      {
        body:
          "<p><em>Sample post — delete when you're ready.</em></p>" +
          "<p>🗓 <strong>This week's rhythm</strong></p>" +
          "<ul><li>Mon — Module kickoff (live)</li><li>Wed — Office hours</li><li>Fri — Cohort showcase</li></ul>",
      },
      {
        body:
          "<p><em>Sample post — delete when you're ready.</em></p>" +
          "<p>🔥 <strong>Pair up for the week</strong></p>" +
          "<p>Reply with a topic you'd love a pair-partner on. The first two replies become a pair, the next two, and so on.</p>",
      },
    ],
  },
  {
    id: "office-hours",
    label: "Office hours",
    emoji: "🕐",
    description: "Recurring drop-in sessions + transcript archive.",
    namePlaceholder: "Office hours · every Tuesday 6pm IST",
    descriptionDraft:
      "<p>I host live office hours every week. This community is where:</p><ul><li>You drop your questions before the session.</li><li>Recordings + notes land after.</li><li>We continue async between sessions.</li></ul>",
    welcomePost:
      "<p>👋 Welcome to office hours! Two things to know:</p><ul><li><strong>Next session:</strong> I'll pin it at the top each week.</li><li><strong>Got a question?</strong> Drop it below before Tuesday — I'll cover the most upvoted first.</li></ul><p>Reply with: what's the one thing you'd love help with this week?</p>",
  },
  {
    id: "course",
    label: "Course community",
    emoji: "📚",
    description: "Attached to a course — members are course enrollees.",
    namePlaceholder: "React · students",
    descriptionDraft:
      "<p>This community is for students currently enrolled in the course. Use it to:</p><ul><li>Share what you're building.</li><li>Get help on assignments.</li><li>Find study partners.</li></ul>",
    welcomePost:
      "<p>🎉 Welcome to the course community! This is your space — share your progress, ask for help, and connect with other students.</p><p><strong>Your first post?</strong> Tell us what brought you to this course and what you hope to learn.</p>",
  },
  {
    id: "free-chat",
    label: "Free chat",
    emoji: "💬",
    description: "Loose group for general conversation. No fixed agenda.",
    namePlaceholder: "Lounge",
    descriptionDraft:
      "<p>The hangout spot. Share what you're reading, what you're building, what's frustrating you. Off-topic is on-topic here.</p>",
    welcomePost:
      "<p>Welcome to the lounge 👋</p><p>This is the no-agenda corner. Share whatever — a project, a book, a meme, a question. The only rule is be kind.</p>",
  },
]

function CreateBatchDialog({
  open,
  onOpenChange,
  onCreate,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onCreate: (payload: {
    name: string
    description?: string
    courseId?: string
    welcomePost?: string
    /** Sprint B Communities #50 — passthrough of the chosen
     *  template's sample post bodies so the parent handler can
     *  insert them as un-pinned posts after the welcome post. */
    seedPosts?: Array<{ body: string }>
  }) => void
}) {
  const { courses } = useLMS()
  // Sprint A Communities #1 — two-step dialog. Step 1 = template
  // pick (no per-template form fields; just the choice). Step 2 =
  // name + description + course. Picking "Blank" still hits step 2;
  // we just don't pre-fill anything.
  const [step, setStep] = useState<"template" | "details">("template")
  const [templateId, setTemplateId] = useState<string>("blank")
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [courseId, setCourseId] = useState<string>("none")

  const template = COMMUNITY_TEMPLATES.find((t) => t.id === templateId) ?? COMMUNITY_TEMPLATES[0]

  // Reset transient state whenever the dialog opens fresh. Stops a
  // half-filled previous attempt from leaking into a new one. Step
  // resets to "template" so the gallery is always the first thing.
  useEffect(() => {
    if (open) {
      setStep("template")
      setTemplateId("blank")
      setName("")
      setDescription("")
      setCourseId("none")
    }
  }, [open])

  function pickTemplate(t: CommunityTemplate) {
    setTemplateId(t.id)
    // Pre-fill draft fields from the template. The user can edit
    // any of them in step 2 — templates are accelerators, not locks.
    setDescription(t.descriptionDraft)
    setStep("details")
  }

  function submit() {
    if (!name.trim()) return
    onCreate({
      name: name.trim(),
      description: description.trim() || undefined,
      courseId: courseId !== "none" ? courseId : undefined,
      // Sprint A Communities #3 — pass the template's welcome post
      // up so the parent handler can pin it as an auto-post on
      // creation. Empty for the Blank template.
      welcomePost: template.welcomePost || undefined,
      // Sprint B Communities #50 — passthrough of sample seed posts
      // (Q&A asking guide, cohort rhythm, etc) so the new community
      // never looks empty on day one. Each carries a "Sample —
      // delete when ready" marker inline.
      seedPosts: template.seedPosts,
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn("max-w-2xl", step === "template" && "max-w-3xl")}>
        <DialogHeader>
          <DialogTitle>
            {step === "template" ? "Pick a starting point" : "Set up your community"}
          </DialogTitle>
        </DialogHeader>

        {step === "template" ? (
          // Sprint A Communities #1 — template gallery. Tile grid
          // with emoji + label + short description. Click anywhere
          // on a tile selects + advances to step 2.
          <div className="space-y-3 pt-2">
            <p className="text-sm text-muted-foreground">
              Each template ships a welcome post, draft description, and starter prompts so
              your community isn&apos;t empty on day one. You can change anything later.
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {COMMUNITY_TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => pickTemplate(t)}
                  className="group flex items-start gap-3 rounded-lg border border-border bg-card p-3 text-left transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
                >
                  <span className="text-2xl leading-none">{t.emoji}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold leading-tight">{t.label}</span>
                    <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">
                      {t.description}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-3 pt-2">
            <div className="rounded-md border border-primary/20 bg-primary/5 p-2.5 text-[12px]">
              <span className="font-semibold">{template.emoji} {template.label}</span>
              <span className="ml-1 text-muted-foreground">· {template.description}</span>
              <button
                type="button"
                onClick={() => setStep("template")}
                className="ml-2 text-primary hover:underline"
              >
                Change
              </button>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="batch-name">Name *</Label>
              <Input
                id="batch-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={template.namePlaceholder}
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="batch-desc">Description</Label>
                <AIGenerateButton
                  label="Draft with AI"
                  size="xs"
                  disabled={!name.trim()}
                  onGenerate={async () => {
                    const topic = name.trim()
                    if (!topic) {
                      toast.error("Give the community a name first.")
                      return
                    }
                    const r = await aiCourseDescription({ title: topic })
                    if ("error" in r) {
                      toast.error(r.error)
                      return
                    }
                    setDescription(r.description)
                    toast.success("Description drafted. Edit anything you don't love.")
                  }}
                />
              </div>
              <RichTextEditor
                value={description}
                onChange={setDescription}
                placeholder="What is this community for? Who should join? What will members get?"
                minHeight={120}
              />
              {template.welcomePost && (
                <p className="text-[11px] text-muted-foreground">
                  ✨ A welcome post will be auto-pinned when you create — pre-written for the{" "}
                  <strong>{template.label}</strong> template.
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="batch-course">Course (optional)</Label>
              <Select value={courseId} onValueChange={setCourseId}>
                <SelectTrigger id="batch-course">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No course</SelectItem>
                  {courses.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">
                Connects the community to a course so members see related lessons + announcements.
              </p>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {step === "details" && (
            <Button onClick={submit} disabled={!name.trim()}>
              <Plus className="mr-1.5 h-4 w-4" /> Create community
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

