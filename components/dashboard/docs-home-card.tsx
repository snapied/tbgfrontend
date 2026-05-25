"use client"

// Dashboard widget — surfaces the Docs module on the home page.
//
// Two states:
//   • Empty (no docs yet) → an inviting CTA card pointing at /dashboard/docs,
//     with two starter templates as one-click shortcuts so the teacher
//     gets to their first doc in one click.
//   • Populated → the 3 most-recently-edited docs the viewer can see,
//     with a "View all" link and a "New doc" button.
//
// Stays self-hiding when the user has no read access (e.g., student
// role without any shared docs). The dashboard already shows enough
// noise — no point reserving a slot for an empty rail.

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useMemo } from "react"
import {
  ArrowUpRight,
  FileText,
  GraduationCap,
  Plus,
  Sparkles,
} from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useLMS } from "@/lib/lms-store"
import {
  legacyBlocksToBlocknoteContent,
  useDocs,
  viewerCanSeeDoc,
} from "@/lib/docs"
import { getTemplate } from "@/lib/doc-templates"

export function DocsHomeCard() {
  const router = useRouter()
  const { docs, createDoc } = useDocs()
  const { currentUser, enrollments, studentGroups } = useLMS()

  const viewer = useMemo(
    () =>
      currentUser
        ? {
            userId: currentUser.id,
            role: currentUser.role,
            enrolledCourseIds: new Set(
              enrollments
                .filter((e) => e.studentId === currentUser.id)
                .map((e) => e.courseId),
            ),
            memberCommunityIds: new Set(
              studentGroups
                .filter((g) => g.memberIds?.includes(currentUser.id))
                .map((g) => g.id),
            ),
          }
        : null,
    [currentUser, enrollments, studentGroups],
  )

  const visible = useMemo(
    () =>
      docs
        .filter((d) => !d.deletedAt && viewerCanSeeDoc(d, viewer))
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        .slice(0, 3),
    [docs, viewer],
  )

  // Author-only quick template shortcuts. Skip for students.
  const canAuthor =
    currentUser?.role === "admin" || currentUser?.role === "instructor"

  function spinUpTemplate(key: string) {
    if (!currentUser) return
    const t = getTemplate(key)
    if (!t) return
    const legacy = t.buildBlocks()
    const doc = createDoc({
      ownerId: currentUser.id,
      title: t.title === "Blank doc" ? "Untitled" : t.title,
      icon: t.emoji,
      blocks: legacy,
      content: legacyBlocksToBlocknoteContent(legacy),
      audience: t.defaultAudience,
      status: "draft",
    })
    router.push(`/dashboard/docs/${doc.id}`)
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            Docs
          </CardTitle>
          <CardDescription>
            Study guides, course handbooks, cohort wikis — your knowledge layer.
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/docs">
              View all
              <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          </Button>
          {canAuthor && (
            <Button size="sm" onClick={() => spinUpTemplate("blank")}>
              <Plus className="mr-1 h-3.5 w-3.5" />
              New doc
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {visible.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-muted/30 p-4 text-center">
            <p className="text-sm font-semibold">No docs yet</p>
            <p className="mx-auto mt-1 max-w-md text-xs text-muted-foreground">
              {canAuthor
                ? "Start with a template — your first doc takes 30 seconds."
                : "Docs your team shares with you will appear here."}
            </p>
            {canAuthor && (
              <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => spinUpTemplate("course-handbook")}
                  className="gap-1.5"
                >
                  <GraduationCap className="h-3.5 w-3.5" />
                  Course handbook
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => spinUpTemplate("class-recap")}
                  className="gap-1.5"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Class recap
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  asChild
                  className="text-muted-foreground"
                >
                  <Link href="/dashboard/docs">Browse all templates →</Link>
                </Button>
              </div>
            )}
          </div>
        ) : (
          <ul className="space-y-2">
            {visible.map((d) => (
              <li key={d.id}>
                <Link
                  href={`/dashboard/docs/${d.id}`}
                  className="flex items-start gap-3 rounded-lg border border-border p-3 transition-colors hover:border-primary/40"
                >
                  <span className="text-xl">{d.icon ?? "📝"}</span>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-1 text-sm font-semibold">
                      {d.title || "Untitled"}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {d.status === "draft" ? "Draft · " : ""}
                      Updated {new Date(d.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
