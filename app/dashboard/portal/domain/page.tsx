"use client"

// Portal → Domain. The canonical home for the workspace URL + custom
// domain + plan info. Pulled out of Settings since it's strictly about
// how visitors reach the public portal, not personal account stuff.

import { Globe } from "lucide-react"
import { WorkspaceCard } from "@/components/portal/workspace-card"

export default function PortalDomainPage() {
  return (
    <div className="space-y-6">
      <div>
        <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          <Globe className="h-3.5 w-3.5" />
          Domain &amp; URL
        </div>
        <h1 className="mt-3 font-serif text-2xl font-bold tracking-tight">
          Where your students find you
        </h1>
        <p className="text-muted-foreground">
          Your built-in subdomain is always live. Add a custom domain when you want a fully branded URL.
        </p>
      </div>

      <WorkspaceCard />
    </div>
  )
}
