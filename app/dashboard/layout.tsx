import { DashboardSidebar, DashboardHeader } from "@/components/dashboard/sidebar"
import { EmailVerifyBanner } from "@/components/dashboard/email-verify-banner"
import { ShortcutsProvider } from "@/components/dashboard/shortcuts-provider"
import { CommandPalette } from "@/components/dashboard/command-palette"
import { StudentRoleGuard } from "@/components/dashboard/student-role-guard"
import { DashboardAuthGate } from "@/components/dashboard/dashboard-auth-gate"
import { ReminderPoller } from "@/components/dashboard/reminder-poller"
import { TokenRefresher } from "@/components/dashboard/token-refresher"
import { TeacherWelcomeModal } from "@/components/dashboard/welcome-modal"
import { SkipToContent } from "@/components/accessibility/skip-to-content"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    // ShortcutsProvider owns the global keyboard shortcuts (g h, g q,
    // ?, etc.) and the discoverable overlay. Wrapping the whole
    // dashboard means every page gets the shortcuts for free, and
    // individual pages can register their own via usePageShortcut.
    <ShortcutsProvider>
      {/* Sprint C Brand #48 — skip-to-content link. Stays outside
          the auth gate so it's reachable on the loading spinner
          too (where there's no main content yet but the link
          will quietly resolve to nothing — better than missing). */}
      <SkipToContent />
      {/* Hard auth gate. Anyone without a signed-in LMS user gets
          bounced to /login?next=<here>. Previously the dashboard
          was open to anonymous visitors — they saw the chrome with
          "No account is signed in" banners scattered across every
          page, which is confusing and lets random visitors land on
          the same routes that teachers use. */}
      <DashboardAuthGate>
      {/* Bounce signed-in students to their tenant-scoped student
          dashboard. Instructors + admins + anonymous visitors fall
          through. */}
      <StudentRoleGuard />
        {/* Keep the backend access token fresh while a teacher tab is
          open. Access tokens TTL is 60 minutes; this re-mints from
          the long-lived refresh cookie every 45 minutes and on tab
          return so a user who steps away doesn't come back to a
          "Session expired" toast on their next click. */}
        <TokenRefresher />
      {/* Class-reminder pinger. Pings /api/cron/class-reminders every
          60s so the server-side scanner can fire T-3h / T-1h / T-15m
          reminders during the POC (no external cron yet). Idempotent
          — safe to mount in every layout. */}
      <ReminderPoller />
      {/* First-visit welcome modal for teachers + admins. Fires once
          per (user, workspace) — pointer at the left nav and ⌘K. */}
      <TeacherWelcomeModal />
      {/* Global command palette — ⌘K from anywhere in the dashboard.
          Mounted at the layout root so it survives navigation and
          stays out of every page's tree. */}
      <CommandPalette />
      <div className="flex min-h-screen bg-background">
        <DashboardSidebar />
        {/* min-w-0 is critical: flex items default to min-width: auto, which
            lets long table rows or wide cards push the whole page horizontally
            (browser scrollbar shows up instead of the table's own overflow). */}
        <div className="flex min-w-0 flex-1 flex-col">
          <DashboardHeader />
          {/* Generous padding so content never butts against the sidebar
              on wide screens — two more notches than the prior lg:p-8. */}
            <main
              id="main-content"
              tabIndex={-1}
              className="min-w-0 flex-1 p-6 focus:outline-none lg:px-10 lg:py-8"
            >
            <EmailVerifyBanner />
            {children}
          </main>
        </div>
      </div>
      </DashboardAuthGate>
    </ShortcutsProvider>
  )
}
