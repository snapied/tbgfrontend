"use client"

// Blog index. Lists every published post, newest first.

import { use, useMemo } from "react"
import Link from "next/link"
import { BookOpen, ArrowRight } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { usePortal } from "@/lib/portal-store"
import { useLMS } from "@/lib/lms-store"
import { DynamicMeta } from "@/components/seo/dynamic-meta"
import { useTenantBrand } from "@/lib/tenant-brand"

export default function BlogIndexPage({
  params,
}: {
  params: Promise<{ tenant: string }>
}) {
  const { tenant } = use(params)
  const { posts } = usePortal()
  const { getUserById } = useLMS()
  const brand = useTenantBrand()

  const published = useMemo(
    () =>
      posts
        .filter((p) => p.status === "published")
        .sort(
          (a, b) =>
            (b.publishedAt ?? b.createdAt).localeCompare(
              a.publishedAt ?? a.createdAt,
            ),
        ),
    [posts],
  )

  const basePath = `/p/${tenant}`

  return (
    <div className="mx-auto max-w-5xl px-6 py-12 lg:px-8">
      <DynamicMeta
        title="Blog"
        titleTemplate={`%s · ${brand.name}`}
        description={`Tutorials, behind-the-scenes notes, and announcements from ${brand.name}.`}
        image={brand.logoUrl}
        siteName={brand.name}
        type="website"
      />
      <header className="mx-auto max-w-2xl text-center">
        <h1 className="font-serif text-4xl font-bold tracking-tight sm:text-5xl">Blog</h1>
        <p className="mt-3 text-lg text-muted-foreground">
          Tutorials, behind-the-scenes notes, and announcements.
        </p>
      </header>

      {published.length === 0 ? (
        <Card className="mt-10">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <BookOpen className="h-10 w-10 text-muted-foreground" />
            <h2 className="mt-4 text-lg font-semibold">No posts yet</h2>
            <p className="mt-1 text-sm text-muted-foreground">Check back soon.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          {published.map((p) => {
            const author = getUserById(p.authorId)
            return (
              <Link key={p.id} href={`${basePath}/blog/${p.slug}`} className="group block">
                <Card className="overflow-hidden py-0 transition-shadow group-hover:shadow-lg">
                  {p.coverImage && (
                    <div className="aspect-video overflow-hidden bg-muted">
                      <img
                        src={p.coverImage}
                        alt=""
                        className="h-full w-full object-cover transition-transform group-hover:scale-[1.03]"
                      />
                    </div>
                  )}
                  <CardContent className="p-5">
                    {p.tags && p.tags.length > 0 && (
                      <div className="mb-2 flex flex-wrap gap-1.5">
                        {p.tags.slice(0, 3).map((t) => (
                          <span key={t} className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                    <h3 className="line-clamp-2 font-serif text-xl font-bold tracking-tight group-hover:text-primary">
                      {p.title}
                    </h3>
                    {p.excerpt && (
                      <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{p.excerpt}</p>
                    )}
                    <p className="mt-3 text-xs text-muted-foreground">
                      {author?.name ?? "Author"} ·{" "}
                      {new Date(p.publishedAt ?? p.createdAt).toLocaleDateString()}
                    </p>
                    <p className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary">
                      Read post <ArrowRight className="h-3.5 w-3.5" />
                    </p>
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
