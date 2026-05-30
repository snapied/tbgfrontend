"use client"

// Presentation detail — slide grid + presenter + editor.

import { use, useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Check,
  Coffee,
  Copy,
  Download,
  Edit3,
  Loader2,
  Plus,
  Play,
  Presentation as PresentationIcon,
  Save,
  Trash2,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { toast } from "sonner"
import { apiBase } from "@/lib/jitsi"
import { useConfirm } from "@/lib/use-confirm"
import { PresenterView, SlideThumb } from "@/components/presentations/slide-presenter"
import { cn } from "@/lib/utils"

interface SlideInfo {
  id?: string
  type: string
  title: string
  body?: string
  bullets?: string[]
  [key: string]: unknown
}

interface PresentationData {
  id: number
  title: string
  status: "pending" | "generating" | "ready" | "failed"
  fileUrl: string | null
  slideCount: number | null
  slides: {
    fullHtml: string
    previews: string[]
    slides: SlideInfo[]
  } | null
  meta: Record<string, unknown> | null
  errorMessage: string | null
  createdAt: string
}

export default function PresentationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const confirm = useConfirm()
  const [pres, setPres] = useState<PresentationData | null>(null)
  const [loading, setLoading] = useState(true)
  const [presenting, setPresenting] = useState(false)
  const [editingSlide, setEditingSlide] = useState<number | null>(null)
  const [editTitle, setEditTitle] = useState("")
  const [editBody, setEditBody] = useState("")
  const [editBullets, setEditBullets] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  const fetchPres = useCallback(async () => {
    try {
      const token = localStorage.getItem("thebigclass.accessToken")
      const res = await fetch(
        `${apiBase()}/api/presentations/by-id/${encodeURIComponent(id)}`,
        { headers: token ? { Authorization: `Bearer ${token}` } : {}, credentials: "include" },
      )
      if (!res.ok) { if (res.status === 401) toast.error("Session expired"); setLoading(false); return }
      const data = await res.json()
      setPres(data.presentation ?? null)
    } catch { toast.error("Failed to load") }
    finally { setLoading(false) }
  }, [id])

  useEffect(() => { fetchPres() }, [fetchPres])

  useEffect(() => {
    if (!pres || pres.status !== "generating") return
    const t = setInterval(fetchPres, 4000)
    return () => clearInterval(t)
  }, [pres?.status, fetchPres])

  const handleDelete = async () => {
    const ok = await confirm({
      title: "Delete this presentation?",
      description: "Moved to Trash — you can restore within 7 days.",
      destructive: true, confirmLabel: "Delete",
    })
    if (!ok) return
    const token = localStorage.getItem("thebigclass.accessToken")
    await fetch(`${apiBase()}/api/presentations/by-id/${id}`, {
      method: "DELETE", headers: token ? { Authorization: `Bearer ${token}` } : {}, credentials: "include",
    }).catch(() => {})
    toast.success("Deleted")
    router.push("/dashboard/presentations")
  }

  // ── Edit a slide ──────────────────────────────────────────────────
  const startEdit = (i: number) => {
    const slides = pres?.slides?.slides || []
    const s = slides[i]
    if (!s) return
    setEditingSlide(i)
    setEditTitle(s.title || "")
    setEditBody(s.body || "")
    setEditBullets(s.bullets || [])
  }

  const saveEdit = async () => {
    if (editingSlide === null || !pres) return
    const slides = pres.slides?.slides || []
    const s = slides[editingSlide]
    if (!s || !s.id) { toast.error("Cannot edit — slide has no ID"); return }

    setSaving(true)
    try {
      const token = localStorage.getItem("thebigclass.accessToken")
      const res = await fetch(
        `${apiBase()}/api/presentations/by-id/${id}/slides/${s.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          credentials: "include",
          body: JSON.stringify({ title: editTitle, body: editBody, bullets: editBullets }),
        },
      )
      if (res.ok) {
        toast.success("Slide updated — regenerating preview...")
        setEditingSlide(null)
        await fetchPres()
      } else {
        toast.error("Failed to save")
      }
    } catch { toast.error("Failed to save") }
    finally { setSaving(false) }
  }

  // ── Add new slide ─────────────────────────────────────────────────
  const addSlide = async (afterIndex?: number) => {
    if (!pres) return
    const slides = pres.slides?.slides || []
    const afterId = afterIndex !== undefined ? slides[afterIndex]?.id : undefined

    try {
      const token = localStorage.getItem("thebigclass.accessToken")
      const res = await fetch(
        `${apiBase()}/api/presentations/by-id/${id}/slides`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          credentials: "include",
          body: JSON.stringify({
            slide: { type: "content", title: "New Slide", body: "Edit this slide with your content.", bullets: [] },
            afterSlideId: afterId,
          }),
        },
      )
      if (res.ok) {
        toast.success("Slide added")
        await fetchPres()
      }
    } catch { toast.error("Failed to add slide") }
  }

  // ── Delete a slide ────────────────────────────────────────────────
  const deleteSlide = async (i: number) => {
    const slides = pres?.slides?.slides || []
    const s = slides[i]
    if (!s?.id || slides.length <= 1) { toast.error("Need at least 1 slide"); return }

    const ok = await confirm({
      title: `Delete slide "${s.title}"?`,
      description: "This slide will be removed from the presentation.",
      destructive: true, confirmLabel: "Delete slide",
    })
    if (!ok) return

    try {
      const token = localStorage.getItem("thebigclass.accessToken")
      await fetch(`${apiBase()}/api/presentations/by-id/${id}/slides/${s.id}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: "include",
      })
      toast.success("Slide deleted")
      await fetchPres()
    } catch { toast.error("Failed to delete slide") }
  }

  // ── AI actions ─────────────────────────────────────────────────────
  const [aiLoading, setAiLoading] = useState<string | null>(null)

  const runAiAction = async (slideIndex: number, action: string) => {
    const slides = pres?.slides?.slides || []
    const s = slides[slideIndex]
    if (!s?.id) return
    setAiLoading(`${slideIndex}-${action}`)
    try {
      const token = localStorage.getItem("thebigclass.accessToken")
      const res = await fetch(
        `${apiBase()}/api/presentations/by-id/${id}/slides/${s.id}/ai-action`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          credentials: "include",
          body: JSON.stringify({ action }),
        },
      )
      if (res.ok) {
        toast.success(`${action} applied`)
        await fetchPres()
      } else {
        const err = await res.json().catch(() => ({ error: "Failed" }))
        toast.error(err.error || "AI action failed")
      }
    } catch { toast.error("Failed") }
    finally { setAiLoading(null) }
  }

  // ── Duplicate slide ───────────────────────────────────────────────
  const duplicateSlide = async (i: number) => {
    const slides = pres?.slides?.slides || []
    const s = slides[i]
    if (!s?.id) return
    try {
      const token = localStorage.getItem("thebigclass.accessToken")
      await fetch(`${apiBase()}/api/presentations/by-id/${id}/slides/${s.id}/duplicate`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: "include",
      })
      toast.success("Slide duplicated")
      await fetchPres()
    } catch { toast.error("Failed") }
  }

  // ── States ────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading...
      </div>
    )
  }

  if (!pres) {
    return (
      <div className="py-24 text-center">
        <p className="text-muted-foreground">Not found.</p>
        <Button asChild variant="outline" className="mt-4">
          <Link href="/dashboard/presentations">Back</Link>
        </Button>
      </div>
    )
  }

  // ── Generating state — polite message ─────────────────────────────

  if (pres.status === "generating") {
    return (
      <div className="flex flex-col items-center justify-center gap-5 py-20">
        <div className="relative">
          <div className="absolute inset-0 animate-ping rounded-full bg-violet-500/20" />
          <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-violet-50">
            <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
          </div>
        </div>
        <h2 className="text-xl font-bold">Creating your presentation...</h2>
        <p className="text-sm text-muted-foreground max-w-lg text-center leading-relaxed">
          Our AI is writing expert-level content, finding the perfect images, and building your slides.
          This usually takes 2-3 minutes for best quality.
        </p>
        <div className="flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-5 py-3 text-sm text-indigo-700">
          <Coffee className="h-4 w-4" />
          <span>
            <strong>Feel free to leave this page</strong> — we'll keep building in the background.
            Your presentation will be waiting for you when you come back.
          </span>
        </div>
        <Button asChild variant="outline" size="sm" className="mt-2">
          <Link href="/dashboard/presentations">← Back to presentations</Link>
        </Button>
      </div>
    )
  }

  if (pres.status === "failed") {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24">
        <PresentationIcon className="h-8 w-8 text-destructive" />
        <h2 className="text-xl font-bold">Generation failed</h2>
        <p className="text-sm text-muted-foreground max-w-md text-center">{pres.errorMessage || "Something went wrong. Try creating a new one."}</p>
        <Button asChild variant="outline">
          <Link href="/dashboard/presentations">Back</Link>
        </Button>
      </div>
    )
  }

  const slidesData = pres.slides
  const previews = slidesData?.previews ?? []
  const fullHtml = slidesData?.fullHtml ?? ""
  const slideInfos = slidesData?.slides ?? []

  // ── Presenter overlay ─────────────────────────────────────────────

  if (presenting && fullHtml) {
    return <PresenterView html={fullHtml} title={pres.title} onClose={() => setPresenting(false)} />
  }

  // ── Main view: slide grid + editor ────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link href="/dashboard/presentations"><ArrowLeft className="mr-1 h-4 w-4" /> Back</Link>
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{pres.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {pres.slideCount} slides · {new Date(pres.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" className="gap-2">
            <Link href={`/dashboard/presentations/${id}/edit`}>
              <Edit3 className="h-4 w-4" /> Edit
            </Link>
          </Button>
          <Button onClick={() => setPresenting(true)} disabled={!fullHtml} className="gap-2">
            <Play className="h-4 w-4" /> Present
          </Button>
          {pres.fileUrl && (
            <Button asChild variant="outline">
              <a href={pres.fileUrl} download target="_blank" rel="noopener noreferrer">
                <Download className="mr-1.5 h-4 w-4" /> .pptx
              </a>
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={handleDelete} className="text-destructive hover:bg-destructive/10">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Slide editor panel (when editing) */}
      {editingSlide !== null && (
        <Card className="border-indigo-300 bg-indigo-50/50">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Edit3 className="h-4 w-4 text-indigo-600" />
                Editing slide {editingSlide + 1}
              </h3>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setEditingSlide(null)}>
                  <X className="mr-1 h-3 w-3" /> Cancel
                </Button>
                <Button size="sm" onClick={saveEdit} disabled={saving} className="gap-1.5">
                  {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                  {saving ? "Saving..." : "Save changes"}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold">Title</label>
              <Input value={editTitle} onChange={e => setEditTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold">Body</label>
              <Textarea value={editBody} onChange={e => setEditBody(e.target.value)} rows={6} className="font-mono text-sm" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold">Bullets</label>
                <Button size="sm" variant="ghost" onClick={() => setEditBullets([...editBullets, ""])}>
                  <Plus className="mr-1 h-3 w-3" /> Add bullet
                </Button>
              </div>
              {editBullets.map((b, bi) => (
                <div key={bi} className="flex gap-2">
                  <Input
                    value={b}
                    onChange={e => { const nb = [...editBullets]; nb[bi] = e.target.value; setEditBullets(nb) }}
                    className="text-sm"
                  />
                  <Button size="sm" variant="ghost" onClick={() => setEditBullets(editBullets.filter((_, j) => j !== bi))} className="text-destructive shrink-0">
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
            {/* AI Actions */}
            <div className="space-y-2 border-t pt-3">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">AI Actions</label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: "expand", label: "📝 Expand", desc: "Add more detail" },
                  { id: "rewrite", label: "✏️ Rewrite", desc: "Fresh perspective" },
                  { id: "improve", label: "✨ Improve", desc: "Better quality" },
                  { id: "shorten", label: "✂️ Shorten", desc: "More concise" },
                  { id: "simpler", label: "🎯 Simpler", desc: "Easy language" },
                  { id: "persuasive", label: "💪 Persuasive", desc: "More compelling" },
                  { id: "fun", label: "🎉 Fun", desc: "Add humor & emojis" },
                  { id: "add-examples", label: "📚 Examples", desc: "Real-world examples" },
                  { id: "add-challenge", label: "🏆 Challenge", desc: "Add quiz/activity" },
                  { id: "technical", label: "🔧 Technical", desc: "More depth" },
                ].map(a => (
                  <button
                    key={a.id}
                    onClick={() => runAiAction(editingSlide!, a.id)}
                    disabled={aiLoading !== null}
                    title={a.desc}
                    className="rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition hover:border-indigo-300 hover:bg-indigo-50 disabled:opacity-50"
                  >
                    {aiLoading === `${editingSlide}-${a.id}` ? <Loader2 className="h-3 w-3 animate-spin inline mr-1" /> : null}
                    {a.label}
                  </button>
                ))}
              </div>
            </div>

            <p className="text-[11px] text-muted-foreground">
              Use **bold** for key terms, *italic* for examples, emojis for visual markers. Changes rebuild the slide HTML.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Slide grid */}
      {previews.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {previews.map((previewHtml, i) => (
            <div key={i} className="group relative">
              <button
                onClick={() => setPresenting(true)}
                className={cn(
                  "w-full overflow-hidden rounded-xl border shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:border-indigo-400 text-left",
                  editingSlide === i ? "border-indigo-500 ring-2 ring-indigo-500/20" : "border-slate-200",
                )}
              >
                <div className="relative aspect-video w-full overflow-hidden bg-white rounded-t-xl">
                  <SlideThumb previewHtml={previewHtml} className="w-full h-full" />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/20">
                    <span className="flex items-center gap-1.5 rounded-lg bg-white/90 px-3 py-1.5 text-xs font-semibold text-slate-800 shadow opacity-0 transition-all group-hover:opacity-100 scale-90 group-hover:scale-100">
                      <Play className="h-3 w-3" /> Present
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between border-t px-3 py-1.5 bg-slate-50">
                  <span className="text-[10px] font-semibold text-slate-500 truncate max-w-[60%]">
                    {i + 1}. {slideInfos[i]?.title || `Slide ${i + 1}`}
                  </span>
                </div>
              </button>

              {/* Edit/delete controls — visible on hover */}
              <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {/* <button
                  onClick={(e) => { e.stopPropagation(); startEdit(i) }}
                  className="flex h-7 w-7 items-center justify-center rounded-md bg-white/90 text-slate-600 shadow hover:bg-white hover:text-indigo-600 transition"
                  title="Edit slide"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                </button> */}
                <button
                  onClick={(e) => { e.stopPropagation(); duplicateSlide(i) }}
                  className="flex h-7 w-7 items-center justify-center rounded-md bg-white/90 text-slate-600 shadow hover:bg-white hover:text-indigo-600 transition"
                  title="Duplicate slide"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteSlide(i) }}
                  className="flex h-7 w-7 items-center justify-center rounded-md bg-white/90 text-slate-600 shadow hover:bg-white hover:text-destructive transition"
                  title="Delete slide"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Add slide button — between slides */}
              <button
                onClick={() => addSlide(i)}
                className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-indigo-500 text-white shadow opacity-0 group-hover:opacity-100 transition-opacity hover:scale-110"
                title="Add slide here"
              >
                <Plus className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed py-12 text-center text-muted-foreground">
          No slides available.
        </div>
      )}
    </div>
  )
}
