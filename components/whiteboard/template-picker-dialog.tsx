"use client"

// Template picker shown on every "+ New board" click.
//
// We render this every time (not just empty state) because teachers
// reach for the same five-or-six templates over a term — Lesson plan
// on Monday, Frayer model on Wednesday, KWL at the start of a unit.
// Forcing a tap-to-choose makes "the right starting layout" the
// default, not "blank canvas first, then redraw the grid by hand."
//
// With 18 templates the picker now also has:
//   • Fuzzy search across title + description
//   • Subject filter chips (Engineering / Management / Science / …)
//   • Stable 3-per-row grid so cards stay scannable
//
// Each card carries a hand-rolled CSS swatch that previews the actual
// scene layout — much faster than mounting Excalidraw to render a
// real preview, and a true representation of what the teacher will
// land on.

import { useEffect, useMemo, useRef, useState } from "react"
import {
  Presentation,
  Lightbulb,
  CalendarRange,
  Sparkles,
  FileText,
  ArrowRight,
  Target,
  Network,
  Fish,
  ListChecks,
  Grid3x3,
  UserCircle2,
  Brain,
  CalendarClock,
  HelpCircle,
  Circle,
  RefreshCw,
  Goal,
  Film,
  FlaskConical,
  GitBranch,
  Search as SearchIcon,
  Filter,
  Check,
  Baby,
  Hash,
  Shapes,
  PieChart,
  Languages,
  FunctionSquare,
  Atom,
  TrendingUp,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { fuzzySearch } from "@/lib/fuzzy-search"
import {
  WHITEBOARD_TEMPLATES,
  TEMPLATE_SUBJECTS,
  type TemplateKey,
  type Subject,
} from "@/lib/whiteboard-templates"

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  onPick: (template: TemplateKey) => void
}

type SwatchFn = () => React.ReactNode

interface CardVisual {
  icon: typeof Presentation
  accent: string
  swatch: SwatchFn
}

