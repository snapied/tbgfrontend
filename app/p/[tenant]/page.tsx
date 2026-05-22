"use client"

// Tenant home. Reads the page with slug="/" from PortalConfig.pages and
// renders each section in order. Empty state if the tenant hasn't
// configured anything yet — encourages them straight back to the editor.

import { use } from "react"
import Link from "next/link"
import { Sparkles, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { usePortal } from "@/lib/portal-store"
import { SectionRenderer } from "@/components/portal/section-renderer"
import { usePortalDataset } from "@/components/portal/use-portal-dataset"

export default function PortalHomePage({
  params,
}: {
  params: Promise<{ tenant: string }>
}) {
  const { tenant } = use(params)
  const { getPage } = usePortal()
  const dataset = usePortalDataset(tenant)
  const page = getPage("/")

  if (!page || page.sections.length === 0) {
    return <EmptyState tenant={tenant} />
  }

  return (
    <>
      {page.sections
        .filter((s) => !s.hidden)
        .map((s) => (
          <SectionRenderer key={s.id} section={s} dataset={dataset} pageSlug="/" />
        ))}
    </>
  )
}

function EmptyState({ tenant }: { tenant: string }) {
  return (
    <section className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center px-6 py-20 text-center">
      <Sparkles className="h-10 w-10 text-primary" />
      <h1 className="mt-4 font-serif text-3xl font-bold tracking-tight sm:text-4xl">
        Your site lives here.
      </h1>
      <p className="mt-3 text-muted-foreground">
        We&apos;ve seeded a starter home page for <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm">{tenant}</code>.
        Open the dashboard to customise the brand, add faculty, and write your first blog post.
      </p>
      <Button asChild className="mt-6">
        <Link href="/dashboard/portal">
          Open the portal builder <ArrowRight className="ml-1.5 h-4 w-4" />
        </Link>
      </Button>
    </section>
  )
}
