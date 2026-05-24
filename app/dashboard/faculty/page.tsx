"use client"

// Faculty management — list view.
//
// Distinct from /dashboard/users (legacy "manage team" page that
// pairs admins + instructors in a flat table) and from
// /dashboard/portal/faculty (the marketing showcase that controls
// who appears on /p/[tenant]/instructors). This page is the one place
// to see every teacher with a login, invite new ones, and edit any
// of their profile or status. The shape mirrors /dashboard/students
// (card grid + search + add CTA) so the IA reads like "Students for
// the learners side, Faculty for the teaching side."

import { useMemo, useState } from "react"
import Link from "next/link"
import {
  UserPlus,
  Mail,
  Phone,
  Shield,
  Sparkles,
  Users as UsersIcon,
  CheckCircle2,
  Clock,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { SearchInput } from "@/components/ui/search-input"
import { fuzzySearch } from "@/lib/fuzzy-search"
import { cn } from "@/lib/utils"
import { useLMS } from "@/lib/lms-store"
import { lookupFaculty } from "@/lib/faculty-registry"
import { usePlan } from "@/lib/use-plan"
import { PlanLimitHint, PlanLimitWarning } from "@/components/dashboard/plan-lock"

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

export default function FacultyListPage() {
  const { users } = useLMS()
  const [search, setSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState<"all" | "admin" | "instructor">("all")
  const { usageRemaining, limits } = usePlan()

  const faculty = useMemo(
    () => users.filter((u) => u.role === "admin" || u.role === "instructor"),
    [users],
  )

  // Plan-cap state. teachers limit on Starter = 1 (the owner). When the
  // workspace is at cap the "Add faculty" button flips to an Upgrade CTA.
  const seatsRemaining = usageRemaining("teachers", faculty.length)
  const atTeacherCap = seatsRemaining !== Infinity && seatsRemaining <= 0
  const teacherCap = limits.teachers

  const filtered = useMemo(() => {
    const base = faculty.filter((u) => roleFilter === "all" || u.role === roleFilter)
    return fuzzySearch(base, search, (u) => [u.name, u.email, u.phone ?? ""])
  }, [faculty, search, roleFilter])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold tracking-tight">Instructors</h1>
          <p className="text-muted-foreground">
            Invite teachers and admins. New members will get an email to set their password.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Pre-warning chip — always visible when the plan caps
              instructor seats. The Add button below flips to an
              Upgrade link at the cap; this is the always-on "you
              have N seats left" version. */}
          <PlanLimitHint
            metric="teachers"
            current={faculty.length}
            noun="Seat"
          />
          {atTeacherCap ? (
            <Button asChild variant="outline" title={`You're at the ${teacherCap}-seat cap on your current plan. Upgrade to add another.`}>
              <Link href="/dashboard/billing">
                <UserPlus className="mr-2 h-4 w-4" />
                Upgrade to add a seat
              </Link>
            </Button>
          ) : (
            <Button asChild>
              <Link href="/dashboard/faculty/new">
                <UserPlus className="mr-2 h-4 w-4" />
                Add faculty
              </Link>
            </Button>
          )}
        </div>
      </div>

      <PlanLimitWarning metric="teachers" current={faculty.length} />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <SearchInput
          pageId="faculty"
          value={search}
          onChange={setSearch}
          placeholder="Search by name, email, or phone…"
          ariaLabel="Search instructors"
          shortcutDescription="Focus instructor search"
          className="max-w-sm flex-1"
        />
        <div className="flex items-center gap-1 rounded-md border border-border p-0.5">
          {(["all", "instructor", "admin"] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRoleFilter(r)}
              className={cn(
                "rounded px-3 py-1 text-xs font-medium capitalize transition",
                roleFilter === r
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {r === "all" ? "All" : r === "admin" ? "Admins" : "Instructors"}
            </button>
          ))}
        </div>
        <span className="text-xs text-muted-foreground">
          {filtered.length} {filtered.length === 1 ? "person" : "people"}
        </span>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center py-16 text-center">
            <UsersIcon className="h-10 w-10 text-muted-foreground/60" />
            <h2 className="mt-3 font-semibold">
              {faculty.length === 0 ? "You're flying solo" : "No matches"}
            </h2>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              {faculty.length === 0
                ? "Invite instructors so they can build courses, run classes, and grade work alongside you."
                : "Try clearing the search or switching the role filter."}
            </p>
            {faculty.length === 0 && (
              <Button asChild className="mt-4">
                <Link href="/dashboard/faculty/new">
                  <UserPlus className="mr-2 h-4 w-4" />
                  Add your first faculty member
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((u) => {
            const reg = lookupFaculty(u.email)
            const multiTenant = (reg?.tenantSlugs.length ?? 0) > 1
            const disabled = !!u.disabledAt
            const pendingInvite = !!u.invitedAt && !u.lastLoginAt
            return (
              <Link
                key={u.id}
                href={`/dashboard/faculty/${u.id}/edit`}
                className="group block"
              >
                <Card className="h-full overflow-hidden transition-all group-hover:-translate-y-0.5 group-hover:shadow-md">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-3">
                      {u.avatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={u.avatar}
                          alt={u.name}
                          className="h-12 w-12 shrink-0 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-base font-semibold text-primary">
                          {initials(u.name)}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <p className="truncate font-semibold">{u.name}</p>
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                              u.role === "admin"
                                ? "bg-primary/10 text-primary"
                                : "bg-muted text-muted-foreground",
                            )}
                          >
                            {u.role === "admin" ? (
                              <Shield className="mr-0.5 inline h-2.5 w-2.5" />
                            ) : null}
                            {u.role}
                          </span>
                          {multiTenant && (
                            <span
                              className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent"
                              title={`Also teaches at: ${reg?.tenantSlugs.filter((s) => true).join(", ")}`}
                            >
                              <Sparkles className="mr-0.5 inline h-2.5 w-2.5" />
                              Multi-tenant
                            </span>
                          )}
                          {disabled && (
                            <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-destructive">
                              Disabled
                            </span>
                          )}
                        </div>
                        <p className="mt-1 truncate text-xs text-muted-foreground">
                          <Mail className="mr-1 inline h-3 w-3" />
                          {u.email}
                        </p>
                        {u.phone && (
                          <p className="mt-0.5 truncate text-xs text-muted-foreground">
                            <Phone className="mr-1 inline h-3 w-3" />
                            {u.phone}
                          </p>
                        )}
                      </div>
                    </div>

                    {u.bio && (
                      <p className="mt-3 line-clamp-2 text-sm text-foreground/80">
                        {u.bio}
                      </p>
                    )}

                    <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3 text-[11px] text-muted-foreground">
                      {pendingInvite ? (
                        <span className="inline-flex items-center gap-1 text-accent">
                          <Clock className="h-3 w-3" />
                          Invite sent — pending login
                        </span>
                      ) : u.lastLoginAt ? (
                        <span className="inline-flex items-center gap-1 text-success">
                          <CheckCircle2 className="h-3 w-3" />
                          Active · last seen {new Date(u.lastLoginAt).toLocaleDateString()}
                        </span>
                      ) : (
                        <span>Added {new Date(u.createdAt).toLocaleDateString()}</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
