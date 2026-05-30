"use client"

// Slide editor — WYSIWYG with live preview, auto-save, image search.
// 3-panel layout: slide thumbnails | editor | live preview

import { use, useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Copy,
  Eye,
  Image as ImageIcon,
  Layout,
  Loader2,
  Plus,
  Search,
  Trash2,
  Upload,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { apiBase } from "@/lib/jitsi"
import { cn } from "@/lib/utils"
import { RichTextEditor } from "@/components/editor/rich-text-editor"
import { SlideThumb } from "@/components/presentations/slide-presenter"
import { uploadAsset } from "@/lib/upload-asset"

interface SlideData { id?: string; type: string; title: string; body?: string; bullets?: string[]; image?: string; [key: string]: unknown }
interface DeckState { version: number; title: string; slides: SlideData[]; fullHtml?: string; previews?: string[] }

const SLIDE_TYPES = [
  { value: "content", label: "📄 Content" },
  { value: "bullets", label: "📋 Bullet List" },
  { value: "icon_grid", label: "🔲 Icon Grid" },
  { value: "comparison", label: "⚖️ Compare" },
  { value: "process_flow", label: "🔄 Process" },
  { value: "quote", label: "💬 Quote" },
  { value: "big_number", label: "🔢 Big Number" },
  { value: "code_block", label: "💻 Code" },
  { value: "takeaways", label: "✅ Takeaways" },
  { value: "title", label: "🏠 Title" },
  { value: "closing", label: "🎬 Closing" },
]

export default function PresentationEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [deck, setDeck] = useState<DeckState | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [aiLoading, setAiLoading] = useState<string | null>(null)
  const [activeSlide, setActiveSlide] = useState(0)
  const [imgSearchOpen, setImgSearchOpen] = useState(false)
  const [imgQuery, setImgQuery] = useState("")
  const [imgResults, setImgResults] = useState<Array<{ url: string; thumb: string; source: string }>>([])
  const [imgSearching, setImgSearching] = useState(false)
  const [imgSource, setImgSource] = useState<"all" | "unsplash" | "pexels" | "pixabay">("all")
  const [imgStyle, setImgStyle] = useState("")
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const tkn = () => localStorage.getItem("thebigclass.accessToken") || ""
  const hdrs = () => ({ "Content-Type": "application/json", Authorization: `Bearer ${tkn()}` })

  const loadDeck = useCallback(async () => {
    try {
      const res = await fetch(`${apiBase()}/api/presentations/by-id/${id}/state`, { headers: { Authorization: `Bearer ${tkn()}` }, credentials: "include" })
      if (res.ok) { const data = await res.json(); setDeck(data.state) }
    } catch {} finally { setLoading(false) }
  }, [id])

  useEffect(() => { loadDeck() }, [loadDeck])

  // Auto-save with debounce
  const saveSlide = useCallback(async (slideId: string, patch: Partial<SlideData>) => {
    setSaving(true)
    try {
      await fetch(`${apiBase()}/api/presentations/by-id/${id}/slides/${slideId}`, {
        method: "PATCH", headers: hdrs(), credentials: "include", body: JSON.stringify(patch),
      })
      await loadDeck()
    } catch {} finally { setSaving(false) }
  }, [id, loadDeck])

  const debouncedSave = useCallback((slideId: string, patch: Partial<SlideData>) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => saveSlide(slideId, patch), 1200)
  }, [saveSlide])

  // Local state update (instant) + debounced save (delayed)
  const updateLocal = (index: number, patch: Partial<SlideData>) => {
    if (!deck) return
    const ns = [...deck.slides]; ns[index] = { ...ns[index], ...patch }
    setDeck({ ...deck, slides: ns })
    const slideId = ns[index].id
    if (slideId) debouncedSave(slideId, patch)
  }

  const addSlide = async (afterId?: string) => {
    await fetch(`${apiBase()}/api/presentations/by-id/${id}/slides`, {
      method: "POST", headers: hdrs(), credentials: "include",
      body: JSON.stringify({ slide: { type: "content", title: "New Slide", body: "<p>Start writing here...</p>", bullets: [] }, afterSlideId: afterId }),
    }).catch(() => {})
    await loadDeck(); toast.success("Added")
  }
  const delSlide = async (slideId: string) => {
    if ((deck?.slides.length || 0) <= 2) { toast.error("Min 2 slides"); return }
    await fetch(`${apiBase()}/api/presentations/by-id/${id}/slides/${slideId}`, { method: "DELETE", headers: hdrs(), credentials: "include" }).catch(() => {})
    await loadDeck(); setActiveSlide(Math.max(0, activeSlide - 1)); toast.success("Deleted")
  }
  const dupSlide = async (slideId: string) => {
    await fetch(`${apiBase()}/api/presentations/by-id/${id}/slides/${slideId}/duplicate`, { method: "POST", headers: hdrs(), credentials: "include" }).catch(() => {})
    await loadDeck(); toast.success("Duplicated")
  }
  const reorder = async (from: number, dir: "up" | "down") => {
    if (!deck) return; const to = dir === "up" ? from - 1 : from + 1
    if (to < 0 || to >= deck.slides.length) return
    const ids = deck.slides.map(s => s.id || '').filter(Boolean)
    ;[ids[from], ids[to]] = [ids[to], ids[from]]
    await fetch(`${apiBase()}/api/presentations/by-id/${id}/reorder`, { method: "PUT", headers: hdrs(), credentials: "include", body: JSON.stringify({ slideIds: ids }) }).catch(() => {})
    setActiveSlide(to); await loadDeck()
  }
  const aiAction = async (slideId: string, action: string) => {
    setAiLoading(action)
    try {
      const res = await fetch(`${apiBase()}/api/presentations/by-id/${id}/slides/${slideId}/ai-action`, {
        method: "POST", headers: hdrs(), credentials: "include", body: JSON.stringify({ action }),
      })
      if (res.ok) { toast.success(`✨ ${action}`); await loadDeck() } else toast.error("Failed")
    } catch {} finally { setAiLoading(null) }
  }
  const uploadImage = async (slideId: string) => {
    const input = document.createElement("input"); input.type = "file"; input.accept = "image/*"
    input.onchange = async () => {
      const file = input.files?.[0]; if (!file) return
      try { const { url } = await uploadAsset(file, "general"); await saveSlide(slideId, { image: url }); toast.success("Uploaded") } catch { toast.error("Failed") }
    }; input.click()
  }
  const searchImages = async () => {
    if (!imgQuery.trim()) return; setImgSearching(true)
    const q = imgStyle ? `${imgQuery} ${imgStyle}` : imgQuery
    try {
      const res = await fetch(`${apiBase()}/api/presentations/search-images?q=${encodeURIComponent(q)}`, { headers: { Authorization: `Bearer ${tkn()}` }, credentials: "include" })
      if (res.ok) { const d = await res.json(); setImgResults(d.images || []) }
    } catch {} finally { setImgSearching(false) }
  }

  // Store body as HTML directly — no markdown conversion needed
  const bodyAsHtml = (body: string) => {
    if (!body) return ""
    if (body.startsWith("<")) return body
    // One-time convert old markdown-style content to HTML
    return body
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      .replace(/\n/g, "<br/>")
  }

  if (loading) return <div className="flex items-center justify-center py-24"><Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading editor...</div>
  if (!deck) return <div className="py-24 text-center text-muted-foreground">Not found</div>

  const slide = deck.slides[activeSlide]
  const preview = deck.previews?.[activeSlide] || ""

  return (
    <div className="flex h-screen flex-col bg-slate-50">
      {/* Top bar */}
      <div className="flex items-center justify-between border-b bg-white px-4 py-2 shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.push(`/dashboard/presentations/${id}`)}>
            <ArrowLeft className="mr-1 h-4 w-4" /> Back
          </Button>
          <span className="text-sm font-semibold truncate max-w-[200px]">{deck.title}</span>
          {saving && <Badge variant="outline" className="text-[9px] animate-pulse">Auto-saving...</Badge>}
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href={`/dashboard/presentations/${id}`}><Eye className="mr-1 h-3.5 w-3.5" /> Preview & Present</Link>
        </Button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* ── Left: slide thumbnails ──────────────────────────────── */}
        <div className="w-48 shrink-0 border-r bg-white overflow-y-auto p-2 space-y-1">
          {deck.slides.map((s, i) => (
            <div key={s.id || i} className="group relative">
              <button onClick={() => setActiveSlide(i)} className={cn(
                "w-full rounded-lg border p-1 text-left transition-all",
                i === activeSlide ? "border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-50" : "border-transparent hover:border-slate-200"
              )}>
                <div className="aspect-video w-full rounded bg-slate-100 overflow-hidden">
                  {deck.previews?.[i] && <SlideThumb previewHtml={deck.previews[i]} className="w-full h-full" />}
                </div>
                <p className="text-[9px] font-medium text-slate-500 truncate px-0.5 mt-0.5">{i + 1}. {s.title?.slice(0, 20)}</p>
              </button>
              <div className="absolute top-0.5 right-0.5 flex flex-col gap-px opacity-0 group-hover:opacity-100 transition">
                {i > 0 && <button onClick={() => reorder(i, "up")} className="h-4 w-4 rounded bg-white shadow text-slate-400 hover:text-indigo-600 flex items-center justify-center"><ArrowUp className="h-2.5 w-2.5" /></button>}
                {i < deck.slides.length - 1 && <button onClick={() => reorder(i, "down")} className="h-4 w-4 rounded bg-white shadow text-slate-400 hover:text-indigo-600 flex items-center justify-center"><ArrowDown className="h-2.5 w-2.5" /></button>}
              </div>
            </div>
          ))}
          <button onClick={() => addSlide(deck.slides[deck.slides.length - 1]?.id)} className="w-full rounded-lg border border-dashed py-2 text-[10px] text-slate-400 hover:text-indigo-500 hover:border-indigo-400 transition">
            <Plus className="h-3 w-3 inline mr-0.5" /> Add slide
          </button>
        </div>

        {/* ── Center: editor ─────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto">
          {slide && (
            <div className="mx-auto max-w-3xl p-6 space-y-5">
              {/* Toolbar */}
              <div className="flex items-center justify-between bg-white rounded-xl border px-3 py-2 shadow-sm">
                <div className="flex items-center gap-2">
                  <Select value={slide.type} onValueChange={v => { updateLocal(activeSlide, { type: v }); slide.id && saveSlide(slide.id, { type: v }) }}>
                    <SelectTrigger className="h-8 w-36 text-xs border-0 bg-slate-50">
                      <Layout className="h-3 w-3 mr-1 text-indigo-500" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>{SLIDE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-1">
                  {[
                    { id: "expand", emoji: "📝" },
                    { id: "improve", emoji: "✨" },
                    { id: "rewrite", emoji: "✏️" },
                    { id: "fun", emoji: "🎉" },
                    { id: "add-challenge", emoji: "🏆" },
                    { id: "simpler", emoji: "🎯" },
                  ].map(a => (
                    <button key={a.id} onClick={() => slide.id && aiAction(slide.id, a.id)} disabled={!!aiLoading}
                      className="h-7 w-7 rounded-md border flex items-center justify-center text-xs hover:bg-indigo-50 hover:border-indigo-300 transition disabled:opacity-40" title={a.id} aria-label={`AI: ${a.id}`}>
                      {aiLoading === a.id ? <Loader2 className="h-3 w-3 animate-spin" /> : a.emoji}
                    </button>
                  ))}
                  <div className="w-px h-5 bg-slate-200 mx-1" />
                  <button onClick={() => slide.id && dupSlide(slide.id)} className="h-7 w-7 rounded-md border flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition" title="Duplicate" aria-label="Duplicate slide"><Copy className="h-3 w-3" /></button>
                  <button onClick={() => slide.id && delSlide(slide.id)} className="h-7 w-7 rounded-md border flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 transition" title="Delete" aria-label="Delete slide"><Trash2 className="h-3 w-3" /></button>
                </div>
              </div>

              {/* Title */}
              <input
                value={slide.title || ""}
                onChange={e => updateLocal(activeSlide, { title: e.target.value })}
                onBlur={() => slide.id && saveSlide(slide.id, { title: slide.title })}
                className="w-full text-3xl font-bold bg-transparent outline-none placeholder:text-slate-300 py-2"
                placeholder="Slide title..."
              />

              {/* Image with search */}
              {/* Image block — optional, can be removed */}
              <div className="rounded-2xl overflow-hidden bg-gradient-to-br from-slate-100 to-slate-50 group/img relative">
                {slide.image?.startsWith("http") ? (
                  <img src={slide.image} alt="" className="w-full h-56 object-cover" loading="lazy" />
                ) : (
                  <div className="w-full h-28 flex items-center justify-center"><ImageIcon className="h-8 w-8 text-slate-200" /></div>
                )}
                <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/0 group-hover/img:bg-black/30 transition">
                  <button onClick={() => slide.id && uploadImage(slide.id)} className="opacity-0 group-hover/img:opacity-100 transition rounded-xl bg-white px-3 py-1.5 text-xs font-semibold shadow-lg flex items-center gap-1.5 hover:bg-indigo-50">
                    <Upload className="h-3.5 w-3.5" /> Upload
                  </button>
                  <button onClick={() => { setImgSearchOpen(!imgSearchOpen); setImgQuery(slide.title || "") }} className="opacity-0 group-hover/img:opacity-100 transition rounded-xl bg-white px-3 py-1.5 text-xs font-semibold shadow-lg flex items-center gap-1.5 hover:bg-indigo-50">
                    <Search className="h-3.5 w-3.5" /> Search
                  </button>
                  {slide.image && (
                    <button onClick={async () => { if (slide.id) { await saveSlide(slide.id, { image: '' }); toast.success("Image removed") } }} className="opacity-0 group-hover/img:opacity-100 transition rounded-xl bg-white px-3 py-1.5 text-xs font-semibold shadow-lg flex items-center gap-1.5 text-red-500 hover:bg-red-50">
                      <Trash2 className="h-3.5 w-3.5" /> Remove
                    </button>
                  )}
                </div>
              </div>

              {/* Image search panel with filters */}
              {imgSearchOpen && (
                <div className="rounded-2xl border bg-white p-4 shadow-sm space-y-3">
                  {/* Search bar */}
                  <div className="flex gap-2">
                    <Input value={imgQuery} onChange={e => setImgQuery(e.target.value)} onKeyDown={e => { if (e.key === "Enter") searchImages() }} placeholder="Search images..." className="text-sm" />
                    <Button size="sm" onClick={searchImages} disabled={imgSearching} className="shrink-0">
                      {imgSearching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setImgSearchOpen(false)} className="shrink-0 text-xs">Close</Button>
                  </div>

                  {/* Style filter pills */}
                  <div className="flex flex-wrap gap-1.5">
                    <span className="text-[10px] font-semibold text-slate-400 mr-1 self-center">Style:</span>
                    {["", "photography", "illustration", "3d render", "minimalist", "hand drawn", "flat design", "abstract"].map(s => (
                      <button key={s} onClick={() => { setImgStyle(s); if (imgQuery.trim()) searchImages() }}
                        className={cn("rounded-full px-2.5 py-0.5 text-[10px] font-semibold border transition",
                          imgStyle === s ? "border-indigo-500 bg-indigo-50 text-indigo-700" : "border-slate-200 text-slate-500 hover:border-indigo-300"
                        )}>
                        {s || "All"}
                      </button>
                    ))}
                  </div>

                  {/* Source filter tabs */}
                  <div className="flex gap-1">
                    {([["all", "All Sources"], ["unsplash", "Unsplash"], ["pexels", "Pexels"], ["pixabay", "Pixabay"]] as const).map(([id, label]) => (
                      <button key={id} onClick={() => setImgSource(id)}
                        className={cn("rounded-md px-2.5 py-1 text-[10px] font-semibold transition",
                          imgSource === id ? "bg-indigo-500 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                        )}>
                        {label}
                        {imgResults.length > 0 && (
                          <span className="ml-1 opacity-70">
                            {id === "all" ? imgResults.length : imgResults.filter(r => r.source === id).length}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>

                  {/* Results grid */}
                  {(() => {
                    const filtered = imgSource === "all" ? imgResults : imgResults.filter(r => r.source === imgSource)
                    return filtered.length > 0 ? (
                      <div className="grid grid-cols-5 gap-2 max-h-72 overflow-y-auto">
                        {filtered.map((img, i) => (
                          <button key={i} onClick={async () => { if (slide.id) { await saveSlide(slide.id, { image: img.url }); setImgSearchOpen(false); toast.success("Image set") } }}
                            className="rounded-lg overflow-hidden border-2 border-transparent hover:border-indigo-500 transition relative">
                            <img src={img.thumb} alt="" className="w-full h-16 object-cover" loading="lazy" />
                            <span className="absolute bottom-0 right-0 bg-black/50 text-white text-[7px] px-1 rounded-tl">{img.source}</span>
                          </button>
                        ))}
                      </div>
                    ) : imgSearching ? null : imgQuery.trim() ? (
                      <p className="text-xs text-slate-400 text-center py-4">No images found. Try different keywords or style.</p>
                    ) : null
                  })()}
                </div>
              )}


              {/* Body — WYSIWYG */}
              <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
                <RichTextEditor
                  value={bodyAsHtml(slide.body || "")}
                  onChange={html => {
                    const text = html.replace(/<[^>]+>/g, '')
                    if (text.length <= 5000) updateLocal(activeSlide, { body: html })
                    else toast.error("Content limit: 5000 characters max")
                  }}
                  placeholder="Write your content here — bold, italic, lists, images all work!"
                  minHeight={Math.max(80, Math.min(500, (slide.body || "").replace(/<[^>]+>/g, '').length / 2))}
                  folder="general"
                />
                <div className="flex justify-end px-3 py-1 border-t bg-slate-50">
                  <span className={cn("text-[10px] tabular-nums", (slide.body || "").replace(/<[^>]+>/g, '').length > 4500 ? "text-red-500 font-semibold" : "text-slate-400")}>
                    {(slide.body || "").replace(/<[^>]+>/g, '').length} / 5000
                  </span>
                </div>
              </div>

              {/* Bullets */}
              {(slide.type === "bullets" || slide.type === "content" || slide.type === "takeaways" || (slide.bullets?.length || 0) > 0) && (
                <div className="rounded-2xl border bg-white shadow-sm p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Key Points</p>
                    <button onClick={() => { const nb = [...(slide.bullets || []), "New point"]; updateLocal(activeSlide, { bullets: nb }); slide.id && saveSlide(slide.id, { bullets: nb }) }}
                      className="text-xs text-indigo-500 hover:text-indigo-700 font-semibold flex items-center gap-1"><Plus className="h-3 w-3" /> Add</button>
                  </div>
                  {(slide.bullets || []).map((b, bi) => (
                    <div key={bi} className="flex items-start gap-2 group/b">
                      <span className="mt-2.5 w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 text-[10px] font-bold flex items-center justify-center shrink-0">{bi + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div
                          contentEditable
                          suppressContentEditableWarning
                          className="text-sm bg-slate-50 rounded-lg px-3 py-2 min-h-[36px] focus:bg-white focus:ring-1 focus:ring-indigo-300 focus:outline-none [&_strong]:font-bold [&_em]:italic [&_em]:text-indigo-600"
                          dangerouslySetInnerHTML={{
                            __html: b.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(.+?)\*/g, '<em>$1</em>')
                          }}
                          onBlur={e => {
                            const html = e.currentTarget.innerHTML
                            const md = html.replace(/<strong>(.*?)<\/strong>/g, '**$1**').replace(/<em>(.*?)<\/em>/g, '*$1*').replace(/<br\s*\/?>/g, ' ').replace(/<[^>]+>/g, '')
                            const nb = [...(slide.bullets || [])]; nb[bi] = md; updateLocal(activeSlide, { bullets: nb })
                            slide.id && saveSlide(slide.id, { bullets: nb })
                          }}
                        />
                      </div>
                      <button onClick={() => { const nb = (slide.bullets || []).filter((_, j) => j !== bi); updateLocal(activeSlide, { bullets: nb }); slide.id && saveSlide(slide.id, { bullets: nb }) }}
                        className="opacity-0 group-hover/b:opacity-100 text-slate-300 hover:text-red-500 p-1 mt-1.5 transition"><Trash2 className="h-3 w-3" /></button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add slide between */}
              <div className="flex justify-center">
                <button onClick={() => addSlide(slide.id)} className="rounded-full border border-dashed border-slate-300 px-5 py-1.5 text-[10px] text-slate-400 hover:border-indigo-400 hover:text-indigo-500 transition">
                  <Plus className="h-3 w-3 inline mr-1" /> Add slide below
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Right: live preview ─────────────────────────────────── */}
        <div className="w-72 shrink-0 border-l bg-white overflow-y-auto p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Preview</p>
            <Badge variant="outline" className="text-[9px]">Slide {activeSlide + 1}</Badge>
          </div>
          {preview ? (
            <div className="rounded-xl overflow-hidden border shadow-sm">
              <div className="aspect-video"><SlideThumb previewHtml={preview} className="w-full h-full" /></div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed h-36 flex items-center justify-center text-[10px] text-slate-400">Save to preview</div>
          )}
          <p className="text-[10px] text-slate-400 text-center">How it looks when presenting</p>

          {/* Quick info */}
          <div className="rounded-xl bg-slate-50 p-3 space-y-1.5">
            <p className="text-[10px] font-bold text-slate-500">Slide info</p>
            <p className="text-[10px] text-slate-400">Type: {SLIDE_TYPES.find(t => t.value === slide?.type)?.label || slide?.type}</p>
            <p className="text-[10px] text-slate-400">Words: {(((slide?.body || "").replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length) + ((slide?.bullets || []).reduce((n, b) => n + b.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length, 0)))}</p>
            <p className="text-[10px] text-slate-400">Image: {slide?.image ? "✅" : "❌"}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
