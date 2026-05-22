"use client"

// Pings /api/cron/class-reminders every 60 seconds while mounted so
// the server-side scanner can fan out class reminders during the POC
// (no external cron service yet). The endpoint is idempotent —
// remindersSent markers on each LiveSession prevent re-firing — so
// it's safe to call from every tab a teacher or student has open.
//
// Mount once in the dashboard layout + once in the student
// /p/[tenant]/my layout. Both are client components; the poll runs
// alongside whatever surface the user is on. When real production
// infra lands, swap this for a Vercel Cron entry pointing at the
// same endpoint and remove the component.

import { useEffect } from "react"

const POLL_INTERVAL_MS = 60_000

export function ReminderPoller() {
  useEffect(() => {
    let cancelled = false
    let timer: ReturnType<typeof setInterval> | null = null

    const fire = () => {
      void fetch("/api/cron/class-reminders", {
        method: "POST",
        // Best-effort; keepalive lets it survive a tab close mid-flight.
        keepalive: true,
      }).catch(() => {
        // Tolerable — next tick retries.
      })
    }

    // Fire on mount so a fresh open immediately checks for windows
    // that crossed while no tabs were open.
    if (!document.hidden) fire()
    timer = setInterval(() => {
      if (cancelled) return
      // Skip polls while the tab is backgrounded — saves quota; the
      // visibility listener below re-fires when the tab returns.
      if (document.hidden) return
      fire()
    }, POLL_INTERVAL_MS)

    const onVisible = () => {
      if (!document.hidden) fire()
    }
    document.addEventListener("visibilitychange", onVisible)

    return () => {
      cancelled = true
      if (timer) clearInterval(timer)
      document.removeEventListener("visibilitychange", onVisible)
    }
  }, [])

  return null
}
