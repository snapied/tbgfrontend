"use client"

// Trash — anything the teacher deleted in the last 7 days. Every
// soft-delete across the app (courses, students, products, pages,
// posts, reviews, etc.) lands here via `pushToTrash`. Restore re-inserts
// the snapshot into the original store; Delete forever purges it.
// Items older than the TTL are pruned silently on read.

import { useMemo, useState } from "react"
import {
  ArrowUpRight,
  BookOpen,
  Briefcase,
  Calendar,
  FileQuestion,
  FileText,
  Heart,
  MessageCircleQuestion,
  Package,
  RotateCcw,
  ShoppingBag,
  Star,
  Trash2,
  Users,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  emptyTrash,
  purgeTrash,
  restoreFromTrash,
  trashRemainingLabel,
  TRASH_TTL_DAYS,
  useTrash,
  type TrashEntry,
  type TrashKind,
} from "@/lib/trash"
import { useConfirm } from "@/lib/use-confirm"

// Per-kind icon + group label. New kinds inherit the default icon
// and the "Other" group until we extend this map.
const KIND_META: Record<string, { icon: typeof Trash2; group: string }> = {
  course:           { icon: BookOpen,            group: "Courses" },
  "course-module":  { icon: BookOpen,            group: "Courses" },
  "course-lesson":  { icon: BookOpen,            group: "Courses" },
  student:          { icon: Users,               group: "Students" },
  user:             { icon: Users,               group: "Students" },
  "student-group":  { icon: Users,               group: "Students" },
  quiz:             { icon: FileQuestion,        group: "Assessments" },
  assignment:       { icon: Briefcase,           group: "Assessments" },
  "live-session":   { icon: Calendar,            group: "Classes" },
  doubt:            { icon: MessageCircleQuestion, group: "Q&A" },
  review:           { icon: Star,                group: "Reviews" },
  product:          { icon: ShoppingBag,         group: "Storefront" },
  "blog-post":      { icon: FileText,            group: "Portal" },
  "portal-page":    { icon: FileText,            group: "Portal" },
  "wall-entry":     { icon: Heart,               group: "Portal" },
  template:         { icon: Package,             group: "Templates" },
  referral:         { icon: ArrowUpRight,        group: "Referrals" },
}

function metaFor(kind: TrashKind) {
  return KIND_META[kind as string] ?? { icon: Trash2, group: "Other" }
}

export default function TrashPage() {
  const entries = useTrash()
  const confirm = useConfirm()
  const [restoring, setRestoring] = useState<string | null>(null)

  const groups = useMemo(() => {
    const map = new Map<string, TrashEntry[]>()
    for (const e of entries) {
      const g = metaFor(e.kind).group
      if (!map.has(g)) map.set(g, [])
      map.get(g)!.push(e)
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  }, [entries])

  const onRestore = async (entry: TrashEntry) => {
    setRestoring(`${entry.kind}:${entry.id}`)
    const ok = restoreFromTrash(entry.kind, entry.id)
    setRestoring(null)
    if (ok) toast.success(`Restored "${entry.label}".`)
    else toast.error(`Couldn't restore "${entry.label}" — the source module may not be loaded.`)
  }

  const onPurge = async (entry: TrashEntry) => {
    const ok = await confirm({
      title: `Delete "${entry.label}" forever?`,
      description: "This permanently removes it from Trash. There's no undo after this.",
      destructive: true,
      confirmLabel: "Delete forever",
    })
    if (!ok) return
    purgeTrash(entry.kind, entry.id)
    toast.success(`"${entry.label}" purged.`)
  }

  const onEmpty = async () => {
    const ok = await confirm({
      title: `Empty the entire Trash?`,
      description: `${entries.length} item${entries.length === 1 ? "" : "s"} will be permanently deleted. There's no undo after this.`,
      destructive: true,
      confirmLabel: "Empty trash",
    })
    if (!ok) return
    emptyTrash()
    toast.success("Trash emptied.")
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Trash</h1>
          <p className="text-muted-foreground">
            Anything you delete is kept here for {TRASH_TTL_DAYS} days. Restore it to bring it back, or empty the trash to free up space.
          </p>
        </div>
        {entries.length > 0 && (
          <Button variant="outline" onClick={onEmpty} className="self-start">
            <Trash2 className="mr-1.5 h-4 w-4" />
            Empty trash
          </Button>
        )}
      </div>

      {entries.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Trash2 className="h-10 w-10 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">Nothing in the trash</h3>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              When you delete a course, product, page or anything else, it lands here for {TRASH_TTL_DAYS} days so you can restore it.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {groups.map(([group, items]) => (
            <Card key={group}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{group}</CardTitle>
                <CardDescription>{items.length} item{items.length === 1 ? "" : "s"}</CardDescription>
              </CardHeader>
              <CardContent className="divide-y divide-border p-0">
                {items.map((entry) => {
                  const meta = metaFor(entry.kind)
                  const Icon = meta.icon
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
                        <p className="truncate text-sm font-medium text-foreground">{entry.label}</p>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <Badge variant="outline" className="px-1.5 py-0 text-[10px]">{String(entry.kind)}</Badge>
                          {entry.sublabel && <span className="truncate">{entry.sublabel}</span>}
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

// "Just now" / "3 min ago" / "2 h ago" / "Yesterday" — keeps the row
// readable without showing a full timestamp on every line.
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
