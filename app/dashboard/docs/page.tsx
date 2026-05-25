"use client"

// /dashboard/docs — the Docs hub.
//
// Structurally identical to the Quizzes hub:
//   1. Header — title + Tour + Trash + "+ New doc" (opens picker)
//   2. Stats — 4-card grid (Total / Drafts / Published / Public)
//   3. Filter — search + audience dropdown
//   4. Bulk action bar — shown only when selection
//   5. All Docs card — table view + empty-state with featured templates
//
// One single template picker dialog handles every create path. The
// always-visible templates grid is gone; templates only surface in
// the empty state (where they're useful) and in the picker dialog
// (where they're requested).

import { useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Eye,
  FileText,
  GraduationCap,
  Globe2,
  Layers,
  Lock,
  MoreHorizontal,
  Pencil,
  Plus,
  RotateCcw,
  Sparkles,
  Trash2,
  Users,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { SearchInput } from "@/components/ui/search-input"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  EmptyStateWithTemplates,
  type EmptyStateTemplate,
} from "@/components/dashboard/empty-state-templates"
import { BulkActionBar } from "@/components/dashboard/bulk-action-bar"
import { ProductTour, TakeATourButton } from "@/components/tour/product-tour"
import { DOCS_HUB_TOUR, DOCS_HUB_TOUR_ID } from "@/components/docs/docs-tour"
import { DocTemplatePicker } from "@/components/docs/doc-template-picker"
import { useLMS } from "@/lib/lms-store"
import {
  audienceEmoji,
  audienceLabel,
  legacyBlocksToBlocknoteContent,
  useDocs,
  viewerCanSeeDoc,
} from "@/lib/docs"
import { getTemplate, type DocTemplate } from "@/lib/doc-templates"
import { useConfirm } from "@/lib/use-confirm"
import { useTenant } from "@/lib/tenant-store"
import { toast } from "sonner"

type AudienceFilter =
  | "all"
  | "private"
  | "workspace-admin"
  | "workspace-everyone"
  | "community"
  | "course"
  | "public"