const VISUALS: Record<Exclude<TemplateKey, "blank">, CardVisual> = {
  "lesson-plan": {
    icon: Presentation,
    accent: "from-sky-500 to-blue-600",
    swatch: () => (
      <div className="grid h-full w-full grid-cols-2 grid-rows-2 gap-1.5 p-2">
        <div className="rounded-md bg-blue-200/80" />
        <div className="rounded-md bg-amber-200/80" />
        <div className="rounded-md bg-emerald-200/80" />
        <div className="rounded-md bg-pink-200/80" />
      </div>
    ),
  },
  brainstorm: {
    icon: Lightbulb,
    accent: "from-amber-500 to-orange-600",
    swatch: () => (
      <div className="relative h-full w-full p-2">
        <div className="absolute left-1/2 top-1/2 h-5 w-10 -translate-x-1/2 -translate-y-1/2 rounded-md bg-slate-800" />
        {[
          { top: "8%", left: "20%", bg: "bg-yellow-200" },
          { top: "8%", right: "20%", bg: "bg-sky-200" },
          { bottom: "8%", left: "20%", bg: "bg-pink-200" },
          { bottom: "8%", right: "20%", bg: "bg-emerald-200" },
          { top: "42%", left: "8%", bg: "bg-violet-200" },
          { top: "42%", right: "8%", bg: "bg-orange-200" },
        ].map((s, i) => (
          <div key={i} className={cn("absolute h-3.5 w-4 rounded-sm", s.bg)} style={s} />
        ))}
      </div>
    ),
  },
  "weekly-schedule": {
    icon: CalendarRange,
    accent: "from-emerald-500 to-teal-600",
    swatch: () => (
      <div className="flex h-full w-full flex-col gap-1 p-2">
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className={cn("h-2.5 rounded-sm", i === 2 ? "bg-slate-800" : "bg-slate-300")} />
          ))}
        </div>
        <div className="grid flex-1 grid-cols-7 gap-1">
          {Array.from({ length: 21 }).map((_, i) => (
            <div key={i} className="rounded-sm border border-dashed border-slate-300" />
          ))}
        </div>
      </div>
    ),
  },
  swot: {
    icon: Target,
    accent: "from-violet-500 to-purple-600",
    swatch: () => (
      <div className="grid h-full w-full grid-cols-2 grid-rows-2 gap-1 p-2">
        {[
          { body: "bg-emerald-200/80", head: "bg-emerald-600" },
          { body: "bg-amber-200/80", head: "bg-amber-600" },
          { body: "bg-blue-200/80", head: "bg-blue-600" },
          { body: "bg-red-200/80", head: "bg-red-600" },
        ].map((c, i) => (
          <div key={i} className={cn("flex flex-col rounded-md", c.body)}>
            <div className={cn("h-1.5 w-full rounded-t-md", c.head)} />
          </div>
        ))}
      </div>
    ),
  },
  persona: {
    icon: UserCircle2,
    accent: "from-rose-500 to-pink-600",
    swatch: () => (
      <div className="flex h-full w-full flex-col gap-1 p-2">
        <div className="flex items-center gap-1.5 rounded-md bg-slate-100 p-1.5">
          <div className="h-5 w-5 rounded-full bg-slate-800" />
          <div className="flex flex-1 flex-col gap-0.5">
            <div className="h-1.5 w-2/3 rounded-sm bg-slate-700" />
            <div className="h-1 w-1/2 rounded-sm bg-slate-400" />
          </div>
        </div>
        <div className="grid flex-1 grid-cols-3 gap-1">
          <div className="rounded-sm bg-sky-200/80" />
          <div className="rounded-sm bg-rose-200/80" />
          <div className="rounded-sm bg-emerald-200/80" />
        </div>
      </div>
    ),
  },
  "mind-map": {
    icon: Network,
    accent: "from-indigo-500 to-blue-600",
    swatch: () => (
      <div className="relative h-full w-full p-2">
        <div className="absolute left-1/2 top-1/2 h-3 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full bg-slate-800" />
        {[
          { top: "12%", left: "12%", bg: "bg-blue-300" },
          { top: "12%", right: "12%", bg: "bg-amber-300" },
          { bottom: "12%", left: "12%", bg: "bg-emerald-300" },
          { bottom: "12%", right: "12%", bg: "bg-pink-300" },
        ].map((s, i) => (
          <div key={i} className={cn("absolute h-2.5 w-5 rounded-full", s.bg)} style={s} />
        ))}
        <svg viewBox="0 0 100 60" className="absolute inset-2 h-[calc(100%-1rem)] w-[calc(100%-1rem)] opacity-50">
          <line x1="50" y1="30" x2="18" y2="10" stroke="#94a3b8" strokeWidth="1" />
          <line x1="50" y1="30" x2="82" y2="10" stroke="#94a3b8" strokeWidth="1" />
          <line x1="50" y1="30" x2="18" y2="50" stroke="#94a3b8" strokeWidth="1" />
          <line x1="50" y1="30" x2="82" y2="50" stroke="#94a3b8" strokeWidth="1" />
        </svg>
      </div>
    ),
  },
  fishbone: {
    icon: Fish,
    accent: "from-slate-600 to-slate-800",
    swatch: () => (
      <div className="relative h-full w-full p-2">
        <svg viewBox="0 0 100 60" className="h-full w-full">
          <line x1="10" y1="30" x2="80" y2="30" stroke="#0f172a" strokeWidth="1.5" />
          <rect x="80" y="22" width="14" height="16" rx="2" fill="#fee2e2" stroke="#dc2626" strokeWidth="1" />
          <line x1="20" y1="30" x2="14" y2="10" stroke="#1e40af" strokeWidth="1" />
          <line x1="40" y1="30" x2="34" y2="10" stroke="#1e40af" strokeWidth="1" />
          <line x1="60" y1="30" x2="54" y2="10" stroke="#1e40af" strokeWidth="1" />
          <line x1="20" y1="30" x2="14" y2="50" stroke="#92400e" strokeWidth="1" />
          <line x1="40" y1="30" x2="34" y2="50" stroke="#92400e" strokeWidth="1" />
          <line x1="60" y1="30" x2="54" y2="50" stroke="#92400e" strokeWidth="1" />
        </svg>
      </div>
    ),
  },
  kwl: {
    icon: ListChecks,
    accent: "from-teal-500 to-emerald-600",
    swatch: () => (
      <div className="grid h-full w-full grid-cols-3 gap-1 p-2">
        {[
          { head: "bg-blue-600", body: "bg-blue-200/80" },
          { head: "bg-amber-600", body: "bg-amber-200/80" },
          { head: "bg-emerald-600", body: "bg-emerald-200/80" },
        ].map((c, i) => (
          <div key={i} className="flex flex-col gap-0.5">
            <div className={cn("h-2 rounded-t-sm", c.head)} />
            <div className={cn("flex-1 rounded-b-sm", c.body)} />
          </div>
        ))}
      </div>
    ),
  },
  frayer: {
    icon: Grid3x3,
    accent: "from-fuchsia-500 to-pink-600",
    swatch: () => (
      <div className="relative h-full w-full p-2">
        <div className="grid h-full w-full grid-cols-2 grid-rows-2 gap-0.5">
          <div className="rounded-tl-md bg-blue-200/80" />
          <div className="rounded-tr-md bg-amber-200/80" />
          <div className="rounded-bl-md bg-emerald-200/80" />
          <div className="rounded-br-md bg-red-200/80" />
        </div>
        <div className="absolute left-1/2 top-1/2 h-4 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full bg-slate-800" />
      </div>
    ),
  },
  "empathy-map": {
    icon: Brain,
    accent: "from-pink-500 to-rose-600",
    swatch: () => (
      <div className="relative h-full w-full p-2">
        <div className="grid h-full w-full grid-cols-2 grid-rows-2 gap-0.5">
          <div className="rounded-tl-md bg-blue-200/80" />
          <div className="rounded-tr-md bg-emerald-200/80" />
          <div className="rounded-bl-md bg-amber-200/80" />
          <div className="rounded-br-md bg-red-200/80" />
        </div>
        <div className="absolute left-1/2 top-1/2 h-4 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full bg-slate-800" />
      </div>
    ),
  },
  eisenhower: {
    icon: CalendarClock,
    accent: "from-red-500 to-orange-600",
    swatch: () => (
      <div className="grid h-full w-full grid-cols-2 grid-rows-2 gap-1 p-2">
        <div className="rounded-md bg-red-200/80" />
        <div className="rounded-md bg-emerald-200/80" />
        <div className="rounded-md bg-amber-200/80" />
        <div className="rounded-md bg-blue-200/80" />
      </div>
    ),
  },
  "five-whys": {
    icon: HelpCircle,
    accent: "from-amber-500 to-yellow-600",
    swatch: () => (
      <div className="flex h-full w-full flex-col gap-1 p-2">
        <div className="flex gap-1">
          <div className="h-4 flex-1 rounded-sm bg-red-200/80" />
          <div className="h-4 flex-1 rounded-sm bg-amber-200/80" />
          <div className="h-4 flex-1 rounded-sm bg-amber-200/80" />
        </div>
        <div className="flex gap-1">
          <div className="h-4 flex-1 rounded-sm bg-amber-200/80" />
          <div className="h-4 flex-1 rounded-sm bg-amber-200/80" />
          <div className="h-4 flex-1 rounded-sm bg-amber-200/80" />
        </div>
        <div className="h-3 rounded-sm bg-emerald-300/80" />
      </div>
    ),
  },
  venn: {
    icon: Circle,
    accent: "from-blue-500 to-indigo-600",
    swatch: () => (
      <div className="relative h-full w-full p-2">
        <svg viewBox="0 0 100 60" className="h-full w-full">
          <circle cx="40" cy="30" r="22" fill="rgba(59,130,246,0.35)" stroke="#1d4ed8" strokeWidth="1.5" />
          <circle cx="62" cy="30" r="22" fill="rgba(239,68,68,0.35)" stroke="#b91c1c" strokeWidth="1.5" />
        </svg>
      </div>
    ),
  },
  "sprint-retro": {
    icon: RefreshCw,
    accent: "from-emerald-500 to-green-600",
    swatch: () => (
      <div className="grid h-full w-full grid-cols-2 grid-rows-2 gap-1 p-2">
        <div className="rounded-md bg-emerald-200/80" />
        <div className="rounded-md bg-blue-200/80" />
        <div className="rounded-md bg-amber-200/80" />
        <div className="rounded-md bg-pink-200/80" />
      </div>
    ),
  },
  okr: {
    icon: Goal,
    accent: "from-slate-700 to-slate-900",
    swatch: () => (
      <div className="flex h-full w-full flex-col gap-1 p-2">
        <div className="h-5 rounded-md bg-slate-800" />
        <div className="h-2 rounded-sm bg-blue-200/80" />
        <div className="h-2 rounded-sm bg-emerald-200/80" />
        <div className="h-2 rounded-sm bg-amber-200/80" />
      </div>
    ),
  },
  storyboard: {
    icon: Film,
    accent: "from-purple-500 to-pink-600",
    swatch: () => (
      <div className="grid h-full w-full grid-cols-3 grid-rows-2 gap-1 p-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-sm border border-slate-300 bg-white">
            <div className="h-2 rounded-t-sm bg-slate-200" />
          </div>
        ))}
      </div>
    ),
  },
  "lab-report": {
    icon: FlaskConical,
    accent: "from-cyan-500 to-blue-600",
    swatch: () => (
      <div className="flex h-full w-full flex-col gap-1 p-2">
        {["bg-blue-200/80", "bg-emerald-200/80", "bg-amber-200/80", "bg-pink-200/80"].map((c, i) => (
          <div key={i} className={cn("flex flex-1 items-center gap-1 rounded-sm pl-1.5", c)}>
            <div className="h-2 w-2 rounded-full bg-slate-700" />
            <div className="h-1 flex-1 rounded-sm bg-slate-500/60" />
          </div>
        ))}
      </div>
    ),
  },
  "decision-tree": {
    icon: GitBranch,
    accent: "from-violet-500 to-indigo-600",
    swatch: () => (
      <div className="relative h-full w-full p-2">
        <svg viewBox="0 0 100 60" className="h-full w-full">
          <rect x="40" y="6" width="20" height="10" rx="2" fill="#0f172a" />
          <line x1="50" y1="16" x2="20" y2="32" stroke="#94a3b8" strokeWidth="1" />
          <line x1="50" y1="16" x2="50" y2="32" stroke="#94a3b8" strokeWidth="1" />
          <line x1="50" y1="16" x2="80" y2="32" stroke="#94a3b8" strokeWidth="1" />
          <rect x="10" y="32" width="20" height="9" rx="2" fill="#dbeafe" stroke="#2563eb" strokeWidth="0.8" />
          <rect x="40" y="32" width="20" height="9" rx="2" fill="#dcfce7" stroke="#16a34a" strokeWidth="0.8" />
          <rect x="70" y="32" width="20" height="9" rx="2" fill="#fef3c7" stroke="#ca8a04" strokeWidth="0.8" />
        </svg>
      </div>
    ),
  },
  "kg-numbers": {
    icon: Hash,
    accent: "from-yellow-400 to-amber-500",
    swatch: () => (
      <div className="flex h-full w-full items-center gap-1 px-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <div key={n} className="flex flex-1 items-center justify-center rounded-sm border border-dashed border-amber-400 bg-amber-100 text-[10px] font-bold text-amber-700">
            {n}
          </div>
        ))}
      </div>
    ),
  },
  "kg-shapes": {
    icon: Shapes,
    accent: "from-pink-400 to-rose-500",
    swatch: () => (
      <div className="flex h-full w-full items-center justify-around p-2">
        <div className="h-8 w-8 rounded-full bg-sky-300/80 ring-2 ring-sky-500" />
        <div className="h-8 w-8 rounded-sm bg-emerald-300/80 ring-2 ring-emerald-500" />
        <div className="h-0 w-0 border-x-[12px] border-b-[18px] border-x-transparent border-b-orange-400" />
        <div className="h-6 w-9 rounded-sm bg-pink-300/80 ring-2 ring-pink-500" />
      </div>
    ),
  },
  "primary-times-table": {
    icon: Grid3x3,
    accent: "from-indigo-500 to-violet-600",
    swatch: () => (
      <div className="grid h-full w-full grid-cols-6 grid-rows-4 gap-px bg-slate-300 p-1">
        {Array.from({ length: 24 }).map((_, i) => (
          <div key={i} className={cn("bg-white", i < 6 || i % 6 === 0 ? "bg-slate-800" : "")} />
        ))}
      </div>
    ),
  },
  "primary-fractions": {
    icon: PieChart,
    accent: "from-orange-400 to-rose-500",
    swatch: () => (
      <div className="flex h-full w-full items-center justify-around p-2">
        <svg viewBox="0 0 24 24" className="h-10 w-10"><circle cx="12" cy="12" r="11" fill="#bae6fd" stroke="#0ea5e9" strokeWidth="1.5" /><line x1="12" y1="1" x2="12" y2="23" stroke="#0ea5e9" strokeWidth="1.2" /></svg>
        <svg viewBox="0 0 24 24" className="h-10 w-10"><circle cx="12" cy="12" r="11" fill="#bbf7d0" stroke="#22c55e" strokeWidth="1.5" /><line x1="12" y1="12" x2="12" y2="1" stroke="#22c55e" strokeWidth="1.2" /><line x1="12" y1="12" x2="22.5" y2="17.5" stroke="#22c55e" strokeWidth="1.2" /><line x1="12" y1="12" x2="1.5" y2="17.5" stroke="#22c55e" strokeWidth="1.2" /></svg>
        <svg viewBox="0 0 24 24" className="h-10 w-10"><circle cx="12" cy="12" r="11" fill="#fed7aa" stroke="#f97316" strokeWidth="1.5" /><line x1="12" y1="1" x2="12" y2="23" stroke="#f97316" strokeWidth="1.2" /><line x1="1" y1="12" x2="23" y2="12" stroke="#f97316" strokeWidth="1.2" /></svg>
      </div>
    ),
  },
  "middle-pos": {
    icon: Languages,
    accent: "from-blue-500 to-cyan-600",
    swatch: () => (
      <div className="grid h-full w-full grid-cols-4 gap-1 p-2">
        {[
          { head: "bg-blue-600", body: "bg-blue-200/80" },
          { head: "bg-emerald-600", body: "bg-emerald-200/80" },
          { head: "bg-amber-600", body: "bg-amber-200/80" },
          { head: "bg-pink-600", body: "bg-pink-200/80" },
        ].map((c, i) => (
          <div key={i} className="flex flex-col gap-0.5">
            <div className={cn("h-2 rounded-t-sm", c.head)} />
            <div className={cn("flex-1 rounded-b-sm border border-dashed border-slate-300", c.body)} />
          </div>
        ))}
      </div>
    ),
  },
  "middle-algebra": {
    icon: FunctionSquare,
    accent: "from-fuchsia-500 to-purple-600",
    swatch: () => (
      <div className="flex h-full w-full flex-col gap-1 p-2">
        <div className="flex items-center gap-1.5 rounded-sm bg-blue-200/80 px-1.5 py-1">
          <div className="h-3 w-3 rounded-full bg-blue-600 text-[8px] font-bold leading-3 text-white">1</div>
          <div className="h-1.5 flex-1 rounded-sm bg-blue-600/40" />
        </div>
        <div className="flex items-center gap-1.5 rounded-sm bg-amber-200/80 px-1.5 py-1">
          <div className="h-3 w-3 rounded-full bg-amber-600 text-[8px] font-bold leading-3 text-white">2</div>
          <div className="h-1.5 flex-1 rounded-sm bg-amber-600/40" />
        </div>
        <div className="flex flex-1 items-center gap-1.5 rounded-sm bg-emerald-200/80 px-1.5 py-1">
          <div className="h-3 w-3 rounded-full bg-emerald-600 text-[8px] font-bold leading-3 text-white">3</div>
          <div className="h-1.5 flex-1 rounded-sm bg-emerald-600/40" />
        </div>
      </div>
    ),
  },
  "secondary-periodic": {
    icon: Atom,
    accent: "from-cyan-600 to-teal-700",
    swatch: () => (
      <div className="grid h-full w-full grid-cols-9 gap-px p-2">
        {Array.from({ length: 27 }).map((_, i) => {
          const col = i % 9
          const colour =
            col === 0 ? "bg-red-300" :
            col === 1 ? "bg-amber-300" :
            col === 8 ? "bg-sky-300" :
            col >= 6 ? "bg-pink-300" :
            "bg-slate-300"
          return <div key={i} className={cn("rounded-[1px]", colour)} />
        })}
      </div>
    ),
  },
  "senior-supply-demand": {
    icon: TrendingUp,
    accent: "from-blue-600 to-red-600",
    swatch: () => (
      <div className="relative h-full w-full p-2">
        <svg viewBox="0 0 100 60" className="h-full w-full">
          <line x1="10" y1="55" x2="10" y2="5" stroke="#0f172a" strokeWidth="1.5" />
          <line x1="10" y1="55" x2="95" y2="55" stroke="#0f172a" strokeWidth="1.5" />
          <line x1="14" y1="12" x2="88" y2="50" stroke="#dc2626" strokeWidth="1.8" />
          <line x1="14" y1="50" x2="88" y2="12" stroke="#2563eb" strokeWidth="1.8" />
          <circle cx="51" cy="31" r="3" fill="#0f172a" />
        </svg>
      </div>
    ),
  },
}

