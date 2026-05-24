"use client"

// Public faculty grid. Falls back to "no faculty curated yet — here are
// our instructors" pulled from lms-store so the page is never empty.

import { use, useMemo, useState } from "react"
import Link from "next/link"
import { Search, Users as UsersIcon } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { usePortal } from "@/lib/portal-store"
import { useLMS } from "@/lib/lms-store"
import { fuzzySearch } from "@/lib/fuzzy-search"
import { cn } from "@/lib/utils"
import { gradientFor } from "@/lib/handle-gradient"

export default function TeachersPage({
  params,
}: {
  params: Promise<{ tenant: string }>
}) {
  const { tenant } = use(params)
  const { faculty } = usePortal()
  const { users, courses } = useLMS()
  const [search, setSearch] = useState("")

  // Sum the enrolment of every published course this instructor
  // teaches. Used to surface the active teachers first — the
  // alphabetical default rewarded teachers whose surname started
  // with A; this surfaces the *real* face of the school instead.
  // Memoised keyed on courses so re-renders don't redo the sum.
  const enrolledByInstructorId = useMemo(() => {
    const map = new Map<string, number>()
    for (const c of courses) {
      if (c.status !== "published") continue
      const id = c.instructor?.id
      if (!id) continue
      map.set(id, (map.get(id) ?? 0) + (c.enrolledCount ?? 0))
    }
    return map
  }, [courses])
  const enrolledByName = useMemo(() => {
    const map = new Map<string, number>()
    for (const c of courses) {
      if (c.status !== "published") continue
      const name = c.instructor?.name
      if (!name) continue
      map.set(name, (map.get(name) ?? 0) + (c.enrolledCount ?? 0))
    }
    return map
  }, [courses])

  // Members curated by the admin win. If the admin hasn't curated anyone
  // yet, surface every instructor/admin in the workspace so the page
  // isn't empty on day one.
  //
  // Sort order:
  //   1. Curated `order` field (admin-pinned). Stable: same order
  //      across reloads.
  //   2. Within ties (and the un-curated fallback list), sort by
  //      total enrolment across the teacher's published courses.
  //      Active teachers surface first — alphabetical sort
  //      rewarded teachers whose surname started with A, this
  //      rewards teachers whose courses students actually take.
  //   3. Final tiebreak by name (deterministic).
  const members = useMemo(() => {
    const enrolForMember = (linkedUserId: string | undefined, name: string) =>
      (linkedUserId ? enrolledByInstructorId.get(linkedUserId) : 0) ??
      enrolledByName.get(name) ?? 0
    if (faculty.length > 0) {
      return faculty
        .slice()
        .sort((a, b) => {
          const oa = a.order ?? 99, ob = b.order ?? 99
          if (oa !== ob) return oa - ob
          const ea = enrolForMember(a.userId, a.name)
          const eb = enrolForMember(b.userId, b.name)
          if (ea !== eb) return eb - ea
          return a.name.localeCompare(b.name)
        })
        .map((m) => ({
          handle: m.handle,
          name: m.name,
          role: m.role,
          bio: m.bio,
          photo: m.photo,
          cover: m.coverImageUrl,
          expertise: m.expertise ?? [],
        }))
    }
    return users
      .filter((u) => u.role === "instructor" || u.role === "admin")
      .sort((a, b) => {
        const ea = enrolForMember(a.id, a.name)
        const eb = enrolForMember(b.id, b.name)
        if (ea !== eb) return eb - ea
        return a.name.localeCompare(b.name)
      })
      .map((u) => ({
        handle: u.email.split("@")[0],
        name: u.name,
        role: undefined,
        bio: u.bio,
        photo: u.avatar,
        cover: u.coverImageUrl,
        expertise: [] as string[],
      }))
  }, [faculty, users, enrolledByInstructorId, enrolledByName])

  const filtered = useMemo(
    () => fuzzySearch(members, search, (m) => [m.name, m.role ?? "", (m.expertise ?? []).join(" ")]),
    [members, search],
  )

  const basePath = `/p/${tenant}`

  return (
    <div className="mx-auto max-w-6xl px-6 py-12 lg:px-8">
      <header className="mx-auto max-w-2xl text-center">
        <h1 className="font-serif text-4xl font-bold tracking-tight sm:text-5xl">
          Meet Your instructors
        </h1>
        <p className="mt-3 text-lg text-muted-foreground">
          The people behind every course. Find a teacher whose work matches what you want to learn.
        </p>
      </header>

      <div className="mx-auto mt-8 max-w-xl">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Find by name, role, or expertise — typos OK"
            className="h-12 rounded-full pl-12 text-base"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card className="mt-10">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <UsersIcon className="h-10 w-10 text-muted-foreground" />
            <h2 className="mt-4 text-lg font-semibold">No teachers match</h2>
            <p className="mt-1 text-sm text-muted-foreground">Try a different search term.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((m) => (
            <Link
              key={m.handle}
              href={`${basePath}/instructors/${m.handle}`}
              className="group block"
            >
              <Card className="overflow-hidden py-0 transition-shadow group-hover:shadow-lg">
                {/* Cover band. When no cover image is set, fall back
                    to a deterministic per-handle gradient (not the
                    workspace primary→accent which made every
                    coverless card look identical). Real images
                    fade in via opacity transition + onLoad so the
                    swap from gradient → photo doesn't pop. */}
                <div
                  className="relative h-24 w-full"
                  style={m.cover ? undefined : { background: gradientFor(m.handle) }}
                >
                  {m.cover && (
                    <img
                      src={m.cover}
                      alt=""
                      loading="lazy"
                      onLoad={(e) => e.currentTarget.classList.remove("opacity-0")}
                      className="h-full w-full object-cover opacity-0 transition-opacity duration-300"
                    />
                  )}
                </div>
                <CardContent className="-mt-8 p-5">
                  <div className="flex items-end gap-3">
                    {m.photo ? (
                      <img
                        src={m.photo}
                        alt={m.name}
                        className="h-16 w-16 shrink-0 rounded-full object-cover ring-4 ring-card"
                      />
                    ) : (
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary text-lg font-semibold text-primary-foreground ring-4 ring-card">
                        {m.name.split(" ").map((p) => p[0]).join("").slice(0, 2)}
                      </div>
                    )}
                    <div className="min-w-0 pb-1">
                      <p className="truncate font-semibold group-hover:text-primary">{m.name}</p>
                      {m.role && (
                        <p className="truncate text-xs text-muted-foreground">{m.role}</p>
                      )}
                    </div>
                  </div>
                  {m.bio && (
                    <p className="mt-3 line-clamp-3 text-sm text-muted-foreground">{m.bio}</p>
                  )}
                  {m.expertise && m.expertise.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {m.expertise.slice(0, 4).map((t) => (
                        <span
                          key={t}
                          className={cn(
                            "rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary",
                          )}
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
