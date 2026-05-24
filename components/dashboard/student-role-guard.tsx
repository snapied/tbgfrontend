"use client"

// Mounted at the top of /dashboard/layout.tsx so that any signed-in
// student visiting a teacher route gets bounced into their own
// tenant-scoped student dashboard.
//
// Why a separate client component instead of putting the logic in
// the layout itself: the layout is a server component; the user
// state lives in the client-side LMS store. A useEffect inside a
// client child is the standard pattern for "redirect on hydrate
// when state matches X".
//
// Instructors + admins fall through to the dashboard as before.
// Anonymous visitors are *not* redirected — individual pages
// already handle the unauthenticated case (some pages render a
// public preview), and a blanket redirect here would break that.

import { useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useLMS } from "@/lib/lms-store"
import { useTenant } from "@/lib/tenant-store"

export function StudentRoleGuard() {
  const router = useRouter()
  const pathname = usePathname() ?? ""
  const { currentUser, hydrated } = useLMS()
  const { currentTenant } = useTenant()

  useEffect(() => {
    // Wait for hydration before deciding — the store starts empty
    // and reads localStorage in a useEffect, so a too-early check
    // would treat every refresh as "no user" and bounce the
    // currently-signed-in student through an extra redirect.
    if (!hydrated) return
    if (!currentUser) return
    if (currentUser.role !== "student") return
    const slug = currentTenant?.slug
    if (slug) {
      router.replace(`/p/${slug}/my`)
    } else {
      router.replace("/login")
    }
  }, [hydrated, currentUser, currentTenant, pathname, router])

  return null
}
