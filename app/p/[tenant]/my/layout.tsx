"use client"

// Student dashboard layout. Mirrors /app/dashboard/layout.tsx but with
// the lighter student sidebar + the tenant-scoped chrome. Every page
// under /p/[tenant]/my/* renders through this layout.
//
// Gating: if no user is signed in, redirect to /p/<tenant>/login with
// a `?next=` so they come back. Instructors/admins are allowed through
// (they're "previewing" the student view) — the sidebar shows them a
// "Back to teacher dashboard" footer.

import { useEffect } from "react"
import { useRouter, usePathname, useParams } from "next/navigation"
import { StudentSidebar, StudentHeader } from "@/components/student/student-sidebar"
import { ShortcutsProvider } from "@/components/dashboard/shortcuts-provider"
import { CommandPalette } from "@/components/dashboard/command-palette"
import { ReminderPoller } from "@/components/dashboard/reminder-poller"
import { TokenRefresher } from "@/components/dashboard/token-refresher"
import { StudentWelcomeModal } from "@/components/student/welcome-modal"
import { useLMS } from "@/lib/lms-store"

export default function StudentDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { currentUser, hydrated } = useLMS()
  const router = useRouter()
  const pathname = usePathname() ?? ""
  const params = useParams<{ tenant: string }>()
  const tenantSlug = Array.isArray(params.tenant)
    ? params.tenant[0] ?? ""
    : params.tenant ?? ""

  // Auth gate. WAIT for the lms-store to finish hydrating before
  // deciding whether to redirect — otherwise the very first render
  // sees `currentUser === null` (the store starts empty, then reads
  // localStorage in a useEffect) and we bounced legitimately signed-
  // in students to the login page on every refresh. With this gate
  // we only redirect when we *know* there's no user.
  useEffect(() => {
    if (!hydrated) return
    if (currentUser) return
    const slugMatch = pathname.match(/^\/p\/([^/]+)/)
    const slug = slugMatch ? slugMatch[1] : ""
    const next = encodeURIComponent(pathname)
    const dest = slug
      ? `/p/${slug}/login?next=${next}`
      : `/login?next=${next}`
    router.replace(dest)
  }, [hydrated, currentUser, pathname, router])

  // Don't paint the dashboard chrome until we know who's logged in.
  // Hydration usually settles in one or two ticks, so this is a
  // brief skeleton — much less surprising than rendering the
  // sidebar/header with stale state from the previous tab or a
  // null user and then snapping into the right view.
  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground" />
      </div>
    )
  }

  // No user post-hydration — the redirect above is already firing,
  // but render nothing in the meantime so the dashboard doesn't
  // flash for a frame.
  if (!currentUser) return null

  return (
    <ShortcutsProvider>
      {/* Command palette stays available — it's tenant-agnostic
          shortcuts (g h goes to /dashboard for teachers, but for
          students the layout-level redirect kicks them back to /my
          when they hit teacher routes). Future improvement: a
          student-flavoured palette with /my targets, but the
          existing one works as a search-everything affordance. */}
      <CommandPalette />
      {/* Keep the backend access token fresh — re-mint from the
          refresh cookie every 45 min and on tab return so students
          don't get the "Session expired" hop after stepping away. */}
      <TokenRefresher />
      {/* Pings /api/cron/class-reminders every 60s so T-3h / T-1h /
          T-15m reminders go out while the student has the dashboard
          open. Idempotent — markers on each session prevent dupes. */}
      <ReminderPoller />
      {/* First-visit welcome modal — fires once per (student, tenant)
          pair. Sets a localStorage marker so subsequent visits stay
          out of the way. */}
      <StudentWelcomeModal tenantSlug={tenantSlug} />
      <div className="flex min-h-screen bg-background">
        <StudentSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <StudentHeader />
          <main className="min-w-0 flex-1 p-6 lg:px-10 lg:py-8">
            {children}
          </main>
        </div>
      </div>
    </ShortcutsProvider>
  )
}