// K-12 is positioned in the middle so grade-band scaffolds are
// prominent without dominating non-K-12 teachers.
const CATEGORY_ORDER = ["Teaching", "K-12 grades", "Thinking", "Analysis", "Planning"] as const

export function TemplatePickerDialog({ open, onOpenChange, onPick }: Props) {
  // Block double-clicks: pressing a template seeds the scene + navigates
  // almost immediately, and a second click would mint a second board in
  // parallel.
  const [picking, setPicking] = useState<TemplateKey | null>(null)
  const [search, setSearch] = useState("")
  const [activeSubject, setActiveSubject] = useState<Subject | "All">("All")
  const [filterOpen, setFilterOpen] = useState(false)
  const searchRef = useRef<HTMLInputElement | null>(null)

  // "/" focuses the search field — same global shortcut convention as
  // the dashboard list pages. Active only while the dialog is open;
  // we exit if the user is already typing into an input/textarea so
  // we don't hijack their keypress.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "/") return
      const target = e.target as HTMLElement | null
      const tag = target?.tagName
      const isEditable =
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        target?.isContentEditable
      if (isEditable) return
      e.preventDefault()
      searchRef.current?.focus()
      searchRef.current?.select()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open])

  // Reset filters whenever the dialog opens so a previous session's
  // search doesn't bleed into the next picker.
  const handleOpenChange = (v: boolean) => {
    if (!v) {
      setPicking(null)
      setSearch("")
      setActiveSubject("All")
      setFilterOpen(false)
    }
    onOpenChange(v)
  }

  const handlePick = (k: TemplateKey) => {
    if (picking) return
    setPicking(k)
    onPick(k)
  }

  // Filter pipeline: subject filter → fuzzy search → group by category.
  // The "blank" template never appears in the grid; it's reachable via
  // the footer button instead, keeping it visually de-emphasised.
  const visible = useMemo(() => {
    const subjectFiltered = WHITEBOARD_TEMPLATES.filter(
      (t) =>
        t.key !== "blank" &&
        (activeSubject === "All" || t.subjects.includes(activeSubject)),
    )
    const searched = search.trim()
      ? fuzzySearch(subjectFiltered, search, (t) => [t.title, t.description])
      : subjectFiltered
    return searched
  }, [search, activeSubject])

  const grouped = useMemo(() => {
    const byCat = new Map<string, typeof visible>()
    for (const t of visible) {
      if (!byCat.has(t.category)) byCat.set(t.category, [])
      byCat.get(t.category)!.push(t)
    }
    return CATEGORY_ORDER.map((cat) => ({
      category: cat,
      items: byCat.get(cat) ?? [],
    })).filter((g) => g.items.length > 0)
  }, [visible])

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {/* Width pinned to Tailwind's --container-3xl token. We have to
          repeat it at the sm: breakpoint because the base
          DialogContent ships with `sm:max-w-lg` that beats a plain
          (un-prefixed) override at >=640px. */}
      <DialogContent className="max-h-[92vh] w-[95vw] max-w-[var(--container-3xl)] overflow-y-auto sm:max-w-[var(--container-3xl)]">
        <DialogHeader>
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-2">
              <DialogTitle className="flex items-center gap-2 font-serif">
                <Sparkles className="h-5 w-5 text-primary" />
                Start a new whiteboard
              </DialogTitle>
              <DialogDescription>
                Eighteen templates across teaching, thinking, analysis, and
                planning — search by name or filter by subject.
              </DialogDescription>
            </div>
            {/* Start-blank escape hatch lives in the header now so it
                stays in view as the templates grid scrolls. Sized
                compact (`sm`) so it doesn't compete with the title. */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePick("blank")}
              disabled={picking !== null}
              className="mr-8 shrink-0 gap-2"
            >
              <FileText className="h-4 w-4" />
              Start blank instead
            </Button>
          </div>
        </DialogHeader>

        {/* Search + filter — single row. Search expands; filter is a
            popover anchored to the right so the row stays tidy as the
            subject list grows. */}
        <div className="flex items-center gap-2 pt-1">
          <div className="relative flex-1">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={searchRef}
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search templates — press / to focus"
              className="pl-9 pr-12"
            />
            {/* "/" hint pill — sits on the right of the input so the
                keyboard shortcut is discoverable. Hidden as soon as
                the input has any text so it doesn't compete. */}
            {!search && (
              <kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded-md border border-border bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                /
              </kbd>
            )}
          </div>

          {/* Filter popover. The trigger reflects the active filter
              and how many results it narrows to so the teacher knows
              the picker is showing a filtered view. */}
          <Popover open={filterOpen} onOpenChange={setFilterOpen}>
            <PopoverTrigger asChild>
              <Button
                variant={activeSubject === "All" ? "outline" : "default"}
                size="sm"
                className="shrink-0 gap-2"
              >
                <Filter className="h-4 w-4" />
                {activeSubject === "All" ? "All subjects" : activeSubject}
                {activeSubject !== "All" && (
                  <span className="rounded-full bg-primary-foreground/20 px-1.5 text-[10px] font-bold">
                    {WHITEBOARD_TEMPLATES.filter(
                      (t) => t.key !== "blank" && t.subjects.includes(activeSubject),
                    ).length}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-64 p-2">
              <div className="px-2 pb-2 pt-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Filter by subject
              </div>
              <FilterRow
                label="All subjects"
                count={WHITEBOARD_TEMPLATES.filter((t) => t.key !== "blank").length}
                active={activeSubject === "All"}
                onClick={() => {
                  setActiveSubject("All")
                  setFilterOpen(false)
                }}
              />
              <div className="my-1 h-px bg-border" />
              {TEMPLATE_SUBJECTS.map((s) => {
                const count = WHITEBOARD_TEMPLATES.filter(
                  (t) => t.key !== "blank" && t.subjects.includes(s),
                ).length
                return (
                  <FilterRow
                    key={s}
                    label={s}
                    count={count}
                    active={activeSubject === s}
                    onClick={() => {
                      setActiveSubject(s)
                      setFilterOpen(false)
                    }}
                  />
                )
              })}
            </PopoverContent>
          </Popover>
        </div>

        {/* Grouped grid */}
        <div className="space-y-5 pt-3">
          {grouped.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-muted/20 px-6 py-10 text-center text-sm text-muted-foreground">
              No templates match. Try a different search or clear the subject filter.
            </div>
          ) : (
            grouped.map(({ category, items }) => (
              <section key={category} className="space-y-2">
                <div className="flex items-baseline justify-between px-1">
                  <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    {category}
                  </h3>
                  <span className="text-[11px] text-muted-foreground">
                    {items.length} {items.length === 1 ? "template" : "templates"}
                  </span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {items.map((t) => {
                    const v = VISUALS[t.key as Exclude<TemplateKey, "blank">]
                    if (!v) return null
                    const Icon = v.icon
                    const isPicking = picking === t.key
                    return (
                      <button
                        key={t.key}
                        type="button"
                        onClick={() => handlePick(t.key)}
                        disabled={picking !== null}
                        className={cn(
                          "group relative flex h-full flex-col overflow-hidden rounded-2xl border bg-card text-left transition-all",
                          "hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg",
                          "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                          "disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-none",
                          isPicking && "ring-2 ring-primary",
                        )}
                      >
                        <div className="relative h-24 w-full overflow-hidden border-b border-border bg-gradient-to-br from-slate-50 to-slate-100">
                          {v.swatch()}
                          <div
                            className={cn(
                              "absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br text-white shadow-sm",
                              v.accent,
                            )}
                          >
                            <Icon className="h-3.5 w-3.5" />
                          </div>
                        </div>
                        <div className="flex flex-1 flex-col gap-1.5 p-3.5">
                          <div className="flex items-center gap-2">
                            <p className="text-[13px] font-semibold text-foreground">{t.title}</p>
                            {/* Grade-band pill — only on K-12 cards.
                                Coloured strongly so a teacher can pick
                                their level in a glance. */}
                            {t.gradeBand && (
                              <span className="inline-flex items-center rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wide text-emerald-700 ring-1 ring-emerald-200">
                                <Baby className="mr-0.5 h-2.5 w-2.5" />
                                {t.gradeBand}
                              </span>
                            )}
                          </div>
                          <p className="text-[11.5px] leading-relaxed text-muted-foreground">
                            {t.description}
                          </p>
                          {/* Subject tags */}
                          <div className="flex flex-wrap gap-1 pt-1">
                            {t.subjects.slice(0, 3).map((s) => (
                              <span
                                key={s}
                                className="inline-flex items-center rounded-full bg-muted px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-wide text-muted-foreground"
                              >
                                {s}
                              </span>
                            ))}
                          </div>
                          <span className="mt-auto inline-flex items-center gap-1 text-[11px] font-semibold text-primary opacity-0 transition-opacity group-hover:opacity-100">
                            Use this template <ArrowRight className="h-3 w-3" />
                          </span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </section>
            ))
          )}
        </div>

        {/* No footer Cancel — the built-in Close icon (top-right of
            the DialogContent) is enough, and removing the footer
            keeps the picker focused on picking. */}
      </DialogContent>
    </Dialog>
  )
}

function FilterRow({
  label,
  active,
  count,
  onClick,
}: {
  label: string
  active: boolean
  count: number
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center justify-between gap-3 rounded-md px-2 py-1.5 text-[12.5px] font-medium transition-colors",
        active ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted",
      )}
    >
      <span className="flex items-center gap-2">
        {active ? <Check className="h-3.5 w-3.5" /> : <span className="h-3.5 w-3.5" />}
        {label}
      </span>
      <span
        className={cn(
          "rounded-full px-1.5 text-[10px] font-bold",
          active ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground",
        )}
      >
        {count}
      </span>
    </button>
  )
}
