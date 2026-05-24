"use client"

// Auth gate for /dashboard/*. Mirrors the student-portal layout's
// gate but flipped: only signed-in instructors and admins reach
// /dashboard. Students (when logged in) are bounced by
// StudentRoleGuard; guests (no currentUser) are bounced HERE.
//
// Two timing gotchas this gate has to handle:
//
//   1. LMS-store hydration. The store reads localStorage in a
//      useEffect, so the very first render always shows
//      currentUser === null even for a legitimately signed-in user.
//      We wait on `hydrated` before deciding.
//
//   2. The /login → /dashboard handoff. The login page writes a
//      `thebigclass.pendingLogin` breadcrumb in localStorage and
//      routes here; the LMS store's pendingLogin handler then
//      promotes the matching user into currentUserId. That handler
//      runs in a separate useEffect that can race with this gate's
//      "no user → redirect" effect — and on a clean login, lose.
//      If we redirect at that moment, the user gets thrown back to
//      /login a tick before the handler would have signed them in.
//      To avoid that, we treat the breadcrumb's presence as "login
//      in progress" and stall the redirect until it's consumed.

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useLMS } from "@/lib/lms-store"

const PENDING_LOGIN_KEY = "thebigclass.pendingLogin"

export function DashboardAuthGate({ children }: { children: React.ReactNode }) {
  const { currentUser, hydrated } = useLMS()
  const router = useRouter()
  const pathname = usePathname() ?? ""

  // Tracks whether a login breadcrumb is currently sitting in
  // localStorage. The LMS-store handler clears it as soon as it
  // consumes the breadcrumb; we re-read on every render so the gate
  // unblocks the instant the handler finishes.
  const [pendingLogin, setPendingLogin] = useState<boolean>(() => {
    if (typeof window === "undefined") return false
    try {
      return !!window.localStorage.getItem(PENDING_LOGIN_KEY)
    } catch {
      return false
    }
  })

  // Re-check the breadcrumb when hydration completes or the user id
  // flips. We key on `currentUser?.id` (a string) instead of
  // `currentUser` (the user object) on purpose: upstream effects in
  // the LMS store can replace user objects with new references that
  // carry the same id (e.g. stamping `lastLoginAt` on the matched
  // user fires `setUsers(prev.map(...))`, returning a new array with
  // a fresh object reference for that one user). If we depended on
  // the object itself, those ref-only updates would fire this effect
  // every render, and because they happen in the same commit as the
  // breadcrumb removal in localStorage, `setPendingLogin` could read
  // a flipped value and trigger another re-render → infinite loop.
  // Keying on the id makes the effect fire exactly when the *signed-in
  // user identity* changes, which is the actual signal we care about.
  const userId = currentUser?.id ?? null
  useEffect(() => {
    if (typeof window === "undefined") return
    try {
      setPendingLogin(!!window.localStorage.getItem(PENDING_LOGIN_KEY))
    } catch {
      /* private browsing — best-effort */
    }
  }, [hydrated, userId])

  useEffect(() => {
    if (!hydrated) return
    if (currentUser) return
    if (pendingLogin) return // login in progress — give the handler a tick
    const next = encodeURIComponent(pathname)
    router.replace(`/login?next=${next}`)
  }, [hydrated, currentUser, pendingLogin, pathname, router])

  // Don't paint the dashboard chrome until we know who's logged in.
  // Hydration usually settles in one or two ticks; the login
  // breadcrumb adds at most one more tick on top of that.
  if (!hydrated || (pendingLogin && !currentUser)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground" />
      </div>
    )
  }

  // No user post-hydration AND no login in flight — the redirect
  // above is firing; render nothing in the meantime so the
  // dashboard doesn't flash for a frame.
  if (!currentUser) return null

  return <>{children}</>
}
