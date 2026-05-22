"use client"

// Grid of layout-preset chips for the header or footer. Each chip
// renders a tiny schematic preview so the teacher can pick visually,
// not by name alone.

import { Check } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  HEADER_PRESETS,
  FOOTER_PRESETS,
  type PortalLayoutPreset,
} from "@/lib/portal-layout-presets"

interface Props {
  kind: "header" | "footer"
  value?: string
  onChange: (id: string) => void
}

export function LayoutPresetPicker({ kind, value, onChange }: Props) {
  const presets = kind === "header" ? HEADER_PRESETS : FOOTER_PRESETS
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {presets.map((p) => {
        const active = value === p.id
        return (
          <button
            key={p.id}
            type="button"
            onClick={() => onChange(p.id)}
            className={cn(
              "group relative flex flex-col gap-2 overflow-hidden rounded-lg border bg-card p-3 text-left transition hover:-translate-y-0.5 hover:shadow-md",
              active ? "border-primary ring-2 ring-primary/20" : "border-border",
            )}
          >
            <Schematic kind={kind} id={p.id} />
            <div>
              <p className="text-sm font-semibold">{p.name}</p>
              <p className="line-clamp-2 text-[11px] text-muted-foreground">{p.description}</p>
            </div>
            {active && (
              <span className="absolute right-2 top-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Check className="h-3 w-3" />
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

// Tiny schematic preview. Not pixel-perfect — just enough wireframe
// for the teacher to recognize the shape of each variant at a glance.
function Schematic({ kind, id }: { kind: Props["kind"]; id: string }) {
  if (kind === "header") return <HeaderSchematic id={id} />
  return <FooterSchematic id={id} />
}

function HeaderSchematic({ id }: { id: string }) {
  const wrap = "h-12 w-full rounded-md bg-muted p-1.5"
  switch (id) {
    case "centered-minimal":
      return (
        <div className={wrap}>
          <div className="flex flex-col items-center gap-1.5">
            <div className="h-2 w-10 rounded-sm bg-foreground/40" />
            <div className="flex gap-1">
              <div className="h-1 w-4 rounded-sm bg-foreground/25" />
              <div className="h-1 w-4 rounded-sm bg-foreground/25" />
              <div className="h-1 w-4 rounded-sm bg-foreground/25" />
            </div>
          </div>
        </div>
      )
    case "split-with-cta":
      return (
        <div className={wrap}>
          <div className="flex items-center justify-between">
            <div className="h-2 w-8 rounded-sm bg-foreground/40" />
            <div className="flex gap-1">
              <div className="h-1 w-3 rounded-sm bg-foreground/25" />
              <div className="h-1 w-3 rounded-sm bg-foreground/25" />
            </div>
            <div className="h-3 w-8 rounded-sm bg-primary" />
          </div>
        </div>
      )
    case "logo-only":
      return (
        <div className={wrap}>
          <div className="flex items-center justify-between">
            <div className="h-2 w-12 rounded-sm bg-foreground/40" />
            <div className="h-2 w-2 rounded-sm bg-foreground/40" />
          </div>
        </div>
      )
    case "sticky-pill":
      return (
        <div className="h-12 w-full p-1">
          <div className="flex h-full items-center justify-between rounded-full border border-border bg-background/80 px-2 shadow-sm">
            <div className="h-1.5 w-6 rounded-sm bg-foreground/40" />
            <div className="flex gap-1">
              <div className="h-1 w-3 rounded-sm bg-foreground/25" />
              <div className="h-1 w-3 rounded-sm bg-foreground/25" />
            </div>
            <div className="h-1.5 w-1.5 rounded-full bg-primary" />
          </div>
        </div>
      )
    case "marquee-promo":
      return (
        <div className="h-12 w-full overflow-hidden rounded-md bg-muted">
          <div className="h-3 w-full bg-primary/80" />
          <div className="flex items-center justify-between p-1.5">
            <div className="h-2 w-8 rounded-sm bg-foreground/40" />
            <div className="flex gap-1">
              <div className="h-1 w-3 rounded-sm bg-foreground/25" />
              <div className="h-1 w-3 rounded-sm bg-foreground/25" />
            </div>
          </div>
        </div>
      )
    default:
      // split-classic
      return (
        <div className={wrap}>
          <div className="flex items-center justify-between">
            <div className="h-2 w-10 rounded-sm bg-foreground/40" />
            <div className="flex gap-1.5">
              <div className="h-1 w-4 rounded-sm bg-foreground/25" />
              <div className="h-1 w-4 rounded-sm bg-foreground/25" />
              <div className="h-1 w-4 rounded-sm bg-foreground/25" />
            </div>
          </div>
        </div>
      )
  }
}

function FooterSchematic({ id }: { id: string }) {
  const wrap = "h-16 w-full rounded-md bg-muted p-2"
  switch (id) {
    case "compact-mono":
      return (
        <div className="flex h-16 w-full items-center justify-between rounded-md bg-foreground p-2">
          <div className="h-1.5 w-8 rounded-sm bg-background/60" />
          <div className="h-1 w-12 rounded-sm bg-background/40" />
          <div className="flex gap-1">
            <div className="h-1.5 w-1.5 rounded-full bg-background/60" />
            <div className="h-1.5 w-1.5 rounded-full bg-background/60" />
          </div>
        </div>
      )
    case "newsletter-cta":
      return (
        <div className="h-16 w-full overflow-hidden rounded-md bg-muted">
          <div className="flex flex-col items-center gap-1 bg-primary/15 px-2 py-1.5">
            <div className="h-1.5 w-12 rounded-sm bg-foreground/50" />
            <div className="h-3 w-16 rounded-sm bg-background" />
          </div>
          <div className="flex justify-between p-1.5">
            <div className="h-1 w-4 rounded-sm bg-foreground/30" />
            <div className="h-1 w-4 rounded-sm bg-foreground/30" />
            <div className="h-1 w-4 rounded-sm bg-foreground/30" />
          </div>
        </div>
      )
    case "two-column":
      return (
        <div className={wrap}>
          <div className="grid h-full grid-cols-2 gap-2">
            <div className="space-y-1">
              <div className="h-2 w-8 rounded-sm bg-foreground/40" />
              <div className="h-1 w-12 rounded-sm bg-foreground/25" />
            </div>
            <div className="space-y-1">
              <div className="h-1 w-6 rounded-sm bg-foreground/25" />
              <div className="flex gap-1">
                <div className="h-1.5 w-1.5 rounded-full bg-foreground/40" />
                <div className="h-1.5 w-1.5 rounded-full bg-foreground/40" />
              </div>
            </div>
          </div>
        </div>
      )
    case "centered-tight":
      return (
        <div className={wrap}>
          <div className="flex h-full flex-col items-center justify-center gap-1">
            <div className="h-2 w-10 rounded-sm bg-foreground/40" />
            <div className="h-1 w-16 rounded-sm bg-foreground/25" />
            <div className="flex gap-1">
              <div className="h-1.5 w-1.5 rounded-full bg-foreground/40" />
              <div className="h-1.5 w-1.5 rounded-full bg-foreground/40" />
            </div>
          </div>
        </div>
      )
    case "card-grid":
      return (
        <div className="h-16 w-full p-1.5">
          <div className="h-full w-full rounded-md border border-border bg-card p-1.5">
            <div className="grid h-full grid-cols-4 gap-1.5">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-1">
                  <div className="h-1.5 w-full rounded-sm bg-foreground/30" />
                  <div className="h-0.5 w-full rounded-sm bg-foreground/20" />
                </div>
              ))}
            </div>
          </div>
        </div>
      )
    default:
      // multi-column
      return (
        <div className={wrap}>
          <div className="grid h-full grid-cols-4 gap-1.5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-1">
                <div className="h-1.5 w-full rounded-sm bg-foreground/30" />
                <div className="h-0.5 w-full rounded-sm bg-foreground/20" />
                <div className="h-0.5 w-2/3 rounded-sm bg-foreground/20" />
              </div>
            ))}
          </div>
        </div>
      )
  }
}
