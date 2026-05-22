"use client"

// Student-side sidebar — mirrors the visual pattern of
// `components/dashboard/sidebar.tsx` but stripped down to the 13
// learner-relevant rows. Single flat list (no collapsible groups);
// students don't need the 30-item nav teachers do.
//
// All links are prefixed with `/p/<tenant>/` so navigation stays
// inside the tenant's branded subtree. The tenant slug is read from
// the URL via `usePathname` (more reliable than the tenant cookie
// when a user is bouncing between two workspaces).

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Activity,
  Award,
  Banknote,
  BookOpen,
  ChevronDown,
  ClipboardList,
  FileQuestion,
  GraduationCap,
  Heart,
  Home,
  Inbox,
  LayoutDashboard,
  LogOut,
  MessageCircleQuestion,
  MessageSquareQuote,
  PenSquare,
  Settings,
  ShoppingBag,
  Film,
  Trash2,
  Trophy,
  UserPlus,
  Users2,
  Video,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { NotificationBell } from "@/components/dashboard/notification-bell"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { useLMS } from "@/lib/lms-store"
import { useTenantBrand } from "@/lib/tenant-brand"
import { openStudentWelcome } from "@/components/student/welcome-modal"
import { Sparkles } from "lucide-react"

interface NavItem {
  name: string
  /** Path *after* the `/p/<tenant>` prefix. e.g. "/my", "/my/courses". */
  path: string
  icon: LucideIcon
}

// Order matches "what the student does most" → "what they configure rarely".
const NAV: NavItem[] = [
  { name: "Home", path: "/my", icon: Home },
  { name: "My courses", path: "/my/courses", icon: BookOpen },
  { name: "Live classes", path: "/my/classes", icon: Video },
  { name: "Recordings", path: "/my/recordings", icon: Film },
  { name: "Quizzes", path: "/my/quizzes", icon: FileQuestion },
  { name: "Assignments", path: "/my/assignments", icon: ClipboardList },
  { name: "Doubts & Q&A", path: "/my/doubts", icon: MessageCircleQuestion },
  { name: "Whiteboards", path: "/my/whiteboards", icon: PenSquare },
  { name: "Communities", path: "/my/communities", icon: Users2 },
  { name: "Wall of Love", path: "/my/wall", icon: Heart },
  { name: "Leaderboard", path: "/my/leaderboard", icon: Trophy },
  { name: "Certificates", path: "/my/certificates", icon: Award },
  { name: "Inbox", path: "/my/inbox", icon: Inbox },
  { name: "Library", path: "/library", icon: ShoppingBag },
  { name: "Billing", path: "/my/billing", icon: Banknote },
  { name: "Refer & earn", path: "/my/referrals", icon: UserPlus },
  { name: "Leave a testimonial", path: "/my/testimonials", icon: MessageSquareQuote },
  { name: "Trash", path: "/my/trash", icon: Trash2 },
  { name: "Settings", path: "/my/settings", icon: Settings },
  { name: "Status", path: "/my/status", icon: Activity },
]

function initials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase() ?? "")
      .join("") || "?"
  )
}

// Pull the tenant slug from the current URL. Falls back to "" so the
// sidebar still renders (every link becomes /p//... which 404s — but
// that's a route-level mistake, not a sidebar one).
function useTenantSlugFromPath(): string {
  const pathname = usePathname() ?? ""
  const match = pathname.match(/^\/p\/([^/]+)/)
  return match ? match[1] : ""
}

