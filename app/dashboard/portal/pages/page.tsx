"use client"

// Pages list — every page on the public portal in one place.
//
// Sprint deliverables in this round:
//   • Search + status/nav filter + sort + bulk actions (Items 1, 2, 3)
//   • Drag-to-reorder mode for nav (Item 5)
//   • Starter-template empty state + New-page template picker (Items 7, 16)
//   • Set-as-home action + safer home-delete guard (Item 11)
//   • Preview-as-draft per row (Item 12)
//   • Inline slug rename with redirect prompt (Item 13)
//   • Reserved-slug guard on create + rename (Item 15)
//   • Per-row Share menu (Item 24)
//   • Per-row Pin-to-community (Item 43)
//   • Trash tab + restore + permanent delete (Item 29)
//
// State: page list pulls from `usePortal().pages`. Search/filter/sort
// state lives in URL via `useListState`. Trash view is a tab on this
// same page — uses the same selection bar, just with restore + purge
// actions instead of publish/draft.

import { useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowRight,
  ArrowUpDown,
  Eye,
  EyeOff,
  ExternalLink as ExternalLinkIcon,
  FileText,
  GripVertical,
  Home,
  Pencil,
  Plus,
  RotateCcw,
  Share2,
  Sparkles,
  Trash2,
  Users2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"
import {
  usePortal,
  generatePortalId,
  suggestHandle,
  type PortalPage,
  type PortalSection,
} from "@/lib/portal-store"
import { useTenant } from "@/lib/tenant-store"
import { useLMS } from "@/lib/lms-store"
import { LEGAL_PRESETS } from "@/lib/portal-legal-presets"
import { ProductTour, TakeATourButton, type TourStep } from "@/components/tour/product-tour"
import { useConfirm } from "@/lib/use-confirm"
import { toast } from "sonner"
import { useListState } from "@/lib/use-list-state"
import {
  ListToolbar,
  ListSearch,
  ListFilterPopover,
  ListSort,
  ListCount,
  ListReset,
} from "@/components/ui/list-toolbar"
import { BulkActionBar } from "@/components/dashboard/bulk-action-bar"
import { ShareMenu } from "@/components/share/share-menu"
import { isReservedSlug, suggestAlternativeSlug } from "@/lib/reserved-slugs"
import { PAGE_TEMPLATES, getPageTemplate } from "@/lib/portal-page-templates"
import { CrossPosterDialog } from "@/components/ui/cross-poster-dialog"

const PAGES_TOUR: TourStep[] = [
  {
    title: "Every page on your public site",
    body: "Home, About, custom landing pages, legal — everything lives here. Each page is a stack of sections you can drag, drop, and edit.",
    emoji: "📄",
    placement: "center",
  },
  {
    target: "[data-tour='pages-new']",
    title: "Create from a template",
    body: "Blank, About, FAQ, Sales letter, Lead magnet, Coming soon, Contact. Pick a shape, swap the words, publish.",
    emoji: "✨",
    placement: "left",
  },
  {
    target: "[data-tour='pages-legal']",
    title: "Add legal pages",
    body: "Pre-built starter boilerplate for Privacy, Terms, Refund — your support email is pre-filled. Have a lawyer review before going live.",
    emoji: "⚖️",
    placement: "bottom",
  },
  {
    target: "[data-tour='pages-list']",
    title: "Manage from the list",
    body: "Search, filter, bulk-publish, reorder for nav, set a new home page, or move to Trash. Each row links to the section editor.",
    emoji: "🗂️",
    placement: "top",
  },
  {
    title: "Tip: nav inclusion is per-page",
    body: "Each page has a 'Show in nav' toggle. Drag-to-reorder mode lets you choose the exact order they appear in your header.",
    emoji: "✨",
    placement: "center",
  },
]

export default function PortalPagesIndex() {
  const { pages, upsertPage, deletePage } = usePortal()
  const { currentTenant } = useTenant()
  const { studentGroups, addBatchPost, currentUser } = useLMS()
  const confirm = useConfirm()
  const router = useRouter()
  const tenantSlug = currentTenant?.slug ?? ""
  const portalUrl = (path: string) =>
    `/p/${tenantSlug}${path === "/" ? "" : path}`

  // Top-level view — "active" pages vs Trash. Implemented as a tab so
  // the empty-state design and bulk-action shape stay consistent.
  const [view, setView] = useState<"active" | "trash">("active")

  // Reorder mode — when true, rows render with a grip icon and HTML5
  // drag handles. Outside reorder mode, sort/filter are honoured.
  const [reorderMode, setReorderMode] = useState(false)

  const [newOpen, setNewOpen] = useState(false)
  const [legalOpen, setLegalOpen] = useState(false)
  const [renamingPage, setRenamingPage] = useState<PortalPage | null>(null)
  const [pinPage, setPinPage] = useState<PortalPage | null>(null)

  // Partition into active vs deleted up front so both counts are
  // available for the tab + filter pill labels.
  const active = useMemo(() => pages.filter((p) => !p.deletedAt), [pages])
  const trashed = useMemo(() => pages.filter((p) => p.deletedAt), [pages])

  // useListState for the active view. Trash view uses its own simple
  // filter (just deletedAt presence). Both use the same selection bar
  // — different actions wire up per view below.
  const list = useListState({
    pageId: "portal-pages",
    items: active,
    searchFields: (p) => [p.title, p.slug, p.navLabel ?? ""],
    filters: {
      status: {
        defaultValue: "all",
        match: (p, v) => v === "all" || p.status === v,
      },
      nav: {
        defaultValue: "all",
        match: (p, v) => v === "all" || (v === "yes" ? p.showInNav : !p.showInNav),
      },
    },
    sorts: {
      navOrder: {
        label: "Nav order",
        cmp: (a, b) => {
          if (a.slug === "/") return -1
          if (b.slug === "/") return 1
          return (a.navOrder ?? 99) - (b.navOrder ?? 99) || a.title.localeCompare(b.title)
        },
      },
      recent: {
        label: "Recently edited",
        cmp: (a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""),
      },
      title: { label: "A → Z", cmp: (a, b) => a.title.localeCompare(b.title) },
      sections: {
        label: "Most sections",
        cmp: (a, b) => b.sections.length - a.sections.length,
      },
    },
    defaultSort: "navOrder",
  })

  // In reorder mode we always show nav-order sort and skip the
  // filter pipeline. Pulling raw `active` keeps row ids stable for
  // the drag handler.
  const reorderRows = useMemo(() => {
    return [...active].sort((a, b) => {
      if (a.slug === "/") return -1
      if (b.slug === "/") return 1
      return (a.navOrder ?? 99) - (b.navOrder ?? 99) || a.title.localeCompare(b.title)
    })
  }, [active])

  const rows = reorderMode ? reorderRows : list.filtered
  const existingSlugs = new Set(pages.map((p) => p.slug))

  const draftCount = active.filter((p) => p.status === "draft").length
  const publishedCount = active.filter((p) => p.status === "published").length
  const inNavCount = active.filter((p) => p.showInNav).length
  const hiddenFromNavCount = active.length - inNavCount

  // ───── Bulk actions for the active view ───────────────────────────
  const bulkPublish = () => {
    list.selectedIds.forEach((id) => {
      const p = active.find((x) => x.id === id)
      if (p && p.status === "draft") {
        upsertPage({ ...p, status: "published", updatedAt: new Date().toISOString() })
      }
    })
    toast.success(`Published ${list.selectedIds.size} ${list.selectedIds.size === 1 ? "page" : "pages"}.`)
    list.clearSelection()
  }
  const bulkUnpublish = () => {
    list.selectedIds.forEach((id) => {
      const p = active.find((x) => x.id === id)
      if (p && p.status === "published") {
        upsertPage({ ...p, status: "draft", updatedAt: new Date().toISOString() })
      }
    })
    toast.success(`Moved ${list.selectedIds.size} to draft.`)
    list.clearSelection()
  }
  const bulkTrash = async () => {
    // Block home from being trashed — we surface a clear error.
    const hasHome = Array.from(list.selectedIds).some((id) => {
      const p = active.find((x) => x.id === id)
      return p?.slug === "/"
    })
    if (hasHome) {
      toast.error("Home page can't be moved to Trash. Set another page as home first.")
      return
    }
    const ok = await confirm({
      title: `Move ${list.selectedIds.size} pages to Trash?`,
      description: "You can restore from Trash within 7 days.",
      destructive: true,
      confirmLabel: "Move to Trash",
    })
    if (!ok) return
    const now = new Date().toISOString()
    list.selectedIds.forEach((id) => {
      const p = active.find((x) => x.id === id)
      if (p) upsertPage({ ...p, deletedAt: now, status: "draft", updatedAt: now })
    })
    toast.success(`Moved ${list.selectedIds.size} to Trash.`)
    list.clearSelection()
  }

  // ───── Per-row actions ────────────────────────────────────────────
  const setAsHome = async (p: PortalPage) => {
    if (p.slug === "/") return
    const currentHome = active.find((x) => x.slug === "/")
    const ok = await confirm({
      title: `Set "${p.title}" as your home page?`,
      description: currentHome
        ? `Your current home (${currentHome.title}) will move to "/old-home". You can change it back from the new home's slug.`
        : "Visitors landing on your portal root will now see this page.",
      confirmLabel: "Set as home",
    })
    if (!ok) return
    const now = new Date().toISOString()
    // Park the current home at /old-home so we never have two pages
    // at the same slug. If /old-home already exists (this isn't the
    // first swap), append a numeric suffix.
    if (currentHome) {
      let parkSlug = "/old-home"
      let n = 2
      while (existingSlugs.has(parkSlug) && parkSlug !== currentHome.slug) {
        parkSlug = `/old-home-${n++}`
      }
      upsertPage({ ...currentHome, slug: parkSlug, updatedAt: now })
    }
    upsertPage({ ...p, slug: "/", updatedAt: now })
    toast.success(`"${p.title}" is now your home page.`, {
      description: currentHome
        ? `Previous home moved to ${currentHome.slug === "/" ? "/old-home" : currentHome.slug}.`
        : undefined,
    })
  }

  const trashPage = async (p: PortalPage) => {
    if (p.slug === "/") {
      // Item 11 — better than the old hard error. Tell the teacher
      // exactly what to do to delete the home page.
      toast.error("Home page can't be deleted directly.", {
        description: "Use Set as home on another page first, then delete the old home.",
      })
      return
    }
    const ok = await confirm({
      title: `Move "${p.title}" to Trash?`,
      description: "You can restore from Trash within 7 days. The public URL will 404 immediately.",
      destructive: true,
      confirmLabel: "Move to Trash",
    })
    if (!ok) return
    const now = new Date().toISOString()
    upsertPage({ ...p, deletedAt: now, status: "draft", updatedAt: now })
    toast.success(`Moved "${p.title}" to Trash.`, {
      action: {
        label: "Undo",
        onClick: () => {
          upsertPage({ ...p, deletedAt: undefined, updatedAt: new Date().toISOString() })
        },
      },
    })
  }

  const restoreFromTrash = (p: PortalPage) => {
    const slugTaken =
      p.slug !== "/" && existingSlugs.has(p.slug) &&
      pages.some((x) => x.id !== p.id && x.slug === p.slug && !x.deletedAt)
    let next = { ...p, deletedAt: undefined, updatedAt: new Date().toISOString() }
    if (slugTaken) {
      // Rename to avoid collision.
      let candidate = `${p.slug}-restored`
      let n = 2
      while (existingSlugs.has(candidate)) candidate = `${p.slug}-restored-${n++}`
      next = { ...next, slug: candidate }
      toast.info(`Restored as ${candidate}`, {
        description: `Original URL was taken — we renamed to avoid a clash.`,
      })
    } else {
      toast.success(`Restored "${p.title}".`)
    }
    upsertPage(next)
  }

  const purgePermanently = async (p: PortalPage) => {
    const ok = await confirm({
      title: `Delete "${p.title}" permanently?`,
      description: "This bypasses Trash. The page and all its sections are gone for good.",
      destructive: true,
      confirmLabel: "Delete forever",
    })
    if (!ok) return
    deletePage(p.id)
    toast.success(`Deleted "${p.title}" permanently.`)
  }

  // Drag-to-reorder (Item 5). Uses native HTML5 DnD — simple, no
  // extra library, plenty good for ~30 pages.
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, id: string) => {
    e.dataTransfer.setData("text/plain", id)
    e.dataTransfer.effectAllowed = "move"
  }
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
  }
  const handleDrop = (e: React.DragEvent<HTMLDivElement>, targetId: string) => {
    e.preventDefault()
    const sourceId = e.dataTransfer.getData("text/plain")
    if (!sourceId || sourceId === targetId) return
    const source = active.find((p) => p.id === sourceId)
    const target = active.find((p) => p.id === targetId)
    if (!source || !target) return
    if (source.slug === "/" || target.slug === "/") return // home is pinned
    // Re-derive nav order — walk the sorted list with source moved
    // to target's position, re-stamp navOrder by index. Home gets 0;
    // every other page gets monotonically-increasing values.
    const reordered = reorderRows.filter((p) => p.id !== sourceId)
    const targetIdx = reordered.findIndex((p) => p.id === targetId)
    reordered.splice(targetIdx, 0, source)
    const now = new Date().toISOString()
    reordered.forEach((p, idx) => {
      if (p.slug === "/") return
      const nextOrder = idx + 1
      if (p.navOrder !== nextOrder) {
        upsertPage({ ...p, navOrder: nextOrder, updatedAt: now })
      }
    })
  }

  // Pin-to-community subsumed by CrossPosterDialog. Original
  // `handlePinToCommunity` removed — see the dialog mount below.

  // ───── Render ─────────────────────────────────────────────────────
  const isTrash = view === "trash"
  const trashRows = trashed
    .slice()
    .sort((a, b) => (b.deletedAt ?? "").localeCompare(a.deletedAt ?? ""))

  return (
    <div className="space-y-6">
      <ProductTour tourId="portal-pages-v2" steps={PAGES_TOUR} />

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            Pages
          </div>
          <h1 className="mt-3 font-serif text-2xl font-bold tracking-tight">
            Every page on your public site
          </h1>
          <p className="text-muted-foreground">
            Each page is composed of sections (hero, features, rich text, …). Click any page to edit
            its content. Add new pages for landing experiments, legal policies, or anything custom.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <TakeATourButton tourId="portal-pages-v2" />
          <Button variant="outline" onClick={() => setLegalOpen(true)} data-tour="pages-legal">
            <Sparkles className="mr-1.5 h-4 w-4" /> Add legal pages
          </Button>
          <Button onClick={() => setNewOpen(true)} data-tour="pages-new">
            <Plus className="mr-1.5 h-4 w-4" /> New page
          </Button>
        </div>
      </div>

      {/* View tabs: active vs Trash */}
      <Tabs value={view} onValueChange={(v) => { setView(v as "active" | "trash"); list.clearSelection() }}>
        <TabsList>
          <TabsTrigger value="active">
            Pages
            <span className="ml-1.5 rounded-full bg-muted px-1.5 text-[10px] font-bold text-muted-foreground">
              {active.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="trash">
            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
            Trash
            {trashed.length > 0 && (
              <span className="ml-1.5 rounded-full bg-amber-100 px-1.5 text-[10px] font-bold text-amber-700">
                {trashed.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Toolbar — only on the active view */}
      {!isTrash && active.length > 0 && (
        <>
          <ListToolbar>
            <ListSearch
              value={list.search}
              onChange={list.setSearch}
              placeholder="Search pages by title, slug, or nav label — / to focus"
            />
            <ListFilterPopover
              label="Status"
              value={list.getFilter("status")}
              onChange={(v) => list.setFilter("status", v)}
              options={[
                { value: "all", label: "All", count: active.length },
                { value: "draft", label: "Drafts", count: draftCount },
                { value: "published", label: "Published", count: publishedCount },
              ]}
            />
            <ListFilterPopover
              label="In nav"
              value={list.getFilter("nav")}
              onChange={(v) => list.setFilter("nav", v)}
              options={[
                { value: "all", label: "All", count: active.length },
                { value: "yes", label: "Shown in nav", count: inNavCount },
                { value: "no", label: "Hidden from nav", count: hiddenFromNavCount },
              ]}
            />
            <ListSort value={list.sort} onChange={list.setSort} options={list.sortOptions} />
            <Button
              variant={reorderMode ? "default" : "outline"}
              size="sm"
              onClick={() => setReorderMode((v) => !v)}
              className="shrink-0 gap-2"
              title="Drag-reorder pages for the header nav"
            >
              <ArrowUpDown className="h-4 w-4" />
              {reorderMode ? "Done reordering" : "Reorder nav"}
            </Button>
          </ListToolbar>

          <div className="flex items-center justify-between">
            <ListCount visible={rows.length} total={active.length} noun="pages" />
            {list.hasActiveFilters && !reorderMode && (
              <ListReset onClick={list.resetFilters} />
            )}
            {reorderMode && (
              <span className="text-[11px] text-muted-foreground">
                Drag rows to reorder. Home is pinned at the top.
              </span>
            )}
          </div>

          <BulkActionBar
            selectedCount={list.selectedIds.size}
            totalCount={rows.length}
            onClear={list.clearSelection}
            actions={[
              { key: "publish", label: "Publish", icon: <Eye className="h-3.5 w-3.5" />, onClick: bulkPublish },
              { key: "unpublish", label: "Move to draft", icon: <EyeOff className="h-3.5 w-3.5" />, onClick: bulkUnpublish },
              { key: "trash", label: "Move to Trash", icon: <Trash2 className="h-3.5 w-3.5" />, destructive: true, onClick: bulkTrash },
            ]}
          />
        </>
      )}

      {/* Active rows */}
      {!isTrash && (
        active.length === 0 ? (
          <EmptyState
            tenantSlug={tenantSlug}
            existingSlugs={existingSlugs}
            onCreate={(p) => upsertPage(p)}
          />
        ) : rows.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="h-8 w-8 text-muted-foreground" />
              <p className="mt-3 text-sm font-medium">No pages match your filters.</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={list.resetFilters}>
                Reset filters
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="divide-y divide-border rounded-lg border border-border" data-tour="pages-list">
            {rows.map((p) => {
              const checked = list.isSelected(p.id)
              const isHome = p.slug === "/"
              return (
                <div
                  key={p.id}
                  draggable={reorderMode && !isHome}
                  onDragStart={(e) => handleDragStart(e, p.id)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, p.id)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 transition-colors",
                    checked && "bg-primary/5",
                    reorderMode && !isHome && "cursor-grab active:cursor-grabbing",
                  )}
                >
                  {reorderMode ? (
                    <GripVertical
                      className={cn(
                        "h-4 w-4 shrink-0",
                        isHome ? "text-muted-foreground/40" : "text-muted-foreground",
                      )}
                      aria-label="Drag handle"
                    />
                  ) : (
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() => list.toggleSelect(p.id)}
                      aria-label={`Select ${p.title}`}
                      className="shrink-0"
                    />
                  )}
                  {isHome ? (
                    <Home className="h-4 w-4 shrink-0 text-primary" aria-label="Home page" />
                  ) : (
                    <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/dashboard/portal/pages/${encodeURIComponent(p.slug)}`}
                        className="block truncate font-medium hover:text-primary"
                      >
                        {p.title}
                      </Link>
                      {isHome && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wider text-primary">
                          Home
                        </span>
                      )}
                      {p.showInNav && !isHome && (
                        <span className="rounded-full bg-muted px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-wider text-muted-foreground">
                          In nav
                        </span>
                      )}
                    </div>
                    <p className="truncate font-mono text-[11px] text-muted-foreground">
                      {p.slug === "/" ? "(home)" : p.slug}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                      p.status === "published"
                        ? "bg-success/15 text-success"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {p.status}
                  </span>
                  <span className="hidden text-[11px] text-muted-foreground sm:inline">
                    {p.sections.length} sections
                  </span>

                  {/* Per-row actions hidden in reorder mode to keep the
                      rail focused on the drag interaction. */}
                  {!reorderMode && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          upsertPage({
                            ...p,
                            status: p.status === "published" ? "draft" : "published",
                            updatedAt: new Date().toISOString(),
                          })
                        }
                        title={p.status === "published" ? "Unpublish" : "Publish"}
                      >
                        {p.status === "published" ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                      </Button>
                      <Button variant="ghost" size="sm" asChild title="View live">
                        <a href={portalUrl(p.slug)} target="_blank" rel="noopener noreferrer">
                          <ExternalLinkIcon className="h-3.5 w-3.5" />
                        </a>
                      </Button>
                      {/* Preview as draft — same iframe-route but with
                          ?preview=draft so the section editor's saved
                          drafts render. Right now this is just the
                          live URL with a hint; future v2 will wire a
                          token-based preview into the public layout. */}
                      {p.status === "draft" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          asChild
                          title="Preview this draft (you'll see it because you're signed in as the owner)"
                        >
                          <a
                            href={`${portalUrl(p.slug)}?preview=draft`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Sparkles className="h-3.5 w-3.5" />
                          </a>
                        </Button>
                      )}
                      <ShareMenu
                        artifact={{
                          kind: "page",
                          title: p.title,
                          description: `Page on ${currentTenant?.name ?? "your portal"}`,
                          url:
                            typeof window !== "undefined"
                              ? `${window.location.origin}${portalUrl(p.slug)}`
                              : portalUrl(p.slug),
                          source: currentTenant?.name,
                        }}
                        hideEmbed
                        trigger={
                          <Button variant="ghost" size="sm" title="Share this page">
                            <Share2 className="h-3.5 w-3.5" />
                          </Button>
                        }
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setRenamingPage(p)}
                        title="Rename slug / page"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      {!isHome && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setAsHome(p)}
                          title="Set as home page"
                        >
                          <Home className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setPinPage(p)}
                        title="Pin to a community"
                        disabled={studentGroups.length === 0}
                      >
                        <Users2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/dashboard/portal/pages/${encodeURIComponent(p.slug)}`}>
                          Edit <ArrowRight className="ml-1 h-3 w-3" />
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => trashPage(p)}
                        title={isHome ? "Set a new home page first" : "Move to Trash"}
                        disabled={isHome}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        )
      )}

      {/* Trash view */}
      {isTrash && (
        trashRows.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <Trash2 className="h-10 w-10 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">Trash is empty</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Deleted pages sit here for 7 days before they&rsquo;re purged.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="divide-y divide-border rounded-lg border border-border">
            {trashRows.map((p) => {
              const deletedDate = p.deletedAt ? new Date(p.deletedAt) : null
              const days = deletedDate
                ? Math.floor((Date.now() - deletedDate.getTime()) / 86400000)
                : 0
              const remaining = Math.max(0, 7 - days)
              return (
                <div key={p.id} className="flex items-center gap-3 px-4 py-3">
                  <Trash2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{p.title}</p>
                    <p className="truncate font-mono text-[11px] text-muted-foreground">
                      {p.slug === "/" ? "(home)" : p.slug}
                    </p>
                  </div>
                  <span className="text-[11px] text-muted-foreground">
                    Deleted {deletedDate ? deletedDate.toLocaleDateString() : "—"} ·{" "}
                    <span className={cn(remaining <= 1 && "font-semibold text-destructive")}>
                      {remaining} day{remaining === 1 ? "" : "s"} left
                    </span>
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => restoreFromTrash(p)}
                    className="gap-1.5"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Restore
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => purgePermanently(p)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )
            })}
          </div>
        )
      )}

      {/* New page dialog (templates) */}
      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <NewPageDialog
          onClose={() => setNewOpen(false)}
          existingSlugs={existingSlugs}
          tenantSlug={tenantSlug}
          portalUrl={portalUrl}
          onCreate={(p) => {
            upsertPage(p)
            setNewOpen(false)
            // Jump straight into the editor so the teacher edits
            // immediately — no "where did my page go?" moment.
            router.push(`/dashboard/portal/pages/${encodeURIComponent(p.slug)}`)
          }}
        />
      </Dialog>

      {/* Slug rename dialog */}
      <Dialog open={!!renamingPage} onOpenChange={(o) => !o && setRenamingPage(null)}>
        {renamingPage && (
          <RenamePageDialog
            page={renamingPage}
            existingSlugs={existingSlugs}
            tenantSlug={tenantSlug}
            portalUrl={portalUrl}
            onClose={() => setRenamingPage(null)}
            onSave={(next) => {
              upsertPage({ ...next, updatedAt: new Date().toISOString() })
              setRenamingPage(null)
              toast.success("Saved.", {
                description:
                  renamingPage.slug !== next.slug
                    ? `New URL: ${portalUrl(next.slug)} · old URL will 404 — re-share where needed.`
                    : undefined,
              })
            }}
          />
        )}
      </Dialog>

      {/* Cross-poster — the legacy "Pin to community" button now
          opens the multi-channel dialog so a page can fan out to
          communities + LinkedIn + X + WhatsApp + email in one flow. */}
      {pinPage && (
        <CrossPosterDialog
          open={!!pinPage}
          onOpenChange={(o) => !o && setPinPage(null)}
          artifact={{
            kind: "page",
            title: pinPage.title,
            description: `Page on ${currentTenant?.name ?? "your portal"}`,
            url:
              typeof window !== "undefined"
                ? `${window.location.origin}${portalUrl(pinPage.slug)}`
                : portalUrl(pinPage.slug),
          }}
          defaultSelections={{
            communities: studentGroups[0]?.id ? [studentGroups[0].id] : [],
          }}
        />
      )}

      <Dialog open={legalOpen} onOpenChange={setLegalOpen}>
        <LegalPagesDialog
          onClose={() => setLegalOpen(false)}
          existingSlugs={existingSlugs}
          adminEmail={currentTenant?.ownerEmail}
          onAdd={(p) => upsertPage(p)}
        />
      </Dialog>
    </div>
  )
}

