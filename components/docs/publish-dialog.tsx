"use client"

// PublishDialog — pick audience + status. Production-grade:
//   • Tenant-scoped slug preview (the /k route was retired; we
//     surface /p/<tenant>/k/<slug> directly so the writer sees the
//     real URL their visitors will use).
//   • Two distinct actions in the footer — "Save as draft" and
//     "Publish now". One press, clear intent. No ambiguous toggle.
//   • Slug validation surfaces inline as the writer types, not on
//     submit, so the Publish button being disabled is always
//     self-explanatory.
//   • Cancel + Save by clicking outside / Esc — the standard
//     shadcn AlertDialog patterns.

import { useEffect, useMemo, useState } from "react"
import { Check, Eye, Globe2, Lock, Send, Shield, Users, GraduationCap } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useLMS } from "@/lib/lms-store"
import { useTenant } from "@/lib/tenant-store"
import { type Doc, type DocAudience, type DocPublishStatus } from "@/lib/docs"

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  doc: Doc
  onSave: (patch: {
    audience: DocAudience
    status: DocPublishStatus
    publicSlug?: string
    seo?: Doc["seo"]
  }) => void
}

const AUDIENCE_OPTIONS: Array<{
  id: DocAudience["kind"]
  label: string
  hint: string
  icon: React.ElementType
  needsTarget?: "community" | "course"
}> = [
  { id: "private",            label: "Private",            hint: "Just you. Nobody else can see it.",                                    icon: Lock },
  { id: "workspace-admin",    label: "Admins + instructors", hint: "Faculty only. Hidden from students.",                                  icon: Shield },
  { id: "workspace-everyone", label: "Everyone in workspace", hint: "All signed-in members of your workspace.",                            icon: Users },
  { id: "community",          label: "A community",         hint: "Members of a specific batch/cohort.",                                  icon: Users,         needsTarget: "community" },
  { id: "course",             label: "Course-enrolled",     hint: "Anyone enrolled in a specific course.",                                icon: GraduationCap, needsTarget: "course" },
  { id: "public",             label: "Public on the web",   hint: "Anyone with the URL. Indexed by search engines.",                       icon: Globe2 },
]

