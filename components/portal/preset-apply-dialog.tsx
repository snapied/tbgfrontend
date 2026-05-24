"use client"

// PresetApplyDialog — confirms a theme-preset switch, showing exactly
// which brand fields will change vs. stay the same.
//
// Two reasons we need this:
//   • Item 41: presets silently overwrite the teacher's custom edits.
//     A diff modal turns "wait, where did my colour go?" into a
//     deliberate "Apply" or "Discard".
//   • Item 40: premium presets used to bounce-alert the teacher.
//     Now the preview applies live in the iframe (the parent has
//     already committed the colour temporarily) and a sticky
//     "Upgrade to keep" banner sits inside this dialog — the
//     teacher decides Apply / Upgrade / Discard with full
//     information.
//
// API: caller passes the incoming preset + current brand snapshot,
// renders the dialog on top of a live preview that's already showing
// the preset. We don't mutate; we just emit `onConfirm()` or
// `onCancel()`.

import { useMemo } from "react"
import { ArrowRight, Lock, Sparkles } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { ThemePreset } from "@/lib/portal-theme-presets"

interface PresetSnapshot {
  primaryColor?: string
  accentColor?: string
  headingFont?: string
  bodyFont?: string
}

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  preset: ThemePreset | null
  current: PresetSnapshot
  /** When true, the dialog renders an "Upgrade to keep" banner and
   *  swaps the primary action to a billing link. The teacher can
   *  still preview live but Apply is plan-gated. */
  premiumLocked?: boolean
  onConfirm: () => void
  onCancel: () => void
  /** Optional href for the upgrade CTA. Defaults to billing. */
  upgradeHref?: string
}

interface FieldRow {
  label: string
  current?: string
  next?: string
  kind: "color" | "text"
}

export function PresetApplyDialog({
  open,
  onOpenChange,
  preset,
  current,
  premiumLocked,
  onConfirm,
  onCancel,
  upgradeHref = "/dashboard/settings/billing",
}: Props) {
  // Diff rows. Stay-the-same fields render in a muted "12 unchanged"
  // tail so the dialog stays compact — only changes get full row
  // treatment.
  const rows: FieldRow[] = useMemo(() => {
    if (!preset) return []
    return [
      { label: "Primary colour", current: current.primaryColor, next: preset.primaryColor, kind: "color" },
      { label: "Accent colour", current: current.accentColor, next: preset.accentColor, kind: "color" },
      { label: "Heading font", current: current.headingFont, next: preset.headingFont, kind: "text" },
      { label: "Body font", current: current.bodyFont, next: preset.bodyFont, kind: "text" },
    ]
  }, [preset, current])

  const changedRows = rows.filter((r) => normalise(r.current) !== normalise(r.next))
  const unchangedCount = rows.length - changedRows.length

  // Cancel = also revert the live preview the parent applied.
  const handleClose = (v: boolean) => {
    if (!v) onCancel()
    onOpenChange(v)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-serif">
            <Sparkles className="h-5 w-5 text-primary" />
            Try “{preset?.name}”
          </DialogTitle>
          <DialogDescription>
            Your live preview already shows this preset. Compare what will
            change before you commit.
          </DialogDescription>
        </DialogHeader>

        {premiumLocked && (
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 px-3 py-2">
            <p className="flex items-center gap-1.5 text-[12px] font-semibold text-amber-700 dark:text-amber-300">
              <Lock className="h-3.5 w-3.5" />
              Premium preset
            </p>
            <p className="mt-0.5 text-[11.5px] text-amber-700/90 dark:text-amber-300/90">
              You can browse and preview, but applying needs a Pro plan or above.
            </p>
          </div>
        )}

        <div className="space-y-2 pt-2">
          {changedRows.length === 0 ? (
            <p className="rounded-md border border-dashed border-border bg-muted/30 px-3 py-2 text-[12px] text-muted-foreground">
              This preset matches what you already have — nothing would change.
            </p>
          ) : (
            <>
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                {changedRows.length} {changedRows.length === 1 ? "field changes" : "fields change"}
                {unchangedCount > 0 && (
                  <span className="ml-1 font-normal normal-case text-muted-foreground/70">
                    · {unchangedCount} unchanged
                  </span>
                )}
              </p>
              <ul className="divide-y divide-border/60">
                {changedRows.map((r) => (
                  <DiffRow key={r.label} row={r} />
                ))}
              </ul>
            </>
          )}
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row sm:gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => handleClose(false)}
            className="sm:order-1"
          >
            Discard
          </Button>
          {premiumLocked ? (
            <Button asChild className="sm:order-2 gap-1.5">
              <a href={upgradeHref}>
                <Sparkles className="h-4 w-4" />
                Upgrade to apply
              </a>
            </Button>
          ) : (
            <Button
              type="button"
              onClick={() => {
                onConfirm()
                onOpenChange(false)
              }}
              disabled={changedRows.length === 0}
              className="sm:order-2"
            >
              Apply preset
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function DiffRow({ row }: { row: FieldRow }) {
  return (
    <li className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 py-2">
      <span className="text-[12px] font-medium">{row.label}</span>
      <ArrowRight className="h-3 w-3 text-muted-foreground" />
      <div className="flex flex-wrap items-center justify-end gap-1.5">
        <Pill kind={row.kind} value={row.current} muted />
        <span className="text-[11px] text-muted-foreground">→</span>
        <Pill kind={row.kind} value={row.next} />
      </div>
    </li>
  )
}

function Pill({
  kind,
  value,
  muted,
}: {
  kind: "color" | "text"
  value?: string
  muted?: boolean
}) {
  const display = value || "—"
  if (kind === "color") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10.5px]",
          muted ? "border-border bg-muted/30 text-muted-foreground" : "border-primary/30 bg-primary/5 text-foreground",
        )}
      >
        <span
          className="inline-block h-3 w-3 rounded-sm border border-border"
          style={{ background: value ?? "transparent" }}
          aria-hidden
        />
        <span className="font-mono">{display}</span>
      </span>
    )
  }
  return (
    <span
      className={cn(
        "rounded-full border px-1.5 py-0.5 text-[10.5px]",
        muted ? "border-border bg-muted/30 text-muted-foreground" : "border-primary/30 bg-primary/5 text-foreground",
      )}
    >
      {display}
    </span>
  )
}

function normalise(v?: string): string {
  return (v ?? "").trim().toLowerCase()
}
