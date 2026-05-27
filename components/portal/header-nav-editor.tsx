"use client"

// Header navigation editor — manages the items + CTAs that show up
// in the public site's header. Two modes:
//
//   1. Auto (default): nav is auto-built from pages with showInNav=true,
//      plus optional Courses / Instructors / Blog tiles.
//   2. Curated: explicit list of nav items the teacher set themselves.
//
// CTAs (primary + secondary) work in both modes — they live to the
// right of the nav and are great for "Enroll" / "Book a call" / "Sign
// in" actions.

import { ArrowDown, ArrowUp, Plus, Trash2, Sparkles, FileText, Heart, BookOpen, Users, ShoppingBag, Newspaper } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { StableInput } from "@/components/ui/stable-input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import { usePortal, type PortalNavConfig, type PortalNavCta, type PortalPage } from "@/lib/portal-store"
import { PathInput } from "@/components/portal/path-input"

interface Props {
  nav: PortalNavConfig
  onChange: (patch: PortalNavConfig | ((prev: PortalNavConfig) => PortalNavConfig)) => void
}

// Built-in destinations, keyed by a stable id we use both in the
// PortalNavConfig.builtInOrder array and as the flag-name suffix.
// Adding a new built-in is a one-line entry here + a matching flag
// on PortalNavConfig + a render in site-header.
type BuiltInKey = "courses" | "teachers" | "store" | "blog" | "wall"

const BUILT_IN_META: Record<
  BuiltInKey,
  { label: string; href: string; icon: typeof BookOpen; flag: keyof PortalNavConfig }
> = {
  courses:  { label: "Courses",       href: "/courses",  icon: BookOpen,    flag: "showCourses" },
  teachers: { label: "Instructors", href: "/instructors", icon: Users, flag: "showTeachers" },
  store:    { label: "Shop",          href: "/store",    icon: ShoppingBag, flag: "showStore" },
  blog:     { label: "Blog",          href: "/blog",     icon: Newspaper,   flag: "showBlog" },
  wall:     { label: "Wall of Love",  href: "/wall",     icon: Heart,       flag: "showWall" },
}

const DEFAULT_BUILT_IN_ORDER: BuiltInKey[] = ["courses", "teachers", "store", "blog", "wall"]

function isBuiltInVisible(nav: PortalNavConfig, key: BuiltInKey): boolean {
  const meta = BUILT_IN_META[key]
  const v = nav[meta.flag] as boolean | undefined
  // Show by default for everything EXCEPT wall (opt-in).
  if (v === undefined) return key !== "wall"
  return v
}

function getOrderedBuiltIns(nav: PortalNavConfig): BuiltInKey[] {
  const order = (nav.builtInOrder ?? []).filter((k): k is BuiltInKey =>
    DEFAULT_BUILT_IN_ORDER.includes(k as BuiltInKey),
  )
  // Append any defaults that aren't already in the saved order — keeps
  // the editor working after we ship a new built-in.
  for (const k of DEFAULT_BUILT_IN_ORDER) {
    if (!order.includes(k)) order.push(k)
  }
  return order
}

function moveInOrder(arr: BuiltInKey[], key: BuiltInKey, dir: -1 | 1): string[] {
  const i = arr.indexOf(key)
  const j = i + dir
  if (i === -1 || j < 0 || j >= arr.length) return arr
  const next = arr.slice()
  ;[next[i], next[j]] = [next[j], next[i]]
  return next
}

