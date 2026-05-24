"use client"

// Reject dialog — replaces the one-tap, no-undo reject button.
// Captures an optional reason (so future reviewers see "why this
// one was rejected") and emits a toast.action `Undo` so a mis-click
// is reversible for 10 seconds.

import { useState } from "react"
import { AlertTriangle } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  authorName: string
  quotePreview: string
  /** Called with the chosen reason (free-text). Empty string is
   *  allowed — we store undefined in that case. */
  onConfirm: (reason: string) => void
}

const REASON_PRESETS = [
  "Off-topic",
  "Unverifiable",
  "Inappropriate language",
  "Looks like spam",
  "Duplicate submission",
]

export function TestimonialRejectDialog({
  open,
  onOpenChange,
  authorName,
  quotePreview,
  onConfirm,
}: Props) {
  const [reason, setReason] = useState<string>("")

  const handleClose = (v: boolean) => {
    if (!v) setReason("")
    onOpenChange(v)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Reject this testimonial?
          </DialogTitle>
          <DialogDescription>
            From <span className="font-medium text-foreground">{authorName}</span>:
            “{quotePreview.slice(0, 120)}{quotePreview.length > 120 ? "…" : ""}”
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 pt-2">
          <div className="space-y-2">
            <Label>Reason (optional)</Label>
            <div className="flex flex-wrap gap-1.5">
              {REASON_PRESETS.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setReason(r)}
                  className={`rounded-full border px-2.5 py-1 text-[11.5px] font-medium transition-colors ${
                    reason === r
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-card text-foreground hover:bg-muted"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Add a note for the audit log…"
              rows={3}
            />
            <p className="text-[11px] text-muted-foreground">
              Only admins see this. The student doesn&rsquo;t see the reason.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => handleClose(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              onConfirm(reason.trim())
              handleClose(false)
            }}
          >
            Reject
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
