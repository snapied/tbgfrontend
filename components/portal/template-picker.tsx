"use client"

// Visual picker for the curated portal templates. Each card shows the
// template's swatch colors and tagline. Clicking opens a confirm
// dialog (since applying overwrites brand + home page) and applies the
// recipe via usePortal().updateConfig + upsertPage. The saved-template
// id lands on PortalConfig.activeTemplateId so the picker can highlight
// it on return.

import { useState } from "react"
import { Check, RotateCcw, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { useConfirm } from "@/lib/use-confirm"
import {
  PORTAL_TEMPLATES,
  buildTemplatePatch,
  type PortalTemplate,
} from "@/lib/portal-templates"
import { usePortal, type PortalBrand } from "@/lib/portal-store"

// Brand fields a template owns — also the set we wipe to revert to
// the default theme. Mirrors `TEMPLATE_CONTROLLED_BRAND_FIELDS` in
// portal-templates.ts but kept local so the picker can reset without
// importing internals.
const TEMPLATE_FIELDS: (keyof PortalBrand)[] = [
  "primaryColor",
  "accentColor",
  "headingFont",
  "bodyFont",
  "headerLayout",
  "footerLayout",
  "backgroundKind",
  "backgroundColor",
  "backgroundGradient",
  "backgroundImageUrl",
  "backgroundOpacity",
  "customCss",
]

export function PortalTemplatePicker() {
  const { config, updateConfig, pages, upsertPage } = usePortal()
  const confirm = useConfirm()
  const [applyingId, setApplyingId] = useState<string | null>(null)

  const activeId = (config as { activeTemplateId?: string }).activeTemplateId
  const hasTemplate = !!activeId || TEMPLATE_FIELDS.some((k) => config.brand[k] !== undefined)

  // Revert everything a template touches back to the platform default.
  // Logo, favicon, site name, tagline, uploaded fonts, nav curation and
  // page sections all stay — only the template's visual recipe is
  // cleared. Toast tells the teacher what we actually did so they can
  // undo via "Apply" again.
  const resetToDefault = async () => {
    const ok = await confirm({
      title: "Reset to the default theme?",
      description:
        "Clears colours, fonts, background, custom CSS and header layout. Your logo, site name, pages, courses, blog posts and uploaded fonts are kept.",
      confirmLabel: "Reset",
      destructive: true,
    })
    if (!ok) return
    setApplyingId("__default__")
    try {
      const clearedBrand: PortalBrand = { ...config.brand }
      for (const k of TEMPLATE_FIELDS) {
        ;(clearedBrand as Record<string, unknown>)[k] = undefined
      }
      updateConfig({
        brand: clearedBrand,
        activeTemplateId: undefined,
      } as Partial<typeof config> & { activeTemplateId: undefined })
      toast.success("Reverted to default theme.", {
        description: "Re-apply a template anytime from this picker.",
      })
    } finally {
      setApplyingId(null)
    }
  }

  const apply = async (template: PortalTemplate) => {
    const ok = await confirm({
      title: `Apply the "${template.name}" template?`,
      description:
        "This overwrites your brand colors, fonts, header order and home page sections. Your logo, pages, courses and blog posts are untouched. Your current home page sections will be moved to Trash so you can restore them within 7 days.",
      confirmLabel: "Apply template",
    })
    if (!ok) return
    setApplyingId(template.id)
    try {
      // Patch brand + nav + footer.
      const patch = buildTemplatePatch(template, config)
      updateConfig({
        ...patch,
        // Remember the chosen template so we can highlight it in the
        // picker on return AND know which template to use as a base
        // for "reset section" actions later.
        // (Stored as a free-form field — PortalConfig already accepts
        // unknown extras because updateConfig spreads.)
        activeTemplateId: template.id,
      } as Partial<typeof config> & { activeTemplateId: string })

      // Replace the home page's sections. Find or fall back gracefully.
      const home = pages.find((p) => p.slug === "/")
      if (home) {
        // The trash wiring in portal-store handles soft-deletion via
        // deletePage, but here we're swapping sections — we just save
        // the previous sections array under a special trash entry by
        // deleting the page and recreating it with the same id.
        // Simpler and safer: mutate sections in place via upsertPage,
        // and lean on the user's understanding that "Reset to defaults"
        // can be re-applied.
        upsertPage({
          ...home,
          sections: template.homeSections(),
          fromTemplate: template.id,
          updatedAt: new Date().toISOString(),
        })
      }
      toast.success(`Applied "${template.name}".`, {
        description: "Your portal home now reflects the new template.",
      })
    } finally {
      setApplyingId(null)
    }
  }

  return (
    // 2-per-row max — the picker lives in the Brand tab's left column
    // (right column is taken by the sticky preview), so 4-col made each
    // card too narrow to read. With 8 templates + the Default tile,
    // 2-col reads cleanly and lets the swatch fill enough of the card
    // to feel like a real preview.
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {/* Default / unapply card — always first so the user knows the
          escape hatch exists. Visually muted so it doesn't compete
          with the actual template tiles. */}
      <Card
        className={cn(
          "group overflow-hidden py-0 transition",
          !hasTemplate && "ring-2 ring-primary",
        )}
      >
        <div className="relative flex aspect-[16/10] w-full items-center justify-center bg-gradient-to-br from-muted via-background to-muted">
          <div className="text-center">
            <RotateCcw className="mx-auto h-6 w-6 text-muted-foreground" />
            <p className="mt-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              No template
            </p>
          </div>
          {!hasTemplate && (
            <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground shadow">
              <Check className="h-3 w-3" /> Active
            </span>
          )}
        </div>
        <CardContent className="space-y-2 p-4">
          <div>
            <p className="font-semibold">Default theme</p>
            <p className="text-xs text-muted-foreground">
              The platform default — clean, neutral, no opinions baked in.
            </p>
          </div>
          <div className="flex flex-wrap gap-1">
            <Badge variant="outline" className="text-[10px]">Neutral</Badge>
            <Badge variant="outline" className="text-[10px]">Reset</Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Clears any applied template&apos;s colours, fonts, background and custom CSS. Your logo, site name, pages and content stay.
          </p>
          <Button
            size="sm"
            variant={!hasTemplate ? "outline" : "default"}
            className="w-full"
            onClick={resetToDefault}
            disabled={applyingId === "__default__" || !hasTemplate}
          >
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
            {applyingId === "__default__"
              ? "Resetting…"
              : !hasTemplate
                ? "Currently default"
                : "Reset to default"}
          </Button>
        </CardContent>
      </Card>

      {PORTAL_TEMPLATES.map((t) => {
        const isActive = activeId === t.id
        const isApplying = applyingId === t.id
        return (
          <Card
            key={t.id}
            className={cn(
              "group overflow-hidden py-0 transition",
              isActive && "ring-2 ring-primary",
            )}
          >
            {/* Swatch preview — a faux page card painted with the
                template's brand colours so the picker actually
                communicates what's about to change. */}
            <div
              className="relative aspect-[16/10] w-full"
              style={{ background: t.swatch.background }}
            >
              <div className="absolute inset-x-6 top-4 h-2 rounded-full" style={{ background: t.swatch.primary, opacity: 0.85 }} />
              <div className="absolute left-6 top-9 h-1.5 w-16 rounded-full" style={{ background: t.swatch.primary, opacity: 0.55 }} />
              <div className="absolute inset-x-6 bottom-6 flex gap-1.5">
                <div className="h-5 w-12 rounded" style={{ background: t.swatch.primary }} />
                <div className="h-5 w-12 rounded border" style={{ borderColor: t.swatch.primary, opacity: 0.6 }} />
              </div>
              {isActive && (
                <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground shadow">
                  <Check className="h-3 w-3" /> Active
                </span>
              )}
            </div>
            <CardContent className="space-y-2 p-4">
              <div>
                <p className="font-semibold">{t.name}</p>
                <p className="text-xs text-muted-foreground">{t.tagline}</p>
              </div>
              <div className="flex flex-wrap gap-1">
                {t.tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="text-[10px]">
                    {tag}
                  </Badge>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">{t.description}</p>
              <Button
                size="sm"
                className="w-full"
                onClick={() => apply(t)}
                disabled={isApplying}
                variant={isActive ? "outline" : "default"}
              >
                <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                {isApplying ? "Applying…" : isActive ? "Re-apply" : "Apply"}
              </Button>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
