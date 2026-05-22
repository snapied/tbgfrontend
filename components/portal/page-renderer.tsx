"use client"

// Generic portal page renderer. Looks up the page by slug and renders
// each section in order. Falls back to a "not found" message when the
// page doesn't exist — keeps each route file thin.

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { usePortal } from "@/lib/portal-store"
import { SectionRenderer } from "@/components/portal/section-renderer"
import { usePortalDataset } from "@/components/portal/use-portal-dataset"

export function PortalPageRenderer({
  tenant,
  slug,
}: {
  tenant: string
  slug: string
}) {
  const { getPage } = usePortal()
  const dataset = usePortalDataset(tenant)
  const page = getPage(slug)

  if (!page) {
    return (
      <section className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center px-6 py-20 text-center">
        <h1 className="font-serif text-2xl font-bold tracking-tight sm:text-3xl">
          Page not found
        </h1>
        <p className="mt-2 text-muted-foreground">
          No page lives at <code className="rounded bg-muted px-1.5 py-0.5 font-mono">{slug}</code> on this site.
        </p>
        <Button asChild className="mt-5" variant="outline">
          <Link href={`/p/${tenant}`}>← Back to home</Link>
        </Button>
      </section>
    )
  }

  return (
    <>
      {page.sections
        .filter((s) => !s.hidden)
        .map((s) => (
          <SectionRenderer key={s.id} section={s} dataset={dataset} pageSlug={slug} />
        ))}
    </>
  )
}
