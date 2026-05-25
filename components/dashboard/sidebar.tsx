"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { LayoutDashboard, FilePlus, Heart, History, Users, Settings, LogOut, ChevronDown, ChevronRight, BookOpen, Bookmark, GraduationCap, FileQuestion, BarChart3, MessageSquare, Megaphone, Palette, Trophy, UserPlus, Video, ClipboardList, ShoppingBag, Globe, ExternalLink as ExternalLinkIcon, Home, FileText, Trash2, Code2, Users2, PenSquare, Film, Inbox, CreditCard, Banknote, Webhook as WebhookIcon, Languages as LanguagesIcon, Activity, Sparkles, Calendar, Beaker } from "lucide-react"
import { openTeacherWelcome } from "@/components/dashboard/welcome-modal"
import { NotificationBell } from "@/components/dashboard/notification-bell"
import { ViewPublicSiteButton } from "@/components/dashboard/view-public-site-button"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { Logo } from "@/components/brand/logo"
import { useLMS } from "@/lib/lms-store"
import { usePortal } from "@/lib/portal-store"
import { useTenant } from "@/lib/tenant-store"
import { tenantPublicUrl } from "@/lib/tenant-resolver"
import { PlanLockIcon } from "@/components/dashboard/plan-lock"
import { PlanBadge } from "@/components/dashboard/plan-badge"
import { CommunityTooltip } from "@/components/dashboard/community-tooltip"
import type { LucideIcon } from "lucide-react"
import type { PlanLimits } from "@/lib/plans"

interface NavItem {
  name: string
  href: string
  icon: LucideIcon
  /** Optional plan-gate. When the current plan doesn't include this
   *  feature, a small lock + popover renders next to the item. */
  lockedBehind?: keyof PlanLimits
}

interface NavGroup {
  id: string
  /** Human-readable label shown next to the chevron. */
  label: string
  items: NavItem[]
  /** When true, the group starts expanded for first-time visitors. */
  defaultOpen?: boolean
}

// "Dashboard" stays outside any group — it's the home view, one click away
// at all times. Everything else lives in collapsible groups so the sidebar
// reads as 6 lines instead of 30 until the user expands what they need.
const pinnedItem: NavItem = {
  name: "Dashboard",
  href: "/dashboard",
  icon: LayoutDashboard,
}

