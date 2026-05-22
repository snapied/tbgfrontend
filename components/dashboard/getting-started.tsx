"use client"

// Getting-started card.
//
// Shown at the top of the Dashboard until a new tenant has completed the
// minimum set of actions to have a real, working class:
//
//   1. Create their first course
//   2. Add a lesson to it
//   3. Schedule a live class
//   4. Invite their first student
//
// Each step's completion is derived from real data (does the tenant have
// a course? does any course have a lesson? do they have a live session
// scheduled? do they have any students?). Once all four are true, the
// card hides itself permanently — no flag to toggle, no manual reset.
//
// A "Maybe later" affordance also exists; tenants who already know the
// product can dismiss the card to localStorage so it stops nagging.

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { CheckCircle2, Circle, GraduationCap, Sparkles, X } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useLMS } from "@/lib/lms-store"

const DISMISS_KEY = "dashboard:getting-started:dismissed"

interface Step {
  id: string
  title: string
  hint: string
  done: boolean
  href: string
  cta: string
}

export function GettingStartedCard() {
  const { courses, students, liveSessions } = useLMS()
  const [dismissed, setDismissed] = useState(false)

  // Read the dismissed flag once on mount. We don't want to flicker the
  // card in on first render and then hide it — the empty initial state
  // protects against that until the effect runs.
  useEffect(() => {
    if (typeof window === "undefined") return
    try {
      setDismissed(window.localStorage.getItem(DISMISS_KEY) === "1")
    } catch {
      // localStorage disabled — leave dismissed=false; user can still
      // dismiss manually inside this session.
    }
  }, [])

  const steps: Step[] = useMemo(() => {
    const firstCourse = courses[0]
    const anyLesson = courses.some((c) =>
      (c.modules ?? []).some((m) => (m.lessons ?? []).length > 0),
    )
    return [
      {
        id: "course",
        title: "Create your first course",
        hint: "Just a title + a one-liner. You can flesh it out later.",
        done: courses.length > 0,
        href: "/dashboard/courses/new",
        cta: "Create course",
      },
      {
        id: "lesson",
        title: "Add a lesson",
        hint: "A short video, a doc, or just a text note — anything students can open.",
        done: anyLesson,
        // Deep-link straight to the course editor if one exists; otherwise
        // fall back to the courses index so the user can pick where to land.
        href: firstCourse ? `/dashboard/courses/${firstCourse.id}/edit` : "/dashboard/courses",
        cta: firstCourse ? "Add a lesson" : "Pick a course",
      },
      {
        id: "class",
        title: "Schedule your first live class",
        hint: "Sets up the room, the join link, and the calendar invite in one step.",
        done: liveSessions.length > 0,
        href: "/dashboard/classes/new",
        cta: "Schedule class",
      },
      {
        id: "student",
        title: "Invite your first student",
        hint: "Send them the join link by email — they don't need an account first.",
        done: students.length > 0,
        href: "/dashboard/students",
        cta: "Invite student",
      },
    ]
  }, [courses, students, liveSessions])

  const completedCount = steps.filter((s) => s.done).length
  const totalCount = steps.length
  const allDone = completedCount === totalCount

  // Hide as soon as everyone's caught up — or the user dismisses it.
  if (allDone || dismissed) return null

  const nextStep = steps.find((s) => !s.done) ?? null

  function dismiss() {
    setDismissed(true)
    try {
      window.localStorage.setItem(DISMISS_KEY, "1")
    } catch {
      // No localStorage — dismissal stays session-local.
    }
  }

  return (
    <Card className="relative overflow-hidden border-primary/30 bg-gradient-to-br from-primary/5 via-accent/[0.03] to-transparent">
      <CardContent className="space-y-5 p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold">Get started in 5 minutes</p>
              <p className="text-xs text-muted-foreground">
                Four small steps and your first class is live.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={dismiss}
            className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
            aria-label="Dismiss getting started"
            title="Maybe later"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-medium text-muted-foreground">
            <span>
              {completedCount} of {totalCount} done
            </span>
            <span>{Math.round((completedCount / totalCount) * 100)}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-500"
              style={{ width: `${(completedCount / totalCount) * 100}%` }}
            />
          </div>
        </div>

        {/* Steps */}
        <ol className="space-y-2">
          {steps.map((step) => {
            const isNext = step === nextStep
            return (
              <li
                key={step.id}
                className={cn(
                  "flex items-start gap-3 rounded-lg border p-3 transition-colors",
                  step.done && "border-success/30 bg-success/[0.04]",
                  isNext && "border-primary/40 bg-card shadow-sm",
                  !step.done && !isNext && "border-border/60 bg-card/60",
                )}
              >
                <div className="mt-0.5 shrink-0">
                  {step.done ? (
                    <CheckCircle2 className="h-5 w-5 text-success" />
                  ) : (
                    <Circle
                      className={cn(
                        "h-5 w-5",
                        isNext ? "text-primary" : "text-muted-foreground/50",
                      )}
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      "text-sm font-medium",
                      step.done && "text-muted-foreground line-through",
                    )}
                  >
                    {step.title}
                  </p>
                  {!step.done && (
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {step.hint}
                    </p>
                  )}
                </div>
                {!step.done && (
                  <Button asChild size="sm" variant={isNext ? "default" : "outline"}>
                    <Link href={step.href}>{step.cta}</Link>
                  </Button>
                )}
              </li>
            )
          })}
        </ol>

        {/* Footer hint — only on first render before anything is done. */}
        {completedCount === 0 && (
          <p className="flex items-start gap-2 rounded-md border border-border/60 bg-muted/30 p-3 text-[11px] text-muted-foreground">
            <GraduationCap className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary/70" />
            <span>
              Each step picks sensible defaults so you can ship a working
              class without filling out 20 fields. Tune anything afterwards
              from the course / class settings.
            </span>
          </p>
        )}
      </CardContent>
    </Card>
  )
}
