"use client"

// Inline-undo toast for soft-delete actions. Every destructive action
// that pushes a snapshot to Trash (see lib/trash.ts) should call this
// helper instead of toast.success directly — the user gets a 5-second
// window to bail without trekking to /dashboard/trash.
//
// Restore is best-effort: it dispatches the same `trash:restore` event
// /dashboard/trash uses, which the originating store handles. If the
// store has been unmounted between delete and undo (rare — would
// require a navigation away during the 5-second window) the undo
// silently no-ops and the entry stays in Trash for manual restore.

import { toast } from "sonner"
import { restoreFromTrash, type TrashKind } from "./trash"

interface Options {
  /** Trash kind — must match what the store passed to pushToTrash. */
  kind: TrashKind
  /** Single id (or array, for bulk deletes). */
  ids: string | string[]
  /** Human label that flows into the toast headline.
   *  Single: "Maths 101". Bulk: leave blank and we'll say "3 quizzes". */
  label?: string
  /** Used in the bulk count phrasing — "3 quizzes deleted". Defaults
   *  to "item". Pass a singular noun; we'll pluralise. */
  itemNoun?: string
  /** Optional override for the success line. Default crafts it from
   *  the count/label automatically. */
  message?: string
  /** Where the toast points the user when the undo button fails (e.g.
   *  the store has unmounted). Defaults to /dashboard/trash for the
   *  teacher dashboard; student callers should pass /p/<tenant>/my/trash. */
  recoverPath?: string
}

const UNDO_WINDOW_MS = 5000

export function toastUndoableDelete({
  kind,
  ids,
  label,
  itemNoun = "item",
  message,
  recoverPath = "/dashboard/trash",
}: Options): void {
  const list = Array.isArray(ids) ? ids : [ids]
  if (list.length === 0) return

  const headline =
    message ??
    (list.length === 1
      ? `Deleted${label ? ` "${label}"` : ""}.`
      : `Deleted ${list.length} ${pluralise(itemNoun, list.length)}.`)

  toast.success(headline, {
    description: "Restore from Trash within 7 days.",
    duration: UNDO_WINDOW_MS,
    action: {
      label: "Undo",
      onClick: () => {
        let restored = 0
        for (const id of list) {
          if (restoreFromTrash(kind, id)) restored++
        }
        if (restored === list.length) {
          toast.success(
            list.length === 1
              ? "Restored."
              : `Restored ${restored} ${pluralise(itemNoun, restored)}.`,
          )
        } else if (restored > 0) {
          toast.success(
            `Restored ${restored} of ${list.length}. The rest stay in Trash — open ${recoverPath} to recover.`,
          )
        } else {
          toast.error(
            `Couldn't restore — open ${recoverPath} to recover manually.`,
          )
        }
      },
    },
  })
}

function pluralise(noun: string, n: number): string {
  if (n === 1) return noun
  // Naïve pluralisation — good enough for the nouns we throw at it:
  // quiz → quizzes, class → classes, student → students, course → courses.
  if (noun.endsWith("s") || noun.endsWith("x") || noun.endsWith("z"))
    return noun + "es"
  if (noun.endsWith("y") && !/[aeiou]y$/.test(noun))
    return noun.slice(0, -1) + "ies"
  return noun + "s"
}
