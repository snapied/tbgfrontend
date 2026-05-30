"use client"

// 3-step wizard: Topic → Pick & edit outline + style → Generate
// Step 1: Topic + audience + grade (simple)
// Step 2: Two AI outlines, editable, + visual style picker
// Step 3: Generate → redirect to detail page

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Edit3,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
  Wand2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { apiBase } from "@/lib/jitsi"
import { cn } from "@/lib/utils"

interface OutlineSlide { title: string; purpose: string; type: string }
interface OutlineOption { name: string; description: string; slides: OutlineSlide[] }

// ─── Pill picker ────────────────────────────────────────────────────
function Pills({ options, value, onChange }: {
  options: Array<{ id: string; label: string; desc?: string }>
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(o => (
        <button key={o.id} type="button" onClick={() => onChange(o.id)}
          className={cn("rounded-full border px-4 py-1.5 text-xs font-semibold transition-all",
            value === o.id ? "border-indigo-500 bg-indigo-50 text-indigo-700 ring-1 ring-indigo-500/30" : "border-border hover:border-indigo-300"
          )}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

// ─── Steps bar ──────────────────────────────────────────────────────
function StepBar({ current }: { current: number }) {
  const steps = ["Topic", "Outline & Style", "Generate"]
  return (
    <div className="flex items-center gap-1 mb-6">
      {steps.map((label, i) => (
        <div key={i} className="flex items-center gap-1.5 flex-1">
          <div className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
            current > i + 1 ? "bg-indigo-500 text-white" : current === i + 1 ? "bg-indigo-100 text-indigo-700 ring-2 ring-indigo-500" : "bg-muted text-muted-foreground"
          )}>{current > i + 1 ? <Check className="h-3.5 w-3.5" /> : i + 1}</div>
          <span className={cn("hidden text-xs font-medium sm:inline", current >= i + 1 ? "text-foreground" : "text-muted-foreground")}>{label}</span>
          {i < steps.length - 1 && <div className={cn("flex-1 h-px mx-2", current > i + 1 ? "bg-indigo-500" : "bg-border")} />}
        </div>
      ))}
    </div>
  )
}

// ─── Main wizard ────────────────────────────────────────────────────
export function PresentationWizard({ onClose }: { onClose: () => void }) {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)

  // Step 1
  const [topic, setTopic] = useState("")
  const [context, setContext] = useState("")
  const [grade, setGrade] = useState("middle")
  const [audience, setAudience] = useState("")
  const [slideCount, setSlideCount] = useState(10)

  // Step 2 — outlines
  const [outlineA, setOutlineA] = useState<OutlineOption | null>(null)
  const [outlineB, setOutlineB] = useState<OutlineOption | null>(null)
  const [chosen, setChosen] = useState<"A" | "B" | null>(null)
  const [editSlides, setEditSlides] = useState<OutlineSlide[]>([])
  const [editIdx, setEditIdx] = useState<number | null>(null)

  // Step 2 — style config
  const [imageStyle, setImageStyle] = useState("photography")
  const [tone, setTone] = useState("educational")
  const [outcome, setOutcome] = useState("teach")

  // Pick outline → copy for editing
  const pick = (key: "A" | "B") => {
    setChosen(key)
    const slides = key === "A" ? outlineA?.slides : outlineB?.slides
    setEditSlides(slides ? slides.map(s => ({ ...s })) : [])
  }

  // Step 1 → 2: generate outlines
  const handleOutlines = async () => {
    if (!topic.trim()) { toast.error("Enter a topic"); return }
    if (topic.trim().length < 3) { toast.error("Topic must be at least 3 characters"); return }
    setLoading(true)
    try {
      const token = localStorage.getItem("thebigclass.accessToken")
      const res = await fetch(`${apiBase()}/api/presentations/wizard/outlines`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        credentials: "include",
        body: JSON.stringify({ topic, context, gradeLevel: grade, audience, slideCount }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Server error" }))
        toast.error(err.error || `Failed (${res.status})`)
        return
      }
      const data = await res.json()
      setOutlineA(data.optionA)
      setOutlineB(data.optionB)
      setStep(2)
    } catch { toast.error("Network error") }
    finally { setLoading(false) }
  }

  // Step 2 → Generate
  const handleGenerate = async () => {
    if (editSlides.length === 0) { toast.error("No slides"); return }
    setLoading(true)
    try {
      const token = localStorage.getItem("thebigclass.accessToken")
      const res = await fetch(`${apiBase()}/api/presentations/wizard/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        credentials: "include",
        body: JSON.stringify({
          config: { topic, context, gradeLevel: grade, audience, slideCount, personality: tone, imageStyle },
          outline: editSlides,
        }),
      })
      if (!res.ok) { toast.error("Failed to start"); return }
      const data = await res.json()
      if (data.presentationId) {
        toast.success("Generating your presentation...")
        router.push(`/dashboard/presentations/${data.presentationId}`)
      }
    } catch { toast.error("Network error") }
    finally { setLoading(false) }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 py-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={step === 1 ? onClose : () => setStep(step - 1)}>
          <ArrowLeft className="mr-1 h-4 w-4" /> {step === 1 ? "Back" : "Previous"}
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">New Presentation</h1>
          <p className="text-sm text-muted-foreground">
            {step === 1 && "What do you want to present?"}
            {step === 2 && "Pick an outline and customize it"}
          </p>
        </div>
      </div>

      <StepBar current={step} />

      {/* ═══════════════════════════════════════════════════════════════
          STEP 1 — TOPIC & AUDIENCE
          ═══════════════════════════════════════════════════════════════ */}
      {step === 1 && (
        <div className="space-y-6">
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Topic <span className="text-destructive">*</span></Label>
            <Input autoFocus value={topic} onChange={e => setTopic(e.target.value)}
              placeholder="e.g. What Is a Noun?, Photosynthesis, AWS Cloud Computing..." className="text-lg h-12" />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-semibold">
              Additional context <span className="text-muted-foreground font-normal">(optional — helps AI write better content)</span>
            </Label>
            <textarea
              value={context}
              onChange={e => setContext(e.target.value.slice(0, 1500))}
              placeholder={"Paste notes, key points, or describe what you want covered.\n\nExamples:\n• Key subtopics: Common nouns, Proper nouns, Abstract vs Concrete\n• Focus on practical examples and activities\n• Include a quiz at the end\n• Cover chapters 3-5 from the textbook\n• Must mention: AWS EC2, S3, Lambda, IAM roles"}
              className="w-full rounded-xl border bg-background px-4 py-3 text-sm leading-relaxed resize-y min-h-[100px] max-h-[200px] placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
              rows={4}
            />
            <p className="text-[10px] text-muted-foreground text-right">{context.length} / 1500</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Who is this for?</Label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: "primary", label: "Primary", desc: "Class 1-5" },
                  { id: "middle", label: "Middle", desc: "Class 6-8" },
                  { id: "high", label: "High School", desc: "Class 9-12" },
                  { id: "college", label: "College+", desc: "Adults" },
                ].map(g => (
                  <button key={g.id} type="button" onClick={() => setGrade(g.id)}
                    className={cn("rounded-xl border p-2.5 text-center transition-all",
                      grade === g.id ? "border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500/20" : "border-border hover:border-indigo-300"
                    )}>
                    <span className="block text-xs font-semibold">{g.label}</span>
                    <span className="block text-[10px] text-muted-foreground">{g.desc}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Slides</Label>
              <div className="flex gap-2">
                {[6, 8, 10, 12, 15].map(n => (
                  <button key={n} type="button" onClick={() => setSlideCount(n)}
                    className={cn("flex-1 rounded-xl border py-2 text-sm font-semibold transition-all",
                      slideCount === n ? "border-indigo-500 bg-indigo-50 text-indigo-700" : "border-border hover:border-indigo-300"
                    )}>{n}</button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-semibold">Audience detail (optional)</Label>
            <Input value={audience} onChange={e => setAudience(e.target.value)}
              placeholder="e.g. CBSE Class 3 students, MBA first-year, science teachers..." />
          </div>

          <Button onClick={handleOutlines} disabled={loading || !topic.trim()} size="lg" className="w-full gap-2 h-12">
            {loading ? <><Loader2 className="h-5 w-5 animate-spin" /> Creating outlines...</> : <><Wand2 className="h-5 w-5" /> Generate two outlines</>}
          </Button>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          STEP 2 — PICK OUTLINE + EDIT + VISUAL STYLE
          ═══════════════════════════════════════════════════════════════ */}
      {step === 2 && (
        <div className="space-y-6">
          {/* Two outline options */}
          <div className="grid gap-4 lg:grid-cols-2">
            {([
              { key: "A" as const, opt: outlineA },
              { key: "B" as const, opt: outlineB },
            ]).map(({ key, opt }) => opt && (
              <Card key={key} className={cn("cursor-pointer transition-all",
                chosen === key ? "border-indigo-500 ring-2 ring-indigo-500/20" : "hover:border-indigo-300"
              )} onClick={() => pick(key)}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Badge variant={chosen === key ? "default" : "outline"} className="mb-1">Option {key}</Badge>
                      <h3 className="text-sm font-bold">{opt.name}</h3>
                      <p className="text-xs text-muted-foreground">{opt.description}</p>
                    </div>
                    {chosen === key && <div className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-500 text-white shrink-0"><Check className="h-3.5 w-3.5" /></div>}
                  </div>
                  <div className="space-y-1 max-h-[200px] overflow-y-auto">
                    {opt.slides.map((s, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs rounded-md bg-muted/50 px-2 py-1.5">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-background text-[10px] font-bold text-muted-foreground border">{i + 1}</span>
                        <div className="min-w-0">
                          <p className="font-semibold truncate">{s.title}</p>
                          <p className="text-muted-foreground truncate">{s.purpose}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Editable outline */}
          {chosen && editSlides.length > 0 && (
            <Card>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold">Your outline</p>
                    <p className="text-xs text-muted-foreground">Click to rename, drag to reorder, or add/remove slides.</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => setEditSlides(prev => [...prev, { title: "New Slide", purpose: "Custom content", type: "content" }])} className="gap-1">
                    <Plus className="h-3 w-3" /> Add
                  </Button>
                </div>
                <div className="space-y-1">
                  {editSlides.map((s, i) => (
                    <div key={i} className="flex items-center gap-2 rounded-md border bg-background px-3 py-2 group">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-indigo-100 text-[10px] font-bold text-indigo-700">{i + 1}</span>
                      {editIdx === i ? (
                        <Input autoFocus value={s.title} onChange={e => { const t = e.target.value; setEditSlides(prev => prev.map((x, j) => j === i ? { ...x, title: t } : x)) }}
                          onBlur={() => setEditIdx(null)} onKeyDown={e => { if (e.key === "Enter") setEditIdx(null) }} className="h-7 text-sm flex-1" />
                      ) : (
                        <span className="flex-1 text-sm font-medium truncate cursor-pointer hover:text-indigo-600" onClick={() => setEditIdx(i)}>{s.title}</span>
                      )}
                      <Badge variant="outline" className="text-[9px] shrink-0">{s.type}</Badge>
                      <button onClick={() => setEditIdx(i)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground"><Edit3 className="h-3 w-3" /></button>
                      {editSlides.length > 3 && <button onClick={() => setEditSlides(prev => prev.filter((_, j) => j !== i))} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"><Trash2 className="h-3 w-3" /></button>}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Visual style + tone */}
          {chosen && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Card><CardContent className="p-4 space-y-3">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Image style</Label>
                <Pills value={imageStyle} onChange={setImageStyle} options={[
                  { id: "photography", label: "Photography" },
                  { id: "illustration", label: "Illustrations" },
                  { id: "flat", label: "Flat / Modern" },
                  { id: "3d", label: "3D Renders" },
                  { id: "sketch", label: "Hand-drawn" },
                  { id: "minimal", label: "Minimal" },
                  { id: "mixed", label: "Mixed" },
                ]} />
              </CardContent></Card>

              <Card><CardContent className="p-4 space-y-3">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Tone</Label>
                <Pills value={tone} onChange={setTone} options={[
                  { id: "educational", label: "Educational" },
                  { id: "professional", label: "Professional" },
                  { id: "inspirational", label: "Inspirational" },
                  { id: "playful", label: "Playful" },
                  { id: "technical", label: "Technical" },
                  { id: "persuasive", label: "Persuasive" },
                ]} />
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mt-3">Goal</Label>
                <Pills value={outcome} onChange={setOutcome} options={[
                  { id: "teach", label: "Teach" },
                  { id: "inform", label: "Inform" },
                  { id: "inspire", label: "Inspire" },
                  { id: "persuade", label: "Persuade" },
                  { id: "train", label: "Train" },
                  { id: "sell", label: "Sell" },
                ]} />
              </CardContent></Card>
            </div>
          )}

          {/* Generate button */}
          <Button onClick={handleGenerate} disabled={loading || !chosen || editSlides.length === 0} size="lg" className="w-full gap-2 h-12">
            {loading ? <><Loader2 className="h-5 w-5 animate-spin" /> Generating presentation...</> : <><Sparkles className="h-5 w-5" /> Generate {editSlides.length}-slide presentation</>}
          </Button>
        </div>
      )}
    </div>
  )
}
