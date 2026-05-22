"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Plus, Pencil, Trash2, Copy, FileText, Star, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CustomTemplateRenderer, type FieldValues } from "@/components/certificates/custom-template-renderer"
import { CertificatePreview } from "@/components/certificates/certificate-preview"
import { BUILTIN_TEMPLATES } from "@/lib/certificate-templates"
import {
  loadCustomTemplates, deleteCustomTemplate, upsertCustomTemplate,
  newTemplateId, setTemplateFavorite,
  TEMPLATE_VARIABLES, type CustomTemplate,
} from "@/lib/custom-templates"
import { cn } from "@/lib/utils"
import { useConfirm } from "@/lib/use-confirm"
import { toast } from "sonner"
import { registerRestoreHandler } from "@/lib/trash"

// Anything updated within this window counts as "recent" on the list.
const RECENT_WINDOW_DAYS = 14
const RECENT_WINDOW_MS = RECENT_WINDOW_DAYS * 24 * 60 * 60 * 1000

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<CustomTemplate[]>([])
  const [ready, setReady] = useState(false)
  const confirm = useConfirm()

  useEffect(() => {
    setTemplates(loadCustomTemplates())
    setReady(true)
  }, [])

  // Trash restore — re-insert the snapshot at the top of the list.
  useEffect(() => {
    return registerRestoreHandler(["template"], (entry) => {
      const t = entry.payload as CustomTemplate
      setTemplates((prev) => {
        if (prev.some((x) => x.id === t.id)) return prev
        const next = [t, ...prev]
        upsertCustomTemplate(t)
        return next
      })
      return true
    })
  }, [])

  const sampleFields = useMemo(
    () => Object.fromEntries(TEMPLATE_VARIABLES.map((v) => [v.key, v.sample])) as unknown as FieldValues,
    []
  )

  // Split into Favourites / Recent / All, in that order. "Recent" excludes
  // anything already in Favourites, and "All" excludes both.
  const { favourites, recent, others } = useMemo(() => {
    const fav = templates.filter((t) => t.favorite)
    const cutoff = Date.now() - RECENT_WINDOW_MS
    const recentList = templates
      .filter((t) => !t.favorite && new Date(t.updatedAt).getTime() >= cutoff)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    const recentIds = new Set([...fav.map((t) => t.id), ...recentList.map((t) => t.id)])
    const all = templates
      .filter((t) => !recentIds.has(t.id))
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    return { favourites: fav, recent: recentList, others: all }
  }, [templates])

  const duplicate = (t: CustomTemplate) => {
    const copy: CustomTemplate = {
      ...t,
      id: newTemplateId(),
      name: `${t.name} (copy)`,
      favorite: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    setTemplates(upsertCustomTemplate(copy))
  }

  const remove = async (id: string) => {
    const ok = await confirm({
      title: "Delete this template?",
      description: "Moved to Trash — you can restore it within 7 days. Certificates already issued from it stay in your records.",
      destructive: true,
    })
    if (!ok) return
    setTemplates(deleteCustomTemplate(id))
    toast.success("Template deleted.", { description: "Restore from Trash within 7 days." })
  }

  const toggleFav = (t: CustomTemplate) => {
    setTemplates(setTemplateFavorite(t.id, !t.favorite))
  }

  return (
    <div className="mx-auto max-w-6xl space-y-10">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Certificate templates</h1>
          <p className="text-sm text-muted-foreground">
            Use one of the built-in layouts below, or design your own from scratch.
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/templates/new"><Plus className="mr-1 h-4 w-4" /> New template</Link>
        </Button>
      </div>

      {/* Custom templates — what the user has built. Either a populated set of
          sections (favourites / recent / all) or a minimal empty state that
          nudges them toward the editor. We always show the built-in gallery
          below regardless. */}
      <section className="space-y-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Your templates
          </h2>
          <p className="text-xs text-muted-foreground">
            Layouts you&apos;ve designed or saved.
          </p>
        </div>

        {!ready ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">Loading…</CardContent></Card>
        ) : templates.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center gap-3 py-12 text-center">
              <FileText className="h-9 w-9 text-muted-foreground" />
              <CardTitle className="text-base">No custom templates yet</CardTitle>
              <CardDescription className="max-w-md">
                Pick one of the built-in templates below for any course, or open the editor to design your own from scratch.
              </CardDescription>
              <Button asChild variant="outline" className="mt-1">
                <Link href="/dashboard/templates/new"><Plus className="mr-1 h-4 w-4" /> Design your first template</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {favourites.length > 0 && (
              <TemplateSection
                title="Favourites"
                caption="The templates you've starred — first in every picker."
                items={favourites}
                sampleFields={sampleFields}
                onDuplicate={duplicate}
                onRemove={remove}
                onToggleFav={toggleFav}
              />
            )}
            {recent.length > 0 && (
              <TemplateSection
                title="Recent"
                caption={`Edited in the last ${RECENT_WINDOW_DAYS} days.`}
                items={recent}
                sampleFields={sampleFields}
                onDuplicate={duplicate}
                onRemove={remove}
                onToggleFav={toggleFav}
              />
            )}
            {others.length > 0 && (
              <TemplateSection
                title="All templates"
                caption={`${others.length} more in your library.`}
                items={others}
                sampleFields={sampleFields}
                onDuplicate={duplicate}
                onRemove={remove}
                onToggleFav={toggleFav}
              />
            )}
          </div>
        )}
      </section>

      {/* Built-in template gallery — always visible. These are the layouts
          available on every course's certificate setting; we show them here
          so users can preview before picking, instead of guessing from a
          dropdown of names. */}
      <BuiltinTemplateGallery />
    </div>
  )
}

