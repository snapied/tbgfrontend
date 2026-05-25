"use client"

// /p/<tenant>/k — tenant-scoped knowledge hub index.
//
// Renders inside the tenant's portal layout (so the brand, header,
// footer, theme all match the creator's site). Every doc with
// audience=public + status=published shows up here. The detail page
// at /p/<tenant>/k/<slug> mirrors the visual pattern.

import { use, useMemo } from "react"
import Link from "next/link"
import { Globe2, Sparkles } from "lucide-react"
import { DynamicMeta } from "@/components/seo/dynamic-meta"
import { useTenantBrand } from "@/lib/tenant-brand"
import { useDocs } from "@/lib/docs"
import { useLMS } from "@/lib/lms-store"

export default function TenantKnowledgeHubPage({
  params,
}: {
  params: Promise<{ tenant: string }>
}) {
  const { tenant } = use(params)
  const { docs } = useDocs()
  const { getUserById } = useLMS()
  const brand = useTenantBrand()

  const published = useMemo(
    () =>
      docs
        .filter(
          (d) =>
            d.audience.kind === "public" &&
            d.status === "published" &&
            !d.deletedAt &&
            d.publicSlug,
        )
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [docs],
  )

  return (
    <main className="flex-1">
      <DynamicMeta
        title="Knowledge hub"
        titleTemplate={`%s · ${brand.name}`}
        description={`Free, public explainers, playbooks, and reference docs from ${brand.name}.`}
      />

      <section className="border-b border-border bg-gradient-to-b from-secondary/40 to-background">
        <div className="mx-auto max-w-5xl px-6 py-12 lg:px-8 lg:py-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/[0.06] px-3 py-1 text-xs font-semibold text-primary">
            <Sparkles className="h-3 w-3" />
            Knowledge hub
          </div>
          <h1 className="mt-4 font-serif text-3xl font-bold tracking-tight sm:text-4xl">
            Things worth reading.
          </h1>
          <p className="mt-3 max-w-2xl text-base text-muted-foreground">
            Free, public explainers, playbooks, and reference docs from {brand.name}.
            Bookmark what helps.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-10 lg:px-8 lg:py-12">
        {published.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-muted/30 p-8 text-center">
            <Globe2 className="mx-auto h-8 w-8 text-muted-foreground/40" />
            <p className="mt-3 text-sm font-semibold">No public docs yet.</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Check back soon — the team publishes new content here as it lands.
            </p>
          </div>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {published.map((d) => {
              const owner = getUserById(d.ownerId)
              return (
                <li key={d.id}>
                  <Link
                    href={`/p/${encodeURIComponent(tenant)}/k/${d.publicSlug}`}
                    className="group flex h-full flex-col gap-2 rounded-xl border border-border bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
                  >
                    <span aria-hidden className="text-3xl">{d.icon ?? "📝"}</span>
                    <p className="font-serif text-lg font-bold leading-snug">
                      {d.title}
                    </p>
                    {d.seo?.description && (
                      <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                        {d.seo.description}
                      </p>
                    )}
                    <p className="mt-auto text-[11px] text-muted-foreground">
                      {owner?.name ?? "—"} ·{" "}
                      {new Date(d.updatedAt).toLocaleDateString()}
                    </p>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </main>
  )
}
