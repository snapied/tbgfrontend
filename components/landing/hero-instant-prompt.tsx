"use client"

// Hero entry-point to the InstantCourseBuilder.
//
// What this is: a lean input prompt in the hero's right column with a
// cycling typewriter placeholder. On focus / type, the prompt sticks
// to the user's text. On submit, we publish the seed topic via a
// CustomEvent (`tbc:instant-builder:seed`) AND scroll to the full
// builder section. The full InstantCourseBuilder (below the fold)
// listens, prefills its input with the topic, and starts generating.
//
// Why a CustomEvent rather than props: the hero and the full builder
// live in different sibling sections of the marketing page and we
// don't want to thread state through `LandingHero -> page -> Builder`.
// One DOM event keeps each component self-contained.
//
// Why typewriter cycling: a static placeholder gets ignored. A
// cycling one (3 example topics, ~3.5s each) is the cheapest way to
// communicate "this thing actually does something" without an
// animated illustration.

import { useEffect, useRef, useState } from "react"
import { ArrowRight, Sparkles } from "lucide-react"

const EXAMPLES = [
  "Vedic maths for 10-14 year-olds",
  "Hooks deep dive for senior React devs",
  "Watercolour landscapes — weekend course",
  "Spoken English for retail teams",
  "GMAT quant — 12-week cohort",
]

export function HeroInstantPrompt() {
  const [value, setValue] = useState("")
  const [placeholderIdx, setPlaceholderIdx] = useState(0)
  const [typedChars, setTypedChars] = useState(0)
  const [focused, setFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Cycle the placeholder example every ~3.5s by typing one char at a
  // time, holding for a beat, then moving on. We pause cycling when
  // the input has user text (no point animating behind their typing)
  // or is focused (animation in placeholder under a cursor is jarring).
  useEffect(() => {
    if (value.length > 0 || focused) return
    const current = EXAMPLES[placeholderIdx]
    if (typedChars < current.length) {
      const t = setTimeout(() => setTypedChars((c) => c + 1), 35)
      return () => clearTimeout(t)
    }
    const hold = setTimeout(() => {
      setTypedChars(0)
      setPlaceholderIdx((i) => (i + 1) % EXAMPLES.length)
    }, 1800)
    return () => clearTimeout(hold)
  }, [typedChars, placeholderIdx, value, focused])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const seed = value.trim() || EXAMPLES[placeholderIdx]
    // Publish to the full builder below.
    try {
      window.dispatchEvent(
        new CustomEvent("tbc:instant-builder:seed", { detail: { topic: seed } }),
      )
    } catch { /* CustomEvent unsupported (very old browsers) — fallthrough */ }
    // Scroll to the full builder. The InstantCourseBuilder mounts
    // with id="instant-course-builder"; if that anchor isn't found
    // (e.g. on an A/B variant), we fall back to a smooth scroll one
    // viewport down.
    const target = document.getElementById("instant-course-builder")
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" })
    } else {
      window.scrollBy({ top: window.innerHeight, behavior: "smooth" })
    }
  }

  const displayedPlaceholder =
    focused || value
      ? "What do you teach? — try 'Vedic maths for kids'"
      : `What do you teach? — try '${EXAMPLES[placeholderIdx].slice(0, typedChars)}${typedChars < EXAMPLES[placeholderIdx].length ? "▍" : ""}'`

  return (
    <div className="relative">
      {/* Decorative glow behind the card */}
      <div className="absolute -inset-4 -z-10 rounded-3xl bg-gradient-to-br from-primary/20 via-accent/10 to-transparent opacity-60 blur-2xl" />
      <div className="rounded-2xl border border-border bg-card/90 p-5 shadow-xl backdrop-blur-sm sm:p-6">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
          <Sparkles className="h-3.5 w-3.5" />
          Watch us build your course — live
        </div>
        <h2 className="mt-2 text-xl font-bold leading-snug sm:text-2xl">
          Type your topic. We&rsquo;ll outline the course, design the cover, draft the certificate, and stage a sales page — in 5 seconds.
        </h2>
        <form onSubmit={handleSubmit} className="mt-4">
          <div className="group flex items-center gap-2 rounded-xl border-2 border-border bg-background px-4 py-3 transition-all focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/15">
            <input
              ref={inputRef}
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder={displayedPlaceholder}
              aria-label="What do you teach?"
              className="flex-1 bg-transparent text-base font-medium text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
              maxLength={120}
            />
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-bold text-primary-foreground transition-transform hover:scale-[1.02]"
            >
              Show me
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            No signup. Real artifacts. Save them to your workspace when you&rsquo;re ready.
          </p>
        </form>

        {/* Tiny preview strip of what gets built — gives the visitor
            a glimpse of the 4-artifact deliverable before they scroll
            to the full builder. */}
        <div className="mt-4 grid grid-cols-4 gap-2">
          <PreviewChip label="Outline" />
          <PreviewChip label="Cover" />
          <PreviewChip label="Certificate" />
          <PreviewChip label="Sales page" />
        </div>
      </div>
    </div>
  )
}

function PreviewChip({ label }: { label: string }) {
  return (
    <div className="rounded-lg border border-border bg-background/60 px-2 py-2 text-center">
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
    </div>
  )
}
