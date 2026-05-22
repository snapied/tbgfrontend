"use client"

// Testimonials manager. Two ways to add:
//   1) Import from the existing Wall of Love (kind=quote entries are
//      already in the right shape — just need an author override).
//   2) Manually create one (good for offline / external quotes).
// "Featured" testimonials show up in the page builder's testimonials
// section when source=featured.

import { useState } from "react"
import { Plus, Trash2, Star, StarOff, Quote, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
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
import { FileUploadField } from "@/components/upload/file-upload-field"
import {
  usePortal,
  generatePortalId,
  type PortalTestimonial,
} from "@/lib/portal-store"
import { useWall } from "@/lib/wall-store"
import { useLMS } from "@/lib/lms-store"
import { cn } from "@/lib/utils"

export default function TestimonialsPage() {
  const { testimonials, upsertTestimonial, deleteTestimonial } = usePortal()
  const { entries: wallEntries } = useWall()
  const { getUserById } = useLMS()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<PortalTestimonial | null>(null)
  const [importOpen, setImportOpen] = useState(false)

  const openNew = () => { setEditing(null); setOpen(true) }
  const openEdit = (t: PortalTestimonial) => { setEditing(t); setOpen(true) }

  // Wall quotes that haven't been imported yet (cheap key on quote text).
  const importedQuotes = new Set(testimonials.filter((t) => t.source === "wall").map((t) => t.quote))
  const importable = wallEntries.filter(
    (e) => e.kind === "quote" && e.caption && !importedQuotes.has(e.caption.trim()),
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold tracking-tight">Testimonials</h1>
          <p className="text-muted-foreground">
            Student quotes that surface on your public site. Star the best ones to feature them.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {importable.length > 0 && (
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              <Download className="mr-1.5 h-4 w-4" /> Import {importable.length} from Wall
            </Button>
          )}
          <Button onClick={openNew}>
            <Plus className="mr-1.5 h-4 w-4" /> New testimonial
          </Button>
        </div>
      </div>

      {testimonials.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Quote className="h-10 w-10 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">No testimonials yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Add quotes from real students — featured testimonials get top billing on your home page.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((t) => (
            <Card key={t.id}>
              <CardContent className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <Quote className="h-4 w-4 text-accent" />
                  <div className="flex flex-wrap items-center gap-1">
                    {t.source === "student-submission" && (
                      <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-secondary-foreground">
                        Submitted by student
                      </span>
                    )}
                    {t.status === "pending" && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-900 dark:bg-amber-500/20 dark:text-amber-200">
                        Pending review
                      </span>
                    )}
                    {t.status === "rejected" && (
                      <span className="rounded-full bg-destructive/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-destructive">
                        Rejected
                      </span>
                    )}
                    {t.featured && (
                      <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent">
                        Featured
                      </span>
                    )}
                  </div>
                </div>
                <p className="mt-2 text-sm">“{t.quote}”</p>
                {t.mediaUrl && (
                  <div className="mt-2 rounded-md border border-border/60 bg-muted/30 p-2">
                    {t.mediaKind === "image" ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={t.mediaUrl}
                        alt={t.mediaFilename ?? "attachment"}
                        className="max-h-40 w-full rounded object-cover"
                      />
                    ) : t.mediaKind === "video" ? (
                      <video src={t.mediaUrl} controls className="max-h-40 w-full rounded" />
                    ) : t.mediaKind === "audio" ? (
                      <audio src={t.mediaUrl} controls className="w-full" />
                    ) : (
                      <a
                        href={t.mediaUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-medium text-primary hover:underline"
                      >
                        Open attachment ({t.mediaFilename ?? "file"})
                      </a>
                    )}
                  </div>
                )}
                {t.rating ? (
                  <div className="mt-2 flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star
                        key={i}
                        className={cn(
                          "h-3.5 w-3.5",
                          i <= (t.rating ?? 0) ? "fill-accent text-accent" : "text-muted-foreground/30",
                        )}
                      />
                    ))}
                  </div>
                ) : null}
                <div className="mt-4 flex items-center gap-3 border-t border-border pt-3">
                  {t.avatar ? (
                    <img src={t.avatar} alt="" className="h-8 w-8 rounded-full object-cover" />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                      {t.authorName.split(" ").map((p) => p[0]).join("").slice(0, 2)}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{t.authorName}</p>
                    {t.authorRole && <p className="truncate text-xs text-muted-foreground">{t.authorRole}</p>}
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  {t.status === "pending" ? (
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        onClick={() =>
                          upsertTestimonial({ ...t, status: "published" })
                        }
                      >
                        Publish
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() =>
                          upsertTestimonial({ ...t, status: "rejected" })
                        }
                      >
                        Reject
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => upsertTestimonial({ ...t, featured: !t.featured })}
                    >
                      {t.featured
                        ? <><StarOff className="mr-1 h-3.5 w-3.5" /> Unfeature</>
                        : <><Star className="mr-1 h-3.5 w-3.5" /> Feature</>}
                    </Button>
                  )}
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(t)}>
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => deleteTestimonial(t.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Editor dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <TestimonialDialog
          editing={editing}
          onClose={() => setOpen(false)}
          onSave={(t) => { upsertTestimonial(t); setOpen(false) }}
        />
      </Dialog>

      {/* Import-from-wall dialog */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Import from Wall of Love</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 pt-2">
            {importable.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing new to import.</p>
            ) : (
              importable.map((e) => {
                const student = e.studentId ? getUserById(e.studentId) : undefined
                return (
                  <div
                    key={e.id}
                    className="flex items-start justify-between gap-3 rounded-md border border-border bg-card p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm">“{e.caption}”</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {student?.name ?? e.studentName ?? "Anonymous"}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => {
                        upsertTestimonial({
                          id: generatePortalId("test"),
                          authorName: student?.name ?? e.studentName ?? "Anonymous",
                          authorRole: undefined,
                          avatar: student?.avatar,
                          courseId: e.courseId,
                          quote: e.caption ?? "",
                          featured: false,
                          source: "wall",
                          createdAt: new Date().toISOString(),
                        })
                      }}
                    >
                      Import
                    </Button>
                  </div>
                )
              })
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function TestimonialDialog({
  editing,
  onClose,
  onSave,
}: {
  editing: PortalTestimonial | null
  onClose: () => void
  onSave: (t: PortalTestimonial) => void
}) {
  const [authorName, setAuthorName] = useState(editing?.authorName ?? "")
  const [authorRole, setAuthorRole] = useState(editing?.authorRole ?? "")
  const [quote, setQuote] = useState(editing?.quote ?? "")
  const [rating, setRating] = useState<number>(editing?.rating ?? 5)
  const [avatar, setAvatar] = useState(editing?.avatar ?? "")

  const save = () => {
    if (!authorName.trim() || !quote.trim()) return
    onSave({
      id: editing?.id ?? generatePortalId("test"),
      authorName: authorName.trim(),
      authorRole: authorRole.trim() || undefined,
      avatar: avatar.trim() || undefined,
      quote: quote.trim(),
      rating,
      featured: editing?.featured,
      source: editing?.source ?? "manual",
      createdAt: editing?.createdAt ?? new Date().toISOString(),
    })
  }

  return (
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <DialogTitle>{editing ? "Edit testimonial" : "New testimonial"}</DialogTitle>
      </DialogHeader>
      <div className="space-y-4 pt-2">
        <div className="space-y-2">
          <Label>Author name *</Label>
          <Input value={authorName} onChange={(e) => setAuthorName(e.target.value)} placeholder="Priya S." />
        </div>
        <div className="space-y-2">
          <Label>Role</Label>
          <Input value={authorRole} onChange={(e) => setAuthorRole(e.target.value)} placeholder="Engineering student" />
        </div>
        <div className="space-y-2">
          <Label>Quote *</Label>
          <Textarea
            value={quote}
            onChange={(e) => setQuote(e.target.value)}
            rows={4}
            placeholder="The best practical course I've taken."
          />
        </div>
        <div className="space-y-2">
          <Label>Rating</Label>
          <Select value={String(rating)} onValueChange={(v) => setRating(Number(v))}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[5, 4, 3, 2, 1].map((n) => (
                <SelectItem key={n} value={String(n)}>{n} star{n === 1 ? "" : "s"}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Avatar (optional)</Label>
          <FileUploadField
            value={avatar}
            onChange={setAvatar}
            accept="image/png,image/jpeg,image/webp"
            maxSizeMB={4}
            variant="compact"
            compress={{ maxDim: 300, quality: 0.85, mime: "image/jpeg" }}
          />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={save} disabled={!authorName.trim() || !quote.trim()}>
          {editing ? "Update" : "Add"}
        </Button>
      </DialogFooter>
    </DialogContent>
  )
}