export function HeaderNavEditor({ nav, onChange }: Props) {
  const orderedBuiltIns = getOrderedBuiltIns(nav)
  // Pull every portal page so the editor can expose a per-page
  // "Show in nav" toggle. About / Contact / Privacy / Terms / any
  // custom page the teacher made all show here — no separate UI.
  const { pages, upsertPage } = usePortal()
  const pageList = pages
    .slice()
    .sort((a, b) => {
      if (a.slug === "/") return -1
      if (b.slug === "/") return 1
      return (a.navOrder ?? 99) - (b.navOrder ?? 99) || a.title.localeCompare(b.title)
    })
  const items = nav.items ?? []
  const setItems = (next: typeof items) => onChange((prev) => ({ ...prev, items: next.length > 0 ? next : undefined }))

  const addItem = () =>
    setItems([...items, { label: "New link", href: "/" }])
  const removeItem = (i: number) => setItems(items.filter((_, j) => j !== i))
  const updateItem = (i: number, patch: Partial<(typeof items)[number]>) =>
    setItems(items.map((it, j) => (j === i ? { ...it, ...patch } : it)))
  const move = (i: number, dir: -1 | 1) => {
    const next = i + dir
    if (next < 0 || next >= items.length) return
    const arr = items.slice()
    const [m] = arr.splice(i, 1)
    arr.splice(next, 0, m)
    setItems(arr)
  }

  const setCta = (which: "primaryCta" | "secondaryCta", patch: Partial<PortalNavCta>) => {
    onChange((prev) => {
      const current = prev[which] ?? { label: "", href: "" }
      return { ...prev, [which]: { ...current, ...patch } }
    })
  }
  const clearCta = (which: "primaryCta" | "secondaryCta") => {
    onChange((prev) => {
      const { [which]: _omit, ...rest } = prev
      return rest
    })
  }

  const mode: "auto" | "curated" = items.length > 0 ? "curated" : "auto"

  return (
    <div className="space-y-6">
      {/* Mode toggle */}
      <div className="flex flex-col gap-3 rounded-md border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium">
            Navigation mode:{" "}
            <span className={cn("font-semibold", mode === "curated" ? "text-primary" : "text-foreground")}>
              {mode === "curated" ? "Curated" : "Automatic"}
            </span>
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {mode === "auto"
              ? "We auto-build the nav from your pages (those marked 'Show in nav') plus optional built-in tiles below."
              : "Your explicit list below is what shows. Empty it to switch back to automatic."}
          </p>
        </div>
        {mode === "curated" && (
          <Button variant="outline" size="sm" onClick={() => setItems([])}>
            Switch to automatic
          </Button>
        )}
      </div>

      {/* Curated items */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Nav items</Label>
          <Button variant="outline" size="sm" onClick={addItem}>
            <Plus className="mr-1 h-3.5 w-3.5" /> Add item
          </Button>
        </div>
        {items.length === 0 ? (
          <p className="rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground">
            No curated items yet. Add one to override the automatic nav, or skip this and let us
            assemble the nav from your pages.
          </p>
        ) : (
          items.map((it, i) => (
            <div key={i} className="flex items-center gap-2">
              <StableInput
                value={it.label}
                onChange={(v) => updateItem(i, { label: v })}
                placeholder="Label"
                className="w-40 shrink-0"
              />
              <PathInput
                value={it.href}
                onChange={(v) => updateItem(i, { href: v })}
                placeholder="/about  or  https://..."
              />
              <div className="flex items-center">
                <Button variant="ghost" size="sm" disabled={i === 0} onClick={() => move(i, -1)} title="Move up">
                  <ArrowUp className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={i === items.length - 1}
                  onClick={() => move(i, 1)}
                  title="Move down"
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => removeItem(i)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Auto-mode visibility toggles */}
      {mode === "auto" && (
        <div className="space-y-4">
          <div>
            <Label>Built-in destinations</Label>
            <p className="text-xs text-muted-foreground">
              Toggle the auto-added tiles for the major sections. Use the arrows to reorder.
            </p>
            <Card className="mt-2">
              <CardContent className="divide-y divide-border p-0">
                {orderedBuiltIns.map((key, i) => {
                  const meta = BUILT_IN_META[key]
                  const value = isBuiltInVisible(nav, key)
                  return (
                    <BuiltInRow
                      key={key}
                      label={meta.label}
                      href={meta.href}
                      icon={meta.icon}
                      value={value}
                      onChange={(v) => onChange((prev) => ({ ...prev, [meta.flag]: v }))}
                      canMoveUp={i > 0}
                      canMoveDown={i < orderedBuiltIns.length - 1}
                      onMoveUp={() => onChange((prev) => ({ ...prev, builtInOrder: moveInOrder(orderedBuiltIns, key, -1) }))}
                      onMoveDown={() => onChange((prev) => ({ ...prev, builtInOrder: moveInOrder(orderedBuiltIns, key, 1) }))}
                    />
                  )
                })}
              </CardContent>
            </Card>
          </div>

          <div>
            <Label>Pages</Label>
            <p className="text-xs text-muted-foreground">
              Every page you&apos;ve created (About, Contact, Privacy, anything custom). Toggle to
              show or hide it in the header. Manage page content in{" "}
              <a href="/dashboard/portal/pages" className="font-medium text-primary hover:underline">Pages</a>.
            </p>
            <Card className="mt-2">
              <CardContent className="divide-y divide-border p-0">
                {pageList.length === 0 && (
                  <p className="p-4 text-center text-sm text-muted-foreground">
                    No pages yet.
                  </p>
                )}
                {pageList.map((p) => (
                  <PageRow
                    key={p.id}
                    page={p}
                    onToggle={(v) => upsertPage({ ...p, showInNav: v })}
                  />
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* CTAs */}
      <div className="space-y-3">
        <div>
          <Label>Header CTAs</Label>
          <p className="text-xs text-muted-foreground">
            Up to two action buttons in the top-right (e.g. "Enroll" + "Sign in"). Render on
            desktop and appear in the mobile menu.
          </p>
        </div>
        <CtaCard
          title="Primary CTA"
          accent="primary"
          cta={nav.primaryCta}
          onChange={(p) => setCta("primaryCta", p)}
          onClear={() => clearCta("primaryCta")}
        />
        <CtaCard
          title="Secondary CTA (optional)"
          accent="secondary"
          cta={nav.secondaryCta}
          onChange={(p) => setCta("secondaryCta", p)}
          onClear={() => clearCta("secondaryCta")}
        />
      </div>
    </div>
  )
}

// Page row — wraps the BuiltInRow visual but writes back to the
// PortalPage record's `showInNav` rather than to PortalNavConfig.
function PageRow({
  page,
  onToggle,
}: {
  page: PortalPage
  onToggle: (v: boolean) => void
}) {
  const label = page.navLabel ?? page.title
  const isDraft = page.status !== "published"
  return (
    <div className="flex items-center justify-between gap-3 p-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <p className="truncate text-sm font-medium">{label}</p>
          {isDraft && (
            <span className="rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
              Draft
            </span>
          )}
        </div>
        <p className="truncate font-mono text-[11px] text-muted-foreground">{page.slug}</p>
      </div>
      <Switch
        checked={!!page.showInNav}
        onCheckedChange={onToggle}
        disabled={isDraft}
        aria-label={`Show ${label} in nav`}
      />
    </div>
  )
}

function BuiltInRow({
  label,
  href,
  icon: Icon,
  value,
  onChange,
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
}: {
  label: string
  href: string
  icon?: typeof Heart
  value: boolean
  onChange: (v: boolean) => void
  canMoveUp?: boolean
  canMoveDown?: boolean
  onMoveUp?: () => void
  onMoveDown?: () => void
}) {
  return (
    <div className="flex items-center gap-3 p-3">
      {Icon && <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{label}</p>
        <p className="truncate font-mono text-[11px] text-muted-foreground">{href}</p>
      </div>
      {(onMoveUp || onMoveDown) && (
        <div className="flex items-center">
          <Button variant="ghost" size="sm" disabled={!canMoveUp} onClick={onMoveUp} title="Move up">
            <ArrowUp className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="sm" disabled={!canMoveDown} onClick={onMoveDown} title="Move down">
            <ArrowDown className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
      <Switch checked={value} onCheckedChange={onChange} />
    </div>
  )
}

function CtaCard({
  title,
  accent,
  cta,
  onChange,
  onClear,
}: {
  title: string
  accent: "primary" | "secondary"
  cta?: PortalNavCta
  onChange: (patch: Partial<PortalNavCta>) => void
  onClear: () => void
}) {
  const filled = !!cta && (!!cta.label || !!cta.href)
  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="inline-flex items-center gap-1.5 text-sm font-semibold">
            <Sparkles
              className={cn(
                "h-3.5 w-3.5",
                accent === "primary" ? "text-primary" : "text-accent",
              )}
            />
            {title}
          </p>
          {filled && (
            <Button variant="ghost" size="sm" onClick={onClear}>
              Remove
            </Button>
          )}
        </div>
        <div className="grid gap-3 sm:grid-cols-[1fr_2fr]">
          <StableInput
            value={cta?.label ?? ""}
            onChange={(v) => onChange({ label: v })}
            placeholder={accent === "primary" ? "Enroll" : "Sign in"}
          />
          <PathInput
            value={cta?.href ?? ""}
            onChange={(v) => onChange({ href: v })}
            placeholder="/courses  or  /login  or  https://..."
          />
        </div>
      </CardContent>
    </Card>
  )
}
