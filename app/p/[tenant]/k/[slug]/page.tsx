"use client"

// /p/<tenant>/k/<slug> — tenant-scoped public reader for a doc with
// audience=public + status=published. Mirrors /k/<slug> but renders
// inside the tenant portal layout so brand, header, footer, theme
// stay consistent with the rest of the creator's site.

import { use, useEffect, useMemo } from "react"
import Link from "next/link"
import { ArrowLeft, Calendar, ChevronLeft, Globe2 } from "lucide-react"
import { BackButton } from "@/components/ui/back-button"
import { DynamicMeta } from "@/components/seo/dynamic-meta"
import { useTenantBrand } from "@/lib/tenant-brand"
import { useLMS } from "@/lib/lms-store"
import { legacyBlocksToBlocknoteContent, useDocs, viewerCanSeeDoc } from "@/lib/docs"
import { DocBlock } from "@/components/docs/doc-block"
import { BlocknoteDocEditor } from "@/components/docs/blocknote-editor"

export default function TenantPublicDocPage({
  params,
}: {
  params: Promise<{ tenant: string; slug: string }>
}) {
  const { tenant, slug } = use(params)
  const { getDocBySlug } = useDocs()
  const { currentUser, enrollments, studentGroups, getUserById } = useLMS()
  const brand = useTenantBrand()
  const doc = getDocBySlug(slug)

  // Tab title falls back to the doc title if no SEO override.
  useEffect(() => {
    if (!doc) return
    const t = doc.seo?.title ?? doc.title
    if (typeof document !== "undefined") {
      document.title = `${t} · ${brand.name}`
    }
  }, [doc, brand.name])

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

  const hubHref = `/p/${encodeURIComponent(tenant)}/k`

  if (!doc || !viewerCanSeeDoc(doc, viewer)) {
    return (
      <main className="mx-auto flex min-h-[60vh] max-w-3xl flex-col items-center justify-center px-6 py-16 text-center">
        <Globe2 className="h-10 w-10 text-muted-foreground/30" />
        <h1 className="mt-4 font-serif text-2xl font-bold">Page not found</h1>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          This page is either private, deleted, or has never been published.
        </p>
        <BackButton label="Back" fallbackHref={hubHref} className="mt-4" />
      </main>
    )
  }

  const owner = getUserById(doc.ownerId)

  return (
    <main className="flex-1">
      <DynamicMeta
        title={doc.seo?.title ?? doc.title}
        titleTemplate={`%s · ${brand.name}`}
        description={doc.seo?.description}
      />
      <article className="mx-auto max-w-3xl px-6 py-10 lg:px-8 lg:py-14">
        <Link
          href={hubHref}
          className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft className="h-3 w-3" />
          Knowledge hub
        </Link>

        <header className="mb-8 mt-4">
          <div className="text-3xl">{doc.icon ?? "📝"}</div>
          <h1 className="mt-2 font-serif text-4xl font-black tracking-tight sm:text-5xl">
            {doc.title}
          </h1>
          {doc.seo?.description && (
            <p className="mt-3 text-lg leading-relaxed text-muted-foreground">
              {doc.seo.description}
            </p>
          )}
          <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            {owner && (
              <span className="inline-flex items-center gap-1.5">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[9px] font-bold text-primary">
                  {owner.name
                    .split(/\s+/)
                    .map((w) => w[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()}
                </span>
                {owner.name}
              </span>
            )}
            <span aria-hidden>·</span>
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Updated{" "}
              {new Date(doc.updatedAt).toLocaleDateString(undefined, {
                dateStyle: "medium",
              })}
            </span>
          </div>
        </header>

        <div className="space-y-4 [&_h2]:mt-8 [&_h3]:mt-6">
          <PublicDocBody doc={doc} />
        </div>
      </article>
    </main>
  )
}

// Shared body renderer — same three-path resolution the platform-
// global /k/<slug> reader uses. Lifted here so the tenant route can
// stay self-contained.
function PublicDocBody({ doc }: { doc: ReturnType<ReturnType<typeof useDocs>["getDocBySlug"]> }) {
  if (!doc) return null
  if (Array.isArray(doc.content) && doc.content.length > 0) {
    return (
      <BlocknoteDocEditor
        docId={doc.id}
        initialContent={
          doc.content as Parameters<typeof BlocknoteDocEditor>[0]["initialContent"]
        }
        onChange={() => { /* read-only */ }}
        editable={false}
      />
    )
  }
  if (Array.isArray(doc.blocks) && doc.blocks.length > 0) {
    const converted = legacyBlocksToBlocknoteContent(doc.blocks)
    if (converted.length > 0) {
      return (
        <BlocknoteDocEditor
          docId={doc.id}
          initialContent={
            converted as Parameters<typeof BlocknoteDocEditor>[0]["initialContent"]
          }
          onChange={() => { /* read-only */ }}
          editable={false}
        />
      )
    }
    return (
      <>
        {doc.blocks.map((b) => (
          <DocBlock key={b.id} block={b} editable={false} />
        ))}
      </>
    )
  }
  return (
    <p className="rounded-lg border border-dashed border-border bg-muted/30 px-4 py-8 text-center text-sm text-muted-foreground">
      This page is being prepared. Check back soon.
    </p>
  )
}
