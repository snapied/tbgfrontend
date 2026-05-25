"use client"

// Template-picker dialog for /dashboard/docs. Mirrors QuizTemplatePicker.
// Single dialog showing every shipped doc template + a "Start blank"
// escape hatch. Each card is a one-line preview + the emoji + the
// recommended audience so the writer picks the closest starting point.

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ArrowRight, FileText } from "lucide-react"
import { DOC_TEMPLATES, type DocTemplate } from "@/lib/doc-templates"
import { audienceEmoji, audienceLabel } from "@/lib/docs"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onPick: (template: DocTemplate) => void
  /** Optional "start blank" escape hatch — usually wired to the same
   *  create flow with the "blank" template. */
  onStartBlank?: () => void
}

export function DocTemplatePicker({ open, onOpenChange, onPick, onStartBlank }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            New doc — pick a starting point
          </DialogTitle>
          <DialogDescription>
            Eight scaffolds shaped around what creators actually write. Pick the closest one and edit from there — or start blank.
          </DialogDescription>
        </DialogHeader>

        <div className="grid max-h-[60vh] gap-2.5 overflow-y-auto sm:grid-cols-2">
          {DOC_TEMPLATES.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => onPick(t)}
              className="group flex items-start gap-3 rounded-xl border border-border bg-card p-3.5 text-left transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
            >
              <span aria-hidden className="text-2xl">{t.emoji}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold leading-snug">{t.title}</p>
                <p className="mt-1 line-clamp-2 text-[11.5px] leading-relaxed text-muted-foreground">
                  {t.description}
                </p>
                <p className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-semibold text-muted-foreground">
                  <span>{audienceEmoji(t.defaultAudience)}</span>
                  <span>Defaults to {audienceLabel(t.defaultAudience).toLowerCase()}</span>
                </p>
              </div>
              <ArrowRight className="mt-1 h-3.5 w-3.5 shrink-0 -translate-x-1 text-muted-foreground opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-60" />
            </button>
          ))}
        </div>

        <DialogFooter className="sm:justify-between">
          <p className="text-[11px] text-muted-foreground">
            Templates are starting points — you can change everything once the doc opens.
          </p>
          {onStartBlank && (
            <Button variant="outline" size="sm" onClick={onStartBlank}>
              Start blank instead
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
