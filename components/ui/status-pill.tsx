"use client"

// Unified status pill — the one component that renders any
// "live / connected / processing / ready / down / unknown" signal
// across the platform. Same shape, same colours, same animation so
// the visual language is consistent everywhere a status surfaces.
//
// Used by (planned + current):
//   • Live class host connection bar
//   • Recording processing indicator
//   • Community health-pulse summary
//   • Backend reachability footer pill
//   • Egress / transcript service status badges
//   • Any future "is X working" surface
//
// Three sizes: xs (badge inline with text), sm (default), md (hero).
// Variants stay deliberately tight — adding a new one should be a
// real new state, not "I want a slightly different colour."

import { cn } from "@/lib/utils"
import type { ReactNode } from "react"

export type StatusVariant =
  | "ok"          // green dot, no pulse — "all systems normal"
  | "live"        // green dot, ping pulse — "live now"
  | "warn"        // amber dot, slow pulse — "degraded / reconnecting"
  | "error"       // red dot, no pulse — "down / failed"
  | "processing"  // primary dot with spin — "encoding / uploading / generating"
  | "muted"       // grey dot — "idle / unknown / quiet"

export type StatusSize = "xs" | "sm" | "md"

interface Props {
  variant: StatusVariant
  label: string
  /** Optional secondary detail rendered after a divider dot. */
  detail?: string
  /** Optional leading icon (overrides the dot). */
  icon?: ReactNode
  size?: StatusSize
  /** Optional onClick — when set the pill becomes a button. */
  onClick?: () => void
  /** Override the title attribute (tooltip). Defaults to label+detail. */
  title?: string
  className?: string
}

const VARIANT_STYLES: Record<StatusVariant, {
  ring: string
  bg: string
  text: string
  dot: string
  pulse: boolean
  spin: boolean
}> = {
  ok:         { ring: "border-success/30",     bg: "bg-success/[0.06]",     text: "text-success",     dot: "bg-success",        pulse: false, spin: false },
  live:       { ring: "border-success/40",     bg: "bg-success/[0.08]",     text: "text-success",     dot: "bg-success",        pulse: true,  spin: false },
  warn:       { ring: "border-amber-500/40",   bg: "bg-amber-500/[0.08]",   text: "text-amber-700",   dot: "bg-amber-500",      pulse: true,  spin: false },
  error:      { ring: "border-destructive/40", bg: "bg-destructive/10",     text: "text-destructive", dot: "bg-destructive",    pulse: false, spin: false },
  processing: { ring: "border-primary/30",     bg: "bg-primary/[0.06]",     text: "text-primary",     dot: "bg-primary",        pulse: false, spin: true  },
  muted:      { ring: "border-border",         bg: "bg-muted/40",           text: "text-muted-foreground", dot: "bg-muted-foreground/50", pulse: false, spin: false },
}

const SIZE_STYLES: Record<StatusSize, { container: string; dot: string; gap: string; text: string }> = {
  xs: { container: "px-1.5 py-0.5 text-[10px]", dot: "h-1.5 w-1.5", gap: "gap-1",   text: "" },
  sm: { container: "px-2 py-0.5 text-[11px]",   dot: "h-2 w-2",     gap: "gap-1.5", text: "" },
  md: { container: "px-3 py-1.5 text-xs",       dot: "h-2.5 w-2.5", gap: "gap-2",   text: "font-semibold" },
}

export function StatusPill({
  variant,
  label,
  detail,
  icon,
  size = "sm",
  onClick,
  title,
  className,
}: Props) {
  const v = VARIANT_STYLES[variant]
  const s = SIZE_STYLES[size]
  const Tag = onClick ? "button" : "span"
  const tip = title ?? (detail ? `${label} · ${detail}` : label)

  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      title={tip}
      aria-label={tip}
      className={cn(
        "inline-flex items-center rounded-full border font-semibold transition-colors",
        v.ring,
        v.bg,
        v.text,
        s.container,
        s.gap,
        s.text,
        onClick && "cursor-pointer hover:bg-opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current",
        className,
      )}
    >
      {icon ? (
        <span className={cn("shrink-0", v.spin && "animate-spin")}>{icon}</span>
      ) : (
        <span className={cn("relative inline-flex shrink-0", s.dot)}>
          {v.pulse && (
            <span
              aria-hidden
              className={cn(
                "absolute inset-0 animate-ping rounded-full opacity-60",
                v.dot,
              )}
            />
          )}
          <span
            className={cn(
              "relative inline-block rounded-full",
              v.dot,
              v.spin && "animate-spin",
              s.dot,
            )}
          />
        </span>
      )}
      <span>{label}</span>
      {detail && (
        <>
          <span aria-hidden className="opacity-30">·</span>
          <span className="font-normal opacity-90">{detail}</span>
        </>
      )}
    </Tag>
  )
}