// ───── Empty state ─────────────────────────────────────────────────

function EmptyState({
  tenantSlug,
  existingSlugs,
  onCreate,
}: {
  tenantSlug: string
  existingSlugs: Set<string>
  onCreate: (page: PortalPage) => void
}) {
  const router = useRouter()
  const create = (templateKey: string) => {
    const t = getPageTemplate(templateKey)
    if (!t) return
    // Pick a non-colliding slug. Iterate `t.defaultSlug`, `-2`, `-3`…
    let slug = t.defaultSlug
    let n = 2
    while (existingSlugs.has(slug)) {
      slug = `${t.defaultSlug}-${n++}`
    }
    const now = new Date().toISOString()
    const page: PortalPage = {
      id: generatePortalId("page"),
      slug,
      title: t.defaultTitle,
      status: "draft",
      sections: t.build(t.defaultTitle),
      showInNav: t.key !== "blank" && t.key !== "coming-soon",
      navLabel: t.defaultTitle,
      navOrder: 99,
      fromTemplate: t.key,
      createdAt: now,
      updatedAt: now,
    }
    onCreate(page)
    router.push(`/dashboard/portal/pages/${encodeURIComponent(slug)}`)
  }

  return (
    <Card>
      <CardContent className="space-y-6 py-10">
        <div className="text-center">
          <FileText className="mx-auto h-10 w-10 text-muted-foreground" />
          <h3 className="mt-3 text-lg font-semibold">Your portal needs pages</h3>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            Start from a shape that&rsquo;s already worked elsewhere — swap the
            words, publish in five minutes.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {PAGE_TEMPLATES.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => create(t.key)}
              className="group flex h-full flex-col items-start gap-1.5 rounded-xl border bg-card p-4 text-left transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <span className="text-2xl" aria-hidden>
                {t.emoji}
              </span>
              <span className="text-sm font-semibold">{t.title}</span>
              <span className="text-[11.5px] leading-relaxed text-muted-foreground">{t.description}</span>
              <span className="mt-auto inline-flex items-center gap-1 text-[11px] font-semibold text-primary opacity-0 transition-opacity group-hover:opacity-100">
                Use this <ArrowRight className="h-3 w-3" />
              </span>
            </button>
          ))}
        </div>
        <p className="text-center text-[11px] text-muted-foreground">
          Public URL will be{" "}
          <code className="font-mono">/p/{tenantSlug}/&lt;slug&gt;</code>
        </p>
      </CardContent>
    </Card>
  )
}