function BuiltinTemplateGallery() {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Built-in templates
        </h2>
        <p className="text-xs text-muted-foreground">
          {BUILTIN_TEMPLATES.length} ready-to-use layouts. Select any of them when creating or editing a course.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {BUILTIN_TEMPLATES.map((t) => (
          <Card key={t.id} className="overflow-hidden">
            <div className="overflow-hidden border-b bg-muted">
              <CertificatePreview template={t.id} scale="md" />
            </div>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{t.name}</CardTitle>
              <CardDescription className="text-xs">{t.tagline}</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <Button asChild size="sm" variant="outline" className="w-full">
                <Link href={`/dashboard/courses/new?cert=${t.id}`}>
                  Use in a new course
                  <ArrowRight className="ml-1 h-3.5 w-3.5" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  )
}

function TemplateSection({
  title, caption, items, sampleFields, onDuplicate, onRemove, onToggleFav,
}: {
  title: string
  caption: string
  items: CustomTemplate[]
  sampleFields: FieldValues
  onDuplicate: (t: CustomTemplate) => void
  onRemove: (id: string) => void
  onToggleFav: (t: CustomTemplate) => void
}) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{title}</h2>
        <p className="text-xs text-muted-foreground">{caption}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((t) => (
          <Card key={t.id} className="relative overflow-hidden">
            <button
              onClick={() => onToggleFav(t)}
              className="absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-background/80 backdrop-blur-sm hover:bg-background"
              title={t.favorite ? "Unstar" : "Star template"}
            >
              <Star className={cn("h-4 w-4", t.favorite ? "fill-amber-400 text-amber-400" : "text-muted-foreground")} />
            </button>
            <div className="overflow-hidden border-b bg-muted">
              <CustomTemplateRenderer template={t} fields={sampleFields} fit />
            </div>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{t.name}</CardTitle>
              <CardDescription className="text-xs">
                Updated {new Date(t.updatedAt).toLocaleString()}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex gap-2 pt-0">
              <Button asChild size="sm" variant="outline" className="flex-1">
                <Link href={`/dashboard/templates/${t.id}`}><Pencil className="mr-1 h-3.5 w-3.5" /> Edit</Link>
              </Button>
              <Button size="sm" variant="outline" onClick={() => onDuplicate(t)} title="Duplicate">
                <Copy className="h-3.5 w-3.5" />
              </Button>
              <Button size="sm" variant="outline" onClick={() => onRemove(t.id)} title="Delete">
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  )
}
