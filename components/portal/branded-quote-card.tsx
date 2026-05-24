"use client"

// Branded pull-quote card — the strongest single visual variant in
// our portal vocabulary. Left primary-coloured border (4px), eyebrow
// icon, serif heading slot, prose body. Used wherever the page
// needs the public surface to feel editorial rather than catalog:
//
//   • Course detail "About this course" lead-in
//   • Teacher detail "About <name>" lead-in
//   • Featured FAQ answer
//   • Highlighted feature spotlight inside a Features section
//
// Promoting one variant to a primitive enforces visual coherence
// across modules — we used to have three slightly-different left-
// border cards drift over time. One component, one set of styles.

import { type ReactNode } from "react"
import { cn } from "@/lib/utils"

interface Props {
  /** Small uppercase line above the heading. Stays optional. */
  eyebrow?: string
  /** Icon to render inside the eyebrow row. Lucide icon component
   *  is the expected shape; consumer passes `<Sparkles />` etc. */
  icon?: ReactNode
  /** Heading. Renders in serif weight. */
  title?: string
  /** Body content. Accepts ReactNode so callers can pass plain text,
   *  Tiptap renderer, or a custom child tree. */
  children: ReactNode
  /** Override the heading semantic level. Default `h2` so the card
   *  doesn't accidentally outrank the page H1. */
  headingLevel?: "h2" | "h3"
  /** Tone — `primary` (default brand colour) or `accent` (warmer). */
  tone?: "primary" | "accent"
  className?: string
}

export function TenantBrandedQuoteCard({
  eyebrow,
  icon,
  title,
  children,
  headingLevel = "h2",
  tone = "primary",
  className,
}: Props) {
  const Heading = headingLevel
  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border bg-card",
        tone === "primary" && "border-border border-l-4 border-l-primary",
        tone === "accent" && "border-border border-l-4 border-l-accent",
        className,
      )}
    >
      <div className="p-6 sm:p-8">
        {(eyebrow || icon) && (
          <div
            className={cn(
              "mb-3 inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider",
              tone === "primary" ? "text-primary" : "text-accent",
            )}
          >
            {icon}
            {eyebrow}
          </div>
        )}
        {title && (
          <Heading className="font-serif text-xl font-bold tracking-tight sm:text-2xl">
            {title}
          </Heading>
        )}
        <div className={cn("text-base leading-relaxed text-foreground/90", title && "mt-3")}>
          {children}
        </div>
      </div>
    </div>
  )
}
