"use client"

// "Saved 10:42" indicator — small inline strip that tells the user
// their changes are persisted. Calms the "did that go through? maybe
// I should Ctrl+S" reflex on every autosave editor.
//
// Three states drive the visual:
//   • "saving"  → spinner + "Saving…"
//   • "saved"   → check + "Saved {time}"
//   • "error"   → red dot + "Couldn't save — retry"
//
// The component is intentionally tiny — most autosave editors already
// thread their own save state through a useEffect; this just renders
// it consistently.

import { Check, Loader2, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"

export type SaveStatus = "idle" | "saving" | "saved" | "error"

interface Props {
  status: SaveStatus
  /** ISO timestamp of the last successful save. Renders as HH:MM in
   *  the user's locale. */
  lastSavedAt?: string | null
  /** Optional override label for the error state — e.g. "Network
   *  blip — retrying". */
  errorLabel?: string
  className?: string
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    })
  } catch {
    return ""
  }
}

export function SavedIndicator({
  status,
  lastSavedAt,
  errorLabel = "Couldn't save",
  className,
}: Props) {
  // Idle with no prior save = nothing worth showing. Once the user
  // has saved once, we keep the "Saved HH:MM" badge sticky in the
  // idle state so they always have a reference point.
  if (status === "idle" && !lastSavedAt) return null

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-[11px] tabular-nums",
        status === "error" ? "text-destructive" : "text-muted-foreground",
        className,
      )}
      aria-live="polite"
    >
      {status === "saving" && (
        <>
          <Loader2 className="h-3 w-3 animate-spin" />
          Saving…
        </>
      )}
      {status === "error" && (
        <>
          <AlertCircle className="h-3 w-3" />
          {errorLabel}
        </>
      )}
      {(status === "saved" || status === "idle") && lastSavedAt && (
        <>
          <Check className="h-3 w-3 text-success" />
          Saved {formatTime(lastSavedAt)}
        </>
      )}
    </span>
  )
}
