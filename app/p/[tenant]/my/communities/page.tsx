"use client"

// Student communities directory. Lists every community the student
// can browse:
//   • visibility "open" — anyone in the workspace can preview + join
//   • visibility "invite-link" / "tag-gated" — preview if eligible
//   • visibility "closed" — only shown when the student is already a
//     member (owner-added manually)
//
// "Joinable" communities show a Join CTA on the card. Already-member
// communities show an Open CTA. Either way, click → detail page
// where reads are public-ish (everyone in the workspace can read the
// feed) but writes (post, comment, react) require membership.

import { useMemo } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { Lock, Search, Users2 } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useLMS, type StudentGroup, type User } from "@/lib/lms-store"
import { useUrlState } from "@/lib/use-url-state"
import { fuzzySearch } from "@/lib/fuzzy-search"

function tenantSlug(params: { tenant?: string | string[] }): string {
  const t = params.tenant
  return Array.isArray(t) ? t[0] ?? "" : t ?? ""
}

interface CommunityRow {
  group: StudentGroup
  isMember: boolean
  canJoin: boolean
  creator?: User
}

export default function MyCommunitiesPage() {
  const params = useParams<{ tenant: string }>()
  const slug = tenantSlug(params)
  const { currentUser, studentGroups, enrollments, getCourseById, getUserById } = useLMS()
  const [search, setSearch] = useUrlState<string>("q", { defaultValue: "" })

  // Derived tag bag for the current student: union of every tag on
  // every course they're enrolled in. Used to gate tag-gated
  // communities — a student qualifies if their enrolled courses share
  // at least one tag with the community's requiredTags list. There's
  // no first-class `User.tags` yet; this is the most faithful proxy.
  const myTagSet = useMemo(() => {
    if (!currentUser) return new Set<string>()
    const tags = new Set<string>()
    enrollments
      .filter((e) => e.studentId === currentUser.id)
      .forEach((e) => {
        const c = getCourseById(e.courseId)
        c?.tags?.forEach((t) => tags.add(t.toLowerCase()))
      })
    return tags
  }, [currentUser, enrollments, getCourseById])

  const rows: CommunityRow[] = useMemo(() => {
    if (!currentUser) return []
    const out: CommunityRow[] = []
    for (const g of studentGroups) {
      const isMember = g.memberIds.includes(currentUser.id)
      // "Browse-able" without joining:
      //   • open communities — listed publicly, anyone can join
      //   • tag-gated where the student's enrolled-course tags
      //     overlap the community's requiredTags (case-insensitive)
      //   • invite-link / closed — only if already a member; the
      //     join URL is the discovery path for the rest
      const v = g.visibility ?? "closed"
      const required = (g.requiredTags ?? []).map((t) => t.toLowerCase())
      const tagMatch =
        v === "tag-gated" && required.some((t) => myTagSet.has(t))
      const visible = v === "open" || tagMatch || isMember
      const teachersOnly = g.teachersOnly ?? false
      if (teachersOnly && currentUser.role === "student") continue
      if (!visible) continue
      const row: CommunityRow = {
        group: g,
        isMember,
        canJoin: !isMember && (v === "open" || tagMatch),
      }
      const creator = g.createdBy ? getUserById(g.createdBy) : undefined
      if (creator) row.creator = creator
      out.push(row)
    }
    return out.sort((a, b) => a.group.name.localeCompare(b.group.name))
  }, [currentUser, studentGroups, myTagSet, getUserById])

  const visible = useMemo(
    () => fuzzySearch(rows, search, (r) => `${r.group.name} ${r.group.purpose ?? ""}`),
    [rows, search],
  )

  const counts = {
    total: rows.length,
    joined: rows.filter((r) => r.isMember).length,
  }

  if (!currentUser) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          Sign in to browse communities.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-bold tracking-tight">Communities</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {counts.total === 0
            ? "No communities to browse yet."
            : `${counts.total} community${counts.total === 1 ? "" : "s"} · ${counts.joined} joined`}
        </p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search communities…"
          className="pl-9"
        />
      </div>

      {visible.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users2 className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-3 font-medium">
              {rows.length === 0 ? "Nothing here yet" : "No matches"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {rows.length === 0
                ? "When your teachers open up a cohort or interest group, it'll appear here."
                : "Try clearing the search."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map(({ group, isMember, canJoin, creator }) => {
            // The author-chosen color (hex/oklch) gets surfaced two
            // ways: a top accent strip so the card feels branded, and
            // a soft tint on the icon chip. Falls back to the brand
            // primary when the creator never picked one.
            const accent = group.color || "var(--primary)"
            const blurb = group.description || group.purpose
            return (
              <Card
                key={group.id}
                className="flex flex-col overflow-hidden transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
              >
                <div
                  className="h-1.5 w-full"
                  style={{ backgroundColor: accent }}
                  aria-hidden
                />
                <CardContent className="flex flex-1 flex-col gap-3 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-start gap-2">
                      <div
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md"
                        style={{ backgroundColor: `${accent}22`, color: accent }}
                        aria-hidden
                      >
                        <Users2 className="h-4 w-4" />
                      </div>
                      <p className="line-clamp-2 font-serif text-base font-semibold leading-snug">
                        {group.name}
                      </p>
                    </div>
                    {isMember ? (
                      <Badge variant="default" className="shrink-0">
                        Member
                      </Badge>
                    ) : !canJoin ? (
                      <Badge variant="secondary" className="shrink-0">
                        <Lock className="mr-1 h-3 w-3" />
                        Invite only
                      </Badge>
                    ) : null}
                  </div>
                  {blurb && (
                    <p className="line-clamp-3 text-xs text-muted-foreground">
                      {blurb}
                    </p>
                  )}
                  {creator && (
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                      <Avatar className="h-5 w-5">
                        {creator.avatar ? (
                          <AvatarImage src={creator.avatar} alt={creator.name} />
                        ) : null}
                        <AvatarFallback className="text-[9px]">
                          {creator.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span>Created by {creator.name}</span>
                    </div>
                  )}
                  <div className="mt-auto flex items-center justify-between gap-2">
                    <span className="text-[11px] text-muted-foreground">
                      {group.memberIds.length} member
                      {group.memberIds.length === 1 ? "" : "s"}
                    </span>
                    <Button size="sm" variant={isMember ? "outline" : "default"} asChild>
                      <Link href={`/p/${slug}/my/communities/${group.id}`}>
                        {isMember ? "Open" : canJoin ? "Preview & join" : "Preview"}
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
