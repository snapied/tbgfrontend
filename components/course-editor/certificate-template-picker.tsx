"use client"

// Grid picker for the certificate template on a course. Renders three
// clearly-separated sections so 18 built-ins + N customs + a create-new
// CTA never feel like one undifferentiated wall of cards:
//
//   • "Currently selected" — a single featured tile at the top showing
//     exactly what students will receive, so the user never has to scroll
//     to confirm their choice.
//   • "Your templates" — the teacher's custom templates (if any) plus a
//     prominent "Design a new template" tile.
//   • "Built-in templates" — the 18 layouts that ship with the platform.
//
// Custom templates are re-read from localStorage on `window.focus` so a
// teacher can click "Design new" → save in the other tab → come back here
// and pick the freshly-created template without losing course-form state.

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react"
import Link from "next/link"
import { Check, Plus, RefreshCw, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { CertificatePreview } from "@/components/certificates/certificate-preview"
import { CustomTemplateRenderer, type FieldValues } from "@/components/certificates/custom-template-renderer"
import { BUILTIN_TEMPLATES } from "@/lib/certificate-templates"
import {
  loadCustomTemplates,
  TEMPLATE_VARIABLES,
  type CustomTemplate,
} from "@/lib/custom-templates"

interface Props {
  value: string
  onSelect: (id: string) => void
  className?: string
}

export function CertificateTemplatePicker({ value, onSelect, className }: Props) {
  const [customs, setCustoms] = useState<CustomTemplate[]>([])
  // Brief flash on the refresh button so a manual click feels acknowledged
  // even when the underlying load is instant (everything's in localStorage).
  const [refreshing, setRefreshing] = useState(false)

  const refresh = useCallback(() => {
    setCustoms(loadCustomTemplates())
  }, [])

  // Auto-refresh on tab focus — covers the common path of "design new →
  // come back here" without the user having to click anything.
  useEffect(() => {
    refresh()
    window.addEventListener("focus", refresh)
    return () => window.removeEventListener("focus", refresh)
  }, [refresh])

  const onManualRefresh = () => {
    setRefreshing(true)
    refresh()
    // 500ms is enough to register the spin; long enough not to feel jumpy.
    setTimeout(() => setRefreshing(false), 500)
  }

  const sampleFields = useMemo(
    () => Object.fromEntries(TEMPLATE_VARIABLES.map((v) => [v.key, v.sample])) as unknown as FieldValues,
    [],
  )

  // Find the currently-selected template + a human label/source so the
  // featured row at the top can show "Custom · Acme Course Completion" or
  // "Built-in · Modern" without re-doing the lookup everywhere.
  const selected = useMemo(() => {
    const builtin = BUILTIN_TEMPLATES.find((t) => t.id === value)
    if (builtin) {
      return {
        kind: "builtin" as const,
        name: builtin.name,
        tagline: builtin.tagline,
        preview: <CertificatePreview template={builtin.id} scale="sm" />,
      }
    }
    const custom = customs.find((t) => t.id === value)
    if (custom) {
      return {
        kind: "custom" as const,
        name: custom.name,
        tagline: "Your custom template",
        preview: <CustomTemplateRenderer template={custom} fields={sampleFields} fit />,
      }
    }
    return null
  }, [value, customs, sampleFields])

  return (
    <div className={cn("space-y-5", className)}>
      {/* Featured "currently selected" row. Anchors the picker so the user
          always sees their current choice without scrolling. */}
      {selected && (
        <div className="overflow-hidden rounded-md border border-primary/40 bg-primary/5">
          <div className="flex items-center justify-between gap-3 border-b border-primary/20 px-3 py-2">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-primary">
              <Check className="h-3.5 w-3.5" /> Currently selected
            </div>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
              {selected.kind === "custom" ? "Custom" : "Built-in"}
            </span>
          </div>
          <div className="grid items-center gap-3 px-3 py-3 sm:grid-cols-[180px_1fr]">
            <div className="overflow-hidden rounded border bg-background">{selected.preview}</div>
            <div>
              <p className="text-sm font-semibold">{selected.name}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{selected.tagline}</p>
              <p className="mt-2 text-[11px] text-muted-foreground">
                Students will receive this design on completion. Pick another below to change it.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* "Your templates" — custom-template gallery + the create-new tile. */}
      <Section
        heading="Your templates"
        caption={
          customs.length === 0
            ? "Design your own to use as the certificate."
            : `${customs.length} custom ${customs.length === 1 ? "template" : "templates"}.`
        }
        action={
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onManualRefresh}
              className="h-7 gap-1 px-2 text-[11px]"
              title="Pick up newly designed templates"
            >
              <RefreshCw className={cn("h-3 w-3", refreshing && "animate-spin")} />
              Refresh
            </Button>
            <Link
              href="/dashboard/templates"
              target="_blank"
              className="text-[11px] font-medium text-primary hover:underline"
            >
              Manage gallery →
            </Link>
          </div>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {/* Create-new tile. Visually distinct: solid accent background +
              icon badge so it reads as a primary action rather than an
              empty-state filler. */}
          <Link
            href="/dashboard/templates/new"
            target="_blank"
            className="group flex aspect-[1.414/1] flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-primary/40 bg-gradient-to-br from-primary/5 to-accent/5 text-foreground transition hover:border-primary hover:from-primary/10 hover:to-accent/10"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm transition group-hover:scale-105">
              <Plus className="h-4 w-4" />
            </span>
            <div className="text-center">
              <p className="text-sm font-semibold">Design a new template</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">Opens in a new tab — your form stays put</p>
            </div>
          </Link>

          {customs.map((t) => {
            const isSel = value === t.id
            return (
              <TemplateTile
                key={t.id}
                selected={isSel}
                onClick={() => onSelect(t.id)}
                name={t.name}
                caption="Your custom template"
                preview={<CustomTemplateRenderer template={t} fields={sampleFields} fit />}
              />
            )
          })}
        </div>
      </Section>

      {/* Built-in gallery. */}
      <Section
        heading="Built-in templates"
        caption={`${BUILTIN_TEMPLATES.length} ready-to-use layouts.`}
      >
        <div className="grid max-h-[26rem] gap-3 overflow-y-auto pr-1 sm:grid-cols-2">
          {BUILTIN_TEMPLATES.map((t) => {
            const isSel = value === t.id
            return (
              <TemplateTile
                key={t.id}
                selected={isSel}
                onClick={() => onSelect(t.id)}
                name={t.name}
                caption={t.tagline}
                preview={<CertificatePreview template={t.id} scale="sm" />}
              />
            )
          })}
        </div>
      </Section>

      {/* Footer hint — references the workspace branding so the teacher
          knows the same logo/colours flow through whichever template they
          pick. */}
      <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <Sparkles className="h-3 w-3" />
        Every template inherits your workspace name, logo, and brand colours from{" "}
        <Link href="/dashboard/settings" className="font-medium text-primary hover:underline">
          Settings
        </Link>.
      </p>

    </div>
  )
}

function Section({
  heading,
  caption,
  action,
  children,
}: {
  heading: string
  caption?: string
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="space-y-2">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{heading}</h3>
          {caption && <p className="text-[11px] text-muted-foreground/80">{caption}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

function TemplateTile({
  selected,
  onClick,
  name,
  caption,
  preview,
}: {
  selected: boolean
  onClick: () => void
  name: string
  caption: string
  preview: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group relative overflow-hidden rounded-md border bg-muted/30 text-left transition",
        selected
          ? "border-primary ring-2 ring-primary/40"
          : "border-border hover:border-primary/40 hover:bg-muted/60",
      )}
      aria-pressed={selected}
    >
      {selected && (
        <span className="absolute right-1.5 top-1.5 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground shadow">
          <Check className="h-3 w-3" />
        </span>
      )}
      <div className="overflow-hidden border-b bg-background">{preview}</div>
      <div className="px-2.5 py-1.5">
        <p className="truncate text-sm font-medium">{name}</p>
        <p className="truncate text-[11px] text-muted-foreground">{caption}</p>
      </div>
    </button>
  )
}
