"use client"

// Left sidebar for /dashboard/docs and /dashboard/docs/[id].
//
// Sections (in order):
//   • Inline search — filters by title across every doc the
//     viewer can see; results render flat under the search.
//   • Yours — owned docs (excluding deleted)
//   • Shared with you — visible docs you don't own
//   • Public knowledge hub link (tenant-scoped: /p/<tenant>/k)
//
// Active doc gets a thicker primary tint so the writer always knows
// where they are. Hover reveals a thin chevron, no jumpy widths.

import Link from "next/link"
import { useMemo, useState } from "react"
import { ChevronRight, FolderOpen, Plus, Search, X } from "lucide-react"
import { useLMS } from "@/lib/lms-store"
import { useDocs, viewerCanSeeDoc, type Doc } from "@/lib/docs"
import { useTenant } from "@/lib/tenant-store"

interface Props {
  activeDocId?: string
  onNewDoc?: () => void
}

export function DocSidebar({ activeDocId, onNewDoc }: Props) {
  const { docs } = useDocs()
  const { currentUser, enrollments, studentGroups } = useLMS()
  const { currentTenant } = useTenant()
  const [query, setQuery] = useState("")

  const viewer = useMemo(
    () =>
      currentUser
        ? {
            userId: currentUser.id,
            role: currentUser.role,
            enrolledCourseIds: new Set(
              enrollments.filter((e) => e.studentId === currentUser.id).map((e) => e.courseId),
            ),
            memberCommunityIds: new Set(
              studentGroups.filter((g) => g.memberIds?.includes(currentUser.id)).map((g) => g.id),
            ),
          }
        : null,
    [currentUser, enrollments, studentGroups],
  )

  const visible = useMemo(
    () => docs.filter((d) => viewerCanSeeDoc(d, viewer)).filter((d) => !d.deletedAt),
    [docs, viewer],
  )

  // Most-recently-updated first.
  const sorted = useMemo(
    () => [...visible].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [visible],
  )

  // Search hit-set when the user is typing.
  const searched = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return null
    return sorted.filter((d) => (d.title || "").toLowerCase().includes(q))
  }, [sorted, query])

  const mine = useMemo(
    () => sorted.filter((d) => currentUser && d.ownerId === currentUser.id),
    [sorted, currentUser],
  )
  const shared = useMemo(
    () => sorted.filter((d) => !currentUser || d.ownerId !== currentUser.id),
    [sorted, currentUser],
  )

  return (
    <aside className="flex h-full w-64 flex-col border-r border-border bg-card">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 border-b border-border p-3">
        <div className="flex items-center gap-1.5">
          <span className="text-base">📚</span>
          <p className="text-sm font-bold">Docs</p>
        </div>
        {onNewDoc && (
          <button
            type="button"
            onClick={onNewDoc}
            className="inline-flex items-center gap-1 rounded-md bg-primary px-2 py-1 text-[11px] font-bold text-primary-foreground transition-opacity hover:opacity-90"
          >
            <Plus className="h-3 w-3" />
            New
          </button>
        )}
      </div>

      {/* Inline search */}
      <div className="border-b border-border p-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter docs…"
            className="w-full rounded-md border border-border bg-background px-7 py-1.5 text-[12px] outline-none focus:border-primary"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Clear filter"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-2">
        {searched != null ? (
          <Group title={`Search · ${searched.length}`} count={searched.length}>
            {searched.length === 0 ? (
              <p className="px-2 py-1 text-[11px] text-muted-foreground">
                Nothing matches.
              </p>
            ) : (
              <ul className="space-y-0.5">
                {searched.map((d) => (
                  <DocRow key={d.id} doc={d} active={d.id === activeDocId} />
                ))}
              </ul>
            )}
          </Group>
        ) : (
          <>
            <Group title="Yours" count={mine.length}>
              {mine.length === 0 ? (
                <p className="px-2 py-1 text-[11px] text-muted-foreground">
                  No docs yet. Click <span className="font-semibold">New</span> above.
                </p>
              ) : (
                <ul className="space-y-0.5">
                  {mine.map((d) => (
                    <DocRow key={d.id} doc={d} active={d.id === activeDocId} />
                  ))}
                </ul>
              )}
            </Group>

            {shared.length > 0 && (
              <Group title="Shared with you" count={shared.length}>
                <ul className="space-y-0.5">
                  {shared.map((d) => (
                    <DocRow key={d.id} doc={d} active={d.id === activeDocId} />
                  ))}
                </ul>
              </Group>
            )}
          </>
        )}

        {/* Public hub link — tenant-scoped. The platform-global /k
            route was retired; public docs live on each creator's own
            portal at /p/<tenant>/k. Hidden until we know which tenant
            we're in so we don't link to a broken URL. */}
        {currentTenant?.slug && (
          <div className="mt-4 border-t border-border pt-3">
            <Link
              href={`/p/${encodeURIComponent(currentTenant.slug)}/k`}
              className="flex items-center gap-2 rounded-md px-2 py-1.5 text-[12px] font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Search className="h-3 w-3" />
              Public knowledge hub
            </Link>
          </div>
        )}
      </div>
    </aside>
  )
}

function Group({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <div className="mb-1 flex items-center gap-1.5 px-2">
        <FolderOpen className="h-3 w-3 text-muted-foreground" />
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          {title}
        </span>
        <span className="ml-auto rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-bold text-muted-foreground">
          {count}
        </span>
      </div>
      {children}
    </div>
  )
}

function DocRow({ doc, active }: { doc: Doc; active: boolean }) {
  return (
    <li>
      <Link
        href={`/dashboard/docs/${doc.id}`}
        className={`group flex items-center gap-2 rounded-md px-2 py-1.5 text-[12.5px] transition-colors ${
          active ? "bg-primary/[0.08] font-semibold text-primary" : "hover:bg-muted text-foreground/85"
        }`}
        title={doc.title || "Untitled"}
      >
        <span aria-hidden className="text-sm">{doc.icon ?? "📝"}</span>
        <span className="min-w-0 flex-1 truncate">{doc.title || "Untitled"}</span>
        {doc.status === "draft" && (
          <span className="rounded-full bg-muted px-1 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
            Draft
          </span>
        )}
        {doc.audience.kind === "public" && doc.status === "published" && (
          <span className="rounded-full bg-success/15 px-1 text-[9px] font-bold uppercase tracking-wider text-success">
            Public
          </span>
        )}
        <ChevronRight className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-50" />
      </Link>
    </li>
  )
}
