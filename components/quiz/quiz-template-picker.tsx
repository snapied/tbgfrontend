"use client"

// Quiz template picker — mirror of the whiteboard picker but
// specialised for assessments.
//
// Eighteen subject-tagged starter quizzes (K-12 fluency, NEET/JEE
// drills, code review, system design, GMAT DS, …). Each card shows
// title + description + subject pills + a per-template visual icon
// derived from the category. Search + filter chip behaviour matches
// the whiteboard picker so the muscle memory is the same.

import { useEffect, useMemo, useRef, useState } from "react"
import {
  Sparkles,
  Search as SearchIcon,
  ArrowRight,
  FileText,
  Zap,
  Award,
  MessageSquareText,
  BookOpen,
  Calculator,
  Code2,
  Network,
  Briefcase,
  Lightbulb,
  Atom,
  FlaskConical,
  Activity,
  GraduationCap,
  Sigma,
  ScrollText,
  Clock,
  PieChart,
  Filter,
  Check,
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
  QUIZ_TEMPLATES,
  QUIZ_TEMPLATE_SUBJECTS,
  type QuizSubject,
  type QuizTemplate,
} from "@/lib/quiz-templates"

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  /** Picked the template — caller is responsible for hydrating into a
   *  real Quiz (with a courseId) and navigating to the editor. */
  onPick: (template: QuizTemplate) => void
  /** Pressed "Start blank instead" in the header — caller navigates
   *  to the from-scratch new-quiz page. Matches the whiteboard
   *  picker's escape-hatch contract. */
  onStartBlank?: () => void
}

// Per-key icon + accent. Falls back to a sensible default per category
// for any template we forgot to register.
const ICONS: Record<string, { icon: typeof Sparkles; accent: string }> = {
  "pop-quiz":          { icon: Zap,             accent: "from-amber-500 to-orange-600" },
  "module-assessment": { icon: Award,           accent: "from-emerald-500 to-teal-600" },
  reflection:          { icon: MessageSquareText, accent: "from-violet-500 to-purple-600" },
  "k12-reading-comp":  { icon: BookOpen,        accent: "from-sky-500 to-blue-600" },
  "k12-math-fluency":  { icon: Sigma,           accent: "from-indigo-500 to-blue-600" },
  "k12-vocabulary":    { icon: ScrollText,      accent: "from-pink-500 to-rose-600" },
  "highered-essay":    { icon: ScrollText,      accent: "from-slate-700 to-slate-900" },
  "highered-case-study":{ icon: Briefcase,      accent: "from-blue-700 to-indigo-900" },
  "code-review":       { icon: Code2,           accent: "from-slate-700 to-slate-900" },
  "algo-complexity":   { icon: Network,         accent: "from-indigo-600 to-purple-700" },
  "system-design":     { icon: Network,         accent: "from-cyan-600 to-blue-800" },
  "pm-scenarios":      { icon: Briefcase,       accent: "from-emerald-600 to-teal-700" },
  "product-sense":     { icon: Lightbulb,       accent: "from-rose-500 to-pink-600" },
  "physics-laws":      { icon: Atom,            accent: "from-blue-500 to-indigo-700" },
  "chem-equations":    { icon: FlaskConical,    accent: "from-teal-500 to-cyan-700" },
  "jee-maths":         { icon: Calculator,      accent: "from-fuchsia-600 to-pink-700" },
  "neet-biology":      { icon: Activity,        accent: "from-green-600 to-emerald-700" },
  "gmat-ds":           { icon: PieChart,        accent: "from-amber-600 to-orange-700" },
}

const CATEGORY_ORDER: QuizTemplate["category"][] = [
  "Classroom",
  "Higher education",
  "Engineering",
  "Management",
  "Entrance prep",
]