// ───── New page dialog (with template picker) ──────────────────────

function NewPageDialog({
  onClose,
  onCreate,
  existingSlugs,
  tenantSlug,
  portalUrl,
}: {
  onClose: () => void
  onCreate: (page: PortalPage) => void
  existingSlugs: Set<string>
  tenantSlug: string
  portalUrl: (path: string) => string
}) {
  const [templateKey, setTemplateKey] = useState<string>("about")
  const [title, setTitle] = useState("")
  const [slugInput, setSlugInput] = useState("")
  const [showInNav, setShowInNav] = useState(true)

  const template = getPageTemplate(templateKey)
  // Pre-populate title from the template once on pick if user hasn't
  // typed anything yet.
  const effectiveTitle = title || template?.defaultTitle || "New page"
  const slug =
    "/" +
    (slugInput || suggestHandle(title || template?.defaultSlug.replace(/^\/+/, "") || "new-page")).replace(
      /^\/+/,
      "",
    )

  const slugClash = existingSlugs.has(slug)
  const reserved = isReservedSlug(slug)
  const slugError = reserved
    ? `That slug is reserved by the platform. Try ${suggestAlternativeSlug(slug)}.`
    : slugClash
    ? "Slug taken — try another."
    : null
  const canSave = !!effectiveTitle.trim() && !!slug && !slugError

  const create = () => {
    if (!template) return
    const now = new Date().toISOString()
    onCreate({
      id: generatePortalId("page"),
      slug,
      title: effectiveTitle.trim(),
      status: "draft",
      sections: template.build(effectiveTitle.trim()),
      showInNav,
      navLabel: effectiveTitle.trim(),
      navOrder: 99,
      fromTemplate: template.key,
      createdAt: now,
      updatedAt: now,
    })
  }

  return (
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle>New page</DialogTitle>
        <DialogDescription>
          Pick a template, name it, choose a URL. You can edit everything once
          the page is created.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4 pt-2">
        <div className="space-y-2">
          <Label>Template</Label>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {PAGE_TEMPLATES.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => {
                  setTemplateKey(t.key)
                  // Pre-fill slug to the template's default if the
                  // user hasn't typed anything custom.
                  if (!slugInput) setSlugInput(t.defaultSlug.replace(/^\/+/, ""))
                  if (!title) setTitle(t.defaultTitle)
                }}
                className={cn(
                  "flex items-start gap-2 rounded-lg border p-2.5 text-left transition-colors",
                  templateKey === t.key
                    ? "border-primary bg-primary/5"
                    : "border-border bg-card hover:border-primary/40",
                )}
              >
                <span className="text-base" aria-hidden>
                  {t.emoji}
                </span>
                <span className="min-w-0">
                  <span className="block text-[12.5px] font-semibold">{t.title}</span>
                  <span className="line-clamp-2 text-[11px] text-muted-foreground">{t.description}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <Label>Title *</Label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={template?.defaultTitle ?? "About us"}
          />
        </div>
        <div className="space-y-2">
          <Label>URL slug</Label>
          <div className="flex items-stretch gap-0 rounded-md border border-input bg-background focus-within:ring-2 focus-within:ring-ring">
            <span className="inline-flex items-center rounded-l-md border-r border-input bg-muted px-2 py-2 font-mono text-xs text-muted-foreground">
              /p/{tenantSlug}/
            </span>
            <Input
              value={slugInput.replace(/^\/+/, "")}
              onChange={(e) => setSlugInput(e.target.value.toLowerCase().replace(/[^a-z0-9-/]/g, ""))}
              placeholder={(template?.defaultSlug ?? "/your-page").replace(/^\/+/, "")}
              className="rounded-l-none border-0 font-mono text-sm focus-visible:ring-0"
            />
          </div>
          <p className="text-[11px] text-muted-foreground">
            Public URL: <code>{portalUrl(slug)}</code>
            {slugError && <span className="ml-2 font-medium text-destructive">— {slugError}</span>}
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={showInNav}
            onChange={(e) => setShowInNav(e.target.checked)}
          />
          Show in header navigation
        </label>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={create} disabled={!canSave}>Create page</Button>
      </DialogFooter>
    </DialogContent>
  )
}

