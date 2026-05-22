"use client"

// Student first-visit welcome modal. Fires once per (student, tenant)
// the first time they land on /p/[tenant]/my after accepting an
// invite. Sets a localStorage marker so subsequent visits don't
// nag them. The marker is never cleared on sign-out — a student who
// has already seen the welcome should not see it again after they
// re-login.
//
// To re-open the modal on demand (from a "Show me around" button in
// the sidebar, say), call `openStudentWelcome()`. That dispatches a
// module-scoped event the modal listens for and bypasses the
// hasSeen() gate.
//
// The modal is intentionally light — three sentences + a primary CTA
// that launches the home-page product tour. We don't try to
// onboard the entire student journey here; the per-page tours
// already cover that, this is just a warm hello + a pointer.

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowRight, BookOpen, Command, Inbox, Sidebar, Sparkles, X } from "lucide-react"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useLMS } from "@/lib/lms-store"
import { useTenant } from "@/lib/tenant-store"

const STORAGE_KEY = "thebigclass.student.welcome.seen.v1"

// Cheap module-scope pub/sub so any button on the dashboard can
// re-open the welcome modal without prop-drilling state. The bus
// only exists in the browser; SSR returns null and the modal noop's.
const WELCOME_BUS =
  typeof window !== "undefined" ? new EventTarget() : null
const OPEN_EVENT = "student-welcome:open"

/** Dispatch from anywhere (e.g. a sidebar "Show me around" button) to
 *  re-open the welcome modal regardless of whether the student has
 *  already dismissed it before. */
export function openStudentWelcome(): void {
  WELCOME_BUS?.dispatchEvent(new Event(OPEN_EVENT))
}

interface Props {
  tenantSlug: string
}

// Tracks "this student + this tenant" — so a learner enrolled in two
// workspaces sees the welcome once per workspace, not just once ever.
function hasSeen(userId: string, tenantSlug: string): boolean {
  if (typeof window === "undefined") return true
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return false
    const seen = JSON.parse(raw) as Record<string, true>
    return !!seen[`${userId}:${tenantSlug}`]
  } catch {
    return true
  }
}

function markSeen(userId: string, tenantSlug: string) {
  if (typeof window === "undefined") return
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    const seen = raw ? (JSON.parse(raw) as Record<string, true>) : {}
    seen[`${userId}:${tenantSlug}`] = true
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seen))
  } catch {
    /* ignore */
  }
}

export function StudentWelcomeModal({ tenantSlug }: Props) {
  const { currentUser } = useLMS()
  const { currentTenant } = useTenant()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!currentUser || currentUser.role !== "student") return
    if (hasSeen(currentUser.id, tenantSlug)) return
    // Small delay so the dashboard chrome paints first; a modal that
    // pops before the page renders feels like an interruption, not a
    // welcome.
    const t = setTimeout(() => setOpen(true), 400)
    return () => clearTimeout(t)
  }, [currentUser, tenantSlug])

  // Subscribe to manual re-open requests. The button in the sidebar
  // fires openStudentWelcome() which bypasses the hasSeen() gate so
  // a student can replay the tour any time they want.
  useEffect(() => {
    if (!WELCOME_BUS) return
    const onOpen = () => setOpen(true)
    WELCOME_BUS.addEventListener(OPEN_EVENT, onOpen)
    return () => WELCOME_BUS.removeEventListener(OPEN_EVENT, onOpen)
  }, [])

  const close = () => {
    setOpen(false)
    if (currentUser) markSeen(currentUser.id, tenantSlug)
  }

  if (!currentUser) return null
  const firstName = currentUser.name?.split(" ")[0] ?? "there"
  const workspace = currentTenant?.name ?? "your workspace"

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? setOpen(true) : close())}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent/15 text-accent">
            <Sparkles className="h-6 w-6" />
          </div>
          <DialogTitle className="text-center font-serif text-2xl">
            Welcome to {workspace}, {firstName}!
          </DialogTitle>
          <DialogDescription className="text-center">
            This is your learning home — every course, live class, assignment, and message your teachers send you lives here.
          </DialogDescription>
        </DialogHeader>

        <ul className="space-y-3 py-2">
          <Bullet
            icon={<Sidebar className="h-4 w-4 text-primary" />}
            title="Left nav has everything"
            body="Home, My courses, Live classes, Recordings, Quizzes, Assignments, Doubts & Q&A, Inbox, Library, Billing — all one click away."
          />
          <Bullet
            icon={<Command className="h-4 w-4 text-primary" />}
            title="Press ⌘K (or Ctrl+K) to jump anywhere"
            body="The command palette opens from any page. Type a course / quiz / class name and hit Enter to go straight there."
          />
          <Bullet
            icon={<BookOpen className="h-4 w-4 text-primary" />}
            title="My courses"
            body="Pick up where you left off, or browse the catalog to enroll in something new."
          />
          <Bullet
            icon={<Inbox className="h-4 w-4 text-primary" />}
            title="Inbox + notifications"
            body="Class invites, grade releases, and replies from your teachers all land in your inbox. The bell at the top of the sidebar shows unread count."
          />
          <Bullet
            icon={<Sparkles className="h-4 w-4 text-primary" />}
            title="Tours on every page"
            body="Each page has a small ‘Take a tour’ button — tap it whenever you want a refresher. Re-open this welcome from your avatar menu."
          />
        </ul>

        <DialogFooter className="gap-2 sm:gap-2">
          <DialogClose asChild>
            <Button variant="ghost" onClick={close}>
              <X className="mr-1.5 h-3.5 w-3.5" />
              Skip for now
            </Button>
          </DialogClose>
          <Button asChild onClick={close}>
            <Link href={`/p/${tenantSlug}/my/courses`}>
              Show my courses
              <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Bullet({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode
  title: string
  body: string
}) {
  return (
    <li className="flex items-start gap-3 rounded-md border border-border/60 p-3">
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10">
        {icon}
      </div>
      <div>
        <p className="text-sm font-semibold">{title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{body}</p>
      </div>
    </li>
  )
}
