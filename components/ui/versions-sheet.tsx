"use client"

// VersionsSheet — side panel that surfaces a `useVersionedDoc`
// history with the canonical actions: Restore · Compare · Pin · Rename · Delete.
//
// Pure presentational: the caller passes the API the hook returns +
// a callback that does the actual restore (since restore semantics
// vary per artifact — Brand replaces in place, Blog opens a new
// draft revision, etc.).

import { useMemo, useState } from "react"
import {
  ArrowRight,
  History,
  Pencil,
  Pin,
  PinOff,
  RotateCcw,
  Trash2,
} from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { useConfirm } from "@/lib/use-confirm"
import {
  diffShallow,
  type FieldDiff,
  type UseVersionedDocApi,
  type VersionEntry,
} from "@/lib/versioning"

interface Props<T extends object> {
  open: boolean
  onOpenChange: (v: boolean) => void
  api: UseVersionedDocApi<T>
  /** What the current (unsaved) value is. Drives "vs current" diff
   *  for the first row. */
  current: T
  /** Restore callback. Caller chooses replace-in-place vs. new draft. */
  onRestore: (snapshot: T, entry: VersionEntry<T>) => void
  /** Optional pretty label per field — when omitted, the raw key
   *  is used. Pass for nicer copy ("Primary colour" vs. "primaryColor"). */
  fieldLabels?: Partial<Record<keyof T, string>>
  /** Optional renderer for a value's preview chip. Defaults to a
   *  generic JSON-stringified pill. Useful for colour swatches etc. */
  renderValuePreview?: (field: string, value: unknown) => React.ReactNode
}

