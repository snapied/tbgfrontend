"use client"

// Per-page editor. The route param `id` is actually the page slug
// (URL-decoded), so /dashboard/portal/pages/%2Fprivacy edits the
// /privacy page. We use the slug as the route id because portal pages
// are identified by slug everywhere else (footer links, header nav)
// and an internal UUID would just be a second key to thread through.

import { use } from "react"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PageSectionsEditor } from "@/components/portal/page-sections-editor"

export default function PortalPageEditor({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const slug = decodeURIComponent(id)
  // Friendly eyebrow per page kind. Home gets a different framing.
  const eyebrow = slug === "/" ? "Home page" : "Page content"

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link href="/dashboard/portal/pages">
          <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> All pages
        </Link>
      </Button>
      <PageSectionsEditor
        slug={slug}
        eyebrow={eyebrow}
        title={`Editing ${slug === "/" ? "Home" : slug}`}
        description="Drop sections in, reorder them, hide the ones you're not using. Changes save automatically and the preview refreshes itself."
      />
    </div>
  )
}
