"use client"

// Single source of truth for "where does this user belong after auth?"
//
// Called from every post-auth landing site: /login, /p/[tenant]/login,
// /reset-password/[token], /accept-invite/[token], and their tenant-scoped
// counterparts. Centralising the decision means we never have eight
// nearly-identical role+tenant branches drifting apart over time.
//
// Rules (in priority order):
//
//   1. Student WITH tenant slug → `/p/<slug>/my`
//      Lands them inside their workspace's branded chrome.
//
//   2. Student WITHOUT slug → `/login` (fallback)
//      Pathological — a student account with no tenant context. Should
//      never happen in practice because the LMS store is tenant-scoped
//      and students arrive via invite or purchase that always carries
//      a tenant.
//
//   3. Teacher / admin → `/dashboard`
//      Tenant context doesn't matter for them — the teacher dashboard is
//      already organisation-scoped via Subscription and useLMS.
//
// The helper is intentionally pure: takes a role + slug, returns a
// path. Callers do `router.push(postAuthDestination(...))` themselves.

import type { User } from "./lms-store"

export interface PostAuthInput {
  /** The just-authenticated user. Null when no user resolved (rare). */
  user: Pick<User, "role"> | null
  /** Tenant slug from URL or cookie. Empty string if unknown. */
  tenantSlug: string
}

export function postAuthDestination({ user, tenantSlug }: PostAuthInput): string {
  if (!user) return "/login"
  if (user.role === "student") {
    if (tenantSlug) return `/p/${tenantSlug}/my`
    // Edge case: a student with no tenant scope. Drop them at the
    // platform login — they almost certainly bookmarked a stale link
    // or their session lost the tenant cookie. Re-signing in via the
    // branded login they came from will fix it.
    return "/login"
  }
  // Admin or instructor — teacher dashboard.
  return "/dashboard"
}
