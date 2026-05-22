"use client"

// Instructor / admin first-visit welcome modal. Same idea as the
// student-side one: fires once per (user, workspace) on the dashboard
// home, sets a localStorage marker so it never nags again, and
// exposes a manual re-open via the avatar menu.
//
// Surfaces the two affordances new teachers most often miss:
//   • The left nav (30+ rows, grouped) — a map.
//   • ⌘K command palette — fastest jump-to-anything.

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  ArrowRight,
  Command,
  LayoutDashboard,
  Send,
  Sidebar,
  Sparkles,
  X,
} from "lucide-react"
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

const STORAGE_KEY = "thebigclass.teacher.welcome.seen.v1"

const WELCOME_BUS =
  typeof window !== "undefined" ? new EventTarget() : null
const OPEN_EVENT = "teacher-welcome:open"

/** Dispatch from anywhere (e.g. the sidebar avatar menu) to re-open
 *  the teacher welcome modal regardless of marker state. */
export function openTeacherWelcome(): void {
  WELCOME_BUS?.dispatchEvent(new Event(OPEN_EVENT))
}

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

export function TeacherWelcomeModal() {
  const { currentUser } = useLMS()
  const { currentTenant } = useTenant()
  const [open, setOpen] = useState(false)
  const slug = currentTenant?.slug ?? ""

  useEffect(() => {
    if (!currentUser) return
    if (currentUser.role !== "admin" && currentUser.role !== "instructor") return
    if (!slug) return
    if (hasSeen(currentUser.id, slug)) return
    // Small delay so the dashboard paints first.
    const t = setTimeout(() => setOpen(true), 400)
    return () => clearTimeout(t)
  }, [currentUser, slug])

  useEffect(() => {
    if (!WELCOME_BUS) return
    const onOpen = () => setOpen(true)
    WELCOME_BUS.addEventListener(OPEN_EVENT, onOpen)
    return () => WELCOME_BUS.removeEventListener(OPEN_EVENT, onOpen)
  }, [])

  const close = () => {
    setOpen(false)
    if (currentUser && slug) markSeen(currentUser.id, slug)
  }

  if (!currentUser) return null
  const firstName = currentUser.name?.split(" ")[0] ?? "there"
  const workspace = currentTenant?.name ?? "your workspace"

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? setOpen(true) : close())}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent/15 text-accent">
            <Sparkles className="h-6 w-6" />
          </div>
          <DialogTitle className="text-center font-serif text-2xl">
            Welcome to {workspace}, {firstName}!
          </DialogTitle>
          <DialogDescription className="text-center">
            Two things worth knowing before you start.
          </DialogDescription>
        </DialogHeader>

        <ul className="space-y-3 py-2">
          <Bullet
            icon={<Sidebar className="h-4 w-4 text-primary" />}
            title="Everything lives in the left nav"
            body="Courses, Students, Communities, Live Classes, Recordings, Quizzes, Assignments, Storefront, Analytics, Settings — grouped by what you'll do most."
          />
          <Bullet
            icon={<Command className="h-4 w-4 text-primary" />}
            title="Press ⌘K (or Ctrl+K) to jump anywhere"
            body="The command palette opens from any page. Type a course / student / quiz name and hit Enter to go straight there. ‘g k’ also works."
          />
          <Bullet
            icon={<LayoutDashboard className="h-4 w-4 text-primary" />}
            title="Tours on every page"
            body="Each page has a ‘Take a tour’ button up top. Re-open this welcome anytime from your avatar menu (bottom-left)."
          />
          <Bullet
            icon={<Send className="h-4 w-4 text-primary" />}
            title="Publish flows include reminders + notifications"
            body="Creating a class fans out in-app + email + WhatsApp reminders at T-3h, T-1h, and T-15m. Creating a quiz / assignment lets you pick the audience and channels right inside the form."
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
            <Link href="/dashboard/courses">
              Go to my courses
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
