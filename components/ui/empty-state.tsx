"use client"

// EmptyState — the canonical "you have nothing here yet" surface
// for the platform. Replaces a long tail of bespoke empty cards
// scattered across list pages with a single consistent component
// that hits the same beats:
//
//   • Emoji or icon at the top (sets the tone — calm, not alarming)
//   • One-line title that says what the user is looking at
//   • One short paragraph explaining why it's empty + what to do
//   • Up to 3 path cards (different ways to fill the void)
//   • Optional secondary footer link (e.g. a help-doc deep link)
//
// Design goal: the user should never see a blank empty card with
// just "Nothing here." Every empty state is a chance to teach the
// product, and a chance to make the first action feel obvious.
//
// API: <EmptyState title="..." description="..." paths={[...]} />
// Each path is a card with icon + label + hint + onClick OR href.

import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export interface EmptyStatePath {
  /** Stable id so React keys are deterministic across re-renders. */
  id: string
  /** Short noun phrase. "Add manually" / "Import CSV". */
  label: string
  /** 1-line "why this path." Renders below the label, dimmer. */
  hint: string
  /** Lucide icon component (or any React node) shown left of the
   *  label. Keep to a single shape per path so the eye sweeps
   *  through them cleanly. */
  icon: React.ReactNode
  /** Either onClick OR href — not both. Caller picks based on
   *  whether the path triggers a dialog (onClick) or navigates
   *  (href). */
  onClick?: () => void
  href?: string
  /** Mark the most likely path so users have a default to pick.
   *  Highlights the card with a primary border. */
  primary?: boolean
}

interface EmptyStateProps {
  /** Short hero — emoji works great here, or pass a Lucide icon
   *  wrapped in a JSX element. */
  icon?: React.ReactNode
  title: string
  description: string
  /** Up to 3 paths; if more are passed we render them all but the
   *  card grid will wrap. */
  paths?: EmptyStatePath[]
  /** Optional small link below the paths — "Read the help doc"
   *  style. Caller wires href + label. */
  footerLink?: { label: string; href: string }
  className?: string
}

export function EmptyState({
  icon,
  title,
  description,
  paths,
  footerLink,
  className,
}: EmptyStateProps) {
  return (
    <Card className={cn("border-dashed", className)}>
      <CardContent className="space-y-5 py-10 px-6 text-center">
        {icon && (
          <div className="mx-auto flex h-12 w-12 items-center justify-center text-3xl">
            {icon}
          </div>
        )}
        <div className="space-y-1.5">
          <p className="font-serif text-xl font-bold">{title}</p>
          <p className="mx-auto max-w-md text-sm text-muted-foreground">
            {description}
          </p>
        </div>
        {paths && paths.length > 0 && (
          <div
            className={cn(
              "mx-auto grid max-w-2xl gap-3",
              paths.length === 1 && "sm:grid-cols-1",
              paths.length === 2 && "sm:grid-cols-2",
              paths.length >= 3 && "sm:grid-cols-3",
            )}
          >
            {paths.map((p) => (
              <EmptyStatePathCard key={p.id} path={p} />
            ))}
          </div>
        )}
        {footerLink && (
          <Link
            href={footerLink.href}
            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            {footerLink.label}
            <ArrowRight className="h-3 w-3" />
          </Link>
        )}
      </CardContent>
    </Card>
  )
}

function EmptyStatePathCard({ path }: { path: EmptyStatePath }) {
  const inner = (
    <span className="flex h-full flex-col items-start gap-2 p-4 text-left">
      <span
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-md",
          path.primary ? "bg-primary text-primary-foreground" : "bg-muted text-foreground",
        )}
      >
        {path.icon}
      </span>
      <span className="block min-w-0">
        <span className="block font-semibold leading-tight">{path.label}</span>
        <span className="mt-0.5 block text-[11px] text-muted-foreground">
          {path.hint}
        </span>
      </span>
    </span>
  )
  const cls = cn(
    "block h-full rounded-lg border bg-card transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
    path.primary ? "border-primary/40 hover:border-primary/60" : "border-border hover:border-primary/40",
  )
  if (path.href) {
    return (
      <Link href={path.href} className={cls}>
        {inner}
      </Link>
    )
  }
  return (
    <button type="button" onClick={path.onClick} className={cls}>
      {inner}
    </button>
  )
}
