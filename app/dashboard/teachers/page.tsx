"use client"

// Teachers list page — shows all instructors (teachers) from the
// LMS store. No backend API call needed — reads from localStorage
// via useLMS().

import { useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Plus,
  Search,
  MoreHorizontal,
  Users as UsersIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useLMS } from "@/lib/lms-store"
import { getCommission } from "@/lib/teacher-commission-store"
import { cn } from "@/lib/utils"

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("") || "?"
}

export default function CoachesListPage() {
  const router = useRouter()
  const { users, currentUser } = useLMS()
  const [search, setSearch] = useState("")

  // All hooks must be above any early return (Rules of Hooks).
  const teachers = useMemo(() => {
    return users.filter((u) => u.role === "instructor")
  }, [users])

  const filtered = useMemo(() => {
    if (!search.trim()) return teachers
    const q = search.toLowerCase().trim()
    // Fuzzy: match if every character of the query appears in order
    const fuzzy = (hay: string, needle: string) => {
      let hi = 0
      for (let ni = 0; ni < needle.length; ni++) {
        const idx = hay.indexOf(needle[ni], hi)
        if (idx === -1) return false
        hi = idx + 1
      }
      return true
    }
    return teachers
      .map((t) => {
        const name = t.name.toLowerCase()
        const email = t.email.toLowerCase()
        const bio = (t.bio ?? "").toLowerCase()
        const exactName = name.includes(q)
        const exactEmail = email.includes(q)
        const exactBio = bio.includes(q)
        const fuzzyName = !exactName && fuzzy(name, q)
        const fuzzyEmail = !exactEmail && fuzzy(email, q)
        const match = exactName || exactEmail || exactBio || fuzzyName || fuzzyEmail
        const score = exactName ? 3 : exactEmail ? 2 : exactBio ? 2 : fuzzyName ? 1 : fuzzyEmail ? 1 : 0
        return { t, match, score }
      })
      .filter((r) => r.match)
      .sort((a, b) => b.score - a.score)
      .map((r) => r.t)
  }, [teachers, search])

  // Admin-only guard — teachers cannot manage other teachers.
  if (currentUser?.role === "instructor") {
    return (
      <Card className="mx-auto mt-16 max-w-md border-dashed">
        <CardContent className="py-12 text-center">
          <UsersIcon className="mx-auto h-10 w-10 text-muted-foreground/40" />
          <p className="mt-3 font-semibold">Admin access required</p>
          <p className="mt-1 text-sm text-muted-foreground">Only academy admins can manage teachers.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold tracking-tight">Teachers</h1>
          <p className="text-muted-foreground">
            Manage teachers, commissions, and payouts.
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/teachers/new">
            <Plus className="mr-2 h-4 w-4" />
            Add Teacher
          </Link>
        </Button>
      </div>

      {/* Search */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <span className="text-xs text-muted-foreground">
          {filtered.length} {filtered.length === 1 ? "teacher" : "teachers"}
        </span>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center py-16 text-center">
            <UsersIcon className="h-10 w-10 text-muted-foreground/60" />
            <h2 className="mt-3 font-semibold">
              {teachers.length === 0 ? "No teachers yet" : "No matches"}
            </h2>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              {teachers.length === 0
                ? "Add your first teacher to start building your teaching team."
                : "Try adjusting your search."}
            </p>
            {teachers.length === 0 && (
              <Button asChild className="mt-4">
                <Link href="/dashboard/teachers/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Add your first teacher
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((t) => (
            <Card key={t.id} className="group relative transition hover:shadow-md">
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  {t.avatar ? (
                    <img
                      src={t.avatar}
                      alt={t.name}
                      className="h-12 w-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                      {initials(t.name)}
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{t.name}</p>
                    <p className="truncate text-sm text-muted-foreground">{t.email}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {(() => {
                        const comm = getCommission(t.id)
                        return comm?.enabled ? (
                          <Badge className="text-[10px] bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 hover:bg-green-100">
                            Commissioned
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px]">
                            Non-commissioned
                          </Badge>
                        )
                      })()}
                    </div>
                  </div>

                  {/* Actions */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => router.push(`/dashboard/teachers/${t.id}`)}
                      >
                        View
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