const navGroups: NavGroup[] = [
  {
    id: "teach",
    label: "Teach",
    defaultOpen: true,
    items: [
      { name: "Courses", href: "/dashboard/courses", icon: BookOpen },
      { name: "Students", href: "/dashboard/students", icon: GraduationCap },
      { name: "Engagement", href: "/dashboard/students/engagement", icon: Activity },
      { name: "Communities", href: "/dashboard/batches", icon: Users2 },
      { name: "Live Classes", href: "/dashboard/classes", icon: Video },
      { name: "Calendar", href: "/dashboard/calendar", icon: Calendar },
      { name: "Recordings", href: "/dashboard/recordings", icon: Film },
      { name: "Whiteboards", href: "/dashboard/whiteboards", icon: PenSquare },
      { name: "Quizzes", href: "/dashboard/quizzes", icon: FileQuestion },
      { name: "Docs", href: "/dashboard/docs", icon: FileText },
      { name: "Assignments", href: "/dashboard/assignments", icon: ClipboardList },
      { name: "Storefront", href: "/dashboard/store", icon: ShoppingBag },
      { name: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
      { name: "Experiments", href: "/dashboard/experiments", icon: Beaker },
    ],
  },
  {
    id: "certificates",
    label: "Certificates",
    items: [
      { name: "New Batch", href: "/dashboard/new-batch", icon: FilePlus },
      { name: "Batch History", href: "/dashboard/history", icon: History },
      { name: "Templates", href: "/dashboard/templates", icon: Palette },
    ],
  },
  {
    id: "community",
    label: "Community",
    items: [
      // Inbox sits at the top — single rolled-up view of doubts,
      // discussions, batch posts, leads, and blog comments that need
      // attention. The specific surfaces below remain for deep work.
      { name: "Inbox", href: "/dashboard/inbox", icon: Inbox },
      // Saved — the per-user bookmarked-posts tray. Lives in
      // Community because that's where every saved post originates
      // from today; if we add saved lessons or recordings later
      // they'll come into the same surface.
      { name: "Saved", href: "/dashboard/saved", icon: Bookmark },
      // Discussions has been folded into Communities — see
      // /dashboard/discussions/page.tsx for the redirect surface.
      // Removing the nav entry prevents new traffic to the old path.
      { name: "Doubts & Q&A", href: "/dashboard/doubts", icon: FileQuestion },
      { name: "Announcements", href: "/dashboard/announcements", icon: Megaphone, lockedBehind: "marketingTools" },
      { name: "Leaderboard", href: "/dashboard/leaderboard", icon: Trophy },
      { name: "Wall of Love", href: "/dashboard/wall", icon: Heart },
      { name: "Refer & Earn", href: "/dashboard/referrals", icon: UserPlus },
    ],
  },
  {
    id: "portal",
    label: "Public site",
    items: [
      { name: "Overview", href: "/dashboard/portal", icon: Globe },
      { name: "Home page", href: "/dashboard/portal/home", icon: Home },
      { name: "Pages", href: "/dashboard/portal/pages", icon: FileText },
      { name: "Brand", href: "/dashboard/portal/brand", icon: Palette },
      { name: "Public profile", href: "/dashboard/portal/profile", icon: UserPlus },
      { name: "Testimonials", href: "/dashboard/portal/testimonials", icon: Heart },
      { name: "Blog", href: "/dashboard/portal/blog", icon: BookOpen },
      { name: "Announcements", href: "/dashboard/portal/announcements", icon: Megaphone, lockedBehind: "marketingTools" },
      { name: "Lead inbox", href: "/dashboard/portal/leads", icon: MessageSquare, lockedBehind: "marketingTools" },
      { name: "Domain & URL", href: "/dashboard/portal/domain", icon: ExternalLinkIcon, lockedBehind: "customDomain" },
      { name: "Languages", href: "/dashboard/portal/languages", icon: LanguagesIcon, lockedBehind: "multilingual" },
    ],
  },
  {
    id: "workspace",
    label: "Workspace",
    items: [
      { name: "Instructors", href: "/dashboard/faculty", icon: UserPlus },
      { name: "Manage Users", href: "/dashboard/users", icon: Users },
      { name: "Billing & plan", href: "/dashboard/billing", icon: CreditCard },
      { name: "Payouts", href: "/dashboard/payouts", icon: Banknote },
      { name: "Developer", href: "/dashboard/developer", icon: Code2, lockedBehind: "apiAccess" },
      { name: "Webhooks", href: "/dashboard/developer/webhooks", icon: WebhookIcon, lockedBehind: "apiAccess" },
      { name: "Trash", href: "/dashboard/trash", icon: Trash2 },
      { name: "System status", href: "/dashboard/status", icon: Activity },
      { name: "Settings", href: "/dashboard/settings", icon: Settings },
    ],
  },
]

const COLLAPSE_STORAGE_KEY = "dashboard:sidebar:openGroups"

// Maps a sidebar href to a stable selector key the product tour
// hooks into. Only the items the tour points to need to resolve —
// returns undefined for everything else so we don't pollute the DOM
// with attributes nothing reads.
function tourKey(href: string): string | undefined {
  if (href === "/dashboard/courses") return "nav-courses"
  if (href === "/dashboard/students") return "nav-students"
  if (href === "/dashboard/doubts") return "nav-doubts"
  if (href === "/dashboard/portal") return "nav-portal"
  if (href === "/dashboard/store") return "nav-store"
  return undefined
}

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

// Loads + persists which sidebar groups are expanded across navigations.
// Uses sessionStorage-style hydration to avoid flashing the wrong default
// before the localStorage value is read.
function useGroupOpenState(activeGroupId: string | null) {
  const [openIds, setOpenIds] = useState<Set<string>>(() => {
    // SSR pass — no localStorage. Return defaults; the effect below
    // overwrites once we're on the client.
    return new Set(navGroups.filter((g) => g.defaultOpen).map((g) => g.id))
  })

  // Hydrate from localStorage on mount, then ensure the group containing
  // the current page is open (so the user always sees where they are).
  useEffect(() => {
    if (typeof window === "undefined") return
    let next: Set<string>
    try {
      const raw = window.localStorage.getItem(COLLAPSE_STORAGE_KEY)
      next = raw
        ? new Set(JSON.parse(raw) as string[])
        : new Set(navGroups.filter((g) => g.defaultOpen).map((g) => g.id))
    } catch {
      next = new Set(navGroups.filter((g) => g.defaultOpen).map((g) => g.id))
    }
    if (activeGroupId) next.add(activeGroupId)
    setOpenIds(next)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Auto-open the active group whenever the user navigates into a new section.
  // We don't auto-collapse the previously-open ones — that'd be jarring.
  useEffect(() => {
    if (!activeGroupId) return
    setOpenIds((prev) => {
      if (prev.has(activeGroupId)) return prev
      const next = new Set(prev)
      next.add(activeGroupId)
      return next
    })
  }, [activeGroupId])

  const toggle = (id: string) => {
    setOpenIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem(COLLAPSE_STORAGE_KEY, JSON.stringify(Array.from(next)))
        } catch {
          /* localStorage full or disabled — silently ignore, in-memory state still works */
        }
      }
      return next
    })
  }

  return { openIds, toggle }
}

