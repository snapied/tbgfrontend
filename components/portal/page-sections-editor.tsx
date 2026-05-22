"use client"

// Generic page-sections editor — works for any portal page, not just
// the home page. The /dashboard/portal/home route is a thin wrapper
// around this; the /dashboard/portal/pages/[id] route reuses it for
// legal pages, custom pages, anything.
//
// Layout: vertical list of section cards on the left, live iframe of
// the actual page on the right. Each section card has the fields
// relevant to its kind, plus reorder up/down, show/hide, and delete.

import { useMemo, useState } from "react"
import {
  ArrowDown,
  ArrowUp,
  Eye,
  EyeOff,
  GripVertical,
  Plus,
  Sparkles,
  Trash2,
  ChevronDown,
  ChevronRight,
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
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { Lock } from "lucide-react"
import Link from "next/link"
import { usePlan } from "@/lib/use-plan"
import type { PlanLimits } from "@/lib/plans"
import { ThumbnailField } from "@/components/upload/thumbnail-field"
import { RichTextEditor } from "@/components/editor/rich-text-editor"
import { PortalLivePreview } from "@/components/portal/portal-live-preview"
import {
  usePortal,
  generatePortalId,
  type PortalPage,
  type PortalSection,
  type SectionKind,
} from "@/lib/portal-store"
import { useTenant } from "@/lib/tenant-store"
import { useConfirm } from "@/lib/use-confirm"
import { toast } from "sonner"

const SECTION_LABELS: Record<SectionKind, { label: string; emoji: string; description: string }> = {
  hero: { label: "Hero", emoji: "🎯", description: "Big headline, sub-heading, CTAs at the top of the page." },
  features: { label: "Features", emoji: "✨", description: "3-column grid of selling points." },
  "courses-grid": { label: "Courses", emoji: "📚", description: "A grid of your courses." },
  "store-grid": { label: "Shop", emoji: "🛍️", description: "Digital products: downloads, 1-on-1s, memberships." },
  testimonials: { label: "Testimonials", emoji: "💬", description: "Student quotes." },
  faculty: { label: "Faculty", emoji: "👥", description: "Your team showcase." },
  cta: { label: "Call to action", emoji: "👉", description: "Big push to enroll/contact." },
  "rich-text": { label: "Rich text", emoji: "📝", description: "Free-form copy in your own words." },
  faq: { label: "FAQ", emoji: "❓", description: "Common questions, expandable." },
  stats: { label: "Stats", emoji: "📈", description: "By-the-numbers row." },
  "contact-form": { label: "Contact form", emoji: "✉️", description: "Lead capture form." },
  "blog-teaser": { label: "Blog posts", emoji: "📰", description: "Latest posts from your blog." },
  video: { label: "Video", emoji: "▶️", description: "Embedded YouTube/Vimeo/MP4." },
  "image-gallery": { label: "Gallery", emoji: "🖼️", description: "Grid of photos." },
  "logos-strip": { label: "Logos", emoji: "🏢", description: "Trusted-by logo row." },
}

interface PageSectionsEditorProps {
  // Page slug to edit ("/" for home, "/about", "/privacy", etc.).
  slug: string
  // Chip label above the H1 (e.g. "Home page content", "Privacy policy").
  eyebrow?: string
  // H1 text.
  title?: string
  // Sub-headline copy.
  description?: string
  // If true, "no such page" shows a hint with the slug. Otherwise the
  // editor renders nothing — the parent route handles the not-found
  // case (typically by offering to create the page).
  showMissingHint?: boolean
  // Optional extra action button to place next to "Add section" (e.g. Tour button).
  headerAction?: React.ReactNode
}

export function PageSectionsEditor({
  slug,
  eyebrow = "Page content",
  title = "Edit page",
  description = "Drop sections in, reorder them, hide the ones you're not using. Changes save automatically and the preview refreshes itself.",
  showMissingHint = true,
  headerAction,
}: PageSectionsEditorProps) {
  const { pages, upsertPage } = usePortal()
  const { currentTenant } = useTenant()
  const tenantSlug = currentTenant?.slug ?? ""
  const page = useMemo(() => pages.find((p) => p.slug === slug), [pages, slug])
  const [openSectionId, setOpenSectionId] = useState<string | null>(null)
  const confirm = useConfirm()

  // Friendly label per section kind — shown in the confirm dialog
  // ("Remove the Hero section?") so the teacher knows exactly what
  // they're about to drop. Falls back to the raw kind string for any
  // kind we haven't labelled yet.
  const sectionLabel = (kind: SectionKind): string =>
    SECTION_LABELS[kind]?.label ?? kind

  if (!page) {
    if (!showMissingHint) return null
    return (
      <div className="rounded-md border border-dashed border-border p-6 text-sm text-muted-foreground">
        No page found at <code className="rounded bg-muted px-1.5 font-mono text-xs">{slug}</code>.
      </div>
    )
  }

  const persist = (next: PortalPage) => upsertPage(next)

  const updateSection = (id: string, patch: Partial<PortalSection>) => {
    persist({
      ...page,
      sections: page.sections.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    })
  }
  const updateSectionConfig = (id: string, configPatch: Record<string, unknown>) => {
    persist({
      ...page,
      sections: page.sections.map((s) =>
        s.id === id ? { ...s, config: { ...s.config, ...configPatch } } : s,
      ),
    })
  }
  const moveSection = (id: string, dir: -1 | 1) => {
    const idx = page.sections.findIndex((s) => s.id === id)
    if (idx === -1) return
    const next = idx + dir
    if (next < 0 || next >= page.sections.length) return
    const arr = page.sections.slice()
    const [m] = arr.splice(idx, 1)
    arr.splice(next, 0, m)
    persist({ ...page, sections: arr })
  }
  const deleteSection = async (id: string) => {
    const target = page.sections.find((s) => s.id === id)
    if (!target) return
    const label = sectionLabel(target.kind)
    const ok = await confirm({
      title: `Remove the ${label} section?`,
      description:
        "It comes off this page immediately. Re-add it from the section picker if you change your mind.",
      destructive: true,
      confirmLabel: "Remove",
    })
    if (!ok) return
    persist({ ...page, sections: page.sections.filter((s) => s.id !== id) })
    // Also close the side drawer if it was open on the section we just
    // removed — otherwise it'd render against a gone section.
    setOpenSectionId((cur) => (cur === id ? null : cur))
    toast.success(`Removed the ${label} section.`)
  }
  const addSection = (kind: SectionKind) => {
    const s: PortalSection = {
      id: generatePortalId("sec"),
      kind,
      config: defaultConfigFor(kind),
    }
    persist({ ...page, sections: [...page.sections, s] })
    setOpenSectionId(s.id)
  }

  // Live preview opens the page being edited, not always the home.
  const previewPath = slug

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            {eyebrow}
          </div>
          <h1 className="mt-3 font-serif text-2xl font-bold tracking-tight">{title}</h1>
          <p className="text-muted-foreground">{description}</p>
        </div>
        <div className="flex items-center gap-3">
          {headerAction}
          <div data-tour="add-section">
            <AddSectionMenu onPick={addSection} />
          </div>
        </div>
      </div>

      {/* Two-column: editor / preview */}
      <div className="grid gap-6 lg:grid-cols-[1fr_560px]">
        {/* Left: sections list */}
        <div className="space-y-3" data-tour="sections-list">
          {page.sections.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <p className="text-sm text-muted-foreground">No sections yet.</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Add a hero, features, or CTA to get started.
                </p>
                <div className="mt-4">
                  <AddSectionMenu onPick={addSection} />
                </div>
              </CardContent>
            </Card>
          ) : (
            page.sections.map((section, idx) => {
              const meta = SECTION_LABELS[section.kind]
              const expanded = openSectionId === section.id
              return (
                <Card key={section.id} className={cn(section.hidden && "opacity-60")}>
                  <CardHeader
                    className="cursor-pointer py-3"
                    onClick={() => setOpenSectionId(expanded ? null : section.id)}
                  >
                    <div className="flex items-center gap-3">
                      <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="text-lg">{meta?.emoji ?? "📄"}</span>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold">
                          {meta?.label ?? section.kind}
                          {section.hidden && (
                            <span className="ml-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                              Hidden
                            </span>
                          )}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {sectionSummary(section)}
                        </p>
                      </div>
                      <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={idx === 0}
                          onClick={() => moveSection(section.id, -1)}
                          title="Move up"
                        >
                          <ArrowUp className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={idx === page.sections.length - 1}
                          onClick={() => moveSection(section.id, 1)}
                          title="Move down"
                        >
                          <ArrowDown className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => updateSection(section.id, { hidden: !section.hidden })}
                          title={section.hidden ? "Show" : "Hide"}
                        >
                          {section.hidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => deleteSection(section.id)}
                          title="Delete section"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                        {expanded ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  {expanded && (
                    <CardContent className="border-t border-border pt-4">
                      <SectionEditor
                        section={section}
                        tenantSlug={tenantSlug}
                        onChange={(patch) => updateSectionConfig(section.id, patch)}
                      />
                    </CardContent>
                  )}
                </Card>
              )
            })
          )}
        </div>

        {/* Right: live preview */}
        <div className="lg:sticky lg:top-6 lg:self-start" data-tour="live-preview">
          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle>Live preview</CardTitle>
              <CardDescription>
                Updates a moment after each edit. Toggle devices in the iframe chrome.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {tenantSlug ? (
                <PortalLivePreview tenant={tenantSlug} path={previewPath} height={620} />
              ) : (
                <p className="text-sm text-muted-foreground">Tenant loading…</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// Add-section menu
// ============================================================

// Section kinds that require a paid plan. Picking one of these on a
// Starter workspace renders the tile as locked (lock icon + upgrade
// hint) instead of letting the admin add it. Keeps the section
// editor honest with the Lead Inbox + marketing-toolkit gating —
// otherwise Starter could collect leads but couldn't read them.
const SECTION_PLAN_GATE: Partial<Record<SectionKind, keyof PlanLimits>> = {
  "contact-form": "marketingTools",
}

function AddSectionMenu({ onPick }: { onPick: (kind: SectionKind) => void }) {
  const [open, setOpen] = useState(false)
  const { isAllowed } = usePlan()
  const kinds: SectionKind[] = [
    "hero", "features", "courses-grid", "store-grid", "testimonials", "faculty",
    "cta", "rich-text", "faq", "stats", "contact-form",
    "blog-teaser", "video", "image-gallery", "logos-strip",
  ]
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-1.5 h-4 w-4" /> Add section
        </Button>
      </DialogTrigger>
      {/* Wider dialog so 2-column tiles get room to breathe + the
          whole list fits without a scrollbar. Tiles are tight rows
          (emoji left, label/desc right) so 15 kinds stack into 8
          rows that fit on a 720px-tall viewport. */}
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Pick a section</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-2 pt-1 sm:grid-cols-2">
          {kinds.map((k) => {
            const meta = SECTION_LABELS[k]
            const gateFeature = SECTION_PLAN_GATE[k]
            const locked = gateFeature ? !isAllowed(gateFeature) : false
            if (locked) {
              return (
                <Link
                  key={k}
                  href="/dashboard/billing"
                  onClick={() => setOpen(false)}
                  className="group flex cursor-pointer items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-left transition hover:-translate-y-0.5 hover:border-amber-500 hover:shadow-md"
                  title="Paid feature — click to upgrade"
                >
                  <span className="text-xl leading-none opacity-60">{meta.emoji}</span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-sm font-semibold leading-tight">{meta.label}</span>
                      <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">
                        <Lock className="h-2.5 w-2.5" />
                        Pro+
                      </span>
                    </span>
                    <span className="mt-0.5 block truncate text-xs leading-snug text-muted-foreground">
                      {meta.description}
                    </span>
                  </span>
                </Link>
              )
            }
            return (
              <button
                key={k}
                type="button"
                onClick={() => {
                  onPick(k)
                  setOpen(false)
                }}
                className="group flex items-start gap-3 rounded-lg border border-border bg-card p-3 text-left transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
              >
                <span className="text-xl leading-none">{meta.emoji}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold leading-tight">{meta.label}</span>
                  <span className="mt-0.5 block truncate text-xs leading-snug text-muted-foreground">
                    {meta.description}
                  </span>
                </span>
              </button>
            )
          })}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================
// Section editor — dispatches by kind
// ============================================================

function SectionEditor({
  section,
  tenantSlug,
  onChange,
}: {
  section: PortalSection
  tenantSlug: string
  onChange: (patch: Record<string, unknown>) => void
}) {
  const c = section.config
  const str = (k: string, fb = "") => (typeof c[k] === "string" ? (c[k] as string) : fb)
  const num = (k: string, fb = 0) => (typeof c[k] === "number" ? (c[k] as number) : fb)
  const obj = (k: string) => (typeof c[k] === "object" && c[k] ? (c[k] as Record<string, unknown>) : {})

  switch (section.kind) {
    case "hero": {
      const primary = obj("primaryCta") as { label?: string; href?: string }
      const secondary = obj("secondaryCta") as { label?: string; href?: string }
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Eyebrow (small label above headline)</Label>
            <Input
              value={str("eyebrow")}
              onChange={(e) => onChange({ eyebrow: e.target.value })}
              placeholder="Welcome"
              maxLength={40}
            />
          </div>
          <div className="space-y-2">
            <Label>Headline</Label>
            <Textarea
              value={str("headline")}
              onChange={(e) => onChange({ headline: e.target.value })}
              placeholder="A line that sells the dream"
              rows={2}
              maxLength={140}
            />
          </div>
          <div className="space-y-2">
            <Label>Sub-heading</Label>
            <Textarea
              value={str("subhead")}
              onChange={(e) => onChange({ subhead: e.target.value })}
              placeholder="One or two lines that explain who it's for and what they'll get."
              rows={3}
              maxLength={300}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Primary CTA label</Label>
              <Input
                value={primary.label ?? ""}
                onChange={(e) => onChange({ primaryCta: { ...primary, label: e.target.value } })}
                placeholder="Browse courses"
              />
            </div>
            <div className="space-y-2">
              <Label>Primary CTA link</Label>
              <TenantPrefixInput
                tenantSlug={tenantSlug}
                value={primary.href ?? ""}
                onChange={(href) => onChange({ primaryCta: { ...primary, href } })}
                placeholder="courses"
              />
            </div>
            <div className="space-y-2">
              <Label>Secondary CTA label</Label>
              <Input
                value={secondary.label ?? ""}
                onChange={(e) => onChange({ secondaryCta: { ...secondary, label: e.target.value } })}
                placeholder="Meet Your instructor"
              />
            </div>
            <div className="space-y-2">
              <Label>Secondary CTA link</Label>
              <TenantPrefixInput
                tenantSlug={tenantSlug}
                value={secondary.href ?? ""}
                onChange={(href) => onChange({ secondaryCta: { ...secondary, href } })}
                placeholder="teachers"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Background image (optional)</Label>
            <ThumbnailField
              value={str("backgroundImage")}
              onChange={(url) => onChange({ backgroundImage: url || undefined })}
              compress={{ maxDim: 2000, quality: 0.82, mime: "image/jpeg" }}
            />
            <p className="text-[11px] text-muted-foreground">
              When set, the gradient is replaced with this image and overlaid for legibility.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Alignment</Label>
              <Select
                value={str("alignment", "center")}
                onValueChange={(v) => onChange({ alignment: v })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="center">Center</SelectItem>
                  <SelectItem value="left">Left</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {str("backgroundImage") && (
              <div className="space-y-2">
                <Label>Overlay darkness</Label>
                <Input
                  type="number"
                  min={0}
                  max={1}
                  step={0.05}
                  value={num("overlayOpacity", 0.55)}
                  onChange={(e) => onChange({ overlayOpacity: Number(e.target.value) })}
                />
                <p className="text-[11px] text-muted-foreground">0 = no overlay, 1 = solid black.</p>
              </div>
            )}
          </div>
        </div>
      )
    }
    case "features": {
      const items = ((c.items as Array<{ title?: string; body?: string }>) ?? [])
      const setItems = (next: typeof items) => onChange({ items: next })
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Section heading</Label>
            <Input
              value={str("heading")}
              onChange={(e) => onChange({ heading: e.target.value })}
              placeholder="Why learn here"
            />
          </div>
          <div className="space-y-2">
            <Label>Sub-heading</Label>
            <Input
              value={str("subhead")}
              onChange={(e) => onChange({ subhead: e.target.value })}
              placeholder="Optional"
            />
          </div>
          <div className="space-y-2">
            <Label>Features</Label>
            {items.map((it, i) => (
              <Card key={i}>
                <CardContent className="space-y-2 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-muted-foreground">Feature {i + 1}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setItems(items.filter((_, j) => j !== i))}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                  <Input
                    value={it.title ?? ""}
                    onChange={(e) => setItems(items.map((x, j) => j === i ? { ...x, title: e.target.value } : x))}
                    placeholder="Feature title"
                  />
                  <Textarea
                    value={it.body ?? ""}
                    onChange={(e) => setItems(items.map((x, j) => j === i ? { ...x, body: e.target.value } : x))}
                    placeholder="One or two lines explaining the benefit."
                    rows={2}
                  />
                </CardContent>
              </Card>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setItems([...items, { title: "New feature", body: "" }])}
            >
              <Plus className="mr-1 h-3.5 w-3.5" /> Add feature
            </Button>
          </div>
        </div>
      )
    }
    case "store-grid":
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Heading</Label>
            <Input
              value={str("heading", "Shop")}
              onChange={(e) => onChange({ heading: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Sub-heading</Label>
            <Input
              value={str("subhead")}
              onChange={(e) => onChange({ subhead: e.target.value })}
              placeholder="Optional"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Show</Label>
              <Select
                value={str("kind", "all")}
                onValueChange={(v) => onChange({ kind: v })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All product types</SelectItem>
                  <SelectItem value="course">Course access</SelectItem>
                  <SelectItem value="download">Digital downloads</SelectItem>
                  <SelectItem value="session">1-on-1 sessions</SelectItem>
                  <SelectItem value="webinar">Paid webinars</SelectItem>
                  <SelectItem value="membership">Memberships</SelectItem>
                  <SelectItem value="bundle">Bundles</SelectItem>
                  <SelectItem value="license">Licenses</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Limit</Label>
              <Input
                type="number"
                min={1}
                max={24}
                value={num("limit", 6)}
                onChange={(e) => onChange({ limit: Math.max(1, Number(e.target.value)) })}
              />
            </div>
          </div>
        </div>
      )
    case "courses-grid":
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Heading</Label>
            <Input
              value={str("heading", "Courses")}
              onChange={(e) => onChange({ heading: e.target.value })}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Show</Label>
              <Select
                value={str("mode", "popular")}
                onValueChange={(v) => onChange({ mode: v })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="popular">Most popular</SelectItem>
                  <SelectItem value="featured">Top rated</SelectItem>
                  <SelectItem value="all">All courses</SelectItem>
                  <SelectItem value="by-category">By category</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Limit</Label>
              <Input
                type="number"
                min={1}
                max={24}
                value={num("limit", 6)}
                onChange={(e) => onChange({ limit: Math.max(1, Number(e.target.value)) })}
              />
            </div>
          </div>
          {str("mode") === "by-category" && (
            <div className="space-y-2">
              <Label>Category</Label>
              <Input
                value={str("category")}
                onChange={(e) => onChange({ category: e.target.value })}
                placeholder="e.g. Web Development"
              />
            </div>
          )}
        </div>
      )
    case "testimonials":
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Heading</Label>
            <Input
              value={str("heading", "What students say")}
              onChange={(e) => onChange({ heading: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Show</Label>
            <Select
              value={str("source", "featured")}
              onValueChange={(v) => onChange({ source: v })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="featured">Featured only</SelectItem>
                <SelectItem value="all">All testimonials</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )
    case "faculty":
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Heading</Label>
            <Input
              value={str("heading", "Meet the team")}
              onChange={(e) => onChange({ heading: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Members</Label>
            <Select
              value={str("members", "all")}
              onValueChange={(v) => onChange({ members: v })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All faculty</SelectItem>
                <SelectItem value="hand-picked">Hand-picked (set IDs in JSON)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )
    case "cta": {
      const primary = obj("primaryCta") as { label?: string; href?: string }
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Headline</Label>
            <Input
              value={str("headline", "Ready to start?")}
              onChange={(e) => onChange({ headline: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Sub-heading</Label>
            <Input
              value={str("subhead")}
              onChange={(e) => onChange({ subhead: e.target.value })}
              placeholder="Optional"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Button label</Label>
              <Input
                value={primary.label ?? ""}
                onChange={(e) => onChange({ primaryCta: { ...primary, label: e.target.value } })}
                placeholder="Get started"
              />
            </div>
            <div className="space-y-2">
              <Label>Button link</Label>
              <TenantPrefixInput
                tenantSlug={tenantSlug}
                value={primary.href ?? ""}
                onChange={(href) => onChange({ primaryCta: { ...primary, href } })}
                placeholder="courses"
              />
            </div>
          </div>
        </div>
      )
    }
    case "rich-text":
      return (
        <div className="space-y-2">
          <Label>Content</Label>
          <RichTextEditor
            value={str("html")}
            onChange={(html) => onChange({ html })}
            placeholder="Write whatever you like — formatted text, lists, links, images, videos."
            minHeight={200}
          />
        </div>
      )
    case "faq": {
      const items = ((c.items as Array<{ q?: string; a?: string }>) ?? [])
      const setItems = (next: typeof items) => onChange({ items: next })
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Heading</Label>
            <Input
              value={str("heading", "Frequently asked")}
              onChange={(e) => onChange({ heading: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Questions</Label>
            {items.map((it, i) => (
              <Card key={i}>
                <CardContent className="space-y-2 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-muted-foreground">Q{i + 1}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setItems(items.filter((_, j) => j !== i))}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                  <Input
                    value={it.q ?? ""}
                    onChange={(e) => setItems(items.map((x, j) => j === i ? { ...x, q: e.target.value } : x))}
                    placeholder="Question"
                  />
                  <Textarea
                    value={it.a ?? ""}
                    onChange={(e) => setItems(items.map((x, j) => j === i ? { ...x, a: e.target.value } : x))}
                    placeholder="Answer"
                    rows={3}
                  />
                </CardContent>
              </Card>
            ))}
            <Button variant="outline" size="sm" onClick={() => setItems([...items, { q: "New question", a: "" }])}>
              <Plus className="mr-1 h-3.5 w-3.5" /> Add question
            </Button>
          </div>
        </div>
      )
    }
    case "stats": {
      const items = ((c.items as Array<{ value?: string; label?: string }>) ?? [])
      const setItems = (next: typeof items) => onChange({ items: next })
      return (
        <div className="space-y-2">
          <Label>Stats</Label>
          {items.map((it, i) => (
            <div key={i} className="flex gap-2">
              <Input
                value={it.value ?? ""}
                onChange={(e) => setItems(items.map((x, j) => j === i ? { ...x, value: e.target.value } : x))}
                placeholder="10k+"
                className="w-28"
              />
              <Input
                value={it.label ?? ""}
                onChange={(e) => setItems(items.map((x, j) => j === i ? { ...x, label: e.target.value } : x))}
                placeholder="Students taught"
              />
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => setItems(items.filter((_, j) => j !== i))}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={() => setItems([...items, { value: "0", label: "" }])}>
            <Plus className="mr-1 h-3.5 w-3.5" /> Add stat
          </Button>
        </div>
      )
    }
    case "contact-form":
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Heading</Label>
            <Input
              value={str("heading", "Send a message")}
              onChange={(e) => onChange({ heading: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Success message</Label>
            <Input
              value={str("successMessage")}
              onChange={(e) => onChange({ successMessage: e.target.value })}
              placeholder="Thanks — we'll be in touch."
            />
          </div>
        </div>
      )
    case "blog-teaser":
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Heading</Label>
            <Input
              value={str("heading", "From the blog")}
              onChange={(e) => onChange({ heading: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Number of posts</Label>
            <Input
              type="number"
              min={1}
              max={12}
              value={num("limit", 3)}
              onChange={(e) => onChange({ limit: Math.max(1, Number(e.target.value)) })}
              className="w-32"
            />
          </div>
        </div>
      )
    case "video":
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Video URL</Label>
            <Input
              value={str("source")}
              onChange={(e) => onChange({ source: e.target.value })}
              placeholder="https://youtube.com/watch?v=…  or  https://vimeo.com/…"
            />
          </div>
          <div className="space-y-2">
            <Label>Title (above the video)</Label>
            <Input
              value={str("title")}
              onChange={(e) => onChange({ title: e.target.value })}
              placeholder="Optional"
            />
          </div>
          <div className="space-y-2">
            <Label>Caption (below the video)</Label>
            <Input
              value={str("caption")}
              onChange={(e) => onChange({ caption: e.target.value })}
              placeholder="Optional"
            />
          </div>
        </div>
      )
    case "image-gallery": {
      const images = ((c.images as Array<{ url?: string; caption?: string }>) ?? [])
      const setImages = (next: typeof images) => onChange({ images: next })
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Heading</Label>
            <Input
              value={str("heading")}
              onChange={(e) => onChange({ heading: e.target.value })}
              placeholder="Optional"
            />
          </div>
          <div className="space-y-2">
            <Label>Images</Label>
            {images.map((img, i) => (
              <div key={i} className="flex items-start gap-2">
                <div className="flex-1">
                  <ThumbnailField
                    value={img.url ?? ""}
                    onChange={(url) => setImages(images.map((x, j) => j === i ? { ...x, url } : x))}
                    compress={{ maxDim: 1600, quality: 0.82, mime: "image/jpeg" }}
                  />
                  <Input
                    className="mt-1.5"
                    value={img.caption ?? ""}
                    onChange={(e) => setImages(images.map((x, j) => j === i ? { ...x, caption: e.target.value } : x))}
                    placeholder="Caption (optional)"
                  />
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setImages(images.filter((_, j) => j !== i))}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => setImages([...images, { url: "", caption: "" }])}>
              <Plus className="mr-1 h-3.5 w-3.5" /> Add image
            </Button>
          </div>
        </div>
      )
    }
    case "logos-strip": {
      const logos = ((c.logos as Array<{ url?: string; alt?: string }>) ?? [])
      const setLogos = (next: typeof logos) => onChange({ logos: next })
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Heading (e.g. "Trusted by")</Label>
            <Input
              value={str("heading")}
              onChange={(e) => onChange({ heading: e.target.value })}
              placeholder="Optional"
            />
          </div>
          <div className="space-y-2">
            <Label>Logos</Label>
            {logos.map((l, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input
                  value={l.url ?? ""}
                  onChange={(e) => setLogos(logos.map((x, j) => j === i ? { ...x, url: e.target.value } : x))}
                  placeholder="Logo URL"
                />
                <Input
                  value={l.alt ?? ""}
                  onChange={(e) => setLogos(logos.map((x, j) => j === i ? { ...x, alt: e.target.value } : x))}
                  placeholder="Alt text"
                  className="w-40"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setLogos(logos.filter((_, j) => j !== i))}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => setLogos([...logos, { url: "", alt: "" }])}>
              <Plus className="mr-1 h-3.5 w-3.5" /> Add logo
            </Button>
          </div>
        </div>
      )
    }
    default:
      return (
        <p className="text-sm text-muted-foreground">
          No editor yet for <code>{section.kind}</code>. Edit via JSON for now.
        </p>
      )
  }
}

// ============================================================
// Helpers
// ============================================================

function sectionSummary(s: PortalSection): string {
  const c = s.config
  const str = (k: string) => (typeof c[k] === "string" ? (c[k] as string) : "")
  switch (s.kind) {
    case "hero": return str("headline") || str("eyebrow") || "—"
    case "features": return str("heading") || `${((c.items as unknown[]) ?? []).length} items`
    case "courses-grid": return `${str("heading")} · ${str("mode") || "popular"}`
    case "store-grid": return `${str("heading") || "Shop"} · ${str("kind") || "all products"}`
    case "testimonials": return str("heading") || "Student quotes"
    case "faculty": return str("heading") || "Faculty"
    case "cta": return str("headline") || "Call to action"
    case "rich-text": {
      const html = str("html")
      return html.replace(/<[^>]+>/g, "").slice(0, 80) || "Empty"
    }
    case "faq": return `${((c.items as unknown[]) ?? []).length} questions`
    case "stats": return `${((c.items as unknown[]) ?? []).length} stats`
    case "contact-form": return str("heading") || "Contact form"
    case "blog-teaser": return str("heading") || "Blog teaser"
    case "video": return str("title") || str("source") || "Video"
    case "image-gallery": return `${((c.images as unknown[]) ?? []).length} images`
    case "logos-strip": return `${((c.logos as unknown[]) ?? []).length} logos`
    default: return s.kind
  }
}

function defaultConfigFor(kind: SectionKind): Record<string, unknown> {
  switch (kind) {
    case "hero":
      return {
        eyebrow: "Welcome",
        headline: "A line that sells the dream",
        subhead: "What you teach, who it's for, why it matters.",
        primaryCta: { label: "Browse courses", href: "/courses" },
        alignment: "center",
      }
    case "features":
      return {
        heading: "Why learn here",
        items: [
          { title: "Feature 1", body: "What's great about it." },
          { title: "Feature 2", body: "What's great about it." },
          { title: "Feature 3", body: "What's great about it." },
        ],
      }
    case "courses-grid":
      return { heading: "Courses", mode: "popular", limit: 6 }
    case "store-grid":
      return { heading: "Shop", subhead: "Courses, downloads, 1-on-1s, memberships.", kind: "all", limit: 6 }
    case "testimonials":
      return { heading: "What students say", source: "featured" }
    case "faculty":
      return { heading: "Meet the team", members: "all" }
    case "cta":
      return {
        headline: "Ready to start?",
        subhead: "",
        primaryCta: { label: "Get started", href: "/courses" },
      }
    case "rich-text":
      return { html: "<p>Edit this block — formatted text, links, images, videos all work.</p>" }
    case "faq":
      return {
        heading: "Frequently asked",
        items: [{ q: "Question?", a: "Answer." }],
      }
    case "stats":
      return {
        items: [
          { value: "10k+", label: "Students" },
          { value: "120+", label: "Hours of content" },
          { value: "4.8★", label: "Avg. rating" },
        ],
      }
    case "contact-form":
      return {
        heading: "Send a message",
        fields: ["name", "email", "phone", "message"],
        successMessage: "Thanks — we'll be in touch.",
      }
    case "blog-teaser":
      return { heading: "From the blog", limit: 3 }
    case "video":
      return { source: "", title: "", caption: "" }
    case "image-gallery":
      return { heading: "", images: [] }
    case "logos-strip":
      return { heading: "Trusted by", logos: [] }
    default:
      return {}
  }
}

// Locked-prefix URL input for CTA links inside section configs. The
// `/p/<tenantSlug>/` portion is rendered as a non-editable chip so a
// teacher can't accidentally type the tenant slug into the editable
// half and break routing. Stores the bare relative slug ("/courses")
// in the section config — the public site-header's `scopeHref` adds
// the prefix at render time, so existing data stays compatible.
function TenantPrefixInput({
  tenantSlug,
  value,
  onChange,
  placeholder,
}: {
  tenantSlug: string
  value: string
  onChange: (next: string) => void
  placeholder?: string
}) {
  // Strip a leading `/p/<slug>/` if the teacher previously saved one,
  // and a leading `/` so what they type lives cleanly to the right of
  // the chip.
  const stripped = (() => {
    let v = value ?? ""
    if (tenantSlug) {
      const prefix = `/p/${tenantSlug}/`
      if (v.startsWith(prefix)) v = v.slice(prefix.length - 1)
    }
    return v.replace(/^\/+/, "")
  })()
  return (
    <div className="flex items-stretch gap-0 rounded-md border border-input bg-background focus-within:ring-2 focus-within:ring-ring">
      <span className="inline-flex items-center rounded-l-md border-r border-input bg-muted px-2 py-2 font-mono text-xs text-muted-foreground">
        /p/{tenantSlug || "tenant"}/
      </span>
      <Input
        value={stripped}
        onChange={(e) => {
          const cleaned = e.target.value.replace(/^\/+/, "")
          onChange(cleaned ? `/${cleaned}` : "")
        }}
        placeholder={placeholder}
        className="rounded-l-none border-0 font-mono text-sm focus-visible:ring-0"
      />
    </div>
  )
}