export function QuizTemplatePicker({ open, onOpenChange, onPick, onStartBlank }: Props) {
  const [picking, setPicking] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [activeSubject, setActiveSubject] = useState<QuizSubject | "All">("All")
  const [filterOpen, setFilterOpen] = useState(false)
  const searchRef = useRef<HTMLInputElement | null>(null)

  // "/" focuses the search field — same convention as the whiteboard
  // picker. Skip if the user is already typing into an input/textarea
  // so we don't hijack their keypress.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "/") return
      const target = e.target as HTMLElement | null
      const tag = target?.tagName
      const isEditable = tag === "INPUT" || tag === "TEXTAREA" || target?.isContentEditable
      if (isEditable) return
      e.preventDefault()
      searchRef.current?.focus()
      searchRef.current?.select()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open])

  const handleOpenChange = (v: boolean) => {
    if (!v) {
      setPicking(null)
      setSearch("")
      setActiveSubject("All")
      setFilterOpen(false)
    }
    onOpenChange(v)
  }

  const handlePick = (t: QuizTemplate) => {
    if (picking) return
    setPicking(t.key)
    onPick(t)
  }

  const visible = useMemo(() => {
    const subjectFiltered = QUIZ_TEMPLATES.filter(
      (t) => activeSubject === "All" || t.subjects.includes(activeSubject),
    )
    return search.trim()
      ? fuzzySearch(subjectFiltered, search, (t) => [t.title, t.description, ...t.subjects])
      : subjectFiltered
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
      {/* Same width as the whiteboard picker. sm: variant needed
          because the base DialogContent ships `sm:max-w-lg` which
          beats an un-prefixed override at >=640px. */}
      <DialogContent className="max-h-[92vh] w-[95vw] max-w-[var(--container-3xl)] overflow-y-auto sm:max-w-[var(--container-3xl)]">
        <DialogHeader>
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-2">
              <DialogTitle className="flex items-center gap-2 font-serif">
                <Sparkles className="h-5 w-5 text-primary" />
                Start a new quiz
              </DialogTitle>
              <DialogDescription>
                Eighteen pre-built quizzes across K-12, higher ed, engineering,
                management, and entrance prep — search by name or filter by
                subject.
              </DialogDescription>
            </div>
            {/* Start-blank escape hatch in the header so it stays in
                view as the templates grid scrolls. `mr-8` clears the
                dialog's built-in close icon. */}
            {onStartBlank && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  handleOpenChange(false)
                  onStartBlank()
                }}
                disabled={picking !== null}
                className="mr-8 shrink-0 gap-2"
              >
                <FileText className="h-4 w-4" />
                Start blank instead
              </Button>
            )}
          </div>
        </DialogHeader>

        {/* Search + filter — single row. Filter is a popover so the
            row stays tidy as the subject list grows. */}
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
            {!search && (
              <kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded-md border border-border bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                /
              </kbd>
            )}
          </div>

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
                    {QUIZ_TEMPLATES.filter((t) => t.subjects.includes(activeSubject)).length}
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
                count={QUIZ_TEMPLATES.length}
                active={activeSubject === "All"}
                onClick={() => {
                  setActiveSubject("All")
                  setFilterOpen(false)
                }}
              />
              <div className="my-1 h-px bg-border" />
              {QUIZ_TEMPLATE_SUBJECTS.map((s) => {
                const count = QUIZ_TEMPLATES.filter((t) => t.subjects.includes(s)).length
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
                    const meta = ICONS[t.key] ?? { icon: GraduationCap, accent: "from-slate-500 to-slate-700" }
                    const Icon = meta.icon
                    const isPicking = picking === t.key
                    const totalPoints = t.questions.reduce((s, q) => s + (q.points ?? 0), 0)
                    return (
                      <button
                        key={t.key}
                        type="button"
                        onClick={() => handlePick(t)}
                        disabled={picking !== null}
                        className={cn(
                          "group relative flex h-full flex-col overflow-hidden rounded-2xl border bg-card text-left transition-all",
                          "hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg",
                          "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                          "disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-none",
                          isPicking && "ring-2 ring-primary",
                        )}
                      >
                        {/* Hero band — gradient + big icon. No swatch
                            because quizzes don't have a visual layout
                            the way whiteboards do; the icon + colour
                            is the identity. */}
                        <div className={cn("relative h-20 w-full overflow-hidden bg-gradient-to-br", meta.accent)}>
                          <Icon className="absolute right-3 top-3 h-6 w-6 text-white/95" />
                          <div className="absolute bottom-2 left-3 text-[10px] font-semibold uppercase tracking-wider text-white/80">
                            {t.gradingMode === "auto" ? "Auto-graded" : "Instructor-graded"}
                          </div>
                        </div>

                        <div className="flex flex-1 flex-col gap-1.5 p-3.5">
                          <p className="text-[13px] font-semibold text-foreground">{t.title}</p>
                          <p className="text-[11.5px] leading-relaxed text-muted-foreground">
                            {t.description}
                          </p>

                          {/* Subject pills */}
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

                          {/* Stats footer */}
                          <div className="mt-2 flex items-center gap-2.5 border-t border-border/60 pt-2 text-[10.5px] text-muted-foreground">
                            <span className="inline-flex items-center gap-1">
                              <FileText className="h-3 w-3" />
                              {t.questions.length} {t.questions.length === 1 ? "question" : "questions"}
                            </span>
                            {totalPoints > 0 && (
                              <>
                                <span>·</span>
                                <span>{totalPoints} pts</span>
                              </>
                            )}
                            {t.timeLimit && (
                              <>
                                <span>·</span>
                                <span className="inline-flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {t.timeLimit} min
                                </span>
                              </>
                            )}
                          </div>

                          <span className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-primary opacity-0 transition-opacity group-hover:opacity-100">
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

        {/* No footer — built-in close icon handles dismissal, and the
            "Start blank instead" escape hatch lives in the header. */}
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