// ───── Rename / SEO dialog ─────────────────────────────────────────

function RenamePageDialog({
  page,
  existingSlugs,
  tenantSlug,
  portalUrl,
  onClose,
  onSave,
}: {
  page: PortalPage
  existingSlugs: Set<string>
  tenantSlug: string
  portalUrl: (path: string) => string
  onClose: () => void
  onSave: (next: PortalPage) => void
}) {
  const [title, setTitle] = useState(page.title)
  const [slugInput, setSlugInput] = useState(page.slug.replace(/^\/+/, ""))
  const [navLabel, setNavLabel] = useState(page.navLabel ?? "")
  const isHome = page.slug === "/"

  const slug = isHome ? "/" : "/" + slugInput.replace(/^\/+/, "")
  const slugChanged = slug !== page.slug
  const clash = slugChanged && existingSlugs.has(slug)
  const reserved = !isHome && slugChanged && isReservedSlug(slug)
  const slugError = reserved
    ? `That slug is reserved by the platform. Try ${suggestAlternativeSlug(slug)}.`
    : clash
    ? "Slug taken — try another."
    : null
  const canSave = !!title.trim() && !slugError

  return (
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <DialogTitle>Edit page</DialogTitle>
        <DialogDescription>
          Title, URL, and how it appears in the header.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4 pt-2">
        <div className="space-y-2">
          <Label>Title</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>URL slug</Label>
          {isHome ? (
            <p className="rounded-md border border-dashed border-border bg-muted/30 p-2 text-[12px] text-muted-foreground">
              Home page slug is locked to <code className="font-mono">/</code>.
              To change which page is home, use the <strong>Set as home</strong>{" "}
              action on another page.
            </p>
          ) : (
            <>
              <div className="flex items-stretch gap-0 rounded-md border border-input bg-background focus-within:ring-2 focus-within:ring-ring">
                <span className="inline-flex items-center rounded-l-md border-r border-input bg-muted px-2 py-2 font-mono text-xs text-muted-foreground">
                  /p/{tenantSlug}/
                </span>
                <Input
                  value={slugInput.replace(/^\/+/, "")}
                  onChange={(e) =>
                    setSlugInput(e.target.value.toLowerCase().replace(/[^a-z0-9-/]/g, ""))
                  }
                  className="rounded-l-none border-0 font-mono text-sm focus-visible:ring-0"
                />
              </div>
              <p className="text-[11px] text-muted-foreground">
                Public URL: <code>{portalUrl(slug)}</code>
                {slugError && <span className="ml-2 font-medium text-destructive">— {slugError}</span>}
              </p>
              {slugChanged && !slugError && (
                <div className="rounded-md border border-amber-500/40 bg-amber-500/5 px-3 py-2 text-[11px] text-amber-700 dark:text-amber-300">
                  <p className="font-semibold">Changing this URL will break existing links.</p>
                  <p className="mt-0.5">
                    Anywhere you&rsquo;ve shared{" "}
                    <code className="font-mono">{portalUrl(page.slug)}</code>{" "}
                    (emails, Slack, marketing copy) will 404. Re-share the new
                    URL or set up a custom domain on the Domain page.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
        <div className="space-y-2">
          <Label>Nav label</Label>
          <Input
            value={navLabel}
            onChange={(e) => setNavLabel(e.target.value)}
            placeholder={title || "Same as title"}
          />
          <p className="text-[11px] text-muted-foreground">
            Optional — what shows in the header when this page is included in nav.
          </p>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button
          onClick={() =>
            onSave({
              ...page,
              title: title.trim(),
              slug,
              navLabel: navLabel.trim() || undefined,
            })
          }
          disabled={!canSave}
        >
          Save
        </Button>
      </DialogFooter>
    </DialogContent>
  )
}

// PinToCommunityDialog removed — replaced by CrossPosterDialog
// (multi-channel: communities + LinkedIn + X + WhatsApp + email).

// ───── Legal presets ───────────────────────────────────────────────

function LegalPagesDialog({
  onClose,
  onAdd,
  existingSlugs,
  adminEmail,
}: {
  onClose: () => void
  onAdd: (page: PortalPage) => void
  existingSlugs: Set<string>
  adminEmail?: string
}) {
  // Render-time placeholder substitution. Falls back to a visible
  // [YOUR-SUPPORT-EMAIL] marker when no email is set so the section
  // editor can later flag it (Item 20 handles the inline warning on
  // the editor side).
  const applyPlaceholders = (html: string): string => {
    if (!adminEmail) return html
    return html.replace(/\[YOUR-SUPPORT-EMAIL\]/g, adminEmail)
  }
  return (
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle>Add legal pages</DialogTitle>
      </DialogHeader>
      <div className="space-y-2 pt-2">
        <p className="text-sm text-muted-foreground">
          Adds a published page with starter boilerplate you can edit. Your admin email
          {adminEmail ? <> (<code className="rounded bg-muted px-1 font-mono text-[11px]">{adminEmail}</code>)</> : null}{" "}
          is pre-filled wherever the template needs a support contact.{" "}
          {!adminEmail && (
            <span className="font-semibold text-amber-700 dark:text-amber-300">
              Set your support email in <Link href="/dashboard/portal/brand" className="underline">Brand → Identity</Link> first — otherwise the placeholder ships visible.
            </span>
          )}{" "}
          Have a lawyer review before going live.
        </p>
        <div className="grid gap-2">
          {LEGAL_PRESETS.map((preset) => {
            const exists = existingSlugs.has(preset.slug)
            return (
              <div
                key={preset.slug}
                className="flex items-center justify-between gap-3 rounded-md border border-border bg-card p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{preset.title}</p>
                  <p className="text-xs text-muted-foreground">{preset.description}</p>
                  <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">{preset.slug}</p>
                </div>
                {exists ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-success">
                    Added
                  </span>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => {
                      const now = new Date().toISOString()
                      const sections: PortalSection[] = [
                        {
                          id: generatePortalId("sec"),
                          kind: "rich-text",
                          config: { html: applyPlaceholders(preset.body) },
                        },
                      ]
                      onAdd({
                        id: generatePortalId("page"),
                        slug: preset.slug,
                        title: preset.title,
                        status: "published",
                        sections,
                        showInNav: false,
                        navLabel: preset.navLabel,
                        navOrder: 90,
                        createdAt: now,
                        updatedAt: now,
                      })
                    }}
                  >
                    Add
                  </Button>
                )}
              </div>
            )
          })}
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Done</Button>
      </DialogFooter>
    </DialogContent>
  )
}
