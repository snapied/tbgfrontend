"use client"

// Bounces an already-signed-in user away from the auth pages
// (/login, /signup, /forgot-password, /reset-password and their
// tenant-scoped counterparts). Sits inside each of those pages — if
// `currentUser` is hydrated and present, we replace to wherever
// `postAuthDestination` says they belong (teacher → /dashboard,
// student → /p/<tenant>/my). Anonymous users get the auth form like
// before. Mirror image of `DashboardAuthGate`, which bounces
// anonymous users INTO /login.
//
// Hydration: the LMS store reads localStorage in a useEffect, so on
// the first render `currentUser === null` for a signed-in user too.
// We wait for `hydrated` to flip before deciding, otherwise a real
// session would briefly see the login form.

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useLMS } from "@/lib/lms-store"
import { useTenant } from "@/lib/tenant-store"
import { postAuthDestination } from "@/lib/post-auth-redirect"

export function AuthRedirectGate({
  /** Slug to use for the student bounce target. Falls back to the
   *  active tenant in the store when not passed (e.g. global /login
   *  doesn't know which workspace the visitor belongs to). */
  tenantSlug,
}: {
  tenantSlug?: string
} = {}) {
  const { currentUser, hydrated } = useLMS()
  const { currentTenant } = useTenant()
  const router = useRouter()

  useEffect(() => {
    if (!hydrated || !currentUser) return
    const slug = tenantSlug ?? currentTenant?.slug ?? ""
    router.replace(postAuthDestination({ user: currentUser, tenantSlug: slug }))
  }, [hydrated, currentUser, currentTenant, tenantSlug, router])

  return null
}
