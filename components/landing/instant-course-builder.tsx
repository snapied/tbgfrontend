"use client"

// "Build a course in 60 seconds" — the interactive homepage widget
// that turns whatever the visitor types into a real course outline +
// cover + certificate + sales-page preview, in their browser, in
// under five seconds.
//
// Why this section exists
// -----------------------
// Incumbent creator-platform homepages describe their product. Ours
// lets you USE it before signing up. The visitor sees their own
// topic reflected back in a working course preview — that's the
// closest a homepage can come to a free sample. It's also the move
// most competitors can't quickly copy: their products aren't this
// composable.
//
// How it works
// ------------
// 1. User types a topic and hits "Build my course".
// 2. We run a deterministic generator (see course-builder-templates.ts)
//    that produces a 6-module outline + cover hue + sample price +
//    promise lines.
// 3. A choreographed reveal animation walks through five "phases"
//    (mapping topic → designing modules → cover art → certificate →
//    sales page) over ~5 seconds. Each phase pulses, then the panel
//    fades in.
// 4. After reveal, we offer "Save this as your first course" which
//    persists the seed to sessionStorage and links to /signup.
//
// The whole thing runs client-side. No AI calls, no network. The
// seed quality is good enough that visitors who keep iterating see
// real variation across yoga / finance / coding / exam-prep / etc.

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowRight,
  CheckCircle2,
  Image as ImageIcon,
  Loader2,
  LogIn,
  RefreshCw,
  ScrollText,
  ShieldCheck,
  Sparkles,
  Wand2,
} from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  CATEGORY_LABEL,
  generateCourseSeed,
  persistCourseSeed,
  pickCoverImageUrl,
  seedToFullCourse,
  type CourseSeed,
} from "@/lib/course-builder-templates"
import {
  persistCoursesWithFallback,
  useLMS,
  type Course,
} from "@/lib/lms-store"
import { readCurrentTenantSlug } from "@/lib/tenant-store"
import {
  composeCoverPng,
  isBakedThumbnailAcceptable,
} from "@/lib/cover-image-compose"
import { uploadDataUrl } from "@/lib/upload-asset"

// Suggestion chips. Real Indian-teacher use cases — each maps to a
// different category so a curious visitor sees variety across clicks.
const SUGGESTIONS = [
  "Yoga for beginners",
  "Vedic maths for 10-14 year olds",
  "Python for absolute beginners",
  "UPSC History prelims",
  "Mutual funds for first-time investors",
  "Conversational Hindi for expats",
  "Watercolour for hobbyists",
] as const

// Phases of the generation reveal. Each phase has a label, the
// approximate ms it should pulse before moving on, and the panel
// (if any) that it reveals when it completes.
const PHASES = [
  { id: "topic",       label: "Mapping your topic…",          duration: 700,  reveals: null },
  { id: "outline",     label: "Designing 6 modules…",          duration: 1100, reveals: "outline"   as const },
  { id: "cover",       label: "Generating cover art…",         duration: 900,  reveals: "cover"     as const },
  { id: "certificate", label: "Designing the certificate…",    duration: 900,  reveals: "certificate" as const },
  { id: "landing",     label: "Drafting your sales page…",     duration: 900,  reveals: "landing"   as const },
] as const

type RevealKey = "outline" | "cover" | "certificate" | "landing"