export function VersionsSheet<T extends object>({
  open,
  onOpenChange,
  api,
  current,
  onRestore,
  fieldLabels,
  renderValuePreview,
}: Props<T>) {
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameDraft, setRenameDraft] = useState("")
  const [compareA, setCompareA] = useState<string | null>(null)
  const [compareB, setCompareB] = useState<string | null>(null)
  const confirm = useConfirm()

  // Pre-compute diff vs current for the latest version (visual cue:
  // "your unsaved draft differs from latest snapshot by N fields").
  const latestVsCurrent = useMemo<FieldDiff[]>(() => {
    if (!api.latest) return []
    return diffShallow(api.latest.snapshot, current)
  }, [api.latest, current])

  const compareDiff = useMemo<FieldDiff[]>(() => {
    if (!compareA || !compareB) return []
    const a = api.get(compareA)
    const b = api.get(compareB)
    if (!a || !b) return []
    return diffShallow(a as object, b as object)
  }, [compareA, compareB, api])

  const handleRestore = async (entry: VersionEntry<T>) => {
    const ok = await confirm({
      title: `Restore "${entry.label || formatTime(entry.createdAt)}"?`,
      description:
        "We'll snapshot your current values first, then restore. You can always undo by restoring the auto-snapshot we just took.",
      confirmLabel: "Restore",
    })
    if (!ok) return
    // Auto-snapshot the current state so a rash restore is reversible.
    api.snapshot(current, "Auto · before restore")
    onRestore(entry.snapshot, entry)
    onOpenChange(false)
  }

  const startRename = (e: VersionEntry<T>) => {
    setRenamingId(e.id)
    setRenameDraft(e.label ?? "")
  }
  const commitRename = () => {
    if (renamingId) api.rename(renamingId, renameDraft)
    setRenamingId(null)
    setRenameDraft("")
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            Versions
          </SheetTitle>
          <SheetDescription>
            Snapshot history of this artifact. Pinned versions live forever; the rest age out at 50.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-3">
          {api.history.length === 0 ? (
            <p className="rounded-md border border-dashed border-border bg-muted/30 p-4 text-center text-sm text-muted-foreground">
              No versions yet. Hit Save (or Publish) to capture your first snapshot.
            </p>
          ) : (
            <>
              {/* "Compare two versions" controls. Only render once we
                  have at least 2 entries. */}
              {api.history.length >= 2 && (
                <div className="rounded-md border border-border bg-muted/30 p-3 text-[12px]">
                  <p className="font-bold uppercase tracking-wider text-muted-foreground">
                    Compare
                  </p>
                  <div className="mt-1.5 flex items-center gap-2">
                    <select
                      value={compareA ?? ""}
                      onChange={(e) => setCompareA(e.target.value || null)}
                      className="flex-1 rounded-md border border-input bg-background px-2 py-1 text-[12px]"
                    >
                      <option value="">Pick base…</option>
                      {api.history.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.label || formatTime(v.createdAt)}
                        </option>
                      ))}
                    </select>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                    <select
                      value={compareB ?? ""}
                      onChange={(e) => setCompareB(e.target.value || null)}
                      className="flex-1 rounded-md border border-input bg-background px-2 py-1 text-[12px]"
                    >
                      <option value="">Pick compare…</option>
                      {api.history.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.label || formatTime(v.createdAt)}
                        </option>
                      ))}
                    </select>
                  </div>
                  {compareDiff.length > 0 && (
                    <DiffList diffs={compareDiff} fieldLabels={fieldLabels} renderValuePreview={renderValuePreview} />
                  )}
                </div>
              )}

              {/* Current draft pseudo-row — shows the diff between
                  unsaved state and the latest snapshot. */}
              {latestVsCurrent.length > 0 && (
                <div className="rounded-md border border-primary/40 bg-primary/[0.05] p-3">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-primary">
                    Current draft · {latestVsCurrent.length} unsaved {latestVsCurrent.length === 1 ? "change" : "changes"}
                  </p>
                  <DiffList diffs={latestVsCurrent} fieldLabels={fieldLabels} renderValuePreview={renderValuePreview} />
                </div>
              )}

              {api.history.map((entry) => (
                <div
                  key={entry.id}
                  className={cn(
                    "rounded-md border bg-card p-3",
                    entry.pinned ? "border-amber-500/40 bg-amber-500/[0.04]" : "border-border",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      {renamingId === entry.id ? (
                        <div className="flex items-center gap-1">
                          <Input
                            autoFocus
                            value={renameDraft}
                            onChange={(e) => setRenameDraft(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && commitRename()}
                            onBlur={commitRename}
                            placeholder="Label this version"
                            className="h-7 text-[12px]"
                          />
                        </div>
                      ) : (
                        <p className="truncate text-[12.5px] font-semibold">
                          {entry.label ?? formatTime(entry.createdAt)}
                        </p>
                      )}
                      <p className="text-[11px] text-muted-foreground">
                        {entry.actorName ?? "Unknown"} ·{" "}
                        {formatTime(entry.createdAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-0.5">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        title={entry.pinned ? "Unpin" : "Pin (survives the FIFO cap)"}
                        onClick={() => api.togglePin(entry.id)}
                      >
                        {entry.pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        title="Rename"
                        onClick={() => startRename(entry)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        title="Delete"
                        onClick={() => api.remove(entry.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-2 w-full gap-1.5"
                    onClick={() => handleRestore(entry)}
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Restore this version
                  </Button>
                </div>
              ))}
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

function DiffList({
  diffs,
  fieldLabels,
  renderValuePreview,
}: {
  diffs: FieldDiff[]
  fieldLabels?: Partial<Record<string, string>>
  renderValuePreview?: (field: string, value: unknown) => React.ReactNode
}) {
  return (
    <ul className="mt-1.5 space-y-1">
      {diffs.slice(0, 8).map((d) => (
        <li key={d.field} className="flex items-center gap-2 text-[11.5px]">
          <span
            className={cn(
              "rounded-full px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wider",
              d.kind === "changed" && "bg-amber-100 text-amber-700",
              d.kind === "added" && "bg-emerald-100 text-emerald-700",
              d.kind === "removed" && "bg-red-100 text-red-700",
            )}
          >
            {d.kind}
          </span>
          <span className="truncate font-medium">{fieldLabels?.[d.field] ?? d.field}</span>
          <div className="ml-auto flex items-center gap-1 truncate">
            {d.kind !== "added" && (
              // Custom preview can opt out by returning null/undefined,
              // in which case we fall back to the generic Pill so the
              // diff row always has *something* to compare against.
              (() => {
                const node = renderValuePreview?.(d.field, d.before)
                return node ?? <Pill v={d.before} muted />
              })()
            )}
            {d.kind === "changed" && <ArrowRight className="h-3 w-3 text-muted-foreground" />}
            {d.kind !== "removed" && (
              (() => {
                const node = renderValuePreview?.(d.field, d.after)
                return node ?? <Pill v={d.after} />
              })()
            )}
          </div>
        </li>
      ))}
      {diffs.length > 8 && (
        <li className="text-[10.5px] italic text-muted-foreground">…and {diffs.length - 8} more</li>
      )}
    </ul>
  )
}

function Pill({ v, muted }: { v: unknown; muted?: boolean }) {
  const display = formatValue(v)
  return (
    <span
      className={cn(
        "max-w-[140px] truncate rounded-full border px-1.5 py-0.5 text-[10px] font-mono",
        muted ? "border-border bg-muted/30 text-muted-foreground" : "border-primary/30 bg-primary/5 text-foreground",
      )}
      title={display}
    >
      {display}
    </span>
  )
}

function formatValue(v: unknown): string {
  if (v === undefined) return "—"
  if (v === null) return "null"
  if (typeof v === "string") return v.length > 20 ? `${v.slice(0, 18)}…` : v
  if (typeof v === "number" || typeof v === "boolean") return String(v)
  try {
    const s = JSON.stringify(v)
    return s.length > 24 ? `${s.slice(0, 22)}…` : s
  } catch {
    return String(v)
  }
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  } catch {
    return iso
  }
}
