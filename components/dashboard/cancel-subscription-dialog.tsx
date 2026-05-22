"use client"

// Cancellation confirmation modal. Replaces the bare window.confirm()
// the billing page used to ship with. Captures:
//   - A reason from a short preset list (drives churn metrics).
//   - An optional free-text "tell us more".
//   - A separate "also deactivate my account + workspace" toggle.
//
// The deactivate-account toggle is intentionally separate from the
// cancel action: most users want to stay on the free Starter tier
// after cancelling a paid plan. Only opt-in account deletion goes
// further. The footer links the legal pages (refund + data
// retention) so the user knows what happens to their data.

import { useState } from "react"
import Link from "next/link"
import { AlertTriangle, Loader2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import type { CancelPayload } from "@/lib/billing-client"

const REASONS: Array<{ value: string; label: string }> = [
  { value: "too_expensive", label: "Too expensive for what I use" },
  { value: "missing_feature", label: "Missing a feature I need" },
  { value: "switching", label: "Switching to another tool" },
  { value: "not_using", label: "Not using it enough" },
  { value: "bugs", label: "Hit bugs / reliability issues" },
  { value: "temporary", label: "Just temporary — I'll be back" },
  { value: "other", label: "Other" },
]

export function CancelSubscriptionDialog({
  open,
  onOpenChange,
  onConfirm,
  busy,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (payload: CancelPayload) => void
  busy?: boolean
}) {
  const [reason, setReason] = useState<string>("")
  const [comment, setComment] = useState<string>("")
  const [deleteAccount, setDeleteAccount] = useState<boolean>(false)
  const [confirmDelete, setConfirmDelete] = useState<string>("")

  const canSubmit =
    !!reason && (!deleteAccount || confirmDelete.trim().toUpperCase() === "DELETE")

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Cancel subscription</DialogTitle>
          <DialogDescription>
            You&apos;ll keep paid access until the end of the current billing
            period. After that the workspace returns to the free Starter
            plan automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm">What&apos;s the main reason?</Label>
            <div className="grid gap-1.5">
              {REASONS.map((r) => (
                <label
                  key={r.value}
                  className="flex cursor-pointer items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm hover:bg-accent/30"
                >
                  <input
                    type="radio"
                    name="cancel-reason"
                    value={r.value}
                    checked={reason === r.value}
                    onChange={() => setReason(r.value)}
                    className="h-3.5 w-3.5"
                  />
                  <span>{r.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cancel-comment" className="text-sm">
              Tell us more (optional)
            </Label>
            <textarea
              id="cancel-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Anything we could have done better?"
              rows={3}
              className="w-full rounded-md border border-border bg-background p-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              maxLength={2000}
            />
          </div>

          <div className="rounded-md border border-border bg-muted/40 p-3">
            <label className="flex cursor-pointer items-start gap-2 text-sm">
              <Checkbox
                checked={deleteAccount}
                onCheckedChange={(v) => setDeleteAccount(v === true)}
                className="mt-0.5"
              />
              <span>
                <span className="font-medium">
                  Also deactivate my account and workspace data
                </span>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Leave this off if you want to keep the workspace on the
                  free Starter plan and come back later. Turning it on
                  signs everyone out and hides your courses, students,
                  recordings, and certificates. See our{" "}
                  <Link
                    href="/legal/refund"
                    target="_blank"
                    className="text-primary hover:underline"
                  >
                    refund policy
                  </Link>{" "}
                  and{" "}
                  <Link
                    href="/legal/privacy"
                    target="_blank"
                    className="text-primary hover:underline"
                  >
                    data retention
                  </Link>{" "}
                  for what happens next.
                </p>
              </span>
            </label>

            {deleteAccount && (
              <div className="mt-3 space-y-2 rounded-md border border-destructive/30 bg-destructive/5 p-2">
                <div className="flex items-start gap-2 text-xs text-destructive">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>
                    Type <span className="font-mono font-semibold">DELETE</span>{" "}
                    to confirm. We&apos;ll keep a soft-deleted copy for the
                    refund window before permanent removal.
                  </span>
                </div>
                <input
                  type="text"
                  value={confirmDelete}
                  onChange={(e) => setConfirmDelete(e.target.value)}
                  placeholder="Type DELETE"
                  className="w-full rounded-md border border-destructive/40 bg-background px-2 py-1 text-sm focus:border-destructive focus:outline-none focus:ring-1 focus:ring-destructive"
                />
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={busy}
          >
            Keep my plan
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={!canSubmit || busy}
            onClick={() =>
              onConfirm({
                reason,
                comment: comment.trim() || undefined,
                deleteAccount,
              })
            }
          >
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {deleteAccount ? "Cancel & deactivate" : "Cancel subscription"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
