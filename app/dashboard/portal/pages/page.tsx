"use client"

// Pages list — every page on the public portal in one place. Add new
// pages (custom + legal presets), edit, set nav order, delete. The
// home page is non-deletable because the portal needs an entry point.

import { useState, useMemo } from "react"
import Link from "next/link"
import {
  ArrowRight,
  Eye,
  EyeOff,
  ExternalLink as ExternalLinkIcon,
  FileText,
  Plus,
  Sparkles,
  Trash2,
  CheckCircle2,
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import {
  usePortal,
  generatePortalId,
  suggestHandle,
  type PortalPage,
} from "@/lib/portal-store"
import { useTenant } from "@/lib/tenant-store"
import { LEGAL_PRESETS } from "@/lib/portal-legal-presets"
import { ProductTour, TakeATourButton, type TourStep } from "@/components/tour/product-tour"
import { useConfirm } from "@/lib/use-confirm"
import { toast } from "sonner"

const PAGES_TOUR: TourStep[] = [
  {
    title: "Every page on your public site",
    body: "Home, About, custom landing pages, legal — everything lives here. Each page is a stack of sections you can drag, drop, and edit.",
    emoji: "📄",
    placement: "center",
  },
  {
    target: "[data-tour='pages-new']",
    title: "Create a new page",
    body: "Pick a title and URL slug. New pages start as drafts; toggle visible when you're ready.",
    emoji: "➕",
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
    body: "Toggle publish, view live, edit content, or delete (home can't be deleted). Click a row to open the section editor.",
    emoji: "🗂️",
    placement: "top",
  },
  {
    title: "Tip: nav inclusion is per-page",
    body: "Each page has a 'Show in nav' toggle. Combine with the Brand → Header navigation panel to decide what appears in your header.",
    emoji: "✨",
    placement: "center",
  },
]

export default function PortalPagesIndex() {
  const { pages, upsertPage, deletePage } = usePortal()
  const { currentTenant } = useTenant()
  const confirm = useConfirm()
  const tenantSlug = currentTenant?.slug ?? ""
  const portalUrl = (path: string) => `/p/${tenantSlug}${path === "/" ? "" : path}`
  const [newOpen, setNewOpen] = useState(false)
  const [legalOpen, setLegalOpen] = useState(false)

  const sorted = useMemo(
    () =>
      pages.slice().sort((a, b) => {
        if (a.slug === "/") return -1
        if (b.slug === "/") return 1
        return (a.navOrder ?? 99) - (b.navOrder ?? 99) || a.title.localeCompare(b.title)
      }),
    [pages],
  )

  const existingSlugs = new Set(pages.map((p) => p.slug))

  return (
    <div className="space-y-6">
      <ProductTour tourId="portal-pages-v1" steps={PAGES_TOUR} />
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
          <TakeATourButton tourId="portal-pages-v1" />
          <Button variant="outline" onClick={() => setLegalOpen(true)} data-tour="pages-legal">
            <Sparkles className="mr-1.5 h-4 w-4" /> Add legal pages
          </Button>
          <Button onClick={() => setNewOpen(true)} data-tour="pages-new">
            <Plus className="mr-1.5 h-4 w-4" /> New page
          </Button>
        </div>
      </div>

      <div className="divide-y divide-border rounded-lg border border-border" data-tour="pages-list">
        {sorted.map((p) => (
          <div key={p.id} className="flex items-center gap-3 px-4 py-3">
            <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <Link
                href={`/dashboard/portal/pages/${encodeURIComponent(p.slug)}`}
                className="block font-medium hover:text-primary"
              >
                {p.title}
              </Link>
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
            <span className="text-[11px] text-muted-foreground">{p.sections.length} sections</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                upsertPage({
                  ...p,
                  status: p.status === "published" ? "draft" : "published",
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
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/dashboard/portal/pages/${encodeURIComponent(p.slug)}`}>
                Edit <ArrowRight className="ml-1 h-3 w-3" />
              </Link>
            </Button>
            {p.slug !== "/" && (
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={async () => {
                  const ok = await confirm({
                    title: `Delete the "${p.title}" page?`,
                    description: "Moved to Trash — you can restore it within 7 days.",
                    destructive: true,
                  })
                  if (!ok) return
                  deletePage(p.id)
                  toast.success(`Deleted "${p.title}".`, { description: "Restore from Trash within 7 days." })
                }}
                title="Delete page"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        ))}
      </div>

      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <NewPageDialog
          onClose={() => setNewOpen(false)}
          existingSlugs={existingSlugs}
          tenantSlug={tenantSlug}
          portalUrl={portalUrl}
          onCreate={(p) => {
            upsertPage(p)
            setNewOpen(false)
          }}
        />
      </Dialog>

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
  const [title, setTitle] = useState("")
  const [slugInput, setSlugInput] = useState("")
  const [showInNav, setShowInNav] = useState(true)
  const slug = "/" + (slugInput || suggestHandle(title || "new-page")).replace(/^\/+/, "")
  const slugClash = existingSlugs.has(slug)
  const canSave = !!title.trim() && !!slug && !slugClash

  const create = () => {
    const now = new Date().toISOString()
    onCreate({
      id: generatePortalId("page"),
      slug,
      title: title.trim(),
      status: "draft",
      sections: [
        {
          id: generatePortalId("sec"),
          kind: "rich-text",
          config: {
            html: `<h1>${escapeHtml(title.trim())}</h1><p>Edit this page from the Pages list.</p>`,
          },
        },
      ],
      showInNav,
      navLabel: title.trim(),
      navOrder: 99,
      createdAt: now,
      updatedAt: now,
    })
  }

  return (
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <DialogTitle>New page</DialogTitle>
      </DialogHeader>
      <div className="space-y-4 pt-2">
        <div className="space-y-2">
          <Label>Title *</Label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="About us"
          />
        </div>
        <div className="space-y-2">
          <Label>URL slug</Label>
          <div className="flex items-stretch gap-0 rounded-md border border-input bg-background focus-within:ring-2 focus-within:ring-ring">
            {/* Workspace prefix is the immovable part of every portal
                URL — locking it here so the teacher can't accidentally
                type the tenant slug into the editable field and break
                routing. Editing happens to the right of the slash. */}
            <span className="inline-flex items-center rounded-l-md border-r border-input bg-muted px-2 py-2 font-mono text-xs text-muted-foreground">
              /p/{tenantSlug}/
            </span>
            <Input
              value={slugInput.replace(/^\/+/, "")}
              onChange={(e) => setSlugInput(e.target.value.toLowerCase().replace(/[^a-z0-9-/]/g, ""))}
              placeholder={suggestHandle(title || "your-page").replace(/^\/+/, "")}
              className="rounded-l-none border-0 font-mono text-sm focus-visible:ring-0"
            />
          </div>
          <p className="text-[11px] text-muted-foreground">
            Public URL: <code>{portalUrl(slug)}</code>
            {slugClash && <span className="ml-2 font-medium text-destructive">— slug taken.</span>}
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
  // Replace the [YOUR-SUPPORT-EMAIL] placeholder with the actual
  // workspace owner email (set during signup, lives on the tenant
  // record). If the owner email is missing for any reason, we leave
  // the placeholder visible so the teacher knows to fill it in.
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
          is pre-filled wherever the template needs a support contact. Have a lawyer review before going live.
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
                    <CheckCircle2 className="h-3 w-3" /> Added
                  </span>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => {
                      const now = new Date().toISOString()
                      onAdd({
                        id: generatePortalId("page"),
                        slug: preset.slug,
                        title: preset.title,
                        status: "published",
                        sections: [
                          {
                            id: generatePortalId("sec"),
                            kind: "rich-text",
                            config: { html: applyPlaceholders(preset.body) },
                          },
                        ],
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

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}