export default function DocsHubPage() {
  const router = useRouter()
  const {
    docs,
    createDoc,
    deleteDoc,
    restoreDoc,
    duplicateDoc,
    hardDeleteDoc,
  } = useDocs()
  const { currentUser, enrollments, studentGroups, getUserById } = useLMS()
  const { currentTenant } = useTenant()
  const confirm = useConfirm()

  // Resolve the tenant-scoped public URL for a doc when it's
  // public + published + has a slug. Tenant URL ONLY — the
  // platform-global /k route was retired. Returns null when we
  // don't yet know the tenant (the "Open public page" item just
  // hides in that case rather than linking to a 404).
  function publicUrlFor(d: { audience: { kind: string }; status: string; publicSlug?: string }): string | null {
    if (d.audience.kind !== "public" || d.status !== "published" || !d.publicSlug) return null
    if (!currentTenant?.slug) return null
    return `/p/${encodeURIComponent(currentTenant.slug)}/k/${d.publicSlug}`
  }

  const [search, setSearch] = useState("")
  const [audienceFilter, setAudienceFilter] = useState<AudienceFilter>("all")
  const [pickerOpen, setPickerOpen] = useState(false)
  const [trashOpen, setTrashOpen] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  // ─── Viewer + visibility ────────────────────────────────────

  const viewer = useMemo(
    () =>
      currentUser
        ? {
            userId: currentUser.id,
            role: currentUser.role,
            enrolledCourseIds: new Set(
              enrollments.filter((e) => e.studentId === currentUser.id).map((e) => e.courseId),
            ),
            memberCommunityIds: new Set(
              studentGroups.filter((g) => g.memberIds?.includes(currentUser.id)).map((g) => g.id),
            ),
          }
        : null,
    [currentUser, enrollments, studentGroups],
  )

  const visible = useMemo(
    () => docs.filter((d) => !d.deletedAt && viewerCanSeeDoc(d, viewer)),
    [docs, viewer],
  )

  // ─── Filtering + sort ───────────────────────────────────────

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return visible
      .filter((d) => audienceFilter === "all" || d.audience.kind === audienceFilter)
      .filter((d) => {
        if (!q) return true
        const hay =
          (d.title ?? "").toLowerCase() +
          " " +
          (d.icon ?? "") +
          " " +
          safeStringify(d.content).toLowerCase() +
          " " +
          safeStringify(d.blocks).toLowerCase()
        return hay.includes(q)
      })
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  }, [visible, search, audienceFilter])

  // Trashed docs owned by the viewer.
  const trashed = useMemo(
    () =>
      docs
        .filter((d) => d.deletedAt && (!currentUser || d.ownerId === currentUser.id))
        .sort((a, b) => (b.deletedAt ?? "").localeCompare(a.deletedAt ?? "")),
    [docs, currentUser],
  )

  // ─── Summary stats ──────────────────────────────────────────

  const totalDocs = visible.length
  const draftCount = visible.filter((d) => d.status === "draft").length
  const publishedCount = visible.filter((d) => d.status === "published").length
  const publicCount = visible.filter(
    (d) => d.audience.kind === "public" && d.status === "published",
  ).length

  // ─── Selection helpers ──────────────────────────────────────

  const visibleIds = filtered.map((d) => d.id)
  const allVisibleSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selected.has(id))
  const someVisibleSelected =
    !allVisibleSelected && visibleIds.some((id) => selected.has(id))

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }
  function toggleAllVisible() {
    setSelected((prev) => {
      const next = new Set(prev)
      if (allVisibleSelected) for (const id of visibleIds) next.delete(id)
      else for (const id of visibleIds) next.add(id)
      return next
    })
  }
  function clearSelection() { setSelected(new Set()) }

  const selectedIds = () =>
    Array.from(selected).filter((id) => visible.some((d) => d.id === id))

  // ─── Create / mutate ────────────────────────────────────────

  function createFromTemplate(templateKey: string) {
    if (!currentUser) return
    const t = getTemplate(templateKey)
    if (!t) return
    const legacy = t.buildBlocks()
    const doc = createDoc({
      ownerId: currentUser.id,
      title: t.title === "Blank doc" ? "Untitled" : t.title,
      icon: t.emoji,
      blocks: legacy,
      content: legacyBlocksToBlocknoteContent(legacy),
      audience: t.defaultAudience,
      status: "draft",
    })
    setPickerOpen(false)
    router.push(`/dashboard/docs/${doc.id}`)
  }

  function createFromTemplateObject(t: DocTemplate) {
    createFromTemplate(t.key)
  }

  async function bulkDelete() {
    const ids = selectedIds()
    if (ids.length === 0) return
    const ok = await confirm({
      title: `Move ${ids.length} doc${ids.length === 1 ? "" : "s"} to trash?`,
      description:
        "Trashed docs can be restored within 30 days. Backlinks from other docs will show a 'this doc was removed' stub until you restore or replace.",
      destructive: true,
      confirmLabel: "Move to trash",
    })
    if (!ok) return
    ids.forEach((id) => deleteDoc(id))
    clearSelection()
    // Single Undo restores every doc in the batch in one click —
    // matches the per-row delete experience so the user never loses
    // work to a fat-fingered bulk action.
    toast.success(`${ids.length} doc${ids.length === 1 ? "" : "s"} moved to trash`, {
      action: {
        label: "Undo",
        onClick: () => {
          ids.forEach((id) => restoreDoc(id))
          toast.success(`Restored ${ids.length} doc${ids.length === 1 ? "" : "s"}`)
        },
      },
      duration: 8000,
    })
  }

  function bulkDuplicate() {
    if (!currentUser) return
    const ids = selectedIds()
    if (ids.length === 0) return
    let copies = 0
    for (const id of ids) {
      const copy = duplicateDoc(id, currentUser.id)
      if (copy) copies++
    }
    clearSelection()
    toast.success(`Duplicated ${copies} doc${copies === 1 ? "" : "s"}`)
  }

  // ─── Empty-state featured templates ─────────────────────────
  // Three quick-starts shown when the workspace has no docs at all.
  // The picker dialog still exposes all 8.
  const featuredTemplates: EmptyStateTemplate[] = [
    {
      key: "blank",
      title: "Blank doc",
      preview: "Start from nothing — slash menu, drag-rearrange, multiplayer.",
      icon: <FileText className="h-4 w-4" />,
      accent: "primary",
      onSelect: () => createFromTemplate("blank"),
    },
    {
      key: "course-handbook",
      title: "Course handbook",
      preview: "Syllabus, schedule, contact policy, rubrics — the durable course companion.",
      icon: <GraduationCap className="h-4 w-4" />,
      accent: "emerald",
      onSelect: () => createFromTemplate("course-handbook"),
    },
    {
      key: "class-recap",
      title: "Class recap",
      preview: "Post-class summary — what we covered, recording, action items, next class.",
      icon: <Sparkles className="h-4 w-4" />,
      accent: "amber",
      onSelect: () => createFromTemplate("class-recap"),
    },
  ]

  // ─── Render ─────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <ProductTour
        tourId={DOCS_HUB_TOUR_ID}
        steps={DOCS_HUB_TOUR}
        promptLabel="New here? Take a 60-second tour of Docs"
      />

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Docs</h1>
          <p className="text-muted-foreground">
            Handbooks, study guides, cohort wikis — your knowledge layer.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <TakeATourButton tourId={DOCS_HUB_TOUR_ID} />
          <Button
            variant="outline"
            onClick={() => setTrashOpen(true)}
            className="gap-1.5"
          >
            <Trash2 className="h-4 w-4" />
            Trash
            {trashed.length > 0 && (
              <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-[10px]">
                {trashed.length}
              </Badge>
            )}
          </Button>
          <Button onClick={() => setPickerOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            New doc
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<FileText className="h-6 w-6 text-primary" />}
          tint="bg-primary/10"
          value={totalDocs}
          label="Total docs"
        />
        <StatCard
          icon={<Pencil className="h-6 w-6 text-amber-600" />}
          tint="bg-amber-500/10"
          value={draftCount}
          label="Drafts"
        />
        <StatCard
          icon={<Eye className="h-6 w-6 text-success" />}
          tint="bg-success/10"
          value={publishedCount}
          label="Published"
        />
        <StatCard
          icon={<Globe2 className="h-6 w-6 text-violet-600" />}
          tint="bg-violet-500/10"
          value={publicCount}
          label="Public on the web"
        />
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex-1">
              <SearchInput
                pageId="docs"
                value={search}
                onChange={setSearch}
                placeholder="Search docs…"
                ariaLabel="Search docs"
                shortcutDescription="Focus doc search"
              />
            </div>
            <Select
              value={audienceFilter}
              onValueChange={(v) => setAudienceFilter(v as AudienceFilter)}
            >
              <SelectTrigger className="w-full sm:w-56">
                <SelectValue placeholder="Filter by audience" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All audiences</SelectItem>
                <SelectItem value="private">🔒 Private</SelectItem>
                <SelectItem value="workspace-admin">🛡 Admins + instructors</SelectItem>
                <SelectItem value="workspace-everyone">🏢 Everyone in workspace</SelectItem>
                <SelectItem value="community">👥 Community</SelectItem>
                <SelectItem value="course">🎓 Course-enrolled</SelectItem>
                <SelectItem value="public">🌐 Public on the web</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <BulkActionBar
          selectedCount={selected.size}
          totalCount={filtered.length}
          onClear={clearSelection}
          actions={[
            {
              key: "duplicate",
              label: "Duplicate",
              icon: <Layers className="h-3.5 w-3.5" />,
              onClick: bulkDuplicate,
            },
            {
              key: "delete",
              label: "Delete",
              icon: <Trash2 className="h-3.5 w-3.5" />,
              destructive: true,
              onClick: bulkDelete,
            },
          ]}
        />
      )}

      {/* All Docs */}
      <Card>
        <CardHeader>
          <CardTitle>All Docs</CardTitle>
          <CardDescription>
            {filtered.length} {filtered.length === 1 ? "doc" : "docs"} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {visible.length === 0 ? (
            <EmptyStateWithTemplates
              icon={<FileText className="h-5 w-5" />}
              title="No docs yet"
              description="Pick a starter, or browse all 8 templates — handbooks, study guides, cohort wikis, public FAQs."
              templates={featuredTemplates}
              blankAction={{
                label: "Browse all 8 templates",
                onSelect: () => setPickerOpen(true),
              }}
            />
          ) : filtered.length === 0 ? (
            <div className="py-10 text-center">
              <FileText className="mx-auto h-10 w-10 text-muted-foreground/40" />
              <h3 className="mt-3 text-base font-semibold">No matches</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Try clearing the search or audience filter.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8">
                    <Checkbox
                      aria-label="Select all visible docs"
                      checked={
                        allVisibleSelected
                          ? true
                          : someVisibleSelected
                            ? "indeterminate"
                            : false
                      }
                      onCheckedChange={toggleAllVisible}
                    />
                  </TableHead>
                  <TableHead className="w-[44%] min-w-[280px]">Doc</TableHead>
                  <TableHead>Audience</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((d) => {
                  const owner = getUserById(d.ownerId)
                  const isChecked = selected.has(d.id)
                  return (
                    <TableRow
                      key={d.id}
                      data-state={isChecked ? "selected" : undefined}
                    >
                      <TableCell>
                        <Checkbox
                          aria-label={`Select ${d.title || "Untitled"}`}
                          checked={isChecked}
                          onCheckedChange={() => toggleOne(d.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <span aria-hidden className="text-lg">{d.icon ?? "📝"}</span>
                          <Link
                            href={`/dashboard/docs/${d.id}`}
                            className="min-w-0 flex-1 truncate font-medium text-foreground hover:underline"
                          >
                            {d.title || "Untitled"}
                          </Link>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <span aria-hidden>{audienceEmoji(d.audience)}</span>
                          {audienceLabel(d.audience)}
                        </span>
                      </TableCell>
                      <TableCell>
                        {d.status === "draft" ? (
                          <Badge variant="secondary">Draft</Badge>
                        ) : (
                          <Badge className="bg-success text-success-foreground">
                            Published
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {owner?.name ?? "—"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {formatRel(d.updatedAt)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <Link href={`/dashboard/docs/${d.id}`}>
                                  <Pencil className="mr-2 h-4 w-4" />
                                  Open
                                </Link>
                              </DropdownMenuItem>
                              {(() => {
                                const href = publicUrlFor(d)
                                if (!href) return null
                                return (
                                  <DropdownMenuItem asChild>
                                    <Link href={href} target="_blank" rel="noreferrer">
                                      <Eye className="mr-2 h-4 w-4" />
                                      Open public page
                                    </Link>
                                  </DropdownMenuItem>
                                )
                              })()}
                              <DropdownMenuItem
                                onSelect={() => {
                                  if (!currentUser) return
                                  const copy = duplicateDoc(d.id, currentUser.id)
                                  if (copy) {
                                    toast.success("Duplicated", {
                                      action: {
                                        label: "Open",
                                        onClick: () =>
                                          router.push(`/dashboard/docs/${copy.id}`),
                                      },
                                    })
                                  }
                                }}
                              >
                                <Layers className="mr-2 h-4 w-4" />
                                Duplicate
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onSelect={async () => {
                                  const ok = await confirm({
                                    title: `Move "${d.title || "Untitled"}" to trash?`,
                                    description:
                                      "Restore within 30 days. Backlinks from other docs will show a removed stub.",
                                    destructive: true,
                                    confirmLabel: "Move to trash",
                                  })
                                  if (!ok) return
                                  deleteDoc(d.id)
                                  toast.success("Moved to trash", {
                                    action: {
                                      label: "Undo",
                                      onClick: () => {
                                        restoreDoc(d.id)
                                        toast.success("Restored")
                                      },
                                    },
                                    duration: 8000,
                                  })
                                }}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Move to trash
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Template picker */}
      <DocTemplatePicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onPick={createFromTemplateObject}
        onStartBlank={() => createFromTemplate("blank")}
      />

      {/* Trash dialog */}
      <Dialog open={trashOpen} onOpenChange={setTrashOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="h-4 w-4 text-destructive" />
              Trash · {trashed.length}
            </DialogTitle>
            <DialogDescription>
              Docs you&rsquo;ve deleted live here for 30 days. Restore brings them
              back as drafts — backlinks reconnect automatically.
            </DialogDescription>
          </DialogHeader>
          {trashed.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-muted/30 px-4 py-10 text-center">
              <Trash2 className="mx-auto h-6 w-6 text-muted-foreground/40" />
              <p className="mt-2 text-sm font-semibold">Trash is empty</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Anything you delete from a doc&rsquo;s ⋯ menu lands here.
              </p>
            </div>
          ) : (
            <ul className="max-h-[55vh] divide-y divide-border/60 overflow-y-auto">
              {trashed.map((d) => (
                <li key={d.id} className="flex items-center gap-3 px-1 py-2">
                  <span className="text-xl">{d.icon ?? "📝"}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {d.title || "Untitled"}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Deleted{" "}
                      {d.deletedAt ? new Date(d.deletedAt).toLocaleString() : ""}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      restoreDoc(d.id)
                      toast.success(`Restored "${d.title || "Untitled"}"`, {
                        action: {
                          label: "Open",
                          onClick: () => router.push(`/dashboard/docs/${d.id}`),
                        },
                      })
                    }}
                    className="gap-1"
                  >
                    <RotateCcw className="h-3 w-3" />
                    Restore
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={async () => {
                      const ok = await confirm({
                        title: `Permanently delete "${d.title || "Untitled"}"?`,
                        description:
                          "This can't be undone. The doc, its comments and the embed edges that point to it are removed for good.",
                        destructive: true,
                        confirmLabel: "Delete forever",
                      })
                      if (!ok) return
                      hardDeleteDoc(d.id)
                      toast.success("Doc permanently deleted")
                    }}
                    className="gap-1 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    title="Delete permanently"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Small pieces ───────────────────────────────────────────────

function StatCard({
  icon,
  tint,
  value,
  label,
}: {
  icon: React.ReactNode
  tint: string
  value: number
  label: string
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center gap-4">
          <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${tint}`}>
            {icon}
          </div>
          <div>
            <p className="text-2xl font-bold tabular-nums">{value}</p>
            <p className="text-sm text-muted-foreground">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Resilient JSON.stringify — returns "" instead of throwing on
// circular refs or undefined.
function safeStringify(v: unknown): string {
  try {
    return JSON.stringify(v) ?? ""
  } catch {
    return ""
  }
}

// Tiny relative-time formatter to match the editor footer feel.
function formatRel(iso: string): string {
  const ms = Date.now() - Date.parse(iso)
  if (Number.isNaN(ms) || ms < 0) return "just now"
  const sec = Math.floor(ms / 1000)
  if (sec < 60) return "just now"
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  const day = Math.floor(hr / 24)
  if (day < 30) return `${day}d ago`
  return new Date(iso).toLocaleDateString()
}

// Suppress unused-import warnings on icons reserved for the audience picker.
void Lock
void Users
