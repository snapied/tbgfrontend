"use client"

// Student-facing Trash. Reuses the same workspace-wide store the
// teacher dashboard uses, but filters to entries the SIGNED-IN
// student owns — never the instructor's deleted courses or other
// students' rows. Per-kind ownership predicates decide what counts as
// "yours":
//   • whiteboard → payload.createdBy === currentUser.id
//   • doubt      → payload.studentId === currentUser.id
// Anything else stays hidden — students shouldn't see the
// instructor's trash even though it's in the same tenant bucket.
//
// Restore + purge run through the existing trash event bus, so the
// LMS store's restore handlers (already covering whiteboard + doubt)
// re-insert the snapshot just like on the teacher side.

import { useMemo, useState } from "react"
import {
  MessageCircleQuestion,
  PenSquare,
  RotateCcw,
  Trash2,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  purgeTrash,
  restoreFromTrash,
  trashRemainingLabel,
  TRASH_TTL_DAYS,
  useTrash,
  type TrashEntry,
} from "@/lib/trash"
import { useConfirm } from "@/lib/use-confirm"
import { useLMS } from "@/lib/lms-store"

// Per-kind icon + group label, scoped to what a student can actually
// own. New kinds added here as student-creatable surfaces grow.
const KIND_META: Record<
  string,
  { icon: typeof Trash2; group: string; ownerField: string }
> = {
  whiteboard: {
    icon: PenSquare,
    group: "Whiteboards",
    ownerField: "createdBy",
  },
  doubt: {
    icon: MessageCircleQuestion,
    group: "Doubts & Q&A",
    ownerField: "studentId",
  },
}

function ownsEntry(entry: TrashEntry, userId: string): boolean {
  const meta = KIND_META[entry.kind as string]
  if (!meta) return false
  const payload = entry.payload as Record<string, unknown> | null | undefined
  if (!payload || typeof payload !== "object") return false
  return payload[meta.ownerField] === userId
}

export default function MyTrashPage() {
  const entries = useTrash()
  const { currentUser } = useLMS()
  const confirm = useConfirm()
  const [restoring, setRestoring] = useState<string | null>(null)

  // Only the student's own deleted rows. The store itself is
  // workspace-wide so the unfiltered list would leak instructor
  // deletions — filtering here keeps the surface honest.
  const mine = useMemo(() => {
    if (!currentUser) return []
    return entries.filter((e) => ownsEntry(e, currentUser.id))
  }, [entries, currentUser])

  const groups = useMemo(() => {
    const map = new Map<string, TrashEntry[]>()
    for (const e of mine) {
      const meta = KIND_META[e.kind as string]
      const g = meta?.group ?? "Other"
      if (!map.has(g)) map.set(g, [])
      map.get(g)!.push(e)
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  }, [mine])

  const onRestore = async (entry: TrashEntry) => {
    setRestoring(`${entry.kind}:${entry.id}`)
    const ok = restoreFromTrash(entry.kind, entry.id)
    setRestoring(null)
    if (ok) toast.success(`Restored "${entry.label}".`)
    else toast.error(`Couldn't restore "${entry.label}".`)
  }

  const onPurge = async (entry: TrashEntry) => {
    const ok = await confirm({
      title: `Delete "${entry.label}" forever?`,
      description:
        "This removes it from your trash permanently. There's no undo.",
      destructive: true,
      confirmLabel: "Delete forever",
    })
    if (!ok) return
    purgeTrash(entry.kind, entry.id)
    toast.success(`"${entry.label}" purged.`)
  }

  // "Empty trash" only purges the student's own kinds — we don't want
  // a student to nuke the instructor's deleted courses just because
  // they happen to share the tenant trash bucket.
  const onEmptyMine = async () => {
    const ok = await confirm({
      title: `Empty your trash?`,
      description: `${mine.length} item${mine.length === 1 ? "" : "s"} will be permanently deleted. There's no undo.`,
      destructive: true,
      confirmLabel: "Empty my trash",
    })
    if (!ok) return
    for (const entry of mine) {
      purgeTrash(entry.kind, entry.id)
    }
    toast.success("Your trash is empty.")
  }

  if (!currentUser) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          Sign in to see your trash.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold tracking-tight">Trash</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Things you delete land here for {TRASH_TTL_DAYS} days. Restore to bring them back, or purge to free the space.
          </p>
        </div>
        {mine.length > 0 && (
          <Button variant="outline" onClick={onEmptyMine} className="self-start">
            <Trash2 className="mr-1.5 h-4 w-4" />
            Empty my trash
          </Button>
        )}
      </div>

      {mine.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Trash2 className="h-10 w-10 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">Nothing in your trash</h3>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              When you delete one of your own whiteboards or doubts, it&apos;ll stay here for {TRASH_TTL_DAYS} days in case you change your mind.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {groups.map(([group, items]) => (
            <Card key={group}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{group}</CardTitle>
                <CardDescription>
                  {items.length} item{items.length === 1 ? "" : "s"}
                </CardDescription>
              </CardHeader>
              <CardContent className="divide-y divide-border p-0">
                {items.map((entry) => {
                  const meta = KIND_META[entry.kind as string]
                  const Icon = meta?.icon ?? Trash2
                  const isRestoring = restoring === `${entry.kind}:${entry.id}`
                  return (
                    <div
                      key={`${entry.kind}:${entry.id}`}
                      className="flex items-center gap-3 p-3"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">
                          {entry.label}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <Badge variant="outline" className="px-1.5 py-0 text-[10px]">
                            {String(entry.kind)}
                          </Badge>
                          {entry.sublabel && (
                            <span className="truncate">{entry.sublabel}</span>
                          )}
                          <span aria-hidden>·</span>
                          <span>Deleted {timeAgo(entry.deletedAt)}</span>
                          <span aria-hidden>·</span>
                          <span>{trashRemainingLabel(entry.deletedAt)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onRestore(entry)}
                          disabled={isRestoring}
                        >
                          <RotateCcw className="mr-1 h-3.5 w-3.5" />
                          Restore
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => onPurge(entry)}
                          title="Delete forever"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.round(diff / 60000)
  if (m < 1) return "just now"
  if (m < 60) return `${m} min ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.round(h / 24)
  if (d === 1) return "yesterday"
  return `${d}d ago`
}