export function InstantCourseBuilder() {
  const router = useRouter()
  const { currentUser, addCourse } = useLMS()
  const [input, setInput] = useState("")
  const [seed, setSeed] = useState<CourseSeed | null>(null)
  const [phaseIndex, setPhaseIndex] = useState<number>(-1) // -1 = idle
  const [creating, setCreating] = useState(false)
  // Which panels have been revealed so far. The animation gates
  // each panel until its phase finishes — keeps the choreography
  // tight even when generation itself is instant.
  const [revealed, setRevealed] = useState<Record<RevealKey, boolean>>({
    outline:     false,
    cover:       false,
    certificate: false,
    landing:     false,
  })
  const phaseTimerRef = useRef<number | null>(null)

  // Cleanup on unmount so a slow visitor leaving mid-animation
  // doesn't leak a timer.
  useEffect(() => {
    return () => {
      if (phaseTimerRef.current != null) window.clearTimeout(phaseTimerRef.current)
    }
  }, [])

  const isGenerating = phaseIndex >= 0 && phaseIndex < PHASES.length
  const isDone = seed != null && phaseIndex === PHASES.length
  const currentPhase = phaseIndex >= 0 && phaseIndex < PHASES.length ? PHASES[phaseIndex] : null

  function start(rawTopic: string) {
    const topic = rawTopic.trim()
    if (!topic) return
    const next = generateCourseSeed(topic)
    setSeed(next)
    setRevealed({ outline: false, cover: false, certificate: false, landing: false })
    setPhaseIndex(0)
    runPhase(0, next)
  }

  // Recursive phase runner. Each phase pulses for its duration, then
  // (if it reveals a panel) flips that panel on and advances. We
  // do this with setTimeout instead of CSS animations so the same
  // hook can drive the progress line + the panel reveals in lock-step.
  function runPhase(idx: number, currentSeed: CourseSeed) {
    const phase = PHASES[idx]
    if (!phase) return
    if (phaseTimerRef.current != null) window.clearTimeout(phaseTimerRef.current)
    phaseTimerRef.current = window.setTimeout(() => {
      if (phase.reveals) {
        setRevealed((r) => ({ ...r, [phase.reveals!]: true }))
      }
      const nextIdx = idx + 1
      setPhaseIndex(nextIdx)
      if (nextIdx < PHASES.length) {
        runPhase(nextIdx, currentSeed)
      } else {
        // All phases done. Persist the seed so the signup flow can
        // pick it up if the visitor converts. We *don't* bake a
        // big text-overlaid SVG thumbnail here anymore — that
        // would blow the localStorage quota on save. The bare
        // image URL (from pickCoverImageUrl) is what lands on the
        // saved course; the homepage preview keeps its
        // text-overlaid look via the inline SVG renderer.
        persistCourseSeed(currentSeed)
      }
    }, phase.duration)
  }

  function reset() {
    if (phaseTimerRef.current != null) window.clearTimeout(phaseTimerRef.current)
    setSeed(null)
    setPhaseIndex(-1)
    setRevealed({ outline: false, cover: false, certificate: false, landing: false })
    setInput("")
  }

  const progressPct = useMemo(() => {
    if (phaseIndex < 0) return 0
    if (phaseIndex >= PHASES.length) return 100
    // Each phase contributes its own duration to the bar. We use
    // index/phases (rather than time elapsed) because the bar should
    // feel discrete — it ticks forward at each reveal.
    return Math.round(((phaseIndex + 1) / PHASES.length) * 100)
  }, [phaseIndex])

  return (
    <section className="relative overflow-hidden border-y border-border bg-gradient-to-b from-background via-secondary/40 to-background py-24">
      {/* Ambient blooms — same palette family as the rest of the
          page, slightly more saturated so this section reads as the
          "moment" on scroll. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-32 top-12 h-80 w-80 rounded-full bg-primary/[0.12] blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 bottom-20 h-96 w-96 rounded-full bg-accent/[0.14] blur-3xl"
      />

      <div className="relative mx-auto max-w-6xl px-6 lg:px-8">
        {/* Section header */}
        <div className="mx-auto max-w-3xl text-center">
          <Badge variant="outline" className="mb-4 inline-flex items-center gap-1.5 border-primary/40 bg-primary/[0.06] py-1.5 text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            Live demo · no signup required
          </Badge>
          <h2 className="font-serif text-4xl font-bold tracking-tight sm:text-5xl lg:text-[3.25rem] lg:leading-[1.05]">
            Type what you teach.
            <br />
            <span className="text-primary">Watch your course come to life.</span>
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
            In about five seconds you&apos;ll see a real course outline, a cover image,
            a certificate, and a sales page — built around your topic, in your browser,
            yours to keep even if you never sign up.
          </p>
        </div>

        {/* Input row */}
        <div className="mx-auto mt-12 max-w-3xl">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (!isGenerating) start(input)
            }}
            className="rounded-2xl border border-border bg-card p-3 shadow-xl ring-1 ring-primary/10"
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="flex flex-1 items-center gap-2 px-3">
                <Wand2 className="h-5 w-5 shrink-0 text-primary" />
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="What do you teach? (e.g. Vedic maths for 10-14 year olds)"
                  className="w-full bg-transparent py-3 text-base outline-none placeholder:text-muted-foreground/70"
                  disabled={isGenerating}
                />
              </div>
              <Button
                type="submit"
                size="lg"
                disabled={isGenerating || input.trim().length < 3}
                className="sm:min-w-[180px]"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                    Building…
                  </>
                ) : isDone ? (
                  <>
                    <RefreshCw className="mr-1.5 h-4 w-4" />
                    Build another
                  </>
                ) : (
                  <>
                    Build my course
                    <ArrowRight className="ml-1.5 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </form>

          {/* Suggestion chips. Pre-fill input + immediately start. */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs">
            <span className="text-muted-foreground">Try:</span>
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => {
                  if (isGenerating) return
                  setInput(s)
                  start(s)
                }}
                disabled={isGenerating}
                className="rounded-full border border-border bg-card px-3 py-1 text-foreground/80 transition-colors hover:border-primary/40 hover:bg-primary/[0.05] hover:text-foreground disabled:opacity-50"
              >
                {s}
              </button>
            ))}
          </div>

          {/* Progress bar + current phase label. Only renders while
              generating so the section doesn't feel cluttered at rest. */}
          {(isGenerating || isDone) && (
            <div className="mt-6">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
                <div
                  className="h-full bg-gradient-to-r from-primary via-primary to-accent transition-all duration-500 ease-out"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                {isDone ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                    Your course is ready. Save it as your first draft below.
                  </>
                ) : (
                  <>
                    <span className="relative inline-flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
                    </span>
                    {currentPhase?.label ?? "Starting…"}
                  </>
                )}
              </p>
            </div>
          )}
        </div>

        {/* Result panels — 2x2 grid, each panel hidden until its
            phase finishes. The reveal order (outline → cover →
            certificate → landing) mirrors how a creator actually
            thinks about launching: structure first, then visual,
            then proof, then sales. */}
        {seed && (
          <div className="mt-14 grid gap-5 lg:grid-cols-2">
            <OutlinePanel seed={seed} visible={revealed.outline} />
            <CoverPanel seed={seed}   visible={revealed.cover} />
            <CertificatePanel seed={seed} visible={revealed.certificate} />
            <LandingPanel seed={seed}    visible={revealed.landing} />
          </div>
        )}

        {/* Footer CTA — branches on auth. A signed-in visitor gets a
            direct "create + open in editor" path; an anonymous visitor
            heads to signup with the seed carried in sessionStorage so
            their work isn't wasted across the auth boundary. */}
        {isDone && seed && (
          <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            {currentUser ? (
              <Button
                size="lg"
                className="gap-1.5"
                disabled={creating}
                onClick={async () => {
                  setCreating(true)
                  try {
                    // Bake the cover BEFORE we save — that way every
                    // course lands in localStorage with its title +
                    // photo already merged into a single small JPEG
                    // data URL. No background swap, no rate-limited
                    // SVG <image> tags on the list page, no quota
                    // surprises later. composeCoverPng has a 5s
                    // timeout baked in; if Picsum stalls we fall
                    // through to the bare URL and the dashboard
                    // still has a working photo cover, just without
                    // the title baked in.
                    const baked = await composeCoverPng(seed)
                    let thumbnailOverride: string | undefined = undefined
                    if (baked && isBakedThumbnailAcceptable(baked)) {
                      try {
                        thumbnailOverride = await uploadDataUrl(baked, "course-cover")
                      } catch (err) {
                        console.warn("Failed to upload baked homepage cover, falling back to base64", err)
                        thumbnailOverride = baked
                      }
                    }
                    const draft = seedToFullCourse(
                      seed,
                      {
                        id: currentUser.id,
                        name: currentUser.name,
                        email: currentUser.email,
                        role: currentUser.role,
                      },
                      { thumbnailOverride },
                    )
                    // Belt-and-suspenders persistence. addCourse
                    // updates the in-memory store and triggers a
                    // useEffect that writes localStorage on the next
                    // render — but if React batches that effect past
                    // our router.push, the write never lands. Writing
                    // here too guarantees the course is on disk
                    // before navigation, regardless of effect timing.
                    addCourse(draft as unknown as Course)
                    try {
                      const tenantSlug = readCurrentTenantSlug()
                      const key = `thebigclass.t.${tenantSlug}.lms.courses.v1`
                      const raw = window.localStorage.getItem(key)
                      const existing: Course[] = raw ? JSON.parse(raw) : []
                      // Replace-or-append (in case React state was
                      // ahead of localStorage and the course is
                      // already in courses[]).
                      const next = existing.some((c) => c.id === draft.id)
                        ? existing.map((c) => (c.id === draft.id ? (draft as unknown as Course) : c))
                        : [...existing, draft as unknown as Course]
                      // Shared progressive-trim cascade used by
                      // both this direct write and the LMS store's
                      // own persist effect. Writes the most full
                      // payload that fits — strip baked thumbnails,
                      // empty oldest courses' lesson content, drop
                      // older courses entirely, last-ditch keep
                      // only the newest. Either way the brand-new
                      // course they just hit Create on lands.
                      persistCoursesWithFallback(key, next)
                    } catch (err) {
                      // eslint-disable-next-line no-console
                      console.warn("[course-builder] direct persist failed", err)
                    }
                    toast.success(`"${draft.title}" created as a draft.`)
                    router.push(`/dashboard/courses/${draft.id}`)
                  } catch (err) {
                    setCreating(false)
                    toast.error(
                      `Couldn't save the course: ${(err as Error).message}`,
                    )
                  }
                }}
              >
                {creating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating…
                  </>
                ) : (
                  <>
                    Create it in my workspace
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            ) : (
              <Button asChild size="lg" className="gap-1.5">
                <Link href="/signup">
                  Save this as my first course
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            )}
            <Button size="lg" variant="outline" onClick={reset}>
              <RefreshCw className="mr-1.5 h-4 w-4" />
              Build another
            </Button>
            {/* Helper line — different copy for the two paths so the
                reader knows exactly what's about to happen. */}
            <p className="mt-2 max-w-xs text-center text-xs text-muted-foreground sm:ml-3 sm:mt-0 sm:text-left">
              {currentUser ? (
                <>
                  Signed in as <span className="font-medium">{currentUser.name}</span> · we&apos;ll
                  drop this into your dashboard as a draft you can publish in two clicks.
                </>
              ) : (
                <>
                  We&apos;ll save what you just built as a draft course in your new workspace.
                  Free forever, zero commission.{" "}
                  <Link href="/login" className="inline-flex items-center gap-0.5 text-primary hover:underline">
                    <LogIn className="h-3 w-3" /> Sign in
                  </Link>{" "}
                  if you already have one.
                </>
              )}
            </p>
          </div>
        )}
      </div>
    </section>
  )
}

