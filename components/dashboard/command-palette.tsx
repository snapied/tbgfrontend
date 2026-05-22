"use client"

// ⌘K command palette — jump to any class, quiz, student, course,
// whiteboard, or recording by name. Mounted once in the dashboard
// layout; opens on ⌘K / Ctrl+K (handled by the global shortcut
// system) and on the "g k" sequence as a discoverable alternative.
//
// Index:
//   • Courses, classes, quizzes, students, whiteboards — by title/name
//   • Top-level destinations (dashboard, billing, settings) as
//     fallback rows so a brand-new workspace still has something to
//     navigate
//
// Cmdk does the fuzzy matching for us — we just hand it the row text
// and a hit-id; selection navigates the route.

import { useEffect, useMemo, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import {
  Activity,
  ArrowRight,
  Banknote,
  BarChart3,
  BookOpen,
  ClipboardList,
  Code2,
  CreditCard,
  ExternalLink,
  FilePlus,
  FileQuestion,
  FileText,
  Film,
  Globe,
  GraduationCap,
  Heart,
  History,
  Home,
  Inbox,
  Languages as LanguagesIcon,
  LayoutDashboard,
  Megaphone,
  MessageSquare,
  Palette,
  PenSquare,
  Settings,
  ShoppingBag,
  Trash2,
  Trophy,
  User,
  UserPlus,
  Users,
  Users2,
  Video,
  Webhook,
} from "lucide-react"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import { useLMS } from "@/lib/lms-store"
import { useShortcutsContext } from "@/components/dashboard/shortcuts-provider"
import { useKeyboardShortcuts } from "@/lib/use-keyboard-shortcuts"

// Flat registry of every sidebar destination — mirrored from
// `components/dashboard/sidebar.tsx`. Living here (rather than
// importing the sidebar's groups) keeps the palette independent of the
// sidebar's plan-gating + state machinery, and the palette doesn't
// care about lockedBehind: tapping a row jumps to the page, which then
// renders its own PlanFeatureGate if locked.
type NavTarget = {
  label: string
  href: string
  icon: React.ReactNode
  /** Extra text fed into cmdk's fuzzy match — synonyms, group label,
   *  so "fees" matches "Billing & plan" and "team" matches "Manage Users". */
  aliases?: string
}

const NAV_TARGETS: NavTarget[] = [
  // Teach
  { label: "Dashboard", href: "/dashboard", icon: <LayoutDashboard /> },
  { label: "Courses", href: "/dashboard/courses", icon: <BookOpen />, aliases: "teach lessons modules" },
  { label: "Students", href: "/dashboard/students", icon: <GraduationCap />, aliases: "learners enrolled" },
  { label: "Communities", href: "/dashboard/batches", icon: <Users2 />, aliases: "batch group cohort" },
  { label: "Live Classes", href: "/dashboard/classes", icon: <Video />, aliases: "sessions video call" },
  { label: "Recordings", href: "/dashboard/recordings", icon: <Film />, aliases: "videos replay" },
  { label: "Whiteboards", href: "/dashboard/whiteboards", icon: <PenSquare />, aliases: "canvas draw" },
  { label: "Quizzes", href: "/dashboard/quizzes", icon: <FileQuestion />, aliases: "tests assessments" },
  { label: "Assignments", href: "/dashboard/assignments", icon: <ClipboardList />, aliases: "homework submissions" },
  { label: "Storefront", href: "/dashboard/store", icon: <ShoppingBag />, aliases: "shop products sell" },
  { label: "Analytics", href: "/dashboard/analytics", icon: <BarChart3 />, aliases: "metrics reports stats" },
  // Certificates
  { label: "New Batch", href: "/dashboard/new-batch", icon: <FilePlus />, aliases: "certificate issue" },
  { label: "Batch History", href: "/dashboard/history", icon: <History />, aliases: "certificates past issued" },
  { label: "Templates", href: "/dashboard/templates", icon: <Palette />, aliases: "certificate templates" },
  // Community
  { label: "Inbox", href: "/dashboard/inbox", icon: <Inbox />, aliases: "messages doubts leads notifications" },
  { label: "Doubts & Q&A", href: "/dashboard/doubts", icon: <FileQuestion />, aliases: "questions answers" },
  { label: "Announcements", href: "/dashboard/announcements", icon: <Megaphone />, aliases: "broadcast notice" },
  { label: "Leaderboard", href: "/dashboard/leaderboard", icon: <Trophy />, aliases: "ranking top scorers" },
  { label: "Wall of Love", href: "/dashboard/wall", icon: <Heart />, aliases: "testimonials reviews praise" },
  { label: "Refer & Earn", href: "/dashboard/referrals", icon: <UserPlus />, aliases: "referral program" },
  // Public site
  { label: "Public site · Overview", href: "/dashboard/portal", icon: <Globe />, aliases: "portal" },
  { label: "Public site · Home page", href: "/dashboard/portal/home", icon: <Home />, aliases: "landing portal homepage" },
  { label: "Public site · Pages", href: "/dashboard/portal/pages", icon: <FileText />, aliases: "portal pages cms" },
  { label: "Public site · Brand", href: "/dashboard/portal/brand", icon: <Palette />, aliases: "logo colors portal" },
  { label: "Public profile", href: "/dashboard/portal/profile", icon: <UserPlus />, aliases: "about page bio" },
  { label: "Public site · Testimonials", href: "/dashboard/portal/testimonials", icon: <Heart />, aliases: "reviews quotes" },
  { label: "Public site · Blog", href: "/dashboard/portal/blog", icon: <BookOpen />, aliases: "articles posts" },
  { label: "Public site · Announcements", href: "/dashboard/portal/announcements", icon: <Megaphone />, aliases: "broadcast portal" },
  { label: "Lead inbox", href: "/dashboard/portal/leads", icon: <MessageSquare />, aliases: "enquiries contacts" },
  { label: "Domain & URL", href: "/dashboard/portal/domain", icon: <ExternalLink />, aliases: "custom domain subdomain" },
  { label: "Languages", href: "/dashboard/portal/languages", icon: <LanguagesIcon />, aliases: "i18n translations multilingual" },
  // Workspace
  { label: "Instructors", href: "/dashboard/faculty", icon: <UserPlus />, aliases: "teachers staff" },
  { label: "Manage Users", href: "/dashboard/users", icon: <Users />, aliases: "team admin roles" },
  { label: "Billing & plan", href: "/dashboard/billing", icon: <CreditCard />, aliases: "subscription payment invoice fees pricing upgrade" },
  { label: "Payouts", href: "/dashboard/payouts", icon: <Banknote />, aliases: "earnings bank withdraw revenue" },
  { label: "Developer", href: "/dashboard/developer", icon: <Code2 />, aliases: "api keys" },
  { label: "Webhooks", href: "/dashboard/developer/webhooks", icon: <Webhook />, aliases: "api events" },
  { label: "Trash", href: "/dashboard/trash", icon: <Trash2 />, aliases: "deleted restore undo" },
  { label: "System status", href: "/dashboard/status", icon: <Activity />, aliases: "health probes uptime livekit backend reachable diagnostics" },
  { label: "Settings", href: "/dashboard/settings", icon: <Settings />, aliases: "preferences account" },
]

// Student-side destinations. Same palette component is mounted in
// /p/[tenant]/my/layout.tsx (Phase 1) so the ⌘K experience works there
// too. We pass the tenant slug at call-time and stamp it into the
// hrefs — no second palette component, no duplicated cmdk wiring.
function studentNavTargets(tenantSlug: string): NavTarget[] {
  if (!tenantSlug) return []
  const base = `/p/${tenantSlug}`
  return [
    { label: "Home", href: `${base}/my`, icon: <LayoutDashboard />, aliases: "dashboard learning" },
    { label: "My courses", href: `${base}/my/courses`, icon: <BookOpen />, aliases: "enrolled lessons modules continue" },
    { label: "Live classes", href: `${base}/my/classes`, icon: <Video />, aliases: "sessions upcoming past meetings" },
    { label: "Recordings", href: `${base}/my/recordings`, icon: <Film />, aliases: "replay videos watch" },
    { label: "Quizzes", href: `${base}/my/quizzes`, icon: <FileQuestion />, aliases: "tests assessments attempts" },
    { label: "Assignments", href: `${base}/my/assignments`, icon: <ClipboardList />, aliases: "homework projects submit" },
    { label: "Doubts", href: `${base}/my/doubts`, icon: <MessageSquare />, aliases: "questions ask answers" },
    { label: "Inbox", href: `${base}/my/inbox`, icon: <Inbox />, aliases: "notifications updates" },
    { label: "Library", href: `${base}/library`, icon: <ShoppingBag />, aliases: "purchases owned content downloads" },
    { label: "Billing", href: `${base}/my/billing`, icon: <CreditCard />, aliases: "invoices receipts payments orders" },
    { label: "Settings", href: `${base}/my/settings`, icon: <Settings />, aliases: "preferences notifications whatsapp email timezone profile" },
    { label: "System status", href: `${base}/my/status`, icon: <Activity />, aliases: "health probes uptime backend diagnostics" },
  ]
}

export function CommandPalette() {
  const router = useRouter()
  const pathname = usePathname() ?? ""
  const [open, setOpen] = useState(false)
  const { courses, liveSessions, quizzes, students, whiteboards, currentUser } = useLMS()
  const ctx = useShortcutsContext()

  // The palette is mounted in BOTH layouts. When we're on a student
  // surface (`/p/<slug>/my/...`) or the signed-in user is a student,
  // show the student destination set; otherwise show the teacher set.
  // Detection prefers the URL (deterministic, server-renderable) and
  // falls back to the currentUser role for cases where a student
  // wanders onto a public tenant page.
  const tenantSlug = useMemo(() => {
    const m = pathname.match(/^\/p\/([^/]+)/)
    return m ? decodeURIComponent(m[1]) : ""
  }, [pathname])
  const isStudentSurface =
    pathname.startsWith(`/p/${tenantSlug}/my`) ||
    (currentUser?.role === "student" && !!tenantSlug)
  const navTargets = isStudentSurface ? studentNavTargets(tenantSlug) : NAV_TARGETS

  // ⌘K / Ctrl+K — the standard shortcut. We handle it directly here
  // (not through useKeyboardShortcuts) because that hook explicitly
  // skips events with modifier keys held, and ⌘/Ctrl is exactly the
  // pattern we want. "g k" is a non-modifier sequence registered via
  // the shortcuts system so it also shows up in the discoverable
  // overlay.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        setOpen((v) => !v)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  // Register "g k" + show "⌘K" in the help overlay. Sequence form
  // works in the global useKeyboardShortcuts; we register the action
  // through the shortcuts context so the overlay lists it.
  useKeyboardShortcuts([
    {
      keys: "g k",
      description: "Open command palette",
      group: "Navigation",
      handler: () => setOpen(true),
    },
  ])
  useEffect(() => {
    return ctx.register({
      id: "global:command-palette",
      keys: "⌘ K",
      description: "Open command palette",
      group: "Navigation",
    })
  }, [ctx])

  // Cap each group at 8 items so a workspace with 500 quizzes doesn't
  // dump everything into the dialog — the search filter is the way
  // through to deeper rows anyway.
  const CAP = 8
  const items = useMemo(() => {
    return {
      courses: courses.slice(0, CAP).map((c) => ({
        id: `course:${c.id}`,
        title: c.title,
        sub: c.slug ? `/learn/${c.slug}` : "Course",
        href: `/dashboard/courses/${c.id}`,
      })),
      classes: liveSessions
        .slice()
        .sort((a, b) => b.scheduledAt.localeCompare(a.scheduledAt))
        .slice(0, CAP)
        .map((s) => ({
          id: `class:${s.id}`,
          title: s.title,
          sub: new Date(s.scheduledAt).toLocaleString(undefined, {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          }),
          href: `/dashboard/classes/${s.id}`,
        })),
      quizzes: quizzes.slice(0, CAP).map((q) => ({
        id: `quiz:${q.id}`,
        title: q.title,
        sub: `${q.questions.length} question${q.questions.length === 1 ? "" : "s"}`,
        href: `/dashboard/quizzes/${q.id}`,
      })),
      students: students.slice(0, CAP).map((u) => ({
        id: `student:${u.id}`,
        title: u.name,
        sub: u.email,
        href: `/dashboard/students/${u.id}`,
      })),
      whiteboards: whiteboards.slice(0, CAP).map((b) => ({
        id: `wb:${b.id}`,
        title: b.title,
        sub: `Last edited ${new Date(b.updatedAt).toLocaleDateString()}`,
        href: `/dashboard/whiteboards/${b.id}`,
      })),
    }
  }, [courses, liveSessions, quizzes, students, whiteboards])

  const go = (href: string) => {
    setOpen(false)
    router.push(href)
  }

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      title="Jump to…"
      description="Search for a class, quiz, student, course, or whiteboard"
    >
      <CommandInput placeholder="Search classes, quizzes, students, courses…" />
      <CommandList>
        <CommandEmpty>No matches.</CommandEmpty>

        {/* Navigate — every sidebar destination, searchable. Cmdk
            fuzzy-matches against the label + aliases, so "fees"
            finds Billing and "deleted" finds Trash. Always present
            so the palette stays useful in a brand-new workspace. */}
        <CommandGroup heading="Navigate">
          {navTargets.map((t) => (
            <CommandItem
              key={t.href}
              value={`${t.label} ${t.aliases ?? ""}`}
              onSelect={() => go(t.href)}
            >
              <span className="mr-2 [&_svg]:h-4 [&_svg]:w-4">{t.icon}</span>
              <span className="flex-1 truncate">{t.label}</span>
              <ArrowRight className="opacity-0 group-data-[selected=true]:opacity-50" />
            </CommandItem>
          ))}
        </CommandGroup>

        {items.classes.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Classes">
              {items.classes.map((c) => (
                <CommandItem
                  key={c.id}
                  // `value` is what cmdk fuzzy-matches against — include
                  // both title and sub so a search for "Maths Wed"
                  // matches a class titled "Maths" scheduled on a
                  // Wednesday.
                  value={`${c.title} ${c.sub}`}
                  onSelect={() => go(c.href)}
                >
                  <Video className="mr-2" />
                  <span className="flex-1 truncate">{c.title}</span>
                  <span className="text-xs text-muted-foreground">{c.sub}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {items.quizzes.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Quizzes">
              {items.quizzes.map((q) => (
                <CommandItem
                  key={q.id}
                  value={`${q.title} ${q.sub}`}
                  onSelect={() => go(q.href)}
                >
                  <FileQuestion className="mr-2" />
                  <span className="flex-1 truncate">{q.title}</span>
                  <span className="text-xs text-muted-foreground">{q.sub}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {items.students.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Students">
              {items.students.map((s) => (
                <CommandItem
                  key={s.id}
                  value={`${s.title} ${s.sub}`}
                  onSelect={() => go(s.href)}
                >
                  <User className="mr-2" />
                  <span className="flex-1 truncate">{s.title}</span>
                  <span className="text-xs text-muted-foreground">{s.sub}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {items.courses.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Courses">
              {items.courses.map((c) => (
                <CommandItem
                  key={c.id}
                  value={`${c.title} ${c.sub}`}
                  onSelect={() => go(c.href)}
                >
                  <BookOpen className="mr-2" />
                  <span className="flex-1 truncate">{c.title}</span>
                  <span className="text-xs text-muted-foreground">{c.sub}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {items.whiteboards.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Whiteboards">
              {items.whiteboards.map((b) => (
                <CommandItem
                  key={b.id}
                  value={`${b.title} ${b.sub}`}
                  onSelect={() => go(b.href)}
                >
                  <PenSquare className="mr-2" />
                  <span className="flex-1 truncate">{b.title}</span>
                  <span className="text-xs text-muted-foreground">{b.sub}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

      </CommandList>
    </CommandDialog>
  )
}