export function StudentSidebar() {
  const pathname = usePathname() ?? ""
  const slug = useTenantSlugFromPath()
  const { currentUser, setCurrentUser, getUserNotifications, notifications } = useLMS()
  const brand = useTenantBrand()
  // Unread-notification count drives the badge on the Inbox nav row.
  // We re-derive it from the notifications array so a mark-read inside
  // the bell popover updates the badge in the same tick.
  const unreadCount = currentUser
    ? getUserNotifications(currentUser.id).filter((n) => n.status !== "read").length
    : 0
  void notifications
  const displayName = currentUser?.name ?? "Signed out"
  const roleLabel = currentUser
    ? currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1)
    : "Guest"

  // Teachers/admins previewing the student view get a footer link back
  // to their main dashboard. True students never see this.
  const isPreviewingTeacher =
    !!currentUser && currentUser.role !== "student"

  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
      <div className="flex h-16 shrink-0 items-center justify-between gap-2 border-b border-sidebar-border px-4">
        <Link
          href={slug ? `/p/${slug}` : "/"}
          className="inline-flex min-w-0 items-center gap-2"
        >
          {brand.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={brand.logoUrl}
              alt={brand.name}
              className="h-7 w-7 shrink-0 rounded object-contain"
            />
          ) : (
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-primary text-xs font-bold text-primary-foreground">
              {brand.name.slice(0, 1).toUpperCase()}
            </div>
          )}
          <span className="truncate text-sm font-semibold text-sidebar-foreground">
            {brand.name}
          </span>
        </Link>
        <NotificationBell />
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-1">
          {NAV.map((item) => {
            const href = slug ? `/p/${slug}${item.path}` : item.path
            // Match exactly on the home row so /my/courses doesn't
            // also mark "Home" as active. Everything else uses prefix.
            const active =
              item.path === "/my"
                ? pathname === `/p/${slug}/my`
                : pathname.startsWith(href)
            const Icon = item.icon
            return (
              <li key={item.path}>
                <Link
                  href={href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                    active
                      ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                      : "text-sidebar-foreground/80 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground",
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{item.name}</span>
                  {item.path === "/my/inbox" && unreadCount > 0 && (
                    <span className="ml-auto inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-semibold text-destructive-foreground">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </Link>
              </li>
            )
          })}
        </ul>

        {isPreviewingTeacher && (
          <div className="mt-6 rounded-lg border border-dashed border-sidebar-border bg-sidebar-accent/20 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-sidebar-foreground/60">
              Preview mode
            </p>
            <p className="mt-1 text-xs text-sidebar-foreground/70">
              You&apos;re viewing the student experience. Your usual teacher
              tools are still one click away.
            </p>
            <Button asChild variant="outline" size="sm" className="mt-2 w-full">
              <Link href="/dashboard">
                <LayoutDashboard className="mr-1.5 h-3.5 w-3.5" />
                Back to teacher dashboard
              </Link>
            </Button>
          </div>
        )}
      </nav>

      <div className="shrink-0 border-t border-sidebar-border bg-sidebar p-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-sidebar-accent">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-medium text-primary-foreground">
                {initials(displayName)}
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="truncate text-sm font-medium text-sidebar-foreground">
                  {displayName}
                </p>
                <p className="truncate text-xs text-sidebar-foreground/60">{roleLabel}</p>
              </div>
              <ChevronDown className="h-4 w-4 text-sidebar-foreground/50" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem asChild>
              <Link href={slug ? `/p/${slug}/my/settings` : "/login"}>
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => openStudentWelcome()}>
              <Sparkles className="mr-2 h-4 w-4" />
              Show me around again
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={slug ? `/p/${slug}` : "/"}>
                <GraduationCap className="mr-2 h-4 w-4" />
                Public site
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              asChild
              className="text-destructive focus:text-destructive"
            >
              <Link
                href={slug ? `/p/${slug}/login` : "/login"}
                onClick={() => setCurrentUser(null)}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  )
}

export function StudentHeader() {
  const slug = useTenantSlugFromPath()
  const brand = useTenantBrand()
  const { setCurrentUser } = useLMS()
  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-card px-6 lg:hidden">
      <Link href={slug ? `/p/${slug}/my` : "/"} className="inline-flex items-center gap-2">
        {brand.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={brand.logoUrl}
            alt={brand.name}
            className="h-7 w-7 rounded object-contain"
          />
        ) : (
          <div className="flex h-7 w-7 items-center justify-center rounded bg-primary text-xs font-bold text-primary-foreground">
            {brand.name.slice(0, 1).toUpperCase()}
          </div>
        )}
        <span className="truncate text-sm font-semibold">{brand.name}</span>
      </Link>
      <div className="flex items-center gap-2">
        <NotificationBell />
        <Button variant="outline" asChild size="sm">
          <Link
            href={slug ? `/p/${slug}/login` : "/login"}
            onClick={() => setCurrentUser(null)}
          >
            Sign out
          </Link>
        </Button>
      </div>
    </header>
  )
}