// ---------------------------------------------------------------
// Outline panel — the course structure as a list of modules.
// ---------------------------------------------------------------
function OutlinePanel({ seed, visible }: { seed: CourseSeed; visible: boolean }) {
  return (
    <RevealCard visible={visible} title="Course outline" icon={<ScrollText className="h-4 w-4" />}>
      <div className="space-y-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            {CATEGORY_LABEL[seed.category]}
          </p>
          <h3 className="font-serif text-xl font-bold leading-tight">{seed.topic}</h3>
          {seed.audienceHint && (
            <p className="text-xs text-muted-foreground">For {seed.audienceHint}.</p>
          )}
        </div>
        <ol className="space-y-2 text-sm">
          {seed.modules.map((m, i) => (
            <li
              key={m.title}
              className="flex items-start gap-2.5 rounded-md border border-border/60 bg-card/60 p-2.5"
              style={{ animation: `revealRow 0.4s ease-out ${i * 80}ms both` }}
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[11px] font-bold text-primary">
                {i + 1}
              </span>
              <div className="min-w-0">
                <p className="truncate font-medium leading-tight">{m.title}</p>
                <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                  {m.lessons.join(" · ")}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </RevealCard>
  )
}

// ---------------------------------------------------------------
// Cover panel — single inline SVG with photo + text baked in
// ---------------------------------------------------------------
// The cover is one <svg> element that contains both an embedded
// <image> (a real photograph from Loremflickr) and the heading /
// eyebrow / pills as <text> elements. No separate HTML divs floating
// over the image — the text is part of the same visual unit as the
// photo, which is what the user asked for.
//
// Inline rendering (not data: URL) is intentional: SVGs loaded
// through <img src="data:..."> run in a sandboxed mode that blocks
// external image references for security. Rendering the SVG inline
// in the DOM lets the browser fetch the embedded photo normally.
function CoverPanel({ seed, visible }: { seed: CourseSeed; visible: boolean }) {
  const imageUrl = useMemo(() => pickCoverImageUrl(seed), [seed])
  const totalLessons = seed.modules.reduce((n, m) => n + m.lessons.length, 0)
  const hue = seed.brandHue
  // Word-wrap the title client-side so SVG <text> doesn't try to do
  // it (it can't). Three lines max, ellipsised if the topic is huge.
  const titleLines = useMemo(() => wrapTitleClient(seed.topic, 18, 3), [seed.topic])
  // Match the lib renderer's font sizing across 1 / 2 / 3 line
  // wraps so the preview and the saved SVG render identically.
  const titleFontSize = titleLines.length === 1 ? 56 : titleLines.length === 2 ? 50 : 44
  const titleLineHeight = titleFontSize * 1.05
  // Anchor the LAST line at y=394 (so the bottom row of the title
  // always sits the same distance above the info pills at y=436),
  // and stack earlier lines upward from there.
  const lastLineY = 394
  const titleAnchorY = lastLineY - (titleLines.length - 1) * titleLineHeight
  // Audience hint sits above the FIRST title line, with enough
  // clearance to skip the title's ascent. We use font-size * 0.85
  // as a safe cap-height proxy, plus 14px of breathing room.
  const audienceY = titleAnchorY - titleFontSize * 0.85 - 14

  const category = CATEGORY_LABEL[seed.category]
  const audienceText = seed.audienceHint ? `For ${seed.audienceHint}` : ""

  return (
    <RevealCard visible={visible} title="Cover art" icon={<ImageIcon className="h-4 w-4" />}>
      <div className="relative aspect-[16/10] w-full overflow-hidden rounded-lg ring-1 ring-border">
        <svg
          viewBox="0 0 800 500"
          preserveAspectRatio="xMidYMid slice"
          className="absolute inset-0 h-full w-full"
          role="img"
          aria-label={seed.topic}
        >
          <defs>
            {/* Dark-bottom overlay so the title stays legible against
                whatever photograph the search returns. */}
            <linearGradient id="cover-overlay" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"  stopColor="rgba(0,0,0,0.15)" />
              <stop offset="55%" stopColor="rgba(0,0,0,0.35)" />
              <stop offset="100%" stopColor="rgba(0,0,0,0.80)" />
            </linearGradient>
            {/* Brand-tint accent at the bottom-right — adds a
                category-specific warmth without dominating the photo. */}
            <radialGradient id="cover-tint" cx="0.95" cy="0.95" r="0.7">
              <stop offset="0%"  stopColor={`hsl(${hue}, 78%, 55%)`} stopOpacity={0.35} />
              <stop offset="100%" stopColor="rgba(0,0,0,0)" />
            </radialGradient>
            {/* Fallback rect that shows for the brief moment before
                the external photo loads (or permanently, if the load
                fails). Solid category-tinted gradient so the cover
                never looks broken. */}
            <linearGradient id="cover-fallback" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%"   stopColor={`hsl(${hue}, 78%, 58%)`} />
              <stop offset="100%" stopColor={`hsl(${(hue + 50) % 360}, 64%, 24%)`} />
            </linearGradient>
          </defs>

          {/* Fallback fill — sits underneath the <image> so we still
              have a coloured backdrop if the photo never arrives. */}
          <rect width="800" height="500" fill="url(#cover-fallback)" />

          {/* The photograph. We use href (SVG2) AND xlinkHref so
              older renderers still pick it up. */}
          <image
            href={imageUrl}
            xlinkHref={imageUrl}
            x="0"
            y="0"
            width="800"
            height="500"
            preserveAspectRatio="xMidYMid slice"
          />

          {/* Tint + overlay stack — sits between the photo and the
              text so the text always has a legible dark backdrop. */}
          <rect width="800" height="500" fill="url(#cover-tint)" />
          <rect width="800" height="500" fill="url(#cover-overlay)" />

          {/* Eyebrow chip (top-left): rounded rect + category label */}
          <g>
            <rect
              x="32"
              y="32"
              rx="13"
              ry="13"
              width={10 + category.length * 8}
              height="24"
              fill="rgba(255,255,255,0.18)"
            />
            <text
              x="42"
              y="48"
              fontFamily="Inter, system-ui, sans-serif"
              fontSize="11"
              fontWeight="700"
              letterSpacing="2"
              fill="white"
            >
              {category.toUpperCase()}
            </text>
          </g>

          {/* Brand mark (top-right) */}
          <text
            x="768"
            y="48"
            textAnchor="end"
            fontFamily="Inter, system-ui, sans-serif"
            fontSize="11"
            fontWeight="500"
            letterSpacing="1.5"
            fill="white"
            opacity="0.85"
          >
            THEBIGCLASS
          </text>

          {/* Audience hint (above the title, monospace caps) —
              positioned at audienceY which clears the title's
              ascent. */}
          {audienceText && (
            <text
              x="40"
              y={audienceY}
              fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
              fontSize="12"
              letterSpacing="2.5"
              fill="white"
              opacity="0.9"
            >
              {audienceText.toUpperCase()}
            </text>
          )}

          {/* Multi-line title — serif, white, drop-shadow filter */}
          <text
            fontFamily="Georgia, 'Times New Roman', serif"
            fontSize={titleFontSize}
            fontWeight="700"
            fill="#ffffff"
            style={{ letterSpacing: "-0.5px" }}
            filter="url(#cover-titleshadow)"
          >
            {titleLines.map((line, i) => (
              <tspan key={i} x="40" y={titleAnchorY + i * titleLineHeight}>
                {line}
              </tspan>
            ))}
          </text>
          {/* Define the title-shadow filter inline so it travels with
              the SVG. Soft black blur behind white text reads cleanly
              against any photo. */}
          <defs>
            <filter id="cover-titleshadow" x="-10%" y="-10%" width="120%" height="120%">
              <feGaussianBlur in="SourceAlpha" stdDeviation="3" />
              <feOffset dx="0" dy="2" result="offsetblur" />
              <feComponentTransfer>
                <feFuncA type="linear" slope="0.55" />
              </feComponentTransfer>
              <feMerge>
                <feMergeNode />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Info pills (bottom-left): modules / lessons / Certificate */}
          <g
            fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
            fontSize="11"
            fill="white"
          >
            <g>
              <rect x="40" y="436" rx="4" ry="4" width="92" height="24" fill="rgba(0,0,0,0.5)" />
              <text x="50" y="452">{seed.modules.length} modules</text>
            </g>
            <g>
              <rect x="140" y="436" rx="4" ry="4" width="92" height="24" fill="rgba(0,0,0,0.5)" />
              <text x="150" y="452">{totalLessons} lessons</text>
            </g>
            <g>
              <rect x="240" y="436" rx="4" ry="4" width="92" height="24" fill="rgba(0,0,0,0.5)" />
              <text x="250" y="452">Certificate</text>
            </g>
          </g>
        </svg>
      </div>
      <p className="mt-3 text-[11px] text-muted-foreground">
        Real photograph picked from a free image search around your topic, with your title
        designed in. Swap to your own art any time in the dashboard editor.
      </p>
    </RevealCard>
  )
}

// Word-wrap the title for SVG <text>/tspan. SVG can't auto-wrap, so
// we do it by character budget. Mirrors the wrapTitle logic in the
// templates lib but lives here too since this component needs it
// before the SVG is rendered.
function wrapTitleClient(input: string, maxCharsPerLine: number, maxLines: number): string[] {
  const words = input.split(/\s+/).filter(Boolean)
  if (words.length === 0) return [input]
  const lines: string[] = []
  let current = ""
  for (let idx = 0; idx < words.length; idx++) {
    const w = words[idx]
    const candidate = current ? `${current} ${w}` : w
    if (candidate.length <= maxCharsPerLine || current === "") {
      current = candidate
    } else {
      lines.push(current)
      current = w
      if (lines.length >= maxLines - 1) {
        const remaining = words.slice(idx).join(" ")
        const truncated =
          remaining.length > maxCharsPerLine
            ? remaining.slice(0, maxCharsPerLine - 1).trimEnd() + "…"
            : remaining
        lines.push(truncated)
        return lines
      }
    }
  }
  if (current) lines.push(current)
  return lines
}

// ---------------------------------------------------------------
// Certificate panel — uses a sample student name picked from a
// stable hash so the same topic gets the same name across reloads.
// ---------------------------------------------------------------
function CertificatePanel({ seed, visible }: { seed: CourseSeed; visible: boolean }) {
  const today = new Date().toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
  return (
    <RevealCard visible={visible} title="Certificate preview" icon={<ShieldCheck className="h-4 w-4" />}>
      <div className="relative overflow-hidden rounded-lg border-[3px] border-double border-primary/40 bg-gradient-to-br from-card to-secondary/30 p-5">
        {/* Decorative corner flourish */}
        <div
          aria-hidden
          className="absolute -right-8 -top-8 h-24 w-24 rounded-full"
          style={{
            background: `radial-gradient(circle at 30% 30%, hsl(${seed.brandHue},78%,55%,0.25), transparent 70%)`,
          }}
        />
        <p className="text-center text-[10px] font-bold uppercase tracking-[0.32em] text-primary">
          Certificate of Completion
        </p>
        <p className="mt-3 text-center text-[11px] text-muted-foreground">This is to certify that</p>
        <p className="mt-1 text-center font-serif text-2xl font-bold tracking-tight text-foreground">
          {seed.sampleStudentName}
        </p>
        <p className="mt-2 text-center text-[11px] text-muted-foreground">
          has successfully completed
        </p>
        <p className="mt-1 text-center font-serif text-base font-semibold italic text-foreground/90">
          &ldquo;{seed.topic}&rdquo;
        </p>
        <div className="mt-4 flex items-end justify-between text-[10px] text-muted-foreground">
          <div>
            <p className="font-semibold uppercase tracking-wider text-foreground/70">Issued</p>
            <p>{today}</p>
          </div>
          <div className="text-right">
            <p className="font-serif italic text-foreground/80">The Big Class</p>
            <p>Verifiable at /verify</p>
          </div>
        </div>
      </div>
      <p className="mt-3 text-[11px] text-muted-foreground">
        Sample student. Real certificates carry a QR + verification ID auto-generated per learner.
      </p>
    </RevealCard>
  )
}

// ---------------------------------------------------------------
// Landing-page mock — what the course-detail page would look like
// on a tenant portal, with the topic + price + promise lines.
// ---------------------------------------------------------------
function LandingPanel({ seed, visible }: { seed: CourseSeed; visible: boolean }) {
  return (
    <RevealCard visible={visible} title="Sales page preview" icon={<Sparkles className="h-4 w-4" />}>
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        {/* Mock browser chrome. Sells the "this is your live site" idea. */}
        <div className="flex items-center gap-1.5 border-b border-border bg-muted/40 px-3 py-2">
          <span className="h-2 w-2 rounded-full bg-destructive/50" />
          <span className="h-2 w-2 rounded-full bg-accent/60" />
          <span className="h-2 w-2 rounded-full bg-success/60" />
          <span className="ml-2 truncate font-mono text-[10px] text-muted-foreground">
            yourdomain.com/courses/{slugify(seed.topic)}
          </span>
        </div>
        <div className="grid gap-4 p-4 sm:grid-cols-[1.2fr_1fr]">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-primary">
              {CATEGORY_LABEL[seed.category]}
            </p>
            <h3 className="mt-1 font-serif text-xl font-bold leading-tight">{seed.topic}</h3>
            <p className="mt-1 text-xs text-muted-foreground">by Renu Rawat · Lifetime access</p>
            <ul className="mt-3 space-y-1.5 text-xs text-foreground/85">
              {seed.promiseLines.map((p) => (
                <li key={p} className="flex items-start gap-1.5">
                  <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-success" />
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="flex flex-col items-stretch justify-center gap-2 rounded-md border border-border bg-muted/30 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              One-time
            </p>
            <p className="font-serif text-2xl font-bold tracking-tight">
              ₹{seed.priceInr.toLocaleString("en-IN")}
            </p>
            <p className="text-[10px] text-muted-foreground">UPI · cards · netbanking · GST invoice</p>
            <div className="mt-1 rounded-md bg-primary px-3 py-2 text-center text-xs font-semibold text-primary-foreground">
              Enrol now
            </div>
            <p className="text-center text-[10px] text-muted-foreground">
              Zero commission · 30-day refund
            </p>
          </div>
        </div>
      </div>
      <p className="mt-3 text-[11px] text-muted-foreground">
        Lives at your own domain. SEO, OG image, structured data — all set up for you.
      </p>
    </RevealCard>
  )
}

// ---------------------------------------------------------------
// Shared reveal wrapper. Handles the fade-up animation + the
// "Generating…" placeholder before a panel becomes visible.
// ---------------------------------------------------------------
function RevealCard({
  visible,
  title,
  icon,
  children,
}: {
  visible: boolean
  title: string
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <Card
      className={`relative overflow-hidden transition-all duration-700 ${
        visible ? "opacity-100" : "opacity-50"
      }`}
      style={visible ? { animation: "panelReveal 0.7s ease-out both" } : undefined}
    >
      <CardContent className="space-y-4 p-5">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="inline-flex items-center gap-2 text-sm font-semibold">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">
              {icon}
            </span>
            {title}
          </div>
          {visible ? (
            <Badge variant="outline" className="border-success/40 bg-success/10 text-[10px] text-success">
              <CheckCircle2 className="mr-1 h-3 w-3" />
              Ready
            </Badge>
          ) : (
            <Badge variant="outline" className="border-primary/30 bg-primary/[0.05] text-[10px] text-primary">
              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              Building
            </Badge>
          )}
        </div>
        {visible ? children : <PlaceholderShimmer />}
      </CardContent>

      {/* Animations live alongside the card so a future page-level
          consumer can't accidentally override them. */}
      <style>{`
        @keyframes panelReveal {
          0%   { opacity: 0; transform: translateY(14px) scale(0.985); }
          100% { opacity: 1; transform: translateY(0)    scale(1); }
        }
        @keyframes revealRow {
          0%   { opacity: 0; transform: translateY(6px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes shimmer {
          0%   { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>
    </Card>
  )
}

function PlaceholderShimmer() {
  return (
    <div className="space-y-2.5">
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className="h-3 rounded"
          style={{
            width: ["88%", "72%", "94%", "60%"][i],
            backgroundImage:
              "linear-gradient(90deg, rgba(0,0,0,0.05) 25%, rgba(0,0,0,0.12) 50%, rgba(0,0,0,0.05) 75%)",
            backgroundSize: "200% 100%",
            animation: "shimmer 1.6s linear infinite",
          }}
        />
      ))}
    </div>
  )
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
}
