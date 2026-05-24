"use client"

// Auto-refreshes the backend access token while the user is on the
// platform. Access tokens have a 60-minute TTL, refresh cookie 30
// days — so as long as the user keeps a tab open we can mint a new
// access token from the cookie before the old one dies and avoid
// the "Session expired — sign in again" hop on the next API call.
//
// Triggers a refresh:
//   - once on mount (covers stale tokens left over from yesterday)
//   - on a 45-minute interval (TTL 60 min, leaves 15 min slack)
//   - whenever the tab becomes visible after being hidden (catches
//     the user-came-back-from-lunch case faster than the interval)
//
// All calls funnel through tryRefreshSession() which dedupes
// in-flight requests, so the visibility + interval handlers won't
// stampede the backend.

import { useEffect } from "react"
import {
  hasAccessToken,
  tryRefreshSession,
} from "@/lib/billing-client"

const REFRESH_INTERVAL_MS = 45 * 60 * 1000

export function TokenRefresher() {
  useEffect(() => {
    let cancelled = false

    const refresh = () => {
      if (cancelled) return
      // No token at all → user is signed out and the auth gate is
      // already redirecting them to /login. Don't burn a request.
      if (!hasAccessToken()) return
      void tryRefreshSession()
    }

    refresh()
    const timer = setInterval(refresh, REFRESH_INTERVAL_MS)

    const onVisible = () => {
      if (!document.hidden) refresh()
    }
    document.addEventListener("visibilitychange", onVisible)

    return () => {
      cancelled = true
      clearInterval(timer)
      document.removeEventListener("visibilitychange", onVisible)
    }
  }, [])

  return null
}
