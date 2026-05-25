"use client"

// Shared "Trash" button + dialog used on every hub page (Quizzes,
// Assignments, Students, Courses, etc.).
//
// Pattern:
//   • A small outline button in the header with a live badge count
//     (filtered to the kinds the hub cares about).
//   • Clicking it opens a dialog listing the trashed items for those
//     kinds, with Restore + Delete-forever per row.
//   • Restore fires the existing `restoreFromTrash` event which the
//     owning store handles — no per-hub wiring needed.
//   • Delete-forever is gated by the platform's custom confirm
//     (useConfirm) — never the browser-native confirm.
//
// Built on top of lib/trash.ts so it shares the 7-day TTL, the
// auto-prune, and the cross-tab sync (storage event).

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { RotateCcw, Trash2 } from "lucide-react"
import { toast } from "sonner"
import {
  purgeTrash,
  restoreFromTrash,
  trashRemainingLabel,
  useTrash,
  type TrashEntry,
  type TrashKind,
} from "@/lib/trash"
import { useConfirm } from "@/lib/use-confirm"

interface Props {
  /** Trash kinds this hub manages. The button's count + the dialog
   *  list filter to entries whose `kind` is in this set. */
  kinds: TrashKind[]
  /** Friendly noun for the dialog title + toasts ("quiz", "course",
   *  "student"). Pluralized automatically. */
  noun: string
  /** Optional button label override. Defaults to "Trash". */
  label?: string
  /** Optional className passthrough for layout tweaks. */
  className?: string
  /** Optional emoji renderer for each trash entry (e.g. course icon
   *  derived from the payload). Falls back to no emoji. */
  emojiFor?: (entry: TrashEntry) => string | undefined
}

export function ModuleTrashButton({
  kinds,
  noun,
  label = "Trash",
  className,
  emojiFor,
}: Props) {
  const [open, setOpen] = useState(false)
  const all = useTrash()
  const confirm = useConfirm()
  const kindSet = useMemo(() => new Set(kinds), [kinds])

  const items = useMemo(
    () => all.filter((e) => kindSet.has(e.kind)),
    [all, kindSet],
  )

  const nounPlural = items.length === 1 ? noun : `${noun}s`

  async function handleRestore(e: TrashEntry) {
    const ok = restoreFromTrash(e.kind, e.id)
    if (ok) {
      toast.success(`Restored "${e.label}"`)
    } else {
      toast.error(
        `Couldn't restore — the ${noun} store isn't listening. Try opening the ${noun}s page first.`,
      )
    }
  }

  async function handlePurge(e: TrashEntry) {
    const ok = await confirm({
      title: `Permanently delete "${e.label}"?`,
      description:
        "This can't be undone. The record + its history is removed for good.",
      destructive: true,
      confirmLabel: "Delete forever",
    })
    if (!ok) return
    purgeTrash(e.kind, e.id)
    toast.success(`${cap(noun)} permanently deleted`)
  }

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
        className={`gap-1.5 ${className ?? ""}`}
      >
        <Trash2 className="h-4 w-4" />
        {label}
        {items.length > 0 && (
          <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-[10px]">
            {items.length}
          </Badge>
        )}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="h-4 w-4 text-destructive" />
              Trashed {nounPlural} · {items.length}
            </DialogTitle>
            <DialogDescription>
              Deleted {nounPlural} live here for 7 days. Restore brings them back
              where they were; Delete forever removes them permanently.
            </DialogDescription>
          </DialogHeader>

          {items.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-muted/30 px-4 py-10 text-center">
              <Trash2 className="mx-auto h-6 w-6 text-muted-foreground/40" />
              <p className="mt-2 text-sm font-semibold">Trash is empty</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Nothing here right now. Anything you delete shows up for 7 days.
              </p>
            </div>
          ) : (
            <ul className="max-h-[55vh] divide-y divide-border/60 overflow-y-auto">
              {items.map((e) => {
                const emoji = emojiFor?.(e)
                return (
                  <li key={`${e.kind}-${e.id}`} className="flex items-center gap-3 px-1 py-2">
                    {emoji && <span aria-hidden className="text-xl">{emoji}</span>}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">
                        {e.label || "Untitled"}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {e.sublabel ? `${e.sublabel} · ` : ""}
                        Deleted {new Date(e.deletedAt).toLocaleString()} ·{" "}
                        <span className="text-amber-600 dark:text-amber-400">
                          {trashRemainingLabel(e.deletedAt)}
                        </span>
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRestore(e)}
                      className="gap-1"
                    >
                      <RotateCcw className="h-3 w-3" />
                      Restore
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handlePurge(e)}
                      className="gap-1 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      title="Delete permanently"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </li>
                )
              })}
            </ul>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

function cap(s: string): string {
  return s.length > 0 ? s[0].toUpperCase() + s.slice(1) : s
}
