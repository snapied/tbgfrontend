import { DashboardSidebar, DashboardHeader } from "@/components/dashboard/sidebar"
import { EmailVerifyBanner } from "@/components/dashboard/email-verify-banner"
import { ShortcutsProvider } from "@/components/dashboard/shortcuts-provider"
import { CommandPalette } from "@/components/dashboard/command-palette"
import { StudentRoleGuard } from "@/components/dashboard/student-role-guard"
import { ReminderPoller } from "@/components/dashboard/reminder-poller"
import { TeacherWelcomeModal } from "@/components/dashboard/welcome-modal"

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
      {/* Bounce signed-in students to their tenant-scoped student
          dashboard. Teachers + admins + anonymous visitors fall
          through. */}
      <StudentRoleGuard />
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
          <main className="min-w-0 flex-1 p-6 lg:px-10 lg:py-8">
            <EmailVerifyBanner />
            {children}
          </main>
        </div>
      </div>
    </ShortcutsProvider>
  )
}