export function PublishDialog({ open, onOpenChange, doc, onSave }: Props) {
  const { studentGroups, courses } = useLMS()
  const { currentTenant } = useTenant()
  const [audienceKind, setAudienceKind] = useState<DocAudience["kind"]>(doc.audience.kind)
  const [communityId, setCommunityId] = useState<string>(
    doc.audience.kind === "community" ? doc.audience.communityId : "",
  )
  const [courseId, setCourseId] = useState<string>(
    doc.audience.kind === "course" ? doc.audience.courseId : "",
  )
  const [publicSlug, setPublicSlug] = useState<string>(doc.publicSlug ?? "")
  const [seoTitle, setSeoTitle] = useState<string>(doc.seo?.title ?? "")
  const [seoDescription, setSeoDescription] = useState<string>(doc.seo?.description ?? "")

  // Reset on open so flipping between docs doesn't carry state.
  useEffect(() => {
    if (!open) return
    setAudienceKind(doc.audience.kind)
    setCommunityId(doc.audience.kind === "community" ? doc.audience.communityId : "")
    setCourseId(doc.audience.kind === "course" ? doc.audience.courseId : "")
    setPublicSlug(doc.publicSlug ?? "")
    setSeoTitle(doc.seo?.title ?? "")
    setSeoDescription(doc.seo?.description ?? "")
  }, [open, doc])

  // Validation is split: "draftBlocker" is whatever stops the
  // writer from even saving a draft (e.g. picked a community but
  // didn't choose one); "publishBlocker" adds public-only checks
  // like requiring a slug. This lets us disable the Publish button
  // independently of the Draft button.
  const draftBlocker = useMemo<string | null>(() => {
    if (audienceKind === "community" && !communityId) return "Pick a community to share with."
    if (audienceKind === "course" && !courseId) return "Pick a course to share with."
    return null
  }, [audienceKind, communityId, courseId])

  const publishBlocker = useMemo<string | null>(() => {
    if (draftBlocker) return draftBlocker
    if (audienceKind === "public") {
      const slug = publicSlug.trim()
      if (!slug) return "Public docs need a URL slug."
      if (!/^[a-z0-9-]+$/.test(slug)) return "Slug can only contain lowercase letters, numbers, and hyphens."
    }
    return null
  }, [draftBlocker, audienceKind, publicSlug])

  // Resolve the public URL preview. Tenant-scoped — the platform-
  // global /k route was retired, public docs live at /p/<tenant>/k/<slug>.
  const slugBase = currentTenant?.slug
    ? `/p/${currentTenant.slug}/k/`
    : "/k/"

  function buildPatch(target: DocPublishStatus) {
    let audience: DocAudience
    if (audienceKind === "community") audience = { kind: "community", communityId }
    else if (audienceKind === "course") audience = { kind: "course", courseId }
    else audience = { kind: audienceKind } as DocAudience

    return {
      audience,
      status: target,
      publicSlug: audienceKind === "public" ? publicSlug.trim() : undefined,
      seo:
        audienceKind === "public" && target === "published"
          ? {
              title: seoTitle.trim() || undefined,
              description: seoDescription.trim() || undefined,
            }
          : undefined,
    }
  }

  function saveDraft() {
    if (draftBlocker) return
    onSave(buildPatch("draft"))
    onOpenChange(false)
  }

  function publishNow() {
    if (publishBlocker) return
    onSave(buildPatch("published"))
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-primary" />
            Share &amp; publish
          </DialogTitle>
          <DialogDescription>
            Pick who can see this doc, then either save as draft or publish now.
            Change any time.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {AUDIENCE_OPTIONS.map((opt) => {
            const active = audienceKind === opt.id
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setAudienceKind(opt.id)}
                className={`group flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors ${
                  active ? "border-primary bg-primary/[0.04]" : "border-border bg-card hover:border-primary/30"
                }`}
              >
                <span
                  className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${
                    active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  }`}
                >
                  <opt.icon className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">{opt.label}</span>
                  <span className="block text-[11px] leading-snug text-muted-foreground">{opt.hint}</span>

                  {active && opt.needsTarget === "community" && (
                    <select
                      value={communityId}
                      onChange={(e) => setCommunityId(e.target.value)}
                      className="mt-2 w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs"
                    >
                      <option value="">— Pick a community —</option>
                      {studentGroups.map((g) => (
                        <option key={g.id} value={g.id}>{g.name}</option>
                      ))}
                    </select>
                  )}
                  {active && opt.needsTarget === "course" && (
                    <select
                      value={courseId}
                      onChange={(e) => setCourseId(e.target.value)}
                      className="mt-2 w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs"
                    >
                      <option value="">— Pick a course —</option>
                      {courses.map((c) => (
                        <option key={c.id} value={c.id}>{c.title}</option>
                      ))}
                    </select>
                  )}
                  {active && opt.id === "public" && (
                    <div className="mt-2 space-y-2">
                      {/* Tenant-scoped URL preview. The slug input
                          carries the user's typing; the live preview
                          above shows the exact URL visitors will hit. */}
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          Public URL
                        </p>
                        <div className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                          <span className="font-mono">{slugBase}</span>
                          <Input
                            value={publicSlug}
                            onChange={(e) =>
                              setPublicSlug(
                                e.target.value
                                  .toLowerCase()
                                  .replace(/[^a-z0-9-]/g, "-")
                                  .replace(/-+/g, "-")
                                  .replace(/^-|-$/g, "")
                                  .slice(0, 60),
                              )
                            }
                            placeholder="your-slug-here"
                            className="h-7 flex-1 font-mono text-xs"
                          />
                        </div>
                        {publicSlug && (
                          <p className="mt-1 break-all rounded bg-muted/50 px-2 py-1 font-mono text-[10px] text-muted-foreground">
                            {slugBase}{publicSlug}
                          </p>
                        )}
                      </div>
                      <Input
                        value={seoTitle}
                        onChange={(e) => setSeoTitle(e.target.value)}
                        placeholder="SEO title (defaults to doc title)"
                        className="h-7 text-xs"
                        maxLength={70}
                      />
                      <Input
                        value={seoDescription}
                        onChange={(e) => setSeoDescription(e.target.value)}
                        placeholder="SEO meta description"
                        className="h-7 text-xs"
                        maxLength={160}
                      />
                    </div>
                  )}
                </span>
                {active && <Check className="h-4 w-4 shrink-0 text-primary" />}
              </button>
            )
          })}

          {/* Current state hint — tells the writer what'll happen on
              each button press, so the dual-CTA isn't ambiguous. */}
          <div className="rounded-lg border border-border bg-muted/30 p-3 text-[11px]">
            <p>
              <span className="font-semibold text-foreground">Currently: </span>
              <span className="text-muted-foreground">
                {doc.status === "published" ? "Published" : "Draft"} ·{" "}
                {AUDIENCE_OPTIONS.find((o) => o.id === doc.audience.kind)?.label ?? "—"}
              </span>
            </p>
          </div>

          {publishBlocker && (
            <p className="rounded-md border border-amber-500/40 bg-amber-500/[0.06] px-3 py-2 text-xs text-amber-700">
              ⚠️ {publishBlocker}
            </p>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="outline"
            onClick={saveDraft}
            disabled={!!draftBlocker}
            title="Save changes as a draft — nobody else can see it yet"
          >
            Save as draft
          </Button>
          <Button
            onClick={publishNow}
            disabled={!!publishBlocker}
            className="gap-1.5"
            title="Save and make visible to the audience above"
          >
            <Send className="h-3.5 w-3.5" />
            Publish now
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
