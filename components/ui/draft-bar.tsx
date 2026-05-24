"use client"

// DraftBar — sticky surface that surfaces "you have unpublished
// changes" with the canonical actions on every editor: Preview,
// Discard, Publish.
//
// Where SavedIndicator is a tiny inline status pill ("Saving…",
// "Saved 4:12pm"), DraftBar is the heavyweight bar that anchors the
// entire publish loop. The two compose — DraftBar renders a
// SavedIndicator inside its status slot, so the editor doesn't need
// to render both.
//
// State machine (provided by the parent — DraftBar is presentational):
//
//   clean   → no diff between draft and published; bar is hidden
//   dirty   → diff exists; bar appears with "N pending changes"
//   saving  → publish in flight; buttons disabled, spinner on Publish
//   error   → publish failed; banner asks the user to retry
//
// Mobile: docks to the bottom. Desktop: docks to the bottom AND the
// inner content gets a `pb-20` cushion (caller responsibility — we
// surface a CSS-var `--draft-bar-height` for layout to subtract).

import { useEffect, useRef } from "react"
import { Eye, Loader2, RotateCcw, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SavedIndicator, type SaveStatus } from "@/components/dashboard/saved-indicator"
import { cn } from "@/lib/utils"

export type DraftState = "clean" | "dirty" | "saving" | "error"

export interface DraftBarProps {
  /** Current state of the draft. `clean` hides the bar. */
  state: DraftState
  /** Number of pending edits between draft and last-published. Drives
   *  the headline copy. Optional — when omitted, we say "Unpublished
   *  changes" generically. */
  pendingCount?: number
  /** ISO timestamp of the last successful save (autosave drafts) so
   *  the user can see "Draft saved 4:12pm". Optional. */
  lastSavedAt?: string | null
  /** Inline SavedIndicator status — for autosave editors that want
   *  to show "Saving…" / "Saved" in the bar itself. */
  saveStatus?: SaveStatus
  /** Fires when the user clicks Publish. */
  onPublish: () => void
  /** Fires when the user clicks Discard. Should prompt for confirm
   *  on the parent side — DraftBar doesn't gate. */
  onDiscard?: () => void
  /** Fires when the user clicks Preview. Hidden if not provided. */
  onPreview?: () => void
  /** Optional plan-gate / disabled override on the Publish button
   *  (e.g. "Pro plan required"). */
  publishDisabled?: boolean
  publishDisabledReason?: string
  /** Localisable label override. */
  publishLabel?: string
  className?: string
}

export function DraftBar({
  state,
  pendingCount,
  lastSavedAt,
  saveStatus = "idle",
  onPublish,
  onDiscard,
  onPreview,
  publishDisabled,
  publishDisabledReason,
  publishLabel = "Publish",
  className,
}: DraftBarProps) {
  // Surface the bar height as a CSS variable so the parent layout can
  // reserve space (`<div className="pb-[var(--draft-bar-height,5rem)]">`)
  // without hardcoding pixels. We measure on mount + resize.
  const ref = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    if (state === "clean") {
      document.documentElement.style.removeProperty("--draft-bar-height")
      return
    }
    const el = ref.current
    if (!el) return
    const setVar = () =>
      document.documentElement.style.setProperty(
        "--draft-bar-height",
        `${el.offsetHeight}px`,
      )
    setVar()
    const ro = new ResizeObserver(setVar)
    ro.observe(el)
    return () => {
      ro.disconnect()
      document.documentElement.style.removeProperty("--draft-bar-height")
    }
  }, [state])

  if (state === "clean") return null

  const isSaving = state === "saving"
  const isError = state === "error"
  const headline =
    typeof pendingCount === "number" && pendingCount > 0
      ? `${pendingCount} unpublished ${pendingCount === 1 ? "change" : "changes"}`
      : "Unpublished changes"

  return (
    <div
      ref={ref}
      role="region"
      aria-label="Draft changes"
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 border-t backdrop-blur",
        isError
          ? "border-destructive/40 bg-destructive/10"
          : "border-primary/30 bg-background/95 supports-[backdrop-filter]:bg-background/85",
        className,
      )}
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:gap-4">
        {/* Status block — pulse dot + headline + autosave indicator */}
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <span
            className={cn(
              "relative flex h-2.5 w-2.5 shrink-0",
              isError && "text-destructive",
            )}
            aria-hidden
          >
            {!isError && (
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/60 opacity-75" />
            )}
            <span
              className={cn(
                "relative inline-flex h-2.5 w-2.5 rounded-full",
                isError ? "bg-destructive" : "bg-primary",
              )}
            />
          </span>
          <div className="min-w-0 flex-1">
            <p
              className={cn(
                "truncate text-sm font-semibold",
                isError ? "text-destructive" : "text-foreground",
              )}
            >
              {isError ? "Publish failed" : headline}
            </p>
            <div className="mt-0.5 flex items-center gap-2 text-[11.5px] text-muted-foreground">
              {isError ? (
                <span>Check your connection and try again.</span>
              ) : (
                <>
                  <span>Visitors still see the last published version.</span>
                  <SavedIndicator status={saveStatus} lastSavedAt={lastSavedAt ?? undefined} />
                </>
              )}
            </div>
          </div>
        </div>

        {/* Action cluster — right-aligned on desktop, full-width on mobile */}
        <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
          {onPreview && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onPreview}
              disabled={isSaving}
              className="gap-1.5"
            >
              <Eye className="h-4 w-4" />
              Preview
            </Button>
          )}
          {onDiscard && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onDiscard}
              disabled={isSaving}
              className="gap-1.5"
            >
              <RotateCcw className="h-4 w-4" />
              Discard
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            onClick={onPublish}
            disabled={isSaving || publishDisabled}
            title={publishDisabled ? publishDisabledReason : undefined}
            className="gap-1.5"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {isSaving ? "Publishing…" : publishLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