export function DashboardSidebar() {
  const pathname = usePathname()
  const { currentUser, doubts, discussions, setCurrentUser } = useLMS()
  const { leads, posts } = usePortal()
  const { currentTenant } = useTenant()
  const displayName = currentUser?.name ?? "Signed out"
  const roleLabel = currentUser
    ? currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1)
    : "Guest"

  // Find which group the current pathname belongs to. The "Teach" group
  // wins ties because more pages share its top-level prefix.
  const activeGroupId = useMemo(() => {
    for (const group of navGroups) {
      for (const item of group.items) {
        if (pathname === item.href || pathname.startsWith(item.href + "/")) {
          return group.id
        }
      }
    }
    return null
  }, [pathname])

  const { openIds, toggle } = useGroupOpenState(activeGroupId)

  // Per-nav unread counts. Surfaces as a small pill so the teacher
  // sees pending work without opening the page. Guest enquiries on
  // doubts + new leads in the inbox get an "accent" treatment so
  // they catch the eye faster than in-course chatter.
  const openDoubts = doubts.filter((d) => d.status === "open")
  const openGuestEnquiries = openDoubts.filter((d) => !!d.guest)

  const unresolvedDiscussions = discussions.filter((d) => {
    if (d.isResolved) return false
    const replies = d.replies ?? []
    if (replies.length === 0) return true
    const last = replies[replies.length - 1]
    return last.authorId !== currentUser?.id
  })

  const newLeads = leads.filter((l) => l.status === "new")

  const unreadBlogComments = posts.reduce((acc, p) => {
    const reviewedAt = p.lastCommentsReviewedAt
      ? new Date(p.lastCommentsReviewedAt).getTime()
      : 0
    for (const c of p.comments ?? []) {
      if (new Date(c.createdAt).getTime() > reviewedAt) acc++
    }
    return acc
  }, 0)

  // Inbox count = sum of everything-needs-attention sources. Same math
  // the inbox page itself uses; cheap enough to compute on every sidebar
  // render. Accent tone because the inbox is the highest-priority surface
  // ("if you check one thing today, check this").
  const inboxCount =
    openDoubts.length + unresolvedDiscussions.length + newLeads.length + unreadBlogComments

  const badgeFor = (href: string): { count: number; tone: "default" | "accent" } | undefined => {
    if (href === "/dashboard/inbox" && inboxCount > 0) {
      return {
        count: inboxCount,
        tone: openGuestEnquiries.length > 0 || newLeads.length > 0 ? "accent" : "default",
      }
    }
    if (href === "/dashboard/doubts" && openDoubts.length > 0) {
      return {
        count: openDoubts.length,
        tone: openGuestEnquiries.length > 0 ? "accent" : "default",
      }
    }
    if (href === "/dashboard/discussions" && unresolvedDiscussions.length > 0) {
      return { count: unresolvedDiscussions.length, tone: "default" }
    }
    if (href === "/dashboard/portal/leads" && newLeads.length > 0) {
      return { count: newLeads.length, tone: "accent" }
    }
    if (href === "/dashboard/portal/blog" && unreadBlogComments > 0) {
      return { count: unreadBlogComments, tone: "default" }
    }
    return undefined
  }

  // Sum of badge counts inside a group, surfaced on the collapsed group
  // header so users see "you have stuff in here" without expanding. The
  // Inbox item is skipped because it's a rollup of the other sources
  // already — counting it would double everything.
  const groupBadgeCount = (group: NavGroup): number => {
    let total = 0
    for (const item of group.items) {
      if (item.href === "/dashboard/inbox") continue
      const b = badgeFor(item.href)
      if (b) total += b.count
    }
    return total
  }

  return (
    <aside className="hidden w-64 flex-shrink-0 border-r border-border bg-sidebar lg:sticky lg:top-0 lg:flex lg:h-screen lg:max-h-screen lg:flex-col">
      {/* Logo + tenant header */}
      <div className="border-b border-sidebar-border">
        <div className="flex h-16 items-center justify-between px-6">
          <Logo size="md" />
          <NotificationBell />
        </div>
        {currentTenant && (
          <div className="flex items-center justify-between gap-2 border-t border-sidebar-border/60 bg-sidebar-accent/40 px-6 py-1.5 text-[10px]">
            {/* Workspace name → settings; the tenant URL slot becomes
                an outbound link to the public site (with an external-
                link glyph) so "view your live site" is one click from
                anywhere in the dashboard, without crowding the logo. */}
            <div className="flex min-w-0 flex-1 items-center gap-1.5">
              <Link
                href="/dashboard/settings"
                className="min-w-0 truncate font-mono text-sidebar-foreground/80 hover:text-sidebar-foreground tenant-name"
                title="Workspace settings"
              >
                {currentTenant.name}
              </Link>
              <span className="text-sidebar-foreground/45">·</span>
              <a
                href={tenantPublicUrl(currentTenant.slug, currentTenant.customDomain, currentTenant.customDomainStatus)}
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex min-w-0 items-center gap-1 truncate rounded-md px-1 py-0.5 font-mono text-sidebar-foreground/75 transition-colors hover:bg-sidebar-accent hover:text-primary"
                title="Open your public site in a new tab"
              >
                {/* <span className="truncate">
                  {tenantPublicUrl(currentTenant.slug, currentTenant.customDomain, currentTenant.customDomainStatus).replace(/^https?:\/\//, "")}
                </span> */}
                <ExternalLinkIcon className="h-3.5 w-3.5 shrink-0 text-primary group-hover:scale-110 transition-transform" />
              </a>
            </div>
            <PlanBadge />
            {currentTenant.status === "suspended" && (
              <span className="rounded-full bg-destructive/20 px-1.5 py-0.5 font-semibold uppercase tracking-wide text-destructive">
                Suspended
              </span>
            )}
          </div>
        )}
      </div>

      <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {/* Pinned Dashboard — outside any group so it's always one click away. */}
        <Link
          href={pinnedItem.href}
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
            pathname === pinnedItem.href
              ? "bg-sidebar-accent text-sidebar-accent-foreground"
              : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
          )}
        >
          <pinnedItem.icon className="h-5 w-5" />
          {pinnedItem.name}
        </Link>

        {navGroups.map((group) => {
          const isOpen = openIds.has(group.id)
          const groupTotal = groupBadgeCount(group)
          return (
            <div key={group.id} className="mt-2">
              <button
                type="button"
                onClick={() => toggle(group.id)}
                className="group/header flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/55 transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
                aria-expanded={isOpen}
                aria-controls={`navgroup-${group.id}`}
              >
                {isOpen ? (
                  <ChevronDown className="h-3 w-3 transition-transform" />
                ) : (
                  <ChevronRight className="h-3 w-3 transition-transform" />
                )}
                <span className="flex-1 text-left">{group.label}</span>
                {/* Collapsed groups still surface their pending count so the
                    user knows there's stuff inside without expanding first. */}
                {!isOpen && groupTotal > 0 && (
                  <span className="inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-primary/15 px-1.5 text-[10px] font-semibold leading-5 tabular-nums normal-case tracking-normal text-primary">
                    {groupTotal > 99 ? "99+" : groupTotal}
                  </span>
                )}
                {/* Portal group gets a "View" deep link in the header so it's
                    one click to open the public site even when collapsed. */}
                {group.id === "portal" && currentTenant && (
                  <a
                    href={`/p/${currentTenant.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-1 rounded px-1 text-[10px] font-medium normal-case tracking-normal text-primary/80 hover:text-primary"
                    title="View your public portal"
                  >
                    View <ExternalLinkIcon className="h-3 w-3" />
                  </a>
                )}
              </button>
              {isOpen && (
                <div id={`navgroup-${group.id}`} className="mt-1 space-y-1">
                  {group.items.map((item) => {
                    const badge = badgeFor(item.href)
                    const active = pathname === item.href || pathname.startsWith(item.href + "/")
                    // Wrap the Communities entry in the multipurpose
                    // explainer tooltip so first-time users hover and
                    // immediately understand "cohort / batch / interest
                    // group / alumni / staff room — same engine".
                    const isCommunities = item.href === "/dashboard/batches"
                    const linkEl = (
                      <Link
                        key={item.name}
                        href={item.href}
                        data-tour={tourKey(item.href)}
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                          active
                            ? "bg-sidebar-accent text-sidebar-accent-foreground"
                            : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                        )}
                      >
                        <item.icon className="h-5 w-5" />
                        <span className="flex-1">{item.name}</span>
                        {item.lockedBehind && (
                          <span onClick={(e) => e.preventDefault()}>
                            <PlanLockIcon feature={item.lockedBehind} />
                          </span>
                        )}
                        {badge && (
                          <span
                            className={cn(
                              "inline-flex min-w-[1.25rem] items-center justify-center rounded-full px-1.5 text-[10px] font-semibold leading-5 tabular-nums",
                              badge.tone === "accent"
                                ? "bg-accent text-accent-foreground"
                                : "bg-primary/15 text-primary",
                            )}
                            aria-label={`${badge.count} unread`}
                          >
                            {badge.count > 99 ? "99+" : badge.count}
                          </span>
                        )}
                      </Link>
                    )
                    return isCommunities ? (
                      <CommunityTooltip key={item.name}>{linkEl}</CommunityTooltip>
                    ) : (
                      linkEl
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </nav>

      {/* User Menu */}
      <div className="shrink-0 border-t border-sidebar-border bg-sidebar p-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-sidebar-accent transition-colors">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-medium text-primary-foreground">
                {initials(displayName)}
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="truncate text-sm font-medium text-sidebar-foreground">{displayName}</p>
                <p className="truncate text-xs text-sidebar-foreground/60">{roleLabel}</p>
              </div>
              <ChevronDown className="h-4 w-4 text-sidebar-foreground/50" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem asChild>
              <Link href="/dashboard/settings">
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => openTeacherWelcome()}>
              <Sparkles className="mr-2 h-4 w-4" />
              Show me around again
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild className="text-destructive focus:text-destructive">
              <Link href="/login" onClick={() => setCurrentUser(null)}>
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

export function DashboardHeader() {
  const { setCurrentUser } = useLMS()
  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-card px-6 lg:hidden">
      <Link href="/dashboard">
        <Logo size="sm" />
      </Link>
      <div className="flex items-center gap-2">
        <PlanBadge />
        <ViewPublicSiteButton variant="compact" />
        <NotificationBell />
        <Button variant="outline" asChild size="sm">
          <Link href="/login" onClick={() => setCurrentUser(null)}>Sign out</Link>
        </Button>
      </div>
    </header>
  )
}
